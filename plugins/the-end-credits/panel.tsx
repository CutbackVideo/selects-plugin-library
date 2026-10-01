// @name THE END Credits
// @name:de THE END Abspann
// @name:en THE END Credits
// @name:es Créditos THE END
// @name:fr Générique THE END
// @name:it Titoli di coda THE END
// @name:ja THE END エンドロール
// @name:ko THE END Credits
// @name:pt Créditos THE END
// @name:tr THE END Jeneriği
// @name:zh THE END 片尾字幕
// @icon video
// Builds a cinematic "THE END" ending as a new, editable Draft: a typed serif title, a slow credit roll, and your
// shots cut on the music's phrases inside a window (Classic) or full frame.
import React from "react";

const PLUGIN_ID = "the-end-credits";
const SKILLS_DIR = "$SELECTS_USER_SKILLS_ROOT/" + PLUGIN_ID;
const DATA_DIR = "$HOME/.selects/plugin-data/" + PLUGIN_ID;
// Ambient clip sound: the clips' own sound sits this far under the music, which stays at 0 dB.
const AMBIENT_DB = -18;
const LOOK_STRENGTH = 0.5;
const MUSIC_FADE_OUT = 1.5;
const FADES = { inSec: 0.5, outSec: 1.13 };
// The shot window in % of the canvas (Classic), or the whole frame.
const WINDOWS = { classic: { x: 50.73, y: 12.69, w: 42.6 }, full: { x: 0, y: 0, w: 100 } };
const TITLE_COLOR = "#FBE4BB";
const CREDIT_COLOR = "#F0EBDD";
const DEFAULT_TITLE = "THE END";
// The bundled Latin-subset fonts; the graphic registers them from these b64 files, the preview through FontFace.
const TEC_FONTS = [
  { file: "tec-title-serif.woff2.b64", family: "TEC Title Serif", weight: 800, style: "normal" },
  { file: "tec-credits-sans.woff2.b64", family: "TEC Credits Sans", weight: 600, style: "normal" },
];
const TITLE_STACK = '"TEC Title Serif", Georgia, "Times New Roman", serif';
const CREDITS_STACK = '"TEC Credits Sans", "Helvetica Neue", Arial, sans-serif';
const LENGTH_LABELS: Record<string, string> = { short: "Short", standard: "Standard", long: "Long" };

// tec-planner:start
// THE END Credits planner. A plain script: panel.tsx embeds it verbatim (between the tec-planner markers) and the
// tests load it in node:vm. Spec v1.1 (R1-R7) is normative. Times are seconds on the music clock; assemble converts
// them to frames once at the real Draft fps.
//
// Timeline: [0, L) lead-in (Classic: an empty gap on Main, black under the typed title; Full frame: shot 0 under it), then
// N shots of one phrase P each, the last one extended by the tail T. Total L + N*P + T.
const TEC_LEAD_IN = 5.1;
const TEC_TAIL = 0.5;
const TEC_FIXED_PHRASE = 3.9;
// A phrase is m beats with m in TEC_BEAT_MULTIPLES and m * 60 / bpm inside [TEC_PHRASE_MIN, TEC_PHRASE_MAX].
const TEC_BEAT_MULTIPLES = [2, 4, 8];
const TEC_PHRASE_MIN = 3.4;
const TEC_PHRASE_MAX = 4.4;
const TEC_LENGTHS = { short: 5, standard: 7, long: 10 };
const TEC_LENGTH_ORDER = ['short', 'standard', 'long'];
const TEC_DEFAULT_LENGTH = 'standard';
// Fewest grid shots a build may shrink to (Full frame adds shot 0, so 4 + 1 visible shots there).
const TEC_MIN_SHOTS = 4;
// Music may be used up to this far before the end of the file.
const TEC_MUSIC_END_MARGIN = 0.1;

// Scene search roles (search.js sends the query, candidates come back with the role key).
const TEC_SEARCH_QUERIES = {
  wide: 'wide landscape',
  sunset: 'sunset or golden light',
  water: 'water or ocean',
  street: 'street or road',
  architecture: 'architecture',
  people: 'people walking or silhouettes',
};
const TEC_SEARCH_ROLES = ['wide', 'sunset', 'water', 'street', 'architecture', 'people'];
// The middle shots cycle through these after the opening wide shot; the last shot is the calm 'ending'.
const TEC_MIDDLE_ROLES = ['street', 'water', 'architecture', 'sunset', 'people', 'wide'];
// Which candidate roles may fill a slot role, best first.
const TEC_ROLE_FALLBACK = {
  'opening-wide': ['wide', 'water', 'sunset', 'architecture'],
  wide: ['wide', 'water', 'sunset', 'architecture'],
  ending: ['sunset', 'water', 'wide'],
  sunset: ['sunset', 'water', 'wide'],
  water: ['water', 'sunset', 'wide'],
  street: ['street', 'people', 'architecture'],
  architecture: ['architecture', 'street', 'wide'],
  people: ['people', 'street', 'wide'],
};

// ---------------------------------------------------------------------------------------------------------------
// Tempo and timeline

// { bpm, accepted } -> { P, m, fixed }. Own music whose detection was rejected, or where no multiple fits, gets the
// fixed 3.9 s phrase. The interval is narrower than a factor of 2, so at most one multiple fits.
function tecPhrase(opts) {
  const bpm = opts && opts.bpm;
  if (opts && opts.accepted !== false && typeof bpm === 'number' && isFinite(bpm) && bpm > 0) {
    for (const m of TEC_BEAT_MULTIPLES) {
      const P = m * 60 / bpm;
      if (P >= TEC_PHRASE_MIN - 1e-9 && P <= TEC_PHRASE_MAX + 1e-9) return { P, m, fixed: false };
    }
  }
  return { P: TEC_FIXED_PHRASE, m: null, fixed: true };
}

// beat-detect.cjs's tempo search range (bpm).
const TEC_DETECT_MIN_BPM = 70;
const TEC_DETECT_MAX_BPM = 180;

// Own music: beat-detect.cjs's result -> { P, m, fixed, approximate, firstBeat }. An accepted grid gives tecPhrase on
// its bpm. An 'approximate' grid (tight but sparse hits: the tempo and first beat are a usable guide, the beat may be
// faint) with a bpm in the detector's range gets the same phrase on the detected tempo and first beat, so the shots
// follow the detected beat (approximate: true). Anything else (grid 'none', a failed detection, or no multiple in
// range) gets the fixed 3.9 s phrase with firstBeat 0. hitRate is never read: it can be 1 on noise or one onset.
function tecOwnPhrase(det) {
  const d = det || {};
  const bpm = d.bpm, inRange = typeof bpm === 'number' && bpm >= TEC_DETECT_MIN_BPM && bpm <= TEC_DETECT_MAX_BPM;
  const approximate = d.accepted !== true && d.grid === 'approximate' && inRange;
  const ph = d.accepted === true || approximate ? tecPhrase({ bpm, accepted: true }) : tecPhrase({});
  const fb = typeof d.firstBeat === 'number' && isFinite(d.firstBeat) ? d.firstBeat : 0;
  return { P: ph.P, m: ph.m, fixed: ph.fixed, approximate: approximate && !ph.fixed, firstBeat: ph.fixed ? 0 : fb };
}

function tecVideoSeconds(N, P) { return TEC_LEAD_IN + N * P + TEC_TAIL; }

// The role of grid shot k (1..N) of N.
function tecShotRole(layout, k, N) {
  if (k === N) return 'ending';
  if (k === 1 && layout !== 'full') return 'wide';
  const i = layout === 'full' ? k - 1 : k - 2;
  return TEC_MIDDLE_ROLES[i % TEC_MIDDLE_ROLES.length];
}

// { layout: 'classic' | 'full', N, P } -> { layout, L, T, P, N, total, boundaries, slots }.
// boundaries are seconds from the video start: [0, L, L+P, ..., L+(N-1)P, L+N*P+T] (N + 2 entries).
// slots[0] is [0, L): Classic 'opening' (the lead-in gap; no footage), Full frame shot 0 (role 'opening-wide').
// slots[1..N] are the grid shots; the last one includes the tail.
function tecTimeline(opts) {
  const layout = opts.layout === 'full' ? 'full' : 'classic', N = opts.N, P = opts.P;
  if (!(N >= 1) || !(P > 0)) throw Error('tecTimeline needs N and P');
  const L = TEC_LEAD_IN, T = TEC_TAIL;
  const boundaries = [0, L];
  for (let k = 1; k < N; k++) boundaries.push(L + k * P);
  boundaries.push(L + N * P + T);
  const slots = [];
  for (let i = 0; i <= N; i++) {
    const seconds = boundaries[i + 1] - boundaries[i];
    if (i === 0) slots.push(layout === 'full' ? { index: 0, kind: 'shot', role: 'opening-wide', seconds } : { index: 0, kind: 'opening', role: null, seconds });
    else slots.push({ index: i, kind: 'shot', role: tecShotRole(layout, i, N), seconds });
  }
  return { layout, L, T, P, N, total: boundaries[boundaries.length - 1], boundaries, slots };
}

// Music section (spec R3). The section start s puts a phrase downbeat exactly at L: s = firstBeat + j*P - L, with
// s >= 0 and s + videoSeconds <= usableEnd. opts: { firstBeat, P, L?, videoSeconds, usableEnd, swell?, value?, fixed? }.
// swell: the bundled cue's swell (or the own music's loudest part); the default j is the smallest j whose downbeat
// is at or after it (within 1e-3 phrase: the manifest keeps the swell to the ms, so a swell on the grid can sit a
// fraction of a ms after its downbeat), clamped into the feasible range. value: a slider position (a section start in seconds) snapped
// to the nearest feasible j. Fixed timing (no steady beat): s is continuous in 0.1 s steps, default swell - L.
// Returns { start, j, jMin, jMax, min, max, defaultStart, defaultJ, fixed } or null when no start fits.
function tecSection(opts) {
  const L = opts.L == null ? TEC_LEAD_IN : opts.L, P = opts.P, need = opts.videoSeconds, end = opts.usableEnd;
  const finite = v => typeof v === 'number' && isFinite(v);
  if (!(P > 0) || !finite(need) || !finite(end)) return null;
  if (opts.fixed) {
    const max = Math.floor((end - need) * 10 + 1e-6) / 10;
    if (max < -1e-9) return null;
    const clamp = v => Math.max(0, Math.min(max, Math.round(v * 10) / 10));
    const defaultStart = clamp(finite(opts.swell) ? opts.swell - L : 0);
    const start = finite(opts.value) ? clamp(opts.value) : defaultStart;
    return { start, j: null, jMin: null, jMax: null, min: 0, max, defaultStart, defaultJ: null, fixed: true };
  }
  const fb = finite(opts.firstBeat) ? opts.firstBeat : 0;
  const at = j => fb + j * P - L;
  const jMin = Math.ceil((L - fb) / P - 1e-9);
  const jMax = Math.floor((end - need - fb + L) / P + 1e-9);
  if (jMax < jMin) return null;
  const clampJ = j => Math.max(jMin, Math.min(jMax, j));
  const defaultJ = clampJ(finite(opts.swell) ? Math.ceil((opts.swell - fb) / P - 1e-3) : jMin);
  const j = finite(opts.value) ? clampJ(Math.round((opts.value - fb + L) / P)) : defaultJ;
  return { start: at(j), j, jMin, jMax, min: at(jMin), max: at(jMax), defaultStart: at(defaultJ), defaultJ, fixed: false };
}

// The longest Length whose section fits the music, at or below `requested` (default: any).
// opts: { firstBeat, P, usableEnd, fixed?, requested? } -> { key, N, needSeconds } where key is null when not even
// Short fits; needSeconds is the music duration Short needs (usableEnd + the end margin).
function tecFitLength(opts) {
  const cap = opts.requested && TEC_LENGTHS[opts.requested] ? TEC_LENGTHS[opts.requested] : Infinity;
  const order = TEC_LENGTH_ORDER.slice().reverse();
  for (const key of order) {
    const N = TEC_LENGTHS[key];
    if (N > cap) continue;
    const s = tecSection({ firstBeat: opts.firstBeat, P: opts.P, videoSeconds: tecVideoSeconds(N, opts.P), usableEnd: opts.usableEnd, fixed: opts.fixed });
    if (s) return { key, N, needSeconds: null };
  }
  const shortSeconds = tecVideoSeconds(TEC_LENGTHS.short, opts.P);
  let earliest = 0;
  if (!opts.fixed) {
    const fb = typeof opts.firstBeat === 'number' && isFinite(opts.firstBeat) ? opts.firstBeat : 0;
    earliest = fb + Math.ceil((TEC_LEAD_IN - fb) / opts.P - 1e-9) * opts.P - TEC_LEAD_IN;
  }
  return { key: null, N: null, needSeconds: Math.ceil((earliest + shortSeconds + TEC_MUSIC_END_MARGIN) * 10 - 1e-6) / 10 };
}

// The loudest phrase of own music (the default reveal lands on it), in seconds, or null. grid: the beat-detect.cjs
// result { firstBeat, beatEnergy, peaks, durationSeconds }. With a steady beat (m beats per phrase): the phrase of m
// detector beats with the highest mean beat energy, from firstBeat. Without one (fixed): the P-long window of the
// waveform peaks with the highest mean. Ties keep the earliest.
function tecLoudest(grid, P, m, fixed) {
  const g = grid || {};
  if (!fixed && m && Array.isArray(g.beatEnergy) && g.beatEnergy.length >= m) {
    let best = -1, bestJ = 0;
    for (let j = 0; (j + 1) * m <= g.beatEnergy.length; j++) {
      const slice = g.beatEnergy.slice(j * m, (j + 1) * m);
      const mean = slice.reduce((a, b) => a + b, 0) / m;
      if (mean > best + 1e-9) { best = mean; bestJ = j; }
    }
    return g.firstBeat + bestJ * P;
  }
  const peaks = g.peaks || [], dur = g.durationSeconds;
  if (!peaks.length || !(dur > 0)) return null;
  const bucket = dur / peaks.length, span = Math.max(1, Math.round(P / bucket));
  let best = -1, at = 0;
  for (let i = 0; i + span <= peaks.length; i++) {
    let sum = 0;
    for (let k = i; k < i + span; k++) sum += peaks[k] || 0;
    if (sum > best + 1e-9) { best = sum; at = i; }
  }
  return at * bucket;
}

// ---------------------------------------------------------------------------------------------------------------
// In-shot motion. The reference's footage moves (surf, swaying palms, a car on a road); calm holds read static in the
// small window. The panel (and the headless adapter) measures every analysed clip once with ffmpeg: 4 frames per
// second, 64 px wide, grey, and the mean absolute difference of consecutive frames (signalstats YAVG of a tblend
// difference, 0-255). TEC_MOTION_FILTER ends in `file=`: the caller appends a file name (no path: it runs ffmpeg in
// the folder that receives the file, so the filtergraph never has to escape a path).
const TEC_MOTION_FILTER = 'fps=4,scale=64:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=';
// Allocation bonus for a moving window: TEC_MOTION_WEIGHT x its normalised motion (0-1). Below one role-rank step
// (0.15), so scene relevance still decides between a good and a poor match.
const TEC_MOTION_WEIGHT = 0.1;
// A sample above TEC_MOTION_SPIKE x the window's median is capped there (a flash, an in-clip cut, a bump), so one
// frame never makes a still window look moving.
const TEC_MOTION_SPIKE = 3;
// A window whose raw peak is at least TEC_MOTION_FLASH_MIN and TEC_MOTION_FLASH x its median holds a flash or a cut;
// one whose (capped) mean is above TEC_MOTION_SHAKE is shaky or strobing. Both score -1 (a penalty).
const TEC_MOTION_FLASH = 6;
const TEC_MOTION_FLASH_MIN = 8;
const TEC_MOTION_SHAKE = 30;
// Normalisation is on a log scale between the pool's quartiles (+ this floor): the lower quartile scores 0, the upper
// quartile and above 1 (capped), the median about 0.5.
const TEC_MOTION_LOG_FLOOR = 0.05;
// Still shots (for the gentle move on video): below TEC_MOTION_STILL always; above TEC_MOTION_MOVING never; in between
// when the window sits in the pool's lower third.
const TEC_MOTION_STILL = 0.6;
const TEC_MOTION_MOVING = 3;

// ffmpeg's metadata=print output ("frame:N pts:P pts_time:T" then "lavfi.signalstats.YAVG=V") -> { times, values }
// in time order, or null without a sample.
function tecParseMotion(text) {
  const times = [], values = [];
  let t = null;
  for (const line of String(text == null ? '' : text).split(/\r?\n/)) {
    const pt = /pts_time:\s*(-?[\d.]+(?:e-?\d+)?)/.exec(line);
    if (pt) { t = Number(pt[1]); continue; }
    const yv = /lavfi\.signalstats\.YAVG=\s*(-?[\d.]+(?:e-?\d+)?)/.exec(line);
    if (yv && t != null && isFinite(t) && isFinite(Number(yv[1]))) { times.push(t); values.push(Math.max(0, Number(yv[1]))); t = null; }
  }
  if (!times.length) return null;
  const order = times.map((_, i) => i).sort((a, b) => times[a] - times[b]);
  return { times: order.map(i => times[i]), values: order.map(i => values[i]) };
}

function tecMedian(list) {
  if (!list.length) return null;
  const s = list.slice().sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function tecQuantile(sorted, q) {
  if (!sorted.length) return null;
  const x = q * (sorted.length - 1), i = Math.floor(x), f = x - i;
  return i + 1 < sorted.length ? sorted[i] * (1 - f) + sorted[i + 1] * f : sorted[i];
}

// Motion of a curve inside (start, start + dur] (a sample at t is the difference of the frames at t - 1/4 s and t, so
// the samples in that range compare frames inside the window).
// Returns { mean (spike-capped), median, peak (raw), flash, n } or null when the window holds no sample.
function tecMotionStats(curve, start, dur) {
  if (!curve || !Array.isArray(curve.times) || !Array.isArray(curve.values)) return null;
  const v = [];
  for (let i = 0; i < curve.times.length; i++) if (curve.times[i] > start + 1e-9 && curve.times[i] <= start + dur + 1e-9) v.push(curve.values[i]);
  if (!v.length) return null;
  const median = tecMedian(v), cap = TEC_MOTION_SPIKE * Math.max(median, 0.1);
  const mean = v.reduce((a, x) => a + Math.min(x, cap), 0) / v.length;
  const peak = Math.max(...v);
  return { mean, median, peak, flash: peak >= TEC_MOTION_FLASH_MIN && peak > TEC_MOTION_FLASH * Math.max(median, 0.1), n: v.length };
}
// The spike-capped mean motion of a window, or null when it is unknown.
function tecMotionAt(curve, start, dur) {
  const m = tecMotionStats(curve, start, dur);
  return m ? m.mean : null;
}

// The pool's motion quartiles and lower third over every sample of every curve (rid -> curve), or null.
function tecMotionPool(curves) {
  const all = [];
  for (const c of Object.values(curves || {})) if (c && Array.isArray(c.values)) for (const v of c.values) if (isFinite(v)) all.push(v);
  if (!all.length) return null;
  all.sort((a, b) => a - b);
  return { q25: tecQuantile(all, 0.25), q33: tecQuantile(all, 1 / 3), q75: tecQuantile(all, 0.75), samples: all.length };
}

// A window's motion score for the allocation: -1 for a flash, a cut or shake; else 0 at or below the pool's lower
// quartile rising (log scale) to 1 at its upper quartile, capped there. 0 without data (the current scoring).
function tecMotionScore(stats, pool) {
  if (!stats || !pool) return 0;
  if (stats.flash || stats.mean > TEC_MOTION_SHAKE) return -1;
  const f = TEC_MOTION_LOG_FLOOR, lo = Math.log(pool.q25 + f), hi = Math.log(pool.q75 + f);
  if (!(hi - lo > 1e-9)) return 0;
  return Math.max(0, Math.min(1, (Math.log(stats.mean + f) - lo) / (hi - lo)));
}

// Whether a video window reads still (it gets a gentle move): unknown motion counts as still.
function tecMotionStill(mean, pool) {
  if (typeof mean !== 'number' || !isFinite(mean)) return true;
  if (mean < TEC_MOTION_STILL) return true;
  if (mean > TEC_MOTION_MOVING) return false;
  return !!pool && mean < pool.q33;
}

// ---------------------------------------------------------------------------------------------------------------
// Shot allocation (adapted from the City Weekend Vlog allocator)

// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates. They score below any real hit and are only used by the last tiers.
const TEC_FILLER_STEP = 0.5;
const TEC_FILLER_EDGE = 0.25;
const TEC_FILLER_SCORE = -2;
// A video window ends at least this far before the end of its source (the real fps and the music offset can
// lengthen a shot by a frame after planning).
const TEC_SOURCE_TAIL = 0.05;
// Photos: an image source lasts 5 s, so a photo fills one slot of at most that length (never the 5.1 s Full frame
// shot 0). About TEC_PHOTO_SHARE of the shots are photo slots; at most TEC_PHOTO_RUN_MAX photos in a row while
// anything else fits. The first and last shots prefer video (photos rank after fillers there).
const TEC_PHOTO_HOLD_MAX = 5;
const TEC_PHOTO_RUN_MAX = 2;
const TEC_PHOTO_SHARE = 1 / 3;

function tecHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Filler candidates every TEC_FILLER_STEP seconds on each source in the candidates, sorted by rid then time.
function tecFillers(candidates) {
  const dur = {};
  for (const c of candidates) {
    if (!c || c.kind === 'photo' || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    for (let k = 0; ; k++) {
      const t = TEC_FILLER_EDGE + k * TEC_FILLER_STEP;
      if (t > dur[rid] - TEC_FILLER_EDGE + 1e-9) break;
      out.push({ rid, role: 'filler', t, score: TEC_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// opts: { candidates: [{ rid, role, t, score, sourceDuration } | { rid, kind: 'photo' }], slots: [{ index, role,
// seconds, prefersVideo? }], seed, photoShare?, gapSeconds?, motion?: { curves: { rid: curve }, pool } }. Slots are
// the footage slots in timeline order. With motion, a video window's value gains TEC_MOTION_WEIGHT x tecMotionScore
// and its pick records the window's `motion` (tecMotionAt; null when that clip was not measured).
// The same source never plays in two adjacent slots: a slot with no other fitting source stays empty (missing), so
// tecPlanBuild shrinks the Length instead. Windows of one source never overlap (with a gap of gapSeconds).
function tecAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const curves = opts.motion && opts.motion.curves ? opts.motion.curves : null, motionPool = opts.motion ? opts.motion.pool || null : null;
  const finite = v => typeof v === 'number' && isFinite(v);
  const pool = opts.candidates.filter(c => c && c.kind !== 'photo' && finite(c.t) && finite(c.score) && finite(c.sourceDuration) && c.sourceDuration > 0);
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  const used = {}, recent = [], picks = [], photoUsed = {};
  let missing = 0, fillerShots = 0, photoShots = 0, photoRun = 0, photoRunRelaxed = false, prevRid = null;
  const photoSlots = {};
  const holdable = opts.slots.filter(sl => !sl.prefersVideo && sl.seconds <= TEC_PHOTO_HOLD_MAX + 1e-9);
  const share = opts.photoShare == null ? TEC_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(opts.slots.length * share));
  const phase = tecHash(opts.seed + ':photo-slots');
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;
  function searchVideo(slot, rankOf) {
    let best = null;
    for (const c of pool) {
      if (c.rid === prevRid) continue;
      const rank = rankOf(c);
      if (rank < 0 || c.sourceDuration < slot.seconds + TEC_SOURCE_TAIL) continue;
      const start = Math.max(0, Math.min(c.sourceDuration - TEC_SOURCE_TAIL - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      const ms = curves && curves[c.rid] ? tecMotionStats(curves[c.rid], start, slot.seconds) : null;
      const value = c.score - rank * 0.15 - repeats * 0.2 + tecHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05 + TEC_MOTION_WEIGHT * tecMotionScore(ms, motionPool);
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end, motion: ms ? ms.mean : null };
    }
    return best;
  }
  function searchPhoto(slot) {
    if (slot.seconds > TEC_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const c of photos) {
      if (photoUsed[c.rid] || c.rid === prevRid) continue;
      const value = tecHash(opts.seed + ':photo:' + c.rid);
      if (!best || value > best.value + 1e-12) best = { value, c, photo: true };
    }
    return best;
  }
  for (const slot of opts.slots) {
    const roles = TEC_ROLE_FALLBACK[slot.role] || [slot.role];
    const runFull = photoRun >= TEC_PHOTO_RUN_MAX;
    const preferred = () => searchVideo(slot, c => roles.indexOf(c.role));
    const anyReal = () => searchVideo(slot, c => (c.role === 'filler' ? -1 : 0));
    const filler = () => searchVideo(slot, c => (c.role === 'filler' ? 0 : -1));
    const photo = () => searchPhoto(slot);
    const tiers = photoSlots[slot.index] ? [photo, preferred, anyReal, filler]
      : slot.prefersVideo ? [preferred, anyReal, filler, photo] : [preferred, anyReal, photo, filler];
    let best = null;
    for (const tier of tiers) {
      if (runFull && tier === photo) continue;
      if ((best = tier())) break;
    }
    if (!best && runFull && (best = photo())) { best.runRelaxed = true; photoRunRelaxed = true; }
    if (!best) { missing++; picks.push(null); photoRun = 0; prevRid = null; continue; }
    prevRid = best.c.rid;
    recent.push(best.c.rid);
    if (recent.length > 3) recent.shift();
    if (best.photo) {
      photoUsed[best.c.rid] = true;
      photoShots++; photoRun++;
      picks.push({ slot: slot.index, rid: best.c.rid, kind: 'photo', holdSeconds: slot.seconds });
      continue;
    }
    photoRun = 0;
    (used[best.c.rid] = used[best.c.rid] || []).push([best.start, best.end]);
    if (best.c.role === 'filler') fillerShots++;
    const pick = { slot: slot.index, rid: best.c.rid, kind: 'video', startSeconds: best.start, endSeconds: best.end };
    if (curves) pick.motion = best.motion == null ? null : Math.round(best.motion * 1000) / 1000;
    picks.push(pick);
  }
  return { picks, filled: picks.filter(Boolean).length, missing, fillerShots, photoShots, photoRunRelaxed };
}

// Footage slots of a timeline for tecAllocate: Classic skips the opening (lead-in gap) slot. The first and last
// footage slots prefer video.
function tecFootageSlots(timeline) {
  const shots = timeline.slots.filter(s => s.kind === 'shot');
  return shots.map((s, i) => ({ index: s.index, role: s.role, seconds: s.seconds, prefersVideo: i === 0 || i === shots.length - 1 }));
}

// opts: { layout, N (requested grid shots), P, candidates, seed, photoShare?, motion? (rid -> tecParseMotion curve;
// clips without one score as before) }. Tries N first, then shrinks toward TEC_MIN_SHOTS; every attempt allocates
// from scratch with filler candidates added. Returns { ok: true, layout, N, timeline, picks (one per footage slot, in
// order), visibleShots, fillerShots, photoShots, motionPool (null without motion data), ... }
// or { ok: false, usableShots, needed } (needed = 4 visible shots in Classic, 4 + 1 in Full frame).
function tecPlanBuild(opts) {
  const layout = opts.layout === 'full' ? 'full' : 'classic';
  const top = Math.max(TEC_MIN_SHOTS, opts.N);
  const needed = TEC_MIN_SHOTS + (layout === 'full' ? 1 : 0);
  const candidates = opts.candidates.concat(tecFillers(opts.candidates));
  const curves = {};
  for (const rid of Object.keys(opts.motion || {})) if (opts.motion[rid] && Array.isArray(opts.motion[rid].values)) curves[rid] = opts.motion[rid];
  const pool = tecMotionPool(curves);
  const motion = pool ? { curves, pool } : null;
  let last = null;
  for (let n = top; n >= TEC_MIN_SHOTS; n--) {
    const timeline = tecTimeline({ layout, N: n, P: opts.P });
    const alloc = tecAllocate({ candidates, slots: tecFootageSlots(timeline), seed: opts.seed, photoShare: opts.photoShare, motion });
    if (alloc.missing === 0) {
      const plan = { ok: true, layout, N: n, requestedN: opts.N, shrunk: n < opts.N, timeline, picks: alloc.picks, visibleShots: alloc.picks.length,
        needed, fillerShots: alloc.fillerShots, photoShots: alloc.photoShots, motionPool: pool };
      if (alloc.photoRunRelaxed) plan.photoRunRelaxed = true;
      return plan;
    }
    last = alloc;
  }
  return { ok: false, layout, usableShots: last ? last.filled : 0, needed, photoShots: last ? last.photoShots : 0 };
}

// Shot motions, in pick order. Deterministic per seed; never the same motion family twice in a row (one chain over
// photos and videos); drift, tilt and push-drift directions alternate. The shot sits in a 16:9 window and is
// cover-cropped, so a source narrower than 16:9 (portrait, 4:3, 3:2) has room on y and only a wider one on x; an
// unknown size counts as a 3:2 photo / a 16:9 video.
// - Photos: any family (push-in, pull-out, drift, tilt, push-drift); strength 0.6 of CWV's.
// - Videos (opts.videos, default on): a still window (tecMotionStill on the pick's measured `motion`; unknown counts
//   as still) gets a gentle push-in or drift at 0.3 of CWV's; a moving one stays 'none'. No punch or zoom hit.
// Each entry is { motion, direction, axis, strength (x CWV's move), frameStrength (the Shot frame's `strength`
// parameter: the effect scales it by 0.6) }; null for an empty slot, and for every video with opts.videos false.
const TEC_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const TEC_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
const TEC_VIDEO_MOTION_FAMILIES = ['push-in', 'drift'];
const TEC_PHOTO_MOTION_STRENGTH = 0.6;
const TEC_VIDEO_FRAME_STRENGTH = 0.5;
function tecShotMotions(picks, seed, sizes, opts) {
  const videos = !opts || opts.videos !== false, pool = opts && opts.pool ? opts.pool : null;
  const out = [];
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  for (const pick of picks) {
    if (!pick || (pick.kind !== 'photo' && !videos)) { out.push(null); continue; }
    const photo = pick.kind === 'photo';
    const size = sizes && sizes[pick.rid];
    const aspect = size && size.width > 0 && size.height > 0 ? size.width / size.height : photo ? 1.5 : 16 / 9;
    const axis = aspect > 16 / 9 + 1e-6 ? 'x' : 'y';
    if (!photo && !tecMotionStill(pick.motion, pool)) {
      out.push({ motion: 'none', direction: 1, axis, strength: TEC_PHOTO_MOTION_STRENGTH * TEC_VIDEO_FRAME_STRENGTH, frameStrength: TEC_VIDEO_FRAME_STRENGTH });
      continue;
    }
    const families = (photo ? TEC_MOTION_FAMILIES : TEC_VIDEO_MOTION_FAMILIES).filter(f => f !== lastFamily)
      .map(f => ({ f, v: tecHash(seed + ':motion:' + k + ':' + f) }))
      .sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1));
    const family = families[0].f;
    let motion = family, direction = 1;
    if (family === 'drift') {
      direction = driftSign[axis]; driftSign[axis] = -direction;
      motion = axis === 'x' ? (direction > 0 ? 'drift-right' : 'drift-left') : (direction > 0 ? 'drift-down' : 'drift-up');
    } else if (family === 'tilt') { direction = tiltSign; tiltSign = -tiltSign; }
    else if (family === 'push-drift') { direction = pushDriftSign; pushDriftSign = -pushDriftSign; }
    out.push(photo ? { motion, direction, axis, strength: TEC_PHOTO_MOTION_STRENGTH, frameStrength: 1 }
      : { motion, direction, axis, strength: TEC_PHOTO_MOTION_STRENGTH * TEC_VIDEO_FRAME_STRENGTH, frameStrength: TEC_VIDEO_FRAME_STRENGTH });
    lastFamily = family; k++;
  }
  return out;
}
// Photo motions only (videos null): the photo-only form of tecShotMotions.
function tecPhotoMotions(picks, seed, sizes) { return tecShotMotions(picks, seed, sizes, { videos: false }); }

// ---------------------------------------------------------------------------------------------------------------
// Title typing (spec R5): one slot per grapheme (Array.from), spaces included, no cursor. Glyph i (zero-based)
// appears at startSec + i * slotSec with slotSec = min(0.42, 4.4 / n), so typing completes by 0.47 + 4.4 = 4.87 s.
const TEC_TYPE_START = 0.47;
const TEC_TYPE_SLOT = 0.42;
const TEC_TYPE_BUDGET = 4.4;
function tecTyping(text) {
  const glyphs = Array.from(String(text == null ? '' : text));
  const n = glyphs.length;
  const slotSec = n > 0 ? Math.min(TEC_TYPE_SLOT, TEC_TYPE_BUDGET / n) : TEC_TYPE_SLOT;
  const times = glyphs.map((_, i) => TEC_TYPE_START + i * slotSec);
  return { slots: n, slotSec, startSec: TEC_TYPE_START, glyphs, times, doneSec: TEC_TYPE_START + n * slotSec };
}
// How many glyphs are visible at `sec` (0 before the first one appears).
function tecTypedCount(typing, sec) {
  if (!(sec >= typing.startSec - 1e-9)) return 0;
  return Math.min(typing.slots, Math.floor((sec - typing.startSec) / typing.slotSec + 1e-9) + 1);
}

// ---------------------------------------------------------------------------------------------------------------
// Credits

const TEC_NAME_PLACEHOLDER = '[Name Here]';
const TEC_FILM_CREW_ROLES = ['Director', 'Screenwriter', 'Editor', 'Original Score by', 'Production Designer', 'Costume Designer',
  'Visual Effects Supervisor', 'Sound Designer', 'Makeup Artist', 'Lighting Technician'];
const TEC_PRESETS = {
  filmCrew: { id: 'filmCrew', label: 'Film crew' },
  personal: { id: 'personal', label: 'Personal' },
  travel: { id: 'travel', label: 'Travel' },
};
const TEC_PRESET_ORDER = ['filmCrew', 'personal', 'travel'];
const TEC_DEFAULT_PRESET = 'filmCrew';
const TEC_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// A capture range longer than this many days reads as a month ("September 2026") instead of days.
const TEC_DAY_RANGE_MAX = 10;
const TEC_EN_DASH = '\u2013';
const TEC_MID_DOT = '\u00b7';

// The CWV place heuristic: a short Latin Project name that does not look like a working title.
function tecSuggestPlace(projectName) {
  const name = String(projectName || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!/^[A-Za-z][A-Za-z .']{1,30}$/.test(name)) return '';
  if (/\b(project|untitled|test|draft|copy|export|final|edit|vlog)\b/i.test(name)) return '';
  return name;
}

// A date string -> { y, m (0-11), d } in the recorded local date. A leading YYYY-MM-DD is read as written (the
// recording's own calendar date, independent of the viewer's time zone); anything else goes through Date.
function tecParseDate(value) {
  if (value == null || value === '') return null;
  const s = String(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const y = +iso[1], m = +iso[2] - 1, d = +iso[3];
    return m >= 0 && m < 12 && d >= 1 && d <= 31 ? { y, m, d } : null;
  }
  if (typeof Date !== 'function') return null;
  const t = new Date(s);
  return isNaN(t.getTime()) ? null : { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
}

// Capture dates -> "Sep 12, 2026", "Sep 12-14, 2026", "Sep 28 - Oct 2, 2026", "September 2026",
// "Sep - Nov 2026" or "Dec 30, 2025 - Jan 2, 2026"; '' without a usable date.
function tecDateRange(dates) {
  const list = (dates || []).map(tecParseDate).filter(Boolean).sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
  if (!list.length) return '';
  const a = list[0], b = list[list.length - 1];
  const short = m => TEC_MONTHS[m].slice(0, 3);
  const dayNo = x => Math.floor(Date.UTC(x.y, x.m, x.d) / 86400000);
  const span = dayNo(b) - dayNo(a);
  if (span === 0) return short(a.m) + ' ' + a.d + ', ' + a.y;
  if (span <= TEC_DAY_RANGE_MAX) {
    if (a.y === b.y && a.m === b.m) return short(a.m) + ' ' + a.d + TEC_EN_DASH + b.d + ', ' + a.y;
    if (a.y === b.y) return short(a.m) + ' ' + a.d + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + b.d + ', ' + a.y;
    return short(a.m) + ' ' + a.d + ', ' + a.y + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + b.d + ', ' + b.y;
  }
  if (a.y === b.y && a.m === b.m) return TEC_MONTHS[a.m] + ' ' + a.y;
  if (a.y === b.y) return short(a.m) + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + a.y;
  return short(a.m) + ' ' + a.y + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + b.y;
}

// "7 clips . 2 photos", "1 clip", "3 photos"; '' when both are 0.
function tecMomentsText(clips, photos) {
  const parts = [];
  const c = clips > 0 ? Math.floor(clips) : 0, p = photos > 0 ? Math.floor(photos) : 0;
  if (c) parts.push(c + (c === 1 ? ' clip' : ' clips'));
  if (p) parts.push(p + (p === 1 ? ' photo' : ' photos'));
  return parts.join(' ' + TEC_MID_DOT + ' ');
}

// The Music credit: the cue title + " (Selects library)", or the own-music file name without its extension.
function tecMusicCredit(info) {
  const own = String((info && info.ownMusicName) || '').trim();
  if (own) return own.replace(/^.*[\\/]/, '').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  const cue = String((info && info.cueTitle) || '').trim();
  return cue ? cue + ' (Selects library)' : '';
}

// Drops rows whose role and name are both blank; trims both fields. Always returns fresh { role, name } objects.
function tecCleanRows(rows) {
  return (rows || []).filter(Boolean).map(r => ({ role: String(r.role == null ? '' : r.role).trim(), name: String(r.name == null ? '' : r.name).trim() }))
    .filter(r => r.role !== '' || r.name !== '');
}

// Rows still holding a bracketed placeholder such as "[Name Here]" (indices).
function tecPlaceholderRows(rows) {
  const out = [];
  (rows || []).forEach((r, i) => { if (r && /\[[^\]]*\]/.test(String(r.role || '') + ' ' + String(r.name || ''))) out.push(i); });
  return out;
}

// info: { projectName, dates: [recordedAt...], cueTitle, ownMusicName, clips, photos }. Rows with no value are dropped.
function tecPersonalDefaults(info) {
  const i = info || {};
  return tecCleanRows([
    { role: 'A film by', name: '[Your name]' },
    { role: 'Filmed in', name: tecSuggestPlace(i.projectName) },
    { role: 'Filmed on', name: tecDateRange(i.dates) },
    { role: 'Starring', name: '[Names]' },
    { role: 'Music', name: tecMusicCredit(i) },
    { role: 'Moments', name: tecMomentsText(i.clips, i.photos) },
    { role: 'Edited with', name: 'Selects' },
    { role: 'Special thanks', name: '[Names]' },
  ].filter(r => r.name !== ''));
}

function tecTravelDefaults(info) {
  const i = info || {};
  return tecCleanRows([
    { role: 'Directed by', name: '[Your name]' },
    { role: 'Starring', name: '[Names]' },
    { role: 'Memories', name: tecMomentsText(i.clips, i.photos) },
    { role: 'Places', name: tecSuggestPlace(i.projectName) },
    { role: 'Music by', name: tecMusicCredit(i) },
    { role: 'Special Thanks', name: '[Names]' },
    { role: 'Created with', name: 'Selects' },
  ].filter(r => r.name !== ''));
}

// The rows of a preset (a fresh array every call). Unknown ids fall back to the default preset.
function tecPresetRows(presetId, info) {
  if (presetId === 'personal') return tecPersonalDefaults(info);
  if (presetId === 'travel') return tecTravelDefaults(info);
  return TEC_FILM_CREW_ROLES.map(role => ({ role, name: TEC_NAME_PLACEHOLDER }));
}

// Credit roll layout model. All vertical numbers are 1080p pixels (scaled by H / 1080); x and widths are shares of W.
// The title box is fixed at [titleTop, titleTop + titleCap] whatever the title text (the graphic fits the title
// inside it); the first role's top is titleToFirstRole below the box. Each pair: role (roleSize), name (nameSize)
// roleToName below the role's top; the next role pairPitch below. A line wider than the column is fitted down to
// minFit of its size; beyond that it wraps to 2 lines (word boundary, most balanced split) and the pair's pitch
// grows by that line's height (roleLine / nameLine). Line boxes follow the graphic: a line's baseline is its top plus
// ascent x its nominal size, and its box ends descent x its (fitted) size below the baseline.
// The roll speed makes the credits roll completely off the top before the video ends: the bottom of the last line
// (the last name line, or the last role line when the last pair has no name) crosses y = 0 exitLead s before the
// end, and the last exitLead s show no credit text while the window finishes fading. Reference (measured on its clean
// render): a constant roll of about 67 px/s at 1080p to the very end, the last name line's bottom at 2.4 % of H on
// the final frame, so it clears the frame about 0.4 s after the end.
const TEC_CREDIT_METRICS = {
  titleTop: 425, titleCap: 173, titleToFirstRole: 101,
  roleSize: 28, nameSize: 24, roleToName: 43, pairPitch: 123,
  roleLine: 39.2, nameLine: 33.6, minFit: 0.7, maxLines: 2,
  classic: { centerX: 0.223, maxWidth: 0.40 },
  // Full frame: the title lands higher (cap centre 0.28 H in the graphic), so the column starts 207 px higher.
  full: { centerX: 0.78, maxWidth: 0.30, titleShift: -207 },
  ascent: 1.05, descent: 0.35,
  exitLead: 0.3, basePxPerSec: 67, minSpeed: 0.6, maxSpeed: 1.6,
};

// Fits one credit line. measure(text, fontPx, kind) -> width in px at that size. Returns
// { lines: [text...], fontPx, scale, overflow } (overflow: still wider than maxWidth at minFit, e.g. one long word).
function tecFitLine(text, basePx, maxWidth, measure, kind) {
  const M = TEC_CREDIT_METRICS;
  const s = String(text == null ? '' : text);
  if (s === '') return { lines: [], fontPx: basePx, scale: 1, overflow: false };
  const w = measure(s, basePx, kind);
  if (w <= maxWidth + 1e-9) return { lines: [s], fontPx: basePx, scale: 1, overflow: false };
  if (w * M.minFit <= maxWidth + 1e-9) { const scale = maxWidth / w; return { lines: [s], fontPx: basePx * scale, scale, overflow: false }; }
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 2) return { lines: [s], fontPx: basePx * M.minFit, scale: M.minFit, overflow: true };
  let best = null;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    const wide = Math.max(measure(a, basePx, kind), measure(b, basePx, kind));
    if (!best || wide < best.wide - 1e-9) best = { lines: [a, b], wide };
  }
  const scale = Math.max(M.minFit, Math.min(1, maxWidth / best.wide));
  return { lines: best.lines, fontPx: basePx * scale, scale, overflow: best.wide * scale > maxWidth + 1e-9 };
}

// opts: { rows, layout: 'classic' | 'full', H, W? (default H * 16 / 9), measure }. Returns every line's top y at the
// moment the roll starts (revealFrame): { H, W, k, centerX, maxWidth, title: { top, bottom }, rows: [{ index, top,
// bottom, pitch, lastLineBottom, role: { lines, fontPx, scale, overflow, top, lineHeight, lineBottom }, name: {...} }],
// firstRoleTop, lastRoleTop, lastLineBottom (null without rows), rowTops, rowBottoms }. A part's lineBottom is the
// line-box bottom of its last line in the graphic's model (null when the part is empty); a row's lastLineBottom is
// its name's, or its role's without a name.
function tecCreditLayout(opts) {
  const M = TEC_CREDIT_METRICS;
  const H = opts.H > 0 ? opts.H : 1080, W = opts.W > 0 ? opts.W : H * 16 / 9, k = H / 1080;
  const col = opts.layout === 'full' ? M.full : M.classic;
  const maxWidth = col.maxWidth * W;
  const measure = opts.measure;
  if (typeof measure !== 'function') throw Error('tecCreditLayout needs a measure function');
  const shift = (col.titleShift || 0) * k;
  const title = { top: (M.titleTop * k) + shift, bottom: (M.titleTop + M.titleCap) * k + shift };
  const rows = [];
  let y = title.bottom + M.titleToFirstRole * k;
  (opts.rows || []).forEach((r, index) => {
    const role = tecFitLine(r.role, M.roleSize * k, maxWidth, measure, 'role');
    const name = tecFitLine(r.name, M.nameSize * k, maxWidth, measure, 'name');
    const roleExtra = Math.max(0, role.lines.length - 1) * M.roleLine * k;
    const nameExtra = Math.max(0, name.lines.length - 1) * M.nameLine * k;
    role.top = y; role.lineHeight = M.roleLine * k;
    name.top = y + M.roleToName * k + roleExtra; name.lineHeight = M.nameLine * k;
    // The graphic's baselines: role line 0 at y + ascent x roleSize, name line 0 roleToName (+ the role's wrap) below.
    const roleBase = y + M.ascent * M.roleSize * k, nameBase = roleBase + M.roleToName * k + roleExtra;
    role.lineBottom = role.lines.length ? roleBase + (role.lines.length - 1) * role.lineHeight + M.descent * role.fontPx : null;
    name.lineBottom = name.lines.length ? nameBase + (name.lines.length - 1) * name.lineHeight + M.descent * name.fontPx : null;
    const pitch = M.pairPitch * k + roleExtra + nameExtra;
    rows.push({ index, top: y, bottom: name.top + Math.max(1, name.lines.length) * M.nameLine * k, pitch,
      lastLineBottom: name.lineBottom != null ? name.lineBottom : role.lineBottom, role, name });
    y += pitch;
  });
  return {
    H, W, k, layout: opts.layout === 'full' ? 'full' : 'classic', centerX: col.centerX * W, maxWidth, title, rows,
    firstRoleTop: rows.length ? rows[0].top : null,
    lastRoleTop: rows.length ? rows[rows.length - 1].top : null,
    lastLineBottom: rows.length ? rows[rows.length - 1].lastLineBottom : null,
    rowTops: rows.map(r => r.top),
    rowBottoms: rows.map(r => r.lastLineBottom),
  };
}

// Roll speed (spec R5/R7). opts: { endSec, L?, H, lastLineBottom (the last line's box bottom at the roll start;
// null or undefined without rows), rowTops? (every role's top, for hiddenRows), rowBottoms? (every row's last line
// bottom, for removeRows), layout? (ignored) }.
// raw = lastLineBottom / (endSec - exitLead - L): the last line's bottom crosses y = 0 exitLead (0.3 s) before the
// end. Clamped to [0.6, 1.6] x 67 px/s (scaled by H / 1080). Without rows the speed is the reference 67 px/s.
// Returns { pxPerSec, rawPxPerSec, basePxPerSec, minPxPerSec, maxPxPerSec, exitSec (when the last line clears the
// top at pxPerSec; null without rows), clamped: 'high' | 'low' | null, endsEarly (0.6x clears the top earlier than
// the target), exitsLate (even 1.6x can't clear the top before the end target: text is left on screen), hiddenRows
// (indices whose top never rises above H before the end), removeRows (rows to drop so the last line can clear the
// top by the target at <= 1.6x; 0 when it already does) }.
function tecRollSpeed(opts) {
  const M = TEC_CREDIT_METRICS;
  const H = opts.H > 0 ? opts.H : 1080, k = H / 1080, L = opts.L == null ? TEC_LEAD_IN : opts.L;
  const base = M.basePxPerSec * k, lo = base * M.minSpeed, hi = base * M.maxSpeed;
  const span = opts.endSec - L, exitSpan = span - M.exitLead;
  const out = { pxPerSec: base, rawPxPerSec: null, basePxPerSec: base, minPxPerSec: lo, maxPxPerSec: hi, exitSec: null, clamped: null,
    endsEarly: false, exitsLate: false, hiddenRows: [], removeRows: 0 };
  const last = opts.lastLineBottom;
  if (last == null || !isFinite(last) || !(exitSpan > 0)) return out;
  const raw = last / exitSpan;
  out.rawPxPerSec = raw;
  if (raw > hi + 1e-9) { out.pxPerSec = hi; out.clamped = 'high'; out.exitsLate = true; }
  else if (raw < lo - 1e-9) { out.pxPerSec = lo; out.clamped = 'low'; out.endsEarly = true; }
  else out.pxPerSec = raw;
  out.exitSec = L + last / out.pxPerSec;
  const tops = Array.isArray(opts.rowTops) ? opts.rowTops : [];
  tops.forEach((top, i) => { if (top - out.pxPerSec * span >= H - 1e-9) out.hiddenRows.push(i); });
  const bottoms = Array.isArray(opts.rowBottoms) ? opts.rowBottoms : [];
  if (out.exitsLate && bottoms.length) {
    let keep = bottoms.length;
    while (keep > 1 && bottoms[keep - 1] / exitSpan > hi + 1e-9) keep--;
    out.removeRows = bottoms.length - keep;
  }
  return out;
}

// When the title's bottom edge leaves the top of the frame (seconds from the video start).
function tecTitleExitSec(layout, pxPerSec, L) {
  return (L == null ? TEC_LEAD_IN : L) + layout.title.bottom / pxPerSec;
}

// ---------------------------------------------------------------------------------------------------------------
// Build progress: 5 UI steps over 6 operations (Prepare = inventory + search; Plan; Music = ensure-audio;
// Assemble; Decorate). Each step's share of the bar is in percent.
const TEC_BUILD_STEPS = [
  { id: 'prepare', label: 'Finding shots', weight: 35 },
  { id: 'plan', label: 'Planning the edit', weight: 5 },
  { id: 'music', label: 'Preparing music', weight: 10 },
  { id: 'assemble', label: 'Creating Draft', weight: 30 },
  { id: 'decorate', label: 'Adding credits and look', weight: 20 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function tecProgress(stepId, fraction, detail) {
  const i = TEC_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = TEC_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = TEC_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + TEC_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  const step = TEC_BUILD_STEPS[i];
  return {
    value,
    percent,
    current: i,
    label: 'Step ' + (i + 1) + '/' + TEC_BUILD_STEPS.length + ' \u00b7 ' + step.label + (detail ? ' (' + detail + ')' : '') + ' \u00b7 ' + percent + '%',
  };
}
// tec-planner:end

// Double quotes let $HOME and $SELECTS_USER_SKILLS_ROOT expand: use only for those constants.
function dq(value: string) { return '"' + String(value).replace(/(["\\`])/g, "\\$1") + '"'; }
// Single quotes pass user paths to the shell literally (no $, backtick or glob expansion).
function sq(value: string) { return "'" + String(value).replace(/'/g, "'\\''") + "'"; }
function service(name: string, method: string) {
  const s = (window.parent as any)?.__DI__?.[name];
  if (!s || typeof s[method] !== "function") throw new Error("This Selects build needs an updated " + name + " adapter.");
  return s;
}
async function readText(root: string, rel: string) {
  const v = await service("FileSystem", "readFile").readFile(root + "/" + rel);
  // Some host builds return text directly; others return bytes.
  return typeof v === "string" ? v : new TextDecoder().decode(new Uint8Array(v));
}
// The config goes in as JSON.parse of a string so its type is `any`: an inlined literal widens `type` to string
// (rejected by EditableParameterDefinition[]) and narrows a null option to `never` inside its `if`.
function fill(script: string, cfg: unknown) { return script.replace("__CONFIG__", () => "JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"); }
// Apps started from Finder get a bare PATH, so shell steps also look in Homebrew and the newest nvm Node.
const TOOL_PATH = 'export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"; '
  + 'n=$( (ls -d "$HOME"/.nvm/versions/node/*/bin) 2>/dev/null | sort -V | tail -1); [ -n "$n" ] && export PATH="$PATH:$n"; ';
// Thrown when the Project changed while a build was running; its results are dropped silently.
const STALE = new Error("The Project changed during the build.");

function photoCandsOf(inventory: any, onlyPhotos: string[] | null, usePhotos: boolean) {
  if (!usePhotos || !inventory) return [];
  return (inventory.photos || []).map((r: any) => r.rid as string).filter((rid: string) => !onlyPhotos || onlyPhotos.includes(rid)).map((rid: string) => ({ rid, kind: "photo" }));
}
// A short orientation hint for the clip list; nothing when the frame size is unknown.
function shapeHint(width: number | null, height: number | null) {
  if (!(width! > 0) || !(height! > 0)) return "";
  const r = width! / height!;
  return r < 0.9 ? "Tall" : r > 1.1 ? "Wide" : "Square";
}
function fmtTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
// Resolves a --panel-* colour for canvas drawing; falls back when the token is missing or not a colour.
function themeColor(el: Element, ctx: CanvasRenderingContext2D, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  if (!v) return fallback;
  ctx.fillStyle = "#010203";
  ctx.fillStyle = v;
  return ctx.fillStyle === "#010203" ? fallback : v;
}
// The bundled fonts are Latin subsets; anything beyond Latin-1, Latin Extended-A and general punctuation falls back.
function hasNonLatin(text: string) { return /[^\u0000-\u017f\u2000-\u206f]/.test(text); }
function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function easeInOut(p: number) { const x = clamp01(p); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

// Canvas text measurement in the bundled faces (1080p pixels). The planner's credit layout, the roll speed and the
// preview all use it, like the graphic does at render.
let measureCtx: CanvasRenderingContext2D | null | false = null;
function measureWith(font: string, text: string) {
  if (!text) return 0;
  if (measureCtx === null) {
    try { measureCtx = document.createElement("canvas").getContext("2d") || false; } catch { measureCtx = false; }
  }
  if (!measureCtx) return Array.from(text).length * 0.6 * (parseFloat(font.split(" ")[1]) || 24);
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}
const creditFont = (px: number) => "600 " + px + "px " + CREDITS_STACK;
const titleFont = (px: number) => "800 " + px + "px " + TITLE_STACK;
function measureCredit(text: string, px: number) { return measureWith(creditFont(px), text); }

// Credit rows in the editor carry a stable id for React keys.
type EditRow = { id: string; role: string; name: string };
// Which preset roles hold a value filled from Project info, by kind. An unedited value follows the Project.
const AUTO_ROLES: Record<string, string[]> = {
  place: ["Filmed in", "Places"], dates: ["Filmed on"], moments: ["Moments", "Memories"], music: ["Music", "Music by"],
};
function autoValues(info: any) {
  return { place: tecSuggestPlace(info.projectName), dates: tecDateRange(info.dates), moments: tecMomentsText(info.clips, info.photos), music: tecMusicCredit(info) } as Record<string, string>;
}

const WAVE_HEIGHT = 56;

// Music section slider: waveform on a canvas with a draggable window over the chosen section, snapped to the
// feasible phrase starts (tecSection). While `audio` plays, a playhead follows its currentTime inside the window.
function SectionSlider({ peaks, total, section, videoSeconds, stepSeconds, snap, onChange, disabled, audio }: {
  peaks: number[]; total: number; section: number | null; videoSeconds: number; stepSeconds: number;
  snap: (v: number) => number | null; onChange: (v: number | null) => void; disabled: boolean; audio: HTMLAudioElement | null;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const dragRef = React.useRef<{ offset: number } | null>(null);
  const [width, setWidth] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const peakMax = Math.max(1e-6, ...peaks);
  const drawRef = React.useRef<(playAt: number | null) => void>(() => {});
  drawRef.current = (playAt: number | null) => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap || width <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(width * dpr), chh = Math.round(WAVE_HEIGHT * dpr);
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== chh) canvas.height = chh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, WAVE_HEIGHT);
    const accent = themeColor(wrap, ctx, "--panel-accent", "#f6c343");
    const muted = themeColor(wrap, ctx, "--panel-muted-fg", "#8a8a8a");
    const mid = WAVE_HEIGHT / 2;
    const x0 = section == null ? -1 : (section / total) * width;
    const x1 = section == null ? -1 : Math.min(width, ((section + videoSeconds) / total) * width);
    const inside = (x: number) => x >= x0 && x <= x1;
    if (section != null) {
      ctx.globalAlpha = 0.18; ctx.fillStyle = accent;
      ctx.fillRect(x0, 0, Math.max(2, x1 - x0), WAVE_HEIGHT);
      ctx.globalAlpha = 1;
    }
    // Mirrored bars, one per ~2.5 CSS px; each bar is the loudest peak it covers (flat until the peaks are read).
    const pitch = 2.5, count = Math.max(1, Math.floor(width / pitch)), barW = Math.max(1, pitch * 0.6);
    for (let i = 0; i < count; i++) {
      const x = i * pitch + (pitch - barW) / 2;
      let p = 0;
      if (peaks.length) {
        const a = Math.floor((i / count) * peaks.length), b = Math.max(a + 1, Math.floor(((i + 1) / count) * peaks.length));
        for (let j = a; j < b && j < peaks.length; j++) p = Math.max(p, peaks[j] || 0);
      }
      const h = Math.max(1, (p / peakMax) * (mid - 3));
      const on = inside(x + barW / 2);
      ctx.globalAlpha = on ? 1 : 0.4; ctx.fillStyle = on ? accent : muted;
      ctx.fillRect(x, mid - h, barW, h * 2);
    }
    ctx.globalAlpha = 1;
    if (section != null) {
      const w = Math.max(2, x1 - x0);
      ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 + 0.75, 0.75, Math.max(0.5, w - 1.5), WAVE_HEIGHT - 1.5);
      ctx.fillStyle = accent;
      const gh = Math.min(18, WAVE_HEIGHT * 0.4), gw = 4;
      for (const gx of [x0 + 1, x0 + w - 1 - gw]) {
        ctx.beginPath();
        if ((ctx as any).roundRect) (ctx as any).roundRect(gx, mid - gh / 2, gw, gh, 2); else ctx.rect(gx, mid - gh / 2, gw, gh);
        ctx.fill();
      }
      if (playAt != null) {
        const px = Math.min(x0 + w - 1, Math.max(x0 + 1, ((section + Math.min(playAt, videoSeconds)) / total) * width));
        ctx.fillStyle = themeColor(wrap, ctx, "--panel-fg", "#ffffff");
        ctx.fillRect(px - 1, 0, 2, WAVE_HEIGHT);
      }
    }
  };
  React.useEffect(() => { if (!audio) drawRef.current(null); }, [width, peaks, peakMax, section, videoSeconds, total, audio]);
  React.useEffect(() => {
    if (!audio) return;
    let frame = 0;
    const step = () => { drawRef.current(audio.currentTime); frame = requestAnimationFrame(step); };
    frame = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frame); drawRef.current(null); };
  }, [audio]);

  const timeAt = (clientX: number) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return (Math.min(Math.max(0, clientX - r.left), r.width) / Math.max(1, r.width)) * total;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    const t = timeAt(e.clientX);
    const s = section ?? 0;
    const offset = section != null && t >= s && t <= s + videoSeconds ? t - s : videoSeconds / 2;
    dragRef.current = { offset };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
    setDragging(true);
    onChange(snap(t - offset));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    onChange(snap(timeAt(e.clientX) - dragRef.current.offset));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    if (e.type === "pointerup") onChange(snap(timeAt(e.clientX) - dragRef.current.offset));
    dragRef.current = null; setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };
  const first = snap(0), last = snap(total);
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || section == null) return;
    let next: number | null | undefined;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = snap(section - stepSeconds);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = snap(section + stepSeconds);
    else if (e.key === "Home") next = first;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    onChange(next);
  };

  return (
    <div>
      <small style={{ display: "block", marginBottom: 4 }}>{"Music section — drag to choose"}</small>
      <div ref={wrapRef} role="slider" tabIndex={disabled ? -1 : 0} aria-label="Music section"
        aria-valuemin={Number((first ?? 0).toFixed(1))} aria-valuemax={Number((last ?? 0).toFixed(1))} aria-valuenow={Number((section ?? 0).toFixed(1))}
        aria-valuetext={section == null ? "This track is too short for this length" : "Starts at " + section.toFixed(1) + " s"} aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ position: "relative", width: "100%", minWidth: 0, height: WAVE_HEIGHT, touchAction: "none", userSelect: "none", outline: "none",
          cursor: disabled ? "default" : dragging ? "grabbing" : "grab", borderRadius: "var(--panel-radius, 6px)",
          boxShadow: focused ? "0 0 0 2px var(--panel-accent, #f6c343)" : "inset 0 0 0 1px var(--panel-border, rgba(128, 128, 128, 0.35))", opacity: disabled ? 0.6 : 1 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: WAVE_HEIGHT, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
        <span>0:00</span><span>{fmtTime(total)}</span>
      </div>
    </div>
  );
}

// Videos without analysis, from inventory.js's skipped counts: being analysed now, not analysed yet (never started; the
// panel does not start analysis), or failed. known is false when the workflow read failed: pending clips then may or
// may not be queued, so their wording is neutral and the panel keeps polling.
function tecAnalysisCounts(skipped: any) {
  const s = skipped || {}, total = s.unanalysed || 0;
  if (s.analysing == null) return { total, analysing: 0, notAnalysed: total, failed: 0, known: false };
  return { total, analysing: s.analysing || 0, notAnalysed: s.notAnalysed || 0, failed: s.failed || 0, known: s.statusKnown !== false };
}
const tecClips = (n: number, verb?: string) => n + (n === 1 ? " clip" : " clips") + (verb === "is" ? (n === 1 ? " is" : " are") : "");
// The sentences for the readiness line ("" when every video is analysed).
function tecAnalysisText(c: any) {
  const it = (n: number) => (n === 1 ? "it" : "them");
  return [
    c.analysing ? tecClips(c.analysing, "is") + " being analysed. This updates automatically when " + (c.analysing === 1 ? "it finishes." : "they finish.") : "",
    c.notAnalysed ? tecClips(c.notAnalysed, "is") + " not analysed yet. " + (c.known ? "Analyse " + it(c.notAnalysed) + " in Selects to use " + it(c.notAnalysed) + " here."
      : "If Selects is analysing " + it(c.notAnalysed) + ", this updates automatically.") : "",
    c.failed ? tecClips(c.failed) + " could not be analysed." : "",
  ].filter(Boolean).join(" ");
}
// The short form for the end of the Ready line.
function tecAnalysisNote(c: any) {
  return (c.analysing ? " · " + tecClips(c.analysing) + " being analysed" : "") + (c.notAnalysed ? " · " + tecClips(c.notAnalysed) + " not analysed yet" : "")
    + (c.failed ? " · " + tecClips(c.failed) + " could not be analysed" : "");
}

// Layout thumbnails: a tiny schematic of each layout (window + left column, or full frame + right column).
function LayoutIcon({ kind }: { kind: "classic" | "full" }) {
  return (
    <svg viewBox="0 0 32 18" width={48} height={27} aria-hidden="true" style={{ display: "block", flex: "none", width: "100%", maxWidth: 48, height: "auto" }}>
      <rect x={0.5} y={0.5} width={31} height={17} rx={1.5} fill={kind === "full" ? "currentColor" : "none"} fillOpacity={kind === "full" ? 0.25 : 1} stroke="currentColor" strokeOpacity={0.6} />
      {kind === "classic" ? <rect x={16.2} y={2.3} width={13.6} height={7.7} fill="currentColor" fillOpacity={0.55} /> : <rect x={20} y={0.5} width={11.5} height={17} fill="currentColor" fillOpacity={0.35} />}
      {(kind === "classic" ? [4.5, 8, 11, 14] : [4.5, 8, 11, 14]).map((y, i) => (
        <rect key={i} x={kind === "classic" ? (i === 0 ? 3 : 4) : (i === 0 ? 21.5 : 22.5)} y={y} width={i === 0 ? 8 : 6} height={i === 0 ? 2 : 1} fill="currentColor" />
      ))}
    </svg>
  );
}

const PREVIEW_HEIGHT = 124;

// The Preview: a canvas mock of the chosen layout at one moment. Classic: black frame, typed title, credit rows and
// the shot window; Full frame: a footage stand-in, the scrim, the right-side gradient and the right-third column.
// Rows come from the planner's credit layout and scroll at the computed roll speed, as the graphic will.
function CreditsPreview({ layout, title, model, pxPerSec, endSec, time, fontsReady }: {
  layout: "classic" | "full"; title: string; model: any; pxPerSec: number; endSec: number; time: number; fontsReady: boolean;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const layerRef = React.useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || !model) return;
    const dpr = window.devicePixelRatio || 1;
    const H = PREVIEW_HEIGHT;
    if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr);
    if (canvas.height !== Math.round(H * dpr)) canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, H);
    // The 16:9 frame, fitted inside the fixed-height box.
    const fw = Math.min(width, (H * 16) / 9), fh = (fw * 9) / 16, ox = (width - fw) / 2, oy = (H - fh) / 2;
    const s = fh / 1080, W = 1920, L = TEC_LEAD_IN, t = time;
    const end = endSec;
    const fadeOut = clamp01((end - t) / FADES.outSec);
    ctx.save();
    ctx.translate(ox, oy); ctx.scale(s, s);
    ctx.beginPath(); ctx.rect(0, 0, W, 1080); ctx.clip();
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, 1080);
    const footage = (x: number, y: number, w: number, h: number, alpha: number) => {
      if (!(alpha > 0)) return;
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "#35607a"); g.addColorStop(0.55, "#c98a52"); g.addColorStop(1, "#2a2320");
      ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      // A horizon line, so the stand-in reads as a landscape shot.
      ctx.fillStyle = "rgba(20, 16, 14, 0.55)"; ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
      ctx.globalAlpha = 1;
    };
    const full = layout === "full";
    const g = full ? clamp01((t - (L - 0.5)) / 1.0) : 0;
    if (full) {
      footage(0, 0, W, 1080, fadeOut);
      ctx.fillStyle = "rgba(0,0,0," + (0.25 * (1 - g)) + ")"; ctx.fillRect(0, 0, W, 1080);
      if (g > 0) {
        const gr = ctx.createLinearGradient(0.45 * W, 0, W, 0);
        gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0," + 0.7 * g + ")");
        ctx.fillStyle = gr; ctx.fillRect(0.45 * W, 0, 0.55 * W, 1080);
      }
    } else {
      const win = WINDOWS.classic, wx = (win.x / 100) * W, wy = (win.y / 100) * 1080, ww = (win.w / 100) * W, wh = (ww * 9) / 16;
      ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 3; ctx.strokeRect(wx, wy, ww, wh);
      footage(wx, wy, ww, wh, Math.min(clamp01((t - L) / FADES.inSec), fadeOut));
    }
    ctx.restore();

    // Text layer: title and credits, then the column mask (0.35 at the frame edges, 1 inside 14 %-86 %).
    const layer = layerRef.current || (layerRef.current = document.createElement("canvas"));
    const lw = Math.round(fw * dpr), lh = Math.round(fh * dpr);
    if (layer.width !== lw) layer.width = lw;
    if (layer.height !== lh) layer.height = lh;
    const lc = layer.getContext("2d");
    if (!lc) return;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = "source-over";
    lc.clearRect(0, 0, lw, lh);
    lc.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    const scroll = Math.max(0, t - L) * pxPerSec;
    // Title: typed one glyph per slot, fitted to its final string, drawn at scaleX 0.78.
    const typing = tecTyping(title);
    const typed = typing.glyphs.slice(0, tecTypedCount(typing, t)).join("");
    if (title) {
      const colTarget = (0.16 * 1080) / 0.71, bigTarget = (0.2 * 1080) / 0.71;
      const perPx = (measureWith(titleFont(colTarget), title) * 0.78) / colTarget;
      const fit = (target: number, box: number) => (perPx * target > box ? box / perPx : target);
      const colSize = fit(colTarget, 0.34 * W);
      const endPose = { cx: model.centerX, cy: (model.title.top + model.title.bottom) / 2, size: colSize };
      let pose = endPose;
      if (full) {
        const big = fit(bigTarget, 0.6 * W);
        const p = easeInOut((t - (L - 0.8)) / 0.8);
        const start = { cx: 0.08 * W + (perPx * big) / 2, cy: 540, size: big };
        pose = { cx: start.cx + (endPose.cx - start.cx) * p, cy: start.cy + (endPose.cy - start.cy) * p, size: start.size + (endPose.size - start.size) * p };
      }
      const baseline = pose.cy + (0.71 * pose.size) / 2 - scroll;
      if (typed && baseline > -pose.size && baseline - pose.size < 1080 + pose.size) {
        lc.save();
        lc.translate(pose.cx, baseline); lc.scale(0.78, 1);
        lc.font = titleFont(pose.size);
        lc.textAlign = "left"; lc.textBaseline = "alphabetic";
        if (full) { lc.shadowColor = "rgba(0,0,0,0.55)"; lc.shadowBlur = 0.03 * 1080; lc.shadowOffsetY = 0.012 * 1080; }
        lc.fillStyle = TITLE_COLOR;
        lc.fillText(typed, -measureWith(titleFont(pose.size), title) / 2, 0);
        lc.restore();
      }
    }
    const opacity = full ? g : clamp01((t - 4.0) / 2.0);
    if (opacity > 0) {
      lc.globalAlpha = opacity;
      lc.fillStyle = CREDIT_COLOR; lc.textAlign = "center"; lc.textBaseline = "alphabetic";
      for (const r of model.rows) {
        for (const part of [r.role, r.name]) {
          part.lines.forEach((text: string, k: number) => {
            const top = part.top + k * part.lineHeight - scroll;
            if (top > 1080 || top + part.lineHeight < 0) return;
            lc.font = creditFont(part.fontPx);
            lc.fillText(text, model.centerX, top + 1.05 * part.fontPx);
          });
        }
      }
      lc.globalAlpha = 1;
    }
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = "destination-in";
    const mask = lc.createLinearGradient(0, 0, 0, lh);
    mask.addColorStop(0, "rgba(0,0,0,0.35)"); mask.addColorStop(0.14, "rgba(0,0,0,1)"); mask.addColorStop(0.86, "rgba(0,0,0,1)"); mask.addColorStop(1, "rgba(0,0,0,0.35)");
    lc.fillStyle = mask; lc.fillRect(0, 0, lw, lh);
    lc.globalCompositeOperation = "source-over";
    ctx.drawImage(layer, ox, oy, fw, fh);
  }, [width, layout, title, model, pxPerSec, endSec, time, fontsReady]);
  return (
    <div ref={wrapRef} aria-label="Credits preview" style={{ width: "100%", minWidth: 0, height: PREVIEW_HEIGHT }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: PREVIEW_HEIGHT }} />
    </div>
  );
}

// Keys inside the credits editor and the layout buttons must never reach the app's shortcuts (Space plays, Delete
// removes clips). Text inputs only stop propagation, so typing works; on buttons Space still presses the button.
function guardKeys(e: React.KeyboardEvent) {
  const t = e.target as HTMLElement;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) { e.stopPropagation(); return; }
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); e.stopPropagation(); return; }
  if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); e.stopPropagation(); if (t && t.tagName === "BUTTON") t.click(); }
}

export default function Panel({ sdk, context, ui }: any) {
  const projectId = context?.projectId ?? null;
  const projectRef = React.useRef(projectId);
  projectRef.current = projectId;
  const [roots, setRoots] = React.useState<{ plugin: string; data: string } | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [inventory, setInventory] = React.useState<any>(null);
  const [candidates, setCandidates] = React.useState<any>(null);
  const [layout, setLayout] = React.useState<"classic" | "full">("classic");
  const [title, setTitle] = React.useState(DEFAULT_TITLE);
  const [preset, setPreset] = React.useState(TEC_DEFAULT_PRESET);
  // null while the rows follow the preset; the user's rows once anything is edited.
  const [customRows, setCustomRows] = React.useState<EditRow[] | null>(null);
  const rowIdRef = React.useRef(0);
  const [length, setLength] = React.useState<"short" | "standard" | "long">(TEC_DEFAULT_LENGTH as any);
  // "" until the manifest loads; then the manifest's default cue (its `default: true` flag is the only switch).
  const [cueId, setCueId] = React.useState("");
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  // The chosen section start (seconds into the music); null = the default (reveal on the swell / loudest part).
  const [section, setSection] = React.useState<number | null>(null);
  const [cuePeaks, setCuePeaks] = React.useState<Record<string, number[]>>({});
  const [clipSound, setClipSound] = React.useState<"off" | "ambient" | "full">("ambient");
  const [lookOn, setLookOn] = React.useState(true);
  const [usePhotos, setUsePhotos] = React.useState(true);
  const [only, setOnly] = React.useState<string[] | null>(null);
  const [onlyPhotos, setOnlyPhotos] = React.useState<string[] | null>(null);
  const [previewTime, setPreviewTime] = React.useState(6);
  const [fontsReady, setFontsReady] = React.useState(false);
  const fontsFailedRef = React.useRef(false);
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  // Single-flight guard: state updates are async, so a ref blocks a second click in the same tick.
  const busyRef = React.useRef(false);
  const [step, setStep] = React.useState("");
  const [tools, setTools] = React.useState({ ffmpeg: true, node: true });
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
  // Progress never goes backwards within a run.
  const advance = (id: string, fraction: number, detail?: string) => {
    const p = tecProgress(id, fraction, detail);
    if (progressRef.current && p.value < progressRef.current.value - 1e-9) return;
    progressRef.current = p; setProgress(p);
  };
  const [status, setStatus] = React.useState<{ tone: string; text: string } | null>(null);
  const [result, setResult] = React.useState<any>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const previewTokenRef = React.useRef(0);
  const previewUrlRef = React.useRef<string | null>(null);
  const [playState, setPlayState] = React.useState<"idle" | "loading" | "playing">("idle");
  const [playingAudio, setPlayingAudio] = React.useState<HTMLAudioElement | null>(null);

  const run = async (summary: string, script: string, allowCommit = false) => {
    let r = await sdk.runScript({ summary, script, allowCommit });
    // Only a lost session is resent, and never a committing call: its commit may already have landed.
    if (r.isError && !allowCommit && /No valid session ID/.test(r.output || "")) { await new Promise((d) => setTimeout(d, 1500)); r = await sdk.runScript({ summary, script, allowCommit }); }
    if (r.isError || r.result == null) throw new Error(r.output || "Selects could not complete this step.");
    return r.result as any;
  };
  const stopAt = (e: any) => {
    const at = progressRef.current;
    const where = at ? "Stopped at step " + (at.current + 1) + "/" + TEC_BUILD_STEPS.length + " (" + TEC_BUILD_STEPS[at.current].label + "): " : "";
    return where + String(e?.message || e);
  };
  const endRun = (pid: string) => {
    if (projectRef.current !== pid) return;
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
  };

  const inventoryJsRef = React.useRef<string | null>(null);
  const invSigRef = React.useRef<string | null>(null);
  // Photo sizes measured by earlier inventory reads, passed back so a refresh does not measure them again.
  const photoSizesRef = React.useRef<Record<string, { width: number; height: number }>>({});
  // In-shot motion per clip (tecParseMotion curves), measured once per Project + clip; null = could not be measured.
  const motionRef = React.useRef<Record<string, any>>({});
  const invLoadingRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);
  const [invError, setInvError] = React.useState<string | null>(null);
  const [invLoading, setInvLoading] = React.useState(false);

  // Keeps a fresh inventory: remembers photo sizes and drops the scene-search cache when the clip set changed.
  function applyInventory(inv: any) {
    inv.photos = inv.photos || [];
    for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) photoSizesRef.current[ph.rid] = { width: ph.width, height: ph.height };
    const sk = inv.skipped || {};
    const sig = inv.resources.map((r: any) => r.rid).sort().join(",") + "|" + [sk.unanalysed, sk.analysing, sk.notAnalysed, sk.failed, sk.statusKnown].map((x) => String(x ?? "")).join(",");
    if (invSigRef.current !== sig) { if (invSigRef.current !== null) setCandidates(null); invSigRef.current = sig; }
    setInventory(inv); setInvError(null);
    return inv;
  }
  // Reads the Project's footage inventory. Never writes state for a stale Project, and never runs during a build.
  async function loadInventory(pid: string | null = projectRef.current, alive: () => boolean = () => true) {
    const script = inventoryJsRef.current;
    if (!pid || !script || busyRef.current || invLoadingRef.current === pid) return;
    const live = () => mountedRef.current && alive() && projectRef.current === pid;
    invLoadingRef.current = pid; setInvLoading(true);
    try {
      const inv = await run("Read footage", fill(script, { projectId: pid, only: null, known: photoSizesRef.current }));
      // A build that started meanwhile keeps the clip set it began with; the next refresh picks this up.
      if (!live() || busyRef.current) return;
      applyInventory(inv);
    } catch (e: any) {
      if (live()) setInvError(String(e?.message || e));
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Mount and Project switch: reset per-Project state, resolve folders, read bundled assets, inventory the Project.
  React.useEffect(() => {
    setCandidates(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false);
    setOnly(null); setOnlyPhotos(null); setCustomRows(null);
    invSigRef.current = null; photoSizesRef.current = {};
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
    if (!projectId) return;
    let alive = true;
    (async () => {
      try {
        const where = await sdk.runShell({ summary: "Locate plugin folders", command: "mkdir -p " + dq(DATA_DIR) + " && printf '%s\\n%s' " + dq(SKILLS_DIR) + " " + dq(DATA_DIR), timeoutMs: 10000 });
        const [plugin, data] = String(where?.stdout || "").split("\n").map((x) => x.trim());
        if (!plugin || !data) throw new Error("the plugin folders could not be found");
        if (!alive || projectRef.current !== projectId) return;
        setRoots({ plugin, data });
        // ffmpeg and node are only needed for music previews and own music; bundled cues build without them.
        let have = "";
        try {
          const probe = await sdk.runShell({ summary: "Check music tools", command: TOOL_PATH + "command -v ffmpeg >/dev/null && echo ffmpeg; command -v node >/dev/null && echo node", timeoutMs: 10000 });
          have = String(probe?.stdout || "");
        } catch { have = ""; }
        if (!alive || projectRef.current !== projectId) return;
        setTools({ ffmpeg: have.includes("ffmpeg"), node: have.includes("node") });
        const read = (rel: string) => readText(plugin, rel);
        const [manifest, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, graphicTsx, frameTsx, lookTsx, titleB64, creditsB64] = await Promise.all([
          read("assets/cues/manifest.json"), read("scripts/inventory.js"), read("scripts/search.js"), read("scripts/ensure-audio.js"),
          read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/credits-graphic.tsx"), read("assets/shot-frame.tsx"),
          read("assets/cinematic-look.tsx"), read("assets/fonts/tec-title-serif.woff2.b64"), read("assets/fonts/tec-credits-sans.woff2.b64")]);
        if (!alive || projectRef.current !== projectId) return;
        const parsed = JSON.parse(manifest);
        const fontsB64: Record<string, string> = { "tec-title-serif.woff2.b64": titleB64.replace(/\s+/g, ""), "tec-credits-sans.woff2.b64": creditsB64.replace(/\s+/g, "") };
        setAssets({ manifest: parsed, scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs }, graphicTsx, frameTsx, lookTsx, fontsB64 });
        const def = (parsed.cues || []).find((c: any) => c.default) || (parsed.cues || [])[0];
        if (def) setCueId((cur) => (cur === "" ? def.id : cur));
        inventoryJsRef.current = inventoryJs;
        setStep("Checking clips");
        await loadInventory(projectId, () => alive);
      } catch (e: any) {
        if (alive) setStatus({ tone: "error", text: "THE END Credits could not start: " + (e?.message || e) + ". Reinstall the plugin if this persists." });
      } finally { if (alive) setStep(""); }
    })();
    // Project switch or unmount stops a preview, including one still being prepared.
    return () => { alive = false; stopPreview(); };
  }, [projectId]);

  // Clips being analysed (or no clips at all yet): re-read the inventory every 10 s until they are ready. Clips whose
  // analysis was never started (or failed) do not poll on their own: nothing changes until the user analyses them in
  // Selects, and coming back to the panel or Refresh picks that up. With an unknown status, unanalysed clips poll.
  // A Project with only photos has nothing to wait for, so it does not poll (each read measures new photos).
  const invAnalysis = tecAnalysisCounts(inventory?.skipped);
  const needsPoll = !!inventory && (invAnalysis.analysing > 0 || (!invAnalysis.known && invAnalysis.total > 0) || (inventory.resources.length === 0 && !inventory.photos?.length && invAnalysis.total === 0));
  React.useEffect(() => {
    if (!projectId || !needsPoll || busy) return;
    const pid = projectId;
    const t = setInterval(() => { loadInventory(pid); }, 10000);
    return () => clearInterval(t);
  }, [projectId, needsPoll, busy]);
  // Coming back to the panel (tab shown or window focused) re-reads the inventory.
  React.useEffect(() => {
    if (!projectId) return;
    const pid = projectId;
    const onVisible = () => { if (document.visibilityState === "visible") loadInventory(pid); };
    const onFocus = () => { loadInventory(pid); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => { document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onFocus); };
  }, [projectId]);

  // The bundled fonts for the preview and its measurements. A font that fails only makes the preview fall back.
  React.useEffect(() => {
    if (!assets || fontsReady) return;
    let alive = true;
    (async () => {
      try {
        if (typeof FontFace !== "undefined") {
          for (const f of TEC_FONTS) {
            const face = new FontFace(f.family, "url(data:font/woff2;base64," + assets.fontsB64[f.file] + ")", { style: f.style, weight: String(f.weight) });
            await face.load();
            (document as any).fonts.add(face);
          }
        }
        await (document as any).fonts?.ready;
      } catch { fontsFailedRef.current = true; }
      if (alive) setFontsReady(true);
    })();
    return () => { alive = false; };
  }, [assets]);

  // Waveform peaks of a bundled cue (the manifest has none): ffmpeg decodes 8-bit mono at 800 Hz into the data
  // folder, the panel reads it back as base64 and removes it. Without ffmpeg the slider draws flat bars.
  const cue = assets?.manifest.cues.find((c: any) => c.id === cueId) || null;
  React.useEffect(() => {
    if (!roots || !cue || !tools.ffmpeg || cuePeaks[cue.id]) return;
    let alive = true;
    const id = cue.id, base = roots.data + "/peaks-" + id;
    (async () => {
      try {
        const cmd = TOOL_PATH + "ffmpeg -nostdin -v error -y -i " + sq(roots.plugin + "/assets/cues/" + cue.file) + " -ac 1 -ar 800 -f u8 " + sq(base + ".u8")
          + " && base64 < " + sq(base + ".u8") + " > " + sq(base + ".b64") + "; s=$?; rm -f " + sq(base + ".u8") + "; exit $s";
        const r = await sdk.runShell({ summary: "Read the waveform of " + cue.title, command: cmd, timeoutMs: 30000 });
        // The text copy is removed whether or not it could be read back (or the panel moved on meanwhile).
        let b64 = "";
        try {
          if (!alive || r?.isError || (r?.exitCode != null && r.exitCode !== 0)) return;
          b64 = (await readText(roots.data, "peaks-" + id + ".b64")).replace(/\s+/g, "");
        } finally { void Promise.resolve(sdk.runShell({ summary: "Remove waveform file", command: TOOL_PATH + "rm -f " + sq(base + ".b64"), timeoutMs: 10000 })).catch(() => {}); }
        if (!alive) return;
        const bin = atob(b64), n = bin.length, out: number[] = [];
        const per = Math.max(1, Math.floor(n / 400));
        for (let b = 0; b < 400 && b * per < n; b++) {
          let m = 0;
          for (let i = b * per; i < Math.min(n, (b + 1) * per); i++) m = Math.max(m, Math.abs(bin.charCodeAt(i) - 128) / 128);
          out.push(Math.round(m * 1000) / 1000);
        }
        setCuePeaks((p) => ({ ...p, [id]: out }));
      } catch { /* flat bars */ }
    })();
    return () => { alive = false; };
  }, [roots, cue?.id, tools.ffmpeg]);

  // ---- Music: phrase, section bounds and the default reveal ----
  const musicOn = cueId !== "none" && (cueId !== "own" || !!ownMusic);
  const ownDuration = ownGrid && ownGrid.durationSeconds > 0 ? ownGrid.durationSeconds : null;
  const music = React.useMemo(() => {
    if (cueId === "none") return { kind: "none", P: TEC_FIXED_PHRASE, m: null, fixed: true, firstBeat: 0, usableEnd: null, swell: null, total: 1, peaks: [] as number[], ready: true };
    if (cueId === "own") {
      if (!ownMusic || !ownGrid || !ownDuration) return { kind: "own", P: TEC_FIXED_PHRASE, m: null, fixed: true, firstBeat: 0, usableEnd: null, swell: null, total: ownDuration || 1, peaks: ownGrid?.peaks || [], ready: false };
      // An accepted grid, or an approximate one (tight but sparse beat) in the detector's range, gives the phrase on the
      // detected tempo from the detected first beat; anything else the fixed 3.9 s phrase (tecOwnPhrase).
      const ph = tecOwnPhrase(ownGrid);
      const firstBeat = ph.firstBeat;
      return { kind: "own", P: ph.P, m: ph.m, fixed: ph.fixed, approximate: ph.approximate, firstBeat, usableEnd: ownDuration - TEC_MUSIC_END_MARGIN,
        swell: tecLoudest({ ...ownGrid, firstBeat, durationSeconds: ownDuration }, ph.P, ph.m, ph.fixed), total: ownDuration, peaks: ownGrid.peaks || [], ready: true };
    }
    if (!cue) return { kind: "cue", P: TEC_FIXED_PHRASE, m: null, fixed: true, firstBeat: 0, usableEnd: null, swell: null, total: 1, peaks: [] as number[], ready: false };
    const beats = cue.phraseBeats > 0 ? cue.phraseBeats : 4;
    return { kind: "cue", P: (beats * 60) / cue.bpm, m: beats, fixed: false, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd,
      swell: cue.swell ?? cue.swellFallback, total: cue.durationSeconds, peaks: cuePeaks[cue.id] || [], ready: true };
  }, [cueId, cue, ownMusic, ownGrid, ownDuration, cuePeaks]);
  const requested = TEC_LENGTHS[length];
  const videoSeconds = tecVideoSeconds(requested, music.P);
  const sectionOpts = { firstBeat: music.firstBeat, P: music.P, L: TEC_LEAD_IN, videoSeconds, usableEnd: music.usableEnd, swell: music.swell, fixed: music.fixed };
  const sectionInfo = musicOn && music.ready && music.usableEnd != null ? tecSection({ ...sectionOpts, value: section == null ? undefined : section }) : null;
  const snap = (value: number) => { const r = music.ready && music.usableEnd != null ? tecSection({ ...sectionOpts, value }) : null; return r ? r.start : null; };
  const start: number | null = sectionInfo ? sectionInfo.start : null;
  // The section is infeasible at this Length: offer the longest Length that fits, or say how long the track must be.
  const fit = musicOn && music.ready && music.usableEnd != null && !sectionInfo
    ? tecFitLength({ firstBeat: music.firstBeat, P: music.P, usableEnd: music.usableEnd, fixed: music.fixed, requested: length }) : null;
  const tooShort = !!fit;

  // A new track (or its analysis) goes back to the default section; a new length keeps the choice and re-snaps it.
  React.useEffect(() => { setSection(null); }, [cueId, ownMusic?.path, ownGrid]);
  // A new track, section or length makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [cueId, ownMusic?.path, section, length]);

  // ---- Credits: preset rows from Project info, the user's edits, the roll layout and speed ----
  const allRids: string[] = inventory ? inventory.resources.map((r: any) => r.rid) : [];
  const selectedRids = only ? allRids.filter((rid) => only.includes(rid)) : allRids;
  const photoList: any[] = inventory?.photos || [];
  const allPhotoRids: string[] = photoList.map((r: any) => r.rid);
  const selectedPhotoRids = onlyPhotos ? allPhotoRids.filter((rid) => onlyPhotos.includes(rid)) : allPhotoRids;
  const usedPhotoCount = usePhotos ? selectedPhotoRids.length : 0;
  const creditInfo = React.useMemo(() => ({
    projectName: context?.projectName || "",
    dates: inventory ? [...inventory.resources, ...(inventory.photos || [])].map((r: any) => r.recordedAt).filter(Boolean) : [],
    cueTitle: cueId !== "none" && cueId !== "own" && cue ? cue.title : "",
    ownMusicName: cueId === "own" && ownMusic ? ownMusic.name : "",
    clips: selectedRids.length,
    photos: usedPhotoCount,
  }), [context?.projectName, inventory, cueId, cue, ownMusic, selectedRids.length, usedPhotoCount]);
  const presetRows: EditRow[] = React.useMemo(() => tecPresetRows(preset, creditInfo).map((r: any, i: number) => ({ id: "p" + i, role: r.role, name: r.name })), [preset, creditInfo]);
  const rows: EditRow[] = customRows ?? presetRows;
  // Edited rows keep the user's text; a value still equal to what was filled in automatically follows the Project,
  // the music and the clip counts (an emptied value, e.g. the Music credit with No music, removes that row).
  const autoRef = React.useRef<Record<string, string> | null>(null);
  React.useEffect(() => {
    const next = autoValues(creditInfo), prev = autoRef.current;
    autoRef.current = next;
    if (!prev) return;
    setCustomRows((cur) => {
      if (!cur) return cur;
      let changed = false;
      const out: EditRow[] = [];
      for (const r of cur) {
        const kind = Object.keys(AUTO_ROLES).find((k) => AUTO_ROLES[k].includes(r.role) && prev[k] !== "" && r.name === prev[k] && next[k] !== prev[k]);
        if (!kind) { out.push(r); continue; }
        changed = true;
        if (next[kind] !== "") out.push({ ...r, name: next[kind] });
      }
      // A value that was empty (so its row was left out) and now exists comes back at its preset position, unless the
      // user already has a row with that role.
      const fresh = tecPresetRows(preset, creditInfo);
      for (const k of Object.keys(AUTO_ROLES)) {
        if (prev[k] !== "" || next[k] === "") continue;
        const at = fresh.findIndex((r: any) => AUTO_ROLES[k].includes(r.role));
        if (at < 0 || out.some((r) => r.role === fresh[at].role)) continue;
        out.splice(Math.min(at, out.length), 0, { id: "u" + (++rowIdRef.current), role: fresh[at].role, name: next[k] });
        changed = true;
      }
      return changed ? out : cur;
    });
  }, [creditInfo]);
  const editRows = (fn: (list: EditRow[]) => EditRow[]) => { if (!busyRef.current) setCustomRows(fn((customRows ?? presetRows).slice())); };
  const newRowId = () => "u" + (++rowIdRef.current);
  const cleanRows = tecCleanRows(rows);
  const cleanKey = JSON.stringify(cleanRows);
  const creditModel = React.useMemo(() => tecCreditLayout({ rows: cleanRows, layout, H: 1080, measure: (text: string, px: number) => measureCredit(text, px) }), [cleanKey, layout, fontsReady]);
  const roll = tecRollSpeed({ endSec: videoSeconds, L: TEC_LEAD_IN, H: 1080, lastLineBottom: creditModel.lastLineBottom, rowTops: creditModel.rowTops, rowBottoms: creditModel.rowBottoms });
  const placeholders = tecPlaceholderRows(cleanRows).length;
  const nonLatin = hasNonLatin(title + " " + cleanRows.map((r: any) => r.role + " " + r.name).join(" "));
  // Preview scrub points: the credits fully in, the last row entering the frame, and the end: the moment the last line
  // has cleared the top (0.3 s before the video ends), so the preview shows the empty top while the window fades.
  // Rounded up to 0.1 s so the text is gone; with too many rows (exitsLate) it honestly shows the text left over.
  const firstRowSec = layout === "full" ? TEC_LEAD_IN + 0.5 : 6.0;
  const lastRowSec = creditModel.lastRoleTop == null ? firstRowSec
    : Math.min(videoSeconds, Math.max(firstRowSec, TEC_LEAD_IN + (creditModel.lastRoleTop - 0.8 * 1080) / roll.pxPerSec));
  const endScrubSec = Math.min(Math.floor(videoSeconds * 10) / 10, Math.max(0, Math.ceil((videoSeconds - TEC_CREDIT_METRICS.exitLead) * 10 - 1e-6) / 10));
  React.useEffect(() => { setPreviewTime((t) => Math.min(t, Math.round(videoSeconds * 10) / 10)); }, [videoSeconds]);

  // ---- Own music: decode and find the beat ----
  async function detectOwnMusic(file: { path: string; name: string }) {
    if (busyRef.current || !roots) return;
    const pid = projectRef.current;
    busyRef.current = true;
    setOwnMusic(file); setOwnGrid(null); setBusy(true); setStep("Listening for the beat");
    try {
      // The decoded PCM is only needed by beat-detect.cjs, so it is removed afterwards, keeping the exit status.
      // The result goes to a file (a long track's onsets come close to the 48 KB shell output cap); stdout says ok.
      const pcm = roots.data + "/own-music.f32";
      const cmd = TOOL_PATH + "ffmpeg -nostdin -v error -y -t 360 -i " + sq(file.path) + " -ac 1 -ar 22050 -f f32le " + sq(pcm) + " && node " + sq(roots.plugin + "/beat-detect.cjs") + " " + sq(pcm) + " 22050 " + sq(roots.data + "/own-music.json")
        + "; s=$?; rm -f " + sq(pcm) + "; exit $s";
      const r = await sdk.runShell({ summary: "Find the beat of " + file.name, command: cmd, timeoutMs: 120000, maxOutputBytes: 48000 });
      const done = JSON.parse(String(r.stdout || "").trim().split("\n").pop() || "{}");
      if (r.isError || r.exitCode !== 0 || done.error || !done.ok) throw new Error(done.error || r.stderr || "beat detection failed");
      const g = JSON.parse(await readText(roots.data, "own-music.json"));
      if (projectRef.current !== pid) return;
      setOwnGrid(g);
      setStatus(null);
    } catch (e: any) {
      // Without a grid the shots use the fixed 3.9 s timing, but the track's real length still bounds the section.
      let duration: number | null = null;
      try {
        const pr = await sdk.runShell({ summary: "Read the length of " + file.name, command: TOOL_PATH + "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " + sq(file.path), timeoutMs: 20000 });
        const v = parseFloat(String(pr?.stdout || "").trim());
        if (!pr?.isError && v > 0) duration = Math.min(v, 360);
      } catch { duration = null; }
      if (projectRef.current !== pid) return;
      setOwnGrid({ accepted: false, durationSeconds: duration, peaks: [] });
      setStatus(duration ? null : { tone: "error", text: "Could not read this music file (" + (e?.message || e) + "). Choose another file or one of the tracks." });
    } finally { busyRef.current = false; setBusy(false); setStep(""); }
  }

  // Music preview of the whole video length: "idle" -> "loading" (ffmpeg cut) -> "playing". Every start or stop
  // bumps the token, so a late result from a cancelled preparation is dropped.
  function stopPreview() {
    previewTokenRef.current++;
    const a = audioRef.current;
    audioRef.current = null;
    if (a) { a.onended = null; a.pause(); }
    if (previewUrlRef.current) { try { URL.revokeObjectURL(previewUrlRef.current); } catch { /* data URL */ } previewUrlRef.current = null; }
    if (mountedRef.current) { setPlayState("idle"); setPlayingAudio(null); }
  }

  async function preview() {
    if (playState !== "idle") { stopPreview(); return; }
    if (!musicOn || !roots || start == null) return;
    stopPreview();
    const token = previewTokenRef.current;
    const live = () => previewTokenRef.current === token && mountedRef.current;
    setPlayState("loading");
    try {
      const file = cueId === "own" && ownMusic ? ownMusic.path : roots.plugin + "/assets/cues/" + cue.file;
      // The whole video length from the section start, with the build's 1.5 s fade-out, written to a file (stdout is
      // too small) and read back as base64. Earlier previews are removed first and the mp3 once encoded.
      const dur = videoSeconds, base = roots.data + "/preview-" + token;
      const cmd = TOOL_PATH + "rm -f " + sq(roots.data) + "/preview-*.mp3 " + sq(roots.data) + "/preview-*.b64; "
        + "ffmpeg -nostdin -v error -y -ss " + start.toFixed(3) + " -t " + dur.toFixed(2) + " -i " + sq(file)
        + " -ac 1 -ar 22050 -b:a 48k -af \"afade=t=out:st=" + Math.max(0, dur - MUSIC_FADE_OUT).toFixed(2) + ":d=" + MUSIC_FADE_OUT + "\" -f mp3 " + sq(base + ".mp3")
        + " && base64 < " + sq(base + ".mp3") + " > " + sq(base + ".b64") + " && rm -f " + sq(base + ".mp3");
      const r = await sdk.runShell({ summary: "Preview music section", command: cmd, timeoutMs: 60000 });
      if (!live()) return;
      if (r?.isError || (r?.exitCode != null && r.exitCode !== 0)) throw new Error(r?.stderr || "the preview could not be cut");
      const b64 = (await readText(roots.data, "preview-" + token + ".b64")).replace(/\s+/g, "");
      void Promise.resolve(sdk.runShell({ summary: "Remove preview file", command: TOOL_PATH + "rm -f " + sq(base + ".b64"), timeoutMs: 10000 })).catch(() => {});
      if (!live()) return;
      if (b64.length < 200) throw new Error("no audio came back");
      let url: string;
      if (typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        const bin = atob(b64), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
        previewUrlRef.current = url;
      } else url = "data:audio/mpeg;base64," + b64;
      const audio = new Audio(url);
      audio.onended = () => { if (audioRef.current === audio) stopPreview(); };
      audioRef.current = audio;
      await audio.play();
      if (!live() || audioRef.current !== audio) { audio.pause(); return; }
      setPlayState("playing"); setPlayingAudio(audio);
    } catch (e: any) {
      if (!live()) return;
      stopPreview();
      setStatus({ tone: "error", text: "Could not play a preview: " + (e?.message || e) + "." });
    }
  }

  // Scene search: four clips per call keeps each call under run_script's 30 s deadline; pageSize 4.
  async function findCandidates(rids: string[], pid: string, check: () => void) {
    const list: any[] = []; const failed: string[] = [];
    for (let i = 0; i < rids.length; i += 4) {
      advance("prepare", 0.1 + (0.6 * i) / Math.max(1, rids.length), i + "/" + rids.length + (rids.length === 1 ? " video checked" : " videos checked"));
      const r = await run("Search scenic shots", fill(assets.scripts.searchJs, { projectId: pid, rids: rids.slice(i, i + 4), queries: TEC_SEARCH_QUERIES, pageSize: 4 }));
      check();
      list.push(...r.candidates); failed.push(...r.failed);
    }
    return { list, failed };
  }

  // In-shot motion: ffmpeg once per analysed clip (4 fps, 64 px grey frame differences), written to the data folder
  // and read back, never through stdout. Cached per Project + clip. Without ffmpeg, or when a clip fails, that clip
  // simply has no curve and the allocation scores it as before.
  async function measureMotion(resources: any[], pid: string, check: () => void, from: number) {
    const out: Record<string, any> = {};
    const todo = resources.filter((r: any) => !((pid + "|" + r.rid) in motionRef.current));
    let wrote = false;
    try {
      for (let i = 0; i < todo.length; i++) {
        const r = todo[i], key = pid + "|" + r.rid;
        advance("prepare", from + ((1 - from) * i) / Math.max(1, todo.length), i + "/" + todo.length + (todo.length === 1 ? " video measured" : " videos measured"));
        if (!tools.ffmpeg || !r.path || !roots) { motionRef.current[key] = null; continue; }
        const file = "motion-" + String(r.rid).replace(/[^A-Za-z0-9-]/g, "_") + ".txt";
        let curve: any = null;
        try {
          const cmd = TOOL_PATH + "cd " + sq(roots.data) + " && rm -f " + sq(file) + " && ffmpeg -nostdin -v error -an -sn -dn -i " + sq(r.path)
            + " -vf " + sq(TEC_MOTION_FILTER + file) + " -f null -";
          wrote = true;
          const res = await sdk.runShell({ summary: "Measure motion in " + (r.name || "a clip"), command: cmd, timeoutMs: 120000, maxOutputBytes: 8000 });
          check();
          if (res && !res.isError && res.exitCode === 0) curve = tecParseMotion(await readText(roots.data, file));
        } catch (e: any) {
          if (e === STALE) throw e;
          curve = null;
        }
        motionRef.current[key] = curve;
      }
    } finally {
      if (wrote && roots) void Promise.resolve(sdk.runShell({ summary: "Remove motion files", command: TOOL_PATH + "rm -f " + sq(roots.data) + "/motion-*.txt", timeoutMs: 10000 })).catch(() => {});
    }
    for (const r of resources) { const c = motionRef.current[pid + "|" + r.rid]; if (c) out[r.rid] = c; }
    return out;
  }

  // The Motion Graphic's data and its Adjust fields, from the frozen build record.
  function graphicFor(record: any) {
    const K = record.rows.length;
    const scalars: Record<string, string> = {};
    const editableRows: any[] = [];
    record.rows.forEach((r: any, i: number) => {
      scalars["role" + (i + 1)] = r.role; scalars["name" + (i + 1)] = r.name;
      editableRows.push({ key: "role" + (i + 1), label: "Role " + (i + 1), type: "text", defaultValue: r.role }, { key: "name" + (i + 1), label: "Name " + (i + 1), type: "text", defaultValue: r.name });
    });
    const fonts = TEC_FONTS.map((f) => ({ family: f.family, b64: assets.fontsB64[f.file], weight: f.weight, style: f.style }));
    const parameters = { layout: record.layout, fps: record.fps, revealFrame: record.frames[1], endFrame: record.frames[record.frames.length - 1],
      title: record.titleText, titleColor: TITLE_COLOR, creditColor: CREDIT_COLOR, rows: record.rows, ...scalars, rowCount: K,
      speedPxPerSec: record.speedPxPerSec, speed: 1, showTitle: true, fonts };
    const editableParameters: any = [
      { key: "title", label: "Title", type: "text", defaultValue: record.titleText },
      { key: "titleColor", label: "Title color", type: "color", defaultValue: TITLE_COLOR },
      { key: "creditColor", label: "Credits color", type: "color", defaultValue: CREDIT_COLOR },
      { key: "speed", label: "Roll speed", type: "number", defaultValue: 1, min: 0.5, max: 2, step: 0.05 },
      { key: "showTitle", label: "Show title", type: "boolean", defaultValue: true },
      ...editableRows,
    ];
    return { tsx: assets.graphicTsx, parameters, editableParameters };
  }

  async function build(nextSeed: number) {
    if (busyRef.current || !assets || !inventory || !roots) return;
    if (cueId === "own" && !ownMusic) { setStatus({ tone: "error", text: "Drop a music file, or choose one of the tracks." }); return; }
    if (musicOn && (!music.ready || start == null)) { setStatus({ tone: "error", text: tooShort ? "This track is too short for this Length." : "The music is not ready yet." }); return; }
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    // Every input as it is at Build; "Finish title and look" retries with exactly these.
    const inputs = { layout, title, rows: tecCleanRows(rows), lookOn, clipSound, P: music.P, sectionStart: musicOn ? start : null,
      musicPath: !musicOn ? null : cueId === "own" ? ownMusic!.path : roots.plugin + "/assets/cues/" + cue.file, requested, usePhotos, onlyPhotos, only };
    busyRef.current = true;
    stopPreview();
    setBusy(true); setStatus(null); setResult(null); progressRef.current = null;
    advance("prepare", 0);
    try {
      // 1. Inventory (fresh), 2. scene search: Prepare.
      const raw = await run("Read footage", fill(assets.scripts.inventoryJs, { projectId: pid, only: null, known: photoSizesRef.current }));
      check();
      const inv = applyInventory(raw);
      advance("prepare", 0.1);
      const key = pid + "|" + JSON.stringify(inputs.only);
      const rids: string[] = inv.resources.filter((r: any) => !inputs.only || inputs.only.includes(r.rid)).map((r: any) => r.rid);
      const dur: Record<string, number> = Object.fromEntries(inv.resources.map((r: any) => [r.rid, r.duration]));
      const cached = candidates && candidates.key === key && candidates.sig === invSigRef.current ? candidates : null;
      let found = cached;
      if (!cached || cached.failed.length) {
        // Search everything the first time; afterwards retry only the clips whose search failed.
        const todo: string[] = cached ? cached.failed : rids;
        const fresh = await findCandidates(todo, pid, check);
        const retried = new Set(todo);
        found = { key, sig: invSigRef.current, failed: fresh.failed,
          list: [...(cached ? cached.list.filter((c: any) => !retried.has(c.rid)) : []), ...fresh.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }))] };
        setCandidates(found);
      }
      // In-shot motion of the searched clips (cached; silently skipped without ffmpeg).
      const motion = await measureMotion(inv.resources.filter((r: any) => rids.includes(r.rid)), pid, check, 0.7);
      advance("prepare", 1);
      // 3. Plan.
      advance("plan", 0);
      const photoCands = photoCandsOf(inv, inputs.onlyPhotos, inputs.usePhotos);
      const plan: any = tecPlanBuild({ layout: inputs.layout, N: inputs.requested, P: inputs.P, candidates: found.list.concat(photoCands), seed: String(nextSeed), motion });
      if (!plan.ok) {
        const retry = found.failed.length ? " Could not check " + found.failed.length + " clips; press Build to retry them." : "";
        throw new Error("Needs at least " + plan.needed + " usable clips or photos (found " + plan.usableShots + "). Add more varied footage"
          + (inputs.usePhotos ? " or photos" : "") + " or select more clips." + retry);
      }
      advance("plan", 1);
      // 4. Music: import the track in its own call (an import and a commit never share a run_script).
      advance("music", 0);
      const musicRes = inputs.musicPath ? await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, path: inputs.musicPath }), true) : null;
      check();
      advance("music", 1);
      // 5. Assemble: the new Draft, the shots on the phrase grid, clip sound and music. One commit.
      advance("assemble", 0);
      const sizeOf = (rid: string) => [...inv.resources, ...inv.photos].find((r: any) => r.rid === rid) || null;
      const pickedRids = [...new Set(plan.picks.map((k: any) => k.rid as string))] as string[];
      const sources: Record<string, { aspect: number | null }> = {};
      for (const rid of pickedRids) { const r: any = sizeOf(rid); sources[rid] = { aspect: r && r.aspect > 0 ? r.aspect : null }; }
      const name = "THE END Credits " + new Date().toISOString().slice(0, 16).replace("T", " ");
      const a = await run("Assemble THE END Credits", fill(assets.scripts.assembleJs, {
        projectId: pid, draftName: name, layout: inputs.layout, picks: plan.picks, boundaries: plan.timeline.boundaries, L: plan.timeline.L,
        music: musicRes ? { resourceId: musicRes.resourceId, sectionStart: inputs.sectionStart } : null,
        clipSound: inputs.clipSound, ambientDb: AMBIENT_DB, musicFadeOut: MUSIC_FADE_OUT, sources }), true);
      check();
      if (!a.sequenceId) throw new Error("The Draft \"" + name + "\" was saved, but Selects did not report its id, so the credits and look could not be added. Open it from the Drafts list, or build again.");
      advance("assemble", 1);
      // The build record, frozen: the roll speed at the Draft's real rate from the assembled frames.
      const frames: number[] = a.frames;
      const endSec = frames[frames.length - 1] / a.fps, revealSec = frames[1] / a.fps;
      const model = tecCreditLayout({ rows: inputs.rows, layout: inputs.layout, H: 1080, measure: (text: string, px: number) => measureCredit(text, px) });
      const speed = tecRollSpeed({ endSec, L: revealSec, H: 1080, lastLineBottom: model.lastLineBottom, rowTops: model.rowTops, rowBottoms: model.rowBottoms });
      const sizes: Record<string, { width: number; height: number }> = { ...photoSizesRef.current };
      for (const r of inv.resources) if (r.width > 0 && r.height > 0) sizes[r.rid] = { width: r.width, height: r.height };
      // Photos move; still (or unmeasured) video shots get a gentle push-in or drift; moving ones stay as shot.
      const moves = tecShotMotions(plan.picks, String(nextSeed), sizes, { pool: plan.motionPool });
      const photos: Record<string, any> = {}, byRid: Record<string, any> = {};
      const byShot = moves.map((mv: any) => (mv ? { motion: mv.motion, direction: mv.direction, axis: mv.axis, frameStrength: mv.frameStrength } : null));
      plan.picks.forEach((k: any, i: number) => {
        if (!k || k.kind !== "photo" || !moves[i]) return;
        const mv = moves[i];
        photos[k.rid] = { aspect: sources[k.rid]?.aspect ?? null, motion: mv.motion, direction: mv.direction, axis: mv.axis };
        byRid[k.rid] = { motion: mv.motion, direction: mv.direction, axis: mv.axis };
      });
      const record = { layout: inputs.layout, sequenceId: a.sequenceId, fps: a.fps, frames, titleText: inputs.title, rows: inputs.rows,
        speedPxPerSec: speed.pxPerSec, window: WINDOWS[inputs.layout], look: { on: inputs.lookOn, strength: LOOK_STRENGTH }, clipSound: inputs.clipSound,
        photos, sources, fades: FADES, musicFadeOut: MUSIC_FADE_OUT };
      const notes = [...(a.notes || [])];
      if (fontsFailedRef.current) notes.push("the bundled fonts did not load in the panel, so the roll speed was measured with a fallback face");
      const shortened = plan.shrunk ? { shots: plan.visibleShots, seconds: endSec, fullSeconds: tecVideoSeconds(inputs.requested, inputs.P) } : null;
      setResult({ sequenceId: a.sequenceId, decorated: false, record, photoMotion: { byRid, byShot }, seed: nextSeed, notes, link: null, shortened, unchecked: found.failed.length, roll: speed });
      await decorate(record, { byRid, byShot }, check);
    } catch (e: any) {
      if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", text: stopAt(e) });
    } finally { endRun(pid); }
  }

  // Another version: same clips and cached scene search, a new seed.
  function buildAnother() {
    if (busyRef.current) return;
    setResult(null); setStatus(null);
    const s = seed + 1;
    setSeed(s);
    build(s);
  }

  // Retries only decorate, with the frozen build record (it never replaces effects already on the Draft).
  async function finishTitle() {
    if (busyRef.current || !result || !assets || !roots) return;
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    busyRef.current = true; stopPreview(); setBusy(true); setStatus(null); progressRef.current = null;
    try { await decorate(result.record, result.photoMotion, check); }
    catch (e: any) { if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", text: stopAt(e) }); }
    finally { endRun(pid); }
  }

  // Commit 2: mute (Clip sound Off), the credits graphic, the Cinematic look and the Shot frame; then open the Draft.
  async function decorate(record: any, photoMotion: any, check: () => void) {
    advance("decorate", 0);
    try {
      await run("Add credits and look", fill(assets.scripts.decorateJs, { ...record, graphic: graphicFor(record), frame: { tsx: assets.frameTsx },
        look: { tsx: assets.lookTsx, strength: record.look.strength, on: record.look.on }, photoMotion }), true);
    } catch (e: any) {
      if (e === STALE) throw e;
      throw new Error("The Draft was created, but it could not be finished (credits, look and shot frames): " + (e?.message || e) + ". Press Finish title and look to try again.");
    }
    check();
    setResult((r: any) => ({ ...r, decorated: true }));
    advance("decorate", 0.9, "opening the Draft");
    try {
      const o = await run("Open the new Draft", "const id = " + JSON.stringify(record.sequenceId) + ";\n"
        + "let link = null, openError = null;\n"
        + "try { link = (await selects.editor.linkToDraftFrame(id, 0)).deepLinkUrl; } catch (e) { link = null; }\n"
        + "try { await selects.editor.openDraft(id); } catch (e) { openError = String((e && e.message) || e); }\n"
        + "return { link, openError };");
      check();
      setResult((r: any) => ({ ...r, link: o.link || null }));
      if (o.openError) throw new Error(o.openError);
      advance("decorate", 1);
    } catch (e: any) {
      if (e === STALE) throw e;
      setStatus({ tone: "error", text: "The Draft is ready, but it could not be opened: " + (e?.message || e) + ". Use the link below or open it from the Drafts list." });
    }
  }

  // Clip selection ("Choose clips"): `only` holds rids in inventory order, or null for every clip.
  const chooseClips = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allRids.filter((rid) => keep.has(rid));
    setOnly(ordered.length === allRids.length ? null : ordered);
    // A new selection needs a new scene search.
    setCandidates(null);
  };
  const toggleClip = (rid: string, on: boolean) => chooseClips(on ? [...selectedRids, rid] : selectedRids.filter((x) => x !== rid));
  // Photos are not searched, so choosing them keeps the cached scene search.
  const choosePhotos = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allPhotoRids.filter((rid) => keep.has(rid));
    setOnlyPhotos(ordered.length === allPhotoRids.length ? null : ordered);
  };
  const togglePhoto = (rid: string, on: boolean) => choosePhotos(on ? [...selectedPhotoRids, rid] : selectedPhotoRids.filter((x) => x !== rid));
  const extra = layout === "full" ? 1 : 0;
  const neededShots = TEC_MIN_SHOTS + extra;
  // Once a build has searched the current selection, the footage's capacity is known: plan it for the readiness line.
  const candKey = projectId + "|" + JSON.stringify(only);
  const fitsPlan: any = React.useMemo((): any => {
    if (!inventory) return null;
    const photoC = photoCandsOf(inventory, onlyPhotos, usePhotos);
    let list: any[] | null = null;
    if (candidates && candidates.key === candKey) list = candidates.list.concat(photoC);
    else if (!selectedRids.length) list = photoC;
    if (!list) return null;
    return tecPlanBuild({ layout, N: requested, P: music.P, candidates: list, seed: String(seed) });
  }, [candidates, candKey, inventory, onlyPhotos, usePhotos, layout, requested, music.P, seed, selectedRids.length]);
  const canBuild = !!inventory && (selectedRids.length > 0 || usedPhotoCount >= neededShots) && (!fitsPlan || fitsPlan.ok)
    && (!musicOn ? cueId !== "own" : music.ready && start != null);
  const analysisText = tecAnalysisText(invAnalysis);
  const clipCount = [
    allRids.length ? (only ? selectedRids.length + " of " + allRids.length + " clips selected" : allRids.length + " clips") : "",
    usePhotos && allPhotoRids.length ? (onlyPhotos ? selectedPhotoRids.length + " of " + allPhotoRids.length + " photos selected" : allPhotoRids.length + " photos") : "",
  ].filter(Boolean).join(" · ");
  const shotsFit = fitsPlan && fitsPlan.ok ? fitsPlan.N : requested;
  const readiness = !inventory ? (invError ? "Could not read the clips in this Project: " + invError : "Checking clips…")
    : inventory.resources.length === 0 && !allPhotoRids.length ? (analysisText
      || "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.")
    : inventory.resources.length === 0 && !usePhotos ? (analysisText ? analysisText + " " : "") + "Turn on Use photos in Advanced to build from this Project's photos."
    : selectedRids.length === 0 && usedPhotoCount === 0 ? "No clips selected. Choose clips in Advanced."
    : fitsPlan && !fitsPlan.ok ? "Needs at least " + fitsPlan.needed + " usable clips or photos (found " + fitsPlan.usableShots + "). Add more varied footage or photos."
      + (analysisText ? " " + analysisText : "")
    : "Ready: " + clipCount + " · " + (shotsFit + extra) + " shots" + (shotsFit < requested ? " (your footage fits " + (shotsFit + extra) + ")" : "")
      + " · about " + Math.round(tecVideoSeconds(shotsFit, music.P)) + " s" + tecAnalysisNote(invAnalysis);
  const canOwnMusic = tools.ffmpeg && tools.node;
  const silent = cueId === "none" && clipSound === "off";
  const hidden = roll.hiddenRows;
  // Too many rows: even at its fastest the roll can't take the last line off the top before the end.
  const dropRows = Math.max(1, roll.removeRows, hidden.length);
  const dropText = (length !== "long" ? "remove " + dropRows + (dropRows === 1 ? " row" : " rows") + " or choose Long."
    : "remove " + dropRows + (dropRows === 1 ? " row." : " rows."));
  const rollNotice = !cleanRows.length ? "No credit rows: the roll shows only the title."
    : hidden.length ? "Rows " + (hidden[0] + 1) + (hidden.length > 1 ? "–" + (hidden[hidden.length - 1] + 1) : "") + " won't appear in " + LENGTH_LABELS[length] + ": "
      + hidden.map((i: number) => cleanRows[i].role || cleanRows[i].name).join(", ") + ". To roll every row off before the end, " + dropText
    : roll.exitsLate ? "Too many rows to roll off before the end: " + dropText
    : roll.endsEarly ? "Credits finish before the end: the roll moves on into black."
    : null;

  if (!projectId) return <ui.Message tone="error">Open a Project to build THE END Credits.</ui.Message>;

  const lengthOptions = TEC_LENGTH_ORDER.map((k: string) => ({ label: LENGTH_LABELS[k], value: k }));
  const trackOptions = [...(assets?.manifest.cues || []).map((c: any) => ({ label: c.title, value: c.id })),
    ...(canOwnMusic || cueId === "own" ? [{ label: "Your own music", value: "own" }] : []), { label: "No music", value: "none" }];
  const inputStyle = { width: "100%", minWidth: 0, boxSizing: "border-box" } as any;
  const placeholderStyle = { ...inputStyle, boxShadow: "inset 0 0 0 1px var(--panel-accent, #f6c343)" };
  const isPlaceholder = (v: string) => /\[[^\]]*\]/.test(v);

  return (
    <ui.Stack gap={16}>
      <ui.Row gap={8} align="center">
        <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
        <ui.Button variant="ghost" busy={invLoading} busyLabel="Refreshing" disabled={busy || !assets} onClick={() => loadInventory()}>Refresh</ui.Button>
      </ui.Row>
      {inventory && invError ? <ui.Message tone="error">{"Could not refresh the clip list: " + invError}</ui.Message> : null}
      <ui.Section title="Layout">
        <div role="group" aria-label="Layout" onKeyDown={guardKeys} style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
          {([["classic", "Classic (window)"], ["full", "Full frame"]] as const).map(([value, label]) => {
            const on = layout === value;
            return (
              <button key={value} type="button" aria-pressed={on} disabled={busy} onClick={() => setLayout(value)}
                style={{ flex: "1 1 0", minWidth: 0, height: "auto", minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 4,
                  padding: "6px 4px", whiteSpace: "normal", lineHeight: 1.25, textAlign: "center", borderRadius: "var(--panel-radius, 6px)", cursor: busy ? "default" : "pointer", color: "inherit",
                  background: on ? "color-mix(in srgb, var(--panel-accent, #f6c343) 16%, transparent)" : "transparent",
                  border: on ? "2px solid var(--panel-accent, #f6c343)" : "1px solid var(--panel-border, rgba(128, 128, 128, 0.45))" }}>
                <LayoutIcon kind={value} />
                <span style={{ display: "block", maxWidth: "100%", fontSize: 12, whiteSpace: "normal", overflowWrap: "anywhere" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </ui.Section>
      <ui.Section title="Title">
        <ui.TextField label="Title" value={title} placeholder={DEFAULT_TITLE} onChange={setTitle} disabled={busy} />
      </ui.Section>
      <ui.Section title="Credits">
        <ui.Select label="Preset" value={preset} disabled={busy} onChange={(v: string) => { setPreset(v); setCustomRows(null); }}
          options={TEC_PRESET_ORDER.map((id: string) => ({ label: (TEC_PRESETS as any)[id].label, value: id }))} />
        <div role="group" aria-label="Credit rows" onKeyDown={guardKeys} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          {rows.map((r, i) => (
            <div key={r.id} role="group" aria-label={"Credit " + (i + 1)}
              style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, padding: 6, borderRadius: "var(--panel-radius, 6px)", border: "1px solid var(--panel-border, rgba(128, 128, 128, 0.35))" }}>
              <input type="text" aria-label={"Role " + (i + 1)} placeholder="Role (e.g. Director)" value={r.role} disabled={busy}
                style={isPlaceholder(r.role) ? placeholderStyle : inputStyle}
                onChange={(e) => { const v = e.currentTarget.value; editRows((l) => l.map((x) => (x.id === r.id ? { ...x, role: v } : x))); }} onKeyDown={(e) => e.stopPropagation()} />
              <input type="text" aria-label={"Name " + (i + 1)} placeholder="Name" value={r.name} disabled={busy}
                style={isPlaceholder(r.name) ? placeholderStyle : inputStyle}
                onChange={(e) => { const v = e.currentTarget.value; editRows((l) => l.map((x) => (x.id === r.id ? { ...x, name: v } : x))); }} onKeyDown={(e) => e.stopPropagation()} />
              <ui.Row gap={4}>
                <ui.Button variant="ghost" disabled={busy || i === 0} onClick={() => editRows((l) => { const k = l.findIndex((x) => x.id === r.id); if (k > 0) [l[k - 1], l[k]] = [l[k], l[k - 1]]; return l; })}>Up</ui.Button>
                <ui.Button variant="ghost" disabled={busy || i === rows.length - 1} onClick={() => editRows((l) => { const k = l.findIndex((x) => x.id === r.id); if (k >= 0 && k < l.length - 1) [l[k], l[k + 1]] = [l[k + 1], l[k]]; return l; })}>Down</ui.Button>
                <ui.Button variant="ghost" disabled={busy} onClick={() => editRows((l) => l.filter((x) => x.id !== r.id))}>Remove</ui.Button>
              </ui.Row>
            </div>
          ))}
          {!rows.length ? <small>No rows: the roll shows only the title.</small> : null}
          <small>{"Rows with both fields empty are left out. Replace text in [brackets] with your own."}</small>
          <ui.Row gap={4}>
            <ui.Button variant="ghost" disabled={busy} onClick={() => editRows((l) => [...l, { id: newRowId(), role: "", name: "" }])}>Add row</ui.Button>
            <ui.Button variant="ghost" disabled={busy || !customRows} onClick={() => { if (!busyRef.current) setCustomRows(null); }}>Reset to preset</ui.Button>
          </ui.Row>
        </div>
        {placeholders ? <ui.Message tone="muted">{placeholders + (placeholders === 1 ? " row still has a placeholder." : " rows still have placeholders.")}</ui.Message> : null}
        {nonLatin ? <ui.Message tone="muted">Some characters use a system font.</ui.Message> : null}
      </ui.Section>
      <ui.Section title="Length">
        <ui.Segmented label="Length" value={length} onChange={setLength} options={lengthOptions} disabled={busy} />
      </ui.Section>
      <ui.Section title="Music">
        <ui.Select label="Track" value={cueId} disabled={busy} onChange={(v: string) => { setCueId(v); if (v !== "own") { setOwnMusic(null); setOwnGrid(null); } }} options={trackOptions} />
        {cueId === "own" && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onReject={() => setStatus({ tone: "error", text: "Drop an audio file (mp3, wav, m4a…) that is on this computer." })}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {!canOwnMusic ? <ui.Message tone="muted">Install ffmpeg and Node.js 18+ to preview music or use your own track.</ui.Message> : null}
        {cueId === "own" && ownMusic && ownGrid && music.fixed ? <ui.Message tone="muted">No steady beat found: shots are 3.9 s.</ui.Message> : null}
        {cueId === "own" && ownMusic && ownGrid && !music.fixed && "approximate" in music && music.approximate ? <ui.Message tone="muted">{"Beat found (approximate): shots follow it at " + music.P.toFixed(2) + " s."}</ui.Message> : null}
        {musicOn && music.ready ? (
          // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
          <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
            <SectionSlider peaks={music.peaks} total={music.total} section={start} videoSeconds={videoSeconds} stepSeconds={music.fixed ? 0.1 : music.P}
              snap={snap} onChange={(v) => { if (v != null) setSection(v); }} disabled={busy || start == null} audio={playingAudio} />
            <ui.Row gap={8} align="center">
              {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
              <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                label={playState === "playing" ? "Stop preview" : playState === "loading" ? "Cancel preview" : "Preview the music of the whole video"}
                onClick={preview} disabled={busy || !tools.ffmpeg || (playState === "idle" && start == null)} />
              <span style={{ minWidth: 0 }}>{start == null ? "This track is too short for this length"
                : "Starts at " + start.toFixed(1) + " s" + (sectionInfo && Math.abs(sectionInfo.start - sectionInfo.defaultStart) < 1e-6 ? (music.kind === "own" ? " · reveal on the loudest part" : " · reveal on the swell") : "")}</span>
            </ui.Row>
          </div>
        ) : cueId === "own" && ownMusic && busy ? <ui.Message tone="muted">Reading the music…</ui.Message> : null}
        {fit && fit.key ? (
          <ui.Row gap={8} align="center">
            <ui.Message tone="muted">{"This track is too short for " + LENGTH_LABELS[length] + "."}</ui.Message>
            <ui.Button variant="secondary" disabled={busy} onClick={() => setLength(fit.key as any)}>{"Use " + LENGTH_LABELS[fit.key]}</ui.Button>
          </ui.Row>
        ) : fit ? <ui.Message tone="error">{"This track is too short (needs ≥ " + fit.needSeconds + " s)."}</ui.Message> : null}
        {silent ? <ui.Message tone="muted">Silent video: no music and Clip sound is Off.</ui.Message> : null}
      </ui.Section>
      <ui.Section title="Advanced">
        <ui.Segmented label="Clip sound" value={clipSound} onChange={setClipSound} disabled={busy}
          options={[{ label: "Ambient", value: "ambient" }, { label: "Full", value: "full" }, { label: "Off", value: "off" }]} />
        <ui.Toggle label="Cinematic look" value={lookOn} onChange={setLookOn} disabled={busy} />
        <ui.Toggle label="Use photos" value={usePhotos} onChange={setUsePhotos} disabled={busy} />
        {inventory && (allRids.length || allPhotoRids.length) ? (
          <div role="group" aria-label="Choose clips" style={{ minWidth: 0 }}>
            <ui.Row gap={4} align="center">
              <small style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {"Choose clips (" + (selectedRids.length + selectedPhotoRids.length) + "/" + (allRids.length + allPhotoRids.length) + ")"}
              </small>
              <ui.Button variant="ghost" disabled={busy || (!only && !onlyPhotos)} onClick={() => { chooseClips(allRids); choosePhotos(allPhotoRids); }}>All</ui.Button>
              <ui.Button variant="ghost" disabled={busy || selectedRids.length + selectedPhotoRids.length === 0} onClick={() => { chooseClips([]); choosePhotos([]); }}>None</ui.Button>
            </ui.Row>
            <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 4, borderRadius: "var(--panel-radius, 6px)", border: "1px solid var(--panel-border, rgba(128, 128, 128, 0.35))" }}>
              {inventory.resources.map((r: any) => {
                const on = selectedRids.includes(r.rid);
                const hint = shapeHint(r.width, r.height);
                const meta = fmtTime(r.duration) + (hint ? " · " + hint : "");
                return (
                  <label key={r.rid} title={r.name + " · " + meta}
                    style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, padding: "4px 6px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                    <input type="checkbox" checked={on} disabled={busy} onChange={(e) => toggleClip(r.rid, e.currentTarget.checked)} style={{ flexShrink: 0, margin: 0 }} />
                    <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    <span style={{ flexShrink: 0, fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{meta}</span>
                  </label>
                );
              })}
              {photoList.map((r: any) => {
                const on = usePhotos && selectedPhotoRids.includes(r.rid);
                const off = busy || !usePhotos;
                const hint = shapeHint(r.width, r.height);
                const meta = "Photo" + (hint ? " · " + hint : "");
                return (
                  <label key={r.rid} title={r.name + " · " + meta + (usePhotos ? "" : " · Use photos is off")}
                    style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, padding: "4px 6px", cursor: off ? "default" : "pointer", opacity: off ? 0.6 : 1 }}>
                    <input type="checkbox" checked={on} disabled={off} onChange={(e) => togglePhoto(r.rid, e.currentTarget.checked)} style={{ flexShrink: 0, margin: 0 }} />
                    <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    <span style={{ flexShrink: 0, fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{meta}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </ui.Section>
      <ui.Section title="Preview">
        <CreditsPreview layout={layout} title={title} model={creditModel} pxPerSec={roll.pxPerSec} endSec={videoSeconds} time={previewTime} fontsReady={fontsReady} />
        <ui.Slider label="Preview at" unit="s" min={0} max={Math.round(videoSeconds * 10) / 10} step={0.1} value={previewTime} onChange={setPreviewTime} />
        <ui.Row gap={4}>
          <ui.Button variant="ghost" onClick={() => setPreviewTime(Math.round(firstRowSec * 10) / 10)}>First row</ui.Button>
          <ui.Button variant="ghost" onClick={() => setPreviewTime(Math.round(lastRowSec * 10) / 10)}>Last row</ui.Button>
          <ui.Button variant="ghost" onClick={() => setPreviewTime(endScrubSec)}>End</ui.Button>
        </ui.Row>
        {rollNotice ? <ui.Message tone="muted">{rollNotice}</ui.Message> : null}
      </ui.Section>
      {progress ? <ui.Progress value={progress.value} label={progress.label} steps={TEC_BUILD_STEPS.map((s: any) => s.label)} current={progress.current} />
        : busy ? <ui.Progress label={step || "Working"} /> : null}
      {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.text}</ui.Message> : null}
      {result && result.decorated ? (
        <ui.Message tone="success">
          {"Draft created. Select the credits to edit the title, rows, colours or roll speed in Adjust, a shot to move or resize its window, change its fades, motion or the look strength, and the music to change its volume."}
        </ui.Message>
      ) : result && busy ? <ui.Message tone="muted">Draft created; adding credits and look…</ui.Message> : null}
      {result?.link ? (
        <ui.Row gap={8} align="center">
          <a href={result.link} target="_blank" rel="noreferrer">Open the new Draft</a>
          <ui.IconButton icon="copy" label="Copy the link to the new Draft" onClick={() => { navigator.clipboard?.writeText(result.link).catch(() => null); }} />
        </ui.Row>
      ) : null}
      {result?.shortened ? (
        <ui.Message tone="muted">
          {"Your footage fits " + result.shortened.shots + " shots, so this video is about " + Math.round(result.shortened.seconds) + " s instead of "
            + Math.round(result.shortened.fullSeconds) + " s. Add more clips or photos for the full length."}
        </ui.Message>
      ) : null}
      {result?.notes?.length ? <ui.Message tone="muted">{"Note: " + result.notes.join("; ") + "."}</ui.Message> : null}
      {result?.unchecked ? <ui.Message tone="muted">{"Could not check " + result.unchecked + (result.unchecked === 1 ? " video; it was" : " videos; they were") + " skipped. Build again to retry " + (result.unchecked === 1 ? "it." : "them.")}</ui.Message> : null}
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={finishTitle} disabled={busy}>Finish title and look</ui.Button> : null}
        {result ? <ui.Button onClick={buildAnother} disabled={busy}>Create another version</ui.Button> : null}
        <ui.Button variant="primary" busy={busy} busyLabel={step || "Building"} onClick={() => build(seed)} disabled={busy || !canBuild}>Build</ui.Button>
      </ui.Actions>
    </ui.Stack>
  );
}
