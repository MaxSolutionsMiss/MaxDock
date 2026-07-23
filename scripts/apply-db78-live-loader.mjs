import { readFileSync, writeFileSync } from 'node:fs';
// Explicitly attach the DB78 controls to every affected live page.
const pages=['dashboard.html','queue.html','index.html','my-appointments.html','reports.html','admin.html'];
for(const name of pages){
  const path=`db04/${name}`;
  let html=readFileSync(path,'utf8').replaceAll('v=99-db77','v=100-db78').replaceAll('v=98-db76','v=100-db78');
  html=html.replace(/\n?<script src="\.\/maxdock-db(?:76-recovery|77-controls)\.js\?v=[^"]+"><\/script>/g,'');
  html=html.replace('</body>','<script src="./maxdock-db77-controls.js?v=100-db78"></script>\n</body>');
  writeFileSync(path,html);
}
