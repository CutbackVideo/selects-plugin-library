import assert from 'node:assert/strict';import test from 'node:test';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {miniMusicFixture} from './mini_music_fixture.mjs';import {hash,replaceSameFacts} from './gallery_hold_fixture.mjs';import vm from 'node:vm';import {createRequire} from 'node:module';import {topLevel} from './windows_host.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild'),panel=fs.readFileSync(new URL('../plugins/mini-vlog/panel.tsx',import.meta.url),'utf8'),plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code;
async function setup(t,entry='panel'){
 const f=await miniMusicFixture(t,{entry,silent:true});
 for(const [file,color] of [[f.source,'red'],[f.other,'blue']])execFileSync('ffmpeg',['-nostdin','-v','error','-y','-f','lavfi','-i','color=c='+color+':size=128x96:rate=30:duration=4','-an','-c:v','libx264','-pix_fmt','yuv420p',file]);
 const a=fs.readFileSync(f.source),b=fs.readFileSync(f.other),length=Math.max(a.length,b.length)+128;for(const file of [f.source,f.other]){const bytes=fs.readFileSync(file);fs.writeFileSync(file,Buffer.concat([bytes,Buffer.alloc(length-bytes.length)]));fs.utimesSync(file,946684800,946684800);}
 f.inventory.resources=[{rid:'r0',path:f.source,duration:4,analysed:false},{rid:'r1',path:f.other,duration:4,analysed:false}];
 const planned=[];f.box.AbortController=AbortController;f.box.setCandidates=value=>{f.box.candidates=value;};f.box.findCandidates=async()=>({list:[],failed:[]});f.box.hostSdk=f.local;f.box.panelLocalClient=()=>f.local;f.box.mvHostDataDir=async()=>f.data;f.box.mvQuickCheckAvailable=()=>true;f.box.localAbortRef={current:null};f.box.setChecking=()=>{};f.box.MV_LOCAL_CONCURRENCY=2;f.box.MV_LOCAL_BUDGET_MS=30000;
 vm.runInContext(panel.slice(panel.indexOf('// quick-score:start'),panel.indexOf('// quick-score:end'))+'\n'+topLevel(plain.replace(/^  /gm,''),'checkLocalClips'),f.box);
 f.box.mvWithLocal=(_scene,results)=>results.map(c=>({rid:c.rid,t:1,score:.8,luma:c.scores.windows[0].luma}));f.box.mvPlanBuild=options=>{planned.push(options.candidates.map(c=>c.luma));f.hooks.beforePlan?.();return f.plan;};
 f.files.fingerprint=async path=>fs.existsSync(path)?{size:fs.statSync(path).size,sha256:hash(path)}:null;
 return {...f,planned,decodes:()=>f.calls.filter(c=>c.args.includes('-vf')).length};
}
test('Mini local input: unchanged files reuse previously confirmed scores',async t=>{
 const f=await setup(t);await f.run();assert.equal(f.saved.length,1,JSON.stringify(f.errors));await f.run();assert.equal(f.saved.length,2,JSON.stringify(f.errors));assert.equal(f.decodes(),2);assert.deepEqual(f.planned[1],f.planned[0]);
});
test('Mini local input: same-path same-size same-mtime replacement cannot reach the planner through old memory scores',async t=>{
 const f=await setup(t);await f.run();assert.equal(f.saved.length,1,JSON.stringify(f.errors));const before=hash(f.source);replaceSameFacts(f.source,f.other);assert.notEqual(hash(f.source),before);await f.run();assert.equal(f.saved.length,2,JSON.stringify(f.errors));assert.equal(f.decodes(),3);assert.equal(f.planned[1][0],f.planned[0][1]);assert.notEqual(f.planned[1][0],f.planned[0][0]);
});
test('Mini local input: a missing original cannot be hidden by a previous successful analysis',async t=>{
 const f=await setup(t);await f.run();assert.equal(f.saved.length,1);fs.unlinkSync(f.source);await f.run();assert.equal(f.saved.length,1,'no second assembly dispatch with unobserved media');
});

test('Mini local input: replacement after scoring cannot reach assembly with the old plan',async t=>{
 const f=await setup(t);f.hooks.beforePlan=()=>replaceSameFacts(f.source,f.other);await f.run();assert.equal(f.decodes(),2);assert.equal(f.saved.length,0,'the original observations must still match immediately before assembly');
});

test('Mini selected input: unanalysed handed videos use the same source-bound local scorer',async t=>{
 const f=await setup(t,'template');await f.run();assert.equal(f.saved.length,1);assert.equal(f.decodes(),2);assert.equal(f.planned[0].length,2);await f.run();assert.equal(f.saved.length,2);assert.equal(f.decodes(),2,'the second app run reuses only confirmed persistent scores');
});

test('Mini local input: another bound panel cannot redirect the captured analysis workspace',async t=>{
 const f=await setup(t);vm.runInContext(topLevel(plain,'mvHostDataDir')+'\n'+topLevel(plain,'mvQuickCheckAvailable'),f.box);
 const otherRoot=f.root+'/unrelated-host';f.box.hostSdk={files:{...f.local.files,homedir:()=>otherRoot},media:f.local.media};
 await f.run();assert.equal(f.saved.length,1,JSON.stringify(f.errors));assert.equal(f.decodes(),2);assert.ok(!f.writes.some(p=>p.startsWith(otherRoot)),'source evaluation must keep its captured client and workspace');
});
