const test=require('node:test'),assert=require('node:assert/strict');
const {detectFrameChanges}=require('../lib/frame-change.cjs');
const W=64,H=36,N=W*H*3,frame=(v)=>Buffer.alloc(N,v),run=(...frames)=>detectFrameChanges(Buffer.concat(frames),W,H,frames.length);
test('static frames and minor exposure variation remain sparse',()=>{assert.deepEqual(run(frame(40),frame(40),frame(43)),[]);});
test('a one-frame cut between scheduled detector frames triggers both boundaries',()=>{const frames=Array.from({length:9},()=>frame(0));frames[3]=frame(255);assert.deepEqual(run(...frames).map(e=>e.frame),[3,4]);});
test('small local mouth-like motion does not trigger whole-window dense detection',()=>{const b=frame(0);for(let y=10;y<13;y++)for(let x=20;x<24;x++)b.fill(255,(y*W+x)*3,(y*W+x+1)*3);assert.deepEqual(run(frame(0),b),[]);});
test('broad motion triggers conservatively even if it is not a true camera cut',()=>{const b=frame(0);b.fill(255,0,N/2);assert.equal(run(frame(0),b).length,1);});

test('a cut on the last frame still makes the window dense',()=>{
 const frames=Array.from({length:75},()=>frame(30));frames[74]=frame(220);
 assert.deepEqual(run(...frames).map(e=>e.frame),[74]);
});
test('one-frame windows need no adjacent-frame comparison',()=>{
 assert.deepEqual(run(frame(40)),[]);
});
test('changed area alone does not trigger on slight exposure shifts',()=>{
 assert.deepEqual(run(frame(90),frame(100)),[]);
});
