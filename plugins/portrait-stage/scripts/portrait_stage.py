#!/usr/bin/env python3
"""Shared resumable, local-CPU portrait alpha intermediate generator. stdout is exactly one JSON object."""
import argparse, base64, contextlib, fcntl, hashlib, json, os, re, shutil, subprocess, sys, time, uuid
from fractions import Fraction
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / '.local'
JOBS = LOCAL / 'jobs'

def write_json(path, value):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2))
    os.replace(tmp, path)

def run(args, **kw):
    p = subprocess.run([str(a) for a in args], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=180, **kw)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('utf-8', 'replace')[-3000:])
    return p.stdout

def tools():
    ff = os.environ.get('PORTRAIT_STAGE_FFMPEG') or shutil.which('ffmpeg')
    fp = os.environ.get('PORTRAIT_STAGE_FFPROBE') or shutil.which('ffprobe')
    if not ff or not fp:
        raise RuntimeError('FFmpeg or FFprobe is missing. Follow INSTALL.md.')
    return ff, fp

def probe(path):
    _, fp = tools()
    p = json.loads(run([fp,'-v','error','-count_frames','-show_streams','-show_format','-of','json',path]))
    v = next((s for s in p['streams'] if s['codec_type']=='video'), None)
    if not v: raise ValueError('The input has no video stream.')
    return p, v

def environment():
    import numpy, onnxruntime, PIL
    model = Path(os.environ.get('PORTRAIT_STAGE_MODEL', str(LOCAL/'models/rvm_mobilenetv3_fp32.onnx')))
    if not model.is_file(): raise RuntimeError('The RVM model is missing. Follow INSTALL.md.')
    tools()
    return model

@contextlib.contextmanager
def lock(path):
    with open(path, 'a') as f:
        try: fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: raise RuntimeError('This job is already running. Wait for it to finish.')
        try: yield
        finally: fcntl.flock(f, fcntl.LOCK_UN)

def job_path(jid):
    if not re.fullmatch('[a-f0-9]{12}',jid or ''): raise ValueError('Invalid job ID')
    return JOBS/jid

def load_job(jid): return json.loads((job_path(jid)/'status.json').read_text())
def public(j):
    return {k:v for k,v in j.items() if k not in ('signature',)}
def save(j):
    j['updatedAt']=time.time()
    write_json(job_path(j['jobId'])/'status.json', j)

def start(a):
    model=environment()
    source=Path(a.input).expanduser().resolve(strict=True)
    if not source.is_file(): raise ValueError('Select a local video file.')
    if not re.fullmatch('#[0-9a-fA-F]{6}', a.color): raise ValueError('Use a #RRGGBB background color.')
    if not a.title.strip() or len(a.title)>120 or any(ord(c)<32 for c in a.title):
        raise ValueError('Enter a single-line title of 1 to 120 characters.')
    out=Path(a.output_dir).expanduser().resolve(); out.mkdir(parents=True,exist_ok=True)
    stat=source.stat()
    signature={'contract':'editable-alpha-v1','input':str(source),'size':stat.st_size,'mtime':stat.st_mtime_ns,'color':a.color.upper(),'title':a.title,'outputDir':str(out)}
    JOBS.mkdir(parents=True,exist_ok=True)
    with lock(LOCAL/'start.lock'):
        latest=LOCAL/'latest.json'
        if latest.exists():
            old=load_job(json.loads(latest.read_text())['jobId'])
            if old['signature']==signature and old['status']!='cancelled' and (old['status']!='done' or Path(old['output']).exists()):
                return public(old)
            if old['status'] in ('queued','running','error'):
                raise RuntimeError('Job '+old['jobId']+' is unfinished. Resume or cancel it before starting another.')
        # Reuse the same intermediate even after testing a different input.
        for status in JOBS.glob('*/status.json'):
            prior=json.loads(status.read_text())
            if prior.get('signature')==signature and prior.get('status')=='done' and Path(prior['output']).is_file():
                write_json(latest,{'jobId':prior['jobId']})
                return public(prior)
        p,v=probe(source)
        rate=Fraction(v['avg_frame_rate'])
        if not 0<rate<=120: raise ValueError('Supported frame rate: greater than 0, up to 120 fps.')
        _,fp=tools()
        frames=json.loads(run([fp,'-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',source]))['frames']
        stamps=[float(f['best_effort_timestamp_time']) for f in frames]
        if len(stamps)<1: raise ValueError('No decodable video frames.')
        if any(abs((b-a)-float(1/rate))>0.002 for a,b in zip(stamps,stamps[1:])):
            raise ValueError('Variable frame rate is unsupported. Provide a constant frame rate video.')
        if v.get('sample_aspect_ratio','1:1') not in ('1:1','N/A','0:1'): raise ValueError('Non-square pixels are unsupported.')
        w,h=v['width'],v['height']
        rotation=next((int(s['rotation']) for s in v.get('side_data_list',[]) if 'rotation' in s),0)
        if abs(rotation)%180==90: w,h=h,w
        scale=min(1,1280/max(w,h)); w=max(2,round(w*scale/2)*2); h=max(2,round(h*scale/2)*2)
        jid=uuid.uuid4().hex[:12]; d=job_path(jid); (d/'frames').mkdir(parents=True)
        output=out/('portrait-stage-'+source.stem+'-'+jid+'-alpha.webm')
        j={'jobId':jid,'status':'queued','phase':'Ready','progress':0,'processedFrames':0,'totalFrames':len(stamps),'fps':str(rate),'duration':float(len(stamps)/rate),'hasAudio':any(s['codec_type']=='audio' for s in p['streams']),'width':w,'height':h,'signature':signature,'input':str(source),'color':a.color.upper(),'title':a.title,'output':str(output),'model':str(model),'modelSHA256':hashlib.sha256(model.read_bytes()).hexdigest(),'provider':'CPUExecutionProvider','error':None,'createdAt':time.time()}
        save(j); write_json(latest,{'jobId':jid}); return public(j)

def compose(fgr, alpha, j):
    import numpy as np
    from PIL import Image
    if 'crop' not in j:
        yy,xx=np.where(alpha>0.20)
        if len(xx)<100: raise RuntimeError('No person found in the first frame.')
        pad=max(24,int((xx.max()-xx.min())*.25))
        j['crop']=[max(0,int(xx.min())-pad),0,min(j['width'],int(xx.max())+pad+1),j['height']]
    x0,y0,x1,y1=j['crop']
    rgba=np.dstack((np.clip(fgr,0,255).astype('uint8'),(alpha*255).astype('uint8')))[y0:y1,x0:x1]
    subject=Image.fromarray(rgba,'RGBA')
    sc=min(492/subject.width,730/subject.height)
    subject=subject.resize((round(subject.width*sc),round(subject.height*sc)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(540,960),(0,0,0,0))
    canvas.paste(subject,((540-subject.width)//2,924-subject.height))
    return canvas

def step(jid, batch=12):
    import numpy as np, onnxruntime as ort
    from PIL import Image
    d=job_path(jid)
    with lock(d/'worker.lock'):
        j=load_job(jid)
        if j['status'] in ('done','cancelled'): return public(j)
        try:
            model=environment()
            if str(model)!=j['model'] or hashlib.sha256(model.read_bytes()).hexdigest()!=j['modelSHA256']:
                raise RuntimeError('The model changed during this job. Restore it or cancel the job.')
            sig=j['signature']; s=Path(j['input']).stat()
            if s.st_size!=sig['size'] or s.st_mtime_ns!=sig['mtime']: raise RuntimeError('The input changed during this job. Restore it or cancel the job.')
            j.update(status='running',phase='Removing background',error=None); save(j)
            first=j['processedFrames']; end=min(j['totalFrames'],first+batch)
            if first<end:
                ff,_=tools(); w,h=j['width'],j['height']
                raw=run([ff,'-v','error','-i',j['input'],'-map','0:v:0','-vf',f'trim=start_frame={first}:end_frame={end},scale={w}:{h},setsar=1','-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
                if len(raw)!=(end-first)*w*h*3: raise RuntimeError('Decoded frame count does not match the input.')
                options=ort.SessionOptions(); options.intra_op_num_threads=2; options.inter_op_num_threads=1
                session=ort.InferenceSession(str(model),sess_options=options,providers=['CPUExecutionProvider'])
                if first:
                    with np.load(d/f'state-{first}.npz') as z: rec=[z['r'+str(i)].copy() for i in range(4)]
                else: rec=[np.zeros((1,1,1,1),np.float32) for _ in range(4)]
                stats=[]
                for offset in range(end-first):
                    frame=np.frombuffer(raw,dtype=np.uint8,count=w*h*3,offset=offset*w*h*3).reshape(h,w,3)
                    inp={'src':np.ascontiguousarray(frame.transpose(2,0,1)[None],dtype=np.float32)/255,'downsample_ratio':np.array([min(1,512/max(w,h))],np.float32)}
                    inp.update({'r'+str(i+1)+'i':r for i,r in enumerate(rec)})
                    fgr,pha,*rec=session.run(None,inp)
                    alpha=np.clip(pha[0,0],0,1); f=np.clip(fgr[0].transpose(1,2,0)*255,0,255)
                    im=compose(f,alpha,j); n=first+offset
                    dest=d/'frames'/f'{n:06d}.png'; tmp=dest.with_suffix('.tmp'); im.save(tmp,format='PNG'); os.replace(tmp,dest)
                    if n in (0,j['totalFrames']//2,j['totalFrames']-1):
                        Image.fromarray((alpha*255).astype('uint8')).save(d/f'alpha-{n}.png')
                        Image.fromarray(frame).save(d/f'source-{n}.png')
                    stats.append({'frame':n,'alphaMean':float(alpha.mean()),'backgroundFraction':float((alpha<.05).mean()),'foregroundFraction':float((alpha>.95).mean())})
                state=d/f'state-{end}.npz'; tmp=state.with_suffix('.tmp')
                with open(tmp,'wb') as f: np.savez_compressed(f,**{'r'+str(i):r for i,r in enumerate(rec)})
                os.replace(tmp,state)
                j.setdefault('alphaStats',[]).extend(stats)
                j.update(processedFrames=end,progress=round(end/j['totalFrames']*90,1)); save(j)
                if first: (d/f'state-{first}.npz').unlink(missing_ok=True)
            if end==j['totalFrames']:
                j.update(phase='Encoding person layer',progress=94); save(j)
                finish(j)
            return public(j)
        except Exception as e:
            j.update(status='error',phase='Error',error=str(e)); save(j); raise

def finish(j):
    d=job_path(j['jobId']); ff,_=tools(); final=Path(j['output']); part=final.with_suffix('.partial.webm')
    run([ff,'-v','error','-y','-framerate',j['fps'],'-i',d/'frames/%06d.png',
         '-an','-c:v','libvpx-vp9','-lossless','1','-pix_fmt','yuva420p','-auto-alt-ref','0',
         '-threads','2','-map_metadata','-1',part])
    p,v=probe(part)
    if (v['width'],v['height'])!=(540,960) or int(v['nb_read_frames'])!=j['totalFrames'] or Fraction(v['avg_frame_rate'])!=Fraction(j['fps']):
        raise RuntimeError('Person layer dimensions, frame count or frame rate mismatch.')
    if str(v.get('tags',{}).get('alpha_mode',v.get('tags',{}).get('ALPHA_MODE')))!='1':
        raise RuntimeError('Alpha channel verification failed.')
    if any(s['codec_type']=='audio' for s in p['streams']): raise RuntimeError('The person layer must be silent. Audio comes from the original clip.')
    run([ff,'-v','error','-c:v','libvpx-vp9','-i',part,'-f','null','-'])
    os.replace(part,final)
    j.update(status='done',phase='Person layer ready',progress=100,error=None,verification={'width':540,'height':960,'frames':int(v['nb_read_frames']),'fps':v['avg_frame_rate'],'duration':j['duration'],'intermediateHasAudio':False,'originalHasAudio':j['hasAudio'],'alpha':True,'decode':'passed'})
    save(j); write_json(final.with_suffix('.json'),public(j))

def main():
    p=argparse.ArgumentParser(); sub=p.add_subparsers(dest='command',required=True)
    s=sub.add_parser('start'); s.add_argument('--input',required=True); s.add_argument('--output-dir',required=True); s.add_argument('--color',default='#2455E8'); s.add_argument('--title',default='PORTRAIT STAGE')
    for name in ('step','status','cancel'):
        s=sub.add_parser(name); s.add_argument('--job',required=name!='status')
    s=sub.add_parser('draft-script'); s.add_argument('--job',required=True); s.add_argument('--project',required=True); s.add_argument('--title',required=True); s.add_argument('--color',required=True)
    sub.add_parser('doctor'); sub.add_parser('defaults')
    a=p.parse_args()
    if a.command=='draft-script':
        j=load_job(a.job)
        if j['status']!='done' or j['signature'].get('contract')!='editable-alpha-v1': raise ValueError('Complete the person layer first.')
        if not re.fullmatch('#[0-9a-fA-F]{6}',a.color) or not a.title.strip() or len(a.title)>120: raise ValueError('Check the title and background color.')
        args={k:j[k] for k in ('jobId','input','output','totalFrames')}
        if not re.fullmatch('[a-zA-Z0-9-]+',a.project): raise ValueError('Invalid project ID')
        embedded=job_path(a.job)/'alpha-embedded-v1.webm'
        if not embedded.exists():
            ff,_=tools()
            run([ff,'-v','error','-y','-framerate',j['fps'],'-i',job_path(a.job)/'frames/%06d.png','-vf','scale=360:640','-an','-c:v','libvpx-vp9','-crf','38','-b:v','0','-pix_fmt','yuva420p','-auto-alt-ref','0','-threads','2',embedded])
        _,ev=probe(embedded)
        if int(ev['nb_read_frames'])!=j['totalFrames'] or Fraction(ev['avg_frame_rate'])!=Fraction(j['fps']): raise RuntimeError('Embedded person layer frame count or frame rate mismatch.')
        args.update(projectId=a.project,title=a.title,color=a.color.upper(),fps=float(Fraction(j['fps'])),videoSrc='data:video/webm;base64,'+base64.b64encode(embedded.read_bytes()).decode())
        script='const A = '+json.dumps(args,ensure_ascii=False)+';\n'+(ROOT/'scripts/create-draft.js').read_text()
        if len(script.encode())>262144: raise ValueError('The clip exceeds the current size limit. Use a shorter video. No Draft was saved.')
        destination=job_path(a.job)/('assembly-'+a.project+'.js'); destination.write_text(script)
        result={'scriptPath':str(destination),'scriptBytes':len(script.encode()),'embeddedSize':{'width':360,'height':640},'alphaOnly':True}
    elif a.command=='defaults':
        cfg=LOCAL/'defaults.json'; result=json.loads(cfg.read_text()) if cfg.exists() else {'input':'','outputDir':'','color':'#2455E8','title':'PORTRAIT STAGE'}
    elif a.command=='doctor':
        m=environment(); result={'ready':True,'model':str(m),'tools':tools()}
    elif a.command=='start': result=start(a)
    elif a.command=='step': result=step(a.job)
    else:
        jid=a.job
        if not jid:
            path=LOCAL/'latest.json'; jid=json.loads(path.read_text())['jobId'] if path.exists() else None
        if not jid: result={'status':'idle'}
        elif a.command=='status': result=public(load_job(jid))
        else:
            with lock(job_path(jid)/'worker.lock'):
                j=load_job(jid)
                if j['status']!='done': j.update(status='cancelled',phase='Cancelled'); save(j)
                result=public(j)
    # Per-frame metrics are stored on disk, not flooded into panel responses.
    result.pop('alphaStats',None)
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':
    try: main()
    except Exception as e:
        print(json.dumps({'status':'error','error':str(e)},ensure_ascii=False)); sys.exit(1)
