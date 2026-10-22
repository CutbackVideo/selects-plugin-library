const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('apply templates to current timeline',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),mod={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(source+'\nexport {SCRIPT_MANUAL_BUILD,manualTimelineParams,STRINGS,RADIO_STRINGS,MANUAL_TEXT,merge,ManualTimelinePanel};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports,S=api.merge(api.RADIO_STRINGS.en,api.STRINGS.en);
 const template=JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/chosun-ilbo/templates/panilgi.json')));
 const params=(extra={})=>api.manualTimelineParams(template,{projectId:'p',draftId:'d',title1:'Headline',title2:'',sampleCaption:'Caption',messages:api.MANUAL_TEXT.en,...extra},S);
 const run=(P,host)=>new Function('selects',dep('esbuild').transformSync('return (async()=>{'+api.SCRIPT_MANUAL_BUILD.replace('const P: any = __P__;','const P: any = '+JSON.stringify(P)+';')+'})();',{loader:'ts'}).code)(host);
 function fixture({size={width:1080,height:1920},frames=300,wrong=false,switchAtCommit=false}={}){
  const log=[],graphics=[{name:'User title',clip:{clipId:1,trackId:'user',trackKind:'video'},parameters:{text:'Keep me'}}];let seq=10,reads=0;
  const d={meta:async()=>({frameSize:size,fps:30,durationFrames:frames,durationSeconds:frames/30}),motionGraphics:async()=>graphics.map(x=>({...x})),motionGraphicProgram:async c=>({parameters:graphics.find(g=>g.clip.clipId===c.clipId).parameters}),clips:async()=>[{clipId:2,trackId:'main',trackKind:'main',resourceId:'source'},...graphics.map(g=>g.clip)],removeClips:async cs=>{log.push(['remove',cs.map(c=>c.clipId)]);for(const c of cs)graphics.splice(graphics.findIndex(g=>g.clip.clipId===c.clipId),1);},deleteTrack:async o=>log.push(['deleteTrack',o.trackId]),setFrameSize:async s=>{log.push(['size',s]);size=s;},rangeAtFrames:async(a,b)=>({a,b}),addMotionGraphic:async o=>{const n=seq++;graphics.push({name:o.label,clip:{clipId:n,trackId:'track'+n,trackKind:'video'},parameters:o.parameters});log.push(['graphic',o]);},commitAll:async()=>{log.push(['commit']);}};
  return {log,graphics,host:{editor:{state:async()=>({projectId:'p',onScreenTab:{kind:'draft',sequenceId:wrong||(switchAtCommit&&++reads===2)?'other':'d'}})},project:()=>({meta:async()=>({draftIds:['d']})}),draft:()=>d}};
 }
 await t.test('applies in place without reading transcript, creating draft, or touching media',async()=>{
  const f=fixture(),r=await run(params(),f.host);assert.equal(r.draftId,'d');assert.equal(r.seconds,10);assert.equal(f.graphics[0].parameters.text,'Keep me');assert.equal(f.log.filter(x=>x[0]==='commit').length,1);assert.ok(f.log.filter(x=>x[0]==='graphic').every(x=>x[1].parameters.manualTemplateOwner==='shortform-clips.manual-template.v1'));
 });
 await t.test('retry replaces only tagged graphics and removes only their empty lanes',async()=>{
  const f=fixture();await run(params(),f.host);const count=f.graphics.length;await run(params({title1:'Revised'}),f.host);assert.equal(f.graphics.length,count);assert.equal(f.graphics[0].name,'User title');assert.ok(!f.log.some(x=>x[0]==='deleteTrack'&&x[1]==='user'));assert.equal(f.log.filter(x=>x[0]==='remove').length,1);
 });
 await t.test('deleting all template clips still cleans saved empty lanes, preserving occupied lanes',async()=>{
  const f=fixture(),first=await run(params(),f.host);
  assert.ok(first.trackIds.length>0);
  f.graphics.splice(1);
  f.graphics.push({name:'User replacement',clip:{clipId:999,trackId:first.trackIds[0],trackKind:'video'},parameters:{text:'Keep'}});
  const second=await run(params({previousTrackIds:first.trackIds}),f.host);
  assert.ok(f.graphics.some(g=>g.name==='User replacement'));
  const deleted=f.log.filter(x=>x[0]==='deleteTrack').map(x=>x[1]);
  assert.deepEqual(deleted,first.trackIds.slice(1));
  assert.equal(second.trackIds.length,first.trackIds.length);
 });
 await t.test('canvas mismatch requires confirmation of actual original size before mutation',async()=>{
  const f=fixture({size:{width:1920,height:1080}});const r=await run(params(),f.host);assert.equal(r.needsConfirmation,true);assert.deepEqual(f.log,[]);await run(params({confirmSize:r.from}),f.host);assert.ok(f.log.some(x=>x[0]==='size'));
  const stale=fixture({size:{width:1280,height:720}});assert.equal((await run(params({confirmSize:r.from}),stale.host)).needsConfirmation,true);assert.deepEqual(stale.log,[]);
 });
 await t.test('wrong target or empty timeline fails without mutation; switching before save never commits',async()=>{
  for(const opt of [{wrong:true},{frames:0}]){const f=fixture(opt);await assert.rejects(run(params(),f.host));assert.deepEqual(f.log,[]);}
  const f=fixture({switchAtCommit:true});await assert.rejects(run(params(),f.host));assert.ok(!f.log.some(x=>x[0]==='commit'));
 });
 await t.test('short timeline clamps sample; blank sample omits captions and template stays unchanged',async()=>{
  const original=structuredClone(template),f=fixture({frames:15});await run(params(),f.host);assert.equal(f.log.find(x=>x[1]?.label==='Caption sample')[1].within.b,15);
  const g=fixture();await run(params({sampleCaption:''}),g.host);assert.ok(!g.graphics.some(x=>x.name==='Caption sample'));assert.deepEqual(template,original);
 });
 await t.test('UI keeps form after success, blocks double clicks and asks before resizing',async()=>{
  const React=dep('react'),{act}=React,{JSDOM}=dep('jsdom'),dom=new JSDOM('<div id="root"></div>');
  const keys=['window','document','IS_REACT_ACT_ENVIRONMENT'],before=Object.fromEntries(keys.map(k=>[k,global[k]]));Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
  const root=dep('react-dom/client').createRoot(document.getElementById('root'));let buttons=[],calls=0,finish;
  const ui={};for(const k of ['Stack','Actions','Message'])ui[k]=({children})=>React.createElement('div',null,children);ui.Select=()=>React.createElement('select');ui.TextField=p=>React.createElement('input',{value:p.value,onChange:e=>p.onChange(e.target.value)});ui.Button=p=>{buttons.push(p);return React.createElement('button',{disabled:p.disabled,onClick:p.onClick},p.children);};
  const props={ui,lang:'en',S,projectId:'p',draftId:'d',targetName:'Current',templates:[template],store:{get:async()=>null,put:async()=>{}},onBusy:()=>{},script:async()=>{calls++;return await new Promise(r=>finish=r);}};
  try{await act(async()=>root.render(React.createElement(api.ManualTimelinePanel,props)));let job;const b=buttons.at(-1);await act(async()=>{job=b.onClick();await b.onClick();});assert.equal(calls,1);await act(async()=>{finish({needsConfirmation:true,from:{width:1920,height:1080},to:{width:1080,height:1920}});await job;});assert.ok(document.body.textContent.includes('Change canvas and apply'));await act(async()=>{job=buttons.findLast(b=>b.variant==='primary').onClick();});await act(async()=>{finish({draftId:'d'});await job;});assert.equal(document.querySelectorAll('select').length,1);assert.equal(document.querySelectorAll('input').length,3);assert.ok(document.body.textContent.includes('Template applied'));assert.equal(calls,2);
  }finally{await act(async()=>root.unmount());dom.window.close();for(const k of keys){if(before[k]===undefined)delete global[k];else global[k]=before[k];}}
 });
});
