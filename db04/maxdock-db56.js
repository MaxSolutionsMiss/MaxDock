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
    if(container)new MutationObserver(applyFinalPolish).observe(container,{childList:true});
    [100,250,500,900,1600].forEach(delay=>window.setTimeout(applyFinalPolish,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
