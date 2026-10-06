import type { Pcm } from "./wavCodec.ts";
import { blockPowers, channelWeight, gatedLoudness, INTERPOLATOR, kWeightingBiquads, oversampledPeak, subBlockSize } from "./loudnessMeter.ts";

export type StemModel = {
  sampleRate: number;
  fps: number;
  frames: number;
  samples: number;
  c: number;
  sub: number;
  vv: Float64Array;
  vr: Float64Array;
  rr: Float64Array;
  peakV: Float32Array;
  peakR: Float32Array;
  v: Float32Array[];
  r: Float32Array[] | null;
  exact: Map<number, number>;
};

export const frameSample = (f: number, sampleRate: number, fps: number): number => Math.round((f * sampleRate) / fps);

export function buildStemModel(v: Pcm, r: Pcm | null, o: { fps: number; frames: number; c: number }): StemModel {
  const sr = v.sampleRate;
  if (r && r.sampleRate !== sr) throw new Error("The stems differ in sample rate.");
  const n = Math.min(v.channels[0]?.length ?? 0, r ? r.channels[0]?.length ?? 0 : Infinity);
  const sub = subBlockSize(sr);
  const nSub = Math.floor(n / sub);
  const vv = new Float64Array(nSub), vr = new Float64Array(nSub), rr = new Float64Array(nSub);
  const [s, h] = kWeightingBiquads(sr);
  v.channels.forEach((vc, ch) => {
    const rc = r ? r.channels[ch] : null;
    const w = channelWeight(ch, v.channels.length);
    let z1 = 0, z2 = 0, w1 = 0, w2 = 0, q1 = 0, q2 = 0, e1 = 0, e2 = 0;
    for (let k = 0; k < nSub; k += 1) {
      let sv = 0, sr2 = 0, srr = 0;
      for (let i = k * sub, end = i + sub; i < end; i += 1) {
        const x = vc[i];
        const u = s.b0 * x + z1;
        z1 = s.b1 * x - s.a1 * u + z2;
        z2 = s.b2 * x - s.a2 * u;
        const kv = h.b0 * u + w1;
        w1 = h.b1 * u - h.a1 * kv + w2;
        w2 = h.b2 * u - h.a2 * kv;
        let kr = 0;
        if (rc) {
          const y = rc[i];
          const u2 = s.b0 * y + q1;
          q1 = s.b1 * y - s.a1 * u2 + q2;
          q2 = s.b2 * y - s.a2 * u2;
          kr = h.b0 * u2 + e1;
          e1 = h.b1 * u2 - h.a1 * kr + e2;
          e2 = h.b2 * u2 - h.a2 * kr;
        }
        sv += kv * kv;
        sr2 += kv * kr;
        srr += kr * kr;
      }
      vv[k] += w * sv;
      vr[k] += w * sr2;
      rr[k] += w * srr;
    }
  });
  const frames = o.frames;
  const reach = INTERPOLATOR.phases[0].length + 2;
  const peakOf = (chs: Float32Array[] | null) => {
    const out = new Float32Array(frames);
    if (!chs) return out;
    const sampleMax = new Float32Array(frames);
    for (let f = 0; f < frames; f += 1) {
      const a = frameSample(f, sr, o.fps), b = Math.min(n, frameSample(f + 1, sr, o.fps));
      let m = 0;
      for (const ch of chs) for (let i = a; i < b; i += 1) { const x = Math.abs(ch[i]); if (x > m) m = x; }
      sampleMax[f] = m;
    }
    for (let f = 0; f < frames; f += 1) {
      const a = frameSample(f, sr, o.fps), b = Math.min(n, frameSample(f + 1, sr, o.fps));
      out[f] = Math.max(sampleMax[f], edgeMax(chs, Math.max(0, a - reach), a), edgeMax(chs, b, Math.min(n, b + reach)));
    }
    return out;
  };
  return { sampleRate: sr, fps: o.fps, frames, samples: n, c: o.c, sub, vv, vr, rr, peakV: peakOf(v.channels), peakR: peakOf(r ? r.channels : null), v: v.channels, r: r ? r.channels : null, exact: new Map() };
}

function edgeMax(chs: Float32Array[], a: number, b: number): number {
  let m = 0;
  for (const ch of chs) for (let i = a; i < b; i += 1) { const x = Math.abs(ch[i]); if (x > m) m = x; }
  return m;
}

export type VoiceShape = { at(sample: number): number; frames: ReadonlySet<number> };
export const FLAT: VoiceShape = { at: () => 1, frames: new Set() };

export function mixLoudness(m: StemModel, a: number, g: VoiceShape = FLAT): number {
  const sums = new Float64Array(m.vv.length);
  const a2 = a * a, c = m.c;
  const touched = g.frames.size > 0;
  for (let k = 0; k < sums.length; k += 1) {
    let gk = 1;
    if (touched) gk = g.at(k * m.sub + (m.sub >> 1));
    sums[k] = a2 * (gk * gk * m.vv[k] + 2 * gk * c * m.vr[k] + c * c * m.rr[k]);
  }
  return gatedLoudness(blockPowers(sums, m.sub));
}

export const frameBound = (m: StemModel, f: number, gMax = 1): number => Math.max(1, INTERPOLATOR.gain) * (gMax * m.peakV[f] + m.c * m.peakR[f]);

export function framePeak(m: StemModel, f: number, g: VoiceShape = FLAT): number {
  const plain = !g.frames.has(f);
  if (plain && m.exact.has(f)) return m.exact.get(f)!;
  const from = frameSample(f, m.sampleRate, m.fps), to = Math.min(m.samples, frameSample(f + 1, m.sampleRate, m.fps));
  let peak = 0;
  for (let ch = 0; ch < m.v.length; ch += 1) {
    const vc = m.v[ch], rc = m.r ? m.r[ch] : null, c = m.c;
    const sig = plain ? (rc ? (i: number) => vc[i] + c * rc[i] : (i: number) => vc[i]) : rc ? (i: number) => g.at(i) * vc[i] + c * rc[i] : (i: number) => g.at(i) * vc[i];
    peak = Math.max(peak, oversampledPeak(sig, m.samples, from, to));
  }
  if (plain) m.exact.set(f, peak);
  return peak;
}

export function mixPeaks(m: StemModel, a: number, g: VoiceShape, ceiling: number): { peak: number; over: { frame: number; peak: number }[]; exactFrames: number } {
  let peak = 0, exactFrames = 0;
  const over: { frame: number; peak: number }[] = [];
  const done = new Set<number>();
  const check = (f: number) => {
    const p = a * framePeak(m, f, g);
    exactFrames += 1;
    done.add(f);
    if (p > peak) peak = p;
    if (p > ceiling) over.push({ frame: f, peak: p });
  };
  const bounds = Array.from({ length: m.frames }, (_, f) => ({ f, b: a * frameBound(m, f) }));
  for (const x of bounds) if (x.b > ceiling) check(x.f);
  bounds.sort((x, y) => y.b - x.b);
  for (const x of bounds) {
    if (x.b <= peak) break;
    if (!done.has(x.f)) check(x.f);
  }
  over.sort((x, y) => x.frame - y.frame);
  return { peak, over, exactFrames };
}
