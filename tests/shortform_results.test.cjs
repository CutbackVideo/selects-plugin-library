'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const modulesRoot = process.env.SBS_PANEL_TEST_MODULES;

test('draft results preserve descriptions and follow the current draft', {skip: !modulesRoot && 'Set SBS_PANEL_TEST_MODULES'}, async t => {
  const dep = createRequire(path.resolve(modulesRoot, '../package.json'));
  const React = dep('react'), {act} = React, {JSDOM} = dep('jsdom');
  const source = fs.readFileSync(path.join(__dirname, '../plugins/shortform-clips/panel.tsx'), 'utf8');
  const code = dep('esbuild').transformSync(source + '\nexport {DraftResults,RESULT_STRINGS,latestDraftResult};', {loader:'tsx',format:'cjs'}).code;
  const mod = {exports:{}};
  new Function('require','module','exports',code)(() => React, mod, mod.exports);
  const {DraftResults, RESULT_STRINGS, latestDraftResult} = mod.exports;

  await t.test('restore the latest project result, including partial failures, without losing results when a later run has no drafts yet', () => {
    const older = {projectId:'a',updated:'2026-10-15',built:[{draftId:'old'}],done:true};
    const latest = {projectId:'a',updated:'2026-10-16',built:[{draftId:'new'},null,{error:'Failed'}]};
    const other = {projectId:'b',updated:'2026-10-17',built:[{draftId:'other'}]};
    assert.equal(latestDraftResult([older,latest,other], 'a'),latest);
    assert.equal(latestDraftResult([older,{...latest,built:[]}], 'a'),older);
    assert.equal(latestDraftResult([older,{...latest,dismissed:true}], 'a'),older);
    assert.equal(latestDraftResult([older,other], 'c'),null);
  });

  const dom = new JSDOM('<div id="root"></div>');
  const keys = ['window','document','ResizeObserver','IS_REACT_ACT_ENVIRONMENT'];
  const previous = Object.fromEntries(keys.map(k => [k,global[k]]));
  const observers = new Set();
  let overflow = true;
  class Observer {
    constructor(callback) { this.callback=callback; observers.add(this); }
    observe() {}
    disconnect() { observers.delete(this); }
  }
  Object.assign(global,{window:dom.window,document:dom.window.document,ResizeObserver:Observer,IS_REACT_ACT_ENVIRONMENT:true});
  Object.defineProperty(dom.window.HTMLElement.prototype,'scrollHeight',{get(){return this.textContent.includes('Full description') && overflow ? 90 : 30;}});
  Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return 30;}});
  const root = dep('react-dom/client').createRoot(document.getElementById('root'));
  const e = React.createElement;
  const ui = {
    Button: ({children,onClick,disabled,busy}) => e('button',{onClick,disabled:disabled||busy},children),
    Stack: ({children}) => e('div',null,children),
    Grid: ({children}) => e('div',null,children),
    Message: ({children,tone}) => e('p',{'data-tone':tone},children),
  };
  const drafts = [
    {draftId:'a',headline1:'First headline',headline2:'Second headline',seconds:75.7,why:'Full description. The last sentence remains available.'},
    {draftId:'b',headline1:'Another headline',seconds:44.1,why:'Short description.'},
    {name:'failed',headline1:'Failed draft',why:'Keep the explanation even on failure.',error:'Build failed'},
  ];
  const opened = [];
  const props = {drafts,ui,S:{open:'Open',seconds:n=>`${n}s`,recommended:'Recommended',clipsUnit:n=>`${n} clips`},R:RESULT_STRINGS.en,template:'Test template',info:{why:'Template selection reason.',recommended:3,countReason:'Full recommendation. Including the final sentence.'},warn:'Check the crop.',onOpen:id=>opened.push(id)};
  const buttons = () => [...document.querySelectorAll('button')];
  const button = label => buttons().find(b=>b.textContent===label);
  const render = async extra => act(async()=>root.render(e(DraftResults,{...props,...extra})));
  const click = async label => act(async()=>button(label).click());
  try {
    await render({visibleDraftId:'a'});
    assert.match(document.body.textContent,/2 clips created/);
    assert.equal(button('Currently viewing').disabled,true);
    assert.equal(button('Show more') != null,true);
    assert.equal(buttons().filter(b=>b.textContent==='Show more').length,1,'Short descriptions need no toggle');
    assert.match(document.body.textContent,/Keep the explanation even on failure/);
    assert.equal(document.querySelectorAll('[data-tone="error"]').length,1);
    const description = [...document.querySelectorAll('small')].find(n=>n.textContent===drafts[0].why);
    assert.equal(description.style.webkitLineClamp,'3');
    await click('Show more');
    assert.equal(description.style.webkitLineClamp,'');
    assert.equal(description.textContent,drafts[0].why);
    await click('Show less');
    assert.equal(description.style.webkitLineClamp,'3');
    await click('Open');
    assert.deepEqual(opened,['b']);
    await render({visibleDraftId:'b'});
    assert.match(button('Currently viewing').parentElement.parentElement.textContent,/Another headline/);
    await render({visibleDraftId:'unrelated'});
    assert.equal(button('Currently viewing'),undefined);
    assert.equal(buttons().filter(b=>b.textContent==='Open').length,2);
    await render({visibleDraftId:'unrelated',opening:'b'});
    assert.equal(buttons().filter(b=>b.textContent==='Open' && b.disabled).length,2);
    assert.equal(button('Details'),undefined);
    assert.doesNotMatch(document.body.textContent,/Full recommendation|Check the crop/);
    overflow=false;
    await act(async()=>observers.forEach(o=>o.callback()));
    assert.equal(button('Show more'),undefined,'Wider cards no longer need the toggle');
    overflow=true;
    await act(async()=>observers.forEach(o=>o.callback()));
    assert.ok(button('Show more'),'Narrower cards regain the toggle');
  } finally {
    await act(async()=>root.unmount());dom.window.close();
    for(const k of keys)if(previous[k]===undefined)delete global[k];else global[k]=previous[k];
  }
});
