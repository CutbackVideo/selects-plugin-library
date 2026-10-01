// Archive Vlog credit: "<prefix> <name>" (e.g. "ARCHIVED BY YOURNAME"), centred, static, over the second shot.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useVideoConfig } from "remotion";

// av-credit:start
// Pure layout, shared with the panel preview (which evaluates this block as plain JS). Measured with the per-font
// advance table from presets.json passed in `data.fonts[i].metrics`. Reference (1920x1080): Oswald Bold-like caps,
// cap height 25 px, centred on the frame.
var AVC_FACE = { family: "AV Oswald Bold", weight: 700 };
var AVC_CAP = 25 / 1080;
var AVC_FIT = 0.8; // max width, fraction of canvas width
var AVC_DEFAULTS = { prefix: "ARCHIVED BY", name: "YOURNAME", color: "#FFFFFF" };
var AVC_FALLBACK_METRICS = { unitsPerEm: 1000, xHeight: 500, capHeight: 700, ascent: 720, descent: -220, advances: {} };
// Korean names: no uppercase or tracking, wide characters measured at 1 em, both Korean system faces in the stack.
var AVC_HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
var AVC_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
var AVC_WIDE_UP = 0.86, AVC_WIDE_DOWN = 0.12;
function avcFontStack(family) {
  return '"' + family + '", "Arial Narrow", Impact, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
}
function avcNum(v, d, lo, hi) { return typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
function avcText(data, key) {
  var v = typeof data[key] === "string" ? data[key] : AVC_DEFAULTS[key];
  return String(v).replace(/\s+/g, " ").trim();
}

// { text, x (left), y (baseline), size, w, color, family, weight, stack, box } or null when there is no text.
function avCreditLayout(data, width, height) {
  data = data || {};
  var W = width > 0 ? width : 1920, H = height > 0 ? height : 1080;
  var text = [avcText(data, "prefix"), avcText(data, "name")].filter(Boolean).join(" ");
  if (!text) return null;
  var ko = AVC_HANGUL_RE.test(text);
  if (!ko) text = text.toUpperCase();
  var m = null, fonts = Array.isArray(data.fonts) ? data.fonts : [];
  for (var i = 0; i < fonts.length; i++) if (fonts[i] && fonts[i].family === AVC_FACE.family && fonts[i].metrics) m = fonts[i].metrics;
  m = m || AVC_FALLBACK_METRICS;
  var size = (AVC_CAP * H * (avcNum(data.size, 100, 60, 200) / 100)) / (m.capHeight / m.unitsPerEm);
  var units = 0, chars = Array.from(text);
  for (var j = 0; j < chars.length; j++) {
    var a = m.advances[chars[j]];
    units += typeof a === "number" ? a : (AVC_WIDE_RE.test(chars[j]) ? 1 : 0.56) * m.unitsPerEm;
  }
  var w = (units * size) / m.unitsPerEm;
  // Shrink a long name to the fit width.
  if (w > AVC_FIT * W) { size *= (AVC_FIT * W) / w; w = AVC_FIT * W; }
  var up = Math.max(m.capHeight / m.unitsPerEm, AVC_WIDE_RE.test(text) ? AVC_WIDE_UP : 0);
  var down = Math.max(/[gjpqy,;()[\]{}|]/.test(text) ? -m.descent / m.unitsPerEm : 0, AVC_WIDE_RE.test(text) ? AVC_WIDE_DOWN : 0);
  // The ink box is centred on (x %, y %) of the canvas.
  var cx = (avcNum(data.x, 50, 10, 90) / 100) * W, cy = (avcNum(data.y, 50, 10, 90) / 100) * H;
  var x = cx - w / 2, y = cy + ((up - down) / 2) * size;
  return { text: text, x: x, y: y, size: size, w: w, hangul: ko, color: typeof data.color === "string" && data.color ? data.color : AVC_DEFAULTS.color,
    family: AVC_FACE.family, weight: ko ? 700 : AVC_FACE.weight, stack: avcFontStack(AVC_FACE.family), box: [x, y - up * size, x + w, y + down * size] };
}
// av-credit:end

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export default function ArchivedCredit({ data: raw }: { data: any }) {
  const data = (raw || {}) as any;
  const config = useVideoConfig();
  const width = num(config && config.width, 1920);
  const height = num(config && config.height, 1080);
  const fonts: any[] = Array.isArray(data.fonts) ? data.fonts.filter((f: any) => f && f.b64) : [];
  const [ready, setReady] = useState(fonts.length === 0);
  const [handle] = useState(() => (fonts.length && typeof document !== "undefined" && document.fonts ? delayRender("archive vlog credit fonts") : null));
  const released = useRef(false);
  const release = () => {
    if (handle != null && !released.current) { released.current = true; continueRender(handle); }
  };
  useEffect(() => {
    if (ready) return;
    let live = true;
    const done = () => { if (live) setReady(true); };
    if (typeof document === "undefined" || !document.fonts) { done(); return; }
    Promise.all(fonts.map((f) => document.fonts.load(`${f.style || "normal"} ${f.weight} 100px "${f.family}"`).catch(() => null))).finally(done);
    return () => { live = false; };
  }, [ready]);
  useEffect(() => { if (ready) release(); }, [ready, handle]);
  // Never leave the render blocked if the graphic unmounts before the fonts settle.
  useEffect(() => release, []);

  // Static: the layout depends only on the parameters and the canvas size.
  const c: any = useMemo(() => avCreditLayout(data, width, height), [raw, width, height]);
  const shadow = Math.max(0, Math.min(1, num(data.shadow, 0.3)));
  const fontFaces = fonts.map((f) => `@font-face{font-family:"${f.family}";src:url("data:font/woff2;base64,${f.b64}") format("woff2");font-style:${f.style || "normal"};font-weight:${f.weight};}`).join("");
  return (
    <AbsoluteFill>
      {fontFaces ? <style>{fontFaces}</style> : null}
      {c ? (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: shadow > 0 ? `drop-shadow(0 ${height * 0.002}px ${height * 0.006}px rgba(0,0,0,${shadow}))` : undefined }}>
          <text x={c.x} y={c.y} fill={c.color} fontSize={c.size} fontFamily={c.stack} fontWeight={c.weight} style={{ whiteSpace: "pre", fontKerning: "none", fontVariantLigatures: "none" }}>{c.text}</text>
        </svg>
      ) : null}
    </AbsoluteFill>
  );
}
