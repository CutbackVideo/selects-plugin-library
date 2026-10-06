import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPanelOperation} from './panel_operation.mjs';
import {checkScriptTypes} from './run_script_types.mjs';

const {nativeScenePlan,buildNativeFinishScript}=loadPanelOperation('no14-still-video');

test('generated No.14 finish scripts pass TypeScript for default, boundary and fractional rates',()=>{
 const scripts=[];
 for(const fps of [undefined,null,'30',10,24000/1001,24,25,30000/1001,30,50,60000/1001,60,120,240]){
  for(const music of [null,{resourceId:'music'}]){
   const plan=nativeScenePlan(fps);
   const input={mode:'native-finish',projectId:'project',draftId:'draft',fps,music,
    photos:'ABCD'.split('').map(slot=>({resourceId:slot,path:`/${slot}.jpg`,width:640,height:960})),
    placements:plan.occurrences.map((o,i)=>({slot:o.slot,appearance:o.appearance,clipId:i,trackId:`image-${i}`,startFrame:o.startFrame,endFrame:o.endFrame}))};
   scripts.push({name:`No.14 fps=${fps}, music=${music!==null}`,script:buildNativeFinishScript(input)});
  }
 }
 const checked=checkScriptTypes(scripts);
 assert.equal(checked.scripts,28);
});
