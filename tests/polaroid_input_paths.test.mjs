import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import test from 'node:test';
import {loadPanelFunctions} from './windows_host.mjs';

const modules=process.env.SBS_PANEL_TEST_MODULES;
if(!modules)throw Error('Set SBS_PANEL_TEST_MODULES to the React/esbuild/jsdom dependency directory.');
const dep=createRequire(path.resolve(modules,'../package.json'));
const React=dep('react'),{createRoot}=dep('react-dom/client'),{JSDOM}=dep('jsdom'),esbuild=dep('esbuild');
const source=fs.readFileSync(new URL('../plugins/polaroid-photo-dump/panel.tsx',import.meta.url),'utf8');
const locations=[
 ['Windows mixed case','win32','C:\\Profiles\\Fixture\\.SELECTS\\PLUGIN-DATA\\POLAROID-PHOTO-DUMP\\frame-v1.png'],
 ['Windows forward slashes','win32','C:/Profiles/Fixture/.selects/plugin-data/Polaroid-Photo-Dump/frame-v1.png'],
 ['UNC','win32','\\\\studio\\share\\.selects\\plugin-data\\polaroid-photo-dump\\frame-v1.png'],
 ['POSIX','darwin','/user/.selects/plugin-data/polaroid-photo-dump/frame-v1.png'],
 ['repeated separators','win32','C:/Profiles/Fixture//.selects//plugin-data///polaroid-photo-dump/frame-v1.png'],
 ['parent segments','win32','C:\\Profiles\\Fixture\\.selects\\plugin-data\\temporary\\..\\polaroid-photo-dump\\frame-v1.png'],
];
function fixture(ownedPath){
 const rows=[{resourceId:'frame',name:'Bundled frame',path:ownedPath,type:'Image'},...Array.from({length:17},(_,i)=>({resourceId:'photo'+i,name:i?'Photo '+i:'frame-v1.png',path:i===0?'/photos/frame-v1.png':i===1?'/photos/.selects/plugin-data/polaroid-photo-dump-copy/photo.png':'/photos/'+i+'.png',type:'Image'}))];
 const calls=[],project={resources:async()=>rows,sourceFiles:async()=>({fileTree:rows.map(r=>({...r,type:'image'}))})};
 const sdk={call:async()=>rows.map(r=>({...r,resourceId:'app-'+r.resourceId})),runScript:async input=>{
  calls.push(input);assert.equal(input.allowCommit,false);
  return {result:await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects:{project:()=>project}})};
 }};
 return {rows,sdk,calls};
}
test('Polaroid path navigation outside its reserved namespace remains a user photo in the browser',async t=>{
 const f=fixture(locations[3][2]);f.rows[2].path='/user/.selects/plugin-data/polaroid-photo-dump/../user-photo.png';
 const document=await panel(t,'darwin',f),select=document.querySelector('select');
 assert.ok([...select.options].some(o=>o.value==='photo1'));assert.equal(select.options.length,18);
});
test('Polaroid path navigation outside its reserved namespace remains valid app input',async()=>{
 const f=fixture(locations[3][2]);f.rows[2].path='/user/.selects/plugin-data/polaroid-photo-dump/../user-photo.png';
 const api=loadPanelFunctions(source,['readMediaPages','INVENTORY','inventory','SLOTS','templateIssue','templateSelection','isPolaroidAssetPath']);
 const photos=f.rows.slice(1).map(r=>({resourceId:'app-'+r.resourceId,name:r.name,kind:'image'}));
 const selected=await api.templateSelection(f.sdk,null,'p',null,{photos});
 assert.deepEqual(Array.from(selected,r=>r.resourceId),f.rows.slice(1).map(r=>r.resourceId));
});
async function panel(t,platform,f){
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'}),previous={};
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){
  previous[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
 }
 const extra='\nexport function __bind(sdk,local){panelLocalClients.set(sdk,local);}export function __ui(props){useAppUpdateGuard=()=>{};hostUseSdk(props.sdk);return PhotoPanel(props);}';
 const code=esbuild.transformSync(source+extra,{loader:'tsx',format:'cjs',jsx:'automatic',target:'es2022'}).code,module={exports:{}};
 new Function('require','module','exports',code)(dep,module,module.exports);module.exports.__bind(f.sdk,{...f.sdk,environment:{platform}});
 const box=({children})=>React.createElement('div',null,children);
 const ui={Stack:box,Section:box,Message:box,Actions:box,
  Button:({children,onClick,disabled})=>React.createElement('button',{onClick,disabled},children),
  Select:({label,value,options,disabled,onChange})=>React.createElement('select',{'aria-label':label,value,disabled,onChange:e=>onChange(e.target.value)},React.createElement('option',{value:''},'Choose'),...options.map(o=>React.createElement('option',{key:o.value,value:o.value},o.label))),
  TextField:({value,onChange})=>React.createElement('input',{value,onChange:e=>onChange(e.target.value)}),
  Slider:({value})=>React.createElement('input',{type:'range',value,onChange:()=>{}}),
 };
 const root=createRoot(document.getElementById('root'));
 t.after(async()=>{await React.act(async()=>root.unmount());dom.window.close();for(const [key,value] of Object.entries(previous)){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
 await React.act(async()=>root.render(React.createElement(module.exports.__ui,{sdk:f.sdk,context:{projectId:'p'},ui})));
 const load=[...document.querySelectorAll('button')].find(b=>b.textContent==='Load Project photos');assert.ok(load);
 await React.act(async()=>load.click());
 return document;
}
for(const [label,platform,ownedPath] of locations){
 test('Polaroid '+label+': loading photos cannot auto-fill the bundled frame',async t=>{
  const f=fixture(ownedPath),document=await panel(t,platform,f),selects=[...document.querySelectorAll('select')];
  assert.equal(selects.length,17);assert.equal(selects[0].value,'photo0');
  assert.equal(selects.some(s=>[...s.options].some(o=>o.value==='frame')),false);
  assert.equal(selects[0].options.length,18,'17 user photos plus the empty choice');
  assert.ok([...selects[0].options].some(o=>o.value==='photo0'&&o.textContent==='frame-v1.png'),'a matching filename outside plugin data remains a user photo');
  assert.ok([...selects[0].options].some(o=>o.value==='photo1'),'a lookalike folder is not plugin-owned');
 });
 test('Polaroid '+label+': app-picked bundled frame is rejected without asset or Draft writes',async()=>{
  const f=fixture(ownedPath),names=['readMediaPages','INVENTORY','inventory','SLOTS','templateIssue','templateSelection'];
  if(source.includes('function isPolaroidAssetPath('))names.push('isPolaroidAssetPath');
  const api=loadPanelFunctions(source,names),picks=f.rows.slice(0,17).map(r=>({resourceId:'app-'+r.resourceId,name:r.name,kind:'image'}));
  await assert.rejects(api.templateSelection(f.sdk,null,'p',null,{photos:picks}),/frame|template|own photos/i);
  assert.ok(f.calls.every(c=>!c.allowCommit));
 });
}
