const cfg = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
const GRAPHIC_LABEL = 'THE END credits', LOOK_LABEL = 'Cinematic look', FRAME_LABEL = 'Shot frame';
// cfg is the frozen build record plus the programs: graphic {tsx, parameters, editableParameters}, frame {tsx},
// look {tsx, strength, on}, photoMotion {byRid: {rid: {motion, direction, axis}}}. Every clock comes from cfg.frames
// (assemble.js), never from seconds. The Shot frame and look Inspector definitions are built here, per clip.
// Optional keys are read through `opt`: a config inlined as a JSON literal has no type for keys it lacks.
const opt: any = cfg;
const classic = cfg.layout !== 'full';
const WINDOWS = { classic: { x: 50.73, y: 12.69, w: 42.6 }, full: { x: 0, y: 0, w: 100 } };
const win = opt.window || (classic ? WINDOWS.classic : WINDOWS.full);
const fades = opt.fades || {};
const fadeIn = typeof fades.inSec === 'number' ? fades.inSec : 0.5;
const fadeOut = typeof fades.outSec === 'number' ? fades.outSec : 1.13;
const endFrame = cfg.frames[cfg.frames.length - 1];
const photos = opt.photos || {};
const byRid = (opt.photoMotion && opt.photoMotion.byRid) || {};
const isPhoto = rid => Object.prototype.hasOwnProperty.call(photos, rid);
const aspectOf = rid => {
  const s = (opt.sources || {})[rid] || photos[rid];
  return s && s.aspect > 0 ? s.aspect : 16 / 9;
};
const shots = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null).sort((a, b) => a.startFrame - b.startFrame);
const stack = async clip => (await d.videoEffects(clip)).map(e => e.name || e.effectName);
// Inspector definitions. Each default is this clip's own value (the fades differ per clip). The window is adjustable
// in Classic only; photos also get their motion (the effect scales strength 1 to the window's restrained move).
const MOTIONS = [['none', 'None'], ['push-in', 'Push in'], ['pull-out', 'Pull out'], ['drift-left', 'Drift left'], ['drift-right', 'Drift right'],
  ['drift-up', 'Drift up'], ['drift-down', 'Drift down'], ['tilt', 'Tilt'], ['push-drift', 'Push and drift']].map(([value, label]) => ({ label, value }));
const num = (key, label, value, min, max, step) => ({ key, label, type: 'number', defaultValue: value, min, max, step });
const frameDefs = (params, photo) => {
  const defs: any[] = [];
  if (classic) defs.push(num('x', 'Window X (%)', params.x, 0, 100, 0.1), num('y', 'Window Y (%)', params.y, 0, 100, 0.1), num('w', 'Window size (%)', params.w, 5, 100, 0.1));
  defs.push(num('fadeInSeconds', 'Fade in (s)', params.fadeInSeconds, 0, 3, 0.05), num('fadeOutSeconds', 'Fade out (s)', params.fadeOutSeconds, 0, 3, 0.05));
  if (photo) defs.push({ key: 'motion', label: 'Motion', type: 'select', defaultValue: params.motion, options: MOTIONS }, num('strength', 'Motion strength', params.strength, 0, 2, 0.1));
  return defs;
};
const notes = [];
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing, and never
// replaces an effect that is already there (Adjust edits survive a retry).
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.clipSound === 'off') {
  const main = await shots();
  const videos = main.filter(c => !isPhoto(c.resourceId));
  if (!main.length || videos.every(c => Array.isArray(c.audioSourceIndexes) && c.audioSourceIndexes.length === 0)) muteKept = true;
  else {
    // Clips whose source has no audio stream keep null routing after muting, so the check above cannot see a finished
    // mute on them. The EditDiff decides: opCount 0 means already muted or nothing to mute. The target starts at the
    // first shot so the Classic lead-in gap stays out of it.
    let diff;
    try { diff = await d.setAudioTracks({ target: await d.rangeAtFrames(main[0].startFrame, main[main.length - 1].endFrame), audioSourceIndexes: [] }); }
    catch (e) { throw Error('Could not mute the clips\' own sound: ' + (e && e.message || e)); }
    if (diff && diff.opCount === 0) muteKept = true; else muted = true;
  }
}
const hasGraphic = (await d.motionGraphics()).some(g => g.name === GRAPHIC_LABEL);
if (!hasGraphic) await d.addMotionGraphic({ within: await d.rangeAtFrames(0, endFrame), label: GRAPHIC_LABEL, tsxCode: cfg.graphic.tsx,
  parameters: cfg.graphic.parameters, editableParameters: cfg.graphic.editableParameters as any });
// Per shot: the Cinematic look first, then the Shot frame last, so the look never tints the black surround.
const lookOn = !!(cfg.look && cfg.look.on);
const lookStrength = cfg.look && typeof cfg.look.strength === 'number' ? cfg.look.strength : 0.3;
const lookDefs = [num('strength', 'Look strength', lookStrength, 0, 1, 0.05)];
let looks = 0, looksKept = 0, looksSkipped = 0, shotFrames = 0, shotFramesKept = 0;
const count = (await shots()).length;
for (let i = 0; i < count; i++) {
  // Re-read each time: every edit makes earlier rows stale.
  let clip = (await shots())[i];
  const names = await stack(clip);
  const hasFrame = names.includes(FRAME_LABEL);
  if (lookOn) {
    if (names.includes(LOOK_LABEL)) looksKept++;
    // A look appended after an existing Shot frame would tint the black surround; the frame is never replaced.
    else if (hasFrame) looksSkipped++;
    else {
      await d.addVideoEffect({ clip, label: LOOK_LABEL, tsxCode: cfg.look.tsx, parameters: { strength: lookStrength }, editableParameters: lookDefs as any });
      looks++;
      clip = (await shots())[i];
    }
  }
  if (hasFrame) { shotFramesKept++; continue; }
  const rid = clip.resourceId;
  const photo = isPhoto(rid);
  const params: any = { x: win.x, y: win.y, w: win.w, srcAspect: aspectOf(rid), fps: cfg.fps,
    durationFrames: clip.endFrame - clip.startFrame, originFrame: 0,
    fadeInSeconds: classic && i === 0 ? fadeIn : 0, fadeOutSeconds: i === count - 1 ? fadeOut : 0,
    ...(photo ? { motion: 'none', strength: 1, direction: 1, axis: 'x' } : { motion: 'none' }) };
  const pm = photo ? byRid[rid] : null;
  if (pm) { params.motion = pm.motion || 'none'; if (pm.direction != null) params.direction = pm.direction; if (pm.axis != null) params.axis = pm.axis; }
  const defs = frameDefs(params, photo);
  await d.addVideoEffect({ clip, label: FRAME_LABEL, tsxCode: cfg.frame.tsx, parameters: params, editableParameters: defs as any });
  shotFrames++;
}
if (looksSkipped) notes.push(looksSkipped + (looksSkipped === 1 ? ' shot keeps its frame' : ' shots keep their frame') + ' without the look');
// Commit only when this run added or changed something: commitAll rejects an empty change ("Nothing to stage"), which a
// retry after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
const committed = muted || !hasGraphic || looks > 0 || shotFrames > 0;
if (committed) await d.commitAll('THE END Credits: title and look');
return { graphicAdded: !hasGraphic, looks, looksKept, looksSkipped, shotFrames, shotFramesKept, muted, muteKept, committed, alreadyDone: !committed, notes };
