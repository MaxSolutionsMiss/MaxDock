import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const pages=['dashboard.html','queue.html','index.html','my-appointments.html','reports.html','admin.html'];
for(const name of pages){
  let html=execFileSync('git',['show',`origin/gh-pages:db04/${name}`],{encoding:'utf8'});
  html=html.replaceAll('v=99-db77','v=100-db78');
  html=html.replaceAll('v=98-db76','v=100-db78');
  html=html.replace(/\n?<script src="\.\/maxdock-db(?:76-recovery|77-controls)\.js\?v=[^"]+"><\/script>/g,'');
  const loader='<script src="./maxdock-db77-controls.js?v=100-db78"></script>';
  html=html.replace('</body>',`${loader}\n</body>`);
  writeFileSync(`db04/${name}`,html);
}
