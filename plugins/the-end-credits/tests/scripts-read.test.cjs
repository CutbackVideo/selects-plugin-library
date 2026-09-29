// plugins/the-end-credits/tests/scripts-read.test.cjs
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'scripts');
const SCRIPTS = ['inventory.js', 'search.js', 'ensure-audio.js', 'assemble.js', 'decorate.js'];
// The scripts run through run_script's TypeScript check, so they carry `: any` / `as any` annotations; those two forms
// (and only those: anything else fails to parse here) are stripped before node evaluates the body.
const plain = src => src.replace(/\s+as any\b/g, '').replace(/:\s*any(?:\[\])?(?=[\s=,);])/g, '');
const source = name => fs.readFileSync(path.join(dir, name), 'utf8');
const load = (name, cfg) => new Function('selects', `return (async()=>{${plain(source(name)).replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);
const resources = [
  { resourceId: 'r0', name: 'a.mov', type: 'Video', hasAnalysis: true, durationSeconds: 20, recording: { recordedAt: '2026-09-26T15:00:00Z' } },
  { resourceId: 'r1', name: 'b.mov', type: 'Video', hasAnalysis: false, durationSeconds: 20 },
  { resourceId: 'r2', name: 'song.mp3', type: 'Audio', hasAnalysis: false },
  { resourceId: 'r3', name: 'c.mov', type: 'Video', hasAnalysis: true, durationSeconds: 12 },
];
const tree = { fileTree: [{ type: 'dir', name: 'x', children: [
  { type: 'video', name: 'a.mov', resourceId: 'r0', path: '/v/a.mov', frameSize: { width: 1920, height: 1080 } },
  { type: 'video', name: 'c.mov', resourceId: 'r3', path: '/v/c.mov', frameSize: { width: 1080, height: 1920 } },
  { type: 'audio', name: 'song.mp3', resourceId: 'r2', path: '/m/song.mp3' }] }], fileCount: 3 };
let calls = 0;
const selects = { project: () => ({
  resources: async () => resources,
  sourceFiles: async () => tree,
  resource: rid => ({ searchScenes: async (q) => { calls++; if (rid === 'r3' && calls < 4) return { results: [], error: 'busy' }; return { results: [{ timeSeconds: 4, score: 0.8 }, { timeSeconds: 11, score: 0.6 }], error: null }; } }),
}) };

// Offline TypeScript check: every script, with its config inlined as a JSON literal (the case that widens literal
// types), against the Selects SDK declarations. Runs only where a TypeScript compiler and the SDK are installed.
function findTypeScript() {
  const tries = [process.env.TEC_TYPESCRIPT, 'typescript'];
  const npx = path.join(os.homedir(), '.npm', '_npx');
  try { for (const h of fs.readdirSync(npx)) tries.push(path.join(npx, h, 'node_modules', 'typescript')); } catch (e) { /* no npx cache */ }
  for (const t of tries) { if (!t) continue; try { return require(require.resolve(t)); } catch (e) { /* next */ } }
  return null;
}
function findSdk() {
  const tries = [process.env.SELECTS_SDK_DIR, path.join(os.homedir(), '.selects-staging', 'resources', 'sdk'), path.join(os.homedir(), '.selects', 'resources', 'sdk')];
  return tries.find(t => t && fs.existsSync(path.join(t, 'draft.d.ts'))) || null;
}
function typeCheck(cfgs) {
  const ts = findTypeScript(), sdk = findSdk();
  if (!ts || !sdk) return { skipped: !ts ? 'no TypeScript compiler' : 'no Selects SDK declarations' };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tec-ts-'));
  try {
    const roots = fs.readdirSync(sdk).filter(f => f.endsWith('.d.ts')).map(f => path.join(sdk, f));
    for (const name of SCRIPTS) {
      const file = path.join(tmp, name.replace('.js', '.ts'));
      const body = source(name).replace('__CONFIG__', () => JSON.stringify(cfgs[name]));
      fs.writeFileSync(file, `async function tec_${name.replace(/\W/g, '_')}() {\n${body}\n}\n`);
      roots.push(file);
    }
    // Non-strict, like the run_script check: City Weekend Vlog's scripts pass it live with untyped parameters, `[]`
    // accumulators and nullable reads, which strict mode rejects. What this catches is the rest: unknown SDK methods and
    // options, wrong argument shapes, properties missing on inferred object types, and widened literal types.
    const program = ts.createProgram(roots, { target: ts.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts'], strict: false,
      noEmit: true, skipLibCheck: true, types: [] });
    const errors = ts.getPreEmitDiagnostics(program).filter(d => d.file && d.file.fileName.startsWith(tmp)).map(d => {
      const { line } = d.file.getLineAndCharacterOfPosition(d.start);
      return path.basename(d.file.fileName) + ':' + line + ' ' + ts.flattenDiagnosticMessageText(d.messageText, ' ');
    });
    return { version: ts.version, errors };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// Atomics.waitAsync (search.js's backoff timer) does not keep node's event loop alive on its own.
const keepAlive = setInterval(() => {}, 50);
(async () => {
  const inv = await load('inventory.js', { projectId: 'p', only: null })(selects);
  assert.deepEqual(inv.resources.map(r => [r.rid, r.width, r.height, r.duration]), [['r0', 1920, 1080, 20], ['r3', 1080, 1920, 12]]);
  assert.deepEqual(inv.resources.map(r => r.aspect), [1920 / 1080, 1080 / 1920], 'aspect = width / height');
  assert.equal(inv.resources[0].recordedAt, '2026-09-26T15:00:00Z');
  assert.equal(inv.skipped.unanalysed, 1);
  const only = await load('inventory.js', { projectId: 'p', only: ['r3'] })(selects);
  assert.deepEqual(only.resources.map(r => r.rid), ['r3']);
  const s = await load('search.js', { projectId: 'p', rids: ['r0', 'r3'], queries: { 'wide landscape': 'q1', 'water or ocean': 'q2' }, pageSize: 4 })(selects);
  assert.equal(s.failed.length, 0, 'retried busy rid');
  assert.equal(s.candidates.length, 8);
  assert.deepEqual(Object.keys(s.candidates[0]).sort(), ['rid', 'role', 'score', 't']);
  assert.equal(s.stats.waitedMs, 1000, 'one retry pass after a 1 s pause');

  // Photos: Image resources come back with kind 'photo' and their aspect; sourceFiles has no size for them, so an
  // unsaved "THE END Credits size check" Draft measures each (it adopts the photo's size). Nothing is committed.
  const res2 = resources.concat([
    { resourceId: 'r4', name: 'IMG_1.jpeg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0, recording: { recordedAt: '2026-09-27T10:00:00Z' } },
    { resourceId: 'r5', name: 'IMG_2.jpeg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0 }]);
  const tree2 = { fileTree: tree.fileTree.concat([{ type: 'video', name: 'IMG_1.jpeg', resourceId: 'r4', path: '/p/1.jpeg', hasTimecode: false }, { type: 'video', name: 'IMG_2.jpeg', resourceId: 'r5', path: '/p/2.jpeg', hasTimecode: false }]) };
  const drafts = [];
  const sel2 = { project: () => ({ resources: async () => res2, sourceFiles: async () => tree2, createDraft: async ({ name }) => {
    let fs = { width: 1920, height: 1080 }; const d = { name, committed: false, meta: async () => ({ fps: 30, frameSize: fs }),
      insertResource: async ({ resourceId, sourceRange }) => { assert.ok(sourceRange.endSeconds <= 5); fs = resourceId === 'r4' ? { width: 810, height: 1080 } : { width: 2268, height: 4032 }; },
      commitAll: async () => { d.committed = true; } };
    drafts.push(d); return d; } }) };
  const inv2 = await load('inventory.js', { projectId: 'p', only: null })(sel2);
  assert.deepEqual(inv2.resources.map(r => [r.rid, r.kind]), [['r0', 'video'], ['r3', 'video']]);
  assert.deepEqual(inv2.photos, [
    { rid: 'r4', name: 'IMG_1.jpeg', width: 810, height: 1080, aspect: 0.75, recordedAt: '2026-09-27T10:00:00Z', kind: 'photo' },
    { rid: 'r5', name: 'IMG_2.jpeg', width: 2268, height: 4032, aspect: 0.5625, recordedAt: null, kind: 'photo' }]);
  assert.equal(inv2.skipped.unanalysed, 1, 'photos never count as unanalysed');
  assert.deepEqual(drafts.map(d => d.name), ['THE END Credits size check', 'THE END Credits size check']);
  assert.ok(drafts.every(d => !d.committed), 'scratch Drafts are not committed');
  const inv3 = await load('inventory.js', { projectId: 'p', only: ['r5'], known: { r5: { width: 10, height: 20 } } })(sel2);
  assert.deepEqual(inv3.photos.map(r => [r.rid, r.width, r.height, r.aspect]), [['r5', 10, 20, 0.5]]);
  assert.equal(inv3.resources.length, 0);
  assert.equal(drafts.length, 2, 'a known size is not measured again');
  const inv4 = await load('inventory.js', { projectId: 'p', only: null, measureMs: 0 })(sel2);
  assert.deepEqual(inv4.photos.map(r => [r.width, r.aspect]), [[null, null], [null, null]], 'no measuring past the budget');
  // A video without a known size has a null aspect.
  const inv5 = await load('inventory.js', { projectId: 'p', only: null })({ project: () => ({ resources: async () => resources, sourceFiles: async () => ({ fileTree: [] }) }) });
  assert.deepEqual(inv5.resources.map(r => r.aspect), [null, null]);

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
  tries = 0;
  const s4 = await load('search.js', { projectId: 'p', rids: ['a', 'b'], queries: { q1: '1' }, pageSize: 4, budgetMs: 500 })(sel3);
  assert.deepEqual(s4.failed.sort(), ['a', 'b']);
  assert.equal(s4.stats.waitedMs, 0);

  // ensure-audio: an Audio resource at the path is reused; otherwise the file is imported.
  const imports = [];
  const selA = { project: () => ({ sourceFiles: async () => tree, resources: async () => resources,
    importFiles: async ({ paths }) => { imports.push(paths); return { addedResourceIds: ['r9'] }; } }) };
  assert.deepEqual(await load('ensure-audio.js', { projectId: 'p', path: '/m/song.mp3' })(selA), { resourceId: 'r2', imported: false });
  assert.deepEqual(await load('ensure-audio.js', { projectId: 'p', path: '/m/new.mp3' })(selA), { resourceId: 'r9', imported: true });
  assert.deepEqual(imports, [['/m/new.mp3']]);

  // TypeScript sanity, offline and always on:
  const cfgs = {
    'inventory.js': { projectId: 'p', only: null, known: { r4: { width: 810, height: 1080 } }, measureMs: 8000 },
    'search.js': { projectId: 'p', rids: ['r0'], queries: { 'wide landscape': 'a wide landscape' }, pageSize: 4, parallel: 4, budgetMs: 22000 },
    'ensure-audio.js': { projectId: 'p', path: '/m/song.mp3' },
    'assemble.js': { projectId: 'p', draftName: 'THE END Credits 1', layout: 'classic', picks: [{ rid: 'r0', kind: 'video', startSeconds: 1, holdSeconds: 3.9 }, { rid: 'r4', kind: 'photo', startSeconds: 0, holdSeconds: 4.4 }],
      boundaries: [0, 5.1, 9, 13.4], L: 5.1, music: { resourceId: 'r9', sectionStart: 12.3 }, clipSound: 'ambient', ambientDb: -18, sources: { r0: { aspect: 1.7778 }, r4: { aspect: 0.75 } }, musicFadeOut: 1.5 },
    'decorate.js': { layout: 'classic', sequenceId: 's', fps: 29.97, frames: [0, 153, 270, 402], titleText: 'THE END', rows: [{ role: 'Director', name: 'A' }], speedPxPerSec: 67,
      window: { x: 50.73, y: 12.69, w: 42.6 }, look: { tsx: 'x', on: true, strength: 0.3 }, clipSound: 'off', photos: { r4: { aspect: 0.75, motion: 'push-in', direction: 1, axis: 'x' } },
      sources: { r0: { aspect: 1.7778 } }, fades: { inSec: 0.5, outSec: 1.13 }, musicFadeOut: 1.5,
      graphic: { tsx: 'x', parameters: { title: 'THE END', rows: [{ role: 'Director', name: 'A' }] }, editableParameters: [{ key: 'title', label: 'Title', type: 'text', defaultValue: 'THE END' }] },
      frame: { tsx: 'x' }, photoMotion: { byRid: { r4: { motion: 'push-in', direction: 1, axis: 'x' } } } },
  };
  for (const name of SCRIPTS) {
    const src = source(name);
    // 1. One config slot, and at most one commit per run_script call.
    assert.equal(src.split('__CONFIG__').length, 2, name + ': one __CONFIG__');
    assert.ok(src.startsWith('const cfg = __CONFIG__;'), name + ': starts with the config');
    assert.ok((src.match(/\.commitAll\(/g) || []).length <= 1, name + ': one commitAll');
    // 2. The only TypeScript forms are `: any` and `as any` (stripped above; the body must then parse as JavaScript).
    assert.doesNotThrow(() => new Function('selects', `return (async()=>{${plain(src).replace('__CONFIG__', '{}')}})();`), name + ': parses once stripped');
    // 3. Properties are never added to an object literal typed by inference (TS "property does not exist"): an object
    //    that is later written as NAME.prop = ... must be declared `: any`.
    for (const m of src.matchAll(/\b(?:const|let)\s+(\w+)(\s*:\s*any)?\s*=\s*\{/g)) {
      const written = new RegExp('\\b' + m[1] + '\\.\\w+\\s*=(?!=)').test(src);
      assert.ok(!written || m[2], name + ': ' + m[1] + ' gets new properties, so declare it `: any`');
    }
    // 4. editableParameters inlined from the JSON config widen `type` to string: every one is cast `as any`.
    for (const m of src.matchAll(/editableParameters:\s*([^,}]+?)\s*(?=[,}])/g)) assert.ok(/ as any$/.test(m[1]), name + ': cast ' + m[1] + ' as any');
    // 5. The Draft id / names say THE END Credits; nothing from City Weekend Vlog is left behind.
    assert.ok(!/City Weekend|cwv/i.test(src), name + ': no City Weekend Vlog names');
    assert.ok(!/\/Users\//.test(src), name + ': no user paths');
  }
  // 6. The real compiler, when it is installed here (CI has neither TypeScript nor the SDK).
  const tc = typeCheck(cfgs);
  if (tc.skipped) console.log(JSON.stringify({ typeCheck: 'skipped', reason: tc.skipped }));
  else {
    assert.deepEqual(tc.errors, [], 'TypeScript ' + tc.version);
    console.log(JSON.stringify({ typeCheck: 'ok', typescript: tc.version }));
  }
  clearInterval(keepAlive);
  console.log(JSON.stringify({ scriptsRead: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
