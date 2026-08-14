import { writeFileSync, mkdirSync } from 'node:fs';
import { build, VENDOR, ROUTED, USERS, TODAY } from './plan.mjs';

// Rows travel as one pipe-delimited blob parsed in SQL rather than as quoted
// tuples. Same data, a third less of it, and nothing about the parse is clever:
// no field in this set can contain a pipe or a newline, which is asserted below.

const rows = build();
const seeded = rows.filter(r => r.date <= TODAY);
const booked = rows.filter(r => r.date > TODAY);
const all = [...rows, ...VENDOR, ...ROUTED];

const clean = v => {
  const s = v === null || v === undefined ? '' : String(v);
  if (s.includes('|') || s.includes('\n')) throw new Error(`delimiter in field: ${s}`);
  return s;
};
const line = fields => fields.map(clean).join('|');

mkdirSync('sql', { recursive: true });

const SEED_COLS = 'loc,d,tm,dir,rt,apt,truck,skids,handling,prio,rname,remail,ref,company,carrier,notes,st,ci,sv,dp';
const seedLine = r => line([r.site, r.date, r.time, r.direction, r.requester_type, r.apt, r.truck,
  r.skids, r.handling, r.priority ? 't' : 'f', r.name, r.email, r.ref, r.company, r.carrier,
  r.notes ?? '', r.status, r.ci ?? '', r.sv ?? '', r.dp ?? '']);

const nz = c => `nullif(f[${c}],'')`;

const seedBatch = list => `do $x$
declare f text[];
begin
  foreach f slice 0 in array (
    select array_agg(string_to_array(row_text,'|'))
    from unnest(string_to_array($blob$${list.map(seedLine).join('\n')}$blob$, e'\\n')) row_text
  )
  loop null; end loop;
end $x$;`;

// Iterate rows, and walk the clock when a row cannot be placed.
//
// The dock query returns nothing when every compatible door is already busy —
// four outbound loads at Milton against three outbound doors, say. Dropping the
// row silently would quietly thin the demo, so each row tries its own time first
// and then the rest of the day's waves until one takes. Last candidate is 15:00 so
// a ninety-minute load still ends inside the 16:30 close.
const WALK = "'07:00','08:30','10:00','11:30','13:00','14:30','09:15','12:15','15:00'";

const seedBatch2 = list => `do $x$
declare f text[]; v uuid; tm text;
begin
  for f in select string_to_array(t,'|')
           from unnest(string_to_array($blob$${list.map(seedLine).join('\n')}$blob$, e'\\n')) t
  loop
    v := null;
    foreach tm in array (array[f[3]] || array[${WALK}]) loop
      begin
        v := public.seed_demo_appointment(f[1], f[2]::date, tm::time, f[4], f[5], f[6], f[7],
          f[8]::int, f[9], f[10]='t', f[11], f[12], f[13], ${nz(14)}, ${nz(15)}, ${nz(16)}, f[17],
          '${USERS.admin}'::uuid, ${nz(18)}::int, ${nz(19)}::int, ${nz(20)}::int);
      exception when others then v := null;
      end;
      exit when v is not null;
    end loop;
  end loop;
end $x$;`;

const bookLine = r => line([r.site, r.date, r.time, r.direction, r.requester_type, r.apt, r.truck,
  r.skids, r.handling, r.priority ? 't' : 'f', r.name, r.email, r.ref, r.company ?? '', r.carrier,
  r.notes ?? '', r.status]);

// Same walk on the booked side, but only on half-hour marks: Pickering's slot
// interval is 30 minutes and book_appointment refuses anything off the grid.
const BOOK_WALK = "'07:00','08:30','10:00','11:30','13:00','14:30','09:30','12:30','15:00'";

const bookBatch = (list, creator) => `do $x$
declare f text[]; v jsonb; tm text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','${creator}','role','authenticated')::text, true);
  for f in select string_to_array(t,'|')
           from unnest(string_to_array($blob$${list.map(bookLine).join('\n')}$blob$, e'\\n')) t
  loop
    v := null;
    foreach tm in array (array[f[3]] || array[${BOOK_WALK}]) loop
      begin
        v := public.book_appointment((select id from public.locations where code=f[1]),
          f[2]::date, tm::time, f[4], f[5], f[6], f[7], f[8]::int, f[9], f[10]='t',
          f[11], f[12], f[13], ${nz(14)}, null, ${nz(15)}, ${nz(16)}, false);
      exception when others then v := null;
      end;
      exit when v is not null;
    end loop;
    if v is not null and f[17] <> 'scheduled' then
      perform public.change_appointment_status((v->>'appointment_id')::uuid, f[17], null);
    end if;
  end loop;
end $x$;`;

const routedLine = r => line([r.site, r.partner, r.date, r.time, r.direction, r.apt, r.truck,
  r.skids, r.name, r.email, r.ref, r.carrier, r.notes]);

const routedBatch = list => `do $x$
declare f text[]; v jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','${USERS.admin}','role','authenticated')::text, true);
  for f in select string_to_array(t,'|')
           from unnest(string_to_array($blob$${list.map(routedLine).join('\n')}$blob$, e'\\n')) t
  loop
    begin
      v := public.book_routed_appointment((select id from public.locations where code=f[1]),
        f[3]::date, f[4]::time, f[5], 'Max Solutions', f[6], f[7], f[8]::int, 'standard', false,
        f[9], f[10], f[11], null, (select id from public.locations where code=f[2]),
        f[12], f[13], false);
      perform public.change_appointment_status((v->>'appointment_id')::uuid, 'confirmed', null);
    exception when others then null;
    end;
  end loop;
end $x$;`;

const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

// The three Bristol rows already went in as the trial run.
const done = new Set(JSON.parse(process.env.DONE_REFS || '[]'));
const remaining = seeded.filter(r => !done.has(r.ref));

const files = [];
chunk(remaining, 62).forEach((part, i) => {
  const name = `sql/01-seed-${String(i + 1).padStart(2, '0')}.sql`;
  writeFileSync(name, seedBatch2(part));
  files.push([name, part.length]);
});
chunk(booked, 60).forEach((part, i) => {
  const name = `sql/02-book-${String(i + 1).padStart(2, '0')}.sql`;
  writeFileSync(name, bookBatch(part, USERS.admin));
  files.push([name, part.length]);
});
writeFileSync('sql/03-vendor.sql', bookBatch(VENDOR, USERS.vendor));
files.push(['sql/03-vendor.sql', VENDOR.length]);
writeFileSync('sql/04-routed.sql', routedBatch(ROUTED));
files.push(['sql/04-routed.sql', ROUTED.length]);
writeFileSync('sql/refs.json', JSON.stringify(all.map(r => r.ref)));

console.log(`planned ${all.length}: ${seeded.length} seeded (3 already in), ${booked.length} booked, ${VENDOR.length} vendor, ${ROUTED.length} routed`);
for (const [name, count] of files) console.log(`  ${name}  ${count} rows`);
void seedBatch;
