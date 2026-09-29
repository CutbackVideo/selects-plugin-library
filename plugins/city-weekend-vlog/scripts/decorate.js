const cfg = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
const TITLE_LABEL = 'City Weekend title', WARM_LABEL = 'Warm look';
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing.
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
const committed = !hasTitle || effects > 0;
if (committed) await d.commitAll('City Weekend Vlog: title and look');
return { title: true, titleAdded: !hasTitle, effects, effectsKept, committed };
