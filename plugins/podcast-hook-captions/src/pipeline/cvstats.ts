// The pixel and number maths face_track.py gets from OpenCV and NumPy, reproduced so the panel computes the
// same figures without Python:
// - cv2.cvtColor BGR2HSV / BGR2GRAY on 8-bit images (OpenCV's fixed-point tables, so the bytes match);
// - cv2.calcHist([hsv], [0, 1], None, [32, 16], [0, 180, 0, 256]) + cv2.normalize (L2) + compareHist CHISQR_ALT;
// - NumPy's median, mean (pairwise summation), percentile (linear) and Python's round() (half to even).
// Frames are packed BGR24 (ffmpeg -pix_fmt bgr24), the layout cv2 hands face_track.py.

// ---------------------------------------------------------------- OpenCV 8-bit colour conversions
const HSV_SHIFT = 12;
const HSV_HALF = 1 << (HSV_SHIFT - 1);
// sdiv_table / hdiv_table180 of OpenCV's RGB2HSV_b (no exact .5 ties for i < 256, so Math.round = cvRound here)
const SDIV = new Int32Array(256);
const HDIV180 = new Int32Array(256);
for (let i = 1; i < 256; i += 1) {
  SDIV[i] = Math.round((255 << HSV_SHIFT) / i);
  HDIV180[i] = Math.round((180 << HSV_SHIFT) / (6 * i));
}

// calcHist lookup for uniform ranges: bin = floor(j * bins / (hi - lo)), values outside [lo, hi) are skipped
export const HIST_H_BINS = 32;
export const HIST_S_BINS = 16;
const H_TAB = new Int32Array(256);
const S_TAB = new Int32Array(256);
for (let j = 0; j < 256; j += 1) {
  H_TAB[j] = j < 180 ? Math.floor(j * (HIST_H_BINS / 180)) : -1;
  S_TAB[j] = Math.floor(j * (HIST_S_BINS / 256));
}

/** One sampled frame's colour figures, as face_track.py collects them: [R, G, B means, mean S / 255, P5, P95 of gray]. */
export type ColorRow = [number, number, number, number, number, number];

/**
 * face_track.py's histogram(img): the HSV 32x16 hue-saturation histogram, L2-normalized as float32 (cv2.normalize).
 * With `color`, also the colour row (channel means, mean saturation, gray percentiles) from the same pass.
 */
export function frameStats(bgr: Uint8Array, width: number, height: number, color: boolean): { hist: Float32Array; color: ColorRow | null } {
  const n = width * height;
  const counts = new Float64Array(HIST_H_BINS * HIST_S_BINS);
  const grayCounts = color ? new Float64Array(256) : null;
  let sb = 0, sg = 0, sr = 0, ss = 0;
  for (let i = 0, p = 0; i < n; i += 1, p += 3) {
    const b = bgr[p], g = bgr[p + 1], r = bgr[p + 2];
    // RGB2HSV_b: v = max(b, g, r), the hue branch prefers r, then g
    let v = b, mn = b;
    if (g > v) v = g;
    if (r > v) v = r;
    if (g < mn) mn = g;
    if (r < mn) mn = r;
    const diff = v - mn;
    const s = (diff * SDIV[v] + HSV_HALF) >> HSV_SHIFT;
    let h = v === r ? g - b : v === g ? b - r + 2 * diff : r - g + 4 * diff;
    h = (h * HDIV180[diff] + HSV_HALF) >> HSV_SHIFT;
    if (h < 0) h += 180;
    const hb = H_TAB[h];
    if (hb >= 0) counts[hb * HIST_S_BINS + S_TAB[s]] += 1;
    if (grayCounts) {
      sb += b;
      sg += g;
      sr += r;
      ss += s;
      // BGR2GRAY fixed point (yuv_shift 14): (B*1868 + G*9617 + R*4899 + 8192) >> 14
      grayCounts[(b * 1868 + g * 9617 + r * 4899 + 8192) >> 14] += 1;
    }
  }
  // cv2.normalize(h, h): NORM_L2, alpha 1, the norm accumulated in double, the result stored as float32
  let sq = 0;
  for (let i = 0; i < counts.length; i += 1) sq += counts[i] * counts[i];
  const scale = sq > 0 ? 1 / Math.sqrt(sq) : 0;
  const hist = new Float32Array(counts.length);
  for (let i = 0; i < counts.length; i += 1) hist[i] = counts[i] * scale;
  if (!grayCounts) return { hist, color: null };
  // numpy: uint8 channel means are exact integer sums over n; percentiles use linear interpolation
  return {
    hist,
    color: [sr / n, sg / n, sb / n, ss / n / 255, percentileOfCounts(grayCounts, 5), percentileOfCounts(grayCounts, 95)],
  };
}

/** cv2.compareHist(a, b, HISTCMP_CHISQR_ALT) = 2 * sum((a - b)^2 / (a + b)), in double. */
export function chiSquareAlt(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    const t = a[i] + b[i];
    if (Math.abs(t) > 2.220446049250313e-16) s += (d * d) / t;
  }
  return 2 * s;
}

// ---------------------------------------------------------------- NumPy / Python numerics

/** np.percentile(values, q) (method "linear") over 8-bit values given as a 256-bin count histogram. */
export function percentileOfCounts(counts: ArrayLike<number>, q: number): number {
  let n = 0;
  for (let i = 0; i < counts.length; i += 1) n += counts[i];
  if (!n) return NaN;
  const virtual = (n - 1) * (q / 100);
  const lo = Math.floor(virtual);
  const valueAt = (rank: number) => {
    let seen = 0;
    for (let v = 0; v < counts.length; v += 1) {
      seen += counts[v];
      if (rank < seen) return v;
    }
    return counts.length - 1;
  };
  const a = valueAt(lo);
  const b = valueAt(Math.min(n - 1, lo + 1));
  return lerp(a, b, virtual - lo);
}

/** numpy's _lerp (the form it uses for t >= 0.5 keeps the upper end exact). */
function lerp(a: number, b: number, t: number): number {
  const d = b - a;
  return t >= 0.5 ? b - d * (1 - t) : a + d * t;
}

/** np.median: the middle value, or the mean of the two middle values. NaN for none. */
export function npMedian(xs: ArrayLike<number>): number {
  const a = Array.from(xs).sort((p, q) => p - q);
  const n = a.length;
  if (!n) return NaN;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

/** np.mean of a float64 array: numpy's pairwise summation (8-way unrolled blocks of up to 128), then / n. */
export function npMean(xs: ArrayLike<number>): number {
  return xs.length ? pairwiseSum(xs, 0, xs.length) / xs.length : NaN;
}

function pairwiseSum(a: ArrayLike<number>, from: number, n: number): number {
  if (n < 8) {
    let s = 0;
    for (let i = 0; i < n; i += 1) s += a[from + i];
    return s;
  }
  if (n <= 128) {
    const r = [a[from], a[from + 1], a[from + 2], a[from + 3], a[from + 4], a[from + 5], a[from + 6], a[from + 7]];
    let i = 8;
    for (; i < n - (n % 8); i += 8) for (let k = 0; k < 8; k += 1) r[k] += a[from + i + k];
    let s = (r[0] + r[1] + (r[2] + r[3])) + (r[4] + r[5] + (r[6] + r[7]));
    for (; i < n; i += 1) s += a[from + i];
    return s;
  }
  let n2 = Math.floor(n / 2);
  n2 -= n2 % 8;
  return pairwiseSum(a, from, n2) + pairwiseSum(a, from + n2, n - n2);
}

/**
 * Python's round(x, nd) for a float: the decimal nearest to x's exact binary value, ties to even, returned as the
 * nearest double (an integer divided by 10^nd is correctly rounded, as CPython's result is).
 */
export function pyRound(x: number, nd = 0): number {
  if (!Number.isFinite(x)) return x;
  const neg = x < 0;
  const s = Math.abs(x).toFixed(Math.min(100, nd + 30)); // exact far enough past the cut to tell a tie
  const dot = s.indexOf(".");
  const ip = dot < 0 ? s : s.slice(0, dot);
  const fp = dot < 0 ? "" : s.slice(dot + 1);
  const digits = ip + fp.slice(0, nd);
  const rest = fp.slice(nd);
  let up = false;
  if (rest[0] > "5") up = true;
  else if (rest[0] === "5") up = /[1-9]/.test(rest.slice(1)) || Number(digits[digits.length - 1]) % 2 === 1;
  const mag = (Number(digits) + (up ? 1 : 0)) / Math.pow(10, nd);
  const out = neg ? -mag : mag;
  return out === 0 ? 0 : out; // no -0 in JSON
}
