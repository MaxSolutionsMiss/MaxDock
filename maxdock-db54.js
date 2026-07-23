(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";

  function compactAppointmentWorkspace(){
    if(PAGE!=="myappointments")return;

    const workspace=document.querySelector(".appointmentsSectionWorkspace");
    const panel=workspace?.querySelector(".sectionWorkspaceContent > section.panel")
      ||document.getElementById("appointment-list-workspace");

    if(workspace){
      if(panel&&panel.parentElement!==workspace.parentElement)workspace.replaceWith(panel);
      else if(panel)workspace.replaceWith(panel);
      else workspace.remove();
    }

    document.querySelectorAll(".appointmentViewsRailDB53,.appointmentsSectionWorkspace > .sectionWorkspaceRail").forEach(item=>item.remove());

    if(!panel)return;
    panel.classList.add("appointmentsFullWidthDB54");
    panel.classList.remove("sectionWorkspaceContent");

    const toolbar=panel.querySelector(".myAppointmentToolbar");
    const filter=panel.querySelector("#myAppointmentFilter")?.closest(".filterField");
    if(toolbar)toolbar.classList.add("myAppointmentToolbarDB54");
    if(filter){
      filter.classList.remove("workspaceSourceControl");
      filter.classList.add("appointmentShowInlineDB54");
      const label=filter.querySelector("label");
      if(label)label.textContent="Show";
    }
  }

  function compactDashboardActions(){
    if(PAGE!=="dashboard")return;

    const toolbar=document.querySelector(".dashboardWorkspaceToolbar");
    const operational=toolbar?.querySelector(".dashboardOperationalControls");
    if(!toolbar||!operational)return;

    let commands=toolbar.querySelector(".dashboardCommandStripDB54");
    if(!commands){
      commands=document.createElement("div");
      commands.className="dashboardCommandStripDB54";
      commands.setAttribute("role","group");
      commands.setAttribute("aria-label","Dashboard appointment and document actions");
    }

    const primary=document.querySelector(".dashboardPrimaryActions");
    const view=toolbar.querySelector(".dashboardToolbarViewActions");
    const documents=toolbar.querySelector(".dashboardToolbarDocuments");
    const utility=documents?.querySelector(".dashboardUtilityActions")
      ||document.querySelector(".dashboardUtilityActions");

    [primary,view,utility].forEach(group=>{
      if(!group||group===commands)return;
      [...group.children].forEach(control=>commands.appendChild(control));
    });

    [primary,view,utility,documents].forEach(group=>{
      if(group&&group!==commands&&!group.children.length)group.remove();
    });

    commands.querySelectorAll("button,summary").forEach(control=>control.classList.add("dashboardCommandControlDB54"));
    commands.querySelector(".dashboardCustomize")?.classList.add("dashboardGearControlDB54");

    if(commands.parentElement!==toolbar)operational.insertAdjacentElement("afterend",commands);
    toolbar.classList.add("dashboardUnifiedToolbarDB54");

    const note=toolbar.querySelector(".viewPreferenceNote");
    if(note&&note.previousElementSibling!==commands)toolbar.appendChild(note);
  }

  function refresh(){
    document.body.classList.add("interfacePolishDB54");
    compactAppointmentWorkspace();
    compactDashboardActions();
  }

  function initialize(){
    refresh();
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;refresh()});
    }).observe(document.body,{childList:true,subtree:true});
    [150,400,900,1600,2600].forEach(delay=>window.setTimeout(refresh,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
