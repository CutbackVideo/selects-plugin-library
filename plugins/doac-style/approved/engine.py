from pathlib import Path
import copy,json,inspect,textwrap,re,importlib.util
import geometry
from PIL import Image,ImageDraw,ImageFont
K=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('caption_native',K/'native/template-service.py');svc=importlib.util.module_from_spec(spec);spec.loader.exec_module(svc)
fn='def render(idx,f):'+(K/'native/0YVdjmU13E4/renderer.py').read_text().split('def render(idx,f):')[1].split('\ndef compare(')[0].replace("can=Image.new('RGB',(540,960),(63,59,61))","can=background.copy()")
ns=svc.legacy.__dict__.copy();exec(fn,ns)
mfn=textwrap.dedent(inspect.getsource(svc.modern.Renderer.render)).replace("can=Image.new('RGB',(540,960),(61,59,62))","can=background.copy()")
mn=svc.modern.__dict__.copy();exec(mfn,mn)
def clean(t):return re.sub(r'(?<!\d)[.,]|[.,](?!\d)','',t).replace('"','').strip()

POLICY=json.loads((K/"style.json").read_text())
def exact(a,z,id,phrases,starts):
 global plans
 item=next(i for i in svc.items if i['id']==id)
 source=svc.base_legacy_plans[item['event']-1] if item['video']=='0YVdjmU13E4' else next(e for e in svc.renderers[item['video']].events if e['id']==item['event'])
 e=copy.deepcopy(source);assert len(e['runs'])==len(phrases)
 phrases=[t.upper() if r['text'].isupper() else t for r,t in zip(source['runs'],phrases)]
 start=W[a]['start'];end=W[z+1]['start'] if z<len(W)-1 else duration
 for r,old,t,wi in zip(e['runs'],source['runs'],phrases,starts):
  m=svc.replacement_mask(r,t) if id not in svc.shared_layout.ROWS else Image.new('L',(1,1))
  if item['video']=='0YVdjmU13E4':
   full=Image.new('L',(540,960));full.paste(m,(round(r['x']/2),round(r['y']/2)));r['_mask']=full
   if r.get('legacy'):r['glyphs']=[]
  else:r['_customMask']=m
  r['at']=e['start']+round((W[wi]['start']-start)*item['fps']/fps)
  for key in ['x','y','w','h','width','height','font','index','rgb']:
   assert r.get(key)==old.get(key),(id,key)
 svc.shared_layout.apply(item,source,e,phrases)
 e['end']=e['start']+round((end-start)*item['fps']/fps)
 for r in e['runs']:r['until']=e['end']
 plans=[p for p in plans if p['end']<=start or p['start']>=end]
 plans.append(dict(start=start,end=end,event=item['event'],source=e,texts=phrases,groups=[(a,z)],video=item['video'],id=id,name=item['name'],sourceFps=item['fps']))

def compile(input_data, editorial):
 global W,fps,duration,plans
 W=input_data['words'];fps=input_data['fps'];duration=input_data['frames'];plans=[]
 covered=[]
 for sc in editorial:
  a,z=sc['words'];assert 0<=a<=z<len(W)
  covered.extend(range(a,z+1))
  if sc.get('template'):
   assert sc['template'] in POLICY['templates'],f"Template {sc['template']} needs a verified film adapter; do not silently substitute another template"
   slots=sc['slots'];texts=[' '.join(clean(w['text']) for w in W[x:y+1]) for x,y in slots]
   if 'texts' in sc:texts=sc['texts']
   exact(a,z,sc['template'],texts,[x for x,y in slots])
   # Every spoken token must appear exactly once. Number transitions may add an initial state.
   spoken=' '.join(clean(w['text']) for w in W[a:z+1]).lower()
   ordered=sorted(((slot[0],i,t) for i,(slot,t) in enumerate(zip(slots,texts)) if not (sc['template']=='05' and i==4)),key=lambda v:(v[0],v[1]))
   assigned=' '.join(t for _,_,t in ordered).lower()
   if sc['template']=='05':
    numbers=['zero','one','two','three','four','five','six','seven','eight','nine','ten']
    first,*rest=spoken.split()
    if first in numbers:spoken=' '.join([str(numbers.index(first)),*rest])
   assert assigned==spoken,(sc,spoken,assigned)
  else:
   plans.append(dict(start=W[a]['start'],end=W[z+1]['start'] if z+1<len(W) else duration,groups=[(a,z)],id='REF-E48',video='0YVdjmU13E4'))
 assert covered==list(range(len(W))),'Missing/repeated/out-of-order speech'
 plans.sort(key=lambda p:p['start'])
 for p,q in zip(plans,plans[1:]):assert p['end']==q['start']
 # Ordinary speech: one explicit reference style, common em and baseline spacing.
 for p in plans:
  if not p['id'].startswith('REF'):continue
  a=p['groups'][0][0];z=p['groups'][-1][1];words=[clean(w['text']) for w in W[a:z+1]]
  ft=ImageFont.truetype('/System/Library/Fonts/HelveticaNeue.ttc',52,index=1)
  whole=' '.join(words)
  if ft.getlength(whole)<=700:tt=[whole]
  else:
   opts=[[' '.join(words[:j]),' '.join(words[j:])] for j in range(1,len(words))]
   tt=min(opts,key=lambda ls:max(ft.getlength(t) for t in ls))
  assert max(ft.getlength(t) for t in tt)<=730,tt
  orig=copy.deepcopy(svc.base_legacy_plans[47]);e=copy.deepcopy(orig);e['runs']=[]
  for j,t in enumerate(tt):
   baseline=1426+j*62 if len(tt)==2 else 1460
   full=Image.new('L',(1080,1920));draw=ImageDraw.Draw(full);draw.text((540,baseline),t,font=ft,anchor='ms',fill=255)
   box=full.getbbox();r=copy.deepcopy(orig['runs'][min(j,1)]);r.update(text=t,x=box[0],y=box[1],w=box[2]-box[0],h=box[3]-box[1],rgb=[255,255,255],at=e['start'],_mask=full.resize((540,960),Image.Resampling.LANCZOS))
   e['runs'].append(r)
  p.update(source=e,event=48,texts=tt,id='REF-E48',name='Ordinary caption · 52px type / 62px baseline spacing')
 # Speaker color is independent of template; all applied yellow becomes white.
 for p in plans:
  for r in p['source']['runs']:
   c=r.get('rgb',[255,255,255])
   if c[0]>160 and c[1]>100 and c[2]<150:r['rgb']=[255,255,255]
 # Film placement is a whole-block translation, separate from template-local layout.
 placement=[]
 for p in plans:
  if p['id'].startswith('REF'):continue
  rr=p['source']['runs'];left=min(r['x'] for r in rr);right=max(r['x']+r.get('w',r.get('width')) for r in rr);top=min(r['y'] for r in rr);bottom=max(r['y']+r.get('h',r.get('height')) for r in rr)
  dx=round((540-(left+right)/2)/2)*2;dy=round((1400-(top+bottom)/2)/2)*2
  old=[(r['x'],r['y']) for r in rr]
  for r in rr:
   r['x']+=dx;r['y']+=dy
   if '_mask' in r:
    moved=Image.new('L',(540,960));moved.paste(r['_mask'],(dx//2,dy//2));r['_mask']=moved
  assert all((r['x']-x,r['y']-y)==(dx,dy) for r,(x,y) in zip(rr,old))
  placement.append(dict(id=p['id'],start=p['start']/fps,offset=[dx,dy],center=[(left+right)/2+dx,(top+bottom)/2+dy]))
  p['placement']=[dx,dy]
 
 
 font=ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc',12)
 small=ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc',10)
 records=[]
 for p in plans:
  slots=[]
  for r,t in zip(p['source']['runs'],p['texts']):
   ft=ImageFont.truetype(r['font'],140,index=r.get('index',0));stroke=r.get('stroke',round(r.get('strokeAt200',0)*.7))
   def extent(t):
    box=ft.getbbox(t,stroke_width=stroke);return box[2]-box[0],box[3]-box[1]
   ow,oh=extent(r['text']);nw,nh=extent(t);w=r.get('w',r.get('width'));h=r.get('h',r.get('height'))
   fit=min(1,ow/max(1,nw),oh/max(1,nh));em=140*h/max(1,nh)
   slots.append(dict(text=t,sourceText=r['text'],font=Path(r['font']).name,fontIndex=r.get('index',0),fontPxY=52 if p['id'].startswith('REF') else round(em,1),fit=1 if p['id'].startswith('REF') else round(fit,3),x=r['x'],y=r['y'],w=w,h=h,color=r.get('rgb',[253]*3),atSeconds=round(p['start']/fps+(r['at']-p['source']['start'])/p.get('sourceFps',24),3)))
  rec=dict(id=p['id'],name=p['name'],start=p['start']/fps,end=p['end']/fps,source=p['video'],event=p['event'],placement=p.get('placement',[0,0]),slots=slots)
  records.append(rec);p['debug']=rec
 
 geometry.validate(plans)
 return plans,records,placement

font=ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc',12)
small=ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc',10)
def render(p,f,im,debug=True):
 rf=p['source']['start']+round((f-p['start'])*p.get('sourceFps',24)/fps)
 if p['video']=='0YVdjmU13E4':
  ns['background']=im;ns['plans']=copy.copy(svc.base_legacy_plans);ns['plans'][p['event']-1]=p['source'];im=ns['render'](p['event'],rf)
 else:
  mn['background']=im
  # Hold the source settled state until the final two output frames; keep its entry/exit blur.
  # Source phase continues; speech-aligned late runs must remain reachable.
  im=mn['render'](svc.renderers[p['video']],p['source'],rf)
 if not debug:return im
 d=ImageDraw.Draw(im);rec=p['debug'];height=82+len(rec['slots'])*30
 d.rectangle((8,8,532,height),fill=(18,18,21));d.text((18,15),f"{rec['id']} · {rec['name']}",font=font,fill='white')
 d.text((18,34),f"{rec['source']} / E{rec['event']} | {f/fps:.2f}s | frame {f}",font=small,fill=(190,190,190))
 d.text((18,49),'1080×1920 coords · font px = vertical equivalent · native slots',font=small,fill=(190,190,190))
 d.text((18,63),'Shared template-lab layout | common row edges | no yellow',font=small,fill=(190,190,190))
 for j,s in enumerate(rec['slots']):
  y=81+j*30
  d.text((18,y),f"{j+1}. {s['text']} | {s['font']} #{s['fontIndex']}",font=small,fill='white')
  d.text((18,y+13),f"font {s['fontPxY']}px  fit {s['fit']}  xy {s['x']},{s['y']}  box {s['w']}×{s['h']}",font=small,fill=(185,215,230))
  pass
 # Exact original wording and native renderer, shown at the same relative source time.
 if p['video']=='0YVdjmU13E4':
  original=svc.base_legacy_plans[p['event']-1]
  preview=svc.legacy.render(p['event'],min(rf,original['end']))
 else:
  original=next(e for e in svc.renderers[p['video']].events if e['id']==p['event'])
  preview=svc.renderers[p['video']].render(original,min(rf,original['end']-3))
 runs=original['runs'];top=max(0,int(min(r['y'] for r in runs)/2)-12);bottom=min(960,int(max(r['y']+r.get('h',r.get('height')) for r in runs)/2)+12)
 crop=preview.crop((0,top,540,bottom));crop.thumbnail((320,135),Image.Resampling.LANCZOS)
 yy=max(height+12,205);d.text((110,yy),'ORIGINAL TEMPLATE · original text / native renderer',font=small,fill='white');im.paste(crop,((540-crop.width)//2,yy+18))
 return im
