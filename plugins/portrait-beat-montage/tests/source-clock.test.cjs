'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const {constantFrameRate}=require('../../selects-ai-runtime/lib/constant-frame-rate.cjs');
async function sourceArgs() {
  const {topLevel}=await import('../../../tests/windows_host.mjs');
  const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
  const context=vm.createContext({W:540,H:720,FPS:60,SRC_FRAMES:60});
  vm.runInContext(['cropFilter','pyStr','unitSourceArgs','sharedUnitSourceArgs']
    .map(name=>topLevel(source,name)).join('\n')+'\nthis.args=sharedUnitSourceArgs;',context);
  return context.args;
}
test('the lossless Windows source explicitly fills the 60 fps output grid',async()=>{
  const args=Array.from((await sourceArgs())({start:.13,path:'input.mp4',width:960,height:540},'out.avi'));
  assert.equal(args[args.indexOf('-r')+1],'60');
  assert.equal(args[args.indexOf('-fps_mode')+1],'cfr');
  assert.equal(args[args.indexOf('-c:v')+1],'ffv1');
  assert.equal(args[args.indexOf('-frames:v')+1],'60');
});
test('fractional seeks produce 60 consecutive decoded PTS and 30 editable mask frames',async t=>{
  const ff=process.env.PORTRAIT_BEAT_MONTAGE_FFMPEG||'ffmpeg';
  const probe=process.env.PORTRAIT_BEAT_MONTAGE_FFPROBE||'ffprobe';
  if(spawnSync(ff,['-version']).status!==0||spawnSync(probe,['-version']).status!==0) {
    t.skip('ffmpeg and ffprobe required');return;
  }
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'portrait-source-clock-'));
  const run=(tool,args)=>{
    const result=spawnSync(tool,args,{encoding:'utf8',maxBuffer:8<<20});
    assert.equal(result.status,0,result.stderr);return result.stdout;
  };
  try {
    const source=path.join(dir,'input.mp4');
    run(ff,['-v','error','-y','-f','lavfi','-i','testsrc2=s=960x540:r=24000/1001:d=3',
      '-c:v','mpeg4','-q:v','2','-pix_fmt','yuv420p',source]);
    const args=await sourceArgs();
    for(const start of [0,.13,.5833333333333334,1.375]) {
      const output=path.join(dir,'source-'+String(start)+'.avi');
      run(ff,Array.from(args({start,path:source,width:960,height:540},output)));
      const data=JSON.parse(run(probe,['-v','error','-select_streams','v:0','-show_frames',
        '-show_entries','stream=avg_frame_rate,time_base,start_time:frame=best_effort_timestamp','-of','json',output]));
      const stream=data.streams[0],pts=data.frames.map(frame=>frame.best_effort_timestamp);
      const [numerator,denominator]=stream.time_base.split('/').map(Number);
      assert.equal(pts.length,60,'seek '+start);
      assert.deepEqual(constantFrameRate(stream.avg_frame_rate,pts.map(p=>p-pts[0]),{numerator,denominator}),
        {numerator:60,denominator:1},'seek '+start);
      assert.equal(pts.filter(p=>(p-pts[0])*numerator/denominator<.5).length,30,'seek '+start);
      assert.equal(Number(stream.start_time),0);
    }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
