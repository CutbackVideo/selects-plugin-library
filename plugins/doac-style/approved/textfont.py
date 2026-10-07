"""Per-character font fallback for caption text the plan's font cannot draw.

The approved faces (Helvetica, Arial, Georgia, Times, Permanent Marker) have no
Hangul. A character the face lacks (it rasterizes as .notdef) is drawn with
Apple SD Gothic Neo at the same size and a matching weight, when that has it.
Text the face covers takes the plain Pillow call, unchanged.
Mirrored in approved/web/engine.js (fallback runs) and worker.js (Windows maps
the fallback to Malgun Gothic)."""
import unicodedata
from pathlib import Path
from PIL import ImageDraw,ImageFont
FALLBACK='/System/Library/Fonts/AppleSDGothicNeo.ttc'
PROBE='\U0010FFFD'
# Apple SD Gothic Neo face: 0 Regular, 2 Medium, 6 Bold, 16 Heavy.
WEIGHT={('HelveticaNeue.ttc',1):6,('HelveticaNeue.ttc',9):6,('HelveticaNeue.ttc',10):2,('Helvetica.ttc',1):6,
 ('Arial Bold.ttf',0):6,('Arial Bold Italic.ttf',0):6,('Arial Narrow Bold.ttf',0):6,('Georgia Bold.ttf',0):6,
 ('Arial Black.ttf',0):16,('PermanentMarker-Regular.ttf',0):6}
_fallback={};_cover={}

def fallback(font):
 key=(str(font.path),font.index,font.size)
 if key not in _fallback:
  _fallback[key]=None
  # A collection without that weight still has face 0.
  for index in dict.fromkeys([WEIGHT.get((Path(str(font.path)).name,font.index),0),0]):
   try:_fallback[key]=ImageFont.truetype(FALLBACK,font.size,index=index);break
   except OSError:pass
 return _fallback[key]

def covers(font,ch):
 key=(str(font.path),font.index,font.size,ch)
 if key not in _cover:
  def sig(c):m=font.getmask(c);return m.size,bytes(m)
  _cover[key]=sig(ch)!=sig(PROBE)
 return _cover[key]

def runs(font,text):
 """[(font, text)]: the face's own characters, and the fallback's where the face has none."""
 text=unicodedata.normalize('NFC',text);out=[];fb=None
 for ch in text:
  f=out[-1][0] if out else font
  if not ch.isspace():
   f=font
   if not covers(font,ch):
    fb=fb or fallback(font)
    if fb is not None and covers(fb,ch):f=fb
  if out and out[-1][0] is f:out[-1][1]+=ch
  else:out.append([f,ch])
 return out or [[font,text]]

def ascent(font):
 return font.getbbox('H',anchor='la')[1]-font.getbbox('H',anchor='ls')[1]

def getlength(font,text):
 rs=runs(font,text)
 if len(rs)==1 and rs[0][0] is font:return font.getlength(text)
 return sum(f.getlength(t) for f,t in rs)

def getbbox(font,text,stroke_width=0):
 rs=runs(font,text)
 if len(rs)==1 and rs[0][0] is font:return font.getbbox(text,stroke_width=stroke_width)
 x=0;y=ascent(font);boxes=[]
 for f,t in rs:
  b=f.getbbox(t,stroke_width=stroke_width,anchor='ls');boxes.append((x+b[0],y+b[1],x+b[2],y+b[3]));x+=f.getlength(t)
 return min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)

def text(im,xy,text,font,fill=255,stroke_width=0,anchor=None):
 """ImageDraw.Draw(im).text(xy, text, ...) with fallback runs; anchor None ('la') or 'ms'."""
 draw=ImageDraw.Draw(im);rs=runs(font,text)
 if len(rs)==1 and rs[0][0] is font:return draw.text(xy,text,font=font,fill=fill,stroke_width=stroke_width,anchor=anchor)
 x,y=xy
 if anchor=='ms':x-=sum(f.getlength(t) for f,t in rs)/2
 else:assert anchor in (None,'la'),anchor;y+=ascent(font)
 for f,t in rs:
  draw.text((x,y),t,font=f,fill=fill,stroke_width=stroke_width,anchor='ls');x+=f.getlength(t)
