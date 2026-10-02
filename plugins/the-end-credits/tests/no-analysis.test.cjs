// plugins/the-end-credits/tests/no-analysis.test.cjs
// Building without analysis: the app side of the kit quick score (tests/quick-score.test.cjs covers the block's own
// maths). The planner (planner.js) and the quick-score block (from panel.tsx) run together in node:vm; quickScoreAll is
// stubbed with synthetic scores, qsCandidates / pickWindowsLocal are the real ones. Also: the evenly spaced fallback,
// mixed-project normalisation, and a Clip highlights template run on a Project of unanalysed imports, end to end
// through inventory.js, search.js and the planner exactly as runEndCreditsTemplate calls them.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const planner = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const qa = panel.indexOf('// quick-score:start'), qb = panel.indexOf('// quick-score:end');
assert.ok(qa > 0 && qb > qa, 'the quick-score block is in the panel');
const names = [...planner.matchAll(/^(?:async\s+)?(?:function\s+(tec\w+)|const\s+(TEC_\w+))/gm)].map(m => m[1] || m[2]);
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date, Promise, AbortController, setTimeout, clearTimeout, console };
vm.createContext(box);
vm.runInContext(planner + '\n' + panel.slice(qa, qb) + '\n;globalThis.P={' + names.join(',') + ',pickWindowsLocal,qsCandidates,quickScoreAll,QS_HEAD,QS_BIN};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));
const PHRASE = 3.9;

// The scripts as run_script runs them (the same loader as scripts-read.test.cjs).
const plain = src => src.replace(/\s+as any\b/g, '').replace(/:\s*any(?:\[\])?(?=[\s=,);])/g, '');
const script = (name, cfg) => new Function('selects', `return (async()=>{${plain(fs.readFileSync(path.join(root, 'scripts', name), 'utf8')).replace('__CONFIG__', () => JSON.stringify(cfg))}})();`);

// A synthetic quick-score result in the kit's shape: 0.5 s bins from QS_HEAD. spec(t) -> partial bin fields.
const CLEAN = { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false };
function scored(rid, duration, spec, sceneCuts = []) {
  const windows = [];
  for (let t = P.QS_HEAD; t + P.QS_BIN <= duration + 1e-9; t += P.QS_BIN) {
    const x = spec(t) || {};
    windows.push({ start: t, end: t + P.QS_BIN, motion: x.motion ?? 0.02, sharp: x.sharp ?? 0.08, luma: x.luma ?? 0.45, clipped: 0, flags: { ...CLEAN, ...(x.flags || {}) } });
  }
  return { rid, windows, sceneCuts, ms: 1, fallback: false, cached: false, duration };
}
const stubAll = (results) => async (list, opts) => {
  const out = new Map();
  let done = 0;
  for (const r of list) { out.set(r.rid, results[r.rid] || { rid: r.rid, windows: [], sceneCuts: [], fallback: true, duration: r.durationSeconds }); if (opts.onProgress) opts.onProgress({ done: ++done, total: list.length, rid: r.rid }); }
  return out;
};
const res = (rid, duration) => ({ rid, path: '/v/' + rid + '.mp4', duration, analysed: false });
const windowOf = (c, seconds) => { const start = Math.max(c.minStart || 0, Math.min(c.sourceDuration - 0.05 - seconds, c.t - seconds / 2)); return [start, start + seconds]; };
const overlaps = (a, b, lo, hi) => a < hi && b > lo;
let checks = 0;
const t = async (name, fn) => { await fn(); checks++; };

(async () => {
  await t('roles map to quick-score kinds', () => {
    assert.deepEqual(j(P.TEC_STEADY_ROLES), ['wide', 'sunset'], 'the opening and ending first choices are steady');
    for (const role of P.TEC_SEARCH_ROLES) assert.equal(P.tecLocalKind(role), ['wide', 'sunset'].includes(role) ? 'steady' : 'montage', role);
    assert.deepEqual(j(P.tecLocalSeconds(PHRASE)), [5.1, 4.4, 3.9], 'the longest slot first');
  });

  // A 24 s clip: a fade-in to 1.5 s, a flash at 6 s, blur 14-16 s, and a calm first half / moving second half. The kit
  // leaves windows with black, fade or flash frames out (while anything else fits) and ranks blurry ones lower.
  const busy = scored('a', 24, (t) => ({
    flags: t < 1.5 ? { fade: true } : Math.abs(t - 6) < 0.3 ? { flash: true } : t >= 14 && t < 16 ? { blur: true } : {},
    sharp: t >= 14 && t < 16 ? 0.01 : 0.08,
    motion: t < 12 ? 0.003 : 0.06,
  }));
  const hard = [[0, 1.5], [5.75, 6.25 + 1e-9]], blur = [14, 16];
  await t('picking: windows skip the head, flagged bins and blur; roles get their kind', async () => {
    const seen = [];
    const out = j(await P.tecLocalShots([res('a', 24)], { P: PHRASE, scoreAll: stubAll({ a: busy }), candidatesOf: P.qsCandidates, onProgress: p => seen.push(p.done) }));
    assert.deepEqual(seen, [1], 'progress per clip');
    assert.equal(out.scored, 1); assert.deepEqual(out.even, []);
    assert.ok(out.list.length >= 6, 'candidates for every role');
    for (const c of out.list) {
      assert.equal(c.local, true); assert.equal(c.minStart, 0.5); assert.equal(c.sourceDuration, 24);
      assert.ok(c.score >= P.TEC_LOCAL_SCORE_LO - 1e-9 && c.score <= P.TEC_LOCAL_SCORE_LO + P.TEC_LOCAL_SCORE_SPAN + 1e-9, 'score in the search band');
      const [a, b] = [c.t - 2.55, c.t + 2.55]; // the 5.1 s window qsCandidates was asked for
      assert.ok(a >= 0.5 - 1e-9, 'starts after the head: ' + c.t);
      for (const [lo, hi] of hard) assert.ok(!overlaps(a, b, lo, hi), c.role + ' window ' + a + '-' + b + ' avoids ' + lo + '-' + hi);
    }
    // The best window of every role is clean (no blur either); steady (wide, sunset) ones sit in the calm half,
    // montage ones in the moving half.
    const best = role => out.list.filter(c => c.role === role).sort((x, y) => y.score - x.score)[0];
    for (const role of P.TEC_SEARCH_ROLES) assert.ok(!overlaps(best(role).t - 2.55, best(role).t + 2.55, blur[0], blur[1]), role + ': the best window avoids the blur');
    assert.ok(best('wide').t < 12 && best('sunset').t < 12, 'steady roles take the calm part');
    for (const role of ['street', 'water', 'architecture', 'people']) assert.ok(best(role).t > 12, role + ' takes the moving part');
    // The motion curve feeds the allocation's motion bonus and the still-shot move.
    assert.ok(out.curves.a && out.curves.a.times.length === busy.windows.length);
    near(out.curves.a.values[0], 0.003 * 510, 1e-9);
  });

  await t('picking: planned shots of unanalysed clips avoid the head and flagged frames', async () => {
    const clips = ['a', 'b', 'c', 'd'].map((rid, i) => res(rid, i ? 12 + i * 2 : 24));
    const results = { a: busy };
    for (const r of clips.slice(1)) results[r.rid] = scored(r.rid, r.duration, (t) => ({ flags: t < 1 ? { black: true } : {}, motion: 0.01 + 0.002 * t }));
    const out = j(await P.tecLocalShots(clips, { P: PHRASE, scoreAll: stubAll(results), candidatesOf: P.qsCandidates }));
    for (const layout of ['classic', 'full']) {
      const plan = j(P.tecPlanBuild({ layout, N: 7, P: PHRASE, candidates: out.list, seed: '3', motion: out.curves }));
      assert.ok(plan.ok, layout + ' plans');
      assert.equal(plan.localShots, plan.picks.length - plan.photoShots);
      for (let i = 0; i < plan.picks.length; i++) {
        const k = plan.picks[i];
        assert.ok(k.startSeconds >= 0.5 - 1e-9, 'no shot starts in the first 0.5 s');
        if (k.rid === 'a') for (const [lo, hi] of hard) assert.ok(!overlaps(k.startSeconds, k.endSeconds, lo, hi), layout + ' shot ' + i + ' of a avoids ' + lo + '-' + hi);
        else assert.ok(k.startSeconds >= 1, 'black head avoided');
        if (i) assert.notEqual(k.rid, plan.picks[i - 1].rid, 'no adjacent repeat');
      }
      assert.equal(new Set(plan.picks.slice(0, 4).map(k => k.rid)).size, 4, layout + ': fresh first (four clips before any repeat)');
    }
  });

  await t('mixed projects: one scale, neither kind swamps the other', async () => {
    // Analysed clips with unusually high raw scene-search scores, unanalysed clips with modest local scores.
    const search = [];
    ['s1', 's2', 's3'].forEach((rid, i) => { for (const role of P.TEC_SEARCH_ROLES) for (const [t, sc] of [[4, 0.95], [11, 0.9]]) search.push({ rid, role, t, score: sc - i * 0.01, sourceDuration: 20 }); });
    const clips = ['u1', 'u2', 'u3'].map(rid => res(rid, 20));
    const results = Object.fromEntries(clips.map(r => [r.rid, scored(r.rid, 20, (t) => ({ motion: 0.01 + 0.001 * t, sharp: 0.03 }))]));
    const local = j(await P.tecLocalShots(clips, { P: PHRASE, scoreAll: stubAll(results), candidatesOf: P.qsCandidates }));
    assert.ok(local.list.every(c => c.score < 0.6), 'local scores sit below the raw search scores here');
    const all = search.concat(local.list);
    const norm = j(P.tecNormaliseCandidates(all));
    assert.equal(norm.length, all.length);
    for (const c of norm) assert.ok(c.score >= 0.3 - 1e-9 && c.score <= 0.6 + 1e-9, 'normalised into the band');
    for (const kind of [true, false]) for (const role of P.TEC_SEARCH_ROLES) {
      const s = norm.filter(c => !!c.local === kind && c.role === role).map(c => c.score);
      // Ties share their mean rank (the three unanalysed clips here are identical), so the top is near the band's top.
      assert.ok(Math.max(...s) >= 0.55 && Math.min(...s) <= 0.35, (kind ? 'local ' : 'search ') + role + ' spans the band: ' + Math.min(...s) + '-' + Math.max(...s));
    }
    assert.ok(norm.every(c => typeof c.rawScore === 'number'), 'the raw score is kept');
    // Without the normalisation the analysed clips would take every preferred slot.
    const raw = j(P.tecAllocate({ candidates: all.concat(j(P.tecFillers(all))), slots: j(P.tecFootageSlots(P.tecTimeline({ layout: 'classic', N: 7, P: PHRASE }))), seed: '1' }));
    const plan = j(P.tecPlanBuild({ layout: 'classic', N: 7, P: PHRASE, candidates: all, seed: '1', motion: local.curves }));
    assert.ok(plan.ok);
    const count = (picks, isLocal) => picks.filter(k => k && (k.rid[0] === 'u') === isLocal).length;
    assert.ok(count(raw.picks, true) < count(plan.picks, true), 'normalising gives the unanalysed clips their share: ' + count(raw.picks, true) + ' -> ' + count(plan.picks, true));
    assert.ok(count(plan.picks, true) >= 2 && count(plan.picks, false) >= 2, 'both kinds are used');
    // The allocation's fresh-first rules still hold: a source is never reused within three shots (its recent-repeat
    // penalty) while others fit, and never in two adjacent ones.
    plan.picks.forEach((k, i) => { const back = plan.picks.slice(Math.max(0, i - 3), i).map(x => x.rid); assert.ok(!back.includes(k.rid), 'shot ' + i + ' (' + k.rid + ') is fresh within three'); });
    for (let i = 1; i < plan.picks.length; i++) assert.notEqual(plan.picks[i].rid, plan.picks[i - 1].rid, 'no adjacent repeat');
    // Photo share is kept.
    const photos = ['p1', 'p2', 'p3', 'p4'].map(rid => ({ rid, kind: 'photo' }));
    const withPhotos = j(P.tecPlanBuild({ layout: 'classic', N: 7, P: PHRASE, candidates: all.concat(photos), seed: '1', motion: local.curves }));
    assert.equal(withPhotos.photoShots, Math.round(7 * P.TEC_PHOTO_SHARE), 'the photo share holds');
    // A project with one kind keeps its scores: all-analysed plans exactly as before.
    assert.deepEqual(j(P.tecNormaliseCandidates(search)), search, 'search hits alone are untouched');
    assert.deepEqual(j(P.tecNormaliseCandidates(local.list)), local.list, 'local windows alone are untouched');
  });

  await t('fallback: evenly spaced windows when the quick score throws or falls back', async () => {
    const clips = [res('e1', 10), res('e2', 30), res('e3', 4)];
    const thrown = j(await P.tecLocalShots(clips, { P: PHRASE, scoreAll: async () => { throw new Error('boom'); }, candidatesOf: P.qsCandidates }));
    assert.deepEqual(thrown.even, ['e1', 'e2', 'e3']); assert.equal(thrown.scored, 0);
    assert.ok(thrown.list.every(c => c.even && c.local && c.minStart === 0.5 && c.score === P.TEC_EVEN_SCORE));
    const centres = rid => [...new Set(thrown.list.filter(c => c.rid === rid).map(c => c.t))];
    assert.deepEqual(centres('e1'), [5.225], 'a 10 s clip: one centred 5.1 s window');
    assert.deepEqual(centres('e2'), [3.05, 11.167, 19.283, 27.4], 'a long clip: four evenly spaced windows, the last ending at the source tail');
    assert.deepEqual(centres('e3'), [2.225], 'a short clip: one window over what there is');
    for (const c of thrown.list) assert.equal(thrown.list.filter(x => x.rid === c.rid && x.t === c.t).length, P.TEC_SEARCH_ROLES.length, 'every role');
    const more = j(await P.tecLocalShots(clips.concat([res('e4', 20)]), { P: PHRASE, scoreAll: async () => { throw new Error('boom'); }, candidatesOf: P.qsCandidates }));
    const plan = j(P.tecPlanBuild({ layout: 'classic', N: 5, P: PHRASE, candidates: more.list, seed: '1' }));
    assert.ok(plan.ok, 'the build still goes ahead');
    assert.ok(plan.picks.every(k => k.startSeconds >= 0.5 - 1e-9), 'fallback shots skip the head too (fillers keep minStart)');
    // The kit's own fallback result (no ffmpeg) is treated the same way.
    const kitFallback = j(await P.tecLocalShots([res('e1', 10)], { P: PHRASE, scoreAll: stubAll({}), candidatesOf: P.qsCandidates }));
    assert.deepEqual(kitFallback.even, ['e1']);
    // A cancel is never swallowed.
    const ac = new AbortController(); ac.abort();
    await assert.rejects(P.tecLocalShots(clips, { P: PHRASE, signal: ac.signal, scoreAll: async () => { const e = new Error('cancelled'); e.name = 'AbortError'; throw e; }, candidatesOf: P.qsCandidates }), /cancelled/);
    // search.js (a template run's unanalysed clips) uses the same rule as the planner.
    const sel = { project: () => ({ resources: async () => clips.map(r => ({ resourceId: r.rid, type: 'Video', hasAnalysis: false, durationSeconds: r.duration })), resource: () => ({ searchScenes: async () => { throw Error('no search'); } }) }) };
    for (const seconds of [4.4, 5.1]) {
      const s = await script('search.js', { projectId: 'p', rids: clips.map(r => r.rid), queries: P.TEC_SEARCH_QUERIES, pageSize: 4, windowSeconds: seconds })(sel);
      for (const r of clips) {
        const fromSearch = [...new Set(s.candidates.filter(c => c.rid === r.rid).map(c => c.t))];
        assert.deepEqual(fromSearch, j(P.tecEvenCentres(r.duration, seconds)).map(x => Math.round(x * 1000) / 1000), r.rid + ' at ' + seconds + ' s: search.js and the planner agree');
      }
    }
  });

  await t('a Clip highlights template run builds a Project of unanalysed imports (its code unchanged)', async () => {
    // What runEndCreditsTemplate reads from the inventory: resources, photos and skipped.unanalysed (its note only).
    const start = panel.indexOf('async function runEndCreditsTemplate('), end = panel.indexOf('\n}\n', start);
    const body = panel.slice(start, end);
    assert.deepEqual([...new Set(body.match(/\binv\.(?:skipped\?\.\w+|\w+)/g))].sort(), ['inv.photos', 'inv.resources', 'inv.skipped?.unanalysed'].sort());
    assert.ok(body.includes('fill(searchJs, { projectId: pid, rids: todo.slice(i, i + 4), queries: TEC_SEARCH_QUERIES, pageSize: 4 })'), 'it sends every handed video to search.js');
    assert.ok(body.includes('tecPlanBuild({ layout, N: requested, P, candidates: candidates.concat(photoCandsOf(inv, null, true)), seed: String(TEMPLATE_SEED), motion: {} })'));
    // Its flow, step by step, on four handed unanalysed imports (status 'pending' for good) and one photo.
    const vids = [['r0', 12], ['r1', 18], ['r2', 9], ['r3', 25]].map(([rid, d]) => ({ resourceId: rid, name: rid + '.mp4', type: 'Video', hasAnalysis: false, status: 'pending', durationSeconds: d }));
    const resources = vids.concat([{ resourceId: 'r4', name: 'p.jpg', type: 'Image', hasAnalysis: false, status: 'analysisNotApplicable', durationSeconds: 0 }]);
    const tree = { fileTree: vids.map(v => ({ type: 'video', name: v.name, resourceId: v.resourceId, path: '/v/' + v.name, frameSize: { width: 1920, height: 1080 } })) };
    let searched = 0;
    const sel = { project: () => ({ resources: async () => resources, sourceFiles: async () => tree, resource: () => ({ searchScenes: async () => { searched++; return { results: [], error: 'not analysed' }; } }) }) };
    const aliases = ['r0', 'r1', 'r2', 'r3', 'r4'];
    const inv = await script('inventory.js', { projectId: 'p', only: aliases, known: { r4: { width: 1080, height: 1350 } } })(sel);
    assert.equal(inv.resources.length, 4, 'every handed import is usable');
    assert.equal(inv.skipped?.unanalysed || 0, 0, 'zero blocking clips: no "not analyzed yet" note');
    const rids = inv.resources.map(r => r.rid);
    const dur = Object.fromEntries(inv.resources.map(r => [r.rid, r.duration]));
    const list = [], failed = [];
    for (let i = 0; i < rids.length; i += 4) {
      const r = await script('search.js', { projectId: 'p', rids: rids.slice(i, i + 4), queries: P.TEC_SEARCH_QUERIES, pageSize: 4 })(sel);
      list.push(...r.candidates); failed.push(...r.failed);
    }
    assert.equal(searched, 0, 'no scene search on unanalysed clips'); assert.deepEqual(failed, []);
    const candidates = list.map(c => ({ ...c, sourceDuration: dur[c.rid] || 0 }));
    const photoCands = (inv.photos || []).map(r => ({ rid: r.rid, kind: 'photo' }));
    for (const layout of ['classic', 'full']) {
      const plan = j(P.tecPlanBuild({ layout, N: P.TEC_LENGTHS.standard, P: PHRASE, candidates: candidates.concat(photoCands), seed: '1', motion: {} }));
      assert.ok(plan.ok, layout + ': the template gate passes');
      assert.ok(plan.picks.filter(k => k.kind === 'video').every(k => k.startSeconds >= 0.5 - 1e-9), 'shots skip the first 0.5 s');
    }
  });

  await t('the template code path still compiles (TypeScript, when installed)', () => {
    const os = require('node:os');
    let ts = null;
    const tries = [process.env.TEC_TYPESCRIPT, 'typescript'];
    try { for (const h of fs.readdirSync(path.join(os.homedir(), '.npm', '_npx'))) tries.push(path.join(os.homedir(), '.npm', '_npx', h, 'node_modules', 'typescript')); } catch (e) { /* none */ }
    for (const x of tries) { if (!x) continue; try { ts = require(require.resolve(x)); break; } catch (e) { /* next */ } }
    if (!ts) { console.log(JSON.stringify({ transpile: 'skipped' })); return; }
    const r = ts.transpileModule(panel, { compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true, fileName: 'panel.tsx' });
    assert.deepEqual(r.diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')), [], 'panel.tsx parses');
    for (const name of ['function runEndCreditsTemplate(', 'function TemplateRun(', 'const TEMPLATE_ALIAS_JS', 'props?.context?.template ? <TemplateRun']) assert.ok(r.outputText.includes(name), name);
  });

  console.log(JSON.stringify({ noAnalysis: 'ok', checks }));
})().catch(e => { console.error(e); process.exit(1); });

function near(a, b, eps, msg) { assert.ok(Math.abs(a - b) <= eps, (msg || '') + ' expected ' + b + ' got ' + a); }
