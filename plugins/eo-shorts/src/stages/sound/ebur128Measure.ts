import type { Host } from "../../host/types.ts";
import { analyze } from "../../host/ffmpeg.ts";
import { parseEbur128 } from "../../host/ffmpegParse.ts";

export type Loudness = {
  integrated: number;
  truePeak: number;
  lra: number | null;
  precision: "metadata" | "summary";
  summary: { integrated: number; truePeak: number | null } | null;
};

const BASE = ["-hide_banner", "-nostdin", "-nostats"];

export function ebur128Args(path: string, part?: { startSeconds: number; seconds: number }): string[] {
  const seek = part ? ["-ss", part.startSeconds.toFixed(6), "-t", part.seconds.toFixed(6)] : [];
  return [...BASE, ...seek, "-i", path, "-map", "0:a:0", "-af", "ebur128=peak=true:metadata=1,ametadata=mode=print:key=lavfi.r128.I,ametadata=mode=print:key=lavfi.r128.true_peak", "-f", "null", "-"];
}

const last = (text: string, key: string): number | null => {
  const re = new RegExp("lavfi\\.r128\\." + key.replace(/\./g, "\\.") + "=(-?(?:inf|nan|\\d+(?:\\.\\d+)?))", "gi");
  let v: string | null = null;
  for (const m of text.matchAll(re)) v = m[1];
  if (v == null) return null;
  const t = v.toLowerCase();
  return t === "-inf" ? -Infinity : t === "inf" ? Infinity : Number(t);
};

export function parseLoudness(stderr: string): Loudness {
  const sum = parseEbur128(stderr);
  const I = last(stderr, "I"), tp = last(stderr, "true_peak");
  const summary = sum ? { integrated: sum.integrated, truePeak: sum.truePeak } : null;
  if (I != null && tp != null && Number.isFinite(I)) {
    return { integrated: I, truePeak: tp > 0 ? 20 * Math.log10(tp) : -Infinity, lra: sum?.lra ?? null, precision: "metadata", summary };
  }
  if (sum && sum.truePeak != null) return { integrated: sum.integrated, truePeak: sum.truePeak, lra: sum.lra, precision: "summary", summary };
  throw new Error("ffmpeg ebur128 printed no loudness.");
}

export async function measureFile(host: Pick<Host, "runtime">, path: string, o: { part?: { startSeconds: number; seconds: number }; signal?: AbortSignal | null } = {}): Promise<Loudness> {
  const r = await analyze(host.runtime, ebur128Args(path, o.part), { signal: o.signal, timeoutMs: 180_000 });
  return parseLoudness(r.stderr);
}
