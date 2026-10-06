export type Rgba = { width: number; height: number; data: Uint8Array };

export type DecodedPng = Rgba & {
  colorType: number;
  bitDepth: number;
  hasAlpha: boolean;
  pixFmt: string;
};

export class PngUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PngUnsupportedError";
  }
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && SIGNATURE.every((b, i) => bytes[i] === b);
}

let CRC_TABLE: Uint32Array | null = null;

export function crc32(bytes: Uint8Array, start = 0, end = bytes.length, seed = 0): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = (seed ^ 0xffffffff) >>> 0;
  for (let i = start; i < end; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function pipeBytes(bytes: Uint8Array, transform: { readable: ReadableStream; writable: WritableStream }): Promise<Uint8Array> {
  const out = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(transform as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  return pipeBytes(bytes, new DecompressionStream("deflate"));
}

export function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  return pipeBytes(bytes, new CompressionStream("deflate"));
}

const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const PIX_FMT: Record<number, string> = { 0: "gray", 2: "rgb24", 3: "pal8", 4: "ya8", 6: "rgba" };

export function readPngHeader(bytes: Uint8Array): { width: number; height: number; bitDepth: number; colorType: number; interlace: number } {
  if (!isPng(bytes)) throw new PngUnsupportedError("Not a PNG file.");
  if (bytes.length < 33 || String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR") throw new Error("The PNG file has no header.");
  return { width: u32(bytes, 16), height: u32(bytes, 20), bitDepth: bytes[24], colorType: bytes[25], interlace: bytes[28] };
}

export async function decodePng(bytes: Uint8Array): Promise<DecodedPng> {
  const head = readPngHeader(bytes);
  const { width, height, bitDepth, colorType, interlace } = head;
  if (!(colorType in CHANNELS)) throw new PngUnsupportedError("PNG colour type " + colorType + " is not supported.");
  if (interlace !== 0) throw new PngUnsupportedError("Interlaced PNG is not supported.");
  const okDepth = colorType === 3 ? [1, 2, 4, 8].includes(bitDepth) : colorType === 0 ? [1, 2, 4, 8, 16].includes(bitDepth) : [8, 16].includes(bitDepth);
  if (!okDepth) throw new PngUnsupportedError("PNG bit depth " + bitDepth + " with colour type " + colorType + " is not supported.");
  if (!width || !height) throw new Error("The PNG file has no pixels.");
  const idat: Uint8Array[] = [];
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  let o = 8;
  while (o + 8 <= bytes.length) {
    const len = u32(bytes, o);
    const type = String.fromCharCode(bytes[o + 4], bytes[o + 5], bytes[o + 6], bytes[o + 7]);
    const data = bytes.subarray(o + 8, o + 8 + len);
    if (data.length !== len) throw new Error("The PNG file is cut short.");
    if (type === "IDAT") idat.push(data);
    else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IEND") break;
    o += 12 + len;
  }
  if (!idat.length) throw new Error("The PNG file has no image data.");
  const total = idat.reduce((n, c) => n + c.length, 0);
  const z = new Uint8Array(total);
  let p = 0;
  for (const c of idat) {
    z.set(c, p);
    p += c.length;
  }
  const raw = await inflate(z);
  const channels = CHANNELS[colorType];
  const bitsPerPixel = channels * bitDepth;
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  if (raw.length < height * (stride + 1)) throw new Error("The PNG image data is cut short.");
  const lines = unfilter(raw, height, stride, bpp);
  const rgba = new Uint8Array(width * height * 4);
  const sample = bitDepth === 16 ? (line: Uint8Array, i: number) => line[i * 2] : null;
  for (let y = 0; y < height; y += 1) {
    const line = lines.subarray(y * stride, (y + 1) * stride);
    const row = y * width * 4;
    if (bitDepth < 8) {
      const perByte = 8 / bitDepth;
      const mask = (1 << bitDepth) - 1;
      const scale = colorType === 0 ? 255 / mask : 1;
      for (let x = 0; x < width; x += 1) {
        const v = (line[(x / perByte) | 0] >> ((perByte - 1 - (x % perByte)) * bitDepth)) & mask;
        writeIndexed(rgba, row + x * 4, colorType, v, scale, palette, trns, bitDepth);
      }
      continue;
    }
    for (let x = 0; x < width; x += 1) {
      const d = row + x * 4;
      const s = x * channels;
      const at = (k: number) => (sample ? sample(line, s + k) : line[s + k]);
      if (colorType === 6) {
        rgba[d] = at(0);
        rgba[d + 1] = at(1);
        rgba[d + 2] = at(2);
        rgba[d + 3] = at(3);
      } else if (colorType === 2) {
        rgba[d] = at(0);
        rgba[d + 1] = at(1);
        rgba[d + 2] = at(2);
        rgba[d + 3] = 255;
        if (trns && trns.length >= 6 && matchesTrnsRgb(line, s, bitDepth, trns)) rgba[d + 3] = 0;
      } else if (colorType === 4) {
        rgba[d] = rgba[d + 1] = rgba[d + 2] = at(0);
        rgba[d + 3] = at(1);
      } else if (colorType === 0) {
        rgba[d] = rgba[d + 1] = rgba[d + 2] = at(0);
        rgba[d + 3] = 255;
        if (trns && trns.length >= 2 && matchesTrnsGrey(line, s, bitDepth, trns)) rgba[d + 3] = 0;
      } else {
        writeIndexed(rgba, d, 3, line[s], 1, palette, trns, 8);
      }
    }
  }
  return {
    width,
    height,
    data: rgba,
    colorType,
    bitDepth,
    hasAlpha: colorType === 4 || colorType === 6 || !!trns,
    pixFmt: PIX_FMT[colorType] + (bitDepth === 16 ? "16" : ""),
  };
}

function writeIndexed(out: Uint8Array, d: number, colorType: number, v: number, scale: number, palette: Uint8Array | null, trns: Uint8Array | null, bitDepth: number): void {
  if (colorType === 3) {
    if (!palette || v * 3 + 2 >= palette.length) throw new Error("The PNG palette is missing an entry.");
    out[d] = palette[v * 3];
    out[d + 1] = palette[v * 3 + 1];
    out[d + 2] = palette[v * 3 + 2];
    out[d + 3] = trns && v < trns.length ? trns[v] : 255;
    return;
  }
  const g = Math.round(v * scale);
  out[d] = out[d + 1] = out[d + 2] = g;
  out[d + 3] = trns && trns.length >= 2 && ((trns[0] << 8) | trns[1]) === v && bitDepth < 8 ? 0 : 255;
}

function matchesTrnsRgb(line: Uint8Array, s: number, bitDepth: number, trns: Uint8Array): boolean {
  for (let k = 0; k < 3; k += 1) {
    const v = bitDepth === 16 ? (line[(s + k) * 2] << 8) | line[(s + k) * 2 + 1] : line[s + k];
    if (v !== ((trns[k * 2] << 8) | trns[k * 2 + 1])) return false;
  }
  return true;
}

function matchesTrnsGrey(line: Uint8Array, s: number, bitDepth: number, trns: Uint8Array): boolean {
  const v = bitDepth === 16 ? (line[s * 2] << 8) | line[s * 2 + 1] : line[s];
  return v === ((trns[0] << 8) | trns[1]);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function unfilter(raw: Uint8Array, height: number, stride: number, bpp: number): Uint8Array {
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y += 1) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prev = dst - stride;
    for (let i = 0; i < stride; i += 1) {
      const x = raw[src + i];
      const a = i >= bpp ? out[dst + i - bpp] : 0;
      const b = y > 0 ? out[prev + i] : 0;
      const c = y > 0 && i >= bpp ? out[prev + i - bpp] : 0;
      let v: number;
      switch (f) {
        case 0:
          v = x;
          break;
        case 1:
          v = x + a;
          break;
        case 2:
          v = x + b;
          break;
        case 3:
          v = x + ((a + b) >> 1);
          break;
        case 4:
          v = x + paeth(a, b, c);
          break;
        default:
          throw new Error("The PNG file uses an unknown line filter (" + f + ").");
      }
      out[dst + i] = v & 0xff;
    }
  }
  return out;
}

function filterLines(data: Uint8Array, height: number, stride: number, bpp: number): Uint8Array {
  const out = new Uint8Array(height * (stride + 1));
  const cand = Array.from({ length: 5 }, () => new Uint8Array(stride));
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    const prev = row - stride;
    let best = 0;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f += 1) {
      const line = cand[f];
      let score = 0;
      for (let i = 0; i < stride; i += 1) {
        const x = data[row + i];
        const a = i >= bpp ? data[row + i - bpp] : 0;
        const b = y > 0 ? data[prev + i] : 0;
        const c = y > 0 && i >= bpp ? data[prev + i - bpp] : 0;
        const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
        const v = (x - pred) & 0xff;
        line[i] = v;
        score += v < 128 ? v : 256 - v;
        if (score >= bestScore) break;
      }
      if (score < bestScore) {
        bestScore = score;
        best = f;
      }
    }
    out[y * (stride + 1)] = best;
    out.set(cand[best], y * (stride + 1) + 1);
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  v.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

export async function encodePng(img: Rgba): Promise<Uint8Array> {
  const { width, height, data } = img;
  if (data.length !== width * height * 4) throw new Error("encodePng: " + data.length + " bytes is not " + width + "x" + height + " RGBA.");
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const z = await deflate(filterLines(data, height, width * 4, 4));
  const parts = [new Uint8Array(SIGNATURE), chunk("IHDR", ihdr), chunk("IDAT", z), chunk("IEND", new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
