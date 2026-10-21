const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('ink captions keep a single enclosing box or independent line boxes',{skip:!modules},()=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),React=dep('react'),esbuild=dep('esbuild'),render=dep('react-dom/server').renderToStaticMarkup;
 const metrics=[{raw:'Wide',advance:200,left:0,right:200,ascent:40,descent:5,baselineOffset:40,size:50},{raw:'Short',advance:100,left:0,right:100,ascent:30,descent:5,baselineOffset:40,size:50}];
 const mocked={...React,useState:()=>[metrics,()=>{}],useEffect:()=>{}};
 const requireMock=n=>n==='react'?mocked:dep(n);
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),m={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {SCRIPT_BUILD,RadioPreviewCaption};',{loader:'tsx',format:'cjs'}).code)(requireMock,m,m.exports);
 const line=m.exports.SCRIPT_BUILD.split('\n').find(x=>x.startsWith('const CAPTION_TSX:'));
 const code=JSON.parse(line.slice(line.indexOf('=')+1).trim().replace(/;$/,'')),e={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(code,{loader:'tsx',format:'cjs'}).code)(requireMock,e,e.exports);
 const params={text:'Wide\nShort',mode:'box',boxBounds:'ink',baselineBottom:1300,rowGap:60,left:40,width:1000,fontSize:50,boxPaddingX:10,boxPaddingTop:10,boxPaddingBottom:10,boxColor:'#000000'};
 for(const perLine of [false,true,undefined]){
  const data={...params,boxPerLine:perLine};
  const actual=render(React.createElement(e.exports.default,{data}));
  assert.equal(actual,render(React.createElement(m.exports.RadioPreviewCaption,{data})));
  assert.equal((actual.match(/background:#000000/g)||[]).length,perLine===false?1:2);
  if(perLine===false)assert.match(actual,/left:430px;top:1190px;width:220px;height:125px;background:#000000/);
 }
});
