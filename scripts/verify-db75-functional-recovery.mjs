import fs from "node:fs";
import process from "node:process";

const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};
const read=path=>fs.readFileSync(path,"utf8");

const recovery=read("maxdock-db75-recovery.js");
const config=read("maxdock-config.js");

check(recovery===read("db04/maxdock-db75-recovery.js"),"Root and db04 recovery assets differ.");
check(config===read("db04/maxdock-config.js"),"Root and db04 config assets differ.");
check(config.includes('version: "MaxDock-v97-DB75"'),"DB75 runtime version is missing.");
check(config.includes('loadScript("maxdock-db75-recovery.js","97-db75","db75-recovery")'),"DB75 recovery loader is missing.");
check(recovery.includes('replaceControl("bookAppointmentFromMyAppointments"'),"Book Appointment recovery is missing.");
check(recovery.includes('window.openQueueDisplay=function()'),"Operations Queue full-screen recovery is missing.");
check(recovery.includes('repairDetails()'),"Metric settings/details recovery is missing.");
check(recovery.includes('repairWorkspaces()'),"Settings and Data Integration tab recovery is missing.");
check(recovery.includes('repairAdminSpacing()'),"User table checkbox spacing repair is missing.");
check(new Set(["calendar","clock","check","alert","inbound","outbound","skids","blocked","slots","appointment","notice","cancelled"].filter(name=>recovery.includes(`${name}:`))).size>=12,"Semantic KPI icon set is incomplete.");

if(failures.length){
  console.error("DB75 functional recovery verification failed:");
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exitCode=1;
}else{
  console.log("DB75 functional recovery contract verified.");
}
