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
      new MutationObserver(()=>tagMetricCards(container)).observe(container,{childList:true});
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
