(function(){
  "use strict";
  const PAGE=document.body.dataset.page||"";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const GEAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A8 8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>';
  const APPOINTMENT_METRICS=[
    {key:"upcoming",label:"Upcoming"},
    {key:"all-bookings",label:"All Bookings"},
    {key:"past",label:"Past"},
    {key:"cancelled",label:"Cancelled"},
    {key:"unread-notices",label:"Unread Notices"}
  ];
  const APPOINTMENT_DEFAULT=APPOINTMENT_METRICS.map(item=>item.key);
  let appointmentSelected=[...APPOINTMENT_DEFAULT];
  let showAppointmentMetrics=true;
  let appointmentPreferencesLoaded=false;

  function important(element,property,value){if(element)element.style.setProperty(property,value,"important")}
  function routeFor(link){try{return (new URL(link.href,location.href).pathname.split("/").pop()||"").replace(/\.html$/i,"")}catch{return ""}}
  function profileKey(name){const p=db?.getProfile?.();return `maxdock_db60_${name}_${p?.id||p?.username||"user"}`}
  function metricKey(value){return String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}

  function enforceCoordinatorNavigation(){
    const role=db?.getProfile?.()?.role_code||"";
    const coordinator=role==="coordinator";
    document.body.classList.toggle("coordinatorRoleDB65",coordinator);
    if(!coordinator)return Boolean(role);
    const allowed=new Set(["dashboard","my-appointments","queue","reports"]);
    document.querySelectorAll(".maxdockPrimaryNav a,.maxdockSideRailDB47 a,.menu>a").forEach(link=>{
      const visible=allowed.has(routeFor(link));
      link.hidden=!visible;
      link.setAttribute("aria-hidden",String(!visible));
      important(link,"display",visible?"":"none");
      if(visible)link.removeAttribute("tabindex");else link.tabIndex=-1;
    });
    if(PAGE==="settings")location.replace("./queue.html?v=91-db70");
    return true;
  }

  function fieldPair(control){
    if(!control)return;
    const field=control.closest(".filterField,.rangeMetric")||control.parentElement;
    if(!field)return;
    field.classList.add("db65FieldPair");
    important(field,"display","flex");
    important(field,"flex-direction","row");
    important(field,"align-items","center");
    important(field,"gap","8px");
    important(field,"width","auto");
    important(field,"min-height","36px");
    important(field,"margin","0");
    important(field,"padding","0");
    let label=field.querySelector(":scope > label,:scope > small");
    if(label?.tagName==="SMALL"){
      const replacement=document.createElement("label");
      replacement.htmlFor=control.id;
      replacement.textContent=label.textContent.trim();
      label.replaceWith(replacement);
      label=replacement;
    }
    if(label){
      important(label,"display","block");
      important(label,"position","static");
      important(label,"width","auto");
      important(label,"min-width","max-content");
      important(label,"margin","0");
      important(label,"padding","0");
      important(label,"white-space","nowrap");
    }
    important(control,"height","36px");
    important(control,"min-height","36px");
    important(control,"margin","0");
  }

  function harmonizeFields(){
    ["adminDate","adminStatus","dashboardRange","queueDate","queueStatus","reportView","reportPreset","reportStart","reportEnd","myAppointmentFilter"].forEach(id=>fieldPair($(id)));
    $("dashboardRange")?.closest(".rangeMetric")?.querySelector(":scope > .metricIconDB47")?.remove();
    document.querySelectorAll(".dashboardFilters,.queueFilters,.reportFilters").forEach(container=>{
      important(container,"display","flex");
      important(container,"flex-flow","row nowrap");
      important(container,"align-items","center");
      important(container,"gap","14px");
      important(container,"min-height","52px");
      important(container,"padding","7px 12px");
      important(container,"margin","0 0 10px");
    });
  }

  function syncAppointmentMenu(){
    const menu=$("myAppointmentsCustomizeMenuDB65");
    if(!menu)return;
    menu.querySelectorAll("[data-db65-metric]").forEach(input=>{
      input.checked=appointmentSelected.includes(input.value);
      input.disabled=input.checked&&appointmentSelected.length<=1;
    });
    const show=$("myAppointmentsShowMetricsDB65");if(show)show.checked=showAppointmentMetrics;
  }

  function saveAppointmentPreferences(){
    try{localStorage.setItem(profileKey("appointment_metrics"),JSON.stringify(appointmentSelected))}catch(_ignored){}
    try{localStorage.setItem(profileKey("appointment_metrics_visible"),String(showAppointmentMetrics))}catch(_ignored){}
    db?.queuePreferenceSave?.("my-appointments-density",{metrics:appointmentSelected,showMetrics:showAppointmentMetrics},()=>{});
  }

  function applyAppointmentSelection(){
    if(PAGE!=="myappointments")return;
    const metrics=$("myAppointmentMetrics");if(!metrics)return;
    metrics.hidden=!showAppointmentMetrics;
    important(metrics,"display",showAppointmentMetrics?"grid":"none");
    important(metrics,"width","100%");
    important(metrics,"max-width","none");
    important(metrics,"margin","0 0 10px");
    let visible=0;
    metrics.querySelectorAll(":scope > .metric").forEach(card=>{
      const key=metricKey(card.querySelector(":scope > small")?.textContent);
      const show=appointmentSelected.includes(key);
      card.dataset.db65MetricKey=key;
      card.hidden=!show;
      important(card,"display",show?"grid":"none");
      card.style.removeProperty("grid-column-start");
      if(show)visible++;
    });
    metrics.style.setProperty("--db65-appointment-columns",String(Math.max(1,visible)));
    syncAppointmentMenu();
  }

  function ensureAppointmentGear(){
    if(PAGE!=="myappointments")return;
    const bar=document.querySelector(".myAppointmentsBookingBarDB52");
    const button=$("bookAppointmentFromMyAppointments");
    if(!bar||!button)return;
    $("myAppointmentsCustomizeDB60")?.remove();
    let details=$("myAppointmentsCustomizeDB65");
    if(!details){
      details=document.createElement("details");
      details.id="myAppointmentsCustomizeDB65";
      details.className="myAppointmentsCustomizeDB65";
      details.innerHTML=`<summary title="Customize appointment KPIs" aria-label="Customize appointment KPIs">${GEAR}</summary><div class="myAppointmentsCustomizeMenuDB65" id="myAppointmentsCustomizeMenuDB65"><fieldset><legend>Appointment KPIs</legend><div class="myAppointmentsMetricOptionsDB65">${APPOINTMENT_METRICS.map(item=>`<label><input type="checkbox" data-db65-metric value="${item.key}" checked>${item.label}</label>`).join("")}</div></fieldset><fieldset><legend>Dashboard display</legend><label><input id="myAppointmentsShowMetricsDB65" type="checkbox" checked>Show KPI dashboard</label></fieldset><button class="secondaryBtn utilityBtn" id="resetMyAppointmentsPreferencesDB65" type="button">Reset default view</button></div>`;
      bar.appendChild(details);
      details.addEventListener("change",event=>{
        const input=event.target.closest('input[type="checkbox"]');if(!input)return;
        if(input.id==="myAppointmentsShowMetricsDB65")showAppointmentMetrics=input.checked;
        else if(input.matches("[data-db65-metric]")){
          const next=new Set(appointmentSelected);
          if(input.checked)next.add(input.value);
          else if(next.size>1)next.delete(input.value);
          else{input.checked=true;return}
          appointmentSelected=[...next];
        }
        saveAppointmentPreferences();
        applyAppointmentSelection();
      });
      $("resetMyAppointmentsPreferencesDB65")?.addEventListener("click",()=>{
        appointmentSelected=[...APPOINTMENT_DEFAULT];
        showAppointmentMetrics=true;
        saveAppointmentPreferences();
        applyAppointmentSelection();
      });
      document.addEventListener("click",event=>{if(details.open&&!details.contains(event.target))details.open=false});
    }
    bar.insertBefore(button,details);
    important(button,"margin","0 0 0 8px");
    important(details,"margin","0 0 0 auto");
    syncAppointmentMenu();
  }

  async function loadAppointmentPreferences(){
    if(PAGE!=="myappointments"||appointmentPreferencesLoaded)return;
    for(let i=0;i<40&&!db?.getProfile?.()?.id;i++)await sleep(100);
    let selected=[...APPOINTMENT_DEFAULT],visible=true;
    try{
      const local=JSON.parse(localStorage.getItem(profileKey("appointment_metrics"))||"[]");
      if(Array.isArray(local)&&local.length)selected=local;
      visible=localStorage.getItem(profileKey("appointment_metrics_visible"))!=="false";
    }catch(_ignored){}
    try{
      const saved=await db?.loadPreference?.("my-appointments-density",{metrics:selected,showMetrics:visible});
      if(Array.isArray(saved?.metrics)&&saved.metrics.length)selected=saved.metrics;
      visible=saved?.showMetrics!==false;
    }catch(_ignored){}
    appointmentSelected=selected.filter(key=>APPOINTMENT_DEFAULT.includes(key));
    if(!appointmentSelected.length)appointmentSelected=[...APPOINTMENT_DEFAULT];
    showAppointmentMetrics=visible;
    appointmentPreferencesLoaded=true;
    applyAppointmentSelection();
  }

  function arrangeMyAppointments(){
    if(PAGE!=="myappointments")return;
    ensureAppointmentGear();
    const listPanel=$("myAppointmentFilter")?.closest(".panel");
    const notices=document.querySelector(".notificationPanel");
    const spotlight=$("nextAppointmentSpotlight");
    const parent=listPanel?.parentElement;
    if(parent&&notices&&listPanel.nextElementSibling!==notices)parent.insertBefore(listPanel,notices);
    listPanel?.classList.add("db65AppointmentListPanel");
    notices?.classList.add("db65NotificationPanel");
    if(spotlight)important(spotlight,"margin","0 0 10px");
    applyAppointmentSelection();
  }

  function compactReportMenu(){
    if(PAGE!=="reports")return;
    const menu=$("db64ReportCustomizeMenu");
    if(!menu)return;
    menu.querySelectorAll('input[type="checkbox"]').forEach(input=>{
      important(input,"width","16px");important(input,"height","16px");important(input,"min-width","16px");important(input,"min-height","16px");important(input,"margin","0");
    });
  }

  function applyAll(){
    document.body.classList.add("db65Harmonized");
    enforceCoordinatorNavigation();
    harmonizeFields();
    arrangeMyAppointments();
    compactReportMenu();
  }

  async function initialize(){
    applyAll();
    for(let i=0;i<25&&!enforceCoordinatorNavigation();i++)await sleep(120);
    await loadAppointmentPreferences();
    [80,220,500,900,1500,2400].forEach(delay=>setTimeout(applyAll,delay));
    const appointmentMetrics=$("myAppointmentMetrics");
    if(appointmentMetrics)new MutationObserver(()=>requestAnimationFrame(arrangeMyAppointments)).observe(appointmentMetrics,{childList:true});
    document.addEventListener("change",event=>{
      if(event.target.matches("#reportView,#reportPreset,#dashboardRange,#myAppointmentFilter"))setTimeout(applyAll,0);
    },true);
    $("runReport")?.addEventListener("click",()=>{setTimeout(applyAll,60);setTimeout(applyAll,320)});
    window.addEventListener("resize",()=>requestAnimationFrame(()=>{applyAppointmentSelection();compactReportMenu()}),{passive:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();
