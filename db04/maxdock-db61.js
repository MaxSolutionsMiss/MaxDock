(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const db=window.MaxDockDB;
  let queued=false;
  let locationBoundSelect=null;

  const $=id=>document.getElementById(id);

  function important(element,property,value){
    if(!element)return;
    if(element.style.getPropertyValue(property)===value&&element.style.getPropertyPriority(property)==="important")return;
    element.style.setProperty(property,value,"important");
  }

  function isShown(card){
    return !card.hidden&&card.style.getPropertyValue("display")!=="none";
  }

  function enforceMetricCard(card,compact){
    const height=compact?"86px":"92px";
    const padding=compact?"15px 10px":"18px 12px";
    const visible=!card.hidden;

    important(card,"display",visible?"grid":"none");
    important(card,"grid-template-columns","44px minmax(0,1fr)");
    important(card,"grid-template-rows","auto auto");
    important(card,"column-gap","10px");
    important(card,"row-gap","1px");
    important(card,"align-content","center");
    important(card,"align-items","center");
    important(card,"width","100%");
    important(card,"min-width","0");
    important(card,"height",height);
    important(card,"min-height",height);
    important(card,"max-height",height);
    important(card,"margin","0");
    important(card,"padding",padding);
    important(card,"overflow","hidden");
    important(card,"grid-column-start","auto");

    const icon=card.querySelector(":scope > .metricIconDB47");
    important(icon,"width","44px");
    important(icon,"height","44px");
    important(icon,"min-width","44px");
    important(icon,"min-height","44px");
    important(icon,"border-radius","11px");
    const svg=icon?.querySelector("svg");
    important(svg,"width","23px");
    important(svg,"height","23px");

    const number=card.querySelector(":scope > strong");
    important(number,"font-size","22px");
    important(number,"line-height","1");

    const label=card.querySelector(":scope > small");
    important(label,"font-size",compact?"12px":"13px");
    important(label,"line-height","1.08");
  }

  function dashboardVisibility(container){
    const toggle=$("dashboardShowMetrics");
    if(toggle)return toggle.checked;
    return !container.hidden&&!container.classList.contains("metricsDashboardHidden");
  }

  function appointmentVisibility(container){
    const toggle=$("myAppointmentsShowMetricsDB60");
    if(toggle)return toggle.checked;
    return !container.hidden;
  }

  function enforceKpis(){
    document.body.classList.add("db61Consistency");
    const compact=window.matchMedia("(max-width:760px)").matches;
    const height=compact?"86px":"92px";

    if(PAGE==="dashboard"){
      const container=$("metrics");
      if(container){
        const show=dashboardVisibility(container);
        container.hidden=!show;
        container.classList.toggle("metricsDashboardHidden",!show);
        important(container,"display",show?"grid":"none");
        important(container,"grid-auto-rows",height);
        if(show)container.querySelectorAll(":scope > .metric").forEach(card=>enforceMetricCard(card,compact));
      }
    }

    if(PAGE==="myappointments"){
      const container=$("myAppointmentMetrics");
      if(container){
        const show=appointmentVisibility(container);
        container.hidden=!show;
        important(container,"display",show?"grid":"none");
        important(container,"grid-auto-rows",height);
        const cards=[...container.querySelectorAll(":scope > .metric")];
        cards.forEach(card=>enforceMetricCard(card,compact));
        const visibleCount=Math.max(1,cards.filter(isShown).length);
        if(container.style.getPropertyValue("--db61-visible-kpis")!==String(visibleCount))container.style.setProperty("--db61-visible-kpis",String(visibleCount));
        if(window.matchMedia("(min-width:1401px)").matches){
          important(container,"grid-template-columns",`repeat(${visibleCount},minmax(0,1fr))`);
        }
      }
    }
  }

  function alignMyAppointments(){
    if(PAGE!=="myappointments")return;
    const bar=document.querySelector(".myAppointmentsBookingBarDB52");
    const copy=bar?.querySelector(".myAppointmentsBookingCopyDB52");
    const button=bar?.querySelector(".bookAppointmentActionDB52");
    const customize=$("myAppointmentsCustomizeDB60");
    if(bar&&copy&&button){
      if(bar.firstElementChild!==copy)bar.insertBefore(copy,bar.firstElementChild);
      if(copy.nextElementSibling!==button)bar.insertBefore(button,copy.nextElementSibling);
      if(customize&&button.nextElementSibling!==customize)bar.insertBefore(customize,button.nextElementSibling);
    }
    if(customize){
      customize.classList.add("dashboardCustomize","myAppointmentsCustomizeDB61");
      customize.querySelector(".myAppointmentsCustomizeMenuDB60")?.classList.add("dashboardCustomizeMenu");
    }
    document.querySelector(".myAppointmentToolbar .filterField")?.classList.add("db61InlineFilter");
  }

  function alignQueueControls(){
    if(PAGE!=="queue")return;
    document.querySelectorAll(".queueFilters .filterField,.queueToolbarFilters .filterField").forEach(field=>field.classList.add("db61InlineFilter"));
  }

  function findLocationPill(actions){
    const preferred=[
      $("queueLocationPill"),
      $("locationSelect")?.closest(".locationPill"),
      $("reportLocation")?.closest(".locationPill"),
      actions.querySelector(".locationPill")
    ];
    return preferred.find(Boolean)||null;
  }

  function createLocationPill(actions){
    const pill=document.createElement("div");
    pill.className="locationPill db61PersistentLocation";
    pill.id="db61LocationPill";
    pill.innerHTML='<label for="db61LocationSelect">Location</label><select id="db61LocationSelect" aria-label="Active MaxDock location"></select>';
    actions.appendChild(pill);
    return pill;
  }

  function validLocationName(name,locations){
    return locations.some(item=>String(item.name).toLowerCase()===String(name||"").toLowerCase());
  }

  function ensurePersistentLocation(){
    if(["login","setpassword"].includes(PAGE))return false;
    const actions=document.querySelector(".headerActions");
    const profile=db?.getProfile?.();
    const locations=db?.getLocations?.()||[];
    if(!actions||!profile||!locations.length)return false;

    let pill=findLocationPill(actions)||createLocationPill(actions);
    pill.classList.add("db61PersistentLocation");
    if(pill.hidden)pill.hidden=false;
    if(pill.hasAttribute("hidden"))pill.removeAttribute("hidden");

    let select=pill.querySelector("select");
    if(!select){
      select=document.createElement("select");
      select.id="db61LocationSelect";
      pill.appendChild(select);
    }
    const expectedNames=locations.map(item=>String(item.name));
    const currentNames=[...select.options].map(option=>option.value||option.textContent||"");
    if(expectedNames.join("\u0000")!==currentNames.join("\u0000"))db.populateLocationSelect?.(select);

    const saved=localStorage.getItem("maxdock_location");
    const current=db.getCurrentLocation?.()?.name;
    const preferred=validLocationName(saved,locations)?saved:validLocationName(current,locations)?current:locations[0].name;
    db.selectLocation?.(preferred);
    select.value=preferred;
    if(select.title!==preferred)select.title=preferred;

    const account=$("maxdockAccount");
    if(account&&pill.nextElementSibling!==account)actions.insertBefore(pill,account);

    if(locationBoundSelect!==select){
      locationBoundSelect=select;
      select.addEventListener("change",event=>{
        const value=event.target.value;
        localStorage.setItem("maxdock_location",value);
        db.selectLocation?.(value);
        event.target.title=value;
        document.querySelectorAll('.headerActions .locationPill select').forEach(other=>{
          if(other!==event.target&&[...other.options].some(option=>option.value===value))other.value=value;
        });
      });
    }
    return true;
  }

  function enforceAll(){
    alignMyAppointments();
    alignQueueControls();
    enforceKpis();
    ensurePersistentLocation();
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      enforceAll();
    });
  }

  function initialize(){
    document.body.classList.add("db61Consistency");
    enforceAll();

    document.addEventListener("change",event=>{
      if(event.target.matches("#dashboardShowMetrics,#myAppointmentsShowMetricsDB60,[data-db60-metric],.dashboardCustomizeOptions input"))schedule();
    },true);
    window.addEventListener("resize",schedule,{passive:true});

    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","class","style"]});

    [50,150,350,700,1200,2200,3200,5000,8000].forEach(delay=>window.setTimeout(enforceAll,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
