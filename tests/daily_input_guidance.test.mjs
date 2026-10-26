import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadPanelModule, disposePanelModule} from './panel_module_fixture.mjs';
import {source, buildDailyFixture} from './daily_font_fixture.mjs';

const plugin = new URL('../plugins/daily-vlog-8/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('plugin.json', plugin), 'utf8'));
const hint = manifest.inputs.find(input => input.id === 'clips').hint;

async function runTemplate(indices) {
  const effects = [], authored = [];
  const resources = Array.from({length: 11}, (_, i) => ({resourceId: 'app' + i, type: 'Video', name: 'clip' + i + '.mp4', durationSeconds: 20}));
  const scriptRows = resources.map((row, i) => ({...row, resourceId: 'r' + i}));
  let finish;
  const outcome = new Promise(resolve => { finish = resolve; });
  const React = {useState: value => [value, () => {}], useRef: value => ({current: value}), useEffect: fn => effects.push(fn), createElement: (type, props) => ({type, props})};
  const bindings = loadPanelModule(source, {
    names: ['DailyTemplateRun', 'castReference'], React,
    overrides: {useAppUpdateGuard: () => {}, buildDailyVlog: async (_sdk, input) => { authored.push(input); return {draftId: 'saved'}; }},
  });
  const sdk = {
    call: async () => resources,
    runScript: async ({script}) => ({result: await vm.runInNewContext('(async()=>{' + script + '})()', {selects: {project: () => ({resources: async () => scriptRows})}})}),
    finishTemplate: finish,
  };
  const pick = i => ({kind: 'video', resourceId: resources[i].resourceId, name: resources[i].name});
  try {
    bindings.DailyTemplateRun({sdk, context: {projectId: 'project', template: {runId: 'run', inputs: {opening: [pick(0)], clips: indices.map(pick)}}}});
    for (const effect of effects) effect();
    const result = await outcome;
    const input = authored[0];
    return {result, input, cast: input && Array.from(bindings.castReference(input.titleId, input.order), row => ({...row}))};
  } finally { disposePanelModule(bindings); }
}

test('input guidance counts distinct clips other than Opening, as the complete template actually does', async () => {
  const enough = await runTemplate([0, 1, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(enough.result.sequenceId, 'saved');
  assert.equal(enough.cast.filter(row => row.id === 'r0').length, 2);
  const short = await runTemplate([0, 1, 1, 2, 3, 4, 5, 6]);
  assert.equal(short.input, undefined);
  assert.match(short.result.error, /seven more clips/i);
  assert.match(hint, /distinct clips other than Opening/i);
  assert.match(hint, /duplicate/i);
});

test('manifest and guidance match seven or eight other clips without an unused ninth', async () => {
  const seven = await runTemplate([1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(Array.from(seven.input.order), ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', null, 'r7']);
  const eight = await runTemplate([8, 7, 6, 5, 4, 3, 2, 1]);
  assert.deepEqual(Array.from(eight.input.order), ['r8', 'r7', 'r6', 'r5', 'r4', 'r3', 'r2', 'r1']);
  const nine = await runTemplate([9, 8, 7, 6, 5, 4, 3, 2, 1]);
  assert.equal(nine.input, undefined);
  assert.match(nine.result.error, /at most eight/i);
  assert.equal(manifest.inputs.find(input => input.id === 'opening').max, 1);
  assert.equal(manifest.inputs.find(input => input.id === 'clips').min, 7);
  assert.equal(manifest.inputs.find(input => input.id === 'clips').max, 8);
  assert.match(hint, /seven.*Opening/i);
  assert.match(hint, /seven or eight distinct/i);
  assert.doesNotMatch(hint, /ninth.*not used|first eight/i);
});

test('install guidance names the fallback actually embedded by the complete builder', async () => {
  const built = await buildDailyFixture(25);
  const opening = built.graphics[0].parameters;
  assert.equal(opening.fontFamily, '"Chelsea Market Pro", "Chelsea Market"');
  assert.match(opening.fontCss, /@font-face\{font-family:"Chelsea Market"/);
  const notes = fs.readFileSync(new URL('INSTALL.md', plugin), 'utf8');
  assert.match(notes, /bundled.*Chelsea Market.*fallback/is);
  assert.doesNotMatch(notes, /falls back to the system['’]s default/i);
  assert.match(notes, /not.*identical.*Pro/is);
});
