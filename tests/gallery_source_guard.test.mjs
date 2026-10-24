import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {galleryFixture} from './gallery_authoring_fixture.mjs';
import {fingerprintTemplateFile} from '../shared/file-observation.js';

function duringStyle(f,change){
 const project=f.selects.project('p'),create=project.createDraft;let changed=false;
 // Existing reads are cached within one SDK script. A separate saved-state
 // verification starts another script and observes current Project metadata.
 let cache=new Map();const run=f.sdk.runScript;
 f.sdk.runScript=async request=>{cache=new Map();return run(request);};
 for(const name of ['resources','sourceFiles']){
  const read=project[name];
  project[name]=async options=>{assert.equal(options?.fresh,undefined,'only the existing per-script read contract is available');const key=JSON.stringify([name,options??null]);if(!cache.has(key))cache.set(key,structuredClone(await read(options)));return structuredClone(cache.get(key));};
 }
 project.createDraft=async options=>{
  const draft=await create(options),style=draft.setClipTransform;
  draft.setClipTransform=async input=>{await style(input);if(!changed){changed=true;await change();}};
  return draft;
 };
}
const faults={
 videoDuration:f=>{f.nodes.find(n=>n.resourceId==='v0').durationSeconds=.1;},
 videoDimensions:f=>{f.nodes.find(n=>n.resourceId==='v0').frameSize.width=800;},
 videoPath:f=>{f.nodes.find(n=>n.resourceId==='v0').path='/changed/video.mp4';},
 videoMissing:f=>{f.nodes.splice(f.nodes.findIndex(n=>n.resourceId==='v0'),1);},
 musicDuration:f=>{f.nodes.find(n=>n.resourceId==='a0').durationSeconds=.1;},
 musicPath:f=>{f.nodes.find(n=>n.resourceId==='a0').path='/changed/music.wav';},
 musicMissing:f=>{f.nodes.splice(f.nodes.findIndex(n=>n.resourceId==='a0'),1);},
 imageMissing:f=>{f.selects.files.stat=async p=>p.startsWith('/photos/')?null:{size:32,isDirectory:false,mtimeMs:1,ino:1};},
 imageDimensions:f=>{f.nodes.find(n=>n.resourceId===f.input.media[0].resourceId).frameSize.width=801;},
};
for(const minify of [false,true])for(const [fault,change] of Object.entries(faults))test('Gallery detects '+fault+' changed during composition (minify='+minify+')',async()=>{
 const f=galleryFixture({minify});duringStyle(f,()=>change(f));
 await assert.rejects(f.create(),error=>{
  assert.match(error.message,/changed|missing|short|source|duration|dimension|confirm/i);
  if(fault!=='imageMissing'){assert.equal(error.code,'IMAGE_SAVE_UNVERIFIED');assert.equal(error.draftId,[...f.saved.keys()][0]);assert.notEqual(error.safeNotSaved,true);}
  return true;
 });
 if(fault==='imageMissing'){assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);assert.equal(f.observed.length,0);}
 else{assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);assert.equal(f.observed.length,1);assert.equal(f.observed[0].draftId,[...f.saved.keys()][0]);}
});
test('Gallery ignores unrelated Project metadata changes while composing selected inputs',async()=>{
 const f=galleryFixture();duringStyle(f,()=>{f.nodes.push({type:'video',resourceId:'other',path:'/unrelated/video.mp4',durationSeconds:1,frameSize:{width:320,height:240}});f.resources.push({resourceId:'other',type:'Video',durationSeconds:1});});
 const r=await f.create();assert.equal(r.verified,true);assert.equal(f.commits.length,1);
});

async function realSources(t,options={}){
 const f=galleryFixture(options),root=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-source-guard-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const node of f.nodes){node.path=path.join(root,node.resourceId+'.bin');fs.writeFileSync(node.path,Buffer.alloc(32,7));fs.utimesSync(node.path,946684800,946684800);}
 for(const media of f.input.media)media.path=f.nodes.find(node=>node.resourceId===media.resourceId).path;
 f.input.music.path=f.nodes.find(node=>node.resourceId===f.input.music.resourceId).path;
 f.selects.files.stat=async file=>{try{const s=fs.statSync(file);return {size:s.size,mtimeMs:s.mtimeMs,ino:s.ino,isDirectory:s.isDirectory()};}catch(error){if(error.code==='ENOENT')return null;throw error;}};
 const contentReads=[];
 f.selects.files.readRange=async({path:file,offset,length})=>{if(offset===0&&length===32)contentReads.push({path:file,afterSave:f.commits.length>0});const bytes=fs.readFileSync(file).subarray(offset,offset+length);return {bytesRead:bytes.length,base64:bytes.toString('base64')};};
 delete f.selects.files.fingerprint;
 return {...f,root,contentReads};
}
for(const kind of ['image','video','audio'])test('Gallery rejects real same-size/same-time '+kind+' replacement during composition',async t=>{
 const f=await realSources(t),file=f.nodes.find(node=>node.type===kind).path;
 duringStyle(f,()=>{fs.writeFileSync(file,Buffer.alloc(32,9));fs.utimesSync(file,946684800,946684800);});
 await assert.rejects(f.create(),/source.*changed/i);assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
for(const kind of ['video','audio'])test('Gallery preserves the saved identity when '+kind+' changes at commit',async t=>{
 const f=await realSources(t),file=f.nodes.find(node=>node.type===kind).path,project=f.selects.project('p'),create=project.createDraft;
 project.createDraft=async options=>{const d=await create(options),commit=d.commitAll;d.commitAll=async reason=>{const result=await commit(reason);fs.writeFileSync(file,Buffer.alloc(32,9));fs.utimesSync(file,946684800,946684800);return result;};return d;};
 await assert.rejects(f.create(),error=>/saved.*source|source.*confirmed/i.test(error.message)&&typeof error.draftId==='string');
 assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);assert.equal(f.observed.length,1);assert.equal(f.observed[0].draftId,[...f.saved.keys()][0]);
});
test('Gallery stable real inputs are checked before, during and after one complete save',async t=>{
 const f=await realSources(t),r=await f.create();assert.equal(r.verified,true);assert.equal(f.commits.length,1);
 const paths=new Set([...f.input.media.map(item=>item.path),f.input.music.path]);
 // Initial identity + immediately before commit, then same-script post-save +
 // a separate saved-source verification. Count actual complete byte reads.
 assert.equal(f.contentReads.length,paths.size*4);assert.deepEqual(new Set(f.contentReads.map(row=>row.path)),paths);
 for(const file of paths){const reads=f.contentReads.filter(row=>row.path===file);assert.equal(reads.length,4);assert.equal(reads.filter(row=>row.afterSave).length,2);}
});
test('Gallery confirms complete originals through existing reads without a source fingerprint SDK',async()=>{
 const f=galleryFixture();delete f.selects.files.fingerprint;const result=await f.create();assert.equal(result.verified,true);assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
});

for(const minify of [false,true])test('Gallery refuses a music estimate after its real source changes before creation (minify='+minify+')',async t=>{
 const f=await realSources(t,{minify}),file=f.input.music.path;
 f.input.musicFingerprint={path:file,...await fingerprintTemplateFile(f.selects.files,file)};
 fs.writeFileSync(file,Buffer.alloc(32,9));fs.utimesSync(file,946684800,946684800);
 await assert.rejects(f.create(),/music.*changed|changed.*music/i);
 assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
test('Gallery accepts a music estimate bound to the same real source contents',async t=>{
 const f=await realSources(t),file=f.input.music.path;
 f.input.musicFingerprint={path:file,...await fingerprintTemplateFile(f.selects.files,file)};
 const r=await f.create();assert.equal(r.verified,true);assert.equal(f.commits.length,1);
});
