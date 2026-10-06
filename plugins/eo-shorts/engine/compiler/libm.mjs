/** cos and cbrt computed the same way in every JavaScript engine: plain IEEE double arithmetic ports of fdlibm (cos)
 *  and FreeBSD msun (cbrt), so the compiler gives the same bits in the panel and in Node.
 *
 *  ====================================================
 *  Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 *  Developed at SunSoft, a Sun Microsystems, Inc. business.
 *  Permission to use, copy, modify, and distribute this
 *  software is freely granted, provided that this notice
 *  is preserved.
 *  ====================================================
 *  cbrt: optimized by Bruce D. Evans (FreeBSD msun s_cbrt.c). */

const view = new DataView(new ArrayBuffer(8));
const hiWord = x => (view.setFloat64(0, x), view.getInt32(0));
const loWord = x => (view.setFloat64(0, x), view.getUint32(4));
const fromWords = (hi, lo) => (view.setInt32(0, hi | 0), view.setUint32(4, lo >>> 0), view.getFloat64(0));

const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
  C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
function kernelCos(x, y) {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix < 0x3e400000) return 1;
  const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3fe90000 ? 0.28125 : fromWords(ix - 0x00200000, 0);
  const hz = 0.5 * z - qx, a = 1 - qx;
  return a - (hz - (z * r - x * y));
}

const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
  S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
function kernelSin(x, y) {
  if ((hiWord(x) & 0x7fffffff) < 0x3e400000) return x;
  const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}

const INV_PIO2 = 6.36619772367581382433e-01, PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11,
  PIO2_2 = 6.07710050630396597660e-11, PIO2_2T = 2.02226624879595063154e-21, PIO2_3 = 2.02226624871116645580e-21,
  PIO2_3T = 8.47842766036889956997e-32;
const NPIO2_HW = [0x3ff921fb, 0x400921fb, 0x4012d97c, 0x401921fb, 0x401f6a7a, 0x4022d97c, 0x4025fdbb, 0x402921fb, 0x402c463a,
  0x402f6a7a, 0x4031475c, 0x4032d97c, 0x40346b9c, 0x4035fdbb, 0x40378fdb, 0x403921fb, 0x403ab41b, 0x403c463a, 0x403dd85a,
  0x403f6a7a, 0x40407e4c, 0x4041475c, 0x4042106c, 0x4042d97c, 0x4043a28c, 0x40446b9c, 0x404534ac, 0x4045fdbb, 0x4046c6cb,
  0x40478fdb, 0x404858eb, 0x404921fb];
function remPio2(x) {
  const hx = hiWord(x), ix = hx & 0x7fffffff;
  if (ix < 0x4002d97c) {
    const s = hx > 0 ? 1 : -1;
    let z = x - s * PIO2_1, y0, y1;
    if (ix !== 0x3ff921fb) { y0 = z - s * PIO2_1T; y1 = (z - y0) - s * PIO2_1T; }
    else { z -= s * PIO2_2; y0 = z - s * PIO2_2T; y1 = (z - y0) - s * PIO2_2T; }
    return [s, y0, y1];
  }
  if (ix > 0x413921fb) return null;
  let t = Math.abs(x);
  const n = (t * INV_PIO2 + 0.5) | 0, fn = n;
  let r = t - fn * PIO2_1, w = fn * PIO2_1T, y0 = r - w;
  if (!(n < 32 && ix !== NPIO2_HW[n - 1])) {
    const j = ix >> 20;
    let i = j - ((hiWord(y0) >> 20) & 0x7ff);
    if (i > 16) {
      t = r; w = fn * PIO2_2; r = t - w; w = fn * PIO2_2T - ((t - r) - w); y0 = r - w;
      i = j - ((hiWord(y0) >> 20) & 0x7ff);
      if (i > 49) { t = r; w = fn * PIO2_3; r = t - w; w = fn * PIO2_3T - ((t - r) - w); y0 = r - w; }
    }
  }
  const y1 = (r - y0) - w;
  return hx < 0 ? [-n, -y0, -y1] : [n, y0, y1];
}

export function cos(x) {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelCos(x, 0);
  if (ix >= 0x7ff00000) return x - x;
  const red = remPio2(x);
  if (!red) return Math.cos(x);
  const [n, y0, y1] = red;
  switch (n & 3) {
    case 0: return kernelCos(y0, y1);
    case 1: return -kernelSin(y0, y1);
    case 2: return -kernelCos(y0, y1);
    default: return kernelSin(y0, y1);
  }
}

const B1 = 715094163, B2 = 696219795;
const P0 = 1.87595182427177009643, P1 = -1.88497979543377169875, P2 = 1.621429720105354466140,
  P3 = -0.758397934778766047437, P4 = 0.145996192886612446982;

export function cbrt(x) {
  const hi = hiWord(x), low = loWord(x), sign = hi & 0x80000000, hx = (hi ^ sign) >>> 0;
  if (hx >= 0x7ff00000) return x + x;
  let t;
  if (hx < 0x00100000) {
    if ((hx | low) === 0) return x;
    t = fromWords(0x43500000, 0) * x;
    t = fromWords(sign | (Math.floor((hiWord(t) & 0x7fffffff) / 3) + B2), 0);
  } else t = fromWords(sign | (Math.floor(hx / 3) + B1), 0);
  let r = (t * t) * (t / x);
  t = t * ((P0 + r * (P1 + r * P2)) + ((r * r) * r) * (P3 + r * P4));
  let h = hiWord(t), l = loWord(t) + 0x80000000;
  if (l > 0xffffffff) { l -= 0x100000000; h += 1; }
  t = fromWords(h, l & 0xc0000000);
  const s = t * t;
  r = x / s;
  const w = t + t;
  r = (r - t) / (w + r);
  return t + t * r;
}
