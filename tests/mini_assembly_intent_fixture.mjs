import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {checkScriptTypes} from './run_script_types.mjs';
export const script=fs.readFileSync(process.env.MINI_ASSEMBLY_INTENT_SCRIPT||new URL('../plugins/mini-vlog/scripts/assemble.js',import.meta.url),'utf8'),clone=v=>JSON.parse(JSON.stringify(v));
export function assemblyIntentFixture({rate=30,adopt=null,reverse=false,fault=null,sourceRates={}}={}){
 sourceRates={music:120,...sourceRates};
 const calls={creates:0,inserts:0,commits:0,transforms:0,audio:0,trims:0},drafts=[];let epoch=0;
 const cfg={projectId:'p',draftName:'Intent fixture',picks:[{rid:'photo',kind:'photo',startSeconds:0},{rid:'video',kind:'video',startSeconds:3.21,sourceDuration:20}],boundaries:[0,1.03,2.17],crops:{photo:{width:96,height:160},video:{width:1920,height:1080}},music:null,clipSound:'full',ambientDb:-18};
 const fresh=r=>({...clone(r),_epoch:epoch}),valid=r=>assert.equal(r._epoch,epoch,'stale target'),transform=()=>({enabled:true,position:{x:0,y:0},scale:{x:1,y:1},anchor:{x:0,y:0},rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:[]});
 const p={resources:async()=>[{resourceId:'music',type:'Audio'},{resourceId:'photo',type:'Image'},{resourceId:'video',type:'Video'}],resource:rid=>({rid}),createDraft:async({name})=>{
  const probe=name==='Mini source timing check';calls.creates++;let fps=rate,size=fault==='canvas'?{width:960,height:540}:{width:1920,height:1080},clips=[],serial=0;
  const d={meta:async()=>({fps,durationFrames:clips.reduce((a,r)=>Math.max(a,r.endFrame),0),frameSize:clone(size)}),setFrameSize:async value=>{if(fault!=='canvas')size=clone(value);epoch++;},
   clips:async({trackScope}={})=>{const rows=clips.filter(r=>trackScope!=='main'||r.trackKind==='main').map(fresh);return reverse?rows.reverse():rows;},
   insertResource:async({resourceId,sourceRange})=>{
    calls.inserts++;if(fault==='ignored insert')return {opCount:0};
    if(clips.length===0&&probe&&sourceRates[resourceId])fps=sourceRates[resourceId];
    if(clips.length===0&&adopt&&!probe){fps=adopt;size={width:96,height:160};}
    const native=sourceRates[resourceId]??fps,k=Math.round(sourceRange.startSeconds*native),end=Math.round(sourceRange.endSeconds*native),placedFrames=Math.round((end-k)/native*fps),startFrame=clips.reduce((a,r)=>Math.max(a,r.endFrame),0);
    const row={clipId:++serial,trackId:'main',trackKind:'main',resourceId:fault==='wrong source'?'other':resourceId,startFrame,endFrame:startFrame+placedFrames,videoIndex:0,audioSourceIndexes:[0],playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,_source:{startSeconds:k/native,endSeconds:k/native+placedFrames/fps},_transform:transform(),_audio:{volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0}};
    if(fault==='wrong interval')row.endFrame--;if(fault==='wrong source window')row._source.startSeconds+=1/fps;
    clips.push(row);if(fault==='duplicate insert')clips.push({...clone(row),clipId:++serial});if(fault==='changed earlier'&&clips.length>1)clips[0].resourceId='other';epoch++;return {opCount:1};
   },
   clipSourceWindow:async r=>{valid(r);const row=clips.find(c=>c.clipId===r.clipId);return {clipId:r.clipId,...clone(row._source),playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true};},
   clipTransform:async r=>{valid(r);return clone(clips.find(c=>c.clipId===r.clipId)._transform);},
   clipAudio:async r=>{valid(r);return {clipId:r.clipId,...clone(clips.find(c=>c.clipId===r.clipId)._audio)};},
   setClipTransform:async({clip,...patch})=>{valid(clip);calls.transforms++;if(fault!=='ignored crop')Object.assign(clips.find(c=>c.clipId===clip.clipId)._transform,clone(patch));epoch++;},
   setClipAudio:async({clip,...patch})=>{valid(clip);calls.audio++;if(patch.fadeInSeconds!==undefined)patch.fadeInSeconds=Math.round(patch.fadeInSeconds*fps)/fps;if(patch.fadeOutSeconds!==undefined)patch.fadeOutSeconds=Math.round(patch.fadeOutSeconds*fps)/fps;if(fault!=='ignored sound'&&fault!=='ignored fade')Object.assign(clips.find(c=>c.clipId===clip.clipId)._audio,clone(patch));epoch++;},
   trimBoundary:async({frame,side,byFrames})=>{assert.equal(side,'before');if(fault==='ignored trim'){calls.trims++;return;}const row=clips.find(r=>r.endFrame===frame);row.endFrame+=byFrames;row._source.endSeconds+=byFrames/fps;calls.trims++;epoch++;},
   rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame,_epoch:epoch}),
   insertGap:async({seconds})=>{const startFrame=clips.reduce((a,r)=>Math.max(a,r.endFrame),0);clips.push({clipId:++serial,trackId:'main',trackKind:'main',resourceId:null,startFrame,endFrame:startFrame+Math.round(seconds*fps)});epoch++;},
   overlayResource:async({resource,over,sourceStartSeconds,playbackSpeed})=>{valid(over);const native=playbackSpeed?fps:sourceRates[resource.rid]??fps,start=Math.round(sourceStartSeconds*native)/native;clips.push({clipId:++serial,trackId:'audio',trackKind:'audio',audioSourceIndexes:null,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,resourceId:fault==='wrong music'?'unrelated-audio':resource.rid,startFrame:over.startFrame,endFrame:over.endFrame,_source:{startSeconds:start,endSeconds:start+(over.endFrame-over.startFrame)/fps},_audio:{volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0}});epoch++;},
   commitAll:async()=>{calls.commits++;return {createdDraftId:'d'+calls.creates};},
  };drafts.push({d,probe,rows:()=>clips});return d;
 }};
 return {cfg,calls,drafts,project:p,run:()=>vm.runInNewContext('(async()=>{'+script+'})()',{selects:{project:()=>p},__CONFIG__:cfg})};
}
