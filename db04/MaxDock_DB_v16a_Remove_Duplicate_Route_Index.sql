-- MaxDock DB24 maintenance: DB23 already provides the intersite route lookup index.

drop index if exists public.appointments_requester_location_schedule_idx;

insert into public.maxdock_schema_versions(version, description)
values ('DB-v16.1', 'Removed the redundant DB24 intersite route lookup index')
on conflict (version) do update
set description = excluded.description,
    applied_at = now();
