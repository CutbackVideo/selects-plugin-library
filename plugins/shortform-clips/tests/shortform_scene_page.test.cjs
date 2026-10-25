'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('page viewport preserves original pixels',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {createSceneMediaTools};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const item={resourceId:'paper',path:'/paper.png',type:'Image',width:2000,height:3000},calls=[],clips=[];
 const d={meta:async()=>({frameSize:{width:1080,height:1920},fps:30}),rangeAtFrames:async(a,b)=>({a,b}),clips:async()=>clips,addMotionGraphic:async o=>{calls.push(o);const c={clipId:clips.length+1};clips.push(c);return c;}};
 const media=await mod.exports.createSceneMediaTools({files:{localUrl:async p=>'file://'+p}},{sourceFiles:async()=>({fileTree:[item]}),resources:async()=>[item]},d,[item],{page:{dimOpacity:.21,paperColor:'#F4F3EE',moveSeconds:.8}});
 const whole={x:0,y:0,width:1,height:1},to={x:.1,y:.1,width:.8,height:.3},highlight={x:.12,y:.12,width:.75,height:.1};let options;
 await t.test('one editable component contains source, camera and transparent highlight hole',async()=>{
  await media.page('Page',item,{startFrame:30,endFrame:150},{from:whole,to,highlight});options=calls[0];
  assert.deepEqual(options.within,{a:30,b:150});assert.equal(options.parameters.dimOpacity,.21);assert.equal(options.parameters.src,'file:///paper.png');
  assert(options.tsxCode.includes('fillRule="evenodd"'));assert(!options.tsxCode.includes('fill="#FFFFFF"'));
  for(const key of ['fromX','toWidth','highlightX','highlightHeight','dimOpacity','moveSeconds'])assert(options.editableParameters.some(p=>p.key===key));
 });
 function markup(frame){const React=dep('react'),m={exports:{}};new Function('require','module','exports','React',esbuild.transformSync(options.tsxCode,{loader:'tsx',format:'cjs'}).code)(n=>n==='remotion'?{AbsoluteFill:({children,style})=>React.createElement('div',{style},children),Img:props=>React.createElement('img',props),useCurrentFrame:()=>frame,useVideoConfig:()=>({width:1080,height:1920,fps:30})}:dep(n),m,m.exports,React);return dep('react-dom/server').renderToStaticMarkup(React.createElement(m.exports.default,{data:options.parameters}));}
 await t.test('source and dim share the identical camera transform during movement',()=>{
  for(const frame of [0,12,24,30]){const html=markup(frame);assert.equal((html.match(/data-page-camera/g)||[]).length,1);assert.equal((html.match(/transform:/g)||[]).length,1);assert(html.indexOf('<img')<html.indexOf('data-page-dim'));assert(html.includes('fill-rule="evenodd"'));assert(html.includes('M0 0H2000V3000H0Z M240 360H1740V660H240Z'));}
  assert(markup(0).includes('scale(0.54)'));assert(markup(24).includes('scale(0.675)'));assert(markup(0).includes('opacity:0'));assert(markup(30).includes('opacity:0.21'));
 });
 await t.test('invalid or clipped highlight rectangles reject before any edit',async()=>{
  const before=calls.length;
  for(const view of [{to:{...to,width:2}},{to,highlight:{...highlight,x:0}},{to,highlight:{...highlight,width:NaN}}])await assert.rejects(media.page('Bad',item,{startFrame:0,endFrame:90},view));
  assert.equal(calls.length,before);
 });
 await t.test('no highlight leaves page undimmed and a static shot has no motion',async()=>{
  await media.page('Static',item,{startFrame:0,endFrame:90},{to:whole});const o=calls.at(-1);assert.equal(o.parameters.highlightOn,false);assert.equal(o.parameters.moveSeconds,0);
 });
});
