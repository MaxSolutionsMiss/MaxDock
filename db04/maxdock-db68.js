(function(){
  "use strict";
  const PAGE=document.body.dataset.page||"";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const VERSION="89-db68";

  const ICONS={
    appointments:'<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/>',
    scheduled:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    completed:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
    priority:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
    'open-slots':'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h2m4 0h2M8 12h2m4 0h2M8 16h2m4 0h2"/>',
    'inbound-skids':'<path d="M12 4v15m0 0-5-5m5 5 5-5"/>',
    'outbound-skids':'<path d="M12 20V5m0 0-5 5m5-5 5 5"/>',
    upcoming:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'all-bookings':'<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/>',
    past:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5H8"/>',
    cancelled:'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    'unread-notices':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8.5 11h5"/>',
    pending:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    inbound:'<path d="M12 4v15m0 0-5-5m5 5 5-5"/>',
    outbound:'<path d="M12 20V5m0 0-5 5m5-5 5 5"/>',
    skids:'<path d="m5 8 7-4 7 4-7 4-7-4Zm0 4 7 4 7-4m-14 4 7 4 7-4"/>',
    blocks:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m9 9 6 6m0-6-6 6"/>',
    soon:'<path d="M12 4 3 20h18L12 4Zm0 6v4m0 3h.01"/>',
    'active-trucks':'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    'cancellation-rate':'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    'booked-hours':'<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/>',
    'occupied-capacity':'<path d="M5 19V9m5 10V5m5 14v-7m4 7V3"/>',
    'blocked-hours':'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m9 9 6 6m0-6-6 6"/>'
  };
  const TONES={
    appointments:"blue",scheduled:"cyan",completed:"green",priority:"amber","open-slots":"teal","inbound-skids":"cyan","outbound-skids":"blue",
    upcoming:"cyan","all-bookings":"blue",past:"green",cancelled:"red","unread-notices":"amber",
    pending:"amber",inbound:"cyan",outbound:"blue",skids:"purple",blocks:"slate",soon:"red",
    "active-trucks":"teal","cancellation-rate":"red","booked-hours":"blue","occupied-capacity":"green","blocked-hours":"slate"
  };
  const NAV_ICONS={
    "my-appointments":'<path d="M7 3v3M17 3v3M4 9h16M5 5h14v15H4V5h1"/>',
    queue:'<path d="M5 6h14M5 12h14M5 18h14M8 4v4m8 2v4m-8 2v4"/>',
    reports:'<path d="M5 19V9m5 10V5m5 14v-7m4 7V3"/>',
    dashboard:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
    settings:'<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 13.5c.1-1 .1-2 0-3l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4L9.6 5A8 8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5a8 8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1A8 8 0 0 0 9.6 19l.4 2.5h4l.4-2.5A8 8 0 0 0 17 17.5l2.4 1 2-3.5-2-1.5Z"/>',
    admin:'<path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20m6-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1v6m-3-3h6"/>',
    data:'<path d="M12 3c5 0 8 1.3 8 3s-3 3-8 3-8-1.3-8-3 3-3 8-3Zm-8 3v6c0 1.7 3 3 8 3s8-1.3 8-3V6m-16 6v6c0 1.7 3 3 8 3s8-1.3 8-3v-6"/>'
  };

  const key=value=>String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const routeOf=link=>{try{return (new URL(link.href,location.href).pathname.split("/").pop()||"").replace(/\.html$/i,"")}catch{return ""}};
  const profileKey=()=>db?.getProfile?.()?.id||db?.getProfile?.()?.username||"user";
  const localKey=name=>`maxdock_db68_${name}_${profileKey()}`;

  async function waitFor(test,timeout=8000){
    const start=Date.now();
    while(Date.now()-start<timeout){const value=test();if(value)return value;await sleep(100)}
    return null;
  }

  function allowedRoutes(role){
    if(role==="system_admin")return new Set(["my-appointments","queue","reports","dashboard","settings","admin","data"]);
    if(role==="site_admin")return new Set(["my-appointments","queue","reports","dashboard","settings"]);
    if(role==="coordinator"||role==="shipping_manager")return new Set(["my-appointments","queue","reports","dashboard"]);
    return new Set(["my-appointments"]);
  }

  function createSideNav(allowed){
    document.querySelector(".db68SideNav")?.remove();
    if(["login","password"].includes(PAGE))return;
    const source=[...document.querySelectorAll(".menu>a")];
    if(!source.length)return;
    const aside=document.createElement("aside");aside.className="db68SideNav";aside.setAttribute("aria-label","MaxDock navigation");
    const nav=document.createElement("nav");
    source.forEach(link=>{
      const route=routeOf(link);if(!allowed.has(route))return;
      const clone=link.cloneNode(true);clone.removeAttribute("hidden");clone.removeAttribute("aria-hidden");clone.style.removeProperty("display");clone.href=`./${route}.html?v=${VERSION}`;
      if(route==="my-appointments")clone.textContent="Appointments";
      if((PAGE==="myappointments"?"my-appointments":PAGE)===route)clone.setAttribute("aria-current","page");else clone.removeAttribute("aria-current");
      clone.insertAdjacentHTML("afterbegin",`<svg viewBox="0 0 24 24" aria-hidden="true">${NAV_ICONS[route]||NAV_ICONS.dashboard}</svg>`);
      nav.appendChild(clone);
    });
    aside.appendChild(nav);document.body.appendChild(aside);document.body.classList.add("db68HasSideNav");
  }

  function applyRole(profile){
    const role=profile?.role_code||"";const allowed=allowedRoutes(role);const current=PAGE==="myappointments"?"my-appointments":PAGE;
    document.body.classList.toggle("db68SystemAdmin",role==="system_admin");
    document.querySelectorAll(".menu>a").forEach(link=>{const visible=allowed.has(routeOf(link));link.hidden=!visible;link.setAttribute("aria-hidden",String(!visible));});
    document.querySelectorAll(".locationPill").forEach(pill=>pill.hidden=role!=="system_admin");
    createSideNav(allowed);
    if(profile&&!allowed.has(current)&&!["login","password","index"].includes(PAGE)){
      const destination=role==="customer"||role==="vendor"?"my-appointments":"queue";
      location.replace(`./${destination}.html?v=${VERSION}`);
    }
  }

  async function setupRole(){
    const profile=await waitFor(()=>db?.getProfile?.()||document.body.classList.contains("maxdockContextReady")&&db?.getProfile?.(),7000);
    applyRole(profile||null);
  }

  function metricConfig(label){
    const metricKey=key(label);
    let tone=TONES[metricKey]||"blue";
    if(metricKey.includes("cancel"))tone="red";
    if(metricKey.includes("complete")||metricKey.includes("capacity"))tone="green";
    if(metricKey.includes("inbound"))tone="cyan";
    if(metricKey.includes("outbound"))tone="blue";
    return {key:metricKey,tone,icon:ICONS[metricKey]||ICONS.appointments};
  }

  function decorateMetrics(container){
    if(!container)return;
    const cards=[...container.querySelectorAll(":scope>.metric")];
    cards.forEach(card=>{
      const label=card.querySelector("small")?.textContent||"Metric";const cfg=metricConfig(label);
      card.dataset.metricKey=cfg.key;card.dataset.tone=cfg.tone;
      if(!card.querySelector(".db68MetricIcon"))card.insertAdjacentHTML("afterbegin",`<span class="db68MetricIcon"><svg viewBox="0 0 24 24" aria-hidden="true">${cfg.icon}</svg></span>`);
    });
    const visible=cards.filter(card=>!card.hidden&&getComputedStyle(card).display!=="none").length;
    container.style.setProperty("--db68-grid",`repeat(${Math.max(1,visible)},minmax(0,1fr))`);
  }

  const preferenceSets={
    dashboard:{container:"metrics",details:"dashboardCustomize",input:"[data-dashboard-metric]",show:"dashboardShowMetrics",dbKey:"dashboard-density",defaults:["appointments","scheduled","completed","priority","open-slots","inbound-skids","outbound-skids"]},
    appointment:{container:"myAppointmentMetrics",details:"appointmentCustomize",input:"[data-appointment-metric]",show:"appointmentShowMetrics",dbKey:"my-appointments-density",defaults:["upcoming","all-bookings","past","cancelled","unread-notices"]},
    report:{container:"reportMetrics",details:"reportCustomize",input:"[data-report-metric]",show:"reportShowMetrics",dbKey:"reports-density",defaults:["appointments","active-trucks","cancelled","cancellation-rate","booked-hours","occupied-capacity","blocked-hours","inbound-skids","outbound-skids"]}
  };

  async function setupPreferences(name){
    const cfg=preferenceSets[name],container=$(cfg.container),details=$(cfg.details);if(!container||!details)return;
    let selected=[...cfg.defaults],show=true;
    try{const local=JSON.parse(localStorage.getItem(localKey(`${name}_metrics`))||"[]");if(Array.isArray(local)&&local.length)selected=local;show=localStorage.getItem(localKey(`${name}_visible`))!=="false"}catch(_ignored){}
    try{const saved=await db?.loadPreference?.(cfg.dbKey,{metrics:selected,showMetrics:show});if(Array.isArray(saved?.metrics)&&saved.metrics.length)selected=saved.metrics;show=saved?.showMetrics!==false}catch(_ignored){}
    selected=selected.filter(item=>cfg.defaults.includes(item));if(!selected.length)selected=[...cfg.defaults];
    const apply=()=>{
      container.hidden=!show;
      [...container.querySelectorAll(":scope>.metric")].forEach(card=>card.hidden=!selected.includes(card.dataset.metricKey||key(card.querySelector("small")?.textContent)));
      details.querySelectorAll(cfg.input).forEach(input=>{input.checked=selected.includes(input.value);input.disabled=input.checked&&selected.length<=1});
      const showInput=$(cfg.show);if(showInput)showInput.checked=show;
      decorateMetrics(container);
    };
    const save=()=>{
      try{localStorage.setItem(localKey(`${name}_metrics`),JSON.stringify(selected));localStorage.setItem(localKey(`${name}_visible`),String(show))}catch(_ignored){}
      db?.queuePreferenceSave?.(cfg.dbKey,{metrics:selected,showMetrics:show},()=>{});
    };
    details.addEventListener("change",event=>{
      const input=event.target.closest('input[type="checkbox"]');if(!input)return;
      if(input.id===cfg.show)show=input.checked;
      else if(input.matches(cfg.input)){
        const next=new Set(selected);if(input.checked)next.add(input.value);else if(next.size>1)next.delete(input.value);else{input.checked=true;return}selected=[...next];
      }
      save();apply();
    });
    details.querySelector("[data-db68-reset]")?.addEventListener("click",()=>{selected=[...cfg.defaults];show=true;save();apply()});
    const observer=new MutationObserver(()=>requestAnimationFrame(apply));observer.observe(container,{childList:true});
    decorateMetrics(container);apply();
  }

  function setupQueueMetrics(){
    const container=$("queueMetrics");if(!container)return;
    const apply=()=>decorateMetrics(container);new MutationObserver(()=>requestAnimationFrame(apply)).observe(container,{childList:true});apply();
  }

  function setupAdminSummary(){
    if(PAGE!=="admin")return;
    const icons=[ICONS.appointments,ICONS.completed,ICONS["occupied-capacity"],ICONS.soon];
    document.querySelectorAll(".adminSummaryCard").forEach((card,index)=>{if(!card.querySelector(".db68AdminIcon"))card.insertAdjacentHTML("afterbegin",`<span class="db68AdminIcon"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[index]||icons[0]}</svg></span>`)});
  }

  function setupBookingButton(){
    const button=$("bookAppointmentFromMyAppointments");if(!button)return;
    button.addEventListener("click",()=>{
      const role=db?.getProfile?.()?.role_code;const staff=["system_admin","site_admin","shipping_manager","coordinator"].includes(role);
      location.assign(`./${staff?"dashboard":"index"}.html?book=1&return=my-appointments&v=${VERSION}`);
    });
  }

  function setupDirectBooking(){
    const params=new URLSearchParams(location.search);if(params.get("book")!=="1")return;
    let attempts=0;const check=()=>{attempts++;if(document.body.classList.contains("maxdockContextReady")&&db?.getProfile?.()&&db.hasPermission?.("appointment.create")&&typeof window.openRequest==="function"&&$("requestModal")){window.openRequest();return}if(attempts<80)setTimeout(check,150)};check();
  }

  function bindDetailsClose(){
    document.addEventListener("click",event=>document.querySelectorAll("details[open]").forEach(details=>{if(!details.contains(event.target))details.open=false}));
    document.addEventListener("keydown",event=>{if(event.key==="Escape")document.querySelectorAll("details[open]").forEach(details=>details.open=false)});
  }

  function releaseStamp(){
    document.documentElement.dataset.maxdockRelease="db68";document.documentElement.dataset.db68Ready="true";
    document.querySelectorAll(".menu").forEach(menu=>{if(menu.querySelector(".maxdockReleaseStamp"))return;const stamp=document.createElement("small");stamp.className="maxdockReleaseStamp";stamp.textContent="DB68 · clean bootstrap and single-layout recovery active";menu.appendChild(stamp)});
  }

  async function initialize(){
    document.body.classList.add("db68Clean");
    await setupRole();
    setupBookingButton();setupDirectBooking();setupAdminSummary();setupQueueMetrics();
    await Promise.all([setupPreferences("dashboard"),setupPreferences("appointment"),setupPreferences("report")]);
    bindDetailsClose();releaseStamp();
  }

  initialize().catch(error=>{console.error("DB68 initialization failed",error);document.documentElement.dataset.db68Ready="error"});
})();
