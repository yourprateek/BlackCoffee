/**
 * opportunities.js
 * Dynamic behaviour for the #internNJob Opportunities tab.
 * ─ Type switcher (Jobs / Internships)
 * ─ Search, sort, and filter pipeline (checkboxes + radio + chips)
 * ─ Job card rendering with save toggle
 * ─ Details modal
 * ─ Saved jobs list & applications tracker
 * ─ Mobile filter drawer
 * ─ Toast notifications
 */

/* ============================================================
   DATA  – Sample opportunity listings
   ============================================================ */
const OPPORTUNITIES = [
    {
        id: 1, type: 'jobs',
        title: 'Frontend Engineer',
        company: 'Google', logo: 'G',
        mode: 'Remote', location: 'Remote',
        skills: ['React', 'TypeScript', 'CSS'],
        salary: '₹18–22 LPA',
        deadline: '2026-09-20',
        match: 94,
        description: 'Join the Workspace team to build delightful, accessible web interfaces used by billions. You will own significant parts of the product surface and collaborate closely with UX, PM, and backend engineers.',
        requirements: ['3+ years React experience', 'Strong CSS/layout skills', 'TypeScript proficiency', 'Accessibility awareness'],
        posted: '2026-09-01',
    },
    {
        id: 2, type: 'internships',
        title: 'ML Research Intern',
        company: 'OpenAI', logo: '🤖',
        mode: 'Hybrid', location: 'San Francisco',
        skills: ['Python', 'PyTorch', 'Research'],
        salary: '$8,000/mo',
        deadline: '2026-09-12',
        match: 87,
        description: 'Work alongside world-class researchers on frontier language model training, fine-tuning, and evaluation. You\'ll contribute to published papers and real product integrations.',
        requirements: ['Strong ML fundamentals', 'PyTorch/TensorFlow experience', 'Research mindset', 'CS/Math background'],
        posted: '2026-08-28',
    },
    {
        id: 3, type: 'jobs',
        title: 'Backend Engineer',
        company: 'Razorpay', logo: '💳',
        mode: 'On-site', location: 'Bengaluru',
        skills: ['Node.js', 'PostgreSQL', 'Redis'],
        salary: '₹14–18 LPA',
        deadline: '2026-10-05',
        match: 80,
        description: 'Build and scale payment infrastructure handling millions of transactions per day. You\'ll design APIs, optimize database queries, and ensure 99.99% uptime.',
        requirements: ['Node.js / Go experience', 'Relational DB expertise', 'Systems thinking', 'Fintech interest a plus'],
        posted: '2026-09-02',
    },
    {
        id: 4, type: 'internships',
        title: 'Product Design Intern',
        company: 'Figma', logo: '🎨',
        mode: 'Remote', location: 'Remote',
        skills: ['Figma', 'UX Research', 'Prototyping'],
        salary: '$6,500/mo',
        deadline: '2026-09-15',
        match: 76,
        description: 'Shape the future of collaborative design tools. You\'ll work on real features used by millions of designers worldwide, from concept through launch.',
        requirements: ['Strong visual design portfolio', 'User research experience', 'Figma expertise', 'Systems thinking'],
        posted: '2026-08-30',
    },
    {
        id: 5, type: 'jobs',
        title: 'Data Analyst',
        company: 'Swiggy', logo: '🍜',
        mode: 'Hybrid', location: 'Bengaluru',
        skills: ['Python', 'SQL', 'Tableau'],
        salary: '₹10–14 LPA',
        deadline: '2026-10-10',
        match: 70,
        description: 'Analyse order patterns, supply-demand mismatches, and delivery metrics to drive decisions for Swiggy\'s core operations. You\'ll present insights directly to leadership.',
        requirements: ['SQL proficiency', 'Python / pandas', 'Dashboard tooling', 'Communication skills'],
        posted: '2026-09-03',
    },
    {
        id: 6, type: 'internships',
        title: 'Full-Stack Dev Intern',
        company: 'Postman', logo: 'P',
        mode: 'Hybrid', location: 'Bengaluru',
        skills: ['React', 'Node.js', 'JavaScript'],
        salary: '₹60,000/mo',
        deadline: '2026-09-18',
        match: 91,
        description: 'Work on Postman\'s collaboration and API-testing features. You\'ll touch both the React frontend and the Node/Express backend, shipping real features to millions of developers.',
        requirements: ['React fundamentals', 'REST API knowledge', 'Git workflows', 'Eagerness to learn'],
        posted: '2026-09-01',
    },
];

/* ============================================================
   STATE
   ============================================================ */
let state = {
    activeType: 'jobs',          // 'jobs' | 'internships'
    searchQuery: '',
    locationQuery: '',
    selectedModes: new Set(),
    selectedTypeFilters: new Set(),
    selectedRole: '',
    selectedSkillChips: new Set(),
    dateFilter: null,            // number of days or null
    sortBy: 'Best Match',
    savedIds: new Set(),
    appliedIds: new Set(),
};

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const cardsContainer   = document.getElementById('cards');
const emptyState       = document.getElementById('emptyState');
const savedList        = document.getElementById('savedList');
const applicationsList = document.getElementById('applicationsList');
const toast            = document.getElementById('toast');
const overlay          = document.getElementById('overlay');
const detailsModal     = document.getElementById('detailsModal');
const detailsContent   = document.getElementById('detailsContent');
const wizardModal      = document.getElementById('wizardModal');
const wizardContent    = document.getElementById('wizardContent');
const filterSidebar    = document.getElementById('filterSidebar');

/* ============================================================
   UTILITIES
   ============================================================ */

/** Show a brief toast message */
function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
}

/** Format a deadline date relative to today */
function formatDeadline(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return { text: 'Expired', urgent: true };
    if (diff === 0) return { text: 'Due today!', urgent: true };
    if (diff <= 5)  return { text: `${diff}d left`, urgent: true };
    return { text: `${diff}d left`, urgent: false };
}

/** Open the overlay + a modal */
function openModal(modalEl) {
    overlay && overlay.classList.add('open');
    modalEl && modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
}

/** Close all modals */
function closeAllModals() {
    overlay && overlay.classList.remove('open');
    detailsModal && detailsModal.classList.remove('open');
    wizardModal  && wizardModal.classList.remove('open');
    document.body.style.overflow = '';
}

/* ============================================================
   FILTER PIPELINE
   ============================================================ */
function getFilteredOpportunities() {
    let list = OPPORTUNITIES.filter(o => o.type === state.activeType);

    // Text search
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        list = list.filter(o =>
            o.title.toLowerCase().includes(q) ||
            o.company.toLowerCase().includes(q) ||
            o.skills.some(s => s.toLowerCase().includes(q))
        );
    }

    // Location search
    if (state.locationQuery) {
        const q = state.locationQuery.toLowerCase();
        list = list.filter(o => o.location.toLowerCase().includes(q));
    }

    // Work-mode checkboxes
    if (state.selectedModes.size > 0) {
        list = list.filter(o => state.selectedModes.has(o.mode));
    }

    // Type-filter checkboxes (jobs / internships cross-filter)
    if (state.selectedTypeFilters.size > 0) {
        list = list.filter(o => state.selectedTypeFilters.has(o.type));
    }

    // Role dropdown
    if (state.selectedRole) {
        const roleMap = {
            'Frontend': ['React', 'CSS', 'JavaScript', 'TypeScript'],
            'Backend':  ['Node.js', 'PostgreSQL', 'Redis', 'Go'],
            'Data':     ['Python', 'SQL', 'Tableau', 'pandas'],
            'AI / ML':  ['PyTorch', 'TensorFlow', 'Research', 'Python'],
            'Product':  ['Figma', 'UX Research', 'Prototyping'],
        };
        const keywords = roleMap[state.selectedRole] || [];
        if (keywords.length) {
            list = list.filter(o =>
                o.skills.some(s => keywords.includes(s)) ||
                o.title.toLowerCase().includes(state.selectedRole.toLowerCase())
            );
        }
    }

    // Skill chips
    if (state.selectedSkillChips.size > 0) {
        list = list.filter(o =>
            [...state.selectedSkillChips].every(chip => o.skills.includes(chip))
        );
    }

    // Date posted filter
    if (state.dateFilter) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - state.dateFilter);
        list = list.filter(o => new Date(o.posted) >= cutoff);
    }

    // Sort
    if (state.sortBy === 'Newest') {
        list = list.slice().sort((a, b) => new Date(b.posted) - new Date(a.posted));
    } else if (state.sortBy === 'Highest Salary' || state.sortBy === 'Highest Stipend') {
        // Simple heuristic: use match score as proxy for now
        list = list.slice().sort((a, b) => b.match - a.match);
    } else if (state.sortBy === 'Deadline Soon') {
        list = list.slice().sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else {
        // Best Match / Most Relevant
        list = list.slice().sort((a, b) => b.match - a.match);
    }

    return list;
}

/* ============================================================
   CARD RENDERING
   ============================================================ */
function buildCard(opp) {
    const { text: deadlineText, urgent } = formatDeadline(opp.deadline);
    const isSaved = state.savedIds.has(opp.id);
    const modeClass = { 'Remote': 'remote', 'Hybrid': 'hybrid', 'On-site': 'onsite' }[opp.mode] || '';
    const typeClass = opp.type === 'jobs' ? 'type-job' : 'type-intern';
    const typeLabel = opp.type === 'jobs' ? '💼 Job' : '🎓 Intern';

    const card = document.createElement('div');
    card.className = 'job-card';
    card.dataset.id = opp.id;

    card.innerHTML = `
        <div class="card-header">
            <div class="company-logo">${opp.logo}</div>
            <div class="card-title-group">
                <h3>${opp.title}</h3>
                <span class="company-name">${opp.company} · ${opp.location}</span>
            </div>
            <button class="save-btn ${isSaved ? 'saved' : ''}"
                    aria-label="${isSaved ? 'Unsave' : 'Save'} ${opp.title}"
                    data-id="${opp.id}">
                ${isSaved ? '★' : '☆'}
            </button>
        </div>

        <div class="card-meta">
            <span class="meta-tag ${modeClass}">${opp.mode}</span>
            <span class="meta-tag ${typeClass}">${typeLabel}</span>
            <span class="match-badge">✦ ${opp.match}% match</span>
        </div>

        <div class="card-skills">
            ${opp.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
        </div>

        <div class="card-footer">
            <span class="salary-info">${opp.salary}</span>
            <span class="deadline-info ${urgent ? 'urgent' : ''}">⏱ ${deadlineText}</span>
        </div>
    `;

    // Save toggle
    card.querySelector('.save-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSave(opp.id);
    });

    // Open details modal on card click
    card.addEventListener('click', () => openDetails(opp));

    return card;
}

function renderCards() {
    const list = getFilteredOpportunities();

    cardsContainer.innerHTML = '';

    if (list.length === 0) {
        emptyState && (emptyState.hidden = false);
    } else {
        emptyState && (emptyState.hidden = true);
        list.forEach(opp => cardsContainer.appendChild(buildCard(opp)));
    }
}

/* ============================================================
   SAVE / APPLY
   ============================================================ */
function toggleSave(id) {
    const opp = OPPORTUNITIES.find(o => o.id === id);
    if (!opp) return;

    if (state.savedIds.has(id)) {
        state.savedIds.delete(id);
        showToast(`Removed "${opp.title}" from saved`);
    } else {
        state.savedIds.add(id);
        showToast(`Saved "${opp.title}"`);
    }
    renderCards();
    renderSavedList();
}

function applyToJob(opp) {
    closeAllModals();
    if (state.appliedIds.has(opp.id)) {
        showToast(`Already applied to "${opp.title}"`);
        return;
    }
    state.appliedIds.add(opp.id);
    showToast(`✓ Applied to "${opp.title}" — Good luck!`);
    renderApplicationsList();
    renderCards();
}

/* ============================================================
   SAVED + APPLICATIONS LISTS
   ============================================================ */
function renderSavedList() {
    if (!savedList) return;
    savedList.innerHTML = '';

    if (state.savedIds.size === 0) {
        savedList.innerHTML = '<p class="mini-empty">No saved opportunities yet.</p>';
        return;
    }

    state.savedIds.forEach(id => {
        const opp = OPPORTUNITIES.find(o => o.id === id);
        if (!opp) return;
        const item = document.createElement('div');
        item.className = 'mini-item';
        item.innerHTML = `
            <span class="mini-item-icon">${opp.logo}</span>
            <div class="mini-item-body">
                <strong>${opp.title}</strong>
                <small>${opp.company} · ${opp.location}</small>
            </div>
        `;
        item.addEventListener('click', () => openDetails(opp));
        savedList.appendChild(item);
    });
}

function renderApplicationsList() {
    if (!applicationsList) return;
    applicationsList.innerHTML = '';

    if (state.appliedIds.size === 0) {
        applicationsList.innerHTML = '<p class="mini-empty">No applications yet. Start applying!</p>';
        return;
    }

    state.appliedIds.forEach(id => {
        const opp = OPPORTUNITIES.find(o => o.id === id);
        if (!opp) return;
        const item = document.createElement('div');
        item.className = 'mini-item';
        item.innerHTML = `
            <span class="mini-item-icon">${opp.logo}</span>
            <div class="mini-item-body">
                <strong>${opp.title}</strong>
                <small>${opp.company} · Applied</small>
            </div>
        `;
        item.addEventListener('click', () => openDetails(opp));
        applicationsList.appendChild(item);
    });
}

/* ============================================================
   DETAILS MODAL
   ============================================================ */
function openDetails(opp) {
    if (!detailsModal || !detailsContent) return;

    const { text: deadlineText, urgent } = formatDeadline(opp.deadline);
    const isSaved   = state.savedIds.has(opp.id);
    const isApplied = state.appliedIds.has(opp.id);
    const modeClass = { 'Remote': 'remote', 'Hybrid': 'hybrid', 'On-site': 'onsite' }[opp.mode] || '';
    const typeClass = opp.type === 'jobs' ? 'type-job' : 'type-intern';
    const typeLabel = opp.type === 'jobs' ? '💼 Job' : '🎓 Internship';

    detailsContent.innerHTML = `
        <div class="detail-company">
            <div class="detail-logo">${opp.logo}</div>
            <div class="detail-company-info">
                <h2>${opp.title}</h2>
                <p>${opp.company} · ${opp.location}</p>
            </div>
        </div>

        <div class="detail-meta">
            <span class="meta-tag ${modeClass}">${opp.mode}</span>
            <span class="meta-tag ${typeClass}">${typeLabel}</span>
            <span class="match-badge">✦ ${opp.match}% match</span>
            <span class="meta-tag deadline-info ${urgent ? 'urgent' : ''}">⏱ ${deadlineText}</span>
        </div>

        <div class="detail-section">
            <h4>Compensation</h4>
            <p class="salary-info" style="font-size:1rem;">${opp.salary}</p>
        </div>

        <div class="detail-section">
            <h4>About the Role</h4>
            <p>${opp.description}</p>
        </div>

        <div class="detail-section">
            <h4>Requirements</h4>
            <ul>${opp.requirements.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>

        <div class="detail-section">
            <h4>Skills</h4>
            <div class="card-skills">
                ${opp.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
            </div>
        </div>

        <div class="detail-actions">
            <button class="primary-btn" id="applyBtn" ${isApplied ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : ''}>
                ${isApplied ? '✓ Applied' : 'Apply Now →'}
            </button>
            <button class="outline-btn" id="saveDetailBtn">
                ${isSaved ? '★ Saved' : '☆ Save'}
            </button>
        </div>
    `;

    openModal(detailsModal);

    // Wire action buttons inside the modal
    const applyBtn = document.getElementById('applyBtn');
    const saveDetailBtn = document.getElementById('saveDetailBtn');

    if (applyBtn && !isApplied) {
        applyBtn.addEventListener('click', () => applyToJob(opp));
    }

    if (saveDetailBtn) {
        saveDetailBtn.addEventListener('click', () => {
            toggleSave(opp.id);
            const nowSaved = state.savedIds.has(opp.id);
            saveDetailBtn.textContent = nowSaved ? '★ Saved' : '☆ Save';
        });
    }
}

/* ============================================================
   TYPE SWITCHER
   ============================================================ */
function initTypeSwitcher() {
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            if (type === state.activeType) return;

            state.activeType = type;

            document.querySelectorAll('.type-btn').forEach(b =>
                b.classList.toggle('active', b.dataset.type === type)
            );

            renderCards();
        });
    });
}

/* ============================================================
   SEARCH
   ============================================================ */
function initSearch() {
    const searchInput   = document.getElementById('searchInput');
    const locationInput = document.getElementById('locationInput');
    const searchBtn     = document.getElementById('searchBtn');

    function doSearch() {
        state.searchQuery   = searchInput   ? searchInput.value.trim()   : '';
        state.locationQuery = locationInput ? locationInput.value.trim() : '';
        renderCards();
    }

    searchBtn     && searchBtn.addEventListener('click', doSearch);
    searchInput   && searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    locationInput && locationInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
}

/* ============================================================
   FILTER SIDEBAR
   ============================================================ */
function initFilters() {
    // ── Checkboxes: type filter ──────────────────────────────
    document.querySelectorAll('.type-filter').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) state.selectedTypeFilters.add(cb.value);
            else state.selectedTypeFilters.delete(cb.value);
        });
    });

    // ── Checkboxes: work mode ────────────────────────────────
    document.querySelectorAll('.mode-filter').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) state.selectedModes.add(cb.value);
            else state.selectedModes.delete(cb.value);
        });
    });

    // ── Role select ──────────────────────────────────────────
    const roleFilter = document.getElementById('roleFilter');
    roleFilter && roleFilter.addEventListener('change', () => {
        state.selectedRole = roleFilter.value;
    });

    // ── Skill chips ──────────────────────────────────────────
    document.querySelectorAll('.chips button').forEach(chip => {
        chip.addEventListener('click', () => {
            const skill = chip.dataset.skill;
            if (state.selectedSkillChips.has(skill)) {
                state.selectedSkillChips.delete(skill);
                chip.classList.remove('active-chip');
            } else {
                state.selectedSkillChips.add(skill);
                chip.classList.add('active-chip');
            }
        });
    });

    // ── Date radio ───────────────────────────────────────────
    document.querySelectorAll('input[name="date"]').forEach(radio => {
        radio.addEventListener('change', () => {
            state.dateFilter = radio.checked ? parseInt(radio.value, 10) : null;
        });
    });

    // ── Apply / Clear ────────────────────────────────────────
    const applyFiltersBtn = document.getElementById('applyFilters');
    const clearFiltersBtn = document.getElementById('clearFilters');

    applyFiltersBtn && applyFiltersBtn.addEventListener('click', () => {
        renderCards();
        closeMobileFilter();
        showToast('Filters applied');
    });

    clearFiltersBtn && clearFiltersBtn.addEventListener('click', () => {
        // Reset all filter state
        state.selectedModes.clear();
        state.selectedTypeFilters.clear();
        state.selectedRole      = '';
        state.selectedSkillChips.clear();
        state.dateFilter        = null;

        // Reset all checkboxes, radios, selects, chips
        document.querySelectorAll('.type-filter, .mode-filter').forEach(cb => cb.checked = false);
        document.querySelectorAll('input[name="date"]').forEach(r => r.checked = false);
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) roleFilter.value = '';
        document.querySelectorAll('.chips button').forEach(c => c.classList.remove('active-chip'));

        renderCards();
        showToast('Filters cleared');
    });
}

/* ============================================================
   SORT
   ============================================================ */
function initSort() {
    const sortSelect = document.getElementById('sortSelect');
    const mobileSort = document.getElementById('mobileSort');

    [sortSelect, mobileSort].forEach(sel => {
        if (!sel) return;
        sel.addEventListener('change', () => {
            state.sortBy = sel.value;
            if (sortSelect) sortSelect.value = sel.value;
            if (mobileSort) mobileSort.value = sel.value;
            renderCards();
        });
    });
}

/* ============================================================
   MOBILE FILTER DRAWER
   ============================================================ */
function closeMobileFilter() {
    filterSidebar && filterSidebar.classList.remove('mobile-open');
    overlay && overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function initMobileFilter() {
    const filterOpen  = document.getElementById('filterOpen');
    const filterClose = document.getElementById('filterClose');

    filterOpen && filterOpen.addEventListener('click', () => {
        filterSidebar && filterSidebar.classList.add('mobile-open');
        overlay && overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    });

    filterClose && filterClose.addEventListener('click', closeMobileFilter);
}

/* ============================================================
   MODAL CLOSE
   ============================================================ */
function initModalClose() {
    // Overlay click closes modals (but not the mobile filter drawer)
    overlay && overlay.addEventListener('click', () => {
        if (filterSidebar && filterSidebar.classList.contains('mobile-open')) {
            closeMobileFilter();
        } else {
            closeAllModals();
        }
    });

    // × buttons on modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Skill-gap "View Recommended Learning" button
    const learningBtn = document.getElementById('learningBtn');
    learningBtn && learningBtn.addEventListener('click', () => {
        showToast('Opening Career Graph… (feature coming soon)');
    });
}

/* ============================================================
   INIT
   ============================================================ */
function initOpportunities() {
    // Guard: only run when the Opportunities tab is in the DOM
    if (!cardsContainer) return;

    initTypeSwitcher();
    initSearch();
    initFilters();
    initSort();
    initMobileFilter();
    initModalClose();

    // Initial render
    renderCards();
    renderSavedList();
    renderApplicationsList();
}

// Run after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOpportunities);
} else {
    initOpportunities();
}
