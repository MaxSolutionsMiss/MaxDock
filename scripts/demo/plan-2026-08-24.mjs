// Demo set for the week of Monday 24 August 2026.
//
// Six days, Monday to Saturday. Weighted to Mississauga, Guelph and Milton, with a
// few loads at Pickering, Bristol, Concord, Owen Sound and Sturgis.
//
// The point of the set is combining, so every day at the three main sites carries a
// pair that EXACTLY fills one 53 ft trailer. That number is not the same everywhere:
// 26 skids at every site except Mississauga, which is set up to double-stack at 52.
// Sizing a pair to the wrong site's capacity is the one mistake that would make the
// fullness reading say 88% in a demonstration built to show 100%.

let seed = 20260824;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = list => list[Math.floor(rnd() * list.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

export const ADMIN = '8946583d-bde4-4d2f-8859-9babebebc59a';
export const TODAY = '2026-08-24';
export const DAYS = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29'];
const SATURDAY = '2026-08-29';

// open time, how many loads on a weekday, how many on Saturday, and what a 53 holds here
export const SITES = {
  mississauga: { open: '05:00', close: '23:00', satOpen: '07:00', satClose: '15:00', n: 10, sat: 4, cap53: 52, lanes: 3, step: 15 },
  guelph:      { open: '07:00', close: '16:30', satOpen: '07:00', satClose: '16:30', n: 9,  sat: 4, cap53: 26, lanes: 3, step: 15 },
  milton:      { open: '06:00', close: '16:30', sat: 0, n: 9, cap53: 26, lanes: 3, step: 15, split: true },
  pickering:   { open: '07:00', close: '19:00', satOpen: '07:00', satClose: '13:00', n: 3, sat: 2, cap53: 26, lanes: 4, step: 30 },
  owen_sound:  { open: '07:30', close: '16:00', sat: 0, n: 2, cap53: 26, lanes: 2, step: 15 },
  bristol:     { open: '06:30', close: '15:00', sat: 0, n: 2, cap53: 26, lanes: 2, step: 15 },
  concord:     { open: '08:00', close: '17:00', sat: 0, n: 2, cap53: 26, lanes: 2, step: 15 },
  sturgis:     { open: '07:00', close: '16:30', sat: 0, n: 2, cap53: 26, lanes: 2, step: 15 },
};

const VENDORS = [
  ['Cascades Containerboard', 'Marie Lavoie', 'marie.lavoie@cascades-demo.com'],
  ['WestRock Paperboard', 'Dale Whitcomb', 'dale.whitcomb@westrock-demo.com'],
  ['Sappi North America', 'Ingrid Halvorsen', 'ingrid.halvorsen@sappi-demo.com'],
  ['Domtar Paper', 'Curtis Ngo', 'curtis.ngo@domtar-demo.com'],
  ['Flint Group Inks', 'Rosa Bertolini', 'rosa.bertolini@flint-demo.com'],
  ['Sun Chemical', 'Ahmed Farouk', 'ahmed.farouk@sunchem-demo.com'],
  ['Henkel Adhesives', 'Petra Vogel', 'petra.vogel@henkel-demo.com'],
  ['ProAmpac Films', 'Suzanne Leduc', 'suzanne.leduc@proampac-demo.com'],
];
const CUSTOMERS = [
  ['Loblaw Distribution', 'Trevor Aitken', 'trevor.aitken@loblaw-demo.com'],
  ['Metro Ontario', 'Nadia Salib', 'nadia.salib@metro-demo.com'],
  ['Shoppers Drug Mart DC', 'Owen Brackett', 'owen.brackett@sdm-demo.com'],
  ['Nestle Canada', 'Camille Fortin', 'camille.fortin@nestle-demo.com'],
  ['Maple Leaf Foods', 'Grant Hollis', 'grant.hollis@mapleleaf-demo.com'],
  ['Kruger Products', 'Yvette Chan', 'yvette.chan@kruger-demo.com'],
  ['McCain Foods', 'Barry Doucette', 'barry.doucette@mccain-demo.com'],
  ['Weston Bakeries', 'Luc Tremblay', 'luc.tremblay@weston-demo.com'],
];
const CARRIERS = ['Day and Ross', 'TFI Transport', 'Titanium Trucking', 'Manitoulin Transport',
  'Vitran Express', 'Challenger Motor Freight', 'Erb Transport', 'Canada Cartage', 'Kindersley Transport'];

const TRUCKS = [...Array(8).fill('trailer_53'), ...Array(6).fill('trailer_48'),
  ...Array(4).fill('straight_truck_26'), 'cube_van', 'courier_van'];
const IN_TYPES = ['raw_material', 'raw_material', 'raw_material', 'wip', 'return_rework', 'other'];
const OUT_TYPES = ['finished_goods', 'finished_goods', 'finished_goods', 'customer_pickup', 'wip'];
const HANDLING = ['standard', 'standard', 'standard', 'standard', 'mixed_skus', 'requires_counting', 'special_handling', 'paperwork_samples'];
const NOTES = [null, null, null, null, 'Driver to report to the shipping office first.', 'Tailgate required.',
  'Pallet exchange on arrival.', 'Call thirty minutes out.', 'Two pick-up numbers on the same BOL.'];

const skidsFor = t => ({ trailer_53: between(14, 25), trailer_48: between(10, 19),
  straight_truck_26: between(4, 10), cube_van: between(1, 2), courier_van: 1 }[t]);

let ref = 5100;
const nextRef = p => `${p}-${++ref}`;

// ── the combining pairs, sized to fill exactly one 53 at that site ───────────
// Written out rather than generated so each one can be read and checked by eye.
const FILLS = {
  mississauga: [[30, 22], [28, 24], [34, 18], [26, 26], [32, 20], [29, 23]],
  guelph:      [[22, 4], [20, 6], [18, 8], [16, 10], [14, 12], [21, 5]],
  milton:      [[20, 6], [22, 4], [17, 9], [19, 7], [15, 11], [18, 8]],
  pickering:   [[22, 4], [18, 8], [20, 6], [16, 10], [14, 12], [19, 7]],
};

function truckFor(skids, cap53) {
  if (cap53 === 52) return skids > 48 ? 'trailer_53' : skids > 22 ? 'trailer_48' : 'straight_truck_26';
  return skids > 20 ? 'trailer_53' : skids > 10 ? 'trailer_48' : 'straight_truck_26';
}

function load(o) {
  const table = o.direction === 'inbound' ? VENDORS : CUSTOMERS;
  const party = o.company ? [o.company, o.contact, o.email] : pick(table);
  const truck = o.truck || pick(TRUCKS);
  return {
    site: o.site, date: o.date, time: o.time, direction: o.direction,
    requester_type: o.requester_type || (o.direction === 'inbound' ? 'Vendor' : 'Customer'),
    apt: o.apt || pick(o.direction === 'inbound' ? IN_TYPES : OUT_TYPES),
    truck, skids: o.skids ?? skidsFor(truck),
    handling: o.handling || pick(HANDLING),
    priority: o.priority ?? rnd() < 0.06,
    name: party[1], email: party[2], company: party[0],
    ref: nextRef(o.direction === 'inbound' ? 'PO' : 'BOL'),
    carrier: o.carrier || pick(CARRIERS),
    notes: o.notes === undefined ? pick(NOTES) : o.notes,
    status: o.status, ci: o.ci ?? null, sv: o.sv ?? null, dp: o.dp ?? null,
  };
}

// ── today, Monday, with the morning already behind us ────────────────────────
// It is 09:27 when this is written, so the board should show a morning that
// happened: trucks finished and gone, trucks finished and still on the yard, one
// being unloaded, one at the gate, and the afternoon still to come.
function todayStatus(hour, skids) {
  if (hour < 8) {
    const late = rnd() < 0.25;
    const ci = late ? between(14, 45) : between(-22, 5);
    const sv = ci + between(6, 18);
    const dp = sv + Math.max(25, skids * 2 + between(5, 20));
    // Some have left the yard, some are finished but still sitting on it.
    return rnd() < 0.6
      ? { status: 'completed', ci, sv, dp }
      : { status: 'completed', ci, sv, dp: null };
  }
  if (hour < 9) return { status: 'in_progress', ci: between(-15, 8), sv: between(10, 22), dp: null };
  if (hour < 11) return { status: 'arrived', ci: between(-25, -2), sv: null, dp: null };
  return rnd() < 0.5 ? { status: 'confirmed' } : { status: 'scheduled' };
}

const timesFor = (conf, date) => {
  const sat = date === SATURDAY;
  const open = sat ? (conf.satOpen || conf.open) : conf.open;
  const close = sat ? (conf.satClose || conf.close) : conf.close;
  const [oh, om] = open.split(':').map(Number);
  const [ch] = close.split(':').map(Number);
  const out = [];
  for (let m = oh * 60 + om; m <= (ch - 2) * 60; m += 90) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
};

export function build() {
  const rows = [];

  DAYS.forEach((date, dayIndex) => {
    const sat = date === SATURDAY;

    for (const [site, conf] of Object.entries(SITES)) {
      const want = sat ? (conf.sat || 0) : conf.n;
      if (!want) continue;
      const waves = timesFor(conf, date);
      let slot = 0;
      const take = () => waves[(slot++) % waves.length];
      const mine = [];

      // The pair that fills a trailer exactly. Same lane, same day, same direction.
      const fill = FILLS[site];
      if (fill && !sat) {
        const [a, b] = fill[dayIndex % fill.length];
        const outbound = dayIndex % 2 === 0;
        const party = outbound ? CUSTOMERS[dayIndex % CUSTOMERS.length] : VENDORS[dayIndex % VENDORS.length];
        const common = {
          site, date, direction: outbound ? 'outbound' : 'inbound',
          company: party[0], contact: party[1], email: party[2],
          apt: outbound ? 'finished_goods' : 'raw_material', handling: 'standard',
          carrier: 'Erb Transport', status: 'scheduled', priority: false,
        };
        mine.push(load({ ...common, time: take(), skids: a, truck: truckFor(a, conf.cap53),
          notes: `Fills a 53 with the ${b} skid load on the same lane.` }));
        mine.push(load({ ...common, time: take(), skids: b, truck: truckFor(b, conf.cap53),
          notes: `Fills a 53 with the ${a} skid load on the same lane.` }));
      }

      while (mine.length < want) {
        mine.push(load({ site, date, time: take(),
          direction: rnd() < 0.5 ? 'inbound' : 'outbound', status: 'scheduled' }));
      }

      for (const row of mine) {
        if (date === TODAY) Object.assign(row, todayStatus(Number(row.time.slice(0, 2)), row.skids));
        else if (rnd() < 0.45) row.status = 'confirmed';
      }
      rows.push(...mine);
    }
  });

  // A three-way at Guelph that also fills exactly: 12 + 8 + 6.
  const three = ['12', '8', '6'].map((n, i) => load({
    site: 'guelph', date: '2026-08-26', time: ['09:30', '11:00', '13:30'][i],
    direction: 'outbound', company: 'Kruger Products', contact: 'Yvette Chan',
    email: 'yvette.chan@kruger-demo.com', apt: 'finished_goods', handling: 'standard',
    carrier: 'Day and Ross', skids: Number(n), truck: truckFor(Number(n), 26),
    status: i === 0 ? 'confirmed' : 'scheduled', priority: false,
    notes: 'Three small pick-ups on one lane. Together they are exactly one trailer.',
  }));
  rows.push(...three);

  // A pair that will not fit the truck it is booked on, so the answer is a bigger
  // trailer rather than a later time: 12 + 11 on 48 ft trailers that hold 20 here.
  const over = [12, 11].map((n, i) => load({
    site: 'milton', date: '2026-08-27', time: ['08:00', '10:30'][i],
    direction: 'inbound', company: 'WestRock Paperboard', contact: 'Dale Whitcomb',
    email: 'dale.whitcomb@westrock-demo.com', apt: 'raw_material', handling: 'standard',
    carrier: 'Canada Cartage', skids: n, truck: 'trailer_48',
    status: 'scheduled', priority: false,
    notes: i === 0 ? 'First half of the mill run.' : 'Second half of the mill run.',
  }));
  rows.push(...over);

  // A couple of cancellations so the week is not unnaturally clean.
  for (const row of rows) {
    if (row.date > TODAY && row.status !== 'cancelled' && rnd() < 0.02) row.status = 'cancelled';
  }
  return rows;
}

// ── plant to plant, on the lanes that actually run ───────────────────────────
export const ROUTED = [
  { site: 'guelph',      partner: 'mississauga', date: '2026-08-25', time: '10:30', skids: 21, truck: 'trailer_53', apt: 'wip' },
  { site: 'mississauga', partner: 'milton',      date: '2026-08-25', time: '13:00', skids: 30, truck: 'trailer_53', apt: 'wip' },
  { site: 'milton',      partner: 'guelph',      date: '2026-08-26', time: '09:00', skids: 16, truck: 'trailer_48', apt: 'finished_goods' },
  { site: 'guelph',      partner: 'milton',      date: '2026-08-27', time: '13:00', skids: 18, truck: 'trailer_48', apt: 'wip' },
  { site: 'mississauga', partner: 'guelph',      date: '2026-08-28', time: '11:00', skids: 24, truck: 'trailer_53', apt: 'finished_goods' },
  { site: 'sturgis',     partner: 'mississauga', date: '2026-08-26', time: '08:30', skids: 19, truck: 'trailer_53', apt: 'finished_goods' },
].map(r => ({ ...r, direction: 'outbound', handling: 'standard', priority: false,
  name: 'Javad Resa', email: 'javadresa@maxpkgsolutions.com', ref: nextRef('TR'),
  carrier: 'Canada Cartage', notes: 'Plant to plant transfer.', status: 'confirmed' }));

// ── doors out of service ─────────────────────────────────────────────────────
export const BLOCKS = [
  { site: 'guelph',      dock: 'Side Dock', date: '2026-08-25', time: '13:00', mins: 120, reason: 'Floor repair', note: 'Epoxy patch by the door. Two hours to cure.' },
  { site: 'milton',      dock: 'Dock 3',    date: '2026-08-26', time: '09:00', mins: 180, reason: 'Dock leveller repair', note: 'Millwright booked for the morning.' },
  { site: 'mississauga', dock: 'Dock 3',    date: '2026-08-27', time: '05:00', mins: 180, reason: 'Safety inspection', note: 'Restraint and leveller check before first shift.' },
];
