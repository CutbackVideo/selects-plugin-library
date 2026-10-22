import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {clipAnalysisFixture} from './clip_analysis_fixture.mjs';
const source=fs.readFileSync(new URL('../plugins/archive-vlog/panel.tsx',import.meta.url),'utf8'),block=source.slice(source.indexOf('// quick-score:start'),source.indexOf('// quick-score:end'));
async function fixture(t,run){
 const f=await clipAnalysisFixture(t),removed=[],outputs=new Map(),remove=f.files.remove;
 f.files.remove=async(p,o)=>{removed.push(p);outputs.delete(p);return remove(p,o);};
 f.hooks.beforeTool=async(_bin,args,signal)=>{const out=args.at(-1);outputs.set(out,'owned output');fs.writeFileSync(out,'owned output');return run(args,signal);};
 vm.runInContext(block+'\nthis.archive={quickScore,quickScoreAll};',f.box);
 const options={client:f.local,dataDir:f.data};
 return {...f,removed,outputs,one:()=>f.box.archive.quickScore(f.input,options),batch:()=>f.box.archive.quickScoreAll([f.input,{rid:'r1',path:f.other,durationSeconds:4}],{...options,concurrency:2})};
}
for(const retain of [false,true])test('Archive shared scorer: terminal native error stops fallback and respects workspace ownership '+retain,async t=>{
 const error=Object.assign(Error('unconfirmed or malformed native job'),{terminal:true,...retain?{preserveTemporaryFiles:true}:{}}),f=await fixture(t,async()=>{throw error;});
 await assert.rejects(f.one(),e=>{let cause=e;while(cause?.cause)cause=cause.cause;return cause===error&&e.terminal===true&&(!retain||e.code==='BUNDLED_ASSET_WORKSPACE_UNKNOWN'&&e.preserveTemporaryFiles===true);});assert.equal(f.outputs.size,retain?1:0);for(const p of f.outputs.keys())assert.ok(fs.existsSync(p));assert.equal(error.retainedTemporaryFiles,undefined,'another owner must not mutate the original error');
});
test('Archive shared scorer control: known ordinary decoder failure keeps fallback and cleanup',async t=>{
 const f=await fixture(t,async()=>{throw Error('known decoder failure');});assert.equal((await f.one()).fallback,true);assert.equal(f.outputs.size,0);
});
test('Archive shared batch: failure waits for sibling settlement and retains only the unconfirmed producer output',async t=>{
 let release,started,index=0;const secondStarted=new Promise(r=>started=r),hold=new Promise(r=>release=r),error=Object.assign(Error('native settlement unknown'),{terminal:true,preserveTemporaryFiles:true});
 const f=await fixture(t,async()=>{if(++index===1){await secondStarted;throw error;}started();await hold;});
 let settled=false;const work=f.batch().then(()=>{settled=true;},()=>{settled=true;});
 try{await secondStarted;await new Promise(r=>setImmediate(r));assert.equal(settled,false);}finally{release();await work;}
 assert.equal(f.outputs.size,1);for(const p of f.outputs.keys())assert.ok(fs.existsSync(p));
});
