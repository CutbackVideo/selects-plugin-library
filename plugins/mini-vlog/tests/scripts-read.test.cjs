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
  // r1 is unanalysed and sourceFiles() has no file for it: it cannot be used yet.
  assert.equal(inv.skipped.unanalysed, 1);
  assert.equal(inv.skipped.notAnalysed, 0);
  // No recording-year summary: the title's @year is the current year (panel.tsx mvCurrentYear()), never footage dates.
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
  assert.deepEqual(invQ.resources, [{ rid: 'q0', name: 'q0', duration: 8, width: null, height: null, recordedAt: null, kind: 'video', analysed: true, status: null, path: null }], 'missing name and recording');
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
  // Analysis is optional (build without analysis): a video is usable once it has a length and a source file that
  // sourceFiles() resolves, whatever its status (clips imported without analysis stay 'pending'). Usable videos without
  // analysis come back with analysed: false and their path (the panel's quick local check); skipped.notAnalysed counts
  // them. skipped.unanalysed counts only videos that cannot be used yet (no length, or no file) -- the Clip highlights
  // template reads it for its "not analyzed yet" sentence, so it must never count a usable clip.
  const v = (id, extra) => ({ resourceId: id, name: id + '.mov', type: 'Video', hasAnalysis: false, status: 'pending', durationSeconds: 10, ...extra });
  const node = (id) => ({ type: 'video', name: id + '.mov', resourceId: id, path: '/v/' + id + '.mov', frameSize: { width: 1280, height: 720 } });
  const noA = [resources[0], v('u1'), v('u2', { status: 'sampling' }), v('u3', { status: 'analyzingFailed' }), v('z0', { durationSeconds: 0 }),
    v('z1', { durationSeconds: undefined }), v('nf'), { resourceId: 'a0', type: 'Video', hasAnalysis: true, durationSeconds: 0 }];
  let wfCalls = 0;
  const noTree = { fileTree: [{ type: 'dir', name: 'x', children: [tree.fileTree[0].children[0], node('u1'), node('u2'), node('u3'), node('z0'), node('z1')] }] };
  const selNA = (o) => ({ project: () => ({ resources: async () => noA, sourceFiles: async () => noTree, workflows: async () => { wfCalls++; return []; }, ...o }) });
  const invNA = await load('inventory.js', { projectId: 'p', only: null })(selNA());
  assert.deepEqual(invNA.resources.map(r => [r.rid, r.analysed, r.path, r.duration, r.status]), [
    ['r0', true, '/v/a.mov', 20, null], ['u1', false, '/v/u1.mov', 10, 'pending'], ['u2', false, '/v/u2.mov', 10, 'sampling'], ['u3', false, '/v/u3.mov', 10, 'analyzingFailed']],
    'pending, sampling and failed clips with a length and a file are usable; status is information only');
  assert.deepEqual([invNA.resources[1].width, invNA.resources[1].height], [1280, 720], 'an unanalysed clip keeps its frame size');
  assert.deepEqual(invNA.skipped, { unanalysed: 3, missing: 1, notAnalysed: 3 }, 'no length (2) or no file (1) cannot be used yet; an analysed clip without a length is missing');
  assert.equal(wfCalls, 0, 'no workflows() read: analysis status no longer decides anything');
  assert.equal(invNA.incomplete, false);
  // Only the handed clips (the template's `only`): an unanalysed clip is included like an analysed one.
  const onlyNA = await load('inventory.js', { projectId: 'p', only: ['u1', 'z0'] })(selNA());
  assert.deepEqual(onlyNA.resources.map(r => r.rid), ['u1']);
  assert.deepEqual(onlyNA.skipped, { unanalysed: 1, missing: 0, notAnalysed: 1 });
  // A Project still loading (sourceFiles throws): no paths are known, so unanalysed clips cannot be checked yet and wait
  // with the incomplete inventory (the panel holds Build and re-reads); analysed clips stay in without sizes.
  const loadingNA = await load('inventory.js', { projectId: 'p', only: null })(selNA({ sourceFiles: sfThrows }));
  assert.equal(loadingNA.incomplete, true);
  assert.deepEqual(loadingNA.resources.map(r => r.rid), ['r0']);
  assert.deepEqual(loadingNA.skipped, { unanalysed: 6, missing: 1, notAnalysed: 0 });
  // A synced-sequence member is left out whether or not it is analysed.
  const synced = [{ resourceId: 's0', type: 'Video', hasAnalysis: false, durationSeconds: 9 }, v('s1', { owningSyncedSequenceResourceId: 's0' })];
  const invS = await load('inventory.js', { projectId: 'p', only: null })({ project: () => ({ resources: async () => synced, sourceFiles: async () => ({ fileTree: [node('s0'), node('s1')] }) }) });
  assert.deepEqual(invS.resources.map(r => r.rid), ['s0']);
  assert.deepEqual(invS.skipped, { unanalysed: 0, missing: 0, notAnalysed: 1 });

  // Scene search needs analysis. Called with every handed rid (the Clip highlights template does that), search.js
  // reads resources() once, never searches a clip without analysis and gives it evenly spaced candidates instead
  // (role 'local', one a second with the first window from 0.5 s, at the bottom of this call's score range), so a template run still builds
  // from unanalysed clips. The panel and the driver pass analysed rids only with checkAnalysis: false (no extra read).
  let searched = [];
  const selS = (res) => ({ project: () => ({ resources: async () => res, resource: rid => ({ searchScenes: async (q) => { searched.push(rid); return { results: [{ timeSeconds: 3, score: 0.3 }, { timeSeconds: 7, score: 0.26 }], error: null }; } }) }) });
  const mixRes = [{ resourceId: 'a', type: 'Video', hasAnalysis: true, durationSeconds: 12 }, { resourceId: 'b', type: 'Video', hasAnalysis: false, status: 'pending', durationSeconds: 4.2 }];
  const sm = await load('search.js', { projectId: 'p', rids: ['a', 'b'], queries: { street: 'q1', park: 'q2' }, pageSize: 4 })(selS(mixRes));
  assert.deepEqual([...new Set(searched)], ['a'], 'the unanalysed clip is not searched');
  const loc = sm.candidates.filter(c => c.rid === 'b');
  assert.deepEqual(loc.map(c => [c.role, c.t]), [['local', 1.2], ['local', 2.2], ['local', 3.2]], 'one a second from 1.2 s (first window from 0.5 s), half a second clear of the end');
  assert.ok(loc.every(c => c.score === 0.26), 'at the bottom of the searched scores');
  assert.deepEqual(Object.keys(loc[0]).sort(), ['rid', 'role', 'score', 't'], 'the same keys as a scene-search hit');
  assert.deepEqual(sm.local, ['b']);
  assert.equal(sm.failed.length, 0);
  // Only unanalysed clips: nothing is searched, the default score is used.
  searched = [];
  const so = await load('search.js', { projectId: 'p', rids: ['b'], queries: { street: 'q1' }, pageSize: 4 })(selS(mixRes));
  assert.deepEqual(searched, []);
  assert.ok(so.candidates.length === 3 && so.candidates.every(c => c.score === 0.25));
  // No hasAnalysis flag at all counts as not analysed (the same meaning as inventory.js).
  searched = [];
  const sn = await load('search.js', { projectId: 'p', rids: ['n'], queries: { street: 'q1' }, pageSize: 4 })(selS([{ resourceId: 'n', type: 'Video', durationSeconds: 4.2 }]));
  assert.deepEqual(searched, []); assert.deepEqual(sn.local, ['n']);
  // A long clip: at most 24 windows, spread over the clip.
  const longRes = [{ resourceId: 'L', type: 'Video', hasAnalysis: false, durationSeconds: 100 }];
  const sl = await load('search.js', { projectId: 'p', rids: ['L'], queries: { street: 'q1' }, pageSize: 4 })(selS(longRes));
  assert.equal(sl.candidates.length, 24);
  assert.equal(sl.candidates[0].t, 1.2); assert.equal(sl.candidates[23].t, 99.2);
  // resources() failing: every clip is searched as before.
  searched = [];
  const sf = await load('search.js', { projectId: 'p', rids: ['a', 'b'], queries: { street: 'q1' }, pageSize: 4 })({ project: () => ({ resources: async () => { throw Error('x'); }, resource: selS(mixRes).project().resource }) });
  assert.deepEqual([...new Set(searched)].sort(), ['a', 'b']);
  assert.deepEqual(sf.local, []);
  // checkAnalysis: false never reads resources().
  let reads = 0;
  await load('search.js', { projectId: 'p', rids: ['a'], queries: { street: 'q1' }, pageSize: 4, checkAnalysis: false })({ project: () => ({ resources: async () => { reads++; return mixRes; }, resource: selS(mixRes).project().resource }) });
  assert.equal(reads, 0);

  clearInterval(keepAlive);
  console.log(JSON.stringify({ scriptsRead: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
