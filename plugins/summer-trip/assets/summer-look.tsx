// Summer Trip "Summer look": a warm film treatment. Teal shadows and warm highlights (split tone), a gentle S-curve that
// keeps the shadows deep, a soft warm roll-off of the brightest highlights (pure white becomes a slightly creamy
// white), cool colours (cyan skies and water, neon greens) desaturated more than warm ones, and a restrained animated
// film grain. Strength 0 leaves the picture untouched (no grade, no grain); nothing lifts the blacks.
// The last montage clip also carries the transition light leak (leakOutSeconds > 0): a moving, uneven warm exposure
// wash over its last leakOutSeconds, blooming toward the left/centre. The leak does not depend on strength.
// data: strength (0-1, default 0.45), grain (0-1, default 0.35; its opacity also scales with strength),
// leakOutSeconds (default 0), leakStrength (0-2, default 1), clipSeconds, sourceStartSeconds, timeOrigin
// ('clip' | 'source'), canvasInBox (optional { x, y, w, h } in % of the clip's box, where the leak is laid out; default
// the whole box).
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// st-look:start
const ST_LOOK_STRENGTH = 0.45;
const ST_LOOK_GRAIN = 0.35;
function stLookNum(v, d, lo, hi) {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  const x = isFinite(n) ? n : d;
  return Math.max(lo, Math.min(hi, x));
}

function stLookParams(data) {
  const d = data && typeof data === "object" ? data : {};
  const c = d.canvasInBox && typeof d.canvasInBox === "object" ? d.canvasInBox : {};
  const clip = stLookNum(d.clipSeconds, 0, 0, 1e6);
  return {
    strength: stLookNum(d.strength, ST_LOOK_STRENGTH, 0, 1),
    grain: stLookNum(d.grain, ST_LOOK_GRAIN, 0, 1),
    leakOutSeconds: stLookNum(d.leakOutSeconds, 0, 0, 60),
    leakStrength: stLookNum(d.leakStrength, 1, 0, 2),
    clipSeconds: clip > 0 ? clip : null,
    sourceStartSeconds: stLookNum(d.sourceStartSeconds, 0, -1e6, 1e6),
    timeOrigin: d.timeOrigin === "source" ? "source" : "clip",
    canvasInBox: { x: stLookNum(c.x, 0, -1e4, 1e4), y: stLookNum(c.y, 0, -1e4, 1e4), w: stLookNum(c.w, 100, 1e-3, 1e4), h: stLookNum(c.h, 100, 1e-3, 1e4) },
  };
}

// Local time in seconds from the effect's frame (see spec 15.7: clip-relative unless the probe says source time).
function stLookTime(frame, fps, p) {
  const f = Number(fps) > 0 ? Number(fps) : 30;
  return (Number(frame) || 0) / f - (p.timeOrigin === "source" ? p.sourceStartSeconds : 0);
}

// Per-channel tone curves sampled at 17 points (feComponentTransfer tables). Every curve keeps 0 -> 0 (the grade never
// lifts blacks) and is monotonic. Shadows lose red and gain a little green/blue (teal); highlights gain red and lose
// blue (orange). A sine S-curve adds contrast around the fixed midpoint and keeps the shadows deep. Above 60% the
// curves roll off gently toward a warm white (pure white -> 0.98 / 0.96 / 0.90 at strength 1), so bright skies and
// white walls read as print highlights instead of clipped digital white.
// Saturation is split by hue in the filter: warm colours gain `warm` (x1.08 at strength 1), cool ones (cyan, blue,
// green: see ST_LOOK_COOL_MASK) go through `cool` (stLookCoolMatrix: desaturated, cyan pulled toward teal).
function stLookTables(strength) {
  const s = stLookNum(strength, 0, 0, 1);
  const r = [], g = [], b = [];
  const smooth = x => { const u = Math.max(0, Math.min(1, (x - 0.6) / 0.4)); return u * u * (3 - 2 * u); };
  for (let i = 0; i <= 16; i++) {
    const x = i / 16;
    const sc = x - 0.3 * s * Math.sin(2 * Math.PI * x) / (2 * Math.PI);
    const sh = 6.75 * x * (1 - x) * (1 - x); // peaks at 1/3, zero at both ends
    const hl = 6.75 * x * x * (1 - x); // peaks at 2/3, zero at both ends
    const roll = smooth(x);
    const clamp = v => Math.round(Math.max(0, Math.min(1, v)) * 10000) / 10000;
    r.push(clamp(sc - 0.08 * s * sh + 0.07 * s * hl - 0.02 * s * roll));
    g.push(clamp(sc + 0.012 * s * sh + 0.012 * s * hl - 0.04 * s * roll));
    b.push(clamp(sc + 0.05 * s * sh - 0.11 * s * hl - 0.1 * s * roll));
  }
  const k = v => Math.round(v * 1000) / 1000;
  return { r, g, b, warm: k(1 + 0.08 * s), cool: stLookCoolMatrix(s).map(k).join(" ") };
}

// The cool branch as a 4x5 feColorMatrix: desaturate to 1 - 0.7 s (SVG saturate weights), then pull blue toward
// green by 0.35 s (cyan -> teal, as the reference's sea and sky) and darken by 0.08 s. Identity at strength 0.
function stLookCoolMatrix(s) {
  const c = 1 - 0.7 * s, m = 0.35 * s, d = 1 - 0.08 * s;
  const lr = 0.213, lg = 0.715, lb = 0.072;
  const S = [
    [lr + (1 - lr) * c, lg - lg * c, lb - lb * c],
    [lr - lr * c, lg + (1 - lg) * c, lb - lb * c],
    [lr - lr * c, lg - lg * c, lb + (1 - lb) * c],
  ];
  const B = [0, 1, 2].map(i => (1 - m) * S[2][i] + m * S[1][i]);
  const rows = [S[0], S[1], B];
  const out = [];
  for (const row of rows) out.push(d * row[0], d * row[1], d * row[2], 0, 0);
  out.push(0, 0, 0, 1, 0);
  return out;
}

// The cool mask (feColorMatrix alpha row over the toned picture): alpha = -2.5 R + 2 G + 0.5 B, clamped to 0-1. Warm
// colours, skin, stone and greys give 0 (full `warm` saturation); cyan sky and water give about 1, neon green about
// 0.4-0.6 (desaturated toward `cool`).
const ST_LOOK_COOL_MASK = "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.5 2 0.5 0 0";

// Film grain at frame `frame`: a small opaque grey fractal-noise tile (an SVG data URI, one of 8 seeds, contrast
// stretched around mid-grey so overlay leaves the mean exposure alone) repeated over
// the clip, moved to a seeded offset every frame, overlay-blended. Its opacity is grain * strength * 0.5, so strength
// 0 (look off) has no grain. null when there is nothing to draw.
function stLookGrain(frame, p) {
  const opacity = Math.round(p.grain * p.strength * 0.5 * 1000) / 1000;
  if (!(opacity > 0)) return null;
  const f = Math.max(0, Math.round(Number(frame) || 0));
  let h = (f + 1) * 2654435761 >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  const seed = f % 8;
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='g' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='" + seed +
    "' stitchTiles='stitch'/><feColorMatrix values='0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1'/>" +
    "<feComponentTransfer><feFuncR type='linear' slope='3' intercept='-1'/><feFuncG type='linear' slope='3' intercept='-1'/><feFuncB type='linear' slope='3' intercept='-1'/></feComponentTransfer></filter><rect width='256' height='256' filter='url(%23g)'/></svg>";
  return {
    opacity,
    backgroundImage: 'url("data:image/svg+xml;utf8,' + svg + '")',
    backgroundSize: "256px 256px",
    backgroundPosition: (h % 256) + "px " + ((h >>> 8) % 256) + "px",
  };
}

function stLookFilterId(strength) {
  return "st-summer-look-" + Math.round(stLookNum(strength, 0, 0, 1) * 1000);
}

// The transition leak at local time t: [] outside the last leakOutSeconds, otherwise CSS layers laid out in % of
// the canvas rectangle. Four parts: a broad orange overlay wash plus a red-orange screen glow that builds up (reddens water and sky rather than
// whitening them), and a hot bloom whose centre travels from the
// upper left toward the left/centre while it grows, plus a hot orange edge on the right (reference f516 warms
// broadly, f517 turns orange, f518 blows out left/centre). The bloom peaks at a warm amber, never a near-white frame.
function stLeakOutLayers(t, p) {
  if (!(p.leakOutSeconds > 0) || !(p.clipSeconds > 0) || !(p.leakStrength > 0)) return [];
  const start = p.clipSeconds - p.leakOutSeconds;
  if (!(t >= start - 1e-9)) return [];
  const u = Math.max(0, Math.min(1, (t - start) / p.leakOutSeconds));
  const k = p.leakStrength;
  const e = u * u * (3 - 2 * u);
  const a = v => Math.max(0, Math.min(1, v)).toFixed(3);
  const wash = Math.min(1, (0.85 + 0.15 * e) * k);
  const glow = Math.min(1, (0.5 + 0.3 * e) * k);
  const bloom = Math.min(1, (0.1 + 0.9 * Math.pow(u, 1.6)) * k);
  const edge = Math.min(1, 0.65 * e * k);
  const cx = 38 - 14 * e, cy = 30 + 4 * e, rx = 50 + 55 * e, ry = 60 + 60 * e;
  return [
    {
      key: "wash",
      background: `linear-gradient(100deg, rgba(255,150,60,${a(0.75 * wash)}) 0%, rgba(255,110,40,${a(0.85 * wash)}) 50%, rgba(255,90,40,${a(0.9 * wash)}) 100%)`,
      mixBlendMode: "overlay",
    },
    {
      key: "glow",
      background: `linear-gradient(100deg, rgba(255,110,40,${a(0.5 * glow)}) 0%, rgba(255,80,30,${a(0.7 * glow)}) 100%)`,
      mixBlendMode: "screen",
    },
    {
      key: "bloom",
      background: `radial-gradient(ellipse ${rx.toFixed(1)}% ${ry.toFixed(1)}% at ${cx.toFixed(1)}% ${cy.toFixed(1)}%, rgba(255,228,170,${a(0.85 * bloom)}) 0%, rgba(255,205,135,${a(0.8 * bloom)}) 35%, rgba(255,165,80,${a(0.5 * bloom)}) 65%, rgba(255,140,50,0) 100%)`,
      mixBlendMode: "screen",
    },
    {
      key: "edge",
      background: `radial-gradient(ellipse 12% 90% at 98% 50%, rgba(255,120,30,${a(edge)}) 0%, rgba(255,90,30,${a(0.5 * edge)}) 50%, rgba(255,80,30,0) 100%)`,
      mixBlendMode: "screen",
    },
  ];
}
// st-look:end

export default function SummerLook({ Source, children, data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig(); // fps only: width/height are the sequence's, not this clip's box
  const p = stLookParams(data);
  const t = stLookTime(frame, fps, p);
  const graded = p.strength > 0;
  const id = stLookFilterId(p.strength);
  const tables = graded ? stLookTables(p.strength) : null;
  const leak = stLeakOutLayers(t, p);
  const grain = graded ? stLookGrain(frame, p) : null;
  const c = p.canvasInBox;
  return (
    <AbsoluteFill style={{ isolation: "isolate", overflow: "hidden" }}>
      {graded ? (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="1" height="1">
              <feComponentTransfer result="tone">
                <feFuncR type="table" tableValues={tables.r.join(" ")} />
                <feFuncG type="table" tableValues={tables.g.join(" ")} />
                <feFuncB type="table" tableValues={tables.b.join(" ")} />
              </feComponentTransfer>
              <feColorMatrix in="tone" type="saturate" values={String(tables.warm)} result="warm" />
              <feColorMatrix in="tone" type="matrix" values={tables.cool} result="cool" />
              <feColorMatrix in="tone" type="matrix" values={ST_LOOK_COOL_MASK} result="mask" />
              <feComposite in="cool" in2="mask" operator="in" result="coolPart" />
              <feComposite in="warm" in2="mask" operator="out" result="warmPart" />
              <feComposite in="coolPart" in2="warmPart" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
            </filter>
          </defs>
        </svg>
      ) : null}
      <AbsoluteFill style={{ filter: graded ? `url(#${id})` : "none" }}>{Source ? <Source /> : children}</AbsoluteFill>
      {leak.length ? (
        <div style={{ position: "absolute", left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%`, pointerEvents: "none" }}>
          {leak.map(l => (
            <div key={l.key} style={{ position: "absolute", inset: 0, background: l.background, mixBlendMode: l.mixBlendMode }} />
          ))}
        </div>
      ) : null}
      {grain ? (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "overlay", opacity: grain.opacity, backgroundImage: grain.backgroundImage,
          backgroundSize: grain.backgroundSize, backgroundPosition: grain.backgroundPosition, backgroundRepeat: "repeat" }} />
      ) : null}
    </AbsoluteFill>
  );
}
