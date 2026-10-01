// Selfie Aesthetic Edit planner. A plain script: panel.tsx embeds it verbatim (between `// sae-planner:start` and
// `// sae-planner:end`) and the tests load it in node:vm. No require, no imports; module.exports only when it exists.
//
// Rhythm template (spec "Rhythm template"): N bars, one source per bar. Bars 0..N-2 are standard bars of six holds
// [1, .5, .5, .5, .5, 1] beats with moments A B A B A B; the last bar is the finale, seven 1/2-beat holds A B A B A B A.
// The video starts SAE_LEAD before beat 0 of the chosen music section and ends at beat 4(N-1) + 3.5 plus
// SAE_END_TAIL (the last hold absorbs the tail). Holds = 6(N-1) + 7, cuts = holds - 1.
//
// Timing: timeline seconds of edit beat b = SAE_LEAD + b * 60 / editBpm + delta. The music clip starts at timeline
// frame 0 with sourceStart = sectionStart - SAE_LEAD; Selects snaps sourceStart to a whole frame, so the music plays
// offset by delta = sourceStart - round(sourceStart * fps) / fps (at most half a frame; saeMusicOffset). delta is applied once to every boundary, and every boundary
// is rounded to a frame on its own: frame = round(seconds * fps). Durations never accumulate rounding.
const SAE_LEAD = 0.15;
const SAE_END_TAIL = 0.040;
const SAE_STANDARD_BAR = [1, 0.5, 0.5, 0.5, 0.5, 1];
const SAE_STANDARD_MOMENTS = ['A', 'B', 'A', 'B', 'A', 'B'];
const SAE_FINALE_BAR = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
const SAE_FINALE_MOMENTS = ['A', 'B', 'A', 'B', 'A', 'B', 'A'];
const SAE_LENGTHS = { short: 4, standard: 6, long: 8 };
// Fewest bars a build shrinks to: two standard bars + the finale.
const SAE_MIN_BARS = 3;
// Tempo mapping: the cue's beat when it lies in [SAE_EDIT_BPM_MIN, SAE_EDIT_BPM_MAX], half-time when that is still at
// least SAE_EDIT_BPM_MIN, else the beat itself (125-140 BPM: a 1/2 beat of >= 0.21 s keeps a visible hold between the
// 2 + 2-frame whips).
const SAE_EDIT_BPM_MIN = 70;
const SAE_EDIT_BPM_MAX = 125;
// A detected beat is used when its bpm lies in this range (grid 'accepted' or 'approximate'); otherwise, for
// grid 'none' and without music, the edit runs on a fixed SAE_FIXED_BPM grid (1/2 beat = 0.309 s).
const SAE_GRID_BPM_MIN = 60;
const SAE_GRID_BPM_MAX = 250;
const SAE_FIXED_BPM = 97;
// Fixed-tempo own music: bar-change cuts (only those) may move onto a strong low-band onset within this window.
const SAE_SNAP_WINDOW = 0.120;
const SAE_SNAP_MIN_STRENGTH = 2;
const SAE_SNAP_DISTANCE_COST = 0.5;
// No hold may be shorter than this after an onset snap.
const SAE_MIN_HOLD_FRAMES = 3;
// The music's fade-out (bundled cues: 2 s); the edit must end before it starts.
const SAE_FADE_OUT = 2;
// Source windows: a hold window ends at least this far before the end of its source.
const SAE_SOURCE_TAIL = 0.15;
// Moments A and B of one bar are at least this far apart in the source.
const SAE_PAIR_GAP = 0.8;
// Filler candidate times every SAE_FILLER_STEP seconds per clip (at most SAE_MAX_FILLERS, evenly spaced, so a long
// clip does not blow up the pair search). Fillers score SAE_FILLER_SCORE, below any scene-search hit.
const SAE_FILLER_STEP = 0.5;
const SAE_MAX_FILLERS = 40;
const SAE_FILLER_SCORE = -1;
// Distinct moment pairs kept per clip (a repeated clip uses a different pair).
const SAE_MAX_PAIRS = 8;
// Moments within this distance of a moment an earlier pair already uses count as "the same moment" when picking
// further pairs (pairs with fresh moments come first).
const SAE_MOMENT_NEAR = 0.4;
// Face test (spec "Shot roles"): a clip is a face clip when its best face-role hit beats the clip's best control hit
// by more than SAE_FACE_MARGIN (scene-search score units). Tunable: raise it if landscape clips pass as faces, lower
// it if real selfies fail. Default 0.02, to be re-tuned on Staging (Set A vs the daily Project) and recorded in the
// planner tests. A clip without any control hit (the control search failed) is not a face clip; it stays usable.
const SAE_FACE_MARGIN = 0.02;
const SAE_FACE_ROLES = ['selfie', 'hand', 'expression', 'glance'];
// Photos: about SAE_PHOTO_SHARE of the bars, at most SAE_PHOTO_RUN_MAX photo bars in a row.
const SAE_PHOTO_SHARE = 1 / 3;
const SAE_PHOTO_RUN_MAX = 2;
// Face clips are reused (with another A/B pair) up to this many bars each before photos and non-face clips fill in.
const SAE_FACE_MAX_USES = 2;
// Seeded jitter: clip order inside one use-count/tier group, and pair choice among a clip's unused pairs.
const SAE_CLIP_JITTER = 0.1;
const SAE_PAIR_JITTER = 0.05;
// Whip angle magnitude per cut, degrees; the sign alternates cut by cut from a seeded start.
const SAE_ANGLE_MIN = 25;
const SAE_ANGLE_MAX = 35;

const saeFinite = v => typeof v === 'number' && isFinite(v);

// Seeded hash in [0, 1), memoised per key (the allocation asks for the same keys many times).
const saeHashCache = new Map();
function saeHash(str) {
  const key = String(str);
  const hit = saeHashCache.get(key);
  if (hit !== undefined) return hit;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  // Final avalanche (murmur3 fmix32): FNV alone barely changes for keys that differ only in their last character.
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  const v = (h >>> 0) / 4294967296;
  if (saeHashCache.size > 50000) saeHashCache.clear();
  saeHashCache.set(key, v);
  return v;
}

function saeEditBpm(bpm) {
  if (bpm >= SAE_EDIT_BPM_MIN && bpm <= SAE_EDIT_BPM_MAX) return bpm;
  if (bpm / 2 >= SAE_EDIT_BPM_MIN) return bpm / 2;
  return bpm;
}

// The tempo a cue (manifest entry or own-music analysis) gives the edit. cue null = no music.
// Returns { bpm (the music's beat, or SAE_FIXED_BPM when fixed), editBpm, fixed }.
function saeTempo(cue) {
  const grid = !!cue && saeFinite(cue.bpm) && cue.bpm >= SAE_GRID_BPM_MIN && cue.bpm <= SAE_GRID_BPM_MAX &&
    (cue.grid === 'accepted' || cue.grid === 'approximate');
  if (!grid) return { bpm: SAE_FIXED_BPM, editBpm: SAE_FIXED_BPM, fixed: true };
  return { bpm: cue.bpm, editBpm: saeEditBpm(cue.bpm), fixed: false };
}

// Seconds from beat 0 of the section to the end of the video (the lead is before beat 0).
function saeVideoSeconds(bars, editBpm) { return (4 * (bars - 1) + 3.5) * 60 / editBpm + SAE_END_TAIL; }

// delta: how far the music plays behind the planned grid once Selects snaps the music clip's source start
// (sourceStart = sectionStart - SAE_LEAD) to a frame. 0 without music.
function saeMusicOffset(sourceStart, fps) {
  if (!saeFinite(sourceStart) || !(fps > 0)) return 0;
  return sourceStart - Math.round(sourceStart * fps) / fps;
}

// Holds of an N-bar template in beats: [{ i, bar, moment, beats, startBeat, endBeat }].
function saeTemplate(bars) {
  if (!(bars >= 1) || Math.floor(bars) !== bars) throw Error('saeTemplate needs a whole number of bars');
  const holds = [];
  let at = 0;
  for (let k = 0; k < bars; k++) {
    const finale = k === bars - 1;
    const lengths = finale ? SAE_FINALE_BAR : SAE_STANDARD_BAR, moments = finale ? SAE_FINALE_MOMENTS : SAE_STANDARD_MOMENTS;
    for (let j = 0; j < lengths.length; j++) {
      holds.push({ i: holds.length, bar: k, moment: moments[j], beats: lengths[j], startBeat: at, endBeat: at + lengths[j] });
      at += lengths[j];
    }
  }
  return holds;
}

// opts: { editBpm (or bpm: the music's beat, mapped with saeEditBpm), fps, bars, sectionStart? (music seconds of
// beat 0; omit without music), snap?: true to snap bar-change cuts to low-band onsets (fixed tempo with own music),
// onsets?: [[music seconds, 'l'|'m'|'h', strength]], onsetThresholds?: { l, m, h } }.
// Returns { editBpm, fps, musicSourceStart (sectionStart - lead, or null), offset (delta at this fps), holds (template
// + startFrame, endFrame, frames), cutSecondsRaw (every boundary in timeline seconds WITHOUT the music offset, length
// holds + 1, first 0, last = the video end incl. the 40 ms tail), cutSeconds (raw + offset, first stays 0), cuts (inner
// cut frames), beats (timeline seconds of every whole edit beat, incl. offset), totalFrames, snapLog }.
// Boundary frame k = round(cutSeconds[k] * fps). At another fps: round((cutSecondsRaw[k] + saeMusicOffset(
// musicSourceStart, fps)) * fps) for k > 0 (assemble.js does this at the Draft's real rate).
function saeSchedule(opts) {
  const fps = opts.fps, bars = opts.bars;
  const editBpm = saeFinite(opts.editBpm) ? opts.editBpm : saeEditBpm(opts.bpm);
  if (!(editBpm > 0) || !(fps > 0) || !(bars >= 1)) throw Error('saeSchedule needs a bpm, fps and bars');
  const spb = 60 / editBpm;
  const sourceStart = saeFinite(opts.sectionStart) ? opts.sectionStart - SAE_LEAD : null;
  const offset = saeMusicOffset(sourceStart, fps);
  const tpl = saeTemplate(bars);
  const endBeat = tpl[tpl.length - 1].endBeat;
  const raw = [0].concat(tpl.slice(1).map(h => SAE_LEAD + h.startBeat * spb), [SAE_LEAD + endBeat * spb + SAE_END_TAIL]);
  const withOffset = (x, k) => (k === 0 ? 0 : x + offset);
  const frameOf = x => Math.round(x * fps);
  const snapLog = [];
  if (opts.snap && sourceStart !== null && opts.onsets && opts.onsets.length) {
    const thr = Math.max(SAE_SNAP_MIN_STRENGTH, (opts.onsetThresholds && opts.onsetThresholds.l) || 0);
    // A music onset at source second s sits at raw timeline second s - sourceStart (it plays at that + delta).
    const lows = opts.onsets.filter(o => o && o[1] === 'l' && saeFinite(o[0]) && saeFinite(o[2]) && o[2] >= thr)
      .map(o => ({ x: o[0] - sourceStart, ratio: o[2] / thr }));
    for (let i = 1; i < tpl.length; i++) {
      if (tpl[i].bar === tpl[i - 1].bar) continue; // only bar changes are anchors
      const g = raw[i];
      let best = null;
      for (const o of lows) {
        const d = Math.abs(o.x - g);
        if (d > SAE_SNAP_WINDOW + 1e-9) continue;
        const score = o.ratio - SAE_SNAP_DISTANCE_COST * d / SAE_SNAP_WINDOW;
        if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && d < best.d)) best = { x: o.x, d, score };
      }
      if (!best) { snapLog.push({ index: i, grid: g, seconds: g, reason: 'no onset' }); continue; }
      const f = frameOf(best.x + offset);
      const before = f - frameOf(withOffset(raw[i - 1], i - 1)), after = frameOf(withOffset(raw[i + 1], i + 1)) - f;
      if (before < SAE_MIN_HOLD_FRAMES || after < SAE_MIN_HOLD_FRAMES) { snapLog.push({ index: i, grid: g, seconds: g, reason: 'reverted: hold too short' }); continue; }
      raw[i] = best.x;
      snapLog.push({ index: i, grid: g, seconds: best.x, shiftMs: Math.round((best.x - g) * 1e4) / 10, reason: 'onset' });
    }
  }
  const cutSeconds = raw.map(withOffset);
  const frames = cutSeconds.map(frameOf);
  const holds = tpl.map((h, k) => ({ ...h, startFrame: frames[k], endFrame: frames[k + 1], frames: frames[k + 1] - frames[k] }));
  const beats = [];
  for (let b = 0; b <= Math.floor(endBeat + 1e-9); b++) beats.push(SAE_LEAD + b * spb + offset);
  return { editBpm, fps, musicSourceStart: sourceStart, offset, holds, cutSecondsRaw: raw, cutSeconds, cuts: frames.slice(1, -1), beats,
    totalFrames: frames[frames.length - 1], snapLog };
}

// Moments (spec "Moments"). opts: { candidates: [{ rid, role, t, score }], durations: { [rid]: seconds },
// badSpans?: { [rid]: [[s, e], ...] }, fps, beatSeconds (window length: the longest hold a moment plays),
// margin? (default SAE_FACE_MARGIN) }.
// Per clip (every rid in durations, sorted): faceScore = max over face-role hits of (score - best control score), null
// without face or control hits; face = faceScore > margin. Candidate times: every hit time (any score) plus fillers;
// a time t is kept when its window [s, s + beatSeconds] (s = t snapped down to a whole frame) misses every bad span
// and ends at least SAE_SOURCE_TAIL before the end of the source. Pairs: A and B >= SAE_PAIR_GAP apart, best summed
// score first (ties: farther apart, then earlier), A = the better-scoring moment; up to SAE_MAX_PAIRS distinct pairs,
// pairs whose moments no earlier pair uses first. A clip with no such pair gets one relaxed pair (its two
// farthest-apart times, or one time twice), marked relaxed and scored below every real pair.
// Returns { clips: [{ rid, duration, face, faceScore, control, times, pairs: [{ a, b, score, relaxed? }] }], faceCount }.
function saeMoments(opts) {
  const fps = opts.fps, win = opts.beatSeconds;
  if (!(fps > 0) || !(win > 0)) throw Error('saeMoments needs fps and beatSeconds');
  const margin = saeFinite(opts.margin) ? opts.margin : SAE_FACE_MARGIN;
  const durations = opts.durations || {}, spansOf = opts.badSpans || {};
  const byRid = {};
  for (const c of opts.candidates || []) {
    if (!c || typeof c.rid !== 'string' || !saeFinite(c.t) || !saeFinite(c.score)) continue;
    (byRid[c.rid] = byRid[c.rid] || []).push(c);
  }
  const clips = [];
  for (const rid of Object.keys(durations).sort()) {
    const dur = durations[rid];
    if (!saeFinite(dur) || !(dur > 0)) continue;
    const hits = byRid[rid] || [];
    let control = null, best = null;
    for (const h of hits) if (h.role === 'control' && (control === null || h.score > control)) control = h.score;
    for (const h of hits) if (SAE_FACE_ROLES.indexOf(h.role) >= 0 && (best === null || h.score > best)) best = h.score;
    const faceScore = control === null || best === null ? null : best - control;
    const face = faceScore !== null && faceScore > margin;
    const spans = (spansOf[rid] || []).filter(s => s && saeFinite(s[0]) && saeFinite(s[1]));
    // Window start for a time, or null when the window is not usable.
    const startOf = t => {
      const f = Math.floor(t * fps + 1e-6);
      if (f < 0) return null;
      const s = f / fps, e = s + win;
      if (e > dur - SAE_SOURCE_TAIL + 1e-9) return null;
      if (spans.some(sp => s < sp[1] && e > sp[0])) return null;
      return { f, s };
    };
    const times = new Map(); // frame -> { t, score, hit }
    for (const h of hits) {
      if (h.role === 'control') continue;
      const w = startOf(h.t);
      if (!w) continue;
      const old = times.get(w.f);
      if (!old || h.score > old.score) times.set(w.f, { t: w.s, score: h.score, hit: true });
    }
    const fillers = [];
    for (let k = 0; k * SAE_FILLER_STEP <= dur + 1e-9; k++) { const w = startOf(k * SAE_FILLER_STEP); if (w) fillers.push(w); }
    const keep = fillers.length <= SAE_MAX_FILLERS ? fillers
      : Array.from({ length: SAE_MAX_FILLERS }, (_, j) => fillers[Math.round(j * (fillers.length - 1) / (SAE_MAX_FILLERS - 1))]);
    for (const w of keep) if (!times.has(w.f)) times.set(w.f, { t: w.s, score: SAE_FILLER_SCORE, hit: false });
    const list = Array.from(times.values()).sort((p, q) => p.t - q.t);
    const all = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i], q = list[j];
        if (q.t - p.t < SAE_PAIR_GAP - 1e-9) continue;
        const aFirst = p.score >= q.score;
        all.push({ a: aFirst ? p.t : q.t, b: aFirst ? q.t : p.t, score: p.score + q.score, sep: q.t - p.t, early: p.t });
      }
    }
    all.sort((p, q) => q.score - p.score || q.sep - p.sep || p.early - q.early || p.a - q.a);
    const pairs = [], usedTimes = [];
    const near = t => usedTimes.some(u => Math.abs(u - t) < SAE_MOMENT_NEAR - 1e-9);
    for (const p of all) {
      if (pairs.length >= SAE_MAX_PAIRS) break;
      if (near(p.a) || near(p.b)) continue;
      pairs.push({ a: p.a, b: p.b, score: p.score });
      usedTimes.push(p.a, p.b);
    }
    for (const p of all) {
      if (pairs.length >= SAE_MAX_PAIRS) break;
      if (pairs.some(x => x.a === p.a && x.b === p.b)) continue;
      pairs.push({ a: p.a, b: p.b, score: p.score });
    }
    if (!pairs.length && list.length) {
      const p = list[0], q = list[list.length - 1];
      pairs.push({ a: p.t, b: q.t, score: p.score + q.score - 100, relaxed: true });
    }
    clips.push({ rid, duration: dur, face, faceScore, control, times: list.length, pairs });
  }
  return { clips, faceCount: clips.filter(c => c.face && c.pairs.length).length };
}

// Bars that hold photos: up to `count` of the bars 0..bars-1, inner bars (1..bars-2) first, evenly spread from a
// seeded phase, never more than SAE_PHOTO_RUN_MAX in a row. innerOnly: bar 0 and the finale never hold a photo (any
// video exists), so fewer than `count` bars may come back.
function saePhotoBars(bars, count, seed, innerOnly) {
  const out = {};
  if (!(count > 0)) return out;
  const inner = [];
  for (let k = 1; k < bars - 1; k++) inner.push(k);
  const order = [];
  const phase = saeHash(seed + ':photo-bars');
  const evenly = (pool, n) => {
    const picks = [];
    for (let k = 0; k < n && pool.length; k++) {
      const idx = Math.floor((k + phase) * pool.length / n) % pool.length;
      if (picks.indexOf(pool[idx]) < 0) picks.push(pool[idx]);
    }
    return picks;
  };
  evenly(inner, Math.min(count, inner.length)).forEach(k => order.push(k));
  // Then any remaining inner bar, then bar 0 and the finale, in seeded order.
  inner.concat(innerOnly ? [] : [0, bars - 1].filter((k, i, a) => k >= 0 && a.indexOf(k) === i))
    .map(k => ({ k, v: saeHash(seed + ':photo-bar:' + k) }))
    .sort((p, q) => (p.k === 0 || p.k === bars - 1 ? 1 : 0) - (q.k === 0 || q.k === bars - 1 ? 1 : 0) || p.v - q.v)
    .forEach(x => { if (order.indexOf(x.k) < 0) order.push(x.k); });
  const runOk = (set, k) => {
    let left = 0, right = 0;
    for (let j = k - 1; j >= 0 && set[j]; j--) left++;
    for (let j = k + 1; j < bars && set[j]; j++) right++;
    return left + right + 1 <= SAE_PHOTO_RUN_MAX;
  };
  let n = 0;
  for (const k of order) { if (n >= count) break; if (runOk(out, k)) { out[k] = true; n++; } }
  return out;
}

// Bar allocation (spec "Bar allocation", with the user's GATE-A ruling on few face clips). opts: { clips (saeMoments
// clips), photos: [{ rid }] | [rid], bars, seed, usePhotos (default true), allowAdjacent?, allowPairReuse?
// (relaxations for tiny pools) }.
// Photo bars: round(bars / 3) (capped by the photos), inner bars only while any video exists, at most
// SAE_PHOTO_RUN_MAX in a row: photos are a default style element. Every other bar takes, in this order:
//   1. a face clip used fewer than SAE_FACE_MAX_USES times, least-used first (every face clip once before any face
//      repeat), then by face score plus a seeded jitter;
//   2. an extra (unused) photo, while the run limit allows;
//   3. a non-face clip, least-used first;
//   4. a face clip beyond SAE_FACE_MAX_USES uses (last resort before shrinking).
// So when face clips are few, the edit reuses them (with a different A/B pair) until one would need a third use or
// adjacency gets in the way, then photos beyond round(bars / 3), then non-face clips. Never the same rid in adjacent
// bars when >= 2 sources exist. A repeated clip takes one of its unused pairs.
// Returns { ok, bars: [{ bar, kind, rid, pair }], uses: { [rid]: n }, photoBars, failedAt? }.
function saeAllocate(opts) {
  const N = opts.bars, seed = String(opts.seed == null ? 1 : opts.seed);
  const usable = (opts.clips || []).filter(c => c && c.pairs && c.pairs.length);
  // Clips with only a relaxed pair (too short for A/B >= SAE_PAIR_GAP) are a last resort: used only when no clip has
  // a real pair, or with allowPairReuse (the tiny-pool fallback).
  const strict = usable.filter(c => c.pairs.some(q => !q.relaxed));
  const vids = strict.length && !opts.allowPairReuse ? strict : usable;
  const seenPhoto = {};
  const pics = opts.usePhotos === false ? [] : (opts.photos || [])
    .map(p => (typeof p === 'string' ? p : p && p.rid))
    .filter(r => typeof r === 'string' && !seenPhoto[r] && (seenPhoto[r] = true)).sort();
  const sources = vids.length + pics.length;
  if (!sources || !(N >= 1)) return { ok: false, bars: [], uses: {}, photoBars: 0, failedAt: 0 };
  const photoCount = Math.min(pics.length, Math.round(N * SAE_PHOTO_SHARE));
  const photoBar = saePhotoBars(N, photoCount, seed, vids.length > 0);
  const uses = {}, pairUsed = {}, picks = [];
  let prev = null, photoRun = 0;
  const notPrev = rid => rid !== prev || sources < 2 || !!opts.allowAdjacent;
  const pickPhoto = allowRun => {
    if (!allowRun && photoRun >= SAE_PHOTO_RUN_MAX) return null;
    let best = null;
    for (const rid of pics) {
      if (!notPrev(rid)) continue;
      const u = uses[rid] || 0;
      if (u > 0 && !opts.allowPairReuse) continue; // a photo holds one bar (tiny pools: fewest uses first)
      const v = saeHash(seed + ':photo:' + rid);
      if (!best || u < best.u || (u === best.u && v > best.v)) best = { rid, v, u };
    }
    return best && { kind: 'photo', rid: best.rid, pair: null };
  };
  const hasPair = c => opts.allowPairReuse || c.pairs.some((p, i) => !(pairUsed[c.rid] && pairUsed[c.rid][i]));
  // The least-used clip among those `keep` accepts, then by face score plus a seeded jitter; its best unused pair.
  const pickVideo = keep => {
    let best = null;
    for (const c of vids) {
      if (!keep(c) || !notPrev(c.rid) || !hasPair(c)) continue;
      const u = uses[c.rid] || 0;
      const v = (saeFinite(c.faceScore) ? c.faceScore : -1) + SAE_CLIP_JITTER * saeHash(seed + ':clip:' + c.rid + ':' + u);
      if (!best || u < best.u || (u === best.u && (v > best.v + 1e-12 || (Math.abs(v - best.v) <= 1e-12 && c.rid < best.c.rid)))) best = { c, u, v };
    }
    if (!best) return null;
    const c = best.c, usedSet = pairUsed[c.rid] || {};
    let bp = null;
    c.pairs.forEach((p, i) => {
      const reused = !!usedSet[i];
      if (reused && !opts.allowPairReuse) return;
      const v = p.score + SAE_PAIR_JITTER * saeHash(seed + ':pair:' + c.rid + ':' + i) - (reused ? 1000 : 0);
      if (!bp || v > bp.v + 1e-12) bp = { i, v };
    });
    return { kind: 'video', rid: c.rid, pair: c.pairs[bp.i], pairIndex: bp.i };
  };
  const tiers = [
    () => pickVideo(c => c.face && (uses[c.rid] || 0) < SAE_FACE_MAX_USES),
    () => pickPhoto(false),
    () => pickVideo(c => !c.face),
    () => pickVideo(c => c.face),
  ];
  for (let k = 0; k < N; k++) {
    let pick = photoBar[k] ? pickPhoto(false) : null;
    for (let t = 0; !pick && t < tiers.length; t++) pick = tiers[t]();
    if (!pick && (!vids.length || opts.allowAdjacent)) pick = pickPhoto(true);
    if (!pick) return { ok: false, bars: picks, uses, photoBars: picks.filter(x => x.kind === 'photo').length, failedAt: k };
    uses[pick.rid] = (uses[pick.rid] || 0) + 1;
    if (pick.kind === 'video') { (pairUsed[pick.rid] = pairUsed[pick.rid] || {})[pick.pairIndex] = true; photoRun = 0; } else photoRun++;
    picks.push({ bar: k, kind: pick.kind, rid: pick.rid, pair: pick.pair });
    prev = pick.rid;
  }
  return { ok: true, bars: picks, uses, photoBars: picks.filter(b => b.kind === 'photo').length };
}

// Whip kinds and angles for holds in order. A cut at a bar boundary is 'spin', inside a bar 'dir'; the first hold has
// cutIn 'none', the last cutOut 'none'. Cut j (between hold j and j + 1) gets angle sign * (25..35 deg), the sign
// alternating cut by cut from a seeded start; both sides of a cut share kind and angle (angleOut of hold j = angleIn of
// hold j + 1). `angle` repeats angleOut (angleIn on the last hold) for consumers that take one angle per clip.
function saeWhipKinds(holds, seed) {
  const s = String(seed == null ? 1 : seed);
  const sign0 = saeHash(s + ':angle-sign') < 0.5 ? 1 : -1;
  const cuts = [];
  for (let j = 0; j + 1 < holds.length; j++) {
    const mag = SAE_ANGLE_MIN + (SAE_ANGLE_MAX - SAE_ANGLE_MIN) * saeHash(s + ':angle:' + j);
    cuts.push({ kind: holds[j + 1].bar !== holds[j].bar ? 'spin' : 'dir', angle: Math.round(sign0 * (j % 2 ? -1 : 1) * mag * 10) / 10 });
  }
  return holds.map((h, i) => {
    const cin = i > 0 ? cuts[i - 1] : null, cout = i < cuts.length ? cuts[i] : null;
    return { ...h, cutIn: cin ? cin.kind : 'none', cutOut: cout ? cout.kind : 'none',
      angleIn: cin ? cin.angle : 0, angleOut: cout ? cout.angle : 0, angle: cout ? cout.angle : cin ? cin.angle : 0 };
  });
}

// Bar lines of a cue with a usable grid: { first, bar } in music seconds (downbeat.firstBar, else firstBeat; the
// manifest's firstBeat already includes any phaseBeats correction).
function saeBarGrid(cue) {
  const first = cue.downbeat && saeFinite(cue.downbeat.firstBar) ? cue.downbeat.firstBar : cue.firstBeat;
  return { first: saeFinite(first) ? first : 0, bar: 4 * 60 / cue.bpm };
}

// The range of section starts an edit of `bars` bars at editBpm fits in: sectionStart - LEAD >= 0 and the video end
// before the cue's fade-out. Returns { min, max } in music seconds (max < min when nothing fits).
function saeSectionRange(cue, bars, editBpm) {
  const end = (saeFinite(cue.durationSeconds) ? cue.durationSeconds : Infinity) - SAE_FADE_OUT;
  return { min: SAE_LEAD, max: end - saeVideoSeconds(bars, editBpm) };
}

// The default section: cue.defaultSection when the edit fits there, else the latest bar line that fits (cues without
// a usable grid: clamped to the range). null when the music is too short.
function saeDefaultSection(cue, bars, editBpm) {
  if (!cue) return null;
  const r = saeSectionRange(cue, bars, editBpm);
  if (r.max < r.min - 1e-9) return null;
  const def = cue.defaultSection;
  if (saeFinite(def) && def >= r.min - 1e-9 && def <= r.max + 1e-9) return def;
  if (saeTempo(cue).fixed) return Math.max(r.min, Math.min(r.max, saeFinite(def) ? def : r.min));
  const g = saeBarGrid(cue);
  const kMin = Math.ceil((r.min - g.first) / g.bar - 1e-9), kMax = Math.floor((r.max - g.first) / g.bar + 1e-9);
  return kMax >= kMin ? g.first + kMax * g.bar : null;
}

// Snaps a user-chosen section start to the nearest bar line (no usable grid: to a millisecond). With opts
// { bars, editBpm } it also clamps to the starts the edit fits in (null when none); without, only to >= SAE_LEAD.
function saeSnapSection(sec, cue, opts) {
  if (!cue || !saeFinite(sec)) return null;
  const fit = opts && opts.bars >= 1 && opts.editBpm > 0;
  const r = fit ? saeSectionRange(cue, opts.bars, opts.editBpm) : { min: SAE_LEAD, max: Infinity };
  if (r.max < r.min - 1e-9) return null;
  if (saeTempo(cue).fixed) return Math.max(r.min, Math.min(r.max, Math.round(sec * 1000) / 1000));
  const g = saeBarGrid(cue);
  const kMin = Math.ceil((r.min - g.first) / g.bar - 1e-9), kMax = Math.floor((r.max - g.first) / g.bar + 1e-9);
  if (kMax < kMin) return null;
  const k = Math.max(kMin, Math.min(kMax, Math.round((sec - g.first) / g.bar)));
  return g.first + k * g.bar;
}

// The whole plan. opts: { fps, bars (wanted; SAE_LENGTHS), seed (default 1), cue (manifest entry or own-music
// analysis { bpm, firstBeat, grid, downbeat?, durationSeconds, defaultSection?, onsets?, onsetThresholds? }; null = no
// music), sectionStart? (default saeDefaultSection), candidates, durations, badSpans?, photos?, usePhotos? (default
// true), margin? }.
// Tries the wanted bar count (capped so the video ends before the music's fade-out), then fewer (down to SAE_MIN_BARS)
// until the sources fill every bar under the rules; a pool too small even for that builds SAE_MIN_BARS bars with
// adjacency / pair reuse relaxed.
// Returns the plan (contract in plan.md) with ok: true, or { ok: false, notes: ['no-sources' | 'music-too-short'] }.
// Notes: 'few-face' (fewer face clips than bars), 'reused' (a source fills more than one bar), 'shrunk', 'fixed-tempo'
// (music without a usable beat), 'no-music', 'adjacent' / 'pair-reuse' (relaxations used).
function saePlanBuild(opts) {
  const fps = opts.fps;
  if (!(fps > 0)) throw Error('saePlanBuild needs fps');
  const wanted = Math.max(SAE_MIN_BARS, Math.floor(opts.bars || SAE_LENGTHS.short));
  const seed = opts.seed == null ? 1 : opts.seed;
  const cue = opts.cue || null;
  const tempo = saeTempo(cue);
  const editBpm = tempo.editBpm, spb = 60 / editBpm;
  // The music caps the bar count: the most bars (<= wanted) whose video ends before the cue's fade-out. Without a
  // user section, the default section of the largest bar count that has one; with one, the largest bar count that
  // still fits after it.
  let sectionStart = null, maxBars = wanted;
  if (cue) {
    maxBars = 0;
    for (let n = wanted; n >= SAE_MIN_BARS && !maxBars; n--) {
      if (saeFinite(opts.sectionStart)) {
        if (saeSectionRange(cue, n, editBpm).max >= opts.sectionStart - 1e-9) { maxBars = n; sectionStart = opts.sectionStart; }
      } else {
        const s = saeDefaultSection(cue, n, editBpm);
        if (s !== null) { maxBars = n; sectionStart = s; }
      }
    }
    if (!maxBars) return { ok: false, notes: ['music-too-short'], fit: { bars: 0, wanted } };
  }
  const snap = !!cue && tempo.fixed && !!(cue.onsets && cue.onsets.length);
  // The longest hold a moment window must cover: hold 0 (the lead + 1 beat + the music offset, at most half a frame)
  // with 2 frames for rounding, plus an onset snap's shift. Then every hold fits in [srcStart, duration - TAIL] and
  // assemble.js never slides a window back.
  const beatSeconds = spb + SAE_LEAD + 2 / fps + (snap ? SAE_SNAP_WINDOW : 0);
  const moments = saeMoments({ candidates: opts.candidates, durations: opts.durations, badSpans: opts.badSpans, fps, beatSeconds, margin: opts.margin });
  const base = { clips: moments.clips, photos: opts.photos, seed, usePhotos: opts.usePhotos };
  let alloc = null, bars = 0;
  const relax = [];
  for (let n = maxBars; n >= SAE_MIN_BARS && !alloc; n--) {
    const a = saeAllocate({ ...base, bars: n });
    if (a.ok) { alloc = a; bars = n; }
  }
  if (!alloc) {
    for (const r of [{ allowAdjacent: true }, { allowAdjacent: true, allowPairReuse: true }]) {
      const a = saeAllocate({ ...base, bars: SAE_MIN_BARS, ...r });
      if (a.ok) { alloc = a; bars = SAE_MIN_BARS; relax.push('adjacent'); if (r.allowPairReuse) relax.push('pair-reuse'); break; }
    }
  }
  if (!alloc) return { ok: false, notes: ['no-sources'], fit: { bars: 0, wanted }, faceClips: moments.faceCount };
  const sched = saeSchedule({ editBpm, fps, bars, sectionStart: cue ? sectionStart : undefined, snap,
    onsets: cue && cue.onsets, onsetThresholds: cue && cue.onsetThresholds });
  const raw = sched.holds.map(h => {
    const b = alloc.bars[h.bar];
    const photo = b.kind === 'photo';
    return { i: h.i, bar: h.bar, kind: b.kind, rid: b.rid, moment: h.moment,
      srcStart: photo ? 0 : (h.moment === 'A' ? b.pair.a : b.pair.b),
      frames: h.frames, startFrame: h.startFrame, endFrame: h.endFrame,
      framing: photo ? (h.moment === 'A' ? 'full' : 'punch') : null };
  });
  const holds = saeWhipKinds(raw, seed);
  const notes = [];
  // 'few-face': fewer face clips than video bars, so other clips or repeats fill them (the panel's "Only N close-up
  // clips found" note, N = faceClips).
  if (moments.faceCount < alloc.bars.filter(b => b.kind === 'video').length) notes.push('few-face');
  if (Object.keys(alloc.uses).some(r => alloc.uses[r] > 1)) notes.push('reused');
  if (bars < wanted) notes.push('shrunk');
  if (!cue) notes.push('no-music'); else if (tempo.fixed) notes.push('fixed-tempo');
  relax.forEach(r => notes.push(r));
  if (alloc.bars.some((b, k) => k >= SAE_PHOTO_RUN_MAX && alloc.bars.slice(k - SAE_PHOTO_RUN_MAX, k + 1).every(x => x.kind === 'photo'))) notes.push('photo-run');
  return {
    ok: true, fps, bpm: tempo.bpm, editBpm, firstBeat: cue && saeFinite(cue.firstBeat) ? cue.firstBeat : null,
    sectionStart, musicSourceStart: sched.musicSourceStart, lead: SAE_LEAD, offset: sched.offset,
    bars, totalFrames: sched.totalFrames, holds, cuts: sched.cuts, cutSecondsRaw: sched.cutSecondsRaw, cutSeconds: sched.cutSeconds,
    beats: sched.beats, notes, fit: { bars, wanted }, faceClips: moments.faceCount, photoBars: alloc.photoBars, seed,
    snapLog: sched.snapLog,
  };
}

if (typeof module !== 'undefined' && module && module.exports) {
  Object.assign(module.exports, {
    SAE_LEAD, SAE_END_TAIL, SAE_STANDARD_BAR, SAE_FINALE_BAR, SAE_LENGTHS, SAE_MIN_BARS, SAE_FIXED_BPM, SAE_FACE_MARGIN,
    SAE_FACE_ROLES, SAE_FACE_MAX_USES, SAE_SOURCE_TAIL, SAE_PAIR_GAP, SAE_FADE_OUT, SAE_PHOTO_SHARE, SAE_PHOTO_RUN_MAX, SAE_SNAP_WINDOW,
    SAE_MIN_HOLD_FRAMES, SAE_ANGLE_MIN, SAE_ANGLE_MAX,
    saeHash, saeEditBpm, saeTempo, saeVideoSeconds, saeMusicOffset, saeTemplate, saeSchedule, saeMoments, saePhotoBars,
    saeAllocate, saeWhipKinds, saeBarGrid, saeSectionRange, saeDefaultSection, saeSnapSection, saePlanBuild,
  });
}
