import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {loadPanelModule,disposePanelModule,panelModuleTimerState} from './panel_module_fixture.mjs';
import {topLevel} from './windows_host.mjs';

test('new transitive helpers load without adding their names to the fixture', () => {
  const source = `
    import React from 'react';
    const suffix = '!';
    function addedDependency(value: number) { return nested(value) + suffix; }
    const nested = (value: number) => String(value * 2);
    function Panel() { return <small>{addedDependency(3)}</small>; }
    export default Panel;
  `;
  const React = {createElement: (tag, props, text) => ({tag, text})};
  assert.deepEqual(loadPanelModule(source, {names:['Panel'], React}).Panel(), {tag:'small', text:'6!'});
  const broken = source.replace('String(value * 2)', "(() => { throw Error('real dependency failed'); })()");
  assert.throws(() => loadPanelModule(broken, {names:['Panel'], React}).Panel(), /real dependency failed/);
});

test('the real Depth helper can gain another dependency without a fixture dependency list', () => {
  const source = fs.readFileSync(new URL('../plugins/depth-type-captions/panel.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('function depthPortraitDraftScript('));
  const expanded = source.replace('function depthPortraitDraftScript(', 'function addedFramingDependency(') +
    '\nfunction depthPortraitDraftScript(pid, sid) { return addedFramingDependency(pid, sid); }\n';
  // Reproduce the former fixture defect: loading just the named function loses
  // the newly introduced dependency, even though the production module is valid.
  assert.throws(() => vm.runInNewContext(topLevel(expanded, 'depthPortraitDraftScript') +
    ';depthPortraitDraftScript("p","d");'), /addedFramingDependency is not defined/);
  const names = ['depthPortraitDraftScript'];
  assert.equal(loadPanelModule(expanded, {names}).depthPortraitDraftScript('p','d'),
    loadPanelModule(source, {names}).depthPortraitDraftScript('p','d'));
});

test('generated module comments can disappear without losing any real local-client dependency', async () => {
  const source = fs.readFileSync(new URL('../plugins/a16z-style-captions/panel.tsx', import.meta.url), 'utf8');
  assert.ok(source.split('// shared/local-client.ts').length > 2, 'regression input has interleaved module sections');
  const withoutBanners = source.replace(/^\/\/ (?:shared|plugins)\/.*$/gm, '');
  const {createPanelLocalClient} = loadPanelModule(withoutBanners, {names:['createPanelLocalClient']});
  const calls = [];
  const files = {
    environment: async () => ({platform:'darwin', homedir:'/test', tempDirectory:'/tmp'}),
    stat: async () => ({size:4, mtimeMs:1, ino:1, isDirectory:false}),
    readRange: async () => ({base64:Buffer.from([1,2,3,4]).toString('base64'), bytesRead:4}),
  };
  const sdk = {runScript: async input => {
    calls.push(input);
    return {result:await new Function('selects', 'return (async()=>{' + input.script + '})()')({files})};
  }};
  const client = await createPanelLocalClient(sdk);
  try {
    const actual = await client.files.fingerprint('/test/original');
    assert.equal(actual.size, 4);
    assert.ok(calls.some(call => call.script.includes('fingerprintTemplateFile')),
      'the interleaved file-observation implementation actually runs');
    assert.ok(calls.every(call => !call.allowCommit));
  } finally { client.dispose(); }
});

test('fixture boundaries cannot silently replace removed declarations or unexpected imports', () => {
  assert.throws(() => loadPanelModule('function run(){}', {names:['run'], overrides:{obsolete:()=>{}}}), /no top-level declaration: obsolete/);
  assert.throws(() => loadPanelModule("import external from 'unexpected'; const value=external();", {names:['value']}), /no module boundary for: unexpected/);
  assert.throws(() => loadPanelModule('function run( {', {names:['run']}), /expected/);
  const {run} = loadPanelModule('const boundary=()=>1; function run(){const boundary=()=>2;return boundary();}',
    {names:['run'], overrides:{boundary:()=>9}});
  assert.equal(run(), 2, 'nested local bindings must retain their real scope');
});

test('a host-boundary override preserves exported function hoisting and async results', async () => {
  const source = `
    const early = boundary(3);
    export function boundary(value: number) { return value; }
    export async function later(value: number) { return value; }
    function run() { return early; }
  `;
  const {run, later} = loadPanelModule(source, {names:['run','later'],
    overrides:{boundary:value=>value*2, later:value=>value+1}});
  assert.equal(run(), 6);
  const result = later(4);
  assert.equal(typeof result.then, 'function');
  assert.equal(await result, 5);
});

test('whole modules have real browser timeout and interval globals without caller patches', async () => {
  const api = loadPanelModule(`
    const events: string[]=[];
    function start(done) {
      const interval=setInterval((value)=>{ events.push(value); clearTimeout(interval); },1,'interval');
      const timeout=setTimeout((value)=>{ events.push(value); done(); },5,'timeout');
      return [interval,timeout];
    }
    function inspect(){return events;}
  `,{names:['start','inspect']});
  try {
    let ids;
    await new Promise(resolve => {ids=api.start(resolve);});
    assert.ok(ids.every(Number.isInteger)); assert.notEqual(ids[0],ids[1]);
    assert.deepEqual([...api.inspect()],['interval','timeout']);
    assert.deepEqual(panelModuleTimerState(api),{disposed:false,timeouts:0,intervals:0});
  } finally { disposePanelModule(api); }
});

function controlledTimers() {
  let next=0; const queued=new Map(), cleared=[];
  return {queued,cleared,backends:{
    setTimeout(fn){const id=++next;queued.set(id,()=>{queued.delete(id);fn();});return id;},
    setInterval(fn){const id=++next;queued.set(id,fn);return id;},
    clearTimeout(id){cleared.push(['timeout',id]);queued.delete(id);},
    clearInterval(id){cleared.push(['interval',id]);queued.delete(id);},
  }};
}

test('browser timer families share numeric IDs and clearing while retaining fake scheduler ownership', () => {
  const clock=controlledTimers();
  const api=loadPanelModule(`
    let calls=0;
    function start(){return [setTimeout(()=>calls++,10),setInterval(()=>calls++,20)];}
    function stop(ids){clearInterval(ids[0]);clearTimeout(ids[1]);}
    function inspect(){return calls;}
  `,{names:['start','stop','inspect'],globals:clock.backends});
  const ids=api.start(),late=[...clock.queued.values()];
  assert.deepEqual([...ids],[1,2]);
  api.stop(ids); for(const callback of late)callback();
  assert.equal(api.inspect(),0);
  assert.deepEqual(clock.cleared,[['timeout',1],['interval',2]]);
  disposePanelModule(api);
});

test('realm disposal clears only its own timers and suppresses already queued late callbacks', () => {
  const clock=controlledTimers(),source=`
    let calls=0;
    function start(){setTimeout(()=>calls++,10);setInterval(()=>calls++,10);}
    function inspect(){return calls;}
  `;
  const a=loadPanelModule(source,{names:['start','inspect'],globals:clock.backends});
  const b=loadPanelModule(source,{names:['start','inspect'],globals:clock.backends});
  a.start();const late=[...clock.queued.values()];b.start();
  disposePanelModule(a);disposePanelModule(a);
  for(const callback of late)callback();
  assert.equal(a.inspect(),0);assert.equal(clock.queued.size,2);
  for(const callback of [...clock.queued.values()])callback();
  assert.equal(b.inspect(),2);
  assert.deepEqual(panelModuleTimerState(a),{disposed:true,timeouts:0,intervals:0});
  assert.throws(()=>a.start(),/realm is disposed/);
  disposePanelModule(b);assert.equal(clock.queued.size,0);
});

test('active timer callbacks retain VM global receiver, arguments, and real failures', () => {
  const clock=controlledTimers(),failure=Error('actual callback failure');
  const api=loadPanelModule(`
    let received;
    function start(){setInterval(function(a,b){received=[this===globalThis,a,b];throw failure;},1,'a',2);}
    function inspect(){return received;}
  `,{names:['start','inspect'],globals:{...clock.backends,failure}});
  try {
    api.start();assert.throws(()=>[...clock.queued.values()][0](),error=>error===failure);
    assert.deepEqual([...api.inspect()],[true,'a',2]);
  } finally {disposePanelModule(api);}
});

test('a whole-module initialization failure disposes its already scheduled timers', () => {
  const clock=controlledTimers();
  assert.throws(()=>loadPanelModule(`setInterval(()=>{},100);setTimeout(()=>{},100);throw Error('init failed');function run(){}`,
    {names:['run'],globals:clock.backends}),/init failed/);
  assert.equal(clock.queued.size,0);
  assert.deepEqual(clock.cleared,[['interval',1],['timeout',2]]);
});

test('mutation: an absent or broken scheduler still fails instead of becoming a silent noop', () => {
  // Deliberately mutate the boundary, not the product: the complete module must
  // expose missing browser capabilities and scheduler failures to its caller.
  assert.throws(()=>loadPanelModule('setInterval(()=>{},10);function run(){}',
    {names:['run'],globals:{setInterval:undefined}}),/not a function/);
  const clock=controlledTimers(),failure=Error('scheduler failed');
  assert.throws(()=>loadPanelModule('setInterval(()=>{},10);function run(){}',
    {names:['run'],globals:{...clock.backends,setInterval:()=>{throw failure;}}}),error=>error===failure);
});
