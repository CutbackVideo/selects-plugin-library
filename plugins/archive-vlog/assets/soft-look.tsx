// Archive Vlog soft look: a slight shadow lift, a little less contrast and a touch of pink in the highlights only.
// Strength 0 leaves the picture untouched. The grade is an inline SVG filter evaluated in sRGB 0-1; avSoftMap below
// is the exact per-pixel maths of that filter chain (tests/look.test.cjs samples it).
import React from "react";
import { AbsoluteFill } from "remotion";

// av-soft:start
// Rec.709 luma weights, applied to sRGB values (the filter runs with color-interpolation-filters sRGB).
const AV_SOFT_LUMA = [0.2126, 0.7152, 0.0722];
// Highlight tint per channel, relative to warmth: toward the title pink #F7C8E6 (R most, B some, G none).
const AV_SOFT_TINT = [1, 0, 0.55];

function avSoftClamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Attribute precision: the spec numbers are rounded once here so the filter and avSoftMap use the same values.
function avSoftRound(x) {
  return Number(x.toFixed(6));
}

// strength 0-1 -> grade parameters. 0 is neutral everywhere.
function avSoftParams(strength) {
  const s = avSoftClamp01(Number(strength) || 0);
  return {
    lift: 0.006 * s,          // extra black-point lift on top of the contrast pivot
    contrast: 1 - 0.08 * s,   // -8 % at full strength, pivoted at 0.5
    warmth: 0.1 * s,          // red added at luma 1 (scaled by AV_SOFT_TINT per channel)
    pinkThreshold: 0.6,       // no tint at or below this luma
  };
}

// The filter's attribute numbers, or null when there is nothing to do (strength 0 renders no filter at all).
// grade: feComponentTransfer type="linear" on R, G, B of the source.
// luma: feColorMatrix rows that write the source luma into R, G and B.
// tint: feComponentTransfer type="linear" per channel on that luma: max(0, slope * (L - threshold)).
// The graded image and the tint are summed by feComposite operator="arithmetic" k2=1 k3=1.
function avSoftSpec(strength) {
  const p = avSoftParams(strength);
  if (p.lift === 0 && p.contrast === 1 && p.warmth === 0) return null;
  const k = p.warmth / (1 - p.pinkThreshold);
  return {
    grade: { slope: avSoftRound(p.contrast), intercept: avSoftRound((1 - p.contrast) * 0.5 + p.lift) },
    luma: AV_SOFT_LUMA,
    tint: AV_SOFT_TINT.map(t => ({ slope: avSoftRound(k * t), intercept: avSoftRound(-k * t * p.pinkThreshold) })),
  };
}

// (r, g, b) 0-1 -> (r, g, b) 0-1, exactly as the filter chain computes it: every primitive clamps its output to
// 0-1 and the arithmetic composite clamps the sum. Assumes an opaque pixel (alpha 1), so premultiplied = straight.
function avSoftMap(r, g, b, strength) {
  const spec = avSoftSpec(strength);
  if (!spec) return [r, g, b];
  const src = [r, g, b];
  const L = avSoftClamp01(spec.luma[0] * r + spec.luma[1] * g + spec.luma[2] * b);
  return src.map((c, i) => {
    const graded = avSoftClamp01(spec.grade.slope * c + spec.grade.intercept);
    const tint = avSoftClamp01(spec.tint[i].slope * L + spec.tint[i].intercept);
    return avSoftClamp01(graded + tint);
  });
}
// av-soft:end

let avSoftSeq = 0;
// A filter id unique to this instance (React 18 useId when present, else a per-mount counter), safe inside url(#...).
const avSoftUseId = React.useId
  ? () => "av-soft-" + React.useId().replace(/[^A-Za-z0-9_-]/g, "")
  : () => React.useMemo(() => "av-soft-n" + ++avSoftSeq, []);

export default function SoftLook({ Source, children, data }) {
  const strength = typeof data?.strength === "number" ? data.strength : 0.35;
  const id = avSoftUseId();
  const spec = avSoftSpec(strength);
  const clip = Source ? <Source /> : children;
  if (!spec) return <AbsoluteFill>{clip}</AbsoluteFill>;
  const lumaRow = `${spec.luma.join(" ")} 0 0`;
  const g = spec.grade, t = spec.tint;
  return (
    <AbsoluteFill>
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feComponentTransfer in="SourceGraphic" result="graded">
              <feFuncR type="linear" slope={g.slope} intercept={g.intercept} />
              <feFuncG type="linear" slope={g.slope} intercept={g.intercept} />
              <feFuncB type="linear" slope={g.slope} intercept={g.intercept} />
            </feComponentTransfer>
            <feColorMatrix in="SourceGraphic" type="matrix" values={`${lumaRow} ${lumaRow} ${lumaRow} 0 0 0 1 0`} result="luma" />
            <feComponentTransfer in="luma" result="tint">
              <feFuncR type="linear" slope={t[0].slope} intercept={t[0].intercept} />
              <feFuncG type="linear" slope={t[1].slope} intercept={t[1].intercept} />
              <feFuncB type="linear" slope={t[2].slope} intercept={t[2].intercept} />
            </feComponentTransfer>
            <feComposite in="graded" in2="tint" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{clip}</AbsoluteFill>
    </AbsoluteFill>
  );
}
