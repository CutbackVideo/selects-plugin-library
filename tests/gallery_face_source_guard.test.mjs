import test from 'node:test';import assert from 'node:assert/strict';import{galleryFixture}from'./gallery_authoring_fixture.mjs';import{fingerprintTemplateFile}from'../shared/file-observation.js';
for(const minify of [false,true])test('Gallery face focus refuses same-size replaced source bytes before any Draft save (minify='+minify+')',async()=>{
 const f=galleryFixture({minify}),file=f.input.media[0].path;
 f.input.faceFingerprints=[{path:file,...await fingerprintTemplateFile(f.selects.files,file)}];
 f.sourceBytes.set(file,Buffer.alloc(32,9));
 await assert.rejects(f.create(),/photo changed after face analysis/i);assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
test('Gallery face focus source guard accepts the exact analyzed bytes and retains normal verified saving',async()=>{
 const f=galleryFixture(),file=f.input.media[0].path;
 f.input.faceFingerprints=[{path:file,...await fingerprintTemplateFile(f.selects.files,file)}];
 const result=await f.create();assert.equal(result.verified,true);assert.equal(f.commits.length,1);
});
