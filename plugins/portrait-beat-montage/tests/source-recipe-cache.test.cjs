'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {createHash,webcrypto}=require('node:crypto');

async function fixture(platform) {
  const {topLevel}=await import('../../../tests/windows_host.mjs');
  const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'portrait-recipe-cache-'));
  const clips=Array.from({length:10},(_,i)=>path.join(data,'clip-'+i+'.mp4'));
  for(const clip of clips)fs.writeFileSync(clip,'source');
  const oldDigest=createHash('sha1').update(clips.join('|')+'{}').digest('hex').slice(0,6);
  const oldRoot=path.join(data,'runs','20261007-100000-'+oldDigest);
  fs.mkdirSync(path.join(oldRoot,'c01a'),{recursive:true});
  const oldPlan={runId:path.basename(oldRoot),units:{},slots:[],created:1};
  fs.writeFileSync(path.join(oldRoot,'plan.json'),JSON.stringify(oldPlan));
  fs.writeFileSync(path.join(oldRoot,'c01a','source.avi'),'old sparse PTS');
  const rt={runFFprobe:async()=>({stdout:'probe'})};
  const context=vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,console,
    hostIsWindows:()=>platform==='win32',hostJoin:path.join,
    hostReadText:async file=>fs.readFileSync(file,'utf8'),
    hostNeed:()=>rt,pbmCancelled:()=>Error('cancelled'),
    parseProbe:()=>({duration:4,width:960,height:540}),probeArgs:()=>[],motionArgs:()=>[],
    pbmFFmpegBytes:async()=>new Uint8Array(1),
    pbmWriteWhole:async(io,file,bytes)=>fs.writeFileSync(file,bytes),
    SLOTS:[1],REPEAT_FROM:99});
  const names=['PBM_CACHE','PBM_WINDOWS_CACHE','pbmSha1','pbmStamp','pbmPlan','pbmCacheDir'];
  vm.runInContext(names.map(name=>topLevel(source,name)).join('\n')+
    '\nthis.api={pbmPlan,pbmCacheDir};',context);
  const io={data,fs:{mkdir:async(p,o)=>fs.mkdirSync(p,o),readdir:async p=>fs.readdirSync(p),
    exists:async p=>fs.existsSync(p),basename:path.basename,
    stat:async p=>fs.statSync(p)}};
  const kernels={motionScores:()=>({starts:[.13],scores:[1]}),choose:()=>.13};
  return {data,clips,oldRoot,oldPlan,io,kernels,...context.api,
    dispose:()=>fs.rmSync(data,{recursive:true,force:true})};
}

test('Windows upgrades leave a sparse-source unfinished run intact and start the CFR recipe',async()=>{
  const f=await fixture('win32');
  try {
    const run=await f.pbmPlan(f.io,f.kernels,f.clips,null);
    assert.equal(run.resumed,false);
    assert.notEqual(run.root,f.oldRoot);
    assert.equal(Object.keys(run.plan.units).length,15);
    assert.equal(fs.readFileSync(path.join(f.oldRoot,'c01a','source.avi'),'utf8'),'old sparse PTS');
    const reopened=await f.pbmPlan(f.io,f.kernels,f.clips,null);
    assert.equal(reopened.resumed,true);
    assert.equal(reopened.root,run.root,'the same CFR recipe still resumes its unfinished run');
  }finally{f.dispose();}
});

test('Windows prepared units cannot read the previous source recipe cache',async()=>{
  const f=await fixture('win32');
  try {
    const folder=await f.pbmCacheDir(f.io,{path:f.clips[0],start:.13});
    assert.equal(path.basename(path.dirname(folder)),'cache-shared-ai-v3-cfr');
    assert.notEqual(path.dirname(folder),path.join(f.data,'cache-shared-ai-v2'));
  }finally{f.dispose();}
});

test('Mac keeps its unchanged prepared cache and unfinished runs',async()=>{
  const f=await fixture('darwin');
  try {
    const run=await f.pbmPlan(f.io,f.kernels,f.clips,null);
    assert.equal(run.resumed,true);
    assert.equal(run.root,f.oldRoot);
    const folder=await f.pbmCacheDir(f.io,{path:f.clips[0],start:.13});
    assert.equal(path.dirname(folder),path.join(f.data,'cache-shared-ai-v2'));
  }finally{f.dispose();}
});
