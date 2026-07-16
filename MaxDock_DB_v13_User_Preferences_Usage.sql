-- MaxDock DB20 / database v13
-- Per-user saved views and privacy-conscious aggregate usage reporting.

begin;

create table if not exists public.user_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_key text not null check (preference_key ~ '^[a-z0-9_-]{2,40}$'),
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, preference_key)
);

comment on table public.user_preferences is
  'Per-login MaxDock page and view preferences. No passwords or private appointment content are stored here.';

alter table public.user_preferences enable row level security;

drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own on public.user_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own on public.user_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists user_preferences_delete_own on public.user_preferences;
create policy user_preferences_delete_own on public.user_preferences
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.user_preferences to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'user_preferences_set_updated_at'
      and tgrelid = 'public.user_preferences'::regclass
  ) then
    create trigger user_preferences_set_updated_at
      before update on public.user_preferences
      for each row execute function public.set_updated_at();
  end if;
end
$$;

create or replace function public.get_user_preference(p_preference_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_preferences jsonb;
begin
  if auth.uid() is null then raise exception 'You must be signed in to load saved MaxDock views.'; end if;
  if coalesce(p_preference_key, '') !~ '^[a-z0-9_-]{2,40}$' then
    raise exception 'The preference key is invalid.';
  end if;

  select p.preferences into v_preferences
  from public.user_preferences p
  where p.user_id = auth.uid() and p.preference_key = p_preference_key;

  return coalesce(v_preferences, '{}'::jsonb);
end;
$$;

create or replace function public.save_user_preference(
  p_preference_key text,
  p_preferences jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in to save MaxDock views.'; end if;
  if coalesce(p_preference_key, '') !~ '^[a-z0-9_-]{2,40}$' then
    raise exception 'The preference key is invalid.';
  end if;
  if p_preferences is null or jsonb_typeof(p_preferences) <> 'object' then
    raise exception 'Saved MaxDock preferences must be an object.';
  end if;
  if pg_column_size(p_preferences) > 16384 then
    raise exception 'The saved MaxDock view is too large.';
  end if;

  insert into public.user_preferences(user_id, preference_key, preferences)
  values (auth.uid(), p_preference_key, p_preferences)
  on conflict (user_id, preference_key) do update
  set preferences = excluded.preferences,
      updated_at = now();

  return p_preferences;
end;
$$;

revoke all on function public.get_user_preference(text) from public, anon;
revoke all on function public.save_user_preference(text, jsonb) from public, anon;
grant execute on function public.get_user_preference(text) to authenticated;
grant execute on function public.save_user_preference(text, jsonb) to authenticated;

create table if not exists public.user_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  login_count integer not null default 0 check (login_count >= 0),
  page_view_count integer not null default 0 check (page_view_count >= 0),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  page_views jsonb not null default '{}'::jsonb check (jsonb_typeof(page_views) = 'object'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

comment on table public.user_usage_daily is
  'Daily aggregate MaxDock adoption metrics. Stores counts and estimated visible-app time, not page content.';

create index if not exists user_usage_daily_activity_date_idx
  on public.user_usage_daily(activity_date desc, last_seen_at desc);

alter table public.user_usage_daily enable row level security;
revoke all on public.user_usage_daily from public, anon, authenticated;

create or replace function public.record_user_usage(
  p_event_type text,
  p_page_code text,
  p_active_seconds integer default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity_date date := (now() at time zone 'America/Toronto')::date;
  v_login_increment integer := 0;
  v_page_increment integer := 0;
  v_seconds_increment integer := 0;
  v_initial_pages jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then return; end if;
  if p_event_type not in ('login', 'page_view', 'heartbeat') then
    raise exception 'The MaxDock usage event is invalid.';
  end if;
  if coalesce(p_page_code, '') !~ '^[a-z0-9_-]{2,40}$' then
    raise exception 'The MaxDock page code is invalid.';
  end if;

  v_login_increment := case when p_event_type = 'login' then 1 else 0 end;
  v_page_increment := case when p_event_type = 'page_view' then 1 else 0 end;
  v_seconds_increment := case when p_event_type = 'heartbeat'
    then least(greatest(coalesce(p_active_seconds, 0), 0), 120) else 0 end;
  if v_page_increment = 1 then
    v_initial_pages := jsonb_build_object(p_page_code, 1);
  end if;

  insert into public.user_usage_daily(
    user_id, activity_date, login_count, page_view_count,
    active_seconds, page_views, first_seen_at, last_seen_at
  ) values (
    auth.uid(), v_activity_date, v_login_increment, v_page_increment,
    v_seconds_increment, v_initial_pages, now(), now()
  )
  on conflict (user_id, activity_date) do update
  set login_count = public.user_usage_daily.login_count + v_login_increment,
      page_view_count = public.user_usage_daily.page_view_count + v_page_increment,
      active_seconds = public.user_usage_daily.active_seconds + v_seconds_increment,
      page_views = case when v_page_increment = 1 then
        jsonb_set(
          coalesce(public.user_usage_daily.page_views, '{}'::jsonb),
          array[p_page_code],
          to_jsonb(coalesce((public.user_usage_daily.page_views ->> p_page_code)::integer, 0) + 1),
          true
        )
      else public.user_usage_daily.page_views end,
      last_seen_at = now();
end;
$$;

revoke all on function public.record_user_usage(text, text, integer) from public, anon;
grant execute on function public.record_user_usage(text, text, integer) to authenticated;

create or replace function public.admin_list_user_usage()
returns table (
  user_id uuid,
  tracked_logins bigint,
  active_days bigint,
  active_days_7 bigint,
  active_days_30 bigint,
  page_views_30 bigint,
  active_seconds_30 bigint,
  first_activity_at timestamptz,
  last_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in to view MaxDock usage.'; end if;
  if not public.is_system_admin() then raise exception 'Only a MaxDock System Admin can view usage.'; end if;

  return query
  select
    p.id,
    coalesce(sum(u.login_count), 0)::bigint,
    count(u.activity_date)::bigint,
    count(u.activity_date) filter (where u.activity_date >= (now() at time zone 'America/Toronto')::date - 6)::bigint,
    count(u.activity_date) filter (where u.activity_date >= (now() at time zone 'America/Toronto')::date - 29)::bigint,
    coalesce(sum(u.page_view_count) filter (where u.activity_date >= (now() at time zone 'America/Toronto')::date - 29), 0)::bigint,
    coalesce(sum(u.active_seconds) filter (where u.activity_date >= (now() at time zone 'America/Toronto')::date - 29), 0)::bigint,
    min(u.first_seen_at),
    max(u.last_seen_at)
  from public.profiles p
  left join public.user_usage_daily u on u.user_id = p.id
  group by p.id;
end;
$$;

revoke all on function public.admin_list_user_usage() from public, anon;
grant execute on function public.admin_list_user_usage() to authenticated;

insert into public.maxdock_schema_versions(version, description)
values ('DB-v13', 'Per-user saved views and aggregate usage analytics')
on conflict (version) do update
set description = excluded.description,
    applied_at = now();

commit;
