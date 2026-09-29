// Summer Trip "Summer look": a teal/orange split tone (cool shadows, warm highlights), a gentle S-curve and +10%
// saturation at strength 1, without lifting blacks. Strength 0 leaves the picture untouched.
// The last montage clip also carries the transition light leak (leakOutSeconds > 0): a moving, uneven warm exposure
// wash over its last leakOutSeconds, blooming toward the left/centre. The leak does not depend on strength.
// data: strength (0-1, default 0.3), leakOutSeconds (default 0), leakStrength (0-2, default 1), clipSeconds,
// sourceStartSeconds, timeOrigin ('clip' | 'source'), canvasInBox (optional { x, y, w, h } in % of the clip's box,
// where the leak is laid out; default the whole box).
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// st-look:start
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
    strength: stLookNum(d.strength, 0.3, 0, 1),
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

// Per-channel tone curves sampled at 17 points (feComponentTransfer tables). Every curve keeps 0 -> 0 and 1 -> 1:
// the grade never lifts blacks or clips whites. Shadows lose red and gain a little green/blue (teal); highlights gain
// red and lose blue (orange). A sine S-curve adds contrast around the fixed midpoint.
function stLookTables(strength) {
  const s = stLookNum(strength, 0, 0, 1);
  const r = [], g = [], b = [];
  for (let i = 0; i <= 16; i++) {
    const x = i / 16;
    const sc = x - 0.3 * s * Math.sin(2 * Math.PI * x) / (2 * Math.PI);
    const sh = 6.75 * x * (1 - x) * (1 - x); // peaks at 1/3, zero at both ends
    const hl = 6.75 * x * x * (1 - x); // peaks at 2/3, zero at both ends
    const clamp = v => Math.round(Math.max(0, Math.min(1, v)) * 10000) / 10000;
    r.push(clamp(sc - 0.08 * s * sh + 0.07 * s * hl));
    g.push(clamp(sc + 0.012 * s * sh + 0.012 * s * hl));
    b.push(clamp(sc + 0.05 * s * sh - 0.11 * s * hl));
  }
  return { r, g, b, saturate: Math.round((1 + 0.1 * s) * 1000) / 1000 };
}

function stLookFilterId(strength) {
  return "st-summer-look-" + Math.round(stLookNum(strength, 0, 0, 1) * 1000);
}

// The transition leak at local time t: [] outside the last leakOutSeconds, otherwise CSS layers laid out in % of
// the canvas rectangle. Four parts: a broad orange overlay wash plus a red-orange screen glow that builds up (reddens water and sky rather than
// whitening them), and a hot bloom whose centre travels from the
// upper left toward the left/centre while it grows, plus a hot orange edge on the right (reference f516 warms
// broadly, f517 turns orange, f518 blows out left/centre).
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
      background: `radial-gradient(ellipse ${rx.toFixed(1)}% ${ry.toFixed(1)}% at ${cx.toFixed(1)}% ${cy.toFixed(1)}%, rgba(255,250,232,${a(bloom)}) 0%, rgba(255,236,180,${a(0.9 * bloom)}) 35%, rgba(255,180,90,${a(0.5 * bloom)}) 65%, rgba(255,140,50,0) 100%)`,
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
  const c = p.canvasInBox;
  return (
    <AbsoluteFill style={{ isolation: "isolate", overflow: "hidden" }}>
      {graded ? (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="1" height="1">
              <feComponentTransfer>
                <feFuncR type="table" tableValues={tables.r.join(" ")} />
                <feFuncG type="table" tableValues={tables.g.join(" ")} />
                <feFuncB type="table" tableValues={tables.b.join(" ")} />
              </feComponentTransfer>
              <feColorMatrix type="saturate" values={String(tables.saturate)} />
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
    </AbsoluteFill>
  );
}
