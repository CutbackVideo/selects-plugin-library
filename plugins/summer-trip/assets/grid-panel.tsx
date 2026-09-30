// Summer Trip "Grid panel": masks a cover-scaled, non-16:9 grid clip to its 2x2 quadrant.
// Effects render in the clip's own conformed box, so the quadrant is given as clip-path insets in % of that box
// (effects-geometry.cjs stGridPanelInset computes them together with the cover transform).
// data: insetPct { top, right, bottom, left } (0-100 each, default 0).
import React from "react";
import { AbsoluteFill } from "remotion";

// st-grid:start
function stGridInsetCss(data) {
  const i = data && typeof data === "object" && data.insetPct && typeof data.insetPct === "object" ? data.insetPct : {};
  const v = k => {
    const n = typeof i[k] === "number" ? i[k] : typeof i[k] === "string" && i[k].trim() !== "" ? Number(i[k]) : NaN;
    return Math.round(Math.max(0, Math.min(100, isFinite(n) ? n : 0)) * 10000) / 10000;
  };
  const t = v("top"), r = v("right"), b = v("bottom"), l = v("left");
  if (t === 0 && r === 0 && b === 0 && l === 0) return "none";
  return `inset(${t}% ${r}% ${b}% ${l}%)`;
}
// st-grid:end

export default function GridPanel({ Source, children, data }) {
  const clip = stGridInsetCss(data);
  return <AbsoluteFill style={{ clipPath: clip }}>{Source ? <Source /> : children}</AbsoluteFill>;
}
