-- MaxDock DB71 candidate: remove anonymous RPC execution and add foreign-key indexes.
-- Review and apply only after DB71 is approved. This migration does not alter product data.

begin;

-- Trigger-only SECURITY DEFINER functions must never be exposed through PostgREST.
revoke execute on function public.audit_appointment_change() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.notify_appointment_owner() from public, anon, authenticated;
revoke execute on function public.prepare_appointment_record() from public, anon, authenticated;

-- Browser RPCs require an authenticated MaxDock session. The functions retain their
-- existing internal authorization and location-access checks.
revoke execute on function public.block_dock_time(uuid, date, time without time zone, integer, uuid[], text, text) from public, anon;
revoke execute on function public.calculate_appointment_duration(uuid, text, text, integer, text, boolean) from public, anon;
revoke execute on function public.cancel_my_appointment(uuid) from public, anon;
revoke execute on function public.change_appointment_status(uuid, text, text) from public, anon;
revoke execute on function public.complete_password_setup() from public, anon;
revoke execute on function public.current_maxdock_role() from public, anon;
revoke execute on function public.has_location_access(uuid) from public, anon;
revoke execute on function public.has_permission(text) from public, anon;
revoke execute on function public.is_system_admin() from public, anon;
revoke execute on function public.list_available_appointment_slots(uuid, date, text, text, integer, text, boolean) from public, anon;
revoke execute on function public.list_my_appointments() from public, anon;

grant execute on function public.block_dock_time(uuid, date, time without time zone, integer, uuid[], text, text) to authenticated, service_role;
grant execute on function public.calculate_appointment_duration(uuid, text, text, integer, text, boolean) to authenticated, service_role;
grant execute on function public.cancel_my_appointment(uuid) to authenticated, service_role;
grant execute on function public.change_appointment_status(uuid, text, text) to authenticated, service_role;
grant execute on function public.complete_password_setup() to authenticated, service_role;
grant execute on function public.current_maxdock_role() to authenticated, service_role;
grant execute on function public.has_location_access(uuid) to authenticated, service_role;
grant execute on function public.has_permission(text) to authenticated, service_role;
grant execute on function public.is_system_admin() to authenticated, service_role;
grant execute on function public.list_available_appointment_slots(uuid, date, text, text, integer, text, boolean) to authenticated, service_role;
grant execute on function public.list_my_appointments() to authenticated, service_role;

-- Cover foreign keys used by appointment, access, notification, MIS, and template queries.
create index if not exists appointment_audit_log_changed_by_idx
  on public.appointment_audit_log(changed_by);
create index if not exists appointments_counterpart_dock_location_idx
  on public.appointments(requester_location_id, counterpart_dock_id);
create index if not exists appointments_created_by_idx
  on public.appointments(created_by);
create index if not exists appointments_dock_location_fk_idx
  on public.appointments(dock_id, location_id);
create index if not exists appointments_location_handling_cover_idx
  on public.appointments(location_id, handling_type_code);
create index if not exists appointments_location_truck_cover_idx
  on public.appointments(location_id, truck_type_code);
create index if not exists appointments_location_type_cover_idx
  on public.appointments(location_id, appointment_type_code);
create index if not exists appointments_updated_by_idx
  on public.appointments(updated_by);
create index if not exists booking_templates_location_type_cover_idx
  on public.booking_templates(location_id, appointment_type_code);
create index if not exists booking_templates_location_handling_cover_idx
  on public.booking_templates(location_id, handling_type_code);
create index if not exists booking_templates_location_truck_cover_idx
  on public.booking_templates(location_id, truck_type_code);
create index if not exists dock_truck_types_created_by_idx
  on public.dock_truck_types(created_by);
create index if not exists dock_truck_types_dock_location_idx
  on public.dock_truck_types(dock_id, location_id);
create index if not exists location_appointment_types_code_idx
  on public.location_appointment_types(appointment_type_code);
create index if not exists location_handling_types_code_idx
  on public.location_handling_types(handling_type_code);
create index if not exists location_inventory_snapshots_imported_by_idx
  on public.location_inventory_snapshots(imported_by);
create index if not exists location_truck_types_code_idx
  on public.location_truck_types(truck_type_code);
create index if not exists mis_import_runs_imported_by_idx
  on public.mis_import_runs(imported_by);
create index if not exists mis_integration_settings_updated_by_idx
  on public.mis_integration_settings(updated_by);
create index if not exists profiles_role_code_idx
  on public.profiles(role_code);
create index if not exists role_permissions_permission_code_idx
  on public.role_permissions(permission_code);
create index if not exists user_location_access_granted_by_idx
  on public.user_location_access(granted_by);
create index if not exists user_notifications_appointment_id_idx
  on public.user_notifications(appointment_id);

insert into public.maxdock_schema_versions(version, description)
values ('DB71', 'Anonymous RPC execution revoked and foreign-key indexes added')
on conflict (version) do update
set description = excluded.description,
    applied_at = now();

notify pgrst, 'reload schema';

commit;
