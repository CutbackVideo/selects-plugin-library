// plugins/torn-paper-love/tests/scripts-read.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
const load = (name, cfg) => new Function('selects', `return (async()=>{${fs.readFileSync(path.join(dir, name), 'utf8').replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);
const resources = [
  { resourceId: 'r0', name: 'a.mov', type: 'Video', hasAnalysis: true, durationSeconds: 20, recording: { recordedAt: '2026-09-26T15:00:00Z' } },
  { resourceId: 'r1', name: 'b.mov', type: 'Video', hasAnalysis: false, status: 'pending', durationSeconds: 20 },
  { resourceId: 'r2', name: 'song.mp3', type: 'Audio', hasAnalysis: false },
  { resourceId: 'r3', name: 'c.mov', type: 'Video', hasAnalysis: true, durationSeconds: 12 },
  { resourceId: 'r6', name: 'd.mov', type: 'Video', hasAnalysis: true, durationSeconds: 0 },
  // Still importing: no duration yet, or no source file in the tree yet.
  { resourceId: 'r8', name: 'e.mov', type: 'Video', hasAnalysis: false, status: 'pending' },
  { resourceId: 'r9', name: 'f.mov', type: 'Video', hasAnalysis: false, status: 'pending', durationSeconds: 8 },
];
const tree = { fileTree: [{ type: 'dir', name: 'x', children: [
  { type: 'video', name: 'a.mov', resourceId: 'r0', path: '/v/a.mov', frameSize: { width: 1920, height: 1080 } },
  { type: 'video', name: 'b.mov', resourceId: 'r1', path: '/v/b.mov' },
  { type: 'video', name: 'c.mov', resourceId: 'r3', path: '/v/c.mov', frameSize: { width: 1080, height: 1920 } },
  { type: 'video', name: 'd.mov', resourceId: 'r6', path: '/v/d.mov' },
  { type: 'video', name: 'e.mov', resourceId: 'r8', path: '/v/e.mov' },
  { type: 'video', name: 'f.mov', resourceId: 'r9', path: null }] }], fileCount: 6 };
const SCRATCH = 'Torn Paper Love size check';
const QUERY = 'two people close together, a couple smiling, hugging or kissing';
// Atomics.waitAsync (search.js's backoff timer) does not keep node's event loop alive on its own.
const keepAlive = setInterval(() => {}, 50);
(async () => {
  // Inventory: every clip with a duration and a source file, analysed or not (clips never wait for analysis), with
  // sizes, dates, their index in the Project's resource order, the analysis flag, the source path and the status.
  const selects = { project: () => ({ resources: async () => resources, sourceFiles: async () => tree }) };
  const inv = await load('inventory.js', { projectId: 'p', only: null })(selects);
  assert.deepEqual(inv.resources.map(r => [r.rid, r.width, r.height, r.duration, r.order, r.kind, r.analysed, r.path]),
    [['r0', 1920, 1080, 20, 0, 'video', true, '/v/a.mov'], ['r1', null, null, 20, 1, 'video', false, '/v/b.mov'], ['r3', 1080, 1920, 12, 3, 'video', true, '/v/c.mov']]);
  assert.equal(inv.resources[0].recordedAt, '2026-09-26T15:00:00Z');
  assert.equal(inv.resources[2].recordedAt, null);
  assert.deepEqual(inv.resources.map(r => r.status), [null, 'pending', null], 'status is passed through (informational)');
  // unanalysed = still importing (r8: no duration, r9: no source path); notAnalysed = usable but not analysed (r1);
  // missing = a source without a usable duration (r6).
  assert.deepEqual(inv.counts, { unanalysed: 2, notAnalysed: 1, missing: 1, unmeasured: 0 });
  const only = await load('inventory.js', { projectId: 'p', only: ['r3'] })(selects);
  assert.deepEqual(only.resources.map(r => [r.rid, r.order]), [['r3', 3]], 'order is the Project order, not the filtered one');

  // Photos: Image resources come back with kind 'photo'; sourceFiles has no size for them, so an unsaved scratch Draft
  // measures each (it adopts the photo's size). Known sizes are reused, nothing is committed, the budget is respected.
  const res2 = resources.concat([
    { resourceId: 'r4', name: 'IMG_1.jpeg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0, recording: { recordedAt: '2026-09-27T10:00:00Z' } },
    { resourceId: 'r5', name: 'IMG_2.jpeg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0, recording: { filenameTimestamp: '2026-09-20T08:00:00Z' } },
    { resourceId: 'r7', name: 'IMG_3.heic', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0 }]);
  const tree2 = { fileTree: tree.fileTree.concat([{ type: 'video', name: 'IMG_1.jpeg', resourceId: 'r4', path: '/p/1.jpeg' }, { type: 'video', name: 'IMG_2.jpeg', resourceId: 'r5', path: '/p/2.jpeg' }, { type: 'video', name: 'IMG_3.heic', resourceId: 'r7', path: '/p/3.heic' }]) };
  const drafts = [];
  const sel2 = { project: () => ({ resources: async () => res2, sourceFiles: async () => tree2, createDraft: async ({ name }) => {
    let size = { width: 1920, height: 1080 }; const d = { name, committed: false, meta: async () => ({ fps: 30, frameSize: size }),
      insertResource: async ({ resourceId, sourceRange }) => {
        assert.ok(sourceRange.endSeconds <= 5);
        if (resourceId === 'r7') throw Error('unsupported image');
        size = resourceId === 'r4' ? { width: 898, height: 898 } : { width: 2268, height: 4032 };
      },
      commitAll: async () => { d.committed = true; } };
    drafts.push(d); return d; } }) };
  const inv2 = await load('inventory.js', { projectId: 'p', only: null })(sel2);
  assert.deepEqual(inv2.resources.map(r => [r.rid, r.kind]), [['r0', 'video'], ['r1', 'video'], ['r3', 'video']]);
  assert.deepEqual(inv2.photos, [
    { rid: 'r4', name: 'IMG_1.jpeg', width: 898, height: 898, recordedAt: '2026-09-27T10:00:00Z', order: 7, kind: 'photo' },
    { rid: 'r5', name: 'IMG_2.jpeg', width: 2268, height: 4032, recordedAt: '2026-09-20T08:00:00Z', order: 8, kind: 'photo' },
    { rid: 'r7', name: 'IMG_3.heic', width: null, height: null, recordedAt: null, order: 9, kind: 'photo' }]);
  assert.deepEqual(inv2.counts, { unanalysed: 2, notAnalysed: 1, missing: 1, unmeasured: 1 }, 'photos never count as unanalysed');
  assert.equal(drafts.length, 3);
  assert.ok(drafts.every(d => d.name === SCRATCH), 'scratch Draft name');
  assert.ok(drafts.every(d => !d.committed), 'scratch Drafts are never committed');
  const inv3 = await load('inventory.js', { projectId: 'p', only: ['r5'], known: { r5: { width: 10, height: 20 } } })(sel2);
  assert.deepEqual(inv3.photos.map(r => [r.rid, r.width, r.height]), [['r5', 10, 20]]);
  assert.equal(inv3.resources.length, 0);
  assert.equal(drafts.length, 3, 'a known size is not measured again');
  const inv4 = await load('inventory.js', { projectId: 'p', only: null, measureMs: 0 })(sel2);
  assert.deepEqual(inv4.photos.map(r => r.width), [null, null, null], 'no measuring past the budget');
  assert.equal(inv4.counts.unmeasured, 3);

  // Scene search: one role, one fixed query; the best hit per video (highest score, ties to the earliest), null when
  // a video has no hit. A busy answer is retried after 1 s.
  let calls = 0; const queries = [], sizes = [];
  const sel = { project: () => ({ resource: rid => ({ searchScenes: async (q, o) => {
    calls++; queries.push(q); sizes.push(o && o.pageSize);
    if (rid === 'r3' && calls < 4) return { results: [], error: 'busy' };
    if (rid === 'r8') return { results: [], error: null };
    return { results: [{ timeSeconds: 11, score: 0.6 }, { timeSeconds: 4.2, score: 0.8 }, { timeSeconds: 2, score: 0.8 }], error: null };
  } }) }) };
  const s = await load('search.js', { projectId: 'p', rids: ['r0', 'r3', 'r8'], pageSize: 500 })(sel);
  assert.deepEqual(s.failed, [], 'retried busy rid');
  assert.deepEqual(s.best, { r0: 2, r3: 2, r8: null });
  assert.ok(queries.every(q => q === QUERY), 'couple query');
  assert.ok(sizes.every(n => n > 0 && n <= 8), 'bounded pageSize ' + sizes);
  assert.equal(s.stats.waitedMs, 1000, 'one retry pass after a 1 s pause');

  // Rate limits back off 1 s, then 2 s; at most 4 searches are in flight even when more are asked for.
  let inFlight = 0, peak = 0, tries = 0;
  const sel3 = { project: () => ({ resource: () => ({ searchScenes: async () => {
    inFlight++; peak = Math.max(peak, inFlight); const n = ++tries;
    await new Promise(r => setTimeout(r, 5)); inFlight--;
    if (n <= 12) throw Error('AxiosError: rate_limited');
    return { results: [{ timeSeconds: 1, score: 0.5 }], error: null };
  } }) }) };
  const rids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const s3 = await load('search.js', { projectId: 'p', rids, parallel: 16 })(sel3);
  assert.equal(peak, 4, 'four in flight');
  assert.deepEqual(s3.failed, []);
  assert.deepEqual(Object.values(s3.best), rids.map(() => 1));
  assert.equal(s3.stats.rateLimited, 12);
  assert.equal(s3.stats.waitedMs, 3000, '1 s then 2 s');
  // A pause that would pass the budget is skipped and the rest is reported as failed (best null).
  tries = 0;
  const s4 = await load('search.js', { projectId: 'p', rids: ['a', 'b'], budgetMs: 500 })(sel3);
  assert.deepEqual(s4.failed.sort(), ['a', 'b']);
  assert.deepEqual(s4.best, { a: null, b: null });
  assert.equal(s4.stats.waitedMs, 0);
  // The script never uses setTimeout (run_script has none).
  assert.ok(!/setTimeout\s*\(/.test(fs.readFileSync(path.join(dir, 'search.js'), 'utf8')));
  clearInterval(keepAlive);
  console.log(JSON.stringify({ scriptsRead: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
