import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
const source=fs.readFileSync(new URL('../plugins/jude-kinetic-style/panel.tsx',import.meta.url),'utf8');
for(const music of [undefined,false,true])test(`pipeline preserves original audio and adds bundled music only on explicit true (${music})`,async()=>{
 let added=0;const scripts=[];
 const words=Array.from({length:4},(_,i)=>({text:'word',startFrame:i*24,endFrame:(i+1)*24}));
 const api=loadPanelModule(source,{names:['runPipeline'],overrides:{
  judeAttached:()=>{},readDraft:async()=>({words,files:{},mains:[],fps:24,endFrame:96}),probeFrameSizes:async()=>{},validatePlan:()=>[],
  placements:()=>({captions:[],cards:[],shots:[],behind:[]}),hostJoin:(...parts)=>parts.join('/'),hostNeed:()=>({mkdir:async()=>{}}),
  judeSharedCaptionFaces:async()=>({}),judeProtectObservedFaces:async()=>({}),placeMusic:async()=>{added++;return{shortBySeconds:0}},
 }});
 try{await api.runPipeline({dataDir:'/test',status:()=>{},writeText:async()=>{},runScript:async(script)=>{scripts.push(script);return 1}},'p','d',{copy:false,planOverride:{},...(music===undefined?{}:{music})});assert.equal(added,music===true?1:0);assert.ok(scripts.every(s=>!s.includes('setAudioTracks')&&!s.includes('removeClips((await d.clips')),'source audio is not muted or removed');}finally{disposePanelModule(api)}
});
test('gallery offers the same explicit background music choice as the manual panel',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../plugins/jude-kinetic-style/plugin.json',import.meta.url)));
 const option=manifest.options?.find(x=>x.id==='music');assert.ok(option);assert.equal(option.default,'none');assert.deepEqual(option.choices.map(x=>x.id),['none','bundled']);
 assert.match(source,/music:.*context\.template\.options/);assert.match(source,/<ui.Select label="Background music"/);
});
