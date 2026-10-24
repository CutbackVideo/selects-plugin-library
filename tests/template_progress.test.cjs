'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const{createRequire}=require('node:module');
const{createTemplateProgressView}=require('../shared/template-progress.cjs');
const modules=process.env.SBS_PANEL_TEST_MODULES||process.env.AI_PANEL_TEST_MODULES;
if(!modules)throw Error('Set SBS_PANEL_TEST_MODULES to existing React/react-dom/jsdom dependencies.');
const dependency=createRequire(path.resolve(modules,'../package.json'));
const React=dependency('react'),{createRoot}=dependency('react-dom/client'),{JSDOM}=dependency('jsdom');
function clock(){let time=0,id=0;const active=new Map();return {now:()=>time,schedule(fn,ms){const key=++id;active.set(key,{fn,ms,next:time+ms});return key;},cancel:key=>active.delete(key),get active(){return active.size;},advance(ms){const end=time+ms;for(;;){const next=[...active.entries()].sort((a,b)=>a[1].next-b[1].next)[0];if(!next||next[1].next>end)break;time=next[1].next;next[1].next+=next[1].ms;next[1].fn();}time=end;}};}
async function harness(t){
 const dom=new JSDOM('<div id="root"></div>'),previous={};
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){previous[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
 const time=clock(),Component=createTemplateProgressView(React,time),root=createRoot(document.getElementById('root'));let removed=false;
 const render=async(props,{strict=false}={})=>React.act(async()=>root.render(strict?React.createElement(React.StrictMode,null,React.createElement(Component,props)):React.createElement(Component,props)));
 const advance=async ms=>React.act(async()=>time.advance(ms));
 const remove=async()=>{if(!removed){removed=true;await React.act(async()=>root.unmount());}};
 t.after(async()=>{await remove();assert.equal(time.active,0);dom.window.close();for(const [key,value]of Object.entries(previous))value?Object.defineProperty(globalThis,key,value):delete globalThis[key];});
 return {time,render,advance,remove,get text(){return document.body.textContent;}};
}
test('real React view shows the actual callback text and age; clock ticks are not progress',async t=>{
 const f=await harness(t);await f.render({runId:'a',status:'Measuring the speaker framing…'});assert.match(f.text,/Current step: Measuring the speaker framing/);assert.match(f.text,/0 s ago/);await f.advance(119000);assert.match(f.text,/119 s ago/);assert.doesNotMatch(f.text,/Completion has not/);assert.equal(f.time.active,1);
});
test('identical heartbeats do not reset meaningful age, and a long pause is not labeled a failure',async t=>{
 const f=await harness(t);const props={runId:'a',status:'Waiting for face inference…'};await f.render(props);await f.advance(60000);await f.render(props);await f.advance(61000);assert.match(f.text,/Last step change: 121 s ago/);assert.match(f.text,/No new step update for 121 s. Completion has not been confirmed/);assert.doesNotMatch(f.text,/failed|percent|ETA|retry/i);
});
test('an actual changed stage resets age and removes the pause notice',async t=>{
 const f=await harness(t);await f.render({runId:'a',status:'Finding faces'});await f.advance(125000);await f.render({runId:'a',status:'Finding the speaker mask'});assert.match(f.text,/0 s ago/);assert.doesNotMatch(f.text,/No new step/);await f.advance(2000);assert.match(f.text,/2 s ago/);
});
test('finish stops the interval and preserves the terminal error rather than suggesting success',async t=>{
 const f=await harness(t);await f.render({runId:'a',status:'Rendering'});await f.advance(5000);await f.render({runId:'a',status:'The native render failed.',terminal:true});assert.equal(f.time.active,0);assert.match(f.text,/The native render failed/);assert.match(f.text,/Run finished/);assert.doesNotMatch(f.text,/s ago|No new step/);await f.advance(500000);assert.doesNotMatch(f.text,/No new step/);
});
test('busy=false ends the view without inferring a successful result',async t=>{
 const f=await harness(t);await f.render({runId:'a',status:'Waiting',busy:false});assert.equal(f.time.active,0);assert.match(f.text,/Run finished/);assert.doesNotMatch(f.text,/success|Done|s ago/);
});
test('a completed run cannot restart its timer from a late same-run stage; a new run resets all age',async t=>{
 const f=await harness(t);await f.render({runId:'a',status:'Done.',terminal:true});await f.advance(300000);await f.render({runId:'a',status:'Late poll',terminal:false});assert.equal(f.time.active,0);assert.match(f.text,/Done/);assert.doesNotMatch(f.text,/Late poll/);await f.render({runId:'b',status:'Same stage'});assert.equal(f.time.active,1);assert.match(f.text,/0 s ago/);await f.advance(1000);assert.match(f.text,/1 s ago/);
});
test('Stop/unmount removes only this view timer and leaves no late callback',async t=>{
 const f=await harness(t);await f.render({runId:'a',status:'Analyzing'});assert.equal(f.time.active,1);await f.remove();assert.equal(f.time.active,0);await f.advance(300000);assert.equal(f.text,'');
});
test('React StrictMode creates one live timer and cleans both development effect mounts',async t=>{
 const f=await harness(t);await f.render({runId:'a',status:'Analyzing'},{strict:true});assert.equal(f.time.active,1);await f.advance(1000);assert.match(f.text,/1 s ago/);await f.remove();assert.equal(f.time.active,0);
});
