import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryFixture} from './gallery_authoring_fixture.mjs';

function legacy(f){
 delete f.sdk.maxScriptTimeoutSeconds;
 delete f.selects.files.fingerprint;
 const project=f.selects.project('p'),resources=project.resources,sourceFiles=project.sourceFiles,create=project.createDraft;
 let resourceCache,sourceCache;
 project.resources=async(...args)=>{assert.equal(args.length,0,'existing resources() has no fresh option');return resourceCache??=structuredClone(await resources());};
 project.sourceFiles=async(input)=>{assert.ok(!input||!('fresh' in input),'existing sourceFiles() has no fresh option');return sourceCache??=structuredClone(await sourceFiles(input));};
 project.createDraft=async input=>{const d=await create(input);delete d.clipSourceWindow;return d;};
 const run=f.sdk.runScript;
 f.sdk.runScript=async input=>{resourceCache=sourceCache=undefined;return run(input);};
 return f;
}
test('Gallery creates and verifies one saved Draft without any new SDK method',async()=>{
 const f=legacy(galleryFixture());
 const result=await f.create();assert.equal(result.verified,true);assert.equal(f.commits.length,1);
 assert.ok(!f.calls.some(c=>/selects\.files\.fingerprint\s*\(|\.clipSourceWindow\s*\(|fresh\s*:\s*true/.test(c.script)));
});
test('source metadata changed during a cached composition is detected by an independent post-save read',async()=>{
 const f=legacy(galleryFixture()),project=f.selects.project('p'),create=project.createDraft;
 project.createDraft=async input=>{const d=await create(input),style=d.addVideoEffect;let changed=false;d.addVideoEffect=async args=>{const result=await style(args);if(!changed){changed=true;f.resources.find(r=>r.resourceId===f.input.media[0].resourceId).type='Audio';}return result;};return d;};
 await assert.rejects(f.create(),error=>typeof error.draftId==='string');
 assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
});
