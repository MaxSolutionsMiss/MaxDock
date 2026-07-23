import fs from 'node:fs';

const pages=['dashboard.html','db04/dashboard.html'];
for(const path of pages){
  let source=fs.readFileSync(path,'utf8');
  source=source.replaceAll('96-db74','98-db76').replaceAll('97-db75','98-db76');
  const loader='<script src="./maxdock-db76-recovery.js?v=98-db76"></script>';
  if(!source.includes(loader))source=source.replace('</body>',`${loader}\n</body>`);
  fs.writeFileSync(path,source);
}

const routeFiles=[
  'maxdock-db.js','db04/maxdock-db.js',
  'maxdock-integration.js','db04/maxdock-integration.js',
  'maxdock-mis.js','db04/maxdock-mis.js',
  'maxdock-my-appointments.js','db04/maxdock-my-appointments.js',
  'maxdock-queue.js','db04/maxdock-queue.js'
];
for(const path of routeFiles){
  let source=fs.readFileSync(path,'utf8');
  source=source.replaceAll('96-db74','98-db76').replaceAll('97-db75','98-db76');
  fs.writeFileSync(path,source);
}
