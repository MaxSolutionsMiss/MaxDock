// The demo appointment set for 14 August 2026.
//
// Two days behind (Wed 12, Thu 13) and eight operating days ahead (Fri 14 through
// Sat 22, Sunday closed). Seven sites. The past is written by seed_demo_appointment
// because book_appointment correctly refuses a past date; everything from tomorrow
// on goes through the product's own booking RPCs.
//
// Deterministic on purpose: a seeded PRNG, so the same plan comes out twice and a
// failure can be re-run without becoming a different demo.

let seed = 20260814;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = list => list[Math.floor(rnd() * list.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

// ── The places ───────────────────────────────────────────────────────────────
export const SITES = {
  mississauga: { open: '07:00', slot: 15, trailerDocks: 2, weight: 8, cap53: 52 },
  pickering:   { open: '07:00', slot: 30, trailerDocks: 4, weight: 8, cap53: 26 },
  milton:      { open: '06:00', slot: 15, trailerDocks: 5, weight: 8, cap53: 26, noSaturday: true },
  markham:     { open: '07:00', slot: 15, trailerDocks: 2, weight: 5, cap53: 26 },
  concord:     { open: '07:00', slot: 15, trailerDocks: 2, weight: 4, cap53: 26 },
  owen_sound:  { open: '07:00', slot: 15, trailerDocks: 2, weight: 4, cap53: 26 },
  bristol:     { open: '07:00', slot: 15, trailerDocks: 2, weight: 4, cap53: 26 },
};

// ── The companies at the other end ───────────────────────────────────────────
// Vendors send material in; customers take finished cartons out. Each carries a
// real contact so the requester fields are not all the same person.
const VENDORS = [
  ['Cascades Containerboard', 'Marie Lavoie', 'marie.lavoie@cascades-demo.com'],
  ['WestRock Paperboard', 'Dale Whitcomb', 'dale.whitcomb@westrock-demo.com'],
  ['Sappi North America', 'Ingrid Halvorsen', 'ingrid.halvorsen@sappi-demo.com'],
  ['Domtar Paper', 'Curtis Ngo', 'curtis.ngo@domtar-demo.com'],
  ['Flint Group Inks', 'Rosa Bertolini', 'rosa.bertolini@flint-demo.com'],
  ['Sun Chemical', 'Ahmed Farouk', 'ahmed.farouk@sunchem-demo.com'],
  ['Henkel Adhesives', 'Petra Vogel', 'petra.vogel@henkel-demo.com'],
  ['ProAmpac Films', 'Suzanne Leduc', 'suzanne.leduc@proampac-demo.com'],
  ['Rossi Foils', 'Gian Rossi', 'gian.rossi@rossifoils-demo.com'],
  ['Nordson Supply', 'Kelly Barnard', 'kelly.barnard@nordson-demo.com'],
];
const CUSTOMERS = [
  ['Loblaw Distribution', 'Trevor Aitken', 'trevor.aitken@loblaw-demo.com'],
  ['Metro Ontario', 'Nadia Salib', 'nadia.salib@metro-demo.com'],
  ['Shoppers Drug Mart DC', 'Owen Brackett', 'owen.brackett@sdm-demo.com'],
  ['Nestle Canada', 'Camille Fortin', 'camille.fortin@nestle-demo.com'],
  ['Maple Leaf Foods', 'Grant Hollis', 'grant.hollis@mapleleaf-demo.com'],
  ['Kruger Products', 'Yvette Chan', 'yvette.chan@kruger-demo.com'],
  ['McCain Foods', 'Barry Doucette', 'barry.doucette@mccain-demo.com'],
  ['Church and Dwight', 'Priya Raman', 'priya.raman@churchdwight-demo.com'],
  ['Weston Bakeries', 'Luc Tremblay', 'luc.tremblay@weston-demo.com'],
  ['Unilever Canada', 'Simone Okafor', 'simone.okafor@unilever-demo.com'],
];
const CARRIERS = [
  'Day and Ross', 'TFI Transport', 'Titanium Trucking', 'Manitoulin Transport',
  'Vitran Express', 'Challenger Motor Freight', 'Erb Transport', 'Canada Cartage',
  'Kindersley Transport', 'Purolator Freight',
];

// ── The trucks ───────────────────────────────────────────────────────────────
// Weighted the way the owner asked: mostly 53 and 48 foot trailers, a 26 foot
// straight truck for the smaller runs, and the occasional van so the ladder has
// something at the bottom of it.
const TRUCKS = [
  ...Array(9).fill('trailer_53'),
  ...Array(7).fill('trailer_48'),
  ...Array(4).fill('straight_truck_26'),
  'cube_van', 'courier_van',
];

const INBOUND_TYPES = ['raw_material', 'raw_material', 'raw_material', 'wip', 'return_rework', 'other'];
const OUTBOUND_TYPES = ['finished_goods', 'finished_goods', 'finished_goods', 'customer_pickup', 'wip'];
const HANDLING = ['standard', 'standard', 'standard', 'standard', 'mixed_skus', 'requires_counting', 'special_handling', 'paperwork_samples'];

const NOTES = [
  null, null, null, null,
  'Driver to report to the shipping office first.',
  'Tailgate required.',
  'Pallet exchange on arrival.',
  'Two pick-up numbers on the same BOL.',
  'Call thirty minutes out.',
  'Temperature-sensitive stock, keep off the sun wall.',
];

const skidsFor = truck => ({
  trailer_53: between(16, 26),
  trailer_48: between(11, 20),
  straight_truck_26: between(4, 10),
  cube_van: between(1, 2),
  courier_van: 1,
}[truck]);

// ── The people who booked ────────────────────────────────────────────────────
export const USERS = {
  admin:  '8946583d-bde4-4d2f-8859-9babebebc59a', // javad.resa, system admin, every site
  vendor: '7eee3b30-aa2b-420b-b23b-27fae5cc4461', // demo.vendor, Cutting Edge
};
// The outside account can only reach these, so its loads must land on them.
export const VENDOR_SITES = ['mississauga', 'pickering', 'markham', 'owen_sound'];

// ── The days ─────────────────────────────────────────────────────────────────
export const PAST = ['2026-08-12', '2026-08-13'];
export const TODAY = '2026-08-14';
export const FUTURE = ['2026-08-15', '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22'];
const SATURDAYS = new Set(['2026-08-15', '2026-08-22']);

const WAVES = ['07:00', '08:30', '10:00', '11:30', '13:00', '14:30'];
const MILTON_WAVES = ['06:00', '07:30', '09:00', '10:30', '12:00', '13:30', '15:00'];

let refCounter = 4100;
const nextRef = prefix => `${prefix}-${++refCounter}`;

// ── One load ─────────────────────────────────────────────────────────────────
function load({ site, date, time, direction, truck, skids, company, contact, email, status,
                creator = USERS.admin, priority = false, apt, handling, carrier, notes, ci, sv, dp }) {
  const table = direction === 'inbound' ? VENDORS : CUSTOMERS;
  const party = company ? [company, contact, email] : pick(table);
  const chosenTruck = truck || pick(TRUCKS);
  return {
    site, date, time, direction,
    requester_type: direction === 'inbound' ? 'Vendor' : 'Customer',
    apt: apt || pick(direction === 'inbound' ? INBOUND_TYPES : OUTBOUND_TYPES),
    truck: chosenTruck,
    skids: skids ?? skidsFor(chosenTruck),
    handling: handling || pick(HANDLING),
    priority,
    name: contact || party[1],
    email: email || party[2],
    ref: nextRef(direction === 'inbound' ? 'PO' : 'BOL'),
    company: company || party[0],
    carrier: carrier || pick(CARRIERS),
    notes: notes === undefined ? pick(NOTES) : notes,
    status, creator, ci, sv, dp,
  };
}

// How a finished load looked while it was happening. Most trucks turn up on time
// or a little early; some do not, and a demo with a perfect on-time score is a
// demo nobody believes.
function history(skids) {
  const late = rnd() < 0.22;
  const ci = late ? between(12, 48) : between(-25, 4);
  const service = ci + between(6, 20);
  const depart = service + Math.max(25, skids * 2 + between(5, 25));
  return { ci, sv: service, dp: depart };
}

// ── A day at a site ──────────────────────────────────────────────────────────
// `plant` is the combining opportunity: two or three loads on the same lane, sized
// so one trailer would take them all. That is the whole argument the demo is making.
function daySite(site, date, phase, plant) {
  const conf = SITES[site];
  if (conf.noSaturday && SATURDAYS.has(date)) return [];
  const waves = site === 'milton' ? MILTON_WAVES : WAVES;
  const count = SATURDAYS.has(date) ? Math.max(2, Math.round(conf.weight / 2.5)) : conf.weight;
  const rows = [];
  const slots = [];
  for (const wave of waves) for (let lane = 0; lane < conf.trailerDocks; lane += 1) slots.push(wave);

  let cursor = 0;
  const take = () => slots[cursor++ % slots.length];

  if (plant) for (const member of plant) rows.push(load({ ...member, site, date, time: take() }));

  while (rows.length < count) {
    const direction = rnd() < 0.5 ? 'inbound' : 'outbound';
    rows.push(load({ site, date, time: take(), direction, status: 'scheduled' }));
  }

  return rows.map(row => ({ ...row, ...statusFor(row, phase) }));
}

// What state a load is in depends only on when it is. Yesterday is finished, today
// is half-finished, and next week has not started.
function statusFor(row, phase) {
  if (phase === 'past') {
    const roll = rnd();
    if (roll < 0.055) return { status: 'no_show', ci: null, sv: null, dp: null };
    if (roll < 0.10) return { status: 'cancelled', ci: null, sv: null, dp: null };
    return { status: 'completed', ...history(row.skids) };
  }
  if (phase === 'today') {
    const hour = Number(row.time.slice(0, 2));
    if (hour < 10) {
      if (rnd() < 0.08) return { status: 'no_show', ci: null, sv: null, dp: null };
      return { status: 'completed', ...history(row.skids) };
    }
    if (hour < 12) return { status: 'in_progress', ci: between(-15, 10), sv: between(12, 25), dp: null };
    if (hour < 14) return { status: 'arrived', ci: between(-20, -2), sv: null, dp: null };
    return { status: rnd() < 0.6 ? 'confirmed' : 'scheduled', ci: null, sv: null, dp: null };
  }
  return { status: rnd() < 0.45 ? 'confirmed' : 'scheduled', ci: null, sv: null, dp: null };
}

// ── The planted combining lanes ──────────────────────────────────────────────
// One per day at each of the four sites the owner named. Sized against that site's
// own 53 ft capacity, because the same trailer holds a different number of skids in
// a different building: 52 skids at Mississauga, 26 everywhere else.
function plantFor(site, date, phase) {
  const live = phase !== 'past';
  if (!live) return null;
  const status = 'scheduled';
  if (site === 'mississauga') {
    const c = CUSTOMERS[0];
    return [
      { direction: 'outbound', truck: 'trailer_53', skids: 28, company: c[0], contact: c[1], email: c[2], status, apt: 'finished_goods', handling: 'standard' },
      { direction: 'outbound', truck: 'trailer_48', skids: 20, company: c[0], contact: c[1], email: c[2], status, apt: 'finished_goods', handling: 'standard' },
    ];
  }
  if (site === 'pickering') {
    const c = CUSTOMERS[1];
    const trio = rnd() < 0.4;
    const rows = [
      { direction: 'outbound', truck: 'trailer_53', skids: 13, company: c[0], contact: c[1], email: c[2], status, apt: 'finished_goods', handling: 'standard' },
      { direction: 'outbound', truck: 'straight_truck_26', skids: 8, company: c[0], contact: c[1], email: c[2], status, apt: 'finished_goods', handling: 'standard' },
    ];
    if (trio) rows.push({ direction: 'outbound', truck: 'straight_truck_26', skids: 4, company: c[0], contact: c[1], email: c[2], status, apt: 'customer_pickup', handling: 'standard' });
    return rows;
  }
  if (site === 'milton') {
    const v = VENDORS[0];
    return [
      { direction: 'inbound', truck: 'trailer_48', skids: 12, company: v[0], contact: v[1], email: v[2], status, apt: 'raw_material', handling: 'standard' },
      { direction: 'inbound', truck: 'trailer_53', skids: 12, company: v[0], contact: v[1], email: v[2], status, apt: 'raw_material', handling: 'standard' },
    ];
  }
  if (site === 'markham') {
    const c = CUSTOMERS[2];
    return [
      { direction: 'outbound', truck: 'trailer_53', skids: 15, company: c[0], contact: c[1], email: c[2], status, apt: 'finished_goods', handling: 'standard' },
      { direction: 'outbound', truck: 'straight_truck_26', skids: 8, company: c[0], contact: c[1], email: c[2], status, apt: 'finished_goods', handling: 'standard' },
    ];
  }
  return null;
}

// The one lane that will not fit, so the demo can show what MaxDock does about it.
// Two 48 ft trailers at Milton hold 20 skids each here; 23 skids together clears
// neither, and the answer is a bigger trailer rather than a later time.
function overflowLane(date) {
  const v = VENDORS[1];
  return [
    { direction: 'inbound', truck: 'trailer_48', skids: 11, company: v[0], contact: v[1], email: v[2], status: 'scheduled', apt: 'raw_material', handling: 'standard',
      notes: 'Second half of the same mill run.' },
    { direction: 'inbound', truck: 'trailer_48', skids: 12, company: v[0], contact: v[1], email: v[2], status: 'scheduled', apt: 'raw_material', handling: 'standard',
      notes: 'First half of the same mill run.' },
  ];
}

// ── The vendor's own loads ───────────────────────────────────────────────────
// Booked by the outside account so they land in its My Appointments, which is the
// screen the vendor half of the demo is given from. Two at one site on one day is
// the pair it can combine itself; the rest is the 48-hour picture across two Max
// sites that makes the point the owner wants made.
function vendorLoads() {
  const me = ['Cutting Edge', 'George Halvorson', 'george.halvorson@cuttingedge-demo.com'];
  const mate = ['Cutting Edge', 'Michael Prentice', 'michael.prentice@cuttingedge-demo.com'];
  const common = { creator: USERS.vendor, status: 'scheduled', direction: 'inbound', apt: 'raw_material', requester_type: 'Vendor' };
  return [
    // Two into Mississauga on the Tuesday — the pair the vendor can put on one truck.
    { ...common, site: 'mississauga', date: '2026-08-18', time: '09:00', truck: 'trailer_53', skids: 24,
      company: me[0], contact: me[1], email: me[2], handling: 'standard', carrier: 'Erb Transport',
      notes: 'Booked by George.' },
    { ...common, site: 'mississauga', date: '2026-08-18', time: '13:00', truck: 'trailer_48', skids: 18,
      company: mate[0], contact: mate[1], email: mate[2], handling: 'standard', carrier: 'Erb Transport',
      notes: 'Booked by Michael, same day, same site.' },
    // The 48-hour picture: the same vendor at two Max sites inside two days.
    { ...common, site: 'pickering', date: '2026-08-19', time: '10:00', truck: 'trailer_48', skids: 14,
      company: me[0], contact: me[1], email: me[2], handling: 'mixed_skus', carrier: 'Erb Transport', notes: null },
    { ...common, site: 'pickering', date: '2026-08-19', time: '14:30', truck: 'straight_truck_26', skids: 9,
      company: mate[0], contact: mate[1], email: mate[2], handling: 'standard', carrier: 'Erb Transport', notes: null },
    { ...common, site: 'markham', date: '2026-08-20', time: '08:30', truck: 'trailer_53', skids: 21,
      company: me[0], contact: me[1], email: me[2], handling: 'standard', carrier: 'Kindersley Transport', notes: null },
    { ...common, site: 'owen_sound', date: '2026-08-21', time: '10:00', truck: 'trailer_48', skids: 16,
      company: me[0], contact: me[1], email: me[2], handling: 'requires_counting', carrier: 'Kindersley Transport', notes: null },
  ].map(row => ({
    ...row,
    ref: nextRef('PO'),
    priority: false,
    name: row.contact,
    ci: null, sv: null, dp: null,
  }));
}

// ── Max to Max ───────────────────────────────────────────────────────────────
// Plant-to-plant transfers on the lanes that actually run. These go through the
// routed booking RPC, which writes the mirrored movement at the far end too.
export const ROUTED = [
  { site: 'mississauga', partner: 'milton',      date: '2026-08-18', time: '11:30', direction: 'outbound', truck: 'trailer_53', skids: 22, apt: 'wip' },
  { site: 'milton',      partner: 'mississauga', date: '2026-08-19', time: '09:00', direction: 'outbound', truck: 'trailer_48', skids: 17, apt: 'wip' },
  { site: 'pickering',   partner: 'markham',     date: '2026-08-20', time: '13:00', direction: 'outbound', truck: 'trailer_48', skids: 15, apt: 'finished_goods' },
  { site: 'owen_sound',  partner: 'mississauga', date: '2026-08-21', time: '08:30', direction: 'outbound', truck: 'trailer_53', skids: 19, apt: 'finished_goods' },
  { site: 'concord',     partner: 'bristol',     date: '2026-08-19', time: '10:00', direction: 'outbound', truck: 'straight_truck_26', skids: 9, apt: 'wip' },
].map(row => ({
  ...row,
  requester_type: 'Max Solutions',
  handling: 'standard',
  priority: false,
  name: 'Leo Sambo',
  email: 'leo.sambo@maxsolutions-demo.com',
  ref: nextRef('TR'),
  company: null,
  carrier: 'Canada Cartage',
  notes: 'Plant to plant transfer.',
  status: 'confirmed',
  creator: USERS.admin,
}));

// ── Put it together ──────────────────────────────────────────────────────────
export function build() {
  const rows = [];
  const days = [
    ...PAST.map(d => [d, 'past']),
    [TODAY, 'today'],
    ...FUTURE.map(d => [d, 'future']),
  ];
  for (const [date, phase] of days) {
    for (const site of Object.keys(SITES)) {
      let plant = plantFor(site, date, phase);
      if (site === 'milton' && phase === 'future' && date === '2026-08-19') plant = overflowLane(date);
      rows.push(...daySite(site, date, phase, plant));
    }
  }
  // A couple of priority runs so the board has something flagged on it.
  for (const row of rows) if (row.status !== 'cancelled' && rnd() < 0.04) row.priority = true;
  return rows;
}

export const VENDOR = vendorLoads();
