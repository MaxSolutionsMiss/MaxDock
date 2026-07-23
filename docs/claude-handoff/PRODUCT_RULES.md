# Product rules and decisions

These are established requirements, not suggestions to redesign casually.

## Roles and landing pages

- `system_admin`: all locations, User Management, Data Integration, settings, operations, and reports.
- `site_admin`: authorized locations, settings, operations, booking, editing, and reports as permitted.
- `shipping_manager`: operational landing page and queue-oriented work.
- `coordinator`: operational queue, booking, and schedule work within assigned access.
- `customer`: booking-only experience plus their own appointments; no shared schedule, settings, reports, or administration.

Always verify the live `roles`, `permissions`, and `role_permissions` data before assuming a role can call an RPC.

## Booking and routed movements

- Staff Direction defaults to Outbound but staff may choose Inbound when booking on behalf of an external sender.
- Customer UI says Outbound to Max Solutions; the receiving Max site stores and displays it as inbound.
- Internal Max-to-Max routes reserve a real configured dock at both sites atomically.
- A routed appointment appears outbound on the origin dock and inbound on the destination dock at the same time.
- Never reintroduce a generic “Linked movement” schedule lane.
- Receiving-site hours, dock compatibility, appointment duration, capacity, and conflicts govern routed availability.
- Customer accounts never see internal dock names.
- Staff may enter a Customer or Vendor company name in a blank field. Do not expose a cross-company directory.
- Signed-in external accounts reuse the company identity assigned in User Management and may book only their permitted Max locations.

## Appointment types

- WIP is valid.
- VIP was historically added, then deactivated/removed from new choices. Do not restore VIP without explicit approval.
- Customer choices exclude Sister Plant Transfer and Vendor Delivery, along with other internal-only types.

## Operating hours, capacity, and intelligence

- Authorized staff may intentionally confirm an outside-hours time; customer accounts remain inside ordinary operating hours.
- After-hours use records who confirmed it and when.
- Optional skid-capacity planning combines the latest occupancy snapshot with scheduled inbound and outbound skid movement.
- Warn mode informs users; Enforce mode removes over-capacity inbound slots and suggests the earliest workable date.
- Reverse internal movements within the matching window may generate a return-load suggestion. The system never merges loads automatically; both sites and the carrier must confirm.

## Live data and user experience

- Dashboard, Queue, Reports, My Appointments, and full-screen operational displays refresh appointment data every three minutes. Dashboard and Queue also provide an explicit Refresh action.
- Do not rebuild or jump the “Pick an Available Time” control while the user is selecting a slot.
- Gear/dropdown menus close on outside click and Escape.
- Keep the interface calm, compact, readable, operation-oriented, and responsive. Use the approved Arial/Helvetica system typography.
- The booking wizard is intentionally condensed: solid restrained step cards, large plain numbers, readable route/requester guidance, and no circular step badges or top ribbons.

## Audit and privacy

- Keep cancelled appointments and immutable audit history; do not add permanent deletion as a routine operation.
- Usage analytics are daily aggregates only. Never capture appointment content, passwords, or typed field values.
- External users must not learn other customer/vendor names or appointments.
