'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {scoreSpeakerTrack} = require('../lib/speaker-inference.cjs');
const {scoreSpeakerTrack: before} = require('./fixtures/speaker-inference-before.cjs');
const timed = {measure:(_,fn)=>fn(),measureAsync:(_,fn)=>fn()};

function fixture(n,run) {
  const calls = [], tensors = [];
  class Tensor {
    constructor(type,data,dims) {this.data=data;this.dims=dims;this.disposed=false;tensors.push(this);}
    dispose() {this.disposed=true;this.data.fill(0);}
  }
  const visual=Float32Array.from({length:n*112*112},(_,i)=>i/(112*112));
  const audioFeatures=Float32Array.from({length:n*4*13},(_,i)=>i/13);
  const model={async run(input) {
    calls.push(`${input.video.data[0]}:${input.video.dims[1]}`);
    if (run) return run(input,Tensor);
    const data=Float32Array.from({length:input.video.dims[1]},(_,i)=>
      Math.sin(input.video.data[i*112*112]+input.audio.data[i*4*13]+input.video.dims[1]));
    return {scores:new Tensor('float32',data,[data.length])};
  }};
  return {ort:{Tensor},model,visual,audioFeatures,n,signal:new AbortController().signal,timed,calls,tensors};
}

test('identical spans reuse inference while retaining bit-identical three-scale averages', async()=>{
  for (const n of [1,24,25,26,49,50,51,74,75]) {
    const a=fixture(n), b=fixture(n);
    assert.deepEqual(await scoreSpeakerTrack(b),await before(a),`frames=${n}`);
    assert.deepEqual(b.calls,[...new Set(a.calls)]);
    assert.ok(b.tensors.every(t=>t.disposed));
  }
});

test('short tracks still observe cancellation before a reused contribution', async()=>{
  const controller=new AbortController();
  const f=fixture(20,(input,Tensor)=>{
    controller.abort(new Error('canceled'));
    return {scores:new Tensor('float32',new Float32Array(20),[20])};
  });
  f.signal=controller.signal;
  await assert.rejects(scoreSpeakerTrack(f),/canceled/);
  assert.equal(f.calls.length,1);
  assert.ok(f.tensors.every(t=>t.disposed));
});

test('failed or invalid inference releases inputs and never publishes cached scores', async()=>{
  for (const mode of ['reject','length','nonfinite']) {
    const f=fixture(25,(input,Tensor)=>{
      if (mode==='reject') throw new Error('model failed');
      return {scores:new Tensor('float32',new Float32Array(mode==='length'?24:25).fill(NaN),[])};
    });
    await assert.rejects(scoreSpeakerTrack(f),/model failed|length mismatch|Non-finite/);
    assert.ok(f.tensors.every(t=>t.disposed));
  }
});
