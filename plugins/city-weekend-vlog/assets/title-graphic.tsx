// City Weekend Vlog title: three stacked lines revealed on cuts; the place line swaps typefaces on the burst.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

// cwv-title-state:start
function cwvTitleState(frame, events, hasPlace) {
  let state = "A";
  for (const s of events.fontSwitches || []) if (frame >= s.frame) state = s.state;
  const live = frame < events.endFrame;
  return {
    line1: live && frame >= events.line1Frame,
    connector: live && hasPlace && frame >= events.connectorFrame,
    place: live && hasPlace && frame >= events.placeFrame,
    state,
  };
}
// cwv-title-state:end

// cwv-fit:start
// Font size that makes a line fit the box: the target size when it fits, otherwise
// scaled down in proportion (text width is linear in font size).
function cwvFitSize(targetPx, measuredWidthAtTarget, boxPx) {
  if (!(targetPx > 0)) return 0;
  if (!(measuredWidthAtTarget > 0) || !(boxPx > 0) || measuredWidthAtTarget <= boxPx) return targetPx;
  return (targetPx * boxPx) / measuredWidthAtTarget;
}
// cwv-fit:end

// cwv-hangul:start
// Korean titles. Text with Hangul is never uppercased or tracked, and breaks between words only (keep-all). Before a
// canvas can measure, wide characters (Hangul, kana, CJK, fullwidth) count as 1 em and everything else as the Latin
// average of 0.6 em.
const CWV_HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
const CWV_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
function cwvHasHangul(text) { return CWV_HANGUL_RE.test(String(text || "")); }
function cwvEstimateEm(text) {
  let em = 0;
  for (const ch of String(text || "")) em += CWV_WIDE_RE.test(ch) ? 1 : 0.6;
  return em;
}
// A state's font stack: its face, the Latin fallbacks, then the Korean system face of its role (`koFamily` in
// presets.json: AppleMyungjo for serif faces, Apple SD Gothic Neo for the rest) before the generic family.
// Latin fallbacks name a script face that ships with Windows too (Segoe Script).
const CWV_FALLBACK_LATIN = '"Snell Roundhand", "Brush Script MT", "Segoe Script"';
// The Korean faces of a role: macOS, then Windows, then Noto (Linux, or when installed).
const CWV_KO_FACES = { serif: '"AppleMyungjo", "Batang", "Noto Serif KR"', sans: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR"' };
function cwvKoFaces(koFamily) { return koFamily === "AppleMyungjo" ? CWV_KO_FACES.serif : CWV_KO_FACES.sans; }
function cwvFontStack(state, override) {
  return (override ? `"${override}", ` : "") + `"${state.family}", ${CWV_FALLBACK_LATIN}, ${cwvKoFaces(state.koFamily)}, cursive`;
}
// cwv-hangul:end

// Shared 2D context for glyph measurement. A document canvas is preferred because it
// resolves the @font-face rules injected by this component.
let measureCtx = null;
function cwvMeasure(text, f, px) {
  const shown = f.textTransform === "uppercase" ? text.toUpperCase() : text;
  if (!shown) return 0;
  if (measureCtx === null) {
    try {
      if (typeof document !== "undefined") measureCtx = document.createElement("canvas").getContext("2d");
      else if (typeof OffscreenCanvas !== "undefined") measureCtx = new OffscreenCanvas(8, 8).getContext("2d");
    } catch (_err) {
      measureCtx = null;
    }
    if (!measureCtx) measureCtx = false;
  }
  // Without a canvas, estimate: 0.6 em per Latin character, 1 em per wide one.
  if (!measureCtx) return cwvEstimateEm(shown) * px;
  measureCtx.font = `${f.fontStyle} ${f.fontWeight} ${px}px ${f.fontFamily}`;
  const m = measureCtx.measureText(shown);
  // Script faces can overhang their advance with swashes, so take the wider of advance and ink box.
  const ink = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0);
  return Math.max(m.width, ink);
}

const str = (v, d) => (typeof v === "string" ? v : d);
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export default function CityWeekendTitle({ data }) {
  const frame = useCurrentFrame();
  const { width: frameWidth } = useVideoConfig();
  const fonts = Array.isArray(data.fonts) ? data.fonts : [];
  const [ready, setReady] = useState(fonts.length === 0);
  const [handle] = useState(() => (fonts.length && typeof document !== "undefined" && document.fonts ? delayRender("city weekend fonts") : null));
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

  const line1 = str(data.line1, "");
  const connector = str(data.connector, "in");
  const place = str(data.place, "").trim();
  const st = cwvTitleState(frame, data.events || {}, place.length > 0);
  const states = data.states || {};
  const override = str(data.fontFamily, "").trim();
  const face = (key, text) => {
    const s = states[key] || states.A || { family: "", case: "none", style: "normal", weight: 400, scale: 1 };
    return { fontFamily: cwvFontStack(s, key === "A" ? override : ""), fontStyle: s.style, fontWeight: s.weight,
      textTransform: s.case === "upper" && !cwvHasHangul(text) ? "uppercase" : "none", scale: num(s.scale, 1) };
  };
  const size = num(data.size, 150);
  const shadowAlpha = Math.max(0, Math.min(1, num(data.shadow, 0.45)));
  const ink = str(data.ink, "#F6ECB8");
  const common = { color: ink, whiteSpace: "nowrap", wordBreak: "keep-all", letterSpacing: 0, lineHeight: 1, textShadow: `0 4px 14px rgba(0,0,0,${shadowAlpha})`, textAlign: "center", width: "100%" };
  const swapLine = place ? "place" : "line1";
  const rotation = num(data.rotation, -7);
  // Long lines shrink to fit the 70% title box instead of overflowing. The usable width
  // leaves room for the rotated line's horizontal spread (width·(1−cos θ) + height·sin θ).
  const rad = (Math.abs(rotation) * Math.PI) / 180;
  const titleBox = 0.7 * num(frameWidth, 1080);
  const boxPx = Math.max(titleBox * 0.3, (titleBox * Math.cos(rad) - size * Math.sin(rad)) * 0.98);
  const swapKeys = ["A", ...["B", "C", "D"].filter((k) => states[k])];
  // Measured with the real faces once they are loaded; each state is clamped on its own so
  // a state keeps its preset scale whenever it fits. Only the last line swaps faces, so its
  // height changes never move the lines above it.
  const fitted = useMemo(() => {
    const out = {};
    const add = (id, text, base, keys) => {
      out[id] = {};
      for (const k of keys) {
        const f = face(k, text);
        const target = base * f.scale;
        out[id][k] = cwvFitSize(target, cwvMeasure(text, f, target), boxPx);
      }
    };
    add("line1", line1, size, swapLine === "line1" ? swapKeys : ["A"]);
    if (place) {
      add("connector", connector, size * 0.45, ["A"]);
      add("place", place, size, swapKeys);
    }
    return out;
  }, [ready, line1, connector, place, size, override, JSON.stringify(states), boxPx]);
  const lineStyle = (id, key, base, text) => {
    const f = face(key, text);
    const k = fitted[id] && fitted[id][key] != null ? fitted[id][key] : base * f.scale;
    return { ...common, fontFamily: f.fontFamily, fontStyle: f.fontStyle, fontWeight: f.fontWeight, textTransform: f.textTransform, fontSize: k };
  };
  const fontFaces = fonts.map((f) => `@font-face{font-family:"${f.family}";src:url("data:font/woff2;base64,${f.b64}") format("woff2");font-style:${f.style};font-weight:${f.weight};}`).join("");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start" }}>
      {fontFaces ? <style>{fontFaces}</style> : null}
      <div style={{ position: "absolute", left: "15%", right: "15%", top: `${num(data.position, 46) - 11}%`, transform: `rotate(${rotation}deg)`, display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.05 }}>
        <div style={{ ...lineStyle("line1", swapLine === "line1" ? st.state : "A", size, line1), visibility: st.line1 ? "visible" : "hidden" }}>{line1}</div>
        {place ? <div style={{ ...lineStyle("connector", "A", size * 0.45, connector), visibility: st.connector ? "visible" : "hidden" }}>{connector}</div> : null}
        {place ? <div style={{ ...lineStyle("place", st.state, size, place), visibility: st.place ? "visible" : "hidden" }}>{place}</div> : null}
      </div>
    </AbsoluteFill>
  );
}
