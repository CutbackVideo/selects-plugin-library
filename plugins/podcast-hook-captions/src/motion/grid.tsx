import React from "react";
import { scalarAt, type ScalarKey } from "./camera";

// The dark "set": a square grid the speaker is cut out onto, and the backdrop B-roll cards stand on.
// Drawn in frame pixels, identically by the Look (under B-roll cards) and by the Reel graphic (the set
// behind the speaker), so the two hand over without a seam. Every value below is measured on the
// reference reel (460 px wide capture; 1080 px = 2.348 x reference px) and refitted at 1080 x 1920.
//
// Layers, bottom to top (the reference's order):
//   1. cell background, flat neutral grey rgb(38,38,39), about +2 along the top, -1 in the top right;
//   2. the lattice, crisp lines 5.5 px wide (+-9% per line) at a 109.6 px pitch (at 1080), teal at the upper
//      left, neutral elsewhere, faintly pink at the right edge mid height. One crossing sits at
//      (0.50167 W, 0.5125 H); `zoom` scales the lattice about (0.4996 W, 0.4984 H), the reference's fixed
//      point, which is not a crossing. Every line is its own rectangle, so a slow zoom does not make the
//      lines pulse;
//   3. a fine screen-fixed dot/checker texture (the "film" look): two 45-degree sine gratings, period
//      12.19 px on the axes (1.129% of W), added to the set (+-, achromatic). It does NOT zoom. `texture`
//      scales it (0 = lines only) and it fades out when the set is drawn into a raster much smaller than
//      the frame (`rasterScale` 0.32 -> 0.22), where it would alias into streaks;
//   4. dust (what reads as small cracks in the film): mostly white dots, then solid T, L and bar flakes and
//      chips, a few hooks and soft smudges, flashing for 1-4 dust frames at 20 dust frames per second in a
//      28-frame (1.4 s) loop, about 3.5 new specks per dust frame, thinning out under the bottom shade. One
//      speck in five moves on each loop pass (mirrored and shifted), so long holds do not repeat exactly.
//      They belong to the grid picture, so they zoom with it;
//   5. a vertical shade from 0.5 H to the bottom (x0.075 at the bottom edge) over all of the above; the
//      texture also fades below 0.6 H to a floor that keeps the dark bottom dithered (no banding after
//      H.264), as it does in the reference.
// There is no grain, flicker, weave, scratches or radial vignette in the reference, so none here. On fast
// zooms (`zoomVel`) the lattice and dust are smeared across the frame's zoom change, as the reference's
// punch frames are.
//
// Deterministic: everything is a pure function of (frame, fps, zoom, W, H, rasterScale, texture); `uid`
// only namespaces SVG ids. Frames can render in any order or in parallel. Bad numbers never throw.

export const GRID = {
  // Unshaded cell colour as seen (texture mean included).
  bg: [36.8, 36.6, 38.2] as const,
  // Neutral line colour (the lines' core), teal and pink tints mixed in by position.
  line: [130.5, 127.5, 131] as const,
  teal: [92, 140, 134] as const,
  pink: [132, 112, 122] as const,
  pitch: 0.10152, // cell pitch / W (46.69 ref px)
  cx: 0.50167, // a line crossing (the lattice origin), fractions of W and H
  cy: 0.5125,
  px: 0.4996, // the zoom's fixed point, fractions of W and H
  py: 0.4984,
  lineAt1080: 5.5,
  // Dot texture: axis period / W, amplitude of each 45-degree grating (levels at 1080).
  texPeriod: 0.011287,
  texAmp: 7.3, // about 12% is lost to the export's H.264
  // Dust: dust frames per second, frames per loop, new specks per dust frame.
  dustFps: 20,
  dustLoop: 28,
  dustRate: 5.2, // candidates per dust frame over the whole frame; about 3.5 survive the height density
  dustSeed: 24081041,
};

export type GridSetProps = {
  W: number;
  H: number;
  zoom: number;
  uid: string;
  frame?: number;
  fps?: number;
  // Raster size / frame size of the canvas the set ends up in (Look: min(sw / W, sh / H)); default 1.
  rasterScale?: number;
  // Dot texture strength 0..1 (default 1); 0 shows the lines and dust on a plain background.
  texture?: number;
  // Zoom change per frame (zoomVelocity()); fast zooms smear the lattice and dust like a 180-degree shutter.
  zoomVel?: number;
};

// Zoom change per frame at `frame` for the plan's grid zoom keys. A jump of more than 0.45 in one frame is a
// cut (the reference snaps the grid back to 1), not motion, so it is ignored on either side.
export function zoomVelocity(keys: ScalarKey[] | undefined, frame: number): number {
  const z = (f: number) => scalarAt(keys, f, 1);
  const b = z(frame) - z(frame - 1);
  const f = z(frame + 1) - z(frame);
  const cut = (d: number) => Math.abs(d) > 0.45;
  if (cut(b) && cut(f)) return 0;
  if (cut(b)) return f;
  if (cut(f)) return b;
  return (b + f) / 2;
}

// Bottom shade: multiplier m at y / H (black over the set at alpha 1 - m).
const SHADE: [number, number][] = [
  [0.5, 1], [0.52, 0.985], [0.56, 0.978], [0.58, 0.962], [0.6, 0.935], [0.62, 0.875], [0.64, 0.8], [0.66, 0.745],
  [0.68, 0.715], [0.7, 0.655], [0.72, 0.625], [0.74, 0.6], [0.76, 0.545], [0.78, 0.515], [0.8, 0.49], [0.82, 0.44],
  [0.84, 0.405], [0.86, 0.37], [0.88, 0.3], [0.9, 0.27], [0.92, 0.235], [0.94, 0.18], [0.96, 0.14], [0.98, 0.11], [1, 0.075],
];
// The texture fades under the shade faster than the shade itself (as seen in the reference): its strength
// (on top of the shade) at y / H. It keeps a floor to the bottom edge: the reference's bottom still carries
// a trace of it, and without it the near-black bottom bands after H.264.
const TEX_FADE: [number, number][] = [[0.6, 1], [0.655, 0.8], [0.71, 0.38], [0.77, 0.38], [0.85, 0.55], [1, 0.55]];

const finite = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// Identity up to 0.45, flat above (40 steps).
const CAP_TABLE = Array.from({ length: 41 }, (_, i) => Math.min(i / 40, 0.45).toFixed(4)).join(" ");
const frac = (v: number) => v - Math.floor(v);
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---- dust --------------------------------------------------------------------------------------------
// One loop of dust, generated once from a fixed seed. Positions are fractions of the frame (lattice space),
// sizes are in 1080-wide pixels, a is the peak above the cell background in levels.
const DOT = 0;
const HAIR = 1;
const SMUDGE = 2;
const FLAKE = 3;
export type SpeckMark = { x: number; y: number; kind: number; a: number; s: number; rot: number; d: string; twin: number; fringe: number };
type Mark = SpeckMark;
// keep: the speck comes back at the same place on every loop pass (75%, as in the reference).
type Speck = { birth: number; life: number; keep: boolean; marks: Mark[] };

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(rnd: () => number, mean: number) {
  const L = Math.exp(-mean);
  let k = 0;
  let p = rnd();
  while (p > L && k < 20) {
    k++;
    p *= rnd();
  }
  return k;
}

// Hair shapes in a local frame about 1 across (scaled by s): a hook (J), a bent fibre (L), a T, an arc,
// a wavy fibre, a comma and a straight fibre.
const HAIRS = [
  "M0 -0.5 C0.02 -0.1 0.04 0.22 -0.1 0.36 S-0.38 0.46 -0.45 0.3",
  "M-0.1 -0.5 C-0.06 -0.12 -0.08 0.1 0.02 0.17 C0.12 0.24 0.3 0.19 0.45 0.22",
  "M-0.4 -0.28 C-0.15 -0.31 0.15 -0.25 0.4 -0.3 M0.02 -0.28 C0 -0.05 0.05 0.15 0.01 0.35",
  "M-0.12 -0.45 Q0.3 0 -0.12 0.45",
  "M-0.5 0.1 C-0.2 -0.25 0.15 0.3 0.5 -0.05",
  "M0 -0.32 C0.16 -0.2 0.15 0.1 -0.06 0.3",
  "M-0.5 0.02 C-0.2 -0.02 0.2 0.03 0.5 -0.01",
];
// Cumulative shares of the hair shapes above: mostly arcs, waves, commas and straight fibres.
const HAIR_PICK = [0.1, 0.2, 0.25, 0.45, 0.65, 0.8, 1];
const pick = (cum: number[], u: number) => {
  let i = 0;
  while (i < cum.length - 1 && u > cum[i]) i++;
  return i;
};
// Solid flake outlines (the reference's "cracks"), in the same local frame: T, L and bar flakes span 0.8 of
// the size s (35-60 px) with chunky arms about 0.2 s thick (3-5 ref px, as the reference's T); chips, beans
// and wedges are about half as big, like the reference's small chunks. Each flake jitters its corners.
const FLAKES: [number, number][][] = [
  [[-0.4, -0.3], [0.4, -0.28], [0.39, -0.09], [0.09, -0.09], [0.08, 0.26], [-0.09, 0.27], [-0.09, -0.1], [-0.4, -0.11]],
  [[-0.28, -0.4], [-0.1, -0.39], [-0.1, 0.18], [0.38, 0.17], [0.38, 0.36], [-0.29, 0.37]],
  [[-0.4, -0.1], [-0.08, -0.12], [0.4, -0.07], [0.39, 0.1], [-0.08, 0.08], [-0.4, 0.1]],
  [[-0.22, -0.13], [0.03, -0.2], [0.13, -0.17], [0.25, -0.02], [0.12, 0.05], [0.14, 0.17], [-0.1, 0.16], [-0.24, 0.06]],
  [[-0.26, -0.02], [-0.18, -0.16], [0, -0.18], [0.16, -0.12], [0.26, 0.02], [0.18, 0.14], [0.04, 0.08], [-0.08, 0.14], [-0.22, 0.1]],
  [[-0.24, -0.18], [0.24, -0.14], [0.04, 0.22], [-0.04, 0.06]],
];
const FLAKE_PICK = [0.25, 0.45, 0.8, 0.9, 0.97, 1]; // cumulative shares of the shapes above (bars, T and L first)

// A flake outline; `chunk` is true for the compact shapes (chips, beans, wedges), which are drawn bigger.
function flakePath(rnd: () => number): { d: string; chunk: boolean } {
  const u = rnd();
  let i = 0;
  while (i < FLAKE_PICK.length - 1 && u > FLAKE_PICK[i]) i++;
  const sx = i < 3 ? 0.85 + 0.3 * rnd() : 0.7 + 0.5 * rnd();
  const d = FLAKES[i].map(([x, y], j) => (j ? "L" : "M") + (x * sx + 0.07 * (rnd() - 0.5)).toFixed(3) + " " + (y + 0.07 * (rnd() - 0.5)).toFixed(3)).join(" ") + " Z";
  return { d, chunk: i >= 3 };
}

// Dust density by height (fraction of y): the reference's dust thins out under the bottom shade.
function dustDensity(y: number) {
  return y < 0.6 ? 1 : y < 0.8 ? 0.4 : y < 0.85 ? 0.1 : 0;
}

let dustCache: Speck[] | null = null;
function dustLoop(): Speck[] {
  if (dustCache) return dustCache;
  const rnd = mulberry32(GRID.dustSeed);
  const out: Speck[] = [];
  for (let b = 0; b < GRID.dustLoop; b++) {
    // Candidates over the whole frame, kept by the height density.
    const n = poisson(rnd, GRID.dustRate);
    for (let i = 0; i < n; i++) {
      const y = 0.005 + 0.99 * rnd();
      if (rnd() >= dustDensity(y)) continue;
      const u = rnd();
      // 74% dots, 12% hairs, 9% solid flakes, 5% soft smudges (as counted on the reference, flakes straddling
      // the lines included).
      const kind = u < 0.74 ? DOT : u < 0.86 ? HAIR : u < 0.95 ? FLAKE : SMUDGE;
      // Dots: peak above the background faint 30%, medium 35%, strong 35%.
      const c = rnd();
      const cls = c < 0.3 ? 0 : c < 0.65 ? 1 : 2;
      const shape = rnd();
      // A flake's outline comes from its own generator, so its corners do not shift the rest of the loop.
      const flake = kind === FLAKE ? flakePath(mulberry32(Math.floor(shape * 4294967296) ^ 0x2545f491)) : null;
      let lv: number;
      let size: number;
      if (kind === DOT) {
        lv = cls === 0 ? 22 + 20 * rnd() : cls === 1 ? 70 + 60 * rnd() : 104 + 92 * rnd();
        // Nominal FWHM at 1080 (the drawn profile is narrower); strong dots measure 3.4-3.9 ref px FWHM at zoom 1,
        // the reference's 3.1-4.6.
        size = [6, 7.5, 11.5][cls] + [2.5, 3, 3.5][cls] * rnd();
      } else if (kind === HAIR) {
        lv = 110 + 80 * rnd();
        size = 25 + 25 * rnd(); // 11-21 ref px long
      } else if (kind === FLAKE) {
        lv = 140 + 55 * rnd(); // flat core, edges blurred 1.5 px
        // T, L and bar flakes span 0.8 of the size; chunks about half of it.
        size = flake && flake.chunk ? 40 + 20 * rnd() : 35 + 25 * rnd();
      } else {
        lv = 100 + 50 * rnd();
        size = 16 + 14 * rnd();
      }
      const lr = rnd();
      // Lifetime in dust frames: 1 / 2 / 3 / 4 at 45 / 33 / 15 / 7%.
      const life = lr < 0.45 ? 1 : lr < 0.78 ? 2 : lr < 0.93 ? 3 : 4;
      const mark: Mark = {
        x: 0.01 + 0.98 * rnd(),
        y,
        kind,
        a: lv,
        s: size,
        rot: 360 * rnd(),
        d: kind === HAIR ? HAIRS[pick(HAIR_PICK, shape)] : flake ? flake.d : "",
        twin: kind === DOT && rnd() < 0.04 ? 1 : 0,
        // No dark fringes: the dark rims around the reference's specks come from its video compression, which
        // puts them on ours too. The draws stay so the rest of the loop keeps its measured layout.
        fringe: (kind === HAIR || kind === FLAKE ? rnd() < 0.5 : kind === DOT && cls > 0 && rnd() < (cls === 2 ? 0.3 : 0.15)) ? 0 * rnd() : 0,
      };
      const marks: Mark[] = [mark];
      // A speck that lasts into the next dust frames changes a little.
      for (let k = 1; k < life; k++) {
        const prev = marks[k - 1];
        marks.push({ ...prev, a: prev.a * (0.6 + 0.4 * rnd()), s: prev.s * (0.9 + 0.2 * rnd()), x: prev.x + (rnd() - 0.5) * 0.002, y: prev.y + (rnd() - 0.5) * 0.001 });
      }
      out.push({ birth: b, life, keep: rnd() < 0.8, marks });
    }
  }
  dustCache = out;
  return out;
}

// Dust frame index (20 per second, held for 1-2 output frames).
export function dustFrame(frame: number, fps: number) {
  return Math.floor((frame * GRID.dustFps) / fps + 1e-6);
}

// The specks showing at a frame, in lattice space (fractions of W and H). Odd loop passes mirror and every
// pass shifts the specks that are not kept, so the 1.4 s loop only partly repeats.
export type DustMark = Mark & { id: number; fx: number; fy: number; flip: boolean };
export function dustAt(frame: number, fps: number): DustMark[] {
  const df = dustFrame(frame, fps);
  const di = mod(df, GRID.dustLoop);
  const out: DustMark[] = [];
  dustLoop().forEach((sp, id) => {
    if (!sp || !sp.marks) return;
    const age = mod(di - sp.birth, GRID.dustLoop);
    if (age >= sp.life) return;
    const m = sp.marks[age];
    if (!m) return;
    // Loop pass of the speck's first dust frame, so a speck never jumps while it shows.
    const pass = Math.floor((df - age) / GRID.dustLoop);
    const flip = !sp.keep && mod(pass, 2) === 1;
    let fx = m.x;
    let fy = m.y;
    if (!sp.keep && pass !== 0) {
      fx = frac((flip ? 1 - fx : fx) + frac(pass * 0.618034));
      fy = frac(fy + frac(pass * 0.754878));
      // A moved speck obeys the height density too.
      const h = Math.sin(id * 12.9898 + pass * 78.233) * 43758.5453;
      if (h - Math.floor(h) >= dustDensity(fy)) return;
    }
    out.push({ ...m, id, fx, fy, flip });
  });
  return out;
}

function Dust({ W, H, frame, fps, uid }: { W: number; H: number; frame: number; fps: number; uid: string }) {
  const k = W / 1080;
  const els: React.ReactNode[] = [];
  dustAt(frame, fps).forEach((m) => {
    const i = m.id;
    const flip = m.flip;
    const x = m.fx * W;
    const y = m.fy * H;
    // White over a ~38 background: alpha = levels / (255 - 38).
    const op = Math.min(1, m.a / 217);
    const rot = flip ? 180 - m.rot : m.rot;
    const ang = (rot * Math.PI) / 180;
    const sx = flip ? -1 : 1;
    if (m.kind === DOT) {
      const r = ((m.s * k) / 2.355) * 2.6; // gaussian sigma = FWHM / 2.355, drawn out to 2.6 sigma
      els.push(<circle key={i} cx={x} cy={y} r={r} fill={"url(#dd" + uid + ")"} opacity={op} />);
      if (m.twin) els.push(<circle key={i + "t"} cx={x + 10 * k * Math.cos(ang)} cy={y + 10 * k * Math.sin(ang)} r={r * 0.85} fill={"url(#dd" + uid + ")"} opacity={op * 0.8} />);
      if (m.fringe) els.push(<circle key={i + "f"} cx={x + 0.7 * r * Math.cos(ang)} cy={y + 0.7 * r * Math.sin(ang)} r={r * 0.45} fill={"url(#dk" + uid + ")"} opacity={Math.min(1, m.fringe / 38)} />);
    } else if (m.kind === HAIR) {
      const s = m.s * k;
      const st = m.d.slice(1).split(" ").slice(0, 2).map(Number);
      const tf = "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + rot.toFixed(1) + ") scale(" + (sx * s).toFixed(2) + " " + s.toFixed(2) + ")";
      els.push(
        <g key={i} transform={tf} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={m.d} stroke="#fff" strokeWidth={(9 * k) / s} opacity={op * 0.22} />
          <path d={m.d} stroke="#fff" strokeWidth={(6 * k) / s} opacity={op} />
          {m.fringe ? <circle cx={st[0] * 1.15} cy={st[1] * 1.15} r={(5 * k) / s} fill={"url(#dk" + uid + ")"} opacity={Math.min(1, m.fringe / 38)} /> : null}
        </g>,
      );
    } else if (m.kind === FLAKE) {
      const s = m.s * k;
      const tf = "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + rot.toFixed(1) + ") scale(" + (sx * s).toFixed(2) + " " + s.toFixed(2) + ")";
      // A dark copy pushed out to one side shows as a dark fringe along that edge.
      const off = (3.5 * k) / s;
      els.push(
        <g key={i} filter={"url(#fb" + uid + ")"}>
          {m.fringe ? (
            <g transform={tf}>
              <path d={m.d} transform={"translate(" + (off * 0.6).toFixed(4) + " " + off.toFixed(4) + ")"} fill="#000" opacity={Math.min(1, m.fringe / 38)} />
            </g>
          ) : null}
          <g transform={tf}>
            <path d={m.d} fill="#fff" opacity={op} />
          </g>
        </g>,
      );
    } else {
      // An irregular soft smudge: three overlapping soft blobs.
      const s = m.s * k;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      [
        [0, 0, 0.42],
        [0.3, 0.12, 0.3],
        [-0.22, -0.2, 0.26],
      ].forEach(([dx, dy, rr], j) =>
        els.push(<circle key={i + "s" + j} cx={x + s * (sx * dx * c - dy * sn)} cy={y + s * (sx * dx * sn + dy * c)} r={s * rr} fill={"url(#ds" + uid + ")"} opacity={op} />),
      );
    }
  });
  return <>{els}</>;
}

// ---- the set -----------------------------------------------------------------------------------------
const rgb = (c: readonly number[], sub: number) => "rgb(" + c.map((v) => Math.max(0, v - sub).toFixed(1)).join(",") + ")";

// One 45-degree sine grating as a repeating gradient, peaking where the reference's bright dots sit.
// For 135deg the gradient position is (x + y) / sqrt2, for 45deg it is (x - y + H) / sqrt2.
function grating(angle: number, phase: number, period: number, amp: number) {
  const n = 8;
  const ph = mod(phase, period);
  const stops: string[] = [];
  for (let i = 0; i <= n; i++) {
    const v = amp * (1 + Math.cos(2 * Math.PI * (i / n - 0.5)));
    stops.push("rgb(" + v.toFixed(2) + "," + v.toFixed(2) + "," + v.toFixed(2) + ") " + (ph - period / 2 + (i * period) / n).toFixed(3) + "px");
  }
  return "repeating-linear-gradient(" + angle + "deg, " + stops.join(", ") + ")";
}

// Per-line width factor (deterministic, +-9%): the reference's lines differ slightly in width.
const lineVar = (i: number) => {
  const h = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return 1 + 0.18 * (h - Math.floor(h) - 0.5);
};

const gradY = (stops: [number, number][], col: (v: number) => string) =>
  "linear-gradient(to bottom, " + stops.map(([t, v]) => col(v) + " " + (t * 100).toFixed(1) + "%").join(", ") + ")";

// Texture strength for a raster `r` times the frame size (the Look draws the set into the B-roll's own raster):
// full from 0.32 up (a 720p landscape source, r = 0.375, still shows clean dots after the stretch back), gone
// at 0.22 and below, where the 12.2 px period lands near 2 raster px on the short axis and turns into streaks.
export function rasterTexture(r: number) {
  const t = clamp01((r - 0.22) / 0.1);
  return t * t * (3 - 2 * t);
}

export function GridSet(props: GridSetProps) {
  const W = Math.max(1, finite(props.W, 1080));
  const H = Math.max(1, finite(props.H, 1920));
  const zin = finite(props.zoom, 1);
  const z = Math.max(0.05, zin);
  // A fast zoom is drawn as several exposures across half the frame's zoom change, summed (plus-lighter at
  // 1/n each), like the reference's smeared punch frames. Enough exposures that neighbouring copies of a
  // line at the frame's edge overlap, so the smear is smooth rather than ghosted.
  const vel = finite(props.zoomVel, 0);
  const smear = Math.abs(vel) > 0.015;
  const nExp = smear ? Math.min(32, Math.max(5, Math.ceil((0.5 * Math.abs(vel) * 0.5 * Math.max(W, H)) / (GRID.lineAt1080 * (W / 1080))) + 1)) : 1;
  const zs = smear ? Array.from({ length: nExp }, (_, i) => Math.max(0.05, z + (i / (nExp - 1) - 0.5) * 0.5 * vel)) : [z];
  const zMin = Math.min(...zs);
  const fpsIn = finite(props.fps, 30);
  const fps = fpsIn > 0 ? fpsIn : 30;
  const frame = finite(props.frame, 0);
  const uid = String(props.uid ?? "0").replace(/[^a-zA-Z0-9_-]/g, "");
  const texK = clamp01(finite(props.texture, 1)) * rasterTexture(finite(props.rasterScale, 1));
  const k = W / 1080;
  const pitch = GRID.pitch * W;
  const lw = GRID.lineAt1080 * k;
  const ox = GRID.cx * W;
  const oy = GRID.cy * H;
  const pvx = GRID.px * W;
  const pvy = GRID.py * H;
  // The texture adds 2 * amp on average (two gratings, each 0..2 amp); everything under it is lowered by
  // that much so the set keeps its measured colours whatever the texture strength.
  const amp = GRID.texAmp * texK;
  const showTex = amp > 0.01;
  const tex = showTex ? 2 * amp : 0;
  const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H };
  // Lattice-space window that the (smallest) zoom maps onto the frame.
  const x0 = pvx - pvx / zMin;
  const x1 = pvx + (W - pvx) / zMin;
  const y0 = pvy - pvy / zMin;
  const y1 = pvy + (H - pvy) / zMin;
  const rects: [number, number, number, number][] = [];
  for (let i = Math.floor((x0 - ox) / pitch) - 1; i <= Math.ceil((x1 - ox) / pitch) + 1; i++) {
    const w = lw * lineVar(i);
    rects.push([ox + i * pitch - w / 2, y0 - lw, w, y1 - y0 + 2 * lw]);
  }
  for (let j = Math.floor((y0 - oy) / pitch) - 1; j <= Math.ceil((y1 - oy) / pitch) + 1; j++) {
    const w = lw * lineVar(j + 101);
    rects.push([x0 - lw, oy + j * pitch - w / 2, x1 - x0 + 2 * lw, w]);
  }
  const ztOf = (zz: number) => "translate(" + pvx.toFixed(3) + " " + pvy.toFixed(3) + ") scale(" + zz.toFixed(6) + ") translate(" + (-pvx).toFixed(3) + " " + (-pvy).toFixed(3) + ")";
  // `gain` > 1 brightens the smear: on the reference's punch frames the smeared lines carry about 1.8x the
  // light of sharp ones; slow moves add up to 1. Where the copies overlap (near the pivot) the sum would
  // turn the lines white, so a filter caps the colour just above the lines' own (`cap`).
  const exposures = (key: string, body: React.ReactNode, gain = 1, cap = false) =>
    smear ? (
      <g style={{ isolation: "isolate" }} filter={cap ? "url(#sc" + uid + ")" : undefined}>
        {zs.map((zz, n) => (
          <g key={key + n} transform={ztOf(zz)} opacity={Math.min(1, gain / zs.length)} style={{ mixBlendMode: "plus-lighter" }}>
            {body}
          </g>
        ))}
      </g>
    ) : (
      <g transform={ztOf(z)}>{body}</g>
    );
  // Texture: bright dots at (0.48, -0.51) + n * (P/2, P/2) at 1080 (continuous pixel coordinates), which
  // puts the vertical lines near a crest and the horizontal ones near a node of the dots, as in the reference.
  const P = GRID.texPeriod * W;
  const bx = 0.48 * k;
  const by = -0.51 * k;
  const fadeMask = gradY(TEX_FADE, (a) => "rgba(0,0,0," + a.toFixed(3) + ")");
  // Where the texture fades, put its mean back so the shade alone sets the brightness.
  const fadeFill = gradY(TEX_FADE, (a) => {
    const v = (tex * (1 - a)).toFixed(2);
    return "rgb(" + v + "," + v + "," + v + ")";
  });
  const shade = gradY(SHADE, (m) => "rgba(0,0,0," + (1 - m).toFixed(3) + ")");
  // Cell colour: neutral, about +2 along the top, +3 at the top left and -1 in the top right corner.
  const bgTint =
    "linear-gradient(to bottom, rgba(255,255,255,0.009), rgba(255,255,255,0) 14%), " +
    "radial-gradient(ellipse " + (0.4 * W).toFixed(0) + "px " + (0.12 * H).toFixed(0) + "px at 0px 0px, rgba(255,255,255,0.008), rgba(255,255,255,0)), " +
    "radial-gradient(ellipse " + (0.45 * W).toFixed(0) + "px " + (0.22 * H).toFixed(0) + "px at " + W + "px 0px, rgba(0,0,0,0.13), rgba(0,0,0,0))";
  // Tints: opaque teal / pink copies of the lattice, faded in by a mask that carries the radial falloff. A
  // mask composites the whole lattice once, so crossings are tinted the same as the lines through them.
  const tint = (o: number, a: number) => <stop key={o} offset={o} stopColor="#fff" stopOpacity={a} />;
  const lattice = rects.map(([x, y, w, h], j) => <rect key={j} x={x.toFixed(3)} y={y.toFixed(3)} width={w.toFixed(3)} height={h.toFixed(3)} />);
  const region = { x: x0 - 2 * lw, y: y0 - 2 * lw, width: x1 - x0 + 4 * lw, height: y1 - y0 + 4 * lw };
  return (
    <div style={{ ...full, overflow: "hidden", isolation: "isolate", backgroundColor: rgb(GRID.bg, tex), backgroundImage: bgTint }}>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          {/* teal: an ellipse 1.0 W x 0.45 H around (0, 0.2 H); none below 0.6 H */}
          <radialGradient id={"at" + uid} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={W} gradientTransform={"translate(0 " + (0.2 * H).toFixed(1) + ") scale(1 " + ((0.45 * H) / W).toFixed(4) + ")"}>
            {[[0, 0.9], [0.3, 0.8], [0.52, 0.52], [0.7, 0.25], [0.85, 0.07], [1, 0]].map(([o, a]) => tint(o, a))}
          </radialGradient>
          {/* pink: an ellipse 0.3 W x 0.2 H around (W, 0.42 H) */}
          <radialGradient id={"ap" + uid} gradientUnits="userSpaceOnUse" cx={W} cy={0} r={0.3 * W} gradientTransform={"translate(0 " + (0.42 * H).toFixed(1) + ") scale(1 " + ((0.2 * H) / (0.3 * W)).toFixed(4) + ")"}>
            {[[0, 0.6], [1, 0]].map(([o, a]) => tint(o, a))}
          </radialGradient>
          <mask id={"mt" + uid} maskUnits="userSpaceOnUse" {...region}>
            <rect {...region} fill={"url(#at" + uid + ")"} />
          </mask>
          <mask id={"mp" + uid} maskUnits="userSpaceOnUse" {...region}>
            <rect {...region} fill={"url(#ap" + uid + ")"} />
          </mask>
          {/* the lattice's coverage, applied once to the whole colour field (no edge drawn twice) */}
          {/* smear cap: each channel follows itself up to 0.45 (115 levels) and stays there */}
          <filter id={"sc" + uid} filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H} colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="table" tableValues={CAP_TABLE} />
              <feFuncG type="table" tableValues={CAP_TABLE} />
              <feFuncB type="table" tableValues={CAP_TABLE} />
            </feComponentTransfer>
          </filter>
          <mask id={"ml" + uid} maskUnits="userSpaceOnUse" {...region}>
            <g fill="#fff">{lattice}</g>
          </mask>
        </defs>
        {exposures(
          "l",
          <g mask={"url(#ml" + uid + ")"}>
            <rect {...region} fill={rgb(GRID.line, tex)} />
            <rect {...region} fill={rgb(GRID.teal, tex)} mask={"url(#mt" + uid + ")"} />
            <rect {...region} fill={rgb(GRID.pink, tex)} mask={"url(#mp" + uid + ")"} />
          </g>,
          1 + 0.8 * smoothstep(0.08, 0.15, Math.abs(vel)),
          true,
        )}
      </svg>
      {showTex ? (
        <>
          <div style={{ ...full, isolation: "isolate", mixBlendMode: "plus-lighter", maskImage: fadeMask, WebkitMaskImage: fadeMask } as React.CSSProperties}>
            <div style={{ ...full, backgroundImage: grating(135, (bx + by) / Math.SQRT2, P / Math.SQRT2, amp) }} />
            <div style={{ ...full, backgroundImage: grating(45, (bx - by + H) / Math.SQRT2, P / Math.SQRT2, amp), mixBlendMode: "plus-lighter" }} />
          </div>
          <div style={{ ...full, backgroundImage: fadeFill, mixBlendMode: "plus-lighter" }} />
        </>
      ) : null}
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          {/* dot profile exp(-ln2 (u / 0.33)^3): a soft disc with short tails, like the reference's dots */}
          <radialGradient id={"dd" + uid}>
            {[[0, 1], [0.1, 0.981], [0.2, 0.857], [0.28, 0.655], [0.36, 0.407], [0.44, 0.193], [0.52, 0.066], [0.6, 0.016], [0.7, 0.001], [1, 0]].map(([o, a]) => (
              <stop key={o} offset={o} stopColor="#fff" stopOpacity={a} />
            ))}
          </radialGradient>
          <radialGradient id={"ds" + uid}>
            {[[0, 1], [0.4, 0.75], [0.75, 0.3], [1, 0]].map(([o, a]) => (
              <stop key={o} offset={o} stopColor="#fff" stopOpacity={a} />
            ))}
          </radialGradient>
          <radialGradient id={"dk" + uid}>
            <stop offset="0" stopColor="#000" stopOpacity={1} />
            <stop offset="1" stopColor="#000" stopOpacity={0} />
          </radialGradient>
          {/* flake edges: about 1.5 px soft at 1080 */}
          <filter id={"fb" + uid} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={(1.5 * k).toFixed(3)} />
          </filter>
        </defs>
        {exposures("d", <Dust W={W} H={H} frame={frame} fps={fps} uid={uid} />)}
      </svg>
      <div style={{ ...full, backgroundImage: shade }} />
    </div>
  );
}
