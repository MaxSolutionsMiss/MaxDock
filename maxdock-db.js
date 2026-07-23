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
    locationDirectory:[],
    currentLocation:null,
    locationData:null,
    appointments:[]
  };
  const OPERATIONAL_ROLES=new Set(["system_admin","site_admin","shipping_manager","coordinator"]);
  const LOCATION_STORAGE_KEY="maxdock_location";
  const LIVE_REFRESH_MS=180000;
  const preferenceSaveTimers=new Map();
  let usageTimer=null;
  let usageStarted=false;
  let usageLastSampleAt=0;

  function message(error,fallback){
    return error?.message||fallback||"An unexpected MaxDock database error occurred.";
  }
  function normalize(value){return String(value||"").trim().toLowerCase()}
  function titleCase(value){
    return String(value||"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
  }
  function isOperationalRole(roleCode=state.profile?.role_code){return OPERATIONAL_ROLES.has(roleCode)}
  function isVendorProfile(profile=state.profile){
    return profile?.role_code==="customer"&&normalize(profile?.external_party_type)==="vendor";
  }
  function getLandingPage(roleCode=state.profile?.role_code){
    if(isVendorProfile())return "my-appointments.html?v=95-db73";
    if(["shipping_manager","coordinator"].includes(roleCode))return "queue.html?v=95-db73";
    if(["system_admin","site_admin"].includes(roleCode))return "dashboard.html?v=95-db73";
    return "index.html?v=95-db73";
  }
  function navigationRoute(link){
    try{return (new URL(link.href,location.href).pathname.split("/").pop()||"").replace(/\.html$/i,"")}
    catch{return ""}
  }
  function applyRoleNavigation(){
    const operational=isOperationalRole();
    const vendor=isVendorProfile();
    const systemAdmin=state.profile?.role_code==="system_admin";
    const landing=getLandingPage();
    document.body.classList.toggle("vendorPortal",vendor);
    document.body.classList.add("maxdockContextReady");
    document.querySelectorAll("a.logoLink").forEach(link=>{
      link.href=`./${landing}`;
      link.setAttribute("aria-label",vendor?"Go to My Appointments":operational?"Go to MaxDock operations":"Go to MaxDock main page");
    });
    document.querySelectorAll(".maxdockPrimaryNav a,.menu a").forEach(link=>{
      const route=navigationRoute(link);
      let allowed=true;
      if(vendor)allowed=route==="my-appointments";
      if(["admin","data"].includes(route)&&!systemAdmin)allowed=false;
      if(route==="index"&&operational)allowed=false;
      link.hidden=!allowed;
      link.setAttribute("aria-hidden",String(!allowed));
      if(!allowed)link.tabIndex=-1;
      else link.removeAttribute("tabindex");
    });
  }
  function closeGearMenus(event){
    if(event?.type==="keydown"&&event.key!=="Escape")return;
    document.querySelectorAll(".menuDetails[open]").forEach(menu=>{
      if(event?.type==="click"&&menu.contains(event.target))return;
      menu.removeAttribute("open");
    });
  }
  document.addEventListener("click",closeGearMenus);
  document.addEventListener("keydown",closeGearMenus);
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

  function startLiveRefresh(task,options={}){
    if(typeof task!=="function")throw new Error("A MaxDock live-refresh task is required.");
    let stopped=false,busy=false;
    const interval=Math.max(LIVE_REFRESH_MS,Number(options.interval||LIVE_REFRESH_MS));
    const run=async()=>{
      if(stopped||busy||(document.hidden&&!options.runWhenHidden))return;
      busy=true;
      try{await task()}
      catch(error){
        if(typeof options.onError==="function")options.onError(error);
        else console.warn("MaxDock live refresh paused",error);
      }finally{busy=false}
    };
    const timer=window.setInterval(()=>run(),interval);
    const onVisibility=()=>{if(!document.hidden)run()};
    document.addEventListener("visibilitychange",onVisibility);
    const stop=()=>{
      if(stopped)return;
      stopped=true;window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisibility);
    };
    window.addEventListener("pagehide",stop,{once:true});
    if(options.immediate)window.setTimeout(()=>run(),0);
    return stop;
  }

  function preferenceStorageKey(key){
    return `maxdock_preference_${state.session?.user?.id||"user"}_${key}`;
  }
  function readLocalPreference(key){
    try{
      const value=JSON.parse(localStorage.getItem(preferenceStorageKey(key))||"{}");
      return value&&typeof value==="object"&&!Array.isArray(value)?value:{};
    }catch{return {}}
  }
  async function loadPreference(key,defaults={}){
    const local=readLocalPreference(key);
    const fallback={...defaults,...local};
    try{
      const result=await client.rpc("get_user_preference",{p_preference_key:key});
      if(result.error)throw result.error;
      const remote=result.data&&typeof result.data==="object"&&!Array.isArray(result.data)?result.data:{};
      const value={...defaults,...remote};
      localStorage.setItem(preferenceStorageKey(key),JSON.stringify(value));
      return value;
    }catch{return fallback}
  }
  async function savePreference(key,preferences){
    const value=preferences&&typeof preferences==="object"&&!Array.isArray(preferences)?preferences:{};
    try{localStorage.setItem(preferenceStorageKey(key),JSON.stringify(value))}catch(_ignored){}
    const result=await client.rpc("save_user_preference",{p_preference_key:key,p_preferences:value});
    throwIf(result.error,"Unable to save your MaxDock view");
    return result.data||value;
  }
  function queuePreferenceSave(key,preferences,onStatus){
    if(preferenceSaveTimers.has(key))window.clearTimeout(preferenceSaveTimers.get(key));
    if(typeof onStatus==="function")onStatus("Saving view…","saving");
    preferenceSaveTimers.set(key,window.setTimeout(async()=>{
      preferenceSaveTimers.delete(key);
      try{
        await savePreference(key,preferences);
        if(typeof onStatus==="function")onStatus("Saved to your login","saved");
      }catch(error){
        if(typeof onStatus==="function")onStatus("Saved on this device","local");
        console.warn(error);
      }
    },650));
  }
  async function recordUsage(eventType,pageCode,activeSeconds=0){
    if(!state.session?.user)return;
    const result=await client.rpc("record_user_usage",{
      p_event_type:eventType,
      p_page_code:String(pageCode||"app").toLowerCase().replace(/[^a-z0-9_-]/g,"-").slice(0,40),
      p_active_seconds:Number(activeSeconds||0)
    });
    if(result.error)throw result.error;
  }
  function startUsageTracking(){
    if(usageStarted||!state.session?.user)return;
    usageStarted=true;
    usageLastSampleAt=Date.now();
    const page=String(document.body?.dataset?.page||location.pathname.split("/").pop()?.replace(/\.html$/i,"")||"app")
      .toLowerCase().replace(/[^a-z0-9_-]/g,"-").slice(0,40);
    recordUsage("page_view",page,0).catch(()=>{});
    const heartbeat=(includeHiddenInterval=false)=>{
      const now=Date.now();
      const activeSeconds=Math.min(120,Math.max(0,Math.floor((now-usageLastSampleAt)/1000)));
      usageLastSampleAt=now;
      if((document.hidden&&!includeHiddenInterval)||!state.session?.user||activeSeconds<1)return;
      const key=`maxdock_usage_heartbeat_${state.session.user.id}`;
      try{
        const previous=Number(localStorage.getItem(key)||0);
        if(now-previous<45000)return;
        localStorage.setItem(key,String(now));
      }catch(_ignored){}
      recordUsage("heartbeat",page,activeSeconds).catch(()=>{});
    };
    usageTimer=window.setInterval(heartbeat,60000);
    window.setTimeout(heartbeat,5000);
    document.addEventListener("visibilitychange",()=>{
      if(document.hidden)heartbeat(true);
      else usageLastSampleAt=Date.now();
    });
  }

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
      await recordUsage("login","login",0).catch(()=>{});
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
    await recordUsage("login","login",0).catch(()=>{});
    return sessionResult.data;
  }
  async function signOut(){
    if(usageTimer)window.clearInterval(usageTimer);
    usageTimer=null;usageStarted=false;usageLastSampleAt=0;
    await client.auth.signOut();
    state.session=null;state.profile=null;state.permissions.clear();state.locations=[];state.locationDirectory=[];
    location.replace("./login.html");
  }

  async function loadContext(){
    if(!state.session)await getSession();
    const user=state.session?.user;
    if(!user)throw new Error("No signed-in MaxDock user was found.");

    const profileResult=await client.from("profiles")
      .select("id,username,full_name,contact_email,role_code,is_active,must_change_password,external_party_type,organization_name")
      .eq("id",user.id).single();
    throwIf(profileResult.error,"Unable to load the MaxDock user profile");
    if(!profileResult.data?.is_active)throw new Error("This MaxDock account is inactive.");
    state.profile=profileResult.data;
    if(state.profile.must_change_password&&!location.pathname.endsWith("set-password.html")){
      location.replace("./set-password.html?first=1");
      await new Promise(()=>{});
    }

    const [permissionResult,locationResult,directoryResult]=await Promise.all([
      client.from("role_permissions").select("permission_code").eq("role_code",state.profile.role_code),
      client.from("locations").select("id,code,name,timezone,is_active").eq("is_active",true).order("name"),
      client.rpc("list_active_location_directory")
    ]);
    throwIf(permissionResult.error,"Unable to load role permissions");
    throwIf(locationResult.error,"Unable to load permitted locations");
    throwIf(directoryResult.error,"Unable to load the MaxDock location directory");
    state.permissions=new Set((permissionResult.data||[]).map(x=>x.permission_code));
    state.locations=locationResult.data||[];
    state.locationDirectory=directoryResult.data||[];
    if(!state.locations.length)throw new Error("This user has no permitted MaxDock locations.");
    let rememberedLocation="";
    try{rememberedLocation=localStorage.getItem(LOCATION_STORAGE_KEY)||""}catch(_ignored){}
    selectLocation(rememberedLocation);
    try{
      if(state.currentLocation?.name)localStorage.setItem(LOCATION_STORAGE_KEY,state.currentLocation.name);
    }catch(_ignored){}
    applyRoleNavigation();
    startUsageTracking();
    return state;
  }

  function selectLocation(preferredName){
    const preferred=state.locations.find(x=>normalize(x.name)===normalize(preferredName));
    state.currentLocation=preferred||state.locations[0]||null;
    return state.currentLocation;
  }

  async function fetchAppointments(){
    if(!state.currentLocation)return [];
    const result=state.profile?.role_code==="customer"
      ?await client.from("appointments").select("*").eq("location_id",state.currentLocation.id).order("start_at",{ascending:true})
      :await client.rpc("list_location_schedule",{p_location_id:state.currentLocation.id});
    throwIf(result.error,"Unable to load appointments");
    const rows=state.profile?.role_code==="customer"?(result.data||[]):(result.data||[]).map(item=>item.schedule_record||item);
    state.appointments=rows.map(mapAppointment);
    return state.appointments;
  }

  function mapAppointment(row){
    const data=state.locationData||{};
    const start=localDateTime(row.start_at,state.currentLocation.timezone);
    const end=localDateTime(row.end_at,state.currentLocation.timezone);
    const displayDockId=row.display_dock_id||row.dock_id;
    const dock=data.dockById?.get(displayDockId);
    const requesterLocation=state.locationDirectory.find(x=>x.id===row.requester_location_id);
    const linkedMovement=Boolean(row.is_linked_movement);
    const isBlock=row.entry_kind==="block";
    return {
      id:row.id,
      ref:row.booking_reference,
      location:state.currentLocation.name,
      date:start.date,
      start:start.time,
      end:end.time,
      endDate:end.date,
      dock:dock?.name||"Unassigned",
      dockId:displayDockId,
      direction:titleCase(row.display_direction||row.direction||"Inbound"),
      company:isBlock?`Blocked: ${row.block_reason}`:(row.display_counterpart_location_name||row.company_name||requesterLocation?.name||row.requester_type||"TBD"),
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
      requesterLocationId:row.requester_location_id||null,
      requesterLocationName:requesterLocation?.name||"",
      linkedMovement,
      readOnly:linkedMovement,
      physicalLocationId:row.physical_location_id||row.location_id,
      routeOriginName:row.route_origin_name||"",
      routeDestinationName:row.route_destination_name||"",
      afterHours:Boolean(row.is_after_hours_override),
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
      capacityEnabled:Boolean(s.capacity_enabled),
      capacityTotal:Number(s.skid_capacity||0),
      capacityReserve:Number(s.capacity_reserve_skids||0),
      capacityMode:s.capacity_enforcement_mode||"warn",
      capacityOccupied:Number(s.current_occupied_skids||0),
      capacityAsOf:s.inventory_as_of||null,
      capacitySource:s.capacity_last_source||"manual",
      dockAssignmentStrategy:s.dock_assignment_strategy||"balanced",
      maxConcurrentAppointments:s.max_concurrent_appointments==null?null:Number(s.max_concurrent_appointments),
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
  function internalRequesterLocation(requesterType,company){
    return state.locationDirectory.find(location=>
      normalize(location.name)===normalize(requesterType)
      || (company&&normalize(location.name)===normalize(company))
    );
  }
  async function availableSlots(input){
    const data=state.locationData;
    const requesterLocation=internalRequesterLocation(input.requesterType,input.company);
    const result=await client.rpc("list_routed_appointment_slots",{
      p_location_id:state.currentLocation.id,
      p_requester_location_id:requesterLocation?.id||null,
      p_date:input.date,
      p_direction:normalize(input.direction||"inbound"),
      p_appointment_type_code:codeFor(data.appointmentNameToCode,input.type,"Appointment type"),
      p_truck_type_code:codeFor(data.truckNameToCode,input.truck,"Truck type"),
      p_skid_count:Number(input.skids||0),
      p_handling_type_code:codeFor(data.handlingNameToCode,input.handling,"Handling type"),
      p_is_priority:Boolean(input.priority),
      p_preferred_start_time:input.preferredStart||null,
      p_preferred_end_time:input.preferredEnd||null,
      p_search_days:7
    });
    throwIf(result.error,"Unable to calculate available times");
    return (result.data||[]).map(row=>{
      const receivingTimezone=requesterLocation&&normalize(input.direction)==="outbound"
        ?requesterLocation.timezone:state.currentLocation.timezone;
      const start=localDateTime(row.slot_start,receivingTimezone);
      const end=localDateTime(row.slot_end,receivingTimezone);
      return {
        date:start.date,start:start.time,end:end.time,startAt:row.slot_start,endAt:row.slot_end,
        open:Number(row.available_docks),rank:Number(row.recommendation_rank),score:Number(row.recommendation_score),
        recommendedDockId:row.recommended_dock_id||null,recommendedDockName:row.recommended_dock_name||null,
        counterpartDockId:row.counterpart_dock_id||null,counterpartDockName:row.counterpart_dock_name||null,
        reason:row.recommendation_reason||"Compatible appointment time",
        capacityEnabled:Boolean(row.capacity_enabled),capacityWarning:Boolean(row.capacity_warning),
        projectedOccupied:Number(row.projected_occupied_skids||0),availableCapacity:Number(row.available_skid_capacity||0),
        capacityMessage:row.capacity_message||"",alternativeDate:Boolean(row.alternative_date)
      };
    });
  }

  async function listBookingTemplates(){
    if(!state.currentLocation)return [];
    const result=await client.from("booking_templates").select("*")
      .eq("location_id",state.currentLocation.id).order("updated_at",{ascending:false});
    throwIf(result.error,"Unable to load booking templates");
    return result.data||[];
  }

  async function listExternalCompanies(){
    const result=await client.rpc("list_external_company_directory");
    throwIf(result.error,"Unable to load the customer and vendor directory");
    return result.data||[];
  }

  async function saveBookingTemplate(input){
    const data=state.locationData;
    const payload={
      owner_user_id:state.profile.id,
      location_id:state.currentLocation.id,
      name:requireValue(String(input.name||"").trim(),"Template name"),
      direction:normalize(input.direction),
      requester_type:input.requesterType,
      company_name:input.company||null,
      appointment_type_code:codeFor(data.appointmentNameToCode,input.type,"Appointment type"),
      truck_type_code:codeFor(data.truckNameToCode,input.truck,"Truck type"),
      skid_count:Number(input.skids||0),
      handling_type_code:codeFor(data.handlingNameToCode,input.handling,"Handling type"),
      is_priority:Boolean(input.priority),
      carrier_name:input.carrier||null,
      preferred_start_time:input.preferredStart||null,
      preferred_end_time:input.preferredEnd||null
    };
    const result=await client.from("booking_templates").upsert(payload,{onConflict:"owner_user_id,location_id,name"}).select("*").single();
    throwIf(result.error,"Unable to save the booking template");
    return result.data;
  }

  async function deleteBookingTemplate(id){
    const result=await client.from("booking_templates").delete().eq("id",id).eq("owner_user_id",state.profile.id);
    throwIf(result.error,"Unable to delete the booking template");
  }

  async function appointmentHistory(id){
    const result=await client.rpc("get_appointment_history",{p_appointment_id:id});
    throwIf(result.error,"Unable to load appointment history");
    return result.data||[];
  }
  async function bookAppointment(input){
    const data=state.locationData;
    const requesterLocation=internalRequesterLocation(input.requesterType,input.company);
    const result=await client.rpc("book_routed_appointment",{
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
      p_notes:input.notes||null,
      p_after_hours_confirmed:Boolean(input.afterHoursConfirmed)
    });
    throwIf(result.error,"Unable to book the appointment");
    await fetchAppointments();
    return result.data;
  }
  async function previewStaffAppointmentTime(input){
    const data=state.locationData;
    const requesterLocation=internalRequesterLocation(input.requesterType,input.company);
    const result=await client.rpc("preview_routed_appointment_time",{
      p_location_id:state.currentLocation.id,
      p_requester_location_id:requesterLocation?.id||null,
      p_date:input.date,
      p_start_time:input.start,
      p_direction:normalize(input.direction),
      p_appointment_type_code:codeFor(data.appointmentNameToCode,input.type,"Appointment type"),
      p_truck_type_code:codeFor(data.truckNameToCode,input.truck,"Truck type"),
      p_skid_count:Number(input.skids||0),
      p_handling_type_code:codeFor(data.handlingNameToCode,input.handling,"Handling type"),
      p_is_priority:Boolean(input.priority)
    });
    throwIf(result.error,"Unable to preview the staff appointment time");
    const row=result.data||{};
    const receivingTimezone=requesterLocation&&normalize(input.direction)==="outbound"
      ?requesterLocation.timezone:state.currentLocation.timezone;
    const start=localDateTime(row.start_at,receivingTimezone);
    const end=localDateTime(row.end_at,receivingTimezone);
    return {
      date:start.date,start:start.time,end:end.time,startAt:row.start_at,endAt:row.end_at,
      duration:Number(row.duration_minutes||0),isAfterHours:Boolean(row.is_after_hours),
      isOpenDay:Boolean(row.primary_inside_hours),openTime:String(row.primary_open_time||"").slice(0,5),
      closeTime:String(row.primary_close_time||"").slice(0,5),recommendedDockId:row.primary_dock_id||null,
      recommendedDockName:row.primary_dock_name||null,counterpartDockId:row.counterpart_dock_id||null,
      counterpartDockName:row.counterpart_dock_name||null,primaryInsideHours:Boolean(row.primary_inside_hours),
      counterpartInsideHours:Boolean(row.counterpart_inside_hours),capacityEnabled:Boolean(row.capacity_enabled),
      projectedOccupied:Number(row.projected_occupied_skids||0),availableCapacity:Number(row.available_skid_capacity||0),
      capacityMessage:row.capacity_message||""
    };
  }
  async function findReturnLoadMatches(input){
    const requesterLocation=internalRequesterLocation(input.requesterType,input.company);
    if(!requesterLocation||!input.startAt||!input.endAt)return [];
    const result=await client.rpc("find_return_load_matches",{
      p_location_id:state.currentLocation.id,
      p_direction:normalize(input.direction),
      p_requester_location_id:requesterLocation.id,
      p_start_at:input.startAt,
      p_end_at:input.endAt,
      p_window_hours:18
    });
    throwIf(result.error,"Unable to check return-load opportunities");
    return result.data||[];
  }
  async function listReturnLoadOpportunities(dateFrom,dateTo=dateFrom){
    if(!state.currentLocation||state.profile?.role_code==="customer")return [];
    const result=await client.rpc("list_return_load_opportunities",{
      p_location_id:state.currentLocation.id,p_date_from:dateFrom,p_date_to:dateTo
    });
    throwIf(result.error,"Unable to load return-load opportunities");
    return result.data||[];
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
      priority_minimum_minutes:Number(input.priorityMin),capacity_enabled:Boolean(input.capacityEnabled),
      skid_capacity:Number(input.capacityTotal)>0?Number(input.capacityTotal):null,
      capacity_reserve_skids:Number(input.capacityReserve||0),capacity_enforcement_mode:input.capacityMode||"warn",
      current_occupied_skids:Number(input.capacityOccupied||0),
      inventory_as_of:input.capacityAsOf||new Date().toISOString(),capacity_last_source:"manual",
      dock_assignment_strategy:input.dockAssignmentStrategy==="fill_first"?"fill_first":"balanced",
      max_concurrent_appointments:input.maxConcurrentAppointments==null?null:Number(input.maxConcurrentAppointments)
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
  function ensureLocationControl(actions){
    if(!actions||!state.profile)return null;
    const role=state.profile.role_code;
    const operational=isOperationalRole(role);
    const systemAdmin=role==="system_admin";
    document.body.classList.toggle("systemAdminLocation",systemAdmin);
    document.body.classList.toggle("operationalLocation",operational);
    document.body.classList.toggle("fixedOperationalLocation",operational&&!systemAdmin);

    let pill=actions.querySelector(".locationPill");
    if(!pill){
      pill=document.createElement("div");
      pill.className="locationPill sharedLocationControl";
      const label=document.createElement("label");
      label.htmlFor="locationSelect";
      label.textContent="Location";
      const select=document.createElement("select");
      select.id="locationSelect";
      select.setAttribute("aria-label","Active MaxDock location");
      pill.append(label,select);
      actions.insertBefore(pill,actions.firstChild);
    }
    document.querySelectorAll(".headerActions .locationPill").forEach(item=>{
      item.hidden=false;
      item.classList.toggle("locationPlaceholder",!operational);
      item.setAttribute("aria-hidden",String(!operational));
      const select=item.querySelector("select");
      if(!select)return;
      if(operational)populateLocationSelect(select);
      select.disabled=!operational||!systemAdmin;
      select.setAttribute("aria-disabled",String(!operational||!systemAdmin));
      select.title=!operational?"Location does not apply to this account":systemAdmin?"Choose the active MaxDock location":`Assigned location: ${select.value}`;
      if(select.dataset.maxdockLocationBound)return;
      select.dataset.maxdockLocationBound="true";
      select.addEventListener("change",event=>{
        const selected=selectLocation(event.target.value);
        if(!selected)return;
        try{localStorage.setItem(LOCATION_STORAGE_KEY,selected.name)}catch(_ignored){}
        event.target.title=systemAdmin?"Choose the active MaxDock location":`Assigned location: ${selected.name}`;
        document.querySelectorAll(".headerActions .locationPill select").forEach(other=>{
          if(other!==event.target&&[...other.options].some(option=>option.value===selected.name))other.value=selected.name;
        });
      });
    });
    return pill;
  }
  function addAccountControls(){
    applyRoleNavigation();
    const actions=document.querySelector(".headerActions");
    if(!actions)return;
    ensureLocationControl(actions);
    let wrap=document.getElementById("maxdockAccount");
    if(!wrap){
      wrap=document.createElement("div");wrap.id="maxdockAccount";wrap.className="accountControl";
      const identity=document.createElement("div");identity.className="accountIdentity";
      const status=document.createElement("small");status.className="accountStatus";status.textContent="Signed in";
      const label=document.createElement("span");label.className="accountName";label.textContent=state.profile?.full_name||state.profile?.username||"MaxDock User";
      identity.append(status,label);
      const bell=document.createElement("a");bell.id="maxdockNotificationBell";bell.className="notificationBell";bell.href="./my-appointments.html?v=95-db73";bell.title="Open notifications";bell.setAttribute("aria-label","Open notifications");
      bell.innerHTML=`<svg data-icon="solid" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8.7 11a3 3 0 0 0 5.4 0H9.3Z"/></svg><b id="maxdockNotificationCount" hidden>0</b>`;
      const button=document.createElement("button");button.type="button";button.className="accountSignOut";button.textContent="Sign Out";button.addEventListener("click",signOut);
      wrap.append(identity,bell,button);actions.append(wrap);
    }
    const bell=document.getElementById("maxdockNotificationBell");
    if(bell)bell.hidden=!hasPermission("notifications.view");
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
  function hasPermission(code){
    return state.profile?.role_code==="system_admin"||state.permissions.has(code);
  }

  client.auth.onAuthStateChange((event)=>{
    if(event==="SIGNED_OUT"&&!location.pathname.endsWith("login.html"))location.replace("./login.html");
  });

  window.MaxDockDB={
    client,state,getSession,requireAuth,signIn,signOut,loadContext,selectLocation,loadLocation,
    fetchAppointments,availableSlots,bookAppointment,previewStaffAppointmentTime,findReturnLoadMatches,listReturnLoadOpportunities,blockDockTime,changeStatus,updateAppointment,saveLocationSettings,
    listBookingTemplates,saveBookingTemplate,deleteBookingTemplate,appointmentHistory,listExternalCompanies,
    loadPreference,savePreference,queuePreferenceSave,recordUsage,startUsageTracking,startLiveRefresh,LIVE_REFRESH_MS,
    populateLocationSelect,addAccountControls,refreshNotificationBadge,hasPermission,isOperationalRole,getLandingPage,applyRoleNavigation,
    getProfile:()=>state.profile,getLocations:()=>state.locations,getLocationDirectory:()=>state.locationDirectory,getCurrentLocation:()=>state.currentLocation,
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

