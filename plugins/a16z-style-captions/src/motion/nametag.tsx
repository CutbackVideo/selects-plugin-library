// The name tag: first name in serif roman + surname in serif italic, a role line in the caption sans,
// a thin burgundy bar on the left. It arrives with a burgundy block wipe (0.85 s) and leaves on the
// next picture cut.
import React from "react";
import { width100, metrics } from "./text";
import type { Faces } from "./captions";
import type { NameTag, GraphicData } from "./data";

const BAR = "#8A2636";
const easeOutQuad = (p: number) => 1 - (1 - p) * (1 - p);
const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function drawNameTag(tag: NameTag, frame: number, d: GraphicData, faces: Faces): React.ReactNode {
  const W = d.W;
  const H = d.H;
  const s = d.fps / 24; // the wipe is measured in 24 fps frames
  const f = (frame - tag.a) / s;
  const capPx = tag.cap * H;
  const size1 = capPx / metrics(faces.roman).cap;
  const size2 = size1 * 0.68;
  const serifSize = (size1 * metrics(faces.roman).xh) / metrics(faces.serif).xh;
  const w1a = (width100(tag.first + " ", faces.roman) / 100) * size1;
  const w1b = (width100(tag.last, faces.serif) / 100) * serifSize;
  const w2 = (width100(tag.role, faces.sans) / 100) * size2 - tag.role.length * 0.01 * size2;
  const barW = 0.012 * W;
  const barX = tag.x * W;
  const textX = barX + barW + 0.0065 * W;
  const top = tag.y * H;
  const base1 = top + capPx;
  const base2 = base1 + size2 * 1.18;
  const textW = Math.max(w1a + w1b, w2);
  const blockTop = top - 0.08 * capPx;
  const blockBottom = base2 + size2 * 0.28;
  const R = textX + textW + 0.012 * W;
  // block edges over the wipe
  let left = barX;
  let right = R;
  let block = true;
  if (f < 7) {
    const p = easeOutQuad(clamp01(f / 7));
    left = R - (R - barX) * (0.35 + 0.65 * p);
  } else if (f < 20) {
    const p = easeInOut(clamp01((f - 8) / 12));
    right = R - (R - (barX + barW)) * p;
    left = barX - 0.02 * W * p;
  } else block = false;
  // the text shows to the right of the block's right edge, all of it once the block has collapsed
  const reveal = f < 8 ? R : block ? right : 0;
  const m1 = metrics(faces.roman);
  const ms = metrics(faces.sans);
  const line = (key: string, x: number, base: number, size: number, face: Faces["sans"], text: string, track = 0) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: x,
        top: base - (size * (1 + metrics(face).ascent - metrics(face).descent)) / 2,
        fontFamily: face.family,
        fontWeight: face.weight,
        fontStyle: face.style,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: track,
        whiteSpace: "pre",
        color: "#FFFFFF",
      }}
    >
      {text}
    </div>
  );
  void m1;
  void ms;
  return (
    <div key="nametag" style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, clipPath: "inset(0 0 0 " + Math.max(0, reveal).toFixed(1) + "px)" }}>
        {line("n1", textX, base1, size1, faces.roman, tag.first + " ")}
        {line("n2", textX + w1a, base1, serifSize, faces.serif, tag.last)}
        {line("n3", textX, base2, size2, faces.sans, tag.role, -0.01 * size2)}
      </div>
      {block ? (
        <div style={{ position: "absolute", left, width: Math.max(0, right - left), top: blockTop, height: blockBottom - blockTop, background: "linear-gradient(90deg, #962C39, #5E0A22)" }} />
      ) : (
        <div style={{ position: "absolute", left: barX, width: barW, top: top - 0.05 * capPx, height: blockBottom - top - 0.1 * capPx, background: BAR }} />
      )}
    </div>
  );
}
