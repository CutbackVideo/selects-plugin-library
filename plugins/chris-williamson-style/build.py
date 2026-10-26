#!/usr/bin/env python3
"""Assemble the single-file panel. No runtime dependencies; original build inputs live in src/."""
from pathlib import Path
import json,base64,sys
root=Path(__file__).resolve().parent
args=sys.argv[1:]
check='--check' in args
args=[arg for arg in args if arg!='--check']
if len(args)>1 or any(arg.startswith('--') for arg in args):
 raise SystemExit('Usage: build.py [output-path] [--check]')
s=(root/'src/panel.template.tsx').read_text()
for name in ['LOOK','BROLL','CAPTIONS']:
 s=s.replace('/*EMBED_'+name+'*/',json.dumps((root/('src/'+name.lower()+'.tsx')).read_text()))
for name in ['planning','assets','verification','sharedFaces','pipeline','engine']:
 s=s.replace('/*SECTION_'+name+'*/',(root/('src/'+name+'.ts')).read_text())
# fonts/font.css embeds Inter; it is rebuilt from fonts/inter.woff2 when that file is present (the public package ships only the CSS).
outputs={root/'panel.tsx':s}
if (root/'fonts/inter.woff2').exists():
 css='@font-face{font-family:"Chris Reference Inter";src:url(data:font/woff2;base64,'+base64.b64encode((root/'fonts/inter.woff2').read_bytes()).decode()+') format("woff2");font-weight:100 900;font-style:normal;font-display:block;}'
 outputs[root/'fonts/font.css']=css
if check:
 if args: outputs[Path(args[0])]=s
 stale=[str(file) for file,content in outputs.items() if not file.is_file() or file.read_text()!=content]
 if stale: raise SystemExit('Out-of-date Chris artifact: '+', '.join(stale))
 print('Checked Chris panel and fonts.')
else:
 out=Path(args[0]) if args else root.parent.parent/'panels/chris-williamson-style/panel.tsx'
 outputs[out]=s
 for file,content in outputs.items(): file.write_text(content)
 print(out)
