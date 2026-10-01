// Caption layout and per-frame drawing. Layout follows the measured house style: one centred line of
// medium grotesk at a fixed x-height, mixed-size lockups whose small lines nest against a big line, and
// serif italic matched to the sans x-height on the same baseline.
import React from "react";
import { width100, metrics, type FontSpec } from "./text";
import type { PUnit, GraphicData } from "./data";

export type Faces = { sans: FontSpec; serif: FontSpec; roman: FontSpec; light: FontSpec };

type LaidToken = { text: string; x: number; base: number; size: number; face: FontSpec; track: number; reveal: number; accent?: string; kept: boolean };
type Laid = { tokens: LaidToken[]; top: number; bottom: number };

const cache: Record<string, Laid> = {};
export function clearLayoutCache() {
  for (const k of Object.keys(cache)) delete cache[k];
}

const faceOf = (faces: Faces, f: number) => (f === 1 ? faces.serif : f === 2 ? faces.roman : faces.sans);

// Letter spacing (em) per face: the sans is set tight so a 13-character lowercase line spans about half
// the frame width at the base size; the serif keeps a light negative tracking.
function trackingEm(face: FontSpec, faces: Faces, W: number, baseSize: number): number {
  if (face !== faces.sans) return -0.012;
  const ref = "and the world";
  const natural = (width100(ref, face) / 100) * baseSize;
  const t = (0.5 * W - natural) / (ref.length * baseSize);
  return Math.max(-0.045, Math.min(0, t));
}

type LineIn = { toks: { text: string; face: FontSpec; size: number; reveal: number; accent?: string; kept: boolean }[]; align: "center" | "left" | "right" };

function measureLine(line: LineIn, faces: Faces, W: number, baseSize: number) {
  let x = 0;
  const out: { dx: number; w: number }[] = [];
  line.toks.forEach((t, j) => {
    const tr = trackingEm(t.face, faces, W, baseSize) * t.size;
    const w = (width100(t.text, t.face) / 100) * t.size + t.text.length * tr;
    if (j > 0) {
      const sp = (width100(" ", faces.sans) / 100) * Math.min(t.size, line.toks[j - 1].size) * 0.86;
      x += sp;
    }
    out.push({ dx: x, w });
    x += w;
  });
  return { width: x, parts: out };
}

export function layoutUnit(u: PUnit, k: number, data: GraphicData, faces: Faces, shrink: number): Laid {
  const key = data.uid + "|" + k + "|" + shrink.toFixed(3);
  if (cache[key]) return cache[key];
  const W = data.W;
  const H = data.H;
  const ms = metrics(faces.sans);
  const em0 = (data.xh * H) / ms.xh; // base sans size
  const grow = u.g || 1;
  // a face's size for a target sans-equivalent size: serif x-height matched to the sans
  const sized = (face: FontSpec, sansSize: number) => (face === faces.sans ? sansSize : (sansSize * ms.xh) / metrics(face).xh);
  const tokenFace = (lineFace: number, tokFace: number) => faceOf(faces, tokFace || lineFace);
  const lines = u.l.map((l) => ({ from: l[0], to: l[1], scale: l[2], face: l[3], big: l[4] === 1 }));
  const bigIdx = lines.findIndex((l) => l.big);
  const laid: LaidToken[] = [];
  const mk = (li: number, sansSize: number): LineIn => {
    const l = lines[li];
    return {
      align: "center",
      toks: u.t.slice(l.from, l.to).map((t, j) => {
        const face = tokenFace(l.face, t[2]);
        return { text: t[0], face, size: sized(face, sansSize), reveal: t[1], accent: t[3], kept: (u.sw || 0) > l.from + j };
      }),
    };
  };
  let top = 0;
  let bottom = 0;
  if (lines.length === 1 || bigIdx < 0) {
    // single line(s): centred, the base size times the tier scale, shrunk to fit 0.86 W
    const maxW = (data.xh < 0.029 ? 0.9 : 0.86) * W;
    let y = u.y * H;
    lines.forEach((_, li) => {
      let size = em0 * lines[li].scale * grow * shrink;
      let line = mk(li, size);
      let m = measureLine(line, faces, W, em0);
      if (m.width > maxW) {
        size *= maxW / m.width;
        line = mk(li, size);
        m = measureLine(line, faces, W, em0);
      }
      const cap = ms.cap * size;
      const base = li === 0 ? y + cap / 2 : y;
      const x0 = (W - m.width) / 2;
      line.toks.forEach((t, j) => laid.push({ text: t.text, x: x0 + m.parts[j].dx, base, size: t.size, face: t.face, track: trackingEm(t.face, faces, W, em0) * t.size, reveal: t.reveal, accent: t.accent, kept: t.kept }));
      if (li === 0) top = base - cap;
      bottom = base + ms.descent * size * 0.5;
      y = base + size * 1.12;
    });
    const res = { tokens: laid, top, bottom };
    cache[key] = res;
    return res;
  }
  // lockup: the big line first, then the small lines nested around it
  const bigFace = faceOf(faces, lines[bigIdx].face);
  let bigSans = em0 * lines[bigIdx].scale * shrink;
  let bigLine = mk(bigIdx, bigSans);
  let bm = measureLine(bigLine, faces, W, em0);
  if (bm.width > 0.8 * W) {
    bigSans *= (0.8 * W) / bm.width;
    bigLine = mk(bigIdx, bigSans);
    bm = measureLine(bigLine, faces, W, em0);
  }
  bigSans = Math.min(bigSans, 3.3 * em0);
  bigLine = mk(bigIdx, bigSans);
  bm = measureLine(bigLine, faces, W, em0);
  const xhBig = metrics(bigFace).xh * sized(bigFace, bigSans);
  // small lines: x-height 0.42 of the big line's, never below 0.7 of the base
  const smallSans = Math.max(0.7 * em0, (0.42 * xhBig) / ms.xh) * 1;
  const placed: { li: number; line: LineIn; m: ReturnType<typeof measureLine>; base: number; x0: number }[] = [];
  const centered = u.tp === "stack" || u.tp === "two";
  placed.push({ li: bigIdx, line: bigLine, m: bm, base: 0, x0: 0 });
  // lines above: flush left with the big line
  let base = 0;
  // a small line is never wider than the big line (the big line stays the widest)
  const smallFor = (li: number) => {
    let sz = smallSans * shrink;
    const w = measureLine(mk(li, sz), faces, W, em0).width;
    if (w > bm.width * 0.96) sz *= Math.max(0.75, (bm.width * 0.96) / w);
    return sz;
  };
  for (let li = bigIdx - 1; li >= 0; li -= 1) {
    const line = mk(li, smallFor(li));
    const m = measureLine(line, faces, W, em0);
    // the lead-in's baseline rests on the big line's cap height (ink gap about zero)
    const capBig = metrics(bigFace).cap * sized(bigFace, bigSans);
    base = li === bigIdx - 1 ? -(capBig + 0.12 * xhBig) : base - 1.08 * smallSans * shrink;
    placed.push({ li, line, m, base, x0: centered ? (bm.width - m.width) / 2 : 0 });
  }
  // lines below: flush right
  base = 0;
  for (let li = bigIdx + 1; li < lines.length; li += 1) {
    const line = mk(li, smallFor(li));
    const m = measureLine(line, faces, W, em0);
    // the tail's x-height top sits just under the big baseline, so its ascenders nest into the big
    // line's lower half; a centred stack keeps a small positive gap instead
    const smallPx = smallSans * shrink;
    base =
      li === bigIdx + 1
        ? centered
          ? metrics(bigFace).descent * sized(bigFace, bigSans) + ms.cap * smallPx + 0.05 * xhBig
          : tailGap(bigLine, bm, smallPx, xhBig, ms.xh)
        : base + 1.08 * smallPx;
    const right = Math.min(bm.width + 0.06 * W, Math.max(bm.width, m.width));
    placed.push({ li, line, m, base, x0: centered ? (bm.width - m.width) / 2 : right - m.width });
  }
  // block extents, centred at x 0.5; the block's top goes where a single line's top would go
  let minX = 1e9;
  let maxX = -1e9;
  let minY = 1e9;
  let maxY = -1e9;
  for (const p of placed) {
    minX = Math.min(minX, p.x0);
    maxX = Math.max(maxX, p.x0 + p.m.width);
    const size = p.line.toks[0]?.size || em0;
    const f = p.line.toks[0]?.face || faces.sans;
    minY = Math.min(minY, p.base - metrics(f).cap * size);
    maxY = Math.max(maxY, p.base + metrics(f).descent * size * 0.4);
  }
  const singleTop = u.y * H - (ms.cap * em0) / 2;
  let dy = singleTop - minY;
  if (maxY + dy > 0.83 * H) dy = 0.83 * H - maxY;
  const dx = (W - (maxX - minX)) / 2 - minX;
  for (const p of placed)
    p.line.toks.forEach((t, j) =>
      laid.push({ text: t.text, x: dx + p.x0 + p.m.parts[j].dx, base: p.base + dy, size: t.size, face: t.face, track: trackingEm(t.face, faces, W, em0) * t.size, reveal: t.reveal, accent: t.accent, kept: t.kept })
    );
  const res = { tokens: laid, top: minY + dy, bottom: maxY + dy };
  cache[key] = res;
  return res;
}

// Under a big line whose right half has descenders (g, j, p, q, y), the flush-right tail drops below
// them with a little clearance; otherwise its x-height top tucks just under the big baseline.
function tailGap(big: LineIn, m: { width: number; parts: { dx: number; w: number }[] }, smallPx: number, xhBig: number, xhRatio: number): number {
  let desc = false;
  big.toks.forEach((t, j) => {
    const part = m.parts[j];
    if (part.dx + part.w > m.width * 0.4 && /[gjpqy,;]/.test(t.text)) desc = true;
  });
  const size = big.toks[0]?.size || 0;
  return (desc ? 0.24 * size + 0.15 * smallPx : 0.14 * xhBig) + xhRatio * smallPx;
}

const mix = (a: string, b: string, p: number) => {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const x = h(a);
  const y = h(b);
  return "rgb(" + x.map((v, i) => Math.round(v + (y[i] - v) * p)).join(",") + ")";
};

export function drawUnit(u: PUnit, k: number, frame: number, data: GraphicData, faces: Faces, shrink: number): React.ReactNode {
  const laid = layoutUnit(u, k, data, faces, shrink);
  const s1080 = data.W / 1080;
  const xhPx = data.xh * data.H;
  const [kind, sigma0, frames, curve] = u.e;
  return laid.tokens.map((t, j) => {
    if (frame < t.reveal && !t.kept) return null;
    const f = t.kept ? 1e6 : frame - t.reveal;
    let sigma = 0;
    let glow = 0;
    let rise = 0;
    if (kind === "b" && f < frames) {
      const p = Math.min(1, f / Math.max(1, frames));
      const q = curve === "c" ? Math.pow(1 - p, 3) : Math.pow(1 - p, 2);
      sigma = sigma0 * q * s1080;
      glow = 0.35 * Math.pow(1 - p, 2);
    } else if (kind === "r" && f < 3) rise = 0.4 * xhPx * Math.pow(1 - f / 3, 3);
    let color = u.d ? "#363636" : "#FFFFFF";
    if (t.accent && !u.d) {
      const hold = 3;
      const span = Math.max(1, Math.round(0.45 * data.fps) - hold);
      color = f < hold ? t.accent : mix(t.accent, "#FFFFFF", Math.min(1, (f - hold) / span));
    }
    const m = metrics(t.face);
    const top = t.base - (t.size * (1 + m.ascent - m.descent)) / 2 + rise;
    const shadow = u.d ? "none" : "0 " + (1 * s1080).toFixed(1) + "px " + (0.3 * xhPx).toFixed(1) + "px rgba(0,0,0,0.30)" + (glow > 0.004 ? ", 0 0 " + (2 * sigma).toFixed(1) + "px rgba(255,255,255," + glow.toFixed(3) + ")" : "");
    return (
      <div
        key={k + "-" + j}
        style={{
          position: "absolute",
          left: t.x,
          top,
          fontFamily: t.face.family,
          fontWeight: t.face.weight,
          fontStyle: t.face.style,
          fontSize: t.size,
          lineHeight: 1,
          letterSpacing: t.track,
          whiteSpace: "pre",
          color,
          textShadow: shadow,
          filter: sigma > 0.05 ? "blur(" + sigma.toFixed(2) + "px)" : undefined,
          fontKerning: "normal",
        }}
      >
        {t.text}
      </div>
    );
  });
}
