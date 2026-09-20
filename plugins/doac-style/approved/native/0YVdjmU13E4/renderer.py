import json,pathlib,subprocess,math,functools
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import numpy as np
from scipy.ndimage import gaussian_filter
p=pathlib.Path(__file__).resolve().parent;plans=json.load(open(p/'plan.json'));old=json.load(open(p/'legacy-three-scenes.json'));S=.5
F='/System/Library/Fonts/Supplemental/';label=ImageFont.truetype(F+'Arial.ttf',17)
def word(text,font,stroke=0,tracking=0):
 im=Image.new('L',(2400,700));d=ImageDraw.Draw(im);x=30
 for ch in text:d.text((x,20),ch,font=font,fill=255,stroke_width=stroke,stroke_fill=255);x+=font.getlength(ch)+tracking
 return im.crop(im.getbbox())
def build(r,legacy=False):
 mask=Image.new('L',(540,960));font=ImageFont.truetype(r['font'],180,index=r.get('index',0));stroke=round(r.get('strokeAt200',0)*.9) if legacy else r.get('stroke',0)
 if 'glyphs' in r:
  for g in r['glyphs']:
   im=word(g['char'],font,stroke).resize((max(1,round(g['w']*S)),max(1,round(g['h']*S))),Image.Resampling.LANCZOS);mask.paste(im,(round(g['x']*S),round(g['y']*S)))
 else:
  im=word(r['text'],font,stroke,r.get('tracking',0)).resize((max(1,round(r['w']*S)),max(1,round(r['h']*S))),Image.Resampling.LANCZOS);mask.paste(im,(round(r['x']*S),round(r['y']*S)))
 return mask
for e in plans:
 if e.get('reuse'):e['runs']=[dict(r,legacy=True) for r in old if r['scene']==e['reuse']]
 for r in e['runs']:r['_mask']=build(r,r.get('legacy',False))
def paint(canvas,mask,rgb,blur=0,offset=(0,0),shadow=True):
 if isinstance(blur,tuple):mask=Image.fromarray(gaussian_filter(np.array(mask,dtype=float),blur).astype('uint8'))
 elif blur:mask=mask.filter(ImageFilter.GaussianBlur(blur))
 if offset!=(0,0):m=Image.new('L',mask.size);m.paste(mask,offset);mask=m
 if shadow:
  sh=Image.new('L',mask.size);sh.paste(mask,(1,2));sh=sh.filter(ImageFilter.GaussianBlur(.6)).point(lambda x:int(x*.84));canvas.paste((0,0,0),mask=sh)
 canvas.paste(tuple(rgb),mask=mask)
def render(idx,f):
 e=plans[idx-1];can=Image.new('RGB',(540,960),(63,59,61));d=ImageDraw.Draw(can)
 if idx==1:
  d.rectangle((103,322,441,388),fill='black')
  glow=Image.new('L',(540,960));ImageDraw.Draw(glow).line((0,434,540,434),fill=255,width=9);paint(can,glow,(215,110,123),7,shadow=False);d.line((0,434,540,434),fill=(255,190,194),width=6)
 if idx==72:
  d.rectangle((125,574,418,678),fill=(253,253,253))
  # Vector stand-ins preserve icon positions; brand artwork is not claimed identical.
  for x,c in [(224,(164,71,220)),(278,(246,24,38)),(329,(29,203,102))]:d.rounded_rectangle((x-13,731,x+13,756),radius=5,fill=c)
  d.polygon([(275,736),(275,752),(285,744)],fill='white');d.ellipse((220,735,228,743),fill='white');d.line((224,744,224,752),fill='white',width=3)
  for yy in [738,744,750]:d.arc((320,yy-2,338,yy+7),190,345,fill='black',width=2)
 for ri,r in enumerate(e['runs']):
  if f<r['at']:continue
  mask=r['_mask'];blur=0;offset=(0,0)
  if r.get('legacy'):
   if r['text']=='2' and f>=1738 or r['text']=='3' and f<1738:continue
   if any(f<g.get('at',r['at']) for g in r['glyphs']):
    mask=Image.new('L',(540,960));font=ImageFont.truetype(r['font'],180,index=r.get('index',0))
    for g in r['glyphs']:
     if f>=g.get('at',r['at']):mask.paste(word(g['char'],font,round(r.get('strokeAt200',0)*.9)).resize((max(1,round(g['w']/2)),max(1,round(g['h']/2))),Image.Resampling.LANCZOS),(round(g['x']/2),round(g['y']/2)))
   if r['text'] in ['2','3']:
    offset=(0,{1735:2,1736:6,1737:18,1738:18,1739:6,1740:2}.get(f,0));blur={1735:.3,1736:2,1737:6,1738:4.5,1739:1.5,1740:.5}.get(f,0);blur=(blur,.225) if blur else 0
  settle={5:(141,151,5),13:(430,443,5),21:(664,672,6),46:(1552,1556,5)}
  if idx in settle:
   a,b,v=settle[idx];blur=max(0,v*(b-f)/(b-a))
  if idx==22 and r['at']==689:blur=max(0,6*(701-f)/12)
  if idx==36 and r['text']=='WHERE':blur=max(0,5*(1212-f)/4)
  if idx==74:
   b=2440 if r['text'] in ['WHAT','WE'] else 2451;strength=3.5 if r['text'] in ['WHAT','WE'] else 2.5 if r['text']=='FOUND' else 4;blur=max(0,strength*(b-f)/(b-2434))
  if idx==45 and f>=1550:offset=(int((f-1549)*22),0);blur=3
  if idx in [27,28,41]:
   t=f-e['start']
   if idx==27:
    opacity=min(1,.04+.96*max(0,t-2)/6);mask=mask.point(lambda v:int(v*opacity))
   if idx==41:
    boxes=r['motionBoxes'];b0,b1=(boxes[0],boxes[1]) if f<=1380 else (boxes[1],boxes[2]);u=max(0,min(1,(f-b0['frame'])/(b1['frame']-b0['frame'])));b={k:round((b0[k]*(1-u)+b1[k]*u)/2) for k in ['x','y','w','h']};tight=mask.crop((round(r['x']/2),round(r['y']/2),round(r['x']/2)+max(1,round(r['w']/2)),round(r['y']/2)+max(1,round(r['h']/2))));m=Image.new('L',(540,960));m.paste(tight.resize((b['w'],b['h']),Image.Resampling.BICUBIC),(b['x'],b['y']));mask=m
    paint(can,mask,(230,60,66),.9,(-2,0),False);paint(can,mask,(120,215,208),.9,(2,0),False)
   else:
    prog=max(0,min(1,(f-841)/65)) if idx==28 else 0
    mask=mask.rotate(-6*prog,Image.Resampling.BICUBIC,center=(100,143));m=Image.new('L',(540,960));m.paste(mask,(0,round(18.5*prog)));mask=m
    paint(can,mask,(244,61,72),.5,(-1,0),False);paint(can,mask,(60,202,242),.5,(1,1),False)
    glitch=t<3 if idx==27 else t<7 and ri>=2
    if glitch:
     sliced=Image.new('L',mask.size)
     for y in range(0,960,4):
      if (y//4+t)%3: sliced.paste(mask.crop((0,y,540,y+2)),(round(math.sin(y+f)*7),y))
     mask=sliced
  if idx==18 and f==600:
   outline=mask.filter(ImageFilter.MaxFilter(3));paint(can,outline,(0,0,0),shadow=False)
  paint(can,mask,r.get('rgb',[253,253,253]),blur,offset)
 if not e['runs']:
  msg='Physical lettering — no overlay' if e['kind']=='prop' else 'No caption overlay'
  d.text((25,900),msg,font=label,fill=(190,190,190))
 return can

def compare(src,rep,idx,f):
 out=Image.new('RGB',(1080,1008),(23,23,25));out.paste(src,(0,48));out.paste(rep,(540,48));d=ImageDraw.Draw(out);d.text((15,14),f'REFERENCE  E{idx:03}  {f/24:.2f}s / f{f}',font=label,fill='white');d.text((555,14),'RECREATED TYPE · approximate fonts / motion',font=label,fill='white');return out
(p/'stills').mkdir(exist_ok=True)
