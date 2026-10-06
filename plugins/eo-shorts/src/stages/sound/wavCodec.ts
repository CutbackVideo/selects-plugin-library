export type Pcm = { sampleRate: number; channels: Float32Array[] };

const tag = (b: Uint8Array, at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);

export const frameCount = (pcm: Pcm): number => (pcm.channels[0] ? pcm.channels[0].length : 0);

export function decodeWav(bytes: Uint8Array): Pcm {
  if (bytes.length < 12 || tag(bytes, 0) !== "RIFF" || tag(bytes, 8) !== "WAVE") throw new Error("Not a WAV file (no RIFF/WAVE header).");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let fmt: { format: number; channels: number; sampleRate: number; bits: number } | null = null;
  let data: { at: number; size: number } | null = null;
  for (let at = 12; at + 8 <= bytes.length; ) {
    const id = tag(bytes, at);
    let size = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === "data" && (size === 0 || size === 0xffffffff || body + size > bytes.length)) size = bytes.length - body;
    if (id === "fmt ") {
      let format = view.getUint16(body, true);
      const channels = view.getUint16(body + 2, true);
      const sampleRate = view.getUint32(body + 4, true);
      const bits = view.getUint16(body + 14, true);
      if (format === 0xfffe && size >= 26) format = view.getUint16(body + 24, true);
      fmt = { format, channels, sampleRate, bits };
    } else if (id === "data") {
      data = { at: body, size };
      if (fmt) break;
    }
    at = body + size + (size & 1);
  }
  if (!fmt) throw new Error("The WAV file has no fmt chunk.");
  if (!data) throw new Error("The WAV file has no data chunk.");
  const { format, channels: nch, sampleRate, bits } = fmt;
  if (nch < 1) throw new Error("The WAV file has no channels.");
  const bytesPer = bits / 8;
  if (!Number.isInteger(bytesPer) || bytesPer < 1) throw new Error("Unsupported WAV sample size: " + bits + " bits.");
  const n = Math.floor(data.size / (bytesPer * nch));
  const channels = Array.from({ length: nch }, () => new Float32Array(n));
  const read = sampleReader(view, format, bits);
  let p = data.at;
  for (let i = 0; i < n; i += 1) {
    for (let c = 0; c < nch; c += 1) {
      channels[c][i] = read(p);
      p += bytesPer;
    }
  }
  return { sampleRate, channels };
}

function sampleReader(view: DataView, format: number, bits: number): (at: number) => number {
  if (format === 3 && bits === 32) return (at) => view.getFloat32(at, true);
  if (format === 3 && bits === 64) return (at) => view.getFloat64(at, true);
  if (format !== 1) throw new Error("Unsupported WAV format " + format + " (" + bits + " bits).");
  if (bits === 16) return (at) => view.getInt16(at, true) / 32768;
  if (bits === 24) return (at) => ((view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getInt8(at + 2) << 16)) / 8388608);
  if (bits === 32) return (at) => view.getInt32(at, true) / 2147483648;
  if (bits === 8) return (at) => (view.getUint8(at) - 128) / 128;
  throw new Error("Unsupported PCM sample size: " + bits + " bits.");
}

export function encodeWav(pcm: Pcm, kind: "s16" | "f32" = "s16"): Uint8Array {
  const nch = pcm.channels.length;
  const n = frameCount(pcm);
  const bytesPer = kind === "s16" ? 2 : 4;
  const dataSize = n * nch * bytesPer;
  const out = new Uint8Array(44 + dataSize);
  const v = new DataView(out.buffer);
  const put = (at: number, s: string) => {
    for (let i = 0; i < 4; i += 1) out[at + i] = s.charCodeAt(i);
  };
  put(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  put(8, "WAVE");
  put(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, kind === "s16" ? 1 : 3, true);
  v.setUint16(22, nch, true);
  v.setUint32(24, pcm.sampleRate, true);
  v.setUint32(28, pcm.sampleRate * nch * bytesPer, true);
  v.setUint16(32, nch * bytesPer, true);
  v.setUint16(34, bytesPer * 8, true);
  put(36, "data");
  v.setUint32(40, dataSize, true);
  let p = 44;
  for (let i = 0; i < n; i += 1) {
    for (let c = 0; c < nch; c += 1) {
      const x = pcm.channels[c][i];
      if (kind === "s16") v.setInt16(p, Math.max(-32768, Math.min(32767, Math.round(x * 32768))), true);
      else v.setFloat32(p, x, true);
      p += bytesPer;
    }
  }
  return out;
}

export function subtractPcm(b: Pcm, a: Pcm): Pcm {
  if (a.sampleRate !== b.sampleRate) throw new Error("The renders differ in sample rate (" + a.sampleRate + " and " + b.sampleRate + " Hz).");
  if (a.channels.length !== b.channels.length) throw new Error("The renders differ in channel count (" + a.channels.length + " and " + b.channels.length + ").");
  const n = Math.min(frameCount(a), frameCount(b));
  return { sampleRate: a.sampleRate, channels: b.channels.map((ch, c) => {
    const out = new Float32Array(n);
    const av = a.channels[c];
    for (let i = 0; i < n; i += 1) out[i] = ch[i] - av[i];
    return out;
  }) };
}
