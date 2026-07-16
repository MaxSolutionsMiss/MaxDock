-- MaxDock DB19: customer-wide active location access
-- Existing Customer accounts are backfilled, and future Admin edits always
-- assign every active MaxDock location to the Customer role.

begin;

insert into public.user_location_access (user_id, location_id, granted_by)
select p.id, l.id, null
from public.profiles p
cross join public.locations l
where p.role_code = 'customer'
  and l.is_active = true
on conflict (user_id, location_id) do nothing;

create or replace function public.admin_update_user(
  p_user_id uuid,
  p_full_name text,
  p_role_code text,
  p_is_active boolean,
  p_location_ids uuid[] default array[]::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_profile public.profiles%rowtype;
  v_location_ids uuid[];
  v_requested_count integer;
  v_valid_count integer;
begin
  if auth.uid() is null then raise exception 'You must be signed in to manage MaxDock users.'; end if;
  if not public.is_system_admin() then raise exception 'Only a MaxDock System Admin can manage users.'; end if;
  if p_user_id is null then raise exception 'A MaxDock user is required.'; end if;
  if nullif(trim(coalesce(p_full_name, '')), '') is null then raise exception 'Full name is required.'; end if;
  if not exists (select 1 from public.roles r where r.code = p_role_code and r.is_active = true) then
    raise exception 'The selected MaxDock role is invalid.';
  end if;
  select * into v_profile from public.profiles p where p.id = p_user_id for update;
  if not found then raise exception 'MaxDock user not found.'; end if;
  if p_user_id = auth.uid() and (coalesce(p_is_active, false) = false or p_role_code <> 'system_admin') then
    raise exception 'You cannot deactivate or remove your own System Admin access.';
  end if;
  if p_role_code = 'customer' then
    select coalesce(array_agg(l.id order by l.name), array[]::uuid[])
    into v_location_ids from public.locations l where l.is_active = true;
  else
    select coalesce(array_agg(distinct requested_id), array[]::uuid[])
    into v_location_ids
    from unnest(coalesce(p_location_ids, array[]::uuid[])) requested(requested_id)
    where requested_id is not null;
  end if;
  v_requested_count := coalesce(cardinality(v_location_ids), 0);
  select count(*) into v_valid_count from public.locations l
  where l.id = any(v_location_ids) and l.is_active = true;
  if v_requested_count <> v_valid_count then raise exception 'One or more selected locations are invalid or inactive.'; end if;
  if p_role_code <> 'system_admin' and v_requested_count = 0 then
    raise exception 'At least one active MaxDock location is required.';
  end if;
  update public.profiles set full_name = trim(p_full_name), role_code = p_role_code,
    is_active = coalesce(p_is_active, true), updated_at = now()
  where id = p_user_id;
  delete from public.user_location_access where user_id = p_user_id;
  insert into public.user_location_access (user_id, location_id, granted_by)
  select p_user_id, location_id, auth.uid()
  from unnest(v_location_ids) location_ids(location_id)
  on conflict (user_id, location_id) do nothing;
  return jsonb_build_object('user_id', p_user_id, 'role_code', p_role_code,
    'is_active', coalesce(p_is_active, true), 'location_count', v_requested_count);
end;
$function$;

commit;
