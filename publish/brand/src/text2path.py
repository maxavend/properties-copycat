"""Shapes text with HarfBuzz (kerning included) and returns it as one SVG path.
y is flipped: baseline at 0, cap height at -capHeight."""
import sys
from pathlib import Path
import uharfbuzz as hb

FONT = Path(__file__).with_name('inter-opsz.ttf')

class SVGPen:
    def __init__(self, dx): self.d, self.dx = [], dx
    def f(self, x, y): return f'{x + self.dx:.1f} {-y:.1f}'
    def moveTo(self, p): self.d.append('M' + self.f(*p))
    def lineTo(self, p): self.d.append('L' + self.f(*p))
    def qCurveTo(self, p1, p): self.d.append('Q' + self.f(*p1) + ' ' + self.f(*p))
    def curveTo(self, p1, p2, p): self.d.append('C' + self.f(*p1) + ' ' + self.f(*p2) + ' ' + self.f(*p))
    def closePath(self): self.d.append('Z')

def text_path(text, wght=600, opsz=32, tracking=0.0):
    face = hb.Face(FONT.read_bytes())
    font = hb.Font(face)
    font.set_variations({'wght': wght, 'opsz': opsz})
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True, 'liga': True})
    x, d = 0, []
    n = len(buf.glyph_infos)
    for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        pen = SVGPen(x + pos.x_offset)
        font.draw_glyph_with_pen(info.codepoint, pen)
        d += pen.d
        x += pos.x_advance + (tracking * face.upem if i < n - 1 else 0)
    cap = font.get_glyph_extents(font.get_nominal_glyph(ord('H'))).y_bearing
    return {'d': ''.join(d), 'width': x, 'upm': face.upem, 'capHeight': cap}

if __name__ == '__main__':
    import json
    print(json.dumps({k: v for k, v in text_path(sys.argv[1]).items() if k != 'd'}))
