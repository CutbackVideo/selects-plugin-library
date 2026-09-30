// plugins/the-end-credits/tests/planner.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date };
vm.createContext(box);
vm.runInContext(source + ';globalThis.P={tecPhrase,tecOwnPhrase,tecLoudest,tecVideoSeconds,tecTimeline,tecSection,tecFitLength,tecTyping,tecTypedCount,tecProgress,TEC_BUILD_STEPS,TEC_LENGTHS,TEC_DEFAULT_LENGTH,TEC_LEAD_IN,TEC_TAIL,TEC_SEARCH_QUERIES,TEC_SEARCH_ROLES};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, (msg || '') + ' expected ' + b + ' got ' + a);
let checks = 0;
const t = (name, fn) => { fn(); checks++; };

t('the script is a plain embeddable block', () => {
  const lines = source.trim().split('\n');
  assert.equal(lines[0], '// tec-planner:start');
  assert.equal(lines[lines.length - 1], '// tec-planner:end');
  assert.ok(!/^\s*(import|export)\s/m.test(source), 'no module syntax');
  assert.ok(!/require\(/.test(source), 'no require');
  assert.ok(!/\/Users\//.test(source), 'no user paths');
  assert.ok(/^[\x00-\x7f]*$/.test(source), 'ASCII only (non-ASCII text as \\u escapes)');
  assert.ok(!/\bcwv[A-Z]|\bCWV_/.test(source), 'no CWV names leak in');
});

t('tempo multiple (R3)', () => {
  const at = bpm => j(P.tecPhrase({ bpm, accepted: true }));
  assert.equal(at(62).m, 4); near(at(62).P, 240 / 62, 1e-12); assert.equal(at(62).fixed, false);
  assert.equal(at(124).m, 8); near(at(124).P, 480 / 124, 1e-12);
  assert.equal(at(31).m, 2); near(at(31).P, 120 / 31, 1e-12);
  assert.deepEqual(at(150), { P: 3.9, m: null, fixed: true });
  // Bundled cue tempos 60-66 all give m = 4 and a phrase inside [3.4, 4.4].
  for (let bpm = 60; bpm <= 66; bpm += 0.5) { const r = at(bpm); assert.equal(r.m, 4); assert.ok(r.P >= 3.4 && r.P <= 4.4); }
  // At most one multiple fits, and when one does the phrase is inside the window.
  for (let bpm = 20; bpm <= 200; bpm += 0.25) {
    const fits = [2, 4, 8].filter(m => m * 60 / bpm >= 3.4 - 1e-9 && m * 60 / bpm <= 4.4 + 1e-9);
    assert.ok(fits.length <= 1);
    const r = at(bpm);
    if (fits.length) { assert.equal(r.m, fits[0]); assert.equal(r.fixed, false); } else assert.equal(r.fixed, true);
  }
  // Rejected detection, missing or bad bpm: fixed 3.9 s.
  assert.deepEqual(j(P.tecPhrase({ bpm: 62, accepted: false })), { P: 3.9, m: null, fixed: true });
  assert.deepEqual(j(P.tecPhrase({ bpm: NaN, accepted: true })), { P: 3.9, m: null, fixed: true });
  assert.deepEqual(j(P.tecPhrase({})), { P: 3.9, m: null, fixed: true });
});

t('own music: detection -> phrase (accepted, approximate, none)', () => {
  const own = d => j(P.tecOwnPhrase(d));
  // Accepted: the grid's phrase from its first beat.
  const acc = own({ bpm: 120, firstBeat: 0.04, accepted: true, grid: 'accepted' });
  assert.equal(acc.m, 8); near(acc.P, 4, 1e-12); assert.equal(acc.fixed, false); assert.equal(acc.approximate, false); assert.equal(acc.firstBeat, 0.04);
  // Approximate at 120 bpm (hitRate below the sparse rule, e.g. 0.25): the same phrase on the detected tempo and first
  // beat, not the fixed 3.9 s, and flagged approximate for the panel notice.
  const ap = own({ bpm: 120, firstBeat: 0.4, accepted: false, grid: 'approximate', hitRate: 0.25 });
  assert.deepEqual(ap, { P: 4, m: 8, fixed: false, approximate: true, firstBeat: 0.4 });
  // The real approximate case: the bundled orchestral cue dropped as own music reads 119.95 bpm (double-time), first beat 0.536.
  const orch = own({ bpm: 119.95, firstBeat: 0.536, accepted: false, grid: 'approximate' });
  assert.equal(orch.m, 8); near(orch.P, 480 / 119.95, 1e-12); assert.equal(orch.approximate, true); assert.equal(orch.firstBeat, 0.536);
  // The section then snaps to phrases from that first beat (not the fixed 0.1 s steps).
  const sec = j(P.tecSection({ firstBeat: ap.firstBeat, P: ap.P, videoSeconds: P.tecVideoSeconds(7, ap.P), usableEnd: 200, swell: 100, fixed: ap.fixed }));
  assert.equal(sec.fixed, false); near((sec.start + 5.1 - 0.4) / 4, Math.round((sec.start + 5.1 - 0.4) / 4), 1e-9, 'reveal on a phrase downbeat');
  // Approximate but no multiple in [3.4, 4.4] (100 bpm: 2.4 / 4.8 s), or outside the detector's 70-180 range: fixed.
  const fixed = { P: 3.9, m: null, fixed: true, approximate: false, firstBeat: 0 };
  assert.deepEqual(own({ bpm: 100, firstBeat: 0.3, accepted: false, grid: 'approximate' }), fixed);
  assert.deepEqual(own({ bpm: 62, firstBeat: 0.3, accepted: false, grid: 'approximate' }), fixed);
  assert.deepEqual(own({ bpm: 190, firstBeat: 0.3, accepted: false, grid: 'approximate' }), fixed);
  // None, whatever hitRate says (it reads 1 on noise or a single onset): fixed.
  assert.deepEqual(own({ bpm: 70.58, firstBeat: 0.005, accepted: false, grid: 'none', hitRate: 1 }), fixed);
  assert.deepEqual(own({ bpm: 120, firstBeat: 0.4, accepted: false, hitRate: 1 }), fixed);
  // The panel's failed-detection object (no bpm, no grid) and no result: fixed.
  assert.deepEqual(own({ accepted: false, durationSeconds: 200, peaks: [] }), fixed);
  assert.deepEqual(own(null), fixed);
});

t('lengths and total durations (R7)', () => {
  assert.deepEqual(j(P.TEC_LENGTHS), { short: 5, standard: 7, long: 10 });
  assert.equal(P.TEC_DEFAULT_LENGTH, 'standard');
  assert.equal(P.TEC_LEAD_IN, 5.1); assert.equal(P.TEC_TAIL, 0.5);
  const p62 = 240 / 62;
  assert.equal(P.tecVideoSeconds(7, p62).toFixed(2), '32.70');
  near(P.tecVideoSeconds(5, p62), 24.9548, 1e-4);
  near(P.tecVideoSeconds(7, p62), 32.6968, 1e-4);
  near(P.tecVideoSeconds(10, p62), 44.3097, 1e-4);
  // No music (P = 3.9): 25.1 / 32.9 / 44.6 s.
  near(P.tecVideoSeconds(5, 3.9), 25.1, 1e-9); near(P.tecVideoSeconds(7, 3.9), 32.9, 1e-9); near(P.tecVideoSeconds(10, 3.9), 44.6, 1e-9);
});

t('timeline: Classic', () => {
  const p = 240 / 62, tl = j(P.tecTimeline({ layout: 'classic', N: 7, P: p }));
  assert.equal(tl.layout, 'classic'); assert.equal(tl.L, 5.1); assert.equal(tl.T, 0.5);
  assert.equal(tl.boundaries.length, 9);
  assert.equal(tl.boundaries[0], 0); assert.equal(tl.boundaries[1], 5.1);
  for (let k = 1; k < 7; k++) near(tl.boundaries[k + 1], 5.1 + k * p, 1e-9);
  near(tl.boundaries[8], 32.6968, 1e-4); near(tl.total, tl.boundaries[8], 0);
  assert.equal(tl.slots.length, 8);
  assert.deepEqual(tl.slots[0], { index: 0, kind: 'opening', role: null, seconds: 5.1 });
  assert.ok(tl.slots.slice(1).every(s => s.kind === 'shot'));
  assert.equal(tl.slots[1].role, 'wide');
  assert.equal(tl.slots[7].role, 'ending');
  near(tl.slots[7].seconds, p + 0.5, 1e-9);
  for (let k = 1; k < 7; k++) near(tl.slots[k].seconds, p, 1e-9);
  // Roles vary: no two adjacent shots share a role.
  for (let k = 2; k <= 7; k++) assert.notEqual(tl.slots[k].role, tl.slots[k - 1].role);
  // Every slot role maps to searched roles.
  for (const s of tl.slots.slice(1)) assert.ok(['wide', 'ending', ...P.TEC_SEARCH_ROLES].includes(s.role));
});

t('timeline: Full frame adds shot 0 (N + 1 visible shots, same cuts)', () => {
  const p = 3.9, c = j(P.tecTimeline({ layout: 'classic', N: 5, P: p })), f = j(P.tecTimeline({ layout: 'full', N: 5, P: p }));
  assert.deepEqual(f.boundaries, c.boundaries);
  assert.deepEqual(f.slots[0], { index: 0, kind: 'shot', role: 'opening-wide', seconds: 5.1 });
  assert.equal(f.slots.filter(s => s.kind === 'shot').length, 6);
  assert.equal(f.slots[5].role, 'ending');
  for (let k = 1; k <= 5; k++) assert.notEqual(f.slots[k].role, f.slots[k - 1].role);
  assert.throws(() => P.tecTimeline({ layout: 'classic', N: 0, P: 3.9 }));
});

t('search queries', () => {
  assert.deepEqual(j(P.TEC_SEARCH_QUERIES), {
    wide: 'wide landscape', sunset: 'sunset or golden light', water: 'water or ocean', street: 'street or road',
    architecture: 'architecture', people: 'people walking or silhouettes',
  });
});

t('section: s = firstBeat + j*P - L, bounds and default (R3)', () => {
  const p = 240 / 62, L = 5.1, need = P.tecVideoSeconds(7, p);
  const base = { firstBeat: 0.3, P: p, L, videoSeconds: need, usableEnd: 89.9 };
  // Default: the smallest j with firstBeat + j*P >= swell, so the swell downbeat lands at L.
  const s = j(P.tecSection({ ...base, swell: 16 }));
  const jWant = Math.ceil((16 - 0.3) / p);
  assert.equal(s.j, jWant); assert.equal(s.defaultJ, jWant);
  near(s.start, 0.3 + jWant * p - L, 1e-9);
  near(s.start + L, 0.3 + jWant * p, 1e-9, 'a phrase downbeat sits at L');
  assert.ok(0.3 + s.j * p >= 16 - 1e-9 && 0.3 + (s.j - 1) * p < 16);
  // A swell exactly on a downbeat is used as is.
  const onBeat = j(P.tecSection({ ...base, swell: 0.3 + 4 * p }));
  assert.equal(onBeat.j, 4); near(onBeat.start, 0.3 + 4 * p - L, 1e-9);
  // Bounds: s >= 0 and s + video <= usableEnd for jMin..jMax, and just outside them they fail.
  assert.ok(s.min >= -1e-9 && s.max + need <= 89.9 + 1e-9);
  assert.ok(0.3 + (s.jMin - 1) * p - L < 0);
  assert.ok(0.3 + (s.jMax + 1) * p - L + need > 89.9);
  assert.equal(s.jMin, 2); // 0.3 + 2P - 5.1 = 2.94 >= 0; j = 1 gives -0.93
  // Swell earlier than L: s would be < 0, so the smallest j with s >= 0.
  const early = j(P.tecSection({ ...base, swell: 2 }));
  assert.equal(early.j, early.jMin); assert.ok(early.start >= 0);
  // Swell too late for the end constraint: the largest feasible j.
  const late = j(P.tecSection({ ...base, swell: 80 }));
  assert.equal(late.j, late.jMax); assert.ok(late.start + need <= 89.9 + 1e-9);
  // No swell: jMin.
  assert.equal(j(P.tecSection(base)).j, 2);
  // The slider snaps to the nearest feasible j and clamps.
  const v = j(P.tecSection({ ...base, swell: 16, value: 0.3 + 9 * p - L + 0.4 }));
  assert.equal(v.j, 9); assert.equal(v.defaultJ, jWant);
  assert.equal(j(P.tecSection({ ...base, value: -50 })).j, s.jMin);
  assert.equal(j(P.tecSection({ ...base, value: 500 })).j, s.jMax);
  // Infeasible: the track is too short for the Length.
  assert.equal(P.tecSection({ ...base, usableEnd: 30 }), null);
  // Exactly fitting track: one feasible start.
  const tight = j(P.tecSection({ ...base, firstBeat: 0, usableEnd: 2 * p - L + need }));
  assert.equal(tight.jMin, tight.jMax); assert.equal(tight.j, 2);
});

t('section: the default reveal lands on every bundled cue\'s swell (R3)', () => {
  // The manifest keeps the swell to the ms, so a swell on the grid may sit a fraction of a ms after its downbeat;
  // the default j must still be that downbeat's (piano-strings: 9.798 vs 2.056 + 2P = 9.79794, j = 2, not 3).
  const cues = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'cues', 'manifest.json'), 'utf8')).cues;
  let onSwell = 0;
  for (const cue of cues) {
    const p = (cue.phraseBeats > 0 ? cue.phraseBeats : 4) * 60 / cue.bpm, fb = cue.firstBeat;
    const swell = cue.swell ?? cue.swellFallback;
    for (const key of Object.keys(P.TEC_LENGTHS)) {
      const s = j(P.tecSection({ firstBeat: fb, P: p, L: 5.1, videoSeconds: P.tecVideoSeconds(P.TEC_LENGTHS[key], p), usableEnd: cue.usableEnd, swell }));
      if (!s) continue;
      const k = Math.round((swell - fb) / p);
      assert.ok(Math.abs(fb + k * p - swell) <= 0.002, cue.id + ' swell is on the grid');
      assert.equal(s.j, s.defaultJ);
      if (k >= s.jMin && k <= s.jMax) {
        assert.equal(s.defaultJ, k, cue.id + ' ' + key + ' default j');
        near(s.start + 5.1, swell, 1e-3, cue.id + ' ' + key + ' reveal on the swell');
        onSwell++;
      } else assert.equal(s.defaultJ, k > s.jMax ? s.jMax : s.jMin, cue.id + ' ' + key + ' clamped');
    }
  }
  assert.ok(onSwell >= cues.length, 'every cue reveals on its swell at some Length');
});

t('own music: the loudest part', () => {
  // Steady beat: the m-beat phrase with the highest mean beat energy, from firstBeat; ties keep the earliest.
  const e = [1, 1, 1, 1, 2, 2, 2, 2, 5, 5, 5, 5, 1, 1];
  near(P.tecLoudest({ firstBeat: 0.4, beatEnergy: e }, 3.6, 4, false), 0.4 + 2 * 3.6, 1e-12);
  near(P.tecLoudest({ firstBeat: 0.4, beatEnergy: [3, 3, 3, 3, 3, 3, 3, 3] }, 3.6, 4, false), 0.4, 1e-12);
  // Only whole phrases count: the last partial phrase (5, 9) is ignored.
  near(P.tecLoudest({ firstBeat: 0, beatEnergy: [1, 1, 2, 2, 9] }, 2, 2, false), 2, 1e-12);
  // Fixed timing (or too few beats): the P-long window of the waveform peaks with the highest mean.
  const peaks = Array.from({ length: 100 }, (_, i) => (i >= 40 && i < 50 ? 1 : 0.1));
  near(P.tecLoudest({ peaks, durationSeconds: 100, beatEnergy: e }, 10, null, true), 40, 1e-9);
  near(P.tecLoudest({ peaks, durationSeconds: 100, beatEnergy: [1] }, 10, 4, false), 40, 1e-9);
  near(P.tecLoudest({ peaks: [0.5, 0.5, 0.5, 0.5], durationSeconds: 8 }, 4, null, true), 0, 1e-9);
  // Nothing to measure: null (the section then defaults to its start).
  assert.equal(P.tecLoudest({ peaks: [], durationSeconds: 30 }, 3.9, null, true), null);
  assert.equal(P.tecLoudest({ peaks: [1, 2], durationSeconds: null }, 3.9, null, true), null);
  assert.equal(P.tecLoudest(null, 3.9, null, true), null);
});

t('section: fixed timing is continuous in 0.1 s steps', () => {
  const need = P.tecVideoSeconds(7, 3.9), base = { P: 3.9, videoSeconds: need, usableEnd: 60, fixed: true };
  const s = j(P.tecSection({ ...base, swell: 20 }));
  assert.equal(s.fixed, true); assert.equal(s.j, null);
  near(s.start, 14.9, 1e-9); assert.equal(s.min, 0); near(s.max, Math.floor((60 - need) * 10) / 10, 1e-9);
  near(j(P.tecSection({ ...base, swell: 2 })).start, 0, 1e-9);
  near(j(P.tecSection({ ...base, swell: 59 })).start, s.max, 1e-9);
  near(j(P.tecSection({ ...base, value: 7.26 })).start, 7.3, 1e-9);
  assert.ok(j(P.tecSection({ ...base, value: 999 })).start + need <= 60 + 1e-9);
  assert.equal(P.tecSection({ ...base, usableEnd: 30 }), null);
  near(j(P.tecSection(base)).start, 0, 1e-9);
});

t('fit length: the longest Length that fits', () => {
  const p = 240 / 62;
  // A 90 s cue fits Long.
  assert.equal(j(P.tecFitLength({ firstBeat: 0.3, P: p, usableEnd: 89.9 })).key, 'long');
  // Capped at the requested Length.
  assert.equal(j(P.tecFitLength({ firstBeat: 0.3, P: p, usableEnd: 89.9, requested: 'standard' })).key, 'standard');
  // jMin = 2 puts s at 2.94 s: Standard needs 2.94 + 32.70 <= usableEnd, Long does not fit in 40 s.
  const mid = j(P.tecFitLength({ firstBeat: 0.3, P: p, usableEnd: 40 }));
  assert.deepEqual([mid.key, mid.N], ['standard', 7]);
  const shortOnly = j(P.tecFitLength({ firstBeat: 0.3, P: p, usableEnd: 29 }));
  assert.deepEqual([shortOnly.key, shortOnly.N], ['short', 5]);
  // Too short for Short: key null and the needed track length.
  const none = j(P.tecFitLength({ firstBeat: 0.3, P: p, usableEnd: 20 }));
  assert.equal(none.key, null);
  const earliest = 0.3 + 2 * p - 5.1;
  near(none.needSeconds, Math.ceil((earliest + P.tecVideoSeconds(5, p) + 0.1) * 10) / 10, 1e-9);
  assert.ok(P.tecSection({ firstBeat: 0.3, P: p, videoSeconds: P.tecVideoSeconds(5, p), usableEnd: none.needSeconds - 0.1 }) !== null);
  // Fixed timing: Short needs 25.1 s + 0.1 s.
  const fx = j(P.tecFitLength({ P: 3.9, usableEnd: 20, fixed: true }));
  assert.equal(fx.key, null); near(fx.needSeconds, 25.2, 1e-9);
  assert.equal(j(P.tecFitLength({ P: 3.9, usableEnd: 33, fixed: true })).key, 'standard');
});

t('typing (R5)', () => {
  const a = j(P.tecTyping('THE END'));
  assert.equal(a.slots, 7); assert.equal(a.slotSec, 0.42); assert.equal(a.startSec, 0.47);
  near(a.times[0], 0.47, 1e-12); near(a.times[6], 0.47 + 6 * 0.42, 1e-12); // D at 2.99 s (reference 2.93 s)
  assert.equal(a.glyphs[3], ' ', 'the space takes a slot');
  // slot = min(0.42, 4.4 / n): typing always completes by 4.87 s < L.
  for (const n of [1, 5, 10, 11, 12, 13, 20, 40, 100]) {
    const r = j(P.tecTyping('x'.repeat(n)));
    near(r.slotSec, Math.min(0.42, 4.4 / n), 1e-12);
    assert.ok(r.doneSec <= 4.87 + 1e-9 && r.doneSec < 5.1);
    assert.ok(r.times[n - 1] < 4.87);
  }
  near(j(P.tecTyping('x'.repeat(20))).slotSec, 0.22, 1e-12);
  // Grapheme-aware (code points): an astral character is one slot.
  assert.equal(j(P.tecTyping('A\u{1F3AC}B')).slots, 3);
  assert.equal(j(P.tecTyping('')).slots, 0);
  const ty = P.tecTyping('THE END');
  assert.equal(P.tecTypedCount(ty, 0.2), 0);
  assert.equal(P.tecTypedCount(ty, 0.47), 1);
  assert.equal(P.tecTypedCount(ty, 0.47 + 0.42 * 3 + 0.01), 4);
  assert.equal(P.tecTypedCount(ty, 10), 7);
});

t('progress: 5 UI steps', () => {
  assert.deepEqual(j(P.TEC_BUILD_STEPS).map(s => s.id), ['prepare', 'plan', 'music', 'assemble', 'decorate']);
  assert.equal(P.TEC_BUILD_STEPS.reduce((a, s) => a + s.weight, 0), 100);
  const a = j(P.tecProgress('prepare', 0));
  assert.equal(a.percent, 0); assert.equal(a.current, 0);
  assert.ok(a.label.startsWith('Step 1/5 \u00b7 '));
  const b = j(P.tecProgress('assemble', 0.5, 'shot 3 of 7'));
  assert.equal(b.percent, 65); assert.ok(b.label.includes('Step 4/5') && b.label.includes('(shot 3 of 7)'));
  assert.equal(j(P.tecProgress('decorate', 1)).percent, 100);
  assert.equal(j(P.tecProgress('decorate', 0.999)).percent, 99);
  assert.equal(j(P.tecProgress('music', 7)).percent, 50);
  assert.throws(() => P.tecProgress('nope', 0));
});

console.log('planner.test.cjs: ' + checks + ' checks passed');
