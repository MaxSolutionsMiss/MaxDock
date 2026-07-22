(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  let queued=false;

  function important(element,property,value){
    if(!element)return;
    if(element.style.getPropertyValue(property)===value&&element.style.getPropertyPriority(property)==="important")return;
    element.style.setProperty(property,value,"important");
  }

  function visibleElement(element){
    if(!element||element.hidden)return false;
    return getComputedStyle(element).display!=="none";
  }

  const refreshStatusIds=["dashboardLiveStatus","myAppointmentsLiveStatus","queueLiveStatus","reportLiveStatus","tvRefreshStatus","queueDisplayStatus"];

  function normalizeRefreshText(element){
    if(!element)return;
    const current=element.textContent||"";
    if(/5 seconds/i.test(current)){
      element.textContent=current.replace(/5 seconds/gi,"3 minutes");
    }
  }

  function updateRefreshLanguage(){
    refreshStatusIds.forEach(id=>normalizeRefreshText(document.getElementById(id)));
  }

  function watchRefreshLanguage(){
    refreshStatusIds.forEach(id=>{
      const element=document.getElementById(id);
      if(!element||element.dataset.db62RefreshWatch)return;
      element.dataset.db62RefreshWatch="true";
      new MutationObserver(()=>normalizeRefreshText(element)).observe(element,{childList:true,subtree:true,characterData:true});
      normalizeRefreshText(element);
    });
  }

  function makeInlineField(field){
    if(!field)return;
    field.classList.add("db62QueueInlineField");
    important(field,"display","flex");
    important(field,"grid-template-columns","none");
    important(field,"flex-direction","row");
    important(field,"align-items","center");
    important(field,"gap","8px");
    important(field,"width","auto");
    important(field,"min-width","0");
    important(field,"min-height","36px");
    important(field,"margin","0");
    important(field,"padding","0");
    const label=field.querySelector(":scope > label");
    important(label,"display","block");
    important(label,"width","auto");
    important(label,"min-width","auto");
    important(label,"margin","0");
    important(label,"padding","0");
    important(label,"white-space","nowrap");
  }

  function cleanMyAppointments(){
    if(PAGE!=="myappointments")return;
    const bar=document.querySelector(".myAppointmentsBookingBarDB52");
    const copy=bar?.querySelector(".myAppointmentsBookingCopyDB52");
    const button=bar?.querySelector(".bookAppointmentActionDB52");
    const gear=document.getElementById("myAppointmentsCustomizeDB60");
    if(bar){
      important(bar,"display","flex");
      important(bar,"align-items","center");
      important(bar,"justify-content","flex-start");
      important(bar,"gap","12px");
      important(bar,"margin-bottom","10px");
      if(copy&&bar.firstElementChild!==copy)bar.insertBefore(copy,bar.firstElementChild);
      if(button&&copy&&copy.nextElementSibling!==button)bar.insertBefore(button,copy.nextElementSibling);
      if(gear&&bar.lastElementChild!==gear)bar.appendChild(gear);
    }
    important(copy,"order","1");
    important(button,"order","2");
    important(button,"margin","0");
    important(gear,"order","3");
    important(gear,"margin-left","auto");
    important(gear,"margin-right","0");

    const metrics=document.getElementById("myAppointmentMetrics");
    important(metrics,"margin-top","0");
    important(metrics,"margin-bottom","0");
    let sibling=metrics?.nextElementSibling||null;
    while(sibling){
      if(sibling.matches(".nextAppointmentSpotlight,.panel"))important(sibling,"margin-top","10px");
      sibling=sibling.nextElementSibling;
    }

    const toolbar=document.querySelector(".myAppointmentToolbar");
    const field=document.getElementById("myAppointmentFilter")?.closest(".filterField");
    const panel=toolbar?.closest(".panel");
    panel?.classList.add("db62BookingsPanel");
    makeInlineField(field);
    important(toolbar,"display","flex");
    important(toolbar,"flex-flow","row nowrap");
    important(toolbar,"align-items","center");
    important(toolbar,"min-height","36px");
    important(toolbar,"padding","0");
    important(toolbar,"margin","0 0 6px");
    important(field,"height","36px");
  }

  function cleanQueue(){
    if(PAGE!=="queue")return;
    const dateField=document.getElementById("queueDate")?.closest(".filterField");
    const viewField=document.getElementById("queueStatus")?.closest(".filterField");
    makeInlineField(dateField);
    makeInlineField(viewField);
    const hosts=[dateField?.parentElement,viewField?.parentElement,document.querySelector(".queueFilters"),document.querySelector(".queueToolbarFilters")].filter(Boolean);
    [...new Set(hosts)].forEach(host=>{
      host.classList.add("db62QueueControlHost");
      important(host,"display","flex");
      important(host,"grid-template-columns","none");
      important(host,"flex-flow","row wrap");
      important(host,"align-items","center");
      important(host,"align-content","center");
      important(host,"gap","8px 14px");
      important(host,"min-height","0");
      important(host,"padding-top","8px");
      important(host,"padding-bottom","8px");
    });
  }

  function unlockDashboardMetrics(){
    if(PAGE!=="dashboard")return;
    document.querySelectorAll('.dashboardCustomizeOptions input[type="checkbox"]').forEach(input=>{
      if(input.disabled)input.disabled=false;
    });
    const metrics=document.getElementById("metrics");
    if(!metrics||metrics.hidden)return;
    const visible=[...metrics.querySelectorAll(":scope > .metric:not(.rangeMetric)")].filter(visibleElement);
    const count=Math.max(1,visible.length);
    metrics.style.setProperty("--db62-dashboard-columns",String(count));
    if(window.matchMedia("(min-width:1181px)").matches){
      important(metrics,"grid-template-columns",`repeat(${count},minmax(0,1fr))`);
    }
  }

  function apply(){
    document.body.classList.add("db62Cleanup");
    cleanMyAppointments();
    cleanQueue();
    unlockDashboardMetrics();
    updateRefreshLanguage();
    watchRefreshLanguage();
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      apply();
    });
  }

  function initialize(){
    apply();
    document.addEventListener("change",event=>{
      if(event.target.matches('.dashboardCustomizeOptions input[type="checkbox"],#dashboardShowMetrics,#myAppointmentsShowMetricsDB60,[data-db60-metric]')){
        window.setTimeout(schedule,0);
      }
    },true);
    window.addEventListener("resize",schedule,{passive:true});

    const relevant=document.querySelector(
      PAGE==="dashboard"?"#metrics":
      PAGE==="myappointments"?"#myAppointmentMetrics":
      PAGE==="queue"?".queueFilters":
      "body"
    );
    if(relevant)new MutationObserver(schedule).observe(relevant,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","class"]});
    [50,150,350,700,1200,2200,4000].forEach(delay=>window.setTimeout(apply,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();