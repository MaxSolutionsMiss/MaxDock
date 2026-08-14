# The MaxDock introduction deck

`MaxDock_introduction_v5.pptx` is the deck to present. It is built from
`MaxDock_introduction_v4_1.pptx` by a script, so the next revision is an edit to
the script rather than a slide dragged around by hand.

```
python3 scripts/deck/build_deck.py     # writes MaxDock_introduction_v5.pptx
```

- `scripts/deck/deckkit.py` holds the design system — palette, type scale, the
  slide frame, cards, chips, rules and bars. New slides should be drawn with it
  so they match the ones already there.
- `scripts/deck/build_deck.py` holds the slide content and the fixes applied to
  the v4.1 slides.
- `MaxDock_introduction_v4_1.pptx` is the input and is never edited. Every change
  belongs in the build script.

## What v5 changed

Three slides were added:

| Position | Slide | Why |
|---|---|---|
| 2 | One Tuesday morning, and none of it was unusual | The origin story: one ordinary morning at one plant, in the order it happened, with what it cost beside it |
| 5 | We were not the first to notice | What Opendock, C3 Solutions and Transporeon each set out to fix, and the thing none of them was built for |
| 26 | What next Thursday looks like, before next Thursday | The forward view: dock hours booked against crew hours, and the caps that protect a day the floor cannot staff |

Slide 14 (the TMS and CABL bridge) was redrawn — it had four small cards in the
top half and an empty bottom half. It now reads left to right: where a booking
comes from, what checks it, where it lands.

Smaller corrections: text that overflowed its box on five slides, a capacity bar
that sat on top of its own caption on slide 12, a fourth row on slide 7 so the
left column reaches the bottom of the slide, and the right-hand column of slide
19 pulled back onto the 12.75in grid every other slide uses.

## Checking a change

There is no PowerPoint here and LibreOffice cannot open files in this sandbox,
so slides are proofed by rasterising them:

```
python3 scripts/deck/render_deck.py docs/deck/MaxDock_introduction_v5.pptx out/
```

It writes a PNG per slide and prints any text box whose content is taller than
the shape holding it. Fonts are approximated, so treat a marginal fit as
marginal — but overlaps, gaps and alignment are faithful.

Note on fonts: the deck is set in Aptos and Aptos Display, which ship with
Microsoft 365. Presenting it from an older Office install, or from Google
Slides, will substitute a different face and reflow the text.
