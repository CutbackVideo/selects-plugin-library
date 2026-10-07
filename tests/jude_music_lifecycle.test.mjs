import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {stripTypeScriptTypes} from 'node:module';
import {loadPanelFunctions} from './windows_host.mjs';

const panel=fs.readFileSync(new URL('../plugins/jude-kinetic-style/panel.tsx',import.meta.url),'utf8');
const source=stripTypeScriptTypes(panel.slice(panel.indexOf('export async function placeMusic('),panel.indexOf('export async function readDraft(')),{mode:'strip'});

test('first music import commits in a separate script, and reruns replace the overlay',async()=>{
  const file='/qa/music.mp3',music={title:'Track',artist:'Artist',license:'CC BY',credit:'Credit',startSeconds:0,levelDb:-5,fadeOutSeconds:2};
  const api=loadPanelFunctions(source,['placeMusic'],{
    __sdk:{},FOLDER:'Jude Kinetic',MUSIC:music,
    unpackMusic:async()=>file,hostProbeSeconds:async()=>52.6,hostIsWindows:()=>false,
  });
  let imported=false,imports=0,clipId=1;
  const clips=[{clipId,trackKind:'main',startFrame:0,endFrame:120,resourceId:'r0'}];
  const calls=[];
  const env={dataDir:'/qa',pluginDir:'/qa/plugin',runScript:async(script,summary,commit)=>{
    calls.push(summary);assert.equal(commit,true);
    let projectMutated=false;
    const project={
      sourceFiles:async()=>({fileTree:imported?[{type:'audio',path:file,resourceId:'r1',durationSeconds:52.6}]:[]}),
      importFiles:async()=>{projectMutated=true;imports++;imported=true;},
      readFootage:async()=>({folders:[]}),
      createFolder:async()=>{projectMutated=true;return{folderId:'music'};},
      moveToFolder:async()=>{projectMutated=true;},
      resource:id=>({id}),
    };
    const draft={
      clips:async()=>clips.map(c=>({...c})),
      removeClips:async items=>{const ids=new Set(items.map(c=>c.clipId));for(let i=clips.length-1;i>=0;i--)if(ids.has(clips[i].clipId))clips.splice(i,1);},
      rangeAtFrames:async(a,b)=>({start:a,end:b}),
      overlayResource:async({resource,over})=>clips.push({clipId:++clipId,trackKind:'audio',resourceId:resource.id,startFrame:over.start,endFrame:over.end}),
      setClipAudio:async({clip,volumeDb})=>{assert.equal(clip.trackKind,'audio');assert.equal(volumeDb,-5);},
      commitAll:async()=>{assert.equal(projectMutated,false,'Project mutations and Draft commits cannot share a script');},
    };
    return await new Function('selects',stripTypeScriptTypes(`async function execute(){${script}}`,{mode:'strip'})+'\nreturn execute();')({project:()=>project,draft:()=>draft});
  }};
  for(let n=0;n<2;n++){
    assert.equal((await api.placeMusic(env,'project','draft',24)).shortBySeconds,0);
    assert.equal(clips.filter(c=>c.trackKind==='audio').length,1);
    assert.equal(clips[0].resourceId,'r0');
  }
  assert.equal(imports,1);
  assert.deepEqual(calls,['Import the background music','Place the background music','Import the background music','Place the background music']);
});
