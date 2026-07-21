(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const METRIC_IDS=["metrics","queueMetrics","myAppointmentMetrics","reportMetrics"];

  function removeUnauthenticatedNavigation(){
    if(!["login","password"].includes(PAGE))return;
    document.querySelectorAll(".maxdockSideRailDB47").forEach(element=>element.remove());
    document.body.classList.remove("leftRailDB47");
  }

  function enforceRoleNavigation(){
    const db=window.MaxDockDB;
    if(!db?.getProfile?.())return false;
    db.applyRoleNavigation?.();
    return true;
  }

  function normalizeMetricContainer(container){
    if(!container)return;
    container.style.setProperty("height","auto","important");
    container.style.setProperty("min-height","124px","important");
    container.style.setProperty("max-height","none","important");
    container.style.setProperty("overflow","visible","important");
    container.querySelectorAll(":scope > .metric").forEach(card=>{
      card.style.setProperty("height","auto","important");
      card.style.setProperty("min-height","124px","important");
      card.style.setProperty("max-height","none","important");
      card.style.setProperty("overflow","visible","important");
    });
  }

  function stabilizeMetrics(){
    METRIC_IDS.forEach(id=>{
      const container=document.getElementById(id);
      if(!container||container.dataset.db49MetricWatch)return;
      container.dataset.db49MetricWatch="true";
      normalizeMetricContainer(container);
      new MutationObserver(()=>normalizeMetricContainer(container)).observe(container,{childList:true,subtree:true});
    });
  }

  function simplifySectionMenus(){
    document.querySelectorAll(".sectionWorkspaceRailHead small,.sectionWorkspaceTabs>button small").forEach(item=>item.remove());
  }

  function markAlignedControls(){
    document.querySelectorAll(".dashboardWorkspaceToolbar,.queueWorkspaceToolbar,.reportFilters,.myAppointmentToolbar,.dashboardFilters")
      .forEach(item=>item.classList.add("db49AlignedControls"));
  }

  function refresh(){
    removeUnauthenticatedNavigation();
    enforceRoleNavigation();
    stabilizeMetrics();
    simplifySectionMenus();
    markAlignedControls();
  }

  function initialize(){
    document.body.classList.add("interfaceConsistencyDB49");
    refresh();
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      window.requestAnimationFrame(()=>{queued=false;refresh()});
    }).observe(document.body,{childList:true,subtree:true});
    window.setTimeout(refresh,250);
    window.setTimeout(refresh,900);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
