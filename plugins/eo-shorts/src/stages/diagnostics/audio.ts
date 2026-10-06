import { dipLine, lineValue, type DipRun } from "../sound/gainCurve.ts";
import { fromDb, integratedLoudness } from "../sound/loudnessMeter.ts";
import type { Pcm } from "../sound/wavCodec.ts";

export function shapeVoice(v: Pcm, sound: { gainDb: number; passGainDb: number; dips: DipRun[] }, fps: number): Pcm {
  const lift = sound.gainDb - sound.passGainDb;
  const line = dipLine(sound.dips).map((p) => ({ frame: p.frame, db: p.db + lift }));
  const flat = !line.length;
  const g0 = fromDb(lift);
  const sr = v.sampleRate;
  return {
    sampleRate: sr,
    channels: v.channels.map((ch) => {
      const out = new Float32Array(ch.length);
      for (let i = 0; i < ch.length; i += 1) out[i] = ch[i] * (flat ? g0 : fromDb(lineValue(line, (i * fps) / sr)));
      return out;
    }),
  };
}

function paired(a: Pcm, b: Pcm): { a: Float32Array[]; b: Float32Array[]; n: number } {
  if (a.sampleRate !== b.sampleRate) throw new Error("The MP4 audio and the voice are at " + a.sampleRate + " and " + b.sampleRate + " Hz.");
  const n = Math.min(a.channels[0]?.length ?? 0, b.channels[0]?.length ?? 0);
  const k = Math.max(a.channels.length, b.channels.length);
  const pick = (p: Pcm, c: number) => p.channels[Math.min(c, p.channels.length - 1)];
  return { a: Array.from({ length: k }, (_, c) => pick(a, c)), b: Array.from({ length: k }, (_, c) => pick(b, c)), n };
}

export function voiceGain(mix: Pcm, voice: Pcm): number {
  const { a, b, n } = paired(mix, voice);
  let num = 0;
  let den = 0;
  for (let c = 0; c < a.length; c += 1) for (let i = 0; i < n; i += 1) (num += a[c][i] * b[c][i]), (den += b[c][i] * b[c][i]);
  return den > 0 ? num / den : 0;
}

export function residual(mix: Pcm, voice: Pcm, alpha: number): Pcm {
  const { a, b, n } = paired(mix, voice);
  return { sampleRate: mix.sampleRate, channels: a.map((ch, c) => Float32Array.from({ length: n }, (_, i) => ch[i] - alpha * b[c][i])) };
}

export function scaled(p: Pcm, g: number): Pcm {
  return { sampleRate: p.sampleRate, channels: p.channels.map((ch) => Float32Array.from(ch, (x) => x * g)) };
}

export function monoSum(p: Pcm): Float32Array {
  const n = p.channels[0]?.length ?? 0;
  const out = new Float32Array(n);
  for (const ch of p.channels) for (let i = 0; i < n; i += 1) out[i] += ch[i];
  return out;
}

export function pearson(a: Float32Array, b: Float32Array, lag = 0, step = 1): number {
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, n = 0;
  for (let i = Math.max(0, -lag); i < a.length && i + lag < b.length; i += step) {
    const x = a[i], y = b[i + lag];
    sa += x;
    sb += y;
    saa += x * x;
    sbb += y * y;
    sab += x * y;
    n += 1;
  }
  if (!n) return 0;
  const cov = sab / n - (sa / n) * (sb / n);
  const va = saa / n - (sa / n) ** 2, vb = sbb / n - (sb / n) ** 2;
  return va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0;
}

export type VoiceMatch = {
  alpha: number;
  correlation: number;
  bestLagMs: number;
  bestCorrelation: number;
  voiceLufs: number;
  residualLufs: number;
  samples: number;
};

export function matchVoice(mix: Pcm, voice: Pcm, o: { maxLagMs?: number } = {}): VoiceMatch {
  const alpha = voiceGain(mix, voice);
  const am = monoSum(mix), vm = monoSum(voice);
  const correlation = pearson(am, vm);
  const maxLag = Math.round(((o.maxLagMs ?? 20) * mix.sampleRate) / 1000);
  let best = { lag: 0, r: correlation };
  for (let lag = -maxLag; lag <= maxLag; lag += 4) {
    if (!lag) continue;
    const r = pearson(am, vm, lag, 8);
    if (r > best.r) best = { lag, r };
  }
  const res = residual(mix, voice, alpha);
  return {
    alpha,
    correlation,
    bestLagMs: best.lag ? (-best.lag / mix.sampleRate) * 1000 : 0,
    bestCorrelation: best.r,
    voiceLufs: integratedLoudness(scaled(voice, alpha)),
    residualLufs: integratedLoudness(res),
    samples: res.channels[0]?.length ?? 0,
  };
}
