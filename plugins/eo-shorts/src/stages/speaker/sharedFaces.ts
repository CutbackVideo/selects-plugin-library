import { createSharedAiJobClient } from "../../../../../shared/ai-job-client.cjs";
import { importSharedAiResource } from "../../../../../shared/ai-resources.cjs";
import { faceRequestWindows, appendFaceSamples } from "../../../../../shared/face-request-windows.cjs";
import type { Host } from "../../host/types.ts";
import { runScript } from "../../host/runScript.ts";
import { readJsonIfExists, writeJsonAtomic } from "../../host/fs.ts";
import type { FaceBox } from "../../speaker/faces.ts";
export type FacePage = { frameSize: { width: number; height: number }; samples: { index: number; sourceTimeSeconds: number; faces: { box: { xmin: number; ymin: number; xmax: number; ymax: number }; score: number; landmarks: { x: number; y: number }[] }[] }[] };
export function adaptSharedFaces(page: FacePage, times: number[], fps: number): FaceBox[][] {
  if (times.some(t => !Number.isFinite(t) || t < 0) || !(fps > 0)) throw new Error("Invalid source frame clock.");
  if (!(page.frameSize?.width > 0 && page.frameSize?.height > 0) || !Array.isArray(page.samples)) throw new Error("Invalid shared face observations.");
  let previous = -Infinity, previousIndex = -1;
  for (const row of page.samples) {
    if (!Number.isSafeInteger(row.index) || row.index <= previousIndex || !Number.isFinite(row.sourceTimeSeconds) || row.sourceTimeSeconds <= previous || !Array.isArray(row.faces) || row.faces.length > 64) throw new Error("Invalid shared face sample order.");
    previous = row.sourceTimeSeconds; previousIndex = row.index;
  }
  return times.map(t => {
    const row = page.samples.find(s => s.sourceTimeSeconds >= t - 1e-6 && s.sourceTimeSeconds < t + 2 / fps + 1e-6);
    if (!row || !Array.isArray(row.faces)) throw new Error("Shared face observations do not match the source clock.");
    return row.faces.map(f => {
      const b = f.box;
      if (!b || ![b.xmin, b.ymin, b.xmax, b.ymax, f.score].every(Number.isFinite) || f.score < 0 || f.score > 1 || b.xmax <= b.xmin || b.ymax <= b.ymin || b.xmin < 0 || b.ymin < 0 || b.xmax > page.frameSize.width || b.ymax > page.frameSize.height || !Array.isArray(f.landmarks) || f.landmarks.length !== 5 || f.landmarks.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error("Invalid shared face geometry.");
      return { x: b.xmin, y: b.ymin, w: b.xmax - b.xmin, h: b.ymax - b.ymin, score: f.score, landmarks: f.landmarks.map(p => [p.x, p.y] as [number, number]) };
    });
  });
}
export function sharedFaces(host: Host, options: { projectId: string; journalPath: string; scope: string; resources?: Record<string, { resourceId: string; duration?: number }>; signal?: AbortSignal | null; progress?: (s: string) => void }) {
  const call = (body: string, summary: string, effect = false) => runScript<any>(host.sdk, { summary, script: body, allowCommit: effect }).then(r => r.result);
  const client = createSharedAiJobClient({ projectId: options.projectId, scope: options.scope,
    runScript: call, load: () => readJsonIfExists(host.fs, options.journalPath, null), save: (journal: unknown) => writeJsonAtomic(host.fs, options.journalPath, journal) });
  return async (path: string, times: number[], fps: number, image = false): Promise<FacePage> => {
    if (!times.length || times.some(t => !Number.isFinite(t) || t < 0) || !(fps > 0)) throw new Error("Invalid source frame clock.");
    const known = options.resources?.[path];
    const resourceId = known?.resourceId || await importSharedAiResource(host.sdk, options.projectId, path, call);
    const step = times.length > 1 ? Math.max(1 / fps, times[1] - times[0]) : 1 / fps;
    const start = Math.max(0, times[0]), end = Math.min(known?.duration ?? Infinity, times.at(-1)! + 1 / fps);
    const windows = image ? [{ startSeconds: 0, endSeconds: 0 }] : faceRequestWindows({ startSeconds: start, endSeconds: end, sourceFps: fps, sampleEverySeconds: step });
    const samples: FacePage["samples"] = []; let frameSize: FacePage["frameSize"] | undefined;
    for (const window of windows) {
      const identity = path + ":" + (image ? "image" : JSON.stringify(windows.length === 1 ? [start, end, step] : [start, end, step, window.startSeconds, window.endSeconds]));
      const onAbort = () => { if (/^Canceled\./.test(String(options.signal?.reason?.message || options.signal?.reason || ""))) void client.cancel({ identity }).catch(() => {}); };
      options.signal?.addEventListener("abort", onAbort, { once: true });
      try {
        const run = await client.run({ task: "faces.detect", resourceId, ...(image ? {} : { sourceRange: {startSeconds:window.startSeconds,endSeconds:window.endSeconds} }),
          options: { ...(image ? {} : { sampleEverySeconds: step }), scoreThreshold: 0.8, provider: "cpu" } },
          { identity, retryTerminal: true, signal: options.signal ?? undefined, onProgress: (s: any) => options.progress?.(s.step || "Finding the speaker's face…") });
        const incoming: FacePage["samples"] = [];
        for (let offset = 0; ; offset += 10) {
          const page = await call(`const d:any=await selects.ai.readJSON(${JSON.stringify(run.result.files.detections)},${JSON.stringify(options.projectId)});
if(d.contractVersion!==1||d.task!=="faces.detect"||d.coordinateSpace!=="display-pixels"||d.boxFormat!=="xyxy"||!Array.isArray(d.samples)||d.samples.length<1||d.samples.length>${image ? 1 : Math.ceil((window.endSeconds-window.startSeconds)/step)+3})throw Error("Invalid shared face result");
if(d.parameters?.scoreThreshold!==0.8||${image ? 'd.sourceKind!=="image"||d.samples.length!==1||d.samples[0].sourceTimeSeconds!==0' : 'd.parameters?.sourceRange?.startSeconds!==' + window.startSeconds + '||d.parameters?.sourceRange?.endSeconds!==' + window.endSeconds + '||d.parameters?.sampleEverySeconds!==' + step})throw Error("Shared face parameters changed");
return {frameSize:d.frameSize,total:d.samples.length,samples:d.samples.slice(${offset},${offset + 10})};`, "Read speaker observations");
          if (frameSize && (frameSize.width !== page.frameSize?.width || frameSize.height !== page.frameSize?.height)) throw new Error("Shared face dimensions changed across windows.");
          frameSize = page.frameSize; incoming.push(...page.samples);
          if (offset + 10 >= page.total) break;
        }
        appendFaceSamples(samples, incoming, window.acceptFromSeconds);
      } finally { options.signal?.removeEventListener("abort", onAbort); }
    }
    return { frameSize: frameSize!, samples };
  };
}
