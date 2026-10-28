import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {loadPanelFunctions} from './windows_host.mjs';
import {checkScriptTypes} from './run_script_types.mjs';

const panel=fs.readFileSync(new URL('../plugins/place-count/panel.tsx',import.meta.url),'utf8');
const assembly=fs.readFileSync(new URL('../plugins/place-count/assemble-base.js',import.meta.url),'utf8');
const globals=panel.slice(panel.indexOf('const VERSION='),panel.indexOf('function Poster('));

test('template reaches the canonical inventory without an obsolete named capability query',async()=>{
 const calls=[];
 const sdk={call:async name=>{calls.push(name);throw Error('Panel call is not allowed: '+name);}};
 const api=loadPanelFunctions(panel,['runTemplate','issue','newStory','TEMPLATE_ERROR','commonFolder','withinPlaceLimit','openFrameSize'],{
  VERSION:1,uid:()=> 'run',norm:s=>s,VIDEO:/\.mp4$/i,ASSETS:[],
  storySteps:()=>({assist:async()=>{},buildDraft:async()=>({sequenceId:'saved-draft'})}),
  fullProjectInventory:async()=>[{resourceId:'r0',type:'video',path:'/trip/clip.mp4'}],
  templatePlaces:async()=>[{files:[]}],storyPlace:()=>({included:true}),
  planStory:()=>({}),offlineSources:async()=>false,english:(v,f)=>v||f,
 });
 const result=await api.runTemplate({sdk,context:{projectId:'p',template:{inputs:{footage:[{kind:'video',resourceId:'r0'}]}}},live:()=>true,progress:()=>{}});
 assert.equal(result,'saved-draft');assert.deepEqual(calls,[]);
});

test('workspace becomes ready through assets and inventory when the obsolete query is unavailable',async()=>{
 const effects=[],calls=[],support=[];
 const sdk={storage:{getItem:async()=>null},call:async name=>{calls.push(name);throw Error('Panel call is not allowed: '+name);}};
 const main=panel.slice(panel.indexOf('function PlaceCountWorkspace('),panel.indexOf(' React.useLayoutEffect(',panel.indexOf('function PlaceCountWorkspace(')))+'return null;}';
 const box=vm.createContext({TextEncoder,TextDecoder,Uint8Array,setTimeout,clearTimeout,console,
  useAppUpdateGuard:()=>{},panelLocalClient:s=>s,
  useState:value=>{const v=typeof value==='function'?value():value;return [v,next=>{if(v&&typeof v==='object'&&'ready' in v)support.push(next);}];},
  useRef:value=>({current:value}),useEffect:fn=>effects.push(fn),
 });
 vm.runInContext(globals+'\n'+main+'\nassetSource=async()=>"asset";fullProjectInventory=async()=>[];writeJSON=async()=>{};getFS=()=>({join:()=>"inventory"});dataRoot=()=>"cache";storySteps=()=>({});globalThis.workspace=PlaceCountWorkspace;',box);
 box.workspace({sdk,context:{projectId:'p'}});effects[0]();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(support.at(-1)?.ready,true);assert.deepEqual(calls,[]);
});

function assemblyFixture(missing,strictHandle=false){
 const events=[],clips=[];
 const cfg={projectId:'p',draftName:'Trip',sequenceId:null,recoverOnly:false,sourceFiles:[{path:'/trip/a.mp4',type:'video',resourceId:'r0',durationSeconds:8,frameSize:{width:1920,height:1080}}],segments:[{path:'/trip/a.mp4',start:0,end:2,place:0,cropX:.5,cropY:.5}],places:[{name:'A'}],frameSize:{width:720,height:1280}};
 const d={meta:async()=>({fps:30,frameSize:cfg.frameSize}),clips:async()=>clips,
  insertResource:async()=>{events.push('insert');clips.push({resourceId:'r0',clipId:1,startFrame:0,endFrame:60});},
  setFrameSize:async()=>events.push('canvas'),setClipTransform:async()=>events.push('transform'),
  rangeAtFrames:async()=>{},addMotionGraphic:async()=>events.push('graphic'),
  commitAll:async()=>{events.push('commit');return {createdDraftId:'saved-draft'};},
 };
 if(missing)delete d[missing];
 const handle=strictHandle?new Proxy(d,{get(target,key){if(key==='then')return undefined;if(key in target)return target[key];throw Error('Unknown method '+String(key));}}):d;
 const p={meta:async()=>({draftIds:[]}),createDraft:async()=>{events.push('working-copy');return handle;}};
 const script=assembly.replace('__CONFIG__',()=>JSON.stringify(cfg));
 const run=()=>vm.runInNewContext('(async()=>{'+script+'})()',{selects:{project:()=>p,draft:()=>d}});
 return {run,events,script};
}
for(const method of ['addMotionGraphic','rangeAtFrames'])test(`missing ${method} is reported before any source edit or saved Draft`,async()=>{
 const f=assemblyFixture(method),result=await f.run();
 assert.equal(result.unsupportedAuthoring,true);
 assert.deepEqual(Array.from(result.missingMethods),[method]);
 assert.deepEqual(f.events,['working-copy']);
});
for(const method of ['addMotionGraphic','rangeAtFrames'])test(`the SDK corrective-error proxy safely reports missing ${method}`,async()=>{
 const f=assemblyFixture(method,true),result=await f.run();
 assert.equal(result.unsupportedAuthoring,true);assert.deepEqual(Array.from(result.missingMethods),[method]);
 assert.deepEqual(f.events,['working-copy']);
});
test('a capable SDK still assembles the original editable source Draft',async()=>{
 const f=assemblyFixture(),result=await f.run();
 assert.equal(result.sequenceId,'saved-draft');assert.equal(result.clipCount,1);
 assert.deepEqual(f.events,['working-copy','insert','canvas','transform','commit']);
});
test('the generated assembly script typechecks with the installed SDK',()=>{
 assert.equal(checkScriptTypes([{name:'Place Count assembly',script:assemblyFixture().script}]).scripts,1);
});

test('the shared story runner exposes a capability failure as an update requirement',async()=>{
 const api=loadPanelFunctions(panel,['storySteps','issue'],{bindLocalSdk:()=>{}});
 const steps=api.storySteps({sdk:{runScript:async()=>({result:{unsupportedAuthoring:true,missingMethods:['addMotionGraphic']}})},assets:{},get:()=>({}),update:()=>{},check:()=>{},progress:()=>{},stopped:()=>false,live:()=>true});
 await assert.rejects(steps.run('Assemble editable story','test',true),error=>error.code==='HOST_CAPABILITY'&&/Update Selects/.test(error.publicMessage)&&error.noDraftSaved===true);
});

test('known unsupported authoring does not leave a false uncertain-save checkpoint',async()=>{
 const file={resourceId:'r0',type:'video',path:'/trip/a.mp4'},configs=[];
 let story={title:'Trip',folder:'/trip',settings:{aspect:'portrait'},places:[]};
 const api=loadPanelFunctions(panel,['storySteps','issue'],{bindLocalSdk:()=>{},uid:()=> 'run',norm:s=>s,leaf:s=>s,english:(v,f)=>v||f,
  fullProjectInventory:async()=>[file],planStory:()=>({segments:[{path:file.path}],places:[]}),
 });
 const sdk={runScript:async({summary,script})=>{
  if(summary==='Read draft names')return {result:[]};
  assert.equal(summary,'Assemble editable story');configs.push(JSON.parse(script));
  return {result:{unsupportedAuthoring:true,missingMethods:['addMotionGraphic']}};
 }};
 const steps=api.storySteps({sdk,assets:{'assemble-base.js':'__CONFIG__'},get:()=>story,update:fn=>{story=fn(story);},check:()=>{},progress:()=>{},stopped:()=>false,live:()=>true});
 for(let attempt=0;attempt<2;attempt++){
  await assert.rejects(steps.buildDraft({pid:'p'}),error=>error.code==='HOST_CAPABILITY');
  assert.equal(story.job.status,'interrupted');assert.equal(story.job.assemblyPending,false);
 }
 assert.deepEqual(configs.map(c=>c.recoverOnly),[false,false]);
});

test('browser preview owns its blob URL and releases it without revoking the host URL',async()=>{
 const revoked=[];let blob;
 const bytes=new Uint8Array([1,2,3]);
 const api=loadPanelFunctions(panel,['previewSource'],{
  localPlatform:'web',
  getFS:()=>({pathToLocalURL:async()=> 'blob:host/source',readFile:async()=>bytes}),
  Blob,URL:{createObjectURL:value=>{blob=value;return 'blob:panel/source';},revokeObjectURL:url=>revoked.push(url)},
 });
 const source=await api.previewSource('/clip.mp4');
 assert.equal(source.url,'blob:panel/source');
 assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),bytes);
 source.release();assert.deepEqual(revoked,['blob:panel/source']);
});

test('recovery leaves already finished typography and audio unchanged',async()=>{
 const cfg={projectId:'p',sequenceId:'saved',sourceAudio:false,music:null,regions:[{place:0,startFrame:0,endFrame:60}]};
 const clips=[{trackKind:'main',startFrame:0,endFrame:60},{trackKind:'video',resourceId:null,startFrame:0,endFrame:60},{trackKind:'audio',startFrame:0,endFrame:60}];
 const d={clips:async()=>clips,rangeAtFrames:async()=>({}),setAudioTracks:async()=>({opCount:0}),meta:async()=>({fps:30}),commitAll:async()=>{throw Error('No working-copy edits to commit');}};
 const selects={project:()=>({meta:async()=>({draftIds:['saved']})}),draft:()=>d};
 for(const file of ['apply-design.js','finish-draft.js']){
  const script=fs.readFileSync(new URL('../plugins/place-count/'+file,import.meta.url),'utf8').replace('__CONFIG__',JSON.stringify(cfg));
  const result=await vm.runInNewContext('(async()=>{'+script+'})()',{selects});
  assert.equal(result.sequenceId,'saved');
 }
});

for (const platform of ['desktop','web']) test(`${platform} place analysis keeps its host concurrency`,()=>{
 const select=vm.runInNewContext(panel.match(/const assistConcurrency=.*?;/)[0]+'assistConcurrency');
 assert.equal(select(platform),platform==='web'?1:4);
});
test('desktop preview retains the native URL without reading the whole video',async()=>{
 const api=loadPanelFunctions(panel,['previewSource'],{localPlatform:'desktop',
  getFS:()=>({pathToLocalURL:async()=> 'file:///clip.mp4',readFile:()=>{throw Error('Unexpected copy');}}),
 });
 const source=await api.previewSource('/clip.mp4');assert.equal(source.url,'file:///clip.mp4');source.release();
});
