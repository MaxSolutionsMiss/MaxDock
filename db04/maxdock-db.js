(function(){
  "use strict";

  const config=window.MAXDOCK_CONFIG;
  if(!config?.supabaseUrl||!config?.supabasePublishableKey){
    throw new Error("MaxDock database configuration is missing.");
  }
  if(!window.supabase?.createClient){
    throw new Error("The Supabase browser client did not load.");
  }

  const client=window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
  );

  const state={
    session:null,
    profile:null,
    permissions:new Set(),
    locations:[],
    currentLocation:null,
    locationData:null,
    appointments:[]
  };

  function message(error,fallback){
    return error?.message||fallback||"An unexpected MaxDock database error occurred.";
  }
  function normalize(value){return String(value||"").trim().toLowerCase()}
  function titleCase(value){
    return String(value||"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
  }
  function mapBy(items,key="code"){
    return new Map((items||[]).map(item=>[item[key],item]));
  }
  function mapNameToCode(masterItems){
    return new Map((masterItems||[]).map(item=>[normalize(item.name),item.code]));
  }
  function localDateTime(value,timeZone){
    const parts=new Intl.DateTimeFormat("en-CA",{
      timeZone,year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",hourCycle:"h23"
    }).formatToParts(new Date(value));
    const part=type=>parts.find(x=>x.type===type)?.value||"";
    return {date:`${part("year")}-${part("month")}-${part("day")}`,time:`${part("hour")}:${part("minute")}`};
  }
  function requireValue(value,label){
    if(value===null||value===undefined||value==="")throw new Error(`${label} is required.`);
    return value;
  }
  function throwIf(error,context){if(error)throw new Error(`${context}: ${message(error)}`)}

  async function getSession(){
    const {data,error}=await client.auth.getSession();
    throwIf(error,"Unable to read the login session");
    state.session=data.session||null;
    return state.session;
  }
  async function requireAuth(){
    const session=await getSession();
    if(!session){
      const target=encodeURIComponent(location.pathname.split("/").pop()+location.search);
      location.replace(`./login.html?return=${target}`);
      return false;
    }
    return true;
  }
  async function signIn(identifier,password){
    const login=String(identifier||"").trim().toLowerCase();
    if(!login)throw new Error("Enter your username or email address.");
    if(login.includes("@")){
      const {data,error}=await client.auth.signInWithPassword({email:login,password});
      throwIf(error,"Sign-in failed");
      state.session=data.session;
      return data;
    }

    const result=await client.functions.invoke("maxdock-invite-user",{
      body:{action:"username_login",username:login,password}
    });
    if(result.error){
      let detail="Sign-in failed. Check your username and password.";
      try{
        if(result.error.context instanceof Response){
          const payload=await result.error.context.clone().json();
          detail=payload?.error||detail;
        }
      }catch(_ignored){}
      throw new Error(detail);
    }
    if(!result.data?.accessToken||!result.data?.refreshToken){
      throw new Error(result.data?.error||"Sign-in failed. Check your username and password.");
    }
    const sessionResult=await client.auth.setSession({
      access_token:result.data.accessToken,
      refresh_token:result.data.refreshToken
    });
    throwIf(sessionResult.error,"Sign-in failed");
    state.session=sessionResult.data.session;
    return sessionResult.data;
  }
  async function signOut(){
    await client.auth.signOut();
    state.session=null;state.profile=null;state.permissions.clear();state.locations=[];
    location.replace("./login.html");
  }

  async function loadContext(){
    if(!state.session)await getSession();
    const user=state.session?.user;
    if(!user)throw new Error("No signed-in MaxDock user was found.");

    const profileResult=await client.from("profiles")
      .select("id,username,full_name,contact_email,role_code,is_active,must_change_password")
      .eq("id",user.id).single();
    throwIf(profileResult.error,"Unable to load the MaxDock user profile");
    if(!profileResult.data?.is_active)throw new Error("This MaxDock account is inactive.");
    state.profile=profileResult.data;
    if(state.profile.must_change_password&&!location.pathname.endsWith("set-password.html")){
      location.replace("./set-password.html?first=1");
      await new Promise(()=>{});
    }

    const [permissionResult,locationResult]=await Promise.all([
      client.from("role_permissions").select("permission_code").eq("role_code",state.profile.role_code),
      client.from("locations").select("id,code,name,timezone,is_active").eq("is_active",true).order("name")
    ]);
    throwIf(permissionResult.error,"Unable to load role permissions");
    throwIf(locationResult.error,"Unable to load permitted locations");
    state.permissions=new Set((permissionResult.data||[]).map(x=>x.permission_code));
    state.locations=locationResult.data||[];
    if(!state.locations.length)throw new Error("This user has no permitted MaxDock locations.");
    return state;
  }

  function selectLocation(preferredName){
    const preferred=state.locations.find(x=>normalize(x.name)===normalize(preferredName));
    state.currentLocation=preferred||state.locations[0]||null;
    return state.currentLocation;
  }

  async function fetchAppointments(){
    if(!state.currentLocation)return [];
    const result=await client.from("appointments").select("*")
      .eq("location_id",state.currentLocation.id).order("start_at",{ascending:true});
    throwIf(result.error,"Unable to load appointments");
    state.appointments=(result.data||[]).map(mapAppointment);
    return state.appointments;
  }

  function mapAppointment(row){
    const data=state.locationData||{};
    const start=localDateTime(row.start_at,state.currentLocation.timezone);
    const end=localDateTime(row.end_at,state.currentLocation.timezone);
    const dock=data.dockById?.get(row.dock_id);
    const requesterLocation=state.locations.find(x=>x.id===row.requester_location_id);
    const isBlock=row.entry_kind==="block";
    return {
      id:row.id,
      ref:row.booking_reference,
      location:state.currentLocation.name,
      date:start.date,
      start:start.time,
      end:end.time,
      dock:dock?.name||"Unassigned",
      dockId:row.dock_id,
      direction:titleCase(row.direction||"Inbound"),
      company:isBlock?`Blocked: ${row.block_reason}`:(row.company_name||requesterLocation?.name||row.requester_type||"TBD"),
      type:isBlock?"Dock Block":(data.appointmentTypeByCode?.get(row.appointment_type_code)?.name||row.appointment_type_code||""),
      truck:isBlock?"N/A":(data.truckTypeByCode?.get(row.truck_type_code)?.name||row.truck_type_code||""),
      skids:Number(row.skid_count||0),
      handling:isBlock?(row.block_reason||""):(data.handlingTypeByCode?.get(row.handling_type_code)?.name||row.handling_type_code||""),
      priority:Boolean(row.is_priority),
      name:row.requester_name||"",
      email:row.requester_email||"",
      carrier:row.carrier_name||"",
      job:row.external_reference||"",
      notes:row.notes||"",
      status:titleCase(row.status),
      created:row.created_at,
      raw:row
    };
  }

  async function loadLocation(locationName){
    const selected=selectLocation(locationName);
    if(!selected)throw new Error("No permitted location was selected.");

    const [settingsResult,hoursResult,docksResult,localTypesResult,localTrucksResult,localHandlingResult,typesResult,trucksResult,handlingResult]=await Promise.all([
      client.from("location_settings").select("*").eq("location_id",selected.id).single(),
      client.from("location_operating_hours").select("*").eq("location_id",selected.id).order("day_of_week"),
      client.from("docks").select("*").eq("location_id",selected.id).eq("is_active",true).order("sort_order"),
      client.from("location_appointment_types").select("*").eq("location_id",selected.id).eq("is_active",true),
      client.from("location_truck_types").select("*").eq("location_id",selected.id).eq("is_active",true),
      client.from("location_handling_types").select("*").eq("location_id",selected.id).eq("is_active",true),
      client.from("appointment_types").select("*").eq("is_active",true).order("sort_order"),
      client.from("truck_types").select("*").eq("is_active",true).order("sort_order"),
      client.from("handling_types").select("*").eq("is_active",true).order("sort_order")
    ]);
    [settingsResult,hoursResult,docksResult,localTypesResult,localTrucksResult,localHandlingResult,typesResult,trucksResult,handlingResult]
      .forEach((result,index)=>throwIf(result.error,["settings","operating hours","docks","location appointment types","location truck types","location handling types","appointment types","truck types","handling types"][index]));

    let dockTruckRows=[];
    if(hasPermission("settings.view")){
      const compatibilityResult=await client.from("dock_truck_types")
        .select("dock_id,location_id,truck_type_code")
        .eq("location_id",selected.id);
      throwIf(compatibilityResult.error,"Unable to load dock compatibility");
      dockTruckRows=compatibilityResult.data||[];
    }

    const masterTypes=typesResult.data||[],masterTrucks=trucksResult.data||[],masterHandling=handlingResult.data||[];
    const appointmentTypeByCode=mapBy(masterTypes),truckTypeByCode=mapBy(masterTrucks),handlingTypeByCode=mapBy(masterHandling);
    const dockRows=docksResult.data||[];
    const openDay=(hoursResult.data||[]).find(x=>x.is_open&&x.open_time&&x.close_time);
    const s=settingsResult.data;

    const legacySettings={
      open:(openDay?.open_time||"07:00").slice(0,5),
      close:(openDay?.close_time||"16:30").slice(0,5),
      interval:Number(s.slot_interval_minutes),
      buffer:Number(s.buffer_minutes),
      base:Number(s.base_minutes),
      perSkid:Number(s.minutes_per_skid),
      fullTruck:Number(s.full_truck_minimum_minutes),
      priorityMin:Number(s.priority_minimum_minutes),
      docks:dockRows.map(x=>x.name),
      truckSetup:{},typeAdj:{},handlingAdj:{}
    };
    (localTrucksResult.data||[]).forEach(x=>{
      const master=truckTypeByCode.get(x.truck_type_code);if(master)legacySettings.truckSetup[master.name]=Number(x.setup_minutes);
    });
    (localTypesResult.data||[]).forEach(x=>{
      const master=appointmentTypeByCode.get(x.appointment_type_code);if(master)legacySettings.typeAdj[master.name]=Number(x.adjustment_minutes);
    });
    (localHandlingResult.data||[]).forEach(x=>{
      const master=handlingTypeByCode.get(x.handling_type_code);if(master)legacySettings.handlingAdj[master.name]=Number(x.adjustment_minutes);
    });

    const appointmentTypes=(localTypesResult.data||[])
      .map(x=>appointmentTypeByCode.get(x.appointment_type_code)).filter(Boolean);
    const truckTypes=(localTrucksResult.data||[])
      .map(x=>truckTypeByCode.get(x.truck_type_code)).filter(Boolean);
    const handlingTypes=(localHandlingResult.data||[])
      .map(x=>handlingTypeByCode.get(x.handling_type_code)).filter(Boolean);

    state.locationData={
      settingsRow:s,operatingHours:hoursResult.data||[],dockRows,dockById:mapBy(dockRows,"id"),
      dockTruckRows,
      dockTruckCodesByDock:dockTruckRows.reduce((map,row)=>{
        if(!map.has(row.dock_id))map.set(row.dock_id,new Set());
        map.get(row.dock_id).add(row.truck_type_code);return map;
      },new Map()),
      appointmentTypeByCode,truckTypeByCode,handlingTypeByCode,
      appointmentTypes,truckTypes,handlingTypes,
      appointmentNameToCode:mapNameToCode(masterTypes),truckNameToCode:mapNameToCode(masterTrucks),handlingNameToCode:mapNameToCode(masterHandling),
      legacySettings
    };
    await fetchAppointments();
    return state.locationData;
  }

  function codeFor(map,name,label){
    const code=map?.get(normalize(name));
    return requireValue(code,label);
  }
  async function availableSlots(input){
    const data=state.locationData;
    const result=await client.rpc("list_available_appointment_slots",{
      p_location_id:state.currentLocation.id,
      p_date:input.date,
      p_appointment_type_code:codeFor(data.appointmentNameToCode,input.type,"Appointment type"),
      p_truck_type_code:codeFor(data.truckNameToCode,input.truck,"Truck type"),
      p_skid_count:Number(input.skids||0),
      p_handling_type_code:codeFor(data.handlingNameToCode,input.handling,"Handling type"),
      p_is_priority:Boolean(input.priority)
    });
    throwIf(result.error,"Unable to calculate available times");
    return (result.data||[]).map(row=>{
      const start=localDateTime(row.slot_start,state.currentLocation.timezone);
      const end=localDateTime(row.slot_end,state.currentLocation.timezone);
      return {date:start.date,start:start.time,end:end.time,startAt:row.slot_start,endAt:row.slot_end,open:Number(row.available_docks)};
    });
  }
  async function bookAppointment(input){
    const data=state.locationData;
    const requesterLocation=state.locations.find(x=>normalize(x.name)===normalize(input.requesterType));
    const result=await client.rpc("book_appointment",{
      p_location_id:state.currentLocation.id,
      p_date:input.date,
      p_start_time:input.start,
      p_direction:normalize(input.direction),
      p_requester_type:input.requesterType,
      p_appointment_type_code:codeFor(data.appointmentNameToCode,input.type,"Appointment type"),
      p_truck_type_code:codeFor(data.truckNameToCode,input.truck,"Truck type"),
      p_skid_count:Number(input.skids||0),
      p_handling_type_code:codeFor(data.handlingNameToCode,input.handling,"Handling type"),
      p_is_priority:Boolean(input.priority),
      p_requester_name:input.name,
      p_requester_email:input.email,
      p_external_reference:input.reference,
      p_company_name:input.company||null,
      p_requester_location_id:requesterLocation?.id||null,
      p_carrier_name:input.carrier||null,
      p_notes:input.notes||null
    });
    throwIf(result.error,"Unable to book the appointment");
    await fetchAppointments();
    return result.data;
  }
  async function blockDockTime(input){
    const byName=new Map((state.locationData?.dockRows||[]).map(d=>[normalize(d.name),d.id]));
    const dockIds=input.docks.map(name=>byName.get(normalize(name))).filter(Boolean);
    if(dockIds.length!==input.docks.length)throw new Error("One or more selected docks could not be found.");
    const result=await client.rpc("block_dock_time",{
      p_location_id:state.currentLocation.id,p_date:input.date,p_start_time:input.start,
      p_duration_minutes:Number(input.duration),p_dock_ids:dockIds,p_reason:input.reason,p_notes:input.notes||null
    });
    throwIf(result.error,"Unable to block dock time");
    await fetchAppointments();
    return result.data;
  }
  async function changeStatus(id,status,reason){
    const result=await client.rpc("change_appointment_status",{
      p_appointment_id:id,p_new_status:normalize(status).replace(/\s+/g,"_"),p_reason:reason||null
    });
    throwIf(result.error,"Unable to update appointment status");
    await fetchAppointments();
    return result.data;
  }

  async function updateAppointment(input){
    const result=await client.rpc("update_appointment_details",{
      p_appointment_id:input.id,
      p_date:input.date,
      p_start_time:input.start,
      p_dock_id:input.dockId,
      p_direction:input.direction,
      p_company_name:input.company||null,
      p_appointment_type_code:input.appointmentTypeCode,
      p_truck_type_code:input.truckTypeCode,
      p_skid_count:Number(input.skids),
      p_handling_type_code:input.handlingTypeCode,
      p_is_priority:Boolean(input.priority),
      p_requester_name:input.name,
      p_requester_email:input.email,
      p_carrier_name:input.carrier||null,
      p_external_reference:input.reference,
      p_notes:input.notes||null
    });
    throwIf(result.error,"Unable to edit the appointment");
    await fetchAppointments();
    return result.data;
  }

  async function saveLocationSettings(input,dockInputs){
    const locationId=state.currentLocation.id;
    const settingsUpdate=await client.from("location_settings").update({
      slot_interval_minutes:Number(input.interval),buffer_minutes:Number(input.buffer),base_minutes:Number(input.base),
      minutes_per_skid:Number(input.perSkid),full_truck_minimum_minutes:Number(input.fullTruck),
      priority_minimum_minutes:Number(input.priorityMin)
    }).eq("location_id",locationId);
    throwIf(settingsUpdate.error,"Unable to save location settings");

    const hoursUpdate=await client.from("location_operating_hours").update({
      open_time:input.open,
      close_time:input.close
    }).eq("location_id",locationId).eq("is_open",true);
    throwIf(hoursUpdate.error,"Unable to save operating hours");

    const current=state.locationData.dockRows;
    const retained=new Set(dockInputs.filter(x=>x.id).map(x=>x.id));
    const savedDocks=[];
    for(let i=0;i<dockInputs.length;i++){
      const dock=dockInputs[i],payload={name:dock.name,sort_order:i+1,is_active:true};
      const result=dock.id
        ?await client.from("docks").update(payload).eq("id",dock.id).eq("location_id",locationId).select("*").single()
        :await client.from("docks").insert({...payload,location_id:locationId}).select("*").single();
      throwIf(result.error,"Unable to save dock doors");
      savedDocks.push({...result.data,truckTypeCodes:[...new Set(dock.truckTypeCodes||[])]});
    }
    for(const dock of current.filter(x=>!retained.has(x.id))){
      const result=await client.from("docks").update({is_active:false}).eq("id",dock.id).eq("location_id",locationId);
      throwIf(result.error,"Unable to deactivate a removed dock");
    }

    const existingRows=state.locationData.dockTruckRows||[];
    for(const dock of savedDocks){
      const existing=new Set(existingRows.filter(row=>row.dock_id===dock.id).map(row=>row.truck_type_code));
      const desired=new Set(dock.truckTypeCodes);
      const removed=[...existing].filter(code=>!desired.has(code));
      const added=[...desired].filter(code=>!existing.has(code));
      if(removed.length){
        const result=await client.from("dock_truck_types").delete().eq("dock_id",dock.id).in("truck_type_code",removed);
        throwIf(result.error,`Unable to remove vehicle compatibility from ${dock.name}`);
      }
      if(added.length){
        const result=await client.from("dock_truck_types").insert(added.map(code=>({dock_id:dock.id,location_id:locationId,truck_type_code:code,created_by:state.profile.id})));
        throwIf(result.error,`Unable to add vehicle compatibility to ${dock.name}`);
      }
    }
    await loadLocation(state.currentLocation.name);
  }

  function populateLocationSelect(select){
    if(!select)return;
    select.innerHTML=state.locations.map(l=>`<option>${String(l.name).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</option>`).join("");
    select.value=state.currentLocation?.name||state.locations[0]?.name||"";
  }
  function addAccountControls(){
    const actions=document.querySelector(".headerActions");
    if(!actions||document.getElementById("maxdockAccount"))return;
    const wrap=document.createElement("div");wrap.id="maxdockAccount";wrap.className="accountControl";
    const label=document.createElement("span");label.textContent=state.profile?.full_name||state.profile?.username||"MaxDock User";
    const bell=document.createElement("a");bell.id="maxdockNotificationBell";bell.className="notificationBell";bell.href="./my-appointments.html?v=46-db12";bell.title="Open notifications";bell.setAttribute("aria-label","Open notifications");
    bell.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8.7 11a3 3 0 0 0 5.4 0H9.3Z"/></svg><b id="maxdockNotificationCount" hidden>0</b>`;
    const button=document.createElement("button");button.type="button";button.className="accountSignOut";button.textContent="Sign Out";button.addEventListener("click",signOut);
    wrap.append(label,bell,button);actions.prepend(wrap);
    bell.hidden=!hasPermission("notifications.view");
    if(hasPermission("notifications.view"))refreshNotificationBadge().catch(()=>{});
    if(!hasPermission("operations.queue.view"))document.querySelectorAll('a[href*="queue.html"]').forEach(a=>a.hidden=true);
    if(!hasPermission("settings.manage"))document.querySelectorAll('a[href*="settings.html"]').forEach(a=>a.hidden=true);
  }
  async function refreshNotificationBadge(){
    const badge=document.getElementById("maxdockNotificationCount");
    if(!badge||!state.profile||!hasPermission("notifications.view"))return 0;
    const result=await client.from("user_notifications").select("id",{count:"exact",head:true})
      .eq("user_id",state.profile.id).is("read_at",null);
    throwIf(result.error,"Unable to load notification count");
    const count=Number(result.count||0);
    badge.textContent=count>99?"99+":String(count);
    badge.hidden=count===0;
    badge.parentElement?.setAttribute("aria-label",count?`Open notifications: ${count} unread`:"Open notifications");
    return count;
  }
  function hasPermission(code){return state.permissions.has(code)}

  client.auth.onAuthStateChange((event)=>{
    if(event==="SIGNED_OUT"&&!location.pathname.endsWith("login.html"))location.replace("./login.html");
  });

  window.MaxDockDB={
    client,state,getSession,requireAuth,signIn,signOut,loadContext,selectLocation,loadLocation,
    fetchAppointments,availableSlots,bookAppointment,blockDockTime,changeStatus,updateAppointment,saveLocationSettings,
    populateLocationSelect,addAccountControls,refreshNotificationBadge,hasPermission,
    getProfile:()=>state.profile,getLocations:()=>state.locations,getCurrentLocation:()=>state.currentLocation,
    getSettings:()=>state.locationData?.legacySettings||null,getAppointments:()=>state.appointments,
    getLocationData:()=>state.locationData||null,
    getDockRows:()=>state.locationData?.dockRows||[],
    getAppointmentEditOptions:(truckTypeCode)=>({
      docks:(state.locationData?.dockRows||[]).filter(dock=>!truckTypeCode||state.locationData?.dockTruckCodesByDock?.get(dock.id)?.has(truckTypeCode)),
      appointmentTypes:state.locationData?.appointmentTypes||[],
      truckTypes:state.locationData?.truckTypes||[],
      handlingTypes:state.locationData?.handlingTypes||[]
    })
  };
})();
