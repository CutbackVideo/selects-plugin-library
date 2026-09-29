// tec-planner:start
// THE END Credits planner. A plain script: panel.tsx embeds it verbatim (between the tec-planner markers) and the
// tests load it in node:vm. Spec v1.1 (R1-R7) is normative. Times are seconds on the music clock; assemble converts
// them to frames once at the real Draft fps.
//
// Timeline: [0, L) lead-in (Classic: the black "Opening" generator; Full frame: shot 0 under the typed title), then
// N shots of one phrase P each, the last one extended by the tail T. Total L + N*P + T.
const TEC_LEAD_IN = 5.1;
const TEC_TAIL = 0.5;
const TEC_FIXED_PHRASE = 3.9;
// A phrase is m beats with m in TEC_BEAT_MULTIPLES and m * 60 / bpm inside [TEC_PHRASE_MIN, TEC_PHRASE_MAX].
const TEC_BEAT_MULTIPLES = [2, 4, 8];
const TEC_PHRASE_MIN = 3.4;
const TEC_PHRASE_MAX = 4.4;
const TEC_LENGTHS = { short: 5, standard: 7, long: 10 };
const TEC_LENGTH_ORDER = ['short', 'standard', 'long'];
const TEC_DEFAULT_LENGTH = 'standard';
// Fewest grid shots a build may shrink to (Full frame adds shot 0, so 4 + 1 visible shots there).
const TEC_MIN_SHOTS = 4;
// Music may be used up to this far before the end of the file.
const TEC_MUSIC_END_MARGIN = 0.1;

// Scene search roles (search.js sends the query, candidates come back with the role key).
const TEC_SEARCH_QUERIES = {
  wide: 'wide landscape',
  sunset: 'sunset or golden light',
  water: 'water or ocean',
  street: 'street or road',
  architecture: 'architecture',
  people: 'people walking or silhouettes',
};
const TEC_SEARCH_ROLES = ['wide', 'sunset', 'water', 'street', 'architecture', 'people'];
// The middle shots cycle through these after the opening wide shot; the last shot is the calm 'ending'.
const TEC_MIDDLE_ROLES = ['street', 'water', 'architecture', 'sunset', 'people', 'wide'];
// Which candidate roles may fill a slot role, best first.
const TEC_ROLE_FALLBACK = {
  'opening-wide': ['wide', 'water', 'sunset', 'architecture'],
  wide: ['wide', 'water', 'sunset', 'architecture'],
  ending: ['sunset', 'water', 'wide'],
  sunset: ['sunset', 'water', 'wide'],
  water: ['water', 'sunset', 'wide'],
  street: ['street', 'people', 'architecture'],
  architecture: ['architecture', 'street', 'wide'],
  people: ['people', 'street', 'wide'],
};

// ---------------------------------------------------------------------------------------------------------------
// Tempo and timeline

// { bpm, accepted } -> { P, m, fixed }. Own music whose detection was rejected, or where no multiple fits, gets the
// fixed 3.9 s phrase. The interval is narrower than a factor of 2, so at most one multiple fits.
function tecPhrase(opts) {
  const bpm = opts && opts.bpm;
  if (opts && opts.accepted !== false && typeof bpm === 'number' && isFinite(bpm) && bpm > 0) {
    for (const m of TEC_BEAT_MULTIPLES) {
      const P = m * 60 / bpm;
      if (P >= TEC_PHRASE_MIN - 1e-9 && P <= TEC_PHRASE_MAX + 1e-9) return { P, m, fixed: false };
    }
  }
  return { P: TEC_FIXED_PHRASE, m: null, fixed: true };
}

function tecVideoSeconds(N, P) { return TEC_LEAD_IN + N * P + TEC_TAIL; }

// The role of grid shot k (1..N) of N.
function tecShotRole(layout, k, N) {
  if (k === N) return 'ending';
  if (k === 1 && layout !== 'full') return 'wide';
  const i = layout === 'full' ? k - 1 : k - 2;
  return TEC_MIDDLE_ROLES[i % TEC_MIDDLE_ROLES.length];
}

// { layout: 'classic' | 'full', N, P } -> { layout, L, T, P, N, total, boundaries, slots }.
// boundaries are seconds from the video start: [0, L, L+P, ..., L+(N-1)P, L+N*P+T] (N + 2 entries).
// slots[0] is [0, L): Classic 'opening' (the generator; no footage), Full frame shot 0 (role 'opening-wide').
// slots[1..N] are the grid shots; the last one includes the tail.
function tecTimeline(opts) {
  const layout = opts.layout === 'full' ? 'full' : 'classic', N = opts.N, P = opts.P;
  if (!(N >= 1) || !(P > 0)) throw Error('tecTimeline needs N and P');
  const L = TEC_LEAD_IN, T = TEC_TAIL;
  const boundaries = [0, L];
  for (let k = 1; k < N; k++) boundaries.push(L + k * P);
  boundaries.push(L + N * P + T);
  const slots = [];
  for (let i = 0; i <= N; i++) {
    const seconds = boundaries[i + 1] - boundaries[i];
    if (i === 0) slots.push(layout === 'full' ? { index: 0, kind: 'shot', role: 'opening-wide', seconds } : { index: 0, kind: 'opening', role: null, seconds });
    else slots.push({ index: i, kind: 'shot', role: tecShotRole(layout, i, N), seconds });
  }
  return { layout, L, T, P, N, total: boundaries[boundaries.length - 1], boundaries, slots };
}

// Music section (spec R3). The section start s puts a phrase downbeat exactly at L: s = firstBeat + j*P - L, with
// s >= 0 and s + videoSeconds <= usableEnd. opts: { firstBeat, P, L?, videoSeconds, usableEnd, swell?, value?, fixed? }.
// swell: the bundled cue's swell (or the own music's loudest part); the default j is the smallest j whose downbeat
// is at or after it, clamped into the feasible range. value: a slider position (a section start in seconds) snapped
// to the nearest feasible j. Fixed timing (no steady beat): s is continuous in 0.1 s steps, default swell - L.
// Returns { start, j, jMin, jMax, min, max, defaultStart, defaultJ, fixed } or null when no start fits.
function tecSection(opts) {
  const L = opts.L == null ? TEC_LEAD_IN : opts.L, P = opts.P, need = opts.videoSeconds, end = opts.usableEnd;
  const finite = v => typeof v === 'number' && isFinite(v);
  if (!(P > 0) || !finite(need) || !finite(end)) return null;
  if (opts.fixed) {
    const max = Math.floor((end - need) * 10 + 1e-6) / 10;
    if (max < -1e-9) return null;
    const clamp = v => Math.max(0, Math.min(max, Math.round(v * 10) / 10));
    const defaultStart = clamp(finite(opts.swell) ? opts.swell - L : 0);
    const start = finite(opts.value) ? clamp(opts.value) : defaultStart;
    return { start, j: null, jMin: null, jMax: null, min: 0, max, defaultStart, defaultJ: null, fixed: true };
  }
  const fb = finite(opts.firstBeat) ? opts.firstBeat : 0;
  const at = j => fb + j * P - L;
  const jMin = Math.ceil((L - fb) / P - 1e-9);
  const jMax = Math.floor((end - need - fb + L) / P + 1e-9);
  if (jMax < jMin) return null;
  const clampJ = j => Math.max(jMin, Math.min(jMax, j));
  const defaultJ = clampJ(finite(opts.swell) ? Math.ceil((opts.swell - fb) / P - 1e-9) : jMin);
  const j = finite(opts.value) ? clampJ(Math.round((opts.value - fb + L) / P)) : defaultJ;
  return { start: at(j), j, jMin, jMax, min: at(jMin), max: at(jMax), defaultStart: at(defaultJ), defaultJ, fixed: false };
}

// The longest Length whose section fits the music, at or below `requested` (default: any).
// opts: { firstBeat, P, usableEnd, fixed?, requested? } -> { key, N, needSeconds } where key is null when not even
// Short fits; needSeconds is the music duration Short needs (usableEnd + the end margin).
function tecFitLength(opts) {
  const cap = opts.requested && TEC_LENGTHS[opts.requested] ? TEC_LENGTHS[opts.requested] : Infinity;
  const order = TEC_LENGTH_ORDER.slice().reverse();
  for (const key of order) {
    const N = TEC_LENGTHS[key];
    if (N > cap) continue;
    const s = tecSection({ firstBeat: opts.firstBeat, P: opts.P, videoSeconds: tecVideoSeconds(N, opts.P), usableEnd: opts.usableEnd, fixed: opts.fixed });
    if (s) return { key, N, needSeconds: null };
  }
  const shortSeconds = tecVideoSeconds(TEC_LENGTHS.short, opts.P);
  let earliest = 0;
  if (!opts.fixed) {
    const fb = typeof opts.firstBeat === 'number' && isFinite(opts.firstBeat) ? opts.firstBeat : 0;
    earliest = fb + Math.ceil((TEC_LEAD_IN - fb) / opts.P - 1e-9) * opts.P - TEC_LEAD_IN;
  }
  return { key: null, N: null, needSeconds: Math.ceil((earliest + shortSeconds + TEC_MUSIC_END_MARGIN) * 10 - 1e-6) / 10 };
}

// ---------------------------------------------------------------------------------------------------------------
// Shot allocation (adapted from the City Weekend Vlog allocator)

// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates. They score below any real hit and are only used by the last tiers.
const TEC_FILLER_STEP = 0.5;
const TEC_FILLER_EDGE = 0.25;
const TEC_FILLER_SCORE = -2;
// A video window ends at least this far before the end of its source (the real fps and the music offset can
// lengthen a shot by a frame after planning).
const TEC_SOURCE_TAIL = 0.05;
// Photos: an image source lasts 5 s, so a photo fills one slot of at most that length (never the 5.1 s Full frame
// shot 0). About TEC_PHOTO_SHARE of the shots are photo slots; at most TEC_PHOTO_RUN_MAX photos in a row while
// anything else fits. The first and last shots prefer video (photos rank after fillers there).
const TEC_PHOTO_HOLD_MAX = 5;
const TEC_PHOTO_RUN_MAX = 2;
const TEC_PHOTO_SHARE = 1 / 3;

function tecHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Filler candidates every TEC_FILLER_STEP seconds on each source in the candidates, sorted by rid then time.
function tecFillers(candidates) {
  const dur = {};
  for (const c of candidates) {
    if (!c || c.kind === 'photo' || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    for (let k = 0; ; k++) {
      const t = TEC_FILLER_EDGE + k * TEC_FILLER_STEP;
      if (t > dur[rid] - TEC_FILLER_EDGE + 1e-9) break;
      out.push({ rid, role: 'filler', t, score: TEC_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// opts: { candidates: [{ rid, role, t, score, sourceDuration } | { rid, kind: 'photo' }], slots: [{ index, role,
// seconds, prefersVideo? }], seed, photoShare?, gapSeconds? }. Slots are the footage slots in timeline order.
// The same source never plays in two adjacent slots: a slot with no other fitting source stays empty (missing), so
// tecPlanBuild shrinks the Length instead. Windows of one source never overlap (with a gap of gapSeconds).
function tecAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const finite = v => typeof v === 'number' && isFinite(v);
  const pool = opts.candidates.filter(c => c && c.kind !== 'photo' && finite(c.t) && finite(c.score) && finite(c.sourceDuration) && c.sourceDuration > 0);
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  const used = {}, recent = [], picks = [], photoUsed = {};
  let missing = 0, fillerShots = 0, photoShots = 0, photoRun = 0, photoRunRelaxed = false, prevRid = null;
  const photoSlots = {};
  const holdable = opts.slots.filter(sl => !sl.prefersVideo && sl.seconds <= TEC_PHOTO_HOLD_MAX + 1e-9);
  const share = opts.photoShare == null ? TEC_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(opts.slots.length * share));
  const phase = tecHash(opts.seed + ':photo-slots');
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;
  function searchVideo(slot, rankOf) {
    let best = null;
    for (const c of pool) {
      if (c.rid === prevRid) continue;
      const rank = rankOf(c);
      if (rank < 0 || c.sourceDuration < slot.seconds + TEC_SOURCE_TAIL) continue;
      const start = Math.max(0, Math.min(c.sourceDuration - TEC_SOURCE_TAIL - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      const value = c.score - rank * 0.15 - repeats * 0.2 + tecHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05;
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end };
    }
    return best;
  }
  function searchPhoto(slot) {
    if (slot.seconds > TEC_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const c of photos) {
      if (photoUsed[c.rid] || c.rid === prevRid) continue;
      const value = tecHash(opts.seed + ':photo:' + c.rid);
      if (!best || value > best.value + 1e-12) best = { value, c, photo: true };
    }
    return best;
  }
  for (const slot of opts.slots) {
    const roles = TEC_ROLE_FALLBACK[slot.role] || [slot.role];
    const runFull = photoRun >= TEC_PHOTO_RUN_MAX;
    const preferred = () => searchVideo(slot, c => roles.indexOf(c.role));
    const anyReal = () => searchVideo(slot, c => (c.role === 'filler' ? -1 : 0));
    const filler = () => searchVideo(slot, c => (c.role === 'filler' ? 0 : -1));
    const photo = () => searchPhoto(slot);
    const tiers = photoSlots[slot.index] ? [photo, preferred, anyReal, filler]
      : slot.prefersVideo ? [preferred, anyReal, filler, photo] : [preferred, anyReal, photo, filler];
    let best = null;
    for (const tier of tiers) {
      if (runFull && tier === photo) continue;
      if ((best = tier())) break;
    }
    if (!best && runFull && (best = photo())) { best.runRelaxed = true; photoRunRelaxed = true; }
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
  return { picks, filled: picks.filter(Boolean).length, missing, fillerShots, photoShots, photoRunRelaxed };
}

// Footage slots of a timeline for tecAllocate: Classic skips the opening generator slot. The first and last
// footage slots prefer video.
function tecFootageSlots(timeline) {
  const shots = timeline.slots.filter(s => s.kind === 'shot');
  return shots.map((s, i) => ({ index: s.index, role: s.role, seconds: s.seconds, prefersVideo: i === 0 || i === shots.length - 1 }));
}

// opts: { layout, N (requested grid shots), P, candidates, seed, photoShare? }. Tries N first, then shrinks toward
// TEC_MIN_SHOTS; every attempt allocates from scratch with filler candidates added. Returns
// { ok: true, layout, N, timeline, picks (one per footage slot, in order), visibleShots, fillerShots, photoShots, ... }
// or { ok: false, usableShots, needed } (needed = 4 visible shots in Classic, 4 + 1 in Full frame).
function tecPlanBuild(opts) {
  const layout = opts.layout === 'full' ? 'full' : 'classic';
  const top = Math.max(TEC_MIN_SHOTS, opts.N);
  const needed = TEC_MIN_SHOTS + (layout === 'full' ? 1 : 0);
  const candidates = opts.candidates.concat(tecFillers(opts.candidates));
  let last = null;
  for (let n = top; n >= TEC_MIN_SHOTS; n--) {
    const timeline = tecTimeline({ layout, N: n, P: opts.P });
    const alloc = tecAllocate({ candidates, slots: tecFootageSlots(timeline), seed: opts.seed, photoShare: opts.photoShare });
    if (alloc.missing === 0) {
      const plan = { ok: true, layout, N: n, requestedN: opts.N, shrunk: n < opts.N, timeline, picks: alloc.picks, visibleShots: alloc.picks.length,
        needed, fillerShots: alloc.fillerShots, photoShots: alloc.photoShots };
      if (alloc.photoRunRelaxed) plan.photoRunRelaxed = true;
      return plan;
    }
    last = alloc;
  }
  return { ok: false, layout, usableShots: last ? last.filled : 0, needed, photoShots: last ? last.photoShots : 0 };
}

// Photo motions for photo picks, in pick order (null for video picks). Deterministic per seed; never the same
// motion family twice in a row; drift, tilt and push-drift directions alternate. The shot sits in a 16:9 window and
// is cover-cropped, so a photo narrower than 16:9 (portrait, 4:3, 3:2) has room on y and only a wider one on x; an
// unknown size counts as a 3:2 photo. Each entry is { motion, direction, axis, strength } (strength 0.6 of CWV's).
const TEC_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const TEC_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
const TEC_PHOTO_MOTION_STRENGTH = 0.6;
function tecPhotoMotions(picks, seed, sizes) {
  const out = [];
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  for (const pick of picks) {
    if (!pick || pick.kind !== 'photo') { out.push(null); continue; }
    const size = sizes && sizes[pick.rid];
    const aspect = size && size.width > 0 && size.height > 0 ? size.width / size.height : 1.5;
    const axis = aspect > 16 / 9 + 1e-6 ? 'x' : 'y';
    const families = TEC_MOTION_FAMILIES.filter(f => f !== lastFamily)
      .map(f => ({ f, v: tecHash(seed + ':motion:' + k + ':' + f) }))
      .sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1));
    const family = families[0].f;
    let motion = family, direction = 1;
    if (family === 'drift') {
      direction = driftSign[axis]; driftSign[axis] = -direction;
      motion = axis === 'x' ? (direction > 0 ? 'drift-right' : 'drift-left') : (direction > 0 ? 'drift-down' : 'drift-up');
    } else if (family === 'tilt') { direction = tiltSign; tiltSign = -tiltSign; }
    else if (family === 'push-drift') { direction = pushDriftSign; pushDriftSign = -pushDriftSign; }
    out.push({ motion, direction, axis, strength: TEC_PHOTO_MOTION_STRENGTH });
    lastFamily = family; k++;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Title typing (spec R5): one slot per grapheme (Array.from), spaces included, no cursor. Glyph i (zero-based)
// appears at startSec + i * slotSec with slotSec = min(0.42, 4.4 / n), so typing completes by 0.47 + 4.4 = 4.87 s.
const TEC_TYPE_START = 0.47;
const TEC_TYPE_SLOT = 0.42;
const TEC_TYPE_BUDGET = 4.4;
function tecTyping(text) {
  const glyphs = Array.from(String(text == null ? '' : text));
  const n = glyphs.length;
  const slotSec = n > 0 ? Math.min(TEC_TYPE_SLOT, TEC_TYPE_BUDGET / n) : TEC_TYPE_SLOT;
  const times = glyphs.map((_, i) => TEC_TYPE_START + i * slotSec);
  return { slots: n, slotSec, startSec: TEC_TYPE_START, glyphs, times, doneSec: TEC_TYPE_START + n * slotSec };
}
// How many glyphs are visible at `sec` (0 before the first one appears).
function tecTypedCount(typing, sec) {
  if (!(sec >= typing.startSec - 1e-9)) return 0;
  return Math.min(typing.slots, Math.floor((sec - typing.startSec) / typing.slotSec + 1e-9) + 1);
}

// ---------------------------------------------------------------------------------------------------------------
// Credits

const TEC_NAME_PLACEHOLDER = '[Name Here]';
const TEC_FILM_CREW_ROLES = ['Director', 'Screenwriter', 'Editor', 'Original Score by', 'Production Designer', 'Costume Designer',
  'Visual Effects Supervisor', 'Sound Designer', 'Makeup Artist', 'Lighting Technician'];
const TEC_PRESETS = {
  filmCrew: { id: 'filmCrew', label: 'Film crew' },
  personal: { id: 'personal', label: 'Personal' },
  travel: { id: 'travel', label: 'Travel' },
};
const TEC_PRESET_ORDER = ['filmCrew', 'personal', 'travel'];
const TEC_DEFAULT_PRESET = 'filmCrew';
const TEC_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// A capture range longer than this many days reads as a month ("September 2026") instead of days.
const TEC_DAY_RANGE_MAX = 10;
const TEC_EN_DASH = '\u2013';
const TEC_MID_DOT = '\u00b7';

// The CWV place heuristic: a short Latin Project name that does not look like a working title.
function tecSuggestPlace(projectName) {
  const name = String(projectName || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!/^[A-Za-z][A-Za-z .']{1,30}$/.test(name)) return '';
  if (/\b(project|untitled|test|draft|copy|export|final|edit|vlog)\b/i.test(name)) return '';
  return name;
}

// A date string -> { y, m (0-11), d } in the recorded local date. A leading YYYY-MM-DD is read as written (the
// recording's own calendar date, independent of the viewer's time zone); anything else goes through Date.
function tecParseDate(value) {
  if (value == null || value === '') return null;
  const s = String(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const y = +iso[1], m = +iso[2] - 1, d = +iso[3];
    return m >= 0 && m < 12 && d >= 1 && d <= 31 ? { y, m, d } : null;
  }
  if (typeof Date !== 'function') return null;
  const t = new Date(s);
  return isNaN(t.getTime()) ? null : { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
}

// Capture dates -> "Sep 12, 2026", "Sep 12-14, 2026", "Sep 28 - Oct 2, 2026", "September 2026",
// "Sep - Nov 2026" or "Dec 30, 2025 - Jan 2, 2026"; '' without a usable date.
function tecDateRange(dates) {
  const list = (dates || []).map(tecParseDate).filter(Boolean).sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
  if (!list.length) return '';
  const a = list[0], b = list[list.length - 1];
  const short = m => TEC_MONTHS[m].slice(0, 3);
  const dayNo = x => Math.floor(Date.UTC(x.y, x.m, x.d) / 86400000);
  const span = dayNo(b) - dayNo(a);
  if (span === 0) return short(a.m) + ' ' + a.d + ', ' + a.y;
  if (span <= TEC_DAY_RANGE_MAX) {
    if (a.y === b.y && a.m === b.m) return short(a.m) + ' ' + a.d + TEC_EN_DASH + b.d + ', ' + a.y;
    if (a.y === b.y) return short(a.m) + ' ' + a.d + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + b.d + ', ' + a.y;
    return short(a.m) + ' ' + a.d + ', ' + a.y + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + b.d + ', ' + b.y;
  }
  if (a.y === b.y && a.m === b.m) return TEC_MONTHS[a.m] + ' ' + a.y;
  if (a.y === b.y) return short(a.m) + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + a.y;
  return short(a.m) + ' ' + a.y + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + b.y;
}

// "7 clips . 2 photos", "1 clip", "3 photos"; '' when both are 0.
function tecMomentsText(clips, photos) {
  const parts = [];
  const c = clips > 0 ? Math.floor(clips) : 0, p = photos > 0 ? Math.floor(photos) : 0;
  if (c) parts.push(c + (c === 1 ? ' clip' : ' clips'));
  if (p) parts.push(p + (p === 1 ? ' photo' : ' photos'));
  return parts.join(' ' + TEC_MID_DOT + ' ');
}

// The Music credit: the cue title + " (Selects library)", or the own-music file name without its extension.
function tecMusicCredit(info) {
  const own = String((info && info.ownMusicName) || '').trim();
  if (own) return own.replace(/^.*[\\/]/, '').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  const cue = String((info && info.cueTitle) || '').trim();
  return cue ? cue + ' (Selects library)' : '';
}

// Drops rows whose role and name are both blank; trims both fields. Always returns fresh { role, name } objects.
function tecCleanRows(rows) {
  return (rows || []).filter(Boolean).map(r => ({ role: String(r.role == null ? '' : r.role).trim(), name: String(r.name == null ? '' : r.name).trim() }))
    .filter(r => r.role !== '' || r.name !== '');
}

// Rows still holding a bracketed placeholder such as "[Name Here]" (indices).
function tecPlaceholderRows(rows) {
  const out = [];
  (rows || []).forEach((r, i) => { if (r && /\[[^\]]*\]/.test(String(r.role || '') + ' ' + String(r.name || ''))) out.push(i); });
  return out;
}

// info: { projectName, dates: [recordedAt...], cueTitle, ownMusicName, clips, photos }. Rows with no value are dropped.
function tecPersonalDefaults(info) {
  const i = info || {};
  return tecCleanRows([
    { role: 'A film by', name: '[Your name]' },
    { role: 'Filmed in', name: tecSuggestPlace(i.projectName) },
    { role: 'Filmed on', name: tecDateRange(i.dates) },
    { role: 'Starring', name: '[Names]' },
    { role: 'Music', name: tecMusicCredit(i) },
    { role: 'Moments', name: tecMomentsText(i.clips, i.photos) },
    { role: 'Edited with', name: 'Selects' },
    { role: 'Special thanks', name: '[Names]' },
  ].filter(r => r.name !== ''));
}

function tecTravelDefaults(info) {
  const i = info || {};
  return tecCleanRows([
    { role: 'Directed by', name: '[Your name]' },
    { role: 'Starring', name: '[Names]' },
    { role: 'Memories', name: tecMomentsText(i.clips, i.photos) },
    { role: 'Places', name: tecSuggestPlace(i.projectName) },
    { role: 'Music by', name: tecMusicCredit(i) },
    { role: 'Special Thanks', name: '[Names]' },
    { role: 'Created with', name: 'Selects' },
  ].filter(r => r.name !== ''));
}

// The rows of a preset (a fresh array every call). Unknown ids fall back to the default preset.
function tecPresetRows(presetId, info) {
  if (presetId === 'personal') return tecPersonalDefaults(info);
  if (presetId === 'travel') return tecTravelDefaults(info);
  return TEC_FILM_CREW_ROLES.map(role => ({ role, name: TEC_NAME_PLACEHOLDER }));
}

// Credit roll layout model. All vertical numbers are 1080p pixels (scaled by H / 1080); x and widths are shares of W.
// The title box is fixed at [titleTop, titleTop + titleCap] whatever the title text (the graphic fits the title
// inside it); the first role's top is titleToFirstRole below the box. Each pair: role (roleSize), name (nameSize)
// roleToName below the role's top; the next role pairPitch below. A line wider than the column is fitted down to
// minFit of its size; beyond that it wraps to 2 lines (word boundary, most balanced split) and the pair's pitch
// grows by that line's height (roleLine / nameLine). The roll speed targets the last role's top at endY * H.
const TEC_CREDIT_METRICS = {
  titleTop: 425, titleCap: 173, titleToFirstRole: 101,
  roleSize: 28, nameSize: 24, roleToName: 43, pairPitch: 123,
  roleLine: 39.2, nameLine: 33.6, minFit: 0.7, maxLines: 2,
  classic: { centerX: 0.223, maxWidth: 0.40 },
  // Full frame: the title lands higher (cap centre 0.28 H in the graphic), so the column starts 207 px higher.
  full: { centerX: 0.78, maxWidth: 0.30, titleShift: -207 },
  endY: 0.07, basePxPerSec: 67, minSpeed: 0.6, maxSpeed: 1.6,
};

// Fits one credit line. measure(text, fontPx, kind) -> width in px at that size. Returns
// { lines: [text...], fontPx, scale, overflow } (overflow: still wider than maxWidth at minFit, e.g. one long word).
function tecFitLine(text, basePx, maxWidth, measure, kind) {
  const M = TEC_CREDIT_METRICS;
  const s = String(text == null ? '' : text);
  if (s === '') return { lines: [], fontPx: basePx, scale: 1, overflow: false };
  const w = measure(s, basePx, kind);
  if (w <= maxWidth + 1e-9) return { lines: [s], fontPx: basePx, scale: 1, overflow: false };
  if (w * M.minFit <= maxWidth + 1e-9) { const scale = maxWidth / w; return { lines: [s], fontPx: basePx * scale, scale, overflow: false }; }
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 2) return { lines: [s], fontPx: basePx * M.minFit, scale: M.minFit, overflow: true };
  let best = null;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    const wide = Math.max(measure(a, basePx, kind), measure(b, basePx, kind));
    if (!best || wide < best.wide - 1e-9) best = { lines: [a, b], wide };
  }
  const scale = Math.max(M.minFit, Math.min(1, maxWidth / best.wide));
  return { lines: best.lines, fontPx: basePx * scale, scale, overflow: best.wide * scale > maxWidth + 1e-9 };
}

// opts: { rows, layout: 'classic' | 'full', H, W? (default H * 16 / 9), measure }. Returns every line's top y at the
// moment the roll starts (revealFrame): { H, W, k, centerX, maxWidth, title: { top, bottom }, rows: [{ index, top,
// bottom, pitch, role: { lines, fontPx, scale, overflow, top, lineHeight }, name: {...} }], firstRoleTop,
// lastRoleTop (null without rows), rowTops }.
function tecCreditLayout(opts) {
  const M = TEC_CREDIT_METRICS;
  const H = opts.H > 0 ? opts.H : 1080, W = opts.W > 0 ? opts.W : H * 16 / 9, k = H / 1080;
  const col = opts.layout === 'full' ? M.full : M.classic;
  const maxWidth = col.maxWidth * W;
  const measure = opts.measure;
  if (typeof measure !== 'function') throw Error('tecCreditLayout needs a measure function');
  const shift = (col.titleShift || 0) * k;
  const title = { top: (M.titleTop * k) + shift, bottom: (M.titleTop + M.titleCap) * k + shift };
  const rows = [];
  let y = title.bottom + M.titleToFirstRole * k;
  (opts.rows || []).forEach((r, index) => {
    const role = tecFitLine(r.role, M.roleSize * k, maxWidth, measure, 'role');
    const name = tecFitLine(r.name, M.nameSize * k, maxWidth, measure, 'name');
    const roleExtra = Math.max(0, role.lines.length - 1) * M.roleLine * k;
    const nameExtra = Math.max(0, name.lines.length - 1) * M.nameLine * k;
    role.top = y; role.lineHeight = M.roleLine * k;
    name.top = y + M.roleToName * k + roleExtra; name.lineHeight = M.nameLine * k;
    const pitch = M.pairPitch * k + roleExtra + nameExtra;
    rows.push({ index, top: y, bottom: name.top + Math.max(1, name.lines.length) * M.nameLine * k, pitch, role, name });
    y += pitch;
  });
  return {
    H, W, k, layout: opts.layout === 'full' ? 'full' : 'classic', centerX: col.centerX * W, maxWidth, title, rows,
    firstRoleTop: rows.length ? rows[0].top : null,
    lastRoleTop: rows.length ? rows[rows.length - 1].top : null,
    rowTops: rows.map(r => r.top),
  };
}

// Roll speed (spec R5/R7). opts: { endSec, L?, H, lastRoleStartY (the last role's top at the roll start; null or
// undefined without rows), rowTops? (every role's top, for hiddenRows / removeRows), layout? (ignored) }.
// raw = (lastRoleStartY - endY * H) / (endSec - L), clamped to [0.6, 1.6] x 67 px/s (scaled by H / 1080).
// Without rows the speed is the reference 67 px/s. Returns { pxPerSec, rawPxPerSec, basePxPerSec, minPxPerSec,
// maxPxPerSec, clamped: 'high' | 'low' | null, endsEarly, hiddenRows (indices whose top never rises above H),
// removeRows (rows to drop so the raw speed fits the clamp; 0 when it already does) }.
function tecRollSpeed(opts) {
  const M = TEC_CREDIT_METRICS;
  const H = opts.H > 0 ? opts.H : 1080, k = H / 1080, L = opts.L == null ? TEC_LEAD_IN : opts.L;
  const base = M.basePxPerSec * k, lo = base * M.minSpeed, hi = base * M.maxSpeed;
  const span = opts.endSec - L;
  const target = M.endY * H;
  const out = { pxPerSec: base, rawPxPerSec: null, basePxPerSec: base, minPxPerSec: lo, maxPxPerSec: hi, clamped: null, endsEarly: false, hiddenRows: [], removeRows: 0 };
  const last = opts.lastRoleStartY;
  if (last == null || !isFinite(last) || !(span > 0)) return out;
  const raw = (last - target) / span;
  out.rawPxPerSec = raw;
  if (raw > hi + 1e-9) { out.pxPerSec = hi; out.clamped = 'high'; }
  else if (raw < lo - 1e-9) { out.pxPerSec = lo; out.clamped = 'low'; out.endsEarly = true; }
  else out.pxPerSec = raw;
  const tops = Array.isArray(opts.rowTops) ? opts.rowTops : [];
  tops.forEach((top, i) => { if (top - out.pxPerSec * span >= H - 1e-9) out.hiddenRows.push(i); });
  if (out.clamped === 'high' && tops.length) {
    let keep = tops.length;
    while (keep > 1 && (tops[keep - 1] - target) / span > hi + 1e-9) keep--;
    out.removeRows = tops.length - keep;
  }
  return out;
}

// When the title's bottom edge leaves the top of the frame (seconds from the video start).
function tecTitleExitSec(layout, pxPerSec, L) {
  return (L == null ? TEC_LEAD_IN : L) + layout.title.bottom / pxPerSec;
}

// ---------------------------------------------------------------------------------------------------------------
// Build progress: 5 UI steps over 6 operations (Prepare = inventory + search; Plan; Music = ensure-audio;
// Assemble; Decorate). Each step's share of the bar is in percent.
const TEC_BUILD_STEPS = [
  { id: 'prepare', label: 'Finding shots', weight: 35 },
  { id: 'plan', label: 'Planning the edit', weight: 5 },
  { id: 'music', label: 'Preparing music', weight: 10 },
  { id: 'assemble', label: 'Creating Draft', weight: 30 },
  { id: 'decorate', label: 'Adding credits and look', weight: 20 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function tecProgress(stepId, fraction, detail) {
  const i = TEC_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = TEC_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = TEC_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + TEC_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  const step = TEC_BUILD_STEPS[i];
  return {
    value,
    percent,
    current: i,
    label: 'Step ' + (i + 1) + '/' + TEC_BUILD_STEPS.length + ' \u00b7 ' + step.label + (detail ? ' (' + detail + ')' : '') + ' \u00b7 ' + percent + '%',
  };
}
// tec-planner:end
