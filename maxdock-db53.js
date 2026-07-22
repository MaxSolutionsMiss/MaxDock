(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const OPERATIONAL_ROUTES=new Set(["my-appointments","queue","reports","dashboard","settings"]);
  const SYSTEM_ADMIN_ROUTES=new Set([...OPERATIONAL_ROUTES,"admin","data"]);
  const EXTERNAL_ROUTES=new Set(["my-appointments"]);
  let bookingOpenQueued=false;
  let openRequestWrapped=false;

  function routeFor(link){
    if(link.dataset.route)return link.dataset.route;
    try{return (new URL(link.href,location.href).pathname.split("/").pop()||"").replace(/\.html$/i,"")}
    catch{return ""}
  }

  function allowedRoutesFor(profile){
    if(!profile)return null;
    if(profile.role_code==="system_admin")return SYSTEM_ADMIN_ROUTES;
    if(["site_admin","shipping_manager","coordinator"].includes(profile.role_code))return OPERATIONAL_ROUTES;
    return EXTERNAL_ROUTES;
  }

  function enforceRoleNavigation(){
    const db=window.MaxDockDB;
    const profile=db?.getProfile?.();
    const allowed=allowedRoutesFor(profile);
    if(!allowed)return false;

    document.querySelectorAll(".maxdockPrimaryNav a,.maxdockSideRailDB47 a,.menu>a").forEach(link=>{
      const route=routeFor(link);
      const visible=allowed.has(route);
      link.hidden=!visible;
      link.setAttribute("aria-hidden",String(!visible));
      link.style.setProperty("display",visible?"":"none",visible?"":"important");
      if(visible)link.removeAttribute("tabindex");
      else link.tabIndex=-1;
    });

    if(["admin","data"].includes(PAGE)&&profile.role_code!=="system_admin"){
      location.replace(`./${db.getLandingPage?.()||"dashboard.html"}`);
      return true;
    }
    return true;
  }

  function contextReadyForBooking(){
    const db=window.MaxDockDB;
    return Boolean(
      document.body.classList.contains("maxdockContextReady")&&
      db?.getProfile?.()&&
      db?.hasPermission?.("appointment.create")
    );
  }

  function waitForBookingContext(onReady,onDenied){
    let attempts=0;
    const check=()=>{
      attempts++;
      const db=window.MaxDockDB;
      const contextReady=document.body.classList.contains("maxdockContextReady")&&db?.getProfile?.();
      if(contextReady&&db.hasPermission?.("appointment.create")){
        bookingOpenQueued=false;
        onReady();
        return;
      }
      if(contextReady&&attempts>8){
        bookingOpenQueued=false;
        onDenied?.();
        return;
      }
      if(attempts>=80){
        bookingOpenQueued=false;
        alert("MaxDock is still loading your booking access. Please try again.");
        return;
      }
      window.setTimeout(check,125);
    };
    check();
  }

  function wrapOpenRequest(){
    if(openRequestWrapped||typeof window.openRequest!=="function")return;
    const original=window.openRequest;
    if(original.__db53Wrapped){openRequestWrapped=true;return}
    const wrapped=function(){
      const args=arguments;
      const scope=this;
      if(contextReadyForBooking())return original.apply(scope,args);
      if(bookingOpenQueued)return;
      bookingOpenQueued=true;
      waitForBookingContext(
        ()=>original.apply(scope,args),
        ()=>alert("Your MaxDock account does not currently have permission to book an appointment.")
      );
    };
    wrapped.__db53Wrapped=true;
    window.openRequest=wrapped;
    openRequestWrapped=true;
  }

  function normalizeQueueRefresh(){
    const button=document.getElementById("refreshQueue");
    if(!button)return;
    button.classList.add("db53PrimaryAction","queueRefreshDB53");
    button.classList.remove("greenBtn");
  }

  function simplifyLocationControl(){
    document.querySelectorAll(".headerActions .locationPill").forEach(item=>item.classList.add("locationControlDB53"));
  }

  function arrangeAppointmentWorkspace(){
    if(PAGE!=="myappointments")return;
    const workspace=document.querySelector(".appointmentsSectionWorkspace");
    const spotlight=document.getElementById("nextAppointmentSpotlight");
    if(!workspace||!spotlight)return;

    workspace.classList.add("appointmentsWorkspaceDB53");
    if(spotlight.nextElementSibling!==workspace)spotlight.insertAdjacentElement("afterend",workspace);

    const rail=workspace.querySelector(".sectionWorkspaceRail");
    rail?.classList.add("appointmentViewsRailDB53");
    rail?.querySelector(".sectionWorkspaceRailHead small")?.remove();

    const names={upcoming:"Upcoming",all:"All Bookings",past:"Past",cancelled:"Cancelled"};
    rail?.querySelectorAll(".appointmentViewTabs>button").forEach(button=>{
      const label=button.querySelector("span");
      if(label&&names[button.dataset.selectValue])label.textContent=names[button.dataset.selectValue];
      button.querySelector("small")?.remove();
    });
  }

  function refresh(){
    document.body.classList.add("interfacePolishDB53");
    enforceRoleNavigation();
    wrapOpenRequest();
    normalizeQueueRefresh();
    simplifyLocationControl();
    arrangeAppointmentWorkspace();
  }

  function initialize(){
    refresh();
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;refresh()});
    }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","style"]});
    [150,400,900,1600,2600].forEach(delay=>window.setTimeout(refresh,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
