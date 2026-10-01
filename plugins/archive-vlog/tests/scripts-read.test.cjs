const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
const load = (name, cfg) => new Function('selects', `return (async()=>{${fs.readFileSync(path.join(dir, name), 'utf8').replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);
const resources = [
  { resourceId: 'r0', name: 'a.mov', type: 'Video', hasAnalysis: true, durationSeconds: 20, recording: { recordedAt: '2026-09-26T15:00:00Z' } },
  { resourceId: 'r1', name: 'b.mov', type: 'Video', hasAnalysis: false, durationSeconds: 20 },
  { resourceId: 'r2', name: 'song.mp3', type: 'Audio', hasAnalysis: false },
  { resourceId: 'r3', name: 'c.mov', type: 'Video', hasAnalysis: true, durationSeconds: 12 },
];
const tree = { fileTree: [{ type: 'dir', name: 'x', children: [
  { type: 'video', name: 'a.mov', resourceId: 'r0', path: '/v/a.mov', frameSize: { width: 1920, height: 1080 } },
  { type: 'video', name: 'c.mov', resourceId: 'r3', path: '/v/c.mov', frameSize: { width: 1080, height: 1920 } }] }], fileCount: 2 };
let calls = 0;
const selects = { project: () => ({
  resources: async () => resources,
  sourceFiles: async () => tree,
  resource: rid => ({ searchScenes: async (q) => { calls++; if (rid === 'r3' && calls < 4) return { results: [], error: 'busy' }; return { results: [{ timeSeconds: 4, score: 0.8 }, { timeSeconds: 11, score: 0.6 }], error: null }; } }),
}) };
// Atomics.waitAsync (search.js's backoff timer) does not keep node's event loop alive on its own.
const keepAlive = setInterval(() => {}, 50);
(async () => {
  const inv = await load('inventory.js', { projectId: 'p', only: null })(selects);
  assert.deepEqual(inv.resources.map(r => [r.rid, r.width, r.height, r.duration]), [['r0', 1920, 1080, 20], ['r3', 1080, 1920, 12]]);
  assert.equal(inv.resources[0].recordedAt, '2026-09-26T15:00:00Z');
  assert.equal(inv.skipped.unanalysed, 1);
  // No recording-year summary: the title's @year is the current year (panel.tsx avCurrentYear()), never footage dates.
  assert.ok(!('latestYear' in inv), 'inventory has no latestYear');
  const only = await load('inventory.js', { projectId: 'p', only: ['r3'] })(selects);
  assert.deepEqual(only.resources.map(r => r.rid), ['r3']);
  const s = await load('search.js', { projectId: 'p', rids: ['r0', 'r3'], queries: { street: 'q1', park: 'q2' }, pageSize: 4 })(selects);
  assert.equal(s.failed.length, 0, 'retried busy rid');
  assert.equal(s.candidates.length, 8);
  assert.deepEqual(Object.keys(s.candidates[0]).sort(), ['rid', 'role', 'score', 't']);
  assert.equal(s.stats.waitedMs, 1000, 'one retry pass after a 1 s pause');

  // Photos: Image resources come back with kind 'photo', respecting `only`; sourceFiles has no size for them, so an
  // unsaved scratch Draft measures each (it adopts the photo's size); known sizes are reused and nothing is committed.
  const res2 = resources.concat([
    { resourceId: 'r4', name: 'IMG_1.jpeg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0, recording: { recordedAt: '2026-09-27T10:00:00Z' } },
    { resourceId: 'r5', name: 'IMG_2.jpeg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0 }]);
  const tree2 = { fileTree: tree.fileTree.concat([{ type: 'video', name: 'IMG_1.jpeg', resourceId: 'r4', path: '/p/1.jpeg', hasTimecode: false }, { type: 'video', name: 'IMG_2.jpeg', resourceId: 'r5', path: '/p/2.jpeg', hasTimecode: false }]) };
  const drafts = [];
  const sel2 = { project: () => ({ resources: async () => res2, sourceFiles: async () => tree2, createDraft: async ({ name }) => {
    let fs = { width: 1920, height: 1080 }; const d = { name, committed: false, meta: async () => ({ fps: 30, frameSize: fs }),
      insertResource: async ({ resourceId, sourceRange }) => { assert.ok(sourceRange.endSeconds <= 5); fs = resourceId === 'r4' ? { width: 898, height: 898 } : { width: 2268, height: 4032 }; },
      commitAll: async () => { d.committed = true; } };
    drafts.push(d); return d; } }) };
  const inv2 = await load('inventory.js', { projectId: 'p', only: null })(sel2);
  assert.deepEqual(inv2.resources.map(r => [r.rid, r.kind]), [['r0', 'video'], ['r3', 'video']]);
  assert.deepEqual(inv2.photos, [
    { rid: 'r4', name: 'IMG_1.jpeg', width: 898, height: 898, recordedAt: '2026-09-27T10:00:00Z', kind: 'photo' },
    { rid: 'r5', name: 'IMG_2.jpeg', width: 2268, height: 4032, recordedAt: null, kind: 'photo' }]);
  assert.equal(inv2.skipped.unanalysed, 1, 'photos never count as unanalysed');
  assert.ok(!('latestYear' in inv2), 'no latestYear with photos either');
  assert.equal(drafts.length, 2);
  assert.ok(drafts.every(d => !d.committed), 'scratch Drafts are not committed');
  const inv3 = await load('inventory.js', { projectId: 'p', only: ['r5'], known: { r5: { width: 10, height: 20 } } })(sel2);
  assert.deepEqual(inv3.photos.map(r => [r.rid, r.width, r.height]), [['r5', 10, 20]]);
  assert.equal(inv3.resources.length, 0);
  assert.equal(drafts.length, 2, 'a known size is not measured again');
  const inv4 = await load('inventory.js', { projectId: 'p', only: null, measureMs: 0 })(sel2);
  assert.deepEqual(inv4.photos.map(r => r.width), [null, null], 'no measuring past the budget');

  assert.equal(inv.incomplete, false, 'a fully loaded Project is complete');

  // A Project still loading (right after an app restart): the SDK's sourceFiles() formatter throws on a missing file
  // tree ("Cannot read properties of undefined (reading 'reduce')"), resources() may come back empty-handed, and
  // resource fields may be missing. The inventory is partial and flagged `incomplete`, never a throw.
  const sfThrows = async () => { throw new TypeError("Cannot read properties of undefined (reading 'reduce')"); };
  const selL = (o) => ({ project: () => ({ resources: async () => resources, sourceFiles: async () => tree, ...o }) });
  const invT = await load('inventory.js', { projectId: 'p', only: null })(selL({ sourceFiles: sfThrows }));
  assert.equal(invT.incomplete, true, 'sourceFiles throwing -> incomplete');
  assert.deepEqual(invT.resources.map(r => [r.rid, r.width, r.height]), [['r0', null, null], ['r3', null, null]], 'videos without sizes');
  // Defensive: the real SDK throws on an undefined tree or a dir without children (covered by sfThrows above); these
  // shapes guard inventory.js's own walk in case a future SDK passes them through.
  const invU = await load('inventory.js', { projectId: 'p', only: null })(selL({ sourceFiles: async () => undefined }));
  assert.equal(invU.incomplete, true, 'sourceFiles undefined -> incomplete');
  assert.equal(invU.resources.length, 2);
  const invD = await load('inventory.js', { projectId: 'p', only: null })(selL({ sourceFiles: async () => ({ fileTree: [{ type: 'dir', name: 'x' }, null, { resourceId: 'r0', frameSize: { width: 1920, height: 1080 } }] }) }));
  assert.equal(invD.incomplete, false, 'a dir without children is just empty');
  assert.deepEqual(invD.resources.map(r => r.width), [1920, null]);
  const invF = await load('inventory.js', { projectId: 'p', only: null })(selL({ sourceFiles: async (o) => { if (!o) return { folders: [{ name: 'a' }, { name: 'b' }, null] }; if (o.folder === 'a') throw Error('Folder not found: a'); return { fileTree: tree.fileTree }; } }));
  assert.equal(invF.incomplete, true, 'one folder failing -> incomplete, the others still read');
  assert.deepEqual(invF.resources.map(r => r.width), [1920, 1080]);
  const invR = await load('inventory.js', { projectId: 'p', only: null })(selL({ resources: async () => undefined }));
  assert.equal(invR.incomplete, true, 'resources undefined -> incomplete');
  assert.deepEqual([invR.resources, invR.photos], [[], []]);
  const invO = await load('inventory.js', { projectId: 'p', only: null })(selL({ resources: async () => ({ items: resources }) }));
  assert.equal(invO.incomplete, true, 'resources not an array -> incomplete');
  const partial = [null, 'junk', { type: 'Video' }, { resourceId: 'q0', type: 'Video', hasAnalysis: true, durationSeconds: 8 },
    { resourceId: 'q1', type: 'Video', hasAnalysis: true, durationSeconds: 'x', recording: null }, { resourceId: 'q2', type: 'Image', recording: {} }];
  const invQ = await load('inventory.js', { projectId: 'p', only: null, measureMs: 0 })(selL({ resources: async () => partial, sourceFiles: async () => ({ fileTree: [] }) }));
  assert.deepEqual(invQ.resources, [{ rid: 'q0', name: 'q0', duration: 8, width: null, height: null, recordedAt: null, kind: 'video' }], 'missing name and recording');
  assert.equal(invQ.skipped.missing, 1, 'a non-numeric duration counts as missing');
  assert.deepEqual(invQ.photos, [{ rid: 'q2', name: 'q2', width: null, height: null, recordedAt: null, kind: 'photo' }]);
  assert.equal(invQ.incomplete, false, 'malformed entries are dropped, not a loading Project');
  // resources() itself failing still throws: with nothing read, the panel retries instead of showing an empty Project.
  await assert.rejects(load('inventory.js', { projectId: 'p', only: null })(selL({ resources: async () => { throw Error('bridge not ready'); } })), /bridge not ready/);

  // Scene search: rate_limited errors back off 1 s, then 2 s; at most 4 searches are in flight.
  let inFlight = 0, peak = 0, tries = 0;
  const sel3 = { project: () => ({ resource: rid => ({ searchScenes: async () => {
    inFlight++; peak = Math.max(peak, inFlight); const n = ++tries;
    await new Promise(r => setTimeout(r, 5)); inFlight--;
    if (n <= 30) throw Error('AxiosError: rate_limited');
    return { results: [{ timeSeconds: 1, score: 0.5 }], error: null };
  } }) }) };
  const s3 = await load('search.js', { projectId: 'p', rids: ['a', 'b', 'c', 'd'], queries: { q1: '1', q2: '2', q3: '3', q4: '4', q5: '5', q6: '6', q7: '7' }, pageSize: 4 })(sel3);
  assert.equal(peak, 4, 'four in flight');
  assert.equal(s3.failed.length, 0);
  assert.equal(s3.candidates.length, 28);
  assert.equal(s3.stats.rateLimited, 30);
  assert.equal(s3.stats.waitedMs, 3000, '1 s then 2 s');
  // A pause that would pass the budget is skipped and the rest is reported as failed.
  tries = 0;
  const s4 = await load('search.js', { projectId: 'p', rids: ['a', 'b'], queries: { q1: '1' }, pageSize: 4, budgetMs: 500 })(sel3);
  assert.deepEqual(s4.failed.sort(), ['a', 'b']);
  assert.equal(s4.stats.waitedMs, 0);
  // Unanalysed videos by status: being analysed, never started, failed. The panel never starts analysis itself.
  const v = (id, status) => ({ resourceId: id, name: id + '.mov', type: 'Video', hasAnalysis: false, status, durationSeconds: 10 });
  const mixed = [resources[0], v('s1', 'sampling'), v('s2', 'samplingSucceeded'), v('s3', 'analyzing'), v('s4', 'samplingFailed'), v('s5', 'analyzingFailed'),
    v('q1', 'pending'), v('q2', 'pending'), v('q3', 'pending'), v('u1', undefined)];
  let wfCalls = 0;
  const withWf = wf => ({ project: () => ({ resources: async () => mixed, sourceFiles: async () => tree,
    workflows: async (f) => { wfCalls++; assert.equal(f, undefined, 'one unfiltered read'); if (wf instanceof Error) throw wf; return wf; } }) });
  const split = inv => { const { unanalysed, analysing, notAnalysed, failed, statusKnown } = inv.skipped;
    assert.equal(analysing + notAnalysed + failed, unanalysed, 'the split adds up'); return { unanalysed, analysing, notAnalysed, failed, statusKnown }; };
  // No workflows: pending clips were never started.
  assert.deepEqual(split(await load('inventory.js', { projectId: 'p', only: null })(withWf([]))),
    { unanalysed: 9, analysing: 3, notAnalysed: 4, failed: 2, statusKnown: true });
  assert.equal(wfCalls, 1, 'workflows() is read once');
  // A queued or running analyze-resource workflow makes its pending clip "being analysed"; finished ones do not.
  assert.deepEqual(split(await load('inventory.js', { projectId: 'p', only: null })(withWf([
    { workflowId: 'w1', type: 'project:analyze-resource', status: 'queued', resourceId: 'q1' },
    { workflowId: 'w2', type: 'project:analyze-resource', status: 'running', resourceId: 'q2' },
    { workflowId: 'w3', type: 'project:analyze-resource', status: 'failed', resourceId: 'q3' },
    { workflowId: 'w4', type: 'project:create', status: 'succeeded', extra: { done: 3, failed: 0, total: 3, failures: [] } }]))),
    { unanalysed: 9, analysing: 5, notAnalysed: 2, failed: 2, statusKnown: true });
  // A running project:create fan-out: every pending clip is being analysed.
  assert.deepEqual(split(await load('inventory.js', { projectId: 'p', only: null })(withWf([
    { workflowId: 'w5', type: 'project:create', status: 'running', extra: { done: 1, failed: 0, total: 4, failures: [] } }]))),
    { unanalysed: 9, analysing: 6, notAnalysed: 1, failed: 2, statusKnown: true });
  // workflows() fails: pending clips count as not analysed, and the status is marked unknown.
  const failedRead = await load('inventory.js', { projectId: 'p', only: null })(withWf(new Error('boom')));
  assert.deepEqual(split(failedRead), { unanalysed: 9, analysing: 3, notAnalysed: 4, failed: 2, statusKnown: false });
  assert.equal(failedRead.incomplete, false, 'a failed workflows() read never marks the inventory incomplete');
  // A malformed workflows() reply (the Project still loading) is a failed read too, not an incomplete inventory.
  const odd = await load('inventory.js', { projectId: 'p', only: null })(withWf(undefined));
  assert.deepEqual(split(odd), { unanalysed: 9, analysing: 3, notAnalysed: 4, failed: 2, statusKnown: false });
  assert.equal(odd.incomplete, false, 'a malformed workflows() reply never marks the inventory incomplete');
  assert.deepEqual(split(await load('inventory.js', { projectId: 'p', only: null })(withWf([null, 'x', { type: 'project:analyze-resource', status: 'running', resourceId: 'q1' }]))),
    { unanalysed: 9, analysing: 4, notAnalysed: 3, failed: 2, statusKnown: true }, 'malformed entries are skipped');
  // Nothing pending: workflows() is not read at all.
  wfCalls = 0;
  const done = { project: () => ({ resources: async () => [resources[0], v('s1', 'analyzing')], sourceFiles: async () => tree, workflows: async () => { wfCalls++; return []; } }) };
  assert.deepEqual(split(await load('inventory.js', { projectId: 'p', only: null })(done)), { unanalysed: 1, analysing: 1, notAnalysed: 0, failed: 0, statusKnown: true });
  assert.equal(wfCalls, 0, 'no workflows() read without a pending clip');

  // ensure-audio.js: the cue's path matches the host's stored path after normalising (NFC, backslashes as slashes,
  // case-folded), else by file name; only a cue the Project lacks is imported.
  const audioProject = (stored, name) => {
    const imports = [];
    return { imports, sel: { project: () => ({
      sourceFiles: async () => ({ fileTree: [{ type: 'dir', name: 'cues', children: [{ type: 'audio', name, resourceId: 'a1', path: stored }] }] }),
      resources: async () => [{ resourceId: 'v1', type: 'Video', name: 'x.mov' }, { resourceId: 'a1', type: 'Audio', name }],
      importFiles: async ({ paths }) => { imports.push(...paths); return { addedResourceIds: ['a9'] }; },
    }) } };
  };
  const winCue = 'D:\\Data\\AppData\\Selects\\skills\\archive-vlog\\assets\\cues\\peaceful-drift.mp3';
  {
    // Windows: the panel joins with backslashes, the host stored forward slashes and another drive-letter case.
    const a = audioProject('d:/data/AppData/Selects/skills/archive-vlog/assets/cues/peaceful-drift.mp3', 'peaceful-drift.mp3');
    assert.deepEqual(await load('ensure-audio.js', { projectId: 'p', path: winCue })(a.sel), { resourceId: 'a1', imported: false });
    assert.deepEqual(a.imports, []);
  }
  {
    // A Korean file name stored decomposed (NFD, macOS) matches the composed (NFC) path the panel builds.
    const ko = '\uac00\ub098\ub2e4.mp3';
    const a = audioProject('/x/cues/' + ko.normalize('NFD'), ko.normalize('NFD'));
    assert.deepEqual(await load('ensure-audio.js', { projectId: 'p', path: '/x/cues/' + ko })(a.sel), { resourceId: 'a1', imported: false });
  }
  {
    // Same cue file in another folder (the plugin moved): matched by its file name.
    const a = audioProject('/old/place/peaceful-drift.mp3', 'peaceful-drift.mp3');
    assert.deepEqual(await load('ensure-audio.js', { projectId: 'p', path: winCue })(a.sel), { resourceId: 'a1', imported: false });
  }
  {
    // Not in the Project: imported once, with the panel's path unchanged.
    const a = audioProject('/x/cues/fractured.mp3', 'fractured.mp3');
    assert.deepEqual(await load('ensure-audio.js', { projectId: 'p', path: winCue })(a.sel), { resourceId: 'a9', imported: true });
    assert.deepEqual(a.imports, [winCue]);
  }

  clearInterval(keepAlive);
  console.log(JSON.stringify({ scriptsRead: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
