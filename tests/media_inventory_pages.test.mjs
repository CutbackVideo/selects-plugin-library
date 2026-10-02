import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadPanelFunctions, topLevel, panelSource} from './windows_host.mjs';

const panels = ['recap-2026','camera-shutter-dump','card-news-maker','cinema-vlog-studio','cutout-beat-gallery','daily-vlog-8','fast-switching-stopmotion','four-photo-stop-motion','gongju-gallery','no14-still-video','photo-gallery-no2','place-count','polaroid-photo-dump','portrait-beat-montage','shortform-cloner','six-clip-velocity','thank-you-recap','torn-paper-love','travel-beat-vlog'];
const inventories = ['archive-vlog','city-weekend-vlog','mini-vlog','summer-trip','the-end-credits','selfie-aesthetic','torn-paper-love'];
const plain = x => JSON.parse(JSON.stringify(x));
const fill = (s,cfg) => s.replace('__CONFIG__',()=>`JSON.parse(${JSON.stringify(JSON.stringify(cfg))})`);
function fixture(n=4000) {
 const rows=Array.from({length:n},(_,i)=>({resourceId:'r'+i,name:`\uD64D\uAE38\uB3D9-${i}-${'x'.repeat(90)}`,type:i%3===0?'Image':'Video',hasAnalysis:i%5!==0,durationSeconds:10,status:'pending',recording:{recordedAt:'2026-07-14T01:02:03Z'}}));
 // The child and its owning timeline straddle a page boundary; the child must stay excluded.
 rows[31].owningSyncedSequenceResourceId='r32';
 const nodes=rows.map(r=>({...r,type:r.type.toLowerCase(),path:'C:\\Footage\\'+r.name,frameSize:{width:1920,height:1080}}));
 const project={resources:async()=>rows,sourceFiles:async opts=>opts?{fileTree:nodes}:{folders:[{name:'Footage'}]},meta:async()=>({title:'Large project'}),workflows:async()=>[]};
 const calls=[];
 const run=async script=>vm.runInNewContext(`(async()=>{${script}\n})()`,{selects:{project:()=>project}});
 const sdk={call:async()=>rows.map(r=>({...r,resourceId:'app-'+r.resourceId})),runScript:async args=>{
  assert.equal(args.allowCommit,false,'media paging never commits');
  const result=await run(args.script),bytes=Buffer.byteLength(JSON.stringify(result));calls.push(bytes);
  return bytes>262144?{isError:false,output:'clipped'}:{isError:false,result};
 }};
 return {rows,nodes,project,sdk,run,calls};
}
for(const id of panels)test(`${id}: pages preserve every row, metadata and order under the response limit`,async()=>{
 const source=panelSource(id),{readMediaPages}=loadPanelFunctions(source,['readMediaPages']);
 assert.equal(topLevel(source,'readMediaPages').trim(),topLevel(panelSource(panels[0]),'readMediaPages').trim());
 const f=fixture();
 const script='const rows=await selects.project("p").resources();return {videos:rows,photos:rows.slice(1,67),title:"Project",counts:{ready:5}};';
 assert.ok(Buffer.byteLength(JSON.stringify(await f.run(script)))>262144);
 assert.deepEqual(plain((await readMediaPages(f.sdk,{script})).result),plain(await f.run(script)));
 assert.ok(f.calls.every(bytes=>bytes<262144));
 for(const n of [0,1,32,33,64]){
  const script=`return Array.from({length:${n}},(_,i)=>i);`;
  assert.deepEqual(plain((await readMediaPages(f.sdk,{script})).result),Array.from({length:n},(_,i)=>i));
 }
});
test('Travel Beat Vlog retries a failed inventory read from the first page',async()=>{
 const f=fixture(96);let calls=0;
 const {inventory}=loadPanelFunctions(panelSource('travel-beat-vlog'),['readMediaPages','INVENTORY','inventory']);
 const run=f.sdk.runScript;
 f.sdk.runScript=async args=>++calls===2?{isError:true,output:'temporary failure'}:run(args);
 assert.equal((await inventory(f.sdk,'p','Load Project media')).length,96);
 assert.equal(calls,5);
});
test('a failed page or changing inventory never returns a partial list',async()=>{
 const {readMediaPages}=loadPanelFunctions(panelSource(panels[0]),['readMediaPages']);
 for(const mode of ['failure','changed']){
  let calls=0;
  const sdk={runScript:async()=> ++calls===1?{result:{page:{rows:[1]},total:40,array:true}}:mode==='failure'?{isError:true,output:'offline'}:{result:{page:{rows:[2]},total:41,array:true}}};
  await assert.rejects(readMediaPages(sdk,{script:'return [];'}),mode==='failure'?/offline/:/changed/);
 }
});
for(const id of inventories)test(`${id}: paged inventory equals the original, including synced exclusions and counters`,async()=>{
 const {readInventoryPages}=loadPanelFunctions(panelSource(id),['readInventoryPages']);
 assert.equal(topLevel(panelSource(id),'readInventoryPages').trim(),topLevel(panelSource(inventories[0]),'readInventoryPages').trim());
 const f=fixture(),script=fs.readFileSync(new URL(`../plugins/${id}/scripts/inventory.js`,import.meta.url),'utf8');
 const cfg={projectId:'p',only:null,known:{},measureMs:0,probeMs:0};
 const expected=await f.run(fill(script,cfg));
 const actual=await readInventoryPages(async(summary,make)=>{
  const result=await f.run(make(0));assert.ok(Buffer.byteLength(JSON.stringify(result))<262144);return result;
 },script,cfg,fill);
 assert.deepEqual(plain(actual),plain(expected));
 assert.ok(!actual.resources.some(r=>r.rid==='r31'));
});
for(const id of ['cinema-vlog-studio','daily-vlog-8','fast-switching-stopmotion','gongju-gallery','portrait-beat-montage','thank-you-recap','torn-paper-love','travel-beat-vlog'])test(`${id}: selected IDs keep duplicates and detect missing or changed resources`,async()=>{
 const {readMediaPages,scriptResourceIds}=loadPanelFunctions(panelSource(id),['readMediaPages','scriptResourceIds']);
 const f=fixture(),ids=['app-r32','app-r0','app-r32','app-r3999'];
 const result=await scriptResourceIds(f.sdk,'p',ids);
 assert.deepEqual(Array.from(result,p=>[...p]),[['app-r32','r32'],['app-r0','r0'],['app-r3999','r3999']]);
 assert.ok(f.calls.every(n=>n<2000));
 await assert.rejects(scriptResourceIds(f.sdk,'p',['missing']),/missing/);
 const call=f.sdk.call;f.sdk.call=async()=>{const app=await call();f.rows[32].name='Changed';return app};
 await assert.rejects(scriptResourceIds(f.sdk,'p',ids),/Could not match/);
});
for(const [id,name] of [['cinema-vlog-studio','videoLengths'],['daily-vlog-8','VIDEO_LENGTHS']])test(`${id}: duration reads include only the picked videos`,async()=>{
 const names=['readMediaPages',name];if(id==='cinema-vlog-studio')names.push('clean');
 const functions=loadPanelFunctions(panelSource(id),names),f=fixture();
 const result=(await functions.readMediaPages(f.sdk,{script:functions[name]('p',['r1','r2','r3998'])})).result;
 assert.deepEqual(Array.from(result,r=>r.id||r.resourceId),['r1','r2','r3998']);
 assert.equal(f.calls.length,1);
});
for(const [id,count] of [['four-photo-stop-motion',4],['polaroid-photo-dump',17],['no14-still-video',4]])test(`${id}: selected photos preserve order and duplicates without loading unrelated files`,async()=>{
 const f=fixture();
 const source=panelSource(id),names=['readMediaPages','INVENTORY','inventory','templateIssue','TEMPLATE_UNSUPPORTED','templateSelection'];
 if(id!=='no14-still-video')names.push('SLOTS');
 const {templateSelection}=loadPanelFunctions(source,names);
 const app={__DI__:{ProjectRepository:{findById:async()=>({getResources:()=>f.rows.map(r=>'app-'+r.resourceId)})},ResourceRepository:{findById:async(lib,id)=>{
  const index=Number(id.replace('app-r',''));return {getType:()=>f.rows[index].type,getMedia:()=>({originalPath:f.nodes[index].path})};
 }}}};
 const indices=Array.from({length:count},(_,i)=>i===count-1?0:(count-i)*3);
 const picks=indices.map(i=>({resourceId:'app-r'+i,kind:'image'}));
 const result=await templateSelection(f.sdk,app,'p','lib',{photos:picks});
 assert.deepEqual(Array.from(result,r=>r.resourceId),indices.map(i=>'r'+i));
 assert.ok(f.calls.every(n=>n<12000));
 f.nodes[3999].path=f.nodes[0].path;
 await assert.rejects(templateSelection(f.sdk,app,'p','lib',{photos:picks}),/more than one photo/);
});
test('paging keeps one photo-measurement budget and measures no photo twice',async()=>{
 for(const id of inventories){
  const {readInventoryPages}=loadPanelFunctions(panelSource(id),['readInventoryPages']);
  const f=fixture(96),measured=[],cfg={projectId:'p',only:null,known:{},measureMs:8000,probeMs:0};let now=0;
  f.nodes.forEach(n=>n.frameSize=null);
  f.project.createDraft=async()=>({insertResource:async({resourceId})=>{measured.push(resourceId);now+=1000},meta:async()=>({frameSize:{width:1920,height:1080}})});
  const script=fs.readFileSync(new URL(`../plugins/${id}/scripts/inventory.js`,import.meta.url),'utf8');
  await readInventoryPages(async(summary,make)=>vm.runInNewContext(`(async()=>{${make(0)}})()`,{selects:{project:()=>f.project},Date:{now:()=>now}}),script,cfg,fill);
  assert.equal(measured.length,8,id);assert.equal(new Set(measured).size,8,id);
 }
});
test('Summer Trip shares its capture-date probe limit across pages',async()=>{
 const {readInventoryPages}=loadPanelFunctions(panelSource('summer-trip'),['readInventoryPages']);
 const f=fixture(240),probed=[];
 f.rows.forEach(r=>r.recording=null);
 const script=fs.readFileSync(new URL('../plugins/summer-trip/scripts/inventory.js',import.meta.url),'utf8');
 const result=await readInventoryPages(async(summary,make)=>vm.runInNewContext(`(async()=>{${make(0)}})()`,{
  selects:{project:()=>f.project,media:{probe:async({filePaths})=>{probed.push(...filePaths);return {files:filePaths.map(path=>({path,dates:{recorded:'2026-07-14'}}))}}}},
  Date:{now:()=>0},
 }),script,{projectId:'p',only:null,known:{},measureMs:0,probeMs:4000,probeMax:200},fill);
 assert.equal(probed.length,200);assert.equal(new Set(probed).size,200);
 assert.equal(result.captureDates.probed,200);assert.equal(result.months[6],200);
});
for(const id of ['fast-switching-stopmotion','thank-you-recap'])test(`${id}: polling waits for the current read and recovers after failure`,async()=>{
 const source=panelSource(id);let effect=source.slice(source.indexOf('    let live = true;'),source.indexOf('\n    check();')).replaceAll(' as Media[]','');
 let resolve,reject,reads=0;
 const check=vm.runInNewContext(`(()=>{${effect}\nreturn check;})()`,{
  sdk:{call:async()=>[{resourceId:'r0',type:'Video',status:'ready'}]},projectId:'p',busyRef:{current:false},document:{visibilityState:'visible'},
  setMedia:()=>{},setStatus:()=>{},setPicked:()=>{},mediaScript:()=>'',
  readMediaPages:()=>{reads++;return new Promise((yes,no)=>{resolve=yes;reject=no})},
 });
 const first=check();await new Promise(setImmediate);await check();assert.equal(reads,1);
 reject(Error('temporary failure'));await first;
 const second=check();await new Promise(setImmediate);assert.equal(reads,2);
 resolve({result:[{id:'r0',type:'Video'}]});await second;await check();assert.equal(reads,2);
});
