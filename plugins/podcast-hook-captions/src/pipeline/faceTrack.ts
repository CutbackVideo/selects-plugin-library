// face_track.py in the panel: every step of scripts/face_track.py (the Python/OpenCV face tracker it replaces),
// ported line by line so the same source range gives the same shots, faces and colour figures.
//
// Per job {id, path, start, end} (source seconds):
// 1. Size and sampling: f0 = round(start * fps), f1 = max(f0 + 1, round(end * fps)), step = round(fps / 6), the
//    analysis frame scaled to a 640 long side; every step-th frame from f0 up to f1 (faceFrames.ts).
// 2. Colour: every third sample, at most 40: channel means, mean HSV saturation / 255, gray P5 / P95.
// 3. Cuts: an HSV 32x16 hue-saturation histogram per sample; a CHISQR_ALT distance above 0.35 to the previous
//    sample starts a new shot at that frame.
// 4. Faces: YuNet (score >= 0.8, NMS 0.3), kept when at least 5% of the frame high and 0.5 < w/h < 1.6 in source
//    pixels; per shot the faces are linked into tracks by overlap (IoU >= 0.3, one face per track and sample) and the
//    track seen most often, largest and most confidently gives the shot's face (medians of its boxes).
// 5. Shots shorter than half a second fold into their neighbour; colour is the median of the colour samples.
// Arithmetic follows the Python: float32 where NumPy computed in float32 (the detector's rows), NumPy's median /
// mean / percentile, and Python's round() for every figure written out.
import { type VideoInfo, type SamplePlan, probeVideo, sampleFrames } from "./faceFrames";
import { type ColorRow, chiSquareAlt, frameStats, npMean, npMedian, pyRound } from "./cvstats";
import type { YuNetFace } from "./yunetDecode";

/** face_track.py's options as faces.ts ran it (--fps 6, defaults otherwise). */
export const TRACK = { fps: 6, score: 0.8, minFace: 0.05, cut: 0.35, longSide: 640, colorSamples: 40, minShot: 0.5 };

export type FaceJob = { id: any; path: string; start: number; end: number };
export type TrackedFace = { cx: number; eyes: number; h: number; w: number; top: number; coverage: number };
export type TrackedShot = { start: number; end: number; face: TrackedFace | null; faces: number; ambiguous: boolean };
export type TrackedColor = { r: number; g: number; b: number; sat: number; p5: number; p95: number };
export type JobResult =
  | { id: any; width: number; height: number; fps: number; shots: TrackedShot[]; color: TrackedColor | null; error?: undefined }
  | { id: any; error: string };

/** The detector: faces in a packed BGR24 image, in that image's pixels (faceRuntime.ts). */
export type Detect = (bgr: Uint8Array, width: number, height: number) => Promise<YuNetFace[]>;

type Box = [number, number, number, number];
type Face = { b: Box; ex: number; ey: number; s: number };
type Sample = { f: number; faces: Face[] };
type Track = { rows: Face[]; last: Box | null; lastF: number | null };

const F = Math.fround;
const SCORE = F(TRACK.score);
const MIN_FACE = F(TRACK.minFace);
const MIN_RATIO = F(0.5);
const MAX_RATIO = F(1.6);

/** face_track.py lines 52-57: the frames a job samples and the analysis size. */
export function samplePlan(info: VideoInfo, start: number, end: number): SamplePlan {
  const fps = info.fps;
  const f0 = Math.max(0, pyRound(Number(start) * fps));
  const f1 = Math.max(f0 + 1, pyRound(Number(end) * fps));
  const step = Math.max(1, pyRound(fps / TRACK.fps));
  const k = Math.min(1.0, TRACK.longSide / Math.max(info.W, info.H));
  return { f0, f1, step, w: Math.max(1, pyRound(info.W * k)), h: Math.max(1, pyRound(info.H * k)), count: Math.ceil((f1 - f0) / step) };
}

/** The detector's rows as face_track.py keeps them (lines 79-87): fractions of the frame, float32 maths. */
export function keepFaces(rows: YuNetFace[], plan: SamplePlan, info: VideoInfo): Face[] {
  const sw = plan.w, sh = plan.h;
  const faces: Face[] = [];
  for (const r of rows) {
    const x = F(r.box[0] / sw), y = F(r.box[1] / sh), w = F(r.box[2] / sw), h = F(r.box[3] / sh);
    const ratio = F(F(w * info.W) / F(h * info.H));
    if (F(r.score) < SCORE || h < MIN_FACE || !(MIN_RATIO < ratio && ratio < MAX_RATIO)) continue;
    const eyes = F(F(F(r.landmarks[0][1] + r.landmarks[1][1]) / 2) / sh);
    const eyeX = F(F(F(r.landmarks[0][0] + r.landmarks[1][0]) / 2) / sw);
    faces.push({ b: [x, y, w, h], ex: eyeX, ey: eyes, s: F(r.score) });
  }
  return faces;
}

function iou(a: Box, b: Box): number {
  const ax2 = a[0] + a[2], ay2 = a[1] + a[3], bx2 = b[0] + b[2], by2 = b[1] + b[3];
  const iw = Math.max(0.0, Math.min(ax2, bx2) - Math.max(a[0], b[0]));
  const ih = Math.max(0.0, Math.min(ay2, by2) - Math.max(a[1], b[1]));
  const inter = iw * ih;
  return inter / (a[2] * a[3] + b[2] * b[3] - inter + 1e-9);
}

/** face_track.py lines 89-128: shots from the cut frames, each shot's main face, then short shots folded. */
export function buildShots(samples: Sample[], cuts: number[], f1: number, fps: number): TrackedShot[] {
  const bounds = cuts.concat([f1]);
  const shots: TrackedShot[] = [];
  for (let i = 0; i < cuts.length; i += 1) {
    const ss = samples.filter((s) => bounds[i] <= s.f && s.f < bounds[i + 1]);
    const shot: TrackedShot = { start: pyRound(bounds[i] / fps, 4), end: pyRound(bounds[i + 1] / fps, 4), face: null, faces: 0, ambiguous: false };
    if (ss.length) {
      const tracks: Track[] = [];
      for (const s of ss) {
        for (const face of s.faces) {
          // max(tracks, key=iou): the first of equal overlaps
          let best: Track | null = null;
          let bestIou = -Infinity;
          for (const t of tracks) {
            const v = iou(t.last!, face.b);
            if (v > bestIou) {
              best = t;
              bestIou = v;
            }
          }
          if (best === null || bestIou < 0.3 || best.lastF === s.f) {
            best = { rows: [], last: null, lastF: null };
            tracks.push(best);
          }
          best.rows.push(face);
          best.last = face.b;
          best.lastF = s.f;
        }
      }
      const weight = (t: Track) => (t.rows.length / ss.length) * npMedian(t.rows.map((r) => r.b[3])) * npMean(t.rows.map((r) => r.s));
      const weights = new Map(tracks.map((t) => [t, weight(t)] as [Track, number]));
      const ranked = tracks.slice().sort((a, b) => weights.get(b)! - weights.get(a)!); // stable, like sorted(reverse=True)
      shot.faces = Math.max(...ss.map((s) => s.faces.length));
      if (ranked.length) {
        const m = ranked[0].rows;
        const med = (key: (r: Face) => number) => pyRound(npMedian(m.map(key)), 4);
        shot.face = {
          cx: med((r) => r.ex),
          eyes: med((r) => r.ey),
          h: med((r) => r.b[3]),
          w: med((r) => r.b[2]),
          top: med((r) => r.b[1]),
          coverage: pyRound(m.length / ss.length, 3),
        };
        shot.ambiguous = ranked.length > 1 && weights.get(ranked[1])! > 0.6 * weights.get(ranked[0])!;
      }
    }
    shots.push(shot);
  }
  // A "shot" shorter than half a second is usually a flash or a dissolve: fold it into its neighbour.
  const merged: TrackedShot[] = [];
  for (const s of shots) {
    const last = merged.length ? merged[merged.length - 1] : null;
    if (last && (s.end - s.start < TRACK.minShot || last.end - last.start < TRACK.minShot)) {
      const keep = (last.face && last.end - last.start >= s.end - s.start) || !s.face ? last : s;
      merged[merged.length - 1] = { ...keep, start: last.start, end: s.end };
    } else merged.push(s);
  }
  return merged;
}

/** face_track.py lines 129-133: the per-column median of the colour samples, rounded as the Python rounds it. */
export function colorSummary(colors: ColorRow[]): TrackedColor | null {
  if (!colors.length) return null;
  const m = [0, 1, 2, 3, 4, 5].map((k) => npMedian(colors.map((c) => c[k])));
  return { r: pyRound(m[0], 1), g: pyRound(m[1], 1), b: pyRound(m[2], 1), sat: pyRound(m[3], 3), p5: pyRound(m[4], 1), p95: pyRound(m[5], 1) };
}

export type ScanOptions = {
  workDir: string; // chunk files go here (created and emptied by the scan)
  signal?: AbortSignal;
  onFrame?: (done: number) => void; // after every sample
  onSample?: (f: number, faces: YuNetFace[]) => void; // the detector's rows per sample (tests)
  frames?: (info: VideoInfo, plan: SamplePlan) => AsyncIterable<Uint8Array>; // another frame source (tests)
};

/** One job, as face_track.py's scan(job) computes it. A source that cannot be read gives {id, error}. */
export async function scanJob(job: FaceJob, detect: Detect, o: ScanOptions): Promise<JobResult> {
  let info: VideoInfo;
  try {
    info = await probeVideo(job.path, o.signal);
  } catch (e) {
    if (o.signal && o.signal.aborted) throw e;
    return { id: job.id, error: "cannot open source" };
  }
  return scanProbed(job, info, samplePlan(info, job.start, job.end), detect, o);
}

export async function scanProbed(job: FaceJob, info: VideoInfo, plan: SamplePlan, detect: Detect, o: ScanOptions): Promise<JobResult> {
  const samples: Sample[] = [];
  const cuts = [plan.f0];
  const colors: ColorRow[] = [];
  let prev: Float32Array | null = null;
  let i = 0;
  const frames = o.frames ? o.frames(info, plan) : sampleFrames(job.path, info, plan, o.workDir, String(job.id).replace(/[^\w-]/g, "_"), o.signal);
  for await (const img of frames) {
    const f = plan.f0 + i * plan.step;
    i += 1;
    const wantColor = colors.length < TRACK.colorSamples && (f - plan.f0) % (plan.step * 3) === 0;
    const st = frameStats(img, plan.w, plan.h, wantColor);
    if (st.color) colors.push(st.color);
    if (prev !== null && chiSquareAlt(prev, st.hist) > TRACK.cut) cuts.push(f);
    prev = st.hist;
    const rows = await detect(img, plan.w, plan.h);
    if (o.onSample) o.onSample(f, rows);
    samples.push({ f, faces: keepFaces(rows, plan, info) });
    if (o.onFrame) o.onFrame(i);
  }
  return { id: job.id, width: info.W, height: info.H, fps: info.fps, shots: buildShots(samples, cuts, plan.f1, info.fps), color: colorSummary(colors) };
}
