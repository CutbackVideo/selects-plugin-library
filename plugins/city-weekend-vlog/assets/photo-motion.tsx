// City Weekend Vlog photo motion: one subtle, eased move across a montage photo's whole hold.
// data: motion (push-in, pull-out, drift-left/right/up/down, tilt, push-drift), strength (0-2, default 1),
// direction (1 or -1, for tilt and push-drift), axis ("x" or "y", for push-drift), holdSeconds, and cover, the
// clip's cover-crop scale. Every move keeps the picture's edges outside the 9:16 frame.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// cwv-motion:start
// Returns { scale, x, y, rotate } for progress p (0-1): x/y in percent of the frame, rotate in degrees.
// Translations are divided by `cover` so they stay inside the photo whether the clip's cover-crop scale is applied
// before or after this effect; the scale always leaves more overhang than the translation uses.
function cwvMotionTransform(motion, p, strength, direction, axis, width, height, cover) {
  const s = Math.max(0, Math.min(2, typeof strength === "number" && isFinite(strength) ? strength : 1));
  const e = 0.5 - Math.cos(Math.PI * Math.max(0, Math.min(1, Number(p) || 0))) / 2;
  const dir = direction === -1 ? -1 : 1;
  const k = cover > 1 ? cover : 1;
  const out = { scale: 1, x: 0, y: 0, rotate: 0 };
  const push = 0.07 * s;
  if (motion === "push-in") out.scale = 1 + push * e;
  else if (motion === "pull-out") out.scale = 1 + push * (1 - e);
  else if (motion === "drift-left" || motion === "drift-right" || motion === "drift-up" || motion === "drift-down") {
    // Travel from -a to +a (3% at strength 1) under a constant scale with 1% more overhang than the travel needs.
    const a = 3 * s;
    out.scale = 1 + (2 * a + 2) / 100;
    const sign = motion === "drift-left" || motion === "drift-up" ? -1 : 1;
    const at = sign * a * (2 * e - 1) / k;
    if (motion === "drift-left" || motion === "drift-right") out.x = at; else out.y = at;
  } else if (motion === "tilt") {
    // Rotate up to 2.5 degrees; the scale is the smallest that keeps a rotated frame covered, plus a hair.
    const deg = 2.5 * s * e * dir, r = Math.abs(deg) * Math.PI / 180;
    const w = width > 0 ? width : 1080, h = height > 0 ? height : 1920;
    out.rotate = deg;
    out.scale = (Math.cos(r) + Math.max(w / h, h / w) * Math.sin(r)) * 1.003;
  } else if (motion === "push-drift") {
    // Push in 7% while drifting up to 2%; the overhang (3.5% per side at the end) always exceeds the drift.
    out.scale = 1 + push * e;
    const at = dir * 2 * s * e / k;
    if (axis === "y") out.y = at; else out.x = at;
  }
  return out;
}
// cwv-motion:end

export default function PhotoMotion({ Source, children, data }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const hold = Math.max(1, (Number(data?.holdSeconds) || 1) * fps - 1);
  const m = cwvMotionTransform(data?.motion, frame / hold, data?.strength, data?.direction, data?.axis, width, height, Number(data?.cover) || 1);
  const transform = `translate(${m.x.toFixed(3)}%, ${m.y.toFixed(3)}%) rotate(${m.rotate.toFixed(3)}deg) scale(${m.scale.toFixed(4)})`;
  return <AbsoluteFill style={{ transform, transformOrigin: "50% 50%" }}>{Source ? <Source /> : children}</AbsoluteFill>;
}
