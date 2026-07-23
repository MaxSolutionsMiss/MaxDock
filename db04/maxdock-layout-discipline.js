/* MaxDock consolidated layout behavior. Loaded once after the application is ready. */
(function(){
  "use strict";
  const NativeObserver=window.MutationObserver;
  if(!NativeObserver||window.MaxDockSharedMutationObserver)return;
  const clients=new Set();
  let scheduled=false;
  const registrationsMatch=(record,registration)=>{
    const {target,options}=registration;
    if(record.target!==target&&!(options.subtree&&target.contains?.(record.target)))return false;
    if(record.type==="childList"&&!options.childList)return false;
    if(record.type==="attributes"){
      if(!options.attributes)return false;
      if(options.attributeFilter&&!options.attributeFilter.includes(record.attributeName))return false;
    }
    if(record.type==="characterData"&&!options.characterData)return false;
    return true;
  };
  const pending=new Map();
  const dispatch=()=>{
    scheduled=false;
    const batch=[...pending.entries()];
    pending.clear();
    batch.forEach(([client,records])=>{
      if(!client.active||!records.length)return;
      try{client.callback(records,client)}catch(error){setTimeout(()=>{throw error})}
    });
  };
  const observer=new NativeObserver(records=>{
    clients.forEach(client=>{
      if(!client.active)return;
      const matches=records.filter(record=>client.registrations.some(registration=>registrationsMatch(record,registration)));
      if(matches.length)pending.set(client,[...(pending.get(client)||[]),...matches]);
    });
    if(pending.size&&!scheduled){scheduled=true;requestAnimationFrame(dispatch)}
  });
  const start=()=>observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
  if(document.documentElement)start();else document.addEventListener("DOMContentLoaded",start,{once:true});
  window.MaxDockSharedMutationObserver=class{
    constructor(callback){this.callback=callback;this.registrations=[];this.active=true;clients.add(this)}
    observe(target,options={}){if(!target)return;this.registrations.push({target,options});this.active=true;clients.add(this)}
    disconnect(){this.active=false;this.registrations=[];clients.delete(this);pending.delete(this)}
    takeRecords(){const records=pending.get(this)||[];pending.delete(this);return records}
  };
})();

/* Consolidated from maxdock-ops-density.js. */
(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));

  document.body.classList.add("opsDensityDB33");

  async function waitFor(test,timeout=10000){
    const started=Date.now();
    while(Date.now()-started<timeout){
      const value=test();
      if(value)return value;
      await sleep(100);
    }
    return null;
  }

  function profileKey(name){
    const id=db?.getProfile?.()?.id||db?.getProfile?.()?.username||"user";
    return `maxdock_db33_${name}_${id}`;
  }

  const DASHBOARD_METRICS=[
    {key:"appointments",label:"Appointments"},
    {key:"scheduled",label:"Scheduled"},
    {key:"completed",label:"Completed"},
    {key:"priority",label:"Priority"},
    {key:"open-slots",label:"Open Slots"},
    {key:"inbound-skids",label:"Inbound Skids"},
    {key:"outbound-skids",label:"Outbound Skids"}
  ];
  const DASHBOARD_DEFAULT=["appointments","scheduled","completed","priority","open-slots"];
  const DASHBOARD_MAX=7;

  function metricKeyFromLabel(label){
    const normalized=String(label||"").trim().toLowerCase().replace(/\s+/g,"-");
    return DASHBOARD_METRICS.some(item=>item.key===normalized)?normalized:"";
  }

  async function loadDashboardSelection(){
    let selected=[];
    let showMetrics=true;
    try{
      const local=JSON.parse(localStorage.getItem(profileKey("dashboard_metrics"))||"[]");
      if(Array.isArray(local))selected=local;
      showMetrics=localStorage.getItem(profileKey("dashboard_metrics_visible"))!=="false";
    }catch(_ignored){}
    if(db?.loadPreference){
      try{
        const saved=await db.loadPreference("dashboard-density",{metrics:selected.length?selected:DASHBOARD_DEFAULT,showMetrics});
        if(Array.isArray(saved?.metrics))selected=saved.metrics;
        showMetrics=saved?.showMetrics!==false;
      }catch(_ignored){}
    }
    selected=selected.filter(key=>DASHBOARD_METRICS.some(item=>item.key===key)).slice(0,DASHBOARD_MAX);
    return {metrics:selected.length?selected:[...DASHBOARD_DEFAULT],showMetrics};
  }

  function saveDashboardSelection(selected,showMetrics){
    try{localStorage.setItem(profileKey("dashboard_metrics"),JSON.stringify(selected))}catch(_ignored){}
    try{localStorage.setItem(profileKey("dashboard_metrics_visible"),String(showMetrics))}catch(_ignored){}
    const statuses=[$("dashboardPreferenceStatus"),$("dashboardCustomizeStatus")].filter(Boolean);
    const updateStatus=(message,state)=>statuses.forEach(status=>{
      status.textContent=message;
      status.dataset.status=state||"saved";
    });
    if(db?.queuePreferenceSave){
      db.queuePreferenceSave("dashboard-density",{metrics:selected,showMetrics},(message,state)=>{
        updateStatus(message||"Saved to your login",state);
      });
    }else updateStatus("Saved on this device","local");
  }

  async function initializeDashboardDensity(){
    const ready=await waitFor(()=>db?.getProfile?.()?.id&&$("metrics")?.children.length&&document.querySelector(".dashboardFilters")&&$("adminDate"));
    if(!ready)return;

    const metrics=$("metrics");
    const filters=document.querySelector(".dashboardFilters");
    const parent=metrics.parentElement;
    const savedSelection=await loadDashboardSelection();
    let selected=savedSelection.metrics;
    let showMetrics=savedSelection.showMetrics;
    let applying=false;

    let band=document.querySelector(".dashboardOverviewBand");
    if(!band){
      band=document.createElement("section");
      band.className="dashboardOverviewBand";
      band.setAttribute("aria-label","Dashboard controls and operational metrics");
      parent.insertBefore(band,metrics);
      band.append(filters,metrics);
    }
    filters.classList.add("dashboardControlRail");
    metrics.classList.add("dashboardMetricGrid");

    let rangeHost=filters.querySelector(".dashboardRangeHost");
    if(!rangeHost){
      rangeHost=document.createElement("div");
      rangeHost.className="dashboardRangeHost";
      const note=filters.querySelector(".viewPreferenceNote");
      filters.insertBefore(rangeHost,note||null);
    }

    let customize=filters.querySelector(".dashboardCustomize");
    if(!customize){
      customize=document.createElement("details");
      customize.className="dashboardCustomize";
      customize.innerHTML=`<summary>Customize</summary><div class="dashboardCustomizeMenu"><fieldset><legend>Dashboard metrics</legend><div class="dashboardCustomizeOptions">${DASHBOARD_METRICS.map(item=>`<label><input type="checkbox" value="${item.key}">${item.label}</label>`).join("")}</div></fieldset><fieldset class="dashboardDisplayPreferences"><legend>Dashboard display</legend><label class="preferenceWide"><input id="dashboardShowMetrics" type="checkbox" ${showMetrics?"checked":""}>Show metrics dashboard</label></fieldset><button class="secondaryBtn utilityBtn" id="resetDashboardPreferences" type="button">Reset default view</button><small class="preferenceSyncStatus" id="dashboardCustomizeStatus" data-status="saved">Saved to your login</small></div>`;
      const note=filters.querySelector(".viewPreferenceNote");
      filters.insertBefore(customize,note||null);
    }

    const syncControls=()=>{
      customize.querySelectorAll('.dashboardCustomizeOptions input[type="checkbox"]').forEach(input=>{
        input.checked=selected.includes(input.value);
        input.disabled=!input.checked&&selected.length>=DASHBOARD_MAX;
      });
      if($("dashboardShowMetrics"))$("dashboardShowMetrics").checked=showMetrics;
    };

    const applyMetrics=()=>{
      if(applying)return;
      applying=true;
      try{
        const newRange=metrics.querySelector(":scope > .rangeMetric");
        if(newRange){
          newRange.classList.add("dashboardRangeCompact");
          rangeHost.replaceChildren(newRange);
        }
        let visible=0;
        metrics.querySelectorAll(":scope > .metric:not(.rangeMetric)").forEach(card=>{
          const key=metricKeyFromLabel(card.querySelector("small")?.textContent);
          if(key)card.dataset.metricKey=key;
          const show=Boolean(key&&selected.includes(key));
          card.hidden=!show;
          if(show)visible++;
        });
        metrics.style.setProperty("--visible-dashboard-metrics",String(Math.max(1,visible)));
        metrics.classList.toggle("metricsDashboardHidden",!showMetrics);
        metrics.hidden=!showMetrics;
        syncControls();
      }finally{
        applying=false;
      }
    };

    customize.addEventListener("change",event=>{
      const input=event.target.closest('input[type="checkbox"]');
      if(!input)return;
      if(input.id==="dashboardShowMetrics"){
        showMetrics=input.checked;
        saveDashboardSelection(selected,showMetrics);
        applyMetrics();
        return;
      }
      const next=new Set(selected);
      if(input.checked){
        if(next.size>=DASHBOARD_MAX){input.checked=false;return}
        next.add(input.value);
      }else{
        if(next.size<=1){input.checked=true;return}
        next.delete(input.value);
      }
      selected=[...next];
      saveDashboardSelection(selected,showMetrics);
      applyMetrics();
    });

    $("resetDashboardPreferences")?.addEventListener("click",()=>{
      selected=[...DASHBOARD_DEFAULT];
      showMetrics=true;
      saveDashboardSelection(selected,showMetrics);
      applyMetrics();
    });

    document.addEventListener("click",event=>{
      if(customize.open&&!customize.contains(event.target))customize.open=false;
    });

    const observer=new window.MaxDockSharedMutationObserver(()=>window.requestAnimationFrame(applyMetrics));
    observer.observe(metrics,{childList:true});
    applyMetrics();
  }

  function queueMetricCount(){
    const count=$("queueMetrics")?.querySelectorAll(".metric")?.length||0;
    $("queueMetrics")?.style.setProperty("--visible-queue-metrics",String(Math.max(1,count)));
  }

  async function applyCompactQueueDefault(menu){
    const marker=profileKey("queue_compact_default");
    if(localStorage.getItem(marker))return;
    const metricInputs=[...menu.querySelectorAll('input[data-pref-section="metrics"]')];
    if(metricInputs.length!==8||metricInputs.some(input=>!input.checked)){
      localStorage.setItem(marker,"1");
      return;
    }
    for(const key of ["blocks","priority","soon"]){
      const input=metricInputs.find(item=>item.value===key);
      if(input?.checked){
        input.checked=false;
        input.dispatchEvent(new Event("change",{bubbles:true}));
        await sleep(20);
      }
    }
    localStorage.setItem(marker,"1");
  }

  async function initializeQueueDensity(){
    const ready=await waitFor(()=>db?.getProfile?.()?.id&&document.querySelector(".queuePageHead")&&document.querySelector(".queueFilters")&&$("queueCustomizeMenu")&&$("queueMetrics")?.children.length);
    if(!ready)return;

    const pageHead=document.querySelector(".queuePageHead");
    const filters=document.querySelector(".queueFilters");
    const actions=filters.querySelector(".queueFilterActions");
    const utility=pageHead.querySelector(".pageUtilityActions");
    const customize=$("queueCustomize");
    const menu=$("queueCustomizeMenu");

    filters.classList.add("queueOpsToolbar");
    pageHead.appendChild(filters);
    if(actions&&customize)actions.appendChild(customize);
    if(actions&&utility)actions.appendChild(utility);

    if($("refreshQueue"))$("refreshQueue").textContent="Refresh";
    if($("openQueueDisplay"))$("openQueueDisplay").textContent="Full screen";

    menu.addEventListener("change",event=>{
      const input=event.target.closest('input[data-pref-section="metrics"]');
      if(!input)return;
      const checked=[...menu.querySelectorAll('input[data-pref-section="metrics"]:checked')];
      if(input.checked&&checked.length>6){
        input.checked=false;
        event.stopImmediatePropagation();
        const status=$("queuePreferenceStatus");
        if(status){status.textContent="Choose up to six queue metrics.";status.dataset.status=""}
        return;
      }
      window.setTimeout(queueMetricCount,0);
    },true);

    const metricObserver=new window.MaxDockSharedMutationObserver(queueMetricCount);
    metricObserver.observe($("queueMetrics"),{childList:true});
    queueMetricCount();

    await sleep(350);
    await applyCompactQueueDefault(menu);
    queueMetricCount();
  }

  function initializeGeneralDensity(){
    document.querySelectorAll(".pageUtilityActions .utilityBtn").forEach(button=>{
      if(button.textContent.trim()==="Open full-screen view")button.textContent="Full screen";
    });
  }

  (async function initialize(){
    initializeGeneralDensity();
    if(PAGE==="dashboard")await initializeDashboardDensity();
    if(PAGE==="queue")await initializeQueueDensity();
  })().catch(error=>console.warn("MaxDock DB33 layout enhancement could not finish.",error));
})();

/* Consolidated from maxdock-layout-discipline.js. */
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
    if(!ready||document.body.classList.contains("db72Consistency"))return;

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
    const refresh=controls.querySelector("#refreshDashboard");

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
    [dateField,statusField,rangeHost,refresh].forEach(item=>{if(item)operational.appendChild(item)});

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
        summary.innerHTML=`${window.MAXDOCK_ICONS?.menu||""}<span class="maxdockSrOnly">Customize dashboard</span>`;
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
    if(!ready||document.body.classList.contains("db72Consistency"))return;

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
        summary.innerHTML=`${window.MAXDOCK_ICONS?.menu||""}<span class="maxdockSrOnly">Customize operations queue</span>`;
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

/* Consolidated from maxdock-db42.js. */
(function(){
  "use strict";

  const page=document.body.dataset.page||"page";

  function storageKey(root){
    return `maxdock-db42-${page}-${root.dataset.workspaceKey||"section"}`;
  }

  function activateWorkspaceSection(root,name,options={}){
    const buttons=[...root.querySelectorAll("[data-section-target]")];
    const panels=[...root.querySelectorAll("[data-section-panel]")];
    const button=buttons.find(item=>item.dataset.sectionTarget===name)||buttons[0];
    if(!button)return;
    const active=button.dataset.sectionTarget;

    buttons.forEach((item,index)=>{
      const selected=item===button;
      if(!item.id)item.id=`${page}-workspace-tab-${index+1}`;
      item.setAttribute("aria-selected",String(selected));
      item.tabIndex=selected?0:-1;
      item.classList.toggle("isActive",selected);
    });
    panels.forEach(panel=>{
      const selected=panel.dataset.sectionPanel===active;
      panel.hidden=!selected;
      panel.setAttribute("aria-hidden",String(!selected));
      const controllingButton=buttons.find(item=>item.dataset.sectionTarget===panel.dataset.sectionPanel);
      if(controllingButton)panel.setAttribute("aria-labelledby",controllingButton.id);
    });
    try{localStorage.setItem(storageKey(root),active)}catch(_error){}
    if(options.focus)button.focus();
  }

  function initWorkspace(root,index){
    root.dataset.workspaceKey=root.dataset.workspaceKey||String(index+1);
    const buttons=[...root.querySelectorAll("[data-section-target]")];
    if(!buttons.length)return;
    let initial=root.dataset.defaultSection||buttons[0].dataset.sectionTarget;
    try{initial=localStorage.getItem(storageKey(root))||initial}catch(_error){}
    activateWorkspaceSection(root,initial);

    buttons.forEach(button=>button.addEventListener("click",()=>activateWorkspaceSection(root,button.dataset.sectionTarget)));
    root.querySelector(".sectionWorkspaceTabs")?.addEventListener("keydown",event=>{
      const current=buttons.indexOf(document.activeElement);
      if(current<0)return;
      let next=current;
      if(["ArrowDown","ArrowRight"].includes(event.key))next=(current+1)%buttons.length;
      else if(["ArrowUp","ArrowLeft"].includes(event.key))next=(current-1+buttons.length)%buttons.length;
      else if(event.key==="Home")next=0;
      else if(event.key==="End")next=buttons.length-1;
      else return;
      event.preventDefault();
      activateWorkspaceSection(root,buttons[next].dataset.sectionTarget,{focus:true});
    });
  }

  function initReportTabs(){
    const select=document.getElementById("reportView");
    const buttons=[...document.querySelectorAll("[data-report-view]")];
    if(!select||!buttons.length)return;

    const sync=()=>{
      buttons.forEach((button,index)=>{
        const selected=button.dataset.reportView===select.value;
        if(!button.id)button.id=`report-workspace-tab-${index+1}`;
        button.setAttribute("aria-selected",String(selected));
        button.tabIndex=selected?0:-1;
        button.classList.toggle("isActive",selected);
      });
    };
    buttons.forEach(button=>button.addEventListener("click",()=>{
      if(select.value!==button.dataset.reportView){
        select.value=button.dataset.reportView;
        select.dispatchEvent(new Event("change",{bubbles:true}));
      }
      sync();
    }));
    document.querySelector("[data-report-tabs]")?.addEventListener("keydown",event=>{
      const current=buttons.indexOf(document.activeElement);
      if(current<0)return;
      let next=current;
      if(["ArrowDown","ArrowRight"].includes(event.key))next=(current+1)%buttons.length;
      else if(["ArrowUp","ArrowLeft"].includes(event.key))next=(current-1+buttons.length)%buttons.length;
      else if(event.key==="Home")next=0;
      else if(event.key==="End")next=buttons.length-1;
      else return;
      event.preventDefault();
      buttons[next].click();
      buttons[next].focus();
    });
    select.addEventListener("change",sync);
    sync();
    [0,250,750,1500].forEach(delay=>window.setTimeout(sync,delay));
  }

  function initialize(){
    document.body.classList.add("compactWorkspacesDB42");
    document.querySelectorAll("[data-section-workspace]").forEach(initWorkspace);
    initReportTabs();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db43.js. */
(function(){
  "use strict";

  const page=document.body.dataset.page||"";

  function syncNavigationLink(source,target){
    target.hidden=source.hidden||source.style.display==="none";
    if(source.hasAttribute("aria-current"))target.setAttribute("aria-current",source.getAttribute("aria-current")||"page");
    else target.removeAttribute("aria-current");
  }

  function buildPersistentNavigation(){
    const topbar=document.querySelector(".topbarInner");
    const menu=document.querySelector(".menu");
    const headerActions=topbar?.querySelector(".headerActions");
    if(!topbar||!menu||!headerActions||topbar.querySelector(".maxdockPrimaryNav"))return;

    const nav=document.createElement("nav");
    nav.className="maxdockPrimaryNav";
    nav.setAttribute("aria-label","Primary navigation");
    const sourceLinks=[...menu.querySelectorAll(":scope > a")];
    sourceLinks.forEach(source=>{
      const link=source.cloneNode(true);
      link.className="maxdockPrimaryNavLink";
      const route=(new URL(link.href,location.href).pathname.split("/").pop()||"").replace(".html","");
      link.dataset.route=route;
      if(link.textContent.trim()==="My Appointments")link.textContent="Appointments";
      syncNavigationLink(source,link);
      nav.appendChild(link);
      new window.MaxDockSharedMutationObserver(()=>syncNavigationLink(source,link)).observe(source,{attributes:true,attributeFilter:["hidden","style","aria-current"]});
    });
    topbar.insertBefore(nav,headerActions);

    const menuSummary=headerActions.querySelector(".menuDetails>summary");
    if(menuSummary){
      menuSummary.title="More navigation and account options";
      menuSummary.setAttribute("aria-label","More navigation and account options");
    }
  }

  function syncSelectTabs(select,buttons){
    buttons.forEach(button=>{
      const active=button.dataset.selectValue===select.value;
      button.classList.toggle("isActive",active);
      button.setAttribute("aria-selected",String(active));
      button.tabIndex=active?0:-1;
    });
  }

  function addSelectTabBehavior(select,buttons){
    buttons.forEach(button=>button.addEventListener("click",()=>{
      if(select.value!==button.dataset.selectValue){
        select.value=button.dataset.selectValue;
        select.dispatchEvent(new Event("change",{bubbles:true}));
      }
      syncSelectTabs(select,buttons);
    }));
    const tablist=buttons[0]?.parentElement;
    tablist?.addEventListener("keydown",event=>{
      const current=buttons.indexOf(document.activeElement);
      if(current<0)return;
      let next=current;
      if(["ArrowDown","ArrowRight"].includes(event.key))next=(current+1)%buttons.length;
      else if(["ArrowUp","ArrowLeft"].includes(event.key))next=(current-1+buttons.length)%buttons.length;
      else if(event.key==="Home")next=0;
      else if(event.key==="End")next=buttons.length-1;
      else return;
      event.preventDefault();
      buttons[next].click();
      buttons[next].focus();
    });
    select.addEventListener("change",()=>syncSelectTabs(select,buttons));
    syncSelectTabs(select,buttons);
    [0,250,750,1500].forEach(delay=>window.setTimeout(()=>syncSelectTabs(select,buttons),delay));
  }

  function buildAppointmentWorkspace(){
    const select=document.getElementById("myAppointmentFilter");
    const panel=select?.closest("section.panel");
    if(!select||!panel||panel.parentElement?.classList.contains("appointmentsSectionWorkspace"))return;

    const sourceField=select.closest(".filterField");
    sourceField?.classList.add("workspaceSourceControl");
    panel.id="appointment-list-workspace";
    const title=panel.querySelector(".panelHeader h3");
    if(title)title.textContent="Appointment list";

    const workspace=document.createElement("div");
    workspace.className="sectionWorkspace appointmentsSectionWorkspace";
    const rail=document.createElement("aside");
    rail.className="sectionWorkspaceRail";
    rail.setAttribute("aria-label","Appointment views");
    rail.innerHTML='<div class="sectionWorkspaceRailHead"><strong>Appointment views</strong><small>Choose which bookings to review.</small></div><div class="sectionWorkspaceTabs appointmentViewTabs" role="tablist" aria-orientation="vertical"></div>';
    const tabs=rail.querySelector(".appointmentViewTabs");
    const labels={upcoming:["Upcoming","Scheduled ahead"],all:["All bookings","Complete history"],past:["Past","Completed dates"],cancelled:["Cancelled","Cancelled bookings"]};
    [...select.options].forEach((option,index)=>{
      const [label,description]=labels[option.value]||[option.textContent,""];
      const button=document.createElement("button");
      button.type="button";
      button.id=`appointment-view-tab-${index+1}`;
      button.setAttribute("role","tab");
      button.setAttribute("aria-controls",panel.id);
      button.dataset.selectValue=option.value;
      button.innerHTML=`<span>${label}</span><small>${description}</small>`;
      tabs.appendChild(button);
    });
    const content=document.createElement("div");
    content.className="sectionWorkspaceContent";
    panel.insertAdjacentElement("beforebegin",workspace);
    workspace.append(rail,content);
    content.appendChild(panel);
    addSelectTabBehavior(select,[...tabs.querySelectorAll("button")]);
  }

  function initialize(){
    document.body.classList.add("operationalConsoleDB43");
    buildPersistentNavigation();
    if(page==="myappointments")buildAppointmentWorkspace();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db44.js. */
(function(){
  "use strict";

  function initialize(){
    document.body.classList.add("operationalClarityDB44");
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db45.js. */
(function(){
  "use strict";

  function closeOpenDetails(event){
    document.querySelectorAll("details[open]").forEach(details=>{
      if(event?.type==="click"&&details.contains(event.target))return;
      details.removeAttribute("open");
    });
  }

  function dismissOverlay(overlay){
    const closeButton=overlay.querySelector(".closeBtn");
    if(closeButton)closeButton.click();
    else overlay.classList.remove("show");
    if(!document.querySelector(".modalOverlay.show"))document.body.classList.remove("modalOpen");
  }

  function handleBackdropClick(event){
    const overlay=event.target.closest(".modalOverlay.show");
    if(overlay&&event.target===overlay)dismissOverlay(overlay);
  }

  function handleEscape(event){
    if(event.key!=="Escape")return;
    const overlays=[...document.querySelectorAll(".modalOverlay.show")];
    if(overlays.length){
      dismissOverlay(overlays[overlays.length-1]);
      return;
    }
    closeOpenDetails(event);
  }

  function compactNavigationLabels(){
    const labels={
      "my-appointments":"Appointments",
      queue:"Operation Queue",
      reports:"Reports",
      dashboard:"Dashboard",
      settings:"Settings",
      admin:"Users",
      data:"Data"
    };
    document.querySelectorAll(".maxdockPrimaryNavLink").forEach(link=>{
      if(labels[link.dataset.route])link.textContent=labels[link.dataset.route];
    });
  }

  function configureOverflowNavigation(){
    document.querySelectorAll(".menuDetails>summary").forEach(summary=>{
      summary.title="Open navigation";
      summary.setAttribute("aria-label","Open navigation");
      summary.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"/></svg>';
    });
  }

  function initialize(){
    document.body.classList.add("operationalAlignmentDB45");
    document.querySelectorAll(".operationsQueueShortcut").forEach(link=>link.remove());
    compactNavigationLabels();
    configureOverflowNavigation();
    document.addEventListener("click",closeOpenDetails);
    document.addEventListener("click",handleBackdropClick);
    document.addEventListener("keydown",handleEscape);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db46.js. */
(function(){
  "use strict";

  const NAVIGATION_ORDER=["my-appointments","queue","reports","dashboard","settings","admin","data"];
  const NAVIGATION_LABELS={
    "my-appointments":"Appointments",
    queue:"Operation Queue",
    reports:"Reports",
    dashboard:"Dashboard",
    settings:"Settings",
    admin:"Users",
    data:"Data"
  };
  const METRIC_TONES={
    appointments:"appointments",
    scheduled:"scheduled",
    completed:"completed",
    priority:"priority",
    "open slots":"open-slots",
    "inbound skids":"inbound",
    "outbound skids":"outbound",
    pending:"pending",
    inbound:"inbound",
    outbound:"outbound",
    "pending skids":"skids",
    "dock blocks":"blocks",
    "priority loads":"priority",
    "due soon":"soon"
  };

  function routeFor(link){
    return (new URL(link.href,location.href).pathname.split("/").pop()||"").replace(".html","");
  }

  function stabilizeNavigation(){
    document.querySelectorAll(".menu").forEach(menu=>{
      const links=[...menu.querySelectorAll(":scope > a")];
      links.sort((left,right)=>NAVIGATION_ORDER.indexOf(routeFor(left))-NAVIGATION_ORDER.indexOf(routeFor(right)));
      links.forEach(link=>{
        const route=routeFor(link);
        if(NAVIGATION_LABELS[route])link.textContent=NAVIGATION_LABELS[route];
        menu.appendChild(link);
      });
    });
    document.querySelectorAll(".maxdockPrimaryNav").forEach(nav=>{
      const links=[...nav.querySelectorAll(":scope > .maxdockPrimaryNavLink")];
      links.sort((left,right)=>NAVIGATION_ORDER.indexOf(routeFor(left))-NAVIGATION_ORDER.indexOf(routeFor(right)));
      links.forEach(link=>{
        const route=routeFor(link);
        link.dataset.route=route;
        if(NAVIGATION_LABELS[route])link.textContent=NAVIGATION_LABELS[route];
        nav.appendChild(link);
      });
      nav.dataset.stableNavigation="true";
    });
  }

  function tagMetricCards(container){
    container?.querySelectorAll(":scope > .metric").forEach(card=>{
      const label=String(card.querySelector("small")?.textContent||"").trim().toLowerCase();
      const tone=METRIC_TONES[label];
      if(tone)card.dataset.metricTone=tone;
    });
  }

  function watchMetricCards(){
    ["metrics","queueMetrics"].forEach(id=>{
      const container=document.getElementById(id);
      if(!container)return;
      tagMetricCards(container);
      new window.MaxDockSharedMutationObserver(()=>tagMetricCards(container)).observe(container,{childList:true});
    });
  }

  function initialize(){
    document.body.classList.add("operationalBalanceDB46");
    stabilizeNavigation();
    watchMetricCards();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db47.js. */
(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const RAIL_LABELS={
    "my-appointments":"Appointments",
    queue:"Queue",
    reports:"Reports",
    dashboard:"Dashboard",
    settings:"Settings",
    admin:"Users",
    data:"Data"
  };
  const NAV_ICONS={
    "my-appointments":'<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 8h4m-4 4h6"/>',
    queue:'<path d="M5 6h14M5 12h14M5 18h14M8 4v4M12 10v4M16 16v4"/>',
    reports:'<path d="M5 19V9m5 10V5m5 14v-7m4 7V3"/>',
    dashboard:'<path d="M4 4h7v7H4V4Zm9 0h7v4h-7V4Zm0 6h7v10h-7V10ZM4 13h7v7H4v-7Z"/>',
    settings:'<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Zm7.4-2 .1-1.5-.1-1.5 2-1.5-2-3.5-2.4 1A8 8 0 0 0 14.4 5L14 2.5h-4L9.6 5A8 8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5-.1 1.5.1 1.5-2 1.5 2 3.5 2.4-1A8 8 0 0 0 9.6 19l.4 2.5h4l.4-2.5a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5Z"/>',
    admin:'<path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20m6-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1v6m-3-3h6"/>',
    data:'<path d="M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Zm8 3v6c0 1.7-3.6 3-8 3s-8-1.3-8-3V6m16 6v6c0 1.7-3.6 3-8 3s-8-1.3-8-3v-6"/>'
  };
  const METRIC_TONES={
    appointments:"appointments",scheduled:"scheduled",completed:"completed",priority:"priority",
    "open slots":"open-slots","inbound skids":"inbound","outbound skids":"outbound",pending:"pending",
    inbound:"inbound",outbound:"outbound","pending skids":"skids","dock blocks":"blocks",
    "priority loads":"priority","due soon":"soon",upcoming:"scheduled","all bookings":"appointments",
    cancelled:"cancelled","unread notices":"unread","active trucks":"trucks","cancellation rate":"cancelled",
    "booked hours":"booked","occupied capacity":"capacity","blocked hours":"blocks"
  };
  const METRIC_ICONS={
    appointments:'<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 8h4m-4 4h6"/>',
    scheduled:'<path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
    completed:'<path d="m7 12 3 3 7-7m4 4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
    priority:'<path d="m12 3 2.2 5.2 5.6.5-4.3 3.7 1.3 5.5L12 15l-4.8 2.9 1.3-5.5-4.3-3.7 5.6-.5L12 3Z"/>',
    "open-slots":'<path d="M4 5h16v14H4V5Zm4 0v14m8-14v14M4 10h16m-16 4h16"/>',
    inbound:'<path d="M12 3v12m-4-4 4 4 4-4M5 19h14"/>',
    outbound:'<path d="M12 21V9m-4 4 4-4 4 4M5 5h14"/>',
    pending:'<path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
    skids:'<path d="m4 8 8-4 8 4-8 4-8-4Zm0 4 8 4 8-4m-16 4 8 4 8-4"/>',
    blocks:'<path d="M6 6h12v12H6V6Zm3 3 6 6m0-6-6 6"/>',
    soon:'<path d="M12 8v5m0 3h.01M10.3 4.6 2.8 18a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 4.6a2 2 0 0 0-3.4 0Z"/>',
    cancelled:'<path d="m8 8 8 8m0-8-8 8m13-4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
    unread:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8.7 11a3 3 0 0 0 5.4 0"/>',
    trucks:'<path d="M3 6h11v10H3V6Zm11 4h4l3 3v3h-7v-6ZM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
    booked:'<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm4 8h6"/>',
    capacity:'<path d="M4 18V9m5 9V5m5 13v-6m5 6V3"/>'
  };

  function routeFor(link){
    return (new URL(link.href,location.href).pathname.split("/").pop()||"").replace(".html","");
  }
  function iconSvg(path){
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  }
  function setTopbarHeight(){
    const topbar=document.querySelector(".topbar");
    if(topbar)document.documentElement.style.setProperty("--db47-topbar-height",`${Math.ceil(topbar.getBoundingClientRect().height)}px`);
  }
  function buildSideRail(){
    if(["login","password"].includes(PAGE)||document.querySelector(".maxdockSideRailDB47"))return true;
    const nav=document.querySelector(".maxdockPrimaryNav");
    const topbar=document.querySelector(".topbar");
    if(!nav||!topbar)return false;

    const rail=document.createElement("aside");
    rail.className="maxdockSideRailDB47";
    rail.setAttribute("aria-label","MaxDock application navigation");
    const head=document.createElement("div");
    head.className="maxdockSideRailHeadDB47";
    head.innerHTML='<span>MD</span><small>Menu</small>';
    const foot=document.createElement("div");
    foot.className="maxdockSideRailFootDB47";
    foot.innerHTML='<span>DB47</span><small>Preview</small>';

    nav.classList.add("maxdockSideRailNavDB47");
    nav.querySelectorAll(".maxdockPrimaryNavLink").forEach(link=>{
      const route=routeFor(link);
      const label=RAIL_LABELS[route]||link.textContent.trim();
      link.dataset.route=route;
      link.title=label;
      link.setAttribute("aria-label",label);
      link.innerHTML=`<span class="maxdockRailIconDB47">${iconSvg(NAV_ICONS[route]||NAV_ICONS.dashboard)}</span><span class="maxdockRailLabelDB47">${label}</span>`;
    });
    rail.append(head,nav,foot);
    topbar.insertAdjacentElement("afterend",rail);
    document.body.classList.add("leftRailDB47");
    setTopbarHeight();
    if("ResizeObserver" in window)new ResizeObserver(setTopbarHeight).observe(topbar);
    else window.addEventListener("resize",setTopbarHeight);
    return true;
  }

  function toneFor(label,index){
    return METRIC_TONES[label]||["appointments","scheduled","completed","priority","inbound","outbound","capacity"][index%7];
  }
  function decorateMetricCard(card,index){
    const label=String(card.querySelector("small")?.textContent||"").trim().toLowerCase();
    const tone=toneFor(label,index);
    card.dataset.metricTone=tone;
    card.classList.add("metricVisualDB47");
    let icon=card.querySelector(":scope > .metricIconDB47");
    if(!icon){
      icon=document.createElement("span");
      icon.className="metricIconDB47";
      card.prepend(icon);
    }
    icon.innerHTML=iconSvg(METRIC_ICONS[tone]||METRIC_ICONS.appointments);
  }
  function decorateMetricContainer(container){
    container?.querySelectorAll(":scope > .metric").forEach(decorateMetricCard);
  }
  function watchMetrics(){
    ["metrics","queueMetrics","myAppointmentMetrics","reportMetrics"].forEach(id=>{
      const container=document.getElementById(id);
      if(!container)return;
      container.classList.add("graphicalMetricsDB47");
      decorateMetricContainer(container);
      new window.MaxDockSharedMutationObserver(()=>decorateMetricContainer(container)).observe(container,{childList:true});
    });
  }
  function markCompactControls(){
    document.querySelectorAll(".dashboardFilters,.dashboardWorkspaceToolbar,.queueWorkspaceToolbar,.reportFilters,.myAppointmentToolbar").forEach(item=>item.classList.add("compactControlsDB47"));
  }

  function initialize(){
    document.body.classList.add("interfacePreviewDB47");
    let attempts=0;
    const mount=()=>{
      if(buildSideRail()||attempts++>30)return;
      window.setTimeout(mount,100);
    };
    mount();
    watchMetrics();
    markCompactControls();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db48.js. */
(function(){
  "use strict";

  function cleanRail(){
    const rail=document.querySelector(".maxdockSideRailDB47");
    if(!rail)return false;
    rail.querySelector(".maxdockSideRailHeadDB47")?.remove();
    rail.querySelector(".maxdockSideRailFootDB47")?.remove();
    return true;
  }

  function enterQueueDisplay(){
    document.body.classList.add("queueDisplayMode");
    const bar=document.getElementById("queueDisplayBar");
    const button=document.getElementById("openQueueDisplay");
    if(bar)bar.hidden=false;
    if(button)button.hidden=true;
    if(document.documentElement.requestFullscreen&&!document.fullscreenElement){
      document.documentElement.requestFullscreen().catch(()=>{});
    }
  }

  function configureFullscreen(){
    if(typeof window.openTvSchedule==="function"){
      window.openScheduleDisplay=()=>window.openTvSchedule(true);
    }
    const original=document.getElementById("openQueueDisplay");
    if(original&&!original.dataset.db48Fullscreen){
      const replacement=original.cloneNode(true);
      replacement.dataset.db48Fullscreen="true";
      replacement.addEventListener("click",enterQueueDisplay);
      original.replaceWith(replacement);
    }
  }

  function initialize(){
    document.body.classList.add("interfaceRefinementDB48");
    let attempts=0;
    const mount=()=>{
      cleanRail();
      configureFullscreen();
      if((document.querySelector(".maxdockSideRailDB47")||["login","password"].includes(document.body.dataset.page||""))&&attempts>4)return;
      if(attempts++>30)return;
      window.setTimeout(mount,100);
    };
    mount();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db49.js. */
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
      new window.MaxDockSharedMutationObserver(()=>normalizeMetricContainer(container)).observe(container,{childList:true,subtree:true});
    });
  }

  function simplifySectionMenus(){
    document.querySelectorAll(".sectionWorkspaceRailHead small,.sectionWorkspaceTabs>button small").forEach(item=>item.setAttribute("aria-hidden","true"));
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
    new window.MaxDockSharedMutationObserver(()=>{
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

/* Consolidated from maxdock-db50.js. */
(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const params=new URLSearchParams(location.search);
  const directBooking=params.get("book")==="1";
  let directBookingOpened=false;
  let closeWrapped=false;

  function normalizeDashboardRange(){
    document.querySelectorAll(".rangeMetric").forEach(range=>{
      range.classList.remove("metric","metricVisualDB47");
      range.classList.add("dashboardRangeCompact","dashboardRangeControlDB50");
      range.removeAttribute("data-metric-tone");
      range.querySelectorAll(".metricIconDB47").forEach(icon=>icon.remove());
      const label=range.querySelector("small");
      if(label)label.textContent="Date Range";
    });
  }

  function markBookingButton(){
    if(PAGE!=="myappointments")return;
    const button=[...document.querySelectorAll(".pageHead a")].find(link=>/book\s+(an\s+)?appointment/i.test(link.textContent||""));
    if(!button)return;
    button.classList.add("bookAppointmentBtnDB50");
    button.textContent="Book an Appointment";
    button.href="./index.html?book=1&return=my-appointments&v=94-db72";
  }

  function wrapCloseRequest(){
    if(closeWrapped||typeof window.closeRequest!=="function")return;
    closeWrapped=true;
    const original=window.closeRequest;
    window.closeRequest=function(){
      if(!directBooking)return original.apply(this,arguments);
      window.closeEfficiencyOpportunity?.();
      location.replace("./my-appointments.html?v=94-db72");
    };
  }

  function openDirectBooking(){
    if(!directBooking||directBookingOpened)return;
    const db=window.MaxDockDB;
    if(!db?.getProfile?.()||typeof window.openRequest!=="function"||!document.getElementById("requestModal"))return;
    if(!document.body.classList.contains("maxdockContextReady"))return;
    if(db.isOperationalRole?.()&&PAGE!=="dashboard"){
      directBookingOpened=true;
      location.replace("./dashboard.html?book=1&return=my-appointments&v=94-db72");
      return;
    }
    if(!db.getCurrentLocation?.()||!db.getLocationData?.())return;
    if(!db.hasPermission?.("appointment.create"))return;
    directBookingOpened=true;
    document.body.classList.add("directBookingDB50");
    wrapCloseRequest();
    window.openRequest();
  }

  function refresh(){
    normalizeDashboardRange();
    markBookingButton();
    wrapCloseRequest();
    openDirectBooking();
  }

  function initialize(){
    document.body.classList.add("interfaceConsistencyDB50");
    refresh();
    let queued=false;
    new window.MaxDockSharedMutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;refresh()});
    }).observe(document.body,{childList:true,subtree:true});
    window.setTimeout(refresh,200);
    window.setTimeout(refresh,700);
    window.setTimeout(refresh,1400);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db51.js. */
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
    button.href="./index.html?book=1&return=my-appointments&v=94-db72";
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
      if(typeof window.openQueueDisplay==="function")window.openQueueDisplay();
      else enterQueueDisplay();
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
    new window.MaxDockSharedMutationObserver(()=>{
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

/* Consolidated from maxdock-db52.js. */
(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const params=new URLSearchParams(location.search);
  const directBooking=params.get("book")==="1";
  const $=id=>document.getElementById(id);
  let bookingLaunchTimer=0;
  let bookingLaunchAttempts=0;
  let closeWrapped=false;

  const calendarIcon=window.MAXDOCK_ICONS?.calendar||"";
  const blockIcon='<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM9 14h6"/></svg>';
  const refreshIcon=window.MAXDOCK_ICONS?.refresh||"";

  function setButtonContent(button,icon,text){
    if(!button)return;
    button.classList.add("actionPrimaryDB52");
    if(button.dataset.db52Label===text)return;
    button.dataset.db52Label=text;
    button.innerHTML=`${icon}<span>${text}</span>`;
    button.setAttribute("aria-label",text);
  }

  function roleAwareBookingUrl(){
    const role=window.MaxDockDB?.getProfile?.()?.role_code;
    return role&&role!=="customer"
      ?"./dashboard.html?book=1&return=my-appointments&v=94-db72"
      :"./index.html?book=1&return=my-appointments&v=94-db72";
  }

  function bookingContextReady(){
    const db=window.MaxDockDB;
    return Boolean(document.body.classList.contains("maxdockContextReady")&&db?.getProfile?.());
  }

  function waitForBookingRoute(button){
    let attempts=0;
    const original=button.innerHTML;
    button.disabled=true;
    button.setAttribute("aria-busy","true");
    const check=()=>{
      attempts++;
      const db=window.MaxDockDB;
      if(bookingContextReady()&&db.hasPermission?.("appointment.create")){
        location.assign(roleAwareBookingUrl());
        return;
      }
      if(bookingContextReady()&&attempts>8){
        button.disabled=false;
        button.removeAttribute("aria-busy");
        button.innerHTML=original;
        window.MaxDockUI?.toast?.("This account does not have permission to book an appointment.",{tone:"error"});
        return;
      }
      if(attempts>=80){
        button.disabled=false;
        button.removeAttribute("aria-busy");
        button.innerHTML=original;
        window.MaxDockUI?.toast?.("MaxDock is still loading your booking access. Please try again.",{tone:"error"});
        return;
      }
      window.setTimeout(check,125);
    };
    check();
  }

  function bindMyAppointmentsBooking(){
    const button=$("bookAppointmentFromMyAppointments");
    if(!button||button.dataset.db52Bound)return;
    button.dataset.db52Bound="true";
    button.addEventListener("click",event=>{
      event.preventDefault();
      if(button.disabled)return;
      waitForBookingRoute(button);
    });
  }

  function moveDashboardBookingActions(){
    if(PAGE!=="dashboard")return;
    const toolbar=document.querySelector(".dashboardWorkspaceToolbar");
    const operational=toolbar?.querySelector(".dashboardOperationalControls");
    const primary=document.querySelector(".dashboardPrimaryActions");
    if(!toolbar||!operational||!primary)return;
    primary.classList.add("dashboardBookingActionsDB52","operationsToolbarGroup");
    primary.dataset.groupLabel="Actions";
    if(primary.parentElement!==toolbar)operational.insertAdjacentElement("afterend",primary);
    const buttons=primary.querySelectorAll(".dashboardActionPrimary");
    setButtonContent(buttons[0],calendarIcon,"Book Appointment");
    setButtonContent(buttons[1],blockIcon,"Block Time");
    document.querySelector(".dashboardActions")?.classList.toggle("db52EmptyActions",!document.querySelector(".dashboardActions")?.children.length);
  }

  function normalizeQueueRefresh(){
    setButtonContent($("refreshQueue"),refreshIcon,"Refresh");
  }

  function simplifyBookingWizard(){
    const modal=$("requestModal");
    if(!modal)return;
    document.body.classList.add("bookingFlowDB52");
    const title=modal.querySelector(".requestModalTitle h2");
    if(title)title.textContent="Book an Appointment";
    const labels=["Load","Truck","Time","Contact","Review"];
    labels.forEach((label,index)=>{
      const text=modal.querySelector(`#pill${index+1}>span:last-child`);
      if(text)text.textContent=label;
    });
    const titles=new Map([
      ["step1","What are you sending?"],
      ["step2","Truck & Skids"],
      ["step3","Choose a Time"],
      ["step4","Contact & Reference"]
    ]);
    titles.forEach((text,id)=>{
      const heading=$(id)?.querySelector(".stepTitle");
      if(heading)heading.textContent=text;
    });
  }

  function wrapDirectBookingClose(){
    if(!directBooking||closeWrapped||typeof window.closeRequest!=="function")return;
    closeWrapped=true;
    const original=window.closeRequest;
    window.closeRequest=function(){
      if(!directBooking)return original.apply(this,arguments);
      window.closeEfficiencyOpportunity?.();
      $("requestModal")?.classList.remove("show");
      location.replace("./my-appointments.html?v=94-db72");
    };
  }

  function tryOpenDirectBooking(){
    if(!directBooking){window.clearInterval(bookingLaunchTimer);return}
    bookingLaunchAttempts++;
    const db=window.MaxDockDB;
    const modal=$("requestModal");
    if(bookingContextReady()&&db?.hasPermission?.("appointment.create")&&db?.getLocationData?.()&&modal&&typeof window.openRequest==="function"){
      window.clearInterval(bookingLaunchTimer);
      document.body.classList.add("directBookingDB52","bookingFlowDB52");
      wrapDirectBookingClose();
      if(!modal.classList.contains("show"))window.openRequest();
      window.setTimeout(()=>{
        if(modal.classList.contains("show"))modal.querySelector(".stepPanel.active :is(select,input,button)")?.focus?.({preventScroll:true});
      },120);
      return;
    }
    if(bookingLaunchAttempts>=120)window.clearInterval(bookingLaunchTimer);
  }

  function wrapShowStep(){
    if(typeof window.showStep!=="function"||window.showStep.__db52Wrapped)return;
    const original=window.showStep;
    const wrapped=function(step){
      const result=original.apply(this,arguments);
      window.setTimeout(()=>{
        const modal=$("requestModal");
        const active=$("step"+step);
        modal?.querySelector(".modalBody")?.scrollTo?.({top:0,behavior:"smooth"});
        active?.querySelector(":is(select,input,button)")?.focus?.({preventScroll:true});
        $("pill"+step)?.scrollIntoView?.({behavior:"smooth",block:"nearest",inline:"center"});
      },40);
      return result;
    };
    wrapped.__db52Wrapped=true;
    window.showStep=wrapped;
  }

  function refresh(){
    document.body.classList.add("interfacePolishDB52");
    bindMyAppointmentsBooking();
    moveDashboardBookingActions();
    normalizeQueueRefresh();
    simplifyBookingWizard();
    wrapShowStep();
    wrapDirectBookingClose();
  }

  function initialize(){
    refresh();
    let queued=false;
    new window.MaxDockSharedMutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;refresh()});
    }).observe(document.body,{childList:true,subtree:true});
    if(directBooking){
      bookingLaunchTimer=window.setInterval(tryOpenDirectBooking,250);
      tryOpenDirectBooking();
    }
    window.setTimeout(refresh,300);
    window.setTimeout(refresh,900);
    window.setTimeout(refresh,1800);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db53.js. */
(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const OPERATIONAL_ROUTES=new Set(["my-appointments","queue","reports","dashboard","settings"]);
  const SYSTEM_ADMIN_ROUTES=new Set([...OPERATIONAL_ROUTES,"admin","data"]);
  const EXTERNAL_ROUTES=new Set(["my-appointments"]);
  let bookingOpenQueued=false;
  let openRequestWrapped=false;

  function routeFor(link){
    if(link.dataset.route)return link.dataset.route;
    try{return (new URL(link.href,location.href).pathname.split("/").pop()||"").replace(/\.html$/i,"")}
    catch{return ""}
  }

  function allowedRoutesFor(profile){
    if(!profile)return null;
    if(profile.role_code==="system_admin")return SYSTEM_ADMIN_ROUTES;
    if(["site_admin","shipping_manager","coordinator"].includes(profile.role_code))return OPERATIONAL_ROUTES;
    return EXTERNAL_ROUTES;
  }

  function enforceRoleNavigation(){
    const db=window.MaxDockDB;
    const profile=db?.getProfile?.();
    const allowed=allowedRoutesFor(profile);
    if(!allowed)return false;

    document.querySelectorAll(".maxdockPrimaryNav a,.maxdockSideRailDB47 a,.menu>a").forEach(link=>{
      const route=routeFor(link);
      const visible=allowed.has(route);
      link.hidden=!visible;
      link.setAttribute("aria-hidden",String(!visible));
      link.style.setProperty("display",visible?"":"none",visible?"":"important");
      if(visible)link.removeAttribute("tabindex");
      else link.tabIndex=-1;
    });

    if(["admin","data"].includes(PAGE)&&profile.role_code!=="system_admin"){
      location.replace(`./${db.getLandingPage?.()||"dashboard.html"}`);
      return true;
    }
    return true;
  }

  function contextReadyForBooking(){
    const db=window.MaxDockDB;
    return Boolean(
      document.body.classList.contains("maxdockContextReady")&&
      db?.getProfile?.()&&
      db?.hasPermission?.("appointment.create")&&
      db?.getLocationData?.()
    );
  }

  function waitForBookingContext(onReady,onDenied){
    let attempts=0;
    const check=()=>{
      attempts++;
      const db=window.MaxDockDB;
      const contextReady=document.body.classList.contains("maxdockContextReady")&&db?.getProfile?.();
      if(contextReady&&db.hasPermission?.("appointment.create")&&db.getLocationData?.()){
        bookingOpenQueued=false;
        onReady();
        return;
      }
      if(contextReady&&!db.hasPermission?.("appointment.create")&&attempts>8){
        bookingOpenQueued=false;
        onDenied?.();
        return;
      }
      if(attempts>=80){
        bookingOpenQueued=false;
        window.MaxDockUI?.toast?.("MaxDock is still loading your booking access. Please try again.",{tone:"error"});
        return;
      }
      window.setTimeout(check,125);
    };
    check();
  }

  function wrapOpenRequest(){
    if(openRequestWrapped||typeof window.openRequest!=="function")return;
    const original=window.openRequest;
    if(original.__db53Wrapped){openRequestWrapped=true;return}
    const wrapped=function(){
      const args=arguments;
      const scope=this;
      if(contextReadyForBooking())return original.apply(scope,args);
      if(bookingOpenQueued)return;
      bookingOpenQueued=true;
      waitForBookingContext(
        ()=>original.apply(scope,args),
        ()=>window.MaxDockUI?.toast?.("This account does not have permission to book an appointment.",{tone:"error"})
      );
    };
    wrapped.__db53Wrapped=true;
    window.openRequest=wrapped;
    openRequestWrapped=true;
  }

  function normalizeQueueRefresh(){
    const button=document.getElementById("refreshQueue");
    if(!button)return;
    button.classList.add("db53PrimaryAction","queueRefreshDB53");
    button.classList.remove("greenBtn");
  }

  function simplifyLocationControl(){
    document.querySelectorAll(".headerActions .locationPill").forEach(item=>item.classList.add("locationControlDB53"));
  }

  function arrangeAppointmentWorkspace(){
    if(PAGE!=="myappointments")return;
    const workspace=document.querySelector(".appointmentsSectionWorkspace");
    const spotlight=document.getElementById("nextAppointmentSpotlight");
    if(!workspace||!spotlight)return;

    workspace.classList.add("appointmentsWorkspaceDB53");
    if(spotlight.nextElementSibling!==workspace)spotlight.insertAdjacentElement("afterend",workspace);

    const rail=workspace.querySelector(".sectionWorkspaceRail");
    rail?.classList.add("appointmentViewsRailDB53");
    rail?.querySelector(".sectionWorkspaceRailHead small")?.remove();

    const names={upcoming:"Upcoming",all:"All Bookings",past:"Past",cancelled:"Cancelled"};
    rail?.querySelectorAll(".appointmentViewTabs>button").forEach(button=>{
      const label=button.querySelector("span");
      if(label&&names[button.dataset.selectValue])label.textContent=names[button.dataset.selectValue];
      button.querySelector("small")?.remove();
    });
  }

  function refresh(){
    document.body.classList.add("interfacePolishDB53");
    enforceRoleNavigation();
    wrapOpenRequest();
    normalizeQueueRefresh();
    simplifyLocationControl();
    arrangeAppointmentWorkspace();
  }

  function initialize(){
    refresh();
    let queued=false;
    new window.MaxDockSharedMutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;refresh()});
    }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","style"]});
    [150,400,900,1600,2600].forEach(delay=>window.setTimeout(refresh,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db54.js. */
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
    if(PAGE!=="dashboard"||document.body.classList.contains("db72Consistency"))return;

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
    new window.MaxDockSharedMutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;refresh()});
    }).observe(document.body,{childList:true,subtree:true});
    [150,400,900,1600,2600].forEach(delay=>window.setTimeout(refresh,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db55.js. */
(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const TARGET_ID=PAGE==="dashboard"?"metrics":PAGE==="myappointments"?"myAppointmentMetrics":"";

  function markHorizontalMetrics(){
    if(!TARGET_ID)return false;
    const container=document.getElementById(TARGET_ID);
    if(!container)return false;

    document.body.classList.add("horizontalMetricsDB55");
    container.classList.add("horizontalMetricsGridDB55");
    container.querySelectorAll(":scope > .metric").forEach(card=>card.classList.add("horizontalMetricCardDB55"));
    return true;
  }

  function initialize(){
    markHorizontalMetrics();
    const container=document.getElementById(TARGET_ID);
    if(container){
      new window.MaxDockSharedMutationObserver(markHorizontalMetrics).observe(container,{childList:true});
    }
    [100,250,500,900,1600].forEach(delay=>window.setTimeout(markHorizontalMetrics,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db56.js. */
(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const TARGET_ID=PAGE==="dashboard"?"metrics":PAGE==="myappointments"?"myAppointmentMetrics":"";

  function applyFinalPolish(){
    document.body.classList.add("finalPolishDB56");
    if(!TARGET_ID)return;
    const container=document.getElementById(TARGET_ID);
    if(!container)return;
    container.classList.add("horizontalMetricsGridDB55");
    container.querySelectorAll(":scope > .metric").forEach(card=>{
      card.classList.add("horizontalMetricCardDB55");
    });
  }

  function initialize(){
    applyFinalPolish();
    const container=document.getElementById(TARGET_ID);
    if(container)new window.MaxDockSharedMutationObserver(applyFinalPolish).observe(container,{childList:true});
    [100,250,500,900,1600].forEach(delay=>window.setTimeout(applyFinalPolish,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();

/* Consolidated from maxdock-db64.js. */
(function(){
  "use strict";
  const PAGE=document.body.dataset.page||"";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const GEAR=window.MAXDOCK_ICONS?.menu||"";

  function key(value){return String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
  function profileKey(name){const p=db?.getProfile?.();return `maxdock_db64_${name}_${p?.id||p?.username||"user"}`}
  function inline(field){if(!field)return;field.classList.add("db64InlineField");const label=field.querySelector(":scope > label,:scope > small");if(label&&field.querySelector("select,input"))label.style.removeProperty("position")}

  function enforceRoleLocation(){
    const role=db?.getProfile?.()?.role_code||"";
    const admin=role==="system_admin";
    const operational=db?.isOperationalRole?.(role)||false;
    document.body.classList.toggle("systemAdminLocation",admin);
    document.body.classList.toggle("operationalLocation",operational);
    document.body.classList.toggle("fixedOperationalLocation",operational&&!admin);
    document.querySelectorAll(".headerActions .locationPill").forEach(item=>{
      item.hidden=!operational;
      item.style.setProperty("display",operational?"flex":"none","important");
      const select=item.querySelector("select");
      if(select){
        select.disabled=!admin;
        select.setAttribute("aria-disabled",String(!admin));
      }
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
  window.MaxDockEnsureReportGearDB72=ensureReportGear;

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

/* Consolidated from maxdock-db65.js. */
(function(){
  "use strict";
  const PAGE=document.body.dataset.page||"";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const GEAR=window.MAXDOCK_ICONS?.menu||"";
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
    if(PAGE==="settings")location.replace("./queue.html?v=94-db72");
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
    if(appointmentMetrics)new window.MaxDockSharedMutationObserver(()=>requestAnimationFrame(arrangeMyAppointments)).observe(appointmentMetrics,{childList:true});
    document.addEventListener("change",event=>{
      if(event.target.matches("#reportView,#reportPreset,#dashboardRange,#myAppointmentFilter"))setTimeout(applyAll,0);
    },true);
    $("runReport")?.addEventListener("click",()=>{setTimeout(applyAll,60);setTimeout(applyAll,320)});
    window.addEventListener("resize",()=>requestAnimationFrame(()=>{applyAppointmentSelection();compactReportMenu()}),{passive:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();

/* Consolidated from maxdock-db66.js. */
(function(){
"use strict";
const PAGE=document.body.dataset.page||"";
const $=id=>document.getElementById(id);
const imp=(el,p,v)=>el&&el.style.setProperty(p,v,"important");
function pair(id){const control=$(id);if(!control)return null;const host=control.closest(".filterField,.rangeMetric")||control.parentElement;if(!host)return null;host.classList.add("db66FieldPair");const label=host.querySelector(":scope > label,:scope > small");if(label&&label.tagName==="SMALL"){const next=document.createElement("label");next.htmlFor=id;next.textContent=label.textContent.trim();label.replaceWith(next)}return host}
function moveDashboardActions(){if(PAGE!=="dashboard")return;const filters=document.querySelector(".dashboardFilters");const primary=document.querySelector(".dashboardPrimaryActions");const utility=document.querySelector(".dashboardUtilityActions");const range=pair("dashboardRange");pair("adminDate");pair("adminStatus");if(filters&&primary&&range&&primary.parentElement!==filters){if(range.parentElement===filters)filters.insertBefore(primary,range);else filters.appendChild(primary)}if(filters&&utility&&utility.parentElement!==filters)filters.appendChild(utility);const gear=document.querySelector("#dashboardCustomize,.dashboardCustomize");if(utility&&gear&&gear.parentElement!==utility){gear.classList.add("db66GearHost");utility.insertBefore(gear,utility.firstChild)}}
function harmonizeFields(){["adminDate","adminStatus","dashboardRange","queueDate","queueStatus","reportView","reportPreset","reportStart","reportEnd","myAppointmentFilter"].forEach(pair)}
function gridCount(container,varName){if(!container)return;const visible=[...container.children].filter(el=>!el.hidden&&getComputedStyle(el).display!=="none").length||1;container.style.setProperty(varName,String(visible))}
function harmonizeMetrics(){gridCount($("metrics"),"--db66-dashboard-columns");gridCount($("myAppointmentMetrics"),"--db66-appointment-columns");gridCount($("queueMetrics"),"--db66-queue-columns");gridCount($("reportMetrics"),"--db66-report-columns");const dashboard=$("metrics");if(dashboard)imp(dashboard,"grid-template-columns",`repeat(${Math.max(1,[...dashboard.children].filter(x=>!x.hidden).length)},minmax(0,1fr))`)}
function queueLayout(){if(PAGE!=="queue")return;pair("queueDate");pair("queueStatus");const actions=document.querySelector(".queueFilterActions");const utilities=document.querySelector(".pageUtilityActions");if(actions&&utilities){[...utilities.children].forEach(btn=>actions.appendChild(btn));utilities.remove()}}
function reportsLayout(){if(PAGE!=="reports")return;pair("reportView");pair("reportPreset");const filters=document.querySelector(".reportFilters");const gear=document.querySelector(".db64ReportCustomize");const pageUtilities=document.querySelector(".pageUtilityActions");if(filters&&pageUtilities){[...pageUtilities.children].forEach(btn=>filters.insertBefore(btn,gear||null));pageUtilities.remove()}}
function myAppointments(){if(PAGE==="myappointments")pair("myAppointmentFilter")}
function apply(){document.body.classList.add("db66Reference");harmonizeFields();moveDashboardActions();queueLayout();reportsLayout();myAppointments();harmonizeMetrics()}
function init(){apply();[80,220,500,1000,1800].forEach(t=>setTimeout(apply,t));["metrics","myAppointmentMetrics","queueMetrics","reportMetrics"].forEach(id=>{const el=$(id);if(el)new window.MaxDockSharedMutationObserver(()=>requestAnimationFrame(harmonizeMetrics)).observe(el,{childList:true,subtree:false,attributes:true,attributeFilter:["hidden","style"]})})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

/* Consolidated from maxdock-db69.js. */
(function(){
"use strict";

const PAGE=document.body.dataset.page||"";
const $=id=>document.getElementById(id);
const GEAR_SELECTOR="#dashboardCustomize,.dashboardCustomize,#queueCustomize,#db64ReportCustomize,#myAppointmentsCustomizeDB65";
const METRIC_CONFIG=[
  {container:"metrics",toggle:"dashboardShowMetrics"},
  {container:"myAppointmentMetrics",toggle:"myAppointmentsShowMetricsDB65"},
  {container:"queueMetrics",toggle:"queueShowMetrics"},
  {container:"reportMetrics",toggle:"db64ReportShowMetrics"}
];
let normalizing=false;
let normalizationQueued=false;

function pair(id){
  const control=$(id);
  if(!control)return null;
  const host=control.closest(".filterField,.rangeMetric,.dashboardRangeHost")||control.parentElement;
  if(!host)return null;
  host.classList.add("db69FieldPair");
  const oldLabel=host.querySelector(":scope > small");
  if(oldLabel&&!host.querySelector(":scope > label")){
    const label=document.createElement("label");
    label.htmlFor=id;
    label.textContent=oldLabel.textContent.trim();
    oldLabel.replaceWith(label);
  }
  return host;
}

function addGearContract(details,label){
  if(!details)return null;
  details.classList.add("db69Gear");
  const summary=details.querySelector(":scope > summary");
  if(summary){
    summary.setAttribute("title",label);
    summary.setAttribute("aria-label",label);
  }
  return details;
}

function orderChildren(parent,ordered){
  if(!parent)return;
  ordered.filter(Boolean).forEach((element,index)=>{
    if(element.parentElement!==parent||parent.children[index]!==element){
      parent.insertBefore(element,parent.children[index]||null);
    }
  });
}

function orderedDocuments(group,exportButton,printButton,gear){
  if(!group)return;
  orderChildren(group,[exportButton,printButton,gear]);
}

function normalizeDashboard(){
  if(PAGE!=="dashboard")return;
  const toolbar=document.querySelector(".dashboardFilters");
  if(!toolbar)return;
  toolbar.classList.add("db69ControlBar");
  const date=pair("adminDate");
  const status=pair("adminStatus");
  const range=pair("dashboardRange");
  const primary=document.querySelector(".dashboardPrimaryActions");
  const utilities=document.querySelector(".dashboardUtilityActions");
  const gear=addGearContract(document.querySelector("#dashboardCustomize,.dashboardCustomize"),"Customize dashboard");
  if(primary)primary.classList.add("db69QuickActions");
  if(utilities){
    utilities.classList.add("db69RightActions");
    const buttons=utilities.querySelectorAll(":scope > button");
    orderedDocuments(utilities,buttons[0],buttons[1],gear);
  }
  orderChildren(toolbar,[date,status,primary,range,utilities]);
}

function normalizeQueue(){
  if(PAGE!=="queue")return;
  const toolbar=document.querySelector(".queueFilters");
  if(!toolbar)return;
  toolbar.classList.add("db69ControlBar");
  const date=pair("queueDate");
  const status=pair("queueStatus");
  const quick=document.querySelector(".queueFilterActions");
  if(quick)quick.classList.add("db69QuickActions");
  let right=toolbar.querySelector(":scope > .db69QueueRightActions");
  if(!right){
    right=document.createElement("div");
    right.className="db69RightActions db69QueueRightActions";
    right.setAttribute("role","group");
    right.setAttribute("aria-label","Queue display and document actions");
  }
  const display=$("openQueueDisplay");
  const exportButton=$("exportQueue");
  const printButton=$("printQueue");
  const gear=addGearContract($("queueCustomize"),"Customize queue");
  orderedDocuments(right,display,exportButton,printButton);
  if(gear&&(gear.parentElement!==right||right.lastElementChild!==gear))right.appendChild(gear);
  orderChildren(toolbar,[date,status,quick,right]);
}

function normalizeReports(){
  if(PAGE!=="reports")return;
  const toolbar=document.querySelector(".reportFilters");
  if(!toolbar)return;
  toolbar.classList.add("db69ControlBar");
  const view=pair("reportView");
  const preset=pair("reportPreset");
  pair("reportStart");
  pair("reportEnd");
  const custom=$("reportCustomDates");
  const update=$("runReport");
  let right=toolbar.querySelector(":scope > .db69ReportRightActions");
  if(!right){
    right=document.createElement("div");
    right.className="db69RightActions db69ReportRightActions";
    right.setAttribute("role","group");
    right.setAttribute("aria-label","Report document actions");
  }
  const exportButton=$("exportReport");
  const printButton=[...document.querySelectorAll(".pageUtilityActions button,.reportFilters button")]
    .find(button=>button.textContent.trim()==="Print");
  const gear=addGearContract($("db64ReportCustomize"),"Customize report");
  orderedDocuments(right,exportButton,printButton,gear);
  orderChildren(toolbar,[view,preset,custom,update,right]);
}

function normalizeMyAppointments(){
  if(PAGE!=="myappointments")return;
  pair("myAppointmentFilter");
  const bar=document.querySelector(".myAppointmentsBookingBarDB52");
  const gear=addGearContract($("myAppointmentsCustomizeDB65"),"Customize appointments");
  if(bar&&gear&&gear.parentElement!==bar)bar.appendChild(gear);
  const listPanel=document.querySelector(".db65AppointmentListPanel")||
    $("myAppointmentFilter")?.closest(".panel");
  const notices=document.querySelector(".notificationPanel");
  if(listPanel)listPanel.classList.add("db65AppointmentListPanel");
  if(notices)notices.classList.add("db65NotificationPanel");
  if(listPanel&&notices&&listPanel.parentElement===notices.parentElement&&listPanel.nextElementSibling!==notices){
    listPanel.parentElement.insertBefore(listPanel,notices);
  }
}

function visibleCards(container){
  return [...container.children].filter(card=>{
    if(card.hidden||card.classList.contains("metricHidden"))return false;
    return getComputedStyle(card).display!=="none";
  });
}

function setImportant(element,property,value){
  if(element.style.getPropertyValue(property)!==value||element.style.getPropertyPriority(property)!=="important"){
    element.style.setProperty(property,value,"important");
  }
}

function syncMetricContainer(config){
  const container=$(config.container);
  if(!container)return;
  const toggle=$(config.toggle);
  const shouldShow=toggle?Boolean(toggle.checked):!container.hidden;
  if(!shouldShow){
    if(!container.hidden)container.hidden=true;
    container.classList.add("metricsDashboardHidden");
    if(container.getAttribute("aria-hidden")!=="true")container.setAttribute("aria-hidden","true");
    setImportant(container,"display","none");
    setImportant(container,"height","0px");
    setImportant(container,"min-height","0px");
    setImportant(container,"max-height","0px");
    setImportant(container,"margin","0px");
    return;
  }

  if(container.hidden)container.hidden=false;
  container.classList.remove("metricsDashboardHidden");
  if(container.getAttribute("aria-hidden")!=="false")container.setAttribute("aria-hidden","false");
  const cards=visibleCards(container);
  const count=Math.max(1,cards.length);
  if(container.style.getPropertyValue("--db69-metric-columns")!==String(count)){
    container.style.setProperty("--db69-metric-columns",String(count));
  }
  setImportant(container,"display","grid");
  setImportant(container,"grid-template-columns",`repeat(${count},minmax(0,1fr))`);
  setImportant(container,"margin","0px 0px 10px");

  const compact=window.matchMedia&&window.matchMedia("(max-width: 1180px)").matches;
  const cardHeight=config.container==="reportMetrics"?104:78;
  if(compact){
    setImportant(container,"height","auto");
    setImportant(container,"min-height","0px");
    setImportant(container,"max-height","none");
  }else{
    setImportant(container,"height",`${cardHeight}px`);
    setImportant(container,"min-height",`${cardHeight}px`);
    setImportant(container,"max-height",`${cardHeight}px`);
  }
  cards.forEach(card=>{
    setImportant(card,"height",compact?"auto":`${cardHeight}px`);
    setImportant(card,"min-height",`${cardHeight}px`);
    setImportant(card,"max-height",compact?"none":`${cardHeight}px`);
  });
}

function syncAllMetrics(){
  METRIC_CONFIG.forEach(syncMetricContainer);
}

function normalize(){
  if(normalizing)return;
  normalizing=true;
  try{
    document.body.classList.add("db69Consistency");
    normalizeDashboard();
    normalizeQueue();
    normalizeReports();
    normalizeMyAppointments();
    syncAllMetrics();
  }finally{
    normalizing=false;
  }
}

function queueNormalization(){
  if(normalizationQueued)return;
  normalizationQueued=true;
  requestAnimationFrame(()=>{
    normalizationQueued=false;
    normalize();
  });
}

function installScopedObservers(){
  const toolbar=document.querySelector(".dashboardFilters,.queueFilters,.reportFilters");
  if(toolbar&&!toolbar.dataset.db69Observed){
    toolbar.dataset.db69Observed="true";
    new window.MaxDockSharedMutationObserver(queueNormalization).observe(toolbar,{childList:true,subtree:false});
  }
  METRIC_CONFIG.forEach(config=>{
    const container=$(config.container);
    if(!container||container.dataset.db69Observed)return;
    container.dataset.db69Observed="true";
    new window.MaxDockSharedMutationObserver(queueNormalization).observe(container,{
      childList:true,
      subtree:false,
      attributes:true,
      attributeFilter:["hidden","class"]
    });
  });
}

function closeOtherMenus(openDetails){
  document.querySelectorAll(GEAR_SELECTOR).forEach(details=>{
    if(details!==openDetails)details.open=false;
  });
}

function init(){
  normalize();
  installScopedObservers();
  [80,220,500,1000,1900,2800].forEach(delay=>setTimeout(()=>{
    normalize();
    installScopedObservers();
  },delay));
  document.addEventListener("change",event=>{
    if(event.target.matches('input[type="checkbox"]'))queueNormalization();
  });
  document.addEventListener("toggle",event=>{
    const details=event.target.closest?.(GEAR_SELECTOR);
    if(details?.open)closeOtherMenus(details);
  },true);
  document.addEventListener("click",event=>{
    if(!event.target.closest(GEAR_SELECTOR))closeOtherMenus(null);
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape")closeOtherMenus(null);
  });
  window.addEventListener("resize",queueNormalization,{passive:true});
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();

/* DB72: one final shared layout and interaction contract.
   My Appointments is the visual reference for page actions and KPI cards. */
(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const $=id=>document.getElementById(id);
  const METRICS=[
    {container:"metrics",toggle:"dashboardShowMetrics"},
    {container:"myAppointmentMetrics",toggle:"myAppointmentsShowMetricsDB65"},
    {container:"queueMetrics",toggle:"queueShowMetrics"},
    {container:"reportMetrics",toggle:"db64ReportShowMetrics"}
  ];
  const CONTROL_WIDTHS={
    adminDate:"152px",
    adminStatus:"170px",
    dashboardRange:"150px",
    queueDate:"152px",
    queueStatus:"154px",
    reportView:"190px",
    reportPreset:"170px",
    reportStart:"150px",
    reportEnd:"150px",
    myAppointmentFilter:"170px"
  };
  let queued=false;

  function important(element,property,value){
    if(!element)return;
    if(element.style.getPropertyValue(property)!==value||element.style.getPropertyPriority(property)!=="important"){
      element.style.setProperty(property,value,"important");
    }
  }

  function fieldPair(id){
    const control=$(id);
    if(!control)return null;
    const host=control.closest(".filterField,.rangeMetric,.dashboardRangeHost")||control.parentElement;
    if(!host)return null;
    host.classList.add("db72FieldPair");
    let label=host.querySelector(":scope > label,:scope > small");
    if(label?.tagName==="SMALL"){
      const replacement=document.createElement("label");
      replacement.htmlFor=id;
      replacement.textContent=label.textContent.trim();
      label.replaceWith(replacement);
      label=replacement;
    }
    if(label){
      important(label,"position","static");
      important(label,"inset","auto");
      important(label,"display","block");
      important(label,"flex","0 0 auto");
      important(label,"width","auto");
      important(label,"min-width","max-content");
      important(label,"margin","0");
      important(label,"padding","0");
      important(label,"transform","none");
      important(label,"white-space","nowrap");
    }
    important(host,"position","static");
    important(host,"display","flex");
    important(host,"align-items","center");
    important(host,"flex","0 0 auto");
    important(host,"gap","8px");
    important(host,"width","auto");
    important(host,"min-width","0");
    important(host,"margin","0");
    important(host,"padding","0");
    important(host,"overflow","visible");
    important(control,"position","static");
    important(control,"flex","0 0 auto");
    important(control,"width",CONTROL_WIDTHS[id]||"auto");
    important(control,"min-width","0");
    important(control,"height","40px");
    important(control,"min-height","40px");
    important(control,"max-height","40px");
    important(control,"margin","0");
    important(control,"transform","none");
    return host;
  }

  function order(parent,elements){
    if(!parent)return;
    elements.filter(Boolean).forEach((element,index)=>{
      if(element.parentElement!==parent||parent.children[index]!==element){
        parent.insertBefore(element,parent.children[index]||null);
      }
    });
  }

  function markGear(details,label){
    if(!details)return null;
    details.classList.add("db72Gear");
    const summary=details.querySelector(":scope > summary");
    if(summary){
      summary.title=label;
      summary.setAttribute("aria-label",label);
      summary.setAttribute("aria-expanded",String(details.open));
    }
    return details;
  }

  function normalizeDocumentActions(){
    const pageHead=document.querySelector("main .pageHead");
    const row=$("maxdockDocumentUtilityRow");
    if(!pageHead||!row)return;
    row.classList.add("db72TitleDocumentActions");
    if(row.parentElement!==pageHead)pageHead.appendChild(row);
    const tools=$("maxdockDocumentTools");
    if(tools)tools.classList.add("db72DocumentTools");
  }

  function normalizeDashboard(){
    if(PAGE!=="dashboard")return;
    const toolbar=document.querySelector(".dashboardFilters");
    if(!toolbar)return;
    toolbar.classList.add("db72ControlBar","db72DashboardControlBar");
    const date=fieldPair("adminDate");
    const status=fieldPair("adminStatus");
    const range=fieldPair("dashboardRange");
    let primary=document.querySelector(".dashboardPrimaryActions");
    if(!primary){
      const actions=[...document.querySelectorAll(".dashboardActionPrimary")];
      primary=document.createElement("div");
      primary.className="dashboardPrimaryActions";
      actions.forEach(action=>primary.appendChild(action));
    }
    const primaryActions=[...primary.querySelectorAll(".dashboardActionPrimary")];
    const actionSpecs=[
      {kind:"book",label:"Book Appointment",className:"appointmentActionBtn",handler:()=>window.openRequest?.()},
      {kind:"block",label:"Block Time",className:"blockActionBtn",handler:()=>window.openBlockModal?.()}
    ];
    actionSpecs.forEach(spec=>{
      let button=primaryActions.find(action=>action.classList.contains(spec.className)||action.dataset.db72DashboardAction===spec.kind);
      if(!button){
        button=document.createElement("button");
        button.type="button";
        button.className=`primaryBtn dashboardActionPrimary ${spec.className}`;
        button.dataset.db72DashboardAction=spec.kind;
        button.innerHTML=`<span class="buttonIcon" aria-hidden="true">${window.MAXDOCK_ICONS?.calendar||""}</span><span>${spec.label}</span>`;
        button.addEventListener("click",spec.handler);
        primary.appendChild(button);
      }
    });
    if(!primary.childElementCount){
      primary.remove();
      primary=null;
    }
    const refresh=$("refreshDashboard");
    const gear=markGear(document.querySelector("#dashboardCustomize,.dashboardCustomize"),"Customize dashboard");
    if(primary)primary.classList.add("db72PrimaryActions");
    if(refresh)refresh.classList.add("db72RefreshAction");
    order(toolbar,[date,status,primary,range,refresh,gear]);
    toolbar.querySelectorAll(":scope > .dashboardOperationalControls,:scope > .dashboardCommandStripDB54,:scope > .dashboardToolbarViewActions,:scope > .dashboardToolbarDocuments,:scope > .dashboardUtilityActions")
      .forEach(group=>{if(!group.childElementCount)group.remove()});
    toolbar.querySelectorAll(":scope > .rangeMetric").forEach(group=>{
      if(!group.querySelector("#dashboardRange"))group.remove();
    });
    document.querySelectorAll(".pageHead .dashboardActions").forEach(group=>{if(!group.childElementCount)group.remove()});
  }

  function normalizeQueue(){
    if(PAGE!=="queue")return;
    const toolbar=document.querySelector(".queueFilters");
    if(!toolbar)return;
    toolbar.classList.add("db72ControlBar","db72QueueControlBar");
    const date=fieldPair("queueDate");
    const status=fieldPair("queueStatus");
    let quick=toolbar.querySelector(":scope > .db72QueueQuickActions");
    if(!quick){
      quick=toolbar.querySelector(":scope > .queueFilterActions")||document.createElement("div");
      quick.classList.add("db72QueueQuickActions");
      quick.setAttribute("role","group");
      quick.setAttribute("aria-label","Queue date and refresh actions");
    }
    [$("queueToday"),$("queueTomorrow"),$("refreshQueue")].filter(Boolean).forEach(button=>quick.appendChild(button));
    let right=toolbar.querySelector(":scope > .db72QueueRightActions");
    if(!right){
      right=document.createElement("div");
      right.className="db72QueueRightActions";
      right.setAttribute("role","group");
      right.setAttribute("aria-label","Queue display and settings actions");
    }
    const display=$("openQueueDisplay");
    const gear=markGear($("queueCustomize"),"Customize operations queue");
    if(display){
      display.disabled=false;
      display.removeAttribute("aria-disabled");
      right.appendChild(display);
    }
    if(gear)right.appendChild(gear);
    order(toolbar,[date,status,quick,right]);
    toolbar.querySelectorAll(":scope > .db69QueueRightActions,:scope > .db70QueueRightActions")
      .forEach(group=>{if(group!==right&&!group.childElementCount)group.remove()});
  }

  function normalizeReports(){
    if(PAGE!=="reports")return;
    const toolbar=document.querySelector(".reportFilters");
    if(!toolbar)return;
    toolbar.classList.add("db72ControlBar","db72ReportControlBar");
    window.MaxDockEnsureReportGearDB72?.();
    const view=fieldPair("reportView");
    const preset=fieldPair("reportPreset");
    fieldPair("reportStart");
    fieldPair("reportEnd");
    const custom=$("reportCustomDates");
    const update=$("runReport");
    const gear=markGear($("db64ReportCustomize"),"Customize report KPIs");
    if(update)update.classList.add("db72UpdateAction");
    order(toolbar,[view,preset,custom,update,gear]);
    toolbar.querySelectorAll(":scope > .db69ReportRightActions,:scope > .db70ReportRightActions")
      .forEach(group=>{if(!group.childElementCount)group.remove()});
    document.querySelectorAll("#reportPreferenceStatus,.reportFilters>.preferenceSyncStatus").forEach(status=>status.remove());
  }

  function normalizeMyAppointments(){
    if(PAGE!=="myappointments")return;
    fieldPair("myAppointmentFilter");
    const bookingBar=document.querySelector(".myAppointmentsBookingBarDB52");
    const book=$("bookAppointmentFromMyAppointments");
    const gear=markGear($("myAppointmentsCustomizeDB65"),"Customize appointment KPIs");
    if(!bookingBar)return;
    bookingBar.classList.add("db72MyAppointmentsReference");
    if(book)bookingBar.appendChild(book);
    if(gear)bookingBar.appendChild(gear);
  }

  function visibleMetricCards(container){
    return [...container.children].filter(card=>{
      if(card.hidden||card.classList.contains("metricHidden"))return false;
      return getComputedStyle(card).display!=="none";
    });
  }

  function syncMetricContainer({container:containerId,toggle:toggleId}){
    const container=$(containerId);
    if(!container)return;
    const toggle=$(toggleId);
    const show=toggle?Boolean(toggle.checked):!container.hidden;
    if(!show){
      container.hidden=true;
      container.classList.add("metricsDashboardHidden","db72Metrics");
      container.setAttribute("aria-hidden","true");
      important(container,"display","none");
      important(container,"height","0px");
      important(container,"min-height","0px");
      important(container,"max-height","0px");
      important(container,"margin","0px");
      return;
    }

    container.hidden=false;
    container.classList.remove("metricsDashboardHidden");
    container.classList.add("db72Metrics");
    container.setAttribute("aria-hidden","false");
    const cards=visibleMetricCards(container);
    const count=Math.max(1,cards.length);
    const compact=window.innerWidth<=1180;
    important(container,"display","grid");
    important(container,"grid-template-columns",compact?"repeat(auto-fit,minmax(180px,1fr))":`repeat(${count},minmax(0,1fr))`);
    important(container,"grid-auto-rows",compact?"minmax(78px,auto)":"78px");
    important(container,"height",compact?"auto":"78px");
    important(container,"min-height",compact?"0px":"78px");
    important(container,"max-height",compact?"none":"78px");
    important(container,"margin","0px 0px 10px");
    cards.forEach(card=>{
      card.classList.add("db72MetricCard");
      important(card,"display","grid");
      important(card,"grid-template-columns","40px minmax(0,1fr)");
      important(card,"grid-template-rows","auto auto");
      important(card,"height",compact?"auto":"78px");
      important(card,"min-height","78px");
      important(card,"max-height",compact?"none":"78px");
      important(card,"margin","0px");
      const icon=card.querySelector(":scope > .metricIconDB47");
      if(icon){
        important(icon,"position","static");
        important(icon,"inset","auto");
        important(icon,"transform","none");
        important(icon,"grid-column","1");
        important(icon,"grid-row","1 / 3");
        important(icon,"place-self","center");
        important(icon,"margin","0");
      }
      const value=card.querySelector(":scope > strong");
      const label=card.querySelector(":scope > small");
      if(value){
        important(value,"position","static");
        important(value,"grid-column","2");
        important(value,"grid-row","1");
        important(value,"align-self","end");
        important(value,"justify-self","start");
        important(value,"margin","0");
        important(value,"transform","none");
        important(value,"text-align","left");
      }
      if(label){
        important(label,"position","static");
        important(label,"grid-column","2");
        important(label,"grid-row","2");
        important(label,"align-self","start");
        important(label,"justify-self","start");
        important(label,"margin","0");
        important(label,"transform","none");
        important(label,"text-align","left");
      }
      const delta=card.querySelector(":scope > .metricDelta");
      if(delta)delta.hidden=true;
    });
  }

  function syncMetrics(){
    METRICS.forEach(syncMetricContainer);
  }

  function activateSettingsSection(workspace,name,{persist=true}={}){
    const buttons=[...workspace.querySelectorAll(".sectionWorkspaceTabs>[data-section-target]")];
    const panels=[...workspace.querySelectorAll(".sectionWorkspaceContent>[data-section-panel]")];
    const selected=buttons.find(button=>button.dataset.sectionTarget===name)||buttons[0];
    if(!selected)return;
    const active=selected.dataset.sectionTarget;
    buttons.forEach((button,index)=>{
      const isActive=button===selected;
      if(!button.id)button.id=`settings-db72-tab-${index+1}`;
      button.classList.toggle("isActive",isActive);
      if(button.getAttribute("aria-selected")!==String(isActive))button.setAttribute("aria-selected",String(isActive));
      button.tabIndex=isActive?0:-1;
    });
    panels.forEach(panel=>{
      const isActive=panel.dataset.sectionPanel===active;
      if(panel.hidden===isActive)panel.hidden=!isActive;
      if(panel.getAttribute("aria-hidden")!==String(!isActive))panel.setAttribute("aria-hidden",String(!isActive));
      panel.style.setProperty("display",isActive?"block":"none","important");
      const controller=buttons.find(button=>button.dataset.sectionTarget===panel.dataset.sectionPanel);
      if(controller&&panel.getAttribute("aria-labelledby")!==controller.id)panel.setAttribute("aria-labelledby",controller.id);
    });
    if(persist){
      try{localStorage.setItem("maxdock-db72-settings-section",active)}catch(_error){}
    }
  }

  async function runSettingsAction(kind,source){
    const buttons=[...document.querySelectorAll(`[data-settings-action="${kind}"]`)];
    const original=source.textContent;
    buttons.forEach(button=>button.disabled=true);
    source.textContent=kind==="save"?"Saving…":"Loading…";
    try{
      const action=kind==="save"?window.saveSettings:window.resetSettings;
      if(typeof action==="function")await action();
    }finally{
      buttons.forEach(button=>button.disabled=false);
      source.textContent=original;
    }
  }

  function ensureSettingsActions(panel){
    let actions=panel.querySelector(":scope > .db72SettingsSectionActions");
    if(actions)return actions;
    actions=document.createElement("div");
    actions.className="db72SettingsSectionActions";
    actions.setAttribute("role","group");
    actions.setAttribute("aria-label","Settings actions");
    const save=document.createElement("button");
    save.type="button";
    save.className="greenBtn";
    save.dataset.settingsAction="save";
    save.textContent="Save Settings";
    const reset=document.createElement("button");
    reset.type="button";
    reset.className="secondaryBtn destructiveSecondary";
    reset.dataset.settingsAction="reset";
    reset.textContent="Reset Defaults";
    save.addEventListener("click",()=>runSettingsAction("save",save));
    reset.addEventListener("click",()=>runSettingsAction("reset",reset));
    actions.append(save,reset);
    panel.appendChild(actions);
    return actions;
  }

  function normalizeSettings(){
    if(PAGE!=="settings")return;
    document.querySelector(".pageHead>.compactPageActions")?.classList.add("db72LegacySettingsActions");
    const unsaved=$("settingsUnsavedBar");
    if(unsaved)unsaved.classList.add("db72SettingsUnsavedBar");
    const workspace=document.querySelector(".settingsWorkspace");
    if(!workspace)return;
    workspace.classList.add("db72SettingsWorkspace");
    const buttons=[...workspace.querySelectorAll(".sectionWorkspaceTabs>[data-section-target]")];
    const panels=[...workspace.querySelectorAll(".sectionWorkspaceContent>[data-section-panel]")];
    panels.forEach(ensureSettingsActions);
    buttons.forEach(button=>{
      if(button.dataset.db72SettingsBound)return;
      button.dataset.db72SettingsBound="true";
      button.addEventListener("click",event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        activateSettingsSection(workspace,button.dataset.sectionTarget);
      },true);
    });
    let initial=buttons.find(button=>button.getAttribute("aria-selected")==="true")?.dataset.sectionTarget
      ||workspace.dataset.defaultSection
      ||buttons[0]?.dataset.sectionTarget;
    try{initial=localStorage.getItem("maxdock-db72-settings-section")||initial}catch(_error){}
    activateSettingsSection(workspace,initial,{persist:false});
  }

  function hidePreferenceWarnings(){
    document.querySelectorAll(".dashboardCustomizeMenu .preferenceSyncStatus,.queueCustomizeMenu .preferenceSyncStatus,.db64ReportCustomizeMenu .preferenceSyncStatus,.myAppointmentsCustomizeMenuDB65 .preferenceSyncStatus")
      .forEach(status=>{status.hidden=true;status.setAttribute("aria-hidden","true")});
  }

  function normalize(){
    document.body.classList.add("db72Consistency");
    normalizeDocumentActions();
    normalizeDashboard();
    normalizeQueue();
    normalizeReports();
    normalizeMyAppointments();
    normalizeSettings();
    hidePreferenceWarnings();
    syncMetrics();
  }

  function queueNormalize(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      normalize();
    });
  }

  function installObservers(){
    document.querySelectorAll(".dashboardFilters,.queueFilters,.reportFilters,.myAppointmentsBookingBarDB52")
      .forEach(toolbar=>{
        if(toolbar.dataset.db72Observed)return;
        toolbar.dataset.db72Observed="true";
        new window.MaxDockSharedMutationObserver(queueNormalize).observe(toolbar,{childList:true,subtree:false});
      });
    METRICS.forEach(({container})=>{
      const element=$(container);
      if(!element||element.dataset.db72Observed)return;
      element.dataset.db72Observed="true";
      new window.MaxDockSharedMutationObserver(queueNormalize).observe(element,{
        childList:true,
        subtree:false,
        attributes:true,
        attributeFilter:["hidden","class","style"]
      });
    });
    const settings=document.querySelector(".settingsWorkspace");
    if(settings&&!settings.dataset.db72Observed){
      settings.dataset.db72Observed="true";
      new window.MaxDockSharedMutationObserver(queueNormalize).observe(settings,{
        childList:true,
        subtree:true,
        attributes:true,
        attributeFilter:["hidden","aria-selected"]
      });
    }
  }

  function initialize(){
    normalize();
    installObservers();
    [60,180,420,850,1500,3200].forEach(delay=>setTimeout(()=>{
      normalize();
      installObservers();
    },delay));
    document.addEventListener("change",event=>{
      if(event.target.matches("#dashboardShowMetrics,#myAppointmentsShowMetricsDB65,#queueShowMetrics,#db64ReportShowMetrics,input[type='checkbox']")){
        queueNormalize();
      }
    },true);
    document.addEventListener("toggle",event=>{
      const details=event.target.closest?.(".db72Gear");
      const summary=details?.querySelector(":scope > summary");
      if(summary)summary.setAttribute("aria-expanded",String(details.open));
    },true);
    window.addEventListener("resize",queueNormalize,{passive:true});
  }

  window.MaxDockDB72Consistency={normalize,installObservers};
  initialize();
})();

/* Consolidated from maxdock-db70.js. */
(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const $=id=>document.getElementById(id);
  const EXPORT_ICON=window.MAXDOCK_ICONS?.export||"";
  const PRINT_ICON=window.MAXDOCK_ICONS?.print||"";
  let queued=false;

  function orderChildren(parent,ordered){
    if(!parent)return;
    ordered.filter(Boolean).forEach((element,index)=>{
      if(element.parentElement!==parent||parent.children[index]!==element){
        parent.insertBefore(element,parent.children[index]||null);
      }
    });
  }

  function legacyDocumentButtons(){
    return [...new Set([
      ...document.querySelectorAll(".dashboardUtilityActions > button"),
      ...document.querySelectorAll(".pageUtilityActions > button"),
      $("exportQueue"),$("printQueue"),$("exportReport")
    ].filter(Boolean))].filter(button=>!button.closest("#maxdockDocumentTools"));
  }

  function markLegacyDocumentButtons(){
    legacyDocumentButtons().forEach(button=>{
      button.classList.add("db70LegacyDocumentAction");
      button.setAttribute("aria-hidden","true");
      button.tabIndex=-1;
    });
    document.querySelectorAll(".pageUtilityActions").forEach(group=>group.classList.add("db70LegacyDocumentGroup"));
  }

  function csvCell(value){
    return `"${String(value??"").replace(/"/g,'""').replace(/\s+/g," ").trim()}"`;
  }

  function downloadCsv(rows){
    const content=rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
    const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    const locationName=window.MaxDockDB?.getCurrentLocation?.()?.name||"all-locations";
    const slug=value=>String(value||"maxdock").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    link.href=url;
    link.download=`maxdock-${slug(PAGE)}-${slug(locationName)}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function genericPageExport(){
    const rows=[];
    const tables=[...document.querySelectorAll("main table")].filter(table=>{
      const style=getComputedStyle(table);
      return !table.hidden&&style.display!=="none"&&style.visibility!=="hidden";
    });
    tables.forEach((table,index)=>{
      if(index)rows.push([]);
      const heading=table.closest("section,.panel")?.querySelector("h2,h3")?.textContent?.trim();
      if(heading)rows.push([heading]);
      table.querySelectorAll("tr").forEach(row=>{
        const cells=[...row.querySelectorAll("th,td")].map(cell=>cell.innerText.trim());
        if(cells.length)rows.push(cells);
      });
    });
    if(!rows.length){
      rows.push(["Field","Value"]);
      document.querySelectorAll("main label[for]").forEach(label=>{
        const control=$(label.htmlFor);
        if(!control||control.disabled||control.type==="password")return;
        const value=control.tagName==="SELECT"?control.selectedOptions[0]?.textContent:control.value;
        rows.push([label.textContent.trim(),value||""]);
      });
    }
    if(rows.length<2){
      rows.push(
        ["Page",document.querySelector(".pageHead h2,main h2")?.textContent||PAGE||"MaxDock"],
        ["Location",window.MaxDockDB?.getCurrentLocation?.()?.name||""],
        ["Exported",new Date().toLocaleString()]
      );
    }
    downloadCsv(rows);
  }

  function performExport(){
    if(PAGE==="dashboard"&&typeof window.exportCSV==="function"){
      window.exportCSV();
      return;
    }
    if(PAGE==="queue"&&typeof window.maxdockExportQueue==="function"){
      window.maxdockExportQueue();
      return;
    }
    if(PAGE==="reports"&&typeof window.maxdockExportReport==="function"){
      window.maxdockExportReport();
      return;
    }
    const legacy=PAGE==="queue"?$("exportQueue"):PAGE==="reports"?$("exportReport"):null;
    if(legacy){
      legacy.click();
      return;
    }
    genericPageExport();
  }

  function alignDocumentTools(){
    const tools=$("maxdockDocumentTools");
    const signOut=document.querySelector("#maxdockAccount .accountSignOut");
    if(!tools||!signOut)return;
    const rect=signOut.getBoundingClientRect();
    tools.style.setProperty("--db70-document-tools-width",`${Math.max(88,Math.round(rect.width))}px`);
  }

  function ensureDocumentTools(){
    if(["login","setpassword"].includes(PAGE))return;
    const pageHead=document.querySelector("main .pageHead");
    const signOut=document.querySelector("#maxdockAccount .accountSignOut");
    if(!pageHead||!signOut)return;
    let row=$("maxdockDocumentUtilityRow");
    if(!row){
      row=document.createElement("div");
      row.id="maxdockDocumentUtilityRow";
      row.className="maxdockDocumentUtilityRow maxdockTitleDocumentActions";
      row.setAttribute("aria-label","Page document actions");
      const tools=document.createElement("div");
      tools.id="maxdockDocumentTools";
      tools.className="maxdockDocumentTools";
      const exportButton=document.createElement("button");
      exportButton.id="maxdockGlobalExport";
      exportButton.type="button";
      exportButton.className="maxdockDocumentIcon";
      exportButton.title="Export this page to CSV";
      exportButton.setAttribute("aria-label","Export this page to CSV");
      exportButton.innerHTML=EXPORT_ICON;
      exportButton.addEventListener("click",performExport);
      const printButton=document.createElement("button");
      printButton.id="maxdockGlobalPrint";
      printButton.type="button";
      printButton.className="maxdockDocumentIcon";
      printButton.title="Print this page";
      printButton.setAttribute("aria-label","Print this page");
      printButton.innerHTML=PRINT_ICON;
      printButton.addEventListener("click",()=>window.print());
      tools.append(exportButton,printButton);
      row.appendChild(tools);
    }
    if(row.parentElement!==pageHead)pageHead.appendChild(row);
    alignDocumentTools();
  }

  function rightHost(toolbar,className,label){
    let host=toolbar?.querySelector(`:scope > .${className}`);
    if(!host&&toolbar){
      host=document.createElement("div");
      host.className=`db70RightActions ${className}`;
      host.setAttribute("role","group");
      host.setAttribute("aria-label",label);
      toolbar.appendChild(host);
    }
    return host;
  }

  function normalizeDashboard(){
    if(PAGE!=="dashboard")return;
    const toolbar=document.querySelector(".dashboardFilters");
    if(!toolbar)return;
    toolbar.classList.add("db70ControlBar");
    const date=$("adminDate")?.closest(".db69FieldPair,.filterField");
    const status=$("adminStatus")?.closest(".db69FieldPair,.filterField");
    const primary=document.querySelector(".dashboardPrimaryActions");
    const range=$("dashboardRange")?.closest(".db69FieldPair,.rangeMetric,.dashboardRangeHost");
    const refresh=$("refreshDashboard");
    const gear=document.querySelector("#dashboardCustomize,.dashboardCustomize");
    if(primary)primary.classList.add("db70PrimaryActions");
    if(gear){
      gear.classList.add("db70ToolbarGear");
      toolbar.appendChild(gear);
    }
    orderChildren(toolbar,[date,status,primary,range,refresh,gear]);
  }

  function normalizeQueue(){
    if(PAGE!=="queue")return;
    const toolbar=document.querySelector(".queueFilters");
    if(!toolbar)return;
    toolbar.classList.add("db70ControlBar");
    const date=$("queueDate")?.closest(".db69FieldPair,.filterField");
    const status=$("queueStatus")?.closest(".db69FieldPair,.filterField");
    const quick=document.querySelector(".queueFilterActions");
    const right=toolbar.querySelector(":scope > .db69QueueRightActions")||rightHost(toolbar,"db70QueueRightActions","Queue display actions");
    const display=$("openQueueDisplay");
    const gear=$("queueCustomize");
    if(right){
      if(display)right.appendChild(display);
      if(gear){gear.classList.add("db70ToolbarGear");right.appendChild(gear)}
    }
    orderChildren(toolbar,[date,status,quick,right]);
  }

  function normalizeReports(){
    if(PAGE!=="reports")return;
    const toolbar=document.querySelector(".reportFilters");
    if(!toolbar)return;
    toolbar.classList.add("db70ControlBar");
    const view=$("reportView")?.closest(".db69FieldPair,.filterField");
    const preset=$("reportPreset")?.closest(".db69FieldPair,.filterField");
    const custom=$("reportCustomDates");
    const update=$("runReport");
    const right=toolbar.querySelector(":scope > .db69ReportRightActions")||rightHost(toolbar,"db70ReportRightActions","Report display options");
    const gear=$("db64ReportCustomize");
    if(right&&gear){gear.classList.add("db70ToolbarGear");right.appendChild(gear)}
    orderChildren(toolbar,[view,preset,custom,update,right]);
  }

  function enforceLocationContract(){
    const db=window.MaxDockDB;
    const role=db?.getProfile?.()?.role_code;
    if(!role)return;
    const operational=db.isOperationalRole?.(role)||false;
    const systemAdmin=role==="system_admin";
    document.body.classList.toggle("operationalLocation",operational);
    document.body.classList.toggle("systemAdminLocation",systemAdmin);
    document.body.classList.toggle("fixedOperationalLocation",operational&&!systemAdmin);
    document.querySelectorAll(".headerActions .locationPill").forEach(pill=>{
      pill.hidden=false;
      pill.classList.toggle("locationPlaceholder",!operational);
      pill.setAttribute("aria-hidden",String(!operational));
      pill.style.setProperty("display","flex","important");
      pill.style.setProperty("visibility",operational?"visible":"hidden","important");
      const select=pill.querySelector("select");
      if(!select)return;
      select.disabled=!systemAdmin||!operational;
      select.setAttribute("aria-disabled",String(!systemAdmin||!operational));
      select.title=systemAdmin?"Choose the active MaxDock location":`Assigned location: ${select.value}`;
    });
  }

  function protectReportMetrics(){
    if(PAGE!=="reports")return;
    const metrics=$("reportMetrics");
    if(!metrics||metrics.hidden||metrics.classList.contains("metricsDashboardHidden"))return;
    const cards=[...metrics.children].filter(card=>!card.hidden&&getComputedStyle(card).display!=="none");
    const compact=window.innerWidth<1500;
    metrics.style.setProperty("grid-template-columns",compact?"repeat(auto-fit,minmax(170px,1fr))":`repeat(${Math.max(1,cards.length)},minmax(0,1fr))`,"important");
    metrics.style.setProperty("height","auto","important");
    metrics.style.setProperty("min-height","104px","important");
    metrics.style.setProperty("max-height","none","important");
    cards.forEach(card=>{
      card.style.setProperty("height","104px","important");
      card.style.setProperty("min-height","104px","important");
      card.style.setProperty("max-height","104px","important");
    });
  }

  function ensureQueueControls(){
    if(PAGE!=="queue")return;
    const display=$("openQueueDisplay");
    if(display){
      display.disabled=false;
      display.removeAttribute("aria-disabled");
    }
    const details=$("queueCustomize");
    const summary=details?.querySelector(":scope > summary");
    if(!details||!summary||summary.dataset.db71QueueSettingsBound)return;
    summary.dataset.db71QueueSettingsBound="true";
    summary.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      details.open=!details.open;
      summary.setAttribute("aria-expanded",String(details.open));
    });
    details.addEventListener("toggle",()=>{
      summary.setAttribute("aria-expanded",String(details.open));
    });
  }

  function apply(){
    document.body.classList.add("db70Consistency");
    markLegacyDocumentButtons();
    normalizeDashboard();
    normalizeQueue();
    normalizeReports();
    enforceLocationContract();
    ensureDocumentTools();
    ensureQueueControls();
    protectReportMetrics();
  }

  function queueApply(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      apply();
    });
  }

  function init(){
    apply();
    [80,220,500,1000,1900,3000].forEach(delay=>setTimeout(apply,delay));
    window.addEventListener("resize",queueApply,{passive:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

/* DB72 deliberately runs after every consolidated legacy module so the current
   release remains the final authority when older compatibility code also moves
   the shared controls. */
(function(){
  "use strict";
  function finalize(){
    window.MaxDockDB72Consistency?.normalize();
    window.MaxDockDB72Consistency?.installObservers();
  }
  finalize();
  [100,360,900,1800,3400].forEach(delay=>setTimeout(finalize,delay));
})();
