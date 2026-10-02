#!/usr/bin/env python3
"""Assemble the single-file panel. No runtime dependencies; original build inputs live in src/."""
from pathlib import Path
import json,base64,sys
root=Path(__file__).resolve().parent
s=(root/'src/panel.template.tsx').read_text()
for name in ['LOOK','BROLL','CAPTIONS']:
 s=s.replace('/*EMBED_'+name+'*/',json.dumps((root/('src/'+name.lower()+'.tsx')).read_text()))
for name in ['planning','assets','verification','pipeline','engine']:
 s=s.replace('/*SECTION_'+name+'*/',(root/('src/'+name+'.ts')).read_text())
# fonts/font.css embeds Inter; it is rebuilt from fonts/inter.woff2 when that file is present (the public package ships only the CSS).
if (root/'fonts/inter.woff2').exists():
 css='@font-face{font-family:"Chris Reference Inter";src:url(data:font/woff2;base64,'+base64.b64encode((root/'fonts/inter.woff2').read_bytes()).decode()+') format("woff2");font-weight:100 900;font-style:normal;font-display:block;}'
 (root/'fonts/font.css').write_text(css)
out=Path(sys.argv[1]) if len(sys.argv)>1 else root.parent.parent/'panels/chris-williamson-style/panel.tsx'
(root/"panel.tsx").write_text(s)
out.write_text(s)
print(out)
