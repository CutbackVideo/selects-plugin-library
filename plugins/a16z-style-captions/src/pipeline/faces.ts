// Shared inference on both platforms; the plugin keeps its shot and crop policy.
import { createSharedAiJobClient } from "../../../../shared/ai-job-client.cjs";
import { faceRequestWindows, appendFaceSamples } from "../../../../shared/face-request-windows.cjs";
import { fs, hostFF, script, type Sdk } from "./host";
import { speakerShots, type FaceSample, type SourceFaces } from "./faceTracks";
import { histogramCuts } from "./shotHistogram";
import { cameraSampleArgs, cameraSampleTimes } from "./cameraSamples";
export type { Face, FaceShot, SourceFaces } from "./faceTracks";
export type FaceJob = { id: string; path: string; resourceId: string; start: number; end: number; fps: number; width: number; height: number };

export async function trackFaces(sdk: Sdk, projectId: string, dir: string, jobs: FaceJob[], progress: (s: string) => void = () => {}): Promise<Record<string, SourceFaces>> {
  const out: Record<string, SourceFaces> = {};
  if (!jobs.length) return out;
  await fs().mkdir(dir, { recursive: true });
  const journal = fs().join(dir, "shared-ai-jobs.json");
  const client = createSharedAiJobClient({ projectId, scope: "a16z-faces:" + dir,
    runScript: (body: string, summary: string, effect: boolean) => script(sdk, summary, body, effect),
    load: async () => await fs().exists(journal) ? JSON.parse(String(await fs().readFile(journal, "utf8"))) : null,
    save: async (value: unknown) => fs().writeFile(journal, JSON.stringify(value)),
  });
  for (const job of jobs) {
    if (!(job.fps > 0 && job.width > 0 && job.height > 0) || !Number.isFinite(job.start) || !(job.end > job.start)) throw new Error("Invalid source frame clock.");
    const interval = Math.max(1, Math.round(job.fps / 6)) / job.fps;
    const samples: FaceSample[] = [];
    const windows = faceRequestWindows({ startSeconds: job.start, endSeconds: job.end, sourceFps: job.fps, sampleEverySeconds: interval });
    for (const window of windows) {
      const run = await client.run({ task: "faces.detect", resourceId: job.resourceId,
        sourceRange: {startSeconds:window.startSeconds,endSeconds:window.endSeconds}, options: { sampleEverySeconds: interval, scoreThreshold: 0.8, provider: "cpu" } },
        { retryTerminal: true, identity: job.id + ":" + job.start + ":" + job.end + (windows.length > 1 ? ":" + window.startSeconds + ":" + window.endSeconds : ""), onProgress: (s: any) => progress(s.step || "Finding the speaker…") });
      const artifact = run.result.files.detections, incoming: FaceSample[] = [];
      for (let offset = 0; ; offset += 10) {
        const page = await script(sdk, "Read speaker observations", `const d:any=await selects.ai.readJSON(${JSON.stringify(artifact)},${JSON.stringify(projectId)});
if(d.parameters?.sourceRange?.startSeconds!==${window.startSeconds}||d.parameters?.sourceRange?.endSeconds!==${window.endSeconds}||d.parameters?.scoreThreshold!==0.8||d.parameters?.sampleEverySeconds!==${interval})throw Error("Shared face parameters changed");
if(d.contractVersion!==1||d.task!=="faces.detect"||d.coordinateSpace!=="display-pixels"||d.boxFormat!=="xyxy"||d.frameSize?.width!==${job.width}||d.frameSize?.height!==${job.height}||!Array.isArray(d.samples)||!d.samples.length||d.samples.length>${Math.ceil((window.endSeconds-window.startSeconds)/interval)+3})throw Error("Invalid shared face result");
return {total:d.samples.length,samples:d.samples.slice(${offset},${offset + 10})};`);
        incoming.push(...page.samples);
        if (offset + 10 >= page.total) break;
      }
      appendFaceSamples(samples, incoming, window.acceptFromSeconds);
    }
    const scale = Math.min(1, 640 / Math.max(job.width, job.height)), width = Math.max(1, Math.round(job.width * scale)), height = Math.max(1, Math.round(job.height * scale));
    const bytes = width * height * 3, step = Math.max(1, Math.round(job.fps / 6)), rgb = fs().join(dir, "shot-" + job.id + ".rgb");
    let cuts: number[];
    try {
      const decoded = await hostFF("runFFmpeg", cameraSampleArgs(job, rgb, width, height, step), 300000);
      const stat = await fs().stat(rgb);
      if (!stat || stat.size < bytes || stat.size % bytes) throw new Error("Camera sample decoding was incomplete.");
      const count = Math.floor(stat.size / bytes), times = cameraSampleTimes(decoded.stderr, count, job.start, job.end);
      cuts = await histogramCuts({ read: (i) => fs().readRange(rgb, i * bytes, bytes), count, times });
    } finally { await fs().rm(rgb, { force: true }); }
    out[job.id] = speakerShots(samples, cuts, job.start, job.end, job.width, job.height);
  }
  return out;
}
