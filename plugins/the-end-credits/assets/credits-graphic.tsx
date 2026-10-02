// THE END Credits: a typed serif title, then a slow linear credit roll in a masked text column.
// Classic: left column on black. Full frame: the title types big over the footage, then moves
// to the right-third column where the roll runs over a right-side gradient.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

// tec-graphic:start
// All lengths are for a 1080 px tall reference frame unless named as a fraction of W or H.
var TEC_REF_H = 1080;
var TEC_DEFAULT_SPEED = 67; // px/s at 1080p (the reference roll speed)
// The credits roll completely off the top before the video ends: the last line's bottom crosses y = 0 this many
// seconds before endFrame, and the last 0.3 s show no credit text while the window finishes fading. Reference
// (measured on its clean render): a constant ~67 px/s roll to the very end, the last name line's bottom at 2.4 % of H
// on the final frame (it would clear the frame about 0.4 s later); the window fades over the last 1.13 s.
var TEC_ROLL_EXIT_LEAD_SEC = 0.3;
var TEC_LEAD_IN_SEC = 5.1;
var TEC_LAYOUTS = {
  // colX: column centre (fraction of W); colW: credit line width limit (fraction of W);
  // titleMaxW: max visible title width at the column size (fraction of W);
  // capCentre: y of the title's cap-height centre when the roll starts (fraction of H).
  classic: { colX: 0.223, colW: 0.4, titleMaxW: 0.34, capCentre: 0.47 },
  full: { colX: 0.78, colW: 0.3, titleMaxW: 0.34, capCentre: 0.28 },
};
// Full frame typing position: big title, left edge at bigLeft·W, cap centre at bigCapCentre·H.
var TEC_FULL_BIG = { cap: 0.2, left: 0.08, maxW: 0.6, capCentre: 0.5 };
// Title face metrics (TEC Title Serif = Roboto Serif wdth 50 / wght 800 / opsz 144), in em.
var TEC_TITLE = { capFrac: 0.16, cap: 0.71, ascent: 0.927, descent: 0.244, scaleX: 0.78 };
// Credit face metrics (TEC Credits Sans = Poppins SemiBold), in em; sizes and gaps in px at 1080p.
// Line box = ascent + descent (1.4 em), so a line's top is its baseline minus ascent·size.
var TEC_CREDITS = { ascent: 1.05, descent: 0.35, roleSize: 28, nameSize: 24, gap: 105, roleToName: 43, pitch: 123, minFit: 0.7 };
var TEC_TYPING = { start: 0.47, maxSlot: 0.42, budget: 4.4 };
var TEC_CREDITS_FADE = { from: 4.0, to: 6.0 };
var TEC_MASK = { band: 0.14, floor: 0.35 };
// The gradient is clear up to gradFrom, reaches gradAlpha at gradTo and holds to the right edge, so the whole credit
// column (63-93 % of W) sits on the dark part (live check: cream text over a white wall was hard to read).
var TEC_FULL_FX = { moveSec: 0.8, overlayLead: 0.5, overlaySec: 1.0, scrim: 0.25, gradFrom: 0.4, gradTo: 0.62, gradAlpha: 0.75 };

function tecClamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

// Hangul (v1: the macOS system faces at the end of each font stack). Hangul is never squeezed: a title holding any
// Hangul is drawn at scaleX 1, so a mixed Latin + Hangul title is not condensed either.
var TEC_HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
// Wide characters (Hangul, kana, CJK, fullwidth forms) for the width estimate without a canvas.
var TEC_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
function tecHasHangul(text) { return TEC_HANGUL_RE.test(typeof text === "string" ? text : ""); }
function tecTitleScaleX(text) { return tecHasHangul(text) ? 1 : TEC_TITLE.scaleX; }
// Advance width without a canvas: wide characters 1.0 em, anything else the 0.6 em Latin average.
function tecFallbackWidth(text, px) {
  var w = 0;
  Array.from(typeof text === "string" ? text : "").forEach(function (ch) { w += TEC_WIDE_RE.test(ch) ? 1 : 0.6; });
  return w * px;
}

// Typing: one slot per code point (Array.from); the space takes a slot; no cursor.
function tecTyping(text) {
  var n = Array.from(typeof text === "string" ? text : "").length;
  var slotSec = n > 0 ? Math.min(TEC_TYPING.maxSlot, TEC_TYPING.budget / n) : TEC_TYPING.maxSlot;
  return { n: n, slotSec: slotSec, startSec: TEC_TYPING.start };
}
function tecSlotStart(i, n) {
  return TEC_TYPING.start + i * (n > 0 ? Math.min(TEC_TYPING.maxSlot, TEC_TYPING.budget / n) : TEC_TYPING.maxSlot);
}
// Number of glyphs visible at tSec.
function tecTypedCount(tSec, n) {
  if (!(n > 0) || !(tSec >= TEC_TYPING.start)) return 0;
  var slot = Math.min(TEC_TYPING.maxSlot, TEC_TYPING.budget / n);
  return Math.min(n, Math.floor((tSec - TEC_TYPING.start) / slot + 1e-9) + 1);
}

// Upward roll offset in px of the actual frame: 0 before revealFrame, then linear forever.
function tecScrollY(frame, revealFrame, fps, speedPxPerSec, speed, H) {
  if (!(frame > revealFrame) || !(fps > 0)) return 0;
  var v = (speedPxPerSec > 0 ? speedPxPerSec : TEC_DEFAULT_SPEED) * (speed > 0 ? speed : 1);
  return ((frame - revealFrame) / fps) * v * (H / TEC_REF_H);
}

function tecCreditsOpacity(tSec) {
  return tecClamp01((tSec - TEC_CREDITS_FADE.from) / (TEC_CREDITS_FADE.to - TEC_CREDITS_FADE.from));
}

// Column mask alpha at yFrac = y/H: 0.35 at the frame edges, 1 inside [band, 1 − band].
function tecMaskAlpha(yFrac) {
  var b = TEC_MASK.band, f = TEC_MASK.floor;
  if (yFrac <= 0 || yFrac >= 1) return f;
  if (yFrac < b) return f + (1 - f) * (yFrac / b);
  if (yFrac > 1 - b) return f + (1 - f) * ((1 - yFrac) / b);
  return 1;
}
function tecMaskCss() {
  var f = TEC_MASK.floor, b = Math.round(TEC_MASK.band * 10000) / 100;
  var edge = "rgba(0,0,0," + f + ")";
  return "linear-gradient(to bottom, " + edge + " 0%, #000 " + b + "%, #000 " + Math.round((100 - b) * 100) / 100 + "%, " + edge + " 100%)";
}

function tecEaseInOut(p) {
  var x = tecClamp01(p);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
// Full frame: move progress (eased) from L − 0.8 s to L.
function tecFullMove(tSec, L) {
  return tecEaseInOut((tSec - (L - TEC_FULL_FX.moveSec)) / TEC_FULL_FX.moveSec);
}
// Full frame: the 25 % scrim fades out while the right gradient fades in, over 1 s from L − 0.5.
function tecFullOverlay(tSec, L) {
  var g = tecClamp01((tSec - (L - TEC_FULL_FX.overlayLead)) / TEC_FULL_FX.overlaySec);
  return { scrim: TEC_FULL_FX.scrim * (1 - g), gradient: g };
}

// Credit rows: scalar role1..roleK / name1..nameK win whenever the key exists (even ""),
// otherwise rows[i]. K = rowCount when given, else rows.length. Rows blank on both sides drop.
function tecResolveRows(data) {
  var d = data || {};
  var rows = Array.isArray(d.rows) ? d.rows : [];
  var K = typeof d.rowCount === "number" && isFinite(d.rowCount) && d.rowCount >= 0 ? Math.floor(d.rowCount) : rows.length;
  var has = function (k) { return Object.prototype.hasOwnProperty.call(d, k) && d[k] !== null && d[k] !== undefined; };
  var out = [];
  for (var i = 1; i <= K; i++) {
    var r = rows[i - 1] || {};
    var role = has("role" + i) ? String(d["role" + i]) : typeof r.role === "string" ? r.role : "";
    var name = has("name" + i) ? String(d["name" + i]) : typeof r.name === "string" ? r.name : "";
    if (role.trim() === "" && name.trim() === "") continue;
    out.push({ role: role, name: name });
  }
  return out;
}

// Font size that makes a width fit a box: the target when it fits, else scaled down in proportion.
function tecFitSize(targetPx, measuredWidthAtTarget, boxPx) {
  if (!(targetPx > 0)) return 0;
  if (!(measuredWidthAtTarget > 0) || !(boxPx > 0) || measuredWidthAtTarget <= boxPx) return targetPx;
  return (targetPx * boxPx) / measuredWidthAtTarget;
}

// One credit line: fit to the box down to 70 % of its size; beyond that, break at the space that
// makes the wider half narrowest and fit both halves together (again not below 70 %).
// measure(text, px) returns the advance width in px.
function tecFitLine(text, nominalPx, boxPx, measure) {
  var min = nominalPx * TEC_CREDITS.minFit;
  var w = measure(text, nominalPx);
  var one = tecFitSize(nominalPx, w, boxPx);
  if (one >= min - 1e-9) return { lines: [text], size: one };
  var best = null;
  for (var i = 0; i < text.length; i++) {
    if (text[i] !== " ") continue;
    var a = text.slice(0, i).trim(), b = text.slice(i + 1).trim();
    if (!a || !b) continue;
    var wide = Math.max(measure(a, nominalPx), measure(b, nominalPx));
    if (best === null || wide < best.wide) best = { lines: [a, b], wide: wide };
  }
  if (best === null) return { lines: [text], size: min };
  return { lines: best.lines, size: Math.max(min, tecFitSize(nominalPx, best.wide, boxPx)) };
}

// Title sizes. measure(text, px) is the unscaled advance; the visible width is ×scaleX (tecTitleScaleX: 1 with Hangul).
// size: the column size (cap 16 % of H, fitted to titleMaxW·W); big: the Full frame typing size.
function tecTitleSizes(text, layout, W, H, measure) {
  var L = TEC_LAYOUTS[layout] || TEC_LAYOUTS.classic;
  var sx = tecTitleScaleX(text);
  var target = (TEC_TITLE.capFrac * H) / TEC_TITLE.cap;
  var perPx = text ? (measure(text, target) * sx) / target : 0; // visible width per px of font size
  var size = tecFitSize(target, perPx * target, L.titleMaxW * W);
  var bigTarget = (TEC_FULL_BIG.cap * H) / TEC_TITLE.cap;
  var big = tecFitSize(bigTarget, perPx * bigTarget, TEC_FULL_BIG.maxW * W);
  return { size: size, big: big, widthPerPx: perPx };
}

// Title placement before the roll offset: centre x, cap-centre y and font size (px).
function tecTitlePose(tSec, L, layout, sizes, W, H) {
  var col = TEC_LAYOUTS[layout] || TEC_LAYOUTS.classic;
  var end = { cx: col.colX * W, cy: col.capCentre * H, size: sizes.size };
  if (layout !== "full") return end;
  var start = { cx: TEC_FULL_BIG.left * W + (sizes.widthPerPx * sizes.big) / 2, cy: TEC_FULL_BIG.capCentre * H, size: sizes.big };
  var p = tecFullMove(tSec, L);
  return { cx: start.cx + (end.cx - start.cx) * p, cy: start.cy + (end.cy - start.cy) * p, size: start.size + (end.size - start.size) * p, p: p };
}

// Credit layout before the roll offset. measure(text, kind, px) with kind "role" | "name".
// Baselines stay on the nominal grid when a line is fit-shrunk; a wrapped line adds one nominal
// line height (1.4 em) to its pair. roleTop = the role line-box top (baseline − ascent·size). lastLineBottom = the
// line-box bottom (baseline + descent·size) of the last drawn line: the last pair's last name line, or its last role
// line when it has no name.
function tecCreditLayout(rows, layout, W, H, titleSize, measure) {
  var col = TEC_LAYOUTS[layout] || TEC_LAYOUTS.classic;
  var s = H / TEC_REF_H, C = TEC_CREDITS;
  var lh = C.ascent + C.descent;
  var titleBaseline = col.capCentre * H + (TEC_TITLE.cap * titleSize) / 2;
  var box = col.colW * W;
  var roleSize = C.roleSize * s, nameSize = C.nameSize * s;
  var roleBase = titleBaseline + C.gap * s + C.ascent * roleSize;
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var role = rows[i].role.trim() ? tecFitLine(rows[i].role, roleSize, box, function (t, px) { return measure(t, "role", px); }) : { lines: [], size: roleSize };
    var name = rows[i].name.trim() ? tecFitLine(rows[i].name, nameSize, box, function (t, px) { return measure(t, "name", px); }) : { lines: [], size: nameSize };
    var roleExtra = Math.max(0, role.lines.length - 1) * lh * roleSize;
    var nameExtra = Math.max(0, name.lines.length - 1) * lh * nameSize;
    var roleBaselines = role.lines.map(function (_, k) { return roleBase + k * lh * roleSize; });
    var nameBase = roleBase + C.roleToName * s + roleExtra;
    var nameBaselines = name.lines.map(function (_, k) { return nameBase + k * lh * nameSize; });
    out.push({
      roleTop: roleBase - C.ascent * roleSize,
      role: { lines: role.lines, size: role.size, baselines: roleBaselines },
      name: { lines: name.lines, size: name.size, baselines: nameBaselines },
    });
    roleBase += C.pitch * s + roleExtra + nameExtra;
  }
  var lastLineBottom = null;
  if (out.length) {
    var lr = out[out.length - 1], part = lr.name.lines.length ? lr.name : lr.role;
    if (part.lines.length) lastLineBottom = part.baselines[part.baselines.length - 1] + C.descent * part.size;
  }
  return { titleBaseline: titleBaseline, colX: col.colX * W, colW: box, rows: out, lastRoleTop: out.length ? out[out.length - 1].roleTop : null, lastLineBottom: lastLineBottom };
}
// Roll speed in px/s at 1080p that takes the last line's bottom to y = 0 at endFrame − 0.3 s, from this graphic's own
// layout (the real fonts), clamped to 0.6-1.6x the reference 67 px/s (at 1.6x with too many rows the text can't clear
// the top by then; the panel says so). No rows or no end: the reference speed.
function tecFitSpeed(lastLineBottom, endFrame, revealFrame, fps, H) {
  var s = H / TEC_REF_H, secs = (endFrame - revealFrame) / fps - TEC_ROLL_EXIT_LEAD_SEC;
  if (lastLineBottom == null || !(secs > 0) || !(s > 0)) return TEC_DEFAULT_SPEED;
  var raw = lastLineBottom / s / secs;
  return Math.max(0.6 * TEC_DEFAULT_SPEED, Math.min(1.6 * TEC_DEFAULT_SPEED, raw));
}

// tec-graphic:end

// Shared 2D context for glyph measurement (a document canvas resolves the injected @font-face).
let measureCtx = null;
function tecMeasure(text, font, px) {
  if (!text) return 0;
  if (measureCtx === null) {
    try {
      if (typeof document !== "undefined") measureCtx = document.createElement("canvas").getContext("2d");
      else if (typeof OffscreenCanvas !== "undefined") measureCtx = new OffscreenCanvas(8, 8).getContext("2d");
    } catch (_err) {
      measureCtx = null;
    }
    if (!measureCtx) measureCtx = false;
  }
  // Without a canvas: 0.6 em per character, 1.0 em per wide one (Hangul, kana, CJK).
  if (!measureCtx) return tecFallbackWidth(text, px);
  measureCtx.font = `${font.style} ${font.weight} ${px}px ${font.stack}`;
  return measureCtx.measureText(text).width;
}
// The title's ink above and below the baseline in em (it is centred on the cap-centre line). Latin: the bundled face's cap height and no
// descent. A title holding Hangul renders in the system Korean face, whose ink differs per OS (Apple SD / AppleMyungjo
// vs Malgun Gothic / Batang), so it is measured here with the canvas (actualBoundingBoxAscent / Descent), not taken
// from a constant tuned on one OS; without a canvas, the Latin values.
function tecTitleInk(text, font, px) {
  var latin = { up: TEC_TITLE.cap, down: 0 };
  if (!tecHasHangul(text) || !(px > 0)) return latin;
  tecMeasure("x", font, px);
  if (!measureCtx) return latin;
  measureCtx.font = `${font.style} ${font.weight} ${px}px ${font.stack}`;
  var m = measureCtx.measureText(text);
  var up = Number(m.actualBoundingBoxAscent) / px, down = Number(m.actualBoundingBoxDescent) / px;
  return up > 0 && isFinite(up) && isFinite(down) ? { up: up, down: Math.max(0, down) } : latin;
}

const str = (v, d) => (typeof v === "string" ? v : d);
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const TITLE_FAMILY = "TEC Title Serif";
const CREDITS_FAMILY = "TEC Credits Sans";
// Hangul falls back to the system Korean face of each role, macOS then Windows then a Noto install: AppleMyungjo,
// Batang, Noto Serif KR for the serif title; Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR for the sans credits
// (zero bytes; style-matched Korean fonts are a later step).
const TITLE_FALLBACK = 'Georgia, "Times New Roman", "AppleMyungjo", "Batang", "Noto Serif KR", serif';
const CREDITS_FALLBACK = '"Helvetica Neue", Arial, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

export default function TheEndCredits({ data }) {
  const frame = useCurrentFrame();
  const video = useVideoConfig();
  const W = num(video.width, 1920);
  const H = num(video.height, 1080);
  const fonts = Array.isArray(data.fonts) ? data.fonts : [];
  const [ready, setReady] = useState(fonts.length === 0);
  const [handle] = useState(() => (fonts.length && typeof document !== "undefined" && document.fonts ? delayRender("the end credits fonts") : null));
  const released = useRef(false);
  const release = () => {
    if (handle != null && !released.current) { released.current = true; continueRender(handle); }
  };
  useEffect(() => {
    if (ready) return;
    let live = true;
    const done = () => { if (live) setReady(true); };
    if (typeof document === "undefined" || !document.fonts) { done(); return; }
    Promise.all(fonts.map((f) => document.fonts.load(`${f.style || "normal"} ${f.weight || 400} 100px "${f.family}"`).catch(() => null))).finally(done);
    return () => { live = false; };
  }, [ready]);
  useEffect(() => { if (ready) release(); }, [ready, handle]);
  // Never leave the render blocked if the graphic unmounts before the fonts settle.
  useEffect(() => release, []);

  const face = (family, weight) => {
    const f = fonts.find((x) => x && x.family === family) || {};
    return { stack: `"${family}", ${family === TITLE_FAMILY ? TITLE_FALLBACK : CREDITS_FALLBACK}`, weight: num(f.weight, weight), style: str(f.style, "normal") };
  };
  const titleFace = face(TITLE_FAMILY, 800);
  const creditFace = face(CREDITS_FAMILY, 600);

  const layout = data.layout === "full" ? "full" : "classic";
  const fps = num(data.fps, num(video.fps, 30));
  const revealFrame = num(data.revealFrame, Math.round(TEC_LEAD_IN_SEC * fps));
  const L = revealFrame / fps;
  const t = frame / fps;
  const title = str(data.title, "THE END");
  const showTitle = data.showTitle !== false;
  const titleColor = str(data.titleColor, "#FBE4BB");
  const creditColor = str(data.creditColor, "#F0EBDD");
  const rows = tecResolveRows(data);
  const rowsKey = JSON.stringify(rows);

  // Fitted once to the final strings, with the real faces once they are loaded.
  const sizes = useMemo(() => tecTitleSizes(title, layout, W, H, (text, px) => tecMeasure(text, titleFace, px)), [ready, title, layout, W, H]);
  const credits = useMemo(
    () => tecCreditLayout(rows, layout, W, H, sizes.size, (text, _kind, px) => tecMeasure(text, creditFace, px)),
    [ready, rowsKey, layout, W, H, sizes.size],
  );

  // "fit" (default when endFrame is known): the graphic measures its own layout, so the last line clears the top
  // 0.3 s before the end whatever the fonts do; speedPxPerSec (the panel's estimate) is used only with speedMode "fixed".
  const endFrame = num(data.endFrame, 0);
  const baseSpeed = data.speedMode !== "fixed" && endFrame > revealFrame
    ? tecFitSpeed(credits.lastLineBottom, endFrame, revealFrame, fps, H)
    : num(data.speedPxPerSec, TEC_DEFAULT_SPEED);
  const scroll = tecScrollY(frame, revealFrame, fps, baseSpeed, num(data.speed, 1), H);
  const pose = tecTitlePose(t, L, layout, sizes, W, H);
  const glyphs = Array.from(title);
  const typed = tecTypedCount(t, glyphs.length);
  // The title's ink is centred on its cap-centre line: the Latin cap height, or the measured ink of a Hangul title.
  const ink = tecTitleInk(title, titleFace, pose.size);
  const titleBaseline = pose.cy + ((ink.up - ink.down) * pose.size) / 2 - scroll;
  const overlay = layout === "full" ? tecFullOverlay(t, L) : null;
  // Full frame: the credits arrive with the right gradient, after the big title has moved over.
  const creditsOpacity = overlay ? overlay.gradient : tecCreditsOpacity(t);
  const mask = tecMaskCss();
  const lh = TEC_CREDITS.ascent + TEC_CREDITS.descent;

  const line = (key, text, baseline, size) => {
    const top = baseline - scroll - TEC_CREDITS.ascent * size;
    if (top > H || top + lh * size < 0) return null;
    return (
      <div
        key={key}
        style={{
          position: "absolute", left: credits.colX - credits.colW / 2, width: credits.colW, top,
          textAlign: "center", whiteSpace: "nowrap", wordBreak: "keep-all", fontFamily: creditFace.stack, fontWeight: creditFace.weight,
          fontStyle: creditFace.style, fontSize: size, lineHeight: `${lh * size}px`, color: creditColor,
          textShadow: layout === "full" ? `0 ${0.002 * H}px ${0.008 * H}px rgba(0,0,0,0.7)` : "none",
        }}
      >
        {text}
      </div>
    );
  };

  const fontFaces = fonts
    .filter((f) => f && f.family && f.b64)
    .map((f) => `@font-face{font-family:"${f.family}";src:url("data:font/woff2;base64,${f.b64}") format("woff2");font-style:${f.style || "normal"};font-weight:${f.weight || 400};}`)
    .join("");
  const titleTop = titleBaseline - TEC_TITLE.ascent * pose.size;
  return (
    <AbsoluteFill>
      {fontFaces ? <style>{fontFaces}</style> : null}
      {overlay ? <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${overlay.scrim})` }} /> : null}
      {overlay ? (
        <AbsoluteFill
          style={{
            opacity: overlay.gradient,
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0) ${TEC_FULL_FX.gradFrom * 100}%, rgba(0,0,0,${TEC_FULL_FX.gradAlpha}) ${TEC_FULL_FX.gradTo * 100}%, rgba(0,0,0,${TEC_FULL_FX.gradAlpha}) 100%)`,
          }}
        />
      ) : null}
      <AbsoluteFill style={{ maskImage: mask, WebkitMaskImage: mask }}>
        {showTitle && glyphs.length > 0 && titleTop < H && titleTop + (TEC_TITLE.ascent + TEC_TITLE.descent) * pose.size > 0 ? (
          <div
            style={{
              position: "absolute", left: pose.cx, top: titleTop, whiteSpace: "nowrap", wordBreak: "keep-all",
              transform: `translateX(-50%) scaleX(${tecTitleScaleX(title)})`, transformOrigin: "50% 50%",
              fontFamily: titleFace.stack, fontWeight: titleFace.weight, fontStyle: titleFace.style,
              fontSize: pose.size, lineHeight: `${(TEC_TITLE.ascent + TEC_TITLE.descent) * pose.size}px`, color: titleColor,
              textShadow: layout === "full" ? `0 ${0.012 * H}px ${0.03 * H}px rgba(0,0,0,0.55)` : "none",
            }}
          >
            {/* The hidden full string fixes the box and its centre; the typed prefix is one text
                node on top of it, so kerning inside the title is kept. */}
            <span style={{ visibility: "hidden" }}>{title}</span>
            <span style={{ position: "absolute", left: 0, top: 0 }}>{glyphs.slice(0, typed).join("")}</span>
          </div>
        ) : null}
        {creditsOpacity > 0 ? (
          <AbsoluteFill style={{ opacity: creditsOpacity }}>
            {credits.rows.map((r, i) => [
              ...r.role.lines.map((text, k) => line(`r${i}-${k}`, text, r.role.baselines[k], r.role.size)),
              ...r.name.lines.map((text, k) => line(`n${i}-${k}`, text, r.name.baselines[k], r.name.size)),
            ])}
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
