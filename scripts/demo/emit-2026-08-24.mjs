import { writeFileSync, mkdirSync } from 'node:fs';
import { build, ROUTED, BLOCKS, ADMIN, TODAY } from './plan.mjs';

const rows = build();
const seeded = rows.filter(r => r.date === TODAY);   // today: the seed function, it can write the past
const booked = rows.filter(r => r.date > TODAY);     // the rest: the product's own booking RPC

const clean = v => {
  const s = v === null || v === undefined ? '' : String(v);
  if (s.includes('|') || s.includes('\n')) throw new Error(`delimiter in field: ${s}`);
  return s;
};
const line = f => f.map(clean).join('|');
const nz = c => `nullif(f[${c}],'')`;

mkdirSync('sql', { recursive: true });

const seedLine = r => line([r.site, r.time, r.direction, r.requester_type, r.apt, r.truck, r.skids,
  r.handling, r.priority ? 't' : 'f', r.name, r.email, r.ref, r.company, r.carrier, r.notes ?? '',
  r.status, r.ci ?? '', r.sv ?? '', r.dp ?? '']);

const WALK = "'07:00','08:30','10:00','11:30','13:00','14:30','09:15','12:15','15:00','16:00'";

const seedSql = list => `do $x$
declare f text[]; v uuid; tm text;
begin
  for f in select string_to_array(t,'|')
           from unnest(string_to_array($blob$${list.map(seedLine).join('\n')}$blob$, e'\\n')) t
  loop
    v := null;
    foreach tm in array (array[f[2]] || array[${WALK}]) loop
      begin
        v := public.seed_demo_appointment(f[1], '${TODAY}'::date, tm::time, f[3], f[4], f[5], f[6],
          f[7]::int, f[8], f[9]='t', f[10], f[11], f[12], ${nz(13)}, ${nz(14)}, ${nz(15)}, f[16],
          '${ADMIN}'::uuid, ${nz(17)}::int, ${nz(18)}::int, ${nz(19)}::int);
      exception when others then v := null;
      end;
      exit when v is not null;
    end loop;
  end loop;
end $x$;`;

const bookLine = r => line([r.site, r.date, r.time, r.direction, r.requester_type, r.apt, r.truck,
  r.skids, r.handling, r.priority ? 't' : 'f', r.name, r.email, r.ref, r.company, r.carrier,
  r.notes ?? '', r.status]);

const BOOK_WALK = "'07:00','08:30','10:00','11:30','13:00','14:30','09:30','12:30','15:00','16:00'";

const bookSql = list => `do $x$
declare f text[]; v jsonb; tm text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','${ADMIN}','role','authenticated')::text, true);
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
      begin
        perform public.change_appointment_status((v->>'appointment_id')::uuid, f[17],
          case when f[17]='cancelled' then 'Customer moved the order to next week.' end);
      exception when others then null;
      end;
    end if;
  end loop;
end $x$;`;

const routedSql = list => `do $x$
declare f text[]; v jsonb; tm text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','${ADMIN}','role','authenticated')::text, true);
  for f in select string_to_array(t,'|')
           from unnest(string_to_array($blob$${list.map(r => line([r.site, r.partner, r.date, r.time,
             r.apt, r.truck, r.skids, r.name, r.email, r.ref, r.carrier, r.notes])).join('\n')}$blob$, e'\\n')) t
  loop
    v := null;
    foreach tm in array (array[f[4]] || array[${BOOK_WALK}]) loop
      begin
        v := public.book_routed_appointment((select id from public.locations where code=f[1]),
          f[3]::date, tm::time, 'outbound', 'Max Solutions', f[5], f[6], f[7]::int, 'standard', false,
          f[8], f[9], f[10], null, (select id from public.locations where code=f[2]), f[11], f[12], false);
      exception when others then v := null;
      end;
      exit when v is not null;
    end loop;
    if v is not null then
      begin perform public.change_appointment_status((v->>'appointment_id')::uuid, 'confirmed', null);
      exception when others then null; end;
    end if;
  end loop;
end $x$;`;

const blockSql = list => `do $x$
declare f text[];
begin
  perform set_config('request.jwt.claims', json_build_object('sub','${ADMIN}','role','authenticated')::text, true);
  for f in select string_to_array(t,'|')
           from unnest(string_to_array($blob$${list.map(b => line([b.site, b.dock, b.date, b.time, b.mins, b.reason, b.note])).join('\n')}$blob$, e'\\n')) t
  loop
    begin
      perform public.block_dock_time((select id from public.locations where code=f[1]),
        f[3]::date, f[4]::time, f[5]::int,
        array[(select d.id from public.docks d join public.locations l on l.id=d.location_id
               where l.code=f[1] and d.name=f[2])],
        f[6], f[7]);
    exception when others then null;
    end;
  end loop;
end $x$;`;

const chunk = (l, n) => Array.from({ length: Math.ceil(l.length / n) }, (_, i) => l.slice(i * n, i * n + n));
const files = [];
chunk(seeded, 60).forEach((p, i) => { const f = `sql/1-today-${i + 1}.sql`; writeFileSync(f, seedSql(p)); files.push([f, p.length]); });
chunk(booked, 60).forEach((p, i) => { const f = `sql/2-week-${i + 1}.sql`; writeFileSync(f, bookSql(p)); files.push([f, p.length]); });
writeFileSync('sql/3-routed.sql', routedSql(ROUTED)); files.push(['sql/3-routed.sql', ROUTED.length]);
writeFileSync('sql/4-blocks.sql', blockSql(BLOCKS)); files.push(['sql/4-blocks.sql', BLOCKS.length]);

console.log(`total ${rows.length + ROUTED.length} loads + ${BLOCKS.length} dock blocks`);
console.log(`  today (seeded): ${seeded.length}   rest of week (booked through the RPC): ${booked.length}   transfers: ${ROUTED.length}`);
for (const [f, n] of files) console.log(`  ${f}  ${n}`);
const perDay = {}; for (const r of [...rows, ...ROUTED]) perDay[r.date] = (perDay[r.date] || 0) + 1;
console.log('per day:', JSON.stringify(perDay));
const st = {}; for (const r of rows) st[r.status] = (st[r.status] || 0) + 1;
console.log('statuses:', JSON.stringify(st));
