(function(){
  "use strict";

  const db=window.MaxDockDB;
  const state={roles:[],users:[],editingUser:null,currentUserId:null,accessPackage:null,usernameEdited:false};
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

  function setAccessError(message=""){
    $("accessError").textContent=message;
    $("accessError").style.display=message?"block":"none";
  }

  function formatDate(value){
    if(!value)return "Never";
    return new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric"}).format(new Date(value));
  }

  function roleByCode(code){return state.roles.find(role=>role.code===code)}
  function isSyntheticEmail(email){return String(email||"").toLowerCase().endsWith("@maxdock.internal")}
  function displayEmail(user){return !user.email||isSyntheticEmail(user.email)?`Username: ${user.username}`:user.email}

  function updateSummary(){
    $("totalUsers").textContent=state.users.length;
    $("activeUsers").textContent=state.users.filter(user=>user.is_active).length;
    $("systemAdmins").textContent=state.users.filter(user=>user.is_active&&user.role_code==="system_admin").length;
  }

  function renderUsers(){
    const term=$("userSearch").value.trim().toLowerCase();
    const users=state.users.filter(user=>{
      const haystack=[user.full_name,user.username,user.email,user.role_name,...(user.location_names||[])].join(" ").toLowerCase();
      return !term||haystack.includes(term);
    });
    $("userTableBody").innerHTML=users.map(user=>{
      const locations=user.role_code==="system_admin"
        ? '<span class="adminAllLocations">All locations</span>'
        : (user.location_names||[]).map(name=>`<span class="adminLocationTag">${escapeHtml(name)}</span>`).join("")||"—";
      const pending=user.must_change_password?'<span class="adminPendingBadge">Password change required</span>':"";
      const accessButton=user.must_change_password
        ? `<button class="tiny adminCreateLink" type="button" data-user-id="${escapeHtml(user.user_id)}">Setup Link</button>`:"";
      return `<tr>
        <td><div class="adminUserIdentity"><strong>${escapeHtml(user.full_name||user.username||"Unnamed user")}</strong><span>${escapeHtml(displayEmail(user))}</span></div></td>
        <td><span class="adminRole role-${escapeHtml(user.role_code)}">${escapeHtml(user.role_name||roleByCode(user.role_code)?.name||user.role_code)}</span></td>
        <td><div class="adminLocationTags">${locations}</div></td>
        <td><div class="adminStatusStack"><span class="adminUserStatus ${user.is_active?"active":"inactive"}"><i></i>${user.is_active?"Active":"Inactive"}</span>${pending}</div></td>
        <td>${escapeHtml(formatDate(user.last_sign_in_at))}</td>
        <td><div class="adminRowActions">${accessButton}<button class="tiny adminEditUser" type="button" data-user-id="${escapeHtml(user.user_id)}">Edit</button></div></td>
      </tr>`;
    }).join("")||'<tr><td colspan="6">No users match this search.</td></tr>';
    document.querySelectorAll(".adminEditUser").forEach(button=>button.addEventListener("click",()=>openUserModal(button.dataset.userId)));
    document.querySelectorAll(".adminCreateLink").forEach(button=>button.addEventListener("click",()=>createExistingSetupLink(button.dataset.userId)));
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
    const isCustomer=$("userRole").value==="customer";
    $("userLocationsField").classList.toggle("systemAdminLocations",isSystemAdmin);
    $("userLocations").querySelectorAll("input").forEach(input=>input.disabled=isSystemAdmin);
    $("locationHelp").textContent=isSystemAdmin
      ? "System Admins automatically have access to every MaxDock location."
      : isCustomer
        ? "Select every MaxDock location this customer may book."
        : "Select every MaxDock location this user may access.";
  }

  function selectedDeliveryMethod(){return document.querySelector('input[name="deliveryMethod"]:checked')?.value||"invite_link"}

  function updateDeliveryMode(){
    if(state.editingUser)return;
    const temporary=selectedDeliveryMethod()==="temporary_password";
    $("userPasswordField").hidden=!temporary;
    $("userTemporaryPassword").required=temporary;
    $("userEmail").required=!temporary;
    $("userEmailRequired").hidden=temporary;
    $("userEmailHelp").textContent=temporary
      ? "Optional contact address. MaxDock will not send an invitation."
      : "The secure invitation link will be addressed to this person.";
    $("userModalIntro").textContent=temporary
      ? "Create a username and temporary password without sending an email."
      : "Create a secure invitation link and send it from Outlook.";
    $("saveUserButton").textContent=temporary?"Create User":"Create Invitation Link";
  }

  function usernameFromName(name){
    return String(name||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,".").replace(/^\.+|\.+$/g,"").slice(0,50);
  }

  function generateTemporaryPassword(){
    const bytes=new Uint32Array(4);
    crypto.getRandomValues(bytes);
    const value=`Mx!${[...bytes].map(number=>number.toString(36)).join("-")}A7`;
    $("userTemporaryPassword").value=value.slice(0,28);
    $("userTemporaryPassword").focus();
    $("userTemporaryPassword").select();
  }

  function openUserModal(userId=null){
    const user=userId?state.users.find(item=>item.user_id===userId):null;
    state.editingUser=user||null;
    state.usernameEdited=Boolean(user);
    const editing=Boolean(user);
    $("userModalTitle").textContent=editing?"Edit User":"Add User";
    $("userModalIntro").textContent=editing?"Update this user's MaxDock access.":"Choose how this person will receive access.";
    $("saveUserButton").textContent=editing?"Save Changes":"Create Invitation Link";
    $("userFullName").value=user?.full_name||"";
    $("userUsername").value=user?.username||"";
    $("userUsername").disabled=false;
    $("userEmail").value=isSyntheticEmail(user?.email)?"":user?.email||"";
    $("userEmail").disabled=editing;
    $("userDeliveryField").hidden=editing;
    $("userEmailField").hidden=editing;
    $("userPasswordField").hidden=true;
    $("userRole").value=user?.role_code||"coordinator";
    $("userActive").checked=user?.is_active??true;
    const isSelf=user?.user_id===state.currentUserId;
    $("userRole").disabled=isSelf;
    $("userActive").disabled=isSelf;
    $("selfNotice").hidden=!isSelf;
    $("deleteUserButton").hidden=!editing||isSelf;
    renderLocationOptions(user?.location_ids||[]);
    updateLocationMode();
    if(!editing)updateDeliveryMode();
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
    $("userUsername").disabled=false;
    $("userEmail").disabled=false;
    $("userRole").disabled=false;
    $("userActive").disabled=false;
    $("deleteUserButton").hidden=true;
    $("userDeliveryField").hidden=false;
    $("userEmailField").hidden=false;
    setFormError();
  }

  async function readFunctionError(error){
    try{
      if(error?.context instanceof Response){
        const payload=await error.context.clone().json();
        return payload?.error||payload?.message||error.message;
      }
    }catch(_ignored){}
    return error?.message||"The MaxDock account service could not complete this request.";
  }

  async function invokeAccountService(body){
    const result=await db.client.functions.invoke("maxdock-invite-user",{body});
    if(result.error)throw new Error(await readFunctionError(result.error));
    if(result.data?.error)throw new Error(result.data.error);
    return result.data||{};
  }

  function accessText(item){
    const loginUrl=new URL("./login.html",location.href).href;
    const lines=["MaxDock access",`Name: ${item.fullName}`,`Username: ${item.username}`];
    if(item.kind==="temporary_password"){
      lines.push(`Temporary password: ${item.password}`);
      lines.push(`Sign in: ${loginUrl}`);
      lines.push("You will be asked to choose a new password after signing in.");
    }else{
      lines.push(`Set your password: ${item.invitationLink}`);
      lines.push(`Sign in later: ${loginUrl}`);
      lines.push("This setup link is private and time-limited.");
    }
    return lines.join("\n");
  }

  function showAccessPackage(item){
    state.accessPackage=item;
    const isPassword=item.kind==="temporary_password";
    $("accessModalTitle").textContent=isPassword?"Temporary login ready":"Invitation link ready";
    $("accessModalIntro").textContent=isPassword
      ? "Share these credentials privately. The password is shown only here."
      : "Copy the secure link or open a prepared Outlook draft.";
    $("accessDetails").innerHTML=`
      <label>Username</label><div class="adminAccessValue">${escapeHtml(item.username)}</div>
      ${isPassword?`<label>Temporary password</label><div class="adminAccessValue sensitive">${escapeHtml(item.password)}</div>`:`<label>Secure setup link</label><div class="adminAccessValue link">${escapeHtml(item.invitationLink)}</div>`}`;
    $("openOutlookButton").hidden=!item.email||isPassword;
    setAccessError();
    $("accessModal").classList.add("show");
    document.body.classList.add("modalOpen");
  }

  function closeAccessModal(){
    $("accessModal").classList.remove("show");
    document.body.classList.remove("modalOpen");
    state.accessPackage=null;
    $("accessDetails").textContent="";
    setAccessError();
  }

  async function copyAccessDetails(){
    if(!state.accessPackage)return;
    const value=accessText(state.accessPackage);
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
      else{
        const textarea=document.createElement("textarea");
        textarea.value=value;textarea.style.position="fixed";textarea.style.opacity="0";
        document.body.appendChild(textarea);textarea.select();document.execCommand("copy");textarea.remove();
      }
      $("copyAccessButton").textContent="Copied";
      setTimeout(()=>$("copyAccessButton").textContent="Copy Details",1400);
    }catch(error){setAccessError(error?.message||"The details could not be copied.")}
  }

  function openOutlookDraft(){
    const item=state.accessPackage;
    if(!item?.email)return;
    const subject=encodeURIComponent("Your MaxDock access");
    const body=encodeURIComponent(`Hello ${item.fullName},\n\n${accessText(item)}\n\nRegards,\nMax Solutions`);
    location.href=`mailto:${encodeURIComponent(item.email)}?subject=${subject}&body=${body}`;
  }

  async function loadUsers(){
    const result=await db.client.rpc("admin_list_users");
    if(result.error)throw result.error;
    state.users=result.data||[];
    renderUsers();
  }

  async function createExistingSetupLink(userId){
    const user=state.users.find(item=>item.user_id===userId);
    if(!user)return;
    setLoading(true,"Creating a secure setup link…");
    try{
      const data=await invokeAccountService({action:"generate_existing_link",userId});
      showAccessPackage({
        kind:"invite_link",fullName:user.full_name||user.username,username:user.username,
        email:data.contactEmail||(!isSyntheticEmail(user.email)?user.email:""),invitationLink:data.invitationLink
      });
    }catch(error){showFatalError(error)}finally{setLoading(false)}
  }

  async function deleteCurrentUser(){
    const user=state.editingUser;
    if(!user||user.user_id===state.currentUserId)return;
    const label=user.full_name||user.username;
    if(!confirm(`Delete ${label} from MaxDock? Their login and access will be removed. Existing appointment history will be preserved.`))return;
    const confirmation=prompt(`Type the username ${user.username} to confirm deletion:`);
    if(confirmation===null)return;
    if(confirmation.trim().toLowerCase()!==String(user.username).toLowerCase()){
      return setFormError("The username did not match. The user was not deleted.");
    }

    const button=$("deleteUserButton");
    button.disabled=true;button.textContent="Deleting…";setFormError();
    try{
      await invokeAccountService({action:"delete_user",userId:user.user_id});
      closeUserModal();
      setLoading(true,"Refreshing users…");
      await loadUsers();
    }catch(error){
      setFormError(error?.message||"The user could not be deleted.");
    }finally{
      setLoading(false);button.disabled=false;button.textContent="Delete User";
    }
  }

  async function saveUser(event){
    event.preventDefault();
    setFormError();
    const button=$("saveUserButton");
    const editingUser=state.editingUser;
    const editing=Boolean(editingUser);
    const fullName=$("userFullName").value.trim();
    const username=$("userUsername").value.trim().toLowerCase();
    const email=$("userEmail").value.trim().toLowerCase();
    const roleCode=$("userRole").value;
    const isActive=$("userActive").checked;
    const locationIds=[...$("userLocations").querySelectorAll("input:checked")].map(input=>input.value);
    const deliveryMethod=selectedDeliveryMethod();
    const temporaryPassword=$("userTemporaryPassword").value;
    if(!fullName)return setFormError("Full name is required.");
    if(!/^[A-Za-z0-9._-]{3,50}$/.test(username))return setFormError("Use a username with 3–50 letters, numbers, dots, dashes, or underscores.");
    if(!editing&&deliveryMethod==="invite_link"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return setFormError("Enter a valid email address for the invitation link.");
    if(!editing&&deliveryMethod==="temporary_password"&&email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return setFormError("Enter a valid contact email or leave it blank.");
    if(!editing&&deliveryMethod==="temporary_password"&&temporaryPassword.length<10)return setFormError("The temporary password must contain at least 10 characters.");
    if(roleCode!=="system_admin"&&!locationIds.length)return setFormError("Select at least one location for this user.");

    button.disabled=true;
    button.textContent=editing?"Saving…":"Creating…";
    try{
      if(editing){
        if(username.toLowerCase()!==String(editingUser.username||"").toLowerCase()){
          await invokeAccountService({action:"update_username",userId:editingUser.user_id,username});
        }
        const result=await db.client.rpc("admin_update_user",{
          p_user_id:editingUser.user_id,p_full_name:fullName,p_role_code:roleCode,
          p_is_active:isActive,p_location_ids:roleCode==="system_admin"?[]:locationIds
        });
        if(result.error)throw result.error;
        closeUserModal();
      }else{
        const action=deliveryMethod==="temporary_password"?"create_temporary_password":"create_invite_link";
        const data=await invokeAccountService({
          action,username,email,fullName,roleCode,
          password:deliveryMethod==="temporary_password"?temporaryPassword:undefined,
          locationIds:roleCode==="system_admin"?[]:locationIds
        });
        const accessPackage={
          kind:deliveryMethod,fullName,username:data.user?.username||username,email,
          password:deliveryMethod==="temporary_password"?temporaryPassword:"",
          invitationLink:data.invitationLink||""
        };
        closeUserModal();
        showAccessPackage(accessPackage);
      }
      setLoading(true,"Refreshing users…");
      await loadUsers();
    }catch(error){
      setFormError(error?.message||"The user could not be saved.");
    }finally{
      setLoading(false);
      button.disabled=false;
      button.textContent=editing?"Save Changes":selectedDeliveryMethod()==="temporary_password"?"Create User":"Create Invitation Link";
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
    renderRoleOptions();renderLocationOptions();await loadUsers();

    $("addUserButton").addEventListener("click",()=>openUserModal());
    $("closeUserModal").addEventListener("click",closeUserModal);
    $("cancelUserButton").addEventListener("click",closeUserModal);
    $("deleteUserButton").addEventListener("click",deleteCurrentUser);
    $("userRole").addEventListener("change",updateLocationMode);
    $("userSearch").addEventListener("input",renderUsers);
    $("userForm").addEventListener("submit",saveUser);
    $("userFullName").addEventListener("input",()=>{if(!state.editingUser&&!state.usernameEdited)$("userUsername").value=usernameFromName($("userFullName").value)});
    $("userUsername").addEventListener("input",()=>state.usernameEdited=true);
    document.querySelectorAll('input[name="deliveryMethod"]').forEach(input=>input.addEventListener("change",updateDeliveryMode));
    $("generatePasswordButton").addEventListener("click",generateTemporaryPassword);
    $("closeAccessModal").addEventListener("click",closeAccessModal);
    $("doneAccessButton").addEventListener("click",closeAccessModal);
    $("copyAccessButton").addEventListener("click",copyAccessDetails);
    $("openOutlookButton").addEventListener("click",openOutlookDraft);
    $("userModal").addEventListener("click",event=>{if(event.target===$("userModal"))closeUserModal()});
    $("accessModal").addEventListener("click",event=>{if(event.target===$("accessModal"))closeAccessModal()});
    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape")return;
      if($("accessModal").classList.contains("show"))closeAccessModal();
      else if($("userModal").classList.contains("show"))closeUserModal();
    });
    setLoading(false);
  }

  document.addEventListener("DOMContentLoaded",()=>initialize().catch(showFatalError));
})();
