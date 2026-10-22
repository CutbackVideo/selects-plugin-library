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
const names=['readInventoryPages','isInventorySnapshotCurrent','selectedPhotoRidsOf','fill','runTemplateStep','nativeImageRun','templateFootage','templateIssue','validateTemplateMediaResult','templateStateJSON','presetFonts','snapshotMiniFinishAssets','prepareMiniDecoration','miniWorkflowResult','miniAssemblyRecoveryOptions','confirmMiniSourceBindings','admitMiniMusic','mvWithLocal','MV_LOCAL_CONCURRENCY','MV_LOCAL_BUDGET_MS','runMiniVlogTemplate'];
const source=names.filter(name=>!['templateStateJSON','snapshotMiniFinishAssets','prepareMiniDecoration','miniWorkflowResult','miniAssemblyRecoveryOptions','confirmMiniSourceBindings','admitMiniMusic'].includes(name)||plain.includes('function '+name+'(')).map(name=>topLevel(plain,name)).join('\n')+'\n'+topLevel(nested,'inventoryCurrent')+'\n'+topLevel(nested,'runLive')+'\n'+topLevel(nested,'endRun')+'\n'+topLevel(nested,'run')+'\n'+topLevel(nested,'finishAssembly')+'\n'+topLevel(nested,'decorate')+'\n'+topLevel(nested,'finishTitle')+'\n'+topLevel(nested,'build');
const feature=panel.includes('// bundled-assets:start')?panel.slice(panel.indexOf('// bundled-assets:start'),panel.indexOf('// bundled-assets:end')):'';
const analysisFeature=panel.includes('// clip-analysis:start')?panel.slice(panel.indexOf('// clip-analysis:start'),panel.indexOf('// clip-analysis:end')):'';
const observationFeatures=['file-observation','draft-observation'].map(name=>panel.slice(panel.indexOf('// '+name+':start'),panel.indexOf('// '+name+':end')).replace(/^export /gm,'')).join('\n');
const inputFeature=panel.slice(panel.indexOf('// native-image-input:start'),panel.indexOf('// native-image-input:end')).replace(/^export /gm,'');
const adapter=plain.includes('function prepareMiniCue(')?topLevel(plain,'prepareMiniCue'):'';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const boundary=Object.assign(Error('Assembly intentionally outside this music-boundary fixture'),{boundary:true,outcome:'notSaved'});
export async function miniMusicFixture(t,{entry='template',own=false,silent=false}={}){
 const f=await holdFixture(t);
 const plugin=path.join(f.root,'installed','mini-vlog'),file=path.join(plugin,'assets','cues','cue.mp3');fs.mkdirSync(path.dirname(file),{recursive:true});
 const bytes=Buffer.from('selected cue bytes'),cue={id:'cue',file:'cue.mp3',bytes:bytes.length,sha256:digest(bytes),duration:60,bpm:110};fs.writeFileSync(file,bytes);
 const resources=[],nodes=[],imports=[],scripts=[],saved=[],errors=[],hooks=f.hooks;let live=true;
 const project={resources:async()=>resources,sourceFiles:async()=>({fileTree:[...inventory.resources.filter(r=>r.path).map(r=>({type:'video',resourceId:r.rid,path:r.path})),...nodes]}),importFiles:async({paths})=>{
  imports.push(...paths);const resourceId='music-'+imports.length;resources.push({resourceId,type:'Audio',durationSeconds:hooks.duration??60});nodes.push({resourceId,type:'audio',path:paths[0]});if(hooks.imported)await hooks.imported(paths[0]);if(hooks.lost)throw Error('completed import reply lost');return {addedResourceIds:[resourceId]};
 }};
 const inventory={resources:[{rid:'r0',path:f.source,duration:20,analysed:true},{rid:'r1',path:f.other,duration:20,analysed:true}],photos:[],skipped:{}};
 const scriptsByName={inventoryJs:'return __CONFIG__;',searchJs:'return __CONFIG__;',ensureJs:fs.readFileSync(new URL('../plugins/mini-vlog/scripts/ensure-audio.js',import.meta.url),'utf8'),assembleJs:'return __CONFIG__;',decorateJs:'// @template-decoration 1\nreturn __CONFIG__;'};
 const presets={metrics:{},presets:[{id:'preset',label:'Preset',fields:[],colors:{primary:'#fff',secondary:'#000'}}]},manifest={cues:[cue]},plan={ok:true,picks:[{rid:'r0'},{rid:'r1'}],shots:2,schedule:{cuts:[0,1,2]}};
 const selects={project:()=>project,files:f.files};
 const sdk={files:f.local.files,environment:{platform:process.platform},runScript:async input=>{
  scripts.push(input);
  if(input.summary==='Find the chosen files')return {result:{resolved:[{rid:'original-0',alias:'r0',size:null},{rid:'original-1',alias:'r1',size:null}],failed:[]}};
  if(input.summary==='Read footage'){
   const cfg=await new Function('return (async()=>{'+input.script+'})();')();
   const all=[...inventory.resources.map(row=>({...row,kind:'video'})),...inventory.photos.map(row=>({...row,kind:'photo'}))];
   const rows=cfg.page?all.slice(cfg.page.offset,cfg.page.offset+cfg.page.size):all;
   return {result:{...inventory,incomplete:inventory.incomplete??false,resources:rows.filter(row=>row.kind==='video'),photos:rows.filter(row=>row.kind==='photo'),...(cfg.page?{page:{total:all.length,elapsedMs:0}}:{})}};
  }
  if(input.summary==='Search shots')return {result:{candidates:[],failed:[]}};
  if(input.summary.startsWith('Assemble')){saved.push(await new Function('return (async()=>{'+input.script+'})();')());throw boundary;}
  try{return {result:await new Function('selects','return (async()=>{'+input.script+'})();')(selects)};}catch(error){return {isError:true,output:error.message};}
 }};
 const check=()=>{if(!live)throw stopped;},stopped=Object.assign(Error('run detached'),{stopped:true});
 const noop=()=>{},busyRef={current:false};
 const globals={AbortController,console:{warn:noop,info:noop},TextDecoder,TextEncoder,Uint8Array,crypto:webcrypto,setTimeout,clearTimeout,
  // This music/native boundary fixture stops at assembly dispatch. The real
  // durable owner and actual assembly script run in mini_assembly_receipts.
  executeTemplateAssembly:async(sdk,_files,_scope,config,source,current)=>{
   if(!current())throw Error('run detached');
   const reply=await sdk.runScript({summary:'Assemble Mini Vlog',allowCommit:true,script:source.replace('__CONFIG__',()=>JSON.stringify(config))});
   if(reply.isError)throw Error(reply.output);return reply.result;
  },
  // Discovery is an explicit boundary in music/native tests; its real file
  // protocol and the actual Build remount path have dedicated counterexamples.
  openTemplateAssemblyContinuations:async(_sdk,_files,_scope,current)=>({read:async(runId=null)=>{const p=globals.assemblyPendingRef.current.p;return p&&(runId===null||p.scope.runId===runId)?p:null;},
   workflow:async(pending,prepare)=>{
    globals.assemblyPendingRef.current.p=pending;
    const assembly=await globals.executeTemplateAssembly(sdk,f.local.files,pending.scope,pending.config,pending.source,()=>{check();current();return true;});
    await prepare(pending,assembly);return {...assembly,decorationConfirmed:true};
   }}),
  openAssemblyContinuations:async(pid,check)=>globals.openTemplateAssemblyContinuations(sdk,f.local.files,{projectId:pid},check),
  panelLocalClient:value=>value,PLUGIN_VERSION:'fixture',MV_W:1920,MV_H:1080,presetFonts:()=>[],mvCurrentYear:()=>2026,TITLE_LOOK:{shadow:0,size:100,x:50,y:50,sparkles:true},MOTION_OPTIONS:[],MOTION_STRENGTH:.5,SOFT_STRENGTH:.35,PUNCH_STRENGTH:.5,PUNCH_PUSH:.4,mvPunchFrames:()=>[],mvPhotoMotions:()=>[],tOr:(_lang,_key,label)=>label,errorText:e=>e.message,sayError:(_lang,e)=>e.message,fontB64:async()=>'',langRef:{current:'en'},PLUGIN_ID:'mini-vlog',DEFAULT_CUE:'cue',PREFERRED_CUE:'cue',DEFAULT_PRESET:'preset',DEFAULT_LENGTH:'standard',DEFAULT_PACE:'quick',DEFAULT_PUNCH:true,DEFAULT_HOOK:false,
  TEMPLATE_ALIAS_BATCH:6,TEMPLATE_ALIAS_JS:'return __CONFIG__;',EMPTY_READ:/never/,TEMPLATE_SEED:1,INVENTORY_MEASURE_MS:1,SEARCH_BATCH:6,MV_QUERIES:[],MV_LENGTHS:{standard:2},MV_FAIL:{},AMBIENT_DB:-18,
  hostJoin:path.join,uiLang:()=> 'en',t:(_lang,key)=>key,uiError:say=>Error(say('en')),locateRoots:async()=>({plugin,data:f.data}),
  readText:async(_root,rel)=>rel==='assets/cues/manifest.json'?JSON.stringify(manifest):rel==='assets/fonts/presets.json'?JSON.stringify(presets):rel==='scripts/ensure-audio.js'?scriptsByName.ensureJs:rel==='scripts/decorate.js'?scriptsByName.decorateJs:'return __CONFIG__;',
  cueGrid:()=>({bpm:110,accepted:true,firstBeat:0,usableEnd:59}),mvGridUsable:()=>true,mvApproxTempo:()=>null,mvBeatsPerShot:()=>({beats:2}),mvShotSeconds:()=>1,mvFitShots:()=>2,mvSnapSection:({value})=>value,mvDefaultSection:()=>0,
  mvSearchQueries:()=>[],mvMotionBonus:value=>value,photoCandsOf:()=>[],mvPlanBuild:()=>plan,stamp:()=> 'fixture',
  runEpochRef:{current:0},setStep:noop,setProgress:noop,progressRef:{current:null},sdk,context:{projectId:'p'},busyRef,assets:{scripts:scriptsByName,presets,titleTsx:'title',softTsx:'soft',motionTsx:'motion',punchTsx:'punch'},inventory,roots:{plugin,data:f.data},chosen:presets.presets[0],seed:1,blockReason:null,anotherBlock:null,projectId:'p',projectRef:{current:'p'},mountedRef:{current:true},inventorySnapshotRef:{current:{projectId:'p',inventory}},invLoadingRef:{current:null},
  preset:'preset',titleFields:{},musicKind:silent?'none':own?'own':'cue',ownMusic:own?{path:file}:null,ownGrid:own?{durationSeconds:60,sourceObservation:{path:file,size:bytes.length,sha256:digest(bytes)}}:null,cueId:'cue',cue,musicStart:0,pace:'quick',length:'standard',requested:2,fitted:2,planShort:()=>false,assemblyPendingRef:{current:{}},clipSound:'ambient',soft:true,beatPunch:true,hook:false,gridded:true,grid:{bpm:110,accepted:true},usePhotos:true,only:null,onlyPhotos:null,snapCuts:{},
  // Scene search is outside this fixture; its caller has separate regressions.
  findCandidates:async()=>({list:[],failed:[]}),checkLocalClips:async()=>({results:[],unavailable:false}),
  candidates:{key:'p|null|motion',failed:[],scene:[],sceneSources:inventory.resources.map(r=>({path:r.path,size:fs.statSync(r.path).size,sha256:digest(fs.readFileSync(r.path))})),list:[],local:{results:[],unavailable:false}},
  setBusy:noop,setStatus:value=>{if(value?.tone==='error')errors.push(value.say('en'));},setResult:noop,stopPreview:noop,advance:noop,stopAt:error=>()=>{errors.push(error);return error.message;},endRun:()=>{busyRef.current=false;},CANCELLED:Symbol('cancelled'),STALE:stopped,
 };
 const box=vm.createContext(globals);vm.runInContext(observationFeatures+'\n'+inputFeature+'\n'+feature+'\n'+analysisFeature+'\n'+adapter+'\n'+source+'\nthis.api={runMiniVlogTemplate,build,finishTitle,decorate,prepareMiniDecoration:typeof prepareMiniDecoration==="function"?prepareMiniDecoration:undefined,snapshotMiniFinishAssets:typeof snapshotMiniFinishAssets==="function"?snapshotMiniFinishAssets:undefined};',box);
 const run=async()=>{
  if(entry==='panel'){await box.api.build(1);return saved.at(-1);}
  try{await box.api.runMiniVlogTemplate(sdk,{projectId:'p',template:{runId:webcrypto.randomUUID(),inputs:{footage:[{resourceId:'original-0',kind:'video'},{resourceId:'original-1',kind:'video'}]},options:{}}},check,noop);}catch(error){if(!error.boundary)throw error;}
  return saved.at(-1);
 };
 return {...f,run,cue,file,bytes,imports,resources,nodes,scripts,saved,errors,hooks,digest,inventory,plan,box,project,stop:()=>{live=false;globals.projectRef.current='detached';},ownedPath:()=>path.join(f.root,'.selects','plugin-data','mini-vlog','assets',cue.sha256+'.mp3')};
}
