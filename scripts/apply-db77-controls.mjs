import fs from 'node:fs';
const pages=['admin.html','dashboard.html','data.html','index.html','login.html','my-appointments.html','queue.html','reports.html','set-password.html','settings.html'];
for(const root of ['', 'db04/']){
  for(const page of pages){
    const path=root+page;
    let source=fs.readFileSync(path,'utf8').replaceAll('98-db76','99-db77');
    source=source.replace(/\s*<script src="\.\/maxdock-db76-recovery\.js\?v=99-db77"><\/script>/g,'');
    fs.writeFileSync(path,source);
  }
  const configPath=root+'maxdock-config.js';
  let config=fs.readFileSync(configPath,'utf8');
  config=config.replace('MaxDock-v98-DB76','MaxDock-v99-DB77');
  config=config.replace('await loadScript("maxdock-layout-discipline.js","98-db76","db73-layout");','await loadScript("maxdock-layout-discipline.js","99-db77","db73-layout");\n    await loadScript("maxdock-db77-controls.js","99-db77","db77-controls");');
  config=config.replace('document.documentElement.dataset.maxdockRelease="db76";','document.documentElement.dataset.maxdockRelease="db77";');
  config=config.replace('stamp.textContent="DB76 · full functional audit";','stamp.textContent="DB77 · control functionality";');
  fs.writeFileSync(configPath,config);
}
