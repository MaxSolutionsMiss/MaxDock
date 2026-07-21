(function(){
  "use strict";

  function closeOpenDetails(event){
    document.querySelectorAll("details[open]").forEach(details=>{
      if(event?.type==="click"&&details.contains(event.target))return;
      details.removeAttribute("open");
    });
  }

  function dismissOverlay(overlay){
    const closeButton=overlay.querySelector(".closeBtn");
    if(closeButton)closeButton.click();
    else overlay.classList.remove("show");
    if(!document.querySelector(".modalOverlay.show"))document.body.classList.remove("modalOpen");
  }

  function handleBackdropClick(event){
    const overlay=event.target.closest(".modalOverlay.show");
    if(overlay&&event.target===overlay)dismissOverlay(overlay);
  }

  function handleEscape(event){
    if(event.key!=="Escape")return;
    const overlays=[...document.querySelectorAll(".modalOverlay.show")];
    if(overlays.length){
      dismissOverlay(overlays[overlays.length-1]);
      return;
    }
    closeOpenDetails(event);
  }

  function compactNavigationLabels(){
    const labels={
      "my-appointments":"Appointments",
      queue:"Queue",
      reports:"Reports",
      dashboard:"Dashboard",
      settings:"Settings",
      admin:"Users",
      data:"Data"
    };
    document.querySelectorAll(".maxdockPrimaryNavLink").forEach(link=>{
      if(labels[link.dataset.route])link.textContent=labels[link.dataset.route];
    });
  }

  function configureOverflowNavigation(){
    document.querySelectorAll(".menuDetails>summary").forEach(summary=>{
      summary.title="Open navigation";
      summary.setAttribute("aria-label","Open navigation");
      summary.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"/></svg>';
    });
  }

  function initialize(){
    document.body.classList.add("operationalAlignmentDB45");
    document.querySelectorAll(".operationsQueueShortcut").forEach(link=>link.remove());
    compactNavigationLabels();
    configureOverflowNavigation();
    document.addEventListener("click",closeOpenDetails);
    document.addEventListener("click",handleBackdropClick);
    document.addEventListener("keydown",handleEscape);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
