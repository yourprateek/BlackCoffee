console.log("JS Linked");

// JS version of page change
const homeTab = document.getElementById("home");
const profileTab = document.getElementById("profile");
const careerGraphTab = document.getElementById("careerGraph");
const interNJobTab = document.getElementById("internNJob");
let currentTab = homeTab;
const homeBtn = document.querySelector("nav button");

function changeTab(newTab, clickedButton){
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
}
