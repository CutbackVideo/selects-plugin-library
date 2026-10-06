import { EDIT_POLICY } from "./policy.ts";
import type { EditWord } from "./words.ts";
import { innerSilences } from "./pace.ts";
import type { Silence } from "../../host/ffmpegParse.ts";

export type AudioCut = {
  silence: [number, number];
  frames: [number, number];
  touched: string[];
  clamped: boolean;
};

export type AudioCutPlan = {
  noiseDb: number;
  minSeconds: number;
  padSeconds: number;
  cuts: AudioCut[];
  frames: number;
  dropped: { silence: [number, number]; touched: string[] }[];
  capped: boolean;
  capFrames: number;
};

const r3 = (x: number) => Math.round(x * 1000) / 1000;

export function planAudioCuts(input: {
  silences: Silence[];
  words: EditWord[];
  fps: number;
  fileSeconds: number;
  mainEndFrame: number;
  noiseDb: number;
  minSeconds?: number;
  padSeconds?: number;
  maxShare?: number;
}): AudioCutPlan {
  const pad = input.padSeconds ?? EDIT_POLICY.audioCutPadSeconds;
  const minSeconds = input.minSeconds ?? EDIT_POLICY.audioCutMinSeconds;
  const maxShare = input.maxShare ?? EDIT_POLICY.audioCutMaxShare;
  const { fps } = input;
  const all = input.words;
  const cuts: AudioCut[] = [];
  const dropped: AudioCutPlan["dropped"] = [];
  for (const s of innerSilences(input.silences, input.words, fps, input.fileSeconds)) {
    if (s.duration < minSeconds - 1e-9) continue;
    let a = Math.ceil((s.start + pad) * fps - 1e-6);
    let b = Math.floor((s.end - pad) * fps + 1e-6);
    if (b - a < 1) continue;
    const touched = all.filter((w) => w.e > a && w.s < b);
    let clamped = false;
    if (touched.length) {
      const mid = ((s.start + s.end) / 2) * fps;
      const before = all.filter((w) => w.s < mid).reduce((m, w) => Math.max(m, w.e), -Infinity);
      const after = all.filter((w) => w.e > mid && w.s >= mid).reduce((m, w) => Math.min(m, w.s), Infinity);
      const na = Math.max(a, Number.isFinite(before) ? before : a);
      const nb = Math.min(b, Number.isFinite(after) ? after : b);
      clamped = na !== a || nb !== b;
      a = na;
      b = nb;
      if (b - a < 1 || all.some((w) => w.e > a && w.s < b)) {
        dropped.push({ silence: [r3(s.start), r3(s.end)], touched: touched.map((w) => w.text) });
        continue;
      }
    }
    cuts.push({ silence: [r3(s.start), r3(s.end)], frames: [a, b], touched: touched.map((w) => w.text), clamped });
  }
  const frames = cuts.reduce((n, c) => n + (c.frames[1] - c.frames[0]), 0);
  const capFrames = Math.floor(input.mainEndFrame * maxShare);
  return { noiseDb: input.noiseDb, minSeconds, padSeconds: pad, cuts, frames, dropped, capped: frames > capFrames, capFrames };
}
