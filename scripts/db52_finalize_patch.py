from pathlib import Path


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"Could not find {label}")
    return text.replace(old, new, 1)


def update_config(path):
    text=path.read_text()
    text=text.replace('MaxDock-v72-DB51','MaxDock-v73-DB52')
    text=text.replace('"72-db51"','"73-db52"')
    if 'loadCss("maxdock-db52.css"' not in text:
        text=text.replace('  loadCss("maxdock-db51.css","73-db52","db51");','  loadCss("maxdock-db51.css","73-db52","db51");\n  loadCss("maxdock-db52.css","73-db52","db52");')
    if 'loadScript("maxdock-db52.js"' not in text:
        text=text.replace('    await loadScript("maxdock-db51.js","73-db52","db51");','    await loadScript("maxdock-db51.js","73-db52","db51");\n    await loadScript("maxdock-db52.js","73-db52","db52");')
    text=text.replace('document.documentElement.dataset.maxdockRelease="db51"','document.documentElement.dataset.maxdockRelease="db52"')
    text=text.replace('DB51 · audited controls, consistent actions, and unified full-screen views active','DB52 · reliable booking actions and simplified five-step scheduling active')
    path.write_text(text)


def update_my_appointments(path):
    text=path.read_text()
    old='''  <div class="pageHead myAppointmentsPageHeadDB51">\n    <div class="myAppointmentsHeadingDB51">\n      <div class="myAppointmentsTitleRowDB51"><h2>My Appointments</h2><a class="primaryBtn bookAppointmentBtnDB50" href="./index.html?book=1&amp;return=my-appointments&amp;v=72-db51"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM12 12v5M9.5 14.5h5"/></svg><span>Book an Appointment</span></a></div>\n      <p>Your MaxDock bookings across all permitted locations.</p><small class="liveDataStatus" id="myAppointmentsLiveStatus"><span class="liveDot"></span>Live appointments · refreshes every 5 seconds</small>\n    </div>\n  </div>\n\n  <div class="metrics" id="myAppointmentMetrics"></div>'''
    new='''  <div class="pageHead myAppointmentsPageHeadDB52">\n    <div><h2>My Appointments</h2><p>Your MaxDock bookings across all permitted locations.</p><small class="liveDataStatus" id="myAppointmentsLiveStatus"><span class="liveDot"></span>Live appointments · refreshes every 5 seconds</small></div>\n  </div>\n\n  <section class="myAppointmentsBookingBarDB52" aria-label="Book an appointment">\n    <div class="myAppointmentsBookingCopyDB52"><strong>Need a new dock time?</strong><span>Book an appointment in five quick steps.</span></div>\n    <button class="primaryBtn bookAppointmentActionDB52" id="bookAppointmentFromMyAppointments" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM12 12v5M9.5 14.5h5"/></svg><span>Book an Appointment</span></button>\n  </section>\n\n  <div class="metrics" id="myAppointmentMetrics"></div>'''
    path.write_text(replace_once(text,old,new,'My Appointments booking area'))


def simplify_booking_html(path):
    text=path.read_text()
    pairs={
      '<div class="requestModalTitle"><h2>Place Appointment</h2>':'<div class="requestModalTitle"><h2>Book an Appointment</h2>',
      '<span>Route &amp; Load</span>':'<span>Load</span>',
      '<span>Truck &amp; Skids</span>':'<span>Truck</span>',
      '<span>Date &amp; Time</span>':'<span>Time</span>',
      '<h3 class="stepTitle">Truck and handling details</h3>':'<h3 class="stepTitle">Truck &amp; Skids</h3>',
      '<h3 class="stepTitle">Pick an available time</h3>':'<h3 class="stepTitle">Choose a Time</h3>',
      '<h3 class="stepTitle">Requester and reference</h3>':'<h3 class="stepTitle">Contact &amp; Reference</h3>',
      '<span>Place Appointment</span>':'<span>Book Appointment</span>',
      './my-appointments.html?v=68-db47':'./my-appointments.html?v=73-db52'
    }
    for old,new in pairs.items():
        text=text.replace(old,new)
    path.write_text(text)


def main():
    update_config(Path('maxdock-config.js'))
    update_my_appointments(Path('my-appointments.html'))
    simplify_booking_html(Path('index.html'))
    simplify_booking_html(Path('dashboard.html'))
    queue=Path('queue.html')
    queue.write_text(queue.read_text().replace('id="refreshQueue" type="button">Refresh queue</button>','id="refreshQueue" type="button">Refresh</button>'))

    deployment='''MaxDock DB52 — Reliable booking placement and simplified five-step flow\n\nUser-visible changes\n- Replaces the unreliable My Appointments booking link with a role-aware Book an Appointment button.\n- Waits for the authenticated booking context before opening the booking modal.\n- Returns direct bookings to My Appointments when the modal is closed.\n- Moves Dashboard Book Appointment and Block Time into the first control banner.\n- Applies the Save settings teal treatment to Dashboard actions and Queue Refresh.\n- Simplifies the booking modal to five short steps with less explanatory text.\n- Restores a clear outline and light shadow around the active booking step.\n- Improves vertical spacing and phone/iPad layout.\n\nRelease marker\n- MaxDock-v73-DB52\n- DB52 · reliable booking actions and simplified five-step scheduling active\n\nData and deployment impact\n- Frontend-only release.\n- No Supabase migration.\n- No Edge Function deployment.\n'''
    Path('DEPLOYMENT_DB52.txt').write_text(deployment)
    for name in ['maxdock-config.js','my-appointments.html','index.html','dashboard.html','queue.html','DEPLOYMENT_DB52.txt']:
        Path('db04',name).write_text(Path(name).read_text())

if __name__=='__main__':
    main()
