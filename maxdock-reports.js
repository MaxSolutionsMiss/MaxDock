(function(){
  "use strict";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  let reportRows=[];
  let chartRows=[];
  let preferenceReady=false;
  let lastPreferenceSignature="";
  let stopLiveRefresh=null;
  let currentView="overview";

  const REPORT_VIEWS={
    overview:{
      title:"Appointments & Utilization",
      subtitle:"Daily active truck volume with occupied dock capacity.",
      tableTitle:"Daily Operations Summary"
    },
    trucks:{
      title:"Inbound & Outbound Truck Flow",
      subtitle:"Number of active inbound and outbound trucks by operating date.",
      tableTitle:"Daily Truck Summary"
    },
    skids:{
      title:"Inbound & Outbound Skid Movement",
      subtitle:"Skids scheduled to enter and leave the facility by operating date.",
      tableTitle:"Daily Skid Summary"
    },
    utilization:{
      title:"Dock Utilization Trend",
      subtitle:"Occupied dock capacity for each operating date.",
      tableTitle:"Daily Capacity Summary"
    }
  };

  function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]))}
  function minutes(value){const [hour,minute]=String(value||"00:00").split(":").map(Number);return hour*60+minute}
  function timeLabel(value){const hour=Math.floor(value/60),minute=value%60;return new Date(2000,0,1,hour,minute).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}
  function eachDate(start,end){const dates=[];for(let day=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`);day<=last;day.setDate(day.getDate()+1))dates.push(localISO(day));return dates}
  function localISO(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
  function showError(error){const box=$("reportError");box.textContent=error?.message||String(error);box.style.display="block"}
  function clearError(){$("reportError").style.display="none"}
  function active(item){return item.type!=="Dock Block"&&item.status!=="Cancelled"}
  function occupied(item){return item.status!=="Cancelled"}
  function duration(item){return Math.max(0,minutes(item.end)-minutes(item.start))}
  function group(items,key){const counts=new Map();items.forEach(item=>counts.set(item[key]||"Unspecified",(counts.get(item[key]||"Unspecified")||0)+1));return [...counts].sort((a,b)=>b[1]-a[1])}
  function bars(items){const max=Math.max(1,...items.map(([,count])=>count));return items.length?items.map(([label,count])=>`<div class="reportBar"><div class="reportBarLabel"><span>${esc(label)}</span><b>${count}</b></div><div class="reportBarTrack"><i style="width:${Math.round(count/max*100)}%"></i></div></div>`).join(""):`<div class="emptyState">No data in this range.</div>`}
  function selectedView(){return REPORT_VIEWS[currentView]||REPORT_VIEWS.overview}
  function preferenceStatus(message,status){
    const element=$("reportPreferenceStatus");
    if(!element)return;
    element.textContent=message;element.dataset.status=status||"";
  }
  function saveReportPreference(){
    if(!preferenceReady)return;
    const value={
      locationName:db.getCurrentLocation()?.name||$("locationSelect").value||"",
      view:currentView,
      preset:$("reportPreset").value,
      customStart:$("reportStart").value,
      customEnd:$("reportEnd").value
    };
    const signature=JSON.stringify(value);
    if(signature===lastPreferenceSignature)return;
    lastPreferenceSignature=signature;
    db.queuePreferenceSave("reports",value,preferenceStatus);
  }

  function setDatePreset(value){
    const custom=value==="custom";
    $("reportCustomDates").hidden=!custom;
    if(custom)return;
    const end=new Date();
    const start=new Date(end);
    if(value==="7")start.setDate(start.getDate()-6);
    else if(value==="month")start.setDate(1);
    else start.setDate(start.getDate()-29);
    $("reportStart").value=localISO(start);
    $("reportEnd").value=localISO(end);
  }

  function resetBrief(){
    if(!$("aiModeBadge"))return;
    $("aiModeBadge").textContent="Not generated";$("aiModeBadge").className="aiModeBadge";
    $("aiBriefContent").innerHTML=`<div class="emptyState">Generate a new brief for this location and date range.</div>`;
  }

  function reportData(startValue="",endValue=""){
    const start=startValue||$("reportStart").value,end=endValue||$("reportEnd").value;
    if(!start||!end||start>end)throw new Error("Choose a valid report date range.");
    const dates=eachDate(start,end);
    if(dates.length>93)throw new Error("Choose a report range of 93 days or less.");
    const all=db.getAppointments().filter(item=>!item.linkedMovement&&item.date>=start&&item.date<=end);
    const appointments=all.filter(item=>item.type!=="Dock Block");
    const booked=appointments.filter(active);
    const cancelled=appointments.filter(item=>item.status==="Cancelled");
    const blocks=all.filter(item=>item.type==="Dock Block"&&occupied(item));
    const locationData=db.getLocationData();
    const settings=db.getSettings();
    const openDays=new Map((locationData?.operatingHours||[]).map(row=>[Number(row.day_of_week),row]));
    const dockCount=settings?.docks?.length||0;
    const capacityForDate=date=>{
      const hours=openDays.get(new Date(`${date}T12:00:00`).getDay());
      return !hours?.is_open?0:Math.max(0,minutes(String(hours.close_time).slice(0,5))-minutes(String(hours.open_time).slice(0,5)))*dockCount;
    };
    return {start,end,dates,all,appointments,booked,cancelled,blocks,locationData,settings,openDays,dockCount,capacityForDate};
  }

  function summaryFor(data){
    const bookedMinutes=data.booked.reduce((sum,item)=>sum+duration(item),0);
    const blockedMinutes=data.blocks.reduce((sum,item)=>sum+duration(item),0);
    const availableMinutes=data.dates.reduce((sum,date)=>sum+data.capacityForDate(date),0);
    return {
      appointments:data.appointments.length,
      activeTrucks:data.booked.length,
      cancelled:data.cancelled.length,
      cancellationRate:data.appointments.length?data.cancelled.length/data.appointments.length*100:0,
      bookedHours:bookedMinutes/60,
      utilization:availableMinutes?(bookedMinutes+blockedMinutes)/availableMinutes*100:0,
      blockedHours:blockedMinutes/60,
      inbound:data.booked.filter(item=>item.direction==="Inbound").reduce((sum,item)=>sum+Number(item.skids||0),0),
      outbound:data.booked.filter(item=>item.direction==="Outbound").reduce((sum,item)=>sum+Number(item.skids||0),0)
    };
  }

  function previousPeriod(data){
    const start=new Date(`${data.start}T12:00:00`);
    const end=new Date(`${data.end}T12:00:00`);
    const days=Math.round((end-start)/86400000)+1;
    const previousEnd=new Date(start);previousEnd.setDate(previousEnd.getDate()-1);
    const previousStart=new Date(previousEnd);previousStart.setDate(previousStart.getDate()-days+1);
    return reportData(localISO(previousStart),localISO(previousEnd));
  }

  function deltaLabel(current,previous,{suffix="",precision=0}={}){
    const delta=Number(current||0)-Number(previous||0);
    const rounded=Math.abs(delta).toFixed(precision);
    if(Math.abs(delta)<Math.pow(10,-precision)/2)return `No change vs previous period`;
    return `${delta>0?"+":"−"}${rounded}${suffix} vs previous period`;
  }

  function buildChartRows(data){
    return data.dates.map(date=>{
      const rows=data.appointments.filter(item=>item.date===date);
      const current=rows.filter(active);
      const inboundRows=current.filter(item=>item.direction==="Inbound");
      const outboundRows=current.filter(item=>item.direction==="Outbound");
      const blocks=data.blocks.filter(item=>item.date===date);
      const scheduledMinutes=current.reduce((sum,item)=>sum+duration(item),0);
      const blockedMinutes=blocks.reduce((sum,item)=>sum+duration(item),0);
      const capacity=data.capacityForDate(date);
      const inboundSkids=inboundRows.reduce((sum,item)=>sum+Number(item.skids||0),0);
      const outboundSkids=outboundRows.reduce((sum,item)=>sum+Number(item.skids||0),0);
      return {
        date,
        appointments:rows.length,
        activeTrucks:current.length,
        inboundTrucks:inboundRows.length,
        outboundTrucks:outboundRows.length,
        inboundSkids,
        outboundSkids,
        totalSkids:inboundSkids+outboundSkids,
        priority:current.filter(item=>item.priority).length,
        hours:scheduledMinutes/60,
        blockedHours:blockedMinutes/60,
        cancelled:rows.filter(item=>item.status==="Cancelled").length,
        utilization:capacity?(scheduledMinutes+blockedMinutes)/capacity*100:0,
        docksUsed:new Set(current.map(item=>item.dock).filter(Boolean)).size
      };
    });
  }

  function trendLabels(rows,width,left,right,bottomY){
    const plotWidth=width-left-right,step=plotWidth/Math.max(rows.length,1),every=Math.max(1,Math.ceil(rows.length/10));
    return rows.map((row,index)=>index%every===0||index===rows.length-1?`<text class="trendDateLabel" x="${(left+(index+.5)*step).toFixed(1)}" y="${bottomY}" text-anchor="middle">${esc(row.date.slice(5))}</text>`:"").join("");
  }

  function renderOverviewTrend(){
    const container=$("reportTrend");
    if(!chartRows.some(row=>row.appointments||row.blockedHours)){container.innerHTML=`<div class="emptyState">No operations data in this range.</div>`;return}
    const width=1000,height=280,left=52,right=22,top=22,bottom=50,plotWidth=width-left-right,plotHeight=height-top-bottom;
    const maxTrucks=Math.max(1,...chartRows.map(row=>row.activeTrucks));
    const step=plotWidth/Math.max(chartRows.length,1),barWidth=Math.max(5,Math.min(28,step*.52));
    const x=index=>left+(index+.5)*step;
    const yTrucks=value=>top+plotHeight-(value/maxTrucks*plotHeight);
    const yUtil=value=>top+plotHeight-(Math.min(100,value)/100*plotHeight);
    const volume=chartRows.map((row,index)=>`<rect class="trendVolumeBar" x="${(x(index)-barWidth/2).toFixed(1)}" y="${yTrucks(row.activeTrucks).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0,top+plotHeight-yTrucks(row.activeTrucks)).toFixed(1)}"><title>${row.date}: ${row.activeTrucks} active truck${row.activeTrucks===1?"":"s"}</title></rect>`).join("");
    const points=chartRows.map((row,index)=>`${x(index).toFixed(1)},${yUtil(row.utilization).toFixed(1)}`).join(" ");
    const dots=chartRows.map((row,index)=>`<circle class="trendUtilDot" cx="${x(index).toFixed(1)}" cy="${yUtil(row.utilization).toFixed(1)}" r="4"><title>${row.date}: ${row.utilization.toFixed(1)}% occupied</title></circle>`).join("");
    container.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Active trucks and dock utilization by date">
      <line class="trendGrid" x1="${left}" y1="${top}" x2="${left}" y2="${top+plotHeight}"></line><line class="trendGrid" x1="${left}" y1="${top+plotHeight}" x2="${width-right}" y2="${top+plotHeight}"></line>
      <text class="trendAxisLabel" x="${left-10}" y="${top+5}" text-anchor="end">${maxTrucks}</text><text class="trendAxisLabel" x="${left-10}" y="${top+plotHeight+4}" text-anchor="end">0</text><text class="trendAxisLabel" x="${width-right}" y="${top+5}" text-anchor="end">100%</text>
      ${volume}<polyline class="trendUtilLine" points="${points}"></polyline>${dots}${trendLabels(chartRows,width,left,right,height-19)}
    </svg>`;
  }

  function renderGroupedTrend(series,axisMax=null,suffix=""){
    const container=$("reportTrend");
    const hasData=chartRows.some(row=>series.some(item=>Number(row[item.key]||0)>0));
    if(!hasData){container.innerHTML=`<div class="emptyState">No ${selectedView().title.toLowerCase()} data in this range.</div>`;return}
    const width=1000,height=280,left=58,right=22,top=22,bottom=50,plotWidth=width-left-right,plotHeight=height-top-bottom;
    const maxValue=axisMax||Math.max(1,...chartRows.flatMap(row=>series.map(item=>Number(row[item.key]||0))));
    const step=plotWidth/Math.max(chartRows.length,1),groupWidth=Math.min(58,step*.74),barWidth=Math.max(3,groupWidth/series.length-3);
    const y=value=>top+plotHeight-(Math.min(maxValue,value)/maxValue*plotHeight);
    const barsSvg=chartRows.map((row,index)=>{
      const center=left+(index+.5)*step;
      const start=center-(barWidth*series.length+(series.length-1)*3)/2;
      return series.map((item,seriesIndex)=>{
        const value=Number(row[item.key]||0),barY=y(value);
        return `<rect class="${item.className}" x="${(start+seriesIndex*(barWidth+3)).toFixed(1)}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0,top+plotHeight-barY).toFixed(1)}"><title>${row.date}: ${item.label} ${item.format?item.format(value):`${value}${suffix}`}</title></rect>`;
      }).join("");
    }).join("");
    container.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(selectedView().title)} by date">
      <line class="trendGrid" x1="${left}" y1="${top}" x2="${left}" y2="${top+plotHeight}"></line><line class="trendGrid" x1="${left}" y1="${top+plotHeight}" x2="${width-right}" y2="${top+plotHeight}"></line>
      <text class="trendAxisLabel" x="${left-10}" y="${top+5}" text-anchor="end">${axisMax?`${maxValue}%`:maxValue}</text><text class="trendAxisLabel" x="${left-10}" y="${top+plotHeight+4}" text-anchor="end">0</text>
      ${barsSvg}${trendLabels(chartRows,width,left,right,height-19)}
    </svg>`;
  }

  function renderTrend(){
    const view=currentView,details=selectedView();
    $("reportTrendTitle").textContent=details.title;$("reportTrendSubtitle").textContent=details.subtitle;
    if(view==="trucks"){
      $("reportTrendLegend").innerHTML=`<span><i class="inboundLegend"></i>Inbound trucks</span><span><i class="outboundLegend"></i>Outbound trucks</span>`;
      renderGroupedTrend([{key:"inboundTrucks",label:"Inbound trucks",className:"trendInboundBar"},{key:"outboundTrucks",label:"Outbound trucks",className:"trendOutboundBar"}]);
    }else if(view==="skids"){
      $("reportTrendLegend").innerHTML=`<span><i class="inboundLegend"></i>Inbound skids</span><span><i class="outboundLegend"></i>Outbound skids</span>`;
      renderGroupedTrend([{key:"inboundSkids",label:"Inbound skids",className:"trendInboundBar"},{key:"outboundSkids",label:"Outbound skids",className:"trendOutboundBar"}]);
    }else if(view==="utilization"){
      $("reportTrendLegend").innerHTML=`<span><i class="utilizationBarLegend"></i>Occupied capacity</span>`;
      renderGroupedTrend([{key:"utilization",label:"Occupied capacity",className:"trendCapacityBar",format:value=>`${value.toFixed(1)}%`}],100);
    }else{
      $("reportTrendLegend").innerHTML=`<span><i class="volumeLegend"></i>Active trucks</span><span><i class="utilizationLegend"></i>Utilization</span>`;
      renderOverviewTrend();
    }
  }

  function renderHeatmap(data){
    const openRows=(data.locationData?.operatingHours||[]).filter(row=>row.is_open);
    if(!openRows.length||!data.dockCount){$("capacityHeatmap").innerHTML=`<div class="emptyState">Operating hours or active docks are not configured.</div>`;return}
    const first=Math.min(...openRows.map(row=>minutes(String(row.open_time).slice(0,5))));
    const last=Math.max(...openRows.map(row=>minutes(String(row.close_time).slice(0,5))));
    const occupiedRows=data.all.filter(occupied),cells=[];
    for(let start=first;start<last;start+=60){
      const end=Math.min(start+60,last);let capacity=0,used=0;
      data.dates.forEach(date=>{
        const hours=data.openDays.get(new Date(`${date}T12:00:00`).getDay());
        if(!hours?.is_open)return;
        const open=minutes(String(hours.open_time).slice(0,5)),close=minutes(String(hours.close_time).slice(0,5));
        capacity+=Math.max(0,Math.min(end,close)-Math.max(start,open))*data.dockCount;
        occupiedRows.filter(item=>item.date===date).forEach(item=>{used+=Math.max(0,Math.min(end,minutes(item.end))-Math.max(start,minutes(item.start))) });
      });
      const percent=capacity?Math.min(100,used/capacity*100):0,level=percent>=75?"high":percent>=40?"medium":"low";
      cells.push(`<div class="heatCell ${level}" title="${percent.toFixed(1)}% occupied"><small>${esc(timeLabel(start))}</small><strong>${percent.toFixed(0)}%</strong></div>`);
    }
    $("capacityHeatmap").innerHTML=cells.join("");
  }

  function dailySchema(data){
    const view=currentView;
    if(view==="trucks")return {headers:["Date","Total Trucks","Inbound","Outbound","Priority","Cancelled"],values:row=>[row.date,row.activeTrucks,row.inboundTrucks,row.outboundTrucks,row.priority,row.cancelled]};
    if(view==="skids")return {headers:["Date","Total Skids","Inbound Skids","Outbound Skids","Trucks","Average / Truck"],values:row=>[row.date,row.totalSkids,row.inboundSkids,row.outboundSkids,row.activeTrucks,row.activeTrucks?(row.totalSkids/row.activeTrucks).toFixed(1):"0.0"]};
    if(view==="utilization")return {headers:["Date","Occupied Capacity","Scheduled Hours","Blocked Hours","Active Trucks","Docks Used"],values:row=>[row.date,`${row.utilization.toFixed(1)}%`,row.hours.toFixed(1),row.blockedHours.toFixed(1),row.activeTrucks,`${row.docksUsed} / ${data.dockCount}`]};
    return {headers:["Date","Appointments","Active Trucks","Inbound Skids","Outbound Skids","Scheduled Hours","Cancelled"],values:row=>[row.date,row.appointments,row.activeTrucks,row.inboundSkids,row.outboundSkids,row.hours.toFixed(1),row.cancelled]};
  }

  function renderDailyTable(data){
    const schema=dailySchema(data);
    $("dailyReportTitle").textContent=selectedView().tableTitle;
    $("dailyReportHead").innerHTML=schema.headers.map(label=>`<th>${esc(label)}</th>`).join("");
    $("dailyReport").innerHTML=reportRows.length?reportRows.map(row=>`<tr>${schema.values(row).map(value=>`<td>${esc(value)}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${schema.headers.length}">No operations data in this range.</td></tr>`;
  }

  function render(){
    const data=reportData();
    const current=summaryFor(data);
    const previousData=previousPeriod(data);
    const previous=summaryFor(previousData);
    $("reportComparisonSummary").textContent=`Compared with ${previousData.start} through ${previousData.end}.`;
    $("reportMetrics").innerHTML=[
      ["Appointments",current.appointments,deltaLabel(current.appointments,previous.appointments)],
      ["Active Trucks",current.activeTrucks,deltaLabel(current.activeTrucks,previous.activeTrucks)],
      ["Cancelled",current.cancelled,deltaLabel(current.cancelled,previous.cancelled)],
      ["Cancellation Rate",`${current.cancellationRate.toFixed(1)}%`,deltaLabel(current.cancellationRate,previous.cancellationRate,{suffix:" pts",precision:1})],
      ["Booked Hours",current.bookedHours.toFixed(1),deltaLabel(current.bookedHours,previous.bookedHours,{precision:1})],
      ["Occupied Capacity",`${current.utilization.toFixed(1)}%`,deltaLabel(current.utilization,previous.utilization,{suffix:" pts",precision:1})],
      ["Blocked Hours",current.blockedHours.toFixed(1),deltaLabel(current.blockedHours,previous.blockedHours,{precision:1})],
      ["Inbound Skids",current.inbound,deltaLabel(current.inbound,previous.inbound)],
      ["Outbound Skids",current.outbound,deltaLabel(current.outbound,previous.outbound)]
    ].map(([label,value,delta])=>`<div class="metric"><small>${label}</small><strong>${value}</strong><span class="metricDelta">${esc(delta)}</span></div>`).join("");
    $("truckReport").innerHTML=bars(group(data.booked,"truck"));$("typeReport").innerHTML=bars(group(data.booked,"type"));
    chartRows=buildChartRows(data);
    reportRows=chartRows.filter(row=>row.appointments>0||row.blockedHours>0);
    const rangeName=$("reportPreset").selectedOptions[0]?.textContent||"Selected range";
    $("reportRangeLabel").textContent=`${rangeName} · ${data.start} through ${data.end}`;
    renderTrend();renderHeatmap(data);renderDailyTable(data);clearError();
  }

  function renderAiBrief(result){
    const brief=result?.brief||{},pressures=Array.isArray(brief.pressures)?brief.pressures:[],opportunities=Array.isArray(brief.opportunities)?brief.opportunities:[],actions=Array.isArray(brief.actions)?brief.actions:[];
    $("aiModeBadge").textContent=result.mode==="ai"?"AI Analysis":"MaxDock Rules Analysis";$("aiModeBadge").className=`aiModeBadge ${result.mode==="ai"?"ai":"rules"}`;
    $("aiBriefContent").innerHTML=`${result.warning?`<div class="aiWarning">${esc(result.warning)}</div>`:""}<div class="aiBriefSummary"><small>${esc(brief.title||"Operations Brief")}</small><p>${esc(brief.summary||"No summary is available.")}</p></div>
      <div class="aiBriefGrid"><div><h4>Pressure Points</h4>${pressures.length?`<ul>${pressures.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`:`<p>No significant pressure identified.</p>`}</div><div><h4>Opportunities</h4>${opportunities.length?`<ul>${opportunities.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`:`<p>No specific opportunity identified.</p>`}</div></div>
      <div class="aiActions"><h4>Suggested Actions</h4>${actions.length?actions.map((item,index)=>`<article><span>${index+1}</span><div><b>${esc(item.action)}</b><p>${esc(item.reason)}</p></div><em>${esc(item.priority)}</em></article>`).join(""):`<p>No additional action suggested.</p>`}</div>`;
  }

  async function generateAiBrief(){
    const button=$("generateAiBrief");
    try{
      const data=reportData();button.disabled=true;button.textContent="Generating…";
      $("aiBriefContent").innerHTML=`<div class="aiLoading"><span class="loadingSpinner"></span><b>Reviewing aggregate operational data…</b></div>`;
      const result=await db.client.functions.invoke("maxdock-ai-brief",{body:{locationId:db.getCurrentLocation().id,startDate:data.start,endDate:data.end}});
      if(result.error)throw result.error;if(result.data?.error)throw new Error(result.data.error);renderAiBrief(result.data);
    }catch(error){$("aiBriefContent").innerHTML=`<div class="emptyState">The operations brief could not be generated.</div>`;showError(error)}
    finally{button.disabled=false;button.textContent="Generate brief"}
  }

  function exportCsv(){
    try{
      const data=reportData(),schema=dailySchema(data),lines=[schema.headers,...reportRows.map(schema.values)];
      const blob=new Blob([lines.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(",")).join("\n")],{type:"text/csv"});
      const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`maxdock-${currentView}-${data.start}-to-${data.end}.csv`;link.click();URL.revokeObjectURL(link.href);
    }catch(error){showError(error)}
  }
  window.maxdockExportReport=exportCsv;

  async function changeLocation(){
    await db.loadLocation($("locationSelect").value);
    localStorage.setItem("maxdock_location",db.getCurrentLocation()?.name||$("locationSelect").value);
    resetBrief();render();saveReportPreference();
  }
  function syncReportTabs(focus=false){
    const buttons=[...document.querySelectorAll("[data-report-view]")];
    buttons.forEach((button,index)=>{
      const selected=button.dataset.reportView===currentView;
      if(!button.id)button.id=`report-workspace-tab-${index+1}`;
      button.setAttribute("aria-selected",String(selected));
      button.tabIndex=selected?0:-1;
      button.classList.toggle("isActive",selected);
      if(selected){
        $("report-workspace")?.setAttribute("aria-labelledby",button.id);
        if(focus)button.focus();
      }
    });
  }
  function updateSelection(view=currentView,focus=false){
    try{
      if(Object.prototype.hasOwnProperty.call(REPORT_VIEWS,view))currentView=view;
      syncReportTabs(focus);resetBrief();render();saveReportPreference();
    }catch(error){showError(error)}
  }
  function copyAiBrief(){
    const text=$("aiBriefContent")?.innerText?.trim();
    if(!text)return;
    navigator.clipboard.writeText(text).then(()=>window.MaxDockUI?.toast?.("Operations brief copied.")).catch(()=>window.MaxDockUI?.toast?.("Copy was not available."));
  }

  async function init(){
    try{
      if(!await db.requireAuth())return;await db.loadContext();
      if(!db.hasPermission("reports.view"))throw new Error("This account cannot view operational reports.");
      const saved=await db.loadPreference("reports",{locationName:"",view:"overview",preset:"30",customStart:"",customEnd:""});
      db.selectLocation(localStorage.getItem("maxdock_location")||saved.locationName);db.populateLocationSelect($("locationSelect"));db.addAccountControls();
      const role=db.getProfile()?.role_code;
      $("locationSelect").disabled=role!=="system_admin";
      $("locationSelect").setAttribute("aria-disabled",String(role!=="system_admin"));
      if(db.getProfile()?.role_code!=="system_admin")document.querySelectorAll('a[href*="admin.html"],a[href*="data.html"]').forEach(link=>link.hidden=true);
      if(!db.hasPermission("settings.manage"))document.querySelectorAll('a[href*="settings.html"]').forEach(link=>link.hidden=true);
      if(!db.hasPermission("ai.insights"))$("generateAiBrief").hidden=true;
      currentView=Object.prototype.hasOwnProperty.call(REPORT_VIEWS,saved.view)?saved.view:"overview";
      syncReportTabs();
      $("reportPreset").value=["7","30","month","custom"].includes(saved.preset)?saved.preset:"30";
      if($("reportPreset").value==="custom"&&/^\d{4}-\d{2}-\d{2}$/.test(saved.customStart||"")&&/^\d{4}-\d{2}-\d{2}$/.test(saved.customEnd||"")){
        $("reportCustomDates").hidden=false;$("reportStart").value=saved.customStart;$("reportEnd").value=saved.customEnd;
      }else setDatePreset($("reportPreset").value);
      preferenceReady=true;preferenceStatus("This report view is saved to your login.","saved");
      $("locationSelect").addEventListener("change",()=>changeLocation().catch(showError));
      document.querySelectorAll("[data-report-view]").forEach(button=>button.addEventListener("click",()=>updateSelection(button.dataset.reportView)));
      $("reportPreset").addEventListener("change",event=>{setDatePreset(event.target.value);if(event.target.value!=="custom")updateSelection();else saveReportPreference()});
      $("reportStart").addEventListener("change",saveReportPreference);$("reportEnd").addEventListener("change",saveReportPreference);
      $("runReport").addEventListener("click",()=>updateSelection());$("exportReport")?.addEventListener("click",exportCsv);$("generateAiBrief").addEventListener("click",generateAiBrief);$("copyAiBrief")?.addEventListener("click",copyAiBrief);
      await db.loadLocation($("locationSelect").value);render();saveReportPreference();
      stopLiveRefresh=db.startLiveRefresh(async()=>{
        await db.fetchAppointments();render();
        if($("reportLiveStatus"))$("reportLiveStatus").innerHTML=`<span class="liveDot"></span>Live appointments · updated ${new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"})}`;
      },{onError:error=>{if($("reportLiveStatus"))$("reportLiveStatus").textContent=`Live refresh paused · ${error.message||"connection unavailable"}`}});
    }catch(error){showError(error)}
  }
  document.addEventListener("DOMContentLoaded",init);
})();
