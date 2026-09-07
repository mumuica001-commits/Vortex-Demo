#!/usr/bin/env python3
"""Rasterize Vortex mark: full-bleed PWA icons + small favicon previews."""
from PIL import Image, ImageDraw

BG = (12, 13, 16, 255)  # #0c0d10
ELEV = (20, 21, 28, 255)  # #14151c
ACCENT = (154, 164, 178, 255)  # #9aa4b2
TEAL = (94, 234, 212, 255)  # #5eead4


def rounded_rect(draw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=max(radius, 0), fill=fill)


def paint_mark(img, *, round_tile=False, pad_ratio=0.125):
    """Draw two video panes + live pip. Glyph sits in the center ~75–80%."""
    w, h = img.size
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, w, h), fill=BG)
    if round_tile:
        # Favicon-style rounded tile on the same bg (already filled).
        r = int(round(w * 0.22))
        # Already full-bleed bg; rounding is visual only if we drew a plate.
        # Keep full-bleed fill so small previews still read as a dark tile.
        pass

    pad = w * pad_ratio
    inner = w - pad * 2
    # Two panes with a gap, matching the 32-viewBox SVG:
    # frames occupy x 4–28 of 32 (12.5% pad), y 8–24 (25% vertical pad).
    frame_y0 = h * 0.25
    frame_y1 = h * 0.75
    frame_h = frame_y1 - frame_y0
    gap = inner * (1 / 23)  # 1 unit gap on the 23-unit inner width (4–28)
    pane_w = (inner - gap) / 2
    x0 = pad
    x1 = x0 + pane_w
    x2 = x1 + gap
    x3 = x2 + pane_w

    outer_r = pane_w * (2.5 / 11)
    inset = pane_w * (2 / 11)
    inner_r = pane_w * (1.25 / 11)

    rounded_rect(draw, (x0, frame_y0, x1, frame_y1), outer_r, ACCENT)
    rounded_rect(
        draw,
        (x0 + inset, frame_y0 + inset, x1 - inset, frame_y1 - inset),
        inner_r,
        ELEV,
    )
    rounded_rect(draw, (x2, frame_y0, x3, frame_y1), outer_r, ACCENT)
    rounded_rect(
        draw,
        (x2 + inset, frame_y0 + inset, x3 - inset, frame_y1 - inset),
        inner_r,
        ELEV,
    )

    # Live pip in the upper-left of the left pane, matching SVG circle at 8.5,13 r=1.75
    # SVG: pane 4–15, pip at 8.5,13 — relative 4.5/11 across, 5/16 down, r 1.75/11 of pane_w
    pip_cx = x0 + pane_w * (4.5 / 11)
    pip_cy = frame_y0 + frame_h * (5 / 16)
    pip_r = pane_w * (1.75 / 11)
    draw.ellipse(
        (pip_cx - pip_r, pip_cy - pip_r, pip_cx + pip_r, pip_cy + pip_r),
        fill=TEAL,
    )


def render_size(size, path, pad_ratio=0.125):
    hi = Image.new("RGBA", (size * 4, size * 4), BG)
    paint_mark(hi, pad_ratio=pad_ratio)
    out = hi.resize((size, size), Image.Resampling.LANCZOS)
    # Flatten onto near-black (no alpha in PWA rasters).
    flat = Image.new("RGB", (size, size), BG[:3])
    flat.paste(out, mask=out.split()[-1])
    flat.save(path, "PNG", optimize=True)
    print(f"wrote {path} {flat.size}")


if __name__ == "__main__":
    render_size(192, "/workspace/.grok/icon-192.png", pad_ratio=0.14)
    render_size(512, "/workspace/.grok/icon-512.png", pad_ratio=0.14)
    render_size(32, "/workspace/.grok/favicon-32.png", pad_ratio=0.125)
    render_size(16, "/workspace/.grok/favicon-16.png", pad_ratio=0.125)
