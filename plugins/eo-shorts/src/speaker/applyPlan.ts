import type { CameraSegment } from "./cameraCuts.ts";
import type { ClipTransformValue } from "./framing.ts";
import { type PieceTime, cutSplitFrame } from "./sourceTime.ts";

export type SegmentFraming = CameraSegment & { cx: number; transform: ClipTransformValue };

export type PlacedPiece = PieceTime & { path?: string | null };

export type FramingTarget = {
  startFrame: number;
  endFrame: number;
  clipId: number;
  segmentId: string | null;
  transform: ClipTransformValue;
  via: "segment" | "nearest-segment" | "borrowed";
};

export type ApplyPlan = {
  boundaries: number[];
  splits: number[];
  targets: FramingTarget[];
  warnings: string[];
};

export function planApply(pieces: PlacedPiece[], segments: SegmentFraming[], draftFps: number): ApplyPlan {
  const sorted = pieces.slice().sort((a, b) => a.startFrame - b.startFrame);
  const boundaries = Array.from(new Set(sorted.flatMap((p) => [p.startFrame, p.endFrame]))).sort((a, b) => a - b);
  const splits: number[] = [];
  const targets: (FramingTarget | null)[] = [];
  const pending: { startFrame: number; endFrame: number; clipId: number }[] = [];
  const warnings: string[] = [];
  for (const p of sorted) {
    if (p.t0 == null && p.resourceId == null) {
      warnings.push("Main piece " + p.startFrame + "–" + p.endFrame + " has no media; it is left as it is.");
      continue;
    }
    if (p.t0 == null) {
      targets.push(null);
      pending.push({ startFrame: p.startFrame, endFrame: p.endFrame, clipId: p.clipId });
      warnings.push("Main piece " + p.startFrame + "–" + p.endFrame + " has no source time (no words, and no seam or neighbour that measures it); it borrows a neighbour's framing.");
      continue;
    }
    const t0 = p.t0;
    const mine = segments.filter((s) => sameFile(s, p));
    const ks: number[] = [];
    for (const s of mine) {
      if (!s.cut) continue;
      const k = cutSplitFrame(s.start, t0, draftFps);
      if (k > p.startFrame && k < p.endFrame) ks.push(k);
    }
    const cutsAt = Array.from(new Set(ks)).sort((a, b) => a - b);
    splits.push(...cutsAt);
    const edges = [p.startFrame, ...cutsAt, p.endFrame];
    for (let i = 0; i + 1 < edges.length; i += 1) {
      const a = edges[i], b = edges[i + 1];
      const mid = t0 + (a + b) / 2 / draftFps;
      let seg = mine.find((s) => mid >= s.start && mid < s.end) || null;
      let via: FramingTarget["via"] = "segment";
      if (!seg && mine.length) {
        seg = mine.slice().sort((x, y) => distance(x, mid) - distance(y, mid))[0];
        via = "nearest-segment";
      }
      if (!seg) {
        targets.push(null);
        pending.push({ startFrame: a, endFrame: b, clipId: p.clipId });
        warnings.push("Main piece " + a + "–" + b + " has no analysed camera segment; it borrows a neighbour's framing.");
        continue;
      }
      targets.push({ startFrame: a, endFrame: b, clipId: p.clipId, segmentId: seg.id, transform: seg.transform, via });
    }
  }
  const framed = targets.filter((t): t is FramingTarget => t != null);
  const out: FramingTarget[] = [];
  let k = 0;
  for (const t of targets) {
    if (t) {
      out.push(t);
      continue;
    }
    const p = pending[k++];
    const near = framed.slice().sort((x, y) => gap(x, p) - gap(y, p))[0];
    if (!near) throw new Error("No Main piece could be framed: the speaker's source time is unknown everywhere.");
    out.push({ ...p, segmentId: near.segmentId, transform: near.transform, via: "borrowed" });
  }
  return { boundaries, splits: Array.from(new Set(splits)).sort((a, b) => a - b), targets: out.sort((a, b) => a.startFrame - b.startFrame), warnings };
}

function sameFile(s: CameraSegment, p: PlacedPiece): boolean {
  if (p.path != null && s.path != null) return s.path === p.path;
  return p.resourceId == null || !s.resourceIds.length || s.resourceIds.includes(p.resourceId);
}

export function shownFrames(p: { t0: number | null; startFrame: number; endFrame: number }, start: number, end: number, draftFps: number): [number, number] | null {
  if (p.t0 == null) return null;
  const a = Math.max(p.startFrame, cutSplitFrame(start, p.t0, draftFps));
  const b = Math.min(p.endFrame, cutSplitFrame(end, p.t0, draftFps));
  return b > a ? [a, b] : null;
}

const distance = (s: CameraSegment, t: number) => (t < s.start ? s.start - t : t >= s.end ? t - s.end : 0);
const gap = (a: { startFrame: number; endFrame: number }, b: { startFrame: number; endFrame: number }) =>
  a.endFrame <= b.startFrame ? b.startFrame - a.endFrame : b.endFrame <= a.startFrame ? a.startFrame - b.endFrame : 0;
