(function(){
  "use strict";

  const db=window.MaxDockDB;
  let dockDraft=[];
  let slotRequestId=0;
  let editingAppointmentId=null;
  const originalOpenRequest=openRequest;
  const originalFilteredDayAppointments=filteredDayAppointments;

  function canEditAppointments(){
    return ["system_admin","site_admin","coordinator"].includes(db.getProfile()?.role_code)
      &&db.hasPermission("appointment.update");
  }
  window.canEditMaxDockAppointment=canEditAppointments;

  migrateOldData=function(){};
  loadSettings=function(){return {...defaultSettings,...(db.getSettings()||{})}};
  getAppointments=function(){return db.getAppointments()};
  saveAppointments=function(){throw new Error("MaxDock appointments are saved through the database service.")};
  filteredDayAppointments=function(){
    return originalFilteredDayAppointments().filter(appointment=>appointment.status!=="Cancelled");
  };

  function syncDatabaseState(){
    currentLocation=db.getCurrentLocation()?.name||currentLocation;
    settings={...defaultSettings,...(db.getSettings()||{})};
    const locationData=db.getLocationData();
    const allTruckCodes=(locationData?.truckTypes||[]).map(truck=>truck.code);
    dockDraft=db.getDockRows().map(dock=>({
      id:dock.id,
      name:dock.name,
      truckTypeCodes:[...(locationData?.dockTruckCodesByDock?.get(dock.id)||new Set(allTruckCodes))]
    }));
  }

  function setAppLoading(active,message="Loading MaxDock…"){
    let overlay=$("maxdockLoading");
    if(active&&!overlay){
      overlay=document.createElement("div");
      overlay.id="maxdockLoading";
      overlay.className="appLoadingOverlay";
      overlay.innerHTML=`<div class="appLoadingCard"><span class="loadingSpinner"></span><strong></strong></div>`;
      document.body.appendChild(overlay);
    }
    if(overlay){
      overlay.querySelector("strong").textContent=message;
      overlay.hidden=!active;
    }
  }

  function showFatalError(error){
    setAppLoading(false);
    const panel=document.createElement("div");
    panel.className="appFatalError";
    panel.innerHTML=`<h2>MaxDock could not start</h2><p>${esc(error?.message||error)}</p><button class="primaryBtn" onclick="location.reload()">Try Again</button>`;
    document.body.appendChild(panel);
  }

  function populateRequesterLocations(){
    const select=$("reqRequesterType");
    if(!select)return;
    const locationOptions=db.getLocations()
      .filter(location=>location.name!==currentLocation)
      .map(location=>`<option>${esc(location.name)}</option>`);
    select.innerHTML=[...locationOptions,"<option>Vendor</option>","<option>Customer</option>","<option>Other Sister Plant</option>","<option>Other</option>"].join("");
    toggleCompany();
  }

  function populateBookingLocations(){
    const select=$("reqLocation");
    if(!select)return;
    const locations=db.getLocations();
    select.innerHTML=locations.map(location=>`<option value="${esc(location.name)}">${esc(location.name)}</option>`).join("");
    select.value=currentLocation;
    if(!select.value&&locations[0])select.value=locations[0].name;
    select.disabled=locations.length<=1;
  }

  window.changeBookingLocation=async function(value){
    if(!value||value===currentLocation)return;
    await changeLocation(value);
    populateBookingLocations();
  };

  changeLocation=async function(value){
    const previous=currentLocation;
    try{
      setAppLoading(true,`Loading ${value}…`);
      await db.loadLocation(value);
      syncDatabaseState();
      localStorage.setItem(LS_LOCATION,currentLocation);
      db.populateLocationSelect($("locationSelect"));
      applyTheme(currentLocation);
      populateRequesterLocations();
      populateBookingLocations();
      selectedSlot=null;
      if(PAGE==="dashboard")renderDashboard();
      if(PAGE==="requester")renderSlots();
      if(PAGE==="settings")renderSettings();
      applyPermissions();
    }catch(err){
      alert(err.message);
      currentLocation=previous;
      db.populateLocationSelect($("locationSelect"));
      applyTheme(previous);
    }finally{
      setAppLoading(false);
    }
  };

  openRequest=function(){
    if(!db.hasPermission("appointment.create"))return alert("You do not have permission to create appointments.");
    populateBookingLocations();
    originalOpenRequest();
  };

  renderSlots=async function(){
    if(!$("slotList")||!$("reqDate"))return;
    if(!db.getCurrentLocation()){
      $("slotList").innerHTML=`<div class="notice">Loading live availability…</div>`;
      return;
    }
    const date=$("reqDate").value||todayISO();
    $("reqDate").value=date;
    const localDate=new Date(date+"T00:00:00");
    $("slotDateLabel").textContent=localDate.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"});
    const requestId=++slotRequestId;
    $("slotList").innerHTML=`<div class="notice">Checking live availability…</div>`;
    try{
      const slots=await db.availableSlots({
        date,
        type:$("reqType").value,
        truck:$("reqTruck").value,
        skids:Number($("reqSkids").value||0),
        handling:$("reqHandling").value,
        priority:$("reqPriority").value==="Yes"
      });
      if(requestId!==slotRequestId)return;
      if(selectedSlot&&!slots.some(slot=>slot.date===selectedSlot.date&&slot.start===selectedSlot.start)){
        selectedSlot=null;
        $("selectedTimeDisplay").value="";
      }
      $("slotList").innerHTML=slots.slice(0,40).map(slot=>{
        const selected=selectedSlot&&selectedSlot.date===slot.date&&selectedSlot.start===slot.start;
        return `<button type="button" class="slot ${selected?"selected":""}" data-start="${esc(slot.start)}" data-end="${esc(slot.end)}" data-date="${esc(slot.date)}" data-open="${Number(slot.open)}">
          <strong>${displayTime(slot.start)} – ${displayTime(slot.end)}</strong>
          <small>${slot.open} dock${slot.open>1?"s":""} available<br>Dock assigned by site</small>
        </button>`;
      }).join("")||`<div class="notice">No available time on this date. Try another day.</div>`;
      document.querySelectorAll(".slot[data-start]").forEach(element=>element.addEventListener("click",()=>{
        selectedSlot={date:element.dataset.date,start:element.dataset.start,end:element.dataset.end,open:Number(element.dataset.open)};
        $("selectedTimeDisplay").value=`${displayTime(selectedSlot.start)} – ${displayTime(selectedSlot.end)}`;
        document.querySelectorAll(".slot[data-start]").forEach(slot=>slot.classList.toggle("selected",slot===element));
      }));
    }catch(err){
      if(requestId!==slotRequestId)return;
      $("slotList").innerHTML=`<div class="error liveError">${esc(err.message)}</div>`;
    }
  };

  submitBooking=async function(){
    const button=document.querySelector('#step5 .greenBtn[onclick*="submitBooking"]');
    try{
      validate1();validate2();validate3();validate4();clearError(5);
      if(button){button.disabled=true;button.textContent="Booking…";}
      const requesterType=$("reqRequesterType").value;
      const usesCompany=["Vendor","Customer","Other Sister Plant","Other"].includes(requesterType);
      const result=await db.bookAppointment({
        date:selectedSlot.date,start:selectedSlot.start,direction:$("reqDirection").value,
        requesterType,type:$("reqType").value,truck:$("reqTruck").value,
        skids:Number($("reqSkids").value||0),handling:$("reqHandling").value,
        priority:$("reqPriority").value==="Yes",name:$("reqName").value.trim(),
        email:$("reqEmail").value.trim(),reference:$("reqRef").value.trim(),
        company:usesCompany?$("reqCompany").value.trim():null,
        carrier:$("reqCarrier").value.trim(),notes:$("reqNotes").value.trim()
      });
      lastBooked=getAppointments().find(appointment=>appointment.id===result.appointment_id)||{
        ref:result.booking_reference,location:currentLocation,date:selectedSlot.date,start:selectedSlot.start,end:selectedSlot.end,
        direction:$("reqDirection").value,type:$("reqType").value,truck:$("reqTruck").value,
        skids:Number($("reqSkids").value||0),job:$("reqRef").value.trim(),email:$("reqEmail").value.trim()
      };
      $("confirmBox").style.display="block";
      $("bookedRef").textContent=result.booking_reference;
      if(PAGE==="dashboard")renderDashboard();
    }catch(err){
      showError(5,err.message);
    }finally{
      if(button){button.disabled=false;button.textContent="Book Appointment";}
    }
  };

  renderAppointmentTable=function(){
    if(!$("apptTable"))return;
    const rows=filteredRangeAppointments()
      .sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start))
      .map(appointment=>{
        const actions=[];
        const isBlock=appointment.type==="Dock Block";
        const editable=canEditAppointments()&&!isBlock&&!['Completed','Cancelled','No Show'].includes(appointment.status);
        if(editable)actions.push(`<button class="tiny" onclick="openAppointmentEditor('${appointment.id}')">Edit</button>`);
        if(!["Completed","Cancelled"].includes(appointment.status)){
          if(!isBlock&&db.hasPermission("appointment.complete"))actions.push(`<button class="tiny" onclick="updateStatus('${appointment.id}','Completed')">Complete</button>`);
          if((isBlock&&db.hasPermission("block.manage"))||(!isBlock&&db.hasPermission("appointment.cancel"))){
            actions.push(`<button class="tiny" onclick="updateStatus('${appointment.id}','Cancelled')">${isBlock?"Cancel Block":"Cancel"}</button>`);
          }
        }
        return `<tr ${editable?`class="appointmentEditableRow" data-appointment-id="${esc(appointment.id)}" title="Double-click to edit"`:""}>
          <td><b>${esc(appointment.ref)}</b></td><td>${esc(appointment.date)}</td><td>${displayTime(appointment.start)}–${displayTime(appointment.end)}</td>
          <td>${esc(appointment.dock)}</td><td>${esc(appointment.company)}</td><td>${esc(appointment.type)}</td>
          <td>${esc(appointment.truck||"")} / ${esc(appointment.skids||0)}</td><td>${statusBadge(appointment.status)}</td>
          <td>${actions.join(" ")||"—"}</td>
        </tr>`;
      }).join("");
    $("apptTable").innerHTML=rows||`<tr><td colspan="9">No appointments in the selected date range.</td></tr>`;
    document.querySelectorAll(".appointmentEditableRow").forEach(row=>row.addEventListener("dblclick",event=>{
      if(event.target.closest("button"))return;
      window.openAppointmentEditor(row.dataset.appointmentId);
    }));
  };

  function fillEditSelect(id,items,selectedCode){
    const select=$(id);
    select.innerHTML=(items||[]).map(item=>`<option value="${esc(item.code||item.id)}">${esc(item.name)}</option>`).join("");
    select.value=selectedCode||"";
  }

  window.openAppointmentEditor=function(id){
    if(!canEditAppointments())return;
    const appointment=getAppointments().find(item=>item.id===id);
    if(!appointment||appointment.type==="Dock Block"||['Completed','Cancelled','No Show'].includes(appointment.status))return;
    const raw=appointment.raw||{};
    const options=db.getAppointmentEditOptions();
    editingAppointmentId=id;
    $("editAppointmentMeta").textContent=`${appointment.ref} • ${appointment.status} • ${appointment.company}`;
    $("editApptDate").min=todayISO();
    $("editApptDate").value=appointment.date;
    $("editApptStart").value=appointment.start;
    fillEditSelect("editApptType",options.appointmentTypes,raw.appointment_type_code);
    fillEditSelect("editApptTruck",options.truckTypes,raw.truck_type_code);
    fillEditSelect("editApptDock",db.getAppointmentEditOptions(raw.truck_type_code).docks,raw.dock_id);
    fillEditSelect("editApptHandling",options.handlingTypes,raw.handling_type_code);
    $("editApptDirection").value=raw.direction||String(appointment.direction||"Inbound").toLowerCase();
    $("editApptSkids").value=String(raw.skid_count??appointment.skids??0);
    $("editApptPriority").value=String(Boolean(raw.is_priority??appointment.priority));
    $("editApptCompany").value=raw.company_name||"";
    $("editApptName").value=raw.requester_name||appointment.name||"";
    $("editApptEmail").value=raw.requester_email||appointment.email||"";
    $("editApptCarrier").value=raw.carrier_name||appointment.carrier||"";
    $("editApptReference").value=raw.external_reference||appointment.job||"";
    $("editApptNotes").value=raw.notes||appointment.notes||"";
    $("editAppointmentError").textContent="";
    $("editAppointmentError").style.display="none";
    $("editAppointmentModal").classList.add("show");
    document.body.classList.add("modalOpen");
    setTimeout(()=>$("editApptDate").focus(),0);
  };

  window.syncEditDockCompatibility=function(){
    const truckCode=$("editApptTruck")?.value;
    const currentDock=$("editApptDock")?.value;
    fillEditSelect("editApptDock",db.getAppointmentEditOptions(truckCode).docks,currentDock);
  };

  window.closeAppointmentEditor=function(){
    $("editAppointmentModal")?.classList.remove("show");
    document.body.classList.remove("modalOpen");
    editingAppointmentId=null;
    $("editAppointmentForm")?.reset();
  };

  async function saveEditedAppointment(event){
    event.preventDefault();
    if(!editingAppointmentId||!canEditAppointments())return;
    const error=$("editAppointmentError");
    const button=$("saveAppointmentButton");
    error.textContent="";error.style.display="none";
    button.disabled=true;button.textContent="Saving…";
    try{
      await db.updateAppointment({
        id:editingAppointmentId,
        date:$("editApptDate").value,
        start:$("editApptStart").value,
        dockId:$("editApptDock").value,
        direction:$("editApptDirection").value,
        appointmentTypeCode:$("editApptType").value,
        truckTypeCode:$("editApptTruck").value,
        skids:Number($("editApptSkids").value||0),
        handlingTypeCode:$("editApptHandling").value,
        priority:$("editApptPriority").value==="true",
        company:$("editApptCompany").value.trim(),
        name:$("editApptName").value.trim(),
        email:$("editApptEmail").value.trim(),
        carrier:$("editApptCarrier").value.trim(),
        reference:$("editApptReference").value.trim(),
        notes:$("editApptNotes").value.trim()
      });
      window.closeAppointmentEditor();
      renderDashboard();
    }catch(err){
      error.textContent=err.message;error.style.display="block";
    }finally{
      button.disabled=false;button.textContent="Save Appointment";
    }
  }

  updateStatus=async function(id,status){
    const appointment=getAppointments().find(item=>item.id===id);
    if(!appointment)return;
    let reason=null;
    if(status==="Cancelled"){
      if(!confirm(`Cancel ${appointment.ref||appointment.company}?`))return;
      reason="Cancelled by a MaxDock administrator.";
    }else if(!confirm(`Mark ${appointment.ref||appointment.company} as completed?`)){
      return;
    }
    try{
      await db.changeStatus(id,status,reason);
      renderDashboard();
    }catch(err){
      alert(err.message);
    }
  };

  deleteAppointment=function(){
    alert("Permanent deletion is disabled. Cancel the appointment to preserve the audit history.");
  };

  submitBlockTime=async function(){
    const error=$("blockError");
    error.style.display="none";error.textContent="";
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
      const endMinutes=minutes(start)+duration;
      if(minutes(start)<minutes(settings.open)||endMinutes>minutes(settings.close)){
        throw new Error(`Block time must be within operating hours (${displayTime(settings.open)}–${displayTime(settings.close)}).`);
      }
      await db.blockDockTime({date,start,duration,docks,reason,notes});
      closeBlockModal();
      $("adminDate").value=date;
      renderDashboard();
    }catch(err){
      error.textContent=err.message;error.style.display="block";
    }
  };

  renderSettings=function(){
    if(!$("setOpen"))return;
    $("setOpen").value=settings.open;$("setClose").value=settings.close;$("setInterval").value=String(settings.interval);
    $("setBuffer").value=settings.buffer;$("setBase").value=settings.base;$("setPerSkid").value=settings.perSkid;
    $("setFullTruck").value=settings.fullTruck;$("setPriorityMin").value=settings.priorityMin;
    const truckTypes=db.getLocationData()?.truckTypes||[];
    $("docksList").innerHTML=`<div class="dockMatrixScroll"><table class="dockCompatibilityMatrix">
      <thead><tr><th>Dock Door</th>${truckTypes.map(truck=>`<th title="${esc(truck.name)}">${esc(truck.name)}</th>`).join("")}<th>Action</th></tr></thead>
      <tbody>${dockDraft.map((dock,index)=>`<tr>
        <td><input class="dockNameInput" data-dock-index="${index}" data-dock-id="${esc(dock.id||"")}" value="${esc(dock.name)}" aria-label="Dock name"></td>
        ${truckTypes.map(truck=>`<td><label class="dockMatrixCheck" title="${esc(dock.name)} accepts ${esc(truck.name)}"><input class="dockTruckCheck" type="checkbox" data-dock-index="${index}" value="${esc(truck.code)}" ${(dock.truckTypeCodes||[]).includes(truck.code)?"checked":""}><span aria-hidden="true">✓</span></label></td>`).join("")}
        <td><button class="dangerBtn dockMatrixRemove" onclick="removeDock(${index})">Remove</button></td>
      </tr>`).join("")}</tbody>
    </table></div>`;
  };

  function captureDockDraft(){
    const inputs=[...document.querySelectorAll(".dockNameInput")];
    if(inputs.length)dockDraft=inputs.map((input,index)=>({
      id:input.dataset.dockId||null,
      name:input.value.trim(),
      truckTypeCodes:[...document.querySelectorAll(`.dockTruckCheck[data-dock-index="${index}"]:checked`)].map(check=>check.value)
    }));
  }

  addDock=function(){
    captureDockDraft();
    dockDraft.push({id:null,name:`Dock ${dockDraft.length+1}`,truckTypeCodes:(db.getLocationData()?.truckTypes||[]).map(truck=>truck.code)});
    renderSettings();
  };

  removeDock=function(index){
    captureDockDraft();
    if(dockDraft.length<=1)return alert("At least one active dock is required.");
    dockDraft.splice(index,1);renderSettings();
  };

  saveSettings=async function(){
    const button=document.querySelector('[onclick="saveSettings()"]');
    try{
      if(!db.hasPermission("settings.manage")||!db.hasPermission("dock.manage"))throw new Error("Only an authorized MaxDock administrator can change these settings and dock doors.");
      captureDockDraft();
      const docks=dockDraft.map(dock=>({...dock,name:dock.name.trim(),truckTypeCodes:[...new Set(dock.truckTypeCodes||[])]})).filter(dock=>dock.name);
      if(!docks.length)throw new Error("At least one active dock is required.");
      if(new Set(docks.map(dock=>dock.name.toLowerCase())).size!==docks.length)throw new Error("Dock names must be unique.");
      settings.open=$("setOpen").value||defaultSettings.open;settings.close=$("setClose").value||defaultSettings.close;
      settings.interval=Number($("setInterval").value||15);settings.buffer=Number($("setBuffer").value||10);
      settings.base=Number($("setBase").value||10);settings.perSkid=Number($("setPerSkid").value||2);
      settings.fullTruck=Number($("setFullTruck").value||75);settings.priorityMin=Number($("setPriorityMin").value||75);
      if(minutes(settings.open)>=minutes(settings.close))throw new Error("Close time must be later than open time.");
      for(const [label,value] of [["Buffer",settings.buffer],["Base minutes",settings.base],["Minutes per skid",settings.perSkid],["Full truck minimum",settings.fullTruck],["Priority minimum",settings.priorityMin]]){
        if(!Number.isFinite(value)||value<0)throw new Error(`${label} must be zero or greater.`);
      }
      if(button){button.disabled=true;button.textContent="Saving…";}
      await db.saveLocationSettings(settings,docks);
      syncDatabaseState();renderSettings();alert("Settings saved to MaxDock.");
    }catch(err){
      alert(err.message);
    }finally{
      if(button){button.disabled=false;button.textContent="Save Settings";}
    }
  };

  resetSettings=function(){
    if(!confirm("Load the MaxDock default timing and dock names into this form? Nothing is saved until you select Save Settings."))return;
    const existing=db.getDockRows();
    const allTruckCodes=(db.getLocationData()?.truckTypes||[]).map(truck=>truck.code);
    settings=JSON.parse(JSON.stringify(defaultSettings));
    dockDraft=defaultSettings.docks.map((name,index)=>({id:existing[index]?.id||null,name,truckTypeCodes:allTruckCodes.slice()}));
    renderSettings();
  };

  function applyPermissions(){
    const roleCode=db.getProfile()?.role_code;
    const isCustomer=roleCode==="customer";
    const isOperational=db.isOperationalRole();
    const canSelectHeaderLocation=["system_admin","site_admin"].includes(roleCode);
    document.querySelectorAll(".locationPill").forEach(element=>element.hidden=!canSelectHeaderLocation);
    document.querySelectorAll(".headerActions > .ghostBtn").forEach(element=>element.hidden=isCustomer||isOperational);
    if($("facilityBadge"))$("facilityBadge").hidden=isCustomer;
    const heroHint=document.querySelector(".heroHint");
    if(heroHint&&isCustomer)heroHint.textContent="Choose a Max Solutions location and an available appointment time.";
    if(!db.hasPermission("appointment.create"))document.querySelectorAll('[onclick="openRequest()"]').forEach(element=>element.hidden=true);
    document.querySelectorAll(".operationsQueueShortcut").forEach(element=>element.hidden=!db.hasPermission("operations.queue.view"));
    if(!db.hasPermission("block.manage"))document.querySelectorAll('[onclick="openBlockModal()"]').forEach(element=>element.hidden=true);
    if(!db.hasPermission("reports.view"))document.querySelectorAll('[onclick="exportCSV()"]').forEach(element=>element.hidden=true);
    if(!db.hasPermission("appointment.view"))document.querySelectorAll('a[href*="dashboard.html"]').forEach(element=>element.hidden=true);
    if(!db.hasPermission("reports.view"))document.querySelectorAll('a[href*="reports.html"]').forEach(element=>element.hidden=true);
    if(!db.hasPermission("settings.manage"))document.querySelectorAll('a[href*="settings.html"]').forEach(element=>element.hidden=true);
    if(db.getProfile()?.role_code!=="system_admin")document.querySelectorAll('a[href*="admin.html"]').forEach(element=>element.hidden=true);
    if($("scheduleEditHint"))$("scheduleEditHint").hidden=!canEditAppointments();
    const canManageSettings=db.hasPermission("settings.manage")&&db.hasPermission("dock.manage");
    if(!canManageSettings){
      document.querySelectorAll('[onclick="saveSettings()"],[onclick="resetSettings()"],[onclick="addDock()"],.dockMatrixRemove').forEach(element=>element.hidden=true);
      document.querySelectorAll('#setOpen,#setClose,#setInterval,#setBuffer,#setBase,#setPerSkid,#setFullTruck,#setPriorityMin,.dockNameInput,.dockTruckCheck').forEach(element=>element.disabled=true);
    }
  }

  let tvRefreshTimer=null;
  let tvRefreshBusy=false;

  function updateTvStatus(message){
    const status=$("tvRefreshStatus");
    if(status)status.textContent=message;
  }

  async function refreshTvSchedule(){
    if(tvRefreshBusy||document.hidden)return;
    tvRefreshBusy=true;
    try{
      await db.fetchAppointments();
      syncDatabaseState();
      renderDashboard();
      updateTvStatus(`Live schedule · updated ${new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit",second:"2-digit"})} · refreshes every 3 seconds`);
    }catch(error){
      updateTvStatus(`Live refresh paused · ${error.message||"connection unavailable"}`);
    }finally{
      tvRefreshBusy=false;
    }
  }

  function stopTvRefresh(){
    if(tvRefreshTimer)window.clearInterval(tvRefreshTimer);
    tvRefreshTimer=null;
    tvRefreshBusy=false;
  }

  window.openTvSchedule=function(){
    const panel=$("dockSchedulePanel");
    if(!panel)return;
    document.body.classList.add("tvScheduleMode");
    panel.classList.add("tvScheduleActive");
    $("tvScheduleBar").hidden=false;
    $("tvModeButton").hidden=true;
    updateTvStatus("Live schedule · connecting…");
    if(panel.requestFullscreen&&!document.fullscreenElement)panel.requestFullscreen().catch(()=>{});
    stopTvRefresh();
    refreshTvSchedule();
    tvRefreshTimer=window.setInterval(refreshTvSchedule,3000);
  };

  window.closeTvSchedule=function(){
    const panel=$("dockSchedulePanel");
    stopTvRefresh();
    document.body.classList.remove("tvScheduleMode");
    panel?.classList.remove("tvScheduleActive");
    if($("tvScheduleBar"))$("tvScheduleBar").hidden=true;
    if($("tvModeButton"))$("tvModeButton").hidden=false;
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  };

  async function initializeDatabaseApp(){
    setAppLoading(true);
    if(!await db.requireAuth())return;
    await db.loadContext();
    if(PAGE==="requester"&&db.isOperationalRole()){
      location.replace(`./${db.getLandingPage()}`);
      return;
    }
    if(db.getProfile()?.role_code==="customer"&&PAGE!=="requester"){
      location.replace("./index.html?v=46-db14");
      return;
    }
    if(PAGE==="dashboard"&&!db.hasPermission("appointment.view"))throw new Error("This account cannot view the appointment dashboard.");
    if(PAGE==="settings"&&!db.hasPermission("settings.view"))throw new Error("This account cannot view MaxDock settings.");
    await db.loadLocation(currentLocation);
    syncDatabaseState();
    localStorage.setItem(LS_LOCATION,currentLocation);
    db.populateLocationSelect($("locationSelect"));
    db.addAccountControls();
    applyTheme(currentLocation);
    populateRequesterLocations();
    populateBookingLocations();

    if(PAGE==="dashboard"){
      const requestedDate=new URLSearchParams(location.search).get("date");
      window.scrollTo(0,0);$("adminDate").value=/^\d{4}-\d{2}-\d{2}$/.test(requestedDate||"")?requestedDate:todayISO();renderDashboard();
      $("editAppointmentForm")?.addEventListener("submit",saveEditedAppointment);
      $("editAppointmentModal")?.addEventListener("click",event=>{if(event.target===$("editAppointmentModal"))window.closeAppointmentEditor()});
      document.addEventListener("fullscreenchange",()=>{if(!document.fullscreenElement&&document.body.classList.contains("tvScheduleMode"))window.closeTvSchedule()});
    }
    if($("requestModal")){
      $("reqDate").value=$("adminDate")?.value||todayISO();toggleCompany();renderSlots();
      if(new URLSearchParams(location.search).get("open")==="request")setTimeout(openRequest,0);
    }
    if(PAGE==="settings")renderSettings();
    applyPermissions();
    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape")return;
      if(document.body.classList.contains("tvScheduleMode"))window.closeTvSchedule();
      else if($("editAppointmentModal")?.classList.contains("show"))window.closeAppointmentEditor();
    });
    setAppLoading(false);
  }

  document.addEventListener("DOMContentLoaded",()=>initializeDatabaseApp().catch(showFatalError));
})();
