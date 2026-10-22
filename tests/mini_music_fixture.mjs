import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {webcrypto,createHash} from 'node:crypto';
import {holdFixture} from './gallery_hold_fixture.mjs';
import {topLevel} from './windows_host.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const panel=fs.readFileSync(process.env.MINI_MUSIC_PANEL||new URL('../plugins/mini-vlog/panel.tsx',import.meta.url),'utf8');
const plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',target:'es2022',jsx:'preserve'}).code;
const nested=plain.replace(/^  /gm,'');
const names=['isInventorySnapshotCurrent','selectedPhotoRidsOf','fill','runTemplateStep','nativeImageRun','templateFootage','templateIssue','validateTemplateMediaResult','runMiniVlogTemplate'];
const source=names.map(name=>topLevel(plain,name)).join('\n')+'\n'+topLevel(nested,'inventoryCurrent')+'\n'+topLevel(nested,'run')+'\n'+topLevel(nested,'build');
const feature=panel.includes('// bundled-assets:start')?panel.slice(panel.indexOf('// bundled-assets:start'),panel.indexOf('// bundled-assets:end')):'';
const inputFeature=panel.slice(panel.indexOf('// native-image-input:start'),panel.indexOf('// native-image-input:end')).replace(/^export /gm,'');
const adapter=plain.includes('function prepareMiniCue(')?topLevel(plain,'prepareMiniCue'):'';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const boundary=Object.assign(Error('Assembly intentionally outside this music-boundary fixture'),{boundary:true});
export async function miniMusicFixture(t,{entry='template',own=false,silent=false}={}){
 const f=await holdFixture(t),plugin=path.join(f.root,'installed','mini-vlog'),file=path.join(plugin,'assets','cues','cue.mp3');fs.mkdirSync(path.dirname(file),{recursive:true});
 const bytes=Buffer.from('selected cue bytes'),cue={id:'cue',file:'cue.mp3',bytes:bytes.length,sha256:digest(bytes),duration:60,bpm:110};fs.writeFileSync(file,bytes);
 const resources=[],nodes=[],imports=[],scripts=[],saved=[],errors=[],hooks=f.hooks;let live=true;
 const project={resources:async()=>resources,sourceFiles:async()=>({fileTree:nodes}),importFiles:async({paths})=>{
  imports.push(...paths);const resourceId='music-'+imports.length;resources.push({resourceId,type:'Audio',durationSeconds:hooks.duration??60});nodes.push({resourceId,type:'audio',path:paths[0]});if(hooks.imported)await hooks.imported(paths[0]);if(hooks.lost)throw Error('completed import reply lost');return {addedResourceIds:[resourceId]};
 }};
 const inventory={resources:[{rid:'r0',duration:20,analysed:true},{rid:'r1',duration:20,analysed:true}],photos:[],skipped:{}};
 const scriptsByName={inventoryJs:'return __CONFIG__;',searchJs:'return __CONFIG__;',ensureJs:fs.readFileSync(new URL('../plugins/mini-vlog/scripts/ensure-audio.js',import.meta.url),'utf8'),assembleJs:'return __CONFIG__;',decorateJs:'return __CONFIG__;'};
 const presets={presets:[{id:'preset',label:'Preset'}]},manifest={cues:[cue]},plan={ok:true,picks:[{rid:'r0'},{rid:'r1'}],shots:2,schedule:{cuts:[0,1,2]}};
 const selects={project:()=>project,files:f.files};
 const sdk={files:f.local.files,environment:{platform:process.platform},runScript:async input=>{
  scripts.push(input);
  if(input.summary==='Find the chosen files')return {result:{resolved:[{rid:'original-0',alias:'r0',size:null},{rid:'original-1',alias:'r1',size:null}],failed:[]}};
  if(input.summary==='Read footage')return {result:inventory};
  if(input.summary==='Search shots')return {result:{candidates:[],failed:[]}};
  if(input.summary.startsWith('Assemble')){saved.push(await new Function('return (async()=>{'+input.script+'})();')());throw boundary;}
  try{return {result:await new Function('selects','return (async()=>{'+input.script+'})();')(selects)};}catch(error){return {isError:true,output:error.message};}
 }};
 const check=()=>{if(!live)throw stopped;},stopped=Object.assign(Error('run detached'),{stopped:true});
 const noop=()=>{},busyRef={current:false};
 const globals={console:{warn:noop,info:noop},TextDecoder,TextEncoder,Uint8Array,crypto:webcrypto,setTimeout,clearTimeout,
  panelLocalClient:value=>value,PLUGIN_ID:'mini-vlog',DEFAULT_CUE:'cue',PREFERRED_CUE:'cue',DEFAULT_PRESET:'preset',DEFAULT_LENGTH:'standard',DEFAULT_PACE:'quick',DEFAULT_PUNCH:true,DEFAULT_HOOK:false,
  TEMPLATE_ALIAS_BATCH:6,TEMPLATE_ALIAS_JS:'return __CONFIG__;',EMPTY_READ:/never/,TEMPLATE_SEED:1,INVENTORY_MEASURE_MS:1,SEARCH_BATCH:6,MV_QUERIES:[],MV_LENGTHS:{standard:2},MV_FAIL:{},AMBIENT_DB:-18,
  hostJoin:path.join,uiLang:()=> 'en',t:(_lang,key)=>key,uiError:say=>Error(say('en')),locateRoots:async()=>({plugin,data:f.data}),
  readText:async(_root,rel)=>rel==='assets/cues/manifest.json'?JSON.stringify(manifest):rel==='assets/fonts/presets.json'?JSON.stringify(presets):rel==='scripts/ensure-audio.js'?scriptsByName.ensureJs:'return __CONFIG__;',
  cueGrid:()=>({bpm:110,accepted:true,firstBeat:0,usableEnd:59}),mvGridUsable:()=>true,mvApproxTempo:()=>null,mvBeatsPerShot:()=>({beats:2}),mvShotSeconds:()=>1,mvFitShots:()=>2,mvSnapSection:({value})=>value,mvDefaultSection:()=>0,
  mvSearchQueries:()=>[],mvMotionBonus:value=>value,photoCandsOf:()=>[],mvPlanBuild:()=>plan,stamp:()=> 'fixture',
  sdk,context:{projectId:'p'},busyRef,assets:{scripts:scriptsByName},inventory,roots:{plugin,data:f.data},chosen:presets.presets[0],seed:1,blockReason:null,anotherBlock:null,projectId:'p',projectRef:{current:'p'},mountedRef:{current:true},inventorySnapshotRef:{current:{projectId:'p',inventory}},invLoadingRef:{current:null},
  preset:'preset',titleFields:{},musicKind:silent?'none':own?'own':'cue',ownMusic:own?{path:file}:null,cueId:'cue',cue,musicStart:0,pace:'quick',length:'standard',requested:2,clipSound:'ambient',soft:true,beatPunch:true,hook:false,gridded:true,grid:{bpm:110,accepted:true},usePhotos:true,only:null,onlyPhotos:null,snapCuts:{},
  candidates:{key:'p|null|motion',failed:[],scene:[],list:[],local:{results:[],unavailable:false}},
  setBusy:noop,setStatus:value=>{if(value?.tone==='error')errors.push(value.say('en'));},setResult:noop,stopPreview:noop,advance:noop,stopAt:error=>()=>{errors.push(error);return error.message;},endRun:()=>{busyRef.current=false;},CANCELLED:Symbol('cancelled'),STALE:stopped,
 };
 const box=vm.createContext(globals);vm.runInContext(inputFeature+'\n'+feature+'\n'+adapter+'\n'+source+'\nthis.api={runMiniVlogTemplate,build};',box);
 const run=async()=>{
  if(entry==='panel'){await box.api.build(1);return saved.at(-1);}
  try{await box.api.runMiniVlogTemplate(sdk,{projectId:'p',template:{inputs:{footage:[{resourceId:'original-0',kind:'video'},{resourceId:'original-1',kind:'video'}]},options:{}}},check,noop);}catch(error){if(!error.boundary)throw error;}
  return saved.at(-1);
 };
 return {...f,run,cue,file,bytes,imports,resources,nodes,scripts,saved,errors,hooks,digest,inventory,plan,box,project,stop:()=>{live=false;globals.projectRef.current='detached';},ownedPath:()=>path.join(f.root,'.selects','plugin-data','mini-vlog','assets',cue.sha256+'.mp3')};
}
