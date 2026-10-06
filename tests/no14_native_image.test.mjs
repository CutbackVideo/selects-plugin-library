import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadPanelOperation} from './panel_operation.mjs';

const {buildNativeFinishScript,normalizeNativeFinish,authorNativeFinish,nativeScenePlan,transitionCoefficients}=loadPanelOperation('no14-still-video');

const panelPath=path.resolve(import.meta.dirname,'../plugins/no14-still-video/panel.tsx');
const panelSource=fs.readFileSync(panelPath,'utf8');
const bridgeSource=panelSource.slice(panelSource.indexOf('export async function prepareNativeImages'),panelSource.indexOf('export default function Panel'));
assert.ok(bridgeSource.startsWith('export async function prepareNativeImages')&&bridgeSource.includes('export async function placeNativeImages'));
const {prepareNativeImages,placeNativeImages}=vm.runInThisContext('(function(){'+bridgeSource.replaceAll('export async function','async function')+';return {prepareNativeImages,placeNativeImages};})()');

test('the Panel builds the plan and finishing step itself, with no Node.js, and rejects the obsolete still-video route',()=>{
 assert.doesNotMatch(panelSource,/\bnode ["$]|build-script/);
 assert.throws(()=>buildNativeFinishScript({projectId:'project',videos:[]}),/Unsupported original Image/);
});

test('native plan preserves the reference windows with independently editable overlaps',()=>{
 const plan=nativeScenePlan(),full=plan.occurrences.filter(x=>x.appearance==='fullscreen');
 assert.equal(plan.durationFrames,266);
 assert.deepEqual(full.map(x=>[x.slot,x.startFrame,x.endFrame]),[['A',130,170],['B',160,201],['D',191,230],['C',220,266]]);
 assert.deepEqual(plan.transitions.map(x=>x.cutFrame),[160,191,220]);
 assert.deepEqual(transitionCoefficients(0),{outgoing:1,incoming:0});
 assert.deepEqual(transitionCoefficients(1),{outgoing:0,incoming:1});
});

const selected=['A','B','C','D'].map((slot,i)=>({resourceId:`r${i}`,name:`Photo ${slot}`,path:`/photos/${slot}.jpg`}));
const nativeResources=selected.map((photo,i)=>({getId:()=>`uuid-${i}`,getType:()=> 'Image',getMedia:()=>({path:photo.path,width:i%2?960:640,height:i%2?640:960}),getAnalyzedSequence:async()=>({getMainTrack:()=>({getClips:()=>[{isGap:()=>false,getId:()=>i+1}]})})}));
function nativeApp(resources=nativeResources){
 const project={getResources:()=>resources.map((_,i)=>`uuid-${i}`),getEditedSequences:()=>['draft']};
 const di={ProjectRepository:{findById:async()=>project},ResourceRepository:{findById:async(_library,id)=>resources[Number(id.split('-')[1])]},SequenceRepository:{findById:async()=>null},TimelineMutation:{run:async()=>null}};
 return {app:{location:{pathname:'/libraries/library/projects/project'},__DI__:di},di};
}

test('original Image selection requires one exact registered source path per slot',async()=>{
 const {app}=nativeApp();
 const ready=await prepareNativeImages(app,'project',selected);
 assert.equal(ready.sources.length,4);
 assert.deepEqual(ready.sources.map(s=>[s.width,s.height]),[[640,960],[960,640],[640,960],[960,640]]);
 const repeated=await prepareNativeImages(app,'project',[selected[0],selected[1],selected[0],selected[3]]);
 assert.equal(repeated.sources[0].resource,repeated.sources[2].resource,'one registered photo may intentionally fill two slots');
 await assert.rejects(()=>prepareNativeImages(app,'other',selected),/selected Project/);
 await assert.rejects(()=>prepareNativeImages(app,'project',[{...selected[0],path:'/photos/missing.jpg'},...selected.slice(1)]),/missing or ambiguous/);
 const duplicate=nativeResources.concat(nativeResources[0]);
 await assert.rejects(()=>prepareNativeImages(nativeApp(duplicate).app,'project',selected),/missing or ambiguous/);
});

test('eight original Image occurrences are placed and trimmed in one mutation',async()=>{
 const {app,di}=nativeApp();
 const ready=await prepareNativeImages(app,'project',selected);
 const positions=new Map();let nextId=20,mutations=0,duration=266,slices=0;
 const sequence={getFrameRate:()=>30,getDuration:()=>duration,getFrameSize:()=>({width:720,height:1280}),clone(){return this;},
  place(_source,at){const id=nextId++,row={trackId:at>=130?`fullscreen-${id}`:`grid-${id}`,resolvedOffset:at,clip:{getDuration:()=>150}};positions.set(id,row);duration=Math.max(duration,at+150);return[id];},
  getClipPositionById:id=>positions.get(id),trimClipBoundary({clipId,delta}){const row=positions.get(clipId),length=row.clip.getDuration()+delta;row.clip={getDuration:()=>length};return{effectiveDelta:delta};}};
 sequence.slice=([{startFrame,endFrame}],{coordinate})=>{assert.equal(coordinate,'resolved');assert.equal(startFrame,266);assert.equal(endFrame,370);slices++;duration=266;};
 di.SequenceRepository.findById=async()=>sequence;
 di.TimelineMutation.run=async(_sequence,_label,callback)=>{mutations++;return{status:'committed',sequence:callback(sequence)};};
 const result=await placeNativeImages(ready,'draft',nativeScenePlan());
 assert.equal(mutations,1);
 assert.equal(slices,1,'the domain slice must remove the vacant tail created by Image trim');
 assert.equal(result.placements.length,8);
 assert.deepEqual(result.placements.filter(p=>p.appearance==='fullscreen').map(p=>[p.slot,p.startFrame,p.endFrame]),[['A',130,170],['B',160,201],['D',191,230],['C',220,266]]);
 assert.deepEqual(result.placements.filter(p=>p.appearance==='grid').map(p=>p.endFrame),[140,135,135,135]);
});

test('placement refreshes Project ownership after an empty Draft is saved',async()=>{
 const {app,di}=nativeApp();let reads=0;
 di.ProjectRepository.findById=async()=>{reads++;return {getResources:()=>nativeResources.map((_,i)=>`uuid-${i}`),getEditedSequences:()=>reads===1?[]:['draft']};};
 const ready=await prepareNativeImages(app,'project',selected);
 const positions=new Map();let nextId=1;
 const sequence={getFrameRate:()=>30,getDuration:()=>266,getFrameSize:()=>({width:720,height:1280}),clone(){return this;},
  place(_source,at){const id=nextId++;positions.set(id,{trackId:at>=130?'fullscreen':`grid-${id}`,resolvedOffset:at,clip:{getDuration:()=>150}});return[id];},
  getClipPositionById:id=>positions.get(id),trimClipBoundary({clipId,delta}){const row=positions.get(clipId),length=row.clip.getDuration()+delta;row.clip={getDuration:()=>length};return{effectiveDelta:delta};}};
 di.SequenceRepository.findById=async()=>sequence;
 di.TimelineMutation.run=async(_seq,_label,callback)=>({status:'committed',sequence:callback(sequence)});
 const result=await placeNativeImages(ready,'draft',nativeScenePlan());
 assert.equal(result.placements.length,8);
 assert.equal(reads,2,'ownership must be checked from a fresh Project object');
});

function finishInput(){
 const plan=nativeScenePlan();
 return normalizeNativeFinish({mode:'native-finish',projectId:'project',draftId:'draft',photos:selected.map((p,i)=>({resourceId:p.resourceId,path:p.path,width:i%2?960:640,height:i%2?640:960})),placements:plan.occurrences.map((o,i)=>({slot:o.slot,appearance:o.appearance,clipId:20+i,trackId:o.appearance==='fullscreen'?`fullscreen-${i}`:`grid-${i}`,startFrame:o.startFrame,endFrame:o.endFrame})),decoration:{shape:'heart',color:'#ffffff'},framing:{'grid-A':{x:.25,y:.75}}});
}

test('native finish rejects missing, duplicate, or changed Image placements',()=>{
 const input=finishInput();
 assert.equal(input.framing['grid-A'].x,.25);
 assert.throws(()=>normalizeNativeFinish({...input,mode:'native-finish',placements:input.placements.slice(1)}),/eight/);
 assert.throws(()=>normalizeNativeFinish({...input,mode:'native-finish',placements:[...input.placements.slice(0,7),input.placements[0]]}),/Duplicate/);
 assert.throws(()=>normalizeNativeFinish({...input,mode:'native-finish',placements:input.placements.map((p,i)=>i===0?{...p,endFrame:161}:p)}),/reference plan/);
 assert.ok(buildNativeFinishScript({...input,mode:'native-finish'}).includes('authorNativeFinish'));
});

test('native finish accepts absolute Windows paths and still rejects relative ones',()=>{
 const input=finishInput();
 const withPaths=paths=>normalizeNativeFinish({...input,mode:'native-finish',photos:input.photos.map((p,i)=>({...p,path:paths[i]}))});
 const windows=['C:\\Users\\starr\\Downloads\\a.jpg','D:/photos/b.jpg','\\\\server\\share\\c.jpg','C:\\Users\\\uD64D\uAE38\uB3D9\\d.jpg'];
 assert.deepEqual(withPaths(windows).photos.map(p=>p.path),windows);
 assert.throws(()=>withPaths(['photos\\a.jpg',...windows.slice(1)]),/Invalid Image dimensions or path/);
 assert.throws(()=>withPaths(['C:relative.jpg',...windows.slice(1)]),/Invalid Image dimensions or path/);
});

test('native finish verifies all eight Image resources before adding effects',async()=>{
 const input=finishInput(),plan=nativeScenePlan(),rows=input.placements.map(p=>({...p,trackKind:'video',resourceId:input.photos['ABCD'.indexOf(p.slot)].resourceId}));
 let effects=0,transitions=0,graphics=0,commits=0,revision=0;const effectParameters=[];
 const check=clip=>{assert.equal(clip.revision,revision,'clip handle must be reread after every edit');revision++;};
 const draft={meta:async()=>({fps:30,durationFrames:266,frameSize:{width:720,height:1280}}),clips:async()=>rows.map(row=>({...row,revision})),
  setClipTransform:async({clip})=>check(clip),addVideoEffect:async({clip,parameters})=>{check(clip);effects++;effectParameters.push(parameters);},addTransition:async({after})=>{check(after);transitions++;},addMotionGraphic:async()=>{graphics++;},rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame}),commitAll:async()=>{commits++;return{commitId:'saved'};}};
 const project={meta:async()=>({draftIds:['draft']}),resources:async()=>selected.map(p=>({resourceId:p.resourceId,type:'Image'}))};
 const selects={project:()=>project,draft:()=>draft};
 const result=await authorNativeFinish(selects,input,plan);
 assert.equal(result.status,'saved',result.message);
 assert.deepEqual([effects,transitions,graphics,commits],[8,0,1,1]);
 assert.deepEqual(effectParameters.slice(0,4).map(p=>[p.transitionIn?.startFrame??null,p.transitionOut?.startFrame??null]),[[null,160],[160,191],[191,220],[220,null]]);
 assert.ok(effectParameters.slice(0,4).every(p=>(p.transitionIn?.durationFrames??10)===10&&(p.transitionOut?.durationFrames??10)===10));
 rows[3].resourceId='wrong';effects=0;
 const bad=await authorNativeFinish(selects,input,plan);
 assert.equal(bad.status,'notSaved');assert.equal(effects,0);
 const generated=buildNativeFinishScript({...input,mode:'native-finish'});
 rows[3].resourceId=input.photos['ABCD'.indexOf(rows[3].slot)].resourceId;
 const generatedResult=await vm.runInNewContext(`(async()=>{${generated}})()`,{selects});
 assert.equal(generatedResult.status,'saved');
});
