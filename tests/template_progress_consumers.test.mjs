import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {loadPanelModule} from './panel_module_fixture.mjs';
const modules=process.env.SBS_PANEL_TEST_MODULES||process.env.AI_PANEL_TEST_MODULES;if(!modules)throw Error('Set SBS_PANEL_TEST_MODULES to existing React/react-dom/jsdom dependencies.');
const dependency=createRequire(path.resolve(modules,'../package.json'));const React=dependency('react'),{createRoot}=dependency('react-dom/client'),{JSDOM}=dependency('jsdom');
const ids=['jude-kinetic-style','chris-williamson-style','doac-style','depth-type-captions'];
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
async function fixture(t,id){
 const dom=new JSDOM('<div id="root"></div>'),previous={};for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){previous[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
 let now=0,nextTimer=0,generations=0,report,removed=false;const activeTimers=new Map(),pending=defer(),finishes=[],calls=[],stored=new Map(),root=createRoot(document.getElementById('root'));
 const clock={now:()=>now,setInterval(fn){const id=++nextTimer;activeTimers.set(id,fn);return id;},clearInterval:id=>activeTimers.delete(id)};
 const environment={platform:'darwin',homedir:'/qa',version:'2.0.700'};
 const sdk={storage:{getItem:async key=>stored.get(key)??null,setItem:async(key,value)=>stored.set(key,value)},finishTemplate:r=>finishes.push(JSON.parse(JSON.stringify(r))),runScript:async input=>{calls.push(input);if(input.script.includes('selects.files.environment('))return {result:environment};if(input.summary==="Read the draft's length")return {result:{seconds:2}};if(input.summary==='Frame Depth Type template to portrait')return {result:true};throw Error('Unexpected SDK boundary: '+input.summary);}};
 const pipeline=callback=>{generations++;report=callback;report('Measuring the speaker framing…');return pending.promise;};
 const overrides=id==='depth-type-captions'?{depthMakeCaptions:({progress})=>pipeline(progress)}:id==='doac-style'?{runCaptionTemplate:({onStatus})=>pipeline(onStatus)}:{pluginPaths:async()=>({plugin:'/qa',data:'/qa'}),templatePaths:async()=>({plugin:'/qa',data:'/qa'}),panelEnv:(_sdk,_paths,onStatus)=>({status:onStatus,writeText:async()=>{},dataDir:'/qa',pluginDir:'/qa'}),runPipeline:env=>pipeline(env.status),notifyTemplateIssues:async()=>null};
 // Only existing expensive generation/package boundaries are held. All component,
 // progress, SDK-adapter, clock and finish implementations come from the full panel.
 for(const name of Object.keys(overrides))if(!fs.readFileSync(new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8').includes('function '+name+'('))delete overrides[name];
 const source=fs.readFileSync(new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8');const component=id==='depth-type-captions'?'DepthTemplateRun':'TemplateRun';
 const api=loadPanelModule(source,{names:[component,'createPanelLocalClient','panelLocalClients','hostUseSdk'],React,overrides,globals:{performance:{now:clock.now},setInterval:clock.setInterval,clearInterval:clock.clearInterval}});
 const local=await api.createPanelLocalClient(sdk);api.panelLocalClients.set(sdk,{...sdk,...local});api.hostUseSdk(sdk);
 const context={projectId:'qa-project',template:{runId:'run-a',libraryId:'qa-library',inputs:{speaker:[{kind:'timeline',sequenceId:'qa-draft'}]}}};
 const render=async()=>React.act(async()=>root.render(React.createElement(api[component],{sdk,context})));
 const advance=async seconds=>React.act(async()=>{now+=seconds*1000;for(const fn of activeTimers.values())fn();});
 const update=async value=>React.act(async()=>report(value));
 const remove=async()=>{if(!removed){removed=true;await React.act(async()=>root.unmount());}};
 t.after(async()=>{await remove();assert.equal(activeTimers.size,0);dom.window.close();for(const [key,value]of Object.entries(previous))value?Object.defineProperty(globalThis,key,value):delete globalThis[key];});
 const finish=async(fail=false)=>React.act(async()=>{if(fail)pending.reject(Error('Controlled generation failed.'));else pending.resolve(id==='depth-type-captions'?{savePlan:[],files:null,around:0,result:{owned:{clipId:1}}}:id==='doac-style'?{job:{targetId:'qa-draft'}}:{draftId:'qa-draft',warnings:[],jobDir:'/qa'});});
 return {render,advance,update,finish,remove,finishes,calls,get generations(){return generations;},get timers(){return activeTimers.size;},get text(){return document.body.textContent;}};
}
for(const id of ids){
 test(id+': whole TemplateRun renders real callback changes without extra generation or SDK work',async t=>{
  const f=await fixture(t,id);await f.render();assert.equal(f.generations,1);assert.match(f.text,/Current step: Measuring the speaker framing/);const before=f.calls.length;await f.advance(121);await f.update('Measuring the speaker framing…');assert.match(f.text,/121 s ago/);assert.match(f.text,/Completion has not been confirmed/);await f.update('Placing captions around the speaker…');assert.match(f.text,/0 s ago/);assert.doesNotMatch(f.text,/No new step/);await f.render();assert.equal(f.generations,1);assert.equal(f.calls.length,before);await f.finish();assert.deepEqual(f.finishes,[{sequenceId:'qa-draft'}]);assert.equal(f.timers,0);assert.match(f.text,/Done/);assert.doesNotMatch(f.text,/s ago/);
 });
 test(id+': terminal failure and frame removal clean presentation timers without retries',async t=>{
  const f=await fixture(t,id);await f.render();await f.finish(true);assert.equal(f.generations,1);assert.equal(f.finishes.length,1);assert.equal('sequenceId' in f.finishes[0],false);assert.equal(f.timers,0);assert.match(f.text,/Run finished/);await f.advance(300);assert.equal(f.finishes.length,1);assert.doesNotMatch(f.text,/No new step/);
 });
 test(id+': Stop/unmount clears the read-only view timer and starts no additional work',async t=>{
  const f=await fixture(t,id);await f.render();const before=f.calls.length;assert.equal(f.timers,1);await f.remove();await f.advance(300);assert.equal(f.timers,0);assert.equal(f.generations,1);assert.equal(f.calls.length,before);
 });
}

test('the official Chris builder preserves the canonical progress block and complete generated panel',async()=>{
 const {default:os}=await import('node:os');const{spawnSync}=await import('node:child_process');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'chris-progress-build-')),original=new URL('../plugins/chris-williamson-style/',import.meta.url);
 try{
  fs.copyFileSync(new URL('build.py',original),path.join(folder,'build.py'));fs.cpSync(new URL('src/',original),path.join(folder,'src'),{recursive:true});fs.mkdirSync(path.join(folder,'fonts'));
  for(const name of ['font.css','inter.woff2']){const file=new URL('fonts/'+name,original);if(fs.existsSync(file))fs.copyFileSync(file,path.join(folder,'fonts',name));}
  const result=spawnSync('python3',[path.join(folder,'build.py'),path.join(folder,'official-output.tsx')],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  assert.equal(fs.readFileSync(path.join(folder,'official-output.tsx'),'utf8'),fs.readFileSync(new URL('panel.tsx',original),'utf8'));
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
