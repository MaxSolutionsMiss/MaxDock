(function(){
  "use strict";

  const page=document.body.dataset.page||"";

  function syncNavigationLink(source,target){
    target.hidden=source.hidden||source.style.display==="none";
    if(source.hasAttribute("aria-current"))target.setAttribute("aria-current",source.getAttribute("aria-current")||"page");
    else target.removeAttribute("aria-current");
  }

  function buildPersistentNavigation(){
    const topbar=document.querySelector(".topbarInner");
    const menu=document.querySelector(".menu");
    const headerActions=topbar?.querySelector(".headerActions");
    if(!topbar||!menu||!headerActions||topbar.querySelector(".maxdockPrimaryNav"))return;

    const nav=document.createElement("nav");
    nav.className="maxdockPrimaryNav";
    nav.setAttribute("aria-label","Primary navigation");
    const sourceLinks=[...menu.querySelectorAll(":scope > a")];
    sourceLinks.forEach(source=>{
      const link=source.cloneNode(true);
      link.className="maxdockPrimaryNavLink";
      const route=(new URL(link.href,location.href).pathname.split("/").pop()||"").replace(".html","");
      link.dataset.route=route;
      if(link.textContent.trim()==="My Appointments")link.textContent="Appointments";
      syncNavigationLink(source,link);
      nav.appendChild(link);
      new MutationObserver(()=>syncNavigationLink(source,link)).observe(source,{attributes:true,attributeFilter:["hidden","style","aria-current"]});
    });
    topbar.insertBefore(nav,headerActions);

    const menuSummary=headerActions.querySelector(".menuDetails>summary");
    if(menuSummary){
      menuSummary.title="More navigation and account options";
      menuSummary.setAttribute("aria-label","More navigation and account options");
    }
  }

  function syncSelectTabs(select,buttons){
    buttons.forEach(button=>{
      const active=button.dataset.selectValue===select.value;
      button.classList.toggle("isActive",active);
      button.setAttribute("aria-selected",String(active));
      button.tabIndex=active?0:-1;
    });
  }

  function addSelectTabBehavior(select,buttons){
    buttons.forEach(button=>button.addEventListener("click",()=>{
      if(select.value!==button.dataset.selectValue){
        select.value=button.dataset.selectValue;
        select.dispatchEvent(new Event("change",{bubbles:true}));
      }
      syncSelectTabs(select,buttons);
    }));
    const tablist=buttons[0]?.parentElement;
    tablist?.addEventListener("keydown",event=>{
      const current=buttons.indexOf(document.activeElement);
      if(current<0)return;
      let next=current;
      if(["ArrowDown","ArrowRight"].includes(event.key))next=(current+1)%buttons.length;
      else if(["ArrowUp","ArrowLeft"].includes(event.key))next=(current-1+buttons.length)%buttons.length;
      else if(event.key==="Home")next=0;
      else if(event.key==="End")next=buttons.length-1;
      else return;
      event.preventDefault();
      buttons[next].click();
      buttons[next].focus();
    });
    select.addEventListener("change",()=>syncSelectTabs(select,buttons));
    syncSelectTabs(select,buttons);
    [0,250,750,1500].forEach(delay=>window.setTimeout(()=>syncSelectTabs(select,buttons),delay));
  }

  function buildAppointmentWorkspace(){
    const select=document.getElementById("myAppointmentFilter");
    const panel=select?.closest("section.panel");
    if(!select||!panel||panel.parentElement?.classList.contains("appointmentsSectionWorkspace"))return;

    const sourceField=select.closest(".filterField");
    sourceField?.classList.add("workspaceSourceControl");
    panel.id="appointment-list-workspace";
    const title=panel.querySelector(".panelHeader h3");
    if(title)title.textContent="Appointment list";

    const workspace=document.createElement("div");
    workspace.className="sectionWorkspace appointmentsSectionWorkspace";
    const rail=document.createElement("aside");
    rail.className="sectionWorkspaceRail";
    rail.setAttribute("aria-label","Appointment views");
    rail.innerHTML='<div class="sectionWorkspaceRailHead"><strong>Appointment views</strong><small>Choose which bookings to review.</small></div><div class="sectionWorkspaceTabs appointmentViewTabs" role="tablist" aria-orientation="vertical"></div>';
    const tabs=rail.querySelector(".appointmentViewTabs");
    const labels={upcoming:["Upcoming","Scheduled ahead"],all:["All bookings","Complete history"],past:["Past","Completed dates"],cancelled:["Cancelled","Cancelled bookings"]};
    [...select.options].forEach((option,index)=>{
      const [label,description]=labels[option.value]||[option.textContent,""];
      const button=document.createElement("button");
      button.type="button";
      button.id=`appointment-view-tab-${index+1}`;
      button.setAttribute("role","tab");
      button.setAttribute("aria-controls",panel.id);
      button.dataset.selectValue=option.value;
      button.innerHTML=`<span>${label}</span><small>${description}</small>`;
      tabs.appendChild(button);
    });
    const content=document.createElement("div");
    content.className="sectionWorkspaceContent";
    panel.insertAdjacentElement("beforebegin",workspace);
    workspace.append(rail,content);
    content.appendChild(panel);
    addSelectTabBehavior(select,[...tabs.querySelectorAll("button")]);
  }

  function initialize(){
    document.body.classList.add("operationalConsoleDB43");
    buildPersistentNavigation();
    if(page==="myappointments")buildAppointmentWorkspace();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
