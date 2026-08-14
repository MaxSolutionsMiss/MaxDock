#!/usr/bin/env python3
"""Build MaxDock_introduction_v5.pptx from the v4.1 deck.

What this does, in order:

  1. adds three slides the v4.1 deck did not have — the morning the idea came
     from, why the products already on the market do not solve it, and the
     week-ahead labour view;
  2. rebuilds two slides whose content sat in the top half and left the bottom
     empty;
  3. fixes the text boxes that overflowed their shape;
  4. puts the new slides in place and renumbers every footer.

Run:  python3 scripts/deck/build_deck.py
"""
import os
import sys

from pptx import Presentation

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import deckkit as k  # noqa: E402

SRC = os.path.join(HERE, "..", "..", "docs", "deck",
                   "MaxDock_introduction_v4_1.pptx")
OUT = os.path.join(HERE, "..", "..", "docs", "deck",
                   "MaxDock_introduction_v5.pptx")
LOGO = os.path.join(HERE, "assets", "footer-logo.png")


# --------------------------------------------------------------- slide: 2 ---
def slide_origin(prs):
    """How the idea started: one ordinary morning, told in the order it ran."""
    s = k.new_slide(
        prs,
        "HOW THIS STARTED",
        "One Tuesday morning, and none of it was unusual.",
        "This is where MaxDock came from — not a plan for software, a morning "
        "at one plant written down as it happened.",
        LOGO)

    moments = [
        ("06:40", "A truck at the gate nobody expected",
         "Nothing in writing said it was coming, so nothing had been planned for it."),
        ("07:15", "Two more, inside the same fifteen minutes",
         "Four doors free and two people on shift. The doors were never the constraint."),
        ("09:20", "The lot backs up, and the clock is running",
         "The 06:40 truck is still waiting, and waiting gets charged back to us."),
        ("11:00", "Guelph asks where their skids are",
         "Half a trailer went Tuesday. The other half is booked to go Thursday."),
        ("15:30", "The day gets written up from memory",
         "Whoever answered the phone is the only record of what was agreed."),
    ]
    top, step = 1.84, 0.92
    for i, (when, title, sub) in enumerate(moments):
        y = top + i * step
        k.chip(s, 0.58, y, 0.86, 0.30, when, fill=k.BLUE_TINT, color=k.BLUE,
               size=10)
        if i < len(moments) - 1:
            k.vrule(s, 1.00, y + 0.36, step - 0.42, color=k.LINE, weight=1.2)
        k.text(s, 1.62, y - 0.01, 6.55, 0.32, title, size=12.5, color=k.INK,
               bold=True, font=k.DISPLAY)
        k.text(s, 1.62, y + 0.34, 6.55, 0.28, sub, size=10.5, color=k.BODY)

    k.card(s, 8.55, 1.84, 4.20, 4.30, fill=k.INK, line=None)
    k.text(s, 8.90, 2.08, 3.50, 0.22, "WHAT THAT MORNING COST", size=9,
           color=k.CYAN, bold=True, spc=90)
    costs = [
        ("Three trucks, two people",
         "The crew was set a week earlier, against a day nobody could see yet."),
        ("An hour and forty of waiting",
         "The first truck arrived before anyone knew it existed. Detention is "
         "billed by the hour."),
        ("Two half-empty trailers",
         "Same lane, same week, two separate trucks, two freight charges paid "
         "in full."),
        ("A morning of phone calls",
         "Spent rebuilding a schedule that already existed in three places."),
    ]
    for i, (figure, sub) in enumerate(costs):
        y = 2.52 + i * 0.88
        k.text(s, 8.90, y, 3.50, 0.28, figure, size=13, color=k.WHITE,
               bold=True, font=k.DISPLAY)
        k.text(s, 8.90, y + 0.32, 3.50, 0.46, sub, size=10, color=k.FAINT,
               line_spacing=1.12)

    k.card(s, 0.58, 6.38, 12.17, 0.54, fill=k.WHITE)
    k.text(s, 0.94, 6.38, 11.45, 0.54, [[
        ("Written down over a few months, the same six things kept coming back. ",
         {"bold": True, "color": k.INK}),
        ("They are the next slide.", {"color": k.BODY})]],
        size=11.5, anchor="m", font=k.TEXT)
    return s


# --------------------------------------------------------------- slide: 5 ---
def slide_market(prs):
    """Why the products already on the market do not close our gap."""
    s = k.new_slide(
        prs,
        "WHY THE MARKET DID NOT SOLVE IT",
        "We were not the first to notice.",
        "Opendock, C3 Solutions and Transporeon each began with a problem we "
        "recognise. Not one of them began with ours.",
        LOGO)

    cards = [
        ("Opendock", "THE PROBLEM IT WAS BUILT FOR",
         "Dock coordination run on phone calls, emails and spreadsheets — "
         "impossible to scale, and invisible to everyone who needs it.",
         "The figure they cite: 39.3% of truck stops end in detention (ATRI).",
         ["Appointments kept.", "Detention avoided."], False),
        ("C3 Solutions", "THE PROBLEM IT WAS BUILT FOR",
         "Trailers sitting, yards congesting, and detention charged for the "
         "time a truck spent waiting to be dealt with.",
         "Their own claim: up to 90% less paid in detention.",
         ["Dwell time.", "Yard and door productivity."], False),
        ("Transporeon", "THE PROBLEM IT WAS BUILT FOR",
         "Arrivals bunching into peaks, so trucks queue at one hour of the day "
         "while doors stand idle at another.",
         "Their own claim: up to 40% less waiting at the door.",
         ["Waiting time.", "How flat the day runs."], False),
        ("MaxDock", "THE PROBLEM WE BUILT FOR",
         "All three of those — and two of our own trailers going the same way, "
         "half empty, two days apart, with nobody looking.",
         "Our own run: two bookings, one truck, 88% full.",
         ["Trucks removed.", "Skids per trailer, and crew hours."],
         True),
    ]
    w, gap, top, h = 2.86, 0.24, 1.76, 3.86
    for i, (name, label, problem, figure, measures, ours) in enumerate(cards):
        x = 0.58 + i * (w + gap)
        k.card(s, x, top, w, h, fill=k.INK if ours else k.WHITE,
               line=None if ours else k.LINE)
        k.text(s, x + 0.28, top + 0.26, w - 0.56, 0.34, name, size=15,
               color=k.WHITE if ours else k.INK, bold=True, font=k.DISPLAY)
        k.rule(s, x + 0.28, top + 0.76, w - 0.56,
               color=k.NAVY_RULE if ours else k.LINE)
        k.text(s, x + 0.28, top + 0.96, w - 0.56, 0.20, label, size=8,
               color=k.CYAN if ours else k.MUTED, bold=True, spc=60)
        k.text(s, x + 0.28, top + 1.24, w - 0.56, 1.32, problem, size=11,
               color=k.ICE if ours else k.BODY, line_spacing=1.16)
        k.text(s, x + 0.28, top + 2.22, w - 0.56, 0.42, figure, size=9.5,
               color=k.CYAN if ours else k.MUTED, italic=True,
               line_spacing=1.16)
        k.rect(s, x + 0.28, top + 2.76, w - 0.56, 0.86,
               fill="164A66" if ours else k.PANEL_SOFT, line=None,
               radius=k.CHIP_RADIUS)
        k.text(s, x + 0.46, top + 2.76, w - 0.92, 0.86,
               [[("WHAT IT MEASURES", {"size": 8, "bold": True,
                                       "color": k.CYAN if ours else k.MUTED,
                                       "spc": 60})]] + measures,
               size=10, color=k.WHITE if ours else k.BODY, anchor="m",
               line_spacing=1.14)

    k.card(s, 0.58, 5.94, 12.17, 0.98, fill=k.INK, line=None)
    k.text(s, 0.96, 6.12, 4.60, 0.62, "All three schedule the arrival.",
           size=15, color=k.WHITE, bold=True, font=k.DISPLAY, anchor="m")
    k.vrule(s, 5.90, 6.16, 0.54, color=k.NAVY_RULE, weight=1.2)
    k.text(s, 6.22, 6.12, 6.18, 0.62,
           "Only one of them also decides what goes on the truck — because at "
           "Max Solutions, both ends of the move are the same company.",
           size=11, color=k.ICE, anchor="m", line_spacing=1.14)
    return s


# -------------------------------------------------------------- slide: 26 ---
def slide_week(prs):
    """The forward view: labour set against what is already booked."""
    s = k.new_slide(
        prs,
        "PLANNING THE WEEK, NOT THE DAY",
        "What next Thursday looks like, before next Thursday.",
        "Bookings exist days ahead, so the crew can be set against them "
        "instead of after them.",
        LOGO)

    k.text(s, 0.58, 1.70, 7.55, 0.24, "DOCK HOURS BOOKED AGAINST CREW HOURS · "
           "MISSISSAUGA · NEXT WEEK", size=9, color=k.MUTED, bold=True, spc=60)

    days = [
        ("MON", 29.0, 38.4, "8 trucks"),
        ("TUE", 34.0, 38.4, "11 trucks"),
        ("WED", 21.0, 38.4, "6 trucks"),
        ("THU", 33.0, 30.4, "10 trucks"),
        ("FRI", 26.0, 38.4, "7 trucks"),
    ]
    cw, cgap, ctop, ch = 1.35, 0.19, 2.04, 3.00
    track_top, track_h = ctop + 0.66, 1.54
    for i, (day, booked, crew, trucks) in enumerate(days):
        x = 0.58 + i * (cw + cgap)
        pct = booked / crew
        over = pct > 1.0
        near = 0.85 < pct <= 1.0
        colour = k.RED if over else (k.AMBER if near else k.GREEN)
        tint = k.RED_TINT if over else (k.AMBER_TINT if near else k.GREEN_TINT)
        k.card(s, x, ctop, cw, ch)
        k.text(s, x, ctop + 0.22, cw, 0.24, day, size=11, color=k.INK,
               bold=True, align="c", spc=60, font=k.DISPLAY)
        k.text(s, x, ctop + 0.44, cw, 0.20, trucks, size=9.5, color=k.MUTED,
               align="c")
        k.rect(s, x + 0.47, track_top, 0.41, track_h, fill=k.PANEL, line=None,
               radius=0.03)
        fh = min(pct, 1.0) * track_h
        k.rect(s, x + 0.47, track_top + track_h - fh, 0.41, fh, fill=colour,
               line=None, radius=0.03)
        k.text(s, x, ctop + 2.34, cw, 0.24,
               f"{booked:.0f} of {crew:.1f} h", size=10, color=k.INK,
               bold=True, align="c")
        k.chip(s, x + 0.32, ctop + 2.62, cw - 0.64, 0.26, f"{pct * 100:.0f}%",
               fill=tint, color=k.RED_DARK if over else
               (k.AMBER_DARK if near else k.GREEN_DARK), size=9.5)

    k.text(s, 0.58, 5.24, 7.55, 0.50,
           [[("Thursday is over before it is booked. ",
              {"bold": True, "color": k.INK}),
             ("One person is off, so the crew has 30.4 hours and the schedule "
              "already holds 33.", {})]],
           size=11, color=k.BODY, line_spacing=1.16)

    k.card(s, 8.35, 1.70, 4.40, 4.00)
    k.text(s, 8.68, 1.96, 3.74, 0.24, "SO THE DAY GETS PROTECTED", size=9,
           color=k.BLUE, bold=True, spc=90)
    controls = [
        ("A standing limit", "How many trucks a site will take at once, "
         "whatever the door count says."),
        ("A cap for one date", "Tighten Thursday alone — at once, or for the "
         "whole day — and leave the rest of the week as it is."),
        ("Statutory holidays", "Chosen once per site, then computed and closed "
         "across every door, years ahead."),
    ]
    for i, (title, body) in enumerate(controls):
        y = 2.32 + i * 1.06
        k.rect(s, 8.68, y + 0.04, 0.16, 0.16, fill=k.BLUE, line=None,
               radius=0.03)
        k.text(s, 9.00, y, 3.42, 0.26, title, size=12.5, color=k.INK,
               bold=True, font=k.DISPLAY)
        k.text(s, 9.00, y + 0.32, 3.42, 0.60, body, size=10.5, color=k.BODY,
               line_spacing=1.16)

    k.card(s, 0.58, 5.90, 12.17, 1.02, fill=k.INK, line=None)
    k.text(s, 0.96, 6.08, 11.41, 0.66,
           [[("A Thursday the floor cannot staff is a Thursday the booking "
              "screen never offers. ", {"bold": True, "color": k.WHITE}),
             ("The forward view is what turns a time-off request into "
              "arithmetic instead of a conversation.", {"color": k.ICE})]],
           size=12, anchor="m", line_spacing=1.2)
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
        "TMS and CABL is in build and heading for test.",
        LOGO)

    col_label = dict(size=9, color=k.MUTED, bold=True, spc=60)
    k.text(s, 0.58, 1.70, 3.30, 0.22, "WHERE A BOOKING COMES FROM", **col_label)
    k.text(s, 4.62, 1.70, 3.30, 0.22, "WHAT CHECKS IT", **col_label)
    k.text(s, 8.62, 1.70, 4.13, 0.22, "WHERE IT LANDS", **col_label)

    sources = [
        ("Customer or carrier", "Live today", k.GREEN_TINT, k.GREEN_DARK),
        ("Coordinator", "Live today", k.GREEN_TINT, k.GREEN_DARK),
        ("TMS", "In build", k.AMBER_TINT, k.AMBER_DARK),
        ("CABL", "In build", k.AMBER_TINT, k.AMBER_DARK),
    ]
    top, ch, gap = 2.04, 0.76, 0.18
    for i, (name, status, tint, ink) in enumerate(sources):
        y = top + i * (ch + gap)
        k.card(s, 0.58, y, 3.30, ch)
        k.text(s, 0.86, y, 1.75, ch, name, size=12.5, color=k.INK, bold=True,
               anchor="m", font=k.DISPLAY)
        k.chip(s, 2.63, y + 0.23, 1.05, 0.30, status, fill=tint, color=ink,
               size=9)
        k.rule(s, 3.88, y + ch / 2, 0.37)

    k.vrule(s, 4.25, top + ch / 2, 3 * (ch + gap))
    k.rule(s, 4.25, 3.83, 0.37)

    k.card(s, 4.62, top, 3.30, 3.58, fill=k.INK, line=None)
    k.text(s, 4.94, top + 0.34, 2.70, 0.44, "MaxDock", size=20, color=k.WHITE,
           bold=True, font=k.DISPLAY)
    k.text(s, 4.94, top + 0.86, 2.70, 0.24, "CHECKS THE RULES, HOLDS THE DOOR",
           size=8, color=k.CYAN, bold=True, spc=60)
    k.rule(s, 4.94, top + 1.22, 2.70, color=k.NAVY_RULE)
    checks = [
        "The plant's own duration rules, not a fixed hour",
        "A door that is free, fits the trailer, and has floor space",
        "One booking reference and one QR code, whatever created it",
    ]
    for i, line in enumerate(checks):
        y = top + 1.48 + i * 0.66
        k.rect(s, 4.94, y + 0.06, 0.13, 0.13, fill=k.CYAN, line=None,
               radius=0.02)
        k.text(s, 5.24, y, 2.40, 0.54, line, size=10.5, color=k.ICE,
               line_spacing=1.16)

    k.rule(s, 7.92, 3.83, 0.70)
    k.card(s, 8.62, top, 4.13, 3.58)
    k.text(s, 8.94, top + 0.34, 3.49, 0.44, "One dock board", size=20,
           color=k.INK, bold=True, font=k.DISPLAY)
    k.text(s, 8.94, top + 0.90, 3.49, 0.80,
           "Typed by a supplier, typed by a coordinator, or created by the "
           "bridge — it lands the same way.", size=11, color=k.BODY,
           line_spacing=1.16)
    k.rule(s, 8.94, top + 1.86, 3.49)
    lands = ["The same rules applied", "The same board and the same queue",
             "The same audit history behind it"]
    for i, line in enumerate(lands):
        y = top + 2.08 + i * 0.46
        k.rect(s, 8.94, y + 0.05, 0.13, 0.13, fill=k.GREEN, line=None,
               radius=0.02)
        k.text(s, 9.24, y, 3.19, 0.28, line, size=11, color=k.INK)

    k.card(s, 0.58, 5.90, 12.17, 1.02, fill=k.INK, line=None)
    k.text(s, 0.96, 6.08, 11.41, 0.66,
           [[("MaxDock does not wait for the bridge. ",
              {"bold": True, "color": k.WHITE}),
             ("The bridge removes the typing between a plant's systems and the "
              "dock. It does not switch the product on — that already "
              "happened.", {"color": k.ICE})]],
           size=12, anchor="m", line_spacing=1.2)
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
