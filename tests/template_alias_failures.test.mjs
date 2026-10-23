import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {topLevel} from './windows_host.mjs';

function fixture(plugin, mode) {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../plugins', plugin, 'panel.tsx'), 'utf8');
  const warnings = [];
  const env = vm.createContext({console: {warn: (...args) => warnings.push(args)}});
  vm.runInContext(topLevel(source, 'TEMPLATE_ALIAS_JS') + '\n' + topLevel(source, 'templateAliasFailure') + '\nthis.api={script:TEMPLATE_ALIAS_JS,failure:templateAliasFailure};', env);
  const messages = {
    settings: 'sequence_settings_mismatch: source is 30000/1001; Draft is 24000/1001',
    create: 'The scratch Draft could not be created: storage unavailable',
    read: 'Could not read the scratch Draft clips: request timed out',
    missing: 'Resource missing-id is not in this Project',
  };
  let next = 0;
  const clips = [];
  const project = {meta: async () => ({title: 'Selected Project'}), createDraft: async () => {
    if (mode === 'create') throw Error(messages.create);
    return {meta: async () => ({frameSize: {width: 1920, height: 1080}}), clips: async () => {
      if (mode === 'read') throw Error(messages.read);
      return clips.map(row => ({...row}));
    }, insertResource: async ({resourceId}) => {
      if (mode === 'settings') throw Error(messages.settings);
      if (resourceId === 'missing-id') throw Error(messages.missing);
      clips.push({clipId: ++next, resourceId: resourceId.replace('app-', '')});
    }};
  }};
  const run = files => vm.runInNewContext('(async()=>{' + env.api.script.replace('__CONFIG__', JSON.stringify({projectId: 'project', files, readTitle: true})) + '})()', {selects: {project: () => project}});
  return {run, failure: env.api.failure, warnings, messages};
}

for (const plugin of ['city-weekend-vlog', 'selfie-aesthetic', 'summer-trip', 'the-end-credits']) {
  const good = [{rid: 'app-r1', kind: 'video'}, {rid: 'app-r2', kind: 'video'}];
  test(`${plugin}: healthy selected videos retain their aliases`, async () => {
    const f = fixture(plugin, 'healthy'), result = await f.run(good);
    assert.deepEqual(Array.from(result.resolved, row => row.alias), ['r1', 'r2']);
    assert.equal(result.failed.length, 0);
    assert.equal(f.failure(result.resolved, result.failed), null);
  });
  for (const mode of ['settings', 'create', 'read']) test(`${plugin}: ${mode} failure retains its real cause`, async () => {
    const f = fixture(plugin, mode), result = await f.run(good);
    assert.equal(result.resolved.length, 0);
    assert.equal(result.failed.length, 2);
    assert.ok(result.failed.every(row => row.message === f.messages[mode]));
    assert.equal(f.failure(result.resolved, result.failed), f.messages[mode]);
    assert.equal(f.warnings.length, 1);
  });
  test(`${plugin}: one deliberately missing Resource preserves the available video's existing behavior`, async () => {
    const f = fixture(plugin, 'healthy'), result = await f.run([good[0], {rid: 'missing-id', kind: 'video'}]);
    assert.equal(result.resolved.length, 1);
    assert.equal(result.resolved[0].alias, 'r1');
    assert.equal(result.failed[0].message, f.messages.missing);
    assert.equal(f.failure(result.resolved, result.failed), null);
    assert.equal(f.warnings.length, 1, 'partial failures remain in diagnostics');
  });
  test(`${plugin}: a successful existing retry removes the old failure`, () => {
    const f = fixture(plugin, 'healthy');
    assert.equal(f.failure([{rid: 'app-r1', alias: 'r1'}], [{rid: 'app-r1', message: f.messages.settings}]), null);
    assert.equal(f.warnings.length, 0);
  });
  test(`${plugin}: genuinely missing Resources retain the SDK's missing-resource explanation`, async () => {
    const f = fixture(plugin, 'healthy'), result = await f.run([{rid: 'missing-id', kind: 'video'}]);
    assert.equal(f.failure(result.resolved, result.failed), f.messages.missing);
  });
}
