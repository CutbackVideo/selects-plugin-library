// Mini Vlog warm look: a light golden-hour push. Strength 0 leaves the picture untouched.
import React from "react";
import { AbsoluteFill } from "remotion";

// mv-warm:start
function mvWarmFilter(strength) {
  const s = Math.max(0, Math.min(1, Number(strength) || 0));
  if (s === 0) return "none";
  return `sepia(${(0.22 * s).toFixed(3)}) saturate(${(1 + 0.3 * s).toFixed(3)}) hue-rotate(${(-6 * s).toFixed(2)}deg) brightness(${(1 + 0.03 * s).toFixed(3)}) contrast(${(1 + 0.05 * s).toFixed(3)})`;
}
// mv-warm:end

export default function WarmLook({ Source, children, data }) {
  const strength = typeof data?.strength === "number" ? data.strength : 0.35;
  return <AbsoluteFill style={{ filter: mvWarmFilter(strength) }}>{Source ? <Source /> : children}</AbsoluteFill>;
}
