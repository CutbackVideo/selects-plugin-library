'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {prepareSharedAiVideoFrames}=require('./video-ai-frames.cjs');
const resourceId='01234567-89ab-cdef-0123-456789abcdef';
function fixture(count, {url=index=>'local:///durable/alpha_'+String(index+37).padStart(6,'0')+'.png',failAt=0,mutate=()=>{}}={}) {
  const frames=Array.from({length:count},(_,index)=>({index,sourceTimeSeconds:index/30,url:url(index)}));
  const matte={sourceResourceId:resourceId,sourceRange:{startSeconds:0,endSeconds:count/30},frameSize:{width:540,height:720},alphaEncoding:'grayscale-png-8bit',frames};
  mutate(matte);
  const runs=[],copied=[];let active=0,peak=0,metadata;
  const selects={ai:{prepareMatte:async()=>matte},files:{
    mkdir:async()=>{},
    pathFromLocalUrl:async value=>{
      const run=runs.at(-1);run.operations++;
      if(run.operations>64)throw Error('bounded script budget exceeded');
      active++;peak=Math.max(peak,active);
      await new Promise(resolve=>setImmediate(resolve));
      return value;
    },
    copy:async(from,to)=>{
      const run=runs.at(-1);run.operations++;
      await new Promise(resolve=>setImmediate(resolve));active--;
      const index=Number(/frame_(\d+)\.png$/.exec(to)[1]);
      if(index===failAt)throw Error('copy denied');
      run.copies++;copied.push({from,to,index});
    },
  }};
  const sdk={runScript:async input=>{
    assert.equal(input.allowCommit,true);
    const run={summary:input.summary,operations:0,copies:0};runs.push(run);
    const result=await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects});
    if(runs.length===1)metadata=result;
    return {result};
  }};
  const expected={resourceId,width:540,height:720,fps:30,frames:count};
  return {sdk,expected,runs,copied,get peak(){return peak;},get metadata(){return metadata;}};
}
test('673 frames adopt once then use 32-frame scripts with at most eight copies in flight',async()=>{
  const f=fixture(673);
  const result=await prepareSharedAiVideoFrames(f.sdk,'project',{},'/masks',f.expected);
  assert.equal(result.count,673);
  assert.equal(f.runs.length,23);
  assert.equal(f.runs[0].operations,0);
  assert.deepEqual(f.runs.slice(1).map(r=>r.copies),[...Array(21).fill(32),1]);
  assert.ok(f.runs.every(r=>r.operations<=64));
  assert.equal(f.peak,8);
  assert.deepEqual(f.copied.map(c=>c.index).sort((a,b)=>a-b),Array.from({length:673},(_,i)=>i+1));
  assert.equal(f.copied[0].from,'local:///durable/alpha_000037.png');
  assert.equal(f.copied.at(-1).from,'local:///durable/alpha_000709.png');
});
test('all timestamps are validated before even the first copy batch starts',async()=>{
  const f=fixture(673,{mutate:m=>m.frames[672].sourceTimeSeconds+=1});
  await assert.rejects(prepareSharedAiVideoFrames(f.sdk,'project',{},'/masks',f.expected),/clock/);
  assert.equal(f.runs.length,1);assert.equal(f.copied.length,0);
});
test('sequential URLs for the full 20000-frame runtime limit fit in bounded metadata',async()=>{
  const f=fixture(20000);const run=f.sdk.runScript;
  f.sdk.runScript=async input=>{
    if(input.summary.startsWith('Copy'))throw Error('stop after metadata');
    return run(input);
  };
  await assert.rejects(prepareSharedAiVideoFrames(f.sdk,'project',{},'/masks',f.expected),/stop after/);
  assert.ok(JSON.stringify(f.metadata).length<1024);
  assert.ok(f.metadata.sequence);
});
test('irregular host filenames are copied exactly, without inventing sequential filenames',async()=>{
  const names=['z.png','other-9.png','z-last.png'];
  const f=fixture(3,{url:i=>'local:///durable/'+names[i]});
  await prepareSharedAiVideoFrames(f.sdk,'project',{},'/masks',f.expected);
  assert.deepEqual(f.copied.map(c=>c.from),names.map(n=>'local:///durable/'+n));
  assert.equal(f.metadata.sequence,null);
});
test('a failed copy batch rejects and never starts a later batch',async()=>{
  const f=fixture(128,{failAt:65});
  await assert.rejects(prepareSharedAiVideoFrames(f.sdk,'project',{},'/masks',f.expected),/copy denied/);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.runs.length,4);
  assert.ok(f.copied.every(c=>c.index<=72));
});
test('an incomplete copy acknowledgment cannot announce prepared frames',async()=>{
  const f=fixture(40),run=f.sdk.runScript;
  f.sdk.runScript=async input=>{
    const response=await run(input);
    return input.summary.startsWith('Copy')?{result:{count:0}}:response;
  };
  await assert.rejects(prepareSharedAiVideoFrames(f.sdk,'project',{},'/masks',f.expected),/could not be copied/);
  assert.equal(f.runs.length,2);
});
