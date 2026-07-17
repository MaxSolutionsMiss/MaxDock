
const $=id=>document.getElementById(id);
const PAGE=document.body.dataset.page||"requester";
const LS_APPTS="maxdock_appointments";
const LS_SETTINGS="maxdock_settings";
const LS_LOCATION="maxdock_location";
const LS_DASHBOARD_RANGE="maxdock_dashboard_range";
const LS_CUSTOM_RANGE_START="maxdock_custom_range_start";
const LS_CUSTOM_RANGE_END="maxdock_custom_range_end";
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
  capacityEnabled:false,capacityTotal:0,capacityReserve:0,capacityMode:"warn",capacityOccupied:0,capacityAsOf:null,
  docks:["Dock 1","Dock 2"],
  truckSetup:{"53 ft Trailer":20,"48 ft Trailer":18,"26 ft Straight Truck":12,"Cube Van":8,"Courier Van":5},
  typeAdj:{"Raw Material":15,"Finished Goods":0,"WIP":0,"Sister Plant Transfer":0,"Vendor Delivery":5,"Customer Pickup":5,"Return / Rework":15,"Other":0},
  handlingAdj:{"Standard":0,"Mixed SKUs":10,"Requires Counting":10,"Paperwork / Samples":10,"Special Handling":15}
};

let currentLocation=localStorage.getItem(LS_LOCATION)||"Mississauga";
let settings=loadSettings();
let selectedSlot=null;
let lastBooked=null;
let dashboardRangeMode=localStorage.getItem(LS_DASHBOARD_RANGE)||"Daily";
let dashboardCustomStart=localStorage.getItem(LS_CUSTOM_RANGE_START)||todayISO();
let dashboardCustomEnd=localStorage.getItem(LS_CUSTOM_RANGE_END)||todayISO();

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
  const customerAccount=window.MaxDockDB?.getProfile?.()?.role_code==="customer";
  const t=locationThemes[customerAccount?"Mississauga":location]||locationThemes.Mississauga;
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
function hhmm(m){const normalized=((m%1440)+1440)%1440;return `${String(Math.floor(normalized/60)).padStart(2,"0")}:${String(normalized%60).padStart(2,"0")}`}
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
function closeRequest(){window.closeEfficiencyOpportunity?.();$("requestModal")?.classList.remove("show")}
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
  required("reqLocation","Assigned location");
  const routeLabel=$("reqDirection").value==="Inbound"?"Origin":"Destination";
  required("reqRequesterType",`${routeLabel} type`);
  if($("reqRequesterType").value==="Max Solutions")required("reqDestination",routeLabel);
  else required("reqCompany",`${$("reqRequesterType").value} name`);
}
function validate2(){clearError(2);if(Number($("reqSkids").value||0)<0)throw new Error("Skids cannot be negative.")}
function validate3(){clearError(3);required("reqDate","Requested Date");if(!selectedSlot)throw new Error("Please choose an available time.")}
function validate4(){clearError(4);required("reqName","Requester Name");required("reqEmail","Requester Email");required("reqRef","PO / BOL / Job #")}
function toggleCompany(){
  if(!$("reqRequesterType"))return;
  const external=["Customer","Vendor"].includes($("reqRequesterType").value);
  $("companyWrap")?.classList.toggle("hidden",!external);
  $("internalDestinationWrap")?.classList.toggle("hidden",external);
  if($("reqCompanyLabel"))$("reqCompanyLabel").textContent=`${$("reqRequesterType").value} name *`;
  window.updateBookingRouteSummary?.();
}
function requesterCompany(){
  return window.getBookingCounterpartyName?.()||($("reqRequesterType").value==="Max Solutions"?$("reqDestination").value:$("reqCompany").value.trim());
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
      <div class="reviewItem"><b>Appointment site</b>Max Solutions – ${esc(currentLocation)}</div>
      <div class="reviewItem"><b>Route</b>${esc(window.getBookingRouteText?.()||requesterCompany())}</div>
      <div class="reviewItem"><b>Date / Time</b>${esc(selectedSlot?.date||"")} | ${selectedSlot?displayTime(selectedSlot.start)+" – "+displayTime(selectedSlot.end):""}</div>
      <div class="reviewItem"><b>Direction</b>${esc(window.getBookingDisplayDirection?.()||$("reqDirection").value)}</div>
      <div class="reviewItem"><b>Appointment Type</b>${esc($("reqType").value)}</div>
      <div class="reviewItem"><b>Route counterpart</b>${esc(requesterCompany())}</div>
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

function isoDateLocal(date){
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,"0");
  const day=String(date.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}
function dashboardDateRange(){
  const anchor=$("adminDate")?.value||todayISO();
  const d=new Date(anchor+"T00:00:00");
  let start=anchor;
  let end=anchor;

  if(dashboardRangeMode==="Weekly"){
    const mondayOffset=(d.getDay()+6)%7;
    const startDate=new Date(d);
    startDate.setDate(d.getDate()-mondayOffset);
    const endDate=new Date(startDate);
    endDate.setDate(startDate.getDate()+6);
    start=isoDateLocal(startDate);
    end=isoDateLocal(endDate);
  }else if(dashboardRangeMode==="Monthly"){
    start=isoDateLocal(new Date(d.getFullYear(),d.getMonth(),1));
    end=isoDateLocal(new Date(d.getFullYear(),d.getMonth()+1,0));
  }else if(dashboardRangeMode==="Yearly"){
    start=`${d.getFullYear()}-01-01`;
    end=`${d.getFullYear()}-12-31`;
  }else if(dashboardRangeMode==="Custom"){
    start=dashboardCustomStart||anchor;
    end=dashboardCustomEnd||anchor;
    if(start>end)[start,end]=[end,start];
  }

  return {start,end,mode:dashboardRangeMode};
}
function dashboardRangeLabel(range=dashboardDateRange()){
  const startDate=new Date(range.start+"T00:00:00");
  const endDate=new Date(range.end+"T00:00:00");
  const shortDate=date=>date.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});

  if(range.mode==="Daily")return shortDate(startDate);
  if(range.mode==="Monthly")return startDate.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  if(range.mode==="Yearly")return String(startDate.getFullYear());
  return `${shortDate(startDate)} – ${shortDate(endDate)}`;
}
function datesInRange(start,end){
  const dates=[];
  const cursor=new Date(start+"T00:00:00");
  const last=new Date(end+"T00:00:00");

  while(cursor<=last&&dates.length<3700){
    dates.push(isoDateLocal(cursor));
    cursor.setDate(cursor.getDate()+1);
  }
  return dates;
}
function filteredRangeAppointments(){
  const range=dashboardDateRange();
  const status=$("adminStatus")?.value||"All";
  let items=getAppointments().filter(a=>
    a.location===currentLocation&&
    a.date>=range.start&&
    a.date<=range.end
  );

  if(status!=="All")items=items.filter(a=>a.status===status);
  return items;
}
function setDashboardRange(mode){
  if(mode==="Custom"){
    openCustomRangeModal();
    return;
  }

  dashboardRangeMode=mode;
  localStorage.setItem(LS_DASHBOARD_RANGE,mode);
  renderDashboard();
}
function openCustomRangeModal(){
  if(!$("customRangeModal"))return;

  $("customRangeStart").value=dashboardCustomStart||todayISO();
  $("customRangeEnd").value=dashboardCustomEnd||dashboardCustomStart||todayISO();
  $("customRangeError").style.display="none";
  $("customRangeError").textContent="";
  $("customRangeModal").classList.add("show");

  setTimeout(()=>{
    if(typeof $("customRangeStart").showPicker==="function"){
      try{$("customRangeStart").showPicker()}catch{}
    }
  },80);
}
function closeCustomRangeModal(){
  $("customRangeModal")?.classList.remove("show");
  renderDashboard();
}
function applyCustomDashboardRange(){
  const error=$("customRangeError");
  error.style.display="none";
  error.textContent="";

  try{
    let start=$("customRangeStart").value;
    let end=$("customRangeEnd").value;

    if(!start)throw new Error("Please select a start date.");
    if(!end)throw new Error("Please select an end date.");

    if(start>end)[start,end]=[end,start];

    dashboardCustomStart=start;
    dashboardCustomEnd=end;
    dashboardRangeMode="Custom";

    localStorage.setItem(LS_CUSTOM_RANGE_START,start);
    localStorage.setItem(LS_CUSTOM_RANGE_END,end);
    localStorage.setItem(LS_DASHBOARD_RANGE,"Custom");

    $("customRangeModal").classList.remove("show");
    renderDashboard();
  }catch(err){
    error.textContent=err.message;
    error.style.display="block";
  }
}
function estimateOpenSlotsForRange(start,end){
  return datesInRange(start,end).reduce((total,date)=>total+estimateOpenSlots(date),0);
}

function filteredDayAppointments(){
  const date=$("adminDate")?.value||todayISO();
  const status=$("adminStatus")?.value||"All";
  let items=getAppointments().filter(a=>a.date===date&&a.location===currentLocation);
  if(status!=="All")items=items.filter(a=>a.status===status);
  return items;
}
function renderDashboard(){
  if(!$("timelineBody"))return;

  const date=$("adminDate").value||todayISO();
  $("adminDate").value=date;

  const scheduleItems=filteredDayAppointments();
  const range=dashboardDateRange();
  const rangeItems=filteredRangeAppointments();
  const appointmentRange=rangeItems.filter(a=>a.type!=="Dock Block");
  const activeRange=rangeItems.filter(a=>a.status!=="Cancelled");
  const completed=appointmentRange.filter(a=>a.status==="Completed").length;
  const scheduled=appointmentRange.filter(a=>a.status==="Scheduled").length;
  const priority=activeRange.filter(a=>a.priority).length;
  const inboundSkids=activeRange
    .filter(a=>a.direction==="Inbound"&&a.type!=="Dock Block")
    .reduce((sum,a)=>sum+Number(a.skids||0),0);
  const outboundSkids=activeRange
    .filter(a=>a.direction==="Outbound"&&a.type!=="Dock Block")
    .reduce((sum,a)=>sum+Number(a.skids||0),0);

  $("metrics").innerHTML=[
    ["Appointments",appointmentRange.length],
    ["Scheduled",scheduled],
    ["Completed",completed],
    ["Priority",priority],
    ["Open Slots",estimateOpenSlotsForRange(range.start,range.end)],
    ["Inbound Skids",inboundSkids],
    ["Outbound Skids",outboundSkids]
  ].map(([k,v])=>`<div class="metric"><small>${k}</small><strong>${v}</strong></div>`).join("")+
  `<div class="metric rangeMetric">
    <small>Date Range</small>
    <select id="dashboardRange" onchange="setDashboardRange(this.value)">
      ${["Daily","Weekly","Monthly","Yearly","Custom"].map(mode=>`<option ${dashboardRangeMode===mode?"selected":""}>${mode}</option>`).join("")}
    </select>
    ${dashboardRangeMode==="Custom"
      ?`<button class="rangeCalendarBtn" onclick="openCustomRangeModal()" title="Choose custom dates">📅 Choose Dates</button>`
      :""
    }
  </div>`;


  const dateObj=new Date(date+"T00:00:00");
  if($("scheduleDateTitle")){
    $("scheduleDateTitle").textContent=dateObj.toLocaleDateString(undefined,{
      weekday:"long",month:"long",day:"numeric",year:"numeric"
    });
  }

  if($("appointmentListTitle")){
    $("appointmentListTitle").textContent=`Appointment List — ${dashboardRangeLabel(range)}`;
  }

  renderSchedule(scheduleItems);
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
function scheduleTimeRange(start,end,compact=false){
  const startLabel=displayTime(start),endLabel=displayTime(end);
  if(!compact)return `${startLabel}–${endLabel}`;
  const startSuffix=startLabel.match(/\s([AP]M)$/i)?.[1]||"";
  const endSuffix=endLabel.match(/\s([AP]M)$/i)?.[1]||"";
  if(startSuffix&&startSuffix.toLowerCase()===endSuffix.toLowerCase()){
    return `${startLabel.replace(/\s[AP]M$/i,"")}–${endLabel}`;
  }
  return `${startLabel}–${endLabel}`;
}
function renderSchedule(items){
  const operatingOpen=minutes(settings.open);
  const operatingClose=minutes(settings.close);
  const itemStartMinutes=items.map(item=>minutes(item.start));
  const itemEndMinutes=items.map(item=>minutes(item.end)+(item.endDate&&item.endDate>item.date?1440:0));
  const earliest=itemStartMinutes.length?Math.min(...itemStartMinutes):operatingOpen;
  const latest=itemEndMinutes.length?Math.max(...itemEndMinutes):operatingClose;
  const open=Math.max(0,Math.min(operatingOpen,Math.floor(earliest/60)*60));
  const close=Math.min(2880,Math.max(operatingClose,Math.ceil(latest/60)*60));
  const scale=Number($("scheduleScale")?.value||60);

  const basePxPerMinute={
    30:3.0,
    60:1.65,
    120:0.9
  }[scale]||1.65;

  const scrollWidth=$("timelineShell")?.parentElement?.clientWidth||0;
  const duration=Math.max(1,close-open);
  const displayMode=document.body.classList.contains("tvScheduleMode");
  const labelWidth=displayMode?Math.round(Math.max(170,Math.min(240,scrollWidth*.13))):150;
  const availableTrackWidth=Math.max(540,scrollWidth-labelWidth-2);
  const preferredTrackWidth=Math.max(540,Math.round(duration*basePxPerMinute));
  const trackWidth=Math.max(availableTrackWidth,preferredTrackWidth);
  const pxPerMinute=trackWidth/duration;

  $("timelineShell").style.setProperty("--schedule-label-width",`${labelWidth}px`);
  $("timelineShell").style.width=`${labelWidth+trackWidth}px`;
  $("timeRuler").style.width=`${trackWidth}px`;

  const ticks=[];
  for(let t=open;t<=close;t+=scale){
    ticks.push(t);
  }
  if(ticks[ticks.length-1]!==close)ticks.push(close);

  const finalLeft=trackWidth;
  let lastVisibleLabel=-Infinity;
  const minimumLabelGap=80;
  const endLabelWidth=72;
  const endLabelGap=12;
  const scaleAwareClearance = scale===120 ? 180 : (scale===60 ? 150 : 120);
  const finalLabelClearance=endLabelWidth+endLabelGap;

  const regularTicks=ticks.slice(0,-1);
  const finalTick=ticks[ticks.length-1];

  const regularTickHTML=regularTicks.map((t,index)=>{
    const rawLeft=Math.max(0,Math.min(trackWidth,(t-open)*pxPerMinute));
    const nextTime=index<regularTicks.length-1 ? regularTicks[index+1] : finalTick;
    const nextLeft=Math.max(rawLeft,Math.min(trackWidth,(nextTime-open)*pxPerMinute));
    const segmentWidth=Math.max(1,nextLeft-rawLeft);
    const labelCenter=rawLeft+(segmentWidth/2);
    let showLabel=true;

    if(labelCenter-lastVisibleLabel<minimumLabelGap)showLabel=false;

    const distanceToEnd=finalLeft-labelCenter;
    const labelHalfWidth=36;

    // Preserve clean space for the closing-time label.
    if(distanceToEnd<Math.max(finalLabelClearance+labelHalfWidth, scaleAwareClearance))showLabel=false;

    if(showLabel)lastVisibleLabel=labelCenter;

    return `<div class="timeRulerTick ${showLabel?"":"noLabel"}" style="left:${rawLeft}px">
      ${showLabel?`<span class="centeredTimeLabel" style="left:${segmentWidth/2}px">${displayTime(hhmm(t))}</span>`:""}
    </div>`;
  }).join("");

  const endLabelHTML=`<div class="timeRulerEndLabel">
    <span>${displayTime(hhmm(finalTick))}</span>
  </div>`;

  $("timeRuler").innerHTML=regularTickHTML+endLabelHTML;

  const scheduleLanes=[...settings.docks];
  $("timelineBody").innerHTML=scheduleLanes.map(dock=>{
    const dockItems=items
      .filter(a=>a.dock===dock)
      .sort((a,b)=>a.start.localeCompare(b.start));

    const events=dockItems.map(a=>{
      const start=Math.max(open,minutes(a.start));
      const end=Math.min(close,minutes(a.end)+(a.endDate&&a.endDate>a.date?1440:0));
      if(end<=open||start>=close)return"";

      const left=Math.max(0,(start-open)*pxPerMinute);
      const width=Math.max(48,(end-start)*pxPerMinute);
      let timeLabel=scheduleTimeRange(a.start,a.end,displayMode);
      const displayScale=Math.max(1,Number(window.maxdockScheduleDisplayScale||1));
      const eventPaddingX=displayMode?Math.max(7,Math.min(13,8+(displayScale-1)*3)):11;
      const eventInnerWidth=Math.max(24,width-(eventPaddingX*2));
      if(displayMode&&width<92)timeLabel=displayTime(a.start).replace(":00","");
      const eventTimeFont=displayMode
        ?Math.max(10,Math.min(22,15*displayScale,eventInnerWidth/Math.max(1,timeLabel.length*.64)))
        :15;
      const eventCompanyFont=displayMode
        ?Math.max(12,Math.min(25,18*displayScale,12+(eventInnerWidth/22)))
        :18;
      const eventMetaFont=displayMode
        ?Math.max(10,Math.min(17,12*displayScale,10+(eventInnerWidth/45)))
        :12;
      const displayStyle=displayMode
        ?`;--event-time-font:${eventTimeFont.toFixed(1)}px;--event-company-font:${eventCompanyFont.toFixed(1)}px;--event-meta-font:${eventMetaFont.toFixed(1)}px;--event-pad-x:${eventPaddingX.toFixed(1)}px`
        :"";
      const cls=a.linkedMovement?"linkedMovement":
        a.type==="Dock Block"?"blocked":
        a.status==="Completed"?"completed":
        a.status==="Cancelled"?"cancelled":
        a.direction==="Outbound"?"outbound":"inbound";
      const canOpenEditor=!a.linkedMovement&&a.type!=="Dock Block"&&!['Completed','Cancelled','No Show'].includes(a.status)
        &&(!window.canEditMaxDockAppointment||window.canEditMaxDockAppointment());

      return `<div class="scheduleEvent ${cls} ${a.priority?"priority":""} ${a.afterHours?"afterHours":""} ${canOpenEditor?"appointmentEditable":""}"
        ${canOpenEditor?`data-appointment-id="${esc(a.id)}" ondblclick="openAppointmentEditor('${esc(a.id)}')"`:""}
        style="left:${left}px;width:${width}px${displayStyle}"
        title="${esc(a.routeOriginName&&a.routeDestinationName?`${a.routeOriginName} → ${a.routeDestinationName}`:a.company)} • ${displayTime(a.start)}–${displayTime(a.end)}${a.afterHours?" • After-hours staff override":""}">
        <div class="eventTime">${esc(timeLabel)}</div>
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

  const rows=filteredRangeAppointments()
    .sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start))
    .map(a=>`<tr>
      <td><b>${esc(a.ref)}</b></td><td>${esc(a.date)}</td><td>${displayTime(a.start)}–${displayTime(a.end)}</td>
      <td>${esc(a.dock)}</td><td>${esc(a.company)}</td><td>${esc(a.type)}</td>
      <td>${esc(a.truck||"")} / ${esc(a.skids||0)}</td><td>${statusBadge(a.status)}</td>
      <td><button class="tiny" onclick="updateStatus('${a.id}','Completed')">Complete</button> <button class="tiny" onclick="updateStatus('${a.id}','Cancelled')">Cancel</button> <button class="tiny deleteBtn" onclick="deleteAppointment('${a.id}')">Delete</button></td>
    </tr>`).join("");

  $("apptTable").innerHTML=rows||`<tr><td colspan="9">No appointments in the selected date range.</td></tr>`;
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
  const range=dashboardDateRange();
  const rows=filteredRangeAppointments();
  const headers=["Booking Reference","Location","Date","Start","End","Dock","Company / Location","Direction","Appointment Type","Truck Type","Skids","Handling","Status","Priority","PO / BOL / Job #","Requester Name","Requester Email","Carrier","Notes"];
  const csv=[headers,...rows.map(a=>[
    a.ref,a.location,a.date,a.start,a.end,a.dock,a.company,a.direction,a.type,a.truck,a.skids,a.handling,a.status,a.priority?"Yes":"No",a.job,a.name,a.email,a.carrier,a.notes
  ])].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");

  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=`MaxDock_${currentLocation.replace(/\s+/g,"_")}_${range.start}_to_${range.end}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

let scheduleResizeTimer=null;
window.addEventListener("resize",()=>{
  if(PAGE!=="dashboard"||!$("timelineBody"))return;
  clearTimeout(scheduleResizeTimer);
  scheduleResizeTimer=setTimeout(()=>renderDashboard(),120);
});

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
