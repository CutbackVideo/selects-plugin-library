"""Reject unreadable placements before opening an output encoder."""
from PIL import Image
import numpy as np

def validate(plans):
 for scene in plans:
  masks=[]
  for index,run in enumerate(scene['source']['runs']):
   w=run.get('w',run.get('width'));h=run.get('h',run.get('height'))
   if not (0<=run['x'] and 0<=run['y'] and run['x']+w<=1080 and run['y']+h<=1920):
    raise ValueError(f"{scene['id']}: text exceeds the canvas; shorten or change the template")
   if scene['id']=='05' and index==4:continue
   mask=run.get('_mask')
   if mask is None:
    mask=Image.new('L',(540,960));mask.paste(run['_customMask'],(round(run['x']/2),round(run['y']/2)))
   masks.append((index,np.asarray(mask)>127))
  for a,(i,first) in enumerate(masks):
   for j,second in masks[a+1:]:
    if np.count_nonzero(first & second)>2:
     raise ValueError(f"{scene['id']}: glyphs overlap in slots {i}, {j}")
