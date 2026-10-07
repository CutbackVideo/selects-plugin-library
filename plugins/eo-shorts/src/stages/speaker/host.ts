import type { Host } from "../../host/types.ts";
import { analyze } from "../../host/ffmpeg.ts";
import { ensureDir, readBytes, removeFile, toBytes } from "../../host/fs.ts";
import { parseProbe, probeArgs } from "../../speaker/ffmpegPass.ts";
import type { SpeakerHost } from "../../speaker/analyze.ts";
import { sharedFaces, adaptSharedFaces } from "./sharedFaces.ts";

type RangeFs = { readRange?(path: string, start: number, length: number): Promise<unknown> };

export function rangeReader(host: Pick<Host, "fs">): { read(path: string, offset: number, length: number): Promise<Uint8Array>; forget(path: string): void } {
  const whole = new Map<string, Promise<Uint8Array>>();
  const fs = host.fs as Host["fs"] & RangeFs;
  return {
    async read(path, offset, length) {
      if (typeof fs.readRange === "function") return toBytes(await fs.readRange(path, offset, length));
      let all = whole.get(path);
      if (!all) {
        all = readBytes(fs, path);
        whole.set(path, all);
      }
      const b = await all;
      return b.subarray(Math.min(offset, b.length), Math.min(offset + length, b.length));
    },
    forget: (path) => void whole.delete(path),
  };
}

export async function panelSpeakerHost(host: Host, o: { scratchDir: string; projectId: string; scope: string; resources?: Record<string, { resourceId: string; duration?: number }>; signal?: AbortSignal | null; progress?: (s: string) => void }): Promise<SpeakerHost> {
  const fs = host.fs;
  const ranges = rangeReader(host);
  await ensureDir(fs, o.scratchDir);
  const faces = sharedFaces(host, { ...o, journalPath: fs.join(o.scratchDir, "ai-jobs.json") });
  return {
    async probe(path) {
      const rt = host.runtime;
      if (!rt || typeof rt.runFFprobe !== "function") throw new Error("This Selects build has no Runtime.runFFprobe; update Selects.");
      const r = await rt.runFFprobe(probeArgs(path), true, o.signal ?? undefined);
      return parseProbe(String(r?.stdout ?? ""));
    },
    async ffmpeg(args, signal) {
      return (await analyze(host.runtime, args, { signal: signal ?? o.signal, timeoutMs: 15 * 60_000 })).stderr;
    },
    readRange: (path, offset, length) => ranges.read(path, offset, length),
    async remove(path) {
      ranges.forget(path);
      await removeFile(fs, path);
    },
    scratchPath: (name) => fs.join(o.scratchDir, name),
    detectSamples: async (path, times, fps, size) => { const result = await faces(path, times, fps); if (size && (result.frameSize?.width !== size.width || result.frameSize?.height !== size.height)) throw new Error("Shared face dimensions differ from the source."); return adaptSharedFaces(result, times, fps); },
    progress: o.progress,
  };
}
