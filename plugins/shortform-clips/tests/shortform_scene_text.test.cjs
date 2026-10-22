'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const modulesRoot = process.env.SBS_PANEL_TEST_MODULES;

test('shared scene text helper', {skip: !modulesRoot && 'Set SBS_PANEL_TEST_MODULES'}, async t => {
  const dep = createRequire(path.resolve(modulesRoot, '../package.json'));
  const esbuild = dep('esbuild');
  const source = fs.readFileSync(path.join(__dirname, '../panel.tsx'), 'utf8');
  const factory = source.slice(source.indexOf('async function createSceneMediaTools('), source.indexOf('\nfunction sceneBuildPrompt('));
  const create = new Function(esbuild.transformSync(factory, {loader:'ts'}).code + ';return createSceneMediaTools;')();
  const preset = {
    kind:'generator', tsxCode:'export default function Text({data}) { return <div>{data.body}</div>; }',
    parameters:{body:'Text', fontFamily:'Preset font', fontSize:72, color:'#fff', enterStyle:'instant', exitStyle:'instant'},
    editableParameters:[{key:'body', label:'Text', type:'text', defaultValue:'Text'}]
  };
  function fixture(value = structuredClone(preset), styles = {}) {
    const calls = [], clips = [];
    const d = {
      meta:async () => ({frameSize:{width:1080,height:1920},fps:30}),
      rangeAtFrames:async (a,b) => ({a,b}),
      addMotionGraphic:async options => {
        calls.push(['add', options]);
        const clip = {clipId:clips.length+1,trackKind:'video',startFrame:options.within.a,endFrame:options.within.b};
        clips.push(clip); return clip;
      },
      clips:async () => clips.map(c => ({...c})),
      setClipTransform:async options => { calls.push(['transform',options]); }
    };
    const sdk = {effectPresets:{get:async id => {calls.push(['preset',id]);return value;}}};
    return {calls, clips, make:() => create(sdk,{sourceFiles:async()=>({fileTree:[]}),resources:async()=>[]},d,[],styles)};
  }
  await t.test('template text appearance is reused without changing content or timing', async () => {
    const f=fixture(structuredClone(preset),{text:{'plain-white':{fontFamily:'Channel font',fontSize:96,fontWeight:700,color:'#FFFFFF'}}}),media=await f.make();
    await media.text('Label',{startFrame:5,endFrame:40},{body:'Subject',style:'plain-white',fontSize:99},{x:540,y:500});
    const o=f.calls.find(c=>c[0]==='add')[1];assert.equal(o.parameters.body,'Subject');assert.equal(o.parameters.fontSize,96);assert.equal(o.parameters.fontWeight,'700');assert.equal(o.parameters.style,undefined);assert.equal(o.parameters.fontFamily,'Channel font');assert.deepEqual(o.within,{a:5,b:40});
  });
  await t.test('visual styles are selected explicitly, not inferred from a question or label', async () => {
    const styles={text:{'lime-tag':{fontSize:64,color:'#000000',backgroundColor:'#D7FF00'}}};
    const f=fixture(structuredClone(preset),styles),media=await f.make();
    await media.text('question',{startFrame:0,endFrame:20},{body:'Why?',fontSize:90},{x:540,y:500});
    await media.text('subject',{startFrame:20,endFrame:40},{body:'Subject',style:'lime-tag'},{x:540,y:500});
    const rows=f.calls.filter(c=>c[0]==='add').map(c=>c[1].parameters);
    assert.equal(rows[0].fontSize,90);assert.equal(rows[0].color,'#fff');
    assert.equal(rows[1].fontSize,64);assert.equal(rows[1].backgroundColor,'#D7FF00');
    await assert.rejects(media.text('label',{startFrame:0,endFrame:20},{body:'Why?',style:'question'},{x:540,y:500}),/Unknown template text style/);
    assert.equal(f.clips.length,2);
  });
  await t.test('body and attribution reuse one preset but remain independently editable and timed', async () => {
    const f=fixture(), media=await f.make();
    const params={body:'\uae30\uc0ac \ubcf8\ubb38\n\ub450 \ubc88\uc9f8 \uc904',fontFamily:'Template font',fontSize:56,color:'#123456',backgroundColor:'#fff',textAlign:'left'};
    const original=structuredClone(params);
    const body=await media.text('article body',{startFrame:30,endFrame:120},params,{x:540,y:300});
    const attribution=await media.text('article source',{startFrame:45,endFrame:120},{body:'\uc81c\uacf5\ub41c \ucd9c\ucc98',fontSize:24},{x:540,y:440,scale:.8});
    assert.notEqual(body.clipId,attribution.clipId);
    assert.deepEqual(params,original);
    assert.equal(f.calls.filter(c=>c[0]==='preset').length,1);
    const additions=f.calls.filter(c=>c[0]==='add').map(c=>c[1]);
    assert.equal(additions[0].parameters.body,params.body);
    assert.equal(additions[0].parameters.color,params.color);
    assert.equal(additions[0].parameters.fontFamily,params.fontFamily);
    assert.equal(additions[0].parameters.fontSize,56);
    assert.deepEqual(additions[0].editableParameters,preset.editableParameters);
    assert.equal(additions[0].timeIndependent,true);
    assert.deepEqual(additions.map(c=>c.within),[{a:30,b:120},{a:45,b:120}]);
    const transforms=f.calls.filter(c=>c[0]==='transform').map(c=>c[1]);
    assert.deepEqual(transforms[0].position,{x:0,y:34.375});
    assert.deepEqual(transforms[1].scale,{x:.8,y:.8});
  });
  await t.test('animation remains time dependent; placement has a single coordinate owner', async () => {
    const f=fixture(), media=await f.make();
    await media.text('label',{startFrame:0,endFrame:60},{body:'\ub77c\ubca8',enterStyle:'rise',anchor:'bottom-left',overlayScale:200,offsetX:30},{x:540,y:960});
    const options=f.calls.find(c=>c[0]==='add')[1];
    assert.equal(options.timeIndependent,false);
    assert.equal(options.parameters.enterStyle,'rise');
    assert.equal(options.parameters.anchor,'center');
    assert.equal(options.parameters.overlayScale,100);
    assert.equal(options.parameters.offsetX,0);
  });
  await t.test('invalid intervals and unsupported transforms fail before adding a clip', async () => {
    const f=fixture(), media=await f.make();
    await assert.rejects(media.text('label',{startFrame:20,endFrame:20},{body:'text'},{x:540,y:960}),/frame interval/);
    await assert.rejects(media.text('label',{startFrame:0,endFrame:20},{body:'text'},{x:540,y:960,scale:5}),/transform limits/);
    await assert.rejects(media.text('label',{startFrame:0,endFrame:20},{body:'text'},{x:5000,y:960}),/transform limits/);
    assert.equal(f.calls.length,0);
  });
  await t.test('missing generator rejects instead of inventing a replacement', async () => {
    const f=fixture({...preset,kind:'effect'}), media=await f.make();
    await assert.rejects(media.text('label',{startFrame:0,endFrame:20},{body:'text'},{x:540,y:960}),/preset unavailable/);
    assert.equal(f.clips.length,0);
  });
  const presetRoot=process.env.SBS_PANEL_TEST_PRESET_ROOT;
  await t.test('actual text-default source renders supplied body, attribution styling and newlines', {skip:!presetRoot && 'Set SBS_PANEL_TEST_PRESET_ROOT to a client checkout'}, async () => {
    const entry=path.join(presetRoot,'src/js/main/effects/presets/textPresets.ts');
    const bundled=esbuild.buildSync({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',logLevel:'silent'}).outputFiles[0].text;
    const mod={exports:{}};
    new Function('module','exports','require',bundled)(mod,mod.exports,dep);
    const actual=mod.exports.TEXT_PRESETS.find(p=>p.id==='text-default');
    assert.equal(actual.kind,'generator');
    const parameters=Object.fromEntries(actual.parameters.map(p=>[p.key,p.defaultValue]));
    for(const key of ['body','fontFamily','fontSize','color','textAlign','backgroundColor','enterStyle','exitStyle']) assert.ok(key in parameters,key);
    const f=fixture({...actual,tsxCode:actual.rawTsx,parameters,editableParameters:actual.parameters}),media=await f.make();
    await media.text('source',{startFrame:0,endFrame:60},{body:'\uae30\uc0ac \ubcf8\ubb38\n\uc81c\uacf5\ub41c \ucd9c\ucc98',fontSize:40,color:'#123456',fontFamily:'Template font'},{x:540,y:960});
    const options=f.calls.find(c=>c[0]==='add')[1],React=dep('react'),render=dep('react-dom/server').renderToStaticMarkup,component={exports:{}};
    const compiled=esbuild.transformSync(options.tsxCode,{loader:'tsx',format:'cjs',jsx:'transform'}).code;
    const remotion={AbsoluteFill:({children,style})=>React.createElement('div',{style},children),useCurrentFrame:()=>0,useVideoConfig:()=>({width:1080,height:1920,fps:30,durationInFrames:60})};
    new Function('module','exports','require','React',compiled)(component,component.exports,name=>name==='remotion'?remotion:dep(name),React);
    const html=render(React.createElement(component.exports.default,{data:options.parameters,rangeDurationInFrames:60}));
    assert.ok(html.includes('\uae30\uc0ac \ubcf8\ubb38\n\uc81c\uacf5\ub41c \ucd9c\ucc98'));
    assert.ok(html.includes('font-size:40px'));
    assert.ok(html.includes('color:#123456'));
    assert.ok(html.includes('white-space:pre-wrap'));
    assert.equal(options.timeIndependent,true);
  });
});
