'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const modulesRoot = process.env.SBS_PANEL_TEST_MODULES;

test('SBS overlay follows the visible Draft without stale results or edits', {skip: !modulesRoot && 'Set SBS_PANEL_TEST_MODULES'}, async () => {
  const dep = createRequire(path.join(path.resolve(modulesRoot), '..', 'package.json'));
  const React = dep('react'), {act} = React, {JSDOM} = dep('jsdom');
  const source = fs.readFileSync(path.join(__dirname, '../plugins/sbs-radio-clip/panel.tsx'), 'utf8');
  // Run the production state and effect in isolation from unrelated clip generation.
  const state = source.slice(source.indexOf('  const O=OVERLAY_STRINGS[lang]'), source.indexOf('  const [mode, setMode]',source.indexOf('  const O=OVERLAY_STRINGS[lang]')));
  const start = source.indexOf('  // Follow the visible Draft;');
  const effect = source.slice(start,source.indexOf('  // ---- Templates:',start));
  const code = dep('esbuild').transformSync(`function Harness({sdk, context, overlayCall, observe, busy=false, O:strings}) {
    const projectId=context.projectId, lang='en', OVERLAY_STRINGS={en:strings};
    ${state}
    ${effect}
    observe({overlayTarget,overlayLoading,overlayMessage,overlayError,refresh:()=>setOverlayRefresh(n=>n+1)});
    return null;
  }\nreturn Harness;`,{loader:'tsx'}).code;
  const Harness = new Function('React',code)(React);
  const dom = new JSDOM('<div id="root"></div>');
  const keys=['window','document','IS_REACT_ACT_ENVIRONMENT'];
  const previous=Object.fromEntries(keys.map(k=>[k,global[k]]));
  Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
  const root=dep('react-dom/client').createRoot(document.getElementById('root'));
  let view, visible='a', kind='draft', pendingResolve, fail=false;
  const calls=[];
  const sdk={runScript:async p=>{assert.equal(p.allowCommit,false);return {result:{projectId:'project',onScreenTab:{kind,sequenceId:visible}}};}};
  const overlayCall=async p=>{
    calls.push(p);assert.equal(p.action,'inspect');
    if(fail)throw Error('Read failed');
    if(p.sequenceId==='slow')return await new Promise(resolve=>{pendingResolve=resolve;});
    return {id:p.sequenceId,name:p.sequenceId,count:0,description:'Description '+p.sequenceId};
  };
  const render=async(id,extra={})=>{visible=id;await act(async()=>root.render(React.createElement(Harness,{sdk,context:{projectId:'project',sequenceId:id},overlayCall,observe:v=>view=v,O:{failed:'Failed'},...extra})));};
  try {
    await render('a');assert.equal(view.overlayTarget.id,'a');
    await render('slow');assert.equal(view.overlayTarget,null);assert.equal(view.overlayLoading,true);
    await render('b');assert.equal(view.overlayTarget.id,'b');
    await act(async()=>pendingResolve({id:'slow',name:'old',count:2,description:'Stale'}));
    assert.equal(view.overlayTarget.id,'b');
    await render('c');
    const before=calls.length;await act(async()=>view.refresh());assert.equal(calls.length,before+1);assert.equal(view.overlayTarget.id,'c');
    kind='synced';await render('source');assert.equal(view.overlayTarget,null);assert.equal(view.overlayLoading,false);
    kind='draft';fail=true;await render('failed');assert.equal(view.overlayError,true);assert.equal(view.overlayMessage,'Read failed');assert.equal(view.overlayTarget,null);
    fail=false;await act(async()=>view.refresh());assert.equal(view.overlayError,false);assert.equal(view.overlayTarget.id,'failed');
    await render(null,{context:{projectId:null,sequenceId:null}});assert.equal(view.overlayTarget,null);
  } finally {
    await act(async()=>root.unmount());dom.window.close();
    for(const k of keys)if(previous[k]===undefined)delete global[k];else global[k]=previous[k];
  }
});

test('one PNG replaces legacy graphics while ignoring old image names', {skip: !modulesRoot && 'Set SBS_PANEL_TEST_MODULES'}, async () => {
  const dep=createRequire(path.join(path.resolve(modulesRoot),'..','package.json'));
  const esbuild=dep('esbuild'), React=dep('react');
  const source=fs.readFileSync(path.join(__dirname,'../plugins/sbs-radio-clip/panel.tsx'),'utf8');
  const compiled=esbuild.transformSync(source+'\nexport {SCRIPT_OVERLAY,SCRIPT_BUILD,SBS_OVERLAY_ASSET_NAME};',{loader:'tsx',format:'cjs'}).code;
  const mod={exports:{}};new Function('require','module','exports',compiled)(()=>React,mod,mod.exports);
  const api=mod.exports;
  const oldName='previous-overlay.png';
  const resources=[{resourceId:'new',name:api.SBS_OVERLAY_ASSET_NAME},{resourceId:'old',name:oldName}];
  const base=[{clipId:'footage',resourceId:'video',trackKind:'main',startFrame:0,endFrame:300},{clipId:'subtitle',trackKind:'overlay',startFrame:0,endFrame:300}];
  let clips=[...base], commits=0;
  const d={meta:async()=>({name:'Test',durationFrames:300,frameSize:{width:1080,height:1920}}),
    clips:async q=>q?.trackScope==='main'?clips.filter(x=>x.trackKind==='main'):clips,
    motionGraphics:async()=>clips.filter(c=>c.clipId==='subtitle'||c.clipId==='description').map(clip=>({name:clip.clipId==='subtitle'?'Caption 1':'TikTok · \uc124\uba85',clip})),
    rangeAtFrames:async(a,b)=>({a,b}),
    overlayResource:async({resource})=>{clips.push({clipId:'png',resourceId:resource.id,trackKind:'overlay',startFrame:0,endFrame:300});},
    removeClips:async rows=>{const ids=new Set(rows.map(c=>c.clipId));clips=clips.filter(c=>!ids.has(c.clipId));},
    commitAll:async()=>{commits++;},
    addMotionGraphic:async()=>assert.fail('The fixed caption must not create a second graphic')};
  const project={resources:async()=>resources,resource:id=>({id}),meta:async()=>({draftIds:['draft']})};
  let visible='draft';
  const selects={project:()=>project,draft:()=>d,editor:{state:async()=>({projectId:'project',onScreenTab:{kind:'draft',sequenceId:visible}})}};
  const run=async(action,extra={})=>{
    const P={action,projectId:'project',sequenceId:'draft',overlayResourceId:'new',...extra};
    const script=api.SCRIPT_OVERLAY.replace('const P:any=__P__;','const P:any='+JSON.stringify(P)+';');
    const code=esbuild.transformSync('return (async()=>{'+script+'})();',{loader:'ts'}).code;
    return await new Function('selects',code)(selects);
  };
  assert.equal((await run('inspect')).count,0);assert.equal(commits,0);
  await run('add');assert.equal((await run('inspect')).count,1);assert.equal(commits,1);
  await run('add');assert.equal(commits,1,'Adding twice is idempotent');
  await assert.rejects(run('remove',{signature:'stale'}),/Refresh overlay/);
  await run('remove',{signature:(await run('inspect')).signature});assert.deepEqual(clips,base);
  clips=[...base,{clipId:'old-png',resourceId:'old',trackKind:'overlay',startFrame:0,endFrame:300},{clipId:'description',trackKind:'overlay',startFrame:0,endFrame:300}];
  const old=await run('inspect');assert.equal(old.count,1);assert.equal(old.legacy,true);
  const migrated=await run('add');assert.equal(migrated.converted,true);
  assert.deepEqual(clips.map(c=>c.clipId),['footage','subtitle','old-png','png']);
  assert.equal((await run('inspect')).legacy,false);
  visible='other';await assert.rejects(run('add'),/Refresh the current Draft/);
  assert.equal(clips.length,4);
  // The generated-clip builder uses the same one-PNG helper.
  clips=[...base];
  const start=api.SCRIPT_BUILD.indexOf('const SBS_PNG_ALIASES:');
  const end=api.SCRIPT_BUILD.indexOf('\nconst SBS_ELEMENT',start);
  const helper=esbuild.transformSync(api.SCRIPT_BUILD.slice(start,end)+'\nreturn addSbsPngOverlay;',{loader:'ts'}).code;
  await new Function('selects',helper)(selects)(d,{projectId:'project',overlayResourceId:'new'},300);
  assert.deepEqual(clips.map(c=>c.clipId),['footage','subtitle','png']);
});
