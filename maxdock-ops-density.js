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
  const DASHBOARD_MAX=6;

  function metricKeyFromLabel(label){
    const normalized=String(label||"").trim().toLowerCase().replace(/\s+/g,"-");
    return DASHBOARD_METRICS.some(item=>item.key===normalized)?normalized:"";
  }

  async function loadDashboardSelection(){
    let selected=[];
    try{
      const local=JSON.parse(localStorage.getItem(profileKey("dashboard_metrics"))||"[]");
      if(Array.isArray(local))selected=local;
    }catch(_ignored){}
    if(db?.loadPreference){
      try{
        const saved=await db.loadPreference("dashboard-density",{metrics:selected.length?selected:DASHBOARD_DEFAULT});
        if(Array.isArray(saved?.metrics))selected=saved.metrics;
      }catch(_ignored){}
    }
    selected=selected.filter(key=>DASHBOARD_METRICS.some(item=>item.key===key)).slice(0,DASHBOARD_MAX);
    return selected.length?selected:[...DASHBOARD_DEFAULT];
  }

  function saveDashboardSelection(selected){
    try{localStorage.setItem(profileKey("dashboard_metrics"),JSON.stringify(selected))}catch(_ignored){}
    const status=$("dashboardPreferenceStatus");
    if(db?.queuePreferenceSave){
      db.queuePreferenceSave("dashboard-density",{metrics:selected},(message,state)=>{
        if(!status)return;
        status.textContent=message||"This view is saved to your login.";
        status.dataset.status=state||"saved";
      });
    }else if(status){
      status.textContent="This view is saved on this device.";
    }
  }

  async function initializeDashboardDensity(){
    const ready=await waitFor(()=>$("metrics")&&document.querySelector(".dashboardFilters")&&$("adminDate"));
    if(!ready)return;

    const metrics=$("metrics");
    const filters=document.querySelector(".dashboardFilters");
    const parent=metrics.parentElement;
    let selected=await loadDashboardSelection();
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
      customize.innerHTML=`<summary>Customize</summary><div class="dashboardCustomizeMenu"><strong>Dashboard metrics</strong><div class="dashboardCustomizeOptions">${DASHBOARD_METRICS.map(item=>`<label><input type="checkbox" value="${item.key}">${item.label}</label>`).join("")}</div><small>Choose one to six metrics. The operational default shows five.</small></div>`;
      const note=filters.querySelector(".viewPreferenceNote");
      filters.insertBefore(customize,note||null);
    }

    const syncControls=()=>{
      customize.querySelectorAll('input[type="checkbox"]').forEach(input=>{
        input.checked=selected.includes(input.value);
        input.disabled=!input.checked&&selected.length>=DASHBOARD_MAX;
      });
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
        syncControls();
      }finally{
        applying=false;
      }
    };

    customize.addEventListener("change",event=>{
      const input=event.target.closest('input[type="checkbox"]');
      if(!input)return;
      const next=new Set(selected);
      if(input.checked){
        if(next.size>=DASHBOARD_MAX){input.checked=false;return}
        next.add(input.value);
      }else{
        if(next.size<=1){input.checked=true;return}
        next.delete(input.value);
      }
      selected=[...next];
      saveDashboardSelection(selected);
      applyMetrics();
    });

    document.addEventListener("click",event=>{
      if(customize.open&&!customize.contains(event.target))customize.open=false;
    });

    const observer=new MutationObserver(()=>window.requestAnimationFrame(applyMetrics));
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
    const ready=await waitFor(()=>document.querySelector(".queuePageHead")&&document.querySelector(".queueFilters")&&$("queueCustomizeMenu")&&$("queueMetrics"));
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

    const metricObserver=new MutationObserver(queueMetricCount);
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
