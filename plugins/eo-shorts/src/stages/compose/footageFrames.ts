export type FootageKind = "podcast" | "stock" | "person";

export type Cadence = { fps: number; phase?: number };

export type ExecShot = {
  id: string;
  from: number;
  to: number;
  treatment?: string;
  layout?: string;
  move?: string;
  grade?: unknown;
  gamma?: unknown;
  screen?: string;
  cadence?: Cadence | null;
  offset?: number;
  rate?: number;
  still?: boolean;
  box?: { x: number; y: number; w: number; h: number; r?: number };
  [k: string]: unknown;
};

export type FootageExecution = {
  sceneId?: string;
  fps: number;
  durationFrames: number;
  footage?: ExecShot[];
  screen?: unknown;
  screenSpans?: { from: number; to: number }[] | null;
  [k: string]: unknown;
};

export function cadenceTick(frame: number, cadence: Cadence | null | undefined, fps: number): number {
  if (!cadence?.fps || cadence.fps >= fps) return frame;
  const period = fps / cadence.fps;
  const phase = cadence.phase || 0;
  const k = Math.floor((frame + phase) / period);
  let tick = Math.ceil(k * period - phase);
  if (tick > frame) tick = Math.ceil((k - 1) * period - phase);
  return Math.max(0, tick);
}

export function shotSourceIndex(shot: ExecShot, frame: number, fps: number): number {
  const local = Math.max(0, (shot.cadence ? cadenceTick(frame, shot.cadence, fps) : frame) - shot.from);
  return (shot.offset || 0) + Math.round(local * (shot.rate ?? 1));
}

const KIND_OF_SOURCE: Record<string, FootageKind> = { podcast: "podcast", "stock-video": "stock", person: "person" };

export function shotKinds(plan: { shots?: { source?: string }[] }): Record<string, FootageKind> {
  const out: Record<string, FootageKind> = {};
  (plan.shots || []).forEach((sh, k) => {
    const kind = KIND_OF_SOURCE[String(sh?.source)];
    if (!kind) throw new Error("Shot " + k + " has an unknown source " + JSON.stringify(sh?.source) + ".");
    out["shot-" + k] = kind;
  });
  return out;
}

export function shotAt(ex: FootageExecution, frame: number): ExecShot | null {
  return (ex.footage || []).find((s) => frame >= s.from && frame < s.to) ?? null;
}

export type FootageRun = { kind: FootageKind; from: number; to: number; shots: { id: string; from: number; to: number }[] };

export function footageRuns(ex: FootageExecution, kinds: Record<string, FootageKind>): FootageRun[] {
  const runs: FootageRun[] = [];
  for (let f = 0; f < ex.durationFrames; f += 1) {
    const shot = shotAt(ex, f);
    if (!shot) continue;
    const kind = kinds[shot.id];
    if (!kind) throw new Error("Scene " + (ex.sceneId ?? "?") + " draws " + shot.id + ", which its plan does not name.");
    let run = runs.at(-1);
    if (!run || run.kind !== kind || run.to !== f) runs.push((run = { kind, from: f, to: f, shots: [] }));
    run.to = f + 1;
    const last = run.shots.at(-1);
    if (last && last.id === shot.id && last.to === f) last.to = f + 1;
    else run.shots.push({ id: shot.id, from: f, to: f + 1 });
  }
  return runs;
}

export function shotIndices(ex: FootageExecution, shotId: string, from: number, to: number): number[] {
  const shot = (ex.footage || []).find((s) => s.id === shotId);
  if (!shot) throw new Error("Scene " + (ex.sceneId ?? "?") + " has no shot " + shotId + ".");
  const out: number[] = [];
  for (let f = from; f < to; f += 1) out.push(shotSourceIndex(shot, f, ex.fps));
  return out;
}
