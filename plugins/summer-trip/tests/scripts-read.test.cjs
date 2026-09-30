// plugins/summer-trip/tests/scripts-read.test.cjs
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
const load = (name, cfg) => new Function('selects', `return (async()=>{${fs.readFileSync(path.join(dir, name), 'utf8').replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);
const resources = [
  { resourceId: 'r0', name: 'a.mov', type: 'Video', hasAnalysis: true, durationSeconds: 20, recording: { recordedAt: '2026-07-26T23:30:00-05:00' } },
  { resourceId: 'r1', name: 'b.mov', type: 'Video', hasAnalysis: false, durationSeconds: 20, recording: { creationAt: '2026-08-02T10:00:00Z' } },
  { resourceId: 'r2', name: 'song.mp3', type: 'Audio', hasAnalysis: false, recording: { recordedAt: '2026-01-01T00:00:00Z' } },
  { resourceId: 'r3', name: 'c.mov', type: 'Video', hasAnalysis: true, durationSeconds: 12 },
  { resourceId: 'r4', name: 'IMG_1.jpeg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0 },
  { resourceId: 'r5', name: 'IMG_2.jpeg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0 },
];
const tree = { fileTree: [{ type: 'dir', name: 'x', children: [
  { type: 'video', name: 'a.mov', resourceId: 'r0', path: '/v/a.mov', frameSize: { width: 1920, height: 1080 } },
  { type: 'video', name: 'b.mov', resourceId: 'r1', path: '/v/b.mov', frameSize: { width: 1920, height: 1080 } },
  { type: 'video', name: 'c.mov', resourceId: 'r3', path: '/v/c.mov', frameSize: { width: 1080, height: 1920 } },
  { type: 'video', name: 'IMG_1.jpeg', resourceId: 'r4', path: '/p/1.jpeg' },
  { type: 'video', name: 'IMG_2.jpeg', resourceId: 'r5', path: '/p/2.jpeg' }] }], fileCount: 5 };
// Atomics.waitAsync (search.js's backoff timer) does not keep node's event loop alive on its own.
const keepAlive = setInterval(() => {}, 50);
(async () => {
  // Inventory: CWV fields + capture dates and months. Missing dates come from selects.media.probe (EXIF-style text
  // included); months count the whole Project whatever `only` narrows; the month is read from the date text.
  const drafts = [], probes = [];
  const sel = {
    media: { probe: async ({ filePaths }) => { probes.push(filePaths); return { files: [
      { path: '/v/c.mov', dates: { encoded: '2026-12-01T00:00:00Z' }, encodedBy: 'HandBrake' },
      { path: '/p/1.jpeg', dates: { recorded: '2026:07:14 12:00:00', encoded: '2026-09-01' } },
      { path: '/p/2.jpeg', dates: { creation: '2025-06-30T22:00:00Z' } }] }; } },
    project: () => ({ resources: async () => resources, sourceFiles: async () => tree, createDraft: async ({ name }) => {
      let fsz = { width: 1920, height: 1080 }; const d = { name, committed: false, meta: async () => ({ fps: 30, frameSize: fsz }),
        insertResource: async ({ resourceId, sourceRange }) => { assert.ok(sourceRange.endSeconds <= 5); fsz = resourceId === 'r4' ? { width: 4032, height: 3024 } : { width: 2268, height: 4032 }; },
        commitAll: async () => { d.committed = true; } };
      drafts.push(d); return d; } }),
  };
  const inv = await load('inventory.js', { projectId: 'p', only: null })(sel);
  assert.deepEqual(inv.resources.map(r => [r.rid, r.width, r.height, r.duration, r.kind]), [['r0', 1920, 1080, 20, 'video'], ['r3', 1080, 1920, 12, 'video']]);
  assert.equal(inv.resources[0].recordedAt, '2026-07-26T23:30:00-05:00');
  assert.equal(inv.resources[0].month, 7, 'month from the date text, not shifted by the time zone');
  assert.equal(inv.resources[1].capturedAt, null, 'a transcode date (encodedBy) is not a capture date');
  assert.equal(inv.skipped.unanalysed, 1);
  assert.deepEqual(inv.photos, [
    { rid: 'r4', name: 'IMG_1.jpeg', width: 4032, height: 3024, recordedAt: null, capturedAt: '2026:07:14 12:00:00', month: 7, kind: 'photo' },
    { rid: 'r5', name: 'IMG_2.jpeg', width: 2268, height: 4032, recordedAt: null, capturedAt: '2025-06-30T22:00:00Z', month: 6, kind: 'photo' }]);
  // July: r0 + r4, August: r1 (unanalysed but still the Project's), June: r5. Audio does not count.
  assert.deepEqual(inv.months, [0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0]);
  assert.deepEqual(inv.captureDates, { known: 4, probed: 2 });
  assert.deepEqual(probes, [['/v/c.mov', '/p/1.jpeg', '/p/2.jpeg']], 'one probe call for the files without a date');
  assert.ok(drafts.every(d => !d.committed), 'scratch Drafts are not committed');
  const only = await load('inventory.js', { projectId: 'p', only: ['r3'], known: {} })(sel);
  assert.deepEqual(only.resources.map(r => r.rid), ['r3']);
  assert.equal(only.photos.length, 0);
  assert.deepEqual(only.months, inv.months, 'months cover the whole Project');
  const inv2 = await load('inventory.js', { projectId: 'p', only: null, measureMs: 0, probeMs: 0, known: { r5: { width: 10, height: 20 } } })(sel);
  assert.deepEqual(inv2.photos.map(r => [r.width, r.height]), [[null, null], [10, 20]], 'no measuring past the budget; known sizes reused');
  assert.deepEqual(inv2.months, [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0], 'no probe with probeMs 0');
  assert.equal(probes.length, 2);
  // Without selects.media the dates stay unknown and nothing throws.
  const inv3 = await load('inventory.js', { projectId: 'p', only: null, measureMs: 0 })({ project: sel.project });
  assert.equal(inv3.captureDates.probed, 0);

  // Search: default roles and queries from spec 5, bounded page size, busy answers retried after 1 s.
  let busy = 1; const seen = [];
  const selS = { project: () => ({ resource: rid => ({ searchScenes: async (q, o) => {
    seen.push([q, o.pageSize]);
    if (rid === 'r3' && busy > 0) { busy--; return { results: [], error: 'busy' }; }
    return { results: Array.from({ length: 30 }, (_, i) => ({ timeSeconds: i, score: 1 - i / 30 })), error: null };
  } }) }) };
  const s = await load('search.js', { projectId: 'p', rids: ['r0', 'r3'], pageSize: 50, roles: ['opener', 'grid', 'ending'] })(selS);
  assert.equal(s.failed.length, 0, 'retried busy rid');
  assert.equal(s.stats.jobs, 6);
  assert.equal(s.candidates.length, 6 * 10, 'page size capped at 10');
  assert.ok(seen.every(([, n]) => n === 10));
  assert.deepEqual([...new Set(seen.map(x => x[0]))].sort(), ['a colourful summer travel scene: beach, boats, streets or cafes', 'a wide view of the sea, coast or beach on a sunny day', 'golden sunset light over the sea or a town']);
  assert.deepEqual(Object.keys(s.candidates[0]).sort(), ['rid', 'role', 'score', 't']);
  assert.equal(s.stats.waitedMs, 1000, 'one retry pass after a 1 s pause');
  seen.length = 0;
  const sAll = await load('search.js', { projectId: 'p', rids: ['r0'] })(selS);
  assert.deepEqual([...new Set(sAll.candidates.map(c => c.role))], ['opener', 'grid', 'place', 'beach', 'town', 'water', 'street', 'food', 'landmark', 'people', 'detail', 'ending', 'avoid', 'motion']);
  assert.ok(seen.some(([q]) => q === 'a dark night scene, city lights at night, or an intense orange sunset') && seen.some(([q]) => q === 'people walking, a street with movement, or travelling along a road or coast'), 'the two signal queries run per clip');
  assert.equal(sAll.stats.jobs, 14);
  assert.ok(seen.every(([, n]) => n === 6), 'default page size 6');

  // rate_limited: back-off 1 s then 2 s (Atomics.waitAsync); never more than 4 searches in flight, even when asked.
  let inFlight = 0, peak = 0, tries = 0;
  const sel3 = { project: () => ({ resource: () => ({ searchScenes: async () => {
    inFlight++; peak = Math.max(peak, inFlight); const n = ++tries;
    await new Promise(r => setTimeout(r, 5)); inFlight--;
    if (n <= 30) throw Error('AxiosError: rate_limited');
    return { results: [{ timeSeconds: 1, score: 0.5 }], error: null };
  } }) }) };
  const s3 = await load('search.js', { projectId: 'p', rids: ['a', 'b', 'c', 'd'], queries: { q1: '1', q2: '2', q3: '3', q4: '4', q5: '5', q6: '6', q7: '7' }, pageSize: 4, parallel: 8 })(sel3);
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

  // ensure-audio: only missing files are imported (one importFiles call); existing ones match by path or file name.
  const audio = [{ resourceId: 'a1', name: 'summer-120.mp3', type: 'Audio' }, { resourceId: 'a2', name: 'x', type: 'Audio' }];
  const files = [{ type: 'audio', name: 'summer-120.mp3', resourceId: 'a1', path: '/old/place/summer-120.mp3' }, { type: 'audio', name: 'x', resourceId: 'a2', path: '/data/shutter-1.wav' }];
  const imports = [];
  const selA = { project: () => ({
    resources: async () => audio.slice(), sourceFiles: async () => ({ fileTree: files.slice() }),
    importFiles: async ({ paths }) => {
      imports.push(paths);
      const ids = paths.map((p, i) => 'n' + (audio.length + i));
      paths.forEach((p, i) => { audio.push({ resourceId: ids[i], name: p.split('/').pop(), type: 'Audio' }); files.push({ type: 'audio', resourceId: ids[i], path: p }); });
      return { addedResourceIds: ids.reverse() };
    } }) };
  const want = [{ key: 'cue', path: '/plugin/assets/cues/summer-120.mp3' }, { key: 'wet', path: '/plugin/assets/cues/summer-120-muffled.mp3' },
    { key: 'shutter1', path: '/data/shutter-1.wav' }, { key: 'whoosh', path: '/data/whoosh.wav' }];
  const e1 = await load('ensure-audio.js', { projectId: 'p', files: want })(selA);
  assert.deepEqual(imports, [['/plugin/assets/cues/summer-120-muffled.mp3', '/data/whoosh.wav']]);
  assert.deepEqual(e1, { ids: { cue: 'a1', wet: 'n2', shutter1: 'a2', whoosh: 'n3' }, imported: ['wet', 'whoosh'], missing: [] }, 'ids matched by name, not by the returned order');
  const e2 = await load('ensure-audio.js', { projectId: 'p', files: want })(selA);
  assert.deepEqual(e2.imported, []);
  assert.equal(imports.length, 1, 'nothing imported twice');
  assert.deepEqual(e2.ids, e1.ids);

  // Own music (matchByName: false) matches by path only: another song with the same file name is never reused. The
  // plugin-owned files keep the name fallback. When the import copies files (new paths), own music still resolves by
  // name among the resources this import added.
  for (const copies of [false, true]) {
    const aud = [{ resourceId: 'o1', name: 'song.mp3', type: 'Audio' }, { resourceId: 'o2', name: 'shutter-1.wav', type: 'Audio' }];
    const fl = [{ type: 'audio', resourceId: 'o1', path: '/old/other/song.mp3' }, { type: 'audio', resourceId: 'o2', path: '/elsewhere/shutter-1.wav' }];
    const imp = [];
    const sel = { project: () => ({
      resources: async () => aud.slice(), sourceFiles: async () => ({ fileTree: fl.slice() }),
      importFiles: async ({ paths }) => {
        imp.push(paths);
        const nids = paths.map((q, i) => 'k' + (aud.length + i));
        paths.forEach((q, i) => { aud.push({ resourceId: nids[i], name: q.split('/').pop(), type: 'Audio' }); fl.push({ type: 'audio', resourceId: nids[i], path: copies ? '/project/media/' + q.split('/').pop() : q }); });
        return { addedResourceIds: nids.slice().reverse() };
      } }) };
    const ownWant = [{ key: 'dry', path: '/music/song.mp3', matchByName: false }, { key: 'wet', path: '/data/song-muffled-0a1b2c3d.wav' },
      { key: 'shutter-1', path: '/data/sfx/shutter-1.wav' }];
    const o1 = await load('ensure-audio.js', { projectId: 'p', files: ownWant })(sel);
    assert.deepEqual(imp, [['/music/song.mp3', '/data/song-muffled-0a1b2c3d.wav']], 'own music imported although a same-named file exists' + (copies ? ' (copied)' : ''));
    assert.deepEqual(o1.ids, { dry: 'k2', wet: 'k3', 'shutter-1': 'o2' }, 'own music resolves to its own import; the SFX reuses by name');
    assert.deepEqual(o1.imported, ['dry', 'wet']);
    if (!copies) {
      const o2 = await load('ensure-audio.js', { projectId: 'p', files: ownWant })(sel);
      assert.deepEqual([o2.ids, o2.imported, imp.length], [o1.ids, [], 1], 'the second run matches own music by path');
    }
  }
  clearInterval(keepAlive);
  console.log(JSON.stringify({ scriptsRead: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
