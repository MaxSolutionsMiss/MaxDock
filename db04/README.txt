MaxDock v46-DB04 — Supabase Integration Build

Supabase project
- URL: https://rywzqepzramurbrpmept.supabase.co
- Frontend authentication uses the publishable key in maxdock-config.js.
- No secret or service-role key is included.

Database prerequisites
1. MaxDock_DB_v01_Foundation.sql
2. MaxDock_DB_v02_Location_Settings.sql
3. MaxDock_DB_v03_Appointment_Schedule.sql
4. MaxDock_DB_v04_Booking_Functions.sql

Deployment
- Upload every file in this folder to the same private static web root.
- Open login.html, or open index.html and MaxDock will redirect to login.
- Sign in with the email and password of the Supabase Auth user.
- Public sign-up must remain disabled in Supabase Authentication settings.

Integrated database operations
- Authentication and session persistence
- RLS-filtered locations, roles, and permissions
- Live slot availability through list_available_appointment_slots
- Atomic booking through book_appointment
- Dock blocks through block_dock_time
- Completed/cancelled status changes through change_appointment_status
- Location timing, operating-hour, and dock settings

Notes
- This first internal build signs in with the user's email address.
- Permanent appointment deletion is intentionally omitted to preserve audit history.
- The original MaxDock v46 visual interface is retained; maxdock-integration.js replaces its browser-storage data path at runtime.
