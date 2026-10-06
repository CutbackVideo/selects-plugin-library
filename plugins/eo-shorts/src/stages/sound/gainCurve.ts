export type Breakpoint = { frame: number; db: number };

export function lineValue(points: readonly Breakpoint[], frame: number): number {
  if (!points.length) return 0;
  if (frame <= points[0].frame) return points[0].db;
  for (let i = 1; i < points.length; i += 1) {
    const b = points[i];
    if (frame <= b.frame) {
      const a = points[i - 1];
      return b.frame === a.frame ? b.db : a.db + ((b.db - a.db) * (frame - a.frame)) / (b.frame - a.frame);
    }
  }
  return points[points.length - 1].db;
}

export function normalizeLine(points: readonly Breakpoint[], pick: (a: number, b: number) => number = Math.min): Breakpoint[] {
  const by = new Map<number, number>();
  for (const p of points) {
    const f = Math.round(p.frame);
    by.set(f, by.has(f) ? pick(by.get(f)!, p.db) : p.db);
  }
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([frame, db]) => ({ frame, db }));
}

export function simplifyLine(points: readonly Breakpoint[], eps = 1e-6): Breakpoint[] {
  const out: Breakpoint[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (out.length && i < points.length - 1) {
      const a = out[out.length - 1], b = points[i + 1];
      const onLine = b.frame === a.frame ? Math.abs(p.db - a.db) < eps : Math.abs(a.db + ((b.db - a.db) * (p.frame - a.frame)) / (b.frame - a.frame) - p.db) < eps;
      if (onLine) continue;
    }
    if (out.length && i === points.length - 1 && Math.abs(out[out.length - 1].db - p.db) < eps) continue;
    out.push(p);
  }
  return out;
}

export type DipRun = { start: number; end: number; depthDb: number };

export function dipRuns(depthByFrame: ReadonlyMap<number, number>, mergeGap = 3): DipRun[] {
  const frames = [...depthByFrame.keys()].sort((a, b) => a - b);
  const runs: DipRun[] = [];
  for (const f of frames) {
    const d = depthByFrame.get(f)!;
    const last = runs[runs.length - 1];
    if (last && f - last.end <= mergeGap) {
      last.end = Math.max(last.end, f);
      last.depthDb = Math.max(last.depthDb, d);
    } else runs.push({ start: f, end: f, depthDb: d });
  }
  return runs;
}

export function dipLine(runs: readonly DipRun[]): Breakpoint[] {
  const pts: Breakpoint[] = [];
  for (const r of runs) {
    if (r.start > 0) pts.push({ frame: r.start - 1, db: 0 });
    pts.push({ frame: r.start, db: -r.depthDb });
    pts.push({ frame: r.end + 1, db: -r.depthDb });
    pts.push({ frame: r.end + 2, db: 0 });
  }
  return pts.length ? normalizeLine(pts) : [{ frame: 0, db: 0 }];
}

export function dipAt(runs: readonly DipRun[], frame: number): number {
  for (const r of runs) if (frame >= r.start && frame <= r.end) return r.depthDb;
  return 0;
}

export function dippedFrames(runs: readonly DipRun[]): Set<number> {
  const out = new Set<number>();
  for (const r of runs) for (let f = Math.max(0, r.start - 1); f <= r.end + 1; f += 1) out.add(f);
  return out;
}

export const shiftLine = (points: readonly Breakpoint[], db: number): Breakpoint[] => points.map((p) => ({ frame: p.frame, db: p.db + db }));

export type ClipLevel = { volumeDb: number } | { volumeKeys: { atSeconds: number; volumeDb: number }[] };

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

export function clipLevel(points: readonly Breakpoint[], clip: { start: number; end: number }, fps: number): ClipLevel {
  const last = clip.end - 1;
  const keys: Breakpoint[] = [{ frame: clip.start, db: lineValue(points, clip.start) }];
  for (const p of points) if (p.frame > clip.start && p.frame <= last) keys.push(p);
  if (keys[keys.length - 1].frame < last && points.some((p) => p.frame > last)) keys.push({ frame: last, db: lineValue(points, last) });
  const line = simplifyLine(keys);
  if (line.length === 1 || line.every((k) => Math.abs(k.db - line[0].db) < 1e-9)) return { volumeDb: round6(line[0].db) };
  return { volumeKeys: line.map((k) => ({ atSeconds: (k.frame - clip.start) / fps, volumeDb: round6(k.db) })) };
}

export function levelAt(level: ClipLevel, clipStart: number, frame: number, fps: number): number {
  if ("volumeDb" in level) return level.volumeDb;
  return lineValue(level.volumeKeys.map((k) => ({ frame: clipStart + Math.round(k.atSeconds * fps), db: k.volumeDb })), frame);
}

export function fadeFrames(fadeInSeconds: number, fadeOutSeconds: number, lengthFrames: number, fps: number): { in: number; out: number } {
  const last = Math.max(0, Math.ceil(lengthFrames) - 1);
  const fin = Math.min(last, Math.max(0, Math.round(fadeInSeconds * fps)));
  const room = fin > 0 ? last - fin - 1 : last;
  return { in: fin, out: Math.min(Math.max(0, room), Math.max(0, Math.round(fadeOutSeconds * fps))) };
}

export function fadeSafeLine(points: readonly Breakpoint[], lengthFrames: number, fades: { in: number; out: number }): Breakpoint[] {
  const last = Math.max(0, lengthFrames - 1);
  const topIn = fades.in, topOut = last - fades.out;
  const keep = points.filter((p) => p.frame >= 0 && p.frame <= last && !(fades.in > 0 && p.frame > 0 && p.frame < topIn) && !(fades.out > 0 && p.frame > topOut));
  const add: Breakpoint[] = [{ frame: 0, db: lineValue(points, 0) }];
  if (fades.in > 0) add.push({ frame: topIn, db: lineValue(points, topIn) });
  if (fades.out > 0) add.push({ frame: topOut, db: lineValue(points, topOut) });
  return normalizeLine([...keep.filter((p) => !add.some((a) => a.frame === p.frame)), ...add], (a) => a);
}
