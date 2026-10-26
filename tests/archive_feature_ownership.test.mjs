import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkFeatureOwnership} from '../tools/check_feature_ownership.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const map=()=>read('docs/template-repair/ownership/archive-vlog.json');

test('Archive declared preparation and selection guide both require two distinct videos and optional photos',()=>{
 const manifest=read('plugins/archive-vlog/plugin.json'),input=manifest.inputs.find(row=>row.id==='footage');
 assert.deepEqual(input.accepts,['video','image']);assert.equal(input.min,2);assert.equal(input.max,50);
 for(const guidance of [input.hint,manifest.prepare[0]]){
  assert.match(guidance,/at least 2 different video clips/i);
  assert.match(guidance,/photos are optional/i);
 }
});

test('Archive ownership captures shipped functions, callbacks, data and generated programs without promoting acceptance',()=>{
 const report=checkFeatureOwnership(root,map());
 assert.equal(report.coverageComplete,true);assert.equal(report.semanticReviewComplete,false);assert.equal(report.templateAcceptanceComplete,false);
 assert.ok(report.callables.some(row=>row.name===null));
 for(const file of ['scripts/assemble.js','scripts/prepare-decoration.js','scripts/decorate.js','scripts/verify-assembly.js'])assert.ok(report.files.some(row=>row.path==='plugins/archive-vlog/'+file));
 const embedded=report.embeddedPrograms;
 assert.ok(embedded.some(row=>row.producer==='TEMPLATE_ALIAS_JS'));
 assert.ok(embedded.some(row=>row.producer==='avBeatWorkerSource'));
 assert.ok(embedded.some(row=>row.producer==='executeTemplateAssembly'));
});

test('Archive common blocks and canonical generator sources retain their actual owners',()=>{
 const document=map(),registry=read('shared/panel-modules.json'),panel='plugins/archive-vlog/panel.tsx';
 const source=fs.readFileSync(path.join(root,panel),'utf8'),record=document.files.find(row=>row.path===panel);
 const ownerAt=(line,end=line)=>document.features.find(feature=>feature.id===record.ranges.filter(row=>line>=row.startLine&&end<=row.endLine).sort((a,b)=>(a.endLine-a.startLine)-(b.endLine-b.startLine))[0]?.feature)?.owner;
 for(const module of registry.modules.filter(row=>row.targets?.includes(panel))){
  const marker=module.id==='media-inventory'?'media-inventory':module.id;
  const offset=source.indexOf('// '+marker+':start');assert.ok(offset>=0,module.id);
  const line=source.slice(0,offset).split('\n').length+1;
  assert.equal(ownerAt(line),module.id,module.id);
  assert.ok(document.files.some(row=>row.path===module.source),module.source);
 }
 for(const file of ['operation-builder.mjs','dev/assembly-policy.js','dev/assemble.template.js','dev/decorate.template.js','dev/verify-assembly.template.js'])assert.ok(document.files.some(row=>row.path==='plugins/archive-vlog/'+file),file);
 const renderOwners=['title-policy','credit-policy','look-policy','reveal-policy','photo-motion-policy','fade-policy'];
 for(const id of renderOwners)assert.ok(document.files.some(row=>row.path.startsWith('plugins/archive-vlog/assets/')&&row.ranges.some(range=>range.feature===id)),id);
});
