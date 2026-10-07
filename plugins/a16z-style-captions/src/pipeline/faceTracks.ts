// Style-owned speaker tracking. Shared YuNet owns inference; this module owns shot selection.
export type DetectedFace = { box: { xmin: number; ymin: number; xmax: number; ymax: number }; score: number; landmarks: { x: number; y: number }[] };
export type Face = { cx: number; eyes: number; h: number; w: number; top: number };
export type FaceShot = { start: number; end: number; face: Face | null };
export type SourceFaces = { W: number; H: number; shots: FaceShot[] };
export type FaceSample = { sourceTimeSeconds: number; faces: DetectedFace[] };
type Row = { b: number[]; ex: number; ey: number; score: number };
const median = (xs: number[]) => { const v = xs.slice().sort((a, b) => a - b), m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
function iou(a: number[], b: number[]) {
  const area = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
  return area / (a[2] * a[3] + b[2] * b[3] - area + 1e-9);
}
function rows(sample: FaceSample, W: number, H: number): Row[] {
  return sample.faces.flatMap(f => {
    const b = f.box, w = b.xmax - b.xmin, h = b.ymax - b.ymin;
    if (f.score < 0.8 || h < H * 0.05 || w / h <= 0.5 || w / h >= 1.6) return [];
    return [{ b: [b.xmin / W, b.ymin / H, w / W, h / H], ex: (f.landmarks[0].x + f.landmarks[1].x) / 2 / W, ey: (f.landmarks[0].y + f.landmarks[1].y) / 2 / H, score: f.score }];
  });
}
export function speakerShots(samples: FaceSample[], cuts: number[], start: number, end: number, W: number, H: number): SourceFaces {
  if (![start,end,W,H].every(Number.isFinite) || start < 0 || end <= start || W <= 0 || H <= 0) throw new Error("Invalid source face clock.");
  let previous = -Infinity;
  for (const sample of samples) {
    if (!Number.isFinite(sample.sourceTimeSeconds) || sample.sourceTimeSeconds <= previous || sample.sourceTimeSeconds < start - 1e-6 || sample.sourceTimeSeconds >= end || !Array.isArray(sample.faces) || sample.faces.length > 64) throw new Error("Invalid shared face sample order.");
    previous = sample.sourceTimeSeconds;
    for (const face of sample.faces) {
      const b = face.box;
      if (!b || ![b.xmin,b.ymin,b.xmax,b.ymax,face.score].every(Number.isFinite) || b.xmin < 0 || b.ymin < 0 || b.xmax > W || b.ymax > H || b.xmax <= b.xmin || b.ymax <= b.ymin || face.score < 0 || face.score > 1 || !Array.isArray(face.landmarks) || face.landmarks.length !== 5 || face.landmarks.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error("Invalid shared face geometry.");
    }
  }
  const bounds = [start, ...cuts.filter(t => t > start && t < end), end].sort((a, b) => a - b);
  const shots: FaceShot[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const ss = samples.filter(s => s.sourceTimeSeconds >= bounds[i] && s.sourceTimeSeconds < bounds[i + 1]);
    const tracks: { rows: Row[]; last: number[]; lastSample: number }[] = [];
    ss.forEach((s, si) => { for (const face of rows(s, W, H)) {
      const best = tracks.slice().sort((a, b) => iou(b.last, face.b) - iou(a.last, face.b))[0];
      const track = !best || iou(best.last, face.b) < 0.3 || best.lastSample === si ? { rows: [], last: face.b, lastSample: si } : best;
      if (track !== best) tracks.push(track);
      track.rows.push(face); track.last = face.b; track.lastSample = si;
    } });
    const weight = (t: typeof tracks[number]) => t.rows.length / Math.max(1, ss.length) * median(t.rows.map(r => r.b[3])) * t.rows.reduce((n, r) => n + r.score, 0) / t.rows.length;
    tracks.sort((a, b) => weight(b) - weight(a));
    const selected = tracks[0]?.rows, med = (fn: (r: Row) => number) => Math.round(median(selected!.map(fn)) * 1e4) / 1e4;
    const shot: FaceShot = { start: bounds[i], end: bounds[i + 1], face: selected ? { cx: med(r => r.ex), eyes: med(r => r.ey), h: med(r => r.b[3]), w: med(r => r.b[2]), top: med(r => r.b[1]) } : null };
    const previous = shots.at(-1);
    if (previous && (shot.end - shot.start < 0.5 || previous.end - previous.start < 0.5)) {
      const keep = (previous.face && previous.end - previous.start >= shot.end - shot.start) || !shot.face ? previous : shot;
      shots[shots.length - 1] = { ...keep, start: previous.start, end: shot.end };
    } else shots.push(shot);
  }
  return { W, H, shots };
}
