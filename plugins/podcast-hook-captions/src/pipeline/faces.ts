// Face inference uses the public shared AI runtime. Shot tracking, cut/color sampling, and framing stay here.
import { fs, J, type Sdk } from "./host";
import type { ReelClip } from "./reel";
import type { ShotFrame } from "../plan";
import { type FaceJob, type JobResult, scanProbed, samplePlan } from "./faceTrack";
import { probeVideo, verifyConstantSourceClock } from "./faceFrames";
import { faceInput, adaptSamples } from "./sharedAiFaces.cjs";
import { detectShared } from "./sharedFaceJobs";

// Reference framing (YuNet box on the finished reel): face box 40% of the height, centre 46% across, eye
// line 22-24% down. The source is never enlarged more than 2.8x its own pixels (the reference itself
// runs a 1080p source at about 2.8x), so a small 1080p speaker lands a little under 40%.
const TARGET = { faceH: 0.36, cx: 0.51, eyes: 0.21, maxUpscale: 2.8 };

export type FaceShot = { start: number; end: number; face: { cx: number; eyes: number; h: number; w: number; top: number } | null };

export type SrcColor = { r: number; g: number; b: number; sat: number; p5: number; p95: number };
export type ClipFaces = { W: number; H: number; shots: FaceShot[]; color?: SrcColor | null };

// The speaker grade, adapted to the source: the reference roughly doubles saturation and warms a
// neutral picture; a source that is already saturated or warm gets less, so skin does not go orange.
export function adaptiveGrade(faces: Record<number, ClipFaces>) {
  const cs = Object.values(faces).map((f) => f.color).filter(Boolean) as SrcColor[];
  const med = (k: keyof SrcColor, d: number) => {
    if (!cs.length) return d;
    const v = cs.map((c) => c[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const sat = med("sat", 0.15);
  const warm = (med("r", 100) - med("b", 100)) / Math.max(1, med("g", 100));
  const f = Math.max(1.1, Math.min(1.7, 1 + (0.42 - sat) * 2.2));
  const hot = warm > 0.05;
  return {
    sat: +f.toFixed(3),
    r: hot ? 1.04 : 1.07,
    g: 1,
    b: hot ? 0.93 : 0.89,
    slope: med("p95", 170) < 165 ? 1.15 : 1.1,
    off: med("p5", 15) < 10 ? -0.015 : -0.035,
  };
}

/**
 * The speaker's face in every shot of each clip that has a source file (face_track.py's results, same shape).
 * The shared face journal records stable requests/workflow IDs before submission.
 * face-jobs.json and faces.json retain the plugin's tracked shots/color; temporary BGR frames are removed.
 */
export async function trackFaces(
  sdk: Sdk,
  projectId: string,
  dir: string,
  clips: ReelClip[],
  fps: number,
  progress: (s: string) => void = () => {},
  signal?: AbortSignal,
  options: {retryTerminal?:boolean} = {}
): Promise<Record<number, ClipFaces>> {
  const jobs: FaceJob[] = clips
    .filter((c) => c.path && c.srcStart >= 0)
    .map((c) => ({ id: c.clipId, path: c.path as string, start: c.srcStart, end: c.srcStart + (c.e - c.s) / fps }));
  const out: Record<number, ClipFaces> = {};
  if (!jobs.length) return out;
  await fs().writeFile(fs().join(dir, "face-jobs.json"), J(jobs));
  const workDir = fs().join(dir, "face-frames");
  const total = jobs.reduce((n, j) => n + Math.max(1, Math.ceil(Math.max(0, j.end - j.start) * 6)), 0);
  let done = 0;
  let shown = -1;
  const t0 = Date.now();
  const results: JobResult[] = [];
  try {
    for (const job of jobs) {
      let mine = 0;
      const clip = clips.find(c=>c.clipId===job.id)!;
      const info=await probeVideo(job.path,signal);
      const plan=samplePlan(info,job.start,job.end);
      await verifyConstantSourceClock(job.path,info,plan,signal);
      const input=faceInput(projectId,clip.rid,plan,info.fps,"podcast-faces-"+crypto.randomUUID());
      const shared=await detectShared(sdk,dir,input,info,progress,signal,options);
      const observed=adaptSamples(shared.samples,input,info,plan);
      const r = await scanProbed(job,info,plan,{
        workDir,signal,sharedSamples:observed,
        onFrame: (n) => {
          mine=n;
          const pct=Math.min(99,Math.floor(((done+n)/total)*100));
          if(pct!==shown){shown=pct;progress("Tracking shots and source color… "+pct+"%");}
        },
      });
      done += mine;
      results.push(r);
    }
  } finally {
    try {
      (await fs().rm(workDir, { recursive: true, force: true }));
    } catch {}
  }
  const frames = done;
  await fs().writeFile(fs().join(dir, "faces.json"), J({ jobs: results, engine: "selects.ai/selects-ai-runtime faces.detect", frames, ms: Date.now() - t0 }));
  for (const j of results) if ("width" in j) out[Number(j.id)] = { W: j.width, H: j.height, shots: j.shots, color: j.color || null };
  const failed = results.filter((j) => j.error && j.error !== "cannot open source");
  if (failed.length === results.length) throw new Error("Face tracking failed: " + failed[0].error);
  return out;
}

// Frame-space placement of one shot: the source rectangle (frame px) and the face on the frame.
export function reframe(W: number, H: number, sw: number, sh: number, face: FaceShot["face"]) {
  const fill = Math.max(W / sw, H / sh);
  let k = fill;
  if (face && face.h > 0) k = Math.max(fill, Math.min((TARGET.faceH * H) / (face.h * sh), TARGET.maxUpscale));
  const w = sw * k;
  const h = sh * k;
  const cx = face ? face.cx : 0.5;
  const ey = face ? face.eyes : 0.38;
  const x = Math.min(0, Math.max(W - w, TARGET.cx * W - cx * w));
  const y = Math.min(0, Math.max(H - h, TARGET.eyes * H - ey * h));
  const onFrame = face
    ? { cx: (x + face.cx * w) / W, cy: (y + (face.top + face.h / 2) * h) / H, h: (face.h * h) / H }
    : null;
  return { rect: { x: +x.toFixed(2), y: +y.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2) }, face: onFrame };
}

// Shots of the whole reel in reel frames, for the plan and for each clip's Look.
export function reelShots(W: number, H: number, fps: number, clips: ReelClip[], faces: Record<number, { W: number; H: number; shots: FaceShot[] }>): ShotFrame[] {
  const out: ShotFrame[] = [];
  for (const c of clips) {
    const f = faces[c.clipId];
    const sw = f?.W || c.sw || 1920;
    const sh = f?.H || c.sh || 1080;
    const shots = f?.shots?.length ? f.shots : [{ start: c.srcStart, end: c.srcStart + (c.e - c.s) / fps, face: null }];
    // A shot without a face borrows the nearest shot's framing so the picture does not jump to centre.
    const withFace = shots.filter((s) => s.face);
    shots.forEach((s, i) => {
      let face = s.face;
      if (!face && withFace.length) {
        const mid = (s.start + s.end) / 2;
        face = withFace.slice().sort((a, b) => Math.abs((a.start + a.end) / 2 - mid) - Math.abs((b.start + b.end) / 2 - mid))[0].face;
      }
      const from = i === 0 ? c.s : Math.max(c.s, Math.min(c.e, c.s + Math.round((s.start - c.srcStart) * fps)));
      const to = i === shots.length - 1 ? c.e : Math.max(c.s, Math.min(c.e, c.s + Math.round((s.end - c.srcStart) * fps)));
      if (to <= from) return;
      const r = reframe(W, H, sw, sh, face);
      out.push({ from, to, rect: r.rect, face: r.face });
    });
  }
  return out.sort((a, b) => a.from - b.from);
}
