// Torn Paper Love "Torn photo": the clip as a torn paper photo (white torn strip, grey fibrous rim, soft shadow)
// on a backdrop, with the "Faded film" look and the style's transitions, all inside one clip effect.
//
// data: seed, vis {x,y,w,h} (the visible canvas rectangle in % of the clip's own box), inset (0.88 or 88),
// edge (strip width, % of canvas W), backdrop ('night'|'red'|'kraft'|'photo'), backdropColor, look (0-1),
// tilt (deg), entry/exit (transition kinds), holdFrames, phases {entry, exit} ([{name,start,end}] in frames from
// the planner; exit phases are aligned so the last one ends at holdFrames), clock ('clip'|'source'), originFrame,
// motion ('off'|'push-in'|'pull-out'|'drift'), motionStrength (0-1), allowPhotoBackdrop.
//
// The clip box is in source pixel space and its size is unknown here (the video config reports the sequence size), so
// nothing is laid out in pixels: every drawn shape lives in an SVG placed over `vis` with a 1440x1080 viewBox
// (canvas units), and the photo's clip path is expressed in % of the box.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// tpl-torn:start
var TPL_W = 1440, TPL_H = 1080;
var TPL_PAPER = "#f7f5f0";
var TPL_RIM = ["#cfcac2", "#b4afa7", "#9a958d"];

// Seeds: numbers (or numeric strings) are used as-is, other strings are hashed (FNV-1a).
function tplHash(seed) {
  if (typeof seed === "number" && isFinite(seed)) return Math.floor(Math.abs(seed)) >>> 0;
  var s = String(seed == null ? "" : seed);
  if (/^\d+$/.test(s) && Number(s) <= 0xffffffff) return Number(s) >>> 0;
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function tplRand(seed) {
  var a = (seed >>> 0) || 0x6d2b79f5;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function tplNum(v, def, lo, hi) {
  var n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!isFinite(n)) n = def;
  return Math.max(lo, Math.min(hi, n));
}
function tplPhaseList(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(function (p) { return p && typeof p.name === "string" && isFinite(p.start) && isFinite(p.end) && p.end > p.start; })
    .map(function (p) { return { name: p.name, start: Number(p.start), end: Number(p.end) }; });
}
// Normalised effect data with the defaults of the contract.
function tplData(data) {
  var d = data && typeof data === "object" ? data : {};
  var v = d.vis && typeof d.vis === "object" ? d.vis : null;
  var vis = { x: 0, y: 0, w: 100, h: 100 };
  if (v && [v.x, v.y, v.w, v.h].every(function (n) { return typeof n === "number" && isFinite(n); }) && v.w > 0 && v.h > 0) vis = { x: v.x, y: v.y, w: v.w, h: v.h };
  var inset = tplNum(d.inset, 0.88, 0, 100);
  if (inset > 1) inset = inset / 100;
  inset = Math.max(0.7, Math.min(0.95, inset));
  var backdrop = ["night", "red", "kraft", "photo"].indexOf(d.backdrop) >= 0 ? d.backdrop : "night";
  var color = typeof d.backdropColor === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(d.backdropColor.trim()) ? d.backdropColor.trim().toLowerCase() : null;
  var ph = d.phases && typeof d.phases === "object" ? d.phases : {};
  return {
    seed: tplHash(d.seed == null ? 0 : d.seed),
    vis: vis,
    inset: Math.round(inset * 10000) / 10000,
    edge: tplNum(d.edge, 1.4, 0.5, 3),
    backdrop: backdrop,
    backdropColor: color,
    look: tplNum(d.look, 0.35, 0, 1),
    tilt: tplNum(d.tilt, 0, -5, 5),
    entry: typeof d.entry === "string" && d.entry ? d.entry : "none",
    exit: typeof d.exit === "string" && d.exit ? d.exit : "none",
    holdFrames: tplNum(d.holdFrames, 0, 0, 1e7),
    phases: { entry: tplPhaseList(ph.entry), exit: tplPhaseList(ph.exit) },
    clock: d.clock === "source" ? "source" : "clip",
    originFrame: tplNum(d.originFrame, 0, -1e9, 1e9),
    motion: ["push-in", "pull-out", "drift"].indexOf(d.motion) >= 0 ? d.motion : "off",
    motionStrength: tplNum(d.motionStrength, 0.5, 0, 1),
    allowPhotoBackdrop: d.allowPhotoBackdrop !== false,
  };
}
function tplInsetRect(inset, W, H) {
  var mx = W * (1 - inset) / 2, my = H * (1 - inset) / 2;
  var r = function (n) { return Math.round(n * 1000) / 1000; };
  return { x: r(mx), y: r(my), w: r(W - 2 * mx), h: r(H - 2 * my) };
}
function tplCentre(poly) {
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (var i = 0; i < poly.length; i++) {
    x0 = Math.min(x0, poly[i][0]); x1 = Math.max(x1, poly[i][0]);
    y0 = Math.min(y0, poly[i][1]); y1 = Math.max(y1, poly[i][1]);
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}
// A periodic sum of sines over [0,1), rescaled to [-1,1].
function tplWave(R, n, count, fmin, fmax) {
  var h = [];
  for (var i = 0; i < count; i++) h.push([fmin + Math.floor(R() * (fmax - fmin + 1)), 0.35 + 0.65 * R(), R() * Math.PI * 2]);
  var out = [], m = 1e-9;
  for (var k = 0; k < n; k++) {
    var t = k / n, s = 0;
    for (var j = 0; j < h.length; j++) s += h[j][1] * Math.sin(2 * Math.PI * h[j][0] * t + h[j][2]);
    out.push(s); m = Math.max(m, Math.abs(s));
  }
  return out.map(function (s) { return s / m; });
}
// Torn jag in [-1,1]: per-vertex noise, lightly smoothed, with occasional sharp teeth.
function tplJag(R, n) {
  var raw = [];
  for (var k = 0; k < n; k++) raw.push(R() * 2 - 1);
  var out = [];
  for (var k2 = 0; k2 < n; k2++) {
    var v = 0.6 * raw[k2] + 0.2 * (raw[(k2 + n - 1) % n] + raw[(k2 + 1) % n]);
    if (R() < 0.08) v = (R() < 0.5 ? -1 : 1) * (0.75 + 0.25 * R());
    out.push(Math.max(-1, Math.min(1, v)));
  }
  return out;
}
var tplR2 = function (n) { return Math.round(n * 100) / 100; };
// The photo's torn outline: a closed ring (first vertex not repeated) around `rect` (canvas px). Each vertex is
// displaced radially from the rect centre by a low-frequency wander (up to opts.wander % of W) plus a jag (up to
// opts.jag % of W); radial displacement keeps the vertex angles in order, so the ring never crosses itself.
function tplTornPolygon(seed, rect, opts) {
  var o = opts || {};
  var W = o.W > 0 ? o.W : TPL_W;
  var wanderAmp = (isFinite(o.wander) ? o.wander : 1.2) / 100 * W, jagAmp = (isFinite(o.jag) ? o.jag : 0.35) / 100 * W;
  var R = tplRand(tplHash(seed) ^ 0x9e3779b9);
  var n = 180 + Math.floor(R() * 81);
  var P = 2 * (rect.w + rect.h), cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  var big = tplWave(R, n, 4, 2, 7), fine = tplWave(R, n, 3, 10, 21);
  var wAmp = wanderAmp * (0.8 + 0.2 * R());
  var jag = tplJag(R, n);
  var raw = big.map(function (b, k) { return 0.8 * b + 0.2 * fine[k]; });
  var m = raw.reduce(function (a, b) { return Math.max(a, Math.abs(b)); }, 1e-9);
  var out = [];
  for (var k = 0; k < n; k++) {
    var s = ((k + (R() - 0.5) * 0.6) / n) * P;
    s = ((s % P) + P) % P;
    var x, y;
    if (s < rect.w) { x = rect.x + s; y = rect.y; }
    else if (s < rect.w + rect.h) { x = rect.x + rect.w; y = rect.y + (s - rect.w); }
    else if (s < 2 * rect.w + rect.h) { x = rect.x + rect.w - (s - rect.w - rect.h); y = rect.y + rect.h; }
    else { x = rect.x; y = rect.y + rect.h - (s - 2 * rect.w - rect.h); }
    var ux = x - cx, uy = y - cy, L = Math.hypot(ux, uy) || 1;
    var off = wAmp * raw[k] / m + jagAmp * jag[k];
    out.push([tplR2(x + ux / L * off), tplR2(y + uy / L * off)]);
  }
  return out;
}
// Grows a star-shaped ring outward, radially from its centre, by a width that varies along the ring between
// lo·d and hi·d (skewed toward lo) plus a jag of ±jag·d, on top of half the local excess of the
// neighbouring inner vertices; with the defaults the typical width is d. The radial step is divided by
// the angle between the ring's local normal and the radius, so the width holds near the corners too. Every vertex
// moves outward along its own radius, so the result contains the input.
function tplGrow(poly, d, opts) {
  var o = opts || {};
  var c = o.centre || tplCentre(poly);
  var lo = isFinite(o.lo) ? o.lo : 0.65, hi = isFinite(o.hi) ? o.hi : 1.2, jg = isFinite(o.jag) ? o.jag : 0.1;
  var n = poly.length;
  var R = tplRand(tplHash(o.seed == null ? 0 : o.seed) ^ (o.salt || 0x51ed2705));
  var wave = tplWave(R, n, 3, o.fmin || 3, o.fmax || 11);
  var jag = tplJag(R, n);
  var sk = isFinite(o.skew) ? o.skew : 1.6;
  var m = Math.max(1, Math.round(n / 80));
  var out = [];
  for (var k = 0; k < n; k++) {
    var p = poly[k], a = poly[(k + n - m) % n], b = poly[(k + m) % n];
    var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    var ux = p[0] - c[0], uy = p[1] - c[1], ul = Math.hypot(ux, uy) || 1;
    ux /= ul; uy /= ul;
    var cos = Math.max(0.45, Math.abs(ux * ty / tl - uy * tx / tl));
    var v = Math.pow((wave[k] + 1) / 2, sk);
    var g = d * (lo + (hi - lo) * v) / cos + jg * d * jag[k];
    // Grow from the local envelope (this vertex and its neighbours), so a tooth of the inner edge next to this
    // vertex doesn't pinch the strip; the outer edge tears on its own.
    var r0 = Math.hypot(p[0] - c[0], p[1] - c[1]);
    var pa = poly[(k + n - 1) % n], pb = poly[(k + 1) % n];
    var r = r0 + 0.5 * Math.max(0, Math.hypot(pa[0] - c[0], pa[1] - c[1]) - r0, Math.hypot(pb[0] - c[0], pb[1] - c[1]) - r0);
    out.push([tplR2(c[0] + ux * (r + g)), tplR2(c[1] + uy * (r + g))]);
  }
  return out;
}
// The grey fibrous rim: a thin band of irregular width just outside the photo outline (inside the paper strip).
// Rims of the same seed nest for growing d, so light/mid/dark bands can be stacked.
function tplRim(poly, d, opts) {
  var o = opts || {};
  return tplGrow(poly, d * 0.36, { seed: o.seed, centre: o.centre, salt: 0x2c1b3c6d, lo: 0.3, hi: 1.25, jag: 0.12, fmin: 5, fmax: 17, skew: 1 });
}
// Canvas px -> CSS polygon in % of the clip's box (the canvas maps onto `vis`).
function tplClipPath(poly, vis) {
  var f = function (n) { return n.toFixed(3) + "%"; };
  return "polygon(" + poly.map(function (p) {
    return f(vis.x + p[0] / TPL_W * vis.w) + " " + f(vis.y + p[1] / TPL_H * vis.h);
  }).join(", ") + ")";
}
// Two torn white paper strips crossing the photo (the "tear" transition, spec §15.3), in canvas px inside rect.
// Each: points = the grey-rimmed outline, core = the white body; cy/height/angle describe the strip.
function tplTearStrips(seed, rect) {
  var R = tplRand(tplHash(seed) ^ 0x7ea57219);
  var bands = [[0.33, 0.37], [0.63, 0.69]];
  var cxr = rect.x + rect.w / 2;
  return bands.map(function (band, bi) {
    var cy = rect.y + rect.h * (band[0] + (band[1] - band[0]) * R());
    var height = rect.h * (0.06 + 0.03 * R());
    var angle = (bi === 0 ? -1 : 1) * (0.8 + 2.2 * R()) * (R() < 0.5 ? -1 : 1);
    var x0 = rect.x + rect.w * 0.025, x1 = rect.x + rect.w * 0.975;
    var n = 48 + Math.floor(R() * 17);
    var topW = tplWave(R, n + 1, 3, 1, 5), botW = tplWave(R, n + 1, 3, 1, 5);
    var topJ = tplJag(R, n + 1), botJ = tplJag(R, n + 1), rimT = tplWave(R, n + 1, 2, 2, 7), rimB = tplWave(R, n + 1, 2, 2, 7);
    var top = [], bot = [], ctop = [], cbot = [];
    for (var k = 0; k <= n; k++) {
      var x = x0 + (x1 - x0) * k / n;
      var yt = cy - height / 2 + height * (0.12 * topW[k] + 0.06 * topJ[k]);
      var yb = cy + height / 2 + height * (0.12 * botW[k] + 0.06 * botJ[k]);
      top.push([x, yt]); bot.push([x, yb]);
      if (k > 0 && k < n) {
        ctop.push([x, yt + height * (0.1 + 0.07 * (rimT[k] + 1))]);
        cbot.push([x, yb - height * (0.1 + 0.07 * (rimB[k] + 1))]);
      }
    }
    var endJag = function (xa, ya, yb2, dir) {
      var pts = [];
      for (var i = 1; i < 4; i++) pts.push([xa + dir * rect.w * 0.004 * (R() * 2 - 1), ya + (yb2 - ya) * i / 4]);
      return pts;
    };
    var outline = top.concat(endJag(x1, top[n][1], bot[n][1], 1), bot.slice().reverse(), endJag(x0, bot[0][1], top[0][1], 1));
    var core = ctop.concat(cbot.slice().reverse());
    var a = angle * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    var rot = function (p) {
      var dx = p[0] - cxr, dy = p[1] - cy;
      var x = cxr + dx * ca - dy * sa, y = cy + dx * sa + dy * ca;
      return [tplR2(Math.max(rect.x, Math.min(rect.x + rect.w, x))), tplR2(Math.max(rect.y, Math.min(rect.y + rect.h, y)))];
    };
    return { points: outline.map(rot), core: core.map(rot), cy: cy, height: height, angle: angle };
  });
}
// Everything the render needs from the torn shape, in canvas px.
function tplGeometry(d) {
  var rect = tplInsetRect(d.inset, TPL_W, TPL_H);
  var poly = tplTornPolygon(d.seed, rect);
  var edgePx = d.edge / 100 * TPL_W;
  var c = tplCentre(poly);
  var paper = tplGrow(poly, edgePx, { seed: d.seed, centre: c });
  var rims = [1, 0.7, 0.4].map(function (f) { return tplRim(poly, edgePx * f, { seed: d.seed, centre: c }); });
  // Scale of the whole picture (about the canvas centre) that covers the torn outline, with a hair of margin.
  var s = 0;
  for (var i = 0; i < poly.length; i++) s = Math.max(s, Math.abs(poly[i][0] - TPL_W / 2) / (TPL_W / 2), Math.abs(poly[i][1] - TPL_H / 2) / (TPL_H / 2));
  return { rect: rect, poly: poly, paper: paper, rims: rims, photoScale: Math.round(s * 1.006 * 10000) / 10000, strips: tplTearStrips(d.seed, { x: 0, y: 0, w: TPL_W, h: TPL_H }), edgePx: edgePx };
}
// "Faded film": at strength 1 blacks lift to 24/255, contrast -14 % (slope 0.86), saturation -18 %, sepia 0.12.
// contrast(c) then brightness(k) maps x -> k·(c·x + (1-c)/2): slope k·c, black k·(1-c)/2.
function tplLookFilter(strength) {
  var s = typeof strength === "number" && isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
  if (s === 0) return "none";
  var lift = 24 / 255 * s, slope = 1 - 0.14 * s;
  var k = 2 * lift + slope, c = slope / k;
  return "contrast(" + c.toFixed(4) + ") brightness(" + k.toFixed(4) + ") saturate(" + (1 - 0.18 * s).toFixed(3) + ") sepia(" + (0.12 * s).toFixed(3) + ")";
}
// Spec §15.2: frame 0 = the clip's first timeline frame, whichever clock the host uses.
function tplLocalFrame(frame, data) {
  var f = Number(frame) || 0;
  var d = data || {};
  return f - (d.clock === "source" ? Number(d.originFrame) || 0 : 0);
}
// The transition phase at a local frame: entry phases count from the clip start, exit phases are shifted so the
// last one ends at holdFrames. start inclusive, end exclusive. Entry wins where both overlap.
function tplPhaseAt(local, phases, holdFrames) {
  var ph = phases || {};
  var entry = tplPhaseList(ph.entry), exit = tplPhaseList(ph.exit);
  for (var i = 0; i < entry.length; i++) {
    if (local >= entry[i].start && local < entry[i].end) return { name: entry[i].name, i: local - entry[i].start, n: entry[i].end - entry[i].start, side: "entry" };
  }
  var hold = Number(holdFrames) || 0;
  if (hold > 0 && exit.length) {
    var len = exit.reduce(function (m, p) { return Math.max(m, p.end); }, 0), off = hold - len;
    for (var j = 0; j < exit.length; j++) {
      var a = exit[j].start + off, b = exit[j].end + off;
      if (local >= a && local < b && local >= 0 && local < hold) return { name: exit[j].name, i: local - a, n: b - a, side: "exit" };
    }
  }
  return null;
}
// The photo layer's filter: the look, plus the phase's exposure. 'white' turns the photo into a white sheet.
function tplPhotoFilter(look, phase) {
  var base = look && look !== "none" ? look : "";
  var extra = "";
  if (phase && phase.name === "white") return "brightness(0) invert(1)";
  if (phase && phase.name === "over") {
    var t = phase.n > 1 ? phase.i / (phase.n - 1) : 0;
    extra = "brightness(" + (2.2 + (1.5 - 2.2) * t).toFixed(3) + ")";
  } else if (phase && phase.name === "glow") extra = "brightness(1.800)";
  var f = (base + " " + extra).trim();
  return f || "none";
}
// Slide-in (clip 1 entry): -100 (% of vis height, off the top) until 0.28 of the hold, then an ease-in (cubic,
// accelerating) drop that lands at 0.76 of the hold.
function tplSlideY(local, holdFrames) {
  var h = Number(holdFrames) || 0;
  if (h <= 0) return 0;
  var p = local / h;
  if (p <= 0.28) return -100;
  if (p >= 0.76) return 0;
  var q = (p - 0.28) / 0.48;
  return -100 * (1 - q * q * q);
}
// Optional photo motion inside the torn window: { scale, x, y } with x/y in % of the photo; p = 0..1 over the hold.
function tplMotion(p, motion, strength) {
  var s = typeof strength === "number" && isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
  var e = 0.5 - Math.cos(Math.PI * Math.max(0, Math.min(1, Number(p) || 0))) / 2;
  if (s === 0 || motion === "off") return { scale: 1, x: 0, y: 0 };
  if (motion === "push-in") return { scale: 1 + 0.08 * s * e, x: 0, y: 0 };
  if (motion === "pull-out") return { scale: 1 + 0.08 * s * (1 - e), x: 0, y: 0 };
  if (motion === "drift") return { scale: 1 + 0.05 * s, x: (2 * e - 1) * 2 * s, y: 0 };
  return { scale: 1, x: 0, y: 0 };
}
// Backdrop presets. Textures are neutral translucent overlays with a fixed seed, so a colour override keeps them
// and they don't change at the cuts. folds: [{at 0..1, shade -1..1}] across the width (red curtain).
function tplBackdrop(preset, color) {
  var base = { night: "#151113", red: "#4a0f12", kraft: "#6b5a45", photo: "#151113" }[preset] || "#151113";
  var out = { base: color || base, grain: 0.07, grainFreq: 0.85, blotch: 0, folds: [], vignette: 0.35 };
  if (preset === "red") {
    var R = tplRand(0x4a0f12), at = 0;
    out.grain = 0.05; out.vignette = 0.45;
    while (at < 1) {
      out.folds.push({ at: Math.round(at * 10000) / 10000, shade: Math.round((out.folds.length % 2 ? 0.5 + 0.5 * R() : -(0.5 + 0.5 * R())) * 1000) / 1000 });
      at += 0.055 + 0.05 * R();
    }
    out.folds.push({ at: 1, shade: -0.6 });
  } else if (preset === "kraft") {
    out.grain = 0.16; out.grainFreq = 0.7; out.blotch = 0.22; out.vignette = 0.3;
  }
  return out;
}
// tpl-torn:end

// tpl-photo-backdrop:start
// The same picture, darkened and lightly blurred, behind the torn photo (probe P-two: two Source renders export).
// The blur is an SVG filter in objectBoundingBox units, ~0.8 % of the canvas width, because the box size in
// pixels is unknown; the canvas is 4:3 inside the box, so the box aspect follows from vis.
function TplPhotoBackdrop({ Source, children, vis, id }) {
  const sx = 0.008 * vis.w / 100, sy = sx * (4 / 3) * (vis.h / vis.w);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id + "pb"} x="0" y="0" width="1" height="1" primitiveUnits="objectBoundingBox">
          <feGaussianBlur stdDeviation={sx.toFixed(5) + " " + sy.toFixed(5)} edgeMode="duplicate" />
        </filter>
      </svg>
      <div style={{ position: "absolute", inset: 0, filter: "url(#" + id + "pb) brightness(0.45) saturate(0.85)" }}>{Source ? <Source /> : children}</div>
    </div>
  );
}
// tpl-photo-backdrop:end

const pts = (poly) => poly.map((p) => p[0] + "," + p[1]).join(" ");

function TplBackdropLayer({ bd, id }) {
  const W = TPL_W, H = TPL_H;
  const region = { x: 0, y: 0, width: W, height: H, filterUnits: "userSpaceOnUse" };
  return (
    <svg viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <filter id={id + "gl"} {...region}>
          <feTurbulence type="fractalNoise" baseFrequency={bd.grainFreq} numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 0 0 0 -1.5" />
        </filter>
        <filter id={id + "gd"} {...region}>
          <feTurbulence type="fractalNoise" baseFrequency={bd.grainFreq} numOctaves="2" seed="11" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 0 0 0 1.5" />
        </filter>
        {bd.blotch > 0 ? (
          <filter id={id + "bl"} {...region}>
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.007" numOctaves="3" seed="5" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2 0 0 0 1.1" />
          </filter>
        ) : null}
        {bd.folds.length ? (
          <linearGradient id={id + "fo"} x1="0" y1="0" x2="1" y2="0">
            {bd.folds.map((f, i) => (
              <stop key={i} offset={f.at} stopColor={f.shade < 0 ? "#000" : "#fff"} stopOpacity={f.shade < 0 ? -f.shade * 0.5 : f.shade * 0.13} />
            ))}
          </linearGradient>
        ) : null}
        <radialGradient id={id + "vg"} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={bd.vignette} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={bd.base} />
      {bd.folds.length ? <rect width={W} height={H} fill={"url(#" + id + "fo)"} /> : null}
      {bd.blotch > 0 ? <rect width={W} height={H} filter={"url(#" + id + "bl)"} opacity={bd.blotch} /> : null}
      <rect width={W} height={H} filter={"url(#" + id + "gl)"} opacity={bd.grain} />
      <rect width={W} height={H} filter={"url(#" + id + "gd)"} opacity={bd.grain * 1.4} />
      <rect width={W} height={H} fill={"url(#" + id + "vg)"} />
    </svg>
  );
}

function TplPaperLayer({ g, id, phase }) {
  const W = TPL_W, H = TPL_H, e = g.edgePx;
  const region = { x: 0, y: 0, width: W, height: H, filterUnits: "userSpaceOnUse" };
  const glow = phase && phase.name === "glow";
  const white = phase && phase.name === "white";
  return (
    <svg viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden" }}>
      <defs>
        <filter id={id + "sh"} {...region}>
          <feGaussianBlur stdDeviation={0.006 * W} />
          <feOffset dx={0.002 * W} dy={0.002 * W} />
        </filter>
        <filter id={id + "fb"} {...region}>
          <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves="2" seed={g.poly.length} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={e * 0.18} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={id + "pe"} {...region}>
          <feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="1" seed={g.poly.length + 3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={e * 0.1} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {glow ? (
          <filter id={id + "gw"} {...region}>
            <feGaussianBlur stdDeviation={0.0075 * W} />
          </filter>
        ) : null}
        {glow ? (
          <filter id={id + "bm"} {...region}>
            <feGaussianBlur stdDeviation={0.02 * W} />
          </filter>
        ) : null}
      </defs>
      {glow ? <polygon points={pts(g.paper)} fill="#dcebff" opacity="0.85" filter={"url(#" + id + "bm)"} /> : null}
      <polygon points={pts(g.paper)} fill="rgba(0,0,0,0.45)" filter={"url(#" + id + "sh)"} />
      {glow ? <polygon points={pts(g.paper)} fill="#ffffff" stroke="#ffffff" strokeWidth={0.015 * W} strokeLinejoin="round" filter={"url(#" + id + "gw)"} /> : null}
      <polygon points={pts(g.paper)} fill={TPL_PAPER} filter={"url(#" + id + "pe)"} />
      {white ? null : (
        <g filter={"url(#" + id + "fb)"}>
          {g.rims.map((r, i) => <polygon key={i} points={pts(r)} fill={TPL_RIM[i]} />)}
        </g>
      )}
    </svg>
  );
}

function TplTearLayer({ g, id }) {
  const W = TPL_W, H = TPL_H;
  const region = { x: 0, y: 0, width: W, height: H, filterUnits: "userSpaceOnUse" };
  return (
    <svg viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <filter id={id + "ts"} {...region}>
          <feGaussianBlur stdDeviation={0.006 * W} />
          <feOffset dx={0.002 * W} dy={0.003 * W} />
        </filter>
        <filter id={id + "tf"} {...region}>
          <feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="2" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={0.003 * W} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {g.strips.map((s, i) => (
        <g key={i}>
          <polygon points={pts(s.points)} fill="rgba(0,0,0,0.45)" filter={"url(#" + id + "ts)"} />
          <polygon points={pts(s.points)} fill={TPL_RIM[0]} filter={"url(#" + id + "tf)"} />
          <polygon points={pts(s.core)} fill={TPL_PAPER} filter={"url(#" + id + "tf)"} />
        </g>
      ))}
    </svg>
  );
}

export default function TornPhoto({ Source, children, data }) {
  const frame = useCurrentFrame();
  const d = tplData(data);
  const local = tplLocalFrame(frame, d);
  const rawId = typeof React.useId === "function" ? React.useId() : "";
  const id = "tpl" + String(rawId).replace(/[^a-zA-Z0-9]/g, "") + d.seed.toString(36);
  const g = React.useMemo(() => tplGeometry(d), [d.seed, d.inset, d.edge]);
  const bd = tplBackdrop(d.backdrop, d.backdropColor);
  const phase = tplPhaseAt(local, d.phases, d.holdFrames);
  const vis = d.vis;
  const pct = (n) => n.toFixed(4) + "%";
  const atVis = { position: "absolute", left: pct(vis.x), top: pct(vis.y), width: pct(vis.w), height: pct(vis.h) };
  const origin = pct(vis.x + vis.w / 2) + " " + pct(vis.y + vis.h / 2);
  const slide = d.entry === "slide" ? tplSlideY(local, d.holdFrames) : 0;
  const m = tplMotion(d.holdFrames > 1 ? local / (d.holdFrames - 1) : 0, d.motion, d.motionStrength);
  const scale = g.photoScale * m.scale;
  const tx = (m.x / 100) * g.photoScale * vis.w, ty = (m.y / 100) * g.photoScale * vis.h;
  const photoFilter = tplPhotoFilter(tplLookFilter(d.look), phase);
  const showPhotoBackdrop = d.backdrop === 'photo' && d.allowPhotoBackdrop === true;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Everything is clipped to the visible canvas; inside, a full-box layer keeps box-percent coordinates. */}
      <div style={{ ...atVis, overflow: "hidden", background: d.entry === "slide" ? "#000" : bd.base }}>
        <div style={{ position: "absolute", left: pct(-vis.x / vis.w * 100), top: pct(-vis.y / vis.h * 100), width: pct(10000 / vis.w), height: pct(10000 / vis.h) }}>
          <div style={{ position: "absolute", inset: 0, transform: slide ? "translateY(" + pct(slide * vis.h / 100) + ")" : undefined }}>
            <div style={atVis}><TplBackdropLayer bd={bd} id={id} /></div>
            {showPhotoBackdrop ? <TplPhotoBackdrop Source={Source} children={children} vis={vis} id={id} /> : null}
            <div style={{ position: "absolute", inset: 0, transform: d.tilt ? "rotate(" + d.tilt.toFixed(3) + "deg)" : undefined, transformOrigin: origin }}>
              <div style={atVis}><TplPaperLayer g={g} id={id} phase={phase} /></div>
              <div style={{ position: "absolute", inset: 0, clipPath: tplClipPath(g.poly, vis), filter: photoFilter }}>
                <div style={{ position: "absolute", inset: 0, transform: "translate(" + pct(tx) + ", " + pct(ty) + ") scale(" + scale.toFixed(5) + ")", transformOrigin: origin }}>
                  {Source ? <Source /> : children}
                </div>
              </div>
              {phase && phase.name === "tear" ? <div style={atVis}><TplTearLayer g={g} id={id} /></div> : null}
            </div>
          </div>
          {phase && phase.name === "full" ? <div style={{ ...atVis, background: "#ffffff" }} /> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
}
