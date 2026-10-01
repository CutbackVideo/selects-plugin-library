// Read scripts (inventory.js, search.js) against a mocked `selects` global, filled the way the panel fills them:
// the first config placeholder is replaced with JSON.parse("...") of the config.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
const fill = (src, cfg) => src.replace('__CONFIG__', () => `JSON.parse(${JSON.stringify(JSON.stringify(cfg))})`);
const load = (name, cfg) => new Function('selects', `return (async()=>{${fill(fs.readFileSync(path.join(dir, name), 'utf8'), cfg)}})();`);
const QUERIES = {
  selfie: "close-up selfie of a person's face looking at the camera",
  hand: 'person touching their face or hair with a hand, close-up',
  expression: 'person making a face, pouting or smiling at the camera, close-up',
  glance: 'person glancing away and back to the camera, close-up portrait',
  control: 'a landscape, street, room, food or object with no person',
};
const ROLES = Object.keys(QUERIES);

const resources = [
  { resourceId: 'r0', name: 'a.mov', type: 'Video', hasAnalysis: true, durationSeconds: 20, recording: { recordedAt: '2026-09-26T15:00:00Z' } },
  { resourceId: 'r1', name: 'b.mov', type: 'Video', hasAnalysis: false, durationSeconds: 20 },
  { resourceId: 'r2', name: 'song.mp3', type: 'Audio', hasAnalysis: false },
  { resourceId: 'r3', name: 'c.mov', type: 'Video', hasAnalysis: true, durationSeconds: 12 },
  { resourceId: 'r6', name: 'blink.mov', type: 'Video', hasAnalysis: true, durationSeconds: 1.1 },
  { resourceId: 'r7', name: 'edge.mov', type: 'Video', hasAnalysis: true, durationSeconds: 1.2 },
];
const tree = { fileTree: [{ type: 'dir', name: 'x', children: [
  { type: 'video', name: 'a.mov', resourceId: 'r0', path: '/v/a.mov', frameSize: { width: 1920, height: 1080 } },
  { type: 'video', name: 'c.mov', resourceId: 'r3', path: '/v/c.mov', frameSize: { width: 1080, height: 1920 } }] }], fileCount: 2 };

// Atomics.waitAsync (search.js's backoff timer) does not keep node's event loop alive on its own.
const keepAlive = setInterval(() => {}, 50);
(async () => {
  // Config fill: the script parses the JSON string the panel embeds (quotes and apostrophes survive).
  assert.ok(fill(fs.readFileSync(path.join(dir, 'search.js'), 'utf8'), { queries: QUERIES }).startsWith('const cfg = JSON.parse("'));

  // Inventory: analysed videos >= 1.2 s, short and unanalysed ones skipped and counted.
  const inv = await load('inventory.js', { projectId: 'p', only: null })({ project: () => ({ resources: async () => resources, sourceFiles: async () => tree }) });
  assert.deepEqual(inv.resources.map(r => [r.rid, r.width, r.height, r.duration, r.kind]),
    [['r0', 1920, 1080, 20, 'video'], ['r3', 1080, 1920, 12, 'video'], ['r7', null, null, 1.2, 'video']]);
  assert.equal(inv.resources[0].recordedAt, '2026-09-26T15:00:00Z');
  // Source paths (the stillness picker measures motion on them); a resource outside the file tree has none.
  assert.deepEqual(inv.resources.map(r => r.path), ['/v/a.mov', '/v/c.mov', null]);
  assert.equal(inv.skipped.unanalysed, 1);
  assert.equal(inv.skipped.short, 1, 'the 1.1 s clip is skipped as short');
  assert.equal(inv.skipped.missing, 0);
  assert.deepEqual(inv.photos, []);
  const only = await load('inventory.js', { projectId: 'p', only: ['r3', 'r6'] })({ project: () => ({ resources: async () => resources, sourceFiles: async () => tree }) });
  assert.deepEqual(only.resources.map(r => r.rid), ['r3']);
  assert.equal(only.skipped.short, 1);

  // Photos: measured on an unsaved scratch Draft, never committed; known sizes reused; budget respected.
  const res2 = resources.concat([
    { resourceId: 'r4', name: 'IMG_1.jpeg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0, recording: { recordedAt: '2026-09-27T10:00:00Z' } },
    { resourceId: 'r5', name: 'IMG_2.jpeg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0 }]);
  const tree2 = { fileTree: tree.fileTree.concat([{ type: 'video', name: 'IMG_1.jpeg', resourceId: 'r4', path: '/p/1.jpeg', frameSize: null }, { type: 'video', name: 'IMG_2.jpeg', resourceId: 'r5', path: '/p/2.jpeg' }]) };
  const drafts = [];
  let commits = 0, imports = 0;
  const sel2 = { project: () => ({ resources: async () => res2, sourceFiles: async () => tree2,
    importFiles: async () => { imports++; },
    createDraft: async ({ name }) => {
      let size = { width: 1920, height: 1080 };
      const d = { name, meta: async () => ({ fps: 30, frameSize: size }),
        insertResource: async ({ resourceId, sourceRange }) => { assert.ok(sourceRange.endSeconds <= 5); size = resourceId === 'r4' ? { width: 898, height: 898 } : { width: 2268, height: 4032 }; },
        commitAll: async () => { commits++; } };
      drafts.push(d); return d;
    } }) };
  const inv2 = await load('inventory.js', { projectId: 'p', only: null })(sel2);
  assert.deepEqual(inv2.resources.map(r => [r.rid, r.kind]), [['r0', 'video'], ['r3', 'video'], ['r7', 'video']]);
  assert.deepEqual(inv2.photos, [
    { rid: 'r4', name: 'IMG_1.jpeg', width: 898, height: 898, recordedAt: '2026-09-27T10:00:00Z', kind: 'photo' },
    { rid: 'r5', name: 'IMG_2.jpeg', width: 2268, height: 4032, recordedAt: null, kind: 'photo' }]);
  assert.equal(inv2.skipped.unanalysed, 1, 'photos never count as unanalysed');
  assert.equal(drafts.length, 2);
  assert.ok(drafts.every(d => d.name === 'Selfie Aesthetic Edit size check'));
  assert.equal(commits, 0, 'no commitAll call');
  assert.equal(imports, 0, 'no importFiles call');
  const inv3 = await load('inventory.js', { projectId: 'p', only: ['r5'], known: { r5: { width: 10, height: 20 } } })(sel2);
  assert.deepEqual(inv3.photos.map(r => [r.rid, r.width, r.height]), [['r5', 10, 20]]);
  assert.equal(inv3.resources.length, 0);
  assert.equal(drafts.length, 2, 'a known size is not measured again');
  const inv4 = await load('inventory.js', { projectId: 'p', only: null, measureMs: 0 })(sel2);
  assert.deepEqual(inv4.photos.map(r => r.width), [null, null], 'no measuring past the budget');
  assert.equal(drafts.length, 2);
  assert.equal(commits, 0);

  // Search: every role is searched for every clip; t and score rounded to 3 decimals; a busy answer is retried.
  const seen = [];
  let busy = 0;
  const sel = { project: () => ({ resource: rid => ({ searchScenes: async (q, opts) => {
    seen.push([rid, q, opts.pageSize]);
    if (rid === 'r3' && busy++ < 2) return { results: [], error: 'busy' };
    return { results: [{ timeSeconds: 4.123456, score: 0.812345 }, { timeSeconds: 11, score: 0.6 }], error: null };
  } }) }) };
  const s = await load('search.js', { projectId: 'p', rids: ['r0', 'r3'], queries: QUERIES, pageSize: 4 })(sel);
  for (const rid of ['r0', 'r3']) for (const role of ROLES) {
    assert.ok(seen.some(([r, q]) => r === rid && q === QUERIES[role]), `${rid} searched for ${role}`);
    assert.equal(s.candidates.filter(c => c.rid === rid && c.role === role).length, 2);
  }
  assert.ok(seen.every(([, , n]) => n === 4), 'pageSize passed through');
  assert.equal(s.failed.length, 0, 'retried busy rid');
  assert.equal(s.candidates.length, 2 * ROLES.length * 2);
  assert.deepEqual(Object.keys(s.candidates[0]).sort(), ['rid', 'role', 'score', 't']);
  assert.deepEqual([s.candidates[0].t, s.candidates[0].score], [4.123, 0.812]);
  assert.equal(s.stats.waitedMs, 1000, 'one retry pass after a 1 s pause');

  // rate_limited: back off 1 s then 2 s, at most 4 in flight even when asked for more.
  let inFlight = 0, peak = 0, tries = 0;
  const sel3 = { project: () => ({ resource: () => ({ searchScenes: async () => {
    inFlight++; peak = Math.max(peak, inFlight); const n = ++tries;
    await new Promise(r => setTimeout(r, 5)); inFlight--;
    if (n <= 32) throw Error('AxiosError: rate_limited');
    return { results: [{ timeSeconds: 1, score: 0.5 }], error: null };
  } }) }) };
  const s3 = await load('search.js', { projectId: 'p', rids: ['a', 'b', 'c', 'd', 'e', 'f'], queries: QUERIES, pageSize: 4, parallel: 10 })(sel3);
  assert.equal(peak, 4, 'four in flight');
  assert.equal(s3.failed.length, 0);
  assert.equal(s3.candidates.length, 30);
  assert.equal(s3.stats.rateLimited, 32);
  assert.equal(s3.stats.waitedMs, 3000, '1 s then 2 s');

  // rate_limited that never clears: retried after 1, 2 and 4 s, then the clip is reported in failed.
  let hardTries = 0;
  const hard = { project: () => ({ resource: rid => ({ searchScenes: async () => {
    hardTries++;
    if (rid === 'x') return { results: [], error: 'rate_limited' };
    return { results: [{ timeSeconds: 2, score: 0.4 }], error: null };
  } }) }) };
  const s5 = await load('search.js', { projectId: 'p', rids: ['x', 'y'], queries: { selfie: QUERIES.selfie }, pageSize: 4 })(hard);
  assert.deepEqual(s5.failed, ['x']);
  assert.equal(s5.stats.rateLimited, 4, 'first try plus three retries');
  assert.equal(s5.stats.waitedMs, 7000, '1 s, 2 s, 4 s');
  assert.equal(hardTries, 5);
  assert.deepEqual(s5.candidates, [{ rid: 'y', role: 'selfie', t: 2, score: 0.4 }]);

  // Budget: a pause that would pass the budget is skipped and the rest is reported as failed.
  tries = 0;
  const s4 = await load('search.js', { projectId: 'p', rids: ['a', 'b'], queries: { selfie: QUERIES.selfie }, pageSize: 4, budgetMs: 500 })(sel3);
  assert.deepEqual(s4.failed.sort(), ['a', 'b']);
  assert.equal(s4.stats.waitedMs, 0);
  // Budget already spent: no new search is started at all.
  let started = 0;
  const slow = { project: () => ({ resource: () => ({ searchScenes: async () => { started++; await new Promise(r => setTimeout(r, 30)); return { results: [], error: null }; } }) }) };
  const s6 = await load('search.js', { projectId: 'p', rids: ['a', 'b', 'c', 'd', 'e', 'f'], queries: QUERIES, pageSize: 4, budgetMs: 10 })(slow);
  assert.equal(started, 4, 'only the first wave starts before the budget runs out');
  assert.deepEqual(s6.failed.sort(), ['a', 'b', 'c', 'd', 'e', 'f'], 'clips with unsearched roles are reported as failed');
  assert.equal(s6.stats.waitedMs, 0);

  // Unanalysed videos by status: being analysed, never started, failed. The panel never starts analysis itself.
  const v = (id, status) => ({ resourceId: id, name: id + '.mov', type: 'Video', hasAnalysis: false, status, durationSeconds: 10 });
  const mixed = [resources[0], v('s1', 'sampling'), v('s2', 'samplingSucceeded'), v('s3', 'analyzing'), v('s4', 'samplingFailed'), v('s5', 'analyzingFailed'),
    v('q1', 'pending'), v('q2', 'pending'), v('q3', 'pending'), v('u1', undefined)];
  let wfCalls = 0;
  const withWf = wf => ({ project: () => ({ resources: async () => mixed, sourceFiles: async () => tree,
    workflows: async (f) => { wfCalls++; assert.equal(f, undefined, 'one unfiltered read'); if (wf instanceof Error) throw wf; return wf; } }) });
  const split = inv => { const { unanalysed, analysing, notAnalysed, failed, statusKnown } = inv.skipped;
    assert.equal(analysing + notAnalysed + failed, unanalysed, 'the split adds up'); return { unanalysed, analysing, notAnalysed, failed, statusKnown }; };
  assert.deepEqual(split(await load('inventory.js', { projectId: 'p', only: null })(withWf([]))),
    { unanalysed: 9, analysing: 3, notAnalysed: 4, failed: 2, statusKnown: true });
  assert.equal(wfCalls, 1, 'workflows() is read once');
  assert.deepEqual(split(await load('inventory.js', { projectId: 'p', only: null })(withWf([
    { workflowId: 'w1', type: 'project:analyze-resource', status: 'queued', resourceId: 'q1' },
    { workflowId: 'w2', type: 'project:analyze-resource', status: 'running', resourceId: 'q2' },
    { workflowId: 'w3', type: 'project:analyze-resource', status: 'failed', resourceId: 'q3' }]))),
    { unanalysed: 9, analysing: 5, notAnalysed: 2, failed: 2, statusKnown: true });
  assert.deepEqual(split(await load('inventory.js', { projectId: 'p', only: null })(withWf([
    { workflowId: 'w5', type: 'project:create', status: 'running' }]))),
    { unanalysed: 9, analysing: 6, notAnalysed: 1, failed: 2, statusKnown: true });
  assert.deepEqual(split(await load('inventory.js', { projectId: 'p', only: null })(withWf(new Error('boom')))),
    { unanalysed: 9, analysing: 3, notAnalysed: 4, failed: 2, statusKnown: false });
  wfCalls = 0;
  const done = { project: () => ({ resources: async () => [resources[0], v('s1', 'analyzing')], sourceFiles: async () => tree, workflows: async () => { wfCalls++; return []; } }) };
  assert.deepEqual(split(await load('inventory.js', { projectId: 'p', only: null })(done)), { unanalysed: 1, analysing: 1, notAnalysed: 0, failed: 0, statusKnown: true });
  assert.equal(wfCalls, 0, 'no workflows() read without a pending clip');

  // The scripts never import or commit.
  for (const name of ['inventory.js', 'search.js']) {
    const src = fs.readFileSync(path.join(dir, name), 'utf8');
    assert.ok(!/\b(commitAll|importFiles)\s*\(/.test(src), `${name} never imports or commits`);
    assert.ok(!/setTimeout\s*\(/.test(src), `${name} uses no setTimeout`);
  }

  clearInterval(keepAlive);
  console.log(JSON.stringify({ scriptsRead: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
