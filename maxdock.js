
const $=id=>document.getElementById(id);
const PAGE=document.body.dataset.page||"requester";
const LS_APPTS="maxdock_appointments";
const LS_SETTINGS="maxdock_settings";
const LS_LOCATION="maxdock_location";
const todayISO=()=>new Date().toISOString().slice(0,10);

const locationThemes={
  "Mississauga":{a:"#0f2742",b:"#155e8f",c:"#0f766e",soft:"#eef7fb",soft2:"#edf5f7",ga:"rgba(103,232,249,.28)",gb:"rgba(20,184,166,.22)",gc:"rgba(21,94,143,.18)",shadow:"rgba(21,94,143,.28)"},
  "Guelph":{a:"#3b1d5a",b:"#6d28d9",c:"#4338ca",soft:"#f5f0ff",soft2:"#f3effb",ga:"rgba(196,181,253,.32)",gb:"rgba(139,92,246,.22)",gc:"rgba(67,56,202,.16)",shadow:"rgba(109,40,217,.27)"},
  "Pickering":{a:"#0c4a6e",b:"#0284c7",c:"#0891b2",soft:"#ecfeff",soft2:"#eef8fb",ga:"rgba(103,232,249,.34)",gb:"rgba(34,211,238,.20)",gc:"rgba(2,132,199,.16)",shadow:"rgba(2,132,199,.26)"},
  "Bristol":{a:"#173c2e",b:"#047857",c:"#15803d",soft:"#effcf4",soft2:"#edf8f1",ga:"rgba(134,239,172,.30)",gb:"rgba(34,197,94,.20)",gc:"rgba(4,120,87,.16)",shadow:"rgba(4,120,87,.25)"},
  "Owen Sound":{a:"#334155",b:"#0e7490",c:"#0369a1",soft:"#f1f5f9",soft2:"#edf4f7",ga:"rgba(125,211,252,.28)",gb:"rgba(56,189,248,.18)",gc:"rgba(71,85,105,.16)",shadow:"rgba(14,116,144,.25)"},
  "Concord":{a:"#5f1830",b:"#9f1239",c:"#c2410c",soft:"#fff3f2",soft2:"#fdf1ed",ga:"rgba(253,186,116,.30)",gb:"rgba(249,115,22,.18)",gc:"rgba(159,18,57,.15)",shadow:"rgba(159,18,57,.25)"},
  "Markham":{a:"#312e81",b:"#4f46e5",c:"#0f766e",soft:"#f3f4ff",soft2:"#eef5f5",ga:"rgba(165,180,252,.30)",gb:"rgba(45,212,191,.18)",gc:"rgba(79,70,229,.15)",shadow:"rgba(79,70,229,.25)"}
};

const defaultSettings={
  open:"07:00",close:"16:30",interval:15,buffer:10,base:10,perSkid:2,fullTruck:75,priorityMin:75,
  docks:["Dock 1","Dock 2"],
  truckSetup:{"53 ft Trailer":20,"48 ft Trailer":18,"26 ft Straight Truck":12,"Cube Van":8,"Courier Van":5},
  typeAdj:{"Raw Material":15,"Finished Goods":0,"Sister Plant Transfer":0,"Vendor Delivery":5,"Customer Pickup":5,"Return / Rework":15,"Other":0},
  handlingAdj:{"Standard":0,"Mixed SKUs":10,"Requires Counting":10,"Paperwork / Samples":10,"Special Handling":15}
};

let currentLocation=localStorage.getItem(LS_LOCATION)||"Mississauga";
let settings=loadSettings();
let selectedSlot=null;
let lastBooked=null;

function migrateOldData(){
  if(!localStorage.getItem(LS_APPTS)){
    for(const key of ["maxdock_v32_appointments","maxdock_v31_appointments","maxdock_v30_appointments"]){
      const val=localStorage.getItem(key);
      if(val){localStorage.setItem(LS_APPTS,val);break;}
    }
  }
  if(!localStorage.getItem(LS_SETTINGS)){
    for(const key of ["maxdock_v32_settings","maxdock_v31_settings","maxdock_v30_settings"]){
      const val=localStorage.getItem(key);
      if(val){localStorage.setItem(LS_SETTINGS,val);break;}
    }
  }
}
function applyTheme(location){
  const t=locationThemes[location]||locationThemes.Mississauga;
  const r=document.documentElement.style;
  r.setProperty("--theme-1",t.a);r.setProperty("--theme-2",t.b);r.setProperty("--theme-3",t.c);
  r.setProperty("--theme-soft",t.soft);r.setProperty("--theme-soft-2",t.soft2);
  r.setProperty("--theme-glow-a",t.ga);r.setProperty("--theme-glow-b",t.gb);r.setProperty("--theme-glow-c",t.gc);
  r.setProperty("--theme-shadow",t.shadow);
  r.setProperty("--theme-gradient",`linear-gradient(135deg,${t.a},${t.b} 56%,${t.c})`);
  if($("locationSelect"))$("locationSelect").value=location;
  if($("facilityName"))$("facilityName").textContent=`Max Solutions – ${location}`;
  if($("modalFacility"))$("modalFacility").textContent=`Max Solutions – ${location}`;
}
function changeLocation(value){
  currentLocation=value;
  localStorage.setItem(LS_LOCATION,value);
  applyTheme(value);
  if(PAGE==="dashboard")renderDashboard();
  if(PAGE==="requester")renderSlots();
}
function loadSettings(){
  try{return {...defaultSettings,...JSON.parse(localStorage.getItem(LS_SETTINGS)||"{}")}}
  catch{return {...defaultSettings}}
}
function getAppointments(){
  try{return JSON.parse(localStorage.getItem(LS_APPTS)||"[]")}
  catch{return []}
}
function saveAppointments(items){localStorage.setItem(LS_APPTS,JSON.stringify(items))}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function minutes(t){const [h,m]=t.split(":").map(Number);return h*60+m}
function hhmm(m){return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`}
function displayTime(t){const [h,m]=t.split(":").map(Number);return `${h%12||12}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`}
function overlaps(s1,e1,s2,e2){return s1<e2&&e1>s2}
function statusBadge(s){return `<span class="status ${s==="Completed"?"completed":s==="Cancelled"?"cancelled":""}">${esc(s)}</span>`}

/* Requester wizard */
function openRequest(){
  if(!$("requestModal"))return;
  $("requestModal").classList.add("show");
  $("reqDate").value=$("adminDate")?.value||todayISO();
  selectedSlot=null;
  $("selectedTimeDisplay").value="";
  $("confirmBox").style.display="none";
  showStep(1);toggleCompany();renderSlots();
}
function closeRequest(){$("requestModal")?.classList.remove("show")}
function showStep(n){
  document.querySelectorAll(".stepPanel").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".stepPill").forEach(x=>x.classList.remove("active"));
  $("step"+n)?.classList.add("active");$("pill"+n)?.classList.add("active");
  if(n===3)renderSlots();if(n===5)renderReview();
}
function showError(n,msg){const e=$("err"+n);if(e){e.textContent=msg;e.style.display="block"}}
function clearError(n){const e=$("err"+n);if(e){e.textContent="";e.style.display="none"}}
function required(id,label){const v=$(id).value.trim();if(!v)throw new Error(`${label} is required.`);return v}
function nextStep(n){
  try{
    if(n>=2)validate1();if(n>=3)validate2();if(n>=4)validate3();if(n>=5)validate4();
    showStep(n);
  }catch(err){showError(Math.max(1,n-1),err.message)}
}
function validate1(){
  clearError(1);
  if(!$("companyWrap").classList.contains("hidden"))required("reqCompany","Company / Location Name");
}
function validate2(){clearError(2);if(Number($("reqSkids").value||0)<0)throw new Error("Skids cannot be negative.")}
function validate3(){clearError(3);required("reqDate","Requested Date");if(!selectedSlot)throw new Error("Please choose an available time.")}
function validate4(){clearError(4);required("reqName","Requester Name");required("reqEmail","Requester Email");required("reqRef","PO / BOL / Job #")}
function toggleCompany(){
  if(!$("reqRequesterType"))return;
  const show=["Vendor","Customer","Other Sister Plant","Other"].includes($("reqRequesterType").value);
  $("companyWrap").classList.toggle("hidden",!show);
}
function requesterCompany(){
  const type=$("reqRequesterType").value;
  if(["Vendor","Customer","Other Sister Plant","Other"].includes(type)){
    return `${type}: ${$("reqCompany").value.trim()||"TBD"}`;
  }
  return type;
}
function calculateDuration(){
  const skids=Number($("reqSkids").value||0);
  const truck=$("reqTruck").value,type=$("reqType").value,handling=$("reqHandling").value;
  let d=settings.base+skids*settings.perSkid+(settings.truckSetup[truck]||0)+(settings.typeAdj[type]||0)+(settings.handlingAdj[handling]||0)+settings.buffer;
  if(truck.includes("53")||skids>=24)d=Math.max(d,settings.fullTruck);
  if($("reqPriority").value==="Yes")d=Math.max(d,settings.priorityMin);
  return Math.max(settings.interval,Math.ceil(d/settings.interval)*settings.interval);
}
function moveRequestDate(delta){
  const d=new Date(($("reqDate").value||todayISO())+"T00:00:00");d.setDate(d.getDate()+delta);
  $("reqDate").value=d.toISOString().slice(0,10);selectedSlot=null;$("selectedTimeDisplay").value="";renderSlots();
}
function renderSlots(){
  if(!$("slotList")||!$("reqDate"))return;
  const date=$("reqDate").value||todayISO();$("reqDate").value=date;
  const d=new Date(date+"T00:00:00");
  $("slotDateLabel").textContent=d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"});
  const duration=calculateDuration(),open=minutes(settings.open),close=minutes(settings.close);
  const appts=getAppointments().filter(a=>a.date===date&&a.location===currentLocation&&a.status!=="Cancelled");
  const slots=[];
  for(let start=open;start+duration<=close;start+=settings.interval){
    const end=start+duration;
    const free=settings.docks.filter(dock=>!appts.some(a=>a.dock===dock&&overlaps(start,end,minutes(a.start),minutes(a.end))));
    if(free.length)slots.push({date,start:hhmm(start),end:hhmm(end),dock:free[0],open:free.length});
  }
  $("slotList").innerHTML=slots.slice(0,28).map(s=>{
    const sel=selectedSlot&&selectedSlot.date===s.date&&selectedSlot.start===s.start;
    return `<div class="slot ${sel?"selected":""}" data-slot='${JSON.stringify(s)}'>
      <strong>${displayTime(s.start)} – ${displayTime(s.end)}</strong>
      <small>${s.open} dock${s.open>1?"s":""} available<br>Dock assigned by site</small>
    </div>`;
  }).join("")||`<div class="notice">No available time on this date. Try another day.</div>`;
  document.querySelectorAll(".slot[data-slot]").forEach(el=>el.addEventListener("click",()=>{
    selectedSlot=JSON.parse(el.dataset.slot);
    $("selectedTimeDisplay").value=`${displayTime(selectedSlot.start)} – ${displayTime(selectedSlot.end)}`;
    renderSlots();
  }));
}
function renderReview(){
  if(!$("reviewContent"))return;
  $("reviewContent").innerHTML=`
    <h3 class="stepTitle">Review and book</h3>
    <p class="stepIntro">Confirm the appointment details.</p>
    <div class="reviewCard"><div class="reviewRows">
      <div class="reviewItem"><b>Facility</b>Max Solutions – ${esc(currentLocation)}</div>
      <div class="reviewItem"><b>Date / Time</b>${esc(selectedSlot?.date||"")} | ${selectedSlot?displayTime(selectedSlot.start)+" – "+displayTime(selectedSlot.end):""}</div>
      <div class="reviewItem"><b>Direction</b>${esc($("reqDirection").value)}</div>
      <div class="reviewItem"><b>Appointment Type</b>${esc($("reqType").value)}</div>
      <div class="reviewItem"><b>Requester</b>${esc(requesterCompany())}</div>
      <div class="reviewItem"><b>Truck / Skids</b>${esc($("reqTruck").value)} / ${esc($("reqSkids").value)} skids</div>
      <div class="reviewItem"><b>Handling</b>${esc($("reqHandling").value)}</div>
      <div class="reviewItem"><b>Contact</b>${esc($("reqName").value)} | ${esc($("reqEmail").value)}</div>
      <div class="reviewItem"><b>PO / BOL / Job #</b>${esc($("reqRef").value)}</div>
      <div class="reviewItem"><b>Priority</b>${esc($("reqPriority").value)}</div>
    </div></div>`;
}
function submitBooking(){
  try{
    validate1();validate2();validate3();validate4();
    const items=getAppointments();
    const ref="MXD-"+String(Math.floor(1000+Math.random()*9000));
    const appt={
      id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),ref,
      location:currentLocation,date:selectedSlot.date,start:selectedSlot.start,end:selectedSlot.end,dock:selectedSlot.dock,
      direction:$("reqDirection").value,company:requesterCompany(),type:$("reqType").value,
      truck:$("reqTruck").value,skids:Number($("reqSkids").value||0),handling:$("reqHandling").value,
      priority:$("reqPriority").value==="Yes",name:$("reqName").value.trim(),email:$("reqEmail").value.trim(),
      carrier:$("reqCarrier").value.trim(),job:$("reqRef").value.trim(),notes:$("reqNotes").value.trim(),
      status:"Scheduled",created:new Date().toISOString()
    };
    items.push(appt);saveAppointments(items);lastBooked=appt;
    $("confirmBox").style.display="block";$("bookedRef").textContent=ref;if(PAGE==="dashboard")renderDashboard();
  }catch(err){showError(5,err.message)}
}
function confirmationText(){
  if(!lastBooked)return"No completed booking.";
  return `MaxDock Appointment Confirmation
Booking Reference: ${lastBooked.ref}
Facility: Max Solutions – ${lastBooked.location}
Date: ${lastBooked.date}
Time: ${displayTime(lastBooked.start)} – ${displayTime(lastBooked.end)}
Direction: ${lastBooked.direction}
Appointment Type: ${lastBooked.type}
Truck / Skids: ${lastBooked.truck} / ${lastBooked.skids}
PO / BOL / Job #: ${lastBooked.job}
Dock: Assigned by site`;
}
async function copyConfirmation(){
  try{await navigator.clipboard.writeText(confirmationText());alert("Confirmation copied.")}
  catch{alert(confirmationText())}
}
function openEmailDraft(){
  if(!lastBooked)return alert("Complete a booking first.");
  window.location.href=`mailto:${encodeURIComponent(lastBooked.email)}?subject=${encodeURIComponent("MaxDock Confirmation – "+lastBooked.ref)}&body=${encodeURIComponent(confirmationText())}`;
}

/* Dashboard */
function filteredDayAppointments(){
  const date=$("adminDate")?.value||todayISO();
  const status=$("adminStatus")?.value||"All";
  let items=getAppointments().filter(a=>a.date===date&&a.location===currentLocation);
  if(status!=="All")items=items.filter(a=>a.status===status);
  return items;
}
function renderDashboard(){
  if(!$("timelineBody"))return;
  const date=$("adminDate").value||todayISO();$("adminDate").value=date;
  const items=filteredDayAppointments();
  const allDay=getAppointments().filter(a=>a.date===date&&a.location===currentLocation);
  const activeDay=allDay.filter(a=>a.status!=="Cancelled");
  const completed=allDay.filter(a=>a.status==="Completed").length;
  const scheduled=allDay.filter(a=>a.status==="Scheduled").length;
  const priority=activeDay.filter(a=>a.priority).length;
  const inboundSkids=activeDay
    .filter(a=>a.direction==="Inbound"&&a.type!=="Dock Block")
    .reduce((sum,a)=>sum+Number(a.skids||0),0);
  const outboundSkids=activeDay
    .filter(a=>a.direction==="Outbound"&&a.type!=="Dock Block")
    .reduce((sum,a)=>sum+Number(a.skids||0),0);

  $("metrics").innerHTML=[
    ["Today",allDay.length],
    ["Scheduled",scheduled],
    ["Completed",completed],
    ["Priority",priority],
    ["Open Slots",estimateOpenSlots(date)],
    ["Inbound Skids",inboundSkids],
    ["Outbound Skids",outboundSkids]
  ].map(([k,v])=>`<div class="metric"><small>${k}</small><strong>${v}</strong></div>`).join("");

  const dateObj=new Date(date+"T00:00:00");
  if($("scheduleDateTitle")){
    $("scheduleDateTitle").textContent=dateObj.toLocaleDateString(undefined,{
      weekday:"long",month:"long",day:"numeric",year:"numeric"
    });
  }

  renderSchedule(items);
  renderAppointmentTable();
}
function changeDashboardDate(delta){
  const input=$("adminDate");
  const d=new Date((input.value||todayISO())+"T00:00:00");
  d.setDate(d.getDate()+delta);
  input.value=d.toISOString().slice(0,10);
  renderDashboard();
}
function goDashboardToday(){
  $("adminDate").value=todayISO();
  renderDashboard();
}
function renderSchedule(items){
  const open=minutes(settings.open);
  const close=minutes(settings.close);
  const scale=Number($("scheduleScale")?.value||60);

  const pxPerMinute={
    30:3.0,
    60:1.65,
    120:0.9
  }[scale]||1.65;

  const duration=Math.max(1,close-open);
  const trackWidth=Math.max(540,Math.round(duration*pxPerMinute));

  $("timelineShell").style.width=`${150+trackWidth}px`;
  $("timeRuler").style.width=`${trackWidth}px`;

  const ticks=[];
  for(let t=open;t<=close;t+=scale){
    ticks.push(t);
  }
  if(ticks[ticks.length-1]!==close)ticks.push(close);

  const finalLeft=trackWidth;
  let lastVisibleLabel=-Infinity;
  const minimumLabelGap=78;
  const finalLabelClearance=112;

  $("timeRuler").innerHTML=ticks.map((t,index)=>{
    const left=Math.max(0,Math.min(trackWidth,(t-open)*pxPerMinute));
    const isLast=index===ticks.length-1;
    let showLabel=true;

    if(!isLast){
      if(left-lastVisibleLabel<minimumLabelGap)showLabel=false;
      if(finalLeft-left<finalLabelClearance)showLabel=false;
    }

    if(showLabel&&!isLast)lastVisibleLabel=left;

    return `<div class="timeRulerTick ${isLast?"last":""} ${showLabel?"":"noLabel"}" style="left:${left}px">
      ${showLabel?`<span>${displayTime(hhmm(t))}</span>`:""}
    </div>`;
  }).join("");

  $("timelineBody").innerHTML=settings.docks.map(dock=>{
    const dockItems=items
      .filter(a=>a.dock===dock)
      .sort((a,b)=>a.start.localeCompare(b.start));

    const events=dockItems.map(a=>{
      const start=Math.max(open,minutes(a.start));
      const end=Math.min(close,minutes(a.end));
      if(end<=open||start>=close)return"";

      const left=Math.max(0,(start-open)*pxPerMinute);
      const width=Math.max(48,(end-start)*pxPerMinute);
      const cls=a.type==="Dock Block"?"blocked":
        a.status==="Completed"?"completed":
        a.status==="Cancelled"?"cancelled":
        a.direction==="Outbound"?"outbound":"inbound";

      return `<div class="scheduleEvent ${cls} ${a.priority?"priority":""}"
        style="left:${left}px;width:${width}px"
        title="${esc(a.company)} • ${displayTime(a.start)}–${displayTime(a.end)}">
        <div class="eventTime">${displayTime(a.start)}–${displayTime(a.end)}</div>
        <div class="eventCompany">${esc(a.company)}</div>
        <div class="eventMeta">${esc(a.type)} • ${esc(a.truck||"")} ${a.skids?`• ${esc(a.skids)} skids`:""}</div>
      </div>`;
    }).join("");

    return `<div class="timelineLane">
      <div class="dockLaneLabel">
        <strong>${esc(dock)}</strong>
        <small>${dockItems.length} appointment${dockItems.length===1?"":"s"}</small>
      </div>
      <div class="dockTrack" style="width:${trackWidth}px;background-size:${scale*pxPerMinute}px 100%">
        ${events}
      </div>
    </div>`;
  }).join("");
}
function renderAppointmentTable(){
  if(!$("apptTable"))return;
  const rows=getAppointments().filter(a=>a.location===currentLocation)
    .sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start))
    .map(a=>`<tr>
      <td><b>${esc(a.ref)}</b></td><td>${esc(a.date)}</td><td>${displayTime(a.start)}–${displayTime(a.end)}</td>
      <td>${esc(a.dock)}</td><td>${esc(a.company)}</td><td>${esc(a.type)}</td>
      <td>${esc(a.truck||"")} / ${esc(a.skids||0)}</td><td>${statusBadge(a.status)}</td>
      <td><button class="tiny" onclick="updateStatus('${a.id}','Completed')">Complete</button> <button class="tiny" onclick="updateStatus('${a.id}','Cancelled')">Cancel</button> <button class="tiny deleteBtn" onclick="deleteAppointment('${a.id}')">Delete</button></td>
    </tr>`).join("");
  $("apptTable").innerHTML=rows||`<tr><td colspan="9">No appointments yet.</td></tr>`;
}
function estimateOpenSlots(date){
  const open=minutes(settings.open),close=minutes(settings.close);
  const appts=getAppointments().filter(a=>a.date===date&&a.location===currentLocation&&a.status!=="Cancelled");
  let total=0;
  for(const dock of settings.docks){
    for(let s=open;s+60<=close;s+=60){
      if(!appts.some(a=>a.dock===dock&&overlaps(s,s+60,minutes(a.start),minutes(a.end))))total++;
    }
  }
  return total;
}
function updateStatus(id,status){
  const items=getAppointments();const i=items.findIndex(a=>a.id===id);
  if(i>=0){items[i].status=status;saveAppointments(items);renderDashboard()}
}

function deleteAppointment(id){
  const items=getAppointments();
  const appt=items.find(a=>a.id===id);
  if(!appt)return;
  const label=appt.ref&&appt.ref!=="BLOCK"
    ?`${appt.ref} — ${appt.company}`
    :(appt.company||"appointment");
  if(!confirm(`Delete ${label}? This cannot be undone.`))return;
  saveAppointments(items.filter(a=>a.id!==id));
  renderDashboard();
}
function openBlockModal(){
  if(!$("blockTimeModal"))return;

  $("blockDate").value=$("adminDate")?.value||todayISO();
  $("blockStart").value="12:00";
  $("blockDuration").value="60";
  $("blockReason").value="Maintenance";
  $("blockNotes").value="";
  $("blockAllDocks").checked=false;
  $("blockError").style.display="none";
  $("blockError").textContent="";

  $("blockDockOptions").innerHTML=settings.docks.map((dock,index)=>`
    <label class="blockDockOption">
      <input class="blockDockCheck" type="checkbox" value="${esc(dock)}" ${index===0?"checked":""} onchange="syncAllDockCheckbox()">
      <span>${esc(dock)}</span>
    </label>
  `).join("");

  $("blockTimeModal").classList.add("show");
}
function closeBlockModal(){
  $("blockTimeModal")?.classList.remove("show");
}
function toggleAllBlockDocks(checked){
  document.querySelectorAll(".blockDockCheck").forEach(box=>box.checked=checked);
}
function syncAllDockCheckbox(){
  const boxes=[...document.querySelectorAll(".blockDockCheck")];
  $("blockAllDocks").checked=boxes.length>0&&boxes.every(box=>box.checked);
}
function submitBlockTime(){
  const error=$("blockError");
  error.style.display="none";
  error.textContent="";

  try{
    const date=$("blockDate").value;
    const start=$("blockStart").value;
    const duration=Number($("blockDuration").value||0);
    const reason=$("blockReason").value;
    const notes=$("blockNotes").value.trim();
    const docks=[...document.querySelectorAll(".blockDockCheck:checked")].map(box=>box.value);

    if(!date)throw new Error("Please select a block date.");
    if(!start)throw new Error("Please select a start time.");
    if(!docks.length)throw new Error("Select at least one dock.");
    if(!duration)throw new Error("Please select a duration.");

    const startMinutes=minutes(start);
    const endMinutes=startMinutes+duration;
    const openMinutes=minutes(settings.open);
    const closeMinutes=minutes(settings.close);

    if(startMinutes<openMinutes||endMinutes>closeMinutes){
      throw new Error(`Block time must be within operating hours (${displayTime(settings.open)}–${displayTime(settings.close)}).`);
    }

    const existing=getAppointments().filter(a=>
      a.location===currentLocation&&
      a.date===date&&
      a.status!=="Cancelled"&&
      docks.includes(a.dock)&&
      overlaps(startMinutes,endMinutes,minutes(a.start),minutes(a.end))
    );

    if(existing.length){
      const conflictDocks=[...new Set(existing.map(a=>a.dock))].join(", ");
      throw new Error(`The selected time conflicts with an existing appointment on: ${conflictDocks}.`);
    }

    const items=getAppointments();
    const end=hhmm(endMinutes);

    docks.forEach((dock,index)=>{
      items.push({
        id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+index),
        ref:`BLOCK-${String(Math.floor(1000+Math.random()*9000))}`,
        location:currentLocation,
        date,
        start,
        end,
        dock,
        direction:"Inbound",
        company:`Blocked: ${reason}`,
        type:"Dock Block",
        truck:"N/A",
        skids:0,
        handling:reason,
        priority:false,
        status:"Scheduled",
        job:"",
        name:"",
        email:"",
        carrier:"",
        notes,
        created:new Date().toISOString()
      });
    });

    saveAppointments(items);
    closeBlockModal();
    $("adminDate").value=date;
    renderDashboard();
  }catch(err){
    error.textContent=err.message;
    error.style.display="block";
  }
}
function exportCSV(){
  const date=$("adminDate").value||todayISO();
  const rows=filteredDayAppointments();
  const headers=["Booking Reference","Location","Date","Start","End","Dock","Company / Location","Direction","Appointment Type","Truck Type","Skids","Handling","Status","Priority","PO / BOL / Job #","Requester Name","Requester Email","Carrier","Notes"];
  const csv=[headers,...rows.map(a=>[
    a.ref,a.location,a.date,a.start,a.end,a.dock,a.company,a.direction,a.type,a.truck,a.skids,a.handling,a.status,a.priority?"Yes":"No",a.job,a.name,a.email,a.carrier,a.notes
  ])].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const link=document.createElement("a");
  link.href=url;link.download=`MaxDock_${currentLocation.replace(/\s+/g,"_")}_${date}.csv`;
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}

/* Settings */
function renderSettings(){
  if(!$("setOpen"))return;
  $("setOpen").value=settings.open;$("setClose").value=settings.close;$("setInterval").value=String(settings.interval);
  $("setBuffer").value=settings.buffer;$("setBase").value=settings.base;$("setPerSkid").value=settings.perSkid;
  $("setFullTruck").value=settings.fullTruck;$("setPriorityMin").value=settings.priorityMin;
  $("docksList").innerHTML=settings.docks.map((d,i)=>`<div class="dockItem"><input class="dockNameInput" value="${esc(d)}"><button class="dangerBtn" onclick="removeDock(${i})">Remove</button></div>`).join("");
}
function addDock(){settings.docks.push(`Dock ${settings.docks.length+1}`);renderSettings()}
function removeDock(i){settings.docks.splice(i,1);renderSettings()}
function saveSettings(){
  settings.open=$("setOpen").value||defaultSettings.open;settings.close=$("setClose").value||defaultSettings.close;
  settings.interval=Number($("setInterval").value||15);settings.buffer=Number($("setBuffer").value||10);
  settings.base=Number($("setBase").value||10);settings.perSkid=Number($("setPerSkid").value||2);
  settings.fullTruck=Number($("setFullTruck").value||75);settings.priorityMin=Number($("setPriorityMin").value||75);
  settings.docks=[...document.querySelectorAll(".dockNameInput")].map(x=>x.value.trim()).filter(Boolean);
  if(!settings.docks.length)settings.docks=["Dock 1"];
  localStorage.setItem(LS_SETTINGS,JSON.stringify(settings));alert("Settings saved.");
}
function resetSettings(){
  settings=JSON.parse(JSON.stringify(defaultSettings));localStorage.setItem(LS_SETTINGS,JSON.stringify(settings));renderSettings();
}

/* Init */
document.addEventListener("DOMContentLoaded",()=>{
  migrateOldData();
  settings=loadSettings();
  applyTheme(currentLocation);

  if(PAGE==="dashboard"){
    window.scrollTo(0,0);
    $("adminDate").value=todayISO();
    renderDashboard();
  }

  if($("requestModal")){
    $("reqDate").value=$("adminDate")?.value||todayISO();
    toggleCompany();
    renderSlots();

    const params=new URLSearchParams(location.search);
    if(params.get("open")==="request")setTimeout(openRequest,0);
  }

  if(PAGE==="settings")renderSettings();
});
