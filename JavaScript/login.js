/* ═══════════════════════════════════════════════════════════
   login.js  —  AcadBridge Auth + Assessment Logic
   Endpoints (FastAPI running locally on :8000):
     GET  /get_user_info?user_email=...
     POST /user_account_creation        body: User schema
     POST /initial_assessment           body: List[str] (topics), query: user_email
     POST /assessment_score             body: {assessment_id, user_answers}, query: user_email
═══════════════════════════════════════════════════════════ */

const API_BASE = 'http://localhost:8000';

/* ── State ─────────────────────────────────────────────── */
const state = {
    role: 'student',        // 'student' | 'recruiter'
    activeTab: 'login',     // 'login'  | 'signup'
    currentStep: 1,
    skills: [],             // tag-input collected skills
    userEmail: '',          // set after login or sign-up
    assessmentId: null,
    questions: [],          // raw questions from API
};

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function $(id) { return document.getElementById(id); }

function showError(elId, msg) {
    const el = $(elId);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
}
function clearError(elId) {
    const el = $(elId);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
}

function setLoading(btnId, loading) {
    const btn = $(btnId);
    if (!btn) return;
    const text   = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (text)   text.classList.toggle('hidden', loading);
    if (loader) loader.classList.toggle('hidden', !loading);
}

function showPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    $(`panel-${name}`).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════════════════
   PANEL 1 — ROLE TOGGLE & TABS
══════════════════════════════════════════════════════════ */
function setRole(role) {
    state.role = role;
    $('btn-student').classList.toggle('active', role === 'student');
    $('btn-recruiter').classList.toggle('active', role === 'recruiter');

    /* Update headings */
    if (role === 'student') {
        $('login-heading').textContent    = 'Welcome back, Student';
        $('login-subtitle').textContent   = 'Log in to find your dream internship';
        $('signup-heading').textContent   = 'Join AcadBridge';
        $('signup-subtitle').textContent  = 'Start your verified career journey today';
    } else {
        $('login-heading').textContent    = 'Welcome back, Recruiter';
        $('login-subtitle').textContent   = 'Log in to hire pre-verified talent';
        $('signup-heading').textContent   = 'Post Opportunities';
        $('signup-subtitle').textContent  = 'Connect with verified student talent';
    }
}

function switchTab(tab) {
    state.activeTab = tab;
    const isLogin = tab === 'login';

    $('tab-login').classList.toggle('active', isLogin);
    $('tab-signup').classList.toggle('active', !isLogin);
    $('tab-indicator').style.left = isLogin ? '0%' : '50%';

    $('login-form').classList.toggle('active-tab', isLogin);
    $('signup-intro').classList.toggle('active-tab', !isLogin);
}

/* Password eye toggle */
function togglePassword(inputId, btn) {
    const input = $(inputId);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
    }
}

/* ══════════════════════════════════════════════════════════
   PANEL 1 — LOGIN
══════════════════════════════════════════════════════════ */
$('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearError('login-error');

    const email    = $('login-email').value.trim();
    const password = $('login-password').value;

    if (!email) { showError('login-error', 'Please enter your email address.'); return; }
    if (!password) { showError('login-error', 'Please enter your password.'); return; }

    setLoading('login-submit-btn', true);

    try {
        /* 
         * NOTE: The backend currently has no password verification endpoint.
         * GET /get_user_info validates the user exists.
         * When a proper /login endpoint with JWT is added, replace this call.
         */
        const res = await fetch(`${API_BASE}/get_user_info?user_email=${encodeURIComponent(email)}`);

        if (res.ok) {
            const userData = await res.json();
            state.userEmail = email;
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userName', userData.full_name || '');
            window.location.href = 'index.html';
        } else if (res.status === 422 || res.status === 404) {
            showError('login-error', 'No account found with that email address.');
        } else {
            const data = await res.json().catch(() => ({}));
            showError('login-error', data.detail || 'Sign in failed. Please try again.');
        }
    } catch (err) {
        showError('login-error', 'Cannot connect to server. Make sure the backend is running.');
    } finally {
        setLoading('login-submit-btn', false);
    }
});

/* ══════════════════════════════════════════════════════════
   PANEL 2 — SIGN-UP WIZARD
══════════════════════════════════════════════════════════ */
function startSignup() {
    showPanel('signup');
    goToStep(1);
}

function cancelSignup() {
    showPanel('auth');
    goToStep(1);
}

/* ── Step navigation ──────────────────────────────────── */
function goToStep(n, direction = 'forward') {
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    const step = $(`step-${n}`);
    if (step) {
        step.style.animation = 'none';
        step.offsetHeight; /* reflow */
        step.style.animation = direction === 'forward' ? 'stepIn 0.35s ease' : 'stepInBack 0.35s ease';
        step.classList.add('active');
    }
    state.currentStep = n;
    updateProgressDots(n);
}

function updateProgressDots(current) {
    for (let i = 1; i <= 3; i++) {
        const dot  = document.querySelector(`.step-dot[data-step="${i}"]`);
        if (!dot) continue;
        dot.classList.toggle('active', i === current);
        dot.classList.toggle('done',   i < current);
    }
    /* Lines */
    const l12 = $('line-1-2');
    const l23 = $('line-2-3');
    if (l12) l12.classList.toggle('done', current > 1);
    if (l23) l23.classList.toggle('done', current > 2);
}

function nextStep(from) {
    if (!validateStep(from)) return;
    goToStep(from + 1, 'forward');
}
function prevStep(from) {
    if (from === 1) { cancelSignup(); return; }
    goToStep(from - 1, 'back');
}

/* ── Validation ───────────────────────────────────────── */
function validateStep(step) {
    clearError(`step${step}-error`);

    if (step === 1) {
        const name     = $('s-fullname').value.trim();
        const phone    = $('s-phone').value.trim();
        const email    = $('s-email').value.trim();
        const password = $('s-password').value;
        const state_   = $('s-state').value;
        const city     = $('s-city').value.trim();
        const workmode = $('s-workmode').value;

        if (!name)     { showError('step1-error', 'Full name is required.'); return false; }
        if (!phone || !/^\+?[\d\s\-]{8,15}$/.test(phone)) {
            showError('step1-error', 'Enter a valid phone number.'); return false;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('step1-error', 'Enter a valid email address.'); return false;
        }
        if (password.length < 6) {
            showError('step1-error', 'Password must be at least 6 characters.'); return false;
        }
        if (!state_)   { showError('step1-error', 'Please select your state.'); return false; }
        if (!city)     { showError('step1-error', 'City is required.'); return false; }
        if (!workmode) { showError('step1-error', 'Please select a work mode preference.'); return false; }
    }

    if (step === 2) {
        const inst    = $('s-institution').value.trim();
        const degree  = $('s-degree').value.trim();
        const year    = parseInt($('s-gradyear').value, 10);

        if (!inst)   { showError('step2-error', 'Institution name is required.'); return false; }
        if (!degree) { showError('step2-error', 'Degree is required.'); return false; }
        if (!year || year < 2020 || year > 2035) {
            showError('step2-error', 'Enter a valid graduation year (2020–2035).'); return false;
        }
    }

    if (step === 3) {
        if (state.skills.length < 2) {
            showError('step3-error', 'Please add at least 2 skills.'); return false;
        }
    }

    return true;
}

/* ── Tag input ────────────────────────────────────────── */
(function initTagInput() {
    const input   = $('skill-input');
    const display = $('tags-display');
    const wrap    = $('tag-input-wrap');

    if (!input || !display) return;

    wrap.addEventListener('click', () => input.focus());

    function addTag(raw) {
        const val = raw.trim().replace(/,+$/, '').trim();
        if (!val) return;
        if (state.skills.includes(val)) return;
        state.skills.push(val);
        renderTags();
    }

    function removeTag(val) {
        state.skills = state.skills.filter(s => s !== val);
        renderTags();
    }

    function renderTags() {
        display.innerHTML = '';
        state.skills.forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.innerHTML = `${escapeHtml(skill)}<span class="tag-remove" title="Remove">✕</span>`;
            tag.querySelector('.tag-remove').addEventListener('click', () => removeTag(skill));
            display.appendChild(tag);
        });
    }

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input.value);
            input.value = '';
        } else if (e.key === 'Backspace' && input.value === '' && state.skills.length > 0) {
            removeTag(state.skills[state.skills.length - 1]);
        }
    });

    input.addEventListener('blur', () => {
        if (input.value.trim()) { addTag(input.value); input.value = ''; }
    });
})();

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ── Submit sign-up ───────────────────────────────────── */
async function submitSignup() {
    if (!validateStep(3)) return;
    clearError('step3-error');
    setLoading('create-account-btn', true);

    /* Build User payload matching the backend schema */
    const payload = {
        full_name: $('s-fullname').value.trim(),
        email:     $('s-email').value.trim().toLowerCase(),
        phone_num: $('s-phone').value.trim(),
        location: {
            state:                $('s-state').value,
            city:                 $('s-city').value.trim(),
            country:              'India',
            preferred_work_modes: $('s-workmode').value
        },
        education: {
            institution:     $('s-institution').value.trim(),
            degree:          $('s-degree').value.trim(),
            branch:          $('s-branch').value.trim() || null,
            graduation_year: parseInt($('s-gradyear').value, 10)
        },
        skills: {
            user_skills:     state.skills,
            verified_skills: []
        },
        experience: {
            internships_done:  [],
            courses_completed: []
        },
        assessment: {
            total_assessments_completed: 0,
            assessmnents: []
        },
        targetted_roles: [],
        user_metadata: {
            acc_created_at:      new Date().toISOString(),
            last_checked_in_at:  new Date().toISOString()
        }
    };

    try {
        const res = await fetch(`${API_BASE}/user_account_creation`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok || res.status === 201) {
            state.userEmail = payload.email;
            localStorage.setItem('userEmail', payload.email);
            localStorage.setItem('userName',  payload.full_name);
            /* Move to assessment panel */
            showPanel('assessment');
            await loadAssessment();
        } else {
            showError('step3-error', data.detail || 'Account creation failed. Please try again.');
        }
    } catch (err) {
        showError('step3-error', 'Cannot connect to server. Make sure the backend is running.');
    } finally {
        setLoading('create-account-btn', false);
    }
}

/* ══════════════════════════════════════════════════════════
   PANEL 3 — ASSESSMENT
══════════════════════════════════════════════════════════ */
async function loadAssessment() {
    $('assessment-loading').style.display = 'block';
    $('questions-container').classList.add('hidden');
    $('assessment-footer').classList.add('hidden');

    try {
        /* POST /initial_assessment?user_email=...  body: List[str] */
        const topicsPayload = state.skills;

        const res = await fetch(
            `${API_BASE}/initial_assessment?user_email=${encodeURIComponent(state.userEmail)}`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(topicsPayload)
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to load assessment.');
        }

        const data = await res.json();
        state.assessmentId = data.assessment_id;
        state.questions    = data.questions || [];

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

        const isMCQ  = q.question_type === 'MCQ';
        const diff   = (q.difficulty || '').toLowerCase();
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
    /* Remove selected from siblings */
    const card = $(`q-card-${qIdx}`);
    card.querySelectorAll('.mcq-option').forEach(o => o.classList.remove('selected'));
    /* Select clicked */
    const selected = $(`opt-${qIdx}-${optIdx}`);
    if (selected) {
        selected.classList.add('selected');
        selected.querySelector('input[type="radio"]').checked = true;
    }
}

/* ── Submit assessment ────────────────────────────────── */
async function submitAssessment() {
    clearError('assess-error');

    /* Collect answers { "0": "answer text", "1": "A. Option text" … } */
    const userAnswers = {};
    let   missing     = 0;

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
            `${API_BASE}/assessment_score?user_email=${encodeURIComponent(state.userEmail)}`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    assessment_id: state.assessmentId,
                    user_answers:  userAnswers
                })
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to submit assessment.');
        }

        const result = await res.json();
        showResults(result);

    } catch (err) {
        showError('assess-error', err.message || 'Submission failed. Please try again.');
        setLoading('submit-assessment-btn', false);
    }
}

/* ══════════════════════════════════════════════════════════
   PANEL 4 — RESULTS
══════════════════════════════════════════════════════════ */
function showResults(result) {
    showPanel('results');

    const report = result.test_report || {};
    const score  = report.score ?? 0;
    const passed = score >= 75;

    /* Score ring animation */
    const circumference = 2 * Math.PI * 52; // 326.73
    const offset        = circumference - (score / 100) * circumference;
    const ring          = $('ring-fill');

    ring.style.strokeDashoffset = circumference; // start at 0
    ring.classList.toggle('pass-color', passed);
    ring.classList.toggle('fail-color', !passed);

    /* Animate after paint */
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ring.style.strokeDashoffset = offset;
        });
    });

    /* Count-up animation */
    let current = 0;
    const numEl = $('score-num');
    const step  = Math.ceil(score / 40);
    const timer = setInterval(() => {
        current = Math.min(current + step, score);
        numEl.textContent = current;
        if (current >= score) clearInterval(timer);
    }, 30);

    /* Badges */
    $('pass-badge').classList.toggle('hidden', !passed);
    $('fail-badge').classList.toggle('hidden',  passed);

    /* Verification status */
    $('verification-status').textContent = result.skill_verification_status || '';

    /* Summary */
    $('result-summary').textContent = report.test_summary || '—';

    /* Strong areas */
    const strongList = $('strong-list');
    strongList.innerHTML = '';
    (report.strong_areas || []).forEach(area => {
        const li = document.createElement('li');
        li.textContent = area;
        strongList.appendChild(li);
    });

    /* Improvement areas */
    const improveList = $('improve-list');
    improveList.innerHTML = '';
    (report.improvement_areas || []).forEach(area => {
        const li = document.createElement('li');
        li.textContent = area;
        improveList.appendChild(li);
    });
}

function goToDashboard() {
    window.location.href = 'index.html';
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
(function init() {
    /* Apply tab indicator to match default */
    switchTab('login');
    setRole('student');
})();