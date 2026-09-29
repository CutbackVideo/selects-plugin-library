// Torn Paper Love, commit 2 (idempotent): Off muting, one "Torn photo" effect per Main clip, the "Ransom letters" graphic.
// cfg (JSON):
// {
//   sequenceId, mute: boolean,            // mute = clip sound Off
//   photos: string[],                     // photo resource ids (no sound: their routing stays null after muting)
//   torn: {
//     tsx, editable: EditableParameterDefinition[],
//     clips: [{ rid, sourceStartSeconds, data }]   // 2N entries in Main order; sourceStartSeconds = the clip's source
//                                                  // start (0 for photos); data = the effect's data without
//                                                  // holdFrames/originFrame (filled in here from the Draft)
//   },
//   letters: { tsx, parameters, editable: EditableParameterDefinition[], startFrame, endFrame }
// }
// returns { effects, effectsKept, lettersAdded, muted, muteKept, committed, alreadyDone }
const cfg = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
const TORN_LABEL = 'Torn photo', LETTERS_LABEL = 'Ransom letters';
const photoIds = new Set(cfg.photos || []);
const tornClips = cfg.torn.clips;
const mainRows = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
const hasEffect = async (clip, label) => (await d.videoEffects(clip)).some(e => e.name === label || e.effectName === label);
// ClipInfo has no source start, so each effect's data comes from the config by Main position. Decorate never changes
// Main, so a mismatch means the config is stale for this Draft: stop before any change.
const ids = (await mainRows()).map(c => ({ clipId: c.clipId, rid: c.resourceId }));
if (ids.length !== tornClips.length || ids.some((c, i) => c.rid !== tornClips[i].rid)) {
  throw Error('decorate: the Draft\'s ' + ids.length + ' pictures don\'t match the ' + tornClips.length + ' planned ones');
}
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing.
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.mute) {
  const main = await mainRows();
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
// One Torn photo per Main clip. holdFrames = the clip's length on the timeline; originFrame = its source start in
// Draft frames (0 for photos), used when the effect clock turns out to be source time (spec 15.2).
const fps = (await d.meta()).fps;
let effects = 0, effectsKept = 0;
for (let i = 0; i < ids.length; i++) {
  // Re-read each time: an edit makes earlier rows stale.
  const clip = (await mainRows()).find(c => c.clipId === ids[i].clipId);
  if (!clip) continue;
  if (await hasEffect(clip, TORN_LABEL)) { effectsKept++; continue; }
  const entry = tornClips[i];
  const originFrame = photoIds.has(clip.resourceId) ? 0 : Math.round((entry.sourceStartSeconds || 0) * fps);
  await d.addVideoEffect({ clip, label: TORN_LABEL, tsxCode: cfg.torn.tsx,
    parameters: { ...entry.data, holdFrames: clip.endFrame - clip.startFrame, originFrame },
    // JSON-inlined definitions widen their literal `type`; cast for run_script's type check.
    // Each clip's Inspector shows its own values (tear seed, tilt, look) as the defaults.
    editableParameters: /** @type {any} */ (cfg.torn.editable.map(e => (e.key in entry.data ? { ...e, defaultValue: entry.data[e.key] } : e))) });
  effects++;
}
const lettersFound = (await d.motionGraphics()).some(g => g.name === LETTERS_LABEL);
if (!lettersFound) {
  await d.addMotionGraphic({ within: await d.rangeAtFrames(cfg.letters.startFrame, cfg.letters.endFrame), label: LETTERS_LABEL,
    tsxCode: cfg.letters.tsx, parameters: /** @type {any} */ (cfg.letters.parameters), editableParameters: /** @type {any} */ (cfg.letters.editable) });
}
// Commit only when this run added or changed something: commitAll rejects an empty change ("Nothing to stage"), which a
// retry after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
const committed = muted || !lettersFound || effects > 0;
if (committed) await d.commitAll('Torn Paper Love: letters and paper');
return { effects, effectsKept, lettersAdded: !lettersFound, muted, muteKept, committed, alreadyDone: !committed };
