-- MaxDock DB39: per-location dock assignment and site concurrency policy
-- Existing locations retain balanced dock assignment with no additional
-- site-wide concurrency limit until an administrator changes the setting.

begin;

alter table public.location_settings
  add column dock_assignment_strategy text not null default 'balanced',
  add column max_concurrent_appointments integer;

alter table public.location_settings
  add constraint location_settings_dock_assignment_strategy_check
    check (dock_assignment_strategy in ('balanced', 'fill_first')),
  add constraint location_settings_max_concurrent_appointments_check
    check (max_concurrent_appointments is null or max_concurrent_appointments >= 1);

comment on column public.location_settings.dock_assignment_strategy
is 'balanced spreads daily dock workload; fill_first uses compatible docks in configured sort order.';

comment on column public.location_settings.max_concurrent_appointments
is 'Optional site-wide limit for overlapping truck appointments. Null uses all compatible dock capacity.';

create or replace function public.select_policy_dock_internal(
  p_location_id uuid,
  p_truck_type_code text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_appointment_id uuid default null
)
returns table(dock_id uuid, dock_name text, available_docks integer)
language sql
stable
security definer
set search_path = ''
as $function$
  with policy as (
    select
      ls.dock_assignment_strategy,
      ls.max_concurrent_appointments,
      l.timezone
    from public.location_settings ls
    join public.locations l on l.id = ls.location_id
    where ls.location_id = p_location_id
      and ls.is_active
      and l.is_active
  ), concurrent_load as (
    select count(*)::integer as appointment_count
    from public.appointments appointment
    where appointment.id <> coalesce(p_exclude_appointment_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and appointment.entry_kind = 'appointment'
      and appointment.status <> 'cancelled'
      and appointment.schedule_range && tstzrange(p_start_at, p_end_at, '[)')
      and exists (
        select 1
        from public.docks location_dock
        where location_dock.location_id = p_location_id
          and location_dock.id in (appointment.dock_id, appointment.counterpart_dock_id)
      )
  ), eligible as (
    select
      dock.id,
      dock.name,
      dock.sort_order,
      policy.dock_assignment_strategy,
      coalesce((
        select sum(extract(epoch from (day_load.end_at - day_load.start_at)) / 60)
        from public.appointments day_load
        where day_load.id <> coalesce(p_exclude_appointment_id, '00000000-0000-0000-0000-000000000000'::uuid)
          and day_load.status <> 'cancelled'
          and dock.id in (day_load.dock_id, day_load.counterpart_dock_id)
          and (day_load.start_at at time zone policy.timezone)::date = (p_start_at at time zone policy.timezone)::date
      ), 0) as daily_minutes,
      count(*) over()::integer as available_count
    from public.docks dock
    join public.dock_truck_types compatibility
      on compatibility.dock_id = dock.id
     and compatibility.location_id = p_location_id
     and compatibility.truck_type_code = p_truck_type_code
    cross join policy
    cross join concurrent_load
    where dock.location_id = p_location_id
      and dock.is_active
      and (
        policy.max_concurrent_appointments is null
        or concurrent_load.appointment_count < policy.max_concurrent_appointments
      )
      and not exists (
        select 1
        from public.appointments conflict
        where conflict.id <> coalesce(p_exclude_appointment_id, '00000000-0000-0000-0000-000000000000'::uuid)
          and conflict.status <> 'cancelled'
          and conflict.schedule_range && tstzrange(p_start_at, p_end_at, '[)')
          and dock.id in (conflict.dock_id, conflict.counterpart_dock_id)
      )
  )
  select eligible.id, eligible.name, eligible.available_count
  from eligible
  order by
    case when eligible.dock_assignment_strategy = 'fill_first' then eligible.sort_order end,
    case when eligible.dock_assignment_strategy = 'balanced' then eligible.daily_minutes end,
    eligible.sort_order,
    eligible.name
  limit 1
$function$;

create or replace function public.inspect_routed_appointment_window_internal(
  p_location_id uuid,
  p_requester_location_id uuid,
  p_date date,
  p_start_time time,
  p_direction text,
  p_appointment_type_code text,
  p_truck_type_code text,
  p_skid_count integer,
  p_handling_type_code text,
  p_is_priority boolean default false,
  p_exclude_appointment_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_direction text := lower(trim(coalesce(p_direction, '')));
  v_internal boolean := p_requester_location_id is not null;
  v_receiving_location_id uuid;
  v_receiving_timezone text;
  v_receiving_interval integer;
  v_minimum_notice integer;
  v_maximum_advance integer;
  v_primary_timezone text;
  v_primary_interval integer;
  v_counterpart_timezone text;
  v_counterpart_interval integer;
  v_duration integer;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_primary_open boolean;
  v_primary_open_time time;
  v_primary_close_time time;
  v_counterpart_open boolean := true;
  v_counterpart_open_time time;
  v_counterpart_close_time time;
  v_primary_inside boolean;
  v_counterpart_inside boolean := true;
  v_after_hours boolean;
  v_primary_dock_id uuid;
  v_primary_dock_name text;
  v_primary_dock_count integer;
  v_counterpart_dock_id uuid;
  v_counterpart_dock_name text;
  v_counterpart_dock_count integer := 0;
  v_capacity jsonb;
begin
  if p_date is null or p_start_time is null then raise exception 'Appointment date and start time are required.'; end if;
  if v_direction not in ('inbound', 'outbound') then raise exception 'Direction must be inbound or outbound.'; end if;
  if coalesce(p_skid_count, -1) < 0 then raise exception 'Skid count cannot be negative.'; end if;
  if v_internal and p_requester_location_id = p_location_id then raise exception 'Origin and destination locations must be different.'; end if;

  select l.timezone, ls.slot_interval_minutes
  into v_primary_timezone, v_primary_interval
  from public.locations l join public.location_settings ls on ls.location_id = l.id
  where l.id = p_location_id and l.is_active and ls.is_active;
  if not found then raise exception 'The selected MaxDock location is inactive or not configured.'; end if;

  if v_internal then
    select l.timezone, ls.slot_interval_minutes
    into v_counterpart_timezone, v_counterpart_interval
    from public.locations l join public.location_settings ls on ls.location_id = l.id
    where l.id = p_requester_location_id and l.is_active and ls.is_active;
    if not found then raise exception 'The linked MaxDock location is inactive or not configured.'; end if;
  end if;

  v_receiving_location_id := case
    when v_internal and v_direction = 'outbound' then p_requester_location_id
    else p_location_id end;
  select l.timezone, ls.slot_interval_minutes, ls.minimum_notice_minutes, ls.maximum_advance_days
  into v_receiving_timezone, v_receiving_interval, v_minimum_notice, v_maximum_advance
  from public.locations l join public.location_settings ls on ls.location_id = l.id
  where l.id = v_receiving_location_id and l.is_active and ls.is_active;

  v_duration := public.calculate_appointment_duration_internal(
    p_location_id, p_appointment_type_code, p_truck_type_code,
    p_skid_count, p_handling_type_code, p_is_priority
  );
  if v_internal then
    v_duration := greatest(v_duration, public.calculate_appointment_duration_internal(
      p_requester_location_id, p_appointment_type_code, p_truck_type_code,
      p_skid_count, p_handling_type_code, p_is_priority
    ));
  end if;

  v_start_at := (p_date + p_start_time) at time zone v_receiving_timezone;
  v_end_at := v_start_at + make_interval(mins => v_duration);
  if p_date < (now() at time zone v_receiving_timezone)::date then raise exception 'Appointments cannot be created in the past.'; end if;
  if p_date > (now() at time zone v_receiving_timezone)::date + v_maximum_advance then raise exception 'The selected date is beyond the receiving location booking window.'; end if;
  if v_start_at < now() + make_interval(mins => v_minimum_notice) then raise exception 'The selected time does not meet the receiving location minimum notice.'; end if;

  select oh.is_open, oh.open_time, oh.close_time
  into v_primary_open, v_primary_open_time, v_primary_close_time
  from public.location_operating_hours oh
  where oh.location_id = p_location_id
    and oh.day_of_week = extract(dow from (v_start_at at time zone v_primary_timezone)::date)::smallint;
  v_primary_inside := coalesce(v_primary_open, false)
    and v_start_at >= (((v_start_at at time zone v_primary_timezone)::date + v_primary_open_time) at time zone v_primary_timezone)
    and v_end_at <= (((v_start_at at time zone v_primary_timezone)::date + v_primary_close_time) at time zone v_primary_timezone);

  if v_internal then
    select oh.is_open, oh.open_time, oh.close_time
    into v_counterpart_open, v_counterpart_open_time, v_counterpart_close_time
    from public.location_operating_hours oh
    where oh.location_id = p_requester_location_id
      and oh.day_of_week = extract(dow from (v_start_at at time zone v_counterpart_timezone)::date)::smallint;
    v_counterpart_inside := coalesce(v_counterpart_open, false)
      and v_start_at >= (((v_start_at at time zone v_counterpart_timezone)::date + v_counterpart_open_time) at time zone v_counterpart_timezone)
      and v_end_at <= (((v_start_at at time zone v_counterpart_timezone)::date + v_counterpart_close_time) at time zone v_counterpart_timezone);
  end if;
  v_after_hours := not v_primary_inside or (v_internal and not v_counterpart_inside);

  if not v_after_hours then
    if mod((extract(epoch from (v_start_at - ((((v_start_at at time zone v_primary_timezone)::date + v_primary_open_time) at time zone v_primary_timezone)))) / 60)::integer, greatest(v_primary_interval, 1)) <> 0 then
      raise exception 'The time is not aligned with the origin location slot interval.';
    end if;
    if v_internal and mod((extract(epoch from (v_start_at - ((((v_start_at at time zone v_counterpart_timezone)::date + v_counterpart_open_time) at time zone v_counterpart_timezone)))) / 60)::integer, greatest(v_counterpart_interval, 1)) <> 0 then
      raise exception 'The time is not aligned with the destination location slot interval.';
    end if;
  elsif mod((extract(epoch from p_start_time) / 60)::integer, greatest(v_receiving_interval, 1)) <> 0 then
    raise exception 'The custom time must align with the receiving location slot interval.';
  end if;

  select chosen.dock_id, chosen.dock_name, chosen.available_docks
  into v_primary_dock_id, v_primary_dock_name, v_primary_dock_count
  from public.select_policy_dock_internal(
    p_location_id, p_truck_type_code, v_start_at, v_end_at, p_exclude_appointment_id
  ) chosen;

  if v_internal then
    select chosen.dock_id, chosen.dock_name, chosen.available_docks
    into v_counterpart_dock_id, v_counterpart_dock_name, v_counterpart_dock_count
    from public.select_policy_dock_internal(
      p_requester_location_id, p_truck_type_code, v_start_at, v_end_at, p_exclude_appointment_id
    ) chosen;
  end if;

  v_capacity := public.location_capacity_projection_internal(
    v_receiving_location_id, v_start_at,
    case when v_internal then 'inbound' else v_direction end,
    p_skid_count, p_exclude_appointment_id
  );

  return jsonb_build_object(
    'date', p_date, 'start_at', v_start_at, 'end_at', v_end_at,
    'duration_minutes', v_duration, 'is_after_hours', v_after_hours,
    'primary_inside_hours', v_primary_inside, 'counterpart_inside_hours', v_counterpart_inside,
    'primary_open_time', v_primary_open_time, 'primary_close_time', v_primary_close_time,
    'counterpart_open_time', v_counterpart_open_time, 'counterpart_close_time', v_counterpart_close_time,
    'primary_dock_id', v_primary_dock_id, 'primary_dock_name', v_primary_dock_name,
    'primary_available_docks', coalesce(v_primary_dock_count, 0),
    'counterpart_dock_id', v_counterpart_dock_id, 'counterpart_dock_name', v_counterpart_dock_name,
    'counterpart_available_docks', coalesce(v_counterpart_dock_count, 0),
    'receiving_location_id', v_receiving_location_id,
    'capacity_enabled', (v_capacity->>'capacity_enabled')::boolean,
    'capacity_mode', v_capacity->>'enforcement_mode',
    'capacity_allowed', (v_capacity->>'can_accept')::boolean,
    'projected_occupied_skids', (v_capacity->>'projected_after')::integer,
    'available_skid_capacity', (v_capacity->>'available_after')::integer,
    'capacity_message', v_capacity->>'capacity_message'
  );
end;
$function$;

revoke all on function public.select_policy_dock_internal(uuid, text, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.inspect_routed_appointment_window_internal(uuid, uuid, date, time, text, text, text, integer, text, boolean, uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
