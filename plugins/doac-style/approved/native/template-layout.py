"""Shared replacement composition for approved templates, lab and film."""
from PIL import Image,ImageDraw,ImageFont
ROWS={'11':[[0],[1,2,3],[4],[5]],'22':[[0],[1,2,3,4],[5],[6]],'40':[[0]],'05':[[0],[1],[2],[3],[4],[5]],'06':[[0,1],[2,3],[4,5,6]],'19':[[0],[1,2],[3,4]],'24':[[1,0],[2],[3],[4]],'13':[[0],[1],[2]],'21':[[0],[1],[2]],'34':[[0],[1]],'33':[[0,1,2],[3]],'23':[[0,1],[2],[3]],'09':[[0,1,2],[3,4],[5]],'38':[[0,1],[2]]}
def apply(item,original,event,texts):
 if item['id'] not in ROWS:return False
 rows=ROWS[item['id']];src=original['runs'];dst=event['runs']
 if item['id']=='05':return number_layout(original,event,texts)
 for i,r in enumerate(src):
  if r['text'].isupper():texts[i]=texts[i].upper()
 def wh(r):return r.get('w',r.get('width')),r.get('h',r.get('height'))
 def raster(r,t):
  ft=ImageFont.truetype(r['font'],140,index=r.get('index',0));im=Image.new('L',(6000,450));ImageDraw.Draw(im).text((20,20),t,font=ft,fill=255,stroke_width=r.get('stroke',round(r.get('strokeAt200',0)*.7)));return im.crop(im.getbbox())
 boxes=[];rowm=[]
 for inds in rows:
  left=min(src[i]['x'] for i in inds);top=min(src[i]['y'] for i in inds);right=max(src[i]['x']+wh(src[i])[0] for i in inds);bottom=max(src[i]['y']+wh(src[i])[1] for i in inds);boxes.append((left,top,right,bottom))
  mm=[]
  for i in inds:
   old=raster(src[i],src[i]['text']);new=raster(src[i],texts[i]);w,h=wh(src[i]);mm.append(new.resize((max(1,round(w*new.width/old.width/2)),max(1,round(h*new.height/old.height/2))),Image.Resampling.LANCZOS))
  gaps=[max(5,round((src[b]['x']-(src[a]['x']+wh(src[a])[0]))/2)) for a,b in zip(inds,inds[1:])]
  rowm.append((mm,gaps))
 # Rectangular types share both edges. Other compositions retain intentional row offsets.
 rectangular=item['id'] in ['13','21','34','33','09','38']
 commonleft=min(b[0] for b in boxes);commonright=max(b[2] for b in boxes)
 resized=[]
 for box,(mm,gaps) in zip(boxes,rowm):
  width=round(((commonright-commonleft) if rectangular else box[2]-box[0])/2)
  factor=(width-sum(gaps))/sum(m.width for m in mm)
  ms=[m.resize((max(1,round(m.width*factor)),max(1,round(m.height*factor))),Image.Resampling.LANCZOS) for m in mm]
  # absorb rounding only in the last glyph mask (at most one pixel)
  delta=width-sum(m.width for m in ms)-sum(gaps)
  if delta:ms[-1]=ms[-1].resize((ms[-1].width+delta,ms[-1].height),Image.Resampling.LANCZOS)
  resized.append((ms,gaps))
 gapsy=[max(3,round((boxes[j+1][1]-boxes[j][3])/2)) for j in range(len(boxes)-1)]
 total=sum(max(m.height for m in ms) for ms,_ in resized)+sum(gapsy)
 # Short replacements must not inflate a row beyond the reference hierarchy.
 # Only non-rectangular layouts may leave intentional horizontal breathing room.
 if total>245 and not rectangular:
  capped=[]
  for (ms,gaps),box in zip(resized,boxes):
   factor=min(1,(box[3]-box[1])/2/max(m.height for m in ms))
   capped.append(([m.resize((max(1,round(m.width*factor)),max(1,round(m.height*factor))),Image.Resampling.LANCZOS) for m in ms],[max(3,round(g*factor)) for g in gaps]))
  resized=capped
  total=sum(max(m.height for m in ms) for ms,_ in resized)+sum(gapsy)
  if total>245:
   factor=(242-sum(gapsy))/sum(max(m.height for m in ms) for ms,_ in resized)
   if factor<.8:raise ValueError('The phrase is too dense for this composition.')
   resized=[([m.resize((max(1,round(m.width*factor)),max(1,round(m.height*factor))),Image.Resampling.LANCZOS) for m in ms],[max(3,round(g*factor)) for g in gaps]) for ms,gaps in resized]
   total=sum(max(m.height for m in ms) for ms,_ in resized)+sum(gapsy)
 if total>245:raise ValueError('This wording does not fit the reference hierarchy. Try a different phrase.')
 y=round((boxes[0][1]+boxes[-1][3])/4-total/2)
 for j,(inds,(ms,gaps),box) in enumerate(zip(rows,resized,boxes)):
  x=round((commonleft if rectangular else box[0])/2);rh=max(m.height for m in ms)
  for k,(i,m) in enumerate(zip(inds,ms)):
   yy=y+round((src[i]['y']-box[1])/2) if item['id']=='06' else y+rh-m.height;r=dst[i];r.update(x=x*2,y=yy*2,w=m.width*2,h=m.height*2);r['_customMask']=m
   full=Image.new('L',(540,960));full.paste(m,(x,yy));r['_mask']=full
   if r.get('legacy'):r['glyphs']=[]
   r.pop('_customRevealTimes',None)
   x+=m.width+(gaps[k] if k<len(gaps) else 0)
  y+=rh+(gapsy[j] if j<len(gapsy) else 0)
 return True

def number_layout(original,event,texts):
 # The approved large number spans the first two rows; remaining rows span full width.
 src=original['runs'];dst=event['runs']
 for i in [1,2,3,5]:texts[i]=texts[i].upper()
 def draw(i,text,x,y,w,h):
  r=src[i];ft=ImageFont.truetype(r['font'],140,index=r.get('index',0));m=Image.new('L',(5000,400));ImageDraw.Draw(m).text((10,10),text,font=ft,fill=255);m=m.crop(m.getbbox());scale=min(w/m.width,h/m.height);m=m.resize((round(m.width*scale),round(m.height*scale)),Image.Resampling.LANCZOS)
  yy=y+(h-m.height)//2;full=Image.new('L',(540,960));full.paste(m,(x,yy));dst[i].update(x=x*2,y=yy*2,w=m.width*2,h=m.height*2,_mask=full,_customMask=m,glyphs=[]);dst[i].pop('_customRevealTimes',None)
 draw(4,texts[4],116,586,58,79)
 draw(0,texts[0],116,586,58,79)
 for i,x,y,w,h in [(1,178,587,245,32),(2,178,628,246,38),(3,122,672,306,36),(5,122,714,304,33)]:draw(i,texts[i],x,y,w,h)
 for i in [0,4]:dst[i]['_staticNumber']=False
 return True
