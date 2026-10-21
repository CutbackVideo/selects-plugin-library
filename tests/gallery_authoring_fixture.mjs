import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fixture as photoProject} from './photo_authoring_fixture.mjs';

const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const cache=new Map();
export function galleryFixture({minify=false,mix='mixed',music=true,...faults}={}){
 const f=photoProject('polaroid-photo-dump',faults);
 for(const r of f.resources.filter(r=>r.type==='Audio'))r.durationSeconds=60;
 for(const n of f.nodes.filter(n=>n.type==='audio'))n.durationSeconds=60;
 const videos=Array.from({length:6},(_,i)=>({resourceId:'v'+i,name:'Video '+i,path:'/videos/'+i+'.mp4',kind:'video',width:640,height:960,durationFrames:3600}));
 for(const v of videos){f.resources.push({...v,type:'Video',durationSeconds:60});f.nodes.push({...v,type:'video',frameSize:{width:v.width,height:v.height},durationSeconds:60});}
 const photos=f.photos.map(p=>({...p,kind:'image',width:640,height:960}));
 let pi=0,vi=0;const videoSlots=new Set([4,6,11,17,19,21]);
 const media=Array.from({length:21},(_,i)=>({...mix==='video'||mix==='mixed'&&videoSlots.has(i+1)?videos[vi++%6]:photos[pi++%17],focusX:.5,focusY:.5}));
 const input={operation:'create',projectId:'p',name:'Photo Grid Reveal',durationFrames:853,manualBpm:113,media,music:music?{resourceId:'a0',path:'/audio/Sound 0.wav',durationFrames:3600,startFrame:0}:null};
 f.selects.media={probe:async({filePaths})=>({files:filePaths.map(path=>({path})),errors:[],summary:{failed:0}})};
 f.sdk.maxScriptTimeoutSeconds=120;
 const sourceBytes=new Map([...f.photos,...videos].map(item=>[item.path,Buffer.alloc(32,7)]));
 const stat=f.selects.files.stat;
 f.selects.files.fingerprint=async path=>{
  const info=await (f.selects.files.stat??stat)(path);if(info===null)return null;
  const bytes=sourceBytes.get(path)??Buffer.alloc(info.size,11);
  return {size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 };
 const observed=[],key=String(minify),filename=process.env.GALLERY_AUTHORING_PANEL||new URL('../plugins/photo-gallery-no2/panel.tsx',import.meta.url);
 if(!cache.has(key)){
  const source=fs.readFileSync(filename,'utf8')+`\nexport function __create(sdk,input,options){return buildGalleryDraft(sdk,STRINGS.en,{input,...options});}`;
  const module={exports:{}};vm.runInNewContext(esbuild.transformSync(source,{loader:'tsx',format:'cjs',target:'es2022',jsx:'automatic',minify}).code,{module,exports:module.exports,require:name=>name==='react'?{}:{jsx:()=>null},console,TextEncoder,TextDecoder,Uint8Array,setTimeout,clearTimeout});
  cache.set(key,module.exports.__create);
 }
 const create=async(options={})=>cache.get(key)(f.sdk,structuredClone(options.input||input),{isCurrent:f.args.stillCurrent,onDispatched:()=>{},onDraft:draftId=>observed.push({draftId,visuals:f.saved.get(draftId)?.clips.filter(c=>c.trackKind==='video'&&c.resourceId).length}),...options});
 return {...f,input,create,observed,sourceBytes};
}
