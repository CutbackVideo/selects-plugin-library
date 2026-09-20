# coding: utf-8
"""Compile the authoritative caption engine into independent transparent scene assets."""
import argparse, base64, hashlib, io, json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image
import engine


def catalogue():
    energy={item['id']: item for item in json.loads((engine.K/'template-energy.json').read_text())}
    result=[]
    for item in engine.svc.items:
        if item['id'] not in engine.POLICY['templates']: continue
        event=(engine.svc.base_legacy_plans[item['event']-1] if item['video']=='0YVdjmU13E4' else next(e for e in engine.svc.renderers[item['video']].events if e['id']==item['event']))
        meta=energy.get(item['id'],{})
        result.append(dict(id=item['id'],name=item['name'],slots=[r['text'] for r in event['runs']],slotMetrics=[dict(text=r['text'],width=r.get('w',r.get('width')),height=r.get('h',r.get('height')),fontIndex=r.get('index',0),color=r.get('rgb',[255,255,255])) for r in event['runs']],condition=meta.get('condition',''),score=meta.get('score'),filmReady=meta.get('filmReady',False)))
    return dict(templates=result,planning=(engine.K/'PLANNING.md').read_text(),energy=json.loads((engine.K/'template-energy.json').read_text()))


def transparent(plan,frame):
    black=np.asarray(engine.render(plan,frame,Image.new('RGB',(540,960),'black'),False)).astype(np.float32)
    white=np.asarray(engine.render(plan,frame,Image.new('RGB',(540,960),'white'),False)).astype(np.float32)
    alpha=np.clip(1-np.mean(white-black,axis=2)/255,0,1)
    rgb=np.clip(black/np.maximum(alpha[...,None],1/255),0,255)
    return Image.fromarray(np.dstack((rgb,alpha*255)).round().astype(np.uint8),'RGBA')


def scene_asset(plan,fps,index,directory):
    unique=[];lookup={};frames=[];bounds=None
    for f in range(plan['start'],plan['end']):
        im=transparent(plan,f);key=hashlib.sha256(im.tobytes()).digest()
        if key not in lookup:
            lookup[key]=len(unique);unique.append(im)
            box=im.getchannel('A').getbbox()
            if box: bounds=box if bounds is None else (min(bounds[0],box[0]),min(bounds[1],box[1]),max(bounds[2],box[2]),max(bounds[3],box[3]))
        frames.append(lookup[key])
    if bounds is None:raise ValueError('Empty caption scene')
    x,y,right,bottom=bounds;w=right-x;h=bottom-y
    cols=max(1,min(len(unique),4096//w));rows=math.ceil(len(unique)/cols)
    if rows*h>16384:raise ValueError('Scene is too long for an editable atlas; split this phrase')
    atlas=Image.new('RGBA',(cols*w,rows*h))
    for i,im in enumerate(unique):atlas.paste(im.crop(bounds),((i%cols)*w,(i//cols)*h))
    buf=io.BytesIO();atlas.save(buf,format='PNG')
    payload=dict(atlas='data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode(),frameMap=frames,fps=fps,x=x,y=y,w=w,h=h,cols=cols,rows=rows,size=100)
    target=directory/f'scene-{index:03}.json';target.write_text(json.dumps(payload,separators=(',',':')))
    unique[-1].save(directory/f'scene-{index:03}.png')
    return dict(index=index,start=plan['start'],end=plan['end'],template=plan['id'],text=' '.join(plan['texts']),payload=str(target),preview=str(directory/f'scene-{index:03}.png'),uniqueFrames=len(unique),bytes=len(buf.getvalue()))


def compile_job(path,only=None):
    path=Path(path).resolve();job=json.loads(path.read_text());data=job['input'];editorial=job['editorial']
    plans,records,placement=engine.compile(data,editorial)
    out=path.parent/'compiled';out.mkdir(exist_ok=True)
    scenes=[]
    for i,plan in enumerate(plans):
        if only is not None and i!=only:continue
        scenes.append(scene_asset(plan,data['fps'],i,out))
        print(json.dumps(dict(progress=i+1,total=len(plans))),flush=True)
    result=dict(scenes=scenes,records=records,placement=placement,words=len(data['words']),frames=data['frames'],fps=data['fps'])
    dest=out/('manifest.json' if only is None else f'manifest-{only:03}.json');dest.write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(dict(manifest=str(dest))),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('command',choices=['catalogue','compile']);p.add_argument('job',nargs='?');p.add_argument('--scene',type=int);a=p.parse_args()
    if a.command=='catalogue':print(json.dumps(catalogue(),ensure_ascii=False))
    else:compile_job(a.job,a.scene)
