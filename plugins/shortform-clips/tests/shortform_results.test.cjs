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
  const code = dep('esbuild').transformSync(source + '\nexport {DraftResults,ClipRunProgress,RESULT_STRINGS,latestDraftResult,savedDraftResults,resultJobLabel,clipAssessment,rankDrafts,readDraftThumbnail,loadDraftThumbnail,thumbnailPath,CLIP_SCORE_PROMPT};', {loader:'tsx',format:'cjs'}).code;
  const mod = {exports:{}};
  new Function('require','module','exports',code)(() => React, mod, mod.exports);
  const {DraftResults, ClipRunProgress, RESULT_STRINGS, latestDraftResult,savedDraftResults,resultJobLabel,clipAssessment,rankDrafts,readDraftThumbnail,loadDraftThumbnail,thumbnailPath,CLIP_SCORE_PROMPT} = mod.exports;

  await t.test('short project videos remain visible and selected through metadata refreshes', () => {
    const selectionEnd = source.indexOf('  }, [resources]);');
    const selectionStart = source.lastIndexOf('  React.useEffect(() => {', selectionEnd);
    const selection = source.slice(selectionStart, selectionEnd + '  }, [resources]);'.length);
    const optionsStart = source.indexOf('  const videoOptions =');
    const options = source.slice(optionsStart, source.indexOf('  const history=', optionsStart));
    const picker = new Function('resources', 'pick', 'S', `
      const React = {useEffect: fn => fn()}, setPick = value => {pick = value;};
      ${selection}
      ${options}
      return {pick, options: videoOptions};
    `);
    const S = {seconds: n => `${n}s`, minutes: n => `${n} min`, notAnalyzed: 'Not analyzed'};
    const short = {id:'short', name:'interview.MOV', sec:40, transcribed:true};
    const long = {id:'long', name:'episode.mp4', sec:600, analyzed:true};
    const pending = {id:'pending', name:'importing.mov', sec:0};
    assert.deepEqual(picker([short], null, S), {pick:'short', options:[{value:'short', label:'interview.MOV · 40s'}]});
    const refreshed = picker([short, long, pending], 'short', S);
    assert.equal(refreshed.pick, 'short');
    assert.deepEqual(refreshed.options.map(o => o.value), ['short','long','pending']);
    assert.equal(refreshed.options[2].label, 'importing.mov · Not analyzed');
    assert.equal(picker([short, long, pending], 'pending', S).pick, 'pending');
    assert.equal(picker([{...pending,sec:40,transcribed:true}], 'pending', S).pick, 'pending');
    assert.equal(picker([short, long], 'removed', S).pick, null);
    assert.equal(picker([], 'short', S).pick, null);
  });

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
  });

  await t.test('first successful saved clip reveals results once and subsequent saves stream without stealing navigation',async()=>{
    const start=source.indexOf('    let revealedResults = false;');
    const chunk=source.slice(start,source.indexOf('    try {',start));
    const compiled=dep('esbuild').transformSync(chunk,{loader:'ts'}).code;
    const events=[],saved=[],scope={current:'project'};let rows=[];
    const env={clone:x=>JSON.parse(JSON.stringify(x)),setRunInfo:()=>{},saveJob:async j=>saved.push(j),resultProject:scope,
      setResultJobs:f=>rows=f(rows),savedDraftResults,setResultSelection:id=>events.push(['selection',id]),setTab:tab=>events.push(['tab',tab])};
    const create=new Function('env','initial',`const {clone,setRunInfo,saveJob,resultProject,setResultJobs,savedDraftResults,setResultSelection,setTab}=env;let job=initial;${compiled};return persist;`);
    const persist=create(env,{id:'job',projectId:'project'});
    await persist({built:[{error:'failed'}]});assert.deepEqual(events,[]);
    await persist({built:[{error:'failed'},{draftId:'one'}]});
    assert.deepEqual(events,[['selection','job'],['tab','results']]);assert.equal(saved.length,2);
    await persist({built:[{error:'failed'},{draftId:'one',thumbnailPath:'preview.jpg'},{draftId:'two'}]});
    await persist({done:true});assert.equal(events.length,2);assert.equal(rows[0].built.length,3);
    scope.current='other';await create(env,{id:'other-run',projectId:'project'})({built:[{draftId:'three'}]});assert.equal(events.length,2);
    scope.current='project';await assert.rejects(()=>create({...env,saveJob:async()=>{throw Error('disk failed');}},{id:'bad',projectId:'project'})({built:[{draftId:'four'}]}),/disk failed/);assert.equal(events.length,2);
    const end=source.slice(source.indexOf('      const allBuilt ='),source.indexOf('  function cancelRun()'));
    assert.doesNotMatch(end,/setTab|setResultSelection/);
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
    Progress: ({value,label}) => e('div',{role:'progressbar','aria-valuenow':value},label),
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
  const button = label => buttons().find(b=>b.getAttribute('aria-label')===label || b.textContent===label);
  const render = async extra => act(async()=>root.render(e(DraftResults,{...props,...extra})));
  const click = async label => act(async()=>button(label).click());
  await t.test('live progress reports completed clips, supports cancellation, and disappears when finished',async()=>{
    let cancelled=0;
    const progress={ui,S:{steps:['Import','Transcribe','Identify','Choose','Build'],thisRun:'Work in progress',cancel:'Cancel',cancelling:'Cancelling'},R:RESULT_STRINGS.en,
      job:{title:'Interview',choice:{clips:[{},{},{}]},built:[{draftId:'one'},{error:'failed'}]},busy:true,step:4,sub:0,statusLine:'Building clip 2',cancelling:false,onCancel:()=>cancelled++};
    await act(async()=>root.render(e(ClipRunProgress,progress)));
    assert.equal(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),String(1/3));assert.match(document.body.textContent,/1\/3 clips created/);
    await click('Cancel');assert.equal(cancelled,1);
    await act(async()=>root.render(e(ClipRunProgress,{...progress,cancelling:true})));
    assert.equal(button('Cancelling').disabled,true);
    await act(async()=>root.render(e(ClipRunProgress,{...progress,job:{...progress.job,built:[{draftId:'one'},{draftId:'two'}]}})));
    assert.match(document.body.textContent,/2\/3 clips created/);
    await act(async()=>root.render(e(ClipRunProgress,{...progress,busy:false})));
    assert.equal(document.querySelector('[role="progressbar"]'),null);
  });
  try {
    await render({visibleDraftId:'a'});
    assert.match(document.body.textContent,/2 clips created/);
    assert.equal(button('Currently viewing').disabled,true);
    assert.equal(button('Currently viewing').getAttribute('aria-current'),'true');
    assert.match(button('Currently viewing').textContent,/Viewing/);
    assert.equal(button('Open').className,'clip-thumbnail-button');
    assert.equal(document.querySelector('.clip-result-actions button[aria-label="Open"]'),null);
    assert.ok(button('Open').querySelector('.clip-result-thumbnail'));
    assert.ok(button('Open').querySelector('.clip-thumbnail-open'));
    assert.match(document.querySelector('style').textContent,/:focus-visible.*clip-thumbnail-open/);
    assert.equal(button('Show more') != null,true);
    assert.equal(button('Show more').style.textDecoration,'underline');
    assert.equal(button('Show more').getAttribute('aria-expanded'),'false');
    assert.match(document.body.textContent,/AI score/);
    assert.equal(RESULT_STRINGS.ko.score,'AI \uc810\uc218');
    assert.equal(buttons().filter(b=>b.textContent==='Show more').length,1,'Short descriptions need no toggle');
    assert.match(document.body.textContent,/Keep the explanation even on failure/);
    assert.equal(document.querySelectorAll('[data-tone="error"]').length,1);
    const description = [...document.querySelectorAll('small')].find(n=>n.textContent===drafts[0].why);
    assert.equal(description.style.webkitLineClamp,'3');
    await click('Show more');
    assert.equal(button('Show less'),undefined);
    assert.equal(button('Show more'),undefined);
    assert.equal(description.style.webkitLineClamp,'');
    assert.equal(description.textContent,drafts[0].why);
    await render({visibleDraftId:'a'});
    assert.equal(description.style.webkitLineClamp,'','Expanded descriptions stay open across updates');
    await click('Open');
    assert.deepEqual(opened,['b']);
    await render({visibleDraftId:'b'});
    assert.match(button('Currently viewing').closest('.clip-result-row').textContent,/Another headline/);
    await render({visibleDraftId:'unrelated'});
    assert.equal(button('Currently viewing'),undefined);
    assert.equal(buttons().filter(b=>b.getAttribute('aria-label')==='Open').length,2);
    await render({visibleDraftId:'unrelated',opening:'b'});
    assert.equal(buttons().filter(b=>b.getAttribute('aria-label')==='Open' && b.disabled).length,2);
    assert.equal(document.querySelector('[data-opening="true"]').getAttribute('aria-busy'),'true');
    assert.match(document.querySelector('[data-opening="true"]').textContent,/Opening/);
    assert.equal(button('Details'),undefined);
    assert.doesNotMatch(document.body.textContent,/Full recommendation|Check the crop/);
    const assessed=drafts.map((d,i)=>({...d,assessment:i===1?{hook:9,flow:8,payoff:7,reason:'Specific payoff.'}:null}));
    await render({drafts:assessed,visibleDraftId:'unrelated'});
    assert.match(document.querySelector('.clip-result-row').textContent,/Another headline/);
    assert.match(document.body.textContent,/8.0\/10/);
    assert.equal(document.querySelector('.clip-result-row details'),null);
    assert.equal(document.querySelector('[role="tooltip"]'),null);
    const scoreInfo=document.querySelector('button[aria-label="Why this score"]');
    await act(async()=>scoreInfo.dispatchEvent(new dom.window.MouseEvent('mouseover',{bubbles:true})));
    const tooltip=document.querySelector('[role="tooltip"]');
    assert.equal(tooltip.textContent,'Specific payoff.');
    const breakdown=document.querySelector('.clip-score-breakdown');
    assert.deepEqual([...breakdown.querySelectorAll('dt')].map(n=>n.textContent),['Hook','Flow','Payoff']);
    assert.deepEqual([...breakdown.querySelectorAll('dd')].map(n=>n.textContent),['9','8','7']);
    assert.match(tooltip.textContent,/Specific payoff/);
    assert.equal(scoreInfo.getAttribute('aria-describedby'),tooltip.id);
    await act(async()=>scoreInfo.parentElement.dispatchEvent(new dom.window.MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body})));
    assert.equal(document.querySelector('[role="tooltip"]'),null);
    await act(async()=>scoreInfo.focus());
    assert.ok(document.querySelector('[role="tooltip"]'),'Keyboard focus reveals the same explanation');
    await act(async()=>scoreInfo.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    assert.equal(document.querySelector('[role="tooltip"]'),null);
    assert.match(document.body.textContent,/Unrated/);
    assert.equal(document.querySelectorAll('.clip-result-row').length,3);
    await act(async()=>root.render(null));
    await render({drafts:assessed,visibleDraftId:'unrelated'});
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
