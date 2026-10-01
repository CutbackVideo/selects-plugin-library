const cfg: any = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
// Effect and transition names identify what an earlier run added (and the kit's readback), so they stay English.
const EFFECT_LABEL = 'Selfie whip + look', TRANSITION_LABEL = 'Selfie whip';
// Inspector parameter labels in the panel's UI language at build time (cfg.adjustLabels); English without them.
const LABELS = { look: 'Look', lookStrength: 'Look strength', whip: 'Whip strength', framing: 'Framing', ...(cfg.adjustLabels || {}) };
// Framing choices of a video clip (cfg.framingOptions in the UI language; English without them).
const FRAMING_OPTIONS = cfg.framingOptions || [{ label: 'Tight', value: 'tight' }, { label: 'Full', value: 'full' }];
const holds = cfg.holds || [];
const mode = cfg.whipMode === 'transition' ? 'transition' : 'effect';
const effect = cfg.effect || {};
const look = typeof effect.look === 'string' ? effect.look : 'soft-glow';
const lookStrength = typeof effect.lookStrength === 'number' ? effect.lookStrength : 0.35;
const whip = typeof effect.whip === 'number' ? effect.whip : 1;
const covers = cfg.covers || [];
// The cover scale assemble applied to clip i (assemble's result `covers`); 1 when none.
const coverOf = i => (typeof covers[i] === 'number' && covers[i] > 0 ? covers[i] : 1);
const notes = [];
// Whip angles: both clips of a cut share the cut's angle. The planner gives each hold angleIn (its head's cut) and
// angleOut (its tail's cut); `angle` = angleOut. Older holds without them: angleOut = angle, angleIn = the previous
// hold's angleOut (its own angle on the first hold).
const num = (v, dflt) => (typeof v === 'number' && isFinite(v) ? v : dflt);
const angleOutOf = i => num(holds[i] && holds[i].angleOut, num(holds[i] && holds[i].angle, 0));
const angleInOf = i => num(holds[i] && holds[i].angleIn, i > 0 ? angleOutOf(i - 1) : num(holds[i] && holds[i].angle, 0));
const photoIds = new Set(holds.filter(h => h.kind === 'photo').map(h => h.rid));
// Main clips in timeline order, read from trackScope 'all' (addVideoEffect / addTransition want those rows).
const main = async () => (await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'main' && c.resourceId !== null).sort((a, b) => a.startFrame - b.startFrame);
const hasEffect = async (clip) => (await d.videoEffects(clip)).some(e => e.name === EFFECT_LABEL || e.effectName === EFFECT_LABEL);
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing.
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.clipSound === 'off') {
  const rows = await main();
  const videos = rows.filter(c => !photoIds.has(c.resourceId));
  if (videos.every(c => Array.isArray(c.audioSourceIndexes) && c.audioSourceIndexes.length === 0)) muteKept = true;
  else {
    const end = rows.reduce((a, c) => Math.max(a, c.endFrame), 0);
    // Clips whose source has no audio stream keep null routing after muting, so the check above cannot see a finished
    // mute on them. The EditDiff decides: opCount 0 means already muted or nothing to mute (an all-silent Draft).
    let diff;
    try { diff = await d.setAudioTracks({ target: await d.rangeAtFrames(0, end), audioSourceIndexes: [] }); }
    catch (e) { throw Error('Could not mute the clips\' own sound: ' + (e && e.message || e)); }
    if (diff && diff.opCount === 0) muteKept = true; else muted = true;
  }
}
const fps = (await d.meta()).fps;
// Whip length on each side of a cut: w = max(1, round(0.067 * fps)) frames (2 frames at 23.976-30 fps).
const w = Math.max(1, Math.round(0.067 * fps));
const count = (await main()).length;
if (count !== holds.length) notes.push('the Draft has ' + count + ' clips for ' + holds.length + ' planned holds');
const n = Math.min(count, holds.length);
const lookDefs = [
  { key: 'look', label: LABELS.look, type: 'select', defaultValue: look, options: cfg.lookOptions || [] },
  { key: 'lookStrength', label: LABELS.lookStrength, type: 'number', defaultValue: lookStrength, min: 0, max: 1, step: 0.05 }];
const whipDef = { key: 'whip', label: LABELS.whip, type: 'number', defaultValue: whip, min: 0, max: 1.5, step: 0.1 };
// Whip strength of a side: the planner's per-cut hold.whipIn / hold.whipOut (spin 1, standard bar 0.6, subtle bar 0.35,
// finale 0.75; both clips of a cut carry the same value); older holds without them whip at 1.
const strengthIn = h => num(h.whipIn, 1), strengthOut = h => num(h.whipOut, 1);
// One effect per Main clip. In effect mode it smears the clip's head and tail (whipIn / whipOut: the side's strength,
// 0 = none, which the first clip's head and the last clip's tail always are); in transition mode the native
// transitions whip, so the effect only carries the look and the photo framing.
let effects = 0, effectsKept = 0;
for (let i = 0; i < n; i++) {
  // Re-read before each edit: any edit makes earlier rows stale.
  const clip = (await main())[i];
  if (!clip) continue;
  if (await hasEffect(clip)) { effectsKept++; continue; }
  const h = holds[i];
  const whipIn = mode === 'effect' && i > 0 && h.cutIn !== 'none' ? strengthIn(h) : 0;
  const whipOut = mode === 'effect' && i < n - 1 && h.cutOut !== 'none' ? strengthOut(h) : 0;
  // Video clips get a Framing select (tight: zoom toward the upper middle, full: the whole frame); photos keep their
  // planned full / punch framing without one.
  const video = h.kind !== 'photo';
  const framing = video ? (h.framing === 'tight' ? 'tight' : 'full') : h.framing || null;
  const parameters = { whipIn, whipOut, kindIn: h.cutIn || 'none', kindOut: h.cutOut || 'none', angle: num(h.angle, 0),
    angleIn: angleInOf(i), angleOut: angleOutOf(i), whip, look, lookStrength, framing, cover: coverOf(i) };
  const framingDef = { key: 'framing', label: LABELS.framing, type: 'select', defaultValue: framing, options: FRAMING_OPTIONS };
  const defs = [...lookDefs, ...(mode === 'effect' ? [whipDef] : []), ...(video ? [framingDef] : [])];
  await d.addVideoEffect({ clip, label: EFFECT_LABEL, tsxCode: effect.tsx, parameters, editableParameters: defs as any });
  effects++;
}
// Transition mode (the A/B alternative): one native transition of w + w frames on every cut between two clips; never
// after the last clip (no transition from/to nothing). A cut that already has one keeps it.
// selfie-whip-transition.tsx data: { kind, angle, strength (per cut: the outgoing hold's whipOut), whip (global, editable), cover }. Both clips
// render during the transition; the smaller cover of the two keeps the translated frames covered (1 = worst case).
const transitionCover = i => Math.min(coverOf(i), coverOf(i + 1));
let transitions = 0, transitionsKept = 0;
if (mode === 'transition') {
  for (let i = 0; i < n - 1; i++) {
    const clip = (await main())[i];
    if (!clip) continue;
    const existing = (await d.transitions()).some(t => (t.name === TRANSITION_LABEL || t.transitionType === TRANSITION_LABEL) && t.editPointFrame === clip.endFrame);
    if (existing) { transitionsKept++; continue; }
    const h = holds[i];
    await d.addTransition({ after: clip, label: TRANSITION_LABEL, tsxCode: cfg.transitionTsx, inOffsetSeconds: w / fps, outOffsetSeconds: w / fps,
      parameters: { kind: h.cutOut && h.cutOut !== 'none' ? h.cutOut : 'dir', angle: angleOutOf(i), strength: strengthOut(h), whip, cover: transitionCover(i) },
      editableParameters: [whipDef] as any });
    transitions++;
  }
}
// Commit only when this run added or changed something: commitAll rejects an empty change ("Nothing to stage"), which a
// retry after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
const committed = muted || effects > 0 || transitions > 0;
if (committed) await d.commitAll('Selfie Aesthetic Edit: whip and look');
return { mode, effects, effectsKept, transitions, transitionsKept, muted, muteKept, committed, alreadyDone: !committed, notes };
