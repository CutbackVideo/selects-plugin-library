// Archive Vlog letterbox reveal (spec §4): the opening shot starts black, then a centred horizontal band of the
// picture opens linearly until the whole frame shows. A mask, not a zoom: the picture inside the band is never scaled.
// data: revealStart (seconds from the clip start, default 0.22), revealEnd (seconds, default 2.35), revealSeconds
// (optional; when it is a number the band is fully open at revealStart + revealSeconds, so Adjust can edit one
// duration), enabled (default true; false shows the clip untouched), visible (default 1: the fraction of the clip's
// height the 16:9 canvas shows; a taller source is cover-cropped top and bottom, so its band is remapped, see avBoxInset).
// useCurrentFrame() is 0 at the clip's first timeline frame (measured live) and fps is the sequence fps, so the times
// are seconds whatever the Draft's fps. The band is laid out in % of the clip's own box (effects render in source
// pixel space), so any frame size works.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// av-box:start
const AV_BOX_START = 0.22;   // reference: black until 0.22 s
const AV_BOX_END = 2.35;     // reference: full height at 2.35 s

function avBoxNum(x, fallback) {
  const n = typeof x === "number" ? x : Number(x);
  return x !== null && x !== undefined && x !== "" && isFinite(n) ? n : fallback;
}

// data -> { enabled, start, end, visible }: seconds with end >= start >= 0, and visible in (0, 1] (1 when unset).
function avBoxTimes(data) {
  const d = data || {};
  const start = Math.max(0, avBoxNum(d.revealStart, AV_BOX_START));
  const secs = avBoxNum(d.revealSeconds, NaN);
  const end = isFinite(secs) ? start + Math.max(0, secs) : Math.max(start, avBoxNum(d.revealEnd, AV_BOX_END));
  const v = avBoxNum(d.visible, 1);
  return { enabled: d.enabled !== false, start, end, visible: v > 0.01 && v < 1 ? v : 1 };
}

// The band's height as a fraction of the frame (0 = all black, 1 = the whole picture) at t seconds: 0 up to start,
// linear to 1 at end, 1 after. A zero-length reveal cuts straight from black to the full picture at start.
function avBoxBand(t, start, end) {
  const x = Number(t);
  if (!isFinite(x) || x < start) return 0;
  if (!(end > start)) return 1;
  return Math.max(0, Math.min(1, (x - start) / (end - start)));
}

// The CSS clip-path for a band fraction of the CANVAS: inset from the top and the bottom by half the hidden height
// each, in % of the clip's own box. The effect draws in the source's box before the cover crop, of which the canvas
// shows only the centred `visible` fraction of the height (assemble.js scales a taller source up to cover 16:9), so a
// canvas band b is b * visible of the box: the band the viewer sees opens linearly from black to the full frame, as on
// a 16:9 source.
function avBoxInset(band, visible) {
  const v = typeof visible === "number" && visible > 0 && visible < 1 ? visible : 1;
  const edge = Math.max(0, Math.min(1, 1 - Math.max(0, Math.min(1, band)) * v)) * 50;
  return `inset(${edge.toFixed(4)}% 0% ${edge.toFixed(4)}% 0%)`;
}
// av-box:end

export default function LetterboxReveal({ Source, children, data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clip = Source ? <Source /> : children;
  const times = avBoxTimes(data);
  const band = times.enabled ? avBoxBand(frame / (fps > 0 ? fps : 30), times.start, times.end) : 1;
  // One tree shape for the whole clip (only the style changes), so the Source is never remounted when the band
  // finishes opening. The clip keeps playing under the mask, so the reveal shows it already in motion.
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ clipPath: band < 1 ? avBoxInset(band, times.visible) : undefined }}>{clip}</AbsoluteFill>
    </AbsoluteFill>
  );
}
