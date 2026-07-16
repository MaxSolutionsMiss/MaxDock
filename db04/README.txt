MaxDock v46-DB23 — Staff Scheduling and Return-Load Intelligence Build

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
11. MaxDock_DB_v11_Smart_Operations.sql
12. MaxDock_DB_v12_Customer_Access.sql
13. MaxDock_DB_v13_User_Preferences_Usage.sql
14. MaxDock_DB_v14_Live_Capacity_MIS.sql
15. MaxDock_DB_v15_After_Hours_Return_Loads.sql

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
- Calm type hierarchy with sentence-case labels and reduced heavy bold styling
- Larger, mobile-readable Operations Queue shipment details
- Consistent low-emphasis styling for print, export, and secondary text actions
- Coordinator appointment editing and schedule movement through existing permissions
- Dashboard, Queue, Reports, My Appointments, booking availability, and full-screen displays refresh appointment data every five seconds
- Customer Main Page contains only the booking workflow; the redundant queue shortcut is removed
- Compact page headings and a balanced header with the location selector beside the account controls
- Request Appointment uses the same calm system typeface as the authenticated pages with a lighter, more readable weight
- Dashboard primary actions use an aligned three-column layout on wider screens
- Export and Print controls use equal dimensions and a consistent aligned utility group across Dashboard, Operations Queue, and Reports
- Operational Reports now includes a matching Print control
- Arial-first typography and standard 400/600/700 weights for a cleaner, more consistent interface
- Unified primary, secondary, utility, and semantic button sizes across Dashboard, Queue, Reports, Settings, Admin, and booking flows
- Responsive Queue date controls with equal-height Today, Tomorrow, and Refresh Queue actions
- Morning Shift Brief with first load, peak period, docks in use, priority volume, and smart exception counts
- Smart slot ranking based on compatible capacity, location workload, and an optional preferred time window
- Operational users receive a balanced suggested dock while customer accounts never receive dock names
- Personal reusable booking templates protected by owner-only row-level security
- Permission-controlled appointment history using the existing immutable audit log
- Smart scheduling, history, and booking RPCs restricted to signed-in MaxDock users
- Full-screen TV schedule expands dock lanes, appointment cards, and shipment details to use the available display height
- TV mode automatically returns to the normal schedule proportions after exit
- Operational Reports offers Overview, Truck Flow, Skid Movement, and Dock Utilization views
- Report periods include Past 7 Days, Past 30 Days, This Month, and Custom Range
- Featured report charts, daily tables, and CSV exports follow the selected report view
- Dock Doors and Vehicle Compatibility uses the full Settings width with a compact, always-visible Action column
- Operating Hours and Timing Rules are aligned in the same balanced Settings row
- Open Full-Screen View launches a separate live schedule window so the original Dashboard remains available for editing
- The schedule display follows the selected location and date, refreshes every five seconds, and provides a user-activated full-screen control
- Full-screen schedule typography scales by available height and dock count for maximum readable distance
- Operations Queue defaults to eight larger metrics, including Priority Loads and Due Soon
- Morning Shift Brief cards are taller, color-coded, and easier to scan from a distance
- Each signed-in user can customize visible briefing cards and Queue metrics or restore the default view
- Full-screen schedule cards cap typography to their actual appointment width, use a compact time range, and wrap shipment details without horizontal clipping
- Customer accounts automatically receive every active MaxDock location and choose the booking location inside the appointment workflow
- New and edited Customer accounts no longer require individual permitted-location selections
- MaxDock password forms and temporary-password creation use Supabase's supported 6-character minimum
- Operations Queue provides a separate live full-screen window while the original Queue remains available on the working monitor
- Full-screen Operations Queue follows the selected location, date, and view and refreshes appointment data every five seconds
- Subtle self-service password recovery from the sign-in page using Supabase's secure email reset flow
- A forgotten username no longer blocks access because the connected email address can also be used to sign in
- Dashboard, Operations Queue, and Reports views save automatically to the signed-in user's profile
- Saved Queue preferences include Today/Tomorrow/custom date mode, Pending/All/Completed view, location, briefing cards, and metrics
- Saved Dashboard preferences include location, appointment status, schedule scale, operating period, and relative date mode
- Saved Reports preferences include location, report view, date preset, and custom dates
- System Admin adoption reporting shows tracked logins, active days, recent visible-app time, page views, and last activity for each user
- Usage analytics store privacy-conscious daily aggregates only and do not record appointment content, typed values, or passwords
- Each location can optionally define total skid capacity, current occupied skids, reserved safety space, and warning or enforcement behaviour
- Capacity projections combine the latest inventory baseline with scheduled inbound and outbound skid movement
- Enforced capacity removes over-capacity inbound slots and suggests the earliest workable operating date
- System Admin MIS settings store non-secret connection metadata for a future server-side database bridge
- Daily inventory CSV imports update location occupancy baselines and preserve an auditable import history
- Authorized staff can review and intentionally confirm a custom appointment time outside operating hours
- Customer accounts remain restricted to ordinary available times inside operating hours
- After-hours confirmations record the confirming staff user and timestamp for auditability
- Dashboard timelines expand to show early, late, and cross-midnight after-hours appointments
- Internal MaxDock-to-MaxDock routes are checked for reverse movements within an 18-hour consolidation window
- Booking, Dashboard, and Operations Queue show potential return-load recommendations to staff
- Return-load recommendations never merge appointments automatically and require confirmation with both sites and the carrier

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
- Password recovery email delivery depends on the Supabase Auth email provider and the deployed set-password.html URL remaining in the Auth redirect allow list.
- Aggregate usage tracking begins after DB20 is deployed; earlier activity is not reconstructed.
- The DB21 live MIS bridge is configuration-ready but remains inactive until the MIS database type, network route, credentials secret, and source-table mapping are approved.
- MIS database passwords must be stored as protected server-side secrets and must never be entered in MaxDock browser fields.
- DB23 route matching relies on the structured requester location selected for internal MaxDock transfers; free-text vendor and customer names are not treated as internal routes.
