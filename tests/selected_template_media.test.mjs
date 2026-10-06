import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadPanelFunctions} from './windows_host.mjs';

const root=process.env.PLUGIN_TEST_ROOT||path.resolve(import.meta.dirname,'../plugins');
const source=id=>fs.readFileSync(path.join(root,id,'panel.tsx'),'utf8');
const recapSource=source('recap-2026');
const videosName=recapSource.includes('const selectedVideosScript')?'selectedVideosScript':'allVideosScript';
const recap=loadPanelFunctions(recapSource,['embedded','core','scriptResult','RESOURCE_SECONDS',videosName,'scriptResourceIds']);
const camera=loadPanelFunctions(source('camera-shutter-dump'),['readMediaPages','INVENTORY','samePath','inventory','SLOTS','TEMPLATE_UNSUPPORTED','templateIssue','templateSelection','ensureSounds'],{
 unpackSounds:async()=>Object.fromEntries(Array.from({length:6},(_,i)=>['shutter.'+(i+1),{path:`C:\\Sounds\\shutter-${i}.wav`}]))
});

// Exceeds run_script's 256 KiB return limit before filtering, including the ID/name list.
function projectFixture(detail=false){
 const rows=Array.from({length:4000},(_,i)=>({resourceId:'r'+i,type:i<2000?'Video':'Image',name:'media-'+i+'-'+('x'.repeat(90)),durationSeconds:10}));
 rows.push(...Array.from({length:6},(_,i)=>({resourceId:'s'+i,type:'Audio',name:'shutter-'+i})));
 const files=rows.slice(0,-6).map(r=>({...r,type:r.type.toLowerCase(),path:'/footage/'+r.name,frameSize:{width:1920,height:1080}}));
 files.push(...rows.slice(-6).map((r,i)=>({...r,type:'audio',path:`c:/sounds/shutter-${i}.wav`}))); // Windows spelling differs.
 const tree=[{type:'dir',name:'media',children:files}];
 const calls=[];
 const project={resources:async()=>rows,sourceFiles:async input=>detail||input?{fileTree:tree}:{folders:[{name:'media'}]}};
 const appRows=rows.map(r=>({...r,resourceId:'app-'+r.resourceId}));
 const sdk={call:async()=>appRows,runScript:async({script,summary})=>{
  const result=await vm.runInNewContext('(async()=>{'+script+'})()',{selects:{project:()=>project}});
  const bytes=Buffer.byteLength(JSON.stringify(result));calls.push({summary,bytes});
  return bytes>256*1024?{isError:false,output:'Result clipped'}:{isError:false,result};
 }};
 const app={__DI__:{ProjectRepository:{findById:async()=>({getResources:()=>appRows.map(r=>r.resourceId)})},ResourceRepository:{findById:async(_lib,id)=>{
  const i=appRows.findIndex(r=>r.resourceId===id);return i<0?null:{getType:()=>rows[i].type,getMedia:()=>({originalPath:files[i]?.path})};
 }}}};
 return {rows,files,sdk,app,appRows,calls};
}

for(const detail of [false,true])test(`Recap returns only picked videos through a bounded response (${detail?'tree':'folder summary'})`,async()=>{
 const {rows,files,sdk,calls}=projectFixture(detail);
 files.splice(1500,1); // Selected Resource absent from the source tree still gets its duration.
 const picks=['app-r1999','app-r1500','app-r0','app-r1999'];
 const ids=await recap.scriptResourceIds(sdk,'p',picks);
 assert.deepEqual(Array.from(ids, pair=>[...pair]),[['app-r1999','r1999'],['app-r1500','r1500'],['app-r0','r0']]);
 const result=recap.scriptResult(await sdk.runScript({script:recap[videosName]('p',[...ids.values()])}));
 assert.deepEqual(Array.from(result,r=>r.resourceId).sort(),['r0','r1500','r1999']);
 assert.equal(result.find(r=>r.resourceId==='r1500').path,null);
 assert.equal(result.find(r=>r.resourceId==='r1500').durationSeconds,10);
 assert.ok(calls.every(c=>c.bytes<2000));
 rows[1999].name='changed after selection';
 await assert.rejects(recap.scriptResourceIds(sdk,'p',picks),/Could not match/);
 await assert.rejects(recap.scriptResourceIds(sdk,'p',['missing']),/missing/);
});

test('Camera preserves selected photo order and repeated picks without returning the whole project',async()=>{
 const {sdk,app,calls}=projectFixture();
 const photos=[2012,2001,2008,2004,2007,2003,2010,2005,2009,2006,2002,2012].map(i=>({resourceId:'app-r'+i,kind:'image'}));
 const selected=await camera.templateSelection(sdk,app,'p','lib',{photos});
 assert.deepEqual(Array.from(selected,r=>r.resourceId),photos.map(r=>r.resourceId.slice(4)));
 const fresh=await camera.inventory(sdk,'p','Confirm selected photos',{type:'Image',paths:selected.map(p=>p.path)});
 assert.equal(fresh.length,11);
 assert.ok(calls.every(c=>c.bytes<4000));
});

test('Camera still rejects ambiguous selected paths',async()=>{
 const {sdk,app,files}=projectFixture();
 files[2012].path=files[2000].path;
 const photos=Array.from({length:12},(_,i)=>({resourceId:'app-r'+(2000+i),kind:'image'}));
 await assert.rejects(camera.templateSelection(sdk,app,'p','lib',{photos}),/matches more than one photo/);
});

test('Camera finds only its bundled audio and reuses imports with Windows path spelling',async()=>{
 const {sdk,calls}=projectFixture();
 const ids=await camera.ensureSounds(sdk,'p');
 assert.deepEqual({...ids},Object.fromEntries(Array.from({length:6},(_,i)=>['shutter.'+(i+1),'s'+i])));
 assert.equal(calls.length,1);
 assert.ok(calls[0].bytes<1000);
 const empty=await camera.inventory(sdk,'p','No selected photos',{type:'Image',paths:[]});
 assert.equal(empty.length,0);
});

test('Camera resolves template picks when host DI access is forbidden',async()=>{
 const {sdk,calls}=projectFixture();
 const app=new Proxy({}, {get(){throw Error('Host access is forbidden');}});
 const photos=Array.from({length:12},(_,i)=>({resourceId:'app-r'+(2000+i),kind:'image'}));
 const selected=await camera.templateSelection(sdk,app,'p','lib',{photos});
 assert.deepEqual(Array.from(selected,r=>r.resourceId),photos.map(r=>r.resourceId.slice(4)));
 assert.ok(calls.every(c=>c.bytes<10000));
});

const migrated=['camera-shutter-dump','four-photo-stop-motion','polaroid-photo-dump','no14-still-video','photo-gallery-no2','postcard-cutout-studio','multicam-generator'];
for(const id of migrated){
 const selected=loadPanelFunctions(source(id),['sdkSelectedMedia']).sdkSelectedMedia;
 test(`${id}: SDK lookup keeps order, duplicate picks, and mixed media`,async()=>{
  const {sdk,calls}=projectFixture();
  const picks=[{resourceId:'app-r2001',kind:'image'},{resourceId:'app-r0',kind:'video'},{resourceId:'app-r2001',kind:'image'}];
  const rows=await selected(sdk,'p',picks);
  assert.deepEqual(Array.from(rows,r=>r.resourceId),['r2001','r0','r2001']);
  assert.ok(calls.every(c=>c.bytes<2000));
 });
 test(`${id}: SDK lookup refuses removed, wrong-type, and changed selections`,async()=>{
  const {sdk}=projectFixture();
  await assert.rejects(selected(sdk,'p',[{resourceId:'missing',kind:'image'}]),/missing/);
  await assert.rejects(selected(sdk,'p',[{resourceId:'app-r0',kind:'image'}]),/wrong media type/);
  const original=sdk.call;let reads=0;
  sdk.call=async()=>{const rows=(await original()).map(r=>({...r}));if(++reads===2)[rows[0],rows[1]]=[rows[1],rows[0]];return rows;};
  await assert.rejects(selected(sdk,'p',[{resourceId:'app-r0',kind:'video'}]),/changed/);
 });
 test(`${id}: SDK failures and clipped output cannot become file selections`,async()=>{
  const {sdk}=projectFixture();
  sdk.runScript=async()=>({isError:true,output:'denied'});
  await assert.rejects(selected(sdk,'p',[{resourceId:'app-r0'}]),/denied/);
  sdk.runScript=async()=>({isError:false,output:'Result clipped'});
  await assert.rejects(selected(sdk,'p',[{resourceId:'app-r0'}]),/clipped/);
 });
}

test('Postcard reads generated resource paths through the SDK',async()=>{
 const postcard=loadPanelFunctions(source('postcard-cutout-studio'),['appResourcePath']);
 const {sdk,files}=projectFixture();
 assert.equal(await postcard.appResourcePath(sdk,{projectId:'p'},'app-r0'),files[0].path);
});

test('Postcard resolves a file to its host resource id through the SDK',async()=>{
 const postcard=loadPanelFunctions(source('postcard-cutout-studio'),['appResourceIdForPath','samePath']);
 const {sdk,files}=projectFixture();
 assert.equal(await postcard.appResourceIdForPath(sdk,{projectId:'p'},files[0].path),'app-r0');
 assert.equal(await postcard.appResourceIdForPath(sdk,{projectId:'p'},'/missing.mp4'),null);
});

test('Multicam resolves generated videos with DI access forbidden',async()=>{
 const {sdk,files}=projectFixture();
 const panel=loadPanelFunctions(source('multicam-generator').replace(/^ {2}/gm,'').replace(/ as any/g,''),['resolveResource'],{
  sdk,window:{parent:new Proxy({}, {get(){throw Error('Host access is forbidden');}})}
 });
 const media=await panel.resolveResource({plan:{projectId:'p'}},'app-r0');
 assert.equal(media.path,files[0].path);
 await assert.rejects(panel.resolveResource({plan:{projectId:'p'}},'app-r2000'),/type/);
});

for(const id of ['postcard-cutout-studio','multicam-generator']){
 const lookup=loadPanelFunctions(source(id),['sdkMediaByPath']).sdkMediaByPath;
 test(`${id}: path lookup preserves Windows spellings and rejects duplicate imports`,async()=>{
  const {sdk,files,calls}=projectFixture();
  files[0].path='C:\\Footage\\\uD55C\uAE00\\VIDEO.mp4';
  assert.equal((await lookup(sdk,'p','c:/footage/\uD55C\uAE00/video.mp4'))[0].resourceId,'app-r0');
  assert.equal((await lookup(sdk,'p','video.mp4',true))[0].resourceId,'app-r0');
  assert.equal((await lookup(sdk,'p','/missing')).length,0);
  assert.ok(calls.every(c=>c.bytes<500));
  files[1].path=files[0].path;
  await assert.rejects(lookup(sdk,'p',files[0].path),/More than one/);
 });
}

test('standalone copies of the SDK helpers remain identical, including the build template',()=>{
 for(const marker of ['sdk-selected-media','sdk-media-path']){
  const copies=[...migrated.map(source),fs.readFileSync(path.join(root,'photo-gallery-no2','panel.template.tsx'),'utf8')]
    .filter(s=>s.includes('// '+marker+':start'))
    .map(s=>s.slice(s.indexOf('// '+marker+':start'),s.indexOf('// '+marker+':end')));
  assert.ok(copies.length>=2);
  assert.ok(copies.every(s=>s===copies[0]),marker+' helpers differ');
 }
});

test('Multicam reuses prepared imports and resolves a newly registered file through the SDK',async()=>{
 const {sdk,files,rows,appRows}=projectFixture();
 const writes=[];
 const panel=loadPanelFunctions(source('multicam-generator').replace(/^ {2}/gm,'').replace(/ as any/g,''),['importPath'],{
  sdk,script:async(code,summary,allowCommit)=>{
   assert.equal(allowCommit,true);writes.push(summary);
   const resource={resourceId:'new-video',name:'prepared.mp4',type:'Video'};
   rows.push(resource);
   appRows.push({...resource,resourceId:'app-new-video'});
   files.push({...resource,type:'video',path:'/prepared.mp4'});
  }
 });
 const context={plan:{projectId:'p'}};
 assert.equal(await panel.importPath(context,files[0].path),'app-r0');
 assert.deepEqual(writes,[]);
 assert.equal(await panel.importPath(context,'/prepared.mp4'),'app-new-video');
 assert.deepEqual(writes,['Import prepared media']);
});

test('Place Count reads the full paged tree without DI and keeps host resource identities',async()=>{
 const {sdk,files,calls}=projectFixture();
 const call=sdk.call;
 sdk.call=async method=>method==='getProjectDraftScaffold'?{owner:{libraryId:'lib',projectId:'p'}}:call();
 const panel=loadPanelFunctions(source('place-count'),['fullProjectInventory','readMediaPages'],{
  issue:message=>Error(message),window:{parent:new Proxy({}, {get(){throw Error('Host access is forbidden');}})}
 });
 const inventory=await panel.fullProjectInventory(sdk,'p');
 assert.equal(inventory.length,files.length);
 assert.equal(inventory[0].resourceId,'app-r0');
 assert.equal(inventory[0].path,files[0].path);
 assert.ok(calls.every(c=>c.bytes<16000));
});
