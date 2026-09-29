const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const d = await p.createDraft({ name: cfg.draftName });
const notes = [];
const W = 1080, H = 1920;
await d.setFrameSize({ width: W, height: H });
let fps = (await d.meta()).fps;
const main = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
let endFrame = 0;
for (let i = 0; i < cfg.picks.length; i++) {
  const pick = cfg.picks[i];
  // Aim each clip's end at its planned boundary frame at the Draft's real rate so rounding never drifts.
  const want = Math.round(cfg.boundaries[i + 1] * fps) - endFrame;
  // A photo holds for the slot from the start of its (5 s) image source.
  const start = pick.kind === 'photo' ? 0 : pick.startSeconds;
  await d.insertResource({ resourceId: pick.rid, sourceRange: { startSeconds: start, endSeconds: start + want / fps } });
  endFrame = (await main()).reduce((a, c) => Math.max(a, c.endFrame), 0);
  // The first clip sets the Draft's rate; later boundaries use it.
  if (i === 0) fps = (await d.meta()).fps;
}
// A new Draft adopts its first clip's frame size on the first insert, so the 9:16 canvas is set again afterwards.
const size0 = (await d.meta()).frameSize;
if (size0.width !== W || size0.height !== H) await d.setFrameSize({ width: W, height: H });
// Photo sizes the inventory could not measure: an unsaved scratch Draft adopts the photo's frame size.
const crops = Object.assign({}, cfg.crops);
for (const pick of cfg.picks) {
  const size = crops[pick.rid];
  if (pick.kind !== 'photo' || (size && size.width > 0 && size.height > 0)) continue;
  try {
    const scratch = await p.createDraft({ name: 'City Weekend Vlog size check' });
    await scratch.insertResource({ resourceId: pick.rid, sourceRange: { startSeconds: 0, endSeconds: 0.5 } });
    crops[pick.rid] = (await scratch.meta()).frameSize;
  } catch (e) { notes.push('a photo could not be measured, so it may show bars'); }
}
const rows = await main();
for (let i = 0; i < rows.length; i++) {
  const size = crops[rows[i].resourceId];
  if (!size || !size.width || !size.height) continue;
  // Clips are conformed to fit the canvas; scaling by fill/fit makes them cover it with a centre crop.
  const fit = Math.min(W / size.width, H / size.height), fill = Math.max(W / size.width, H / size.height);
  const scale = fill / fit;
  if (scale <= 1.001) continue;
  const clip = (await main())[i];
  await d.setClipTransform({ clip, scale: { x: scale, y: scale }, position: { x: 0, y: 0 } });
}
// Clip sound: 'ambient' keeps the clips' own sound under the music at cfg.ambientDb (default -18 dB), 'full' leaves
// it at 0 dB, and 'off' mutes it in decorate.js after this commit (muting needs the saved Draft's audio inventory).
// Photos have no sound and are skipped. A clip whose level cannot be set keeps full sound and is reported in notes.
let ambientClips = 0;
if (cfg.clipSound === 'ambient') {
  const db = typeof cfg.ambientDb === 'number' ? cfg.ambientDb : -18;
  const photoRids = new Set(cfg.picks.filter(k => k.kind === 'photo').map(k => k.rid));
  let failed = 0;
  const count = (await main()).length;
  for (let i = 0; i < count; i++) {
    // Re-read each time: a sound edit makes earlier rows stale.
    const clip = (await main())[i];
    if (!clip || photoRids.has(clip.resourceId)) continue;
    try { await d.setClipAudio({ clip, volumeDb: db }); ambientClips++; } catch (e) { failed++; }
  }
  if (failed) notes.push('the sound of ' + failed + (failed === 1 ? ' clip' : ' clips') + ' could not be lowered under the music');
}
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
return { sequenceId: commit.createdDraftId, fps, totalFrames: endFrame, placed: rows.length, ambientClips, notes };
