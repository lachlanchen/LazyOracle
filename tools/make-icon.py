#!/usr/bin/env python3
"""Draws the LazyOracle icon: a gold crescent cradling an eight-pointed star
inside a thin astrolabe ring, on a deep indigo sky. Supersampled with PIL so
the edges stay crisp at every store size. Writes the PWA icons, the
@capacitor/assets sources and the store 1024 icon."""
import math, pathlib
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
S = 4096  # supersample canvas

def sky(size):
    im = Image.new('RGBA', (size, size), (11, 13, 31, 255))
    # vertical gradient + glow
    px = im.load()
    cx, cy = size * 0.5, size * 0.42
    for y in range(size):
        t = y / size
        for x in range(0, size, 1):
            d = math.hypot(x - cx, y - cy) / size
            glow = max(0.0, 1 - d * 2.1) ** 2
            r = int(11 + 24 * (1 - t) + 34 * glow)
            g = int(13 + 22 * (1 - t) + 30 * glow)
            b = int(31 + 46 * (1 - t) + 70 * glow)
            px[x, y] = (r, g, b, 255)
    return im

def stars(draw, size, seed=7):
    import random
    rnd = random.Random(seed)
    for _ in range(90):
        x, y = rnd.random() * size, rnd.random() * size
        r = size * rnd.choice([0.0016, 0.0022, 0.003, 0.004])
        a = rnd.randint(120, 235)
        col = (244, 239, 228, a) if rnd.random() < 0.7 else (217, 180, 90, a)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=col)

def gold(t):
    # gradient stops from pale highlight to deep gold
    stops = [(0.0, (250, 232, 170)), (0.45, (217, 180, 90)), (1.0, (150, 112, 40))]
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t0 <= t <= t1:
            k = (t - t0) / (t1 - t0)
            return tuple(int(a + (b - a) * k) for a, b in zip(c0, c1))
    return stops[-1][1]

def gold_fill(mask, size, angle=35):
    """Fill a mask with a diagonal gold gradient."""
    grad = Image.new('RGBA', (size, size))
    gp = grad.load()
    a = math.radians(angle)
    for y in range(size):
        for x in range(size):
            t = ((x * math.cos(a) + y * math.sin(a)) / (size * (math.cos(a) + math.sin(a))))
            gp[x, y] = gold(min(1, max(0, t))) + (255,)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out

def build(size=S):
    im = sky(size)
    d = ImageDraw.Draw(im)
    stars(d, size)
    c = size / 2
    # astrolabe ring with ticks
    ring = Image.new('L', (size, size), 0)
    rd = ImageDraw.Draw(ring)
    R = size * 0.40
    w = size * 0.006
    rd.ellipse([c - R, c - R, c + R, c + R], outline=255, width=int(w))
    for i in range(48):
        ang = math.radians(i * 7.5)
        long_tick = i % 4 == 0
        r1 = R - size * (0.03 if long_tick else 0.016)
        r2 = R - size * 0.006
        x1, y1 = c + r1 * math.cos(ang), c + r1 * math.sin(ang)
        x2, y2 = c + r2 * math.cos(ang), c + r2 * math.sin(ang)
        rd.line([x1, y1, x2, y2], fill=255, width=int(size * (0.005 if long_tick else 0.003)))
    ring_layer = gold_fill(ring, size)
    ring_layer.putalpha(ring_layer.split()[3].point(lambda v: int(v * 0.75)))
    im.alpha_composite(ring_layer)
    # crescent
    moon = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(moon)
    r = size * 0.255
    mx, my = c - size * 0.02, c + size * 0.02
    md.ellipse([mx - r, my - r, mx + r, my + r], fill=255)
    off = size * 0.105
    md.ellipse([mx - r + off, my - r - off * 0.55, mx + r + off, my + r - off * 0.55], fill=0)
    # soft glow behind the moon
    glow = moon.filter(ImageFilter.GaussianBlur(size * 0.03))
    glow_layer = Image.new('RGBA', (size, size), (217, 180, 90, 0))
    glow_layer.putalpha(glow.point(lambda v: int(v * 0.45)))
    im.alpha_composite(glow_layer)
    im.alpha_composite(gold_fill(moon, size))
    # eight-pointed star in the crescent's embrace
    star = Image.new('L', (size, size), 0)
    sd = ImageDraw.Draw(star)
    sx, sy = c + size * 0.13, c - size * 0.11
    pts = []
    for i in range(16):
        ang = math.radians(i * 22.5 - 90)
        rr = size * (0.085 if i % 2 == 0 else 0.034)
        pts.append((sx + rr * math.cos(ang), sy + rr * math.sin(ang)))
    sd.polygon(pts, fill=255)
    sglow = star.filter(ImageFilter.GaussianBlur(size * 0.02))
    sglow_layer = Image.new('RGBA', (size, size), (250, 232, 170, 0))
    sglow_layer.putalpha(sglow.point(lambda v: int(v * 0.5)))
    im.alpha_composite(sglow_layer)
    im.alpha_composite(gold_fill(star, size, angle=60))
    # tiny companion star
    small = Image.new('L', (size, size), 0)
    smd = ImageDraw.Draw(small)
    sx2, sy2 = c - size * 0.2, c - size * 0.22
    pts = []
    for i in range(8):
        ang = math.radians(i * 45 - 90)
        rr = size * (0.03 if i % 2 == 0 else 0.011)
        pts.append((sx2 + rr * math.cos(ang), sy2 + rr * math.sin(ang)))
    smd.polygon(pts, fill=255)
    im.alpha_composite(gold_fill(small, size))
    return im

def rounded(im, radius_frac=0.2237):
    size = im.width
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_frac), fill=255)
    out = im.copy()
    out.putalpha(mask)
    return out

if __name__ == '__main__':
    full = build()
    def save(img, path, size):
        img.resize((size, size), Image.LANCZOS).save(path, optimize=True)
    # Store and Capacitor sources (square, no rounding: the platforms mask it)
    (ROOT / 'assets').mkdir(exist_ok=True)
    save(full, ROOT / 'assets' / 'icon-only.png', 1024)
    save(full, ROOT / 'assets' / 'icon-foreground.png', 1024)
    bg = sky(1024)
    bg.save(ROOT / 'assets' / 'icon-background.png')
    # splash: sky with the emblem smaller in the centre
    splash = sky(2732)
    emblem = full.resize((1100, 1100), Image.LANCZOS)
    splash.alpha_composite(emblem, (int((2732 - 1100) / 2), int((2732 - 1100) / 2)))
    splash.convert('RGB').save(ROOT / 'assets' / 'splash.png')
    splash.convert('RGB').save(ROOT / 'assets' / 'splash-dark.png')
    # PWA icons: rounded for the plain icons, square for maskable
    r = rounded(full)
    save(r, ROOT / 'public' / 'icons' / 'icon-192.png', 192)
    save(r, ROOT / 'public' / 'icons' / 'icon-512.png', 512)
    save(full, ROOT / 'public' / 'icons' / 'maskable-512.png', 512)
    save(full, ROOT / 'docs' / 'screenshots' / 'icon-1024.png', 512)
    print('icons written')
