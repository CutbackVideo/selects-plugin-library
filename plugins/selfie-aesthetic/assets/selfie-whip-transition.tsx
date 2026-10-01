// Selfie Aesthetic Edit whip transition: the native addTransition alternative to the per-clip whip (A/B on
// Staging). Both clips render during the transition; the exiting one whips out along the cut's angle with the
// tail-side maths (amount rising with progress), the entering one arrives from behind with the head-side maths
// (amount falling) and fades in on top, so the two layers mix.
// data: kind ('dir' | 'spin', default 'dir'), angle (deg), strength (0-1.5, default 1), whip (global multiplier,
// default 1), cover (native cover-crop scale; translations are divided by it).
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

// sae-whip:start
// Pure maths shared by selfie-whip-look.tsx and selfie-whip-transition.tsx (kept byte-identical; a test checks it).
// saeWhipAt returns the whip pose of one frame: amount (0-1 ramp toward the cut), side ('in' = head, 'out' = tail,
// null = untouched), blurX / blurY (gaussian stdDeviation along / across the cut angle, in percent of the frame
// width), angleDeg, txPct / tyPct (CSS translate percentages of the frame box, divided by cover), rotDeg and scale.
// The outgoing clip moves forward along the angle and the incoming one arrives from behind, so the motion keeps one
// direction across the cut. The scale is at least the nominal zoom (1.08 dir / 1.12 spin at full amount) and
// never less than what keeps the frame covered after the slide, the spin and the blur's soft edge.
var SAE_WHIP_SECONDS = 0.067;
function saeNum(v, lo, hi, dflt) {
  var n = typeof v === "number" && isFinite(v) ? v : dflt;
  return Math.max(lo, Math.min(hi, n));
}
function saeWhipFrames(fps) {
  var f = typeof fps === "number" && fps > 0 ? fps : 30;
  return Math.max(1, Math.round(SAE_WHIP_SECONDS * f));
}
function saeWhipIdentity() {
  return { amount: 0, side: null, blurX: 0, blurY: 0, angleDeg: 0, txPct: 0, tyPct: 0, rotDeg: 0, scale: 1 };
}
// Linear ramp: 1.0 on the frame next to the cut, 0.6 on the farthest whip frame (w = 2: 1.0, 0.6).
function saeWhipRamp(dist, w) {
  return w <= 1 ? 1 : 1 - 0.4 * dist / (w - 1);
}
// The angle of one side's cut: angleIn for the head ('in'), angleOut for the tail ('out'), each falling back to
// angle. Both clips of a cut carry the same value (clip j angleOut = clip j + 1 angleIn), so the motion keeps its
// direction across the cut even though the sign alternates from cut to cut.
function saeSideAngle(side, d) {
  var v = side === "out" ? d.angleOut : d.angleIn;
  return typeof v === "number" && isFinite(v) ? v : d.angle;
}
// Pose for one side. amount is the ramp, str the side strength times the global multiplier.
function saeWhipPose(side, amount, str, kind, d) {
  var e = amount * str;
  if (!(e > 0)) return saeWhipIdentity();
  var W = typeof d.width === "number" && d.width > 0 ? d.width : 1080;
  var H = typeof d.height === "number" && d.height > 0 ? d.height : 1920;
  var k = typeof d.cover === "number" && d.cover > 1 ? d.cover : 1;
  var angleDeg = saeNum(saeSideAngle(side, d), -180, 180, 30);
  var th = angleDeg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
  var dir = side === "out" ? 1 : -1;
  var spin = kind === "spin";
  var blurX = 3.5 * e, blurY = 0.08 * blurX;
  var txPx = dir * 0.06 * W * e * c, tyPx = dir * 0.06 * W * e * s;
  var rotDeg = spin ? dir * (angleDeg < 0 ? -1 : 1) * 8 * e : 0;
  // Coverage: the blur fades the picture's own edges over ~2 sigma (mostly along the blur axis), so the opaque
  // part is the frame shrunk by that fringe; every window corner, mapped back through translate / rotate / scale,
  // must land inside it (cover = 1 is the worst case: the translation is largest relative to the window).
  var sx = blurX / 100 * W, sy = blurY / 100 * W;
  var fx = 2 * (sx * Math.abs(c) + sy * Math.abs(s)), fy = 2 * (sx * Math.abs(s) + sy * Math.abs(c));
  var hx = Math.max(1, W / 2 - fx), hy = Math.max(1, H / 2 - fy);
  var r = -rotDeg * Math.PI / 180, need = 1;
  for (var i = 0; i < 4; i++) {
    var ux = (i & 1 ? W / 2 : -W / 2) - txPx / k, uy = (i & 2 ? H / 2 : -H / 2) - tyPx / k;
    var px = ux * Math.cos(r) - uy * Math.sin(r), py = ux * Math.sin(r) + uy * Math.cos(r);
    need = Math.max(need, Math.abs(px) / hx, Math.abs(py) / hy);
  }
  var nominal = 1 + (spin ? 0.12 : 0.08) * e;
  return {
    amount: amount, side: side, blurX: blurX, blurY: blurY, angleDeg: angleDeg,
    txPct: txPx / W * 100 / k, tyPct: tyPx / H * 100 / k, rotDeg: rotDeg,
    scale: Math.max(nominal, need * 1.002),
  };
}
function saeSideStrength(kind, strength, g) {
  if (kind !== "dir" && kind !== "spin") return 0;
  return saeNum(strength, 0, 1.5, 1) * g;
}
// d also accepts width / height (the frame size in px, default 1080 x 1920) so the slide follows the angle in pixels.
function saeWhipAt(frame, durFrames, fps, d) {
  d = d || {};
  var dur = Math.floor(Number(durFrames) || 0), f = Math.floor(Number(frame));
  if (!(dur > 0) || !(f >= 0) || f >= dur) return saeWhipIdentity();
  var g = saeNum(d.whip, 0, 1.5, 1);
  var sIn = saeSideStrength(d.kindIn, d.whipIn, g), sOut = saeSideStrength(d.kindOut, d.whipOut, g);
  var w = saeWhipFrames(fps), wIn = sIn > 0 ? w : 0, wOut = sOut > 0 ? w : 0;
  if (wIn + wOut > dur) {
    if (wIn && wOut) {
      // Short clip: split it so the head and the tail never overlap; a 1-frame clip keeps the stronger side
      // (the tail on a tie, since it leads into the next cut).
      var half = Math.floor(dur / 2);
      if (half >= 1) { wIn = half; wOut = half; }
      else if (sOut >= sIn) { wIn = 0; wOut = 1; }
      else { wIn = 1; wOut = 0; }
    } else { wIn = Math.min(wIn, dur); wOut = Math.min(wOut, dur); }
  }
  if (f < wIn) return saeWhipPose("in", saeWhipRamp(f, wIn), sIn, d.kindIn, d);
  if (f >= dur - wOut) return saeWhipPose("out", saeWhipRamp(dur - 1 - f, wOut), sOut, d.kindOut, d);
  return saeWhipIdentity();
}
// Look presets as CSS filter functions (sepia, saturate, hue-rotate, contrast, brightness, in that order) plus an
// optional colour overlay; every parameter is interpolated from identity by strength (0-1).
// Soft glow (the reference): warm (mid-grey R/B ~1.42 at strength 1), highlights rolled off (white ~214/255),
// rose-lifted blacks. Night glam: deeper blacks, magenta/pink cast. Clean: near-neutral with mild warmth.
var SAE_LOOKS = {
  "soft-glow": { sepia: 0.85, saturate: 1.1, hue: -3, contrast: 0.95, brightness: 0.86, overlay: { color: "#ff7a9a", blend: "lighten", opacity: 0.045 } },
  "night-glam": { sepia: 0.35, saturate: 1.15, hue: -48, contrast: 1.12, brightness: 0.92, overlay: { color: "#ff4fa3", blend: "screen", opacity: 0.05 } },
  "clean": { sepia: 0.15, saturate: 1.04, hue: 0, contrast: 0.98, brightness: 1, overlay: null },
};
function saeLookFilter(look, strength) {
  var p = SAE_LOOKS[look];
  var t = saeNum(strength, 0, 1, 0.35);
  if (!p || t === 0) return { filter: "", overlay: null };
  var lerp = function (to) { return 1 + (to - 1) * t; };
  var filter = "sepia(" + (p.sepia * t).toFixed(3) + ") saturate(" + lerp(p.saturate).toFixed(3) + ") hue-rotate(" +
    (p.hue * t).toFixed(2) + "deg) contrast(" + lerp(p.contrast).toFixed(3) + ") brightness(" + lerp(p.brightness).toFixed(3) + ")";
  var overlay = p.overlay ? { color: p.overlay.color, blend: p.overlay.blend, opacity: Number((p.overlay.opacity * t).toFixed(4)) } : null;
  return { filter: filter, overlay: overlay };
}
// sae-whip:end

let saeIdCounter = 0;
const saeHasUseId = typeof React.useId === "function";
function useSaeFilterId(seed) {
  const fallback = React.useRef(null);
  const rid = saeHasUseId ? React.useId() : null;
  if (rid) return "sae-whipt-" + String(rid).replace(/[^a-zA-Z0-9_-]/g, "");
  if (fallback.current === null) fallback.current = "sae-whipt-" + String(seed || "x").replace(/[^a-zA-Z0-9_-]/g, "") + "-" + (++saeIdCounter);
  return fallback.current;
}

// Pose of one layer at progress p (0-1). The exiting layer ramps up over the first half, the entering one ramps
// down over the second half; the entering layer's opacity crosses from 0 to 1 over the middle half.
export function saeWhipTransitionPose(direction, p, data, width, height) {
  const d = data || {};
  const kind = d.kind === "spin" ? "spin" : "dir";
  const q = Math.max(0, Math.min(1, Number(p) || 0));
  const str = saeNum(d.strength, 0, 1.5, 1) * saeNum(d.whip, 0, 1.5, 1);
  const pose = { angle: d.angle, cover: d.cover, width, height };
  if (direction === "exiting") {
    const a = Math.min(1, 2 * q);
    return { m: saeWhipPose("out", a, str, kind, pose), opacity: 1 };
  }
  const a = Math.min(1, 2 * (1 - q));
  return { m: saeWhipPose("in", a, str, kind, pose), opacity: Math.max(0, Math.min(1, (q - 0.25) / 0.5)) };
}

export default function SelfieWhipTransition({ children, presentationDirection, presentationProgress, data }) {
  const { width, height } = useVideoConfig();
  const fid = useSaeFilterId(String(presentationDirection) + String(data?.angle ?? ""));
  const { m, opacity } = saeWhipTransitionPose(presentationDirection, presentationProgress, data, width, height);
  if (!(m.amount > 0)) return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
  const transform = `translate(${m.txPct.toFixed(3)}%, ${m.tyPct.toFixed(3)}%) rotate(${m.rotDeg.toFixed(3)}deg) scale(${m.scale.toFixed(4)})`;
  const bx = (m.blurX / 100) * width, by = (m.blurY / 100) * width;
  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform, transformOrigin: "50% 50%" }}>
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
            </filter>
          </defs>
        </svg>
        <div style={{ position: "absolute", left: "-75%", top: "-75%", width: "250%", height: "250%", transform: `rotate(${m.angleDeg.toFixed(3)}deg)`, transformOrigin: "50% 50%", filter: `url(#${fid})`, overflow: "visible" }}>
          <div style={{ position: "absolute", left: "30%", top: "30%", width: "40%", height: "40%", transform: `rotate(${(-m.angleDeg).toFixed(3)}deg)`, transformOrigin: "50% 50%", overflow: "hidden" }}>
            {children}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
