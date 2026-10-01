"""Private runtime health check. No installation on import or doctor."""
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import time
import fcntl
import math

ROOT = Path(__file__).resolve().parent
MODEL_SHA = '88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828'


def doctor():
    import numpy as np
    import onnxruntime as ort
    import PIL
    if platform.system() != 'Darwin' or platform.machine() != 'arm64':
        raise RuntimeError('Only macOS arm64 is currently supported')
    model = ROOT/'.local/models/rvm_mobilenetv3_fp32.onnx'
    if not model.is_file() or hashlib.sha256(model.read_bytes()).hexdigest() != MODEL_SHA:
        raise RuntimeError('Missing or corrupt model. Inspect the setup log; do not run inference.')
    config_path=ROOT/'.local/config.json'
    config=json.loads(config_path.read_text()) if config_path.is_file() else {}
    bins = {}
    for name in ['ffmpeg','ffprobe']:
        override = os.environ.get('POSTCARD_CUTOUT_RVM_'+name.upper())
        binary = override or config.get(name) or shutil.which(name)
        if not binary or not Path(binary).is_file():
            raise RuntimeError(f'Missing {name}. Set POSTCARD_CUTOUT_RVM_{name.upper()} to the Selects bundled executable.')
        bins[name] = str(Path(binary).resolve())
        subprocess.run([binary,'-version'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=10)
    codecs = subprocess.check_output([bins['ffmpeg'],'-hide_banner','-encoders'],stderr=subprocess.DEVNULL,text=True)
    if 'libvpx-vp9' not in codecs: raise RuntimeError('FFmpeg lacks VP9 alpha encoding')
    t=time.perf_counter()
    so=ort.SessionOptions(); so.intra_op_num_threads=2
    s=ort.InferenceSession(str(model),sess_options=so,providers=['CPUExecutionProvider'])
    feed={'src':np.zeros((1,3,64,64),np.float32),'downsample_ratio':np.array([1],np.float32)}
    feed.update({f'r{i}i':np.zeros((1,1,1,1),np.float32) for i in range(1,5)})
    results=s.run(None,feed)
    if results[1].shape != (1,1,64,64): raise RuntimeError('Unexpected RVM output')
    return dict(ready=True,python=platform.python_version(),numpy=np.__version__,onnxruntime=ort.__version__,pillow=PIL.__version__,modelSHA256=MODEL_SHA,availableProviders=ort.get_available_providers(),outputRoot=str(ROOT/'.local/media'),smokeSeconds=time.perf_counter()-t,**bins)


def cutout(args):
    """Idempotent local cutout, reused only for identical source/settings/model."""
    start=time.perf_counter(); env=doctor()
    source=Path(args['input']).resolve(strict=True)
    first=float(args.get('startSeconds',0)); duration=float(args.get('durationSeconds',6.45))
    ratio=float(args.get('ratio',1)); provider=args.get('provider','cpu')
    if not all(math.isfinite(x) for x in [first,duration,ratio]) or first<0 or not 0<duration<=30 or not 0<ratio<=1:
        raise ValueError('Invalid range/ratio; local jobs are limited to 30 seconds')
    if provider != 'cpu': raise ValueError('Only the CPU provider is enabled. CoreML failed visual parity testing on this model.')
    digest=hashlib.sha256()
    with source.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): digest.update(chunk)
    signature=dict(sourceSHA256=digest.hexdigest(),startSeconds=first,durationSeconds=duration,ratio=ratio,provider=provider,modelSHA256=MODEL_SHA,runnerVersion=2,ffmpeg=env['ffmpeg'])
    key=hashlib.sha256(json.dumps(signature,sort_keys=True).encode()).hexdigest()[:24]
    output_root=Path(args['outputRoot']).resolve()
    output_root.mkdir(parents=True,exist_ok=True)
    job=output_root/('rvm-'+key)
    with (output_root/(key+'.lock')).open('a') as lock:
        try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError: raise RuntimeError('This cutout is already running. Do not launch a duplicate.')
        summary=job/'summary.json'
        if summary.is_file():
            saved=json.loads(summary.read_text()); result=Path(saved['result'])
            if not result.is_file(): raise RuntimeError('Cached media is missing. Inspect this job before regeneration.')
            subprocess.run([env['ffmpeg'],'-v','error','-c:v','libvpx-vp9','-i',str(result),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=60)
            return dict(saved,cached=True,requestSeconds=time.perf_counter()-start)
        if job.exists(): raise RuntimeError('An incomplete job was preserved. Inspect its logs or choose another output folder; no automatic duplicate.')
        args2=[sys.executable,str(ROOT/'benchmark.py'),'--input',str(source),'--start',str(first),'--duration',str(duration),'--ratio',str(ratio),'--provider',provider,'--output',str(job)]
        childenv={**os.environ,'POSTCARD_CUTOUT_RVM_FFMPEG':env['ffmpeg'],'POSTCARD_CUTOUT_RVM_FFPROBE':env['ffprobe']}
        with (output_root/(key+'.launcher.log')).open('a') as log:
            subprocess.run(args2,env=childenv,stdout=log,stderr=log,check=True,timeout=240)
        if not summary.is_file(): raise RuntimeError('Runner did not produce a verified summary')
        saved=json.loads(summary.read_text())
        (job/'signature.json').write_text(json.dumps(signature,indent=2))
        return dict(saved,cached=False,requestSeconds=time.perf_counter()-start)


if __name__=='__main__':
    try:
        if sys.argv[1:] == ['doctor']: result=doctor()
        elif sys.argv[1:] == ['configure']:
            result=doctor()
            target=ROOT/'.local/config.json'
            temporary=target.with_suffix('.tmp')
            temporary.write_text(json.dumps({k:result[k] for k in ['ffmpeg','ffprobe']},indent=2))
            temporary.replace(target)
        elif len(sys.argv)==3 and sys.argv[1]=='cutout': result=cutout(json.loads(sys.argv[2]))
        else: raise ValueError('Usage: run.sh doctor | configure | cutout JSON')
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'ready':False,'error':str(e)})); sys.exit(1)
