#!/usr/bin/env python3
"""Build portable SVG font faces from the plugin's original OFL WOFF2.
Requires fonttools[woff]. The installed plugin has no Python dependency.
"""
import base64, io, json, re
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
ROOT = Path(__file__).resolve().parents[1]
css = (ROOT / 'plugins/chris-williamson-style/fonts/font.css').read_text()
source = base64.b64decode(re.search(r'base64,([^)]*)', css).group(1))
faces = []
for weight in (700, 800, 900):
    font = TTFont(io.BytesIO(source), recalcTimestamp=False)
    font.flavor = None
    if 'fvar' in font:
        font = instantiateVariableFont(font, {'wght': weight}, inplace=True)
    font['OS/2'].usWeightClass = weight
    output = io.BytesIO()
    font.save(output)
    faces.append({'family': 'Chris Reference Inter', 'base64': base64.b64encode(output.getvalue()).decode()})
(ROOT / 'shared/shader-effects/chris-font.mjs').write_text(
    "// Inter from plugins/chris-williamson-style/fonts/font.css, instantiated at 700/800/900.\n"
    "// SIL OFL; see that plugin's fonts/OFL.txt.\nexport const CHRIS_FONTS=" + json.dumps(faces, separators=(',', ':')) + ';\n')
