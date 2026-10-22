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
  const source = fs.readFileSync(path.join(__dirname, '../panel.tsx'), 'utf8');
  const sf = ts.createSourceFile('panel.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = 'independentTemplateDesigns,readTemplatePack,forPlatform,merge,STRINGS,RADIO_STRINGS,RADIO_SCRIPT_BUILD,SCRIPT_BUILD,SCRIPT_LIMIT,RadioPreviewFrame,RadioPreviewCaption,speakerTurns,planShots,TemplateEditor,OVERLAY_STRINGS';
  // Extract the actual production build-parameter expression, not a test copy of it.
  let params;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sf) === 'P' && ts.isObjectLiteralExpression(node.initializer) && node.initializer.properties.some(p => p.name?.getText(sf) === 'segments')) params = node.initializer.getText(sf);
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(params, 'Production clip builder parameters found');
  const extra = `\nexport { ${names} };\nexport function buildParams(tpl, c, title, legacyJob={}) {
    const projectId='test-project', job={...legacyJob,resourceId:'test-video',title}, name='template-check';
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
  const packFs = {readFile: async p => new Uint8Array(fs.readFileSync(p)), join:path.join};
  api.BUILTIN_TEMPLATES = (await api.readTemplatePack(packFs, path.join(__dirname,'../template-packs/sbs-radio/pack.json'))).templates;
  const template = (id, layout='tiktok') => api.forPlatform(api.BUILTIN_TEMPLATES.find(t => t.id === id), layout);
  const clip = {headline1:'Headline',headline2:'Second line',segments:[[0,1.8]],highlights:['market']};
  const title = 'Episode 261014(\uc218)';

  await t.test('all four programs keep one primary design regardless of legacy platform arguments', () => {
    assert.deepEqual(api.BUILTIN_TEMPLATES.map(t=>t.id), ['political-show','news-briefing','news-direct','money-lab']);
    for (const t of api.BUILTIN_TEMPLATES) assert.equal(t.demoOverlay,undefined);
    assert.equal(template('money-lab').layout.windowTop,560);
    assert.equal(template('money-lab','shorts').layout.windowTop,560);
    const duplicate={...structuredClone(template('money-lab','shorts')),id:'custom-money'};
    assert.equal(api.forPlatform(duplicate,'tiktok').renderer,undefined);
    assert.equal(api.forPlatform(duplicate,'tiktok').layout.windowTop,560);
    assert.equal(template('political-show').renderer,undefined);
    assert.equal(template('news-briefing').renderer,undefined);
  });

  await t.test('new clips never inherit preview or legacy automatic-overlay settings', () => {
    for (const id of api.BUILTIN_TEMPLATES.map(t=>t.id)) {
      for (const enabled of [false,true]) {
        const tpl={...template(id),demoOverlay:enabled};
        const P=api.buildParams(tpl,clip,title,{demoOverlay:!enabled});
        assert.equal(P.demoOverlay,false);
        assert.equal(P.overlayResourceId,null);
      }
    }
  });

  await t.test('Money Lab produces an editable date and preserves gradients and caption emphasis', () => {
    const P=api.buildParams(template('money-lab'),clip,title);
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

  for(const id of ['news-direct','money-lab']) for(const layout of ['tiktok','shorts']) {
    await t.test(`${id} ${layout} builds editable graphics without the demo overlay`,async()=>{
      const P=api.buildParams(template(id,layout),clip,title);
      const code=api.RADIO_SCRIPT_BUILD.replace('const P: any = __P__;','const P: any = '+JSON.stringify(P)+';');
      assert.ok(code.length<api.SCRIPT_LIMIT, 'Bundled assets fit the script size limit');
      const graphics=[];
      const words=[{text:'The',startFrame:0,endFrame:12,sourceStartFrame:0,speakerId:'a',utteranceId:'u'},
        {text:'market',startFrame:12,endFrame:30,sourceStartFrame:12,speakerId:'a',utteranceId:'u'},
        {text:'moves.',startFrame:30,endFrame:54,sourceStartFrame:30,speakerId:'a',utteranceId:'u'}];
      const meta=async()=>({fps:30,durationSeconds:2,frameSize:{width:1920,height:1080}});
      const draft={words:async()=>words,meta,insertResource:async()=>{},silenceSpans:async()=>[],setSettings:async x=>assert.deepEqual(x,{frameRate:'30/1',frameSize:{width:1920,height:1080}}),setFrameSize:async x=>assert.deepEqual(x,{width:1080,height:1920}),
        clips:async()=>[{resourceId:'test-video',trackKind:'main',startFrame:0,endFrame:60}],setClipTransform:async()=>{},rangeAtFrames:async(a,b)=>({a,b}),
        addMotionGraphic:async g=>{graphics.push(g);esbuild.transformSync(g.tsxCode,{loader:'tsx'});},commitAll:async()=>({createdDraftId:'verified'})};
      const selects={project:()=>({resources:async()=>[{resourceId:'test-video'}],resource:()=>({meta,words:async()=>words}),createDraft:async()=>draft})};
      const wrapped=esbuild.transformSync('async function build(selects){'+code+'}\nreturn build;',{loader:'ts'}).code;
      const result=await new Function(wrapped)()(selects);
      assert.equal(result.draftId,'verified');
      assert.ok(!graphics.some(g=>g.label==='Series frame and headline'));
      for(const label of ['Clip · \ubc30\uacbd','Clip · \uc81c\ubaa9 1','Clip · \uc81c\ubaa9 2','Clip · \ud504\ub85c\uadf8\ub7a8 \ub85c\uace0'])assert.ok(graphics.some(g=>g.label===label),label);
      const first=graphics.find(g=>g.label==='Clip · \uc81c\ubaa9 1'),second=graphics.find(g=>g.label==='Clip · \uc81c\ubaa9 2');
      assert.ok(first.editableParameters.some(p=>p.key==='headline1'));
      assert.ok(!first.editableParameters.some(p=>p.key==='headline2'));
      assert.ok(second.editableParameters.some(p=>p.key==='headline2'));
      assert.equal(first.parameters.designElement,'headline1');
      assert.equal(second.parameters.designElement,'headline2');
      const background=graphics.find(g=>g.label==='Clip · \ubc30\uacbd');
      assert.equal(background.parameters.designElement,'background');
      // Gradient strings are valid backgrounds, but not SDK color-field defaults.
      assert.equal(background.editableParameters.find(p=>p.key==='background').type,'text');
      for (const g of graphics) assert.ok(g.editableParameters?.length > 0, g.label + ' remains editable');
      assert.ok(graphics.some(g=>g.label.startsWith('Caption ')));
      assert.equal(graphics.some(g=>g.label==='Date'),id==='money-lab');
      assert.ok(graphics.every(g=>! /overlay|demo/i.test(g.label)));
      if(id==='money-lab')assert.ok(graphics.some(g=>g.parameters.text?.includes('*market*')));
    });
  }
  await t.test('caption cleanup selects original occurrences and never removes video by itself',async()=>{
    for(const mode of ['clean','disabled','invalid','after-video-edit']){
      const P=api.buildParams(template('news-direct'),clip,title);
      P.cleanSpeechText=mode!=='disabled';P.removeFillers=mode==='after-video-edit';P.removeSilences=false;
      P.captionOmissions=[{startSeconds:0,endSeconds:1.8,text:'um',occurrence:1,reason:'filler'}];
      if(mode==='invalid')P.captionOmissions[0].occurrence=999;
      const words=['um','um','important'].map((text,i)=>({text,startFrame:i*15,endFrame:i*15+12,sourceStartFrame:i*15,speakerId:'a',utteranceId:'u',filler:i===0?{removable:true}:undefined}));
      let output=words.map(w=>({...w})),removed=0;const graphics=[];
      const meta=async()=>({fps:30,durationSeconds:1.8,frameSize:{width:1920,height:1080}});
      const draft={meta,words:async()=>output,insertResource:async()=>{},setSettings:async()=>{},setFrameSize:async()=>{},
        remove:async()=>{removed++;output=output.slice(1).map(w=>({...w,startFrame:w.startFrame-15,endFrame:w.endFrame-15}));},
        clips:async()=>[{resourceId:'test-video',trackKind:'main',startFrame:0,endFrame:54}],setClipTransform:async()=>{},
        rangeAtFrames:async(a,b)=>({a,b}),addMotionGraphic:async g=>graphics.push(g),commitAll:async()=>({createdDraftId:'cleanup-'+mode})};
      const selects={project:()=>({resources:async()=>[{resourceId:'test-video'}],resource:()=>({meta,words:async()=>words}),createDraft:async()=>draft})};
      const code=api.SCRIPT_BUILD.replace('const P: any = __P__;','const P: any = '+JSON.stringify(P)+';');
      const wrapped=esbuild.transformSync('async function build(selects){'+code+'}\nreturn build;',{loader:'ts'}).code;
      await new Function(wrapped)()(selects);
      const captions=graphics.filter(g=>g.label.startsWith('Caption '));
      const text=captions.map(g=>g.parameters.text).join(' ').replace(/\*/g,'').replace(/\s+/g,' ').trim();
      assert.equal(text,mode==='clean'?'um important':mode==='after-video-edit'?'important':'um um important');
      assert.equal(removed,mode==='after-video-edit'?1:0);
      assert.deepEqual(words.map(w=>w.sourceStartFrame),[0,15,30]);
      assert.ok(captions.every(g=>g.within.b>g.within.a));
    }
  });
  await t.test('all four templates build before visual analysis completes',async()=>{
    for(const id of api.BUILTIN_TEMPLATES.map(t=>t.id)) {
      const tpl=structuredClone(template(id));
      tpl.headline.font='Sandoll Headline';
      tpl.captions.font='Sandoll Caption';
      const P=api.buildParams(tpl,clip,title), graphics=[];
      const words=[{text:'The',startFrame:0,endFrame:12,sourceStartFrame:0,speakerId:1,utteranceId:'u'},
        {text:'market',startFrame:12,endFrame:30,sourceStartFrame:12,speakerId:1,utteranceId:'u'},
        {text:'moves.',startFrame:30,endFrame:54,sourceStartFrame:30,speakerId:1,utteranceId:'u'}];
      const draft={words:async()=>words,meta:async()=>({fps:30,durationSeconds:2}),
        insertResource:async()=>{},silenceSpans:async()=>[],setSettings:async x=>assert.deepEqual(x,{frameRate:'30/1',frameSize:{width:1920,height:1080}}),setFrameSize:async()=>{},
        clips:async()=>[{resourceId:'test-video',trackKind:'main',startFrame:0,endFrame:60}],
        setClipTransform:async()=>{},rangeAtFrames:async()=>({}),
        addMotionGraphic:async g=>{graphics.push(g);esbuild.transformSync(g.tsxCode,{loader:'tsx'});return {clipId:'graphic'};},
        commitAll:async()=>({createdDraftId:'early-'+id})};
      const project={
        resources:async()=>[{resourceId:'test-video',hasAnalysis:false,hasTranscription:true,status:'analyzing'}],
        resource:()=>{throw Error('Must not use analysis-gated resource reads');},
        sourceFiles:async()=>({fileTree:[{type:'video',resourceId:'test-video',frameRate:30,durationSeconds:2,frameSize:{width:1920,height:1080}}]}),
        transcription:async()=>({utterances:[{resourceId:'test-video',speaker:1,words:words.map(w=>({word:w.text,start:w.startFrame/30,end:w.endFrame/30}))}]}),
        createDraft:async()=>draft,
      };
      const selects={project:()=>project,effectPresets:{get:async()=>({tsxCode:'export default function Text(){return null}',parameters:{},editableParameters:[]})}};
      const script=api.SCRIPT_BUILD.replace('const P: any = __P__;','const P: any = '+JSON.stringify(P)+';');
      const code=esbuild.transformSync('return (async()=>{'+script+'})();',{loader:'ts'}).code;
      const result=await new Function('selects',code)(selects);
      assert.equal(result.draftId,'early-'+id);
      assert.ok(graphics.some(g=>g.label.startsWith('Caption ')),id+' captions');
      for (const g of graphics.filter(g=>g.label.startsWith('Caption '))) {
        assert.equal(g.parameters.fontFamily,'Sandoll Caption',id+' generated caption font');
      }
      {
        assert.equal(graphics.find(g=>g.label==='Clip · \uc81c\ubaa9 1').parameters.fontFamily,'Sandoll Headline');
      }
      assert.ok(graphics.some(g=>g.label=== 'Clip · \uc81c\ubaa9 1'),id+' frame and headline');
    }
  });

  await t.test('shared editor preserves per-template controls and draft lifecycle', async () => {
    const { JSDOM } = dependency('jsdom');
    const dom = new JSDOM('<div id="root"></div>');
    dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
    dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
    const previous = Object.fromEntries(['window','document','IS_REACT_ACT_ENVIRONMENT','ResizeObserver'].map(k=>[k,global[k]]));
    Object.assign(global, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true, ResizeObserver: class { observe() {} disconnect() {} } });
    const { createRoot } = dependency('react-dom/client');
    const { act } = React;
    const root = createRoot(document.getElementById('root'));
    const S = api.merge(api.RADIO_STRINGS.en, api.STRINGS.en);
    const h = React.createElement;
    const controls = new Map();
    const SectionContext = React.createContext('');
    const control = kind => props => {
      const label = props.label || props.children || kind;
      const section = React.useContext(SectionContext);
      const key = section === S.secWindow ? section + '/' + label : label;
      React.useLayoutEffect(() => { controls.set(key, props); return () => { if(controls.get(key)===props) controls.delete(key); }; });
      return h('span', { 'data-control': kind });
    };
    const container = ({ children }) => h('div', null, children);
    const ui = Object.fromEntries(['NumberField','TextField','Select','Segmented','Toggle','ColorField','FontField','Slider','FileDrop','Button','IconButton'].map(k=>[k,control(k)]));
    Object.assign(ui,{Stack:container,Row:container,Section:({title,children})=>h(SectionContext.Provider,{value:title},children),Actions:container,Message:container});
    ui.Tabs = props => {
      React.useLayoutEffect(()=>{controls.set('tabs',props);return ()=>controls.delete('tabs');});
      return props.tabs.find(t=>t.value===props.value)?.content;
    };
    const originals = structuredClone(api.BUILTIN_TEMPLATES);
    const rows = new Map();
    const removed = new Set();
    const writes = [];
    let failSave = false, holdSave, showEditor, refresh, setPlatform;
    const store = {
      put:async (collection,id,value)=>{
        assert.equal(collection,'templates');
        if(failSave)throw new Error('Storage unavailable');
        if(holdSave)await holdSave;
        rows.set(id,structuredClone(value)); writes.push(id);
      },
      del:async (collection,id)=>{assert.equal(collection,'templates');rows.delete(id);},
      remove:async id=>{if(failSave)throw Error('Storage unavailable');removed.add(id);rows.delete(id);},
    };
    const readTemplates=()=>[
      ...originals.map(t=>({...api.merge(t,rows.get(t.id)||{}),builtIn:true,modified:rows.has(t.id)})),
      ...[...rows.values()].filter(t=>!originals.some(b=>b.id===t.id)),
    ].filter(t=>!removed.has(t.id));
    function Harness() {
      const [templates,setTemplates]=React.useState(readTemplates);
      const [platform,updatePlatform]=React.useState("tiktok");
      setPlatform=updatePlatform;
      const [selId,setSelId]=React.useState(originals[0].id);
      const [edit,setEdit]=React.useState(null);
      const [baseKey,setBaseKey]=React.useState('');
      const [sub,setSub]=React.useState('look');
      const [visible,setVisible]=React.useState(true);
      showEditor=setVisible;
      const onChanged=async()=>setTemplates(readTemplates());
      refresh=onChanged;
      return visible?h(api.TemplateEditor,{ui,S,platform,onPlatformChange:updatePlatform,lang:'en',templates,store,onChanged,state:{selId,setSelId,edit,setEdit,baseKey,setBaseKey,sub,setSub}}):null;
    }
    const get=label=>{const c=controls.get(S.secWindow+'/'+label)||controls.get(label);assert.ok(c,'Control is visible: '+label);return c;};
    const change=async(label,value)=>{if(label==='tabs'){await act(async()=>document.querySelector('[data-template-section="'+value+'"]').click());return;}const c=get(label);assert.ok(!c.disabled,label+' is enabled');await act(async()=>c.onChange(value));};
    const click=async label=>{const c=get(label);assert.ok(!c.disabled,label+' is enabled');await act(async()=>c.onClick());};
    try {
      await act(async()=>root.render(h(Harness)));
      for(const original of originals) {
        await change(S.template,original.id);
        const radio=original.platformLayouts ?? !!original.variants?.tiktok;
        assert.equal(controls.has(S.layoutKind),radio);
        if(radio) assert.ok(document.body.textContent.includes(S.editingLayout(S.layoutTiktok)));
        assert.deepEqual([...document.querySelectorAll('[data-template-section]')].map(t=>t.textContent), ['Design','Captions','Framing','Content','Thumbnails']);
        assert.equal(controls.has('Framing mode'),false);
        await change('tabs','framing');
        assert.equal(controls.has('Framing mode'),true);
        {
          const previousMode=get('Framing mode').value;
          await change('Framing mode','manual');
          assert.ok(controls.has(S.sourceTop));
          assert.equal(controls.has('Reframing style'),false);
          await change('Framing mode','auto');
          assert.equal(controls.has(S.sourceTop),false);
          assert.ok(controls.has('Reframing style'));
          await change('Framing mode',previousMode);
          if(!get(S.discard).disabled) await click(S.discard);
        }
        await change('tabs','captions');
        assert.equal(controls.has(S.removeFillers),false);
        await change('tabs','ai');
        assert.equal(controls.has(S.removeFillers),true);
        await change('tabs','look');
        assert.equal(controls.has(S.stroke),true);
        assert.equal(controls.has(api.OVERLAY_STRINGS.en.preview),true);
        if(true) {
          const writesBefore=writes.length, imagesBefore=document.querySelectorAll('img').length;
          await change(api.OVERLAY_STRINGS.en.preview,true);
          assert.equal(document.querySelectorAll('img').length,imagesBefore+1,'Overlay appears in preview');
          assert.equal(get(S.template).disabled,false,'Preview does not lock template switching');
          assert.equal(get(S.save).disabled,true,'Preview is not a template edit');
          assert.equal(writes.length,writesBefore,'Preview is never persisted');
          await change(api.OVERLAY_STRINGS.en.preview,false);
          assert.equal(document.querySelectorAll('img').length,imagesBefore);
        }
        assert.equal(get(S.logoMode).options.some(o=>o.value==='art'),false);
        const displayed=radio?api.forPlatform(original,'tiktok'):original;
        assert.equal(get(S.windowTop).value,displayed.layout.windowTop);
        assert.equal(controls.has(S.editable.topLabel),true);
        assert.equal(controls.has(S.editable.footer),true);
      }
      await change(S.template,'money-lab');
      // Each selected template has one design; no platform picker changes the working copy.
      await change(S.windowTop,601);
      assert.equal(get(S.template).disabled,true);
      assert.equal(get(S.duplicate).disabled,true);
      assert.equal(controls.has(S.layoutKind),false);
      await change(S.name,'Edited Money Lab');
      await change('tabs','ai');
      await change(S.role,'Edited prompt');
      await change(S.keywords,' alpha , beta , ');
      // Main tab navigation unmounts the editor but must keep the working copy.
      await act(async()=>showEditor(false));
      await act(async()=>showEditor(true));
      assert.equal(get(S.role).value,'Edited prompt');
      await change('tabs','look');
      assert.equal(get(S.windowTop).value,601);
      failSave=true;
      await click(S.save);
      assert.match(document.body.textContent,/Storage unavailable/);
      assert.equal(rows.size,0);
      assert.equal(get(S.template).disabled,true);
      failSave=false;
      let release;
      holdSave=new Promise(resolve=>{release=resolve;});
      let pending;
      await act(async()=>{pending=get(S.save).onClick();});
      assert.equal(get(S.save).busy,true);
      assert.equal(get(S.windowTop).disabled,true);
      assert.equal(controls.has(S.layoutKind),false);
      await act(async()=>{release();await pending;});
      holdSave=null;
      const money=rows.get('money-lab');
      assert.equal(money.layout.windowTop,601);
      assert.equal(money.variants,undefined);
      assert.equal(money.name,'Edited Money Lab');
      assert.equal(money.prompt.role,'Edited prompt');
      assert.deepEqual(money.detect.keywords,['alpha','beta']);
      assert.equal(money.builtIn,undefined);
      assert.equal(money.modified,undefined);
      assert.equal(money.platformLayouts,undefined);
      assert.equal(get(S.save).disabled,true);
      await change(S.windowTop,650);
      await click(S.discard);
      assert.equal(get(S.windowTop).value,601);
      await click(S.duplicate);
      const customId=get(S.template).value;
      assert.notEqual(customId,'money-lab');
      assert.equal(rows.get(customId).baseId,'money-lab');
      assert.equal(rows.get(customId).renderer,undefined);
      assert.equal(rows.get(customId).layout.windowTop,601);
      await change(S.windowTop,620);
      await click(S.save);
      assert.equal(rows.get('money-lab').layout.windowTop,601);
      await click(S.deleteTemplate);
      assert.equal(document.querySelector('dialog').open,true);
      assert.ok(document.body.textContent.includes(S.deleteBody(rows.get(customId).name)));
      assert.ok(document.body.textContent.includes(S.deleteKeepClips));
      assert.ok(rows.has(customId));
      await click(S.cancel);
      assert.equal(document.querySelector('dialog').open,false);
      assert.ok(rows.has(customId),'Cancel leaves the template intact');
      await click(S.deleteTemplate);
      failSave=true;await click(S.del);
      assert.equal(document.querySelector('dialog').open,true);
      assert.ok(rows.has(customId),'Failed deletion leaves the template intact');
      failSave=false;await click(S.del);
      assert.equal(rows.has(customId),false);
      assert.equal(get(S.template).value,originals[0].id);
      assert.equal(controls.has(S.layoutKind),false);
      // Classic templates write directly into their own base layout.
      const classicTop=get(S.windowTop).value;
      await change(S.windowTop,classicTop+10);
      await click(S.save);
      assert.equal(rows.get(originals[0].id).layout.windowTop,classicTop+10);
      assert.deepEqual(rows.get(originals[0].id).variants,originals[0].variants);
      await click(S.reset);
      assert.equal(get(S.windowTop).value,classicTop);
      await change(S.template,'money-lab');
      await click(S.reset);
      assert.equal(rows.has('money-lab'),false);
      assert.equal(get(S.windowTop).value,560);
      const count=writes.length;
      await change(S.windowTop,1700);
      await click(S.save);
      assert.equal(writes.length,count,'Invalid layout never reaches storage');
      assert.ok(document.body.textContent.includes(S.invalidLayout));
      await click(S.discard);
      await change('tabs','captions');
      await change(S.captionsOn,false);
      assert.equal(controls.has(S.fontSize),false);
      await click(S.discard);
      assert.equal(get(S.captionsOn).value,true);
      assert.deepEqual(api.BUILTIN_TEMPLATES,originals,'Editing never mutates builtin defaults');
      const singleLayouts=(await api.readTemplatePack(packFs,path.join(__dirname,'../template-packs/hankook-ilbo/pack.json'))).templates;
      originals.push(...singleLayouts.flatMap(t=>api.independentTemplateDesigns({...t,platformLayouts:false,variants:{tiktok:{headline:{size1:120}}}})));
      await act(async()=>refresh());
      await change('tabs','look');
      assert.equal(controls.has(S.layoutKind),false);
      for(const single of singleLayouts){
        await change(S.template,single.id);
        assert.equal(controls.has(S.layoutKind),false);
        assert.equal(get(S.size1).value,120,'Previously saved TikTok edits remain visible');
        await change(S.size1,125);
        await change(S.font,'Sandoll Headline');
        await change('tabs','captions');
        await change(S.font,'Sandoll Caption');
        await click(S.save);
        assert.equal(rows.get(single.id).headline.size1,125);
        for (const platform of ['tiktok','shorts']) {
          const saved=readTemplates().find(t=>t.id===single.id);
          const P=api.buildParams(api.forPlatform(saved,platform),clip,title);
          assert.equal(P.frame.fontFamily,'Sandoll Headline',platform+' headline');
          assert.equal(P.caption.fontFamily,'Sandoll Caption',platform+' caption');
          assert.equal(P.frame.headlineSize1,125,platform+' layout');
        }
        await change('tabs','look');
        assert.equal(controls.has(S.layoutKind),false,'Saving does not expose layout choices');
        await click(S.duplicate);
        assert.equal(controls.has(S.layoutKind),false,'Copies retain the single-layout editor');
      }
      await change(S.template,originals[0].id);
      await click(S.deleteTemplate);
      const cancelEvent=new dom.window.Event('cancel',{cancelable:true});
      await act(async()=>document.querySelector('dialog').dispatchEvent(cancelEvent));
      assert.equal(document.querySelector('dialog').open,false);
      assert.equal(removed.has(originals[0].id),false,'Escape cancels deletion');
      await click(S.deleteTemplate);await click(S.del);
      assert.equal(removed.has(originals[0].id),true,'Pack templates can be removed too');
      while(controls.has(S.deleteTemplate)){
        await click(S.deleteTemplate);await click(S.del);
      }
      assert.equal(controls.has(S.template),false,'Removing the final template leaves no dangling selection');


    } finally {
      await act(async()=>root.unmount());
      dom.window.close();
      for(const [key,value] of Object.entries(previous)) {
        if(value===undefined)delete global[key]; else global[key]=value;
      }
    }
  });

});
