// City Weekend Vlog planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
const CWV_TITLE_BEATS = [1.75, 1.5, 1.0, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.5, 1.25];
const CWV_TITLE_ROLES = ['street', 'architecture', 'street', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'wide'];
// Font state of the switching line from each title slot on; null before the place line exists.
const CWV_FONT_STATES = [null, null, 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'A', 'A'];
const CWV_MONTAGE_ROLES = ['architecture', 'park', 'street', 'detail'];
const CWV_MONTAGE_BEATS = 2;
const CWV_TITLE_TOTAL_BEATS = 9;
const CWV_LENGTHS = { short: 4, standard: 7, long: 12 };
const CWV_MIN_MONTAGE = 4;
const CWV_MAX_MONTAGE = 12;
const CWV_MIN_WINDOWS = CWV_TITLE_BEATS.length + CWV_MIN_MONTAGE;
const CWV_LINE1_OFFSET_BEATS = 0.25;
const CWV_REFERENCE_BPM = 99.2;
// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates. They score below any real hit and are only used by the last tier, after photos.
const CWV_FILLER_STEP = 0.5;
const CWV_FILLER_EDGE = 0.25;
const CWV_FILLER_SCORE = -2;
// Photos (Image resources) have no scene search. Each one fills at most one slot of any length up to the 5 s an
// image source lasts. They rank after every real video hit and before fillers, except in the title burst, where
// they rank right after the preferred roles. At most CWV_PHOTO_RUN_MAX photos play in a row while anything else fits.
const CWV_PHOTO_HOLD_MAX = 5;
const CWV_PHOTO_RUN_MAX = 2;

function cwvVideoBeats(montageShots) { return CWV_TITLE_TOTAL_BEATS + CWV_MONTAGE_BEATS * montageShots; }
function cwvVideoSeconds(bpm, montageShots) { return cwvVideoBeats(montageShots) * 60 / bpm; }

function cwvSchedule(opts) {
  const bpm = opts.bpm, fps = opts.fps, n = opts.montageShots;
  if (!(bpm > 0) || !(fps > 0) || !(n >= 0)) throw Error('cwvSchedule needs bpm, fps and montageShots');
  // Every boundary is an absolute beat position snapped once to a frame; durations never accumulate rounding.
  const frameAt = beats => Math.round(beats * 60 / bpm * fps);
  const beats = CWV_TITLE_BEATS.concat(Array(n).fill(CWV_MONTAGE_BEATS));
  const slots = [];
  let at = 0;
  beats.forEach((b, i) => {
    const inTitle = i < CWV_TITLE_BEATS.length;
    slots.push({
      index: i,
      role: inTitle ? CWV_TITLE_ROLES[i] : CWV_MONTAGE_ROLES[(i - CWV_TITLE_BEATS.length) % CWV_MONTAGE_ROLES.length],
      section: inTitle ? (i < 3 ? 'opening' : i < 12 ? 'burst' : 'hold') : 'montage',
      startFrame: frameAt(at),
      endFrame: frameAt(at + b),
    });
    at += b;
  });
  const fontSwitches = [];
  CWV_FONT_STATES.forEach((state, i) => {
    const last = fontSwitches.length ? fontSwitches[fontSwitches.length - 1].state : null;
    if (state && state !== last) fontSwitches.push({ frame: slots[i].startFrame, state });
  });
  return {
    slots,
    totalFrames: slots[slots.length - 1].endFrame,
    title: {
      line1Frame: frameAt(CWV_LINE1_OFFSET_BEATS),
      connectorFrame: slots[1].startFrame,
      placeFrame: slots[2].startFrame,
      fontSwitches,
      endFrame: slots[CWV_TITLE_BEATS.length - 1].endFrame,
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
  let missing = 0, fillerShots = 0, photoShots = 0, photoRun = 0, photoRunRelaxed = false;
  // Best fitting video candidate for a slot. rankOf returns the candidate's rank in this tier, or -1 to skip it.
  function searchVideo(slot, rankOf) {
    let best = null;
    for (const c of pool) {
      const rank = rankOf(c);
      if (rank < 0 || c.sourceDuration < slot.seconds) continue;
      const start = Math.max(0, Math.min(c.sourceDuration - slot.seconds, c.t - slot.seconds / 2));
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
    const preferred = () => searchVideo(slot, c => roles.indexOf(c.role));
    const anyReal = () => searchVideo(slot, c => (c.role === 'filler' ? -1 : 0));
    const photo = () => searchPhoto(slot);
    const filler = () => searchVideo(slot, c => (c.role === 'filler' ? 0 : -1));
    // Tiers, best first: preferred-role hits, any-role hits, photos, fillers. The title burst lifts photos above the
    // any-role tier. After CWV_PHOTO_RUN_MAX photos in a row, a photo is only the last resort.
    const tiers = slot.section === 'burst' ? [preferred, photo, anyReal, filler] : [preferred, anyReal, photo, filler];
    const runFull = photoRun >= CWV_PHOTO_RUN_MAX;
    let best = null;
    for (const tier of tiers) {
      if (runFull && tier === photo) continue;
      if ((best = tier())) break;
    }
    if (!best && runFull && (best = photo())) photoRunRelaxed = true;
    if (!best) { missing++; picks.push(null); photoRun = 0; continue; }
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
  return { picks, filled: picks.filter(Boolean).length, missing, fillerShots, photoShots, photoRunRelaxed };
}

// Tries the requested montage length first, then shrinks toward CWV_MIN_MONTAGE. Every attempt allocates from scratch.
// Filler candidates are added to every attempt.
// Photo candidates ({ rid, kind: 'photo' }) join every attempt, so a Project with only photos builds too.
function cwvPlanBuild(opts) {
  const top = Math.min(CWV_MAX_MONTAGE, Math.max(CWV_MIN_MONTAGE, opts.montageShots));
  const candidates = opts.candidates.concat(cwvFillers(opts.candidates));
  let best = { filled: 0, photoShots: 0 };
  for (let n = top; n >= CWV_MIN_MONTAGE; n--) {
    const schedule = cwvSchedule({ bpm: opts.bpm, fps: opts.fps, montageShots: n });
    const slots = schedule.slots.map(s => ({ index: s.index, role: s.role, section: s.section, seconds: (s.endFrame - s.startFrame) / opts.fps }));
    const alloc = cwvAllocate({ candidates, slots, seed: opts.seed });
    if (alloc.missing === 0) {
      const plan = { ok: true, schedule, picks: alloc.picks, montageShots: n, usableShots: alloc.picks.length, needed: CWV_MIN_WINDOWS, fillerShots: alloc.fillerShots, photoShots: alloc.photoShots };
      if (alloc.photoRunRelaxed) plan.photoRunRelaxed = true;
      return plan;
    }
    // The shortest attempt fills fewer than CWV_MIN_WINDOWS slots, so usableShots < needed.
    if (n === CWV_MIN_MONTAGE) best = alloc;
  }
  return { ok: false, usableShots: best.filled, needed: CWV_MIN_WINDOWS, photoShots: best.photoShots };
}

// Photo motions for montage photos, in pick order. Title photos (slots before the montage) stay still (null).
// Deterministic per seed; never the same motion twice in a row, never the same family (drift, tilt, ...) twice in a row;
// drift, tilt and push-drift directions alternate. Drift follows the photo: vertical for portrait, horizontal otherwise.
// Each entry is { motion, direction: 1 | -1, axis: 'x' | 'y' } for assets/photo-motion.tsx.
// `sizes` maps rid -> { width, height }; an unknown size counts as landscape.
const CWV_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const CWV_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
function cwvPhotoMotions(picks, seed, sizes) {
  const out = [];
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  for (const pick of picks) {
    if (!pick || pick.kind !== 'photo' || !(pick.slot >= CWV_TITLE_BEATS.length)) { out.push(null); continue; }
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
