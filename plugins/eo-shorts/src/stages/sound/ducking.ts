import { fadeFrames, fadeSafeLine, normalizeLine, type Breakpoint } from "./gainCurve.ts";

export const DUCKING = {
  padSeconds: 0.12,
  mergeGapSeconds: 0.6,
  attackSeconds: 0.15,
  releaseSeconds: 0.35,
  underSpeechLu: -18,
  inGapsLu: -9,
  fadeInSeconds: 0.3,
  fadeOutSeconds: 1.0,
} as const;

export type Ducking = typeof DUCKING;

export type Span = { start: number; end: number };

export type DuckWord = { s: number; e: number; cut?: boolean };

export function speechSpans(words: readonly DuckWord[], fps: number, mainEnd: number, d: Ducking = DUCKING): Span[] {
  const pad = Math.round(d.padSeconds * fps);
  const gap = d.mergeGapSeconds * fps;
  const spans: Span[] = [];
  for (const w of [...words].filter((x) => !x.cut && x.e > x.s).sort((a, b) => a.s - b.s)) {
    const s = Math.max(0, w.s - pad), e = Math.min(mainEnd, w.e + pad);
    if (e <= s) continue;
    const last = spans[spans.length - 1];
    if (last && s - last.end < gap) last.end = Math.max(last.end, e);
    else spans.push({ start: s, end: e });
  }
  return spans;
}

export function duckLine(spans: readonly Span[], mainEnd: number, fps: number, levels: { duck: number; swell: number }, d: Ducking = DUCKING): Breakpoint[] {
  const att = Math.ceil(d.attackSeconds * fps - 1e-9);
  const rel = Math.ceil(d.releaseSeconds * fps - 1e-9);
  const pts: Breakpoint[] = [];
  if (!spans.length) return [{ frame: 0, db: levels.swell }];
  for (const s of spans) {
    if (s.start - att > 0) {
      pts.push({ frame: s.start - att, db: levels.swell });
      pts.push({ frame: s.start, db: levels.duck });
    } else pts.push({ frame: 0, db: levels.duck });
    pts.push({ frame: s.end, db: levels.duck });
    if (s.end + rel < mainEnd) pts.push({ frame: s.end + rel, db: levels.swell });
  }
  if (pts[0].frame > 0) pts.unshift({ frame: 0, db: levels.swell });
  return normalizeLine(pts);
}

export type MusicLevels = { duck: number; swell: number };

export function musicLevels(voiceLufs: number, musicLufs: number, d: Ducking = DUCKING): MusicLevels {
  return { duck: voiceLufs + d.underSpeechLu - musicLufs, swell: voiceLufs + d.inGapsLu - musicLufs };
}

export type MusicAudio = {
  volumeKeys: { atSeconds: number; volumeDb: number }[];
  fadeInSeconds: number;
  fadeOutSeconds: number;
  line: Breakpoint[];
  fades: { in: number; out: number };
};

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function musicAudio(line: readonly Breakpoint[], clipStart: number, length: number, fps: number, offsetDb = 0, d: Ducking = DUCKING): MusicAudio {
  const fades = fadeFrames(d.fadeInSeconds, d.fadeOutSeconds, length, fps);
  const local = line.map((p) => ({ frame: p.frame - clipStart, db: p.db + offsetDb }));
  const safe = fadeSafeLine(local, length, fades);
  return {
    volumeKeys: safe.map((p) => ({ atSeconds: p.frame / fps, volumeDb: r4(p.db) })),
    fadeInSeconds: fades.in / fps,
    fadeOutSeconds: fades.out / fps,
    line: safe.map((p) => ({ frame: p.frame, db: r4(p.db) })),
    fades,
  };
}

export function duckStats(line: readonly Breakpoint[], mainEnd: number, levels: MusicLevels): { duckFrames: number; swellFrames: number; rampFrames: number; swells: number } {
  let duck = 0, swell = 0, ramp = 0, swells = 0, inSwell = false;
  for (let f = 0; f < mainEnd; f += 1) {
    let v = line[0]?.db ?? 0;
    for (let i = line.length - 1; i >= 0; i -= 1) if (line[i].frame <= f) {
      const a = line[i], b = line[i + 1];
      v = b ? a.db + ((b.db - a.db) * (f - a.frame)) / (b.frame - a.frame) : a.db;
      break;
    }
    if (Math.abs(v - levels.duck) < 1e-6) (duck += 1), (inSwell = false);
    else if (Math.abs(v - levels.swell) < 1e-6) {
      swell += 1;
      if (!inSwell) swells += 1;
      inSwell = true;
    } else (ramp += 1), (inSwell = false);
  }
  return { duckFrames: duck, swellFrames: swell, rampFrames: ramp, swells };
}
