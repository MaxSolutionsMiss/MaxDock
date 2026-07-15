(function(){
  "use strict";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  let reportRows=[];
  let chartRows=[];

  function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]))}
  function minutes(value){const [hour,minute]=String(value||"00:00").split(":").map(Number);return hour*60+minute}
  function timeLabel(value){const hour=Math.floor(value/60),minute=value%60;return new Date(2000,0,1,hour,minute).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}
  function eachDate(start,end){const dates=[];for(let day=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`);day<=last;day.setDate(day.getDate()+1))dates.push(day.toISOString().slice(0,10));return dates}
  function localISO(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
  function showError(error){const box=$("reportError");box.textContent=error?.message||String(error);box.style.display="block"}
  function clearError(){$("reportError").style.display="none"}
  function active(item){return item.type!=="Dock Block"&&item.status!=="Cancelled"}
  function occupied(item){return item.status!=="Cancelled"}
  function duration(item){return Math.max(0,minutes(item.end)-minutes(item.start))}
  function group(items,key){const counts=new Map();items.forEach(item=>counts.set(item[key]||"Unspecified",(counts.get(item[key]||"Unspecified")||0)+1));return [...counts].sort((a,b)=>b[1]-a[1])}
  function bars(items){const max=Math.max(1,...items.map(([,count])=>count));return items.length?items.map(([label,count])=>`<div class="reportBar"><div class="reportBarLabel"><span>${esc(label)}</span><b>${count}</b></div><div class="reportBarTrack"><i style="width:${Math.round(count/max*100)}%"></i></div></div>`).join(""):`<div class="emptyState">No data in this range.</div>`}

  function reportData(){
    const start=$("reportStart").value,end=$("reportEnd").value;
    if(!start||!end||start>end)throw new Error("Choose a valid report date range.");
    const dates=eachDate(start,end);
    if(dates.length>93)throw new Error("Choose a report range of 93 days or less.");
    const all=db.getAppointments().filter(item=>item.date>=start&&item.date<=end);
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

  function renderTrend(){
    const container=$("reportTrend");
    if(!chartRows.length){container.innerHTML=`<div class="emptyState">No trend data in this range.</div>`;return}
    const width=1000,height=270,left=52,right=22,top=22,bottom=48,plotWidth=width-left-right,plotHeight=height-top-bottom;
    const maxAppointments=Math.max(1,...chartRows.map(row=>row.appointments));
    const step=chartRows.length===1?plotWidth:plotWidth/(chartRows.length-1);
    const barWidth=Math.max(5,Math.min(24,plotWidth/Math.max(chartRows.length,1)*.56));
    const x=index=>left+(chartRows.length===1?plotWidth/2:index*step);
    const yVolume=value=>top+plotHeight-(value/maxAppointments*plotHeight);
    const yUtil=value=>top+plotHeight-(Math.min(100,value)/100*plotHeight);
    const barsSvg=chartRows.map((row,index)=>`<rect class="trendVolumeBar" x="${(x(index)-barWidth/2).toFixed(1)}" y="${yVolume(row.appointments).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0,top+plotHeight-yVolume(row.appointments)).toFixed(1)}"><title>${row.date}: ${row.appointments} appointments</title></rect>`).join("");
    const points=chartRows.map((row,index)=>`${x(index).toFixed(1)},${yUtil(row.utilization).toFixed(1)}`).join(" ");
    const dots=chartRows.map((row,index)=>`<circle class="trendUtilDot" cx="${x(index).toFixed(1)}" cy="${yUtil(row.utilization).toFixed(1)}" r="4"><title>${row.date}: ${row.utilization.toFixed(1)}% occupied</title></circle>`).join("");
    const labelEvery=Math.max(1,Math.ceil(chartRows.length/10));
    const labels=chartRows.map((row,index)=>index%labelEvery===0||index===chartRows.length-1?`<text class="trendDateLabel" x="${x(index).toFixed(1)}" y="${height-19}" text-anchor="middle">${esc(row.date.slice(5))}</text>`:"").join("");
    container.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily appointment and dock utilization trend">
      <line class="trendGrid" x1="${left}" y1="${top}" x2="${left}" y2="${top+plotHeight}"></line>
      <line class="trendGrid" x1="${left}" y1="${top+plotHeight}" x2="${width-right}" y2="${top+plotHeight}"></line>
      <text class="trendAxisLabel" x="${left-10}" y="${top+5}" text-anchor="end">${maxAppointments}</text>
      <text class="trendAxisLabel" x="${left-10}" y="${top+plotHeight+4}" text-anchor="end">0</text>
      <text class="trendAxisLabel" x="${width-right}" y="${top+5}" text-anchor="end">100%</text>
      ${barsSvg}<polyline class="trendUtilLine" points="${points}"></polyline>${dots}${labels}
    </svg>`;
  }

  function renderHeatmap(data){
    const openRows=(data.locationData?.operatingHours||[]).filter(row=>row.is_open);
    if(!openRows.length||!data.dockCount){$("capacityHeatmap").innerHTML=`<div class="emptyState">Operating hours or active docks are not configured.</div>`;return}
    const first=Math.min(...openRows.map(row=>minutes(String(row.open_time).slice(0,5))));
    const last=Math.max(...openRows.map(row=>minutes(String(row.close_time).slice(0,5))));
    const occupiedRows=data.all.filter(occupied);
    const cells=[];
    for(let start=first;start<last;start+=60){
      const end=Math.min(start+60,last);
      let capacity=0,used=0;
      data.dates.forEach(date=>{
        const hours=data.openDays.get(new Date(`${date}T12:00:00`).getDay());
        if(!hours?.is_open)return;
        const open=minutes(String(hours.open_time).slice(0,5)),close=minutes(String(hours.close_time).slice(0,5));
        const available=Math.max(0,Math.min(end,close)-Math.max(start,open));
        capacity+=available*data.dockCount;
        occupiedRows.filter(item=>item.date===date).forEach(item=>{
          used+=Math.max(0,Math.min(end,minutes(item.end))-Math.max(start,minutes(item.start)));
        });
      });
      const percent=capacity?Math.min(100,used/capacity*100):0;
      const level=percent>=75?"high":percent>=40?"medium":"low";
      cells.push(`<div class="heatCell ${level}" title="${percent.toFixed(1)}% occupied"><small>${esc(timeLabel(start))}</small><strong>${percent.toFixed(0)}%</strong></div>`);
    }
    $("capacityHeatmap").innerHTML=cells.join("");
  }

  function render(){
    const data=reportData();
    const bookedMinutes=data.booked.reduce((sum,item)=>sum+duration(item),0);
    const blockedMinutes=data.blocks.reduce((sum,item)=>sum+duration(item),0);
    const availableMinutes=data.dates.reduce((sum,date)=>sum+data.capacityForDate(date),0);
    const utilization=availableMinutes?(bookedMinutes+blockedMinutes)/availableMinutes*100:0;
    const cancellationRate=data.appointments.length?data.cancelled.length/data.appointments.length*100:0;
    const inbound=data.booked.filter(item=>item.direction==="Inbound").reduce((sum,item)=>sum+Number(item.skids||0),0);
    const outbound=data.booked.filter(item=>item.direction==="Outbound").reduce((sum,item)=>sum+Number(item.skids||0),0);

    $("reportMetrics").innerHTML=[
      ["Appointments",data.appointments.length],["Non-Cancelled",data.booked.length],["Cancelled",data.cancelled.length],
      ["Cancellation Rate",`${cancellationRate.toFixed(1)}%`],["Booked Hours",(bookedMinutes/60).toFixed(1)],["Occupied Capacity",`${utilization.toFixed(1)}%`],
      ["Blocked Hours",(blockedMinutes/60).toFixed(1)],["Inbound Skids",inbound],["Outbound Skids",outbound]
    ].map(([label,value])=>`<div class="metric"><small>${label}</small><strong>${value}</strong></div>`).join("");
    $("truckReport").innerHTML=bars(group(data.booked,"truck"));
    $("typeReport").innerHTML=bars(group(data.booked,"type"));

    chartRows=data.dates.map(date=>{
      const rows=data.appointments.filter(item=>item.date===date),current=rows.filter(active);
      const blocks=data.blocks.filter(item=>item.date===date);
      const occupiedMinutes=current.reduce((sum,item)=>sum+duration(item),0)+blocks.reduce((sum,item)=>sum+duration(item),0);
      const capacity=data.capacityForDate(date);
      return {date,appointments:rows.length,inbound:current.filter(item=>item.direction==="Inbound").reduce((sum,item)=>sum+Number(item.skids||0),0),outbound:current.filter(item=>item.direction==="Outbound").reduce((sum,item)=>sum+Number(item.skids||0),0),hours:(current.reduce((sum,item)=>sum+duration(item),0)/60).toFixed(1),cancelled:rows.filter(item=>item.status==="Cancelled").length,utilization:capacity?occupiedMinutes/capacity*100:0};
    });
    reportRows=chartRows.filter(row=>row.appointments>0);
    $("dailyReport").innerHTML=reportRows.length?reportRows.map(row=>`<tr><td>${row.date}</td><td>${row.appointments}</td><td>${row.inbound}</td><td>${row.outbound}</td><td>${row.hours}</td><td>${row.cancelled}</td></tr>`).join(""):`<tr><td colspan="6">No appointments in this range.</td></tr>`;
    $("reportRangeLabel").textContent=`${data.start} through ${data.end}`;
    renderTrend();renderHeatmap(data);clearError();
  }

  function renderAiBrief(result){
    const brief=result?.brief||{};
    const pressures=Array.isArray(brief.pressures)?brief.pressures:[];
    const opportunities=Array.isArray(brief.opportunities)?brief.opportunities:[];
    const actions=Array.isArray(brief.actions)?brief.actions:[];
    $("aiModeBadge").textContent=result.mode==="ai"?"AI Analysis":"MaxDock Rules Analysis";
    $("aiModeBadge").className=`aiModeBadge ${result.mode==="ai"?"ai":"rules"}`;
    $("aiBriefContent").innerHTML=`
      ${result.warning?`<div class="aiWarning">${esc(result.warning)}</div>`:""}
      <div class="aiBriefSummary"><small>${esc(brief.title||"Operations Brief")}</small><p>${esc(brief.summary||"No summary is available.")}</p></div>
      <div class="aiBriefGrid">
        <div><h4>Pressure Points</h4>${pressures.length?`<ul>${pressures.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`:`<p>No significant pressure identified.</p>`}</div>
        <div><h4>Opportunities</h4>${opportunities.length?`<ul>${opportunities.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`:`<p>No specific opportunity identified.</p>`}</div>
      </div>
      <div class="aiActions"><h4>Suggested Actions</h4>${actions.length?actions.map((item,index)=>`<article><span>${index+1}</span><div><b>${esc(item.action)}</b><p>${esc(item.reason)}</p></div><em>${esc(item.priority)}</em></article>`).join(""):`<p>No additional action suggested.</p>`}</div>`;
  }

  async function generateAiBrief(){
    const button=$("generateAiBrief");
    try{
      const data=reportData();
      button.disabled=true;button.textContent="Generating…";
      $("aiBriefContent").innerHTML=`<div class="aiLoading"><span class="loadingSpinner"></span><b>Reviewing aggregate operational data…</b></div>`;
      const result=await db.client.functions.invoke("maxdock-ai-brief",{body:{locationId:db.getCurrentLocation().id,startDate:data.start,endDate:data.end}});
      if(result.error)throw result.error;
      if(result.data?.error)throw new Error(result.data.error);
      renderAiBrief(result.data);
    }catch(error){
      $("aiBriefContent").innerHTML=`<div class="emptyState">The operations brief could not be generated.</div>`;showError(error);
    }finally{button.disabled=false;button.textContent="Generate Brief"}
  }

  function exportCsv(){
    const lines=[["Date","Appointments","Inbound Skids","Outbound Skids","Scheduled Hours","Cancelled","Occupied Capacity %"],...reportRows.map(row=>[row.date,row.appointments,row.inbound,row.outbound,row.hours,row.cancelled,row.utilization.toFixed(1)])];
    const blob=new Blob([lines.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(",")).join("\n")],{type:"text/csv"});
    const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`maxdock-report-${$("reportStart").value}-to-${$("reportEnd").value}.csv`;link.click();URL.revokeObjectURL(link.href);
  }

  async function changeLocation(){
    await db.loadLocation($("reportLocation").value);
    $("aiModeBadge").textContent="Not generated";$("aiModeBadge").className="aiModeBadge";
    $("aiBriefContent").innerHTML=`<div class="emptyState">Generate a new brief for this location and date range.</div>`;
    render();
  }

  async function init(){
    try{
      if(!await db.requireAuth())return;
      await db.loadContext();
      if(!db.hasPermission("reports.view"))throw new Error("This account cannot view operational reports.");
      db.selectLocation();db.populateLocationSelect($("reportLocation"));db.addAccountControls();
      $("reportLocation").parentElement.hidden=!["system_admin","site_admin"].includes(db.getProfile()?.role_code);
      if(db.getProfile()?.role_code!=="system_admin")document.querySelectorAll('a[href*="admin.html"]').forEach(link=>link.hidden=true);
      if(!db.hasPermission("settings.manage"))document.querySelectorAll('a[href*="settings.html"]').forEach(link=>link.hidden=true);
      if(!db.hasPermission("ai.insights"))$("generateAiBrief").hidden=true;
      const today=new Date(),monthStart=new Date(today.getFullYear(),today.getMonth(),1);
      $("reportStart").value=localISO(monthStart);$("reportEnd").value=localISO(today);
      $("reportLocation").addEventListener("change",()=>changeLocation().catch(showError));
      $("runReport").addEventListener("click",()=>{try{render()}catch(error){showError(error)}});
      $("exportReport").addEventListener("click",exportCsv);
      $("generateAiBrief").addEventListener("click",generateAiBrief);
      await db.loadLocation($("reportLocation").value);render();
    }catch(error){showError(error)}
  }
  document.addEventListener("DOMContentLoaded",init);
})();
