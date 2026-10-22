'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('raw source capture works without a Resource analysis',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {rawSourceFrameArgs};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const input={path:'/source with spaces.mp4',meta:{fps:30000/1001,frameSize:{width:1920,height:1080}}};
 await t.test('rejects out-of-range batch sizes and noninteger source frames',()=>{
  for(const frames of [[],[-1],[1.5],Array.from({length:13},(_,i)=>i)])assert.throws(()=>m.exports.rawSourceFrameArgs(input,frames,'/out.jpg'));
 });
 await t.test('one decoder preserves the requested source clock and literal file paths',()=>{
  const r=m.exports.rawSourceFrameArgs(input,[0,66,156],'/out.jpg');
  assert.equal(r.width,640);assert.equal(r.height,360);
  assert.deepEqual(r.args.flatMap((x,i)=>x==='-ss'?[Number(r.args[i+1])]:[]),[0]);
  assert.equal(r.args.filter(x=>x===input.path).length,1);
  const unordered=m.exports.rawSourceFrameArgs(input,[156,66,66],'/out.jpg');
  assert.equal(Number(unordered.args[unordered.args.indexOf('-ss')+1]),2.2022);
  const filter=unordered.args[unordered.args.indexOf('-filter_complex')+1];
  assert.match(filter,/\[s0\]trim=start_frame=90:end_frame=91/);
  assert.match(filter,/\[s1\]trim=start_frame=0:end_frame=1/);
  assert.match(filter,/\[s2\]trim=start_frame=0:end_frame=1/);
 });
 const ffmpeg=process.env.SHORTFORM_TEST_FFMPEG,video=process.env.SHORTFORM_TEST_VIDEO;
 await t.test('real seeked frames match sequential decode across wide/single/grid cuts',{skip:!ffmpeg||!video},()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shortform-source-'));
  try{
   const actual=path.join(dir,'actual.jpg'),expected=path.join(dir,'expected.png');
   const frames=[69,70,170,171,220];
   const spec=m.exports.rawSourceFrameArgs({...input,path:video},frames,actual);
   execFileSync(ffmpeg,spec.args,{stdio:'pipe'});
   execFileSync(ffmpeg,['-v','error','-i',video,'-vf',`select='${frames.map(n=>`eq(n,${n})`).join('+')}',scale=640:360,setsar=1,tile=${frames.length}x1`,'-frames:v','1',expected],{stdio:'pipe'});
   const gray=file=>execFileSync(ffmpeg,['-v','error','-i',file,'-f','rawvideo','-pix_fmt','gray','pipe:1'],{maxBuffer:10e6});
   const a=gray(actual),b=gray(expected);assert.equal(a.length,640*360*frames.length);assert.equal(b.length,a.length);
   for(let tile=0;tile<frames.length;tile++){
    let error=0;for(let y=0;y<360;y++)for(let x=0;x<640;x++){const i=y*640*frames.length+tile*640+x;error+=Math.abs(a[i]-b[i]);}
    const mae=error/(640*360);assert.ok(mae<3,`source frame ${frames[tile]} differs: MAE ${mae}`);
   }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
});
