import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
const api=loadPanelModule(fs.readFileSync(new URL('../plugins/doac-style/panel.tsx',import.meta.url),'utf8'),{names:['runtimeSetup']});
test.after(()=>disposePanelModule(api));
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'doac-runtime-race-')),plugin=path.join(dir,'skills with spaces/doac-style');fs.mkdirSync(plugin,{recursive:true});
 const control=path.join(dir,'control');fs.mkdirSync(control);
 const childCode=`#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');const runtime=path.dirname(path.dirname(__filename)),control=process.env.DOAC_TEST_CONTROL,args=process.argv.slice(2);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 if(args[0]==='-c')process.exit(fs.existsSync(path.join(runtime,'ready'))?0:1);
 if(args[0]==='-m'&&args[1]==='pip'){
  const generation=fs.readFileSync(path.join(runtime,'generation'),'utf8');fs.writeFileSync(path.join(control,'installing'),'');
  await wait(250);
  if(!fs.existsSync(path.join(runtime,'generation'))||fs.readFileSync(path.join(runtime,'generation'),'utf8')!==generation){console.error('environment cleared while pip was installing');process.exit(73);}
  if(process.env.DOAC_TEST_FAIL==='1'){console.error('controlled pip failure');process.exit(42);}
  fs.writeFileSync(path.join(runtime,'ready'),'');process.exit(0);
 }
 process.exit(2);
})().catch(e=>{console.error(e);process.exit(2)});
`;
 const bootstrap=path.join(dir,"python bootstrap's fake");
 fs.writeFileSync(bootstrap,`#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');const runtime=process.argv.at(-1),control=process.env.DOAC_TEST_CONTROL;const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 let first=true;try{fs.mkdirSync(path.join(control,'first'))}catch{first=false;}
 fs.appendFileSync(path.join(control,'calls'),JSON.stringify(process.argv.slice(2))+'\\n');
 if(!first){const until=Date.now()+3000;while(!fs.existsSync(path.join(control,'installing'))&&Date.now()<until)await wait(5);}
 fs.rmSync(runtime,{recursive:true,force:true});fs.mkdirSync(path.join(runtime,'bin'),{recursive:true});
 fs.writeFileSync(path.join(runtime,'generation'),String(process.pid));fs.writeFileSync(path.join(runtime,'bin/python3'),${JSON.stringify(childCode)},{mode:0o755});
})().catch(e=>{console.error(e);process.exit(2)});
`,{mode:0o755});
 let command=api.runtimeSetup(bootstrap);
 // macOS executes the actual shipped lockf. Linux CI uses its equivalent OS
 // advisory-lock command at this single platform boundary, without changing setup.
 if(process.platform!=='darwin'){
  assert.equal(spawnSync('sh',['-c','command -v flock']).status,0,'native advisory flock is required on Linux CI');
  command=command.replace('/usr/bin/lockf -k -t 280','flock -w 280');
 }
 const run=(extra={})=>new Promise((resolve,reject)=>{
  const child=spawn('/bin/sh',['-c',command],{env:{...process.env,SELECTS_USER_SKILLS_ROOT:path.dirname(plugin),DOAC_TEST_CONTROL:control,...extra}});let stderr='';child.stderr.on('data',v=>stderr+=v);child.on('error',reject);child.on('close',code=>resolve({code,stderr}));
 });
 return {dir,plugin,control,run,calls:()=>fs.existsSync(path.join(control,'calls'))?fs.readFileSync(path.join(control,'calls'),'utf8').trim().split('\n').map(JSON.parse):[],cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('two actual concurrent cold setup shells create one environment and both succeed',async()=>{
 const f=fixture();try{const results=await Promise.all([f.run(),f.run()]);assert.deepEqual(results.map(r=>r.code),[0,0],JSON.stringify(results));assert.equal(f.calls().length,1);assert.ok(fs.existsSync(path.join(f.plugin,'.runtime/ready')));}finally{f.cleanup()}
});
test('a warm environment retains its interpreter and user-installed content',async()=>{
 const f=fixture();try{assert.equal((await f.run()).code,0);const runtime=path.join(f.plugin,'.runtime'),identity=fs.readFileSync(path.join(runtime,'generation'),'utf8');fs.writeFileSync(path.join(runtime,'preserve.txt'),'existing');assert.equal((await f.run()).code,0);assert.equal(f.calls().length,1);assert.equal(fs.readFileSync(path.join(runtime,'generation'),'utf8'),identity);assert.equal(fs.readFileSync(path.join(runtime,'preserve.txt'),'utf8'),'existing');}finally{f.cleanup()}
});
test('real setup failure reaches the caller and releases the lock for a later retry',async()=>{
 const f=fixture();try{const failure=await f.run({DOAC_TEST_FAIL:'1'});assert.equal(failure.code,42);assert.match(failure.stderr,/controlled pip failure/);assert.equal((await f.run()).code,0);assert.equal(f.calls().length,2);}finally{f.cleanup()}
});
