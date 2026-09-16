#!/usr/bin/env python3
"""Postcard run ledger and read-only loopback mask service; never changes Draft data."""
import os,sys,json,time,uuid,pathlib,subprocess,urllib.request,http.server,re,fcntl,hashlib
STORE=pathlib.Path(__file__).resolve().parent
RUNS=STORE/'runs'
DEFAULT_LOG=str(STORE/'logs')

def read(p,default=None):
 try:return json.loads(pathlib.Path(p).read_text())
 except FileNotFoundError:return default

def write(p,d):
 p=pathlib.Path(p);p.parent.mkdir(parents=True,exist_ok=True);t=p.with_name(p.name+'.tmp-'+str(os.getpid()));t.write_text(json.dumps(d,ensure_ascii=False,indent=2));t.replace(p)

def stamp():return {'at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'epochMs':round(time.time()*1000)}

def runpath(rid):
 if not re.fullmatch(r'[a-f0-9-]{36}',str(rid)):raise ValueError('Invalid run id')
 return RUNS/rid

def load(rid):
 d=read(runpath(rid)/'run.json')
 if not d:raise ValueError('Run not found')
 return d

def event(d,stage,status,details=None):
 e={**stamp(),'runId':d['runId'],'projectId':d['projectId'],'stage':stage,'status':status,**(details or {})};e['wallClockMs']=e['epochMs']-d['startedMs']
 p=pathlib.Path(d['logDir']);p.mkdir(parents=True,exist_ok=True)
 with (p/'events.jsonl').open('a') as f:f.write(json.dumps(e,ensure_ascii=False)+'\n')
 return e

def save(d):
 write(runpath(d['runId'])/'run.json',d);write(pathlib.Path(d['logDir'])/'run.json',d)

def health(port):
 try:return urllib.request.urlopen('http://127.0.0.1:%s/health'%port,timeout=2).read()==b'postcard-mask-service-v2'
 except:return False

def serve(port):
 class H(http.server.BaseHTTPRequestHandler):
  def do_OPTIONS(self):self.send_response(204);self.send_header('Access-Control-Allow-Origin','*');self.send_header('Access-Control-Allow-Methods','GET,HEAD,OPTIONS');self.end_headers()
  def do_HEAD(self):self.answer(False)
  def do_GET(self):self.answer(True)
  def answer(self,body):
   if self.path=='/health':b=b'postcard-mask-service-v2';ctype='text/plain'
   else:
    m=re.fullmatch(r'/assets/([a-f0-9-]{36})/(mask_\d{6}\.png)',self.path)
    if not m:self.send_error(404);return
    p=runpath(m[1])/'masks'/m[2]
    if not p.is_file():self.send_error(404);return
    b=p.read_bytes();ctype='image/png'
   self.send_response(200);self.send_header('Content-Type',ctype);self.send_header('Content-Length',str(len(b)));self.send_header('Access-Control-Allow-Origin','*');self.send_header('Cache-Control','public, max-age=31536000, immutable' if ctype=='image/png' else 'no-store');self.end_headers()
   if body:self.wfile.write(b)
  def log_message(self,fmt,*args):
   with (STORE/'asset-service-requests.log').open('a') as f:f.write(json.dumps({**stamp(),'request':fmt%args})+'\n')
 server=http.server.ThreadingHTTPServer(('127.0.0.1',port),H)
 write(STORE/'service.json',{'port':server.server_port,'pid':os.getpid(),'version':2})
 server.serve_forever()

def ensure():
 STORE.mkdir(parents=True,exist_ok=True)
 with (STORE/'service.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);old=read(STORE/'service.json',{})
  if old.get('port') and health(old['port']):return old
  port=old.get('port',0)
  with (STORE/'asset-service.log').open('a') as log:
   child=subprocess.Popen([sys.executable,str(pathlib.Path(__file__).resolve()),'serve',str(port)],cwd=str(STORE),stdout=log,stderr=log,start_new_session=True)
  for _ in range(50):
   cfg=read(STORE/'service.json',{})
   if cfg.get('port') and health(cfg['port']):return cfg
   if child.poll() is not None:raise RuntimeError('Mask service could not start on its saved port; do not change the port of existing Draft assets. See asset-service.log')
   time.sleep(.1)
  raise RuntimeError('Mask server startup timed out')

def execute(args,d,stage):
 t=time.time();event(d,stage,'start',{'command':args});r=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 pathlib.Path(d['logDir'],stage+'.stderr.log').write_text(r.stderr)
 event(d,stage,'end' if r.returncode==0 else 'failed',{'durationMs':round((time.time()-t)*1000),'exitCode':r.returncode})
 if r.returncode:raise RuntimeError(stage+': '+r.stderr[-2000:])
 return r.stdout,r.stderr

def main(op,a):
 if op=='ensure':return ensure()
 if op=='foreground':
  d=load(a['runId']);root=runpath(d['runId'])
  with (root/'foreground.lock').open('a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX)
   if d.get('foregroundPath') and d.get('foregroundVersion')==2:
    if not pathlib.Path(d['foregroundPath']).is_file():raise RuntimeError('Saved foreground file missing; inspect before retrying')
    return d
   mask=d.get('mask')
   if not mask or not pathlib.Path(mask['path']).is_dir():raise RuntimeError('Validated alpha masks required')
   stem=re.sub(r'[^A-Za-z0-9_-]+','_',pathlib.Path(d['source']['name']).stem).strip('_') or 'Subject'
   start=float(d['settings']['subjectStartSec']);name=f'Cutout Foreground - {stem} - {start:.3f}-{start+6.45:.3f}s - Alpha.webm';dest=root/name
   if dest.exists():raise RuntimeError('Uncommitted foreground file preserved; inspect before retrying')
   tmp=root/('foreground-'+str(uuid.uuid4())+'.webm');size=d['source']['frameSize'];w=int(size['width']);h=int(size['height'])
   if w%2 or h%2:raise RuntimeError('Foreground encoding requires even source dimensions')
   fc=f"[0:v]format=rgba[rgb];[1:v]scale={w}:{h},format=gray[a];[rgb][a]alphamerge,format=gbrap,geq=r='if(gt(alpha(X,Y),0),r(X,Y),0)':g='if(gt(alpha(X,Y),0),g(X,Y),0)':b='if(gt(alpha(X,Y),0),b(X,Y),0)':a='alpha(X,Y)',format=yuva420p[out]"
   started=time.time()
   execute(['ffmpeg','-v','error','-ss',str(start),'-i',d['source']['path'],'-framerate',str(mask['fps']),'-i',str(pathlib.Path(mask['path'])/'mask_%06d.png'),'-filter_complex',fc,'-map','[out]','-t','6.45','-an','-c:v','libvpx-vp9','-crf','18','-b:v','0','-deadline','good','-cpu-used','4','-auto-alt-ref','0',str(tmp)],d,'foreground-encode')
   execute(['ffmpeg','-v','error','-c:v','libvpx-vp9','-i',str(tmp),'-vf','alphaextract','-f','null','-'],d,'foreground-alpha-verify')
   tmp.rename(dest);d['foregroundPath']=str(dest);d['foregroundVersion']=2;save(d);event(d,'foreground','end',{'durationMs':round((time.time()-started)*1000),'path':str(dest)})
   return d
 if op=='rvm-preview':
  started=time.monotonic();src=pathlib.Path(a['path']).resolve(strict=True)
  digest=hashlib.sha256(src.read_bytes()).hexdigest();rid=str(uuid.uuid5(uuid.NAMESPACE_URL,'postcard-rvm-preview-v1:'+digest));root=runpath(rid);root.mkdir(parents=True,exist_ok=True)
  with (root/'preview.lock').open('a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX);cfg=ensure();meta=read(root/'preview.json');cached=bool(meta)
   if not meta:
    probe=json.loads(subprocess.check_output([a['ffprobe'],'-v','error','-select_streams','v:0','-show_entries','stream=avg_frame_rate','-of','json',str(src)],text=True,timeout=30))['streams'][0]
    num,den=map(float,probe['avg_frame_rate'].split('/'));fps=num/den
    tmp=root/('preparing-'+str(uuid.uuid4()));tmp.mkdir()
    r=subprocess.run([a['ffmpeg'],'-v','error','-c:v','libvpx-vp9','-i',str(src),'-vf','alphaextract','-fps_mode','passthrough',str(tmp/'mask_%06d.png')],capture_output=True,text=True,timeout=120)
    (root/'extract.stderr.log').write_text(r.stderr)
    if r.returncode:raise RuntimeError('RVM preview alpha extraction failed: '+r.stderr[-2000:])
    frames=sorted(tmp.glob('mask_*.png'))
    if not frames:raise RuntimeError('RVM preview alpha has no frames')
    dest=root/'masks'
    if dest.exists():raise RuntimeError('Uncommitted mask assets preserved; inspect before retrying')
    tmp.rename(dest);meta={'fps':fps,'count':len(frames),'path':str(dest),'sourceSHA256':digest};write(root/'preview.json',meta)
   meta={**meta,'baseUrl':f"http://127.0.0.1:{cfg['port']}/assets/{rid}",'cached':cached,'durationMs':round((time.monotonic()-started)*1000)}
   for index in [1,meta['count']]:
    with urllib.request.urlopen(meta['baseUrl']+'/mask_%06d.png'%index,timeout=5) as response:
     if response.read(8)!=b'\x89PNG\r\n\x1a\n':raise RuntimeError('RVM preview HTTP verification failed')
   with (root/'preview-events.jsonl').open('a') as log:log.write(json.dumps({**stamp(),**meta})+'\n')
   return meta
 if op=='settings-load':return read(STORE.parent.parent/'skills'/'postcard-cutout-studio'/'panel-state.json',{}).get(a['projectId'],{})
 if op=='settings-save':
  path=STORE.parent.parent/'skills'/'postcard-cutout-studio'/'panel-state.json'
  with (STORE/'settings.lock').open('a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX);settings=read(path,{});settings[a['projectId']]={**settings.get(a['projectId'],{}),**a['settings']};write(path,settings)
  return {'saved':True}
 if op=='claim':
  with (STORE/'runs.lock').open('a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX);d=load(a['runId'])
   if d['phase'] not in a['expected']:return {'claimed':False,'run':d}
   d.update(a['patch']);save(d);event(d,a.get('stage','run'),'start',a.get('details'));return {'claimed':True,'run':d}
 if op=='job-record':
  d=load(a['runId']);j=read(pathlib.Path(d['logDir'])/'generation-job.json',{})
  if j.get('jobId'):d['generation']={**d.get('generation',{}),**j};save(d)
  return d
 if op=='load':
  if a.get('runId'):return load(a['runId'])
  rid=read(STORE/'active-runs.json',{}).get(a['projectId']);return load(rid) if rid else None
 if op=='init':
  with (STORE/'runs.lock').open('a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX);active=read(STORE/'active-runs.json',{});old=load(active[a['projectId']]) if a['projectId'] in active else None
   if a.get('replaceSettled'):
    if not old or old['runId']!=a.get('previousRunId'):raise RuntimeError('The active run changed. Reload before starting a new request; no duplicate generation started.')
    phase=old.get('phase')
    if phase not in ['draftReady','exportFailed','generationFailed','complete','abandoned']:raise RuntimeError('The previous run is still active; resume it rather than duplicate generation.')
    if phase=='exportFailed' and a.get('verifiedExportTerminalStatus') not in ['failed','canceled','cancelled']:raise RuntimeError('Confirm the previous Export is terminal before starting a new run.')
    if phase=='generationFailed' and old.get('generation',{}).get('status') not in ['failed','canceled','cancelled']:raise RuntimeError('Generation status remains uncertain; do not submit again.')
   elif old and old.get('phase') not in ['complete','abandoned']:return old
   rid=str(uuid.uuid4());d={**a,'runId':rid,'startedMs':round(time.time()*1000),'phase':'ready','logDir':str(pathlib.Path(a.get('logRoot') or DEFAULT_LOG)/rid),'draftName':'Postcard Cutout Studio — '+rid};runpath(rid).mkdir(parents=True,exist_ok=False);save(d);active[a['projectId']]=rid;write(STORE/'active-runs.json',active);event(d,'run','start',{'settings':a.get('settings')});return d
 if op in ['update','event']:
  d=load(a['runId'])
  if op=='update':d.update(a.get('patch',{}));save(d)
  if a.get('stage'):event(d,a['stage'],a.get('status','info'),a.get('details'))
  return d
 if op=='prepare':
  d=load(a['runId']);cfg=ensure();dest=runpath(d['runId'])/'masks'
  if d.get('mask') and dest.is_dir():return d
  if dest.exists():raise RuntimeError('Existing mask folder preserved; inspect interrupted run rather than overwrite it.')
  src=a['sourcePath'];cut=a['cutoutPath'];start=float(a['startSeconds']);dur=6.45
  event(d,'mask-prepare','start');t=time.time()
  probe,_=execute(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,pix_fmt,width,height,avg_frame_rate:stream_tags','-of','json',cut],d,'cutout-probe');p=json.loads(probe)['streams'][0]
  pf=p.get('pix_fmt','');alphaTag=str(p.get('tags',{}).get('alpha_mode',p.get('tags',{}).get('ALPHA_MODE','0')))
  decoder=['-c:v','libvpx-vp9'] if p.get('codec_name')=='vp9' and alphaTag=='1' else []
  if not decoder and not any(x in pf for x in ['yuva','rgba','argb','bgra','gbrap']):raise RuntimeError('Generated output has no decoded alpha: '+pf+'. Preserve the same job; do not regenerate.')
  # Frame/time mapping is local to the prepared segment. Alignment check resizes original only to the cutout dimensions.
  fc=f"[1:v]format=rgba,split=2[cut][a0];[a0]alphaextract[a];[0:v]scale={p['width']}:{p['height']},format=rgb24[o];[o][a]alphamerge,format=rgba,premultiply=inplace=1,format=rgb24[op];[cut]premultiply=inplace=1,format=rgb24[cp];[op][cp]ssim"
  _,err=execute(['ffmpeg','-hide_banner','-ss',str(start),'-t',str(dur),'-i',src,'-t',str(dur),*decoder,'-i',cut,'-filter_complex',fc,'-an','-f','null','-'],d,'provenance-check')
  m=re.findall(r'All:([0-9.]+)',err);ssim=float(m[-1]) if m else 0
  if ssim<.97:raise RuntimeError('Cutout does not match source window (SSIM %.6f). No Draft was created.'%ssim)
  tmp=runpath(d['runId'])/('mask-preparing-'+str(uuid.uuid4()));tmp.mkdir()
  execute(['ffmpeg','-y','-hide_banner','-loglevel','error',*decoder,'-i',cut,'-t',str(dur),'-vf','alphaextract','-vsync','0',str(tmp/'mask_%06d.png')],d,'mask-extract')
  frames=sorted(tmp.glob('mask_*.png'));num,den=map(float,p['avg_frame_rate'].split('/'));fps=num/den
  if len(frames)<int(dur*fps)-1:raise RuntimeError('Mask does not cover the foreground duration')
  coverage=[]
  for img in [frames[0],frames[len(frames)//2],frames[-1]]:
   pix=subprocess.check_output(['ffmpeg','-v','error','-i',str(img),'-vf','scale=64:64','-pix_fmt','gray','-f','rawvideo','-'])
   coverage.append(sum(pix)/(255*len(pix)))
  if all(x<.0001 or x>.9999 for x in coverage):raise RuntimeError('Mask is blank or entirely opaque; preserved output for inspection, no regeneration.')
  event(d,'mask-coverage','end',{'samples':coverage})
  tmp.rename(dest)
  first=f"http://127.0.0.1:{cfg['port']}/assets/{d['runId']}/mask_000001.png"
  with urllib.request.urlopen(first,timeout=5) as r:
   if r.status!=200 or r.read(8)!=b'\x89PNG\r\n\x1a\n':raise RuntimeError('Mask HTTP validation failed')
  d['mask']={'baseUrl':first.rsplit('/',1)[0],'fps':fps,'count':len(frames),'path':str(dest),'sourcePath':src,'sourceStartSeconds':start,'cutoutPath':cut,'provenanceSsim':ssim};d['phase']='maskReady';save(d);event(d,'mask-prepare','end',{'durationMs':round((time.time()-t)*1000),'mask':d['mask']});return d
 raise ValueError('Unknown operation')

if __name__=='__main__':
 if len(sys.argv)>1 and sys.argv[1]=='serve':serve(int(sys.argv[2]))
 else:
  try:print(json.dumps(main(sys.argv[1],json.loads(sys.argv[2]) if len(sys.argv)>2 else {}),ensure_ascii=False))
  except Exception as e:
   print(json.dumps({'error':str(e)}),file=sys.stderr);sys.exit(1)
