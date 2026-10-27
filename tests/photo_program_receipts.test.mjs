import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './photo_authoring_fixture.mjs';
import {templateFixture} from './photo_template_run_fixture.mjs';
for(const id of ['no14-still-video','camera-shutter-dump','four-photo-stop-motion']){
 test(id+': programs are verified for all visuals with deduplicated source',async()=>{
  const f=fixture(id),r=await f.create();assert.equal(r.programs?.clips.length,r.clips.length+r.graphics.length);
  assert.equal(r.programs.sources.length,id==='camera-shutter-dump'?3:2);assert.equal(new Set(r.programs.sources).size,r.programs.sources.length);
 });
 for(const target of ['effect','graphic'])for(const kind of ['code','parameters','controls'])test(id+': wrong persisted '+target+' '+kind+' is refused',async()=>{
  const f=fixture(id);f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete')){
   const rows=[...f.saved.values()][0].clips,program=target==='effect'?rows.find(c=>c._effects?.length)._effects[0]:rows.find(c=>c._graphic)._graphic;
   if(kind==='code')program.tsxCode+='\n// changed';
   if(kind==='parameters')program.parameters.unexpected='manual';
   if(kind==='controls')program.editableParameters.push({key:'unexpected',label:'Unexpected',type:'text',defaultValue:''});
  }};
  await assert.rejects(f.create(),error=>error.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
 });
 test(id+': an ignored effect write is stopped before commit',async()=>{
  const f=fixture(id),p=f.selects.project('p'),create=p.createDraft;p.createDraft=async o=>({...await create(o),addVideoEffect:async()=>{}});
  await assert.rejects(f.create(),/effect|program/i);assert.equal(f.commits.length,0);
 });
 test(id+': a disabled saved effect cannot be reported as verified',async()=>{
  const f=fixture(id);f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete'))[...f.saved.values()][0].clips.find(c=>c._effects?.length)._effects[0].enabled=false;};
  await assert.rejects(f.create(),error=>error.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
 });
 test(id+': unavailable program reads stop before commit',async()=>{
  const f=fixture(id,{programReadSupported:false});await assert.rejects(f.create(),/effect|program|Selects/i);assert.equal(f.commits.length,0);
 });
 test(id+': failed program reads do not expose private host diagnostics',async()=>{
  const f=fixture(id),p=f.selects.project('p'),create=p.createDraft;p.createDraft=async o=>({...await create(o),videoEffects:async()=>{throw Error('private TOKEN=secret');}});
  await assert.rejects(f.create(),error=>/program/i.test(error.message)&&!/private|secret/.test(error.message));assert.equal(f.commits.length,0);
 });
 test(id+': minified remount preserves manually changed effect code',async()=>{
  const f=templateFixture(id,{minify:true});await f.mount();await f.until(()=>f.finishes.length===1);const draftId=f.finishes[0].sequenceId;assert.ok(draftId);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/'));assert.ok(JSON.parse(f.files.get(path)).result.programs.sources.length>=2);
  const row=f.saved.get(draftId).clips.find(c=>c._effects?.length);row._effects[0].tsxCode+='\n// manual';await f.mount();await f.until(()=>f.finishes.length===2);
  assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.match(row._effects[0].tsxCode,/manual/);
 });
 test(id+': missing old program evidence never replays a save',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);const path=[...f.files.keys()].find(p=>p.includes('/template-runs/')),row=JSON.parse(f.files.get(path));delete row.result.programs;f.files.set(path,Buffer.from(JSON.stringify(row)));const before=Buffer.from(f.files.get(path));
  await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(path),before);
 });
 // This fault injects preset controls. Stop Motion has authored programs only;
 // the shared serializer still gates its real prospective receipt before commit.
 if(id!=='four-photo-stop-motion')test(id+': oversized hidden-run evidence records a known pre-commit failure',async()=>{
  const f=templateFixture(id),get=f.selects.effectPresets.get;
  f.selects.effectPresets.get=async key=>{const d=await get(key);return {...d,editableParameters:[...d.editableParameters,{key:'large',label:'Large',type:'text',defaultValue:'x'.repeat(50000)}]};};
  await f.mount();await f.until(()=>f.finishes.length===1);assert.ok(f.finishes[0].error);assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/'));assert.equal(JSON.parse(f.files.get(path)).status,'notSaved');
 });
 test(id+': a healthy remount verifies the saved program snapshot without a write',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);const draftId=f.finishes[0].sequenceId;assert.ok(draftId);
  await f.mount();await f.until(()=>f.finishes.length===2);assert.equal(f.finishes[1].sequenceId,draftId);assert.equal(f.commits.length,1);
 });
 for(const corruption of ['invalid source','missing controls','foreign target'])test(id+': '+corruption+' journal evidence is refused without dispatch',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);const path=[...f.files.keys()].find(p=>p.includes('/template-runs/')),row=JSON.parse(f.files.get(path)),c=row.result.programs.clips.find(c=>c.effects.length);
  if(corruption==='invalid source')c.effects[0].source=999;
  if(corruption==='missing controls')delete c.effects[0].editableParameters;
  if(corruption==='foreign target')c.trackId='foreign';
  f.files.set(path,Buffer.from(JSON.stringify(row)));const before=Buffer.from(f.files.get(path)),requests=f.requests.length;
  await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.equal(f.requests.length,requests);assert.deepEqual(f.files.get(path),before);
 });
}
test('No.14 Music On verifies preset ordering and its canonical program without saving a probe',async()=>{
 const f=fixture('no14-still-video'),r=await f.create({music:'on'});assert.ok(r.programs?.clips.some(c=>c.effects.length===2));assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
});
test('No.14 refuses swapped authored/preset effect order after saving',async()=>{
 const f=fixture('no14-still-video');f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete'))[...f.saved.values()][0].clips.find(c=>c._effects?.length===2)._effects.reverse();};
 await assert.rejects(f.create({music:'on'}),error=>error.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
});
test('No.14 does not adopt a changed target preset as the canonical program',async()=>{
 const f=fixture('no14-still-video'),p=f.selects.project('p'),create=p.createDraft;
 p.createDraft=async o=>{const d=await create(o);if(o.name!=='Image preset reference'){const read=d.videoEffectProgram;d.videoEffectProgram=async e=>{const program=await read(e);if(e.name==='Fade down')program.tsxCode+='\n// wrong target';return program;};}return d;};
 await assert.rejects(f.create({music:'on'}),/program/i);assert.equal(f.commits.length,0);
});
test('oversized program evidence is rejected before committing the Draft',async()=>{
 const f=fixture('camera-shutter-dump'),get=f.selects.effectPresets.get;f.selects.effectPresets.get=async id=>({...await get(id),editableParameters:[{key:'large',label:'Large',type:'text',defaultValue:'x'.repeat(50000)}]});
 await assert.rejects(f.create(),/receipt|limit/i);assert.equal(f.commits.length,0);
});

test('No.14 preserves shader preset code through authoring and saved receipt verification',async()=>{
 const shader={graph:{schema:'Cutback.ShaderEffect.1',passes:[{id:'fade',wgsl:'shader source',inputs:['source'],parameters:[]}],output:'fade'}};
 const f=fixture('no14-still-video',{presetShader:shader}),result=await f.create({music:'on'});
 assert.ok(result.programs.sources.some(s=>s?.graph?.schema==='Cutback.ShaderEffect.1'));assert.equal(f.commits.length,1);
});
test('No.14 refuses a changed saved shader program',async()=>{
 const shader={graph:{schema:'Cutback.ShaderEffect.1',passes:[{id:'fade',wgsl:'shader source',inputs:['source'],parameters:[]}],output:'fade'}};
 const f=fixture('no14-still-video',{presetShader:shader});
 f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete')){const clips=[...f.saved.values()][0].clips;clips.find(c=>c._effects?.some(e=>e.shader))._effects.find(e=>e.shader).shader.graph.passes[0].wgsl='changed';}};
 await assert.rejects(f.create({music:'on'}),e=>e.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
});
