#!/usr/bin/env python3
"""Dev-only: rename a subset WOFF2 to its `TPL ...` family and drop Reserved Font Names.

A subset is a Modified Version under the SIL OFL, so it must not keep a Reserved Font
Name. Rewrites name IDs 1/2/3/4/6 and removes 16/17, strips any "Reserved Font Name" clause from the
copyright record, and removes other records that still carry the original family name.
Usage: rename-font.py <font.woff2> <new family> <original family> [<Reserved Font Name> ...]
"""
import re
import sys

from fontTools.ttLib import TTFont

font_path, family, original = sys.argv[1:4]
rfns = [r for r in sys.argv[4:] if r]  # Reserved Font Names from the family's OFL.txt
forbidden = [original] + rfns
ps_name = family.replace(' ', '') + '-Regular'

font = TTFont(font_path)
name = font['name']
version = font['head'].fontRevision
values = {
    1: family,
    2: 'Regular',
    3: f'{version:.3f};{ps_name}',
    4: family,
    6: ps_name,
}
# IDs 16/17 (typographic names) only matter when they differ from 1/2, so they are dropped:
# a stale copy would carry the original family name (and 17 is a style, not a family).
for name_id in (16, 17):
    name.removeNames(nameID=name_id)
for name_id, value in values.items():
    name.removeNames(nameID=name_id)
    name.setName(value, name_id, 3, 1, 0x409)
    name.setName(value, name_id, 1, 0, 0)

rfn = re.compile(r'[,;]?\s*with\s+Reserved\s+Font\s+Names?\b[^.]*', re.I)
kept = []
for rec in list(name.names):
    if rec.nameID in values:
        continue
    text = rec.toUnicode()
    if rec.nameID == 0:
        text = rfn.sub('', text).strip()
        rec.string = text
    # The copyright notice is kept (minus its RFN clause) unless it still names an RFN.
    check = rfns if rec.nameID == 0 else forbidden
    if any(f.lower() in text.lower() for f in check):
        name.removeNames(nameID=rec.nameID, platformID=rec.platformID, platEncID=rec.platEncID, langID=rec.langID)
    else:
        kept.append(rec.nameID)
font.save(font_path)
print(f'{font_path}: {family} (kept extra name IDs {sorted(set(kept))})')
