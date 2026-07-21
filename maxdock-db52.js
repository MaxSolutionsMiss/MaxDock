(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const params=new URLSearchParams(location.search);
  const directBooking=params.get("book")==="1";
  const $=id=>document.getElementById(id);
  let bookingLaunchTimer=0;
  let bookingLaunchAttempts=0;
  let closeWrapped=false;

  const calendarIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM12 12v5M9.5 14.5h5"/></svg>';
  const blockIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM9 14h6"/></svg>';
  const refreshIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5M4 18v-5h5M6.1 9A7 7 0 0 1 18 6l2 5M17.9 15A7 7 0 0 1 6 18l-2-5"/></svg>';

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
      ?"./dashboard.html?book=1&return=my-appointments&v=73-db52"
      :"./index.html?book=1&return=my-appointments&v=73-db52";
  }

  function bindMyAppointmentsBooking(){
    const button=$("bookAppointmentFromMyAppointments");
    if(!button||button.dataset.db52Bound)return;
    button.dataset.db52Bound="true";
    button.addEventListener("click",event=>{
      event.preventDefault();
      location.assign(roleAwareBookingUrl());
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
      location.replace("./my-appointments.html?v=73-db52");
    };
  }

  function tryOpenDirectBooking(){
    if(!directBooking){window.clearInterval(bookingLaunchTimer);return}
    bookingLaunchAttempts++;
    const db=window.MaxDockDB;
    const modal=$("requestModal");
    if(db?.getProfile?.()&&modal&&typeof window.openRequest==="function"){
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
    new MutationObserver(()=>{
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
