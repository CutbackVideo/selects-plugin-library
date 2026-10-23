import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {loadPanelModule} from './panel_module_fixture.mjs';
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
