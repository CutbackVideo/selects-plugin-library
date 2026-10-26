import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';import {createRequire} from 'node:module';
const script=fs.readFileSync(new URL('../plugins/mini-vlog/scripts/decorate.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const textProgram={tsxCode:'export default function Title(){return null}',parameters:{text:'Saturday'},editableParameters:[{key:'text',label:'Text',type:'text',defaultValue:'Saturday'}]};
function fixture({minify=false}={}){
 const hooks={},log=[],rows=[{clipId:1,trackId:'main',trackKind:'main',resourceId:'v0',startFrame:0,endFrame:60,audioSourceIndexes:[0],_source:{startSeconds:0,endSeconds:2}}],graphics=[],effects=new Map();let epoch=0,commits=0;
 const fresh=row=>({...clone(row),_epoch:epoch}),target=row=>{assert.equal(row._epoch,epoch,'SDK targets must be reread after every edit');},changed=()=>{epoch++;};
 const d={meta:async()=>({fps:30,durationFrames:60,frameSize:{width:1920,height:1080}}),clips:async({trackScope}={})=>rows.filter(r=>trackScope!=='main'||r.trackKind==='main').map(fresh),rangeAtFrames:async(a,b)=>({startFrame:a,endFrame:b,_epoch:epoch}),
  motionGraphics:async()=>graphics.map(g=>({name:g.name,clip:fresh(g.clip)})),motionGraphicProgram:async clip=>{target(clip);if(hooks.unavailable)throw Error('private TOKEN=secret');return clone(graphics.find(g=>g.clip.clipId===clip.clipId)?.program??null);},
  videoEffects:async clip=>{target(clip);return (effects.get(clip.clipId)??[]).map((e,i)=>({...clone(e),clipId:clip.clipId,trackId:clip.trackId,effectIndex:i,_epoch:epoch}));},
  videoEffectProgram:async effect=>{target(effect);return clone((effects.get(effect.clipId)??[])[effect.effectIndex]?.program??null);},
  addMotionGraphic:async options=>{target(options.within);log.push('graphic');if(!hooks.ignoreGraphic){graphics.push({name:options.label,clip:{clipId:100,trackId:'video',trackKind:'video',resourceId:null,startFrame:options.within.startFrame,endFrame:options.within.endFrame},program:{tsxCode:options.tsxCode,parameters:clone(options.parameters),editableParameters:clone(options.editableParameters)}});changed();}},
  addVideoEffect:async options=>{target(options.clip);log.push('effect');if(!hooks.ignoreEffect){const list=effects.get(options.clip.clipId)??[];list.push({name:options.label,effectName:options.label,enabled:true,program:{tsxCode:options.tsxCode,parameters:clone(options.parameters),editableParameters:clone(options.editableParameters)}});effects.set(options.clip.clipId,list);changed();}},
  setAudioTracks:async()=>{log.push('mute');for(const row of rows)row.audioSourceIndexes=[];changed();return {opCount:1};},
  commitAll:async()=>{commits++;log.push('commit');if(hooks.lost)throw Error('reply lost after save');return {createdDraftId:'d'};}};
 const cfg={sequenceId:'d',videoEnd:60,mute:false,title:{tsx:textProgram.tsxCode,parameters:clone(textProgram.parameters),editableParameters:clone(textProgram.editableParameters)},soft:null,photos:[]};
 const run=()=>{
  // Actual saved-source observation is supplied independently of punch intent.
  cfg.__sources={revision:'fixture-saved-source',clips:rows.map(row=>({...row,source:{clipId:row.clipId,...row._source},playbackSpeed:1}))};
  const selects={draft:id=>{assert.equal(id,'d');return d;}};
  if(!minify)return vm.runInNewContext('(async()=>{'+script+'})()',{__CONFIG__:cfg,selects});
  const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild'),module={exports:{}};
  vm.runInNewContext(esbuild.transformSync('module.exports=async()=>{'+script+'};',{loader:'js',minify:true,target:'es2022'}).code,{module,__CONFIG__:cfg,selects});return module.exports();
 };
 const title=()=>graphics.push({name:'Mini vlog title',clip:{clipId:100,trackId:'video',trackKind:'video',resourceId:null,startFrame:0,endFrame:60},program:clone(textProgram)});
 const soft=()=>{cfg.soft={tsx:'export default function Soft(){return null}',strength:.35};return {name:'Soft look',effectName:'Soft look',enabled:true,program:{tsxCode:cfg.soft.tsx,parameters:{strength:.35},editableParameters:[{key:'strength',label:'Softness',type:'number',defaultValue:.35,min:0,max:1,step:.05}]}};};
 return {d,cfg,rows,graphics,effects,hooks,log,title,soft,run,commits:()=>commits};
}
for(const kind of ['parameters','source','controls','interval','duplicate'])test('Mini Finish: same-label '+kind+' title cannot count as the intended result',async()=>{
 const f=fixture();f.title();const g=f.graphics[0];if(kind==='parameters')g.program.parameters.text='Unrelated';if(kind==='source')g.program.tsxCode+='//different';if(kind==='controls')g.program.editableParameters[0].label='Wrong';if(kind==='interval')g.clip.endFrame=59;if(kind==='duplicate')f.title();
 await assert.rejects(f.run(),/program|graphic|title|intent/i);assert.equal(f.commits(),0);assert.deepEqual(f.log,[],'preflight before mutation');
});
for(const kind of ['parameters','source','controls','disabled','duplicate'])test('Mini Finish: same-label '+kind+' effect cannot count as complete',async()=>{
 const f=fixture();f.title();const e=f.soft();if(kind==='parameters')e.program.parameters.strength=.1;if(kind==='source')e.program.tsxCode+='//different';if(kind==='controls')e.program.editableParameters=[];if(kind==='disabled')e.enabled=false;f.effects.set(1,[e]);if(kind==='duplicate')f.effects.get(1).push(clone(e));
 await assert.rejects(f.run(),/program|effect|intent/i);assert.equal(f.commits(),0);assert.deepEqual(f.log,[]);
});
for(const kind of ['Graphic','Effect'])test('Mini Finish: an ignored '+kind+' write stops before commit',async()=>{
 const f=fixture();if(kind==='Effect')f.soft();f.hooks['ignore'+kind]=true;
 await assert.rejects(f.run(),/program|graphic|effect|intent/i);assert.equal(f.commits(),0);
});
test('Mini Finish: healthy repeats verify actual programs without another commit',async()=>{
 const f=fixture();f.soft();assert.equal((await f.run()).committed,true);assert.equal((await f.run()).alreadyDone,true);assert.equal(f.commits(),1);assert.equal(f.graphics.length,1);assert.equal(f.effects.get(1).length,1);
});
test('Mini Finish: muting cannot precede discovering an unrelated same-label title',async()=>{
 const f=fixture();f.title();f.graphics[0].program.parameters.text='Unrelated';f.cfg.mute=true;
 await assert.rejects(f.run(),/program|graphic|title|intent/i);assert.deepEqual(f.log,[]);assert.equal(f.commits(),0);
});
test('Mini Finish: a missing earlier punch cannot be appended after an existing Soft look',async()=>{
 const f=fixture();f.title();f.effects.set(1,[f.soft()]);f.cfg.punch={tsx:'export default function Punch(){return null}',strength:.5,push:.4,beatFrames:20,punchFrames:[],picks:[{rid:'v0',kind:'video',startSeconds:0,sourceDuration:10}]};
 await assert.rejects(f.run(),/order|prefix|program|intent/i);assert.equal(f.commits(),0);assert.deepEqual(f.log,[]);
});
test('Mini Finish: unreadable programs preserve private diagnostics as causes',async()=>{
 const f=fixture();f.title();f.hooks.unavailable=true;
 await assert.rejects(f.run(),e=>e.code==='IMAGE_PROGRAM_INVALID'&&!/TOKEN|secret/.test(e.message)&&/private/.test(e.cause?.message??''));assert.equal(f.commits(),0);
});
test('Mini Finish: capability failure stops before any authoring',async()=>{
 const f=fixture();delete f.d.motionGraphicProgram;await assert.rejects(f.run(),/Selects|program|verify/i);assert.deepEqual(f.log,[]);assert.equal(f.commits(),0);
});

import {miniMusicFixture} from './mini_music_fixture.mjs';
import {lookPhaseFixture} from './mini_look_fixture.mjs';
test('Mini selected entry: restart observes a late look save without importing or dispatching it again',async t=>{
 const f=await miniMusicFixture(t),phase=await lookPhaseFixture(t),log=await phase.open();await log.store(phase.root);
 let release;const hold=new Promise(resolve=>release=resolve);phase.hooks.commit=(_id,reason)=>/title and look/.test(reason)?hold:null;phase.hooks.lostEarly=true;
 f.box.openTemplateAssemblyContinuations=()=>phase.open();f.box.prepareMiniDecoration=phase.prepare;
 const context={projectId:'p',template:{runId:phase.root.scope.runId}};
 await assert.rejects(f.box.api.runMiniVlogTemplate(f.box.sdk,context,()=>{},()=>{}),e=>e.code==='TEMPLATE_RUN_PENDING'&&e.phase==='decoration'&&e.draftId==='d1');
 await assert.rejects(f.box.api.runMiniVlogTemplate(f.box.sdk,context,()=>{},()=>{}),e=>e.code==='TEMPLATE_RUN_PENDING');
 assert.equal(phase.requests.filter(r=>r.summary==='Decorate template with owned receipt').length,1);
 assert.equal(phase.commits(),2);assert.equal(f.imports.length,0);assert.equal(f.scripts.length,0);
 release();await Promise.all(phase.pending);phase.hooks.lostEarly=false;
 const done=await f.box.api.runMiniVlogTemplate(f.box.sdk,context,()=>{},()=>{});assert.equal(done.sequenceId,'d1');assert.equal(phase.commits(),2);
});
test('Mini programs: unrelated effect content and order are preserved',async()=>{
 const f=fixture(),foreign={name:'User blur',effectName:'User blur',enabled:true,program:null};f.effects.set(1,[clone(foreign)]);f.soft();await f.run();assert.deepEqual(f.effects.get(1)[0],foreign);assert.equal(f.effects.get(1)[1].name,'Soft look');await f.run();assert.equal(f.commits(),1);
});
test('Mini programs: defaulted control values match the actual resolved program',async()=>{
 const f=fixture();f.title();f.cfg.title.parameters={};assert.equal((await f.run()).alreadyDone,true);assert.equal(f.commits(),0);
});
test('Mini programs: a valid partial prefix is completed in the intended order',async()=>{
 const f=fixture();f.title();f.soft();f.cfg.punch={tsx:'export default function Punch(){return null}',strength:.5,push:.4,beatFrames:20,punchFrames:[],picks:[{rid:'v0',kind:'video',startSeconds:0,sourceDuration:10}]};
 f.effects.set(1,[{name:'Beat punch',effectName:'Beat punch',enabled:true,program:{tsxCode:f.cfg.punch.tsx,parameters:{strength:.5,push:.4,punches:[],beatFrames:20,sourceStartFrame:0,durationFrames:60},editableParameters:[{key:'strength',label:'Punch',type:'number',defaultValue:.5,min:0,max:1,step:.05}]}}]);
 const result=await f.run();assert.equal(result.punch.kept,1);assert.equal(result.effects,1);assert.deepEqual(f.effects.get(1).map(e=>e.name),['Beat punch','Soft look']);assert.equal(f.commits(),1);
});
test('Mini programs: minified generated operation retains verification and fresh targets',async()=>{
 const f=fixture({minify:true});f.soft();await f.run();assert.equal((await f.run()).alreadyDone,true);assert.equal(f.commits(),1);
});
test('Mini punch intent: effect origin uses the actual placed source window instead of repeating old crop arithmetic',async()=>{
 const f=fixture();f.rows[0]._source={startSeconds:3.2,endSeconds:5.2};f.cfg.punch={tsx:'export default function Punch(){return null}',strength:.5,push:.4,beatFrames:20,punchFrames:[],picks:[{rid:'v0',kind:'video',startSeconds:3.219,sourceDuration:20}]};
 await f.run();assert.equal(f.effects.get(1)[0].program.parameters.sourceStartFrame,96);
});
