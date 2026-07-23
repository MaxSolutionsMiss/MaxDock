import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const layout=read("maxdock-layout-discipline.js");
const css=read("maxdock.css");
const config=read("maxdock-config.js");
const pages=[
  "admin.html",
  "dashboard.html",
  "data.html",
  "index.html",
  "login.html",
  "my-appointments.html",
  "queue.html",
  "reports.html",
  "set-password.html",
  "settings.html"
];

const failures=[];
function check(condition,message){
  if(!condition)failures.push(message);
}
function contains(source,fragment,message){
  check(source.includes(fragment),message);
}

for(const page of pages){
  const source=read(page);
  check(!source.includes("93-db71"),`${page} still references DB71 cache markers.`);
  if(page.endsWith(".html")){
    check(source.includes("96-db74"),`${page} is missing the DB72 cache marker.`);
  }
  check(source===read(`db04/${page}`),`${page} and db04/${page} are not identical.`);
}

for(const file of [
  "maxdock-config.js",
  "maxdock-db.js",
  "maxdock-integration.js",
  "maxdock-layout-discipline.js",
  "maxdock-mis.js",
  "maxdock-my-appointments.js",
  "maxdock-queue.js",
  "maxdock.css"
]){
  check(read(file)===read(`db04/${file}`),`${file} and db04/${file} are not identical.`);
}

contains(layout,"/* DB72: one final shared layout and interaction contract.","DB72 layout controller is missing.");
contains(layout,"window.MaxDockDB72Consistency={normalize,installObservers};","DB72 layout controller is not exposed to the finalizer.");
check(layout.lastIndexOf("DB72 deliberately runs after every consolidated legacy module")>layout.lastIndexOf("Consolidated from maxdock-db70.js."),"DB72 is not finalized after the legacy controller.");

contains(layout,'order(toolbar,[date,status,primary,range,refresh,gear]);',"Dashboard control order is not locked.");
contains(layout,'order(toolbar,[date,status,quick,right]);',"Queue control order is not locked.");
contains(layout,'order(toolbar,[view,preset,custom,update,gear]);',"Reports control order is not locked.");
contains(layout,'right.appendChild(display);',"Queue full-screen action is not assigned to the right-side action group.");
contains(layout,'if(gear)right.appendChild(gear);',"Queue gear is not assigned after full-screen.");
contains(layout,'bookingBar.appendChild(gear);',"My Appointments gear is not locked to the far right.");
contains(layout,'document.querySelector("main .pageHead")',"Shared document actions are not assigned to the page-title row.");

contains(layout,'{container:"metrics",toggle:"dashboardShowMetrics"}',"Dashboard KPI master toggle is missing.");
contains(layout,'{container:"queueMetrics",toggle:"queueShowMetrics"}',"Queue KPI master toggle is missing.");
contains(layout,'{container:"reportMetrics",toggle:"db64ReportShowMetrics"}',"Reports KPI master toggle is missing.");
contains(layout,'important(container,"display","none")',"KPI master toggle does not hide the entire metrics container.");
contains(layout,'important(card,"grid-template-columns","40px minmax(0,1fr)")',"Shared horizontal KPI geometry is missing.");

contains(layout,'button.addEventListener("click",event=>',"Settings tab click repair is missing.");
contains(layout,'activateSettingsSection(workspace,button.dataset.sectionTarget);',"Settings tabs are not wired to their panels.");
contains(layout,'panels.forEach(ensureSettingsActions);',"Per-section Settings actions are missing.");
contains(layout,'save.textContent="Save Settings";',"Per-section Save Settings control is missing.");
contains(layout,'reset.textContent="Reset Defaults";',"Per-section Reset Defaults control is missing.");

contains(css,"--db72-card-height:78px","Shared 78px KPI height is missing.");
contains(css,"grid-template-columns:40px minmax(0,1fr)!important","KPI icon/value grid is missing.");
contains(css,'.db72QueueRightActions{\n  margin-left:auto!important',"Queue right actions are not pushed to the far edge.");
contains(css,'.db72ReportControlBar>.db72Gear{\n  margin-left:auto!important',"Reports gear is not pushed to the far edge.");
contains(css,'.db72DashboardControlBar>.db72Gear{\n  margin-left:auto!important',"Dashboard gear is not pushed to the far edge.");
contains(css,"height:var(--db72-control-height)!important","Shared 40px action/control sizing is missing.");
contains(css,".db72LegacySettingsActions{\n  display:none!important","Legacy global Settings actions are still active.");
contains(css,">[data-section-panel][hidden]{\n  display:none!important","Inactive Settings panels are not explicitly hidden.");
contains(config,'version: "MaxDock-v94-DB72"',"Runtime version is not DB72.");
contains(config,'dataset.maxdockRelease="db72"',"Document release marker is not DB72.");
contains(config,'stamp.textContent="DB72 · consistency repair"',"Visible release stamp is not DB72.");

const settings=read("settings.html");
const tabTargets=[...settings.matchAll(/data-section-target="([^"]+)"/g)].map(match=>match[1]);
const panelTargets=[...settings.matchAll(/data-section-panel="([^"]+)"/g)].map(match=>match[1]);
check(tabTargets.length===5,"Settings must expose exactly five location-setting tabs.");
check(JSON.stringify(tabTargets)===JSON.stringify(panelTargets),"Settings tabs and panels do not have a one-to-one mapping.");

const numberedPatchAssets=[...new Set(
  pages.flatMap(page=>[...read(page).matchAll(/(?:src|href)="[^"]*(?:db|patch)[_-]?\d+\.(?:css|js)[^"]*"/gi)].map(match=>match[0]))
)];
check(numberedPatchAssets.length===0,`Numbered patch assets remain active: ${numberedPatchAssets.join(", ")}`);

if(failures.length){
  console.error("DB72 consistency verification failed:");
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exitCode=1;
}else{
  console.log("DB72 consistency contract verified.");
}

