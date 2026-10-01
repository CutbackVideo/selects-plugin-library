// plugins/selfie-aesthetic/tests/allocate.test.cjs — bar allocation and the whole plan (saeAllocate, saePlanBuild).
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'cues', 'manifest.json'), 'utf8'));
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
vm.runInContext(source + ';globalThis.P={saeAllocate,saePlanBuild,saeMoments,saeEditBpm,saeMusicOffset,saeTemplate,saePhotoBars,SAE_LEAD,SAE_END_TAIL};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));
const FPS = [24000 / 1001, 25, 30000 / 1001, 30];
const cue = manifest.cues[0];

// A pool: face clips (a face hit well over control), non-face clips (control wins), photos.
function pool({ face = 0, other = 0, photos = 0, dur = 9 }) {
  const candidates = [], durations = {};
  for (let i = 0; i < face; i++) {
    const rid = 'f' + i;
    durations[rid] = dur + i * 0.5;
    candidates.push({ rid, role: 'control', t: 0.5, score: 0.18 });
    candidates.push({ rid, role: 'selfie', t: 1 + (i % 3) * 0.2, score: 0.30 + i * 0.003 });
    candidates.push({ rid, role: 'hand', t: 4.2, score: 0.28 });
    candidates.push({ rid, role: 'expression', t: 6.5, score: 0.27 });
  }
  for (let i = 0; i < other; i++) {
    const rid = 'n' + i;
    durations[rid] = dur;
    candidates.push({ rid, role: 'control', t: 2, score: 0.33 });
    candidates.push({ rid, role: 'selfie', t: 3, score: 0.2 });
  }
  return { candidates, durations, photos: Array.from({ length: photos }, (_, i) => ({ rid: 'p' + i })) };
}
const build = (p, o) => j(P.saePlanBuild({ fps: 30, bars: 6, seed: 1, cue, ...p, ...o }));
const barsOf = plan => Array.from({ length: plan.bars }, (_, k) => plan.holds.find(h => h.bar === k));
const shots = plan => plan.holds.map(h => h.rid + '@' + h.srcStart).join(',');

function checkPlan(plan, p, label) {
  assert.ok(plan.ok, label + ': ok');
  const fps = plan.fps;
  assert.equal(plan.holds.length, 6 * (plan.bars - 1) + 7, label + ': hold count');
  assert.equal(plan.cuts.length, plan.holds.length - 1);
  assert.equal(plan.holds[0].startFrame, 0);
  plan.holds.forEach((h, i) => {
    assert.equal(h.i, i);
    if (i) assert.equal(h.startFrame, plan.holds[i - 1].endFrame, label + ': contiguous');
    if (i) assert.equal(plan.cuts[i - 1], Math.round(plan.cutSeconds[i] * fps));
    if (i) assert.equal(h.startFrame, Math.round((plan.cutSecondsRaw[i] + plan.offset) * fps));
    assert.ok(h.frames >= 3, label + ': hold >= 3 frames');
    assert.equal(h.frames, h.endFrame - h.startFrame);
  });
  assert.equal(plan.totalFrames, plan.holds[plan.holds.length - 1].endFrame);
  // One source per bar; A holds of a bar replay one srcStart and B holds another.
  for (let k = 0; k < plan.bars; k++) {
    const bar = plan.holds.filter(h => h.bar === k);
    assert.equal(new Set(bar.map(h => h.rid)).size, 1, label + ': one source per bar');
    for (const m of ['A', 'B']) assert.equal(new Set(bar.filter(h => h.moment === m).map(h => h.srcStart)).size, 1);
    if (bar[0].kind === 'photo') {
      assert.ok(bar.every(h => h.srcStart === 0 && h.framing === (h.moment === 'A' ? 'full' : 'punch')), label + ': photo framing');
    } else {
      assert.ok(bar.every(h => h.framing === null));
      const a = bar.find(h => h.moment === 'A').srcStart, b = bar.find(h => h.moment === 'B').srcStart;
      assert.ok(Math.abs(a - b) >= 0.8 - 1e-9, label + ': A/B >= 0.8 s apart');
    }
  }
  // Played windows lie inside the source with a 0.15 s tail, start on whole frames and avoid bad spans.
  for (const h of plan.holds.filter(x => x.kind === 'video')) {
    const dur = p.durations[h.rid];
    assert.ok(Math.abs(h.srcStart * fps - Math.round(h.srcStart * fps)) < 1e-6, label + ': frame-aligned srcStart');
    assert.ok(h.srcStart >= 0 && h.srcStart + h.frames / fps <= dur - 0.15 + 1e-9, label + ': inside the source with tail');
    for (const [s, e] of (p.badSpans && p.badSpans[h.rid]) || []) assert.ok(!(h.srcStart < e && h.srcStart + h.frames / fps > s), label + ': clear of bad spans');
  }
  // Whips.
  assert.equal(plan.holds[0].cutIn, 'none'); assert.equal(plan.holds[plan.holds.length - 1].cutOut, 'none');
  for (let i = 0; i + 1 < plan.holds.length; i++) {
    const kind = plan.holds[i + 1].bar !== plan.holds[i].bar ? 'spin' : 'dir';
    assert.equal(plan.holds[i].cutOut, kind); assert.equal(plan.holds[i + 1].cutIn, kind);
    assert.equal(plan.holds[i].angleOut, plan.holds[i + 1].angleIn);
  }
  // No adjacent same rid when >= 2 sources exist (unless the plan says it relaxed that).
  const sources = Object.keys(p.durations).length + (p.usePhotos === false ? 0 : (p.photos || []).length);
  if (sources >= 2 && !plan.notes.includes('adjacent')) {
    const b = barsOf(plan);
    for (let k = 1; k < b.length; k++) assert.notEqual(b[k].rid, b[k - 1].rid, label + ': adjacent bars use different sources');
  }
  // Photos: at most 2 photo bars in a row.
  if (!plan.notes.includes('photo-run')) {
    const kinds = barsOf(plan).map(h => h.kind).join(',');
    assert.ok(!/photo,photo,photo/.test(kinds), label + ': max 2 photo bars in a row');
  }
  // A repeated clip uses a different pair.
  const pairs = {};
  for (const h of barsOf(plan).filter(x => x.kind === 'video')) {
    const bar = plan.holds.filter(x => x.bar === h.bar);
    const key = bar.find(x => x.moment === 'A').srcStart + ':' + bar.find(x => x.moment === 'B').srcStart;
    if (!plan.notes.includes('pair-reuse')) assert.ok(!(pairs[h.rid] || []).includes(key), label + ': repeat uses a different pair');
    (pairs[h.rid] = pairs[h.rid] || []).push(key);
  }
  for (const key of ['fps', 'bpm', 'editBpm', 'firstBeat', 'sectionStart', 'lead', 'bars', 'totalFrames', 'holds', 'cuts', 'cutSeconds', 'cutSecondsRaw', 'musicSourceStart', 'beats', 'notes', 'fit']) assert.ok(key in plan, 'plan.' + key);
  for (const key of ['i', 'bar', 'kind', 'rid', 'moment', 'srcStart', 'frames', 'startFrame', 'endFrame', 'cutIn', 'cutOut', 'angle', 'framing']) assert.ok(key in plan.holds[0], 'hold.' + key);
}

// ---- Fresh-first: every source once before any repeat ----
{
  const p = pool({ face: 4, other: 4 });
  const plan = build(p, { usePhotos: false });
  checkPlan(plan, p, 'fresh');
  const rids = barsOf(plan).map(h => h.rid);
  assert.equal(new Set(rids).size, 6, 'six bars, six different clips');
  assert.equal(rids.filter(r => r[0] === 'f').length, 4, 'all face clips used');
  assert.equal(rids[0][0], 'f', 'bar 0 takes a face clip');
  assert.equal(rids[5][0], 'f', 'the finale takes a face clip');
  assert.ok(!plan.notes.includes('reused'));
  assert.ok(plan.notes.includes('few-face'), '4 face clips for 6 bars');
  assert.equal(plan.faceClips, 4);
}
{
  // Plenty of face clips: only face clips, no repeats.
  const p = pool({ face: 8, other: 3 });
  const plan = build(p, { usePhotos: false, bars: 8 });
  checkPlan(plan, p, 'plenty');
  assert.ok(barsOf(plan).every(h => h.rid[0] === 'f'));
  assert.equal(new Set(barsOf(plan).map(h => h.rid)).size, 8);
  assert.deepEqual(plan.notes, []);
}

// ---- Photos: about a third of the bars, max 2 in a row, inner bars first ----
for (const N of [3, 4, 5, 6, 7, 8]) for (const seed of [1, 2, 3, 4, 5]) {
  const p = pool({ face: 8, photos: 8 });
  const plan = build(p, { bars: N, seed });
  checkPlan(plan, p, 'photos N=' + N);
  const kinds = barsOf(plan).map(h => h.kind);
  assert.equal(kinds.filter(k => k === 'photo').length, Math.round(N / 3), 'photo bars = round(N/3)');
  assert.equal(kinds[0], 'video', 'bar 0 is a video'); assert.equal(kinds[N - 1], 'video', 'the finale is a video');
}
{
  // Few face clips: photos rank above non-face clips, still max 2 in a row.
  const p = pool({ face: 1, other: 5, photos: 6 });
  const plan = build(p, { bars: 6 });
  checkPlan(plan, p, 'few-face photos');
  const kinds = barsOf(plan).map(h => h.kind);
  assert.ok(kinds.filter(k => k === 'photo').length > Math.round(6 / 3), 'photos replace non-face clips');
  assert.equal(barsOf(plan)[0].rid, 'f0', 'bar 0 takes the face clip');
  assert.equal(kinds[5], 'video', 'the finale stays a video while videos exist');
  assert.ok(plan.notes.includes('few-face'));
  // usePhotos off: no photo bars.
  const off = build(p, { bars: 6, usePhotos: false });
  checkPlan(off, { ...p, usePhotos: false }, 'photos off');
  assert.ok(off.holds.every(h => h.kind === 'video'));
}
{
  // Only photos: a photo-only build still works (runs relaxed, noted).
  const p = pool({ photos: 5 });
  const plan = build(p, { bars: 4 });
  checkPlan(plan, p, 'photo-only');
  assert.ok(plan.holds.every(h => h.kind === 'photo'));
  assert.ok(plan.notes.includes('photo-run'));
}

// ---- Few face clips: reuse with different pairs, never adjacent ----
{
  const p = pool({ face: 2 });
  const plan = build(p, { bars: 6, usePhotos: false });
  checkPlan(plan, p, 'reuse');
  const rids = barsOf(plan).map(h => h.rid);
  assert.equal(new Set(rids).size, 2);
  assert.ok(plan.notes.includes('few-face') && plan.notes.includes('reused'));
  assert.deepEqual(plan.fit, { bars: 6, wanted: 6 });
}
{
  // One source: adjacency cannot apply; every bar uses a different pair of the same clip.
  const p = pool({ face: 1, dur: 12 });
  const plan = build(p, { bars: 4, usePhotos: false });
  checkPlan(plan, p, 'single');
  assert.equal(new Set(plan.holds.map(h => h.rid)).size, 1);
  assert.ok(plan.notes.includes('reused'));
}

// ---- Shrink ----
{
  // A long clip and a 2 s clip with a single A/B pair: A B A is the longest strict fill, so 4 or 6 bars shrink to 3.
  const p = { candidates: [], durations: { long: 12, short: 2 } };
  const m = j(P.saeMoments({ candidates: [], durations: p.durations, fps: 30, beatSeconds: 60 / cue.bpm + 1 / 30 }));
  assert.equal(m.clips.find(c => c.rid === 'short').pairs.length, 1);
  for (const N of [4, 6]) {
    const plan = build(p, { bars: N });
    checkPlan(plan, p, 'shrink');
    assert.deepEqual(plan.fit, { bars: 3, wanted: N });
    assert.equal(plan.bars, 3);
    assert.ok(plan.notes.includes('shrunk'));
    assert.deepEqual(barsOf(plan).map(h => h.rid), ['long', 'short', 'long']);
  }
  // A single clip too short for a strict pair: three bars with the pair reused (noted).
  const tiny = { candidates: [], durations: { t: 1.3 } };
  const plan = build(tiny, { bars: 4 });
  assert.ok(plan.ok);
  assert.equal(plan.bars, 3);
  assert.ok(plan.notes.includes('shrunk') && plan.notes.includes('pair-reuse'));
  // Nothing at all.
  const none = build({ candidates: [], durations: {} }, {});
  assert.equal(none.ok, false); assert.deepEqual(none.notes, ['no-sources']);
}

// ---- Bad spans ----
{
  const p = pool({ face: 3 });
  p.badSpans = { f0: [[0, 3.5]], f1: [[3.9, 5]], f2: [[6, 9]] };
  const plan = build(p, { bars: 6, usePhotos: false });
  checkPlan(plan, p, 'bad spans');
}

// ---- Determinism, seeds, input order ----
{
  const p = pool({ face: 5, other: 2, photos: 4 });
  const a = build(p, { seed: 1 }), b = build(p, { seed: 1 });
  assert.deepEqual(a, b, 'same seed, same plan');
  const shuffled = { ...p, candidates: p.candidates.slice().reverse(), photos: p.photos.slice().reverse() };
  assert.deepEqual(build(shuffled, { seed: 1 }), a, 'input order does not matter');
  const c = build(p, { seed: 2 });
  checkPlan(c, p, 'seed 2');
  assert.ok(!a.notes.includes('few-face'), '5 face clips fill the 4 video bars');
  assert.notEqual(shots(c), shots(a), '"Try other shots" (seed 2) picks other shots');
  let differ = 0;
  for (let s = 2; s <= 11; s++) if (shots(build(p, { seed: s })) !== shots(a)) differ++;
  assert.ok(differ >= 8, 'most seeds give another plan (' + differ + '/10)');
}

// ---- Adjacency and frames over many pools, seeds, fps and cues ----
for (const c of manifest.cues.concat([null, { grid: 'none', bpm: 133, firstBeat: 0.2, durationSeconds: 90 }])) {
  for (const fps of FPS) {
    for (const [face, other, photos] of [[2, 0, 0], [2, 1, 1], [3, 0, 2], [1, 1, 0], [0, 3, 0], [6, 2, 5]]) {
      for (const seed of [1, 2, 7]) for (const bars of [4, 6, 8]) {
        const p = pool({ face, other, photos });
        const plan = j(P.saePlanBuild({ fps, bars, seed, cue: c, ...p }));
        checkPlan(plan, p, (c ? c.id || 'own' : 'none') + ' fps ' + fps.toFixed(3) + ' pool ' + [face, other, photos] + ' seed ' + seed);
        if (c && c.grid === 'accepted') {
          // The plan's frames follow the schedule formula with the music offset of sectionStart - lead.
          const e = P.saeEditBpm(c.bpm), m = plan.sectionStart - P.SAE_LEAD, d = m - Math.round(m * fps) / fps;
          const tpl = P.saeTemplate(plan.bars);
          plan.holds.forEach((h, i) => { if (i) assert.equal(h.startFrame, Math.round((P.SAE_LEAD + tpl[i].startBeat * (60 / e) + d) * fps)); });
          assert.equal(plan.editBpm, e); assert.equal(plan.bpm, c.bpm);
          assert.ok(Math.abs(plan.musicSourceStart - m) < 1e-12);
        }
        if (!c) { assert.ok(plan.notes.includes('no-music')); assert.equal(plan.offset, 0); assert.equal(plan.sectionStart, null); assert.equal(plan.musicSourceStart, null); }
      }
    }
  }
}

console.log('allocate.test: ok');
