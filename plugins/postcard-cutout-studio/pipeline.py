#!/usr/bin/env python3
"""Postcard run ledger and read-only loopback mask service; never changes Draft data."""
import os,sys,json,time,uuid,pathlib,subprocess,shutil,re,fcntl,hashlib,base64

def heavy():
 """The network and thread modules take about half of this script's 60ms
 start-up, and most calls (ledger updates, holds) need neither."""
 global urllib,http,concurrent
 import urllib.request,http.server,concurrent.futures
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

def source_identity(path):
 p=pathlib.Path(path).resolve(strict=True);s=p.stat()
 return {'path':str(p),'size':s.st_size,'mtimeNs':s.st_mtime_ns,'inode':s.st_ino}

def find_reusable(project_id,identity,start,exclude=None):
 """The latest finished cutout of this very stretch in this project, if any."""
 for record in sorted(RUNS.glob('*/run.json'),key=lambda p:p.stat().st_mtime,reverse=True):
  try:
   old=read(record,{})
   if old.get('runId')==exclude or old.get('projectId')!=project_id:continue
   if old.get('sourceIdentity')!=identity or float(old.get('settings',{}).get('subjectStartSec',-1))!=start:continue
   mask=old.get('mask',{})
   if not (mask.get('provenanceOk') or mask.get('provenanceSsim',0)>=.97) or not mask.get('count'):continue
   folder=pathlib.Path(mask['path'])
   if not all((folder/('mask_%06d.png'%i)).is_file() for i in range(1,mask['count']+1)):continue
   return old
  except (OSError,ValueError,KeyError,TypeError):continue
 return None

def reuse_cutout(d):
 identity=source_identity(d['source']['path'])
 start=float(d['settings']['subjectStartSec'])
 old=find_reusable(d['projectId'],identity,start,exclude=d['runId'])
 if old:
  try:
   mask=old['mask'];foreground=old.get('foregroundPath')
   patch={'phase':'maskReady','mask':mask,'sourceIdentity':identity,'cutoutMode':'reused','reusedFromRunId':old['runId']}
   if foreground and pathlib.Path(foreground).is_file() and old.get('foregroundVersion')==2:
    patch.update(foregroundPath=foreground,foregroundVersion=2)
   d.update(patch);save(d);event(d,'cutout','reused',{'previousRunId':old['runId']});return d
  except (OSError,ValueError,KeyError,TypeError):pass
 d['sourceIdentity']=identity;save(d)
 return d

def folder_media(a):
 root=pathlib.Path(a['path']).resolve(strict=True)
 if not root.is_dir():raise ValueError('Choose a folder, not an individual file.')
 extensions={'.mp4','.mov','.mkv','.webm','.m4v','.png','.jpg','.jpeg','.webp'}
 files=[];unreadable=[];limited=False;visited=0
 def onerror(error):unreadable.append(str(error.filename))
 for folder,dirs,names in os.walk(root,followlinks=False,onerror=onerror):
  dirs[:]=sorted(d for d in dirs if not d.startswith('.') and not pathlib.Path(folder,d).is_symlink())
  for name in sorted(names):
   visited+=1
   if visited>10000:limited=True;break
   path=pathlib.Path(folder,name)
   if not name.startswith('.') and path.suffix.lower() in extensions and not path.is_symlink():files.append(path)
  if limited:break
 offset=max(0,int(a.get('offset',0)));query=str(a.get('query','')).casefold()
 files=[path for path in files if query in str(path.relative_to(root)).casefold()]
 page=files[offset:offset+24]
 return {'path':str(root),'name':root.name,'total':len(files),'limited':limited,'unreadable':len(unreadable),'rows':[{'path':str(path),'name':path.name,'relativePath':str(path.relative_to(root)),'resourceId':'local:'+str(path)} for path in page]}

# Square tiles, as a library of mixed portrait and landscape media wants: a
# 3:2 crop of a 9:16 clip is a letterbox of its middle, and the grid read as a
# stack of slots rather than a sheet of pictures.
TILE_WIDTH,TILE_HEIGHT,STRIP_WIDTH=280,280,144
# A quarter in. `thumbnail` alone scores the frames it is given, so on a clip
# that fades up from black it faithfully returns the least black of a hundred
# black frames: 00_Grid_intro.mp4 came back at luma 9 of 255. Seeking first and
# scoring from there took the same clip to 29.
TILE_SEEK=0.25
MOVING={'.mp4','.mov','.mkv','.webm','.m4v'}

def moving(path):
 """Whether this file plays. Read from the suffix, not from ffprobe: a still
 JPEG reports a 0.04s duration - one frame at the container's nominal rate -
 which would label photos with a 0:00 badge and offer them a scrub."""
 return pathlib.Path(path).suffix.lower() in MOVING

def _seconds(value):
 try:
  n=float(value)
  return n if n>0 else None
 except (TypeError,ValueError):return None

def probe(path):
 """Duration and pixel size, or Nones for a still. One ffprobe, JSON out, so a
 photo's missing duration reads as absent rather than raising on 'N/A'."""
 r=subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','format=duration:stream=width,height','-of','json',path],capture_output=True,text=True,timeout=20)
 info=json.loads(r.stdout or '{}');stream=(info.get('streams') or [{}])[0]
 return {'durationSeconds':_seconds((info.get('format') or {}).get('duration')),'width':stream.get('width'),'height':stream.get('height')}

def tile_preview(a):
 """One grid tile: a representative still, plus the facts the tile labels itself
 with. Videos pick their still through `thumbnail`, which scores a batch of
 frames and returns the least uniform one - the first frame of a clip is so
 often a black slate or a leader that it made whole pages of the grid read as
 empty."""
 path=a['path'];meta=probe(path)
 if not moving(path):meta['durationSeconds']=None
 fit='scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d'%(TILE_WIDTH,TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT)
 duration=meta['durationSeconds']
 seek=['-ss',str(duration*TILE_SEEK)] if duration and duration>1 else []
 chain=(fit+',thumbnail=100') if duration else fit
 r=subprocess.run(['ffmpeg','-v','error',*seek,'-i',path,'-vf',chain,'-frames:v','1','-q:v','6','-f','image2pipe','-vcodec','mjpeg','-'],capture_output=True,timeout=30)
 if r.returncode or not r.stdout:raise RuntimeError('Could not decode the thumbnail.')
 result=dict(meta,thumb=base64.b64encode(r.stdout).decode('ascii'))
 if len(json.dumps(result).encode())<=PREVIEW_BYTES:return result
 for size in [224,160,112,72]:
  smaller=subprocess.run(['ffmpeg','-v','error','-f','image2pipe','-vcodec','mjpeg','-i','pipe:0','-vf','scale=%d:%d'%(size,size),'-frames:v','1','-q:v','28','-f','image2pipe','-vcodec','mjpeg','-'],input=r.stdout,capture_output=True,timeout=12)
  result=dict(meta,thumb=base64.b64encode(smaller.stdout).decode('ascii'))
  if smaller.returncode==0 and smaller.stdout and len(json.dumps(result).encode())<=PREVIEW_BYTES:return result
 raise RuntimeError('Could not fit the thumbnail within the response limit.')

PREVIEW_BYTES=44000 # Includes JSON/base64, with headroom below the host's 48 KiB cap.

def strip_preview(a):
 """Seek to ten positions, not decode an entire recording. Bound wire bytes."""
 path=a['path'];count=min(10,max(2,int(a.get('count',10))))
 duration=probe(path)['durationSeconds'] or 0
 if duration<=0:raise ValueError('Could not read the video duration.')
 identity=source_identity(path)
 key=hashlib.sha256(json.dumps([identity,count,'square-strip-v2'],sort_keys=True).encode()).hexdigest()
 cached=read(STORE/'preview-cache'/(key+'.json'))
 if cached and len(json.dumps(cached).encode())<=PREVIEW_BYTES:return cached
 # Midpoints avoid end-of-file seeks and leading black slates. Input-side -ss
 # seeks to the nearest preceding keyframe; each process decodes one frame.
 times=[duration*(i+.5)/count for i in range(count)]
 def frame(t):
  r=subprocess.run(['ffmpeg','-v','error','-threads','1','-ss',str(t),'-i',path,'-an','-vf','scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d'%(STRIP_WIDTH,STRIP_WIDTH,STRIP_WIDTH,STRIP_WIDTH),'-frames:v','1','-q:v','5','-f','image2pipe','-vcodec','mjpeg','-'],capture_output=True,timeout=12)
  if r.returncode or not r.stdout:raise RuntimeError('Could not decode a preview frame. Hover again to retry.')
  return r.stdout
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  frames=list(pool.map(frame,times))
 # Re-encode only these tiny sampled images if needed, never re-read the video.
 for width,quality in [(144,16),(120,24),(96,28),(72,31),(48,31)]:
  r=subprocess.run(['ffmpeg','-v','error','-f','image2pipe','-vcodec','mjpeg','-i','pipe:0','-vf','scale=%d:%d,tile=%dx1'%(width,width,count),'-frames:v','1','-q:v',str(quality),'-f','image2pipe','-vcodec','mjpeg','-'],input=b''.join(frames),capture_output=True,timeout=12)
  if r.returncode or not r.stdout:continue
  result={'strip':base64.b64encode(r.stdout).decode('ascii'),'count':count,'times':times}
  if len(json.dumps(result).encode())<=PREVIEW_BYTES:
   write(STORE/'preview-cache'/(key+'.json'),result);return result
 raise RuntimeError('Could not fit the preview within the response limit. Hover again to retry.')

HOLD_ROOT=STORE/'held'
INPUT_ROOT=STORE/'cutout-inputs'
SFX_ROOT=STORE/'sfx'

def sfx_manifest():
 """The postcard's sound effects, shipped beside this script: where each file
 is and how long it runs, so the Draft can lay it down without probing it."""
 out={}
 for key,v in read(SFX_ROOT/'manifest.json',{}).items():
  f=SFX_ROOT/v['file']
  if f.is_file():out[key]={'path':str(f),'duration':v['duration'],'soundSeconds':v.get('soundSeconds',v['duration']),**{k:v[k] for k in ('sixteenth','ticks') if k in v}}
 return out
HOLD_FPS=30

def silent_copy(path):
 """The same video with no sound, for footage laid as an overlay: the SDK can
 mute Main clips only once a Draft is saved and not overlays at all, and the
 postcard's only sound is its own effects. The picture is stream-copied, so it is identical and takes a moment."""
 streams=subprocess.run(['ffprobe','-v','error','-select_streams','a','-show_entries','stream=index','-of','csv=p=0',path],capture_output=True,text=True).stdout.strip()
 if not streams:return path
 stat=os.stat(path)
 key=hashlib.sha256(json.dumps([path,stat.st_size,int(stat.st_mtime),'silent-v1']).encode()).hexdigest()[:24]
 HOLD_ROOT.mkdir(parents=True,exist_ok=True)
 src=pathlib.Path(path);stem=re.sub(r'[^A-Za-z0-9_-]+','_',src.stem).strip('_') or 'Clip'
 dest=HOLD_ROOT/('%s - silent - %s%s'%(stem,key,src.suffix.lower()))
 if not dest.exists():
  tmp=HOLD_ROOT/('silent-'+str(uuid.uuid4())+src.suffix.lower())
  r=subprocess.run(['ffmpeg','-v','error','-y','-i',path,'-map','0:v:0','-c','copy','-an','-map_metadata','-1',str(tmp)],capture_output=True,timeout=120)
  if r.returncode or not tmp.exists():
   if tmp.exists():tmp.unlink()
   raise RuntimeError('Could not make a silent copy of this clip: '+r.stderr.decode('utf-8','replace')[:400])
  tmp.rename(dest)
 return str(dest)

def hold_clip(a):
 """Give the postcard's fixed subject slot a source long enough to fill it.

 The composition lays the subject down as one range of one clip and hangs its
 curtain and title off that same clock, so material shorter than the slot used
 to be refused outright. Padding the MATERIAL instead of rewriting the timeline
 keeps every one of those cues intact: what comes back is an ordinary clip that
 plays the chosen range and then holds its own last frame, and the cutout, the
 overlays and the assembly never learn the difference. A photograph becomes the
 same kind of clip - a video of one held frame - which is what lets a still be
 the subject at all, without a second matting path for images."""
 path=str(pathlib.Path(a['path']).resolve(strict=True))
 target=float(a.get('target',8.5));start=max(0.0,float(a.get('start',0) or 0))
 info=probe(path);duration=info['durationSeconds'] or 0
 plays=max(0.0,min(target,duration-start)) if moving(path) else 0.0
 if moving(path) and plays>=target-.02:
  if a.get('silent'):
   quiet=silent_copy(path)
   if quiet!=path:return {'path':quiet,'name':pathlib.Path(quiet).name,'held':False,'silenced':True,'playedSeconds':round(plays,3),'durationSeconds':duration,'width':info['width'],'height':info['height'],'start':start}
  return {'path':path,'held':False,'playedSeconds':round(plays,3),'durationSeconds':duration,'width':info['width'],'height':info['height'],'start':start}
 stat=os.stat(path)
 key=hashlib.sha256(json.dumps([path,stat.st_size,int(stat.st_mtime),round(start,3),round(target,3),'hold-v1'],sort_keys=True).encode()).hexdigest()[:24]
 HOLD_ROOT.mkdir(parents=True,exist_ok=True)
 stem=re.sub(r'[^A-Za-z0-9_-]+','_',pathlib.Path(path).stem).strip('_') or 'Subject'
 dest=HOLD_ROOT/('%s - held %.2fs - %s.mp4'%(stem,target,key))
 if not dest.exists():
  # Even dimensions: the foreground encoder refuses odd ones, and a photograph
  # is under no obligation to have arrived with even ones.
  even='scale=trunc(iw/2)*2:trunc(ih/2)*2'
  # ultrafast: quicker and closer to the source than veryfast here (0.37s vs
  # 0.62s, 53.9 vs 49.3dB PSNR); only the file is bigger, and it stays local.
  if moving(path):
   if plays<=0:raise ValueError('The chosen start is past the end of this video.')
   chain='tpad=stop_mode=clone:stop_duration=%.3f,fps=%d,%s'%(max(0.0,target-plays),HOLD_FPS,even)
   cmd=['ffmpeg','-v','error','-y','-ss',str(start),'-t',str(plays),'-i',path,'-an','-vf',chain,'-c:v','libx264','-preset','ultrafast','-crf','18','-pix_fmt','yuv420p']
  else:
   chain='fps=%d,%s'%(HOLD_FPS,even)
   cmd=['ffmpeg','-v','error','-y','-loop','1','-i',path,'-t',str(target),'-an','-vf',chain,'-c:v','libx264','-preset','ultrafast','-crf','18','-pix_fmt','yuv420p']
  tmp=HOLD_ROOT/('hold-'+str(uuid.uuid4())+'.mp4')
  r=subprocess.run(cmd+[str(tmp)],capture_output=True,timeout=180)
  if r.returncode or not tmp.exists():
   if tmp.exists():tmp.unlink()
   raise RuntimeError('Could not extend this clip to fill the postcard: '+r.stderr.decode('utf-8','replace')[:400])
  tmp.rename(dest)
 out=probe(str(dest))
 return {'path':str(dest),'name':dest.name,'held':True,'playedSeconds':round(plays,3),'durationSeconds':out['durationSeconds'],'width':out['width'],'height':out['height'],'start':0.0}

def cutout_input(a):
 """Cut exactly the stretch the cutout is made from, ready to upload as is.
 Handing the app a whole clip plus a range makes it re-encode that range on one
 thread before uploading (8s for 6.5s of 1080x1920); this does the same cut in
 well under a second, so the app only has to upload it."""
 path=str(pathlib.Path(a['path']).resolve(strict=True))
 start=max(0.0,float(a.get('start',0) or 0));seconds=float(a['seconds'])
 if a.get('projectId') and find_reusable(a['projectId'],source_identity(path),start):return {'reusable':True}
 stat=os.stat(path)
 key=hashlib.sha256(json.dumps([path,stat.st_size,int(stat.st_mtime),round(start,3),round(seconds,3),'cutout-input-v2']).encode()).hexdigest()[:24]
 INPUT_ROOT.mkdir(parents=True,exist_ok=True)
 stem=re.sub(r'[^A-Za-z0-9_-]+','_',re.sub(r' - held .*$','',pathlib.Path(path).stem)).strip('_') or 'Subject'
 dest=INPUT_ROOT/('%s - cutout input %.2f-%.2fs - %s.mp4'%(stem,start,start+seconds,key))
 if not dest.exists():
  # No more than 30fps: drafts play at 30 or less, and a 60fps cutout only
  # doubles every later step (masks, foreground encode, download).
  rate=subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=avg_frame_rate','-of','csv=p=0',path],capture_output=True,text=True).stdout.strip()
  num,_,den=rate.partition('/');fast=float(num or 0)/float(den or 1)>30.5
  tmp=INPUT_ROOT/('input-'+str(uuid.uuid4())+'.mp4')
  r=subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',path,'-t',str(seconds),'-map','0:v:0','-an','-map_metadata','-1',
   '-vf',('fps=30,' if fast else '')+'scale=trunc(iw/2)*2:trunc(ih/2)*2','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(tmp)],capture_output=True,timeout=180)
  if r.returncode or not tmp.exists():
   if tmp.exists():tmp.unlink()
   raise RuntimeError('Could not prepare the subject for background removal: '+r.stderr.decode('utf-8','replace')[:400])
  tmp.rename(dest)
 return {'path':str(dest),'name':dest.name}

def fg_seconds(d):
 """How long the cutout stays on screen; the panel sends it with the cutout."""
 return float(d.get('foregroundSeconds') or 6.45)

def foreground_dest(d):
 stem=re.sub(r'[^A-Za-z0-9_-]+','_',pathlib.Path(d['source']['name']).stem).strip('_') or 'Subject'
 start=float(d['settings']['subjectStartSec'])
 return runpath(d['runId'])/f'Cutout Foreground - {stem} - {start:.3f}-{start+fg_seconds(d):.3f}s - Alpha.webm'

def encode_foreground(d,alpha_input,alpha_chain,fps):
 """Original colour under the cutout's alpha, as VP9 with alpha. Colour is
 zeroed wherever the alpha is fully clear; maskedmerge against black does that
 bit-for-bit like the per-pixel geq it replaced, in a fifth of the time, and
 realtime VP9 (speed 8, row threading) kept the same PSNR (48.7dB colour,
 61dB alpha against lossless; speed 6 was 0.05dB better and 0.3s slower) at
 about 2s instead of 12.5s. Returns the file
 uncommitted, so the caller keeps it only once the cutout checks out."""
 size=d['source']['frameSize'];w=int(size['width']);h=int(size['height'])
 if w%2 or h%2:raise RuntimeError('Foreground encoding requires even source dimensions')
 if foreground_dest(d).exists():raise RuntimeError('Uncommitted foreground file preserved; inspect before retrying')
 tmp=runpath(d['runId'])/('foreground-'+str(uuid.uuid4())+'.webm')
 fc=(f"[0:v]fps={fps},format=gbrp[rgb];{alpha_chain},scale={w}:{h},format=gray,split[a][m0];[m0]lut=y='if(gt(val,0),255,0)',format=gbrp[m];"
     f"color=black:s={w}x{h}:r={fps},format=gbrp[k];[k][rgb][m]maskedmerge[z];[z][a]alphamerge,format=yuva420p[out]")
 execute(['ffmpeg','-v','error','-ss',str(float(d['settings']['subjectStartSec'])),'-i',d['source']['path'],*alpha_input,'-filter_complex',fc,'-map','[out]','-t',str(fg_seconds(d)),'-an','-c:v','libvpx-vp9','-crf','18','-b:v','0','-deadline','realtime','-cpu-used','8','-row-mt','1','-auto-alt-ref','0',str(tmp)],d,'foreground-encode')
 # The alpha has to have been written: the stream says so, and its first frame decodes.
 tags=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream_tags','-of','json',str(tmp)]))['streams'][0].get('tags',{})
 if str(tags.get('alpha_mode',tags.get('ALPHA_MODE','0')))!='1':raise RuntimeError('The foreground was written without alpha.')
 execute(['ffmpeg','-v','error','-c:v','libvpx-vp9','-i',str(tmp),'-frames:v','1','-vf','alphaextract','-f','null','-'],d,'foreground-alpha-verify')
 return tmp

def commit_foreground(d,tmp):
 dest=foreground_dest(d);tmp.rename(dest);d['foregroundPath']=str(dest);d['foregroundVersion']=2
 return dest

def check_and_extract(d,src,cut,decoder,offsets,dur,masks,size,fps):
 """One decode of each file does the whole cutout check and writes the masks.
 Alignment is checked as a peak: the claimed window (offsets[0]) has to match
 better than the windows 0.1s and 0.5s either side (only a perfect still
 ties), and clear 0.9 so the wrong clip altogether cannot tie its way in. No
 fixed bar can do this across clips: an aligned HDR clip (colour shifted by
 Bria) scored 0.973 while a 0.1s slip on an SDR clip scored 0.983. Luma only,
 at quarter size - only the cutout's alpha is ever used, and alignment shows
 at any size."""
 w=max(2,size[0]//8*2);h=max(2,size[1]//8*2);n=len(offsets);s0=min(offsets);span=max(offsets)-s0+dur
 stats=pathlib.Path(masks).parent/('stats-'+str(uuid.uuid4()));stats.mkdir()
 g=['[1:v]format=rgba,split=2[ca][cb]','[ca]alphaextract,split=2[png][af]',f'[af]scale={w}:{h}:flags=area,split={n}'+''.join(f'[a{i}]' for i in range(n)),
    f'[cb]premultiply=inplace=1,format=gray,scale={w}:{h}:flags=area,split={n}'+''.join(f'[c{i}]' for i in range(n)),
    f'[0:v]fps={fps},scale={w}:{h}:flags=area,format=rgb24,split={n}'+''.join(f'[s{i}]' for i in range(n))]
 for i,o in enumerate(offsets):
  g.append(f'[s{i}]trim=start={o-s0:.4f}:duration={dur},setpts=PTS-STARTPTS[t{i}];[t{i}][a{i}]alphamerge,premultiply=inplace=1,format=gray[p{i}];[p{i}][c{i}]ssim=stats_file={stats}/k{i}.log,nullsink')
 try:
  execute(['ffmpeg','-v','error','-y','-ss',str(s0),'-t',str(span),'-i',src,'-t',str(dur),*decoder,'-i',cut,'-filter_complex',';'.join(g),'-map','[png]','-vsync','0',str(pathlib.Path(masks)/'mask_%06d.png')],d,'cutout-check')
  scores=[]
  for i in range(n):
   v=[float(x) for x in re.findall(r'All:([0-9.]+)',(stats/f'k{i}.log').read_text())]
   scores.append(sum(v)/len(v) if v else 0.0)
  return scores
 finally:shutil.rmtree(stats,ignore_errors=True)

def fetch_result(a):
 """Download a finished generation's clip when the app delivered nothing.
 For Bria background removal the app's generation service reports the job as
 succeeded and delivered with no outputs - its backend lists none for this
 model - although the raw provider result, kept in the app's own job journal,
 carries the clip's URL. Read it from there instead of asking the AI to."""
 job=a['jobId'].removeprefix('selects-');dest=pathlib.Path(a['dest'])  # the journal keys jobs by the bare operation id
 if dest.is_file() and dest.stat().st_size>0:return {'path':str(dest),'cached':True}
 support=pathlib.Path.home()/'Library'/'Application Support'
 url=None
 for journal in [*support.glob('Cutback*/generation/*.json'),*support.glob('Cutback*/*/generation/*.json')]:
  try:
   text=journal.read_text()
   if job not in text:continue
   jobs=json.loads(text).get('jobs') or {}
   entries=jobs.values() if isinstance(jobs,dict) else jobs
   for entry in entries:
    if entry.get('operationId')!=job:continue
    found=re.findall(r'"url"\s*:\s*"(https?://[^"]+)"',json.dumps(((entry.get('snapshot') or entry).get('provider_data') or {}).get('result') or {}))
    if found:url=found[0];break
  except (OSError,ValueError):continue
  if url:break
 if not url:raise RuntimeError('The finished clip is not in the app journal yet.')
 tmp=dest.with_suffix('.part');dest.parent.mkdir(parents=True,exist_ok=True)
 with urllib.request.urlopen(url,timeout=120) as r,open(tmp,'wb') as f:
  while True:
   chunk=r.read(1<<20)
   if not chunk:break
   f.write(chunk)
 if tmp.stat().st_size==0:tmp.unlink();raise RuntimeError('The finished clip downloaded empty.')
 tmp.rename(dest)
 return {'path':str(dest),'cached':False}

# --- Framing ------------------------------------------------------------------
# The Draft conforms every picture to fit the frame; the assembly then scales and
# shifts it to fill instead. That needs each picture's size as it is shown, which
# for a phone photo means after its EXIF turn and for a phone video after its
# rotation, and the subject's place in its own frame, read off the cutout masks.

def exif_turned(path):
 """Whether a JPEG's EXIF orientation shows it turned a quarter (tags 5-8)."""
 try:
  with open(path,'rb') as f:
   if f.read(2)!=b'\xff\xd8':return False
   while True:
    marker=f.read(2)
    if len(marker)<2 or marker[0]!=0xFF or marker[1] in (0xD9,0xDA):return False
    size=int.from_bytes(f.read(2),'big');body=f.read(size-2)
    if marker[1]==0xE1 and body[:6]==b'Exif\0\0':
     t=body[6:];order='little' if t[:2]==b'II' else 'big';ifd=int.from_bytes(t[4:8],order)
     for i in range(int.from_bytes(t[ifd:ifd+2],order)):
      e=t[ifd+2+12*i:ifd+14+12*i]
      if int.from_bytes(e[:2],order)==0x0112:return int.from_bytes(e[8:10],order) in (5,6,7,8)
     return False
 except (OSError,ValueError,IndexError):return False

def shown_size(path):
 r=subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height:stream_side_data=rotation','-of','json',path],capture_output=True,text=True,timeout=20)
 st=(json.loads(r.stdout or '{}').get('streams') or [{}])[0];w,h=st.get('width'),st.get('height')
 if not(w and h):return None
 turn=any(abs(int(sd.get('rotation',0)))%180==90 for sd in st.get('side_data_list',[]))
 if not moving(path):turn=exif_turned(path)
 return {'width':h,'height':w} if turn else {'width':w,'height':h}

def sizes(a):
 paths=list(dict.fromkeys(a.get('paths',[])))
 with concurrent.futures.ThreadPoolExecutor(8) as pool:return dict(zip(paths,pool.map(shown_size,paths)))

def subject_box(a):
 """Where the subject sits in its frame, 0-1 from the top left, across the whole
 cutout: the 2nd-98th percentile of mask coverage on each axis, so a stray hair
 or a flicker at the edge does not pull the framing."""
 lock=runpath(a['runId'])/'run.lock'
 with lock.open('a') as f:
  fcntl.flock(f,fcntl.LOCK_EX);d=load(a['runId']);m=d.get('mask',{})
  if 'box' in m:return m['box']
  W=160;cols=[0]*W;rows=None;total=0
  raw=subprocess.run(['ffmpeg','-v','error','-i',str(pathlib.Path(m['path'])/'mask_%06d.png'),'-vf','scale=%d:-2,format=gray'%W,'-f','rawvideo','-'],capture_output=True,timeout=60).stdout
  first=pathlib.Path(m['path'])/'mask_000001.png'
  pw,ph=(lambda s:(s['width'],s['height']))(shown_size(str(first)) or {'width':16,'height':9})
  H=max(2,round(W*ph/pw/2)*2);rows=[0]*H
  for k in range(len(raw)//(W*H)):
   frame=raw[k*W*H:(k+1)*W*H]
   for y in range(H):
    line=frame[y*W:(y+1)*W];n=0
    for x,v in enumerate(line):
     if v>127:cols[x]+=1;n+=1
    rows[y]+=n;total+=n
  def span(c):
   lo=hi=None;acc=0
   for i,v in enumerate(c):
    acc+=v
    if lo is None and acc>=total*.02:lo=i
    if hi is None and acc>=total*.98:hi=i+1
   return lo/len(c),hi/len(c)
  box=None
  if total:(x0,x1),(y0,y1)=span(cols),span(rows);box={'x0':round(x0,4),'x1':round(x1,4),'y0':round(y0,4),'y1':round(y1,4)}
  d['mask']={**m,'box':box};save(d);return box

LIGHT={'load','init','update','event','claim','reuse','hold','silent','cutout-input','tile','folder-media','settings-load','settings-save','job-record','foreground'}

def main(op,a):
 if op not in LIGHT:heavy()
 if op=='folder-media':return folder_media(a)
 if op=='sizes':return sizes(a)
 if op=='subject-box':return subject_box(a)
 if op=='tile':return tile_preview(a)
 if op=='hold':return hold_clip(a)
 if op=='silent':
  quiet=silent_copy(str(pathlib.Path(a['path']).resolve(strict=True)));return {'path':quiet,'name':pathlib.Path(quiet).name}
 if op=='fetch-result':return fetch_result(a)
 if op=='cutout-input':return cutout_input(a)
 if op=='strip':return strip_preview(a)
 if op=='ensure':return ensure()
 if op=='reuse':
  with (STORE/'runs.lock').open('a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX);d=load(a['runId'])
   return reuse_cutout(d) if d['phase']=='ready' else d
 if op=='foreground':
  d=load(a['runId'])
  with (runpath(d['runId'])/'foreground.lock').open('a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX)
   if d.get('foregroundPath') and d.get('foregroundVersion')==2:
    if not pathlib.Path(d['foregroundPath']).is_file():raise RuntimeError('Saved foreground file missing; inspect before retrying')
    return d
   # Normally made alongside the masks in 'prepare'; this rebuilds it from them.
   mask=d.get('mask')
   if not mask or not pathlib.Path(mask['path']).is_dir():raise RuntimeError('Validated alpha masks required')
   started=time.time()
   tmp=encode_foreground(d,['-framerate',str(mask['fps']),'-i',str(pathlib.Path(mask['path'])/'mask_%06d.png')],'[1:v]format=gray',mask['fps'])
   dest=commit_foreground(d,tmp);save(d);event(d,'foreground','end',{'durationMs':round((time.time()-started)*1000),'path':str(dest)})
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
   rid=str(uuid.uuid4());d={**a,'runId':rid,'startedMs':round(time.time()*1000),'phase':'ready','logDir':str(pathlib.Path(a.get('logRoot') or DEFAULT_LOG)/rid),'draftName':'Postcard Cutout Studio — '+rid,'sfx':sfx_manifest()};runpath(rid).mkdir(parents=True,exist_ok=False);save(d);active[a['projectId']]=rid;write(STORE/'active-runs.json',active);event(d,'run','start',{'settings':a.get('settings')});return reuse_cutout(d)
 if op in ['update','event']:
  d=load(a['runId'])
  if op=='update':d.update(a.get('patch',{}));save(d)
  if a.get('stage'):event(d,a['stage'],a.get('status','info'),a.get('details'))
  return d
 if op=='prepare':
  d=load(a['runId']);cfg=ensure();dest=runpath(d['runId'])/'masks'
  # The finished generation is recorded here rather than by a separate call.
  if a.get('patch'):
   d.update(a['patch']);save(d)
   if a.get('details') is not None:event(d,'generation','end',a['details'])
  if d.get('sourceIdentity') and d['sourceIdentity']!=source_identity(a['sourcePath']):raise RuntimeError('The source file changed during creation. The existing job is preserved; no new generation was submitted.')
  if d.get('mask') and dest.is_dir():return d
  if dest.exists():raise RuntimeError('Existing mask folder preserved; inspect interrupted run rather than overwrite it.')
  src=a['sourcePath'];cut=a['cutoutPath'];start=float(a['startSeconds'])
  if a.get('seconds'):d['foregroundSeconds']=float(a['seconds'])
  dur=fg_seconds(d)
  event(d,'mask-prepare','start');t=time.time()
  probe,_=execute(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,pix_fmt,width,height,avg_frame_rate:stream_tags','-of','json',cut],d,'cutout-probe');p=json.loads(probe)['streams'][0]
  pf=p.get('pix_fmt','');alphaTag=str(p.get('tags',{}).get('alpha_mode',p.get('tags',{}).get('ALPHA_MODE','0')))
  decoder=['-c:v','libvpx-vp9'] if p.get('codec_name')=='vp9' and alphaTag=='1' else []
  if not decoder and not any(x in pf for x in ['yuva','rgba','argb','bgra','gbrap']):raise RuntimeError('Generated output has no decoded alpha: '+pf+'. Preserve the same job; do not regenerate.')
  # The check-and-masks pass and the foreground encode each read the files once,
  # side by side; the foreground is kept only if the cutout checks out.
  num,den=map(float,p['avg_frame_rate'].split('/'));fps=num/den
  tmp=runpath(d['runId'])/('mask-preparing-'+str(uuid.uuid4()));tmp.mkdir()
  offsets=[start]+[s for s in (start-.5,start-.1,start+.1,start+.5) if s>=0]
  with concurrent.futures.ThreadPoolExecutor(2) as pool:
   def check():
    scores=check_and_extract(d,src,cut,decoder,offsets,dur,tmp,(int(p['width']),int(p['height'])),fps)
    frames=sorted(tmp.glob('mask_*.png'));coverage=[]
    for img in [frames[0],frames[len(frames)//2],frames[-1]] if frames else []:
     pix=subprocess.check_output(['ffmpeg','-v','error','-i',str(img),'-vf','scale=64:64','-pix_fmt','gray','-f','rawvideo','-'])
     coverage.append(sum(pix)/(255*len(pix)))
    return scores,frames,coverage
   checked=pool.submit(check)
   encoded=pool.submit(encode_foreground,d,['-t',str(dur),*decoder,'-i',cut],'[1:v]alphaextract',fps) if not d.get('foregroundPath') else None
   try:scores,frames,coverage=checked.result()
   finally:
    try:fg=encoded.result() if encoded else None
    except Exception as e:fg=None;event(d,'foreground','deferred',{'error':str(e)[-400:]})
  ssim,neighbours=scores[0],scores[1:]
  if ssim<.9 or any(n>ssim+.0005 for n in neighbours):
   shutil.rmtree(tmp,ignore_errors=True)
   if fg:fg.unlink(missing_ok=True)
   raise RuntimeError('Cutout does not line up with the source (SSIM %.4f here; %s nearby). No Draft was created.'%(ssim,', '.join('%.4f'%n for n in neighbours)))
  if len(frames)<int(dur*fps)-1:raise RuntimeError('Mask does not cover the foreground duration')
  if all(x<.0001 or x>.9999 for x in coverage):raise RuntimeError('Mask is blank or entirely opaque; preserved output for inspection, no regeneration.')
  event(d,'mask-coverage','end',{'samples':coverage})
  tmp.rename(dest)
  first=f"http://127.0.0.1:{cfg['port']}/assets/{d['runId']}/mask_000001.png"
  with urllib.request.urlopen(first,timeout=5) as r:
   if r.status!=200 or r.read(8)!=b'\x89PNG\r\n\x1a\n':raise RuntimeError('Mask HTTP validation failed')
  d['mask']={'baseUrl':first.rsplit('/',1)[0],'fps':fps,'count':len(frames),'path':str(dest),'sourcePath':src,'sourceStartSeconds':start,'cutoutPath':cut,'provenanceSsim':ssim,'provenanceNeighbourSsim':neighbours,'provenanceOk':True};d['phase']='maskReady'
  if fg:commit_foreground(d,fg)
  save(d);event(d,'mask-prepare','end',{'durationMs':round((time.time()-t)*1000),'mask':d['mask']});return d
 raise ValueError('Unknown operation')

if __name__=='__main__':
 if len(sys.argv)>1 and sys.argv[1]=='serve':heavy();serve(int(sys.argv[2]))
 else:
  try:print(json.dumps(main(sys.argv[1],json.loads(sys.argv[2]) if len(sys.argv)>2 else {}),ensure_ascii=False))
  except Exception as e:
   print(json.dumps({'error':str(e)}),file=sys.stderr);sys.exit(1)
