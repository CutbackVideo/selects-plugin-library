// THE END Credits "Shot frame": a black frame with the shot inside a 16:9 window, plus photo motion and the fades.
// The effect renders in the clip's own conformed box, in the source's pixel space; the video config reports the
// sequence size there, so everything is laid out in % of the AbsoluteFill. The build scales non-16:9 clips by
// cover = max(A/a, a/A) (native transform), so only the box's centre rect ("visible rect") is on the canvas.
// data: x, y, w (window, % of the canvas), srcAspect, fps, durationFrames, originFrame, fadeInSeconds,
// fadeOutSeconds, motion, strength (0-2), direction (1 | -1), axis ("x" | "y").
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// tec-frame:start
const TEC_CANVAS_ASPECT = 16 / 9;
// A 0.2 % overscale so the Source's edges never land exactly on the window's edges (no hairline at any aspect).
const TEC_FRAME_HAIR = 1.002;
// Motion strength inside the window is 0.6 of City Weekend Vlog's, because the shot sits in a small window.
const TEC_MOTION_SCALE = 0.6;

function tecNum(v, fallback) {
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) ? n : fallback;
}

// The part of the effect box that is on the 16:9 canvas, in % of the box: { x, y, w, h }.
function tecVisibleRect(srcAspect) {
  const A = TEC_CANVAS_ASPECT;
  const a = tecNum(srcAspect, A) > 0 ? tecNum(srcAspect, A) : A;
  if (a < A) { const h = 100 * a / A; return { x: 0, y: (100 - h) / 2, w: 100, h }; }
  const w = 100 * A / a;
  return { x: (100 - w) / 2, y: 0, w, h: 100 };
}

// The window { left, top, width, height } in % of the box, from x, y, w in % of the canvas (height = w on 16:9).
function tecWindowRect(vis, x, y, w) {
  const X = Math.max(0, Math.min(100, tecNum(x, 50.73)));
  const Y = Math.max(0, Math.min(100, tecNum(y, 12.69)));
  const W = Math.max(1, Math.min(100, tecNum(w, 42.6)));
  return { left: vis.x + vis.w * X / 100, top: vis.y + vis.h * Y / 100, width: vis.w * W / 100, height: vis.h * W / 100 };
}

// CWV photo motion maths in window space: { scale, x, y, rotate }, x/y in % of the window, rotate in degrees.
// The window is always 16:9; every move leaves more overhang than it uses, so the window stays covered.
function tecMotion(motion, p, strength, direction, axis) {
  const s = Math.max(0, Math.min(2, tecNum(strength, 1))) * TEC_MOTION_SCALE;
  const e = 0.5 - Math.cos(Math.PI * Math.max(0, Math.min(1, tecNum(p, 0)))) / 2;
  const dir = tecNum(direction, 1) === -1 ? -1 : 1;
  const out = { scale: 1, x: 0, y: 0, rotate: 0 };
  const push = 0.07 * s;
  if (motion === "push-in") out.scale = 1 + push * e;
  else if (motion === "pull-out") out.scale = 1 + push * (1 - e);
  else if (motion === "drift-left" || motion === "drift-right" || motion === "drift-up" || motion === "drift-down") {
    const a = 3 * s;
    out.scale = 1 + (2 * a + 2) / 100;
    const at = (motion === "drift-left" || motion === "drift-up" ? -1 : 1) * a * (2 * e - 1);
    if (motion === "drift-left" || motion === "drift-right") out.x = at; else out.y = at;
  } else if (motion === "tilt") {
    const deg = 2.5 * s * e * dir, r = Math.abs(deg) * Math.PI / 180;
    out.rotate = deg;
    out.scale = (Math.cos(r) + TEC_CANVAS_ASPECT * Math.sin(r)) * 1.003;
  } else if (motion === "push-drift") {
    out.scale = 1 + push * e;
    const at = dir * 2 * s * e;
    if (axis === "y") out.y = at; else out.x = at;
  }
  return out;
}

// The Source layer's transform: translate (tx, ty in % of the box) to the window centre, rotate, scale.
// k = w/100 * max(vw, vh)/100 makes the Source (the whole box) cover the window; the motion is applied around the
// window centre, its translations converted from % of the window to % of the box.
function tecSourceTransform(vis, win, m) {
  const mm = m || { scale: 1, x: 0, y: 0, rotate: 0 };
  const k = (win.width / vis.w) * Math.max(vis.w, vis.h) / 100;
  return {
    tx: win.left + win.width / 2 - 50 + mm.x * win.width / 100,
    ty: win.top + win.height / 2 - 50 + mm.y * win.height / 100,
    rotate: mm.rotate,
    scale: k * mm.scale * TEC_FRAME_HAIR,
  };
}

// The window opacity at local frame `local` (0 = the clip's first frame): a linear fade-in from 0 over
// fadeInSeconds and a linear fade-out that reaches 0 on the clip's last frame. 0 seconds = no fade.
function tecFadeOpacity(local, durationFrames, fps, fadeInSeconds, fadeOutSeconds) {
  const f = tecNum(local, 0), D = Math.max(1, tecNum(durationFrames, 1)), r = tecNum(fps, 30) > 0 ? tecNum(fps, 30) : 30;
  const fin = Math.max(0, tecNum(fadeInSeconds, 0)) * r, fout = Math.max(0, tecNum(fadeOutSeconds, 0)) * r;
  let o = 1;
  if (fin > 0) o = Math.min(o, f / fin);
  if (fout > 0) o = Math.min(o, (D - 1 - f) / fout);
  return Math.max(0, Math.min(1, o));
}
// tec-frame:end

export default function ShotFrame({ Source, children, data }) {
  const frame = useCurrentFrame();
  const d = data || {};
  const local = frame - tecNum(d.originFrame, 0);
  const D = Math.max(1, Math.round(tecNum(d.durationFrames, 1)));
  const vis = tecVisibleRect(d.srcAspect);
  const win = tecWindowRect(vis, d.x, d.y, d.w);
  const m = d.motion && d.motion !== "none" ? tecMotion(d.motion, local / Math.max(1, D - 1), d.strength, d.direction, d.axis) : null;
  const t = tecSourceTransform(vis, win, m);
  const opacity = tecFadeOpacity(local, D, d.fps, d.fadeInSeconds, d.fadeOutSeconds);
  const inset = `inset(${win.top}% ${100 - win.left - win.width}% ${100 - win.top - win.height}% ${win.left}%)`;
  const transform = `translate(${t.tx.toFixed(4)}%, ${t.ty.toFixed(4)}%) rotate(${t.rotate.toFixed(3)}deg) scale(${t.scale.toFixed(5)})`;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ clipPath: inset, opacity }}>
        <AbsoluteFill style={{ transform, transformOrigin: "50% 50%" }}>{Source ? <Source /> : children}</AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
