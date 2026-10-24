// Generated from plugins/podcast-hook-captions/src/motion/grid.tsx by tools/build-podcast-dust.mjs.
const GRID = {
  // Unshaded cell colour as seen (texture mean included).
  bg: [36.8, 36.6, 38.2],
  // Neutral line colour (the lines' core), teal and pink tints mixed in by position.
  line: [130.5, 127.5, 131],
  teal: [92, 140, 134],
  pink: [132, 112, 122],
  pitch: 0.10152,
  // cell pitch / W (46.69 ref px)
  cx: 0.50167,
  // a line crossing (the lattice origin), fractions of W and H
  cy: 0.5125,
  px: 0.4996,
  // the zoom's fixed point, fractions of W and H
  py: 0.4984,
  lineAt1080: 5.5,
  // Dot texture: axis period / W, amplitude of each 45-degree grating (levels at 1080).
  texPeriod: 0.011287,
  texAmp: 7.3,
  // about 12% is lost to the export's H.264
  // Dust: dust frames per second, frames per loop, new specks per dust frame.
  dustFps: 20,
  dustLoop: 28,
  dustRate: 5.2,
  // candidates per dust frame over the whole frame; about 3.5 survive the height density
  dustSeed: 24081041
};
function zoomVelocity(keys, frame) {
  const z = (f2) => scalarAt(keys, f2, 1);
  const b = z(frame) - z(frame - 1);
  const f = z(frame + 1) - z(frame);
  const cut = (d) => Math.abs(d) > 0.45;
  if (cut(b) && cut(f)) return 0;
  if (cut(b)) return f;
  if (cut(f)) return b;
  return (b + f) / 2;
}
const SHADE = [
  [0.5, 1],
  [0.52, 0.985],
  [0.56, 0.978],
  [0.58, 0.962],
  [0.6, 0.935],
  [0.62, 0.875],
  [0.64, 0.8],
  [0.66, 0.745],
  [0.68, 0.715],
  [0.7, 0.655],
  [0.72, 0.625],
  [0.74, 0.6],
  [0.76, 0.545],
  [0.78, 0.515],
  [0.8, 0.49],
  [0.82, 0.44],
  [0.84, 0.405],
  [0.86, 0.37],
  [0.88, 0.3],
  [0.9, 0.27],
  [0.92, 0.235],
  [0.94, 0.18],
  [0.96, 0.14],
  [0.98, 0.11],
  [1, 0.075]
];
const TEX_FADE = [[0.6, 1], [0.655, 0.8], [0.71, 0.38], [0.77, 0.38], [0.85, 0.55], [1, 0.55]];
const finite = (v, fallback) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const CAP_TABLE = Array.from({ length: 41 }, (_, i) => Math.min(i / 40, 0.45).toFixed(4)).join(" ");
const frac = (v) => v - Math.floor(v);
const mod = (a, n) => (a % n + n) % n;
const DOT = 0;
const HAIR = 1;
const SMUDGE = 2;
const FLAKE = 3;
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t = t + 1831565813 >>> 0;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}
function poisson(rnd, mean) {
  const L = Math.exp(-mean);
  let k = 0;
  let p = rnd();
  while (p > L && k < 20) {
    k++;
    p *= rnd();
  }
  return k;
}
const HAIRS = [
  "M0 -0.5 C0.02 -0.1 0.04 0.22 -0.1 0.36 S-0.38 0.46 -0.45 0.3",
  "M-0.1 -0.5 C-0.06 -0.12 -0.08 0.1 0.02 0.17 C0.12 0.24 0.3 0.19 0.45 0.22",
  "M-0.4 -0.28 C-0.15 -0.31 0.15 -0.25 0.4 -0.3 M0.02 -0.28 C0 -0.05 0.05 0.15 0.01 0.35",
  "M-0.12 -0.45 Q0.3 0 -0.12 0.45",
  "M-0.5 0.1 C-0.2 -0.25 0.15 0.3 0.5 -0.05",
  "M0 -0.32 C0.16 -0.2 0.15 0.1 -0.06 0.3",
  "M-0.5 0.02 C-0.2 -0.02 0.2 0.03 0.5 -0.01"
];
const HAIR_PICK = [0.1, 0.2, 0.25, 0.45, 0.65, 0.8, 1];
const pick = (cum, u) => {
  let i = 0;
  while (i < cum.length - 1 && u > cum[i]) i++;
  return i;
};
const FLAKES = [
  [[-0.4, -0.3], [0.4, -0.28], [0.39, -0.09], [0.09, -0.09], [0.08, 0.26], [-0.09, 0.27], [-0.09, -0.1], [-0.4, -0.11]],
  [[-0.28, -0.4], [-0.1, -0.39], [-0.1, 0.18], [0.38, 0.17], [0.38, 0.36], [-0.29, 0.37]],
  [[-0.4, -0.1], [-0.08, -0.12], [0.4, -0.07], [0.39, 0.1], [-0.08, 0.08], [-0.4, 0.1]],
  [[-0.22, -0.13], [0.03, -0.2], [0.13, -0.17], [0.25, -0.02], [0.12, 0.05], [0.14, 0.17], [-0.1, 0.16], [-0.24, 0.06]],
  [[-0.26, -0.02], [-0.18, -0.16], [0, -0.18], [0.16, -0.12], [0.26, 0.02], [0.18, 0.14], [0.04, 0.08], [-0.08, 0.14], [-0.22, 0.1]],
  [[-0.24, -0.18], [0.24, -0.14], [0.04, 0.22], [-0.04, 0.06]]
];
const FLAKE_PICK = [0.25, 0.45, 0.8, 0.9, 0.97, 1];
function flakePath(rnd) {
  const u = rnd();
  let i = 0;
  while (i < FLAKE_PICK.length - 1 && u > FLAKE_PICK[i]) i++;
  const sx = i < 3 ? 0.85 + 0.3 * rnd() : 0.7 + 0.5 * rnd();
  const d = FLAKES[i].map(([x, y], j) => (j ? "L" : "M") + (x * sx + 0.07 * (rnd() - 0.5)).toFixed(3) + " " + (y + 0.07 * (rnd() - 0.5)).toFixed(3)).join(" ") + " Z";
  return { d, chunk: i >= 3 };
}
function dustDensity(y) {
  return y < 0.6 ? 1 : y < 0.8 ? 0.4 : y < 0.85 ? 0.1 : 0;
}
let dustCache = null;
function dustLoop() {
  if (dustCache) return dustCache;
  const rnd = mulberry32(GRID.dustSeed);
  const out = [];
  for (let b = 0; b < GRID.dustLoop; b++) {
    const n = poisson(rnd, GRID.dustRate);
    for (let i = 0; i < n; i++) {
      const y = 5e-3 + 0.99 * rnd();
      if (rnd() >= dustDensity(y)) continue;
      const u = rnd();
      const kind = u < 0.74 ? DOT : u < 0.86 ? HAIR : u < 0.95 ? FLAKE : SMUDGE;
      const c = rnd();
      const cls = c < 0.3 ? 0 : c < 0.65 ? 1 : 2;
      const shape = rnd();
      const flake = kind === FLAKE ? flakePath(mulberry32(Math.floor(shape * 4294967296) ^ 625341585)) : null;
      let lv;
      let size;
      if (kind === DOT) {
        lv = cls === 0 ? 22 + 20 * rnd() : cls === 1 ? 70 + 60 * rnd() : 104 + 92 * rnd();
        size = [6, 7.5, 11.5][cls] + [2.5, 3, 3.5][cls] * rnd();
      } else if (kind === HAIR) {
        lv = 110 + 80 * rnd();
        size = 25 + 25 * rnd();
      } else if (kind === FLAKE) {
        lv = 140 + 55 * rnd();
        size = flake && flake.chunk ? 40 + 20 * rnd() : 35 + 25 * rnd();
      } else {
        lv = 100 + 50 * rnd();
        size = 16 + 14 * rnd();
      }
      const lr = rnd();
      const life = lr < 0.45 ? 1 : lr < 0.78 ? 2 : lr < 0.93 ? 3 : 4;
      const mark = {
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
        fringe: (kind === HAIR || kind === FLAKE ? rnd() < 0.5 : kind === DOT && cls > 0 && rnd() < (cls === 2 ? 0.3 : 0.15)) ? 0 * rnd() : 0
      };
      const marks = [mark];
      for (let k = 1; k < life; k++) {
        const prev = marks[k - 1];
        marks.push({ ...prev, a: prev.a * (0.6 + 0.4 * rnd()), s: prev.s * (0.9 + 0.2 * rnd()), x: prev.x + (rnd() - 0.5) * 2e-3, y: prev.y + (rnd() - 0.5) * 1e-3 });
      }
      out.push({ birth: b, life, keep: rnd() < 0.8, marks });
    }
  }
  dustCache = out;
  return out;
}
function dustFrame(frame, fps) {
  return Math.floor(frame * GRID.dustFps / fps + 1e-6);
}
function dustAt(frame, fps) {
  const df = dustFrame(frame, fps);
  const di = mod(df, GRID.dustLoop);
  const out = [];
  dustLoop().forEach((sp, id) => {
    if (!sp || !sp.marks) return;
    const age = mod(di - sp.birth, GRID.dustLoop);
    if (age >= sp.life) return;
    const m = sp.marks[age];
    if (!m) return;
    const pass = Math.floor((df - age) / GRID.dustLoop);
    const flip = !sp.keep && mod(pass, 2) === 1;
    let fx = m.x;
    let fy = m.y;
    if (!sp.keep && pass !== 0) {
      fx = frac((flip ? 1 - fx : fx) + frac(pass * 0.618034));
      fy = frac(fy + frac(pass * 0.754878));
      const h = Math.sin(id * 12.9898 + pass * 78.233) * 43758.5453;
      if (h - Math.floor(h) >= dustDensity(fy)) return;
    }
    out.push({ ...m, id, fx, fy, flip });
  });
  return out;
}
export {
  GRID,
  dustAt,
  dustFrame,
  dustLoop,
  zoomVelocity
};
