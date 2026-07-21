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
      new MutationObserver(()=>decorateMetricContainer(container)).observe(container,{childList:true});
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
