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

function changeTab(newTab, clickedButton) {
    currentTab.classList.remove("currentTab");
    currentTab = newTab;
    currentTab.classList.add("currentTab");

    document.querySelectorAll("nav button").forEach(btn =>
        btn.classList.remove("activeBtn")
    );
    clickedButton.classList.add("activeBtn");
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

