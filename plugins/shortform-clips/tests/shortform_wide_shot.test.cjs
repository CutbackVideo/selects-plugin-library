'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;

test('clips without framing show the whole source over a blurred copy',{skip:!modules&&'Set SBS_PANEL_TEST_MODULES'},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),React=dep('react'),render=dep('react-dom/server').renderToStaticMarkup;
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {wideShotScript,STACKED_REFRAME_EFFECT};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const {wideShotScript,STACKED_REFRAME_EFFECT}=mod.exports;
 const effect={exports:{}};
 const remotion={AbsoluteFill:({children})=>React.createElement('div',null,children)};
 new Function('require','module','exports',esbuild.transformSync(STACKED_REFRAME_EFFECT,{loader:'tsx',format:'cjs'}).code)(n=>n==='remotion'?remotion:dep(n),effect,effect.exports);
 const Source=()=>React.createElement('i',{className:'source'});
 const draw=panel=>render(React.createElement(effect.exports.default,{Source,data:{sourceW:1920,sourceH:1080,windowH:1106,panels:[panel]}}));

 await t.test('the blurred backdrop is optional and leaves existing contained shots unchanged',()=>{
  const plain=draw({fit:'contain',w:1920,cx:960,cy:540}),blurred=draw({fit:'contain',backdrop:'blur',w:1920,cx:960,cy:540});
  assert.equal((plain.match(/class="source"/g)||[]).length,1);
  assert.doesNotMatch(plain,/blur\(/);
  assert.equal((blurred.match(/class="source"/g)||[]).length,2);
  assert.match(blurred,/filter:blur\(24px\)/);
  // The sharp frame is the same with or without the backdrop.
  assert.ok(blurred.endsWith(plain.slice(plain.indexOf('<div style="position:absolute;left:',plain.indexOf('overflow:hidden')))));
 });

 await t.test('the wide shot replaces the framing effect on every main clip of its own Draft',async()=>{
  const layout={windowTop:394,windowBottom:1500};
  const code=wideShotScript('project','draft',layout);
  const calls=[];
  let clips=[{clipId:'c1',trackId:'t',resourceId:'r1'},{clipId:'c2',trackId:'t',resourceId:'r1'},{clipId:'g',trackId:'t',resourceId:null}];
  const effects={c1:[{name:'Shortform stacked framing'}],c2:[]};
  const selects={
   // Analysis is not required: frame sizes come from the source file inventory, as for framing.
   project:id=>({meta:async()=>({draftIds:id==='project'?['draft']:[]}),resource:()=>({meta:async()=>{throw Error('resource_not_analyzed: hasAnalysis=false');}}),
    sourceFiles:async()=>({fileTree:[{type:'dir',children:[{type:'file',resourceId:'r1',path:'/a/source.mp4',frameSize:{width:1920,height:1080}}]}]})}),
   draft:()=>({clips:async()=>clips,videoEffects:async c=>effects[c.clipId],
    setClipTransform:async o=>calls.push(['transform',o.clip.clipId,o.scale,o.position]),
    replaceVideoEffect:async(old,o)=>calls.push(['replace',o.parameters]),
    addVideoEffect:async o=>calls.push(['add',o.clip.clipId,o.label,o.parameters]),
    commitAll:async label=>calls.push(['commit',label])}),
  };
  const body=esbuild.transformSync('async function execute(selects){'+code+'}',{loader:'ts'}).code;
  const run=new Function(body+';return execute;')();
  assert.deepEqual(await run(selects),{clips:2});
  const panels=[{fit:'contain',backdrop:'blur',w:1920,cx:960,cy:540}];
  assert.deepEqual(calls.filter(c=>c[0]==='transform').map(c=>c[1]),['c1','c2']);
  assert.deepEqual(calls[0][2],{x:1,y:1106/607.5});
  assert.ok(Math.abs(calls[0][3].y-(960-947)/1920*100)<1e-9);
  assert.deepEqual(calls.find(c=>c[0]==='replace')[1],{sourceW:1920,sourceH:1080,windowH:1106,panels});
  assert.deepEqual(calls.find(c=>c[0]==='add').slice(1),['c2','Shortform stacked framing',{sourceW:1920,sourceH:1080,windowH:1106,panels}]);
  assert.deepEqual(calls.at(-1),['commit','Place the full source as a wide shot']);
  await assert.rejects(run({...selects,project:()=>({meta:async()=>({draftIds:[]})})}),/Draft ownership changed/);
  // Large projects list sources per folder; a source without a known size is never placed with a guessed size.
  calls.length=0;
  const byFolder={...selects,project:()=>({meta:async()=>({draftIds:['draft']}),resource:()=>{throw Error('resource_not_analyzed');},
   sourceFiles:async(o)=>o?.folder==='B'?{fileTree:[{type:'file',resourceId:'r1',frameSize:{width:1280,height:720}}]}:{mode:'summary',folders:[{name:'A'},{name:'B'}]}})};
  assert.deepEqual(await run(byFolder),{clips:2});
  assert.deepEqual(calls[0][2],{x:1,y:1106/607.5});
  calls.length=0;
  const unknown={...selects,project:()=>({meta:async()=>({draftIds:['draft']}),sourceFiles:async()=>({fileTree:[]}),resource:()=>({meta:async()=>{throw Error('resource_not_analyzed');}})})};
  await assert.rejects(run(unknown),/frame size/);
  assert.equal(calls.length,0);
  // A Draft made from a synced timeline holds the timeline itself: the inventory lists it without a frame
  // size, so its resource metadata supplies the size. Sources with an inventory size never read metadata.
  calls.length=0;let metaReads=0;
  const synced={...selects,project:()=>({meta:async()=>({draftIds:['draft']}),resource:()=>({meta:async()=>{metaReads++;return {frameSize:{width:1920,height:1080}};}}),
   sourceFiles:async()=>({fileTree:[{type:'file',resourceId:'r1',name:'Synced timeline'}]})})};
  assert.deepEqual(await run(synced),{clips:2});
  assert.equal(metaReads,1,'one metadata read per resource');
  assert.deepEqual(calls[0][2],{x:1,y:1106/607.5});
  metaReads=0;calls.length=0;
  assert.deepEqual(await run({...selects,project:()=>({...synced.project(),sourceFiles:async()=>({fileTree:[{type:'file',resourceId:'r1',frameSize:{width:1920,height:1080}}]})})}),{clips:2});
  assert.equal(metaReads,0,'inventory sizes need no analysis metadata');
 });
});
