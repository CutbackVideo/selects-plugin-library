#!/usr/bin/env python3
"""Dev-only: rename a subset WOFF2 to its `MV ...` family and record its metrics.

A subset is a Modified Version under the SIL OFL, so it must not keep a Reserved
Font Name. Rewrites name IDs 1, 3, 4, 6 and 16 (and 2/17 where needed) in place.
Then writes presets.json `metrics[family]`: unitsPerEm, xHeight, capHeight, ink
ascent (tallest of b d h k l) and descent (lowest of g p q y), the centre of the
i/j dots and the advance width of every mapped character, all in font units.
The title layout measures text from these tables, so Node tests and the panel
lay the title out exactly like the rendered graphic (kerning is ignored).
Usage: rename-font.py <font.woff2> <presets.json> <file name in presets>
"""
import json
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

font_path, presets_path, file_name = sys.argv[1:4]
with open(presets_path, encoding='utf-8') as fh:
    doc = json.load(fh)
families = {f['family'] for p in doc['presets'] for f in p['fonts'] if f['file'] == file_name}
if len(families) != 1:
    sys.exit(f'{file_name}: expected exactly one family in presets.json, got {sorted(families)}')
family = families.pop()
ps_name = family.replace(' ', '')

font = TTFont(font_path)
name = font['name']
# Each MV family holds a single face; italics are their own family (e.g. "MV DM Serif
# Display" vs "MV DM Serif Display Italic"), so the subfamily follows the italic flag.
subfamily = 'Italic' if font['OS/2'].fsSelection & 1 else 'Regular'
version = font['head'].fontRevision
values = {
    1: family,
    2: subfamily,
    3: f'{version:.3f};{ps_name}',
    4: family,
    6: ps_name,
}
if name.getName(16, 3, 1, 0x409) is not None or name.getName(16, 1, 0, 0) is not None:
    values[16] = family
if name.getName(17, 3, 1, 0x409) is not None or name.getName(17, 1, 0, 0) is not None:
    values[17] = subfamily
for name_id, value in values.items():
    name.removeNames(nameID=name_id)
    name.setName(value, name_id, 3, 1, 0x409)
font.save(font_path)

# --- metrics ---------------------------------------------------------------
cmap = font.getBestCmap()
glyphs = font.getGlyphSet()
hmtx = font['hmtx']


def bounds(ch):
    pen = BoundsPen(glyphs)
    glyphs[cmap[ord(ch)]].draw(pen)
    return pen.bounds  # (xMin, yMin, xMax, yMax) or None


def dot_centre(ch):
    """Centre of the glyph's topmost contour (the dot of i/j), or None."""
    glyf = font['glyf']
    g = glyf[cmap[ord(ch)]]
    if g.isComposite():
        # Composite i = dotless i + dot accent: take the highest component's bounds.
        best = None
        for comp in g.components:
            cg = glyf[comp.glyphName]
            cg.recalcBounds(glyf)
            box = (cg.xMin + comp.x, cg.yMin + comp.y, cg.xMax + comp.x, cg.yMax + comp.y)
            if best is None or box[1] > best[1]:
                best = box
    else:
        coords, ends, _ = g.getCoordinates(glyf)
        best, start = None, 0
        for end in ends:
            pts = coords[start:end + 1]
            start = end + 1
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            box = (min(xs), min(ys), max(xs), max(ys))
            if best is None or box[1] > best[1]:
                best = box
    if best is None:
        return None
    return [round((best[0] + best[2]) / 2), round((best[1] + best[3]) / 2)]


os2 = font['OS/2']
x_height = getattr(os2, 'sxHeight', 0) or bounds('x')[3]
cap_height = getattr(os2, 'sCapHeight', 0) or bounds('H')[3]
advances = {chr(cp): hmtx[g][0] for cp, g in sorted(cmap.items()) if cp >= 0x20 and cp not in (0xFEFF,)}
dots = {ch: dot_centre(ch) for ch in 'ij' if ord(ch) in cmap}
doc.setdefault('metrics', {})[family] = {
    'unitsPerEm': font['head'].unitsPerEm,
    'xHeight': x_height,
    'capHeight': cap_height,
    'ascent': max(bounds(c)[3] for c in 'bdhkl'),
    'descent': min(bounds(c)[1] for c in 'gpqy'),
    'dots': dots,
    'advances': advances,
}
doc['metrics'] = dict(sorted(doc['metrics'].items()))

# Presets stay readable (indented); each family's metrics go on one line.
lines = ['{', '  "version": ' + json.dumps(doc['version']) + ',', '  "presets": ' + json.dumps(doc['presets'], indent=2, ensure_ascii=True).replace('\n', '\n  ') + ',', '  "metrics": {']
items = list(doc['metrics'].items())
for i, (fam, m) in enumerate(items):
    lines.append('    ' + json.dumps(fam) + ': ' + json.dumps(m, ensure_ascii=True, separators=(',', ':')) + (',' if i < len(items) - 1 else ''))
lines += ['  }', '}']
with open(presets_path, 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(lines) + '\n')
print(f'{file_name}: {family}')
