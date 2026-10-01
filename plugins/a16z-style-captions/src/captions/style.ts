// The per-video style sheet (spec 1.2): chosen once, never mixed inside a video. A wrong but consistent
// choice still reads as the house style; a mixed one does not.
import type { Style, Tags, Word } from "./types";

// Small deterministic hash so the per-video jitter is stable across rebuilds of the same video.
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function chooseStyle(words: Word[], tags: Tags, fps: number, opts: { insertsShare?: number } = {}): Style {
  const seed = seedOf(words.slice(0, 40).map((w) => w.t).join(" "));
  const sp = words.length ? words[words.length - 1].e - words[0].s : 1;
  const rate = words.length / Math.max(1, sp);
  const format = tags.format || "standard";
  const slow = rate < 3.6;
  // lockups merge chunks, so the plain chunks aim a little under the per-video words per caption
  const TW = format === "montage_essay" ? 2.4 : format === "story" ? 2.8 : slow ? 2.9 : 2.7;
  const buildShare = format === "story" ? 0.5 : format === "montage_essay" ? 0.12 : 0.3;
  const lockupRate = format === "story" ? 8 : format === "montage_essay" ? 2 : 5;
  const inserts = opts.insertsShare || 0;
  return {
    format,
    dialect: "BLUR",
    TW,
    caseMode: "lower",
    punct: "punchline",
    typeVariant: inserts >= 0.7 ? "plain" : format === "story" ? "serif_dense" : "serif_sparse",
    yAnchor: "chin",
    buildShare,
    lockupRate,
    xh: 0.029,
    chinGap: 0.1,
    // body blur jitter: +-1 px and +-1 frame per video, never per caption
    sigma0: 6 + Math.round((seed - 0.5) * 2),
    blurFrames: 7 + (seed > 0.8 ? 1 : seed < 0.2 ? -1 : 0),
    fps,
  };
}
