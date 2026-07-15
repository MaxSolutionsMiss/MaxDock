(function(){
  "use strict";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  const state={rows:[],pendingRows:[],completedRows:[],blocks:[],busyId:null};

  function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]))}
  function today(offset=0){const date=new Date();date.setDate(date.getDate()+offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
  function displayDate(value){return new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
  function displayTime(value){const [hour,minute]=String(value||"00:00").split(":").map(Number);return new Date(2000,0,1,hour,minute).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}
  function activeStatus(item){return ["Scheduled","Confirmed","Arrived","In Progress"].includes(item.status)}
  function showError(error){const box=$("queueError");box.textContent=error?.message||String(error);box.style.display="block"}
  function clearError(){$("queueError").style.display="none"}
  function minuteValue(value){const [hour,minute]=String(value||"00:00").split(":").map(Number);return hour*60+minute}
  function currentMinutes(){const now=new Date();return now.getHours()*60+now.getMinutes()}

  function queueRows(){
    const date=$("queueDate").value;
    const appointments=db.getAppointments().filter(item=>item.date===date&&item.type!=="Dock Block"&&(activeStatus(item)||item.status==="Completed")).sort((a,b)=>a.start.localeCompare(b.start));
    state.pendingRows=appointments.filter(activeStatus);
    state.completedRows=appointments.filter(item=>item.status==="Completed");
    const view=$("queueStatus").value;
    state.rows=view==="completed"?state.completedRows:view==="all"?appointments:state.pendingRows;
    state.blocks=db.getAppointments().filter(item=>item.date===date&&item.type==="Dock Block"&&item.status!=="Cancelled").sort((a,b)=>a.start.localeCompare(b.start));
    return state.rows;
  }

  function urgency(item){
    if(item.status==="Completed")return "completed";
    if($("queueDate").value!==today())return item.priority?"priority":"planned";
    const difference=minuteValue(item.start)-currentMinutes();
    if(difference<0)return "overdue";
    if(difference<=60)return "soon";
    return item.priority?"priority":"planned";
  }

  function queueCard(item){
    const level=urgency(item);
    const completed=item.status==="Completed";
    const tag=completed?"Completed":level==="overdue"?"Time passed":level==="soon"?"Due within 60 min":item.priority?"Priority":"Planned";
    const canChange=completed?db.hasPermission("appointment.update"):db.hasPermission("appointment.complete");
    return `<article class="queueCard ${level}">
      <div class="queueCardTime"><strong>${esc(displayTime(item.start))}</strong><small>${esc(displayTime(item.end))}</small></div>
      <div class="queueCardBody">
        <div class="queueCardTop"><b>${esc(item.ref)}</b><span class="queueTag">${esc(tag)}</span></div>
        <h4>${esc(item.company||"Unspecified company")}</h4>
        <div class="queueFacts">
          <span><b>Dock</b>${esc(item.dock)}</span><span><b>Vehicle</b>${esc(item.truck||"—")}</span>
          <span><b>Skids</b>${Number(item.skids||0)}</span><span><b>Handling</b>${esc(item.handling||"—")}</span>
          <span><b>Carrier</b>${esc(item.carrier||"Not provided")}</span><span><b>PO / BOL / Job</b>${esc(item.job||"—")}</span>
        </div>
        ${item.notes?`<p class="queueNotes">${esc(item.notes)}</p>`:""}
        <div class="queueCardFooter"><span class="queueState ${completed?"completed":"pending"}">${completed?"Completed":`Pending • ${esc(item.status)}`}</span>${canChange?`<button class="${completed?"secondaryBtn":"greenBtn"} queueStatusAction" type="button" data-queue-id="${esc(item.id)}" data-queue-status="${completed?"scheduled":"completed"}" ${state.busyId===item.id?"disabled":""}>${state.busyId===item.id?"Saving…":completed?"Reopen as Pending":"Mark Complete"}</button>`:""}</div>
      </div>
    </article>`;
  }

  function renderActions(rows){
    const actions=[];
    rows.forEach(item=>{
      const level=urgency(item);
      if(level==="overdue")actions.push({level:"high",text:`Confirm ${item.ref}: its scheduled time (${displayTime(item.start)}) has passed.`,meta:`${item.direction} • ${item.dock}`});
      else if(level==="soon")actions.push({level:"high",text:`Prepare ${item.dock} for ${item.ref} at ${displayTime(item.start)}.`,meta:`${item.direction} • ${item.truck} • ${item.skids} skids`});
      else if(item.priority)actions.push({level:"high",text:`Pre-stage priority appointment ${item.ref}.`,meta:`${displayTime(item.start)} • ${item.dock}`});
      if(!item.carrier)actions.push({level:"normal",text:`Confirm carrier details for ${item.ref}.`,meta:`${displayTime(item.start)} • ${item.company}`});
    });
    state.blocks.forEach(block=>actions.push({level:"high",text:`Keep ${block.dock} unavailable from ${displayTime(block.start)} to ${displayTime(block.end)}.`,meta:block.handling||"Dock restriction"}));
    const unique=actions.filter((item,index,list)=>list.findIndex(other=>other.text===item.text)===index).slice(0,10);
    $("queueActionSummary").textContent=unique.length?`${unique.length} item${unique.length===1?"":"s"} to review`:`No immediate exceptions for ${displayDate($("queueDate").value)}.`;
    $("queueActions").innerHTML=unique.length?unique.map((item,index)=>`<article class="queueAction ${item.level}"><span>${index+1}</span><div><strong>${esc(item.text)}</strong><small>${esc(item.meta)}</small></div></article>`).join(""):`<div class="queueClearState"><b>Queue is clear</b><span>Review the inbound and outbound lists below before the shift begins.</span></div>`;
  }

  function renderFocus(rows){
    const next=rows.find(item=>$("queueDate").value!==today()||minuteValue(item.end)>=currentMinutes())||rows[0];
    if(!next){$("queueFocus").innerHTML=`<div><small>${esc(displayDate($("queueDate").value))}</small><h3>No active appointments scheduled</h3><p>The location has no inbound or outbound work in the execution queue for this date.</p></div>`;return}
    $("queueFocus").innerHTML=`<div><small>Next operational focus · ${esc(displayDate($("queueDate").value))}</small><h3><span>${esc(displayTime(next.start))}</span> ${esc(next.direction)} · ${esc(next.ref)}</h3><p>${esc(next.company)} · ${esc(next.truck)} · ${Number(next.skids||0)} skids · ${esc(next.dock)}</p></div><a class="secondaryBtn actionBtn" href="./dashboard.html?v=46-db15&date=${esc($("queueDate").value)}">Open schedule</a>`;
  }

  function renderLane(direction,elementId,summaryId){
    const rows=state.rows.filter(item=>item.direction.toLowerCase()===direction);
    const skids=rows.reduce((sum,item)=>sum+Number(item.skids||0),0);
    const view=$("queueStatus").selectedOptions[0]?.textContent||"Queue";
    $(summaryId).textContent=`${rows.length} ${view.toLowerCase()} appointment${rows.length===1?"":"s"} • ${skids} skids`;
    $(elementId).innerHTML=rows.length?rows.map(queueCard).join(""):`<div class="emptyState">No ${direction} appointments for this date.</div>`;
  }

  function renderBlocks(){
    $("queueBlocksPanel").hidden=!state.blocks.length;
    $("queueBlocks").innerHTML=state.blocks.map(block=>`<article class="queueBlock"><b>${esc(block.dock)}</b><span>${esc(displayTime(block.start))}–${esc(displayTime(block.end))}</span><small>${esc(block.handling||"Dock restriction")}</small></article>`).join("");
  }

  function render(){
    clearError();
    const rows=queueRows();
    const inbound=state.pendingRows.filter(item=>item.direction==="Inbound"),outbound=state.pendingRows.filter(item=>item.direction==="Outbound");
    const totalSkids=state.pendingRows.reduce((sum,item)=>sum+Number(item.skids||0),0);
    $("queueMetrics").innerHTML=[
      ["Pending",state.pendingRows.length],["Completed",state.completedRows.length],["Inbound Pending",inbound.length],["Outbound Pending",outbound.length],["Pending Skids",totalSkids],["Dock Blocks",state.blocks.length]
    ].map(([label,value])=>`<div class="metric"><small>${label}</small><strong>${value}</strong></div>`).join("");
    renderFocus(state.pendingRows);renderActions(state.pendingRows);renderLane("inbound","inboundQueue","inboundSummary");renderLane("outbound","outboundQueue","outboundSummary");renderBlocks();
  }

  function showNotice(message){
    const notice=$("queueNotice");notice.textContent=message;notice.hidden=false;
    window.clearTimeout(showNotice.timer);showNotice.timer=window.setTimeout(()=>notice.hidden=true,5000);
  }

  async function updateQueueStatus(id,status){
    const item=db.getAppointments().find(appointment=>appointment.id===id);
    if(!item||state.busyId)return;
    try{
      state.busyId=id;render();
      await db.changeStatus(id,status,null);
      showNotice(status==="completed"?`${item.ref} marked completed.`:`${item.ref} reopened as pending.`);
    }catch(error){showError(error)}finally{state.busyId=null;render()}
  }

  function csv(){
    const lines=[["Direction","Start","End","Reference","Company","Dock","Vehicle","Skids","Handling","Carrier","PO / BOL / Job","Status"],...state.rows.map(item=>[item.direction,displayTime(item.start),displayTime(item.end),item.ref,item.company,item.dock,item.truck,item.skids,item.handling,item.carrier,item.job,item.status])];
    const content=lines.map(row=>row.map(value=>`"${String(value??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([content],{type:"text/csv"}));link.download=`maxdock-operations-queue-${$("queueDate").value}.csv`;link.click();URL.revokeObjectURL(link.href);
  }

  async function changeLocation(){await db.loadLocation($("queueLocation").value);render()}
  async function init(){
    try{
      if(!await db.requireAuth())return;
      await db.loadContext();
      if(!db.hasPermission("operations.queue.view"))throw new Error("This account cannot view the Operations Queue.");
      db.selectLocation();db.populateLocationSelect($("queueLocation"));db.addAccountControls();
      const role=db.getProfile()?.role_code;
      $("queueLocationPill").hidden=!["system_admin","site_admin"].includes(role);
      if(role!=="system_admin")document.querySelectorAll('a[href*="admin.html"]').forEach(link=>link.hidden=true);
      if(!db.hasPermission("settings.manage"))document.querySelectorAll('a[href*="settings.html"]').forEach(link=>link.hidden=true);
      $("queueDate").value=today();
      $("queueDate").addEventListener("change",render);
      $("queueStatus").addEventListener("change",render);
      $("queueLocation").addEventListener("change",()=>changeLocation().catch(showError));
      $("queueToday").addEventListener("click",()=>{$("queueDate").value=today();render()});
      $("queueTomorrow").addEventListener("click",()=>{$("queueDate").value=today(1);render()});
      $("refreshQueue").addEventListener("click",()=>changeLocation().catch(showError));
      $("printQueue").addEventListener("click",()=>window.print());
      $("exportQueue").addEventListener("click",csv);
      document.querySelectorAll(".queueCards").forEach(container=>container.addEventListener("click",event=>{
        const button=event.target.closest("[data-queue-id]");
        if(button)updateQueueStatus(button.dataset.queueId,button.dataset.queueStatus);
      }));
      await db.loadLocation($("queueLocation").value);render();
    }catch(error){showError(error)}
  }
  document.addEventListener("DOMContentLoaded",init);
})();
