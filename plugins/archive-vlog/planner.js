// Archive Vlog planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
// One hard cut per slot on the music's beat grid, in a fixed template (spec 3): an opening shot (6 beats), a credit
// shot (2 beats, so the montage starts on beat 8, a downbeat), a montage of N shots of M beats each, and a held final
// shot (F beats). Pace Cinematic: M = 2 up to 110 bpm, 4 above; Quick: M = 1 up to 110 bpm, 2 above, with twice the
// shots, so a Length keeps its duration. F = 4 up to 110 bpm, 8 above. The montage is always whole bars (N x M a
// multiple of 4) and shrinks by whole bars when the footage or the music is short, down to AV_MIN_MONTAGE shots; the
// intro and the final shot stay.
// Without a usable grid (tempo outside 70-160 bpm, own music not accepted, or No music) the same template runs on a
// fixed beat: an approximate tempo's (avApproxTempo) when own music has one, else 60 / AV_FALLBACK_BPM s.
// Montage shots per Length at Pace Cinematic (Quick doubles them, avMontageShots).
const AV_LENGTHS = { short: 8, standard: 16, long: 24 };
// The intro in beats: opening + credit = 8, so the montage starts on a downbeat.
const AV_INTRO_BEATS = { opening: 6, credit: 2 };
const AV_TEMPO_MIN = 70;
const AV_TEMPO_MAX = 160;
// The beat without a grid (and without an approximate tempo): 60 / 72 s, the default cue's tempo.
const AV_FALLBACK_BPM = 72;
// Up to this tempo montage shots are 2 beats (Quick 1) and the final shot 4 beats; above it 4 (Quick 2) and 8.
const AV_SLOW_MAX_BPM = 110;
// The shortest montage, in shots, at both paces (kit default): 4 x M beats is whole bars for every M (1, 2 or 4).
const AV_MIN_MONTAGE = 4;
// Slot roles: the intro's two, the montage cycle, the final shot (spec 8). The panel holds the search queries. The cycle
// alternates shot scales: a wide or establishing role (architecture, water, skyline) never follows another one, across
// the wrap too (skyline -> crowd), so the montage never plays two wide views in a row by role.
const AV_MONTAGE_ROLES = ['crowd', 'architecture', 'ride', 'water', 'food', 'transit', 'skyline'];
const AV_WIDE_ROLES = ['opening', 'architecture', 'water', 'skyline'];
const AV_ROLES = ['opening', 'portrait'].concat(AV_MONTAGE_ROLES, ['ending']);
// Which other candidate roles may fill a slot role, best first (the slot's own role always ranks first).
const AV_ROLE_FALLBACK = {
  opening: ['crowd', 'ride', 'skyline'],
  portrait: ['crowd', 'food'],
  crowd: ['ride', 'opening'],
  transit: ['ride', 'crowd'],
  water: ['skyline', 'architecture'],
  architecture: ['skyline', 'opening'],
  ride: ['crowd', 'transit'],
  food: ['crowd'],
  skyline: ['water', 'architecture'],
  ending: ['skyline', 'transit', 'crowd'],
};
// Clips Selects has not analysed have no scene-search roles. The panel scores them locally (its quick-score block) and
// hands in windows of two kinds: steady (steadier, well exposed: the opening, credit and final shots) and montage
// (varied motion). A window of the kind that fits a slot ranks with that slot's own role (rank 0, by score) in the
// preferred tier, so analysed and unanalysed clips compete on score (the panel puts both on one scale); the other kind
// joins the any-role tier.
const AV_LOCAL_ROLES = { steady: 'local-steady', montage: 'local-montage' };
// The reference's opening shot lasts this long; its animation timings scale down for a shorter one (avOpeningTiming).
const AV_OPENING_REF_SECONDS = 5.60;
// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates. They score below any real hit and are only used by the last tier, after photos.
const AV_FILLER_STEP = 0.5;
const AV_FILLER_EDGE = 0.25;
const AV_FILLER_SCORE = -2;
// At most this many filler windows per source (a 24 s source has 48). A longer source gets 48 windows spread evenly over
// the same 0.5 s grid, first and last kept, so an hour-long clip does not flood the pool (and the panel's thread).
const AV_FILLER_MAX = 48;
// A video window ends at least this far before the end of its source. The plan's frames are at 30 fps; at the Draft's
// real rate (and music offset) a shot can be up to 1/30 + 1/fps s longer (about 0.075 s at 23.976), and Selects caps a
// source at its whole frames (up to one more frame shorter than its duration), so assemble.js may slide a window this
// far back to keep it inside its source.
const AV_SOURCE_TAIL = 0.15;
// A video window also starts at least this far into its source when the source is long enough: stock clips often
// fade in from black over their first frames (the Istanbul gallery's skyline clip is black for 0.4 s), and scene
// search hits at t = 0 would otherwise open a shot on black. Shorter sources may still start at 0.
const AV_SOURCE_HEAD = 0.5;
// Photos (Image resources) have no scene search. Each one fills at most one slot of any length up to the 5 s an
// image source lasts, less AV_SOURCE_TAIL (a slot grows by up to 1/30 + 1/fps s at the Draft's real rate, as for
// videos), so 4.85 s. About AV_PHOTO_SHARE of the slots that may hold a photo (the montage), evenly spread from a seeded
// offset, are photo slots where an unused photo comes first. Elsewhere photos rank after every real video hit and
// before fillers. Never more than AV_PHOTO_RUN_MAX photos play in a row (a hard rule) unless the pool has no video at
// all (avAllocate alone: avPlanBuild never plans without videos).
const AV_PHOTO_HOLD_MAX = 5;
const AV_PHOTO_RUN_MAX = 2;
const AV_PHOTO_SHARE = 1 / 3;
// Ranking a video window (avAllocate): score - AV_ROLE_STEP per role rank - AV_REPEAT_STEP per recent use of its source +
// a seeded jitter of up to AV_JITTER. The panel's motion bonus (av-hook AV_MOTION_BONUS, 0.2) plus the jitter stays below
// one role step, so a moving moment never outranks a better role match; a repeat costs more than one role step.
const AV_ROLE_STEP = 0.3;
const AV_REPEAT_STEP = 0.4;
const AV_JITTER = 0.05;
// A reused clip's new window should show another composition: at least this far (centre to centre) from each earlier
// window of the clip, or in the other half of the clip (avAllocate prefers such windows when it reuses a source).
const AV_REUSE_APART = 4;

// A beat grid is used only for a tempo in [AV_TEMPO_MIN, AV_TEMPO_MAX] whose detection was accepted (bundled cues
// always are).
function avGridUsable(opts) {
  const bpm = opts && opts.bpm;
  return !!(opts && opts.accepted) && typeof bpm === 'number' && isFinite(bpm) && bpm >= AV_TEMPO_MIN && bpm <= AV_TEMPO_MAX;
}

// The approximate tempo fixed timing runs on, or null. beat-detect.cjs reports an own track's grid as 'approximate' when
// it is tight (median residual <= 10 ms) and holds across the track but too few beats carry an onset to accept it. Its
// tempo (opts.approxBpm), in [AV_TEMPO_MIN, AV_TEMPO_MAX] and only without a usable grid (opts.gridded), sets the beat
// the template runs on, so the cuts do not drift against the music. Everything else stays gridless: cuts snap only to
// bass onsets (avSnapCuts lowConfidence).
function avApproxTempo(opts) {
  const bpm = opts && opts.approxBpm;
  return !(opts && opts.gridded) && typeof bpm === 'number' && isFinite(bpm) && bpm >= AV_TEMPO_MIN && bpm <= AV_TEMPO_MAX ? bpm : null;
}

// The tempo the template runs on. opts: { bpm, accepted, approxBpm? }. Returns { gridded (avGridUsable), approxBpm
// (avApproxTempo, null on a grid), tempo: the grid's bpm, else the approximate tempo, else AV_FALLBACK_BPM, and
// beatSeconds: 60 / tempo }.
function avTempo(opts) {
  const gridded = avGridUsable({ bpm: opts && opts.bpm, accepted: opts && opts.accepted });
  const approxBpm = avApproxTempo({ gridded, approxBpm: opts && opts.approxBpm });
  const tempo = gridded ? opts.bpm : approxBpm || AV_FALLBACK_BPM;
  return { gridded, approxBpm, tempo, beatSeconds: 60 / tempo };
}

// Beats per montage shot for a pace ('quick', else Cinematic) at a tempo (avTempo's).
function avMontageBeats(pace, bpm) {
  const slow = !(bpm > AV_SLOW_MAX_BPM);
  return pace === 'quick' ? (slow ? 1 : 2) : (slow ? 2 : 4);
}

// Beats of the final shot at a tempo.
function avFinalBeats(bpm) {
  return bpm > AV_SLOW_MAX_BPM ? 8 : 4;
}

// Montage shots a Length asks for: AV_LENGTHS (Standard when unknown), doubled for Quick.
function avMontageShots(length, pace) {
  const n = AV_LENGTHS[length] || AV_LENGTHS.standard;
  return pace === 'quick' ? 2 * n : n;
}

// The montage lengths (shots) a plan may try, longest first. opts: { requested, pace, bpm (avTempo's tempo) }. The
// steps keep the montage whole bars and the shot count stable across tempos: Cinematic shrinks by 2 shots, Quick by 4,
// both down to AV_MIN_MONTAGE (4) shots (Cinematic 16: 16, 14, ..., 4; Quick 32: 32, 28, ..., 4). A non-finite request
// counts as Standard; a request under 4 shots gives [4].
function avMontageLadder(opts) {
  const step = opts.pace === 'quick' ? 4 : 2, least = AV_MIN_MONTAGE;
  const asked = typeof opts.requested === 'number' && isFinite(opts.requested) ? opts.requested : avMontageShots('standard', opts.pace);
  const out = [];
  for (let n = Math.floor(asked / step) * step; n >= least; n -= step) out.push(n);
  if (out[out.length - 1] !== least) out.push(least);
  return out;
}

// The slot template. opts: { bpm (avTempo's tempo), pace, montageShots }. Returns { beatsList (beats per slot: 6, 2,
// M x N, F), roles, parts ('opening' | 'credit' | 'montage' | 'final' per slot), videoOnly (per slot: the opening,
// credit and final shots never take a photo), montageBeats: M, finalBeats: F, montageShots: N, montageStart: 8 (the
// montage's first beat), totalBeats }. Throws when the montage would not be whole bars.
function avTemplate(opts) {
  const m = avMontageBeats(opts.pace, opts.bpm), f = avFinalBeats(opts.bpm), n = opts.montageShots;
  if (!(n >= 1) || Math.floor(n) !== n || (n * m) % 4 !== 0) throw Error('avTemplate: the montage must be whole bars');
  const beatsList = [AV_INTRO_BEATS.opening, AV_INTRO_BEATS.credit], roles = ['opening', 'portrait'], parts = ['opening', 'credit'];
  for (let k = 0; k < n; k++) { beatsList.push(m); roles.push(AV_MONTAGE_ROLES[k % AV_MONTAGE_ROLES.length]); parts.push('montage'); }
  beatsList.push(f); roles.push('ending'); parts.push('final');
  const montageStart = AV_INTRO_BEATS.opening + AV_INTRO_BEATS.credit;
  return { beatsList, roles, parts, videoOnly: parts.map(p => p !== 'montage'), montageBeats: m, finalBeats: f, montageShots: n, montageStart,
    totalBeats: montageStart + n * m + f };
}

// Seconds of a video with N montage shots: opts { bpm (avTempo's tempo), pace, montageShots }.
function avVideoSeconds(opts) {
  return avTemplate(opts).totalBeats * 60 / opts.bpm;
}

// Music capacity: the longest montage (avMontageLadder) whose whole video fits between sectionStart and usableEnd, in
// montage shots (the 3 bookend shots are not counted), else 0 (not even AV_MIN_MONTAGE shots fit). opts: { requested, pace, bpm (avTempo's tempo), sectionStart?, usableEnd? (Infinity / omitted without
// music) }.
function avFitShots(opts) {
  const start = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const end = opts.usableEnd == null ? Infinity : opts.usableEnd;
  for (const n of avMontageLadder(opts)) {
    if (start + avVideoSeconds({ bpm: opts.bpm, pace: opts.pace, montageShots: n }) <= end + 1e-6) return n;
  }
  return 0;
}

// The opening animation's timings (spec 4) in seconds from the clip start: the reference's, scaled by
// k = min(1, openingSeconds / AV_OPENING_REF_SECONDS), so a faster cue compresses the animation instead of lengthening
// the intro. Letterbox reveal from revealStart to revealEnd (fully open at 2.35 s in the reference), kicker and tagline
// at textIn, decode from decodeStart, letterSeconds per title letter (9 letters end at 2.90 + 9 x 0.115 = 3.935 s, the
// reference's ~3.94 s). cutSeconds is the opening shot's length (the cut the title holds until, unscaled): the title
// fits its decode before it with a readable hold (decode-title.tsx avTiming).
function avOpeningTiming(openingSeconds) {
  const cutSeconds = Math.max(0, Number(openingSeconds) || 0);
  const k = Math.min(1, cutSeconds / AV_OPENING_REF_SECONDS);
  return { k, revealStart: 0.22 * k, revealEnd: 2.35 * k, textIn: 2.40 * k, decodeStart: 2.90 * k, letterSeconds: 0.115 * k, cutSeconds };
}

// Where the music's beats land on the timeline. Selects snaps the music's source start (sectionStart) to a timeline
// frame, so the music plays offset by delta = sectionStart - round(sectionStart * fps) / fps (at most half a frame);
// beat b of the section plays at b * 60 / bpm + delta. Without music there is no offset.
function avMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

// Onset-snapped cuts. The cuts stay on the grid; a cut moves onto a clearly strong music onset near it, and only when
// nothing already marks the grid position. Only a cut that starts a slot of at least one beat is snappable: with
// opts.beatsList a cut starting a slot under one beat stays on the grid (every template slot is >= 1 beat, so every
// inner cut qualifies, as without beatsList).
// Conservative rules (from CWV v2.6): a cut stays on the grid when a qualifying onset of any band lies within one frame
// of it; otherwise the candidate must reach AV_SNAP_MIN_RATIO of its band threshold, candidates rank by
// ratio - AV_SNAP_DISTANCE_COST * |offset| / window, and a low-band candidate must also beat the grid position's own
// onset (the strongest qualifying onset nearer the grid, else the band threshold, ratio 1) by AV_SNAP_LOW_MARGIN.
const AV_SNAP_WINDOW_BEATS = 0.10;          // search window: +/- this share of a beat ...
const AV_SNAP_WINDOW_MAX = 0.070;           // ... capped at this many seconds
const AV_SNAP_MIN_STRENGTH = 2;             // an onset's strength (over its band median) must reach max(this, band threshold)
const AV_SNAP_MIN_RATIO = 1.5;              // a snap target's strength over that threshold
const AV_SNAP_DISTANCE_COST = 0.5;          // score = ratio - this * |offset| / window: an onset at the window edge loses 0.5
const AV_SNAP_LOW_MARGIN = 0.25;            // a low-band target's ratio over the grid position's own onset ratio
const AV_SNAP_MIN_FRAMES = 4;               // no snap may leave a shot shorter than this (or than its grid length, if shorter)
const AV_SNAP_MIN_SHARE = 0.75;             // ... or shorter than this share of its grid length
// Music whose beat was not found reliably (fixed shot lengths): only bass onsets, within a fixed window.
const AV_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

// boundaries: the grid's cut times in seconds from the section start ([0, end of slot 0, ..., end of the last slot]).
// onsets: [[seconds in the music source, band 'l' | 'm' | 'h', strength], ...].
// opts: { bpm (null without a grid), fps, sectionStart (the music second at the section start; onsets are shifted by
// it), thresholds?: { l, m, h }, lowConfidence?: true for fixed timing (forced when bpm is not a number), beatsList?:
// slot lengths in beats }. The min-frames / min-share rule below keeps a short slot next to a snapped cut. Returns
// { cuts: seconds like boundaries, frames: the cuts at opts.fps with the music offset (same expression as avSchedule
// and assemble.js), log: one entry per inner cut, window }. A snapped cut sits exactly on its onset, so rounding it to
// a frame at any rate never puts it more than half a frame before the onset.
function avSnapCuts(boundaries, onsets, opts) {
  const fps = opts.fps, low = !!opts.lowConfidence || !(opts.bpm > 0);
  const offset = avMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const reach = low ? AV_SNAP_LOW_CONFIDENCE_WINDOW : Math.min(AV_SNAP_WINDOW_BEATS * 60 / opts.bpm, AV_SNAP_WINDOW_MAX);
  const bands = low ? ['l'] : ['l', 'm', 'h'];
  const thr = band => Math.max(AV_SNAP_MIN_STRENGTH, (opts.thresholds && opts.thresholds[band]) || 0);
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
      if (o.ratio < AV_SNAP_MIN_RATIO - 1e-9) continue;
      if (o.band === 'l') {
        // The grid position's own onset: the strongest qualifying onset nearer the grid (ratio 1 = the threshold when
        // there is none, since a weaker one would not be listed).
        const own = near.reduce((m, q) => (q.d < o.d - 1e-9 && q.ratio > m ? q.ratio : m), 1);
        if (o.ratio < own + AV_SNAP_LOW_MARGIN - 1e-9) { why = 'low onset not above the grid'; continue; }
      }
      const score = o.ratio - AV_SNAP_DISTANCE_COST * o.d / reach;
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && (o.d < best.d - 1e-9 || (Math.abs(o.d - best.d) <= 1e-9 && o.x < best.x)))) best = { ...o, score };
    }
    return best || { none: why };
  };
  // The first shot in [a, b] that a snap would make too short, or null.
  const tooShort = (next, a, b) => {
    for (let k = Math.max(0, a); k <= Math.min(n - 1, b); k++) {
      const frames = frameOf(next[k + 1]) - frameOf(next[k]), grid = frameOf(boundaries[k + 1]) - frameOf(boundaries[k]);
      if (frames < Math.min(AV_SNAP_MIN_FRAMES, grid)) return { slot: k, reason: 'min-frames' };
      if (next[k + 1] - next[k] < AV_SNAP_MIN_SHARE * (boundaries[k + 1] - boundaries[k]) - 1e-9) return { slot: k, reason: 'min-share' };
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

// opts: { bpm (null without a usable grid), fps, beatsList: per-slot lengths in beats (avTemplate's; without a grid
// shotSeconds is the seconds per beat), roles?, parts? (per slot, avTemplate's), shotSeconds? (needed when bpm is
// null), sectionStart?: seconds into the music (omit without music), onsets?, onsetThresholds?, lowConfidence?
// (avSnapCuts; used only with a sectionStart), cuts?: cut seconds decided earlier (a schedule's `cuts`, reused as they
// are, e.g. to rebuild at the Draft's real fps) }. Without beatsList, `shots` slots of `beatsPerShot` beats each (or
// shotSeconds each without a grid). Slots carry their role (opts.roles, else the montage cycle), their grid beat span
// (startBeat, endBeat; null without a grid) and frames, with beatsList also `beats` (the slot's length in beats) and
// with parts `part`; `offset` is the music offset every boundary is shifted by; `cuts` are the boundaries in seconds
// from the section start (the grid, or the snapped cuts) and `snapLog` explains each inner cut. With beatsList the
// result also carries `beatsList`.
function avSchedule(opts) {
  const list = Array.isArray(opts.beatsList) ? opts.beatsList : null;
  const fps = opts.fps, n = list ? list.length : opts.shots, gridded = opts.bpm > 0;
  if (!(fps > 0) || !(n >= 1)) throw Error('avSchedule needs fps and shots');
  if (list && !list.every(b => typeof b === 'number' && b > 0 && isFinite(b))) throw Error('avSchedule: beatsList needs positive beat lengths');
  const roles = Array.isArray(opts.roles) ? opts.roles : null, parts = Array.isArray(opts.parts) ? opts.parts : null;
  if ((roles && roles.length !== n) || (parts && parts.length !== n)) throw Error('avSchedule: roles and parts need one entry per slot');
  const bps = gridded ? (list ? 1 : opts.beatsPerShot) : null;
  if (gridded && !(bps > 0)) throw Error('avSchedule needs beatsPerShot');
  const shotSeconds = gridded ? bps * 60 / opts.bpm : opts.shotSeconds;
  if (!(shotSeconds > 0)) throw Error('avSchedule needs bpm or shotSeconds');
  // Slot k starts `at[k]` units (beats, or fixed shots / beats without a grid) in; sums of whole beats are exact.
  const at = [0];
  for (let k = 0; k < n; k++) at.push(at[k] + (list ? list[k] : 1));
  // Every boundary is an absolute position (k shots in), shifted by the music offset and snapped once to a frame;
  // durations never accumulate rounding. The video always starts at frame 0. assemble.js uses the same expression.
  const offset = avMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const grid = [];
  for (let k = 0; k <= n; k++) grid.push(gridded ? at[k] * bps * (60 / opts.bpm) : at[k] * shotSeconds);
  let cuts = grid, snapLog = [];
  if (Array.isArray(opts.cuts)) {
    if (opts.cuts.length !== grid.length) throw Error('avSchedule: cuts do not match the slots');
    cuts = opts.cuts.slice();
  } else if (opts.onsets && opts.onsets.length && typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart)) {
    const snapped = avSnapCuts(grid, opts.onsets,
      { bpm: gridded ? opts.bpm : null, fps, sectionStart: opts.sectionStart, thresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence || !gridded, beatsList: list || undefined });
    cuts = snapped.cuts; snapLog = snapped.log;
  }
  const slots = [];
  for (let i = 0; i < n; i++) {
    slots.push({
      index: i,
      role: roles ? roles[i] : AV_MONTAGE_ROLES[i % AV_MONTAGE_ROLES.length],
      startBeat: gridded ? at[i] * bps : null,
      endBeat: gridded ? at[i + 1] * bps : null,
      startFrame: frameOf(cuts[i]),
      endFrame: frameOf(cuts[i + 1]),
      ...(list ? { beats: list[i] } : {}),
      ...(parts ? { part: parts[i] } : {}),
    });
  }
  return { offset, cuts, snapLog, slots, totalFrames: slots[n - 1].endFrame, gridded, ...(list ? { beatsList: list.slice() } : {}) };
}

// Music section start: snapped to whole bars from firstBeat on an accepted grid (to 0.1 s otherwise), clamped so a
// video of videoSeconds fits before usableEnd; null when it cannot fit.
function avSnapSection(opts) {
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
function avDefaultSection(opts) {
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

// Default music section of a bundled cue (spec 7): the manifest's introStart, a bar start about 8 beats before the
// drums arrive, so the opening and credit play over the soft intro and the montage starts with the groove; used when
// the video of videoSeconds fits from there before usableEnd. Otherwise (no introStart, own music, a video too long)
// avDefaultSection's most energetic window, or null when nothing fits. opts: { introStart?, firstBeat, bpm, usableEnd,
// videoSeconds, beatEnergy?, downbeatHigh? }.
function avIntroSection(opts) {
  const at = opts.introStart;
  if (typeof at === 'number' && isFinite(at) && at >= 0 && at + opts.videoSeconds <= opts.usableEnd + 1e-6) return at;
  if (!(opts.bpm > 0)) return null;
  return avDefaultSection({ ...opts, beatEnergy: Array.isArray(opts.beatEnergy) ? opts.beatEnergy : [] });
}

function avHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Filler candidates every AV_FILLER_STEP seconds on each source that appears in the candidates, sorted by rid then time;
// at most AV_FILLER_MAX per source (an even subset of that grid, keeping both edge windows).
function avFillers(candidates) {
  const dur = {};
  for (const c of candidates) {
    if (!c || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    // Grid points AV_FILLER_EDGE + k * AV_FILLER_STEP with k = 0 .. count - 1 that stay AV_FILLER_EDGE from the end.
    const count = Math.max(0, Math.floor((dur[rid] - 2 * AV_FILLER_EDGE + 1e-9) / AV_FILLER_STEP) + 1);
    const take = Math.min(count, AV_FILLER_MAX);
    let last = -1;
    for (let i = 0; i < take; i++) {
      const k = take === count ? i : Math.round(i * (count - 1) / (take - 1));
      if (k === last) continue;
      last = k;
      out.push({ rid, role: 'filler', t: AV_FILLER_EDGE + k * AV_FILLER_STEP, score: AV_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// Strict allocation. opts: { candidates, slots: [{ index, role, seconds, videoOnly?, part? }], seed, gapSeconds = 0.5,
// photoShare = AV_PHOTO_SHARE, spread = true, motionOpener = true, finalEarly = true, sizes? (rid -> { width, height },
// an unknown size counts as landscape) }. A videoOnly slot (the opening, credit and final shots) never takes a photo, and the photo share counts only the other slots (the montage). Two hard rules, never
// relaxed: the previous slot's source is never used again for the next slot, and at most AV_PHOTO_RUN_MAX photos play
// in a row (unless the pool has no video candidate). A slot nothing fits under them stays null (counted in `missing`);
// avPlanBuild then tries a shorter montage.
// Motion opener: a video candidate with `motion` > 0 (tagged by the panel's motion bonus) marks a moving moment. The
// first slot (the opening shot) takes the best such window that fits it whole (the usual role rank, score and jitter; a
// role outside the slot's roles ranks after them), ahead of the normal tiers; a tagged clip shorter than the slot plus
// AV_SOURCE_TAIL cannot. If the opener is not videoOnly it is also left out of the photo slots, so the photo share
// moves to the others. Without tagged candidates, with none that fits, or with motionOpener: false the allocation is
// exactly as without this rule.
// Soft preferences, never a reason to leave a slot empty: the opening shot takes a landscape window over a portrait one
// of the same or a worse role rank; with spread, a montage slot (part 'montage', or not videoOnly) takes the opening's
// and the credit's sources only when no other source fits at any use count, and a reused source first offers windows
// AV_REUSE_APART s from its earlier ones (or in the source's other half), then any window.
function avAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const finite = v => typeof v === 'number' && isFinite(v);
  const candidates = opts.candidates.filter(c => c && c.kind !== 'photo' && finite(c.t) && finite(c.score) && finite(c.sourceDuration));
  // One photo candidate per rid, in rid order so the result never depends on input order.
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  const used = {}, uses = {}, recent = [], photoUsed = {};
  // Variety first (default): a slot takes an unused resource whenever one fits before reusing any, and reuse goes to
  // the least-used resource. spread: false ranks by role and score only (the fallback avPlanBuild tries before it
  // shrinks, since spending every fresh clip first can strand a length that a reuse-tolerant order fills).
  const spread = opts.spread !== false;
  const pool = candidates.filter(c => c.sourceDuration > 0);
  // Each candidate's seeded tie-break jitter, hashed once per call rather than per slot, tier and use count.
  const jitter = pool.map(c => avHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * AV_JITTER);
  // Photo-only pools (no usable video) may play any number of photos in a row.
  const runLimited = pool.length > 0;
  let missing = 0, fillerShots = 0, photoShots = 0;
  // Source sizes (opts.sizes: rid -> { width, height }); an unknown size counts as landscape.
  const sizes = opts.sizes || {};
  const landscape = c => { const z = sizes[c.rid]; return !(z && z.width > 0 && z.height > 0 && z.height >= z.width); };
  // The motion opener (see above). Nothing is used yet, so this is the pick the first slot's loop turn would make with
  // the motion rank.
  const first = opts.slots[0];
  // A slot's rank of a candidate by role: its place in the slot's roles, 0 for a local window of the slot's kind
  // (AV_LOCAL_ROLES), else -1.
  const localRole = slot => AV_LOCAL_ROLES[(slot.part ? slot.part === 'montage' : !slot.videoOnly) ? 'montage' : 'steady'];
  const roleRank = (slot, roles, c) => (c.role === localRole(slot) ? 0 : roles.indexOf(c.role));
  const opener = first && opts.motionOpener !== false && pool.some(c => c.motion > 0) ? searchVideo(first, c => {
    if (!(c.motion > 0) || c.role === 'filler') return -1;
    const roles = [first.role].concat(AV_ROLE_FALLBACK[first.role] || []), r = roleRank(first, roles, c);
    return r >= 0 ? r : roles.length;
  }, null, null) : null;
  // Photo slots: round(share x slots) of the slots a photo can hold (not the motion opener's), capped by the photos
  // available, spaced evenly from a seeded phase. With no photos there are none, and every slot goes to video.
  const photoSlots = {};
  const phase = avHash(opts.seed + ':photo-slots');
  const holdable = opts.slots.filter(sl => !sl.videoOnly && sl.seconds + AV_SOURCE_TAIL <= AV_PHOTO_HOLD_MAX + 1e-9 && !(opener && sl === first));
  const share = opts.photoShare == null ? AV_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(opts.slots.filter(sl => !sl.videoOnly).length * share));
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;
  // Best fitting video candidate for a slot. rankOf returns the candidate's rank in this tier, or -1 to skip it.
  // `exclude` lists the neighbouring shots' sources, which may not be used; `level`, when not null, keeps only sources
  // used exactly that many times.
  function searchVideo(slot, rankOf, exclude, level, accept) {
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      if (exclude && exclude.indexOf(c.rid) >= 0) continue;
      if (level != null && (uses[c.rid] || 0) !== level) continue;
      const rank = rankOf(c);
      if (rank < 0 || c.sourceDuration < slot.seconds + AV_SOURCE_TAIL) continue;
      const head = c.sourceDuration >= slot.seconds + AV_SOURCE_TAIL + AV_SOURCE_HEAD ? AV_SOURCE_HEAD : 0;
      const start = Math.max(head, Math.min(c.sourceDuration - AV_SOURCE_TAIL - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      if (accept && !accept(c, start, end)) continue;
      const value = c.score - rank * AV_ROLE_STEP - repeats * AV_REPEAT_STEP + jitter[i];
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end, rank };
    }
    // The opening shot prefers a landscape source (less of it is cropped away, and its letterbox opens on more of the
    // picture): a portrait pick gives way to the best landscape window of the same or a better role rank, if any.
    if (best && slot === first && !landscape(best.c)) {
      const rankAt = best.rank;
      const wide = searchVideo(slot, c => (landscape(c) && rankOf(c) >= 0 && rankOf(c) <= rankAt ? rankOf(c) : -1), exclude, level, accept);
      if (wide) return wide;
    }
    return best;
  }
  // A reused window far enough from the clip's earlier windows (AV_REUSE_APART, or the clip's other half).
  function apart(c, start, end) {
    const mid = (start + end) / 2, half = c.sourceDuration / 2;
    return (used[c.rid] || []).every(([a, b]) => Math.abs(mid - (a + b) / 2) >= AV_REUSE_APART - 1e-9 || (mid < half) !== ((a + b) / 2 < half));
  }
  // An unused photo for the slot, chosen by a seeded hash so another seed picks other photos. A photo is never a
  // neighbour's source, since each photo is used once.
  function searchPhoto(slot) {
    if (slot.videoOnly || slot.seconds + AV_SOURCE_TAIL > AV_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const c of photos) {
      if (photoUsed[c.rid]) continue;
      const value = avHash(opts.seed + ':photo:' + c.rid);
      if (!best || value > best.value + 1e-12) best = { value, c, photo: true };
    }
    return best;
  }
  // Fill order: the timeline, except that a video-only last slot (the held final shot) is filled right after the
  // first (unless finalEarly: false), so the montage cannot spend every window long enough for it. Each slot excludes
  // the sources of its already filled neighbours on both sides.
  const n = opts.slots.length, order = opts.slots.map((sl, i) => i);
  const early = opts.finalEarly !== false && n > 2 && !!opts.slots[n - 1].videoOnly;
  if (early) { order.pop(); order.splice(1, 0, n - 1); }
  const picks = Array(n).fill(null);
  // Photos in a row right before position i (picks after it are not filled yet, except a video-only last slot).
  const runBefore = i => { let k = 0; while (i - 1 - k >= 0 && picks[i - 1 - k] && picks[i - 1 - k].kind === 'photo') k++; return k; };
  for (const pos of order) {
    const slot = opts.slots[pos];
    const roles = [slot.role].concat(AV_ROLE_FALLBACK[slot.role] || []);
    const exclude = [pos - 1, pos + 1].filter(i => picks[i]).map(i => picks[i].rid);
    const photo = () => searchPhoto(slot);
    const preferred = (level, accept) => () => searchVideo(slot, c => roleRank(slot, roles, c), exclude, level, accept);
    const anyReal = (level, accept) => () => searchVideo(slot, c => (c.role === 'filler' ? -1 : 0), exclude, level, accept);
    const filler = (level, accept) => () => searchVideo(slot, c => (c.role === 'filler' ? 0 : -1), exclude, level, accept);
    // Reuse preferences (spread only, sources already used): a montage shot leaves the opening's and the credit's
    // sources alone while another source fits, and a reused source shows a window apart from its earlier ones.
    const montage = slot.part ? slot.part === 'montage' : !slot.videoOnly;
    const bookends = montage ? [0, 1].filter(i => i !== pos && picks[i] && picks[i].kind !== 'photo').map(i => picks[i].rid) : [];
    const notBookend = c => bookends.indexOf(c.rid) < 0;
    // Tiers, best first. A photo slot puts an unused photo first. With spread (the default) the video tiers run once
    // per use count, fewest first: preferred-role hits (and local windows of the slot's kind), any-role hits, then fillers of sources used that often, so
    // role and score only rank sources used equally often and an unused clip (even by a filler) beats any reuse.
    // Outside photo slots a photo is then the last resort, which keeps the photo share. Without spread the CWV order
    // applies: preferred, any-role, photo, filler. After AV_PHOTO_RUN_MAX photos in a row the photo tier is skipped.
    const runFull = runLimited && runBefore(pos) >= AV_PHOTO_RUN_MAX;
    const tiers = photoSlots[slot.index] ? [photo] : [];
    if (spread) {
      const levels = Array.from(new Set(pool.map(c => uses[c.rid] || 0))).sort((x, y) => Number(x) - Number(y));
      // Per use count (fewest first): windows apart from the source's earlier ones, then any. The bookends' sources join
      // only once no other source fits at any count (unused sources always come first: they are never bookends).
      const byLevel = accept => level => (level > 0 ? [preferred(level, (c, a, z) => accept(c) && apart(c, a, z)), anyReal(level, (c, a, z) => accept(c) && apart(c, a, z)),
        filler(level, (c, a, z) => accept(c) && apart(c, a, z))] : []).concat([preferred(level, accept), anyReal(level, accept), filler(level, accept)]);
      if (bookends.length) for (const level of levels) tiers.push(...byLevel(notBookend)(level));
      for (const level of levels) tiers.push(...byLevel(() => true)(level));
      tiers.push(photo);
    } else {
      tiers.push(preferred(null), anyReal(null), photo, filler(null));
    }
    let best = slot === first ? opener : null;
    if (!best) {
      for (const tier of tiers) {
        if (runFull && tier === photo) continue;
        if ((best = tier())) break;
      }
    }
    if (!best) { missing++; continue; }
    // Recent sources (a repeat penalty) follow the timeline, so the out-of-order final shot does not count.
    if (!(early && pos === n - 1)) { recent.push(best.c.rid); if (recent.length > 3) recent.shift(); }
    if (best.photo) {
      photoUsed[best.c.rid] = true;
      photoShots++;
      picks[pos] = { slot: slot.index, rid: best.c.rid, kind: 'photo', holdSeconds: slot.seconds };
      continue;
    }
    (used[best.c.rid] = used[best.c.rid] || []).push([best.start, best.end]);
    uses[best.c.rid] = (uses[best.c.rid] || 0) + 1;
    if (best.c.role === 'filler') fillerShots++;
    // sourceDuration lets assemble.js keep the window inside its source at the Draft's real rate.
    picks[pos] = { slot: slot.index, rid: best.c.rid, kind: 'video', startSeconds: best.start, endSeconds: best.end, sourceDuration: best.c.sourceDuration };
  }
  return { picks, missing, filled: picks.filter(Boolean).length, fillerShots, photoShots };
}

// The whole plan. opts: { candidates (video hits and { rid, kind: 'photo' }), bpm (null without music), accepted,
// approxBpm? (avApproxTempo), fps, pace: 'cinematic' (default) | 'quick', requested (montage shots, avMontageShots),
// sectionStart?, usableEnd? (Infinity / omitted without music), onsets?, onsetThresholds?, lowConfidence?, seed,
// photoShare?, motionOpener?, sizes? (avAllocate) }. There is no credit option: Credit off only drops the credit graphic, the
// 2-beat credit shot stays, so the plan never depends on it.
// Eligibility (spec 3): the opening, credit and final shots (the 3 bookends) are video only; photos only fill montage
// shots. Every shot count here is montage shots: `shots`, `requested`, `musicShots` and `usableShots` exclude the 3
// bookends (`slots` = shots + 3 counts them).
// Preflight, before any allocation, in this order. Each failure is { ok: false, reason, usableShots: 0, usableSlots: 0,
// notes: [], ...vars } with the vars the panel's message needs:
// - 'no-video': no usable video at all (photos alone cannot fill the bookends).
// - 'one-video': a single video source. The opening and credit shots are adjacent video-only shots and the previous
//   shot's source is never used again, so they need 2 distinct videos (photos cannot help).
// - 'opening-too-short': no video source is long enough for the opening shot (6 beats) at this tempo. vars:
//   neededSeconds (the source length the shot needs: its length at opts.fps + AV_SOURCE_TAIL, as avAllocate checks
//   it), shotSeconds (the shot's length), longestSeconds (the longest video source).
// - 'ending-too-short': the same for the final shot (4 beats, 8 above 110 bpm).
// - 'music-too-short': the music section cannot hold the intro, AV_MIN_MONTAGE montage shots and the final shot.
//   vars: neededSeconds (that video's length), availableSeconds (usableEnd - sectionStart).
// The bookend lengths come from the longest montage the music fits (the shortest one when nothing fits), on the plan
// rate opts.fps.
// Then the music caps the montage (avFitShots), and the plan tries that montage and shrinks it down the ladder
// (avMontageLadder: whole bars, AV_MIN_MONTAGE shots at least) until the strict allocation fills every slot; the
// bookends are never dropped. Every attempt allocates from scratch with filler candidates added (see `attempts` below).
// When even the shortest plan cannot be filled: 'too-few', with usableShots (montage slots the shortest plan filled)
// and usableSlots (all slots it filled).
// A plan returns { ok: true, schedule (its slots carry role, part and beats), picks, shots: montage shots, requested:
// the montage asked for (the ladder's top), musicShots: the montage the music fits (avFitShots), slots: all slots,
// fittedByMusic, pace, montageBeats, finalBeats, tempo, beatSeconds, gridded, approxBpm (the approximate tempo the
// fixed timing used, else null), fillerShots, photoShots, attempt, notes ([], kept for the panel) }.
function avPlanBuild(opts) {
  const pace = opts.pace === 'quick' ? 'quick' : 'cinematic';
  // The tempo the template follows: the grid's, else an approximate one, else AV_FALLBACK_BPM (fixed timing).
  const { gridded, approxBpm, tempo, beatSeconds } = avTempo(opts);
  const ladder = avMontageLadder({ requested: opts.requested, pace, bpm: tempo });
  const requested = ladder[0], least = ladder[ladder.length - 1];
  const top = avFitShots({ requested, pace, bpm: tempo, sectionStart: opts.sectionStart, usableEnd: opts.usableEnd });
  const fail = (reason, vars = {}) => ({ ok: false, reason, usableShots: 0, usableSlots: 0, notes: [], ...vars });
  // Distinct sources the allocator can use: valid videos (as avAllocate filters them) and photos.
  const finite = v => typeof v === 'number' && isFinite(v);
  const videos = {};
  let hasPhotos = false;
  for (const c of opts.candidates) {
    if (!c || typeof c.rid !== 'string') continue;
    if (c.kind === 'photo') hasPhotos = true;
    else if (finite(c.t) && finite(c.score) && finite(c.sourceDuration) && c.sourceDuration > 0) videos[c.rid] = Math.max(videos[c.rid] || 0, c.sourceDuration);
  }
  const videoRids = Object.keys(videos);
  if (!videoRids.length) return fail('no-video');
  if (videoRids.length < 2) return fail('one-video');
  const snapOpts = { sectionStart: opts.sectionStart, onsets: opts.onsets, onsetThresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence };
  const scheduleOf = tpl => avSchedule({ bpm: gridded ? opts.bpm : null, fps: opts.fps, beatsList: tpl.beatsList, roles: tpl.roles, parts: tpl.parts, shotSeconds: beatSeconds, ...snapOpts });
  // Bookend preflight: a video source must hold the opening and the final shot whole (avAllocate's own test).
  {
    const sch = scheduleOf(avTemplate({ bpm: tempo, pace, montageShots: top || least }));
    const longest = Math.max(...videoRids.map(r => videos[r]));
    const check = (reason, slot) => {
      const shotSeconds = (slot.endFrame - slot.startFrame) / opts.fps;
      return longest < shotSeconds + AV_SOURCE_TAIL ? fail(reason, { neededSeconds: shotSeconds + AV_SOURCE_TAIL, shotSeconds, longestSeconds: longest }) : null;
    };
    const bad = check('opening-too-short', sch.slots[0]) || check('ending-too-short', sch.slots[sch.slots.length - 1]);
    if (bad) return bad;
  }
  if (top === 0) {
    const start = finite(opts.sectionStart) ? opts.sectionStart : 0;
    return fail('music-too-short', { neededSeconds: avVideoSeconds({ bpm: tempo, pace, montageShots: least }), availableSeconds: Math.max(0, opts.usableEnd - start) });
  }
  const notes = [];
  const candidates = opts.candidates.concat(avFillers(opts.candidates));
  // Share attempts per length. The greedy allocator spends a scarce video window after every photo outside the photo
  // slots, which can strand photos behind the run limit although the length is fillable (P P a P P b P P). So before a
  // length is given up it is retried with every slot a photo slot (photos first, a video only after two photos), which
  // spends video windows only where the run limit needs them.
  const shares = [opts.photoShare == null ? AV_PHOTO_SHARE : opts.photoShare];
  if (hasPhotos && shares[0] !== 1) shares.push(1);
  // Variety first; spending every fresh clip early can also strand a fillable length (a s s s ... where a s a s ...
  // fits), so a length is only given up after the role-and-score order (spread: false) fails too.
  // Filling the final shot early keeps a long window for it, but it can break the strict alternation a pool of few
  // sources needs (with two sources, a b a b ... decides the last slot's source), so each order is also tried with the
  // slots filled in timeline order ('-in-order').
  // Each attempt's name ('spread', 'spread-in-order', 'spread-share1', ..., 'role-first', 'role-first-share1', ..., each
  // with '-no-opener' when the motion opener's retry built it) is returned as `attempt`, so the panel and logs can tell
  // when a fallback built the plan.
  const attempts = [true, false].flatMap(spread => shares.flatMap((photoShare, i) => [true, false].map(finalEarly =>
    ({ spread, photoShare, finalEarly, name: (spread ? 'spread' : 'role-first') + (i ? '-share1' : '') + (finalEarly ? '' : '-in-order') }))));
  let usableShots = 0, usableSlots = 0;
  // Whether avAllocate's motion opener can apply (some video candidate carries motion).
  const motionTagged = opts.motionOpener !== false && candidates.some(c => c && c.kind !== 'photo' && c.motion > 0);
  // The shortest plan's fill, for the failure report.
  const tally = (alloc, tpl) => {
    usableSlots = Math.max(usableSlots, alloc.filled);
    usableShots = Math.max(usableShots, alloc.picks.filter((p, i) => p && tpl.parts[i] === 'montage').length);
  };
  for (const n of ladder) {
    if (n > top) continue;
    const tpl = avTemplate({ bpm: tempo, pace, montageShots: n });
    const schedule = scheduleOf(tpl);
    const slots = schedule.slots.map((s, i) => ({ index: s.index, role: s.role, part: tpl.parts[i], seconds: (s.endFrame - s.startFrame) / opts.fps, videoOnly: tpl.videoOnly[i] }));
    for (const attempt of attempts) {
      let alloc = avAllocate({ candidates, slots, seed: opts.seed, photoShare: attempt.photoShare, spread: attempt.spread, finalEarly: attempt.finalEarly, motionOpener: opts.motionOpener, sizes: opts.sizes });
      let name = attempt.name;
      // The motion opener never costs length: an attempt it leaves short is retried without it (named
      // '<attempt>-no-opener') before the next attempt or a shorter montage. Untagged pools never retry.
      if (alloc.missing > 0 && motionTagged) {
        if (n === least) tally(alloc, tpl);
        alloc = avAllocate({ candidates, slots, seed: opts.seed, photoShare: attempt.photoShare, spread: attempt.spread, finalEarly: attempt.finalEarly, motionOpener: false, sizes: opts.sizes });
        name = attempt.name + '-no-opener';
      }
      if (alloc.missing === 0) {
        return { ok: true, schedule, picks: alloc.picks, shots: n, requested, musicShots: top, slots: slots.length, fittedByMusic: top < requested, pace,
          montageBeats: tpl.montageBeats, finalBeats: tpl.finalBeats, tempo, beatSeconds, gridded, approxBpm,
          fillerShots: alloc.fillerShots, photoShots: alloc.photoShots, attempt: name, notes };
      }
      if (n === least) tally(alloc, tpl);
    }
  }
  return { ok: false, reason: 'too-few', usableShots, usableSlots, notes };
}

// Photo motions, in pick order: every photo pick gets one; videos and empty picks get null.
// Deterministic per seed; never the same motion twice in a row, never the same family (drift, tilt, ...) twice in a row;
// drift, tilt and push-drift directions alternate. Drift follows the photo: vertical for portrait, horizontal otherwise.
// Each entry is { motion, direction: 1 | -1, axis: 'x' | 'y' } for assets/photo-motion.tsx.
// `sizes` maps rid -> { width, height }; an unknown size counts as landscape.
const AV_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const AV_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
function avPhotoMotions(picks, seed, sizes) {
  const out = [];
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  for (const pick of picks) {
    if (!pick || pick.kind !== 'photo') { out.push(null); continue; }
    const size = sizes && sizes[pick.rid];
    const portrait = !!(size && size.height > size.width);
    const families = AV_MOTION_FAMILIES.filter(f => f !== lastFamily)
      .map(f => ({ f, v: avHash(seed + ':motion:' + k + ':' + f) }))
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

// Build steps shown in the panel's progress bar, with each step's share of the bar in percent. The panel names each
// step in the UI language (STRINGS `step.<id>`).
const AV_BUILD_STEPS = [
  { id: 'shots', weight: 40 },
  { id: 'music', weight: 10 },
  { id: 'draft', weight: 25 },
  { id: 'look', weight: 20 },
  { id: 'open', weight: 5 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function avProgress(stepId, fraction) {
  const i = AV_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = AV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = AV_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + AV_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  return { id: stepId, value, percent, current: i };
}
