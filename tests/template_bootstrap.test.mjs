import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import test from 'node:test';
const modules=process.env.SBS_PANEL_TEST_MODULES;
if(!modules)throw Error('Set SBS_PANEL_TEST_MODULES to the React/esbuild/jsdom dependency directory.');
const dep=createRequire(path.resolve(modules,'../package.json'));
const React=dep('react'),{createRoot}=dep('react-dom/client'),{JSDOM}=dep('jsdom'),esbuild=dep('esbuild');
const sources=['shared','no14-still-video','camera-shutter-dump','a16z-style-captions','four-photo-stop-motion'];
const context=(runId='run-a')=>({projectId:'project',language:'en',template:{runId,libraryId:'library'}});
async function harness(t,source='shared'){
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'}),previous={};
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){
  previous[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
 }
 const file=source==='shared'?'shared/local-client.ts':'plugins/'+source+'/panel.tsx';
 const code=esbuild.transformSync(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{loader:'tsx',format:'cjs',target:'es2022',jsx:'automatic'}).code;
 const module={exports:{}},timers=new Map(),childSdks=[];let timerId=0,children=0,removed=false;
 new Function('require','module','exports','setTimeout','clearTimeout',code)(dep,module,module.exports,(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},id=>timers.delete(id));
 const Child=props=>{children++;childSdks.push(props.sdk);return React.createElement('p',null,'Connected child');};
 const Component=source==='shared'?module.exports.withPanelLocalClient(Child):module.exports.default;
 const root=createRoot(document.getElementById('root'));
 const render=async(props,{strict=false}={})=>React.act(async()=>{root.render(strict?React.createElement(React.StrictMode,null,React.createElement(Component,props)):React.createElement(Component,props));});
 const fireTimeouts=async()=>React.act(async()=>{for(const {fn} of [...timers.values()])fn();});
 const settle=async action=>React.act(async()=>{await action();});
 const remove=async()=>{if(!removed){removed=true;await React.act(async()=>root.unmount());}};
 t.after(async()=>{await remove();dom.window.close();for(const [key,value] of Object.entries(previous)){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
 return {render,fireTimeouts,settle,timers,remove,childSdks,get children(){return children;},get text(){return document.body.textContent;},api:module.exports};
}
function host(response){
 const calls=[],finished=[];
 const sdk={runScript:async input=>{calls.push(input);return response(input);},finishTemplate:result=>{finished.push(result);}};
 return {sdk,calls,finished};
}
for(const source of sources)for(const failure of ['throw','reported-error','incomplete'])test(source+': hidden run reports failed initialization instead of hanging ('+failure+')',async t=>{
 const h=await harness(t,source),f=host(()=>{if(failure==='throw')throw Error('private /user/project TOKEN=secret');if(failure==='reported-error')return {isError:true,output:'private /user/project TOKEN=secret'};return {result:{}};});
 await h.render({sdk:f.sdk,context:context()});
 assert.equal(f.finished.length,1,'the hidden template must finish when its SDK cannot initialize');
 assert.equal(typeof f.finished[0].error,'string');assert.ok(f.finished[0].error.length>0);
 assert.doesNotMatch(f.finished[0].error,/private|TOKEN|secret/);assert.doesNotMatch(h.text,/private|TOKEN|secret/);
 assert.equal(h.children,0);assert.ok(f.calls.every(call=>call.allowCommit===false));
});
const environment={platform:'darwin',homedir:'/user',tempDirectory:'/tmp',version:'test'};
for(const source of sources){
 test(source+': a hung bootstrap reports one timeout and ignores its late success',async t=>{
  const h=await harness(t,source);let resolve;
  const f=host(()=>new Promise(r=>{resolve=r;}));await h.render({sdk:f.sdk,context:context()});
  assert.equal(f.finished.length,0);assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].ms,30000);
  await h.fireTimeouts();assert.equal(f.finished.length,1);assert.match(f.finished[0].error,/took too long/);
  await h.settle(()=>resolve({result:environment}));assert.equal(f.finished.length,1);assert.equal(f.calls.length,1);assert.equal(h.children,0);
  if(source==='shared')assert.throws(()=>h.api.panelLocalClient(f.sdk),/not initialized/);
 });
 test(source+': standalone failure renders a safe alert without completing a template',async t=>{
  const h=await harness(t,source),f=host(()=>{throw Error('private secret /workspace/project');});
  await h.render({sdk:f.sdk,context:{projectId:'project'}});assert.equal(f.finished.length,0);assert.match(h.text,/Could not connect/);assert.doesNotMatch(h.text,/private|secret/);assert.equal(h.children,0);
 });
 test(source+': StrictMode and rerender do not duplicate the failure completion',async t=>{
  const h=await harness(t,source),f=host(()=>({isError:true,output:'offline'}));
  await h.render({sdk:f.sdk,context:context()},{strict:true});assert.equal(f.finished.length,1);
  await h.render({sdk:f.sdk,context:context()},{strict:true});assert.equal(f.finished.length,1);assert.ok(f.calls.every(c=>!c.allowCommit));
 });
 test(source+': a replaced SDK cannot report its late connection failure',async t=>{
  const h=await harness(t,source);let reject;
  const old=host(()=>new Promise((_r,r)=>{reject=r;})),next=host(()=>({isError:true,output:'new SDK offline'}));
  await h.render({sdk:old.sdk,context:context()});await h.render({sdk:next.sdk,context:context()});
  assert.equal(next.finished.length,1);await h.settle(()=>reject(Error('old SDK offline')));
  assert.equal(old.finished.length,0);assert.equal(next.finished.length,1);
 });
 test(source+': a replaced run cannot report its late connection failure',async t=>{
  const h=await harness(t,source);let reject,reads=0;
  const f=host(()=>++reads===1?new Promise((_r,r)=>{reject=r;}):{isError:true,output:'offline'});
  await h.render({sdk:f.sdk,context:context('old')});await h.render({sdk:f.sdk,context:context('new')});
  assert.equal(f.finished.length,1);await h.settle(()=>reject(Error('old run offline')));assert.equal(f.finished.length,1);assert.equal(reads,2);
 });
 for(const target of ['Project','library'])test(source+': changed '+target+' ownership does not inherit an old bootstrap failure',async t=>{
  const h=await harness(t,source);let reject,reads=0;
  const f=host(()=>++reads===1?new Promise((_r,r)=>{reject=r;}):{isError:true,output:'offline'}),before=context('same-run');
  const after=target==='Project'?{...before,projectId:'next-project'}:{...before,template:{...before.template,libraryId:'next-library'}};
  await h.render({sdk:f.sdk,context:before});await h.render({sdk:f.sdk,context:after});
  assert.equal(f.finished.length,1);await h.settle(()=>reject(Error('old target offline')));assert.equal(f.finished.length,1);assert.equal(reads,2);assert.equal(h.children,0);
 });
 for(const transport of ['throw','reject'])test(source+': completion transport '+transport+' is contained without replay',async t=>{
  const h=await harness(t,source),f=host(()=>({isError:true,output:'offline'}));let reports=0;
  f.sdk.finishTemplate=()=>{reports++;if(transport==='throw')throw Error('private reply');return Promise.reject(Error('private reply'));};
  await h.render({sdk:f.sdk,context:context()});await h.render({sdk:f.sdk,context:context()});assert.equal(reports,1);assert.doesNotMatch(h.text,/private/);
 });
}
test('successful bootstrap preserves the public SDK identity and clears its private binding on unmount',async t=>{
 const h=await harness(t),f=host(()=>({result:environment}));await h.render({sdk:f.sdk,context:context()});
 assert.ok(h.children>0);assert.ok(h.childSdks.every(sdk=>sdk===f.sdk));assert.equal(f.sdk.files,undefined);assert.ok(h.api.panelLocalClient(f.sdk).files);assert.equal(h.timers.size,0);assert.equal(f.finished.length,0);
 await h.remove();assert.throws(()=>h.api.panelLocalClient(f.sdk),/not initialized/);
});
test('an unmounted wrapper cannot bind or report a late successful connection',async t=>{
 const h=await harness(t);let resolve;const f=host(()=>new Promise(r=>{resolve=r;}));
 await h.render({sdk:f.sdk,context:context()});await h.remove();await h.settle(()=>resolve({result:environment}));
 assert.equal(h.children,0);assert.equal(f.finished.length,0);assert.equal(h.timers.size,0);assert.throws(()=>h.api.panelLocalClient(f.sdk),/not initialized/);
});
test('an explicit new run can reconnect after a previous bootstrap failure',async t=>{
 const h=await harness(t);let ready=false;const f=host(()=>ready?{result:environment}:{isError:true,output:'offline'});
 await h.render({sdk:f.sdk,context:context('failed')});assert.equal(f.finished.length,1);
 ready=true;await h.render({sdk:f.sdk,context:context('retry')});assert.ok(h.children>0);assert.equal(f.finished.length,1);
});
