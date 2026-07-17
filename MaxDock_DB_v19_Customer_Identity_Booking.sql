-- MaxDock DB27: assigned customer/vendor identity and standardized company directory

begin;

alter table public.profiles
  add column if not exists external_party_type text,
  add column if not exists organization_name text;

update public.profiles
set external_party_type = 'Customer'
where role_code = 'customer'
  and external_party_type is null;

alter table public.profiles
  drop constraint if exists profiles_external_party_type_check;

alter table public.profiles
  add constraint profiles_external_party_type_check
  check (external_party_type is null or external_party_type in ('Customer', 'Vendor'));

create or replace function public.list_external_company_directory()
returns table(company_name text, party_type text)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view the customer and vendor directory.';
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if not found or not v_profile.is_active then
    raise exception 'An active MaxDock account is required.';
  end if;

  if v_profile.role_code = 'customer' then
    return query
    select trim(v_profile.organization_name), v_profile.external_party_type
    where nullif(trim(coalesce(v_profile.organization_name, '')), '') is not null
      and v_profile.external_party_type in ('Customer', 'Vendor');
    return;
  end if;

  return query
  with directory as (
    select
      trim(p.organization_name) as company_name,
      p.external_party_type as party_type,
      0 as source_priority
    from public.profiles p
    where p.role_code = 'customer'
      and p.external_party_type in ('Customer', 'Vendor')
      and nullif(trim(coalesce(p.organization_name, '')), '') is not null

    union all

    select
      trim(a.company_name) as company_name,
      case lower(trim(a.requester_type))
        when 'customer' then 'Customer'
        when 'vendor' then 'Vendor'
      end as party_type,
      1 as source_priority
    from public.appointments a
    where lower(trim(coalesce(a.requester_type, ''))) in ('customer', 'vendor')
      and nullif(trim(coalesce(a.company_name, '')), '') is not null
  )
  select ranked.company_name, ranked.party_type
  from (
    select distinct on (lower(d.company_name), d.party_type)
      d.company_name, d.party_type
    from directory d
    where d.party_type is not null
    order by lower(d.company_name), d.party_type, d.source_priority, d.company_name
  ) ranked
  order by ranked.party_type, ranked.company_name;
end;
$function$;

create or replace function public.admin_list_users_with_identity()
returns table(
  user_id uuid,
  username text,
  full_name text,
  email text,
  role_code text,
  role_name text,
  is_active boolean,
  must_change_password boolean,
  location_ids uuid[],
  location_names text[],
  created_at timestamptz,
  last_sign_in_at timestamptz,
  external_party_type text,
  organization_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view MaxDock users.';
  end if;
  if not public.is_system_admin() then
    raise exception 'Only a MaxDock System Admin can view the full user list.';
  end if;

  return query
  select
    p.id,
    p.username,
    p.full_name,
    coalesce(au.email::text, p.contact_email),
    p.role_code,
    r.name,
    p.is_active,
    p.must_change_password,
    coalesce(
      array_agg(ula.location_id order by l.name)
        filter (where ula.location_id is not null),
      array[]::uuid[]
    ),
    coalesce(
      array_agg(l.name order by l.name)
        filter (where l.name is not null),
      array[]::text[]
    ),
    p.created_at,
    au.last_sign_in_at,
    p.external_party_type,
    p.organization_name
  from public.profiles p
  join auth.users au on au.id = p.id
  join public.roles r on r.code = p.role_code
  left join public.user_location_access ula on ula.user_id = p.id
  left join public.locations l on l.id = ula.location_id
  group by p.id, au.email, au.last_sign_in_at, r.name
  order by p.is_active desc, p.full_name, au.email;
end;
$function$;

create or replace function public.admin_update_user(
  p_user_id uuid,
  p_full_name text,
  p_role_code text,
  p_is_active boolean,
  p_location_ids uuid[],
  p_external_party_type text,
  p_organization_name text
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
  v_external_party_type text;
  v_organization_name text;
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
    v_external_party_type := nullif(trim(coalesce(p_external_party_type, '')), '');
    v_organization_name := nullif(trim(coalesce(p_organization_name, '')), '');
    if v_external_party_type is null or v_external_party_type not in ('Customer', 'Vendor') then
      raise exception 'Choose Customer or Vendor as the external account type.';
    end if;
    if v_organization_name is null then
      raise exception 'Company name is required for a Customer access account.';
    end if;
    select coalesce(array_agg(l.id order by l.name), array[]::uuid[])
    into v_location_ids from public.locations l where l.is_active = true;
  else
    v_external_party_type := null;
    v_organization_name := null;
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

  update public.profiles
  set full_name = trim(p_full_name),
      role_code = p_role_code,
      is_active = coalesce(p_is_active, true),
      external_party_type = v_external_party_type,
      organization_name = v_organization_name,
      updated_at = now()
  where id = p_user_id;

  delete from public.user_location_access where user_id = p_user_id;
  insert into public.user_location_access (user_id, location_id, granted_by)
  select p_user_id, location_id, auth.uid()
  from unnest(v_location_ids) location_ids(location_id)
  on conflict (user_id, location_id) do nothing;

  return jsonb_build_object(
    'user_id', p_user_id,
    'role_code', p_role_code,
    'is_active', coalesce(p_is_active, true),
    'location_count', v_requested_count,
    'external_party_type', v_external_party_type,
    'organization_name', v_organization_name
  );
end;
$function$;

revoke all on function public.list_external_company_directory() from public;
revoke all on function public.list_external_company_directory() from anon;
grant execute on function public.list_external_company_directory() to authenticated;

revoke all on function public.admin_list_users_with_identity() from public;
revoke all on function public.admin_list_users_with_identity() from anon;
grant execute on function public.admin_list_users_with_identity() to authenticated;

revoke all on function public.admin_update_user(uuid, text, text, boolean, uuid[], text, text) from public;
revoke all on function public.admin_update_user(uuid, text, text, boolean, uuid[], text, text) from anon;
grant execute on function public.admin_update_user(uuid, text, text, boolean, uuid[], text, text) to authenticated;

-- Remove earlier broad default grants from the legacy System Admin RPCs too.
revoke all on function public.admin_list_users() from anon;
revoke all on function public.admin_update_user(uuid, text, text, boolean, uuid[]) from anon;

comment on column public.profiles.external_party_type is 'Customer or Vendor identity assigned to an external MaxDock login.';
comment on column public.profiles.organization_name is 'Canonical company name used for booking and reporting.';
comment on function public.list_external_company_directory() is 'Returns the standardized external-company directory without exposing other companies to customer accounts.';

notify pgrst, 'reload schema';

commit;
