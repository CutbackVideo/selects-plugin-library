import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadPanelFunctions} from './windows_host.mjs';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(process.env.GONGJU_GALLERY_PANEL || path.join(root, 'plugins/gongju-gallery/panel.tsx'), 'utf8');

// Run the real mount effect and its read scripts; only the downstream crop/import/build is a spy.
async function runGallery({resourceDuration = 19, treeDuration, probe = async () => '19', reverseTree = false} = {}) {
  const resources = Array.from({length: 15}, (_, i) => ({resourceId: `r${i}`, name: `clip-${i}.mp4`, type: 'Video', durationSeconds: i ? 19 : resourceDuration}));
  const tree = resources.map((r, i) => ({...r, type: 'video', durationSeconds: i ? 19 : treeDuration, path: `/footage/${r.name}`, frameSize: {width: 1080, height: 1440}}));
  if (reverseTree) tree.reverse();
  const appRows = resources.map(r => ({...r, resourceId: `app-${r.resourceId}`}));
  const effects = [], builds = [], probes = [], scripts = [];
  let complete;
  const finished = new Promise(resolve => { complete = resolve; });
  const project = {meta: async () => ({title: 'Duration fixture'}), resources: async () => resources, sourceFiles: async () => ({fileTree: tree})};
  const sdk = {
    call: async name => { assert.equal(name, 'listProjectResources'); return appRows; },
    runScript: async args => {
      assert.equal(args.allowCommit, false, 'preflight is read-only');
      scripts.push(args);
      return {result: await vm.runInNewContext('(async()=>{' + args.script + '})()', {selects: {project: () => project}})};
    },
    finishTemplate: complete,
  };
  const panel = loadPanelFunctions(source.replace('return <small>{status}</small>;', 'return null;'), [
    'CUTS', 'SHOT_COUNT', 'TEMPLATE_FAILED', 'chooseShots', 'mediaScript', 'scriptResourceIds', 'readMediaPages', 'TemplateRun',
  ], {
    __sdk: {media: {runFFprobe: async args => { probes.push(args.at(-1)); return {stdout: await probe(args.at(-1))}; }}},
    React: {useState: v => [v, () => {}], useRef: v => ({current: v}), useEffect: fn => effects.push(fn)},
    useAppUpdateGuard: () => {}, console: {warn: () => {}},
    fixedAudioOf: () => null,
    buildGallery: async (_sdk, cfg) => { builds.push(cfg); return {draftId: 'fixture-draft'}; },
  });
  panel.TemplateRun({sdk, context: {projectId: 'fixture-project', template: {runId: 'run-1', inputs: {clips: appRows}}}});
  for (const effect of effects) effect();
  const result = await finished;
  return {result, builds, probes, scripts};
}

test('a 19-second Resource with no tree duration reaches the build', async () => {
  const {result, builds, probes} = await runGallery({reverseTree: true});
  assert.equal(result.error, undefined);
  assert.equal(result.sequenceId, 'fixture-draft');
  assert.equal(builds.length, 1);
  assert.equal(builds[0].chosen.find(r => r.resourceId === 'r0').durationSeconds, 19);
  assert.equal(probes.length, 0);
});

test('missing Resource and tree durations use the read-only probe', async () => {
  const {result, builds, probes} = await runGallery({resourceDuration: null});
  assert.equal(result.error, undefined);
  assert.equal(builds.length, 1);
  assert.deepEqual(probes, ['/footage/clip-0.mp4']);
});

test('failed duration lookup identifies the file without claiming it is short', async () => {
  const {result, builds} = await runGallery({resourceDuration: null, probe: async () => { throw Error('probe unavailable'); }});
  assert.match(result.error, /clip-0\.mp4/);
  assert.match(result.error, /duration|length/i);
  assert.doesNotMatch(result.error, /shorter/);
  assert.equal(builds.length, 0, 'no crop, import or Draft creation');
});

test('a real 1.2-second Resource is rejected even when the tree says 19 seconds', async () => {
  const {result, builds, probes} = await runGallery({resourceDuration: 1.2, treeDuration: 19, reverseTree: true});
  assert.match(result.error, /clip-0\.mp4.*shorter than 1\.3/);
  assert.equal(builds.length, 0);
  assert.equal(probes.length, 0);
});

test('the exact 1.3-second boundary is eligible', async () => {
  const {result, builds} = await runGallery({resourceDuration: 1.3, treeDuration: 1.3});
  assert.equal(result.error, undefined);
  assert.equal(builds.length, 1);
});
