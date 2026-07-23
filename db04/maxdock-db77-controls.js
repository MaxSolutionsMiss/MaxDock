(function(){
  "use strict";
  const PAGE=document.body?.dataset?.page||"";
  const $=id=>document.getElementById(id);
  const EYE_OPEN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/></svg>';
  const EYE_CLOSED='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 6.2A10.4 10.4 0 0 1 12 6c6 0 9.5 6 9.5 6a17.2 17.2 0 0 1-3 3.7M8.2 8.2C4.6 10 2.5 12 2.5 12s3.5 6 9.5 6c1.3 0 2.5-.3 3.6-.7M10 10a2.8 2.8 0 0 0 4 4"/></svg>';
  function replaceAndBind(element,handler,key){
    if(!element)return null;
    if(element.dataset.db77Control===key)return element;
    const clone=element.cloneNode(true);
    clone.dataset.db77Control=key;
    clone.removeAttribute("onclick");
    element.replaceWith(clone);
    clone.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();handler(event,clone)},true);
    return clone;
  }
  function bindDashboardActions(){
    if(PAGE!=="dashboard")return;
    const book=[...document.querySelectorAll("button")].find(button=>button.textContent.trim()==="Book Appointment"&&button.closest(".dashboardPrimaryActions"));
    replaceAndBind(book,()=>{if(typeof window.openRequest==="function")window.openRequest();else location.assign("./index.html?book=1&v=100-db78")},"dashboard-book");
    const block=[...document.querySelectorAll("button")].find(button=>button.textContent.trim()==="Block Time"&&button.closest(".dashboardPrimaryActions"));
    replaceAndBind(block,()=>{if(typeof window.openBlockModal==="function")window.openBlockModal();else window.MaxDockUI?.toast?.("Block Time is still loading. Please try again.",{tone:"error"})},"dashboard-block");
  }
  function bindMyAppointmentsBook(){
    if(PAGE!=="myappointments")return;
    replaceAndBind($("bookAppointmentFromMyAppointments"),()=>{
      const db=window.MaxDockDB;
      if(!db?.getProfile?.()){window.MaxDockUI?.toast?.("MaxDock is still loading your access. Please try again.",{tone:"error"});return}
      if(!db.hasPermission?.("appointment.create")){window.MaxDockUI?.toast?.("This account does not have permission to create appointments.",{tone:"error"});return}
      const role=db.getProfile()?.role_code;
      const operational=["system_admin","site_admin","shipping_manager","coordinator"].includes(role);
      location.assign(`./${operational?"dashboard":"index"}.html?book=1&return=my-appointments&v=100-db78`);
    },"myappointments-book");
  }
  function bindRequesterBooking(){
    if(PAGE!=="requester")return;
    document.querySelectorAll("button").forEach(button=>{
      if(button.textContent.trim()!=="Book Appointment")return;
      if(button.closest(".wizardNav"))replaceAndBind(button,()=>{if(typeof window.submitBooking==="function")window.submitBooking()},"requester-submit-booking");
    });
  }
  function openQueueDisplay(){
    const url=new URL("./queue.html",location.href);
    url.searchParams.set("v","100-db78");url.searchParams.set("display","1");
    url.searchParams.set("date",$("queueDate")?.value||new Date().toISOString().slice(0,10));
    url.searchParams.set("status",$("queueStatus")?.value||"pending");
    const locationName=window.MaxDockDB?.getCurrentLocation?.()?.name||$("locationSelect")?.value||"";
    if(locationName)url.searchParams.set("location",locationName);
    const popup=window.open(url.toString(),"maxdockQueueDisplay","popup=yes,resizable=yes,scrollbars=yes");
    if(popup){popup.focus();return}
    document.body.classList.add("queueDisplayMode");
    if($("queueDisplayBar"))$("queueDisplayBar").hidden=false;
    $("openQueueDisplay")?.setAttribute("hidden","");
    document.documentElement.requestFullscreen?.().catch(()=>{});
  }
  function bindQueueFullscreen(){if(PAGE!=="queue")return;window.openQueueDisplay=openQueueDisplay;replaceAndBind($("openQueueDisplay"),openQueueDisplay,"queue-fullscreen")}
  function bindMetricGears(){
    document.querySelectorAll("#dashboardCustomize,.dashboardCustomize,#queueCustomize,#db64ReportCustomize,#myAppointmentsCustomizeDB65").forEach(details=>{
      const summary=details.querySelector(":scope > summary");
      if(!summary||summary.dataset.db77Control==="metric-gear")return;
      const clone=summary.cloneNode(true);clone.dataset.db77Control="metric-gear";summary.replaceWith(clone);
      clone.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();details.open=!details.open;clone.setAttribute("aria-expanded",String(details.open))},true);
    });
  }
  function syncEye(button,input){const showing=input.type==="text";button.innerHTML=showing?EYE_OPEN:EYE_CLOSED;button.setAttribute("aria-label",showing?"Hide password":"Show password");button.setAttribute("title",showing?"Hide password":"Show password");button.setAttribute("aria-pressed",String(showing))}
  function upgradePasswordEye(){
    if(PAGE!=="login")return;
    const input=$("loginPassword"),button=$("toggleLoginPassword");if(!input||!button)return;
    if(button.dataset.db77Control==="password-eye"){syncEye(button,input);return}
    const clone=button.cloneNode(false);clone.id=button.id;clone.type="button";clone.className=`${button.className} passwordEyeButtonDB77`;clone.dataset.db77Control="password-eye";button.replaceWith(clone);
    clone.addEventListener("click",event=>{event.preventDefault();input.type=input.type==="password"?"text":"password";syncEye(clone,input);input.focus()});syncEye(clone,input);
  }
  function addStyles(){
    if($("db77ControlStyles"))return;
    const style=document.createElement("style");style.id="db77ControlStyles";
    style.textContent='body[data-page="dashboard"] .dashboardFilters{align-items:end!important}body[data-page="dashboard"] #refreshDashboard{align-self:end!important;height:42px!important;margin:0!important}body[data-page="admin"] .adminUsersTable th:first-child,body[data-page="admin"] .adminUsersTable td:first-child{width:26px!important;min-width:26px!important;max-width:26px!important;padding:8px 1px!important}body[data-page="admin"] .adminUsersTable th:nth-child(2),body[data-page="admin"] .adminUsersTable td:nth-child(2){padding-left:2px!important}.passwordInput{position:relative!important}.passwordInput #loginPassword{padding-right:44px!important}.passwordEyeButtonDB77{position:absolute!important;right:5px!important;top:50%!important;transform:translateY(-50%)!important;width:34px!important;height:34px!important;padding:7px!important;border:0!important;background:transparent!important;color:currentColor!important;display:grid!important;place-items:center!important;z-index:2!important}.passwordEyeButtonDB77 svg{width:20px!important;height:20px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}';
    document.head.appendChild(style);
  }
  function run(){addStyles();bindDashboardActions();bindMyAppointmentsBook();bindRequesterBooking();bindQueueFullscreen();bindMetricGears();upgradePasswordEye()}
  run();[150,500,1200,2600,4800].forEach(delay=>setTimeout(run,delay));window.MaxDockDB77Controls={run};
})();