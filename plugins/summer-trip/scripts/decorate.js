const cfg = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
const W = cfg.W || 1920, H = cfg.H || 1080;
const LOOK = 'Summer look', GRID = 'Grid panel', FILM = 'Film frame', MOTION = 'Photo motion';
const TITLE = 'Summer Trip title', LABELS = 'Summer Trip labels';
const fr = cfg.frames;
const fps = (await d.meta()).fps;
const notes = [];
if (cfg.fps && cfg.fps !== fps) notes.push('the Draft runs at ' + fps + ' fps, assembled at ' + cfg.fps);
const photoIds = new Set(cfg.photos || []);
const sizes = cfg.sizes || {};
// JSON round trip: parameter definitions built here lose their literal types in the run_script TypeScript check
// ("number" widens to string), so they are passed as `any`.
const loose = v => JSON.parse(JSON.stringify(v));
const all = () => d.clips({ trackScope: 'all' });
const rowById = async id => (await all()).find(c => c.clipId === id);
const hasEffect = async (clip, label) => (await d.videoEffects(clip)).some(e => e.name === label || e.effectName === label);

// The canvas rectangle `rect` ({ x, y, w, h } in canvas px) in % of a clip's own box. The clip is conformed to FIT
// the canvas, then scaled by the transform's scale about its centre and moved by its position (% of the canvas
// height from the centre, +y up). Same maths as the effects lane's stCanvasInBox.
const stRectInBox = (size, t, rect) => {
  const ok = size && size.width > 0 && size.height > 0;
  const sw = ok ? size.width : W, sh = ok ? size.height : H;
  const fit = Math.min(W / sw, H / sh);
  const sx = t && t.scale ? t.scale.x : 1, sy = t && t.scale ? t.scale.y : 1;
  const px = t && t.position ? t.position.x : 0, py = t && t.position ? t.position.y : 0;
  const bw = sw * fit * sx, bh = sh * fit * sy;
  const left = W / 2 + px / 100 * H - bw / 2, top = H / 2 - py / 100 * H - bh / 2;
  return { x: (rect.x - left) / bw * 100, y: (rect.y - top) / bh * 100, w: rect.w / bw * 100, h: rect.h / bh * 100 };
};
const stCanvasInBox = (size, t) => stRectInBox(size, t, { x: 0, y: 0, w: W, h: H });
const QUAD_RECT = { TL: { x: 0, y: 0 }, TR: { x: W / 2, y: 0 }, BR: { x: W / 2, y: H / 2 }, BL: { x: 0, y: H / 2 } };
const is169 = size => !(size && size.width > 0 && size.height > 0) || Math.abs(size.width / size.height - W / H) < 0.01;

// Main clip i is the one starting on mainFrames[i] (clipId from assemble as a fallback); grid clips by track kind,
// resource and start frame. Never by row index.
const mainClip = (rows, i) => {
  const m = (cfg.placed || [])[i] || {};
  return rows.find(c => c.trackKind === 'main' && c.resourceId !== null && c.startFrame === fr.mainFrames[i]) ||
    rows.find(c => c.trackKind === 'main' && c.clipId === m.clipId);
};
const gridClip = (rows, gp) =>
  rows.find(c => c.trackKind === 'video' && c.resourceId === gp.rid && c.startFrame === gp.a) ||
  rows.find(c => c.trackKind === 'video' && c.clipId === gp.clipId);

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
    // mute on them. The EditDiff decides: opCount 0 means already muted or nothing to mute.
    let diff;
    try { diff = await d.setAudioTracks({ target: await d.rangeAtFrames(0, end), audioSourceIndexes: [] }); }
    catch (e) { throw Error('Could not mute the clips\' own sound: ' + (e && e.message || e)); }
    if (diff && diff.opCount === 0) muteKept = true; else muted = true;
  }
}

// Grid panels are visual-only. 'routing' routes each panel to no audio source; setAudioTracks is specified for Main
// clips, so the panel row itself is passed as the target and the Main routing is checked afterwards. When the call
// is refused, the panel is lowered to the -60 dB floor instead (reported, not called a mute). If the Main routing
// changed, the run throws before committing, so nothing is saved.
const grid = { mode: cfg.gridSound || 'none', routed: 0, kept: 0, lowered: 0 };
if (grid.mode === 'routing') {
  const mainRouting = async () => JSON.stringify((await d.clips({ trackScope: 'main' })).map(c => [c.clipId, c.audioSourceIndexes]));
  const mainBefore = await mainRouting();
  for (const gp of cfg.gridPlaced || []) {
    const clip = gridClip(await all(), gp);
    if (!clip) continue;
    if (Array.isArray(clip.audioSourceIndexes) && clip.audioSourceIndexes.length === 0) { grid.kept++; continue; }
    let diff = null, refused = null;
    try { diff = await d.setAudioTracks({ target: Object(clip), audioSourceIndexes: [] }); } catch (e) { refused = e; }
    if (!refused) {
      if (diff && diff.opCount === 0) grid.kept++; else grid.routed++;
      continue;
    }
    const again = await rowById(clip.clipId);
    if (!again) continue;
    const r = await d.setClipAudio({ clip: again, volumeDb: -60 });
    if (r && r.diff && r.diff.opCount === 0) grid.kept++; else grid.lowered++;
  }
  if (grid.lowered) notes.push('grid panel sound lowered to -60 dB (routing unavailable)');
  if (await mainRouting() !== mainBefore) throw Error('Routing the grid panels\' sound changed the Main clips; nothing was saved. Use gridSound "volume".');
}

// Title over [0, F(8)), labels over [F(12), Fe).
const graphics = (await d.motionGraphics()).map(g => g.name);
let titleAdded = false, labelsAdded = false;
if (cfg.title && !graphics.includes(TITLE)) {
  await d.addMotionGraphic({ within: await d.rangeAtFrames(0, fr.titleFrames[1]), label: TITLE, tsxCode: cfg.title.tsx, parameters: cfg.title.parameters, editableParameters: cfg.title.editableParameters });
  titleAdded = true;
}
if (cfg.labels && !graphics.includes(LABELS)) {
  const span = fr.labelsFrames[fr.labelsFrames.length - 1];
  await d.addMotionGraphic({ within: await d.rangeAtFrames(span[0], span[1]), label: LABELS, tsxCode: cfg.labels.tsx, parameters: cfg.labels.parameters, editableParameters: cfg.labels.editableParameters });
  labelsAdded = true;
}

const added = { look: 0, gridPanel: 0, filmFrame: 0, motion: 0 }, kept = { look: 0, gridPanel: 0, filmFrame: 0, motion: 0 };
// Adds one effect unless the clip already has one with that label.
const ensure = async (id, key, label, build) => {
  const clip = await rowById(id);
  if (!clip) return;
  if (await hasEffect(clip, label)) { kept[key]++; return; }
  const e = await build(clip);
  await d.addVideoEffect({ clip, label, tsxCode: e.tsx, parameters: e.parameters, editableParameters: loose(e.editableParameters || []) });
  added[key]++;
};
const timeOrigin = (cfg.filmFrame && cfg.filmFrame.timeOrigin) || (cfg.look && cfg.look.timeOrigin) || 'clip';
const leakStrength = x => (x && typeof x.leakStrength === 'number' ? x.leakStrength : 1);
const leakOutSeconds = (fr.endingFrame - fr.leakFrames.a) / fps;
const leakInSeconds = (fr.leakFrames.b - fr.endingFrame) / fps;
// canvasInBox (the last montage clip only): the canvas in % of the clip's own box, so the transition leak is laid
// out on the canvas, not on a cover-cropped portrait or photo box.
// Film grain (0-1) of the Summer look; its opacity also scales with the look strength, so a look at 0 has none.
const lookGrain = cfg.look && typeof cfg.look.grain === 'number' ? cfg.look.grain : 0.35;
const lookFor = (clip, sourceStartSeconds, leakOut, canvasInBox) => ({
  tsx: cfg.look.tsx,
  parameters: { strength: cfg.look.gradeOff ? 0 : cfg.look.strength, grain: lookGrain, leakOutSeconds: leakOut, leakStrength: leakStrength(cfg.look), clipSeconds: (clip.endFrame - clip.startFrame) / fps, sourceStartSeconds, timeOrigin,
    ...(canvasInBox ? { canvasInBox } : {}) },
  editableParameters: [
    { key: 'strength', label: 'Summer look', type: 'number', defaultValue: cfg.look.strength, min: 0, max: 1, step: 0.05 },
    { key: 'grain', label: 'Film grain', type: 'number', defaultValue: lookGrain, min: 0, max: 1, step: 0.05 },
    { key: 'leakStrength', label: 'Light leak', type: 'number', defaultValue: leakStrength(cfg.look), min: 0, max: 2, step: 0.05 }],
});
const motionDefs = m => [
  { key: 'motion', label: 'Motion', type: 'select', defaultValue: m.motion, options: cfg.motion.options || [] },
  { key: 'strength', label: 'Motion strength', type: 'number', defaultValue: cfg.motion.strength, min: 0, max: 2, step: 0.1 }];

const nMain = fr.mainFrames.length - 1;
const endingFirst = nMain - 3, lastMontage = nMain - 4;
// Leak pulses (centres at pulseFrames, half a beat wide) in each ending clip's local seconds; a pulse that straddles
// a cut appears in both clips. With three or more pulses the last one (ending + 7 beats) is the warm end flare
// (kind 'flare'), three times as wide (1.5 beats), so the final hold does not end on a clean dark picture.
const halfLeak = (fr.leakFrames.b - fr.leakFrames.a) / 2;
const flareAt = fr.pulseFrames.length >= 3 ? fr.pulseFrames.length - 1 : -1;
const pulsesFor = clip => fr.pulseFrames
  .map((f, k) => ({ f, half: k === flareAt ? 3 * halfLeak : halfLeak, flare: k === flareAt }))
  .filter(q => q.f + q.half > clip.startFrame && q.f - q.half < clip.endFrame)
  .map(q => (q.flare ? { at: (q.f - clip.startFrame) / fps, dur: 2 * q.half / fps, kind: 'flare' } : { at: (q.f - clip.startFrame) / fps, dur: 2 * q.half / fps }));
let missing = 0;
for (let i = 0; i < nMain; i++) {
  const clip = mainClip(await all(), i);
  if (!clip) { missing++; continue; }
  const m = (cfg.placed || [])[i] || {};
  const isPhoto = photoIds.has(clip.resourceId);
  const ss = typeof m.sourceStart === 'number' ? m.sourceStart : 0;
  // Montage photos: Photo motion first, so the grade (and its leak) sits on top of the moving picture.
  const mm = cfg.motion && cfg.motion.byClipIndex && cfg.motion.byClipIndex[String(i)];
  if (isPhoto && mm && i >= 2 && i <= lastMontage) {
    await ensure(clip.clipId, 'motion', MOTION, c => ({ tsx: cfg.motion.tsx,
      parameters: { motion: mm.motion, strength: cfg.motion.strength, direction: mm.direction, axis: mm.axis, cover: mm.cover || 1, holdSeconds: Math.round((c.endFrame - c.startFrame) / fps * 1000) / 1000 },
      editableParameters: motionDefs(mm) }));
  }
  // Summer look on every clip; the last montage clip carries the outgoing leak (a quarter beat before the ending cut).
  // Look off (gradeOff): no grade anywhere, but the last montage clip keeps a strength-0 look for its outgoing leak.
  if (cfg.look && (!cfg.look.gradeOff || i === lastMontage)) {
    await ensure(clip.clipId, 'look', LOOK, async c => (i === lastMontage
      ? lookFor(c, ss, leakOutSeconds, stCanvasInBox(sizes[c.resourceId], await d.clipTransform(c)))
      : lookFor(c, ss, 0, null)));
  }
  // Ending clips: Film frame after the look. The window is fixed on the canvas (canvasInBox); ending photos move
  // inside it (motion), the first clip opens with the leak wash, the last fades to black.
  if (cfg.filmFrame && i >= endingFirst) {
    const k = i - endingFirst;
    const em = cfg.endingMotion && cfg.endingMotion[String(k)];
    const win = cfg.filmFrame.window || {};
    await ensure(clip.clipId, 'filmFrame', FILM, async c => {
      const t = await d.clipTransform(c);
      const fringe = cfg.filmFrame.fringe != null ? cfg.filmFrame.fringe : win.fringe;
      const parameters = {
        canvasInBox: stCanvasInBox(sizes[c.resourceId], t),
        windowW: win.w, windowH: win.h, radius: win.radius, feather: win.feather,
        leakInSeconds: k === 0 ? leakInSeconds : 0, pulses: pulsesFor(c), leakStrength: leakStrength(cfg.filmFrame),
        fadeOutFrames: k === 2 ? fr.endFrame - fr.fadeStartFrame : 0, clipSeconds: (c.endFrame - c.startFrame) / fps,
        motion: isPhoto && em ? { motion: em.motion, direction: em.direction, axis: em.axis, strength: cfg.motion ? cfg.motion.strength : 1 } : null,
        sourceStartSeconds: ss, timeOrigin, ...(fringe != null ? { fringe } : {}),
      };
      return { tsx: cfg.filmFrame.tsx, parameters,
        editableParameters: [{ key: 'leakStrength', label: 'Light leak', type: 'number', defaultValue: leakStrength(cfg.filmFrame), min: 0, max: 2, step: 0.05 }] };
    });
  }
}
// Grid panels: the look, then a quadrant mask on sources that are not 16:9 (their cover crop overflows the quadrant).
for (const gp of cfg.gridPlaced || []) {
  const clip = gridClip(await all(), gp);
  if (!clip) { missing++; continue; }
  if (cfg.look && !cfg.look.gradeOff) await ensure(clip.clipId, 'look', LOOK, c => lookFor(c, gp.sourceStart || 0, 0, null));
  if (cfg.gridPanel && !is169(sizes[gp.rid])) {
    await ensure(clip.clipId, 'gridPanel', GRID, async c => {
      const q = QUAD_RECT[gp.quad];
      const r = stRectInBox(sizes[gp.rid], await d.clipTransform(c), { x: q.x, y: q.y, w: W / 2, h: H / 2 });
      const clamp = v => Math.max(0, Math.min(100, v));
      return { tsx: cfg.gridPanel.tsx, parameters: { insetPct: { top: clamp(r.y), right: clamp(100 - r.x - r.w), bottom: clamp(100 - r.y - r.h), left: clamp(r.x) } } };
    });
  }
}
if (missing) notes.push(missing + (missing === 1 ? ' clip was' : ' clips were') + ' not found for effects');

// Commit only when this run changed something: commitAll rejects an empty change ("Nothing to stage"), which a retry
// after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
const changed = muted || grid.routed > 0 || grid.lowered > 0 || titleAdded || labelsAdded || Object.values(added).some(n => n > 0);
if (changed) await d.commitAll('Summer Trip: title and look');
return { titleAdded, labelsAdded, muted, muteKept, gridSound: grid, effects: { added, kept }, committed: changed, alreadyDone: !changed, notes };
