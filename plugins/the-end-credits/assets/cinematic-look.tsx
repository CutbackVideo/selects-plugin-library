// THE END Credits "Cinematic look": a subtle split tone, teal shadows (#2A6F7F) and warm highlights (#FFB36B),
// with saturation -8 % at strength 1. data.strength 0-1 (default 0.3); 0 leaves the picture untouched.
// Pure black stays black and pure white stays white: the tints fade to 0 at both ends of every channel.
// It sits before "Shot frame" on the same clip, so it only tints the source, never the black surround.
import React from "react";
import { AbsoluteFill } from "remotion";

// tec-look:start
const TEC_LOOK_SHADOW = [0x2a / 255, 0x6f / 255, 0x7f / 255];
const TEC_LOOK_HIGHLIGHT = [0xff / 255, 0xb3 / 255, 0x6b / 255];
const TEC_LOOK_AMOUNT = 0.3;      // the tint amount at strength 1
const TEC_LOOK_DESAT = 0.08;      // saturation -8 % at strength 1
const TEC_LOOK_SAMPLES = 33;      // feComponentTransfer table size

function tecLookStrength(strength) {
  const s = typeof strength === "number" ? strength : Number(strength);
  return isFinite(s) ? Math.max(0, Math.min(1, s)) : 0.3;
}

// A tint's direction: its colour minus its own Rec. 709 luma, so the tone shifts hue without changing brightness.
function tecLookChroma(c) {
  const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return [c[0] - y, c[1] - y, c[2] - y];
}

// The per-channel transfer function, channel i (0 r, 1 g, 2 b), value v in 0-1. The shadow weight peaks at v = 1/4
// and the highlight weight at v = 3/4; both are 0 at v = 0 and v = 1, so black and white never move.
function tecLookChannel(i, v, strength) {
  const s = tecLookStrength(strength), x = Math.max(0, Math.min(1, Number(v) || 0));
  if (s === 0) return x;
  const k = 256 / 27;
  const ws = k * x * Math.pow(1 - x, 3), wh = k * Math.pow(x, 3) * (1 - x);
  const out = x + s * TEC_LOOK_AMOUNT * (tecLookChroma(TEC_LOOK_SHADOW)[i] * ws + tecLookChroma(TEC_LOOK_HIGHLIGHT)[i] * wh);
  return Math.max(0, Math.min(1, out));
}

// The feColorMatrix "saturate" matrix (SVG 1.1 coefficients) for saturation 1 - 0.08 * strength: 20 numbers.
function tecLookSaturateMatrix(strength) {
  const t = 1 - TEC_LOOK_DESAT * tecLookStrength(strength);
  return [
    0.213 + 0.787 * t, 0.715 - 0.715 * t, 0.072 - 0.072 * t, 0, 0,
    0.213 - 0.213 * t, 0.715 + 0.285 * t, 0.072 - 0.072 * t, 0, 0,
    0.213 - 0.213 * t, 0.715 - 0.715 * t, 0.072 + 0.928 * t, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

// One pixel through the whole look (desaturate, then the split tone), as the filter applies it in sRGB.
function tecLookPixel(rgb, strength) {
  const m = tecLookSaturateMatrix(strength), c = [0, 1, 2].map(i => Math.max(0, Math.min(1, Number(rgb[i]) || 0)));
  const d = [0, 1, 2].map(r => Math.max(0, Math.min(1, m[r * 5] * c[0] + m[r * 5 + 1] * c[1] + m[r * 5 + 2] * c[2])));
  return d.map((v, i) => tecLookChannel(i, v, strength));
}

// The feComponentTransfer tableValues for channel i (the transfer function sampled at 33 points).
function tecLookTable(i, strength) {
  const out = [];
  for (let n = 0; n < TEC_LOOK_SAMPLES; n++) out.push(Number(tecLookChannel(i, n / (TEC_LOOK_SAMPLES - 1), strength).toFixed(5)));
  return out;
}
// tec-look:end

export default function CinematicLook({ Source, children, data }) {
  const s = tecLookStrength(data?.strength);
  const content = Source ? <Source /> : children;
  if (s === 0) return <AbsoluteFill>{content}</AbsoluteFill>;
  // The same strength always builds the same filter, so clips that share an id share an identical definition.
  const id = `tec-cinematic-look-${Math.round(s * 1000)}`;
  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
            <feColorMatrix type="matrix" values={tecLookSaturateMatrix(s).map(v => v.toFixed(5)).join(" ")} />
            <feComponentTransfer>
              <feFuncR type="table" tableValues={tecLookTable(0, s).join(" ")} />
              <feFuncG type="table" tableValues={tecLookTable(1, s).join(" ")} />
              <feFuncB type="table" tableValues={tecLookTable(2, s).join(" ")} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{content}</AbsoluteFill>
    </AbsoluteFill>
  );
}
