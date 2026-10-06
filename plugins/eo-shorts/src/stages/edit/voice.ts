import type { Host } from "../../host/types.ts";
import { analyze } from "../../host/ffmpeg.ts";
import { parseEbur128, parseSilencedetect, type Ebur128Summary, type Silence } from "../../host/ffmpegParse.ts";
import { startExport, waitForExport, type ExportDone } from "../../host/workflows.ts";
import { removeFile } from "../../host/fs.ts";

const BASE = ["-hide_banner", "-nostdin", "-nostats"];

export function loudnessArgs(path: string): string[] {
  return [...BASE, "-i", path, "-map", "0:a:0", "-af", "ebur128=peak=true:framelog=verbose", "-f", "null", "-"];
}

export function silenceArgs(path: string, noiseDb: number, minSeconds: number): string[] {
  return [...BASE, "-i", path, "-map", "0:a:0", "-af", "silencedetect=noise=" + noiseDb.toFixed(1) + "dB:d=" + minSeconds, "-f", "null", "-"];
}

export async function measureLoudness(host: Host, path: string, signal?: AbortSignal | null): Promise<Ebur128Summary> {
  const r = await analyze(host.runtime, loudnessArgs(path), { signal, timeoutMs: 120_000 });
  const s = parseEbur128(r.stderr);
  if (!s) throw new Error("ffmpeg ebur128 printed no summary for " + path + ".");
  return s;
}

export async function detectSilences(host: Host, path: string, noiseDb: number, minSeconds: number, fileSeconds: number, signal?: AbortSignal | null): Promise<Silence[]> {
  const r = await analyze(host.runtime, silenceArgs(path, noiseDb, minSeconds), { signal, timeoutMs: 120_000 });
  return parseSilencedetect(r.stderr, fileSeconds);
}

export type VoiceRender = { path: string; workflowId: string; seconds: number; done: ExportDone };

export async function renderVoice(
  host: Host,
  input: { projectId: string; draftId: string; outPath: string; mainEndFrame: number; fps: number; tmpDir: string; signal?: AbortSignal | null; onProgress?: (text: string) => void },
): Promise<VoiceRender> {
  const fs = host.fs;
  removeFile(fs, input.outPath);
  const seconds = input.mainEndFrame / input.fps;
  const started = await startExport(host.sdk, "audio", { projectId: input.projectId, draftId: input.draftId, outPath: input.outPath }, { signal: input.signal, fs });
  const done = await waitForExport(host.sdk, {
    projectId: input.projectId,
    workflowId: started.workflowId,
    outPath: started.outPath,
    kind: "audio",
    fs,
    runtime: host.runtime,
    expectDurationSec: seconds,
    toleranceSec: 1 / input.fps + 0.01,
    timeoutMs: 5 * 60_000,
    signal: input.signal,
    tmpDir: input.tmpDir,
    onProgress: (s) => input.onProgress?.("Rendering the voice… " + s.status + (s.progress != null ? " " + Math.round(s.progress * 100) + "%" : "")),
  });
  return { path: started.outPath, workflowId: started.workflowId, seconds, done };
}

export type VoiceMeasure = {
  integrated: number;
  truePeak: number | null;
  lra: number | null;
  silences: { noiseDb: number; minSeconds: number; list: Silence[] }[];
};

export async function measureVoice(
  host: Host,
  path: string,
  fileSeconds: number,
  levels: { offsetDb: number; minSeconds: number }[],
  signal?: AbortSignal | null,
): Promise<VoiceMeasure> {
  const loud = await measureLoudness(host, path, signal);
  if (!Number.isFinite(loud.integrated)) throw new Error("The voice render is silent (integrated loudness " + loud.integrated + ").");
  const silences: VoiceMeasure["silences"] = [];
  for (const l of levels) {
    const noiseDb = Math.round((loud.integrated + l.offsetDb) * 10) / 10;
    silences.push({ noiseDb, minSeconds: l.minSeconds, list: await detectSilences(host, path, noiseDb, l.minSeconds, fileSeconds, signal) });
  }
  return { integrated: loud.integrated, truePeak: loud.truePeak, lra: loud.lra, silences };
}
