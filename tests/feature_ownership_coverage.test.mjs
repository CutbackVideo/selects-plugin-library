import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {checkFeatureOwnership} from '../tools/check_feature_ownership.mjs';

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'feature-ownership-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'plugins/a'),{recursive:true});fs.mkdirSync(path.join(root,'shared'));
 fs.writeFileSync(path.join(root,'shared/panel-modules.json'),JSON.stringify({modules:[]}));
 fs.writeFileSync(path.join(root,'plugins/a/plugin.json'),JSON.stringify({id:'a',collection:'visual-highlights',files:['panel.tsx']}));
 const source='const config = 1;\nfunction panel(){\n const callback = () => config;\n return [1].map(value => callback()+value);\n}\n';
 fs.writeFileSync(path.join(root,'plugins/a/panel.tsx'),source);
 const feature={id:'ui',decision:'keep-template-specific',owner:'a',reason:'Own view and callbacks compose the declared input.',contract:{input:'Number config.',output:'Rendered view.',identity:'The current template invocation.',dependencies:'Array mapping and config.',effects:'No persistence.',lifetime:'Synchronous call.',cleanup:'No allocated resource.',outcomes:'Returns a view or throws.',retry:'No mutation to replay.',distribution:'Shipped panel.',validation:'Fixture checks structural coverage; semantic behavior remains open.'},implementation:'specific',evidence:['plugins/a/panel.tsx']};
 const document={schemaVersion:1,template:'a',features:[feature],files:[{path:'plugins/a/panel.tsx',sha256:createHash('sha256').update(source).digest('hex'),role:'runtime',ranges:[{startLine:1,endLine:5,feature:'ui'}]}],embeddedPrograms:[],semanticReviewComplete:false};
 return {root,document};
}
test('ownership coverage includes anonymous callbacks, named functions and top-level orchestration without claiming semantic completion',t=>{
 const f=fixture(t),report=checkFeatureOwnership(f.root,f.document);assert.equal(report.coverageComplete,true);assert.equal(report.semanticReviewComplete,false);assert.equal(report.callables.length,3);assert.equal(report.statements.length,2);assert.ok(report.callables.some(row=>row.name===null));assert.ok(report.callables.every(row=>row.feature==='ui'));
});
test('ownership coverage rejects missing shipped executables and uncovered callbacks',t=>{
 const f=fixture(t);f.document.files[0].ranges=[{startLine:1,endLine:1,feature:'ui'}];assert.throws(()=>checkFeatureOwnership(f.root,f.document),/uncovered/i);
 fs.writeFileSync(path.join(f.root,'plugins/a/plugin.json'),JSON.stringify({id:'a',collection:'visual-highlights',files:['panel.tsx','worker.cjs']}));assert.throws(()=>checkFeatureOwnership(f.root,f.document),/missing.*worker/i);
});
test('ownership coverage rejects stale evidence and ambiguous overlapping decisions',t=>{
 const f=fixture(t);f.document.files[0].sha256='0'.repeat(64);assert.throws(()=>checkFeatureOwnership(f.root,f.document),/stale/i);
 f.document.files[0].sha256=createHash('sha256').update(fs.readFileSync(path.join(f.root,'plugins/a/panel.tsx'))).digest('hex');f.document.files[0].ranges.push({startLine:2,endLine:4,feature:'ui'},{startLine:3,endLine:5,feature:'ui'});assert.throws(()=>checkFeatureOwnership(f.root,f.document),/overlap/i);
});
test('ownership coverage requires a real owner and complete I/O/lifetime decisions',t=>{
 const f=fixture(t);delete f.document.features[0].contract.cleanup;assert.throws(()=>checkFeatureOwnership(f.root,f.document),/cleanup/i);f.document.features[0].contract.cleanup='None';f.document.features[0].decision='reuse';f.document.features[0].owner='nonexistent';assert.throws(()=>checkFeatureOwnership(f.root,f.document),/owner/i);
});
test('ownership coverage cannot declare unparsed code or embedded programs reviewed by default',t=>{
 const f=fixture(t);f.document.embeddedPrograms=[{file:'plugins/a/panel.tsx',feature:'ui',producer:'workerSource',description:''}];assert.throws(()=>checkFeatureOwnership(f.root,f.document),/embedded/i);
});
test('ownership coverage does not count a whitespace-only range as an implemented feature',t=>{
 const f=fixture(t);f.document.features.push({...f.document.features[0],id:'unused'});f.document.files[0].ranges.push({startLine:6,endLine:6,feature:'unused'});assert.throws(()=>checkFeatureOwnership(f.root,f.document),/unused/i);
});
test('ownership coverage retains non-JavaScript code as manual work instead of a complete callable index',t=>{
 const f=fixture(t),file='plugins/a/engine.py',source='def run():\n    return 1\n';fs.writeFileSync(path.join(f.root,file),source);fs.writeFileSync(path.join(f.root,'plugins/a/plugin.json'),JSON.stringify({id:'a',collection:'visual-highlights',files:['panel.tsx','engine.py']}));f.document.files.push({path:file,sha256:createHash('sha256').update(source).digest('hex'),role:'runtime',ranges:[{startLine:1,endLine:3,feature:'ui'}],manualReview:'Python source needs separate callable and embedded-program inspection.'});const report=checkFeatureOwnership(f.root,f.document);assert.equal(report.coverageComplete,false);assert.ok(report.files.some(row=>row.analysis==='manual-required'));
});
test('ownership coverage includes declared data assets and rejects changed binary evidence',t=>{
 const f=fixture(t),file='plugins/a/tone.bin';fs.writeFileSync(path.join(f.root,file),Buffer.from([0,255,1]));fs.writeFileSync(path.join(f.root,'plugins/a/plugin.json'),JSON.stringify({id:'a',collection:'visual-highlights',files:['panel.tsx','tone.bin']}));f.document.includeAllShippedAssets=true;assert.throws(()=>checkFeatureOwnership(f.root,f.document),/missing.*asset/i);f.document.assets=[{path:file,sha256:createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex'),feature:'ui',reason:'Binary input is declared and captured.'}];assert.equal(checkFeatureOwnership(f.root,f.document).counts.assets,1);fs.appendFileSync(path.join(f.root,file),'x');assert.throws(()=>checkFeatureOwnership(f.root,f.document),/stale.*asset/i);
});
test('ownership findings need source locations inside the captured review instead of an ungrounded completion claim',t=>{
 const f=fixture(t);f.document.findings=[{id:'finding',status:'confirmed-fixture',feature:'ui',title:'A declared behavior differs from code.',sources:[{file:'plugins/a/panel.tsx',line:999}],repairOwner:'a',mechanism:'The captured callback has no admission check.',acceptance:'The actual callback must refuse the changed input.',evidence:['plugins/a/panel.tsx'],reproducer:'plugins/a/panel.tsx'}];assert.throws(()=>checkFeatureOwnership(f.root,f.document),/finding/i);
});
test('ownership source identity can explicitly normalize checkout line endings while binary asset identity stays exact',t=>{
 const f=fixture(t),file=path.join(f.root,'plugins/a/panel.tsx');f.document.files[0].hashMode='lf-text';fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/\n/g,'\r\n'));assert.equal(checkFeatureOwnership(f.root,f.document).coverageComplete,true);
 const asset='plugins/a/blob.bin';fs.writeFileSync(path.join(f.root,asset),Buffer.from([13,10]));f.document.assets=[{path:asset,hashMode:'bytes',sha256:createHash('sha256').update(Buffer.from([10])).digest('hex'),feature:'ui',reason:'Binary bytes remain exact.'}];assert.throws(()=>checkFeatureOwnership(f.root,f.document),/stale.*asset/i);
});
