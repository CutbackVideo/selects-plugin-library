export type SfxCue = {
  id: string;
  file: string;
  durationSeconds: number;
  peakDbfs: number;
  activityOnsetSeconds?: number;
  tags: string[];
  events: string[];
  license?: string;
  provider?: string;
  pack?: string;
  sourcePageUrl?: string;
};

export type SfxCatalog = { schema: string; assets: SfxCue[]; providers?: { id: string; name: string; pack: string; sourcePageUrl?: string; license?: string }[] };

export type SfxEventKind = "material-change" | "asset-entry" | "count-start" | "page-cut";
export const SFX_PRIORITY: SfxEventKind[] = ["material-change", "asset-entry", "count-start", "page-cut"];

export const SFX_RULES = { minGapSeconds: 1.5, maxPerFilm: 8, materialMinSeconds: 3, slideMinPx: 60, slideWindowFrames: 8, belowVoicePeakDb: 10 } as const;

export type SfxEvent = { kind: SfxEventKind; frame: number; sceneId: string; detail: string; motion?: "slide" | "place" };

type Keyframe = { frame: number; x?: number; y?: number };
type Layer = { id?: string; kind: string; from: number; to: number; assetId?: string; keyframes?: Keyframe[]; numberMotion?: { delayFrames?: number } | null };
export type SceneExecution = { durationFrames: number; backgrounds?: { from: number; color: string }[]; layers?: Layer[]; footage?: { from: number; to: number }[] };
export type SoundScene = { sceneId: string; start: number; end: number; execution: SceneExecution };

const footageAt = (e: SceneExecution, f: number) => (e.footage ?? []).some((x) => f >= x.from && f < x.to);

function moves(l: Layer, window: number, minPx: number): boolean {
  const ks = (l.keyframes ?? []).filter((k) => k.x != null && k.y != null).sort((a, b) => a.frame - b.frame);
  if (ks.length < 2) return false;
  const at = (f: number): [number, number] => {
    if (f <= ks[0].frame) return [ks[0].x!, ks[0].y!];
    for (let i = 1; i < ks.length; i += 1) {
      const a = ks[i - 1], b = ks[i];
      if (f <= b.frame) {
        const u = (f - a.frame) / (b.frame - a.frame || 1);
        return [a.x! + (b.x! - a.x!) * u, a.y! + (b.y! - a.y!) * u];
      }
    }
    return [ks[ks.length - 1].x!, ks[ks.length - 1].y!];
  };
  const f0 = Math.max(l.from, ks[0].frame);
  const [x0, y0] = at(f0), [x1, y1] = at(f0 + window);
  return Math.hypot(x1 - x0, y1 - y0) >= minPx;
}

export function sceneEvents(scenes: readonly SoundScene[], fps: number, rules = SFX_RULES): SfxEvent[] {
  const out: SfxEvent[] = [];
  const sorted = [...scenes].sort((a, b) => a.start - b.start);
  for (const s of sorted) {
    const e = s.execution;
    const layers = e.layers ?? [];
    const assets = layers.filter((l) => l.kind === "asset" && l.assetId && l.to > Math.max(0, l.from));
    const seen = new Set<string>();
    for (const l of [...assets].sort((a, b) => a.from - b.from)) {
      const key = l.assetId + "@" + l.from;
      const continues = assets.some((o) => o !== l && o.assetId === l.assetId && o.from < l.from && o.to >= l.from);
      if (continues || seen.has(key)) continue;
      seen.add(key);
      const f = Math.max(0, l.from);
      out.push({ kind: "asset-entry", frame: s.start + f, sceneId: s.sceneId, detail: "picture " + l.assetId, motion: moves(l, rules.slideWindowFrames, rules.slideMinPx) ? "slide" : "place" });
    }
    for (const l of layers) {
      if (l.kind !== "text" || !l.numberMotion) continue;
      const f = Math.max(0, l.from, l.from + (l.numberMotion.delayFrames ?? 0));
      if (f < e.durationFrames) out.push({ kind: "count-start", frame: s.start + f, sceneId: s.sceneId, detail: "count " + (l.id ?? "") });
    }
    for (const b of e.backgrounds ?? []) {
      if (b.from <= 0 || b.from >= e.durationFrames) continue;
      if (!footageAt(e, b.from - 1) && !footageAt(e, b.from)) out.push({ kind: "page-cut", frame: s.start + b.from, sceneId: s.sceneId, detail: "page or ground cut" });
    }
  }
  let material = false;
  for (let i = 1; i < sorted.length; i += 1) {
    const a = sorted[i - 1], b = sorted[i];
    if (a.end !== b.start) continue;
    const aGraphic = !footageAt(a.execution, a.end - a.start - 1), bGraphic = !footageAt(b.execution, 0);
    if (aGraphic && bGraphic) out.push({ kind: "page-cut", frame: b.start, sceneId: b.sceneId, detail: "graphic scene to graphic scene" });
    else if (!aGraphic && bGraphic && !material && b.start >= rules.materialMinSeconds * fps) {
      material = true;
      out.push({ kind: "material-change", frame: b.start, sceneId: b.sceneId, detail: "footage to graphic" });
    }
  }
  return out.sort((x, y) => x.frame - y.frame || SFX_PRIORITY.indexOf(x.kind) - SFX_PRIORITY.indexOf(y.kind));
}

export function thinEvents(events: readonly SfxEvent[], fps: number, rules = SFX_RULES): { kept: SfxEvent[]; dropped: { event: SfxEvent; why: string }[] } {
  const gap = rules.minGapSeconds * fps;
  const kept: SfxEvent[] = [];
  const dropped: { event: SfxEvent; why: string }[] = [];
  const order = [...events].sort((a, b) => SFX_PRIORITY.indexOf(a.kind) - SFX_PRIORITY.indexOf(b.kind) || a.frame - b.frame);
  for (const e of order) {
    const near = kept.find((k) => Math.abs(k.frame - e.frame) < gap);
    if (near) dropped.push({ event: e, why: "within " + rules.minGapSeconds + " s of the " + near.kind + " at frame " + near.frame });
    else if (kept.length >= rules.maxPerFilm) dropped.push({ event: e, why: "the film has its " + rules.maxPerFilm + " cues" });
    else kept.push(e);
  }
  return { kept: kept.sort((a, b) => a.frame - b.frame), dropped };
}

export function cueFor(e: SfxEvent, catalog: SfxCatalog, index: number): SfxCue {
  let pool = catalog.assets.filter((c) => c.events.includes(e.kind));
  if (e.kind === "asset-entry" && e.motion) {
    const tagged = pool.filter((c) => c.tags.includes(e.motion!));
    if (tagged.length) pool = tagged;
  }
  if (!pool.length) throw new Error("The SFX catalog has no cue for " + e.kind + ".");
  pool.sort((a, b) => a.id.localeCompare(b.id));
  return pool[index % pool.length];
}

export type SfxPlacement = { cue: SfxCue; event: SfxEvent; start: number; end: number };

export function placeSfx(kept: readonly SfxEvent[], catalog: SfxCatalog, fps: number, mainEnd: number): { placements: SfxPlacement[]; skipped: { event: SfxEvent; why: string }[] } {
  const placements: SfxPlacement[] = [];
  const skipped: { event: SfxEvent; why: string }[] = [];
  const count = new Map<string, number>();
  for (const e of kept) {
    const k = e.kind + "/" + (e.motion ?? "");
    const n = count.get(k) ?? 0;
    count.set(k, n + 1);
    const cue = cueFor(e, catalog, n);
    const frames = Math.floor(cue.durationSeconds * fps + 1e-9);
    if (frames < 1) {
      skipped.push({ event: e, why: cue.id + " is shorter than a frame" });
      continue;
    }
    const start = Math.max(0, e.frame - Math.round((cue.activityOnsetSeconds ?? 0) * fps));
    const end = Math.min(mainEnd, start + frames);
    if (end <= start) {
      skipped.push({ event: e, why: "no frame left before the film ends" });
      continue;
    }
    placements.push({ cue, event: e, start, end });
  }
  return { placements, skipped };
}

export const sfxGainDb = (voicePeakDb: number, cuePeakDbfs: number, below = SFX_RULES.belowVoicePeakDb): number => voicePeakDb - below - cuePeakDbfs;
