import fs from 'node:fs';
import {lookPhaseFixture} from './mini_look_fixture.mjs';
import {archiveMusicFixture} from './archive_music_fixture.mjs';
const base=new URL('../plugins/archive-vlog/',import.meta.url),read=relative=>fs.readFileSync(new URL(relative,base),'utf8');
export async function archiveWorkflowFixture(t,{realFinish=false}={}){
 const phase=await lookPhaseFixture(t,{pluginId:'archive-vlog',assemblySource:read('scripts/assemble.js'),decorationSource:read('scripts/decorate.js'),probeName:'Archive source timing check'});
 const ui=await archiveMusicFixture(t,{entry:'panel',silent:true}),musicBoundary=ui.box.sdk.runScript;let result=null;
 phase.root.verifyAssemblySource=read('scripts/verify-assembly.js');
 phase.hooks.resources=[{resourceId:'r0',type:'Video'},{resourceId:'r1',type:'Video'}];
 const musicNodes=[];phase.hooks.sourceFiles=()=>({fileTree:[{type:'video',resourceId:'r0',path:phase.source},{type:'video',resourceId:'r1',path:phase.other},...musicNodes]});
 phase.hooks.importFiles=async({paths})=>{const resourceId='music-'+(musicNodes.length+1);phase.hooks.resources.push({resourceId,type:'Audio',durationSeconds:ui.cue.duration});musicNodes.push({resourceId,type:'audio',path:paths[0]});return {addedResourceIds:[resourceId]};};
 ui.inventory.resources[0].path=phase.source;ui.inventory.resources[1].path=phase.other;
 ui.plan.picks=[{rid:'r0',kind:'video',startSeconds:0,sourceDuration:20},{rid:'r1',kind:'video',startSeconds:0,sourceDuration:20}];
 Object.assign(ui.plan,{gridded:false,beatSeconds:1});ui.plan.schedule.beatsList=[1,1];
 Object.assign(ui.box,{sdk:phase.sdk,panelLocalClient:()=>phase.local,openTemplateAssemblyContinuations:(...args)=>phase.mount().openTemplateAssemblyContinuations(...args),setResult:value=>{result=typeof value==='function'?value(result):value;ui.box.result=result;}});
 Object.assign(ui.box.assets.scripts,{assembleJs:read('scripts/assemble.js'),verifyAssemblyJs:read('scripts/verify-assembly.js')});
 if(realFinish){
  ui.box.assets.presets=JSON.parse(read('assets/fonts/presets.json'));
  ui.box.assets.tsx=Object.fromEntries(Object.entries({title:'decode-title',credit:'archived-credit',letterbox:'letterbox-reveal',look:'cinematic-look',fade:'fade-out',motion:'photo-motion'}).map(([key,file])=>[key,read('assets/'+file+'.tsx')]));
  Object.assign(ui.box.assets.scripts,{decorateJs:read('scripts/decorate.js'),prepareJs:read('scripts/prepare-decoration.js')});
  ui.box.loadAssets=async()=>({...ui.box.assets,manifest:{cues:[ui.cue]}});ui.box.readText=async(_plugin,...parts)=>read(parts.join('/'));ui.box.avPreset=(presets,id)=>presets.presets.find(p=>p.id===id)||presets.presets[0];
  Object.assign(ui.box,{chosen:ui.box.assets.presets.presets[0],preset:'cinematic',titleFields:{kicker:'A DAY',title:'SATURDAY',tagline:'in the city'},motionOptionsFor:()=>['push-in','pull-out','drift-left','drift-right','drift-up','drift-down','tilt','push-drift'].map(value=>({label:value,value})),fontB64:async(_plugin,file)=>read('assets/fonts/'+file)});
 }else ui.box.prepareArchiveDecoration=(_sdk,value,assembly)=>phase.prepare(value,assembly);
 const ordinary=phase.sdk.runScript;phase.sdk.runScript=input=>['Find the chosen files','Read footage','Search shots'].includes(input.summary)?musicBoundary(input):ordinary(input);
 return {...phase,ui,result:()=>result,build:seed=>ui.box.api.build(seed??1),finish:()=>ui.box.api.finishTitle(),template:context=>ui.box.api.runArchiveVlogTemplate(phase.sdk,context,()=>{},()=>{})};
}
