// Archive Vlog letterbox reveal (spec §4): the opening shot starts black, then a centred horizontal band of the
// picture opens linearly until the whole frame shows. A mask, not a zoom: the picture inside the band is never scaled.
// data: revealStart (seconds from the clip start, default 0.22), revealEnd (seconds, default 2.30), revealSeconds
// (optional; when it is a number the band is fully open at revealStart + revealSeconds, so Adjust can edit one
// duration), enabled (default true; false shows the clip untouched).
// useCurrentFrame() is 0 at the clip's first timeline frame (measured live) and fps is the sequence fps, so the times
// are seconds whatever the Draft's fps. The band is laid out in % of the clip's own box (effects render in source
// pixel space), so any frame size works.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// av-box:start
const AV_BOX_START = 0.22;   // reference: black until 0.22 s
const AV_BOX_END = 2.3;      // reference: full height at 2.30 s

function avBoxNum(x, fallback) {
  const n = typeof x === "number" ? x : Number(x);
  return x !== null && x !== undefined && x !== "" && isFinite(n) ? n : fallback;
}

// data -> { enabled, start, end } in seconds, end >= start >= 0.
function avBoxTimes(data) {
  const d = data || {};
  const start = Math.max(0, avBoxNum(d.revealStart, AV_BOX_START));
  const secs = avBoxNum(d.revealSeconds, NaN);
  const end = isFinite(secs) ? start + Math.max(0, secs) : Math.max(start, avBoxNum(d.revealEnd, AV_BOX_END));
  return { enabled: d.enabled !== false, start, end };
}

// The band's height as a fraction of the frame (0 = all black, 1 = the whole picture) at t seconds: 0 up to start,
// linear to 1 at end, 1 after. A zero-length reveal cuts straight from black to the full picture at start.
function avBoxBand(t, start, end) {
  const x = Number(t);
  if (!isFinite(x) || x < start) return 0;
  if (!(end > start)) return 1;
  return Math.max(0, Math.min(1, (x - start) / (end - start)));
}

// The CSS clip-path for a band fraction: inset from the top and the bottom by half the hidden height each, in %.
function avBoxInset(band) {
  const edge = Math.max(0, Math.min(1, 1 - band)) * 50;
  return `inset(${edge.toFixed(4)}% 0% ${edge.toFixed(4)}% 0%)`;
}
// av-box:end

export default function LetterboxReveal({ Source, children, data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clip = Source ? <Source /> : children;
  const times = avBoxTimes(data);
  const band = times.enabled ? avBoxBand(frame / (fps > 0 ? fps : 30), times.start, times.end) : 1;
  if (band >= 1) return <AbsoluteFill>{clip}</AbsoluteFill>;
  // The clip keeps playing under the mask, so the reveal shows it already in motion.
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ clipPath: avBoxInset(band) }}>{clip}</AbsoluteFill>
    </AbsoluteFill>
  );
}
