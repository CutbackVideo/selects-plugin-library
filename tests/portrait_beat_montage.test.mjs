import { asyncSdk } from './windows_host.mjs';
// Parity of the panel's port of pipeline.py (the `// @operation-start` section of portrait-beat-montage/panel.tsx)
// with pipeline.py itself: the timeline and every ffmpeg argv. pipeline.py runs on a dev Mac's python3 with numpy
// and Pillow, its subprocess calls captured instead of run; without them the pipeline half is skipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {loadPanelOperation} from './panel_operation.mjs';

const op=loadPanelOperation('portrait-beat-montage');
const plugin=path.resolve(import.meta.dirname,'../plugins/portrait-beat-montage');
const SIZES=[[1080,1920],[1920,1080],[720,1280],[1080,1440],[1440,1080],[1080,1080],[3840,2160],[2160,3840],[1442,1920],[1000,1334],[641,853],[1366,768]];
const STARTS=[1.0,0.375,2.5416666666666665,0.0,12.041666666666666];

const PY=String.raw`
import json, sys, tempfile, types
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import pipeline as P
sizes, starts = json.loads(sys.argv[2]), [float(s) for s in json.loads(sys.argv[3])]  # plan.json keeps starts as floats
cap, replies = [], []
class Stop(Exception): pass
def fake_run(cmd, **kw):
    cap.append([str(x) for x in cmd])
    if not replies: raise Stop()
    return types.SimpleNamespace(stdout=replies.pop(0))
P.run = fake_run
out = {"crop": [P.crop_filter(w, h) for w, h in sizes], "segments": P.segments(), "BEATS": P.BEATS, "LENGTHS": P.LENGTHS,
       "BOUNDARIES": P.BOUNDARIES, "TOTAL": P.TOTAL, "STROBE_START": P.STROBE_START, "STROBE": P.STROBE, "GLOW": P.GLOW,
       "draft": [P.draft_frame(n) for n in range(0, P.TOTAL + 1)]}
replies[:] = [json.dumps({"streams": [{"width": 1080, "height": 1920}], "format": {"duration": "3.5"}}).encode()]
P.ffprobe("/clips/a b.mov"); out["probe"] = cap.pop()
replies[:] = [bytes(40 * 180 * 135)]
P.motion_scores("/clips/a b.mov", {"width": 1080, "height": 1920, "duration": 3.5}); out["motion"] = cap.pop()
replies[:] = [bytes(P.SRC_FRAMES * P.W * P.H * 3)]
P.decode(Path("/run/c01a/source.mp4"), P.SRC_FRAMES); out["decode"] = cap.pop()
tmp = Path(tempfile.mkdtemp()); clip = tmp / "clip.mov"; clip.write_bytes(b"x"); P.DATA = tmp / "data"
out["unit"] = []
for i, start in enumerate(starts):
    run_id = "r%d" % i; root = P.DATA / "runs" / run_id; root.mkdir(parents=True)
    (root / "plan.json").write_text(json.dumps({"runId": run_id, "units": {"c01a": {"clip": 1, "path": str(clip), "start": start, "width": 1920, "height": 1080, "duration": 9.0}}}))
    try: P.op_unit({"runId": run_id, "key": "c01a"})
    except Stop: pass
    out["unit"].append({"argv": cap.pop(), "folder": str(root / "c01a")})
P.rvm_launcher = lambda: Path("/rvm")
replies[:] = [json.dumps({"result": "/rvm/out/cut.webm"})]
(tmp / "m").mkdir()
try: P.mattes(Path("/run/c01a/source.mp4"), tmp / "m")
except Stop: pass
out["matte"] = {"argv": cap.pop(), "masks": str(tmp / "m" / "masks")}
class FakePopen:
    def __init__(self, args, **kw): cap.append([str(x) for x in args])
P.subprocess.Popen = FakePopen
P.Encoder(Path("/run/render/shot01.mp4"), "30000/1001"); out["encode"] = cap.pop()
P.Encoder(Path("/run/render/master-60fps.mp4"), P.FPS); out["master"] = cap.pop()
print(json.dumps(out))
`;

function pipelineRun(){
 const r=spawnSync('python3',['-c',PY,plugin,JSON.stringify(SIZES),JSON.stringify(STARTS)],{encoding:'utf8',env:{...process.env,POSTCARD_CUTOUT_RVM_FFMPEG:'ffmpeg',POSTCARD_CUTOUT_RVM_FFPROBE:'ffprobe'}});
 if(r.status!==0&&!/ModuleNotFoundError|ENOENT/.test(String(r.stderr||r.error)))throw Error('pipeline.py capture failed:\n'+r.stderr);
 if(r.status!==0)return {skip:'python3 with numpy and Pillow is needed for pipeline.py: '+(r.stderr||r.error||'').toString().trim().split('\n').pop()};
 return JSON.parse(r.stdout.trim().split('\n').pop());
}
const py=pipelineRun();
const skip=py.skip||false;
const ff=args=>['ffmpeg',...args];

test('the timeline is the one pipeline.py renders',{skip},()=>{
 for(const k of ['BEATS','LENGTHS','BOUNDARIES','TOTAL','STROBE_START','STROBE','GLOW'])assert.deepEqual(op[k],py[k],k);
 assert.deepEqual(op.segments(),py.segments);
 assert.deepEqual(Array.from({length:op.TOTAL+1},(_,n)=>op.draftFrame(n)),py.draft);
});

test('the 3:4 crop matches pipeline.py for portrait, landscape and odd sizes',{skip},()=>{
 assert.deepEqual(SIZES.map(([w,h])=>op.cropFilter(w,h)),py.crop);
});

test('every ffmpeg argv matches pipeline.py (a file stands in for its stdin/stdout)',{skip},()=>{
 assert.deepEqual(['ffprobe',...op.probeArgs('/clips/a b.mov')],py.probe);
 assert.deepEqual(ff(op.motionArgs('/clips/a b.mov',{width:1080,height:1920},'-')),py.motion);
 assert.deepEqual(ff(op.decodeArgs('/run/c01a/source.mp4',op.SRC_FRAMES,'-')),py.decode);
 STARTS.forEach((start,i)=>{
  const {argv,folder}=py.unit[i];
  assert.deepEqual(ff(op.unitSourceArgs({start,path:argv[argv.indexOf('-i')+1],width:1920,height:1080},path.join(folder,'source.mp4'))),argv,'start '+start);
 });
 assert.deepEqual(ff(op.matteArgs('/rvm/out/cut.webm',path.join(py.matte.masks,'%03d.png'))),py.matte.argv);
 assert.deepEqual(ff(op.encodeArgs('-','30000/1001','/run/render/shot01.mp4')),py.encode);
 assert.deepEqual(ff(op.encodeArgs('-',op.FPS,'/run/render/master-60fps.mp4')),py.master);
});

test('the port section stays free of shell and host calls',()=>{
 const src=fs.readFileSync(path.join(plugin,'panel.tsx'),'utf8');
 const body=src.slice(src.indexOf('// @operation-start'),src.indexOf('// @operation-end'));
 for(const bad of ['runShell','__DI__','python','$(','printf','sdk.'])assert.ok(!body.includes(bad),bad);
 assert.ok(op.unitSourceArgs({start:1,path:'C:\\Users\\\uD64D\uAE38\uB3D9\\a.mov',width:1080,height:1920},'C:\\o\\source.mp4').every(a=>typeof a==='string'));
 assert.equal(op.pyStr(3),'3.0');assert.equal(op.pyStr(0.375),'0.375');
});

test('both OSes use canonical host media processing after migration',()=>{
 const source=fs.readFileSync(path.join(plugin,'panel.tsx'),'utf8');
 assert.doesNotMatch(source,/runShell\(|async function macMontage/);
 assert.match(source,/const manifest = await pbmWindowsMontage/);
 assert.match(source,/pbmSharedMattes/);
});
