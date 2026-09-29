const cfg = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
await d.addMotionGraphic({ within: await d.rangeAtFrames(0, cfg.titleEnd), label: 'City Weekend title', tsxCode: cfg.title.tsx, parameters: cfg.title.parameters, editableParameters: cfg.title.editableParameters });
let effects = 0;
if (cfg.warm) {
  const ids = (await d.clips({ trackScope: 'all' })).filter(c => (c.trackKind === 'main' || c.trackKind === 'video') && c.resourceId !== null).map(c => c.clipId);
  for (const id of ids) {
    const clip = (await d.clips({ trackScope: 'all' })).find(c => c.clipId === id);
    if (!clip) continue;
    await d.addVideoEffect({ clip, label: 'Warm look', tsxCode: cfg.warm.tsx, parameters: { strength: cfg.warm.strength }, editableParameters: [{ key: 'strength', label: 'Warmth', type: 'number', defaultValue: cfg.warm.strength, min: 0, max: 1, step: 0.05 }] });
    effects++;
  }
}
await d.commitAll('City Weekend Vlog: title and look');
return { title: true, effects };
