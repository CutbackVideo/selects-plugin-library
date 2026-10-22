import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
const script=fs.readFileSync(new URL('../plugins/archive-vlog/scripts/decorate.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const textProgram={tsxCode:'export default function Title(){return null}',parameters:{text:'Saturday'},editableParameters:[{key:'text',label:'Text',type:'text',defaultValue:'Saturday'}]};
export function programFixture({minify=false}={}){
 const hooks={},log=[],rows=[{clipId:1,trackId:'main',trackKind:'main',resourceId:'v0',startFrame:0,endFrame:60,audioSourceIndexes:[0]}],graphics=[],effects=new Map();let epoch=0,commits=0;
 const fresh=row=>({...clone(row),_epoch:epoch}),target=row=>{assert.equal(row._epoch,epoch,'SDK targets must be reread after every edit');},changed=()=>{epoch++;};
 const d={meta:async()=>({fps:30,durationFrames:60,frameSize:{width:1920,height:1080}}),clips:async({trackScope}={})=>rows.filter(r=>trackScope!=='main'||r.trackKind==='main').map(fresh),rangeAtFrames:async(a,b)=>({startFrame:a,endFrame:b,_epoch:epoch}),
  clipSourceWindow:async row=>({clipId:row.clipId,startSeconds:row.sourceStartSeconds??0,endSeconds:(row.sourceStartSeconds??0)+(row.endFrame-row.startFrame)/30}),
  motionGraphics:async()=>graphics.map(g=>({name:g.name,clip:fresh(g.clip)})),motionGraphicProgram:async clip=>{target(clip);if(hooks.unavailable)throw Error('private TOKEN=secret');return clone(graphics.find(g=>g.clip.clipId===clip.clipId)?.program??null);},
  videoEffects:async clip=>{target(clip);return (effects.get(clip.clipId)??[]).map((e,i)=>({...clone(e),clipId:clip.clipId,trackId:clip.trackId,effectIndex:i,_epoch:epoch}));},
  videoEffectProgram:async effect=>{target(effect);return clone((effects.get(effect.clipId)??[])[effect.effectIndex]?.program??null);},
  addMotionGraphic:async options=>{target(options.within);log.push('graphic');if(!hooks.ignoreGraphic){graphics.push({name:options.label,clip:{clipId:100+graphics.length,trackId:'video',trackKind:'video',resourceId:null,startFrame:options.within.startFrame,endFrame:options.within.endFrame},program:{tsxCode:options.tsxCode,parameters:clone(options.parameters),editableParameters:clone(options.editableParameters)}});changed();}},
  addVideoEffect:async options=>{target(options.clip);log.push('effect');if(!hooks.ignoreEffect){const list=effects.get(options.clip.clipId)??[];list.push({name:options.label,effectName:options.label,enabled:true,program:{tsxCode:options.tsxCode,parameters:clone(options.parameters),editableParameters:clone(options.editableParameters)}});effects.set(options.clip.clipId,list);changed();}},
  setAudioTracks:async()=>{log.push('mute');for(const row of rows)row.audioSourceIndexes=[];changed();return {opCount:1};},
  commitAll:async()=>{commits++;log.push('commit');if(hooks.lost)throw Error('reply lost after save');return {createdDraftId:'d'};}};
 const cfg={sequenceId:'d',videoEnd:60,mute:false,title:{tsx:textProgram.tsxCode,parameters:clone(textProgram.parameters),editableParameters:clone(textProgram.editableParameters)},soft:null,photos:[]};
 const run=()=>{
  const selects={draft:id=>{assert.equal(id,'d');return d;}};
  if(!minify)return vm.runInNewContext('(async()=>{'+script+'})()',{__CONFIG__:cfg,selects});
  const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild'),module={exports:{}};
  vm.runInNewContext(esbuild.transformSync('module.exports=async()=>{'+script+'};',{loader:'js',minify:true,target:'es2022'}).code,{module,__CONFIG__:cfg,selects});return module.exports();
 };
 const title=()=>graphics.push({name:'Archive title',clip:{clipId:100,trackId:'video',trackKind:'video',resourceId:null,startFrame:0,endFrame:60},program:clone(textProgram)});
 const look=()=>{cfg.look={tsx:'export default function Look(){return null}',strength:.35,warmth:1};return {name:'Cinematic look',effectName:'Cinematic look',enabled:true,program:{tsxCode:cfg.look.tsx,parameters:{strength:.35,warmth:1},editableParameters:[{key:'strength',label:'Look strength',type:'number',defaultValue:.35,min:0,max:1,step:.05},{key:'warmth',label:'Warmth',type:'number',defaultValue:1,min:0,max:2,step:.1}]}};};
 return {d,cfg,rows,graphics,effects,hooks,log,title,look,run,commits:()=>commits};
}
