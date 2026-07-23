import fs from 'node:fs';
import process from 'node:process';

const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};
const read=path=>fs.readFileSync(path,'utf8');
const pages=['admin.html','dashboard.html','data.html','index.html','login.html','my-appointments.html','queue.html','reports.html','set-password.html','settings.html'];

for(const page of pages){
  const source=read(page);
  check(source.includes('98-db76'),`${page} is missing DB76 cache markers.`);
  check(!source.includes('96-db74')&&!source.includes('97-db75'),`${page} still references an older runtime.`);
  check(source===read(`db04/${page}`),`${page} and db04/${page} differ.`);
}
const config=read('maxdock-config.js');
const recovery=read('maxdock-db76-recovery.js');
check(config===read('db04/maxdock-config.js'),'Config root/db04 mismatch.');
check(recovery===read('db04/maxdock-db76-recovery.js'),'Recovery root/db04 mismatch.');
check(config.includes('MaxDock-v98-DB76'),'DB76 runtime version missing.');
check(recovery.includes('bookAppointmentFromMyAppointments'),'Booking recovery missing.');
check(recovery.includes('nativeQueueDisplay'),'Queue full-screen recovery missing.');
check(recovery.includes('repairWorkspaces'),'Workspace recovery missing.');
check(recovery.includes('repairMetricIcons'),'Semantic KPI recovery missing.');

if(failures.length){
  console.error('DB76 audit failed:');
  failures.forEach(item=>console.error(`- ${item}`));
  process.exitCode=1;
}else console.log('DB76 full functional audit contract verified.');
