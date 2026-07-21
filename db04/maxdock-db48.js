(function(){
  "use strict";

  function cleanRail(){
    const rail=document.querySelector(".maxdockSideRailDB47");
    if(!rail)return false;
    rail.querySelector(".maxdockSideRailHeadDB47")?.remove();
    rail.querySelector(".maxdockSideRailFootDB47")?.remove();
    return true;
  }

  function enterQueueDisplay(){
    document.body.classList.add("queueDisplayMode");
    const bar=document.getElementById("queueDisplayBar");
    const button=document.getElementById("openQueueDisplay");
    if(bar)bar.hidden=false;
    if(button)button.hidden=true;
    if(document.documentElement.requestFullscreen&&!document.fullscreenElement){
      document.documentElement.requestFullscreen().catch(()=>{});
    }
  }

  function configureFullscreen(){
    if(typeof window.openTvSchedule==="function"){
      window.openScheduleDisplay=()=>window.openTvSchedule(true);
    }
    const original=document.getElementById("openQueueDisplay");
    if(original&&!original.dataset.db48Fullscreen){
      const replacement=original.cloneNode(true);
      replacement.dataset.db48Fullscreen="true";
      replacement.addEventListener("click",enterQueueDisplay);
      original.replaceWith(replacement);
    }
  }

  function initialize(){
    document.body.classList.add("interfaceRefinementDB48");
    let attempts=0;
    const mount=()=>{
      cleanRail();
      configureFullscreen();
      if((document.querySelector(".maxdockSideRailDB47")||["login","password"].includes(document.body.dataset.page||""))&&attempts>4)return;
      if(attempts++>30)return;
      window.setTimeout(mount,100);
    };
    mount();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
