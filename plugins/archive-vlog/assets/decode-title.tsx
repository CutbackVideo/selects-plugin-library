// Archive Vlog title: kicker / big condensed title / wide-tracked tagline, centred, over the opening shot. Kicker and
// tagline appear at textIn; the title decodes in left to right (the next position flips through pseudo-random glyphs,
// then locks) and always ends with a readable hold before the cut (avTiming). Placed `within` clip 1's range, which
// starts at timeline frame 0, so the frame here is the timeline frame.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

// av-decode:start
// Pure layout and decode state, shared with the panel preview (which evaluates this block as plain JS).
// Text is measured with the per-font advance tables from presets.json (`metrics`), passed in `data.fonts[i].metrics`,
// so the layout is identical in Node, the panel and the render. Lengths are canvas pixels; sizes are relative to the
// canvas height (reference: 1920x1080, "CINEMATIC" flat cap height 150 px, kicker cap 22 px, tagline cap 19 px).
// The title is laid out once with its final text: each letter keeps its final box while decoding, so nothing shifts.
var AV_TITLE_FACES = {
  // Anton drawn at 0.84 width matches the reference's ultra-condensed face (width, stem and bowl proportions).
  anton: { family: "AV Anton", weight: 400, condense: 0.84 },
  oswald: { family: "AV Oswald Bold", weight: 700, condense: 0.9 },
};
var AV_KICKER_FACE = { family: "AV Inter Medium", weight: 500 };
var AV_TAGLINE_FACE = { family: "AV Inter", weight: 400 };
// Style defaults per preset (the same values as presets.json `colors` / `taglineTracking` / `taglineSize`).
var AV_TITLE_PRESETS = {
  cinematic: { titleColor: "#FCE070", textColor: "#FFFFFF", taglineTracking: 0.5, taglineSize: 100 },
  "a-day-out": { titleColor: "#FFFFFF", textColor: "#FFFFFF", taglineTracking: 0.12, taglineSize: 80 },
  "golden-hour": { titleColor: "#F6E3C2", textColor: "#FFFFFF", taglineTracking: 0.5, taglineSize: 100 },
};
// Default timing in seconds from the clip start (the reference at k = 1; decorate passes the planner's scaled values,
// planner avOpeningTiming, with cutSeconds: the opening shot's length).
var AV_TIMING = { textIn: 2.4, decodeStart: 2.9, letterSeconds: 0.115 };
// Decode fit (avTiming): the title holds fully decoded for at least max(AV_HOLD_MIN, AV_HOLD_SHARE x cutSeconds) before
// the cut; a letter takes at least AV_LETTER_MIN s unless even starting at textIn cannot fit that.
var AV_HOLD_MIN = 0.8, AV_HOLD_SHARE = 0.25, AV_LETTER_MIN = 0.03;
// Graphemes per field, the presets' `max` (presets.json, the same for every preset). Adjust edits bypass the panel's
// counter, so the graphic cuts longer text itself.
var AV_FIELD_MAX = { kicker: 24, title: 16, tagline: 48 };
var AV_TITLE_CAP = 150 / 1080, AV_KICKER_CAP = 22 / 1080, AV_TAGLINE_CAP = 19 / 1080;
var AV_GAP_KICKER = 21 / 150, AV_GAP_TAGLINE = 22 / 150; // ink gaps, fractions of the title's cap height
var AV_FIT = 0.8; // max lockup width, fraction of canvas width
var AV_TITLE_FLOOR = 0.5, AV_SMALL_FLOOR = 0.6, AV_TRACK_FLOOR = 0.15;
var AV_GHOST_OPACITY = 0.5;
// Used only when a family's metrics are missing: a generic 0.56 em advance.
var AV_FALLBACK_METRICS = { unitsPerEm: 1000, xHeight: 500, capHeight: 700, ascent: 720, descent: -220, advances: {} };
// Korean text: no uppercase, no tracking, no condense. A wide character (Hangul, kana, CJK, fullwidth) has no advance
// in the bundled metrics: it is drawn in the system Korean face ("Apple SD Gothic Neo" on macOS, "Malgun Gothic" on
// Windows), whose metrics differ, so the render and the panel measure it with a canvas (avKoMeasure) and pass
// `data.koInk` ({ up, down } em) and `data.koAdvances` ({ char: em }). Without them (Node) a wide character counts as
// 1 em and its ink as 0.86 em above the baseline and 0.12 em below (tuned on Apple SD Gothic Neo).
var AV_HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
var AV_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
var AV_WIDE_UP = 0.86, AV_WIDE_DOWN = 0.12;
// Latin fallbacks per bundled family (macOS and Windows), then both Korean system faces before the generic family.
var AV_LATIN_FALLBACKS = {
  "AV Anton": 'Impact, "Arial Narrow"',
  "AV Oswald Bold": '"Arial Narrow", Impact',
  "AV Inter Medium": '"Segoe UI", "Helvetica Neue", Arial',
  "AV Inter": '"Segoe UI", "Helvetica Neue", Arial',
};
function avFontStack(family) {
  return '"' + family + '", ' + (AV_LATIN_FALLBACKS[family] || "Arial") + ', "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
}
function avHasHangul(text) { return AV_HANGUL_RE.test(String(text || "")); }
// Decode glyph pools: capitals, lower case, digits and common Hangul syllables (code points, no literal Hangul).
var AV_POOL_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var AV_POOL_LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
var AV_POOL_DIGIT = "0123456789".split("");
var AV_POOL_HANGUL = [0xAC00, 0xB098, 0xB2E4, 0xB77C, 0xB9C8, 0xBC14, 0xC0AC, 0xC544, 0xC790, 0xCC28, 0xCE74, 0xD0C0, 0xD30C, 0xD558,
  0xC11C, 0xC6B8, 0xC5EC, 0xD589, 0xC77C, 0xC0C1, 0xAE30, 0xB85D, 0xC2DC, 0xAC04, 0xBE5B, 0xB8E8, 0xC624, 0xB298, 0xC6B0, 0xB9AC, 0xB3C4,
  0xB78C, 0xAF43, 0xAE38, 0xBC24, 0xBCC4, 0xB178, 0xC744, 0xC601, 0xD654, 0xC21C, 0xAC10, 0xC815, 0xC5B5, 0xCD94, 0xD55C, 0xAD6D, 0xBD80,
  0xC0B0, 0xC81C, 0xC8FC, 0xAC70, 0xD48D, 0xACBD].map(function (c) { return String.fromCharCode(c); });

// Letters and numbers of any script (Unicode property escapes where the engine has them; else cased letters and wide
// glyphs).
var AV_LETTER_RE = (function () { try { return new RegExp("[\\p{L}\\p{N}]", "u"); } catch (e) { return null; } })();
function avIsLetter(ch) {
  return AV_LETTER_RE ? AV_LETTER_RE.test(ch) : ch.toUpperCase() !== ch.toLowerCase() || AV_WIDE_RE.test(ch) || /[0-9]/.test(ch);
}
// Grapheme clusters (Intl.Segmenter when the engine has it, else code points), so a letter with a combining mark or a
// surrogate pair is one decode position and counts once against AV_FIELD_MAX. Precomposed Latin, Hangul syllables and
// digits split the same either way; a combining sequence or an emoji sequence may count differently on an engine
// without Intl.Segmenter.
var AV_SEGMENTER = (function () {
  // Object(Intl): untyped, so the block type-checks against libs without Intl.Segmenter.
  try { var I = typeof Intl !== "undefined" ? Object(Intl) : null; return I && I.Segmenter ? new I.Segmenter(undefined, { granularity: "grapheme" }) : null; } catch (e) { return null; }
})();
function avGraphemes(text) {
  text = String(text || "");
  if (!AV_SEGMENTER) return Array.from(text);
  var out = [], it = AV_SEGMENTER.segment(text)[Symbol.iterator](), step = it.next();
  while (!step.done) { out.push(step.value.segment); step = it.next(); }
  return out;
}
// A grapheme's class, from its first code point: which pool its ghost glyphs come from. Each position flips through its
// own script's pool, so a mixed Latin / Hangul title keeps Latin ghosts on Latin letters. "space" and "fixed"
// (punctuation, symbols) take no decode time; "other" (a letter of another script) takes a step and ghosts as itself.
function avCharClass(ch) {
  var c = Array.from(String(ch || " "))[0];
  if (/\s/.test(c)) return "space";
  if (AV_HANGUL_RE.test(c)) return "hangul";
  if (/[0-9]/.test(c)) return "digit";
  if (/[A-Z\u00c0-\u00d6\u00d8-\u00de\u0100-\u024f]/.test(c) && c !== c.toLowerCase()) return "upper";
  if (/[a-z\u00df-\u00f6\u00f8-\u00ff\u0100-\u024f]/.test(c)) return "lower";
  return avIsLetter(c) ? "other" : "fixed";
}
// Classes that take a decode step.
function avLockable(cls) { return cls !== "space" && cls !== "fixed"; }
function avPool(cls, ch) {
  return cls === "hangul" ? AV_POOL_HANGUL : cls === "digit" ? AV_POOL_DIGIT : cls === "upper" ? AV_POOL_UPPER : cls === "lower" ? AV_POOL_LOWER : [ch];
}
// Integer hash of (letter index, frame): the same ghost in the panel preview, the Draft preview and the export.
function avHash(a, b) {
  var h = (Math.imul(a + 1, 374761393) + Math.imul(b + 7, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
// The ghost glyph letter `index` shows at `frame`: never its own final character when the pool has another.
function avGhostChar(ch, index, frame) {
  var pool = avPool(avCharClass(ch), ch);
  var at = avHash(index, frame) % pool.length;
  if (pool[at] === ch && pool.length > 1) at = (at + 1) % pool.length;
  return pool[at];
}

// Wide-glyph metrics from `data`: measured values when valid, else the constants above.
function avKoWide(data) {
  var ink = data && data.koInk, adv = data && data.koAdvances;
  var ok = ink && typeof ink.up === "number" && typeof ink.down === "number" && ink.up > 0.3 && ink.up < 1.5 && ink.down >= 0 && ink.down < 0.6;
  return { up: ok ? ink.up : AV_WIDE_UP, down: ok ? ink.down : AV_WIDE_DOWN, adv: adv && typeof adv === "object" ? adv : null };
}
function avKoAdvance(kw, ch) {
  var a = kw && kw.adv ? kw.adv[ch] : undefined;
  return typeof a === "number" && isFinite(a) && a > 0.2 && a < 2 ? a : 1;
}
// Measures the wide glyphs on a 2D canvas with the exact stack and weight the title draws them with (call it once the
// fonts are loaded): { koInk, koAdvances } to merge into `data`, or null in Node or when the text has no wide glyph.
// Ink comes from a Hangul sample; advances from each wide character of the kicker, title, tagline and (for a title
// with Hangul) the decode pool. Hangul syllables share one advance across the weights of the Korean system faces, so
// the kicker and tagline use the same table.
function avKoMeasure(data) {
  data = data || {};
  var f = avTitleFields(data), text = f.kicker + f.title + f.tagline;
  if (!AV_WIDE_RE.test(text) || typeof document === "undefined" || !document.createElement) return null;
  var ctx = null;
  try { ctx = document.createElement("canvas").getContext("2d"); } catch (e) { ctx = null; }
  if (!ctx || typeof ctx.measureText !== "function") return null;
  var face = AV_TITLE_FACES[data.font] || AV_TITLE_FACES.anton, px = 100;
  ctx.font = "700 " + px + "px " + avFontStack(face.family);
  // Built in one literal at the end (the panel type-checks this block: no keys added later). Object({}) is an
  // untyped map for the per-character advances.
  var s = ctx.measureText("\ud55c\uae00");
  var ink = s && s.actualBoundingBoxAscent > 0 && s.actualBoundingBoxDescent >= 0 ? { up: s.actualBoundingBoxAscent / px, down: s.actualBoundingBoxDescent / px } : null;
  var adv = Object({}), chars = Array.from(text).concat(avHasHangul(f.title) ? AV_POOL_HANGUL : []);
  for (var i = 0; i < chars.length; i++) {
    if (AV_WIDE_RE.test(chars[i]) && !(chars[i] in adv)) adv[chars[i]] = ctx.measureText(chars[i]).width / px;
  }
  return ink ? { koAdvances: adv, koInk: ink } : { koAdvances: adv };
}

function avMetrics(data, family) {
  var fonts = data && Array.isArray(data.fonts) ? data.fonts : [];
  for (var i = 0; i < fonts.length; i++) if (fonts[i] && fonts[i].family === family && fonts[i].metrics) return fonts[i].metrics;
  return AV_FALLBACK_METRICS;
}
// `kw` (avKoWide) supplies measured wide advances; Latin always comes from the metrics (or the 0.56 em fallback).
function avAdvance(m, ch, kw) {
  var a = m.advances[ch];
  return typeof a === "number" ? a : (AV_WIDE_RE.test(ch) ? avKoAdvance(kw, ch) : 0.56) * m.unitsPerEm;
}
// Advance width of `text` at `px` (kerning ignored), plus `tracking` em between letters (CSS letter-spacing also
// follows the last letter, but that space is never visible).
function avTextWidth(text, m, px, tracking, kw) {
  var units = 0, chars = Array.from(text);
  for (var i = 0; i < chars.length; i++) units += avAdvance(m, chars[i], kw);
  return (units * px) / m.unitsPerEm + (tracking || 0) * px * Math.max(0, chars.length - 1);
}
// Ink extents above / below the baseline in em.
function avInk(text, m, kw) {
  var up = m.xHeight, down = 0;
  if (/[A-Z0-9bdfhklt\u00c0-\u00de\u00df!?'"&%$#@/\\|(){}[\]]/.test(text)) up = Math.max(up, m.capHeight);
  if (/[gjpqy,;()[\]{}|]/.test(text)) down = -m.descent;
  if (AV_WIDE_RE.test(text)) { up = Math.max(up, kw.up * m.unitsPerEm); down = Math.max(down, kw.down * m.unitsPerEm); }
  return { up: up / m.unitsPerEm, down: down / m.unitsPerEm };
}
// Latin is set in capitals; text with Hangul keeps its case.
function avCase(text) { return avHasHangul(text) ? text : text.toUpperCase(); }

// The three text fields, each cut to AV_FIELD_MAX graphemes (after the case change, which can lengthen a word).
function avTitleFields(data) {
  var raw = data.fields || {};
  // Adjust edits land on flat keys (data.title, ...), so a flat string wins over data.fields.
  var pick = function (k) {
    var v = typeof data[k] === "string" ? data[k] : raw[k];
    var g = avGraphemes(avCase(typeof v === "string" ? v.replace(/\s+/g, " ").trim() : ""));
    return g.slice(0, AV_FIELD_MAX[k]).join("").trim();
  };
  return { kicker: pick("kicker"), title: pick("title"), tagline: pick("tagline") };
}
function avNum(v, d, lo, hi) { return typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }

// A one-line text item (kicker, tagline): x = left edge, y = baseline; `tracking` em (0 with Hangul).
function avLine(part, text, face, m, size, tracking, color, kw) {
  var tr = avHasHangul(text) ? 0 : tracking;
  return { part: part, text: text, family: face.family, weight: face.weight, stack: avFontStack(face.family), size: size, tracking: tr, color: color,
    w: avTextWidth(text, m, size, tr, kw), ink: avInk(text, m, kw), x: 0, y: 0 };
}

// The lockup at canvas size: { title: { letters, size, y, ... } | null, kicker, tagline, box, steps }.
function avTitleLayout(data, width, height) {
  data = data || {};
  var W = width > 0 ? width : 1920, H = height > 0 ? height : 1080;
  var preset = AV_TITLE_PRESETS[data.preset] || AV_TITLE_PRESETS.cinematic;
  var fields = avTitleFields(data);
  var S = avNum(data.size, 100, 60, 160) / 100;
  var titleColor = typeof data.titleColor === "string" && data.titleColor ? data.titleColor : preset.titleColor;
  var textColor = typeof data.textColor === "string" && data.textColor ? data.textColor : preset.textColor;
  var face = AV_TITLE_FACES[data.font] || AV_TITLE_FACES.anton;
  var mt = avMetrics(data, face.family), mk = avMetrics(data, AV_KICKER_FACE.family), mg = avMetrics(data, AV_TAGLINE_FACE.family);
  var fitW = AV_FIT * W, kw = avKoWide(data);
  // Title: sized by the face's cap height, condensed (Latin only), shrunk to the fit width down to a floor.
  var title = null;
  if (fields.title) {
    var ko = avHasHangul(fields.title), cx = ko ? 1 : face.condense;
    var F0 = (AV_TITLE_CAP * H * S) / (mt.capHeight / mt.unitsPerEm);
    // One letter box per grapheme, advanced by its first code point (a combining mark adds no width).
    var chars = avGraphemes(fields.title), units = 0;
    for (var u = 0; u < chars.length; u++) units += avAdvance(mt, Array.from(chars[u])[0], kw);
    var w0 = ((units * F0) / mt.unitsPerEm) * cx;
    var F = F0 * Math.max(AV_TITLE_FLOOR, Math.min(1, fitW / w0));
    var pen = 0, step = 0, letters = [];
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i], cls = avCharClass(ch), w = (avAdvance(mt, Array.from(ch)[0], kw) * F * cx) / mt.unitsPerEm;
      // step: the letter's decode step (-1 for a space or punctuation); at: the step from which it is drawn (a
      // punctuation mark is drawn solid once every letter before it has locked).
      var lock = avLockable(cls);
      letters.push({ ch: ch, cls: cls, x: pen, w: w, step: lock ? step : -1, at: step });
      if (lock) step++;
      pen += w;
    }
    title = { part: "title", text: fields.title, family: face.family, weight: face.weight, stack: avFontStack(face.family), size: F, condense: cx,
      color: titleColor, w: pen, ink: avInk(fields.title, mt, kw), x: 0, y: 0, letters: letters, steps: step,
      // Hangul is drawn in the system Korean face, whose regular weight looks light next to Anton.
      koWeight: 700 };
  }
  var capPx = title ? (title.size * mt.capHeight) / mt.unitsPerEm : AV_TITLE_CAP * H * S;
  var kicker = fields.kicker ? avLine("kicker", fields.kicker, AV_KICKER_FACE, mk, (AV_KICKER_CAP * H * S) / (mk.capHeight / mk.unitsPerEm), 0, textColor, kw) : null;
  var tagline = null;
  if (fields.tagline) {
    var Fg = ((AV_TAGLINE_CAP * H * S) / (mg.capHeight / mg.unitsPerEm)) * (preset.taglineSize / 100);
    tagline = avLine("tagline", fields.tagline, AV_TAGLINE_FACE, mg, Fg, avNum(data.taglineTracking, preset.taglineTracking, 0, 1), textColor, kw);
    // Too wide: less tracking first (down to a floor), then a smaller size.
    if (tagline.w > fitW && tagline.tracking > AV_TRACK_FLOOR) {
      var n = Array.from(tagline.text).length - 1, plain = avTextWidth(tagline.text, mg, Fg, 0, kw);
      var tr = n > 0 ? Math.max(AV_TRACK_FLOOR, (fitW - plain) / (n * Fg)) : 0;
      tagline = avLine("tagline", fields.tagline, AV_TAGLINE_FACE, mg, Fg, Math.min(tagline.tracking, tr), textColor, kw);
    }
    if (tagline.w > fitW) tagline = avLine("tagline", fields.tagline, AV_TAGLINE_FACE, mg, Fg * Math.max(AV_SMALL_FLOOR, fitW / tagline.w), tagline.tracking, textColor, kw);
  }
  if (kicker && kicker.w > fitW) kicker = avLine("kicker", fields.kicker, AV_KICKER_FACE, mk, kicker.size * Math.max(AV_SMALL_FLOOR, fitW / kicker.w), 0, textColor, kw);
  // Stack top to bottom (ink to ink), each line centred on x = 0; the title baseline is y = 0.
  var top = title ? -title.ink.up * title.size : 0, bottom = title ? title.ink.down * title.size : 0;
  if (title) title.x = -title.w / 2;
  if (kicker) {
    kicker.x = -kicker.w / 2;
    kicker.y = title ? top - AV_GAP_KICKER * capPx - kicker.ink.down * kicker.size : 0;
  }
  if (tagline) {
    tagline.x = -tagline.w / 2;
    tagline.y = title || kicker ? (title ? bottom : kicker.y + kicker.ink.down * kicker.size) + AV_GAP_TAGLINE * capPx + tagline.ink.up * tagline.size : 0;
  }
  var parts = [kicker, title, tagline].filter(Boolean);
  if (!parts.length) return { title: null, kicker: null, tagline: null, box: null, steps: 0 };
  var box = [Infinity, Infinity, -Infinity, -Infinity];
  parts.forEach(function (p) {
    box = [Math.min(box[0], p.x), Math.min(box[1], p.y - p.ink.up * p.size), Math.max(box[2], p.x + p.w), Math.max(box[3], p.y + p.ink.down * p.size)];
  });
  // Never wider than the fit width (a long title past its floor): scale everything, then centre the ink box.
  var k = Math.min(1, fitW / (box[2] - box[0]));
  var ax = (avNum(data.x, 50, 20, 80) / 100) * W, ay = (avNum(data.y, 48, 20, 80) / 100) * H;
  var bx = (box[0] + box[2]) / 2, by = (box[1] + box[3]) / 2;
  var tx = function (v) { return ax + (v - bx) * k; }, ty = function (v) { return ay + (v - by) * k; };
  var place = function (p) {
    if (!p) return null;
    var o = Object.assign({}, p, { x: tx(p.x), y: ty(p.y), size: p.size * k, w: p.w * k });
    o.box = [o.x, o.y - p.ink.up * o.size, o.x + o.w, o.y + p.ink.down * o.size];
    if (p.letters) o.letters = p.letters.map(function (l) { return Object.assign({}, l, { x: o.x + l.x * k, w: l.w * k }); });
    return o;
  };
  return { title: place(title), kicker: place(kicker), tagline: place(tagline), box: [tx(box[0]), ty(box[1]), tx(box[2]), ty(box[3])], steps: title ? title.steps : 0, metrics: mt };
}

// Timing in seconds for a title of `steps` decode steps (its lockable graphemes; spaces and punctuation take none) at
// `fps` (default 30): { textIn, decodeStart, letterSeconds, cutSeconds, minHold, fit }. data.timing is the planner's
// avOpeningTiming ({ revealStart?, revealEnd?, k?, textIn, decodeStart, letterSeconds, cutSeconds? }; the reveal keys
// are accepted so the object can be passed whole). `speed` (%, clamped to 25-400) scales the letter rate:
// base = letterSeconds x 100 / speed.
// Fit, when cutSeconds (the opening shot's length) is given and the title has steps: the last letter must lock by
// end = cutSeconds - minHold - 2 / fps, minHold = max(AV_HOLD_MIN, AV_HOLD_SHARE x cutSeconds) (the 2 frames cover the
// frame rounding of decodeStart and of the last lock, so the hold is >= minHold in whole frames).
//   1. letterSeconds = min(base, max(AV_LETTER_MIN, (end - decodeStart) / steps)): never slower than asked, faster
//      when the decode would run into the hold ('letters').
//   2. Still past end at AV_LETTER_MIN per letter: the decode starts earlier, decodeStart = max(textIn, end - steps x
//      AV_LETTER_MIN) ('early').
//   3. Still past end (decodeStart = textIn): letterSeconds = max(0, (end - textIn) / steps), several letters per frame;
//      0 (textIn already past end) draws the title whole at textIn ('squeezed').
// fit is 'none' when nothing changed. Without cutSeconds (older Drafts) the timing is as before: decodeStart and base.
function avTiming(data, steps, fps) {
  var t = (data && data.timing) || {};
  var f = fps > 0 ? fps : 30, n = steps > 0 ? steps : 0;
  var textIn = avNum(t.textIn, AV_TIMING.textIn, 0, 600);
  var decodeStart = Math.max(textIn, avNum(t.decodeStart, AV_TIMING.decodeStart, 0, 600));
  var ls = avNum(t.letterSeconds, AV_TIMING.letterSeconds, 0.005, 5) * (100 / avNum(data && data.speed, 100, 25, 400));
  var cut = avNum(t.cutSeconds, 0, 0, 600), minHold = cut > 0 ? Math.max(AV_HOLD_MIN, AV_HOLD_SHARE * cut) : 0, fit = "none";
  if (cut > 0 && n > 0) {
    var end = cut - minHold - 2 / f;
    var fitLs = Math.min(ls, Math.max(AV_LETTER_MIN, (end - decodeStart) / n));
    if (fitLs < ls) { ls = fitLs; fit = "letters"; }
    if (decodeStart + n * ls > end + 1e-9) { decodeStart = Math.max(textIn, end - n * ls); fit = "early"; }
    if (decodeStart + n * ls > end + 1e-9) { ls = Math.max(0, (end - decodeStart) / n); fit = "squeezed"; }
  }
  return { textIn: textIn, decodeStart: decodeStart, letterSeconds: ls, cutSeconds: cut, minHold: minHold, fit: fit };
}

// What to draw at `frame` (timeline frame = clip frame): { textOpacity, glyphs: [{ ch, x (left), y (baseline), size,
// condense, opacity, ghost, family, weight, stack, color }], decoded }. Before textIn: nothing. From textIn: kicker and
// tagline (fading in over 3 frames). From decodeStart (avTiming, fitted before the cut): letter k (k-th lockable
// grapheme) shows a ghost glyph during [decodeStart + k * letterSeconds, decodeStart + (k + 1) * letterSeconds), then
// is drawn solid; letters after it are empty. Spaces are never drawn; punctuation takes no time and is drawn solid
// once every letter before it has locked.
function avDecodeFrame(layout, data, frame, fps) {
  var t = layout && layout.title, f = fps > 0 ? fps : 30;
  var tm = avTiming(data || {}, t ? t.steps : 0, f);
  var inF = Math.round(tm.textIn * f), decF = Math.round(tm.decodeStart * f), lsF = tm.letterSeconds * f;
  var out = { textOpacity: 0, glyphs: [], decoded: 0 };
  if (!layout || !layout.box || frame < inF) return out;
  out.textOpacity = Math.min(1, (frame - inF + 1) / 3);
  if (!t || frame < decF) return out;
  // The step showing a ghost (>= steps: all locked); a zero letter time locks everything at decodeStart.
  var now = lsF > 0 ? Math.floor((frame - decF) / lsF + 1e-9) : t.steps;
  var m = layout.metrics || AV_FALLBACK_METRICS, kw = avKoWide(data);
  for (var i = 0; i < t.letters.length; i++) {
    var l = t.letters[i];
    if (l.cls === "space") continue;
    if (l.step < 0 ? l.at > now : l.step > now) continue;
    var ghost = l.step >= 0 && l.step === now, ch = ghost ? avGhostChar(l.ch, i, frame) : l.ch;
    // A ghost glyph is centred in the final letter's box (its own advance may differ).
    var gw = ghost ? (avAdvance(m, Array.from(ch)[0], kw) * t.size * t.condense) / m.unitsPerEm : l.w;
    var ko = AV_HANGUL_RE.test(ch);
    out.glyphs.push({ ch: ch, x: l.x + (l.w - gw) / 2, y: t.y, size: t.size, condense: t.condense, opacity: ghost ? AV_GHOST_OPACITY : 1, ghost: ghost,
      family: t.family, weight: ko ? t.koWeight : t.weight, stack: t.stack, color: t.color });
  }
  out.decoded = Math.min(t.steps, now);
  return out;
}
// av-decode:end

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export default function ArchiveDecodeTitle({ data: raw }: { data: any }) {
  const data = (raw || {}) as any;
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const width = num(config && config.width, 1920);
  const height = num(config && config.height, 1080);
  const fps = num(config && config.fps, 30);
  const fonts: any[] = Array.isArray(data.fonts) ? data.fonts.filter((f: any) => f && f.b64) : [];
  // Wide (Hangul) text is measured on a canvas once the fonts are loaded, so the render waits for that too.
  const fields = avTitleFields(data);
  const wideText = AV_WIDE_RE.test(fields.kicker + fields.title + fields.tagline) ? fields.kicker + fields.title + fields.tagline : "";
  const [ready, setReady] = useState(fonts.length === 0 && !wideText);
  const [handle] = useState(() => ((fonts.length || wideText) && typeof document !== "undefined" && document.fonts ? delayRender("archive vlog title fonts") : null));
  const released = useRef(false);
  const release = () => {
    if (handle != null && !released.current) { released.current = true; continueRender(handle); }
  };
  useEffect(() => {
    if (ready) return;
    let live = true;
    const done = () => { if (live) setReady(true); };
    if (typeof document === "undefined" || !document.fonts) { done(); return; }
    const loads = fonts.map((f) => document.fonts.load(`${f.style || "normal"} ${f.weight} 100px "${f.family}"`).catch(() => null));
    // The Korean system face the wide glyphs fall back to (Apple SD Gothic Neo / Malgun Gothic).
    if (wideText) loads.push(document.fonts.load(`700 100px ${avFontStack(((AV_TITLE_FACES as any)[data.font] || AV_TITLE_FACES.anton).family)}`, wideText).catch(() => null));
    Promise.all(loads).finally(done);
    return () => { live = false; };
  }, [ready]);
  useEffect(() => { if (ready) release(); }, [ready, handle]);
  // Never leave the render blocked if the graphic unmounts before the fonts settle.
  useEffect(() => release, []);

  // Measured wide-glyph metrics (koInk / koAdvances) once the fonts are in; null for Latin-only text.
  const ko: any = useMemo(() => (ready ? avKoMeasure(data) : null), [ready, raw]);
  const mdata = useMemo(() => (ko ? Object.assign({}, data, ko) : data), [ko, raw]);
  // The layout depends only on the parameters and the canvas size; the frame only picks what is drawn.
  const layout: any = useMemo(() => avTitleLayout(mdata, width, height), [mdata, width, height]);
  const state: any = avDecodeFrame(layout, mdata, frame, fps);
  const shadow = Math.max(0, Math.min(1, num(data.shadow, 0.3)));
  const fontFaces = fonts.map((f) => `@font-face{font-family:"${f.family}";src:url("data:font/woff2;base64,${f.b64}") format("woff2");font-style:${f.style || "normal"};font-weight:${f.weight};}`).join("");
  const blur = height * 0.01, drop = height * 0.003;
  const line = (p: any) => (p ? (
    <text x={p.x} y={p.y} fill={p.color} fontSize={p.size} fontFamily={p.stack} fontWeight={p.weight} opacity={state.textOpacity}
      style={{ whiteSpace: "pre", fontKerning: "none", fontVariantLigatures: "none", letterSpacing: p.tracking * p.size }}>{p.text}</text>
  ) : null);
  return (
    <AbsoluteFill>
      {fontFaces ? <style>{fontFaces}</style> : null}
      {state.textOpacity > 0 ? (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: shadow > 0 ? `drop-shadow(0 ${drop}px ${blur}px rgba(0,0,0,${shadow}))` : undefined }}>
          {line(layout.kicker)}
          {state.glyphs.map((g: any, i: number) => (
            <text key={i} transform={`translate(${g.x} ${g.y}) scale(${g.condense} 1)`} x={0} y={0} fill={g.color} opacity={g.opacity} fontSize={g.size} fontFamily={g.stack} fontWeight={g.weight}
              style={{ whiteSpace: "pre", fontKerning: "none", fontVariantLigatures: "none" }}>{g.ch}</text>
          ))}
          {line(layout.tagline)}
        </svg>
      ) : null}
    </AbsoluteFill>
  );
}
