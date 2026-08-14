#!/usr/bin/env python3
"""Rasterise a .pptx to PNGs with PIL, for visual QA where LibreOffice is unavailable.

Handles: solid-filled auto shapes (rect / rounded rect / ellipse), lines,
pictures, and text frames with per-run font size / bold / colour, paragraph
alignment and vertical anchoring. Good enough to catch overlap, overflow and
spacing defects.
"""
import io
import os
import sys

from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation

EMU = 914400
DPI = 110

FONT_DIR = "/usr/share/fonts/truetype/freefont"
FONTS = {
    (False, False): f"{FONT_DIR}/FreeSans.ttf",
    (True, False): f"{FONT_DIR}/FreeSansBold.ttf",
    (False, True): f"{FONT_DIR}/FreeSansOblique.ttf",
    (True, True): f"{FONT_DIR}/FreeSansBoldOblique.ttf",
}
_cache = {}


def font(size_pt, bold=False, italic=False):
    key = (round(size_pt * 2), bold, italic)
    if key not in _cache:
        px = max(1, int(round(size_pt * DPI / 72.0)))
        _cache[key] = ImageFont.truetype(FONTS[(bool(bold), bool(italic))], px)
    return _cache[key]


def px(emu):
    return int(round(emu / EMU * DPI))


def rgb_of(color, default=None):
    try:
        if color and color.type is not None and str(color.type).startswith("MSO_THEME"):
            return default
        if color and color.rgb is not None:
            return tuple(color.rgb)
    except Exception:
        pass
    return default


def shape_fill(sh):
    try:
        f = sh.fill
        if f.type is None:
            return None
        if str(f.type).startswith("MSO_FILL.BACKGROUND"):
            return None
        return rgb_of(f.fore_color)
    except Exception:
        return None


def shape_line(sh):
    try:
        lf = sh.line
        col = rgb_of(lf.color)
        w = lf.width.pt if lf.width is not None else None
        if col is None:
            return None
        return col, max(1, int(round((w or 1) * DPI / 72.0)))
    except Exception:
        return None


def wrap(text, fnt, max_w, draw):
    if not text:
        return [""]
    words = text.split(" ")
    lines, cur = [], ""
    for w in words:
        trial = w if not cur else cur + " " + w
        if draw.textlength(trial, font=fnt) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def run_props(r, para, sh):
    size = None
    if r.font.size is not None:
        size = r.font.size.pt
    elif para.font.size is not None:
        size = para.font.size.pt
    if size is None:
        size = 18.0
    bold = r.font.bold
    if bold is None:
        bold = para.font.bold
    italic = r.font.italic
    if italic is None:
        italic = para.font.italic
    col = rgb_of(r.font.color, None) or rgb_of(para.font.color, None) or (30, 30, 30)
    return size, bool(bold), bool(italic), col


def draw_textframe(draw, sh, x0, y0, w, h, issues, name):
    tf = sh.text_frame
    ml = px(tf.margin_left or 0)
    mr = px(tf.margin_right or 0)
    mt = px(tf.margin_top or 0)
    mb = px(tf.margin_bottom or 0)
    box_w = max(4, w - ml - mr)
    anchor = str(tf.vertical_anchor) if tf.vertical_anchor is not None else "TOP"

    # layout first
    blocks = []
    total_h = 0
    for para in tf.paragraphs:
        runs = [r for r in para.runs if r.text]
        if not runs:
            size = para.font.size.pt if para.font.size else 12
            blocks.append(("gap", int(size * DPI / 72.0 * 0.9)))
            total_h += blocks[-1][1]
            continue
        size, bold, italic, col = run_props(runs[0], para, sh)
        fnt = font(size, bold, italic)
        text = "".join(r.text for r in runs)
        space_before = para.space_before.pt if para.space_before else 0
        space_after = para.space_after.pt if para.space_after else 0
        lsp = 1.0
        try:
            if para.line_spacing:
                lsp = float(para.line_spacing) if isinstance(para.line_spacing, float) else 1.0
        except Exception:
            lsp = 1.0
        lines = wrap(text, fnt, box_w, draw) if (tf.word_wrap is not False) else [text]
        lh = int(round(size * DPI / 72.0 * 1.22 * lsp))
        blk_h = int(space_before * DPI / 72.0) + lh * len(lines) + int(space_after * DPI / 72.0)
        blocks.append(("p", para, lines, fnt, col, lh, blk_h,
                       int(space_before * DPI / 72.0), size))
        total_h += blk_h

    avail = h - mt - mb
    if anchor.startswith("MSO_ANCHOR.MIDDLE") or anchor.startswith("MIDDLE"):
        cy = y0 + mt + max(0, (avail - total_h) // 2)
    elif anchor.startswith("MSO_ANCHOR.BOTTOM") or anchor.startswith("BOTTOM"):
        cy = y0 + mt + max(0, avail - total_h)
    else:
        cy = y0 + mt

    if total_h > avail + 2:
        issues.append(f"OVERFLOW {name}: text {total_h}px in {avail}px box "
                      f"({total_h/DPI:.2f}in vs {avail/DPI:.2f}in)")

    for blk in blocks:
        if blk[0] == "gap":
            cy += blk[1]
            continue
        _, para, lines, fnt, col, lh, blk_h, sb, size = blk
        cy += sb
        align = str(para.alignment) if para.alignment is not None else "LEFT"
        for ln in lines:
            tw = draw.textlength(ln, font=fnt)
            if "CENTER" in align:
                tx = x0 + ml + (box_w - tw) / 2
            elif "RIGHT" in align:
                tx = x0 + ml + box_w - tw
            else:
                tx = x0 + ml
            draw.text((tx, cy), ln, font=fnt, fill=col)
            cy += lh
        cy += blk_h - sb - lh * len(lines)


_MEASURE = ImageDraw.Draw(Image.new("RGB", (8, 8)))


def measure(shape):
    """Height in inches the shape's text needs at its current width."""
    tf = shape.text_frame
    ml = px(tf.margin_left or 0)
    mr = px(tf.margin_right or 0)
    box_w = max(4, px(shape.width) - ml - mr)
    total = 0
    for para in tf.paragraphs:
        runs = [r for r in para.runs if r.text]
        if not runs:
            size = para.font.size.pt if para.font.size else 12
            total += int(size * DPI / 72.0 * 0.9)
            continue
        size, bold, italic, _ = run_props(runs[0], para, shape)
        fnt = font(size, bold, italic)
        text = "".join(r.text for r in runs)
        lines = (wrap(text, fnt, box_w, _MEASURE)
                 if tf.word_wrap is not False else [text])
        lsp = 1.0
        try:
            if para.line_spacing and isinstance(para.line_spacing, float):
                lsp = float(para.line_spacing)
        except Exception:
            pass
        total += int(round(size * DPI / 72.0 * 1.22 * lsp)) * len(lines)
        total += int(((para.space_before.pt if para.space_before else 0)
                      + (para.space_after.pt if para.space_after else 0))
                     * DPI / 72.0)
    return total / DPI


def render(path, outdir, prefix="slide", only=None):
    os.makedirs(outdir, exist_ok=True)
    prs = Presentation(path)
    W = px(prs.slide_width)
    H = px(prs.slide_height)
    all_issues = {}
    for idx, slide in enumerate(prs.slides, 1):
        if only and idx not in only:
            continue
        img = Image.new("RGB", (W, H), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        issues = []
        try:
            bg = slide.background.fill
            c = rgb_of(bg.fore_color)
            if c:
                draw.rectangle([0, 0, W, H], fill=c)
        except Exception:
            pass

        for sh in slide.shapes:
            if sh.left is None:
                continue
            x0, y0 = px(sh.left), px(sh.top)
            w, h = px(sh.width), px(sh.height)
            name = f"{sh.shape_type}@{sh.left/EMU:.2f},{sh.top/EMU:.2f}"
            if sh.shape_type == 13:  # picture
                try:
                    im = Image.open(io.BytesIO(sh.image.blob)).convert("RGBA")
                    im = im.resize((max(1, w), max(1, h)))
                    img.paste(im, (x0, y0), im)
                except Exception:
                    draw.rectangle([x0, y0, x0 + w, y0 + h], outline=(200, 0, 0))
                continue
            fill = shape_fill(sh)
            line = shape_line(sh)
            auto = None
            try:
                auto = str(sh.auto_shape_type)
            except Exception:
                pass
            box = [x0, y0, x0 + max(w, 1), y0 + max(h, 1)]
            if h <= 2 or w <= 2:  # rule / divider
                col = fill or (line[0] if line else (200, 200, 200))
                draw.rectangle([x0, y0, x0 + max(w, 1), y0 + max(h, 1)], fill=col)
            elif auto and "OVAL" in auto:
                draw.ellipse(box, fill=fill, outline=line[0] if line else None,
                             width=line[1] if line else 1)
            elif auto and "ROUNDED" in auto:
                try:
                    adj = float(sh.adjustments[0])
                except Exception:
                    adj = 0.05
                draw.rounded_rectangle(box, radius=max(2, int(min(w, h) * adj)), fill=fill,
                                       outline=line[0] if line else None,
                                       width=line[1] if line else 1)
            elif fill or line:
                draw.rectangle(box, fill=fill, outline=line[0] if line else None,
                               width=line[1] if line else 1)
            if sh.has_text_frame and sh.text_frame.text.strip():
                draw_textframe(draw, sh, x0, y0, w, h, issues, name)
        n = f"{prefix}-{idx:02d}.png"
        img.save(os.path.join(outdir, n))
        if issues:
            all_issues[idx] = issues
    return all_issues


if __name__ == "__main__":
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else "render"
    only = None
    if len(sys.argv) > 3:
        only = set(int(x) for x in sys.argv[3].split(","))
    iss = render(src, out, only=only)
    for k in sorted(iss):
        for m in iss[k]:
            print(f"slide {k}: {m}")
    print("rendered ->", out)
