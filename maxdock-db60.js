(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const db=window.MaxDockDB;
  const TARGET_ID=PAGE==="dashboard"?"metrics":PAGE==="myappointments"?"myAppointmentMetrics":"";
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
  let preferencesLoaded=false;
  let queued=false;

  const sleep=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const $=id=>document.getElementById(id);

  function important(element,property,value){
    if(!element)return;
    if(element.style.getPropertyValue(property)===value&&element.style.getPropertyPriority(property)==="important")return;
    element.style.setProperty(property,value,"important");
  }

  function profileKey(name){
    const profile=db?.getProfile?.();
    const id=profile?.id||profile?.username||"user";
    return `maxdock_db60_${name}_${id}`;
  }

  function metricKey(label){
    const normalized=String(label||"").trim().toLowerCase().replace(/\s+/g,"-");
    return APPOINTMENT_METRICS.some(item=>item.key===normalized)?normalized:"";
  }

  function visibleAppointmentCards(container){
    return [...container.querySelectorAll(":scope > .metric")].filter(card=>!card.hidden);
  }

  function enforceCard(card,compact){
    const height=compact?"76px":"80px";
    const iconSize=compact?"42px":"44px";
    const iconGlyph=compact?"22px":"23px";

    card.classList.add("spaciousMetricCardDB60");
    important(card,"box-sizing","border-box");
    important(card,"position","relative");
    important(card,"display","grid");
    important(card,"grid-template-columns",`${iconSize} minmax(0,1fr)`);
    important(card,"grid-template-rows","auto auto");
    important(card,"column-gap","10px");
    important(card,"row-gap","1px");
    important(card,"align-content","center");
    important(card,"align-items","center");
    important(card,"width","100%");
    important(card,"min-width","0");
    important(card,"height",height);
    important(card,"min-height",height);
    important(card,"max-height",height);
    important(card,"margin","0");
    important(card,"padding",compact?"9px 10px":"12px 12px");
    important(card,"overflow","hidden");

    const icon=card.querySelector(":scope > .metricIconDB47");
    important(icon,"position","static");
    important(icon,"inset","auto");
    important(icon,"grid-column","1");
    important(icon,"grid-row","1 / 3");
    important(icon,"align-self","center");
    important(icon,"justify-self","start");
    important(icon,"display","grid");
    important(icon,"width",iconSize);
    important(icon,"height",iconSize);
    important(icon,"min-width",iconSize);
    important(icon,"min-height",iconSize);
    important(icon,"margin","0");
    important(icon,"place-items","center");
    important(icon,"border-radius","11px");
    const svg=icon?.querySelector("svg");
    important(svg,"width",iconGlyph);
    important(svg,"height",iconGlyph);

    const number=card.querySelector(":scope > strong");
    important(number,"grid-column","2");
    important(number,"grid-row","1");
    important(number,"align-self","end");
    important(number,"justify-self","start");
    important(number,"display","block");
    important(number,"width","100%");
    important(number,"min-width","0");
    important(number,"height","auto");
    important(number,"min-height","0");
    important(number,"margin","0");
    important(number,"overflow","visible");
    important(number,"font-size","22px");
    important(number,"font-weight","780");
    important(number,"line-height","1");
    important(number,"letter-spacing","-.4px");
    important(number,"text-align","left");

    const label=card.querySelector(":scope > small");
    important(label,"grid-column","2");
    important(label,"grid-row","2");
    important(label,"align-self","start");
    important(label,"justify-self","start");
    important(label,"display","-webkit-box");
    important(label,"width","100%");
    important(label,"min-width","0");
    important(label,"height","auto");
    important(label,"min-height","0");
    important(label,"max-height","30px");
    important(label,"margin","0");
    important(label,"overflow","hidden");
    important(label,"font-size",compact?"12px":"13px");
    important(label,"font-weight","700");
    important(label,"line-height","1.08");
    important(label,"letter-spacing","0");
    important(label,"text-align","left");
    important(label,"text-transform","none");
    important(label,"white-space","normal");
    important(label,"-webkit-box-orient","vertical");
    important(label,"-webkit-line-clamp","2");
  }

  function applyAppointmentSelection(container){
    if(PAGE!=="myappointments")return;
    container.hidden=!showAppointmentMetrics;
    important(container,"display",showAppointmentMetrics?"grid":"none");

    container.querySelectorAll(":scope > .metric").forEach(card=>{
      const key=metricKey(card.querySelector(":scope > small")?.textContent);
      if(key)card.dataset.metricKey=key;
      const visible=Boolean(key&&appointmentSelected.includes(key));
      card.hidden=!visible;
      important(card,"display",visible?"grid":"none");
      important(card,"grid-column-start","auto");
    });

    const visible=visibleAppointmentCards(container);
    if(window.matchMedia("(min-width:1401px)").matches&&visible.length){
      const offset=Math.floor((7-visible.length)/2)+1;
      important(visible[0],"grid-column-start",String(Math.max(1,offset)));
    }
    syncAppointmentControls();
  }

  function enforceMetrics(){
    document.body.classList.add("kpiSpacingDB60");
    if(!TARGET_ID)return false;
    const container=$(TARGET_ID);
    if(!container)return false;
    const compact=window.matchMedia("(max-width:760px)").matches;
    const single=window.matchMedia("(max-width:440px)").matches;
    const wide=window.matchMedia("(min-width:1401px)").matches;
    const height=compact?"76px":"80px";
    const columns=single?"1fr":compact?"repeat(2,minmax(0,1fr))":wide?"repeat(7,minmax(0,1fr))":"repeat(auto-fit,minmax(160px,1fr))";

    container.classList.add("spaciousMetricsGridDB60");
    important(container,"box-sizing","border-box");
    important(container,"display","grid");
    important(container,"grid-template-columns",columns);
    important(container,"grid-auto-rows",height);
    important(container,"align-items","stretch");
    important(container,"gap","8px");
    important(container,"width","100%");
    important(container,"height","auto");
    important(container,"min-height","0");
    important(container,"max-height","none");
    important(container,"margin","0 0 10px");
    important(container,"overflow","visible");

    container.querySelectorAll(":scope > .metric").forEach(card=>enforceCard(card,compact));
    applyAppointmentSelection(container);
    return true;
  }

  function syncAppointmentControls(){
    const menu=$("myAppointmentsCustomizeMenuDB60");
    if(!menu)return;
    menu.querySelectorAll('input[data-db60-metric]').forEach(input=>{
      input.checked=appointmentSelected.includes(input.value);
      input.disabled=input.checked&&appointmentSelected.length<=1;
    });
    const visibility=$("myAppointmentsShowMetricsDB60");
    if(visibility)visibility.checked=showAppointmentMetrics;
  }

  function updatePreferenceStatus(message,state){
    const status=$("myAppointmentsPreferenceStatusDB60");
    if(!status)return;
    status.textContent=message;
    status.dataset.status=state||"saved";
  }

  function saveAppointmentPreferences(){
    try{localStorage.setItem(profileKey("appointment_metrics"),JSON.stringify(appointmentSelected))}catch(_ignored){}
    try{localStorage.setItem(profileKey("appointment_metrics_visible"),String(showAppointmentMetrics))}catch(_ignored){}
    if(db?.queuePreferenceSave){
      updatePreferenceStatus("Saving…","saving");
      db.queuePreferenceSave("my-appointments-density",{metrics:appointmentSelected,showMetrics:showAppointmentMetrics},(message,state)=>{
        updatePreferenceStatus(message||"Saved to your login",state);
      });
    }else updatePreferenceStatus("Saved on this device","local");
  }

  async function loadAppointmentPreferences(){
    let selected=[...APPOINTMENT_DEFAULT];
    let showMetrics=true;
    try{
      const local=JSON.parse(localStorage.getItem(profileKey("appointment_metrics"))||"[]");
      if(Array.isArray(local)&&local.length)selected=local;
      showMetrics=localStorage.getItem(profileKey("appointment_metrics_visible"))!=="false";
    }catch(_ignored){}
    if(db?.loadPreference){
      try{
        const saved=await db.loadPreference("my-appointments-density",{metrics:selected,showMetrics});
        if(Array.isArray(saved?.metrics)&&saved.metrics.length)selected=saved.metrics;
        showMetrics=saved?.showMetrics!==false;
      }catch(_ignored){}
    }
    appointmentSelected=selected.filter(key=>APPOINTMENT_METRICS.some(item=>item.key===key));
    if(!appointmentSelected.length)appointmentSelected=[...APPOINTMENT_DEFAULT];
    showAppointmentMetrics=showMetrics;
    preferencesLoaded=true;
    enforceMetrics();
    updatePreferenceStatus("Saved to your login","saved");
  }

  function ensureAppointmentCustomize(){
    if(PAGE!=="myappointments")return null;
    const bar=document.querySelector(".myAppointmentsBookingBarDB52");
    if(!bar)return null;
    let customize=$("myAppointmentsCustomizeDB60");
    if(customize)return customize;

    customize=document.createElement("details");
    customize.id="myAppointmentsCustomizeDB60";
    customize.className="myAppointmentsCustomizeDB60";
    customize.innerHTML=`
      <summary title="Customize appointment KPIs" aria-label="Customize appointment KPIs">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A8 8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>
      </summary>
      <div class="myAppointmentsCustomizeMenuDB60" id="myAppointmentsCustomizeMenuDB60">
        <fieldset>
          <legend>Appointment KPIs</legend>
          <div class="myAppointmentsMetricOptionsDB60">
            ${APPOINTMENT_METRICS.map(item=>`<label><input type="checkbox" data-db60-metric value="${item.key}" checked>${item.label}</label>`).join("")}
          </div>
        </fieldset>
        <fieldset>
          <legend>Dashboard display</legend>
          <label class="myAppointmentsPreferenceWideDB60"><input id="myAppointmentsShowMetricsDB60" type="checkbox" checked>Show KPI dashboard</label>
        </fieldset>
        <button class="secondaryBtn utilityBtn" id="resetMyAppointmentsPreferencesDB60" type="button">Reset default view</button>
        <small class="preferenceSyncStatus" id="myAppointmentsPreferenceStatusDB60" data-status="saved">Saved to your login</small>
      </div>`;
    bar.appendChild(customize);

    customize.addEventListener("change",event=>{
      const input=event.target.closest('input[type="checkbox"]');
      if(!input)return;
      if(input.id==="myAppointmentsShowMetricsDB60"){
        showAppointmentMetrics=input.checked;
      }else if(input.matches("[data-db60-metric]")){
        const next=new Set(appointmentSelected);
        if(input.checked)next.add(input.value);
        else{
          if(next.size<=1){input.checked=true;return}
          next.delete(input.value);
        }
        appointmentSelected=[...next];
      }
      saveAppointmentPreferences();
      enforceMetrics();
    });

    $("resetMyAppointmentsPreferencesDB60")?.addEventListener("click",()=>{
      appointmentSelected=[...APPOINTMENT_DEFAULT];
      showAppointmentMetrics=true;
      saveAppointmentPreferences();
      enforceMetrics();
    });

    document.addEventListener("click",event=>{
      if(customize.open&&!customize.contains(event.target))customize.open=false;
    });
    syncAppointmentControls();
    return customize;
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      ensureAppointmentCustomize();
      enforceMetrics();
    });
  }

  async function initializeAppointmentPreferences(){
    if(PAGE!=="myappointments")return;
    for(let attempt=0;attempt<100;attempt++){
      if(db?.getProfile?.()?.id&&$("myAppointmentMetrics")?.children.length)break;
      await sleep(100);
    }
    await loadAppointmentPreferences();
  }

  function initialize(){
    ensureAppointmentCustomize();
    enforceMetrics();
    const container=$(TARGET_ID);
    if(container)new MutationObserver(schedule).observe(container,{childList:true});
    window.addEventListener("resize",schedule,{passive:true});
    [50,150,350,700,1200,2200,3000].forEach(delay=>window.setTimeout(schedule,delay));
    initializeAppointmentPreferences().catch(()=>{
      preferencesLoaded=true;
      enforceMetrics();
      updatePreferenceStatus("Saved on this device","local");
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
