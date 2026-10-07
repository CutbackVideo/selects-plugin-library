import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {panelSource, topLevel} from './windows_host.mjs';

const source=panelSource('depth-type-captions');
const resourceId='11111111-1111-4111-8111-111111111111';
const preview={path:'/render/source.mp4',sourceKey:'composition-v1',duration:2,fps:30,width:1080,height:1920};
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture({failure,wait=false}={}) {
  const events=[];
  let ready;
  const started=new Promise(resolve=>{ready=resolve});
  const client={
    run:async(request,options)=>{
      events.push(['run',plain(request),options.identity,options.retryTerminal]);
      options.onProgress({status:'running',step:'Infer alpha'});
      ready();
      if(failure)throw failure;
      if(wait)await new Promise((resolve,reject)=>{
        const abort=()=>reject(Object.assign(new Error('Observation detached'),{code:'SHARED_AI_DETACHED'}));
        if(options.signal.aborted)abort();else options.signal.addEventListener('abort',abort,{once:true});
      });
      return {result:{files:{manifest:{id:'owned-matte',name:'matte.json'}}}};
    },
    cancel:async(options)=>events.push(['cancel',plain(options)]),
  };
  const globals={AbortController,
    hostUseSdk:()=>{},hostSdk:{files:{join:(...p)=>p.join('/')}},
    importSharedAiVideo:async(sdk,pid,path)=>{events.push(['source',pid,path]);return resourceId;},
    videoAiClient:(sdk,pid,scope)=>{events.push(['client',pid,scope]);return client;},
    prepareSharedAiVideoFrames:async(sdk,pid,artifact,folder,expected)=>{
      events.push(['adopt',pid,plain(artifact),folder,plain(expected)]);
      return {count:60,width:1080,height:1920,pattern:'/masks/alpha/frame_%06d.png'};
    },
    depthWriteSharedMasks:async(sdk,preview,settings,job,progress,control,prepared)=>{
      events.push(['write',plain(prepared)]);return {count:prepared.count};
    },
  };
  const api=vm.runInNewContext(topLevel(source,'depthSubject')+'\n'+topLevel(source,'depthPrepareMasks')+'\n({depthPrepareMasks});',globals);
  return {events,started,run:control=>api.depthPrepareMasks({},preview,{subject:'foreground'},{dir:'/masks'},text=>events.push(['progress',text]),control,'project')};
}
test('Depth uses the rendered composition Resource and adopts its exact frame clock before postprocessing',async()=>{
  const f=fixture(),control={retryAi:true};
  assert.deepEqual(plain(await f.run(control)),{count:60});
  const request=f.events.find(e=>e[0]==='run');
  assert.deepEqual(request,['run',{task:'person.matte',resourceId,sourceRange:{startSeconds:0,endSeconds:2},options:{downsampleRatio:.25,alphaEncoding:'grayscale-png-8bit',outputMode:'alpha-frames'}},'composition-v1:foreground',true]);
  assert.deepEqual(f.events.find(e=>e[0]==='adopt').slice(1),['project',{id:'owned-matte',name:'matte.json'},'/masks/alpha',{resourceId,width:1080,height:1920,fps:30,frames:60}]);
  assert.ok(f.events.findIndex(e=>e[0]==='adopt')<f.events.findIndex(e=>e[0]==='write'));
  assert.equal(control.stop,null);assert.equal(control.cancelAi,null);
});
test('a shared model failure stops Depth before adopting or writing masks',async()=>{
  const f=fixture({failure:Object.assign(new Error('Model failed'),{code:'SHARED_AI_FAILED'})}),control={};
  await assert.rejects(f.run(control),{code:'SHARED_AI_FAILED'});
  assert.equal(f.events.some(e=>e[0]==='adopt'||e[0]==='write'),false);
  assert.equal(control.stop,null);assert.equal(control.cancelAi,null);
});
test('Depth detach preserves inference; explicit Cancel addresses the exact shared identity',async()=>{
  for(const explicit of [false,true]){
    const f=fixture({wait:true}),control={};
    const result=f.run(control);await f.started;
    if(explicit)await control.cancelAi();
    control.stop();await assert.rejects(result,{code:'SHARED_AI_DETACHED'});
    assert.deepEqual(f.events.filter(e=>e[0]==='cancel'),explicit?[['cancel',{identity:'composition-v1:foreground'}]]:[]);
    assert.equal(f.events.some(e=>e[0]==='write'),false);
    assert.equal(control.stop,null);assert.equal(control.cancelAi,null);
  }
});
