import React, { useEffect, useState } from "react";
import { useCurrentFrame, delayRender, continueRender } from "remotion";
import { camAt, pinCss, scalarAt, type CamKey, type ScalarKey } from "./camera";
import { GridSet, zoomVelocity } from "./grid";
import { width100, capMetrics, clearTextCache } from "./text";

// The Reel graphic: one motion graphic over the whole reel, frame = draft frame.
//   - the set: the dark grid behind the speaker, masked by per-frame speaker mattes (white = background),
//   - titles: opener (behind the head), stack A, stack B (+ arrow), punch, final block,
//   - one-word yellow captions,
//   - the light-leak flash that hides the cut into B-roll.
// Every number is measured from the reference reel (fractions of the 1080 x 1920 frame).

type Word = { t: string; at: number };
type Line = { role: "lead" | "key"; words: Word[] };
type Title = {
  kind: "opener" | "stackA" | "stackB" | "punch" | "final";
  start: number;
  end: number;
  anchor?: number | null;
  behind?: boolean;
  lines: Line[];
  blowAt?: number;
  arrowAt?: number;
  y?: number;
};
type Props = { data?: Record<string, any> };

const n = (v: any, f: number) => (typeof v === "number" && Number.isFinite(v) ? v : f);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
const easeIn = (p: number) => Math.pow(clamp01(p), 3);
const easeIO = (p: number) => {
  const q = clamp01(p);
  return q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
};
const inRanges = (rs: number[][] | undefined, f: number) => (rs || []).some((r) => f >= r[0] && f < r[1]);

const YELLOW_CAPTION = "#F7C952";
const YELLOW_KEY = "#FBD036";
const WHITE = "#F9FAF9";

export default function Reel({ data = {} }: Props) {
  const frame = useCurrentFrame();
  const W = n(data.W, 1080);
  const H = n(data.H, 1920);
  const fps = n(data.fps, 30);
  const F = (x: number) => Math.max(1, Math.round((x * fps) / 30));
  const uid = String(data.uid || "r").replace(/[^a-zA-Z0-9_-]/g, "");

  // ---- fonts ----------------------------------------------------------------------------------------
  // The faces travel inside the graphic as data URLs (all OFL): Six Caps for the key words, a condensed
  // bold (Roboto Flex pinned to a narrow width, the closest match to the reference's captions) for the
  // word captions, and a wide geometric bold for the white lead lines. Rendering waits until they have
  // loaded, then measures again: widths measured with a fallback face would be cached.
  const fontData: [string, string, string][] = [
    ["Reel Hero", typeof data.heroFontData === "string" ? data.heroFontData : "", "400"],
    ["Reel Caption", typeof data.captionFontData === "string" ? data.captionFontData : "", "700"],
    ["Reel Lead", typeof data.leadFontData === "string" ? data.leadFontData : "", "800"],
  ];
  const has = (family: string) => fontData.some(([f, b64]) => f === family && !!b64);
  const [ready, setReady] = useState(!fontData.some(([, b64]) => b64));
  const [handle] = useState(() => (fontData.some(([, b64]) => b64) ? delayRender("reel fonts") : null));
  useEffect(() => {
    if (ready) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTextCache();
      setReady(true);
    };
    const load = ([family, b64, weight]: [string, string, string]) => {
      if (!b64) return Promise.resolve();
      try {
        const face = new (window as any).FontFace(family, "url(data:font/woff2;base64," + b64 + ")", { weight });
        return face.load().then((f: any) => (document as any).fonts.add(f)).catch(() => {});
      } catch {
        return Promise.resolve();
      }
    };
    Promise.all(fontData.map(load)).then(finish, finish);
    const timer = setTimeout(finish, 4000);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    if (ready && handle != null) continueRender(handle);
  }, [ready, handle]);

  const KEY_FAMILY = (has("Reel Hero") ? '"Reel Hero", ' : "") + '"Six Caps", "League Gothic", "Bebas Neue", "Impact", sans-serif';
  const KEY_WEIGHT = has("Reel Hero") ? 400 : 700;
  // White lead lines: a wide geometric bold, measured letter by letter against the reference (Reddit Sans
  // at weight 840, registered as 800; tight tracking, unkerned).
  const lead = {
    family: (has("Reel Lead") ? '"Reel Lead", ' : "") + '"Avenir Next", "Montserrat", "Helvetica Neue", Arial, sans-serif',
    weight: 800,
    track: has("Reel Lead") ? -0.032 : 0.02,
    est: 0.68,
    capEst: 0.7,
    kern: false,
  };
  const key = { family: KEY_FAMILY, weight: KEY_WEIGHT, track: 0.015, est: 0.24, capEst: 0.9, kern: true };
  // Captions: measured letter by letter against the reference (Helvetica Neue Condensed Bold, unkerned).
  const capFace = {
    family: (has("Reel Caption") ? '"Reel Caption", ' : "") + '"Roboto Condensed", "Helvetica Neue", "Arial Narrow", sans-serif',
    weight: 700,
    track: -0.008,
    est: 0.5,
    capEst: 0.71,
    kern: false,
  };
  type Face = typeof lead;
  // Font size that gives a cap height of `cap` px, and the size that fits `text` into `width` px.
  const sizeForCap = (face: Face, cap: number) => cap / capMetrics(face.family, face.weight, face.capEst).cap;
  const sizeForWidth = (face: Face, text: string, width: number) => (width / width100(text, face.family, face.weight, face.track, face.est, face.kern)) * 100;
  const capOf = (face: Face, size: number) => size * capMetrics(face.family, face.weight, face.capEst).cap;
  const textW = (face: Face, text: string, size: number) => (width100(text, face.family, face.weight, face.track, face.est, face.kern) * size) / 100;

  // ---- camera ---------------------------------------------------------------------------------------
  const camera: CamKey[] = Array.isArray(data.camera) ? data.camera : [];
  const cam = camAt(camera, frame);

  // ---- a positioned line of words -------------------------------------------------------------------
  // capTop: y of the cap top; x: left edge. Each word enters on its own frame (appear()).
  type Appear = (w: Word, i: number, size: number) => React.CSSProperties | null;
  const renderLine = (
    k: string,
    face: Face,
    words: Word[],
    size: number,
    x: number,
    capTop: number,
    color: string,
    appear: Appear,
    extra: React.CSSProperties = {}
  ) => {
    const m = capMetrics(face.family, face.weight, face.capEst);
    const glow =
      face === key
        ? "0 0 " + (0.06 * size).toFixed(1) + "px rgba(251,208,54,0.55), 0 0 " + (0.16 * size).toFixed(1) + "px rgba(160,110,20,0.45)"
        : // White lead lines: the reference's soft near-white halo; the drop shadow keeps them readable on pale shots.
          "0 0 " + (0.55 * size).toFixed(1) + "px rgba(255,255,255,0.6), 0 " + (0.03 * size).toFixed(1) + "px " + (0.08 * size).toFixed(1) + "px rgba(0,0,0,0.55)";
    return (
      <div
        key={k}
        style={{
          position: "absolute",
          left: x,
          top: capTop - m.top * size,
          fontFamily: face.family,
          fontWeight: face.weight,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: face.track + "em",
          fontKerning: face.kern ? "normal" : "none",
          whiteSpace: "nowrap",
          color,
          textTransform: "uppercase",
          textShadow: glow,
          // Six Caps is lighter than the reference's display face; a same-colour stroke adds the weight.
          ...(face === key ? { WebkitTextStroke: (0.022 * size).toFixed(1) + "px " + color } : {}),
          ...extra,
        }}
      >
        {words.map((w, i) => {
          const st = appear(w, i, size);
          return (
            <React.Fragment key={i}>
              {i > 0 ? " " : ""}
              <span style={{ display: "inline-block", ...(st || { visibility: "hidden" }) }}>{w.t}</span>
            </React.Fragment>
          );
        })}
      </div>
    );
  };
  const lineText = (ws: Word[]) => ws.map((w) => w.t).join(" ");
  // Word entrances.
  const pop: Appear = (w) => (frame >= w.at ? { opacity: 1 } : null);
  const fadeRise = (dist: number, dur: number): Appear => (w, _i, size) => {
    const t = frame - w.at;
    if (t < 0) return null;
    const p = easeOut(t / dur);
    return { opacity: clamp01(t / Math.max(1, dur * 0.6)), transform: "translateY(" + ((1 - p) * dist * size).toFixed(1) + "px)" };
  };
  const riseBlur = (distPx: number, dur: number): Appear => (w) => {
    const t = frame - w.at;
    if (t < 0) return null;
    const p = easeOut(t / dur);
    const v = t < dur ? 3 * Math.pow(1 - t / dur, 2) : 0;
    const blur = v * distPx * 0.02;
    return {
      opacity: clamp01(t / Math.max(1, dur * 0.4)),
      transform: "translateY(" + ((1 - p) * distPx).toFixed(1) + "px)",
      filter: blur > 0.4 ? "url(#vb" + uid + "_" + Math.min(8, Math.round(blur / 3)) + ")" : undefined,
    };
  };

  // ---- titles ---------------------------------------------------------------------------------------
  const titles: Title[] = Array.isArray(data.titles) ? data.titles : [];
  const pinned = (t: Title, node: React.ReactNode) => {
    if (t.anchor == null) return node;
    const a = camAt(camera, t.anchor);
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "50% 50%", transform: pinCss(a, cam, W, H) }}>{node}</div>
    );
  };
  const leadsOf = (t: Title) => t.lines.filter((l) => l.role === "lead");
  const keyOf = (t: Title) => t.lines.find((l) => l.role === "key") || { role: "key" as const, words: [] };

  const renderTitle = (t: Title, idx: number): React.ReactNode => {
    if (frame < t.start - 1 || frame >= t.end) return null;
    const K = keyOf(t);
    const leads = leadsOf(t);
    const kText = lineText(K.words);
    const nodes: React.ReactNode[] = [];
    let wrapStyle: React.CSSProperties = {};
    if (t.kind === "opener") {
      // "WHY DO WE" small and white at the very top, the key word huge and yellow under it, full width.
      const L = leads[0] ? leads[0].words : [];
      const lSize = Math.min(sizeForCap(lead, 0.03 * H), sizeForWidth(lead, lineText(L), 0.8 * W));
      const kSize = Math.min(sizeForCap(key, 0.16 * H), sizeForWidth(key, kText, 0.88 * W));
      const lTop = 0.03 * H;
      const kTop = 0.092 * H;
      nodes.push(renderLine("l", lead, L, lSize, (W - textW(lead, lineText(L), lSize)) / 2, lTop, WHITE, fadeRise(-0.4, F(4))));
      nodes.push(
        renderLine("k", key, K.words, kSize, (W - textW(key, kText, kSize)) / 2, kTop, YELLOW_KEY, (w) => {
          const tt = frame - w.at;
          if (tt < 0) return null;
          // Revealed top-down, like the reference's drop-in.
          const p = easeOut(tt / F(7));
          return { clipPath: "inset(0 0 " + ((1 - p) * 100).toFixed(1) + "% 0)", transform: "translateY(" + (-(1 - p) * 0.12 * kSize).toFixed(1) + "px)" };
        })
      );
      const fade = clamp01((t.end - frame) / F(6));
      wrapStyle = { opacity: fade };
    } else if (t.kind === "stackA") {
      // Under the speaker's chin, a little right of centre: a small white lead line, then two big yellow
      // words side by side on one baseline, each rising in with motion blur as it is spoken (the second one
      // is often still rising when the whip starts, so it can look lower for a moment). Just before the
      // whip a hand-drawn arrow grows from the first key word up and to the left, where stack B is about to
      // appear; the whip then carries A to the right edge, so the arrow ends up pointing from A to B.
      const L = leads[0] ? leads[0].words : [];
      const x0 = 0.22 * W;
      const bw = 0.7 * W;
      const lSize = Math.min(sizeForCap(lead, 0.028 * H), sizeForWidth(lead, lineText(L), bw));
      const k1 = K.words.slice(0, 1);
      const k2 = K.words.slice(1);
      const gap = 0.03 * W;
      const both = lineText(k1) + (k2.length ? " " + lineText(k2) : "");
      const kSize = Math.min(sizeForCap(key, 0.125 * H), sizeForWidth(key, both, bw - gap));
      const kCap = capOf(key, kSize);
      const lTop = (typeof t.y === "number" ? t.y : 0.5) * H;
      const kTop = lTop + capOf(lead, lSize) + 0.018 * H;
      nodes.push(renderLine("l", lead, L, lSize, x0, lTop, WHITE, fadeRise(0.35, F(8))));
      nodes.push(renderLine("k1", key, k1, kSize, x0, kTop, YELLOW_KEY, riseBlur(0.135 * H, F(13))));
      if (k2.length) {
        const w1 = textW(key, lineText(k1), kSize);
        nodes.push(renderLine("k2", key, k2, kSize, x0 + w1 + gap, kTop, YELLOW_KEY, riseBlur(0.135 * H, F(13))));
      }
      if (t.arrowAt != null) nodes.push(arrow(t.arrowAt, x0 - 0.015 * W, kTop + 0.45 * kCap, x0 - 0.19 * W, lTop - 0.035 * H));
      wrapStyle = { opacity: clamp01((t.end - frame) / F(3)) };
    } else if (t.kind === "stackB" || t.kind === "final") {
      // Width-justified block: every line is set to the same width, so the sizes step up line by line
      // (small lead, medium second line, huge key word).
      const isB = t.kind === "stackB";
      const maxW = isB ? 0.64 * W : 0.87 * W;
      const minW = isB ? 0.42 * W : 0.62 * W;
      const caps = isB ? [0.034, 0.053] : [0.034, 0.059];
      const kCapRef = (isB ? 0.151 : 0.1875) * H;
      // The block is as wide as its widest line at the reference sizes (within limits), so a long lead
      // line keeps a readable size; every line is then fitted to that width within its size range.
      const leadNominal = leads.map((l, i) => textW(lead, lineText(l.words), sizeForCap(lead, caps[Math.min(i, caps.length - 1)] * H)));
      const bw = Math.min(maxW, Math.max(minW, textW(key, kText, sizeForCap(key, kCapRef)), ...leadNominal));
      const kSize = Math.min(sizeForCap(key, kCapRef * 1.1), sizeForWidth(key, kText, bw));
      const kW = textW(key, kText, kSize);
      const kCap = capOf(key, kSize);
      const x0 = isB ? 0.05 * W : (W - bw) / 2;
      // Lead lines stay clearly below the key word: within 0.8-1.15x their reference cap and never more
      // than 0.3x the key's cap, so a short lead is not blown up to the block width.
      const lines = leads.map((l, i) => {
        const c = caps[Math.min(i, caps.length - 1)] * H;
        const fitW = sizeForWidth(lead, lineText(l.words), bw);
        const hi = sizeForCap(lead, Math.max(0.8 * c, Math.min(1.15 * c, 0.3 * kCap)));
        const s = Math.min(fitW, Math.max(sizeForCap(lead, 0.8 * c), Math.min(hi, fitW)));
        return { l, s, cap: capOf(lead, s), w: textW(lead, lineText(l.words), s) };
      });
      const gapY = 0.007 * H;
      let y: number;
      if (isB) y = 0.21 * H;
      else {
        const kTopFinal = 0.628 * H;
        y = kTopFinal - lines.reduce((a, r) => a + r.cap + gapY, 0);
      }
      lines.forEach((r, i) => {
        const x = isB ? x0 : x0 + (bw - r.w) / 2;
        nodes.push(renderLine("l" + i, lead, r.l.words, r.s, x, y, WHITE, isB ? fadeRise(0.3, F(5)) : fadeRise(0.2, F(6))));
        y += r.cap + gapY;
      });
      const kx = isB ? x0 : x0 + (bw - kW) / 2;
      if (isB) nodes.push(renderLine("k", key, K.words, kSize, kx, y, YELLOW_KEY, riseBlur(0.12 * H, F(10))));
      else
        nodes.push(
          renderLine("k", key, K.words, kSize, kx, y, YELLOW_KEY, (w) => {
            // The final key word slides in from the right (centre 0.79 W -> 0.50 W in 5 frames).
            const tt = frame - w.at;
            if (tt < 0) return null;
            const p = easeOut(tt / F(5));
            const v = tt < F(5) ? 3 * Math.pow(1 - tt / F(5), 2) : 0;
            return { transform: "translateX(" + ((1 - p) * 0.29 * W).toFixed(1) + "px)", filter: v > 0.2 ? "url(#hb" + uid + "_" + Math.min(8, Math.round(v * 3)) + ")" : undefined };
          })
        );
      if (!isB && t.blowAt != null) {
        // Blow-out: 1.39x over the last half second, then a hard cut.
        const p = easeIn((frame - t.blowAt) / Math.max(1, t.end - t.blowAt));
        const s = 1 + 0.39 * p;
        wrapStyle = { transform: "scale(" + s.toFixed(4) + ")", transformOrigin: "50% " + ((0.7 * H) / H) * 100 + "%" };
      }
    } else if (t.kind === "punch") {
      // Centre: white lead line over a huge yellow key line. Dead still for about a second, then it
      // blows out 1.3x and drops to the bottom of the frame, half cut off, and holds there. A key too long
      // to stay big on one line is set on two.
      const L = leads[0] ? leads[0].words : [];
      const one = Math.min(sizeForCap(key, 0.238 * H), sizeForWidth(key, kText, 0.92 * W));
      const rows: Word[][] = K.words.length >= 2 && capOf(key, one) < 0.14 * H ? [K.words.slice(0, Math.ceil(K.words.length / 2)), K.words.slice(Math.ceil(K.words.length / 2))] : [K.words];
      const kSize = Math.min(...rows.map((r) => Math.min(sizeForCap(key, (rows.length > 1 ? 0.19 : 0.238) * H), sizeForWidth(key, lineText(r), 0.92 * W))));
      const kCap = capOf(key, kSize);
      const kW = Math.max(...rows.map((r) => textW(key, lineText(r), kSize)));
      const lSize = Math.min(sizeForCap(lead, 0.045 * H), sizeForWidth(lead, lineText(L), Math.min(0.55 * W, 0.75 * kW)));
      const kTop = (rows.length > 1 ? 0.5 : 0.574) * H;
      const lTop = kTop - 0.02 * H - capOf(lead, lSize);
      nodes.push(renderLine("l", lead, L, lSize, (W - textW(lead, lineText(L), lSize)) / 2, lTop, WHITE, pop));
      const keyPop: Appear = (w) => {
        const tt = frame - w.at;
        if (tt < 0) return null;
        const s2 = 1.08 - 0.08 * easeOut(tt / F(3));
        return { transform: "scale(" + s2.toFixed(4) + ")" };
      };
      rows.forEach((r, ri) => nodes.push(renderLine("k" + ri, key, r, kSize, (W - textW(key, lineText(r), kSize)) / 2, kTop + ri * (kCap + 0.018 * H), YELLOW_KEY, keyPop)));
      if (t.blowAt != null && frame >= t.blowAt) {
        const p = easeIO((frame - t.blowAt) / F(9));
        // Grow at most until the key line touches the frame's sides.
        const s = 1 + Math.max(0, Math.min(0.3, (0.98 * W) / Math.max(1, kW) - 1)) * p;
        const dy = p * (0.78 * H - kTop);
        wrapStyle = { transform: "translateY(" + dy.toFixed(1) + "px) scale(" + s.toFixed(4) + ")", transformOrigin: "50% " + ((kTop / H) * 100).toFixed(2) + "%" };
      }
    }
    const node = (
      <div key={"t" + idx} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, ...wrapStyle }}>
        {nodes}
      </div>
    );
    return pinned(t, node);
  };

  // Hand-drawn arrow: a yellow curve with a glow, drawn over 8 frames, pointing at the stack B key word
  // from the right (where stack A was thrown off).
  function arrow(at: number, tailX: number, tailY: number, tipX: number, tipY: number): React.ReactNode {
    // A hand-drawn yellow arrow with a soft glow, drawn from its tail over 5 frames, head last.
    const t = frame - at;
    if (t < 0) return null;
    const p = easeOut(t / F(5));
    const dx = tipX - tailX;
    const dy = tipY - tailY;
    // A gentle bow below the straight line, like a quick marker stroke.
    const c1x = tailX + 0.3 * dx - 0.02 * W;
    const c1y = tailY + 0.3 * dy + 0.035 * H;
    const c2x = tailX + 0.75 * dx + 0.01 * W;
    const c2y = tailY + 0.75 * dy + 0.03 * H;
    const d = "M " + tailX.toFixed(1) + " " + tailY.toFixed(1) + " C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + ", " + c2x.toFixed(1) + " " + c2y.toFixed(1) + ", " + tipX.toFixed(1) + " " + tipY.toFixed(1);
    const len = 1.35 * Math.hypot(dx, dy) + 0.05 * W;
    const head = 0.024 * H;
    const sw = Math.max(3, 0.0068 * W);
    const ang = Math.atan2(tipY - c2y, tipX - c2x);
    const a1 = ang + Math.PI - 0.5;
    const a2 = ang + Math.PI + 0.5;
    return (
      <svg key="arrow" width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: "drop-shadow(0 0 " + (0.008 * W).toFixed(1) + "px rgba(251,208,54,0.75))" }}>
        <path d={d} fill="none" stroke={YELLOW_KEY} strokeWidth={sw} strokeLinecap="round" strokeDasharray={len.toFixed(1)} strokeDashoffset={((1 - p) * len).toFixed(1)} />
        {p > 0.8 ? (
          <path
            d={"M " + (tipX + head * Math.cos(a1)).toFixed(1) + " " + (tipY + head * Math.sin(a1)).toFixed(1) + " L " + tipX.toFixed(1) + " " + tipY.toFixed(1) + " L " + (tipX + head * Math.cos(a2)).toFixed(1) + " " + (tipY + head * Math.sin(a2)).toFixed(1)}
            fill="none"
            stroke={YELLOW_KEY}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={clamp01((p - 0.8) / 0.2)}
          />
        ) : null}
      </svg>
    );
  }

  // ---- the set (masked) -----------------------------------------------------------------------------
  const masks = data.masks && typeof data.masks.base === "string" && n(data.masks.count, 0) > 0 ? data.masks : null;
  const setOpacity = scalarAt(data.setOpacity as ScalarKey[], frame, 0);
  const gridZoom = scalarAt(data.gridZoom as ScalarKey[], frame, 1);
  const behind = titles.filter((t) => t.behind && frame >= t.start - 1 && frame < t.end);
  const front = titles.filter((t) => !t.behind);
  let maskLayer: React.ReactNode = null;
  if (masks && (setOpacity > 0.002 || behind.length)) {
    const idx = Math.min(masks.count, Math.max(1, frame + 1));
    const url = 'url("' + masks.base + "/matte_" + String(idx).padStart(6, "0") + '.png")';
    maskLayer = (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          maskImage: url,
          WebkitMaskImage: url,
          maskMode: "luminance",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "0 0",
        } as React.CSSProperties}
      >
        {setOpacity > 0.002 ? (
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, opacity: setOpacity }}>
            <GridSet
              W={W}
              H={H}
              zoom={gridZoom}
              uid={uid}
              frame={frame}
              fps={fps}
              zoomVel={zoomVelocity(data.gridZoom as ScalarKey[], frame)}
              texture={scalarAt(data.gridTexture as ScalarKey[], frame, 1)}
            />
          </div>
        ) : null}
        {behind.map((t, i) => renderTitle(t, 100 + i))}
      </div>
    );
  } else if (!masks && behind.length) {
    // No mattes: the behind-head title simply sits in front.
    maskLayer = <>{behind.map((t, i) => renderTitle(t, 100 + i))}</>;
  }

  // ---- captions -------------------------------------------------------------------------------------
  // One word at a time, yellow with a warm glow, box top at 55% of the height (66% on the opening set).
  // A word shows from its start until the next word starts (gaps under 0.3 s are bridged), and captions
  // step aside while a title is showing the spoken words.
  const words: [string, number, number][] = Array.isArray(data.words) ? data.words : [];
  let caption: React.ReactNode = null;
  if (!inRanges(data.capHide, frame)) {
    let cur: [string, number, number] | null = null;
    for (let i = 0; i < words.length; i += 1) {
      const w = words[i];
      const next = words[i + 1];
      const until = next && next[1] - w[2] < Math.round(0.3 * fps) ? next[1] : w[2] + F(2);
      if (frame >= w[1] && frame < until) cur = w;
      if (w[1] > frame) break;
    }
    if (cur) {
      const text = String(cur[0]).toUpperCase().replace(/[.,!?;:"“”]+$/g, "").replace(/^["“”]+/, "");
      const size0 = sizeForCap(capFace, 0.0375 * H);
      const size = Math.min(size0, sizeForWidth(capFace, text, 0.9 * W));
      let top = 0.552 * H;
      for (const r of (data.capY as number[][]) || []) if (frame >= r[0] && frame < r[1]) top = (r[2] + 0.003) * H;
      const m = capMetrics(capFace.family, capFace.weight, capFace.capEst);
      caption = (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: W,
            top: top - m.top * size,
            textAlign: "center",
            fontFamily: capFace.family,
            fontWeight: capFace.weight,
            fontSize: size,
            lineHeight: 1,
            letterSpacing: capFace.track + "em",
            fontKerning: "none",
            color: YELLOW_CAPTION,
            whiteSpace: "nowrap",
            // Measured against the reference: its glow is a broad Gaussian blur of the letters in bright amber,
            // composited with plain alpha (as this graphic is over the video), sigma about 0.65 cap and about
            // 1.4x the letter coverage near the edge, so two identical shadows. Dark layers would muddy bright
            // footage; only a thin warm-dark contact line stays, to keep the letters readable on pale shots.
            textShadow:
              "0 0 " + (0.03 * size).toFixed(1) + "px rgba(50,25,0,0.8), 0 0 " + (0.2 * size).toFixed(1) + "px rgba(60,30,0,0.35), " +
              "0 0 " + (0.88 * size).toFixed(1) + "px rgb(255,186,30), 0 0 " + (0.88 * size).toFixed(1) + "px rgba(255,186,30,0.4)",
          }}
        >
          {text}
        </div>
      );
    }
  }

  // ---- light leak -----------------------------------------------------------------------------------
  // 9 frames around each flash frame: orange -> near white at the peak -> deep orange tail.
  const LEAK: Array<[number, number, number, number]> = [
    [193, 109, 53, 0.45],
    [205, 132, 52, 0.62],
    [221, 161, 51, 0.8],
    [228, 196, 122, 0.92],
    [232, 220, 173, 0.97],
    [214, 158, 88, 0.86],
    [190, 118, 58, 0.66],
    [160, 83, 45, 0.45],
    [160, 83, 45, 0.2],
  ];
  let leak: React.ReactNode = null;
  for (const c of (data.flashes as number[]) || []) {
    const i = frame - c + 4;
    if (i < 0 || i >= LEAK.length) continue;
    const [r, g, b, a] = LEAK[i];
    leak = (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          mixBlendMode: "screen",
          background:
            "radial-gradient(ellipse 90% 70% at 62% 42%, rgba(" + r + "," + g + "," + b + "," + a + ") 0%, rgba(" + r + "," + g + "," + b + "," + (a * 0.85).toFixed(3) + ") 55%, rgba(" + Math.round(r * 0.8) + "," + Math.round(g * 0.6) + "," + Math.round(b * 0.6) + "," + (a * 0.7).toFixed(3) + ") 100%)",
        }}
      />
    );
  }

  if (!ready) return null;
  const blurDefs: React.ReactNode[] = [];
  for (let i = 1; i <= 8; i += 1) {
    blurDefs.push(
      <filter key={"vb" + i} id={"vb" + uid + "_" + i} x="-10%" y="-40%" width="120%" height="180%">
        <feGaussianBlur stdDeviation={"0 " + i * 3} />
      </filter>,
      <filter key={"hb" + i} id={"hb" + uid + "_" + i} x="-40%" y="-10%" width="180%" height="120%">
        <feGaussianBlur stdDeviation={i * 4 + " 0"} />
      </filter>
    );
  }
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>{blurDefs}</defs>
      </svg>
      {maskLayer}
      {front.map((t, i) => renderTitle(t, i))}
      {caption}
      {leak}
    </div>
  );
}
