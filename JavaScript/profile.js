const PROFILE_API_BASE = 'https://blackcoffee-backend-rgup.onrender.com';

/* ── DOM Elements ─────────────────────────────────────── */
function getEl(id) { return document.getElementById(id); }

/* ── Initial Load ─────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    // Only try to load if we are on the profile tab or globally
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) {
        loadUserProfile(userEmail);
    }
});

/* ── Data Fetching & Rendering ────────────────────────── */
async function loadUserProfile(email) {
    try {
        const res = await fetch(`${PROFILE_API_BASE}/get_user_info?user_email=${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error("Failed to fetch user data.");
        
        const data = await res.json();
        
        // Render Hero
        renderHero(data);
        
        // Render Skills (Combine API with Local Storage pending)
        const apiSkills = (data.skills && data.skills.verified_skills) ? data.skills.verified_skills : [];
        const localSkills = JSON.parse(localStorage.getItem("locallyVerifiedSkills") || "[]");
        renderSkills([...new Set([...apiSkills, ...localSkills])]);
        
        // Render Experience
        const apiExp = (data.experience && data.experience.internships_done) ? data.experience.internships_done : [];
        const localExp = JSON.parse(localStorage.getItem("localExperiences") || "[]");
        renderExperiences([...apiExp, ...localExp]);
        
        // Render Courses
        const apiCourses = (data.experience && data.experience.courses_completed) ? data.experience.courses_completed : [];
        const localCourses = JSON.parse(localStorage.getItem("localCourses") || "[]");
        renderCourses([...apiCourses, ...localCourses]);
        
        // Render Assessments (Test History)
        const apiTests = (data.assessment && data.assessment.assessments) ? data.assessment.assessments : [];
        renderTestHistory(apiTests);
        
        // Render Certificates (Not returned directly in user_info sometimes, relying on local for now)
        const localCerts = JSON.parse(localStorage.getItem("localCertificates") || "[]");
        renderCertificates(localCerts);
        
        // Render Projects (Not in backend schema yet, purely local)
        const localProjects = JSON.parse(localStorage.getItem("localProjects") || "[]");
        renderProjects(localProjects);
        
    } catch (err) {
        console.error("Profile load error:", err);
    }
}

function renderHero(user) {
    const heroCopy = document.querySelector(".profile-hero .hero-copy");
    if (!heroCopy) return;
    
    // Fallbacks
    const name = user.full_name || "Student";
    const inst = (user.education && user.education.institution) ? user.education.institution : "College / University";
    const degree = (user.education && user.education.degree) ? user.education.degree : "Degree";
    const branch = (user.education && user.education.branch) ? user.education.branch : "";
    
    heroCopy.innerHTML = `
        <p class="welcome">👋 Welcome,</p>
        <h1>${name}</h1>
        <div class="hero-pills">
            <span class="pill">◉ ${inst}</span>
            <span class="pill">${degree}${branch ? ' · ' + branch : ''}</span>
            <span class="pill">CGPA: N/A</span>
        </div>
    `;
}

function escape(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderSkills(skills) {
    const container = getEl("skills-container");
    if (!container) return;
    
    // Keep the "Verify a skill" button
    const verifyBtn = `<span id="skill_verify" onclick="window.location.href='assessment.html'" style="cursor:pointer;">+ Verify a skill</span>`;
    
    const skillsHtml = skills.map(s => `<span class="skill-tag">${escape(s)}</span>`).join('');
    container.innerHTML = skillsHtml + verifyBtn;
}

function renderProjects(projects) {
    const container = getEl("projects-container");
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted);font-size:0.9rem;">No projects added yet.</div>`;
        return;
    }
    
    container.innerHTML = projects.map(p => `
        <div class="project" style="display:flex;align-items:center;gap:12px;background:var(--card-bg-alt);padding:10px 14px;border-radius:12px;">
            <span style="font-size:1.2rem;color:var(--accent-color);">◎</span>
            <div>
                <strong><a href="${escape(p.link)}" target="_blank" style="text-decoration:none;color:var(--text-color);">${escape(p.name)}</a></strong>
                <small style="display:block;color:var(--text-muted);"></small>
            </div>
        </div>
    `).join('');
}

function renderExperiences(exps) {
    const container = getEl("exp-container");
    if (!container) return;
    
    if (exps.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted);font-size:0.9rem;">No experiences added yet.</div>`;
        return;
    }
    
    container.innerHTML = exps.map(e => `
        <div class="card_content" style="display:flex;align-items:center;gap:12px;background:var(--card-bg-alt);padding:10px 14px;border-radius:12px;">
            <span style="font-size:1.2rem;color:var(--accent-color);">◎</span>
            <div>
                <strong>${escape(e.role)}</strong>
                <small style="display:block;color:var(--text-muted);">${escape(e.organization)}</small>
            </div>
        </div>
    `).join('');
}

function renderCourses(courses) {
    const container = getEl("courses-container");
    if (!container) return;
    
    if (courses.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted);font-size:0.9rem;">No courses added yet.</div>`;
        return;
    }
    
    container.innerHTML = courses.map((c, idx) => `
        <div class="card_content" style="display:flex;align-items:center;gap:12px;background:var(--card-bg-alt);padding:10px 14px;border-radius:12px;">
            <span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:var(--card-bg);border-radius:50%;font-size:0.9rem;font-weight:bold;">${idx+1}</span>
            <div>
                <strong>${escape(c.name)}</strong>
                <small style="display:block;color:var(--text-muted);">${escape(c.skills)}</small>
            </div>
        </div>
    `).join('');
}

function renderCertificates(certs) {
    const container = getEl("certs-container");
    if (!container) return;
    
    if (certs.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted);font-size:0.9rem;">No certificates added yet.</div>`;
        return;
    }
    
    container.innerHTML = certs.map((c, idx) => `
        <div class="card_content" style="display:flex;align-items:center;gap:12px;background:var(--card-bg-alt);padding:10px 14px;border-radius:12px;">
            <span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:var(--card-bg);border-radius:50%;font-size:0.9rem;font-weight:bold;">${idx+1}</span>
            <div>
                <strong>${escape(c.name)}</strong>
                <small style="display:block;color:var(--text-muted);">${escape(c.issuer)}</small>
            </div>
        </div>
    `).join('');
}

function renderTestHistory(tests) {
    const container = getEl("test-container");
    if (!container) return;
    
    if (tests.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted);font-size:0.9rem;">No tests taken yet.</div>`;
        return;
    }
    
    container.innerHTML = tests.map((t, idx) => `
        <div class="card_content" style="display:flex;align-items:center;gap:12px;background:var(--card-bg-alt);padding:10px 14px;border-radius:12px;">
            <span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:var(--card-bg);border-radius:50%;font-size:0.9rem;font-weight:bold;">${idx+1}</span>
            <div>
                <strong>Score: ${t.score || 0}%</strong>
                <small style="display:block;color:var(--text-muted);">${escape(t.skill || 'Skill Assessment')}</small>
            </div>
        </div>
    `).join('');
}

/* ── Modals ───────────────────────────────────────────── */
function openModal(modalId) {
    const m = getEl(modalId);
    if (m) m.style.display = 'flex';
}

function closeModal(modalId) {
    const m = getEl(modalId);
    if (m) m.style.display = 'none';
}

function saveProfileData(type) {
    if (type === 'project') {
        const name = getEl('proj-name').value.trim();
        const link = getEl('proj-link').value.trim();
        if (!name || !link) return alert("Please fill all fields.");
        
        const localProjects = JSON.parse(localStorage.getItem("localProjects") || "[]");
        localProjects.push({ name, link });
        localStorage.setItem("localProjects", JSON.stringify(localProjects));
        
        getEl('proj-name').value = '';
        getEl('proj-link').value = '';
        closeModal('project-modal');
        renderProjects(localProjects);
        
    } else if (type === 'exp') {
        const role = getEl('exp-role').value.trim();
        const org = getEl('exp-org').value.trim();
        if (!role || !org) return alert("Please fill all fields.");
        
        const localExp = JSON.parse(localStorage.getItem("localExperiences") || "[]");
        localExp.push({ role, organization: org });
        localStorage.setItem("localExperiences", JSON.stringify(localExp));
        
        getEl('exp-role').value = '';
        getEl('exp-org').value = '';
        closeModal('exp-modal');
        
        // Re-render experiences requires merging with API, so just trigger a full reload
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) loadUserProfile(userEmail);
        
    } else if (type === 'course') {
        const name = getEl('course-name').value.trim();
        const skills = getEl('course-skills').value.trim();
        if (!name || !skills) return alert("Please fill all fields.");
        
        const localCourses = JSON.parse(localStorage.getItem("localCourses") || "[]");
        localCourses.push({ name, skills });
        localStorage.setItem("localCourses", JSON.stringify(localCourses));
        
        getEl('course-name').value = '';
        getEl('course-skills').value = '';
        closeModal('course-modal');
        
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) loadUserProfile(userEmail);
        
    } else if (type === 'cert') {
        const name = getEl('cert-name').value.trim();
        const issuer = getEl('cert-issuer').value.trim();
        if (!name || !issuer) return alert("Please fill all fields.");
        
        const localCerts = JSON.parse(localStorage.getItem("localCertificates") || "[]");
        localCerts.push({ name, issuer });
        localStorage.setItem("localCertificates", JSON.stringify(localCerts));
        
        getEl('cert-name').value = '';
        getEl('cert-issuer').value = '';
        closeModal('cert-modal');
        
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) loadUserProfile(userEmail);
    }
}
