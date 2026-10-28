import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
function fixture(t,id){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'a16z-delivery-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.cpSync(path.join(root,'shared'),path.join(dir,'shared'),{recursive:true});
 const plugin=path.join(dir,'plugins',id);fs.mkdirSync(plugin,{recursive:true});
 fs.cpSync(path.join(root,'plugins',id,'src'),path.join(plugin,'src'),{recursive:true});
 fs.copyFileSync(path.join(root,'plugins',id,'build.cjs'),path.join(plugin,'build.cjs'));
 const panel=path.join(plugin,'panel.tsx'),renderer=path.join(plugin,'src/renderers.ts');
 const run=(...args)=>spawnSync(process.execPath,[path.join(plugin,'build.cjs'),path.join(process.env.SELECTS_DEV_REPO||root,'node_modules/esbuild'),...args],{cwd:dir,encoding:'utf8',timeout:30000,env:{...process.env,SELECTS_DEV_REPO:process.env.SELECTS_DEV_REPO||root,PANEL_OUT:panel,PANEL_NAME:'a16z Style Captions'}});
 const read=()=>[panel,renderer].map(p=>fs.existsSync(p)?createHash('sha256').update(fs.readFileSync(p)).digest('hex'):null);
 return{plugin,panel,renderer,run,read};
}
for(const id of ['a16z-style-captions']){
test(`${id} check accepts current artifacts and rejects either stale output without writing`,t=>{
 const f=fixture(t,id),built=f.run();assert.equal(built.status,0,built.stdout+built.stderr);
 const original=f.read(),clean=f.run('--check');assert.equal(clean.status,0,clean.stdout+clean.stderr);assert.deepEqual(f.read(),original);
 for(const file of [f.panel,f.renderer]){
  fs.appendFileSync(file,'\n// deliberately stale artifact\n');const before=f.read(),stale=f.run('--check');
  assert.notEqual(stale.status,0);assert.match(stale.stdout+stale.stderr,/out.of.date/i);assert.deepEqual(f.read(),before,'check cannot repair stale artifacts');
  const repair=f.run();assert.equal(repair.status,0,repair.stdout+repair.stderr);assert.deepEqual(f.read(),original);
 }
});
test(`${id} build cannot publish half of a renderer/panel pair when compilation fails`,t=>{
 const f=fixture(t,id);assert.equal(f.run().status,0);const original=f.read();
 fs.appendFileSync(path.join(f.plugin,'src/motion/Look.tsx'),'\nexport const changedMotionSource = 1;\n');
 fs.appendFileSync(path.join(f.plugin,'src/Panel.tsx'),'\nexport const invalidSyntax = ;\n');
 const failed=f.run();assert.notEqual(failed.status,0);assert.deepEqual(f.read(),original,'compile every artifact before publishing either output');
});

}
