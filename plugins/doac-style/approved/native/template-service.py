"""Local template lab: use the approved Python renderers, never a second layout engine."""
import copy,io,json,math,hashlib,threading,importlib.util,types
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from PIL import Image,ImageFont,ImageDraw,ImageChops
P=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('approved',P/'renderer.py');modern=importlib.util.module_from_spec(spec);spec.loader.exec_module(modern)
legacy=types.ModuleType('approved_legacy');legacy.__file__=str(P/'0YVdjmU13E4/renderer.py');source=(P/'0YVdjmU13E4/renderer.py').read_text();exec(source.split('for idx,e in enumerate(plans,1):')[0].replace("if r['text'] in ['2','3']:","if r['text'] in ['2','3'] and not r.get('_staticNumber'):"),legacy.__dict__)
renderers={v:modern.Renderer(v) for v in ['NhbCBo1KuU8','8_dh-IB9jZ8']}
base_legacy_plans=copy.deepcopy(legacy.plans)
items=json.loads((P/'shortlist.json').read_text());lock=threading.Lock();cache=P/'template-renders';cache.mkdir(exist_ok=True)
_layout_spec=importlib.util.spec_from_file_location('shared_layout',P/'template-layout.py');shared_layout=importlib.util.module_from_spec(_layout_spec);_layout_spec.loader.exec_module(shared_layout)
original_glyph=modern.glyph

def replacement_mask(r,text):
 font=ImageFont.truetype(r['font'],140,index=r.get('index',0));stroke=r.get('stroke',round(r.get('strokeAt200',0)*.7))
 def raster(s):
  im=Image.new('L',(5000,500));ImageDraw.Draw(im).text((20,20),s,font=font,fill=255,stroke_width=stroke);box=im.getbbox();return im.crop(box) if box else Image.new('L',(1,1))
 old=raster(r['text']);new=raster(text)
 w=r.get('w',r.get('width'));h=r.get('h',r.get('height'))
 # Keep the approved font's existing aspect correction, then uniformly fit the slot.
 nw=w*new.width/max(old.width,1);nh=h*new.height/max(old.height,1);scale=min(1,w/max(nw,1),h/max(nh,1))
 if scale<.72 or nw*scale/w<.6:raise ValueError('This phrase does not fit the template. Shorten it or use another composition.')
 out=Image.new('L',(max(1,round(w/2)),max(1,round(h/2))));nw=max(1,round(nw*scale/2));nh=max(1,round(nh*scale/2));out.paste(new.resize((nw,nh),Image.Resampling.LANCZOS),((out.width-nw)//2,(out.height-nh)//2));return out

def glyph(r,text=None):
 if '_customMask' in r:return r['_customMask']
 return original_glyph(r,text)
modern.glyph=glyph

