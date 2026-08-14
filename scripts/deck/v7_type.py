"""v7: type sized for a laptop screen, and the title slide's logos.

The deck was set for a big room. It is read on a fourteen-inch laptop, where
6.7pt footers and 9pt labels disappear. Everything steps up — nothing below
9pt, body copy at 12.5-13pt — and the words come down again to pay for it.

Three passes:

  TRIM2 — a second round of cuts, aimed at whatever still ran long.
  SCALE — one size map applied to every run in the deck.
  REFIT — every text box measured at its new size and grown into the free
          space beneath it, bounded by whatever card it sits in. Anything that
          still does not fit is reported, not silently clipped.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import deckkit as k  # noqa: E402
import render_deck  # noqa: E402

# ------------------------------------------------------------- the scale ---
# old pt -> new pt. Display type on the title and closing slides is left alone;
# it is already large.
SIZE_MAP = {
    6.7: 9.0, 7.5: 10.0, 8.0: 10.5, 8.5: 11.0, 9.0: 11.0, 9.5: 11.5,
    10.0: 12.0, 10.5: 12.5, 11.0: 12.5, 11.5: 13.0, 12.0: 13.5, 12.5: 14.0,
    13.0: 14.5, 13.5: 15.0, 14.0: 15.0, 14.5: 15.5, 15.0: 16.0, 15.5: 16.5,
    16.0: 17.0, 17.0: 18.0, 18.0: 19.0, 19.0: 20.0, 20.0: 21.0, 22.0: 23.0,
    25.0: 26.0, 26.0: 27.0, 30.0: 31.0,
}


A_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"


def scale(prs):
    for slide in prs.slides:
        for sh in slide.shapes:
            if not sh.has_text_frame:
                continue
            for para in sh.text_frame.paragraphs:
                for run in para.runs:
                    if run.font.size is None:
                        continue
                    new = SIZE_MAP.get(round(run.font.size.pt, 1))
                    if new:
                        run.font.size = k.Pt(new)
                # the end-of-paragraph mark carries a size too; leaving it
                # behind makes the deck report its old type in PowerPoint
                end = para._p.find(f"{A_NS}endParaRPr")
                if end is not None and end.get("sz"):
                    new = SIZE_MAP.get(round(int(end.get("sz")) / 100, 1))
                    if new:
                        end.set("sz", str(int(new * 100)))


# -------------------------------------------------------------- the refit ---
CONTENT_BOTTOM = 6.92


def _overlaps(a, b):
    return not (a[1] <= b[0] or b[1] <= a[0])


def refit(prs, verbose=True):
    """Grow every text box to hold its text, into whatever room is below it."""
    stuck = []
    for i, slide in enumerate(prs.slides, 1):
        boxes = [sh for sh in slide.shapes
                 if sh.has_text_frame and sh.text_frame.text.strip()
                 and sh.left is not None]
        for sh in boxes:
            top, bottom = sh.top / 914400, (sh.top + sh.height) / 914400
            if top > CONTENT_BOTTOM:            # footer furniture
                continue
            need = render_deck.measure(sh)
            if need <= sh.height / 914400 + 0.01:
                continue
            span = (sh.left / 914400, (sh.left + sh.width) / 914400)
            limit = CONTENT_BOTTOM
            for other in slide.shapes:
                if other._element is sh._element or other.left is None:
                    continue
                o_top = other.top / 914400
                o_bottom = (other.top + other.height) / 914400
                o_span = (other.left / 914400,
                          (other.left + other.width) / 914400)
                if not _overlaps(span, o_span):
                    continue
                if o_top >= bottom - 0.02:                  # sits below
                    limit = min(limit, o_top - 0.10)
                elif o_top <= top + 0.02 and o_bottom >= bottom - 0.02:
                    limit = min(limit, o_bottom - 0.12)     # the card it is in
            room = limit - top
            if need <= room:
                sh.height = k._emu(need + 0.02)
            else:
                sh.height = k._emu(max(room, sh.height / 914400))
                stuck.append((i, round(need, 2), round(room, 2),
                              sh.text_frame.text[:58]))
    if verbose and stuck:
        print("  still tight after refit:")
        for slide_no, need, room, text in stuck:
            print(f"    slide {slide_no}: needs {need}in, has {room}in — {text}")
    return stuck


# ---------------------------------------------------------- the title page ---
def title_page(prs, maxdock_icon, max_solutions_lockup):
    """Rebuilt around the two marks: MaxDock's above its own name, and the
    Max Solutions lockup on a white plate where it can be read in colour."""
    s = k.clear(prs.slides[0])
    k._set_bg(s, k.INK)

    k.rule(s, 0.55, k.FOOT_Y, 12.24, "1E4A63")
    s.shapes.add_picture(maxdock_icon, k._emu(0.55), k._emu(7.16),
                         k._emu(0.16), k._emu(0.16))
    k.text(s, 0.78, 7.14, 1.30, 0.20, "MaxDock", size=9, color="7FA3B8")
    k.text(s, 6.42, 7.14, 0.50, 0.20, "1", size=9, color="7FA3B8", align="c")
    k.text(s, 11.00, 7.14, 1.78, 0.20, "MAX SOLUTIONS", size=9, color="7FA3B8",
           bold=True, align="r", spc=60)

    s.shapes.add_picture(maxdock_icon, k._emu(0.78), k._emu(0.86),
                         k._emu(0.72), k._emu(0.72))
    k.text(s, 0.78, 1.74, 6.20, 0.80, "MaxDock", size=40, color=k.WHITE,
           bold=True, font=k.DISPLAY)
    k.text(s, 0.80, 2.58, 6.20, 0.30, "A Max Solutions product", size=13,
           color="8FB3C7")
    k.text(s, 0.78, 3.52, 6.40, 2.20,
           ["Freight arrives", "when we say", "it will."], size=34,
           color=k.WHITE, bold=True, font=k.DISPLAY, line_spacing=1.14)

    k.vrule(s, 7.68, 0.86, 5.54, color=k.CYAN, weight=4)

    k.text(s, 8.18, 1.90, 4.35, 1.40,
           "Dock scheduling, load combining and receiving. Built in-house, for "
           "how our plants actually ship.", size=15, color=k.WHITE, bold=True,
           line_spacing=1.24)
    k.text(s, 8.18, 3.50, 4.35, 0.30, "An introduction for the leadership team",
           size=13, color="8FB3C7")
    k.text(s, 8.18, 3.88, 4.35, 0.28, "August 2026", size=12.5,
           color="6F8FA6")

    k.rect(s, 8.18, 4.50, 4.35, 1.90, fill=k.WHITE, line=None,
           radius=k.CARD_RADIUS)
    s.shapes.add_picture(max_solutions_lockup, k._emu(8.71), k._emu(4.77),
                         k._emu(3.30), k._emu(1.357))
    return s


# Repeated labels, so these are replaced wherever they appear.
MULTI_TRIM = [
    ("Blocked on a decision", "Needs a decision"),
]


def screen_mock_type(slide, size=9.5):
    """The dock-board mock is a picture of a screen, not slide copy. Its block
    labels stay small, the way they are on the real board."""
    for sh in slide.shapes:
        if not sh.has_text_frame or sh.left is None:
            continue
        if sh.width / 914400 <= 1.40 and 2.4 <= sh.top / 914400 <= 6.2:
            for para in sh.text_frame.paragraphs:
                for run in para.runs:
                    run.font.size = k.Pt(size)


def closing_page(prs, maxdock_icon, max_solutions_lockup):
    """The closing slide is the title slide's twin, so it carries the same two
    marks — and loses the white mountain that used to float in the corner."""
    s = k.clear(prs.slides[-1])
    k._set_bg(s, k.INK)

    k.rule(s, 0.55, k.FOOT_Y, 12.24, "1E4A63")
    s.shapes.add_picture(maxdock_icon, k._emu(0.55), k._emu(7.16),
                         k._emu(0.16), k._emu(0.16))
    k.text(s, 0.78, 7.14, 1.30, 0.20, "MaxDock", size=9, color="7FA3B8")
    k.text(s, 6.42, 7.14, 0.50, 0.20, "36", size=9, color="7FA3B8", align="c")
    k.text(s, 11.00, 7.14, 1.78, 0.20, "MAX SOLUTIONS", size=9, color="7FA3B8",
           bold=True, align="r", spc=60)

    s.shapes.add_picture(maxdock_icon, k._emu(0.78), k._emu(0.86),
                         k._emu(0.60), k._emu(0.60))
    k.text(s, 0.78, 1.62, 6.20, 0.50, "MaxDock", size=26, color=k.WHITE,
           bold=True, font=k.DISPLAY)
    k.text(s, 0.78, 2.34, 6.60, 0.80, "Built, not proposed.", size=36,
           color=k.WHITE, bold=True, font=k.DISPLAY)
    k.text(s, 0.78, 3.34, 6.30, 0.70,
           "Where it lives, who uses it first, and how we send the emails.",
           size=15, color="8FB3C7", line_spacing=1.22)

    k.rule(s, 0.78, 4.32, 6.30, color="1E4A63")
    k.text(s, 0.78, 4.54, 6.30, 0.24, "WHAT HAPPENS NEXT", size=11,
           color=k.CYAN, bold=True, spc=90)
    steps = [
        "Pick one plant to run it properly for a month",
        "Choose a mail provider, and the emails switch on",
        "Fix the address it lives at, before the app is installed",
    ]
    for i, line in enumerate(steps):
        y = 4.98 + i * 0.52
        k.text(s, 0.78, y, 0.30, 0.30, str(i + 1), size=13, color=k.CYAN,
               bold=True)
        k.text(s, 1.20, y, 5.90, 0.30, line, size=13, color=k.WHITE)

    k.vrule(s, 7.68, 1.35, 5.05, color=k.CYAN, weight=4)
    k.text(s, 8.18, 2.05, 4.30, 1.70,
           ["Freight arrives", "when we say", "it will."], size=23,
           color=k.WHITE, bold=True, font=k.DISPLAY, line_spacing=1.2)

    k.rect(s, 8.18, 4.50, 4.35, 1.90, fill=k.WHITE, line=None,
           radius=k.CARD_RADIUS)
    s.shapes.add_picture(max_solutions_lockup, k._emu(8.71), k._emu(4.77),
                         k._emu(3.30), k._emu(1.357))
    return s


def apply(prs, maxdock_icon, max_solutions_lockup):
    trim2(prs)
    for old, new in MULTI_TRIM:
        for slide in prs.slides:
            for sh in slide.shapes:
                if sh.has_text_frame and sh.text_frame.text == old:
                    k.set_text(sh, new)
    scale(prs)
    screen_mock_type(prs.slides[8])
    # the title page is drawn after the scale, at its own final sizes
    title_page(prs, maxdock_icon, max_solutions_lockup)
    closing_page(prs, maxdock_icon, max_solutions_lockup)
    return refit(prs)


# --------------------------------------------------------------- the trim ---
# Bigger type has to be paid for in words. These are the lines that still ran
# long once everything stepped up a size.
TRIM2 = [
    ("Where MaxDock came from: one plant, one morning, written down as it "
     "happened.",
     "Where MaxDock came from: one plant, one morning."),
    ("It started as a list of what kept going wrong at the dock.",
     "A list of what kept going wrong at the dock."),
    ("Under all six: a day of calls and emails rebuilding a schedule nobody "
     "could see.",
     "Under all six: a day of calls rebuilding a schedule nobody could see."),
    ("of truck stops end in detention. ATRI blames scheduling, staffing and "
     "dock space.",
     "of truck stops end in detention — ATRI blames scheduling, staffing and "
     "dock space."),
    ("Five things a dock schedule has to do. Four were not being done. The "
     "fifth, nobody does.",
     "Five things a schedule has to do. Four were not done here. The fifth, "
     "nobody does."),
    ("Nobody's fault. It is what happens when the dock is booked by whoever "
     "picks up the phone.",
     "It is what happens when the dock is booked by whoever picks up the "
     "phone."),
    ("Somebody says yes on the phone. The record is in one person's head, and "
     "that person is off tomorrow.",
     "Somebody says yes on the phone. The record is in one head — and they are "
     "off tomorrow."),
    ("It cannot check the door, the trailer or the floor. It accepts whatever "
     "is typed into it.",
     "It cannot check the door, the trailer or the floor. It takes whatever is "
     "typed in."),
    ("Suppliers and carriers book their own slot against each plant's real "
     "rules. Everything in this deck works today.",
     "Suppliers book their own slot against each plant's real rules. "
     "Everything here works today."),
    ("It refreshes on its own, so a wall display is always current. Drag a "
     "load to another door and the rules travel with it.",
     "It refreshes on its own, so a wall display stays current. Drag a load to "
     "another door and the rules travel with it."),
    ("MaxDock spots two loads going the same way on the same day, and offers "
     "to merge them.",
     "Two loads going the same way on the same day. MaxDock offers to merge "
     "them."),
    ("Both numbers are kept, and the merged booking records what each load put "
     "on the truck.",
     "Both numbers are kept, and the merged booking records what each load "
     "put on."),
    ("The difference between a suggestion a coordinator takes and one they "
     "learn to ignore.",
     "The difference between a suggestion they take and one they learn to "
     "ignore."),
    ("Half of what we move is ours going to ourselves — two phone calls, two "
     "diary entries.",
     "Half of what we move is ours going to ourselves."),
    ("However a booking is created, it meets the same rules. The bridge to TMS "
     "and CABL is in build.",
     "However a booking is created, it meets the same rules."),
    ("A customer, vendor or carrier signs in and books against that plant's "
     "real rules.",
     "The booker signs in and books against that plant's real rules."),
    ("Skids, trailer, handling. MaxDock works out how long the door is held, "
     "from that plant's own rules.",
     "Skids, trailer, handling. MaxDock works out how long the door is held."),
    ("Only times that genuinely work are offered. Nothing that would be "
     "refused ever appears.",
     "Only times that genuinely work are offered."),
    ("A reference and a QR code, shareable to any driver. If a load could "
     "share the truck, it says so here.",
     "A reference and a QR code, shareable to any driver."),
    ("Step one of three. Pick the site and the load; MaxDock works out the "
     "door time.",
     "Step one of three. Pick the site and the load."),
    ("Thursday at Mississauga starts with twenty half-hour slots. Six of them "
     "are real.",
     "Thursday starts with twenty half-hour slots. Six are real."),
    ("Every filter is a setting the site controls: hours, notice, trailer fit, "
     "floor space.",
     "Every filter is a setting the site controls."),
    ("Installs on any phone. Scan the QR on the paperwork, see the load, tap "
     "where it got to.",
     "Installs on any phone. Scan the QR, see the load, tap where it got to."),
    ("Big targets: one-handed, beside a running truck, in gloves, in February.",
     "Big targets: one-handed, in gloves, in February."),
    ("Arrival, start, finish. That is where every report in this deck comes "
     "from.",
     "Arrival, start, finish. Every report comes from these."),
    ("The same app, on any phone the crew already carries. Nothing to buy.",
     "On any phone the crew already carries. Nothing to buy."),
    ("Scanned in at the door. Everything the crew needs, and one thing to do.",
     "Everything the crew needs, and one thing to do."),
    ("Site, door, booked window, direction, company, carrier, trailer, skids, "
     "and BOL.",
     "Site, door, window, direction, company, carrier, trailer, skids, BOL."),
    ("At the dock, Loading, Shipped. Three taps, and each one is a timestamp.",
     "At the dock, Loading, Shipped. Each tap is a timestamp."),
    ("The pattern: where MaxDock knows something the person does not, it says "
     "the specific thing.",
     "Where MaxDock knows something the person does not, it says the specific "
     "thing."),
    ("Scan a Guelph load while standing at Mississauga, and the phone says so "
     "by name. The old answer sent somebody to the office while the truck "
     "waited.",
     "Scan a Guelph load at Mississauga and the phone says so by name. The old "
     "answer sent somebody to the office."),
    ("A truck at the wrong site has a real answer, and it belongs to the "
     "person standing there.",
     "A truck at the wrong site has a real answer. It belongs to the person "
     "standing there."),
    ("A refusal names the rule. A wrong site names the site. A full floor says "
     "how many positions are left.",
     "A refusal names the rule. A full floor says how many positions are "
     "left."),
    ("Others cap trucks per hour. That means nothing when one carries 4 skids "
     "and the next carries 30.",
     "Others cap trucks per hour. That means nothing when one carries 4 skids "
     "and the next 30."),
    ("Inbound adds skids to the floor, outbound takes them away. MaxDock runs "
     "that sum through the day.",
     "Inbound adds skids to the floor, outbound takes them away. MaxDock runs "
     "the sum forward."),
    ("The next load is 26 skids and 18 positions are left, so Thursday never "
     "appears on the booker's screen.",
     "26 skids, 18 positions left — so Thursday never reaches the booker's "
     "screen."),
    ("No floor number set, no check. Nothing is blocked by a number nobody "
     "entered.",
     "No floor number set, no check. Nothing is blocked by a missing number."),
    ("Nine reports across any set of plants. The one that matters most is the "
     "simplest.",
     "Nine reports, any set of plants. The one that matters is the simplest."),
    ("Built from taps the crew already made. Nobody keys in a figure, so "
     "nobody can improve one.",
     "Built from taps the crew already made. Nobody keys in a figure."),
    ("It doubles as adoption: 69% coverage says as much about the site as "
     "about its carriers.",
     "It doubles as adoption: 69% says as much about the site as its "
     "carriers."),
    ("When a day gets chaotic, scanning is the first thing skipped — which is "
     "exactly when the figure would flatter us.",
     "Scanning is the first thing skipped on a chaotic day — exactly when the "
     "figure would flatter us."),
    ("Any set of sites, any date range, nine views. Every figure here came "
     "from a booking made and a truck scanned.",
     "Any sites, any dates, nine views. Every figure came from a booking and a "
     "scan."),
    ("Trucks, skids and booked hours per day, so a bad week is visible as a "
     "shape.",
     "Trucks, skids and hours per day. A bad week is visible as a shape."),
    ("What the site took in versus what it sent out, and what that left on the "
     "floor.",
     "What came in against what went out, and what that left on the floor."),
    ("A report may only use facts the software already collected while people "
     "did their jobs.",
     "A report may only use facts the software already had."),
    ("MaxDock already knows how long each load holds a door. Multiply by the "
     "crew a truck needs, and that is labour hours per day.",
     "MaxDock knows how long each load holds a door. Multiply by the crew a "
     "truck needs."),
    ("Not the total — the shape. Which hours are jammed, and which doors sit "
     "idle beside them.",
     "Not the total — the shape. Which hours jam, and which doors sit idle."),
    ("Before spending money on more doors, this says whether the doors were "
     "ever the constraint.",
     "Before paying for more doors: were the doors ever the constraint?"),
    ("Four more screens, all working, none of which needed a slide of their "
     "own.",
     "Four more screens, all working, none needing a slide of its own."),
    ("All four are role-aware: a coordinator, a customer and a carrier each "
     "see a different screen, enforced in the database.",
     "A coordinator, a customer and a carrier each see a different screen — "
     "enforced in the database."),
    ("Not done badly. Not done at all, because there was nowhere to do them.",
     "Not done badly — not done at all, because there was nowhere to do "
     "them."),
    ("The basics that turn “who remembers?” into “open it and check.”",
     "What turns “who remembers?” into “open it and check.”"),
    ("Established products treat every site as an island, and never look "
     "inside the trailer.",
     "They treat every site as an island, and never look inside the trailer."),
    ("Yard management is a deliberate omission, not a shortfall. We have no "
     "gate and no yard to manage.",
     "Yard management is a deliberate omission. We have no gate and no yard."),
    ("A guide for discussion, from published material — not a procurement "
     "assessment.",
     "From published material, for discussion — not a procurement "
     "assessment."),
    ("They all schedule doors. MaxDock schedules the load, the trailer, the "
     "floor and the plant-to-plant move as one system.",
     "They all schedule doors. MaxDock schedules the load, the trailer, the "
     "floor and the plant-to-plant move."),
    ("No licence, no per-plant subscription, no vendor to renegotiate with. "
     "The trade: the capability lives with us.",
     "No licence, no subscription, no vendor. The trade: the capability lives "
     "with us."),
    ("In build and heading for test. This is what makes an appointment create "
     "itself.",
     "In build and heading for test. This is what makes a booking create "
     "itself."),
    ("For the driver with no app and no account, at a plant for the first "
     "time.",
     "For the driver with no app and no account."),
    ("Book it, scan it, complete it, read the report. Nothing to build first.",
     "Book it, scan it, complete it, read the report."),
    ("No gate, no yard. The truck arrives at the door, so the door is where we "
     "start.",
     "No gate, no yard. The truck arrives at the door, so that is where we "
     "start."),
    ("Same reason. A gate we do not have cannot produce a clock start we can "
     "trust.",
     "A gate we do not have cannot give us a clock start we trust."),
    ("No gate means no honest clock start, and GTA traffic argues with the "
     "number.",
     "No honest clock start, and GTA traffic argues with the number."),
    ("Recorded, and released by hand. A penalty nobody trusts is a penalty "
     "nobody uses.",
     "Recorded, released by hand. A penalty nobody trusts is one nobody uses."),
    ("The second list matters as much as the first. It keeps the system "
     "pointed at our problem.",
     "The second list matters as much as the first. It keeps us pointed at our "
     "problem."),
    ("Everything in this deck already works. What is left is deciding.",
     "Everything here already works. What is left is deciding."),
    ("Unlocks confirmations, changes, cancellations and the people CC'd on a "
     "booking.",
     "Unlocks confirmations, changes, cancellations and the people CC'd."),
    ("The app installs against a fixed address. Move it later and every icon "
     "breaks.",
     "The app installs against a fixed address. Move it later, every icon "
     "breaks."),
    ("Coordinators, managers, and the companies who will book. Six accounts "
     "exist today.",
     "Coordinators, managers, and the companies who book. Six accounts exist "
     "today."),
    ("One site running it properly for a month teaches more than twelve "
     "half-doing it.",
     "One site running it properly for a month beats twelve half-doing it."),
    ("Three of the five are one conversation with IT. The last one needs a "
     "name against it.",
     "Three of the five are one conversation with IT. The last needs a name "
     "against it."),
    ("What is left is where it lives, who uses it first, and how we send the "
     "emails.",
     "Where it lives, who uses it first, and how we send the emails."),
]


def trim2(prs):
    for old, new in TRIM2:
        hits = [sh for s in prs.slides for sh in s.shapes
                if sh.has_text_frame and sh.text_frame.text == old]
        if len(hits) != 1:
            raise LookupError(f"{len(hits)} shapes matched: {old[:60]}...")
        k.set_text(hits[0], new)
