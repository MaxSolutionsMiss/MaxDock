#!/usr/bin/env python3
"""Build MaxDock_introduction_v6.pptx from the v4.1 deck.

What this does, in order:

  1. fixes the layout defects in the v4.1 slides — text outside its box, a bar
     drawn over its caption, a column running off the grid;
  2. rebuilds the bridge slide, which had everything in the top half;
  3. runs the v6 pass over every inherited slide (v6_polish): shorter copy,
     wider gutters, more air under each block;
  4. draws the four slides this deck did not have, already at v6 spacing;
  5. places them and renumbers every footer.

Run:  python3 scripts/deck/build_deck.py
"""
import os
import sys

from pptx import Presentation

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import deckkit as k  # noqa: E402
import v6_polish  # noqa: E402

SRC = os.path.join(HERE, "..", "..", "docs", "deck",
                   "MaxDock_introduction_v4_1.pptx")
V5 = os.path.join(HERE, "..", "..", "docs", "deck",
                  "MaxDock_introduction_v5.pptx")
OUT = os.path.join(HERE, "..", "..", "docs", "deck",
                   "MaxDock_introduction_v6.pptx")
LOGO = os.path.join(HERE, "assets", "footer-logo.png")


# --------------------------------------------------------------- slide: 2 ---
def slide_origin(prs):
    """How the idea started: one ordinary morning, told in the order it ran."""
    s = k.new_slide(
        prs,
        "HOW THIS STARTED",
        "One Tuesday morning, and none of it was unusual.",
        "Where MaxDock came from: one plant, one morning, written down as it "
        "happened.",
        LOGO)

    moments = [
        ("06:40", "A truck at the gate nobody expected",
         "Nothing on paper said it was coming."),
        ("07:15", "Two more, in the same fifteen minutes",
         "Four doors free, two people on shift. Doors were never the problem."),
        ("09:20", "The lot backs up, and the clock runs",
         "The 06:40 truck is still waiting. Waiting gets billed back to us."),
        ("11:00", "Guelph asks where their skids are",
         "Half a trailer went Tuesday. The rest is booked for Thursday."),
        ("15:30", "The day gets written up from memory",
         "Whoever answered the phone is the only record."),
    ]
    top, step = 1.86, 0.96
    for i, (when, title, sub) in enumerate(moments):
        y = top + i * step
        k.chip(s, 0.58, y, 0.86, 0.30, when, fill=k.BLUE_TINT, color=k.BLUE,
               size=10)
        if i < len(moments) - 1:
            k.vrule(s, 1.00, y + 0.38, step - 0.46, color=k.LINE, weight=1.2)
        k.text(s, 1.66, y - 0.01, 6.30, 0.32, title, size=12.5, color=k.INK,
               bold=True, font=k.DISPLAY)
        k.text(s, 1.66, y + 0.34, 6.30, 0.28, sub, size=10.5, color=k.BODY)

    k.card(s, 8.65, top, 4.10, 4.46, fill=k.INK, line=None)
    k.text(s, 9.03, top + 0.26, 3.34, 0.22, "WHAT THAT MORNING COST", size=9,
           color=k.CYAN, bold=True, spc=90)
    costs = [
        ("Three trucks, two people",
         "Crew set a week earlier, against a day nobody could see."),
        ("An hour and forty of waiting",
         "Detention is billed by the hour, and it is billed to us."),
        ("Two half-empty trailers",
         "Same lane, same week. Two trucks, two freight bills."),
        ("A morning of phone calls",
         "Rebuilding a schedule that existed in three places."),
    ]
    for i, (figure, sub) in enumerate(costs):
        y = top + 0.72 + i * 0.93
        k.text(s, 9.03, y, 3.34, 0.28, figure, size=13, color=k.WHITE,
               bold=True, font=k.DISPLAY)
        k.text(s, 9.03, y + 0.32, 3.34, 0.44, sub, size=10, color=k.FAINT,
               line_spacing=1.14)

    k.text(s, 0.58, 6.60, 12.17, 0.30, [[
        ("The same six things kept coming back. ",
         {"bold": True, "color": k.INK}),
        ("They are the next slide.", {"color": k.BODY})]], size=11.5)
    return s


# --------------------------------------------------------------- slide: 5 ---
def slide_market(prs):
    """Why the products already on the market do not close our gap."""
    s = k.new_slide(
        prs,
        "WHY THE MARKET DID NOT SOLVE IT",
        "We were not the first to notice.",
        "Each of them started with a problem we recognise. None of them "
        "started with ours.",
        LOGO)

    cards = [
        ("Opendock", "THE PROBLEM IT WAS BUILT FOR",
         "Docks run by phone, email and spreadsheet — and nobody else can see "
         "any of it.",
         "They cite ATRI: 39.3% of stops end in detention.",
         ["Appointments kept.", "Detention avoided."], False),
        ("C3 Solutions", "THE PROBLEM IT WAS BUILT FOR",
         "Trailers sitting, yards jamming, and detention charged for the wait.",
         "Their own claim: up to 90% less detention.",
         ["Dwell time.", "Yard and door use."], False),
        ("Transporeon", "THE PROBLEM IT WAS BUILT FOR",
         "Arrivals bunched into peaks: trucks queue at ten, doors sit idle at "
         "two.",
         "Their own claim: up to 40% less waiting.",
         ["Waiting time.", "How flat the day runs."], False),
        ("MaxDock", "THE PROBLEM WE BUILT FOR",
         "All three of those — plus two of our own trailers going the same "
         "way, half empty.",
         "Our own run: two bookings, one truck, 88% full.",
         ["Trucks removed.", "Skids per trailer, crew hours."], True),
    ]
    w, gap, top, h = 2.76, 0.37, 1.80, 3.62
    for i, (name, label, problem, figure, measures, ours) in enumerate(cards):
        x = 0.58 + i * (w + gap)
        k.card(s, x, top, w, h, fill=k.INK if ours else k.WHITE,
               line=None if ours else k.LINE)
        k.text(s, x + 0.30, top + 0.28, w - 0.60, 0.34, name, size=15,
               color=k.WHITE if ours else k.INK, bold=True, font=k.DISPLAY)
        k.rule(s, x + 0.30, top + 0.78, w - 0.60,
               color=k.NAVY_RULE if ours else k.LINE)
        k.text(s, x + 0.30, top + 0.98, w - 0.60, 0.20, label, size=8,
               color=k.CYAN if ours else k.MUTED, bold=True, spc=60)
        k.text(s, x + 0.30, top + 1.26, w - 0.60, 0.96, problem, size=11,
               color=k.ICE if ours else k.BODY, line_spacing=1.18)
        k.text(s, x + 0.30, top + 2.06, w - 0.60, 0.40, figure, size=9.5,
               color=k.CYAN if ours else k.MUTED, italic=True,
               line_spacing=1.16)
        k.rect(s, x + 0.30, top + 2.56, w - 0.60, 0.80,
               fill="164A66" if ours else k.PANEL_SOFT, line=None,
               radius=k.CHIP_RADIUS)
        k.text(s, x + 0.48, top + 2.56, w - 0.96, 0.80,
               [[("WHAT IT MEASURES", {"size": 8, "bold": True,
                                       "color": k.CYAN if ours else k.MUTED,
                                       "spc": 60})]] + measures,
               size=10, color=k.WHITE if ours else k.BODY, anchor="m",
               line_spacing=1.16)

    k.card(s, 0.58, 5.92, 12.17, 1.00, fill=k.INK, line=None)
    k.text(s, 1.00, 6.10, 4.40, 0.64, "All three schedule the arrival.",
           size=15, color=k.WHITE, bold=True, font=k.DISPLAY, anchor="m")
    k.vrule(s, 5.90, 6.16, 0.52, color=k.NAVY_RULE, weight=1.2)
    k.text(s, 6.30, 6.10, 6.05, 0.64,
           "Only one of them also decides what goes on the truck — because "
           "here, both ends are the same company.",
           size=11.5, color=k.ICE, anchor="m", line_spacing=1.16)
    return s


# -------------------------------------------------------------- slide: 26 ---
def slide_week(prs):
    """The forward view: labour set against what is already booked."""
    s = k.new_slide(
        prs,
        "PLANNING THE WEEK, NOT THE DAY",
        "What next Thursday looks like, before next Thursday.",
        "Bookings exist days ahead, so the crew can be set against them.",
        LOGO)

    k.text(s, 0.58, 1.72, 7.54, 0.24,
           "DOCK HOURS BOOKED AGAINST CREW HOURS · MISSISSAUGA · NEXT WEEK",
           size=9, color=k.MUTED, bold=True, spc=60)

    days = [
        ("MON", 29.0, 38.4, "8 trucks"),
        ("TUE", 34.0, 38.4, "11 trucks"),
        ("WED", 21.0, 38.4, "6 trucks"),
        ("THU", 33.0, 30.4, "10 trucks"),
        ("FRI", 26.0, 38.4, "7 trucks"),
    ]
    cw, cgap, ctop, ch = 1.30, 0.26, 2.12, 2.94
    track_top, track_h = ctop + 0.70, 1.44
    for i, (day, booked, crew, trucks) in enumerate(days):
        x = 0.58 + i * (cw + cgap)
        pct = booked / crew
        over = pct > 1.0
        near = 0.85 < pct <= 1.0
        colour = k.RED if over else (k.AMBER if near else k.GREEN)
        tint = k.RED_TINT if over else (k.AMBER_TINT if near else k.GREEN_TINT)
        k.card(s, x, ctop, cw, ch)
        k.text(s, x, ctop + 0.24, cw, 0.24, day, size=11, color=k.INK,
               bold=True, align="c", spc=60, font=k.DISPLAY)
        k.text(s, x, ctop + 0.46, cw, 0.20, trucks, size=9.5, color=k.MUTED,
               align="c")
        k.rect(s, x + 0.45, track_top, 0.40, track_h, fill=k.PANEL, line=None,
               radius=0.03)
        fh = min(pct, 1.0) * track_h
        k.rect(s, x + 0.45, track_top + track_h - fh, 0.40, fh, fill=colour,
               line=None, radius=0.03)
        k.text(s, x, ctop + 2.28, cw, 0.24, f"{booked:.0f} of {crew:.1f} h",
               size=10, color=k.INK, bold=True, align="c")
        k.chip(s, x + 0.30, ctop + 2.56, cw - 0.60, 0.26, f"{pct * 100:.0f}%",
               fill=tint, color=k.RED_DARK if over else
               (k.AMBER_DARK if near else k.GREEN_DARK), size=9.5)

    k.text(s, 0.58, 5.34, 7.54, 0.50,
           [[("Thursday is full before it is booked. ",
              {"bold": True, "color": k.INK}),
             ("One person is off, so the crew has 30.4 hours and the schedule "
              "holds 33.", {})]],
           size=11, color=k.BODY, line_spacing=1.16)

    k.card(s, 8.45, 2.12, 4.30, 3.72)
    k.text(s, 8.80, 2.40, 3.60, 0.24, "SO THE DAY GETS PROTECTED", size=9,
           color=k.BLUE, bold=True, spc=90)
    controls = [
        ("A standing limit",
         "How many trucks a site takes at once, whatever the door count says."),
        ("A cap for one date",
         "Tighten Thursday alone, and leave the rest of the week as it is."),
        ("Statutory holidays",
         "Chosen once per site, then closed across every door, years ahead."),
    ]
    for i, (title, body) in enumerate(controls):
        y = 2.84 + i * 1.02
        k.rect(s, 8.80, y + 0.05, 0.16, 0.16, fill=k.BLUE, line=None,
               radius=0.03)
        k.text(s, 9.12, y, 3.28, 0.26, title, size=12.5, color=k.INK,
               bold=True, font=k.DISPLAY)
        k.text(s, 9.12, y + 0.32, 3.28, 0.56, body, size=10.5, color=k.BODY,
               line_spacing=1.16)

    k.card(s, 0.58, 6.06, 12.17, 0.86, fill=k.INK, line=None)
    k.text(s, 1.00, 6.20, 11.35, 0.58,
           "A Thursday the floor cannot staff is a Thursday the booking screen "
           "never offers.", size=12.5, color=k.WHITE, bold=True, anchor="m")
    return s


# ------------------------------------------- fixes to the v4.1 slides ------
def fix_overflows(prs):
    """Four text boxes in v4.1 hold more lines than their height allows, so
    the last line sits outside the shape. Give each one the room it needs."""
    problems = prs.slides[1]                       # the six problems
    for x in (1.50, 5.64, 9.78):
        for y in (2.02, 4.08):
            k.move(k.find(problems, x, y), h=0.60)

    three_places = prs.slides[3]                   # phone, spreadsheet, board
    for x in (0.96, 5.11, 9.26):
        k.move(k.find(three_places, x, 4.86), h=0.46)

    compare = prs.slides[26]                       # where MaxDock differs
    k.move(k.find(compare, 0.96, 6.32), y=6.28, h=0.54)

    out_of_scope = prs.slides[30]                  # deliberately out of scope
    for x in (0.96, 7.21):
        k.move(k.find(out_of_scope, x, 4.76), y=4.72, h=0.58)
        k.move(k.find(out_of_scope, x, 5.30), y=5.34)


def unstack_trailer_bars(prs):
    """On slide 10 the second capacity bar sat on top of its own caption, so
    '48 ft holds 24' was struck through. Lift both bars clear of it, and let
    the two message cards use the space left at the foot of the slide."""
    s = prs.slides[9]
    for sh in list(s.shapes):
        if sh.left is None:
            continue
        x, y = sh.left / 914400, sh.top / 914400
        if abs(x - 0.90) < 0.01 and abs(y - 3.86) < 0.01:
            k.move(sh, y=3.78)
        elif abs(x - 0.90) < 0.01 and abs(y - 4.11) < 0.01:
            k.move(sh, y=4.02)
        elif abs(x - 3.72) < 0.01 and abs(y - 3.82) < 0.01:
            k.move(sh, y=3.74, h=0.52)
    for x in (0.58, 6.85):
        k.move(k.find(s, x, 4.86), h=1.32)
    k.move(k.find(s, 0.58, 6.28), y=6.52)


def align_phone_callouts(prs):
    """On slide 17 the right-hand column ran to within 0.13in of the slide
    edge, while every other slide stops at 12.75. Pull it back onto the grid."""
    s = prs.slides[16]
    for y in (1.72, 4.32):
        k.move(k.find(s, 5.15, y), w=3.62)
        k.move(k.find(s, 9.35, y), x=9.13, w=3.62)
    for y in (2.04, 4.64):
        k.move(k.find(s, 9.67, y), x=9.45)
    for y in (2.50, 3.02, 5.10, 5.62):
        k.move(k.find(s, 5.47, y), w=2.98)
        k.move(k.find(s, 9.67, y), x=9.45, w=2.98)


def fill_replaces_column(prs):
    """Slide 5's left column stopped half way down the slide. A fourth thing
    MaxDock replaces closes the gap, and the paragraph moves under it."""
    s = prs.slides[4]
    k.rect(s, 0.58, 4.28, 5.35, 0.60, fill="E9EFF4", line=None,
           radius=k.CHIP_RADIUS)
    k.text(s, 0.86, 4.40, 1.90, 0.36, "Email chains", size=12.5, color=k.INK,
           bold=True)
    k.text(s, 2.78, 4.42, 3.00, 0.34, "Answered twice, filed nowhere",
           size=10.5, color=k.MUTED)
    k.move(k.find(s, 0.58, 4.42, tol=0.005), y=5.06, h=0.76)


def rebuild_bridge(prs):
    """Slide 12 put four small cards in the top half and left the bottom bare.
    Redrawn as what it actually is: four ways a booking arrives, one set of
    rules in the middle, one board at the end."""
    s = k.frame(
        k.clear(prs.slides[11]),
        "WHERE THIS IS GOING",
        "The appointment books itself.",
        "However a booking is created, it meets the same rules. The bridge to "
        "TMS and CABL is in build.",
        LOGO)

    col_label = dict(size=9, color=k.MUTED, bold=True, spc=60)
    k.text(s, 0.58, 1.74, 3.20, 0.22, "WHERE A BOOKING COMES FROM", **col_label)
    k.text(s, 4.66, 1.74, 3.22, 0.22, "WHAT CHECKS IT", **col_label)
    k.text(s, 8.60, 1.74, 4.15, 0.22, "WHERE IT LANDS", **col_label)

    sources = [
        ("Customer or carrier", "Live today", k.GREEN_TINT, k.GREEN_DARK),
        ("Coordinator", "Live today", k.GREEN_TINT, k.GREEN_DARK),
        ("TMS", "In build", k.AMBER_TINT, k.AMBER_DARK),
        ("CABL", "In build", k.AMBER_TINT, k.AMBER_DARK),
    ]
    top, ch, gap = 2.08, 0.70, 0.26
    for i, (name, status, tint, ink) in enumerate(sources):
        y = top + i * (ch + gap)
        k.card(s, 0.58, y, 3.20, ch)
        k.text(s, 0.86, y, 1.70, ch, name, size=12.5, color=k.INK, bold=True,
               anchor="m", font=k.DISPLAY)
        k.chip(s, 2.60, y + 0.20, 1.00, 0.30, status, fill=tint, color=ink,
               size=9)
        k.rule(s, 3.78, y + ch / 2, 0.42)

    k.vrule(s, 4.20, top + ch / 2, 3 * (ch + gap))
    k.rule(s, 4.20, 3.86, 0.46)

    k.card(s, 4.66, top, 3.22, 3.58, fill=k.INK, line=None)
    k.text(s, 5.00, top + 0.36, 2.54, 0.44, "MaxDock", size=20, color=k.WHITE,
           bold=True, font=k.DISPLAY)
    k.text(s, 5.00, top + 0.90, 2.54, 0.24, "CHECKS THE RULES, HOLDS THE DOOR",
           size=8, color=k.CYAN, bold=True, spc=60)
    k.rule(s, 5.00, top + 1.26, 2.54, color=k.NAVY_RULE)
    checks = [
        "The plant's own duration rules, not a fixed hour",
        "A door that is free, fits the trailer, has floor space",
        "One reference and one QR code, whatever created it",
    ]
    for i, line in enumerate(checks):
        y = top + 1.54 + i * 0.66
        k.rect(s, 5.00, y + 0.06, 0.13, 0.13, fill=k.CYAN, line=None,
               radius=0.02)
        k.text(s, 5.30, y, 2.24, 0.54, line, size=10.5, color=k.ICE,
               line_spacing=1.16)

    k.rule(s, 7.88, 3.86, 0.72)
    k.card(s, 8.60, top, 4.15, 3.58)
    k.text(s, 8.94, top + 0.36, 3.47, 0.44, "One dock board", size=20,
           color=k.INK, bold=True, font=k.DISPLAY)
    k.text(s, 8.94, top + 0.94, 3.47, 0.56,
           "Typed by a supplier, by a coordinator, or created by the bridge.",
           size=11, color=k.BODY, line_spacing=1.16)
    k.rule(s, 8.94, top + 1.72, 3.47)
    lands = ["It lands under the same rules", "On the same board and queue",
             "With the same audit history"]
    for i, line in enumerate(lands):
        y = top + 1.98 + i * 0.52
        k.rect(s, 8.94, y + 0.05, 0.13, 0.13, fill=k.GREEN, line=None,
               radius=0.02)
        k.text(s, 9.26, y, 3.15, 0.28, line, size=11, color=k.INK)

    k.card(s, 0.58, 6.02, 12.17, 0.90, fill=k.INK, line=None)
    k.text(s, 1.00, 6.18, 11.35, 0.58,
           [[("MaxDock does not wait for the bridge. ",
              {"bold": True, "color": k.WHITE}),
             ("The bridge removes the typing; it does not switch the product "
              "on.", {"color": k.ICE})]],
           size=12.5, anchor="m")
    return s


# ------------------------------------------------------------------ build ---
def main():
    prs = Presentation(SRC)

    # Everything below addresses the v4.1 slides by their v4.1 position, so it
    # has to happen before the new slides are inserted.
    fix_overflows(prs)
    unstack_trailer_bars(prs)
    align_phone_callouts(prs)
    fill_replaces_column(prs)
    rebuild_bridge(prs)

    # The v6 pass: shorter copy and more air, across every inherited slide.
    v6_polish.apply(prs)

    origin = slide_origin(prs)
    market = slide_market(prs)
    week = slide_week(prs)

    # New slides land at the end of the deck; move each one into place.
    k.place(prs, origin, 1)    # after the title
    k.place(prs, market, 4)    # after "no discipline, nothing to measure"
    k.place(prs, week, 25)     # after the labour and door-use report

    k.renumber(prs)
    prs.save(OUT)
    print(f"wrote {OUT} — {len(prs.slides._sldIdLst)} slides")


if __name__ == "__main__":
    main()
