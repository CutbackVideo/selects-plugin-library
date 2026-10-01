#!/usr/bin/env python3
"""Dev-only: rename a subset WOFF2 to its `AV ...` family and record its metrics.

A subset is a Modified Version under the SIL OFL, so it must not keep a Reserved
Font Name. Rewrites name IDs 1, 3, 4, 6 and 16 (and 2/17 where needed) in place.
Then writes presets.json `metrics[family]`: unitsPerEm, xHeight, capHeight, ink
ascent (tallest of b d h k l), descent (lowest of g p q y) and the advance width
of every mapped character, all in font units.
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
# Each AV family holds a single face (a weight is its own family, e.g. "AV Oswald Bold"),
# so the subfamily follows the italic flag only.
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


os2 = font['OS/2']
x_height = getattr(os2, 'sxHeight', 0) or bounds('x')[3]
cap_height = getattr(os2, 'sCapHeight', 0) or bounds('H')[3]
advances = {chr(cp): hmtx[g][0] for cp, g in sorted(cmap.items()) if cp >= 0x20 and cp not in (0xFEFF,)}
doc.setdefault('metrics', {})[family] = {
    'unitsPerEm': font['head'].unitsPerEm,
    'xHeight': x_height,
    'capHeight': cap_height,
    'ascent': max(bounds(c)[3] for c in 'bdhkl'),
    'descent': min(bounds(c)[1] for c in 'gpqy'),
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
