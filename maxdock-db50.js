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
    button.href="./index.html?book=1&return=my-appointments&v=71-db50";
  }

  function wrapCloseRequest(){
    if(closeWrapped||typeof window.closeRequest!=="function")return;
    closeWrapped=true;
    const original=window.closeRequest;
    window.closeRequest=function(){
      if(!directBooking)return original.apply(this,arguments);
      window.closeEfficiencyOpportunity?.();
      location.replace("./my-appointments.html?v=71-db50");
    };
  }

  function openDirectBooking(){
    if(!directBooking||directBookingOpened)return;
    const db=window.MaxDockDB;
    if(!db?.getProfile?.()||typeof window.openRequest!=="function"||!document.getElementById("requestModal"))return;
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
    new MutationObserver(()=>{
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
