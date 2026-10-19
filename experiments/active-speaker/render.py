import json,cv2,numpy as np,subprocess,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('folder');a=p.parse_args();root=Path(a.folder);r=json.loads((root/'results.json').read_text());model='pretrain_AVA_CVPR'
for c in r['cases']:
 folder=root/c['id'];caps={vi:cv2.VideoCapture(str(folder/f'camera-{vi}.mp4')) for vi in [1,2]};out=folder/'annotated-silent.mp4';writer=cv2.VideoWriter(str(out),cv2.VideoWriter_fourcc(*'mp4v'),25,(1920,640))
 for fi in range(min(t['frames'] for t in c['tracks'])):
  ims=[]
  for vi,cap in caps.items():
   ok,im=cap.read()
   if not ok:raise RuntimeError('incomplete decode')
   for t in c['tracks']:
    if t['camera']!=vi:continue
    x,y,w,h=map(int,t['boxes'][fi]);s=t['scores'][model]['values'];score=float(np.mean(s[max(0,fi-2):min(len(s),fi+3)]));color=(40,230,90) if score>0 else (80,80,235)
    cv2.rectangle(im,(x,y),(x+w,y+h),color,2);label=('Blue' if vi==2 else 'Pink' if x<480 else 'Glasses')+f' {score:+.2f}'
    cv2.putText(im,label,(max(0,x-20),max(25,y-10)),cv2.FONT_HERSHEY_SIMPLEX,.7,color,2)
   ims.append(im)
  canvas=np.zeros((640,1920,3),np.uint8);canvas[100:]=np.concatenate(ims,axis=1)
  cv2.putText(canvas,f"{c['id']} | source window +{fi/25:.2f}s | Light-ASD AVA raw score, NOT probability",(25,38),cv2.FONT_HERSHEY_SIMPLEX,.8,(255,255,255),2)
  cv2.putText(canvas,'Green: score > 0. Red: score <= 0. Not an editorial decision or verified speaker label.',(25,78),cv2.FONT_HERSHEY_SIMPLEX,.7,(200,200,200),1)
  writer.write(canvas)
 writer.release()
 for cap in caps.values():cap.release()
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(out),'-i',str(folder/'audio.wav'),'-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',str(folder/'comparison.mp4')],check=True)
 out.unlink()
(root/'concat.txt').write_text('\n'.join("file '"+str(root/c['id']/'comparison.mp4')+"'" for c in r['cases']))
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(root/'concat.txt'),'-c','copy','-movflags','+faststart',str(root/'comparison.mp4')],check=True)
print(root/'comparison.mp4')
