// Torn Paper Love build config. A plain script like planner.js (which it needs loaded first): panel.tsx embeds it
// verbatim (between `// tpl-config:start|end`), the headless driver (dev/driveAdapter.mjs) and the tests load it in
// node:vm, so the panel and the driver build identical configs. Pure and deterministic; no module syntax.
//
//   tplPlanState({ projectId, inv, found, cue, options, now }) -> state      everything the build needs (or ok: false)
//   tplAssembleConfig(state, music) -> scripts/assemble.js cfg
//   tplDecorateConfig(state, assembled, assets) -> scripts/decorate.js cfg
//   tplExpected(state, assembled, music?) -> readback expectations (kit tools/drive/readback.mjs)
//
// Every value in a state or config survives JSON (no Infinity, no undefined in arrays): both are serialised.

// tpl-config:start
const TPL_AMBIENT_DB = -18;
// Timeline rate used to plan before the Draft exists (display, video windows); decorate re-times at the real rate.
const TPL_PLAN_FPS = 30;
const TPL_BACKDROPS = { night: 'Night', red: 'Red curtain', kraft: 'Kraft', photo: 'Photo' };
const TPL_BACKDROP_COLORS = { night: '#151113', red: '#4a0f12', kraft: '#6b5a45', photo: '#151113' };
const TPL_LENGTH_LABELS = { short: 'Short', standard: 'Standard', long: 'Long' };
const TPL_TORN_NAME = 'Torn photo';
const TPL_LETTERS_NAME = 'Ransom letters';
const TPL_INSET = 92; // Photo size in % (the effect also reads 0.92); stored in the editable's units
const TPL_EDGE = 1.4;
const TPL_TILT_MAX = 1.5;
const TPL_MOTION_STRENGTH = 0.5;
const TPL_LETTER_SIZE = 6.0;
const TPL_LETTER_Y = 50;
const TPL_ACCENT = '#d0201a';
// Faded film strength by default (the muted flash-photo tone of the reference).
const TPL_LOOK = 0.6;
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
  const look = typeof o.look === 'number' && isFinite(o.look) ? Math.max(0, Math.min(1, o.look)) : o.look === false ? 0 : TPL_LOOK;
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
