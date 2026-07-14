(function(){
  "use strict";

  const db=window.MaxDockDB;
  const state={roles:[],users:[],editingUser:null,currentUserId:null};
  const $=id=>document.getElementById(id);

  function escapeHtml(value){
    return String(value??"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function showFatalError(error){
    document.querySelectorAll(".appLoadingOverlay").forEach(element=>element.remove());
    const panel=document.createElement("div");
    panel.className="appFatalError";
    panel.innerHTML=`<h2>Admin could not start</h2><p>${escapeHtml(error?.message||error)}</p><button class="primaryBtn" type="button">Try Again</button>`;
    panel.querySelector("button").addEventListener("click",()=>location.reload());
    document.body.appendChild(panel);
  }

  function setLoading(active,message="Loading users…"){
    let overlay=$("maxdockLoading");
    if(active&&!overlay){
      overlay=document.createElement("div");
      overlay.id="maxdockLoading";
      overlay.className="appLoadingOverlay";
      overlay.innerHTML='<div class="appLoadingCard"><span class="loadingSpinner"></span><strong></strong></div>';
      document.body.appendChild(overlay);
    }
    if(overlay){
      overlay.querySelector("strong").textContent=message;
      overlay.hidden=!active;
    }
  }

  function setFormError(message=""){
    $("userError").textContent=message;
    $("userError").style.display=message?"block":"none";
  }

  function formatDate(value){
    if(!value)return "Never";
    return new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric"}).format(new Date(value));
  }

  function roleByCode(code){return state.roles.find(role=>role.code===code)}

  function updateSummary(){
    $("totalUsers").textContent=state.users.length;
    $("activeUsers").textContent=state.users.filter(user=>user.is_active).length;
    $("systemAdmins").textContent=state.users.filter(user=>user.is_active&&user.role_code==="system_admin").length;
  }

  function renderUsers(){
    const term=$("userSearch").value.trim().toLowerCase();
    const users=state.users.filter(user=>{
      const haystack=[user.full_name,user.email,user.role_name,...(user.location_names||[])].join(" ").toLowerCase();
      return !term||haystack.includes(term);
    });
    $("userTableBody").innerHTML=users.map(user=>{
      const locations=user.role_code==="system_admin"
        ? '<span class="adminAllLocations">All locations</span>'
        : (user.location_names||[]).map(name=>`<span class="adminLocationTag">${escapeHtml(name)}</span>`).join("")||"—";
      return `<tr>
        <td><div class="adminUserIdentity"><strong>${escapeHtml(user.full_name||user.username||"Unnamed user")}</strong><span>${escapeHtml(user.email||"")}</span></div></td>
        <td><span class="adminRole role-${escapeHtml(user.role_code)}">${escapeHtml(user.role_name||roleByCode(user.role_code)?.name||user.role_code)}</span></td>
        <td><div class="adminLocationTags">${locations}</div></td>
        <td><span class="adminUserStatus ${user.is_active?"active":"inactive"}"><i></i>${user.is_active?"Active":"Inactive"}</span></td>
        <td>${escapeHtml(formatDate(user.last_sign_in_at))}</td>
        <td><button class="tiny adminEditUser" type="button" data-user-id="${escapeHtml(user.user_id)}">Edit</button></td>
      </tr>`;
    }).join("")||'<tr><td colspan="6">No users match this search.</td></tr>';
    document.querySelectorAll(".adminEditUser").forEach(button=>button.addEventListener("click",()=>openUserModal(button.dataset.userId)));
    updateSummary();
  }

  function renderRoleOptions(){
    $("userRole").innerHTML=state.roles.map(role=>`<option value="${escapeHtml(role.code)}">${escapeHtml(role.name)}</option>`).join("");
  }

  function renderLocationOptions(selectedIds=[]){
    const selected=new Set(selectedIds||[]);
    $("userLocations").innerHTML=db.getLocations().map(location=>`<label class="adminLocationOption">
      <input type="checkbox" value="${escapeHtml(location.id)}" ${selected.has(location.id)?"checked":""}>
      <span>${escapeHtml(location.name)}</span>
    </label>`).join("");
  }

  function updateLocationMode(){
    const isSystemAdmin=$("userRole").value==="system_admin";
    $("userLocationsField").classList.toggle("systemAdminLocations",isSystemAdmin);
    $("userLocations").querySelectorAll("input").forEach(input=>input.disabled=isSystemAdmin);
    $("locationHelp").textContent=isSystemAdmin
      ? "System Admins automatically have access to every MaxDock location."
      : "Select every MaxDock location this user may access.";
  }

  function openUserModal(userId=null){
    const user=userId?state.users.find(item=>item.user_id===userId):null;
    state.editingUser=user||null;
    const editing=Boolean(user);
    $("userModalTitle").textContent=editing?"Edit User":"Add User";
    $("userModalIntro").textContent=editing?"Update this user's MaxDock access.":"Send a secure MaxDock invitation by email.";
    $("saveUserButton").textContent=editing?"Save Changes":"Send Invitation";
    $("userFullName").value=user?.full_name||"";
    $("userEmail").value=user?.email||"";
    $("userEmail").disabled=editing;
    $("userRole").value=user?.role_code||"coordinator";
    $("userActive").checked=user?.is_active??true;
    const isSelf=user?.user_id===state.currentUserId;
    $("userRole").disabled=isSelf;
    $("userActive").disabled=isSelf;
    $("selfNotice").hidden=!isSelf;
    renderLocationOptions(user?.location_ids||[]);
    updateLocationMode();
    setFormError();
    $("userModal").classList.add("show");
    document.body.classList.add("modalOpen");
    setTimeout(()=>$("userFullName").focus(),0);
  }

  function closeUserModal(){
    $("userModal").classList.remove("show");
    document.body.classList.remove("modalOpen");
    state.editingUser=null;
    $("userForm").reset();
    setFormError();
  }

  async function readFunctionError(error){
    try{
      if(error?.context instanceof Response){
        const payload=await error.context.clone().json();
        return payload?.error||payload?.message||error.message;
      }
    }catch(_ignored){}
    return error?.message||"The MaxDock invitation could not be sent.";
  }

  async function loadUsers(){
    const result=await db.client.rpc("admin_list_users");
    if(result.error)throw result.error;
    state.users=result.data||[];
    renderUsers();
  }

  async function saveUser(event){
    event.preventDefault();
    setFormError();
    const button=$("saveUserButton");
    const editingUser=state.editingUser;
    const editing=Boolean(editingUser);
    const fullName=$("userFullName").value.trim();
    const email=$("userEmail").value.trim().toLowerCase();
    const roleCode=$("userRole").value;
    const isActive=$("userActive").checked;
    const locationIds=[...$("userLocations").querySelectorAll("input:checked")].map(input=>input.value);
    if(!fullName)return setFormError("Full name is required.");
    if(!editing&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return setFormError("Enter a valid email address.");
    if(roleCode!=="system_admin"&&!locationIds.length)return setFormError("Select at least one location for this user.");

    button.disabled=true;
    button.textContent=editing?"Saving…":"Sending…";
    try{
      if(editing){
        const result=await db.client.rpc("admin_update_user",{
          p_user_id:editingUser.user_id,
          p_full_name:fullName,
          p_role_code:roleCode,
          p_is_active:isActive,
          p_location_ids:roleCode==="system_admin"?[]:locationIds
        });
        if(result.error)throw result.error;
      }else{
        const result=await db.client.functions.invoke("maxdock-invite-user",{
          body:{email,fullName,roleCode,locationIds:roleCode==="system_admin"?[]:locationIds}
        });
        if(result.error)throw new Error(await readFunctionError(result.error));
      }
      closeUserModal();
      setLoading(true,editing?"Refreshing user…":"Loading invited user…");
      await loadUsers();
    }catch(error){
      setFormError(error?.message||"The user could not be saved.");
    }finally{
      setLoading(false);
      button.disabled=false;
      button.textContent=editing?"Save Changes":"Send Invitation";
    }
  }

  async function initialize(){
    setLoading(true,"Loading MaxDock Admin…");
    if(!await db.requireAuth())return;
    await db.loadContext();
    if(db.getProfile()?.role_code!=="system_admin")throw new Error("Only a MaxDock System Admin can open this page.");
    state.currentUserId=db.getProfile().id;
    db.addAccountControls();
    const roleResult=await db.client.from("roles").select("code,name,description,rank").eq("is_active",true).order("rank",{ascending:false});
    if(roleResult.error)throw roleResult.error;
    state.roles=roleResult.data||[];
    renderRoleOptions();
    renderLocationOptions();
    await loadUsers();

    $("addUserButton").addEventListener("click",()=>openUserModal());
    $("closeUserModal").addEventListener("click",closeUserModal);
    $("cancelUserButton").addEventListener("click",closeUserModal);
    $("userRole").addEventListener("change",updateLocationMode);
    $("userSearch").addEventListener("input",renderUsers);
    $("userForm").addEventListener("submit",saveUser);
    $("userModal").addEventListener("click",event=>{if(event.target===$("userModal"))closeUserModal()});
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&$("userModal").classList.contains("show"))closeUserModal()});
    setLoading(false);
  }

  document.addEventListener("DOMContentLoaded",()=>initialize().catch(showFatalError));
})();
