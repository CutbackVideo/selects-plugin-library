import type { Pcm } from "./wavCodec.ts";

export type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

export function kWeightingBiquads(sampleRate: number): [Biquad, Biquad] {
  let f0 = 1681.974450955533;
  const G = 3.999843853973347;
  let Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / sampleRate);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const a0 = 1 + K / Q + K * K;
  const shelf: Biquad = {
    b0: (Vh + (Vb * K) / Q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };
  f0 = 38.13547087602444;
  Q = 0.5003270373238773;
  K = Math.tan((Math.PI * f0) / sampleRate);
  const d = 1 + K / Q + K * K;
  const highPass: Biquad = { b0: 1, b1: -2, b2: 1, a1: (2 * (K * K - 1)) / d, a2: (1 - K / Q + K * K) / d };
  return [shelf, highPass];
}

export function kWeight(x: Float32Array, sampleRate: number): Float64Array {
  const [s, h] = kWeightingBiquads(sampleRate);
  const y = new Float64Array(x.length);
  let z1 = 0, z2 = 0, w1 = 0, w2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const xi = x[i];
    const u = s.b0 * xi + z1;
    z1 = s.b1 * xi - s.a1 * u + z2;
    z2 = s.b2 * xi - s.a2 * u;
    const v = h.b0 * u + w1;
    w1 = h.b1 * u - h.a1 * v + w2;
    w2 = h.b2 * u - h.a2 * v;
    y[i] = v;
  }
  return y;
}

export const subBlockSize = (sampleRate: number): number => Math.round(sampleRate / 100);
export const SUBS_PER_BLOCK = 40;
export const SUBS_PER_HOP = 10;

export function channelWeight(channel: number, count: number): number {
  if (count >= 5 && (channel === 3 || channel === 4)) return 1.41;
  return 1;
}

export function blockPowers(subSums: Float64Array, subSize: number): Float64Array {
  const n = subSums.length >= SUBS_PER_BLOCK ? Math.floor((subSums.length - SUBS_PER_BLOCK) / SUBS_PER_HOP) + 1 : 0;
  const out = new Float64Array(n);
  for (let j = 0; j < n; j += 1) {
    let s = 0;
    for (let k = j * SUBS_PER_HOP, e = k + SUBS_PER_BLOCK; k < e; k += 1) s += subSums[k];
    out[j] = s / (SUBS_PER_BLOCK * subSize);
  }
  return out;
}

const lufs = (power: number) => -0.691 + 10 * Math.log10(power);

export function gatedLoudness(blocks: ArrayLike<number>): number {
  let sum = 0, n = 0;
  for (let j = 0; j < blocks.length; j += 1) if (lufs(blocks[j]) > -70) (sum += blocks[j]), (n += 1);
  if (!n) return -Infinity;
  const relative = lufs(sum / n) - 10;
  let s2 = 0, n2 = 0;
  for (let j = 0; j < blocks.length; j += 1) {
    const l = lufs(blocks[j]);
    if (l > -70 && l > relative) (s2 += blocks[j]), (n2 += 1);
  }
  return n2 ? lufs(s2 / n2) : -Infinity;
}

export function subBlockEnergies(pcm: Pcm): Float64Array {
  const sub = subBlockSize(pcm.sampleRate);
  const n = pcm.channels[0] ? Math.floor(pcm.channels[0].length / sub) : 0;
  const out = new Float64Array(n);
  pcm.channels.forEach((ch, c) => {
    const w = channelWeight(c, pcm.channels.length);
    const y = kWeight(ch, pcm.sampleRate);
    for (let s = 0; s < n; s += 1) {
      let e = 0;
      for (let i = s * sub, end = i + sub; i < end; i += 1) e += y[i] * y[i];
      out[s] += w * e;
    }
  });
  return out;
}

export function integratedLoudness(pcm: Pcm): number {
  return gatedLoudness(blockPowers(subBlockEnergies(pcm), subBlockSize(pcm.sampleRate)));
}

export const OVERSAMPLE = 4;
export const TAPS_PER_PHASE = 16;
const KAISER_BETA = 9;
const CUTOFF = 0.97;

function besselI0(x: number): number {
  let sum = 1, term = 1;
  for (let k = 1; k < 50; k += 1) {
    term *= (x / (2 * k)) * (x / (2 * k));
    sum += term;
    if (term < sum * 1e-17) break;
  }
  return sum;
}

export type Interpolator = {
  phases: Float64Array[];
  delay: number;
  gain: number;
};

export const INTERPOLATOR: Interpolator = (() => {
  const L = OVERSAMPLE * TAPS_PER_PHASE;
  const centre = (L - 1) / 2;
  const fc = (0.5 * CUTOFF) / OVERSAMPLE;
  const h = new Float64Array(L);
  const i0b = besselI0(KAISER_BETA);
  let total = 0;
  for (let n = 0; n < L; n += 1) {
    const t = n - centre;
    const sinc = t === 0 ? 1 : Math.sin(2 * Math.PI * fc * t) / (2 * Math.PI * fc * t);
    const r = (2 * n) / (L - 1) - 1;
    const w = besselI0(KAISER_BETA * Math.sqrt(Math.max(0, 1 - r * r))) / i0b;
    h[n] = 2 * fc * sinc * w;
    total += h[n];
  }
  for (let n = 0; n < L; n += 1) h[n] *= OVERSAMPLE / total;
  const phases = Array.from({ length: OVERSAMPLE }, (_, k) => {
    const p = new Float64Array(TAPS_PER_PHASE);
    for (let j = 0; j < TAPS_PER_PHASE; j += 1) p[j] = h[OVERSAMPLE * j + k];
    return p;
  });
  const gain = Math.max(...phases.map((p) => p.reduce((s, x) => s + Math.abs(x), 0)));
  return { phases, delay: centre / OVERSAMPLE, gain };
})();

export function oversampledPeak(signal: (i: number) => number, length: number, from: number, to: number, ip: Interpolator = INTERPOLATOR): number {
  const T = ip.phases[0].length;
  const D = ip.delay;
  let peak = 0;
  const mFrom = Math.floor(from + D), mTo = Math.ceil(to + D);
  const lo = Math.max(0, mFrom - T - 1), hi = Math.min(length, mTo + 1);
  const buf = new Float64Array(Math.max(0, hi - lo));
  for (let i = lo; i < hi; i += 1) buf[i - lo] = signal(i);
  for (let i = Math.max(lo, Math.ceil(from)); i < Math.min(hi, to); i += 1) {
    const a = Math.abs(buf[i - lo]);
    if (a > peak) peak = a;
  }
  for (let m = mFrom; m <= mTo; m += 1) {
    for (let k = 0; k < ip.phases.length; k += 1) {
      const tau = m + k / ip.phases.length - D;
      if (tau < from || tau >= to) continue;
      const p = ip.phases[k];
      let y = 0;
      for (let j = 0; j < T; j += 1) {
        const i = m - j;
        if (i >= lo && i < hi) y += buf[i - lo] * p[j];
      }
      const a = Math.abs(y);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

export function truePeak(pcm: Pcm): number {
  let peak = 0;
  const STEP = 1 << 15;
  for (const ch of pcm.channels) {
    for (let from = 0; from < ch.length; from += STEP) {
      const p = oversampledPeak((i) => ch[i], ch.length, from, Math.min(ch.length, from + STEP));
      if (p > peak) peak = p;
    }
  }
  return peak > 0 ? 20 * Math.log10(peak) : -Infinity;
}

export const toDb = (linear: number): number => (linear > 0 ? 20 * Math.log10(linear) : -Infinity);
export const fromDb = (db: number): number => Math.pow(10, db / 20);
