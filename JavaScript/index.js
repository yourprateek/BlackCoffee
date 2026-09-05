console.log("JS Linked");

// ---- THEME TOGGLE ----
const themeBtn = document.getElementById("theme");
const themeIcon = themeBtn ? themeBtn.querySelector("img") : null;
const html = document.documentElement;

function applyTheme(theme) {
    if (theme === "light") {
        html.setAttribute("data-theme", "light");
        if (themeIcon) themeIcon.src = "./svg/moon.svg";
    } else {
        html.removeAttribute("data-theme");
        if (themeIcon) themeIcon.src = "./svg/sun.svg";
    }
}

// Load saved preference
applyTheme(localStorage.getItem("theme") || "dark");

if (themeBtn) {
    themeBtn.addEventListener("click", () => {
        const isLight = html.hasAttribute("data-theme");
        const next = isLight ? "dark" : "light";
        localStorage.setItem("theme", next);
        applyTheme(next);
    });
}
// ---- THEME TOGGLE END ----

// JS version of page change
const homeTab = document.getElementById("home");
const profileTab = document.getElementById("profile");
const careerGraphTab = document.getElementById("careerGraph");
const interNJobTab = document.getElementById("internNJob");
const chatTab = document.getElementById("chat");
let currentTab = homeTab;
const homeBtn = document.querySelector("nav button");

const footerEl = document.querySelector("footer");

function changeTab(newTab, clickedButton) {
    const userEmail = localStorage.getItem("userEmail");
    
    // Auth guard for protected tabs
    if (newTab === profileTab || newTab === interNJobTab || newTab === chatTab) {
        if (!userEmail) {
            window.location.href = "login.html";
            return;
        }
    }

    currentTab.classList.remove("currentTab");
    currentTab = newTab;
    currentTab.classList.add("currentTab");

    document.querySelectorAll("nav button").forEach(btn =>
        btn.classList.remove("activeBtn")
    );
    if (clickedButton) {
        clickedButton.classList.add("activeBtn");
    }

    // Hide footer on Assistant (Chat) and Career Graph tabs
    if (footerEl) {
        if (newTab === chatTab || newTab === careerGraphTab) {
            footerEl.style.display = "none";
        } else {
            footerEl.style.display = "";
        }
    }
}
changeTab(homeTab, homeBtn);     //this one is for getting home page when refreshed

// Profile tab: chat widget toggle
const chatBtn = document.getElementById("chatBtn");
const chatPopup = document.getElementById("chatPopup");
const closeChat = document.getElementById("closeChat");

if (chatBtn && chatPopup && closeChat) {
    chatBtn.addEventListener("click", () => {
        chatPopup.classList.toggle("open");
    });

    closeChat.addEventListener("click", () => {
        chatPopup.classList.remove("open");
    });

    // Wire popup input → jump to AI Chat tab
    const popupInput  = chatPopup.querySelector(".chat-input input");
    const popupArrow  = chatPopup.querySelector(".chat-input button");

    function launchFromPopup() {
        const question = popupInput ? popupInput.value.trim() : "";
        if (!question) return;
        popupInput.value = "";
        chatPopup.classList.remove("open");
        jumpToChat(question);   // defined in chat.js
    }

    if (popupInput) {
        popupInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                launchFromPopup();
            }
        });
    }

    if (popupArrow) {
        popupArrow.addEventListener("click", launchFromPopup);
    }
}

// ---- ROADMAP TAB SWITCHER ----
function switchRoadmap(role, btn) {
    document.querySelectorAll('.roadmap').forEach(r => r.classList.remove('active'));
    document.querySelectorAll('.role-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('roadmap-' + role).classList.add('active');
    btn.classList.add('active');
}
// ---- ROADMAP TAB SWITCHER END ----

// ---- AUTH & DROPDOWN LOGIC ----
document.addEventListener("DOMContentLoaded", () => {
    const userEmail = localStorage.getItem("userEmail");
    const loginBtn = document.getElementById("login");
    const profileDropdown = document.getElementById("profile-dropdown");
    const userEmailDisplay = document.getElementById("user-email-display");
    const profileBtn = document.getElementById("profile-btn");
    const profileMenu = document.getElementById("profile-menu");
    
    // Auth UI state
    if (userEmail) {
        if (loginBtn) loginBtn.style.display = "none";
        if (profileDropdown) profileDropdown.style.display = "block";
        if (userEmailDisplay) userEmailDisplay.textContent = userEmail;
    } else {
        if (loginBtn) loginBtn.style.display = "inline-flex";
        if (profileDropdown) profileDropdown.style.display = "none";
    }

    // Toggle dropdown
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle("show");
        });

        // Close when clicking outside
        document.addEventListener("click", (e) => {
            if (!profileDropdown.contains(e.target)) {
                profileMenu.classList.remove("show");
            }
        });
    }

    // Dropdown Actions
    const menuProfileBtn = document.getElementById("menu-profile-btn");
    const menuNotifBtn = document.getElementById("menu-notifications-btn");
    const signOutBtn = document.getElementById("sign-out-btn");
    
    // The "Profile" button inside the nav header usually has index 1 (0=Home, 1=Profile)
    const profileNavBtn = document.querySelectorAll("nav button")[1];

    if (menuProfileBtn) {
        menuProfileBtn.addEventListener("click", (e) => {
            e.preventDefault();
            changeTab(profileTab, profileNavBtn);
            profileMenu.classList.remove("show");
        });
    }

    if (menuNotifBtn) {
        menuNotifBtn.addEventListener("click", (e) => {
            e.preventDefault();
            // Notifications logic goes here later
            profileMenu.classList.remove("show");
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("userEmail");
            localStorage.removeItem("userName");
            window.location.href = "login.html";
        });
    }
});
// ---- AUTH & DROPDOWN LOGIC END ----
