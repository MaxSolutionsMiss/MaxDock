import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
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
const mirrored=[
  ...pages,
  "DEPLOYMENT_DB73.txt",
  "maxdock-config.js",
  "maxdock-db.js",
  "maxdock-integration.js",
  "maxdock-layout-discipline.js",
  "maxdock-mis.js",
  "maxdock-my-appointments.js",
  "maxdock-queue.js",
  "maxdock.css"
];
const layout=read("maxdock-layout-discipline.js");
const css=read("maxdock.css");
const config=read("maxdock-config.js");
const mis=read("maxdock-mis.js");
const failures=[];

function check(condition,message){
  if(!condition)failures.push(message);
}
function contains(source,fragment,message){
  check(source.includes(fragment),message);
}

for(const file of mirrored){
  check(read(file)===read(`db04/${file}`),`${file} and db04/${file} are not identical.`);
}

for(const page of pages){
  const source=read(page);
  check(source.includes("96-db74"),`${page} is missing the DB73 cache marker.`);
  check(!source.includes("94-db72"),`${page} still references DB72 assets.`);
  check((source.match(/<link rel="stylesheet"/g)||[]).length===1,`${page} must load exactly one stylesheet.`);

  const ids=[...source.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  const duplicateIds=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
  check(!duplicateIds.length,`${page} has duplicate IDs: ${duplicateIds.join(", ")}.`);
  const idSet=new Set(ids);
  const missingLabels=[...source.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)]
    .map(match=>match[1])
    .filter(id=>!idSet.has(id));
  check(!missingLabels.length,`${page} has labels without controls: ${[...new Set(missingLabels)].join(", ")}.`);

  const numberedPatchAssets=[...source.matchAll(/(?:src|href)="[^"]*(?:maxdock-)?db\d+\.(?:css|js)[^"]*"/gi)].map(match=>match[0]);
  check(!numberedPatchAssets.length,`${page} loads numbered patch assets: ${numberedPatchAssets.join(", ")}.`);
}

contains(config,'version: "MaxDock-v96-DB74"',"Runtime version is not DB73.");
contains(config,'loadScript("maxdock-layout-discipline.js","96-db74","db73-layout")',"DB73 layout loader is missing.");
contains(config,'dataset.maxdockRelease="db73"',"Document release marker is not DB73.");
contains(config,'stamp.textContent="DB73 · shared layout repair"',"Visible release stamp is not DB73.");
contains(config,'document.addEventListener("DOMContentLoaded",initialize,{once:true})',"DB73 layout does not start at DOMContentLoaded.");

contains(layout,"/* DB73: one authoritative layout and interaction contract.","DB73 authoritative controller is missing.");
contains(layout,"static freezeLegacyObservers()","Legacy observer freeze is missing.");
contains(layout,"window.MaxDockSharedMutationObserver?.freezeLegacyObservers?.();","DB73 does not take observer ownership.");
contains(layout,"window.MaxDockDB73Consistency={normalize,installObserver};","DB73 controller is not exposed to the finalizer.");
contains(layout,'pageHead.insertAdjacentElement("afterend",filters);',"Queue DB33 routine still mounts controls in the title row.");
contains(layout,"placeAfter(pageHead,toolbar);","Queue/Dashboard toolbars are not anchored below their title rows.");
contains(layout,"unwrapDashboardBand(pageHead,toolbar,metrics);","Obsolete Dashboard overview wrapper is not removed.");
contains(layout,'order(toolbar,[date,status,primary,range,refresh,gear]);',"Dashboard control order is not locked.");
contains(layout,'order(toolbar,[date,status,quick,right]);',"Queue control order is not locked.");
contains(layout,'order(toolbar,[view,preset,custom,update,gear]);',"Reports control order is not locked.");
contains(layout,'bookingBar.appendChild(gear);',"My Appointments gear is not locked to the far right.");
contains(layout,"normalizeAdminSummary();","User Management KPI harmonization is not active.");
contains(layout,'card.classList.add("db73MetricCard")',"User Management summary cards do not use DB73 KPIs.");
contains(layout,'window.setTimeout(normalize,3600);',"Final post-legacy reconciliation is missing.");
check(!layout.includes("window.MaxDockDB72Consistency={normalize,installObservers};"),"Obsolete DB72 observer controller remains active.");

contains(css,"/* DB73: authoritative cross-page contract. */","DB73 CSS contract is missing.");
contains(css,'body.db73Consistency .db73Gear>summary svg[data-icon="solid"]',"Solid gear-icon repair is missing.");
contains(css,"fill:currentColor!important","Solid gear icon is not filled.");
contains(css,'body.db73Consistency[data-page="admin"] .adminSummary.db73Metrics',"User Management KPI grid is missing.");
contains(css,"--db73-card-height:78px","DB73 78 px KPI height is missing.");
contains(css,'body.db73Consistency[data-page="data"] .misIntegrationForm .formGrid',"Data Integration responsive grid is missing.");

contains(mis,'const bridgeFields=["misDatabaseType","misServerName","misServerPort","misDatabaseName","misCredentialSecret"]',"Secure-bridge-only field list is missing.");
contains(mis,"field.hidden=!bridge","Daily CSV mode does not hide database-only fields.");
contains(mis,'enableLabel.textContent=bridge?"Enable the secure database bridge":"Enable daily CSV imports"',"Data method enable label does not follow the selection.");

const settings=read("settings.html");
const tabTargets=[...settings.matchAll(/data-section-target="([^"]+)"/g)].map(match=>match[1]);
const panelTargets=[...settings.matchAll(/data-section-panel="([^"]+)"/g)].map(match=>match[1]);
check(tabTargets.length===5,"Settings must expose exactly five location-setting tabs.");
check(JSON.stringify(tabTargets)===JSON.stringify(panelTargets),"Settings tabs and panels do not have a one-to-one mapping.");

if(failures.length){
  console.error("DB73 consistency verification failed:");
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exitCode=1;
}else{
  console.log("DB73 consistency contract verified.");
}
