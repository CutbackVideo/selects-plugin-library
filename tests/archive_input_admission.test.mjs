import assert from 'node:assert/strict';
import test from 'node:test';
import {archiveMusicFixture} from './archive_music_fixture.mjs';
const row=(id,kind)=>({resourceId:id,kind});
for(const footage of [[row('p1','image'),row('p2','image')],[row('v1','video'),row('p1','image')],[row('v1','video'),row('v1','video')]])test('Archive input admission: insufficient distinct videos stop before assets or SDK placement '+JSON.stringify(footage),async t=>{
 const f=await archiveMusicFixture(t);let roots=0;f.box.locateRoots=async()=>{roots++;throw Error('unnecessary asset lookup');};
 const before=f.scripts.length;await assert.rejects(f.box.api.runArchiveVlogTemplate(f.box.sdk,{projectId:'p',template:{runId:'input-check',inputs:{footage}}},()=>{},()=>{}),error=>error.code==='archive-video-required'&&error.forPerson===true);
 assert.equal(roots,0);assert.equal(f.scripts.length,before);assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);
});
for(const footage of [null,[{resourceId:4,kind:'video'}],Array.from({length:51},(_,i)=>row('v'+i,'video'))])test('Archive input admission: malformed or oversized input stops before asset lookup',async t=>{
 const f=await archiveMusicFixture(t);let roots=0;f.box.locateRoots=async()=>{roots++;throw Error('unnecessary asset lookup');};
 await assert.rejects(f.box.api.runArchiveVlogTemplate(f.box.sdk,{projectId:'p',template:{runId:'input-check',inputs:{footage}}},()=>{},()=>{}),error=>error.code==='template-input-invalid'&&error.forPerson===true);assert.equal(roots,0);assert.equal(f.imports.length,0);
});
test('Archive input admission: lost kind evidence stops before inventory, analysis and import',async t=>{
 const f=await archiveMusicFixture(t),ordinary=f.box.sdk.runScript;f.box.sdk.runScript=input=>input.summary==='Find the chosen files'?{result:{resolved:[{rid:'original-0',alias:'r0',size:null},{rid:'original-1',alias:'r1',size:null}],failed:[]}}:ordinary(input);
 await assert.rejects(f.run(),e=>e.code==='source-resolution-unknown');assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);assert.equal(f.scripts.some(row=>row.summary==='Read footage'),false);
});
for(const failure of ['duplicate alias','kind mismatch','unavailable video'])test('Archive input admission: '+failure+' cannot reach inventory or import',async t=>{
 const f=await archiveMusicFixture(t),ordinary=f.box.sdk.runScript,failed=failure==='duplicate alias'?[]:[{rid:'original-1',phase:failure==='kind mismatch'?'kind':'insert',code:failure==='kind mismatch'?'source-kind-mismatch':'source-resolution-unknown',error:'controlled source observation'}];
 f.box.sdk.runScript=input=>input.summary==='Find the chosen files'?{result:{resolved:[{rid:'original-0',alias:'r0',kind:'video',size:null},...failure==='duplicate alias'?[{rid:'original-1',alias:'r0',kind:'video',size:null}]:[]],failed}}:ordinary(input);
 const expected=failure==='duplicate alias'?'archive-video-required':failure==='kind mismatch'?'source-kind-mismatch':'source-resolution-failed';
 await assert.rejects(f.run(),e=>e.code===expected&&e.forPerson===true);assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);assert.equal(f.scripts.some(row=>row.summary==='Read footage'),false);
});
for(const count of [2,3,50])test('Archive input admission: two videos plus optional photos reach catalog within the '+count+'-file boundary',async t=>{
 const f=await archiveMusicFixture(t),footage=Array.from({length:count},(_,i)=>row('chosen-'+i,i<2?'video':'image')),batches=[];
 const ordinary=f.box.sdk.runScript;
 f.box.sdk.runScript=input=>{
  if(input.summary!=='Find the chosen files')return ordinary(input);
  const cfg=new Function(input.script)();batches.push(cfg.files);
  return {result:{resolved:cfg.files.map(file=>({rid:file.rid,alias:'alias-'+file.rid,kind:file.kind,size:file.kind==='image'?{width:96,height:160}:null})),failed:[]}};
 };
 const boundary=Object.assign(Error('catalog is outside the admission fixture'),{boundary:true});let observed;
 f.box.readInventoryPages=async(_run,_script,config)=>{observed=config.only;throw boundary;};
 await assert.rejects(f.box.api.runArchiveVlogTemplate(f.box.sdk,{projectId:'p',template:{runId:'valid-selection',inputs:{footage}}},()=>{},()=>{}),e=>e.cause===boundary);
 assert.deepEqual([...observed],footage.map(file=>'alias-'+file.resourceId));assert.ok(batches.every(batch=>batch.length<=6));assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);
});
test('Archive input admission: an existing continuation recovers before inspecting a changed selection',async t=>{
 const f=await archiveMusicFixture(t);let roots=0,recovered=0;
 f.box.locateRoots=async()=>{roots++;throw Error('new assets are outside recovery');};
 f.box.openTemplateAssemblyContinuations=async()=>({read:async()=>({scope:{runId:'previous'}}),workflow:async()=>{recovered++;return {sequenceId:'previous-draft'};}});
 const result=await f.box.api.runArchiveVlogTemplate(f.box.sdk,{projectId:'p',template:{runId:'previous',inputs:{footage:null}}},()=>{},()=>{});
 assert.equal(result.sequenceId,'previous-draft');assert.equal(recovered,1);assert.equal(roots,0);assert.equal(f.scripts.length,0);
});
