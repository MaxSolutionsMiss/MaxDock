-- MaxDock DB26: dual-site dock routing for internal transfers.

alter table public.appointments
  add column if not exists counterpart_dock_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_counterpart_dock_location_fk'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_counterpart_dock_location_fk
      foreign key (requester_location_id, counterpart_dock_id)
      references public.docks(location_id, id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_counterpart_dock_requires_location'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_counterpart_dock_requires_location
      check (counterpart_dock_id is null or requester_location_id is not null);
  end if;
end;
$$;

create index if not exists appointments_counterpart_dock_start_idx
  on public.appointments(counterpart_dock_id, start_at)
  where counterpart_dock_id is not null and status <> 'cancelled';

comment on column public.appointments.counterpart_dock_id is
  'Real dock reserved at requester_location_id for a linked Max Solutions transfer.';

create or replace function public.calculate_appointment_duration_internal(
  p_location_id uuid,
  p_appointment_type_code text,
  p_truck_type_code text,
  p_skid_count integer,
  p_handling_type_code text,
  p_is_priority boolean default false
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_slot_interval integer;
  v_base_minutes integer;
  v_minutes_per_skid numeric(6,2);
  v_buffer_minutes integer;
  v_full_truck_minimum integer;
  v_full_truck_threshold integer;
  v_priority_minimum integer;
  v_type_adjustment integer;
  v_truck_setup integer;
  v_handling_adjustment integer;
  v_is_full_truck boolean;
  v_raw_duration numeric;
begin
  if coalesce(p_skid_count, -1) < 0 then raise exception 'Skid count cannot be negative.'; end if;

  select
    ls.slot_interval_minutes, ls.base_minutes, ls.minutes_per_skid,
    ls.buffer_minutes, ls.full_truck_minimum_minutes,
    ls.full_truck_skid_threshold, ls.priority_minimum_minutes,
    lat.adjustment_minutes, ltt.setup_minutes, lht.adjustment_minutes,
    tt.qualifies_as_full_truck
  into
    v_slot_interval, v_base_minutes, v_minutes_per_skid,
    v_buffer_minutes, v_full_truck_minimum, v_full_truck_threshold,
    v_priority_minimum, v_type_adjustment, v_truck_setup,
    v_handling_adjustment, v_is_full_truck
  from public.location_settings ls
  join public.location_appointment_types lat
    on lat.location_id = ls.location_id
   and lat.appointment_type_code = p_appointment_type_code
   and lat.is_active
  join public.appointment_types atype
    on atype.code = lat.appointment_type_code and atype.is_active
  join public.location_truck_types ltt
    on ltt.location_id = ls.location_id
   and ltt.truck_type_code = p_truck_type_code
   and ltt.is_active
  join public.truck_types tt
    on tt.code = ltt.truck_type_code and tt.is_active
  join public.location_handling_types lht
    on lht.location_id = ls.location_id
   and lht.handling_type_code = p_handling_type_code
   and lht.is_active
  join public.handling_types ht
    on ht.code = lht.handling_type_code and ht.is_active
  where ls.location_id = p_location_id and ls.is_active;

  if not found then
    raise exception 'A selected location does not support this appointment, truck, or handling type.';
  end if;

  v_raw_duration := v_base_minutes
    + p_skid_count * v_minutes_per_skid
    + v_truck_setup + v_type_adjustment + v_handling_adjustment + v_buffer_minutes;
  if v_is_full_truck or p_skid_count >= v_full_truck_threshold then
    v_raw_duration := greatest(v_raw_duration, v_full_truck_minimum);
  end if;
  if coalesce(p_is_priority, false) then
    v_raw_duration := greatest(v_raw_duration, v_priority_minimum);
  end if;
  return greatest(v_slot_interval, ceil(v_raw_duration / v_slot_interval)::integer * v_slot_interval);
end;
$$;

create or replace function public.location_capacity_projection_internal(
  p_location_id uuid,
  p_at timestamptz,
  p_direction text default 'inbound',
  p_skid_count integer default 0,
  p_exclude_appointment_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_mode text;
  v_total integer;
  v_reserve integer;
  v_baseline integer;
  v_as_of timestamptz;
  v_delta integer;
  v_before integer;
  v_after integer;
  v_limit integer;
  v_direction text := lower(trim(coalesce(p_direction, '')));
begin
  if p_at is null then raise exception 'A capacity projection time is required.'; end if;
  if v_direction not in ('inbound', 'outbound') then raise exception 'Direction must be inbound or outbound.'; end if;
  if coalesce(p_skid_count, -1) < 0 then raise exception 'Skid count cannot be negative.'; end if;

  select capacity_enabled, capacity_enforcement_mode, skid_capacity,
         capacity_reserve_skids, current_occupied_skids, inventory_as_of
  into v_enabled, v_mode, v_total, v_reserve, v_baseline, v_as_of
  from public.location_settings
  where location_id = p_location_id and is_active;
  if not found then raise exception 'The selected location is not configured.'; end if;

  v_enabled := coalesce(v_enabled, false) and v_total is not null;
  v_mode := coalesce(v_mode, 'warn');
  v_reserve := greatest(coalesce(v_reserve, 0), 0);
  v_baseline := greatest(coalesce(v_baseline, 0), 0);
  v_as_of := coalesce(v_as_of, now());

  select coalesce(sum(case movement_direction
    when 'inbound' then skid_count
    when 'outbound' then -skid_count
    else 0 end), 0)::integer
  into v_delta
  from (
    select lower(coalesce(a.direction, '')) as movement_direction,
           greatest(coalesce(a.skid_count, 0), 0) as skid_count
    from public.appointments a
    where a.location_id = p_location_id
      and a.entry_kind = 'appointment'
      and a.status not in ('cancelled', 'no_show')
      and a.start_at >= v_as_of and a.start_at <= p_at
      and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id)
    union all
    select case lower(coalesce(a.direction, ''))
             when 'inbound' then 'outbound' when 'outbound' then 'inbound' else '' end,
           greatest(coalesce(a.skid_count, 0), 0)
    from public.appointments a
    where a.requester_location_id = p_location_id
      and a.location_id <> p_location_id
      and a.entry_kind = 'appointment'
      and a.status not in ('cancelled', 'no_show')
      and a.start_at >= v_as_of and a.start_at <= p_at
      and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id)
  ) movements;

  v_before := greatest(v_baseline + coalesce(v_delta, 0), 0);
  v_after := greatest(v_before + case when v_direction = 'inbound'
    then coalesce(p_skid_count, 0) else -coalesce(p_skid_count, 0) end, 0);
  v_limit := greatest(coalesce(v_total, 0) - v_reserve, 0);

  return jsonb_build_object(
    'capacity_enabled', v_enabled,
    'enforcement_mode', v_mode,
    'total_capacity', v_total,
    'reserve_skids', v_reserve,
    'baseline_occupied', v_baseline,
    'projected_before', v_before,
    'projected_after', v_after,
    'available_after', greatest(v_limit - v_after, 0),
    'can_accept', not v_enabled or v_direction = 'outbound' or v_after <= v_limit,
    'capacity_message', case
      when not v_enabled then 'Warehouse skid-capacity control is not enabled.'
      when v_direction = 'outbound' or v_after <= v_limit then format('%s skid spaces remain after this appointment.', greatest(v_limit - v_after, 0))
      else format('Projected occupancy is %s skids; the working limit is %s.', v_after, v_limit)
    end
  );
end;
$$;

create or replace function public.get_location_capacity_projection(
  p_location_id uuid,
  p_at timestamptz,
  p_direction text default 'inbound',
  p_skid_count integer default 0,
  p_exclude_appointment_id uuid default null
)
returns table (
  capacity_enabled boolean,
  enforcement_mode text,
  total_capacity integer,
  reserve_skids integer,
  baseline_occupied integer,
  projected_before integer,
  projected_after integer,
  available_after integer,
  can_accept boolean,
  capacity_message text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'You must be signed in to view warehouse capacity.'; end if;
  if not public.has_location_access(p_location_id) then raise exception 'You do not have access to this MaxDock location.'; end if;
  v_result := public.location_capacity_projection_internal(
    p_location_id, p_at, p_direction, p_skid_count, p_exclude_appointment_id
  );
  return query select
    (v_result->>'capacity_enabled')::boolean,
    v_result->>'enforcement_mode',
    (v_result->>'total_capacity')::integer,
    (v_result->>'reserve_skids')::integer,
    (v_result->>'baseline_occupied')::integer,
    (v_result->>'projected_before')::integer,
    (v_result->>'projected_after')::integer,
    (v_result->>'available_after')::integer,
    (v_result->>'can_accept')::boolean,
    v_result->>'capacity_message';
end;
$$;

create or replace function public.enforce_dual_dock_reservation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' then return new; end if;
  if new.counterpart_dock_id is not null and new.requester_location_id is null then
    raise exception 'A counterpart dock requires a linked Max Solutions location.';
  end if;
  if new.counterpart_dock_id is not null and new.counterpart_dock_id = new.dock_id then
    raise exception 'The origin and destination dock assignments must be different docks.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.dock_id::text, 918));
  if new.counterpart_dock_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(new.counterpart_dock_id::text, 918));
  end if;

  if exists (
    select 1 from public.appointments a
    where a.id <> new.id
      and a.status <> 'cancelled'
      and a.schedule_range && tstzrange(new.start_at, new.end_at, '[)')
      and (
        a.dock_id in (new.dock_id, new.counterpart_dock_id)
        or a.counterpart_dock_id in (new.dock_id, new.counterpart_dock_id)
      )
  ) then
    raise exception 'A selected origin or destination dock is no longer available at this time.';
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_enforce_dual_docks on public.appointments;
create trigger appointments_enforce_dual_docks
before insert or update of dock_id, counterpart_dock_id, start_at, end_at, status
on public.appointments
for each row execute function public.enforce_dual_dock_reservation();

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
as $$
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

  select count(*)::integer,
         (array_agg(d.id order by d.sort_order, d.name))[1],
         (array_agg(d.name order by d.sort_order, d.name))[1]
  into v_primary_dock_count, v_primary_dock_id, v_primary_dock_name
  from public.docks d
  join public.dock_truck_types dtt
    on dtt.dock_id = d.id and dtt.location_id = p_location_id
   and dtt.truck_type_code = p_truck_type_code
  where d.location_id = p_location_id and d.is_active
    and not exists (
      select 1 from public.appointments conflict
      where conflict.id <> coalesce(p_exclude_appointment_id, '00000000-0000-0000-0000-000000000000'::uuid)
        and conflict.status <> 'cancelled'
        and conflict.schedule_range && tstzrange(v_start_at, v_end_at, '[)')
        and d.id in (conflict.dock_id, conflict.counterpart_dock_id)
    );

  if v_internal then
    select count(*)::integer,
           (array_agg(d.id order by d.sort_order, d.name))[1],
           (array_agg(d.name order by d.sort_order, d.name))[1]
    into v_counterpart_dock_count, v_counterpart_dock_id, v_counterpart_dock_name
    from public.docks d
    join public.dock_truck_types dtt
      on dtt.dock_id = d.id and dtt.location_id = p_requester_location_id
     and dtt.truck_type_code = p_truck_type_code
    where d.location_id = p_requester_location_id and d.is_active
      and not exists (
        select 1 from public.appointments conflict
        where conflict.id <> coalesce(p_exclude_appointment_id, '00000000-0000-0000-0000-000000000000'::uuid)
          and conflict.status <> 'cancelled'
          and conflict.schedule_range && tstzrange(v_start_at, v_end_at, '[)')
          and d.id in (conflict.dock_id, conflict.counterpart_dock_id)
      );
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
$$;

create or replace function public.list_routed_appointment_slots(
  p_location_id uuid,
  p_requester_location_id uuid,
  p_date date,
  p_direction text,
  p_appointment_type_code text,
  p_truck_type_code text,
  p_skid_count integer,
  p_handling_type_code text,
  p_is_priority boolean default false,
  p_preferred_start_time time default null,
  p_preferred_end_time time default null,
  p_search_days integer default 7
)
returns table (
  slot_start timestamptz,
  slot_end timestamptz,
  available_docks integer,
  recommendation_rank integer,
  recommendation_score integer,
  recommended_dock_id uuid,
  recommended_dock_name text,
  counterpart_dock_id uuid,
  counterpart_dock_name text,
  recommendation_reason text,
  capacity_enabled boolean,
  capacity_warning boolean,
  projected_occupied_skids integer,
  available_skid_capacity integer,
  capacity_message text,
  alternative_date boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_direction text := lower(trim(coalesce(p_direction, '')));
  v_receiving_id uuid;
  v_timezone text;
  v_interval integer;
  v_duration integer;
  v_open time;
  v_close time;
  v_is_open boolean;
  v_candidate_date date;
  v_candidate timestamptz;
  v_info jsonb;
  v_rank integer;
  v_found integer;
begin
  if auth.uid() is null then raise exception 'You must be signed in to view appointment times.'; end if;
  select role_code into v_role from public.profiles where id = auth.uid() and is_active;
  if not found then raise exception 'This MaxDock account is inactive.'; end if;
  if not public.has_location_access(p_location_id) or not public.has_permission('appointment.create') then
    raise exception 'You do not have permission to create appointments for this location.';
  end if;
  if v_role = 'customer' and (v_direction <> 'inbound' or p_requester_location_id is not null) then
    raise exception 'Customer bookings must be inbound from an external origin.';
  end if;
  if v_direction not in ('inbound', 'outbound') then raise exception 'Direction must be inbound or outbound.'; end if;
  if p_date is null then raise exception 'An appointment date is required.'; end if;
  if coalesce(p_search_days, -1) not between 0 and 30 then raise exception 'Search days must be between 0 and 30.'; end if;

  v_receiving_id := case when p_requester_location_id is not null and v_direction = 'outbound'
    then p_requester_location_id else p_location_id end;
  select l.timezone, ls.slot_interval_minutes
  into v_timezone, v_interval
  from public.locations l join public.location_settings ls on ls.location_id = l.id
  where l.id = v_receiving_id and l.is_active and ls.is_active;
  if not found then raise exception 'The receiving location is inactive or not configured.'; end if;

  v_duration := public.calculate_appointment_duration_internal(
    p_location_id, p_appointment_type_code, p_truck_type_code,
    p_skid_count, p_handling_type_code, p_is_priority
  );
  if p_requester_location_id is not null then
    v_duration := greatest(v_duration, public.calculate_appointment_duration_internal(
      p_requester_location_id, p_appointment_type_code, p_truck_type_code,
      p_skid_count, p_handling_type_code, p_is_priority
    ));
  end if;

  for v_candidate_date in
    select (p_date + offset_value)::date
    from generate_series(0, p_search_days) offset_value
  loop
    select is_open, open_time, close_time into v_is_open, v_open, v_close
    from public.location_operating_hours
    where location_id = v_receiving_id
      and day_of_week = extract(dow from v_candidate_date)::smallint;
    if not found or not coalesce(v_is_open, false) or v_open is null or v_close is null
       or v_candidate_date + v_close <= v_candidate_date + v_open + make_interval(mins => v_duration) then
      continue;
    end if;

    v_rank := 0;
    v_found := 0;
    for v_candidate in
      select (candidate_local at time zone v_timezone)
      from generate_series(
        v_candidate_date + v_open,
        v_candidate_date + v_close - make_interval(mins => v_duration),
        make_interval(mins => v_interval)
      ) candidate_local
      order by case
        when p_preferred_start_time is not null and p_preferred_end_time is not null
         and candidate_local::time >= p_preferred_start_time
         and candidate_local::time < p_preferred_end_time then 0 else 1 end,
        candidate_local
    loop
      begin
        v_info := public.inspect_routed_appointment_window_internal(
          p_location_id, p_requester_location_id,
          (v_candidate at time zone v_timezone)::date,
          (v_candidate at time zone v_timezone)::time,
          v_direction, p_appointment_type_code, p_truck_type_code,
          p_skid_count, p_handling_type_code, p_is_priority, null
        );
      exception when others then
        continue;
      end;
      if (v_info->>'is_after_hours')::boolean
         or (v_info->>'primary_dock_id') is null
         or (p_requester_location_id is not null and (v_info->>'counterpart_dock_id') is null)
         or ((v_info->>'capacity_enabled')::boolean
             and v_info->>'capacity_mode' = 'enforce'
             and not (v_info->>'capacity_allowed')::boolean) then
        continue;
      end if;

      v_rank := v_rank + 1;
      v_found := v_found + 1;
      slot_start := (v_info->>'start_at')::timestamptz;
      slot_end := (v_info->>'end_at')::timestamptz;
      available_docks := case when p_requester_location_id is null
        then (v_info->>'primary_available_docks')::integer
        else least((v_info->>'primary_available_docks')::integer, (v_info->>'counterpart_available_docks')::integer) end;
      recommendation_rank := v_rank;
      recommendation_score := 1000 - v_rank * 10;
      recommended_dock_id := (v_info->>'primary_dock_id')::uuid;
      recommended_dock_name := v_info->>'primary_dock_name';
      counterpart_dock_id := nullif(v_info->>'counterpart_dock_id', '')::uuid;
      counterpart_dock_name := v_info->>'counterpart_dock_name';
      recommendation_reason := case when p_requester_location_id is null
        then 'Receiving dock available'
        else 'Origin and destination docks available' end;
      capacity_enabled := (v_info->>'capacity_enabled')::boolean;
      capacity_warning := capacity_enabled and not (v_info->>'capacity_allowed')::boolean;
      projected_occupied_skids := (v_info->>'projected_occupied_skids')::integer;
      available_skid_capacity := (v_info->>'available_skid_capacity')::integer;
      capacity_message := v_info->>'capacity_message';
      alternative_date := v_candidate_date > p_date;
      return next;
      exit when v_found >= 40;
    end loop;
    if v_found > 0 then exit; end if;
  end loop;
end;
$$;

create or replace function public.preview_routed_appointment_time(
  p_location_id uuid,
  p_requester_location_id uuid,
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
declare v_role text; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'You must be signed in to preview an appointment time.'; end if;
  select role_code into v_role from public.profiles where id = auth.uid() and is_active;
  if coalesce(v_role, 'customer') = 'customer' then raise exception 'Customer accounts cannot use staff scheduling overrides.'; end if;
  if not public.has_location_access(p_location_id) or not public.has_permission('appointment.create') then
    raise exception 'You do not have permission to create appointments for this location.';
  end if;
  v_result := public.inspect_routed_appointment_window_internal(
    p_location_id, p_requester_location_id, p_date, p_start_time, p_direction,
    p_appointment_type_code, p_truck_type_code, p_skid_count,
    p_handling_type_code, p_is_priority, null
  );
  if (v_result->>'primary_dock_id') is null
     or (p_requester_location_id is not null and (v_result->>'counterpart_dock_id') is null) then
    raise exception 'A compatible dock is not available at one or both Max Solutions locations.';
  end if;
  if (v_result->>'capacity_enabled')::boolean
     and v_result->>'capacity_mode' = 'enforce'
     and not (v_result->>'capacity_allowed')::boolean then
    raise exception 'This inbound load exceeds the receiving location skid capacity.';
  end if;
  return v_result;
end;
$$;

create or replace function public.book_routed_appointment(
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
  v_direction text := lower(trim(coalesce(p_direction, '')));
  v_result jsonb;
  v_appointment public.appointments%rowtype;
begin
  if auth.uid() is null then raise exception 'You must be signed in to book an appointment.'; end if;
  select role_code into v_role from public.profiles where id = auth.uid() and is_active;
  if not found then raise exception 'This MaxDock account is inactive.'; end if;
  if not public.has_location_access(p_location_id) or not public.has_permission('appointment.create') then
    raise exception 'You do not have permission to create appointments for this location.';
  end if;
  if v_role = 'customer' and (v_direction <> 'inbound' or p_requester_location_id is not null) then
    raise exception 'Customer bookings must be inbound from an external origin.';
  end if;
  if v_direction not in ('inbound', 'outbound') then raise exception 'Direction must be inbound or outbound.'; end if;
  if nullif(trim(coalesce(p_requester_type, '')), '') is null then raise exception 'Origin or destination type is required.'; end if;
  if nullif(trim(coalesce(p_requester_name, '')), '') is null then raise exception 'Requester name is required.'; end if;
  if nullif(trim(coalesce(p_requester_email, '')), '') is null or position('@' in p_requester_email) <= 1 then raise exception 'A valid requester email is required.'; end if;
  if nullif(trim(coalesce(p_external_reference, '')), '') is null then raise exception 'PO / BOL / Job number is required.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(least(p_location_id::text, coalesce(p_requester_location_id::text, p_location_id::text)), 826));
  perform pg_advisory_xact_lock(hashtextextended(greatest(p_location_id::text, coalesce(p_requester_location_id::text, p_location_id::text)), 826));

  v_result := public.inspect_routed_appointment_window_internal(
    p_location_id, p_requester_location_id, p_date, p_start_time, v_direction,
    p_appointment_type_code, p_truck_type_code, p_skid_count,
    p_handling_type_code, p_is_priority, null
  );
  if (v_result->>'primary_dock_id') is null
     or (p_requester_location_id is not null and (v_result->>'counterpart_dock_id') is null) then
    raise exception 'A compatible dock is no longer available at one or both Max Solutions locations.';
  end if;
  if (v_result->>'is_after_hours')::boolean then
    if v_role = 'customer' then raise exception 'Customer appointments must remain within operating hours.'; end if;
    if not coalesce(p_after_hours_confirmed, false) then raise exception 'This appointment is outside operating hours at one or both locations. Staff confirmation is required.'; end if;
  end if;
  if (v_result->>'capacity_enabled')::boolean
     and v_result->>'capacity_mode' = 'enforce'
     and not (v_result->>'capacity_allowed')::boolean then
    raise exception 'This inbound load exceeds the receiving location skid capacity.';
  end if;

  insert into public.appointments (
    booking_reference, entry_kind, source, location_id, dock_id, counterpart_dock_id,
    start_at, end_at, direction, requester_type, requester_location_id, company_name,
    appointment_type_code, truck_type_code, skid_count, handling_type_code,
    is_priority, requester_name, requester_email, carrier_name, external_reference,
    notes, status, created_by, updated_by, is_after_hours_override,
    after_hours_confirmed_by, after_hours_confirmed_at
  ) values (
    null, 'appointment', 'internal', p_location_id,
    (v_result->>'primary_dock_id')::uuid,
    nullif(v_result->>'counterpart_dock_id', '')::uuid,
    (v_result->>'start_at')::timestamptz, (v_result->>'end_at')::timestamptz,
    v_direction, trim(p_requester_type), p_requester_location_id,
    nullif(trim(coalesce(p_company_name, '')), ''), p_appointment_type_code,
    p_truck_type_code, p_skid_count, p_handling_type_code,
    coalesce(p_is_priority, false), trim(p_requester_name), lower(trim(p_requester_email)),
    nullif(trim(coalesce(p_carrier_name, '')), ''), trim(p_external_reference),
    nullif(trim(coalesce(p_notes, '')), ''), 'scheduled', auth.uid(), auth.uid(),
    (v_result->>'is_after_hours')::boolean,
    case when (v_result->>'is_after_hours')::boolean then auth.uid() end,
    case when (v_result->>'is_after_hours')::boolean then now() end
  ) returning * into v_appointment;

  return jsonb_build_object(
    'appointment_id', v_appointment.id,
    'booking_reference', v_appointment.booking_reference,
    'dock_id', v_appointment.dock_id,
    'dock_name', v_result->>'primary_dock_name',
    'counterpart_dock_id', v_appointment.counterpart_dock_id,
    'counterpart_dock_name', v_result->>'counterpart_dock_name',
    'start_at', v_appointment.start_at, 'end_at', v_appointment.end_at,
    'status', v_appointment.status,
    'is_after_hours', (v_result->>'is_after_hours')::boolean,
    'capacity_enabled', (v_result->>'capacity_enabled')::boolean,
    'projected_occupied_skids', (v_result->>'projected_occupied_skids')::integer,
    'available_skid_capacity', (v_result->>'available_skid_capacity')::integer,
    'capacity_message', v_result->>'capacity_message'
  );
end;
$$;

do $$
declare v_appointment record; v_dock_id uuid;
begin
  for v_appointment in
    select a.id, a.requester_location_id, a.truck_type_code, a.start_at, a.end_at
    from public.appointments a
    where a.entry_kind = 'appointment'
      and a.requester_location_id is not null
      and a.location_id <> a.requester_location_id
      and a.counterpart_dock_id is null
      and a.status <> 'cancelled'
    order by a.start_at, a.created_at, a.id
  loop
    select d.id into v_dock_id
    from public.docks d
    join public.dock_truck_types dtt
      on dtt.dock_id = d.id and dtt.location_id = v_appointment.requester_location_id
     and dtt.truck_type_code = v_appointment.truck_type_code
    where d.location_id = v_appointment.requester_location_id and d.is_active
      and not exists (
        select 1 from public.appointments conflict
        where conflict.id <> v_appointment.id
          and conflict.status <> 'cancelled'
          and conflict.schedule_range && tstzrange(v_appointment.start_at, v_appointment.end_at, '[)')
          and d.id in (conflict.dock_id, conflict.counterpart_dock_id)
      )
    order by d.sort_order, d.name
    limit 1;
    if v_dock_id is not null then
      update public.appointments set counterpart_dock_id = v_dock_id, updated_at = now()
      where id = v_appointment.id;
    end if;
    v_dock_id := null;
  end loop;
end;
$$;

create or replace function public.list_location_schedule(p_location_id uuid)
returns table (schedule_record jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'You must be signed in to view the MaxDock schedule.'; end if;
  select role_code into v_role from public.profiles where id = auth.uid() and is_active;
  if not found then raise exception 'This MaxDock account is inactive.'; end if;
  if v_role = 'customer' then raise exception 'Customer accounts cannot view linked internal movements.'; end if;
  if not public.has_location_access(p_location_id) or not public.has_permission('appointment.view') then
    raise exception 'You do not have access to this MaxDock location.';
  end if;

  return query
  with schedule_rows as (
    select a.*, false as is_linked_movement, a.direction::text as display_direction,
      a.dock_id as display_dock_id,
      a.requester_location_id as display_counterpart_location_id,
      coalesce(counterpart.name, nullif(trim(a.company_name), ''), nullif(trim(a.requester_type), ''), 'TBD') as display_counterpart_location_name,
      case when a.direction = 'inbound' then coalesce(counterpart.name, nullif(trim(a.company_name), ''), nullif(trim(a.requester_type), ''), 'External location') else physical.name end as route_origin_name,
      case when a.direction = 'inbound' then physical.name else coalesce(counterpart.name, nullif(trim(a.company_name), ''), nullif(trim(a.requester_type), ''), 'External location') end as route_destination_name
    from public.appointments a
    join public.locations physical on physical.id = a.location_id
    left join public.locations counterpart on counterpart.id = a.requester_location_id
    where a.location_id = p_location_id
    union all
    select a.*, true as is_linked_movement,
      case when a.direction = 'inbound' then 'outbound' else 'inbound' end,
      a.counterpart_dock_id,
      a.location_id, physical.name,
      case when a.direction = 'inbound' then counterpart.name else physical.name end,
      case when a.direction = 'inbound' then physical.name else counterpart.name end
    from public.appointments a
    join public.locations physical on physical.id = a.location_id
    join public.locations counterpart on counterpart.id = a.requester_location_id
    where a.entry_kind = 'appointment'
      and a.requester_location_id = p_location_id
      and a.location_id <> p_location_id
  )
  select (case when s.is_linked_movement then
      to_jsonb(s) - 'requester_name' - 'requester_email' - 'created_by' - 'updated_by' - 'after_hours_confirmed_by'
    else to_jsonb(s) end) || jsonb_build_object(
      'schedule_location_id', p_location_id,
      'physical_location_id', s.location_id
    )
  from schedule_rows s
  order by s.start_at, s.booking_reference;
end;
$$;

update public.location_appointment_types
set is_active = false, updated_at = now()
where appointment_type_code = 'vip';

update public.appointment_types
set is_active = false, updated_at = now()
where code = 'vip';

revoke all on function public.calculate_appointment_duration_internal(uuid, text, text, integer, text, boolean) from public, anon, authenticated;
revoke all on function public.location_capacity_projection_internal(uuid, timestamptz, text, integer, uuid) from public, anon, authenticated;
revoke all on function public.inspect_routed_appointment_window_internal(uuid, uuid, date, time, text, text, text, integer, text, boolean, uuid) from public, anon, authenticated;
revoke all on function public.enforce_dual_dock_reservation() from public, anon, authenticated;
revoke all on function public.list_routed_appointment_slots(uuid, uuid, date, text, text, text, integer, text, boolean, time, time, integer) from public, anon;
revoke all on function public.preview_routed_appointment_time(uuid, uuid, date, time, text, text, text, integer, text, boolean) from public, anon;
revoke all on function public.book_routed_appointment(uuid, date, time, text, text, text, text, integer, text, boolean, text, text, text, text, uuid, text, text, boolean) from public, anon;
revoke all on function public.list_location_schedule(uuid) from public, anon;

grant execute on function public.get_location_capacity_projection(uuid, timestamptz, text, integer, uuid) to authenticated;
grant execute on function public.list_routed_appointment_slots(uuid, uuid, date, text, text, text, integer, text, boolean, time, time, integer) to authenticated;
grant execute on function public.preview_routed_appointment_time(uuid, uuid, date, time, text, text, text, integer, text, boolean) to authenticated;
grant execute on function public.book_routed_appointment(uuid, date, time, text, text, text, text, integer, text, boolean, text, text, text, text, uuid, text, text, boolean) to authenticated;
grant execute on function public.list_location_schedule(uuid) to authenticated;

insert into public.maxdock_schema_versions(version, description)
values ('DB-v18', 'Atomic origin and destination dock routing, linked dock lanes, live two-site capacity, and VIP removal')
on conflict (version) do update
set description = excluded.description, applied_at = now();
