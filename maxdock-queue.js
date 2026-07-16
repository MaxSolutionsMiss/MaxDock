(function(){
  "use strict";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  const query=new URLSearchParams(location.search);
  const queueDisplayMode=query.get("display")==="1";
  const DEFAULT_PREFERENCES={brief:["first","peak","docks","priority","review"],metrics:["pending","completed","inbound","outbound","skids","blocks","priority","soon"]};
  const VALID_PREFERENCES={brief:new Set(DEFAULT_PREFERENCES.brief),metrics:new Set(DEFAULT_PREFERENCES.metrics)};
  const state={rows:[],pendingRows:[],completedRows:[],blocks:[],busyId:null,
    preferences:{brief:[...DEFAULT_PREFERENCES.brief],metrics:[...DEFAULT_PREFERENCES.metrics]},
    view:{status:"pending",dateMode:"today",customDate:"",locationName:""}};

  function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]))}
  function today(offset=0){const date=new Date();date.setDate(date.getDate()+offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
  function displayDate(value){return new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
  function displayTime(value){const [hour,minute]=String(value||"00:00").split(":").map(Number);return new Date(2000,0,1,hour,minute).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}
  function activeStatus(item){return ["Scheduled","Confirmed","Arrived","In Progress"].includes(item.status)}
  function showError(error){const box=$("queueError");box.textContent=error?.message||String(error);box.style.display="block"}
  function clearError(){$("queueError").style.display="none"}
  function minuteValue(value){const [hour,minute]=String(value||"00:00").split(":").map(Number);return hour*60+minute}
  function currentMinutes(){const now=new Date();return now.getHours()*60+now.getMinutes()}

  let queueDisplayTimer=null,queueDisplayBusy=false;
  function updateQueueDisplayStatus(message){
    if($("queueDisplayStatus"))$("queueDisplayStatus").textContent=message;
  }
  function stopQueueDisplayRefresh(){
    if(queueDisplayTimer)window.clearInterval(queueDisplayTimer);
    queueDisplayTimer=null;queueDisplayBusy=false;
  }
  async function refreshQueueDisplay(){
    if(queueDisplayBusy||state.busyId||document.hidden)return;
    queueDisplayBusy=true;
    try{
      await db.fetchAppointments();
      render();
      updateQueueDisplayStatus(`${displayDate($("queueDate").value)} · ${db.getCurrentLocation()?.name||"MaxDock"} · updated ${new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"})} · refreshes every 3 seconds`);
    }catch(error){
      updateQueueDisplayStatus(`Live refresh paused · ${error.message||"connection unavailable"}`);
    }finally{queueDisplayBusy=false}
  }
  function activateQueueDisplay(requestNative=false){
    document.body.classList.add("queueDisplayMode");
    if($("queueDisplayBar"))$("queueDisplayBar").hidden=false;
    if($("openQueueDisplay"))$("openQueueDisplay").hidden=true;
    updateQueueDisplayStatus("Live queue · connecting…");
    stopQueueDisplayRefresh();
    refreshQueueDisplay();
    queueDisplayTimer=window.setInterval(refreshQueueDisplay,3000);
    if(requestNative&&document.documentElement.requestFullscreen&&!document.fullscreenElement){
      document.documentElement.requestFullscreen().catch(()=>{});
    }
  }
  window.openQueueDisplay=function(){
    const url=new URL("./queue.html",location.href);
    url.searchParams.set("v","46-db20");
    url.searchParams.set("display","1");
    url.searchParams.set("date",$("queueDate").value||today());
    url.searchParams.set("status",$("queueStatus").value||"pending");
    url.searchParams.set("location",db.getCurrentLocation()?.name||$("queueLocation").value);
    const width=Math.max(900,window.screen?.availWidth||window.innerWidth);
    const height=Math.max(650,window.screen?.availHeight||window.innerHeight);
    const left=window.screen?.availLeft||0,top=window.screen?.availTop||0;
    const displayWindow=window.open(url.toString(),"maxdockQueueDisplay",`popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
    if(displayWindow)displayWindow.focus();
    else activateQueueDisplay(true);
  };
  window.enterQueueFullscreen=function(){
    if(document.documentElement.requestFullscreen&&!document.fullscreenElement){
      document.documentElement.requestFullscreen().catch(error=>updateQueueDisplayStatus(`Full screen was not available · ${error.message||"use the browser display controls"}`));
    }
  };
  window.closeQueueDisplay=function(){
    stopQueueDisplayRefresh();
    if(queueDisplayMode){
      const closeWindow=()=>window.close();
      if(document.fullscreenElement)document.exitFullscreen().then(closeWindow).catch(closeWindow);
      else closeWindow();
      return;
    }
    document.body.classList.remove("queueDisplayMode");
    if($("queueDisplayBar"))$("queueDisplayBar").hidden=true;
    if($("openQueueDisplay"))$("openQueueDisplay").hidden=false;
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  };

  function preferenceStorageKey(){return `maxdock_queue_view_${db.getProfile()?.id||"user"}`}
  function legacyQueuePreferences(){
    try{
      const saved=JSON.parse(localStorage.getItem(preferenceStorageKey())||"{}");
      return {
        brief:Array.isArray(saved.brief)?saved.brief.filter(key=>VALID_PREFERENCES.brief.has(key)):[],
        metrics:Array.isArray(saved.metrics)?saved.metrics.filter(key=>VALID_PREFERENCES.metrics.has(key)):[]
      };
    }catch{return {}}
  }
  async function loadQueuePreferences(){
    const legacy=legacyQueuePreferences();
    const saved=await db.loadPreference("queue",{
      brief:legacy.brief?.length?legacy.brief:[...DEFAULT_PREFERENCES.brief],
      metrics:legacy.metrics?.length?legacy.metrics:[...DEFAULT_PREFERENCES.metrics],
      status:"pending",dateMode:"today",customDate:"",locationName:""
    });
    state.preferences={
      brief:Array.isArray(saved.brief)?saved.brief.filter(key=>VALID_PREFERENCES.brief.has(key)):[],
      metrics:Array.isArray(saved.metrics)?saved.metrics.filter(key=>VALID_PREFERENCES.metrics.has(key)):[]
    };
    if(!state.preferences.brief.length)state.preferences.brief=[...DEFAULT_PREFERENCES.brief];
    if(!state.preferences.metrics.length)state.preferences.metrics=[...DEFAULT_PREFERENCES.metrics];
    state.view={
      status:["pending","all","completed"].includes(saved.status)?saved.status:"pending",
      dateMode:["today","tomorrow","custom"].includes(saved.dateMode)?saved.dateMode:"today",
      customDate:/^\d{4}-\d{2}-\d{2}$/.test(saved.customDate||"")?saved.customDate:"",
      locationName:String(saved.locationName||"")
    };
    syncPreferenceControls();
  }
  function preferenceStatus(message,status){
    const element=$("queuePreferenceStatus");
    if(!element)return;
    element.textContent=message;element.dataset.status=status||"";
  }
  function currentDatePreference(){
    const value=$("queueDate").value;
    if(value===today())return {dateMode:"today",customDate:""};
    if(value===today(1))return {dateMode:"tomorrow",customDate:""};
    return {dateMode:"custom",customDate:value};
  }
  function saveQueuePreferences(){
    if(queueDisplayMode)return;
    const datePreference=currentDatePreference();
    state.view={status:$("queueStatus").value||"pending",locationName:db.getCurrentLocation()?.name||"",...datePreference};
    try{localStorage.setItem(preferenceStorageKey(),JSON.stringify(state.preferences))}catch(_ignored){}
    db.queuePreferenceSave("queue",{...state.view,brief:state.preferences.brief,metrics:state.preferences.metrics},preferenceStatus);
  }
  function syncPreferenceControls(){
    document.querySelectorAll("[data-pref-section]").forEach(input=>{input.checked=state.preferences[input.dataset.prefSection]?.includes(input.value)||false});
  }
  function updateQueuePreference(input){
    const section=input.dataset.prefSection,current=new Set(state.preferences[section]||[]);
    if(input.checked)current.add(input.value);
    else if(current.size>1)current.delete(input.value);
    else{input.checked=true;return}
    state.preferences[section]=[...current];saveQueuePreferences();render();
  }
  function resetQueuePreferences(){
    state.preferences={brief:[...DEFAULT_PREFERENCES.brief],metrics:[...DEFAULT_PREFERENCES.metrics]};
    saveQueuePreferences();syncPreferenceControls();render();
  }

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
    const historyLink=db.hasPermission("audit.view")?`<a class="secondaryBtn queueCardUtility" href="./dashboard.html?v=46-db20&amp;date=${esc($("queueDate").value)}&amp;history=${esc(item.id)}">History</a>`:"";
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
        <div class="queueCardFooter"><span class="queueState ${completed?"completed":"pending"}">${completed?"Completed":`Pending • ${esc(item.status)}`}</span><div class="queueCardActions">${historyLink}${canChange?`<button class="${completed?"secondaryBtn":"greenBtn"} queueStatusAction" type="button" data-queue-id="${esc(item.id)}" data-queue-status="${completed?"scheduled":"completed"}" ${state.busyId===item.id?"disabled":""}>${state.busyId===item.id?"Saving…":completed?"Reopen as Pending":"Mark Complete"}</button>`:""}</div></div>
      </div>
    </article>`;
  }

  function buildActions(rows){
    const actions=[];
    rows.forEach(item=>{
      const level=urgency(item);
      if(level==="overdue")actions.push({level:"high",text:`Confirm ${item.ref}: its scheduled time (${displayTime(item.start)}) has passed.`,meta:`${item.direction} • ${item.dock}`});
      else if(level==="soon")actions.push({level:"high",text:`Prepare ${item.dock} for ${item.ref} at ${displayTime(item.start)}.`,meta:`${item.direction} • ${item.truck} • ${item.skids} skids`});
      else if(item.priority)actions.push({level:"high",text:`Pre-stage priority appointment ${item.ref}.`,meta:`${displayTime(item.start)} • ${item.dock}`});
      if(!item.carrier)actions.push({level:"normal",text:`Confirm carrier details for ${item.ref}.`,meta:`${displayTime(item.start)} • ${item.company}`});
      if(!Number(item.skids||0))actions.push({level:"normal",text:`Verify the skid quantity for ${item.ref}.`,meta:`${displayTime(item.start)} • ${item.company}`});
      if(["Mixed SKUs","Requires Counting","Special Handling"].includes(item.handling))actions.push({level:"normal",text:`Plan extra handling for ${item.ref}.`,meta:`${item.handling} • ${item.skids} skids`});
    });
    state.blocks.forEach(block=>actions.push({level:"high",text:`Keep ${block.dock} unavailable from ${displayTime(block.start)} to ${displayTime(block.end)}.`,meta:block.handling||"Dock restriction"}));
    return actions.filter((item,index,list)=>list.findIndex(other=>other.text===item.text)===index).slice(0,10);
  }

  function renderActions(actions){
    const unique=actions;
    $("queueActionSummary").textContent=unique.length?`${unique.length} item${unique.length===1?"":"s"} to review`:`No immediate exceptions for ${displayDate($("queueDate").value)}.`;
    $("queueActions").innerHTML=unique.length?unique.map((item,index)=>`<article class="queueAction ${item.level}"><span>${index+1}</span><div><strong>${esc(item.text)}</strong><small>${esc(item.meta)}</small></div></article>`).join(""):`<div class="queueClearState"><b>Queue is clear</b><span>Review the inbound and outbound lists below before the shift begins.</span></div>`;
  }

  function renderMorningBrief(rows,actions){
    const skids=rows.reduce((sum,item)=>sum+Number(item.skids||0),0);
    const priority=rows.filter(item=>item.priority).length;
    const docks=new Set(rows.map(item=>item.dock).filter(Boolean));
    const buckets=new Map();
    rows.forEach(item=>{
      const hour=Math.floor(minuteValue(item.start)/60);
      const bucket=buckets.get(hour)||{hour,count:0,skids:0};
      bucket.count++;bucket.skids+=Number(item.skids||0);buckets.set(hour,bucket);
    });
    const peak=[...buckets.values()].sort((a,b)=>b.count-a.count||b.skids-a.skids||a.hour-b.hour)[0];
    const first=rows[0];
    $("morningBriefEyebrow").textContent=$("queueDate").value===today()?"Morning shift brief":"Planning brief";
    $("morningBriefTitle").textContent=rows.length?`${rows.length} planned appointment${rows.length===1?"":"s"} · ${skids} skids`:`No active appointments planned`;
    $("morningBriefSummary").textContent=first
      ?`Start with ${first.ref} at ${displayTime(first.start)} on ${first.dock}. ${actions.length?`${actions.length} item${actions.length===1?"":"s"} need review before or during the shift.`:"No immediate exceptions are showing."}`
      :`The selected date currently has no inbound or outbound execution work.`;
    const facts=[
      {key:"first",label:"First load",value:first?displayTime(first.start):"—"},
      {key:"peak",label:"Peak period",value:peak?`${displayTime(`${String(peak.hour).padStart(2,"0")}:00`)} · ${peak.count} load${peak.count===1?"":"s"}`:"—"},
      {key:"docks",label:"Doors in use",value:String(docks.size)},
      {key:"priority",label:"Priority loads",value:String(priority)},
      {key:"review",label:"Needs review",value:String(actions.length)}
    ].filter(item=>state.preferences.brief.includes(item.key));
    $("morningBriefFacts").innerHTML=facts.map(item=>`<div class="briefFact ${item.key}"><small>${esc(item.label)}</small><strong>${esc(item.value)}</strong></div>`).join("");
  }

  function renderFocus(rows){
    const next=rows.find(item=>$("queueDate").value!==today()||minuteValue(item.end)>=currentMinutes())||rows[0];
    if(!next){$("queueFocus").innerHTML=`<div><small>${esc(displayDate($("queueDate").value))}</small><h3>No active appointments scheduled</h3><p>The location has no inbound or outbound work in the execution queue for this date.</p></div>`;return}
    $("queueFocus").innerHTML=`<div><small>Next operational focus · ${esc(displayDate($("queueDate").value))}</small><h3><span>${esc(displayTime(next.start))}</span> ${esc(next.direction)} · ${esc(next.ref)}</h3><p>${esc(next.company)} · ${esc(next.truck)} · ${Number(next.skids||0)} skids · ${esc(next.dock)}</p></div><a class="secondaryBtn actionBtn" href="./dashboard.html?v=46-db20&date=${esc($("queueDate").value)}">Open schedule</a>`;
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
    const actions=buildActions(state.pendingRows);
    const metricItems=[
      {key:"pending",label:"Pending",value:state.pendingRows.length},{key:"completed",label:"Completed",value:state.completedRows.length},
      {key:"inbound",label:"Inbound",value:inbound.length},{key:"outbound",label:"Outbound",value:outbound.length},
      {key:"skids",label:"Pending skids",value:totalSkids},{key:"blocks",label:"Dock blocks",value:state.blocks.length},
      {key:"priority",label:"Priority loads",value:state.pendingRows.filter(item=>item.priority).length},
      {key:"soon",label:"Due soon",value:state.pendingRows.filter(item=>urgency(item)==="soon").length}
    ].filter(item=>state.preferences.metrics.includes(item.key));
    $("queueMetrics").innerHTML=metricItems.map(item=>`<div class="metric queueMetric ${item.key}"><small>${esc(item.label)}</small><strong>${item.value}</strong></div>`).join("");
    renderMorningBrief(state.pendingRows,actions);renderFocus(state.pendingRows);renderActions(actions);renderLane("inbound","inboundQueue","inboundSummary");renderLane("outbound","outboundQueue","outboundSummary");renderBlocks();
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

  async function changeLocation(){
    const button=$("refreshQueue"),label=button?.textContent;
    if(button){button.disabled=true;button.textContent="Refreshing…"}
    try{
      await db.loadLocation($("queueLocation").value);
      localStorage.setItem("maxdock_location",db.getCurrentLocation()?.name||$("queueLocation").value);
      render();saveQueuePreferences();
    }
    finally{if(button){button.disabled=false;button.textContent=label||"Refresh queue"}}
  }
  async function init(){
    try{
      if(!await db.requireAuth())return;
      await db.loadContext();
      if(!db.hasPermission("operations.queue.view"))throw new Error("This account cannot view the Operations Queue.");
      await loadQueuePreferences();
      const requestedLocation=query.get("location");
      db.selectLocation(requestedLocation||state.view.locationName||localStorage.getItem("maxdock_location"));db.populateLocationSelect($("queueLocation"));db.addAccountControls();
      const role=db.getProfile()?.role_code;
      $("queueLocationPill").hidden=!["system_admin","site_admin"].includes(role);
      if(role!=="system_admin")document.querySelectorAll('a[href*="admin.html"]').forEach(link=>link.hidden=true);
      if(!db.hasPermission("settings.manage"))document.querySelectorAll('a[href*="settings.html"]').forEach(link=>link.hidden=true);
      const savedDate=state.view.dateMode==="tomorrow"?today(1):state.view.dateMode==="custom"&&state.view.customDate?state.view.customDate:today();
      $("queueDate").value=/^\d{4}-\d{2}-\d{2}$/.test(query.get("date")||"")?query.get("date"):savedDate;
      $("queueStatus").value=["pending","all","completed"].includes(query.get("status"))?query.get("status"):state.view.status;
      $("queueDate").addEventListener("change",()=>{render();saveQueuePreferences()});
      $("queueStatus").addEventListener("change",()=>{render();saveQueuePreferences()});
      $("queueLocation").addEventListener("change",()=>changeLocation().catch(showError));
      $("queueToday").addEventListener("click",()=>{$("queueDate").value=today();render();saveQueuePreferences()});
      $("queueTomorrow").addEventListener("click",()=>{$("queueDate").value=today(1);render();saveQueuePreferences()});
      $("refreshQueue").addEventListener("click",()=>changeLocation().catch(showError));
      $("openQueueDisplay").addEventListener("click",window.openQueueDisplay);
      $("printQueue").addEventListener("click",()=>window.print());
      $("exportQueue").addEventListener("click",csv);
      $("queueCustomizeMenu").addEventListener("change",event=>{if(event.target.matches("[data-pref-section]"))updateQueuePreference(event.target)});
      $("resetQueuePreferences").addEventListener("click",resetQueuePreferences);
      document.querySelectorAll(".queueCards").forEach(container=>container.addEventListener("click",event=>{
        const button=event.target.closest("[data-queue-id]");
        if(button)updateQueueStatus(button.dataset.queueId,button.dataset.queueStatus);
      }));
      document.addEventListener("fullscreenchange",()=>{
        if($("queueFullscreenButton"))$("queueFullscreenButton").hidden=Boolean(document.fullscreenElement);
        if(!queueDisplayMode&&!document.fullscreenElement&&document.body.classList.contains("queueDisplayMode"))window.closeQueueDisplay();
      });
      document.addEventListener("keydown",event=>{
        if(event.key==="Escape"&&document.body.classList.contains("queueDisplayMode")&&(!queueDisplayMode||!document.fullscreenElement))window.closeQueueDisplay();
      });
      await db.loadLocation($("queueLocation").value);render();
      preferenceStatus("Saved to your login","saved");
      if(queueDisplayMode){
        document.title=`MaxDock Operations Queue — ${db.getCurrentLocation()?.name||"Display"}`;
        activateQueueDisplay(false);
      }
    }catch(error){showError(error)}
  }
  document.addEventListener("DOMContentLoaded",init);
})();
