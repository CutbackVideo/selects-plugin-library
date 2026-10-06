export const SPLIT_CROSSING_JS = `const isLookName = (name) => /^EO [A-Za-z0-9_.-]+ look [0-9a-f]{12}$/.test(name);
const splitCrossing = async (ks, roots) => {
  const fileOf = (rid) => files.find((f) => f.resourceId === rid) || null;
  const graphicOf = new Map((await d.motionGraphics()).map((x) => [x.clip.clipId, x.name]));
  const out = { graphics: [], overlays: [], sound: [], foreign: [], mainEffects: [] };
  for (const c of await d.clips({ trackScope: "all" })) {
    if (c.trackKind !== "video" && c.trackKind !== "audio") continue;
    const at = ks.filter((k) => c.startFrame < k && c.endFrame > k);
    if (!at.length) continue;
    const gname = graphicOf.get(c.clipId);
    const f = c.resourceId ? fileOf(c.resourceId) : null;
    const name = gname != null ? gname : f ? String(f.path).split(/[\\\\/]/).pop() : c.resourceId ? "resource " + c.resourceId : "clip " + c.clipId + " (no file)";
    const row = { clip: c, kind: gname != null ? "graphic" : c.trackKind, name, start: c.startFrame, end: c.endFrame, at };
    if (gname != null) (gname.startsWith("EO ") ? out.graphics : out.foreign).push(row);
    else if (f && c.trackKind === "video" && under(f.path, roots.footage)) out.overlays.push(row);
    else if (f && roots.sound && under(f.path, roots.sound)) out.sound.push(row);
    else out.foreign.push(row);
  }
  for (const c of await mainClips()) {
    const at = ks.filter((k) => c.startFrame < k && c.endFrame > k);
    if (!at.length || !c.resourceId) continue;
    for (const e of await d.videoEffects(c)) if (!isLookName(e.name)) out.mainEffects.push({ name: e.name, start: c.startFrame, end: c.endFrame, at });
  }
  return out;
};
const atText = (k) => "frame " + k + " (" + (k / G.fps).toFixed(2) + " s)";
const crossingError = (rows) => {
  const ks = [...new Set(rows.flatMap((r) => r.at))].sort((a, b) => Number(a) - Number(b));
  return "Main has to be split at " + ks.map(atText).join(", ") + " for the speaker's look, and that would cut "
    + (rows.length === 1 ? "this clip" : "these clips") + " in two: "
    + rows.map((r) => r.kind + " \\"" + r.name + "\\" " + r.start + "-" + r.end + " (at " + r.at.join(", ") + ")").join("; ")
    + ". EO Shorts cannot put " + (rows.length === 1 ? "it" : "them") + " back as " + (rows.length === 1 ? "it was" : "they were")
    + ". Move " + (rows.length === 1 ? "it" : "them") + " off " + (ks.length === 1 ? "that frame" : "those frames") + " or remove " + (rows.length === 1 ? "it" : "them") + ", then run again.";
};
const crossingRows = (rows) => rows.map((r) => ({ kind: r.kind, name: r.name, start: r.start, end: r.end, at: r.at }));`;

export type SplitRoots = {
  footageRoot: string;
  soundRoot: string | null;
};

export type CrossingClip = { kind: "video" | "audio" | "graphic"; name: string; start: number; end: number; at: number[] };

export type SplitCheck = {
  splits: number[];
  graphics: CrossingClip[];
  overlays: CrossingClip[];
  sound: CrossingClip[];
  foreign: CrossingClip[];
  mainEffects: MainEffectCrossing[];
  refusal: string | null;
};

export type MainEffectCrossing = { name: string; start: number; end: number; at: number[] };

export function crossingWarnings(place: { removedSound?: CrossingClip[]; mainEffects?: MainEffectCrossing[] } | null | undefined): string[] {
  const out: string[] = [];
  const clip = (r: { name: string; start: number; end: number }) => '"' + r.name + '" ' + r.start + "-" + r.end;
  const sound = place?.removedSound ?? [];
  if (sound.length) out.push("Main was split at " + [...new Set(sound.flatMap((r) => r.at))].sort((a, b) => a - b).join(", ") + " for a speaker look; the music and sound effects crossing it were taken off (" + sound.map(clip).join(", ") + ") for the sound stage to place again.");
  for (const e of place?.mainEffects ?? []) out.push("The Effect " + clip(e) + " on Main was split at " + e.at.join(", ") + "; an animated Effect stops on the right-hand piece.");
  return out;
}
