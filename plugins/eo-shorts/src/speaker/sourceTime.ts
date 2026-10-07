export type MainPiece = {
  clipId: number;
  startFrame: number;
  endFrame: number;
  resourceId: string | null;
  playbackSpeed?: { numerator: number; denominator: number } | null;
};

export type WordLite = {
  startFrame: number;
  endFrame: number;
  sourceStartFrame: number | null;
  sourceResourceId?: string | null;
  cut?: boolean;
};

export type SeamLite = {
  playbackFrame: number;
  hiddenDraftFrames: number;
  sourceJump: boolean | null;
  sourceGap: { resourceId: string; startFrame: number; endFrame: number; fps: number } | null;
};

export type OffsetSource = "words" | "seam-gap" | "neighbor";

export type PieceTime = MainPiece & {
  t0: number | null;
  via: OffsetSource | null;
  words: number;
  spreadS: number;
};

export function nonUnitSpeedPieces(pieces: MainPiece[]): MainPiece[] {
  return pieces.filter((p) => p.playbackSpeed != null && p.playbackSpeed.numerator !== p.playbackSpeed.denominator);
}

const median = (xs: number[]): number => {
  const v = xs.slice().sort((a, b) => a - b);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

export function pieceSourceOffsets(
  pieces: MainPiece[],
  words: WordLite[],
  seams: SeamLite[],
  draftFps: number,
  resourceFps: (resourceId: string | null) => number
): PieceTime[] {
  if (!(draftFps > 0)) throw new Error("The draft has no frame rate.");
  const sorted = pieces.slice().sort((a, b) => a.startFrame - b.startFrame);
  const out: PieceTime[] = sorted.map((p) => {
    const fps = resourceFps(p.resourceId);
    const inside = words.filter((w) => (!w.sourceResourceId || w.sourceResourceId === p.resourceId) && !w.cut && w.sourceStartFrame != null && w.startFrame >= p.startFrame && w.startFrame < p.endFrame);
    if (!inside.length || !(fps > 0)) return { ...p, t0: null, via: null, words: 0, spreadS: 0 };
    const offs = inside.map((w) => (w.sourceStartFrame as number) / fps - w.startFrame / draftFps);
    return { ...p, t0: median(offs), via: "words", words: inside.length, spreadS: Math.max(...offs) - Math.min(...offs) };
  });
  const seamAt = new Map<number, SeamLite>();
  for (const s of seams) seamAt.set(s.playbackFrame, s);

  for (const p of out) {
    if (p.t0 != null) continue;
    const before = seamAt.get(p.startFrame);
    const after = seamAt.get(p.endFrame);
    if (before && before.sourceGap && before.sourceGap.fps > 0) {
      setOffset(p, before.sourceGap.endFrame / before.sourceGap.fps - p.startFrame / draftFps, "seam-gap");
    } else if (after && after.sourceGap && after.sourceGap.fps > 0) {
      setOffset(p, after.sourceGap.startFrame / after.sourceGap.fps - p.endFrame / draftFps, "seam-gap");
    }
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < out.length; i += 1) {
      const p = out[i];
      if (p.t0 != null) continue;
      const prev = i > 0 ? out[i - 1] : null;
      const next = i + 1 < out.length ? out[i + 1] : null;
      if (prev && prev.t0 != null && prev.endFrame === p.startFrame && prev.resourceId === p.resourceId) {
        const hidden = hiddenAcross(seamAt.get(p.startFrame));
        if (hidden != null) {
          setOffset(p, prev.t0 + hidden / draftFps, "neighbor");
          changed = true;
          continue;
        }
      }
      if (next && next.t0 != null && next.startFrame === p.endFrame && next.resourceId === p.resourceId) {
        const hidden = hiddenAcross(seamAt.get(p.endFrame));
        if (hidden != null) {
          setOffset(p, next.t0 - hidden / draftFps, "neighbor");
          changed = true;
        }
      }
    }
  }
  return out;
}

function hiddenAcross(seam: SeamLite | undefined): number | null {
  if (!seam || seam.sourceJump === false) return 0;
  if (seam.sourceJump === null && seam.hiddenDraftFrames >= 0) return seam.hiddenDraftFrames;
  return null;
}

function setOffset(p: PieceTime, t0: number, via: OffsetSource) {
  p.t0 = t0;
  p.via = via;
  p.words = 0;
  p.spreadS = 0;
}

export function pieceSourceRange(p: { t0: number | null; startFrame: number; endFrame: number }, draftFps: number): [number, number] | null {
  if (p.t0 == null) return null;
  return [p.t0 + p.startFrame / draftFps, p.t0 + p.endFrame / draftFps];
}

export function sourceTimeAt(t0: number, frame: number, draftFps: number): number {
  return t0 + frame / draftFps;
}

const CEIL_EPS = 1e-6;

export function cutSplitFrame(tCut: number, t0: number, draftFps: number): number {
  return Math.ceil((tCut - t0) * draftFps - CEIL_EPS);
}

export function cutTimeFromFileFrame(c: number, fileFps: number): number {
  return c / fileFps;
}

export function fileFrameAt(t: number, fileFps: number): number {
  return Math.round(t * fileFps);
}
