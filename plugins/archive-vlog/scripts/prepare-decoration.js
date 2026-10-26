// @template-decoration-config 1
// Generated from the original pure Archive decoration policy.
const AV_MONTAGE_ROLES = ['crowd', 'architecture', 'ride', 'water', 'food', 'transit', 'skyline'];
const AV_OPENING_REF_SECONDS = 5.60;
function avOpeningTiming(openingSeconds) {
  const cutSeconds = Math.max(0, Number(openingSeconds) || 0);
  const k = Math.min(1, cutSeconds / AV_OPENING_REF_SECONDS);
  return { k, revealStart: 0.22 * k, revealEnd: 2.35 * k, textIn: 2.40 * k, decodeStart: 2.90 * k, letterSeconds: 0.115 * k, cutSeconds };
}

function avMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

const AV_SNAP_WINDOW_BEATS = 0.10;          // search window: +/- this share of a beat ...
const AV_SNAP_WINDOW_MAX = 0.070;           // ... capped at this many seconds
const AV_SNAP_MIN_STRENGTH = 2;             // an onset's strength (over its band median) must reach max(this, band threshold)
const AV_SNAP_MIN_RATIO = 1.5;              // a snap target's strength over that threshold
const AV_SNAP_DISTANCE_COST = 0.5;          // score = ratio - this * |offset| / window: an onset at the window edge loses 0.5
const AV_SNAP_LOW_MARGIN = 0.25;            // a low-band target's ratio over the grid position's own onset ratio
const AV_SNAP_MIN_FRAMES = 4;               // no snap may leave a shot shorter than this (or than its grid length, if shorter)
const AV_SNAP_MIN_SHARE = 0.75;             // ... or shorter than this share of its grid length
const AV_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

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

function avHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

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

function avVideoMotions(picks, seed, photoMoves) {
  const family = m => (m === 'push-in' ? 'push-in' : /^drift-/.test(m) ? 'drift' : m);
  const out = {};
  let prev = null, k = 0, drift = 1;
  picks.forEach((pick, i) => {
    if (!pick || pick.kind === 'photo') { const pm = photoMoves && photoMoves[i]; prev = pm ? family(pm.motion) : null; return; }
    if (i === 0) { prev = null; return; }
    const order = ['push-in', 'drift'].map(f => ({ f, v: avHash(seed + ':shot:' + k + ':' + f) })).sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1)).map(x => x.f);
    const f = order.find(x => x !== prev) || order[0];
    if (f === 'drift') { out[String(i)] = { motion: drift > 0 ? 'drift-right' : 'drift-left', direction: drift, axis: 'x' }; drift = -drift; }
    else out[String(i)] = { motion: 'push-in', direction: 1, axis: 'x' };
    prev = f; k++;
  });
  return out;
}

const AV_W = 1920, AV_H = 1080;
const DEFAULT_PRESET = "cinematic";
const LOOK_STRENGTH = 0.3;
const MOTION_STRENGTH = 0.5;
const VIDEO_MOTION_STRENGTH = 0.8;
const FADE_SECONDS = 1.0;
const TITLE_LOOK = { font: "anton", size: 100, speed: 100, shadow: 0.3, scrim: 0.4 };
const CREDIT_LOOK = { size: 100, shadow: 0.3 };
const TITLE_FONT_OPTIONS = [{ label: "Anton", value: "anton" }, { label: "Oswald", value: "oswald" }];
const MOTION_OPTIONS = [
  { label: "Push in", value: "push-in" }, { label: "Pull out", value: "pull-out" },
  { label: "Drift left", value: "drift-left" }, { label: "Drift right", value: "drift-right" },
  { label: "Drift up", value: "drift-up" }, { label: "Drift down", value: "drift-down" },
  { label: "Tilt", value: "tilt" }, { label: "Push and drift", value: "push-drift" },
];
const AV_ADJUST_LABELS = {
  motion: "Motion", motionStrength: "Motion strength", reveal: "Reveal", letterbox: "Letterbox reveal", look: "Look strength",
  warmth: "Warmth", fade: "Fade out", kicker: "Top line", title: "Title", tagline: "Bottom line", titleColor: "Title colour",
  textColor: "Text colour", size: "Size", font: "Font", speed: "Decode speed", shadow: "Shadow", scrim: "Backdrop", prefix: "Credit prefix", name: "Name",
};
const CREDIT_FAMILY = "AV Oswald Bold";
function avLookStrength(p) { return p && p.look && typeof p.look.strength === 'number' ? p.look.strength : LOOK_STRENGTH; }
function avPreset(presets, id) {
  const list = (presets && presets.presets) || [];
  return list.find(p => p.id === id) || list.find(p => p.id === DEFAULT_PRESET) || list[0] || null;
}
function avPresetFonts(presets, preset, b64) {
  const seen = {};
  return ((preset && preset.fonts) || []).filter(f => !seen[f.family] && (seen[f.family] = true)).map(f => {
    const face = { role: f.role, family: f.family, style: f.style, weight: f.weight, metrics: (presets.metrics || {})[f.family] || null };
    return b64 ? Object.assign(face, { b64: b64[f.file] || "" }) : face;
  });
}
function avOpeningSeconds(plan, fps, sectionStart) {
  const s = avSchedule({ bpm: plan.gridded ? plan.tempo : null, fps, beatsList: plan.schedule.beatsList, shotSeconds: plan.beatSeconds,
    sectionStart: typeof sectionStart === 'number' ? sectionStart : undefined, cuts: plan.schedule.cuts });
  return (s.slots[0].endFrame - s.slots[0].startFrame) / fps;
}
function avVisibleFraction(size) {
  if (!size || !(size.width > 0) || !(size.height > 0)) return 1;
  return Math.round(Math.min(1, (size.width / size.height) / (AV_W / AV_H)) * 1e4) / 1e4;
}
function avDecorateConfig(o) {
  const f = o.frozen, plan = o.plan, p = avPreset(o.presets, f.preset);
  if (!p) throw Error('presets.json has no preset ' + f.preset);
  const L = Object.assign({}, AV_ADJUST_LABELS, f.labels || {});
  const fonts = avPresetFonts(o.presets, p, o.fonts);
  const timing = avOpeningTiming(avOpeningSeconds(plan, o.fps, f.sectionStart));
  const text = k => String((f.fields && f.fields[k]) || '');
  const fields = { kicker: text('kicker'), title: text('title'), tagline: text('tagline') };
  const title = {
    tsx: o.tsx.title,
    parameters: Object.assign({ preset: p.id }, fields, { fields: Object.assign({}, fields), titleColor: p.colors.title, textColor: p.colors.text,
      taglineTracking: p.taglineTracking, font: TITLE_LOOK.font, size: TITLE_LOOK.size, speed: TITLE_LOOK.speed, shadow: TITLE_LOOK.shadow, scrim: TITLE_LOOK.scrim, timing, fonts, provenance: Object.assign({}, o.provenance || {}, { picks: plan.picks }) }),
    editableParameters: [
      { key: 'kicker', label: L.kicker, type: 'text', defaultValue: fields.kicker },
      { key: 'title', label: L.title, type: 'text', defaultValue: fields.title },
      { key: 'tagline', label: L.tagline, type: 'text', defaultValue: fields.tagline },
      { key: 'titleColor', label: L.titleColor, type: 'color', defaultValue: p.colors.title },
      { key: 'textColor', label: L.textColor, type: 'color', defaultValue: p.colors.text },
      { key: 'size', label: L.size, type: 'number', defaultValue: TITLE_LOOK.size, min: 60, max: 160, step: 5 },
      { key: 'font', label: L.font, type: 'select', defaultValue: TITLE_LOOK.font, options: TITLE_FONT_OPTIONS },
      { key: 'speed', label: L.speed, type: 'number', defaultValue: TITLE_LOOK.speed, min: 25, max: 400, step: 5 },
      { key: 'shadow', label: L.shadow, type: 'number', defaultValue: TITLE_LOOK.shadow, min: 0, max: 1, step: 0.05 },
      { key: 'scrim', label: L.scrim, type: 'number', defaultValue: TITLE_LOOK.scrim, min: 0, max: 1, step: 0.05 },
    ],
  };
  const name = String((f.credit && f.credit.name) || '');
  // The prefix typed in the panel, else the preset's ("ARCHIVED BY", "LOCATION |").
  const prefix = f.credit && typeof f.credit.prefix === 'string' ? f.credit.prefix : (p.credit && p.credit.prefix) || '';
  const credit = f.credit && f.credit.on ? {
    tsx: o.tsx.credit,
    parameters: { prefix, name, color: p.colors.text, size: CREDIT_LOOK.size, shadow: CREDIT_LOOK.shadow, fonts: fonts.filter(x => x.family === CREDIT_FAMILY) },
    editableParameters: [
      { key: 'prefix', label: L.prefix, type: 'text', defaultValue: prefix },
      { key: 'name', label: L.name, type: 'text', defaultValue: name },
    ],
  } : null;
  const letterbox = { tsx: o.tsx.letterbox, parameters: { revealStart: timing.revealStart, revealEnd: timing.revealEnd,
    revealSeconds: timing.revealEnd - timing.revealStart, enabled: true, visible: avVisibleFraction(o.openingSize) } };
  // The look's strength is the one frozen at Build (the panel's slider, else the preset's); its warmth the preset's.
  const look = f.look && f.look.on ? { tsx: o.tsx.look, strength: typeof f.look.strength === 'number' ? f.look.strength : avLookStrength(p),
    warmth: (p.look && typeof p.look.warmth === 'number') ? p.look.warmth : 1 } : null;
  const fade = { tsx: o.tsx.fade, fadeSeconds: FADE_SECONDS };
  // Photos in this Draft and a planned motion for each of them; a gentle move for every video clip but the opening.
  const sizes = o.sizes || {};
  const moves = avPhotoMotions(plan.picks, String(f.seed), sizes);
  const byRid = {}, photos = [];
  plan.picks.forEach((k, i) => {
    if (!k || k.kind !== 'photo') return;
    if (photos.indexOf(k.rid) < 0) photos.push(k.rid);
    if (!moves[i]) return;
    const sz = sizes[k.rid];
    // The clip's cover-crop scale, so the motion's drift stays inside the photo.
    const cover = sz ? Math.max(AV_W / sz.width, AV_H / sz.height) / Math.min(AV_W / sz.width, AV_H / sz.height) : 1;
    byRid[k.rid] = Object.assign({}, moves[i], { cover });
  });
  const byIndex = avVideoMotions(plan.picks, String(f.seed), moves);
  return { sequenceId: o.sequenceId, videoEnd: o.videoEnd, mute: f.clipSound === 'off', photos, photoEffects: true, title, credit, letterbox, look, fade,
    motion: { tsx: o.tsx.motion, strength: MOTION_STRENGTH, options: f.motionOptions || MOTION_OPTIONS, byRid, video: { strength: VIDEO_MOTION_STRENGTH, byIndex } },
    adjustLabels: L };
}
const input=__CONFIG__;
return avDecorateConfig(input);
