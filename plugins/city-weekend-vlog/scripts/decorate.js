const cfg = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
const TITLE_LABEL = 'City Weekend title', WARM_LABEL = 'Warm look', MOTION_LABEL = 'Photo motion';
// Photo resource ids in this Draft. Photos have no sound, so their audio routing stays null after muting.
const photoIds = new Set(cfg.photos || []);
// Effects on photo clips (warm look and motion) when cfg.photoEffects is true. Export renders them; Draft.captureFrames
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
if (!hasTitle) await d.addMotionGraphic({ within: await d.rangeAtFrames(0, cfg.titleEnd), label: TITLE_LABEL, tsxCode: cfg.title.tsx, parameters: cfg.title.parameters, editableParameters: cfg.title.editableParameters });
// Photo motion: each montage photo in cfg.motion.byRid ({ motion, direction, axis, cover }, chosen by the planner)
// gets one eased move; photos in the title stay still. A clip that already has a motion effect keeps it.
let motions = 0, motionsKept = 0, photoEffectsSkipped = 0;
if (cfg.motion && photoEffects) {
  const fps = (await d.meta()).fps;
  const byRid = cfg.motion.byRid || {};
  const ids = (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null && photoIds.has(c.resourceId) && byRid[c.resourceId] && c.startFrame >= cfg.titleEnd).map(c => c.clipId);
  for (const id of ids) {
    const clip = (await d.clips({ trackScope: 'main' })).find(c => c.clipId === id);
    if (!clip) continue;
    if (await hasEffect(clip, MOTION_LABEL)) { motionsKept++; continue; }
    const m = byRid[clip.resourceId];
    const holdSeconds = Math.round((clip.endFrame - clip.startFrame) / fps * 1000) / 1000;
    await d.addVideoEffect({ clip, label: MOTION_LABEL, tsxCode: cfg.motion.tsx,
      parameters: { motion: m.motion, strength: cfg.motion.strength, direction: m.direction, axis: m.axis, cover: m.cover || 1, holdSeconds },
      editableParameters: [
        { key: 'motion', label: 'Motion', type: 'select', defaultValue: m.motion, options: cfg.motion.options },
        { key: 'strength', label: 'Motion strength', type: 'number', defaultValue: cfg.motion.strength, min: 0, max: 2, step: 0.1 }] });
    motions++;
  }
}
let effects = 0, effectsKept = 0;
if (cfg.warm) {
  const ids = (await d.clips({ trackScope: 'all' })).filter(c => (c.trackKind === 'main' || c.trackKind === 'video') && c.resourceId !== null).map(c => c.clipId);
  for (const id of ids) {
    const clip = (await d.clips({ trackScope: 'all' })).find(c => c.clipId === id);
    if (!clip) continue;
    if (photoIds.has(clip.resourceId) && !photoEffects) { photoEffectsSkipped++; continue; }
    if (await hasEffect(clip, WARM_LABEL)) { effectsKept++; continue; }
    await d.addVideoEffect({ clip, label: WARM_LABEL, tsxCode: cfg.warm.tsx, parameters: { strength: cfg.warm.strength }, editableParameters: [{ key: 'strength', label: 'Warmth', type: 'number', defaultValue: cfg.warm.strength, min: 0, max: 1, step: 0.05 }] });
    effects++;
  }
}
// Commit only when this run added or changed something: commitAll rejects an empty change ("Nothing to stage"), which a
// retry after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
const committed = muted || !hasTitle || effects > 0 || motions > 0;
if (committed) await d.commitAll('City Weekend Vlog: title and look');
const out = { title: true, titleAdded: !hasTitle, effects, effectsKept, muted, muteKept, committed, alreadyDone: !committed };
return photoIds.size ? { ...out, photos: { motions, motionsKept, effectsSkipped: photoEffectsSkipped } } : out;
