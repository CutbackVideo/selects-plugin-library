"""Developer-only export; deployed inference has no Python dependency."""
import argparse,sys,torch,json,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--upstream',required=True);p.add_argument('--output',required=True);a=p.parse_args();sys.path.insert(0,a.upstream)
from model.Model import ASD_Model
from loss import lossAV
class Export(torch.nn.Module):
 def __init__(self):
  super().__init__();self.model=ASD_Model();self.head=lossAV()
 def forward(self,audio,video):
  ae=self.model.forward_audio_frontend(audio);ve=self.model.forward_visual_frontend(video)
  return self.head.FC(self.model.forward_audio_visual_backend(ae,ve))[:,1]
x=Export().eval();w=Path(a.upstream)/'weight/pretrain_AVA_CVPR.model';s=torch.load(w,map_location='cpu',weights_only=True)
x.model.load_state_dict({k[6:]:v for k,v in s.items() if k.startswith('model.')});x.head.load_state_dict({k[7:]:v for k,v in s.items() if k.startswith('lossAV.')})
# Audio tensors are NCHW; the upstream 3D pool treats them as unbatched.
# Its extra unit-size spatial axis is equivalent to this explicit 2D pool.
x.model.audioEncoder.pool1=torch.nn.MaxPool2d((1,3),(1,2),(0,1))
x.model.audioEncoder.pool2=torch.nn.MaxPool2d((1,3),(1,2),(0,1))
p=Path(a.output);p.parent.mkdir(parents=True,exist_ok=True)
torch.onnx.export(x,(torch.zeros(1,300,13),torch.zeros(1,75,112,112)),str(p),input_names=['audio','video'],output_names=['scores'],dynamic_axes={'audio':{1:'audioFrames'},'video':{1:'videoFrames'},'scores':{0:'videoFrames'}},opset_version=17,dynamo=False)
import numpy as np,onnxruntime as ort
session=ort.InferenceSession(str(p),providers=['CPUExecutionProvider']);torch.set_num_threads(4)
errors=[]
for n in [8,25,50,74,75]:
 audio=torch.randn(1,n*4,13);video=torch.rand(1,n,112,112)*255
 with torch.no_grad():expected=x(audio,video).numpy()
 actual=session.run(None,{'audio':audio.numpy(),'video':video.numpy()})[0];err=float(np.max(np.abs(actual-expected)));assert err<1e-4,(n,err);errors.append({'frames':n,'maxAbsoluteError':err})
print(json.dumps({'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sourceWeightSha256':hashlib.sha256(w.read_bytes()).hexdigest(),'parity':errors},indent=2))
