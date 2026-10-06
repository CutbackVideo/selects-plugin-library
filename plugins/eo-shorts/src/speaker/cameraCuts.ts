import type { DecodeSpan } from "./ffmpegPass.ts";

export type CameraCut = { frame: number; time: number; score: number };

export type CameraSegment = {
  id: string;
  path: string;
  resourceIds: string[];
  start: number;
  end: number;
  cut: CameraCut | null;
};

export const MIN_SHOT_S = 0.5;

export function cameraSegments(span: DecodeSpan, cuts: CameraCut[], prefix: string, minShotS: number = MIN_SHOT_S): CameraSegment[] {
  const inside = cuts
    .filter((c) => c.time > span.start && c.time < span.end)
    .sort((a, b) => a.time - b.time)
    .filter((c, i, all) => i === 0 || c.frame !== all[i - 1].frame);
  type Piece = { start: number; end: number; cut: CameraCut | null };
  let pieces: Piece[] = [];
  let from = span.start;
  let cut: CameraCut | null = null;
  for (const c of inside) {
    pieces.push({ start: from, end: c.time, cut });
    from = c.time;
    cut = c;
  }
  pieces.push({ start: from, end: span.end, cut });
  for (let i = 1; i + 1 < pieces.length; ) {
    const p = pieces[i];
    if (p.end - p.start >= minShotS) {
      i += 1;
      continue;
    }
    pieces[i - 1] = { ...pieces[i - 1], end: p.end };
    pieces = pieces.slice(0, i).concat(pieces.slice(i + 1));
  }
  return pieces.map((p, i) => ({ id: prefix + (i + 1), path: span.path, resourceIds: span.resourceIds.slice(), start: p.start, end: p.end, cut: p.cut }));
}
