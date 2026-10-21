import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planGallery } from './format.mjs';
import { buildScript, ORIGINAL_IMAGE_SOURCE } from './operation-builder.mjs';

const source = readFileSync(new URL('./native-image-runtime.js', import.meta.url), 'utf8');
const createRuntime = new Function('buildScript','gallerySourceFacts',`${source}\nreturn { galleryNativeResources, galleryNativePlace };`);
function fixture({ mismatch=false, wrongOwner=false, missingOriginal=false }={}) {
 const media=Array.from({length:21},(_,i)=>({resourceId:`r${i}`,kind:i===20?'video':'image',path:`/test/tile-${i}.png`,width:1122,height:1402,...(i===20?{durationFrames:900}:{})}));
 const placed=[];let commits=0;
 const rows=media.map((item,i)=>({...item,path:mismatch&&i===4?'/other/image.png':item.path,frameSize:{width:item.width,height:item.height},durationSeconds:item.kind==='video'?15:undefined}));
 const project={meta:async()=>({draftIds:wrongOwner?[]:['draft-1']}),resources:async()=>media.map(item=>({...item,type:item.kind==='image'?'Image':'Video'})),sourceFiles:async()=>({fileTree:rows}),resource:id=>({id})};
 const draft={meta:async()=>({fps:60,durationFrames:853}),clips:async()=>placed.map(row=>({...row})),rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame}),overlayResource:async({resource,over})=>{placed.push({resourceId:resource.id,clipId:placed.length+1,trackId:'track-'+placed.length,...over});},commitAll:async()=>{commits++;return {commitId:'commit'};}};
 const selects={files:{stat:async path=>missingOriginal&&path===media[0].path?null:{size:32,isDirectory:false,mtimeMs:1,ino:1},readRange:async()=>({bytesRead:1,base64:'iQ=='})},project:id=>{assert.equal(id,'project-1');return project;},draft:()=>draft};
 const sdk={runScript:async({script})=>({result:await new Function('selects',`return (async()=>{${script}})()`)(selects)})};
 return {...createRuntime(buildScript,new Function('return ('+ORIGINAL_IMAGE_SOURCE+')')()),sdk,media,placed,get commits(){return commits;}};
}
test('SDK placement holds original Images exactly and leaves Videos for their separate batch',async()=>{
 const f=fixture(),plan=planGallery({media:f.media,manualBpm:113});
 await f.galleryNativePlace(f.sdk,'project-1','draft-1',f.media,plan);
 assert.equal(f.commits,1);assert.equal(f.placed.length,20);
 assert.deepEqual(f.placed.map(row=>[row.startFrame,row.endFrame]),plan.tiles.slice(0,20).map(tile=>[tile.revealFrame,tile.endFrame]));
});
test('a changed Image path aborts before any timeline edit',async()=>{
 const f=fixture({mismatch:true}),plan=planGallery({media:f.media,manualBpm:113});
 await assert.rejects(f.galleryNativePlace(f.sdk,'project-1','draft-1',f.media,plan),/Tile 5 has no unique Project Resource/);
 assert.equal(f.commits,0);assert.equal(f.placed.length,0);
});
test('SDK placement rejects a Draft outside the selected Project',async()=>{
 const f=fixture({wrongOwner:true}),plan=planGallery({media:f.media,manualBpm:113});
 await assert.rejects(f.galleryNativePlace(f.sdk,'project-1','draft-1',f.media,plan),/does not belong/);
 assert.equal(f.commits,0);assert.equal(f.placed.length,0);
});
test('explicit Gallery Image placement refuses an offline original before any edit',async()=>{
 const f=fixture({missingOriginal:true}),plan=planGallery({media:f.media,manualBpm:113});
 await assert.rejects(f.galleryNativePlace(f.sdk,'project-1','draft-1',f.media,plan),/original photo file.*missing/i);assert.equal(f.commits,0);assert.equal(f.placed.length,0);
});
