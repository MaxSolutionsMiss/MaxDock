from pathlib import Path
import base64, shutil, tarfile

root=Path('.')
archive=root/'db51_assets.tgz'
archive.write_bytes(base64.b64decode((root/'scripts/db51_assets.b64').read_text().strip()))
with tarfile.open(archive,'r:gz') as tar: tar.extractall(root)
archive.unlink()

def replace_once(path,old,new):
    text=path.read_text(encoding='utf-8')
    if new in text:return
    if old not in text:raise SystemExit(f'Missing patch pattern in {path}')
    path.write_text(text.replace(old,new,1),encoding='utf-8')

replace_once(root/'my-appointments.html',
'''  <div class="pageHead">\n    <div><h2>My Appointments</h2><p>Your MaxDock bookings across all permitted locations.</p><small class="liveDataStatus" id="myAppointmentsLiveStatus"><span class="liveDot"></span>Live appointments · refreshes every 5 seconds</small></div>\n    <a class="primaryBtn bookAppointmentBtnDB50" href="./index.html?book=1&amp;return=my-appointments&amp;v=71-db50">Book an Appointment</a>\n  </div>''',
'''  <div class="pageHead myAppointmentsPageHeadDB51">\n    <div class="myAppointmentsHeadingDB51">\n      <div class="myAppointmentsTitleRowDB51"><h2>My Appointments</h2><a class="primaryBtn bookAppointmentBtnDB50" href="./index.html?book=1&amp;return=my-appointments&amp;v=72-db51"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM12 12v5M9.5 14.5h5"/></svg><span>Book an Appointment</span></a></div>\n      <p>Your MaxDock bookings across all permitted locations.</p><small class="liveDataStatus" id="myAppointmentsLiveStatus"><span class="liveDot"></span>Live appointments · refreshes every 5 seconds</small>\n    </div>\n  </div>''')
replace_once(root/'dashboard.html','class="secondaryBtn dashboardActionPrimary blockActionBtn"','class="primaryBtn dashboardActionPrimary blockActionBtn"')
replace_once(root/'dashboard.html','<span>Place appointment</span>','<span>Place Appointment</span>')
replace_once(root/'dashboard.html','<span>Block time</span>','<span>Block Time</span>')
replace_once(root/'dashboard.html','''<div class="scheduleDisplayActions"><button class="primaryBtn utilityBtn" id="scheduleFullscreenButton" type="button" onclick="enterScheduleFullscreen()">Enter full screen</button><button class="secondaryBtn utilityBtn" id="exitTvMode" type="button" onclick="closeTvSchedule()">Close display</button></div>''','''<div class="scheduleDisplayActions"><button class="secondaryBtn utilityBtn" id="exitTvMode" type="button" onclick="closeTvSchedule()">Close Display</button></div>''')
replace_once(root/'dashboard.html','>Open full-screen view</button>','>Open Full-Screen View</button>')
replace_once(root/'queue.html','''<div class="queueDisplayActions"><button class="primaryBtn utilityBtn" id="queueFullscreenButton" type="button" onclick="enterQueueFullscreen()">Enter full screen</button><button class="secondaryBtn utilityBtn" type="button" onclick="closeQueueDisplay()">Close display</button></div>''','''<div class="queueDisplayActions"><button class="secondaryBtn utilityBtn" type="button" onclick="closeQueueDisplay()">Close Display</button></div>''')
replace_once(root/'queue.html','>Open full-screen view</button>','>Open Full-Screen View</button>')
replace_once(root/'settings.html',
'''      <div class="capacitySettingsHead">\n        <div><h3>Warehouse Skid Capacity</h3><p class="stepIntro">Optional. Use current inventory plus scheduled inbound and outbound skids to protect available storage space.</p></div>\n        <label class="adminToggle capacityToggle"><input id="setCapacityEnabled" type="checkbox"><span>Enable for this location</span></label>\n      </div>''',
'''      <div class="capacitySettingsHead">\n        <div>\n          <h3>Warehouse Skid Capacity</h3>\n          <p class="stepIntro">Optional. Use current inventory plus scheduled inbound and outbound skids to protect available storage space.</p>\n          <div class="capacityEnableRowDB51">\n            <label class="adminToggle capacityToggle"><input id="setCapacityEnabled" type="checkbox"><span>Enable warehouse capacity for <strong id="capacityCurrentLocationNameDB51">this location</strong></span></label>\n            <small id="capacityEnabledLocationsDB51">Enabled locations: Loading…</small>\n          </div>\n        </div>\n      </div>''')

config_path=root/'maxdock-config.js'
config=config_path.read_text(encoding='utf-8').replace('MaxDock-v71-DB50','MaxDock-v72-DB51').replace('"71-db50"','"72-db51"')
if 'maxdock-db51.css' not in config:config=config.replace('  loadCss("maxdock-db50.css","72-db51","db50");','  loadCss("maxdock-db50.css","72-db51","db50");\n  loadCss("maxdock-db51.css","72-db51","db51");')
if 'maxdock-db51.js' not in config:config=config.replace('    await loadScript("maxdock-db50.js","72-db51","db50");','    await loadScript("maxdock-db50.js","72-db51","db50");\n    await loadScript("maxdock-db51.js","72-db51","db51");')
config=config.replace('document.documentElement.dataset.maxdockRelease="db50";','document.documentElement.dataset.maxdockRelease="db51";').replace('DB50 · direct vendor booking and unified interface actions active','DB51 · audited controls, consistent actions, and unified full-screen views active')
config_path.write_text(config,encoding='utf-8')
mirror=['dashboard.html','queue.html','settings.html','my-appointments.html','maxdock-config.js','maxdock-db51.css','maxdock-db51.js','DEPLOYMENT_DB51.txt']
(root/'db04').mkdir(exist_ok=True)
for name in mirror:shutil.copyfile(root/name,root/'db04'/name)
for name in mirror:
    if (root/name).read_bytes()!=(root/'db04'/name).read_bytes():raise SystemExit(f'Parity failed: {name}')
