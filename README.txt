MaxDock v46-DB15 — Refined Booking and Action Layout Build

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
6. MaxDock_DB_v06_Appointment_Editing.sql
7. MaxDock_DB_v07_Customer_Booking_Access.sql
8. MaxDock_DB_v08_User_Password_Reset_Audit.sql
9. MaxDock_DB_v09_Operational_Features.sql
10. MaxDock_DB_v10_Operations_Intelligence.sql

Secure account-service prerequisite
- Deploy the Supabase Edge Function named maxdock-invite-user.
- Deploy the Supabase Edge Function named maxdock-ai-brief.
- Add the deployed set-password.html URL to the Supabase Auth redirect allow list.
- The service-role key stays inside Supabase and is never included in these browser files.

Deployment
- Upload every file in this folder to the repository root and the existing GitHub Pages db04 folder.
- Open login.html, or open index.html and MaxDock will redirect to login.
- Sign in with the MaxDock username or the Supabase Auth email.
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
- Secure, time-limited invitation links that can be copied or placed in an Outlook draft
- Temporary-password accounts that do not require an email invitation
- Forced private password change after a temporary user's first sign-in
- Username or email sign-in through Supabase Auth
- System Admin username editing and protected account deletion
- System Admin password reset with a server-generated temporary password
- Mandatory password change after an administrator reset
- Password-reset audit history without storing passwords
- System Admin and Site Admin appointment editing from the timeline or appointment list
- Single Yes/No appointment cancellation without a reason prompt
- Booking-only Customer role without schedule, settings, report, or administration access
- Appointment location selection inside Step 1 of the booking wizard
- Header location selection limited to System Admin and Site Admin
- Customer availability access without visibility into scheduled appointment records
- My Appointments page showing only bookings created by the signed-in user
- Requester self-cancellation for upcoming scheduled appointments
- In-app booking and appointment-change notifications
- Permission-controlled operational reports for administrators, managers, and coordinators
- Booking volume, cancellation, scheduled-hour, skid, vehicle-mix, and dock-utilization reporting
- Per-dock vehicle compatibility managed with checkboxes in Settings
- Compatibility-aware slot counts, automatic dock assignment, and appointment editing
- Daily Operations Queue with inbound, outbound, dock restrictions, and shift actions
- Shipping-manager queue shortcut on the main page and dashboard
- Header notification bell with an unread counter
- Daily volume and occupied-capacity trend chart
- Hourly capacity heatmap
- Dock-to-vehicle compatibility matrix
- Privacy-safe AI Operations Brief with a working MaxDock rules fallback
- Operational roles bypass the customer-facing Main Page after sign-in
- System Admin and Site Admin land on Dashboard; Shipping Manager and Coordinator land on Operations Queue
- Operations Queue supports Pending, All, and Completed views with Mark Complete and Reopen as Pending actions
- Dashboard actions are compact, with Today’s Queue and Place Appointment visually prioritized
- Calm system-font hierarchy with sentence-case labels and reduced heavy bold styling
- Larger, mobile-readable Operations Queue shipment details
- Consistent low-emphasis styling for print, export, and secondary text actions
- Coordinator appointment editing and schedule movement through existing permissions
- Full-screen TV schedule with automatic appointment refresh every three seconds
- Customer Main Page contains only the booking workflow; the redundant queue shortcut is removed
- Compact page headings and a balanced header with the location selector beside the account controls
- Request Appointment uses the same calm system typeface as the authenticated pages with a lighter, more readable weight
- Dashboard primary actions use an aligned three-column layout on wider screens
- Export and Print controls use equal dimensions and a consistent aligned utility group across Dashboard, Operations Queue, and Reports
- Operational Reports now includes a matching Print control

Notes
- Passwords remain in Supabase Auth and are never stored in MaxDock tables.
- Temporary credentials and invitation links must be shared privately.
- Reset passwords are generated by the server, shown once, and never stored in MaxDock tables.
- Automated email delivery remains disabled until a production email provider is connected; DB-v09 records email-ready notification data without claiming delivery.
- AI activation requires OPENAI_API_KEY in Supabase Edge Function secrets. Until it is added, the same brief area honestly displays MaxDock Rules Analysis.
- AI context contains aggregate operational counts only and excludes names, emails, references, and appointment notes.
- Deleting a user removes the login while preserving appointment and audit history.
- Permanent appointment deletion is intentionally omitted to preserve audit history.
- The original MaxDock v46 visual interface is retained; maxdock-integration.js replaces its browser-storage data path at runtime.
