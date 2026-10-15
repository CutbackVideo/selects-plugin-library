'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

// Run with SBS_PANEL_TEST_MODULES pointing to an existing Selects node_modules.
// These are authoring dependencies; the installed panel imports only React.
const modulesRoot = process.env.SBS_PANEL_TEST_MODULES;
test('SBS Radio template generation', { skip: !modulesRoot && 'Set SBS_PANEL_TEST_MODULES' }, async t => {
  const dependency = createRequire(path.join(path.resolve(modulesRoot), '..', 'package.json'));
  const esbuild = dependency('esbuild');
  const ts = dependency('typescript');
  const React = dependency('react');
  const { renderToStaticMarkup } = dependency('react-dom/server');
  const source = fs.readFileSync(path.join(__dirname, '../plugins/sbs-radio-clip/panel.tsx'), 'utf8');
  const sf = ts.createSourceFile('panel.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = 'BUILTIN_TEMPLATES,forPlatform,merge,STRINGS,RADIO_STRINGS,RADIO_SCRIPT_BUILD,SCRIPT_BUILD,SCRIPT_LIMIT,RadioPreviewFrame,RadioPreviewCaption,speakerTurns,planShots';
  // Extract the actual production build-parameter expression, not a test copy of it.
  let params;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sf) === 'P' && ts.isObjectLiteralExpression(node.initializer) && node.initializer.properties.some(p => p.name?.getText(sf) === 'segments')) params = node.initializer.getText(sf);
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(params, 'Production clip builder parameters found');
  const extra = `\nexport { ${names} };\nexport function buildParams(tpl, c, title) {
    const projectId='test-project', job={resourceId:'test-video',title}, name='template-check';
    const transform=cropTransform(tpl.layout), buildLogo=tpl.logo.image, overlayResourceId=null;
    const pickd={fixes:[],captionOmissions:[]}, S=merge(RADIO_STRINGS.en,STRINGS.en);
    return ${params};
  }`;
  const compiled = esbuild.transformSync(source + extra, { loader: 'tsx', format: 'cjs' });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', compiled.code)(name => {
    assert.equal(name, 'react'); return React;
  }, loaded, loaded.exports);
  const api = loaded.exports;
  const template = (id, layout='tiktok') => api.forPlatform(api.BUILTIN_TEMPLATES.find(t => t.id === id), layout);
  const clip = {headline1:'Headline',headline2:'Second line',segments:[[0,1.8]],highlights:['market']};
  const title = 'Episode 261014(\uc218)';

  await t.test('all four programs remain selectable, with independent layout variants', () => {
    assert.deepEqual(api.BUILTIN_TEMPLATES.map(t=>t.id), ['sbs-politics','sbs-newsbriefing','newsdirect','moneylab']);
    for (const t of api.BUILTIN_TEMPLATES) assert.equal(t.demoOverlay,false);
    assert.equal(template('moneylab').layout.windowTop,560);
    assert.equal(template('moneylab','shorts').layout.windowTop,402);
    const duplicate={...structuredClone(template('moneylab','shorts')),id:'custom-money'};
    assert.equal(api.forPlatform(duplicate,'tiktok').radioTemplate,true);
    assert.equal(api.forPlatform(duplicate,'tiktok').layout.windowTop,560);
    assert.equal(template('sbs-politics').sbsStyle,true);
    assert.equal(template('sbs-newsbriefing').sbsStyle,true);
  });

  await t.test('Money Lab produces an editable date and preserves gradients and caption emphasis', () => {
    const P=api.buildParams(template('moneylab'),clip,title);
    assert.equal(P.dateLabel.text,'261014(\uc218)');
    assert.equal(P.dateLabel.y,1415);
    assert.equal(P.frame.footer,undefined, 'Date is a separate editable graphic');
    assert.equal(P.editableDate.find(p=>p.key==='text').type,'text');
    assert.match(P.frame.headlineGradient1,/linear-gradient/);
    assert.equal(P.caption.highlightColor,'#F8D30A');
    assert.deepEqual(P.highlights,['market']);
    const markup=renderToStaticMarkup(React.createElement(api.RadioPreviewFrame,{data:P.frame}));
    assert.match(markup,/linear-gradient/);
    assert.match(markup,/data:image\/png;base64,/);
    const caption=renderToStaticMarkup(React.createElement(api.RadioPreviewCaption,{data:{...P.caption,text:'The *market* moves'}}));
    assert.ok(caption.includes('market'));
    assert.match(caption,/#F8D30A/i);
  });

  for(const id of ['newsdirect','moneylab']) for(const layout of ['tiktok','shorts']) {
    await t.test(`${id} ${layout} builds editable graphics without the demo overlay`,async()=>{
      const P=api.buildParams(template(id,layout),clip,title);
      const code=api.RADIO_SCRIPT_BUILD.replace('const P: any = __P__;','const P: any = '+JSON.stringify(P)+';');
      assert.ok(code.length<api.SCRIPT_LIMIT, 'Bundled assets fit the script size limit');
      const graphics=[];
      const words=[{text:'The',startFrame:0,endFrame:12,sourceStartFrame:0,speakerId:'a',utteranceId:'u'},
        {text:'market',startFrame:12,endFrame:30,sourceStartFrame:12,speakerId:'a',utteranceId:'u'},
        {text:'moves.',startFrame:30,endFrame:54,sourceStartFrame:30,speakerId:'a',utteranceId:'u'}];
      const meta=async()=>({fps:30,durationSeconds:2,frameSize:{width:1920,height:1080}});
      const draft={words:async()=>words,meta,insertResource:async()=>{},silenceSpans:async()=>[],setFrameSize:async x=>assert.deepEqual(x,{width:1080,height:1920}),
        clips:async()=>[{resourceId:'test-video',trackKind:'main',startFrame:0,endFrame:60}],setClipTransform:async()=>{},rangeAtFrames:async(a,b)=>({a,b}),
        addMotionGraphic:async g=>{graphics.push(g);esbuild.transformSync(g.tsxCode,{loader:'tsx'});},commitAll:async()=>({createdDraftId:'verified'})};
      const selects={project:()=>({resources:async()=>[{resourceId:'test-video'}],resource:()=>({meta,words:async()=>words}),createDraft:async()=>draft})};
      const wrapped=esbuild.transformSync('async function build(selects){'+code+'}\nreturn build;',{loader:'ts'}).code;
      const result=await new Function(wrapped)()(selects);
      assert.equal(result.draftId,'verified');
      assert.ok(graphics.some(g=>g.label==='Series frame and headline'));
      for (const g of graphics) assert.ok(g.editableParameters?.length > 0, g.label + ' remains editable');
      assert.ok(graphics.some(g=>g.label.startsWith('Caption ')));
      assert.equal(graphics.some(g=>g.label==='Date'),id==='moneylab');
      assert.ok(graphics.every(g=>! /overlay|demo/i.test(g.label)));
      if(id==='moneylab')assert.ok(graphics.some(g=>g.parameters.text?.includes('*market*')));
    });
  }
});
