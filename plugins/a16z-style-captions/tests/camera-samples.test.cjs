const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const {stripTypeScriptTypes}=require('node:module');
function source(file,names){
 const code=fs.readFileSync(path.join(__dirname,'../src/pipeline',file),'utf8').replace(/^export /gm,'');
 return vm.runInNewContext(stripTypeScriptTypes(code,{mode:'strip'})+'\n;({'+names.join(',')+'})');
}
const {cameraSampleArgs,cameraSampleTimes}=source('cameraSamples.ts',['cameraSampleArgs','cameraSampleTimes']);
const {histogramCuts}=source('shotHistogram.ts',['histogramCuts']);
test('camera sample arguments use source video zero and keep the original sampling/crop rule',()=>{
 const args=cameraSampleArgs({path:'C:\\video.mp4',start:1,end:4},'C:\\samples.rgb',64,64,5);
 assert.ok(!args.includes('-ss'));assert.ok(!args.includes('-t'));
 assert.match(args[args.indexOf('-vf')+1],/^setpts=PTS-STARTPTS,trim=start=1:end=4,framestep=5,showinfo/);
 assert.equal(args.at(-1),'C:\\samples.rgb');
});
test('camera cuts use integer source PTS even when VFR sample spacing differs from average FPS',async()=>{
 const times=cameraSampleTimes('showinfo config in time_base: 1/1000\n'+[1000,1200,1700].map((pts,n)=>`showinfo n: ${n} pts: ${pts} pts_time:rounded`).join('\n'),3,1,2);
 assert.deepEqual([...times],[1,1.2,1.7]);
 const red=Uint8Array.from([255,0,0]),blue=Uint8Array.from([0,0,255]);
 const cuts=await histogramCuts({read:async i=>[red,red,blue][i],count:3,times});
 assert.deepEqual([...cuts],[1.7]);
 assert.throws(()=>cameraSampleTimes('showinfo config in time_base: 1/1000\nshowinfo n: 0 pts: 0 pts_time:0',2,0,2),/timestamps/);
 assert.throws(()=>cameraSampleTimes('showinfo n: 0 pts: 0 pts_time:0',1,0,2),/time base/);
});
const ffmpeg=process.env.SELECTS_FFMPEG||'ffmpeg';
const haveFF=spawnSync(ffmpeg,['-version'],{stdio:'ignore'}).status===0;
test('real video with audio at zero and first video PTS at one second keeps its source cut at two seconds', {skip:!haveFF?'ffmpeg unavailable':false},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'a16z-camera-clock-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const run=args=>{const reply=spawnSync(ffmpeg,args,{encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(reply.status,0,reply.stderr);return reply;};
 for(const delay of [0,1]){
  const clip=path.join(dir,'source-'+delay+'.mp4'),raw=path.join(dir,'samples-'+delay+'.rgb');
  run(['-nostdin','-v','error','-y','-f','lavfi','-i','color=c=red:s=64x64:r=30:d=2','-f','lavfi','-i','color=c=blue:s=64x64:r=30:d=2','-f','lavfi','-i','anullsrc=r=48000:cl=stereo',
   '-filter_complex',`[0:v][1:v]concat=n=2:v=1:a=0,setpts=PTS+${delay}/TB[v]`,'-map','[v]','-map','2:a','-t',String(4+delay),'-c:v','mpeg4','-q:v','2','-c:a','aac',clip]);
  const decoded=run(cameraSampleArgs({path:clip,start:1,end:4},raw,64,64,5)),rgb=fs.readFileSync(raw),bytes=64*64*3,count=rgb.length/bytes;
  assert.equal(count,18);
  const times=cameraSampleTimes(decoded.stderr,count,1,4);
  assert.equal(times[0],1);
  const cuts=await histogramCuts({read:async i=>rgb.subarray(i*bytes,(i+1)*bytes),count,times});
  assert.deepEqual([...cuts],[2],`video PTS offset ${delay} must not move source cut`);
 }
});
