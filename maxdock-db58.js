(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const TARGET_ID=PAGE==="dashboard"?"metrics":PAGE==="myappointments"?"myAppointmentMetrics":"";
  const PAST_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.35-5.65M4 4v5h5M12 8v4l3 2"/></svg>';
  let queued=false;

  function important(element,property,value){
    if(!element)return;
    if(element.style.getPropertyValue(property)===value&&element.style.getPropertyPriority(property)==="important")return;
    element.style.setProperty(property,value,"important");
  }

  function enforceCard(card,compact){
    const height=compact?"64px":"66px";
    const iconSize=compact?"42px":"44px";
    const iconGlyph=compact?"22px":"23px";
    card.classList.add("horizontalMetricCardDB55","compactMetricCardDB57","balancedMetricCardDB58");

    important(card,"box-sizing","border-box");
    important(card,"display","grid");
    important(card,"grid-template-columns",`${iconSize} minmax(0,1fr)`);
    important(card,"grid-template-rows","23px 15px");
    important(card,"column-gap","10px");
    important(card,"row-gap","2px");
    important(card,"align-content","center");
    important(card,"align-items","center");
    important(card,"width","100%");
    important(card,"height",height);
    important(card,"min-height",height);
    important(card,"max-height",height);
    important(card,"padding",compact?"4px 8px 4px 12px":"5px 10px 5px clamp(16px,8%,30px)");
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
    important(label,"font-size",compact?"12px":"13px");
    important(label,"font-weight","700");
    important(label,"line-height","1.08");
    important(label,"letter-spacing","0");
    important(label,"text-align","left");
    important(label,"text-transform","none");
    important(label,"white-space","normal");
  }

  function enforceMetrics(){
    if(!TARGET_ID)return;
    const container=document.getElementById(TARGET_ID);
    if(!container)return;
    const compact=window.matchMedia("(max-width:760px)").matches;
    const height=compact?"64px":"66px";

    container.classList.add("horizontalMetricsGridDB55","compactMetricsGridDB57","balancedMetricsGridDB58");
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
  }

  function markFilterFields(){
    document.body.classList.add("inlineControlsDB58");

    document.querySelectorAll(
      ".dashboardOperationalControls,.queueToolbarFilters,.reportFilters,.myAppointmentToolbar"
    ).forEach(group=>{
      group.querySelectorAll(".filterField").forEach(field=>field.classList.add("inlineFilterFieldDB58"));
    });

    const range=document.querySelector(".dashboardRangeHost>.rangeMetric");
    if(range){
      range.classList.add("inlineFilterFieldDB58","dashboardRangeInlineDB58");
      range.querySelector(":scope > .metricIconDB47")?.remove();
      let label=range.querySelector(":scope > label");
      if(!label){
        const source=range.querySelector(":scope > small");
        if(source){
          label=document.createElement("label");
          label.htmlFor="dashboardRange";
          label.textContent=source.textContent.trim()||"Date Range";
          source.replaceWith(label);
        }
      }
      if(label)label.htmlFor="dashboardRange";
    }
  }

  function markPastMetric(){
    const container=document.getElementById("myAppointmentMetrics");
    if(!container)return;
    container.classList.add("fiveAppointmentMetricsDB58");
    container.querySelectorAll(":scope > .metric").forEach(card=>{
      const label=card.querySelector(":scope > small")?.textContent.trim().toLowerCase();
      if(label!=="past")return;
      card.dataset.metricTone="past";
      const icon=card.querySelector(":scope > .metricIconDB47");
      if(icon)icon.innerHTML=PAST_ICON;
    });
  }

  function refresh(){
    markFilterFields();
    markPastMetric();
    enforceMetrics();
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      refresh();
    });
  }

  function initialize(){
    refresh();
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
    window.addEventListener("resize",schedule,{passive:true});
    [100,250,500,900,1600,2600].forEach(delay=>window.setTimeout(refresh,delay));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
