from pathlib import Path

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)

text = read('maxdock-db49.js')
old = '''  function simplifySectionMenus(){
    document.querySelectorAll(".sectionWorkspaceRailHead small,.sectionWorkspaceTabs>button small").forEach(item=>item.remove());
  }'''
new = '''  function simplifySectionMenus(){
    document.querySelectorAll(".sectionWorkspaceRailHead small,.sectionWorkspaceTabs>button small").forEach(item=>item.setAttribute("aria-hidden","true"));
  }'''
write('maxdock-db49.js', replace_once(text, old, new, 'maxdock-db49 simplifySectionMenus'))

text = read('maxdock-admin.js')
old = '''  function updateSummary(){
    $("totalUsers").textContent=state.users.length;
    $("activeUsers").textContent=state.users.filter(user=>user.is_active).length;
    $("usedLast7").textContent=state.users.filter(user=>Number(user.active_days_7)>0).length;
    $("neverUsed").textContent=state.users.filter(user=>!user.last_activity_at).length;
    $("adminFilterAllCount").textContent=state.users.length;
    $("adminFilterInternalCount").textContent=state.users.filter(user=>user.role_code!=="customer").length;
    $("adminFilterCustomerCount").textContent=state.users.filter(user=>selectedPrivilegeCode(user)==="customer").length;
    $("adminFilterVendorCount").textContent=state.users.filter(user=>selectedPrivilegeCode(user)==="vendor").length;
    $("adminFilterSetupCount").textContent=state.users.filter(user=>user.must_change_password).length;
  }'''
new = '''  function updateSummary(){
    const setSummary=(id,value)=>{const element=$(id);if(element)element.textContent=value};
    setSummary("totalUsers",state.users.length);
    setSummary("activeUsers",state.users.filter(user=>user.is_active).length);
    setSummary("usedLast7",state.users.filter(user=>Number(user.active_days_7)>0).length);
    setSummary("neverUsed",state.users.filter(user=>!user.last_activity_at).length);
    setSummary("adminFilterAllCount",state.users.length);
    setSummary("adminFilterInternalCount",state.users.filter(user=>user.role_code!=="customer").length);
    setSummary("adminFilterCustomerCount",state.users.filter(user=>selectedPrivilegeCode(user)==="customer").length);
    setSummary("adminFilterVendorCount",state.users.filter(user=>selectedPrivilegeCode(user)==="vendor").length);
    setSummary("adminFilterSetupCount",state.users.filter(user=>user.must_change_password).length);
  }'''
write('maxdock-admin.js', replace_once(text, old, new, 'maxdock-admin updateSummary'))

text = read('my-appointments.html')
old = '<a class="primaryBtn" href="./index.html?v=67-db46">Book Appointment</a>'
new = '<a class="primaryBtn bookAppointmentBtnDB50" href="./index.html?book=1&amp;return=my-appointments&amp;v=71-db50">Book an Appointment</a>'
write('my-appointments.html', replace_once(text, old, new, 'my-appointments booking link'))

text = read('maxdock-config.js')
text = replace_once(text, 'version: "MaxDock-v70-DB49"', 'version: "MaxDock-v71-DB50"', 'config version')
text = text.replace('"70-db49"', '"71-db50"')
text = replace_once(text, '  loadCss("maxdock-db49.css","71-db50","db49");', '  loadCss("maxdock-db49.css","71-db50","db49");\n  loadCss("maxdock-db50.css","71-db50","db50");', 'config DB50 CSS loader')
text = replace_once(text, '    await loadScript("maxdock-db49.js","71-db50","db49");', '    await loadScript("maxdock-db49.js","71-db50","db49");\n    await loadScript("maxdock-db50.js","71-db50","db50");', 'config DB50 JS loader')
text = replace_once(text, 'document.documentElement.dataset.maxdockRelease="db49";', 'document.documentElement.dataset.maxdockRelease="db50";', 'config release dataset')
text = replace_once(text, 'stamp.textContent="DB49 · consistent controls, complete KPI cards, and role-safe navigation active";', 'stamp.textContent="DB50 · direct vendor booking and unified interface actions active";', 'config release stamp')
write('maxdock-config.js', text)

for path in ['maxdock-db49.js','maxdock-admin.js','my-appointments.html','maxdock-config.js','maxdock-db50.css','maxdock-db50.js']:
    write(f'db04/{path}', read(path))

notes = '''MaxDock DB50 — Direct vendor booking and unified interface actions

User-visible changes
- Keeps Vendor accounts on My Appointments after login.
- Replaces the unstable Book Appointment link with a large, consistent Book an Appointment action.
- Opens the booking wizard immediately from My Appointments and returns there when the direct flow is closed.
- Restores Dashboard Date Range as a normal filter instead of a graphical KPI card.
- Applies one flat teal primary-button treatment across Dashboard, Settings, Data Integration, Reports, User Management, and booking actions.
- Increases the desktop gutter beside the left navigation rail from 18px to 24px.
- Preserves hidden User Group count nodes so User Management no longer fails with a null textContent error.
- Adds null-safe User Management summary rendering as an additional safeguard.

Release marker
- MaxDock-v71-DB50
- DB50 · direct vendor booking and unified interface actions active

Data and deployment impact
- Frontend-only release.
- No Supabase migration.
- No Edge Function deployment.
'''
write('DEPLOYMENT_DB50.txt', notes)
write('db04/DEPLOYMENT_DB50.txt', notes)
