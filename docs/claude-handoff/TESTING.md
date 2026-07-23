# Testing and verification

## Automated repository checks

```bash
find . -type f -name '*.js' -not -path './.git/*' -print0 | xargs -0 -n1 node --check
git diff --check
bash ./scripts/verify-root-db04-parity.sh
```

For TypeScript Edge Functions, inspect imports and run the available Deno/type check when the execution environment provides it. A missing local CLI does not justify deploying unreviewed source.

## Manual role matrix

| Area | System/Site Admin | Shipping/Coordinator | Customer |
| --- | --- | --- | --- |
| Login and landing | Dashboard/Admin as permitted | Operations Queue | Booking-only main page |
| Location access | All/assigned locations | Assigned locations | Permitted booking destinations only |
| Booking direction | Outbound default; may choose Inbound | Outbound default; may choose Inbound | Outbound to Max Solutions |
| Dock visibility | Operational dock details | Operational dock details | No internal dock names |
| Administration | Role/permission dependent | Hidden unless permitted | Hidden |
| Shared schedule/reports | Permission dependent | Permission dependent | Hidden |

## Critical workflow checks

- Book an internal Max-to-Max route and confirm the same time appears outbound on the origin's selected dock and inbound on the destination's selected dock.
- Confirm no generic Linked movement lane appears.
- Book as a customer and verify other external company names and dock names are never exposed.
- Verify authorized staff receive an explicit confirmation for outside-hours bookings and the audit marker persists.
- Verify customer availability stays inside operating hours.
- Check warn/enforce capacity behavior with an inventory baseline and scheduled skid movement.
- Confirm return-load suggestions are advisory only and never auto-merge appointments.
- Confirm Dashboard, Queue, Reports, My Appointments, and full-screen views receive fresh appointment data every five seconds without disrupting an in-progress slot selection.
- Confirm the gear menu closes on outside click and Escape.
- Confirm User Management and Data Integration remain distinct admin destinations.
- Verify password recovery, temporary-password forced change, username/email login, and customer permitted-location editing after any auth/admin change.

## Live delivery check

After Pages deployment, open the live application with a new cache-busting query value. Confirm the gear menu shows the intended release marker, verify the exact affected workflow in root and `db04/`, and inspect the Pages Action if the marker is stale.
