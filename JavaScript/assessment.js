const API_BASE = 'https://blackcoffee-backend-rgup.onrender.com';

const state = {
    userEmail: localStorage.getItem('userEmail') || '',
    skills: [], // We'll populate this either from localStorage or the input box
    questions: [],
    assessmentId: null
};

/* Helper: shorthand for getElementById */
function $(id) {
    return document.getElementById(id);
}

/* Helper: Switch visible panel */
function showPanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    $(panelId).classList.add('active');
}

/* Helper: Escape HTML to prevent XSS */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Helper: Set button loading state */
function setLoading(btnId, loading) {
    const btn = $(btnId);
    if (!btn) return;
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (text) text.classList.toggle('hidden', loading);
    if (loader) loader.classList.toggle('hidden', !loading);
}

/* Show error below input/button */
function showError(containerId, msg) {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(msg)}`;
    el.style.display = 'block';
}

function clearError(containerId) {
    const el = $(containerId);
    if (el) el.style.display = 'none';
}

/* Initialize flow based on pending skills */
document.addEventListener("DOMContentLoaded", () => {
    if (!state.userEmail) {
        window.location.href = 'login.html'; // Require auth
        return;
    }

    const pendingSkill = localStorage.getItem("pendingSkillForAssessment");
    if (pendingSkill) {
        state.skills = [pendingSkill];
        localStorage.removeItem("pendingSkillForAssessment"); // Consume it
        showPanel('panel-assessment');
        loadAssessment();
    } else {
        // Show manual skill entry form
        showPanel('panel-skill-entry');
    }
});

/* Start assessment from manual input */
function startStandaloneAssessment() {
    clearError('skill-entry-error');
    const input = $('new-skill-input').value.trim();
    if (!input) {
        showError('skill-entry-error', 'Please enter a skill.');
        return;
    }
    
    state.skills = [input];
    showPanel('panel-assessment');
    loadAssessment();
}

/* Load initial assessment questions from backend */
async function loadAssessment() {
    $('assessment-loading').style.display = 'flex';
    $('questions-container').classList.add('hidden');
    $('assessment-footer').classList.add('hidden');
    
    try {
        const topicsPayload = state.skills;

        const res = await fetch(
            `${API_BASE}/initial_assessment?user_email=${encodeURIComponent(state.userEmail)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(topicsPayload)
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to load assessment.');
        }

        const data = await res.json();
        state.assessmentId = data.assessment_id;
        state.questions = data.questions || [];

        $('q-count').textContent = state.questions.length;
        renderQuestions(state.questions);

        $('assessment-loading').style.display = 'none';
        $('questions-container').classList.remove('hidden');
        $('assessment-footer').classList.remove('hidden');

    } catch (err) {
        $('assessment-loading').innerHTML = `
            <div class="loading-spinner" style="color:#ef4444"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <p style="color:#ef4444">${err.message}</p>
            <p class="loading-sub">Please check your backend connection and try again.</p>
            <button class="btn-primary" style="margin:1rem auto 0;width:auto" onclick="loadAssessment()">Retry</button>
        `;
    }
}

function renderQuestions(questions) {
    const container = $('questions-container');
    container.innerHTML = '';

    questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.id = `q-card-${idx}`;

        const isMCQ = q.question_type === 'MCQ';
        const diff = (q.difficulty || '').toLowerCase();
        const diffClass = diff === 'basic' ? 'basic' : diff === 'intermediate' ? 'inter' : 'adv';

        let answerHtml = '';
        if (isMCQ) {
            const opts = (q.options || []).map((opt, oi) => `
                <label class="mcq-option" id="opt-${idx}-${oi}" onclick="selectOption(${idx}, ${oi})">
                    <input type="radio" name="q-${idx}" value="${escapeHtml(opt)}">
                    <span class="option-dot"></span>
                    <span>${escapeHtml(opt)}</span>
                </label>
            `).join('');
            answerHtml = `<div class="mcq-options">${opts}</div>`;
        } else {
            const concepts = (q.key_concepts || []).join(', ');
            answerHtml = `
                <textarea class="para-textarea" id="para-${idx}" 
                    placeholder="Write your answer here (3–5 sentences)…"
                    rows="4"></textarea>
                ${concepts ? `<p class="key-concepts"><strong>Key concepts:</strong> ${escapeHtml(concepts)}</p>` : ''}
            `;
        }

        card.innerHTML = `
            <div class="question-meta">
                <span class="q-num">Q${idx + 1}</span>
                <span class="q-type-badge ${isMCQ ? 'mcq' : 'para'}">${isMCQ ? 'MCQ' : 'Paragraph'}</span>
                <span class="q-diff-badge ${diffClass}">${q.difficulty || ''}</span>
                <span style="font-size:0.75rem;color:var(--text-muted);margin-left:auto">${escapeHtml(q.field || '')}</span>
            </div>
            <p class="question-text">${escapeHtml(q.question_text || '')}</p>
            ${answerHtml}
        `;
        container.appendChild(card);
    });
}

function selectOption(qIdx, optIdx) {
    const card = $(`q-card-${qIdx}`);
    card.querySelectorAll('.mcq-option').forEach(o => o.classList.remove('selected'));
    const selected = $(`opt-${qIdx}-${optIdx}`);
    if (selected) {
        selected.classList.add('selected');
        selected.querySelector('input[type="radio"]').checked = true;
    }
}

async function submitAssessment() {
    clearError('assess-error');
    const userAnswers = {};
    let missing = 0;

    state.questions.forEach((q, idx) => {
        const isMCQ = q.question_type === 'MCQ';
        if (isMCQ) {
            const checked = document.querySelector(`input[name="q-${idx}"]:checked`);
            if (checked) {
                userAnswers[String(idx)] = checked.value;
            } else {
                missing++;
            }
        } else {
            const ta = $(`para-${idx}`);
            const val = ta ? ta.value.trim() : '';
            if (val) {
                userAnswers[String(idx)] = val;
            } else {
                missing++;
            }
        }
    });

    if (missing > 0) {
        showError('assess-error', `Please answer all questions. You're missing ${missing} answer(s).`);
        return;
    }

    setLoading('submit-assessment-btn', true);

    try {
        const res = await fetch(
            `${API_BASE}/assessment_score?user_email=${encodeURIComponent(state.userEmail)}&assessment_id=${encodeURIComponent(state.assessmentId)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessment_id: state.assessmentId,
                    user_answers: userAnswers
                })
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const errMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
            throw new Error(errMsg || 'Failed to submit assessment.');
        }

        const result = await res.json();
        
        // Save the newly verified skill to local storage (if passed)
        if (result.test_report && result.test_report.score >= 75) {
            let locallyVerified = JSON.parse(localStorage.getItem("locallyVerifiedSkills") || "[]");
            if (!locallyVerified.includes(state.skills[0])) {
                locallyVerified.push(state.skills[0]);
                localStorage.setItem("locallyVerifiedSkills", JSON.stringify(locallyVerified));
            }
        }

        showResults(result);
    } catch (err) {
        showError('assess-error', err.message || 'Submission failed. Please try again.');
        setLoading('submit-assessment-btn', false);
    }
}

function showResults(result) {
    showPanel('panel-results');

    const report = result.test_report || {};
    const score = report.score ?? 0;
    const passed = score >= 75;

    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (score / 100) * circumference;
    const ring = $('ring-fill');

    ring.style.strokeDashoffset = circumference;
    ring.classList.toggle('pass-color', passed);
    ring.classList.toggle('fail-color', !passed);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ring.style.strokeDashoffset = offset;
        });
    });

    let current = 0;
    const numEl = $('score-num');
    const step = Math.ceil(score / 40);
    const timer = setInterval(() => {
        current = Math.min(current + step, score);
        numEl.textContent = current;
        if (current >= score) clearInterval(timer);
    }, 30);

    $('pass-badge').classList.toggle('hidden', !passed);
    $('fail-badge').classList.toggle('hidden', passed);
    $('verification-status').textContent = result.skill_verification_status || '';
    $('result-summary').textContent = report.test_summary || '—';

    const strongList = $('strong-list');
    strongList.innerHTML = '';
    (report.strong_areas || []).forEach(area => {
        const li = document.createElement('li');
        li.textContent = area;
        strongList.appendChild(li);
    });

    const improveList = $('improve-list');
    improveList.innerHTML = '';
    (report.improvement_areas || []).forEach(area => {
        const li = document.createElement('li');
        li.textContent = area;
        improveList.appendChild(li);
    });
}
