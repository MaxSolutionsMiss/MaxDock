(function(){
  'use strict';
  const page=document.body.dataset.page||'';
  function bindDetails(details){
    if(!details||details.dataset.db72Bound)return;
    details.dataset.db72Bound='1';
    const summary=details.querySelector(':scope > summary');
    if(!summary)return;
    summary.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();details.open=!details.open;
    });
    document.addEventListener('click',e=>{if(details.open&&!details.contains(e.target))details.open=false});
  }
  function repairGears(){
    document.querySelectorAll('#queueCustomize,#dashboardCustomize,.dashboardCustomize,#db64ReportCustomize,#myAppointmentsCustomizeDB65').forEach(bindDetails);
    if(page==='queue'){
      const gear=document.getElementById('queueCustomize');
      const full=document.getElementById('openQueueDisplay');
      const bar=document.querySelector('.queueFilterBar,.filterBar,.filterActions');
      if(gear&&bar&&gear.parentElement!==bar)bar.appendChild(gear);
      if(full&&!full.dataset.db72Bound){
        full.dataset.db72Bound='1';
        full.addEventListener('click',async e=>{
          e.preventDefault();
          const target=document.querySelector('main')||document.documentElement;
          try{if(!document.fullscreenElement)await target.requestFullscreen();else await document.exitFullscreen()}catch(err){console.error(err)}
        });
      }
    }
  }
  function settingsActions(){
    if(page!=='settings')return;
    document.querySelectorAll('.sectionWorkspacePanel,.settingsGroup').forEach(panel=>{
      if(panel.querySelector('.settingsSectionActionsDB72'))return;
      const row=document.createElement('div');row.className='settingsSectionActionsDB72';
      row.innerHTML='<button type="button" class="secondaryBtn">Reset Default</button><button type="button" class="primaryBtn">Save Settings</button>';
      row.children[0].addEventListener('click',()=>window.resetSettings?.());
      row.children[1].addEventListener('click',()=>window.saveSettings?.());
      panel.appendChild(row);
    });
  }
  function run(){repairGears();settingsActions()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  setTimeout(run,400);setTimeout(run,1200);
  new MutationObserver(()=>repairGears()).observe(document.documentElement,{childList:true,subtree:true});
})();
