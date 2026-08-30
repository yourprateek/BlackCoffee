console.log("JS Linked");

// JS version of page change
const homeTab = document.getElementById("home");
const profileTab = document.getElementById("profile");
const careerGraphTab = document.getElementById("careerGraph");
const interNJobTab = document.getElementById("internNJob");
let currentTab = homeTab;

function changeTab(newTab){
    currentTab.classList.remove("currentTab");
    currentTab = newTab;
    currentTab.classList.add("currentTab");
}
changeTab(homeTab);     //this one is for getting home page when refreshed
