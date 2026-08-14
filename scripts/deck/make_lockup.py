#!/usr/bin/env python3
"""Compose the Max Solutions lockup used on the title page.

`assets/logo-color.png` in this repo is the mark over the MAX SOLUTIONS
wordmark. The lockup Max Solutions presents with also carries the green
BIGGER THAN PACKAGING line under it, so it is set here and composited on,
matched to the wordmark for cap height, tracking and width.

Replace `scripts/deck/assets/max-solutions-lockup.png` with the real artwork
if a vector or PNG of the full lockup turns up — nothing else has to change.

Run:  python3 scripts/deck/make_lockup.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "assets", "logo-color.png")
OUT = os.path.join(HERE, "assets", "max-solutions-lockup.png")
FACE = "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"

GREEN = (58, 174, 42, 255)
TAGLINE = "BIGGER THAN PACKAGING"


def ink_columns(px, w, y0, y1):
    cols = [x for x in range(w)
            if any(px[x, y][3] > 128 for y in range(y0, y1))]
    return cols[0], cols[-1]


def main():
    logo = Image.open(SRC).convert("RGBA")
    w, h = logo.size
    px = logo.load()
    word_left, word_right = ink_columns(px, w, 735, h)   # the wordmark row band
    word_w = word_right - word_left
    cap = h - 735                                        # wordmark cap height

    target_w = int(word_w * 0.72)
    target_cap = int(cap * 0.31)
    gap = int(cap * 0.46)

    size = target_cap
    font = ImageFont.truetype(FACE, size)
    while font.getbbox("B")[3] - font.getbbox("B")[1] < target_cap:
        size += 2
        font = ImageFont.truetype(FACE, size)

    probe = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    plain = probe.textlength(TAGLINE, font=font)
    tracking = (target_w - plain) / max(len(TAGLINE) - 1, 1)

    out_h = h + gap + int(target_cap * 1.4)
    out = Image.new("RGBA", (w, out_h), (0, 0, 0, 0))
    out.paste(logo, (0, 0), logo)

    draw = ImageDraw.Draw(out)
    x = word_left + (word_w - target_w) / 2
    y = h + gap
    for ch in TAGLINE:
        draw.text((x, y), ch, font=font, fill=GREEN)
        x += probe.textlength(ch, font=font) + tracking

    out.save(OUT)
    print(f"wrote {OUT} — {out.size[0]}x{out.size[1]}")


if __name__ == "__main__":
    main()
