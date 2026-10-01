// Designed full-frame inserts in the house style. Every field has texture (grid, grain, engraving), type
// mixes the caption grotesk with a high-contrast serif, and words arrive on their spoken onsets:
//   keyword  burgundy field with a grid; one word that sharpens in out of a few glowing specks
//   chapter  cream engraved field, navy serif numeral and italic title; enters and leaves with an
//            oxblood push wipe
//   number   cream field, a big serif numeral that counts up, a sans label
//   versus   white framework card: sans line, small serif-italic connector, serif-italic line; letters
//            settle grey -> ink in random order
//   list     cream field, numbered items stacking in on their onsets
//   bubbles  white field, message bubbles popping in (quoted messages)
//   quote    cream paper, one sentence in near-black sans with a serif-italic key word
import React from "react";
import { width100, metrics, type FontSpec } from "./text";
import type { Faces } from "./captions";
import type { Card, GraphicData, DItem } from "./data";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
const NAVY = "#0A1A3E";
const INK = "#141414";
const CREAM = "#F4F2EA";
const OXBLOOD = "#4C070E";

function rand(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ---- fields --------------------------------------------------------------------------------------------
function grain(id: string, seed: number, opacity: number, blend: string) {
  return (
    <svg key={id} width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity, mixBlendMode: blend as any }}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={"url(#" + id + ")"} />
    </svg>
  );
}

function burgundyField(d: GraphicData, uid: string, frame: number): React.ReactNode[] {
  const cell = (d.W * 105) / 1080;
  return [
    <div key="bg" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #8F213E 0%, #6E1429 55%, #4E0617 100%)" }} />,
    <div key="rad" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 46%, rgba(120,30,55,0.55) 0%, rgba(40,0,10,0) 55%, rgba(30,0,8,0.55) 100%)" }} />,
    <svg key="grid" width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.32 }}>
      <defs>
        <pattern id={"g" + uid} width={cell} height={cell} patternUnits="userSpaceOnUse">
          <path d={"M " + cell + " 0 L 0 0 0 " + cell} fill="none" stroke="#C0637F" strokeWidth={1.6} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={"url(#g" + uid + ")"} />
    </svg>,
    grain("n" + uid, 1 + (Math.floor(frame / 2) % 7), 0.13, "overlay"),
  ];
}

// A cream field with a faint engraving: rays from a vanishing point and nested arches, drifting left.
function creamField(d: GraphicData, uid: string, frame: number, drift: number, engraved = true): React.ReactNode[] {
  const W = d.W;
  const H = d.H;
  const cx = W * 0.62 - drift;
  const cy = H * 0.3;
  const rays: string[] = [];
  for (let k = 0; k < 48; k += 1) {
    const a = (Math.PI * 2 * k) / 48;
    rays.push("M " + cx.toFixed(0) + " " + cy.toFixed(0) + " L " + (cx + Math.cos(a) * W * 1.6).toFixed(0) + " " + (cy + Math.sin(a) * W * 1.6).toFixed(0));
  }
  const arches: string[] = [];
  for (let k = 0; k < 7; k += 1) {
    const r = W * (0.12 + k * 0.09);
    const x0 = W * 0.18 - drift * 0.6;
    const y0 = H * 0.86;
    arches.push("M " + (x0 - r).toFixed(0) + " " + y0.toFixed(0) + " A " + r.toFixed(0) + " " + (r * 1.4).toFixed(0) + " 0 0 1 " + (x0 + r).toFixed(0) + " " + y0.toFixed(0));
  }
  return [
    <div key="bg" style={{ position: "absolute", inset: 0, background: CREAM }} />,
    engraved ? (
      <svg key="eng" width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
        <path d={rays.join(" ")} stroke="#E0DACB" strokeWidth={1.2} fill="none" />
        <path d={arches.join(" ")} stroke="#DCD5C3" strokeWidth={1.6} fill="none" />
      </svg>
    ) : null,
    grain("n" + uid, 3 + (Math.floor(frame / 2) % 5), 0.1, "multiply"),
  ];
}

// ---- text ----------------------------------------------------------------------------------------------
type T = { text: string; face: FontSpec; size: number; color: string; track?: number };

function tw(t: T): number {
  return (width100(t.text, t.face) / 100) * t.size + t.text.length * (t.track || 0) * t.size;
}
function sizeFor(face: FontSpec, cap: number) {
  return cap / metrics(face).cap;
}
function fit(t: T, maxW: number): T {
  const w = tw(t);
  return w > maxW ? { ...t, size: (t.size * maxW) / w } : t;
}
function textAt(key: string, t: T, x: number, base: number, style: React.CSSProperties = {}) {
  const m = metrics(t.face);
  return (
    <div
      key={key}
      style={{
        position: "absolute",
        left: x,
        top: base - (t.size * (1 + m.ascent - m.descent)) / 2,
        fontFamily: t.face.family,
        fontWeight: t.face.weight,
        fontStyle: t.face.style,
        fontSize: t.size,
        lineHeight: 1,
        letterSpacing: (t.track || 0) * t.size,
        whiteSpace: "pre",
        color: t.color,
        ...style,
      }}
    >
      {t.text}
    </div>
  );
}
// letters settling from light grey to ink in a random order (light cards)
function decode(key: string, t: T, x: number, base: number, frame: number, at: number, fps: number) {
  const span = Math.max(1, Math.round(0.35 * fps));
  const out: React.ReactNode[] = [];
  let cx = x;
  for (let i = 0; i < t.text.length; i += 1) {
    const ch = t.text[i];
    const w = (width100(ch, t.face) / 100) * t.size + (t.track || 0) * t.size;
    const when = at + Math.floor(rand(i * 7 + key.length) * span);
    const p = clamp01((frame - when) / 3);
    if (frame >= at) out.push(textAt(key + i, { ...t, text: ch, color: p >= 1 ? t.color : mix("#B9B6AE", t.color, p) }, cx, base, { opacity: frame >= when ? 1 : 0.0 }));
    cx += w;
  }
  return out;
}
function mix(a: string, b: string, p: number) {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const x = h(a);
  const y = h(b);
  return "rgb(" + x.map((v, i) => Math.round(v + (y[i] - v) * p)).join(",") + ")";
}

const itemsOf = (c: Card, role?: DItem["role"]) => c.items.filter((i) => !role || i.role === role);

// ---- templates -----------------------------------------------------------------------------------------
export function drawCard(c: Card, i: number, frame: number, d: GraphicData, faces: Faces): React.ReactNode {
  const W = d.W;
  const H = d.H;
  const fps = d.fps;
  const s24 = fps / 24;
  const f = frame - c.a;
  const dur = Math.max(1, c.b - c.a);
  const uid = d.uid + "c" + i;
  const ms = metrics(faces.sans);
  const baseSans = (d.xh * H) / ms.xh;
  let field: React.ReactNode[] = [];
  const nodes: React.ReactNode[] = [];
  let push = 0;
  let wrapper: React.CSSProperties = {};
  let fadeWhite = 0;

  if (c.kind === "keyword" && c.palette === "cream") {
    // the cream thesis card: a small sans lead-in, then the concept in a large serif italic
    field = creamField(d, uid, frame, (f / dur) * W * 0.05);
    push = 0.05;
    const lead = itemsOf(c, "label")[0];
    const key = itemsOf(c, "key")[0];
    const k = key ? fit({ text: key.text, face: faces.serif, size: sizeFor(faces.serif, 0.06 * H), color: INK }, 0.84 * W) : null;
    const l = lead ? fit({ text: lead.text, face: faces.sans, size: sizeFor(faces.sans, 0.022 * H), color: INK, track: -0.03 }, 0.8 * W) : null;
    const kBase = 0.5 * H + (k ? (metrics(faces.serif).cap * k.size) / 2 : 0);
    if (l && lead && frame >= lead.at) nodes.push(textAt("kl", l, k ? (W - tw(k)) / 2 + 0.01 * W : (W - tw(l)) / 2, kBase - (k ? metrics(faces.serif).cap * k.size : 0) - 0.03 * H));
    if (k && key && frame >= key.at) nodes.push(...decode("kk", k, (W - tw(k)) / 2, kBase, frame, key.at, fps));
  } else if (c.kind === "keyword") {
    const cream = false;
    field = burgundyField(d, uid, frame);
    push = 0.05;
    const it = itemsOf(c, "key")[0];
    if (it) {
      const t = fit({ text: it.text, face: faces.sans, size: sizeFor(faces.sans, 0.057 * H), color: cream ? INK : "#FFFFFF", track: -0.03 }, 0.8 * W);
      const base = 0.49 * H + (metrics(faces.sans).cap * t.size) / 2;
      const g = (frame - it.at) / s24;
      if (g >= 4) {
        const p = clamp01((g - 4) / 6);
        nodes.push(
          textAt("k" + i, t, (W - tw(t)) / 2, base, {
            opacity: 0.36 + 0.64 * p,
            filter: p < 1 ? "blur(" + ((1 - p) * 4 * (W / 1080)).toFixed(2) + "px)" : undefined,
            textShadow: cream ? "none" : "0 0 " + (0.12 * t.size).toFixed(1) + "px rgba(255,225,232,0.45)",
          })
        );
      }
      if (g >= 3 && g < 7 && !cream)
        for (let n = 0; n < 7; n += 1)
          nodes.push(
            <div
              key={"sp" + n}
              style={{
                position: "absolute",
                left: (W - tw(t)) / 2 + rand(n + 3) * tw(t),
                top: base - metrics(faces.sans).xh * t.size * (0.2 + 0.8 * rand(n + 17)),
                width: 5,
                height: 5,
                borderRadius: 3,
                background: "#FFF6F8",
                boxShadow: "0 0 12px 5px rgba(255,220,230,0.8)",
                opacity: 1 - Math.abs(g - 5) / 2,
              }}
            />
          );
    }
  } else if (c.kind === "chapter") {
    // oxblood push wipe in and out (0.38 s)
    const wipe = Math.max(1, Math.round(0.38 * fps));
    const pin = easeOut(f / wipe);
    const pout = f > dur - wipe ? easeOut((f - (dur - wipe)) / wipe) : 0;
    const x = (1 - pin) * W - pout * W;
    wrapper = { transform: "translateX(" + x.toFixed(1) + "px)" };
    field = creamField(d, uid, frame, (f / dur) * W * 0.06);
    const num = { text: c.numeral || "I.", face: faces.serif, size: sizeFor(faces.serif, 0.03 * H), color: NAVY };
    nodes.push(textAt("num", num, (W - tw(num)) / 2, 0.455 * H));
    const title = itemsOf(c, "title");
    const text = title.map((t) => t.text).join(" ");
    const full = fit({ text, face: faces.serif, size: sizeFor(faces.serif, 0.035 * H), color: NAVY, track: -0.01 }, 0.82 * W);
    let cx = (W - tw(full)) / 2;
    title.forEach((t, k) => {
      const part = { ...full, text: (k ? " " : "") + t.text };
      if (frame >= t.at) nodes.push(textAt("t" + k, part, cx, 0.5 * H + (metrics(faces.serif).cap * full.size) / 2));
      cx += tw(part);
    });
    const bar = 0.13 * W;
    nodes.push(<div key="barin" style={{ position: "absolute", left: -bar, top: 0, width: bar, height: H, background: OXBLOOD, opacity: pin < 1 ? 1 : 0 }} />);
    nodes.push(<div key="barout" style={{ position: "absolute", left: W, top: 0, width: bar, height: H, background: OXBLOOD, opacity: pout > 0 ? 1 : 0 }} />);
  } else if (c.kind === "number") {
    field = creamField(d, uid, frame, 0, false);
    push = 0.06;
    fadeWhite = 4;
    const target = c.numeral || itemsOf(c, "key")[0]?.text || "";
    const m = /^([^\d]*)([\d,.]+)(.*)$/.exec(target);
    const at = itemsOf(c, "key")[0]?.at ?? c.a;
    let shown = target;
    if (m) {
      const v = Number(m[2].replace(/,/g, ""));
      const steps = Math.round(12 * s24);
      const p = clamp01((frame - at) / steps);
      const cur = v * easeOut(p);
      const dec = /\./.test(m[2]) ? 1 : 0;
      const body = dec ? cur.toFixed(1) : /,/.test(m[2]) ? Math.round(cur).toLocaleString("en-US") : String(Math.round(cur));
      shown = m[1] + body + m[3];
    }
    if (frame >= at) {
      const t = fit({ text: shown, face: faces.roman, size: sizeFor(faces.roman, 0.11 * H), color: INK }, 0.82 * W);
      const final = fit({ text: target, face: faces.roman, size: sizeFor(faces.roman, 0.11 * H), color: INK }, 0.82 * W);
      nodes.push(textAt("n", { ...t, size: final.size }, (W - tw({ ...t, size: final.size })) / 2, 0.47 * H));
    }
    const label = itemsOf(c, "label");
    label.forEach((l, k) => {
      if (frame < l.at) return;
      const t = fit({ text: l.text, face: faces.sans, size: baseSans * 0.95, color: INK, track: -0.03 }, 0.8 * W);
      nodes.push(textAt("l" + k, t, (W - tw(t)) / 2, 0.56 * H + k * 1.15 * t.size));
    });
  } else if (c.kind === "versus") {
    field = [<div key="bg" style={{ position: "absolute", inset: 0, background: "#FDFDFD" }} />, grain("n" + uid, 5, 0.06, "multiply")];
    fadeWhite = 4;
    const left = itemsOf(c, "item")[0];
    const conn = itemsOf(c, "connector")[0];
    const right = itemsOf(c, "item")[1];
    if (left) {
      const t = fit({ text: left.text, face: faces.sans, size: sizeFor(faces.sans, 0.05 * H), color: INK, track: -0.035 }, 0.74 * W);
      nodes.push(...decode("L", t, (W - tw(t)) / 2, 0.45 * H, frame, left.at, fps));
    }
    if (conn && frame >= conn.at) {
      const t = { text: conn.text, face: faces.serif, size: sizeFor(faces.serif, 0.028 * H), color: INK };
      nodes.push(textAt("C", t, (W - tw(t)) / 2, 0.505 * H));
    }
    if (right) {
      const t = fit({ text: right.text, face: faces.serif, size: sizeFor(faces.serif, 0.05 * H), color: INK }, 0.74 * W);
      nodes.push(...decode("R", t, (W - tw(t)) / 2, 0.575 * H, frame, right.at, fps));
    }
  } else if (c.kind === "list") {
    field = creamField(d, uid, frame, (f / dur) * W * 0.04);
    fadeWhite = 4;
    const title = itemsOf(c, "title")[0];
    if (title && frame >= title.at) {
      const t = fit({ text: title.text, face: faces.serif, size: sizeFor(faces.serif, 0.032 * H), color: NAVY }, 0.8 * W);
      nodes.push(textAt("ti", t, 0.12 * W, 0.3 * H));
    }
    itemsOf(c, "item").forEach((it, k) => {
      if (frame < it.at) return;
      const rise = Math.max(0, 1 - (frame - it.at) / (3 * s24)) * 0.01 * H;
      const n = { text: k + 1 + ".", face: faces.roman, size: sizeFor(faces.roman, 0.03 * H), color: NAVY };
      const t = fit({ text: it.text, face: faces.sans, size: sizeFor(faces.sans, 0.03 * H), color: INK, track: -0.03 }, 0.7 * W);
      const base = 0.39 * H + k * 0.075 * H + rise;
      nodes.push(textAt("in" + k, n, 0.12 * W, base));
      nodes.push(textAt("it" + k, t, 0.2 * W, base));
    });
  } else if (c.kind === "bubbles") {
    field = [<div key="bg" style={{ position: "absolute", inset: 0, background: "#FFFFFF" }} />];
    fadeWhite = 3;
    let y = 0.3 * H;
    const size = sizeFor(faces.sans, 0.022 * H);
    const lineH = size * 1.25;
    const padX = 0.03 * W;
    const padY = 0.012 * H;
    const maxW = 0.68 * W;
    const items = c.items.filter((it) => it.role === "me" || it.role === "them");
    items.forEach((it, k) => {
      // wrap into lines
      const words = it.text.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const next = cur ? cur + " " + w : w;
        if (tw({ text: next, face: faces.sans, size, color: INK }) > maxW - 2 * padX && cur) {
          lines.push(cur);
          cur = w;
        } else cur = next;
      }
      if (cur) lines.push(cur);
      const bw = Math.max(...lines.map((l) => tw({ text: l, face: faces.sans, size, color: INK }))) + 2 * padX;
      const bh = lines.length * lineH + 2 * padY;
      const me = it.role === "me";
      const x = me ? 0.92 * W - bw : 0.08 * W;
      if (frame >= it.at) {
        const p = easeOut((frame - it.at) / (4 * s24));
        nodes.push(
          <div
            key={"b" + k}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: bw,
              height: bh,
              borderRadius: 0.025 * H,
              background: me ? "#0A84FF" : "#E9E9EB",
              transform: "scale(" + (0.85 + 0.15 * p).toFixed(3) + ")",
              transformOrigin: me ? "100% 100%" : "0% 100%",
              opacity: 0.4 + 0.6 * p,
            }}
          >
            {lines.map((l, j) => (
              <div
                key={j}
                style={{
                  position: "absolute",
                  left: padX,
                  top: padY + j * lineH,
                  fontFamily: faces.sans.family,
                  fontWeight: 500,
                  fontSize: size,
                  lineHeight: lineH + "px",
                  whiteSpace: "pre",
                  color: me ? "#FFFFFF" : "#111111",
                }}
              >
                {l}
              </div>
            ))}
          </div>
        );
        if (me && k === items.length - 1 && frame >= it.at + 6 * s24)
          nodes.push(textAt("dl", { text: "Delivered", face: faces.sans, size: size * 0.55, color: "#8E8E93" }, 0.92 * W - tw({ text: "Delivered", face: faces.sans, size: size * 0.55, color: "" }), y + bh + size * 0.75));
      }
      y += bh + 0.012 * H;
    });
  } else if (c.kind === "quote") {
    field = creamField(d, uid, frame, (f / dur) * W * 0.03);
    push = 0.03;
    fadeWhite = 4;
    // one sentence, near-black sans with its key word in serif italic, on one or two balanced lines
    const face = (it: DItem) => (it.role === "key" ? faces.serif : faces.sans);
    const cap = 0.042 * H;
    const toks = c.items.map((it) => ({ it, t: { text: it.text, face: face(it), size: sizeFor(face(it), cap), color: INK, track: it.role === "key" ? 0 : -0.03 } as T }));
    const space = (width100(" ", faces.sans) / 100) * sizeFor(faces.sans, cap) * 0.9;
    const widthOf = (xs: typeof toks) => xs.reduce((a, r) => a + tw(r.t), 0) + space * Math.max(0, xs.length - 1);
    let lines = [toks];
    if (widthOf(toks) > 0.82 * W && toks.length > 2) {
      let best = 1;
      let score = 1e9;
      for (let k = 1; k < toks.length; k += 1) {
        const m = Math.max(widthOf(toks.slice(0, k)), widthOf(toks.slice(k)));
        if (m < score) {
          score = m;
          best = k;
        }
      }
      lines = [toks.slice(0, best), toks.slice(best)];
    }
    const widest = Math.max(...lines.map(widthOf));
    const k = widest > 0.84 * W ? (0.84 * W) / widest : 1;
    const lineH = cap * k * 1.75;
    lines.forEach((line, li) => {
      let x = (W - widthOf(line) * k) / 2;
      const base = 0.5 * H + (li - (lines.length - 1) / 2) * lineH + (cap * k) / 2;
      line.forEach((r, j) => {
        const t = { ...r.t, size: r.t.size * k };
        if (frame >= r.it.at) nodes.push(textAt("q" + li + "-" + j, t, x, base));
        x += tw(t) + space * k;
      });
    });
    // a large faint quote mark behind the sentence
    const mark = { text: "\u201C", face: faces.roman, size: 0.16 * H, color: "#E3DCCB" };
    nodes.unshift(textAt("qm", mark, (W - tw(mark)) / 2, 0.5 * H - lineH * 0.6));
  }

  if (c.kind === "window") {
    // the Look effect draws the field and the speaker inset; this adds the window frame and the typed line
    const aspect = c.aspect || 16 / 9;
    const iw = 0.78 * W * (1 - 0.04 * clamp01(f / dur));
    const ih = iw / aspect;
    const ix = (W - iw) / 2;
    const iy = 0.54 * H - ih / 2;
    const bar = 0.03 * H;
    const frameNodes: React.ReactNode[] = [
      <div key="shadow" style={{ position: "absolute", left: ix, top: iy - bar, width: iw, height: ih + bar, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", borderRadius: 10 }} />,
      <div key="bar" style={{ position: "absolute", left: ix, top: iy - bar, width: iw, height: bar, background: "#E8E9EC", borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottom: "1px solid #D5D7DB" }} />,
      ...["#FF5F57", "#FEBC2E", "#28C840"].map((col, k) => <div key={"dot" + k} style={{ position: "absolute", left: ix + 0.02 * W + k * 0.028 * W, top: iy - bar + bar / 2 - 0.006 * W, width: 0.012 * W, height: 0.012 * W, borderRadius: "50%", background: col }} />),
    ];
    // typed words above the window, near-black, hard word pops, on one or two lines
    const size = sizeFor(faces.sans, 0.032 * H);
    const words = c.items;
    const space = (width100(" ", faces.sans) / 100) * size * 0.9;
    const lines: DItem[][] = [[]];
    let lw = 0;
    for (const it of words) {
      const w = tw({ text: it.text, face: faces.sans, size, color: INK, track: -0.03 });
      if (lw + w > 0.8 * W && lines[lines.length - 1].length) {
        lines.push([]);
        lw = 0;
      }
      lines[lines.length - 1].push(it);
      lw += w + space;
    }
    lines.forEach((line, li) => {
      const widths = line.map((it) => tw({ text: it.text, face: faces.sans, size, color: INK, track: -0.03 }));
      let x = (W - (widths.reduce((a, b) => a + b, 0) + space * (line.length - 1))) / 2;
      const base = iy - bar - 0.035 * H - (lines.length - 1 - li) * size * 1.22;
      line.forEach((it, j) => {
        if (frame >= it.at) nodes.push(textAt("w" + li + "-" + j, { text: it.text, face: faces.sans, size, color: INK, track: -0.03 }, x, base));
        x += widths[j] + space;
      });
    });
    return (
      <div key={"card" + i} style={{ position: "absolute", inset: 0 }}>
        {frameNodes}
        {nodes}
      </div>
    );
  }
  if (c.kind === "search") {
    field = [<div key="bg" style={{ position: "absolute", inset: 0, background: "#FFFFFF" }} />];
    fadeWhite = 3;
    const typed = c.items.map((x) => x.text).join(" ");
    const start = c.items[0]?.at ?? c.a;
    const n = Math.max(0, Math.min(typed.length, Math.floor((frame - start) * 1.6 / s24)));
    const bw = 0.84 * W;
    const bh = 0.062 * H;
    const bx = (W - bw) / 2;
    const by = 0.4 * H;
    const size = sizeFor(faces.sans, 0.022 * H);
    nodes.push(<div key="box" style={{ position: "absolute", left: bx, top: by, width: bw, height: bh, borderRadius: bh / 2, border: "2px solid #DADCE0", boxShadow: "0 2px 10px rgba(32,33,36,0.16)", background: "#FFFFFF" }} />);
    // magnifier
    const r = bh * 0.17;
    nodes.push(<div key="lens" style={{ position: "absolute", left: bx + bh * 0.42, top: by + bh / 2 - r - 2, width: 2 * r, height: 2 * r, borderRadius: "50%", border: "3px solid #9AA0A6" }} />);
    nodes.push(<div key="handle" style={{ position: "absolute", left: bx + bh * 0.42 + 1.6 * r, top: by + bh / 2 + 0.6 * r, width: r * 0.9, height: 3, background: "#9AA0A6", transform: "rotate(45deg)", transformOrigin: "0 50%" }} />);
    const t = { text: typed.slice(0, n), face: faces.sans, size, color: "#202124", track: -0.01 };
    const tx = bx + bh * 1.05;
    nodes.push(textAt("typed", t, tx, by + bh / 2 + (metrics(faces.sans).xh * size) / 2));
    if (Math.floor(frame / (12 * s24)) % 2 === 0 || n < typed.length) nodes.push(<div key="cursor" style={{ position: "absolute", left: tx + tw(t) + 3, top: by + bh * 0.25, width: 2, height: bh * 0.5, background: "#1A73E8" }} />);
    if (n >= typed.length) {
      const p = clamp01((frame - start - typed.length / 1.6 * s24) / (6 * s24));
      for (let k = 0; k < 3; k += 1)
        nodes.push(<div key={"sg" + k} style={{ position: "absolute", left: bx + bh * 1.05, top: by + bh * 1.35 + k * bh * 0.75, width: bw * (0.62 - k * 0.12), height: bh * 0.2, borderRadius: 6, background: "#E8EAED", opacity: p }} />);
    }
  }
  if (c.kind === "document") {
    field = [<div key="bg" style={{ position: "absolute", inset: 0, background: "#E9E8E4" }} />, grain("n" + uid, 4, 0.06, "multiply")];
    fadeWhite = 4;
    const claim = itemsOf(c, "item")[0];
    const label = itemsOf(c, "label")[0];
    const px = 0.08 * W;
    const pw = 0.84 * W;
    const ptop = 0.16 * H;
    const ph = 0.72 * H;
    nodes.push(<div key="page" style={{ position: "absolute", left: px, top: ptop, width: pw, height: ph, background: "#FFFFFF", boxShadow: "0 10px 40px rgba(0,0,0,0.15)" }} />);
    if (label) nodes.push(textAt("lab", { text: label.text.toUpperCase(), face: faces.sans, size: sizeFor(faces.sans, 0.012 * H), color: "#8A8A8A", track: 0.08 }, px + 0.06 * W, ptop + 0.06 * H));
    const bars = (y0: number, count: number, seed: number) => {
      for (let k = 0; k < count; k += 1)
        nodes.push(<div key={"bar" + seed + k} style={{ position: "absolute", left: px + 0.06 * W, top: y0 + k * 0.022 * H, width: pw * (0.72 + 0.16 * rand(seed + k)) - 0.12 * W, height: 0.008 * H, background: "#E3E3E3", borderRadius: 3 }} />);
    };
    bars(ptop + 0.09 * H, 9, 11);
    // the cited line, highlighted as it is spoken
    if (claim) {
      const size = sizeFor(faces.roman, 0.024 * H);
      const words = claim.text.replace(/["“”]/g, "").split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const next = cur ? cur + " " + w : w;
        if (tw({ text: next, face: faces.roman, size, color: INK }) > pw - 0.12 * W && cur) {
          lines.push(cur);
          cur = w;
        } else cur = next;
      }
      if (cur) lines.push(cur);
      const y0 = ptop + 0.33 * H;
      const lineH = size * 1.5;
      const wipe = clamp01((frame - claim.at) / Math.max(1, 0.45 * fps));
      lines.forEach((l, k) => {
        const t = { text: l, face: faces.roman, size, color: INK };
        const w = tw(t);
        const hl = clamp01(wipe * lines.length - k);
        nodes.push(<div key={"hl" + k} style={{ position: "absolute", left: px + 0.055 * W, top: y0 + k * lineH - size * 0.78, width: w * hl + 0.01 * W, height: size * 1.05, background: "#F7E26B", opacity: hl > 0 ? 0.9 : 0 }} />);
        nodes.push(textAt("cl" + k, t, px + 0.06 * W, y0 + k * lineH));
      });
      bars(y0 + lines.length * lineH + 0.02 * H, 8, 31);
      push = 0.12;
    }
  }

  const zoom = 1 + push * clamp01(f / dur);
  const white = fadeWhite ? 1 - clamp01(f / (fadeWhite * s24)) : 0;
  return (
    <div key={"card" + i} style={{ position: "absolute", inset: 0, overflow: "hidden", ...wrapper }}>
      {field}
      <div style={{ position: "absolute", inset: 0, transform: "scale(" + zoom.toFixed(4) + ")", transformOrigin: "50% 49%" }}>{nodes}</div>
      {white > 0 ? <div style={{ position: "absolute", inset: 0, background: "#FFFFFF", opacity: white }} /> : null}
    </div>
  );
}
