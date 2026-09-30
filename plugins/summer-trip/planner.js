// Summer Trip planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
// Structure (beats from the section start, spec section 2.1 / 15): an 8-beat title over one opener shot, a 2x2 grid
// build on 8th notes from the drop (beat 8), the place shot revealed under the grid and held to beat 14, a montage of
// N shots (2 beats each, one pair of 3-beat holds), and an 8-beat film-frame ending of three shots (leak pulses at
// +2 and +5.5, a warm end flare at +7).
// Every frame comes from one expression, F(b) = round((b * 60 / bpm + delta) * fps) with F(0) = 0 (stFrameSchedule).

const ST_W = 1920;
const ST_H = 1080;
const ST_TITLE_BEATS = 8;
const ST_DROP_BEAT = 8;
const ST_TITLE_FIRST_WORD = 0.5; // the first title word (the picture starts clean)
const ST_TITLE_SEASON_BEAT = 5;  // the first part of the season word; complete one beat later, with the labels
const ST_GRID_STATES = [8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5];
// Grid overlay clips A-D: one quadrant each, in contract order.
const ST_GRID = [
  { quad: 'TL', a: 8, b: 10 },
  { quad: 'TR', a: 8.5, b: 10.5 },
  { quad: 'BR', a: 9, b: 11 },
  { quad: 'BL', a: 9.5, b: 11.5 },
];
const ST_OPENER_END = 9.5;      // the opener stays on Main under the first quadrants; the place shot starts here
const ST_PLACE_TITLE = 12;
const ST_MONTAGE_START = 14;
const ST_ENDING_BEATS = 8;
const ST_ENDING_SHOTS = [0, 2, 4]; // ending shot starts relative to the ending start
const ST_LEAK_HALF = 0.25;       // light leak spans the ending cut +/- this many beats
const ST_PULSES = [2, 5.5, 7];   // leak pulses relative to the ending start; the last is the warm end flare
const ST_FADE_BEATS = 0.5;       // picture and music fade over the last half beat
const ST_LENGTHS = { short: 6, standard: 8, long: 12 };
const ST_MIN_MONTAGE = 4;
const ST_MAX_MONTAGE = 12;
const ST_MIN_DISTINCT = 6;       // opener, place and grid A-D are six different resources
const ST_FIXED_BPM = 120;        // no grid: a fixed 0.5 s beat
const ST_OCTAVE_TARGET = 120;
const ST_OCTAVE_MIN = 70;
const ST_SECTION_END_MARGIN = 0.5; // start + total + this <= cue duration
const ST_SEASONS = ['WINTER', 'WINTER', 'SPRING', 'SPRING', 'SPRING', 'SUMMER', 'SUMMER', 'SUMMER', 'AUTUMN', 'AUTUMN', 'AUTUMN', 'WINTER'];
const ST_DEFAULT_SEASON = 'SUMMER';

// Footage.
const ST_MONTAGE_ROLES = ['beach', 'town', 'water', 'street', 'food', 'landmark', 'people', 'detail'];
const ST_QUERIES = {
  opener: 'a wide view of the sea, coast or beach on a sunny day',
  grid: 'a colourful summer travel scene: beach, boats, streets or cafes',
  place: 'a wide view of a coastal town, harbour or landmark',
  beach: 'people on a sunny beach with umbrellas',
  town: 'colourful houses in a coastal town',
  water: 'boats or water in a harbour or the sea',
  street: 'a narrow sunny street or alley',
  food: 'an ice cream, drink or food on a summer day',
  landmark: 'a church, landmark or viewpoint',
  people: 'people walking or relaxing on holiday',
  detail: 'a summer detail close up',
  ending: 'golden sunset light over the sea or a town',
};
// Which candidate roles may fill a slot role, best first (the role's neighbours).
const ST_ROLE_FALLBACK = {
  opener: ['opener', 'place', 'beach', 'water', 'ending'],
  place: ['place', 'town', 'landmark', 'opener', 'water'],
  grid: ['grid', 'beach', 'town', 'street', 'food', 'water', 'people', 'detail', 'landmark'],
  beach: ['beach', 'opener', 'water', 'people'],
  town: ['town', 'place', 'street', 'landmark'],
  water: ['water', 'beach', 'opener', 'place'],
  street: ['street', 'town', 'people', 'detail'],
  food: ['food', 'detail', 'people'],
  landmark: ['landmark', 'place', 'town'],
  people: ['people', 'beach', 'street'],
  detail: ['detail', 'food', 'street'],
  ending: ['ending', 'opener', 'water', 'beach', 'place'],
};
// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates (at most ST_FILLER_MAX per source, so long sources stay cheap). They rank below real hits of a
// source with the same use count.
const ST_FILLER_STEP = 0.5;
const ST_FILLER_EDGE = 0.25;
const ST_FILLER_SCORE = -2;
const ST_FILLER_MAX = 48;
// Seeded spread for the opener, place and grid picks: live scene-search scores of the good hits for a role sit within
// about 0.1 of each other (0.2-0.56 overall), so another version can swap between them without taking weak hits.
const ST_FIXED_JITTER = 0.12;
const ST_FIXED_ROLE_PENALTY = 0.04;
// A video window ends at least this far before the end of its source.
const ST_SOURCE_TAIL = 0.15;
// Windows taken from one source keep at least this gap (unless the last-resort overlap pass needs them).
const ST_WINDOW_GAP = 0.5;
// Photos have no scene search and hold at most 5 s (from 0). About ST_PHOTO_SHARE of the montage + ending slots are
// photo slots; at most ST_PHOTO_RUN_MAX photos play in a row on Main while anything else fits.
const ST_PHOTO_HOLD_MAX = 5;
const ST_PHOTO_RUN_MAX = 2;
const ST_PHOTO_SHARE = 1 / 3;

// ---------------------------------------------------------------------------------------------------------------
// Beat schedule

// Montage shot lengths in beats: 2 each, except 1-based shots ceil(N/2)+1 and ceil(N/2)+2, which hold 3 beats.
function stMontageBeats(n) {
  if (!(Number.isInteger(n) && n >= 2)) throw Error('stMontageBeats needs an integer N >= 2');
  const h = Math.ceil(n / 2) + 1;
  const out = [];
  for (let i = 1; i <= n; i++) out.push(i === h || i === h + 1 ? 3 : 2);
  return out;
}

function stTotalBeats(n) { return ST_MONTAGE_START + 2 * n + 2 + ST_ENDING_BEATS; }
function stTotalSeconds(bpm, n) { return stTotalBeats(n) * 60 / bpm; }

// The whole event schedule in beats (internal contract "Beat schedule").
function stSchedule(opts) {
  const n = opts && opts.montageShots;
  const montageBeats = stMontageBeats(n);
  const M = montageBeats.reduce((a, b) => a + b, 0);
  const E = ST_MONTAGE_START + M;
  const mainBeats = [0, ST_OPENER_END, ST_MONTAGE_START];
  let at = ST_MONTAGE_START;
  for (let i = 0; i < n - 1; i++) { at += montageBeats[i]; mainBeats.push(at); }
  for (const k of ST_ENDING_SHOTS) mainBeats.push(E + k);
  mainBeats.push(E + ST_ENDING_BEATS);
  return {
    montageShots: n,
    montageBeats,
    mainBeats,
    grid: ST_GRID.map(g => ({ quad: g.quad, a: g.a, b: g.b })),
    gridStates: ST_GRID_STATES.slice(),
    title: [0, ST_TITLE_BEATS],
    labels: [[ST_TITLE_SEASON_BEAT + 1, ST_TITLE_BEATS], [ST_PLACE_TITLE, E]],
    place: [ST_PLACE_TITLE, ST_MONTAGE_START],
    endingStart: E,
    end: E + ST_ENDING_BEATS,
    fadeStart: E + ST_ENDING_BEATS - ST_FADE_BEATS,
    leak: { a: E - ST_LEAK_HALF, b: E + ST_LEAK_HALF },
    pulses: ST_PULSES.map(p => E + p),
    anchors: [ST_DROP_BEAT, ST_MONTAGE_START, E],
  };
}

// Where the music's beats land on the timeline. Selects snaps the music's source start (sectionStart) to a timeline
// frame, so the music plays offset by delta = sectionStart - round(sectionStart * fps) / fps (at most half a frame).
function stMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

// The one frame schedule (spec 15.3). snaps: { [anchorBeat]: seconds from the section start } (own music only). A
// snapped anchor moves every event defined at that beat; the light leak is defined around the ending cut, so it
// moves with a snapped ending start. Durations are always differences of F, never multiplied frame counts.
function stFrameSchedule(opts) {
  const s = opts.schedule, bpm = opts.bpm, fps = opts.fps;
  const delta = typeof opts.delta === 'number' && isFinite(opts.delta) ? opts.delta : 0;
  if (!s || !(bpm > 0) || !(fps > 0)) throw Error('stFrameSchedule needs schedule, bpm and fps');
  const snaps = {};
  for (const key of Object.keys(opts.snaps || {})) {
    const v = opts.snaps[key];
    if (v == null) continue;
    const b = Number(key);
    if (s.anchors.indexOf(b) < 0) throw Error('stFrameSchedule: beat ' + key + ' is not an anchor and may not snap');
    if (typeof v !== 'number' || !isFinite(v)) throw Error('stFrameSchedule: snap for beat ' + key + ' is not a number');
    snaps[b] = v;
  }
  const gridSec = b => b * 60 / bpm;
  const secOf = b => (Object.prototype.hasOwnProperty.call(snaps, b) ? snaps[b] : gridSec(b));
  const frameOfSec = x => Math.round((x + delta) * fps);
  const F = b => (b === 0 ? 0 : frameOfSec(secOf(b)));
  const E = s.endingStart;
  const cuts = {};
  s.mainBeats.concat(s.gridStates).forEach(b => { cuts[b] = true; });
  const report = Object.keys(cuts).map(Number).sort((a, b) => a - b).map(b => {
    const frame = F(b), planned = b === 0 ? 0 : secOf(b);
    return {
      beat: b,
      gridSeconds: gridSec(b) + delta,
      plannedSeconds: planned + delta,
      frame,
      quantErrorSeconds: frame / fps - (planned + delta),
      snapped: Object.prototype.hasOwnProperty.call(snaps, b),
    };
  });
  return {
    fps,
    bpm,
    delta,
    snaps,
    mainFrames: s.mainBeats.map(F),
    grid: s.grid.map(g => ({ quad: g.quad, a: g.a, b: g.b, aFrame: F(g.a), bFrame: F(g.b) })),
    gridStateFrames: s.gridStates.map(F),
    titleFrames: s.title.map(F),
    labelsFrames: s.labels.map(span => span.map(F)),
    placeFrames: s.place.map(F),
    endingFrame: F(E),
    endFrame: F(s.end),
    fadeStartFrame: F(s.fadeStart),
    // The leak is defined around the ending cut: a snapped ending start carries it along.
    leakFrames: [s.leak.a, s.leak.b].map(b => (Object.prototype.hasOwnProperty.call(snaps, E) ? frameOfSec(snaps[E] + (b - E) * 60 / bpm) : F(b))),
    pulseFrames: s.pulses.map(F),
    report,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Title

function stChars(text) { return Array.from(String(text == null ? '' : text)); }

// Title typing schedule (spec 4.2 / 15.8), in beats from the section start. The title starts on a clean picture (the
// reference's first word lands half a beat in): line 1 up to 4 words, one word per beat on the off-beats (0.5, 1.5,
// 2.5, 3.5); 5 or more: one per 8th note from 0.5 (words past the 7th share the last slot at 3.5). Season: the first
// ceil(len/2) letters at 5 when it has at least 4 letters (else the whole word at 5), complete at 6. Labels at 6
// (reference at 120 BPM: that 0.46, one 1.6, trip 2.74, in 3.86, SUM 5.06, SUMMER 6.14 beats). The drop stays at 8.
// titleHits (a bundled cue's measured beats: 4 word hits + 2 season hits, sorted, finite, in [0, 8)) replace the
// word and season times when line 1 has at most 4 words.
function stTitleSchedule(line1, season, titleHits) {
  const words = String(line1 == null ? '' : line1).trim().split(/\s+/).filter(Boolean);
  const len = stChars(String(season == null ? '' : season).trim()).length;
  const hitsOk = Array.isArray(titleHits) && titleHits.length === 6 &&
    titleHits.every((h, i) => typeof h === 'number' && isFinite(h) && h >= 0 && h < ST_TITLE_BEATS && (i === 0 || h > titleHits[i - 1]));
  const useHits = hitsOk && words.length <= 4;
  let wordBeats;
  if (useHits) wordBeats = words.map((_, i) => titleHits[i]);
  else if (words.length <= 4) wordBeats = words.map((_, i) => ST_TITLE_FIRST_WORD + i);
  else wordBeats = words.map((_, i) => ST_TITLE_FIRST_WORD + Math.min(i, 6) * 0.5);
  return {
    words,
    wordBeats,
    seasonPartBeat: useHits ? titleHits[4] : ST_TITLE_SEASON_BEAT,
    seasonPartLength: len >= 4 ? Math.ceil(len / 2) : len,
    seasonFullBeat: useHits ? titleHits[5] : ST_TITLE_SEASON_BEAT + 1,
    // Labels never come before the full season word (a cue's second season hit can fall after beat 5).
    labelsBeat: useHits ? Math.max(5, titleHits[5]) : ST_TITLE_SEASON_BEAT + 1,
    source: useHits ? 'hits' : words.length <= 4 ? 'beats' : 'eighths',
  };
}

// Title times in seconds from the title graphic's start (frame 0), frame-aligned with the same F as every cut.
function stTitleTimes(title, bpm, delta, fps) {
  const d = typeof delta === 'number' && isFinite(delta) ? delta : 0;
  const t = b => (b === 0 ? 0 : Math.round((b * 60 / bpm + d) * fps)) / fps;
  return {
    wordTimes: title.wordBeats.map(t),
    seasonPartTime: t(title.seasonPartBeat),
    seasonPartLength: title.seasonPartLength,
    seasonFullTime: t(title.seasonFullBeat),
    labelsTime: t(title.labelsBeat),
  };
}

// Season word from capture months (numbers 1-12, or ISO-like date strings "YYYY-MM..."). The most common month
// decides; a tie between months, or no known month, gives SUMMER.
function stSeasonFor(months) {
  const counts = Array(12).fill(0);
  for (const m of Array.isArray(months) ? months : []) {
    let k = null;
    if (typeof m === 'number' && Number.isInteger(m) && m >= 1 && m <= 12) k = m;
    else if (typeof m === 'string') {
      const r = /^\s*\d{4}-(\d{2})/.exec(m);
      if (r && Number(r[1]) >= 1 && Number(r[1]) <= 12) k = Number(r[1]);
    }
    if (k !== null) counts[k - 1]++;
  }
  const top = Math.max.apply(null, counts);
  if (!(top > 0)) return ST_DEFAULT_SEASON;
  const best = [];
  counts.forEach((c, i) => { if (c === top) best.push(i); });
  return best.length === 1 ? ST_SEASONS[best[0]] : ST_DEFAULT_SEASON;
}

// ---------------------------------------------------------------------------------------------------------------
// Music: tempo octave and sections

// The tempo used for cutting: bpm/2, bpm or 2*bpm, whichever is closest to 120 in log scale (ties keep bpm). Below 70
// after that, or no tempo: null (fixed timing).
function stOctave(bpm) {
  if (typeof bpm !== 'number' || !isFinite(bpm) || !(bpm > 0)) return null;
  let best = bpm;
  for (const c of [bpm / 2, bpm * 2]) {
    if (Math.abs(Math.log(c / ST_OCTAVE_TARGET)) < Math.abs(Math.log(best / ST_OCTAVE_TARGET)) - 1e-12) best = c;
  }
  return best < ST_OCTAVE_MIN ? null : best;
}

// The drop section's start in seconds for a cue, or null. cue: { bpm, firstBeat (s), dropSeconds? | dropBeat? (beats
// from firstBeat) }. The drop section starts 8 beats before the drop.
function stDropStart(cue) {
  if (!cue || !(cue.bpm > 0)) return null;
  const beat = 60 / cue.bpm, first = typeof cue.firstBeat === 'number' && isFinite(cue.firstBeat) ? cue.firstBeat : 0;
  if (typeof cue.dropSeconds === 'number' && isFinite(cue.dropSeconds)) return cue.dropSeconds - ST_DROP_BEAT * beat;
  if (typeof cue.dropBeat === 'number' && isFinite(cue.dropBeat)) return first + (cue.dropBeat - ST_DROP_BEAT) * beat;
  return null;
}

// Usable length of a cue: its duration, but never past the last onset + 0.5 s (usableEnd) when that is known, so a
// section never ends in the silent tail of a file.
function stCueDuration(cue) {
  const hasDur = typeof cue.duration === 'number' && isFinite(cue.duration);
  const hasEnd = typeof cue.usableEnd === 'number' && isFinite(cue.usableEnd);
  if (hasDur && hasEnd) return Math.min(cue.duration, cue.usableEnd + ST_SECTION_END_MARGIN);
  if (hasDur) return cue.duration;
  if (hasEnd) return cue.usableEnd + ST_SECTION_END_MARGIN;
  return 0;
}

// Latest start that fits N montage shots: start + total + 0.5 s <= duration.
function stLatestStart(cue, n) { return stCueDuration(cue) - ST_SECTION_END_MARGIN - stTotalSeconds(cue.bpm, n); }

// Bar grid the slider snaps to: through the drop section when the cue has one, else from the first beat.
function stSectionBase(cue) {
  const drop = stDropStart(cue);
  const bar = 4 * 60 / cue.bpm;
  const base = drop !== null ? drop : (typeof cue.firstBeat === 'number' && isFinite(cue.firstBeat) ? cue.firstBeat : 0);
  // The earliest non-negative start on that bar grid.
  return base - Math.floor(base / bar + 1e-9) * bar;
}

// Snaps a slider value to the bar grid within [0, latest start]. Returns { start, kind: 'drop' | 'section', moved }
// or null when nothing fits. `moved` is true when the value had to move past the end of the cue.
function stClampSection(opts) {
  const cue = opts.cue, n = opts.montageShots;
  if (!cue || !(cue.bpm > 0)) return null;
  const bar = 4 * 60 / cue.bpm, base = stSectionBase(cue), latest = stLatestStart(cue, n);
  const maxK = Math.floor((latest - base) / bar + 1e-9);
  if (maxK < 0) return null;
  const value = typeof opts.value === 'number' && isFinite(opts.value) ? opts.value : base;
  const want = Math.round((value - base) / bar);
  const k = Math.max(0, Math.min(maxK, want));
  const start = base + k * bar, drop = stDropStart(cue);
  return { start, kind: drop !== null && Math.abs(start - drop) < 1e-6 ? 'drop' : 'section', moved: want > maxK };
}

// Default section for a cue and N montage shots (spec 15.5): the drop section (dropBeat - 8) when it fits, else the
// latest fitting start (note says so). Without a drop: the highest-energy bar-aligned window (cue.beatEnergy, one
// value per beat from firstBeat), else the first beat. Returns { start, kind, clamped, note } or null.
function stDefaultSection(cue, n) {
  if (!cue || !(cue.bpm > 0)) return null;
  const beat = 60 / cue.bpm, latest = stLatestStart(cue, n);
  const drop = stDropStart(cue);
  if (drop !== null && drop >= -1e-6 && drop <= latest + 1e-6) return { start: Math.max(0, drop), kind: 'drop', clamped: false, note: null };
  if (drop !== null) {
    const c = stClampSection({ cue, montageShots: n, value: drop });
    if (!c) return null;
    // A drop within the first 8 beats of the file: its section would start before the file, so the earliest bar
    // start is used and the title runs over the track's first two bars instead of the build-up.
    const note = drop < -1e-6 ? 'The drop is too close to the start of the track; the title runs over the first two bars'
      : 'The drop section does not fit this length; moved to the latest start that fits';
    return { start: c.start, kind: c.kind, clamped: true, note };
  }
  const first = typeof cue.firstBeat === 'number' && isFinite(cue.firstBeat) ? cue.firstBeat : 0;
  let start = null;
  if (Array.isArray(cue.beatEnergy) && cue.beatEnergy.length) {
    const span = stTotalBeats(n);
    let best = null;
    for (let k = 0; ; k++) {
      const s = first + k * 4 * beat;
      if (s > latest + 1e-6) break;
      const slice = cue.beatEnergy.slice(k * 4, k * 4 + span);
      if (slice.length < span) break;
      const mean = slice.reduce((a, b) => a + b, 0) / span;
      if (!best || mean > best.mean + 1e-9) best = { s, mean };
    }
    if (best) start = best.s;
  }
  if (start === null) start = first;
  const c = stClampSection({ cue, montageShots: n, value: start });
  return c ? { start: c.start, kind: c.kind, clamped: c.moved, note: null } : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Onset snapping for anchors (own music only; bundled cues never snap). The pick rule is City Weekend Vlog's
// conservative snap: an anchor stays on the grid when a qualifying onset of any band lies within one frame of it;
// otherwise the candidate must reach ST_SNAP_MIN_RATIO of its band threshold, candidates rank by ratio - cost *
// |offset| / window, and a low-band candidate must also beat the grid position's own onset by ST_SNAP_LOW_MARGIN.
const ST_SNAP_WINDOW_BEATS = 0.10;
const ST_SNAP_WINDOW_MAX = 0.070;
const ST_SNAP_MIN_STRENGTH = 2;
const ST_SNAP_MIN_RATIO = 1.5;
const ST_SNAP_DISTANCE_COST = 0.5;
const ST_SNAP_LOW_MARGIN = 0.25;
const ST_SNAP_MIN_FRAMES = 4;
const ST_SNAP_MIN_SHARE = 0.75;
const ST_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

// schedule: stSchedule output. onsets: [[seconds in the music source, 'l' | 'm' | 'h', strength], ...].
// opts: { bpm, fps, sectionStart, delta?, thresholds?: { l, m, h }, lowConfidence?, bundled? }.
// Returns { snaps: { [anchorBeat]: seconds from the section start }, log }.
function stSnapAnchors(schedule, onsets, opts) {
  const log = [];
  if (opts.bundled) return { snaps: {}, log: schedule.anchors.map(b => ({ beat: b, reason: 'bundled cue (never snaps)' })) };
  const fps = opts.fps, beat = 60 / opts.bpm, low = !!opts.lowConfidence;
  const delta = typeof opts.delta === 'number' && isFinite(opts.delta) ? opts.delta : stMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + delta) * fps));
  const reach = low ? ST_SNAP_LOW_CONFIDENCE_WINDOW : Math.min(ST_SNAP_WINDOW_BEATS * beat, ST_SNAP_WINDOW_MAX);
  const bands = low ? ['l'] : ['l', 'm', 'h'];
  const thr = band => Math.max(ST_SNAP_MIN_STRENGTH, (opts.thresholds && opts.thresholds[band]) || 0);
  const shift = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const list = (onsets || []).filter(o => o && isFinite(o[0]) && isFinite(o[2]) && o[2] >= thr(o[1]))
    .map(o => ({ x: o[0] - shift, band: o[1], strength: o[2], ratio: o[2] / thr(o[1]) }));
  const pick = g => {
    const near = list.filter(o => Math.abs(o.x - g) <= reach + 1e-9).map(o => ({ ...o, d: Math.abs(o.x - g) }));
    const onGrid = near.filter(o => o.d <= 1 / fps + 1e-9).sort((p, q) => p.d - q.d || p.x - q.x);
    if (onGrid.length) return { none: 'on grid (' + onGrid[0].band + ' onset within a frame)' };
    const usable = near.filter(o => bands.indexOf(o.band) >= 0);
    if (!usable.length) return { none: 'no onset' };
    let best = null, why = 'weak onset';
    for (const o of usable) {
      if (o.ratio < ST_SNAP_MIN_RATIO - 1e-9) continue;
      if (o.band === 'l') {
        const own = near.reduce((m, q) => (q.d < o.d - 1e-9 && q.ratio > m ? q.ratio : m), 1);
        if (o.ratio < own + ST_SNAP_LOW_MARGIN - 1e-9) { why = 'low onset not above the grid'; continue; }
      }
      const score = o.ratio - ST_SNAP_DISTANCE_COST * o.d / reach;
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && (o.d < best.d - 1e-9 || (Math.abs(o.d - best.d) <= 1e-9 && o.x < best.x)))) best = { ...o, score };
    }
    return best || { none: why };
  };
  // Neighbouring events: every other beat in the schedule; a snap may not squeeze the span to either neighbour.
  const events = {};
  schedule.mainBeats.concat(schedule.gridStates, schedule.title, schedule.place, schedule.pulses, [schedule.fadeStart])
    .concat(schedule.labels[0], schedule.labels[1]).forEach(b => { events[b] = true; });
  const beats = Object.keys(events).map(Number).sort((a, b) => a - b);
  const snaps = {};
  const sec = b => b * 60 / opts.bpm;
  for (const b of schedule.anchors) {
    const g = sec(b);
    const o = pick(g);
    if (o.none) { log.push({ beat: b, grid: g, seconds: g, shiftMs: 0, reason: o.none }); continue; }
    const prev = beats.filter(x => x < b).pop(), next = beats.filter(x => x > b)[0];
    let bad = null;
    for (const [p, q, px, qx] of [[prev, b, prev === undefined ? 0 : sec(prev), o.x], [b, next, o.x, next === undefined ? 0 : sec(next)]]) {
      if (p === undefined || q === undefined) continue;
      const frames = frameOf(qx) - frameOf(px), gridFrames = frameOf(sec(q)) - frameOf(sec(p));
      if (frames < Math.min(ST_SNAP_MIN_FRAMES, gridFrames)) bad = 'min-frames';
      else if (qx - px < ST_SNAP_MIN_SHARE * (sec(q) - sec(p)) - 1e-9) bad = 'min-share';
    }
    const entry = { beat: b, grid: g, onset: o.x, band: o.band, strength: o.strength, ratio: Math.round(o.ratio * 100) / 100 };
    if (bad) { log.push({ ...entry, seconds: g, shiftMs: 0, reason: 'reverted: ' + bad }); continue; }
    snaps[b] = o.x;
    log.push({ ...entry, seconds: o.x, shiftMs: Math.round((o.x - g) * 1e4) / 10, reason: 'onset' });
  }
  return { snaps, log, window: reach };
}

// ---------------------------------------------------------------------------------------------------------------
// Shot allocation

function stHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
// stHash with a murmur3 finaliser: FNV-1a alone maps strings that differ only in their last characters (rids
// "r0", "r1", …) to nearly the same value, which made the seeded fixed-slot spread a no-op.
function stMixHash(str) {
  let h = Math.round(stHash(str) * 4294967296) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Filler candidates on each video source in the candidates: every ST_FILLER_STEP s from ST_FILLER_EDGE to
// duration - ST_FILLER_EDGE, or ST_FILLER_MAX evenly spaced times when that grid would be longer. Sorted by rid, time.
function stFillers(candidates) {
  const dur = {};
  for (const c of candidates) {
    if (!c || c.kind === 'photo' || typeof c.rid !== 'string') continue;
    if (typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    const d = dur[rid], span = d - 2 * ST_FILLER_EDGE;
    if (span < -1e-9) continue;
    const count = Math.floor(span / ST_FILLER_STEP + 1e-9) + 1;
    if (count <= ST_FILLER_MAX) {
      for (let k = 0; k < count; k++) out.push({ rid, role: 'filler', t: ST_FILLER_EDGE + k * ST_FILLER_STEP, score: ST_FILLER_SCORE, sourceDuration: d });
    } else {
      for (let k = 0; k < ST_FILLER_MAX; k++) out.push({ rid, role: 'filler', t: ST_FILLER_EDGE + k * span / (ST_FILLER_MAX - 1), score: ST_FILLER_SCORE, sourceDuration: d });
    }
  }
  return out;
}

// Frame-aligned source window of `frames` frames centred on t: the start is a whole frame at fps, the window ends at
// least ST_SOURCE_TAIL before the end of the source. Returns { start, end } in seconds or null when it cannot fit.
function stWindow(t, frames, fps, sourceDuration) {
  const maxStart = Math.floor((sourceDuration - ST_SOURCE_TAIL) * fps - frames + 1e-6);
  if (maxStart < 0) return null;
  const want = Math.round((t - frames / fps / 2) * fps);
  const s = Math.max(0, Math.min(maxStart, want));
  return { start: s / fps, end: (s + frames) / fps };
}

// slots: [{ index, track: 'main' | 'grid', section: 'opener' | 'place' | 'grid' | 'montage' | 'ending', role, frames,
// seconds, quad? }] in allocation order (opener, place, grid A-D, montage, ending). opts: { candidates (hits +
// fillers + photos), slots, fps, seed, photoShare?, allowOverlap? }.
// Fresh-first: every slot takes the least-used resource that fits; the tier (preferred role, any real hit, filler)
// only ranks candidates with equal use counts, then a seeded value (score + hash). Hard rules: opener, place and grid
// A-D are six different resources; Main never shows the same resource twice in a row. Photos: photo slots (about a
// third of the montage + ending slots, evenly spread) take an unused photo first; elsewhere a photo is used only when
// no video fits. At most ST_PHOTO_RUN_MAX photos play in a row on Main unless nothing else fits (photoRunRelaxed).
function stAllocate(opts) {
  const fps = opts.fps, seed = String(opts.seed == null ? '' : opts.seed);
  const finite = v => typeof v === 'number' && isFinite(v);
  const pool = opts.candidates.filter(c => c && c.kind !== 'photo' && typeof c.rid === 'string' && finite(c.t) && finite(c.score) && finite(c.sourceDuration) && c.sourceDuration > 0);
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  // Per-candidate seeded values, computed once (hashing per slot is slow on long sources).
  const valueOf = new Map();
  for (const c of pool) valueOf.set(c, c.score + stMixHash(seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05);
  // The opener, place and grid slots are picked first, so without extra variety every version shows the same opening.
  // They rank by a larger seeded value: another version picks among the good hits of the role (live finding).
  const fixedValueOf = new Map();
  for (const c of pool) fixedValueOf.set(c, c.score + stMixHash(seed + ':fixed:' + c.rid) * ST_FIXED_JITTER);
  const photoValue = {};
  for (const p of photos) photoValue[p.rid] = stMixHash(seed + ':photo:' + p.rid);

  const uses = {}, windows = {}, picks = [];
  const fixedRids = [];     // opener, place and grid resources: all different
  let prevMain = null, photoRun = 0;
  let missing = 0, fillerShots = 0, photoShots = 0, photoRunRelaxed = false, overlapShots = 0, reusedPhotos = 0;
  let failed = null;

  // Photo slots over montage + ending.
  const flow = opts.slots.filter(sl => sl.section === 'montage' || sl.section === 'ending');
  const holdable = flow.filter(sl => sl.seconds <= ST_PHOTO_HOLD_MAX + 1e-9);
  const share = opts.photoShare == null ? ST_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(flow.length * share));
  const photoSlots = {};
  const phase = stHash(seed + ':photo-slots');
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;

  function bestVideo(slot, excluded, tierOf, overlap) {
    let best = null;
    const fixedSlot = slot.section === 'opener' || slot.section === 'place' || slot.section === 'grid';
    const values = fixedSlot ? fixedValueOf : valueOf;
    for (const c of pool) {
      if (excluded[c.rid]) continue;
      const rawTier = tierOf(c);
      if (rawTier < 0) continue;
      // Fixed slots: the role order is a small score penalty instead of a strict tier, so the seed can pick among good hits.
      const tier = fixedSlot ? 0 : rawTier;
      const w = stWindow(c.t, slot.frames, fps, c.sourceDuration);
      if (!w) continue;
      if (!overlap && (windows[c.rid] || []).some(([a, b]) => w.start < b + ST_WINDOW_GAP - 1e-9 && w.end > a - ST_WINDOW_GAP + 1e-9)) continue;
      const use = uses[c.rid] || 0, value = values.get(c) - (fixedSlot ? ST_FIXED_ROLE_PENALTY * rawTier : 0);
      const better = !best || use < best.use || (use === best.use && (tier < best.tier || (tier === best.tier &&
        (value > best.value + 1e-12 || (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)))))));
      if (better) best = { c, use, tier, value, start: w.start, end: w.end };
    }
    return best;
  }
  function bestPhoto(slot, excluded, unusedOnly) {
    if (slot.seconds > ST_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const p of photos) {
      if (excluded[p.rid]) continue;
      const use = uses[p.rid] || 0;
      if (unusedOnly && use > 0) continue;
      const value = photoValue[p.rid];
      if (!best || use < best.use || (use === best.use && value > best.value + 1e-12)) best = { c: p, use, value, photo: true };
    }
    return best;
  }

  for (const slot of opts.slots) {
    const fixed = slot.section === 'opener' || slot.section === 'place' || slot.section === 'grid';
    const excluded = {};
    if (fixed) for (const r of fixedRids) excluded[r] = true;
    if (slot.track === 'main' && prevMain !== null) excluded[prevMain] = true;
    const roles = ST_ROLE_FALLBACK[slot.role] || [slot.role];
    const k = roles.length;
    const real = c => (c.role === 'filler' ? -1 : roles.indexOf(c.role) >= 0 ? roles.indexOf(c.role) : k);
    const realOrFiller = c => (c.role === 'filler' ? k + 1 : roles.indexOf(c.role) >= 0 ? roles.indexOf(c.role) : k);
    const onlyFiller = c => (c.role === 'filler' ? 0 : -1);
    const inFlow = slot.section === 'montage' || slot.section === 'ending';
    const runFull = inFlow && photoRun >= ST_PHOTO_RUN_MAX;
    const video = overlap => bestVideo(slot, excluded, realOrFiller, overlap);
    let best = null;
    const tries = [];
    if (slot.section === 'opener') {
      // A video first (real hits, then fillers); a photo only if nothing else fits.
      tries.push(() => bestVideo(slot, excluded, real, false), () => bestVideo(slot, excluded, onlyFiller, false), () => bestPhoto(slot, excluded, true));
    } else if (fixed) {
      tries.push(() => bestVideo(slot, excluded, real, false), () => bestPhoto(slot, excluded, true), () => bestVideo(slot, excluded, onlyFiller, false));
    } else if (photoSlots[slot.index]) {
      if (!runFull) tries.push(() => bestPhoto(slot, excluded, true));
      tries.push(() => video(false));
      if (!runFull) tries.push(() => bestPhoto(slot, excluded, false));
    } else {
      tries.push(() => video(false));
      if (!runFull) tries.push(() => bestPhoto(slot, excluded, false));
    }
    if (inFlow && opts.allowOverlap) tries.push(() => { const b = video(true); return b ? { ...b, overlap: true } : null; });
    if (runFull) tries.push(() => { const b = bestPhoto(slot, excluded, false); return b ? { ...b, runRelaxed: true } : null; });
    for (const t of tries) { best = t(); if (best) break; }
    if (!best) {
      missing++;
      if (!failed) failed = slot;
      picks.push(null);
      if (slot.track === 'main') { prevMain = null; photoRun = 0; }
      continue;
    }
    const rid = best.c.rid;
    uses[rid] = (uses[rid] || 0) + 1;
    if (fixed) fixedRids.push(rid);
    if (slot.track === 'main') prevMain = rid;
    if (best.runRelaxed) photoRunRelaxed = true;
    const base = { slot: slot.index, track: slot.track, section: slot.section, role: slot.role, rid };
    if (slot.quad) base.quad = slot.quad;
    if (best.photo) {
      if (best.use > 0) reusedPhotos++;
      if (inFlow) { photoShots++; photoRun++; }
      picks.push({ ...base, kind: 'photo', startSeconds: 0, holdSeconds: slot.seconds });
      continue;
    }
    if (inFlow) photoRun = 0;
    if (best.overlap) overlapShots++;
    (windows[rid] = windows[rid] || []).push([best.start, best.end]);
    if (best.c.role === 'filler') fillerShots++;
    picks.push({ ...base, kind: 'video', startSeconds: best.start, endSeconds: best.end });
  }
  return { picks, filled: picks.filter(Boolean).length, missing, failed, fillerShots, photoShots, photoRunRelaxed, overlapShots, reusedPhotos, photoSlots: Object.keys(photoSlots).map(Number) };
}

// Slots for N montage shots at fps, from the frame schedule (seconds are F differences / fps).
function stSlots(schedule, frames, fps) {
  const n = schedule.montageShots, mf = frames.mainFrames, out = [];
  const span = (a, b) => ({ frames: b - a, seconds: (b - a) / fps });
  let index = 0;
  out.push({ index: index++, track: 'main', section: 'opener', role: 'opener', ...span(mf[0], mf[1]) });
  out.push({ index: index++, track: 'main', section: 'place', role: 'place', ...span(mf[1], mf[2]) });
  frames.grid.forEach(g => out.push({ index: index++, track: 'grid', section: 'grid', role: 'grid', quad: g.quad, ...span(g.aFrame, g.bFrame) }));
  for (let i = 0; i < n; i++) out.push({ index: index++, track: 'main', section: 'montage', role: ST_MONTAGE_ROLES[i % ST_MONTAGE_ROLES.length], ...span(mf[2 + i], mf[3 + i]) });
  for (let i = 0; i < ST_ENDING_SHOTS.length; i++) out.push({ index: index++, track: 'main', section: 'ending', role: 'ending', ...span(mf[2 + n + i], mf[3 + n + i]) });
  return out;
}

// Seconds for a reason string, rounded up to 0.1 s ("5.9").
function stFmtSeconds(x) { return (Math.ceil(x * 10 - 1e-6) / 10).toFixed(1); }

// Plans a build (spec 5, 15.4). opts: {
//   candidates: search hits [{ rid, role, t, score, sourceDuration }] + photos [{ rid, kind: 'photo' }],
//   bpm, fps (the Draft's real fps when known), montageShots (requested N), seed,
//   sectionStart? (music seconds at beat 0; gives delta), delta? (overrides), photoShare?, sizes? ({ rid: { width,
//   height } } for photo motions),
//   snaps? ({ anchorBeat: seconds }, filtered to each attempt's anchors) or onsets?/onsetThresholds?/lowConfidence?
//   (stSnapAnchors per attempt), bundled? (bundled cue: never snaps) }.
// N shrinks by 2 (never below 4) until every slot fills without overlapping windows; failing that, N = 4 may reuse
// overlapping windows. Returns { ok, disabledReason, requestedShots, montageShots, shrunk, distinct, schedule, frames,
// snapLog, picks: { main, grid }, motions, endingMotion, notes, fillerShots, photoShots, ... }.
function stPlanBuild(opts) {
  const fps = opts.fps, bpm = opts.bpm;
  if (!(bpm > 0) || !(fps > 0)) throw Error('stPlanBuild needs bpm and fps');
  const requested = Math.min(ST_MAX_MONTAGE, Math.max(ST_MIN_MONTAGE, Math.round(opts.montageShots || ST_LENGTHS.standard)));
  const delta = typeof opts.delta === 'number' && isFinite(opts.delta) ? opts.delta : stMusicOffset(opts.sectionStart, fps);
  const candidates = opts.candidates.filter(Boolean);
  const all = candidates.concat(stFillers(candidates));
  const beatSec = 60 / bpm;
  const notes = [];
  const fail = (reason, extra) => ({ ok: false, disabledReason: reason, requestedShots: requested, montageShots: 0, shrunk: false, distinct: extra.distinct, schedule: null, frames: null, snapLog: [], picks: { main: [], grid: [] }, motions: {}, endingMotion: {}, notes });

  const framesFor = n => {
    const schedule = stSchedule({ montageShots: n });
    let snaps = {}, snapLog = [];
    if (opts.snaps && !opts.bundled) {
      for (const b of schedule.anchors) if (opts.snaps[b] != null) snaps[b] = opts.snaps[b];
    } else if (opts.onsets && opts.onsets.length) {
      const r = stSnapAnchors(schedule, opts.onsets, { bpm, fps, sectionStart: opts.sectionStart, delta, thresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence, bundled: opts.bundled });
      snaps = r.snaps; snapLog = r.log;
    }
    return { schedule, frames: stFrameSchedule({ schedule, bpm, delta, fps, snaps }), snapLog };
  };

  // Shortage checks that do not depend on N (spec 15.4).
  const first = framesFor(ST_MIN_MONTAGE);
  const slots0 = stSlots(first.schedule, first.frames, fps);
  const gridSeconds = Math.max.apply(null, slots0.filter(s => s.section === 'grid').map(s => s.seconds));
  const minFrames = Math.max.apply(null, slots0.filter(s => s.section === 'grid').map(s => s.frames));
  const eligible = {};
  for (const c of candidates) {
    if (c.kind === 'photo') { if (typeof c.rid === 'string' && gridSeconds <= ST_PHOTO_HOLD_MAX + 1e-9) eligible[c.rid] = true; continue; }
    if (typeof c.rid === 'string' && typeof c.sourceDuration === 'number' && isFinite(c.sourceDuration) && stWindow(0, minFrames, fps, c.sourceDuration)) eligible[c.rid] = true;
  }
  const distinct = Object.keys(eligible).length;
  if (distinct < ST_MIN_DISTINCT) return fail('Needs at least ' + ST_MIN_DISTINCT + ' different clips or photos (found ' + distinct + ')', { distinct });
  const fixedSlots = slots0.filter(s => s.section === 'opener' || s.section === 'place' || s.section === 'grid');
  const fixedAlloc = stAllocate({ candidates: all, slots: fixedSlots, fps, seed: opts.seed, photoShare: opts.photoShare });
  if (fixedAlloc.missing) {
    const f = fixedAlloc.failed;
    if (f.section === 'opener') return fail('Needs one video clip at least ' + stFmtSeconds(f.seconds + ST_SOURCE_TAIL) + ' s long for the opening', { distinct });
    if (f.section === 'place') return fail('Needs a second clip at least ' + stFmtSeconds(f.seconds + ST_SOURCE_TAIL) + ' s long (or a photo) for the place shot', { distinct });
    return fail('Needs at least ' + ST_MIN_DISTINCT + ' different clips or photos long enough for the grid panels (found ' + distinct + ')', { distinct });
  }

  let result = null;
  const attempt = (n, allowOverlap) => {
    const f = n === ST_MIN_MONTAGE ? first : framesFor(n);
    const slots = stSlots(f.schedule, f.frames, fps);
    const alloc = stAllocate({ candidates: all, slots, fps, seed: opts.seed, photoShare: opts.photoShare, allowOverlap });
    return alloc.missing ? null : { n, f, slots, alloc };
  };
  for (let n = requested; n >= ST_MIN_MONTAGE && !result; n -= 2) result = attempt(n, false);
  if (!result) {
    result = attempt(ST_MIN_MONTAGE, true);
    if (result) notes.push('Some shots reuse footage from the same moment of a clip');
  }
  if (!result) return fail('Your footage is too short for ' + ST_MIN_MONTAGE + ' montage shots', { distinct });

  const { n, f, alloc } = result;
  const main = [], grid = [];
  for (const p of alloc.picks) {
    const item = { rid: p.rid, kind: p.kind, startSeconds: p.startSeconds, role: p.section === 'montage' ? 'montage' : p.section, slotRole: p.role };
    if (p.kind === 'video') item.endSeconds = p.endSeconds; else item.holdSeconds = p.holdSeconds;
    if (p.track === 'grid') { item.quad = p.quad; grid.push(item); } else main.push(item);
  }
  const shrunk = n < requested;
  const seconds = f.frames.endFrame / fps;
  if (shrunk) notes.push('Your footage fits ' + n + ' montage shots (about ' + Math.round(seconds) + ' s)');
  if (alloc.photoRunRelaxed) notes.push('More than ' + ST_PHOTO_RUN_MAX + ' photos play in a row (not enough video)');
  if (alloc.reusedPhotos) notes.push('Some photos are used twice');
  const pm = stPhotoMotions(main, opts.seed, opts.sizes);
  const plan = {
    ok: true,
    disabledReason: null,
    requestedShots: requested,
    montageShots: n,
    shrunk,
    distinct,
    seconds,
    schedule: f.schedule,
    frames: f.frames,
    snapLog: f.snapLog,
    picks: { main, grid },
    motions: pm.motions,
    endingMotion: pm.endingMotion,
    notes,
    fillerShots: alloc.fillerShots,
    photoShots: alloc.photoShots,
    photoRunRelaxed: alloc.photoRunRelaxed,
    overlapShots: alloc.overlapShots,
    reusedPhotos: alloc.reusedPhotos,
  };
  return plan;
}

// ---------------------------------------------------------------------------------------------------------------
// Photo motions (copied from City Weekend Vlog): deterministic per seed; never the same family (push-in, pull-out,
// drift, tilt, push-drift) twice in a row; drift, tilt and push-drift directions alternate. Drift follows the room the
// 16:9 canvas's cover crop leaves: a photo narrower than 16:9 (portrait, square, 4:3, 3:2) is cropped top and bottom
// and drifts vertically; 16:9 and wider drift horizontally; an unknown size counts as 16:9. One sequence runs over the Main
// photos from the montage on, split into `motions` (montage photos, keyed by Main index) and `endingMotion` (ending
// photos, keyed by ending index 0-2; the film-frame effect performs them). Opener and place photos stay still.
const ST_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const ST_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
function stPhotoMotions(main, seed, sizes) {
  const motions = {}, endingMotion = {};
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  const endingFrom = main.length - ST_ENDING_SHOTS.length;
  main.forEach((pick, i) => {
    if (!pick || pick.kind !== 'photo' || (pick.role !== 'montage' && pick.role !== 'ending')) return;
    const size = sizes && sizes[pick.rid];
    // Narrower than the canvas: the cover crop leaves room above and below, so the drift runs along y.
    const tall = !!(size && size.width > 0 && size.height > 0 && size.width / size.height < ST_W / ST_H - 1e-6);
    const families = ST_MOTION_FAMILIES.filter(f => f !== lastFamily)
      .map(f => ({ f, v: stHash(seed + ':motion:' + k + ':' + f) }))
      .sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1));
    const family = families[0].f;
    let motion = family, direction = 1;
    if (family === 'drift') {
      const axis = tall ? 'y' : 'x';
      direction = driftSign[axis]; driftSign[axis] = -direction;
      motion = axis === 'x' ? (direction > 0 ? 'drift-right' : 'drift-left') : (direction > 0 ? 'drift-down' : 'drift-up');
    } else if (family === 'tilt') { direction = tiltSign; tiltSign = -tiltSign; }
    else if (family === 'push-drift') { direction = pushDriftSign; pushDriftSign = -pushDriftSign; }
    const entry = { motion, direction, axis: tall ? 'y' : 'x' };
    if (i >= endingFrom) endingMotion[i - endingFrom] = entry; else motions[i] = entry;
    lastFamily = family; k++;
  });
  return { motions, endingMotion };
}

// ---------------------------------------------------------------------------------------------------------------
// Build progress (copied from City Weekend Vlog): steps with each step's share of the bar in percent.
const ST_BUILD_STEPS = [
  { id: 'shots', label: 'Choosing shots', weight: 40 },
  { id: 'music', label: 'Preparing music', weight: 10 },
  { id: 'draft', label: 'Creating Draft', weight: 25 },
  { id: 'look', label: 'Adding title and look', weight: 20 },
  { id: 'open', label: 'Opening Draft', weight: 5 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function stProgress(stepId, fraction, detail) {
  const i = ST_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = ST_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = ST_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + ST_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  const step = ST_BUILD_STEPS[i];
  return {
    value,
    percent,
    current: i,
    label: 'Step ' + (i + 1) + '/' + ST_BUILD_STEPS.length + ' · ' + step.label + (detail ? ' (' + detail + ')' : '') + ' · ' + percent + '%',
  };
}
