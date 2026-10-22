'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;
test('shared article flow',{skip:!modulesRoot&&'Set SBS_PANEL_TEST_MODULES'},async t=>{
 const dep=createRequire(path.resolve(modulesRoot,'../package.json')),esbuild=dep('esbuild'),source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 const factory=source.slice(source.indexOf('async function createSceneMediaTools('),source.indexOf('\nfunction sceneBuildPrompt('));
 const create=new Function(esbuild.transformSync(factory,{loader:'ts'}).code+';return createSceneMediaTools;')();
 const style={fontFamily:'Arial',fontSize:42,color:'#000000',sourceFontSize:22,sourceColor:'#ffffff',padding:28,gap:12,backgroundColor:'#ffffff',lineHeight:1.35,sourceLineHeight:1.3,textAlign:'left'};
 async function fixture(styles={}){const calls=[],clips=[];const d={meta:async()=>({frameSize:{width:1080,height:1920},fps:30}),rangeAtFrames:async(a,b)=>({a,b}),clips:async()=>clips.map(c=>({...c})),addMotionGraphic:async o=>{calls.push(['add',o]);const c={clipId:clips.length+1,trackKind:'video',startFrame:o.within.a,endFrame:o.within.b};clips.push(c);return c;},setClipTransform:async o=>calls.push(['transform',o])};return{calls,clips,media:await create({},{sourceFiles:async()=>({fileTree:[]}),resources:async()=>[]},d,[],styles)};}
 await t.test('template article style owns appearance while content and placement remain variable',async()=>{
  const f=await fixture({article:style});
  await f.media.article('Evidence',{startFrame:10,endFrame:70},{body:'Supplied excerpt',source:'Supplied source',fontSize:99,color:'#ff0000'},{x:400,y:600,width:700});
  const o=f.calls[0][1];assert.equal(o.parameters.fontSize,42);assert.equal(o.parameters.color,'#000000');assert.equal(o.parameters.body,'Supplied excerpt');assert.equal(o.parameters.source,'Supplied source');assert.equal(o.parameters.width,700);assert.deepEqual(o.within,{a:10,b:70});
 });
 function markup(o){const React=dep('react'),component={exports:{}};const compiled=esbuild.transformSync(o.tsxCode,{loader:'tsx',format:'cjs',jsx:'transform'}).code;new Function('module','exports','require','React',compiled)(component,component.exports,n=>n==='remotion'?{AbsoluteFill:({children,style})=>React.createElement('div',{style:{position:'absolute',inset:0,...style}},children)}:dep(n),React);return dep('react-dom/server').renderToStaticMarkup(React.createElement(component.exports.default,{data:o.parameters}));}
 await t.test('document style keeps attribution readable on supplied light paper without a second panel',async()=>{
  const f=await fixture({article:style,articleStyles:{document:{backgroundColor:'#00000000',sourceColor:'#000000',textAlign:'center'}}});
  await f.media.article('Statement',{startFrame:0,endFrame:180},{body:'Provided statement',source:'Provided attribution',style:'document'},{x:540,y:600,width:800});
  const o=f.calls[0][1];assert.equal(o.parameters.backgroundColor,'#00000000');assert.equal(o.parameters.sourceColor,'#000000');assert.equal(o.parameters.fontSize,42);assert.equal(o.parameters.textAlign,'center');assert(markup(o).includes('word-break:keep-all'));
  await assert.rejects(f.media.article('Unknown',{startFrame:0,endFrame:180},{body:'Text',style:'missing'},{x:540,y:600,width:800}),/Unknown template article style/);
 });
 await t.test('top-anchored articles grow below the chosen origin while legacy center placement remains unchanged',async()=>{
  for(const anchor of [undefined,'top']){
   const f=await fixture({article:style});
   await f.media.article('Evidence',{startFrame:0,endFrame:100},{body:'Long evidence\nSecond line',source:'Attribution'},{x:540,y:250,width:750,...anchor?{anchor}:{}});
   const o=f.calls[0][1];assert.equal(o.parameters.anchor,anchor??'center');
   assert.equal(markup(o).includes('translateY(50%)'),anchor==='top');
   assert.equal(f.calls[1][1].position.y,(960-250)/19.2);
  }
  const f=await fixture({article:style});
  await assert.rejects(f.media.article('Invalid',{startFrame:0,endFrame:100},{body:'Body'},{x:540,y:250,width:750,anchor:'bottom'}),/Article anchor/);
  assert.equal(f.calls.length,0);
 });
 let example;
 await t.test('one editable graphic owns wrapped body, source and exact common lifetime',async()=>{
  const f=await fixture(),parameters={...style,body:'A longer article paragraph with several lines that can wrap naturally.\nA second paragraph remains inside the same block.',source:'Source: supplied publication, date and title'},before=structuredClone(parameters);
  const c=await f.media.article('Article',{startFrame:30,endFrame:180},parameters,{x:540,y:720,width:800});
  assert.equal(f.clips.length,1);assert.deepEqual([c.startFrame,c.endFrame],[30,180]);assert.deepEqual(parameters,before);
  const o=f.calls[0][1];example=o;assert(o.timeIndependent);assert.equal(o.parameters.width,800);assert.equal(o.parameters.sourceFontSize,22);
  for(const key of ['body','source','fontSize','sourceFontSize','color','sourceColor','width'])assert(o.editableParameters.some(p=>p.key===key));
  assert.deepEqual(f.calls[1][1].position,{x:0,y:12.5});
  const html=markup(o);assert(html.indexOf('data-article-body')<html.indexOf('data-article-source'));assert(html.includes('margin-top:12px'));assert(html.includes('font-size:42px'));assert(html.includes('font-size:22px'));assert(html.includes('white-space:pre-wrap'));assert(!html.includes('top:105'));assert.equal(o.parameters.backgroundColor,'#ffffff');assert.equal(o.parameters.sourceBackgroundColor,'#00000000');assert.equal(o.parameters.sourcePadding,0);
 });
 await t.test('absent or blank attribution renders no invented source or reserved gap',async()=>{
  for(const source of [undefined,'','  ']){const f=await fixture();await f.media.article('Body',{startFrame:0,endFrame:60},{fontFamily:'Arial',fontSize:42,color:'#000',body:'Only supplied body',source},{x:540,y:960,width:800});assert(!markup(f.calls[0][1]).includes('data-article-source'));assert.equal(f.calls[0][1].parameters.source,source??'');}
 });
 await t.test('invalid body, width, timeline, typography and transform reject before mutation',async()=>{
  const cases=[[{body:''},{width:800},{startFrame:0,endFrame:60}], [{body:'Body'},{width:0},{startFrame:0,endFrame:60}], [{body:'Body'},{width:800},{startFrame:1,endFrame:1}], [{body:'Body',source:'Source',sourceFontSize:0},{width:800},{startFrame:0,endFrame:60}], [{body:'Body',padding:450},{width:800},{startFrame:0,endFrame:60}], [{body:'Body'},{width:800,scale:5},{startFrame:0,endFrame:60}]];
  for(const [params,place,span]of cases){const f=await fixture();await assert.rejects(f.media.article('Article',span,{...style,...params},{x:540,y:960,...place}));assert.equal(f.calls.length,0);}
 });
 await t.test('generated graphic options satisfy the installed SDK contract',{skip:!process.env.SBS_PANEL_TEST_SDK},()=>{
  const ts=dep('typescript'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'article-sdk-'));try{const file=path.join(dir,'article.ts'),{within,...options}=example;fs.writeFileSync(file,'async function run(){const d=selects.draft("d");return await d.addMotionGraphic({...'+JSON.stringify(options)+',within:await d.rangeAtFrames(30,180)});}');const sdk=process.env.SBS_PANEL_TEST_SDK,roots=[file,...fs.readdirSync(sdk).filter(n=>n.endsWith('.d.ts')).map(n=>path.join(sdk,n))],program=ts.createProgram(roots,{target:ts.ScriptTarget.ES2022,noEmit:true,skipLibCheck:true});assert.deepEqual(ts.getPreEmitDiagnostics(program).filter(d=>d.file?.fileName===file).map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[]);}finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
 await t.test('actual SDK runtime accepts numeric template weights and transparent defaults',{skip:!process.env.SBS_PANEL_TEST_PRESET_ROOT},async()=>{
  const entry=path.join(process.env.SBS_PANEL_TEST_PRESET_ROOT,'src/domain/model/sequence/EditableParameters.ts'),runtime={exports:{}};
  const compiled=esbuild.buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
  new Function('require','module','exports',compiled)(dep,runtime,runtime.exports);
  const validate=o=>runtime.exports.createEditableParametersMetadata({definitions:o.editableParameters,values:o.parameters});
  for(const weight of [700,'700',undefined])for(const attribution of ['Supplied source','']){
   const f=await fixture(),params={fontFamily:'Arial',fontSize:42,color:'#000000',body:'Article',source:attribution,sourceFontSize:22,sourceColor:'#FFFFFF',...(weight===undefined?{}:{fontWeight:weight,sourceFontWeight:weight})},before=structuredClone(params);
   await f.media.article('Article',{startFrame:0,endFrame:60},params,{x:540,y:960,width:800});
   const o=f.calls[0][1],metadata=validate(o);assert.deepEqual(params,before);
   assert.equal(metadata.values.backgroundColor,'#00000000');assert.equal(metadata.values.sourceBackgroundColor,'#00000000');
   if(weight!==undefined){assert.equal(metadata.values.fontWeight,'700');assert.equal(metadata.values.sourceFontWeight,'700');}
   const oldNumeric={...o,parameters:{...o.parameters,fontWeight:700}};assert.throws(()=>validate(oldNumeric),/fontWeight.*does not match/);
   const oldTransparent={...o,parameters:{...o.parameters,sourceBackgroundColor:'transparent'}};assert.throws(()=>validate(oldTransparent),/sourceBackgroundColor.*does not match/);
  }
 });
 await t.test('builder uses one flow graphic instead of independent article coordinates',()=>{assert(source.includes('For article/excerpt body and its attribution use media.article'));assert(!source.includes('Place article body and source separately when they need independent editing or timing.'));assert(source.includes('return {asset,position,transform,group,imageCrop,coverage,place,text,article}'));});
 if(process.env.SBS_ARTICLE_PREVIEW_DIR){const dir=process.env.SBS_ARTICLE_PREVIEW_DIR;fs.mkdirSync(dir,{recursive:true});const cases=[['short','A short article paragraph.','Source: publication'],['long','The article body wraps according to the supplied width. '.repeat(12),'Source: supplied publication; original title, reporting date and attribution. '.repeat(3)],['no-source','Body with no supplied attribution.','']];for(const [name,body,source]of cases){const o={...example,parameters:{...example.parameters,body,source}};const html='<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#253340}.canvas{position:relative;width:1080px;height:1920px;transform:scale(0.3333333333);transform-origin:0 0}.graphic{position:relative;width:1080px;height:1920px;transform:translateY(-240px)}</style><div class="canvas"><div class="graphic">'+markup(o)+'</div></div>';fs.writeFileSync(path.join(dir,name+'.html'),html);}fs.writeFileSync(path.join(dir,'graphic-options.json'),JSON.stringify(example,null,2));}
});
