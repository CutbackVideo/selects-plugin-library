import React from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
// A narrow opposite-color edge protects small phrases against local highlights
// and textured footage that an average background measurement cannot describe.
export function phraseOutline(color: string, size: number) {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  const rgb = hex ? [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)) : [255, 255, 255];
  const light = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > 128;
  return {WebkitTextStroke: Math.max(.75, size * .035) + "px " + (light ? "#111111" : "#ffffff"), paintOrder: "stroke fill"};
}
// Keep a small opaque contour visible over isolated highlights after downscaling.
// The fallback keyword uses the same contour with a raster-scaled radius cap;
// its separate footage-filled B-roll renderer and all glyph layout stay unchanged.
export function phraseHalo(color: string, size: number, maxRadius = Infinity) {
  const edge = phraseOutline(color, size).WebkitTextStroke.split(" ").at(-1);
  const radius = Math.min(maxRadius, Math.max(.5, size * .025));
  return [[-radius, 0], [radius, 0], [0, -radius], [0, radius]]
    .map(([x, y]) => `${x}px ${y}px 0 ${edge}`).join(", ");
}
// Dim the entering word's fill without dimming its protective outline as well.
export function phraseRevealStyle(color: string, opacity: number) {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (!hex || opacity === 0 || opacity === 1) return {opacity};
  const rgb = [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16));
  return {opacity: 1, WebkitTextFillColor: `rgba(${rgb.join(", ")}, ${opacity})`};
}
// One independently editable phrase/keyword. All timestamps are seconds in this generator.
export default function Caption({data = {}}: {data?: Record<string, any>}) {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const text = String(data.text || "");
  const words = text.trim().split(/\s+/).filter(Boolean);
  const starts: number[] = Array.isArray(data.wordStartsSeconds) ? data.wordStartsSeconds : [];
  const start = Number(data.revealStartSeconds || 0);
  const span = Math.max(0, Number(data.revealSpanSeconds || 0));
  const matching = words.length === starts.length;
  const family = String(data.fontFamily || "Chris Reference Inter").replace(/["\\]/g, "");
  const scale = Math.min(width / 1080, height / 1920);
  const size = Number(data.fontSize || 53) * scale;
  return <AbsoluteFill style={{pointerEvents: "none"}}>
    {data.fontCss && <style>{String(data.fontCss)}</style>}
    <div style={{...(data.keyword ? {} : phraseOutline(String(data.color || "#ffffff"), size)), textShadow: phraseHalo(String(data.color || "#ffffff"), size, data.keyword ? 2 * scale : undefined), position: "absolute", left: "3%", width: "94%", top: Number(data.captionY ?? 50) + "%", transform: "translateY(-50%)", textAlign: "center", fontFamily: '"' + family + '", "Helvetica Neue", "Segoe UI", Arial, sans-serif', fontWeight: Number(data.fontWeight || 800), color: String(data.color || "#ffffff"), fontSize: size, letterSpacing: Number(data.trackingEm ?? -0.03) + "em", lineHeight: 1.1, whiteSpace: data.keyword ? "nowrap" : "pre-wrap", overflowWrap: data.keyword ? "normal" : "anywhere"}}>
      {words.map((word, i) => {
        const at = matching ? starts[i] : start + (words.length < 2 ? 0 : span * i / (words.length - 1));
        const age = frame / fps - at;
        const opacity = data.keyword ? 1 : age < 0 ? 0 : age < Number(data.dimSeconds ?? 0.1) ? Number(data.dimOpacity ?? 0.55) : 1;
        return <span key={i} style={data.keyword ? {opacity} : phraseRevealStyle(String(data.color || "#ffffff"), opacity)}>{word}{i + 1 < words.length ? " " : ""}</span>;
      })}
    </div>
  </AbsoluteFill>;
}
