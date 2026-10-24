'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('panel starts secondary host work after the first template list settles',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),React=dep('react'),{act}=React,{JSDOM}=dep('jsdom');
 const dom=new JSDOM('<div id="root"></div>');
 const keys=['window','document','IS_REACT_ACT_ENVIRONMENT'],before=Object.fromEntries(keys.map(k=>[k,global[k]]));
 Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 // Keep the real panel and effects; replace only its two filesystem-backed dependencies.
 let source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 for(const [from,to] of [
  ['React.useMemo(() => makeStore(files), [files])','React.useMemo(() => files.testStore, [files])'],
  ['React.useMemo(() => makeTemplateRepository(store), [store])','React.useMemo(() => store.repository, [store])'],
 ]) {assert.ok(source.includes(from));source=source.replace(from,to);}
 const mod={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {ShortformClipsPanel};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const ui=new Proxy({}, {get:(o,k)=>o[k]??(o[k]=props=>{
  if(k==='Tabs'){const item=props.items?.find(x=>x.value===props.value)||props.tabs?.find(x=>x.value===props.value);return React.createElement('div',null,item?.content);}
  if(k==='TextField'||k==='Select'||k==='Toggle')return React.createElement('span',null,props.label);
  return React.createElement('div',null,props.children);
 })});
 const flush=()=>act(async()=>{await new Promise(r=>setImmediate(r));});
 async function fixture(fail=false){
  const list=deferred(),calls=[],callbacks={};let root=dep('react-dom/client').createRoot(document.getElementById('root'));
  const store={repository:{listTemplates:()=>{calls.push('templates');return list.promise;}},list:async()=>{calls.push('jobs');return [];},get:async()=>null};
  const sdk={
   runScript:async({summary})=>{calls.push(summary);if(summary==='Check visible Draft')return {result:{projectId:'p',onScreenTab:{kind:'none'}}};return {result:[]};},
   runShell:async()=>{calls.push('update shell');return {exitCode:0,stdout:'null'};},
   on:(event,cb)=>{callbacks[event]=cb;return ()=>{delete callbacks[event];};},
   updates:{registerGuard:()=>{calls.push('guard');return ()=>{};},register:(provider)=>{calls.push('update');void provider.checkUpdate({latest:null});return ()=>{calls.push('unregister update');};}},
  };
  const props={sdk,context:{projectId:'p',language:'en'},ui,files:{testStore:store}};
  await act(async()=>root.render(React.createElement(mod.exports.ShortformClipsPanel,props)));
  await flush();
  assert.ok(calls.includes('templates'));assert.ok(calls.includes('guard'),'update safety guard stays immediate');
  assert.equal(calls.filter(x=>!['templates','guard'].includes(x)).length,0,'no startup host contention before the list');
  assert.equal(callbacks.resourcesChanged,undefined);
  await act(async()=>{if(fail)list.reject(Error('list denied'));else list.resolve({templates:[],packs:[],errors:[]});});
  await flush();
  for(const expected of ['Check visible Draft','List source videos and synced timelines','List Draft inputs','update','update shell','jobs'])assert.ok(calls.includes(expected),expected+' must start after list settles');
  const start=calls.length;
  await act(async()=>callbacks.resourcesChanged());await flush();
  assert.ok(calls.slice(start).includes('List source videos and synced timelines'),'resource notifications still refresh');
  await act(async()=>root.unmount());
  assert.equal(callbacks.resourcesChanged,undefined);
  assert.ok(calls.includes('unregister update'));
 }
 try{
  await t.test('pending list keeps all secondary work deferred, then releases normal startup',()=>fixture());
  await t.test('failed list also releases secondary features rather than waiting forever',()=>fixture(true));
 }finally{dom.window.close();for(const k of keys){if(before[k]===undefined)delete global[k];else global[k]=before[k];}}
});
