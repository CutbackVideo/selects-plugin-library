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

// Transitions per slot (entry / exit), over 2N slots. Every other cut is a hard cut ('none'); the reference has no
// paper-strip tear, so pass 2 cuts straight through.
function tplTransitions(N) {
  const out = [];
  for (let i = 0; i < 2 * N; i++) out.push({ index: i, entry: 'none', exit: 'none' });
  const set = (i, key, v) => { if (i >= 0 && i < out.length) out[i][key] = v; };
  set(0, 'entry', 'slide');
  set(1, 'entry', 'paper-flash');
  set(1, 'exit', 'glow-out');
  if (N - 1 > 1) set(N - 1, 'entry', 'glow-in');
  set(2 * N - 1, 'entry', 'paper-flash-short');
  return out;
}

// Transition phases in 30 fps frames. 'paper-flash' follows the reference frame for frame (white card, overexposed,
// normal, two full-white frames). 'paper-flash-short' (the last shot) only flares the torn paper edge over an
// overexposed photo: it never whites out the card or the frame.
const TPL_PHASES = {
  'paper-flash': [['white', 1], ['over', 2], ['normal', 1], ['full', 2]],
  'paper-flash-short': [['flare', 3]],
  'glow-in': [['glow', 2]],
  'glow-out': [['glow', 2]],
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
