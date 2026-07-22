(function(){
  "use strict";
  const PAGE=document.body.dataset.page||"";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const GEAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A8 8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>';

  function key(value){return String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
  function profileKey(name){const p=db?.getProfile?.();return `maxdock_db64_${name}_${p?.id||p?.username||"user"}`}
  function inline(field){if(!field)return;field.classList.add("db64InlineField");const label=field.querySelector(":scope > label,:scope > small");if(label&&field.querySelector("select,input"))label.style.removeProperty("position")}

  function enforceRoleLocation(){
    const role=db?.getProfile?.()?.role_code||"";
    const admin=role==="system_admin";
    document.body.classList.toggle("systemAdminLocation",admin);
    document.querySelectorAll(".headerActions .locationPill").forEach(item=>{
      item.hidden=!admin;
      item.style.setProperty("display",admin?"flex":"none","important");
    });
    return Boolean(role);
  }

  function harmonizeFields(){
    document.querySelectorAll(".dashboardFilters>.filterField,.queueFilters>.filterField,.reportFilters>.filterField,.reportCustomDates>.filterField,.myAppointmentToolbar .filterField").forEach(inline);
    const range=$("dashboardRange")?.closest(".rangeMetric")||document.querySelector(".dashboardRangeHost>.rangeMetric");
    if(range){
      range.classList.add("db64InlineField");
      range.querySelector(":scope > .metricIconDB47")?.remove();
      const small=range.querySelector(":scope > small");
      if(small){
        const label=document.createElement("label");
        label.htmlFor="dashboardRange";
        label.textContent=small.textContent.trim()||"Date Range";
        small.replaceWith(label);
      }
    }
  }

  function harmonizeDashboard(){
    if(PAGE!=="dashboard")return;
    const metrics=$("metrics");
    if(metrics&&!metrics.hidden){
      const visible=[...metrics.querySelectorAll(":scope > .metric:not(.rangeMetric)")].filter(card=>!card.hidden&&getComputedStyle(card).display!=="none");
      metrics.style.setProperty("--db64-dashboard-columns",String(Math.max(1,visible.length)));
    }
  }

  function harmonizeMyAppointments(){
    if(PAGE!=="myappointments")return;
    const metrics=$("myAppointmentMetrics");
    if(metrics){
      const visible=[...metrics.querySelectorAll(":scope > .metric")].filter(card=>!card.hidden&&getComputedStyle(card).display!=="none");
      metrics.style.setProperty("--db64-appointment-columns",String(Math.max(1,visible.length)));
      metrics.style.setProperty("height",metrics.hidden?"0":"92px","important");
      metrics.style.setProperty("min-height",metrics.hidden?"0":"92px","important");
      metrics.style.setProperty("max-height",metrics.hidden?"0":"92px","important");
    }
    const listPanel=$("myAppointmentFilter")?.closest(".panel");
    listPanel?.classList.add("db64AppointmentListPanel");
    document.querySelector(".notificationPanel")?.classList.add("db64NotificationPanel");
  }

  const REPORT_DEFAULT=[];
  let reportSelected=[];
  let reportVisible=true;

  function reportCards(){return [...document.querySelectorAll("#reportMetrics > .metric")]}
  function reportCardInfo(){return reportCards().map(card=>{const label=card.querySelector("small")?.textContent.trim()||"Metric";const k=key(label);card.dataset.db64ReportKey=k;return {card,key:k,label}})}
  function saveReports(){
    localStorage.setItem(profileKey("report_metrics"),JSON.stringify(reportSelected));
    localStorage.setItem(profileKey("report_metrics_visible"),String(reportVisible));
    db?.queuePreferenceSave?.("reports-density",{metrics:reportSelected,showMetrics:reportVisible},()=>{});
  }
  function syncReportMenu(){
    const menu=$("db64ReportCustomizeMenu");if(!menu)return;
    menu.querySelectorAll("[data-db64-report-metric]").forEach(input=>{input.checked=reportSelected.includes(input.value);input.disabled=input.checked&&reportSelected.length<=1});
    const visible=$("db64ReportShowMetrics");if(visible)visible.checked=reportVisible;
  }
  function applyReportSelection(){
    if(PAGE!=="reports")return;
    const metrics=$("reportMetrics");if(!metrics)return;
    const info=reportCardInfo();
    if(!reportSelected.length)reportSelected=info.map(item=>item.key);
    metrics.hidden=!reportVisible;
    metrics.style.setProperty("display",reportVisible?"grid":"none","important");
    let count=0;
    info.forEach(({card,key:k})=>{const show=reportSelected.includes(k);card.hidden=!show;card.style.setProperty("display",show?"grid":"none","important");if(show)count++});
    metrics.style.setProperty("--db64-report-columns",String(Math.max(1,count)));
    syncReportMenu();
  }
  async function ensureReportGear(){
    if(PAGE!=="reports")return;
    const filters=document.querySelector(".reportFilters");
    const metrics=$("reportMetrics");
    if(!filters||!metrics||!metrics.children.length)return;
    const info=reportCardInfo();
    if(!reportSelected.length){
      try{const saved=JSON.parse(localStorage.getItem(profileKey("report_metrics"))||"[]");if(Array.isArray(saved)&&saved.length)reportSelected=saved}catch(_ignored){}
      reportVisible=localStorage.getItem(profileKey("report_metrics_visible"))!=="false";
      if(!reportSelected.length)reportSelected=info.map(item=>item.key);
    }
    let details=$("db64ReportCustomize");
    if(!details){
      details=document.createElement("details");
      details.id="db64ReportCustomize";
      details.className="db64ReportCustomize";
      details.innerHTML=`<summary title="Customize report KPIs" aria-label="Customize report KPIs">${GEAR}</summary><div class="db64ReportCustomizeMenu" id="db64ReportCustomizeMenu"><fieldset><legend>Report KPIs</legend><div class="db64ReportMetricOptions">${info.map(item=>`<label><input type="checkbox" data-db64-report-metric value="${item.key}" checked>${item.label}</label>`).join("")}</div></fieldset><fieldset><legend>Dashboard display</legend><label class="db64ReportWide"><input id="db64ReportShowMetrics" type="checkbox" checked>Show KPI dashboard</label></fieldset><button class="secondaryBtn utilityBtn" id="db64ResetReportMetrics" type="button">Reset default view</button></div>`;
      filters.appendChild(details);
      details.addEventListener("change",event=>{
        const input=event.target.closest("input");if(!input)return;
        if(input.id==="db64ReportShowMetrics")reportVisible=input.checked;
        else if(input.matches("[data-db64-report-metric]")){
          const next=new Set(reportSelected);
          if(input.checked)next.add(input.value);else if(next.size>1)next.delete(input.value);else{input.checked=true;return}
          reportSelected=[...next];
        }
        saveReports();applyReportSelection();
      });
      $("db64ResetReportMetrics")?.addEventListener("click",()=>{reportSelected=reportCardInfo().map(item=>item.key);reportVisible=true;saveReports();applyReportSelection()});
      document.addEventListener("click",event=>{if(details.open&&!details.contains(event.target))details.open=false});
    }
    applyReportSelection();
  }

  function harmonizeReports(){
    if(PAGE!=="reports")return;
    document.querySelector(".reportSectionWorkspace")?.classList.add("db64ReportNoRail");
    ensureReportGear();
  }

  function applyAll(){
    document.body.classList.add("db64Stable");
    enforceRoleLocation();
    harmonizeFields();
    harmonizeDashboard();
    harmonizeMyAppointments();
    harmonizeReports();
  }

  async function initialize(){
    applyAll();
    for(let i=0;i<25&&!enforceRoleLocation();i++){await sleep(120)}
    [80,220,500,900,1500].forEach(delay=>setTimeout(applyAll,delay));
    window.addEventListener("resize",()=>requestAnimationFrame(()=>{harmonizeDashboard();harmonizeMyAppointments();applyReportSelection()}),{passive:true});
    document.addEventListener("change",event=>{
      if(event.target.matches("#dashboardShowMetrics,.dashboardCustomizeOptions input,#myAppointmentsShowMetricsDB60,[data-db60-metric],#reportView,#reportPreset")){
        setTimeout(()=>{harmonizeFields();harmonizeDashboard();harmonizeMyAppointments();ensureReportGear();applyReportSelection()},0);
      }
    },true);
    $("runReport")?.addEventListener("click",()=>{setTimeout(()=>{ensureReportGear();applyReportSelection()},50);setTimeout(()=>{ensureReportGear();applyReportSelection()},300)});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();
