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
  const source = fs.readFileSync(path.join(__dirname, '../panel.tsx'), 'utf8');
  const code = dep('esbuild').transformSync(source + '\nexport {DraftResults,RESULT_STRINGS,latestDraftResult,savedDraftResults,resultJobLabel,clipAssessment,rankDrafts,readDraftThumbnail,loadDraftThumbnail,thumbnailPath,CLIP_SCORE_PROMPT};', {loader:'tsx',format:'cjs'}).code;
  const mod = {exports:{}};
  new Function('require','module','exports',code)(() => React, mod, mod.exports);
  const {DraftResults, RESULT_STRINGS, latestDraftResult,savedDraftResults,resultJobLabel,clipAssessment,rankDrafts,readDraftThumbnail,loadDraftThumbnail,thumbnailPath,CLIP_SCORE_PROMPT} = mod.exports;

  await t.test('restore the latest project result, including partial failures, without losing results when a later run has no drafts yet', () => {
    const older = {projectId:'a',updated:'2026-10-15',built:[{draftId:'old'}],done:true};
    const latest = {projectId:'a',updated:'2026-10-16',built:[{draftId:'new'},null,{error:'Failed'}]};
    const other = {projectId:'b',updated:'2026-10-17',built:[{draftId:'other'}]};
    assert.equal(latestDraftResult([older,latest,other], 'a'),latest);
    assert.equal(latestDraftResult([older,{...latest,built:[]}], 'a'),older);
    assert.equal(latestDraftResult([older,{...latest,dismissed:true}], 'a'),older);
    assert.equal(latestDraftResult([older,other], 'c'),null);
  });

  await t.test('saved runs are project-scoped, newest first, and named without internal IDs',()=>{
    const jobs=[{id:'secret-a',projectId:'a',created:'2026-10-15T10:00:00Z',updated:'2026-10-17',title:'Interview',built:[{draftId:'one'}]},
      {id:'secret-b',projectId:'a',created:'2026-10-16T10:00:00Z',resourceName:'News.mp4',built:[{draftId:'two'},{error:'failed'}]},
      {id:'other',projectId:'b',created:'2026-10-18',built:[{draftId:'other'}]},
      {id:'empty',projectId:'a',created:'2026-10-19',built:[]}];
    assert.deepEqual(savedDraftResults(jobs,'a').map(j=>j.id),['secret-b','secret-a']);
    const label=resultJobLabel(jobs[1],'en',RESULT_STRINGS.en);
    assert.match(resultJobLabel({title:'abcdefghijk.mp4',built:[{draftId:'x',headline1:'Readable topic'}]},'en',RESULT_STRINGS.en),/Readable topic/);
    assert.match(label,/News.mp4/);assert.match(label,/1 clips created/);assert.doesNotMatch(label,/secret-b/);
    assert.match(resultJobLabel({built:[{draftId:'x',headline1:'Clip title'}]},'en',RESULT_STRINGS.en),/Clip title.*Unknown date/);
  });
  await t.test('empty source validation leaves previous results and pending restoration intact',async()=>{
    const start=source.indexOf('  async function run(resume?: any) {');
    const prefix=source.slice(start+'  async function run(resume?: any) {'.length,source.indexOf('    setBusy(true);',start));
    const check=new Function('env',`return async function(resume){const {overlayLock,busy,packLock,setError,setWarn,setDrafts,setInfo,projectId,templates,mode,url,pick,S,K,resultsRevision}=env;${prefix};return 'valid';}`);
    const saved=[{draftId:'keep'}];let visible=saved,error='',clears=0;
    const env={overlayLock:{current:false},busy:false,packLock:{current:false},setError:x=>error=x,setWarn:()=>{},setDrafts:x=>{visible=x;clears++;},setInfo:()=>{},projectId:'project',templates:[{}],mode:'youtube',url:'',pick:null,S:{needUrl:'Need URL',needPick:'Need video',noProject:'Need project'},K:{empty:'Need templates'},resultsRevision:{current:2}};
    await check(env)();assert.equal(error,'Need URL');assert.equal(visible,saved);assert.equal(clears,0);assert.equal(env.resultsRevision.current,2);
    await check({...env,mode:'project'})();assert.equal(error,'Need video');assert.equal(visible,saved);
    assert.equal(await check({...env,url:'https://youtube.com/watch?v=example'})(),'valid');assert.equal(visible,saved);
  });
  await t.test('fixed rubric rejects invented or malformed scores and sorts without changing build order',()=>{
    assert.match(CLIP_SCORE_PROMPT,/Hook:.*Flow:.*Payoff:/s);
    const good={hook:9,flow:8,payoff:7,reason:'Clear opening, progression and answer.'};
    assert.equal(clipAssessment({...good,overall:99}).overall,8);
    for(const value of [undefined,{}, {...good,hook:'9'},{...good,flow:11},{...good,payoff:-1},{...good,hook:4.5},{...good,reason:''}])assert.equal(clipAssessment(value),null);
    const rows=[{id:'old'},{id:'low',assessment:{...good,hook:4}},{id:'high',assessment:good},{id:'tie',assessment:good}];
    assert.deepEqual(rankDrafts(rows).map(d=>d.id),['high','tie','low','old']);
    assert.deepEqual(rows.map(d=>d.id),['old','low','high','tie']);
  });
  await t.test('thumbnails capture the composited draft at one second, clamped for short clips',async()=>{
    const calls=[];let end=90;
    const sdk={call:async(...args)=>{calls.push(args);if(args[0]==='getDraftMediaSnapshot')return {fps:30,clips:[{trackKind:'main',startFrame:0,endFrame:end}]};if(args[0]==='getDraftCore')return {owner:{projectId:'project',libraryId:'library'},sequenceJson:{saved:true},generatorJsons:[{id:'headline'}]};return {mimeType:'image/jpeg',data:'YQ=='};}};
    assert.equal(await readDraftThumbnail(sdk,'project','draft'),'data:image/jpeg;base64,YQ==');
    assert.deepEqual(calls[2],['captureVisualFrames',{owner:{projectId:'project',libraryId:'library'},sequenceId:'draft',sequenceJson:{saved:true},generatorJsons:[{id:'headline'}],coordinate:'resolved',frames:[{frameNumber:30,view:'timeline_composite'}],includeOverlays:true}]);
    calls.length=0;end=10;await readDraftThumbnail(sdk,'project','draft');assert.equal(calls[2][1].frames[0].frameNumber,9);
    assert.equal(await readDraftThumbnail({call:async()=>({clips:[]})},'project','draft'),null);
    await assert.rejects(()=>readDraftThumbnail(sdk,'other','draft'),/project mismatch/);
  });
  await t.test('saved JPEGs are reused without recapturing an edited draft and paths cannot escape storage',async()=>{
    const saved=new Map();let captures=0;
    const store={root:'/data',join:(...p)=>p.join('/'),exists:async p=>saved.has(p),fs:{readFile:async p=>saved.get(p),writeFile:async(p,v)=>saved.set(p,v)}};
    const sdk={call:async method=>{if(method==='getDraftMediaSnapshot')return {fps:24,clips:[{trackKind:'main',endFrame:48}]};if(method==='getDraftCore')return {owner:{projectId:'p'},sequenceJson:{}};captures++;return {mimeType:'image/jpeg',data:'YQ=='};}};
    const first=await loadDraftThumbnail(store,sdk,'p','job','draft');
    assert.equal(first.thumbnailPath,'thumbnails/job/draft.jpg');assert.deepEqual([...saved.get('/data/'+first.thumbnailPath)],[97]);
    assert.deepEqual(await loadDraftThumbnail(store,sdk,'p','job','draft'),first);assert.equal(captures,1);
    assert.throws(()=>thumbnailPath('../escape','draft'),/Invalid/);
    await assert.rejects(()=>loadDraftThumbnail({...store,exists:async()=>false}, {call:async()=>{throw Error('unavailable');}},'p','job','draft'),/unavailable/);
  });
  await t.test('results have a dedicated tab and history remains usable during generation',()=>{
    const make=source.slice(source.indexOf('  const make ='),source.indexOf('  const myClips ='));
    const results=source.slice(source.indexOf('  const myClips ='));
    assert.doesNotMatch(make,/<DraftResults/);assert.match(results,/<DraftResults/);
    assert.match(results,/value: "results", label: R.myClips, content: myClips/);
    assert.doesNotMatch(results,/onChange=\{setResultSelection\} disabled=\{busy\}/);
    assert.match(source,/if \(made.some\(m=>m\?\.draftId\)\) \{ setResultSelection\(job.id\); setTab\("results"\); \}/);
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
    const assessed=drafts.map((d,i)=>({...d,assessment:i===1?{hook:9,flow:8,payoff:7,reason:'Specific payoff.'}:null}));
    await render({drafts:assessed,visibleDraftId:'unrelated'});
    assert.match(document.querySelector('.clip-result-row').textContent,/Another headline/);
    assert.match(document.body.textContent,/8.0\/10/);assert.match(document.body.textContent,/Specific payoff/);
    assert.match(document.body.textContent,/Unrated/);
    assert.equal(document.querySelectorAll('.clip-result-row').length,3);
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
