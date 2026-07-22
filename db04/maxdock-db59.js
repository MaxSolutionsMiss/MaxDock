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
    const height=compact?"70px":"72px";
    const iconSize=compact?"44px":"46px";
    const iconGlyph=compact?"23px":"24px";

    card.classList.add("matchedMetricCardDB59");
    important(card,"box-sizing","border-box");
    important(card,"position","relative");
    important(card,"display","grid");
    important(card,"grid-template-columns",`${iconSize} minmax(0,1fr)`);
    important(card,"grid-template-rows","auto auto");
    important(card,"column-gap","10px");
    important(card,"row-gap","1px");
    important(card,"align-content","center");
    important(card,"align-items","center");
    important(card,"width","100%");
    important(card,"min-width","0");
    important(card,"height",height);
    important(card,"min-height",height);
    important(card,"max-height",height);
    important(card,"margin","0");
    important(card,"padding",compact?"5px 10px":"6px 12px");
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
    important(icon,"min-width",iconSize);
    important(icon,"min-height",iconSize);
    important(icon,"margin","0");
    important(icon,"place-items","center");
    important(icon,"border-radius","12px");
    const svg=icon?.querySelector("svg");
    important(svg,"width",iconGlyph);
    important(svg,"height",iconGlyph);

    const number=card.querySelector(":scope > strong");
    important(number,"grid-column","2");
    important(number,"grid-row","1");
    important(number,"align-self","end");
    important(number,"justify-self","start");
    important(number,"display","block");
    important(number,"width","100%");
    important(number,"min-width","0");
    important(number,"height","auto");
    important(number,"min-height","0");
    important(number,"margin","0");
    important(number,"overflow","visible");
    important(number,"font-size","23px");
    important(number,"font-weight","780");
    important(number,"line-height","1");
    important(number,"letter-spacing","-.45px");
    important(number,"text-align","left");

    const label=card.querySelector(":scope > small");
    important(label,"grid-column","2");
    important(label,"grid-row","2");
    important(label,"align-self","start");
    important(label,"justify-self","start");
    important(label,"display","-webkit-box");
    important(label,"width","100%");
    important(label,"min-width","0");
    important(label,"height","auto");
    important(label,"min-height","0");
    important(label,"max-height","28px");
    important(label,"margin","0");
    important(label,"overflow","hidden");
    important(label,"font-size",compact?"12px":"13px");
    important(label,"font-weight","700");
    important(label,"line-height","1.08");
    important(label,"letter-spacing","0");
    important(label,"text-align","left");
    important(label,"text-transform","none");
    important(label,"white-space","normal");
    important(label,"-webkit-box-orient","vertical");
    important(label,"-webkit-line-clamp","2");
  }

  function enforceMetrics(){
    document.body.classList.add("kpiCorrectionDB59");
    if(!TARGET_ID)return false;
    const container=document.getElementById(TARGET_ID);
    if(!container)return false;
    const compact=window.matchMedia("(max-width:760px)").matches;
    const single=window.matchMedia("(max-width:440px)").matches;
    const height=compact?"70px":"72px";
    const columns=single?"1fr":compact?"repeat(2,minmax(0,1fr))":"repeat(auto-fit,minmax(180px,1fr))";

    container.classList.add("matchedMetricsGridDB59");
    important(container,"box-sizing","border-box");
    important(container,"display","grid");
    important(container,"grid-template-columns",columns);
    important(container,"grid-auto-rows",height);
    important(container,"align-items","stretch");
    important(container,"gap","8px");
    important(container,"width","100%");
    important(container,"height","auto");
    important(container,"min-height","0");
    important(container,"max-height","none");
    important(container,"margin","0 0 10px");
    important(container,"overflow","visible");

    container.querySelectorAll(":scope > .metric").forEach(card=>enforceCard(card,compact));
    return true;
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      enforceMetrics();
    });
  }

  function initialize(){
    enforceMetrics();
    const container=document.getElementById(TARGET_ID);
    if(container)new MutationObserver(schedule).observe(container,{childList:true});
    window.addEventListener("resize",schedule,{passive:true});
    [50,150,350,700,1200,2200].forEach(delay=>window.setTimeout(enforceMetrics,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
