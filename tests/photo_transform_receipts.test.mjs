import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './photo_authoring_fixture.mjs';
import {templateFixture} from './photo_template_run_fixture.mjs';

for(const id of ['no14-still-video','camera-shutter-dump']){
 test(id+': complete authoring reports every Image and graphic transform',async()=>{
  const f=fixture(id),result=await f.create();
  assert.equal(result.transforms?.length,result.clips.length+result.graphics.length);
  for(const row of result.transforms){
   assert.ok(Number.isSafeInteger(row.clipId));assert.equal(typeof row.trackId,'string');
   assert.equal(row.transform.flipHorizontal,false);assert.deepEqual(Array.from(row.transform.positionKeys),[]);
  }
 });
 test(id+': an ignored transform mutation fails before commit',async()=>{
  const f=fixture(id),p=f.selects.project('p'),create=p.createDraft;
  p.createDraft=async opts=>({...await create(opts),setClipTransform:async()=>{}});
  await assert.rejects(f.create(),/transform/i);assert.equal(f.commits.length,0);
 });
 test(id+': unsupported transform reads refuse a new Draft before commit',async()=>{
  const f=fixture(id,{transformReadSupported:false});await assert.rejects(f.create(),/transform|Selects/i);assert.equal(f.commits.length,0);
 });
 for(const target of ['image','graphic'])for(const mutation of ['position','flip','keys','scale','rotation','anchor','disabled'])test(id+': wrong saved '+target+' '+mutation+' cannot be verified',async()=>{
  const f=fixture(id);f.hooks.afterScript=input=>{if(!input.summary.startsWith('Create complete'))return;
   const clip=[...f.saved.values()][0].clips.find(c=>target==='graphic'?c._graphic:c.trackKind==='video'&&c.resourceId);
   clip._transform??={};
   if(mutation==='position')clip._transform.position={x:100,y:100};
   if(mutation==='flip')clip._transform.flipHorizontal=true;
   if(mutation==='keys')clip._transform.scaleKeys=[{atSeconds:0,scale:1},{atSeconds:1,scale:2}];
   if(mutation==='scale')clip._transform.scale={x:2,y:3};
   if(mutation==='rotation')clip._transform.rotation=90;
   if(mutation==='anchor')clip._transform.anchor={x:10,y:10};
   if(mutation==='disabled')clip._transform.enabled=false;
  };
  await assert.rejects(f.create(),error=>error.code==='IMAGE_SAVE_UNVERIFIED'&&typeof error.draftId==='string');assert.equal(f.commits.length,1);
 });
 test(id+': roundoff in transformed coordinates is tolerated without hiding changes',async()=>{
  const f=fixture(id);f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete'))for(const c of [...f.saved.values()][0].clips)if(c._transform?.scale)c._transform.scale.x+=1e-12;};
  assert.equal((await f.create()).status,'saved');assert.equal(f.commits.length,1);
 });
 test(id+': remount verifies saved transforms and preserves a manual move',async()=>{
  const f=templateFixture(id,{minify:true});await f.mount();await f.until(()=>f.finishes.length===1);
  const draftId=f.finishes[0].sequenceId;assert.ok(draftId);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/')),record=JSON.parse(f.files.get(path));
  assert.equal(record.result.transforms?.length,record.result.clips.length+record.result.graphics.length);
  const clip=f.saved.get(draftId).clips.find(c=>c.trackKind==='video'&&c.resourceId);clip._transform.position={x:25,y:25};
  await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.deepEqual(clip._transform.position,{x:25,y:25});
 });
 test(id+': old receipts without transform evidence cannot trigger another save',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/')),row=JSON.parse(f.files.get(path));delete row.result.transforms;f.files.set(path,Buffer.from(JSON.stringify(row)));
  const before=Buffer.from(f.files.get(path));await f.mount();await f.until(()=>f.finishes.length===2);
  assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(path),before);
 });
 for(const corruption of ['foreign target','missing coordinate','invalid scale'])test(id+': corrupted '+corruption+' evidence is preserved and refused without dispatch',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/')),row=JSON.parse(f.files.get(path)),transform=row.result.transforms[0];
  if(corruption==='foreign target')transform.trackId='unrelated-track';
  if(corruption==='missing coordinate')delete transform.transform.position.x;
  if(corruption==='invalid scale')transform.transform.scale.y=0;
  f.files.set(path,Buffer.from(JSON.stringify(row)));const before=Buffer.from(f.files.get(path)),requests=f.requests.length;
  await f.mount();await f.until(()=>f.finishes.length===2);
  assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.equal(f.requests.length,requests);assert.deepEqual(f.files.get(path),before);
 });
}
