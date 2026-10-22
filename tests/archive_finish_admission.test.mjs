import assert from 'node:assert/strict';
import test from 'node:test';
import {archiveWorkflowFixture} from './archive_workflow_fixture.mjs';

for(const key of ['title','credit','letterbox','look','fade','motion'])test('Archive Finish admission: missing '+key+' stops before assembly',async t=>{
 const f=await archiveWorkflowFixture(t,{realFinish:true});delete f.ui.box.assets.tsx[key];
 await f.build();assert.equal(f.commits(),0,'incomplete Finish assets cannot save a base assembly');
 assert.ok(f.ui.errors.some(error=>error.code==='TEMPLATE_RUN_INVALID'));
});
for(const key of ['assembleJs','decorateJs','prepareJs','verifyAssemblyJs'])for(const mode of ['missing placeholder','oversized'])test('Archive Finish admission: '+mode+' in '+key+' stops before assembly',async t=>{
 const f=await archiveWorkflowFixture(t,{realFinish:true}),scripts=f.ui.box.assets.scripts;
 scripts[key]=mode==='missing placeholder'?scripts[key].replace('__CONFIG__','null'):scripts[key]+'\n/*'+'x'.repeat(131072)+'*/';
 await f.build();assert.equal(f.commits(),0);assert.ok(f.ui.errors.some(error=>error.code==='TEMPLATE_RUN_INVALID'));
});
