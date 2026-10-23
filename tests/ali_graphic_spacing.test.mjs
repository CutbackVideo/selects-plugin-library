import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadPanelModule} from './panel_module_fixture.mjs';
const modules=process.env.SBS_PANEL_TEST_MODULES;
assert.ok(modules,'Use existing panel test dependencies');
const require=createRequire(path.join(modules,'../package.json')),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const source=fs.readFileSync(new URL('../plugins/ali-abdaal-style/panel.tsx',import.meta.url),'utf8');
const {GRAPHIC,CAPTION,CAMERA_EFFECT}=loadPanelModule(source,{names:['GRAPHIC','CAPTION','CAMERA_EFFECT'],React});
const baseline=fs.readFileSync(new URL('./fixtures/ali-style/graphic-1080-baseline.tsx',import.meta.url),'utf8');
let frame=72,width=1080,height=1920;
const modulesBoundary={remotion:{useCurrentFrame:()=>frame,useVideoConfig:()=>({width,height,fps:24})}};
const current=loadPanelModule(GRAPHIC,{names:['Graphic'],React,modules:modulesBoundary}).Graphic;
const old=loadPanelModule(baseline,{names:['Graphic'],React,modules:modulesBoundary}).Graphic;
// Same genuine list wording as the native small-canvas failure, escaped for public source policy.
const list={kind:'list',title:'\uC0AC\uB78C\uC744 \uB9CC\uB098\uBA74 \uCE90\uCE58\uD558\uB294 \uAC83\uB4E4',body:'',items:['\uC5B4\uB5A4 \uC810\uC774 \uD798\uB4E0\uC9C0','\uC65C \uC2DC\uC791\uD588\uB294\uC9C0','\uBB34\uC5C7\uC774 \uC911\uC694\uD55C\uC9C0'],start:0,enter:2,end:220,camera:[]};
const scenes=[list,{...list,kind:'headline',title:'I hate cameras, bro',items:[]},{...list,kind:'note',title:'How do you change auto-focus?',body:'Quick camera check before rolling',items:[]}];
function tree(data=list,w=1080,at=72,fn=current){width=w;height=w*16/9;frame=at;return fn({data});}
function content(node){return node.props.children.props.children;}
function parts(data=list,w=1080,at=72){const root=tree(data,w,at),box=content(root),children=box.props.children;return{root,box,eyebrow:children[0],title:children[1],body:children[2],chips:children[3],underline:children[4]};}
const numbers=s=>[...String(s).matchAll(/(-?[\d.]+)px/g)].map(m=>+m[1]);
test('complete production GRAPHIC preserves the exact 1080 output across scene kinds, entry and exit',()=>{
 for(const data of scenes)for(const at of [0,2,12,50,72,197,219]){width=1080;height=1920;frame=at;assert.equal(renderToStaticMarkup(React.createElement(current,{data})),renderToStaticMarkup(React.createElement(old,{data})));}
});
test('small output halves list padding, gap and margins so font scaling cannot leave full-size chip furniture',()=>{
 const a=parts(),b=parts(list,540);
 for(const key of ['gap','marginTop'])assert.equal(b.chips.props.style[key],a.chips.props.style[key]/2,key);
 for(let i=0;i<3;i++){
  const x=a.chips.props.children[i],y=b.chips.props.children[i];
  assert.deepEqual(numbers(y.props.style.padding),numbers(x.props.style.padding).map(v=>v/2));
  assert.equal(y.props.style.borderRadius,x.props.style.borderRadius/2);
  assert.equal(y.props.children[0].props.style.marginRight,x.props.children[0].props.style.marginRight/2);
 }
 assert.equal(b.eyebrow.props.style.marginBottom,a.eyebrow.props.style.marginBottom/2);
});
test('title and body fixed spacing scale with the same canvas while words and font policy remain intact',()=>{
 for(const data of scenes){const a=parts(data),b=parts(data,540);
  assert.equal(b.eyebrow.props.style.letterSpacing,a.eyebrow.props.style.letterSpacing/2);
  assert.equal(b.title.props.style.letterSpacing,a.title.props.style.letterSpacing/2);
  assert.deepEqual(numbers(b.title.props.children[0].props.style.margin),numbers(a.title.props.children[0].props.style.margin).map(v=>v/2));
  if(a.body)assert.deepEqual(numbers(b.body.props.style.margin),numbers(a.body.props.style.margin).map(v=>v/2));
  for(const key of ['fontFamily','fontWeight','lineHeight','color'])assert.equal(b.title.props.style[key],a.title.props.style[key]);
  assert.deepEqual(b.title.props.children.map(x=>x.props.children),a.title.props.children.map(x=>x.props.children));
 }
});
test('underline length floor, thickness and margin scale instead of descending past a wrapped chip row',()=>{
 for(const data of scenes){const a=parts(data),b=parts(data,540);
  for(const key of ['height','width','borderRadius'])assert.equal(b.underline.props.style[key],a.underline.props.style[key]/2,key);
  assert.deepEqual(numbers(b.underline.props.style.margin),numbers(a.underline.props.style.margin).map(v=>v/2));
 }
});
test('animation timing, opacity and camera percentages remain the existing policy',()=>{
 for(const data of scenes)for(const at of [0,12,50,197,219]){
  const a=tree(data,1080,at),b=tree(data,540,at);assert.equal(a.props.style.opacity,b.props.style.opacity);
  assert.deepEqual(a.props.children.props.data,b.props.children.props.data);assert.equal(a.props.children.props.f,b.props.children.props.f);
 }
 assert.ok(CAPTION.includes('scale=width/1080'));assert.ok(CAMERA_EFFECT.includes("transformOrigin:'50.9% 17%'"));
});
