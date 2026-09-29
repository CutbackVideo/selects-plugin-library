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
  assert.equal(inv.latestYear, 2026, 'the only dated resource');
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
  assert.equal(inv2.latestYear, 2026);
  assert.equal(drafts.length, 2);
  assert.ok(drafts.every(d => !d.committed), 'scratch Drafts are not committed');
  const inv3 = await load('inventory.js', { projectId: 'p', only: ['r5'], known: { r5: { width: 10, height: 20 } } })(sel2);
  assert.deepEqual(inv3.photos.map(r => [r.rid, r.width, r.height]), [['r5', 10, 20]]);
  assert.equal(inv3.resources.length, 0);
  assert.equal(drafts.length, 2, 'a known size is not measured again');
  const inv4 = await load('inventory.js', { projectId: 'p', only: null, measureMs: 0 })(sel2);
  assert.deepEqual(inv4.photos.map(r => r.width), [null, null], 'no measuring past the budget');

  // latestYear: the most recent recording year over videos (analysed or not) and photos, from recordedAt, else the
  // filename timestamp, else the creation date; unparseable dates are ignored, and no valid date gives null.
  const dated = [
    { resourceId: 'y0', name: 'a.mov', type: 'Video', hasAnalysis: true, durationSeconds: 10, recording: { recordedAt: '2024-05-01T10:00:00Z' } },
    { resourceId: 'y1', name: 'b.mov', type: 'Video', hasAnalysis: false, durationSeconds: 10, recording: { filenameTimestamp: '2025-12-31T23:30:00' } },
    { resourceId: 'y2', name: 'c.mov', type: 'Video', hasAnalysis: true, durationSeconds: 10, recording: { recordedAt: 'not a date' } },
    { resourceId: 'y3', name: 'IMG.jpeg', type: 'Image', hasAnalysis: false, durationSeconds: 0, recording: { creationAt: '2023-02-02T00:00:00Z' } },
    { resourceId: 'y4', name: 'song.mp3', type: 'Audio', hasAnalysis: false, recording: { recordedAt: '2030-01-01T00:00:00Z' } },
    { resourceId: 'y5', name: 'd.mov', type: 'Video', hasAnalysis: true, durationSeconds: 10 }];
  const selY = rs => ({ project: () => ({ resources: async () => rs, sourceFiles: async () => ({ fileTree: [], fileCount: 0 }) }) });
  const invY = await load('inventory.js', { projectId: 'p', only: null, known: { y3: { width: 10, height: 10 } } })(selY(dated));
  assert.equal(invY.latestYear, 2025, 'mixed dates: the newest valid year, audio ignored');
  const invP = await load('inventory.js', { projectId: 'p', only: ['y3'], known: { y3: { width: 10, height: 10 } } })(selY(dated));
  assert.equal(invP.latestYear, 2023, 'a photo date counts; `only` applies');
  const invN = await load('inventory.js', { projectId: 'p', only: ['y2', 'y5'] })(selY(dated));
  assert.equal(invN.latestYear, null, 'no valid date');

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
  clearInterval(keepAlive);
  console.log(JSON.stringify({ scriptsRead: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
