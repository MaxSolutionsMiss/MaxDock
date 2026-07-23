(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const $=id=>document.getElementById(id);
  const ICONS={
    calendar:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/></svg>',
    clock:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
    check:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.3 2.3 4.8-5"/></svg>',
    alert:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3.5 19h17L12 3Z"/><path d="M12 8v5m0 3h.01"/></svg>',
    inbound:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h12m-4-4 4 4-4 4M19 5v14"/></svg>',
    outbound:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H8m4-4-4 4 4 4M5 5v14"/></svg>',
    skids:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 8-4 8 4-8 4-8-4Zm0 4 8 4 8-4M4 16l8 4 8-4"/></svg>',
    blocked:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="m8 9 8 6m0-6-8 6"/></svg>',
    slots:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/><path d="M12 12v5m-2.5-2.5h5"/></svg>',
    appointment:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/><path d="m8.5 14 2 2 4-4"/></svg>',
    notice:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 20h4"/></svg>',
    cancelled:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m9 9 6 6m0-6-6 6"/></svg>'
  };

  function metricDescriptor(card,index){
    const text=`${card.querySelector("small")?.textContent||""} ${card.getAttribute("aria-label")||""}`.toLowerCase();
    if(text.includes("cancel"))return ["cancelled","cancelled"];
    if(text.includes("unread")||text.includes("notice")||text.includes("notification"))return ["notice","appointments"];
    if(text.includes("complete"))return ["check","completed"];
    if(text.includes("inbound"))return ["inbound","inbound"];
    if(text.includes("outbound"))return ["outbound","outbound"];
    if(text.includes("priority")||text.includes("late")||text.includes("soon")||text.includes("overdue"))return ["alert",text.includes("priority")?"priority":"soon"];
    if(text.includes("skid")||text.includes("capacity")||text.includes("occupied"))return ["skids","skids"];
    if(text.includes("block"))return ["blocked","blocks"];
    if(text.includes("open")||text.includes("available")||text.includes("slot"))return ["slots","open-slots"];
    if(text.includes("pending")||text.includes("scheduled")||text.includes("upcoming"))return ["clock",text.includes("pending")?"pending":"scheduled"];
    return [["appointment","calendar","check","alert","slots","inbound","outbound"][index%7],["appointments","scheduled","completed","priority","open-slots","inbound","outbound"][index%7]];
  }

  function repairMetricIcons(){
    ["metrics","myAppointmentMetrics","queueMetrics","reportMetrics"].forEach(id=>{
      const container=$(id);
      if(!container)return;
      container.classList.add("db74Metrics");
      [...container.children].forEach((card,index)=>{
        const [name,tone]=metricDescriptor(card,index);
        card.classList.add("db74MetricCard");
        card.dataset.metricTone=tone;
        let icon=card.querySelector(":scope > .metricIconDB47");
        if(!icon){icon=document.createElement("span");icon.className="metricIconDB47";card.prepend(icon)}
        if(icon.dataset.db75Icon!==name){icon.innerHTML=ICONS[name];icon.dataset.db75Icon=name}
      });
    });
  }

  function replaceControl(id,handler){
    const original=$(id);
    if(!original||original.dataset.db75Recovered)return original;
    const clone=original.cloneNode(true);
    clone.dataset.db75Recovered="true";
    original.replaceWith(clone);
    clone.disabled=false;
    clone.removeAttribute("aria-disabled");
    clone.addEventListener("click",handler);
    return clone;
  }

  function repairBookAppointment(){
    if(PAGE!=="myappointments")return;
    replaceControl("bookAppointmentFromMyAppointments",event=>{
      event.preventDefault();
      const db=window.MaxDockDB;
      if(!db?.getProfile?.()){window.MaxDockUI?.toast?.("MaxDock is still loading your access. Please try again.",{tone:"error"});return}
      if(!db.hasPermission?.("appointment.create")){window.MaxDockUI?.toast?.("This account does not have permission to create appointments.",{tone:"error"});return}
      const role=db.getProfile()?.role_code;
      const operational=["system_admin","site_admin","shipping_manager","coordinator"].includes(role);
      location.assign(`./${operational?"dashboard":"index"}.html?book=1&return=my-appointments&v=97-db75`);
    });
  }

  function repairFullscreen(){
    if(PAGE!=="queue")return;
    window.openQueueDisplay=function(){
      const url=new URL("./queue.html",location.href);
      url.searchParams.set("v","97-db75");
      url.searchParams.set("display","1");
      url.searchParams.set("date",$("queueDate")?.value||new Date().toISOString().slice(0,10));
      url.searchParams.set("status",$("queueStatus")?.value||"pending");
      location.assign(url.href);
    };
    replaceControl("openQueueDisplay",event=>{event.preventDefault();window.openQueueDisplay()});
  }

  function repairDetails(){
    document.querySelectorAll("#dashboardCustomize,.dashboardCustomize,#queueCustomize,#db64ReportCustomize,#myAppointmentsCustomizeDB65").forEach(details=>{
      const summary=details.querySelector(":scope > summary");
      if(!summary||summary.dataset.db75Recovered)return;
      const clone=summary.cloneNode(true);
      clone.dataset.db75Recovered="true";
      summary.replaceWith(clone);
      clone.addEventListener("click",event=>{
        event.preventDefault();
        details.open=!details.open;
        clone.setAttribute("aria-expanded",String(details.open));
      });
    });
  }

  function activateWorkspace(workspace,name){
    const buttons=[...workspace.querySelectorAll(".sectionWorkspaceTabs>[data-section-target]")];
    const panels=[...workspace.querySelectorAll(".sectionWorkspaceContent>[data-section-panel]")];
    const selected=buttons.find(button=>button.dataset.sectionTarget===name)||buttons[0];
    if(!selected)return;
    buttons.forEach(button=>{
      const active=button===selected;
      button.classList.toggle("isActive",active);
      button.setAttribute("aria-selected",String(active));
      button.tabIndex=active?0:-1;
    });
    panels.forEach(panel=>{
      const active=panel.dataset.sectionPanel===selected.dataset.sectionTarget;
      panel.hidden=!active;
      panel.setAttribute("aria-hidden",String(!active));
      panel.style.setProperty("display",active?"block":"none","important");
    });
  }

  function repairWorkspaces(){
    document.querySelectorAll("[data-section-workspace]").forEach(workspace=>{
      const buttons=[...workspace.querySelectorAll(".sectionWorkspaceTabs>[data-section-target]")];
      buttons.forEach(button=>{
        if(button.dataset.db75Recovered)return;
        const clone=button.cloneNode(true);
        clone.dataset.db75Recovered="true";
        button.replaceWith(clone);
        clone.addEventListener("click",event=>{event.preventDefault();activateWorkspace(workspace,clone.dataset.sectionTarget)});
      });
      const selected=[...workspace.querySelectorAll(".sectionWorkspaceTabs>[data-section-target]")].find(button=>button.getAttribute("aria-selected")==="true");
      activateWorkspace(workspace,selected?.dataset.sectionTarget||workspace.dataset.defaultSection);
    });
  }

  function repairAdminSpacing(){
    if(PAGE!=="admin"||$("db75AdminSpacing"))return;
    const style=document.createElement("style");
    style.id="db75AdminSpacing";
    style.textContent='body[data-page="admin"] .adminUsersTable th:first-child,body[data-page="admin"] .adminUsersTable td:first-child{width:34px!important;min-width:34px!important;max-width:34px!important;padding:8px 4px!important}body[data-page="admin"] .adminUsersTable th:nth-child(2),body[data-page="admin"] .adminUsersTable td:nth-child(2){padding-left:8px!important}body[data-page="admin"] .adminUserSelect{margin:0 auto!important}';
    document.head.appendChild(style);
  }

  function run(){
    document.body.classList.add("db75FunctionalRecovery");
    repairMetricIcons();
    repairBookAppointment();
    repairFullscreen();
    repairDetails();
    repairWorkspaces();
    repairAdminSpacing();
  }

  run();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});
  [100,350,900,1800,3500].forEach(delay=>setTimeout(run,delay));
  window.MaxDockDB75Recovery={run};
})();
