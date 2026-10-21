"""Liquid Glass rendition of the Properties Copycat mark: the origin instance becomes a solid violet
glass ring behind, and the copy a translucent diamond in front that refracts what it covers.
Figma shows plugin icons as flat images, so the highlights and shadows are baked in here instead of
being left to the system. Usage: python glass.py <out-dir>"""
import sys
from pathlib import Path
sys.argv = [sys.argv[0], sys.argv[1]]
from brand import rp, fmt, OUT, VIOLET, PINK, ORANGE, INK

H, BAND, SHIFT, DX = 72, 26, 64, -2
BX, FX, CY = 128 - SHIFT / 2 + DX, 128 + SHIFT / 2 + DX, 128


def dia(cx, h, r, rev=False):
    pts = [(cx, CY - h), (cx + h, CY), (cx, CY + h), (cx - h, CY)]
    return rp(pts[::-1] if rev else pts, r)


RING = dia(BX, H, 12) + dia(BX, H - BAND, 3, rev=True)
COPY = dia(FX, H, 12)

DEFS = f'''
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#B98AFF"/><stop offset=".5" stop-color="{VIOLET}"/><stop offset="1" stop-color="#6A1FE0"/></linearGradient>
<linearGradient id="copy" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#C04BFF"/><stop offset=".55" stop-color="{PINK}"/><stop offset="1" stop-color="{ORANGE}"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2=".9" y2=".9">
  <stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".3" stop-color="#fff" stop-opacity=".16"/>
  <stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#fff" stop-opacity=".15"/>
  <stop offset=".7" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".6"/></linearGradient>
<linearGradient id="ringSheen" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="inCopy"><path d="{COPY}"/></clipPath>
<filter id="refract" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="shadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
'''


def glass_mark(bg_is_dark=True):
    shadow = INK if bg_is_dark else '#4B1E8F'
    return f'''
<path d="{RING}" fill="{shadow}" fill-rule="evenodd" opacity=".45" filter="url(#shadow)" transform="translate(0 9)"/>
<path d="{RING}" fill="#4A12AE" fill-rule="evenodd" transform="translate(0 4)"/>
<path d="{RING}" fill="url(#ring)" fill-rule="evenodd"/>
<path d="{RING}" fill="url(#ringSheen)" fill-rule="evenodd"/>
<path d="{RING}" fill="none" stroke="url(#rim)" stroke-width="1.8"/>
<path d="{COPY}" fill="{shadow}" opacity=".5" filter="url(#shadow)" transform="translate(4 12)"/>
<g clip-path="url(#inCopy)">
  <path d="{RING}" fill="#D9BCFF" fill-rule="evenodd" filter="url(#refract)" transform="translate(7 2)"/>
</g>
<path d="{COPY}" fill="#B3206E" opacity=".55" transform="translate(0 4)"/>
<path d="{COPY}" fill="url(#copy)" opacity=".66"/>
<path d="{COPY}" fill="url(#sheen)"/>
<path d="{COPY}" fill="none" stroke="url(#rim)" stroke-width="2.2"/>
'''


def write(name, size, body, bg=None):
    k = size * .70 / 208
    t = f'translate({fmt(size / 2 - 128 * k)} {fmt(size / 2 - 128 * k)}) scale({fmt(k)})'
    (OUT / name).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Properties Copycat">'
        f'<title>Properties Copycat</title><defs>{DEFS}{bg[0] if bg else ""}</defs>{bg[1] if bg else ""}'
        f'<g transform="{t}">{glass_mark(bg is None or bg[2])}</g></svg>\n')


DARK_BG = ('''<radialGradient id="bg" cx=".3" cy=".2" r="1"><stop offset="0" stop-color="#2E2160"/>
<stop offset=".6" stop-color="#17112B"/><stop offset="1" stop-color="#0E0A1C"/></radialGradient>''',
           '<rect width="1024" height="1024" fill="url(#bg)"/>', True)
LIGHT_BG = ('''<radialGradient id="bg" cx=".3" cy=".2" r="1.1"><stop offset="0" stop-color="#FFFFFF"/>
<stop offset=".55" stop-color="#F1EAFF"/><stop offset="1" stop-color="#E2D4FF"/></radialGradient>''',
            '<rect width="1024" height="1024" fill="url(#bg)"/>', False)

write('glass-icon-dark.svg', 1024, '', DARK_BG)
write('glass-icon-light.svg', 1024, '', LIGHT_BG)
write('glass-symbol.svg', 1024, '')
