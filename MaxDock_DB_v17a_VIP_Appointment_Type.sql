-- MaxDock DB25 refinement: add VIP as a bookable appointment type at every active location.

do $$
begin
  if not exists (select 1 from public.appointment_types where code = 'vip') then
    update public.appointment_types
    set sort_order = sort_order + 1,
        updated_at = now()
    where sort_order >= 4;
  end if;
end;
$$;

insert into public.appointment_types (
  code, name, default_adjustment_minutes, sort_order, is_active
)
values ('vip', 'VIP', 0, 4, true)
on conflict (code) do update
set name = excluded.name,
    default_adjustment_minutes = excluded.default_adjustment_minutes,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

insert into public.location_appointment_types (
  location_id, appointment_type_code, adjustment_minutes, is_active
)
select l.id, 'vip', 0, true
from public.locations l
where l.is_active
on conflict (location_id, appointment_type_code) do update
set adjustment_minutes = excluded.adjustment_minutes,
    is_active = true,
    updated_at = now();

insert into public.maxdock_schema_versions(version, description)
values ('DB-v17.1', 'VIP appointment type enabled at every active MaxDock location')
on conflict (version) do update
set description = excluded.description,
    applied_at = now();
