// City Weekend Vlog planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
// Title: 8 beats (two bars), cut on 8th notes. Opening 1.5 + 1.5 + 1 beats (line 1, connector, place), then a fast
// run of landmark shots and a 1-beat wide hold. The run starts with a burst whose grain depends on the music:
// 'sixteenth' (four 0.25-beat shots) when the cue has a clear 16th-note pulse, 'eighth' (two 0.5-beat shots) otherwise,
// then four 0.5-beat shots. Both variants last 8 beats, so the montage always starts on a downbeat.
const CWV_TITLE_BEATS = [1.5, 1.5, 1, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 1];
const CWV_TITLE_ROLES = ['street', 'architecture', 'street', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'wide'];
// Font state of the switching line from each title slot on; null before the place line exists. One A->B->C->D cycle
// over the burst, one over the 8th run, and the hold stays on A.
const CWV_FONT_STATES = [null, null, 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'A'];
// The 'eighth' variant: the burst is two 0.5-beat shots (10 title slots). Its two shots switch to B and C; the 8th
// run keeps its B->C->D->A cycle, so the hold is on A in both variants.
const CWV_TITLE_BEATS_EIGHTH = [1.5, 1.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1];
const CWV_TITLE_ROLES_EIGHTH = ['street', 'architecture', 'street', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'wide'];
const CWV_FONT_STATES_EIGHTH = [null, null, 'A', 'B', 'C', 'B', 'C', 'D', 'A', 'A'];
// A cue supports the 16th burst when the median onset strength on its 16th offbeats (.25 and .75 of a beat) reaches
// this share of the median on-beat strength (manifest `sixteenthRatio`, measured by beat-detect.cjs).
const CWV_SIXTEENTH_MIN_RATIO = 0.35;
const CWV_MONTAGE_ROLES = ['architecture', 'park', 'street', 'detail'];
const CWV_MONTAGE_BEATS = 2;
const CWV_TITLE_TOTAL_BEATS = 8;
const CWV_LENGTHS = { short: 4, standard: 7, long: 12 };
const CWV_MIN_MONTAGE = 4;
const CWV_MAX_MONTAGE = 12;
// Fewest shots a build needs with the 16th burst (12 title + 4 montage); the 8th burst needs cwvMinWindows('eighth').
const CWV_MIN_WINDOWS = CWV_TITLE_BEATS.length + CWV_MIN_MONTAGE;
const CWV_LINE1_OFFSET_BEATS = 0.25;
const CWV_REFERENCE_BPM = 99.2;
// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates. They score below any real hit and are only used by the last tier, after photos.
const CWV_FILLER_STEP = 0.5;
const CWV_FILLER_EDGE = 0.25;
const CWV_FILLER_SCORE = -2;
// A video window ends at least this far before the end of its source: the Draft's real frame rate and the music
// offset can lengthen a shot by a frame after planning.
const CWV_SOURCE_TAIL = 0.05;
// Photos (Image resources) have no scene search. Each one fills at most one slot of any length up to the 5 s an
// image source lasts. About CWV_PHOTO_SHARE of the slots, evenly spread from a seeded offset (title included), are
// photo slots where an unused photo comes first. Elsewhere photos rank after every real video hit and before
// fillers, except in the title burst, where they rank right after the preferred roles. At most CWV_PHOTO_RUN_MAX
// photos play in a row while anything else fits.
const CWV_PHOTO_HOLD_MAX = 5;
const CWV_PHOTO_RUN_MAX = 2;
const CWV_PHOTO_SHARE = 1 / 3;

function cwvVideoBeats(montageShots) { return CWV_TITLE_TOTAL_BEATS + CWV_MONTAGE_BEATS * montageShots; }
function cwvVideoSeconds(bpm, montageShots) { return cwvVideoBeats(montageShots) * 60 / bpm; }

// The burst for a cue's 16th-onset ratio; an unknown ratio (no reliable grid) gets the calmer 'eighth'.
function cwvBurstFor(ratio) { return typeof ratio === 'number' && ratio >= CWV_SIXTEENTH_MIN_RATIO ? 'sixteenth' : 'eighth'; }
function cwvTitle(burst) {
  return burst === 'eighth' ? { beats: CWV_TITLE_BEATS_EIGHTH, roles: CWV_TITLE_ROLES_EIGHTH, fonts: CWV_FONT_STATES_EIGHTH }
    : { beats: CWV_TITLE_BEATS, roles: CWV_TITLE_ROLES, fonts: CWV_FONT_STATES };
}
function cwvMinWindows(burst) { return cwvTitle(burst).beats.length + CWV_MIN_MONTAGE; }

// Where the music's beats land on the timeline. Selects snaps the music's source start (sectionStart) to a timeline
// frame, so the music plays offset by delta = sectionStart - round(sectionStart * fps) / fps (at most half a frame);
// beat b of the section plays at b * 60 / bpm + delta. Without music there is no offset.
function cwvMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

// Onset-anchored cuts (spec section 2). The cuts stay on the rhythm template's grid; a snappable cut moves onto a
// clearly strong music onset near it, and only when nothing already marks the grid position. Snappable: the first cut
// of the title burst (its anchor) and every cut that starts a slot of at least one beat (the title's opening cuts, the
// hold, the title -> montage cut and every montage cut). The burst's later cuts, and the cut that ends it, keep the
// template spacing from the anchor; the half-beat run after the burst and every other cut stay on the grid, so the
// first half-beat shot absorbs the anchor's shift.
// v2.6 (conservative snap; live Brooklyn Boom Bap cuts snapped 32-47 ms onto low-band onsets at 1.04-1.5 of their
// threshold and landed off the audible accent): a cut stays on the grid when a qualifying onset of any band lies within
// one frame of it; otherwise the candidate must reach CWV_SNAP_MIN_RATIO of its band threshold, candidates rank by
// ratio - CWV_SNAP_DISTANCE_COST * |offset| / window, and a low-band candidate must also beat the grid position's own
// onset (the strongest qualifying onset nearer the grid, else the band threshold, ratio 1) by CWV_SNAP_LOW_MARGIN.
const CWV_SNAP_WINDOW_BEATS = 0.10;          // search window: +/- this share of a beat ...
const CWV_SNAP_WINDOW_MAX = 0.070;           // ... capped at this many seconds
const CWV_SNAP_MIN_STRENGTH = 2;             // an onset's strength (over its band median) must reach max(this, band threshold)
const CWV_SNAP_MIN_RATIO = 1.5;              // a snap target's strength over that threshold (the bundled cues' far onsets reach 1.28)
const CWV_SNAP_DISTANCE_COST = 0.5;          // score = ratio - this * |offset| / window: an onset at the window edge loses 0.5
const CWV_SNAP_LOW_MARGIN = 0.25;            // a low-band target's ratio over the grid position's own onset ratio
const CWV_SNAP_MIN_FRAMES = 4;               // no snap may leave a shot shorter than this (or than its template, if shorter)
const CWV_SNAP_MIN_SHARE = 0.75;             // ... or shorter than this share of its template length
// Music whose beat was not found reliably (fixed shot lengths): only bass onsets, within a fixed window.
const CWV_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

// boundaries: the grid's cut times in seconds from the section start ([0, end of slot 0, ..., end of the last slot]).
// template: { beats: [each slot's length in beats], burstFrom, burstTo } where slots burstFrom..burstTo-1 are the
// title burst. onsets: [[seconds in the music source, band 'l' | 'm' | 'h', strength], ...].
// opts: { bpm, fps, sectionStart (the music second at the section start; onsets are shifted by it), thresholds?:
// { l, m, h }, lowConfidence?: true for fixed timing }. Returns { cuts: seconds like boundaries, frames: the cuts at
// opts.fps with the music offset (same expression as cwvSchedule and assemble.js), log: one entry per inner cut }.
// A snapped cut sits exactly on its onset, so rounding it to a frame at any rate never puts it more than half a frame
// before the onset. Frame counts for the minimum shot, and the one-frame "already on an onset" test, use opts.fps.
function cwvSnapCuts(boundaries, template, onsets, opts) {
  const fps = opts.fps, beat = 60 / opts.bpm, low = !!opts.lowConfidence;
  const offset = cwvMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const reach = low ? CWV_SNAP_LOW_CONFIDENCE_WINDOW : Math.min(CWV_SNAP_WINDOW_BEATS * beat, CWV_SNAP_WINDOW_MAX);
  const bands = low ? ['l'] : ['l', 'm', 'h'];
  const thr = band => Math.max(CWV_SNAP_MIN_STRENGTH, (opts.thresholds && opts.thresholds[band]) || 0);
  const shift = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const list = (onsets || []).filter(o => o && isFinite(o[0]) && isFinite(o[2]) && o[2] >= thr(o[1]))
    .map(o => ({ x: o[0] - shift, band: o[1], strength: o[2], ratio: o[2] / thr(o[1]) }));
  const n = boundaries.length - 1, beats = template.beats || [];
  const from = template.burstFrom, to = template.burstTo;
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
      if (o.ratio < CWV_SNAP_MIN_RATIO - 1e-9) continue;
      if (o.band === 'l') {
        // The grid position's own onset: the strongest qualifying onset nearer the grid (ratio 1 = the threshold when
        // there is none, since a weaker one would not be listed).
        const own = near.reduce((m, q) => (q.d < o.d - 1e-9 && q.ratio > m ? q.ratio : m), 1);
        if (o.ratio < own + CWV_SNAP_LOW_MARGIN - 1e-9) { why = 'low onset not above the grid'; continue; }
      }
      const score = o.ratio - CWV_SNAP_DISTANCE_COST * o.d / reach;
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && (o.d < best.d - 1e-9 || (Math.abs(o.d - best.d) <= 1e-9 && o.x < best.x)))) best = { ...o, score };
    }
    return best || { none: why };
  };
  // The first shot in [a, b) that a snap would make too short, or null.
  const tooShort = (next, a, b) => {
    for (let k = Math.max(0, a); k <= Math.min(n - 1, b); k++) {
      const frames = frameOf(next[k + 1]) - frameOf(next[k]), grid = frameOf(boundaries[k + 1]) - frameOf(boundaries[k]);
      if (frames < Math.min(CWV_SNAP_MIN_FRAMES, grid)) return { slot: k, reason: 'min-frames' };
      if (next[k + 1] - next[k] < CWV_SNAP_MIN_SHARE * (boundaries[k + 1] - boundaries[k]) - 1e-9) return { slot: k, reason: 'min-share' };
    }
    return null;
  };
  for (let i = 1; i < n; i++) {
    const g = boundaries[i];
    const anchor = i === from, chained = i > from && i <= to;
    if (chained) {
      // Template spacing from the anchor, but only when the anchor's snap changed its frame: a sub-frame move leaves the
      // burst on the grid, so it cannot shift a later burst cut by a frame on its own.
      const relaid = frameOf(cuts[from]) !== frameOf(boundaries[from]);
      cuts[i] = relaid ? cuts[from] + (g - boundaries[from]) : g;
      log.push({ index: i, kind: 'burst', grid: g, seconds: cuts[i], shiftMs: Math.round((cuts[i] - g) * 1e4) / 10, reason: relaid ? 'from anchor' : 'grid (anchor frame unchanged)' });
      continue;
    }
    if (!anchor && !(beats[i] >= 1)) { log.push({ index: i, kind: 'grid', grid: g, seconds: g, shiftMs: 0, reason: 'grid' }); continue; }
    const kind = anchor ? 'anchor' : 'beat';
    const o = pick(g);
    if (o.none) { log.push({ index: i, kind, grid: g, seconds: g, shiftMs: 0, reason: o.none }); continue; }
    const next = cuts.slice();
    next[i] = o.x;
    if (anchor && frameOf(o.x) !== frameOf(g)) for (let k = from + 1; k <= to; k++) next[k] = o.x + (boundaries[k] - g);
    const bad = tooShort(next, i - 1, anchor ? to : i);
    const entry = { index: i, kind, grid: g, onset: o.x, band: o.band, strength: o.strength, ratio: Math.round(o.ratio * 100) / 100 };
    if (bad) { log.push({ ...entry, seconds: g, shiftMs: 0, reason: 'reverted: slot ' + bad.slot + ' ' + bad.reason }); continue; }
    cuts[i] = o.x;
    log.push({ ...entry, seconds: o.x, shiftMs: Math.round((o.x - g) * 1e4) / 10, reason: 'onset' });
  }
  return { cuts, frames: cuts.map(frameOf), log, window: reach };
}

// opts: { bpm, fps, montageShots, burst?: 'sixteenth' | 'eighth' (default 'sixteenth'), sectionStart?: seconds into
// the music (omit without music), onsets?, onsetThresholds?, lowConfidence? (cwvSnapCuts; used only with a
// sectionStart), cuts?: cut seconds decided earlier (a schedule's `cuts`, reused as they are) }. Slots carry their
// grid beat span (startBeat, endBeat) and frames; `titleSlots` is the number of title slots; `offset` is the music
// offset every boundary is shifted by; `cuts` are the boundaries in seconds from the section start (the grid, or the
// snapped cuts) and `snapLog` explains each snappable cut.
function cwvSchedule(opts) {
  const bpm = opts.bpm, fps = opts.fps, n = opts.montageShots;
  if (!(bpm > 0) || !(fps > 0) || !(n >= 0)) throw Error('cwvSchedule needs bpm, fps and montageShots');
  const burst = opts.burst === 'eighth' ? 'eighth' : 'sixteenth';
  const title = cwvTitle(burst), T = title.beats.length;
  // Every boundary is an absolute beat position, shifted by the music offset and snapped once to a frame; durations
  // never accumulate rounding. The video always starts at frame 0. assemble.js places cuts with the same expression.
  const offset = cwvMusicOffset(opts.sectionStart, fps);
  const frameAt = beats => (beats === 0 ? 0 : Math.round((beats * (60 / bpm) + offset) * fps));
  const frameOfSeconds = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const beats = title.beats.concat(Array(n).fill(CWV_MONTAGE_BEATS));
  const grid = [0];
  beats.reduce((at, b) => { grid.push((at + b) * (60 / bpm)); return at + b; }, 0);
  // The burst: the sub-beat shots from the first landmark slot on (four 16ths or two 8ths).
  const burstFrom = 3, burstTo = burstFrom + (burst === 'eighth' ? 2 : 4);
  let cuts = grid, snapLog = [];
  if (Array.isArray(opts.cuts)) {
    if (opts.cuts.length !== grid.length) throw Error('cwvSchedule: cuts do not match the slots');
    cuts = opts.cuts.slice();
  } else if (opts.onsets && opts.onsets.length && typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart)) {
    const snapped = cwvSnapCuts(grid, { beats, burstFrom, burstTo }, opts.onsets,
      { bpm, fps, sectionStart: opts.sectionStart, thresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence });
    cuts = snapped.cuts; snapLog = snapped.log;
  }
  const slots = [];
  let at = 0;
  beats.forEach((b, i) => {
    const inTitle = i < T;
    slots.push({
      index: i,
      role: inTitle ? title.roles[i] : CWV_MONTAGE_ROLES[(i - T) % CWV_MONTAGE_ROLES.length],
      section: inTitle ? (i < 3 ? 'opening' : i < T - 1 ? 'burst' : 'hold') : 'montage',
      startBeat: at,
      endBeat: at + b,
      startFrame: frameOfSeconds(cuts[i]),
      endFrame: frameOfSeconds(cuts[i + 1]),
    });
    at += b;
  });
  const fontSwitches = [];
  title.fonts.forEach((state, i) => {
    const last = fontSwitches.length ? fontSwitches[fontSwitches.length - 1].state : null;
    if (state && state !== last) fontSwitches.push({ frame: slots[i].startFrame, state });
  });
  return {
    burst,
    titleSlots: T,
    offset,
    cuts,
    snapLog,
    slots,
    totalFrames: slots[slots.length - 1].endFrame,
    title: {
      line1Frame: frameAt(CWV_LINE1_OFFSET_BEATS),
      connectorFrame: slots[1].startFrame,
      placeFrame: slots[2].startFrame,
      fontSwitches,
      endFrame: slots[T - 1].endFrame,
    },
  };
}

function cwvFitMontage(opts) {
  for (let n = Math.min(opts.requested, CWV_MAX_MONTAGE); n >= CWV_MIN_MONTAGE; n--) {
    if (opts.sectionStart + cwvVideoSeconds(opts.bpm, n) <= opts.usableEnd + 1e-6) return n;
  }
  return 0;
}

function cwvSnapSection(opts) {
  const latest = opts.usableEnd - opts.videoSeconds;
  if (latest < -1e-6) return null;
  if (!opts.gridAccepted) return Math.max(0, Math.min(Math.floor(latest * 10) / 10, Math.round(opts.value * 10) / 10));
  const bar = 4 * 60 / opts.bpm;
  const maxK = Math.floor((latest - opts.firstBeat) / bar + 1e-9);
  if (maxK < 0) return null;
  const k = Math.max(0, Math.min(maxK, Math.round((opts.value - opts.firstBeat) / bar)));
  return opts.firstBeat + k * bar;
}

function cwvDefaultSection(opts) {
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

function cwvHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Filler candidates every CWV_FILLER_STEP seconds on each source that appears in the candidates, sorted by rid then time.
function cwvFillers(candidates) {
  const dur = {};
  for (const c of candidates) {
    if (!c || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    for (let k = 0; ; k++) {
      const t = CWV_FILLER_EDGE + k * CWV_FILLER_STEP;
      if (t > dur[rid] - CWV_FILLER_EDGE + 1e-9) break;
      out.push({ rid, role: 'filler', t, score: CWV_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// Which candidate roles may fill a slot role, best first.
const CWV_ROLE_FALLBACK = {
  street: ['street', 'detail', 'architecture'],
  architecture: ['architecture', 'landmark', 'street'],
  landmark: ['landmark', 'architecture', 'park', 'wide'],
  wide: ['wide', 'park', 'landmark'],
  park: ['park', 'wide', 'detail'],
  detail: ['detail', 'street', 'architecture'],
};

function cwvAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const finite = v => typeof v === 'number' && isFinite(v);
  const candidates = opts.candidates.filter(c => c && c.kind !== 'photo' && finite(c.t) && finite(c.score) && finite(c.sourceDuration));
  // One photo candidate per rid, in rid order so the result never depends on input order.
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  const used = {}, recent = [], picks = [], photoUsed = {};
  const pool = candidates.filter(c => c.sourceDuration > 0);
  let missing = 0, fillerShots = 0, photoShots = 0, photoRun = 0, photoRunRelaxed = false, adjacentRepeats = 0, prevRid = null;
  // Photo slots: round(share x slots) of the slots a photo can hold, capped by the photos available, spaced evenly.
  // opts.photoShare overrides CWV_PHOTO_SHARE (0 turns photo slots off).
  const photoSlots = {};
  const holdable = opts.slots.filter(sl => sl.seconds <= CWV_PHOTO_HOLD_MAX + 1e-9);
  const share = opts.photoShare == null ? CWV_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(opts.slots.length * share));
  const phase = cwvHash(opts.seed + ':photo-slots');
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;
  // Best fitting video candidate for a slot. rankOf returns the candidate's rank in this tier, or -1 to skip it.
  // `exclude` is a rid that may not be used (the previous shot's source).
  function searchVideo(slot, rankOf, exclude) {
    let best = null;
    for (const c of pool) {
      if (c.rid === exclude) continue;
      const rank = rankOf(c);
      if (rank < 0 || c.sourceDuration < slot.seconds + CWV_SOURCE_TAIL) continue;
      const start = Math.max(0, Math.min(c.sourceDuration - CWV_SOURCE_TAIL - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      const value = c.score - rank * 0.15 - repeats * 0.2 + cwvHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05;
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end };
    }
    return best;
  }
  // An unused photo for the slot, chosen by a seeded hash so another seed picks other photos.
  function searchPhoto(slot) {
    if (slot.seconds > CWV_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const c of photos) {
      if (photoUsed[c.rid]) continue;
      const value = cwvHash(opts.seed + ':photo:' + c.rid);
      if (!best || value > best.value + 1e-12) best = { value, c, photo: true };
    }
    return best;
  }
  for (const slot of opts.slots) {
    const roles = CWV_ROLE_FALLBACK[slot.role] || [slot.role];
    const photo = () => searchPhoto(slot);
    const runFull = photoRun >= CWV_PHOTO_RUN_MAX;
    const choose = exclude => {
      const preferred = () => searchVideo(slot, c => roles.indexOf(c.role), exclude);
      const anyReal = () => searchVideo(slot, c => (c.role === 'filler' ? -1 : 0), exclude);
      const filler = () => searchVideo(slot, c => (c.role === 'filler' ? 0 : -1), exclude);
      // Tiers, best first: preferred-role hits, any-role hits, photos, fillers. A photo slot puts photos first; the
      // title burst lifts them above the any-role tier. After CWV_PHOTO_RUN_MAX photos in a row, a photo is only the
      // last resort.
      const tiers = photoSlots[slot.index] ? [photo, preferred, anyReal, filler]
        : slot.section === 'burst' ? [preferred, photo, anyReal, filler] : [preferred, anyReal, photo, filler];
      for (const tier of tiers) {
        if (runFull && tier === photo) continue;
        const b = tier();
        if (b) return b;
      }
      const b = runFull ? photo() : null;
      return b ? { ...b, runRelaxed: true } : null;
    };
    // Two shots from the same source in a row often do not read as a cut, so the previous shot's source is only
    // used again when nothing else fits (counted in adjacentRepeats).
    let best = choose(prevRid);
    if (!best && prevRid !== null && (best = choose(null))) adjacentRepeats++;
    if (best && best.runRelaxed) photoRunRelaxed = true;
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
    picks.push({ slot: slot.index, rid: best.c.rid, kind: 'video', startSeconds: best.start, endSeconds: best.end });
  }
  return { picks, filled: picks.filter(Boolean).length, missing, fillerShots, photoShots, photoRunRelaxed, adjacentRepeats };
}

// Tries the requested montage length first, then shrinks toward CWV_MIN_MONTAGE. Every attempt allocates from scratch.
// opts.burst picks the title variant and opts.sectionStart shifts the cuts with the music (see cwvSchedule);
// opts.onsets, opts.onsetThresholds and opts.lowConfidence snap the cuts to the music's onsets (cwvSnapCuts), so the
// slot lengths the shots are chosen for are the snapped ones; opts.photoShare overrides CWV_PHOTO_SHARE.
// Filler candidates are added to every attempt.
// Photo candidates ({ rid, kind: 'photo' }) join every attempt, so a Project with only photos builds too.
function cwvPlanBuild(opts) {
  const top = Math.min(CWV_MAX_MONTAGE, Math.max(CWV_MIN_MONTAGE, opts.montageShots));
  const candidates = opts.candidates.concat(cwvFillers(opts.candidates));
  const burst = opts.burst === 'eighth' ? 'eighth' : 'sixteenth', needed = cwvMinWindows(burst);
  let best = { filled: 0, photoShots: 0 };
  for (let n = top; n >= CWV_MIN_MONTAGE; n--) {
    const schedule = cwvSchedule({ bpm: opts.bpm, fps: opts.fps, montageShots: n, burst, sectionStart: opts.sectionStart,
      onsets: opts.onsets, onsetThresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence });
    const slots = schedule.slots.map(s => ({ index: s.index, role: s.role, section: s.section, seconds: (s.endFrame - s.startFrame) / opts.fps }));
    const alloc = cwvAllocate({ candidates, slots, seed: opts.seed, photoShare: opts.photoShare });
    if (alloc.missing === 0) {
      const plan = { ok: true, schedule, burst, titleSlots: schedule.titleSlots, picks: alloc.picks, montageShots: n, usableShots: alloc.picks.length, needed, fillerShots: alloc.fillerShots, photoShots: alloc.photoShots };
      if (alloc.photoRunRelaxed) plan.photoRunRelaxed = true;
      if (alloc.adjacentRepeats) plan.adjacentRepeats = alloc.adjacentRepeats;
      return plan;
    }
    // The shortest attempt fills fewer than `needed` slots, so usableShots < needed.
    if (n === CWV_MIN_MONTAGE) best = alloc;
  }
  return { ok: false, burst, usableShots: best.filled, needed, photoShots: best.photoShots };
}

// Photo motions for montage photos, in pick order. Title photos (the first `titleSlots` slots, default the 16th-burst
// title's 12) stay still (null).
// Deterministic per seed; never the same motion twice in a row, never the same family (drift, tilt, ...) twice in a row;
// drift, tilt and push-drift directions alternate. Drift follows the photo: vertical for portrait, horizontal otherwise.
// Each entry is { motion, direction: 1 | -1, axis: 'x' | 'y' } for assets/photo-motion.tsx.
// `sizes` maps rid -> { width, height }; an unknown size counts as landscape.
const CWV_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const CWV_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
function cwvPhotoMotions(picks, seed, sizes, titleSlots) {
  const T = titleSlots == null ? CWV_TITLE_BEATS.length : titleSlots;
  const out = [];
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  for (const pick of picks) {
    if (!pick || pick.kind !== 'photo' || !(pick.slot >= T)) { out.push(null); continue; }
    const size = sizes && sizes[pick.rid];
    const portrait = !!(size && size.height > size.width);
    const families = CWV_MOTION_FAMILIES.filter(f => f !== lastFamily)
      .map(f => ({ f, v: cwvHash(seed + ':motion:' + k + ':' + f) }))
      .sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1));
    const family = families[0].f;
    let motion = family, direction = 1;
    if (family === 'drift') {
      const axis = portrait ? 'y' : 'x';
      direction = driftSign[axis]; driftSign[axis] = -direction;
      motion = axis === 'x' ? (direction > 0 ? 'drift-right' : 'drift-left') : (direction > 0 ? 'drift-down' : 'drift-up');
    } else if (family === 'tilt') { direction = tiltSign; tiltSign = -tiltSign; }
    else if (family === 'push-drift') { direction = pushDriftSign; pushDriftSign = -pushDriftSign; }
    // axis: the drift direction of push-drift (and of the drift motions), along the side the 9:16 crop has room on.
    out.push({ motion, direction, axis: portrait ? 'y' : 'x' });
    lastFamily = family; k++;
  }
  return out;
}

// Build steps shown in the panel's progress bar, with each step's share of the bar in percent.
const CWV_BUILD_STEPS = [
  { id: 'shots', label: 'Choosing shots', weight: 40 },
  { id: 'music', label: 'Preparing music', weight: 10 },
  { id: 'draft', label: 'Creating Draft', weight: 25 },
  { id: 'look', label: 'Adding title and look', weight: 20 },
  { id: 'open', label: 'Opening Draft', weight: 5 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function cwvProgress(stepId, fraction, detail) {
  const i = CWV_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = CWV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = CWV_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + CWV_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  const step = CWV_BUILD_STEPS[i];
  return {
    value,
    percent,
    current: i,
    label: 'Step ' + (i + 1) + '/' + CWV_BUILD_STEPS.length + ' · ' + step.label + (detail ? ' (' + detail + ')' : '') + ' · ' + percent + '%',
  };
}
