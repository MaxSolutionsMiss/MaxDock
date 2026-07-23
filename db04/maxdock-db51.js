(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const $=id=>document.getElementById(id);
  let capacityLookupBusy=false;
  let capacityLookupKey="";

  function normalizePrimaryActions(){
    document.querySelectorAll(".primaryBtn,.greenBtn,.requestMega,.dashboardPrimaryActions .dashboardActionPrimary")
      .forEach(control=>control.classList.add("maxdockPrimaryActionDB51"));

    document.querySelectorAll(".dashboardPrimaryActions .dashboardActionPrimary").forEach(control=>{
      control.classList.remove("secondaryBtn");
      control.classList.add("primaryBtn");
    });

    const labels=new Map([
      ["openQueueDisplay","Open Full-Screen View"],
      ["tvModeButton","Open Full-Screen View"]
    ]);
    labels.forEach((text,id)=>{
      const button=$(id);
      if(button){button.textContent=text;button.setAttribute("aria-label",text)}
    });

    $("queueFullscreenButton")?.remove();
    $("scheduleFullscreenButton")?.remove();
  }

  function normalizeMyAppointmentsHeading(){
    if(PAGE!=="myappointments")return;
    const head=document.querySelector("main .pageHead");
    const button=head?.querySelector(".bookAppointmentBtnDB50,.primaryBtn[href*='book=1']");
    const content=head?.querySelector(":scope > div");
    const heading=content?.querySelector("h2");
    if(!head||!button||!content||!heading)return;
    head.classList.add("myAppointmentsPageHeadDB51");
    content.classList.add("myAppointmentsHeadingDB51");
    let row=content.querySelector(".myAppointmentsTitleRowDB51");
    if(!row){
      row=document.createElement("div");
      row.className="myAppointmentsTitleRowDB51";
      content.insertBefore(row,content.firstChild);
    }
    if(heading.parentElement!==row)row.appendChild(heading);
    if(button.parentElement!==row)row.appendChild(button);
    button.classList.add("maxdockPrimaryActionDB51");
    button.href="./index.html?book=1&return=my-appointments&v=91-db70";
    if(!button.querySelector("svg")){
      const text=button.textContent.trim()||"Book an Appointment";
      button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM12 12v5M9.5 14.5h5"/></svg><span></span>';
      button.querySelector("span").textContent=text;
    }
  }

  function normalizeDashboardRange(){
    if(PAGE!=="dashboard")return;
    const host=document.querySelector(".dashboardRangeHost");
    if(!host)return;
    const select=host.querySelector("#dashboardRange")||document.querySelector("#dashboardRange");
    if(!select)return;
    host.classList.add("filterField","dashboardRangeFieldDB51");
    let label=host.querySelector(":scope > label");
    if(!label){
      label=document.createElement("label");
      label.htmlFor="dashboardRange";
    }
    label.textContent="Date Range";
    if(host.children.length!==2||host.firstElementChild!==label||host.lastElementChild!==select){
      host.replaceChildren(label,select);
    }
    const operational=document.querySelector(".dashboardOperationalControls");
    const statusField=$("adminStatus")?.closest(".filterField");
    if(operational&&host.parentElement!==operational){
      if(statusField?.nextSibling)operational.insertBefore(host,statusField.nextSibling);
      else operational.appendChild(host);
    }
  }

  function enterQueueDisplay(){
    document.body.classList.add("queueDisplayMode");
    const bar=$("queueDisplayBar");
    const trigger=$("openQueueDisplay");
    if(bar)bar.hidden=false;
    if(trigger)trigger.hidden=true;
    if(document.documentElement.requestFullscreen&&!document.fullscreenElement){
      document.documentElement.requestFullscreen().catch(()=>{});
    }
  }

  function configureOperatorDisplays(){
    const queueTrigger=$("openQueueDisplay");
    const dashboardTrigger=$("tvModeButton");
    if(queueTrigger)queueTrigger.textContent="Open Full-Screen View";
    if(dashboardTrigger)dashboardTrigger.textContent="Open Full-Screen View";
    $("queueFullscreenButton")?.remove();
    $("scheduleFullscreenButton")?.remove();
  }

  function interceptOperatorDisplayButtons(event){
    const queue=event.target.closest?.("#openQueueDisplay");
    if(queue){
      event.preventDefault();
      event.stopImmediatePropagation();
      enterQueueDisplay();
      return;
    }
    const dashboard=event.target.closest?.("#tvModeButton");
    if(dashboard){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(typeof window.openTvSchedule==="function")window.openTvSchedule(true);
    }
  }

  function widenLocationControl(){
    const select=$("locationSelect");
    if(select)select.title=select.value||"Select location";
  }

  async function updateCapacityLocationContext(force=false){
    if(PAGE!=="settings")return;
    const db=window.MaxDockDB;
    const current=db?.getCurrentLocation?.();
    const currentName=$("capacityCurrentLocationNameDB51");
    const enabledSummary=$("capacityEnabledLocationsDB51");
    if(currentName)currentName.textContent=current?.name||"this location";
    if(!db?.client||!current||!enabledSummary||capacityLookupBusy)return;
    const key=`${current.id}:${$("setCapacityEnabled")?.checked}`;
    if(!force&&capacityLookupKey===key)return;
    capacityLookupKey=key;
    capacityLookupBusy=true;
    try{
      const result=await db.client.from("location_settings").select("location_id,capacity_enabled").eq("capacity_enabled",true);
      if(result.error)throw result.error;
      const names=new Map((db.getLocations?.()||[]).map(location=>[location.id,location.name]));
      const enabled=[...new Set((result.data||[]).map(row=>names.get(row.location_id)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
      enabledSummary.textContent=enabled.length?`Enabled locations: ${enabled.join(", ")}`:"Enabled locations: None";
    }catch(_error){
      enabledSummary.textContent=$("setCapacityEnabled")?.checked
        ?`Enabled locations include ${current.name}`
        :"Enabled-location list unavailable";
    }finally{capacityLookupBusy=false}
  }

  function normalizeCapacityLayout(){
    if(PAGE!=="settings")return;
    const head=document.querySelector(".capacitySettingsHead");
    const content=head?.querySelector(":scope > div");
    const toggle=head?.querySelector(".capacityToggle")||document.querySelector("#setCapacityEnabled")?.closest("label");
    if(!head||!content||!toggle)return;
    let row=content.querySelector(".capacityEnableRowDB51");
    if(!row){
      row=document.createElement("div");
      row.className="capacityEnableRowDB51";
      content.appendChild(row);
    }
    if(toggle.parentElement!==row)row.appendChild(toggle);
    let toggleText=toggle.querySelector("span");
    if(!toggleText){toggleText=document.createElement("span");toggle.appendChild(toggleText)}
    let currentLabel=$("capacityCurrentLocationNameDB51");
    if(!currentLabel){
      toggleText.textContent="Enable warehouse capacity for ";
      currentLabel=document.createElement("strong");
      currentLabel.id="capacityCurrentLocationNameDB51";
      currentLabel.textContent="this location";
      toggleText.appendChild(currentLabel);
    }
    let summary=$("capacityEnabledLocationsDB51");
    if(!summary){
      summary=document.createElement("small");
      summary.id="capacityEnabledLocationsDB51";
      row.appendChild(summary);
    }
    const checkbox=$("setCapacityEnabled");
    if(checkbox&&!checkbox.dataset.db51CapacityBound){
      checkbox.dataset.db51CapacityBound="true";
      checkbox.addEventListener("change",()=>window.setTimeout(()=>updateCapacityLocationContext(true),50));
    }
    updateCapacityLocationContext();
  }

  function refresh(){
    normalizePrimaryActions();
    normalizeMyAppointmentsHeading();
    normalizeDashboardRange();
    configureOperatorDisplays();
    widenLocationControl();
    normalizeCapacityLayout();
  }

  function initialize(){
    document.body.classList.add("interfaceAuditDB51");
    document.addEventListener("click",interceptOperatorDisplayButtons,true);
    refresh();
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;refresh()});
    }).observe(document.body,{childList:true,subtree:true});
    $("locationSelect")?.addEventListener("change",()=>window.setTimeout(()=>{widenLocationControl();updateCapacityLocationContext(true)},250));
    document.querySelector('[onclick="saveSettings()"]')?.addEventListener("click",()=>window.setTimeout(()=>updateCapacityLocationContext(true),1000));
    window.setTimeout(refresh,250);
    window.setTimeout(refresh,800);
    window.setTimeout(refresh,1600);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
