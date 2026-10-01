// Archive Vlog title: one static lockup over the whole video in one of three layouts
// ("Mini vlog", "A day in my life", "A small glimpse"). Nothing animates.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useVideoConfig } from "remotion";

// av-lockup:start
// Pure layout, shared with the panel preview (which evaluates this block as plain JS).
// Text is measured with the per-font advance tables from presets.json (`metrics`), passed
// in `data.fonts[i].metrics`, so the layout is identical in Node, the panel and the render.
// All lengths are canvas pixels; sizes are relative to the canvas height.
// Items: text {part, text, font, x (left), y (baseline), size (font px), w (advance width), shade (shadow fraction)},
// sparkle/star {part, x, y (centre), size (full height)}; each carries its ink box [x0, y0, x1, y1].
var AV_FACES = {
  "archive-vlog": {
    // No.17's face: tight tracking and a thin same-colour stroke (em) soften the contrast.
    big: { family: "MV Instrument Serif Italic", style: "italic", weight: 400, tracking: -0.05, stroke: 0.01 },
    // DM Serif Display has one weight, so "vlog" reads lighter through a softer drop shadow (`shade`: a fraction of the
    // title's shadow opacity and blur) and a slightly smaller size (avLayoutMini).
    small: { family: "MV DM Serif Display", style: "normal", weight: 400, shade: 0.6 },
  },
  "day-in-my-life": {
    big: { family: "MV Rounded Bold", style: "normal", weight: 700 },
    tag: { family: "MV Rounded Bold", style: "normal", weight: 700 },
  },
  "small-glimpse": {
    big: { family: "MV Rounded Bold", style: "normal", weight: 700 },
    mono: { family: "MV DM Mono", style: "normal", weight: 400 },
  },
};
// Used only when a family's metrics are missing: a generic 0.56 em advance.
var AV_FALLBACK_METRICS = { unitsPerEm: 1000, xHeight: 500, capHeight: 700, ascent: 720, descent: -220, dots: { i: [150, 650], j: [150, 650] }, advances: {} };
var AV_FIT = 0.6; // max lockup width, fraction of canvas width
// Korean titles. Text with Hangul is never tracked, a spaceless Hangul word is never hyphenated, and a wide character
// (Hangul, kana, CJK, fullwidth) without an advance in the metrics counts as 1 em (Latin keeps the 0.56 em fallback).
var AV_HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
var AV_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
// The macOS Korean system face per bundled family (by role: serif faces AppleMyungjo, the rest Apple SD Gothic Neo).
var AV_KO_FACES = { "MV Instrument Serif Italic": "AppleMyungjo", "MV DM Serif Display": "AppleMyungjo", "MV Rounded Bold": "Apple SD Gothic Neo", "MV DM Mono": "Apple SD Gothic Neo" };
function avHasHangul(text) { return AV_HANGUL_RE.test(String(text || "")); }
// The system Korean faces' ink in em: Hangul reaches about 0.86 em above the baseline and 0.12 em below it.
var AV_WIDE_UP = 0.86, AV_WIDE_DOWN = 0.12;
// Where a star or year centres on a line: the x-height band of Latin text, the middle of the ink of wide text.
function avBand(text, m) {
  return AV_WIDE_RE.test(text) ? (AV_WIDE_UP - AV_WIDE_DOWN) / 2 : m.xHeight / m.unitsPerEm / 2;
}
// A text item's font stack: the bundled face, the Latin fallbacks, then the family's Korean face before the generic one.
function avFontStack(family) {
  var ko = AV_KO_FACES[family] || "Apple SD Gothic Neo";
  return '"' + family + '", "Helvetica Neue", Arial, "' + ko + '", ' + (ko === "AppleMyungjo" ? "serif" : "sans-serif");
}
var AV_MINI_WIDTH = (0.155 * 1920) / 1080; // "mini" advance width at size 100, fraction of height

function avFace(data, preset, role) {
  var face = AV_FACES[preset][role];
  var fonts = data && Array.isArray(data.fonts) ? data.fonts : [];
  var m = null;
  for (var i = 0; i < fonts.length; i++) if (fonts[i] && fonts[i].family === face.family && fonts[i].metrics) m = fonts[i].metrics;
  return { family: face.family, style: face.style, weight: face.weight, tracking: face.tracking || 0, stroke: face.stroke || 0, shade: typeof face.shade === "number" ? face.shade : 1, m: m || AV_FALLBACK_METRICS };
}

function avAdvance(m, ch) {
  var a = m.advances[ch];
  return typeof a === "number" ? a : (AV_WIDE_RE.test(ch) ? 1 : 0.56) * m.unitsPerEm;
}

// Advance width of `text` at `px` (kerning ignored), plus `tracking` em (optional, default 0) between letters
// (CSS letter-spacing also follows the last letter, but that space is never visible).
function avTextWidth(text, m, px, tracking = 0) {
  var units = 0;
  for (var i = 0; i < text.length; i++) units += avAdvance(m, text.charAt(i));
  return (units * px) / m.unitsPerEm + (tracking || 0) * px * Math.max(0, text.length - 1);
}

// Ink extents above / below the baseline in em, from the characters present. Wide characters (Hangul) reach the ascent
// and sit a little below the baseline, so they count like capitals and descenders.
function avInk(text, m) {
  var up = m.xHeight, down = 0, wide = AV_WIDE_RE.test(text);
  if (/[A-Z0-9bdfhklt\u00c0-\u00de\u00df!?'"&%$#@/\\|(){}[\]]/.test(text)) up = Math.max(up, m.ascent, m.capHeight);
  else if (/[ij]/.test(text)) up = Math.max(up, m.dots.i[1] + 0.07 * m.unitsPerEm);
  if (/[gjpqy,;()[\]{}|]/.test(text)) down = -m.descent;
  if (wide) { up = Math.max(up, AV_WIDE_UP * m.unitsPerEm); down = Math.max(down, AV_WIDE_DOWN * m.unitsPerEm); }
  return { up: up / m.unitsPerEm, down: down / m.unitsPerEm };
}

// Boxes span the advance width (plus half the stroke, which grows outward), not the ink:
// an italic's overhang can reach past box[2]. `tracking` and `stroke` are px for the SVG.
function avText(part, text, f, x, y, size, color) {
  if (f.tracking && avHasHangul(text)) f = Object.assign({}, f, { tracking: 0 });
  var w = avTextWidth(text, f.m, size, f.tracking), ink = avInk(text, f.m), s = f.stroke * size, h = s / 2;
  return { kind: "text", part: part, text: text, font: { family: f.family, style: f.style, weight: f.weight }, x: x, y: y, size: size, color: color, w: w,
    tracking: f.tracking * size, stroke: s, shade: f.shade, box: [x - h, y - ink.up * size - h, x + w + h, y + ink.down * size + h] };
}

function avMark(kind, part, x, y, size, color) {
  return { kind: kind, part: part, x: x, y: y, size: size, color: color, box: [x - size / 2, y - size / 2, x + size / 2, y + size / 2] };
}

// [x0, y0, x1, y1] around every item's ink box.
function avLockupBounds(items) {
  var b = [Infinity, Infinity, -Infinity, -Infinity];
  for (var i = 0; i < items.length; i++) {
    var q = items[i].box;
    b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])];
  }
  return b;
}

// Split at the space nearest the middle; without a space, at the middle with a hyphen (never in a wide-character word,
// which stays on one line).
function avSplit(text, hyphen) {
  var mid = text.length / 2, at = -1;
  for (var i = 0; i < text.length; i++) if (text.charAt(i) === " " && (at < 0 || Math.abs(i - mid) < Math.abs(at - mid))) at = i;
  if (at > 0) return [text.slice(0, at).trim(), text.slice(at + 1).trim()];
  if (!hyphen || AV_WIDE_RE.test(text)) return [text];
  var cut = Math.ceil(text.length / 2);
  return [text.slice(0, cut) + "-", text.slice(cut)];
}

// "Mini vlog" (No.17): italic big word, sparkles over up to three i/j, upright small word under it.
function avLayoutMini(data, fields, H, S, col) {
  var fb = avFace(data, "archive-vlog", "big"), fs = avFace(data, "archive-vlog", "small"), mb = fb.m;
  var items = [];
  // Footprint wins over x-height: at size 100 "mini" is 0.155 of a 16:9 canvas's width
  // (No.17 measures ~290-300 px at 1920x1080), expressed relative to the height.
  var Fb = ((AV_MINI_WIDTH * H) / avTextWidth("mini", mb, 1, fb.tracking)) * S, xh = mb.xHeight / mb.unitsPerEm;
  // The big word's tracking: none on Hangul (the size above still comes from the tracked "mini").
  var tb = avHasHangul(fields.big) ? 0 : fb.tracking;
  // Sparkled i/j are drawn dotless when the font has the glyph, so the sparkle replaces the dot.
  var chars = fields.big.split(""), marks = [];
  for (var i = 0; i < chars.length && marks.length < (data.sparkles === false ? 0 : 3); i++) {
    var ch = chars[i];
    if (ch !== "i" && ch !== "j") continue;
    marks.push(i);
    var dotless = ch === "i" ? "\u0131" : "\u0237";
    if (typeof mb.advances[dotless] === "number") chars[i] = dotless;
  }
  var bigText = chars.join("");
  var wb = avTextWidth(bigText, mb, Fb, tb);
  var big = avText("big", bigText, fb, -wb / 2, 0, Fb, col.primary);
  items.push(big);
  var spark = 0.36 * xh * Fb;
  for (var k = 0; k < marks.length; k++) {
    var letter = fields.big.charAt(marks[k]), stem = mb.stems && mb.stems[letter];
    var dot = mb.dots[letter] || mb.dots.i;
    // Pen position of the letter: advances plus the tracking after each earlier letter.
    var pen = big.x + avTextWidth(bigText.slice(0, marks[k]), mb, Fb) + tb * Fb * marks[k];
    var px, py;
    if (bigText.charAt(marks[k]) !== letter && stem) {
      // Dotless letter: the sparkle sits on its stem top, its bottom 0.12 x-height above it.
      px = pen + (stem[0] / mb.unitsPerEm) * Fb;
      py = -(stem[1] / mb.unitsPerEm + 0.12 * xh) * Fb - spark / 2;
    } else {
      px = pen + (dot[0] / mb.unitsPerEm) * Fb;
      py = -(dot[1] / mb.unitsPerEm) * Fb;
      // A letter that kept its dot (no dotless glyph) gets the sparkle above the dot.
      if (bigText.charAt(marks[k]) === letter) py = -((dot[1] + (dot[2] || 0.06 * mb.unitsPerEm)) / mb.unitsPerEm) * Fb - 0.03 * Fb - spark / 2;
    }
    items.push(avMark("sparkle", "sparkle", px, py, spark, col.primary));
  }
  if (data.sparkles !== false && marks.length === 0) {
    // Hangul in the italic preset is slanted by the renderer past its advance box, so its sparkle moves further right.
    items.push(avMark("sparkle", "sparkle", big.box[2] + (avHasHangul(bigText) ? 0.2 : 0.04) * Fb, big.box[1] - 0.06 * Fb, spark, col.primary));
  }
  if (fields.small) {
    // "vlog" is 43 % of "mini"'s width in No.17; 41 % (5 % smaller) keeps the one-weight face from reading heavy.
    // Kept as a font-size ratio for other words.
    var ms = fs.m;
    var Fs = (Fb * 0.41 * avTextWidth("mini", mb, 1, fb.tracking)) / avTextWidth("vlog", ms, 1);
    var ws = avTextWidth(fields.small, ms, Fs), inkS = avInk(fields.small, ms);
    var y2 = big.box[3] + 0.03 * Fb + inkS.up * Fs;
    items.push(avText("small", fields.small, fs, -ws / 2, y2, Fs, col.secondary));
  }
  return items;
}

// "A day in my life": [star year] big line 1 / big line 2 [two-line tag star], rows right-aligned.
function avLayoutDay(data, fields, H, S, col) {
  var fb = avFace(data, "day-in-my-life", "big"), ft = avFace(data, "day-in-my-life", "tag"), m = fb.m;
  var accents = data.sparkles !== false;
  var Fb = ((0.07 * H) / (m.xHeight / m.unitsPerEm)) * S, Fy = 0.36 * Fb, Ft = 0.28 * Fb;
  var xh = m.xHeight / m.unitsPerEm, cap = m.capHeight / m.unitsPerEm, xhT = ft.m.xHeight / ft.m.unitsPerEm;
  var lines = avSplit(fields.big, false);
  var l1 = lines.length > 1 ? lines[0] : "", l2 = lines.length > 1 ? lines[1] : lines[0];
  var row1 = [], row2 = [];
  // Row 1: star + year centred on the big line's x-height band, then the first big line.
  var y1 = 0, band1 = y1 - avBand(l1 || l2, m) * Fb, x = 0;
  if (fields.year) {
    // The star only takes room when it is drawn.
    if (accents) {
      var sy = 0.3 * Fb;
      row1.push(avMark("star", "star", x + sy / 2, band1, sy, col.secondary));
      x += sy + 0.06 * Fb;
    }
    var year = avText("year", fields.year, fb, x, band1 + (cap * Fy) / 2, Fy, col.secondary);
    row1.push(year);
    x = year.box[2] + 0.12 * Fb;
  }
  var inkBottom1 = 0;
  if (l1) {
    var b1 = avText("big1", l1, fb, x, y1, Fb, col.primary);
    row1.push(b1);
    inkBottom1 = b1.box[3];
  }
  // Row 2: tight under row 1 (ink to ink), big line then the tag centred on its x-height band.
  var y2 = inkBottom1 + 0.05 * Fb + avInk(l2, m).up * Fb;
  if (!l1 && fields.year) y2 = Math.max(y2, y1 + 0.7 * Fb);
  var b2 = avText("big2", l2, fb, 0, y2, Fb, col.primary);
  row2.push(b2);
  if (fields.tag) {
    var tag = avSplit(fields.tag, false), band2 = y2 - avBand(l2, m) * Fb, tx = b2.box[2] + 0.08 * Fb;
    var lead = 1.2 * Ft;
    // Two lines: the block (line 1 x-height top to line 2 baseline) is centred on the band.
    var t1y = tag.length > 1 ? band2 - (lead - xhT * Ft) / 2 : band2 + (xhT * Ft) / 2;
    var t1 = avText("tag1", tag[0], ft, tx, t1y, Ft, col.secondary);
    row2.push(t1);
    if (tag.length > 1) row2.push(avText("tag2", tag[1], ft, tx, t1y + lead, Ft, col.secondary));
    if (accents) {
      var st = 0.2 * Fb;
      row2.push(avMark("star", "star", t1.box[2] + 0.05 * Fb + st / 2, band2, st, col.secondary));
    }
  }
  // Right-align the rows (a lone year row stays left-aligned over the big word).
  var r1 = row1.length ? avLockupBounds(row1)[2] : 0, r2 = avLockupBounds(row2)[2], right = Math.max(r1, r2);
  var shift1 = l1 ? right - r1 : avLockupBounds(row2)[0] - (row1.length ? avLockupBounds(row1)[0] : 0), shift2 = right - r2;
  return avShift(row1, shift1, 0).concat(avShift(row2, shift2, 0));
}

// "A small glimpse": tiny mono top line / big word split in two with a star before line 2 / tiny mono bottom line.
function avLayoutGlimpse(data, fields, H, S, col) {
  var fb = avFace(data, "small-glimpse", "big"), fm = avFace(data, "small-glimpse", "mono"), m = fb.m;
  var Fb = ((0.075 * H) / (m.xHeight / m.unitsPerEm)) * S, Fm = 0.25 * Fb, xh = m.xHeight / m.unitsPerEm;
  var word = fields.big;
  var lines = word.replace(/\s/g, "").length <= 3 ? [word] : avSplit(word, true);
  var items = [], first = null, last;
  if (lines.length > 1) {
    first = avText("big1", lines[0], fb, 0, 0, Fb, col.primary);
    items.push(first);
  }
  var up2 = avInk(lines[lines.length - 1], m).up;
  var y2 = first ? 0.66 * Fb + Math.max(0, (up2 - xh) * Fb) : 0;
  var starD = 0.4 * Fb;
  if (data.sparkles !== false) items.push(avMark("star", "star", 0.2 * Fb, y2 - avBand(lines[lines.length - 1], m) * Fb, starD, col.secondary));
  last = avText("big2", lines[lines.length - 1], fb, 0.5 * Fb, y2, Fb, col.primary);
  items.push(last);
  var topLine = first || last;
  if (fields.top) items.push(avText("top", fields.top, fm, topLine.x + 0.1 * Fb, topLine.box[1] - 0.22 * Fb, Fm, col.secondary));
  if (fields.bottom) items.push(avText("bottom", fields.bottom, fm, last.x + 0.75 * last.w, y2 + 0.34 * Fb, Fm, col.secondary));
  return items;
}

function avShift(items, dx, dy) {
  return items.map(function (it) {
    return Object.assign({}, it, { x: it.x + dx, y: it.y + dy, box: [it.box[0] + dx, it.box[1] + dy, it.box[2] + dx, it.box[3] + dy] });
  });
}

function avLockupLayout(data, width, height) {
  data = data || {};
  var W = width > 0 ? width : 1920, H = height > 0 ? height : 1080;
  var preset = AV_FACES[data.preset] ? data.preset : "archive-vlog";
  var raw = data.fields || {};
  // Adjust edits land on flat keys (data.big, data.small, ...), so a flat string wins over data.fields.
  var pick = function (k) { var v = typeof data[k] === "string" ? data[k] : raw[k]; return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : ""; };
  var fields = { big: pick("big"), small: pick("small"), tag: pick("tag"), year: pick("year"), top: pick("top"), bottom: pick("bottom") };
  if (!fields.big) return [];
  var num = function (v, d, lo, hi) { return typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  var S = num(data.size, 100, 60, 160) / 100;
  var col = {
    primary: typeof data.primary === "string" && data.primary ? data.primary : "#F7C8E6",
    secondary: typeof data.secondary === "string" && data.secondary ? data.secondary : "#FFFFFF",
  };
  var items = preset === "day-in-my-life" ? avLayoutDay(data, fields, H, S, col)
    : preset === "small-glimpse" ? avLayoutGlimpse(data, fields, H, S, col)
    : avLayoutMini(data, fields, H, S, col);
  // Shrink the whole lockup to the max width, then centre its ink box on the anchor.
  var b = avLockupBounds(items);
  var k = Math.min(1, (AV_FIT * W) / (b[2] - b[0]));
  var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  var ax = (num(data.x, 49, 20, 80) / 100) * W, ay = (num(data.y, 52, 20, 80) / 100) * H;
  var tx = function (v) { return ax + (v - cx) * k; }, ty = function (v) { return ay + (v - cy) * k; };
  return items.map(function (it) {
    var o = Object.assign({}, it, { x: tx(it.x), y: ty(it.y), size: it.size * k, box: [tx(it.box[0]), ty(it.box[1]), tx(it.box[2]), ty(it.box[3])] });
    if (typeof it.w === "number") { o.w = it.w * k; o.tracking = it.tracking * k; o.stroke = it.stroke * k; }
    return o;
  });
}

// Items grouped by shade in first-appearance order ([{ shade, items }]); marks carry the full shadow (1). Each group
// is drawn as its own SVG with the title's drop shadow scaled by its shade.
function avShadeLayers(items) {
  var layers = [];
  for (var i = 0; i < items.length; i++) {
    var sh = typeof items[i].shade === "number" ? items[i].shade : 1, at = -1;
    for (var j = 0; j < layers.length; j++) if (layers[j].shade === sh) at = j;
    if (at < 0) { layers.push({ shade: sh, items: [] }); at = layers.length - 1; }
    layers[at].items.push(items[i]);
  }
  return layers;
}

function avF(v) { return Math.round(v * 100) / 100; }

// Four-point sparkle (concave sides) centred on (cx, cy), `size` tall and wide.
function avSparklePath(cx, cy, size) {
  var r = size / 2, c = r * 0.14;
  return "M" + avF(cx) + " " + avF(cy - r)
    + " Q" + avF(cx + c) + " " + avF(cy - c) + " " + avF(cx + r) + " " + avF(cy)
    + " Q" + avF(cx + c) + " " + avF(cy + c) + " " + avF(cx) + " " + avF(cy + r)
    + " Q" + avF(cx - c) + " " + avF(cy + c) + " " + avF(cx - r) + " " + avF(cy)
    + " Q" + avF(cx - c) + " " + avF(cy - c) + " " + avF(cx) + " " + avF(cy - r) + " Z";
}

// Five-point star centred on (cx, cy), `size` across the outer points.
function avStarPath(cx, cy, size) {
  var R = size / 2, r = R * 0.45, d = "";
  for (var i = 0; i < 10; i++) {
    var a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r : R;
    // Nudge down so the star's visual centre (not its top point) sits on cy.
    d += (i ? " L" : "M") + avF(cx + rad * Math.cos(a)) + " " + avF(cy + rad * Math.sin(a) + R * 0.05);
  }
  return d + " Z";
}
// av-lockup:end

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export default function MiniVlogTitle({ data: raw }: { data: any }) {
  const data = (raw || {}) as any;
  const config = useVideoConfig();
  const width = num(config && config.width, 1920);
  const height = num(config && config.height, 1080);
  const fonts: any[] = Array.isArray(data.fonts) ? data.fonts.filter((f: any) => f && f.b64) : [];
  const [ready, setReady] = useState(fonts.length === 0);
  const [handle] = useState(() => (fonts.length && typeof document !== "undefined" && document.fonts ? delayRender("mini vlog fonts") : null));
  const released = useRef(false);
  const release = () => {
    if (handle != null && !released.current) { released.current = true; continueRender(handle); }
  };
  useEffect(() => {
    if (ready) return;
    let live = true;
    const done = () => { if (live) setReady(true); };
    if (typeof document === "undefined" || !document.fonts) { done(); return; }
    Promise.all(fonts.map((f) => document.fonts.load(`${f.style} ${f.weight} 100px "${f.family}"`).catch(() => null))).finally(done);
    return () => { live = false; };
  }, [ready]);
  useEffect(() => { if (ready) release(); }, [ready, handle]);
  // Never leave the render blocked if the graphic unmounts before the fonts settle.
  useEffect(() => release, []);

  // Static: the layout depends only on the parameters and the canvas size.
  const items: any[] = useMemo(() => avLockupLayout(data, width, height), [raw, width, height]);
  const shadow = Math.max(0, Math.min(1, num(data.shadow, 0.35)));
  const fontFaces = fonts.map((f) => `@font-face{font-family:"${f.family}";src:url("data:font/woff2;base64,${f.b64}") format("woff2");font-style:${f.style};font-weight:${f.weight};}`).join("");
  const blur = height * 0.012, drop = height * 0.004;
  return (
    <AbsoluteFill>
      {fontFaces ? <style>{fontFaces}</style> : null}
      {avShadeLayers(items).map((layer, l) => {
        const a = shadow * layer.shade;
        return (
          <svg key={l} width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: a > 0 ? `drop-shadow(0 ${drop}px ${blur * layer.shade}px rgba(0,0,0,${a}))` : undefined }}>
            {layer.items.map((it: any, i: number) =>
              it.kind === "text" ? (
                <text key={i} x={it.x} y={it.y} fill={it.color} fontSize={it.size} fontFamily={avFontStack(it.font.family)} fontStyle={it.font.style} fontWeight={it.font.weight} stroke={it.stroke > 0 ? it.color : undefined} strokeWidth={it.stroke} strokeLinejoin="round" style={{ whiteSpace: "pre", fontKerning: "none", fontVariantLigatures: "none", letterSpacing: it.tracking }}>{it.text}</text>
              ) : (
                <path key={i} d={it.kind === "sparkle" ? avSparklePath(it.x, it.y, it.size) : avStarPath(it.x, it.y, it.size)} fill={it.color} />
              ),
            )}
          </svg>
        );
      })}
    </AbsoluteFill>
  );
}
