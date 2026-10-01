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

// A long role line first gets smaller, then breaks in two (after a comma when it has one).
function splitRole(role: string): string[] {
  const words = role.split(" ");
  if (words.length < 2) return [role];
  const mid = role.length / 2;
  let best = 1;
  let score = Infinity;
  for (let k = 1; k < words.length; k += 1) {
    const at = words.slice(0, k).join(" ").length;
    const s = Math.abs(at - mid) - (/,$/.test(words[k - 1]) ? role.length : 0);
    if (s < score) {
      score = s;
      best = k;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

// Sizes and positions of the tag, shared by the drawing and by the placement against captions.
export function tagLayout(tag: NameTag, d: GraphicData, faces: Faces) {
  const W = d.W;
  const H = d.H;
  // line 1 at the given cap height, narrowed so the name stays within about 0.62 W
  let capPx = tag.cap * H;
  const lineW = (cap: number) => {
    const s1 = cap / metrics(faces.roman).cap;
    const ss = (s1 * metrics(faces.roman).xh) / metrics(faces.serif).xh;
    return (width100(tag.first + " ", faces.roman) / 100) * s1 + (width100(tag.last, faces.serif) / 100) * ss;
  };
  if (lineW(capPx) > 0.62 * W) capPx *= (0.62 * W) / lineW(capPx);
  const size1 = capPx / metrics(faces.roman).cap;
  const serifSize = (size1 * metrics(faces.roman).xh) / metrics(faces.serif).xh;
  const w1a = (width100(tag.first + " ", faces.roman) / 100) * size1;
  const w1b = (width100(tag.last, faces.serif) / 100) * serifSize;
  const barW = 0.012 * W;
  const barX = tag.x * W;
  const textX = barX + barW + 0.0065 * W;
  // the role line stays inside the frame: smaller first (not below about half the name), then two lines
  const avail = 0.95 * W - 0.012 * W - textX;
  const roleW = (text: string, size: number) => (width100(text, faces.sans) / 100) * size - text.length * 0.01 * size;
  let size2 = size1 * 0.68;
  let roles = [tag.role];
  if (roleW(tag.role, size2) > avail) {
    const fit = (size2 * avail) / roleW(tag.role, size2);
    if (fit >= size1 * 0.52) size2 = fit;
    else {
      roles = splitRole(tag.role);
      const widest = Math.max(...roles.map((r) => roleW(r, size2)));
      if (widest > avail) size2 *= avail / widest;
    }
  }
  const w2 = Math.max(...roles.map((r) => roleW(r, size2)));
  const top = tag.y * H;
  const base1 = top + capPx;
  const bases = roles.map((_, k) => base1 + size2 * 1.18 * (k + 1));
  const textW = Math.max(w1a + w1b, w2);
  const blockTop = top - 0.08 * capPx;
  const blockBottom = bases[bases.length - 1] + size2 * 0.28;
  const R = Math.min(0.95 * W, textX + textW + 0.012 * W);
  return { capPx, size1, size2, serifSize, w1a, barW, barX, textX, top, base1, bases, roles, blockTop, blockBottom, R };
}

export function drawNameTag(tag: NameTag, frame: number, d: GraphicData, faces: Faces): React.ReactNode {
  const W = d.W;
  const s = d.fps / 24; // the wipe is measured in 24 fps frames
  const f = (frame - tag.a) / s;
  const { capPx, size1, size2, serifSize, w1a, barW, barX, textX, top, base1, bases, roles, blockTop, blockBottom, R } = tagLayout(tag, d, faces);
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
        {roles.map((r, k) => line("n" + (3 + k), textX, bases[k], size2, faces.sans, r, -0.01 * size2))}
      </div>
      {block ? (
        <div style={{ position: "absolute", left, width: Math.max(0, right - left), top: blockTop, height: blockBottom - blockTop, background: "linear-gradient(90deg, #962C39, #5E0A22)" }} />
      ) : (
        <div style={{ position: "absolute", left: barX, width: barW, top: top - 0.05 * capPx, height: blockBottom - top - 0.1 * capPx, background: BAR }} />
      )}
    </div>
  );
}
