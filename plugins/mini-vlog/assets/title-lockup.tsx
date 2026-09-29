// Mini Vlog title: one static lockup over the whole video in one of three layouts
// ("Mini vlog", "A day in my life", "A small glimpse"). Nothing animates.
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useVideoConfig } from "remotion";

// mv-lockup:start
// Pure layout, shared with the panel preview (which evaluates this block as plain JS).
// Text is measured with the per-font advance tables from presets.json (`metrics`), passed
// in `data.fonts[i].metrics`, so the layout is identical in Node, the panel and the render.
// All lengths are canvas pixels; sizes are relative to the canvas height.
// Items: text {part, text, font, x (left), y (baseline), size (font px), w (advance width)},
// sparkle/star {part, x, y (centre), size (full height)}; each carries its ink box [x0, y0, x1, y1].
var MV_FACES = {
  "mini-vlog": {
    big: { family: "MV DM Serif Display Italic", style: "italic", weight: 400 },
    small: { family: "MV DM Serif Display", style: "normal", weight: 400 },
  },
  "day-in-my-life": {
    big: { family: "MV Quicksand Bold", style: "normal", weight: 700 },
    tag: { family: "MV Quicksand Bold", style: "normal", weight: 700 },
  },
  "small-glimpse": {
    big: { family: "MV Quicksand Bold", style: "normal", weight: 700 },
    mono: { family: "MV DM Mono", style: "normal", weight: 400 },
  },
};
// Used only when a family's metrics are missing: a generic 0.56 em advance.
var MV_FALLBACK_METRICS = { unitsPerEm: 1000, xHeight: 500, capHeight: 700, ascent: 720, descent: -220, dots: { i: [150, 650], j: [150, 650] }, advances: {} };
var MV_FIT = 0.6; // max lockup width, fraction of canvas width

function mvFace(data, preset, role) {
  var face = MV_FACES[preset][role];
  var fonts = data && Array.isArray(data.fonts) ? data.fonts : [];
  var m = null;
  for (var i = 0; i < fonts.length; i++) if (fonts[i] && fonts[i].family === face.family && fonts[i].metrics) m = fonts[i].metrics;
  return { family: face.family, style: face.style, weight: face.weight, m: m || MV_FALLBACK_METRICS };
}

function mvAdvance(m, ch) {
  var a = m.advances[ch];
  return typeof a === "number" ? a : 0.56 * m.unitsPerEm;
}

// Advance width of `text` at `px` (kerning ignored).
function mvTextWidth(text, m, px) {
  var units = 0;
  for (var i = 0; i < text.length; i++) units += mvAdvance(m, text.charAt(i));
  return (units * px) / m.unitsPerEm;
}

// Ink extents above / below the baseline in em, from the characters present.
function mvInk(text, m) {
  var up = m.xHeight, down = 0;
  if (/[A-Z0-9bdfhkltÀ-Þß!?'"&%$#@/\\|(){}[\]]/.test(text)) up = Math.max(up, m.ascent, m.capHeight);
  else if (/[ij]/.test(text)) up = Math.max(up, m.dots.i[1] + 0.07 * m.unitsPerEm);
  if (/[gjpqy,;()[\]{}|]/.test(text)) down = -m.descent;
  return { up: up / m.unitsPerEm, down: down / m.unitsPerEm };
}

function mvText(part, text, f, x, y, size, color) {
  var w = mvTextWidth(text, f.m, size), ink = mvInk(text, f.m);
  return { kind: "text", part: part, text: text, font: { family: f.family, style: f.style, weight: f.weight }, x: x, y: y, size: size, color: color, w: w, box: [x, y - ink.up * size, x + w, y + ink.down * size] };
}

function mvMark(kind, part, x, y, size, color) {
  return { kind: kind, part: part, x: x, y: y, size: size, color: color, box: [x - size / 2, y - size / 2, x + size / 2, y + size / 2] };
}

// [x0, y0, x1, y1] around every item's ink box.
function mvLockupBounds(items) {
  var b = [Infinity, Infinity, -Infinity, -Infinity];
  for (var i = 0; i < items.length; i++) {
    var q = items[i].box;
    b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])];
  }
  return b;
}

// Split at the space nearest the middle; without a space, at the middle with a hyphen.
function mvSplit(text, hyphen) {
  var mid = text.length / 2, at = -1;
  for (var i = 0; i < text.length; i++) if (text.charAt(i) === " " && (at < 0 || Math.abs(i - mid) < Math.abs(at - mid))) at = i;
  if (at > 0) return [text.slice(0, at).trim(), text.slice(at + 1).trim()];
  if (!hyphen) return [text];
  var cut = Math.ceil(text.length / 2);
  return [text.slice(0, cut) + "-", text.slice(cut)];
}

// "Mini vlog" (No.17): italic big word, sparkles over up to three i/j, upright small word under it.
function mvLayoutMini(data, fields, H, S, col) {
  var fb = mvFace(data, "mini-vlog", "big"), fs = mvFace(data, "mini-vlog", "small"), mb = fb.m;
  var items = [];
  var Fb = ((0.083 * H) / (mb.xHeight / mb.unitsPerEm)) * S;
  // Sparkled i/j are drawn dotless when the font has the glyph, so the sparkle replaces the dot.
  var chars = fields.big.split(""), marks = [];
  for (var i = 0; i < chars.length && marks.length < (data.sparkles === false ? 0 : 3); i++) {
    var ch = chars[i];
    if (ch !== "i" && ch !== "j") continue;
    marks.push(i);
    var dotless = ch === "i" ? "ı" : "ȷ";
    if (typeof mb.advances[dotless] === "number") chars[i] = dotless;
  }
  var bigText = chars.join("");
  var wb = mvTextWidth(bigText, mb, Fb);
  var big = mvText("big", bigText, fb, -wb / 2, 0, Fb, col.primary);
  items.push(big);
  var spark = 0.17 * Fb;
  for (var k = 0; k < marks.length; k++) {
    var dot = mb.dots[fields.big.charAt(marks[k])] || mb.dots.i;
    var px = big.x + mvTextWidth(bigText.slice(0, marks[k]), mb, Fb) + (dot[0] / mb.unitsPerEm) * Fb;
    items.push(mvMark("sparkle", "sparkle", px, -(dot[1] / mb.unitsPerEm) * Fb, spark, col.primary));
  }
  if (data.sparkles !== false && marks.length === 0) {
    items.push(mvMark("sparkle", "sparkle", big.box[2] + 0.04 * Fb, big.box[1] - 0.06 * Fb, spark, col.primary));
  }
  if (fields.small) {
    // "vlog" is 43 % of "mini"'s width in No.17: kept as a font-size ratio for other words.
    var ms = fs.m;
    var Fs = (Fb * 0.43 * mvTextWidth("mini", mb, 1)) / mvTextWidth("vlog", ms, 1);
    var ws = mvTextWidth(fields.small, ms, Fs), inkS = mvInk(fields.small, ms);
    var y2 = big.box[3] + 0.03 * Fb + inkS.up * Fs;
    items.push(mvText("small", fields.small, fs, -ws / 2, y2, Fs, col.secondary));
  }
  return items;
}

// "A day in my life": [star year] big line 1 / big line 2 [two-line tag star], rows right-aligned.
function mvLayoutDay(data, fields, H, S, col) {
  var fb = mvFace(data, "day-in-my-life", "big"), ft = mvFace(data, "day-in-my-life", "tag"), m = fb.m;
  var accents = data.sparkles !== false;
  var Fb = ((0.07 * H) / (m.xHeight / m.unitsPerEm)) * S, Fy = 0.36 * Fb, Ft = 0.28 * Fb;
  var xh = m.xHeight / m.unitsPerEm, cap = m.capHeight / m.unitsPerEm, xhT = ft.m.xHeight / ft.m.unitsPerEm;
  var lines = mvSplit(fields.big, false);
  var l1 = lines.length > 1 ? lines[0] : "", l2 = lines.length > 1 ? lines[1] : lines[0];
  var row1 = [], row2 = [];
  // Row 1: star + year centred on the big line's x-height band, then the first big line.
  var y1 = 0, band1 = y1 - (xh * Fb) / 2, x = 0;
  if (fields.year) {
    var sy = 0.3 * Fb;
    if (accents) row1.push(mvMark("star", "star", x + sy / 2, band1, sy, col.secondary));
    x += sy + 0.06 * Fb;
    var year = mvText("year", fields.year, fb, x, band1 + (cap * Fy) / 2, Fy, col.secondary);
    row1.push(year);
    x = year.box[2] + 0.12 * Fb;
  }
  var inkBottom1 = 0;
  if (l1) {
    var b1 = mvText("big1", l1, fb, x, y1, Fb, col.primary);
    row1.push(b1);
    inkBottom1 = b1.box[3];
  }
  // Row 2: tight under row 1 (ink to ink), big line then the tag centred on its x-height band.
  var y2 = inkBottom1 + 0.05 * Fb + mvInk(l2, m).up * Fb;
  if (!l1 && fields.year) y2 = Math.max(y2, y1 + 0.7 * Fb);
  var b2 = mvText("big2", l2, fb, 0, y2, Fb, col.primary);
  row2.push(b2);
  if (fields.tag) {
    var tag = mvSplit(fields.tag, false), band2 = y2 - (xh * Fb) / 2, tx = b2.box[2] + 0.08 * Fb;
    var lead = 1.2 * Ft;
    // Two lines: the block (line 1 x-height top to line 2 baseline) is centred on the band.
    var t1y = tag.length > 1 ? band2 - (lead - xhT * Ft) / 2 : band2 + (xhT * Ft) / 2;
    var t1 = mvText("tag1", tag[0], ft, tx, t1y, Ft, col.secondary);
    row2.push(t1);
    if (tag.length > 1) row2.push(mvText("tag2", tag[1], ft, tx, t1y + lead, Ft, col.secondary));
    if (accents) {
      var st = 0.2 * Fb;
      row2.push(mvMark("star", "star", t1.box[2] + 0.05 * Fb + st / 2, band2, st, col.secondary));
    }
  }
  // Right-align the rows (a lone year row stays left-aligned over the big word).
  var r1 = row1.length ? mvLockupBounds(row1)[2] : 0, r2 = mvLockupBounds(row2)[2], right = Math.max(r1, r2);
  var shift1 = l1 ? right - r1 : mvLockupBounds(row2)[0] - (row1.length ? mvLockupBounds(row1)[0] : 0), shift2 = right - r2;
  return mvShift(row1, shift1, 0).concat(mvShift(row2, shift2, 0));
}

// "A small glimpse": tiny mono top line / big word split in two with a star before line 2 / tiny mono bottom line.
function mvLayoutGlimpse(data, fields, H, S, col) {
  var fb = mvFace(data, "small-glimpse", "big"), fm = mvFace(data, "small-glimpse", "mono"), m = fb.m;
  var Fb = ((0.075 * H) / (m.xHeight / m.unitsPerEm)) * S, Fm = 0.25 * Fb, xh = m.xHeight / m.unitsPerEm;
  var word = fields.big;
  var lines = word.replace(/\s/g, "").length <= 3 ? [word] : mvSplit(word, true);
  var items = [], first = null, last;
  if (lines.length > 1) {
    first = mvText("big1", lines[0], fb, 0, 0, Fb, col.primary);
    items.push(first);
  }
  var up2 = mvInk(lines[lines.length - 1], m).up;
  var y2 = first ? 0.66 * Fb + Math.max(0, (up2 - xh) * Fb) : 0;
  var starD = 0.4 * Fb;
  if (data.sparkles !== false) items.push(mvMark("star", "star", 0.2 * Fb, y2 - (xh * Fb) / 2, starD, col.secondary));
  last = mvText("big2", lines[lines.length - 1], fb, 0.5 * Fb, y2, Fb, col.primary);
  items.push(last);
  var topLine = first || last;
  if (fields.top) items.push(mvText("top", fields.top, fm, topLine.x + 0.1 * Fb, topLine.box[1] - 0.22 * Fb, Fm, col.secondary));
  if (fields.bottom) items.push(mvText("bottom", fields.bottom, fm, last.x + 0.75 * last.w, y2 + 0.34 * Fb, Fm, col.secondary));
  return items;
}

function mvShift(items, dx, dy) {
  return items.map(function (it) {
    return Object.assign({}, it, { x: it.x + dx, y: it.y + dy, box: [it.box[0] + dx, it.box[1] + dy, it.box[2] + dx, it.box[3] + dy] });
  });
}

function mvLockupLayout(data, width, height) {
  data = data || {};
  var W = width > 0 ? width : 1920, H = height > 0 ? height : 1080;
  var preset = MV_FACES[data.preset] ? data.preset : "mini-vlog";
  var raw = data.fields || {};
  var clean = function (v) { return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : ""; };
  var fields = { big: clean(raw.big), small: clean(raw.small), tag: clean(raw.tag), year: clean(raw.year), top: clean(raw.top), bottom: clean(raw.bottom) };
  if (!fields.big) return [];
  var num = function (v, d, lo, hi) { return typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  var S = num(data.size, 100, 60, 160) / 100;
  var col = {
    primary: typeof data.primary === "string" && data.primary ? data.primary : "#F7C8E6",
    secondary: typeof data.secondary === "string" && data.secondary ? data.secondary : "#FFFFFF",
  };
  var items = preset === "day-in-my-life" ? mvLayoutDay(data, fields, H, S, col)
    : preset === "small-glimpse" ? mvLayoutGlimpse(data, fields, H, S, col)
    : mvLayoutMini(data, fields, H, S, col);
  // Shrink the whole lockup to the max width, then centre its ink box on the anchor.
  var b = mvLockupBounds(items);
  var k = Math.min(1, (MV_FIT * W) / (b[2] - b[0]));
  var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  var ax = (num(data.x, 49, 20, 80) / 100) * W, ay = (num(data.y, 52, 20, 80) / 100) * H;
  var tx = function (v) { return ax + (v - cx) * k; }, ty = function (v) { return ay + (v - cy) * k; };
  return items.map(function (it) {
    var o = Object.assign({}, it, { x: tx(it.x), y: ty(it.y), size: it.size * k, box: [tx(it.box[0]), ty(it.box[1]), tx(it.box[2]), ty(it.box[3])] });
    if (typeof it.w === "number") o.w = it.w * k;
    return o;
  });
}

function mvF(v) { return Math.round(v * 100) / 100; }

// Four-point sparkle (concave sides) centred on (cx, cy), `size` tall and wide.
function mvSparklePath(cx, cy, size) {
  var r = size / 2, c = r * 0.14;
  return "M" + mvF(cx) + " " + mvF(cy - r)
    + " Q" + mvF(cx + c) + " " + mvF(cy - c) + " " + mvF(cx + r) + " " + mvF(cy)
    + " Q" + mvF(cx + c) + " " + mvF(cy + c) + " " + mvF(cx) + " " + mvF(cy + r)
    + " Q" + mvF(cx - c) + " " + mvF(cy + c) + " " + mvF(cx - r) + " " + mvF(cy)
    + " Q" + mvF(cx - c) + " " + mvF(cy - c) + " " + mvF(cx) + " " + mvF(cy - r) + " Z";
}

// Five-point star centred on (cx, cy), `size` across the outer points.
function mvStarPath(cx, cy, size) {
  var R = size / 2, r = R * 0.45, d = "";
  for (var i = 0; i < 10; i++) {
    var a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r : R;
    // Nudge down so the star's visual centre (not its top point) sits on cy.
    d += (i ? " L" : "M") + mvF(cx + rad * Math.cos(a)) + " " + mvF(cy + rad * Math.sin(a) + R * 0.05);
  }
  return d + " Z";
}
// mv-lockup:end

const FALLBACK = '"Helvetica Neue", Arial, sans-serif';
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export default function MiniVlogTitle({ data }: { data: any }) {
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

  const items: any[] = mvLockupLayout(data, width, height);
  const shadow = Math.max(0, Math.min(1, num(data.shadow, 0.35)));
  const fontFaces = fonts.map((f) => `@font-face{font-family:"${f.family}";src:url("data:font/woff2;base64,${f.b64}") format("woff2");font-style:${f.style};font-weight:${f.weight};}`).join("");
  const blur = height * 0.012, drop = height * 0.004;
  return (
    <AbsoluteFill>
      {fontFaces ? <style>{fontFaces}</style> : null}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: shadow > 0 ? `drop-shadow(0 ${drop}px ${blur}px rgba(0,0,0,${shadow}))` : undefined }}>
        {items.map((it, i) =>
          it.kind === "text" ? (
            <text key={i} x={it.x} y={it.y} fill={it.color} fontSize={it.size} fontFamily={`"${it.font.family}", ${FALLBACK}`} fontStyle={it.font.style} fontWeight={it.font.weight} style={{ whiteSpace: "pre", fontKerning: "none" }}>{it.text}</text>
          ) : (
            <path key={i} d={it.kind === "sparkle" ? mvSparklePath(it.x, it.y, it.size) : mvStarPath(it.x, it.y, it.size)} fill={it.color} />
          ),
        )}
      </svg>
    </AbsoluteFill>
  );
}
