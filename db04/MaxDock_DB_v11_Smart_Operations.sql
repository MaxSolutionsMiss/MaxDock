-- MaxDock DB v11: smart scheduling, booking templates, and history access
begin;

create table if not exists public.booking_templates (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  direction text not null check (direction in ('inbound', 'outbound')),
  requester_type text not null check (char_length(trim(requester_type)) between 2 and 80),
  company_name text,
  appointment_type_code text not null,
  truck_type_code text not null,
  skid_count integer not null default 0 check (skid_count >= 0),
  handling_type_code text not null,
  is_priority boolean not null default false,
  carrier_name text,
  preferred_start_time time,
  preferred_end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_templates_location_appointment_type_fk
    foreign key (location_id, appointment_type_code)
    references public.location_appointment_types(location_id, appointment_type_code),
  constraint booking_templates_location_truck_type_fk
    foreign key (location_id, truck_type_code)
    references public.location_truck_types(location_id, truck_type_code),
  constraint booking_templates_location_handling_type_fk
    foreign key (location_id, handling_type_code)
    references public.location_handling_types(location_id, handling_type_code),
  constraint booking_templates_owner_location_name_key
    unique (owner_user_id, location_id, name),
  constraint booking_templates_preferred_window_check check (
    (preferred_start_time is null and preferred_end_time is null)
    or (preferred_start_time is not null and preferred_end_time is not null and preferred_start_time < preferred_end_time)
  )
);

comment on table public.booking_templates is
  'Personal reusable MaxDock load settings and optional preferred booking windows.';

create index if not exists booking_templates_owner_location_idx
  on public.booking_templates(owner_user_id, location_id, updated_at desc);

alter table public.booking_templates enable row level security;

drop policy if exists booking_templates_select_own on public.booking_templates;
create policy booking_templates_select_own on public.booking_templates
  for select to authenticated
  using (owner_user_id = (select auth.uid()) and public.has_location_access(location_id));

drop policy if exists booking_templates_insert_own on public.booking_templates;
create policy booking_templates_insert_own on public.booking_templates
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()) and public.has_location_access(location_id));

drop policy if exists booking_templates_update_own on public.booking_templates;
create policy booking_templates_update_own on public.booking_templates
  for update to authenticated
  using (owner_user_id = (select auth.uid()) and public.has_location_access(location_id))
  with check (owner_user_id = (select auth.uid()) and public.has_location_access(location_id));

drop policy if exists booking_templates_delete_own on public.booking_templates;
create policy booking_templates_delete_own on public.booking_templates
  for delete to authenticated
  using (owner_user_id = (select auth.uid()) and public.has_location_access(location_id));

grant select, insert, update, delete on public.booking_templates to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'booking_templates_set_updated_at'
      and tgrelid = 'public.booking_templates'::regclass
  ) then
    create trigger booking_templates_set_updated_at
      before update on public.booking_templates
      for each row execute function public.set_updated_at();
  end if;
end
$$;

create or replace function public.list_smart_appointment_slots(
  p_location_id uuid,
  p_date date,
  p_appointment_type_code text,
  p_truck_type_code text,
  p_skid_count integer,
  p_handling_type_code text,
  p_is_priority boolean default false,
  p_preferred_start_time time default null,
  p_preferred_end_time time default null
)
returns table (
  slot_start timestamptz,
  slot_end timestamptz,
  available_docks integer,
  recommendation_rank integer,
  recommendation_score integer,
  recommended_dock_id uuid,
  recommended_dock_name text,
  recommendation_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_can_view_docks boolean;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view available appointment times.';
  end if;
  if not public.has_location_access(p_location_id)
     or not public.has_permission('appointment.create') then
    raise exception 'You do not have permission to schedule appointments for this location.';
  end if;
  if (p_preferred_start_time is null) <> (p_preferred_end_time is null)
     or (p_preferred_start_time is not null and p_preferred_start_time >= p_preferred_end_time) then
    raise exception 'The preferred booking window is invalid.';
  end if;

  select l.timezone into v_timezone
  from public.locations l
  where l.id = p_location_id and l.is_active;
  if not found then raise exception 'The selected location is inactive.'; end if;

  v_can_view_docks := public.has_permission('appointment.view');

  return query
  with available as (
    select s.slot_start, s.slot_end, s.available_docks
    from public.list_available_appointment_slots(
      p_location_id, p_date, p_appointment_type_code, p_truck_type_code,
      p_skid_count, p_handling_type_code, p_is_priority
    ) s
  ), scored as (
    select
      a.slot_start,
      a.slot_end,
      a.available_docks,
      best_dock.id as dock_id,
      best_dock.name as dock_name,
      (
        a.available_docks * 20
        - coalesce(concurrent_load.appointment_count, 0) * 6
        + case
            when p_preferred_start_time is not null
             and (a.slot_start at time zone v_timezone)::time >= p_preferred_start_time
             and (a.slot_end at time zone v_timezone)::time <= p_preferred_end_time
            then 40 else 0
          end
      )::integer as score,
      case
        when p_preferred_start_time is not null
         and (a.slot_start at time zone v_timezone)::time >= p_preferred_start_time
         and (a.slot_end at time zone v_timezone)::time <= p_preferred_end_time
          then format('Matches preferred window · %s compatible dock%s available', a.available_docks, case when a.available_docks = 1 then '' else 's' end)
        when a.available_docks >= 2
          then format('Strong availability · %s compatible docks available', a.available_docks)
        else 'Compatible time · 1 dock available'
      end as reason
    from available a
    join lateral (
      select d.id, d.name
      from public.docks d
      join public.dock_truck_types dtt
        on dtt.dock_id = d.id
       and dtt.location_id = p_location_id
       and dtt.truck_type_code = p_truck_type_code
      where d.location_id = p_location_id
        and d.is_active
        and not exists (
          select 1 from public.appointments conflict
          where conflict.dock_id = d.id
            and conflict.status <> 'cancelled'
            and conflict.schedule_range && tstzrange(a.slot_start, a.slot_end, '[)')
        )
      order by
        coalesce((
          select sum(extract(epoch from (day_load.end_at - day_load.start_at)) / 60)
          from public.appointments day_load
          where day_load.dock_id = d.id
            and day_load.status <> 'cancelled'
            and (day_load.start_at at time zone v_timezone)::date = p_date
        ), 0),
        d.sort_order,
        d.name
      limit 1
    ) best_dock on true
    left join lateral (
      select count(*)::integer as appointment_count
      from public.appointments location_load
      where location_load.location_id = p_location_id
        and location_load.status <> 'cancelled'
        and location_load.entry_kind = 'appointment'
        and location_load.schedule_range && tstzrange(a.slot_start, a.slot_end, '[)')
    ) concurrent_load on true
  ), ranked as (
    select scored.*,
           row_number() over (order by scored.score desc, scored.slot_start)::integer as smart_rank
    from scored
  )
  select
    ranked.slot_start,
    ranked.slot_end,
    ranked.available_docks,
    ranked.smart_rank,
    ranked.score,
    case when v_can_view_docks then ranked.dock_id else null end,
    case when v_can_view_docks then ranked.dock_name else null end,
    ranked.reason
  from ranked
  order by ranked.slot_start;
end;
$$;

revoke all on function public.list_smart_appointment_slots(
  uuid, date, text, text, integer, text, boolean, time, time
) from public, anon;
grant execute on function public.list_smart_appointment_slots(
  uuid, date, text, text, integer, text, boolean, time, time
) to authenticated;

create or replace function public.get_appointment_history(p_appointment_id uuid)
returns table (
  event_id bigint,
  action text,
  changed_at timestamptz,
  changed_by_name text,
  summary text,
  details jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_location_id uuid;
begin
  if auth.uid() is null then raise exception 'You must be signed in to view appointment history.'; end if;

  select a.location_id into v_location_id
  from public.appointments a
  where a.id = p_appointment_id;

  if v_location_id is null then
    select l.location_id into v_location_id
    from public.appointment_audit_log l
    where l.appointment_id = p_appointment_id
    order by l.changed_at desc limit 1;
  end if;

  if v_location_id is null then raise exception 'Appointment history was not found.'; end if;
  if not public.has_location_access(v_location_id) or not public.has_permission('audit.view') then
    raise exception 'You do not have permission to view this appointment history.';
  end if;

  return query
  select
    log.id,
    log.action,
    log.changed_at,
    coalesce(nullif(trim(profile.full_name), ''), profile.username, 'MaxDock system') as changed_by_name,
    case log.action
      when 'created' then 'Appointment created'
      when 'status_changed' then format(
        'Status changed from %s to %s',
        replace(initcap(coalesce(log.old_values->>'status', 'unknown')), '_', ' '),
        replace(initcap(coalesce(log.new_values->>'status', 'unknown')), '_', ' ')
      )
      when 'deleted' then 'Appointment deleted'
      else 'Appointment details updated'
    end as summary,
    jsonb_strip_nulls(jsonb_build_object(
      'from_status', log.old_values->>'status',
      'to_status', log.new_values->>'status',
      'from_start_at', log.old_values->>'start_at',
      'to_start_at', log.new_values->>'start_at',
      'from_dock_id', log.old_values->>'dock_id',
      'to_dock_id', log.new_values->>'dock_id',
      'changed_fields', case when log.action = 'updated' then to_jsonb(array_remove(array[
        case when log.old_values->>'start_at' is distinct from log.new_values->>'start_at'
               or log.old_values->>'end_at' is distinct from log.new_values->>'end_at' then 'Schedule' end,
        case when log.old_values->>'dock_id' is distinct from log.new_values->>'dock_id' then 'Dock' end,
        case when log.old_values->>'truck_type_code' is distinct from log.new_values->>'truck_type_code' then 'Vehicle' end,
        case when log.old_values->>'skid_count' is distinct from log.new_values->>'skid_count'
               or log.old_values->>'handling_type_code' is distinct from log.new_values->>'handling_type_code' then 'Load' end,
        case when log.old_values->>'company_name' is distinct from log.new_values->>'company_name'
               or log.old_values->>'carrier_name' is distinct from log.new_values->>'carrier_name'
               or log.old_values->>'external_reference' is distinct from log.new_values->>'external_reference' then 'Shipment details' end,
        case when log.old_values->>'requester_name' is distinct from log.new_values->>'requester_name'
               or log.old_values->>'requester_email' is distinct from log.new_values->>'requester_email' then 'Contact' end,
        case when log.old_values->>'is_priority' is distinct from log.new_values->>'is_priority' then 'Priority' end,
        case when log.old_values->>'notes' is distinct from log.new_values->>'notes' then 'Notes' end
      ]::text[], null)) else null end
    )) as details
  from public.appointment_audit_log log
  left join public.profiles profile on profile.id = log.changed_by
  where log.appointment_id = p_appointment_id
  order by log.changed_at desc, log.id desc;
end;
$$;

revoke all on function public.get_appointment_history(uuid) from public, anon;
grant execute on function public.get_appointment_history(uuid) to authenticated;

insert into public.role_permissions(role_code, permission_code)
values ('coordinator', 'audit.view')
on conflict do nothing;

create or replace function public.book_appointment(
  p_location_id uuid,
  p_date date,
  p_start_time time,
  p_direction text,
  p_requester_type text,
  p_appointment_type_code text,
  p_truck_type_code text,
  p_skid_count integer,
  p_handling_type_code text,
  p_is_priority boolean,
  p_requester_name text,
  p_requester_email text,
  p_external_reference text,
  p_company_name text default null,
  p_requester_location_id uuid default null,
  p_carrier_name text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_slot_interval integer;
  v_minimum_notice integer;
  v_maximum_advance integer;
  v_is_open boolean;
  v_open_time time;
  v_close_time time;
  v_open_at timestamptz;
  v_close_at timestamptz;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_duration integer;
  v_local_today date;
  v_dock_id uuid;
  v_dock_name text;
  v_appointment public.appointments%rowtype;
begin
  if auth.uid() is null then raise exception 'You must be signed in to book an appointment.'; end if;
  if not public.has_location_access(p_location_id)
     or not public.has_permission('appointment.create') then
    raise exception 'You do not have permission to create appointments for this location.';
  end if;
  if p_date is null or p_start_time is null then raise exception 'Appointment date and start time are required.'; end if;
  if lower(coalesce(p_direction, '')) not in ('inbound', 'outbound') then raise exception 'Direction must be inbound or outbound.'; end if;
  if p_skid_count is null or p_skid_count < 0 then raise exception 'Skid count cannot be negative.'; end if;
  if nullif(trim(coalesce(p_requester_type, '')), '') is null then raise exception 'Requester type is required.'; end if;
  if nullif(trim(coalesce(p_requester_name, '')), '') is null then raise exception 'Requester name is required.'; end if;
  if nullif(trim(coalesce(p_requester_email, '')), '') is null
     or position('@' in p_requester_email) <= 1 then raise exception 'A valid requester email is required.'; end if;
  if nullif(trim(coalesce(p_external_reference, '')), '') is null then raise exception 'PO / BOL / Job number is required.'; end if;

  select l.timezone, ls.slot_interval_minutes, ls.minimum_notice_minutes, ls.maximum_advance_days
  into v_timezone, v_slot_interval, v_minimum_notice, v_maximum_advance
  from public.locations l
  join public.location_settings ls on ls.location_id = l.id
  where l.id = p_location_id and l.is_active and ls.is_active;
  if not found then raise exception 'The selected location is inactive or not configured.'; end if;

  v_local_today := (now() at time zone v_timezone)::date;
  if p_date < v_local_today then raise exception 'Appointments cannot be created in the past.'; end if;
  if p_date > v_local_today + v_maximum_advance then raise exception 'The selected date is beyond this location''s booking window.'; end if;

  select oh.is_open, oh.open_time, oh.close_time
  into v_is_open, v_open_time, v_close_time
  from public.location_operating_hours oh
  where oh.location_id = p_location_id
    and oh.day_of_week = extract(dow from p_date)::smallint;
  if not found or not v_is_open then raise exception 'The selected location is closed on this date.'; end if;

  v_duration := public.calculate_appointment_duration(
    p_location_id, p_appointment_type_code, p_truck_type_code,
    p_skid_count, p_handling_type_code, p_is_priority
  );
  v_open_at := (p_date + v_open_time) at time zone v_timezone;
  v_close_at := (p_date + v_close_time) at time zone v_timezone;
  v_start_at := (p_date + p_start_time) at time zone v_timezone;
  v_end_at := v_start_at + make_interval(mins => v_duration);

  if v_start_at < now() + make_interval(mins => v_minimum_notice) then raise exception 'The selected time does not meet this location''s minimum notice.'; end if;
  if v_start_at < v_open_at or v_end_at > v_close_at then raise exception 'The appointment must fit within the location''s operating hours.'; end if;
  if mod((extract(epoch from (v_start_at - v_open_at)) / 60)::integer, v_slot_interval) <> 0 then
    raise exception 'The selected time is not aligned with the location''s slot interval.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_location_id::text || ':' || p_date::text, 0));

  select d.id, d.name
  into v_dock_id, v_dock_name
  from public.docks d
  join public.dock_truck_types dtt
    on dtt.dock_id = d.id
   and dtt.location_id = p_location_id
   and dtt.truck_type_code = p_truck_type_code
  where d.location_id = p_location_id
    and d.is_active
    and not exists (
      select 1 from public.appointments conflict
      where conflict.dock_id = d.id
        and conflict.status <> 'cancelled'
        and conflict.schedule_range && tstzrange(v_start_at, v_end_at, '[)')
    )
  order by
    coalesce((
      select sum(extract(epoch from (day_load.end_at - day_load.start_at)) / 60)
      from public.appointments day_load
      where day_load.dock_id = d.id
        and day_load.status <> 'cancelled'
        and (day_load.start_at at time zone v_timezone)::date = p_date
    ), 0),
    d.sort_order,
    d.name
  limit 1;

  if v_dock_id is null then raise exception 'No compatible dock is available at the selected time.'; end if;

  insert into public.appointments (
    booking_reference, entry_kind, source, location_id, dock_id, start_at, end_at,
    direction, requester_type, requester_location_id, company_name,
    appointment_type_code, truck_type_code, skid_count, handling_type_code,
    is_priority, requester_name, requester_email, carrier_name,
    external_reference, notes, status, created_by, updated_by
  ) values (
    null, 'appointment', 'internal', p_location_id, v_dock_id, v_start_at, v_end_at,
    lower(p_direction), trim(p_requester_type), p_requester_location_id,
    nullif(trim(coalesce(p_company_name, '')), ''), p_appointment_type_code,
    p_truck_type_code, p_skid_count, p_handling_type_code,
    coalesce(p_is_priority, false), trim(p_requester_name),
    lower(trim(p_requester_email)), nullif(trim(coalesce(p_carrier_name, '')), ''),
    trim(p_external_reference), nullif(trim(coalesce(p_notes, '')), ''),
    'scheduled', auth.uid(), auth.uid()
  ) returning * into v_appointment;

  return jsonb_build_object(
    'appointment_id', v_appointment.id,
    'booking_reference', v_appointment.booking_reference,
    'dock_id', v_dock_id,
    'dock_name', v_dock_name,
    'start_at', v_appointment.start_at,
    'end_at', v_appointment.end_at,
    'status', v_appointment.status
  );
end;
$$;

revoke all on function public.book_appointment(
  uuid, date, time, text, text, text, text, integer, text, boolean,
  text, text, text, text, uuid, text, text
) from public, anon;
grant execute on function public.book_appointment(
  uuid, date, time, text, text, text, text, integer, text, boolean,
  text, text, text, text, uuid, text, text
) to authenticated;

insert into public.maxdock_schema_versions(version, description)
values ('v11', 'Smart scheduling recommendations, personal booking templates, and appointment history UI support')
on conflict (version) do update
set description = excluded.description;

commit;
