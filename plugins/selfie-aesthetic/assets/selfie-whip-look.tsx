// Selfie Aesthetic Edit "Selfie whip + look": one effect per clip that smears the first and last w frames of the clip
// into a whip-pan (directional blur along the cut's angle, a slide and, at bar changes, a spin), grades the picture
// with a look preset (Soft glow adds a static vignette), and frames photos (full cover or a punch-in toward the upper
// third) and face videos (tight).
// data: whipIn, whipOut (0-1.5, 0 = no whip on that side), kindIn, kindOut ('none' | 'dir' | 'spin'), angleIn /
// angleOut (deg: the angle of the head's and of the tail's cut, shared by both clips of a cut; each falls back to
// angle), whip (global multiplier, default 1), look ('soft-glow' | 'night-glam' | 'clean' | 'none'), lookStrength
// (0-1, default: the preset's strength, Soft glow 0.5, others 0.35), framing ('full' | 'punch' | 'tight' | null), cover (the clip's native cover-crop scale; translations
// are divided by it). Frame 0 is the clip's first timeline frame; its length is
// rangeDurationInFrames.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// sae-whip:start
// Pure maths shared by selfie-whip-look.tsx and selfie-whip-transition.tsx (kept byte-identical; a test checks it).
// saeWhipAt returns the whip pose of one frame: amount (0-1 ramp toward the cut), side ('in' = head, 'out' = tail,
// null = untouched), blurX / blurY (gaussian stdDeviation along / across the cut angle, in percent of the clip box
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
// Envelope in seconds, symmetric about the cut: a whip frame is strong (amount 1) while its centre lies within
// SAE_WHIP_CORE_SECONDS of the cut (always the frame next to the cut), else a faint shoulder of SAE_WHIP_SHOULDER.
// 25 / 30 fps (w = 2): 1.0 next to the cut, then the shoulder, so 2 strongly blurred frames per cut instead of 4.
// The shoulder stays below what eval-whips counts as strong blur (relative sharpness 0.3; ~0.15 already reads
// strong at 240 px), so the strong run is exactly the 2 frames around the cut and its centre stays on the cut.
var SAE_WHIP_CORE_SECONDS = 0.04;
var SAE_WHIP_SHOULDER = 0.07;
function saeWhipRamp(dist, w, fps) {
  if (!(dist > 0)) return 1;
  var f = typeof fps === "number" && fps > 0 ? fps : 30;
  return (dist + 0.5) / f <= SAE_WHIP_CORE_SECONDS + 1e-9 ? 1 : SAE_WHIP_SHOULDER;
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
  if (f < wIn) return saeWhipPose("in", saeWhipRamp(f, wIn, fps), sIn, d.kindIn, d);
  if (f >= dur - wOut) return saeWhipPose("out", saeWhipRamp(dur - 1 - f, wOut, fps), sOut, d.kindOut, d);
  return saeWhipIdentity();
}
// Look presets as CSS filter functions (sepia, saturate, hue-rotate, contrast, brightness, in that order) plus an
// optional colour overlay; every parameter is interpolated from identity by strength (0-1). Each preset carries its
// default strength (`strength`: what the panel sends and the fallback when lookStrength is missing).
// Soft glow (the reference's clear portraits), default 0.5: a neutral mid-grey turns rose-gold (R/B ~1.38, R/G
// ~1.17), white rolls off to ~230, black stays deep (<= 7, faintly rose) so dark hair stays rich; less sepia and
// more saturation than before so lips and skin keep their colour instead of fading to vintage brown; strength 1 is
// a strong version of the same. Night glam (default 0.35): deeper blacks, magenta/pink cast. Clean (default 0.35):
// near-neutral with mild warmth.
var SAE_LOOKS = {
  "soft-glow": { strength: 0.5, sepia: 1, saturate: 2.2, hue: -20, contrast: 0.95, brightness: 0.82, overlay: { color: "#ff7a9a", blend: "lighten", opacity: 0.03 }, vignette: 0.25 },
  "night-glam": { strength: 0.35, sepia: 0.35, saturate: 1.15, hue: -48, contrast: 1.12, brightness: 0.92, overlay: { color: "#ff4fa3", blend: "screen", opacity: 0.05 } },
  "clean": { strength: 0.35, sepia: 0.15, saturate: 1.04, hue: 0, contrast: 0.98, brightness: 1, overlay: null },
};
function saeLookFilter(look, strength) {
  var p = SAE_LOOKS[look];
  var t = saeNum(strength, 0, 1, p ? p.strength : 0.35);
  if (!p || t === 0) return { filter: "", overlay: null };
  var lerp = function (to) { return 1 + (to - 1) * t; };
  // CSS clamps sepia at 1; write the clamped value.
  var filter = "sepia(" + Math.min(1, p.sepia * t).toFixed(3) + ") saturate(" + lerp(p.saturate).toFixed(3) + ") hue-rotate(" +
    (p.hue * t).toFixed(2) + "deg) contrast(" + lerp(p.contrast).toFixed(3) + ") brightness(" + lerp(p.brightness).toFixed(3) + ")";
  var overlay = p.overlay ? { color: p.overlay.color, blend: p.overlay.blend, opacity: Number((p.overlay.opacity * t).toFixed(4)) } : null;
  return { filter: filter, overlay: overlay };
}
// Vignette (Soft glow only: the reference's darker surround around a lit face): a static radial gradient over the
// graded picture, transparent inside SAE_VIGNETTE_INNER of the way to the corner (the face area is untouched) and
// rising to the preset's `vignette` alpha (black) at SAE_VIGNETTE_OUTER, scaled by strength / the preset strength (so
// the default 0.5 gives the designed 0.25 at the corners, strength 1 twice that). The ellipse runs through the box
// corners (farthest-corner), and the full alpha already from SAE_VIGNETTE_OUTER on keeps the visible corners at the
// designed darkness under tight / punch framing (1.12-1.14x: they sit at ~0.86-0.89 of the way). A clip with
// cover > 1 shows less of its box, so its vignette is milder. Returns null (no layer) when it is off.
var SAE_VIGNETTE_INNER = 0.6;
var SAE_VIGNETTE_OUTER = 0.85;
function saeLookVignette(look, strength) {
  var p = SAE_LOOKS[look];
  if (!p || !p.vignette) return null;
  var t = saeNum(strength, 0, 1, p.strength);
  var alpha = Number((p.vignette * t / p.strength).toFixed(4));
  if (!(alpha > 0)) return null;
  var mid = (SAE_VIGNETTE_INNER + SAE_VIGNETTE_OUTER) / 2;
  return {
    alpha: alpha, inner: SAE_VIGNETTE_INNER, outer: SAE_VIGNETTE_OUTER,
    background: "radial-gradient(ellipse farthest-corner at 50% 50%, rgba(0,0,0,0) " + (SAE_VIGNETTE_INNER * 100).toFixed(1) +
      "%, rgba(0,0,0," + (alpha * 0.4).toFixed(4) + ") " + (mid * 100).toFixed(1) + "%, rgba(0,0,0," + alpha.toFixed(4) + ") " +
      (SAE_VIGNETTE_OUTER * 100).toFixed(1) + "%)",
  };
}
// The vignette's alpha at r (0 = centre, 1 = box corner along the farthest-corner ellipse), as the gradient above
// renders it (linear between its stops); for tests and stills.
function saeVignetteAlpha(v, r) {
  if (!v || !(r > v.inner)) return 0;
  var mid = (v.inner + v.outer) / 2;
  if (r >= v.outer) return v.alpha;
  if (r <= mid) return v.alpha * 0.4 * (r - v.inner) / (mid - v.inner);
  return v.alpha * (0.4 + 0.6 * (r - mid) / (v.outer - mid));
}
// The directional blur runs on a container rotated by the cut angle, SAE_BLUR_BOX % of the clip's box on both axes
// (centred), holding the upright picture counter-rotated inside. Effects render in the clip's own box (source pixel
// space), whose aspect can be anything from 9:16 to 16:9, so the size covers both: the frame counter-rotated by the
// largest planner angle (35 deg) spans cos 35 + sin 35 * 16 / 9 = 1.84 of the box on its long side -> 190%.
var SAE_BLUR_BOX = 190;
// stdDeviation of the blur in objectBoundingBox units of that container (fractions of its width / height), so it
// scales with the clip's own box instead of the sequence size. x: blurX % of the box width (exact, no size needed);
// y: blurY % of the box width, converted to the container height with `aspect` = box width / height (the caller
// passes the sequence aspect; approximate for other boxes, but blurY is only 8% of blurX).
function saeBlurStd(m, aspect) {
  var a = typeof aspect === "number" && aspect > 0 ? aspect : 9 / 16;
  var b = SAE_BLUR_BOX / 100;
  return { x: m.blurX / 100 / b, y: m.blurY / 100 * a / b };
}
// CSS box of the rotated blur container (SAE_BLUR_BOX % of the clip box, centred) and of the upright picture inside
// it (the clip box again, centred), as percentages of their parents.
function saeBlurLayout() {
  var b = SAE_BLUR_BOX;
  return { outerPos: (-(b - 100) / 2).toFixed(4) + "%", outerSize: b + "%",
    innerPos: ((b - 100) / 2 / b * 100).toFixed(4) + "%", innerSize: (100 * 100 / b).toFixed(4) + "%" };
}
// sae-whip:end

// Tight framing (data.framing 'tight'): zoom and the fixed point's height in the visible frame (0 = top).
const SAE_TIGHT_SCALE = 1.14;
const SAE_TIGHT_ANCHOR = 0.38;

// Unique SVG filter ids: React.useId when the runtime's React has it, else a per-instance module counter.
let saeIdCounter = 0;
const saeHasUseId = typeof React.useId === "function";
function useSaeFilterId(seed) {
  const fallback = React.useRef(null);
  const rid = saeHasUseId ? React.useId() : null;
  if (rid) return "sae-whip-" + String(rid).replace(/[^a-zA-Z0-9_-]/g, "");
  if (fallback.current === null) fallback.current = "sae-whip-" + String(seed || "x").replace(/[^a-zA-Z0-9_-]/g, "") + "-" + (++saeIdCounter);
  return fallback.current;
}


export default function SelfieWhipLook({ Source, children, data, rangeDurationInFrames, sequenceFps }) {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const d = data || {};
  const fid = useSaeFilterId(String(d.angleIn ?? d.angle ?? "") + String(d.angleOut ?? "") + String(d.kindIn ?? "") + String(d.kindOut ?? ""));
  const dur = Number(rangeDurationInFrames) > 0 ? Number(rangeDurationInFrames) : durationInFrames;
  const rate = Number(sequenceFps) > 0 ? Number(sequenceFps) : fps;
  const m = saeWhipAt(frame, dur, rate, { ...d, width, height });
  const look = saeLookFilter(d.look ?? "soft-glow", d.lookStrength);
  const vignette = saeLookVignette(d.look ?? "soft-glow", d.lookStrength);
  const k = Number(d.cover) > 1 ? Number(d.cover) : 1;

  // Photo framing: a punch-in 1.12x shifted 4% down so the upper third (faces) sits nearer the centre. Tight (face
  // video holds): a SAE_TIGHT_SCALE zoom about the point SAE_TIGHT_ANCHOR down the visible frame (where selfie faces
  // sit), so that point stays put and the face fills more of the frame; a scale >= 1 about a point inside the frame
  // never shows past the source edge. Translations are divided by cover (the visible part of the box).
  const punch = d.framing === "punch", tight = d.framing === "tight";
  const fs = punch ? 1.12 : tight ? SAE_TIGHT_SCALE : 1;
  const fty = punch ? 4 / k : tight ? (SAE_TIGHT_ANCHOR - 0.5) * (1 - SAE_TIGHT_SCALE) * 100 / k : 0;
  const tx = m.txPct, ty = m.tyPct + fty, sc = fs * m.scale;
  const transform = tx === 0 && ty === 0 && m.rotDeg === 0 && sc === 1
    ? undefined
    : `translate(${tx.toFixed(3)}%, ${ty.toFixed(3)}%) rotate(${m.rotDeg.toFixed(3)}deg) scale(${sc.toFixed(4)})`;

  const content = (
    <>
      <AbsoluteFill style={look.filter ? { filter: look.filter } : undefined}>{Source ? <Source /> : children}</AbsoluteFill>
      {look.overlay ? (
        <AbsoluteFill style={{ backgroundColor: look.overlay.color, mixBlendMode: look.overlay.blend, opacity: look.overlay.opacity, pointerEvents: "none" }} />
      ) : null}
      {vignette ? <AbsoluteFill style={{ backgroundImage: vignette.background, pointerEvents: "none" }} /> : null}
    </>
  );

  // One tree on every frame (same elements, same keys), so <Source /> never remounts at the whip edges: on plain
  // frames the blur filter stays defined but unused (filter "none", stdDeviation 0) and the container is unrotated.
  // Directional blur: a container rotated by the angle (SAE_BLUR_BOX % of the box, so the counter-rotated frame and
  // the filter region always cover the visible frame) blurs mostly along its x axis; the picture inside is
  // counter-rotated back upright.
  const blurOn = m.amount > 0;
  const sd = saeBlurStd(m, width / height), lay = saeBlurLayout();
  return (
    <AbsoluteFill style={{ transform, transformOrigin: "50% 50%" }}>
      <svg key="sae-defs" width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={fid} x="-20%" y="-20%" width="140%" height="140%" primitiveUnits="objectBoundingBox">
            <feGaussianBlur stdDeviation={blurOn ? `${sd.x.toFixed(6)} ${sd.y.toFixed(6)}` : "0 0"} />
          </filter>
        </defs>
      </svg>
      <div key="sae-blur" style={{ position: "absolute", left: lay.outerPos, top: lay.outerPos, width: lay.outerSize, height: lay.outerSize, transform: `rotate(${m.angleDeg.toFixed(3)}deg)`, transformOrigin: "50% 50%", filter: blurOn ? `url(#${fid})` : "none", overflow: "visible" }}>
        <div key="sae-upright" style={{ position: "absolute", left: lay.innerPos, top: lay.innerPos, width: lay.innerSize, height: lay.innerSize, transform: `rotate(${(-m.angleDeg).toFixed(3)}deg)`, transformOrigin: "50% 50%", overflow: "hidden", isolation: "isolate" }}>
          {content}
        </div>
      </div>
    </AbsoluteFill>
  );
}
