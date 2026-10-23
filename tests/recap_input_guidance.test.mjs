import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelModule} from './panel_module_fixture.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('../plugins/recap-2026/plugin.json', import.meta.url), 'utf8'));
const source = fs.readFileSync(new URL('../plugins/recap-2026/panel.tsx', import.meta.url), 'utf8');
const [intro, clips] = manifest.inputs;

test('Recap visible input hints explain the actual required count, duration and Apply condition', () => {
  assert.deepEqual(manifest.inputs.map(({id, min, max, minSeconds}) => ({id, min, max, minSeconds})), [
    {id: 'intro', min: 1, max: 1, minSeconds: 8.5},
    {id: 'clips', min: 1, max: 50, minSeconds: 1.7},
  ]);
  for (const [slot, count] of [[intro, '1 intro video'], [clips, '1–50 videos']]) {
    assert.ok(slot.hint.includes(count));
    assert.ok(slot.hint.includes(String(slot.minSeconds)));
    assert.match(slot.hint, /both.*inputs.*Apply|Apply.*both.*inputs/);
    assert.ok(slot.hint.length <= 120, 'The real manifest reader truncates hints at 120 characters');
    assert.equal(slot.requires, undefined, 'No analysis prerequisite is introduced');
    const korean = manifest.localized.ko.inputs[slot.id].hint;
    assert.ok(korean.includes(String(slot.minSeconds)) && korean.includes('Apply'));
    assert.ok(korean.length <= 120);
  }
});

// Run the complete production panel. Only the SDK read, song measurement and
// Draft-authoring boundaries are controlled; all TemplateRun input checks stay real.
async function run(inputs, durations = {}) {
  const effects = [], finished = [], built = [];
  const rows = Object.values(inputs).flat().map(({resourceId}) => ({resourceId,
    durationSeconds: durations[resourceId], name: resourceId + '.mp4', frameSize: {width: 1920, height: 1080}}));
  const React = {useState: x => [x, () => {}], useRef: x => ({current: x}),
    useEffect: fn => effects.push(fn), createElement: () => null};
  const api = loadPanelModule(source, {names: ['TemplateRun'], React,
    globals: {console: {warn() {}}},
    overrides: {scriptResourceIds: async () => new Map(rows.map(x => [x.resourceId, x.resourceId])),
      readPlan: async () => ({introEnd: 8.15, slotCount: 3}),
      buildRecap: async (_sdk, config) => {built.push(config); return {draftId: 'new-draft'};}}});
  api.TemplateRun({sdk: {runScript: async () => ({result: rows}), finishTemplate: result => finished.push(result)},
    context: {projectId: 'p', language: 'en', template: {runId: 'run', inputs}}});
  for (const effect of effects) effect();
  for (let n = 0; !finished.length && n < 20; n++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished.length, 1);
  return {result: JSON.parse(JSON.stringify(finished[0])), built};
}
const pick = id => ({resourceId: id, name: id});

test('Recap real generation requires both inputs and refuses below the declared duration limits', async () => {
  for (const inputs of [{intro: [], clips: []}, {intro: [pick('i')], clips: []}, {intro: [], clips: [pick('c')]}]) {
    const result = await run(inputs, {i: 14.18, c: 2});
    assert.match(result.result.error, /intro and at least one clip/);
    assert.equal(result.built.length, 0);
  }
  for (const [durations, message] of [[{i: 8.4, c: 2}, /intro clip at least 8.5/], [{i: 14.18, c: 1.69}, /shorter than 1.7/]]) {
    const result = await run({intro: [pick('i')], clips: [pick('c')]}, durations);
    assert.match(result.result.error, message);
    assert.equal(result.built.length, 0);
  }
});

test('Recap real generation accepts one valid clip without analysis and preserves repeated cut planning', async () => {
  for (const durations of [{i: 8.5, c: 1.7}, {i: 14.18, c: 2}]) {
    const result = await run({intro: [pick('i')], clips: [pick('c')]}, durations);
    assert.deepEqual(result.result, {sequenceId: 'new-draft'});
    assert.equal(result.built.length, 1);
    assert.deepEqual(Array.from(result.built[0].slots, x => x.resourceId), ['i', 'c', 'c']);
  }
});
