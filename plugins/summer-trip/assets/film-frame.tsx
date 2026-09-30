// Summer Trip "Film frame" (ending clips): the picture inside a canvas-fixed rounded window (87% x 84% of the canvas,
// centred, radius 2% of the canvas height, feathered edge, slight RGB fringe) on black. Light leaks are drawn inside the
// window only: the opening wash with a red band on the right (leakInSeconds, first ending clip) and red/orange drifting
// pulses. fadeOutFrames fades the whole frame to black at the clip's end. Ending photos move INSIDE the window (motion),
// so the window and the black surround never move.
//
// Layout is in % of the clip's own box (effects render in the clip's conformed box; useVideoConfig() width/height are
// the sequence's and are not used). canvasInBox is the canvas rectangle in % of that box (effects-geometry.cjs
// stCanvasInBox), so portrait, photo and landscape clips all get the same window on the canvas. Everything inside the
// canvas rectangle is drawn in 1920x1080 canvas units.
// data: canvasInBox { x, y, w, h }, windowW (0.87), windowH (0.84), radius (0.02 of H), feather (0.012 of H), fringe (0-2,
// default 1), leakInSeconds (0), pulses [{ at, dur, kind? }] (centre and full width, in local
// seconds; a pulse straddling a cut is given to both clips; kind 'flare' = the warm end flare), leakStrength (0-2,
// default 1),
// fadeOutFrames (0), clipSeconds, motion (null | { motion, direction, axis, strength }), sourceStartSeconds, timeOrigin.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// Copied byte for byte from photo-motion.tsx (tests/effects.test.cjs checks it).
// st-motion:start
// Returns { scale, x, y, rotate } for progress p (0-1): x/y in percent of the frame, rotate in degrees.
// Translations are divided by `cover` so they stay inside the photo whether the clip's cover-crop scale is applied
// before or after this effect; the scale always leaves more overhang than the translation uses.
function stMotionTransform(motion, p, strength, direction, axis, width, height, cover) {
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
// st-motion:end

// st-frame:start
const ST_FRAME_W = 1920, ST_FRAME_H = 1080;

function stFrameNum(v, d, lo, hi) {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  const x = isFinite(n) ? n : d;
  return Math.max(lo, Math.min(hi, x));
}

function stFrameParams(data) {
  const d = data && typeof data === "object" ? data : {};
  const c = d.canvasInBox && typeof d.canvasInBox === "object" ? d.canvasInBox : {};
  const clip = stFrameNum(d.clipSeconds, 0, 0, 1e6);
  const pulses = Array.isArray(d.pulses)
    ? d.pulses.filter(q => q && typeof q === "object" && isFinite(Number(q.at)))
      .map(q => (q.kind === "flare" ? { at: Number(q.at), dur: stFrameNum(q.dur, 0.4, 0.05, 10), kind: "flare" } : { at: Number(q.at), dur: stFrameNum(q.dur, 0.4, 0.05, 10) }))
    : [];
  const m = d.motion && typeof d.motion === "object" && typeof d.motion.motion === "string" ? d.motion : null;
  return {
    canvasInBox: { x: stFrameNum(c.x, 0, -1e4, 1e4), y: stFrameNum(c.y, 0, -1e4, 1e4), w: stFrameNum(c.w, 100, 1e-3, 1e4), h: stFrameNum(c.h, 100, 1e-3, 1e4) },
    windowW: stFrameNum(d.windowW, 0.87, 0.1, 1),
    windowH: stFrameNum(d.windowH, 0.84, 0.1, 1),
    radius: stFrameNum(d.radius, 0.02, 0, 0.5),
    feather: stFrameNum(d.feather, 0.012, 0, 0.2),
    fringe: stFrameNum(d.fringe, 1, 0, 2),
    leakInSeconds: stFrameNum(d.leakInSeconds, 0, 0, 60),
    pulses,
    leakStrength: stFrameNum(d.leakStrength, 1, 0, 2),
    fadeOutFrames: Math.round(stFrameNum(d.fadeOutFrames, 0, 0, 1e5)),
    clipSeconds: clip > 0 ? clip : null,
    motion: m ? { motion: m.motion, direction: m.direction === -1 ? -1 : 1, axis: m.axis === "y" ? "y" : "x", strength: stFrameNum(m.strength, 1, 0, 2) } : null,
    sourceStartSeconds: stFrameNum(d.sourceStartSeconds, 0, -1e6, 1e6),
    timeOrigin: d.timeOrigin === "source" ? "source" : "clip",
  };
}

function stFrameTime(frame, fps, p) {
  const f = Number(fps) > 0 ? Number(fps) : 30;
  return (Number(frame) || 0) / f - (p.timeOrigin === "source" ? p.sourceStartSeconds : 0);
}

// The window in canvas pixels: { x, y, w, h, r, blur }.
function stFrameWindow(p) {
  const w = ST_FRAME_W * p.windowW, h = ST_FRAME_H * p.windowH;
  return { x: (ST_FRAME_W - w) / 2, y: (ST_FRAME_H - h) / 2, w, h, r: p.radius * ST_FRAME_H, blur: p.feather * ST_FRAME_H };
}

// Rounded rectangle path (clockwise) in canvas pixels.
function stFrameRoundRect(x, y, w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  const f = v => Math.round(v * 100) / 100;
  return `M${f(x + k)} ${f(y)}H${f(x + w - k)}A${f(k)} ${f(k)} 0 0 1 ${f(x + w)} ${f(y + k)}V${f(y + h - k)}A${f(k)} ${f(k)} 0 0 1 ${f(x + w - k)} ${f(y + h)}H${f(x + k)}A${f(k)} ${f(k)} 0 0 1 ${f(x)} ${f(y + h - k)}V${f(y + k)}A${f(k)} ${f(k)} 0 0 1 ${f(x + k)} ${f(y)}Z`;
}

// The black surround with a rounded hole; blurred, it gives the feathered, inward-darkening edge of the reference.
function stFrameOverlayPath(p) {
  const win = stFrameWindow(p);
  const m = 400;
  return `M${-m} ${-m}H${ST_FRAME_W + m}V${ST_FRAME_H + m}H${-m}Z` + stFrameRoundRect(win.x, win.y, win.w, win.h, win.r);
}

// Picture transform for ending photos: the CWV move measured in canvas units, about the canvas centre, converted to
// % of the clip's box so the window (canvas-fixed) never moves.
function stFrameMotionCss(p, t) {
  if (!p.motion || !(p.clipSeconds > 0)) return null;
  const c = p.canvasInBox;
  const m = stMotionTransform(p.motion.motion, t / p.clipSeconds, p.motion.strength, p.motion.direction, p.motion.axis, ST_FRAME_W, ST_FRAME_H, 1);
  const x = m.x * c.w / 100, y = m.y * c.h / 100;
  return {
    transform: `translate(${x.toFixed(3)}%, ${y.toFixed(3)}%) rotate(${m.rotate.toFixed(3)}deg) scale(${m.scale.toFixed(4)})`,
    transformOrigin: `${(c.x + c.w / 2).toFixed(3)}% ${(c.y + c.h / 2).toFixed(3)}%`,
  };
}

// Leak layers at local time t, laid out in % of the canvas rectangle (screen-blended over the picture, under the
// black surround, so they only show inside the window).
function stFrameLeakLayers(p, t) {
  const k = p.leakStrength;
  const out = [];
  if (!(k > 0)) return out;
  const a = v => Math.max(0, Math.min(1, v)).toFixed(3);
  if (p.leakInSeconds > 0 && t >= -1e-9 && t < p.leakInSeconds) {
    // Opening wash (reference f519-523): the window starts as a bright warm orange/amber wash (the picture still shows
    // through: never a near-white frame), turns orange while it clears from the left, and a red band sweeps from the
    // right side toward the middle, narrowing, then fades.
    const u = Math.max(0, Math.min(1, t / p.leakInSeconds));
    const e = u * u * (3 - 2 * u);
    const wash = Math.min(1, Math.pow(1 - e, 2.2) * k);
    out.push({
      key: "leak-in-wash",
      background: `linear-gradient(90deg, rgba(255,190,105,${a(0.6 * wash)}) 0%, rgba(255,200,120,${a(0.7 * wash)}) 55%, rgba(255,185,100,${a(0.7 * wash)}) 100%)`,
      mixBlendMode: "screen",
    });
    const tint = Math.min(1, Math.sin(Math.PI * Math.min(1, 0.35 + 0.65 * u)) * k);
    out.push({
      key: "leak-in-tint",
      background: `linear-gradient(90deg, rgba(255,140,50,${a(0.55 * tint)}) 0%, rgba(255,110,40,${a(0.8 * tint)}) 60%, rgba(255,90,40,${a(0.85 * tint)}) 100%)`,
      mixBlendMode: "overlay",
    });
    const band = Math.min(1, Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + 0.9 * u)), 0.5) * k);
    const bx = 80 - 35 * e;
    out.push({
      key: "leak-in-band",
      background: `radial-gradient(ellipse ${(26 - 14 * e).toFixed(1)}% 85% at ${bx.toFixed(1)}% 55%, rgba(255,70,40,${a(0.9 * band)}) 0%, rgba(240,40,40,${a(0.55 * band)}) 50%, rgba(200,20,40,0) 100%)`,
      mixBlendMode: "screen",
    });
  }
  p.pulses.forEach((q, i) => {
    const u = (t - q.at) / q.dur + 0.5; // `at` is the pulse centre, `dur` its full width
    if (!(u >= 0 && u <= 1)) return;
    const env = Math.min(1, Math.pow(Math.sin(Math.PI * u), 1.5) * k);
    if (q.kind === "flare") {
      // Warm end flare (reference ~20 s): a soft orange/amber glow rising from the lower left over the last shot, so
      // the final hold is not a clean dark picture. Screen-blended orange (never white) plus a light amber overlay.
      const fx = 18 + 20 * u, fy = 78 - 16 * u;
      out.push({
        key: "flare-" + i,
        background: `radial-gradient(ellipse 70% 80% at ${fx.toFixed(1)}% ${fy.toFixed(1)}%, rgba(255,150,70,${a(0.7 * env)}) 0%, rgba(255,120,55,${a(0.4 * env)}) 45%, rgba(255,100,50,0) 100%)`,
        mixBlendMode: "screen",
      });
      out.push({
        key: "flare-tint-" + i,
        background: `linear-gradient(30deg, rgba(255,140,60,${a(0.55 * env)}) 0%, rgba(255,170,90,${a(0.3 * env)}) 60%, rgba(255,170,90,0) 100%)`,
        mixBlendMode: "overlay",
      });
      return;
    }
    // Shape by timing: a pulse that touches a cut (reference f548 sits on the 2nd ending cut) is the small edge flare;
    // one fully inside the clip (reference f600) is the broad wash. Decorate gives each clip one pulse, so the array
    // index cannot choose the shape.
    const onCut = q.at - q.dur / 2 <= 0 || (p.clipSeconds > 0 && q.at + q.dur / 2 >= p.clipSeconds);
    if (onCut || !(p.clipSeconds > 0)) {
      // Small red flare at the right edge, drifting down (reference ~f548).
      const cy = 22 + 16 * u;
      out.push({
        key: "pulse-" + i,
        background: `radial-gradient(ellipse 12% 26% at 97% ${cy.toFixed(1)}%, rgba(255,70,40,${a(0.95 * env)}) 0%, rgba(230,40,50,${a(0.55 * env)}) 50%, rgba(200,20,40,0) 100%), radial-gradient(ellipse 28% 40% at 96% ${(cy + 6).toFixed(1)}%, rgba(255,130,60,${a(0.35 * env)}) 0%, rgba(255,110,50,0) 100%)`,
        mixBlendMode: "screen",
      });
    } else {
      // Broad red/magenta diagonal over the lower right, drifting left (reference ~f600).
      const cx = 66 - 14 * u;
      out.push({
        key: "pulse-" + i,
        background: `radial-gradient(ellipse 60% 50% at ${cx.toFixed(1)}% 80%, rgba(235,50,55,${a(0.85 * env)}) 0%, rgba(220,40,60,${a(0.5 * env)}) 45%, rgba(200,30,60,0) 100%), linear-gradient(150deg, rgba(255,90,40,0) 30%, rgba(255,90,50,${a(0.35 * env)}) 70%, rgba(255,90,40,0) 100%)`,
        mixBlendMode: "screen",
      });
    }
  });
  return out;
}

// Fade-to-black opacity: 0 before the last fadeOutFrames frames, reaching 1 on the clip's last frame.
function stFrameFade(p, t, fps) {
  if (!(p.fadeOutFrames > 0) || !(p.clipSeconds > 0)) return 0;
  const f = Number(fps) > 0 ? Number(fps) : 30;
  const total = Math.round(p.clipSeconds * f);
  const local = Math.round(t * f);
  return Math.max(0, Math.min(1, (local - (total - p.fadeOutFrames) + 1) / p.fadeOutFrames));
}
// st-frame:end

export default function FilmFrame({ Source, children, data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig(); // fps only: width/height are the sequence's, not this clip's box
  const p = stFrameParams(data);
  const t = stFrameTime(frame, fps, p);
  const c = p.canvasInBox;
  const win = stFrameWindow(p);
  const motion = stFrameMotionCss(p, t);
  const leaks = stFrameLeakLayers(p, t);
  const fade = stFrameFade(p, t, fps);
  const canvasBox = { position: "absolute", left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%`, pointerEvents: "none" };
  const inset = `inset(${c.y}% ${100 - c.x - c.w}% ${100 - c.y - c.h}% ${c.x}%)`;
  const blurId = "st-film-feather-" + Math.round(win.blur * 100);
  const fringeId = "st-film-fringe-" + Math.round(win.blur * 100);
  const rr = stFrameRoundRect(win.x, win.y, win.w, win.h, win.r);
  const fr = Math.max(1, win.blur * 0.25) * p.fringe;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden", isolation: "isolate" }}>
      <AbsoluteFill style={{ clipPath: inset }}>
        <AbsoluteFill style={motion || undefined}>{Source ? <Source /> : children}</AbsoluteFill>
        {leaks.length ? (
          <div style={canvasBox}>
            {leaks.map(l => (
              <div key={l.key} style={{ position: "absolute", inset: 0, background: l.background, mixBlendMode: l.mixBlendMode }} />
            ))}
          </div>
        ) : null}
      </AbsoluteFill>
      <div style={canvasBox}>
        <svg viewBox={`0 0 ${ST_FRAME_W} ${ST_FRAME_H}`} preserveAspectRatio="none" width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <filter id={blurId} filterUnits="userSpaceOnUse" x={-400} y={-400} width={ST_FRAME_W + 800} height={ST_FRAME_H + 800}>
              <feGaussianBlur stdDeviation={Math.max(0.01, win.blur)} />
            </filter>
          </defs>
          <path d={stFrameOverlayPath(p)} fill="#000" fillRule="evenodd" filter={win.blur > 0 ? `url(#${blurId})` : undefined} />
        </svg>
        {p.fringe > 0 ? (
          <svg viewBox={`0 0 ${ST_FRAME_W} ${ST_FRAME_H}`} preserveAspectRatio="none" width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible", mixBlendMode: "screen", opacity: Math.min(1, 0.3 * p.fringe) }}>
            <defs>
              <filter id={fringeId} filterUnits="userSpaceOnUse" x={-100} y={-100} width={ST_FRAME_W + 200} height={ST_FRAME_H + 200}>
                <feGaussianBlur stdDeviation={Math.max(0.5, win.blur * 0.5)} />
              </filter>
            </defs>
            <g filter={`url(#${fringeId})`} fill="none" strokeWidth={Math.max(1, win.blur * 0.35)}>
              <path d={rr} stroke="rgb(255,70,40)" transform={`translate(${fr.toFixed(2)} ${(fr * 0.4).toFixed(2)})`} />
              <path d={rr} stroke="rgb(40,160,255)" transform={`translate(${(-fr).toFixed(2)} ${(-fr * 0.4).toFixed(2)})`} />
            </g>
          </svg>
        ) : null}
      </div>
      {fade > 0 ? <AbsoluteFill style={{ backgroundColor: "#000", opacity: fade }} /> : null}
    </AbsoluteFill>
  );
}
