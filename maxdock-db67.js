(function(){
  "use strict";
  const PAGE=document.body.dataset.page||"";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const GEAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A8 8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>';
  const APPOINTMENT_METRICS=[
    {key:"upcoming",label:"Upcoming"},{key:"all-bookings",label:"All Bookings"},{key:"past",label:"Past"},{key:"cancelled",label:"Cancelled"},{key:"unread-notices",label:"Unread Notices"}
  ];
  let appointmentSelected=APPOINTMENT_METRICS.map(item=>item.key);
  let appointmentVisible=true;
  let reportSelected=[];
  let reportVisible=true;

  const key=value=>String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const profileId=()=>db?.getProfile?.()?.id||db?.getProfile?.()?.username||"user";
  const localKey=name=>`maxdock_db67_${name}_${profileId()}`;
  const routeFor=link=>{try{return (new URL(link.href,location.href).pathname.split("/").pop()||"").replace(/\.html$/i,"")}catch{return ""}};

  async function waitFor(test,timeout=8000){
    const start=Date.now();
    while(Date.now()-start<timeout){const value=test();if(value)return value;await sleep(80)}
    return null;
  }

  function removeLegacyResidue(){
    document.body.classList.remove("interfaceConsistencyDB49","interfaceConsistencyDB50","interfacePolishDB52","interfacePolishDB53","interfacePolishDB54","horizontalMetricsDB55","finalPolishDB56","db64Stable","db65Harmonized","db66Reference");
    document.querySelectorAll(".horizontalMetricsGridDB55,.horizontalMetricCardDB55,.db64InlineField,.db65FieldPair,.db66FieldPair").forEach(element=>{
      element.classList.remove("horizontalMetricsGridDB55","horizontalMetricCardDB55","db64InlineField","db65FieldPair","db66FieldPair");
    });
    document.querySelectorAll("#metrics,#myAppointmentMetrics,#queueMetrics,#reportMetrics").forEach(container=>{
      ["height","min-height","max-height","overflow","grid-template-columns","display","width","max-width","margin"].forEach(property=>container.style.removeProperty(property));
      container.querySelectorAll(":scope > .metric").forEach(card=>{
        ["height","min-height","max-height","overflow","display","width","padding","margin","grid-template-columns","grid-template-rows","grid-column-start"].forEach(property=>card.style.removeProperty(property));
      });
    });
  }

  function allowedRoutes(role){
    if(role==="system_admin")return new Set(["my-appointments","queue","reports","dashboard","settings","admin","data"]);
    if(role==="site_admin")return new Set(["my-appointments","queue","reports","dashboard","settings"]);
    if(role==="coordinator"||role==="shipping_manager")return new Set(["my-appointments","queue","reports","dashboard"]);
    return new Set(["my-appointments"]);
  }

  function applyRoleContext(profile){
    const role=profile?.role_code||"";
    const allowed=allowedRoutes(role);
    document.body.classList.toggle("db67SystemAdmin",role==="system_admin");
    document.querySelectorAll(".maxdockPrimaryNav a,.maxdockSideRailDB47 a,.menu>a").forEach(link=>{
      const visible=allowed.has(routeFor(link));
      link.hidden=!visible;
      link.setAttribute("aria-hidden",String(!visible));
      link.style.setProperty("display",visible?"":"none",visible?"":"important");
      if(visible)link.removeAttribute("tabindex");else link.tabIndex=-1;
    });
    document.querySelectorAll(".headerActions .locationPill").forEach(item=>{
      item.hidden=role!=="system_admin";
      item.style.setProperty("display",role==="system_admin"?"flex":"none","important");
    });
    const current=PAGE==="myappointments"?"my-appointments":PAGE.replace(/\.html$/i,"");
    if(profile&&!allowed.has(current)&&!["login","password"].includes(PAGE)){
      const fallback=role==="customer"||role==="vendor"?"my-appointments.html":"queue.html";
      location.replace(`./${fallback}?v=88-db67`);
      return;
    }
    document.documentElement.dataset.db67RoleReady="true";
  }

  async function initializeRoleContext(){
    document.documentElement.dataset.db67RoleReady="false";
    const profile=await waitFor(()=>db?.getProfile?.(),6000);
    applyRoleContext(profile||null);
  }

  function fieldPair(control){
    if(!control)return null;
    const host=control.closest(".filterField,.rangeMetric,.dashboardRangeHost")||control.parentElement;
    if(!host)return null;
    host.classList.add("db67FieldPair");
    let label=host.querySelector(":scope > label,:scope > small");
    if(label?.tagName==="SMALL"){
      const replacement=document.createElement("label");
      replacement.htmlFor=control.id;
      replacement.textContent=label.textContent.trim();
      label.replaceWith(replacement);
      label=replacement;
    }
    if(!label){
      label=document.createElement("label");
      label.htmlFor=control.id;
      label.textContent=control.id==="dashboardRange"?"Date Range":"Field";
      host.prepend(label);
    }
    host.querySelectorAll(":scope > .metricIconDB47").forEach(icon=>icon.remove());
    return host;
  }

  function gearSummary(details,label){
    const summary=details.querySelector(":scope > summary");
    if(!summary)return;
    summary.innerHTML=`${GEAR}<span class="maxdockSrOnly">${label}</span>`;
    summary.title=label;
    summary.setAttribute("aria-label",label);
  }

  async function setupDashboard(){
    if(PAGE!=="dashboard")return;
    const toolbar=await waitFor(()=>document.querySelector(".dashboardOverviewBand .dashboardWorkspaceToolbar")||document.querySelector(".dashboardFilters"));
    if(!toolbar)return;
    const operational=toolbar.querySelector(".dashboardOperationalControls")||toolbar;
    operational.classList.add("db67OperationalGroup");
    const date=fieldPair($("adminDate"));
    const status=fieldPair($("adminStatus"));
    const range=fieldPair($("dashboardRange"));
    const primary=document.querySelector(".dashboardPrimaryActions");
    [date,status].forEach(item=>{if(item&&item.parentElement!==operational)operational.appendChild(item)});
    if(primary){primary.classList.add("db67QuickActions");if(range)operational.insertBefore(primary,range);else operational.appendChild(primary)}
    if(range&&range.parentElement!==operational)operational.appendChild(range);
    const customize=document.querySelector(".dashboardCustomize");
    if(customize)gearSummary(customize,"Customize dashboard");
    const utility=document.querySelector(".dashboardUtilityActions");
    let end=toolbar.querySelector(".db67DashboardEndActions");
    if(!end){end=document.createElement("div");end.className="db67EndActions db67DashboardEndActions"}
    if(customize)end.appendChild(customize);
    if(utility){utility.classList.add("db67EndActions");[...utility.children].forEach(child=>end.appendChild(child));utility.remove()}
    toolbar.replaceChildren(operational,end);
  }

  async function setupQueue(){
    if(PAGE!=="queue")return;
    const toolbar=await waitFor(()=>document.querySelector(".queueOpsToolbar.queueWorkspaceToolbar")||document.querySelector(".queueOpsToolbar"));
    if(!toolbar)return;
    const filters=toolbar.querySelector(".queueToolbarFilters")||toolbar;
    filters.classList.add("db67OperationalGroup");
    fieldPair($("queueDate"));fieldPair($("queueStatus"));
    const quick=toolbar.querySelector(".queueToolbarQuickActions")||document.querySelector(".queueFilterActions");
    quick?.classList.add("db67QuickActions");
    const full=$("openQueueDisplay");
    const customize=$("queueCustomize");
    if(customize)gearSummary(customize,"Customize operation queue");
    const docs=toolbar.querySelector(".queueToolbarDocuments")||document.querySelector(".pageUtilityActions");
    let end=toolbar.querySelector(".db67QueueEndActions");
    if(!end){end=document.createElement("div");end.className="db67EndActions db67QueueEndActions"}
    if(full)end.appendChild(full);
    if(customize)end.appendChild(customize);
    if(docs){[...docs.children].forEach(child=>end.appendChild(child));docs.remove()}
    toolbar.replaceChildren(filters,end);
  }

  function preferenceMenuHtml(title,items,prefix,showId){
    return `<div class="db67PreferenceMenu"><fieldset><legend>${title}</legend><div class="db67PreferenceOptions">${items.map(item=>`<label><input type="checkbox" data-${prefix}-metric value="${item.key}" checked>${item.label}</label>`).join("")}</div></fieldset><fieldset><legend>Dashboard display</legend><label class="db67PreferenceWide"><input id="${showId}" type="checkbox" checked>Show KPI dashboard</label></fieldset><button class="secondaryBtn utilityBtn" data-db67-reset type="button">Reset default view</button></div>`;
  }

  function metricCards(container){return container?[...container.querySelectorAll(":scope > .metric")]:[]}
  function visibleMetricCount(container){return metricCards(container).filter(card=>!card.hidden&&getComputedStyle(card).display!=="none").length||1}
  function updateMetricGrid(container){if(!container)return;container.style.setProperty("--db67-columns",String(visibleMetricCount(container)))}
  function decorateMetricGrid(container){
    if(!container)return;
    container.classList.add("db67MetricGrid");
    metricCards(container).forEach(card=>card.classList.add("db67MetricCard"));
    updateMetricGrid(container);
  }

  async function loadAppointmentPreferences(){
    try{
      const local=JSON.parse(localStorage.getItem(localKey("appointment_metrics"))||"[]");
      if(Array.isArray(local)&&local.length)appointmentSelected=local;
      appointmentVisible=localStorage.getItem(localKey("appointment_metrics_visible"))!=="false";
    }catch(_ignored){}
    try{
      const saved=await db?.loadPreference?.("my-appointments-density",{metrics:appointmentSelected,showMetrics:appointmentVisible});
      if(Array.isArray(saved?.metrics)&&saved.metrics.length)appointmentSelected=saved.metrics;
      appointmentVisible=saved?.showMetrics!==false;
    }catch(_ignored){}
    appointmentSelected=appointmentSelected.filter(item=>APPOINTMENT_METRICS.some(metric=>metric.key===item));
    if(!appointmentSelected.length)appointmentSelected=APPOINTMENT_METRICS.map(item=>item.key);
  }

  function saveAppointmentPreferences(){
    try{localStorage.setItem(localKey("appointment_metrics"),JSON.stringify(appointmentSelected));localStorage.setItem(localKey("appointment_metrics_visible"),String(appointmentVisible))}catch(_ignored){}
    db?.queuePreferenceSave?.("my-appointments-density",{metrics:appointmentSelected,showMetrics:appointmentVisible},()=>{});
  }

  function applyAppointmentPreferences(){
    const metrics=$("myAppointmentMetrics");if(!metrics)return;
    metrics.hidden=!appointmentVisible;
    metricCards(metrics).forEach(card=>{
      const itemKey=key(card.querySelector("small")?.textContent);
      card.hidden=!appointmentSelected.includes(itemKey);
    });
    updateMetricGrid(metrics);
    const details=$("db67AppointmentCustomize");
    details?.querySelectorAll("[data-appointment-metric]").forEach(input=>{input.checked=appointmentSelected.includes(input.value);input.disabled=input.checked&&appointmentSelected.length<=1});
    const show=$("db67AppointmentShow");if(show)show.checked=appointmentVisible;
  }

  async function setupMyAppointments(){
    if(PAGE!=="myappointments")return;
    const bar=await waitFor(()=>document.querySelector(".myAppointmentsBookingBarDB52"));
    const button=$("bookAppointmentFromMyAppointments");
    const metrics=await waitFor(()=>$("myAppointmentMetrics"));
    if(bar&&button){
      button.addEventListener("click",event=>{event.preventDefault();openBookingRoute(button)});
      let details=$("db67AppointmentCustomize");
      if(!details){
        details=document.createElement("details");details.id="db67AppointmentCustomize";details.className="db67AppointmentCustomize";
        details.innerHTML=`<summary></summary>${preferenceMenuHtml("Appointment KPIs",APPOINTMENT_METRICS,"appointment","db67AppointmentShow")}`;
        gearSummary(details,"Customize appointment KPIs");bar.appendChild(details);
        details.addEventListener("change",event=>{
          const input=event.target.closest('input[type="checkbox"]');if(!input)return;
          if(input.id==="db67AppointmentShow")appointmentVisible=input.checked;
          else if(input.matches("[data-appointment-metric]")){
            const next=new Set(appointmentSelected);
            if(input.checked)next.add(input.value);else if(next.size>1)next.delete(input.value);else{input.checked=true;return}
            appointmentSelected=[...next];
          }
          saveAppointmentPreferences();applyAppointmentPreferences();
        });
        details.querySelector("[data-db67-reset]")?.addEventListener("click",()=>{appointmentSelected=APPOINTMENT_METRICS.map(item=>item.key);appointmentVisible=true;saveAppointmentPreferences();applyAppointmentPreferences()});
      }
      bar.insertBefore(button,details);
    }
    await loadAppointmentPreferences();
    if(metrics){decorateMetricGrid(metrics);applyAppointmentPreferences()}
    const listPanel=$("myAppointmentFilter")?.closest("section.panel");
    const notifications=document.querySelector("section.notificationPanel");
    if(listPanel&&notifications&&(notifications.compareDocumentPosition(listPanel)&Node.DOCUMENT_POSITION_FOLLOWING)){notifications.parentElement?.insertBefore(listPanel,notifications)}
    listPanel?.classList.add("db67AppointmentPanel");
    notifications?.classList.add("db67NotificationPanel");
    const heading=listPanel?.querySelector(".myAppointmentToolbar h3");if(heading)heading.textContent="Appointment list";
    fieldPair($("myAppointmentFilter"));
  }

  function reportItems(){return metricCards($("reportMetrics")).map(card=>({key:key(card.querySelector("small")?.textContent),label:card.querySelector("small")?.textContent.trim()||"Metric",card}))}
  async function loadReportPreferences(){
    const defaults=reportItems().map(item=>item.key);
    reportSelected=defaults;
    try{const local=JSON.parse(localStorage.getItem(localKey("report_metrics"))||"[]");if(Array.isArray(local)&&local.length)reportSelected=local;reportVisible=localStorage.getItem(localKey("report_metrics_visible"))!=="false"}catch(_ignored){}
    try{const saved=await db?.loadPreference?.("reports-density",{metrics:reportSelected,showMetrics:reportVisible});if(Array.isArray(saved?.metrics)&&saved.metrics.length)reportSelected=saved.metrics;reportVisible=saved?.showMetrics!==false}catch(_ignored){}
    reportSelected=reportSelected.filter(item=>defaults.includes(item));if(!reportSelected.length)reportSelected=defaults;
  }
  function saveReportPreferences(){
    try{localStorage.setItem(localKey("report_metrics"),JSON.stringify(reportSelected));localStorage.setItem(localKey("report_metrics_visible"),String(reportVisible))}catch(_ignored){}
    db?.queuePreferenceSave?.("reports-density",{metrics:reportSelected,showMetrics:reportVisible},()=>{});
  }
  function applyReportPreferences(){
    const metrics=$("reportMetrics");if(!metrics)return;
    metrics.hidden=!reportVisible;
    reportItems().forEach(item=>{item.card.hidden=!reportSelected.includes(item.key)});
    updateMetricGrid(metrics);
    const details=$("db67ReportCustomize");details?.querySelectorAll("[data-report-metric]").forEach(input=>{input.checked=reportSelected.includes(input.value);input.disabled=input.checked&&reportSelected.length<=1});
    const show=$("db67ReportShow");if(show)show.checked=reportVisible;
  }

  async function setupReports(){
    if(PAGE!=="reports")return;
    const filters=await waitFor(()=>document.querySelector(".reportFilters"));
    const metrics=await waitFor(()=>$("reportMetrics")?.children.length&&$("reportMetrics"));
    if(!filters)return;
    fieldPair($("reportView"));fieldPair($("reportPreset"));fieldPair($("reportStart"));fieldPair($("reportEnd"));
    const utility=document.querySelector(".pageUtilityActions");
    let end=filters.querySelector(".db67ReportEndActions");if(!end){end=document.createElement("div");end.className="db67EndActions db67ReportEndActions"}
    if(utility){[...utility.children].forEach(child=>end.appendChild(child));utility.remove()}
    if(metrics){decorateMetricGrid(metrics);await loadReportPreferences()}
    const items=reportItems().map(item=>({key:item.key,label:item.label}));
    let details=$("db67ReportCustomize");
    if(!details&&items.length){details=document.createElement("details");details.id="db67ReportCustomize";details.className="db67ReportCustomize";details.innerHTML=`<summary></summary>${preferenceMenuHtml("Report KPIs",items,"report","db67ReportShow")}`;gearSummary(details,"Customize report KPIs");end.appendChild(details);
      details.addEventListener("change",event=>{const input=event.target.closest('input[type="checkbox"]');if(!input)return;if(input.id==="db67ReportShow")reportVisible=input.checked;else if(input.matches("[data-report-metric]")){const next=new Set(reportSelected);if(input.checked)next.add(input.value);else if(next.size>1)next.delete(input.value);else{input.checked=true;return}reportSelected=[...next]}saveReportPreferences();applyReportPreferences()});
      details.querySelector("[data-db67-reset]")?.addEventListener("click",()=>{reportSelected=reportItems().map(item=>item.key);reportVisible=true;saveReportPreferences();applyReportPreferences()});
    }
    if(details&&!end.contains(details))end.appendChild(details);
    filters.appendChild(end);
    applyReportPreferences();
  }

  function adminIcon(path){return `<span class="db67AdminIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg></span>`}
  function setupAdmin(){
    if(PAGE!=="admin")return;
    const cards=[...document.querySelectorAll(".adminSummaryCard")];
    const icons=["M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20m6-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1v6m-3-3h6","m7 12 3 3 7-7m4 4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z","M5 19V9m5 10V5m5 14v-7m4 7V3","M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"];
    cards.forEach((card,index)=>{if(!card.querySelector(".db67AdminIcon"))card.insertAdjacentHTML("afterbegin",adminIcon(icons[index]||icons[0]))});
    document.querySelector(".adminSearch")?.classList.add("db67AdminSearch");
  }

  function setupMetricObservers(){
    ["metrics","myAppointmentMetrics","queueMetrics","reportMetrics"].forEach(id=>{
      const container=$(id);if(!container)return;decorateMetricGrid(container);
      new MutationObserver(()=>requestAnimationFrame(()=>decorateMetricGrid(container))).observe(container,{childList:true,attributes:true,attributeFilter:["hidden"]});
    });
  }

  function roleAwareBookingUrl(){const role=db?.getProfile?.()?.role_code;const staff=["system_admin","site_admin","shipping_manager","coordinator"].includes(role);return staff?"./dashboard.html?book=1&return=my-appointments&v=88-db67":"./index.html?book=1&return=my-appointments&v=88-db67"}
  function openBookingRoute(button){
    if(button?.disabled)return;
    const profile=db?.getProfile?.();
    if(profile&&db?.hasPermission?.("appointment.create")){location.assign(roleAwareBookingUrl());return}
    if(button){button.disabled=true;button.setAttribute("aria-busy","true")}
    let attempts=0;const check=()=>{attempts++;const ready=document.body.classList.contains("maxdockContextReady")&&db?.getProfile?.();if(ready&&db.hasPermission?.("appointment.create")){location.assign(roleAwareBookingUrl());return}if((ready&&attempts>8)||attempts>80){if(button){button.disabled=false;button.removeAttribute("aria-busy")}alert(ready?"Your MaxDock account does not currently have permission to book an appointment.":"MaxDock is still loading your booking access. Please try again.");return}setTimeout(check,125)};check();
  }

  function setupDirectBooking(){
    const params=new URLSearchParams(location.search);if(params.get("book")!=="1")return;
    let attempts=0;const check=()=>{attempts++;if(document.body.classList.contains("maxdockContextReady")&&db?.getProfile?.()&&db.hasPermission?.("appointment.create")&&typeof window.openRequest==="function"&&$("requestModal")){if(typeof window.closeRequest==="function"&&!window.closeRequest.__db67Wrapped){const original=window.closeRequest;const wrapped=function(){window.closeEfficiencyOpportunity?.();$("requestModal")?.classList.remove("show");location.replace("./my-appointments.html?v=88-db67")};wrapped.__db67Wrapped=true;window.closeRequest=wrapped}window.openRequest();return}if(attempts<100)setTimeout(check,150)};check();
  }

  function bindOutsideClose(){
    document.addEventListener("click",event=>document.querySelectorAll("details[open]").forEach(details=>{if(!details.contains(event.target))details.open=false}));
  }

  async function initialize(){
    document.body.classList.add("db67Stable");
    removeLegacyResidue();
    initializeRoleContext();
    await Promise.all([setupDashboard(),setupQueue(),setupMyAppointments(),setupReports()]);
    setupAdmin();
    setupMetricObservers();
    setupDirectBooking();
    bindOutsideClose();
    document.addEventListener("change",event=>{
      if(event.target.matches("#dashboardShowMetrics,.dashboardCustomizeOptions input,#queueCustomizeMenu input,#myAppointmentFilter,#reportView,#reportPreset"))requestAnimationFrame(()=>["metrics","myAppointmentMetrics","queueMetrics","reportMetrics"].forEach(id=>updateMetricGrid($(id))));
    },true);
    document.documentElement.dataset.maxdockRelease="db67";
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();
