// City Weekend Vlog title: three stacked lines revealed on cuts; the place line swaps typefaces on the burst.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";

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

const str = (v, d) => (typeof v === "string" ? v : d);
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const FALLBACK = '"Snell Roundhand", "Brush Script MT", cursive';

export default function CityWeekendTitle({ data }) {
  const frame = useCurrentFrame();
  const fonts = Array.isArray(data.fonts) ? data.fonts : [];
  const [ready, setReady] = useState(fonts.length === 0);
  const [handle] = useState(() => (fonts.length && typeof document !== "undefined" && document.fonts ? delayRender("city weekend fonts") : null));
  useEffect(() => {
    if (ready) return;
    const done = () => setReady(true);
    if (typeof document === "undefined" || !document.fonts) { done(); return; }
    Promise.all(fonts.map((f) => document.fonts.load(`${f.style} ${f.weight} 100px "${f.family}"`).catch(() => null))).finally(done);
  }, [ready]);
  useEffect(() => { if (ready && handle != null) continueRender(handle); }, [ready, handle]);

  const line1 = str(data.line1, "");
  const connector = str(data.connector, "in");
  const place = str(data.place, "").trim();
  const st = cwvTitleState(frame, data.events || {}, place.length > 0);
  const states = data.states || {};
  const override = str(data.fontFamily, "").trim();
  const face = (key) => {
    const s = states[key] || states.A || { family: "", case: "none", style: "normal", weight: 400, scale: 1 };
    const family = key === "A" && override ? `"${override}", "${s.family}", ${FALLBACK}` : `"${s.family}", ${FALLBACK}`;
    return { fontFamily: family, fontStyle: s.style, fontWeight: s.weight, textTransform: s.case === "upper" ? "uppercase" : "none", scale: num(s.scale, 1) };
  };
  const size = num(data.size, 150);
  const shadowAlpha = Math.max(0, Math.min(1, num(data.shadow, 0.45)));
  const ink = str(data.ink, "#F6ECB8");
  const common = { color: ink, whiteSpace: "nowrap", lineHeight: 1, textShadow: `0 4px 14px rgba(0,0,0,${shadowAlpha})`, textAlign: "center", width: "100%" };
  // Long lines shrink to fit the 70% title box instead of overflowing.
  const fit = (text, scale) => Math.min(1, 12 / Math.max(1, text.length * scale * 0.9));
  const swapLine = place ? "place" : "line1";
  const lineStyle = (key, text, base) => {
    const f = face(key);
    const k = base * f.scale * fit(text, f.scale);
    return { ...common, fontFamily: f.fontFamily, fontStyle: f.fontStyle, fontWeight: f.fontWeight, textTransform: f.textTransform, fontSize: k };
  };
  const fontFaces = fonts.map((f) => `@font-face{font-family:"${f.family}";src:url("data:font/woff2;base64,${f.b64}") format("woff2");font-style:${f.style};font-weight:${f.weight};}`).join("");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start" }}>
      {fontFaces ? <style>{fontFaces}</style> : null}
      <div style={{ position: "absolute", left: "15%", right: "15%", top: `${num(data.position, 46) - 11}%`, transform: `rotate(${num(data.rotation, -7)}deg)`, display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.05 }}>
        <div style={{ ...lineStyle(swapLine === "line1" ? st.state : "A", line1, size), visibility: st.line1 ? "visible" : "hidden" }}>{line1}</div>
        {place ? <div style={{ ...lineStyle("A", connector, size * 0.45), visibility: st.connector ? "visible" : "hidden" }}>{connector}</div> : null}
        {place ? <div style={{ ...lineStyle(st.state, place, size), visibility: st.place ? "visible" : "hidden" }}>{place}</div> : null}
      </div>
    </AbsoluteFill>
  );
}
