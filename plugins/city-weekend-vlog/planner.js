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
  const candidates = opts.candidates.filter(c => c && finite(c.t) && finite(c.score) && finite(c.sourceDuration));
  const used = {}, avoid = {}, recent = [], picks = [];
  candidates.filter(c => c.role === 'talking').forEach(c => { (avoid[c.rid] = avoid[c.rid] || []).push([c.t - 1, c.t + 1]); });
  const pool = candidates.filter(c => c.role !== 'talking' && c.sourceDuration > 0);
  let missing = 0;
  // Best fitting candidate for a slot. With roles == null, any non-talking role is accepted (last resort).
  function search(slot, roles) {
    let best = null;
    for (const c of pool) {
      const rank = roles ? roles.indexOf(c.role) : 0;
      if (rank < 0 || c.sourceDuration < slot.seconds) continue;
      const start = Math.max(0, Math.min(c.sourceDuration - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      if ((avoid[c.rid] || []).some(([a, b]) => start < b && end > a)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      const value = c.score - rank * 0.15 - repeats * 0.2 + cwvHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05;
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end };
    }
    return best;
  }
  for (const slot of opts.slots) {
    // Preferred roles always win; any other role is only used when none of them fits.
    const best = search(slot, CWV_ROLE_FALLBACK[slot.role] || [slot.role]) || search(slot, null);
    if (!best) { missing++; picks.push(null); continue; }
    (used[best.c.rid] = used[best.c.rid] || []).push([best.start, best.end]);
    recent.push(best.c.rid);
    if (recent.length > 3) recent.shift();
    picks.push({ slot: slot.index, rid: best.c.rid, startSeconds: best.start, endSeconds: best.end });
  }
  return { picks, filled: picks.filter(Boolean).length, missing };
}

// Tries the requested montage length first, then shrinks toward CWV_MIN_MONTAGE. Every attempt allocates from scratch.
function cwvPlanBuild(opts) {
  const top = Math.min(CWV_MAX_MONTAGE, Math.max(CWV_MIN_MONTAGE, opts.montageShots));
  let lastFilled = 0;
  for (let n = top; n >= CWV_MIN_MONTAGE; n--) {
    const schedule = cwvSchedule({ bpm: opts.bpm, fps: opts.fps, montageShots: n });
    const slots = schedule.slots.map(s => ({ index: s.index, role: s.role, seconds: (s.endFrame - s.startFrame) / opts.fps }));
    const alloc = cwvAllocate({ candidates: opts.candidates, slots, seed: opts.seed });
    lastFilled = alloc.filled;
    if (alloc.missing === 0) {
      return { ok: true, schedule, picks: alloc.picks, montageShots: n, usableShots: alloc.picks.length, needed: CWV_MIN_WINDOWS };
    }
  }
  return { ok: false, usableShots: lastFilled, needed: CWV_MIN_WINDOWS };
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
