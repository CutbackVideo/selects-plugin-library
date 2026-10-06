export type FootageShot = { id: string; from: number; to: number; still?: boolean; [k: string]: unknown };

export type Span = {
  from: number;
  to: number;
  transparent: boolean;
  stills: string[];
};

type ExecutionLike = { fps?: number; cadence?: unknown; footage?: unknown };

const shotsOf = (ex: ExecutionLike): FootageShot[] => (Array.isArray(ex.footage) ? (ex.footage as FootageShot[]) : []);

export function sceneSpans(ex: ExecutionLike, frames: number): Span[] {
  const shots = shotsOf(ex);
  const spans: Span[] = [];
  for (let f = 0; f < frames; f += 1) {
    const shot = shots.find((s) => f >= s.from && f < s.to);
    const transparent = !!shot && !shot.still;
    let span = spans.at(-1);
    if (!span || span.transparent !== transparent) spans.push((span = { from: f, to: f, transparent, stills: [] }));
    span.to = f + 1;
    if (shot?.still && !span.stills.includes(shot.id)) span.stills.push(shot.id);
  }
  return spans;
}

export function stillShots(ex: ExecutionLike): Map<string, FootageShot> {
  return new Map(shotsOf(ex).filter((s) => s.still).map((s) => [s.id, s]));
}

export function cadenceLag(ex: Pick<ExecutionLike, "fps" | "cadence">): number {
  const c = (ex.cadence as { fps?: number } | null | undefined)?.fps,
    fps = ex.fps;
  return c && fps && c < fps ? Math.ceil((2 * fps) / c) + 1 : 0;
}

export function spanLayers<L extends { id: string }>(ex: Pick<ExecutionLike, "fps" | "cadence">, layers: L[], span: Pick<Span, "from" | "to">): L[] {
  const lag = cadenceLag(ex);
  return layers.filter((layer) => {
    const { from, to } = layer as { from?: unknown; to?: unknown };
    return typeof from !== "number" || typeof to !== "number" || (to > span.from - lag && from < span.to);
  });
}
