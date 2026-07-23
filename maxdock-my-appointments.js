(function(){
  "use strict";
  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  const state={appointments:[],notifications:[]};
  let stopLiveRefresh=null;

  function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]))}
  function title(value){return String(value||"").replace(/_/g," ").replace(/\b\w/g,char=>char.toUpperCase())}
  function localParts(value,timeZone){
    const formatter=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"numeric",minute:"2-digit"});
    const parts=Object.fromEntries(formatter.formatToParts(new Date(value)).map(part=>[part.type,part.value]));
    return {date:`${parts.year}-${parts.month}-${parts.day}`,label:`${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute} ${parts.dayPeriod||""}`.trim()};
  }
  function isUpcoming(item){return new Date(item.start_at)>new Date()&&!['cancelled','completed','no_show'].includes(item.status)}
  function isPast(item){const end=new Date(item.end_at||item.start_at);return Number.isFinite(end.getTime())&&end<=new Date()&&item.status!=="cancelled"}
  function showError(error){const box=$("myAppointmentsError");box.textContent=error?.message||String(error);box.style.display="block"}
  function applyNavigationPermissions(){
    if(!db.hasPermission("appointment.view"))document.querySelectorAll('a[href*="dashboard.html"]').forEach(link=>link.hidden=true);
    if(!db.hasPermission("reports.view"))document.querySelectorAll('a[href*="reports.html"]').forEach(link=>link.hidden=true);
    if(!db.hasPermission("settings.manage"))document.querySelectorAll('a[href*="settings.html"]').forEach(link=>link.hidden=true);
    if(db.getProfile()?.role_code!=="system_admin")document.querySelectorAll('a[href*="admin.html"],a[href*="data.html"]').forEach(link=>link.hidden=true);
  }

  function renderMetrics(){
    const unread=state.notifications.filter(item=>!item.read_at).length;
    const upcoming=state.appointments.filter(isUpcoming).length;
    const past=state.appointments.filter(isPast).length;
    const cancelled=state.appointments.filter(item=>item.status==="cancelled").length;
    $("myAppointmentMetrics").innerHTML=[
      ["Upcoming",upcoming],["All Bookings",state.appointments.length],["Past",past],["Cancelled",cancelled],["Unread Notices",unread]
    ].map(([label,value])=>`<div class="metric"><small>${label}</small><strong>${value}</strong></div>`).join("");
    renderNextAppointment();
  }

  function renderNextAppointment(){
    const next=state.appointments.filter(isUpcoming).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at))[0];
    const panel=$("nextAppointmentSpotlight");
    panel.hidden=!next;
    if(!next)return;
    const when=localParts(next.start_at,next.location_timezone);
    panel.innerHTML=`<div><small>Next Appointment</small><h3>${esc(when.label)} • ${esc(next.location_name)}</h3><p>${esc(next.booking_reference)} • ${esc(next.appointment_type||"")} • ${esc(next.truck_type||"")} • ${Number(next.skid_count||0)} skids</p></div><button class="secondaryBtn" type="button" onclick="copyMyAppointment('${next.appointment_id}')">Copy Details</button>`;
  }

  function renderNotifications(){
    const unread=state.notifications.filter(item=>!item.read_at).length;
    $("notificationSummary").textContent=unread?`${unread} unread notification${unread===1?"":"s"}`:"You are up to date.";
    $("markNotificationsRead").disabled=!unread;
    $("notificationList").innerHTML=state.notifications.length?state.notifications.slice(0,12).map(item=>`
      <article class="notificationItem ${item.read_at?"":"unread"}">
        <div><strong>${esc(item.title)}</strong><p>${esc(item.message)}</p></div>
        <time>${new Date(item.created_at).toLocaleString()}</time>
      </article>`).join(""):`<div class="emptyState">No notifications yet. New bookings and changes will appear here.</div>`;
  }

  function filteredAppointments(){
    const filter=$("myAppointmentFilter").value;
    if(filter==="upcoming")return state.appointments.filter(isUpcoming);
    if(filter==="past")return state.appointments.filter(isPast);
    if(filter==="cancelled")return state.appointments.filter(item=>item.status==="cancelled");
    return state.appointments;
  }

  function renderAppointments(){
    const rows=filteredAppointments().map(item=>{
      const when=localParts(item.start_at,item.location_timezone);
      const canCancel=db.hasPermission("appointment.cancel_own")&&isUpcoming(item)&&['scheduled','confirmed'].includes(item.status);
      return `<tr>
        <td><b>${esc(item.booking_reference)}</b><br><small>${esc(item.external_reference||"")}</small></td>
        <td>${esc(item.location_name)}</td>
        <td>${esc(when.label)}</td>
        <td>${esc(item.appointment_type||"")}<br><small>${esc(title(item.direction))} • ${Number(item.skid_count||0)} skids</small></td>
        <td>${esc(item.truck_type||"")}<br><small>${esc(item.carrier_name||"")}</small></td>
        <td><span class="status ${item.status==="cancelled"?"cancelled":item.status==="completed"?"completed":""}">${esc(title(item.status))}</span></td>
        <td><button class="tiny" type="button" onclick="copyMyAppointment('${item.appointment_id}')">Copy</button>${canCancel?` <button class="tiny cancelAction" type="button" onclick="cancelMyAppointment('${item.appointment_id}')">Cancel</button>`:""}</td>
      </tr>`;
    }).join("");
    $("myAppointmentsTable").innerHTML=rows||`<tr><td colspan="7">No appointments match this view.</td></tr>`;
  }

  async function refresh(){
    const [appointments,notifications]=await Promise.all([
      db.client.rpc("list_my_appointments"),
      db.client.from("user_notifications").select("*").eq("user_id",db.getProfile().id).order("created_at",{ascending:false}).limit(50)
    ]);
    if(appointments.error)throw appointments.error;
    if(notifications.error)throw notifications.error;
    state.appointments=appointments.data||[];
    state.notifications=notifications.data||[];
    renderMetrics();renderNotifications();renderAppointments();
    $("myAppointmentsError").style.display="none";
    db.refreshNotificationBadge?.().catch(()=>{});
  }

  window.copyMyAppointment=async function(id){
    const item=state.appointments.find(row=>row.appointment_id===id);if(!item)return;
    const when=localParts(item.start_at,item.location_timezone);
    const text=["MaxDock appointment",`Reference: ${item.booking_reference}`,`Location: ${item.location_name}`,`Date and time: ${when.label}`,`Vehicle: ${item.truck_type}`,`Status: ${title(item.status)}`].join("\n");
    try{
      await navigator.clipboard.writeText(text);
      window.MaxDockUI?.toast?.("Appointment details copied.");
    }catch{
      window.MaxDockUI?.toast?.("Clipboard access is unavailable. Select and copy the appointment details from the page.",{tone:"error"});
    }
  };

  window.cancelMyAppointment=async function(id){
    const item=state.appointments.find(row=>row.appointment_id===id);if(!item)return;
    const confirmed=await (window.MaxDockUI?.confirmAction?.({
      title:`Cancel ${item.booking_reference}?`,
      message:"The appointment will be retained in history and marked Cancelled. This cannot be undone from My Appointments.",
      confirmLabel:"Cancel Appointment",
      tone:"danger"
    })??Promise.resolve(false));
    if(!confirmed)return;
    try{
      const result=await db.client.rpc("cancel_my_appointment",{p_appointment_id:id});
      if(result.error)throw result.error;
      await refresh();
      window.MaxDockUI?.toast?.(`${item.booking_reference} was cancelled.`);
    }catch(error){showError(error)}
  };

  function bindBookingAction(){
    const button=$("bookAppointmentFromMyAppointments");
    if(!button)return;
    button.dataset.db52Bound="true";
    button.addEventListener("click",()=>{
      if(!db.hasPermission("appointment.create")){
        window.MaxDockUI?.toast?.("This account does not have permission to create appointments.",{tone:"error"});
        return;
      }
      const role=db.getProfile()?.role_code;
      const operational=["system_admin","site_admin","shipping_manager","coordinator"].includes(role);
      location.assign(`./${operational?"dashboard":"index"}.html?book=1&return=my-appointments&v=93-db71`);
    });
  }

  async function markAllRead(){
    const unreadIds=state.notifications.filter(item=>!item.read_at).map(item=>item.id);if(!unreadIds.length)return;
    const result=await db.client.from("user_notifications").update({read_at:new Date().toISOString()}).in("id",unreadIds);
    if(result.error)throw result.error;
    await refresh();
  }

  async function init(){
    try{
      if(!await db.requireAuth())return;
      await db.loadContext();
      if(!db.hasPermission("appointment.view_own"))throw new Error("This account cannot view My Appointments.");
      db.addAccountControls();applyNavigationPermissions();
      bindBookingAction();
      $("myAppointmentFilter").addEventListener("change",renderAppointments);
      $("markNotificationsRead").addEventListener("click",()=>markAllRead().catch(showError));
      await refresh();
      stopLiveRefresh=db.startLiveRefresh(async()=>{
        await refresh();
        if($("myAppointmentsLiveStatus"))$("myAppointmentsLiveStatus").innerHTML=`<span class="liveDot"></span>Live appointments · updated ${new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"})}`;
      },{onError:error=>{if($("myAppointmentsLiveStatus"))$("myAppointmentsLiveStatus").textContent=`Live refresh paused · ${error.message||"connection unavailable"}`}});
    }catch(error){showError(error)}
  }
  document.addEventListener("DOMContentLoaded",init);
})();
