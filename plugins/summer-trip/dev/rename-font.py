#!/usr/bin/env python3
"""Dev-only: rename a subset WOFF2 to its `ST ...` family from presets.json and check it
against the family's Reserved Font Names.

A subset is a Modified Version under the SIL OFL, so it must not keep a Reserved Font
Name. Rewrites name IDs 1, 2, 3, 4, 6, 16 and 17, drops the variation PostScript prefix
(ID 25), then checks EVERY remaining name record against the Reserved Font Names parsed
from the family's OFL.txt (a prefix alone is not enough when an RFN remains).
Usage: rename-font.py <font.woff2> <presets.json> <file name in presets> <OFL.txt>
"""
import json
import re
import sys

from fontTools.ttLib import TTFont


def reserved_font_names(ofl_text):
    """Names declared with 'with Reserved Font Name(s) ...' in the copyright lines."""
    names = []
    for m in re.finditer(r'with\s+Reserved\s+Font\s+Names?\s+(.+?)(?:\.\s|\.$|$)', ofl_text, re.I | re.M):
        for q in re.findall(r'["“\'](.+?)["”\']', m.group(1)):
            names.append(q.strip())
        if not re.search(r'["“\']', m.group(1)):
            names.append(m.group(1).strip().rstrip('.'))
    return [n for n in names if n]


font_path, presets_path, file_name, ofl_path = sys.argv[1:5]
with open(presets_path, encoding='utf-8') as fh:
    fonts = json.load(fh)['fonts']
if file_name not in fonts:
    sys.exit(f'{file_name}: not listed in presets.json "fonts"')
family = fonts[file_name]['family']
if not family.startswith('ST '):
    sys.exit(f'{file_name}: family must start with "ST ": {family}')
ps_name = family.replace(' ', '')

font = TTFont(font_path, recalcTimestamp=False)  # reproducible output
name = font['name']
# Each ST family holds a single face; italics are their own family, so the subfamily
# follows the font's italic flag.
subfamily = 'Italic' if font['OS/2'].fsSelection & 1 else 'Regular'
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
for name_id in list(values) + [18, 21, 22, 25]:
    name.removeNames(nameID=name_id)
for name_id, value in values.items():
    name.setName(value, name_id, 3, 1, 0x409)

with open(ofl_path, encoding='utf-8') as fh:
    rfns = reserved_font_names(fh.read())
for rec in name.names:
    text = rec.toUnicode()
    for rfn in rfns:
        if rfn.lower() in text.lower():
            sys.exit(f'{file_name}: name ID {rec.nameID} keeps Reserved Font Name "{rfn}": {text}')
font.save(font_path)
print(f'{file_name}: {family} (RFNs: {rfns or "none"})')
