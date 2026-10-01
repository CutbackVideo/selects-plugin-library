import React, { useEffect, useState } from "react";
import { useCurrentFrame, delayRender, continueRender } from "remotion";
import { clearTextCache, metrics, type FontSpec } from "./text";
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

function useFonts(fonts: GraphicData["fonts"]): boolean {
  const list: [string, string, string, string][] = [
    [SANS, fonts?.sans || "", "500", "normal"],
    [SERIF, fonts?.serif || "", "400", "italic"],
    [ROMAN, fonts?.roman || "", "400", "normal"],
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
      {d.nameTag && frame >= d.nameTag.a && frame < d.nameTag.b ? drawNameTag(placeTag(d, faces), frame, d, faces) : null}
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
  let bottom = 0;
  (d.units || []).forEach((u, k) => {
    if (u.b <= tag.a || u.a >= tag.b) return;
    bottom = Math.max(bottom, layoutUnit(u, k, d, faces, 1).bottom);
  });
  const y = Math.min(0.82, Math.max(tag.y, bottom / d.H + 0.03));
  return (tagCache[key] = { ...tag, y });
}
