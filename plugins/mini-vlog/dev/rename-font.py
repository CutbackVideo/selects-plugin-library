#!/usr/bin/env python3
"""Dev-only: rename a subset WOFF2 to its `MV ...` family and record its metrics.

A subset is a Modified Version under the SIL OFL, so it must not keep a Reserved
Font Name. Rewrites name IDs 1, 3, 4, 6 and 16 (and 2/17 where needed) in place.
Then writes presets.json `metrics[family]`: unitsPerEm, xHeight, capHeight, ink
ascent (tallest of b d h k l) and descent (lowest of g p q y), the centre and
half height of the i/j dots, the stem tops of the dotless i/j and the advance width of every mapped character, all in font units.
The title layout measures text from these tables, so Node tests and the panel
lay the title out exactly like the rendered graphic (kerning is ignored).
Any other name record that still contains a Reserved Font Name declared in the
licence (quoted after "Reserved Font Name") is dropped; the copyright notice
(ID 0) is kept as OFL requires. Fails if the new family name uses an RFN.
Usage: rename-font.py <font.woff2> <presets.json> <file name in presets> <OFL.txt>
"""
import json
import re
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

font_path, presets_path, file_name, licence_path = sys.argv[1:5]
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

# Reserved Font Names: the quoted names after "Reserved Font Name(s)" in the copyright lines.
with open(licence_path, encoding='utf-8') as fh:
    header = fh.read().split('This Font Software is licensed')[0]
rfns = []
for m in re.finditer(r"Reserved Font Names?\s*((?:[,\s]*(?:and\s+)?['\"\u2018\u201c][^'\"\u2019\u201d]+['\"\u2019\u201d])+)", header):
    rfns += re.findall(r"['\"\u2018\u201c]([^'\"\u2019\u201d]+)['\"\u2019\u201d]", m.group(1))
for rfn in rfns:
    if rfn.lower() in family.lower() or rfn.lower() in file_name.lower():
        sys.exit(f'{file_name}: {family} uses the Reserved Font Name {rfn!r}')
name.names = [r for r in name.names if r.nameID == 0 or not any(rfn.lower() in r.toUnicode().lower() for rfn in rfns)]
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
    """[centre x, centre y, half height] of the topmost contour (the dot of i/j), or None."""
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
    return [round((best[0] + best[2]) / 2), round((best[1] + best[3]) / 2), round((best[3] - best[1]) / 2)]


def stem_top(ch):
    """[x, y] of a dotless glyph's stem top: the mean x of its topmost outline points."""
    pen = DecomposingRecordingPen(glyphs)
    glyphs[cmap[ord(ch)]].draw(pen)
    pts = [p for _, args in pen.value for p in args]
    top = max(p[1] for p in pts)
    xs = [p[0] for p in pts if p[1] >= top - 0.03 * font['head'].unitsPerEm]
    return [round(sum(xs) / len(xs)), round(top)]


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
    # Stem tops of the dotless i/j (U+0131/U+0237), where the title's sparkles sit.
    'stems': {ch: stem_top(dl) for ch, dl in (('i', '\u0131'), ('j', '\u0237')) if ord(dl) in cmap},
    'advances': advances,
}
# Drop metrics of families no preset uses any more (e.g. after a rename).
used = {f['family'] for p in doc['presets'] for f in p['fonts']}
doc['metrics'] = {k: v for k, v in sorted(doc['metrics'].items()) if k in used}

# Presets stay readable (indented); each family's metrics go on one line.
lines = ['{', '  "version": ' + json.dumps(doc['version']) + ',', '  "presets": ' + json.dumps(doc['presets'], indent=2, ensure_ascii=True).replace('\n', '\n  ') + ',', '  "metrics": {']
items = list(doc['metrics'].items())
for i, (fam, m) in enumerate(items):
    lines.append('    ' + json.dumps(fam) + ': ' + json.dumps(m, ensure_ascii=True, separators=(',', ':')) + (',' if i < len(items) - 1 else ''))
lines += ['  }', '}']
with open(presets_path, 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(lines) + '\n')
print(f'{file_name}: {family} (reserved: {", ".join(rfns) or "none"})')
