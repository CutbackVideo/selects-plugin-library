// @name Mini Vlog
// @name:de Mini-Vlog
// @name:en Mini Vlog
// @name:es Mini vlog
// @name:fr Mini vlog
// @name:it Mini vlog
// @name:ja ミニ Vlog
// @name:ko Mini Vlog
// @name:pt Mini vlog
// @name:tr Mini Vlog
// @name:zh 迷你 Vlog
// @icon sparkles
// Builds a beat-cut 16:9 mini vlog with one static title lockup and a soft look as a new, editable Draft.
import React from "react";

const PLUGIN_ID = "mini-vlog";
const PLUGIN_VERSION = "0.1.0-alpha.1";
const SKILLS_DIR = "$SELECTS_USER_SKILLS_ROOT/" + PLUGIN_ID;
const DATA_DIR = "$HOME/.selects/plugin-data/" + PLUGIN_ID;
// The Draft's canvas. assemble.js sets the same size; the preview and the photo cover scale use it.
const MV_W = 1920, MV_H = 1080;
// One scene-search query per shot role (planner MV_ROLES). With Beat punch on, the search also runs the motion query
// (MV_MOTION_QUERY, mvSearchQueries in the mv-hook block).
const MV_QUERIES = {
  drink: "a coffee, matcha or drink in a cup held in hand or on a table",
  street: "a sunny city street with buildings and blue sky",
  food: "a plate of food, dessert or pastry on a table, seen from above",
  park: "green grass or trees in a park on a sunny day",
  book: "an open book or magazine on a lap or table",
  transit: "inside a subway or train, or a train passing by",
  flowers: "flowers, a bouquet or a flower shop close up",
  cafe: "a cozy cafe interior or a window seat with daylight",
};
// Clips per scene-search call: eight queries each (nine with Beat punch), so three clips (24 or 27 searches) stay inside
// run_script's 30 s deadline (search.js stops starting new searches after 22 s and reports the rest as failed, retried
// by the next Build).
const SEARCH_BATCH = 3;
// Ambient clip sound: the clips' own sound sits this far under the music, which stays at 0 dB.
const AMBIENT_DB = -18;
// Default track until the new bedroom-pop cue ships; the preferred cue replaces it once the manifest has it.
const DEFAULT_CUE = "weekend-indie-pop";
const PREFERRED_CUE = "bedroom-pop-108";
// The title preset selected when the panel opens (A small glimpse); Mini vlog and A day in my life stay selectable.
const DEFAULT_PRESET = "small-glimpse";
const DEFAULT_LENGTH = "standard";
const DEFAULT_PACE = "quick";
// Hook B defaults after the A/B (spec 15.4): Beat punch (with the motion query and bonus) and Start at the hook are on.
const DEFAULT_PUNCH = true;
const DEFAULT_HOOK = true;
// Soft look strength, and photo motion at half of CWV's strength (mild).
const SOFT_STRENGTH = 0.35;
const MOTION_STRENGTH = 0.5;
// Beat punch (spec 15.2 b/c): the Adjust "Punch" default (1 = a 1.06 punch) and the push-in amount for a clip without
// a punch (1 = 1.03).
const PUNCH_STRENGTH = 1;
const PUNCH_PUSH = 1;
// The title's Adjust defaults; the panel preview draws with the same values.
const TITLE_LOOK = { shadow: 0.35, size: 100, x: 49, y: 52, sparkles: true };
const MOTION_OPTIONS = [
  { label: "Push in", value: "push-in" }, { label: "Pull out", value: "pull-out" },
  { label: "Drift left", value: "drift-left" }, { label: "Drift right", value: "drift-right" },
  { label: "Drift up", value: "drift-up" }, { label: "Drift down", value: "drift-down" },
  { label: "Tilt", value: "tilt" }, { label: "Push and drift", value: "push-drift" },
];
// Music without onsets (No music, or a track that could not be analysed): the cuts stay on the grid.
const NO_ONSETS: any[] = [];
// A busy app (renderer near 100 % CPU) can take most of run_script's 30 s deadline before a script even starts.
// Read-only calls ask for READ_TIMEOUT_SECONDS (hosts that do not take the option keep their own deadline) and retry a
// host-busy or deadline failure after each BUSY_BACKOFF_MS pause, one attempt at a time. Commit calls do neither: a
// commit is never resent (spec 14.6).
const READ_TIMEOUT_SECONDS = 90;
const BUSY_BACKOFF_MS = [5000, 15000];
// Photo measuring inside the inventory call; a retry after a busy failure skips it (assemble measures unsized photos).
const INVENTORY_MEASURE_MS = 4000;
const MV_BUSY = "Selects is busy and didn't answer in time. Wait a moment and press Refresh. If it keeps happening, restart Selects.";
// A Project still loading (right after an app restart) can fail the first inventory read outright. That first read
// is tried once more after INVENTORY_RETRY_MS (read-only; a busy failure already waited through its backoff).
const INVENTORY_RETRY_MS = 2000;
const MV_INV_FAILED = "Couldn't read this Project's clips yet. Press Refresh.";
// A partial inventory (`incomplete`: some clip sizes unknown) holds Build, since a clip without a size is placed
// uncropped. It is re-read with the 10 s poll, at most INCOMPLETE_POLL_MAX times in a row (about a minute); then
// polling stops until Refresh starts the cycle again.
const INCOMPLETE_POLL_MAX = 6;
const MV_SIZES_LOADING = "Clip sizes are still loading…";
const MV_INV_PARTIAL = "Couldn't read all clips yet. Press Refresh.";
// A lost assemble reply is recovered by reading at most this many of the Project's most recent Drafts.
const DRAFT_LOOKUP_MAX = 50;
const LENGTH_LABELS: Record<string, string> = { short: "Short", standard: "Standard", long: "Long" };

// mv-planner:start
// Mini Vlog planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
// One hard cut per shot on the music's beat grid: Quick = 1 beat per shot, Relaxed = 2 (with a tempo guard), Groove =
// a 4-bar phrase rhythm (2, 1, 1, ..., and the phrase's last beat split into two 8ths on a drum fill). Shot roles cycle
// through MV_ROLES; there is no title burst and no montage section (the title spans the whole video).
// Without a usable grid (tempo outside 70-160 bpm, own music not accepted, or No music) shots have a fixed length: the
// beat of an approximate tempo (mvApproxTempo) when own music has one, else MV_FALLBACK_SHOT.
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
// - 8th shots are video only. A span is whole bars and at least MV_GROOVE_MIN_BEATS (one bar: 2, 1, 1/2, 1/2 = 4
//   shots, MV_MIN_SHOTS). Without a grid the pattern runs
//   on MV_GROOVE_FALLBACK_BEAT-second beats (2 x 0.55, 0.55 ..., 2 x 0.275) with every candidate split.
// - Opener guard: when a 2-beat hold would last longer than MV_GROOVE_OPENER_MAX seconds (below 85.71 bpm) every hold
//   is 1 beat, so no shot outruns Relaxed's cap.
const MV_GROOVE_PHRASE_BEATS = 16;
const MV_GROOVE_FILL_RATIO = 1.5;
const MV_GROOVE_FALLBACK_BEAT = 0.55;
const MV_GROOVE_MIN_BEATS = 4;
const MV_GROOVE_OPENER_MAX = 1.40;
// An onset counts for the beat it sits in, from this many seconds (one frame at 30 fps) before the beat: manifest and
// detector onsets land a hair early (about 1 ms on the bundled cues). A fixed time, not a share of the beat, so a slow
// tempo does not pull an 8th-note pickup into the next beat.
const MV_GROOVE_ONSET_LEAD = 1 / 30;

// A beat grid is used only for a tempo in [MV_TEMPO_MIN, MV_TEMPO_MAX] whose detection was accepted (bundled cues
// always are).
function mvGridUsable(opts) {
  const bpm = opts && opts.bpm;
  return !!(opts && opts.accepted) && typeof bpm === 'number' && isFinite(bpm) && bpm >= MV_TEMPO_MIN && bpm <= MV_TEMPO_MAX;
}

// The approximate tempo fixed timing runs on, or null. beat-detect.cjs reports an own track's grid as 'approximate' when
// it is tight (median residual <= 20 ms) and holds across the track but too few beats carry an onset to accept it. Its
// tempo (opts.approxBpm), in [MV_TEMPO_MIN, MV_TEMPO_MAX] and only without a usable grid (opts.gridded), sets the fixed
// shot length (mvShotSeconds) and Groove's beat, so the cuts do not drift against the music. Everything else stays
// gridless: cuts snap only to bass onsets (mvSnapCuts lowConfidence), Groove splits every candidate, no beat punch.
function mvApproxTempo(opts) {
  const bpm = opts && opts.approxBpm;
  return !(opts && opts.gridded) && typeof bpm === 'number' && isFinite(bpm) && bpm >= MV_TEMPO_MIN && bpm <= MV_TEMPO_MAX ? bpm : null;
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

// Seconds per shot: the beats on a grid, else on an approximate tempo (opts.approxBpm from mvApproxTempo, with
// beatsPerShot from mvBeatsPerShot at that tempo), else the fixed fallback for the pace (for Groove: seconds per beat
// unit).
function mvShotSeconds(opts) {
  if (opts.gridded) return opts.beatsPerShot * 60 / opts.bpm;
  if (opts.approxBpm > 0 && opts.beatsPerShot > 0) return opts.beatsPerShot * 60 / opts.approxBpm;
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
// / median per candidate (empty without data) }. Assumes sectionStart is on the bar grid (mvSnapSection /
// mvDefaultSection), since candidates are counted in beats from it; with firstBeat it is only re-phased to the nearest
// beat, never to a bar. The median is taken over the whole span (not per phrase), which is steadier on short spans.
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
    const k = Math.floor((o[0] - start + MV_GROOVE_ONSET_LEAD) / beat);
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

// Hook section (spec 15.3, "Start at the hook"): the bar start with the highest hookBars score (manifest; index b =
// the start firstBeat + 4b beats, scored by onset contrast and low-band punch) among the starts whose video of
// videoSeconds fits before usableEnd, earliest on ties; the manifest's hookStart is this pick for 24 beats. null when
// there are no scores (own music, No music), no tempo or nothing fits, so the caller falls back to mvDefaultSection.
// opts: { hookBars, firstBeat, bpm, usableEnd, videoSeconds, barPhaseBeats? }. barPhaseBeats is informational only:
// the manifest's firstBeat already carries the bar phase, so it never shifts the start.
function mvHookSection(opts) {
  const bars = opts.hookBars, bar = 4 * 60 / opts.bpm;
  if (!Array.isArray(bars) || !bars.length || !(opts.bpm > 0)) return null;
  let best = null;
  for (let b = 0; b < bars.length; b++) {
    const start = opts.firstBeat + b * bar, score = bars[b];
    if (typeof score !== 'number' || !isFinite(score) || start + opts.videoSeconds > opts.usableEnd + 1e-6) continue;
    if (!best || score > best.score + 1e-9) best = { start, score };
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
// photoShare = MV_PHOTO_SHARE, spread = true, motionOpener = true }. A videoOnly slot (a Groove 8th) never takes a
// photo, and the photo share counts only the other slots. Two hard rules, never relaxed: the previous slot's source is never used again for the next slot,
// and at most MV_PHOTO_RUN_MAX photos play in a row (unless the pool has no video candidate). A slot nothing fits under
// them stays null (counted in `missing`); mvPlanBuild then tries a shorter length.
// Motion opener: a video candidate with `motion` > 0 (tagged by the panel's motion bonus, only with Beat punch) marks a
// moving moment. The first slot takes the best such window that fits it (the usual role rank, score and jitter; a role
// outside the slot's roles ranks after them), ahead of a photo slot and the normal tiers, and is then left out of the
// photo slots so the photo share moves to the others. Without tagged candidates (Beat punch off), with none that fits,
// or with motionOpener: false the allocation is exactly as without this rule.
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
  // The motion opener (see above). Nothing is used yet, so this is the pick the first slot's loop turn would make with
  // the motion rank.
  const first = opts.slots[0];
  const opener = first && opts.motionOpener !== false && pool.some(c => c.motion > 0) ? searchVideo(first, c => {
    if (!(c.motion > 0) || c.role === 'filler') return -1;
    const roles = [first.role].concat(MV_ROLE_FALLBACK[first.role] || []), r = roles.indexOf(c.role);
    return r >= 0 ? r : roles.length;
  }, null, null) : null;
  // Photo slots: round(share x slots) of the slots a photo can hold (not the motion opener's), capped by the photos
  // available, spaced evenly from a seeded phase. With no photos there are none, and every slot goes to video.
  const photoSlots = {};
  const phase = mvHash(opts.seed + ':photo-slots');
  const holdable = opts.slots.filter(sl => !sl.videoOnly && sl.seconds <= MV_PHOTO_HOLD_MAX + 1e-9 && !(opener && sl === first));
  const share = opts.photoShare == null ? MV_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(opts.slots.filter(sl => !sl.videoOnly).length * share));
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
    let best = slot === first ? opener : null;
    if (!best) {
      for (const tier of tiers) {
        if (runFull && tier === photo) continue;
        if ((best = tier())) break;
      }
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
// approxBpm? (mvApproxTempo), fps, pace: 'quick' | 'relaxed' | 'groove', requested (shots), sectionStart?, usableEnd? (Infinity / omitted without
// music), onsets?, onsetThresholds?, lowConfidence?, seed, photoShare?, motionOpener? (mvAllocate) }.
// A plan carries approxBpm: the approximate tempo its fixed timing used, else null.
// Order: the music caps the length (mvFitShots), then the plan tries that length and shrinks by MV_MIN_SHOTS down to
// MV_MIN_SHOTS until the strict allocation fills every slot. Every attempt allocates from scratch with filler
// candidates added (see `attempts` below). Failure reasons: 'music-too-short' (not even MV_MIN_SHOTS fit the music), 'one-resource' (fewer
// than 2 distinct sources: the adjacency rule cannot hold), 'too-few' (the footage fills fewer than MV_MIN_SHOTS).
// Groove (unless its tempo guard falls back to 2 beats per shot): the length is a beat span (mvGrooveFit: the nominal
// span for `requested`, capped by the music in whole bars) and shrinks by whole bars down to MV_GROOVE_MIN_BEATS; each
// span's fills come from the section's onsets (mvFillBeats), and `shots` is that span's actual slot count. A pool with
// no usable video gets no 8ths (photos cannot take them). The result then has beatsPerShot null, shotSeconds null and
// groove: { beats, requestedBeats, splits (beats split into 8ths), fillSource, ratios (mvFillBeats), beatSeconds,
// opener }; its slots carry
// `beats`.
function mvPlanBuild(opts) {
  const gridded = mvGridUsable({ bpm: opts.bpm, accepted: opts.accepted });
  // The tempo the shots follow: the grid's, else an approximate one (fixed timing on its beat), else null (0.55 s).
  const approxBpm = mvApproxTempo({ gridded, approxBpm: opts.approxBpm });
  const tempo = gridded ? opts.bpm : approxBpm;
  const guard = tempo ? mvBeatsPerShot(opts.pace, tempo) : { beats: null, overridden: false };
  const grooved = opts.pace === 'groove' && (tempo ? !!guard.groove : true);
  const shotSeconds = grooved ? null : mvShotSeconds({ bpm: opts.bpm, beatsPerShot: guard.beats, pace: opts.pace, gridded, approxBpm });
  const beatSeconds = grooved ? (tempo ? 60 / tempo : MV_GROOVE_FALLBACK_BEAT) : null;
  const opener = grooved && tempo ? mvGrooveOpener(tempo) : 2;
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
  // Each attempt's name ('spread', 'spread-share1', 'role-first', 'role-first-share1', each with '-no-opener' when the
  // motion opener's retry built it) is returned as `attempt`, so the panel and logs can tell when a fallback built the
  // plan.
  const attempts = [true, false].flatMap(spread => shares.map((photoShare, i) =>
    ({ spread, photoShare, name: (spread ? 'spread' : 'role-first') + (i ? '-share1' : '') })));
  let usableShots = 0;
  // Whether mvAllocate's motion opener can apply (some video candidate carries motion).
  const motionTagged = opts.motionOpener !== false && candidates.some(c => c && c.kind !== 'photo' && c.motion > 0);
  // Lengths to try, longest first: shots (Quick / Relaxed) or beat spans (Groove).
  const step = grooved ? 4 : MV_MIN_SHOTS, least = grooved ? MV_GROOVE_MIN_BEATS : MV_MIN_SHOTS;
  for (let n = top; n >= least; n -= step) {
    const snapOpts = { sectionStart: opts.sectionStart, onsets: opts.onsets, onsetThresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence };
    // Groove fills for this span: none without video (photos cannot take an 8th), the pattern without a grid.
    const fills = !grooved ? null
      : !hasVideo ? { splits: [], source: 'no-video', ratios: [] }
      : gridded ? mvFillBeats({ onsets: opts.onsets, sectionStart: opts.sectionStart, bpm: opts.bpm, beats: n })
      : { splits: mvGrooveCandidates(n), source: 'pattern', ratios: [] };
    const schedule = fills
      ? mvSchedule({ bpm: gridded ? opts.bpm : null, fps: opts.fps, beatsList: mvGrooveBeats({ beats: n, splits: fills.splits, opener }), shotSeconds: beatSeconds, ...snapOpts })
      : mvSchedule({ bpm: gridded ? opts.bpm : null, fps: opts.fps, shots: n, beatsPerShot: guard.beats, shotSeconds, ...snapOpts });
    const slots = schedule.slots.map(s => (fills
      ? { index: s.index, role: s.role, seconds: (s.endFrame - s.startFrame) / opts.fps, videoOnly: (s.beats || 1) < 1 }
      : { index: s.index, role: s.role, seconds: (s.endFrame - s.startFrame) / opts.fps }));
    for (const attempt of attempts) {
      let alloc = mvAllocate({ candidates, slots, seed: opts.seed, photoShare: attempt.photoShare, spread: attempt.spread, motionOpener: opts.motionOpener });
      let name = attempt.name;
      // The motion opener never costs length: an attempt it leaves short is retried without it (named
      // '<attempt>-no-opener') before the next attempt or a shorter length. Untagged pools never retry.
      if (alloc.missing > 0 && motionTagged) {
        if (n === least) usableShots = Math.max(usableShots, alloc.filled);
        alloc = mvAllocate({ candidates, slots, seed: opts.seed, photoShare: attempt.photoShare, spread: attempt.spread, motionOpener: false });
        name = attempt.name + '-no-opener';
      }
      if (alloc.missing === 0) {
        return { ok: true, schedule, picks: alloc.picks, shots: slots.length, requested, fittedByMusic: top < (fit ? fit.requestedBeats : requested),
          beatsPerShot: grooved ? null : guard.beats, overridden: guard.overridden, shotSeconds, approxBpm, fillerShots: alloc.fillerShots, photoShots: alloc.photoShots,
          attempt: name,
          ...(fills && fit ? { groove: { beats: n, requestedBeats: fit.requestedBeats, splits: fills.splits, fillSource: fills.source, ratios: fills.ratios, beatSeconds, opener } } : {}) };
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
// mv-planner:end

// mv-hook:start
// Hook B helpers (spec 15.2), plain JS outside the planner block: the headless driver (dev/driveAdapter.mjs) loads
// this block next to planner.js, so the panel and the driver compute the same motion bonus and punch frames.
// Motion bonus (15.2 a), only with Beat punch on (off, the search and the plan are exactly as without it): the search
// adds the motion query (mvSearchQueries), whose hits are not shot candidates. Each hit's score is min-max normalised
// over the run's motion hits (0 for the weakest, 1 for the strongest; 0 for all when they are equal), and a role
// candidate gains MV_MOTION_BONUS times the best normalised motion hit on the same clip within MV_MOTION_REACH seconds of
// its centre (the allocator centres a shot on its candidate, so this stands in for the shot's window +/- 0.5 s). The
// bonus is a tie-break: at most 0.1, below the allocator's 0.15 step between roles minus its 0.05 seeded jitter, so it
// never changes the role order, only which of two similar moments of a clip comes first. It is added before the
// planner's seeded tie-break, so a build stays deterministic. A candidate with a bonus also carries `motion` (its
// normalised motion, > 0): the planner opens the video on the best such window (mvAllocate's motion opener), the one
// place where motion outranks the role order. A clip whose only hits are motion hits keeps a stub row
// (rid and sourceDuration, no time or score): the planner skips it as a candidate but still makes the clip's filler
// windows from it.
const MV_MOTION_ROLE = 'motion';
const MV_MOTION_QUERY = 'hands moving, pouring, walking or the camera moving';
const MV_MOTION_BONUS = 0.1;
const MV_MOTION_REACH = 0.75;
// The scene-search queries for a build: the role queries, plus the motion query with Beat punch on.
function mvSearchQueries(queries, punch) {
  return punch ? { ...queries, [MV_MOTION_ROLE]: MV_MOTION_QUERY } : queries;
}
function mvMotionBonus(list) {
  const finite = v => typeof v === 'number' && isFinite(v);
  const hits = {}, rest = [], stubs = {};
  let min = Infinity, max = -Infinity;
  for (const c of list) {
    if (!c || c.role !== MV_MOTION_ROLE) { rest.push(c); continue; }
    if (!stubs[c.rid]) stubs[c.rid] = { rid: c.rid, role: MV_MOTION_ROLE, sourceDuration: c.sourceDuration };
    if (!finite(c.t) || !finite(c.score)) continue;
    (hits[c.rid] = hits[c.rid] || []).push(c);
    min = Math.min(min, c.score); max = Math.max(max, c.score);
  }
  const seen = {};
  for (const c of rest) if (c) seen[c.rid] = true;
  const kept = Object.keys(stubs).filter(rid => !seen[rid]).map(rid => stubs[rid]);
  if (!(max > min)) return rest.concat(kept);
  return rest.map(c => {
    const near = c && hits[c.rid];
    if (!near || !finite(c.t) || !finite(c.score)) return c;
    let motion = 0;
    for (const h of near) if (Math.abs(h.t - c.t) <= MV_MOTION_REACH + 1e-9) motion = Math.max(motion, (h.score - min) / (max - min));
    return motion > 0 ? { ...c, score: c.score + MV_MOTION_BONUS * motion, motion } : c;
  }).concat(kept);
}
// Punch frames (15.2 b): the Draft frames where a Beat punch starts, the bar downbeats of the section (beats 0, 4, 8 ...
// from the section start, which sits on a bar) at the Draft's real fps with the music offset (mvMusicOffset: the frame
// expression of mvSchedule and assemble.js), before videoEnd. opts: { bpm (null without a grid), fps, sectionStart,
// videoEnd }. [] without a grid: every video clip then gets the push-in only. Groove does not change them: punches
// follow the beat grid, not the cuts.
function mvPunchFrames(opts) {
  const bpm = opts.bpm, fps = opts.fps, end = opts.videoEnd;
  if (!(bpm > 0) || !(fps > 0) || !(end > 0)) return [];
  const beat = 60 / bpm, offset = mvMusicOffset(opts.sectionStart, fps), out = [];
  const total = Math.ceil(end / fps / beat);
  for (let b = 0; b <= total; b += 4) {
    const f = b === 0 ? 0 : Math.round((b * beat + offset) * fps);
    if (f < end) out.push(f);
  }
  return out;
}
// mv-hook:end

// The title layout, embedded verbatim from assets/title-lockup.tsx (tests/panel.test.cjs checks it), so the preview
// places every word, sparkle and star with the same code as the Draft's title.
// mv-lockup:start
// Pure layout, shared with the panel preview (which evaluates this block as plain JS).
// Text is measured with the per-font advance tables from presets.json (`metrics`), passed
// in `data.fonts[i].metrics`, so the layout is identical in Node, the panel and the render.
// All lengths are canvas pixels; sizes are relative to the canvas height.
// Items: text {part, text, font, x (left), y (baseline), size (font px), w (advance width), shade (shadow fraction)},
// sparkle/star {part, x, y (centre), size (full height)}; each carries its ink box [x0, y0, x1, y1].
var MV_FACES = {
  "mini-vlog": {
    // No.17's face: tight tracking and a thin same-colour stroke (em) soften the contrast.
    big: { family: "MV Instrument Serif Italic", style: "italic", weight: 400, tracking: -0.05, stroke: 0.01 },
    // DM Serif Display has one weight, so "vlog" reads lighter through a softer drop shadow (`shade`: a fraction of the
    // title's shadow opacity and blur) and a slightly smaller size (mvLayoutMini).
    small: { family: "MV DM Serif Display", style: "normal", weight: 400, shade: 0.6 },
  },
  "day-in-my-life": {
    big: { family: "MV Rounded Bold", style: "normal", weight: 700 },
    tag: { family: "MV Rounded Bold", style: "normal", weight: 700 },
  },
  "small-glimpse": {
    big: { family: "MV Rounded Bold", style: "normal", weight: 700 },
    mono: { family: "MV DM Mono", style: "normal", weight: 400 },
  },
};
// Used only when a family's metrics are missing: a generic 0.56 em advance.
var MV_FALLBACK_METRICS = { unitsPerEm: 1000, xHeight: 500, capHeight: 700, ascent: 720, descent: -220, dots: { i: [150, 650], j: [150, 650] }, advances: {} };
var MV_FIT = 0.6; // max lockup width, fraction of canvas width
var MV_MINI_WIDTH = (0.155 * 1920) / 1080; // "mini" advance width at size 100, fraction of height

function mvFace(data, preset, role) {
  var face = MV_FACES[preset][role];
  var fonts = data && Array.isArray(data.fonts) ? data.fonts : [];
  var m = null;
  for (var i = 0; i < fonts.length; i++) if (fonts[i] && fonts[i].family === face.family && fonts[i].metrics) m = fonts[i].metrics;
  return { family: face.family, style: face.style, weight: face.weight, tracking: face.tracking || 0, stroke: face.stroke || 0, shade: typeof face.shade === "number" ? face.shade : 1, m: m || MV_FALLBACK_METRICS };
}

function mvAdvance(m, ch) {
  var a = m.advances[ch];
  return typeof a === "number" ? a : 0.56 * m.unitsPerEm;
}

// Advance width of `text` at `px` (kerning ignored), plus `tracking` em (optional, default 0) between letters
// (CSS letter-spacing also follows the last letter, but that space is never visible).
function mvTextWidth(text, m, px, tracking = 0) {
  var units = 0;
  for (var i = 0; i < text.length; i++) units += mvAdvance(m, text.charAt(i));
  return (units * px) / m.unitsPerEm + (tracking || 0) * px * Math.max(0, text.length - 1);
}

// Ink extents above / below the baseline in em, from the characters present.
function mvInk(text, m) {
  var up = m.xHeight, down = 0;
  if (/[A-Z0-9bdfhklt\u00c0-\u00de\u00df!?'"&%$#@/\\|(){}[\]]/.test(text)) up = Math.max(up, m.ascent, m.capHeight);
  else if (/[ij]/.test(text)) up = Math.max(up, m.dots.i[1] + 0.07 * m.unitsPerEm);
  if (/[gjpqy,;()[\]{}|]/.test(text)) down = -m.descent;
  return { up: up / m.unitsPerEm, down: down / m.unitsPerEm };
}

// Boxes span the advance width (plus half the stroke, which grows outward), not the ink:
// an italic's overhang can reach past box[2]. `tracking` and `stroke` are px for the SVG.
function mvText(part, text, f, x, y, size, color) {
  var w = mvTextWidth(text, f.m, size, f.tracking), ink = mvInk(text, f.m), s = f.stroke * size, h = s / 2;
  return { kind: "text", part: part, text: text, font: { family: f.family, style: f.style, weight: f.weight }, x: x, y: y, size: size, color: color, w: w,
    tracking: f.tracking * size, stroke: s, shade: f.shade, box: [x - h, y - ink.up * size - h, x + w + h, y + ink.down * size + h] };
}

function mvMark(kind, part, x, y, size, color) {
  return { kind: kind, part: part, x: x, y: y, size: size, color: color, box: [x - size / 2, y - size / 2, x + size / 2, y + size / 2] };
}

// [x0, y0, x1, y1] around every item's ink box.
function mvLockupBounds(items) {
  var b = [Infinity, Infinity, -Infinity, -Infinity];
  for (var i = 0; i < items.length; i++) {
    var q = items[i].box;
    b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])];
  }
  return b;
}

// Split at the space nearest the middle; without a space, at the middle with a hyphen.
function mvSplit(text, hyphen) {
  var mid = text.length / 2, at = -1;
  for (var i = 0; i < text.length; i++) if (text.charAt(i) === " " && (at < 0 || Math.abs(i - mid) < Math.abs(at - mid))) at = i;
  if (at > 0) return [text.slice(0, at).trim(), text.slice(at + 1).trim()];
  if (!hyphen) return [text];
  var cut = Math.ceil(text.length / 2);
  return [text.slice(0, cut) + "-", text.slice(cut)];
}

// "Mini vlog" (No.17): italic big word, sparkles over up to three i/j, upright small word under it.
function mvLayoutMini(data, fields, H, S, col) {
  var fb = mvFace(data, "mini-vlog", "big"), fs = mvFace(data, "mini-vlog", "small"), mb = fb.m;
  var items = [];
  // Footprint wins over x-height: at size 100 "mini" is 0.155 of a 16:9 canvas's width
  // (No.17 measures ~290-300 px at 1920x1080), expressed relative to the height.
  var Fb = ((MV_MINI_WIDTH * H) / mvTextWidth("mini", mb, 1, fb.tracking)) * S, xh = mb.xHeight / mb.unitsPerEm;
  // Sparkled i/j are drawn dotless when the font has the glyph, so the sparkle replaces the dot.
  var chars = fields.big.split(""), marks = [];
  for (var i = 0; i < chars.length && marks.length < (data.sparkles === false ? 0 : 3); i++) {
    var ch = chars[i];
    if (ch !== "i" && ch !== "j") continue;
    marks.push(i);
    var dotless = ch === "i" ? "\u0131" : "\u0237";
    if (typeof mb.advances[dotless] === "number") chars[i] = dotless;
  }
  var bigText = chars.join("");
  var wb = mvTextWidth(bigText, mb, Fb, fb.tracking);
  var big = mvText("big", bigText, fb, -wb / 2, 0, Fb, col.primary);
  items.push(big);
  var spark = 0.36 * xh * Fb;
  for (var k = 0; k < marks.length; k++) {
    var letter = fields.big.charAt(marks[k]), stem = mb.stems && mb.stems[letter];
    var dot = mb.dots[letter] || mb.dots.i;
    // Pen position of the letter: advances plus the tracking after each earlier letter.
    var pen = big.x + mvTextWidth(bigText.slice(0, marks[k]), mb, Fb) + fb.tracking * Fb * marks[k];
    var px, py;
    if (bigText.charAt(marks[k]) !== letter && stem) {
      // Dotless letter: the sparkle sits on its stem top, its bottom 0.12 x-height above it.
      px = pen + (stem[0] / mb.unitsPerEm) * Fb;
      py = -(stem[1] / mb.unitsPerEm + 0.12 * xh) * Fb - spark / 2;
    } else {
      px = pen + (dot[0] / mb.unitsPerEm) * Fb;
      py = -(dot[1] / mb.unitsPerEm) * Fb;
      // A letter that kept its dot (no dotless glyph) gets the sparkle above the dot.
      if (bigText.charAt(marks[k]) === letter) py = -((dot[1] + (dot[2] || 0.06 * mb.unitsPerEm)) / mb.unitsPerEm) * Fb - 0.03 * Fb - spark / 2;
    }
    items.push(mvMark("sparkle", "sparkle", px, py, spark, col.primary));
  }
  if (data.sparkles !== false && marks.length === 0) {
    items.push(mvMark("sparkle", "sparkle", big.box[2] + 0.04 * Fb, big.box[1] - 0.06 * Fb, spark, col.primary));
  }
  if (fields.small) {
    // "vlog" is 43 % of "mini"'s width in No.17; 41 % (5 % smaller) keeps the one-weight face from reading heavy.
    // Kept as a font-size ratio for other words.
    var ms = fs.m;
    var Fs = (Fb * 0.41 * mvTextWidth("mini", mb, 1, fb.tracking)) / mvTextWidth("vlog", ms, 1);
    var ws = mvTextWidth(fields.small, ms, Fs), inkS = mvInk(fields.small, ms);
    var y2 = big.box[3] + 0.03 * Fb + inkS.up * Fs;
    items.push(mvText("small", fields.small, fs, -ws / 2, y2, Fs, col.secondary));
  }
  return items;
}

// "A day in my life": [star year] big line 1 / big line 2 [two-line tag star], rows right-aligned.
function mvLayoutDay(data, fields, H, S, col) {
  var fb = mvFace(data, "day-in-my-life", "big"), ft = mvFace(data, "day-in-my-life", "tag"), m = fb.m;
  var accents = data.sparkles !== false;
  var Fb = ((0.07 * H) / (m.xHeight / m.unitsPerEm)) * S, Fy = 0.36 * Fb, Ft = 0.28 * Fb;
  var xh = m.xHeight / m.unitsPerEm, cap = m.capHeight / m.unitsPerEm, xhT = ft.m.xHeight / ft.m.unitsPerEm;
  var lines = mvSplit(fields.big, false);
  var l1 = lines.length > 1 ? lines[0] : "", l2 = lines.length > 1 ? lines[1] : lines[0];
  var row1 = [], row2 = [];
  // Row 1: star + year centred on the big line's x-height band, then the first big line.
  var y1 = 0, band1 = y1 - (xh * Fb) / 2, x = 0;
  if (fields.year) {
    // The star only takes room when it is drawn.
    if (accents) {
      var sy = 0.3 * Fb;
      row1.push(mvMark("star", "star", x + sy / 2, band1, sy, col.secondary));
      x += sy + 0.06 * Fb;
    }
    var year = mvText("year", fields.year, fb, x, band1 + (cap * Fy) / 2, Fy, col.secondary);
    row1.push(year);
    x = year.box[2] + 0.12 * Fb;
  }
  var inkBottom1 = 0;
  if (l1) {
    var b1 = mvText("big1", l1, fb, x, y1, Fb, col.primary);
    row1.push(b1);
    inkBottom1 = b1.box[3];
  }
  // Row 2: tight under row 1 (ink to ink), big line then the tag centred on its x-height band.
  var y2 = inkBottom1 + 0.05 * Fb + mvInk(l2, m).up * Fb;
  if (!l1 && fields.year) y2 = Math.max(y2, y1 + 0.7 * Fb);
  var b2 = mvText("big2", l2, fb, 0, y2, Fb, col.primary);
  row2.push(b2);
  if (fields.tag) {
    var tag = mvSplit(fields.tag, false), band2 = y2 - (xh * Fb) / 2, tx = b2.box[2] + 0.08 * Fb;
    var lead = 1.2 * Ft;
    // Two lines: the block (line 1 x-height top to line 2 baseline) is centred on the band.
    var t1y = tag.length > 1 ? band2 - (lead - xhT * Ft) / 2 : band2 + (xhT * Ft) / 2;
    var t1 = mvText("tag1", tag[0], ft, tx, t1y, Ft, col.secondary);
    row2.push(t1);
    if (tag.length > 1) row2.push(mvText("tag2", tag[1], ft, tx, t1y + lead, Ft, col.secondary));
    if (accents) {
      var st = 0.2 * Fb;
      row2.push(mvMark("star", "star", t1.box[2] + 0.05 * Fb + st / 2, band2, st, col.secondary));
    }
  }
  // Right-align the rows (a lone year row stays left-aligned over the big word).
  var r1 = row1.length ? mvLockupBounds(row1)[2] : 0, r2 = mvLockupBounds(row2)[2], right = Math.max(r1, r2);
  var shift1 = l1 ? right - r1 : mvLockupBounds(row2)[0] - (row1.length ? mvLockupBounds(row1)[0] : 0), shift2 = right - r2;
  return mvShift(row1, shift1, 0).concat(mvShift(row2, shift2, 0));
}

// "A small glimpse": tiny mono top line / big word split in two with a star before line 2 / tiny mono bottom line.
function mvLayoutGlimpse(data, fields, H, S, col) {
  var fb = mvFace(data, "small-glimpse", "big"), fm = mvFace(data, "small-glimpse", "mono"), m = fb.m;
  var Fb = ((0.075 * H) / (m.xHeight / m.unitsPerEm)) * S, Fm = 0.25 * Fb, xh = m.xHeight / m.unitsPerEm;
  var word = fields.big;
  var lines = word.replace(/\s/g, "").length <= 3 ? [word] : mvSplit(word, true);
  var items = [], first = null, last;
  if (lines.length > 1) {
    first = mvText("big1", lines[0], fb, 0, 0, Fb, col.primary);
    items.push(first);
  }
  var up2 = mvInk(lines[lines.length - 1], m).up;
  var y2 = first ? 0.66 * Fb + Math.max(0, (up2 - xh) * Fb) : 0;
  var starD = 0.4 * Fb;
  if (data.sparkles !== false) items.push(mvMark("star", "star", 0.2 * Fb, y2 - (xh * Fb) / 2, starD, col.secondary));
  last = mvText("big2", lines[lines.length - 1], fb, 0.5 * Fb, y2, Fb, col.primary);
  items.push(last);
  var topLine = first || last;
  if (fields.top) items.push(mvText("top", fields.top, fm, topLine.x + 0.1 * Fb, topLine.box[1] - 0.22 * Fb, Fm, col.secondary));
  if (fields.bottom) items.push(mvText("bottom", fields.bottom, fm, last.x + 0.75 * last.w, y2 + 0.34 * Fb, Fm, col.secondary));
  return items;
}

function mvShift(items, dx, dy) {
  return items.map(function (it) {
    return Object.assign({}, it, { x: it.x + dx, y: it.y + dy, box: [it.box[0] + dx, it.box[1] + dy, it.box[2] + dx, it.box[3] + dy] });
  });
}

function mvLockupLayout(data, width, height) {
  data = data || {};
  var W = width > 0 ? width : 1920, H = height > 0 ? height : 1080;
  var preset = MV_FACES[data.preset] ? data.preset : "mini-vlog";
  var raw = data.fields || {};
  // Adjust edits land on flat keys (data.big, data.small, ...), so a flat string wins over data.fields.
  var pick = function (k) { var v = typeof data[k] === "string" ? data[k] : raw[k]; return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : ""; };
  var fields = { big: pick("big"), small: pick("small"), tag: pick("tag"), year: pick("year"), top: pick("top"), bottom: pick("bottom") };
  if (!fields.big) return [];
  var num = function (v, d, lo, hi) { return typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  var S = num(data.size, 100, 60, 160) / 100;
  var col = {
    primary: typeof data.primary === "string" && data.primary ? data.primary : "#F7C8E6",
    secondary: typeof data.secondary === "string" && data.secondary ? data.secondary : "#FFFFFF",
  };
  var items = preset === "day-in-my-life" ? mvLayoutDay(data, fields, H, S, col)
    : preset === "small-glimpse" ? mvLayoutGlimpse(data, fields, H, S, col)
    : mvLayoutMini(data, fields, H, S, col);
  // Shrink the whole lockup to the max width, then centre its ink box on the anchor.
  var b = mvLockupBounds(items);
  var k = Math.min(1, (MV_FIT * W) / (b[2] - b[0]));
  var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  var ax = (num(data.x, 49, 20, 80) / 100) * W, ay = (num(data.y, 52, 20, 80) / 100) * H;
  var tx = function (v) { return ax + (v - cx) * k; }, ty = function (v) { return ay + (v - cy) * k; };
  return items.map(function (it) {
    var o = Object.assign({}, it, { x: tx(it.x), y: ty(it.y), size: it.size * k, box: [tx(it.box[0]), ty(it.box[1]), tx(it.box[2]), ty(it.box[3])] });
    if (typeof it.w === "number") { o.w = it.w * k; o.tracking = it.tracking * k; o.stroke = it.stroke * k; }
    return o;
  });
}

// Items grouped by shade in first-appearance order ([{ shade, items }]); marks carry the full shadow (1). Each group
// is drawn as its own SVG with the title's drop shadow scaled by its shade.
function mvShadeLayers(items) {
  var layers = [];
  for (var i = 0; i < items.length; i++) {
    var sh = typeof items[i].shade === "number" ? items[i].shade : 1, at = -1;
    for (var j = 0; j < layers.length; j++) if (layers[j].shade === sh) at = j;
    if (at < 0) { layers.push({ shade: sh, items: [] }); at = layers.length - 1; }
    layers[at].items.push(items[i]);
  }
  return layers;
}

function mvF(v) { return Math.round(v * 100) / 100; }

// Four-point sparkle (concave sides) centred on (cx, cy), `size` tall and wide.
function mvSparklePath(cx, cy, size) {
  var r = size / 2, c = r * 0.14;
  return "M" + mvF(cx) + " " + mvF(cy - r)
    + " Q" + mvF(cx + c) + " " + mvF(cy - c) + " " + mvF(cx + r) + " " + mvF(cy)
    + " Q" + mvF(cx + c) + " " + mvF(cy + c) + " " + mvF(cx) + " " + mvF(cy + r)
    + " Q" + mvF(cx - c) + " " + mvF(cy + c) + " " + mvF(cx - r) + " " + mvF(cy)
    + " Q" + mvF(cx - c) + " " + mvF(cy - c) + " " + mvF(cx) + " " + mvF(cy - r) + " Z";
}

// Five-point star centred on (cx, cy), `size` across the outer points.
function mvStarPath(cx, cy, size) {
  var R = size / 2, r = R * 0.45, d = "";
  for (var i = 0; i < 10; i++) {
    var a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r : R;
    // Nudge down so the star's visual centre (not its top point) sits on cy.
    d += (i ? " L" : "M") + mvF(cx + rad * Math.cos(a)) + " " + mvF(cy + rad * Math.sin(a) + R * 0.05);
  }
  return d + " Z";
}
// mv-lockup:end

// Why a plan cannot be built (planner mvPlanBuild reasons), as the panel says it.
const MV_FAIL: Record<string, string> = {
  "one-resource": "Add at least 2 clips or photos",
  "too-few": "Your footage fits fewer than 4 shots",
  "music-too-short": "This track is too short for 4 shots from this section",
};

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
// A read-only call that still failed with a host-busy / deadline error after its retries.
const isBusyError = (text: string) => /deadline|did not finish|hostWaitMs|before the script started/i.test(text);
class BusyError extends Error {}

// A preset's fonts, one per family (a family may serve two roles), with the advance metrics the layout measures with.
function presetFonts(p: any, all: any) {
  const seen = new Set<string>();
  return (p?.fonts || []).filter((x: any) => !seen.has(x.family) && !!seen.add(x.family))
    .map((x: any) => ({ role: x.role, family: x.family, style: x.style, weight: x.weight, file: x.file, metrics: all?.metrics?.[x.family] || null }));
}
// The `@year` token's text: the current year when the panel shows the field (recording dates never set it, since
// imported or stock footage can be years old). dev/driveAdapter.mjs evaluates this same function.
function mvCurrentYear() { return String(new Date().getFullYear()); }
// Preview geometry: a fixed-height box showing the middle of the frame, where the lockup sits (at most 60 % of the
// width, centred at 49 / 52 %), so the box never changes height while typing or switching presets.
const PREVIEW_HEIGHT = 112;
const PREVIEW_VIEW = [0.15 * MV_W, 0.2 * MV_H, 0.7 * MV_W, 0.64 * MV_H].join(" ");
const PREVIEW_FALLBACK = '"Helvetica Neue", Arial, sans-serif';

// The photo rids a build uses: the selected photos (all when `onlyPhotos` is null), none while Use photos is off.
function selectedPhotoRidsOf(inventory: any, onlyPhotos: string[] | null, usePhotos: boolean): string[] {
  if (!usePhotos || !inventory) return [];
  return (inventory.photos || []).map((r: any) => r.rid as string).filter((rid: string) => !onlyPhotos || onlyPhotos.includes(rid));
}
// Photo candidates for the planner. With Use photos off there are none: the planner never sees a photo.
function photoCandsOf(inventory: any, onlyPhotos: string[] | null, usePhotos: boolean) {
  return selectedPhotoRidsOf(inventory, onlyPhotos, usePhotos).map((rid) => ({ rid, kind: "photo" }));
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
// Local date and time for the Draft name, to the second so a lost reply can find exactly this Draft.
function stamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}
// Resolves a --panel-* colour for canvas drawing; falls back when the token is missing or not a colour.
function themeColor(el: Element, ctx: CanvasRenderingContext2D, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  if (!v) return fallback;
  ctx.fillStyle = "#010203";
  ctx.fillStyle = v;
  return ctx.fillStyle === "#010203" ? fallback : v;
}
const WAVE_HEIGHT = 56;

// Music section slider: waveform on a canvas with a draggable, snapped window over the chosen section.
// While `audio` plays, a playhead follows its currentTime inside the window, redrawn on every animation frame.
function SectionSlider({ peaks, total, section, videoSeconds, barSeconds, snap, onChange, disabled, audio }: {
  peaks: number[]; total: number; section: number | null; videoSeconds: number; barSeconds: number;
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

  // Bundled peaks can exceed 1.0 slightly, so scale by the loudest bar when it does.
  const peakMax = Math.max(1, ...peaks);
  // The latest draw, so the animation loop always paints with the current props. `playAt` is seconds into the section.
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
    // Selected window: translucent fill under the bars.
    if (section != null) {
      ctx.globalAlpha = 0.18; ctx.fillStyle = accent;
      ctx.fillRect(x0, 0, Math.max(2, x1 - x0), WAVE_HEIGHT);
      ctx.globalAlpha = 1;
    }
    // Mirrored bars, one per ~2.5 CSS px; each bar is the loudest peak it covers.
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
    // Window border and two grip handles so it reads as draggable.
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
      // Playhead: a vertical line at the playing position, kept inside the window.
      if (playAt != null) {
        const px = Math.min(x0 + w - 1, Math.max(x0 + 1, ((section + Math.min(playAt, videoSeconds)) / total) * width));
        ctx.fillStyle = themeColor(wrap, ctx, "--panel-fg", "#ffffff");
        ctx.fillRect(px - 1, 0, 2, WAVE_HEIGHT);
      }
    }
  };
  React.useEffect(() => { if (!audio) drawRef.current(null); }, [width, peaks, peakMax, section, videoSeconds, total, audio]);
  // Playback drives the playhead with requestAnimationFrame; the loop ends when playback stops.
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
    // Grabbing the window keeps the grab point; anywhere else centres the window there.
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
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = snap(section - barSeconds);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = snap(section + barSeconds);
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

export default function Panel({ sdk, context, ui }: any) {
  const projectId = context?.projectId ?? null;
  const projectRef = React.useRef(projectId);
  projectRef.current = projectId;
  const [roots, setRoots] = React.useState<{ plugin: string; data: string } | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [inventory, setInventory] = React.useState<any>(null);
  const [candidates, setCandidates] = React.useState<any>(null);
  const [preset, setPreset] = React.useState(DEFAULT_PRESET);
  // Title text per preset ({ presetId: { fieldKey: text } }); a field not in here shows its preset's initial text.
  // Switching presets never overwrites another preset's edits.
  const [fieldsBy, setFieldsBy] = React.useState<Record<string, Record<string, string>>>({});
  // cueId: a manifest cue id, "own" (your own music) or "none" (No music).
  const [cueId, setCueId] = React.useState(DEFAULT_CUE);
  const cueDefaultedRef = React.useRef(false);
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  const [length, setLength] = React.useState<"short" | "standard" | "long">(DEFAULT_LENGTH);
  const [pace, setPace] = React.useState<"quick" | "relaxed" | "groove">(DEFAULT_PACE);
  // Hook B (spec 15): Beat punch on every video clip, and the music section defaulting to the track's hook window
  // (bundled tracks only). Both on by default, and both stay toggles.
  const [beatPunch, setBeatPunch] = React.useState(DEFAULT_PUNCH);
  const [hook, setHook] = React.useState(DEFAULT_HOOK);
  // Clip sound: the clips' own sound is off (muted), ambient (-18 dB under the music) or full (0 dB).
  const [clipSound, setClipSound] = React.useState<"off" | "ambient" | "full">("ambient");
  const [soft, setSoft] = React.useState(true);
  const [only, setOnly] = React.useState<string[] | null>(null);
  // Photos: on by default. `onlyPhotos` is the photo selection (null = all); `only` stays the video selection, so
  // choosing photos never invalidates the scene search.
  const [usePhotos, setUsePhotos] = React.useState(true);
  const [onlyPhotos, setOnlyPhotos] = React.useState<string[] | null>(null);
  const [section, setSection] = React.useState<number | null>(0);
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  // Single-flight guard: state updates are async, so a ref blocks a second click in the same tick.
  const busyRef = React.useRef(false);
  const [step, setStep] = React.useState("");
  const [tools, setTools] = React.useState({ ffmpeg: true, node: true });
  const fontCache = React.useRef<Record<string, Promise<string>>>({});
  const registered = React.useRef<Set<string>>(new Set());
  // Build progress (bar + step list). `step` stays for the one-call spinner (own-music beat detection).
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
  const advance = (id: string, fraction: number, detail?: string) => { const p = mvProgress(id, fraction, detail); progressRef.current = p; setProgress(p); };
  const [status, setStatus] = React.useState<{ tone: string; text: string } | null>(null);
  const [result, setResult] = React.useState<any>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const previewTokenRef = React.useRef(0);
  const previewUrlRef = React.useRef<string | null>(null);
  const [playState, setPlayState] = React.useState<"idle" | "loading" | "playing">("idle");
  const [playingAudio, setPlayingAudio] = React.useState<HTMLAudioElement | null>(null);

  // `script` may depend on the attempt (0 first, then each retry), so a retry can ask for less work.
  // opts.wanted: a read retries only while this is true (the Project did not change, the panel is still open).
  const run = async (summary: string, script: string | ((attempt: number) => string), allowCommit = false, opts: { wanted?: () => boolean } = {}) => {
    const scriptAt = (n: number) => (typeof script === "string" ? script : script(n));
    const send = (attempt: number) => sdk.runScript(allowCommit ? { summary, script: scriptAt(0), allowCommit } : { summary, script: scriptAt(attempt), allowCommit, timeoutSeconds: READ_TIMEOUT_SECONDS });
    let r = await send(0);
    // Only a lost session is resent, and never a committing call: its commit may already have landed.
    if (r.isError && !allowCommit && /No valid session ID/.test(r.output || "")) { await new Promise((d) => setTimeout(d, 1500)); r = await send(0); }
    // A busy app: a read is tried again after 5 s, then 15 s, one attempt at a time.
    let attempt = 0;
    while (r.isError && !allowCommit && isBusyError(String(r.output || "")) && attempt < BUSY_BACKOFF_MS.length) {
      attempt++;
      await new Promise((d) => setTimeout(d, BUSY_BACKOFF_MS[attempt - 1]));
      if (opts.wanted && !opts.wanted()) break;
      r = await send(attempt);
    }
    if (r.isError && !allowCommit && isBusyError(String(r.output || ""))) throw new BusyError(MV_BUSY);
    if (r.isError || r.result == null) throw new Error(r.output || "Selects could not complete this step.");
    return r.result as any;
  };
  const fontB64 = (plugin: string, file: string) => {
    if (!fontCache.current[file]) {
      fontCache.current[file] = readText(plugin, "assets/fonts/" + file)
        .then((t) => t.replace(/\s+/g, ""))
        .catch((e) => { delete fontCache.current[file]; throw e; });
    }
    return fontCache.current[file];
  };
  // Registers a bundled font in this panel's document for the preset tiles and the live preview.
  async function registerFace(plugin: string, s: any) {
    const key = s.family + "|" + s.style + "|" + s.weight;
    if (registered.current.has(key) || typeof FontFace === "undefined") return;
    const face = new FontFace(s.family, "url(data:font/woff2;base64," + (await fontB64(plugin, s.file)) + ")", { style: s.style, weight: String(s.weight) });
    await face.load();
    (document as any).fonts.add(face);
    registered.current.add(key);
  }
  const stopAt = (e: any) => {
    const at = progressRef.current;
    const where = at ? "Stopped at step " + (at.current + 1) + "/" + MV_BUILD_STEPS.length + ", " + MV_BUILD_STEPS[at.current].label + ": " : "";
    return where + String(e?.message || e);
  };
  const endRun = (pid: string) => {
    if (projectRef.current !== pid) return;
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
  };

  // Inventory bookkeeping: the inventory script, the last clip set seen and a load in flight.
  const inventoryJsRef = React.useRef<string | null>(null);
  const invSigRef = React.useRef<string | null>(null);
  // Photo sizes measured by earlier inventory reads, passed back so a refresh does not measure them again.
  const photoSizesRef = React.useRef<Record<string, { width: number; height: number }>>({});
  const invLoadingRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);
  const [invError, setInvError] = React.useState<string | null>(null);
  const [invLoading, setInvLoading] = React.useState(false);
  // Consecutive incomplete reads, and whether that count reached INCOMPLETE_POLL_MAX (polling stopped).
  const incompleteReadsRef = React.useRef(0);
  const [incompleteStalled, setIncompleteStalled] = React.useState(false);

  // Reads the Project's footage inventory. Never writes state for a stale Project, and never runs during a build.
  // Resolves to "failed" only when a read ran and failed with a non-busy error (the case worth one quick retry).
  async function loadInventory(pid: string | null = projectRef.current, alive: () => boolean = () => true): Promise<"ok" | "busy" | "failed" | "skipped"> {
    const script = inventoryJsRef.current;
    // One read per Project at a time; a read for another Project never blocks this one.
    if (!pid || !script || busyRef.current || invLoadingRef.current === pid) return "skipped";
    const live = () => mountedRef.current && alive() && projectRef.current === pid;
    invLoadingRef.current = pid; setInvLoading(true);
    try {
      const inv = await run("Read footage", (attempt) => fill(script, { projectId: pid, only: null, known: photoSizesRef.current, measureMs: attempt === 0 ? INVENTORY_MEASURE_MS : 0 }), false, { wanted: live });
      // A build that started meanwhile keeps the clip set it began with; the next refresh picks this up.
      if (!live() || busyRef.current) return "skipped";
      inv.resources = inv.resources || [];
      inv.photos = inv.photos || [];
      for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) photoSizesRef.current[ph.rid] = { width: ph.width, height: ph.height };
      const sig = inv.resources.map((r: any) => r.rid).sort().join(",") + "|" + (inv.skipped?.unanalysed || 0);
      // A changed clip set drops the cached scene search so a build never uses stale candidates.
      if (invSigRef.current !== sig) { if (invSigRef.current !== null) setCandidates(null); invSigRef.current = sig; }
      if (inv.incomplete) { incompleteReadsRef.current++; if (incompleteReadsRef.current >= INCOMPLETE_POLL_MAX) setIncompleteStalled(true); }
      else { incompleteReadsRef.current = 0; setIncompleteStalled(false); }
      setInventory(inv); setInvError(null);
      return "ok";
    } catch (e: any) {
      if (!(e instanceof BusyError)) console.warn("Mini Vlog: reading the Project's clips failed", e);
      if (live()) setInvError(e instanceof BusyError ? MV_BUSY : String(e?.message || e));
      return e instanceof BusyError ? "busy" : "failed";
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  // Refresh: a manual read that also restarts the incomplete-read cycle.
  const refreshInventory = () => { incompleteReadsRef.current = 0; setIncompleteStalled(false); loadInventory(); };

  // Mount and Project switch: reset per-Project state, resolve folders, read bundled assets, inventory the Project.
  React.useEffect(() => {
    // Drop everything tied to the previous Project so a build never mixes Projects.
    setCandidates(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false);
    setOnly(null); setOnlyPhotos(null);
    invSigRef.current = null; photoSizesRef.current = {}; incompleteReadsRef.current = 0; setIncompleteStalled(false);
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
    if (!projectId) return;
    let alive = true;
    (async () => {
      try {
        const where = await sdk.runShell({ summary: "Locate plugin folders", command: "mkdir -p " + dq(DATA_DIR) + " && printf '%s\\n%s' " + dq(SKILLS_DIR) + " " + dq(DATA_DIR), timeoutMs: 10000 });
        const [plugin, data] = String(where?.stdout || "").split("\n").map((x) => x.trim());
        if (!plugin || !data) throw new Error("the plugin folders could not be found");
        if (!alive) return;
        setRoots({ plugin, data });
        // ffmpeg and node are only needed for previews and own music; bundled cues work without them.
        let have = "";
        try {
          const probe = await sdk.runShell({ summary: "Check music tools", command: TOOL_PATH + "command -v ffmpeg >/dev/null && echo ffmpeg; command -v node >/dev/null && echo node", timeoutMs: 10000 });
          have = String(probe?.stdout || "");
        } catch { have = ""; }
        if (!alive) return;
        setTools({ ffmpeg: have.includes("ffmpeg"), node: have.includes("node") });
        const read = (rel: string) => readText(plugin, rel);
        const [manifest, presets, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, titleTsx, softTsx, motionTsx, punchTsx] = await Promise.all([
          read("assets/cues/manifest.json"), read("assets/fonts/presets.json"), read("scripts/inventory.js"), read("scripts/search.js"),
          read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/title-lockup.tsx"), read("assets/soft-look.tsx"),
          read("assets/photo-motion.tsx"), read("assets/beat-punch.tsx")]);
        if (!alive) return;
        setAssets({ manifest: JSON.parse(manifest), presets: JSON.parse(presets), scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs }, titleTsx, softTsx, motionTsx, punchTsx });
        inventoryJsRef.current = inventoryJs;
        setStep("Checking clips");
        // The first read right after the app starts can fail while the Project is still loading: one retry.
        if (await loadInventory(projectId, () => alive) === "failed" && alive) {
          await new Promise((d) => setTimeout(d, INVENTORY_RETRY_MS));
          if (alive && projectRef.current === projectId) { setInvError(null); await loadInventory(projectId, () => alive); }
        }
      } catch (e: any) {
        if (alive) setStatus({ tone: "error", text: "Mini Vlog could not start: " + (e?.message || e) + ". Reinstall the plugin if this persists." });
      } finally { if (alive) setStep(""); }
    })();
    // Project switch or unmount stops a preview, including one still being prepared.
    return () => { alive = false; stopPreview(); };
  }, [projectId]);

  // Clips still being analysed (or none yet): re-read the inventory every 10 s until they are ready.
  // The effect re-arms on each new inventory, and stops on unmount, Project switch and while busy.
  // A Project with only photos has nothing to wait for, so it does not poll (each read measures new photos).
  // A partial read (`incomplete`: the Project was still loading) polls too, until the clip sizes are all known.
  const needsPoll = !!inventory && ((!!inventory.incomplete && !incompleteStalled) || inventory.skipped?.unanalysed > 0 || (inventory.resources.length === 0 && !inventory.photos?.length));
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

  // Fonts for the tiles and the live preview: every preset's fonts (four small files).
  React.useEffect(() => {
    if (!assets || !roots) return;
    // A font that fails to load only makes the preview fall back; the build reads the files again.
    for (const p of assets.presets.presets) for (const f of p.fonts) registerFace(roots.plugin, f).catch(() => null);
  }, [assets, roots]);
  // The preferred cue becomes the default once, when the manifest has it (a later choice is the user's).
  React.useEffect(() => {
    if (!assets || cueDefaultedRef.current) return;
    cueDefaultedRef.current = true;
    if (assets.manifest.cues.some((c: any) => c.id === PREFERRED_CUE)) setCueId((cur) => (cur === DEFAULT_CUE ? PREFERRED_CUE : cur));
  }, [assets]);

  // ---- Title fields ----
  const presetList: any[] = assets?.presets.presets || [];
  const chosen = presetList.find((x) => x.id === preset) || null;
  // A field's text: the user's edit, else the preset's initial text; the `@year` token becomes the current year.
  const fieldText = (presetId: string, fl: any) => {
    const v = fieldsBy[presetId]?.[fl.key] ?? fl.initial ?? "";
    return v === "@year" ? mvCurrentYear() : v;
  };
  const setField = (fl: any, value: string) => {
    const v = String(value).slice(0, fl.max);
    setFieldsBy((all) => ({ ...all, [preset]: { ...(all[preset] || {}), [fl.key]: v } }));
  };
  const titleFields: Record<string, string> = chosen ? Object.fromEntries(chosen.fields.map((fl: any) => [fl.key, fieldText(preset, fl)])) : {};
  const bigText = String(titleFields.big || "").trim();
  // The lockup items at canvas size, or null when the layout throws (the box then says the preview is unavailable).
  const previewItems: any[] | null = React.useMemo(() => {
    if (!chosen) return [];
    try {
      return mvLockupLayout({ preset, fields: titleFields, primary: chosen.colors.primary, secondary: chosen.colors.secondary, ...TITLE_LOOK,
        fonts: presetFonts(chosen, assets.presets) }, MV_W, MV_H);
    } catch { return null; }
  }, [chosen, preset, JSON.stringify(titleFields)]);

  // ---- Music, length and pace ----
  const musicKind: "cue" | "own" | "none" = cueId === "none" ? "none" : cueId === "own" ? "own" : "cue";
  const cue = musicKind === "cue" ? assets?.manifest.cues.find((c: any) => c.id === cueId) || null : null;
  const ownDuration = ownGrid && ownGrid.durationSeconds > 0 ? ownGrid.durationSeconds : null;
  // The music's grid. bpm is null without a beat (No music, or own music whose beat was not found); usableEnd is null
  // without music (no cap). onsets / onsetThresholds are the music's band onsets in music seconds (manifest or
  // beat-detect.cjs); the planner snaps the cuts to them. Own music without a reliable beat keeps its onsets: its
  // fixed-length cuts snap to bass onsets only. hookBars (bundled cues only) scores each bar start for Start at the hook.
  // approxBpm: own music whose grid beat-detect.cjs reports as 'approximate' (tight, but too few beats carry an onset):
  // its tempo and first beat time the fixed-length shots (planner mvApproxTempo); bpm stays null, so nothing else
  // treats it as a beat grid.
  const ownApprox = musicKind === "own" && ownGrid && !ownGrid.accepted && ownGrid.grid === "approximate" && ownGrid.bpm > 0;
  const grid: any = musicKind === "none" ? { bpm: null, accepted: false, approxBpm: null, firstBeat: 0, usableEnd: null, beatEnergy: [], peaks: [], onsets: NO_ONSETS, onsetThresholds: undefined, hookBars: null }
    : musicKind === "own" ? (ownGrid && ownGrid.accepted
      ? { bpm: ownGrid.bpm, accepted: true, approxBpm: null, firstBeat: ownGrid.firstBeat, usableEnd: ownDuration ? ownDuration - 0.5 : 0, beatEnergy: ownGrid.beatEnergy || [], peaks: ownGrid.peaks || [], onsets: ownGrid.onsets || NO_ONSETS, onsetThresholds: ownGrid.onsetThresholds, hookBars: null }
      : { bpm: null, accepted: false, approxBpm: ownApprox ? ownGrid.bpm : null, firstBeat: ownApprox ? ownGrid.firstBeat : 0, usableEnd: ownDuration ? ownDuration - 0.5 : 0, beatEnergy: [], peaks: ownGrid?.peaks || [], onsets: ownGrid?.onsets || NO_ONSETS, onsetThresholds: ownGrid?.onsetThresholds, hookBars: null })
    : cue ? { bpm: cue.bpm, accepted: true, approxBpm: null, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy || [], peaks: cue.peaks || [], onsets: cue.onsets || NO_ONSETS, onsetThresholds: cue.onsetThresholds, hookBars: cue.hookBars || null }
    : { bpm: null, accepted: false, approxBpm: null, firstBeat: 0, usableEnd: 0, beatEnergy: [], peaks: [], onsets: NO_ONSETS, onsetThresholds: undefined, hookBars: null };
  // A grid only for 70-160 bpm with an accepted detection (spec 14.1); otherwise fixed shot lengths, on the beat of an
  // approximate tempo when there is one (`tempo` is the grid's or that one, null for the 0.55 s fallback).
  const gridded = mvGridUsable({ bpm: grid.bpm, accepted: grid.accepted });
  const approxTempo = mvApproxTempo({ gridded, approxBpm: grid.approxBpm });
  const tempo = gridded ? grid.bpm : approxTempo;
  const guard: any = tempo ? mvBeatsPerShot(pace, tempo) : { beats: null, overridden: false };
  const shotSeconds = mvShotSeconds({ bpm: grid.bpm, beatsPerShot: guard.beats, pace, gridded, approxBpm: approxTempo });
  const requested = MV_LENGTHS[length];
  // Groove (spec 15.1) is decided as mvPlanBuild decides it: unless its tempo guard falls back to 2 beats per shot
  // (above 150 bpm), the length is a beat span of whole bars and shotSeconds is the seconds per beat. Its phrase
  // opener holds 2 beats, or 1 below 86 bpm (and 2 without a grid).
  const grooved = pace === "groove" && (tempo ? !!guard.groove : true);
  const opener = guard.groove ? guard.opener : 2;
  // Music capacity (spec 14.2): the most shots (a multiple of 4) that fit from the earliest start, or for Groove the
  // longest whole-bar span (mvGrooveFit, shots = its pattern count); the section slider then only offers starts where
  // that fits, so the plan's own music fit equals this.
  const grooveFit: any = grooved ? mvGrooveFit({ requested, sectionStart: tempo ? grid.firstBeat : 0, usableEnd: grid.usableEnd, beatSeconds: shotSeconds, opener }) : null;
  const fitted = grooved ? grooveFit.shots : mvFitShots({ requested, sectionStart: tempo ? grid.firstBeat : 0, usableEnd: grid.usableEnd, shotSeconds });
  // What the length asks for (Groove: the nominal span's pattern count, e.g. 25 shots for Standard) and the seconds of
  // the fitted and the asked-for video. Groove's shots vary in length, so its seconds are always beats x beat.
  const wanted = grooved ? mvGrooveSpan(requested, opener).shots : requested;
  const fittedSeconds = grooved ? grooveFit.beats * shotSeconds : fitted * shotSeconds;
  const wantedSeconds = grooved ? grooveFit.requestedBeats * shotSeconds : requested * shotSeconds;
  const videoSeconds = fitted ? fittedSeconds : wantedSeconds;
  // A plan's length in seconds, and whether the footage made it shorter than the music allows (Groove compares beat
  // spans: detected drum fills change its shot count inside the same span).
  const planSeconds = (p: any) => (p.groove ? p.groove.beats * shotSeconds : p.shots * shotSeconds);
  const planShort = (p: any) => (grooved ? !!p.groove && p.groove.beats < grooveFit.beats : p.shots < fitted);
  const snap = (value: number) => (musicKind === "none" ? 0
    : mvSnapSection({ value, firstBeat: grid.firstBeat, bpm: tempo, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: !!tempo }));
  // The section start the build uses; with music, every cut shifts with its frame-snapped start (planner mvMusicOffset).
  const start = musicKind === "none" ? 0 : snap(section ?? 0);
  const musicStart = musicKind === "none" ? null : start;
  // Onset snapping for every plan; without a reliable beat only bass onsets count, in a wider window.
  const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !gridded };

  // The hook window for the current length and pace (Start at the hook on a bundled track with a grid), else null.
  const hookSection = () => (hook && gridded && musicKind === "cue" ? mvHookSection({ hookBars: grid.hookBars, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, barPhaseBeats: cue?.barPhaseBeats }) : null);
  // A new track (or its grid) defaults the section to the most energetic window that fits; with Start at the hook,
  // to the track's best-scoring hook window that fits (spec 15.3), falling back to the energy default when the track
  // has no hook scores (your own music). Toggling Start at the hook picks the default again.
  // `assets` is a dependency so the default also applies once the manifest has loaded.
  React.useEffect(() => {
    if (musicKind === "none") return;
    if (!gridded) { setSection(snap(0)); return; }
    const hookAt = hookSection();
    setSection(hookAt ?? mvDefaultSection({ firstBeat: grid.firstBeat, bpm: grid.bpm, beatEnergy: grid.beatEnergy, usableEnd: grid.usableEnd, videoSeconds }) ?? snap(grid.firstBeat));
  }, [assets, cueId, ownMusic?.path, ownGrid, hook]);
  // A new length or pace keeps the chosen start and only re-clamps it.
  // With Start at the hook it moves to the hook window for the new length and pace instead.
  React.useEffect(() => { const hookAt = hookSection(); setSection((s) => hookAt ?? snap(s ?? 0)); }, [length, pace]);
  // A new track, section, length or pace makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [cueId, ownMusic?.path, section, length, pace]);

  async function detectOwnMusic(file: { path: string; name: string }) {
    if (busyRef.current || !roots) return;
    busyRef.current = true;
    setOwnMusic(file); setOwnGrid(null); setBusy(true); setStep("Listening for the beat");
    try {
      // The decoded PCM (up to ~32 MB) is only needed by beat-detect.cjs, so it is removed afterwards, keeping the exit status.
      // The result goes to a file (a long track's onsets come close to the 48 KB shell output cap); stdout says ok.
      const pcm = roots.data + "/own-music.f32";
      const cmd = TOOL_PATH + "ffmpeg -nostdin -v error -y -t 360 -i " + sq(file.path) + " -ac 1 -ar 22050 -f f32le " + sq(pcm) + " && node " + sq(roots.plugin + "/beat-detect.cjs") + " " + sq(pcm) + " 22050 " + sq(roots.data + "/own-music.json")
        + "; s=$?; rm -f " + sq(pcm) + "; exit $s";
      const r = await sdk.runShell({ summary: "Find the beat of " + file.name, command: cmd, timeoutMs: 120000, maxOutputBytes: 48000 });
      const done = JSON.parse(String(r.stdout || "").trim().split("\n").pop() || "{}");
      if (r.isError || r.exitCode !== 0 || done.error || !done.ok) throw new Error(done.error || r.stderr || "beat detection failed");
      const g = JSON.parse(await readText(roots.data, "own-music.json"));
      setOwnGrid(g);
      // What was found is shown under the file (ownBeatLine), next to where the music was chosen.
      setStatus(null);
    } catch (e: any) {
      // Without a grid the cuts use fixed timing, but the track's real length still bounds the section.
      let duration: number | null = null;
      try {
        const pr = await sdk.runShell({ summary: "Read the length of " + file.name, command: TOOL_PATH + "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " + sq(file.path), timeoutMs: 20000 });
        const v = parseFloat(String(pr?.stdout || "").trim());
        if (!pr?.isError && v > 0) duration = Math.min(v, 360);
      } catch { duration = null; }
      setOwnGrid({ accepted: false, grid: "none", failed: true, durationSeconds: duration, peaks: [] });
      setStatus(duration
        ? { tone: "info", text: "Music added; cuts use approximate timing (" + (e?.message || e) + ")." }
        : { tone: "error", text: "Could not read this music file (" + (e?.message || e) + "). Choose another file or one of the tracks." });
    } finally { busyRef.current = false; setBusy(false); setStep(""); }
  }

  // Section preview: "idle" -> "loading" (ffmpeg cut) -> "playing". Every start or stop bumps the token, so a late
  // result from a cancelled preparation is dropped.
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
    if ((!ownMusic && !cue) || !roots || start == null || musicKind === "none") return;
    stopPreview();
    const token = previewTokenRef.current;
    const live = () => previewTokenRef.current === token && mountedRef.current;
    setPlayState("loading");
    try {
      const file = ownMusic ? ownMusic.path : roots.plugin + "/assets/cues/" + cue.file;
      // The whole section, written to a file (stdout is too small for ~20 s) and read back as base64 text.
      // Earlier previews are removed first and the mp3 once encoded, so the data folder never collects them.
      const dur = videoSeconds, base = roots.data + "/preview-" + token;
      const cmd = TOOL_PATH + "rm -f " + sq(roots.data) + "/preview-*.mp3 " + sq(roots.data) + "/preview-*.b64; "
        + "ffmpeg -nostdin -v error -y -ss " + start.toFixed(2) + " -t " + dur.toFixed(2) + " -i " + sq(file)
        + " -ac 1 -ar 22050 -b:a 48k -af \"afade=t=out:st=" + Math.max(0, dur - 0.4).toFixed(2) + ":d=0.4\" -f mp3 " + sq(base + ".mp3")
        + " && base64 < " + sq(base + ".mp3") + " > " + sq(base + ".b64") + " && rm -f " + sq(base + ".mp3");
      const r = await sdk.runShell({ summary: "Preview music section", command: cmd, timeoutMs: 60000 });
      if (!live()) return;
      if (r?.isError || (r?.exitCode != null && r.exitCode !== 0)) throw new Error(r?.stderr || "the preview could not be cut");
      const b64 = (await readText(roots.data, "preview-" + token + ".b64")).replace(/\s+/g, "");
      // Best-effort cleanup of the encoded file; playback does not wait for it.
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

  async function findCandidates(rids: string[], pid: string, check: () => void, queries: Record<string, string>) {
    const list: any[] = []; const failed: string[] = [];
    // SEARCH_BATCH clips per call keeps each scene search under runScript's fixed 30 s deadline.
    // pageSize stays 4: hits are scene-level, so 8 adds almost no new times; the planner fills gaps with filler candidates.
    for (let i = 0; i < rids.length; i += SEARCH_BATCH) {
      // Only videos are searched (photos join without a search), so the count is in videos.
      advance("shots", i / rids.length, i + "/" + rids.length + (rids.length === 1 ? " video" : " videos") + " checked");
      const r = await run("Search shots", fill(assets.scripts.searchJs, { projectId: pid, rids: rids.slice(i, i + SEARCH_BATCH), queries, pageSize: 4 }), false, { wanted: () => projectRef.current === pid });
      check();
      list.push(...r.candidates); failed.push(...r.failed);
    }
    return { list, failed };
  }

  // Looks for the Draft a lost assemble reply may have saved, by its frozen name. Read-only: nothing is committed.
  // Uncommitted Drafts are never saved, so a Draft with this name holds a finished assembly. Only the
  // DRAFT_LOOKUP_MAX most recent Drafts are read, newest first, stopping at the first match, so a Project with many
  // Drafts stays inside the 30 s deadline. This assumes draftIds lists Drafts in creation order (newest last; DraftMeta
  // has no creation time to sort by). If that ever fails the lookup finds nothing and the original error shows: the
  // build is never duplicated.
  async function findDraftByName(pid: string, name: string) {
    const r = await run("Look for the new Draft", "const p = selects.project(" + JSON.stringify(pid) + ");\n"
      + "const name = " + JSON.stringify(name) + ";\n"
      + "const ids = ((await p.meta()).draftIds || []).slice(-" + DRAFT_LOOKUP_MAX + ").reverse();\n"
      + "for (const id of ids) {\n"
      + "  const d = selects.draft(id);\n"
      + "  const m = await d.meta();\n"
      + "  if (m.name !== name) continue;\n"
      + "  const end = (await d.clips({ trackScope: 'main' })).reduce((a, c) => Math.max(a, c.endFrame), 0);\n"
      + "  return { sequenceId: id, fps: m.fps, totalFrames: end };\n"
      + "}\n"
      + "return { sequenceId: null };", false, { wanted: () => projectRef.current === pid });
    return r && r.sequenceId ? r : null;
  }

  async function build(nextSeed: number) {
    if (busyRef.current || !assets || !inventory || inventory.incomplete || !roots || !chosen) return;
    // The gate for the seed this build uses (Build: seed; Create another version: seed + 1).
    const gate = nextSeed === seed ? blockReason : anotherBlock;
    if (gate) { setStatus({ tone: "error", text: gate }); return; }
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    // Every input as it is at Build. The build and a later "Finish title and look" read only this.
    const frozen = Object.freeze({
      pid, seed: nextSeed, preset, presetLabel: chosen.label, fields: { ...titleFields },
      music: musicKind, cueId, musicPath: musicKind === "own" ? ownMusic!.path : musicKind === "cue" ? roots.plugin + "/assets/cues/" + cue.file : null,
      sectionStart: musicStart, pace, length, requested, clipSound, soft, punch: beatPunch, hook: hook && musicKind === "cue", bpm: gridded ? grid.bpm : null, usePhotos, only, onlyPhotos,
      draftName: "Mini Vlog " + chosen.label + " " + stamp(new Date()),
    });
    busyRef.current = true;
    stopPreview();
    setBusy(true); setStatus(null); setResult(null);
    advance("shots", 0);
    try {
      // The scene search is cached per Project, clip selection and query set (the motion query runs only with Beat punch).
      const key = pid + "|" + JSON.stringify(only) + (frozen.punch ? "|motion" : "");
      const rids: string[] = inventory.resources.filter((r: any) => !only || only.includes(r.rid)).map((r: any) => r.rid);
      const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
      const cached = candidates && candidates.key === key ? candidates : null;
      // A build from photos alone has no videos to search; the step says so instead of a bare 0%.
      const shotsDetail = rids.length ? undefined : "photos only";
      if (shotsDetail) advance("shots", 0, shotsDetail);
      let found = cached;
      if (!cached || cached.failed.length) {
        // Search everything the first time; afterwards retry only the clips whose search failed.
        const todo: string[] = cached ? cached.failed : rids;
        const fresh = await findCandidates(todo, pid, check, mvSearchQueries(MV_QUERIES, frozen.punch));
        const retried = new Set(todo);
        found = { key, failed: fresh.failed,
          list: [...(cached ? cached.list.filter((c: any) => !retried.has(c.rid)) : []), ...fresh.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }))] };
        setCandidates(found);
      }
      advance("shots", 1, shotsDetail);
      // Photos join as candidates without a search; with Use photos off there are none (the planner would otherwise
      // retry with photos first).
      const photoCands = photoCandsOf(inventory, onlyPhotos, usePhotos);
      // Plan at 30 fps for allocation; assembly places the same cut seconds at the Draft's real rate. With Beat punch,
      // motion hits become a tie-break bonus on the role candidates first (mvMotionBonus).
      const plan: any = mvPlanBuild({ candidates: (frozen.punch ? mvMotionBonus(found.list) : found.list).concat(photoCands), bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm, fps: 30, pace, requested, sectionStart: musicStart, usableEnd: grid.usableEnd, ...snapCuts, seed: String(nextSeed) });
      if (!plan.ok) {
        const retry = found.failed.length ? " Could not check " + found.failed.length + (found.failed.length === 1 ? " video; press Build to retry it." : " videos; press Build to retry them.") : "";
        throw new Error((MV_FAIL[plan.reason] || "No plan fits this footage") + "." + (plan.reason === "too-few" ? " Add more varied footage" + (usePhotos ? " or photos" : "") + " or select more clips." : "") + retry);
      }
      advance("music", 0);
      const music = frozen.musicPath == null ? null
        : await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, path: frozen.musicPath }), true);
      check();
      // Cut seconds from the section start: the grid, or the onset-snapped cuts (planner mvSchedule `cuts`).
      const boundaries: number[] = plan.schedule.cuts;
      advance("music", 1);
      advance("draft", 0);
      // Photo sizes the inventory has not measured yet stay out; assemble.js measures those itself.
      const crops = Object.fromEntries([...inventory.resources, ...(inventory.photos || []).filter((r: any) => r.width > 0 && r.height > 0)]
        .map((r: any) => [r.rid, { width: r.width, height: r.height }]));
      let a: any = null, lost: any = null;
      try {
        a = await run("Assemble Mini Vlog", fill(assets.scripts.assembleJs, {
          projectId: pid, draftName: frozen.draftName, picks: plan.picks, boundaries, crops,
          music: music ? { resourceId: music.resourceId, sectionStart: frozen.sectionStart ?? 0 } : null, clipSound: frozen.clipSound, ambientDb: AMBIENT_DB }), true);
      } catch (e) { lost = e; }
      check();
      if (!a || !a.sequenceId) {
        // Never resend the commit: the reply may have been lost after the Draft was saved. Look for it by its name.
        let saved: any = null;
        try { saved = await findDraftByName(pid, frozen.draftName); } catch { saved = null; }
        check();
        if (!saved) throw lost || new Error("The Draft \"" + frozen.draftName + "\" may have been saved, but Selects did not report its id. Open it from the Drafts list, or build again.");
        a = { ...saved, notes: [...(a?.notes || []), "the Draft was found after its reply was lost"] };
      }
      if (!(a.totalFrames > 0)) throw new Error("The Draft \"" + frozen.draftName + "\" has no clips. Build again.");
      // The planner drops shots when the footage cannot fill them; tell the user the real length at the Draft fps.
      const shortened = planShort(plan) ? { shots: plan.shots, of: fitted, seconds: a.totalFrames / a.fps } : null;
      advance("draft", 1);
      const res = { sequenceId: a.sequenceId, videoEnd: a.totalFrames, fps: a.fps, decorated: false, frozen, plan, notes: a.notes || [], link: null, shortened, unchecked: found.failed.length };
      setResult(res);
      await decorate(res, check);
    } catch (e: any) {
      if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", text: stopAt(e) });
    } finally { endRun(pid); }
  }

  // Another version: same clips and cached scene search, a new seed. The previous result goes first, then the
  // build shows its steps from the start, like Build.
  function buildAnother() {
    if (busyRef.current) return;
    setResult(null); setStatus(null);
    const s = seed + 1;
    setSeed(s);
    build(s);
  }

  async function finishTitle() {
    if (busyRef.current || !result || !assets || !roots) return;
    const pid = projectId;
    if (result.frozen.pid !== pid) return;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    busyRef.current = true; stopPreview(); setBusy(true); setStatus(null);
    try { await decorate(result, check); }
    catch (e: any) { if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", text: stopAt(e) }); }
    finally { endRun(pid); }
  }

  // Commit 2 (mute the clips' own sound when Clip sound is Off, the title lockup, Soft look and photo motion), then
  // open the Draft. decorate.js skips what an earlier attempt already added, so a retry is safe.
  async function decorate(res: any, check: () => void) {
    advance("look", 0);
    const f = res.frozen;
    try {
      const p = assets.presets.presets.find((x: any) => x.id === f.preset);
      if (!p) throw new Error("the title preset " + f.preset + " is missing");
      // Only the chosen preset's fonts travel with the title, each with its advance metrics.
      const fonts = await Promise.all(presetFonts(p, assets.presets).map(async (x: any) => {
        const { file, ...face } = x;
        return { ...face, metrics: assets.presets.metrics[x.family] || null, b64: await fontB64(roots!.plugin, file) };
      }));
      check();
      // Text fields are flat Adjust keys (the layout reads data[key] first); `fields` keeps the Build-time text too.
      const flat: Record<string, string> = {};
      for (const fl of p.fields) flat[fl.key] = String(f.fields[fl.key] ?? "");
      const parameters = { preset: f.preset, ...flat, fields: { ...flat }, primary: p.colors.primary, secondary: p.colors.secondary, ...TITLE_LOOK, fonts,
        provenance: { plugin: PLUGIN_ID, version: PLUGIN_VERSION, preset: f.preset, cue: f.music === "cue" ? f.cueId : f.music, sectionStart: f.sectionStart, pace: f.pace, length: f.length,
          seed: f.seed, clipSound: f.clipSound, punch: f.punch, hook: f.hook, groove: res.plan.groove || null, picks: res.plan.picks } };
      const editableParameters = [
        ...p.fields.map((fl: any) => ({ key: fl.key, label: fl.label, type: "text", defaultValue: flat[fl.key] })),
        { key: "primary", label: "Main color", type: "color", defaultValue: p.colors.primary },
        { key: "secondary", label: "Second color", type: "color", defaultValue: p.colors.secondary },
        { key: "shadow", label: "Shadow", type: "number", defaultValue: TITLE_LOOK.shadow, min: 0, max: 1, step: 0.05 },
        { key: "size", label: "Size (%)", type: "number", defaultValue: TITLE_LOOK.size, min: 60, max: 160, step: 5 },
        { key: "x", label: "Horizontal position (%)", type: "number", defaultValue: TITLE_LOOK.x, min: 20, max: 80, step: 1 },
        { key: "y", label: "Vertical position (%)", type: "number", defaultValue: TITLE_LOOK.y, min: 20, max: 80, step: 1 },
        { key: "sparkles", label: f.preset === "mini-vlog" ? "Sparkles" : "Stars", type: "boolean", defaultValue: TITLE_LOOK.sparkles },
      ];
      // Photos in this Draft and a planned motion for each of them (the title restricts none).
      const photoRids = [...new Set(res.plan.picks.filter((k: any) => k && k.kind === "photo").map((k: any) => k.rid as string))];
      const sizes: Record<string, { width: number; height: number }> = { ...photoSizesRef.current };
      const moves: any[] = mvPhotoMotions(res.plan.picks, String(f.seed), sizes);
      const byRid: Record<string, any> = {};
      res.plan.picks.forEach((k: any, i: number) => {
        if (!moves[i]) return;
        const sz = sizes[k.rid];
        // The clip's cover-crop scale, so the motion's drift stays inside the photo.
        const cover = sz ? Math.max(MV_W / sz.width, MV_H / sz.height) / Math.min(MV_W / sz.width, MV_H / sz.height) : 1;
        byRid[k.rid] = { ...moves[i], cover };
      });
      // Beat punch (spec 15.2 b/c) on every video clip: punches on the bar downbeats at the Draft's real fps, or the
      // push-in only without a beat grid. decorate.js matches Main clip i to picks[i] and works out each clip's frames.
      const punch = f.punch ? { tsx: assets.punchTsx, strength: PUNCH_STRENGTH, push: PUNCH_PUSH, beatFrames: f.bpm ? 60 / f.bpm * res.fps : 0,
        punchFrames: mvPunchFrames({ bpm: f.bpm, fps: res.fps, sectionStart: f.sectionStart, videoEnd: res.videoEnd }), picks: res.plan.picks } : null;
      await run("Add title and look", fill(assets.scripts.decorateJs, { sequenceId: res.sequenceId, mute: f.clipSound === "off", videoEnd: res.videoEnd, title: { tsx: assets.titleTsx, parameters, editableParameters }, soft: f.soft ? { tsx: assets.softTsx, strength: SOFT_STRENGTH } : null, photos: photoRids, motion: { tsx: assets.motionTsx, strength: MOTION_STRENGTH, options: MOTION_OPTIONS, byRid }, photoEffects: true, punch }), true);
      check();
    } catch (e: any) {
      if (e === STALE) throw e;
      throw new Error("The Draft was created, but its title, look and clip sound are not applied yet: " + (e?.message || e) + ". Press Finish title and look to try again.");
    }
    // The title is saved from here on, so a failed open must not offer the retry.
    setResult((r: any) => ({ ...r, decorated: true }));
    advance("open", 0);
    try {
      const openScript = "const id = " + JSON.stringify(res.sequenceId) + ";\n"
        + "let link = null, openError = null;\n"
        + "try { link = (await selects.editor.linkToDraftFrame(id, 0)).deepLinkUrl; } catch (e) { link = null; }\n"
        + "try { await selects.editor.openDraft(id); } catch (e) { openError = String((e && e.message) || e); }\n"
        + "return { link, openError };";
      const o = await run("Open the new Draft", openScript);
      check();
      setResult((r: any) => ({ ...r, link: o.link || null }));
      if (o.openError) throw new Error(o.openError);
      advance("open", 1);
    } catch (e: any) {
      if (e === STALE) throw e;
      setStatus({ tone: "error", text: "The Draft is ready, but it could not be opened: " + (e?.message || e) + ". Use the link below or open it from the Drafts list." });
    }
  }

  // Clip selection ("Choose clips"): `only` holds rids in inventory order, or null for every clip.
  const allRids: string[] = inventory ? inventory.resources.map((r: any) => r.rid) : [];
  const selectedRids = only ? allRids.filter((rid) => only.includes(rid)) : allRids;
  const chooseClips = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allRids.filter((rid) => keep.has(rid));
    setOnly(ordered.length === allRids.length ? null : ordered);
    // A new selection needs a new scene search.
    setCandidates(null);
  };
  const toggleClip = (rid: string, on: boolean) => chooseClips(on ? [...selectedRids, rid] : selectedRids.filter((x) => x !== rid));
  // Photo selection: `onlyPhotos` in inventory order, or null for every photo. Photos are not searched, so choosing
  // them keeps the cached scene search.
  const photoList: any[] = inventory?.photos || [];
  const allPhotoRids: string[] = photoList.map((r: any) => r.rid);
  const selectedPhotoRids = onlyPhotos ? allPhotoRids.filter((rid) => onlyPhotos.includes(rid)) : allPhotoRids;
  const choosePhotos = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allPhotoRids.filter((rid) => keep.has(rid));
    setOnlyPhotos(ordered.length === allPhotoRids.length ? null : ordered);
  };
  const togglePhoto = (rid: string, on: boolean) => choosePhotos(on ? [...selectedPhotoRids, rid] : selectedPhotoRids.filter((x) => x !== rid));
  const usedPhotoCount = usePhotos ? selectedPhotoRids.length : 0;
  // Once a build has searched the current selection (or nothing needs searching: no video selected), plan it for the
  // readiness line, so the fitted shot count and a failure reason show before Build. The allocation depends on the
  // seed, so each button is gated with the seed it builds with: Build uses `seed`, Create another version `seed + 1`.
  const candKey = projectId + "|" + JSON.stringify(only) + (beatPunch ? "|motion" : "");
  const readyPlans: any = React.useMemo(() => {
    if (!inventory || !fitted) return { build: null, another: null };
    const searched = candidates && candidates.key === candKey ? candidates : null;
    if (!searched && selectedRids.length) return { build: null, another: null };
    const list = searched ? searched.list : [];
    const scored = beatPunch ? mvMotionBonus(list) : list;
    const planAt = (s: number) => {
      const p: any = mvPlanBuild({ candidates: scored.concat(photoCandsOf(inventory, onlyPhotos, usePhotos)), bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm, fps: 30, pace, requested, sectionStart: musicStart, usableEnd: grid.usableEnd, ...snapCuts, seed: String(s) });
      // A search with failed clips is retried by Build, so its shortfall does not block Build yet.
      return { ...p, retryable: !!(searched && searched.failed.length) };
    };
    return { build: planAt(seed), another: planAt(seed + 1) };
  }, [candidates, candKey, inventory, onlyPhotos, usePhotos, grid.bpm, grid.accepted, grid.approxBpm, grid.usableEnd, grid.onsets, pace, requested, musicStart, seed, fitted, selectedRids.length, beatPunch]);
  const readyPlan: any = readyPlans.build;
  // Why a build with this readiness plan cannot run (null when it can).
  const baseBlock: string | null = !inventory || !assets ? null
    : inventory.incomplete ? MV_SIZES_LOADING
    : !bigText ? "Type the title's big word to build."
    : musicKind === "own" && !ownMusic ? "Drop a music file, or choose one of the tracks."
    : musicKind === "own" && !ownDuration ? "The length of your music could not be read. Choose another file or one of the tracks."
    : musicKind !== "none" && (!fitted || start == null) ? MV_FAIL["music-too-short"] + "."
    : selectedRids.length + usedPhotoCount < 2 ? MV_FAIL["one-resource"] + "."
    : null;
  const blockFor = (plan: any) => baseBlock || (plan && !plan.ok && !plan.retryable ? MV_FAIL[plan.reason] + "." : null);
  const blockReason = blockFor(readyPlan);
  const anotherBlock = blockFor(readyPlans.another);
  const ready = !!inventory && !!assets && !!roots;
  const canBuild = ready && !blockReason;
  const canBuildAnother = ready && !anotherBlock;

  const pending = inventory?.skipped?.unanalysed || 0;
  const clipCount = [
    allRids.length ? (only ? selectedRids.length + " of " + allRids.length + " clips selected" : allRids.length + " clips") : "",
    usePhotos && allPhotoRids.length ? (onlyPhotos ? selectedPhotoRids.length + " of " + allPhotoRids.length + " photos selected" : allPhotoRids.length + " photos") : "",
  ].filter(Boolean).join(" · ");
  const plannedSeconds = readyPlan && readyPlan.ok ? planSeconds(readyPlan) : videoSeconds;
  const readiness = !inventory ? (invError ? (invError === MV_BUSY ? MV_BUSY : MV_INV_FAILED) : "Checking clips…")
    : inventory.incomplete && incompleteStalled ? MV_INV_PARTIAL
    : inventory.resources.length === 0 && !allPhotoRids.length && inventory.incomplete ? "Still reading this Project's clips… This updates automatically."
    : inventory.resources.length === 0 && !allPhotoRids.length ? (pending > 0
      ? pending + " clips are still being analysed. This updates automatically when they finish."
      : "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.")
    : inventory.resources.length === 0 && !usePhotos ? (pending > 0 ? pending + " clips are still being analysed. " : "") + "Turn on Use photos in Advanced to build from this Project's photos."
    : selectedRids.length === 0 && usedPhotoCount === 0 ? "No clips selected. Choose clips in Advanced."
    : "Ready: " + clipCount + " · about " + Math.round(plannedSeconds) + " s" + (pending ? " · " + pending + " clips still being analysed" : "");
  // Requested vs fitted shots (spec 14.2), then the footage's own fit once it is known.
  const fitLine = !assets ? null
    : musicKind !== "none" && !fitted ? MV_FAIL["music-too-short"] + "."
    : (grooved ? grooveFit.beats < grooveFit.requestedBeats : fitted < requested) ? LENGTH_LABELS[length] + ": " + fitted + " of " + wanted + " shots fit this track (" + fittedSeconds.toFixed(1) + " s)"
    : LENGTH_LABELS[length] + ": " + wanted + " shots (" + wantedSeconds.toFixed(1) + " s)";
  const footageLine = readyPlan && readyPlan.ok && planShort(readyPlan)
    ? "Your footage fits " + readyPlan.shots + " of " + fitted + " shots (" + planSeconds(readyPlan).toFixed(1) + " s)" : null;
  // The tempo guard's override, or fixed timing without a grid (spec 14.1). Groove's guards: below 86 bpm its phrase
  // opener holds 1 beat, above 150 bpm it plays 2 beats per shot.
  // Fixed timing without a grid: the shot length, or for Groove its 0.55 s beat and the 2-beat, 1-beat and 8th shots.
  const timing = grooved ? "Groove on a " + shotSeconds.toFixed(2) + " s beat: " + (2 * shotSeconds).toFixed(2) + ", " + shotSeconds.toFixed(2) + " and " + (shotSeconds / 2).toFixed(3) + " s shots"
    : shotSeconds.toFixed(2) + " s";
  const paceNote = !assets ? null
    : guard.overridden ? "At " + Math.round(tempo) + " bpm " + (pace === "quick" ? "Quick uses 2 beats per shot" : pace === "relaxed" ? "Relaxed uses 1 beat per shot"
      : guard.groove ? "Groove opens phrases with 1 beat" : "Groove uses 2 beats per shot") + "."
    : !gridded ? (musicKind === "none" ? "No music: shots use approximate timing (" + timing + ")."
      : musicKind === "own" && !ownGrid ? null
      : approxTempo ? "Tempo found (" + Math.round(approxTempo) + " bpm) but the beat is faint: cuts follow a " + Math.round(approxTempo) + " bpm grid approximately (" + timing + ")."
      : grid.accepted ? "Tempo outside 70\u2013160 bpm (" + Math.round(grid.bpm) + " bpm): shots use approximate timing (" + timing + ")."
      : "No steady beat found: shots use approximate timing (" + timing + ").")
    : null;
  // What the beat detection found in your own music, shown under the file (null while it runs, and after a failed
  // detection, whose reason goes to the status line).
  const ownBeatLine: string | null = musicKind !== "own" || !ownGrid || ownGrid.failed ? null
    : gridded ? "Beat found: " + Math.round(grid.bpm) + " bpm. Cuts follow the beat."
    : approxTempo ? "Tempo found (" + Math.round(approxTempo) + " bpm) but the beat is faint, so cuts follow a " + Math.round(approxTempo) + " bpm grid approximately."
    : (ownGrid.accepted || ownGrid.grid === "approximate") && ownGrid.bpm > 0 ? "Its tempo (" + Math.round(ownGrid.bpm) + " bpm) is outside 70\u2013160 bpm, so cuts use approximate timing."
    : "No steady beat found, so cuts use approximate timing.";
  const peaks: number[] = grid.peaks || [];
  const total = musicKind === "own" ? (ownDuration || 1) : (cue ? cue.duration : 1);
  const silent = musicKind === "none" && clipSound === "off";
  const canOwnMusic = tools.ffmpeg && tools.node;
  const cues: any[] = assets?.manifest.cues || [];
  const referenceCues = cues.filter((c) => c.group !== "alternative");
  const alternativeCues = cues.filter((c) => c.group === "alternative");
  const chooseTrack = (v: string) => { if (busyRef.current) return; setCueId(v); if (v !== "own") { setOwnMusic(null); setOwnGrid(null); } };
  // One row of the track list: a radio-style button that truncates its name and keeps the tempo visible.
  const trackRow = (value: string, label: string, meta: string) => {
    const on = cueId === value;
    return (
      <button key={value} type="button" role="radio" aria-checked={on} disabled={busy} onClick={() => chooseTrack(value)}
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", minWidth: 0, padding: "5px 8px", border: "none", borderRadius: "var(--panel-radius, 6px)", cursor: busy ? "default" : "pointer",
          color: "inherit", font: "inherit", textAlign: "left", background: on ? "color-mix(in srgb, var(--panel-accent, #f6c343) 18%, transparent)" : "transparent",
          boxShadow: on ? "inset 0 0 0 1px var(--panel-accent, #f6c343)" : "none", opacity: busy ? 0.6 : 1 }}>
        <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {meta ? <span style={{ flexShrink: 0, fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums" }}>{meta}</span> : null}
      </button>
    );
  };
  const bpmOf = (c: any) => Math.round(c.bpm) + " bpm";
  const tileFont = (p: any) => (p.fonts.find((x: any) => x.role === "big") || p.fonts[0]) as any;

  if (!projectId) return <ui.Message tone="error">Open a Project to build a Mini Vlog.</ui.Message>;

  return (
    <ui.Stack gap={16}>
      {inventory && invError ? <ui.Message tone="error">{invError === MV_BUSY ? MV_BUSY : "Could not refresh the clip list: " + invError}</ui.Message> : null}
      <ui.Section title="Title">
        <div role="group" aria-label="Title style" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {presetList.map((p) => {
            const on = p.id === preset, face = tileFont(p);
            return (
              <button key={p.id} type="button" aria-pressed={on} disabled={busy} onClick={() => setPreset(p.id)}
                style={{ flex: "1 1 80px", minWidth: 0, minHeight: 44, padding: "6px 6px", borderRadius: 8, cursor: busy ? "default" : "pointer", color: "inherit",
                  background: on ? "color-mix(in srgb, var(--panel-accent, #f6c343) 16%, transparent)" : "transparent", border: on ? "2px solid var(--panel-accent, #f6c343)" : "1px solid var(--panel-border, rgba(128, 128, 128, 0.45))",
                  fontFamily: '"' + face.family + '", ' + PREVIEW_FALLBACK, fontStyle: face.style, fontWeight: face.weight, fontSize: 15, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.label}
              </button>
            );
          })}
        </div>
        {/* Live preview: the same layout code as the Draft's title, over the middle of a 16:9 frame, in a box of fixed height. */}
        <div aria-label="Title preview" style={{ height: PREVIEW_HEIGHT, borderRadius: 8, overflow: "hidden", background: "linear-gradient(135deg, #3b3531, #1f1c1a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {assets && previewItems ? (
            <div style={{ position: "relative", width: "100%", height: PREVIEW_HEIGHT }}>
              {/* One SVG per shade layer, stacked, so "vlog" gets the lighter shadow like the Draft's title. */}
              {mvShadeLayers(previewItems).map((layer: any, l: number) => (
                <svg key={l} width="100%" height={PREVIEW_HEIGHT} viewBox={PREVIEW_VIEW} preserveAspectRatio="xMidYMid meet"
                  style={{ display: "block", position: "absolute", left: 0, top: 0, filter: "drop-shadow(0 1px " + 3 * layer.shade + "px rgba(0, 0, 0, " + TITLE_LOOK.shadow * layer.shade + "))" }}>
                  {layer.items.map((it: any, i: number) => (it.kind === "text"
                    ? <text key={i} x={it.x} y={it.y} fill={it.color} fontSize={it.size} fontFamily={'"' + it.font.family + '", ' + PREVIEW_FALLBACK} fontStyle={it.font.style} fontWeight={it.font.weight}
                      stroke={it.stroke > 0 ? it.color : undefined} strokeWidth={it.stroke} strokeLinejoin="round"
                      style={{ whiteSpace: "pre", fontKerning: "none", fontVariantLigatures: "none", letterSpacing: it.tracking } as any}>{it.text}</text>
                    : <path key={i} d={it.kind === "sparkle" ? mvSparklePath(it.x, it.y, it.size) : mvStarPath(it.x, it.y, it.size)} fill={it.color} />))}
                </svg>
              ))}
            </div>
          ) : <small style={{ color: "#d8d2cc" }}>{assets ? "Preview unavailable; the title is still added to the Draft." : "Loading…"}</small>}
        </div>
        {chosen ? chosen.fields.map((fl: any) => (
          <ui.TextField key={preset + ":" + fl.key} label={fl.label + " (" + fieldText(preset, fl).length + "/" + fl.max + ")"} value={fieldText(preset, fl)}
            disabled={busy} onChange={(v: string) => setField(fl, v)} />
        )) : null}
      </ui.Section>
      <ui.Section title="Music">
        <div role="radiogroup" aria-label="Track" style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          {referenceCues.map((c) => trackRow(c.id, c.label, bpmOf(c)))}
          {alternativeCues.length ? <small style={{ display: "block", margin: "4px 8px 0", fontSize: 11, color: "var(--panel-muted-fg)" }}>Alternatives</small> : null}
          {alternativeCues.map((c) => trackRow(c.id, c.label, bpmOf(c)))}
          {canOwnMusic ? trackRow("own", "Your own music", "") : null}
          {trackRow("none", "No music", "")}
        </div>
        {musicKind === "own" && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {ownBeatLine ? <ui.Message tone="muted">{ownBeatLine}</ui.Message> : null}
        {!canOwnMusic ? <ui.Message tone="muted">Install ffmpeg and Node.js 18+ to preview music or use your own track.</ui.Message> : null}
        {musicKind !== "none" ? (ownMusic || cue ? (
          // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
          <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
            <SectionSlider peaks={peaks} total={total} section={start} videoSeconds={videoSeconds} barSeconds={tempo ? (4 * 60) / tempo : 1}
              snap={snap} onChange={setSection} disabled={busy} audio={playingAudio} />
            <ui.Row gap={8} align="center">
              {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
              <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                label={playState === "playing" ? "Stop preview" : playState === "loading" ? "Cancel preview" : "Preview this section"}
                onClick={preview} disabled={busy || !tools.ffmpeg || (playState === "idle" && start == null)} />
              <span>{musicKind === "own" && !ownDuration ? (busy ? "Reading the music…" : "The length of this music is unknown")
                : start == null ? "This track is too short for this length" : "Starts at " + start.toFixed(1) + " s"}</span>
            </ui.Row>
            {musicKind === "cue" ? <ui.Toggle label="Start at the hook" value={hook} onChange={setHook} disabled={busy} /> : null}
          </div>
        ) : null) : null}
      </ui.Section>
      <ui.Section title="Length">
        <ui.Segmented label="Length" value={length} onChange={(v: any) => setLength(v)} disabled={busy}
          options={[{ label: "Short", value: "short" }, { label: "Standard", value: "standard" }, { label: "Long", value: "long" }]} />
        <ui.Segmented label="Pace" value={pace} onChange={(v: any) => setPace(v)} disabled={busy}
          options={[{ label: "Quick", value: "quick" }, { label: "Relaxed", value: "relaxed" }, { label: "Groove", value: "groove" }]} />
        {fitLine ? <ui.Message tone="muted">{fitLine}</ui.Message> : null}
        {footageLine ? <ui.Message tone="muted">{footageLine}</ui.Message> : null}
        {paceNote ? <ui.Message tone="muted">{paceNote}</ui.Message> : null}
        <ui.Row gap={8} align="center">
          <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
          <ui.Button variant="ghost" busy={invLoading} busyLabel="Refreshing" disabled={busy || !assets} onClick={refreshInventory}>Refresh</ui.Button>
        </ui.Row>
        {!inventory && invError && invError !== MV_BUSY ? <ui.Message tone="muted">{"Details: " + invError}</ui.Message> : null}
      </ui.Section>
      <ui.Section title="Advanced">
        <ui.Segmented label="Clip sound" value={clipSound} onChange={(v: any) => setClipSound(v)} disabled={busy}
          options={[{ label: "Off", value: "off" }, { label: "Ambient", value: "ambient" }, { label: "Full", value: "full" }]} />
        <ui.Toggle label="Soft look" value={soft} onChange={setSoft} disabled={busy} />
        <ui.Toggle label="Beat punch" value={beatPunch} onChange={setBeatPunch} disabled={busy} />
        <ui.Toggle label="Use photos" value={usePhotos} onChange={setUsePhotos} disabled={busy} />
        {silent ? <ui.Message tone="muted">Silent video: no music and Clip sound is Off.</ui.Message> : null}
        {inventory && (allRids.length || allPhotoRids.length) ? (
          <div role="group" aria-label="Choose clips" style={{ minWidth: 0 }}>
            <ui.Row gap={4} align="center">
              <small style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {"Choose clips (" + (selectedRids.length + selectedPhotoRids.length) + "/" + (allRids.length + allPhotoRids.length) + ")"}
              </small>
              <ui.Button variant="ghost" disabled={busy || (!only && !onlyPhotos)} onClick={() => { chooseClips(allRids); choosePhotos(allPhotoRids); }}>All</ui.Button>
              <ui.Button variant="ghost" disabled={busy || selectedRids.length + selectedPhotoRids.length === 0} onClick={() => { chooseClips([]); choosePhotos([]); }}>None</ui.Button>
            </ui.Row>
            {/* One row per clip: the name truncates, duration and shape stay visible; long lists scroll inside. */}
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
              {/* Photos follow the clips, marked "Photo"; they are unavailable while Use photos is off. */}
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
      {progress ? <ui.Progress value={progress.value} label={progress.label} steps={MV_BUILD_STEPS.map((s) => s.label)} current={progress.current} />
        : busy ? <ui.Progress label={step || "Working"} /> : null}
      {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.text}</ui.Message> : null}
      {result && result.decorated ? (
        <ui.Message tone="success">
          {"Draft created. Select the title to edit its words, colors, size or position, a clip to adjust its crop, softness, motion or sound level, and the music to change its volume. Rebuilding creates a new Draft and does not keep Inspector edits."}
        </ui.Message>
      ) : result && busy ? <ui.Message tone="muted">Draft created; adding title and look…</ui.Message>
        : result ? <ui.Message tone="muted">Draft created, but its title, look and clip sound are not applied yet.</ui.Message> : null}
      {result?.link ? (
        <ui.Row gap={8} align="center">
          <a href={result.link} target="_blank" rel="noreferrer">Open the new Draft</a>
          <ui.IconButton icon="copy" label="Copy the link to the new Draft" onClick={() => { navigator.clipboard?.writeText(result.link).catch(() => null); }} />
        </ui.Row>
      ) : null}
      {result?.shortened ? (
        <ui.Message tone="muted">
          {"Your footage fits " + result.shortened.shots + " of " + result.shortened.of + " shots, so this video is about " + result.shortened.seconds.toFixed(1) + " s. Add more clips or photos for the full length."}
        </ui.Message>
      ) : null}
      {result?.notes?.length ? <ui.Message tone="muted">{"Note: " + result.notes.join("; ") + "."}</ui.Message> : null}
      {result?.unchecked ? <ui.Message tone="muted">{"Could not check " + result.unchecked + (result.unchecked === 1 ? " video; it was" : " videos; they were") + " skipped. Build again to retry " + (result.unchecked === 1 ? "it." : "them.")}</ui.Message> : null}
      {blockReason && !busy ? <ui.Message tone="muted">{blockReason}</ui.Message> : null}
      <ui.Message tone="muted">Creates a new 16:9 Draft</ui.Message>
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={finishTitle} disabled={busy}>Finish title and look</ui.Button> : null}
        {result ? <ui.Button onClick={buildAnother} disabled={busy || !canBuildAnother}>Create another version</ui.Button> : null}
        <ui.Button variant="primary" busy={busy} busyLabel={step || "Building"} onClick={() => build(seed)} disabled={busy || !canBuild}>Build</ui.Button>
      </ui.Actions>
    </ui.Stack>
  );
}
