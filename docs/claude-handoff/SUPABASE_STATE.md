# Supabase production state

Snapshot date: 2026-07-23. This is operational metadata only; no production row data or secret values are included.

## Project

- Project URL: `https://rywzqepzramurbrpmept.supabase.co`
- Browser publishable key: already configured in the mirrored `maxdock-config.js` files
- Public sign-up: must remain disabled
- Auth redirect allow list: must include the deployed `set-password.html` URL
- Generated live schema contract: `supabase/database.types.ts`

The generated type file is a schema snapshot, not a replacement for migrations. Regenerate it after every applied schema migration and review its diff.

## Applied production migrations

| Version | Name |
| --- | --- |
| 20260715040815 | `db_v07_customer_booking_access` |
| 20260715121353 | `db_v08_user_password_reset_audit` |
| 20260715133906 | `db_v09_operational_features` |
| 20260715153829 | `db_v10_operations_intelligence` |
| 20260715182254 | `db_v11_smart_operations` |
| 20260715182415 | `db_v11_smart_operations_fix` |
| 20260715183302 | `db_v11_restrict_smart_operations_execution` |
| 20260715200415 | `maxdock_db19_customer_access` |
| 20260716144036 | `maxdock_db20_user_preferences_usage` |
| 20260716160453 | `maxdock_db21_live_capacity_mis` |
| 20260716184004 | `maxdock_db23_after_hours_return_loads` |
| 20260716194838 | `maxdock_db24_linked_site_movements` |
| 20260716195355 | `maxdock_db24_remove_duplicate_route_index` |
| 20260716203543 | `maxdock_db25_wip_appointment_type` |
| 20260717031956 | `maxdock_db25_vip_appointment_type` |
| 20260717041443 | `maxdock_db26_dual_site_dock_routing` |
| 20260717044551 | `maxdock_db27_customer_identity_booking` |
| 20260717044728 | `maxdock_db27_secure_customer_identity_rpcs` |
| 20260717044932 | `maxdock_db27_canonical_company_directory` |
| 20260717122947 | `maxdock_db28_customer_location_access` |
| 20260720185521 | `maxdock_db39_dock_scheduling_policy` |

Important: the repository contains later release SQL beginning at v11, but not a complete clean-room migration history for v01 through v10 or every production hotfix. Production is authoritative. Do not reset, reconstruct, or replay the database from the checked-in SQL. Inspect the live ledger and create one new forward-only named migration for any schema change.

## Public tables

All 27 listed tables currently have RLS enabled:

`appointments`, `appointment_audit_log`, `appointment_types`, `booking_templates`, `docks`, `dock_truck_types`, `handling_types`, `locations`, `location_appointment_types`, `location_handling_types`, `location_inventory_snapshots`, `location_operating_hours`, `location_settings`, `location_truck_types`, `maxdock_schema_versions`, `mis_import_runs`, `mis_integration_settings`, `permissions`, `profiles`, `roles`, `role_permissions`, `truck_types`, `user_admin_audit_log`, `user_location_access`, `user_notifications`, `user_preferences`, `user_usage_daily`.

Use `supabase/database.types.ts` for exact columns, relationships, and RPC signatures. Query production row data only when a requested diagnosis requires it, and return the minimum necessary information.

## Deployed Edge Functions

| Function | Live version | JWT gateway | Live source hash |
| --- | ---: | --- | --- |
| `maxdock-invite-user` | 8 | Disabled; function performs its own authorization | `14b6c22383365a81294ed671573e4fac5c426589b2faccde5b722014f6e09fd0` |
| `maxdock-ai-brief` | 1 | Disabled; function validates the bearer session itself | `4ecaea189eb36112b9edd19228f69a7dec0ad84ff4b59a1407e10ee1bda27e50` |

DB70's checked-in `maxdock-invite-user` source was verified byte-for-byte
against production during handoff. DB71 raises the candidate source's temporary
password minimum to 12 characters; that source is not deployed. The live
`maxdock-ai-brief` source was recovered into this repository because it had not
previously been checked in.

## Current advisor findings

The 2026-07-23 read-only advisor check reports 24 unindexed foreign keys, five
RLS auth-init-plan advisories, eleven duplicate permissive SELECT-policy
advisories, anonymously executable security-definer functions, and disabled
leaked-password protection. `MaxDock_DB_v22_DB71_Security_Performance.sql`
contains only the reviewed RPC-grant and index portion and remains unapplied.
Policy consolidation and Auth settings require separate production review.

## Secret names only

Edge Functions may rely on `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MAXDOCK_APP_URL`, `OPENAI_API_KEY`, and optional `OPENAI_MODEL`. Supabase supplies its standard project variables. Values must remain in Supabase secret storage and must never be copied into GitHub, a ZIP, a prompt, or browser code.
