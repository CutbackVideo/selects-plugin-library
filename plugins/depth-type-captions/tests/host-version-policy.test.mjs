import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelModule} from '../../../tests/panel_module_fixture.mjs';
const source=fs.readFileSync(new URL('../panel.tsx',import.meta.url),'utf8');
const missingFeature='selects.export.inspectComposition is not a function';
const plain=x=>JSON.parse(JSON.stringify(x));
async function fixture(version,{featureError=missingFeature}={}){
 const effects=[],states=[],calls=[],finishes=[],storageWrites=[],stored=new Map();
 const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:v=>[typeof v==='function'?v():v,x=>states.push(x)],useRef:v=>({current:v}),useEffect:f=>effects.push(f)};
 const api=loadPanelModule(source,{React,names:['createPanelLocalClient','panelLocalClients','hostUseSdk','depthHostProblem','depthRequireHost','DepthTemplateRun','DEPTH_DEFAULTS','depthMakeCaptions']});
 const sdk={storage:{getItem:async k=>stored.get(k)??null,setItem:async(k,v)=>{storageWrites.push([k,v]);stored.set(k,v);}},finishTemplate:r=>finishes.push(plain(r)),runScript:async input=>{
  calls.push(plain(input));
  if(input.script.includes('selects.files.environment('))return {result:{platform:'darwin',homedir:'/qa',tempDirectory:'/qa/tmp',...(version===undefined?{}:{version})}};
  if(input.summary==="Read the draft's length")return {result:{seconds:2}};
  if(input.summary==='Read dialogue for Depth Type captions')return {result:{name:'Plain source',projectName:'QA',fps:30,width:1080,height:1920,duration:2,words:['This','is','one','complete','spoken','sentence'].map((text,i)=>({text,s:i*10,e:(i+1)*10}))}};
  if(input.summary==='Inspect speaker render composition')return {isError:true,output:featureError};
  throw Error('Unexpected SDK boundary: '+input.summary);
 }};
 const local=await api.createPanelLocalClient(sdk);
 // Register the actual canonical SDK adapter exactly as withPanelLocalClient does.
 api.panelLocalClients.set(sdk,{...sdk,...local});api.hostUseSdk(sdk);
 return {api,sdk,effects,states,calls,finishes,storageWrites,tree:()=>api.DepthTemplateRun({sdk,context:{projectId:'qa-project',template:{runId:'qa-run',libraryId:'qa-library',inputs:{speaker:[{kind:'timeline',sequenceId:'qa-draft'}]}}}}),async run(){const tree=this.tree();for(const effect of effects)effect();for(let i=0;i<100&&!finishes.length;i++)await new Promise(r=>setImmediate(r));assert.equal(finishes.length,1);return tree;}};
}
for(const version of [undefined,null,'','unknown','2.bad.700','2.0','2.0.700 trailing','9007199254740992.0.0'])test('unknown host is nonblocking and is not described as an old app: '+String(version),async()=>{
 const f=await fixture(version);assert.equal(f.api.depthHostProblem(),'');assert.doesNotThrow(()=>f.api.depthRequireHost());
 const tree=await f.run();assert.match(JSON.stringify(tree),/Could not verify the Selects version/);
 assert.equal(f.calls.filter(c=>c.summary==='Inspect speaker render composition').length,1,'attempt the existing feature instead of guessing from version');
 assert.deepEqual(f.finishes,[{error:'Depth Type Captions could not make the captioned timeline. Try again.'}]);
 assert.equal(f.calls.some(c=>c.summary==='Apply Depth Type captions'),false);
 assert.equal(f.storageWrites.some(([,v])=>JSON.parse(v).owned),false,'no false caption-save completion');
});
for(const version of ['2.0.507','1.99.999'])test('known old host blocks before AI or any persisted write: '+version,async()=>{
 const f=await fixture(version);assert.match(f.api.depthHostProblem(),/Behind speaker needs Selects 2.0.508/);assert.throws(()=>f.api.depthRequireHost(),/Behind speaker needs/);
 await f.run();await assert.rejects(f.api.depthMakeCaptions({sdk:f.sdk,pid:'qa-project',sid:'qa-draft',settings:f.api.DEPTH_DEFAULTS,control:{},progress:()=>{}}),/Behind speaker needs/);assert.equal(f.calls.filter(c=>!c.script.includes('selects.files.environment(')).length,0);assert.equal(f.storageWrites.length,0);assert.equal(f.finishes.length,1);assert.ok(f.finishes[0].error);assert.equal('sequenceId' in f.finishes[0],false);
});
for(const version of ['2.0.508','2.0.671','3.0.0','2.0.700-beta.1'])test('known supported host retains the existing feature-error path: '+version,async()=>{
 const f=await fixture(version);assert.equal(f.api.depthHostProblem(),'');assert.doesNotThrow(()=>f.api.depthRequireHost());const tree=await f.run();assert.doesNotMatch(JSON.stringify(tree),/Could not verify/);
 assert.equal(f.calls.filter(c=>c.summary==='Inspect speaker render composition').length,1);assert.equal('sequenceId' in f.finishes[0],false);
});
test('unknown classification does not swallow the original SDK failure or mark the template successful',async()=>{
 const f=await fixture(undefined,{featureError:'The speaker composition capability failed.'});
 await f.run();assert.equal(f.finishes.length,1);assert.equal('sequenceId' in f.finishes[0],false);assert.equal(f.calls.filter(c=>c.allowCommit).length,0,'feature failure must not change the canvas or save captions');
 await assert.rejects(f.api.depthMakeCaptions({sdk:f.sdk,pid:'qa-project',sid:'qa-draft',settings:f.api.DEPTH_DEFAULTS,control:{},progress:()=>{}}),{message:'The speaker composition capability failed.'});
 assert.equal(f.finishes.length,1,'a failed direct pipeline cannot synthesize another completion');
});
