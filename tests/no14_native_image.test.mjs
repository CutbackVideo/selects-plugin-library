import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadPanelOperation} from './panel_operation.mjs';

const {buildNativeFinishScript,normalizeNativeFinish,authorNativeFinish,nativeScenePlan,transitionCoefficients}=loadPanelOperation('no14-still-video');

const panelPath=path.resolve(import.meta.dirname,'../plugins/no14-still-video/panel.tsx');
const panelSource=fs.readFileSync(panelPath,'utf8');
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
// Native selection and placement are tested through runScript in native_image_sdk_migration.test.mjs.

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
