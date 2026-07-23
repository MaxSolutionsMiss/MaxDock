(function(){
'use strict';
const PAGE=document.body.dataset.page||'';
const $=id=>document.getElementById(id);
const gearSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.1 4.7-.1-2.4-2.1-.7a7.5 7.5 0 0 0-.7-1.7l1-2-1.8-1.7-2 1a7.5 7.5 0 0 0-1.7-.7L12 2.9H9.6L9 5a7.5 7.5 0 0 0-1.7.7l-2-1-1.7 1.7 1 2a7.5 7.5 0 0 0-.7 1.7l-2.1.7v2.4l2.1.7c.2.6.4 1.2.7 1.7l-1 2 1.7 1.7 2-1c.5.3 1.1.5 1.7.7l.7 2.1H12l.7-2.1c.6-.2 1.2-.4 1.7-.7l2 1 1.8-1.7-1-2c.3-.5.5-1.1.7-1.7l2.2-.7Z"/></svg>';
let applying=false;
function removeInjected(){
 document.body.classList.remove('db71Regression');
 document.querySelectorAll('.db71MetricCustomize,.db73MetricCustomize,.db72MetricCustomize,[id^="db71-"]').forEach(n=>n.remove());
 if(PAGE==='dashboard')document.querySelectorAll('#dashboardCustomize,.dashboardCustomize').forEach(n=>n.remove());
 if(PAGE==='reports')document.querySelectorAll('#db64ReportCustomize,.dashboardCustomize').forEach(n=>n.remove());
 if(PAGE==='queue')document.querySelectorAll('#queueCustomize').forEach(n=>n.remove());
 if(PAGE==='myappointments')document.querySelectorAll('.db71MetricCustomize,.db73MetricCustomize,[id^="db71-"]').forEach(n=>n.remove());
}
function cards(container){return [...(container?.children||[])].filter(x=>x.classList.contains('metric')||x.classList.contains('myAppointmentMetric'));}
function makeGear(container,host,title,key){
 if(!container||!host||host.querySelector('#maxdockMetricGear-'+key))return;
 const items=cards(container);if(!items.length)return;
 const d=document.createElement('details');d.className='maxdockMetricGear';d.id='maxdockMetricGear-'+key;
 d.innerHTML='<summary aria-label="Customize metric cards" title="Customize metric cards">'+gearSvg+'</summary><div class="maxdockMetricMenu"><strong>'+title+'</strong><div class="maxdockMetricOptions"></div><label class="maxdockMetricWide"><input type="checkbox" data-all checked> Show KPI dashboard</label><button class="secondaryBtn" type="button" data-reset>Reset default view</button></div>';
 host.appendChild(d);
 const opts=d.querySelector('.maxdockMetricOptions');
 items.forEach((card,i)=>{const label=card.querySelector('small')?.textContent?.trim()||`Metric ${i+1}`;const row=document.createElement('label');row.innerHTML=`<input type="checkbox" checked data-index="${i}"><span>${label}</span>`;opts.appendChild(row)});
 d.addEventListener('change',e=>{if(e.target.matches('[data-index]'))items[+e.target.dataset.index].hidden=!e.target.checked;if(e.target.matches('[data-all]'))container.hidden=!e.target.checked});
 d.querySelector('[data-reset]').onclick=()=>{container.hidden=false;d.querySelector('[data-all]').checked=true;d.querySelectorAll('[data-index]').forEach((x,i)=>{x.checked=true;items[i].hidden=false})};
}
function applyControls(){
 if(applying)return;applying=true;removeInjected();
 if(PAGE==='dashboard'){
  document.querySelectorAll('.dashboardPrimaryActions,.appointmentActionBtn,.blockActionBtn').forEach(n=>{n.hidden=false;n.style.removeProperty('display')});
  makeGear($('metrics'),document.querySelector('.dashboardFilters'),'Dashboard KPIs','dashboard');
 }
 if(PAGE==='reports')makeGear($('reportMetrics'),document.querySelector('.reportFilters'),'Report KPIs','reports');
 if(PAGE==='queue'){
  const actions=document.querySelector('.queueFilterActions'),full=$('openQueueDisplay');
  if(full&&actions){actions.appendChild(full);full.onclick=async e=>{e.preventDefault();if(typeof window.openQueueDisplay==='function')return window.openQueueDisplay();const target=document.querySelector('main');if(!document.fullscreenElement)await target.requestFullscreen();else await document.exitFullscreen()}}
  makeGear($('queueMetrics'),actions,'Queue KPIs','queue');
 }
 if(PAGE==='admin'){
  const b=$('addUserButton'),head=$('adminUserListTitle')?.closest('.panelHeader');if(b&&head&&b.parentElement!==head)head.appendChild(b);
 }
 applying=false;
}
function installSettings(){
 if(PAGE!=='settings')return;
 const host=document.querySelector('.settingsGroup,.sectionWorkspacePanel');
 if(host&&!$('setSuggestSameDayConsolidation')){
  const row=document.createElement('div');row.className='field settingToggleField db74ConsolidationSetting';row.innerHTML='<label for="setSuggestSameDayConsolidation">Same-day shipment consolidation</label><label class="checkboxRow"><input id="setSuggestSameDayConsolidation" type="checkbox" checked><span>Suggest combining shipments between the same two locations on the same day</span></label><small>MaxDock warns the requester before confirmation when another compatible shipment is already scheduled on the same route and date.</small>';host.appendChild(row);
 }
 document.querySelectorAll('.settingsTopActions,.settingsGlobalActions').forEach(n=>n.remove());
 const originalRender=window.renderSettings;if(originalRender&&!originalRender.db74){window.renderSettings=function(){const r=originalRender.apply(this,arguments);setTimeout(()=>{if($('setSuggestSameDayConsolidation'))$('setSuggestSameDayConsolidation').checked=window.settings?.suggestSameDayConsolidation!==false},0);return r};window.renderSettings.db74=true}
 const originalSave=window.saveSettings;if(originalSave&&!originalSave.db74){window.saveSettings=async function(){if(window.settings)window.settings.suggestSameDayConsolidation=$('setSuggestSameDayConsolidation')?.checked!==false;return originalSave.apply(this,arguments)};window.saveSettings.db74=true}
}
function installBookingEnhancements(){
 if(PAGE!=='dashboard'||typeof window.submitBooking!=='function'||window.submitBooking.db74)return;
 const original=window.submitBooking;
 window.submitBooking=async function(){
  const date=$('reqDate')?.value||window.selectedSlot?.date;const direction=String($('reqDirection')?.value||'').toLowerCase();const counterpart=String($('reqCompany')?.value||$('reqRequesterType')?.value||'').trim().toLowerCase();
  const enabled=$('setSuggestSameDayConsolidation')?.checked!==false&&(window.settings?.suggestSameDayConsolidation!==false);
  if(enabled&&date&&counterpart&&typeof window.getAppointments==='function'){
   const match=window.getAppointments().find(a=>a.date===date&&a.status!=='Cancelled'&&a.type!=='Dock Block'&&String(a.direction||'').toLowerCase()===direction&&String(a.company||a.requesterLocationName||'').trim().toLowerCase()===counterpart);
   if(match&&!confirm(`Another shipment on this same route is already scheduled for ${match.start||''}–${match.end||''} on ${date} (${match.ref||'existing appointment'}).\n\nSelect OK to continue with a separate truck, or Cancel to go back and combine the shipments.`))return;
  }
  const result=await original.apply(this,arguments);
  setTimeout(()=>{
   const booked=window.lastBooked;if(!booked)return;const panel=$('bookingQrPanel'),img=$('bookingQrImage');if(!panel||!img)return;
   const url=`${location.origin}${location.pathname}?checkin=${encodeURIComponent(booked.ref||booked.id||'')}`;booked.checkinUrl=url;img.src=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(url)}`;panel.hidden=false;
  },100);
  return result;
 };window.submitBooking.db74=true;
}
function init(){applyControls();installSettings();installBookingEnhancements();let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(applyControls,80)}).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100),{once:true});else setTimeout(init,100);
})();