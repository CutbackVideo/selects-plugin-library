import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {stripTypeScriptTypes} from 'node:module';
import {loadPanelFunctions} from './windows_host.mjs';
const panel=fs.readFileSync(new URL('../plugins/jude-kinetic-style/panel.tsx',import.meta.url),'utf8');
const source=stripTypeScriptTypes(panel.slice(panel.indexOf('export async function placeMusic('),panel.indexOf('export async function readDraft(')),{mode:'strip'});
const file='/qa/music/dark-hallway-distressed.mp3';
const stale={type:'audio',path:'/previous-install/plugin-data/jude-kinetic-style/music/dark-hallway-distressed.mp3',resourceId:'old',durationSeconds:52.6};
const exact={type:'audio',path:file,resourceId:'local',durationSeconds:52.6};
const music={title:'Track',artist:'Artist',license:'CC BY',credit:'Credit',startSeconds:0,levelDb:-5,fadeOutSeconds:2};
function fixture({entries=[],extraAudio=[],importError,readError,commitError,removeExactBeforePlace=false}={}){
 const api=loadPanelFunctions(source,['placeMusic'],{__sdk:{},FOLDER:'Jude Kinetic',MUSIC:music,unpackMusic:async()=>file,hostProbeSeconds:async()=>52.6,hostIsWindows:()=>false});
 let inventory=entries.map(row=>({...row})),imports=0,commits=0,clipId=100;
 const clips=[{clipId:1,trackKind:'main',startFrame:0,endFrame:120,resourceId:'speech'},...extraAudio];
 const calls=[],importPaths=[],overlayIds=[];
 const env={dataDir:'/qa',pluginDir:'/qa/plugin',runScript:async(script,summary,commit)=>{
  calls.push(summary);assert.equal(commit,true);
  if(summary==='Place the background music'&&removeExactBeforePlace)inventory=inventory.filter(row=>row.path!==file);
  let projectMutated=false;
  const project={
   sourceFiles:async()=>{if(readError)throw readError;return{fileTree:inventory.map(row=>({...row}))};},
   importFiles:async({paths})=>{if(importError)throw importError;projectMutated=true;imports++;importPaths.push(...paths);inventory.push({...exact});},
   readFootage:async()=>({folders:[]}),createFolder:async()=>{projectMutated=true;return{folderId:'music'};},moveToFolder:async()=>{projectMutated=true;},resource:id=>({id}),
  };
  const draft={
   clips:async()=>clips.map(c=>({...c})),
   removeClips:async items=>{const ids=new Set(items.map(c=>c.clipId));for(let i=clips.length-1;i>=0;i--)if(ids.has(clips[i].clipId))clips.splice(i,1);},
   rangeAtFrames:async(a,b)=>({start:a,end:b}),
   overlayResource:async({resource,over})=>{overlayIds.push(resource.id);clips.push({clipId:++clipId,trackKind:'audio',resourceId:resource.id,startFrame:over.start,endFrame:over.end});},
   setClipAudio:async({clip,volumeDb})=>{assert.equal(clip.trackKind,'audio');assert.equal(volumeDb,-5);},
   commitAll:async()=>{commits++;assert.equal(projectMutated,false,'Project mutations and Draft commits cannot share a script');if(commitError)throw commitError;},
  };
  return await new Function('selects',stripTypeScriptTypes(`async function execute(){${script}}`,{mode:'strip'})+'\nreturn execute();')({project:()=>project,draft:()=>draft});
 }};
 return{run:()=>api.placeMusic(env,'project','draft',24),clips,calls,importPaths,overlayIds,get imports(){return imports;},get commits(){return commits;}};
}
test('first music import commits in a separate script, and reruns replace the overlay',async()=>{
 const f=fixture();for(let n=0;n<2;n++){assert.equal((await f.run()).shortBySeconds,0);assert.equal(f.clips.filter(c=>c.trackKind==='audio').length,1);assert.equal(f.clips[0].resourceId,'speech');}
 assert.equal(f.imports,1);assert.deepEqual(f.calls,['Import the background music','Place the background music','Import the background music','Place the background music']);
});
test('same-name same-duration resource at a different path never replaces verified local music',async()=>{
 const f=fixture({entries:[stale]});await f.run();assert.equal(f.imports,1,'foreign resource must not suppress importing the verified local file');assert.deepEqual(f.importPaths,[file]);assert.deepEqual(f.overlayIds,['local']);assert.equal(f.commits,1);
});
test('placement rechecks the exact path and refuses fallback after that path is lost',async()=>{
 const f=fixture({entries:[stale],removeExactBeforePlace:true});await assert.rejects(f.run(),/background music is missing from this project/i);assert.equal(f.imports,1);assert.deepEqual(f.overlayIds,[]);assert.equal(f.commits,0);
});
test('exact path is reused, reruns leave one music overlay, and unrelated audio stays',async()=>{
 const userAudio={clipId:2,trackKind:'audio',resourceId:'user-audio',startFrame:0,endFrame:120};const f=fixture({entries:[stale,exact],extraAudio:[userAudio]});await f.run();await f.run();
 assert.equal(f.imports,0);assert.deepEqual(f.overlayIds,['local','local']);assert.equal(f.clips.filter(c=>c.resourceId==='local').length,1);assert.deepEqual(f.clips.find(c=>c.resourceId==='user-audio'),userAudio);assert.equal(f.clips[0].endFrame,120);
});
test('a different-path old audio clip is preserved without an ownership receipt',async()=>{
 const oldAudio={clipId:3,trackKind:'audio',resourceId:'old',startFrame:0,endFrame:120};const f=fixture({entries:[stale],extraAudio:[oldAudio]});await f.run();assert.equal(f.imports,1);assert.deepEqual(f.clips.find(c=>c.resourceId==='old'),oldAudio,'name equality cannot authorize deleting existing audio');assert.equal(f.clips.filter(c=>c.resourceId==='local').length,1);
});
for(const kind of ['import','read','commit'])test('genuine '+kind+' failure remains a failure',async()=>{
 const error=new Error(kind+' failed: original cause');const f=fixture({[kind+'Error']:error});await assert.rejects(f.run(),error);if(kind!=='commit'){assert.equal(f.commits,0);assert.deepEqual(f.overlayIds,[]);}
});
