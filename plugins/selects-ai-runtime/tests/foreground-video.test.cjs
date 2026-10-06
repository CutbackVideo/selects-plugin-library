'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { constantFrameRate } = require('../lib/constant-frame-rate.cjs');
const { foregroundRgba, startForegroundVideo } = require('../lib/foreground-video.cjs');
const { startTool } = require('../lib/process.cjs');
const { validateRequest } = require('../lib/request.cjs');

test('CFR is derived from ordered actual PTS, including fractional-rate ticks', () => {
  assert.deepEqual(constantFrameRate('30000/1001', [0, 1001, 2002, 3003], {numerator:1,denominator:30000}), {numerator:30000,denominator:1001});
  assert.deepEqual(constantFrameRate('24/1', [0, 42, 83, 125], {numerator:1,denominator:1000}), {numerator:24,denominator:1});
  for(const pts of [[0,1,3],[0,1,1],[0,1]]) assert.equal(constantFrameRate('1/1',pts,{numerator:1,denominator:1000}),null);
  assert.equal(constantFrameRate('0/0',[0,1],{numerator:1,denominator:1}),null);
});
test('a whole-tick frame clock rejects missing or irregular displayed frames', () => {
  const base = {numerator:1,denominator:30};
  assert.deepEqual(constantFrameRate('30/1',[0,1,2,3],base),{numerator:30,denominator:1});
  for(const pts of [[0,2,3,4],[0,1,3,4,5]]) assert.equal(constantFrameRate('30/1',pts,base),null);
  assert.equal(constantFrameRate('30/1',[0,3000,6001],{numerator:1,denominator:90000}),null);
});
test('foreground color comes from RVM fgr and keeps straight, continuous alpha', () => {
  const fgr={type:'float32',dims:[1,3,1,2],data:new Float32Array([1,.5,0,.25,.1,0])};
  assert.deepEqual([...foregroundRgba(fgr,Buffer.from([0,127]),2,1)], [255,0,26,0,128,64,0,127]);
  assert.throws(()=>foregroundRgba({...fgr,data:new Float32Array([NaN,0,0,0,0,0])},Buffer.alloc(2),2,1),/non-finite/);
});
test('new output mode is explicit and rejected on faces or unknown formats', () => {
  const request={contractVersion:1,task:'person.matte',input:{source:{path:path.resolve('video.mp4')},sourceRange:{startSeconds:0,endSeconds:1},outputMode:'foreground-video'}};
  assert.equal(validateRequest(request),request);
  assert.throws(()=>validateRequest({...request,task:'faces.detect'}),/outputMode/);
  assert.throws(()=>validateRequest({...request,input:{...request.input,outputMode:'gif'}}),/outputMode/);
});
const configFile=process.env.AI_RUNTIME_CONFIG;
test('real ProRes 4444 movie keeps soft alpha and exact CFR frame count', {skip:!configFile&&'Set AI_RUNTIME_CONFIG to existing media tool config'}, async()=>{
  const config=JSON.parse(await fs.readFile(configFile,'utf8'));
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'ai-foreground-'));
  const video={width:16,height:8,constantFrameRate:{numerator:24000,denominator:1001},frameTimes:[2,2+1001/24000,2+2002/24000]};
  const writer=startForegroundVideo({config,video,outputDir:folder});
  try {
    const pixels=video.width*video.height;
    const foreground={type:'float32',dims:[1,3,8,16],data:new Float32Array(pixels*3)};
    foreground.data.fill(1,0,pixels);
    for(const value of [0,127,255]) await writer.write(foreground,Buffer.alloc(pixels,value));
    const metadata=await writer.finish();
    assert.equal(metadata.frameCount,3);assert.equal(metadata.sourceStartSeconds,2);
    assert.equal(metadata.durationSeconds,3003/24000);
    const decoder=startTool(config.tools.ffmpeg,['-v','error','-i',path.join(folder,'foreground.mov'),'-pix_fmt','rgba','-f','rawvideo','pipe:1']);
    const chunks=[];for await(const chunk of decoder.child.stdout) chunks.push(chunk);await decoder.completed;
    const bytes=Buffer.concat(chunks);assert.equal(bytes.length,pixels*4*3);
    for(let f=0;f<3;f++)for(let p=0;p<pixels;p++)assert.ok(Math.abs(bytes[f*pixels*4+p*4+3]-[0,127,255][f])<=1);
    assert.ok(bytes[pixels*4]>230,'opaque foreground must retain its red color');
  } finally { await writer.dispose();await fs.rm(folder,{recursive:true,force:true}); }
});
test('VFR foreground-video fails before spawning the encoder',()=>{
 assert.throws(()=>startForegroundVideo({config:{},video:{width:1,height:1,constantFrameRate:null},outputDir:'unused'}),/constant-frame-rate/);
});
test('canceling an open foreground encoder reaps it and publishes no movie', {skip:!configFile&&'Set AI_RUNTIME_CONFIG to existing media tool config'}, async()=>{
 const config=JSON.parse(await fs.readFile(configFile,'utf8')); const folder=await fs.mkdtemp(path.join(os.tmpdir(),'ai-foreground-cancel-'));
 const controller=new AbortController();const writer=startForegroundVideo({config,video:{width:16,height:8,constantFrameRate:{numerator:24,denominator:1},frameTimes:[0]},outputDir:folder,signal:controller.signal});
 const foreground={type:'float32',dims:[1,3,8,16],data:new Float32Array(16*8*3)};
 try {await writer.write(foreground,Buffer.alloc(128,127));controller.abort(new Error('test-stop'));await assert.rejects(writer.finish());}
 finally {await writer.dispose();assert.equal((await fs.readdir(folder)).includes('foreground.mov'),false);assert.equal((await fs.readdir(folder)).includes('foreground.partial.mov'),false);await fs.rm(folder,{recursive:true,force:true});}
});
