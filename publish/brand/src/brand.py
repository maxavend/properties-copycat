"""Properties Copycat logo kit generator.

The mark: the origin instance (an open chevron, all that shows of the diamond behind) and its copy
(a solid diamond beside it). Every shape is built in diagonal space, where Figma's instance diamond is
an axis-aligned square, then rotated back.

Needs uharfbuzz and Inter (OFL) as inter-opsz.ttf next to text2path.py; see ../README.md.
Usage: python brand.py <out-dir>"""
import json, math, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from text2path import text_path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)

VIOLET = '#9747FF'   # origin instance — Figma's component purple
PINK = '#FF4F9A'     # copy
ORANGE = '#FF8A3D'   # end of the copy gradient
INK = '#17112B'      # wordmark and dark backgrounds
LILAC = '#F3EDFF'    # light backgrounds


def fmt(v): return f'{v:.2f}'.rstrip('0').rstrip('.')


def rp(pts, radii):
    """Closed path with a circular fillet of the given radius at each vertex."""
    if not isinstance(radii, (list, tuple)): radii = [radii] * len(pts)
    cmds = []
    for i in range(len(pts)):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % len(pts)]
        v1 = (p0[0] - p1[0], p0[1] - p1[1]); v2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1, l2 = math.hypot(*v1), math.hypot(*v2)
        u1 = (v1[0] / l1, v1[1] / l1); u2 = (v2[0] / l2, v2[1] / l2)
        ang = math.acos(max(-1, min(1, u1[0] * u2[0] + u1[1] * u2[1])))
        t = min(radii[i] / math.tan(ang / 2), l1 / 2, l2 / 2)
        r = t * math.tan(ang / 2)
        a = (p1[0] + u1[0] * t, p1[1] + u1[1] * t); b = (p1[0] + u2[0] * t, p1[1] + u2[1] * t)
        sweep = 1 if (u1[0] * u2[1] - u1[1] * u2[0]) < 0 else 0
        cmds.append(('L' if cmds else 'M') + f'{fmt(a[0])} {fmt(a[1])}')
        cmds.append(f'A{fmt(r)} {fmt(r)} 0 0 {sweep} {fmt(b[0])} {fmt(b[1])}')
    return ''.join(cmds) + 'Z'


def mark(h=72, band=26, gap=22, shift=64, r=12, r_end=7, r_in=3, dx=-2):
    """Returns (origin_path, copy_path) on a 256 canvas.
    h: half-diagonal of both diamonds; band/gap: chevron thickness and gap, in diagonal units
    (×0.707 in pixels); shift: horizontal distance between the two centres."""
    cy = 128
    bx, fx = 128 - shift / 2 + dx, 128 + shift / 2 + dx
    bu, bv = bx + cy, cy - bx           # diagonal space: u = x + y, v = y - x
    fu, fv = fx + cy, cy - fx
    cut_u, cut_v = fu - h - gap, fv + h + gap
    o = [(cut_u, bv - h), (bu - h, bv - h), (bu - h, bv + h), (bu + h, bv + h), (bu + h, cut_v),
         (bu + h - band, cut_v), (bu + h - band, bv + h - band), (bu - h + band, bv + h - band),
         (bu - h + band, bv - h + band), (cut_u, bv - h + band)]
    xy = lambda pts: [((u - v) / 2, (u + v) / 2) for u, v in pts]
    origin = rp(xy(o), [r_end, r, r, r, r_end, r_end, r_in, r_in, r_in, r_end])
    copy = rp([(fx, cy - h), (fx + h, cy), (fx, cy + h), (fx - h, cy)], r)
    return origin, copy


GRAD = (f'<linearGradient id="copy" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="#C04BFF"/><stop offset=".55" stop-color="{PINK}"/>'
        f'<stop offset="1" stop-color="{ORANGE}"/></linearGradient>')


def symbol_body(origin, copy, style='color'):
    if style == 'color':
        return f'<path d="{origin}" fill="{VIOLET}"/><path d="{copy}" fill="url(#copy)"/>'
    if style == 'flat':
        return f'<path d="{origin}" fill="{VIOLET}"/><path d="{copy}" fill="{PINK}"/>'
    return f'<path d="{origin}{copy}" fill="{style}"/>'


def write(name, vb, body, title='Properties Copycat', defs=True):
    d = f'<defs>{GRAD}</defs>' if defs and 'url(#copy)' in body else ''
    (OUT / name).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{title}">'
        f'<title>{title}</title>{d}{body}</svg>\n')


big = mark()
small = mark(h=70, band=32, gap=26, shift=76, r=10, r_end=4)

write('symbol.svg', '0 0 256 256', symbol_body(*big))
write('symbol-flat.svg', '0 0 256 256', symbol_body(*big, 'flat'))
write('symbol-small.svg', '0 0 256 256', symbol_body(*small))

# Figma Community icon: the colour mark on ink, 128×128 (Figma rounds the corners itself)
def tile(size, m, bg=INK, scale=0.74):
    k = size * scale / 208            # the mark is 208 units wide
    t = f'translate({fmt(size / 2 - 128 * k)} {fmt(size / 2 - 128 * k)}) scale({fmt(k)})'
    return f'<rect width="{size}" height="{size}" fill="{bg}"/><g transform="{t}">{symbol_body(*m)}</g>'

write('icon-128.svg', '0 0 128 128', tile(128, big))
write('icon-small.svg', '0 0 128 128', tile(128, small))

# Wordmark: Inter (OFL, Figma's UI typeface) SemiBold, display optical size, slightly tightened
txt = text_path('Properties Copycat', wght=600, opsz=32, tracking=-0.012)
line1 = text_path('Properties', wght=600, opsz=32, tracking=-0.012)
line2 = text_path('Copycat', wght=600, opsz=32, tracking=-0.012)
CAP = txt['capHeight']

def lockup_h(fill_text, sym_style='color'):
    mh = 144                        # mark height (y 56..200 on its canvas)
    cap = 72                        # cap height = half the mark height
    k = cap / CAP
    gap = 52                        # ≈ the copy diamond's half-diagonal: one shared unit
    x_text = 208 + gap
    w = x_text + txt['width'] * k
    mark_g = f'<g transform="translate(-24 -56)">{symbol_body(*big, sym_style)}</g>'
    text_g = (f'<path transform="translate({fmt(x_text)} {fmt(mh / 2 + cap / 2)}) scale({k:.5f})" '
              f'd="{txt["d"]}" fill="{fill_text}"/>')
    return f'0 0 {fmt(w)} {mh}', mark_g + text_g

def lockup_v(fill_text, sym_style='color'):
    cap = 38
    k = cap / CAP
    lead = cap * 1.5
    w = max(line1['width'], line2['width']) * k
    w = max(w, 208)
    top = 144 + 36                  # mark, then the gap
    mark_g = f'<g transform="translate({fmt(w / 2 - 128)} -56)">{symbol_body(*big, sym_style)}</g>'
    t1 = (f'<path transform="translate({fmt((w - line1["width"] * k) / 2)} {fmt(top + cap)}) scale({k:.5f})" '
          f'd="{line1["d"]}" fill="{fill_text}"/>')
    t2 = (f'<path transform="translate({fmt((w - line2["width"] * k) / 2)} {fmt(top + cap + lead + cap * 0.25)}) scale({k:.5f})" '
          f'd="{line2["d"]}" fill="{fill_text}"/>')
    return f'0 0 {fmt(w)} {fmt(top + cap * 2 + lead + cap * 0.25)}', mark_g + t1 + t2

for name, fn in (('horizontal', lockup_h), ('stacked', lockup_v)):
    write(f'{name}.svg', *fn(INK))
    write(f'{name}-on-dark.svg', *fn('#FFFFFF'))
    write(f'{name}-black.svg', *fn('#000', '#000'))
    write(f'{name}-white.svg', *fn('#FFF', '#FFF'))

json.dump({'violet': VIOLET, 'pink': PINK, 'orange': ORANGE, 'ink': INK, 'lilac': LILAC},
          open(OUT / 'palette.json', 'w'), indent=2)
