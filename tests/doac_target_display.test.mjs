// Complete production CaptionPanel; mock only the host metadata/storage boundary
// and (in one test) the expensive caption-generation operation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadPanelModule} from './panel_module_fixture.mjs';
const app=process.env.SELECTS_DEV_REPO||(process.env.SBS_PANEL_TEST_MODULES?path.dirname(process.env.SBS_PANEL_TEST_MODULES):null);
assert.ok(app,'Set SELECTS_DEV_REPO or SBS_PANEL_TEST_MODULES to existing test dependencies');
const appRequire=createRequire(path.join(app,'package.json')),React=appRequire('react'),{JSDOM}=appRequire('jsdom');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
const {render,cleanup,act,fireEvent}=appRequire('@testing-library/react');
test.afterEach(cleanup);
const source=fs.readFileSync(process.env.DOAC_TARGET_PANEL_SOURCE||new URL('../plugins/doac-style/panel.tsx',import.meta.url),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const settle=async fn=>{await act(async()=>{await fn?.();await new Promise(r=>setImmediate(r))})};
const h=React.createElement;
const ui={Section:({title,children})=>h('section',null,h('h3',null,title),children),Stack:({children})=>h('div',null,children),Message:({children})=>h('p',null,children),Progress:()=>h('span',null,'Progress'),Button:({children,onClick,disabled,busy})=>h('button',{onClick,disabled:disabled||busy},children)};
function harness({job=null,steps=null,language='en'}={}){
 const requests=[],writes=[],names={a:'Draft Alpha',b:'Draft Beta',out:'Captioned result'};let disposed=false,lateStateWrites=0;
 const observedReact={...React,useState(initial){const [value,setValue]=React.useState(initial);return[value,next=>{if(disposed)lateStateWrites++;setValue(next)}]}};
 const sdk={storage:{getItem:async()=>JSON.stringify(job),setItem:async(key,value)=>{writes.push({key,value})}},runScript:input=>{assert.ok(['Read caption target names','Read current draft'].includes(input.summary));assert.notEqual(input.allowCommit,true);const wait=deferred();requests.push({input,...wait});return wait.promise}};
 // useAppUpdateGuard is an unchanged app-update host subscription; no UI work.
 const {CaptionPanel,panelLocalClients}=loadPanelModule(source,{names:['CaptionPanel','panelLocalClients'],React:observedReact,overrides:{useAppUpdateGuard:()=>{},...steps?{captionSteps:steps}:{}},filename:'plugins/doac-style/panel.tsx'});
 panelLocalClients.set(sdk,{files:{}});
 let context={projectId:'p',sequenceId:'a',language};
 const view=render(h(CaptionPanel,{sdk,context,ui}));
 const update=async(next,nextSdk=sdk)=>{context={...context,...next};panelLocalClients.set(nextSdk,{files:{}});await settle(()=>view.rerender(h(CaptionPanel,{sdk:nextSdk,context,ui})));};
 const answer=async(index=0,{projectName='Project One',error=null}={})=>{
  const q=requests[index];assert.ok(q,'Expected a metadata request');
  if(error)return settle(()=>q.reject(Error(error)));
  const result=await new Function('selects','return(async()=>{'+q.input.script+'})()')({project:id=>({meta:async()=>({title:projectName,draftIds:Object.keys(names)})}),draft:id=>({meta:async()=>({name:names[id]})})});
  await settle(()=>q.resolve({result}));
 };
 return{view,sdk,requests,writes,names,update,answer,unmount(){disposed=true;view.unmount()},lateStateWrites:()=>lateStateWrites,text:()=>view.container.textContent};
}
test('DOAC shows the captured current Project and Draft using only readonly metadata',async()=>{
 const q=harness();await q.answer();assert.match(q.text(),/Project: Project One/);assert.match(q.text(),/Current draft: Draft Alpha/);assert.equal(q.requests.length,1);assert.equal(q.writes.length,0);assert.equal(q.view.getByRole('button',{name:'Create captions'}).disabled,false);
});
test('slow previous Draft cannot overwrite the focused Draft, and old names clear while loading',async()=>{
 const q=harness();await q.update({sequenceId:'b'});await q.answer(1);await q.answer(0);assert.match(q.text(),/Current draft: Draft Beta/);assert.doesNotMatch(q.text(),/Draft Alpha/);
 await q.update({sequenceId:'a'});assert.doesNotMatch(q.text(),/Draft Beta/);assert.match(q.text(),/Reading target/);await q.answer(2);assert.match(q.text(),/Current draft: Draft Alpha/);
});
test('same Draft identifier in another Project re-reads ownership and rejects old Project response',async()=>{
 const q=harness();await q.update({projectId:'p2'});await q.answer(1,{projectName:'Project Two'});await q.answer(0);assert.match(q.text(),/Project: Project Two/);assert.doesNotMatch(q.text(),/Project One/);assert.equal(q.writes.length,0);
});
test('switching SDK invalidates a pending request even when the target key is unchanged',async()=>{
 const q=harness(),replacement={...q.sdk,runScript:async()=>({result:{projectName:'Fresh host',names:{a:'Fresh draft'}}})};await q.update({},replacement);await q.answer(0);assert.match(q.text(),/Fresh host/);assert.match(q.text(),/Fresh draft/);assert.doesNotMatch(q.text(),/Draft Alpha/);
});
test('failed metadata lookup never leaves an old target name or changes saved progress',async()=>{
 const q=harness();await q.answer();await q.update({sequenceId:'b'});await q.answer(1,{error:'No longer available'});assert.match(q.text(),/Name unavailable/);assert.doesNotMatch(q.text(),/Draft Alpha/);assert.equal(q.writes.length,0);
});
test('a removed or foreign Draft is not looked up or shown under the current Project',async()=>{
 const q=harness();delete q.names.a;await q.answer();assert.match(q.text(),/Current draft: Name unavailable/);assert.doesNotMatch(q.text(),/Draft Alpha/);
});
test('no focused Draft shows guidance; Korean labels follow language without changing reads or jobs',async()=>{
 const q=harness();await q.answer();await q.update({sequenceId:null,language:'ko'});await q.answer(1);assert.match(q.text(),/\ud604\uc7ac Draft: Draft\ub97c \uc5f4\uc5b4\uc8fc\uc138\uc694/);assert.doesNotMatch(q.text(),/Draft Alpha/);assert.equal(q.view.getByRole('button',{name:'Create captions'}).disabled,true);
 await q.update({projectId:null});assert.match(q.text(),/\ud504\ub85c\uc81d\ud2b8\ub97c \uc5f4\uc5b4\uc8fc\uc138\uc694/);assert.equal(q.requests.length,2);
});
test('unmount ignores the late lookup result',async()=>{
 const q=harness();q.unmount();await q.answer();assert.equal(q.view.container.textContent,'');assert.equal(q.writes.length,0);assert.equal(q.lateStateWrites(),0);
});
test('restored source and result remain explicit when focus is another Draft; uncertain job is preserved',async()=>{
 const job={projectId:'p',sourceId:'a',targetId:'out',editorial:[],clipIds:[],next:0,uncertain:true};
 const q=harness({job});await settle();await q.update({sequenceId:'b'});await q.answer(q.requests.length-1);assert.match(q.text(),/Current draft: Draft Beta/);assert.match(q.text(),/Caption source draft: Draft Alpha/);assert.match(q.text(),/Caption result draft: Captioned result/);assert.match(q.text(),/last save was not confirmed/);assert.equal(q.writes.length,0);
});
test('metadata refresh preserves a busy creation captured on the original Draft',async()=>{
 const gate=deferred();let captured;
 const q=harness({steps:({persist})=>({fs(){throw Error('No preview files')},prepare:async input=>{captured=input;await gate.promise;return{projectId:input.projectId,sourceId:input.sourceId,editorial:[]}},create:async job=>persist({...job,targetId:'out',next:0,clipIds:[],uncertain:false})})});
 await q.answer();await settle(()=>fireEvent.click(q.view.getByRole('button',{name:'Create captions'})));assert.equal(captured.sourceId,'a');await q.update({sequenceId:'b'});await q.answer(q.requests.length-1);assert.match(q.text(),/Current draft: Draft Beta/);assert.equal(q.view.getByRole('button',{name:'Create captions'}).disabled,true);await settle(()=>gate.resolve());await q.answer(q.requests.length-1);assert.match(q.text(),/Caption source draft: Draft Alpha/);assert.equal(q.writes.length,1);assert.equal(JSON.parse(q.writes[0].value).sourceId,'a');
});
