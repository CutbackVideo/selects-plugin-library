'use strict';
if (!require('./customer-fixtures.cjs').available()) {
  require('node:test')('customer template regression requires private fixtures', { skip: 'Customer packs migrated out of the public repository; see CUSTOMER_FIXTURES.md' }, () => {});
} else {
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;

test('template-owned caption box layout',{skip:!modulesRoot && 'Set SBS_PANEL_TEST_MODULES'},async t=>{
  const dep=createRequire(path.resolve(modulesRoot,'../package.json'));
  const esbuild=dep('esbuild'),React=dep('react'),render=dep('react-dom/server').renderToStaticMarkup;
  const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
  const loaded={exports:{}};
  const exports='radioCaptionParams,RadioPreviewCaption,RADIO_SCRIPT_BUILD,SCRIPT_BUILD,sceneCaptionScript,validateTemplate,templatePatch,merge,cleanTemplate,captionLineMax';
  new Function('require','module','exports',esbuild.transformSync(source+'\nexport {'+exports+'};',{loader:'tsx',format:'cjs'}).code)(dep,loaded,loaded.exports);
  const api=loaded.exports;
  const template=JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/hankook-ilbo/templates/huick-alpha.json')));
  function embedded(script){
    const line=script.split('\n').find(x=>x.startsWith('const CAPTION_TSX:'));
    return JSON.parse(line.slice(line.indexOf('=')+1).trim().replace(/;$/,''));
  }
  function component(code){
    const mod={exports:{}};
    new Function('require','module','exports',esbuild.transformSync(code,{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
    return mod.exports.default;
  }
  const renderCaption=(Component,parameters)=>render(React.createElement(Component,{data:parameters}));
  assert.equal(api.SCRIPT_BUILD,api.RADIO_SCRIPT_BUILD,'All templates use the unified builder');
  const series=component(embedded(api.SCRIPT_BUILD));
  const legacyTemplate=structuredClone(template);
  for(const key of ['boxPaddingTop','boxPaddingBottom','boxLineHeight'])delete legacyTemplate.captions[key];

  await t.test('Huick parameters and real embedded renderer agree with the preview',()=>{
    const params=api.radioCaptionParams(template);
    assert.equal(params.bottom,1404);assert.equal(params.fontSize,54);
    assert.deepEqual([params.boxPaddingTop,params.boxPaddingBottom,params.boxLineHeight],[6,6,1.05]);
    for(const text of ['\ud55c \uc904 \ub300\uc0ac','\uccab\uc9f8 \uc904\n\ub458\uc9f8 \uc904']){
      const actual=renderCaption(series,{...params,text}),preview=renderCaption(api.RadioPreviewCaption,{...params,text});
      assert.equal(actual,preview);
      assert.match(actual,/height:1404px/);assert.match(actual,/padding:6px 26px 6px/);
      assert.match(actual,/line-height:1\.05/);assert.match(actual,/font-size:54px/);
      assert.equal((actual.match(/line-height:1\.05/g)||[]).length,text.split('\n').length);
    }
  });

  await t.test('omitted options preserve box defaults and optional box settings never alter bar captions',()=>{
    const params={...api.radioCaptionParams(legacyTemplate),text:'Caption'};
    for(const key of ['boxPaddingTop','boxPaddingBottom','boxLineHeight'])assert.equal(Object.hasOwn(params,key),false);
    const html=renderCaption(series,params);
    assert.match(html,/padding:10px 26px 14px/);assert.match(html,/line-height:1\.3/);
    assert.equal(html,renderCaption(api.RadioPreviewCaption,params));
    for(const Component of [series,api.RadioPreviewCaption]){
      const bar={...params,mode:'bar'};
      assert.equal(renderCaption(Component,bar),renderCaption(Component,{...bar,boxPaddingTop:0,boxPaddingBottom:1,boxLineHeight:1.05}));
      assert.match(renderCaption(Component,bar),/line-height:1\.28/);
    }
    assert.notEqual(html,renderCaption(series,{...params,boxPaddingTop:6,boxPaddingBottom:6,boxLineHeight:1.05}));
  });

  await t.test('Premiere caption tracking reaches both bar renderers without changing legacy defaults',()=>{
    const heukbaek=require('../template-packs/chosun-ilbo/templates/heukbaek.json');
    const params={...api.radioCaptionParams(heukbaek),text:'\uc7a5\uc724\uae30 \uc0ac\uac74\uc774\n\ud130\uc84c\uc744 \ub54c\ub294'};
    assert.equal(params.letterSpacing,75*(-44/1000));
    assert.equal(params.baselineTop,1344.90234375);
    assert.equal(params.rowGap,90);
    const barParams={...params,baselineTop:undefined};
    const actual=renderCaption(series,barParams);
    assert.equal(actual,renderCaption(api.RadioPreviewCaption,barParams));
    assert.equal((actual.match(/letter-spacing:-3\.3px/g)||[]).length,2);
    for(const Component of [series,api.RadioPreviewCaption]){
      assert.match(renderCaption(Component,{...params,baselineTop:undefined,letterSpacing:undefined}),/letter-spacing:-1px/);
      assert.match(renderCaption(Component,{...params,baselineTop:undefined,letterSpacing:0}),/letter-spacing:0/);
    }
  });

  await t.test('optional box values validate and survive saved template edits and variants',()=>{
    assert.equal(api.validateTemplate(legacyTemplate),legacyTemplate);
    assert.equal(api.validateTemplate(template),template);
    const zero=structuredClone(template);zero.captions.boxPaddingTop=0;zero.captions.boxPaddingBottom=0;
    assert.equal(api.validateTemplate(zero),zero);
    assert.match(renderCaption(series,{...api.radioCaptionParams(zero),text:'Text'}),/padding:0px 26px 0px/);
    for(const key of ['boxPaddingTop','boxPaddingBottom','boxLineHeight']){
      for(const value of [-1,'6',null,NaN,Infinity,...(key==='boxLineHeight'?[0]:[])]){
        const bad=structuredClone(template);bad.captions[key]=value;
        assert.throws(()=>api.validateTemplate(bad),/caption|finite/i);
      }
    }
    const edited=api.cleanTemplate(structuredClone(template));
    const patch=api.templatePatch(legacyTemplate,edited);
    assert.deepEqual(patch,{captions:{boxPaddingTop:6,boxPaddingBottom:6,boxLineHeight:1.05}});
    assert.deepEqual(api.merge(legacyTemplate,patch),edited);
    const variant={...legacyTemplate,variants:{tiktok:patch}};
    assert.equal(api.validateTemplate(variant),variant);
    assert.equal(api.merge(variant,variant.variants.tiktok).captions.boxLineHeight,1.05);
  });

  await t.test('host scene captions forward box parameters through the actual script without changing timing',async()=>{
    const graphics=[];
    const clip={name:'Scene',beats:[{startSeconds:10,endSeconds:12,captions:[{startSeconds:10,endSeconds:12,text:'\uccab \uc904\n\ub458\uc9f8 \uc904'}]}]};
    const d={meta:async()=>({name:'Scene',fps:30}),clips:async()=>[{startFrame:0,endFrame:60}],
      motionGraphics:async()=>graphics,motionGraphicProgram:async c=>({parameters:graphics.find(g=>g.clip===c).parameters}),
      rangeAtFrames:async(a,b)=>({startFrame:a,endFrame:b}),addMotionGraphic:async g=>graphics.push({...g,name:g.label,clip:g.within}),commitAll:async()=>{}};
    const body=api.sceneCaptionScript('project','draft',clip,template,{editable:{caption:'Text',size:'Size',font:'Font'}});
    const run=new Function(esbuild.transformSync('async function execute(selects){'+body+'}',{loader:'ts'}).code+';return execute;')();
    const sdk={project:()=>({meta:async()=>({draftIds:['draft']})}),draft:()=>d};
    assert.deepEqual(await run(sdk),{added:1});
    const g=graphics[0];
    assert.deepEqual(g.within,{startFrame:0,endFrame:60});
    assert.equal(g.parameters.text,'\uccab \uc904\n\ub458\uc9f8 \uc904');
    assert.deepEqual([g.parameters.bottom,g.parameters.boxPaddingTop,g.parameters.boxPaddingBottom,g.parameters.boxLineHeight],[1404,6,6,1.05]);
    const html=renderCaption(component(g.tsxCode),g.parameters);
    assert.match(html,/height:1404px/);assert.match(html,/padding:6px 26px 6px/);
    assert.match(html,/line-height:1\.05/);assert.match(html,/white-space:pre-wrap/);
    assert.deepEqual(await run(sdk),{added:0});assert.equal(graphics.length,1);
  });

  await t.test('fixed caption sizing is the default and auto sizing remains available',()=>{
    const parenting=require('../template-packs/chosun-ilbo/templates/parenting.json');
    const auto=structuredClone(parenting);auto.captions.fontSizing='auto';
    const fixed=structuredClone(parenting);fixed.captions.fontSizing='fixed';
    // Auto sizing keeps the template's characters per line and is the only value forwarded to renderers.
    assert.equal(api.captionLineMax(auto),18);
    assert.equal(api.radioCaptionParams(auto).fontSizing,'auto');
    for(const t of [parenting,fixed])assert.equal(Object.hasOwn(api.radioCaptionParams(t),'fontSizing'),false);
    // Omitted and explicit fixed sizing agree. Without a canvas a glyph is one em:
    // (1000 - 2 * 20 padding) / 88px holds 10 characters.
    assert.equal(api.captionLineMax(parenting),10);
    assert.equal(api.captionLineMax(fixed),10);
    assert.equal(api.captionLineMax({...parenting,captions:{...parenting.captions,fontSize:400}}),4);
    assert.equal(api.captionLineMax({...parenting,landscape:{}}),18);
    const long='\uc544\uc774\uac00 \uc7a0\ub4e4\uae30 \uc804\uc5d0 \ud56d\uc0c1 \uc6b8\uc5b4\uc694';
    for(const Component of [series,api.RadioPreviewCaption]){
      for(const mode of ['bar','box']){
        const params={...api.radioCaptionParams(parenting),mode,text:long};
        assert.match(renderCaption(Component,params),/font-size:88px/);
        assert.doesNotMatch(renderCaption(Component,{...params,fontSizing:'auto'}),/font-size:88px/);
        // A single word wider than the caption still shrinks as a last resort.
        assert.doesNotMatch(renderCaption(Component,{...params,text:'\uac00'.repeat(14)}),/font-size:88px/);
      }
      for(const t of [parenting,auto]){
        const params={...api.radioCaptionParams(t),text:long};
        assert.equal(renderCaption(series,params),renderCaption(api.RadioPreviewCaption,params));
      }
    }
    for(const t of [auto,fixed])assert.equal(api.validateTemplate(t),t);
    for(const value of ['Fixed','',true,null]){
      const bad=structuredClone(parenting);bad.captions.fontSizing=value;
      assert.throws(()=>api.validateTemplate(bad),/font sizing/);
    }
  });
});

}
