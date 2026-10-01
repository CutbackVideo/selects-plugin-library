"""Local RVM benchmark. No project writes, paid API calls, or hidden installs."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import time

MODEL_SHA = '88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True)
    ap.add_argument('--reference')
    ap.add_argument('--start', type=float, default=0)
    ap.add_argument('--duration', type=float, default=8.5)
    ap.add_argument('--ratio', type=float, default=0.6)
    ap.add_argument('--threads', type=int, default=4)
    ap.add_argument('--provider', choices=['cpu', 'coreml'], default='cpu')
    ap.add_argument('--output', required=True)
    ap.add_argument('--model', default=str(Path(__file__).parent/'.local/models/rvm_mobilenetv3_fp32.onnx'))
    a = ap.parse_args()
    out = Path(a.output).resolve()
    out.mkdir(parents=True, exist_ok=False)
    start = time.perf_counter()
    log = (out/'events.jsonl').open('a')

    def event(stage, **extra):
        d = dict(stage=stage, epoch=time.time(), elapsedSeconds=time.perf_counter()-start, **extra)
        log.write(json.dumps(d)+'\n'); log.flush()
        print(json.dumps(d), flush=True)

    event('start', arguments=vars(a), system=platform.platform())
    import numpy as np
    import onnxruntime as ort
    from PIL import Image, ImageDraw
    assert 0 < a.ratio <= 1 and a.duration > 0 and a.start >= 0
    assert hashlib.sha256(Path(a.model).read_bytes()).hexdigest() == MODEL_SHA, 'Model checksum mismatch'
    probe = json.loads(subprocess.check_output([os.environ.get('POSTCARD_CUTOUT_RVM_FFPROBE','ffprobe'),'-v','error','-select_streams','v:0','-show_streams','-of','json',a.input]))['streams'][0]
    w,h = probe['width'],probe['height']; fps = probe['avg_frame_rate']
    assert probe['r_frame_rate'] == fps, 'Variable frame rate requires a separate validated path'
    assert all(float(x.get('rotation',0))%360==0 for x in probe.get('side_data_list',[])), 'Rotation metadata requires a separate validated path'
    assert w % 2 == 0 and h % 2 == 0
    ff = [os.environ.get('POSTCARD_CUTOUT_RVM_FFMPEG','ffmpeg'),'-v','error']
    opt = ort.SessionOptions(); opt.intra_op_num_threads=a.threads; opt.inter_op_num_threads=1
    providers = ['CPUExecutionProvider'] if a.provider=='cpu' else ['CoreMLExecutionProvider','CPUExecutionProvider']
    if a.provider=='coreml': assert 'CoreMLExecutionProvider' in ort.get_available_providers()
    t = time.perf_counter()
    sess = ort.InferenceSession(a.model, sess_options=opt, providers=providers)
    event('model-ready', seconds=time.perf_counter()-t, providers=sess.get_providers(), available=ort.get_available_providers())
    stem=re.sub(r'[^A-Za-z0-9_-]+','-',Path(a.input).stem).strip('-')[:48] or 'Source'
    result = out/f'Cutout Foreground - RVM - {stem} - {a.start:.3f}-{a.start+a.duration:.3f}s.webm'
    dlog=(out/'decode.stderr.log').open('w'); elog=(out/'encode.stderr.log').open('w')
    decoder = subprocess.Popen(ff+['-ss',str(a.start),'-i',a.input,'-t',str(a.duration),'-an','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE,stderr=dlog)
    encoder = subprocess.Popen(ff+['-n','-f','rawvideo','-pix_fmt','rgba','-s',f'{w}x{h}','-r',fps,'-i','pipe:0','-an','-c:v','libvpx-vp9','-crf','18','-b:v','0','-deadline','good','-cpu-used','4','-auto-alt-ref','0','-pix_fmt','yuva420p',str(result)],stdin=subprocess.PIPE,stderr=elog)
    ref = None
    if a.reference:
        ref = subprocess.Popen(ff+['-i',a.reference,'-vf','alphaextract','-f','rawvideo','-pix_fmt','gray','pipe:1'],stdout=subprocess.PIPE,stderr=(out/'reference.stderr.log').open('w'))
    rec=[np.zeros((1,1,1,1),np.float32) for _ in range(4)]
    infer=0.; encode=0.; read=0.; metrics=[]; snapshots=[]
    n=0; process_start=time.perf_counter()
    try:
        while True:
            t=time.perf_counter(); raw=decoder.stdout.read(w*h*3); read+=time.perf_counter()-t
            if not raw: break
            assert len(raw)==w*h*3, 'Partial decoded frame'
            rgb=np.frombuffer(raw,np.uint8).reshape(h,w,3)
            src=rgb.transpose(2,0,1)[None].astype(np.float32)/255
            feed=dict(src=src,downsample_ratio=np.asarray([a.ratio],np.float32),**{f'r{i+1}i':v for i,v in enumerate(rec)})
            t=time.perf_counter(); fgr,pha,*rec=sess.run(None,feed); infer+=time.perf_counter()-t
            alpha=np.rint(np.clip(pha[0,0],0,1)*255).astype(np.uint8)
            rgba=np.concatenate([np.where(alpha[:,:,None]>0,rgb,0),alpha[:,:,None]],axis=2)
            t=time.perf_counter(); encoder.stdin.write(rgba.tobytes()); encode+=time.perf_counter()-t
            row=dict(frame=n,alphaMean=float(alpha.mean()/255),area=int((alpha>127).sum()))
            reference=None
            if ref:
                rr=ref.stdout.read(w*h)
                if len(rr)==w*h:
                    reference=np.frombuffer(rr,np.uint8).reshape(h,w)
                    aa=alpha>127; bb=reference>127
                    row.update(referenceArea=int(bb.sum()),iou=float((aa&bb).sum()/max(1,(aa|bb).sum())),recall=float((aa&bb).sum()/max(1,bb.sum())))
            metrics.append(row)
            if n in [0,30,90,150,193,253]:
                Image.fromarray(alpha).save(out/f'alpha-{n:03d}.png')
                bg=np.full_like(rgb,(28,150,160))
                def composite(mask):
                    m=mask[:,:,None].astype(np.float32)/255
                    return Image.fromarray(np.rint(rgb*m+bg*(1-m)).astype(np.uint8))
                views=[('Source',Image.fromarray(rgb)),('Bria alpha on source',composite(reference))] if reference is not None else [('Source',Image.fromarray(rgb))]
                views.append(('RVM alpha on source',composite(alpha)))
                sheet=Image.new('RGB',(360*len(views),670),'#222222'); draw=ImageDraw.Draw(sheet)
                for i,(label,img) in enumerate(views):
                    draw.text((i*360+8,8),f'{label} / frame {n}',fill='white')
                    sheet.paste(img.resize((360,640)),(i*360,30))
                sheet.save(out/f'comparison-{n:03d}.jpg',quality=92)
                snapshots.append(n)
            n+=1
            if n%30==0: event('progress',frames=n,inferenceSeconds=infer)
        encoder.stdin.close()
        assert decoder.wait(timeout=30)==0, 'Decoder failed'
        assert encoder.wait(timeout=60)==0, 'Encoder failed'
        if ref:
            ref.stdout.close(); ref.wait(timeout=30)
        if not n or not any(m['area'] for m in metrics): raise RuntimeError('No foreground was detected; inspect the preserved job instead of importing it')
        if all(m['alphaMean']>.999 for m in metrics): raise RuntimeError('Matte is entirely opaque; inspect the preserved job instead of importing it')
        event('media-complete',frames=n,processingSeconds=time.perf_counter()-process_start,inferenceSeconds=infer,decodeWaitSeconds=read,encoderWriteWaitSeconds=encode)
        subprocess.run(ff+['-c:v','libvpx-vp9','-i',str(result),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=(out/'verify.stderr.log').open('w'))
        summary=dict(status='complete',frames=n,width=w,height=h,fps=fps,ratio=a.ratio,provider=a.provider,threads=a.threads,wallSeconds=time.perf_counter()-start,inferenceSeconds=infer,result=str(result),modelSHA256=MODEL_SHA,snapshots=snapshots,meanReferenceIoU=float(np.mean([r['iou'] for r in metrics if 'iou' in r])) if ref else None,meanReferenceRecall=float(np.mean([r['recall'] for r in metrics if 'recall' in r])) if ref else None)
        (out/'frames.json').write_text(json.dumps(metrics,indent=2))
        (out/'summary.json').write_text(json.dumps(summary,indent=2))
        event('verified',**summary)
    finally:
        for proc in [decoder,encoder,ref]:
            if proc and proc.poll() is None: proc.terminate()
        log.close()


if __name__=='__main__': main()
