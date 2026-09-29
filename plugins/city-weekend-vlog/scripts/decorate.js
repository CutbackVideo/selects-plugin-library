const cfg = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
const TITLE_LABEL = 'City Weekend title', WARM_LABEL = 'Warm look';
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing.
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.mute) {
  const main = (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
  if (main.every(c => Array.isArray(c.audioSourceIndexes) && c.audioSourceIndexes.length === 0)) muteKept = true;
  else {
    const end = main.reduce((a, c) => Math.max(a, c.endFrame), 0);
    try { await d.setAudioTracks({ target: await d.rangeAtFrames(0, end), audioSourceIndexes: [] }); muted = true; }
    catch (e) { throw Error('Could not mute the clips\' own sound: ' + (e && e.message || e)); }
  }
}
const hasTitle = (await d.motionGraphics()).some(g => g.name === TITLE_LABEL);
if (!hasTitle) await d.addMotionGraphic({ within: await d.rangeAtFrames(0, cfg.titleEnd), label: TITLE_LABEL, tsxCode: cfg.title.tsx, parameters: cfg.title.parameters, editableParameters: cfg.title.editableParameters });
let effects = 0, effectsKept = 0;
if (cfg.warm) {
  const ids = (await d.clips({ trackScope: 'all' })).filter(c => (c.trackKind === 'main' || c.trackKind === 'video') && c.resourceId !== null).map(c => c.clipId);
  for (const id of ids) {
    const clip = (await d.clips({ trackScope: 'all' })).find(c => c.clipId === id);
    if (!clip) continue;
    if ((await d.videoEffects(clip)).some(e => e.name === WARM_LABEL || e.effectName === WARM_LABEL)) { effectsKept++; continue; }
    await d.addVideoEffect({ clip, label: WARM_LABEL, tsxCode: cfg.warm.tsx, parameters: { strength: cfg.warm.strength }, editableParameters: [{ key: 'strength', label: 'Warmth', type: 'number', defaultValue: cfg.warm.strength, min: 0, max: 1, step: 0.05 }] });
    effects++;
  }
}
const committed = muted || !hasTitle || effects > 0;
if (committed) await d.commitAll('City Weekend Vlog: title and look');
return { title: true, titleAdded: !hasTitle, effects, effectsKept, muted, muteKept, committed };
