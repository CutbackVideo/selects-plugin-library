// Archive Vlog "Cinematic look" (spec §6): warm highlights over neutral, deep shadows, like the reference's footage.
// A product hypothesis, not a recovered grade. At strength 1 and warmth 1:
// - green and cyan hues lose up to 70 % of their saturation, weighted by a mask from G - R (0 on greys, reds, oranges,
//   yellows, magentas and pure blue) gated off where B is well above G (blue skies stay blue);
// - very saturated oranges (sunsets, R - B above 0.4) lose up to 60 %, a soft knee that skin and amber never reach;
// - highlights warm up above mid-grey: blue down (white ends at B 0.90 before the roll-off), red up a little, green
//   down a hair;
// - a shadow toe (below mid-grey, 0 at black and at mid-grey) deepens the shadows without crushing them, and a
//   highlight shoulder (above 0.6) rolls white off to 0.94 on every channel, so near-white walls and skies soften;
// - mid-contrast softened (slope 0.88 at mid-grey), steeper near the ends;
// - saturation +5 %, no more;
// - shadows stay neutral (no tint below mid-grey) and pure black stays black.
// data.strength 0-1 (default 0.30; 0 leaves the picture untouched), data.warmth 0-2 (default 1; scales the highlight
// warmth only, Golden Hour uses ~1.4). The grade is an inline SVG filter evaluated in sRGB 0-1: two hue-masked
// desaturation blends (the green/cyan one, then the orange knee; each source x (1 - m) + desaturated x m, built from
// feColorMatrix masks and arithmetic feComposite like THE END Credits' look; the green mask is multiplied by its blue
// gate with one more composite), a saturation feColorMatrix, then
// per-channel feComponentTransfer tables. avLookPixel below is the exact per-pixel maths of that chain
// (tests/look.test.cjs samples it).
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
// Shadow toe at strength 1: minus TOE x 16 u^2 (1 - u)^2, u = v / 0.5 (peak 0.1 at v = 0.25; 0 with slope 0 at black,
// so near-black is never crushed; 0 from mid-grey up). Highlight shoulder at strength 1: minus SHOULDER x
// smoothstep((v - 0.6) / 0.4) (0.06 at white).
const AV_LOOK_TOE = 0.1;
const AV_LOOK_SHOULDER = 0.06;
// Hue-masked desaturation at strength 1. Mask m = clamp(GAIN x (a - b) - OFFSET), (a, b) = (G, R) for green/cyan and
// (R, B) for the orange knee; the masked pixel blends towards saturation 1 - DESAT x strength.
// Green/cyan: m from G - R = 0.01 (0) to 0.11 (1): dark foliage ~0.3-1, a bright green or teal 1.
const AV_LOOK_GREEN_GAIN = 10, AV_LOOK_GREEN_OFFSET = 0.1, AV_LOOK_GREEN_DESAT = 0.7;
// Its blue gate clamp(1 - GATE x (B - G)): 1 where B <= G (greens, teal), 0 from B - G = 0.25 (sky blues).
const AV_LOOK_GREEN_GATE = 4;
// Orange knee: m from R - B = 0.4 (0) to 0.8 (1): skin (~0.25) and amber highlights stay out, a deep sunset orange 1.
const AV_LOOK_ORANGE_GAIN = 2.5, AV_LOOK_ORANGE_OFFSET = 1.0, AV_LOOK_ORANGE_DESAT = 0.6;

function avLookClamp(v) { return Math.max(0, Math.min(1, v)); }
function avLookStrength(strength) {
  const s = typeof strength === "number" ? strength : Number(strength);
  return strength !== null && strength !== undefined && strength !== "" && isFinite(s) ? avLookClamp(s) : AV_LOOK_DEFAULT;
}
function avLookWarmth(warmth) {
  const w = typeof warmth === "number" ? warmth : Number(warmth);
  return warmth !== null && warmth !== undefined && warmth !== "" && isFinite(w) ? Math.max(0, Math.min(2, w)) : 1;
}
const avLookR5 = (v) => Number(v.toFixed(5));

// Highlight weight: smoothstep from mid-grey (0.5) to white (1).
function avLookHigh(x) {
  const t = avLookClamp((x - 0.5) / 0.5);
  return t * t * (3 - 2 * t);
}
// Shadow toe weight: 16 u^2 (1 - u)^2 on u = x / 0.5, peak 1 at x = 0.25, 0 at black and from mid-grey up.
function avLookToe(x) {
  const u = avLookClamp(x / 0.5);
  return 16 * u * u * (1 - u) * (1 - u);
}
// Highlight shoulder weight: smoothstep from 0.6 to white.
function avLookShoulder(x) {
  const t = avLookClamp((x - 0.6) / 0.4);
  return t * t * (3 - 2 * t);
}

// The tone curve of channel i (0 r, 1 g, 2 b) at v in 0-1. Every term is 0 at v = 0, so the black point is kept; the
// softening term c sin(2 pi v) / (2 pi) is also 0 at mid-grey and white and has slope -c at mid-grey. The toe and the
// shoulder are the same on every channel (no tint) and 0 at mid-grey, so mid-grey stays.
function avLookChannel(i, v, strength, warmth) {
  const s = avLookStrength(strength), w = avLookWarmth(warmth), x = avLookClamp(Number(v) || 0);
  if (s === 0) return x;
  const c = AV_LOOK_SOFTEN * s, g = avLookHigh(x), k = s * w;
  let y = x + c * Math.sin(2 * Math.PI * x) / (2 * Math.PI) - AV_LOOK_TOE * s * avLookToe(x) - AV_LOOK_SHOULDER * s * avLookShoulder(x);
  if (i === 0) y += AV_LOOK_RED * k * g * (1 - x);
  else if (i === 1) y -= AV_LOOK_GREEN * k * g;
  else y -= AV_LOOK_BLUE * k * g;
  return avLookClamp(y);
}

// The feComponentTransfer tableValues for channel i (the tone curve sampled at 33 points, 5 decimals).
function avLookTable(i, strength, warmth) {
  const out = [];
  for (let n = 0; n < AV_LOOK_SAMPLES; n++) out.push(avLookR5(avLookChannel(i, n / (AV_LOOK_SAMPLES - 1), strength, warmth)));
  return out;
}

// The feColorMatrix "saturate" matrix (SVG 1.1 coefficients, rows sum to 1 so greys stay grey) for saturation t, as 20
// numbers rounded to 5 decimals (the values the filter gets).
function avLookSaturation(t) {
  const w = [0.213, 0.715, 0.072];
  const out = [];
  for (let r = 0; r < 3; r++) {
    // Off-diagonal entries rounded, the diagonal takes the rest so each row still sums to exactly 1.
    const row = w.map((l, c) => (c === r ? 0 : avLookR5(l - l * t)));
    row[r] = avLookR5(1 - row[0] - row[1] - row[2]);
    out.push(...row, 0, 0);
  }
  return [...out, 0, 0, 0, 1, 0];
}
// The overall saturation lift: 1 + 0.05 strength.
function avLookSaturate(strength) { return avLookSaturation(1 + AV_LOOK_SAT * avLookStrength(strength)); }

// A hue mask (keep = false) or its complement (keep = true) in r, g and b, alpha 1: 20 numbers. m = clamp(gain x
// (channel a - channel b) - offset); the complement is built by the matrix itself (clamp(1 - x) = 1 - clamp(x)), so
// the blend never needs a subtraction, which the premultiplied arithmetic composite would clamp. Greys give m = 0.
function avLookMask(a, b, gain, offset, keep) {
  const row = [0, 0, 0, 0, keep ? avLookR5(1 + offset) : avLookR5(-offset)];
  row[a] += keep ? -gain : gain;
  row[b] += keep ? gain : -gain;
  return [...row, ...row, ...row, 0, 0, 0, 0, 1];
}
// The keep matrix of a gated blend: 1 - m, applied to the gated mask image (whose r, g and b all hold m).
const AV_LOOK_KEEP_FROM_MASK = [-1, 0, 0, 0, 1, -1, 0, 0, 0, 1, -1, 0, 0, 0, 1, 0, 0, 0, 0, 1];
// The two hue-masked blends: { mask, gate, keep, muted } matrices each (muted: the desaturated copy the masked pixels
// take). Without a gate (null) mask and keep both apply to the blend's input; with one, the mask is the product of mask
// and gate (an arithmetic composite) and keep (AV_LOOK_KEEP_FROM_MASK) applies to that product.
function avLookBlends(s) {
  const g = AV_LOOK_GREEN_GATE;
  return [
    { mask: avLookMask(1, 0, AV_LOOK_GREEN_GAIN, AV_LOOK_GREEN_OFFSET, false), gate: [0, g, -g, 0, 1, 0, g, -g, 0, 1, 0, g, -g, 0, 1, 0, 0, 0, 0, 1],
      keep: AV_LOOK_KEEP_FROM_MASK, muted: avLookSaturation(1 - AV_LOOK_GREEN_DESAT * s) },
    { mask: avLookMask(0, 2, AV_LOOK_ORANGE_GAIN, AV_LOOK_ORANGE_OFFSET, false), gate: null,
      keep: avLookMask(0, 2, AV_LOOK_ORANGE_GAIN, AV_LOOK_ORANGE_OFFSET, true), muted: avLookSaturation(1 - AV_LOOK_ORANGE_DESAT * s) },
  ];
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
  return { blends: avLookBlends(s), saturate: avLookSaturate(s), tables: [0, 1, 2].map(i => avLookTable(i, s, warmth)) };
}

// A feColorMatrix on one pixel, clamped to 0-1 like every filter primitive's output.
function avLookApply(m, c) {
  return [0, 1, 2].map(r => avLookClamp(m[r * 5] * c[0] + m[r * 5 + 1] * c[1] + m[r * 5 + 2] * c[2] + m[r * 5 + 4]));
}
// One opaque pixel (r, g, b 0-1) through the filter exactly as it computes it, every primitive clamped to 0-1: each
// blend (mask, times the gate if any; keep; then source x keep + muted x mask, the products and the sum clamped as the
// arithmetic composites do), the
// saturation matrix, then each channel through its table.
function avLookPixel(rgb, strength, warmth) {
  let c = [0, 1, 2].map(i => avLookClamp(Number(rgb[i]) || 0));
  const spec = avLookSpec(strength, warmth);
  if (!spec) return c;
  for (const b of spec.blends) {
    let mask = avLookApply(b.mask, c);
    if (b.gate) { const gate = avLookApply(b.gate, c); mask = mask.map((v, i) => avLookClamp(v * gate[i])); }
    const keep = avLookApply(b.keep, b.gate ? mask : c), muted = avLookApply(b.muted, c);
    c = c.map((v, i) => avLookClamp(avLookClamp(v * keep[i]) + avLookClamp(muted[i] * mask[i])));
  }
  return avLookApply(spec.saturate, c).map((v, i) => avLookLookup(spec.tables[i], v));
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
            {spec.blends.map((b, n) => {
              const src = n === 0 ? "SourceGraphic" : `blended${n - 1}`;
              return (
                <React.Fragment key={n}>
                  <feColorMatrix in={src} type="matrix" values={fmt(b.muted)} result={`muted${n}`} />
                  {b.gate ? (
                    <>
                      <feColorMatrix in={src} type="matrix" values={fmt(b.mask)} result={`hue${n}`} />
                      <feColorMatrix in={src} type="matrix" values={fmt(b.gate)} result={`gate${n}`} />
                      <feComposite in={`hue${n}`} in2={`gate${n}`} operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result={`mask${n}`} />
                      <feColorMatrix in={`mask${n}`} type="matrix" values={fmt(b.keep)} result={`keep${n}`} />
                    </>
                  ) : (
                    <>
                      <feColorMatrix in={src} type="matrix" values={fmt(b.mask)} result={`mask${n}`} />
                      <feColorMatrix in={src} type="matrix" values={fmt(b.keep)} result={`keep${n}`} />
                    </>
                  )}
                  <feComposite in={src} in2={`keep${n}`} operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result={`kept${n}`} />
                  <feComposite in={`muted${n}`} in2={`mask${n}`} operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result={`masked${n}`} />
                  <feComposite in={`kept${n}`} in2={`masked${n}`} operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result={`blended${n}`} />
                </React.Fragment>
              );
            })}
            <feColorMatrix in={`blended${spec.blends.length - 1}`} type="matrix" values={fmt(spec.saturate)} result="saturated" />
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
