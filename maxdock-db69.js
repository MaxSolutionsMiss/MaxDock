(function(){
"use strict";

const PAGE=document.body.dataset.page||"";
const $=id=>document.getElementById(id);
const GEAR_SELECTOR="#dashboardCustomize,.dashboardCustomize,#queueCustomize,#db64ReportCustomize,#myAppointmentsCustomizeDB65";
const METRIC_CONFIG=[
  {container:"metrics",toggle:"dashboardShowMetrics"},
  {container:"myAppointmentMetrics",toggle:"myAppointmentsShowMetricsDB65"},
  {container:"queueMetrics",toggle:"queueShowMetrics"},
  {container:"reportMetrics",toggle:"db64ReportShowMetrics"}
];
let normalizing=false;
let normalizationQueued=false;

function pair(id){
  const control=$(id);
  if(!control)return null;
  const host=control.closest(".filterField,.rangeMetric,.dashboardRangeHost")||control.parentElement;
  if(!host)return null;
  host.classList.add("db69FieldPair");
  const oldLabel=host.querySelector(":scope > small");
  if(oldLabel&&!host.querySelector(":scope > label")){
    const label=document.createElement("label");
    label.htmlFor=id;
    label.textContent=oldLabel.textContent.trim();
    oldLabel.replaceWith(label);
  }
  return host;
}

function addGearContract(details,label){
  if(!details)return null;
  details.classList.add("db69Gear");
  const summary=details.querySelector(":scope > summary");
  if(summary){
    summary.setAttribute("title",label);
    summary.setAttribute("aria-label",label);
  }
  return details;
}

function orderChildren(parent,ordered){
  if(!parent)return;
  ordered.filter(Boolean).forEach((element,index)=>{
    if(element.parentElement!==parent||parent.children[index]!==element){
      parent.insertBefore(element,parent.children[index]||null);
    }
  });
}

function orderedDocuments(group,exportButton,printButton,gear){
  if(!group)return;
  orderChildren(group,[exportButton,printButton,gear]);
}

function normalizeDashboard(){
  if(PAGE!=="dashboard")return;
  const toolbar=document.querySelector(".dashboardFilters");
  if(!toolbar)return;
  toolbar.classList.add("db69ControlBar");
  const date=pair("adminDate");
  const status=pair("adminStatus");
  const range=pair("dashboardRange");
  const primary=document.querySelector(".dashboardPrimaryActions");
  const utilities=document.querySelector(".dashboardUtilityActions");
  const gear=addGearContract(document.querySelector("#dashboardCustomize,.dashboardCustomize"),"Customize dashboard");
  if(primary)primary.classList.add("db69QuickActions");
  if(utilities){
    utilities.classList.add("db69RightActions");
    const buttons=utilities.querySelectorAll(":scope > button");
    orderedDocuments(utilities,buttons[0],buttons[1],gear);
  }
  orderChildren(toolbar,[date,status,primary,range,utilities]);
}

function normalizeQueue(){
  if(PAGE!=="queue")return;
  const toolbar=document.querySelector(".queueFilters");
  if(!toolbar)return;
  toolbar.classList.add("db69ControlBar");
  const date=pair("queueDate");
  const status=pair("queueStatus");
  const quick=document.querySelector(".queueFilterActions");
  if(quick)quick.classList.add("db69QuickActions");
  let right=toolbar.querySelector(":scope > .db69QueueRightActions");
  if(!right){
    right=document.createElement("div");
    right.className="db69RightActions db69QueueRightActions";
    right.setAttribute("role","group");
    right.setAttribute("aria-label","Queue display and document actions");
  }
  const display=$("openQueueDisplay");
  const exportButton=$("exportQueue");
  const printButton=$("printQueue");
  const gear=addGearContract($("queueCustomize"),"Customize queue");
  orderedDocuments(right,display,exportButton,printButton);
  if(gear&&(gear.parentElement!==right||right.lastElementChild!==gear))right.appendChild(gear);
  orderChildren(toolbar,[date,status,quick,right]);
}

function normalizeReports(){
  if(PAGE!=="reports")return;
  const toolbar=document.querySelector(".reportFilters");
  if(!toolbar)return;
  toolbar.classList.add("db69ControlBar");
  const view=pair("reportView");
  const preset=pair("reportPreset");
  pair("reportStart");
  pair("reportEnd");
  const custom=$("reportCustomDates");
  const update=$("runReport");
  let right=toolbar.querySelector(":scope > .db69ReportRightActions");
  if(!right){
    right=document.createElement("div");
    right.className="db69RightActions db69ReportRightActions";
    right.setAttribute("role","group");
    right.setAttribute("aria-label","Report document actions");
  }
  const exportButton=$("exportReport");
  const printButton=[...document.querySelectorAll(".pageUtilityActions button,.reportFilters button")]
    .find(button=>button.textContent.trim()==="Print");
  const gear=addGearContract($("db64ReportCustomize"),"Customize report");
  orderedDocuments(right,exportButton,printButton,gear);
  orderChildren(toolbar,[view,preset,custom,update,right]);
}

function normalizeMyAppointments(){
  if(PAGE!=="myappointments")return;
  pair("myAppointmentFilter");
  const bar=document.querySelector(".myAppointmentsBookingBarDB52");
  const gear=addGearContract($("myAppointmentsCustomizeDB65"),"Customize appointments");
  if(bar&&gear&&gear.parentElement!==bar)bar.appendChild(gear);
  const listPanel=document.querySelector(".db65AppointmentListPanel")||
    $("myAppointmentFilter")?.closest(".panel");
  const notices=document.querySelector(".notificationPanel");
  if(listPanel)listPanel.classList.add("db65AppointmentListPanel");
  if(notices)notices.classList.add("db65NotificationPanel");
  if(listPanel&&notices&&listPanel.parentElement===notices.parentElement&&listPanel.nextElementSibling!==notices){
    listPanel.parentElement.insertBefore(listPanel,notices);
  }
}

function visibleCards(container){
  return [...container.children].filter(card=>{
    if(card.hidden||card.classList.contains("metricHidden"))return false;
    return getComputedStyle(card).display!=="none";
  });
}

function setImportant(element,property,value){
  if(element.style.getPropertyValue(property)!==value||element.style.getPropertyPriority(property)!=="important"){
    element.style.setProperty(property,value,"important");
  }
}

function syncMetricContainer(config){
  const container=$(config.container);
  if(!container)return;
  const toggle=$(config.toggle);
  const shouldShow=toggle?Boolean(toggle.checked):!container.hidden;
  if(!shouldShow){
    if(!container.hidden)container.hidden=true;
    container.classList.add("metricsDashboardHidden");
    if(container.getAttribute("aria-hidden")!=="true")container.setAttribute("aria-hidden","true");
    setImportant(container,"display","none");
    setImportant(container,"height","0px");
    setImportant(container,"min-height","0px");
    setImportant(container,"max-height","0px");
    setImportant(container,"margin","0px");
    return;
  }

  if(container.hidden)container.hidden=false;
  container.classList.remove("metricsDashboardHidden");
  if(container.getAttribute("aria-hidden")!=="false")container.setAttribute("aria-hidden","false");
  const cards=visibleCards(container);
  const count=Math.max(1,cards.length);
  if(container.style.getPropertyValue("--db69-metric-columns")!==String(count)){
    container.style.setProperty("--db69-metric-columns",String(count));
  }
  setImportant(container,"display","grid");
  setImportant(container,"grid-template-columns",`repeat(${count},minmax(0,1fr))`);
  setImportant(container,"margin","0px 0px 10px");

  const compact=window.matchMedia&&window.matchMedia("(max-width: 1180px)").matches;
  if(compact){
    setImportant(container,"height","auto");
    setImportant(container,"min-height","0px");
    setImportant(container,"max-height","none");
  }else{
    setImportant(container,"height","78px");
    setImportant(container,"min-height","78px");
    setImportant(container,"max-height","78px");
  }
  cards.forEach(card=>{
    setImportant(card,"height",compact?"auto":"78px");
    setImportant(card,"min-height","78px");
    setImportant(card,"max-height",compact?"none":"78px");
  });
}

function syncAllMetrics(){
  METRIC_CONFIG.forEach(syncMetricContainer);
}

function normalize(){
  if(normalizing)return;
  normalizing=true;
  try{
    document.body.classList.add("db69Consistency");
    normalizeDashboard();
    normalizeQueue();
    normalizeReports();
    normalizeMyAppointments();
    syncAllMetrics();
  }finally{
    normalizing=false;
  }
}

function queueNormalization(){
  if(normalizationQueued)return;
  normalizationQueued=true;
  requestAnimationFrame(()=>{
    normalizationQueued=false;
    normalize();
  });
}

function installScopedObservers(){
  const toolbar=document.querySelector(".dashboardFilters,.queueFilters,.reportFilters");
  if(toolbar&&!toolbar.dataset.db69Observed){
    toolbar.dataset.db69Observed="true";
    new MutationObserver(queueNormalization).observe(toolbar,{childList:true,subtree:false});
  }
  METRIC_CONFIG.forEach(config=>{
    const container=$(config.container);
    if(!container||container.dataset.db69Observed)return;
    container.dataset.db69Observed="true";
    new MutationObserver(queueNormalization).observe(container,{
      childList:true,
      subtree:false,
      attributes:true,
      attributeFilter:["hidden","class"]
    });
  });
}

function closeOtherMenus(openDetails){
  document.querySelectorAll(GEAR_SELECTOR).forEach(details=>{
    if(details!==openDetails)details.open=false;
  });
}

function init(){
  normalize();
  installScopedObservers();
  [80,220,500,1000,1900,2800].forEach(delay=>setTimeout(()=>{
    normalize();
    installScopedObservers();
  },delay));
  document.addEventListener("change",event=>{
    if(event.target.matches('input[type="checkbox"]'))queueNormalization();
  });
  document.addEventListener("toggle",event=>{
    const details=event.target.closest?.(GEAR_SELECTOR);
    if(details?.open)closeOtherMenus(details);
  },true);
  document.addEventListener("click",event=>{
    if(!event.target.closest(GEAR_SELECTOR))closeOtherMenus(null);
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape")closeOtherMenus(null);
  });
  window.addEventListener("resize",queueNormalization,{passive:true});
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
