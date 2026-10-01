// Keyword cards: a full-frame field with one to three lines built on their spoken onsets.
//   burgundy: gradient field, one white sans word with a soft glow; a few glowing specks, then the word
//             sharpens in (the house "weight grow" read as ink filling in).
//   cream:    paper field, near-black sans with one serif italic word, hard word pops, slow push.
import React from "react";
import { width100, metrics } from "./text";
import type { Faces } from "./captions";
import type { Card, GraphicData } from "./data";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function hash(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function drawCard(c: Card, i: number, frame: number, d: GraphicData, faces: Faces): React.ReactNode {
  const W = d.W;
  const H = d.H;
  const s24 = d.fps / 24;
  const f = frame - c.a;
  const dur = Math.max(1, c.b - c.a);
  const push = 1 + (c.push || 0.05) * clamp01(f / dur);
  const cream = c.palette === "cream";
  const bg = cream ? "#F4F2EA" : "linear-gradient(180deg, #8F213E 0%, #6E1429 55%, #4E0617 100%)";
  const ink = cream ? "#141414" : "#FFFFFF";
  const ms = metrics(faces.sans);
  const baseSans = (0.029 * H) / ms.xh;
  // lines: centred block at y 0.46-0.52, width at most 0.82 W
  const laid = c.lines.map((l) => {
    const face = l.face === 1 ? faces.serif : l.face === 2 ? faces.roman : faces.sans;
    let size = baseSans * l.scale * (face === faces.sans ? 1 : ms.xh / metrics(face).xh);
    const w = (width100(l.text, face) / 100) * size * (face === faces.sans ? 0.97 : 1);
    if (w > 0.82 * W) size *= (0.82 * W) / w;
    const width = (width100(l.text, face) / 100) * size * (face === faces.sans ? 0.97 : 1);
    return { ...l, face, size, width };
  });
  const gap = (a: (typeof laid)[0]) => a.size * 1.02;
  const total = laid.reduce((acc, l, k) => acc + (k ? gap(l) : metrics(l.face).cap * l.size), 0);
  let base = 0.49 * H - total / 2 + (laid[0] ? metrics(laid[0].face).cap * laid[0].size : 0);
  const nodes: React.ReactNode[] = [];
  laid.forEach((l, k) => {
    if (k) base += gap(l);
    const fl = frame - l.at;
    if (fl < 0) return;
    const m = metrics(l.face);
    let opacity = 1;
    let blur = 0;
    let glow = cream ? "none" : "0 0 " + (0.6 * l.size * 0.1).toFixed(1) + "px rgba(255,235,240,0.45)";
    if (!cream) {
      // empty 4 frames, specks for 2, then the word fills in by 10 frames
      const g = fl / s24;
      if (g < 4) opacity = 0;
      else {
        const p = clamp01((g - 4) / 6);
        opacity = 0.36 + 0.64 * p;
        blur = (1 - p) * 4 * (W / 1080);
      }
      if (g >= 4 && g < 6)
        for (let n = 0; n < 7; n += 1)
          nodes.push(
            <div
              key={"sp" + i + "-" + k + "-" + n}
              style={{
                position: "absolute",
                left: (W - l.width) / 2 + hash(n + 3 * k) * l.width,
                top: base - m.xh * l.size * (0.2 + 0.8 * hash(n + 17)),
                width: 5,
                height: 5,
                borderRadius: 3,
                background: "#FFF6F8",
                boxShadow: "0 0 10px 4px rgba(255,220,230,0.8)",
              }}
            />
          );
    }
    nodes.push(
      <div
        key={"cl" + i + "-" + k}
        style={{
          position: "absolute",
          left: (W - l.width) / 2,
          top: base - (l.size * (1 + m.ascent - m.descent)) / 2,
          fontFamily: l.face.family,
          fontWeight: l.face.weight,
          fontStyle: l.face.style,
          fontSize: l.size,
          lineHeight: 1,
          letterSpacing: l.face === faces.sans ? -0.03 * l.size : 0,
          whiteSpace: "pre",
          color: ink,
          opacity,
          filter: blur > 0.05 ? "blur(" + blur.toFixed(2) + "px)" : undefined,
          textShadow: glow,
        }}
      >
        {l.text}
      </div>
    );
  });
  return (
    <div key={"card" + i} style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: "scale(" + push.toFixed(4) + ")", transformOrigin: "50% 49%" }}>{nodes}</div>
    </div>
  );
}
