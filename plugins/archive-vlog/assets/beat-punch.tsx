// Archive Vlog beat punch: on strong beats the picture scales 1.00 -> 1.06 (ease-out over a quarter beat) and settles
// back by half a beat; a video clip without a punch in it gets a slow 1.00 -> 1.03 push-in across the clip instead.
// data: strength (0-1, default 1; 0 turns the whole effect off), push (0-1, default 1), punches (clip-local frames
// where a punch starts; may be slightly negative for a punch that began just before the cut), beatFrames (one beat in
// Draft frames, may be fractional), sourceStartFrame (the clip's source in-point in Draft frames) and durationFrames.
// The scale is about the centre and never below 1, so it composes with Soft look and never reveals the frame's edges.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// av-punch:start
const AV_PUNCH_PEAK = 0.06;   // extra scale at the top of a punch, at strength 1
const AV_PUNCH_PUSH = 0.03;   // extra scale at the end of a push-in, at push 1 and strength 1
const AV_PUNCH_RISE = 0.25;   // beats from the punch start to its peak
const AV_PUNCH_FALL = 0.5;    // beats from the punch start until it is back at 1

function avPunchUnit(x) {
  const n = Number(x);
  return isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

// A clip effect's useCurrentFrame() starts at the clip's source time (where the effect was authored), not at 0, so the
// clip-local frame is frame - sourceStartFrame. A frame before the source start can only mean the host counted from 0
// after all; that frame is used as is.
function avPunchLocal(frame, sourceStartFrame) {
  const s = Number(sourceStartFrame);
  const local = isFinite(s) ? frame - s : frame;
  return local < 0 ? frame : local;
}

// Scale at clip-local `frame` (may be fractional). params: { strength, push, punches, beatFrames, durationFrames }.
// A punch: ease-out (quadratic) up to the peak at AV_PUNCH_RISE beats, then ease-in-out back to 1 at AV_PUNCH_FALL
// beats; overlapping punches take the larger. The push-in runs only on a clip with no punches: linear from 1 at the
// first frame to 1 + AV_PUNCH_PUSH * push at the last, scaled by strength as well so strength 0 is identity.
function avPunchScale(frame, params) {
  const p = params || {};
  const strength = avPunchUnit(p.strength), push = avPunchUnit(p.push);
  const f = Number(frame);
  if (strength === 0 || !isFinite(f)) return 1;
  const beat = Number(p.beatFrames);
  const punches = Array.isArray(p.punches) ? p.punches.map(Number).filter(x => isFinite(x)) : [];
  let extra = 0;
  if (punches.length) {
    if (!(beat > 0)) return 1;
    const rise = AV_PUNCH_RISE * beat, fall = (AV_PUNCH_FALL - AV_PUNCH_RISE) * beat;
    for (const start of punches) {
      const t = f - start;
      let e = 0;
      if (t >= 0 && t <= rise) { const u = t / rise; e = 1 - (1 - u) * (1 - u); }
      else if (t > rise && t < rise + fall) { const v = (t - rise) / fall; e = 1 - (0.5 - Math.cos(Math.PI * v) / 2); }
      extra = Math.max(extra, AV_PUNCH_PEAK * strength * e);
    }
  } else {
    const dur = Number(p.durationFrames);
    if (dur > 1) extra = AV_PUNCH_PUSH * push * strength * Math.max(0, Math.min(1, f / (dur - 1)));
  }
  return 1 + Math.max(0, extra);
}
// av-punch:end

export default function BeatPunch({ Source, children, data }) {
  const frame = useCurrentFrame();
  const params = {
    strength: typeof data?.strength === "number" ? data.strength : 1,
    push: typeof data?.push === "number" ? data.push : 1,
    punches: Array.isArray(data?.punches) ? data.punches : [],
    beatFrames: data?.beatFrames,
    durationFrames: data?.durationFrames,
  };
  const scale = avPunchScale(avPunchLocal(frame, data?.sourceStartFrame), params);
  return <AbsoluteFill style={{ transform: `scale(${scale.toFixed(5)})`, transformOrigin: "50% 50%" }}>{Source ? <Source /> : children}</AbsoluteFill>;
}
