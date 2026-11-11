'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {facePixels} = require('../lib/speaker-face-crop.cjs');
// Frozen production implementation: preserve the exact tensors given to ASD.
const {facePixels: before} = require('./fixtures/speaker-face-crop-before.cjs');

let seed = 47;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
}

test('crop tensors match previous interpolation and rounding at edges and fractional boxes', () => {
  for (const [width, height] of [[1,1], [2,3], [17,11], [960,540], [304,540]]) {
    const rgb = Uint8Array.from({length: width * height * 3}, () => Math.floor(random() * 256));
    const boxes = [
      [0,0,0], [0,0,1], [width,height,1], [width/2,height/2,0],
      [width/2,height/2,Math.max(width,height)], [-1000,-1000,2],
      [width+1000,height+1000,2], [.5,.5,.5], [width-.5,height-.5,1.25],
      ...Array.from({length: 100}, () => [
        (random()*2-.5)*width, (random()*2-.5)*height,
        random()*Math.max(width,height),
      ]),
    ];
    for (const box of boxes) {
      const input = rgb.slice();
      assert.deepEqual(facePixels(rgb,width,height,box), before(rgb,width,height,box), `${width}x${height} ${box}`);
      assert.deepEqual(rgb,input,'source pixels must remain unchanged');
    }
  }
});

test('out-of-frame crops retain constant 110 padding', () => {
  assert.deepEqual(facePixels(new Uint8Array([255,0,0]),1,1,[-100,-100,1]),new Float32Array(112*112).fill(110));
});
