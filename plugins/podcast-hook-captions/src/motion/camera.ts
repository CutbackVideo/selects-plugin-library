// The virtual camera. One list of keys drives the picture (inside the Look effect) and every title that
// is pinned to the picture (inside the Reel graphic), so text rides each push, tilt and whip exactly as
// the reference's does. A camera state is applied to the reframed picture about the frame centre:
//   p' = C + z * (p - C) + (x% of W, y% of H)        (+x right, +y down)
// Each key moves from whatever the state is when it starts to its own target, over d frames.

export type CamKey = { at: number; d: number; z: number; x: number; y: number; e?: Ease };
export type Ease = "lin" | "io" | "o" | "i" | "whip";
export type CamState = { z: number; x: number; y: number; vz: number; vx: number; vy: number };

// Value and slope of each easing curve at progress p (0..1).
function ease(kind: Ease | undefined, p: number): [number, number] {
  switch (kind) {
    case "lin":
      return [p, 1];
    case "o":
      return [1 - Math.pow(1 - p, 3), 3 * Math.pow(1 - p, 2)];
    case "i":
      return [p * p * p, 3 * p * p];
    case "whip":
      // Quintic in-out: almost all of the travel happens in the middle frames, which is what makes a
      // whip read as a whip rather than a pan.
      return p < 0.5
        ? [16 * Math.pow(p, 5), 80 * Math.pow(p, 4)]
        : [1 - Math.pow(-2 * p + 2, 5) / 2, 80 * Math.pow(1 - p, 4)];
    case "io":
    default:
      return p < 0.5
        ? [4 * p * p * p, 12 * p * p]
        : [1 - Math.pow(-2 * p + 2, 3) / 2, 12 * Math.pow(1 - p, 2)];
  }
}

export function camAt(keys: CamKey[] | undefined, frame: number): CamState {
  let z = 1;
  let x = 0;
  let y = 0;
  let vz = 0;
  let vx = 0;
  let vy = 0;
  for (const k of keys || []) {
    if (frame < k.at) break;
    const d = Math.max(0, k.d);
    const p = d <= 0 ? 1 : Math.min(1, (frame - k.at) / d);
    const [e, de] = ease(k.e, p);
    const z0 = z;
    const x0 = x;
    const y0 = y;
    z = z0 + (k.z - z0) * e;
    x = x0 + (k.x - x0) * e;
    y = y0 + (k.y - y0) * e;
    if (d > 0 && p < 1) {
      vz = ((k.z - z0) * de) / d;
      vx = ((k.x - x0) * de) / d;
      vy = ((k.y - y0) * de) / d;
    } else {
      vz = 0;
      vx = 0;
      vy = 0;
    }
  }
  return { z, x, y, vz, vx, vy };
}

// CSS for a W x H layer whose transform-origin is its centre.
export function camCss(c: { z: number; x: number; y: number }, W: number, H: number): string {
  return (
    "translate(" + ((c.x / 100) * W).toFixed(2) + "px, " + ((c.y / 100) * H).toFixed(2) + "px) scale(" + c.z.toFixed(5) + ")"
  );
}

// The transform that keeps something laid out under camera state `a` pinned to the picture at state `b`.
export function pinCss(a: { z: number; x: number; y: number }, b: { z: number; x: number; y: number }, W: number, H: number): string {
  const r = b.z / a.z;
  const tx = (b.x / 100) * W - r * ((a.x / 100) * W);
  const ty = (b.y / 100) * H - r * ((a.y / 100) * H);
  return "translate(" + tx.toFixed(2) + "px, " + ty.toFixed(2) + "px) scale(" + r.toFixed(5) + ")";
}

// Motion blur for the current camera velocity, as an SVG blur deviation along each axis in frame px.
// A pan smears along its axis; a fast zoom smears a little everywhere.
export function camBlur(c: CamState, W: number, H: number): { sx: number; sy: number } {
  const px = Math.abs((c.vx / 100) * W);
  const py = Math.abs((c.vy / 100) * H);
  const pz = Math.abs(c.vz) * Math.hypot(W, H) * 0.5;
  // Only fast moves smear: a settle or a tilt reads as a clean camera move in the reference, a whip does not.
  // Capped: the reference's whip smears two or three frames, it never turns the picture into a streak.
  const sx = Math.min(12, 0.06 * Math.max(0, px - 30));
  const sy = Math.min(12, 0.06 * Math.max(0, py - 60));
  return { sx: sx < 0.6 ? 0 : sx, sy: sy < 0.6 ? 0 : sy };
}

// Keyframed scalar (grid zoom, set opacity): [[frame, value, ease?]] held flat outside the keys.
export type ScalarKey = [number, number, Ease?];
export function scalarAt(keys: ScalarKey[] | undefined, frame: number, fallback: number): number {
  const ks = keys || [];
  if (!ks.length) return fallback;
  if (frame <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i += 1) {
    const [f1, v1, e] = ks[i];
    const [f0, v0] = ks[i - 1];
    if (frame <= f1) {
      const p = f1 > f0 ? (frame - f0) / (f1 - f0) : 1;
      return v0 + (v1 - v0) * ease(e, p)[0];
    }
  }
  return ks[ks.length - 1][1];
}
