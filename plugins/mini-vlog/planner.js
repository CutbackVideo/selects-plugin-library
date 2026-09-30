// Mini Vlog planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
// One hard cut per shot on the music's beat grid: Quick = 1 beat per shot, Relaxed = 2 (with a tempo guard), Groove =
// a 4-bar phrase rhythm (2, 1, 1, ..., and the phrase's last beat split into two 8ths on a drum fill). Shot roles cycle
// through MV_ROLES; there is no title burst and no montage section (the title spans the whole video).
// Without a usable grid (tempo outside 70-160 bpm, own music not accepted, or No music) shots have a fixed length.
const MV_LENGTHS = { short: 12, standard: 24, long: 36 };
// Fewest shots a build needs; every length is a multiple of it, so the video is whole bars from its first beat.
const MV_MIN_SHOTS = 4;
const MV_TEMPO_MIN = 70;
const MV_TEMPO_MAX = 160;
// Shot length in seconds when there is no grid.
const MV_FALLBACK_SHOT = { quick: 0.55, relaxed: 1.10 };
// Slot roles, in order (a product cycle alternating close and wide shots).
const MV_ROLES = ['drink', 'street', 'food', 'park', 'book', 'transit', 'flowers', 'cafe'];
// Which other candidate roles may fill a slot role, best first (the slot's own role always ranks first).
const MV_ROLE_FALLBACK = {
  drink: ['cafe', 'food'],
  cafe: ['drink', 'book', 'food'],
  food: ['drink', 'cafe'],
  book: ['cafe'],
  street: ['transit', 'park'],
  transit: ['street'],
  park: ['flowers', 'street'],
  flowers: ['park'],
};
// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates. They score below any real hit and are only used by the last tier, after photos.
const MV_FILLER_STEP = 0.5;
const MV_FILLER_EDGE = 0.25;
const MV_FILLER_SCORE = -2;
// At most this many filler windows per source (a 24 s source has 48). A longer source gets 48 windows spread evenly over
// the same 0.5 s grid, first and last kept, so an hour-long clip does not flood the pool (and the panel's thread).
const MV_FILLER_MAX = 48;
// A video window ends at least this far before the end of its source. The plan's frames are at 30 fps; at the Draft's
// real rate (and music offset) a shot can be up to 1/30 + 1/fps s longer (about 0.075 s at 23.976), and Selects caps a
// source at its whole frames (up to one more frame shorter than its duration), so assemble.js may slide a window this
// far back to keep it inside its source.
const MV_SOURCE_TAIL = 0.15;
// Photos (Image resources) have no scene search. Each one fills at most one slot of any length up to the 5 s an
// image source lasts. About MV_PHOTO_SHARE of the slots, evenly spread from a seeded offset, are photo slots where an
// unused photo comes first. Elsewhere photos rank after every real video hit and before fillers. Never more than
// MV_PHOTO_RUN_MAX photos play in a row (a hard rule) unless the pool has no video at all.
const MV_PHOTO_HOLD_MAX = 5;
const MV_PHOTO_RUN_MAX = 2;
const MV_PHOTO_SHARE = 1 / 3;
// Groove (spec 15.1). A phrase is 4 bars (16 beats) from the section start; every cut sits on the beat or 8th grid.
// - Holds: the first shot of every phrase holds 2 beats; so does the bar-3 downbeat of a final phrase the video ends
//   in its second half (mvGrooveHolds). Every other shot is 1 beat.
// - Bursts: a split candidate is the last beat of each half-phrase (beat 7 = end of bar 2, beat 15 = phrase end) and
//   the video's final beat (a phrase end even mid-phrase) (mvGrooveCandidates); a split beat plays two 8th shots. At
//   most one burst per half-phrase (2 bars).
// - Which candidates split (mvFillBeats), detection first per class (phrase ends incl. the final beat / bar-2
//   accents): those whose onset density (sum of onset strengths in the beat) reaches MV_GROOVE_FILL_RATIO x the median
//   beat of the span; a class with none detected, or no onset data at all, splits all of its candidates (the bundled
//   cues carry a short drum fill at the end of every 4 bars).
// - 8th shots are video only. A span is whole bars and at least MV_GROOVE_MIN_BEATS. Without a grid the pattern runs
//   on MV_GROOVE_FALLBACK_BEAT-second beats (2 x 0.55, 0.55 ..., 2 x 0.275) with every candidate split.
// - Opener guard: when a 2-beat hold would last longer than MV_GROOVE_OPENER_MAX seconds (below 85.71 bpm) every hold
//   is 1 beat, so no shot outruns Relaxed's cap.
const MV_GROOVE_PHRASE_BEATS = 16;
const MV_GROOVE_FILL_RATIO = 1.5;
const MV_GROOVE_FALLBACK_BEAT = 0.55;
const MV_GROOVE_MIN_BEATS = 8;
const MV_GROOVE_OPENER_MAX = 1.40;
// An onset counts for the beat it sits in, from this share of a beat before the beat (onsets land a hair early).
const MV_GROOVE_ONSET_LEAD = 0.125;

// A beat grid is used only for a tempo in [MV_TEMPO_MIN, MV_TEMPO_MAX] whose detection was accepted (bundled cues
// always are).
function mvGridUsable(opts) {
  const bpm = opts && opts.bpm;
  return !!(opts && opts.accepted) && typeof bpm === 'number' && isFinite(bpm) && bpm >= MV_TEMPO_MIN && bpm <= MV_TEMPO_MAX;
}

// Beats per shot for a pace. Quick is 1 beat, but 2 above 150 bpm so shots stay >= 0.40 s; Relaxed is 2 beats, but 1
// below 86 bpm so shots stay <= 1.40 s. `overridden` tells the panel the guard changed the choice. Groove returns
// { beats: 1 (its beat unit), groove: true, opener: the phrase opener's beats (mvGrooveOpener) }, overridden when the
// opener guard makes it 1 beat (below 85.71 bpm). Above 150 bpm its 8ths would be under 0.2 s, so it plays 2 beats per
// shot like Quick (no `groove` key).
function mvBeatsPerShot(pace, bpm) {
  if (pace === 'relaxed') return bpm < 86 ? { beats: 1, overridden: true } : { beats: 2, overridden: false };
  if (pace === 'groove') {
    if (bpm > 150) return { beats: 2, overridden: true };
    const opener = mvGrooveOpener(bpm);
    return { beats: 1, overridden: opener < 2, groove: true, opener };
  }
  return bpm > 150 ? { beats: 2, overridden: true } : { beats: 1, overridden: false };
}

// Seconds per shot: the beats on a grid, else the fixed fallback for the pace (for Groove: seconds per beat unit).
function mvShotSeconds(opts) {
  if (opts.gridded) return opts.beatsPerShot * 60 / opts.bpm;
  if (opts.pace === 'groove') return MV_GROOVE_FALLBACK_BEAT;
  return opts.pace === 'relaxed' ? MV_FALLBACK_SHOT.relaxed : MV_FALLBACK_SHOT.quick;
}

// The largest multiple of MV_MIN_SHOTS (<= requested) whose shots fit between sectionStart and usableEnd, else 0.
// usableEnd is Infinity without music.
function mvFitShots(opts) {
  const start = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const end = opts.usableEnd == null ? Infinity : opts.usableEnd;
  for (let n = Math.floor(opts.requested / MV_MIN_SHOTS) * MV_MIN_SHOTS; n >= MV_MIN_SHOTS; n -= MV_MIN_SHOTS) {
    if (start + n * opts.shotSeconds <= end + 1e-6) return n;
  }
  return 0;
}

// Beats of a Groove phrase's opening shot: 2, or 1 when 2 beats would last longer than MV_GROOVE_OPENER_MAX. Without a
// grid (bpm not a number) the opener is 2 x MV_GROOVE_FALLBACK_BEAT = 1.10 s, so 2.
function mvGrooveOpener(bpm) {
  return bpm > 0 && 2 * 60 / bpm > MV_GROOVE_OPENER_MAX + 1e-9 ? 1 : 2;
}

// Beats of a span of `beats` (whole bars) that may split into two 8ths, ascending: the last beat of every half-phrase
// (beats 7 and 15 of each phrase: the end of bar 2 and the phrase end) inside the span, and the span's final beat (the
// video's end counts as a phrase end when it falls mid-phrase). Each half-phrase holds at most one of them, so there is
// at most one burst per 2 bars.
function mvGrooveCandidates(beats) {
  const half = MV_GROOVE_PHRASE_BEATS / 2, out = [];
  for (let b = half - 1; b < beats; b += half) out.push(b);
  if (beats > 0 && out[out.length - 1] !== beats - 1) out.push(beats - 1);
  return out;
}

// Beats where a Groove span has a 2-beat shot: every phrase start and, when the span ends inside a phrase's second
// half, that half-phrase's start (bar 3 downbeat), so a partial phrase keeps a long hold after its first half.
// None with a 1-beat opener (mvGrooveOpener).
function mvGrooveHolds(beats, opener) {
  if (opener === 1) return [];
  const half = MV_GROOVE_PHRASE_BEATS / 2, out = [];
  for (let p = 0; p < beats; p += MV_GROOVE_PHRASE_BEATS) {
    out.push(p);
    if (p + MV_GROOVE_PHRASE_BEATS > beats && beats - p > half) out.push(p + half);
  }
  return out;
}

// Groove slot lengths in beats for a span of `beats` (whole bars): 2-beat holds at mvGrooveHolds, each beat in
// `splits` (beat indices, from mvGrooveCandidates) as two 8ths, every other beat 1. opener (default 2) as in
// mvGrooveHolds. The lengths sum to `beats`.
function mvGrooveBeats(opts) {
  const beats = opts.beats, list = [];
  const holds = mvGrooveHolds(beats, opts.opener === 1 ? 1 : 2), splits = opts.splits || [];
  for (let b = 0; b < beats;) {
    if (holds.indexOf(b) >= 0 && beats - b >= 2) { list.push(2); b += 2; }
    else if (splits.indexOf(b) >= 0) { list.push(0.5, 0.5); b += 1; }
    else { list.push(1); b += 1; }
  }
  return list;
}

// Shots in a span of `beats` with the pattern (every candidate split) and the given opener (default 2).
function mvGrooveCount(beats, opener) {
  return mvGrooveBeats({ beats, splits: mvGrooveCandidates(beats), opener }).length;
}

// The nominal Groove span for a requested number of shots: the whole-bar span (>= MV_GROOVE_MIN_BEATS) whose pattern
// shot count is nearest the request, the longer one on a tie (2-beat opener: 12 -> 12 beats / 12 shots, 24 -> 24 /
// 25, 36 -> 36 / 38). It depends on the length and the opener only, never on the music section, so the panel can size
// the section before fills are known; detected fills then change the shot count inside the same span (the plan
// reports the actual shots). opener: mvGrooveOpener(bpm), default 2.
function mvGrooveSpan(requested, opener) {
  const want = Math.max(MV_MIN_SHOTS, Math.floor(requested) || 0);
  let beats = MV_GROOVE_MIN_BEATS;
  while (mvGrooveCount(beats, opener) < want) beats += 4;
  const lower = beats - 4;
  if (lower >= MV_GROOVE_MIN_BEATS && want - mvGrooveCount(lower, opener) < mvGrooveCount(beats, opener) - want) beats = lower;
  return { beats, shots: mvGrooveCount(beats, opener) };
}

// Music capacity for Groove (mvFitShots on beat spans): the nominal span, shortened by whole bars until
// sectionStart + beats x beatSeconds <= usableEnd; { beats: 0, shots: 0 } when not even MV_GROOVE_MIN_BEATS fit.
// `shots` is the pattern count for the fitted span; usableEnd is Infinity (or null) without music; opener? as in
// mvGrooveSpan.
function mvGrooveFit(opts) {
  const start = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const end = opts.usableEnd == null ? Infinity : opts.usableEnd;
  const nominal = mvGrooveSpan(opts.requested, opts.opener);
  for (let beats = nominal.beats; beats >= MV_GROOVE_MIN_BEATS; beats -= 4) {
    if (start + beats * opts.beatSeconds <= end + 1e-6) return { beats, shots: mvGrooveCount(beats, opts.opener), requestedBeats: nominal.beats };
  }
  return { beats: 0, shots: 0, requestedBeats: nominal.beats };
}

// Drum fills of a Groove span. opts: { onsets: [[music seconds, band, strength], ...], sectionStart (music seconds),
// bpm, firstBeat? (re-phases sectionStart onto the beat grid), beats (the span) }. A beat's density is the sum of its
// onsets' strengths (count x strength); a candidate beat (mvGrooveCandidates) carries a fill when its density reaches
// MV_GROOVE_FILL_RATIO x the median beat density of the span. Candidates come in two classes: phrase ends (beat 15 of
// a phrase, and the span's final beat) and bar-2 accents (beat 7 of a phrase, unless it is the final beat). Detection
// first, per class: when a class has a candidate with a fill, just those split; a class without one falls back to all
// of its candidates. No onsets, no bpm or section start or a median of 0 -> every candidate splits. Returns { splits:
// beat indices, candidates, source: 'onsets' (both classes detected) | 'mixed' | 'pattern' (neither), ratios: density
// / median per candidate (empty without data) }.
function mvFillBeats(opts) {
  const n = Math.max(0, Math.floor(opts.beats) || 0), candidates = mvGrooveCandidates(n);
  const fallback = ratios => ({ splits: candidates.slice(), candidates, source: 'pattern', ratios });
  const bpm = opts.bpm, finite = v => typeof v === 'number' && isFinite(v);
  if (!n || !(bpm > 0) || !finite(opts.sectionStart) || !Array.isArray(opts.onsets) || !opts.onsets.length) return fallback([]);
  const beat = 60 / bpm;
  const start = finite(opts.firstBeat) ? opts.firstBeat + Math.round((opts.sectionStart - opts.firstBeat) / beat) * beat : opts.sectionStart;
  const density = Array(n).fill(0);
  for (const o of opts.onsets) {
    if (!o || !finite(o[0]) || !finite(o[2]) || !(o[2] > 0)) continue;
    const k = Math.floor((o[0] - start) / beat + MV_GROOVE_ONSET_LEAD);
    if (k >= 0 && k < n) density[k] += o[2];
  }
  const sorted = density.slice().sort((a, b) => a - b);
  const median = (sorted[(n - 1) >> 1] + sorted[n >> 1]) / 2;
  if (!(median > 0)) return fallback([]);
  const ratios = candidates.map(b => Math.round(density[b] / median * 100) / 100);
  const isEnd = b => b === n - 1 || b % MV_GROOVE_PHRASE_BEATS === MV_GROOVE_PHRASE_BEATS - 1;
  const fill = b => density[b] / median >= MV_GROOVE_FILL_RATIO - 1e-9;
  let detected = 0;
  const pick = list => { const hit = list.filter(fill); if (hit.length) detected++; return hit.length ? hit : list; };
  const ends = pick(candidates.filter(isEnd)), accents = pick(candidates.filter(b => !isEnd(b)));
  const splits = ends.concat(accents).sort((a, b) => a - b);
  // Two classes when the span has accents; a class that is empty counts as detected for 'onsets'.
  const classes = candidates.some(b => !isEnd(b)) ? 2 : 1;
  return { splits, candidates, source: detected === 0 ? 'pattern' : detected === classes ? 'onsets' : 'mixed', ratios };
}

// Where the music's beats land on the timeline. Selects snaps the music's source start (sectionStart) to a timeline
// frame, so the music plays offset by delta = sectionStart - round(sectionStart * fps) / fps (at most half a frame);
// beat b of the section plays at b * 60 / bpm + delta. Without music there is no offset.
function mvMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

// Onset-snapped cuts. The cuts stay on the grid; a cut moves onto a clearly strong music onset near it, and only when
// nothing already marks the grid position. Only a cut that starts a slot of at least one beat is snappable: with
// opts.beatsList (Groove) a cut starting an 8th slot stays on the grid; without it every inner cut qualifies.
// Conservative rules (from CWV v2.6): a cut stays on the grid when a qualifying onset of any band lies within one frame
// of it; otherwise the candidate must reach MV_SNAP_MIN_RATIO of its band threshold, candidates rank by
// ratio - MV_SNAP_DISTANCE_COST * |offset| / window, and a low-band candidate must also beat the grid position's own
// onset (the strongest qualifying onset nearer the grid, else the band threshold, ratio 1) by MV_SNAP_LOW_MARGIN.
const MV_SNAP_WINDOW_BEATS = 0.10;          // search window: +/- this share of a beat ...
const MV_SNAP_WINDOW_MAX = 0.070;           // ... capped at this many seconds
const MV_SNAP_MIN_STRENGTH = 2;             // an onset's strength (over its band median) must reach max(this, band threshold)
const MV_SNAP_MIN_RATIO = 1.5;              // a snap target's strength over that threshold
const MV_SNAP_DISTANCE_COST = 0.5;          // score = ratio - this * |offset| / window: an onset at the window edge loses 0.5
const MV_SNAP_LOW_MARGIN = 0.25;            // a low-band target's ratio over the grid position's own onset ratio
const MV_SNAP_MIN_FRAMES = 4;               // no snap may leave a shot shorter than this (or than its grid length, if shorter)
const MV_SNAP_MIN_SHARE = 0.75;             // ... or shorter than this share of its grid length
// Music whose beat was not found reliably (fixed shot lengths): only bass onsets, within a fixed window.
const MV_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

// boundaries: the grid's cut times in seconds from the section start ([0, end of slot 0, ..., end of the last slot]).
// onsets: [[seconds in the music source, band 'l' | 'm' | 'h', strength], ...].
// opts: { bpm (null without a grid), fps, sectionStart (the music second at the section start; onsets are shifted by
// it), thresholds?: { l, m, h }, lowConfidence?: true for fixed timing (forced when bpm is not a number), beatsList?:
// slot lengths in beats }. The min-frames / min-share rule below keeps an 8th slot next to a snapped cut. Returns
// { cuts: seconds like boundaries, frames: the cuts at opts.fps with the music offset (same expression as mvSchedule
// and assemble.js), log: one entry per inner cut, window }. A snapped cut sits exactly on its onset, so rounding it to
// a frame at any rate never puts it more than half a frame before the onset.
function mvSnapCuts(boundaries, onsets, opts) {
  const fps = opts.fps, low = !!opts.lowConfidence || !(opts.bpm > 0);
  const offset = mvMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const reach = low ? MV_SNAP_LOW_CONFIDENCE_WINDOW : Math.min(MV_SNAP_WINDOW_BEATS * 60 / opts.bpm, MV_SNAP_WINDOW_MAX);
  const bands = low ? ['l'] : ['l', 'm', 'h'];
  const thr = band => Math.max(MV_SNAP_MIN_STRENGTH, (opts.thresholds && opts.thresholds[band]) || 0);
  const shift = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const list = (onsets || []).filter(o => o && isFinite(o[0]) && isFinite(o[2]) && o[2] >= thr(o[1]))
    .map(o => ({ x: o[0] - shift, band: o[1], strength: o[2], ratio: o[2] / thr(o[1]) }));
  const n = boundaries.length - 1;
  const cuts = boundaries.slice(), log = [];
  // The onset a cut at grid time g moves to ({ ...onset, d }), or { none: reason } when it stays on the grid.
  const pick = g => {
    const near = list.filter(o => Math.abs(o.x - g) <= reach + 1e-9).map(o => ({ ...o, d: Math.abs(o.x - g) }));
    const onGrid = near.filter(o => o.d <= 1 / fps + 1e-9).sort((p, q) => p.d - q.d || p.x - q.x);
    if (onGrid.length) return { none: 'on grid (' + onGrid[0].band + ' onset within a frame)' };
    const usable = near.filter(o => bands.indexOf(o.band) >= 0);
    if (!usable.length) return { none: 'no onset' };
    let best = null, why = 'weak onset';
    for (const o of usable) {
      if (o.ratio < MV_SNAP_MIN_RATIO - 1e-9) continue;
      if (o.band === 'l') {
        // The grid position's own onset: the strongest qualifying onset nearer the grid (ratio 1 = the threshold when
        // there is none, since a weaker one would not be listed).
        const own = near.reduce((m, q) => (q.d < o.d - 1e-9 && q.ratio > m ? q.ratio : m), 1);
        if (o.ratio < own + MV_SNAP_LOW_MARGIN - 1e-9) { why = 'low onset not above the grid'; continue; }
      }
      const score = o.ratio - MV_SNAP_DISTANCE_COST * o.d / reach;
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && (o.d < best.d - 1e-9 || (Math.abs(o.d - best.d) <= 1e-9 && o.x < best.x)))) best = { ...o, score };
    }
    return best || { none: why };
  };
  // The first shot in [a, b] that a snap would make too short, or null.
  const tooShort = (next, a, b) => {
    for (let k = Math.max(0, a); k <= Math.min(n - 1, b); k++) {
      const frames = frameOf(next[k + 1]) - frameOf(next[k]), grid = frameOf(boundaries[k + 1]) - frameOf(boundaries[k]);
      if (frames < Math.min(MV_SNAP_MIN_FRAMES, grid)) return { slot: k, reason: 'min-frames' };
      if (next[k + 1] - next[k] < MV_SNAP_MIN_SHARE * (boundaries[k + 1] - boundaries[k]) - 1e-9) return { slot: k, reason: 'min-share' };
    }
    return null;
  };
  for (let i = 1; i < n; i++) {
    const g = boundaries[i];
    if (opts.beatsList && !(opts.beatsList[i] >= 1)) { log.push({ index: i, grid: g, seconds: g, shiftMs: 0, reason: 'eighth: stays on the grid' }); continue; }
    const o = pick(g);
    if (o.none) { log.push({ index: i, grid: g, seconds: g, shiftMs: 0, reason: o.none }); continue; }
    const next = cuts.slice();
    next[i] = o.x;
    const bad = tooShort(next, i - 1, i);
    const entry = { index: i, grid: g, onset: o.x, band: o.band, strength: o.strength, ratio: Math.round(o.ratio * 100) / 100 };
    if (bad) { log.push({ ...entry, seconds: g, shiftMs: 0, reason: 'reverted: slot ' + bad.slot + ' ' + bad.reason }); continue; }
    cuts[i] = o.x;
    log.push({ ...entry, seconds: o.x, shiftMs: Math.round((o.x - g) * 1e4) / 10, reason: 'onset' });
  }
  return { cuts, frames: cuts.map(frameOf), log, window: reach };
}

// opts: { bpm (null without a usable grid), fps, shots, beatsPerShot, shotSeconds? (the fixed shot length, needed
// when bpm is null), sectionStart?: seconds into the music (omit without music), onsets?, onsetThresholds?,
// lowConfidence? (mvSnapCuts; used only with a sectionStart), cuts?: cut seconds decided earlier (a schedule's `cuts`,
// reused as they are, e.g. to rebuild at the Draft's real fps), beatsList?: per-slot lengths in beats (Groove; replaces
// shots and beatsPerShot; without a grid shotSeconds is the seconds per beat) }. Slots carry their grid beat span
// (startBeat, endBeat; null without a grid) and frames, and with beatsList also `beats` (the slot's length in beats);
// `offset` is the music offset every boundary is shifted by; `cuts` are the boundaries in seconds from the section
// start (the grid, or the snapped cuts) and `snapLog` explains each inner cut. With beatsList the result also carries
// `beatsList`.
function mvSchedule(opts) {
  const list = Array.isArray(opts.beatsList) ? opts.beatsList : null;
  const fps = opts.fps, n = list ? list.length : opts.shots, gridded = opts.bpm > 0;
  if (!(fps > 0) || !(n >= 1)) throw Error('mvSchedule needs fps and shots');
  if (list && !list.every(b => typeof b === 'number' && b > 0 && isFinite(b))) throw Error('mvSchedule: beatsList needs positive beat lengths');
  const bps = gridded ? (list ? 1 : opts.beatsPerShot) : null;
  if (gridded && !(bps > 0)) throw Error('mvSchedule needs beatsPerShot');
  const shotSeconds = gridded ? bps * 60 / opts.bpm : opts.shotSeconds;
  if (!(shotSeconds > 0)) throw Error('mvSchedule needs bpm or shotSeconds');
  // Slot k starts `at[k]` units (beats, or fixed shots / beat units without a grid) in; sums of 0.5, 1 and 2 are exact.
  const at = [0];
  for (let k = 0; k < n; k++) at.push(at[k] + (list ? list[k] : 1));
  // Every boundary is an absolute position (k shots in), shifted by the music offset and snapped once to a frame;
  // durations never accumulate rounding. The video always starts at frame 0. assemble.js uses the same expression.
  const offset = mvMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const grid = [];
  for (let k = 0; k <= n; k++) grid.push(gridded ? at[k] * bps * (60 / opts.bpm) : at[k] * shotSeconds);
  let cuts = grid, snapLog = [];
  if (Array.isArray(opts.cuts)) {
    if (opts.cuts.length !== grid.length) throw Error('mvSchedule: cuts do not match the slots');
    cuts = opts.cuts.slice();
  } else if (opts.onsets && opts.onsets.length && typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart)) {
    const snapped = mvSnapCuts(grid, opts.onsets,
      { bpm: gridded ? opts.bpm : null, fps, sectionStart: opts.sectionStart, thresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence || !gridded, beatsList: list || undefined });
    cuts = snapped.cuts; snapLog = snapped.log;
  }
  const slots = [];
  for (let i = 0; i < n; i++) {
    slots.push({
      index: i,
      role: MV_ROLES[i % MV_ROLES.length],
      startBeat: gridded ? at[i] * bps : null,
      endBeat: gridded ? at[i + 1] * bps : null,
      startFrame: frameOf(cuts[i]),
      endFrame: frameOf(cuts[i + 1]),
      ...(list ? { beats: list[i] } : {}),
    });
  }
  return { offset, cuts, snapLog, slots, totalFrames: slots[n - 1].endFrame, gridded, ...(list ? { beatsList: list.slice() } : {}) };
}

// Music section start: snapped to whole bars from firstBeat on an accepted grid (to 0.1 s otherwise), clamped so a
// video of videoSeconds fits before usableEnd; null when it cannot fit.
function mvSnapSection(opts) {
  const latest = opts.usableEnd - opts.videoSeconds;
  if (latest < -1e-6) return null;
  if (!opts.gridAccepted) return Math.max(0, Math.min(Math.floor(latest * 10) / 10, Math.round(opts.value * 10) / 10));
  const bar = 4 * 60 / opts.bpm;
  const maxK = Math.floor((latest - opts.firstBeat) / bar + 1e-9);
  if (maxK < 0) return null;
  const k = Math.max(0, Math.min(maxK, Math.round((opts.value - opts.firstBeat) / bar)));
  return opts.firstBeat + k * bar;
}

// Default music section: the most energetic window of videoSeconds starting a whole number of bars after firstBeat
// (earliest on ties), or null when none fits. opts.downbeatHigh only changes what that guarantees, not the maths: with
// a high-confidence downbeat firstBeat is a bar start, so the section starts on a downbeat; otherwise (downbeatHigh
// false) the start is still a beat, with the bar phase best effort.
function mvDefaultSection(opts) {
  const beat = 60 / opts.bpm, span = Math.round(opts.videoSeconds / beat);
  let best = null;
  for (let k = 0; ; k++) {
    const start = opts.firstBeat + k * 4 * beat;
    if (start + opts.videoSeconds > opts.usableEnd + 1e-6) break;
    const slice = opts.beatEnergy.slice(k * 4, k * 4 + span);
    if (slice.length < span) break;
    const mean = slice.reduce((a, b) => a + b, 0) / span;
    if (!best || mean > best.mean + 1e-9) best = { start, mean };
  }
  return best ? best.start : null;
}

function mvHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Filler candidates every MV_FILLER_STEP seconds on each source that appears in the candidates, sorted by rid then time;
// at most MV_FILLER_MAX per source (an even subset of that grid, keeping both edge windows).
function mvFillers(candidates) {
  const dur = {};
  for (const c of candidates) {
    if (!c || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    // Grid points MV_FILLER_EDGE + k * MV_FILLER_STEP with k = 0 .. count - 1 that stay MV_FILLER_EDGE from the end.
    const count = Math.max(0, Math.floor((dur[rid] - 2 * MV_FILLER_EDGE + 1e-9) / MV_FILLER_STEP) + 1);
    const take = Math.min(count, MV_FILLER_MAX);
    let last = -1;
    for (let i = 0; i < take; i++) {
      const k = take === count ? i : Math.round(i * (count - 1) / (take - 1));
      if (k === last) continue;
      last = k;
      out.push({ rid, role: 'filler', t: MV_FILLER_EDGE + k * MV_FILLER_STEP, score: MV_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// Strict allocation. opts: { candidates, slots: [{ index, role, seconds, videoOnly? }], seed, gapSeconds = 0.5,
// photoShare = MV_PHOTO_SHARE }. A videoOnly slot (a Groove 8th) never takes a photo, and the photo share counts only
// the other slots. Two hard rules, never relaxed: the previous slot's source is never used again for the next slot,
// and at most MV_PHOTO_RUN_MAX photos play in a row (unless the pool has no video candidate). A slot nothing fits under
// them stays null (counted in `missing`); mvPlanBuild then tries a shorter length.
function mvAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const finite = v => typeof v === 'number' && isFinite(v);
  const candidates = opts.candidates.filter(c => c && c.kind !== 'photo' && finite(c.t) && finite(c.score) && finite(c.sourceDuration));
  // One photo candidate per rid, in rid order so the result never depends on input order.
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  const used = {}, uses = {}, recent = [], picks = [], photoUsed = {};
  // Variety first (default): a slot takes an unused resource whenever one fits before reusing any, and reuse goes to
  // the least-used resource. spread: false ranks by role and score only (the fallback mvPlanBuild tries before it
  // shrinks, since spending every fresh clip first can strand a length that a reuse-tolerant order fills).
  const spread = opts.spread !== false;
  const pool = candidates.filter(c => c.sourceDuration > 0);
  // Each candidate's seeded tie-break jitter, hashed once per call rather than per slot, tier and use count.
  const jitter = pool.map(c => mvHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05);
  // Photo-only pools (no usable video) may play any number of photos in a row.
  const runLimited = pool.length > 0;
  let missing = 0, fillerShots = 0, photoShots = 0, photoRun = 0, prevRid = null;
  // Photo slots: round(share x slots) of the slots a photo can hold, capped by the photos available, spaced evenly
  // from a seeded phase. With no photos there are none, and every slot goes to video.
  const photoSlots = {};
  const holdable = opts.slots.filter(sl => !sl.videoOnly && sl.seconds <= MV_PHOTO_HOLD_MAX + 1e-9);
  const share = opts.photoShare == null ? MV_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(opts.slots.filter(sl => !sl.videoOnly).length * share));
  const phase = mvHash(opts.seed + ':photo-slots');
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;
  // Best fitting video candidate for a slot. rankOf returns the candidate's rank in this tier, or -1 to skip it.
  // `exclude` is the previous shot's source, which may not be used; `level`, when not null, keeps only sources used
  // exactly that many times.
  function searchVideo(slot, rankOf, exclude, level) {
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      if (c.rid === exclude) continue;
      if (level != null && (uses[c.rid] || 0) !== level) continue;
      const rank = rankOf(c);
      if (rank < 0 || c.sourceDuration < slot.seconds + MV_SOURCE_TAIL) continue;
      const start = Math.max(0, Math.min(c.sourceDuration - MV_SOURCE_TAIL - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      const value = c.score - rank * 0.15 - repeats * 0.2 + jitter[i];
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end };
    }
    return best;
  }
  // An unused photo for the slot, chosen by a seeded hash so another seed picks other photos. A photo is never the
  // previous source, since each photo is used once.
  function searchPhoto(slot) {
    if (slot.videoOnly || slot.seconds > MV_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const c of photos) {
      if (photoUsed[c.rid]) continue;
      const value = mvHash(opts.seed + ':photo:' + c.rid);
      if (!best || value > best.value + 1e-12) best = { value, c, photo: true };
    }
    return best;
  }
  for (const slot of opts.slots) {
    const roles = [slot.role].concat(MV_ROLE_FALLBACK[slot.role] || []);
    const exclude = prevRid;
    const photo = () => searchPhoto(slot);
    const preferred = level => () => searchVideo(slot, c => roles.indexOf(c.role), exclude, level);
    const anyReal = level => () => searchVideo(slot, c => (c.role === 'filler' ? -1 : 0), exclude, level);
    const filler = level => () => searchVideo(slot, c => (c.role === 'filler' ? 0 : -1), exclude, level);
    // Tiers, best first. A photo slot puts an unused photo first. With spread (the default) the video tiers run once
    // per use count, fewest first: preferred-role hits, any-role hits, then fillers of sources used that often, so
    // role and score only rank sources used equally often and an unused clip (even by a filler) beats any reuse.
    // Outside photo slots a photo is then the last resort, which keeps the photo share. Without spread the CWV order
    // applies: preferred, any-role, photo, filler. After MV_PHOTO_RUN_MAX photos in a row the photo tier is skipped.
    const runFull = runLimited && photoRun >= MV_PHOTO_RUN_MAX;
    const tiers = photoSlots[slot.index] ? [photo] : [];
    if (spread) {
      const levels = Array.from(new Set(pool.map(c => uses[c.rid] || 0))).sort((x, y) => Number(x) - Number(y));
      for (const level of levels) tiers.push(preferred(level), anyReal(level), filler(level));
      tiers.push(photo);
    } else {
      tiers.push(preferred(null), anyReal(null), photo, filler(null));
    }
    let best = null;
    for (const tier of tiers) {
      if (runFull && tier === photo) continue;
      if ((best = tier())) break;
    }
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
    uses[best.c.rid] = (uses[best.c.rid] || 0) + 1;
    if (best.c.role === 'filler') fillerShots++;
    // sourceDuration lets assemble.js keep the window inside its source at the Draft's real rate.
    picks.push({ slot: slot.index, rid: best.c.rid, kind: 'video', startSeconds: best.start, endSeconds: best.end, sourceDuration: best.c.sourceDuration });
  }
  return { picks, missing, filled: picks.filter(Boolean).length, fillerShots, photoShots };
}

// The whole plan. opts: { candidates (video hits and { rid, kind: 'photo' }), bpm (null without music), accepted,
// fps, pace: 'quick' | 'relaxed' | 'groove', requested (shots), sectionStart?, usableEnd? (Infinity / omitted without
// music), onsets?, onsetThresholds?, lowConfidence?, seed, photoShare? }.
// Order: the music caps the length (mvFitShots), then the plan tries that length and shrinks by MV_MIN_SHOTS down to
// MV_MIN_SHOTS until the strict allocation fills every slot. Every attempt allocates from scratch with filler
// candidates added (see `attempts` below). Failure reasons: 'music-too-short' (not even MV_MIN_SHOTS fit the music), 'one-resource' (fewer
// than 2 distinct sources: the adjacency rule cannot hold), 'too-few' (the footage fills fewer than MV_MIN_SHOTS).
// Groove (unless its tempo guard falls back to 2 beats per shot): the length is a beat span (mvGrooveFit: the nominal
// span for `requested`, capped by the music in whole bars) and shrinks by whole bars down to MV_GROOVE_MIN_BEATS; each
// span's fills come from the section's onsets (mvFillBeats), and `shots` is that span's actual slot count. A pool with
// no usable video gets no 8ths (photos cannot take them). The result then has beatsPerShot null, shotSeconds null and
// groove: { beats, requestedBeats, splits (beats split into 8ths), fillSource, beatSeconds, opener }; its slots carry
// `beats`.
function mvPlanBuild(opts) {
  const gridded = mvGridUsable({ bpm: opts.bpm, accepted: opts.accepted });
  const guard = gridded ? mvBeatsPerShot(opts.pace, opts.bpm) : { beats: null, overridden: false };
  const grooved = opts.pace === 'groove' && (gridded ? !!guard.groove : true);
  const shotSeconds = grooved ? null : mvShotSeconds({ bpm: opts.bpm, beatsPerShot: guard.beats, pace: opts.pace, gridded });
  const beatSeconds = grooved ? (gridded ? 60 / opts.bpm : MV_GROOVE_FALLBACK_BEAT) : null;
  const opener = grooved && gridded ? mvGrooveOpener(opts.bpm) : 2;
  const asked = typeof opts.requested === 'number' && isFinite(opts.requested) ? opts.requested : MV_LENGTHS.standard;
  const requested = Math.max(MV_MIN_SHOTS, Math.floor(asked / MV_MIN_SHOTS) * MV_MIN_SHOTS);
  const fit = grooved ? mvGrooveFit({ requested, sectionStart: opts.sectionStart, usableEnd: opts.usableEnd, beatSeconds, opener }) : null;
  const top = grooved ? fit.beats : mvFitShots({ requested, sectionStart: opts.sectionStart, usableEnd: opts.usableEnd, shotSeconds });
  if (top === 0) return { ok: false, reason: 'music-too-short', usableShots: 0 };
  // Distinct sources the allocator can use: valid videos (as mvAllocate filters them) and photos.
  const finite = v => typeof v === 'number' && isFinite(v);
  const rids = {};
  let hasPhotos = false, hasVideo = false;
  for (const c of opts.candidates) {
    if (!c || typeof c.rid !== 'string') continue;
    if (c.kind === 'photo') { rids[c.rid] = true; hasPhotos = true; }
    else if (finite(c.t) && finite(c.score) && finite(c.sourceDuration) && c.sourceDuration > 0) { rids[c.rid] = true; hasVideo = true; }
  }
  if (Object.keys(rids).length < 2) return { ok: false, reason: 'one-resource', usableShots: 0 };
  const candidates = opts.candidates.concat(mvFillers(opts.candidates));
  // Share attempts per length. The greedy allocator spends a scarce video window after every photo outside the photo
  // slots, which can strand photos behind the run limit although the length is fillable (P P a P P b P P). So before a
  // length is given up it is retried with every slot a photo slot (photos first, a video only after two photos), which
  // spends video windows only where the run limit needs them.
  const shares = [opts.photoShare == null ? MV_PHOTO_SHARE : opts.photoShare];
  if (hasPhotos && shares[0] !== 1) shares.push(1);
  // Variety first; spending every fresh clip early can also strand a fillable length (a s s s ... where a s a s ...
  // fits), so a length is only given up after the role-and-score order (spread: false) fails too.
  // Each attempt's name ('spread', 'spread-share1', 'role-first', 'role-first-share1') is returned as `attempt`, so the
  // panel and logs can tell when a fallback built the plan.
  const attempts = [true, false].flatMap(spread => shares.map((photoShare, i) =>
    ({ spread, photoShare, name: (spread ? 'spread' : 'role-first') + (i ? '-share1' : '') })));
  let usableShots = 0;
  // Lengths to try, longest first: shots (Quick / Relaxed) or beat spans (Groove).
  const step = grooved ? 4 : MV_MIN_SHOTS, least = grooved ? MV_GROOVE_MIN_BEATS : MV_MIN_SHOTS;
  for (let n = top; n >= least; n -= step) {
    const snapOpts = { sectionStart: opts.sectionStart, onsets: opts.onsets, onsetThresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence };
    // Groove fills for this span: none without video (photos cannot take an 8th), the pattern without a grid.
    const fills = !grooved ? null
      : !hasVideo ? { splits: [], source: 'no-video' }
      : gridded ? mvFillBeats({ onsets: opts.onsets, sectionStart: opts.sectionStart, bpm: opts.bpm, beats: n })
      : { splits: mvGrooveCandidates(n), source: 'pattern' };
    const schedule = fills
      ? mvSchedule({ bpm: gridded ? opts.bpm : null, fps: opts.fps, beatsList: mvGrooveBeats({ beats: n, splits: fills.splits, opener }), shotSeconds: beatSeconds, ...snapOpts })
      : mvSchedule({ bpm: gridded ? opts.bpm : null, fps: opts.fps, shots: n, beatsPerShot: guard.beats, shotSeconds, ...snapOpts });
    const slots = schedule.slots.map(s => (fills
      ? { index: s.index, role: s.role, seconds: (s.endFrame - s.startFrame) / opts.fps, videoOnly: (s.beats || 1) < 1 }
      : { index: s.index, role: s.role, seconds: (s.endFrame - s.startFrame) / opts.fps }));
    for (const attempt of attempts) {
      const alloc = mvAllocate({ candidates, slots, seed: opts.seed, photoShare: attempt.photoShare, spread: attempt.spread });
      if (alloc.missing === 0) {
        return { ok: true, schedule, picks: alloc.picks, shots: slots.length, requested, fittedByMusic: top < (fit ? fit.requestedBeats : requested),
          beatsPerShot: grooved ? null : guard.beats, overridden: guard.overridden, shotSeconds, fillerShots: alloc.fillerShots, photoShots: alloc.photoShots,
          attempt: attempt.name,
          ...(fills && fit ? { groove: { beats: n, requestedBeats: fit.requestedBeats, splits: fills.splits, fillSource: fills.source, beatSeconds, opener } } : {}) };
      }
      // The shortest length misses slots with every share, so usableShots < MV_MIN_SHOTS.
      if (n === least) usableShots = Math.max(usableShots, alloc.filled);
    }
  }
  return { ok: false, reason: 'too-few', usableShots };
}

// Photo motions, in pick order: every photo pick gets one (the title covers the whole video and does not restrict
// motion); videos and empty picks get null.
// Deterministic per seed; never the same motion twice in a row, never the same family (drift, tilt, ...) twice in a row;
// drift, tilt and push-drift directions alternate. Drift follows the photo: vertical for portrait, horizontal otherwise.
// Each entry is { motion, direction: 1 | -1, axis: 'x' | 'y' } for assets/photo-motion.tsx.
// `sizes` maps rid -> { width, height }; an unknown size counts as landscape.
const MV_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const MV_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
function mvPhotoMotions(picks, seed, sizes) {
  const out = [];
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  for (const pick of picks) {
    if (!pick || pick.kind !== 'photo') { out.push(null); continue; }
    const size = sizes && sizes[pick.rid];
    const portrait = !!(size && size.height > size.width);
    const families = MV_MOTION_FAMILIES.filter(f => f !== lastFamily)
      .map(f => ({ f, v: mvHash(seed + ':motion:' + k + ':' + f) }))
      .sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1));
    const family = families[0].f;
    let motion = family, direction = 1;
    if (family === 'drift') {
      const axis = portrait ? 'y' : 'x';
      direction = driftSign[axis]; driftSign[axis] = -direction;
      motion = axis === 'x' ? (direction > 0 ? 'drift-right' : 'drift-left') : (direction > 0 ? 'drift-down' : 'drift-up');
    } else if (family === 'tilt') { direction = tiltSign; tiltSign = -tiltSign; }
    else if (family === 'push-drift') { direction = pushDriftSign; pushDriftSign = -pushDriftSign; }
    // axis: the drift direction of push-drift (and of the drift motions), along the side the 16:9 crop has room on:
    // a portrait photo is cropped top and bottom (y), a landscape or square one drifts sideways (x).
    out.push({ motion, direction, axis: portrait ? 'y' : 'x' });
    lastFamily = family; k++;
  }
  return out;
}

// Build steps shown in the panel's progress bar, with each step's share of the bar in percent.
const MV_BUILD_STEPS = [
  { id: 'shots', label: 'Choosing shots', weight: 40 },
  { id: 'music', label: 'Preparing music', weight: 10 },
  { id: 'draft', label: 'Creating Draft', weight: 25 },
  { id: 'look', label: 'Adding title and look', weight: 20 },
  { id: 'open', label: 'Opening Draft', weight: 5 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function mvProgress(stepId, fraction, detail) {
  const i = MV_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = MV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = MV_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + MV_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  const step = MV_BUILD_STEPS[i];
  return {
    value,
    percent,
    current: i,
    label: 'Step ' + (i + 1) + '/' + MV_BUILD_STEPS.length + ' · ' + step.label + (detail ? ' (' + detail + ')' : '') + ' · ' + percent + '%',
  };
}
