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
      new MutationObserver(markHorizontalMetrics).observe(container,{childList:true});
    }
    [100,250,500,900,1600].forEach(delay=>window.setTimeout(markHorizontalMetrics,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
