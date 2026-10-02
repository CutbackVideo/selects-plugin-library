// Selfie Aesthetic Edit planner. A plain script: panel.tsx embeds it verbatim (between `// sae-planner:start` and
// `// sae-planner:end`) and the tests load it in node:vm. No require, no imports; module.exports only when it exists.
//
// Rhythm template (spec "Rhythm template"): N bars, one source per bar. Bars 0..N-2 are standard bars of six holds
// [1, .5, .5, .5, .5, 1] beats with moments A B A B A B; the last bar is the finale, seven 1/2-beat holds A B A B A B A.
// The video starts SAE_LEAD before beat 0 of the chosen music section and ends at beat 4(N-1) + 3.5 plus
// SAE_END_TAIL (the last hold absorbs the tail). Holds = 6(N-1) + 7, cuts = holds - 1.
//
// Timing: timeline seconds of edit beat b = SAE_LEAD + b * 60 / editBpm + delta. The music clip starts at timeline
// frame 0 with sourceStart = sectionStart - SAE_LEAD; Selects snaps sourceStart to a whole frame, so the music plays
// offset by delta = sourceStart - round(sourceStart * fps) / fps (at most half a frame; saeMusicOffset). delta is applied once to every boundary, and every boundary
// is rounded to a frame on its own: frame = round(seconds * fps). Durations never accumulate rounding.
const SAE_LEAD = 0.15;
const SAE_END_TAIL = 0.040;
const SAE_STANDARD_BAR = [1, 0.5, 0.5, 0.5, 0.5, 1];
const SAE_STANDARD_MOMENTS = ['A', 'B', 'A', 'B', 'A', 'B'];
const SAE_FINALE_BAR = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
const SAE_FINALE_MOMENTS = ['A', 'B', 'A', 'B', 'A', 'B', 'A'];
const SAE_LENGTHS = { short: 4, standard: 6, long: 8 };
// Fewest bars a build shrinks to: two standard bars + the finale.
const SAE_MIN_BARS = 3;
// Tempo mapping: the cue's beat when it lies in [SAE_EDIT_BPM_MIN, SAE_EDIT_BPM_MAX], half-time when that is still at
// least SAE_EDIT_BPM_MIN, else the beat itself (125-140 BPM: a 1/2 beat of >= 0.21 s keeps a visible hold between the
// 2 + 2-frame whips).
const SAE_EDIT_BPM_MIN = 70;
const SAE_EDIT_BPM_MAX = 125;
// A detected beat is used when its bpm lies in this range (grid 'accepted' or 'approximate'); otherwise, for
// grid 'none' and without music, the edit runs on a fixed SAE_FIXED_BPM grid (1/2 beat = 0.309 s).
const SAE_GRID_BPM_MIN = 60;
const SAE_GRID_BPM_MAX = 250;
const SAE_FIXED_BPM = 97;
// Fixed-tempo own music: bar-change cuts (only those) may move onto a strong low-band onset within this window.
const SAE_SNAP_WINDOW = 0.120;
const SAE_SNAP_MIN_STRENGTH = 2;
const SAE_SNAP_DISTANCE_COST = 0.5;
// No hold may be shorter than this after an onset snap.
const SAE_MIN_HOLD_FRAMES = 3;
// The music's fade-out (bundled cues: 2 s); the edit must end before it starts.
const SAE_FADE_OUT = 2;
// Source windows: a hold window ends at least this far before the end of its source.
const SAE_SOURCE_TAIL = 0.15;
// Head handle: a moment starts at least this many frames into its source (and at least the whip length + 1 frame;
// SAE_WHIP_SECONDS matches the effect's), so the whip transition has source before the incoming clip's srcStart.
const SAE_HEAD_FRAMES = 3;
const SAE_WHIP_SECONDS = 0.067;
// Moments A and B of one bar are at least this far apart in the source, and never overlap (at least the window
// length apart).
const SAE_PAIR_GAP = 0.8;
// Expressive pairs: a moment's role is the pose role whose nearby hit (within SAE_ROLE_NEAR of its window) stands
// furthest above that role's mean hit score in the clip (none without nearby pose-role hits). A pair of two different
// roles (e.g. expression vs glance) gains SAE_PAIR_ROLE_BONUS; A and B at least SAE_PAIR_SEP seconds apart gain
// SAE_PAIR_SEP_BONUS, so visibly different moments beat two hits of one role close together.
// Only pose roles label a moment (a hand is a gesture, not an expression; see SAE_ROLE_TOP).
const SAE_POSE_ROLES = ['selfie', 'expression', 'glance'];
const SAE_PAIR_ROLE_BONUS = 0.06;
const SAE_PAIR_SEP = 1.5;
const SAE_PAIR_SEP_BONUS = 0.04;
// Filler candidate times every SAE_FILLER_STEP seconds per clip (at most SAE_MAX_FILLERS, evenly spaced, so a long
// clip does not blow up the pair search). Fillers score SAE_FILLER_SCORE, below any scene-search hit.
const SAE_FILLER_STEP = 0.5;
const SAE_MAX_FILLERS = 40;
const SAE_FILLER_SCORE = -1;
// Distinct moment pairs kept per clip (a repeated clip uses a different pair).
const SAE_MAX_PAIRS = 8;
// Stillness (the reference freezes every hold; ours are real-time micro-windows, so holds should come from the
// stillest moments). motion: { [rid]: { fps, values } }, values[i] = mean absolute luma difference between motion
// frames i and i + 1, covering source seconds [i / fps, (i + 1) / fps]. A window's motion cost is the mean of the
// values it overlaps over the clip's median (floored at SAE_STILL_FLOOR, capped at SAE_STILL_COST_MAX; 1 when no
// value overlaps). Moment score = hit score - weight * cost; pair score = the sum. With weight > 0 the local minima
// of the window cost (up to SAE_STILL_MINIMA per clip, lowest first) are added as filler candidates. Weight 0
// (the default) leaves every plan exactly as without motion.
const SAE_STILL_WEIGHT = 0;
const SAE_STILL_FLOOR = 0.5;
const SAE_STILL_COST_MAX = 4;
const SAE_STILL_MINIMA = 12;
// Moments within this distance of a moment an earlier pair already uses count as "the same moment" when picking
// further pairs (pairs with fresh moments come first).
const SAE_MOMENT_NEAR = 0.4;
// Face test (spec "Shot roles"): a clip is a face clip when its best face-role hit beats the clip's best control hit
// by more than SAE_FACE_MARGIN (scene-search score units). Tunable: raise it if landscape clips pass as faces, lower
// it if real selfies fail. Default 0.02, to be re-tuned on Staging (Set A vs the daily Project) and recorded in the
// planner tests. A clip without any control hit (the control search failed) is not a face clip; it stays usable.
const SAE_FACE_MARGIN = 0.02;
const SAE_FACE_ROLES = ['selfie', 'hand', 'expression', 'glance'];
// Photos: about SAE_PHOTO_SHARE of the bars, at most SAE_PHOTO_RUN_MAX photo bars in a row, never before bar
// SAE_PHOTO_FIRST_BAR (the opening and the next bar stay video, so the face A/B ping-pong lands first) nor in the
// finale while any video exists. Short edits (<= SAE_PHOTO_SHORT_BARS bars) take at most SAE_PHOTO_SHORT_MAX photo bar,
// and only when there are fewer than SAE_PHOTO_SHORT_FACES face clips (video-rich input plays video pairs).
const SAE_PHOTO_SHARE = 1 / 3;
const SAE_PHOTO_RUN_MAX = 2;
const SAE_PHOTO_FIRST_BAR = 2;
const SAE_PHOTO_SHORT_BARS = 4;
const SAE_PHOTO_SHORT_MAX = 1;
const SAE_PHOTO_SHORT_FACES = 3;
// Face clips are reused (with another A/B pair) up to this many bars each before photos and non-face clips fill in.
const SAE_FACE_MAX_USES = 2;
// Gesture vs face pose (the SDK gives no face position, only per-role scene-search hits). Per clip: the mean of
// its SAE_ROLE_TOP best hits per role; pose = the mean of the selfie and expression tops, gesture = hand top - pose
// (the hand top falls back to the best control hit, else 0, when the hand search found nothing). Per moment: the
// best hit of each role within SAE_ROLE_NEAR seconds of its window; the moment is gesture-dominated when its hand
// hit beats its best selfie / expression hit by more than SAE_GESTURE_MARGIN (or no selfie / expression hit is
// near). Hits are sparse (a few per role per clip), so the clip-level gesture carries most of the signal.
// Key bars (bar 0, the opening, and the finale) choose among equally used clips by key score = pose - hand top
// (+ SAE_KEY_JITTER seeded jitter instead of SAE_CLIP_JITTER), and pick the pair with the best
// score + SAE_KEY_POSE_WEIGHT * pose evidence - SAE_GESTURE_KEY per gesture-dominated moment (- SAE_KEY_STILL_WEIGHT
// * the pair's motion cost when the stillness picker is on). Every pair also loses SAE_GESTURE_MILD per
// gesture-dominated moment.
const SAE_ROLE_TOP = 3;
const SAE_ROLE_NEAR = 0.5;
const SAE_GESTURE_MARGIN = 0;
const SAE_GESTURE_MILD = 0.05;
const SAE_GESTURE_KEY = 0.3;
const SAE_KEY_POSE_WEIGHT = 0.5;
const SAE_KEY_STILL_WEIGHT = 0.1;
const SAE_KEY_JITTER = 0.02;
// Inner bars: the clip order adds SAE_GESTURE_CLIP_MILD * (pose - hand top) to the face score (a mild nudge; the
// clip jitter is SAE_CLIP_JITTER).
const SAE_GESTURE_CLIP_MILD = 0.5;
// Seeded jitter: clip order inside one use-count/tier group, and pair choice among a clip's unused pairs.
const SAE_CLIP_JITTER = 0.1;
const SAE_PAIR_JITTER = 0.05;
// Whip angle magnitude per cut, degrees; the sign alternates cut by cut from a seeded start.
const SAE_ANGLE_MIN = 25;
const SAE_ANGLE_MAX = 35;
// Whip strength per cut (the effect's whipIn / whipOut, 0-1.5, times the global Whip strength), after the reference's
// per-bar depth: bar changes ('spin') full; inner cuts of a standard bar lighter; the "subtle" bars (odd bar indexes
// 1, 3, 5 ... before the finale, only when there are at least SAE_WHIP_SUBTLE_MIN_BARS bars: the reference's bar 2
// is a gaze alternation with barely a smear) faint; the finale's inner cuts still pop. Both sides of a cut share it.
// At 0.35 the whip still dips to ~0.1 relative sharpness on similar A/B holds at 25 fps (eval-whips' primary
// threshold is 0.3; 0.2 still reads ~0.22), so beat verification keeps finding every cut.
const SAE_WHIP_SPIN = 1;
const SAE_WHIP_INNER = 0.6;
const SAE_WHIP_SUBTLE = 0.35;
const SAE_WHIP_FINALE = 0.75;
const SAE_WHIP_SUBTLE_MIN_BARS = 4;
// Unanalysed clips (opts.analysed[rid] === false; spec "build without analysis"): no scene search, so no face
// evidence and no bad-shot spans. Their moments come from the kit's quick local score (opts.local[rid], a
// quickScore result) through opts.pickLocal (the kit's pickWindowsLocal, passed in so this file stays plain): windows
// of the moment length ranked for role 'still' (this is a stillness style: sharp, well exposed, the lowest motion;
// black / fade / flash windows and windows with a scene cut inside are left out while others fit), at most
// SAE_LOCAL_MAX_WINDOWS per clip, best first. Moment score = its 'still' score (0-1). Pairs: A and B at least
// max(SAE_PAIR_GAP, window) apart, + SAE_LOCAL_SEP_BONUS when at least SAE_PAIR_SEP apart or a scene cut lies between
// them (visibly different poses). Key bars (bar 0 and the finale) add SAE_LOCAL_KEY_WEIGHT * the 'steady' scores of
// both moments (steadier, well-exposed windows). Without a usable score (no result, the kit's fallback result, or no
// pickLocal) a clip gets evenly spaced moments every SAE_FILLER_STEP from SAE_LOCAL_HEAD (the kit's QS_HEAD: stock
// clips often fade in), all scored 0, so the farthest-apart pair comes first; it still builds.
// Allocation treats unanalysed clips as likely close-ups ranked after the analysed face clips: tier 1 is "face or
// unanalysed" (least-used first; at equal use every face clip before any unanalysed one, unanalysed ones by `norm`,
// the rank of their clip quality within the unanalysed group, 0-1), then photos, then analysed non-face clips.
// Without opts.analysed (or with every rid analysed) every plan is exactly as before.
const SAE_LOCAL_HEAD = 0.5;
const SAE_LOCAL_MAX_WINDOWS = 40;
const SAE_LOCAL_SEP_BONUS = 0.1;
const SAE_LOCAL_KEY_WEIGHT = 0.5;

const saeFinite = v => typeof v === 'number' && isFinite(v);

// Seeded hash in [0, 1), memoised per key (the allocation asks for the same keys many times).
const saeHashCache = new Map();
function saeHash(str) {
  const key = String(str);
  const hit = saeHashCache.get(key);
  if (hit !== undefined) return hit;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  // Final avalanche (murmur3 fmix32): FNV alone barely changes for keys that differ only in their last character.
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  const v = (h >>> 0) / 4294967296;
  if (saeHashCache.size > 50000) saeHashCache.clear();
  saeHashCache.set(key, v);
  return v;
}

function saeEditBpm(bpm) {
  if (bpm >= SAE_EDIT_BPM_MIN && bpm <= SAE_EDIT_BPM_MAX) return bpm;
  if (bpm / 2 >= SAE_EDIT_BPM_MIN) return bpm / 2;
  return bpm;
}

// The tempo a cue (manifest entry or own-music analysis) gives the edit. cue null = no music.
// Returns { bpm (the music's beat, or SAE_FIXED_BPM when fixed), editBpm, fixed }.
function saeTempo(cue) {
  const grid = !!cue && saeFinite(cue.bpm) && cue.bpm >= SAE_GRID_BPM_MIN && cue.bpm <= SAE_GRID_BPM_MAX &&
    (cue.grid === 'accepted' || cue.grid === 'approximate');
  if (!grid) return { bpm: SAE_FIXED_BPM, editBpm: SAE_FIXED_BPM, fixed: true };
  return { bpm: cue.bpm, editBpm: saeEditBpm(cue.bpm), fixed: false };
}

// Seconds from beat 0 of the section to the end of the video (the lead is before beat 0).
function saeVideoSeconds(bars, editBpm) { return (4 * (bars - 1) + 3.5) * 60 / editBpm + SAE_END_TAIL; }

// delta: how far the music plays behind the planned grid once Selects snaps the music clip's source start
// (sourceStart = sectionStart - SAE_LEAD) to a frame. 0 without music.
function saeMusicOffset(sourceStart, fps) {
  if (!saeFinite(sourceStart) || !(fps > 0)) return 0;
  return sourceStart - Math.round(sourceStart * fps) / fps;
}

// Holds of an N-bar template in beats: [{ i, bar, moment, beats, startBeat, endBeat }].
function saeTemplate(bars) {
  if (!(bars >= 1) || Math.floor(bars) !== bars) throw Error('saeTemplate needs a whole number of bars');
  const holds = [];
  let at = 0;
  for (let k = 0; k < bars; k++) {
    const finale = k === bars - 1;
    const lengths = finale ? SAE_FINALE_BAR : SAE_STANDARD_BAR, moments = finale ? SAE_FINALE_MOMENTS : SAE_STANDARD_MOMENTS;
    for (let j = 0; j < lengths.length; j++) {
      holds.push({ i: holds.length, bar: k, moment: moments[j], beats: lengths[j], startBeat: at, endBeat: at + lengths[j] });
      at += lengths[j];
    }
  }
  return holds;
}

// opts: { editBpm (or bpm: the music's beat, mapped with saeEditBpm), fps, bars, sectionStart? (music seconds of
// beat 0; omit without music), snap?: true to snap bar-change cuts to low-band onsets (fixed tempo with own music),
// onsets?: [[music seconds, 'l'|'m'|'h', strength]], onsetThresholds?: { l, m, h } }.
// Returns { editBpm, fps, musicSourceStart (sectionStart - lead, or null), offset (delta at this fps), holds (template
// + startFrame, endFrame, frames), cutSecondsRaw (every boundary in timeline seconds WITHOUT the music offset, length
// holds + 1, first 0, last = the video end incl. the 40 ms tail), cutSeconds (raw + offset, first stays 0), cuts (inner
// cut frames), beats (timeline seconds of every whole edit beat, incl. offset), totalFrames, snapLog }.
// Boundary frame k = round(cutSeconds[k] * fps). At another fps: round((cutSecondsRaw[k] + saeMusicOffset(
// musicSourceStart, fps)) * fps) for k > 0 (assemble.js does this at the Draft's real rate).
function saeSchedule(opts) {
  const fps = opts.fps, bars = opts.bars;
  const editBpm = saeFinite(opts.editBpm) ? opts.editBpm : saeEditBpm(opts.bpm);
  if (!(editBpm > 0) || !(fps > 0) || !(bars >= 1)) throw Error('saeSchedule needs a bpm, fps and bars');
  const spb = 60 / editBpm;
  const sourceStart = saeFinite(opts.sectionStart) ? opts.sectionStart - SAE_LEAD : null;
  const offset = saeMusicOffset(sourceStart, fps);
  const tpl = saeTemplate(bars);
  const endBeat = tpl[tpl.length - 1].endBeat;
  const raw = [0].concat(tpl.slice(1).map(h => SAE_LEAD + h.startBeat * spb), [SAE_LEAD + endBeat * spb + SAE_END_TAIL]);
  const withOffset = (x, k) => (k === 0 ? 0 : x + offset);
  const frameOf = x => Math.round(x * fps);
  const snapLog = [];
  if (opts.snap && sourceStart !== null && opts.onsets && opts.onsets.length) {
    const thr = Math.max(SAE_SNAP_MIN_STRENGTH, (opts.onsetThresholds && opts.onsetThresholds.l) || 0);
    // A music onset at source second s sits at raw timeline second s - sourceStart (it plays at that + delta).
    const lows = opts.onsets.filter(o => o && o[1] === 'l' && saeFinite(o[0]) && saeFinite(o[2]) && o[2] >= thr)
      .map(o => ({ x: o[0] - sourceStart, ratio: o[2] / thr }));
    for (let i = 1; i < tpl.length; i++) {
      if (tpl[i].bar === tpl[i - 1].bar) continue; // only bar changes are anchors
      const g = raw[i];
      let best = null;
      for (const o of lows) {
        const d = Math.abs(o.x - g);
        if (d > SAE_SNAP_WINDOW + 1e-9) continue;
        const score = o.ratio - SAE_SNAP_DISTANCE_COST * d / SAE_SNAP_WINDOW;
        if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && d < best.d)) best = { x: o.x, d, score };
      }
      if (!best) { snapLog.push({ index: i, grid: g, seconds: g, reason: 'no onset' }); continue; }
      const f = frameOf(best.x + offset);
      const before = f - frameOf(withOffset(raw[i - 1], i - 1)), after = frameOf(withOffset(raw[i + 1], i + 1)) - f;
      if (before < SAE_MIN_HOLD_FRAMES || after < SAE_MIN_HOLD_FRAMES) { snapLog.push({ index: i, grid: g, seconds: g, reason: 'reverted: hold too short' }); continue; }
      raw[i] = best.x;
      snapLog.push({ index: i, grid: g, seconds: best.x, shiftMs: Math.round((best.x - g) * 1e4) / 10, reason: 'onset' });
    }
  }
  const cutSeconds = raw.map(withOffset);
  const frames = cutSeconds.map(frameOf);
  const holds = tpl.map((h, k) => ({ ...h, startFrame: frames[k], endFrame: frames[k + 1], frames: frames[k + 1] - frames[k] }));
  const beats = [];
  for (let b = 0; b <= Math.floor(endBeat + 1e-9); b++) beats.push(SAE_LEAD + b * spb + offset);
  return { editBpm, fps, musicSourceStart: sourceStart, offset, holds, cutSecondsRaw: raw, cutSeconds, cuts: frames.slice(1, -1), beats,
    totalFrames: frames[frames.length - 1], snapLog };
}

// Moments (spec "Moments"). opts: { candidates: [{ rid, role, t, score }], durations: { [rid]: seconds },
// badSpans?: { [rid]: [[s, e], ...] }, fps, beatSeconds (window length: the longest hold a moment plays),
// margin? (default SAE_FACE_MARGIN), motion?, stillWeight? (default SAE_STILL_WEIGHT; see SAE_STILL_WEIGHT),
// analysed?: { [rid]: false for a clip without analysis }, local?: { [rid]: quickScore result }, pickLocal? (the kit's
// pickWindowsLocal; see SAE_LOCAL_HEAD) }.
// Per clip (every rid in durations, sorted): faceScore = max over face-role hits of (score - best control score), null
// without face or control hits; face = faceScore > margin. Candidate times: every hit time (any score) plus fillers;
// a time t is kept when its window [s, s + beatSeconds] (s = t snapped down to a whole frame, and no earlier than the
// head handle: max(SAE_HEAD_FRAMES, whip frames + 1) frames; earlier times move there) misses every bad span
// and ends at least SAE_SOURCE_TAIL before the end of the source. Pairs: A and B >= max(SAE_PAIR_GAP, window) apart
// (never overlapping), best summed
// score first (scores less the still penalty; ties: farther apart, then earlier), A = the better-scoring moment; up
// to SAE_MAX_PAIRS distinct pairs, pairs whose moments no earlier pair uses first. A clip with no such pair gets one relaxed pair (its two
// farthest-apart times, or one time twice), marked relaxed and scored below every real pair.
// Pair scores also lose SAE_GESTURE_MILD per gesture-dominated moment (see SAE_ROLE_TOP).
// Returns { clips: [{ rid, duration, face, faceScore, control, pose, gesture, handTop, times, pairs: [{ a, b, score,
// gesture, pose, still, relaxed? }] }], faceCount, localCount }. An unanalysed clip (saeLocalClip) also carries
// local: true, fallback, quality, norm, steadyNorm, and its pairs local: true and steady.
function saeMoments(opts) {
  const fps = opts.fps, win = opts.beatSeconds;
  if (!(fps > 0) || !(win > 0)) throw Error('saeMoments needs fps and beatSeconds');
  const margin = saeFinite(opts.margin) ? opts.margin : SAE_FACE_MARGIN;
  const durations = opts.durations || {}, spansOf = opts.badSpans || {};
  const head = Math.max(SAE_HEAD_FRAMES, Math.round(SAE_WHIP_SECONDS * fps) + 1);
  const still = saeFinite(opts.stillWeight) ? Math.max(0, opts.stillWeight) : SAE_STILL_WEIGHT;
  const motionOf = opts.motion || {};
  const analysedOf = opts.analysed || {};
  const byRid = {};
  for (const c of opts.candidates || []) {
    if (!c || typeof c.rid !== 'string' || !saeFinite(c.t) || !saeFinite(c.score)) continue;
    (byRid[c.rid] = byRid[c.rid] || []).push(c);
  }
  const clips = [];
  for (const rid of Object.keys(durations).sort()) {
    const dur = durations[rid];
    if (!saeFinite(dur) || !(dur > 0)) continue;
    if (analysedOf[rid] === false) { clips.push(saeLocalClip(rid, dur, fps, win, head, opts)); continue; }
    const hits = byRid[rid] || [];
    let control = null, best = null;
    for (const h of hits) if (h.role === 'control' && (control === null || h.score > control)) control = h.score;
    for (const h of hits) if (SAE_FACE_ROLES.indexOf(h.role) >= 0 && (best === null || h.score > best)) best = h.score;
    const faceScore = control === null || best === null ? null : best - control;
    const face = faceScore !== null && faceScore > margin;
    // Role evidence (see SAE_ROLE_TOP): tops per role, clip pose and gesture.
    const byRole = {};
    for (const h of hits) if (SAE_FACE_ROLES.indexOf(h.role) >= 0) (byRole[h.role] = byRole[h.role] || []).push(h.score);
    const top = r => { const v = (byRole[r] || []).slice().sort((x, y) => y - x).slice(0, SAE_ROLE_TOP); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
    const poseTops = [top('selfie'), top('expression')].filter(v => v !== null);
    const pose = poseTops.length ? poseTops.reduce((x, y) => x + y, 0) / poseTops.length : null;
    const handTop = top('hand') !== null ? top('hand') : control !== null ? control : 0;
    const roleMean = {};
    for (const r of SAE_FACE_ROLES) if (byRole[r]) roleMean[r] = byRole[r].reduce((x, y) => x + y, 0) / byRole[r].length;
    const gesture = pose === null ? null : handTop - pose;
    const spans = (spansOf[rid] || []).filter(s => s && saeFinite(s[0]) && saeFinite(s[1]));
    // Window start for a time, or null when the window is not usable.
    const startOf = t => {
      if (!(t >= 0)) return null;
      const f = Math.max(head, Math.floor(t * fps + 1e-6));
      const s = f / fps, e = s + win;
      if (e > dur - SAE_SOURCE_TAIL + 1e-9) return null;
      if (spans.some(sp => s < sp[1] && e > sp[0])) return null;
      return { f, s };
    };
    // Motion cost of the window starting at s, or null without a still weight / a usable curve.
    const cost = still > 0 ? saeStillCost(motionOf[rid], win) : null;
    const times = new Map(); // frame -> { t, score, hit }
    for (const h of hits) {
      if (h.role === 'control') continue;
      const w = startOf(h.t);
      if (!w) continue;
      const old = times.get(w.f);
      if (!old || h.score > old.score) times.set(w.f, { t: w.s, score: h.score, hit: true });
    }
    if (cost) {
      // A minimum's window starts on the next whole frame (snapping down would pull in the motion sample before it).
      for (const t of cost.minima) {
        const w = startOf(Math.ceil(t * fps - 1e-6) / fps);
        if (w && !times.has(w.f)) times.set(w.f, { t: w.s, score: SAE_FILLER_SCORE, hit: false });
      }
    }
    const fillers = [];
    for (let k = 0; k * SAE_FILLER_STEP <= dur + 1e-9; k++) { const w = startOf(k * SAE_FILLER_STEP); if (w) fillers.push(w); }
    const keep = fillers.length <= SAE_MAX_FILLERS ? fillers
      : Array.from({ length: SAE_MAX_FILLERS }, (_, j) => fillers[Math.round(j * (fillers.length - 1) / (SAE_MAX_FILLERS - 1))]);
    for (const w of keep) if (!times.has(w.f)) times.set(w.f, { t: w.s, score: SAE_FILLER_SCORE, hit: false });
    const list = Array.from(times.values()).sort((p, q) => p.t - q.t);
    if (cost) for (const e of list) { e.cost = cost.at(e.t); e.score = e.score - still * e.cost; }
    // Role evidence near each moment's window: hand vs the best selfie / expression hit.
    for (const e of list) {
      const lo = e.t - SAE_ROLE_NEAR - 1e-9, hi = e.t + win + SAE_ROLE_NEAR + 1e-9, nearBest = {};
      for (const h of hits) if (h.t >= lo && h.t <= hi && (nearBest[h.role] === undefined || h.score > nearBest[h.role])) nearBest[h.role] = h.score;
      const faceNear = Math.max(nearBest.selfie !== undefined ? nearBest.selfie : -Infinity, nearBest.expression !== undefined ? nearBest.expression : -Infinity);
      e.pose = faceNear > -Infinity ? faceNear : 0;
      e.gesture = nearBest.hand !== undefined && (faceNear === -Infinity || nearBest.hand - faceNear > SAE_GESTURE_MARGIN + 1e-12) ? 1 : 0;
      let role = null, lift = -Infinity;
      for (const r of SAE_POSE_ROLES) {
        if (nearBest[r] === undefined) continue;
        const v = nearBest[r] - roleMean[r];
        if (v > lift + 1e-12) { lift = v; role = r; }
      }
      e.role = role;
    }
    // A and B never overlap: at least the window length (and SAE_PAIR_GAP) apart.
    const gap = Math.max(SAE_PAIR_GAP, win);
    const all = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i], q = list[j];
        if (q.t - p.t < gap - 1e-9) continue;
        const aFirst = p.score >= q.score;
        const gesture = p.gesture + q.gesture;
        const roles = !!p.role && !!q.role && p.role !== q.role;
        const bonus = (roles ? SAE_PAIR_ROLE_BONUS : 0) + (q.t - p.t >= SAE_PAIR_SEP - 1e-9 ? SAE_PAIR_SEP_BONUS : 0);
        all.push({ a: aFirst ? p.t : q.t, b: aFirst ? q.t : p.t, score: p.score + q.score - SAE_GESTURE_MILD * gesture + bonus, sep: q.t - p.t, early: p.t,
          roles: aFirst ? [p.role, q.role] : [q.role, p.role],
          gesture, pose: p.pose + q.pose, still: cost ? p.cost + q.cost : null });
      }
    }
    all.sort((p, q) => q.score - p.score || q.sep - p.sep || p.early - q.early || p.a - q.a);
    const pairs = [], usedTimes = [];
    const near = t => usedTimes.some(u => Math.abs(u - t) < SAE_MOMENT_NEAR - 1e-9);
    for (const p of all) {
      if (pairs.length >= SAE_MAX_PAIRS) break;
      if (near(p.a) || near(p.b)) continue;
      pairs.push(saePairOut(p));
      usedTimes.push(p.a, p.b);
    }
    for (const p of all) {
      if (pairs.length >= SAE_MAX_PAIRS) break;
      if (pairs.some(x => x.a === p.a && x.b === p.b)) continue;
      pairs.push(saePairOut(p));
    }
    if (!pairs.length && list.length) {
      const p = list[0], q = list[list.length - 1];
      pairs.push({ a: p.t, b: q.t, score: p.score + q.score - 100, relaxed: true, gesture: p.gesture + q.gesture, pose: p.pose + q.pose, still: null, roles: [p.role, q.role] });
    }
    clips.push({ rid, duration: dur, face, faceScore, control, pose, gesture, handTop, times: list.length, pairs });
  }
  saeLocalNorm(clips);
  return { clips, faceCount: clips.filter(c => c.face && c.pairs.length).length, localCount: clips.filter(c => c.local && c.pairs.length).length };
}

// One unanalysed clip's moments and pairs (see SAE_LOCAL_HEAD). head: the head handle in frames.
function saeLocalClip(rid, dur, fps, win, head, opts) {
  const res = opts.local && opts.local[rid];
  const pick = typeof opts.pickLocal === 'function' ? opts.pickLocal : null;
  const startOf = t => {
    if (!(t >= 0)) return null;
    const f = Math.max(head, Math.floor(t * fps + 1e-6));
    const s = f / fps;
    return s + win > dur - SAE_SOURCE_TAIL + 1e-9 ? null : { f, s };
  };
  const times = new Map(); // frame -> { t, score, steady }
  let fallback = true;
  if (res && !res.fallback && pick) {
    const steadyAt = {};
    for (const w of pick(res, 'steady', win) || []) if (w && saeFinite(w.start) && saeFinite(w.score)) steadyAt[w.start.toFixed(3)] = w.score;
    const still = (pick(res, 'still', win) || []).filter(w => w && saeFinite(w.start) && saeFinite(w.score));
    for (const w of still) {
      if (times.size >= SAE_LOCAL_MAX_WINDOWS) break;
      const st = startOf(w.start);
      if (!st || times.has(st.f)) continue;
      times.set(st.f, { t: st.s, score: w.score, steady: steadyAt[w.start.toFixed(3)] || 0 });
    }
    fallback = times.size === 0;
  }
  if (fallback) {
    const grid = [];
    for (let k = 0; SAE_LOCAL_HEAD + k * SAE_FILLER_STEP <= dur + 1e-9; k++) { const st = startOf(SAE_LOCAL_HEAD + k * SAE_FILLER_STEP); if (st) grid.push(st); }
    const keep = grid.length <= SAE_MAX_FILLERS ? grid
      : Array.from({ length: SAE_MAX_FILLERS }, (_, j) => grid[Math.round(j * (grid.length - 1) / (SAE_MAX_FILLERS - 1))]);
    for (const st of keep) if (!times.has(st.f)) times.set(st.f, { t: st.s, score: 0, steady: 0 });
  }
  const list = Array.from(times.values()).sort((p, q) => p.t - q.t);
  const cuts = res && Array.isArray(res.sceneCuts) ? res.sceneCuts.filter(saeFinite) : [];
  const gap = Math.max(SAE_PAIR_GAP, win);
  const all = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const p = list[i], q = list[j];
      if (q.t - p.t < gap - 1e-9) continue;
      const apart = q.t - p.t >= SAE_PAIR_SEP - 1e-9 || cuts.some(c => c > p.t + win - 1e-9 && c < q.t + 1e-9);
      const aFirst = p.score >= q.score;
      all.push({ a: aFirst ? p.t : q.t, b: aFirst ? q.t : p.t, score: p.score + q.score + (apart ? SAE_LOCAL_SEP_BONUS : 0), sep: q.t - p.t, early: p.t,
        quality: (p.score + q.score) / 2, steady: p.steady + q.steady });
    }
  }
  all.sort((p, q) => q.score - p.score || q.sep - p.sep || p.early - q.early || p.a - q.a);
  const out = p => ({ a: p.a, b: p.b, score: p.score, gesture: 0, pose: 0, still: null, roles: [null, null], local: true, steady: p.steady });
  const pairs = [], usedTimes = [];
  const near = t => usedTimes.some(u => Math.abs(u - t) < SAE_MOMENT_NEAR - 1e-9);
  for (const p of all) {
    if (pairs.length >= SAE_MAX_PAIRS) break;
    if (near(p.a) || near(p.b)) continue;
    pairs.push(out(p));
    usedTimes.push(p.a, p.b);
  }
  for (const p of all) {
    if (pairs.length >= SAE_MAX_PAIRS) break;
    if (pairs.some(x => x.a === p.a && x.b === p.b)) continue;
    pairs.push(out(p));
  }
  if (!pairs.length && list.length) {
    const p = list[0], q = list[list.length - 1];
    pairs.push({ a: p.t, b: q.t, score: p.score + q.score - 100, relaxed: true, gesture: 0, pose: 0, still: null, roles: [null, null], local: true, steady: p.steady + q.steady });
  }
  const quality = all.length ? Math.max(...all.map(p => p.quality)) : 0;
  const steadyBest = all.length ? Math.max(...all.map(p => p.steady)) : 0;
  return { rid, duration: dur, face: false, faceScore: null, control: null, pose: null, gesture: null, handTop: 0, times: list.length, pairs,
    local: true, fallback, quality, steadyBest, norm: 0, steadyNorm: 0 };
}

// Rank normalisation of the unanalysed clips within their group (spec "mixed projects": one comparable 0-1 scale):
// norm = the rank of the clip quality (best pair's mean 'still' score), steadyNorm = the rank of the best pair's
// 'steady' scores; ties share their mean rank; a single clip is 1. Analysed clips keep their scene-search scores,
// which only ever compete with each other (the tier order keeps the groups apart).
function saeLocalNorm(clips) {
  const local = clips.filter(c => c.local);
  const rank = (key, out) => {
    const sorted = local.map(c => c[key]).sort((x, y) => x - y);
    for (const c of local) {
      const lo = sorted.indexOf(c[key]), hi = sorted.lastIndexOf(c[key]);
      c[out] = local.length > 1 ? (lo + hi) / 2 / (local.length - 1) : 1;
    }
  };
  rank('quality', 'norm');
  rank('steadyBest', 'steadyNorm');
}

// The pair fields saeMoments returns: { a, b, score, gesture (gesture-dominated moments, 0-2), pose (summed near
// selfie / expression evidence), still (summed motion cost, null without the stillness picker), roles ([A, B] moment
// roles, see SAE_PAIR_ROLE_BONUS) }.
function saePairOut(p) { return { a: p.a, b: p.b, score: p.score, gesture: p.gesture, pose: p.pose, still: p.still, roles: p.roles }; }

// Motion cost per window of `win` seconds for one clip's curve ({ fps, values }; see SAE_STILL_WEIGHT), or null
// when the curve is unusable. Returns { at(s): cost of the window [s, s + win], minima: window starts (seconds) at
// local minima of the cost, lowest first (ties: earlier), at most SAE_STILL_MINIMA }.
function saeStillCost(curve, win) {
  const mfps = curve && curve.fps, vals = curve && curve.values;
  if (!(mfps > 0) || !vals || !(vals.length >= 2)) return null;
  const n = vals.length, v = [];
  for (let i = 0; i < n; i++) { const x = Number(vals[i]); v.push(isFinite(x) && x > 0 ? x : 0); }
  const sorted = v.slice().sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const norm = Math.max(SAE_STILL_FLOOR, median);
  const prefix = [0];
  for (let i = 0; i < n; i++) prefix.push(prefix[i] + v[i]);
  const at = s => {
    const i0 = Math.max(0, Math.floor(s * mfps + 1e-6)), i1 = Math.min(n, Math.ceil((s + win) * mfps - 1e-6));
    if (i1 <= i0) return 1;
    return Math.min(SAE_STILL_COST_MAX, (prefix[i1] - prefix[i0]) / (i1 - i0) / norm);
  };
  const c = [];
  for (let k = 0; k < n; k++) c.push(at(k / mfps));
  const minima = [];
  for (let k = 0; k < n; k++) {
    if ((k === 0 || c[k] < c[k - 1]) && (k === n - 1 || c[k] <= c[k + 1])) minima.push({ k, c: c[k] });
  }
  minima.sort((p, q) => p.c - q.c || p.k - q.k);
  return { at, minima: minima.slice(0, SAE_STILL_MINIMA).map(m => m.k / mfps) };
}

// Bars that hold photos: up to `count` of the bars 0..bars-1, inner bars (SAE_PHOTO_FIRST_BAR..bars-2) first, evenly
// spread from a seeded phase, never more than SAE_PHOTO_RUN_MAX in a row. innerOnly (any video exists): only those
// inner bars, so fewer than `count` bars may come back; otherwise bars 1, 0 and the finale may follow.
function saePhotoBars(bars, count, seed, innerOnly) {
  const out = {};
  if (!(count > 0)) return out;
  const inner = [];
  for (let k = SAE_PHOTO_FIRST_BAR; k < bars - 1; k++) inner.push(k);
  const order = [];
  const phase = saeHash(seed + ':photo-bars');
  const evenly = (pool, n) => {
    const picks = [];
    for (let k = 0; k < n && pool.length; k++) {
      const idx = Math.floor((k + phase) * pool.length / n) % pool.length;
      if (picks.indexOf(pool[idx]) < 0) picks.push(pool[idx]);
    }
    return picks;
  };
  evenly(inner, Math.min(count, inner.length)).forEach(k => order.push(k));
  // Then any remaining inner bar, then bar 0 and the finale, in seeded order.
  const edge = k => k < SAE_PHOTO_FIRST_BAR || k === bars - 1;
  const outer = [];
  for (let k = 0; k < bars; k++) if (edge(k)) outer.push(k);
  inner.concat(innerOnly ? [] : outer)
    .map(k => ({ k, v: saeHash(seed + ':photo-bar:' + k) }))
    .sort((p, q) => (edge(p.k) ? 1 : 0) - (edge(q.k) ? 1 : 0) || p.v - q.v)
    .forEach(x => { if (order.indexOf(x.k) < 0) order.push(x.k); });
  const runOk = (set, k) => {
    let left = 0, right = 0;
    for (let j = k - 1; j >= 0 && set[j]; j--) left++;
    for (let j = k + 1; j < bars && set[j]; j++) right++;
    return left + right + 1 <= SAE_PHOTO_RUN_MAX;
  };
  let n = 0;
  for (const k of order) { if (n >= count) break; if (runOk(out, k)) { out[k] = true; n++; } }
  return out;
}

// Bar allocation (spec "Bar allocation", with the user's GATE-A ruling on few face clips). opts: { clips (saeMoments
// clips), photos: [{ rid }] | [rid], bars, seed, usePhotos (default true), allowAdjacent?, allowPairReuse?
// (relaxations for tiny pools), photoRelax? (0 strict; 1: photos from bar 1 on and no Short cap; 2: also the finale;
// saePlanBuild tries them before shrinking or relaxing adjacency) }.
// Photo bars: round(bars / 3) (capped by the photos; Short edits see SAE_PHOTO_SHORT_BARS), bars
// SAE_PHOTO_FIRST_BAR..bars-2 only while any video exists, at most SAE_PHOTO_RUN_MAX in a row: photos are a default
// style element. Every other bar takes, in this order:
//   1. a face clip (or an unanalysed clip, after the face clips; see SAE_LOCAL_HEAD) used fewer than SAE_FACE_MAX_USES
//      times, least-used first (every face clip once before any face repeat), then by face score plus a seeded jitter;
//   2. an extra (unused) photo, while the run limit allows (same bars as above; Short: within its photo cap);
//   3. a non-face clip, least-used first;
//   4. a face clip beyond SAE_FACE_MAX_USES uses (last resort before shrinking).
// So when face clips are few, the edit reuses them (with a different A/B pair) until one would need a third use or
// adjacency gets in the way, then photos beyond round(bars / 3), then non-face clips. Never the same rid in adjacent
// bars when >= 2 sources exist. A repeated clip takes one of its unused pairs.
// Returns { ok, bars: [{ bar, kind, rid, pair }], uses: { [rid]: n }, photoBars, failedAt? }.
function saeAllocate(opts) {
  const N = opts.bars, seed = String(opts.seed == null ? 1 : opts.seed);
  const usable = (opts.clips || []).filter(c => c && c.pairs && c.pairs.length);
  // Clips with only a relaxed pair (too short for A/B >= SAE_PAIR_GAP) are a last resort: used only when no clip has
  // a real pair, or with allowPairReuse (the tiny-pool fallback).
  const strict = usable.filter(c => c.pairs.some(q => !q.relaxed));
  const vids = strict.length && !opts.allowPairReuse ? strict : usable;
  const seenPhoto = {};
  const pics = opts.usePhotos === false ? [] : (opts.photos || [])
    .map(p => (typeof p === 'string' ? p : p && p.rid))
    .filter(r => typeof r === 'string' && !seenPhoto[r] && (seenPhoto[r] = true)).sort();
  const sources = vids.length + pics.length;
  if (!sources || !(N >= 1)) return { ok: false, bars: [], uses: {}, photoBars: 0, failedAt: 0 };
  const short = N <= SAE_PHOTO_SHORT_BARS;
  const faceVids = vids.filter(c => c.face || c.local).length;
  const photoRelax = opts.photoRelax > 0 ? opts.photoRelax : 0;
  const photoMax = short && !photoRelax ? (faceVids < SAE_PHOTO_SHORT_FACES ? SAE_PHOTO_SHORT_MAX : 0) : Infinity;
  const photoCount = Math.min(pics.length, photoMax, Math.round(N * SAE_PHOTO_SHARE));
  const photoBar = saePhotoBars(N, photoCount, seed, vids.length > 0);
  const uses = {}, pairUsed = {}, picks = [];
  let prev = null, photoRun = 0, photoBars = 0, bar = 0;
  const notPrev = rid => rid !== prev || sources < 2 || !!opts.allowAdjacent;
  // While any video exists, photos never hold the first SAE_PHOTO_FIRST_BAR bars nor the finale, and a Short edit
  // stays within its photo cap (allowRun, the tiny-pool fallback, skips these rules).
  // photoRelax 1: from bar 1 on; 2: the finale too. Bar 0 is always a video while any video exists.
  const photoBarOk = () => !vids.length ||
    (bar >= (photoRelax ? 1 : SAE_PHOTO_FIRST_BAR) && (bar !== N - 1 || photoRelax >= 2) && photoBars < photoMax);
  const pickPhoto = allowRun => {
    if (!allowRun && photoRun >= SAE_PHOTO_RUN_MAX) return null;
    if (!allowRun && !photoBarOk()) return null;
    let best = null;
    for (const rid of pics) {
      if (!notPrev(rid)) continue;
      const u = uses[rid] || 0;
      if (u > 0 && !opts.allowPairReuse) continue; // a photo holds one bar (tiny pools: fewest uses first)
      const v = saeHash(seed + ':photo:' + rid);
      if (!best || u < best.u || (u === best.u && v > best.v)) best = { rid, v, u };
    }
    return best && { kind: 'photo', rid: best.rid, pair: null };
  };
  const hasPair = c => opts.allowPairReuse || c.pairs.some((p, i) => !(pairUsed[c.rid] && pairUsed[c.rid][i]));
  // The least-used clip among those `keep` accepts, then by face score plus a seeded jitter (key bars: by key score,
  // pose - hand top, see SAE_ROLE_TOP); its best unused pair (key bars: clean face pose pairs first).
  const pickVideo = (keep, k) => {
    const key = k === 0 || k === N - 1;
    let best = null;
    for (const c of vids) {
      if (!keep(c) || !notPrev(c.rid) || !hasPair(c)) continue;
      const u = uses[c.rid] || 0;
      // Clips without selfie / expression hits keep the plain order (below every clip with a key score); unanalysed
      // clips come after every analysed face clip (see SAE_LOCAL_HEAD).
      const v = c.local ? (key ? -2 + 0.5 * c.steadyNorm + SAE_KEY_JITTER * saeHash(seed + ':key:' + c.rid + ':' + u) : -1 + 0.5 * c.norm + SAE_CLIP_JITTER * saeHash(seed + ':clip:' + c.rid + ':' + u))
        : key && saeFinite(c.pose)
        ? c.pose - c.handTop + SAE_KEY_JITTER * saeHash(seed + ':key:' + c.rid + ':' + u)
        : (saeFinite(c.faceScore) ? c.faceScore : -1) + SAE_CLIP_JITTER * saeHash(seed + ':clip:' + c.rid + ':' + u) - (key ? 1 : 0) +
          (!key && saeFinite(c.pose) ? SAE_GESTURE_CLIP_MILD * (c.pose - c.handTop) : 0);
      if (!best || u < best.u || (u === best.u && (v > best.v + 1e-12 || (Math.abs(v - best.v) <= 1e-12 && c.rid < best.c.rid)))) best = { c, u, v };
    }
    if (!best) return null;
    const c = best.c, usedSet = pairUsed[c.rid] || {};
    let bp = null;
    c.pairs.forEach((p, i) => {
      const reused = !!usedSet[i];
      if (reused && !opts.allowPairReuse) return;
      const keyed = !key ? 0 : p.local ? SAE_LOCAL_KEY_WEIGHT * (p.steady || 0)
        : SAE_KEY_POSE_WEIGHT * (p.pose || 0) - SAE_GESTURE_KEY * (p.gesture || 0) - (saeFinite(p.still) ? SAE_KEY_STILL_WEIGHT * p.still : 0);
      const v = p.score + keyed + SAE_PAIR_JITTER * saeHash(seed + ':pair:' + c.rid + ':' + i) - (reused ? 1000 : 0);
      if (!bp || v > bp.v + 1e-12) bp = { i, v };
    });
    return { kind: 'video', rid: c.rid, pair: c.pairs[bp.i], pairIndex: bp.i };
  };
  // Unanalysed clips (c.local) sit with the face clips (see SAE_LOCAL_HEAD); with none, these are the analysed tiers.
  const tiers = [
    k => pickVideo(c => (c.face || c.local) && (uses[c.rid] || 0) < SAE_FACE_MAX_USES, k),
    () => pickPhoto(false),
    k => pickVideo(c => !c.face && !c.local, k),
    k => pickVideo(c => c.face || c.local, k),
  ];
  for (let k = 0; k < N; k++) {
    bar = k;
    let pick = photoBar[k] ? pickPhoto(false) : null;
    for (let t = 0; !pick && t < tiers.length; t++) pick = tiers[t](k);
    if (!pick && (!vids.length || opts.allowAdjacent)) pick = pickPhoto(true);
    if (!pick) return { ok: false, bars: picks, uses, photoBars: picks.filter(x => x.kind === 'photo').length, failedAt: k };
    uses[pick.rid] = (uses[pick.rid] || 0) + 1;
    if (pick.kind === 'video') { (pairUsed[pick.rid] = pairUsed[pick.rid] || {})[pick.pairIndex] = true; photoRun = 0; } else { photoRun++; photoBars++; }
    picks.push({ bar: k, kind: pick.kind, rid: pick.rid, pair: pick.pair });
    prev = pick.rid;
  }
  return { ok: true, bars: picks, uses, photoBars: picks.filter(b => b.kind === 'photo').length };
}

// The whip strength of a cut inside bar `bar` of `bars` (SAE_WHIP_*): a bar change ('spin') SAE_WHIP_SPIN; inside
// the finale SAE_WHIP_FINALE; inside a subtle bar (odd index before the finale, bars >= SAE_WHIP_SUBTLE_MIN_BARS)
// SAE_WHIP_SUBTLE; inside any other standard bar SAE_WHIP_INNER.
function saeWhipStrength(kind, bar, bars) {
  if (kind === 'spin') return SAE_WHIP_SPIN;
  if (bar >= bars - 1) return SAE_WHIP_FINALE;
  if (bars >= SAE_WHIP_SUBTLE_MIN_BARS && bar % 2 === 1) return SAE_WHIP_SUBTLE;
  return SAE_WHIP_INNER;
}

// Whip kinds, angles and strengths for holds in order. A cut at a bar boundary is 'spin', inside a bar 'dir'; the
// first hold has cutIn 'none', the last cutOut 'none'. Cut j (between hold j and j + 1) gets angle sign * (25..35 deg),
// the sign alternating cut by cut from a seeded start, and strength saeWhipStrength (bar count = the last hold's bar
// + 1); both sides of a cut share kind, angle and strength (angleOut / whipOut of hold j = angleIn / whipIn of hold
// j + 1; a 'none' side has strength 0). `angle` repeats angleOut (angleIn on the last hold) for consumers that take
// one angle per clip.
function saeWhipKinds(holds, seed) {
  const s = String(seed == null ? 1 : seed);
  const sign0 = saeHash(s + ':angle-sign') < 0.5 ? 1 : -1;
  const bars = holds.reduce((m, h) => Math.max(m, h.bar + 1), 0);
  const cuts = [];
  for (let j = 0; j + 1 < holds.length; j++) {
    const mag = SAE_ANGLE_MIN + (SAE_ANGLE_MAX - SAE_ANGLE_MIN) * saeHash(s + ':angle:' + j);
    const kind = holds[j + 1].bar !== holds[j].bar ? 'spin' : 'dir';
    cuts.push({ kind, angle: Math.round(sign0 * (j % 2 ? -1 : 1) * mag * 10) / 10, strength: saeWhipStrength(kind, holds[j].bar, bars) });
  }
  return holds.map((h, i) => {
    const cin = i > 0 ? cuts[i - 1] : null, cout = i < cuts.length ? cuts[i] : null;
    return { ...h, cutIn: cin ? cin.kind : 'none', cutOut: cout ? cout.kind : 'none',
      angleIn: cin ? cin.angle : 0, angleOut: cout ? cout.angle : 0, angle: cout ? cout.angle : cin ? cin.angle : 0,
      whipIn: cin ? cin.strength : 0, whipOut: cout ? cout.strength : 0 };
  });
}

// Bar lines of a cue with a usable grid: { first, bar } in music seconds (downbeat.firstBar, else firstBeat; the
// manifest's firstBeat already includes any phaseBeats correction).
function saeBarGrid(cue) {
  const first = cue.downbeat && saeFinite(cue.downbeat.firstBar) ? cue.downbeat.firstBar : cue.firstBeat;
  return { first: saeFinite(first) ? first : 0, bar: 4 * 60 / cue.bpm };
}

// The range of section starts an edit of `bars` bars at editBpm fits in: sectionStart - LEAD >= 0 and the video end
// before the cue's fade-out. Returns { min, max } in music seconds (max < min when nothing fits).
function saeSectionRange(cue, bars, editBpm) {
  const end = (saeFinite(cue.durationSeconds) ? cue.durationSeconds : Infinity) - SAE_FADE_OUT;
  return { min: SAE_LEAD, max: end - saeVideoSeconds(bars, editBpm) };
}

// The default section: cue.defaultSection when the edit fits there, else the latest bar line that fits (cues without
// a usable grid: clamped to the range). null when the music is too short.
function saeDefaultSection(cue, bars, editBpm) {
  if (!cue) return null;
  const r = saeSectionRange(cue, bars, editBpm);
  if (r.max < r.min - 1e-9) return null;
  const def = cue.defaultSection;
  if (saeFinite(def) && def >= r.min - 1e-9 && def <= r.max + 1e-9) return def;
  if (saeTempo(cue).fixed) return Math.max(r.min, Math.min(r.max, saeFinite(def) ? def : r.min));
  const g = saeBarGrid(cue);
  const kMin = Math.ceil((r.min - g.first) / g.bar - 1e-9), kMax = Math.floor((r.max - g.first) / g.bar + 1e-9);
  return kMax >= kMin ? g.first + kMax * g.bar : null;
}

// Snaps a user-chosen section start to the nearest bar line (no usable grid: to a millisecond). With opts
// { bars, editBpm } it also clamps to the starts the edit fits in (null when none); without, only to >= SAE_LEAD.
function saeSnapSection(sec, cue, opts) {
  if (!cue || !saeFinite(sec)) return null;
  const fit = opts && opts.bars >= 1 && opts.editBpm > 0;
  const r = fit ? saeSectionRange(cue, opts.bars, opts.editBpm) : { min: SAE_LEAD, max: Infinity };
  if (r.max < r.min - 1e-9) return null;
  if (saeTempo(cue).fixed) return Math.max(r.min, Math.min(r.max, Math.round(sec * 1000) / 1000));
  const g = saeBarGrid(cue);
  const kMin = Math.ceil((r.min - g.first) / g.bar - 1e-9), kMax = Math.floor((r.max - g.first) / g.bar + 1e-9);
  if (kMax < kMin) return null;
  const k = Math.max(kMin, Math.min(kMax, Math.round((sec - g.first) / g.bar)));
  return g.first + k * g.bar;
}

// The whole plan. opts: { fps, bars (wanted; SAE_LENGTHS), seed (default 1), cue (manifest entry or own-music
// analysis { bpm, firstBeat, grid, downbeat?, durationSeconds, defaultSection?, onsets?, onsetThresholds? }; null = no
// music), sectionStart? (default saeDefaultSection), candidates, durations, badSpans?, photos?, usePhotos? (default
// true), margin?, motion?, stillWeight? (saeMoments: the stillness penalty, off by default), analysed?, local?,
// pickLocal? (saeMoments: clips without analysis, see SAE_LOCAL_HEAD) }.
// Tries the wanted bar count (capped so the video ends before the music's fade-out), then fewer (down to SAE_MIN_BARS)
// until the sources fill every bar under the rules; a pool too small even for that builds SAE_MIN_BARS bars with
// adjacency / pair reuse relaxed.
// Returns the plan (contract in plan.md) with ok: true, or { ok: false, notes: ['no-sources' | 'music-too-short'] }.
// With unanalysed clips in the pool the plan also has localClips (usable unanalysed clips) and localFallback (those
// planned from evenly spaced moments because no quick score was available).
// Notes: 'few-face' (fewer face clips plus unanalysed clips than video bars), 'reused' (a source fills more than one bar), 'shrunk', 'photos-early'
// (photos relaxed into bar 1 / the finale to avoid shrinking), 'fixed-tempo'
// (music without a usable beat), 'no-music', 'adjacent' / 'pair-reuse' (relaxations used).
function saePlanBuild(opts) {
  const fps = opts.fps;
  if (!(fps > 0)) throw Error('saePlanBuild needs fps');
  const wanted = Math.max(SAE_MIN_BARS, Math.floor(opts.bars || SAE_LENGTHS.short));
  const seed = opts.seed == null ? 1 : opts.seed;
  const cue = opts.cue || null;
  const tempo = saeTempo(cue);
  const editBpm = tempo.editBpm, spb = 60 / editBpm;
  // The music caps the bar count: the most bars (<= wanted) whose video ends before the cue's fade-out. Without a
  // user section, the default section of the largest bar count that has one; with one, the largest bar count that
  // still fits after it.
  let sectionStart = null, maxBars = wanted;
  if (cue) {
    maxBars = 0;
    for (let n = wanted; n >= SAE_MIN_BARS && !maxBars; n--) {
      if (saeFinite(opts.sectionStart)) {
        if (saeSectionRange(cue, n, editBpm).max >= opts.sectionStart - 1e-9) { maxBars = n; sectionStart = opts.sectionStart; }
      } else {
        const s = saeDefaultSection(cue, n, editBpm);
        if (s !== null) { maxBars = n; sectionStart = s; }
      }
    }
    if (!maxBars) return { ok: false, notes: ['music-too-short'], fit: { bars: 0, wanted } };
  }
  const snap = !!cue && tempo.fixed && !!(cue.onsets && cue.onsets.length);
  // The longest hold a moment window must cover: hold 0 (the lead + 1 beat + the music offset, at most half a frame)
  // with 2 frames for rounding, plus an onset snap's shift. Then every hold fits in [srcStart, duration - TAIL] and
  // assemble.js never slides a window back.
  const beatSeconds = spb + SAE_LEAD + 2 / fps + (snap ? SAE_SNAP_WINDOW : 0);
  const moments = saeMoments({ candidates: opts.candidates, durations: opts.durations, badSpans: opts.badSpans, fps, beatSeconds, margin: opts.margin,
    motion: opts.motion, stillWeight: opts.stillWeight, analysed: opts.analysed, local: opts.local, pickLocal: opts.pickLocal });
  const base = { clips: moments.clips, photos: opts.photos, seed, usePhotos: opts.usePhotos };
  let alloc = null, bars = 0;
  const relax = [];
  // Per bar count: the strict photo rules first, then photos from bar 1 on (no Short cap), then the finale too, before
  // shrinking; so a pool with one face clip and photos builds f0 P f0 P instead of shrinking or repeating f0
  // (notes 'photos-early').
  for (let n = maxBars; n >= SAE_MIN_BARS && !alloc; n--) {
    for (let pr = 0; pr <= 2 && !alloc; pr++) {
      const a = saeAllocate({ ...base, bars: n, photoRelax: pr });
      if (a.ok) { alloc = a; bars = n; if (pr) relax.push('photos-early'); }
    }
  }
  if (!alloc) {
    for (const r of [{ allowAdjacent: true }, { allowAdjacent: true, allowPairReuse: true }]) {
      const a = saeAllocate({ ...base, bars: SAE_MIN_BARS, photoRelax: 2, ...r });
      if (a.ok) { alloc = a; bars = SAE_MIN_BARS; relax.push('adjacent'); if (r.allowPairReuse) relax.push('pair-reuse'); break; }
    }
  }
  if (!alloc) return { ok: false, notes: ['no-sources'], fit: { bars: 0, wanted }, faceClips: moments.faceCount };
  const sched = saeSchedule({ editBpm, fps, bars, sectionStart: cue ? sectionStart : undefined, snap,
    onsets: cue && cue.onsets, onsetThresholds: cue && cue.onsetThresholds });
  // Framing per hold: photos full (A) / punch (B); face-clip videos and unanalysed (likely close-up) videos 'tight'
  // (a zoom toward the upper middle, where selfie faces sit); other videos 'full'.
  const faceRid = {};
  for (const c of moments.clips) if (c.face || c.local) faceRid[c.rid] = true;
  const raw = sched.holds.map(h => {
    const b = alloc.bars[h.bar];
    const photo = b.kind === 'photo';
    return { i: h.i, bar: h.bar, kind: b.kind, rid: b.rid, moment: h.moment,
      srcStart: photo ? 0 : (h.moment === 'A' ? b.pair.a : b.pair.b),
      frames: h.frames, startFrame: h.startFrame, endFrame: h.endFrame,
      framing: photo ? (h.moment === 'A' ? 'full' : 'punch') : faceRid[b.rid] ? 'tight' : 'full' };
  });
  const holds = saeWhipKinds(raw, seed);
  const notes = [];
  // 'few-face': fewer face clips (plus unanalysed clips, the likely close-ups) than video bars, so other clips or
  // repeats fill them (the panel's "Only N close-up clips found" note, N = faceClips, or N = faceClips + localClips
  // when unanalysed clips took part).
  if (moments.faceCount + moments.localCount < alloc.bars.filter(b => b.kind === 'video').length) notes.push('few-face');
  if (Object.keys(alloc.uses).some(r => alloc.uses[r] > 1)) notes.push('reused');
  if (bars < wanted) notes.push('shrunk');
  if (!cue) notes.push('no-music'); else if (tempo.fixed) notes.push('fixed-tempo');
  relax.forEach(r => notes.push(r));
  if (alloc.bars.some((b, k) => k >= SAE_PHOTO_RUN_MAX && alloc.bars.slice(k - SAE_PHOTO_RUN_MAX, k + 1).every(x => x.kind === 'photo'))) notes.push('photo-run');
  const plan = {
    ok: true, fps, bpm: tempo.bpm, editBpm, firstBeat: cue && saeFinite(cue.firstBeat) ? cue.firstBeat : null,
    sectionStart, musicSourceStart: sched.musicSourceStart, lead: SAE_LEAD, offset: sched.offset,
    bars, totalFrames: sched.totalFrames, holds, cuts: sched.cuts, cutSecondsRaw: sched.cutSecondsRaw, cutSeconds: sched.cutSeconds,
    beats: sched.beats, notes, fit: { bars, wanted }, faceClips: moments.faceCount, photoBars: alloc.photoBars, seed,
    snapLog: sched.snapLog,
  };
  // Only with unanalysed clips in the pool, so plans without them stay byte-identical.
  if (moments.localCount) Object.assign(plan, { localClips: moments.localCount, localFallback: moments.clips.filter(c => c.local && c.fallback && c.pairs.length).length });
  return plan;
}

if (typeof module !== 'undefined' && module && module.exports) {
  Object.assign(module.exports, {
    SAE_LEAD, SAE_END_TAIL, SAE_STANDARD_BAR, SAE_FINALE_BAR, SAE_LENGTHS, SAE_MIN_BARS, SAE_FIXED_BPM, SAE_FACE_MARGIN,
    SAE_FACE_ROLES, SAE_FACE_MAX_USES, SAE_SOURCE_TAIL, SAE_HEAD_FRAMES, SAE_PAIR_GAP, SAE_FADE_OUT, SAE_PHOTO_SHARE, SAE_PHOTO_RUN_MAX, SAE_SNAP_WINDOW,
    SAE_MIN_HOLD_FRAMES, SAE_ANGLE_MIN, SAE_ANGLE_MAX, SAE_WHIP_SPIN, SAE_WHIP_INNER, SAE_WHIP_SUBTLE, SAE_WHIP_FINALE, SAE_WHIP_SUBTLE_MIN_BARS, SAE_STILL_WEIGHT, SAE_STILL_FLOOR, SAE_STILL_COST_MAX, SAE_STILL_MINIMA,
    SAE_LOCAL_HEAD, SAE_LOCAL_MAX_WINDOWS, SAE_LOCAL_SEP_BONUS, SAE_LOCAL_KEY_WEIGHT, saeLocalClip, saeLocalNorm,
    SAE_PAIR_ROLE_BONUS, SAE_PAIR_SEP, SAE_PAIR_SEP_BONUS, SAE_ROLE_TOP, SAE_ROLE_NEAR, SAE_GESTURE_MARGIN, SAE_GESTURE_MILD, SAE_GESTURE_KEY, SAE_KEY_POSE_WEIGHT, SAE_KEY_STILL_WEIGHT, SAE_KEY_JITTER, SAE_GESTURE_CLIP_MILD, SAE_PHOTO_FIRST_BAR, SAE_PHOTO_SHORT_BARS, SAE_PHOTO_SHORT_MAX, SAE_PHOTO_SHORT_FACES,
    saeStillCost, saeHash, saeEditBpm, saeTempo, saeVideoSeconds, saeMusicOffset, saeTemplate, saeSchedule, saeMoments, saePhotoBars,
    saeAllocate, saeWhipStrength, saeWhipKinds, saeBarGrid, saeSectionRange, saeDefaultSection, saeSnapSection, saePlanBuild,
  });
}
