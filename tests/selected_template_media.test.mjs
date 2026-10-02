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
 return {rows,files,sdk,app,calls};
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
