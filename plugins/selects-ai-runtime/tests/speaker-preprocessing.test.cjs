'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {facePixels}=require('../lib/speaker-tracks.cjs');
const {mfcc}=require('../lib/speaker-audio.cjs');
const {rgbToLetterboxBlob}=require('../lib/yunet-decode.cjs');
const reference=require('./fixtures/speaker-preprocessing-reference.json');
function raster(width,height) {
  const rgb=Buffer.alloc(width*height*3);let seed=17;
  for(let i=0;i<rgb.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;rgb[i]=seed>>>24;}
  return rgb;
}
const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
// Full tensors recorded from the pre-optimization runtime (dc1ac4a3).
// Covers subpixel crops, padding, portrait/downscale and changing reuse sizes.
for(const row of reference.crops)test(`ASD pixels retain exact rounding: ${row.geometry}`,()=>{
  assert.equal(hash(facePixels(raster(row.width,row.height),row.width,row.height,row.geometry)),row.sha256);
});
test('YuNet tensor matches reference with reused padding across dimensions',()=>{
  let out;
  for(const row of reference.letterbox){
    const result=rgbToLetterboxBlob(raster(row.width,row.height),row.width,row.height,out);
    assert.equal(hash(result.data),row.sha256);out=result.data;
  }
});
for(const row of reference.audio)test(`MFCC full tensor matches reference: ${row.length} samples`,()=>{
  const pcm=Float64Array.from({length:row.length},(_,i)=>row.silence?0:Math.floor(12000*Math.sin(i*.13)+4000*Math.sin(i*.031)+.5));
  assert.equal(hash(mfcc(pcm)),row.sha256);
});
