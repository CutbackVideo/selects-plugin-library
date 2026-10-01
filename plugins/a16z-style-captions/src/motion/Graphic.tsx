import React, { useEffect, useState } from "react";
import { useCurrentFrame, delayRender, continueRender } from "remotion";
import { clearTextCache, metrics, width100, type FontSpec } from "./text";
import { drawUnit, layoutUnit, clearLayoutCache, type Faces } from "./captions";
import { drawNameTag } from "./nametag";
import { drawCard } from "./cards";
import type { GraphicData, NameTag } from "./data";

// The a16z-style graphic: one motion graphic over the whole Draft (frame = Draft frame) carrying the
// captions, the name tag, keyword cards and the optional brand mark.

type Props = { data?: GraphicData };

const SANS = "Editorial Sans";
const tagCache: Record<string, NameTag> = {};
const SERIF = "Editorial Serif";
const ROMAN = "Editorial Roman";
const LIGHT = "Editorial Light";

function useFonts(fonts: GraphicData["fonts"]): boolean {
  const list: [string, string, string, string][] = [
    [SANS, fonts?.sans || "", "500", "normal"],
    [SERIF, fonts?.serif || "", "400", "italic"],
    [ROMAN, fonts?.roman || "", "400", "normal"],
    [LIGHT, fonts?.light || "", "400", "italic"],
  ];
  const any = list.some((f) => f[1]);
  const [ready, setReady] = useState(!any);
  const [handle] = useState(() => (any ? delayRender("caption fonts") : null));
  useEffect(() => {
    if (ready) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTextCache();
      clearLayoutCache();
      for (const k of Object.keys(tagCache)) delete tagCache[k];
      setReady(true);
    };
    const load = ([family, b64, weight, style]: [string, string, string, string]) => {
      if (!b64) return Promise.resolve();
      try {
        const face = new (window as any).FontFace(family, "url(data:font/woff2;base64," + b64 + ")", { weight, style });
        return face.load().then((f: any) => (document as any).fonts.add(f)).catch(() => {});
      } catch {
        return Promise.resolve();
      }
    };
    Promise.all(list.map(load)).then(finish, finish);
    const timer = setTimeout(finish, 4000);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    if (ready && handle != null) continueRender(handle);
  }, [ready, handle]);
  return ready;
}

export default function Graphic({ data }: Props) {
  const frame = useCurrentFrame();
  const d: GraphicData = data || ({ W: 1080, H: 1920, fps: 24, uid: "g", xh: 0.029, units: [] } as any);
  const ready = useFonts(d.fonts);
  const faces: Faces = {
    sans: { family: (d.fonts?.sans ? '"' + SANS + '", ' : "") + '"Inter Display", "Helvetica Neue", Helvetica, Arial, sans-serif', weight: 500, style: "normal", estimate: 0.52 },
    serif: { family: (d.fonts?.serif ? '"' + SERIF + '", ' : "") + '"Playfair Display", Didot, "Times New Roman", serif', weight: 400, style: "italic", estimate: 0.45 },
    roman: { family: (d.fonts?.roman ? '"' + ROMAN + '", ' : "") + '"Playfair Display", Didot, "Times New Roman", serif', weight: 400, style: "normal", estimate: 0.5 },
    light: { family: (d.fonts?.light ? '"' + LIGHT + '", ' : d.fonts?.serif ? '"' + SERIF + '", ' : "") + '"Playfair Display", Didot, "Times New Roman", serif', weight: 400, style: "italic", estimate: 0.45 },
  };
  if (!ready) return null;
  const units = d.units || [];
  // an overflow shrink carries over the rest of its sentence
  const shrinkOf = (k: number) => 1;
  const live = units.map((u, k) => ({ u, k })).filter(({ u }) => frame >= u.a && frame < u.b);
  const quote = (d.quoteBlocks || []).find((q) => frame >= q[0] && frame < q[1]);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {(d.cards || []).filter((c) => frame >= c.a && frame < c.b).map((c, i) => drawCard(c, i, frame, d, faces))}
      {d.nameTag && frame >= d.nameTag.a && frame < placeTag(d, faces).b ? drawNameTag(placeTag(d, faces), frame, d, faces) : null}
      {d.title && frame >= d.title.a && frame < d.title.b ? titlePlate(d.title, frame, d, faces) : null}
      {quote && live.length ? quoteGlyph(layoutUnit(live[0].u, live[0].k, d, faces, shrinkOf(live[0].k)).top, d, faces) : null}
      {live.map(({ u, k }) => (
        <React.Fragment key={k}>{drawUnit(u, k, frame, d, faces, shrinkOf(k))}</React.Fragment>
      ))}
      {d.mark ? (
        <img
          src={d.mark.src}
          style={{
            position: "absolute",
            left: 0.724 * d.W,
            top: 0.043 * d.H,
            width: 0.199 * d.W,
            height: 0.052 * d.H,
            objectFit: "contain",
            objectPosition: "right center",
            opacity: d.mark.opacity,
          }}
        />
      ) : null}
    </div>
  );
}

// The quote mark over a block of quoted speech: a curly serif mark about 0.023 H tall, centred, its
// bottom just above the top of the caption on screen.
function quoteGlyph(capTop: number, d: GraphicData, faces: Faces): React.ReactNode {
  const H = d.H;
  const m = metrics(faces.roman);
  const size = 0.023 * H / 0.27; // the mark is about 0.27 em tall
  const base = capTop - 0.006 * H + 0.44 * size; // the mark's bottom sits about 0.44 em above its baseline
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: d.W,
        top: base - (size * (1 + m.ascent - m.descent)) / 2,
        textAlign: "center",
        fontFamily: faces.roman.family,
        fontWeight: 400,
        fontSize: size,
        lineHeight: 1,
        color: "#FFFFFF",
        textShadow: "0 1px " + (0.3 * d.xh * H).toFixed(1) + "px rgba(0,0,0,0.30)",
      }}
    >
      {"\u201C"}
    </div>
  );
}

// The name tag sits under every caption shown while it is up, so a lockup never runs into it.
function placeTag(d: GraphicData, faces: Faces): NameTag {
  const tag = d.nameTag as NameTag;
  const key = d.uid;
  if (tagCache[key]) return tagCache[key];
  // below the captions it shares the screen with; a later caption that would run into it ends it
  // (after at least 1.3 s)
  let bottom = 0;
  let b = tag.b;
  const tagH = 0.1 * d.H;
  const units = (d.units || []).map((u, k) => ({ u, k })).filter(({ u }) => u.b > tag.a && u.a < tag.b);
  for (const { u, k } of units) {
    const lay = layoutUnit(u, k, d, faces, 1);
    const y = Math.min(0.82 * d.H, Math.max(tag.y * d.H, bottom + 0.03 * d.H));
    if (u.a > tag.a + 1.3 * d.fps && lay.bottom + 0.02 * d.H > y && lay.top < y + tagH) {
      b = u.a;
      break;
    }
    bottom = Math.max(bottom, lay.bottom);
  }
  const y = Math.min(0.82, Math.max(tag.y, bottom / d.H + 0.03));
  return (tagCache[key] = { ...tag, y, b });
}

// The hook title: the spoken opening line in a light serif italic on a white plate, each word typed
// in on its spoken onset, the plate running a little ahead of the letters.
function titlePlate(t: { a: number; b: number; words: { text: string; at: number; line: number }[] }, frame: number, d: GraphicData, faces: Faces): React.ReactNode {
  const H = d.H;
  const W = d.W;
  const face = faces.light;
  const m = metrics(face);
  const size = (0.034 * H) / m.cap;
  const padX = 0.018 * W;
  const lineH = size * 1.32;
  const x0 = 0.08 * W;
  const space = (width100(" ", face) / 100) * size;
  const lines = Math.max(...t.words.map((w) => w.line)) + 1;
  const out: React.ReactNode[] = [];
  for (let li = 0; li < lines; li += 1) {
    const ws = t.words.filter((w) => w.line === li);
    // letters of a word arrive over two frames per character, starting at its onset
    let text = "";
    let typing = false;
    for (const w of ws) {
      if (frame < w.at) break;
      const n = Math.min(w.text.length, 1 + Math.floor(((frame - w.at) * 2) / Math.max(1, d.fps / 24)));
      text += (text ? " " : "") + w.text.slice(0, n);
      if (n < w.text.length) typing = true;
    }
    if (!text) continue;
    const full = ws.every((w) => frame >= w.at) && !typing;
    const w = (width100(text, face) / 100) * size;
    const ahead = full ? 0 : space * 2;
    out.push(
      <div key={"tp" + li} style={{ position: "absolute", left: x0, top: 0.6 * H + li * lineH, width: w + 2 * padX + ahead, height: lineH, background: "#FFFFFF" }}>
        <div style={{ position: "absolute", left: padX, top: lineH / 2 + (m.cap * size) / 2 - (size * (1 + m.ascent - m.descent)) / 2, fontFamily: face.family, fontStyle: face.style, fontWeight: face.weight, fontSize: size, lineHeight: 1, whiteSpace: "pre", color: "#111111" }}>
          {text}
        </div>
      </div>
    );
  }
  return <React.Fragment key="title">{out}</React.Fragment>;
}
