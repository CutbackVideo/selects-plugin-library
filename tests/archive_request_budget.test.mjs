import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {archiveWorkflowFixture} from './archive_workflow_fixture.mjs';

// The template declares no maximum footage count. Many selected originals must
// not exceed a receipt-envelope limit before a small valid plan can be saved.
for(const realFinish of [false,true])test('Archive request budget: 100 selected originals retain '+(realFinish?'real bundled Finish assets':'the selected-source contract'),async t=>{
 const f=await archiveWorkflowFixture(t,{realFinish}),rows=f.ui.inventory.resources;
 for(let i=2;i<100;i++){
  const file=path.join(path.dirname(f.source),'selected-original-'+String(i).padStart(3,'0')+'.mp4');fs.copyFileSync(f.source,file);rows.push({rid:'r'+i,path:file,duration:20,analysed:true});
 }
 f.hooks.resources=rows.map(row=>({resourceId:row.rid,type:'Video'}));f.hooks.sourceFiles=()=>({fileTree:rows.map(row=>({resourceId:row.rid,type:'video',path:row.path}))});
 await f.build();
 assert.equal(f.result()?.decorated,true,JSON.stringify(f.ui.errors.map(error=>({message:error.message,code:error.code,cause:error.cause?.message}))));
 assert.equal(f.commits(),2);assert.equal(f.result().pending.config.sourceBindings.length,100);assert.equal(f.result().pending.config.analysisSources.length,100);
 assert.ok(f.requests.every(request=>Buffer.byteLength(request.script)<262144),'SDK transport remains bounded independently of the stored continuation');
});
