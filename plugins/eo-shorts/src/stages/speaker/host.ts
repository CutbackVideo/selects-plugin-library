import type { Host } from "../../host/types.ts";
import { analyze } from "../../host/ffmpeg.ts";
import { ensureDir, readBytes, removeFile, toBytes } from "../../host/fs.ts";
import { parseProbe, probeArgs } from "../../speaker/ffmpegPass.ts";
import type { SpeakerHost } from "../../speaker/analyze.ts";
import type { FaceDetector } from "../../speaker/yunet/runtime.ts";

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

export async function panelSpeakerHost(host: Host, o: { scratchDir: string; detector: () => Promise<FaceDetector>; signal?: AbortSignal | null; progress?: (s: string) => void }): Promise<SpeakerHost> {
  const fs = host.fs;
  const ranges = rangeReader(host);
  await ensureDir(fs, o.scratchDir);
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
    detect: async (bgr, w, h) => (await o.detector()).detect(bgr, w, h),
    progress: o.progress,
  };
}
