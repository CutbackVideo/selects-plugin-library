const cfg = __CONFIG__;
if (!(cfg.videoEnd > 0)) throw Error('decorate: cfg.videoEnd missing');
const d = selects.draft(cfg.sequenceId);
// Graphic and effect names: a retry and the readback recognise what is already there by them, so they stay English.
const TITLE_LABEL = 'Archive title', CREDIT_LABEL = 'Archived credit', LETTERBOX_LABEL = 'Letterbox reveal', LOOK_LABEL = 'Cinematic look';
const FADE_LABEL = 'Fade out', MOTION_LABEL = 'Photo motion', SHOT_MOTION_LABEL = 'Shot motion';
const OUR_EFFECTS = [LETTERBOX_LABEL, LOOK_LABEL, FADE_LABEL, MOTION_LABEL, SHOT_MOTION_LABEL];
// Inspector (Adjust) labels in the panel's UI language at Build (cfg.adjustLabels), English without them. The title and
// credit Adjust items come ready-made from the panel (cfg.title / cfg.credit editableParameters).
const LABELS = { motion: 'Motion', motionStrength: 'Motion strength', reveal: 'Reveal', letterbox: 'Letterbox reveal', look: 'Look strength',
  warmth: 'Warmth', fade: 'Fade out', ...(cfg.adjustLabels || {}) };
const num = (v, fallback) => (typeof v === 'number' && isFinite(v) ? v : fallback);
// Photo resource ids in this Draft. Photos have no sound, so their audio routing stays null after muting.
const photoIds = new Set(cfg.photos || []);
// Effects on photo clips (every kind: motion, letterbox, fade, look) only when cfg.photoEffects is exactly true. Export
// renders them; Draft.captureFrames cannot render a frame with an effect on an image clip, so never preview such frames.
const photoEffects = cfg.photoEffects === true;
// The Main clips in timeline order: clip 0 is the opening shot, clip 1 the credit shot, the last one the final shot.
const mainClips = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null).sort((a, b) => a.startFrame - b.startFrame);
// Re-read a clip by id before each edit: an edit makes earlier rows stale.
const clipById = async id => (await d.clips({ trackScope: 'all' })).find(c => c.clipId === id);
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing (by name).
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.mute) {
  const main = await mainClips();
  const videos = main.filter(c => !photoIds.has(c.resourceId));
  if (videos.every(c => Array.isArray(c.audioSourceIndexes) && c.audioSourceIndexes.length === 0)) muteKept = true;
  else {
    const end = main.reduce((a, c) => Math.max(a, c.endFrame), 0);
    // Clips whose source has no audio stream keep null routing after muting, so the check above cannot see a finished
    // mute on them. The EditDiff decides: opCount 0 means already muted or nothing to mute (an all-silent Draft).
    let diff;
    try { diff = await d.setAudioTracks({ target: await d.rangeAtFrames(0, end), audioSourceIndexes: [] }); }
    catch (e) { throw Error('Could not mute the clips\' own sound: ' + (e && e.message || e)); }
    if (diff && diff.opCount === 0) muteKept = true; else muted = true;
  }
}
const rows = await mainClips();
if (!rows.length) throw Error('decorate: the Draft has no clips');
const fps = (await d.meta()).fps;
const graphics = (await d.motionGraphics()).map(g => g.name);
// Title lockup within the opening shot's range (clip 0, from frame 0); its timing (parameters.timing) comes from the
// panel (planner avOpeningTiming of the opening's length). The credit sits within the credit shot (clip 1).
let titleAdded = false, creditAdded = false;
if (cfg.title && !graphics.includes(TITLE_LABEL)) {
  await d.addMotionGraphic({ within: await d.rangeAtFrames(rows[0].startFrame, rows[0].endFrame), label: TITLE_LABEL, tsxCode: cfg.title.tsx, parameters: cfg.title.parameters, editableParameters: cfg.title.editableParameters });
  titleAdded = true;
}
if (cfg.credit && rows.length > 1 && !graphics.includes(CREDIT_LABEL)) {
  await d.addMotionGraphic({ within: await d.rangeAtFrames(rows[1].startFrame, rows[1].endFrame), label: CREDIT_LABEL, tsxCode: cfg.credit.tsx, parameters: cfg.credit.parameters, editableParameters: cfg.credit.editableParameters });
  creditAdded = true;
}
// Effects, one pass per clip in this order (each call appends to the clip's stack): Photo motion (photos) or Shot motion
// (video clips but the opening, which has the reveal) -> Letterbox reveal (clip 0) / Fade out (the last clip; a one-clip
// Draft gets both, reveal first) -> Cinematic look last, so the grade wraps the move and the black.
let letterbox = 0, fades = 0, effects = 0, effectsKept = 0, motions = 0, videoMotions = 0, photoEffectsSkipped = 0;
const motion = cfg.motion || null, video = motion && motion.video ? motion.video : null;
const motionEditable = (value, strength) => [
  { key: 'motion', label: LABELS.motion, type: 'select', defaultValue: value, options: motion.options },
  { key: 'strength', label: LABELS.motionStrength, type: 'number', defaultValue: strength, min: 0, max: 2, step: 0.1 }];
const addEffect = async (id, have, label, tsxCode, parameters, editableParameters) => {
  if (have.includes(label)) { effectsKept++; return false; }
  const clip = await clipById(id);
  if (!clip) return false;
  await d.addVideoEffect({ clip, label, tsxCode, parameters, editableParameters });
  return true;
};
const lookOn = async (id, have) => {
  if (!cfg.look) return;
  const strength = num(cfg.look.strength, 0.3), warmth = num(cfg.look.warmth, 1);
  if (await addEffect(id, have, LOOK_LABEL, cfg.look.tsx, { strength, warmth }, [
    { key: 'strength', label: LABELS.look, type: 'number', defaultValue: strength, min: 0, max: 1, step: 0.05 },
    { key: 'warmth', label: LABELS.warmth, type: 'number', defaultValue: warmth, min: 0, max: 2, step: 0.1 }])) effects++;
};
for (let i = 0; i < rows.length; i++) {
  const row = rows[i], id = row.clipId, photo = photoIds.has(row.resourceId);
  if (photo && !photoEffects) { photoEffectsSkipped++; continue; }
  // The rows above predate this run's edits: read the clip again before reading its effects.
  const now = await clipById(id);
  if (!now) continue;
  const have = (await d.videoEffects(now)).flatMap(e => [e.name, e.effectName]).filter(n => OUR_EFFECTS.includes(n));
  const holdSeconds = Math.round((row.endFrame - row.startFrame) / fps * 1000) / 1000;
  const m = photo ? (motion && motion.byRid && motion.byRid[row.resourceId]) : (i > 0 && video && video.byIndex ? video.byIndex[String(i)] : null);
  if (m && photo) {
    if (await addEffect(id, have, MOTION_LABEL, motion.tsx,
      { motion: m.motion, strength: motion.strength, direction: m.direction, axis: m.axis, cover: m.cover || 1, holdSeconds },
      motionEditable(m.motion, motion.strength))) motions++;
  } else if (m) {
    const strength = num(video.strength, 0.5);
    if (await addEffect(id, have, SHOT_MOTION_LABEL, motion.tsx,
      { motion: m.motion, strength, direction: m.direction, axis: m.axis, cover: 1, holdSeconds },
      motionEditable(m.motion, strength))) videoMotions++;
  }
  if (i === 0 && cfg.letterbox) {
    const lp = cfg.letterbox.parameters || {};
    const revealSeconds = num(lp.revealSeconds, num(lp.revealEnd, 2.3) - num(lp.revealStart, 0.22));
    if (await addEffect(id, have, LETTERBOX_LABEL, cfg.letterbox.tsx, { ...lp, revealSeconds, enabled: lp.enabled !== false }, [
      { key: 'revealSeconds', label: LABELS.reveal, type: 'number', defaultValue: Math.round(revealSeconds * 100) / 100, min: 0, max: 5, step: 0.05 },
      { key: 'enabled', label: LABELS.letterbox, type: 'boolean', defaultValue: lp.enabled !== false }])) letterbox++;
  }
  if (i === rows.length - 1 && cfg.fade) {
    // The effect counts the clip's own frames: its last frame is fully black.
    const fadeSeconds = num(cfg.fade.fadeSeconds, 1);
    if (await addEffect(id, have, FADE_LABEL, cfg.fade.tsx, { durationFrames: row.endFrame - row.startFrame, fadeSeconds }, [
      { key: 'fadeSeconds', label: LABELS.fade, type: 'number', defaultValue: fadeSeconds, min: 0, max: 3, step: 0.1 }])) fades++;
  }
  await lookOn(id, have);
}
// Cinematic look also on clips placed on other video tracks (none in a fresh Build; a user's B-roll on a retry).
if (cfg.look) {
  const others = (await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'video' && c.resourceId !== null).map(c => c.clipId);
  for (const id of others) {
    const c = await clipById(id);
    if (!c) continue;
    if (photoIds.has(c.resourceId) && !photoEffects) { photoEffectsSkipped++; continue; }
    await lookOn(id, (await d.videoEffects(c)).flatMap(e => [e.name, e.effectName]));
  }
}
// Commit only when this run added or changed something: commitAll rejects an empty change ("Nothing to stage"), which a
// retry after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
// effects counts the Cinematic looks added; effectsKept every effect of ours (any name above) already there.
const committed = muted || titleAdded || creditAdded || letterbox + fades + effects + motions + videoMotions > 0;
if (committed) await d.commitAll('Archive Vlog: title and look');
// Built in one literal (run_script type-checks the script, so no properties are added after the fact).
return { titleAdded, creditAdded, letterbox, fades, effects, effectsKept, motions, videoMotions, muted, muteKept, committed, alreadyDone: !committed, photoEffectsSkipped };
