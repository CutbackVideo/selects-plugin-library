"""Offline Light-ASD evaluation. Never mutates Selects projects or Drafts.
Requires upstream Light-ASD checkout, YuNet ONNX, and a separate Python env.
Scores are model logits, NOT calibrated probabilities. Tracks are window-local.
"""
import argparse,json,time,sys,subprocess,hashlib
from pathlib import Path
import cv2,numpy as np,torch
from scipy.io import wavfile
from scipy.signal import medfilt
from scipy.optimize import linear_sum_assignment
import python_speech_features

p=argparse.ArgumentParser();p.add_argument('--upstream',required=True);p.add_argument('--cases',required=True);p.add_argument('--output',required=True);p.add_argument('--controls',action='store_true');a=p.parse_args()
root=Path(a.output);root.mkdir(parents=True,exist_ok=True);sys.path.insert(0,a.upstream)
from model.Model import ASD_Model
from loss import lossAV

torch.set_num_threads(4)
models=[]
for name in ['pretrain_AVA_CVPR','finetuning_TalkSet']:
 path=Path(a.upstream)/'weight'/f'{name}.model';state=torch.load(path,map_location='cpu',weights_only=True)
 model=ASD_Model().eval();head=lossAV().eval()
 model.load_state_dict({k.removeprefix('model.'):v for k,v in state.items() if k.startswith('model.')},strict=True)
 head.load_state_dict({k.removeprefix('lossAV.'):v for k,v in state.items() if k.startswith('lossAV.')},strict=True)
 models.append((name,model,head,hashlib.sha256(path.read_bytes()).hexdigest()))

def run(cmd):subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def iou(a,b):
 x=max(a[0],b[0]);y=max(a[1],b[1]);w=max(0,min(a[0]+a[2],b[0]+b[2])-x);h=max(0,min(a[1]+a[3],b[1]+b[3])-y)
 return w*h/max(1,a[2]*a[3]+b[2]*b[3]-w*h)

def detect_tracks(frames):
 detector=cv2.FaceDetectorYN.create(str(Path(a.upstream)/'yunet.onnx'),'',(960,540),0.7,0.3,5000)
 tracks=[]
 for fi,frame in enumerate(frames):
  detector.setInputSize((frame.shape[1],frame.shape[0]));_,faces=detector.detect(frame);faces=[] if faces is None else faces
  live=[t for t in tracks if fi-t['frames'][-1]<=5];used=set()
  if live and len(faces):
   cost=np.array([[1-iou(t['boxes'][-1],f[:4]) for f in faces] for t in live]);rows,cols=linear_sum_assignment(cost)
   for ti,di in zip(rows,cols):
    if cost[ti,di]<0.8:
     live[ti]['frames'].append(fi);live[ti]['boxes'].append(faces[di,:4].tolist());used.add(di)
  for di,f in enumerate(faces):
   if di not in used:tracks.append({'frames':[fi],'boxes':[f[:4].tolist()]})
 return [t for t in tracks if len(t['frames'])>=len(frames)*0.7 and max(np.diff(t['frames']),default=0)<=5]

def crops(frames,t):
 idx=np.arange(len(frames));bb=np.array(t['boxes']);interp=np.stack([np.interp(idx,t['frames'],bb[:,j]) for j in range(4)],axis=1)
 cx=medfilt(interp[:,0]+interp[:,2]/2,13);cy=medfilt(interp[:,1]+interp[:,3]/2,13);size=medfilt(np.maximum(interp[:,2],interp[:,3])/2,13)
 out=[]
 for frame,x,y,s in zip(frames,cx,cy,size):
  pad=int(s*1.8);im=np.pad(frame,((pad,pad),(pad,pad),(0,0)),constant_values=110);x+=pad;y+=pad
  face=im[int(y-s):int(y+s*1.8),int(x-s*1.4):int(x+s*1.4)]
  face=cv2.resize(face,(224,224));out.append(cv2.cvtColor(face,cv2.COLOR_BGR2GRAY)[56:168,56:168])
 return np.array(out),interp

cases=json.loads(Path(a.cases).read_text());report={'models':[{'name':n,'sha256':sha} for n,_,_,sha in models],'fps':25,'provider':'cpu','threads':4,'ensembleSeconds':[1,2,3], 'cases':[]}
for case in cases:
 started=time.perf_counter();folder=root/case['id'];folder.mkdir(exist_ok=True);row={**case,'tracks':[],'timings':{}}
 # Shared audio from the first camera, synchronized by the recorded source mapping.
 cam=case['cameras'][0];audio=folder/'audio.wav'
 run(['ffmpeg','-v','error','-y','-ss',str(cam['sourceStartSeconds']),'-i',cam['path'],'-t','3','-vn','-ac','1','-ar','16000',str(audio)])
 sr,wav=wavfile.read(audio);af=python_speech_features.mfcc(wav,sr,numcep=13,winlen=.025,winstep=.010)
 for cam in case['cameras']:
  t0=time.perf_counter();clip=folder/f"camera-{cam['videoIndex']}.mp4"
  run(['ffmpeg','-v','error','-y','-ss',str(cam['sourceStartSeconds']),'-i',cam['path'],'-t','3','-an','-vf','fps=25','-c:v','libx264','-preset','ultrafast','-crf','18',str(clip)])
  cap=cv2.VideoCapture(str(clip));frames=[]
  while True:
   ok,frame=cap.read()
   if not ok:break
   frames.append(frame)
  cap.release();row['timings'][f"decode{cam['videoIndex']}"]=time.perf_counter()-t0;t0=time.perf_counter()
  tracks=detect_tracks(frames);row['timings'][f"detect{cam['videoIndex']}"]=time.perf_counter()-t0
  for ti,t in enumerate(tracks):
   vf,boxes=crops(frames,t);n=min(len(vf),len(af)//4);vf=vf[:n];feat=af[:n*4]
   result={'camera':cam['videoIndex'],'track':ti,'detectedFrames':len(t['frames']),'frames':n,'boxes':boxes.tolist(),'scores':{}}
   cv2.imwrite(str(folder/f"face-{cam['videoIndex']}-{ti}.jpg"),vf[12])
   for name,model,head,sha in models:
    t0=time.perf_counter();scores=[]
    with torch.inference_mode():
     for duration in [1,2,3]:
      ss=[]
      for st in range(0,n,duration*25):
       en=min(n,st+duration*25)
       ae=model.forward_audio_frontend(torch.tensor(feat[st*4:en*4],dtype=torch.float32)[None]);ve=model.forward_visual_frontend(torch.tensor(vf[st:en],dtype=torch.float32)[None]);ss.extend(head(model.forward_audio_visual_backend(ae,ve)).tolist())
      scores.append(ss)
    avg=np.mean(scores,axis=0);result['scores'][name]={'values':avg.tolist(),'mean':float(avg.mean()),'anchorMean':float(avg[5:25].mean()),'seconds':time.perf_counter()-t0}
   if a.controls:
    result['controls']={}
    silent=python_speech_features.mfcc(np.zeros_like(wav),sr,numcep=13,winlen=.025,winstep=.010)[:n*4]
    for name,model,head,sha in models:
     result['controls'][name]={}
     for control,control_af in [('silent',silent),('shifted800ms',np.roll(feat,80,axis=0))]:
      all_scores=[]
      with torch.inference_mode():
       for duration in [1,2,3]:
        ss=[]
        for st in range(0,n,duration*25):
         en=min(n,st+duration*25)
         ae=model.forward_audio_frontend(torch.tensor(control_af[st*4:en*4],dtype=torch.float32)[None]);ve=model.forward_visual_frontend(torch.tensor(vf[st:en],dtype=torch.float32)[None]);ss.extend(head(model.forward_audio_visual_backend(ae,ve)).tolist())
        all_scores.append(ss)
      avg=np.mean(all_scores,axis=0);result['controls'][name][control]={'values':avg.tolist(),'anchorMean':float(avg[5:25].mean())}
   row['tracks'].append(result)
  # Save reference image with all automatically tracked boxes, no identity labels supplied to model.
  im=frames[12].copy()
  for tr in row['tracks']:
   if tr['camera']!=cam['videoIndex']:continue
   x,y,w,h=map(int,tr['boxes'][12]);cv2.rectangle(im,(x,y),(x+w,y+h),(0,255,255),2);cv2.putText(im,f"T{tr['track']}",(x,y-8),cv2.FONT_HERSHEY_SIMPLEX,.65,(0,255,255),2)
  cv2.imwrite(str(folder/f"reference-{cam['videoIndex']}.jpg"),im)
 row['elapsedSeconds']=time.perf_counter()-started;report['cases'].append(row)
 (root/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(case['id'],round(row['elapsedSeconds'],2),[(t['camera'],t['track'],{k:round(v['anchorMean'],2) for k,v in t['scores'].items()}) for t in row['tracks']],flush=True)
