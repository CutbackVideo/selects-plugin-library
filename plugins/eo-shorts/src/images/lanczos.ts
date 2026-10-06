import type { Rgba } from "./png.ts";

const PRECISION_BITS = 32 - 8 - 2;
const ONE = 2 ** PRECISION_BITS;
const LANCZOS_SUPPORT = 3;

function sinc(x: number): number {
  if (x === 0) return 1;
  const px = x * Math.PI;
  return Math.sin(px) / px;
}

function lanczos(x: number): number {
  return -3 <= x && x < 3 ? sinc(x) * sinc(x / 3) : 0;
}

export function lanczosCoefficients(inSize: number, outSize: number): { ksize: number; bounds: Int32Array; kk: Float64Array } {
  const in0 = 0;
  const in1 = inSize;
  const scale = (in1 - in0) / outSize;
  const filterscale = scale < 1 ? 1 : scale;
  const support = LANCZOS_SUPPORT * filterscale;
  const ksize = Math.ceil(support) * 2 + 1;
  const bounds = new Int32Array(outSize * 2);
  const kk = new Float64Array(outSize * ksize);
  const ss = 1 / filterscale;
  const k = new Float64Array(ksize);
  for (let xx = 0; xx < outSize; xx += 1) {
    const center = in0 + (xx + 0.5) * scale;
    let xmin = Math.trunc(center - support + 0.5);
    if (xmin < 0) xmin = 0;
    let xmax = Math.trunc(center + support + 0.5);
    if (xmax > inSize) xmax = inSize;
    xmax -= xmin;
    let ww = 0;
    for (let x = 0; x < xmax; x += 1) {
      const w = lanczos((x + xmin - center + 0.5) * ss);
      k[x] = w;
      ww += w;
    }
    for (let x = 0; x < ksize; x += 1) {
      let w = x < xmax ? k[x] : 0;
      if (x < xmax && ww !== 0) w /= ww;
      kk[xx * ksize + x] = w < 0 ? Math.trunc(-0.5 + w * ONE) : Math.trunc(0.5 + w * ONE);
    }
    bounds[xx * 2] = xmin;
    bounds[xx * 2 + 1] = xmax;
  }
  return { ksize, bounds, kk };
}

function clip8(v: number): number {
  const s = Math.floor(v / ONE);
  return s < 0 ? 0 : s > 255 ? 255 : s;
}

export function premultiply(src: Uint8Array): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3];
    for (let c = 0; c < 3; c += 1) {
      const t = src[i + c] * a + 128;
      out[i + c] = ((t >> 8) + t) >> 8;
    }
    out[i + 3] = a;
  }
  return out;
}

export function unpremultiply(src: Uint8Array): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3];
    if (a === 0 || a === 255) {
      out[i] = src[i];
      out[i + 1] = src[i + 1];
      out[i + 2] = src[i + 2];
    } else {
      for (let c = 0; c < 3; c += 1) {
        const v = Math.floor((255 * src[i + c]) / a);
        out[i + c] = v > 255 ? 255 : v;
      }
    }
    out[i + 3] = a;
  }
  return out;
}

export function resampleRgba8(img: Rgba, outW: number, outH: number): Rgba {
  const { width: inW, height: inH, data } = img;
  if (outW < 1 || outH < 1) throw new Error("Cannot resample to " + outW + "x" + outH + ".");
  const needH = outW !== inW;
  const needV = outH !== inH;
  const horiz = lanczosCoefficients(inW, outW);
  const vert = lanczosCoefficients(inH, outH);
  const yFirst = vert.bounds[0];
  const yLast = vert.bounds[outH * 2 - 2] + vert.bounds[outH * 2 - 1];
  let cur: Rgba = img;
  const half = 2 ** (PRECISION_BITS - 1);
  if (needH) {
    const rows = yLast - yFirst;
    const out = new Uint8Array(outW * rows * 4);
    const { ksize, bounds, kk } = horiz;
    for (let yy = 0; yy < rows; yy += 1) {
      const srcRow = (yy + yFirst) * inW * 4;
      for (let xx = 0; xx < outW; xx += 1) {
        const xmin = bounds[xx * 2];
        const xmax = bounds[xx * 2 + 1];
        const kb = xx * ksize;
        let s0 = half;
        let s1 = half;
        let s2 = half;
        let s3 = half;
        for (let x = 0; x < xmax; x += 1) {
          const w = kk[kb + x];
          const p = srcRow + (x + xmin) * 4;
          s0 += data[p] * w;
          s1 += data[p + 1] * w;
          s2 += data[p + 2] * w;
          s3 += data[p + 3] * w;
        }
        const d = (yy * outW + xx) * 4;
        out[d] = clip8(s0);
        out[d + 1] = clip8(s1);
        out[d + 2] = clip8(s2);
        out[d + 3] = clip8(s3);
      }
    }
    cur = { width: outW, height: rows, data: out };
  }
  if (needV) {
    const shift = needH ? yFirst : 0;
    const w = cur.width;
    const src = cur.data;
    const out = new Uint8Array(w * outH * 4);
    const { ksize, bounds, kk } = vert;
    for (let yy = 0; yy < outH; yy += 1) {
      const ymin = bounds[yy * 2] - shift;
      const ymax = bounds[yy * 2 + 1];
      const kb = yy * ksize;
      for (let xx = 0; xx < w; xx += 1) {
        let s0 = half;
        let s1 = half;
        let s2 = half;
        let s3 = half;
        for (let y = 0; y < ymax; y += 1) {
          const k = kk[kb + y];
          const p = ((y + ymin) * w + xx) * 4;
          s0 += src[p] * k;
          s1 += src[p + 1] * k;
          s2 += src[p + 2] * k;
          s3 += src[p + 3] * k;
        }
        const d = (yy * w + xx) * 4;
        out[d] = clip8(s0);
        out[d + 1] = clip8(s1);
        out[d + 2] = clip8(s2);
        out[d + 3] = clip8(s3);
      }
    }
    cur = { width: w, height: outH, data: out };
  } else if (needH && cur.height !== outH) {
    throw new Error("resample: rows do not match");
  }
  return cur === img ? { width: inW, height: inH, data: new Uint8Array(data) } : cur;
}

export function resizeLanczosRgba(img: Rgba, outW: number, outH: number): Rgba {
  if (outW === img.width && outH === img.height) return { width: img.width, height: img.height, data: new Uint8Array(img.data) };
  const pre = premultiply(img.data);
  const r = resampleRgba8({ width: img.width, height: img.height, data: pre }, outW, outH);
  return { width: r.width, height: r.height, data: unpremultiply(r.data) };
}
