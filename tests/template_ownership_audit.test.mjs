import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {auditTemplateOwnership} from '../tools/audit_template_ownership.mjs';
test('ownership inventory distinguishes managed copies, unmanaged repetition and still-unreviewed features',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'template-ownership-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'shared'),{recursive:true});fs.writeFileSync(path.join(root,'shared/common.js'),'function measure(x){return x+budget;}\n');
 fs.writeFileSync(path.join(root,'shared/panel-modules.json'),JSON.stringify({schemaVersion:1,modules:[{id:'common',source:'shared/common.js',targets:['plugins/a/panel.tsx']}]}));
 for(const id of ['a','b','c','shortform-clips']){
  const dir=path.join(root,'plugins',id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'plugin.json'),JSON.stringify({id,collection:'visual-highlights',files:['panel.tsx','operation.js','engine.py']}));
  fs.writeFileSync(path.join(dir,'panel.tsx'),(id==='a'?'// common:start\n':'')+'function measure(x){ /* implementation comment */ return x + budget; }\n'+(id==='a'?'// common:end\n':''));
  fs.writeFileSync(path.join(dir,'operation.js'),"function text(){return '/* preserved string */';}\n");fs.writeFileSync(path.join(dir,'engine.py'),'def run():\n    return 1\n');
 }
 const report=auditTemplateOwnership(root);assert.deepEqual(report.templates.map(t=>t.id),['a','b','c']);assert.equal(report.complete,false);
 const repeated=report.repeatedGroups.find(g=>g.occurrences.some(o=>o.name==='measure'));assert.equal(repeated.templates.length,3);
 const rows=report.templates.flatMap(t=>t.functions).filter(f=>f.name==='measure');assert.equal(rows.find(f=>f.template==='a').managedModule,'common');assert.equal(rows.find(f=>f.template==='b').managedModule,null);
 assert.ok(rows.every(row=>row.externalReferences.includes('budget')));assert.ok(rows.every(row=>row.decision===null));
 assert.equal(report.templates[0].files.length,3);assert.equal(report.templates[0].files.find(f=>f.path.endsWith('.py')).analysis,'manual-required');
 assert.ok(report.templates[0].functions.some(f=>f.file.endsWith('operation.js')));
});
test('ownership fingerprints preserve comment-looking string contents',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'template-ownership-string-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'shared'),{recursive:true});fs.writeFileSync(path.join(root,'shared/panel-modules.json'),'{"schemaVersion":1,"modules":[]}');
 for(const id of ['a','b','c']){const dir=path.join(root,'plugins',id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'plugin.json'),JSON.stringify({id,collection:'visual-highlights',files:['panel.tsx']}));fs.writeFileSync(path.join(dir,'panel.tsx'),`function text(){return '${id==='c'?'/* different */':'/* same */'}';}\n`);}
 assert.equal(auditTemplateOwnership(root).repeatedGroups.length,0);
});
test('ownership inventory retains generated templates with parse placeholders as explicitly unreviewed files',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'template-ownership-generated-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'shared'),{recursive:true});fs.writeFileSync(path.join(root,'shared/panel-modules.json'),'{"schemaVersion":1,"modules":[]}');const dir=path.join(root,'plugins/a');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'plugin.json'),JSON.stringify({id:'a',collection:'visual-highlights',files:['panel.tsx','panel.template.tsx']}));fs.writeFileSync(path.join(dir,'panel.tsx'),'function ready(){return 1;}');fs.writeFileSync(path.join(dir,'panel.template.tsx'),'const = __PLACEHOLDER__;');
 const report=auditTemplateOwnership(root),file=report.templates[0].files.find(f=>f.path.endsWith('panel.template.tsx'));assert.equal(report.counts.files,2);assert.equal(file.analysis,'manual-required');assert.ok(file.diagnostics.length);assert.equal(file.decision,null);assert.equal(report.complete,false);
});
