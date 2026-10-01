// Summer Trip labels: the top label (main + italic part) and the credit (prefix + italic name) for the whole span, and
// the place title (small lowercase prefix before big serif caps, right of centre) for its first `placeSeconds`.
// An empty place skips the place title; an empty credit name hides the credit.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

// st-labels-state:start
function stLabelsState(frame, fps, p) {
  const place = String(p.place || "").trim();
  const until = typeof p.placeSeconds === "number" && Number.isFinite(p.placeSeconds) ? Math.round(p.placeSeconds * fps) : 0;
  return {
    place: place.length > 0 && frame < until,
    top: String(p.topMain || "").trim().length > 0 || String(p.topItalic || "").trim().length > 0,
    credit: String(p.creditName || "").trim().length > 0,
  };
}
// Horizontal placement of the place block (all values in px): keep the requested centre when the block fits inside
// the side margins, otherwise slide it toward the centre, and only shrink (scale < 1) when it is wider than the box.
function stPlaceLayout(cx, width, frameW, margin) {
  const left = frameW * margin, right = frameW * (1 - margin), box = right - left;
  if (!(width > 0)) return { cx, scale: 1 };
  const scale = width > box ? box / width : 1;
  const w = width * scale;
  const c = Math.min(Math.max(cx, left + w / 2), right - w / 2);
  return { cx: c, scale };
}
function stFitSize(targetPx, measuredWidthAtTarget, boxPx) {
  if (!(targetPx > 0)) return 0;
  if (!(measuredWidthAtTarget > 0) || !(boxPx > 0) || measuredWidthAtTarget <= boxPx) return targetPx;
  return (targetPx * boxPx) / measuredWidthAtTarget;
}
// st-labels-state:end

// st-hangul:start
// Korean text (the same block in title-graphic.tsx and labels-graphic.tsx). A line with Hangul is never uppercased,
// tracked or squeezed (scaleX 1), and breaks between words only (keep-all). Before a canvas can measure, wide characters
// (Hangul, kana, CJK, fullwidth) count as 1 em and everything else as the Latin average of 0.6 em. Every font stack ends
// with the role's Korean system face (presets.json koFamily: AppleMyungjo for serif faces, Apple SD Gothic Neo
// otherwise) before the generic family.
const ST_HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7a3\ud7b0-\ud7ff]/;
const ST_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
const ST_KO_SANS = "Apple SD Gothic Neo";
function stHasHangul(text) { return ST_HANGUL_RE.test(String(text || "")); }
function stEstimateEm(text) {
  let em = 0;
  for (const ch of String(text || "")) em += ST_WIDE_RE.test(ch) ? 1 : 0.6;
  return em;
}
function stFontStack(family, koFamily) {
  const ko = typeof koFamily === "string" && koFamily ? koFamily : ST_KO_SANS;
  return (family ? `"${family}", ` : "") + `"Helvetica Neue", Arial, "${ko}", ${ko === "AppleMyungjo" ? "serif" : "sans-serif"}`;
}
// The face for one line: with Hangul in the text, no case change, no tracking and no horizontal squeeze.
function stFaceFor(face, text) {
  return stHasHangul(text) ? { ...face, upper: false, lower: false, tracking: 0, scaleX: 1 } : face;
}
// st-hangul:end

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
// Width before the face's horizontal scale: advance + CSS letter-spacing.
function stAdvance(text, face, px) {
  if (!text) return 0;
  const ctx = stCtx();
  const n = [...text].length;
  let w = stEstimateEm(text) * px;
  if (ctx) {
    ctx.font = `${px}px ${face.css}`;
    w = ctx.measureText(text).width;
  }
  return w + face.tracking * px * n;
}

const str = (v, d) => (typeof v === "string" ? v : d);
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);

function stFace(faces, key) {
  const f = (faces && faces[key]) || {};
  const family = str(f.family, "");
  return {
    css: stFontStack(family, f.koFamily),
    upper: f.case === "upper",
    lower: f.case === "lower",
    tracking: num(f.tracking, 0),
    scaleX: num(f.scaleX, 1) > 0 ? num(f.scaleX, 1) : 1,
  };
}
const cased = (text, face) => (face.upper ? text.toUpperCase() : face.lower ? text.toLowerCase() : text);

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
  useEffect(() => release, []);
  const css = entries.map(([family, b64]) => `@font-face{font-family:"${family}";src:url("data:font/woff2;base64,${b64}") format("woff2");font-style:normal;font-weight:400;}`).join("");
  return { ready, css };
}

export default function SummerTripLabels({ data }) {
  const frame = useCurrentFrame();
  const { width: vw, height: vh, fps: vfps } = useVideoConfig();
  const W = num(vw, 1920), H = num(vh, 1080), fps = num(vfps, 30);
  const k = H / 1080; // sizes are authored in px of a 1080-high frame
  const { ready, css } = useStFonts(data.fonts);
  const faces = data.faces || {};
  const topMain = str(data.topMain, ""), topItalic = str(data.topItalic, "");
  const creditPrefix = str(data.creditPrefix, ""), creditName = str(data.creditName, "").trim();
  const placeText = str(data.place, "").trim(), prefixText = str(data.placePrefix, "").trim();
  // Lines with Hangul drop case, tracking and squeeze (st-hangul); the place block keeps one scaleX for both parts.
  const topText = topMain + topItalic, creditText = creditPrefix + creditName;
  const fLabel = stFace(faces, "label"), fItalic = stFace(faces, "labelItalic");
  const fPlace = stFaceFor(stFace(faces, "place"), placeText + prefixText), fPrefix = stFaceFor(stFace(faces, "placePrefix"), placeText + prefixText);
  // Per-line tracking (em): the reference sets its labels tighter than the face default, most of all the late credit.
  const withTracking = (face, t) => ({ ...face, tracking: t });
  const topT = num(data.labelTracking, fLabel.tracking), creditT = num(data.creditTracking, fLabel.tracking);
  const fTop = stFaceFor(withTracking(fLabel, topT), topText), fTopI = stFaceFor(withTracking(fItalic, topT), topText);
  const fCredit = stFaceFor(withTracking(fLabel, creditT), creditText), fCreditI = stFaceFor(withTracking(fItalic, creditT), creditText);
  const st = stLabelsState(frame, fps, data);

  const upper = data.creditUppercase === true && !stHasHangul(creditText);
  const credit = { prefix: upper ? creditPrefix.toUpperCase() : creditPrefix, name: upper ? creditName.toUpperCase() : creditName };
  const place = cased(placeText, fPlace);
  const prefix = cased(prefixText, fPrefix);

  const margin = Math.max(0, Math.min(0.3, num(data.marginPct, 6) / 100));
  const box = W * (1 - 2 * margin);
  const shadowA = Math.max(0, Math.min(1, num(data.shadow, 0.25)));
  const shadow = shadowA > 0 ? `0 ${2 * k}px ${22 * k}px rgba(0,0,0,${shadowA})` : "none";
  const prefixScale = num(data.prefixScale, 0.43);

  const fit = useMemo(() => {
    const labelPx = num(data.labelSize, 40) * k, creditPx = num(data.creditSize, 40) * k, placePx = num(data.placeSize, 220) * k;
    const topW = stAdvance(topMain + (topItalic ? " " : ""), fTop, labelPx) + stAdvance(topItalic, fTopI, labelPx);
    const creditW = stAdvance(credit.prefix + " ", fCredit, creditPx) + stAdvance(credit.name, fCreditI, creditPx);
    // The prefix tucks under the caps' first serif (negative gap), as in the reference.
    const placeW = (stAdvance(place, fPlace, placePx) + (prefix ? stAdvance(prefix, fPrefix, placePx * prefixScale) - 0.02 * placePx : 0)) * fPlace.scaleX;
    const layout = stPlaceLayout((num(data.placeX, 72.5) / 100) * W, placeW, W, margin);
    return { top: stFitSize(labelPx, topW, box), credit: stFitSize(creditPx, creditW, box), place: placePx * layout.scale, placeCx: layout.cx };
  }, [ready, topMain, topItalic, credit.prefix, credit.name, place, prefix, W, H, JSON.stringify(faces), topT, creditT, data.labelSize, data.creditSize, data.placeSize, data.placeX, prefixScale, box]);

  const lineBox = (yPct) => ({ position: "absolute", left: 0, right: 0, top: `${yPct}%`, height: 0, display: "flex", justifyContent: "center", alignItems: "center" });
  const textStyle = (px, face, color) => ({ fontFamily: face.css, fontSize: px, lineHeight: 1, letterSpacing: `${face.tracking}em`, color, whiteSpace: "pre", wordBreak: "keep-all", textShadow: shadow });
  const labelColor = str(data.labelColor, "#FFFFFF");
  const placeColor = str(data.placeColor, "#F8DC70");
  // Gloock-like caps: the prefix baseline sits ~38% of the cap height below the cap top (reference "in ITALY").
  const capRatio = num(data.placeCapRatio, 0.75);
  const prefixLift = (1 - num(data.prefixDrop, 0.38)) * capRatio * fit.place;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {css ? <style>{css}</style> : null}
      {st.top ? (
        <div style={lineBox(num(data.topY, 8.6))}>
          <div style={textStyle(fit.top, fTop, labelColor)}>
            {topMain}{topItalic ? " " : ""}<span style={{ fontFamily: fItalic.css }}>{topItalic}</span>
          </div>
        </div>
      ) : null}
      {st.credit ? (
        <div style={lineBox(num(data.creditY, 93.0))}>
          <div style={textStyle(fit.credit, fCredit, labelColor)}>
            {credit.prefix}{credit.prefix ? " " : ""}<span style={{ fontFamily: fItalic.css }}>{credit.name}</span>
          </div>
        </div>
      ) : null}
      {st.place ? (
        <div style={{ position: "absolute", left: fit.placeCx, top: `${num(data.placeY, 38.9)}%`, width: 0, height: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", whiteSpace: "pre", wordBreak: "keep-all", lineHeight: 1, color: placeColor, textShadow: shadow, transform: `scaleX(${fPlace.scaleX})` }}>
            {prefix ? (
              <span style={{ fontFamily: fPrefix.css, fontSize: fit.place * prefixScale, letterSpacing: `${fPrefix.tracking}em`, position: "relative", top: -prefixLift, marginRight: -0.02 * fit.place }}>{prefix}</span>
            ) : null}
            <span style={{ fontFamily: fPlace.css, fontSize: fit.place, letterSpacing: `${fPlace.tracking}em` }}>{place}</span>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}
