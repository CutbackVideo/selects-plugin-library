import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {galleryFixture} from './gallery_authoring_fixture.mjs';

function duringStyle(f,change){
 const project=f.selects.project('p'),create=project.createDraft;let changed=false;
 // Match the SDK's per-script read cache: only an explicit fresh read observes
 // later Project changes. Avoid proving safety with an always-live fake.
 for(const name of ['resources','sourceFiles']){
  const read=project[name];let cached;
  project[name]=async options=>{if(options?.fresh||cached===undefined)cached=structuredClone(await read(options));return structuredClone(cached);};
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
for(const minify of [false,true])for(const [fault,change] of Object.entries(faults))test('Gallery refuses '+fault+' changed during composition (minify='+minify+')',async()=>{
 const f=galleryFixture({minify});duringStyle(f,()=>change(f));
 await assert.rejects(f.create(),/changed|missing|short|source|duration|dimension|confirm/i);
 assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);assert.equal(f.observed.length,0);
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
 f.selects.files.readRange=async({path:file,offset,length})=>{const bytes=fs.readFileSync(file).subarray(offset,offset+length);return {bytesRead:bytes.length,base64:bytes.toString('base64')};};
 const fingerprintCalls=[];
 f.selects.files.fingerprint=async file=>{
  fingerprintCalls.push(file);if(!fs.existsSync(file))return null;
  const hash=createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);
  return {size:fs.statSync(file).size,sha256:hash.digest('hex')};
 };
 return {...f,root,fingerprintCalls};
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
 assert.equal(f.fingerprintCalls.length,paths.size*3);assert.deepEqual(new Set(f.fingerprintCalls),paths);
});
test('Gallery unsupported source fingerprints stop before asset/Draft work',async()=>{
 const f=galleryFixture();delete f.selects.files.fingerprint;await assert.rejects(f.create(),/Update Selects/i);assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});

for(const minify of [false,true])test('Gallery refuses a music estimate after its real source changes before creation (minify='+minify+')',async t=>{
 const f=await realSources(t,{minify}),file=f.input.music.path;
 f.input.musicFingerprint={path:file,...await f.selects.files.fingerprint(file)};
 fs.writeFileSync(file,Buffer.alloc(32,9));fs.utimesSync(file,946684800,946684800);
 await assert.rejects(f.create(),/music.*changed|changed.*music/i);
 assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
test('Gallery accepts a music estimate bound to the same real source contents',async t=>{
 const f=await realSources(t),file=f.input.music.path;
 f.input.musicFingerprint={path:file,...await f.selects.files.fingerprint(file)};
 const r=await f.create();assert.equal(r.verified,true);assert.equal(f.commits.length,1);
});
