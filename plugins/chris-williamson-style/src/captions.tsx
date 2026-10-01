import React from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
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
    <div style={{position: "absolute", left: "3%", width: "94%", top: Number(data.captionY ?? 50) + "%", transform: "translateY(-50%)", textAlign: "center", fontFamily: '"' + family + '"', fontWeight: Number(data.fontWeight || 800), color: String(data.color || "#ffffff"), fontSize: size, letterSpacing: Number(data.trackingEm ?? -0.03) + "em", lineHeight: 1.1, whiteSpace: data.keyword ? "nowrap" : "pre-wrap", overflowWrap: data.keyword ? "normal" : "anywhere"}}>
      {words.map((word, i) => {
        const at = matching ? starts[i] : start + (words.length < 2 ? 0 : span * i / (words.length - 1));
        const age = frame / fps - at;
        const opacity = data.keyword ? 1 : age < 0 ? 0 : age < Number(data.dimSeconds ?? 0.1) ? Number(data.dimOpacity ?? 0.55) : 1;
        return <span key={i} style={{opacity}}>{word}{i + 1 < words.length ? " " : ""}</span>;
      })}
    </div>
  </AbsoluteFill>;
}
