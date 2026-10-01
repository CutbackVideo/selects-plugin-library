const cfg = __CONFIG__;
if (!(cfg.videoEnd > 0)) throw Error('decorate: cfg.videoEnd missing');
const d = selects.draft(cfg.sequenceId);
const TITLE_LABEL = 'Mini vlog title', SOFT_LABEL = 'Soft look', MOTION_LABEL = 'Photo motion', PUNCH_LABEL = 'Beat punch';
// Inspector (Adjust) labels in the panel's UI language at Build (cfg.labels), English without them. The effect and
// graphic names above stay English: a retry and the readback recognise what is already there by them.
const LABELS = { motion: 'Motion', motionStrength: 'Motion strength', punch: 'Punch', softness: 'Softness', ...(cfg.labels || {}) };
// Photo resource ids in this Draft. Photos have no sound, so their audio routing stays null after muting.
const photoIds = new Set(cfg.photos || []);
// Effects on photo clips (Soft look and motion) only when cfg.photoEffects is exactly true. Export renders them; Draft.captureFrames
// cannot render a frame with an effect on an image clip, so never preview such frames with it.
const photoEffects = cfg.photoEffects === true;
const hasEffect = async (clip, label) => (await d.videoEffects(clip)).some(e => e.name === label || e.effectName === label);
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing.
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.mute) {
  const main = (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
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
const hasTitle = (await d.motionGraphics()).some(g => g.name === TITLE_LABEL);
// The title lockup spans the whole video, [0, cfg.videoEnd).
if (!hasTitle) await d.addMotionGraphic({ within: await d.rangeAtFrames(0, cfg.videoEnd), label: TITLE_LABEL, tsxCode: cfg.title.tsx, parameters: cfg.title.parameters, editableParameters: cfg.title.editableParameters });
// Photo motion: each montage photo in cfg.motion.byRid ({ motion, direction, axis, cover }, chosen by the planner)
// gets one eased move, wherever it sits (the title covers the whole video, so it restricts nothing). A clip that
// already has a motion effect keeps it.
let motions = 0, motionsKept = 0, photoEffectsSkipped = 0;
if (cfg.motion && photoEffects) {
  const fps = (await d.meta()).fps;
  const byRid = cfg.motion.byRid || {};
  const ids = (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null && photoIds.has(c.resourceId) && byRid[c.resourceId]).map(c => c.clipId);
  for (const id of ids) {
    const clip = (await d.clips({ trackScope: 'main' })).find(c => c.clipId === id);
    if (!clip) continue;
    if (await hasEffect(clip, MOTION_LABEL)) { motionsKept++; continue; }
    const m = byRid[clip.resourceId];
    const holdSeconds = Math.round((clip.endFrame - clip.startFrame) / fps * 1000) / 1000;
    await d.addVideoEffect({ clip, label: MOTION_LABEL, tsxCode: cfg.motion.tsx,
      parameters: { motion: m.motion, strength: cfg.motion.strength, direction: m.direction, axis: m.axis, cover: m.cover || 1, holdSeconds },
      editableParameters: [
        { key: 'motion', label: LABELS.motion, type: 'select', defaultValue: m.motion, options: cfg.motion.options },
        { key: 'strength', label: LABELS.motionStrength, type: 'number', defaultValue: cfg.motion.strength, min: 0, max: 2, step: 0.1 }] });
    motions++;
  }
}
// Beat punch (spec 15.2 b/c): every video clip on Main gets one "Beat punch" effect (photos keep Photo motion only),
// added before the Soft look so the look wraps it. cfg.punch: { tsx, strength, push, beatFrames, punchFrames, picks }.
// picks are the picks assemble.js placed, in order: Main clip i is picks[i]; a clip whose resource differs from its pick
// is skipped, never guessed. punchFrames are Draft frames where a punch starts (strong beats, music offset included);
// each clip keeps those less than half a beat before its start (the tail of a punch just before the cut) to its end, made
// clip-local. The effect's frame counts from the clip's source in-point, recomputed here with assemble.js's expression
// (the planned start, slid back so the window ends inside its source).
let punchAdded = 0, punchKept = 0, punchSkipped = 0;
if (cfg.punch) {
  const fps = (await d.meta()).fps;
  const picks = cfg.punch.picks || [], beat = Number(cfg.punch.beatFrames) || 0;
  const frames = (cfg.punch.punchFrames || []).filter(f => typeof f === 'number' && isFinite(f));
  const rows = (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null).sort((a, b) => a.startFrame - b.startFrame);
  for (let i = 0; i < rows.length; i++) {
    const pick = picks[i];
    if (!pick || pick.rid !== rows[i].resourceId) { punchSkipped++; continue; }
    if (pick.kind === 'photo' || photoIds.has(rows[i].resourceId)) continue;
    const clip = (await d.clips({ trackScope: 'main' })).find(c => c.clipId === rows[i].clipId);
    if (!clip) { punchSkipped++; continue; }
    if (await hasEffect(clip, PUNCH_LABEL)) { punchKept++; continue; }
    const want = clip.endFrame - clip.startFrame;
    const cap = pick.sourceDuration > 0 ? Math.floor(pick.sourceDuration * fps + 1e-6) - want : Infinity;
    const sourceStartFrame = Math.max(0, Math.min(Math.round((Number(pick.startSeconds) || 0) * fps), cap));
    const punches = frames.map(f => f - clip.startFrame).filter(t => t > -0.5 * beat && t < want);
    await d.addVideoEffect({ clip, label: PUNCH_LABEL, tsxCode: cfg.punch.tsx,
      parameters: { strength: cfg.punch.strength, push: cfg.punch.push, punches, beatFrames: beat, sourceStartFrame, durationFrames: want },
      editableParameters: [{ key: 'strength', label: LABELS.punch, type: 'number', defaultValue: cfg.punch.strength, min: 0, max: 1, step: 0.05 }] });
    punchAdded++;
  }
}
let effects = 0, effectsKept = 0;
// Soft look: every Main and video-track clip (photos only with photoEffects), stacked after any photo motion.
if (cfg.soft) {
  const ids = (await d.clips({ trackScope: 'all' })).filter(c => (c.trackKind === 'main' || c.trackKind === 'video') && c.resourceId !== null).map(c => c.clipId);
  for (const id of ids) {
    const clip = (await d.clips({ trackScope: 'all' })).find(c => c.clipId === id);
    if (!clip) continue;
    if (photoIds.has(clip.resourceId) && !photoEffects) { photoEffectsSkipped++; continue; }
    if (await hasEffect(clip, SOFT_LABEL)) { effectsKept++; continue; }
    await d.addVideoEffect({ clip, label: SOFT_LABEL, tsxCode: cfg.soft.tsx, parameters: { strength: cfg.soft.strength }, editableParameters: [{ key: 'strength', label: LABELS.softness, type: 'number', defaultValue: cfg.soft.strength, min: 0, max: 1, step: 0.05 }] });
    effects++;
  }
}
// Commit only when this run added or changed something: commitAll rejects an empty change ("Nothing to stage"), which a
// retry after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
const committed = muted || !hasTitle || effects > 0 || motions > 0 || punchAdded > 0;
if (committed) await d.commitAll('Mini Vlog: title and look');
// Built in one literal (run_script type-checks the script, so no properties are added after the fact).
const out = { title: true, titleAdded: !hasTitle, effects, effectsKept, muted, muteKept, committed, alreadyDone: !committed,
  ...(cfg.punch ? { punch: { added: punchAdded, kept: punchKept, skipped: punchSkipped } } : {}) };
return photoIds.size ? { ...out, photos: { motions, motionsKept, effectsSkipped: photoEffectsSkipped } } : out;
