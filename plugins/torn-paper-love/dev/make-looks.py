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
# Mostly light paper, serif/Didone/typewriter/condensed faces; heavy faces (black, slab) are rare and thinned (`thin`,
# em), one dark-backed look, red accents (offered to one letter per build) and a rare blue. `weight` is the sampling
# weight of tplAssignLooks; `cut: 'contour'` chips follow the glyph instead of a rectangle.
looks = [
    {'id': 'grey-serif', 'face': 'serif', 'fg': '#1b1b1b', 'bg': '#cbc6bd', 'case': 'upper', 'weight': 3},
    {'id': 'paper-serif', 'face': 'serif', 'fg': '#151515', 'bg': '#eeeae2', 'case': 'upper', 'cut': 'contour', 'weight': 3},
    {'id': 'outline-serif', 'face': 'serif', 'fg': '#1a1a1a', 'bg': '#f1eee8', 'case': 'upper', 'outline': True, 'weight': 1.5},
    {'id': 'didone-lower', 'face': 'didone', 'fg': '#141414', 'bg': '#e9e4da', 'case': 'lower', 'weight': 2},
    {'id': 'didone-grey', 'face': 'didone', 'fg': '#1a1a1a', 'bg': '#d6d1c8', 'case': 'upper', 'cut': 'contour', 'weight': 1.5},
    {'id': 'type-grey', 'face': 'typewriter', 'fg': '#222222', 'bg': '#dcd7cd', 'case': 'any', 'weight': 3},
    {'id': 'type-cream', 'face': 'typewriter', 'fg': '#1e1e1e', 'bg': '#efe8d8', 'case': 'lower', 'weight': 1.5},
    {'id': 'condensed-cream', 'face': 'condensed', 'fg': '#1e1e1e', 'bg': '#ebe5d8', 'case': 'upper', 'weight': 2.5},
    {'id': 'red-serif', 'face': 'serif', 'fg': '#d0201a', 'bg': '#f1ece2', 'case': 'lower', 'cut': 'contour', 'weight': 1},
    {'id': 'red-condensed', 'face': 'condensed', 'fg': '#d0201a', 'bg': '#f4f1ea', 'case': 'upper', 'weight': 1},
    {'id': 'black-grey', 'face': 'black', 'fg': '#1a1a1a', 'bg': '#dedad3', 'case': 'upper', 'thin': 0.05, 'weight': 0.6},
    {'id': 'white-black', 'face': 'serif', 'fg': '#ece8e0', 'bg': '#1c1c1c', 'case': 'upper', 'weight': 0.5},
    {'id': 'blue-serif', 'face': 'serif', 'fg': '#3a78c9', 'bg': '#f1eee8', 'case': 'upper', 'cut': 'contour', 'weight': 0.3},
    {'id': 'slab-cream', 'face': 'slab', 'fg': '#1a1a1a', 'bg': '#ece4d3', 'case': 'upper', 'thin': 0.05, 'weight': 0.3},
]
with open(out, 'w', encoding='utf-8') as fh:
    json.dump({'faces': dict(zip(IDS, FAMILIES)), 'looks': looks, 'advance': advance}, fh, ensure_ascii=False, indent=1)
    fh.write('\n')
print('wrote', out)
