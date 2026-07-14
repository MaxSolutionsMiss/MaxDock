MaxDock v46-DB05 — Supabase User Administration Build

Supabase project
- URL: https://rywzqepzramurbrpmept.supabase.co
- Frontend authentication uses the publishable key in maxdock-config.js.
- No secret or service-role key is included.

Database prerequisites
1. MaxDock_DB_v01_Foundation.sql
2. MaxDock_DB_v02_Location_Settings.sql
3. MaxDock_DB_v03_Appointment_Schedule.sql
4. MaxDock_DB_v04_Booking_Functions.sql
5. MaxDock_DB_v05_User_Administration.sql

Secure invitation prerequisite
- Deploy the Supabase Edge Function named maxdock-invite-user.
- Add the deployed set-password.html URL to the Supabase Auth redirect allow list.
- The service-role key stays inside Supabase and is never included in these browser files.

Deployment
- Upload every file in this folder to the existing GitHub Pages db04 folder.
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
- Cancelled appointments remain in the appointment list but are removed from the visual dock schedule
- System Admin user list with role, active status, and permitted-location management
- Secure user invitations by email through the maxdock-invite-user Edge Function

Notes
- Internal users sign in with their email address.
- Permanent appointment deletion is intentionally omitted to preserve audit history.
- The original MaxDock v46 visual interface is retained; maxdock-integration.js replaces its browser-storage data path at runtime.
