import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import test from 'node:test';

const modules=process.env.SBS_PANEL_TEST_MODULES;
if(!modules)throw Error('Set SBS_PANEL_TEST_MODULES to React/esbuild/jsdom dependencies.');
const dep=createRequire(path.resolve(modules,'../package.json'));
const React=dep('react'),{createRoot}=dep('react-dom/client'),{JSDOM}=dep('jsdom'),esbuild=dep('esbuild');
const files={archive:'archive-vlog/assets/cinematic-look.tsx',mini:'mini-vlog/assets/soft-look.tsx',end:'the-end-credits/assets/cinematic-look.tsx'};

async function fixture(t,kind,{legacyIds=false}={}){
 const dom=new JSDOM('<div id="root"></div>'),previous={};
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){
  previous[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
 }
 const file=process.env.COLOR_SOURCE_ROOT?path.join(process.env.COLOR_SOURCE_ROOT,kind+'-original.tsx'):new URL('../plugins/'+files[kind],import.meta.url);
 const code=esbuild.transformSync(fs.readFileSync(file,'utf8'),{loader:'tsx',format:'cjs',jsx:'automatic',target:'es2022'}).code,module={exports:{}};
 new Function('require','module','exports',code)(id=>id==='remotion'?{AbsoluteFill:({children,style})=>React.createElement('div',{style},children)}:id==='react'&&legacyIds?{...React,useId:undefined}:dep(id),module,module.exports);
 const Effect=module.exports.default,root=createRoot(document.getElementById('root'));
 let mounts=0,unmounts=0;
 function Source(){React.useEffect(()=>{mounts++;return()=>{unmounts++;};},[]);return React.createElement('img',{'data-source':'original',src:'original.png'});}
 function Replacement(){return React.createElement('img',{'data-source':'replacement',src:'replacement.png'});}
 async function render(strength,{children=false,source=Source,warmth=1}={}){
  await React.act(()=>root.render(React.createElement(Effect,{data:{strength,warmth},Source:children?undefined:source},children?React.createElement(Source):undefined)));
  return document.querySelector('[data-source]');
 }
 const close=async()=>{await React.act(()=>root.unmount());};
 t.after(async()=>{await close();dom.window.close();for(const [key,value]of Object.entries(previous)){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
 async function renderMany(strengths){await React.act(()=>root.render(React.createElement(React.Fragment,null,...strengths.map((strength,i)=>React.createElement(Effect,{key:i,Source,data:{strength,warmth:1}})))));return Array.from(document.querySelectorAll('filter'));}
 return {render,renderMany,close,Replacement,filter:()=>document.querySelector('filter'),mounts:()=>mounts,unmounts:()=>unmounts};
}

// Interpret the actual emitted SVG graph using Filter Effects' premultiplied
// compositing and unpremultiplied matrix/transfer rules, independent of helpers.
function pixel(filter,rgba){
 const clamp=n=>Math.max(0,Math.min(1,n)),premul=c=>c.map((v,i)=>i===3?v:v*c[3]);
 const straight=c=>c[3]?c.map((v,i)=>i===3?v:v/c[3]):[0,0,0,0];
 const source=premul(rgba),images=new Map([['SourceGraphic',source],['SourceAlpha',[0,0,0,rgba[3]]]]);let previous=source;
 for(const node of filter.children){
  const input=images.get(node.getAttribute('in'))??previous;let out;
  if(node.localName==='feColorMatrix'){
   const m=node.getAttribute('values').trim().split(/\s+/).map(Number),c=straight(input);
   assert.equal(m.length,20);out=premul([0,1,2,3].map(r=>clamp(m[r*5+4]+c.reduce((v,n,i)=>v+m[r*5+i]*n,0))));
  }else if(node.localName==='feComponentTransfer'){
   const c=straight(input);
   for(const fn of node.children){const i='RGBA'.indexOf(fn.localName.at(-1)),type=fn.getAttribute('type');
    if(type==='linear')c[i]=clamp(Number(fn.getAttribute('slope'))*c[i]+Number(fn.getAttribute('intercept')));
    else if(type==='table'){const values=fn.getAttribute('tableValues').trim().split(/\s+/).map(Number),x=c[i]*(values.length-1),k=Math.min(Math.floor(x),values.length-2);c[i]=clamp(values[k]+(x-k)*(values[k+1]-values[k]));}
    else throw Error('Unhandled SVG transfer '+type);
   }out=premul(c);
  }else if(node.localName==='feComposite'){
   const b=images.get(node.getAttribute('in2'));assert.ok(b);const op=node.getAttribute('operator');
   if(op==='in')out=input.map(v=>v*b[3]);
   else if(op==='arithmetic'){const k=[1,2,3,4].map(n=>Number(node.getAttribute('k'+n)||0));out=input.map((v,i)=>clamp(k[0]*v*b[i]+k[1]*v+k[2]*b[i]+k[3]));out=out.map((v,i)=>i===3?v:Math.min(v,out[3]));}
   else throw Error('Unhandled SVG composite '+op);
  }else throw Error('Unhandled SVG primitive '+node.localName);
  previous=out;const result=node.getAttribute('result');if(result)images.set(result,out);
 }return straight(previous);
}

for(const kind of Object.keys(files))for(const children of [false,true])for(const steps of [[.3,0,.3],[0,.3,0],[.3,1,.05]])test(kind+' color surface preserves '+(children?'children':'Source')+' across '+steps.join(' -> '),async t=>{
 const f=await fixture(t,kind),first=await f.render(steps[0],{children});
 for(const strength of steps.slice(1))assert.equal((await f.render(strength,{children}))===first,true,'The same original media element must remain mounted.');
 assert.equal(f.mounts(),1);assert.equal(f.unmounts(),0);
 await f.close();assert.equal(f.unmounts(),1,'The final owner unmount cleans its source exactly once.');
});

test('Archive color surface preserves the original across warmth edits',async t=>{
 const f=await fixture(t,'archive'),first=await f.render(.3,{warmth:0});
 assert.equal((await f.render(.3,{warmth:2}))===first,true);assert.equal(f.mounts(),1);assert.equal(f.unmounts(),0);
});

for(const kind of Object.keys(files))test(kind+' color surface retires a deliberately replaced source',async t=>{
 const f=await fixture(t,kind),first=await f.render(.3),next=await f.render(.3,{source:f.Replacement});
 assert.equal(first===next,false);assert.equal(f.unmounts(),1);assert.equal(next.dataset.source,'replacement');
});

const colors=[[1,1,1],[0,0,0],[.5,.5,.5],[.2,.7,.3],[.95,.45,.05],[.3,.5,.85],[.85,.72,.62],[.8,.2,.7]];
const baseline=JSON.parse(fs.readFileSync(new URL('./color_filter_opaque.json',import.meta.url),'utf8'));
for(const kind of Object.keys(files))test(kind+' emitted SVG retains the original Chromium opaque-color baseline',async t=>{
 const f=await fixture(t,kind);
 for(const sample of baseline.cases.filter(row=>row.asset===kind)){
  await f.render(sample.strength);const filter=f.filter();
  for(const [row,input]of baseline.inputRows.entries()){
   const out=pixel(filter,[...input.map(n=>n/255),1]);
   for(let channel=0;channel<3;channel++)assert.ok(Math.abs(out[channel]*255-sample.rgba[row][channel])<=2,'Color policy changed relative to the recorded original raster.');
  }
 }
});
for(const kind of Object.keys(files))for(const legacyIds of [false,true])test(kind+' independent instances keep unique, stable filter ids'+(legacyIds?' without useId':''),async t=>{
 const f=await fixture(t,kind,{legacyIds}),filters=await f.renderMany([.3001,.3004]),ids=filters.map(filter=>filter.id);
 assert.equal(new Set(ids).size,2,'Different graphs must not share a document filter identity.');
 assert.notEqual(filters[0].innerHTML,filters[1].innerHTML);
 assert.deepEqual((await f.renderMany([.7,.05])).map(filter=>filter.id),ids,'Parameter edits must not replace per-instance filter identity.');
});
for(const kind of Object.keys(files))test(kind+' actual SVG preserves every 8-bit alpha and grades RGB independently',async t=>{
 const f=await fixture(t,kind);
 for(const strength of [.05,.3,.5,1])for(const warmth of (kind==='archive'?[0,1,2]:[1])){
  await f.render(strength,{warmth});const filter=f.filter();assert.ok(filter);
  for(const rgb of colors){const opaque=pixel(filter,[...rgb,1]);
   for(let alpha=0;alpha<=255;alpha++){const a=alpha/255,out=pixel(filter,[...rgb,a]);
    assert.ok(Math.abs(out[3]-a)<1e-12,'Original coverage changed at '+alpha);
    if(alpha)for(let c=0;c<3;c++)assert.ok(Math.abs(out[c]-opaque[c])<1e-9,'Translucency changed the color grade.');
   }
  }
 }
});
