const opportunities=[
{id:1,type:"internships",company:"Google",title:"Frontend Developer Intern",role:"Frontend",match:94,location:"Bangalore, India",mode:"Hybrid",pay:"₹60,000/month",duration:"6 Months",skills:["React","JavaScript","TypeScript","CSS"],deadline:"Sep 15, 2026",posted:2,logo:"G",details:"Work with a frontend engineering team to build accessible, high-performance experiences.",responsibilities:["Build responsive UI components","Collaborate with designers and engineers","Write maintainable frontend code"],required:["JavaScript","React","CSS"],preferred:["TypeScript","Testing"],eligibility:"Computer Science or related degree; graduating 2026–2028."},
{id:2,type:"internships",company:"Microsoft",title:"Software Engineering Intern",role:"Backend",match:91,location:"Hyderabad, India",mode:"On-site",pay:"₹75,000/month",duration:"5 Months",skills:["Python","Node.js","Git"],deadline:"Sep 20, 2026",posted:4,logo:"M",details:"Join a product engineering team and contribute to production software.",responsibilities:["Develop backend services","Debug and test features","Participate in code reviews"],required:["Python","Git"],preferred:["Node.js","Docker"],eligibility:"Engineering students with strong programming fundamentals."},
{id:3,type:"jobs",company:"Razorpay",title:"Junior Frontend Engineer",role:"Frontend",match:88,location:"Bangalore, India",mode:"Hybrid",pay:"₹9–13 LPA",duration:"Full-time",skills:["JavaScript","React","Git"],deadline:"Sep 28, 2026",posted:5,logo:"R",details:"Help create intuitive financial products used by businesses across India.",responsibilities:["Create production UI","Improve performance","Work with product teams"],required:["JavaScript","React"],preferred:["TypeScript","Testing"],eligibility:"0–2 years experience or equivalent project experience."},
{id:4,type:"jobs",company:"Zomato",title:"Data Analyst",role:"Data",match:79,location:"Delhi, India",mode:"Hybrid",pay:"₹8–12 LPA",duration:"Full-time",skills:["Python","SQL","Excel"],deadline:"Oct 05, 2026",posted:8,logo:"Z",details:"Turn business data into insights that improve customer and partner experiences.",responsibilities:["Analyze datasets","Build reports","Present actionable insights"],required:["Python","SQL"],preferred:["Power BI","Statistics"],eligibility:"Bachelor's degree in engineering, statistics, economics or related field."},
{id:5,type:"internships",company:"Adobe",title:"AI / ML Intern",role:"AI / ML",match:84,location:"Noida, India",mode:"On-site",pay:"₹55,000/month",duration:"4 Months",skills:["Python","Machine Learning","Git"],deadline:"Sep 18, 2026",posted:3,logo:"A",details:"Prototype machine learning solutions with a multidisciplinary research and engineering team.",responsibilities:["Prepare datasets","Experiment with models","Document findings"],required:["Python","ML"],preferred:["PyTorch","Docker"],eligibility:"Students pursuing CS, AI, data science or related degrees."},
{id:6,type:"jobs",company:"Freshworks",title:"Associate Product Analyst",role:"Product",match:76,location:"Chennai, India",mode:"Remote",pay:"₹7–10 LPA",duration:"Full-time",skills:["Analytics","SQL","Communication"],deadline:"Oct 12, 2026",posted:12,logo:"F",details:"Support product decisions with data, customer insights and experimentation.",responsibilities:["Track product metrics","Research user needs","Partner with product managers"],required:["SQL","Analytics"],preferred:["A/B Testing"],eligibility:"Strong analytical and communication skills."}
];

let state={
 type:"internships",
 search:"",
 location:"",
 saved:JSON.parse(localStorage.getItem("acadbridgeSaved")||"[]"),
 applications:JSON.parse(localStorage.getItem("acadbridgeApplications")||"[]"),
 prefs:JSON.parse(localStorage.getItem("acadbridgePrefs")||"null"),
 selectedSkills:[]
};

const $=s=>document.querySelector(s);
const cards=$("#cards"), toast=$("#toast"), overlay=$("#overlay");

function saveState(){
 localStorage.setItem("acadbridgeSaved",JSON.stringify(state.saved));
 localStorage.setItem("acadbridgeApplications",JSON.stringify(state.applications));
}
function notify(msg){toast.textContent=msg;toast.classList.add("show");clearTimeout(notify.t);notify.t=setTimeout(()=>toast.classList.remove("show"),2200)}
function matchClass(n){return n>=90?"":n>=80?"good":"avg"}

function render(){
 let data=opportunities.filter(o=>o.type===state.type);
 const q=state.search.toLowerCase(), loc=state.location.toLowerCase();
 const role=$("#roleFilter").value;
 const modes=[...document.querySelectorAll(".mode-filter:checked")].map(x=>x.value);
 const skills=state.selectedSkills;
 if(q)data=data.filter(o=>(o.title+" "+o.company+" "+o.skills.join(" ")).toLowerCase().includes(q));
 if(loc)data=data.filter(o=>o.location.toLowerCase().includes(loc));
 if(role)data=data.filter(o=>o.role===role);
 if(modes.length)data=data.filter(o=>modes.includes(o.mode));
 if(skills.length)data=data.filter(o=>skills.some(s=>o.skills.includes(s)));
 const sort=$("#sortSelect").value;
 if(sort==="Highest Salary"||sort==="Highest Stipend")data.sort((a,b)=>parseInt(b.pay.replace(/\D/g,""))-parseInt(a.pay.replace(/\D/g,"")));
 else if(sort==="Deadline Soon")data.sort((a,b)=>a.deadline.localeCompare(b.deadline));
 else if(sort==="Newest")data.sort((a,b)=>a.posted-b.posted);
 else data.sort((a,b)=>b.match-a.match);
 cards.innerHTML=data.map(cardHTML).join("");
 $("#emptyState").hidden=data.length>0;
 $("#savedCount").textContent=state.saved.length;
 renderSaved(); renderApplications();
}
function cardHTML(o){
 const isSaved=state.saved.includes(o.id);
 return `<article class="card" data-id="${o.id}">
  <div class="card-top"><div class="company-logo">${o.logo}</div><div><div class="company">${o.company}</div><h3>${o.title}</h3></div><button class="match ${matchClass(o.match)}" data-match="${o.id}">${o.match}% Match</button></div>
  <div class="meta"><span>⌖ ${o.location}</span><span>↗ ${o.mode}</span><span>◷ ${o.pay}</span><span>◫ ${o.duration}</span></div>
  <div class="skill-row">${o.skills.map(s=>`<span class="skill">${s}</span>`).join("")}</div>
  <div class="deadline">Deadline: <b>${o.deadline}</b></div>
  <div class="card-actions"><button class="save-btn ${isSaved?"saved":""}" data-save="${o.id}">${isSaved?"♥ Saved":"♡ Save"}</button><button class="apply-btn" data-apply="${o.id}">Quick Apply</button></div>
 </article>`;
}
function renderSaved(){
 const list=$("#savedList"), items=opportunities.filter(o=>state.saved.includes(o.id));
 list.innerHTML=items.length?items.map(o=>`<div class="mini-item"><div><b>${o.title}</b><small>${o.company} · ${o.location}</small></div><span>${o.match}%</span></div>`).join(""):`<div class="mini-item"><div><b>No saved opportunities yet.</b><small>Save a role to see it here.</small></div></div>`;
}
function renderApplications(){
 const list=$("#applicationsList"), apps=state.applications.map(a=>({...a,o:opportunities.find(o=>o.id===a.id)})).filter(a=>a.o);
 list.innerHTML=apps.length?apps.map(a=>`<div class="mini-item"><div><b>${a.o.title}</b><small>${a.o.company} · Applied ${a.date}</small></div><select class="status-select" data-status="${a.id}"><option ${a.status==="Applied"?"selected":""}>Applied</option><option ${a.status==="Screening"?"selected":""}>Screening</option><option ${a.status==="Interview"?"selected":""}>Interview</option><option ${a.status==="Selected"?"selected":""}>Selected</option><option ${a.status==="Rejected"?"selected":""}>Rejected</option></select></div>`).join(""):`<div class="mini-item"><div><b>No applications yet.</b><small>Quick Apply to start tracking.</small></div></div>`;
}

document.addEventListener("click",e=>{
 const type=e.target.closest(".type-btn");
 if(type){state.type=type.dataset.type;document.querySelectorAll(".type-btn").forEach(x=>x.classList.toggle("active",x===type));render();return}
 const save=e.target.closest("[data-save]");
 if(save){const id=+save.dataset.save;state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];saveState();notify(state.saved.includes(id)?"Saved to your opportunities":"Removed from saved");render();return}
 const apply=e.target.closest("[data-apply]");
 if(apply){applyOpportunity(+apply.dataset.apply);return}
 const card=e.target.closest(".card");
 if(card&&!e.target.closest("button"))openDetails(+card.dataset.id);
 const score=e.target.closest("[data-match]");
 if(score){e.stopPropagation();openDetails(+score.dataset.match,true)}
 const chip=e.target.closest(".chips button");
 if(chip){chip.classList.toggle("selected");state.selectedSkills=[...document.querySelectorAll(".chips button.selected")].map(x=>x.dataset.skill);render()}
});
function applyOpportunity(id){
 const o=opportunities.find(x=>x.id===id);
 if(!state.applications.some(x=>x.id===id)){state.applications.push({id,date:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}),status:"Applied"});saveState();render();notify(`Application initiated for ${o.title}`)}
 else notify("You already applied to this opportunity");
}
function openDetails(id,scoreOnly=false){
 const o=opportunities.find(x=>x.id===id);
 $("#detailsContent").innerHTML=scoreOnly?`<div class="eyebrow">MATCH BREAKDOWN</div><h2>${o.match}% Match</h2><p>Why this opportunity matches you</p><div class="detail-section"><div class="meta" style="display:grid;grid-template-columns:1fr 1fr;font-size:13px"><span>Skills <b>98%</b></span><span>Role <b>95%</b></span><span>Location <b>100%</b></span><span>Experience <b>90%</b></span><span>Work Mode <b>100%</b></span></div></div>`:
`<div class="detail-head"><div class="company-logo">${o.logo}</div><div><div class="company">${o.company}</div><h2>${o.title}</h2><span class="match ${matchClass(o.match)}">${o.match}% Match</span></div></div>
<div class="detail-section"><h4>About the Role</h4><p>${o.details}</p></div>
<div class="detail-section"><h4>Responsibilities</h4><ul class="detail-list">${o.responsibilities.map(x=>`<li>${x}</li>`).join("")}</ul></div>
<div class="detail-section"><h4>Required Skills</h4><div class="skill-row">${o.required.map(x=>`<span class="skill">${x}</span>`).join("")}</div></div>
<div class="detail-section"><h4>Preferred Skills</h4><div class="skill-row">${o.preferred.map(x=>`<span class="skill">${x}</span>`).join("")}</div></div>
<div class="detail-section"><h4>Work Details</h4><p>⌖ ${o.location} · ↗ ${o.mode} · ◷ ${o.pay} · ◫ ${o.duration}</p></div>
<div class="detail-section"><h4>Eligibility</h4><p>${o.eligibility}</p></div>
<div class="detail-section"><h4>Application Deadline</h4><p><b>${o.deadline}</b></p></div>
<div class="detail-actions"><button class="primary-btn" id="detailApply">Apply Now</button><button class="outline-btn" id="detailSave">${state.saved.includes(id)?"♥ Saved":"♡ Save"}</button><button class="outline-btn" id="detailShare">Share</button></div>`;
 $("#detailsModal").classList.add("show");overlay.classList.add("show");
 $("#detailApply")?.addEventListener("click",()=>{applyOpportunity(id);closeModals()});
 $("#detailSave")?.addEventListener("click",()=>{const i=state.saved.indexOf(id);state.saved=i>=0?state.saved.filter(x=>x!==id):[...state.saved,id];saveState();render();notify(i>=0?"Removed from saved":"Saved");openDetails(id)});
 $("#detailShare")?.addEventListener("click",()=>{navigator.clipboard?.writeText(location.href);notify("Opportunity link copied")});
}
function closeModals(){$(".details-modal").classList.remove("show");$(".wizard").classList.remove("show");overlay.classList.remove("show")}
document.querySelector(".modal-close").onclick=closeModals;overlay.onclick=closeModals;
$("#searchBtn").onclick=()=>{state.search=$("#searchInput").value.trim();state.location=$("#locationInput").value.trim();render();notify("Opportunities updated")};
$("#searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("#searchBtn").click()});
$("#applyFilters").onclick=()=>{render();$("#filterSidebar").classList.remove("mobile-open");notify("Filters applied")};
$("#clearFilters").onclick=()=>{document.querySelectorAll(".filters input").forEach(x=>x.checked=false);$("#roleFilter").value="";document.querySelectorAll(".chips button").forEach(x=>x.classList.remove("selected"));state.selectedSkills=[];render();notify("Filters cleared")};
$("#sortSelect").onchange=render;$("#mobileSort").onchange=()=>{$("#sortSelect").value=$("#mobileSort").value;render()};
$("#filterOpen").onclick=()=>{$("#filterSidebar").classList.add("mobile-open");overlay.classList.add("show")};
$("#filterClose").onclick=()=>{$("#filterSidebar").classList.remove("mobile-open");overlay.classList.remove("show")};
$("#profileBtn").onclick=()=>{$("#profileMenu").classList.toggle("show");$("#notificationMenu").classList.remove("show")};
$("#notificationBtn").onclick=()=>{$("#notificationMenu").classList.toggle("show");$("#profileMenu").classList.remove("show")};
$("#hamburger").onclick=()=>$("#navLinks").classList.toggle("show");
$("#savedNavBtn").onclick=()=>{document.querySelector(".lower-sections").scrollIntoView({behavior:"smooth"})};
$("#learningBtn").onclick=()=>notify("Recommended TypeScript & Testing learning path opened");
document.addEventListener("change",e=>{if(e.target.matches(".status-select")){const id=+e.target.dataset.status,stateApp=state.applications.find(a=>a.id===id);if(stateApp){stateApp.status=e.target.value;saveState();notify("Application status updated")}}});
document.addEventListener("click",e=>{if(!e.target.closest(".profile-btn")&&!e.target.closest(".profile-menu"))$("#profileMenu").classList.remove("show");if(!e.target.closest("#notificationBtn")&&!e.target.closest(".notification-menu"))$("#notificationMenu").classList.remove("show")});

render();
