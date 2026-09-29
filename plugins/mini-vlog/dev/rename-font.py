#!/usr/bin/env python3
"""Dev-only: rename a subset WOFF2 to its `MV ...` family from presets.json.

A subset is a Modified Version under the SIL OFL, so it must not keep a Reserved
Font Name. Rewrites name IDs 1, 3, 4, 6 and 16 (and 2/17 where needed) in place.
Usage: rename-font.py <font.woff2> <presets.json> <file name in presets>
"""
import json
import sys

from fontTools.ttLib import TTFont

font_path, presets_path, file_name = sys.argv[1:4]
with open(presets_path, encoding='utf-8') as fh:
    presets = json.load(fh)['presets']
families = {s['family'] for p in presets for s in p['states'].values() if s['file'] == file_name}
if len(families) != 1:
    sys.exit(f'{file_name}: expected exactly one family in presets.json, got {sorted(families)}')
family = families.pop()
ps_name = family.replace(' ', '')

font = TTFont(font_path)
name = font['name']
# Each MV family holds a single face; italics are their own family (e.g. "MV Caveat" vs
# "MV Playfair Display Italic"), so the subfamily follows the font's italic flag.
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
print(f'{file_name}: {family}')
