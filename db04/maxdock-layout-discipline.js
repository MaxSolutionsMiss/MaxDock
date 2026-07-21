(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const sleep=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));

  async function waitFor(test,timeout=12000){
    const started=Date.now();
    while(Date.now()-started<timeout){
      const value=test();
      if(value)return value;
      await sleep(100);
    }
    return null;
  }

  function makeGroup(className,label){
    const group=document.createElement("div");
    group.className=className;
    if(label)group.setAttribute("aria-label",label);
    return group;
  }

  function identifyGroup(group,label){
    if(!group)return;
    group.classList.add("operationsToolbarGroup");
    group.dataset.groupLabel=label;
  }

  async function refineDashboard(){
    const ready=await waitFor(()=>document.querySelector(".dashboardOverviewBand .dashboardControlRail")&&document.querySelector(".dashboardOverviewBand #metrics")&&document.querySelector(".dashboardPrimaryActions"));
    if(!ready)return;

    const pageHead=document.querySelector(".pageHead");
    const actions=document.querySelector(".dashboardActions");
    const primary=document.querySelector(".dashboardPrimaryActions");
    const utility=document.querySelector(".dashboardUtilityActions");
    const band=document.querySelector(".dashboardOverviewBand");
    const controls=band.querySelector(".dashboardControlRail");
    const metrics=band.querySelector("#metrics");
    const customize=controls.querySelector(".dashboardCustomize");
    const note=controls.querySelector(".viewPreferenceNote");
    const dateField=controls.querySelector("#adminDate")?.closest(".filterField");
    const statusField=controls.querySelector("#adminStatus")?.closest(".filterField");
    const rangeHost=controls.querySelector(".dashboardRangeHost");

    document.body.classList.add("layoutDisciplineDB36");
    pageHead?.classList.add("dashboardTitleRow");
    actions?.classList.add("dashboardPrimaryOnly");
    band.classList.add("dashboardWorkspaceStack");
    controls.classList.add("dashboardWorkspaceToolbar");
    metrics.classList.add("dashboardWorkspaceMetrics");

    let operational=controls.querySelector(".dashboardOperationalControls");
    if(!operational){
      operational=makeGroup("dashboardOperationalControls","Dashboard filters");
      controls.prepend(operational);
    }
    [dateField,statusField,rangeHost].forEach(item=>{if(item)operational.appendChild(item)});

    identifyGroup(operational,"Schedule");

    let viewActions=controls.querySelector(".dashboardToolbarViewActions");
    if(!viewActions)viewActions=makeGroup("dashboardToolbarViewActions","Dashboard display controls");
    identifyGroup(viewActions,"Display");

    let documents=controls.querySelector(".dashboardToolbarDocuments");
    if(!documents)documents=makeGroup("dashboardToolbarDocuments","Dashboard document actions");
    identifyGroup(documents,"Documents");

    if(customize){
      const summary=customize.querySelector("summary");
      if(summary){
        summary.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A8 8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg><span class="maxdockSrOnly">Customize dashboard</span>';
        summary.title="Customize dashboard";
        summary.setAttribute("aria-label","Customize dashboard");
      }
      viewActions.appendChild(customize);
    }
    if(utility){
      utility.classList.add("dashboardToolbarDocumentButtons");
      documents.appendChild(utility);
    }
    controls.replaceChildren(operational,viewActions,documents);
    if(note)controls.appendChild(note);

    primary?.querySelectorAll(".dashboardActionPrimary").forEach(button=>button.classList.add("standardPrimaryAction"));
  }

  async function refineQueue(){
    const ready=await waitFor(()=>document.querySelector(".queuePageHead")&&document.querySelector(".queueOpsToolbar")&&document.getElementById("queueToday")&&document.getElementById("queueCustomize"));
    if(!ready)return;

    const pageHead=document.querySelector(".queuePageHead");
    const toolbar=document.querySelector(".queueOpsToolbar");
    const dateField=document.getElementById("queueDate")?.closest(".filterField");
    const viewField=document.getElementById("queueStatus")?.closest(".filterField");
    const today=document.getElementById("queueToday");
    const tomorrow=document.getElementById("queueTomorrow");
    const refresh=document.getElementById("refreshQueue");
    const fullScreen=document.getElementById("openQueueDisplay");
    const customize=document.getElementById("queueCustomize");
    const utility=document.querySelector(".queueOpsToolbar .pageUtilityActions")||document.querySelector(".queuePageHead .pageUtilityActions");

    document.body.classList.add("layoutDisciplineDB36");
    pageHead.classList.add("queueTitleRow");
    toolbar.classList.add("queueWorkspaceToolbar");
    pageHead.insertAdjacentElement("afterend",toolbar);

    let filters=toolbar.querySelector(".queueToolbarFilters");
    if(!filters)filters=makeGroup("queueToolbarFilters","Queue date and view filters");
    [dateField,viewField].forEach(item=>{if(item)filters.appendChild(item)});
    identifyGroup(filters,"Schedule");

    let quick=toolbar.querySelector(".queueToolbarQuickActions");
    if(!quick)quick=makeGroup("queueToolbarQuickActions","Queue day and refresh actions");
    [today,tomorrow,refresh].forEach(item=>{if(item)quick.appendChild(item)});
    quick.classList.remove("operationsToolbarGroup");
    delete quick.dataset.groupLabel;
    filters.appendChild(quick);

    let view=toolbar.querySelector(".queueToolbarViewActions");
    if(!view)view=makeGroup("queueToolbarViewActions","Queue display and view settings");
    identifyGroup(view,"Display");
    if(fullScreen)view.appendChild(fullScreen);
    if(customize){
      const summary=customize.querySelector("summary");
      if(summary){
        summary.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A8 8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg><span class="maxdockSrOnly">Customize operation queue</span>';
        summary.title="Customize operation queue";
        summary.setAttribute("aria-label","Customize operation queue");
      }
      view.appendChild(customize);
    }

    if(utility){
      utility.classList.add("queueToolbarDocuments","operationsToolbarGroup");
      utility.dataset.groupLabel="Documents";
    }

    toolbar.replaceChildren(filters,view);
    if(utility)toolbar.appendChild(utility);
  }

  function refineSharedActions(){
    document.body.classList.add("layoutDisciplineDB36");
    document.querySelectorAll(".pageUtilityActions").forEach(group=>group.classList.add("standardDocumentActions"));
    document.querySelectorAll(".pageUtilityActions .utilityBtn").forEach(button=>button.classList.add("standardDocumentButton"));
  }

  (async function initialize(){
    refineSharedActions();
    if(PAGE==="dashboard")await refineDashboard();
    if(PAGE==="queue")await refineQueue();
  })().catch(error=>console.warn("MaxDock DB36 layout refinement could not finish.",error));
})();
