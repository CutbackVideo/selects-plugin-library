#!/usr/bin/env python3
"""Dev-only: rename a subset WOFF2 to its `TEC ...` family.

A subset (and a static instance) is a Modified Version under the SIL OFL, so it must
not keep a Reserved Font Name. Rewrites name IDs 1, 2, 3, 4, 6, 16 and 17 in place and
drops the remaining family-derived records (variation instance names and so on).
Usage: rename-font.py <font.woff2> "<TEC Family>"
"""
import sys

from fontTools.ttLib import TTFont

font_path, family = sys.argv[1:3]
if not family.startswith('TEC '):
    sys.exit(f'{family}: the family must start with "TEC "')
ps_name = family.replace(' ', '')

font = TTFont(font_path)
name = font['name']
# Each TEC family holds a single upright face.
subfamily = 'Regular'
version = font['head'].fontRevision
values = {
    1: family,
    2: subfamily,
    3: f'{version:.3f};{ps_name}',
    4: family,
    6: ps_name,
    16: family,
    17: subfamily,
}
# Name IDs 21/22 (WWS) and 25 (variations PostScript prefix) can carry the original family.
for name_id in (21, 22, 25):
    name.removeNames(nameID=name_id)
for name_id, value in values.items():
    name.removeNames(nameID=name_id)
    name.setName(value, name_id, 3, 1, 0x409)
font.save(font_path)
print(f'{font_path}: {family}')
