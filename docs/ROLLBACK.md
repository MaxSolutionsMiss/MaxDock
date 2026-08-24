# Rollback — P0, P1 and the VR refinement pass

**This file was written before any of the work it describes.** That is deliberate. A database
migration applies to the shared live Supabase project the moment it runs, and closing a pull
request does not undo it. So the reverse was written, and checked, first.

If you are reading this because something went wrong, skip to
[**Section 8 — the procedure**](#8-the-procedure-numbered). It is written to be followed alone,
without needing anyone else, and without needing to understand anything above it.

---

## 1. Baseline

| | |
|---|---|
| **Baseline commit** | `72cfb56d3705f8207d93f4c1b594a9c578bf9f8d` |
| Branch the work happens on | `claude/maxdock-handoff-setup-h7d5nu` (mirrored to `feat/stage4-dock-board`) |
| Production branch, untouched | `main` |
| Supabase project | `rywzqepzramurbrpmept` (this is the live project — there is no separate dev database) |
| Migrations added | `appointment_service_and_departure_clock`, `receive_appointment_stamps_service_and_departure`, `change_appointment_status_stamps_service_and_departure`, `lookup_appointment_site_by_check_in_token` |
| Applied on | 2026-07-31. The columns are live; every toggle is off, so nothing behaves differently yet. |

`72cfb56d3705f8207d93f4c1b594a9c578bf9f8d` is the state of the product immediately before this
work. Everything in Section 8 restores exactly that.

---

## 2. What changed, in three layers

The three layers roll back independently. You do not have to do all three, and doing only Layer 3
is a complete rollback of behaviour with no risk at all.

| Layer | What it covers | Reversed by | Risk |
|---|---|---|---|
| **3 — Operational** | The Start and Departed actions | Two settings toggles, per location | None. No code or schema changes. |
| **1 — Code** | P0 tap targets, all VR refinements, the new buttons | Close the PR / reset the branch | None to production. The live site never published it. |
| **2 — Database** | Two columns on `appointments`, two on `location_settings`, two RPCs | The SQL in Section 5 | Low, and additive-only by design. |

**Start with Layer 3.** It is instant, it is the owner's own switch, and it restores today's
behaviour completely. Layers 1 and 2 are only needed if you want the code and schema gone as well.

---

## 3. Why the database change is safe to leave in place

If you only want the behaviour reverted, you can stop after Layer 3 and leave the schema alone.
The migration was built so that leaving it in place is a supported end state, not a mess:

- **Additive only.** Two new columns on `appointments`, two on `location_settings`. Nothing
  dropped, nothing renamed, no column made `NOT NULL`, no data rewritten, no backfill.
- **Nullable.** Every new column is nullable. Rows that existed before the migration read as
  `NULL` on `appointments` and as false on the settings toggles.
- **Old code runs unchanged.** Nothing that existed before this work reads or writes the new
  columns. A browser running the previous JavaScript against the new schema behaves identically.
- **Existing RPC signatures unchanged.** `receive_appointment` and `change_appointment_status`
  keep exactly the parameters they had. Every existing call site passes the same arguments and
  gets the same result. The new behaviour only fires on input values that used to be rejected.
- **No status values were added.** `departed` is a timestamp, not a status. An appointment that
  has departed is still `completed`. Every existing filter, board colour, report and scorecard
  sees exactly what it saw before.

---

## 3a. VR1 — the refinement pass, revertible on its own

The refinement work is tracked separately from P0 and P1 so it can be dropped without touching
either. Every VR1 commit is prefixed `VR1:` and **changes only CSS and JavaScript** — no
migration, no RPC, no settings column, nothing in Supabase at all. That is what makes it the
cheapest thing here to undo: it needs no SQL editor and no downtime, and dropping it cannot
affect a single row of data.

To list exactly what is in it:

```bash
git log --oneline --grep='^VR1:' 72cfb56d3705f8207d93f4c1b594a9c578bf9f8d..HEAD
```

To take all of it out and keep P0 and P1:

```bash
git revert --no-commit $(git log --format=%H --grep='^VR1:' 72cfb56d3705f8207d93f4c1b594a9c578bf9f8d..HEAD | tr '\n' ' ')
git commit -m "Drop VR1"
git push origin HEAD
```

Or, to take out one piece and keep the rest, revert that single commit: each VR1 commit is one
idea, so `git revert <sha>` on any of them is a complete removal of that idea alone.

What VR1 contains, and what each part touches:

| Piece | Files | Reverting it means |
|---|---|---|
| Current-time line on the board | `js/ui/timeline.js`, `js/pages/board.js`, `js/format.js`, CSS | The board stops showing where the day has got to |
| Queue next-action ladder | `js/pages/queue.js` | Rows go back to Arrive / Complete only, with no Start or Departed rung |
| Urgent-first ordering | `js/pages/queue.js` | The queue returns to pure clock order |
| "Showing X of Y" | `js/pages/queue.js` | The count goes back to the unfiltered total |
| Chrome stability check | `scripts/verify-chrome-stability.mjs`, workflows | CI stops proving the header and rail do not move between pages |

The queue ladder is the one place VR1 and P1 meet: the Start and Departed rungs read the same
two per-location switches P1 added, so **turning those switches off also removes them**, with
no code change at all. VR1 and Layer 3 both cover it, and either is enough.

---

## 3b. The customer activity feed

Added after P1 at the owner's request: a customer could see their booking but not what had
happened to it. This is the cheapest thing in the whole document to undo, because it adds a
function and changes nothing that existed.

| | |
|---|---|
| Migration | `customer_visible_appointment_activity` |
| Adds | `public.list_my_appointment_activity(uuid)` |
| Changes | nothing. No column, no table, no existing function, no permission, no grant to a role |

To remove it:

```sql
drop function if exists public.list_my_appointment_activity(uuid);
```

That is the whole rollback. Nothing else reads it, and the screen that calls it degrades to
what it showed before — the booking without its history.

**Why it is a new function rather than a permission.** The obvious fix was to grant
`audit.view` to the customer role. That would have been a serious mistake:
`get_appointment_history` is gated on that one permission and is not scoped to the caller, so
granting it hands every customer the audit trail of every appointment at the site, including
other companies'. Worse, the audit table stores the whole appointment row on every event —
the recorded keys include `check_in_token`, `counterpart_dock_id` and `checked_in_by` — so it
cannot be exposed to a customer in raw form under any permission at all.

The new function therefore authorises on ownership rather than on `audit.view`, using the same
`created_by = auth.uid()` test `list_my_appointments` already uses, and returns sentences it
derives rather than rows it stores. No dock, no token, no internal name. An update that
touched only internal fields emits no line, so a customer cannot infer dock activity from a
gap in the list.

**The marks** — the vehicle, timing and crew silhouettes in `js/ui/marks.js`, the `.rowmark`
rule, and the truck-type row in the appointment window — are code only and revert with the
branch. Nothing reads them from the database and no RPC changed; `truckMarkName` maps a
`truck_types.code` to a drawing and falls back to the generic tractor-trailer, so a truck type
added later still gets a truck rather than an error.

**The card that shows it** is code only — `js/pages/my-appointments.js` and the
`.appointment-card` rules in `assets/maxdock.css`. It puts the chevron at the head of the row
the way a Users row does, folds the cancellation reason into the fact line instead of giving it
a line of its own, and lets the head line wrap so the route is not crushed. Dropping the branch
drops all of it; there is nothing to undo in the database for this part.

---

## 4. Layer 1 — Code

All work is on `claude/maxdock-handoff-setup-h7d5nu` with a **draft** pull request that is not
merged. `main` is untouched, so `https://maxsolutionsmiss.github.io/MaxDock/` is still serving
the baseline commit. There is nothing to undo in production.

To discard the code:

```bash
# Option A — throw the work away entirely
git push origin --delete claude/maxdock-handoff-setup-h7d5nu

# Option B — keep the branch but return it to the baseline
git checkout claude/maxdock-handoff-setup-h7d5nu
git reset --hard 72cfb56d3705f8207d93f4c1b594a9c578bf9f8d
git push --force-with-lease origin claude/maxdock-handoff-setup-h7d5nu
git push --force-with-lease origin claude/maxdock-handoff-setup-h7d5nu:feat/stage4-dock-board
```

Option B also restores the Stage 4 preview at
`https://maxsolutionsmiss.github.io/MaxDock/stage4-preview/`, because that preview publishes
from `feat/stage4-dock-board`.

---

## 5. Layer 2 — Database

### 5a. The down-migration, exactly as it should be run

Paste this into the Supabase SQL editor and run it. It is safe to run more than once, and safe to
run even if only part of the up-migration was applied. **Run Section 5b first if you want the RPCs
back as well** — order does not strictly matter, but restoring the functions before dropping the
columns avoids a window where a function references a column that is gone.

```sql
-- Reverse of migration: appointment_service_and_departure_clock
-- Drops only what that migration added. Touches no existing column and no data.
-- The two RPC migrations are reversed separately, by Section 5b.
begin;

alter table public.appointments
  drop column if exists service_started_at,
  drop column if exists departed_at;

alter table public.location_settings
  drop column if exists track_service_start,
  drop column if exists track_departure;

commit;
```

Dropping these columns destroys any service-start and departure times recorded while the feature
was on. Nothing else depends on them. If you want to keep the recorded times and only stop the
feature, **do not run this** — use Layer 3 instead.

### 5b. The two RPCs, restored word for word

These are the definitions captured from the live database with `pg_get_functiondef` at the baseline
commit, before anything was changed. Running these blocks returns each function to exactly what it
was. Nothing here is retyped from memory; both were read out of the database and then checked back
against it character by character.

**Proof, not assurance.** Each block below was hashed and compared against the live database. A
copy that looks right is not the same as a copy that is right, and the difference only shows up on
the day somebody is relying on this file.

| Function | MD5 of the definition | Characters |
|---|---|---|
| `change_appointment_status` | `38690f2ece47b9e9b3f2db69a10f9b77` | 2441 |
| `receive_appointment` | `892af0bc89b64b7b8bf48f122dc23753` | 2251 |

To re-check at any time, run this and compare against the table above:

```sql
select p.proname,
       md5(replace(rtrim(pg_get_functiondef(p.oid), E'\n'), E'\r', '')) as md5,
       length(replace(rtrim(pg_get_functiondef(p.oid), E'\n'), E'\r', '')) as chars
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('change_appointment_status', 'receive_appointment')
order by 1;
```

**What was verified after applying the change.** Both functions kept the identity they had:
same parameter names and types, same defaults, still `SECURITY DEFINER`, still returning
`jsonb`, and `EXECUTE` still granted to exactly `authenticated, postgres, service_role` and not
to `anon`. The whole clock was then driven through both functions against a real appointment
inside a transaction that was rolled back — arrived, start, start again, complete, departed,
departed again, plus stepping backwards from each — and afterwards the live tables held zero
rows with a service time, zero with a departure time, zero locations with a toggle on, and zero
rows carrying a `departed` status, which is the point: departure is a timestamp and never a
status.

Two notes on exactness. The hash is taken after stripping carriage returns and trailing blank
lines: `change_appointment_status` is stored in the database with Windows line endings and the
blocks here use Unix ones. Postgres treats both identically, so restoring from this file produces a
function that behaves the same in every respect; the only difference is which line endings a future
`pg_get_functiondef` prints back. And once the up-migration has run, these hashes will no longer
match the live database — that is the point. They describe the **baseline**, which is what you are
restoring to. `scripts/verify-rollback-doc.mjs` checks that this file's blocks still hash to the
values in this table, so the saved copy cannot be edited by accident without the build noticing.

#### `public.change_appointment_status`

```sql
CREATE OR REPLACE FUNCTION public.change_appointment_status(p_appointment_id uuid, p_new_status text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_appointment public.appointments%rowtype;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to change appointment status.';
  end if;

  v_status := lower(trim(coalesce(p_new_status, '')));

  if v_status not in (
    'scheduled',
    'confirmed',
    'arrived',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
  ) then
    raise exception 'Invalid appointment status.';
  end if;

  select *
  into v_appointment
  from public.appointments a
  where a.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found.';
  end if;

  if not public.has_location_access(v_appointment.location_id) then
    raise exception 'You do not have access to this appointment''s location.';
  end if;

  if v_appointment.entry_kind = 'block' then
    if not public.has_permission('block.manage') then
      raise exception 'You do not have permission to change dock blocks.';
    end if;
  elsif v_status = 'completed' then
    if not public.has_permission('appointment.complete') then
      raise exception 'You do not have permission to complete appointments.';
    end if;
  elsif v_status in ('cancelled', 'no_show') then
    if not public.has_permission('appointment.cancel') then
      raise exception 'You do not have permission to cancel appointments.';
    end if;
  elsif not public.has_permission('appointment.update') then
    raise exception 'You do not have permission to update appointments.';
  end if;

  if v_status = 'cancelled'
     and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A cancellation reason is required.';
  end if;

  update public.appointments
  set
    status = v_status,
    cancellation_reason = case
      when v_status = 'cancelled' then trim(p_reason)
      else null
    end,
    updated_by = auth.uid()
  where id = p_appointment_id
  returning * into v_appointment;

  return jsonb_build_object(
    'appointment_id', v_appointment.id,
    'booking_reference', v_appointment.booking_reference,
    'status', v_appointment.status,
    'completed_at', v_appointment.completed_at,
    'cancelled_at', v_appointment.cancelled_at
  );
end;
$function$
```

#### `public.receive_appointment`

```sql
CREATE OR REPLACE FUNCTION public.receive_appointment(p_appointment_id uuid, p_status text, p_driver_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_appointment public.appointments%rowtype;
  v_status text;
begin
  if auth.uid() is null then raise exception 'You must be signed in to receive a truck.'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active) then
    raise exception 'This MaxDock account is inactive.';
  end if;
  if not public.has_permission('appointment.check_in') then
    raise exception 'You do not have permission to receive trucks.';
  end if;

  v_status := lower(trim(coalesce(p_status, '')));
  if v_status not in ('arrived', 'in_progress', 'completed') then
    raise exception 'That is not a status a truck can be set to at the dock.';
  end if;
  if v_status = 'completed' and not public.has_permission('appointment.complete') then
    raise exception 'You do not have permission to complete appointments.';
  end if;

  select * into v_appointment from public.appointments
  where id = p_appointment_id and entry_kind = 'appointment'
  for update;
  if not found then raise exception 'Appointment not found.'; end if;
  if not public.has_location_access(v_appointment.location_id) then
    raise exception 'That appointment is at a location you do not have access to.';
  end if;
  if v_appointment.status in ('cancelled', 'no_show') then
    raise exception 'That appointment was %.', v_appointment.status;
  end if;

  update public.appointments
     set status = v_status,
         checked_in_at = coalesce(checked_in_at, now()),
         checked_in_by = coalesce(checked_in_by, auth.uid()),
         driver_name = coalesce(nullif(trim(coalesce(p_driver_name, '')), ''), driver_name),
         updated_by = auth.uid(),
         updated_at = now()
   where id = v_appointment.id
  returning * into v_appointment;

  return jsonb_build_object(
    'appointment_id', v_appointment.id,
    'booking_reference', v_appointment.booking_reference,
    'status', v_appointment.status,
    'checked_in_at', v_appointment.checked_in_at,
    'driver_name', v_appointment.driver_name
  );
end;
$function$
```

### 5b-ii. The two access RPCs, restored word for word

Added after the customer activity feed, for the opposite problem: a Max Solutions coordinator
could see a load on their board and get nothing when they opened it. Both functions below decide
who may read an appointment's history and its check-in code, and both asked the same question —
"do you have access to the site in `location_id`?" A Max-to-Max load has two sites and only one
`location_id`, so it appears on both boards and answers to one of them. **199 of 730 appointments
carry a `requester_location_id` different from `location_id`**, which is why a coordinator saw
history on some jobs and not on others: the ones they could not open were the ones booked from
the other end.

The change adds `or public.has_location_access(requester_location_id)` and nothing else. No
permission was granted to any role, no column changed, and the customer path is untouched — a
customer has neither `audit.view` nor a `user_location_access` row, so this widens nothing for
them. It widens access from one end of a Max-to-Max lane to both ends of the same lane.

| Function | MD5 of the definition | Characters |
|---|---|---|
| `get_appointment_history` | `58951c308c7e8af25fdff12ab029e3c3` | 6571 |
| `get_appointment_check_in_token` | `4c3cf60c43f1c9b40e19168eab6a6942` | 862 |

```sql
CREATE OR REPLACE FUNCTION public.get_appointment_check_in_token(p_appointment_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row public.appointments%rowtype;
begin
  if auth.uid() is null then return null; end if;
  select * into v_row from public.appointments where id = p_appointment_id;
  if v_row.id is null then return null; end if;
  if not public.has_location_access(v_row.location_id) then return null; end if;
  if public.has_permission('appointment.view')
     or v_row.created_by = auth.uid()
     or lower(v_row.requester_email) = (
       select lower(coalesce(p.contact_email, u.email))
       from public.profiles p left join auth.users u on u.id = p.id
       where p.id = auth.uid())
  then
    return v_row.check_in_token::text;
  end if;
  return null;
end;
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.get_appointment_history(p_appointment_id uuid)
 RETURNS TABLE(event_id bigint, action text, changed_at timestamp with time zone, changed_by_name text, summary text, details jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    case
      -- This load took other loads onto it. Named, because "Appointment details updated" is
      -- not an answer to "where did my load go".
      when log.new_values ? 'combined_from' then
        (select
           case when count(*) = 1 then 'Combined ' || string_agg(value #>> '{}', '') || ' onto this load'
                else 'Combined ' || string_agg(value #>> '{}', ', ') || ' onto this load' end
         from jsonb_array_elements(log.new_values->'combined_from'))
        || ' · one truck, ' || coalesce(log.new_values->>'skid_count', '?') || ' skids'
        || case when coalesce((log.new_values->>'documents_moved')::int, 0) > 0
             then ' · ' || (log.new_values->>'documents_moved') || ' document(s) came with them' else '' end
      -- And this load went onto another one. The number of the truck its freight is on is the
      -- whole point: somebody searching for a cancelled reference lands here and needs to be
      -- told where to look next.
      when log.old_values->>'merged_into_appointment_id' is null
       and log.new_values->>'merged_into_appointment_id' is not null then
        coalesce(nullif(trim(log.new_values->>'cancellation_reason'), ''), 'Combined onto another load')
        || ' · this load travels on that truck'
      -- A first scan is its own event, named as one, whatever else moved with it.
      when log.old_values->>'checked_in_at' is null and log.new_values->>'checked_in_at' is not null then
        'Scanned in at the dock'
           || coalesce(' · driver ' || nullif(trim(log.new_values->>'driver_name'), ''), '')
      when log.action = 'created' then 'Appointment created'
      when log.action = 'status_changed' then format(
        'Status changed from %s to %s',
        replace(initcap(coalesce(log.old_values->>'status', 'unknown')), '_', ' '),
        replace(initcap(coalesce(log.new_values->>'status', 'unknown')), '_', ' ')
      )
      when log.action = 'deleted' then 'Appointment deleted'
      when log.old_values->>'driver_name' is distinct from log.new_values->>'driver_name' then
        'Driver recorded as ' || coalesce(nullif(trim(log.new_values->>'driver_name'), ''), 'unknown')
      else 'Appointment details updated'
    end as summary,
    jsonb_strip_nulls(jsonb_build_object(
      'from_status', log.old_values->>'status',
      'to_status', log.new_values->>'status',
      'from_start_at', log.old_values->>'start_at',
      'to_start_at', log.new_values->>'start_at',
      'from_dock_id', log.old_values->>'dock_id',
      'to_dock_id', log.new_values->>'dock_id',
      'driver_name', log.new_values->>'driver_name',
      'checked_in_at', log.new_values->>'checked_in_at',
      -- Marked so the window can give a combine its own colour rather than the grey of an
      -- ordinary edit.
      'is_merge', case
        when log.new_values ? 'combined_from' then true
        when log.old_values->>'merged_into_appointment_id' is null
         and log.new_values->>'merged_into_appointment_id' is not null then true
      end,
      'combined_from', log.new_values->'combined_from',
      'is_check_in', case
        when log.old_values->>'checked_in_at' is null and log.new_values->>'checked_in_at' is not null then true
      end,
      'changed_fields', case when log.action in ('updated', 'status_changed') and not (log.new_values ? 'combined_from') then to_jsonb(array_remove(array[
        case when log.old_values->>'checked_in_at' is distinct from log.new_values->>'checked_in_at' then 'Check-in' end,
        case when log.old_values->>'driver_name' is distinct from log.new_values->>'driver_name' then 'Driver' end,
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
$function$
```

**What was verified after applying the change.** Both kept the identity they had: still
`SECURITY DEFINER`, still `STABLE`, same `search_path` on each (`public` for the token, empty
for the history), same return types, and `EXECUTE` still granted to exactly `authenticated,
postgres, service_role` and not to `anon`. The behaviour was then driven against a real
cross-site load — `MXD-2026-000019`, hosted at Guelph and booked from Mississauga — as three
different signed-in people, inside transactions that were rolled back:

| Who | Access | History | Check-in code |
|---|---|---|---|
| A coordinator at Mississauga only | requesting end, **not** the host site | 2 rows | issued |
| A shipping manager at neither site | neither end | refused | refused |
| A customer | neither end, no `audit.view` | refused | refused |

"Before" is not inferred. The baseline gate was rebuilt in a temporary schema — the live functions
untouched — and both were run for the same three people in the same transaction:

| Who | Before | After |
|---|---|---|
| A coordinator at Mississauga only | refused | 2 rows |
| A shipping manager at neither site | refused | refused |
| A customer | refused | refused |

The first row is the fix. The other two are the point of checking: opening the requesting end must
not open the door to everybody, and it did not.

**How much this covers.** 113 appointments become readable to 3 members of staff who could see
them on a board and not open them — 125 person-and-load pairs in all. That is today's data; the
proportion is what matters, and it is the 27% of loads that run between two Max Solutions sites.

**What was deliberately left alone.** `lookup_appointment_by_reference` — the Receiving
search — still asks only about the host site. Receiving a truck is an action at the dock the
truck is backing onto, and widening that would let one site check in a load at another site's
door. That is a write path and a different decision from reading the history of a load you are
a party to. It is named here so a future reader knows it was considered rather than missed.

### 5b-iii. A load's paperwork — and a customer isolation fault found on the way

Extending the read to both ends of a lane meant looking at the row policies on
`appointment_documents`, and they had an older problem in them. Both read:

```
has_location_access(location_id) and (has_permission('appointment.view') or has_permission('appointment.view_own'))
```

**`view_own` was doing no scoping.** It is the customer permission, and a customer account
carries `user_location_access` rows — one of them has five sites. So a customer could read every
document on every load at any site they were attached to, other companies' included, and attach
a document to any of those loads. This predates all of this work; it was found because the
either-end change would have carried it to a second site.

The two audiences are separated now instead of sharing one condition:

| Who | May read | May attach |
|---|---|---|
| Staff (`appointment.view`) | either end of the lane | the site holding the load, as before |
| A customer (`appointment.view_own`) | loads they created | loads they created |

`created_by = auth.uid()` is the same test `list_my_appointments` and
`list_my_appointment_activity` already use, so "my load" means one thing across the product. It
lives in `public.owns_appointment(uuid)`, next to `public.has_appointment_access(uuid)` — the
either-end test. Neither could be written as a subquery on `public.appointments` inside a policy:
**that table's own SELECT policy is one-ended too**, and the board only shows both ends because it
goes through a `SECURITY DEFINER` function. A subquery would have been blind for exactly the
people this is for.

**Verified with a real document, in transactions that were rolled back** — the live table still
holds zero rows, checked afterwards. A document was attached to `MXD-2026-000019` (hosted at
Guelph, booked from Mississauga) and to `MXD-2026-000288` (Markham, booked by nobody the customer
is):

| | Result |
|---|---|
| Coordinator at the requesting end only | sees it — this is the fix |
| Customer who did not book the load, but has access to that site | sees nothing |
| The same customer, under the **old** policy restored temporarily | **saw it** |

That last row is the fault, reproduced rather than argued.

**Reversing it.** The either-end half is undone by putting `public.has_appointment_access` out of
the `select` policy. **Do not restore the original policies**: they carry the isolation fault
above. If it ever has to go back, the safe reverse is the staff half narrowed to the host site
and the customer half left alone:

```sql
drop policy if exists appointment_documents_select on public.appointment_documents;
create policy appointment_documents_select on public.appointment_documents
for select
using (
  (public.has_permission('appointment.view') and public.has_location_access(location_id))
  or
  (public.has_permission('appointment.view_own') and public.owns_appointment(appointment_id))
);
```

### 5b-iv. The System Admin role, and the master admin

Until now the role editor refused to touch `system_admin` at all — both save functions raised
rather than write. The reasoning was sound and the remedy was too blunt: a company that took
Manage Users off the only role that can put it back would have no way into MaxDock, so nothing
could be changed. The owner wants the role editable, and the lockout guarantee kept.

What replaces the blanket refusal:

| | |
|---|---|
| Editable | every permission on `system_admin` except the two below, and every page except Users |
| Pinned | `user.view` and `user.manage` — between them these are the way back in |
| Pinned page | Users, which cannot be hidden from the rail for this role |
| Master admin | one account, flagged on `profiles.is_master_admin`, that cannot be demoted, deactivated or deleted |

`user.view` opens the Users screen and `user.manage` changes what is on it. Keep those two and a
System Admin can always walk back any other mistake through the interface. That is a much smaller
restriction than "nothing may change", and it is the whole of what the old guard was protecting.

The master admin is the second belt. The permissions above stop the *role* being stranded; the
master flag stops the last *person* being removed from it — a company with an editable role and
no System Admin left is locked out just as thoroughly.

| Migration | `master_admin_and_editable_system_admin` |
|---|---|
| Adds | `profiles.is_master_admin` boolean, nullable, default false |
| Changes | `save_role_permissions`, `save_role_page_visibility` — the `system_admin` refusal becomes a pinned-set check |
| Grants | nothing. No new permission, no new role |

| Function | MD5 of the definition | Characters |
|---|---|---|
| `save_role_permissions` | `0a111f654a458f01b4f655aecbda26f6` | 1604 |
| `save_role_page_visibility` | `9733737e45d1ba27cc4f127568605d03` | 1336 |

```sql
CREATE OR REPLACE FUNCTION public.save_role_permissions(p_role_code text, p_permission_codes text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_codes text[] := coalesce(p_permission_codes, '{}'::text[]);
  v_unknown text;
begin
  if auth.uid() is null then raise exception 'You must be signed in to change role access.'; end if;
  if not public.is_system_admin() then
    raise exception 'Only a System Admin can change what a role may do.';
  end if;
  if p_role_code = 'system_admin' then
    raise exception 'A System Admin holds every permission. That cannot be changed, or a company could lock itself out of MaxDock.';
  end if;
  if not exists (select 1 from public.roles r where r.code = p_role_code) then
    raise exception 'There is no role called %.', p_role_code;
  end if;

  -- A permission that does not exist would sit in the table doing nothing and read on
  -- screen as though it granted something.
  select string_agg(code, ', ') into v_unknown
    from unnest(v_codes) as code
   where code not in (select p.code from public.permissions p);
  if v_unknown is not null then
    raise exception 'MaxDock has no permission called %.', v_unknown;
  end if;

  delete from public.role_permissions rp
   where rp.role_code = p_role_code
     and not (rp.permission_code = any(v_codes));

  insert into public.role_permissions (role_code, permission_code)
  select p_role_code, code from unnest(v_codes) as code
  on conflict (role_code, permission_code) do nothing;

  return coalesce(array_length(v_codes, 1), 0);
end;
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.save_role_page_visibility(p_role_code text, p_hidden_page_codes text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_hidden text[] := coalesce(p_hidden_page_codes, '{}'::text[]);
begin
  if auth.uid() is null then raise exception 'You must be signed in to change MaxDock navigation.'; end if;
  if not public.is_system_admin() then
    raise exception 'Only a System Admin can change what a role sees.';
  end if;
  if p_role_code = 'system_admin' then
    raise exception 'A System Admin sees every screen. That cannot be changed, or a company could lock itself out of Settings.';
  end if;
  if not exists (select 1 from public.roles r where r.code = p_role_code) then
    raise exception 'There is no role called %.', p_role_code;
  end if;

  delete from public.role_visible_pages v
   where v.role_code = p_role_code
     and not (v.page_code = any(v_hidden));

  insert into public.role_visible_pages (role_code, page_code, is_visible, updated_by)
  select p_role_code, code, false, auth.uid()
    from unnest(v_hidden) as code
   where code is not null and code <> ''
  on conflict (role_code, page_code)
    do update set is_visible = false, updated_by = auth.uid(), updated_at = now();

  return array_length(v_hidden, 1);
end;
$function$
```

**Reversing it.** Run both blocks above to put the refusal back, then, if you also want the column
gone:

```sql
alter table public.profiles drop column if exists is_master_admin;
```

Dropping the column loses only which account was marked master. It is one boolean and no other
table refers to it. **Restore the two functions before dropping the column**, or the running
functions will reference a column that is gone.

### 5c. Functions that were NOT changed

Recorded so a future reader does not go looking. These were examined and deliberately left alone:

- `prepare_appointment_record` — the trigger that stamps `completed_at` and `cancelled_at`. It was
  the obvious place to stamp the new times too, and it was not used, because it clears a timestamp
  when the status leaves the matching state. That is right for `completed_at` and wrong for a
  service clock, which must survive the move from `in_progress` to `completed` or the duration it
  exists to measure is erased at the moment it becomes meaningful.
- `check_in_appointment`, `settle_due_appointments`, `merge_appointments`,
  `protect_active_dock_compatibility` — none of them set a status to `in_progress`. That was
  checked against the live catalogue rather than assumed, so extending the two functions in 5b
  covers every path that can start service.

---

## 6. Layer 3 — The toggles

Both new actions ship **off**. With them off the system behaves exactly as it did at the baseline
commit: the same buttons, the same statuses, the same screens.

| Setting | Location | Restores baseline behaviour when |
|---|---|---|
| **Record when work starts** | Settings → Timing, per location | Off |
| **Record when the truck leaves** | Settings → Timing, per location | Off |

Both columns are nullable and read as off when unset, so a location that has never been touched is
already in the baseline state.

---

## 7. Files added by this work

Every one is new. Deleting all of them, plus reverting the edits to existing files, returns the
tree to the baseline — but in practice use Section 4, which does it in one command and cannot miss
anything.

- `docs/ROLLBACK.md` (this file)
- `scripts/verify-lifecycle-clock.mjs`
- `scripts/verify-rollback-doc.mjs`
- `scripts/verify-tap-targets.mjs`
- `scripts/verify-chrome-stability.mjs`

No verifier script covers the either-end change, and that is deliberate rather than an omission.
Every other change in this document has a repo file a build can read; that one lives entirely in
two function bodies in the database, and a script in this tree can prove nothing about it. It was
checked in the database instead, against the baseline gate rebuilt in a temporary schema so the
live functions were never disturbed — see the table in Section 5b-ii. What the build *does* hold
is the hash of the one-ended definitions this file would restore, which is the part a rollback
depends on.

Existing files edited: `assets/maxdock.css`, `js/db.js`, `js/pages/queue.js`, `js/pages/board.js`,
`js/pages/receiving.js`, `js/pages/settings.js`, `js/ui/appointment-details.js`,
`js/pages/my-appointments.js`, and the three workflow files under `.github/workflows/`.

---

## 8. The procedure, numbered

Follow these in order. Stop as soon as the system is back to how you want it — most of the time
that is after step 3.

### If you only want the new actions to stop appearing

1. Open MaxDock and sign in as an administrator.
2. Go to **Settings → Timing**, and pick the location from the location selector at the top.
3. Switch **Record when work starts** and **Record when the truck leaves** to off, then press
   **Save changes**.
4. Repeat steps 2 and 3 for every other location you turned them on for.

That is a complete rollback of behaviour. The screens now look and work exactly as they did before
this change. Nothing else is required, and the times already recorded are kept in case you want the
feature back later.

### If you also want the code gone

5. Open the pull request on GitHub.
6. Press **Close pull request**. Do not press Merge.
7. On the branch page, delete the branch `claude/maxdock-handoff-setup-h7d5nu`.

Production was never publishing this work, so nothing about the live site changes at any of these
steps. The Stage 4 preview stops showing the new work once the branch is gone or reset.

### If you also want the database columns gone

**Only do this if you are sure you do not want the recorded times.** Dropping the columns deletes
them permanently.

8. Sign in to Supabase and open project `rywzqepzramurbrpmept`.
9. Open the **SQL Editor** from the left-hand menu and press **New query**.
10. Copy the whole block from [Section 5b](#5b-the-two-rpcs-restored-word-for-word) — both
    `CREATE OR REPLACE FUNCTION` statements — paste it in, and press **Run**. Wait for "Success".
11. Press **New query** again, copy both blocks from Section 5b-ii — the two access RPCs — paste
    them in, and press **Run**. This is what puts `get_appointment_history` and
    `get_appointment_check_in_token` back to asking about the host site only. Skip this step if
    you are happy for a coordinator to keep seeing loads booked from their own site; it is
    independent of everything else here and there is no column or data behind it.
12. Press **New query** again, copy the block from
    [Section 5a](#5a-the-down-migration-exactly-as-it-should-be-run), paste it in, and press
    **Run**. Wait for "Success".
13. Confirm it worked by running the check in Section 9.

---

## 9. Confirming the rollback actually restored today's state

Run this in the Supabase SQL editor. Every row should say `restored`.

```sql
select 'appointments columns' as what,
       case when count(*) = 0 then 'restored' else 'STILL PRESENT' end as state
from information_schema.columns
where table_schema = 'public' and table_name = 'appointments'
  and column_name in ('service_started_at', 'departed_at')
union all
select 'location_settings columns',
       case when count(*) = 0 then 'restored' else 'STILL PRESENT' end
from information_schema.columns
where table_schema = 'public' and table_name = 'location_settings'
  and column_name in ('track_service_start', 'track_departure')
union all
select 'receive_appointment',
       case when count(*) = 1 then 'restored' else 'CHECK IT' end
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'receive_appointment'
  and pg_get_functiondef(p.oid) not ilike '%departed%'
union all
select 'change_appointment_status',
       case when count(*) = 1 then 'restored' else 'CHECK IT' end
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'change_appointment_status'
  and pg_get_functiondef(p.oid) not ilike '%departed%';
```

Then open the live site at `https://maxsolutionsmiss.github.io/MaxDock/`, sign in, and check the
dock board, the operations queue and the receiving screen still load and still show today's loads.
Production was never changed, so this is a confirmation rather than a repair.

---

## 5b-v. The truck-change RPC, restored word for word

`set_appointment_truck_type` is what the combine dialog calls when a merged run will not fit
and the answer is a bigger truck. Two of its refusals were dead ends rather than answers:

| Refusal | What it did | What it does now |
|---|---|---|
| The dock does not accept that truck type | stopped | looks for a door at the same site that does accept it and is free for the window, moves the load there, and says which |
| The longer window clashes, or runs past closing | stopped | retries on the window the booking already has, and only refuses if that clashes too |

The second is the owner's rule: a combined run a few skids over should keep its slot rather than
be pushed longer. Keeping the existing window is the safe half of that — nothing else at the
door is displaced and nothing runs past closing, because the window does not grow.

| Function | MD5 of the definition | Characters |
|---|---|---|
| `set_appointment_truck_type` | `d5270119fcc62e96e92caac64034a5fb` | 5385 |

**A bug found while testing this, older than any of it.** The closing-time check in the saved
definition below reads `public.location_hours`. That table does not exist; it is
`public.location_operating_hours`. In plpgsql a missing relation raises when the line runs, not
when the function is created, so it sat there through every review until an appointment reached
it — and the screenshot that prompted this work never did, because the dock refusal fires four
checks earlier.

Two consequences, both live until now: any truck change on a booking whose dock already accepted
the bigger truck failed with a raw `relation "public.location_hours" does not exist` instead of
working or saying why not; and the rule that line exists to enforce, that a longer truck must
still finish by closing, was not being enforced at all. The table name is corrected in the
migration `truck_change_closing_check_reads_the_real_table`.

**If you restore the block below you restore that bug with it.** That is what the block is for —
it is the definition as it actually was, not as it should have been — but it is worth knowing
before running it. To keep the fix and drop only the two new behaviours, change
`public.location_hours` to `public.location_operating_hours` and `lh.` to `loh.` in the restored
copy before running it.

To restore the refusals, run the block below. Nothing else has to be undone: no column changed
and no permission was granted.

```sql
CREATE OR REPLACE FUNCTION public.set_appointment_truck_type(p_appointment_id uuid, p_truck_type_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_appointment public.appointments%rowtype;
  v_timezone text;
  v_capacity integer;
  v_duration integer;
  v_end_at timestamptz;
  v_close_time time;
  v_close_at timestamptz;
  v_clash text;
begin
  if auth.uid() is null then raise exception 'You must be signed in to change a truck.'; end if;

  select * into v_appointment from public.appointments a where a.id = p_appointment_id for update;
  if not found then raise exception 'Appointment not found.'; end if;

  -- The same permission that merges loads, because this exists to serve merging and a
  -- coordinator who may cancel one load onto another may certainly change its trailer.
  if not (public.has_location_access(v_appointment.location_id)
          and public.has_permission('appointment.create')) then
    raise exception 'You do not have permission to change the truck on this appointment.';
  end if;
  if v_appointment.entry_kind <> 'appointment' then
    raise exception 'Dock blocks do not have a truck.';
  end if;
  if v_appointment.status in ('completed', 'cancelled', 'no_show') then
    raise exception 'A completed, cancelled or no-show appointment cannot change truck.';
  end if;
  if v_appointment.merged_into_appointment_id is not null then
    raise exception 'This load has already been combined onto another truck.';
  end if;
  if v_appointment.truck_type_code = p_truck_type_code then
    return jsonb_build_object('id', v_appointment.id, 'truck_type_code', p_truck_type_code, 'changed', false);
  end if;

  -- Enabled at this site, and with a capacity entered — a truck type whose capacity is
  -- unknown is not something to move a load onto in the name of making it fit.
  select ltt.skid_capacity into v_capacity
  from public.location_truck_types ltt
  where ltt.location_id = v_appointment.location_id
    and ltt.truck_type_code = p_truck_type_code
    and ltt.is_active;
  if not found then
    raise exception 'That truck type is not enabled at this location.';
  end if;
  if coalesce(v_capacity, 0) <= 0 then
    raise exception 'That truck type has no skid capacity set for this location.';
  end if;
  if v_appointment.skid_count > v_capacity then
    raise exception 'This load carries % skids and that truck holds %.', v_appointment.skid_count, v_capacity;
  end if;

  -- The door has to take it. A 53 ft trailer at a dock configured for straight trucks is a
  -- truck that arrives and cannot back in.
  if v_appointment.dock_id is not null
     and not exists (
       select 1 from public.dock_truck_types dtt
       where dtt.dock_id = v_appointment.dock_id and dtt.truck_type_code = p_truck_type_code
     ) then
    raise exception 'The dock this load is booked at does not accept that truck type.';
  end if;

  select l.timezone into v_timezone from public.locations l where l.id = v_appointment.location_id;

  -- The window, worked out by the same function every booking uses, so an upgraded truck
  -- gets exactly the window it would have had if it had been booked this way.
  v_duration := public.calculate_appointment_duration_internal(
    v_appointment.location_id,
    v_appointment.appointment_type_code,
    p_truck_type_code,
    v_appointment.skid_count,
    v_appointment.handling_type_code,
    coalesce(v_appointment.is_priority, false)
  );
  v_end_at := v_appointment.start_at + make_interval(mins => v_duration);

  -- Nothing else may be standing at that door while this one is.
  select string_agg(other.booking_reference, ', ') into v_clash
  from public.appointments other
  where other.dock_id = v_appointment.dock_id
    and other.id <> v_appointment.id
    and other.status not in ('cancelled', 'no_show')
    and other.merged_into_appointment_id is null
    and tstzrange(other.start_at, other.end_at, '[)') && tstzrange(v_appointment.start_at, v_end_at, '[)');
  if v_clash is not null then
    raise exception 'A % needs % minutes at that dock and would run into %.', p_truck_type_code, v_duration, v_clash;
  end if;

  -- And it has to be finished by closing, unless this booking was already an approved
  -- after-hours one — in which case the exception it was granted still stands.
  if not coalesce(v_appointment.is_after_hours_override, false) then
    select lh.close_time into v_close_time
    from public.location_hours lh
    where lh.location_id = v_appointment.location_id
      and lh.day_of_week = extract(dow from (v_appointment.start_at at time zone v_timezone))::smallint
      and lh.is_open;
    if v_close_time is not null then
      v_close_at := ((v_appointment.start_at at time zone v_timezone)::date + v_close_time) at time zone v_timezone;
      if v_end_at > v_close_at then
        raise exception 'A % needs % minutes and would run past closing.', p_truck_type_code, v_duration;
      end if;
    end if;
  end if;

  update public.appointments
  set truck_type_code = p_truck_type_code,
      end_at = v_end_at,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_appointment_id;

  return jsonb_build_object(
    'id', v_appointment.id,
    'truck_type_code', p_truck_type_code,
    'skid_capacity', v_capacity,
    'duration_minutes', v_duration,
    'changed', true
  );
end;
$function$
```

---

## 5b-vi. The wrong-location lookup — a new function, and why it has no saved definition

This one is different from every other entry above, and the difference is the whole reason it is
safe: **there is nothing to restore.** `lookup_appointment_site_by_check_in_token` did not exist at
the baseline commit, so `pg_get_functiondef` has no output to pin and no MD5 to hash. Reversing it
is one statement, and after that statement the database is byte-for-byte what it was.

```sql
-- Reverse of migration: lookup_appointment_site_by_check_in_token
-- The function is new. Dropping it restores the baseline exactly.
-- Nothing else references it: it is called from one place in js/pages/receiving.js and by
-- no other function, no trigger, no view, no policy.
drop function if exists public.lookup_appointment_site_by_check_in_token(uuid);
```

Safe to run more than once. Safe to run while the branch code is still deployed — the caller is
wrapped so that a missing function reads as "no answer", and the app falls back to the message it
showed before this work ("that code does not match an appointment at a location you can receive
for"). Nothing breaks; the screen just stops naming the site.

### What it does, and the one line that makes it unusual

A receiver at Mississauga scans the QR on a load that was booked into Guelph. Until now both
lookups ended at `public.has_location_access(a.location_id)`, so the row was invisible and the
screen said the code did not match an appointment — which is true, unhelpful, and reads to the
person holding the phone like a broken scanner. The owner asked for the real sentence: *you are at
the wrong location, this load belongs to Guelph.*

To say **Guelph** the app has to learn one fact about a site the reader has no access to. So this
function deliberately **does not** call `has_location_access`, and that omission is the only thing
about it worth reviewing. Four things bound it:

1. **It returns two columns and no more** — the booking reference and the site name. No company,
   no carrier, no skid count, no PO/BOL, no times, no dock, no driver, not even the appointment
   id. Nothing a competitor could want and nothing that identifies a customer.
2. **The reference is already in the reader's hand.** The only way to call it is with the
   36-character `check_in_token` off the QR code, which means possession of the physical
   paperwork. It is not searchable and not guessable; there is no by-reference twin of this
   function, and there deliberately never will be, because a partial booking number is a search
   across every site rather than proof you are holding the load.
3. **The permission gate is unchanged.** Same three checks as its siblings, in the same order:
   signed in, profile active, holds `appointment.check_in`. That permission is held by
   `coordinator`, `shipping_manager`, `site_admin` and `system_admin` and by no external role —
   checked against `public.role_permissions` rather than assumed. No customer and no vendor can
   reach it at all.
4. **It is `STABLE`.** It cannot write anything, in any circumstance, including through a
   mistake.

The worst case, stated plainly so nobody has to reconstruct it: a Max Solutions shipping employee
who is holding a printed load for a site they do not cover can learn the name of that site. That is
the sentence the feature exists to print.

### The forward migration, for reference

```sql
create or replace function public.lookup_appointment_site_by_check_in_token(p_token uuid)
returns table(booking_reference text, location_name text)
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'You must be signed in to receive a truck.'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active) then
    raise exception 'This MaxDock account is inactive.';
  end if;
  if not public.has_permission('appointment.check_in') then
    raise exception 'You do not have permission to receive trucks.';
  end if;

  -- No has_location_access here, and that is the point of the function. See the four bounds
  -- above: two columns, possession of the token required, staff-only permission, read-only.
  return query
  select a.booking_reference, l.name::text
  from public.appointments a
  join public.locations l on l.id = a.location_id
  where a.check_in_token = p_token
    and a.entry_kind = 'appointment'
  limit 1;
end;
$function$;

revoke all on function public.lookup_appointment_site_by_check_in_token(uuid) from public, anon;
grant execute on function public.lookup_appointment_site_by_check_in_token(uuid) to authenticated;
```

### The second half of the feature touches no database at all

A receiver who covers both Mississauga and Guelph gets the Guelph load back from the existing
lookup, correctly, and is still standing at the wrong door. That case is caught in the browser by
comparing the load's `location_id` against the site in the top bar, which the page already holds.
It needs no function, no column and no grant, so rolling back the SQL above leaves that half
working on its own.

---

## 5b-vii. Closing the anonymous surface — eleven revokes and three pinned search paths

Found by the pre-release audit (`docs/PRE_RELEASE_AUDIT.md` §1.3 and §1.4). This entry is
different from the others again: **no function body changes.** Only who may call them, and where
three of them look up the names they use. The definitions are untouched, so there is nothing to
restore word for word and no checksum to pin.

### What was wrong

Of 89 functions in `public`, 83 are `SECURITY DEFINER`. Eleven were also granted to `anon` — the
unauthenticated role whose key is published in the page source — so they answered at
`/rest/v1/rpc/<name>` to anyone on the internet.

Each was read rather than counted. **Nothing could be written anonymously.** The three that write
all raise before touching a row: `save_role_permissions` checks `auth.uid()` then
`is_system_admin()`, `save_role_page_visibility` checks it is signed in, and
`set_appointment_truck_type` checks signed-in plus permission. `protect_master_admin` is a trigger
function and cannot run outside a trigger at all.

What was real is five read helpers with no auth check of their own — `owns_appointment` and
`has_appointment_access`, which confirm whether an appointment id exists, and
`location_day_caps_internal`, `location_shift_hours_internal` and `select_policy_dock_internal`,
which return a site's day caps, its shift hours and its dock selection policy. Three of those are
named `_internal`, which is the whole argument: they were never meant to be a public API.

None of it is customer data. It is a surface nobody intended, and it is the first thing an
enterprise security review will ask about.

### The reverse

Sixteen functions carried the grant, not the eleven the advisor named. The advisor lists only
`SECURITY DEFINER` ones; the other five are trigger helpers that were handed the same grant by
the same default and have no business answering a web request either. All sixteen are revoked and
all sixteen are restored here, so this block and the change match exactly.

```sql
-- Reverse of migration: revoke_anon_execute_and_pin_search_paths
-- Restores the grants exactly as they were. Run only if something turns out to have
-- depended on anonymous access, which nothing in MaxDock does: every one of these is
-- called by the browser as `authenticated`, or by a trigger, which does not consult
-- EXECUTE at all — Postgres checks that when the trigger is created, not when it fires.
grant execute on function public.get_master_admin_id() to anon;
grant execute on function public.has_appointment_access(p_appointment_id uuid) to anon;
grant execute on function public.list_role_page_visibility() to anon;
grant execute on function public.location_day_caps_internal(p_location_id uuid, p_date date) to anon;
grant execute on function public.location_shift_hours_internal(p_location_id uuid, p_date date) to anon;
grant execute on function public.owns_appointment(p_appointment_id uuid) to anon;
grant execute on function public.protect_master_admin() to anon;
grant execute on function public.save_role_page_visibility(p_role_code text, p_hidden_page_codes text[]) to anon;
grant execute on function public.save_role_permissions(p_role_code text, p_permission_codes text[]) to anon;
grant execute on function public.select_policy_dock_internal(p_location_id uuid, p_truck_type_code text, p_start_at timestamptz, p_end_at timestamptz, p_exclude_appointment_id uuid, p_direction text) to anon;
grant execute on function public.set_appointment_truck_type(p_appointment_id uuid, p_truck_type_code text) to anon;
-- The five trigger helpers, restored with the rest.
grant execute on function public.enforce_appointment_dock_compatibility() to anon;
grant execute on function public.protect_active_dock_compatibility() to anon;
grant execute on function public.set_updated_at() to anon;
grant execute on function public.easter_sunday_internal(p_year integer) to anon;
grant execute on function public.nth_weekday_internal(p_year integer, p_month integer, p_dow integer, p_n integer) to anon;

-- And the three search paths back to inherited. These are the statutory-holiday
-- calculators; every other function in MaxDock already pins search_path to ''.
alter function public.nth_weekday_internal(p_year integer, p_month integer, p_dow integer, p_n integer) reset search_path;
alter function public.easter_sunday_internal(p_year integer) reset search_path;
alter function public.statutory_holidays(p_country text, p_year integer) reset search_path;
```

The argument lists above were taken from `pg_get_function_identity_arguments` against the live
catalogue immediately before the change, not written from memory. If a signature has moved since,
take the current one the same way; the `revoke`/`grant` pair only ever names a function, it never
rewrites one.

### Why leaving it in place is safe

- **No definition changed.** Every function body is byte-for-byte what it was.
- **Nothing in MaxDock calls these anonymously.** The browser holds a session for every screen
  that reaches any of them; the sign-in page itself calls none of them.
- **The three pinned search paths cannot change behaviour**, because all three already qualify
  every object they touch. Pinning turns an inherited lookup into a fixed one; a function that
  never relied on the lookup cannot notice.
- **Reversing is a grant, not a migration.** No table, no column, no data.

### It took two migrations, and the second one is the one that mattered

The first migration revoked `EXECUTE` from `anon` on all sixteen and the advisor still reported
four functions reachable anonymously. That was not a stale reading. Nine of these functions carry
an explicit grant to **`PUBLIC`** as well, and `anon` is a member of `PUBLIC`, so removing the
direct grant changed nothing for them.

This is worth writing down because it is the trap in the whole exercise: `revoke … from anon`
reads like it closes the door and does not, whenever a `PUBLIC` grant is sitting behind it. The
check that tells the truth counts both, `a.grantee = 0` being `PUBLIC`:

```sql
select count(*)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
left join pg_roles r on r.oid = a.grantee
where n.nspname = 'public' and a.privilege_type = 'EXECUTE'
  and (r.rolname = 'anon' or a.grantee = 0);
```

It returned 16 before, 9 after the first migration, and 0 after the second. Note the
`coalesce(…, acldefault(…))`: a function whose `proacl` is null is not ungranted, it is on
Postgres defaults, which are `EXECUTE TO PUBLIC`. A query reading `proacl` alone reports such a
function as reachable by nobody when it is reachable by everybody.

To reverse the second migration:

```sql
-- Reverse of migration: revoke_public_execute_on_internal_helpers
grant execute on function public.location_day_caps_internal(p_location_id uuid, p_date date) to public;
grant execute on function public.location_shift_hours_internal(p_location_id uuid, p_date date) to public;
grant execute on function public.protect_master_admin() to public;
grant execute on function public.select_policy_dock_internal(p_location_id uuid, p_truck_type_code text, p_start_at timestamptz, p_end_at timestamptz, p_exclude_appointment_id uuid, p_direction text) to public;
grant execute on function public.easter_sunday_internal(p_year integer) to public;
grant execute on function public.nth_weekday_internal(p_year integer, p_month integer, p_dow integer, p_n integer) to public;
grant execute on function public.enforce_appointment_dock_compatibility() to public;
grant execute on function public.protect_active_dock_compatibility() to public;
grant execute on function public.set_updated_at() to public;
```

`authenticated`, `postgres` and `service_role` hold their own explicit grants on all nine and
were never touched, which is why nothing in the application noticed.

### Still outstanding, and it is not a migration

**Leaked-password protection is still off.** It checks a new password against Have I Been Pwned
and it is a dashboard toggle in Supabase Auth — *Authentication → Policies → Password security* —
which cannot be reached from a migration or from any tool available to the build. Somebody with
Supabase access has to turn it on by hand.

It cannot lock anyone out. It applies only when a password is being set, and rejects only
passwords already known to be in a public breach corpus. Reversed by turning it back off.

### What was verified after the change

Counted against the live catalogue rather than assumed:

- **`anon` can now execute zero functions in `public`**, counting the `PUBLIC` grant as well as
  the direct one. Was sixteen. Supabase's own advisor agrees: `anon_security_definer_function_executable`
  went from 11 findings to 0, and `function_search_path_mutable` from 3 to 0.
- **`statutory_holidays('ca', 2026)` still returns 12 dates**, 1 January to 26 December. That
  call chains through both pinned helpers — Good Friday goes via `easter_sunday_internal`,
  Thanksgiving via `nth_weekday_internal` — so a pinned `search_path` breaking either one would
  have shown up as a missing date or an error, and did not.

---

## 5b-viii. The turnaround report — one new function and one new permission

From the pre-release audit §3.1, which is the finding with the largest gap between what MaxDock
already holds and what it shows. `checked_in_at`, `service_started_at`, `completed_at` and
`departed_at` are all recorded. Nothing reported on them: `avg_dwell_minutes` appeared once, as
one column in the middle of the two scorecard tables.

Turnaround is the headline metric of this product category. It is what a carrier negotiates
detention on and the number that proves the project paid for itself.

### The reverse

```sql
-- Reverse of migration: turnaround_report
begin;
drop function if exists public.get_turnaround_report(uuid, date, date);
delete from public.role_permissions where permission_code = 'reports.view_turnaround';
delete from public.permissions where code = 'reports.view_turnaround';
commit;
```

Safe to run more than once. The `delete` statements are named exactly and touch one permission
code that did not exist before this work, so they cannot remove anything that was there at the
baseline. Nothing else references either the function or the code: the function is called from
one place in `js/pages/reports.js`, and the permission is read by that same file and by the role
editor, both of which degrade to simply not offering the view.

### Why leaving it in place is safe

- **Additive only.** One function, one permission row, four role grants. No table, no column, no
  existing function, no data rewritten.
- **Nothing else changes shape.** The two scorecard RPCs keep `avg_dwell_minutes` exactly as they
  had it. This is a new reading of existing columns, not a move of an existing one.
- **It cannot write.** `STABLE`, like every other report function.
- **A role without the permission sees no difference.** The view is not offered and the RPC
  refuses, the same as the other seven per-view permissions already behave.

### What it counts, and the two decisions inside it

Both are the owner's rules, applied here rather than invented:

1. **A no-show or a rejected load contributes nothing to any average.** The owner's ruling was
   that neither should affect a scorecard, and a turnaround report is a scorecard. A truck that
   never arrived has no dwell time, and including it as a zero would drag every site's average
   down for a truck that was never at the door.
2. **Each leg is counted only where both of its ends were recorded.** The Start and Departed
   switches ship off and are turned on per site, so a site not recording work-start has no
   door-to-start leg. That leg reports as null and says "not recorded" rather than as zero, which
   would read as instantaneous.

The four legs, and what each one is:

| Leg | From | To | What it tells you |
|---|---|---|---|
| Waiting | booked start | checked in | early or late at the gate |
| At the door before work | checked in | work started | how long a truck sat after arriving |
| Working | work started | completed | the load itself |
| Leaving | completed | departed | how long a finished truck held the door |
| **Total turnaround** | checked in | departed, or completed | gate to gone |

Total falls back to `completed_at` when departure is not being recorded, so a site with the
switch off still gets a turnaround figure rather than nothing. The report says which it used.

---

## 5b-ix. Carrier — a third party type, not a sixth role

The owner asked for a carrier who can book its own time, in his words: *"the vendor is going to
be the carrier. That's the whole thing. The vendor could be the carrier... carriers can go book
time as well."*

The audit had proposed a new role. **Reading the schema first turned that into a much smaller
change, and a better one.** MaxDock already models an external party as one role — `customer` —
carrying an `external_party_type` of `Customer` or `Vendor`. The Users screen presents those as
two separate choices; underneath they are one role with one permission set. A carrier is a third
party of exactly the same kind: it signs in, books its own slot, sees and reschedules its own
loads, and sees nothing of anybody else's.

A sixth role would have duplicated the customer's five permissions exactly and given a future
administrator two places to keep in step. So this is a widened check constraint and one array in
the browser, and it inherits every guarantee the existing external party already has:

- **Customer isolation is untouched.** `customerShell` is derived from permissions, not from a
  role name (`js/session.js`), so a carrier gets the external shell with no rail, no site picker
  and no dock board without a line changing. The five permissions are the same five.
- **Every RPC behaves identically**, because the role code is identical. Nothing in the database
  branches on `Customer` against `Vendor` today, and nothing branches on `Carrier` either.
- **The scorecard already counts them.** A partner is `company_name` or `carrier_name`, so a
  carrier that books its own loads appears on the vendor scorecard with no reporting change.

### The reverse

```sql
-- Reverse of migration: carrier_as_external_party_type
-- Restores the constraint to the two values it allowed at the baseline. Run the update first
-- or the constraint will refuse to validate against any carrier account already created.
update public.profiles set external_party_type = 'Vendor'
 where external_party_type = 'Carrier';

alter table public.profiles drop constraint if exists profiles_external_party_type_check;
alter table public.profiles add constraint profiles_external_party_type_check
  check (external_party_type is null or external_party_type = any (array['Customer'::text, 'Vendor'::text]));
```

The `update` is deliberate and is the only lossy step in this entry: an account created as a
Carrier becomes a Vendor rather than being deleted. It keeps its sign-in, its bookings and its
history; only the word changes. Losing the distinction is the cost of the rollback, and it is a
far better cost than an orphaned account somebody cannot sign in to.

### Why leaving it in place is safe

Widening a check constraint cannot invalidate a row that already passed it. Every existing
profile is `NULL`, `Customer` or `Vendor`, all three of which still pass. No column, no table, no
function, no permission and no grant changed.

### The one function this touched, restored word for word

`admin_update_user` validated the party type against a two-item list and refused anything else,
so widening the check constraint alone would have produced an error at save time rather than a
carrier account. The list and its two messages are the whole change; nothing else in the body
moved.

| Function | MD5 of the definition | Characters |
|---|---|---|
| `admin_update_user` (7-argument overload) | `7ee98240f14fcbab42543de8708af455` | 3571 |

The four-argument overload of the same name does not mention party types at all and was not
touched. Captured from the live database with `pg_get_functiondef` before the change:

```sql
CREATE OR REPLACE FUNCTION public.admin_update_user(p_user_id uuid, p_full_name text, p_role_code text, p_is_active boolean, p_location_ids uuid[], p_external_party_type text, p_organization_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  else
    v_external_party_type := null;
    v_organization_name := null;
  end if;

  select coalesce(array_agg(distinct requested_id), array[]::uuid[])
  into v_location_ids
  from unnest(coalesce(p_location_ids, array[]::uuid[])) requested(requested_id)
  where requested_id is not null;

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
$function$
```

---

## 5c-i. Clearing the demo appointments (2026-08-03)

**This entry is different from every other one in this document: it describes a deletion that
cannot be undone from here.** It is recorded anyway, because the rule is that a change to the
live project gets written down, and because the next person needs to know why the board was
empty on a given date rather than wondering what broke.

### Why

The go-live audit (`docs/GO_LIVE_AUDIT.md` §1.1) found 732 appointments in the production
project, every one of them demo data generated during development. Left in place they would have
opened the dock board on invented trucks and computed every scorecard and on-time percentage from
freight that never moved. The owner asked for them to be cleared and will commission a fresh set
later.

### What was removed, and why it is more than the appointments

Deleting the appointments alone would have left their debris behind:

| Table | Rows | Why it goes too |
|---|---|---|
| `appointments` | 732 | the demo loads themselves |
| `appointment_audit_log` | 1,267 | no foreign key to `appointments`, so these would survive as history of loads that no longer exist |
| `user_notifications` (appointment-linked) | 411 | the foreign key is `SET NULL`, so these would stay in every user's bell pointing at nothing |
| `appointment_series` | 2 | the two demo repeat patterns |

`appointment_documents` was already empty, so the `CASCADE` on it had nothing to do.

**Nothing else was touched.** Locations, docks, truck types, operating hours, holidays, direction
windows, settings, shifts, roles, permissions and every user account are exactly as they were —
that is the configuration the product runs on, and it is real.

### What was run, described rather than pasted

One transaction, in this order: appointment-linked rows out of `user_notifications`, then the
whole of `appointment_audit_log`, then `appointment_series`, then `merged_into_appointment_id`
nulled across `appointments` so the final delete did not depend on the order rows happened to
come out in, then `appointments` itself.

**The SQL is deliberately not reproduced here as a runnable block.** This document's own guard
refuses destructive statements in the SQL it hands a reader, and it was right to refuse this one:
a record of something already done is still something somebody can copy and run, and this
particular text would empty the appointments table of a live system. Describing it costs nothing
and removes the hazard. The exact statement is in the migration history and in this session's
transcript if it is ever needed for forensics.

### Reversing it

**There is no SQL here that puts these rows back, and there deliberately is not one.** They were
invented; a document that pretended to restore them would be restoring a fiction. If they are
needed, the two real routes are Supabase point-in-time recovery, if the project's tier has it and
the window has not passed, or a fresh generated set, which is what the owner has asked for.

What this entry guarantees instead is that the deletion was **bounded**: four tables, named above,
all of them holding nothing but appointment activity. No configuration, no account and no
permission was in scope.

### The cleanup audited itself, which is worth knowing

After the transaction committed, `appointment_audit_log` held **1,467 rows** rather than none:
735 `updated` and 732 `deleted`. The audit trigger had faithfully recorded the cleanup — one row
for nulling each merge reference, one for each appointment removed.

That is the trigger doing its job and it was not a fault, but it leaves rows keyed to appointment
ids that no longer exist, which nothing can ever read: `get_appointment_history` is asked for one
appointment at a time. They were cleared in a second pass, which does not re-audit because the
audit table has no trigger of its own. Final state is zero.

**The general fact matters more than this instance.** Any bulk operation on appointments writes
one audit row per appointment, per statement. A bulk import of 500 loads writes 500 rows; a bulk
delete writes two per load. Worth knowing before the first large import, both for storage and
because the activity feed on a screen will show a wall of identical entries.

### Final counts, verified rather than assumed

| Cleared | | Kept, untouched | |
|---|---|---|---|
| appointments | 0 | locations | 12 |
| appointment_audit_log | 0 | docks | 34 |
| appointment_series | 0 | operating-hours rows | 84 |
| appointment-linked notifications | 0 | location settings | 12 |
| appointment documents | 0 | truck types | 5 |
| | | user accounts | 6 |
| | | role permissions | 121 |

Ten notifications remain and are correct: they are not appointment-linked and were never in
scope.

---

## 5d-i. Documents attached from My Appointments (2026-08-04)

Baseline SHA `9323f4c`. Project `rywzqepzramurbrpmept`.

### Why

Somebody books a load before the paperwork exists — the BOL is not cut, the packing list is
not signed — and there has been nowhere for them to put it afterwards. Documents worked only
from the dock board, which is the one screen an outside company cannot open, so a customer's
only route was to email the plant and hope it got attached.

The table policies were already written for this: both `appointment_documents_select` and
`appointment_documents_insert` carry an
`(has_permission('appointment.view_own') and owns_appointment(appointment_id))` branch. **The
storage policies were not.** All three ask only `has_location_access(foldername[1]::uuid)`,
and an outside company has access to no site, so every upload, read and delete was refused at
the bucket. The table was ready and the bucket was shut.

### What changed

1. A new function `public.owns_appointment_at(uuid, uuid)` — true when the signed-in account
   created that appointment *and* the appointment sits at that location. The location is part
   of it because the first path segment is what the bucket policies key on, so a path could
   otherwise be filed against a site the appointment does not belong to.
2. The three `storage.objects` policies for bucket `appointment-documents` gain an owner
   branch. Reading and deleting additionally require `owner = auth.uid()`, so an outside
   company reaches its own uploads and nothing else.
3. `appointment_documents_select` and `appointment_documents_delete` gain a matching
   own-uploads branch, and `appointment_documents_insert` now forces `uploaded_by` to be the
   caller on that branch so a row cannot be attributed to somebody else.
4. `appointment_documents.uploaded_by` gains `default auth.uid()`. It was nullable with no
   default and the client never set it, which meant the `uploaded_by = auth.uid()` branch of
   the delete policy had been dead since it was written — nobody but a system or site admin
   could remove a document, including the person who attached it.

**The owner decision this encodes:** an outside company sees only the documents it uploaded
itself. Staff continue to see everything on the load. That was chosen over showing them
everything so that an internal note or photo attached by the plant cannot reach a customer.
Widening it later is one predicate.

### The reverse

Run in the SQL editor. It restores all six policies to the definitions captured from the live
database at the baseline, word for word, and drops the one function this work created.

```sql
begin;

-- 1. storage policies, back to site-access only
drop policy if exists "appointment_documents_write" on storage.objects;
create policy "appointment_documents_write" on storage.objects for insert to public
  with check (((bucket_id = 'appointment-documents'::text) AND has_location_access(((storage.foldername(name))[1])::uuid)));

drop policy if exists "appointment_documents_read" on storage.objects;
create policy "appointment_documents_read" on storage.objects for select to public
  using (((bucket_id = 'appointment-documents'::text) AND has_location_access(((storage.foldername(name))[1])::uuid)));

drop policy if exists "appointment_documents_remove" on storage.objects;
create policy "appointment_documents_remove" on storage.objects for delete to public
  using (((bucket_id = 'appointment-documents'::text) AND has_location_access(((storage.foldername(name))[1])::uuid) AND ((owner = auth.uid()) OR (current_maxdock_role() = ANY (ARRAY['system_admin'::text, 'site_admin'::text])))));

-- 2. table policies, back to the baseline text
drop policy if exists "appointment_documents_select" on public.appointment_documents;
create policy "appointment_documents_select" on public.appointment_documents for select to public
  using (((has_permission('appointment.view'::text) AND (has_location_access(location_id) OR has_appointment_access(appointment_id))) OR (has_permission('appointment.view_own'::text) AND owns_appointment(appointment_id))));

drop policy if exists "appointment_documents_insert" on public.appointment_documents;
create policy "appointment_documents_insert" on public.appointment_documents for insert to public
  with check (((EXISTS ( SELECT 1
   FROM appointments a
  WHERE ((a.id = appointment_documents.appointment_id) AND (a.location_id = appointment_documents.location_id)))) AND ((has_permission('appointment.view'::text) AND has_location_access(location_id)) OR (has_permission('appointment.view_own'::text) AND owns_appointment(appointment_id)))));

drop policy if exists "appointment_documents_delete" on public.appointment_documents;
create policy "appointment_documents_delete" on public.appointment_documents for delete to public
  using ((has_location_access(location_id) AND ((uploaded_by = auth.uid()) OR (current_maxdock_role() = ANY (ARRAY['system_admin'::text, 'site_admin'::text])))));

-- 3. the column default, back to none
alter table public.appointment_documents alter column uploaded_by drop default;

-- 4. the function this work created
drop function if exists public.owns_appointment_at(uuid, uuid);

commit;
```

### Why leaving it in place is safe

Nothing here widens what staff can reach; every staff branch is the baseline text untouched.
The outside-company branches are all gated on `owns_appointment_at`, which resolves to
`created_by = auth.uid()` — the same predicate `list_my_appointments` already uses to decide
what appears on that page. A person can therefore attach a document to exactly the bookings
the page already shows them, and to nothing else.

The narrowing in `appointment_documents_select` is the one behaviour change that could
surprise: an account holding `appointment.view_own` but not `appointment.view` now sees only
rows it uploaded. No such account had a way to see any of them before this work, because the
bucket refused the read, so nothing that used to be visible stops being visible.

### The procedure, click by click

1. Open the Supabase dashboard and pick project `rywzqepzramurbrpmept`.
2. Confirm the site is on the release that carries this work; if it is not, stop, because the
   front end below is what calls these policies.
3. Go to **SQL Editor** and open a new query.
4. Paste the whole reverse block above, including `begin;` and `commit;`.
5. Run it. It should report success with no rows returned.
6. Go to **Authentication → Policies**, filter to `appointment_documents`, and check the three
   policies read as the baseline text above.
7. Go to **Storage → Policies**, choose the `appointment-documents` bucket, and check its three
   policies no longer mention `owns_appointment_at`.
8. Go to **Database → Functions** and confirm `owns_appointment_at` is gone.
9. In the app, open **My Appointments** as an outside company and confirm the Documents panel
   reports that documents cannot be read — that is the expected state once the bucket is shut.
10. Revert the front-end change by checking out `9323f4c` for `js/pages/my-appointments.js`,
    or by reverting the pull request that carried this work.

### What was verified after the change

Recorded once the migration had run, in the section below.

---

## 5e-i. Colleagues at one company see each other's loads (2026-08-05)

**Baseline commit:** `7fe5cc3`
**Functions changed:** one — `public.list_my_appointments()`
**Schema changed:** none. No column added, no table altered, no data migrated.

### What this changes and why it is one function

Two people at one outside company could not see each other's bookings, so they could not
combine them either — which is the single thing the combining feature exists for on the
customer side. `list_my_appointments` scoped on `created_by = auth.uid()`, so George saw
George's and Michael saw Michael's.

The obvious fix was a company key on the profile and on the appointment, set server-side. That
was designed and then abandoned, because the investigation found the key already exists and is
already safe:

- `profiles.organization_name` is the company an outside account belongs to.
- Its RLS is `profiles_update_system_admin` — `is_system_admin()` for both `USING` and
  `WITH CHECK`. There is no self-update policy on `profiles` at all.
- The only function that writes it is `admin_update_user`, and the overload that accepts
  `p_organization_name` guards on `is_system_admin`. The five-argument overload cannot change
  it: it reads the current value and passes it straight back.
- The only other writer is the `maxdock-invite-user` edge function, which refuses any caller
  whose profile is not `system_admin`.

So the company on a profile is administrator-set and cannot be altered by the person it
belongs to. That makes it safe to scope visibility on.

**What is deliberately not used:** `appointments.company_name`. It carries the same value in
practice — `js/pages/booking.js:119` pre-fills it from the booker's own
`profile.organization_name` — but it is an editable text input on the booking form
(`booking.js:420` and `:715`). Scoping on it would let any outside account type
"Kruger Packaging" into a booking and then read Kruger's schedule. It stays a label and stays
what the combine lane matches on; it is not what anything trusts.

### The exact predicate

Own rows always, plus rows created by anybody sharing a non-empty company, compared trimmed and
case-folded. An account with no company set behaves exactly as it did before this change, which
is why `McDermid` needed no migration.

### The reverse

Restores the definition captured verbatim below. Safe to run at any time: it narrows what is
visible rather than widening it, so it cannot expose anything.

```sql
begin;

CREATE OR REPLACE FUNCTION public.list_my_appointments()
 RETURNS TABLE(appointment_id uuid, booking_reference text, location_id uuid, location_name text, location_timezone text, start_at timestamp with time zone, end_at timestamp with time zone, direction text, appointment_type text, appointment_type_code text, truck_type text, truck_type_code text, skid_count integer, handling_type text, handling_type_code text, company_name text, carrier_name text, external_reference text, status text, created_at timestamp with time zone, cancellation_reason text, merged_into_reference text, combined_from_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null or not public.has_permission('appointment.view_own') then
    raise exception 'You must be signed in to view your appointments.';
  end if;

  return query
  select
    a.id,
    a.booking_reference,
    a.location_id,
    l.name,
    l.timezone,
    a.start_at,
    a.end_at,
    a.direction,
    at.name,
    a.appointment_type_code,
    tt.name,
    a.truck_type_code,
    a.skid_count,
    ht.name,
    a.handling_type_code,
    coalesce(a.company_name, a.requester_type),
    a.carrier_name,
    a.external_reference,
    a.status,
    a.created_at,
    a.cancellation_reason,
    kept.booking_reference,
    (select count(*) from public.appointments m where m.merged_into_appointment_id = a.id)::integer
  from public.appointments a
  join public.locations l on l.id = a.location_id
  left join public.appointment_types at on at.code = a.appointment_type_code
  left join public.truck_types tt on tt.code = a.truck_type_code
  left join public.handling_types ht on ht.code = a.handling_type_code
  left join public.appointments kept on kept.id = a.merged_into_appointment_id
  where a.entry_kind = 'appointment'
    and a.created_by = auth.uid()
  order by a.start_at desc;
end;
$function$;

commit;
```

### The procedure, click by click

1. Open the Supabase dashboard and pick project `rywzqepzramurbrpmept`.
2. Go to **SQL Editor** and open a new query.
3. Paste the whole reverse block above, including `begin;` and `commit;`.
4. Run it. It should report success with no rows returned.
5. Go to **Database → Functions**, open `list_my_appointments`, and confirm the `where` clause
   reads `and a.created_by = auth.uid()` with no company test after it.
6. Sign in as an outside account and open **My appointments**. It should list only bookings
   that account made itself.
7. No front-end revert is required. The application does not know how this function scopes;
   it renders whatever rows come back.

### What was verified after the change

Recorded once the migration had run, in the section below.

---

## 5f-i. The demo appointment set rebuilt (2026-08-14)

**Like §5c-i, this entry describes a deletion that cannot be undone from here.** It is written
down for the same reason: the rule is that a change to the live project gets recorded, and the
next person needs to know why the board holds what it holds on a given date.

### Why

The owner is presenting MaxDock to the team today and asked for the board to be repopulated:
every existing appointment cleared, and a fresh set covering two days behind and eight days
ahead. The set that was there had been generated on 3 August and ran 31 July to 14 August, so it
was already half in the past and ended on the morning of the demo.

Nothing here is real freight. It is a demonstration set, and §1.1 of `docs/GO_LIVE_AUDIT.md`
still applies: **this data must be cleared again before the product carries real bookings.**

### What was removed

The same four tables as §5c-i, for the same reasons set out there:

| Table | Rows before | Why it goes too |
|---|---|---|
| `appointments` | 332 | the previous demo set |
| `appointment_audit_log` | 493 | no foreign key to `appointments`, so these would outlive the loads |
| `user_notifications` (appointment-linked) | 424 | the foreign key is `SET NULL`, so these would point at nothing |
| `appointment_series` | 0 | none existed |

`appointment_documents` was empty. **No configuration was touched**: 12 locations, 34 docks, 5
truck types, the operating hours, the per-location settings, the truck ladders, the roles, the
permissions and all 8 accounts are exactly as they were.

**The delete is not reproduced here as a runnable block**, for the reason §5c-i gives at length:
this document's own guard refuses destructive SQL in the text it hands a reader, and it is right
to. The order was the same as §5c-i — appointment-linked notifications, then the audit log, then
`merged_into_appointment_id` nulled, then the appointments — and the audit trigger's self-record
was cleared in a second pass afterwards.

### How the new set was written, which is two different ways and the difference matters

**Forward-dated loads went through the product's own booking RPCs**, `book_appointment` and
`book_routed_appointment`, called with `request.jwt.claims` set to a real account so `auth.uid()`
resolves exactly as it does from a browser. Those loads therefore passed every check a person
booking would hit: permission, location access, operating hours, minimum notice, the booking
window, slot alignment, capacity projection, duration calculation and dock assignment. Statuses
above `scheduled` were then set through `change_appointment_status`. Nothing bypassed anything.

**Back-dated loads could not go that way, and this is by design rather than an obstacle.**
`book_appointment` refuses `p_date < today` — "Appointments cannot be created in the past" — and
`receive_appointment` stamps `checked_in_at`, `service_started_at` and `departed_at` with
`now()`. A load that arrived on Wednesday cannot be expressed through functions that can only
say "now", and the correct response is not to weaken them.

So the two historical days were written by a **temporary** function, `seed_demo_appointment`,
which existed only for the length of this rebuild and **was dropped immediately afterwards**. It
was deliberately not a free hand at the table: it took the same arguments, called the same
`calculate_appointment_duration` for its window, used the same dock-selection query including the
overlap exclusion, and wrote the same columns as `book_appointment`. What it added was the two
things the real path cannot express — a past date, and timestamps given rather than taken from
the clock.

**If that function is present in the database today, something went wrong and it should be
dropped.** It is meant to have a lifetime measured in minutes.

```sql
drop function if exists public.seed_demo_appointment(
  text, date, time, text, text, text, text, integer, text, boolean,
  text, text, text, text, text, text, text, uuid, integer, integer, integer
);
```

### Reversing it

**There is no SQL here that puts the previous set back, and deliberately is not.** Those rows
were invented too; restoring them would be restoring one fiction over another. The two real
routes are the same as §5c-i: Supabase point-in-time recovery if the tier has it and the window
has not passed, or a fresh generated set.

What this entry guarantees is the same bounded property §5c-i guarantees. Four tables, all of
them appointment activity. No configuration, no account, no permission, and no function beyond
the temporary one named above, which is gone.

### The audit trigger records this too

As §5c-i established: any bulk operation on appointments writes one audit row per appointment per
statement. The rebuild wrote new audit rows for every load it created, and the clear wrote two per
load removed before those were cleared in turn. Expect the activity feed on any one load to be
short and honest; expect the table itself to have churned.

### The procedure, click by click

1. Open the Supabase dashboard and pick project `rywzqepzramurbrpmept`.
2. Go to **SQL Editor** and open a new query.
3. Run `select count(*) from public.appointments;` and write the number down before anything else.
4. If `seed_demo_appointment` still exists, paste and run the `drop function` block above.
5. Go to **Database → Functions** and confirm it is gone.
6. To empty the board again, follow the order named above rather than deleting `appointments`
   first — the appointment-linked notifications and the audit rows do not cascade.
7. Re-run the count from step 3. It should read `0`.
8. No front-end change is involved at any point. The application renders whatever rows exist.

### What was verified after the change

**378 loads across 7 sites and 10 operating days**, Wed 12 August to Sat 22 August, Sunday
closed. The clear that preceded it took `appointments` 332 → 0, `appointment_audit_log` 493 → 0
and appointment-linked `user_notifications` 424 → 0, with configuration untouched: 12 locations,
34 docks, 5 truck types, 84 operating-hours rows, 8 accounts.

| Day | | Loads | Done | Working | At gate | Confirmed | Scheduled | No-show | Cancelled |
|---|---|---|---|---|---|---|---|---|---|
| 12 Aug | Wed | 41 | 35 | | | | | 5 | 1 |
| 13 Aug | Thu | 40 | 37 | | | | | 1 | 2 |
| 14 Aug | Fri | 56 | 31 | 2 | 3 | 7 | 8 | 5 | |
| 15 Aug | Sat | 14 | | | | 4 | 10 | | |
| 17 Aug | Mon | 40 | | | | 24 | 16 | | |
| 18 Aug | Tue | 41 | | | | 19 | 22 | | |
| 19 Aug | Wed | 44 | | | | 15 | 29 | | |
| 20 Aug | Thu | 42 | | | | 13 | 29 | | |
| 21 Aug | Fri | 43 | | | | 24 | 19 | | |
| 22 Aug | Sat | 17 | | | | 6 | 11 | | |

Truck mix 147 × 53 ft, 119 × 48 ft, 79 × 26 ft, 33 vans. 21 partner companies, 10 carriers, 18
priority runs, 4 Max-to-Max transfers each with its mirrored movement written at the far end.

**Integrity, all measured rather than assumed:**

| Check | Result |
|---|---|
| Loads starting or ending outside their site's operating hours | 0 |
| Two loads overlapping on one dock | 0 |
| Load on a dock whose direction contradicts its own | 0 |
| Duplicate PO / BOL references | 0 |
| Missing required field on any load | 0 |
| Completed load with no check-in, or no departure | 0 |
| Service recorded before arrival, or departure before service | 0 |

Two of those needed fixing rather than merely checking, and both are worth recording:

- **Thirteen loads sat on a Milton dock whose direction contradicted theirs.** This is not a
  seeding artefact — `book_appointment`'s dock query filters on truck compatibility and the
  overlap constraint but **not on `direction_mode`**, so it will legitimately put an outbound
  load on an inbound-only door. The board labels every dock lane with its direction, so it shows.
  All thirteen were reassigned through `update_appointment_details`, which is the RPC a
  coordinator would use. **The underlying behaviour is unchanged and is worth a look before real
  bookings** — Milton is currently the only site with direction-specific doors.
- **One load ran 45 minutes past a 16:30 close.** Moved to a legal window, also through
  `update_appointment_details`.

**Combining opportunities exist on every one of the ten days**, at Mississauga, Pickering, Milton
and Markham, sized against each site's own 53 ft capacity — 52 skids at Mississauga, 26 elsewhere.
Most sit between 81% and 96% of one trailer, which is the case worth showing. Several deliberately
exceed one trailer so the bigger-truck answer has something to answer. Mississauga has one on
every forward day but not on 14 August itself: its two trailer doors were already full by the
afternoon, and manufacturing a slot would have meant moving real bookings around to flatter a
demonstration.

**Not verified, and the reason:** the on-time percentage as the reports actually compute it. The
Supabase connection expired before that query ran. Measured strictly — arrival at or before the
booked minute — it is 59 on time against 44 late. The reports apply a fifteen-minute grace, which
by the generator's own distribution should land near 80%, but that figure is derived rather than
measured and should be read off the Vendor scorecard rather than trusted from here.

The temporary `seed_demo_appointment` function was dropped and its absence confirmed by querying
`pg_proc`.

---

## 5g-i. Operating hours differentiated, and one shutdown day (2026-08-14)

**This entry is configuration, not demo data, and that is the whole reason it needs writing down.**
Every clear so far — §5c-i, §5f-i — deliberately left locations, docks, hours and settings alone,
because that is the setup the product runs on. This change edits that setup. It will outlive the
next appointment clear and it is what the plants will be configured as unless somebody changes it.

### Why

Asked for during preparation for the 14 August demonstration. All twelve sites were running one of
only two schedules — Milton at 06:00-16:30 weekdays, every other site at 07:00-16:30 — and every
single one closed at 16:30. A product whose entire premise is coordinating twelve plants across
four time zones was showing an identical day column at every site.

**The values below are invented.** They are plausible for a folding-carton plant and nothing more.
The owner has said the real schedules will replace them. Until that happens, treat this section as
the record of a placeholder, not of a decision about how the plants actually run.

### The hours as they were, which is what the reverse restores

| Site | Mon-Fri | Sat | Sun |
|---|---|---|---|
| Milton | 06:00-16:30 | closed | closed |
| Burbank, Langley, Sturgis, Wilmington | 07:00-16:30 | closed | closed |
| Bristol, Concord, Guelph, Markham, Mississauga, Owen Sound, Pickering | 07:00-16:30 | 07:00-16:30 | closed |

### The hours as they now are

Only the seven demonstration sites changed. Burbank, Guelph, Langley, Sturgis and Wilmington were
not touched.

| Site | Mon-Thu | Fri | Sat |
|---|---|---|---|
| Mississauga | 05:00-23:00 | 05:00-23:00 | 07:00-15:00 |
| Pickering | 07:00-19:00 | 07:00-19:00 | 07:00-13:00 |
| Milton | 06:00-16:30 | 06:00-16:30 | closed |
| Markham | 07:00-16:30 | 07:00-16:30 | closed |
| Owen Sound | 07:30-16:00 | 07:30-12:30 | closed |
| Concord | 08:00-17:00 | 08:00-17:00 | closed |
| Bristol | 06:30-15:00 | 06:30-15:00 | closed |

**Narrowing hours strands loads that were already booked inside the old ones.** Four sites lost
their Saturday and three lost part of a weekday, so every appointment that fell outside the new
window was moved to a legal one through `update_appointment_details` — the same RPC a coordinator
uses. The count is recorded in the verification section below.

### The shutdown day

One row in `location_holidays`: **Owen Sound, 2026-08-20, "Plant shutdown (demo)"**, source
`manual`. It exists so the booking wizard can be shown refusing a closed day. It is configuration
in the same way the hours are.

### The reverse

```sql
begin;

update public.location_operating_hours oh
set is_open = true, open_time = '07:00', close_time = '16:30', updated_at = now()
from public.locations l
where l.id = oh.location_id
  and l.code in ('bristol','concord','markham','mississauga','owen_sound','pickering')
  and oh.day_of_week between 1 and 6;

update public.location_operating_hours oh
set is_open = false, open_time = null, close_time = null, updated_at = now()
from public.locations l
where l.id = oh.location_id
  and l.code in ('bristol','concord','markham','mississauga','owen_sound','pickering')
  and oh.day_of_week = 0;

delete from public.location_holidays
where name = 'Plant shutdown (demo)';

commit;
```

Milton is absent from both statements on purpose: its 06:00 start and closed Saturday were already
the baseline and were never changed.

### Why leaving it in place is safe

Hours only ever narrow or widen what MaxDock will accept a booking for. They gate nothing else: no
permission, no visibility, no report. The worst outcome of leaving these in place is that somebody
is told a site is open when it is not, which is a settings edit away and which the real schedules
will correct anyway.

**The appointments moved to fit the new hours are not restored by the reverse.** Putting the hours
back does not put a load back to the Saturday it was booked on, and it should not — an appointment
that has been rescheduled has a history saying so. If the original placement matters, it is in
`appointment_audit_log`.

### The procedure, click by click

1. Open the Supabase dashboard and pick project `rywzqepzramurbrpmept`.
2. Go to **SQL Editor** and open a new query.
3. Run `select l.code, oh.day_of_week, oh.is_open, oh.open_time, oh.close_time from
   public.location_operating_hours oh join public.locations l on l.id = oh.location_id order by 1, 2;`
   and keep the output. That is the state you are about to leave.
4. Paste the whole reverse block above, including `begin;` and `commit;`.
5. Run it. It should report success with no rows returned.
6. Re-run the query from step 3 and confirm all seven sites read `07:00-16:30` on days 1 to 6 and
   closed on day 0, and that Milton still reads `06:00-16:30` with Saturday closed.
7. Confirm `select count(*) from public.location_holidays;` returns the number it held before this
   work, which was **0**.
8. No front-end change is involved. Hours are read from the database on every booking.

The same thing can be done without SQL at all: **Settings, Hours** at each site, which is where the
values came from and where the real ones will go.

### What was verified after the change

**Eight distinct weekly schedules now exist across the twelve sites, where there were two.** The
seven demonstration sites each read differently; Burbank, Guelph, Langley, Sturgis and Wilmington
are untouched and still share the original pattern.

**53 appointments fell outside the new hours.** Four sites lost their Saturday and three lost part
of a weekday, which is what narrowing hours does to a schedule that was booked under the old ones.

- **41 live loads were moved** to a legal window through `update_appointment_details`, walking the
  new open hours at the site's own slot interval and only onto doors that accept the truck and
  face the right way.
- **12 were left exactly where they are, deliberately.** They are finished loads on 12, 13 and 14
  August — completed, no-show or cancelled. The hours changed today; they do not reach backwards
  and make last Wednesday untrue. A completed load records when a truck actually came, and
  rewriting that to satisfy a settings change made afterwards would be falsifying history to keep
  a query tidy.

The four Owen Sound trucks booked on what is now the 20 August shutdown day were moved off it, so
the day reads as closed rather than closed-with-trucks-on-it.

| Check | Result |
|---|---|
| Live loads outside their site's operating hours | 0 |
| Live loads on a shutdown day | 0 |
| Two loads overlapping on one dock | 0 |
| Load on a door whose direction contradicts its own | 0 |
| Duplicate PO / BOL across separate loads | 0 |

The one apparent duplicate is `PO-SUN-WK`, carried by all eleven occurrences of the Sun Chemical
weekly series. That is what a standing order looks like and it is not a fault.

**Combining opportunities survived the reshuffle** and still land on every day from 14 to 22
August at Mississauga, Pickering, Milton and Markham. Markham lost its two Saturday lanes, which
is correct — Markham is now closed on Saturday.

**One finding, and it is the same one as §5f-i rather than a new one.** A load created by
`create_appointment_series` also landed on a Milton door facing the wrong way. So the missing
`direction_mode` filter is not peculiar to `book_appointment` — it is in more than one caller, and
the fix belongs in the shared dock-picking logic rather than in each RPC separately.

---

## 5h-i. Every account but the owner's removed (2026-08-14)

**This is a deletion of a login, and there is no way back from it.** Recorded for the same reason
§5c-i and §5f-i are: the rule is that a change to the live project gets written down, and the next
person needs to know why there is exactly one account.

### Why

The owner had already removed every account through the Users screen except one, `demo.vendor`
(display name "Cutting Edge", organisation "McDermid"), which the screen would not delete. They
asked for it to be removed too, leaving only their own master System Admin account, and for
confirmation that nothing else can reach the system.

### Why the screen would not remove it, which is worth knowing

**Nothing in the database was blocking it.** Every reference to that account either clears itself
or nulls itself on delete: `appointments.created_by` and `updated_by` are `ON DELETE SET NULL`,
and `user_location_access`, `user_notifications`, `user_preferences`, `user_usage_daily`,
`booking_templates` and `appointment_series` all cascade. The six references that *would* block a
delete — `appointments.checked_in_by`, `appointment_documents.uploaded_by`,
`location_day_limits.created_by`, `location_labour_days.recorded_by`,
`dock_direction_windows.created_by` and `role_visible_pages.updated_by` — held **zero** rows for
this account, all six checked individually rather than assumed.

The `delete_user` branch of `maxdock-invite-user` refuses only one thing, deleting your own
account, and this was not that. So the refusal came from somewhere between the screen and the
deployed function rather than from any rule that was protecting anything. **That is left as an
open question rather than papered over** — see the task list. It matters because the next person
who cannot delete an account deserves a better answer than "try again".

### What was removed

One row from `auth.users`, which cascades to the `profiles` row. Everything else followed from the
foreign keys already in place:

| | |
|---|---|
| `auth.users` | 2 → 1 |
| `profiles` | 2 → 1 |
| `user_location_access` | 1 row gone |
| `user_notifications` | 10 rows gone |
| `user_preferences` | 3 rows gone |
| `user_usage_daily` | 15 rows gone |
| `appointments.created_by` nulled | 6 loads |
| `appointments.updated_by` nulled | 4 loads |

**The six appointments themselves were kept.** They are demonstration loads and they still read
correctly on the board; only the record of which account entered them is gone, which is the
honest outcome of deleting the account that entered them.

### Reversing it

**There is no SQL here that puts the account back, and deliberately is not.** An account is an
identity, not a row to be re-inserted: recreating one with the same name would be a different
login with a different id, and every appointment it used to own would stay detached from it. If
that account is ever wanted again it should be created fresh through **Users → Add user**, which
is the only path that sets up the identity, the temporary password and the audit trail together.

What this entry guarantees instead is the bound: one account, and the rows that cascade from it.
No location, no dock, no setting, no permission and no appointment was deleted.

### The procedure, click by click

1. Open the Supabase dashboard and pick project `rywzqepzramurbrpmept`.
2. Go to **Authentication → Users** and confirm exactly one account is listed.
3. Go to **SQL Editor** and run `select username, role_code, is_master_admin from public.profiles;`
   It should return one row, the owner's, with `is_master_admin` true.
4. To add anybody back, use **Users → Add user** inside MaxDock rather than the Supabase
   dashboard. Creating a bare auth user in Supabase leaves it with no MaxDock profile, no role and
   no site access, and it will sign in to a broken session.
5. Nothing needs reverting in the repository. No code changed.

### The deletion could not run until a real bug was fixed, and that is the important part

The first attempt failed:

```
ERROR: insert or update on table "appointment_audit_log" violates foreign key constraint
DETAIL: Key (changed_by)=(7eee3b30-…) is not present in table "users".
CONTEXT: PL/pgSQL function public.audit_appointment_change()
```

Read that carefully, because it is not about this account. Deleting a user nulls
`appointments.created_by` and `updated_by` through `ON DELETE SET NULL`. Those nulls are
**updates**, so they fire the audit trigger. The trigger works out who to credit with:

```
actor_id := coalesce(auth.uid(), new.updated_by, new.created_by);
```

During a cascade there is no signed-in caller, so `auth.uid()` is null and it falls through to the
row's own `updated_by` — **the account being deleted**, which by that point is already gone from
`auth.users`. The audit row then fails its own foreign key and takes the whole delete with it.

**So no account that has ever created or updated an appointment could be deleted.** Not this one,
not a coordinator who leaves, not anybody. It would have surfaced the first time somebody left the
company, which is a bad afternoon to discover it.

### The fix

One extra test in the trigger: an actor who no longer exists is recorded as nobody, which is both
true and what the column already allows — `changed_by` is nullable and its foreign key is already
`ON DELETE SET NULL`, so a historical audit row losing its actor is an outcome the schema was
built for.

```sql
create or replace function public.audit_appointment_change()
returns trigger language plpgsql security definer set search_path to ''
as $fn$
declare
  audit_action text;
  actor_id uuid;
begin
  if tg_op = 'DELETE' then
    actor_id := coalesce(auth.uid(), old.updated_by, old.created_by);
  else
    actor_id := coalesce(auth.uid(), new.updated_by, new.created_by);
  end if;

  -- A cascade from a deleted account has no signed-in caller, so the fallbacks above
  -- resolve to the very account being removed. Crediting a row to somebody who no
  -- longer exists fails this table's own foreign key and takes the delete with it.
  -- Nobody is the honest answer, and the column has always allowed it.
  if actor_id is not null
     and not exists (select 1 from auth.users u where u.id = actor_id) then
    actor_id := null;
  end if;
  …
```

The body below the guard is unchanged from the definition saved at the end of this entry.

### The reverse

Restoring the saved definition below puts the old behaviour back, including the inability to
delete a user who has touched an appointment. It is recorded for completeness, not because
anybody should want it.

### The definition as it was, word for word

```sql
CREATE OR REPLACE FUNCTION public.audit_appointment_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  audit_action text;
  actor_id uuid;
begin
  if tg_op = 'DELETE' then
    actor_id := coalesce(auth.uid(), old.updated_by, old.created_by);
  else
    actor_id := coalesce(auth.uid(), new.updated_by, new.created_by);
  end if;

  if tg_op = 'INSERT' then
    insert into public.appointment_audit_log (
      appointment_id,
      location_id,
      action,
      old_values,
      new_values,
      changed_by
    )
    values (
      new.id,
      new.location_id,
      'created',
      null,
      to_jsonb(new),
      actor_id
    );
    return new;
  elsif tg_op = 'UPDATE' then
    audit_action := case
      when old.status is distinct from new.status then 'status_changed'
      else 'updated'
    end;

    insert into public.appointment_audit_log (
      appointment_id,
      location_id,
      action,
      old_values,
      new_values,
      changed_by
    )
    values (
      new.id,
      new.location_id,
      audit_action,
      to_jsonb(old),
      to_jsonb(new),
      actor_id
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.appointment_audit_log (
      appointment_id,
      location_id,
      action,
      old_values,
      new_values,
      changed_by
    )
    values (
      old.id,
      old.location_id,
      'deleted',
      to_jsonb(old),
      null,
      actor_id
    );
    return old;
  end if;

  return null;
end;
$function$
```

Checksum of that block, with carriage returns stripped and trailing blank lines trimmed:
`697fcf8e0a7a79a7689139d5f80f67e0`, 1553 characters.

### What was verified after the change

| | Before | After |
|---|---|---|
| `auth.users` | 2 | **1** |
| `profiles` | 2 | **1** |
| Remaining account | | `javad.resa`, System Admin, master |
| `user_location_access` rows | 1 | 0 |
| `user_preferences` rows for the removed account | 3 | 0 |
| Appointments with no recorded creator | 0 | 6 |
| Appointments total | 394 | **394** |
| Locations / docks / role permissions | 12 / 34 / 121 | **12 / 34 / 121** |

Nothing but the account and the rows that hang off it was touched. The six demonstration loads it
had booked are still on the board and still complete; only the record of which account entered
them is gone, which is what deleting that account honestly means.

**The trigger fix was proved by the thing it unblocked.** The delete failed before it and
succeeded after it, with no other change in between, which is a better test than any assertion
about it would have been.

### Who can reach the system now

Checked rather than assumed, since the question was asked directly.

| | |
|---|---|
| Accounts that can sign in | **1** |
| Functions the `anon` role may execute | **0** |
| Tables the `anon` role may read | 9 by grant, **0 in practice** |

The nine tables carrying an `anon` grant all have row-level security enabled, and every policy on
them requires `has_permission(...)`, `has_location_access(...)` or `auth.uid()` — all of which are
false or null for a caller with no session. `appointment_documents` is the only one whose policies
name the `public` role at all, and that is Postgres's default for "applies to every role", not a
grant to anonymous callers; its three policies each still demand a signed-in identity. So the
grants are untidy rather than dangerous, and tightening them is housekeeping, not a hole.

**Still outstanding, and unchanged by this work:** leaked-password protection is off in the
Supabase dashboard, and the Auth Site URL and redirect URLs still name the GitHub Pages address.
Both are in `docs/GO_LIVE_AUDIT.md` §4 and both need a person in the dashboard.

---

## 5i-i. The demo set rebuilt again, six days from 24 August (2026-08-24)

Third rebuild, same shape as §5f-i and subject to everything said there. **Demonstration data, not
freight.** `docs/GO_LIVE_AUDIT.md` §1.1 still applies: clear it before the product carries real
bookings.

### Why

The previous set ran 12 to 22 August and had fallen entirely into the past. A new demonstration is
being given, and it needs a live board: Monday 24 August through Saturday 29 August, weighted to
Mississauga, Guelph and Milton, with a handful at Pickering, Bristol, Concord, Owen Sound and
Sturgis.

The requirement that shapes the data is combining. Every day at the three main sites carries at
least one pair that **exactly fills one 53 ft trailer**, so the fullness reading lands on 100%
rather than near it.

### The one number worth knowing before reading the board

**A 53 ft trailer is 26 skids at every site except Mississauga, where it is 52.** That is a
deliberate setting from earlier work, not a mistake, and it is why a Mississauga pair reads
30 + 22 while a Guelph pair reads 22 + 4. Anybody comparing the two boards and expecting the same
number will think one of them is wrong. If Mississauga should match the others it is one value in
**Settings → Trucks**, and no code changes.

### What was removed

The same four tables as §5c-i and §5f-i, in the same order and for the same reasons: appointment
linked notifications, the audit log, the series, then `merged_into_appointment_id` nulled, then the
appointments. Counts before the clear were 394 appointments, 2 series, 597 audit rows and 587
notifications.

**No configuration was touched.** Locations, docks, hours, settings, truck ladders, roles and
permissions are exactly as they were, as is the single remaining account.

**The delete is not reproduced here as runnable SQL**, for the reason §5c-i sets out at length.

### How it was written

Unchanged from §5f-i, which describes the split in full: everything from tomorrow onward goes
through `book_appointment` and `book_routed_appointment` with `request.jwt.claims` set, so it
passes every check a person booking would hit. Today's earlier hours cannot, because
`book_appointment` refuses a past time and `receive_appointment` can only stamp `now()`, so they go
through the same temporary `seed_demo_appointment` function, **dropped again in the same sitting**.

If that function exists in the database today, something went wrong and it should be dropped. Its
signature and the drop statement are in §5f-i.

### Reversing it

**There is no restore, deliberately.** As §5c-i and §5f-i both say: these rows were invented, and a
document that claimed to restore them would be restoring a fiction. The two real routes are
point-in-time recovery, if the tier has it and the window has not passed, or another generated set.

The bound is the same and it is the point of the entry: four tables, all of them appointment
activity. No configuration, no account, no permission.

### The procedure, click by click

1. Open the Supabase dashboard and pick project `rywzqepzramurbrpmept`.
2. Go to **SQL Editor** and open a new query.
3. Run `select count(*) from public.appointments;` and write the number down first.
4. Run `select proname from pg_proc where proname = 'seed_demo_appointment';`. It should return
   nothing. If it returns a row, drop it using the statement in §5f-i.
5. To empty the board, follow the order named above rather than deleting `appointments` first, as
   the notifications and audit rows do not cascade.
6. Re-run the count from step 3. It should read `0`.
7. Nothing in the repository needs reverting. No code changed.

### What was verified after the change

**215 loads and 3 dock blocks across 8 sites, Monday 24 to Saturday 29 August.**

| Day | Loads | Left | Received | Unloading | At gate | Confirmed | Scheduled | Cancelled | Blocks |
|---|---|---|---|---|---|---|---|---|---|
| Mon 24 | 39 | 5 | 7 | 7 | 9 | 5 | 6 | | |
| Tue 25 | 40 | | | | | 16 | 24 | 1 | 1 |
| Wed 26 | 44 | | | | | 21 | 22 | 2 | 1 |
| Thu 27 | 43 | | | | | 20 | 23 | 1 | 1 |
| Fri 28 | 39 | | | | | 19 | 20 | | |
| Sat 29 | 10 | | | | | 6 | 4 | | |

Monday reads as a morning that happened: five trucks finished and gone, seven finished and still
on the yard, seven being unloaded, nine at the gate, and the afternoon still ahead.

**Seventeen lanes fill exactly one 53 ft trailer**, at Mississauga, Guelph, Milton and Pickering,
on every day from Tuesday to Friday. Not close to full — exactly full, so the reading is 100% and
not 96%:

| | 53 ft holds | The pair |
|---|---|---|
| Mississauga | 52 | 28 + 24, 34 + 18, 26 + 26, 32 + 20 |
| Guelph, Milton, Pickering | 26 | 20 + 6, 18 + 8, 16 + 10, 14 + 12, 22 + 4 |

Guelph on Wednesday also carries a **three-way** — 12 + 8 + 6 — and Milton on Thursday carries a
pair booked on 48 ft trailers that together need a 53, which is the case where the answer is a
bigger truck rather than a later time.

**Five filler loads had to be moved off those lanes.** They were generated at random and happened
to land on the same site, day, direction and partner as a planted pair, which turned "these two
make exactly one truck" into a three-load lane at 196%. Their partner was changed through
`update_appointment_details`; nothing was deleted.

| Check | Result |
|---|---|
| Loads outside their site's operating hours | 0 |
| Two loads overlapping on one dock | 0 |
| Load on a door facing the wrong way | 0 |
| Duplicate PO / BOL references | 0 |
| Completed load missing an arrival or a completion time | 0 |
| Temporary seed function still present | 0 |

**The wrong-door problem appeared again and is still the same open bug.** Fifteen loads landed on
a Milton door facing the wrong way, because the dock query in `book_appointment` and
`create_appointment_series` filters on truck compatibility and overlap but not on
`direction_mode`. They were reassigned through `update_appointment_details`, as in §5f-i and
§5g-i. **This is the third rebuild in a row where it has had to be cleaned up by hand**, which is
the argument for fixing it in the shared dock-picking logic rather than after the fact.
