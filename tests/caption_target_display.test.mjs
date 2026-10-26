// Whole production panels with real React. Only host/expensive-operation boundaries are controlled.
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{createRequire}from'node:module';import{loadPanelModule}from'./panel_module_fixture.mjs';
const app=process.env.SELECTS_DEV_REPO||(process.env.SBS_PANEL_TEST_MODULES?path.dirname(process.env.SBS_PANEL_TEST_MODULES):null);assert.ok(app,'Set existing test dependency path');
const require=createRequire(path.join(app,'package.json')),React=require('react'),{JSDOM}=require('jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver});Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
const{render,cleanup,act,fireEvent}=require('@testing-library/react'),h=React.createElement;test.afterEach(cleanup);
const source=id=>fs.readFileSync(process.env.CAPTION_TARGET_BASELINE_DIR?path.join(process.env.CAPTION_TARGET_BASELINE_DIR,id,'panel.tsx'):new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const tick=async fn=>act(async()=>{await fn?.();await new Promise(r=>setImmediate(r))});
const ui={Select:({label,value,onChange,disabled,options})=>h('label',null,label,h('select',{value,disabled,onChange:e=>onChange(e.target.value)},options.map(o=>h('option',{key:o.value,value:o.value},o.label)))),Section:({title,children})=>h('section',null,h('h3',null,title),children),Stack:({children})=>h('div',null,children),Message:({children})=>h('p',null,children),Progress:()=>h('span',null,'Progress'),Button:({children,disabled,busy,onClick})=>h('button',{disabled:disabled||busy,onClick},children)};
function jude({pipeline=null}={}){
 const reads=[],opens=[],gate=deferred();let detached=false,lateWrites=0,env,options;
 const observedReact={...React,useState(initial){const[value,set]=React.useState(initial);return[value,v=>{if(detached)lateWrites++;set(v)}]}};
 const bindings=loadPanelModule(source('jude-kinetic-style'),{names:['StylePanel','readOpenDraft'],React:observedReact,overrides:{useAppUpdateGuard:()=>{},pluginPaths:async()=>({data:'/owned',plugin:'/owned'}),readOpenDraft:(sdk,pid,sid)=>{const q=deferred();reads.push({pid,sid,...q});return q.promise},...pipeline?{panelEnv:(_sdk,_paths,progress)=>{env={progress};return env},runPipeline:async(_env,_pid,_sid,value)=>{options=value;return gate.promise}}:{}},filename:'plugins/jude-kinetic-style/panel.tsx'});
 const sdk={runScript:async input=>{opens.push(input);throw Error('No unexpected host calls')}},initial={projectId:'p',sequenceId:'a',language:'en'};let context=initial;
 const view=render(h(bindings.StylePanel,{sdk,context,ui}));
 const update=async patch=>{context={...context,...patch};await tick(()=>view.rerender(h(bindings.StylePanel,{sdk,context,ui})))};
 const answer=async(sid,name,extra={})=>{const q=reads.findLast(x=>x.sid===sid);assert.ok(q);await tick(()=>q.resolve({name,projectName:'Project '+q.pid,projectId:q.pid,sequenceId:sid,words:1,resource:{status:'analyzed'},...extra}))};
 return{view,reads,opens,gate,answer,update,text:()=>view.container.textContent,env:()=>env,options:()=>options,unmount(){detached=true;view.unmount()},lateWrites:()=>lateWrites};
}
for(const choice of ['none','bundled'])test(`Jude visible music selection reaches the production pipeline (${choice})`,async()=>{
 const q=jude({pipeline:true});await tick();await q.answer('a','Alpha');
 const select=q.view.getByRole('combobox',{name:'Background music'});assert.equal(select.value,'none');
 await tick(()=>fireEvent.change(select,{target:{value:choice}}));
 await tick(()=>fireEvent.click(q.view.getByRole('button',{name:'Apply Jude Kinetic'})));await q.answer('a','Alpha');
 assert.equal(q.options().music,choice==='bundled');assert.equal(select.disabled,true);
 q.unmount();await tick(()=>q.gate.resolve({draftId:'owned-result'}));assert.equal(q.opens.length,0);assert.equal(q.lateWrites(),0);
});
test('Jude retains the focused Project/Draft and analysis state after late old success',async()=>{
 const q=jude();await tick();await q.update({sequenceId:'b'});await q.answer('b','Beta');await q.answer('a','Alpha',{words:0});assert.doesNotMatch(q.text(),/Alpha/);assert.match(q.text(),/Project: Project p/);assert.match(q.text(),/Current draft: Beta/);assert.ok(q.view.getByRole('button',{name:'Apply Jude Kinetic'}));
});
test('Jude discards old failure after Project switch and hides the previous name while reading',async()=>{
 const q=jude();await tick();await q.update({projectId:'p2',sequenceId:'b'});assert.doesNotMatch(q.text(),/Alpha/);await q.answer('b','Beta');await tick(()=>q.reads[0].reject(Error('old failure')));assert.match(q.text(),/Project: Project p2/);assert.match(q.text(),/Current draft: Beta/);
});
test('Jude missing metadata shows unavailable guidance and no old name',async()=>{
 const q=jude();await tick();await q.answer('a','Alpha');await q.update({sequenceId:'b'});await tick(()=>q.reads.findLast(x=>x.sid==='b').reject(Error('missing')));assert.match(q.text(),/Current draft: Name unavailable/);assert.doesNotMatch(q.text(),/Alpha/);
});
test('Jude unmount blocks all late metadata state writes',async()=>{
 const q=jude();await tick();q.unmount();await q.answer('a','Alpha');assert.equal(q.lateWrites(),0);
});
test('Jude detached run cannot publish status, errors, result or navigation over a new target',async()=>{
 const q=jude({pipeline:true});await tick();await q.answer('a','Alpha');await tick(()=>fireEvent.click(q.view.getByRole('button',{name:'Apply Jude Kinetic'})));await q.answer('a','Alpha');assert.ok(q.env());assert.match(q.text(),/Caption source draft: Project p \/ Alpha/);
 await q.update({sequenceId:'b'});await q.answer('b','Beta');await tick(()=>q.env().progress('OLD RUN STATUS'));assert.doesNotMatch(q.text(),/OLD RUN STATUS/);assert.match(q.text(),/Caption source draft: Project p \/ Alpha/);
 await tick(()=>q.gate.resolve({draftId:'old-result'}));assert.match(q.text(),/Current draft: Beta/);assert.doesNotMatch(q.text(),/ready\.|Aborted|OLD RUN/);assert.equal(q.opens.length,0);assert.equal(q.view.getByRole('button',{name:'Apply Jude Kinetic'}).disabled,false);
});
test('Jude source metadata validates Project ownership before reading Draft details',async()=>{
 const {readOpenDraft}=loadPanelModule(source('jude-kinetic-style'),{names:['readOpenDraft'],React});let draftReads=0;
 const sdk={runScript:async({script})=>{try{return{result:await new Function('selects','return(async()=>{'+script+'})()')({project:()=>({meta:async()=>({title:'Owner',draftIds:[]})}),draft:()=>{draftReads++;throw Error('Unexpected foreign Draft read')}})}}catch(e){return{isError:true,output:e.message}}}};
 await assert.rejects(readOpenDraft(sdk,'p','foreign','Read target'),/another Project/);assert.equal(draftReads,0);
});
function depth(){
 const requests=[],writes=[];let disposed=false,lateWrites=0;
 const observedReact={...React,useState(initial){const[v,set]=React.useState(initial);return[v,n=>{if(disposed)lateWrites++;set(n)}]}};
 const {DepthTypePanel,panelLocalClients}=loadPanelModule(source('depth-type-captions'),{names:['DepthTypePanel','panelLocalClients'],React:observedReact,overrides:{useAppUpdateGuard:()=>{}},globals:{window:dom.window,document:dom.window.document},filename:'plugins/depth-type-captions/panel.tsx'});
 const store={getItem:async()=>null,setItem:async(key,value)=>writes.push({key,value})};
 const sdk={runScript:input=>{assert.equal(input.allowCommit,false);const q=deferred();requests.push({input,...q});return q.promise}};
 panelLocalClients.set(sdk,{files:{join:(...p)=>p.join('/')},media:{},environment:{version:'2.0.999'},storage:store});
 let context={projectId:'p',sequenceId:'a',language:'en'};const view=render(h(DepthTypePanel,{sdk,context}));
 const update=async patch=>{context={...context,...patch};await tick(()=>view.rerender(h(DepthTypePanel,{sdk,context})))};
 const answer=async(index,projectName='Project p',name='Alpha')=>tick(()=>requests[index].resolve({result:{projectName,name,fps:24,width:1080,height:1920,duration:10,words:[]}}));
 return{view,requests,writes,update,answer,text:()=>view.container.textContent,unmount(){disposed=true;view.unmount()},lateWrites:()=>lateWrites};
}
test('Depth keyed editor shows current Project/Draft and ignores old lookup after a scope change',async()=>{
 const q=depth();await tick();await q.update({projectId:'p2',sequenceId:'b'});await q.answer(1,'Project Two','Beta');await q.answer(0,'Project One','Alpha');assert.match(q.text(),/Project: Project Two/);assert.match(q.text(),/Current draft: Beta/);assert.doesNotMatch(q.text(),/Alpha|Project One/);
 assert.ok(q.writes.every(row=>row.key.endsWith(':p:a')||row.key.endsWith(':p2:b')),'Existing recovery stays Project/Draft scoped');
});
test('Depth failed lookup shows unavailable target and preserves the error message',async()=>{
 const q=depth();await tick();await tick(()=>q.requests[0].reject(Error('Source metadata missing')));assert.match(q.text(),/Current draft: Name unavailable/);assert.match(q.text(),/Source metadata missing/);
});
test('Depth unmount prevents late target state writes',async()=>{
 const q=depth();await tick();q.unmount();await q.answer(0);assert.equal(q.lateWrites(),0);
});
test('Depth readonly name read keeps the existing Project ownership gate',async()=>{
 const {depthReadScript}=loadPanelModule(source('depth-type-captions'),{names:['depthReadScript'],React});let draftReads=0;
 await assert.rejects(new Function('selects','return(async()=>{'+depthReadScript('p','foreign')+'})()')({listProjects:async()=>[{id:'p',title:'Owner',draftIds:[]}],draft:()=>{draftReads++;throw Error('Unexpected foreign read')}}),/Open a Draft first/);assert.equal(draftReads,0);
});
