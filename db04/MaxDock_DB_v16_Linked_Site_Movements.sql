-- MaxDock DB24: linked intersite schedule movements and an authenticated location directory

create or replace function public.list_active_location_directory()
returns table (
  id uuid,
  code text,
  name text,
  timezone text,
  is_active boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view MaxDock locations.';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active
  ) then
    raise exception 'This MaxDock account is inactive.';
  end if;

  return query
  select l.id, l.code::text, l.name::text, l.timezone::text, l.is_active
  from public.locations l
  where l.is_active
  order by l.name;
end;
$$;

create or replace function public.resolve_internal_route_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location public.locations%rowtype;
begin
  if new.entry_kind <> 'appointment' or new.requester_location_id is not null then
    return new;
  end if;

  select l.* into v_location
  from public.locations l
  where l.is_active
    and l.id <> new.location_id
    and (
      lower(trim(l.name)) = lower(trim(coalesce(new.company_name, '')))
      or lower(trim(l.name)) = lower(trim(coalesce(new.requester_type, '')))
    )
  order by case
    when lower(trim(l.name)) = lower(trim(coalesce(new.company_name, ''))) then 0
    else 1
  end, l.name
  limit 1;

  if found then
    new.requester_location_id := v_location.id;
    new.requester_type := v_location.name;
    new.company_name := null;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_resolve_internal_route on public.appointments;
create trigger appointments_resolve_internal_route
before insert or update of location_id, requester_location_id, requester_type, company_name, entry_kind
on public.appointments
for each row execute function public.resolve_internal_route_location();

update public.appointments a
set requester_location_id = l.id,
    requester_type = l.name,
    company_name = null,
    updated_at = now()
from public.locations l
where a.entry_kind = 'appointment'
  and a.requester_location_id is null
  and l.is_active
  and l.id <> a.location_id
  and (
    lower(trim(l.name)) = lower(trim(coalesce(a.company_name, '')))
    or lower(trim(l.name)) = lower(trim(coalesce(a.requester_type, '')))
  );

create or replace function public.list_location_schedule(p_location_id uuid)
returns table (schedule_record jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view the MaxDock schedule.';
  end if;
  select p.role_code into v_role
  from public.profiles p
  where p.id = auth.uid() and p.is_active;
  if not found then
    raise exception 'This MaxDock account is inactive.';
  end if;
  if v_role = 'customer' then
    raise exception 'Customer accounts cannot view linked internal movements.';
  end if;
  if not public.has_location_access(p_location_id)
     or not public.has_permission('appointment.view') then
    raise exception 'You do not have access to this MaxDock location.';
  end if;
  if not exists (
    select 1 from public.locations l where l.id = p_location_id and l.is_active
  ) then
    raise exception 'The selected MaxDock location is inactive.';
  end if;

  return query
  with schedule_rows as (
    select
      a.*,
      false as is_linked_movement,
      a.direction::text as display_direction,
      a.requester_location_id as display_counterpart_location_id,
      coalesce(counterpart.name, nullif(trim(a.company_name), ''), nullif(trim(a.requester_type), ''), 'TBD') as display_counterpart_location_name,
      case when a.direction = 'inbound' then coalesce(counterpart.name, nullif(trim(a.company_name), ''), nullif(trim(a.requester_type), ''), 'External location') else physical.name end as route_origin_name,
      case when a.direction = 'inbound' then physical.name else coalesce(counterpart.name, nullif(trim(a.company_name), ''), nullif(trim(a.requester_type), ''), 'External location') end as route_destination_name
    from public.appointments a
    join public.locations physical on physical.id = a.location_id
    left join public.locations counterpart on counterpart.id = a.requester_location_id
    where a.location_id = p_location_id

    union all

    select
      a.*,
      true as is_linked_movement,
      case when a.direction = 'inbound' then 'outbound' else 'inbound' end as display_direction,
      a.location_id as display_counterpart_location_id,
      physical.name as display_counterpart_location_name,
      case when a.direction = 'inbound' then counterpart.name else physical.name end as route_origin_name,
      case when a.direction = 'inbound' then physical.name else counterpart.name end as route_destination_name
    from public.appointments a
    join public.locations physical on physical.id = a.location_id
    join public.locations counterpart on counterpart.id = a.requester_location_id
    where a.entry_kind = 'appointment'
      and a.requester_location_id = p_location_id
      and a.location_id <> p_location_id
  )
  select (case when s.is_linked_movement then
      to_jsonb(s)
        - 'requester_name'
        - 'requester_email'
        - 'created_by'
        - 'updated_by'
        - 'after_hours_confirmed_by'
    else to_jsonb(s) end) || jsonb_build_object(
    'schedule_location_id', p_location_id,
    'physical_location_id', s.location_id
  )
  from schedule_rows s
  order by s.start_at, s.booking_reference;
end;
$$;

revoke all on function public.list_active_location_directory() from public, anon;
revoke all on function public.list_location_schedule(uuid) from public, anon;
revoke all on function public.resolve_internal_route_location() from public, anon, authenticated;

grant execute on function public.list_active_location_directory() to authenticated;
grant execute on function public.list_location_schedule(uuid) to authenticated;

insert into public.maxdock_schema_versions(version, description)
values ('DB-v16', 'Authenticated site directory, linked intersite schedule movements, and internal route normalization')
on conflict (version) do update
set description = excluded.description,
    applied_at = now();
