(function(){
  "use strict";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  let reportRows=[];

  function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]))}
  function minutes(value){const [hour,minute]=String(value||"00:00").split(":").map(Number);return hour*60+minute}
  function eachDate(start,end){const dates=[];for(let day=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`);day<=last;day.setDate(day.getDate()+1))dates.push(day.toISOString().slice(0,10));return dates}
  function showError(error){const box=$("reportError");box.textContent=error?.message||String(error);box.style.display="block"}
  function active(item){return item.type!=="Dock Block"&&item.status!=="Cancelled"}
  function duration(item){return Math.max(0,minutes(item.end)-minutes(item.start))}
  function group(items,key){const counts=new Map();items.forEach(item=>counts.set(item[key]||"Unspecified",(counts.get(item[key]||"Unspecified")||0)+1));return [...counts].sort((a,b)=>b[1]-a[1])}
  function bars(items){const max=Math.max(1,...items.map(([,count])=>count));return items.length?items.map(([label,count])=>`<div class="reportBar"><div class="reportBarLabel"><span>${esc(label)}</span><b>${count}</b></div><div class="reportBarTrack"><i style="width:${Math.round(count/max*100)}%"></i></div></div>`).join(""):`<div class="emptyState">No data in this range.</div>`}

  function render(){
    const start=$("reportStart").value,end=$("reportEnd").value;
    if(!start||!end||start>end)throw new Error("Choose a valid report date range.");
    const all=db.getAppointments().filter(item=>item.date>=start&&item.date<=end);
    const appointments=all.filter(item=>item.type!=="Dock Block");
    const booked=appointments.filter(active);
    const cancelled=appointments.filter(item=>item.status==="Cancelled");
    const blocks=all.filter(item=>item.type==="Dock Block"&&item.status!=="Cancelled");
    const bookedMinutes=booked.reduce((sum,item)=>sum+duration(item),0);
    const blockedMinutes=blocks.reduce((sum,item)=>sum+duration(item),0);
    const locationData=db.getLocationData();
    const settings=db.getSettings();
    const openDays=new Map((locationData?.operatingHours||[]).map(row=>[Number(row.day_of_week),row]));
    const availableMinutes=eachDate(start,end).reduce((sum,date)=>{
      const hours=openDays.get(new Date(`${date}T12:00:00`).getDay());
      return sum+(!hours?.is_open?0:Math.max(0,minutes(String(hours.close_time).slice(0,5))-minutes(String(hours.open_time).slice(0,5)))*(settings?.docks?.length||0));
    },0);
    const utilization=availableMinutes?bookedMinutes/availableMinutes*100:0;
    const cancellationRate=appointments.length?cancelled.length/appointments.length*100:0;
    const inbound=booked.filter(item=>item.direction==="Inbound").reduce((sum,item)=>sum+Number(item.skids||0),0);
    const outbound=booked.filter(item=>item.direction==="Outbound").reduce((sum,item)=>sum+Number(item.skids||0),0);

    $("reportMetrics").innerHTML=[
      ["Appointments",appointments.length],["Non-Cancelled",booked.length],["Cancelled",cancelled.length],
      ["Cancellation Rate",`${cancellationRate.toFixed(1)}%`],["Booked Hours",(bookedMinutes/60).toFixed(1)],["Dock Utilization",`${utilization.toFixed(1)}%`],
      ["Blocked Hours",(blockedMinutes/60).toFixed(1)],["Inbound Skids",inbound],["Outbound Skids",outbound]
    ].map(([label,value])=>`<div class="metric"><small>${label}</small><strong>${value}</strong></div>`).join("");
    $("truckReport").innerHTML=bars(group(booked,"truck"));
    $("typeReport").innerHTML=bars(group(booked,"type"));

    reportRows=eachDate(start,end).map(date=>{
      const rows=appointments.filter(item=>item.date===date),current=rows.filter(active);
      return {date,appointments:rows.length,inbound:current.filter(item=>item.direction==="Inbound").reduce((sum,item)=>sum+Number(item.skids||0),0),outbound:current.filter(item=>item.direction==="Outbound").reduce((sum,item)=>sum+Number(item.skids||0),0),hours:(current.reduce((sum,item)=>sum+duration(item),0)/60).toFixed(1),cancelled:rows.filter(item=>item.status==="Cancelled").length};
    }).filter(row=>row.appointments>0);
    $("dailyReport").innerHTML=reportRows.length?reportRows.map(row=>`<tr><td>${row.date}</td><td>${row.appointments}</td><td>${row.inbound}</td><td>${row.outbound}</td><td>${row.hours}</td><td>${row.cancelled}</td></tr>`).join(""):`<tr><td colspan="6">No appointments in this range.</td></tr>`;
    $("reportRangeLabel").textContent=`${start} through ${end}`;
    $("reportError").style.display="none";
  }

  function exportCsv(){
    const lines=[["Date","Appointments","Inbound Skids","Outbound Skids","Scheduled Hours","Cancelled"],...reportRows.map(row=>[row.date,row.appointments,row.inbound,row.outbound,row.hours,row.cancelled])];
    const blob=new Blob([lines.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(",")).join("\n")],{type:"text/csv"});
    const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`maxdock-report-${$("reportStart").value}-to-${$("reportEnd").value}.csv`;link.click();URL.revokeObjectURL(link.href);
  }

  async function changeLocation(){
    await db.loadLocation($("reportLocation").value);render();
  }

  async function init(){
    try{
      if(!await db.requireAuth())return;
      await db.loadContext();
      if(!db.hasPermission("reports.view"))throw new Error("This account cannot view operational reports.");
      db.selectLocation();db.populateLocationSelect($("reportLocation"));db.addAccountControls();
      if(db.getProfile()?.role_code!=="system_admin")document.querySelectorAll('a[href*="admin.html"]').forEach(link=>link.hidden=true);
      if(!db.hasPermission("settings.manage"))document.querySelectorAll('a[href*="settings.html"]').forEach(link=>link.hidden=true);
      const today=new Date(),monthStart=new Date(today.getFullYear(),today.getMonth(),1);
      $("reportStart").value=monthStart.toISOString().slice(0,10);$("reportEnd").value=today.toISOString().slice(0,10);
      $("reportLocation").addEventListener("change",()=>changeLocation().catch(showError));
      $("runReport").addEventListener("click",()=>{try{render()}catch(error){showError(error)}});
      $("exportReport").addEventListener("click",exportCsv);
      await db.loadLocation($("reportLocation").value);render();
    }catch(error){showError(error)}
  }
  document.addEventListener("DOMContentLoaded",init);
})();
