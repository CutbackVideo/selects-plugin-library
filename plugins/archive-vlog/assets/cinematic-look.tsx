// Archive Vlog "Cinematic look" (spec §6): warm highlights over neutral, deep shadows, like the reference's footage.
// A product hypothesis, not a recovered grade. At strength 1 and warmth 1:
// - highlights warm up above mid-grey: blue down (white ends at B 0.90), red up a little, green down a hair;
// - mid-contrast softened (slope 0.88 at mid-grey), steeper near the ends so the black and white points stay;
// - saturation +5 %, no more;
// - shadows stay neutral (no tint below mid-grey) and pure black stays black.
// data.strength 0-1 (default 0.30; 0 leaves the picture untouched), data.warmth 0-2 (default 1; scales the highlight
// warmth only, Golden Hour uses ~1.4). The grade is an inline SVG filter evaluated in sRGB 0-1: a saturation
// feColorMatrix, then per-channel feComponentTransfer tables. avLookPixel below is the exact per-pixel maths of that
// chain (tests/look.test.cjs samples it).
import React from "react";
import { AbsoluteFill } from "remotion";

// av-look:start
const AV_LOOK_DEFAULT = 0.3;
const AV_LOOK_SAMPLES = 33;      // feComponentTransfer table size
const AV_LOOK_SOFTEN = 0.12;     // mid-contrast cut at strength 1: slope 1 - 0.12 at mid-grey
const AV_LOOK_SAT = 0.05;        // saturation lift at strength 1
// Highlight warmth at strength 1, warmth 1, per channel: red bump (x g (1 - x), 0 at white), green and blue pulls
// (x g, full at white). g is the highlight weight, 0 at and below mid-grey.
const AV_LOOK_RED = 0.35;
const AV_LOOK_GREEN = 0.015;
const AV_LOOK_BLUE = 0.1;

function avLookClamp(v) { return Math.max(0, Math.min(1, v)); }
function avLookStrength(strength) {
  const s = typeof strength === "number" ? strength : Number(strength);
  return strength !== null && strength !== undefined && strength !== "" && isFinite(s) ? avLookClamp(s) : AV_LOOK_DEFAULT;
}
function avLookWarmth(warmth) {
  const w = typeof warmth === "number" ? warmth : Number(warmth);
  return warmth !== null && warmth !== undefined && warmth !== "" && isFinite(w) ? Math.max(0, Math.min(2, w)) : 1;
}

// Highlight weight: smoothstep from mid-grey (0.5) to white (1).
function avLookHigh(x) {
  const t = avLookClamp((x - 0.5) / 0.5);
  return t * t * (3 - 2 * t);
}

// The tone curve of channel i (0 r, 1 g, 2 b) at v in 0-1. Every term is 0 at v = 0, so the black point is kept; the
// softening term c sin(2 pi v) / (2 pi) is also 0 at mid-grey and white and has slope -c at mid-grey.
function avLookChannel(i, v, strength, warmth) {
  const s = avLookStrength(strength), w = avLookWarmth(warmth), x = avLookClamp(Number(v) || 0);
  if (s === 0) return x;
  const c = AV_LOOK_SOFTEN * s, g = avLookHigh(x), k = s * w;
  let y = x + c * Math.sin(2 * Math.PI * x) / (2 * Math.PI);
  if (i === 0) y += AV_LOOK_RED * k * g * (1 - x);
  else if (i === 1) y -= AV_LOOK_GREEN * k * g;
  else y -= AV_LOOK_BLUE * k * g;
  return avLookClamp(y);
}

// The feComponentTransfer tableValues for channel i (the tone curve sampled at 33 points, 5 decimals).
function avLookTable(i, strength, warmth) {
  const out = [];
  for (let n = 0; n < AV_LOOK_SAMPLES; n++) out.push(Number(avLookChannel(i, n / (AV_LOOK_SAMPLES - 1), strength, warmth).toFixed(5)));
  return out;
}

// The feColorMatrix "saturate" matrix (SVG 1.1 coefficients, rows sum to 1 so greys stay grey) for saturation
// 1 + 0.05 strength, as 20 numbers rounded to 5 decimals (the values the filter gets).
function avLookSaturate(strength) {
  const t = 1 + AV_LOOK_SAT * avLookStrength(strength);
  const r5 = (v) => Number(v.toFixed(5));
  const w = [0.213, 0.715, 0.072];
  const out = [];
  for (let r = 0; r < 3; r++) {
    // Off-diagonal entries rounded, the diagonal takes the rest so each row still sums to exactly 1.
    const row = w.map((l, c) => (c === r ? 0 : r5(l - l * t)));
    row[r] = r5(1 - row[0] - row[1] - row[2]);
    out.push(...row, 0, 0);
  }
  return [...out, 0, 0, 0, 1, 0];
}

// An feComponentTransfer type="table" lookup: piecewise linear between the n + 1 table values.
function avLookLookup(table, v) {
  const x = avLookClamp(v), n = table.length - 1;
  if (x >= 1) return table[n];
  const k = Math.floor(x * n);
  return table[k] + (x * n - k) * (table[k + 1] - table[k]);
}

// The filter's attribute numbers, or null when there is nothing to do (strength 0 renders no filter at all).
function avLookSpec(strength, warmth) {
  const s = avLookStrength(strength);
  if (s === 0) return null;
  return { saturate: avLookSaturate(s), tables: [0, 1, 2].map(i => avLookTable(i, s, warmth)) };
}

// One opaque pixel (r, g, b 0-1) through the filter exactly as it computes it: the saturation matrix (clamped to 0-1),
// then each channel through its table.
function avLookPixel(rgb, strength, warmth) {
  const c = [0, 1, 2].map(i => avLookClamp(Number(rgb[i]) || 0));
  const spec = avLookSpec(strength, warmth);
  if (!spec) return c;
  const m = spec.saturate;
  const sat = [0, 1, 2].map(r => avLookClamp(m[r * 5] * c[0] + m[r * 5 + 1] * c[1] + m[r * 5 + 2] * c[2] + m[r * 5 + 4]));
  return sat.map((v, i) => avLookLookup(spec.tables[i], v));
}
// av-look:end

const fmt = (m) => m.join(" ");

export default function CinematicLook({ Source, children, data }) {
  const clip = Source ? <Source /> : children;
  const spec = avLookSpec(data?.strength, data?.warmth);
  if (!spec) return <AbsoluteFill>{clip}</AbsoluteFill>;
  // The same settings always build the same filter, so clips that share an id share an identical definition.
  const id = `av-cinematic-look-${Math.round(avLookStrength(data?.strength) * 1000)}-${Math.round(avLookWarmth(data?.warmth) * 1000)}`;
  return (
    <AbsoluteFill>
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values={fmt(spec.saturate)} result="saturated" />
            <feComponentTransfer in="saturated">
              <feFuncR type="table" tableValues={fmt(spec.tables[0])} />
              <feFuncG type="table" tableValues={fmt(spec.tables[1])} />
              <feFuncB type="table" tableValues={fmt(spec.tables[2])} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{clip}</AbsoluteFill>
    </AbsoluteFill>
  );
}
