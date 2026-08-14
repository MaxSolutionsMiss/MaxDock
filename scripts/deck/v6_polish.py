"""v6 pass over the v4.1 slides: shorter copy, and more room around everything.

Two jobs, in this order:

  TRIM  — the deck said things at length that the floor says in half the words.
          Every replacement below keeps the point and drops the sentence around
          it. Shorter copy is most of the white space.

  AIR   — wider gutters between cards, wider gaps between rows and the bands
          under them. Roughly 5-10% more space around each object, taken out of
          the objects rather than the margins.

Slides that this project drew itself (the origin story, the market comparison,
the bridge, the week ahead) carry their own spacing in build_deck.py — there is
nothing to patch here for those.
"""
import deckkit as k

# ---------------------------------------------------------------- the trim ---
# (old text, new text). Matched against whole shapes, deck-wide, and every one
# must hit exactly one shape — a miss means the deck moved under us.
TRIM = [
    # 3 · why we started this
    ("MaxDock began as a list of things that kept going wrong at the dock, "
     "written down as they happened.",
     "It started as a list of what kept going wrong at the dock."),
    ("Several trucks in the same hour, and no list anywhere of who was coming "
     "when.",
     "Several trucks in one hour, and no list of who was coming."),
    ("Our own sites dispatched on their own availability, not on the receiving "
     "plant's.",
     "Our own sites shipped when it suited them, not the plant receiving."),
    ("Two trucks receivable on paper. One crew in practice. Both of them "
     "waited.",
     "Two trucks on paper. One crew in practice. Both waited."),
    ("Trucks queue in the yard, and waiting turns into detention charged back "
     "to us.",
     "Trucks queue in the yard, and the waiting comes back as detention."),
    ("No forward view, so labour could not be set against tomorrow's arrivals.",
     "No forward view, so labour was never set against tomorrow."),
    ("Two part-loads to the same plant inside two days, on two separate "
     "trucks.",
     "Two part-loads to the same plant in two days, on two trucks."),
    ("Underneath all six: a day of phone calls and emails spent reassembling a "
     "schedule that nobody could see.",
     "Under all six: a day of calls and emails rebuilding a schedule nobody "
     "could see."),
    ("of truck stops end in detention. ATRI names the causes: the customer's "
     "scheduling, staffing and dock space.",
     "of truck stops end in detention. ATRI blames scheduling, staffing and "
     "dock space."),

    # 4 · what was missing
    ("Five things a dock schedule has to do. Four were not being done at all — "
     "and the fifth is not done by anyone on the market.",
     "Five things a dock schedule has to do. Four were not being done. The "
     "fifth, nobody does."),
    ("Any truck could arrive at any door at any hour, and nothing in the "
     "process said no.",
     "Any truck, any door, any hour. Nothing in the process said no."),
    ("Nobody outside the shipping office could see where a load was, so they "
     "phoned to ask.",
     "Outside the shipping office nobody could see a load, so they phoned."),
    ("A wrong load at a wrong site was found at the door, and left no record "
     "afterwards.",
     "A wrong load was found at the door, and left no record."),
    ("No carrier reliability, no dock labour hours, no door utilisation. "
     "Nothing to improve against.",
     "No carrier reliability, no labour hours, no door use. Nothing to "
     "improve."),
    ("Two half-empty trailers on the same lane on the same day, with nothing "
     "looking for them.",
     "Two half-empty trailers, same lane, same day. Nothing looking."),

    # 6 · where we are now
    ("Nothing here is anybody's fault. It is what happens when a dock is "
     "booked by whoever picks up the phone.",
     "Nobody's fault. It is what happens when the dock is booked by whoever "
     "picks up the phone."),
    ("A carrier calls, somebody says yes, and the only record is in one "
     "person's head until they write it down. When they are off, the plant "
     "guesses.",
     "Somebody says yes on the phone. The record is in one person's head, and "
     "that person is off tomorrow."),
    ("It cannot check whether the door is free, whether the trailer fits, or "
     "whether floor space is left. It accepts anything typed into it.",
     "It cannot check the door, the trailer or the floor. It accepts whatever "
     "is typed into it."),
    ("The shipping office knows what is happening. The customer, the carrier "
     "and the next plant find out by calling and asking.",
     "The shipping office knows. The customer, the carrier and the next plant "
     "have to phone."),
    ("It is a hundred small ones: trucks waiting, doors idle, part-full "
     "trailers leaving, and a day nobody can reconstruct afterwards.",
     "It is a hundred small ones: trucks waiting, doors idle, part-full "
     "trailers leaving."),

    # 7 · what MaxDock is
    ("Suppliers and carriers book their own slot against the rules each plant "
     "actually runs. Everything in this deck is working portal functionality "
     "you can open today, not a concept.",
     "Suppliers and carriers book their own slot against each plant's real "
     "rules. Everything in this deck works today."),

    # 8 · what you will see
    ("Four screens in this deck are photographs of the running product, marked "
     "THE REAL SCREEN.",
     "Four screens in this deck are photographs of the running product."),

    # 9 · the board
    ("It refreshes on its own, so a wall display in the shipping office is "
     "always current. A coordinator can drag a load to another door, and the "
     "rules travel with it.",
     "It refreshes on its own, so a wall display is always current. Drag a "
     "load to another door and the rules travel with it."),

    # 10 · the real board
    ("The vertical rule is the current time at that plant, in its own time "
     "zone.",
     "The current time at that plant, in its own time zone."),
    ("Reference, status and destination. Click it for the full load.",
     "Reference, status and destination. Click for the full load."),

    # 11 · combining
    ("MaxDock watches for loads going the same way on the same day and offers "
     "to put them on one truck.",
     "MaxDock spots two loads going the same way on the same day, and offers "
     "to merge them."),
    ("A folding-carton plant ships partial trailers constantly. Every avoided "
     "truck is a freight charge that never gets paid, and a door-hour given "
     "back.",
     "We ship partial trailers constantly. Every truck avoided is a freight "
     "bill nobody pays."),
    ("Both numbers are kept. The merged appointment records what each original "
     "load contributed, so nothing disappears from anybody's view.",
     "Both numbers are kept, and the merged booking records what each load put "
     "on the truck."),
    ("No other dock-scheduling product does this. They schedule doors; they do "
     "not look inside the trailer.",
     "No other dock product does this. They schedule doors; they do not look "
     "inside the trailer."),

    # 12 · the bigger trailer
    ("This is the difference between a suggestion a coordinator accepts and "
     "one they learn to dismiss.",
     "The difference between a suggestion a coordinator takes and one they "
     "learn to ignore."),
    ("The naive feature says: “try Friday.” That answer is useless, and a "
     "coordinator stops reading it.",
     "The naive version says “try Friday.” Useless, and they stop reading it."),
    ("MaxDock checks every other trailer type the plant runs before it gives "
     "up on the day.",
     "MaxDock tries every other trailer the plant runs before it gives up on "
     "the day."),
    ("Capacity here is skids — the unit the dock actually thinks in. Every bar "
     "is on one scale; full width is 26 skids.",
     "Every bar is on one scale; full width is 26 skids."),

    # 13 · max to max
    ("Half of what moves is ours going to ourselves. Today that is two phone "
     "calls and two diary entries that drift apart.",
     "Half of what we move is ours going to ourselves — two phone calls, two "
     "diary entries."),
    ("The shipping site taps Shipped. That tap is the departure, so Guelph's "
     "board reads En route. Each end sees the words that are true from where "
     "it is standing.",
     "Mississauga taps Shipped. That tap is the departure, so Guelph's board "
     "reads En route."),

    # 15 · self-service booking
    ("A customer, vendor or carrier signs in and books against that plant's "
     "real rules. Three steps, and it used to be five.",
     "A customer, vendor or carrier signs in and books against that plant's "
     "real rules."),
    ("What is on it, how many skids, which trailer, which handling. MaxDock "
     "works out how long the door will be occupied from the plant's own "
     "duration rules.",
     "Skids, trailer, handling. MaxDock works out how long the door is held, "
     "from that plant's own rules."),
    ("Only times that genuinely work are offered. Nothing that would be "
     "refused on arrival ever appears on the screen.",
     "Only times that genuinely work are offered. Nothing that would be "
     "refused ever appears."),
    ("A booking reference and a QR check-in code, shareable to a driver who "
     "has no MaxDock account. If another load could share the truck, MaxDock "
     "says so here.",
     "A reference and a QR code, shareable to any driver. If a load could "
     "share the truck, it says so here."),
    ("Each outside company sees only its own bookings. That isolation is "
     "enforced in the database, not by hiding buttons.",
     "Each outside company sees only its own bookings, enforced in the "
     "database."),
    ("Nobody is locked out. A coordinator can still book on somebody's behalf, "
     "and every booking lands on the same board.",
     "A coordinator can still book on somebody's behalf, and it lands on the "
     "same board."),
    ("Three steps, and it used to be five. Every step removed is a booking "
     "that gets finished.",
     "Three steps. It used to be five."),

    # 16 · the booking screen
    ("Step one of three. The booker chooses the site and the load; MaxDock "
     "works out the door time from that plant's own rules.",
     "Step one of three. Pick the site and the load; MaxDock works out the "
     "door time."),
    ("The booker never types a time. They pick from what is genuinely "
     "available on that day, at that plant.",
     "Nobody types a time. They pick from what is actually free that day."),
    ("Trailer and skid count drive how long the door is held, so the board "
     "reflects real occupancy.",
     "Trailer and skid count drive how long the door is held."),
    ("It used to be five. Every step removed is a booking that gets finished "
     "instead of abandoned.",
     "It used to be five. Every step removed is a booking that gets finished."),

    # 17 · the funnel
    ("Every filter is configuration a site controls: operating hours, notice "
     "period, trailer fit, floor capacity, duration rules.",
     "Every filter is a setting the site controls: hours, notice, trailer fit, "
     "floor space."),
    ("The quiet benefit: a slot that was never offered cannot be argued about "
     "on arrival.",
     "A slot that was never offered cannot be argued about on arrival."),

    # 18 · receiving
    ("Installable on any phone or tablet. Scan the QR on the paperwork, see "
     "the load, tap where it has got to.",
     "Installs on any phone. Scan the QR on the paperwork, see the load, tap "
     "where it got to."),
    ("Big targets, because it is used one-handed beside a running truck, in "
     "gloves, in February.",
     "Big targets: one-handed, beside a running truck, in gloves, in "
     "February."),
    ("No forms, no notes to write up afterwards. The load is found by scanning "
     "it.",
     "No forms, and nothing to write up afterwards."),
    ("The same app, on any phone the crew already carries. Nothing to buy and "
     "nothing to mount on a wall.",
     "The same app, on any phone the crew already carries. Nothing to buy."),

    # 19 · the phone screen
    ("Scanned in at the door. Everything the crew needs is above the fold, and "
     "the only thing to do is say where the truck has got to.",
     "Scanned in at the door. Everything the crew needs, and one thing to do."),
    ("Captured if it is useful, never a blocker to receiving the truck.",
     "Captured if it is useful. Never a blocker."),

    # 20 · the wrong site
    ("The pattern behind it: wherever MaxDock knows something the person does "
     "not, it says the specific thing.",
     "The pattern: where MaxDock knows something the person does not, it says "
     "the specific thing."),
    ("Scan a load booked into Guelph while standing at Mississauga and the "
     "phone says so by name. The old answer sends somebody to the office, and "
     "the truck waits while they walk.",
     "Scan a Guelph load while standing at Mississauga, and the phone says so "
     "by name. The old answer sent somebody to the office while the truck "
     "waited."),
    ("A truck at the wrong site is a real situation with a real answer — and "
     "that answer belongs to the person standing there, not to the software.",
     "A truck at the wrong site has a real answer, and it belongs to the "
     "person standing there."),
    ("A refusal names the rule that refused it. A wrong site names the site. A "
     "full floor says how many positions are left. Nothing in MaxDock says "
     "“invalid” and leaves somebody to work out why.",
     "A refusal names the rule. A wrong site names the site. A full floor says "
     "how many positions are left."),

    # 21 · skids, not appointments
    ("Every other product caps trucks per hour. Two trucks per hour is "
     "meaningless when one carries 4 skids and the next carries 30.",
     "Others cap trucks per hour. That means nothing when one carries 4 skids "
     "and the next carries 30."),
    ("Every booked inbound adds skids to the floor. Every outbound takes them "
     "away. MaxDock runs that sum through the day, so it knows whether there "
     "is room before it offers a time.",
     "Inbound adds skids to the floor, outbound takes them away. MaxDock runs "
     "that sum through the day."),
    ("The next load is 26 skids and only 18 positions remain. Thursday never "
     "appears on that booker's screen, so nobody has to refuse it at the door.",
     "The next load is 26 skids and 18 positions are left, so Thursday never "
     "appears on the booker's screen."),
    ("If a site has not set a floor number, the check simply does not run. "
     "Nothing is ever blocked by a number nobody entered.",
     "No floor number set, no check. Nothing is blocked by a number nobody "
     "entered."),

    # 22 · carrier on-time
    ("The same shape works by site, by customer and by vendor — the site "
     "scorecard is what a plant manager is measured on.",
     "The same shape works by site, by customer and by vendor."),
    ("Built from timestamps the crew already created by tapping. Nobody keys "
     "in a figure, so nobody can quietly improve one.",
     "Built from taps the crew already made. Nobody keys in a figure, so "
     "nobody can improve one."),

    # 23 · coverage
    ("It doubles as adoption. A site at 69% coverage is telling you something "
     "about its own habits, not just about its carriers.",
     "It doubles as adoption: 69% coverage says as much about the site as "
     "about its carriers."),
    ("When a day gets chaotic, scanning is the first thing that gets skipped — "
     "which is exactly when a figure quoted without its coverage would flatter "
     "us.",
     "When a day gets chaotic, scanning is the first thing skipped — which is "
     "exactly when the figure would flatter us."),
    ("Every report in MaxDock shows the count it was built from, so nobody has "
     "to ask how much of the picture they are looking at.",
     "Every report shows the count it was built from."),

    # 24 · the real reports screen
    ("Doors, trailers and reliability — whether any of them needs a closer "
     "look.",
     "Doors, trailers and reliability, and whether any needs a closer look."),
    ("Export on every screen with data. Print lives here, where a printed page "
     "is the point.",
     "Export on every screen with data. Print lives here."),

    # 25 · labour and door use
    ("MaxDock already knows how long each load occupies a door, because it "
     "calculated that to make the booking. Multiply by the crew each truck "
     "needs and you have dock labour hours per day, set against the shift "
     "roster.",
     "MaxDock already knows how long each load holds a door. Multiply by the "
     "crew a truck needs, and that is labour hours per day."),
    ("The useful output is not the total. It is the shape: which hours are "
     "overloaded and which doors sit idle beside them.",
     "Not the total — the shape. Which hours are jammed, and which doors sit "
     "idle beside them."),
    ("Before spending money widening a dock, this picture says whether the "
     "doors are the constraint — or whether the scheduling was.",
     "Before spending money on more doors, this says whether the doors were "
     "ever the constraint."),

    # 27 · everything else built
    ("Today's work as a list: what is due, what is late, and what is at a door "
     "right now.",
     "What is due, what is late, and what is at a door right now."),
    ("What an outside company sees — their own bookings, a QR code, and Share.",
     "What an outside company sees: their own bookings, a QR code, Share."),
    ("Eight sections: hours, notice, durations, docks, trailers, crew and "
     "capacity.",
     "Hours, notice, durations, docks, trailers, crew and capacity."),
    ("Who can do what, per site, with customer isolation enforced underneath.",
     "Who can do what, per site, with customer isolation underneath."),
    ("All four are role-aware. What a coordinator sees is not what a customer "
     "sees, and not what a carrier sees. That is enforced in the database, not "
     "by hiding buttons.",
     "All four are role-aware: a coordinator, a customer and a carrier each "
     "see a different screen, enforced in the database."),

    # 28 · before and after, part one
    ("Not done badly — not done at all, because there has never been a system "
     "to do them in.",
     "Not done badly. Not done at all, because there was nowhere to do them."),
    ("Three more overleaf. Four of the six are working today; the bridge and "
     "the email are in build and next up.",
     "Three more overleaf. Four of the six work today."),

    # 29 · before and after, part two
    ("These are the basics that turn a dock schedule from “who remembers?” "
     "into “open it and check.”",
     "The basics that turn “who remembers?” into “open it and check.”"),

    # 30 · where MaxDock is different
    ("The gap: established products treat every site as an island and never "
     "look inside the trailer.",
     "Established products treat every site as an island, and never look "
     "inside the trailer."),
    ("Yard management is a deliberate omission, not a shortfall. There is no "
     "gate and no yard to manage in the operating model we are solving for.",
     "Yard management is a deliberate omission, not a shortfall. We have no "
     "gate and no yard to manage."),

    # 31 · the expected basics
    ("Competitor rows reflect publicly documented capability and are a guide "
     "for discussion, not a procurement assessment.",
     "A guide for discussion, from published material — not a procurement "
     "assessment."),
    ("OpenDock, C3 Solutions, Transporeon and Descartes all schedule doors. "
     "MaxDock's advantage is that it schedules the load, the trailer, the "
     "floor and the plant-to-plant movement as one system.",
     "They all schedule doors. MaxDock schedules the load, the trailer, the "
     "floor and the plant-to-plant move as one system."),

    # 32 · where it stands
    ("Not prototypes. Every item below can be opened and used this afternoon.",
     "Not prototypes. Every item below can be opened this afternoon."),
    ("Built in-house. No licence, no per-plant subscription, and no vendor to "
     "renegotiate with. The trade is that the capability lives with us, which "
     "is a real thing to weigh.",
     "No licence, no per-plant subscription, no vendor to renegotiate with. "
     "The trade: the capability lives with us."),

    # 33 · named, not yet built
    ("In build now and heading for test. This is the piece that makes an "
     "appointment create itself.",
     "In build and heading for test. This is what makes an appointment create "
     "itself."),
    ("The biggest gap in daily use. It needs a mail provider chosen — a "
     "decision, then a short job.",
     "The biggest gap in daily use. It needs a mail provider chosen."),
    ("When a booking changes, the people copied on it should hear. Same "
     "mail-provider dependency.",
     "When a booking changes, the people copied on it should hear."),
    ("For the driver with no app and no account, arriving at a plant for the "
     "first time.",
     "For the driver with no app and no account, at a plant for the first "
     "time."),
    ("Book it, scan it, complete it, and read the report it produced. Nothing "
     "to build first.",
     "Book it, scan it, complete it, read the report. Nothing to build "
     "first."),

    # 34 · out of scope
    ("There is no gate and no yard to manage. The truck arrives at the door, "
     "so the door is where MaxDock starts.",
     "No gate, no yard. The truck arrives at the door, so the door is where we "
     "start."),
    ("With no gate there is no honest clock start, and GTA traffic makes the "
     "number argue with itself.",
     "No gate means no honest clock start, and GTA traffic argues with the "
     "number."),
    ("The second list matters as much as the first. It is what keeps the "
     "system pointed at the problem we actually have.",
     "The second list matters as much as the first. It keeps the system "
     "pointed at our problem."),

    # 35 · five decisions
    ("Everything in this deck already works. What is left is not building — it "
     "is deciding.",
     "Everything in this deck already works. What is left is deciding."),
    ("The phone app installs against a fixed address. Moving it later orphans "
     "the icon on every phone.",
     "The app installs against a fixed address. Move it later and every icon "
     "breaks."),
    ("Today there is one, so there is nowhere to rehearse a change. The "
     "largest operational risk.",
     "There is one today, so there is nowhere to rehearse a change."),
    ("Coordinators, managers, and the outside companies who will book. Six "
     "accounts exist today.",
     "Coordinators, managers, and the companies who will book. Six accounts "
     "exist today."),
    ("A single site running it properly for a month teaches more than twelve "
     "running it half-heartedly.",
     "One site running it properly for a month teaches more than twelve "
     "half-doing it."),
    ("Three of the five are one conversation with IT. The last one is the only "
     "decision that needs a name against it.",
     "Three of the five are one conversation with IT. The last one needs a "
     "name against it."),

    # 36 · closing
    ("The remaining work is deciding where it lives, who uses it first, and "
     "how we send the emails.",
     "What is left is where it lives, who uses it first, and how we send the "
     "emails."),
]


def trim(prs):
    for old, new in TRIM:
        hits = [sh for s in prs.slides for sh in s.shapes
                if sh.has_text_frame and sh.text_frame.text == old]
        if len(hits) != 1:
            raise LookupError(f"{len(hits)} shapes matched: {old[:60]}...")
        k.set_text(hits[0], new)


# ----------------------------------------------------------------- the air ---
def air(prs):
    """Widen the gutters and the gaps. Each block moves whole — a card and
    everything standing on it — so nothing drifts out of alignment."""
    _six_problem_cards(prs.slides[1])
    _five_missing_rows(prs.slides[2])
    _three_place_cards(prs.slides[3])
    _replaces_and_flow(prs.slides[4])
    _agenda_rows(prs.slides[5])
    _combining(prs.slides[8])
    _bigger_trailer(prs.slides[9])
    _booking_steps(prs.slides[12])
    _funnel_rows(prs.slides[14])
    _receiving_phone(prs.slides[15])
    _skids(prs.slides[18])
    _carrier_rows(prs.slides[19])
    _labour_and_doors(prs.slides[22])
    _built_already(prs.slides[23])
    _compare_rows(prs.slides[26])
    _basics_rows(prs.slides[27])
    _standing_cards(prs.slides[28])
    _not_built_cards(prs.slides[29])
    _out_of_scope(prs.slides[30])
    _decisions(prs.slides[31])


def _six_problem_cards(s):
    # 3 across, 2 down: 0.25in gutters become 0.46, rows 0.20 apart become 0.32
    xs_old = (0.58, 4.72, 8.86)
    xs_new = (0.58, 4.79, 9.00)
    ys_old, ys_new = (1.72, 3.78), (1.76, 3.90)
    for row, (yo, yn) in enumerate(zip(ys_old, ys_new)):
        for xo, xn in zip(xs_old, xs_new):
            k.move_block(s, xo, yo, xn, yn, w=3.75, h=1.80, text_dw=-0.14)
    k.move_block(s, 0.58, 5.86, 0.58, 5.96, h=0.96)


def _five_missing_rows(s):
    # five rows and a footer line: let each row fall a little further than the
    # one above it, so the list opens up without moving the first row
    for i, y in enumerate((2.87, 3.80, 4.73, 5.42), start=1):
        k.shift_band(s, y - 0.06, y + 0.60, dy=0.02 * i)
    k.shift_band(s, 6.45, 6.60, dy=0.08)


def _three_place_cards(s):
    for xo, xn in ((0.58, 0.58), (4.73, 4.85), (8.88, 9.12)):
        k.move_block(s, xo, 1.72, xn, 1.76, w=3.63, h=3.58, text_dw=-0.24)
    k.move_block(s, 0.58, 5.62, 0.58, 5.72, h=1.20)


def _replaces_and_flow(s):
    for i, y in enumerate((2.12, 2.84, 3.56, 4.28)):
        k.move_block(s, 0.58, y, 0.58, 2.12 + i * 0.76, h=0.62)
    k.move_block(s, 0.58, 5.06, 0.58, 5.24)
    k.move_block(s, 6.38, 1.72, 6.50, 1.76, w=6.25, h=4.02, text_dw=-0.12)
    k.move_block(s, 0.58, 5.95, 0.58, 6.00, h=0.92)


def _agenda_rows(s):
    for i, y in enumerate((2.91, 4.08, 5.25), start=1):
        k.shift_band(s, y - 0.04, y + 0.72, dy=0.05 * i)
    k.move_block(s, 0.58, 6.42, 0.58, 6.50, h=0.42)


def _combining(s):
    k.move_block(s, 0.58, 4.70, 0.58, 4.86, w=5.80, h=1.22, text_dw=-0.10)
    k.move_block(s, 6.85, 4.70, 6.95, 4.86, w=5.80, h=1.22, text_dw=-0.10)
    k.move_block(s, 0.58, 6.16, 0.58, 6.30, h=0.62)


def _bigger_trailer(s):
    for xo, xn in ((0.58, 0.58), (4.82, 4.94), (9.06, 9.30)):
        k.move_block(s, xo, 2.12, xn, 2.18, w=3.45, h=2.60, text_dw=-0.24)
    k.move_block(s, 0.58, 4.86, 0.58, 5.02, w=5.80, h=1.14, text_dw=-0.10)
    k.move_block(s, 6.85, 4.86, 6.95, 5.02, w=5.80, h=1.14, text_dw=-0.10)


def _booking_steps(s):
    for xo, xn in ((0.58, 0.58), (4.74, 4.86), (8.90, 9.14)):
        k.move_block(s, xo, 1.72, xn, 1.78, w=3.61, h=3.66, text_dw=-0.25)
    k.move_block(s, 0.58, 5.52, 0.58, 5.68, w=5.80, h=0.88, text_dw=-0.10)
    k.move_block(s, 6.85, 5.52, 6.95, 5.68, w=5.80, h=0.88, text_dw=-0.10)


def _funnel_rows(s):
    for i, y in enumerate((2.52, 3.22, 3.92, 4.62, 5.32), start=1):
        k.shift_band(s, y - 0.10, y + 0.42, dy=0.02 * i)
    k.move_block(s, 0.58, 6.00, 0.58, 6.08, w=5.80, h=0.84, text_dw=-0.10)
    k.move_block(s, 6.85, 6.00, 6.95, 6.08, w=5.80, h=0.84, text_dw=-0.10)


def _receiving_phone(s):
    k.move_block(s, 0.58, 1.72, 0.58, 1.72, w=3.70, h=4.72)


def _skids(s):
    for xo, xn in ((0.58, 0.58), (4.73, 4.85), (8.88, 9.12)):
        k.move_block(s, xo, 3.66, xn, 3.76, w=3.63, h=2.34, text_dw=-0.24)
    k.shift_band(s, 6.28, 6.44, dy=0.10)


def _carrier_rows(s):
    for i, y in enumerate((3.00, 3.76, 4.52, 5.28), start=1):
        k.shift_band(s, y - 0.08, y + 0.40, dy=0.015 * i)
    k.move_block(s, 0.58, 6.02, 0.58, 6.10, w=5.80, h=0.82, text_dw=-0.10)
    k.move_block(s, 6.85, 6.02, 6.95, 6.10, w=5.80, h=0.82, text_dw=-0.10)


def _labour_and_doors(s):
    # the copy above each chart lost two lines, so the charts move up to meet
    # it and both cards give the closing band more room
    k.shift_band(s, 4.25, 5.65, dy=-0.30, x_from=0.5, x_to=6.5)
    k.shift_band(s, 3.85, 5.55, dy=-0.14, x_from=7.0)
    for x, xn in ((0.58, 0.58), (6.85, 6.95)):
        k.move_block(s, x, 1.72, xn, 1.76, w=5.80, h=4.24, text_dw=-0.10)
    k.move_block(s, 0.58, 6.10, 0.58, 6.14, h=0.78)


def _built_already(s):
    for xo, xn, yo, yn in ((0.58, 0.58, 1.74, 1.80), (6.83, 6.95, 1.74, 1.80),
                           (0.58, 0.58, 3.70, 3.86), (6.83, 6.95, 3.70, 3.86)):
        k.move_block(s, xo, yo, xn, yn, w=5.80, h=1.66, text_dw=-0.13)
    k.move_block(s, 0.58, 5.66, 0.58, 5.98, h=0.94)
    k.move(k.find(s, 0.96, 6.14), y=6.06, h=0.78)


def _compare_rows(s):
    for i, y in enumerate((2.84, 3.52, 4.20, 4.88, 5.56), start=1):
        k.shift_band(s, y - 0.10, y + 0.44, dy=0.015 * i)
    k.move_block(s, 0.58, 6.16, 0.58, 6.32, h=0.60)
    k.move(k.find(s, 0.96, 6.44), y=6.38, h=0.48)


def _basics_rows(s):
    for i, y in enumerate((2.48, 3.10, 3.72, 4.34, 4.96, 5.58), start=1):
        k.shift_band(s, y - 0.12, y + 0.40, dy=0.012 * i)
    k.move_block(s, 0.58, 6.18, 0.58, 6.32, h=0.60)


def _standing_cards(s):
    for xo, xn, yo, yn in ((0.58, 0.58, 1.72, 1.78), (6.83, 6.95, 1.72, 1.78),
                           (0.58, 0.58, 3.98, 4.10), (6.83, 6.95, 3.98, 4.10)):
        k.move_block(s, xo, yo, xn, yn, w=5.80, h=1.94, text_dw=-0.13)
    k.move_block(s, 0.58, 6.14, 0.58, 6.30, h=0.62)


def _not_built_cards(s):
    for yo, yn in ((1.70, 1.72), (3.26, 3.30), (4.82, 4.88)):
        for xo, xn in ((0.58, 0.58), (6.83, 6.95)):
            k.move_block(s, xo, yo, xn, yn, w=5.80, h=1.34, text_dw=-0.13)
    k.move_block(s, 0.58, 6.30, 0.58, 6.40, h=0.52)


def _out_of_scope(s):
    for yo, yn in ((1.74, 1.76), (3.96, 4.06)):
        for xo, xn in ((0.58, 0.58), (6.83, 6.95)):
            k.move_block(s, xo, yo, xn, yn, w=5.80, h=2.04, text_dw=-0.13)
    k.move_block(s, 0.58, 6.10, 0.58, 6.28, h=0.64)


def _decisions(s):
    for i, y in enumerate((2.87, 3.82, 4.77, 5.72), start=1):
        k.shift_band(s, y - 0.10, y + 0.46, dy=0.015 * i)
    k.shift_band(s, 6.50, 6.92, dy=0.06)


def apply(prs):
    trim(prs)
    air(prs)
