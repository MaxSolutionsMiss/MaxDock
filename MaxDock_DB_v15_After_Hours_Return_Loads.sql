-- MaxDock DB23: staff after-hours booking overrides and intersite return-load intelligence

alter table public.appointments
  add column if not exists is_after_hours_override boolean not null default false,
  add column if not exists after_hours_confirmed_by uuid references auth.users(id) on delete set null,
  add column if not exists after_hours_confirmed_at timestamptz;

create index if not exists appointments_requester_location_start_idx
  on public.appointments(requester_location_id, start_at)
  where entry_kind = 'appointment' and requester_location_id is not null;

create index if not exists appointments_after_hours_confirmed_by_idx
  on public.appointments(after_hours_confirmed_by)
  where after_hours_confirmed_by is not null;

create or replace function public.preview_staff_appointment_time(
  p_location_id uuid,
  p_date date,
  p_start_time time,
  p_direction text,
  p_appointment_type_code text,
  p_truck_type_code text,
  p_skid_count integer,
  p_handling_type_code text,
  p_is_priority boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_timezone text;
  v_slot_interval integer;
  v_minimum_notice integer;
  v_maximum_advance integer;
  v_is_open boolean := false;
  v_open_time time;
  v_close_time time;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_open_at timestamptz;
  v_close_at timestamptz;
  v_duration integer;
  v_local_today date;
  v_after_hours boolean;
  v_dock_id uuid;
  v_dock_name text;
  v_capacity_enabled boolean;
  v_capacity_mode text;
  v_projected_after integer;
  v_available_after integer;
  v_capacity_allowed boolean;
  v_capacity_message text;
begin
  if auth.uid() is null then raise exception 'You must be signed in to preview a staff appointment time.'; end if;
  select p.role_code into v_role from public.profiles p where p.id = auth.uid() and p.is_active;
  if coalesce(v_role, 'customer') = 'customer' then raise exception 'Customer accounts cannot use staff scheduling overrides.'; end if;
  if not public.has_location_access(p_location_id)
     or not public.has_permission('appointment.create') then
    raise exception 'You do not have permission to create appointments for this location.';
  end if;
  if p_date is null or p_start_time is null then raise exception 'Appointment date and start time are required.'; end if;
  if lower(trim(coalesce(p_direction, ''))) not in ('inbound', 'outbound') then raise exception 'Direction must be inbound or outbound.'; end if;
  if coalesce(p_skid_count, -1) < 0 then raise exception 'Skid count cannot be negative.'; end if;

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
  if not found then v_is_open := false; end if;

  v_duration := public.calculate_appointment_duration(
    p_location_id, p_appointment_type_code, p_truck_type_code,
    p_skid_count, p_handling_type_code, p_is_priority
  );
  v_start_at := (p_date + p_start_time) at time zone v_timezone;
  v_end_at := v_start_at + make_interval(mins => v_duration);
  if v_is_open then
    v_open_at := (p_date + v_open_time) at time zone v_timezone;
    v_close_at := (p_date + v_close_time) at time zone v_timezone;
  end if;
  v_after_hours := not coalesce(v_is_open, false)
    or v_open_time is null
    or v_close_time is null
    or v_start_at < v_open_at
    or v_end_at > v_close_at;

  if v_start_at < now() + make_interval(mins => v_minimum_notice) then
    raise exception 'The selected time does not meet this location''s minimum notice.';
  end if;
  if not v_after_hours and mod((extract(epoch from (v_start_at - v_open_at)) / 60)::integer, greatest(v_slot_interval, 1)) <> 0 then
    raise exception 'The selected time is not aligned with the location''s slot interval.';
  end if;
  if v_after_hours and mod((extract(epoch from p_start_time) / 60)::integer, greatest(v_slot_interval, 1)) <> 0 then
    raise exception 'The custom time must align with the location''s slot interval.';
  end if;

  select
    capacity.capacity_enabled,
    capacity.enforcement_mode,
    capacity.projected_after,
    capacity.available_after,
    capacity.can_accept,
    capacity.capacity_message
  into
    v_capacity_enabled,
    v_capacity_mode,
    v_projected_after,
    v_available_after,
    v_capacity_allowed,
    v_capacity_message
  from public.get_location_capacity_projection(
    p_location_id, v_start_at, lower(trim(p_direction)), p_skid_count, null
  ) capacity;

  if v_capacity_enabled and v_capacity_mode = 'enforce' and not v_capacity_allowed then
    raise exception 'This inbound load exceeds the location''s working skid capacity.';
  end if;

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
  order by d.sort_order, d.name
  limit 1;
  if v_dock_id is null then raise exception 'No compatible dock is available at the custom time.'; end if;

  return jsonb_build_object(
    'date', p_date,
    'start_at', v_start_at,
    'end_at', v_end_at,
    'duration_minutes', v_duration,
    'is_after_hours', v_after_hours,
    'is_open_day', coalesce(v_is_open, false),
    'operating_open_time', v_open_time,
    'operating_close_time', v_close_time,
    'recommended_dock_id', v_dock_id,
    'recommended_dock_name', v_dock_name,
    'capacity_enabled', v_capacity_enabled,
    'projected_occupied_skids', v_projected_after,
    'available_skid_capacity', v_available_after,
    'capacity_message', v_capacity_message
  );
end;
$$;

drop function if exists public.book_appointment(
  uuid, date, time, text, text, text, text, integer, text, boolean,
  text, text, text, text, uuid, text, text
);

create function public.book_appointment(
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
  p_notes text default null,
  p_after_hours_confirmed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_timezone text;
  v_slot_interval integer;
  v_minimum_notice integer;
  v_maximum_advance integer;
  v_is_open boolean := false;
  v_open_time time;
  v_close_time time;
  v_open_at timestamptz;
  v_close_at timestamptz;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_duration integer;
  v_local_today date;
  v_after_hours boolean;
  v_dock_id uuid;
  v_dock_name text;
  v_appointment public.appointments%rowtype;
  v_capacity_enabled boolean;
  v_capacity_mode text;
  v_projected_after integer;
  v_available_after integer;
  v_capacity_allowed boolean;
  v_capacity_message text;
begin
  if auth.uid() is null then raise exception 'You must be signed in to book an appointment.'; end if;
  select p.role_code into v_role from public.profiles p where p.id = auth.uid() and p.is_active;
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
  if not found then v_is_open := false; end if;

  v_duration := public.calculate_appointment_duration(
    p_location_id, p_appointment_type_code, p_truck_type_code,
    p_skid_count, p_handling_type_code, p_is_priority
  );
  v_start_at := (p_date + p_start_time) at time zone v_timezone;
  v_end_at := v_start_at + make_interval(mins => v_duration);
  if v_is_open then
    v_open_at := (p_date + v_open_time) at time zone v_timezone;
    v_close_at := (p_date + v_close_time) at time zone v_timezone;
  end if;
  v_after_hours := not coalesce(v_is_open, false)
    or v_open_time is null
    or v_close_time is null
    or v_start_at < v_open_at
    or v_end_at > v_close_at;

  if v_after_hours then
    if coalesce(v_role, '') = 'customer' then
      raise exception 'Customer appointments must remain within the location''s operating hours.';
    end if;
    if not coalesce(p_after_hours_confirmed, false) then
      raise exception 'This appointment is outside operating hours. Staff confirmation is required.';
    end if;
  end if;

  if v_start_at < now() + make_interval(mins => v_minimum_notice) then raise exception 'The selected time does not meet this location''s minimum notice.'; end if;
  if not v_after_hours and mod((extract(epoch from (v_start_at - v_open_at)) / 60)::integer, v_slot_interval) <> 0 then
    raise exception 'The selected time is not aligned with the location''s slot interval.';
  end if;
  if v_after_hours and mod((extract(epoch from p_start_time) / 60)::integer, greatest(v_slot_interval, 1)) <> 0 then
    raise exception 'The custom time must align with the location''s slot interval.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_location_id::text || ':' || p_date::text, 0));

  select
    capacity.capacity_enabled,
    capacity.enforcement_mode,
    capacity.projected_after,
    capacity.available_after,
    capacity.can_accept,
    capacity.capacity_message
  into
    v_capacity_enabled,
    v_capacity_mode,
    v_projected_after,
    v_available_after,
    v_capacity_allowed,
    v_capacity_message
  from public.get_location_capacity_projection(
    p_location_id, v_start_at, lower(p_direction), p_skid_count, null
  ) capacity;

  if v_capacity_enabled and v_capacity_mode = 'enforce' and not v_capacity_allowed then
    raise exception 'This inbound load exceeds the location''s working skid capacity. Choose one of the later suggested times.';
  end if;

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
    external_reference, notes, status, created_by, updated_by,
    is_after_hours_override, after_hours_confirmed_by, after_hours_confirmed_at
  ) values (
    null, 'appointment', 'internal', p_location_id, v_dock_id, v_start_at, v_end_at,
    lower(p_direction), trim(p_requester_type), p_requester_location_id,
    nullif(trim(coalesce(p_company_name, '')), ''), p_appointment_type_code,
    p_truck_type_code, p_skid_count, p_handling_type_code,
    coalesce(p_is_priority, false), trim(p_requester_name),
    lower(trim(p_requester_email)), nullif(trim(coalesce(p_carrier_name, '')), ''),
    trim(p_external_reference), nullif(trim(coalesce(p_notes, '')), ''),
    'scheduled', auth.uid(), auth.uid(),
    v_after_hours, case when v_after_hours then auth.uid() end,
    case when v_after_hours then now() end
  ) returning * into v_appointment;

  return jsonb_build_object(
    'appointment_id', v_appointment.id,
    'booking_reference', v_appointment.booking_reference,
    'dock_id', v_dock_id,
    'dock_name', v_dock_name,
    'start_at', v_appointment.start_at,
    'end_at', v_appointment.end_at,
    'status', v_appointment.status,
    'is_after_hours', v_after_hours,
    'capacity_enabled', v_capacity_enabled,
    'projected_occupied_skids', v_projected_after,
    'available_skid_capacity', v_available_after,
    'capacity_message', v_capacity_message
  );
end;
$$;

create or replace function public.find_return_load_matches(
  p_location_id uuid,
  p_direction text,
  p_requester_location_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_window_hours integer default 18
)
returns table (
  appointment_id uuid,
  booking_reference text,
  origin_location_name text,
  destination_location_name text,
  start_at timestamptz,
  end_at timestamptz,
  skid_count integer,
  carrier_name text,
  time_gap_minutes integer,
  sequence_text text,
  recommendation text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_origin_id uuid;
  v_destination_id uuid;
begin
  if auth.uid() is null then raise exception 'You must be signed in to view return-load opportunities.'; end if;
  select p.role_code into v_role from public.profiles p where p.id = auth.uid() and p.is_active;
  if coalesce(v_role, 'customer') = 'customer' then raise exception 'Customer accounts cannot view internal return-load opportunities.'; end if;
  if not public.has_location_access(p_location_id) or not public.has_permission('appointment.view') then
    raise exception 'You do not have access to this MaxDock location.';
  end if;
  if p_requester_location_id is null or p_requester_location_id = p_location_id then return; end if;
  if lower(trim(coalesce(p_direction, ''))) not in ('inbound', 'outbound') then raise exception 'Direction must be inbound or outbound.'; end if;
  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then raise exception 'A valid proposed appointment window is required.'; end if;
  if coalesce(p_window_hours, 0) not between 1 and 48 then raise exception 'The return-load window must be between 1 and 48 hours.'; end if;

  if lower(trim(p_direction)) = 'inbound' then
    v_origin_id := p_requester_location_id;
    v_destination_id := p_location_id;
  else
    v_origin_id := p_location_id;
    v_destination_id := p_requester_location_id;
  end if;

  return query
  with routes as (
    select
      a.id,
      a.booking_reference,
      case when a.direction = 'inbound' then a.requester_location_id else a.location_id end as origin_id,
      case when a.direction = 'inbound' then a.location_id else a.requester_location_id end as destination_id,
      a.start_at,
      a.end_at,
      a.skid_count,
      a.carrier_name
    from public.appointments a
    where a.entry_kind = 'appointment'
      and a.requester_location_id is not null
      and a.requester_location_id <> a.location_id
      and a.status not in ('cancelled', 'no_show')
  )
  select
    route.id,
    route.booking_reference,
    origin.name,
    destination.name,
    route.start_at,
    route.end_at,
    route.skid_count,
    route.carrier_name,
    case
      when route.end_at <= p_start_at then (extract(epoch from (p_start_at - route.end_at)) / 60)::integer
      else (extract(epoch from (route.start_at - p_end_at)) / 60)::integer
    end,
    case when route.end_at <= p_start_at then 'Existing trip can arrive before this load' else 'This load can feed the existing return trip' end,
    format('Consider one truck for the %s to %s movement and the return load.', origin.name, destination.name)
  from routes route
  join public.locations origin on origin.id = route.origin_id
  join public.locations destination on destination.id = route.destination_id
  where route.origin_id = v_destination_id
    and route.destination_id = v_origin_id
    and (
      (route.end_at <= p_start_at and p_start_at - route.end_at <= make_interval(hours => p_window_hours))
      or
      (p_end_at <= route.start_at and route.start_at - p_end_at <= make_interval(hours => p_window_hours))
    )
  order by 9, route.start_at
  limit 5;
end;
$$;

create or replace function public.list_return_load_opportunities(
  p_location_id uuid,
  p_date_from date,
  p_date_to date
)
returns table (
  first_appointment_id uuid,
  first_booking_reference text,
  first_origin_name text,
  first_destination_name text,
  first_start_at timestamptz,
  first_end_at timestamptz,
  second_appointment_id uuid,
  second_booking_reference text,
  second_origin_name text,
  second_destination_name text,
  second_start_at timestamptz,
  second_end_at timestamptz,
  turnaround_minutes integer,
  combined_skids integer,
  recommendation text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_timezone text;
begin
  if auth.uid() is null then raise exception 'You must be signed in to view return-load opportunities.'; end if;
  select p.role_code into v_role from public.profiles p where p.id = auth.uid() and p.is_active;
  if coalesce(v_role, 'customer') = 'customer' then raise exception 'Customer accounts cannot view internal return-load opportunities.'; end if;
  if not public.has_location_access(p_location_id) or not public.has_permission('appointment.view') then
    raise exception 'You do not have access to this MaxDock location.';
  end if;
  if p_date_from is null or p_date_to is null or p_date_to < p_date_from then raise exception 'A valid opportunity date range is required.'; end if;
  if p_date_to - p_date_from > 31 then raise exception 'Return-load opportunities can be searched for a maximum of 31 days.'; end if;
  select l.timezone into v_timezone from public.locations l where l.id = p_location_id and l.is_active;
  if not found then raise exception 'The selected MaxDock location is inactive.'; end if;

  return query
  with routes as (
    select
      a.id,
      a.booking_reference,
      case when a.direction = 'inbound' then a.requester_location_id else a.location_id end as origin_id,
      case when a.direction = 'inbound' then a.location_id else a.requester_location_id end as destination_id,
      a.start_at,
      a.end_at,
      a.skid_count,
      a.status
    from public.appointments a
    where a.entry_kind = 'appointment'
      and a.requester_location_id is not null
      and a.requester_location_id <> a.location_id
      and a.status not in ('cancelled', 'no_show')
  )
  select
    first_route.id,
    first_route.booking_reference,
    first_origin.name,
    first_destination.name,
    first_route.start_at,
    first_route.end_at,
    second_route.id,
    second_route.booking_reference,
    second_origin.name,
    second_destination.name,
    second_route.start_at,
    second_route.end_at,
    (extract(epoch from (second_route.start_at - first_route.end_at)) / 60)::integer,
    coalesce(first_route.skid_count, 0) + coalesce(second_route.skid_count, 0),
    format(
      'Potential return load: use one truck for %s to %s, then %s back to %s.',
      first_origin.name, first_destination.name, second_origin.name, second_destination.name
    )
  from routes first_route
  join routes second_route
    on second_route.origin_id = first_route.destination_id
   and second_route.destination_id = first_route.origin_id
   and first_route.end_at <= second_route.start_at
   and second_route.start_at - first_route.end_at <= interval '18 hours'
  join public.locations first_origin on first_origin.id = first_route.origin_id
  join public.locations first_destination on first_destination.id = first_route.destination_id
  join public.locations second_origin on second_origin.id = second_route.origin_id
  join public.locations second_destination on second_destination.id = second_route.destination_id
  where (
      first_route.origin_id = p_location_id or first_route.destination_id = p_location_id
      or second_route.origin_id = p_location_id or second_route.destination_id = p_location_id
    )
    and second_route.status not in ('completed', 'cancelled', 'no_show')
    and (
      (first_route.start_at at time zone v_timezone)::date between p_date_from and p_date_to
      or (second_route.start_at at time zone v_timezone)::date between p_date_from and p_date_to
    )
  order by first_route.start_at
  limit 20;
end;
$$;

revoke all on function public.preview_staff_appointment_time(uuid, date, time, text, text, text, integer, text, boolean) from public, anon;
revoke all on function public.book_appointment(uuid, date, time, text, text, text, text, integer, text, boolean, text, text, text, text, uuid, text, text, boolean) from public, anon;
revoke all on function public.find_return_load_matches(uuid, text, uuid, timestamptz, timestamptz, integer) from public, anon;
revoke all on function public.list_return_load_opportunities(uuid, date, date) from public, anon;

grant execute on function public.preview_staff_appointment_time(uuid, date, time, text, text, text, integer, text, boolean) to authenticated;
grant execute on function public.book_appointment(uuid, date, time, text, text, text, text, integer, text, boolean, text, text, text, text, uuid, text, text, boolean) to authenticated;
grant execute on function public.find_return_load_matches(uuid, text, uuid, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.list_return_load_opportunities(uuid, date, date) to authenticated;

insert into public.maxdock_schema_versions(version, description)
values ('DB-v15', 'Staff after-hours booking confirmation and intersite return-load intelligence')
on conflict (version) do update
set description = excluded.description,
    applied_at = now();
