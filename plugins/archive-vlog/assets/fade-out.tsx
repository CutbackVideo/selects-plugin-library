// Archive Vlog fade out (spec §3): the last clip fades linearly to black over its last fadeSeconds, fully black on
// its last frame. data: durationFrames (the clip's length in Draft frames, set by decorate), fadeSeconds (default 1;
// 0 turns the fade off). useCurrentFrame() is 0 at the clip's first timeline frame (measured live) and fps is the
// sequence (Draft) fps, the same frames durationFrames counts. The black covers the clip's own box, so it works on a
// photo clip as well.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// av-fade:start
const AV_FADE_SECONDS = 1;

// Black opacity (0-1) at clip-local `frame`. The fade spans the last fadeFrames frames (may be fractional): 0 at frame
// durationFrames - fadeFrames, rising linearly to 1 at the last frame (durationFrames - 1), 1 after it. A fade longer
// than the clip starts at the clip's first frame. Missing or bad numbers give 0 (no fade).
function avFadeAlpha(frame, durationFrames, fadeFrames) {
  const f = Number(frame), dur = Number(durationFrames);
  let n = Number(fadeFrames);
  if (!isFinite(f) || !(dur > 0) || !(n > 0)) return 0;
  n = Math.min(n, dur);
  const start = dur - n;
  if (n <= 1) return f >= dur - 1 ? 1 : 0;
  return Math.max(0, Math.min(1, (f - start) / (n - 1)));
}

// fadeSeconds from data (default 1, never negative).
function avFadeSeconds(data) {
  const v = data && data.fadeSeconds;
  const n = typeof v === "number" ? v : Number(v);
  return v !== null && v !== undefined && v !== "" && isFinite(n) ? Math.max(0, n) : AV_FADE_SECONDS;
}
// av-fade:end

export default function FadeOut({ Source, children, data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clip = Source ? <Source /> : children;
  const alpha = avFadeAlpha(frame, data?.durationFrames, avFadeSeconds(data) * (fps > 0 ? fps : 30));
  if (alpha <= 0) return <AbsoluteFill>{clip}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      {clip}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: Number(alpha.toFixed(4)) }} />
    </AbsoluteFill>
  );
}
