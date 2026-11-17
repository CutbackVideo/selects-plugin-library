'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scoreSpeakerTrack}=require('../lib/speaker-score.cjs');
const timed={measure:(_,f)=>f(),measureAsync:(_,f)=>f()};
function fixture(n) {
  const tensors=[],calls=[];
  class Tensor {
    constructor(type,data,dims){Object.assign(this,{data,dims,disposed:false});tensors.push(this);}
    dispose(){this.disposed=true;}
  }
  const logits=(offset,count)=>Float32Array.from({length:count},(_,i)=>Math.sin(offset+i)+count*.013);
  const model={run:async({audio,video})=>{
    const offset=audio.data[0],count=video.dims[1];calls.push([offset,count]);
    return {scores:new Tensor('float32',logits(offset,count),[count])};
  }};
  const input={ort:{Tensor},model,audioFeatures:Float32Array.from({length:n*4*13},(_,i)=>Math.floor(i/(4*13))),visual:new Float32Array(n*112*112),n,signal:new AbortController().signal,timed};
  const expected=new Float64Array(n);
  for(const seconds of [1,2,3])for(let offset=0;offset<n;offset+=seconds*25){
    const count=Math.min(n-offset,seconds*25),values=logits(offset,count);
    for(let i=0;i<count;i++)expected[offset+i]+=values[i]/3;
  }
  return {input,tensors,calls,expected};
}
for(const n of [1,24,25,26,49,50,51,74,75])test(`preserves ensemble weights and reuses exact segments (${n} frames)`,async()=>{
  const f=fixture(n),got=await scoreSpeakerTrack(f.input);
  assert.deepEqual(got,f.expected);
  const expectedCalls=n<=25?1:n<=50?3:5;
  assert.equal(f.calls.length,expectedCalls);
  assert.equal(new Set(f.calls.map(JSON.stringify)).size,expectedCalls);
  assert.ok(f.tensors.every(t=>t.disposed));
  await scoreSpeakerTrack(f.input);
  assert.equal(f.calls.length,expectedCalls*2,'No score reuse across tracks');
});
test('disposes model inputs after inference failure',async()=>{
  const f=fixture(74);f.input.model.run=async()=>{throw Error('inference failed');};
  await assert.rejects(scoreSpeakerTrack(f.input),/inference failed/);
  assert.ok(f.tensors.every(t=>t.disposed));
});
test('cancellation stops before invoking the model',async()=>{
  const f=fixture(74);f.input.signal=AbortSignal.abort();
  await assert.rejects(scoreSpeakerTrack(f.input),{name:'AbortError'});
  assert.equal(f.calls.length,0);
});
