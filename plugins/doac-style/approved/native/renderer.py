import pathlib,json,math,re,functools,subprocess,sys,concurrent.futures
from PIL import Image,ImageDraw,ImageFont,ImageFilter,ImageChops
import numpy as np
from scipy.ndimage import shift as subpixel_shift, gaussian_filter
P=pathlib.Path(__file__).resolve().parent
F='/System/Library/Fonts/Supplemental/'
LABEL=ImageFont.truetype(F+'Arial.ttf',16)
def cl(v):return max(0,min(1,v))
def clean(t):return re.sub('[^a-z0-9]','',t.lower())
@functools.lru_cache(maxsize=6000)
def mask(text,font,index,stroke,tracking,w,h):
 im=Image.new('L',(3500,400));d=ImageDraw.Draw(im);fo=ImageFont.truetype(font,140,index=index);x=12
 for c in text:
  d.text((x,8),c,font=fo,fill=255,stroke_width=stroke,stroke_fill=255);x+=fo.getlength(c)+tracking
 return im.crop(im.getbbox()).resize((max(1,round(w/2)),max(1,round(h/2))),Image.Resampling.LANCZOS)
def glyph(r,text=None):
 if r.get('glyphs') and not text:
  out=Image.new('L',(max(1,round(r['w']/2)),max(1,round(r['h']/2))))
  for g in r['glyphs']:
   m=mask(g['char'],r['font'],r.get('index',0),r.get('stroke',0),0,g['w'],g['h']);out.paste(m,(round((g['x']-r['x'])/2),round((g['y']-r['y'])/2)))
  return out
 return mask(text or r['text'],r['font'],r.get('index',0),r.get('stroke',0),r.get('tracking',0),r['w'],r['h'])
def write(can,r,blur=0,alpha=1,dy=0,dx=0,rgb=None,text=None,reveal=1,glow=0,texture=False,shadow=True):
 m=glyph(r,text);pad=22;w,h=m.size
 if text and text!=r['text'] and text.isdigit():
  nw=max(1,round(w*len(text)/len(r['text'])));m=m.resize((nw,h),Image.Resampling.LANCZOS);w=nw
 if reveal<1:m=m.copy();ImageDraw.Draw(m).rectangle((round(w*reveal),0,w,h),fill=0)
 ma=Image.new('L',(w+pad*2,h+pad*2));ma.paste(m,(pad,pad))
 if r.get('digitMotionFrame'):
  motion=r['digitMotionFrame']
  shifted=subpixel_shift(np.asarray(ma,dtype=float),(motion['dy'],motion['dx']),order=1,mode='constant',prefilter=False)
  ma=Image.fromarray(np.clip(gaussian_filter(shifted,(motion['blurY'],motion['blurX'])),0,255).astype('uint8'))
 if blur:ma=ma.filter(ImageFilter.GaussianBlur(blur))
 if alpha<1:ma=ma.point(lambda v:round(v*cl(alpha)))
 x=round(r['x']/2+dx)-pad;y=round(r['y']/2+dy)-pad;color=tuple(rgb or r['rgb'])
 if glow:
  gm=ma.filter(ImageFilter.GaussianBlur(glow));can.paste(color,(x,y),gm)
 if shadow:
  sh=ma.filter(ImageFilter.GaussianBlur(r.get('shadowBlur',.65))).point(lambda v:round(v*r.get('shadowOpacity',.84)));can.paste((0,0,0),(x+round(r.get('shadowX',1)),y+round(r.get('shadowY',2))),sh)
 if texture:
  yy,xx=np.mgrid[0:ma.height,0:ma.width];t=np.clip(.5+.45*np.sin((xx+x)*.026+(yy+y)*.037)+.2*np.cos((xx+x)*.061),0,1)
  a=np.array([46,133,226]) if clean(r['text'])!='slipped' else np.array([196,73,149]);b=np.array([248,250,255])
  tile=Image.fromarray((a[None,None,:]*(1-t[:,:,None])+b[None,None,:]*t[:,:,None]).astype('uint8'));can.paste(tile,(x,y),ma)
 else:can.paste(color,(x,y),ma)
class Renderer:
 def __init__(self,vid):
  self.vid=vid;self.p=P/vid;self.data=json.load(open(self.p/'plan.json'));self.events=self.data['events'];self.mattes={}
  for e in self.events:
   e.setdefault('runs',[])
   for run in e['runs']:
    if run.get('font','').endswith('PermanentMarker-Regular.ttf'):run['font']=str(P/'fonts/permanentmarker/PermanentMarker-Regular.ttf')
  if vid=='8_dh-IB9jZ8':
   for r in self.events[19]['runs']:
    if r['text']=='18 - 24':r.update(x=307,y=645,w=485,h=120)
  if vid=='NhbCBo1KuU8':
   for r in self.events[96]['runs']:
    if r['text']=='Now!':r['rgb']=[255,255,255]
   for r in self.events[0]['runs']:
    if r['text']=='SELL':r['rgb']=[255,255,255];r.update(x=116,y=888,w=140,h=40)
   for r in self.events[79]['runs']:
    if r['text']=="'BAD":r['text']='BAD'
 def render(self,e,f):
  v=self.vid;n=e['id'];t=f-e['start'];can=Image.new('RGB',(540,960),(61,59,62));d=ImageDraw.Draw(can)
  white=False
  if v=='SLdbVulRws8':
   can.paste((0,0,0),(0,0,540,960));d=ImageDraw.Draw(can)
   white=n in [28,36,37,38,39,88,103] or f in [490,491,508,523,1157,1158]
   bg=(251,251,251) if white else (0,0,0) if n in [19,70,87,115] else (58,57,60)
   d.rounded_rectangle((25,235,515,725),radius=18,fill=bg)
  if v=='NhbCBo1KuU8':
   if n==1:d.rectangle((49,433,469,473),fill=(200,36,43))
   if n==97:d.rectangle((304,698,506,776),fill=(193,35,41))
   if n in [34,35,36]:can.paste((194,207,211),(0,0,540,960));d=ImageDraw.Draw(can)
   if n==36:
    u=cl((f-1145)/42);pts=[(30,720),(105,698),(165,711),(226,655),(291,649),(343,606),(400,550),(505,405)];j=u*(len(pts)-1);k=int(j);path=pts[:k+1]
    if k<len(pts)-1:path.append(tuple(round(pts[k][a]*(1-(j-k))+pts[k+1][a]*(j-k)) for a in [0,1]))
    if f>=1175 and len(path)>1:d.polygon(path+[(path[-1][0],770),(30,770)],fill=(116,177,135))
    if len(path)>1:d.line(path,fill=(36,111,63),width=4)
   if n==91:d.rectangle((133,577,411,665),fill=(253,253,253))
   if n==82:
    lay=Image.new('RGB',(330,355),(61,59,62));ld=ImageDraw.Draw(lay)
    for j in range(7):
     ld.text((5,j*44),str(j+1)+'.',font=LABEL,fill=(245,245,245));ld.rectangle((33,j*44+5,280-(j%3)*27,j*44+16),fill=(225,225,225))
    lay=lay.filter(ImageFilter.GaussianBlur(5 if f<2735 else 8));can.paste(lay,(211,282))
  if v=='8_dh-IB9jZ8' and n==2:
   can.paste((32,36,32),(0,0,540,960));d=ImageDraw.Draw(can)
   # Unreadable surrounding board writing is represented by blurred strokes, never fabricated transcription.
   layer=Image.new('RGB',(490,730),(32,36,32));ld=ImageDraw.Draw(layer)
   for j in list(range(6))+list(range(10,14)):ld.line((25,j*48+20,440-(j%4)*24,j*48+20),fill=(155,158,147),width=5)
   can.paste(layer.filter(ImageFilter.GaussianBlur(5)),(25,120));d=ImageDraw.Draw(can)
  # Fading prior phrase stays in place while the next word rises.
  if v=='SLdbVulRws8' and n==77 and f<811:
   for r in self.events[75]['runs']:write(can,r,alpha=cl((819-f)/12),shadow=False)
  for r in e['runs']:
   if f<r['at'] or f>r.get('until',e['end']):continue
   c=clean(r['text']);blur=0;alpha=1;dy=dx=0;rgb=None;text=None;reveal=1;glow=0;texture=False
   if v=='SLdbVulRws8':
    texture=r.get('mode')=='texture';rgb=[5,5,5] if white else None
    if white:texture=False
    fades={4:(31,38),8:(70,77),15:(158,161),23:(246,252),25:(274,280),34:(373,379),39:(410,414),56:(591,595),63:(666,672),82:(887,891),98:(1085,1092),101:(1134,1140),111:(1231,1240)}
    if n in fades:
     a,b=fades[n];alpha=1-.95*cl((f-a+1)/(b-a+1));blur=cl((f-a)/(b-a))*1.1
    if n in [75,76]:alpha=1-.7*cl((f-805)/13)
    if n==70:dy=25*(1-cl((f-730)/13))**2.2
    if n==77:dy=26*(1-cl((f-811)/12))**2.2
    if n in [84,85]:alpha=cl((f-(894 if c.startswith('they') else 907)+1)/6)
   elif v=='8_dh-IB9jZ8':
    if n==3:glow=5 if r['mode'] in ['red','green','cyan'] else 0
    if n==6 and c=='one' and r['at']>=334:blur=5*(1-cl((f-336)/4))
    if n==12:blur=7*(1-cl((f-482)/14))
    if n==13 and c in ['the','president']:blur=3*cl((f-524)/18)
    if n==19 and c in ['and','the','us','will']:blur=5*cl((f-762)/11)
    if n==19 and c=='us' and f<734:reveal=.49
    if n==20 and r['text']=='18 - 24':
     reveal=.19 if f<819 else .38 if f<825 else .54 if f<831 else .78 if f<833 else 1
     write(can,r,rgb=[235,71,38],dx=-1,reveal=reveal,shadow=False);write(can,r,rgb=[48,153,243],dx=1,reveal=reveal,shadow=False)
    if n==29:blur=7*(1-cl((f-1163)/11))
    if n==2:rgb=[247,247,239]
    if n==2 and f>=130:blur=cl((f-130)/10)*5;dy=(f-130)*2;alpha=1-cl((f-130)/12)
   else:
    entries={9:(312,315,6),10:(329,333,6),11:(349,353,5),21:(652,672,6),32:(928,938,5),41:(1315,1349,7),94:(3293,3320,6)}
    if n in entries:
     a,b,z=entries[n];blur=z*(1-cl((f-a)/(b-a)))
    if n in [8,9,10] and f>=e['end']-2:blur=max(blur,2*(f-(e['end']-3)))
    if n==8:
     if c=='sp':reveal=.32 if f<277 else .65 if f<280 else 1
     if c=='500':reveal=.24 if f<289 else .50 if f<292 else .78 if f<294 else 1
    if n==14 and c=='us' and f<420:reveal=.5
    if n==68 and c=='ai' and f<2269:reveal=.62
    if n==37 and c=='165':
     # Each digit owns its geometry; unchanged places never get refitted.
     for state in r['digitStates']:
      if state['at']<=f<=state['until']:
       digit={**r,**state,'text':state['char'],'stroke':0,'tracking':0}
       digit['digitMotionFrame']=next((key for key in r.get('digitMotion',[]) if key['frame']==f and key['slot']==state['slot']),None)
       write(can,digit,shadow=False)
     continue
    if n==67 and f<2209:
     if f<2207:
      mm=glyph(r);arr=np.asarray(mm);rng=np.random.default_rng(f);yy,xx=np.where(arr>80);strength=max(.1,1-abs(f-2201)/7);take=rng.choice(len(xx),min(2400,len(xx)),replace=False);pts=zip(xx[take],yy[take]);dd=ImageDraw.Draw(can)
      for px,py in pts:
       jx=int(rng.normal(0,14*strength));jy=int(rng.normal(0,5*strength));qx=int(r['x']/2+px+jx);qy=int(r['y']/2+py+jy);dd.rectangle((qx,qy,qx+1,qy+1),fill=(245,245,245))
      if 2200<=f<=2202:continue
     off=4*(1-cl((f-2201)/8));write(can,r,rgb=[237,50,62],dx=-off,shadow=False);write(can,r,rgb=[51,193,231],dx=off,shadow=False)
     if f<2204:alpha=.3+.7*((f+1)%3)/2;dx=math.sin(f*4)*off
    if n==82 and f>=2735:blur=4*cl((f-2735)/5)
    if n==85 and c in ['because','theyll']:blur=2*cl((f-2902)/13)
    if n==91 and f>=3222:blur=3*(f-3221)
   write(can,r,blur,alpha,dy,dx,rgb,text,reveal,glow,texture,shadow=not (v=='SLdbVulRws8' or n in [34,35,36] and v=='NhbCBo1KuU8'))
  d=ImageDraw.Draw(can)
  if v=='SLdbVulRws8' and n in [84,85]:
   if f not in self.mattes:self.mattes[f]=Image.open(self.p/'occlusion'/f'{f-893:03}-mask.png').convert('L').resize((540,960),Image.Resampling.LANCZOS)
   can.paste((35,36,39),mask=self.mattes[f])
  if v=='8_dh-IB9jZ8':
   if n==2 and 99<=f<=129:
    u=cl((f-99)/10);d.arc((110,477,182,514),10,10+330*u,fill=(227,54,54),width=3)
   if n==47:
    for x,col in [(220,(156,52,206)),(270,(241,30,38)),(320,(40,195,104))]:d.rounded_rectangle((x-11,782,x+11,802),radius=4,fill=col)
  if v=='NhbCBo1KuU8':
   if n==31 and f>=911:
    y=702-47*cl((f-911)/4);d.rectangle((99,round(y),452,round(y+33)),fill=(0,0,0))
    for rr in e['runs']:
     if rr['text'] in ['BE','SEEN']:write(can,rr)
   if n==91:
    for x,col in [(224,(160,63,210)),(277,(241,28,37)),(329,(40,193,100))]:d.rounded_rectangle((x-11,751,x+11,772),radius=4,fill=col)
  if not e['runs']:
   d.text((20,915),'No caption overlay' if e['kind']!='P' else 'Physical card lettering (not an overlay)',font=LABEL,fill=(165,165,165))
  return can
 def compare(self,source,e,f):
  can=Image.new('RGB',(1080,1008),(22,22,25));can.paste(source,(0,48));can.paste(self.render(e,f),(540,48));d=ImageDraw.Draw(can)
  d.text((12,15),f'REFERENCE  E{e["id"]:03}  {f/30:.2f}s / f{f}',font=LABEL,fill='white');d.text((552,15),'TYPE STUDY · approximate fonts / motion',font=LABEL,fill='white');return can
 def stills(self):
  out=self.p/'stills';out.mkdir(exist_ok=True)
  for e in self.events:
   f=e['samples'][-1];src=Image.open(e['images'][-1]).convert('RGB').resize((540,960));self.compare(src,e,f).save(out/f'{e["id"]:03}.jpg',quality=92)
  for ch in range(math.ceil(len(self.events)/20)):
   subset=self.events[ch*20:(ch+1)*20];atlas=Image.new('RGB',(1600,math.ceil(len(subset)/4)*310),(22,22,25));d=ImageDraw.Draw(atlas)
   for i,e in enumerate(subset):
    f=e['samples'][-1];src=Image.open(e['images'][-1]).convert('RGB').resize((540,960));rep=self.render(e,f)
    if self.vid=='SLdbVulRws8':box=(30,410,510,580)
    elif e['kind']=='G':box=(0,100,540,880)
    elif e['runs']:
     ymin=min(r['y'] for r in e['runs'])/2-25;ymax=max(r['y']+r['h'] for r in e['runs'])/2+25;box=(30,max(0,int(ymin)),510,min(960,int(ymax)))
    else:box=(0,300,540,800)
    x=(i%4)*400;y=(i//4)*310;d.text((x+5,y+5),f'E{e["id"]:03}  source | study',font=LABEL,fill='white')
    for j,im in enumerate([src,rep]):
     im=im.crop(box);im.thumbnail((195,275));atlas.paste(im,(x+j*200,y+29))
   atlas.save(self.p/f'review-{ch}.jpg',quality=93)
  (self.p/'render-plan.json').write_text(json.dumps(self.data,ensure_ascii=False,indent=2))
 def video(self):
  src=self.data['source'];count=self.data['count']
  dec=subprocess.Popen(['ffmpeg','-v','error','-i',src,'-vf','scale=540:960','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
  enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1080x1008','-r','30','-i','-','-i',src,'-map','0:v','-map','1:a:0?','-c:a','aac','-b:a','128k','-c:v','libx264','-threads','3','-crf','19','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',str(self.p/'full-comparison.mp4')],stdin=subprocess.PIPE)
  idx=0
  for f in range(count):
   raw=dec.stdout.read(540*960*3);assert len(raw)==540*960*3,(self.vid,f,len(raw))
   while f>self.events[idx]['end']:idx+=1
   enc.stdin.write(self.compare(Image.frombytes('RGB',(540,960),raw),self.events[idx],f).tobytes())
   if f%300==0:print(self.vid,f,'/',count,flush=True)
  enc.stdin.close();assert enc.wait()==0;dec.stdout.close();dec.wait()
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(self.p/'full-comparison.mp4'),'-vf','crop=540:960:540:48','-an','-c:v','libx264','-threads','2','-crf','18','-preset','fast','-movflags','+faststart',str(self.p/'effects-only.mp4')],check=True)
  print(self.vid,'DONE',flush=True)
def run(vid,video=False):
 r=Renderer(vid);r.stills()
 if video:r.video()
if __name__=='__main__':
 ids=[x['id'] for x in json.load(open(P/'videos.json'))]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:list(ex.map(lambda v:run(v,'--video' in sys.argv),ids))
