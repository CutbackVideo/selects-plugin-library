import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryFixture} from './gallery_authoring_fixture.mjs';
import {loadPhotoPanel} from './photo_face_fixture.mjs';
async function gallery(faceMode,{manual=false,staleFit=false,replace=false,minify=false,detach=false}={}) {
 let current=true;
 const f=galleryFixture({mix:'image',minify}),store=new Map(),submitted=[],originalCall=f.sdk.call;
 for(const media of f.input.media){media.width=640;media.height=338;media.manualFocus=true;}
 for(const node of f.nodes)if(f.photos.some(p=>p.resourceId===node.resourceId))node.frameSize={width:640,height:338};
 f.input.media[4].manualFocus=manual;if(staleFit)f.input.media[4].fit='contain';
 f.sdk.storage={getItem:async key=>store.get(key)??null,setItem:async(key,value)=>store.set(key,value)};
 f.sdk.call=async(name,...args)=>name==='listProjectResources'?f.resources.map((r,i)=>({...r,resourceId:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0')})):originalCall(name,...args);
 f.selects.ai={imageSourceSupported:faceMode!=='unsupported',submit:async input=>{submitted.push(input);return {workflowId:'ai:photo'}},job:()=>({status:async()=>({workflowId:'ai:photo',projectId:'p',runtimeId:'selects-ai-runtime',task:'faces.detect',status:'succeeded'}),result:async()=>({workflowId:'ai:photo',task:'faces.detect',files:{detections:{id:'artifact'}}})}),readJSON:async()=>{
  if(faceMode==='error')throw Error('fixture read failed');if(detach)current=false;
  return {contractVersion:1,task:'faces.detect',sourceKind:'image',coordinateSpace:'display-pixels',boxFormat:'xyxy',frameSize:{width:faceMode==='invalid'?99:640,height:338},samples:[{sourceTimeSeconds:0,faces:faceMode==='no-faces'?[]:faceMode==='cannot-fit'?[{box:{xmin:0,ymin:50,xmax:70,ymax:200}},{box:{xmin:570,ymin:50,xmax:640,ymax:200}}]:[{box:{xmin:0,ymin:50,xmax:70,ymax:200}}]}]};}};
 const api=loadPhotoPanel('photo-gallery-no2',['focusGalleryPhotos']);
 let prepared;try{prepared=await api.focusGalleryPhotos(f.sdk,f.input,()=>current);}catch(error){if(detach)return{f,error};throw error;}
 if(replace)f.sourceBytes.set(f.input.media[4].path,Buffer.alloc(32,9));
 let result;try{result=await f.create({input:prepared});}catch(error){if(replace)return{f,error};throw error;}
 const saved=f.saved.get(result.draftId),tiles=saved.clips.filter(c=>c._effects?.some(e=>e.name.startsWith('Gallery tile-')));
 return{f,prepared,result,saved,tiles,submitted};
}
for(const reason of ['no-faces','cannot-fit'])test('Gallery real preparation→native authoring→save keeps entire source for '+reason,async()=>{
 const r=await gallery(reason),tile=r.tiles[4],effect=tile._effects[0].parameters;
 assert.equal(r.result.verified,true);assert.equal(r.tiles.length,21);assert.equal(r.submitted.length,1);
 assert.equal(r.prepared.media[4].fit,'contain');assert.equal(r.prepared.faceFocus[0].reason,reason==='no-faces'?'no-faces':'faces-wider-than-crop');
 assert.deepEqual([effect.frameWidth,effect.frameHeight,effect.cropLeft,effect.cropTop],[640,338,0,0]);
 const scale=tile._transform.scale.x*Math.min(1080/640,1920/338);
 assert.ok(Math.abs(scale*640-356)<1e-8);assert.ok(Math.abs(scale*338-188.0125)<1e-8);
 assert.equal(tile._transform.scale.x,tile._transform.scale.y);
 assert.notEqual(r.tiles[3]._effects[0].parameters.frameWidth,640,'other manual slots retain cover');
});
for(const faceMode of ['focused','invalid','error','unsupported'])test('Gallery keeps prior cover for '+faceMode+' rather than treating it as valid no-faces',async()=>{
 const r=await gallery(faceMode);assert.equal(r.prepared.media[4].fit,undefined);
 assert.ok(r.tiles[4]._effects[0].parameters.frameWidth<640);
 if(faceMode==='focused')assert.ok(r.prepared.media[4].focusX<.5);
});
test('Gallery explicit manual center remains cover and submits no face job',async()=>{
 const r=await gallery('no-faces',{manual:true});assert.equal(r.submitted.length,0);assert.ok(r.tiles[4]._effects[0].parameters.frameWidth<640);
});
test('Gallery stale auto contain never overrides a newly explicit manual choice',async()=>{
 const r=await gallery('no-faces',{manual:true,staleFit:true});assert.equal(r.submitted.length,0);assert.equal(r.prepared.media[4].fit,undefined);assert.ok(r.tiles[4]._effects[0].parameters.frameWidth<640);
});
for(const minify of [false,true])test('Gallery fallback refuses changed original bytes before real save minify='+minify,async()=>{
 const r=await gallery('no-faces',{replace:true,minify});assert.match(r.error.message,/photo changed after face analysis/i);assert.equal(r.f.commits.length,0);assert.equal(r.f.saved.size,0);
});

test('Gallery late valid no-faces observation cannot apply containment or save after scope disposal',async()=>{
 const r=await gallery('no-faces',{detach:true});assert.match(r.error.message,/context changed/);assert.equal(r.f.saved.size,0);assert.equal(r.f.commits.length,0);
});
