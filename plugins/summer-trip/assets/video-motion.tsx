// Summer Trip "Video motion" (montage video clips on Main): a slow push-in across the whole clip, 1.00 -> 1.04 at
// strength 1 (eased in and out), about the centre of the clip's box. The scale never drops below 1, so no edge of the
// picture shows for 16:9 or cover-scaled clips; the Summer look sits on top of it (added after), so its grade, grain
// and transition leak stay fixed on the canvas while the picture moves.
// data: strength (0-2, default 1; 0 = still), clipSeconds, sourceStartSeconds, timeOrigin ('clip' | 'source').
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// st-vmotion:start
const ST_VMOTION_PUSH = 0.04; // extra scale at the clip's last frame, at strength 1

function stVMotionNum(v, d, lo, hi) {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  const x = isFinite(n) ? n : d;
  return Math.max(lo, Math.min(hi, x));
}

function stVMotionParams(data) {
  const d = data && typeof data === "object" ? data : {};
  const clip = stVMotionNum(d.clipSeconds, 0, 0, 1e6);
  return {
    strength: stVMotionNum(d.strength, 1, 0, 2),
    clipSeconds: clip > 0 ? clip : null,
    sourceStartSeconds: stVMotionNum(d.sourceStartSeconds, 0, -1e6, 1e6),
    timeOrigin: d.timeOrigin === "source" ? "source" : "clip",
  };
}

// Scale at the effect's frame: clip-local frame (spec 15.7: clip-relative unless the probe says source time) over the
// clip's frame count - 1, eased with a half cosine, so the first frame is 1 and the last 1 + 0.04 * strength. Without a
// clip length the picture stays still.
function stVMotionScale(frame, fps, p) {
  const f = Number(fps) > 0 ? Number(fps) : 30;
  if (!(p.clipSeconds > 0) || !(p.strength > 0)) return 1;
  const local = (Number(frame) || 0) - (p.timeOrigin === "source" ? p.sourceStartSeconds * f : 0);
  const span = Math.max(1, Math.round(p.clipSeconds * f) - 1);
  const u = Math.max(0, Math.min(1, local / span));
  const e = 0.5 - Math.cos(Math.PI * u) / 2;
  return 1 + ST_VMOTION_PUSH * p.strength * e;
}
// st-vmotion:end

export default function VideoMotion({ Source, children, data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig(); // fps only: width/height are the sequence's, not this clip's box
  const scale = stVMotionScale(frame, fps, stVMotionParams(data));
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale.toFixed(5)})`, transformOrigin: "50% 50%" }}>{Source ? <Source /> : children}</AbsoluteFill>
    </AbsoluteFill>
  );
}
