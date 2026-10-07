// The original face_track.py shot rule: L2-normalized 32x16 HSV histogram, ChiSquare-alt > 0.35.
// Pixel decoding comes from bundled ffmpeg; no Python/OpenCV environment is created.
export function hsvHistogram(rgb: Uint8Array): Float64Array {
  const bins = new Float64Array(32 * 16);
  for (let i = 0; i + 2 < rgb.length; i += 3) {
    const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2], max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    // OpenCV's 8-bit HSV path uses 12-bit integer lookup tables, not floating hue rounding.
    const saturation = max ? (delta * Math.round((255 << 12) / max) + 2048) >> 12 : 0;
    let hue = delta ? ((max === r ? g - b : max === g ? b - r + 2 * delta : r - g + 4 * delta) * Math.round((180 << 12) / (6 * delta)) + 2048) >> 12 : 0;
    if (hue < 0) hue += 180;
    bins[Math.min(31, Math.floor(hue * 32 / 180)) * 16 + Math.min(15, Math.floor(saturation * 16 / 256))] += 1;
  }
  const norm = Math.hypot(...bins);
  if (norm) for (let i = 0; i < bins.length; i++) bins[i] /= norm;
  return bins;
}
export function histogramDistance(a: Float64Array, b: Float64Array): number {
  let distance = 0;
  for (let i = 0; i < a.length; i++) if (a[i] + b[i] > 0) distance += 2 * (a[i] - b[i]) ** 2 / (a[i] + b[i]);
  return distance;
}
export async function histogramCuts(input: { read(index: number): Promise<Uint8Array>; count: number; times: number[] }): Promise<number[]> {
  if (input.times.length !== input.count || input.times.some((t, i) => !Number.isFinite(t) || t < 0 || (i > 0 && t <= input.times[i - 1]))) throw new Error("Invalid camera sample source clock.");
  const cuts: number[] = []; let previous: Float64Array | null = null;
  for (let index = 0; index < input.count; index++) {
    const current = hsvHistogram(await input.read(index));
    if (previous && histogramDistance(previous, current) > 0.35) cuts.push(input.times[index]);
    previous = current;
  }
  return cuts;
}
