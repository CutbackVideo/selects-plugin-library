import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('Chris cleanup removes only its legacy flash effect and patches its parameters through Draft commands',async()=>{
 const source=fs.readFileSync(new URL('../plugins/chris-williamson-style/src/panel.template.tsx',import.meta.url),'utf8');
 const start=source.indexOf('// legacy-cleanup-sdk:start'),end=source.indexOf('// legacy-cleanup-sdk:end');
 assert.ok(start>=0&&end>start,'canonical cleanup script is present');
 const {cleanLegacyDraft}=vm.runInThisContext(`(()=>{${source.slice(start,end).replace('export async function','async function')}return {cleanLegacyDraft};})()`);
 let revision=0,commits=0;
 const effects=[{name:'Chris · Double inversion',parameters:{}},{name:'Chris · Keywords',parameters:{flashFrames:[10],flashEnabled:true,title:'Keep'}},{name:'Other effect',parameters:{flashFrames:[9]}}];
 const graphic={parameters:{windowsSeconds:[1],flashes:[2],title:'Keep'}};
 const row=()=>({clipId:1,trackKind:'video',revision});
 const check=target=>assert.equal(target.revision,revision,'mutation target is fresh');
 const draft={clips:async()=>[row()],videoEffects:async clip=>{check(clip);return effects.map((effect,effectIndex)=>({...effect,effectIndex,revision}));},
  videoEffectProgram:async effect=>{check(effect);return {tsxCode:'export default()=>null',parameters:effect.parameters};},
  removeVideoEffect:async effect=>{check(effect);effects.splice(effect.effectIndex,1);revision++;},
  replaceVideoEffect:async(effect,program)=>{check(effect);effects[effect.effectIndex].parameters=program.parameters;revision++;},
  motionGraphics:async()=>[{name:'Chris · Graphic',clip:row()}],motionGraphicProgram:async clip=>{check(clip);return graphic;},
  setMotionGraphicParameters:async({clip,parameters})=>{check(clip);graphic.parameters=parameters;revision++;},
  commitAll:async()=>{commits++;return {commitId:'c'};}};
 const selects={project:()=>({meta:async()=>({draftIds:['draft']})}),draft:()=>draft};
 const result=await cleanLegacyDraft(selects,{projectId:'p',draftId:'draft',prefix:'Chris · '});
 assert.equal(commits,1);assert.equal(result.changed,3);
 assert.deepEqual(effects.map(e=>e.name),['Chris · Keywords','Other effect']);
 assert.deepEqual(effects[0].parameters,{flashFrames:[],flashEnabled:false,title:'Keep'});
 assert.deepEqual(effects[1].parameters,{flashFrames:[9]});
 assert.deepEqual(graphic.parameters,{windowsSeconds:[],flashes:[],title:'Keep'});
});
