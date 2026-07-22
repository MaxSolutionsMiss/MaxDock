(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const TARGET_ID=PAGE==="dashboard"?"metrics":PAGE==="myappointments"?"myAppointmentMetrics":"";
  let queued=false;

  function important(element,property,value){
    if(!element)return;
    if(element.style.getPropertyValue(property)===value&&element.style.getPropertyPriority(property)==="important")return;
    element.style.setProperty(property,value,"important");
  }

  function enforceCard(card,compact){
    const height=compact?"58px":"60px";
    const iconSize=compact?"40px":"42px";
    const iconGlyph=compact?"21px":"22px";
    card.classList.add("horizontalMetricCardDB55","compactMetricCardDB57");

    important(card,"box-sizing","border-box");
    important(card,"display","grid");
    important(card,"grid-template-columns",`${iconSize} minmax(0,1fr)`);
    important(card,"grid-template-rows","22px 14px");
    important(card,"column-gap","10px");
    important(card,"row-gap","1px");
    important(card,"align-content","center");
    important(card,"align-items","center");
    important(card,"width","100%");
    important(card,"height",height);
    important(card,"min-height",height);
    important(card,"max-height",height);
    important(card,"padding",compact?"3px 8px 3px 12px":"4px 10px 4px clamp(16px,8%,30px)");
    important(card,"overflow","hidden");

    const icon=card.querySelector(":scope > .metricIconDB47");
    important(icon,"position","static");
    important(icon,"inset","auto");
    important(icon,"grid-column","1");
    important(icon,"grid-row","1 / 3");
    important(icon,"align-self","center");
    important(icon,"justify-self","start");
    important(icon,"display","grid");
    important(icon,"width",iconSize);
    important(icon,"height",iconSize);
    important(icon,"margin","0");
    important(icon,"place-items","center");
    important(icon,"border-radius","11px");
    const svg=icon?.querySelector("svg");
    important(svg,"width",iconGlyph);
    important(svg,"height",iconGlyph);

    const number=card.querySelector(":scope > strong");
    important(number,"grid-column","2");
    important(number,"grid-row","1");
    important(number,"align-self","end");
    important(number,"justify-self","start");
    important(number,"width","100%");
    important(number,"height","auto");
    important(number,"min-height","0");
    important(number,"margin","0");
    important(number,"font-size","22px");
    important(number,"font-weight","780");
    important(number,"line-height","1");
    important(number,"letter-spacing","-.4px");
    important(number,"text-align","left");

    const label=card.querySelector(":scope > small");
    important(label,"grid-column","2");
    important(label,"grid-row","2");
    important(label,"align-self","start");
    important(label,"justify-self","start");
    important(label,"width","100%");
    important(label,"height","auto");
    important(label,"min-height","0");
    important(label,"margin","0");
    important(label,"overflow","visible");
    important(label,"font-size",compact?"11px":"12px");
    important(label,"font-weight","700");
    important(label,"line-height","1.1");
    important(label,"letter-spacing","0");
    important(label,"text-align","left");
    important(label,"text-transform","none");
    important(label,"white-space","normal");
  }

  function enforceCompactMetrics(){
    document.body.classList.add("kpiBalanceDB57");
    if(!TARGET_ID)return false;
    const container=document.getElementById(TARGET_ID);
    if(!container)return false;
    const compact=window.matchMedia("(max-width:760px)").matches;
    const height=compact?"58px":"60px";

    container.classList.add("horizontalMetricsGridDB55","compactMetricsGridDB57");
    important(container,"box-sizing","border-box");
    important(container,"height","auto");
    important(container,"min-height","0");
    important(container,"max-height","none");
    important(container,"grid-auto-rows",height);
    important(container,"align-items","stretch");
    important(container,"gap","8px");
    important(container,"margin-bottom","8px");
    important(container,"overflow","visible");

    container.querySelectorAll(":scope > .metric").forEach(card=>enforceCard(card,compact));
    return true;
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      enforceCompactMetrics();
    });
  }

  function initialize(){
    enforceCompactMetrics();
    const container=document.getElementById(TARGET_ID);
    if(container){
      new MutationObserver(schedule).observe(container,{
        childList:true,
        subtree:true,
        attributes:true,
        attributeFilter:["class","style"]
      });
    }
    window.addEventListener("resize",schedule,{passive:true});
    [100,250,500,900,1600,2600].forEach(delay=>window.setTimeout(enforceCompactMetrics,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
