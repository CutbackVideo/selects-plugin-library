// @name Torn Paper Love
// @name:de Torn Paper Love
// @name:en Torn Paper Love
// @name:es Torn Paper Love
// @name:fr Torn Paper Love
// @name:it Torn Paper Love
// @name:ja Torn Paper Love
// @name:ko Torn Paper Love
// @name:pt Torn Paper Love
// @name:tr Torn Paper Love
// @name:zh Torn Paper Love
// @icon sparkles
// Builds a 4:3 torn-paper love edit of your photos, cut on the beat, with ransom-note letters, as a new editable Draft.
import React from "react";

const PLUGIN_ID = "torn-paper-love";
const SKILLS_DIR = "$SELECTS_USER_SKILLS_ROOT/" + PLUGIN_ID;
const DATA_DIR = "$HOME/.selects/plugin-data/" + PLUGIN_ID;
// Faded film strength when the Advanced toggle is on (the Inspector keeps 0-1).
const FADED_FILM = 0.35;
const WORD_MAX = 8;

// tpl-planner:start
// Torn Paper Love planner. A plain script: panel.tsx embeds it verbatim (between `// tpl-planner:start|end`) and the
// tests load it in node:vm. Pure and deterministic; no module syntax.
//
// The edit: N unique pictures shown twice in the same order (2N slots) on the cue's 8th-note grid. Pass 1 opens with
// two 2-unit shots and cycles [1, 2, 1, 1]; pass 2 is faster (1-unit shots, the last one 2 or 3 so the total is even).

// Canvas (4:3).
const TPL_W = 1440;
const TPL_H = 1080;
// Unique pictures per length (each is shown twice).
const TPL_LENGTHS = { short: 5, standard: 7, long: 10 };
const TPL_MIN_PICTURES = 3;
// The unit is the note value closest to TPL_UNIT_TARGET seconds within TPL_UNIT_RANGE (inclusive).
const TPL_UNIT_TARGET = 0.35;
const TPL_UNIT_RANGE = [0.28, 0.45];
// Fixed unit without a usable grid (No music, rejected own music, tempo out of range).
const TPL_FALLBACK_UNIT = 0.35;
// A video window keeps at least this much source after its longest slot.
const TPL_SOURCE_TAIL = 0.15;
// The Torn photo effect's clock: 'clip' (frame 0 = the clip's first timeline frame) or 'source'. Set by probe P-clock.
const TPL_EFFECT_CLOCK = 'clip';
// Filler candidates for videos without a search hit.
const TPL_FILLER_STEP = 0.5;
const TPL_FILLER_EDGE = 0.25;
const TPL_FILLER_SCORE = -2;
const TPL_FILLER_MAX = 48;

// The grid unit for a tempo: the 8th (0.5 beat) or, for double-time detections, the beat. A musical bar is 8 units in
// both cases. Returns null when neither lies in TPL_UNIT_RANGE. Ties go to the 8th.
function tplUnit(bpm) {
  if (typeof bpm !== 'number' || !isFinite(bpm) || !(bpm > 0)) return null;
  let best = null;
  for (const unitBeats of [0.5, 1]) {
    const unitSec = unitBeats * 60 / bpm;
    if (unitSec < TPL_UNIT_RANGE[0] - 1e-9 || unitSec > TPL_UNIT_RANGE[1] + 1e-9) continue;
    const d = Math.abs(unitSec - TPL_UNIT_TARGET);
    if (!best || d < best.d - 1e-12) best = { unitBeats, unitSec, barUnits: 8, d };
  }
  return best ? { unitBeats: best.unitBeats, unitSec: best.unitSec, barUnits: best.barUnits } : null;
}

// Slot lengths in units for N pictures. Relaxed doubles every entry.
function tplTemplate(N, pace) {
  const f = pace === 'relaxed' ? 2 : 1;
  const cycle = [1, 2, 1, 1];
  const pass1 = [];
  for (let i = 0; i < N; i++) pass1.push(N <= 4 || i < 2 ? 2 : cycle[(i - 2) % cycle.length]);
  const pass2 = [];
  for (let i = 0; i < N - 1; i++) pass2.push(1);
  const base = pass1.reduce((a, b) => a + b, 0) + (N - 1) + 2;
  pass2.push(base % 2 ? 3 : 2);
  const p1 = pass1.map(x => x * f), p2 = pass2.map(x => x * f);
  return { pass1: p1, pass2: p2, total: p1.concat(p2).reduce((a, b) => a + b, 0) };
}

// Where the music's beats land on the timeline. Selects snaps the music's source start (sectionStart) to a timeline
// frame, so the music plays offset by delta = sectionStart - round(sectionStart * fps) / fps (at most half a frame).
// Without music there is no offset.
function tplMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

// Onset snapping (CWV rules and constants, spec 2 and 15.4). Only anchors move: pass-1 boundaries that start a 2-unit
// slot, never boundary 0 or the end. A cut stays on the grid when a qualifying onset of any band lies within one frame;
// otherwise it moves onto the best strong onset within the window (min(0.10 beat, 70 ms); fixed-timing fallback: low
// band only, +/-120 ms), unless that would leave a neighbouring shot too short.
const TPL_SNAP_WINDOW_BEATS = 0.10;
const TPL_SNAP_WINDOW_MAX = 0.070;
const TPL_SNAP_MIN_STRENGTH = 2;
const TPL_SNAP_MIN_RATIO = 1.5;
const TPL_SNAP_DISTANCE_COST = 0.5;
const TPL_SNAP_LOW_MARGIN = 0.25;
const TPL_SNAP_MIN_FRAMES = 4;
const TPL_SNAP_MIN_SHARE = 0.75;
const TPL_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

// boundaries: grid seconds from the section start ([0, ..., end]). anchors: boundary indices that may snap.
// onsets: [[music-source seconds, 'l' | 'm' | 'h', strength], ...]. opts: { bpm, fps, sectionStart, thresholds?,
// lowConfidence? }. Returns { cuts (seconds like boundaries), log: one entry per moved cut, reasons: per anchor }.
function tplSnapCuts(boundaries, anchors, onsets, opts) {
  const fps = opts.fps, low = !!opts.lowConfidence;
  const beat = opts.bpm > 0 ? 60 / opts.bpm : Infinity;
  const offset = tplMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const reach = low ? TPL_SNAP_LOW_CONFIDENCE_WINDOW : Math.min(TPL_SNAP_WINDOW_BEATS * beat, TPL_SNAP_WINDOW_MAX);
  const bands = low ? ['l'] : ['l', 'm', 'h'];
  const thr = band => Math.max(TPL_SNAP_MIN_STRENGTH, (opts.thresholds && opts.thresholds[band]) || 0);
  const shift = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const list = (onsets || []).filter(o => o && isFinite(o[0]) && isFinite(o[2]) && o[2] >= thr(o[1]))
    .map(o => ({ x: o[0] - shift, band: o[1], strength: o[2], ratio: o[2] / thr(o[1]) }));
  const n = boundaries.length - 1;
  const cuts = boundaries.slice(), log = [], reasons = [];
  const pick = g => {
    const near = list.filter(o => Math.abs(o.x - g) <= reach + 1e-9).map(o => Object.assign({}, o, { d: Math.abs(o.x - g) }));
    if (near.some(o => o.d <= 1 / fps + 1e-9)) return { none: 'on grid' };
    const usable = near.filter(o => bands.indexOf(o.band) >= 0);
    if (!usable.length) return { none: 'no onset' };
    let best = null, why = 'weak onset';
    for (const o of usable) {
      if (o.ratio < TPL_SNAP_MIN_RATIO - 1e-9) continue;
      if (o.band === 'l') {
        const own = near.reduce((m, q) => (q.d < o.d - 1e-9 && q.ratio > m ? q.ratio : m), 1);
        if (o.ratio < own + TPL_SNAP_LOW_MARGIN - 1e-9) { why = 'low onset not above the grid'; continue; }
      }
      const score = o.ratio - TPL_SNAP_DISTANCE_COST * o.d / reach;
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && (o.d < best.d - 1e-9 || (Math.abs(o.d - best.d) <= 1e-9 && o.x < best.x)))) best = Object.assign({}, o, { score });
    }
    return best || { none: why };
  };
  const tooShort = (next, a, b) => {
    for (let k = Math.max(0, a); k <= Math.min(n - 1, b); k++) {
      const frames = frameOf(next[k + 1]) - frameOf(next[k]), grid = frameOf(boundaries[k + 1]) - frameOf(boundaries[k]);
      if (frames < Math.min(TPL_SNAP_MIN_FRAMES, grid)) return 'slot ' + k + ' min-frames';
      if (next[k + 1] - next[k] < TPL_SNAP_MIN_SHARE * (boundaries[k + 1] - boundaries[k]) - 1e-9) return 'slot ' + k + ' min-share';
    }
    return null;
  };
  const order = anchors.filter(i => i > 0 && i < n).sort((a, b) => a - b);
  for (const i of order) {
    const g = boundaries[i];
    const o = pick(g);
    if (o.none) { reasons.push({ index: i, reason: o.none }); continue; }
    const next = cuts.slice();
    next[i] = o.x;
    const bad = tooShort(next, i - 1, i);
    if (bad) { reasons.push({ index: i, reason: 'reverted: ' + bad }); continue; }
    cuts[i] = o.x;
    reasons.push({ index: i, reason: 'onset' });
    log.push({ index: i, from: g, to: o.x, band: o.band, offsetMs: Math.round((o.x - g) * 1e4) / 10, strength: o.strength, ratio: Math.round(o.ratio * 100) / 100 });
  }
  return { cuts, log, reasons };
}

// The cut plan. opts: { bpm | null, accepted, fps, N, pace, sectionStart (music seconds, null without music),
// onsets?, onsetThresholds?, lowConfidence? }. targets are continuous seconds from the section start (2N + 1
// boundaries incl. 0 and the end); frames[k] = k === 0 ? 0 : round((targets[k] + offset) * fps), from absolute
// positions only (never accumulated). units = each boundary's absolute unit position.
function tplSchedule(opts) {
  const fps = opts.fps, N = opts.N;
  if (!(fps > 0) || !(N >= 1)) throw Error('tplSchedule needs fps and N');
  const unit = opts.accepted ? tplUnit(opts.bpm) : null;
  const gridded = !!unit;
  const unitSec = gridded ? unit.unitSec : TPL_FALLBACK_UNIT;
  const factor = opts.pace === 'relaxed' ? 2 : 1;
  const tpl = tplTemplate(N, opts.pace);
  const lengths = tpl.pass1.concat(tpl.pass2);
  const units = [0];
  lengths.forEach(l => units.push(units[units.length - 1] + l));
  const grid = units.map(u => u * unitSec);
  const offset = tplMusicOffset(opts.sectionStart, fps);
  let targets = grid, snapLog = [];
  const hasSection = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart);
  if (opts.onsets && opts.onsets.length && hasSection) {
    // Anchors: pass-1 boundaries that start a 2-unit slot (base units), excluding boundary 0.
    const anchors = [];
    for (let i = 1; i < N; i++) if (tpl.pass1[i] === 2 * factor) anchors.push(i);
    const snapped = tplSnapCuts(grid, anchors, opts.onsets, { bpm: opts.bpm, fps, sectionStart: opts.sectionStart,
      thresholds: opts.onsetThresholds, lowConfidence: !gridded || !!opts.lowConfidence });
    targets = snapped.cuts; snapLog = snapped.log;
  }
  const frames = targets.map((t, k) => (k === 0 ? 0 : Math.round((t + offset) * fps)));
  const slots = lengths.map((l, i) => ({
    index: i,
    pass: i < N ? 1 : 2,
    pos: i < N ? i : i - N,
    units: l,
    startFrame: frames[i],
    endFrame: frames[i + 1],
  }));
  return {
    gridded, unitSec, offset, fps, N, pace: factor === 2 ? 'relaxed' : 'quick', tickUnits: factor,
    units, targets, frames, snapLog, slots,
    totalFrames: frames[frames.length - 1],
    lettersStartFrame: frames[1],
  };
}

// Largest N <= requested that the pictures and the music allow. usableEnd = Infinity (or omitted) without music.
function tplFitN(opts) {
  const unit = opts.accepted ? tplUnit(opts.bpm) : null;
  const unitSec = unit ? unit.unitSec : TPL_FALLBACK_UNIT;
  const start = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const end = typeof opts.usableEnd === 'number' && !isNaN(opts.usableEnd) ? opts.usableEnd : Infinity;
  const requested = Math.floor(opts.requested), available = Math.max(0, Math.floor(opts.available || 0));
  const cap = Math.min(requested, available);
  for (let N = cap; N >= TPL_MIN_PICTURES; N--) {
    if (start + tplTemplate(N, opts.pace).total * unitSec <= end + 1e-6) {
      return { N, reason: N === requested ? null : N === cap ? 'pictures' : 'music' };
    }
  }
  return { N: 0, reason: cap < TPL_MIN_PICTURES ? 'pictures' : 'music' };
}

// Parsed recording time, or null.
function tplTimeOf(p) {
  if (!p || typeof p.recordedAt !== 'string' || !p.recordedAt) return null;
  const t = Date.parse(p.recordedAt);
  return isFinite(t) ? t : null;
}

// Recording date ascending; missing dates after dated ones in input (Project) order; ties by resource id.
function tplOrder(pictures) {
  return (pictures || []).map((p, i) => ({ p, i, t: tplTimeOf(p) })).sort((a, b) => {
    if (a.t !== null && b.t !== null) {
      if (a.t !== b.t) return a.t - b.t;
      const ra = String(a.p.rid), rb = String(b.p.rid);
      return ra < rb ? -1 : ra > rb ? 1 : a.i - b.i;
    }
    if (a.t !== null) return -1;
    if (b.t !== null) return 1;
    return a.i - b.i;
  }).map(x => x.p);
}

function tplHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// A uniform [0, 1) value for a key: FNV-1a (tplHash) followed by the murmur3 finaliser. FNV-1a alone barely moves its
// high bits for a change in the last character, so keys that differ only in a trailing index would be correlated.
function tplRandom(str) {
  let h = Math.floor(tplHash(str) * 4294967296);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Seed for a picture's tear/tilt: the same identity and version give the same seed (both passes share it).
function tplSeedFor(identity, versionSeed) {
  return Math.floor(tplHash(String(identity) + ':' + String(versionSeed)) * 4294967296) >>> 0;
}

// A picture's identity: the resource id for photos, resource id + source start for videos.
function tplIdentity(p) {
  return p.kind === 'video' ? p.rid + '@' + Number(p.startSeconds || 0).toFixed(3) : String(p.rid);
}

// n of the ordered list, one per equal stratum, chosen with the seed. All of it when it has n or fewer.
function tplStrata(list, n, seed, tag) {
  if (list.length <= n) return list.slice();
  const out = [];
  for (let k = 0; k < n; k++) {
    const lo = Math.floor(k * list.length / n), hi = Math.floor((k + 1) * list.length / n);
    const at = lo + Math.min(hi - lo - 1, Math.floor(tplRandom(String(seed) + ':' + tag + ':' + k) * (hi - lo)));
    out.push(list[at]);
  }
  return out;
}

// Picks: photos first, videos only when photos run short and useVideos. Among more candidates of a kind than needed,
// one per equal date stratum (seeded). Returned in tplOrder. pictures: [{ rid, kind: 'photo' | 'video', name, width,
// height, recordedAt, startSeconds (videos, chosen by the caller) }]; a resource counts once.
function tplPick(opts) {
  const N = Math.max(0, Math.floor(opts.N || 0));
  const seen = {}, photos = [], videos = [];
  for (const p of opts.pictures || []) {
    if (!p || typeof p.rid !== 'string' || seen[p.rid]) continue;
    seen[p.rid] = true;
    if (p.kind === 'photo') photos.push(p); else if (p.kind === 'video') videos.push(p);
  }
  const chosenPhotos = tplStrata(tplOrder(photos), N, opts.seed, 'photo');
  const rest = N - chosenPhotos.length;
  const chosenVideos = rest > 0 && opts.useVideos ? tplStrata(tplOrder(videos), rest, opts.seed, 'video') : [];
  const picks = tplOrder(chosenPhotos.concat(chosenVideos)).map(p => {
    const k = { rid: p.rid, kind: p.kind, name: p.name, width: p.width, height: p.height, recordedAt: p.recordedAt };
    if (p.kind === 'video') k.startSeconds = Number(p.startSeconds) || 0;
    k.identity = tplIdentity(k);
    return k;
  });
  return { picks, photoCount: chosenPhotos.length, videoCount: chosenVideos.length };
}

// A video's source window start: a whole frame at the real fps, slid back so the longest slot plus the tail fits.
// null when the clip is too short.
function tplVideoWindow(opts) {
  const fps = opts.fps, D = opts.duration, need = opts.maxSlotFrames / fps + TPL_SOURCE_TAIL;
  if (!(fps > 0) || typeof D !== 'number' || !isFinite(D) || !(opts.maxSlotFrames > 0)) return null;
  const hit = typeof opts.hitStart === 'number' && isFinite(opts.hitStart) ? Math.max(0, opts.hitStart) : 0;
  let f = Math.floor(hit * fps + 1e-6);
  const latest = Math.floor((D - need) * fps + 1e-6);
  if (latest < 0) return null;
  if (f > latest) f = latest;
  return { startSeconds: f / fps };
}

// The 2N placements: pass 2 repeats pass 1's picks in the same order. Throws on adjacent repeats.
function tplSlots(schedule, picks) {
  const N = schedule.N != null ? schedule.N : schedule.slots.length / 2;
  if (!picks || picks.length !== N) throw Error('tplSlots needs ' + N + ' picks');
  const out = schedule.slots.map(s => {
    const p = picks[s.pos];
    return { index: s.index, pass: s.pass, pos: s.pos, rid: p.rid, kind: p.kind, identity: p.identity || tplIdentity(p),
      startSeconds: p.kind === 'video' ? Number(p.startSeconds) || 0 : 0, startFrame: s.startFrame, endFrame: s.endFrame };
  });
  for (let i = 1; i < out.length; i++) if (out[i].rid === out[i - 1].rid) throw Error('tplSlots: adjacent slots ' + (i - 1) + ' and ' + i + ' share a resource');
  return out;
}

// Transitions per slot (entry / exit), over 2N slots.
function tplTransitions(N) {
  const out = [];
  for (let i = 0; i < 2 * N; i++) out.push({ index: i, entry: 'none', exit: 'none' });
  const set = (i, key, v) => { if (i >= 0 && i < out.length) out[i][key] = v; };
  set(0, 'entry', 'slide');
  set(1, 'entry', 'paper-flash');
  set(1, 'exit', 'glow-out');
  if (N - 1 > 1) set(N - 1, 'entry', 'glow-in');
  set(N >= 5 ? N + 3 : N + Math.floor(N / 2), 'entry', 'tear');
  set(2 * N - 1, 'entry', 'paper-flash-short');
  return out;
}

// Transition phases in 30 fps frames.
const TPL_PHASES = {
  'paper-flash': [['white', 1], ['over', 2], ['normal', 1], ['full', 2]],
  'paper-flash-short': [['white', 1], ['over', 1], ['full', 1]],
  'glow-in': [['glow', 2]],
  'glow-out': [['glow', 2]],
  tear: [['tear', 2]],
};
// The slide intro in fractions of its slot: black until `black`, ease-in slide until `land`, then hold.
const TPL_SLIDE = { black: 0.28, land: 0.76 };

// Phases at fps: cumulative boundaries b_k = round(B_k * fps / 30), then strictly increasing (each phase >= 1 frame).
// 'slide' returns fractions of the slot (fraction: true); 'none' returns [].
function tplPhaseFrames(kind, fps) {
  if (kind === 'none') return [];
  if (kind === 'slide') return [{ name: 'black', start: 0, end: TPL_SLIDE.black, fraction: true }, { name: 'slide', start: TPL_SLIDE.black, end: TPL_SLIDE.land, fraction: true }];
  const table = TPL_PHASES[kind];
  if (!table) throw Error('unknown transition ' + kind);
  const out = [];
  let B = 0, prev = 0;
  for (const [name, n] of table) {
    B += n;
    const b = Math.max(prev + 1, Math.round(B * fps / 30));
    out.push({ name, start: prev, end: b });
    prev = b;
  }
  return out;
}

// Re-style ticks for the letters: every unit boundary after lettersStartFrame (every doubled unit in Relaxed),
// relative to it, before the end. A tick on a slot boundary uses the cut's frame.
function tplLetterTicks(schedule) {
  const s = schedule, units = s.units, step = s.tickUnits || 1, last = units[units.length - 1];
  const start = s.lettersStartFrame, span = s.totalFrames - start;
  const out = [];
  for (let u = units[1] + step; u < last - 1e-9; u += step) {
    const k = units.indexOf(u);
    const f = k >= 0 ? s.frames[k] : Math.round((u * s.unitSec + s.offset) * s.fps);
    const rel = f - start;
    if (rel > 0 && rel < span && (!out.length || rel > out[out.length - 1])) out.push(rel);
  }
  return out;
}

// Native cover transform and the visible canvas rectangle. Selects conforms a clip to fit the canvas; scaling it by
// cover = fill / fit makes it cover the canvas (as CWV assemble). vis = the canvas window in % of the clip's own box.
// Portrait sources anchor the crop at 40 % from the top (the point 40 % down the photo stays 40 % down the canvas);
// others centre. shift = the clip translation in canvas pixels that the assembler applies for that anchor (positive y =
// down; 0 when centred).
function tplVisRect(srcW, srcH, W, H) {
  W = W || TPL_W; H = H || TPL_H;
  const full = { cover: 1, vis: { x: 0, y: 0, w: 100, h: 100 }, shift: { x: 0, y: 0 } };
  if (!(typeof srcW === 'number' && srcW > 0 && isFinite(srcW) && typeof srcH === 'number' && srcH > 0 && isFinite(srcH))) return full;
  const fit = Math.min(W / srcW, H / srcH), fill = Math.max(W / srcW, H / srcH);
  const cover = fill / fit;
  if (cover <= 1.001) return full;
  const bw = srcW * fill, bh = srcH * fill;
  const w = W / bw * 100, h = H / bh * 100;
  const ay = srcH > srcW ? 0.4 : 0.5;
  return {
    cover,
    vis: { x: (100 - w) / 2, y: ay * (100 - h), w, h },
    shift: { x: 0, y: (0.5 - ay) * (bh - H) },
  };
}

// Bar length in detected beats: 8 units (4 beats for the 8th unit, 8 for a double-time beat unit); 4 without a unit.
function tplBarBeats(bpm) {
  const u = tplUnit(bpm);
  return u ? u.barUnits * u.unitBeats : 4;
}

// Section slider snap (CWV) with the musical bar = 8 units.
function tplSnapSection(opts) {
  const latest = opts.usableEnd - opts.videoSeconds;
  if (latest < -1e-6) return null;
  if (!opts.gridAccepted) return Math.max(0, Math.min(Math.floor(latest * 10) / 10, Math.round(opts.value * 10) / 10));
  const bar = tplBarBeats(opts.bpm) * 60 / opts.bpm;
  const maxK = Math.floor((latest - opts.firstBeat) / bar + 1e-9);
  if (maxK < 0) return null;
  const k = Math.max(0, Math.min(maxK, Math.round((opts.value - opts.firstBeat) / bar)));
  return opts.firstBeat + k * bar;
}

// Default section (CWV): the bar start whose window has the highest mean beat energy.
function tplDefaultSection(opts) {
  const beat = 60 / opts.bpm, barBeats = tplBarBeats(opts.bpm), span = Math.round(opts.videoSeconds / beat);
  let best = null;
  for (let k = 0; ; k++) {
    const start = opts.firstBeat + k * barBeats * beat;
    if (start + opts.videoSeconds > opts.usableEnd + 1e-6) break;
    const slice = opts.beatEnergy.slice(k * barBeats, k * barBeats + span);
    if (slice.length < span) break;
    const mean = slice.reduce((a, b) => a + b, 0) / span;
    if (!best || mean > best.mean + 1e-9) best = { start, mean };
  }
  return best ? best.start : null;
}

// Filler candidates every TPL_FILLER_STEP seconds on each source, at most TPL_FILLER_MAX per source, by rid then time.
function tplFillers(candidates) {
  const dur = {};
  for (const c of candidates || []) {
    if (!c || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    for (let k = 0; k < TPL_FILLER_MAX; k++) {
      const t = TPL_FILLER_EDGE + k * TPL_FILLER_STEP;
      if (t > dur[rid] - TPL_FILLER_EDGE + 1e-9) break;
      out.push({ rid, role: 'filler', t, score: TPL_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// Build steps shown in the panel's progress bar, with each step's share of the bar in percent.
const TPL_BUILD_STEPS = [
  { id: 'pictures', label: 'Reading your pictures', weight: 15 },
  { id: 'moments', label: 'Finding moments', weight: 25 },
  { id: 'plan', label: 'Planning', weight: 10 },
  { id: 'place', label: 'Placing pictures', weight: 30 },
  { id: 'decorate', label: 'Adding letters and paper', weight: 20 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function tplProgress(stepId, fraction, detail) {
  const i = TPL_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = TPL_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = TPL_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + TPL_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  const step = TPL_BUILD_STEPS[i];
  return {
    value,
    percent,
    current: i,
    label: 'Step ' + (i + 1) + '/' + TPL_BUILD_STEPS.length + ' · ' + step.label + (detail ? ' (' + detail + ')' : '') + ' · ' + percent + '%',
  };
}
// tpl-planner:end

// tpl-config:start
const TPL_AMBIENT_DB = -18;
// Timeline rate used to plan before the Draft exists (display, video windows); decorate re-times at the real rate.
const TPL_PLAN_FPS = 30;
const TPL_BACKDROPS = { night: 'Night', red: 'Red curtain', kraft: 'Kraft', photo: 'Photo' };
const TPL_BACKDROP_COLORS = { night: '#151113', red: '#4a0f12', kraft: '#6b5a45', photo: '#151113' };
const TPL_LENGTH_LABELS = { short: 'Short', standard: 'Standard', long: 'Long' };
const TPL_TORN_NAME = 'Torn photo';
const TPL_LETTERS_NAME = 'Ransom letters';
const TPL_INSET = 88; // Photo size in % (the effect also reads 0.88); stored in the editable's units
const TPL_EDGE = 1.4;
const TPL_TILT_MAX = 1.5;
const TPL_MOTION_STRENGTH = 0.5;
const TPL_LETTER_SIZE = 6.7;
const TPL_LETTER_Y = 50;
const TPL_ACCENT = '#d0201a';
const TPL_MUSIC_FADE = 0.12;

function tplPad2(n) { return (n < 10 ? '0' : '') + n; }

// "Torn Paper Love <Backdrop> <Length> <yyyy-mm-dd hh:mm:ss>" in local time; the seconds tell apart two versions
// built within the same minute.
function tplDraftName(backdrop, length, now) {
  const t = new Date(now == null ? Date.now() : now);
  const stamp = t.getFullYear() + '-' + tplPad2(t.getMonth() + 1) + '-' + tplPad2(t.getDate()) + ' ' + tplPad2(t.getHours()) + ':' + tplPad2(t.getMinutes()) + ':' + tplPad2(t.getSeconds());
  return 'Torn Paper Love ' + (TPL_BACKDROPS[backdrop] || TPL_BACKDROPS.night) + ' ' + (TPL_LENGTH_LABELS[length] || TPL_LENGTH_LABELS.standard) + ' ' + stamp;
}

// Options with the frozen defaults filled in.
function tplOptions(o) {
  o = o || {};
  const pick = (v, list, d) => (list.indexOf(v) >= 0 ? v : d);
  const words = Array.isArray(o.words) ? o.words : ['MY', 'LOVE'];
  const look = typeof o.look === 'number' && isFinite(o.look) ? Math.max(0, Math.min(1, o.look)) : o.look === false ? 0 : 0.35;
  return {
    words: [String(words[0] == null ? '' : words[0]), String(words[1] == null ? '' : words[1])],
    backdrop: pick(o.backdrop, Object.keys(TPL_BACKDROPS), 'night'),
    length: pick(o.length, Object.keys(TPL_LENGTHS), 'standard'),
    pace: pick(o.pace, ['quick', 'relaxed'], 'quick'),
    clipSound: pick(o.clipSound, ['off', 'ambient', 'full'], 'ambient'),
    look,
    tilt: !!o.tilt,
    useVideos: o.useVideos !== false,
    only: Array.isArray(o.only) ? o.only.map(String) : null,
    seed: o.seed == null ? 1 : o.seed,
    section: typeof o.section === 'number' && isFinite(o.section) ? o.section : 'default',
  };
}

// The music grid of a manifest cue (bundled cues are accepted by construction), or the fixed grid without music.
function tplGrid(cue) {
  if (!cue) return { bpm: null, accepted: false, firstBeat: 0, usableEnd: null, beatEnergy: [], onsets: [], onsetThresholds: null };
  return { bpm: cue.bpm, accepted: cue.accepted !== false, firstBeat: cue.firstBeat || 0, usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy || [],
    onsets: cue.onsets || [], onsetThresholds: cue.onsetThresholds || null };
}

function tplUnitSec(grid) {
  const u = grid.accepted ? tplUnit(grid.bpm) : null;
  return u ? u.unitSec : TPL_FALLBACK_UNIT;
}

// The section start (music seconds) for a video of `videoSeconds`: 'default' = the highest-energy bar window, a number
// snaps to a bar (clamped to the last bar that fits). null without music.
function tplSectionStart(grid, section, videoSeconds) {
  if (grid.bpm == null) return null;
  if (section === 'default') {
    const d = tplDefaultSection({ bpm: grid.bpm, firstBeat: grid.firstBeat, usableEnd: grid.usableEnd, beatEnergy: grid.beatEnergy, videoSeconds });
    if (d != null) return d;
  }
  const v = typeof section === 'number' ? section : grid.firstBeat;
  const snapped = tplSnapSection({ value: v, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: grid.accepted });
  return snapped == null ? grid.firstBeat : snapped;
}

// Everything the build needs, planned at TPL_PLAN_FPS. input: { projectId, inv: { photos, resources } (inventory.js),
// found: { best: { [rid]: seconds | null } } (search.js), cue: manifest cue | null (No music), options (tplOptions),
// now (draft name time) }. Returns { ok: false, reason } when it can't be built.
function tplPlanState(input) {
  const options = tplOptions(input.options);
  const fail = reason => ({ ok: false, reason, options });
  if (!options.words.some(w => w.trim())) return fail('Type at least one word');
  const inv = input.inv || {};
  const best = (input.found && input.found.best) || {};
  const grid = tplGrid(input.cue || null);
  const unitSec = tplUnitSec(grid);
  const wanted = r => !options.only || options.only.indexOf(r.rid) >= 0;
  const photosAll = (inv.photos || []).filter(wanted);
  const photos = photosAll.filter(p => p.width > 0 && p.height > 0);
  const videosAll = options.useVideos ? (inv.resources || []).filter(r => wanted(r) && r.duration > 0) : [];
  const requested = TPL_LENGTHS[options.length];
  const usableEnd = grid.usableEnd == null ? Infinity : grid.usableEnd;

  // N, the section and the eligible videos depend on each other (a video must hold its longest slot + the tail, the
  // longest slot depends on N, N on how many pictures are eligible): iterate to a fixed point; it only shrinks.
  let videos = videosAll, N = 0, fitReason = null, sectionStart = null, schedule = null;
  for (let round = 0; round < 8; round++) {
    const available = photos.length + videos.length;
    const tentative = Math.min(requested, available);
    if (tentative < TPL_MIN_PICTURES) return fail('Add at least 3 photos or clips');
    sectionStart = tplSectionStart(grid, options.section, tplTemplate(tentative, options.pace).total * unitSec);
    const fit = tplFitN({ requested, available, sectionStart: sectionStart == null ? 0 : sectionStart, usableEnd, bpm: grid.bpm, accepted: grid.accepted, pace: options.pace });
    if (!fit.N) {
      if (fit.reason === 'pictures') return fail('Add at least 3 photos or clips');
      return fail('This track needs at least ' + (tplTemplate(TPL_MIN_PICTURES, options.pace).total * unitSec).toFixed(1) + ' s from the section start');
    }
    N = fit.N; fitReason = fit.reason;
    schedule = tplSchedule({ bpm: grid.bpm, accepted: grid.accepted, fps: TPL_PLAN_FPS, N, pace: options.pace, sectionStart,
      onsets: grid.onsets, onsetThresholds: grid.onsetThresholds || undefined, lowConfidence: false });
    const longest = schedule.slots.reduce((m, x) => Math.max(m, x.endFrame - x.startFrame), 0);
    const next = videos.filter(v => tplVideoWindow({ duration: v.duration, hitStart: 0, maxSlotFrames: longest, fps: TPL_PLAN_FPS }) != null);
    if (next.length === videos.length) break;
    videos = next;
  }

  // Provisional video starts (the search hit, else a seeded filler on the 0.5 s grid); picking doesn't depend on them.
  const startOf = v => {
    const hit = best[v.rid];
    if (typeof hit === 'number' && isFinite(hit)) return hit;
    const fillers = tplFillers([{ rid: v.rid, sourceDuration: v.duration }]);
    if (!fillers.length) return 0;
    return fillers[Math.min(fillers.length - 1, Math.floor(tplRandom(String(options.seed) + ':filler:' + v.rid) * fillers.length))].t;
  };
  const pool = photos.map(p => ({ rid: p.rid, kind: 'photo', name: p.name, width: p.width, height: p.height, recordedAt: p.recordedAt || null, order: p.order }))
    .concat(videos.map(v => ({ rid: v.rid, kind: 'video', name: v.name, width: v.width, height: v.height, recordedAt: v.recordedAt || null, order: v.order, startSeconds: startOf(v) })))
    .map((p, i) => ({ p, i })).sort((a, b) => (typeof a.p.order === 'number' && typeof b.p.order === 'number' ? a.p.order - b.p.order : 0) || a.i - b.i).map(x => x.p);
  const picked = tplPick({ pictures: pool, N, seed: options.seed, useVideos: options.useVideos });
  // Final video windows: a whole frame, slid back so the longer of the picture's two slots + the tail fits. Identity
  // (and so the tear seed) uses the final start.
  const duration = {};
  for (const v of videos) duration[v.rid] = v.duration;
  const picks = picked.picks.map((p, pos) => {
    const k = { rid: p.rid, kind: p.kind, name: p.name, width: p.width, height: p.height, recordedAt: p.recordedAt || null };
    if (p.kind === 'video') {
      const longest = Math.max(schedule.slots[pos].endFrame - schedule.slots[pos].startFrame, schedule.slots[N + pos].endFrame - schedule.slots[N + pos].startFrame);
      const w = tplVideoWindow({ duration: duration[p.rid], hitStart: p.startSeconds, maxSlotFrames: longest, fps: TPL_PLAN_FPS });
      if (!w) throw Error('tplPlanState: no window for ' + p.rid);
      k.startSeconds = w.startSeconds;
    }
    k.identity = tplIdentity(k);
    return k;
  });
  const slots = tplSlots(schedule, picks);
  const sizes = {};
  for (const p of picks) if (p.width > 0 && p.height > 0) sizes[p.rid] = { width: p.width, height: p.height };
  return {
    ok: true,
    projectId: input.projectId == null ? null : input.projectId,
    options,
    cue: input.cue ? { id: input.cue.id, label: input.cue.label || input.cue.id, file: input.cue.file || null, bpm: input.cue.bpm } : null,
    requested, N, fitReason,
    picks, photoCount: picked.photoCount, videoCount: picked.videoCount,
    order: picks.map(p => p.identity),
    excluded: { unmeasuredPhotos: photosAll.length - photos.length, shortVideos: videosAll.length - videos.length },
    gridded: schedule.gridded, unitSec: schedule.unitSec,
    sectionStart: sectionStart == null ? 0 : sectionStart,
    musicStart: sectionStart,
    schedule, targets: schedule.targets, slots,
    transitions: tplTransitions(N),
    seconds: schedule.targets[schedule.targets.length - 1],
    sizes,
    draftName: tplDraftName(options.backdrop, options.length, input.now),
  };
}

// The cover transform of a sized picture: portrait sources anchor the crop 40 % from the top, others centre.
function tplCover(size) {
  if (!size) return null;
  return { cover: tplVisRect(size.width, size.height, TPL_W, TPL_H).cover, anchorY: size.height > size.width ? 0.4 : 0.5 };
}

// scripts/assemble.js cfg. music = ensure-audio's { resourceId } or null (No music).
function tplAssembleConfig(state, music) {
  const vis = {};
  for (const p of state.picks) if (state.sizes[p.rid]) vis[p.rid] = tplCover(state.sizes[p.rid]);
  return {
    projectId: state.projectId,
    draftName: state.draftName,
    slots: state.slots.map(x => ({ rid: x.rid, kind: x.kind, startSeconds: x.kind === 'video' ? x.startSeconds : 0 })),
    targets: state.targets.slice(),
    music: music && state.cue && state.musicStart != null ? { resourceId: music.resourceId, sectionStart: state.musicStart } : null,
    clipSound: state.options.clipSound,
    ambientDb: TPL_AMBIENT_DB,
    vis,
    W: TPL_W, H: TPL_H,
  };
}

// The planned boundaries at a real rate, as assemble.js aims them: round((target + offset) * fps), never re-snapped
// (snapping depends on fps; the Draft was built from the planned targets).
function tplPlannedFrames(state, fps) {
  const off = tplMusicOffset(state.musicStart, fps);
  return state.targets.map((t, k) => (k === 0 ? 0 : Math.round((t + off) * fps)));
}

// A schedule-shaped timing at the Draft's real rate. `frames` (assemble's read-back boundaries) win over the planned
// ones when they differ; the grid units stay the plan's.
function tplTimingAt(state, fps, frames) {
  const planned = tplPlannedFrames(state, fps);
  const f = Array.isArray(frames) ? frames.slice() : planned;
  if (f.length !== planned.length) throw Error('tplTimingAt: the Draft has ' + (f.length - 1) + ' clips (frames), the plan ' + (planned.length - 1));
  const sc = state.schedule;
  const slots = sc.slots.map((x, i) => ({ index: x.index, pass: x.pass, pos: x.pos, units: x.units, startFrame: f[i], endFrame: f[i + 1] }));
  return {
    fps, offset: tplMusicOffset(state.musicStart, fps), gridded: sc.gridded, unitSec: sc.unitSec, N: sc.N, pace: sc.pace, tickUnits: sc.tickUnits,
    units: sc.units.slice(), targets: state.targets.slice(), frames: f, slots,
    totalFrames: f[f.length - 1], lettersStartFrame: f[1],
    planned, framesMatch: planned.every((x, k) => x === f[k]),
  };
}

// A transition's phases in frames at fps; 'slide' (fractions of the slot, drawn by the effect) and 'none' have none.
function tplPhasesFor(kind, fps) {
  if (!kind || kind === 'none' || kind === 'slide') return [];
  return tplPhaseFrames(kind, fps).map(p => ({ name: p.name, start: p.start, end: p.end }));
}

function tplTornEditable(state) {
  const o = state.options;
  return [
    { key: 'look', label: 'Faded film', type: 'number', defaultValue: o.look, min: 0, max: 1, step: 0.05 },
    { key: 'backdropColor', label: 'Backdrop colour', type: 'color', defaultValue: TPL_BACKDROP_COLORS[o.backdrop] },
    { key: 'edge', label: 'Edge width', type: 'number', defaultValue: TPL_EDGE, min: 0.5, max: 3, step: 0.1 },
    { key: 'inset', label: 'Photo size', type: 'number', defaultValue: TPL_INSET, min: 70, max: 95, step: 1 },
    { key: 'tilt', label: 'Tilt', type: 'number', defaultValue: 0, min: -5, max: 5, step: 0.5 },
    { key: 'seed', label: 'Tear seed', type: 'number', defaultValue: 0, min: 0, max: 9999, step: 1 },
    { key: 'motion', label: 'Photo motion', type: 'select', defaultValue: 'off', options: [
      { label: 'Off', value: 'off' }, { label: 'Push in', value: 'push-in' }, { label: 'Pull out', value: 'pull-out' }, { label: 'Drift', value: 'drift' }] },
    { key: 'motionStrength', label: 'Motion strength', type: 'number', defaultValue: TPL_MOTION_STRENGTH, min: 0, max: 1, step: 0.05 },
  ];
}

function tplLettersEditable(state) {
  const o = state.options;
  const seed = typeof o.seed === 'number' && isFinite(o.seed) ? o.seed : 0;
  return [
    { key: 'word1', label: 'Word 1', type: 'text', defaultValue: o.words[0] },
    { key: 'word2', label: 'Word 2', type: 'text', defaultValue: o.words[1] },
    { key: 'size', label: 'Size', type: 'number', defaultValue: TPL_LETTER_SIZE, min: 4.5, max: 10, step: 0.1 },
    { key: 'y', label: 'Vertical position', type: 'number', defaultValue: TPL_LETTER_Y, min: 30, max: 70, step: 1 },
    { key: 'accent', label: 'Accent colour', type: 'color', defaultValue: TPL_ACCENT },
    { key: 'seed', label: 'Letter seed', type: 'number', defaultValue: Math.max(0, Math.min(999999, Math.round(seed))), min: 0, max: 999999, step: 1 },
    { key: 'restyle', label: 'Re-style', type: 'boolean', defaultValue: true },
  ];
}

// scripts/decorate.js cfg. assembled = assemble.js's result ({ sequenceId, fps, frames }); assets = { tornTsx,
// lettersTsx, looks (assets/fonts/looks.json), fonts: { family: dataUrl } }.
function tplDecorateConfig(state, assembled, assets) {
  const o = state.options, fps = assembled.fps;
  const timing = tplTimingAt(state, fps, assembled.frames);
  const clips = state.slots.map((x, i) => {
    const t = state.transitions[i];
    const seed = tplSeedFor(x.identity, o.seed) % 10000; // small enough for an Inspector field
    const size = state.sizes[x.rid];
    const tilt = o.tilt ? Math.round((tplRandom(seed + ':tilt') * 2 - 1) * TPL_TILT_MAX * 100) / 100 : 0;
    return {
      rid: x.rid,
      sourceStartSeconds: x.kind === 'video' ? x.startSeconds : 0,
      data: {
        seed, vis: tplVisRect(size ? size.width : null, size ? size.height : null, TPL_W, TPL_H).vis,
        inset: TPL_INSET, edge: TPL_EDGE, backdrop: o.backdrop, backdropColor: TPL_BACKDROP_COLORS[o.backdrop], allowPhotoBackdrop: true,
        look: o.look, tilt,
        entry: t.entry, exit: t.exit, phases: { entry: tplPhasesFor(t.entry, fps), exit: tplPhasesFor(t.exit, fps) },
        clock: TPL_EFFECT_CLOCK, motion: 'off', motionStrength: TPL_MOTION_STRENGTH,
      },
    };
  });
  const looks = assets.looks || {};
  return {
    sequenceId: assembled.sequenceId,
    mute: o.clipSound === 'off',
    photos: state.picks.filter(p => p.kind === 'photo').map(p => p.rid),
    torn: { tsx: assets.tornTsx, editable: tplTornEditable(state), clips },
    letters: {
      tsx: assets.lettersTsx,
      parameters: {
        word1: o.words[0], word2: o.words[1], size: TPL_LETTER_SIZE, y: TPL_LETTER_Y, accent: TPL_ACCENT, seed: o.seed, restyle: true,
        ticks: tplLetterTicks(timing),
        looks: looks.looks || [], advance: looks.advance || {}, faces: looks.faces || {}, fonts: assets.fonts || {},
      },
      editable: tplLettersEditable(state),
      startFrame: timing.lettersStartFrame,
      endFrame: timing.totalFrames,
    },
    timing: { fps, framesMatch: timing.framesMatch, planned: timing.planned },
  };
}

// Readback expectations (kit tools/drive/readback.mjs). cuts = every Main clip's end frame as planned at the real
// rate (what assemble.js aims at). Photos keep 0 dB under Ambient (only videos are lowered), so the per-clip level
// check applies to all-video builds only.
function tplExpected(state, assembled, music) {
  const fps = assembled.fps;
  const frames = tplPlannedFrames(state, fps);
  const o = state.options;
  const exp = {
    frameSize: { width: TPL_W, height: TPL_H }, fps,
    cuts: frames.slice(1), noAdjacent: true,
    graphics: [{ name: TPL_LETTERS_NAME, count: 1, startFrame: frames[1], endFrame: frames[frames.length - 1] }],
    effects: [{ name: TPL_TORN_NAME, perMainClip: 1 }],
    music: state.cue && state.musicStart != null ? Object.assign(music && music.resourceId ? { resourceId: music.resourceId } : {}, { db: 0, fadeOutSeconds: TPL_MUSIC_FADE }) : { none: true },
  };
  if (o.clipSound === 'off') exp.clipSound = { mode: 'off' };
  else if (state.picks.every(p => p.kind === 'video')) exp.clipSound = { mode: 'level', db: o.clipSound === 'ambient' ? TPL_AMBIENT_DB : 0 };
  return exp;
}
// tpl-config:end

// tpl-letters:start
// Pure helpers (no DOM, no React); the tests and the panel preview run this block as is.
var TPL_MAX_LETTERS = 8;
var TPL_CAP_RATIO = 0.7; // cap height / font size used to turn the glyph height into a font size
var TPL_PAD_MIN = 0.08, TPL_PAD_MAX = 0.14; // chip padding, fraction of the glyph height
var TPL_ROT_MAX = 4; // degrees
var TPL_JITTER_MAX = 0.04; // baseline jitter, fraction of the glyph height
var TPL_GAP = 0.03; // space between chips, fraction of the glyph height
var TPL_LEFT = 0.05, TPL_RIGHT = 0.94, TPL_BAND = 0.32, TPL_MIN_GLYPH = 0.045;
var TPL_FALLBACK_EM = 0.75, TPL_WIDE_EM = 1.0, TPL_SPACE_EM = 0.3, TPL_DEFAULT_EM = 0.6;
var TPL_HEART = { ch: "\u2665", em: 0.9 };
var TPL_ACCENT_BASE = "#d0201a";
var TPL_SUPPORTED = /^[A-Za-z0-9.,!?&'\-]$/;

// Seeded random stream from a seed and salts (FNV-1a hash into mulberry32).
function tplRng() {
  var s = Array.prototype.join.call(arguments, "|");
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  var a = h >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Trimmed word -> at most 8 graphemes; inner whitespace runs become one " " gap.
function tplGraphemes(text) {
  if (typeof text !== "string") return [];
  var t = text.trim().replace(/\s+/g, " ");
  if (!t) return [];
  var out = [];
  if (typeof Intl !== "undefined" && Intl && typeof Intl.Segmenter === "function") {
    var it = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t);
    for (var seg of it) { out.push(seg.segment); if (out.length >= TPL_MAX_LETTERS) break; }
  } else {
    out = Array.from(t).slice(0, TPL_MAX_LETTERS);
  }
  return out;
}

function tplSupported(ch) {
  return ch === TPL_HEART.ch || (typeof ch === "string" && TPL_SUPPORTED.test(ch));
}

function tplKind(ch) {
  if (ch === " ") return "space";
  if (ch === TPL_HEART.ch) return "heart";
  return tplSupported(ch) ? "glyph" : "fallback";
}

// The character a look shows for a typed letter.
function tplCased(ch, look) {
  if (!look || look.case === "any") return ch;
  return look.case === "lower" ? ch.toLowerCase() : ch.toUpperCase();
}

// Advance table lookup (per 1000 em) -> em; null when the face lacks the character.
function tplFaceEm(advance, face, ch) {
  var t = advance && advance[face];
  if (!t) return null;
  var v = t[ch];
  return typeof v === "number" && isFinite(v) && v > 0 ? v / 1000 : null;
}

// Width in em of a letter: the widest of the given faces (all faces of the table when
// null), upper and lower case both counted so the slot fits every look of the letter.
function tplLetterEm(ch, faces, advance) {
  var kind = tplKind(ch);
  if (kind === "space") return TPL_SPACE_EM;
  if (kind === "heart") return TPL_HEART.em;
  if (kind === "fallback") {
    var cp = ch.codePointAt(0) || 0;
    return cp >= 0x1100 ? TPL_WIDE_EM : TPL_FALLBACK_EM;
  }
  var list = faces || Object.keys(advance || {});
  var best = 0;
  for (var i = 0; i < list.length; i++) {
    var cs = [ch.toUpperCase(), ch.toLowerCase()];
    for (var j = 0; j < cs.length; j++) {
      var e = tplFaceEm(advance, list[i], cs[j]);
      if (e != null && e > best) best = e;
    }
  }
  return best > 0 ? best : TPL_DEFAULT_EM;
}

// Per letter a seeded set of 2-4 distinct look ids. The first id is the letter's look at
// tick 0 and differs from its neighbour's when possible; at most one lower-case look per
// letter; a look whose face lacks the (cased) glyph is not offered. Gaps and unsupported
// characters get [] (no chip / fallback chip).
function tplAssignLooks(letters, seed, looks, advance) {
  var out = [];
  var prevFirst = null;
  for (var i = 0; i < letters.length; i++) {
    var ch = letters[i];
    var kind = tplKind(ch);
    if (kind === "space" || kind === "fallback") { out.push([]); continue; }
    var cands = [];
    for (var k = 0; k < (looks || []).length; k++) {
      var lk = looks[k];
      if (!lk || typeof lk.id !== "string") continue;
      if (kind === "glyph" && advance && advance[lk.face] && tplFaceEm(advance, lk.face, tplCased(ch, lk)) == null) continue;
      cands.push(lk);
    }
    var rnd = tplRng(seed, "looks", i);
    for (var s = cands.length - 1; s > 0; s--) { var r = Math.floor(rnd() * (s + 1)); var tmp = cands[s]; cands[s] = cands[r]; cands[r] = tmp; }
    var want = 2 + Math.floor(rnd() * 3);
    var set = [], lower = false;
    for (var c = 0; c < cands.length && set.length < want; c++) {
      if (cands[c].case === "lower") { if (lower) continue; lower = true; }
      set.push(cands[c].id);
    }
    if (prevFirst != null && set.length > 1 && set[0] === prevFirst) { var t0 = set[0]; set[0] = set[1]; set[1] = t0; }
    if (prevFirst != null && set[0] === prevFirst) {
      // Only one look chosen so far: try any other candidate for the opening look.
      for (var d = 0; d < cands.length; d++) if (cands[d].id !== prevFirst && set.indexOf(cands[d].id) < 0) { set[0] = cands[d].id; break; }
    }
    out.push(set);
    prevFirst = set.length ? set[0] : prevFirst;
  }
  return out;
}

// Look ids of every letter at a tick. Each tick a seeded ~40 % of the letters that have
// more than one look switch to another of their looks; at least one letter keeps its look.
function tplLooksAt(tick, seed, assigned) {
  var n = assigned.length;
  var idx = [];
  var eligible = [], styled = 0;
  for (var i = 0; i < n; i++) {
    idx.push(0);
    if (assigned[i].length > 0) styled++;
    if (assigned[i].length > 1) eligible.push(i);
  }
  var T = Math.max(0, Math.floor(tick || 0));
  var ne = eligible.length;
  for (var t = 1; t <= T && ne > 0; t++) {
    var rnd = tplRng(seed, "tick", t);
    var k;
    if (ne >= 2) k = Math.min(ne - 1, Math.max(1, Math.round(0.4 * ne)));
    else k = n > 1 && rnd() < 0.4 ? 1 : 0;
    var order = eligible.slice();
    for (var s = order.length - 1; s > 0; s--) { var r = Math.floor(rnd() * (s + 1)); var tmp = order[s]; order[s] = order[r]; order[r] = tmp; }
    for (var j = 0; j < k; j++) {
      var li = order[j], len = assigned[li].length;
      var step = Math.floor(tplRng(seed, "swap", t, li)() * (len - 1));
      idx[li] = step >= idx[li] ? step + 1 : step;
    }
  }
  var out = [];
  for (var q = 0; q < n; q++) out.push(assigned[q].length ? assigned[q][idx[q]] : null);
  return out;
}

function tplLookAt(letterIndex, tickIndex, seed, assigned) {
  return tplLooksAt(tickIndex, seed, assigned)[letterIndex];
}

// Re-style index at a frame of the graphic: the number of ticks <= frame (ticks are
// relative to the graphic's frame 0); always 0 when re-style is off.
function tplTickIndex(frame, ticks, restyle) {
  if (restyle === false || !Array.isArray(ticks)) return 0;
  var c = 0;
  for (var i = 0; i < ticks.length; i++) if (typeof ticks[i] === "number" && isFinite(ticks[i]) && ticks[i] <= frame) c++;
  return c;
}

// A look with the base red (#d0201a) replaced by the accent colour.
function tplApplyAccent(look, accent) {
  var ok = typeof accent === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(accent);
  var out = {};
  for (var key in look) out[key] = look[key];
  if (!ok) return out;
  if (typeof out.fg === "string" && out.fg.toLowerCase() === TPL_ACCENT_BASE) out.fg = accent;
  if (typeof out.bg === "string" && out.bg.toLowerCase() === TPL_ACCENT_BASE) out.bg = accent;
  return out;
}

// Chip layout in px of a W x H frame. words: two words (strings or grapheme arrays);
// size: cap height in % of H; y: vertical centre in % of H; advance: the looks.json
// advance table (widest face per letter) or a function (ch, word, i, flatIndex) -> em.
// Word 1 starts at 5 % W, word 2 ends at 94 % W; each word grows inward up to 32 % W, then
// the whole word shrinks down to 4.5 % H. A word that still does not fit is shrunk further
// to stay in its band and the result says fits:false. Slots (x, w) use the widest look and
// the maximum padding, so they do not depend on the seed; pad, rot and jitter are seeded.
// Returns { fits, chips: [{ x, y, w, h, rot, jitter, pad, glyph, fontPx, em, ch, kind, word, index }] }.
function tplLayout(words, size, y, advance, W, H, seed) {
  W = W || 1440; H = H || 1080;
  var g0 = (size / 100) * H;
  var cy = (y / 100) * H;
  var band = TPL_BAND * W;
  var chips = [], fits = true, flat = 0;
  for (var wi = 0; wi < 2; wi++) {
    var src = words && words[wi];
    var gs = typeof src === "string" ? tplGraphemes(src) : Array.isArray(src) ? src.slice(0, TPL_MAX_LETTERS) : [];
    if (!gs.length) continue;
    var ems = [];
    var unit = 0; // word width divided by the glyph height
    for (var i = 0; i < gs.length; i++) {
      var ch = gs[i], kind = tplKind(ch);
      var em = kind === "glyph" && typeof advance === "function" ? advance(ch, wi, i, flat + i) : tplLetterEm(ch, null, typeof advance === "function" ? null : advance);
      if (!(em > 0)) em = TPL_DEFAULT_EM;
      ems.push(em);
      unit += em / TPL_CAP_RATIO + 2 * TPL_PAD_MAX + (i > 0 ? TPL_GAP : 0);
    }
    var g = g0;
    if (g * unit > band) {
      g = band / unit;
      if (g < TPL_MIN_GLYPH * H - 1e-9) fits = false;
    }
    var fontPx = g / TPL_CAP_RATIO;
    var x = wi === 0 ? TPL_LEFT * W : TPL_RIGHT * W - g * unit;
    for (var j = 0; j < gs.length; j++) {
      var rnd = tplRng(seed, "chip", flat + j);
      var pad = (TPL_PAD_MIN + rnd() * (TPL_PAD_MAX - TPL_PAD_MIN)) * g;
      var rot = (rnd() * 2 - 1) * TPL_ROT_MAX;
      var jitter = (rnd() * 2 - 1) * TPL_JITTER_MAX * g;
      var w = ems[j] * fontPx + 2 * TPL_PAD_MAX * g;
      var h = g + 2 * pad;
      chips.push({ x: x, y: cy - h / 2, w: w, h: h, rot: rot, jitter: jitter, pad: pad, glyph: g, fontPx: fontPx, em: ems[j], ch: gs[j], kind: tplKind(gs[j]), word: wi, index: flat + j });
      x += w + TPL_GAP * g;
    }
    flat += gs.length;
  }
  return { fits: fits, chips: chips };
}
// tpl-letters:end

// tpl-panel-logic:start
// Build orchestration shared by Build and "Finish letters and look". Plain JS: the tests run this block in node:vm
// after planner.js, build-config.js and the letters helpers. Every host call comes in through `d`:
//   d = { run(summary, script, allowCommit) -> result (throws on failure), check() (throws TPL_STALE when the Project
//         changed), advance(stepId, fraction, detail), scripts: { inventoryJs, searchJs, ensureJs, assembleJs,
//         decorateJs }, readAssets() -> { tornTsx, lettersTsx, looks, fonts }, onSearch?, onAssembled?, onDecorated? }
// Configs come only from tplPlanState / tplAssembleConfig / tplDecorateConfig, so the headless driver
// (dev/driveAdapter.mjs) and the panel build identical Drafts.
const TPL_STALE = new Error('The Project changed during the build.');
// Four videos per scene-search call keeps a call inside run_script's 30 s deadline.
const TPL_SEARCH_BATCH = 4;
// Tempo stand-in for own music whose beat was not found: the cuts use the fixed 0.35 s unit, the section snaps to 0.1 s.
const TPL_OWN_NOMINAL_BPM = 85.6;

function tplDeepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v)) tplDeepFreeze(v[k]);
  }
  return v;
}

// Everything a build uses, copied and frozen at the click: later panel edits never reach a running build.
function tplFreezeBuild(inputs) { return tplDeepFreeze(JSON.parse(JSON.stringify(inputs))); }

// Throws TPL_STALE once the panel's Project is no longer the frozen one. Called after every await.
function tplStaleCheck(projectRef, pid) {
  return function () { if (projectRef.current !== pid) throw TPL_STALE; };
}

// Single flight. The ref is checked and taken synchronously, before any await, so a double click (or a click before
// React re-renders the disabled button) is ignored. Only the run holding the ref releases it: a Project switch clears
// the ref, and a stale run finishing later must not release a newer run's hold.
async function tplExclusive(busyRef, fn) {
  if (busyRef.current) return { skipped: true };
  const token = {};
  busyRef.current = token;
  try { return await fn(token); } finally { if (busyRef.current === token) busyRef.current = null; }
}

// Script config in as JSON.parse of a string, so run_script's type check sees `any` (an inlined literal widens
// `type: "text"` to string, which EditableParameterDefinition[] rejects).
function tplFill(script, cfg) { return script.replace('__CONFIG__', () => 'JSON.parse(' + JSON.stringify(JSON.stringify(cfg)) + ')'); }

// A word as typed: leading space dropped, whitespace runs collapsed, at most 8 graphemes.
function tplClampWord(text) {
  const s = String(text == null ? '' : text).replace(/^\s+/, '').replace(/\s+/g, ' ');
  const parts = typeof Intl !== 'undefined' && Intl && typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), x => x.segment) : Array.from(s);
  return parts.slice(0, TPL_MAX_LETTERS).join('');
}

// Progress only moves forward.
function tplForward(prev, next) { return prev && next.value < prev.value - 1e-9 ? prev : next; }

// Read-only scripts (never committing).
function tplDraftsScript(projectId, name) {
  return 'const f = await selects.project(' + JSON.stringify(projectId) + ').readFootage();\n'
    + 'return { ids: (f.drafts || []).filter(d => d.name === ' + JSON.stringify(name) + ').map(d => d.sequenceId) };';
}
function tplReadbackScript(sequenceId) {
  return 'const d = selects.draft(' + JSON.stringify(sequenceId) + ');\n'
    + 'const fps = (await d.meta()).fps;\n'
    + 'const rows = (await d.clips({ trackScope: "main" })).filter(c => c.resourceId !== null);\n'
    + 'const frames = rows.length ? [rows[0].startFrame, ...rows.map(c => c.endFrame)] : [0];\n'
    + 'return { sequenceId: ' + JSON.stringify(sequenceId) + ', fps, frames, totalFrames: frames[frames.length - 1], placed: rows.length, notes: ["Selects did not confirm the save; the Draft was found by its name"] };';
}
// ensure-audio.js without the import: the music resource already imported from `path`, or { resourceId: null }.
function tplFindAudioScript(projectId, path) {
  return 'const p = selects.project(' + JSON.stringify(projectId) + ');\n'
    + 'const paths = {};\n'
    + 'const walk = nodes => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else if (n.resourceId && n.path) paths[n.resourceId] = n.path; } };\n'
    + 'const files = await p.sourceFiles();\n'
    + 'if ("fileTree" in files) walk(files.fileTree);\n'
    + 'else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ("fileTree" in d) walk(d.fileTree); }\n'
    + 'const existing = (await p.resources()).find(r => r.type === "Audio" && paths[r.resourceId] === ' + JSON.stringify(path) + ');\n'
    + 'return { resourceId: existing ? existing.resourceId : null, imported: false };';
}
function tplOpenScript(sequenceId) {
  return 'const id = ' + JSON.stringify(sequenceId) + ';\n'
    + 'let link = null, openError = null;\n'
    + 'try { link = (await selects.editor.linkToDraftFrame(id, 0)).deepLinkUrl; } catch (e) { link = null; }\n'
    + 'try { await selects.editor.openDraft(id); } catch (e) { openError = String((e && e.message) || e); }\n'
    + 'return { link, openError };';
}

function tplMessage(e) { return String((e && e.message) || e); }

// A committing call is sent once. When it fails (possibly after its commit landed), `recover` looks, read-only, for
// what the commit would have made; found -> use it, else the original error (with the recovery's own error appended
// when it failed too, e.g. "several new Drafts ..."). Never resent.
async function tplCommit(d, summary, script, recover) {
  try { return await d.run(summary, script, true); }
  catch (e) {
    if (e === TPL_STALE) throw e;
    d.check();
    let got = null, why = null;
    try { got = await recover(); } catch (r) { if (r === TPL_STALE) throw r; got = null; why = r; }
    d.check();
    if (got) return got;
    if (why) throw Error(tplMessage(e) + ' (' + tplMessage(why) + ')');
    throw e;
  }
}

// The build from frozen inputs f = { projectId, inventory: { photos, resources }, found: { best, failed } | null
// (this Project's cached scene search), cue (manifest cue, own-music grid or null), musicPath, options, now, clock }.
// Steps: pictures (the frozen snapshot) -> moments (scene search for the picked videos only, when photos don't cover
// N) -> plan (tplPlanState + ensure-audio) -> place (assemble, commit 1) -> decorate (commit 2) + open.
async function tplRunBuild(f, d) {
  const pid = f.projectId, notes = [];
  const base = { projectId: pid, inv: f.inventory, cue: f.cue, options: f.options, now: f.now };
  const cachedBest = f.found && f.found.best ? f.found.best : {};
  const cachedFailed = f.found && Array.isArray(f.found.failed) ? f.found.failed : [];
  d.advance('pictures', 0);
  // Picking never depends on video start times, so a plan with the cached hits already names the pictures.
  const pre = tplPlanState(Object.assign({}, base, { found: { best: cachedBest } }));
  if (!pre.ok) throw Error(pre.reason);
  d.advance('pictures', 1, pre.picks.length + ' pictures');

  const best = Object.assign({}, cachedBest);
  const picked = pre.picks.filter(p => p.kind === 'video').map(p => p.rid);
  const todo = picked.filter(rid => !(rid in best) || cachedFailed.indexOf(rid) >= 0);
  let failed = [];
  for (let i = 0; i < todo.length; i += TPL_SEARCH_BATCH) {
    d.advance('moments', i / todo.length, i + '/' + todo.length + ' clips');
    const batch = todo.slice(i, i + TPL_SEARCH_BATCH);
    const r = await d.run('Find moments', tplFill(d.scripts.searchJs, { projectId: pid, rids: batch, pageSize: 4, parallel: 4 }), false);
    d.check();
    for (const rid of batch) best[rid] = r && r.best && typeof r.best[rid] === 'number' && isFinite(r.best[rid]) ? r.best[rid] : null;
    failed = failed.concat((r && r.failed) || []);
  }
  if (todo.length && d.onSearch) d.onSearch({ best, failed: cachedFailed.filter(rid => todo.indexOf(rid) < 0).concat(failed) });
  d.advance('moments', 1, todo.length ? '' : picked.length ? 'already found' : 'photos only');

  d.advance('plan', 0);
  const state = tplPlanState(Object.assign({}, base, { found: { best } }));
  if (!state.ok) throw Error(state.reason);
  if (state.picks.map(p => p.rid).join('|') !== pre.picks.map(p => p.rid).join('|')) throw Error('The pictures changed while planning. Press Build again.');
  const unchecked = failed.filter(rid => picked.indexOf(rid) >= 0).length;
  let music = null;
  if (state.cue && state.musicStart != null && f.musicPath) {
    d.advance('plan', 0.5, 'adding the music');
    music = await tplCommit(d, 'Add music to the project', tplFill(d.scripts.ensureJs, { projectId: pid, path: f.musicPath }), async () => {
      const r = await d.run('Look for the music', tplFindAudioScript(pid, f.musicPath), false);
      return r && r.resourceId ? r : null;
    });
    d.check();
  }
  d.advance('plan', 1);

  d.advance('place', 0);
  const named = async () => {
    const r = await d.run('Check Drafts', tplDraftsScript(pid, state.draftName), false);
    return r && Array.isArray(r.ids) ? r.ids : [];
  };
  // The Drafts already named like this one, so a lost reply can tell the new Draft apart.
  let before = null;
  try { before = await named(); } catch (e) { if (e === TPL_STALE) throw e; before = null; }
  d.check();
  // The one Draft named like this build that was not there before, read back; null when there is none.
  const findNew = async () => {
    const after = await named();
    d.check();
    const fresh = before ? after.filter(id => before.indexOf(id) < 0) : after;
    if (fresh.length > 1) throw Error('several new Drafts are named "' + state.draftName + '"');
    if (fresh.length !== 1) return null;
    return await d.run('Read the new Draft', tplReadbackScript(fresh[0]), false);
  };
  let assembled = await tplCommit(d, 'Placing pictures', tplFill(d.scripts.assembleJs, tplAssembleConfig(state, music)), findNew);
  d.check();
  if (!assembled || !assembled.sequenceId) {
    // The commit returned but without the new Draft's id: the same read-only recovery as a lost reply; never resent.
    let got = null, why = null;
    try { got = await findNew(); } catch (r) { if (r === TPL_STALE) throw r; why = r; }
    d.check();
    if (!got || !got.sequenceId) throw Error('The Draft "' + state.draftName + '" was saved, but Selects did not report its id' + (why ? ' (' + tplMessage(why) + ')' : '') + '. Open it from the Drafts list, or build again.');
    assembled = got;
  }
  if (assembled.notes && assembled.notes.length) notes.push.apply(notes, assembled.notes);
  if (d.onAssembled) d.onAssembled(state, assembled);
  d.advance('place', 1);
  const done = await tplFinish(state, assembled, d);
  return { state, assembled, notes, unchecked, link: done.link, openError: done.openError };
}

// Commit 2 (decorate.js skips what an earlier attempt added, and is a no-op when complete) and opening the Draft.
// "Finish letters and look" calls this again with the frozen state; never automatically.
async function tplFinish(state, assembled, d) {
  d.advance('decorate', 0);
  try {
    const assets = await d.readAssets();
    d.check();
    const r = await d.run('Add letters and paper', tplFill(d.scripts.decorateJs, tplDecorateConfig(state, assembled, assets)), true);
    d.check();
    if (d.onDecorated) d.onDecorated(r);
  } catch (e) {
    if (e === TPL_STALE) throw e;
    // decorate.js refuses a Draft whose Main clips differ from the plan (edited meanwhile): retrying can't fix that.
    const why = tplMessage(e);
    const advice = /pictures don't match the \d+ planned/.test(why) ? 'Its clips no longer match the plan, so press Build to make a new Draft.' : 'Press Finish letters and look to try again.';
    throw Error('The Draft was created, but its letters and paper could not be added: ' + why + '. ' + advice);
  }
  d.advance('decorate', 0.8, 'opening the Draft');
  let link = null, openError = null;
  try {
    const o = await d.run('Open the new Draft', tplOpenScript(assembled.sequenceId), false);
    link = (o && o.link) || null; openError = (o && o.openError) || null;
  } catch (e) { openError = String((e && e.message) || e); }
  d.check();
  d.advance('decorate', 1);
  return { link, openError };
}
// tpl-panel-logic:end

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
// Apps started from Finder get a bare PATH, so shell steps also look in Homebrew and the newest nvm Node.
const TOOL_PATH = 'export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"; '
  + 'n=$( (ls -d "$HOME"/.nvm/versions/node/*/bin) 2>/dev/null | sort -V | tail -1); [ -n "$n" ] && export PATH="$PATH:$n"; ';
const plural = (n: number, one: string, many: string) => n + " " + (n === 1 ? one : many);
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
const WAVE_HEIGHT = 56;

// Music section slider: waveform on a canvas with a draggable, bar-snapped window over the chosen section.
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
      const gh = Math.min(18, WAVE_HEIGHT * 0.4), gw = Math.min(4, Math.max(1, w / 4));
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
    <div style={{ minWidth: 0 }}>
      <small style={{ display: "block", marginBottom: 4 }}>{"Music section — drag to choose"}</small>
      <div ref={wrapRef} role="slider" tabIndex={disabled ? -1 : 0} aria-label="Music section"
        aria-valuemin={Number((first ?? 0).toFixed(1))} aria-valuemax={Number((last ?? 0).toFixed(1))} aria-valuenow={Number((section ?? 0).toFixed(1))}
        aria-valuetext={section == null ? "This music is too short for this length" : "Starts at " + section.toFixed(1) + " s"} aria-disabled={disabled || undefined}
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

// Live letters preview: a fixed-height strip of the 1440x1080 frame around the letters, drawn with the graphic's own
// layout (tplLayout), looks (tplAssignLooks) and re-style clock (tplLooksAt), on the chosen backdrop. The strip is
// scaled to the panel width and centred; its height never changes, so fonts loading or looks cycling never move the page.
const PREVIEW_H = 64;
// Height of the frame band shown (px of the 1080-high frame), centred on the letters' vertical position.
const PREVIEW_BAND = 220;
// Re-style ticks shown in the preview wrap around here (tplLooksAt replays every tick up to the index).
const PREVIEW_TICKS = 64;
const PREVIEW_FACE_STACK: Record<string, string> = {
  didone: 'Didot, "Bodoni 72", "Bodoni MT", Georgia, serif',
  condensed: '"Arial Narrow", "Helvetica Neue Condensed", Impact, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  slab: 'Rockwell, "Roboto Slab", "Courier New", serif',
  black: '"Arial Black", "Helvetica Neue", Impact, sans-serif',
  typewriter: '"American Typewriter", "Courier New", Courier, monospace',
};
const PREVIEW_FALLBACK_STACK = 'Georgia, "Times New Roman", "Noto Serif", "Apple SD Gothic Neo", serif';
// Backdrop swatches for the tiles and the preview (Photo: the photo itself, dimmed and blurred).
function backdropFill(id: string) {
  if (id === "photo") return "linear-gradient(120deg, #2a2320, #4a3b33 45%, #231d1b)";
  if (id === "red") return "repeating-linear-gradient(90deg, #4a0f12 0 14%, #3a0b0e 20%, #4a0f12 26%)";
  return (TPL_BACKDROP_COLORS as any)[id] || TPL_BACKDROP_COLORS.night;
}

function LettersPreview({ word1, word2, seed, looksFile, backdrop }: {
  word1: string; word2: string; seed: number; looksFile: any; backdrop: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);
  // The preview re-styles its letters about every unit (0.35 s), like the graphic on the music grid. The clock lives
  // here so only the preview re-renders on each tick, not the whole panel.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 350); return () => clearInterval(t); }, []);
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const looks: any[] = (looksFile && looksFile.looks) || [];
  const advance: any = (looksFile && looksFile.advance) || {};
  const faces: any = (looksFile && looksFile.faces) || {};
  const g1: string[] = tplGraphemes(word1), g2: string[] = tplGraphemes(word2);
  const key = g1.join("\u0000") + "\u0001" + g2.join("\u0000");
  const letters = React.useMemo(() => g1.concat(g2), [key]);
  const assigned = React.useMemo(() => tplAssignLooks(letters, seed, looks, advance), [letters, seed, looksFile]);
  const byId = React.useMemo(() => {
    const m: Record<string, any> = {};
    for (const l of looks) if (l && typeof l.id === "string") m[l.id] = tplApplyAccent(l, TPL_ACCENT);
    return m;
  }, [looksFile]);
  const layout = React.useMemo(() => {
    // Slot width = the widest of the letter's own looks, exactly as the graphic lays out.
    const em = (ch: string, wi: number, i: number, flat: number) => {
      const fs = (assigned[flat] || []).map((id: string) => byId[id] && byId[id].face).filter(Boolean);
      return tplLetterEm(ch, fs.length ? fs : null, advance);
    };
    return tplLayout([g1, g2], TPL_LETTER_SIZE, TPL_LETTER_Y, em, TPL_W, TPL_H, seed);
  }, [letters, assigned, byId, seed]);
  const current: (string | null)[] = tplLooksAt(tick % PREVIEW_TICKS, seed, assigned);
  const y0 = (TPL_H * TPL_LETTER_Y) / 100 - PREVIEW_BAND / 2;
  const s = width > 0 ? Math.min(width / TPL_W, PREVIEW_H / PREVIEW_BAND) : 0;
  // The torn photo (inset 88 %, white torn edge) as a placeholder behind the letters.
  const inset = (100 - TPL_INSET) / 2, edge = (TPL_EDGE / 100) * TPL_W;
  return (
    <div>
      <div ref={wrapRef} aria-label={"Letters preview: " + [word1, word2].filter((w) => w.trim()).join(" ")}
        style={{ position: "relative", width: "100%", minWidth: 0, height: PREVIEW_H, overflow: "hidden", borderRadius: "var(--panel-radius, 6px)", background: backdropFill(backdrop) }}>
        {s > 0 ? (
          <div style={{ position: "absolute", left: (width - TPL_W * s) / 2, top: (PREVIEW_H - PREVIEW_BAND * s) / 2, width: TPL_W, height: PREVIEW_BAND, transform: "scale(" + s + ")", transformOrigin: "0 0" }}>
            <div style={{ position: "absolute", left: (inset / 100) * TPL_W - edge, width: (TPL_INSET / 100) * TPL_W + 2 * edge, top: -40, bottom: -40, background: "#f4f1ea", boxShadow: "0 0 24px rgba(0,0,0,0.5)" }} />
            <div style={{ position: "absolute", left: (inset / 100) * TPL_W, width: (TPL_INSET / 100) * TPL_W, top: -40, bottom: -40,
              background: "linear-gradient(115deg, #7d6a5c, #b89a82 40%, #d9c2a8 55%, #6f5e52)", opacity: 0.9 }} />
            {layout.chips.map((c: any) => {
              if (c.kind === "space") return null;
              const look = current[c.index] ? byId[current[c.index] as string] : null;
              const fallback = c.kind === "fallback" || (!look && c.kind !== "heart");
              const bg = fallback ? "#ffffff" : look ? look.bg : "#ffffff";
              const fg = fallback ? "#111111" : look ? look.fg : TPL_ACCENT;
              const lookEm = fallback || c.kind === "heart" || !look ? c.em : tplLetterEm(c.ch, [look.face], advance);
              const lower = !!look && !fallback && look.case === "lower" && /[a-z]/i.test(c.ch);
              const h = lower ? c.h + 0.25 * c.glyph : c.h;
              const w = Math.min(c.w, lookEm * c.fontPx + 2 * c.pad);
              const box: any = { position: "absolute", left: c.x + (c.w - w) / 2, top: c.y - y0 + c.jitter - (h - c.h) / 2, width: w, height: h, background: bg,
                boxShadow: "0 " + (0.04 * c.glyph).toFixed(2) + "px " + (0.12 * c.glyph).toFixed(2) + "px rgba(0,0,0,0.3)", transform: "rotate(" + c.rot.toFixed(2) + "deg)",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" };
              if (c.kind === "heart" && !fallback) {
                return (
                  <div key={c.index} style={box}>
                    <svg width={c.glyph * 1.05} height={c.glyph * 1.05} viewBox="0 0 32 30" style={{ display: "block" }}>
                      <path d="M16 29 C 6 21, 0 15, 0 8.5 C 0 3.6, 3.8 0, 8.4 0 C 11.6 0, 14.3 1.8, 16 4.6 C 17.7 1.8, 20.4 0, 23.6 0 C 28.2 0, 32 3.6, 32 8.5 C 32 15, 26 21, 16 29 Z" fill={fg} />
                    </svg>
                  </div>
                );
              }
              const family = fallback ? PREVIEW_FALLBACK_STACK : '"' + (faces[look.face] || "TPL " + look.face) + '", ' + (PREVIEW_FACE_STACK[look.face] || "serif");
              const outline = !fallback && look.outline;
              return (
                <div key={c.index} style={box}>
                  <span style={{ display: "inline-block", fontFamily: family, fontSize: c.fontPx, lineHeight: 1, whiteSpace: "pre", color: outline ? "transparent" : fg,
                    WebkitTextStroke: outline ? Math.max(1, c.fontPx * 0.035).toFixed(2) + "px " + fg : undefined, transform: "translateY(0.04em)" } as any}>
                    {fallback ? c.ch : tplCased(c.ch, look)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      {!layout.fits ? <small style={{ display: "block", marginTop: 4, color: "var(--panel-muted-fg)" }}>Shorten the words: they don't fit at full size.</small> : null}
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
  // This Project's scene-search results { pid, best: { rid: seconds | null }, failed }; per rid, so a new clip
  // selection keeps them.
  const [found, setFound] = React.useState<any>(null);
  const [word1, setWord1] = React.useState("MY");
  const [word2, setWord2] = React.useState("LOVE");
  const [backdrop, setBackdrop] = React.useState<string>("night");
  // null until the manifest has loaded (then its defaultCue); "own" and "none" are the other tracks.
  const [cueId, setCueId] = React.useState<string | null>(null);
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  // "default" = the cue's most energetic bars (tplSectionStart), until the user moves the section.
  const [section, setSection] = React.useState<number | "default">("default");
  const [length, setLength] = React.useState<"short" | "standard" | "long">("standard");
  const [pace, setPace] = React.useState<"quick" | "relaxed">("quick");
  const [useVideos, setUseVideos] = React.useState(true);
  // Clip sound (videos only): off (muted), ambient (-18 dB under the music) or full (0 dB).
  const [clipSound, setClipSound] = React.useState<"off" | "ambient" | "full">("ambient");
  const [faded, setFaded] = React.useState(true);
  const [tilt, setTilt] = React.useState(false);
  const [only, setOnly] = React.useState<string[] | null>(null);
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  // Single-flight guard (tplExclusive): state updates are async, so a ref blocks a second click in the same tick.
  const busyRef = React.useRef<any>(null);
  const [step, setStep] = React.useState("");
  const [tools, setTools] = React.useState({ ffmpeg: true, node: true });
  const fontCache = React.useRef<Record<string, Promise<string>>>({});
  const registered = React.useRef<Set<string>>(new Set());
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
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
  const fontB64 = (plugin: string, face: string) => {
    if (!fontCache.current[face]) {
      fontCache.current[face] = readText(plugin, "assets/fonts/tpl-" + face + ".woff2.b64")
        .then((t) => t.replace(/\s+/g, ""))
        .catch((e) => { delete fontCache.current[face]; throw e; });
    }
    return fontCache.current[face];
  };
  // { family: data URL } for the Ransom letters graphic, as the headless driver builds it.
  async function fontUrls(plugin: string, looksFile: any) {
    const out: Record<string, string> = {};
    for (const face of Object.keys(looksFile.faces || {})) out[looksFile.faces[face]] = "data:font/woff2;base64," + (await fontB64(plugin, face));
    return out;
  }
  // Registers a TPL face in this panel's document for the letters preview.
  async function registerFace(plugin: string, face: string, family: string) {
    if (registered.current.has(family) || typeof FontFace === "undefined") return;
    const f = new FontFace(family, "url(data:font/woff2;base64," + (await fontB64(plugin, face)) + ")");
    await f.load();
    (document as any).fonts.add(f);
    registered.current.add(family);
  }
  const stopAt = (e: any) => {
    const at = progressRef.current;
    const where = at ? "Stopped at step " + (at.current + 1) + "/" + TPL_BUILD_STEPS.length + ", " + TPL_BUILD_STEPS[at.current].label + ": " : "";
    return where + String(e?.message || e);
  };

  // Inventory bookkeeping: the inventory script, photo sizes measured so far (this Project), a load in flight.
  const inventoryJsRef = React.useRef<string | null>(null);
  const photoSizesRef = React.useRef<{ pid: string | null; sizes: Record<string, { width: number; height: number }> }>({ pid: null, sizes: {} });
  // Whether the last read measured new photos (the next poll can measure more; unreadable photos stop the polling).
  const measuringRef = React.useRef(false);
  const invLoadingRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);
  const [invError, setInvError] = React.useState<string | null>(null);
  const [invLoading, setInvLoading] = React.useState(false);

  // Reads the Project's pictures. Never writes state for a stale Project, and never runs during a build.
  async function loadInventory(pid: string | null = projectRef.current, alive: () => boolean = () => true) {
    const script = inventoryJsRef.current;
    if (!pid || !script || busyRef.current || invLoadingRef.current === pid) return;
    const live = () => mountedRef.current && alive() && projectRef.current === pid;
    if (photoSizesRef.current.pid !== pid) photoSizesRef.current = { pid, sizes: {} };
    const known = photoSizesRef.current.sizes;
    const before = Object.keys(known).length;
    invLoadingRef.current = pid; setInvLoading(true);
    try {
      const inv = await run("Read your pictures", tplFill(script, { projectId: pid, only: null, known }));
      // A build that started meanwhile keeps the pictures it began with; the next refresh picks this up.
      if (!live() || busyRef.current) return;
      inv.photos = inv.photos || [];
      inv.resources = inv.resources || [];
      inv.counts = inv.counts || { unanalysed: 0, missing: 0, unmeasured: 0 };
      for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) known[ph.rid] = { width: ph.width, height: ph.height };
      measuringRef.current = Object.keys(known).length > before;
      setInventory(inv); setInvError(null);
    } catch (e: any) {
      if (live()) setInvError(String(e?.message || e));
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Mount and Project switch: reset per-Project state, resolve folders, read the bundled files, read the pictures.
  React.useEffect(() => {
    // Drop everything tied to the previous Project so a build never mixes Projects; a running build becomes stale.
    setFound(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false); setOnly(null);
    photoSizesRef.current = { pid: projectId, sizes: {} }; measuringRef.current = false;
    busyRef.current = null; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
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
        const [manifest, looks, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, tornTsx, lettersTsx] = await Promise.all([
          read("assets/cues/manifest.json"), read("assets/fonts/looks.json"), read("scripts/inventory.js"), read("scripts/search.js"),
          read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/torn-photo.tsx"), read("assets/ransom-letters.tsx")]);
        if (!alive) return;
        const m = JSON.parse(manifest);
        setAssets({ manifest: m, looks: JSON.parse(looks), scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs }, tornTsx, lettersTsx });
        setCueId((c) => c ?? m.defaultCue ?? (m.cues[0] && m.cues[0].id) ?? "none");
        inventoryJsRef.current = inventoryJs;
        setStep("Checking your pictures");
        await loadInventory(projectId, () => alive);
      } catch (e: any) {
        if (alive) setStatus({ tone: "error", text: "Torn Paper Love could not start: " + (e?.message || e) + ". Reinstall the plugin if this persists." });
      } finally { if (alive) setStep(""); }
    })();
    // Project switch or unmount stops a preview, including one still being prepared.
    return () => { alive = false; stopPreview(); };
  }, [projectId]);

  // Clips still analysing, photos still being measured, or nothing yet: re-read every 10 s until ready. The effect
  // re-arms on each new inventory and stops on unmount, Project switch and while busy.
  const needsPoll = !!inventory && (inventory.counts.unanalysed > 0 || (inventory.counts.unmeasured > 0 && measuringRef.current)
    || (inventory.resources.length === 0 && inventory.photos.length === 0));
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

  // The six TPL faces for the preview; a face that fails to load only makes the preview fall back.
  React.useEffect(() => {
    if (!assets || !roots) return;
    const faces = assets.looks.faces || {};
    Object.keys(faces).forEach((face) => { registerFace(roots.plugin, face, faces[face]).catch(() => null); });
  }, [assets, roots]);

  // ---- The plan the Build button would make (the same tplPlanState the build runs).
  const manifest = assets?.manifest || null;
  const track = ownMusic ? "own" : cueId === "own" ? "own" : cueId || manifest?.defaultCue || "none";
  const manifestCue = manifest && track !== "own" && track !== "none" ? manifest.cues.find((c: any) => c.id === track) || null : null;
  const ownDuration = ownGrid && ownGrid.durationSeconds > 0 ? ownGrid.durationSeconds : null;
  // Own music as a cue for tplPlanState: its detected grid, or (beat not found) the fixed 0.35 s unit with a stand-in
  // tempo so the music still plays from a 0.1 s-snapped start.
  const ownCue = React.useMemo(() => {
    if (!ownMusic || !ownGrid || !ownDuration) return null;
    const accepted = !!ownGrid.accepted && ownGrid.bpm > 0;
    return { id: "own", label: ownMusic.name, file: null, bpm: ownGrid.bpm > 0 ? ownGrid.bpm : TPL_OWN_NOMINAL_BPM, accepted,
      firstBeat: accepted ? ownGrid.firstBeat || 0 : 0, usableEnd: Math.max(0, ownDuration - 0.5), beatEnergy: accepted ? ownGrid.beatEnergy || [] : [],
      onsets: ownGrid.onsets || [], onsetThresholds: ownGrid.onsetThresholds || null, peaks: ownGrid.peaks || [], duration: ownDuration };
  }, [ownMusic, ownGrid, ownDuration]);
  const planCue = track === "own" ? ownCue : manifestCue;
  const ownPending = track === "own" && !ownCue;
  const grid = tplGrid(planCue);
  const unitSec = tplUnitSec(grid);
  const options = React.useMemo(() => ({ words: [word1, word2], backdrop, length, pace, clipSound, look: faded ? FADED_FILM : 0, tilt, useVideos, only, seed, section }),
    [word1, word2, backdrop, length, pace, clipSound, faded, tilt, useVideos, only, seed, section]);
  const foundBest = found && found.pid === projectId ? found.best : null;
  const plan = React.useMemo(() => {
    if (!inventory || ownPending) return null;
    try { return tplPlanState({ projectId, inv: { photos: inventory.photos, resources: inventory.resources }, found: { best: foundBest || {} }, cue: planCue, options, now: 0 }); }
    catch (e: any) { return { ok: false, reason: String(e?.message || e) }; }
  }, [inventory, foundBest, planCue, options, ownPending, projectId]);
  const requested = TPL_LENGTHS[length];
  const onlyRids = React.useMemo(() => (only ? new Set(only) : null), [only]);
  const photosSel: any[] = inventory ? inventory.photos.filter((p: any) => !onlyRids || onlyRids.has(p.rid)) : [];
  const measured = photosSel.filter((p: any) => p.width > 0 && p.height > 0).length;
  const videosSel: any[] = inventory && useVideos ? inventory.resources.filter((r: any) => !onlyRids || onlyRids.has(r.rid)) : [];
  const shortVideos = plan?.ok ? plan.excluded.shortVideos : 0;
  const clipsOk = Math.max(0, videosSel.length - shortVideos);
  const shownN = plan?.ok ? plan.N : Math.max(TPL_MIN_PICTURES, Math.min(requested, measured + clipsOk));
  const videoSeconds = tplTemplate(shownN, pace).total * unitSec;
  const snap = (value: number) => tplSnapSection({ value, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: grid.accepted });
  // The section the build uses (the plan re-clamps a numeric start to the nearest bar that fits).
  const sectionShown: number | null = !planCue ? null : plan?.ok ? plan.musicStart : grid.bpm == null ? null : snap(section === "default" ? (tplSectionStart(grid, "default", videoSeconds) ?? 0) : section);
  const musicPath = !roots ? null : track === "own" ? (ownMusic ? ownMusic.path : null) : manifestCue ? roots.plugin + "/assets/cues/" + manifestCue.file : null;

  // A new track starts at its most energetic bars again; Length and Pace keep a chosen start (re-clamped by the plan).
  React.useEffect(() => { setSection("default"); }, [track, ownGrid]);
  // A new track, section, length or pace makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [track, ownMusic?.path, sectionShown, length, pace]);

  async function detectOwnMusic(file: { path: string; name: string }) {
    if (!roots) return;
    await tplExclusive(busyRef, async () => {
      const pid = projectRef.current;
      setOwnMusic(file); setOwnGrid(null); setBusy(true); setStep("Listening for the beat");
      try {
        // The decoded PCM (up to ~32 MB) is only needed by beat-detect.cjs, so it is removed afterwards, keeping the exit
        // status. The result goes to a file (a long track's onsets come close to the 48 KB shell output cap).
        const pcm = roots.data + "/own-music.f32";
        const cmd = TOOL_PATH + "ffmpeg -nostdin -v error -y -t 360 -i " + sq(file.path) + " -ac 1 -ar 22050 -f f32le " + sq(pcm) + " && node " + sq(roots.plugin + "/beat-detect.cjs") + " " + sq(pcm) + " 22050 " + sq(roots.data + "/own-music.json")
          + "; s=$?; rm -f " + sq(pcm) + "; exit $s";
        const r = await sdk.runShell({ summary: "Find the beat of " + file.name, command: cmd, timeoutMs: 120000, maxOutputBytes: 48000 });
        const done = JSON.parse(String(r.stdout || "").trim().split("\n").pop() || "{}");
        if (r.isError || r.exitCode !== 0 || done.error || !done.ok) throw new Error(done.error || r.stderr || "beat detection failed");
        const g = JSON.parse(await readText(roots.data, "own-music.json"));
        if (projectRef.current !== pid) return;
        setOwnGrid(g);
        setStatus(g.accepted ? null : { tone: "info", text: "Music added; cuts use a steady 0.35 s rhythm because its beat could not be found reliably." });
      } catch (e: any) {
        // Without a grid the cuts use fixed timing, but the track's real length still bounds the section.
        let duration: number | null = null;
        try {
          const pr = await sdk.runShell({ summary: "Read the length of " + file.name, command: TOOL_PATH + "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " + sq(file.path), timeoutMs: 20000 });
          const v = parseFloat(String(pr?.stdout || "").trim());
          if (!pr?.isError && v > 0) duration = Math.min(v, 360);
        } catch { duration = null; }
        if (projectRef.current !== pid) return;
        setOwnGrid({ accepted: false, durationSeconds: duration, peaks: [] });
        setStatus(duration
          ? { tone: "info", text: "Music added; cuts use a steady 0.35 s rhythm (" + (e?.message || e) + ")." }
          : { tone: "error", text: "Could not read this music file (" + (e?.message || e) + "). Choose another file or one of the tracks." });
      } finally { if (projectRef.current === pid) { setBusy(false); setStep(""); } }
    });
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
    if (!musicPath || !roots || sectionShown == null) return;
    stopPreview();
    const token = previewTokenRef.current;
    const live = () => previewTokenRef.current === token && mountedRef.current;
    setPlayState("loading");
    try {
      // The whole section, written to a file (stdout is capped at 48 KB) and read back as base64 text. Earlier previews
      // are removed first and the mp3 once encoded, so the data folder never collects them.
      const dur = videoSeconds, base = roots.data + "/preview-" + token, file = musicPath;
      const cmd = TOOL_PATH + "rm -f " + sq(roots.data) + "/preview-*.mp3 " + sq(roots.data) + "/preview-*.b64; "
        + "ffmpeg -nostdin -v error -y -ss " + sectionShown.toFixed(3) + " -t " + dur.toFixed(2) + " -i " + sq(file)
        + " -ac 1 -ar 22050 -b:a 48k -af \"afade=t=out:st=" + Math.max(0, dur - 0.12).toFixed(2) + ":d=0.12\" -f mp3 " + sq(base + ".mp3")
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
      try { await audio.play(); }
      catch (e: any) { throw new Error(e && e.name === "NotAllowedError" ? "playback was blocked; press play again" : String(e?.message || e)); }
      if (!live() || audioRef.current !== audio) { audio.pause(); return; }
      setPlayState("playing"); setPlayingAudio(audio);
    } catch (e: any) {
      if (!live()) return;
      stopPreview();
      setStatus({ tone: "error", text: "Could not play a preview: " + (e?.message || e) + "." });
    }
  }

  // Host calls for tplRunBuild / tplFinish, bound to the frozen Project.
  function hostFor(pid: string) {
    return {
      run, check: tplStaleCheck(projectRef, pid), scripts: assets.scripts,
      advance: (id: string, fraction: number, detail?: string) => {
        if (projectRef.current !== pid) return;
        const p = tplForward(progressRef.current, tplProgress(id, fraction, detail));
        progressRef.current = p; setProgress(p);
      },
      readAssets: async () => ({ tornTsx: assets.tornTsx, lettersTsx: assets.lettersTsx, looks: assets.looks, fonts: await fontUrls(roots!.plugin, assets.looks) }),
      onSearch: (f: any) => { if (projectRef.current === pid) setFound({ pid, best: f.best, failed: f.failed }); },
      onAssembled: (state: any, a: any) => { if (projectRef.current === pid) setResult({ state, assembled: a, decorated: false, notes: a.notes || [], link: null, unchecked: 0 }); },
      onDecorated: () => { if (projectRef.current === pid) setResult((r: any) => (r ? { ...r, decorated: true } : r)); },
    };
  }

  // Build: every input frozen at the click (spec 15.5); Build is disabled while running.
  // Returns false when a guard stops it (nothing changes then), true once the build has started.
  function build(nextSeed: number) {
    if (busyRef.current || !assets || !inventory || !roots || !projectId || !plan?.ok) return false;
    if (ownPending) { setStatus({ tone: "error", text: "Drop a music file, or choose one of the tracks." }); return false; }
    const inputs = {
      projectId,
      inventory: { photos: inventory.photos, resources: inventory.resources },
      found: found && found.pid === projectId ? { best: found.best, failed: found.failed } : null,
      cue: planCue, musicPath: planCue ? musicPath : null,
      options: { ...options, seed: nextSeed }, now: Date.now(), clock: TPL_EFFECT_CLOCK,
    };
    void tplExclusive(busyRef, async () => {
      const f = tplFreezeBuild(inputs);
      const pid = f.projectId;
      stopPreview();
      setBusy(true); setStatus(null); setResult(null); progressRef.current = null; setProgress(null);
      try {
        const out = await tplRunBuild(f, hostFor(pid));
        if (projectRef.current !== pid) return;
        setResult((r: any) => ({ ...(r || {}), link: out.link, notes: out.notes, unchecked: out.unchecked }));
        if (out.openError) setStatus({ tone: "error", text: "The Draft is ready, but it could not be opened: " + out.openError + ". Use the link below or open it from the Drafts list." });
      } catch (e: any) {
        if (e !== TPL_STALE && projectRef.current === pid) setStatus({ tone: "error", text: stopAt(e) });
      } finally {
        if (projectRef.current === pid) { setBusy(false); setProgress(null); progressRef.current = null; }
      }
    });
    return true;
  }

  // Another version: a new seed (new tears and letter looks, other photos when there are more than N).
  // The previous result stays until build() passes its guards (build clears it when it starts).
  function buildAnother() {
    if (busyRef.current) return;
    const s = seed + 1;
    if (build(s)) setSeed(s);
  }

  // "Finish letters and look": decorate again with the frozen plan of the build (a no-op when already complete).
  function finish() {
    const r0 = result;
    if (busyRef.current || !r0 || !assets || !roots || !projectId || r0.state.projectId !== projectId) return;
    void tplExclusive(busyRef, async () => {
      const pid = projectId;
      stopPreview();
      setBusy(true); setStatus(null); progressRef.current = null; setProgress(null);
      try {
        const out = await tplFinish(r0.state, r0.assembled, hostFor(pid));
        if (projectRef.current !== pid) return;
        setResult((r: any) => (r ? { ...r, link: out.link } : r));
        if (out.openError) setStatus({ tone: "error", text: "The Draft is ready, but it could not be opened: " + out.openError + ". Use the link below or open it from the Drafts list." });
      } catch (e: any) {
        if (e !== TPL_STALE && projectRef.current === pid) setStatus({ tone: "error", text: stopAt(e) });
      } finally {
        if (projectRef.current === pid) { setBusy(false); setProgress(null); progressRef.current = null; }
      }
    });
  }

  // Choose clips: `only` holds rids in inventory order (photos, then clips), or null for every picture.
  const photoList: any[] = inventory?.photos || [];
  const clipList: any[] = inventory?.resources || [];
  const allRids: string[] = [...photoList, ...clipList].map((r: any) => r.rid);
  const onlySet = only ? new Set(only) : null;
  const selected = onlySet ? allRids.filter((rid) => onlySet.has(rid)) : allRids;
  const selectedSet = new Set(selected);
  const choose = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allRids.filter((rid) => keep.has(rid));
    setOnly(ordered.length === allRids.length ? null : ordered);
  };
  const toggle = (rid: string, on: boolean) => choose(on ? [...selected, rid] : selected.filter((x) => x !== rid));

  // Readiness (spec 15.7): eligible photos and clips, shots and seconds for the chosen cue and pace, and what is left out.
  const counts = inventory?.counts || { unanalysed: 0, unmeasured: 0 };
  const unread = photosSel.length - measured;
  const aside = [
    counts.unanalysed ? plural(counts.unanalysed, "clip", "clips") + " still analysing" : "",
    unread ? plural(unread, "photo", "photos") + " couldn't be read" + (measuringRef.current ? " yet" : "") : "",
    shortVideos ? plural(shortVideos, "clip is", "clips are") + " too short" : "",
  ].filter(Boolean).join(" · ");
  const lengthLabel = TPL_LENGTH_LABELS[length];
  const secs = (s: number) => s.toFixed(1) + " s";
  const readiness = !inventory ? (invError ? "Could not read the pictures in this Project: " + invError : "Checking your pictures…")
    : ownPending ? (busy ? "Listening for the beat…" : "Drop a music file above, or choose one of the tracks.")
    : !plan ? "Checking your pictures…"
    : plan.ok ? "Ready: " + plural(measured, "photo", "photos") + (useVideos ? " · " + plural(clipsOk, "clip", "clips") : "") + " · " + 2 * plan.N + " shots · about " + secs(plan.seconds)
    : photoList.length + clipList.length === 0 && !counts.unanalysed ? "No photos or analysed clips in this Project yet. Add photos (or clips and analyse them); this updates automatically."
    : plan.reason;
  const fitNote = plan?.ok && plan.fitReason === "pictures"
    ? "You have " + plural(measured + (useVideos ? clipsOk : 0), "picture", "pictures") + ": " + lengthLabel + " uses " + plan.N + " (" + 2 * plan.N + " shots, " + secs(plan.seconds) + ")."
    : plan?.ok && plan.fitReason === "music"
      ? "From this start the music fits " + plan.N + " pictures (" + 2 * plan.N + " shots, " + secs(plan.seconds) + "). Move the section earlier for the full " + lengthLabel + "."
      : "";
  const eligible = measured + (useVideos ? clipsOk : 0);
  const peaks: number[] = planCue ? planCue.peaks || [] : [];
  const total = planCue ? (track === "own" ? ownDuration || 1 : manifestCue?.duration || 1) : 1;
  const silent = track === "none" && clipSound === "off";
  const canOwnMusic = tools.ffmpeg && tools.node;
  const canBuild = !!assets && !!roots && !!plan?.ok && !ownPending && !busy;
  const cueOptions = [
    ...(manifest?.cues || []).map((c: any) => ({ label: c.label, value: c.id })),
    ...(canOwnMusic ? [{ label: "Your own music", value: "own" }] : []),
    { label: "No music", value: "none" },
  ];
  const clampWord = (v: string) => tplClampWord(v);

  if (!projectId) return <ui.Message tone="error">Open a Project to build a Torn Paper Love edit.</ui.Message>;

  return (
    <ui.Stack gap={16}>
      <ui.Section title="Words">
        <ui.TextField label="Word 1" value={word1} onChange={(v: string) => setWord1(clampWord(v))} />
        <ui.TextField label="Word 2" value={word2} onChange={(v: string) => setWord2(clampWord(v))} />
        <small style={{ display: "block", color: "var(--panel-muted-fg)" }}>{"Up to " + WORD_MAX + " letters each; the words sit left and right."}</small>
        <LettersPreview word1={word1} word2={word2} seed={seed} looksFile={assets?.looks || null} backdrop={backdrop} />
      </ui.Section>
      <ui.Section title="Style">
        <div role="group" aria-label="Backdrop" style={{ display: "flex", flexWrap: "wrap", gap: 8, minWidth: 0 }}>
          {Object.keys(TPL_BACKDROPS).map((id) => {
            const on = id === backdrop;
            return (
              <button key={id} type="button" aria-pressed={on} disabled={busy} onClick={() => setBackdrop(id)}
                style={{ flex: "1 1 72px", minWidth: 0, padding: 4, borderRadius: 8, cursor: busy ? "default" : "pointer", color: "inherit", background: "transparent",
                  border: on ? "2px solid var(--panel-accent, #f6c343)" : "1px solid var(--panel-border, rgba(128, 128, 128, 0.45))", textAlign: "center" }}>
                <span aria-hidden="true" style={{ display: "block", height: 28, borderRadius: 4, background: backdropFill(id), boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }} />
                <span style={{ display: "block", marginTop: 4, fontSize: 12, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(TPL_BACKDROPS as any)[id]}</span>
              </button>
            );
          })}
        </div>
      </ui.Section>
      <ui.Section title="Music">
        <ui.Select label="Track" value={track} disabled={busy}
          onChange={(v: string) => { setCueId(v); if (v !== "own") { setOwnMusic(null); setOwnGrid(null); } }} options={cueOptions} />
        {track === "own" && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {!canOwnMusic ? <ui.Message tone="muted">Install ffmpeg and Node.js 18+ to preview music or use your own track.</ui.Message> : null}
        {planCue ? (
          // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
          <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
            <SectionSlider peaks={peaks} total={total} section={sectionShown} videoSeconds={videoSeconds} barSeconds={grid.accepted ? (tplBarBeats(grid.bpm) * 60) / grid.bpm : 1}
              snap={snap} onChange={(v) => { if (v != null) setSection(v); }} disabled={busy} audio={playingAudio} />
            <ui.Row gap={8} align="center">
              {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
              <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                label={playState === "playing" ? "Stop preview" : playState === "loading" ? "Cancel preview" : "Preview this section"}
                onClick={preview} disabled={busy || !tools.ffmpeg || (playState === "idle" && sectionShown == null)} />
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{sectionShown == null ? "This music is too short for this length" : "Starts at " + sectionShown.toFixed(1) + " s"}</span>
            </ui.Row>
          </div>
        ) : track === "none" ? <ui.Message tone="muted">No music: the cuts keep a steady 0.35 s rhythm.</ui.Message> : null}
      </ui.Section>
      <ui.Section title="Length">
        <ui.Segmented label="Length" value={length} onChange={setLength}
          options={[{ label: "Short 5", value: "short" }, { label: "Standard 7", value: "standard" }, { label: "Long 10", value: "long" }]} />
        <ui.Segmented label="Pace" value={pace} onChange={setPace} options={[{ label: "Quick", value: "quick" }, { label: "Relaxed", value: "relaxed" }]} />
        <ui.Row gap={8} align="center">
          <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
          <ui.Button variant="ghost" busy={invLoading} busyLabel="Refreshing" disabled={busy || !assets} onClick={() => loadInventory()}>Refresh</ui.Button>
        </ui.Row>
        {fitNote ? <ui.Message tone="muted">{fitNote}</ui.Message> : null}
        {aside ? <ui.Message tone="muted">{aside + ". This updates automatically."}</ui.Message> : null}
        {inventory && invError ? <ui.Message tone="error">{"Could not refresh the pictures: " + invError}</ui.Message> : null}
      </ui.Section>
      <ui.Section title="Advanced">
        <ui.Toggle label="Use videos" value={useVideos} onChange={setUseVideos} />
        <ui.Segmented label="Clip sound" value={clipSound} onChange={setClipSound}
          options={[{ label: "Off", value: "off" }, { label: "Ambient", value: "ambient" }, { label: "Full", value: "full" }]} />
        <ui.Toggle label="Faded film" value={faded} onChange={setFaded} />
        <ui.Toggle label="Tilt" value={tilt} onChange={setTilt} />
        {silent ? <ui.Message tone="muted">Silent video: no music and Clip sound is Off.</ui.Message> : null}
        {inventory && allRids.length ? (
          <div role="group" aria-label="Choose clips" style={{ minWidth: 0 }}>
            <ui.Row gap={4} align="center">
              <small style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {"Choose clips (" + selected.length + "/" + allRids.length + ")"}
              </small>
              <ui.Button variant="ghost" disabled={busy || !only} onClick={() => choose(allRids)}>All</ui.Button>
              <ui.Button variant="ghost" disabled={busy || selected.length === 0} onClick={() => choose([])}>None</ui.Button>
            </ui.Row>
            {/* One row per picture: the name truncates, the kind and shape stay visible; long lists scroll inside. */}
            <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 4, borderRadius: "var(--panel-radius, 6px)", border: "1px solid var(--panel-border, rgba(128, 128, 128, 0.35))" }}>
              {[...photoList, ...clipList].map((r: any) => {
                const isPhoto = r.kind === "photo";
                const off = busy || (!isPhoto && !useVideos);
                const on = selectedSet.has(r.rid) && (isPhoto || useVideos);
                const hint = shapeHint(r.width, r.height);
                const meta = (isPhoto ? (r.width > 0 ? "Photo" : "Photo · not read") : fmtTime(r.duration)) + (hint ? " · " + hint : "");
                return (
                  <label key={r.rid} title={r.name + " · " + meta + (!isPhoto && !useVideos ? " · Use videos is off" : "")}
                    style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, padding: "4px 6px", cursor: off ? "default" : "pointer", opacity: off ? 0.6 : 1 }}>
                    <input type="checkbox" checked={on} disabled={off} onChange={(e) => toggle(r.rid, e.currentTarget.checked)} style={{ flexShrink: 0, margin: 0 }} />
                    <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    <span style={{ flexShrink: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{meta}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </ui.Section>
      {progress ? <ui.Progress value={progress.value} label={progress.label} steps={TPL_BUILD_STEPS.map((s) => s.label)} current={progress.current} />
        : busy ? <ui.Progress label={step || "Working"} /> : null}
      {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.text}</ui.Message> : null}
      {result && result.decorated ? (
        <ui.Message tone="success">
          {"Draft created. Select the letters to change the words, size or colour; select a picture to adjust its tear, backdrop, Faded film or sound. Building again creates a new Draft and does not keep Inspector edits."}
        </ui.Message>
      ) : result && busy ? <ui.Message tone="muted">Draft created; adding letters and paper…</ui.Message> : null}
      {result?.link ? (
        <ui.Row gap={8} align="center">
          <a href={result.link} target="_blank" rel="noreferrer">Open the new Draft</a>
          <ui.IconButton icon="copy" label="Copy the link to the new Draft" onClick={() => { navigator.clipboard?.writeText(result.link).catch(() => null); }} />
        </ui.Row>
      ) : null}
      {result?.notes?.length ? <ui.Message tone="muted">{"Note: " + result.notes.join("; ") + "."}</ui.Message> : null}
      {result?.unchecked ? <ui.Message tone="muted">{"Could not search " + plural(result.unchecked, "clip", "clips") + " for moments; a steady part was used. Build again to retry."}</ui.Message> : null}
      {result && !busy ? (
        <ui.Message tone="muted">{"Create another version: New tears and letters; different photos when you have more than " + (result.state?.N || shownN) + "."}</ui.Message>
      ) : null}
      <small style={{ display: "block", color: "var(--panel-muted-fg)" }}>{"Creates a new 4:3 Draft" + (plan?.ok && eligible > plan.N ? " from " + plan.N + " of your " + eligible + " pictures" : "") + "."}</small>
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={finish} disabled={busy}>Finish letters and look</ui.Button> : null}
        {result ? <ui.Button onClick={buildAnother} disabled={!canBuild}>Create another version</ui.Button> : null}
        <ui.Button variant="primary" busy={busy} busyLabel={step || "Building"} onClick={() => build(seed)} disabled={!canBuild}>Build</ui.Button>
      </ui.Actions>
    </ui.Stack>
  );
}
