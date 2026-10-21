import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import test from 'node:test';
import {checkScriptTypes} from './run_script_types.mjs';
const {buildScript}=await import(process.env.GALLERY_OPERATION_BUILDER || new URL('../plugins/photo-gallery-no2/operation-builder.mjs',import.meta.url));
const require=createRequire(import.meta.url);
const esbuild=require(process.env.SELECTS_ESBUILD||(process.env.SBS_PANEL_TEST_MODULES?process.env.SBS_PANEL_TEST_MODULES+'/esbuild':'esbuild'));
const videoSlots=new Set([4,6,11,17,19,21]);
const asyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const compiled=new Map();
function fixture({fault=null,minify=false}={}){
 const media=Array.from({length:21},(_,i)=>({resourceId:'r'+i,name:'Tile '+(i+1),path:'/gallery/'+i+(videoSlots.has(i+1)?'.mp4':'.png'),kind:videoSlots.has(i+1)?'video':'image',width:640,height:960,durationFrames:1800}));
 const resources=media.map(m=>({resourceId:m.resourceId,name:m.name,type:m.kind==='image'?'Image':'Video',durationSeconds:30}));
 const nodes=media.map(m=>({...m,type:m.kind,frameSize:{width:m.width,height:m.height},durationSeconds:30}));
 const fileCalls=[],requests=[],writes=[],finishes=[],hooks={};let reads=0,version=1,finish;
 const files={stat:async path=>{fileCalls.push(['stat',path]);if(path===media[0].path){if(fault==='missing')return null;if(fault==='unknown')throw Error('private transport detail');if(fault==='directory')return {size:32,isDirectory:true,mtimeMs:version};if(fault==='empty')return {size:0,isDirectory:false,mtimeMs:version};}return {size:32,isDirectory:false,mtimeMs:version,ino:1};},
  readRange:async({path,offset,length})=>{fileCalls.push(['readRange',path,offset,length]);assert.equal(offset,0);assert.equal(length,1);if(path===media[0].path){reads++;if(fault==='unreadable')throw Error('private file detail');if(fault==='clipped')return {bytesRead:1};if(fault==='short read')return {bytesRead:0,base64:''};if(fault==='changed')version++;}return {bytesRead:1,base64:'iQ=='};}};
 const commits=[],creates=[];
 const project={resources:async()=>resources,sourceFiles:async()=>({fileTree:nodes}),meta:async()=>({draftIds:[]}),createDraft:async()=>{creates.push('draft');const state={fps:30};return {meta:async()=>state,setFrameSize:async()=>{},insertGap:async()=>{},commitAll:async()=>{commits.push('save');return {createdDraftId:'draft-new'};}};}};
 const selects={project:()=>project,files,media:{probe:async({filePaths})=>{await hooks.probe?.();return {files:filePaths.map(path=>({path})),errors:[],summary:{failed:0}};}}};
 const scripts=[];const run=input=>{const script=buildScript(input);scripts.push({name:'Gallery '+input.operation,script});return new asyncFunction('selects',script)(selects);};
 const input={operation:'preflight',projectId:'p',fps:30,durationFrames:853,manualBpm:113,music:null,media:media.map(m=>({...m}))};
 const sdk={call:async method=>{assert.equal(method,'listProjectResources');return resources;},runScript:async request=>{requests.push(request);if(request.allowCommit){writes.push(request);return {isError:true,output:'WRITE_REACHED'};}try{return {result:await vm.runInNewContext('(async()=>{'+request.script+'})()',{selects})};}catch(error){return {isError:true,output:error.message};}},finishTemplate:result=>{finishes.push(result);finish?.();}};
 const local={environment:{platform:'darwin'},files:{join:(...parts)=>parts.join('/'),homedir:()=>'/profile',exists:async()=>true,mkdir:async()=>{}}};
 const mount=()=>new Promise((resolve,reject)=>{
  const key=String(minify);
  if(!compiled.has(key)){
   const source=fs.readFileSync(process.env.GALLERY_PANEL_SOURCE || new URL('../plugins/photo-gallery-no2/panel.tsx',import.meta.url),'utf8');
   compiled.set(key,esbuild.transformSync(source+'\nexport function __mount(sdk,local,context){panelLocalClients.set(sdk,local);hostUseSdk(sdk);useAppUpdateGuard=()=>{};return GalleryTemplateRun({sdk,context});}',{loader:'tsx',format:'cjs',target:'es2022',jsx:'automatic',minify}).code);
  }
  const effects=[],React={useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:fn=>effects.push(fn)},module={exports:{}};
  vm.runInNewContext(compiled.get(key),{module,exports:module.exports,require:name=>name==='react'?React:{jsx:()=>null},window:{parent:{}},console,TextEncoder,TextDecoder,Uint8Array,setTimeout,clearTimeout});
  const timer=setTimeout(()=>reject(Error('Gallery run did not finish')),2000);finish=()=>{clearTimeout(timer);resolve();};
  const picks=kind=>media.filter(m=>m.kind===kind).map(m=>({resourceId:m.resourceId,name:m.name,kind}));
  module.exports.__mount(sdk,local,{projectId:'p',language:'en',template:{runId:'gallery-input',libraryId:'library',inputs:{photos:picks('image'),clips:picks('video')}}});for(const effect of effects)effect();
 });
 return {media,resources,nodes,files,fileCalls,input,run,scripts,selects,sdk,writes,requests,finishes,hooks,mount,commits,creates,get reads(){return reads;},setFault:value=>{fault=value;}};
}
for(const fault of ['missing','unknown','directory','empty','unreadable','clipped','short read','changed'])test('Gallery original '+fault+' Image cannot pass cached metadata/probe',{timeout:3000},async()=>{
 const f=fixture({fault}),r=await f.run(f.input);assert.equal(r.status,'notSaved');assert.match(r.message,/original photo file|original file/i);assert.equal(f.writes.length,0);
});
test('Gallery refuses caller dimensions when current Project Image dimensions are missing',async()=>{
 const f=fixture();delete f.nodes[0].frameSize;const r=await f.run(f.input);assert.equal(r.status,'notSaved');assert.match(r.message,/dimensions/i);
});
test('Gallery rejects a changed media kind instead of replacing the requested Image with Video',async()=>{
 const f=fixture();f.input.media[0].kind='video';const r=await f.run(f.input);assert.equal(r.status,'notSaved');assert.match(r.message,/type|kind/i);
});
for(const index of [0,3])test('Gallery cannot bypass ambiguous paths through a matching '+(index?'Video':'Image')+' ID',async()=>{
 const f=fixture(),r=f.resources[index],n=f.nodes[index];f.resources.push({...r,resourceId:'duplicate'});f.nodes.push({...n,resourceId:'duplicate'});
 const result=await f.run(f.input);assert.equal(result.status,'notSaved');assert.match(result.message,/ambiguous|unique/i);
});
test('Gallery cannot hide a duplicated Video source node by discarding repeated Resource IDs',async()=>{
 const f=fixture();f.nodes.push({...f.nodes[3]});const r=await f.run(f.input);assert.equal(r.status,'notSaved');assert.match(r.message,/ambiguous|unique/i);
});
test('Gallery rechecks Image availability after a successful media probe',async()=>{
 const f=fixture();f.hooks.probe=()=>f.setFault('missing');const r=await f.run(f.input);assert.equal(r.status,'notSaved');assert.match(r.message,/missing/i);
});
test('Gallery cannot ignore dimensions changing during the media probe',async()=>{
 const f=fixture();f.hooks.probe=()=>{f.nodes[0].frameSize.width=1280;};const r=await f.run(f.input);assert.equal(r.status,'notSaved');assert.equal(r.code,'image-source-changed');assert.match(r.message,/Tile 1/);
});
for(const style of ['drive','UNC'])test('Gallery '+style+' Unicode aliases keep the observed original path and availability checks',async()=>{
 const f=fixture(),root=style==='drive'?'C:\\Profiles\\caf\u00e9\\':'\\\\studio\\share\\caf\u00e9\\';
 for(let i=0;i<21;i++){const observed=root+"Trip 'A' "+i+(f.media[i].kind==='video'?'.mp4':'.png');f.media[i].path=observed;f.nodes[i].path=observed;f.input.media[i].path=observed.replace(/\\/g,'/').toLowerCase().normalize('NFD');}
 const r=await f.run(f.input);assert.equal(r.status,'ready',r.message);assert.equal(f.fileCalls.find(c=>c[0]==='readRange')[1],f.nodes[0].path);f.setFault('missing');assert.equal((await f.run(f.input)).status,'notSaved');
});
test('Gallery input facts accept the public source-file folder-summary shape',async()=>{
 const f=fixture();f.selects.project('p').sourceFiles=async args=>args?{fileTree:f.nodes}:{mode:'summary',folders:[{name:'media'}]};assert.equal((await f.run(f.input)).status,'ready');assert.equal(f.fileCalls.filter(c=>c[0]==='readRange').length,15);
});
test('Gallery retains intentional repetitions and path-bound current aliases',async()=>{
 const f=fixture();f.input.media[1]={...f.input.media[0],resourceId:'stale-alias'};const before=JSON.stringify(f.input);
 const r=await f.run(f.input);assert.equal(r.status,'ready',r.message);assert.equal(r.plan.tiles[1].resourceId,'r0');assert.equal(JSON.stringify(f.input),before);
 assert.equal(f.fileCalls.filter(c=>c[0]==='readRange').length,14,'one read per distinct selected Image');
});
test('Gallery all-Video inputs do not require an unused Image file-check capability',async()=>{
 const f=fixture();for(let i=0;i<21;i++){f.resources[i].type='Video';f.nodes[i].kind='video';f.input.media[i].kind='video';}delete f.selects.files;
 const r=await f.run(f.input);assert.equal(r.status,'ready',r.message);
});
for(const minify of [false,true])test('Gallery hidden run checks a missing original before bundled music or conversions (minify='+minify+')',{timeout:3000},async()=>{
 const f=fixture({fault:'missing',minify});await f.mount();assert.equal(f.finishes.length,1);assert.ok(f.finishes[0].error);assert.equal(f.writes.length,0,'no reusable asset import or Draft save before original checks');
});
test('Gallery direct base creation cannot persist a seed before checking selected originals',async()=>{
 const f=fixture({fault:'missing'}),r=await f.run({...f.input,operation:'createBase',durationFrames:427});assert.equal(r.status,'notSaved');assert.match(r.message,/original photo file.*missing/i);assert.equal(f.commits.length,0);assert.equal(f.creates.length,0);
});
test('Gallery inspection keeps usable inputs when unrelated source nodes are ambiguous',async()=>{
 const f=fixture();f.resources.push({resourceId:'unrelated',name:'Unrelated',type:'Video'});
 const row={resourceId:'unrelated',name:'Unrelated',type:'video',path:'/other/duplicate.mp4',frameSize:{width:640,height:960},durationSeconds:30};f.nodes.push(row,{...row});
 const r=await f.run({operation:'inspect',projectId:'p'});assert.equal(r.status,'inspected');assert.equal(r.media.length,21);assert.deepEqual(r.unavailable,[{resourceId:'unrelated',name:'Unrelated'}]);
});
test('Gallery missing Image-check support asks for an update before preparation',{timeout:3000},async()=>{
 const f=fixture();delete f.selects.files.readRange;await f.mount();assert.match(f.finishes[0].error,/update Selects/i);assert.equal(f.writes.length,0);
});
for(const resourceId of [undefined,'   '])test('Gallery requires a picked Resource ID before reading originals ('+String(resourceId)+')',async()=>{
 const f=fixture();f.input.media[0].resourceId=resourceId;const r=await f.run(f.input);assert.equal(r.status,'notSaved');assert.match(r.message,/Resource ID/i);assert.equal(f.fileCalls.length,0);
});
test('Gallery real original deletion is refused despite retained Project metadata and probe rows',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-original-input-'));
 try{
  const f=fixture(),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
  for(let i=0;i<21;i++){const filename=path.join(root,'photo-'+i+'.png');fs.writeFileSync(filename,png);Object.assign(f.nodes[i],{path:filename,kind:'image',frameSize:{width:1,height:1}});Object.assign(f.input.media[i],{path:filename,kind:'image',width:1,height:1});f.resources[i].type='Image';}
  f.selects.files.stat=async filename=>{try{const s=await fs.promises.stat(filename);return {size:s.size,isDirectory:s.isDirectory(),mtimeMs:s.mtimeMs,ino:s.ino};}catch(error){if(error.code==='ENOENT')return null;throw error;}};
  f.selects.files.readRange=async({path:filename,offset,length})=>{const file=await fs.promises.open(filename,'r');try{const bytes=Buffer.alloc(length),{bytesRead}=await file.read(bytes,0,length,offset);return {bytesRead,base64:bytes.subarray(0,bytesRead).toString('base64')};}finally{await file.close();}};
  assert.equal((await f.run(f.input)).status,'ready');fs.unlinkSync(f.input.media[0].path);
  const r=await f.run(f.input);assert.equal(r.status,'notSaved');assert.match(r.message,/missing/);assert.equal(f.creates.length,0);assert.equal(f.commits.length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('Gallery input and preflight scripts typecheck with and without SDK declarations',async()=>{
 const f=fixture();assert.equal((await f.run(f.input)).status,'ready');assert.equal((await f.run({...f.input,operation:'verifyInputs'})).status,'inputsReady');
 assert.equal(checkScriptTypes(f.scripts).scripts,2);assert.equal(checkScriptTypes(f.scripts,{sdkTypes:false}).scripts,2);
});
