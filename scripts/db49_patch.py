from pathlib import Path


def patch_db(path):
    p=Path(path)
    s=p.read_text()
    old='''  function isOperationalRole(roleCode=state.profile?.role_code){return OPERATIONAL_ROLES.has(roleCode)}
  function getLandingPage(roleCode=state.profile?.role_code){
    if(["shipping_manager","coordinator"].includes(roleCode))return "queue.html?v=68-db47";
    if(["system_admin","site_admin"].includes(roleCode))return "dashboard.html?v=68-db47";
    return "index.html?v=68-db47";
  }
  function applyRoleNavigation(){
    const operational=isOperationalRole();
    const landing=getLandingPage();
    document.querySelectorAll("a.logoLink").forEach(link=>{
      link.href=`./${landing}`;
      link.setAttribute("aria-label",operational?"Go to MaxDock operations":"Go to MaxDock main page");
    });
    document.querySelectorAll('a[href*="index.html"]:not(.logoLink)').forEach(link=>link.hidden=operational);
  }
'''
    new='''  function isOperationalRole(roleCode=state.profile?.role_code){return OPERATIONAL_ROLES.has(roleCode)}
  function isVendorProfile(profile=state.profile){
    return profile?.role_code==="customer"&&normalize(profile?.external_party_type)==="vendor";
  }
  function getLandingPage(roleCode=state.profile?.role_code){
    if(isVendorProfile())return "my-appointments.html?v=70-db49";
    if(["shipping_manager","coordinator"].includes(roleCode))return "queue.html?v=70-db49";
    if(["system_admin","site_admin"].includes(roleCode))return "dashboard.html?v=70-db49";
    return "index.html?v=70-db49";
  }
  function navigationRoute(link){
    try{return (new URL(link.href,location.href).pathname.split("/").pop()||"").replace(/\\.html$/i,"")}
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
'''
    if old not in s:
        raise SystemExit(f'db navigation block not found in {path}')
    s=s.replace(old,new)
    old2='''    state.locations=locationResult.data||[];
    state.locationDirectory=directoryResult.data||[];
    if(!state.locations.length)throw new Error("This user has no permitted MaxDock locations.");
    startUsageTracking();
    return state;
'''
    new2='''    state.locations=locationResult.data||[];
    state.locationDirectory=directoryResult.data||[];
    if(!state.locations.length)throw new Error("This user has no permitted MaxDock locations.");
    applyRoleNavigation();
    startUsageTracking();
    return state;
'''
    if old2 not in s:
        raise SystemExit(f'db context block not found in {path}')
    p.write_text(s.replace(old2,new2))


def patch_admin(path):
    p=Path(path)
    s=p.read_text()
    old='''    await db.loadContext();
    if(db.getProfile()?.role_code!=="system_admin")throw new Error("Only a MaxDock System Admin can open this page.");
    state.currentUserId=db.getProfile().id;
'''
    new='''    await db.loadContext();
    const adminCheck=await db.client.rpc("is_system_admin");
    if(adminCheck.error)throw new Error(`Unable to verify System Admin access: ${adminCheck.error.message||adminCheck.error}`);
    if(adminCheck.data!==true){
      location.replace(`./${db.getLandingPage()}`);
      return;
    }
    state.currentUserId=db.getProfile().id;
'''
    if old not in s:
        raise SystemExit(f'admin access block not found in {path}')
    p.write_text(s.replace(old,new))


def patch_config(path):
    p=Path(path)
    s=p.read_text()
    s=s.replace('MaxDock-v69-DB48','MaxDock-v70-DB49').replace('69-db48','70-db49')
    css='  loadCss("maxdock-db48.css","70-db49","db48");\n'
    if css not in s:
        raise SystemExit(f'db48 css loader not found in {path}')
    s=s.replace(css,css+'  loadCss("maxdock-db49.css","70-db49","db49");\n')
    script='    await loadScript("maxdock-db48.js","70-db49","db48");\n'
    if script not in s:
        raise SystemExit(f'db48 script loader not found in {path}')
    s=s.replace(script,script+'    await loadScript("maxdock-db49.js","70-db49","db49");\n')
    s=s.replace('document.documentElement.dataset.maxdockRelease="db48"','document.documentElement.dataset.maxdockRelease="db49"')
    s=s.replace('DB48 · full-width workspace and operator fullscreen active','DB49 · consistent controls, complete KPI cards, and role-safe navigation active')
    p.write_text(s)

for path in ('maxdock-db.js','db04/maxdock-db.js'):
    patch_db(path)
for path in ('maxdock-admin.js','db04/maxdock-admin.js'):
    patch_admin(path)
for path in ('maxdock-config.js','db04/maxdock-config.js'):
    patch_config(path)
