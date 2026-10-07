export type YuNetFace = { box: number[]; landmarks: [number, number][]; score: number };

export type FaceBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
  landmarks: [number, number][];
};

export type FaceSample = {
  t: number;
  frame: number;
  faces: FaceBox[];
};

export const FACE_RULES = { score: 0.85, minHeight: 0.05, minRatio: 0.5, maxRatio: 1.6, maxMove: 1.25, maxResize: 1.8, ambiguousShare: 0.6 } as const;

export function toSourceFaces(rows: YuNetFace[], aw: number, ah: number, sw: number, sh: number): FaceBox[] {
  const kx = sw / aw, ky = sh / ah;
  return rows.map((r) => ({
    x: r.box[0] * kx,
    y: r.box[1] * ky,
    w: r.box[2] * kx,
    h: r.box[3] * ky,
    score: r.score,
    landmarks: r.landmarks.map((p) => [p[0] * kx, p[1] * ky] as [number, number]),
  }));
}

export function plausibleFaces(faces: FaceBox[], sw: number, sh: number): FaceBox[] {
  return faces.filter((f) => {
    if (!(f.score >= FACE_RULES.score) || !(f.h >= FACE_RULES.minHeight * sh) || !(f.w > 0)) return false;
    const ratio = f.w / f.h;
    return ratio > FACE_RULES.minRatio && ratio < FACE_RULES.maxRatio && f.x + f.w > 0 && f.x < sw;
  });
}

export function faceStep(a: FaceBox, b: FaceBox): number {
  const resize = Math.max(b.w / a.w, a.w / b.w, b.h / a.h, a.h / b.h);
  if (!(resize <= FACE_RULES.maxResize)) return Infinity;
  const d = Math.hypot(b.x + b.w / 2 - a.x - a.w / 2, b.y + b.h / 2 - a.y - a.h / 2);
  return d / Math.max(a.w, a.h, b.w, b.h);
}

export const median = (xs: number[]): number => {
  if (!xs.length) return NaN;
  const v = xs.slice().sort((a, b) => a - b);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function yawCue(f: FaceBox): number {
  const [re, le, nose] = f.landmarks;
  if (!re || !le || !nose) return 0;
  const mid = (re[0] + le[0]) / 2;
  return (nose[0] - mid) / Math.max(1, Math.abs(le[0] - re[0]));
}

export type TrackPick = { picks: (FaceBox | null)[]; tracks: number; ambiguous: boolean };

export function mainFaceTrack(samples: { faces: FaceBox[] }[]): TrackPick {
  type Track = { rows: { i: number; f: FaceBox }[]; last: FaceBox; lastI: number };
  const tracks: Track[] = [];
  samples.forEach((s, i) => {
    for (const face of s.faces) {
      let best: Track | null = null;
      let bestStep = Infinity;
      for (const t of tracks) {
        if (t.lastI === i) continue;
        const v = faceStep(t.last, face);
        if (v < bestStep) {
          best = t;
          bestStep = v;
        }
      }
      if (best === null || bestStep > FACE_RULES.maxMove) {
        best = { rows: [], last: face, lastI: i };
        tracks.push(best);
      }
      best.rows.push({ i, f: face });
      best.last = face;
      best.lastI = i;
    }
  });
  const picks: (FaceBox | null)[] = samples.map(() => null);
  if (!tracks.length) return { picks, tracks: 0, ambiguous: false };
  const n = Math.max(1, samples.length);
  const weight = (t: Track) => (t.rows.length / n) * median(t.rows.map((r) => r.f.h)) * mean(t.rows.map((r) => r.f.score));
  const ranked = tracks.map((t) => ({ t, w: weight(t) })).sort((a, b) => b.w - a.w);
  for (const r of ranked[0].t.rows) picks[r.i] = r.f;
  const ambiguous = ranked.length > 1 && ranked[1].w > FACE_RULES.ambiguousShare * ranked[0].w;
  return { picks, tracks: tracks.length, ambiguous };
}

export type SegmentFaces = {
  samples: number;
  withFace: number;
  coverage: number;
  maxFaces: number;
  tracks: number;
  ambiguous: boolean;
  cx: number | null;
  cy: number | null;
  faceW: number | null;
  faceH: number | null;
  yaw: number | null;
  padLeft: number | null;
  padRight: number | null;
};

export const FACE_PADDING = 0.2;

export function segmentFaces(samples: FaceSample[]): SegmentFaces {
  const ordered = samples.slice().sort((a, b) => a.t - b.t);
  const pick = mainFaceTrack(ordered);
  const faces = pick.picks.filter((f): f is FaceBox => f != null);
  const maxFaces = ordered.reduce((m, s) => Math.max(m, s.faces.length), 0);
  if (!faces.length) {
    return { samples: ordered.length, withFace: 0, coverage: 0, maxFaces, tracks: pick.tracks, ambiguous: false, cx: null, cy: null, faceW: null, faceH: null, yaw: null, padLeft: null, padRight: null };
  }
  return {
    samples: ordered.length,
    withFace: faces.length,
    coverage: faces.length / Math.max(1, ordered.length),
    maxFaces,
    tracks: pick.tracks,
    ambiguous: pick.ambiguous,
    cx: median(faces.map((f) => f.x + f.w / 2)),
    cy: median(faces.map((f) => f.y + f.h / 2)),
    faceW: median(faces.map((f) => f.w)),
    faceH: median(faces.map((f) => f.h)),
    yaw: median(faces.map(yawCue)),
    padLeft: Math.min(...faces.map((f) => f.x - f.w * FACE_PADDING)),
    padRight: Math.max(...faces.map((f) => f.x + f.w * (1 + FACE_PADDING))),
  };
}
