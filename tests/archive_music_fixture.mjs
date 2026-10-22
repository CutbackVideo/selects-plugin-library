import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {webcrypto,createHash} from 'node:crypto';
import {holdFixture} from './gallery_hold_fixture.mjs';
import {topLevel} from './windows_host.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const panel=fs.readFileSync(new URL('../plugins/archive-vlog/panel.tsx',import.meta.url),'utf8');
const plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',target:'es2022',jsx:'preserve'}).code;
const nested=plain.replace(/^  /gm,'');
const names=['templateStateJSON','templateRunIssue','avLookStrength','readInventoryPages','isInventorySnapshotCurrent','selectedPhotoRidsOf','fill','runTemplateStep','nativeImageRun','templateFootage','templateIssue','validateTemplateMediaResult','avAssembleConfig','fontFiles','snapshotArchiveFinishAssets','prepareArchiveDecoration','archiveRecoveryOptions','confirmArchiveSourceBindings','archiveWorkflowResult','runArchiveVlogTemplate'];
const source=names.map(name=>topLevel(plain,name)).join('\n')+'\n'+['inventoryCurrent','runLive','endRun','run','openAssemblyContinuations','finishAssembly','decorate','finishTitle','build'].map(name=>topLevel(nested,name)).join('\n');
const block=name=>panel.slice(panel.indexOf('// '+name+':start'),panel.indexOf('// '+name+':end')).replace(/^export /gm,'');
const adapter=plain.includes('function prepareArchiveCue(')?topLevel(plain,'prepareArchiveCue'):'';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const boundary=Object.assign(Error('Assembly intentionally outside this music-boundary fixture'),{boundary:true,outcome:'notSaved'});

// Actual panel Build/headless callers, canonical file client, asset owner and
// shipped Audio operation. Catalog/scene planning are explicit test boundaries;
// the fixture stops before a Draft is created or saved.
export async function archiveMusicFixture(t,{entry='template',own=false,silent=false}={}){
 const f=await holdFixture(t);
 f.files.fingerprint=async p=>fs.existsSync(p)?{size:fs.statSync(p).size,sha256:digest(fs.readFileSync(p))}:null;
 const manifest=JSON.parse(fs.readFileSync(new URL('../plugins/archive-vlog/assets/cues/manifest.json',import.meta.url),'utf8'));
 const cue={...manifest.cues[0]},bytes=fs.readFileSync(new URL('../plugins/archive-vlog/assets/cues/'+cue.file,import.meta.url));
 cue.bytes=bytes.length;manifest.cues=[cue];
 const plugin=path.join(f.root,'installed','archive-vlog'),file=path.join(plugin,'assets','cues',cue.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);
 const resources=[],nodes=[],imports=[],scripts=[],saved=[],errors=[],hooks=f.hooks;let live=true;
 const inventory={resources:[{rid:'r0',path:f.source,duration:20,analysed:true},{rid:'r1',path:f.other,duration:20,analysed:true}],photos:[],skipped:{}};
 const project={resources:async()=>[...inventory.resources.map(row=>({resourceId:row.rid,type:'Video'})),...resources],sourceFiles:async()=>({fileTree:[...inventory.resources.map(row=>({type:'video',resourceId:row.rid,path:row.path})),...nodes]}),importFiles:async({paths})=>{
  imports.push(...paths);const resourceId='music-'+imports.length;resources.push({resourceId,type:'Audio',durationSeconds:hooks.duration??cue.duration});nodes.push({resourceId,type:'audio',path:paths[0]});if(hooks.imported)await hooks.imported(paths[0]);if(hooks.lost)throw Error('completed import reply lost');return {addedResourceIds:[resourceId]};
 }};
 const scriptsByName={inventoryJs:'return __CONFIG__;',searchJs:'return __CONFIG__;',ensureJs:fs.readFileSync(new URL('../plugins/archive-vlog/scripts/ensure-audio.js',import.meta.url),'utf8'),assembleJs:'// @template-assembly 1\nreturn __CONFIG__;',decorateJs:'// @template-decoration 1\nreturn __CONFIG__;',prepareJs:'// @template-decoration-config 1\nreturn __CONFIG__;',verifyAssemblyJs:'// @template-assembly-verification 1\nreturn __CONFIG__;'};
 const presets={metrics:{},presets:[{id:'preset',label:'Preset',fields:[],colors:{title:'#fff',text:'#fff'}}]},plan={ok:true,picks:[{rid:'r0'},{rid:'r1'}],shots:2,musicShots:2,schedule:{cuts:[0,1,2]}};
 const selects={project:()=>project,files:f.files};
 const sdk={files:f.local.files,environment:{platform:process.platform},runScript:async input=>{
  scripts.push(input);
  if(input.summary==='Find the chosen files')return {result:{resolved:[{rid:'original-0',alias:'r0',size:null},{rid:'original-1',alias:'r1',size:null}],failed:[]}};
  if(input.summary==='Read footage'){
   const cfg=await new Function('return (async()=>{'+input.script+'})();')();
   const all=inventory.resources.map(row=>({...row,kind:'video'})),rows=cfg.page?all.slice(cfg.page.offset,cfg.page.offset+cfg.page.size):all;
   return {result:{...inventory,incomplete:false,resources:rows,photos:[],...(cfg.page?{page:{total:all.length,elapsedMs:0}}:{})}};
  }
  if(input.summary==='Search shots')return {result:{candidates:[],failed:[]}};
  if(input.summary.startsWith('Assemble')){saved.push(await new Function('return (async()=>{'+input.script+'})();')());throw boundary;}
  try{return {result:await new Function('selects','return (async()=>{'+input.script+'})();')(selects)};}catch(error){return {isError:true,output:error.message};}
 }};
 const stopped=Object.assign(Error('run detached'),{stopped:true}),check=()=>{if(!live)throw stopped;},noop=()=>{},busyRef={current:false};
 const globals={AbortController,console:{warn:noop,info:noop},TextDecoder,TextEncoder,Uint8Array,crypto:webcrypto,setTimeout,clearTimeout,
  panelLocalClient:value=>value,PLUGIN_ID:'archive-vlog',PLUGIN_VERSION:'fixture',AMBIENT_DB:-18,MUSIC_FADE_OUT:1,LOOK_STRENGTH:.3,READ_TIMEOUT_SECONDS:30,BUSY_BACKOFF_MS:[],isBusyError:()=>false,
  DEFAULT_CUE:cue.id,DEFAULT_LENGTH:'standard',DEFAULT_PACE:'cinematic',DEFAULT_CLIP_SOUND:'ambient',TEMPLATE_ALIAS_BATCH:6,TEMPLATE_ALIAS_JS:'return __CONFIG__;',TEMPLATE_SEED:1,SEARCH_BATCH:6,INVENTORY_MEASURE_MS:1,EMPTY_READ:/never/,
  pjoin:path.join,uiLang:()=> 'en',t:(_lang,key)=>key,uiError:say=>Error(say('en')),errorText:error=>error.message,locateRoots:async()=>({plugin,data:f.data}),loadAssets:async()=>({manifest,presets,scripts:scriptsByName,tsx:{title:'TITLE',credit:'CREDIT',letterbox:'BOX',look:'LOOK',fade:'FADE',motion:'MOTION'}}),
  avPreset:()=>presets.presets[0],cueGrid:()=>({bpm:72,accepted:true,usableEnd:cue.duration}),musicFit:()=>({snap:value=>value,defaultSection:()=>0,fitted:2,requested:2,gridded:true}),fieldClip:value=>value,
  avMotionBonus:value=>value,avSizesOf:()=>({}),avShotCandidates:()=>[],photoCandsOf:()=>[],avPlanBuild:()=>plan,draftNameOf:()=> 'Archive fixture',adjustLabelsFor:()=>({}),motionOptionsFor:()=>[],AV_QUERIES:{},
  runEpochRef:{current:0},setStep:noop,setProgress:noop,progressRef:{current:null},sdk,busyRef,assets:{scripts:scriptsByName,presets,tsx:{title:'TITLE',credit:'CREDIT',letterbox:'BOX',look:'LOOK',fade:'FADE',motion:'MOTION'}},inventory,roots:{plugin,data:f.data},chosen:presets.presets[0],seed:1,blockReason:null,anotherBlock:null,projectId:'p',projectRef:{current:'p'},mountedRef:{current:true},inventorySnapshotRef:{current:{projectId:'p',inventory}},invLoadingRef:{current:null},
  preset:'preset',titleFields:{},creditUsed:false,prefixText:'',nameText:'',clipSound:'ambient',look:true,strength:.5,usePhotos:false,only:null,onlyPhotos:null,musicKind:silent?'none':own?'own':'cue',ownMusic:own?{path:file}:null,ownGrid:own?{sourceObservation:{path:file,size:bytes.length,sha256:digest(bytes)}}:null,cueId:cue.id,cue,musicStart:0,pace:'cinematic',length:'standard',fit:{requested:2},L:'en',tempo:72,grid:{bpm:72,accepted:true,usableEnd:cue.duration},snapCuts:{},assemblyPendingRef:{current:{}},setAssemblyDiscovery:noop,fontB64:async()=>'',
  candidates:{key:'p|null',failed:[],local:[],list:[]},
  // Durable save recovery has separate integration cases; this fixture tests only
  // music admission up to dispatch, never a real save or recovery.
  setBusy:noop,setStatus:noop,setResult:noop,stopPreview:noop,advance:noop,stopAt:error=>()=>{errors.push(error);return error.message;},STALE:stopped,
 };
 globals.setStatus=value=>{if(value?.tone==='error')value.say('en');};
 // Discovery/authoring is an explicit no-save boundary here. Real durable
 // storage and saved-state readback run in Archive workflow fixtures.
 globals.openTemplateAssemblyContinuations=async()=>({read:async(runId=null)=>{const p=globals.assemblyPendingRef.current.p;return p&&(runId===null||p.scope.runId===runId)?p:null;},
  workflow:async pending=>{globals.assemblyPendingRef.current.p=pending;const reply=await sdk.runScript({summary:'Assemble Archive Vlog',allowCommit:true,script:pending.source.replace('__CONFIG__',()=>JSON.stringify(pending.config))});if(reply.isError)throw Error(reply.output);return reply.result;}});
 const box=vm.createContext(globals);vm.runInContext(block('native-image-input')+'\n'+block('bundled-assets')+'\n'+adapter+'\n'+source+'\nthis.api={runArchiveVlogTemplate,build,decorate,finishTitle,snapshotArchiveFinishAssets,prepareArchiveDecoration};',box);
 const run=async()=>{
  if(entry==='panel'){await box.api.build(1);return saved.at(-1);}
  try{await box.api.runArchiveVlogTemplate(sdk,{projectId:'p',template:{runId:webcrypto.randomUUID(),inputs:{footage:[{resourceId:'original-0',kind:'video'},{resourceId:'original-1',kind:'video'}]},options:{}}},check,noop);}catch(error){if(!error.boundary)throw error;}
  return saved.at(-1);
 };
 return {...f,run,cue,file,bytes,imports,resources,nodes,scripts,saved,errors,hooks,digest,inventory,plan,box,project,stop:()=>{live=false;globals.projectRef.current='detached';},ownedPath:()=>path.join(f.root,'.selects','plugin-data','archive-vlog','assets',cue.sha256+'.mp3')};
}
