# The MaxDock introduction deck

`MaxDock_introduction_v7.pptx` is the deck to present. It is built from
`MaxDock_introduction_v4_1.pptx` by a script, so the next revision is an edit to
the script rather than a slide dragged around by hand.

```
python3 scripts/deck/build_deck.py     # writes MaxDock_introduction_v7.pptx
```

- `scripts/deck/deckkit.py` — the design system: palette, type scale, the slide
  frame, cards, chips, rules, bars, and the block moves used to re-space an
  inherited slide. New slides should be drawn with it so they match.
- `scripts/deck/build_deck.py` — the slides this deck added, and the fixes to
  the v4.1 slides.
- `scripts/deck/v6_polish.py` — the v6 pass: the shorter wording for every
  inherited slide, and the wider gutters and gaps.
- `scripts/deck/v7_type.py` — the v7 pass: the second round of cuts, the size
  map applied to every run, the refit that grows each text box to hold its
  text, and the title and closing pages.
- `scripts/deck/make_lockup.py` — composes the Max Solutions lockup used on
  those two pages, from `assets/logo-color.png` plus the green tagline.
- `MaxDock_introduction_v4_1.pptx` is the input and is never edited.
- `MaxDock_introduction_v5.pptx` and `_v6.pptx` are the previous cuts, kept for
  comparison.

## What each version changed

**v5 — three slides that were missing, and one redrawn.**

| Position | Slide |
|---|---|
| 2 | One Tuesday morning — the origin story, one plant, in the order it happened |
| 5 | We were not the first to notice — what Opendock, C3 Solutions and Transporeon were each built for, and the one thing none of them was |
| 26 | What next Thursday looks like — dock hours booked against crew hours, and the caps that protect a day the floor cannot staff |

Slide 14 (the TMS and CABL bridge) was redrawn to read left to right: where a
booking comes from, what checks it, where it lands. Text that overflowed its box
on five slides was fixed, along with a capacity bar drawn over its own caption
and a column that ran off the grid.

**v6 — the same content, said shorter, with more room around it.**

- Roughly a hundred sentences rewritten to what the floor would actually say.
  The deck now carries 649 characters a slide against v5's 760 — v4.1's word
  count across three more slides.
- Wider gutters between cards (0.25in → 0.40-0.46in), wider gaps between rows,
  and every closing band pulled clear of the block above it: about 5-10% more
  space around each object, taken out of the objects rather than the margins.
- Cards whose copy got shorter were shortened with it, so the air landed
  between blocks instead of pooling inside them.

**v7 — type sized for a laptop, and the logos on the title page.**

- Nothing renders below 9pt now, and that 9pt is footer furniture. Body copy
  runs 12.5-13pt, card titles 14-15pt, headlines 26pt — roughly a 15-20% step
  up from v6. The only sub-11pt text left is the dock-board mock, which is a
  picture of a screen and reads as one.
- Another round of cuts pays for it: a hundred-odd lines shortened again, so
  the slides hold the same shape at the larger size.
- Every text box is measured at its final size and grown into the free space
  beneath it, bounded by the card it sits in. Anything that still cannot fit is
  reported by the build rather than clipped, which is how the last few were
  found.
- The title page now leads with the MaxDock icon above its own name, and the
  full-colour Max Solutions lockup sits on a white plate where it can be read
  in colour against the navy. The closing page matches; the floating white
  mountain is gone from both.

## Checking a change

There is no PowerPoint here and LibreOffice cannot open files in this sandbox,
so slides are proofed by rasterising them:

```
python3 scripts/deck/render_deck.py docs/deck/MaxDock_introduction_v7.pptx out/
```

It writes a PNG per slide and prints any text box whose content is taller than
the shape holding it. The same measurement drives the v7 refit, so the build
and the proof agree. Fonts are approximated, so treat a marginal fit as
marginal — but overlaps, gaps and alignment are faithful.

Note on fonts: the deck is set in Aptos and Aptos Display, which ship with
Microsoft 365. Presenting it from an older Office install, or from Google
Slides, will substitute a different face and reflow the text.
