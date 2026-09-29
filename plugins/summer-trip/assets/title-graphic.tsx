// Summer Trip title: line 1 typed word by word, the season word in two steps (first part, then complete), and the
// top label + credit from `labelsTime`. Every step is a hard appear (no fades). Partial strings keep the final line's
// left edge: each line is laid out at its final width (centred) and the words/letters not shown yet stay hidden.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

// st-title-state:start
// Frame at which an event given in seconds from the graphic's start becomes visible.
function stEventFrame(seconds, fps) {
  return typeof seconds === "number" && Number.isFinite(seconds) ? Math.round(seconds * fps) : Infinity;
}
// Line 1 words, split on whitespace (lowercase kept as typed).
function stWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean);
}
// How many of `count` words are visible at `frame`. A word without its own time shares the last given time.
function stVisibleWords(frame, fps, wordTimes, count) {
  const times = Array.isArray(wordTimes) ? wordTimes : [];
  let shown = 0;
  for (let i = 0; i < count; i++) {
    const t = times.length ? times[Math.min(i, times.length - 1)] : 0;
    if (frame >= stEventFrame(t, fps)) shown = i + 1; else break;
  }
  return shown;
}
// How many letters of the season word are visible: the first `partLength` from `partTime`, all from `fullTime`.
// A part length of 0 or >= the word length shows the whole word at `partTime`.
function stSeasonChars(frame, fps, length, partTime, fullTime, partLength) {
  if (length <= 0) return 0;
  const part = partLength > 0 && partLength < length ? partLength : length;
  if (frame >= stEventFrame(fullTime, fps)) return length;
  if (frame >= stEventFrame(partTime, fps)) return part;
  return 0;
}
function stTitleState(frame, fps, p) {
  const words = stWords(p.line1);
  const season = String(p.season || "").trim();
  return {
    words: stVisibleWords(frame, fps, p.wordTimes, words.length),
    seasonChars: stSeasonChars(frame, fps, [...season].length, p.seasonPartTime, p.seasonFullTime, p.seasonPartLength),
    labels: frame >= stEventFrame(p.labelsTime, fps),
  };
}
// Splits a line into its shown head and hidden tail. The hidden tail stays in the layout (visibility: hidden), so the
// shown part is left-anchored at the final line's left edge inside the centred final-width box.
function stLineParts(text, shownUnits, unit) {
  const units = unit === "word" ? stWords(text) : [...String(text || "").trim()];
  const n = Math.max(0, Math.min(units.length, shownUnits));
  const sep = unit === "word" ? " " : "";
  const shown = units.slice(0, n).join(sep);
  const rest = units.slice(n).join(sep);
  return { shown: n > 0 && rest ? shown + sep : shown, hidden: rest };
}
// Font size that makes a line fit the box: the target when it fits, otherwise scaled down in proportion.
function stFitSize(targetPx, measuredWidthAtTarget, boxPx) {
  if (!(targetPx > 0)) return 0;
  if (!(measuredWidthAtTarget > 0) || !(boxPx > 0) || measuredWidthAtTarget <= boxPx) return targetPx;
  return (targetPx * boxPx) / measuredWidthAtTarget;
}
// st-title-state:end

// Shared 2D context for glyph measurement (a document canvas resolves the injected @font-face rules).
let measureCtx = null;
function stCtx() {
  if (measureCtx === null) {
    try {
      if (typeof document !== "undefined") measureCtx = document.createElement("canvas").getContext("2d");
      else if (typeof OffscreenCanvas !== "undefined") measureCtx = new OffscreenCanvas(8, 8).getContext("2d");
    } catch (_err) {
      measureCtx = null;
    }
    if (!measureCtx) measureCtx = false;
  }
  return measureCtx;
}
// Rendered width of a line: advance + CSS letter-spacing, times the face's horizontal scale.
function stMeasure(text, face, px) {
  if (!text) return 0;
  const ctx = stCtx();
  const n = [...text].length;
  let w = n * px * 0.6;
  if (ctx) {
    ctx.font = `${px}px ${face.css}`;
    w = ctx.measureText(text).width;
  }
  return (w + face.tracking * px * n) * face.scaleX;
}
// Cap height of a face as a share of the font size (for stacking lines on the caps).
function stCapRatio(face) {
  const ctx = stCtx();
  if (!ctx) return 0.72;
  ctx.font = `100px ${face.css}`;
  const m = ctx.measureText("H");
  return m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent / 100 : 0.72;
}

const str = (v, d) => (typeof v === "string" ? v : d);
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const FALLBACK = '"Helvetica Neue", Arial, sans-serif';

function stFace(faces, key) {
  const f = (faces && faces[key]) || {};
  const family = str(f.family, "");
  return {
    css: family ? `"${family}", ${FALLBACK}` : FALLBACK,
    upper: f.case === "upper",
    lower: f.case === "lower",
    tracking: num(f.tracking, 0),
    scaleX: num(f.scaleX, 1) > 0 ? num(f.scaleX, 1) : 1,
    fillWidth: num(f.fillWidth, 0),
  };
}
const cased = (text, face) => (face.upper ? text.toUpperCase() : face.lower ? text.toLowerCase() : text);

// Loads the base64 faces and holds the render until they are ready.
function useStFonts(fonts) {
  const entries = fonts && typeof fonts === "object" ? Object.entries(fonts).filter(([k, v]) => k && typeof v === "string" && v) : [];
  const [ready, setReady] = useState(entries.length === 0);
  const [handle] = useState(() => (entries.length && typeof document !== "undefined" && document.fonts ? delayRender("summer trip fonts") : null));
  const released = useRef(false);
  const release = () => {
    if (handle != null && !released.current) { released.current = true; continueRender(handle); }
  };
  useEffect(() => {
    if (ready) return;
    let live = true;
    const done = () => { if (live) setReady(true); };
    if (typeof document === "undefined" || !document.fonts) { done(); return; }
    Promise.all(entries.map(([family]) => document.fonts.load(`100px "${family}"`).catch(() => null))).finally(done);
    return () => { live = false; };
  }, [ready]);
  useEffect(() => { if (ready) release(); }, [ready, handle]);
  // Never leave the render blocked if the graphic unmounts before the fonts settle.
  useEffect(() => release, []);
  // Each family is a single face, declared as normal/400 so the browser never synthesises bold or italic.
  const css = entries.map(([family, b64]) => `@font-face{font-family:"${family}";src:url("data:font/woff2;base64,${b64}") format("woff2");font-style:normal;font-weight:400;}`).join("");
  return { ready, css };
}

export default function SummerTripTitle({ data }) {
  const frame = useCurrentFrame();
  const { width: vw, height: vh, fps: vfps } = useVideoConfig();
  const W = num(vw, 1920), H = num(vh, 1080), fps = num(vfps, 30);
  const k = H / 1080; // sizes are authored in px of a 1080-high frame
  const { ready, css } = useStFonts(data.fonts);
  const faces = data.faces || {};
  const fLine1 = stFace(faces, "line1"), fSeason = stFace(faces, "season"), fLabel = stFace(faces, "label"), fItalic = stFace(faces, "labelItalic");
  // Per-line tracking (em): the reference sets its labels tighter than the face default, most of all the late credit.
  const withTracking = (face, t) => ({ ...face, tracking: t });
  const topT = num(data.labelTracking, fLabel.tracking), creditT = num(data.creditTracking, fLabel.tracking);
  const fTop = withTracking(fLabel, topT), fTopI = withTracking(fItalic, topT), fCredit = withTracking(fLabel, creditT), fCreditI = withTracking(fItalic, creditT);

  const line1 = str(data.line1, "");
  const season = cased(str(data.season, "").trim(), fSeason);
  const topMain = str(data.topMain, ""), topItalic = str(data.topItalic, "");
  const creditUpper = data.creditUppercase !== false;
  const creditPrefix = str(data.creditPrefix, ""), creditName = str(data.creditName, "").trim();
  const credit = { prefix: creditUpper ? creditPrefix.toUpperCase() : creditPrefix, name: creditUpper ? creditName.toUpperCase() : creditName };
  const st = stTitleState(frame, fps, { ...data, season });

  const margin = Math.max(0, Math.min(0.3, num(data.marginPct, 6) / 100));
  const box = W * (1 - 2 * margin);
  const shadowA = Math.max(0, Math.min(1, num(data.shadow, 0.25)));
  const shadow = shadowA > 0 ? `0 ${2 * k}px ${22 * k}px rgba(0,0,0,${shadowA})` : "none";

  // Auto-fit with the real faces once loaded: long text shrinks to keep the side margins.
  const fit = useMemo(() => {
    const line1Px = num(data.line1Size, 101) * k;
    const seasonPx = num(data.seasonSize, 272) * k;
    const seasonBox = fSeason.fillWidth > 0 ? Math.min(W * fSeason.fillWidth, W) : box;
    const out = {
      line1: stFitSize(line1Px, stMeasure(cased(stWords(line1).join(" "), fLine1), fLine1, line1Px), box),
      season: stFitSize(seasonPx, stMeasure(season, fSeason, seasonPx), seasonBox),
      top: 0, credit: 0, seasonCap: 0.72,
    };
    // A fill-width season word is also held under 55% of the frame height.
    out.seasonCap = stCapRatio(fSeason);
    if (fSeason.fillWidth > 0) out.season = Math.min(out.season, (0.55 * H) / out.seasonCap);
    const labelPx = num(data.labelSize, 41) * k, creditPx = num(data.creditSize, 36) * k;
    const topW = stMeasure(topMain + (topItalic ? " " : ""), fTop, labelPx) + stMeasure(topItalic, fTopI, labelPx);
    const creditW = stMeasure(credit.prefix + " ", fCredit, creditPx) + stMeasure(credit.name, fCreditI, creditPx);
    out.top = stFitSize(labelPx, topW, box);
    out.credit = stFitSize(creditPx, creditW, box);
    return out;
  }, [ready, line1, season, topMain, topItalic, credit.prefix, credit.name, W, H, JSON.stringify(faces), topT, creditT, data.line1Size, data.seasonSize, data.labelSize, data.creditSize, box]);

  const seasonY = num(data.seasonY, 50);
  // A fill-width season word (Poster) varies in height with its length, so line 1 sits a fixed gap above its caps.
  const line1Y = fSeason.fillWidth > 0
    ? seasonY - ((fit.season * fit.seasonCap) / 2 + num(data.stackGap, 36) * k + fit.line1 * 0.5) / H * 100
    : num(data.line1Y, 35.5);

  const lineBox = (yPct) => ({
    position: "absolute", left: 0, right: 0, top: `${yPct}%`, height: 0, display: "flex", justifyContent: "center", alignItems: "center",
  });
  const textStyle = (px, face, color) => ({
    fontFamily: face.css, fontSize: px, lineHeight: 1, letterSpacing: `${face.tracking}em`, color, whiteSpace: "pre",
    textShadow: shadow, transform: face.scaleX !== 1 ? `scaleX(${face.scaleX})` : undefined, transformOrigin: "50% 50%",
  });
  const hide = { visibility: "hidden" };
  const l1 = stLineParts(cased(line1, fLine1), st.words, "word");
  const sp = stLineParts(season, st.seasonChars, "char");
  const labelColor = str(data.labelColor, "#FFFFFF");
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {css ? <style>{css}</style> : null}
      {line1 ? (
        <div style={lineBox(line1Y)}>
          <div style={textStyle(fit.line1, fLine1, str(data.line1Color, "#FFFFFF"))}>
            <span>{l1.shown}</span><span style={hide}>{l1.hidden}</span>
          </div>
        </div>
      ) : null}
      {season ? (
        <div style={lineBox(seasonY)}>
          <div style={textStyle(fit.season, fSeason, str(data.seasonColor, "#FDE070"))}>
            <span>{sp.shown}</span><span style={hide}>{sp.hidden}</span>
          </div>
        </div>
      ) : null}
      {st.labels && (topMain || topItalic) ? (
        <div style={lineBox(num(data.topY, 12.6))}>
          <div style={{ ...textStyle(fit.top, fTop, labelColor), transform: undefined }}>
            {topMain}{topItalic ? " " : ""}<span style={{ fontFamily: fItalic.css }}>{topItalic}</span>
          </div>
        </div>
      ) : null}
      {st.labels && credit.name ? (
        <div style={lineBox(num(data.creditY, 89.9))}>
          <div style={{ ...textStyle(fit.credit, fCredit, labelColor), transform: undefined }}>
            {credit.prefix}{credit.prefix ? " " : ""}<span style={{ fontFamily: fItalic.css }}>{credit.name}</span>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
