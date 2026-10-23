import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadPanelFunctions, panelSource} from './windows_host.mjs';
const modules=process.env.SBS_PANEL_TEST_MODULES;
if(!modules)throw Error('Set SBS_PANEL_TEST_MODULES to esbuild dependencies.');
const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
const source=process.env.DAILY_VLOG_PANEL?fs.readFileSync(process.env.DAILY_VLOG_PANEL,'utf8'):panelSource('daily-vlog-8');
const current=loadPanelFunctions(source,['OPENING','MIDDLE','ENDING']);
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/daily-vlog-8/reference-title-programs.json',import.meta.url),'utf8')).programs;
const interpolate=(x,at,values,options={})=>{let i=at.findIndex((v,j)=>j&&x<=v);if(i<0)i=at.length-1;if(x<at[0]&&options.extrapolateLeft==='clamp')return values[0];if(x>at.at(-1)&&options.extrapolateRight==='clamp')return values.at(-1);return values[i-1]+(values[i]-values[i-1])*(x-at[i-1])/(at[i]-at[i-1]);};
function render(program,frame,size,data){
 const code=esbuild.transformSync(program,{loader:'tsx',format:'cjs',jsx:'transform',jsxFactory:'React.createElement',target:'es2022'}).code,module={exports:{}};
 const React={createElement:(type,props,...children)=>({type,props:props||{},children})};
 const remotion={AbsoluteFill:'AbsoluteFill',useCurrentFrame:()=>frame,useVideoConfig:()=>({...size,fps:30,durationInFrames:150}),interpolate};
 new Function('require','module','exports',code)(name=>name==='react'?React:name==='remotion'?remotion:(()=>{throw Error(name)})(),module,module.exports);
 return module.exports.default({data});
}
function styles(tree,out=[]){if(!tree)return out;if(Array.isArray(tree)){tree.forEach(x=>styles(x,out));return out;}if(typeof tree==='object'){if(tree.props?.style)out.push(tree.props.style);tree.children?.forEach(x=>styles(x,out));}return out;}
const DATA={OPENING:{text:'DAILY VLOG',fontFamily:'Chelsea Market Pro',fontSize:255,color:'#FEDC5E'},MIDDLE:{text:'JUST EVERYDAY MOMENTS',fontFamily:'Courier New',fontSize:73,color:'#fff'},ENDING:{text:'THANKS FOR WATCHING',fontFamily:'Courier New',fontSize:60,color:'#fff',letterSpacing:1.2}};
for(const name of Object.keys(DATA))test(name+': all1920×1080 styles/text stay exactly unchanged across animation',()=>{for(const frame of [0,2,9,15,30,43,59,100,149])assert.deepEqual(render(current[name],frame,{width:1920,height:1080},DATA[name]),render(baseline[name],frame,{width:1920,height:1080},DATA[name]));});
for(const size of [{width:640,height:338},{width:1280,height:720},{width:3840,height:2160},{width:1080,height:1920}])for(const name of Object.keys(DATA))test(name+': typography scales consistently on '+size.width+'×'+size.height,()=>{
 const scale=Math.min(size.width/1920,size.height/1080),a=styles(render(current[name],10,size,DATA[name])),b=styles(render(current[name],10,{width:1920,height:1080},DATA[name]));assert.equal(a.length,b.length);
 for(let i=0;i<a.length;i++)for(const key of ['fontSize','letterSpacing','width','height','marginLeft'])if(typeof b[i][key]==='number')assert.ok(Math.abs(a[i][key]-b[i][key]*scale)<1e-9,name+' '+key+' must follow canvas scale');
 const shadow=a.find(s=>s.textShadow)?.textShadow;if(shadow)assert.equal(shadow,`0 ${2*scale}px ${6*scale}px rgba(0,0,0,.25)`);
});
test('low-resolution ending title fits inside640px instead of exceeding its canvas',()=>{const ss=styles(render(current.ENDING,100,{width:640,height:338},DATA.ENDING)),text=ss.find(s=>s.fontSize);assert.ok(text.fontSize<21);assert.ok(text.letterSpacing<.4);});
