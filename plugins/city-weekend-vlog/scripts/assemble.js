const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const d = await p.createDraft({ name: cfg.draftName });
const notes = [];
await d.setFrameSize({ width: 1080, height: 1920 });
const fps = (await d.meta()).fps;
const main = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
let endFrame = 0;
for (let i = 0; i < cfg.picks.length; i++) {
  const pick = cfg.picks[i];
  // Aim each clip's end at its planned boundary frame at the Draft's real rate so rounding never drifts.
  const want = Math.round(cfg.boundaries[i + 1] * fps) - endFrame;
  const end = pick.startSeconds + want / fps;
  await d.insertResource({ resourceId: pick.rid, sourceRange: { startSeconds: pick.startSeconds, endSeconds: end } });
  endFrame = (await main()).reduce((a, c) => Math.max(a, c.endFrame), 0);
}
const rows = await main();
for (let i = 0; i < rows.length; i++) {
  const size = cfg.crops[rows[i].resourceId];
  if (!size || !size.width || !size.height) continue;
  const W = 1080, H = 1920;
  const fit = Math.min(W / size.width, H / size.height), fill = Math.max(W / size.width, H / size.height);
  const scale = fill / fit;
  if (scale <= 1.001) continue;
  const clip = (await main())[i];
  await d.setClipTransform({ clip, scale: { x: scale, y: scale }, position: { x: 0, y: 0 } });
}
// Muting the clips' own sound needs the saved Draft's audio inventory, so decorate.js does it after this commit.
if (cfg.music) {
  const audioBefore = new Set((await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'audio').map(c => c.clipId));
  await d.overlayResource({ resource: p.resource(cfg.music.resourceId), over: await d.rangeAtFrames(0, endFrame), sourceStartSeconds: cfg.music.sectionStart });
  // Find the clip the overlay just created: new audio clips only, preferring the music resource.
  const added = (await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'audio' && !audioBefore.has(c.clipId));
  const music = added.find(c => c.resourceId === cfg.music.resourceId) || added[0];
  if (music) await d.setClipAudio({ clip: music, fadeInSeconds: 0, fadeOutSeconds: 0.12 });
  else notes.push('music fade not applied');
}
const commit = await d.commitAll('City Weekend Vlog: assemble');
return { sequenceId: commit.createdDraftId, fps, totalFrames: endFrame, placed: rows.length, notes };
