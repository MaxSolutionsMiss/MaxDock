import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {JSDOM,VirtualConsole} from "jsdom";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const layout=fs.readFileSync(path.join(root,"maxdock-layout-discipline.js"),"utf8");
const pages=["admin","dashboard","data","my-appointments","queue","reports","settings"];
const failures=[];

function check(condition,message){
  if(!condition)failures.push(message);
}

function metricMarkup(labels){
  return labels.map((label,index)=>`<div class="metric"><strong>${index}</strong><small>${label}</small></div>`).join("");
}

function seedPage(window,page){
  Object.defineProperty(window,"innerWidth",{value:1900,writable:true});
  window.MAXDOCK_ICONS={
    menu:'<svg data-icon="solid" viewBox="0 0 24 24"><path d="M4 4h16v16H4Z"/></svg>',
    export:'<svg data-icon="line" viewBox="0 0 24 24"><path d="M12 3v15"/></svg>',
    print:'<svg data-icon="line" viewBox="0 0 24 24"><path d="M5 7h14v12H5Z"/></svg>',
    calendar:'<svg data-icon="line" viewBox="0 0 24 24"><path d="M4 5h16v15H4Z"/></svg>',
    refresh:'<svg data-icon="line" viewBox="0 0 24 24"><path d="M4 12h16"/></svg>'
  };
  window.MaxDockDB={
    getProfile:()=>({id:"test-user",username:"test",role_code:"system_admin"}),
    getCurrentLocation:()=>({id:"location-1",name:"Mississauga"}),
    getLocations:()=>[{id:"location-1",name:"Mississauga",code:"MISS"}],
    getLocationDirectory:()=>[],
    isOperationalRole:()=>true,
    hasPermission:()=>true,
    loadPreference:async()=>null,
    savePreference:async()=>null,
    queuePreferenceSave:()=>{},
    getLandingPage:()=>"dashboard.html?v=96-db74"
  };
  window.openRequest=()=>{};
  window.openBlockModal=()=>{};
  window.renderDashboard=()=>{};
  window.closeQueueDisplay=()=>{};
  window.print=()=>{};
  const actions=window.document.querySelector(".headerActions");
  if(actions&&!window.document.getElementById("maxdockAccount")){
    actions.insertAdjacentHTML("beforeend",'<div id="maxdockAccount" class="accountControl"><button class="accountSignOut">Sign Out</button></div>');
  }

  if(page==="dashboard"){
    const metrics=window.document.getElementById("metrics");
    metrics.innerHTML=metricMarkup(["Today","Scheduled","Completed","Priority","Open Slots","Inbound Skids"]);
    const range=window.document.createElement("div");
    range.className="metric rangeMetric";
    range.innerHTML='<small>Date Range</small><select id="dashboardRange"><option>Weekly</option></select>';
    metrics.appendChild(range);
  }
  if(page==="queue"){
    window.document.getElementById("queueMetrics").innerHTML=metricMarkup(["Pending","Inbound","Pending skids","Dock blocks","Due soon"]);
  }
  if(page==="reports"){
    const filters=window.document.querySelector(".reportFilters");
    filters.insertAdjacentHTML("afterbegin",'<div class="filterField"><label for="reportView">Report View</label><select id="reportView"><option>Dock Utilization</option></select></div>');
    window.document.getElementById("reportMetrics").innerHTML=metricMarkup(["Appointments","Inbound","Outbound","Occupied Capacity"]);
  }
  if(page==="my-appointments"){
    window.document.getElementById("myAppointmentMetrics").innerHTML=metricMarkup(["Upcoming","Completed","Cancelled","Unread notices"]);
  }
}

async function render(page){
  const html=fs.readFileSync(path.join(root,`${page}.html`),"utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"");
  const virtualConsole=new VirtualConsole();
  virtualConsole.on("jsdomError",error=>{
    if(!String(error.message).includes("Not implemented: navigation"))failures.push(`${page}: ${error.message}`);
  });
  const dom=new JSDOM(html,{
    url:`https://example.test/${page}.html?v=96-db74`,
    runScripts:"outside-only",
    pretendToBeVisual:true,
    virtualConsole
  });
  seedPage(dom.window,page);
  try{dom.window.eval(layout)}
  catch(error){failures.push(`${page}: layout execution failed: ${error.stack||error}`)}
  await new Promise(resolve=>dom.window.setTimeout(resolve,180));
  return dom;
}

for(const page of pages){
  const dom=await render(page);
  const {document}=dom.window;
  const head=document.querySelector("main>.pageHead");
  const docs=document.getElementById("maxdockDocumentUtilityRow");
  check(Boolean(document.querySelector(".maxdockSideRailDB47")),`${page}: shared side navigation was not created.`);
  check(Boolean(head&&docs&&docs.parentElement===head),`${page}: Export/Print are not in the page-title row.`);
  check(Boolean(docs?.querySelector("#maxdockGlobalExport")&&docs?.querySelector("#maxdockGlobalPrint")),`${page}: shared Export/Print buttons are incomplete.`);

  if(page==="queue"){
    const toolbar=document.querySelector(".queueFilters");
    const right=toolbar?.querySelector(":scope>.db72QueueRightActions");
    check(toolbar?.parentElement===document.querySelector("main"),"queue: toolbar is not a direct main-page row.");
    check(toolbar?.previousElementSibling===head,"queue: toolbar is not directly below the title row.");
    check(right?.firstElementChild?.id==="openQueueDisplay","queue: full-screen is not first in the far-right action group.");
    check(right?.lastElementChild?.id==="queueCustomize","queue: gear is not the final far-right control.");
    check(Boolean(right?.querySelector(".db73Gear summary svg[data-icon='solid']")),"queue: gear icon is missing.");
  }

  if(page==="dashboard"){
    const toolbar=document.querySelector(".dashboardFilters");
    const metrics=document.getElementById("metrics");
    const order=[...toolbar.children].map(element=>element.id||element.querySelector("input,select")?.id||element.className);
    check(toolbar?.parentElement===document.querySelector("main"),"dashboard: toolbar is not a direct main-page row.");
    check(toolbar?.previousElementSibling===head,"dashboard: toolbar is not directly below the title row.");
    check(metrics?.previousElementSibling===toolbar,"dashboard: KPI row is not directly below the toolbar.");
    check(!document.querySelector(".dashboardOverviewBand"),"dashboard: obsolete overview wrapper remains active.");
    check(order.some(value=>String(value).includes("db72PrimaryActions")),"dashboard: Book/Block action group is missing.");
    check(toolbar?.lastElementChild?.classList.contains("db73Gear"),`dashboard: gear is not the final toolbar control (${order.join(" | ")}).`);
  }

  if(page==="reports"){
    const toolbar=document.querySelector(".reportFilters");
    check(toolbar?.lastElementChild?.classList.contains("db73Gear"),"reports: gear is not the final toolbar control.");
    check(document.getElementById("runReport")?.classList.contains("db72UpdateAction"),"reports: Update does not use shared control sizing.");
  }

  if(page==="my-appointments"){
    const bar=document.querySelector(".myAppointmentsBookingBarDB52");
    check(bar?.lastElementChild?.classList.contains("db73Gear"),"my-appointments: gear is not at the far right of the reference bar.");
  }

  if(page==="admin"){
    const cards=[...document.querySelectorAll(".adminSummary>.adminSummaryCard")];
    check(cards.length===4&&cards.every(card=>card.classList.contains("db73MetricCard")),"admin: summary cards do not use the shared KPI contract.");
    check(cards.every(card=>card.querySelector(".metricIconDB47")),"admin: summary KPI icons are missing.");
  }

  if(page==="settings"){
    const workspace=document.querySelector(".settingsWorkspace");
    const tabs=[...workspace.querySelectorAll(".sectionWorkspaceTabs>[data-section-target]")];
    const panels=[...workspace.querySelectorAll(".sectionWorkspaceContent>[data-section-panel]")];
    for(const tab of tabs){
      tab.click();
      const active=tab.dataset.sectionTarget;
      check(panels.filter(panel=>!panel.hidden).length===1,`settings: ${active} does not show exactly one panel.`);
      const panel=panels.find(item=>item.dataset.sectionPanel===active);
      check(Boolean(panel&&!panel.hidden&&panel.querySelector(".db72SettingsSectionActions")),`settings: ${active} is missing its Save/Reset actions.`);
    }
  }

  dom.window.close();
}

const mis=fs.readFileSync(path.join(root,"maxdock-mis.js"),"utf8");
check(mis.includes('const bridgeFields=["misDatabaseType","misServerName","misServerPort","misDatabaseName","misCredentialSecret"]'),"data: secure-bridge-only field contract is missing.");
check(mis.includes("field.hidden=!bridge"),"data: Daily CSV mode does not hide database-only fields.");

if(failures.length){
  console.error("DB73 DOM verification failed:");
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exitCode=1;
}else{
  console.log("DB73 shared DOM contract verified.");
}
