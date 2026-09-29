#!/usr/bin/env python3
"""Dev-only: write assets/fonts/looks.json (faces, looks, per-1000-em advance table).
Usage: make-looks.py <out looks.json> <didone.woff2> <condensed.woff2> <serif.woff2> <slab.woff2> <black.woff2> <typewriter.woff2>
"""
import json
import sys

from fontTools.ttLib import TTFont

CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?&'- "
IDS = ['didone', 'condensed', 'serif', 'slab', 'black', 'typewriter']
FAMILIES = ['TPL Didone', 'TPL Condensed', 'TPL Serif', 'TPL Slab', 'TPL Black', 'TPL Typewriter']
out = sys.argv[1]
advance = {}
for face, path in zip(IDS, sys.argv[2:8]):
    font = TTFont(path)
    cmap, hmtx, upm = font.getBestCmap(), font['hmtx'], font['head'].unitsPerEm
    advance[face] = {c: round(hmtx[cmap[ord(c)]][0] * 1000 / upm) for c in CHARS}
looks = [
    {'id': 'grey-serif', 'face': 'serif', 'fg': '#111111', 'bg': '#bdb7ae', 'case': 'upper'},
    {'id': 'red-condensed', 'face': 'condensed', 'fg': '#d0201a', 'bg': '#ffffff', 'case': 'upper'},
    {'id': 'white-black', 'face': 'black', 'fg': '#ffffff', 'bg': '#111111', 'case': 'upper'},
    {'id': 'outline-serif', 'face': 'serif', 'fg': '#111111', 'bg': '#ffffff', 'case': 'upper', 'outline': True},
    {'id': 'blue-black', 'face': 'black', 'fg': '#3a78c9', 'bg': '#ffffff', 'case': 'upper'},
    {'id': 'slab-cream', 'face': 'slab', 'fg': '#111111', 'bg': '#efe6d2', 'case': 'upper'},
    {'id': 'didone-lower', 'face': 'didone', 'fg': '#111111', 'bg': '#ffffff', 'case': 'lower'},
    {'id': 'type-grey', 'face': 'typewriter', 'fg': '#222222', 'bg': '#d9d4ca', 'case': 'any'},
]
with open(out, 'w', encoding='utf-8') as fh:
    json.dump({'faces': dict(zip(IDS, FAMILIES)), 'looks': looks, 'advance': advance}, fh, ensure_ascii=False, indent=1)
    fh.write('\n')
print('wrote', out)
