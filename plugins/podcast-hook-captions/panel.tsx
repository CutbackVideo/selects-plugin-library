// @name Podcast Hook Captions
// @name:de Podcast-Hook-Untertitel
// @name:en Podcast Hook Captions
// @name:es Subtítulos gancho para pódcast
// @name:fr Sous-titres accroche podcast
// @name:it Sottotitoli hook per podcast
// @name:ja ポッドキャスト・フック字幕
// @name:ko Podcast Hook Captions
// @name:pt Legendas de gancho para podcast
// @name:tr Podcast Kanca Altyazıları
// @name:zh 播客钩子字幕
// @icon captions
// Turns a podcast Draft into a short-form reel: yellow word-pop captions, kinetic hook titles, a warm punch-in look, and synced whoosh/pop/impact sound effects.
import { useEffect, useMemo, useRef, useState } from "react";

// Bundled files (the segmentation helper source and the key-word font) live in the plugin folder beneath
// $SELECTS_USER_SKILLS_ROOT. Generated sound effects, mattes and downloaded B-roll live beneath
// ~/.selects/plugin-data/<id> so the Project can keep referencing them and an update never replaces them.
const PANEL_ID = "podcast-hook-captions";
const PLUGIN_DIR = "$SELECTS_USER_SKILLS_ROOT/" + PANEL_ID;
const DATA_DIR = "$HOME/.selects/plugin-data/" + PANEL_ID;
const SFX_DIR = DATA_DIR + "/sfx";
// ffmpeg: resolved once on mount by a shell probe. Prefers the bundled copy inside whichever Selects build is
// installed (Staging, Beta, or release), then anything on PATH. The probe's result is held in state (see mount).
const FFMPEG_PROBE = 'for a in "/Applications/Selects Staging.app" "/Applications/Selects Beta.app" "/Applications/Selects.app"; do f="$a/Contents/Resources/app.asar.unpacked/dist/bin/ffmpeg"; [ -x "$f" ] && { printf %s "$f"; exit 0; }; done; command -v ffmpeg || printf ffmpeg';
const CUTOUT_HELPER = PLUGIN_DIR + "/.local/person-cutout";
const MATTE_DIR = DATA_DIR + "/mattes";
const MATTE_BUDGET = 190000;
// The set mattes are the picture, so they get a bigger share of the edit script than the text mattes.
const CUTOUT_BUDGET = 420000;
const CUTOUT_TILES = 48;

const FACE_MEASURE = `// Measure the speaker's head in a person-cutout PNG (RGBA). Prints JSON: headTop/eyes/chin as % of height, headX as % of width.
// Head-and-shoulders shots: the silhouette's width profile goes head (wide) -> neck (narrow) -> shoulders (wide again).
// The chin sits just above the narrowest neck row; the eyes sit about 55% of a head height above the chin.
// Reads the PNG through ffmpeg so no image library is needed.
const {execFileSync} = require("child_process");
const [ffmpeg, png] = process.argv.slice(2);
const probe = execFileSync(ffmpeg.replace(/ffmpeg$/, "ffprobe"), ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", png]).toString().trim().split(",").map(Number);
const [W, H] = probe;
const raw = execFileSync(ffmpeg, ["-v", "error", "-i", png, "-f", "rawvideo", "-pix_fmt", "gray", "-vf", "alphaextract", "-"], {maxBuffer: 1 << 28});
const rowCount = new Int32Array(H), rowSumX = new Float64Array(H);
let top = -1, bottom = -1;
for (let y = 0; y < H; y += 1) {
  let n = 0, sx = 0; const off = y * W;
  for (let x = 0; x < W; x += 1) if (raw[off + x] > 128) { n += 1; sx += x; }
  rowCount[y] = n; rowSumX[y] = sx;
  if (n > W * 0.02) { if (top < 0) top = y; bottom = y; }
}
if (top < 0) { console.log(JSON.stringify({found: false})); process.exit(0); }
// Smooth the width profile a little so hair and ears do not make false minima.
const smooth = new Float64Array(H);
for (let y = 0; y < H; y += 1) { let s = 0, k = 0; for (let d = -3; d <= 3; d += 1) { const yy = y + d; if (yy >= 0 && yy < H) { s += rowCount[yy]; k += 1; } } smooth[y] = s / k; }
// The head's widest row: the first local maximum that is at least 8% of the picture wide, searched from the top.
let widest = top, widestW = 0;
for (let y = top; y <= bottom; y += 1) {
  if (smooth[y] >= widestW) { widest = y; widestW = smooth[y]; }
  else if (smooth[y] < widestW * 0.92 && widestW > W * 0.08) break;
}
// Below the widest row: the narrowest row before the silhouette widens out again (the shoulders).
let neck = -1, neckW = Infinity;
for (let y = widest; y <= bottom; y += 1) {
  if (smooth[y] < neckW) { neckW = smooth[y]; neck = y; }
  else if (smooth[y] > neckW * 1.18 && neckW < widestW * 0.9) break;
}
const headW = widestW;
// No neck found (the head runs out of the picture): guess from the head width.
let chin = neck > widest && neckW < widestW * 0.9 ? neck - 0.06 * headW : Math.min(bottom, top + 1.3 * headW);
// Eye line: half a head below the top when the whole head is in the picture. When the frame cuts the top
// of the head off, the visible height is short, so estimate the head from its width (a head is about 1.3x
// taller than it is wide at the temples) and put the eyes 58% of that above the chin.
const cut = top <= 1;
const headH = cut ? Math.max(chin - top, 1.3 * headW) : chin - top;
const eyes = Math.max(0, chin - (cut ? 0.58 : 0.5) * headH);
let sx = 0, sn = 0;
for (let y = top; y < Math.min(H, Math.round(chin)); y += 1) { sx += rowSumX[y]; sn += rowCount[y]; }
const pct = (v, base) => +(v / base * 100).toFixed(1);
console.log(JSON.stringify({found: true, headTop: pct(top, H), eyes: pct(eyes, H), chin: pct(chin, H), headX: pct(sx / Math.max(1, sn), W), headW: pct(headW, W), neck: neck >= 0 ? pct(neck, H) : null}));
`;
const STORAGE_PREFIX = "podcast-hook-captions:";
const MAX_WORDS = 1600;

const DEFAULTS = {
  accent: "#FEC538",
  fontFamily: "Montserrat",
  heroFontFamily: "",
  // Key words are squeezed sideways by this much (1 = the face as designed; more = taller, narrower letters).
  heroSqueeze: 1,
  captionSize: 118,
  heroSize: 250,
  captionY: 70,
  glow: 1,
  wordHoldSeconds: 0.6,
  holdSeconds: 2.2,
  gridOpacity: 0.32,
  roundedFrame: false,
  cornerRadius: 64,
  flashOnCuts: false,
  flashStrength: 1,
  leadPills: false,
  behindSpeaker: true,
  faceAnchor: true,
  parkX: 55,
  look: true,
  cameraStrength: 1,
  cameraHeadroom: 1.18,
  backdropDepth: 0.8,
  cutoutScale: 0.95,
  cutoutDrop: 19,
  gridPitch: 10.2,
  stageSet: true,
  panX: 0,
  tightCrop: 1,
  sfx: true,
  sfxGain: 0.7,
  sfxLibrary: "",
  brollDir: "",
  pexelsKey: "",
  popEveryWord: false,
};

// ---------------------------------------------------------------------------
// Motion graphic: word-pop captions + kinetic hero titles + grid/frame/flash.
// Runs inside Remotion. No template literals below: this file embeds it as one.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Camera. One plan drives the picture (inside the video effect) and the hook
// cards (inside the captions graphic), so text rides the frame exactly as it
// does in the reference, where almost every "text animation" is really a camera
// move. Each segment holds its value after it finishes and the camera resets at
// every shot cut. Shared source, injected into both components.
// ---------------------------------------------------------------------------
const CAMERA_SRC = `type CamSeg = { k: string; at: number; d: number; z?: number; dx?: number; dy?: number; tg?: number; rv?: boolean; hid?: number };
const easeInC = (p: number) => p * p * p;
const easeOutC = (p: number) => 1 - Math.pow(1 - p, 3);
const easeIOC = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(2 - 2 * p, 3) / 2);
const smoothC = (p: number) => p * p * (3 - 2 * p);
// strength scales every move; cover is the zoom the picture sits at so a pan never reaches the edge.
// Returns the picture scale S, the text scale sTxt (text sits nearer the camera, so it moves more),
// a shared offset in % of the frame, and per-axis travel in % of the frame per frame for motion blur.
function camAt(segs: CamSeg[], frame: number, shotStart: number, strength: number, cover: number) {
  let sPic = 1, sTxt = 1, tx = 0, ty = 0, bx = 0, by = 0, zb = 0;
  for (const g of segs) {
    // A move that is still running carries across a cut (the reference's title push-in does); one that
    // has already finished stops applying at the next shot.
    if (g.at < shotStart - 0.5 && g.at + Math.max(1, g.d) <= shotStart + 0.5) continue;
    if (frame < g.at) break;
    const d = Math.max(1, g.d);
    const p = g.d <= 0 ? 1 : Math.min(1, (frame - g.at) / d);
    const tg = typeof g.tg === "number" ? g.tg : 1.15;
    const z = 1 + ((typeof g.z === "number" ? g.z : 1) - 1) * strength;
    const dx = (g.dx || 0) * strength;
    const dy = (g.dy || 0) * strength;
    let e = p, v = 1;
    if (g.k === "through") { e = easeInC(p); v = 3 * p * p; }
    else if (g.k === "push") { e = easeIOC(p); v = 6 * p * (1 - p); }
    else if (g.k === "pull") { e = easeOutC(p); v = 3 * (1 - p) * (1 - p); }
    else if (g.k === "reveal" || g.k === "pan" || g.k === "settle") { e = easeIOC(p); v = 6 * p * (1 - p); }
    else if (g.k === "whip") { e = smoothC(p); v = 6 * p * (1 - p); }
    else if (g.k === "blow") { e = easeIOC(p); v = 6 * p * (1 - p); }
    if (p >= 1) v = 0;
    sPic *= 1 + (z - 1) * e;
    sTxt *= 1 + (z - 1) * e * tg;
    tx += dx * e;
    ty += dy * e;
    if (dx !== 0) bx = Math.max(bx, (Math.abs(dx) * v) / d);
    if (dy !== 0) by = Math.max(by, (Math.abs(dy) * v) / d);
    // Motion blur on zooms too: the frame edges are moving, so the picture smears the way a real lens
    // would. Proportional to how fast the scale is changing, so it builds and fades with the move.
    if (z !== 1) zb = Math.max(zb, (Math.abs(z - 1) * v * (g.k === "through" ? 150 : 110)) / d);
  }
  // Safety net: whatever a plan asks for, the picture never drops below its cover (which would clamp every
  // pan to nothing) or crops past a point where the source has no detail left.
  const S = Math.max(cover, Math.min(cover * 1.75, cover * sPic));
  const off = (S - 1) * 50;
  return { S, sTxt, tx: Math.max(-off, Math.min(off, tx)), ty: Math.max(-off, Math.min(off, ty)), bx, by, zb };
}
`;

const CAPTIONS_TSX = `import React, {useEffect, useState} from "react";
import {AbsoluteFill, interpolate, useCurrentFrame, Easing, delayRender, continueRender} from "remotion";

${CAMERA_SRC}

// Hero cards fit their text to the frame before they animate (measured with a canvas, estimated when
// measuring is unavailable), never wrap mid-animation, settle with a small overshoot, drift while they
// hold, and leave with eased exits. Timings measured from the reference at 30 fps, scaled to the Draft's fps.
type Props = { data?: Record<string, any> };
type W = [string, number, number];
const CL = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.cubic);
const easeInQuad = Easing.in(Easing.quad);
const easeBack = Easing.out(Easing.back(1.4));
const num = (d: any, k: string, f: number) => (typeof d[k] === "number" && Number.isFinite(d[k]) ? d[k] : f);
const str = (d: any, k: string, f: string) => (typeof d[k] === "string" ? d[k] : f);
const bool = (d: any, k: string, f: boolean) => (typeof d[k] === "boolean" ? d[k] : f);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const LEAK: Array<[string, number]> = [["#b8261a", 0.55], ["#ff6a12", 0.7], ["#ffb020", 0.85], ["#ffe680", 0.95], ["#ffffff", 1], ["#fff3b0", 0.85], ["#ffc84a", 0.6], ["#ff8a2a", 0.4], ["#c9401f", 0.2], ["#c9401f", 0]];

function stack(custom: string, fallback: string) {
  const c = custom.trim();
  return (c ? '"' + c.replace(/"/g, "") + '", ' : "") + fallback;
}

// Width of the text at a 100px font, including tracking. Canvas measurement when the renderer has a DOM,
// a per-face estimate otherwise, so a card can never size itself off the frame.
const widthCache: Record<string, number> = {};
function textWidth(text: string, cssFont: string, trackingEm: number, estimateEm: number): number {
  const key = cssFont + "|" + trackingEm + "|" + text;
  if (widthCache[key] != null) return widthCache[key];
  let w = 0;
  try {
    if (typeof document !== "undefined") {
      const ctx = document.createElement("canvas").getContext("2d");
      if (ctx) { ctx.font = cssFont; const m = ctx.measureText(text); if (m && m.width > 0) w = m.width; }
    }
  } catch {}
  if (!(w > 0)) w = text.length * estimateEm * 100;
  w += Math.max(0, text.length - 1) * trackingEm * 100;
  widthCache[key] = w;
  return w;
}
function fitSize(text: string, cssFontAt100: string, trackingEm: number, estimateEm: number, maxWidth: number, maxSize: number, minSize: number) {
  const w = textWidth(text, cssFontAt100, trackingEm, estimateEm);
  return Math.max(minSize, Math.min(maxSize, (maxWidth / w) * 100));
}
// A long phrase on one line has to shrink below its own lead-in to fit, which inverts the hierarchy the
// whole look depends on. The reference keeps hero lines short and stacks them; this does the same, picking
// whichever arrangement of up to three lines lets the type be biggest.
function fitBlock(text: string, cssFontAt100: string, trackingEm: number, estimateEm: number, maxWidth: number, maxHeight: number, maxSize: number, minSize: number) {
  const parts = text.split(/\\s+/).filter(Boolean);
  let best: {lines: string[]; size: number} = {lines: [text], size: fitSize(text, cssFontAt100, trackingEm, estimateEm, maxWidth, maxSize, 1)};
  for (let n = 2; n <= Math.min(3, parts.length); n += 1) {
    const per = Math.ceil(parts.length / n);
    const lines: string[] = [];
    for (let i = 0; i < parts.length; i += per) lines.push(parts.slice(i, i + per).join(" "));
    if (lines.length !== n) continue;
    let size = maxSize;
    for (const line of lines) size = Math.min(size, fitSize(line, cssFontAt100, trackingEm, estimateEm, maxWidth, maxSize, 1));
    size = Math.min(size, maxHeight / (n * 1.04));
    if (size > best.size) best = {lines, size};
  }
  return {lines: best.lines, size: Math.max(minSize, Math.min(maxSize, best.size))};
}

export default function HookReelCaptions({data = {}}: Props) {
  const frame = useCurrentFrame();
  const W = num(data, "width", 1080);
  const H = num(data, "height", 1920);
  const fps = num(data, "fps", 30);
  const u = Math.min(W / 1080, H / 1920);
  const r = fps / 30;
  const accent = str(data, "accent", "#FFD22E");
  const captionFont = stack(str(data, "fontFamily", ""), '"Montserrat", "Poppins", "Helvetica Neue", Arial, sans-serif');
  // The key-word face travels with the panel (Six Caps, OFL): tall, narrow, thin strokes, as in the
  // reference. It arrives as a data URL and is declared below; a family typed in the panel still wins.
  const heroEmbed = str(data, "heroFontData", "");
  const heroFont = stack(str(data, "heroFontFamily", ""), (heroEmbed ? '"Reel Hero", ' : "") + '"Six Caps", "Bebas Neue", "Anton", "HelveticaNeue-CondensedBlack", "Impact", "Arial Narrow", sans-serif');
  const heroWeight = heroEmbed && !str(data, "heroFontFamily", "") ? 400 : 900;
  const capCss = "800 100px " + captionFont;
  const heroCss = heroWeight + " 100px " + heroFont;
  const squeeze = Math.max(0.5, num(data, "heroSqueeze", 1));
  const squeezeCss = squeeze !== 1 ? "scaleX(" + (1 / squeeze).toFixed(4) + ") " : "";
  // Hold the first frames until the embedded face is ready, and render again once it is: widths measured
  // before that came from the fallback face (and are cached), so the cache is emptied and the fit redone.
  const [fontReady, setFontReady] = useState(!heroEmbed);
  const [fontHandle] = useState(() => (heroEmbed && typeof document !== "undefined" && (document as any).fonts ? delayRender("reel hero font") : null));
  useEffect(() => {
    if (!heroEmbed || fontReady) return;
    const done = () => { for (const k of Object.keys(widthCache)) delete widthCache[k]; setFontReady(true); };
    if (typeof document === "undefined" || !(document as any).fonts) { done(); return; }
    (document as any).fonts.load('400 100px "Reel Hero"').catch(() => null).finally(done);
  }, [heroEmbed, fontReady]);
  useEffect(() => { if (fontReady && fontHandle != null) continueRender(fontHandle); }, [fontReady, fontHandle]);
  const leadPills = bool(data, "leadPills", false);
  const words: W[] = Array.isArray(data.words) ? data.words : [];
  const heroes: any[] = Array.isArray(data.heroes) ? data.heroes : [];
  const cuts: number[] = Array.isArray(data.cuts) ? data.cuts : [];
  const brolls: number[][] = Array.isArray(data.brolls) ? data.brolls : [];
  const captionSize = num(data, "captionSize", 118) * u;
  const heroSize = num(data, "heroSize", 250) * u;
  const captionY = num(data, "captionY", 70);
  const glow = num(data, "glow", 1);
  const gridOpacity = num(data, "gridOpacity", 0.32);
  const rounded = bool(data, "roundedFrame", false);
  const cornerRadius = num(data, "cornerRadius", 64) * u;
  const flashStrength = num(data, "flashStrength", 1);
  const parkX = num(data, "parkX", 55);
  const holdFrames = Math.max(1, Math.round(num(data, "wordHoldSeconds", 0.6) * fps));
  // Where the speaker is, per shot ([start, end, chin%, eyes%, headTop%, headX%]), so text sits relative to the
  // face rather than the frame. Without a measurement, fall back to the reference's proportions.
  const faces: number[][] = Array.isArray(data.faces) ? data.faces : [];
  const face = faces.find((f) => frame >= f[0] && frame < f[1]) || null;
  const F = (n: number) => Math.max(1, Math.round(n * r));
  // Hooks whose shot carries the cut-out set (the effect stands the speaker on the grid there).
  const setHooks: number[] = Array.isArray(data.setHooks) ? data.setHooks : [];
  // Under such a hook the effect eases the speaker DOWN (cutoutDrop percent of the height over 24 frames
  // from the set's fade-in, and back out with its fade), so the measured head is that much lower on
  // screen. Text follows the head, not the measurement. Ranges: [start, end, fadeIn, fadeOut, mode].
  const stages: number[][] = Array.isArray(data.stage) ? data.stage : [];
  const cutoutDrop = num(data, "cutoutDrop", 19);
  const easeIOc = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(2 - 2 * p, 3) / 2);
  let dropPct = 0;
  for (const g of stages) {
    if ((g[4] || 1) !== 1) continue;
    const hook = heroes.find((h) => h.style === "hook" && h.start >= g[0] && h.start <= g[1]);
    if (!hook || !setHooks.includes(hook.id)) continue;
    const fin = Math.max(1, g[2] || F(8)), fout = Math.max(1, g[3] || F(11));
    if (frame < g[0] - fin || frame > g[1] + fout) continue;
    const v = Math.max(0, Math.min(1, (frame - (g[0] - fin)) / fin, ((g[1] + fout) - frame) / fout));
    const settle = easeIOc(clamp01((frame - (g[0] - fin)) / F(24)));
    dropPct = Math.max(dropPct, cutoutDrop * settle * (v >= 0.999 ? 1 : v));
  }
  const chinPct = (face ? face[2] : 30) + dropPct;
  const headTopPct = (face ? face[4] : 0) + dropPct;
  const belowChin = H * (chinPct / 100) + H * 0.06;
  const captionLine = face ? Math.max(belowChin, H * 0.55) : H * captionY / 100;
  const roomAbove = face ? H * (headTopPct / 100) : 0;
  const SLOW = F(18), BLOW = F(9), HOLD_AFTER_BLOW = F(10), FADE = F(8), HOOK_EXIT = F(18), STACK_SLIDE = F(8), SETTLE = F(12), LEAD_FADE = F(4);

  // ---- cinematic word motion: rise in with directional blur, ease out to rest; drop out on exit ----
  // t = frames since entry; dur = entry frames. Returns transform + filter for a word travelling along axis.
  const mblur = (axis: "x" | "y", amount: number) => "url(#mb" + axis + Math.max(0, Math.min(8, Math.round(amount))) + ")";
  const enterMotion = (t: number, dur: number, travelPx: number, axis: "x" | "y" = "y") => {
    const p = interpolate(t, [0, dur], [0, 1], {...CL, easing: easeOut});
    // velocity (derivative of ease-out cubic) drives the blur: high at t=0, zero at rest
    const v = t < 0 ? 0 : t >= dur ? 0 : 3 * Math.pow(1 - t / dur, 2);
    const offset = travelPx * (1 - p);
    return {
      transform: axis === "y" ? "translateY(" + offset + "px)" : "translateX(" + offset + "px)",
      filter: v > 0.05 ? mblur(axis, v * 2.2) : "none",
      opacity: interpolate(t, [0, Math.max(1, dur * 0.45)], [0, 1], CL),
    };
  };
  const exitMotion = (t: number, dur: number, travelPx: number, axis: "x" | "y" = "y") => {
    const p = interpolate(t, [0, dur], [0, 1], {...CL, easing: easeIn});
    const v = t < 0 ? 0 : t >= dur ? 0 : 3 * Math.pow(t / dur, 2);
    const offset = travelPx * p;
    return {
      transform: axis === "y" ? "translateY(" + offset + "px)" : "translateX(" + offset + "px)",
      filter: v > 0.05 ? mblur(axis, v * 2.2) : "none",
      opacity: interpolate(t, [dur * 0.6, dur], [1, 0], CL),
    };
  };
  const ENTER = F(8), EXIT = F(5);
  // ---- shared pieces --------------------------------------------------------------------------------------
  const leadText = (h: any) => (h.lead as W[]).map((w) => String(w[0]).toUpperCase()).join(" ");
  const keyText = (h: any) => (h.key as W[]).map((k) => String(k[0]).toUpperCase()).join(" ");
  const heroShadow = "0 0 " + (0.25 * glow) + "em " + accent + "99, 0 6px 18px rgba(0,0,0,0.6)";
  // Measured: a card that has settled does not drift at all (the punch card is dead still for 34 frames).
  const drift = (_h: any) => 1;
  // When each word is shown - as spoken, except the opening title's, which rise in one after another from the
  // start of the video. The planner uses the same schedule for the sound.
  const shownAt = (h: any, part: "lead" | "key", i: number): number => h.open
    ? h.start + F(2) + (part === "lead" ? i * F(3) : (h.lead as W[]).length * F(3) + F(3) + i * F(5))
    : (part === "lead" ? (h.lead as W[])[i][1] : (h.key as W[])[i][1]);
  // Lead-in words rise in one at a time as they are shown, on one line or two (see leadLayout). Words not
  // shown yet keep their place invisibly, so a centred line does not shift as it fills in.
  const leadLine = (h: any, lead: {size: number; split: number}, align: "center" | "left", pill: boolean) => {
    const size = lead.size;
    const all = (h.lead as W[]).map((w, i) => ({w, i}));
    const rows = lead.split < all.length ? [all.slice(0, lead.split), all.slice(lead.split)] : [all];
    return (
      <div style={{textAlign: align, lineHeight: 1.1}}>
        {rows.map((row, r) => (
          <div key={r} style={{whiteSpace: "nowrap"}}>
            {row.map(({w, i}) => {
              const t = frame - shownAt(h, "lead", i);
              if (t < 0) return <span key={i} style={{display: "inline-block", margin: "0 " + (0.1 * size) + "px", padding: pill ? (0.02 * size) + "px " + (0.16 * size) + "px" : 0, borderRadius: 0.16 * size, background: pill ? "rgba(8,8,10,0.42)" : "transparent", fontFamily: captionFont, fontWeight: 800, fontSize: size, letterSpacing: 0.06 * size, color: "#ffffff", textTransform: "uppercase", textShadow: "0 0 " + (0.25 * size) + "px rgba(255,255,255,0.35), 0 3px 10px rgba(0,0,0,0.6)", visibility: "hidden"}}>{w[0]}</span>;
              const motion = enterMotion(t, F(9), 0.35 * size, "y");
              return <span key={i} style={{display: "inline-block", margin: "0 " + (0.1 * size) + "px", padding: pill ? (0.02 * size) + "px " + (0.16 * size) + "px" : 0, borderRadius: 0.16 * size, background: pill ? "rgba(8,8,10,0.42)" : "transparent", fontFamily: captionFont, fontWeight: 800, fontSize: size, letterSpacing: 0.06 * size, color: "#ffffff", textTransform: "uppercase", textShadow: "0 0 " + (0.25 * size) + "px rgba(255,255,255,0.35), 0 3px 10px rgba(0,0,0,0.6)", ...motion}}>{w[0]}</span>;
            })}
          </div>
        ))}
      </div>
    );
  };
  // Key words on their fitted lines, each word rising into place as it is spoken. Unspoken words hold
  // their space invisibly, so the block never re-flows while it fills in.
  const keyLinesRising = (h: any, lines: string[], keySize: number, dur: number) => {
    const keys = h.key as W[];
    let idx = 0;
    return lines.map((line, li) => (
      <div key={li} style={{lineHeight: 1.02, minHeight: keySize * 1.02, whiteSpace: "nowrap", transform: squeezeCss || undefined, transformOrigin: "50% 0"}}>
        {line.split(" ").filter(Boolean).map((word, wi) => {
          const ki = Math.min(keys.length - 1, idx);
          idx += 1;
          const m = enterMotion(frame - shownAt(h, "key", ki), dur, 0.55 * keySize, "y");
          return <span key={wi} style={{display: "inline-block", marginLeft: wi > 0 ? 0.24 * keySize : 0, ...m}}>{word}</span>;
        })}
      </div>
    ));
  };
  // The lead-in: one line when it fits at a decent size (45% of its maximum or more), otherwise two lines split
  // at the word that balances them best. It is never set wider than it was fitted to - the size floor used to
  // win over the fit and push long leads off the edge. The words are separate spans with 0.1 em margins each
  // side, so a line of k words is its measured width plus 0.2 em per word. 'extra' is the second line's height.
  const leadLayout = (h: any, maxWidth: number, maxSize: number, allowWrap: boolean = true) => {
    const ws = (h.lead as W[]).map((w) => String(w[0]).toUpperCase());
    const fit = (part: string[]) => (part.length ? Math.min(maxSize, maxWidth / (textWidth(part.join(" "), capCss, 0.06, 0.72) / 100 + 0.2 * part.length)) : maxSize);
    let size = fit(ws);
    let split = ws.length;
    if (allowWrap && ws.length > 1 && size < 0.45 * maxSize) {
      for (let j = 1; j < ws.length; j += 1) {
        const s2 = Math.min(fit(ws.slice(0, j)), fit(ws.slice(j)));
        if (s2 > size) { size = s2; split = j; }
      }
    }
    return {size, split, extra: split < ws.length ? size * 1.1 : 0};
  };
  // ---- which card is live, and whether captions show under it ------------------------------------------
  const blowStart = (h: any) => (typeof h.blowAt === "number" ? h.blowAt : h.keyEnd + SLOW);
  const punchVisibleUntil = (h: any) => {
    const blowEnd = blowStart(h) + BLOW;
    const cut = cuts.find((c) => c >= blowEnd - F(2) && c <= h.end);
    return cut != null ? Math.min(h.end, cut) : h.end;
  };
  const active = heroes.find((h) => frame >= h.start && frame < (h.style === "punch" ? punchVisibleUntil(h) : h.end)) || null;
  // A card carries the words that are being spoken, so the caption under it would read them twice.
  const ownWords = new Set<number>();
  if (active) for (const w of ((active.lead as W[]) || []).concat((active.key as W[]) || [])) ownWords.add(w[1]);
  const hideCaptions = active != null && active.style !== "hook";
  // ---- the camera ---------------------------------------------------------------------------------------
  // The same plan the video effect runs. Hook cards and the grid are pinned to the picture and ride every
  // move (that is what carries a title off the top, and what throws a stack block out of frame); the caption
  // line is not - measured, it holds the same height through every push-in, whip and blow-out. Text sits
  // nearer the camera than the picture, so it takes more of each zoom (the reference blow-out: 1.62x of text
  // over 1.15x of picture).
  const camSegs: CamSeg[] = (Array.isArray(data.camera) ? data.camera : []).filter((g: CamSeg) => !(g.rv && setHooks.includes(g.hid as number)));
  const shotStarts: number[] = Array.isArray(data.shots) ? data.shots : [];
  const camStrength = Math.max(0, num(data, "cameraStrength", 1));
  const camCover = Math.max(1, num(data, "cameraHeadroom", 1.18));
  let shotStart = 0;
  for (const sf of shotStarts) if (sf <= frame) shotStart = sf;
  const cam = camAt(camSegs, frame, shotStart, camStrength, camCover);
  const camX = (cam.bx / 100) * W;
  const camY = (cam.by / 100) * H;
  const camPx = Math.max(camX, camY) * 0.42;
  const camStyle: any = {
    transform: "translate(" + cam.tx.toFixed(3) + "%, " + cam.ty.toFixed(3) + "%) scale(" + cam.sTxt.toFixed(4) + ")",
    filter: camPx > 0.8 ? mblur(camX >= camY ? "x" : "y", camPx / (5 * u)) : "none",
  };

  const camPeakCache: Record<string, number> = {};
  const camPeak = (h: any) => {
    const key = String(h.id);
    if (camPeakCache[key] != null) return camPeakCache[key];
    const until = Math.min(h.end, typeof h.blowAt === "number" && h.style === "punch" ? h.blowAt : typeof h.exitAt === "number" ? h.exitAt : h.end);
    let peak = 1;
    for (let f = h.start; f <= until; f += 1) {
      let ss = 0;
      for (const sf of shotStarts) if (sf <= f) ss = sf;
      peak = Math.max(peak, camAt(camSegs, f, ss, camStrength, camCover).sTxt);
    }
    camPeakCache[key] = peak;
    return peak;
  };

  // How far the camera pans while a hero is up (percent of the width): the text rides along, so a block
  // fitted to the frame at rest would be pushed over the edge. Fits shrink by this much.
  const camPanCache: Record<string, number> = {};
  const camPanPeak = (h: any) => {
    const key = String(h.id);
    if (camPanCache[key] != null) return camPanCache[key];
    const until = Math.min(h.end, typeof h.blowAt === "number" && h.style === "punch" ? h.blowAt : typeof h.exitAt === "number" ? h.exitAt : h.end);
    let peak = 0;
    for (let f = h.start; f <= until; f += 1) {
      let ss = 0;
      for (const sf of shotStarts) if (sf <= f) ss = sf;
      peak = Math.max(peak, Math.abs(camAt(camSegs, f, ss, camStrength, camCover).tx));
    }
    camPanCache[key] = peak;
    return peak;
  };

  // Hook geometry is needed by both the card and the caption line (which dodges the card when it sits below the chin).
  const hookGeom = (h: any) => {
    const room = 1 / Math.max(1, camPeak(h));
    // fitBlock spends 1.04 line-heights per line; the block is drawn at 1.14, so the height it is given is
    // scaled down by that ratio, and a single line is capped through maxSize (fitBlock only limits height
    // once it breaks lines).
    const fitKeys = (maxH: number) => fitBlock(keyText(h), heroCss, 0.01, 0.42, 0.94 * W * room * squeeze, maxH * (1.04 / 1.14), Math.min(heroSize * 1.15, maxH / 1.14), heroSize * 0.3);
    // On the cut-out set the title is a card at the top of the frame and the head stands in front of it
    // (masked by the speaker's own matte), as in the reference; room above no longer decides. The card
    // is sized so its last line ends about half a line below where the head top will rest once the
    // set's drop has settled (the head overlaps that much of the reference's title) - the final drop, not
    // the eased one, so the card does not breathe while the head is still coming down.
    const onSet = setHooks.includes(h.id);
    // The key words are fitted into whatever room the lead-in leaves.
    const layoutWith = (lead: any) => {
      const leadDrop = lead.size * 1.55 + lead.extra;
      let kb = fitKeys(0.44 * H);
      let blockH = leadDrop + kb.size * 1.14 * kb.lines.length;
      if (onSet) {
        const headRest = H * (((face ? face[4] : 0) + cutoutDrop) / 100);
        const maxKeyH = headRest + 0.5 * kb.size - H * 0.05 - leadDrop;
        if (kb.size * 1.14 * kb.lines.length > maxKeyH) {
          kb = fitKeys(Math.max(heroSize * 0.3 * 1.14, maxKeyH));
          blockH = leadDrop + kb.size * 1.14 * kb.lines.length;
        }
      }
      const above = onSet || roomAbove >= blockH + H * 0.04;
      if (face && !above) {
        // Under the chin the block has to leave a caption line inside the frame beneath it.
        const maxKeyH = H * 0.92 - captionSize * 1.15 - H * 0.03 - belowChin - leadDrop;
        if (kb.size * 1.14 * kb.lines.length > maxKeyH) {
          kb = fitKeys(Math.max(heroSize * 0.3 * 1.14, maxKeyH));
          blockH = leadDrop + kb.size * 1.14 * kb.lines.length;
        }
      }
      return {kb, blockH, above};
    };
    // On the set the lead-in stays on one line, as the reference's does ("WHY DO YOU"): the room above the
    // head belongs to the key words, which it measured at about 14% of the frame tall. A long lead-in is set
    // smaller rather than wrapped there.
    let lead = leadLayout(h, 0.9 * W * room, heroSize * 0.5, !onSet);
    let g = layoutWith(lead);
    // The title is its key words: they stay at least 1.5x the lead-in. A lead-in long enough to wrap, or
    // big enough to crowd the key words, drops to one smaller line and the key words take the room it frees.
    if (g.kb.size < 1.5 * lead.size) {
      lead = leadLayout(h, 0.9 * W * room, Math.max(heroSize * 0.12, Math.min(heroSize * 0.5, g.kb.size / 1.5)), false);
      g = layoutWith(lead);
    }
    const leadSize = lead.size;
    const keySize = g.kb.size;
    const blockH = g.blockH;
    const above = g.above;
    const top = onSet ? H * 0.05 : face ? (above ? Math.max(H * 0.04, roomAbove - blockH - H * 0.02) : belowChin) : H * 0.07;
    return {lead, leadSize, keySize, blockH, above, top, onSet, keyLines: g.kb.lines};
  };
  const activeHook = active != null && active.style === "hook" ? hookGeom(active) : null;
  // Caption line: under the chin, or under the hook block when that block had to go below the chin.
  // ... and never off the bottom: the block is sized to leave a line's worth of room (hookGeom); if a very
  // tall block still leaves none, the line sits inside the frame over the block's last line.
  let wordIndex = -1;
  for (let i = 0; i < words.length; i += 1) {
    if (words[i][1] <= frame) wordIndex = i;
    else break;
  }
  // The line is decided per word, from where the card is when the word starts, so it never moves
  // mid-word: a word that starts under the card stays under it, the first word after the card has
  // faded (its exit is 9 frames in) goes back to the captions' own line.
  const wordStart = wordIndex >= 0 ? words[wordIndex][1] : frame;
  const cardGoneAt = active != null && active.style === "hook" && typeof active.exitAt === "number" ? active.exitAt + F(9) : Infinity;
  const underCard = activeHook != null && !activeHook.above && wordStart < cardGoneAt;
  const captionTopNow = Math.min(underCard ? Math.max(captionLine, activeHook.top + activeHook.blockH + H * 0.03) : captionLine, H * 0.92 - captionSize * 1.15);

  // ---- single-word captions: hard cut in, hard cut out, constant glow ----------------------------------
  const captionWord = (i: number, key: string) => {
    const w = words[i];
    const next = i + 1 < words.length ? words[i + 1][1] : Infinity;
    const until = Math.min(next, w[2] + holdFrames);
    const tIn = frame - w[1];
    const tOut = frame - until;
    if (tIn < 0 || tOut >= 0) return null;
    if (ownWords.has(w[1])) return null;
    const size = fitSize(String(w[0]).toUpperCase(), capCss, 0.01, 0.72, 0.9 * W, captionSize, captionSize * 0.4);
    const shadow = glow > 0
      ? "0 0 " + (0.3 * glow) + "em " + accent + "cc, 0 0 " + (1.1 * glow) + "em " + accent + "80, 0 " + (0.6 * u) + "px " + (2 * u) + "px rgba(0,0,0,0.55)"
      : "0 2px 8px rgba(0,0,0,0.6)";
    // The reference cuts its captions; this reel's chosen entrance is the same rise as the titles.
    const motion = enterMotion(tIn, F(7), 0.45 * size, "y");
    return (
      <div key={key} style={{position: "absolute", left: 0, right: 0, top: active != null && active.style === "punch" ? Math.min(captionLine, H * 0.52) : captionTopNow, textAlign: "center", pointerEvents: "none"}}>
        <span style={{display: "inline-block", fontFamily: captionFont, fontWeight: 800, fontSize: size, letterSpacing: 0.01 * size, color: accent, textTransform: "uppercase", textShadow: shadow, whiteSpace: "nowrap", ...motion}}>
          {w[0]}
        </span>
      </div>
    );
  };
  let caption: React.ReactNode = null;
  if (!hideCaptions) {
    caption = wordIndex >= 0 ? captionWord(wordIndex, "cur") : null;
  }

  // Speaker matte for a hero that parks or stands behind the speaker: the sprite is the finished frame's
  // inverse person matte (person black), one tile per sampled frame, applied as a luminance mask.
  const behindMaskStyle = (h: any, from: number): any => {
    const behind = h.behind && typeof h.behind.sprite === "string" && h.behind.count > 0 ? h.behind : null;
    if (!behind || frame < from) return {};
    const idx = Math.max(0, Math.min(behind.count - 1, Math.floor((frame - behind.start) / Math.max(1, behind.step))));
    const col = idx % behind.cols;
    const row = Math.floor(idx / behind.cols);
    const url = "url(" + behind.sprite + ")";
    const size = (behind.cols * W) + "px " + (behind.rows * H) + "px";
    const pos = (-col * W) + "px " + (-row * H) + "px";
    return {maskImage: url, WebkitMaskImage: url, maskSize: size, WebkitMaskSize: size, maskPosition: pos, WebkitMaskPosition: pos, maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskMode: "luminance"};
  };

  // ---- hook: fitted title wipes in under a fitted lead line, ghost echo behind, slides up and out --------
  const renderHook = (h: any) => {
    const {lead, leadSize, keySize, blockH, above, top, onSet, keyLines} = hookGeom(h);
    // On the set the head stands in front of the card: the whole card layer is masked by the speaker.
    const maskStyle = onSet ? behindMaskStyle(h, h.start) : {};
    // Leave on the cue word, or at a picture cut if one comes first: a title must not survive a shot change.
    const cutBefore = cuts.find((c) => c > h.keyStart && c < h.end);
    const exitAt = Math.min(typeof h.exitAt === "number" ? h.exitAt : h.end - HOOK_EXIT, cutBefore != null ? cutBefore - HOOK_EXIT : Infinity, h.end - 1);
    const exitT = clamp01((frame - exitAt) / HOOK_EXIT);
    const exitY = (above || !face ? -(top + blockH) : (H - top)) * easeIn(exitT);
    const kt = frame - shownAt(h, "key", 0);
    return (
      <AbsoluteFill key={h.id} style={{overflow: "hidden", ...maskStyle}}>
      <AbsoluteFill style={{overflow: "hidden", opacity: interpolate(frame, [exitAt, exitAt + F(14)], [1, 0], CL), transform: "translateY(" + exitY + "px)", filter: exitT > 0 && exitT < 1 ? mblur("y", 3 * Math.pow(exitT, 2) * 2.2 + 1) : "none"}}>
        {keyLines.length < 2 && <div style={{position: "absolute", left: "-30%", width: "160%", top: top - keySize * 0.4, fontFamily: heroFont, fontWeight: heroWeight, fontSize: keySize * 2.4, lineHeight: 0.9, color: accent, opacity: 0.07 * clamp01(kt / F(6)), whiteSpace: "nowrap", textAlign: "center", filter: "blur(" + 2 * u + "px)", textTransform: "uppercase", letterSpacing: -0.02 * keySize, transform: "scale(" + drift(h) + ")"}}>
          {keyText(h)}
        </div>}
        <div style={{position: "absolute", left: "6%", right: "6%", top, transform: "scale(" + drift(h) + ")"}}>
          {leadLine(h, lead, "center", leadPills)}
        </div>
        <div style={{position: "absolute", left: "3%", right: "3%", top: top + leadSize * 1.55 + lead.extra, textAlign: "center", fontFamily: heroFont, fontWeight: heroWeight, fontSize: keySize, lineHeight: 1, color: accent, textTransform: "uppercase", letterSpacing: 0.01 * keySize, textShadow: heroShadow, whiteSpace: "nowrap"}}>
          {keyLinesRising(h, keyLines, keySize, F(12))}
        </div>
      </AbsoluteFill>
      </AbsoluteFill>
    );
  };

  // ---- punch: fitted key word cuts in under its lead line, grows, blows past the edges, holds into a cut
  const renderPunch = (h: any) => {
    const room = 1 / Math.max(1, camPeak(h));
    const lead = leadLayout(h, 0.9 * W * room, heroSize * 0.5);
    const leadSize = lead.size;
    const kb = fitBlock(keyText(h), heroCss, 0, 0.42, 0.92 * W * room * squeeze, 0.36 * H, heroSize * 1.5, heroSize * 0.26);
    const keySize = kb.size;
    const landed = (h.key as W[]).filter((k) => k[1] <= frame);
    const last = landed[landed.length - 1];
    const pop = 1;
    // Measured: punch words cut in and do not move at all (k = 1.00 for 34 frames), then blow out
    // linearly at +0.062 per frame for 10 frames to 1.62x and freeze there until the cut.
    const keyMotion: any = {transform: "none", filter: "none", opacity: 1};
    const slowEnd = blowStart(h);
    const blowEnd = slowEnd + BLOW;
    const until = punchVisibleUntil(h);
    const halfW = 0.5 * Math.max(1, textWidth(keyText(h), heroCss, 0, 0.42) * (keySize / 100));
    // Grows to fill the frame and stops at its edge. The reference blows past the edge; this does not.
    // The card rides the camera, which is itself zooming during the blow-out, so the cap allows for
    // however much the camera will have grown the text by the end of it.
    const camAtBlowEnd = camAt(camSegs, blowStart(h) + BLOW, shotStart, camStrength, camCover).sTxt;
    const camAtBlowStart = camAt(camSegs, blowStart(h), shotStart, camStrength, camCover).sTxt;
    const camBlowGain = Math.max(1, camAtBlowEnd / Math.max(0.01, camAtBlowStart));
    const blowMax = Math.max(1.05, Math.min(1.62, (0.96 * W) / (2 * halfW * camBlowGain * Math.max(1, camPeak(h)))));
    let s = 1;
    if (frame >= slowEnd) s = interpolate(frame - slowEnd, [0, BLOW], [1, blowMax], {...CL, easing: Easing.inOut(Easing.cubic)});
    // The blur follows the edge speed of the word rather than being a flat smear over the whole blow-out.
    const blowRate = frame >= slowEnd && frame < blowEnd ? 0.62 / BLOW : 0;
    const blowBlur = blowRate * halfW * s * 0.42;
    const leadFade = interpolate(frame, [slowEnd, blowEnd], [1, 0], CL);
    const endsOnCut = cuts.some((c) => c === until);
    const fadeT = endsOnCut ? 1 : interpolate(frame, [until - FADE, until], [1, 0], CL);
    // Under the chin; when the face fills the top of the frame that is the lower half.
    const top = face ? Math.max(belowChin, H * 0.5) : H * 0.5;
    return (
      <AbsoluteFill key={h.id} style={{overflow: "hidden", opacity: fadeT}}>
        <div style={{position: "absolute", left: "6%", right: "6%", top, opacity: leadFade, transform: "scale(" + drift(h) + ")"}}>
          {leadLine(h, lead, "center", false)}
        </div>
        {(
          <div style={{position: "absolute", left: "4%", right: "4%", top: top + leadSize * 1.45 + lead.extra, textAlign: "center", fontFamily: heroFont, fontWeight: heroWeight, fontSize: keySize, lineHeight: 1, color: accent, textTransform: "uppercase", textShadow: "0 0 " + (0.22 * glow) + "em " + accent + "99, 0 8px 22px rgba(0,0,0,0.65)", whiteSpace: "nowrap", transformOrigin: "50% 50%", transform: keyMotion.transform + " scale(" + (s * pop) + ")", filter: blowBlur > 0.8 ? mblur("x", blowBlur / (5 * u)) : keyMotion.filter, opacity: keyMotion.opacity}}>
            {keyLinesRising(h, kb.lines, keySize, F(10))}
          </div>
        )}
      </AbsoluteFill>
    );
  };

  // ---- stack: fitted lead line top-left, key words scale into a tilted stagger, arrow draws, block parks
  const renderStack = (h: any) => {
    const keys = h.key as W[];
    const room = (1 / Math.max(1, camPeak(h))) * Math.max(0.5, 1 - camPanPeak(h) / 100);
    const lead = leadLayout(h, 0.8 * W * room, heroSize * 0.36);
    const leadSize = lead.size;
    // Each word is indented one step further than the one above it, so each has less room than the last.
    const keySize = Math.min(...keys.map((k, i) => fitSize(String(k[0]).toUpperCase(), heroCss, 0.01, 0.42, Math.max(0.34, 0.9 - 0.16 * i) * W * room * squeeze, heroSize * 1.2, heroSize * 0.3)));
    // Straight words (no tilt), so no extra room is needed under the lead line; keep the whole block
    // above the bottom of the frame.
    const lift = 0;
    const blockH = leadSize * 1.7 + lead.extra + lift + (keys.length - 1) * keySize * 0.92 + keySize;
    const top = Math.min(face ? Math.max(belowChin, H * 0.45) : H * 0.13, H * 0.94 - blockH);
    const keyTop = top + leadSize * 1.7 + lead.extra + lift;
    const lastLand = keys[keys.length - 1][1];
    const arrowT = clamp01((frame - (lastLand + F(4))) / F(5));
    const slideStart = typeof h.slideStart === "number" ? h.slideStart : h.end - STACK_SLIDE;
    const behind = h.behind && typeof h.behind.sprite === "string" && h.behind.count > 0 ? h.behind : null;
    const slideT = easeIn(clamp01((frame - slideStart) / STACK_SLIDE));
    const shift = behind ? W * (parkX / 100) * slideT : W * 1.1 * slideT;
    const maskStyle: any = behindMaskStyle(h, slideStart);
    const ax0 = W * 0.09; const ay0 = top + leadSize * 1.25 + lead.extra;
    const ax3 = W * 0.075; const ay3 = keyTop + keySize * 0.62;
    const ax1 = W * -0.06; const ay1 = ay0 + (ay3 - ay0) * 0.35;
    const ax2 = W * -0.04; const ay2 = ay0 + (ay3 - ay0) * 0.8;
    const arrowLen = 1600 * u;
    const dx = ax3 - ax2; const dy = ay3 - ay2; const dl = Math.max(1, Math.hypot(dx, dy));
    const tx = dx / dl; const ty = dy / dl; const headLen = 38 * u; const ang = 0.55;
    const h1x = ax3 - headLen * (tx * Math.cos(ang) - ty * Math.sin(ang)); const h1y = ay3 - headLen * (tx * Math.sin(ang) + ty * Math.cos(ang));
    const h2x = ax3 - headLen * (tx * Math.cos(-ang) - ty * Math.sin(-ang)); const h2y = ay3 - headLen * (tx * Math.sin(-ang) + ty * Math.cos(-ang));
    return (
      <AbsoluteFill key={h.id} style={{overflow: "hidden", ...maskStyle}}>
        <AbsoluteFill style={{transform: "translateX(" + shift + "px) scale(" + drift(h) + ")", transformOrigin: "20% 30%", filter: slideT > 0 && slideT < 1 ? mblur("x", 3 * Math.pow(slideT, 2) * 2.2 + 1) : "none"}}>
          <div style={{position: "absolute", left: "8%", right: "8%", top}}>
            {leadLine(h, lead, "left", leadPills)}
          </div>
          {keys.map((k, i) => {
            const t = frame - k[1];
            if (t < 0) return null;
            const motion = enterMotion(t, F(10), 0.6 * keySize, "y");
            return (
              <div key={i} style={{position: "absolute", left: (7 + i * 16) + "%", top: keyTop + i * keySize * 0.92, fontFamily: heroFont, fontWeight: heroWeight, fontSize: keySize, lineHeight: 0.95, color: i === keys.length - 1 ? accent : "#ffffff", textTransform: "uppercase", textShadow: heroShadow, transformOrigin: "0% 100%", transform: squeezeCss + motion.transform, filter: motion.filter, opacity: motion.opacity, whiteSpace: "nowrap"}}>
                {k[0]}
              </div>
            );
          })}
          {arrowT > 0 && (
            <svg width={W} height={H} style={{position: "absolute", inset: 0, overflow: "visible"}} viewBox={"0 0 " + W + " " + H}>
              <path d={"M " + ax0 + " " + ay0 + " C " + ax1 + " " + ay1 + ", " + ax2 + " " + ay2 + ", " + ax3 + " " + ay3} fill="none" stroke={accent} strokeWidth={9 * u} strokeLinecap="round" strokeDasharray={arrowLen} strokeDashoffset={arrowLen * (1 - arrowT)} style={{filter: "drop-shadow(0 0 " + (8 * u) + "px " + accent + "99)"}} />
              {arrowT > 0.85 && <path d={"M " + h1x + " " + h1y + " L " + ax3 + " " + ay3 + " L " + h2x + " " + h2y} fill="none" stroke={accent} strokeWidth={9 * u} strokeLinecap="round" strokeLinejoin="round" />}
            </svg>
          )}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  };

  const hero = active ? (active.style === "hook" ? renderHook(active) : active.style === "stack" ? renderStack(active) : renderPunch(active)) : null;


  // ---- grid: under hook cards and over B-roll, fading in and out -----------------------------------------
  // The grid belongs to the set, which the video effect draws behind the speaker. Drawing it here too
  // would double the lines and put them over his face.
  const gridFade = 0;

  // ---- cut flash: a warm light leak, red to orange to yellow to white, cut hidden at the peak ------------
  let leak: React.ReactNode = null;
  for (const c of cuts) {
    const t = (frame - c) / r;
    if (t >= -4 && t <= 5) {
      const idx = Math.max(0, Math.min(LEAK.length - 1, Math.round(t + 4)));
      const o = interpolate(t, [-4, -1, 0, 1, 3, 5], [0.55, 0.95, 1, 0.85, 0.4, 0], CL) * flashStrength;
      leak = <AbsoluteFill style={{backgroundColor: LEAK[idx][0], opacity: o}} />;
      break;
    }
  }

  const gridStep = 88 * u;
  return (
    <AbsoluteFill style={{overflow: "hidden"}}>
      <svg width="0" height="0" style={{position: "absolute"}}>
        <defs>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <filter key={"mby" + i} id={"mby" + i} x="-30%" y="-80%" width="160%" height="260%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={"0 " + (i * 4 * u)} /></filter>
          ))}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <filter key={"mbx" + i} id={"mbx" + i} x="-80%" y="-30%" width="260%" height="160%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={(i * 5 * u) + " 0"} /></filter>
          ))}
        </defs>
      </svg>
      {heroEmbed && <style>{'@font-face { font-family: "Reel Hero"; src: url("data:font/woff2;base64,' + heroEmbed + '") format("woff2"); font-weight: 400; }'}</style>}
      <AbsoluteFill style={camStyle}>
        {gridOpacity > 0 && gridFade > 0 && (
          <svg width={W} height={H} style={{position: "absolute", inset: 0, opacity: gridOpacity * gridFade}} viewBox={"0 0 " + W + " " + H}>
            <defs>
              <pattern id="hookgrid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
                <path d={"M " + gridStep + " 0 L 0 0 0 " + gridStep} fill="none" stroke="rgba(196,232,255,0.7)" strokeWidth={1.4 * u} />
              </pattern>
            </defs>
            <rect width={W} height={H} fill="url(#hookgrid)" />
          </svg>
        )}
        {hero}
      </AbsoluteFill>
      {caption}
      {leak}
      {rounded && <AbsoluteFill style={{borderRadius: cornerRadius, boxShadow: "0 0 0 " + Math.max(W, H) + "px #070707"}} />}
    </AbsoluteFill>
  );
}
`;

// ---------------------------------------------------------------------------
// Video effect: the camera. Runs the shared plan over the picture and dips the room into backdrop mode
// under a hook.
// ---------------------------------------------------------------------------
const LOOK_TSX = `import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from "remotion";

${CAMERA_SRC}

type Props = { Source: React.ComponentType; data?: Record<string, any> };
const CLAMP = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const easeIO = Easing.inOut(Easing.cubic);
const easeOutC2 = Easing.out(Easing.cubic);
const num = (d: any, k: string, f: number) => (typeof d[k] === "number" && Number.isFinite(d[k]) ? d[k] : f);
const str = (d: any, k: string, f: string) => (typeof d[k] === "string" ? d[k] : f);
const bool = (d: any, k: string, f: boolean) => (typeof d[k] === "boolean" ? d[k] : f);

export default function HookReelLook({Source, data = {}}: Props) {
  const frame = useCurrentFrame();
  const W = num(data, "width", 1080);
  const H = num(data, "height", 1920);
  const fps = num(data, "fps", 30);
  const r = fps / 30;
  const F = (n: number) => Math.max(1, Math.round(n * r));
  // The camera plan arrives in this clip's own frames (a move that began in the previous shot has a
  // negative start, so it keeps running across the cut). The captions graphic evaluates the same plan.
  const segsAll: CamSeg[] = Array.isArray(data.camera) ? data.camera : [];
  // The reveal pan under an opening title is the cut-out set's own drop wherever the set plays.
  const setHere = data.cutout && typeof data.cutout.sprite === "string" && data.cutout.count > 0;
  const segs: CamSeg[] = setHere ? segsAll.filter((g) => !g.rv) : segsAll;
  const strength = Math.max(0, num(data, "cameraStrength", 1));
  // The picture sits at this zoom so a pan never reaches its edge. camAt clamps offsets to what it allows.
  const cover = Math.max(1, num(data, "cameraHeadroom", 1.18));
  const backdropFill = bool(data, "backdropFill", true);
  const uid = String(data.uid == null ? 0 : data.uid).replace(/[^a-zA-Z0-9_-]/g, "");
  // The effect's canvas is the draft frame, but the clip's own Transform scales everything the effect
  // draws and offsets it (a vertical reframe of a 16:9 source runs about 3.6x). Probed, not assumed.
  // So a pan has to be divided by that scale to move the picture by the distance the plan asked for, a
  // zoom has to happen about the point of the canvas the visible frame is actually centred on, and
  // anything drawn at a real size (the grid) has to be divided by it too.
  const tScale = Math.max(0.01, num(data, "clipScale", 1));
  const originX = num(data, "clipOriginX", 50);
  const originY = num(data, "clipOriginY", 50);
  // The canvas is the source band, so it does not have the frame's proportions: one percent of its width
  // and one percent of its height are worth different amounts of frame. Both ratios are measured from the
  // band and passed in; without them the width ratio (the clip's Transform scale) is used for both.
  const panDivX = Math.max(0.01, num(data, "panDivX", tScale));
  const panDivY = Math.max(0.01, num(data, "panDivY", tScale));
  // A zoom into the middle of a vertical frame lands on the chest. If the speaker was measured, aim at
  // the eyes instead: a frame point is offset from the frame centre by (f - 50)% of the frame, which is
  // (f - 50) / panDiv percent of this canvas.
  const faceX = num(data, "faceX", -1);
  const faceY = num(data, "faceY", -1);
  const zoomX = faceX >= 0 ? originX + (faceX - 50) / panDivX : originX;
  const zoomY = faceY >= 0 ? originY + (faceY - 50) / panDivY : originY;
  const cam = camAt(segs, frame, 0, strength, cover);

  // Motion blur: a pan streaks along its own axis, the zoom-through smears everything.
  const px = (cam.bx / 100) * W;
  const py = (cam.by / 100) * H;
  const streak = Math.max(px, py) * 0.42;
  const zoomBlur = cam.zb * (W / 1080);
  const fid = "hrcam" + uid;
  const parts: string[] = [];
  if (streak > 0.8) parts.push("url(#" + fid + ")");
  if (zoomBlur > 0.6) parts.push("blur(" + zoomBlur.toFixed(2) + "px)");
  const transform = "translate(" + (cam.tx / panDivX).toFixed(4) + "%, " + (cam.ty / panDivY).toFixed(4) + "%) scale(" + cam.S.toFixed(4) + ")";
  const originCss = zoomX.toFixed(3) + "% " + zoomY.toFixed(3) + "%";

  // ---- the set -------------------------------------------------------------------------------------
  // Under a hook the room is not dimmed, it is REMOVED: the speaker is cut out and stands on a dark
  // grainy grid while the title plays, drifting down and shrinking a little as it takes over, and the
  // room comes back when the title passes. B-roll stands on the same grid.
  // Ranges are [start, end, fadeIn, fadeOut, mode] in this clip's frames; mode 1 = cutout, 2 = card.
  const stages: number[][] = Array.isArray(data.stage) ? data.stage : [];
  let set = 0;
  let mode = 0;
  let setStart = 0;
  let setEnd = 0;
  for (const g of stages) {
    const fin = Math.max(1, g[2] || F(8));
    const fout = Math.max(1, g[3] || F(11));
    if (frame < g[0] - fin || frame > g[1] + fout) continue;
    const v = Math.min((frame - (g[0] - fin)) / fin, ((g[1] + fout) - frame) / fout, 1);
    if (v > set) { set = v; mode = g[4] || 1; setStart = g[0] - fin; setEnd = g[1]; }
  }
  // A range that begins while another is still up continues that set: the grid does not pull back again
  // and the cut-out does not drop again, so the set's clock starts at the earliest start of the chain.
  if (set > 0) {
    let chainStart = setStart;
    for (let pass = 0; pass < stages.length; pass += 1) {
      for (const g of stages) {
        const gs = g[0] - Math.max(1, g[2] || F(8));
        const ge = g[1] + Math.max(1, g[3] || F(11));
        if (gs < chainStart && ge >= chainStart) chainStart = gs;
      }
    }
    setStart = chainStart;
  }
  set = Math.max(0, Math.min(1, set));
  // A cutout stage needs its matte: without one the picture would simply cover the grid again, so that
  // range falls back to the untouched room (which is what happens when segmentation is unavailable).
  const hasCut = data.cutout && typeof data.cutout.sprite === "string" && data.cutout.count > 0;
  if (mode === 1 && !hasCut) { set = 0; mode = 0; }
  const gridOn = set > 0.002;
  // The cutout settles over about 24 frames, slower than the background swap, and eases in and out.
  const settle = easeIO(Math.max(0, Math.min(1, (frame - setStart) / F(24))));
  const hold = set >= 0.999 ? 1 : set;
  const cutScale = 1 + (num(data, "cutoutScale", 0.95) - 1) * settle * hold;
  const cutDy = num(data, "cutoutDrop", 19) * settle * hold;
  // The grid itself starts wide and pulls back to its resting pitch.
  // A cell is a share of the canvas, chosen so it lands at the asked-for share of the FRAME on both axes.
  const pitchPct = num(data, "gridPitch", 10.2);
  const cellX = pitchPct / panDivX;
  const cellY = (pitchPct * W) / (H * panDivY);
  const linePct = Math.max(0.6, Math.min(12, (2 * (W / 1080) * 100) / ((pitchPct / 100) * W)));
  const gridZoom = interpolate(frame - setStart, [0, F(46)], [1.32, 1], {...CLAMP, easing: easeOutC2});
  const gridColor = str(data, "gridColor", "rgba(170,178,172,0.62)");
  const gridTint = str(data, "gridTint", "rgba(79,180,200,0.42)");
  const setColor = str(data, "setColor", "#2b2624");
  const lines = (c: string) => "linear-gradient(to right, " + c + " 0 " + linePct.toFixed(2) + "%, transparent " + linePct.toFixed(2) + "% 100%), linear-gradient(to bottom, " + c + " 0 " + linePct.toFixed(2) + "%, transparent " + linePct.toFixed(2) + "% 100%)";
  const cellCss = cellX.toFixed(4) + "% " + cellY.toFixed(4) + "%";

  // ---- the cutout matte ----------------------------------------------------------------------------
  // Tiles were rendered from the finished frame, so they live in the visible frame's rectangle, which is
  // a sub-rectangle of this canvas: frameW/tScale wide, centred on the origin point computed above.
  const cut: any = data.cutout && typeof data.cutout.sprite === "string" && data.cutout.count > 0 ? data.cutout : null;
  let maskStyle: any = {};
  if (cut && gridOn && mode === 1) {
    const idx = Math.max(0, Math.min(cut.count - 1, Math.round((frame - cut.start) / Math.max(1, cut.step))));
    const col = idx % cut.cols;
    const row = Math.floor(idx / cut.cols);
    // Probed: this effect's canvas is the SOURCE BAND - a magenta border drawn on the root wraps the
    // picture itself, not the frame - and the clip's Transform then scales that band into the frame.
    // So a tile that is one canvas maps 1:1, and sizing the sprite in percentages of the element means
    // the canvas's pixel size never has to be known here.
    const url = "url(" + cut.sprite + ")";
    const size = (cut.cols * 100) + "% " + (cut.rows * 100) + "%";
    const px = cut.cols > 1 ? (col / (cut.cols - 1)) * 100 : 0;
    const py = cut.rows > 1 ? (row / (cut.rows - 1)) * 100 : 0;
    const pos = px.toFixed(4) + "% " + py.toFixed(4) + "%";
    maskStyle = {maskImage: url, WebkitMaskImage: url, maskSize: size, WebkitMaskSize: size, maskPosition: pos, WebkitMaskPosition: pos, maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskMode: "luminance"};
  }
  const cutTransform = "translate(0%, " + (cutDy / panDivY).toFixed(4) + "%) scale(" + cutScale.toFixed(4) + ")";

  // ---- B-roll as a card on the set -----------------------------------------------------------------
  // The reference never puts B-roll full frame: it is a rounded card standing on the same grid, arriving
  // a little large and settling, pushing in slowly while it holds, and sliding off to one side at the cut.
  // A vertical clip takes 66% of the width with its top at 7% of the height; a landscape one is 28% of the
  // height, tilted three degrees, centred at 37%.
  const srcAspect = num(data, "sourceAspect", 0);
  let cardStyle: any = null;
  let cardInner: any = null;
  let cardClip = "";
  if (gridOn && mode === 2 && srcAspect > 0.05) {
    // This canvas IS the clip's picture - the bars are not part of it - so the card needs no insets,
    // only rounding. The band is shown "contained" in the frame, so it is this wide in frame pixels:
    const bandW = Math.min(W, H * srcAspect);
    const bandH = bandW / srcAspect;
    const vertical = srcAspect < 1;
    const cardW = vertical ? 0.66 * W : Math.min(1.2 * W, 0.28 * H * srcAspect);
    const cardH = cardW / srcAspect;
    const cardCy = vertical ? 0.07 * H + cardH / 2 : 0.37 * H;
    // The clip carries a cover Transform (tScale) so its canvas reaches the frame's edges; everything drawn
    // here is scaled by it, so the card's size, offsets and rounding divide it back out.
    const k = cardW / Math.max(1, bandW) / tScale;
    const t = frame - setStart;
    const arrive = interpolate(t, [0, F(22)], [1.25, 1], {...CLAMP, easing: easeOutC2});
    const push = 1 + 0.1 * Math.max(0, Math.min(1, t / Math.max(1, F(48))));
    const leave = interpolate(frame, [setEnd - F(8), setEnd], [0, 1.25 * W], {...CLAMP, easing: Easing.in(Easing.cubic)});
    const dx = leave / tScale;
    const dy = (cardCy - H / 2) / tScale;
    // The card's own edges hold still; the push-in happens to the picture INSIDE it, which is what the
    // reference does. Growing the whole card instead makes the frame creep and reads as a zoom.
    const radius = (0.035 * cardW) / Math.max(0.01, k * arrive * tScale);
    cardClip = "inset(0px round " + radius.toFixed(1) + "px)";
    cardStyle = {
      transform: "translate(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px) rotate(" + (vertical ? 0 : -3) + "deg) scale(" + (k * arrive).toFixed(4) + ")",
      clipPath: cardClip,
      WebkitClipPath: cardClip,
    };
    cardInner = {transform: "scale(" + push.toFixed(4) + ")"};
  }

  return (
    <AbsoluteFill style={{backgroundColor: "#000", overflow: "hidden"}}>
      <svg width="0" height="0" style={{position: "absolute"}}>
        <defs>
          <filter id={fid} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={px >= py ? streak.toFixed(2) + " 0" : "0 " + streak.toFixed(2)} />
          </filter>
          <filter id={"grain" + uid} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="1" seed="7" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>
      {backdropFill && !gridOn && (
        <AbsoluteFill style={{transform: "scale(4)", filter: "blur(24px) brightness(0.4) saturate(1.3)"}}>
          <Source />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{transform, transformOrigin: originCss, filter: parts.length ? parts.join(" ") : "none"}}>
        <Source />
      </AbsoluteFill>
      {gridOn && (
        <AbsoluteFill style={{opacity: set}}>
          <AbsoluteFill style={{backgroundColor: setColor}} />
          <AbsoluteFill style={{filter: "url(#grain" + uid + ")", opacity: 0.16, mixBlendMode: "overlay"}} />
          <AbsoluteFill style={{transform: "scale(" + gridZoom.toFixed(4) + ")", transformOrigin: originCss}}>
            <AbsoluteFill style={{backgroundImage: lines(gridTint), backgroundSize: cellCss, backgroundPosition: (linePct * 1.6).toFixed(2) + "% " + (linePct * 1.6).toFixed(2) + "%"}} />
            <AbsoluteFill style={{backgroundImage: lines(gridColor), backgroundSize: cellCss}} />
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {gridOn && cardStyle && (
        <AbsoluteFill style={{opacity: set}}>
          <AbsoluteFill style={cardStyle}>
            <AbsoluteFill style={cardInner || undefined}>
              <Source />
            </AbsoluteFill>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {gridOn && mode === 1 && (
        <AbsoluteFill style={{opacity: set, transform, transformOrigin: originCss}}>
          <AbsoluteFill style={{transform: cutTransform, transformOrigin: originCss, ...maskStyle}}>
            <Source />
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
`;

// ---------------------------------------------------------------------------
// Sound effects: one synthesized WAV covering the whole reel (pops, whooshes,
// impacts, risers). Plain Node, no dependencies, arguments are JSON files.
// ---------------------------------------------------------------------------
const SFX_GENERATOR = `const fs = require("fs");
const {execFileSync} = require("child_process");
const [cfgPath, outPath] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const sr = cfg.sampleRate || 44100;
const total = Math.ceil((cfg.seconds + 2.5) * sr);
const L = new Float32Array(total), R = new Float32Array(total), SL = new Float32Array(total), SR = new Float32Array(total);
let seed = 20240921;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function svf(q) { return {low: 0, band: 0, q, step(x, fc) { const f = 2 * Math.sin(Math.PI * clamp(fc, 20, sr * 0.45) / sr); this.low += f * this.band; const high = x - this.low - this.q * this.band; this.band += f * high; return this; }}; }
function place(t, seconds, pan, send, fn) {
  const start = Math.round(t * sr); const len = Math.floor(seconds * sr);
  for (let i = 0; i < len; i += 1) {
    const idx = start + i; if (idx < 0 || idx >= total) continue;
    const u = i / len; const v = fn(i / sr, u); const p = typeof pan === "function" ? pan(u) : pan;
    const gl = Math.cos((p + 1) * Math.PI / 4), gr = Math.sin((p + 1) * Math.PI / 4);
    L[idx] += v * gl; R[idx] += v * gr; SL[idx] += v * gl * send; SR[idx] += v * gr * send;
  }
}
// Cinematic hit: pitched sub drop with a long tail, low rumble body, short knock transient, air burst, heavy reverb send.
function impact(t, g, tail) {
  let ph = 0; const body = svf(0.7), knock = svf(0.9); const T = tail || 2.2;
  place(t, T, 0, 0.5, (x, u) => {
    const fr = 36 + 75 * Math.exp(-x * 8); ph += 2 * Math.PI * fr / sr;
    const sub = Math.tanh(Math.sin(ph) * 1.7) * Math.exp(-x * 4.84 / T);
    const bd = body.step(rnd(), 160).low * Math.exp(-x * 7) * 2.2;
    const kn = x < 0.035 ? knock.step(rnd(), 1300).band * Math.exp(-x * 80) * 1.3 : 0;
    const air = x < 0.15 ? rnd() * Math.exp(-x * 35) * 0.1 : 0;
    return (sub * 0.9 + bd * 0.6 + kn * 0.5 + air) * g * 0.62;
  });
}
// Doppler whoosh: two band-passed noise layers sweeping up, swelling into the landing time, auto-panned across the stereo field.
function whoosh(t, g, seconds, dir) {
  const d = seconds || 0.55; const f1 = svf(0.55), f2 = svf(0.6); let air = 0;
  const start = dir < 0 ? t : t - d; const len = d + 0.3;
  place(start, len, (u) => (dir < 0 ? 0.7 : -0.7) * Math.cos(Math.PI * clamp(u * len / d, 0, 1)), 0.4, (x, u) => {
    const p = clamp(x / d, 0, 1); const s = dir < 0 ? 1 - p : p;
    const fc = 180 + 5400 * Math.pow(s, 2.2);
    const env = dir < 0 ? (x <= d ? Math.pow(1 - p, 1.5) : 0) : (x <= d ? Math.pow(p, 2.6) : Math.exp(-(x - d) * 16));
    air = 0.975 * air + 0.025 * rnd();
    const a = f1.step(rnd(), fc).band * 1.5; const b = f2.step(rnd(), fc * 0.45).band * 0.9;
    return (a + b + air * 0.35) * env * g * 0.6;
  });
}
// Tension riser: rising filtered noise plus a detuned tone cluster with accelerating tremolo, ending at the landing time.
function riser(t, g, seconds) {
  const d = seconds || 1.2; const f = svf(0.5); let p1 = 0, p2 = 0, p3 = 0;
  place(t - d, d, 0, 0.45, (x, u) => {
    const p = clamp(x / d, 0, 1);
    const noise = f.step(rnd(), 140 + 6500 * Math.pow(p, 2.6)).band * 1.4;
    const base = 52 * Math.pow(2, p * 1.6);
    p1 += 2 * Math.PI * base / sr; p2 += 2 * Math.PI * base * 1.498 / sr; p3 += 2 * Math.PI * base * 2.007 / sr;
    const tone = Math.tanh((Math.sin(p1) + 0.6 * Math.sin(p2) + 0.4 * Math.sin(p3)) * 0.9);
    const trem = 0.65 + 0.35 * Math.sin(2 * Math.PI * (2 + 16 * p * p) * x);
    return (noise * 0.7 + tone * 0.5 * trem) * Math.pow(p, 2.3) * g * 0.5;
  });
}
function tick(t, g) {
  const f = svf(0.8); let ph = 0;
  place(t, 0.09, 0.15 * rnd(), 0.3, (x, u) => { ph += 2 * Math.PI * 2300 / sr; return (f.step(rnd(), 3200).band * Math.exp(-x * 110) * 1.6 + Math.sin(ph) * Math.exp(-x * 240) * 0.5) * g * 0.4; });
}
// Real samples from the user's library, decoded through ffmpeg. Hits align by onset; whooshes and risers land their loudest moment on the word.
const cache = new Map();
function loadSample(path) {
  if (cache.has(path)) return cache.get(path);
  const raw = execFileSync(cfg.ffmpeg || "ffmpeg", ["-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", String(sr), "-t", "12", "-"], {maxBuffer: 1 << 28});
  const pcm = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
  const frames = Math.floor(pcm.length / 2); let peak = 0, peakAt = 0, onset = 0;
  for (let i = 0; i < frames; i += 1) { const v = Math.abs(pcm[2 * i]) + Math.abs(pcm[2 * i + 1]); if (v > peak) { peak = v; peakAt = i; } }
  for (let i = 0; i < frames; i += 1) { const v = Math.abs(pcm[2 * i]) + Math.abs(pcm[2 * i + 1]); if (v > peak * 0.12) { onset = i; break; } }
  const s = {pcm, frames, peakAt, onset, norm: peak > 0 ? 1.4 / peak : 1};
  cache.set(path, s); return s;
}
// Window each sample around its onset (hits, ticks) or its loudest moment (whooshes, risers) with fades, so long library files behave like one-shots.
function playSample(path, t, g, send, alignPeak, before, after) {
  const s = loadSample(path); const anchor = alignPeak ? s.peakAt : s.onset;
  const from = Math.max(0, anchor - Math.round(before * sr)); const to = Math.min(s.frames, anchor + Math.round(after * sr));
  const fadeIn = Math.min(Math.round(0.02 * sr), Math.max(1, anchor - from)); const fadeOut = Math.round(Math.min(0.4, after * 0.35) * sr);
  const start = Math.round(t * sr) - anchor;
  for (let i = from; i < to; i += 1) {
    const idx = start + i; if (idx < 0 || idx >= total) continue;
    let env = 1; if (i - from < fadeIn) env = (i - from) / fadeIn; if (to - i < fadeOut) env = Math.min(env, (to - i) / fadeOut);
    const l = s.pcm[2 * i] * s.norm * g * env, r = s.pcm[2 * i + 1] * s.norm * g * env;
    L[idx] += l; R[idx] += r; SL[idx] += l * send; SR[idx] += r * send;
  }
}
const lib = cfg.samples || {}; const counters = {};
function pick(kind) { const list = lib[kind]; if (!list || !list.length) return null; counters[kind] = (counters[kind] || 0) + 1; return list[(counters[kind] - 1) % list.length]; }
for (const e of cfg.events) {
  const g = typeof e.gain === "number" ? e.gain : 1;
  const kind = e.kind === "pop" ? "tick" : e.kind;
  const sample = pick(kind);
  if (sample && kind === "impact") playSample(sample, e.t, g * 0.8, 0.25, false, 0.005, e.tail || 2.6);
  else if (sample && kind === "whoosh") playSample(sample, e.t, g * 0.7, 0.2, (e.dir || 1) > 0, (e.dir || 1) > 0 ? (e.seconds || 0.55) + 0.15 : 0.02, (e.dir || 1) > 0 ? 0.5 : (e.seconds || 0.4) + 0.3);
  else if (sample && kind === "riser") playSample(sample, e.t, g * 0.7, 0.2, true, e.seconds || 1.2, 0.35);
  else if (sample && kind === "tick") playSample(sample, e.t, g * 0.6, 0.1, false, 0.005, 0.3);
  else if (kind === "impact") impact(e.t, g, e.tail);
  else if (kind === "whoosh") whoosh(e.t, g, e.seconds, e.dir || 1);
  else if (kind === "riser") riser(e.t, g, e.seconds);
  else if (kind === "tick") tick(e.t, g);
}
// Reverb bus (Freeverb-style comb + allpass network, 23-sample stereo spread) for the tails.
function reverb(inL, inR, wet, room, damp) {
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], apT = [556, 441, 341, 225], k = sr / 44100;
  const mk = (off) => ({combs: combT.map((n) => ({buf: new Float32Array(Math.round((n + off) * k)), i: 0, f: 0})), aps: apT.map((n) => ({buf: new Float32Array(Math.round((n + off) * k)), i: 0}))});
  const ch = [mk(0), mk(23)];
  for (let n = 0; n < total; n += 1) {
    const x = (inL[n] + inR[n]) * 0.5;
    for (let c = 0; c < 2; c += 1) {
      let acc = 0;
      for (const cb of ch[c].combs) { const y = cb.buf[cb.i]; cb.f = y * (1 - damp) + cb.f * damp; cb.buf[cb.i] = x + cb.f * room; cb.i = (cb.i + 1) % cb.buf.length; acc += y; }
      let y = acc * 0.125;
      for (const ap of ch[c].aps) { const b = ap.buf[ap.i]; const o = b - y; ap.buf[ap.i] = y + b * 0.5; ap.i = (ap.i + 1) % ap.buf.length; y = o; }
      if (c === 0) L[n] += y * wet; else R[n] += y * wet;
    }
  }
}
reverb(SL, SR, 0.9, 0.86, 0.35);
let peak = 0; for (let i = 0; i < total; i += 1) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = (peak > 0 ? 0.92 / peak : 1) * (cfg.gain || 1);
const out = Buffer.alloc(44 + total * 4);
out.write("RIFF", 0); out.writeUInt32LE(36 + total * 4, 4); out.write("WAVE", 8); out.write("fmt ", 12);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(sr, 24); out.writeUInt32LE(sr * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(total * 4, 40);
for (let i = 0; i < total; i += 1) { out.writeInt16LE(Math.round(Math.tanh(L[i] * norm) * 32767), 44 + i * 4); out.writeInt16LE(Math.round(Math.tanh(R[i] * norm) * 32767), 46 + i * 4); }
fs.writeFileSync(outPath, out);
console.log(JSON.stringify({seconds: total / sr, events: cfg.events.length, peak, sampled: counters}));
`;

// ---------------------------------------------------------------------------
// Planner: runs INSIDE run_script (never in the panel) so the committing call
// recomputes every range from the live Draft. Plain ES2022, no template literals.
// ---------------------------------------------------------------------------
const PLANNER = `
function norm(s) { return String(s || "").toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, ""); }
function parsePhrases(text) {
  const out = [];
  for (const raw of String(text || "").split(/\\n|;/)) {
    let line = raw.trim(); if (!line || line.startsWith("#")) continue;
    let style = "punch";
    const m = /^(hook|punch|stack|broll|b-roll)\\s*:\\s*/i.exec(line);
    if (m) { style = m[1].toLowerCase().replace("-", ""); line = line.slice(m[0].length); }
    const parts = line.split("|");
    if (style === "broll") {
      const phrase = parts[0].trim(); const file = parts.length > 1 ? parts.slice(1).join("|").trim() : "";
      if (phrase) out.push({style, lead: "", key: phrase, file, source: raw.trim()});
      continue;
    }
    const lead = parts.length > 1 ? parts[0].trim() : "";
    const key = (parts.length > 1 ? parts.slice(1).join(" ") : parts[0]).trim();
    if (!key) continue;
    out.push({style, lead, key, source: raw.trim()});
  }
  return out;
}
function findSeq(tokens, seq, from) {
  if (!seq.length) return -1;
  for (let i = from; i + seq.length <= tokens.length; i += 1) {
    let ok = true;
    for (let j = 0; j < seq.length; j += 1) { if (tokens[i + j] !== seq[j]) { ok = false; break; } }
    if (ok) return i;
  }
  return -1;
}
// The camera. Almost every "text animation" in the reference is a camera move with the text pinned to the
// picture, so the plan is built here once and handed to both the look effect and the captions graphic.
// Amplitudes are measured from the reference (18.6% of the height for the opening reveal pan, 46% of the
// width for the whip, 1.45x for the title push-in, 1.15x of picture under a 1.62x blow-out of text) and
// capped to whatever the chosen headroom can pan without reaching the edge of the picture.
function buildCamera(heroes, brolls, mainClips, fps, opt) {
  const F = (n) => Math.max(1, Math.round((n * fps) / 30));
  const segs = [];
  const shots = mainClips.slice().sort((a, b) => a.startFrame - b.startFrame);
  const shotAt = (f) => { let out = shots[0] || { startFrame: 0, endFrame: 0 }; for (const c of shots) if (c.startFrame <= f) out = c; return out; };
  // A pan is clamped to what the headroom zoom allows either side of centre, so a one-way move from the
  // centre can only use half of it. Every pan is therefore set up on the opposite side first (a d=1
  // segment that just offsets the frame) and then travels the whole width of the available range.
  // The reference pans further than this (46% of the width in its whip) because its source is a wide shot
  // with pixels to spare; inside an effect the picture is already cropped to the frame, so the headroom
  // zoom is the only room there is. Raise it for bigger moves at the cost of a tighter crop.
  const half = Math.max(2, (Number(opt.cameraHeadroom || 1.18) - 1) * 47.5);
  const preset = (at, dx = 0, dy = 0, z = 1) => segs.push({ k: "pan", at, d: 0, dx, dy, z });
  // Every shot breathes: a slow push-in, then a slow pull-out on the next one.
  shots.forEach((c, i) => {
    const d = Math.max(1, c.endFrame - c.startFrame);
    if (i % 2 === 0) segs.push({ k: "drift", at: c.startFrame, d, z: 1.04 });
    else { preset(c.startFrame, 0, 0, 1.04); segs.push({ k: "drift", at: c.startFrame, d, z: 1 / 1.04 }); }
  });
  const sorted = heroes.slice().sort((a, b) => a.start - b.start);
  for (let i = 0; i < sorted.length; i += 1) {
    const h = sorted[i];
    const shot = shotAt(h.start);
    const next = sorted[i + 1] || null;
    const block = [];
    const add = (g) => { block.push(g); segs.push(g); };
    if (h.style === "hook") {
      // A title that opens its shot gets the reveal pan that makes headroom for it.
      if (h.start - shot.startFrame <= F(30)) {
        // Starts with the head run up against the top edge and pans the picture DOWN to neutral - the
        // reference's head drops in from above the frame. It has to END at neutral: a standing offset
        // would sit on the clamp for the rest of the shot and jump the moment a pull reduced the zoom.
        // When the cut-out set plays under this title its own drop IS this gesture, so the effect and the
        // graphic leave these two segments out there (rv + the hook's id).
        const dy = Math.min(9.3, half * 0.95);
        segs.push({ k: "pan", at: shot.startFrame, d: 0, dx: 0, dy: -dy, z: 1, rv: true, hid: h.id });
        segs.push({ k: "reveal", at: shot.startFrame, d: F(21), dy, rv: true, hid: h.id });
      }
      // The push-in IS the title's exit: it drives the card off the top and keeps going.
      const pushAt = typeof h.exitAt === "number" ? h.exitAt : Math.max(h.keyEnd, h.end - F(12));
      // One long push that carries the title off, then the block correction eases it back. A push
      // followed by an explicit pull reads as a bounce.
      add({ k: "push", at: pushAt, d: F(56), z: 1.24 });
    } else if (h.style === "stack") {
      // The frame drifts to one side while the block builds, then the whip throws it the whole way across;
      // the camera comes back and pushes in as the block leaves.
      const dx = Math.min(23, half);
      segs.push({ k: "pan", at: Math.max(shot.startFrame, h.start - F(20)), d: F(20), dx });
      segs.push({ k: "whip", at: h.slideStart, d: F(9), dx: -2 * dx });
      const back = Math.max(h.slideStart + F(10), h.end - F(34));
      add({ k: "pan", at: back, d: F(34), dx });
    } else {
      add({ k: "push", at: Math.max(shot.startFrame, h.keyStart - F(26)), d: F(26), z: 1.09 });
      // The blow-out is the measured one and it stays where it lands, as in the reference.
      add({ k: "blow", at: h.blowAt, d: F(10), z: 1.15, tg: 1.0 });
    }
    // Close the loop. Without this every hero's push multiplies into the next and the shot ends up
    // cropped to nothing; the reference always comes back to its framing between moves.
    let netZ = 1;
    let endsAt = h.start;
    for (const g of block) { if (typeof g.z === "number") netZ *= g.z; endsAt = Math.max(endsAt, g.at + g.d); }
    if (Math.abs(netZ - 1) > 0.01) {
      // Always after the block it unwinds. Scheduling it earlier (to fit before the next hero) used to put
      // the correction in front of its own move and flatten the camera to nothing.
      const room = Math.max(F(34), Math.min(F(52), (next ? next.start : shot.endFrame) - endsAt));
      if (endsAt < shot.endFrame) segs.push({ k: "settle", at: endsAt, d: room, z: 1 / netZ });
    }
  }
  segs.sort((a, b) => a.at - b.at || a.d - b.d);
  return segs;
}
function hash(s) { let h = 5381; for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(16); }
function buildPlan(rows, phraseText, opt, fps, mainClips) {
  const words = rows.filter((w) => w[0] && norm(w[0]).length > 0 && w[2] > w[1]);
  const tokens = words.map((w) => norm(w[0]));
  const holdFrames = Math.round(opt.holdSeconds * fps);
  const F = (n) => Math.max(1, Math.round(n * fps / 30));
  const heroes = []; const brolls = []; const unmatched = []; let cursor = 0; let id = 0; let brollId = 0;
  for (const p of parsePhrases(phraseText)) {
    const leadSeq = p.lead.split(/\\s+/).map(norm).filter(Boolean);
    const keySeq = p.key.split(/\\s+/).map(norm).filter(Boolean);
    let at = findSeq(tokens, leadSeq.concat(keySeq), cursor);
    let leadCount = leadSeq.length;
    if (at < 0) { at = findSeq(tokens, keySeq, cursor); leadCount = 0; }
    if (at < 0) { at = findSeq(tokens, leadSeq.concat(keySeq), 0); leadCount = leadSeq.length; }
    if (at < 0) { at = findSeq(tokens, keySeq, 0); leadCount = 0; }
    if (at < 0) { unmatched.push(p.source); continue; }
    const lead = words.slice(at, at + leadCount);
    const key = words.slice(at + leadCount, at + leadCount + keySeq.length);
    if (p.style === "broll") {
      // B-roll covers the phrase, starting a beat before its first word and holding a little after its last.
      const start = Math.max(0, key[0][1] - F(6));
      const end = key[key.length - 1][2] + F(10);
      brolls.push({id: brollId++, start, end, file: p.file, text: p.source});
      continue;
    }
    const start = (lead[0] || key[0])[1];
    const keyStart = key[0][1]; const keyEnd = key[key.length - 1][2];
    const lastIdx = at + leadCount + keySeq.length - 1;
    // Every move is cued by speech: the word after the key word, and the word after that.
    const nextWord = words[lastIdx + 1] || null;
    const nextNext = words[lastIdx + 2] || null;
    const cue1 = nextWord ? nextWord[1] : keyEnd + F(8);
    const cue2 = nextNext ? nextNext[1] : cue1 + F(12);
    // hook: title stays until the sentence after it is under way (2nd following word, at least 1.2 s after the key).
    // punch: zoom until the next word, blow out on it, hold to a cut or its end.
    // stack: slide behind the speaker on the next word, park until the 2nd following word plus a second.
    let end = keyEnd + holdFrames;
    if (p.style === "hook") end = Math.max(cue2, keyEnd + Math.round(1.2 * fps));
    // A title never survives a shot change: clamp to the first Main clip boundary after the key word.
    const shotEnd = mainClips.map((c) => c.endFrame).filter((e) => e > keyStart).sort((a, b) => a - b)[0];
    if (p.style === "hook" && shotEnd != null) end = Math.min(end, shotEnd);
    if (p.style === "punch") end = Math.max(cue1 + F(9) + Math.round(1.4 * fps), keyEnd + Math.round(1.8 * fps));
    if (p.style === "stack") end = Math.max(cue2 + Math.round(1.0 * fps), keyEnd + Math.round(1.4 * fps));
    if (heroes.length && start < heroes[heroes.length - 1].end) heroes[heroes.length - 1].end = Math.max(heroes[heroes.length - 1].keyEnd + 2, start - 1);
    heroes.push({id: id++, style: p.style, lead, key, start, keyStart, keyEnd, end, text: p.source, slideStart: p.style === "stack" ? Math.max(cue1, keyEnd + Math.round(0.3 * fps)) : keyEnd + Math.round(0.3 * fps), blowAt: cue1, exitAt: cue2});
    cursor = at + leadCount + keySeq.length;
  }
  heroes.sort((a, b) => a.start - b.start);
  brolls.sort((a, b) => a.start - b.start);
  const endFrame = mainClips.reduce((m, c) => Math.max(m, c.endFrame), 0);
  // Title cards. The first one opens the video: it comes up at the start of the first
  // shot whenever its words are spoken, its words rise in one after another, and it holds as long as the
  // reference's title (whose push-in exit starts 3.8 s in), longer if its words are still being spoken then
  // (6 s at most). Every other title holds at least 1.5 s after its last word lands - leaving on the very
  // next word made titles flash by. A title never survives a shot change and ends where the next card starts.
  const shotEndAfter = (f) => mainClips.map((c) => c.endFrame).filter((e) => e > f).sort((a, b) => a - b)[0];
  const openShot = mainClips.slice().sort((a, b) => a.startFrame - b.startFrame)[0];
  const opener = heroes.slice().sort((a, b) => a.start - b.start).find((h) => h.style === "hook");
  for (const h of heroes) {
    if (h.style !== "hook") continue;
    if (h === opener && openShot) {
      h.open = true;
      h.start = openShot.startFrame;
      h.exitAt = Math.max(h.start + Math.round(3.8 * fps), Math.min(h.keyEnd + Math.round(0.5 * fps), h.start + Math.round(6 * fps)));
    } else {
      h.exitAt = Math.max(h.exitAt, h.keyEnd + Math.round(1.5 * fps));
    }
    h.end = Math.max(h.end, h.exitAt + F(18));
    const limit = Math.min(shotEndAfter(h.start) ?? Infinity, ...heroes.filter((o) => o !== h && o.start > h.start).map((o) => o.start));
    if (h.end > limit) h.end = limit;
  }
  heroes.sort((a, b) => a.start - b.start);
  for (const h of heroes) {
    h.end = Math.min(h.end, endFrame);
    // A card whose end was pulled in by the next hook would otherwise slide (and whip) after it has gone.
    const room = h.style === "stack" ? F(10) : F(4);
    h.slideStart = Math.min(h.slideStart, Math.max(h.keyEnd + 1, h.end - room));
    if (h.style === "punch") h.blowAt = Math.min(h.blowAt, Math.max(h.keyEnd + 1, h.end - F(12)));
    if (h.style === "hook") h.exitAt = Math.min(h.exitAt, Math.max((h.open ? h.start : h.keyEnd) + 1, h.end - F(6)));
  }
  // Title cards win over B-roll: a B-roll span that would begin while a title is up starts once the title has
  // gone instead, keeping its length (it used to take the set over halfway through the title). If too little
  // of it is left before the next B-roll or the end, it is dropped. Either way the panel says so.
  const notes = [];
  const brollLabel = (b) => String(b.text || "").split("|")[0].replace("broll:", "").trim().slice(0, 48);
  for (const b of brolls) {
    for (const h of heroes) {
      if (h.style !== "hook" || b.end <= h.start || b.start >= h.end) continue;
      const len = b.end - b.start;
      b.start = h.end;
      b.end = h.end + len;
      b.moved = true;
    }
  }
  brolls.sort((a, b) => a.start - b.start);
  for (let i = 0; i < brolls.length; i += 1) { brolls[i].end = Math.min(brolls[i].end, endFrame, i + 1 < brolls.length ? brolls[i + 1].start : Infinity); }
  for (let i = brolls.length - 1; i >= 0; i -= 1) {
    if (brolls[i].end - brolls[i].start < Math.round(0.8 * fps)) { notes.push('B-roll "' + brollLabel(brolls[i]) + '" was dropped: no room left after the title card.'); brolls.splice(i, 1); }
    else if (brolls[i].moved) notes.push('B-roll "' + brollLabel(brolls[i]) + '" now starts after the title card.');
  }
  brolls.forEach((b, i) => { b.id = i; });
  const cuts = []; const shotCuts = [];
  {
    const sorted = mainClips.slice().sort((a, b) => a.startFrame - b.startFrame);
    for (let i = 1; i < sorted.length; i += 1) if (sorted[i].startFrame === sorted[i - 1].endFrame) shotCuts.push(sorted[i].startFrame);
  }
  if (opt.flashOnCuts) for (const c of shotCuts) cuts.push(c);
  // Every B-roll entry is a flashed cut, the reference's signature move.
  for (const b of brolls) if (!cuts.includes(b.start)) cuts.push(b.start);
  cuts.sort((a, b) => a - b);
  const punches = heroes.map((h) => ({at: h.keyStart, hold: Math.min(h.end - h.keyStart, Math.round(fps * 1.2))}));
  const inPunchCard = (f) => heroes.some((h) => h.style !== "hook" && f >= h.start && f < h.end);
  const events = [];
  const slowFrames = F(18), blowFrames = F(9);
  if (opt.popEveryWord) for (const w of words) if (!inPunchCard(w[1])) events.push({t: w[1] / fps, kind: "tick", gain: 0.35});
  // When each word is SHOWN: as spoken, except the opening title's, which rise in one after another.
  const shownAt = (h, part, i) => h.open ? h.start + F(2) + (part === "lead" ? i * F(3) : h.lead.length * F(3) + F(3) + i * F(5)) : (part === "lead" ? h.lead[i][1] : h.key[i][1]);
  for (const h of heroes) {
    h.lead.forEach((w, i) => events.push({t: shownAt(h, "lead", i) / fps, kind: "tick", gain: 0.5}));
    if (h.style === "punch") {
      events.push({t: Math.max(0, h.keyStart / fps - 0.04), kind: "riser", gain: 0.75, seconds: 0.9});
      events.push({t: h.keyStart / fps, kind: "impact", gain: 1});
      for (const k of h.key.slice(1)) events.push({t: k[1] / fps, kind: "impact", gain: 0.6});
      events.push({t: Math.max(0, h.blowAt / fps - 0.12), kind: "whoosh", gain: 0.8, seconds: 0.3, dir: 1});
      events.push({t: (h.blowAt + blowFrames) / fps, kind: "impact", gain: 0.5});
    } else if (h.style === "stack") {
      events.push({t: h.keyStart / fps, kind: "whoosh", gain: 0.9, seconds: 0.55, dir: 1});
      events.push({t: h.keyStart / fps, kind: "impact", gain: 0.7});
      for (const k of h.key.slice(1)) { events.push({t: k[1] / fps, kind: "whoosh", gain: 0.5, seconds: 0.35, dir: 1}); events.push({t: k[1] / fps, kind: "tick", gain: 0.5}); }
      events.push({t: (h.key[h.key.length - 1][1] + 5) / fps, kind: "tick", gain: 0.4});
      events.push({t: h.slideStart / fps, kind: "whoosh", gain: 0.6, seconds: 0.27, dir: 1});
    } else {
      events.push({t: shownAt(h, "key", 0) / fps, kind: "whoosh", gain: 0.8, seconds: 0.55, dir: 1});
      events.push({t: shownAt(h, "key", 0) / fps, kind: "impact", gain: 0.55});
      h.key.slice(1).forEach((k, i) => { const at = shownAt(h, "key", i + 1); events.push({t: at / fps, kind: "whoosh", gain: 0.5, seconds: 0.35, dir: 1}); events.push({t: at / fps, kind: "tick", gain: 0.5}); });
      events.push({t: Math.max(0, (h.end - 9) / fps), kind: "whoosh", gain: 0.45, seconds: 0.3, dir: -1});
    }
  }
  for (const c of cuts) { events.push({t: Math.max(0, c / fps - 0.04), kind: "riser", gain: 0.85, seconds: 1.2}); events.push({t: c / fps, kind: "impact", gain: 0.9, tail: 3.6}); }
  events.sort((a, b) => a.t - b.t);
  const camera = buildCamera(heroes, brolls, mainClips, fps, opt);
  const shots = mainClips.slice().sort((a, b) => a.startFrame - b.startFrame).map((c) => c.startFrame);
  // Backdrop mode: [start, end, fadeIn, fadeOut] per hook and per B-roll span, measured at 8 f in and
  // 11 f (hook) or 22 f (B-roll return) out.
  const backdrop = heroes.filter((h) => h.style === "hook").map((h) => [Math.max(0, h.start - F(8)), h.end, F(8), F(11)])
    .concat(brolls.map((b) => [b.start, b.end, F(6), F(22)]));
  // [start, end, fadeIn, fadeOut, mode]: 1 = the speaker is cut out onto the grid, 2 = B-roll on the grid.
  const stage = heroes.filter((h) => h.style === "hook").map((h) => [Math.max(0, h.start - F(8)), h.end, F(8), F(20), 1])
    .concat(brolls.map((b) => [b.start, b.end, F(4), F(10), 2]));
  const fingerprint = hash(JSON.stringify([words.length, endFrame, opt.cameraHeadroom, opt.cameraStrength, heroes.map((h) => [h.style, h.start, h.keyStart, h.keyEnd, h.end]), brolls.map((b) => [b.start, b.end, b.file]), cuts, opt.popEveryWord, opt.holdSeconds]));
  return {words, heroes, brolls, cuts, shotCuts, punches, events, endFrame, unmatched, notes, fingerprint, camera, shots, backdrop, stage, transcript: words.map((w) => w[0]).join(" ")};
}
`;

const CAPTION_PARAMETERS = [
  { key: "accent", label: "Accent color", type: "color", defaultValue: DEFAULTS.accent },
  { key: "heroSqueeze", label: "Key word squeeze", type: "number", min: 0.6, max: 2, step: 0.05, defaultValue: DEFAULTS.heroSqueeze },
  { key: "fontFamily", label: "Caption font", type: "text", defaultValue: "" },
  { key: "heroFontFamily", label: "Hero font", type: "text", defaultValue: "" },
  { key: "captionSize", label: "Caption size", type: "number", min: 30, max: 140, step: 1, defaultValue: DEFAULTS.captionSize },
  { key: "heroSize", label: "Hero size", type: "number", min: 60, max: 320, step: 1, defaultValue: DEFAULTS.heroSize },
  { key: "captionY", label: "Caption height (%)", type: "number", min: 10, max: 90, step: 1, defaultValue: DEFAULTS.captionY },
  { key: "glow", label: "Glow", type: "number", min: 0, max: 2, step: 0.05, defaultValue: DEFAULTS.glow },
  { key: "wordHoldSeconds", label: "Word hold (s)", type: "number", min: 0.1, max: 2, step: 0.05, defaultValue: DEFAULTS.wordHoldSeconds },
  { key: "gridOpacity", label: "Grid opacity", type: "number", min: 0, max: 1, step: 0.02, defaultValue: DEFAULTS.gridOpacity },
  { key: "roundedFrame", label: "Rounded frame", type: "boolean", defaultValue: DEFAULTS.roundedFrame },
  { key: "cornerRadius", label: "Corner radius", type: "number", min: 0, max: 200, step: 2, defaultValue: DEFAULTS.cornerRadius },
  { key: "flashStrength", label: "Flash strength", type: "number", min: 0, max: 1, step: 0.05, defaultValue: DEFAULTS.flashStrength },
  { key: "leadPills", label: "Lead-in words in pills", type: "boolean", defaultValue: DEFAULTS.leadPills },
  { key: "parkX", label: "Park position (% of width)", type: "number", min: 20, max: 80, step: 1, defaultValue: DEFAULTS.parkX },
  { key: "cameraStrength", label: "Camera strength", type: "number", min: 0, max: 1.5, step: 0.05, defaultValue: DEFAULTS.cameraStrength },
];

const LOOK_PARAMETERS = [
  { key: "cameraStrength", label: "Camera strength", type: "number", min: 0, max: 1.5, step: 0.05, defaultValue: DEFAULTS.cameraStrength },
  { key: "cameraHeadroom", label: "Camera headroom (zoom the pans live in)", type: "number", min: 1, max: 1.6, step: 0.01, defaultValue: DEFAULTS.cameraHeadroom },
  { key: "cutoutScale", label: "Cutout scale on the set", type: "number", min: 0.8, max: 1, step: 0.01, defaultValue: DEFAULTS.cutoutScale },
  { key: "cutoutDrop", label: "Cutout drop (% of height)", type: "number", min: 0, max: 30, step: 0.5, defaultValue: DEFAULTS.cutoutDrop },
  { key: "gridPitch", label: "Grid pitch (% of width)", type: "number", min: 4, max: 20, step: 0.2, defaultValue: DEFAULTS.gridPitch },
  { key: "backdropFill", label: "Blurred backdrop behind letterboxed shots", type: "boolean", defaultValue: true },
];

const SAMPLE_PHRASES = "# One hook per line:  style: lead-in words | KEY WORDS\n# styles: hook (title stays up), punch (big word, replaces captions), stack (tilted words + arrow)\n# B-roll:  broll: the words it covers | what to show (a file in the B-roll folder, or words to search on Pexels)\n";

function host() {
  const parent = window.parent;
  if (!parent?.__DI__) throw new Error("This Selects version does not expose native panel services.");
  return parent;
}
function service(name, method) {
  const value = host().__DI__[name];
  if (typeof value?.[method] !== "function") throw new Error("This Selects build cannot " + method + ".");
  return value;
}
function bytesToBase64(bytes) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
function base64ToBytes(text) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}
// Double-quoted shell string: expands $VARS (used for panel-root paths) while escaping the rest.
function dq(value) {
  return '"' + String(value).replace(/(["\\`])/g, "\\$1") + '"';
}
function quote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}
function b64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}
function fmt(frame, fps) {
  const s = Math.max(0, frame / (fps || 30));
  const m = Math.floor(s / 60);
  return m + ":" + (s - m * 60).toFixed(1).padStart(4, "0");
}
function storageKey(sequenceId) {
  return STORAGE_PREFIX + sequenceId;
}
// An Apply in progress, per Draft, shared by every instance of this panel (see apply()).
function busyKey(sequenceId) {
  return STORAGE_PREFIX + "busy:" + sequenceId;
}
function readRecord(sequenceId) {
  try { return JSON.parse(localStorage.getItem(storageKey(sequenceId)) || "null"); } catch { return null; }
}
function runningApply(sequenceId) {
  try {
    const lock = JSON.parse(localStorage.getItem(busyKey(sequenceId)) || "null");
    return lock && Date.now() - Number(lock.beat || 0) < 240000 ? lock : null;
  } catch { return null; }
}
function extractJsonArray(text) {
  const s = String(text || "");
  const a = s.indexOf("[");
  const b = s.lastIndexOf("]");
  if (a < 0 || b <= a) throw new Error("The assistant did not return a JSON list.");
  return JSON.parse(s.slice(a, b + 1));
}

export default function PodcastHookReel({ sdk, context }) {
  const [phrases, setPhrases] = useState(SAMPLE_PHRASES);
  const [settings, setSettings] = useState(DEFAULTS);
  const [draftInfo, setDraftInfo] = useState(null);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(null);
  const [showLook, setShowLook] = useState(false);
  const [brollClips, setBrollClips] = useState([]);
  const [dataRoot, setDataRoot] = useState("");
  const [pluginRoot, setPluginRoot] = useState("");
  const [FFMPEG, setFfmpeg] = useState("ffmpeg");
  const FFPROBE = FFMPEG.replace(/ffmpeg$/, "ffprobe");
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => {
    // Real paths for FileSystem reads and writes (shell commands use the $VAR form).
    sdk.runShell({ summary: "Locate plugin folders", command: "mkdir -p " + dq(DATA_DIR) + " && printf '%s\\n%s' " + dq(DATA_DIR) + " " + dq(PLUGIN_DIR), timeoutMs: 10000 })
      .then((r) => { const [d, p] = String(r?.stdout || "").split("\n").map((x) => x.trim()); if (d) setDataRoot(d); if (p) setPluginRoot(p); })
      .catch(() => {});
    sdk.runShell({ summary: "Locate ffmpeg", command: FFMPEG_PROBE, timeoutMs: 10000 })
      .then((r) => { const p = String(r?.stdout || "").trim(); if (p) setFfmpeg(p); })
      .catch(() => {});
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + "sfxLibrary"); if (saved) setSettings((current) => ({ ...current, sfxLibrary: saved }));
      const pk = localStorage.getItem(STORAGE_PREFIX + "pexelsKey"); if (pk) setSettings((current) => ({ ...current, pexelsKey: pk }));
      const dir = localStorage.getItem(STORAGE_PREFIX + "brollDir");
      if (dir) { setSettings((current) => ({ ...current, brollDir: dir })); scanBroll(dir).then(setBrollClips).catch(() => {}); }
    } catch {}
  }, []);

  const set = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const run = async (action) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); } catch (cause) { if (alive.current) setError(String(cause?.message ?? cause)); } finally { if (alive.current) setBusy(false); }
  };

  const planOptions = () => ({ holdSeconds: settings.holdSeconds, flashOnCuts: settings.flashOnCuts, popEveryWord: settings.popEveryWord, cameraHeadroom: settings.cameraHeadroom, cameraStrength: settings.cameraStrength });

  const readScript = (phraseText, opt) => `
${PLANNER}
const draft = selects.draft(${JSON.stringify(context.sequenceId)});
const meta = await draft.meta();
const clips = await draft.clips({ trackScope: "all" });
const main = clips.filter((c) => c.trackKind === "main" && c.resourceId != null).sort((a, b) => a.startFrame - b.startFrame);
const rows = (await draft.words()).filter((w) => !w.nonSpeech && !w.cut).map((w) => [w.text, w.startFrame, w.endFrame]);
const plan = buildPlan(rows, ${JSON.stringify(phraseText)}, ${JSON.stringify(opt)}, meta.fps, main);
return {
  fps: meta.fps, frameSize: meta.frameSize, mainClips: main.length, endFrame: plan.endFrame, wordCount: plan.words.length,
  heroes: plan.heroes.map((h) => ({ id: h.id, style: h.style, text: h.text, start: h.start, keyStart: h.keyStart, keyEnd: h.keyEnd, end: h.end, slideStart: h.slideStart })),
  cuts: plan.cuts, brolls: plan.brolls.map((b) => ({ id: b.id, start: b.start, end: b.end, file: b.file, text: b.text })), unmatched: plan.unmatched, notes: plan.notes, events: plan.events, fingerprint: plan.fingerprint,
  transcript: plan.transcript.slice(0, 9000), overlays: clips.filter((c) => c.trackKind === "video" && c.resourceId == null).length,
};
`;

  const refresh = async (phraseText = phrases) => {
    if (!context.sequenceId) { setDraftInfo(null); setPlan(null); setStatus("Open a Draft first."); return; }
    const r = await sdk.runScript({ summary: "Plan hook reel", allowCommit: false, script: readScript(phraseText, planOptions()) });
    if (r.isError) throw new Error(r.output || "The Draft could not be read.");
    if (r.result == null) throw new Error("The plan was too large to return. Trim the Draft to a short first.");
    if (!alive.current) return;
    setDraftInfo(r.result);
    setPlan(r.result);
    try { setApplied(JSON.parse(localStorage.getItem(storageKey(context.sequenceId)) || "null")); } catch { setApplied(null); }
    const parts = [r.result.wordCount + " words", r.result.mainClips + " main clips", r.result.frameSize.width + "×" + r.result.frameSize.height, fmt(r.result.endFrame, r.result.fps)];
    if (r.result.heroes.length) parts.push(r.result.heroes.length + " hook" + (r.result.heroes.length === 1 ? "" : "s") + " matched");
    if (r.result.unmatched.length) parts.push(r.result.unmatched.length + " not found");
    setStatus(parts.join(" · "));
  };

  // Hooks are per Draft and must survive the panel remounting (it does whenever its file changes or the list is reopened).
  const phrasesKey = (id) => STORAGE_PREFIX + "phrases:" + id;
  useEffect(() => {
    let saved = null;
    try { saved = context.sequenceId ? localStorage.getItem(phrasesKey(context.sequenceId)) : null; } catch {}
    const next = saved != null && saved.trim() ? saved : SAMPLE_PHRASES;
    setPhrases(next);
    setStatus(""); setError(""); setPlan(null);
    run(() => refresh(next));
  }, [context.sequenceId]);
  const editPhrases = (text) => {
    setPhrases(text);
    try { if (context.sequenceId) localStorage.setItem(phrasesKey(context.sequenceId), text); } catch {}
  };

  const suggest = () => run(async () => {
    if (!draftInfo?.transcript) throw new Error("Read the Draft first.");
    setStatus("Asking the assistant for hook phrases…");
    const r = await sdk.askAI({
      timeoutMs: 120000,
      prompt: "You are editing a short-form podcast reel in the style of kinetic-typography TikTok edits. From the transcript below, pick 3 to 5 hook moments worth a big on-screen title. Each hook is a short lead-in (1-4 words, may be empty) followed by 1-3 KEY words spoken right after it, both copied EXACTLY from the transcript in order (no paraphrase, no reordering). Use style \"hook\" for a question or opening claim that should stay on screen as a title, \"punch\" for a big emotional or surprising word, and \"stack\" for a two-word concept. Also pick 2 or 3 moments for B-roll (stock footage shown over the speaker while the words play): style \"broll\", \"lead\" = the exact transcript words it covers (3 to 8 words, copied exactly), \"key\" = 2 to 4 plain visual search words for a stock library (e.g. \"empty apartment\", \"person writing notebook\"). Reply with ONLY a JSON array like [{\"style\":\"hook\",\"lead\":\"why do you\",\"key\":\"procrastinate?\"},{\"style\":\"broll\",\"lead\":\"googled mansions and lamborghinis\",\"key\":\"luxury mansion driveway\"}].\n\nTranscript:\n" + draftInfo.transcript,
    });
    const list = extractJsonArray(r.text);
    const lines = list.filter((x) => x && typeof x.key === "string" && x.key.trim()).map((x) => (["hook", "punch", "stack", "broll"].includes(String(x.style)) ? x.style : "punch") + ": " + (typeof x.lead === "string" ? x.lead.trim() : "") + " | " + x.key.trim());
    if (!lines.length) throw new Error("The assistant returned no usable hooks.");
    const next = SAMPLE_PHRASES + lines.join("\n") + "\n";
    editPhrases(next);
    await refresh(next);
  });

  const scanLibrary = async (dir) => {
    const r = await sdk.runShell({ summary: "Scan sound library", command: "find " + quote(dir) + " -type f \\( -iname '*.wav' -o -iname '*.mp3' -o -iname '*.aif' -o -iname '*.aiff' -o -iname '*.m4a' -o -iname '*.flac' \\) | head -n 600", timeoutMs: 30000, maxOutputBytes: 48000 });
    if (r.isError || r.exitCode !== 0) throw new Error(r.stderr || r.output || "The sound library folder could not be read.");
    const files = String(r.stdout || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const groups = { whoosh: [], impact: [], riser: [], tick: [] };
    const sweeps = [];
    const rules = [
      ["riser", /riser|\brise\b|uplift|tension|suspense|build/],
      ["whoosh", /whoosh|swoosh|swish|swipe/],
      ["impact", /impact|\bhit\b|hits\b|boom|slam|thud|punch|braam|kick|stinger|drop|smash/],
      ["tick", /\btick|\bclick|typewriter|keyboard|\bblip/],
    ];
    for (const f of files) {
      const p = f.toLowerCase();
      const rule = rules.find(([, re]) => re.test(p));
      if (rule) groups[rule[0]].push(f);
      else if (/sweep|transition/.test(p)) sweeps.push(f);
    }
    if (!groups.riser.length) groups.riser = sweeps;
    const folderFirst = (kind) => (a, b) => {
      const fa = /\/[^/]*$/.test(a) && new RegExp(kind, "i").test(a.split("/").slice(-2, -1)[0] || "") ? 0 : 1;
      const fb = /\/[^/]*$/.test(b) && new RegExp(kind, "i").test(b.split("/").slice(-2, -1)[0] || "") ? 0 : 1;
      return fa - fb || a.localeCompare(b);
    };
    for (const k of Object.keys(groups)) groups[k] = groups[k].sort(folderFirst(k)).slice(0, 40);
    return groups;
  };

  const generateSfx = async (events, seconds, job) => {
    let samples = null;
    const library = String(settings.sfxLibrary || "").trim();
    if (library) {
      setStatus("Reading your sound library…");
      samples = await scanLibrary(library);
      const found = Object.values(samples).reduce((n, list) => n + list.length, 0);
      if (!found) throw new Error("No whoosh, impact, riser or tick files were found in " + library + ". Check the folder, or switch to synthesized sounds.");
    }
    const cfg = JSON.stringify({ sampleRate: 44100, seconds, gain: settings.sfxGain, events, samples, ffmpeg: FFMPEG });
    if (!dataRoot) throw new Error("The plugin data folder could not be located; try again in a moment.");
    const wavPath = dataRoot + "/sfx/" + job + ".wav";
    const command = "mkdir -p " + dq(SFX_DIR) + " && cd " + dq(SFX_DIR) + " && echo " + quote(b64(SFX_GENERATOR)) + " | base64 -d > hook-sfx.cjs && echo " + quote(b64(cfg)) + " | base64 -d > " + quote(job + ".json") + " && node hook-sfx.cjs " + quote(job + ".json") + " " + quote(wavPath);
    const r = await sdk.runShell({ summary: samples ? "Mix reel sound effects" : "Synthesize reel sound effects", command, timeoutMs: 180000, maxOutputBytes: 12000 });
    if (r.isError || r.exitCode !== 0) throw new Error(r.stderr || r.output || "The sound effects could not be generated.");
    return wavPath;
  };

  const setLibrary = (dir) => {
    set("sfxLibrary", dir);
    try { if (dir) localStorage.setItem(STORAGE_PREFIX + "sfxLibrary", dir); else localStorage.removeItem(STORAGE_PREFIX + "sfxLibrary"); } catch {}
  };
  const chooseLibrary = () => run(async () => {
    const picker = service("CutbackMediaPicker", "pickDirectoryPath");
    const dir = await picker.pickDirectoryPath();
    if (!dir) return;
    const groups = await scanLibrary(dir);
    setLibrary(dir);
    setStatus("Sound library: " + Object.entries(groups).map(([k, v]) => v.length + " " + k).join(", ") + ".");
  });

  // One finished frame per Main clip -> speaker head position, so captions and cards sit relative to the face.
  // Uses the same bridge render + person-cutout as the mattes. Returns [start, end, chin%, eyes%, headTop%, headX%] rows.
  // Does a reframed Main clip already carry an effect? Its own canvas is the source letterboxed into the
  // frame; a capture with no bars on either axis can only be a finished frame, i.e. an effect is on it.
  const mainClipHasEffect = async (mainClips) => {
    const clip = (mainClips || []).find((c) => Math.abs(c.scale ?? 1) > 1.05);
    if (!clip) return false;
    try {
      const core = await sdk.call("getDraftCore", context.sequenceId);
      if (!core || core.sequenceJson == null || !dataRoot) return false;
      const at = clip.startFrame + Math.min(clip.endFrame - clip.startFrame - 1, Math.round((clip.endFrame - clip.startFrame) * 0.5));
      const payload = await sdk.call("captureVisualFrames", { owner: core.owner, sequenceId: context.sequenceId, sequenceJson: core.sequenceJson, generatorJsons: core.generatorJsons, coordinate: "resolved", includeOverlays: true, frames: [{ frameNumber: at, view: "timeline_composite" }] });
      if (!payload || typeof payload.data !== "string") return false;
      const dir = dataRoot + "/mattes";
      const jpg = dir + "/probe-" + Date.now() + ".jpg";
      await sdk.runShell({ summary: "Prepare probe folder", command: "mkdir -p " + quote(dir), timeoutMs: 20000 });
      await service("FileSystem", "writeFile").writeFile(jpg, base64ToBytes(payload.data));
      const r = await sdk.runShell({ summary: "Probe clip canvas", timeoutMs: 60000, maxOutputBytes: 2000, command: "B=$(" + quote(FFMPEG) + " -v info -loop 1 -i " + quote(jpg) + " -t 0.2 -vf bbox=min_val=16 -f null - 2>&1 | grep -oE " + quote("x1:[0-9]+ x2:[0-9]+ y1:[0-9]+ y2:[0-9]+") + " | tail -n 1); S=$(" + quote(FFPROBE) + " -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 " + quote(jpg) + "); echo \"$B $S\"; rm -f " + quote(jpg) });
      const m = /x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+) (\d+),(\d+)/.exec(String(r.stdout || ""));
      if (!m) return false;
      const [, x1, x2, y1, y2, cw, ch] = m.map(Number);
      const bars = (y2 - y1 + 1) < ch * 0.97 || (x2 - x1 + 1) < cw * 0.97;
      return !bars;
    } catch { return false; }
  };

  // Band shares -> frame shares, through the Transform each Main clip will carry once Phase 1 has panned
  // and tightened it. The band sits centred in the clip's canvas; the Transform scales the canvas by tScale
  // about its centre and offsets it by position (percent of the frame height). One percent of the band's
  // width is tScale percent of the frame across, one percent of its height is a different amount down.
  // Rows with a null band are already frame shares (measured on a finished frame) and pass through.
  const facesToFrame = (rows, current, mainClips) => {
    const W = current.frameSize.width, H = current.frameSize.height;
    const panX = Number(settings.panX) || 0;
    const tight = Number(settings.tightCrop) || 1;
    return rows.map((f) => {
      const band = f[6];
      if (!band) return f;
      const clip = mainClips.find((c) => c.startFrame === f[0]);
      const base = Math.abs(clip?.scale ?? 1) > 0.001 ? Math.abs(clip.scale) : 1;
      const tScale = settings.look && tight !== 1 ? base * tight : base;
      const posX = settings.look && panX !== 0 ? panX : (clip?.posX ?? 0);
      const posY = clip?.posY ?? 0;
      const panDivX = tScale;
      const panDivY = (tScale * W) / (band * H);
      const originX = 50 - (posX * H) / (tScale * W);
      const originY = 50 - posY / panDivY;
      const fy = (pct) => 50 + (pct - originY) * panDivY;
      const fx = (pct) => 50 + (pct - originX) * panDivX;
      return [f[0], f[1], fy(f[2]), fy(f[3]), fy(f[4]), fx(f[5]), band];
    });
  };

  const measureFaces = async (current, mainClips) => {
    const core = await sdk.call("getDraftCore", context.sequenceId);
    if (!core || core.sequenceJson == null) throw new Error("Selects did not return the Draft for frame rendering.");
    const fs = service("FileSystem", "writeFile");
    if (!dataRoot) throw new Error("The plugin data folder could not be located; try again in a moment.");
    const job = String(context.sequenceId).replace(/[^a-zA-Z0-9_-]/g, "_") + "-faces-" + Date.now();
    const dir = dataRoot + "/mattes/" + job;
    const mk = await sdk.runShell({ summary: "Prepare face folder", command: "mkdir -p " + quote(dir) + " && echo " + quote(b64(FACE_MEASURE)) + " | base64 -d > " + quote(dir + "/measure.cjs"), timeoutMs: 20000 });
    if (mk.isError || mk.exitCode !== 0) throw new Error(mk.stderr || mk.output || "The face folder could not be created.");
    const rows = [];
    for (let i = 0; i < mainClips.length; i += 1) {
      const clip = mainClips[i];
      const len = clip.endFrame - clip.startFrame;
      // Speakers move. One frame can catch a lean, a turn or a hand in front of the face, so measure at
      // three moments - the key words of any hero in this shot (where the camera moves matter) padded
      // out with fixed points - and keep the median of each figure.
      const keyed = current.heroes.filter((h) => h.keyStart >= clip.startFrame && h.keyStart < clip.endFrame).map((h) => h.keyStart);
      const fixed = [0.3, 0.55, 0.8].map((f) => clip.startFrame + Math.min(len - 1, Math.round(len * f)));
      const ats = Array.from(new Set(keyed.concat(fixed))).slice(0, 3);
      const samples = [];
      let band = null;
      for (let k = 0; k < ats.length; k += 1) {
        const at = ats[k];
        setStatus("Finding the speaker in shot " + (i + 1) + " of " + mainClips.length + (ats.length > 1 ? " (" + (k + 1) + "/" + ats.length + ")" : "") + "\u2026");
        const payload = await sdk.call("captureVisualFrames", { owner: core.owner, sequenceId: context.sequenceId, sequenceJson: core.sequenceJson, generatorJsons: core.generatorJsons, coordinate: "resolved", includeOverlays: true, frames: [{ frameNumber: at, view: "timeline_composite" }] });
        if (!payload || typeof payload.data !== "string") continue;
        const jpg = dir + "/shot" + i + "-" + k + ".jpg";
        await fs.writeFile(jpg, base64ToBytes(payload.data));
        // The capture is the clip's own canvas: the source letterboxed into the frame, its Transform not yet
        // applied (this runs before any effect goes on). So: find the picture band, key the speaker out of
        // THAT, and measure him as a share of the band. apply() turns band shares into frame shares once it
        // knows the Transform each clip will end up with.
        const r = await sdk.runShell({ summary: "Measure speaker", cwd: dir, timeoutMs: 90000, maxOutputBytes: 6000, command: [
          "cd " + quote(dir),
          "export TMPDIR=\"$(getconf DARWIN_USER_TEMP_DIR)\"",
          "B=$(" + quote(FFMPEG) + " -v info -loop 1 -i " + quote(jpg) + " -t 0.2 -vf bbox=min_val=16 -f null - 2>&1 | grep -oE " + quote("x1:[0-9]+ x2:[0-9]+ y1:[0-9]+ y2:[0-9]+") + " | tail -n 1)",
          "S=$(" + quote(FFPROBE) + " -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 " + quote(jpg) + ")",
          "echo \"BAND $B SIZE $S\"",
          "X1=$(echo \"$B\" | sed -E 's/.*x1:([0-9]+).*/\\1/'); X2=$(echo \"$B\" | sed -E 's/.*x2:([0-9]+).*/\\1/'); Y1=$(echo \"$B\" | sed -E 's/.*y1:([0-9]+).*/\\1/'); Y2=$(echo \"$B\" | sed -E 's/.*y2:([0-9]+).*/\\1/')",
          "CW=$(echo \"$S\" | cut -d, -f1); CH=$(echo \"$S\" | cut -d, -f2)",
          "if [ $((Y2-Y1+1)) -lt $((CH*97/100)) ]; then BX=0; BW=$CW; BY=$Y1; BH=$((Y2-Y1+1)); else BX=$X1; BW=$((X2-X1+1)); BY=0; BH=$CH; fi",
          "echo \"CROP $BW $BH $BX $BY\"",
          quote(FFMPEG) + " -v error -y -i " + quote(jpg) + " -vf \"crop=$BW:$BH:$BX:$BY\" " + quote(jpg + ".band.png"),
          dq(CUTOUT_HELPER) + " " + quote(jpg + ".band.png") + " " + quote(jpg + ".png"),
          "node measure.cjs " + quote(FFMPEG) + " " + quote(jpg + ".png"),
        ].join(" && ") });
        if (r.isError || r.exitCode !== 0) continue;
        try {
          const lines = String(r.stdout || "").trim().split("\n");
          const m = JSON.parse(lines.pop() || "{}");
          const crop = /CROP (\d+) (\d+) (\d+) (\d+)/.exec(lines.join("\n"));
          const size = /SIZE (\d+),(\d+)/.exec(lines.join("\n"));
          if (!m.found || !crop || !size) continue;
          const bandW = Number(crop[1]), bandH = Number(crop[2]);
          const capW = Number(size[1]), capH = Number(size[2]);
          const bars = bandH < capH * 0.97 || bandW < capW * 0.97;
          // A reframed clip's own canvas always has bars. None means the renderer returned the finished
          // frame instead (a reel is already on the clip): that is frame space already, marked by a null band.
          const reframed = Math.abs(clip.scale ?? 1) > 1.05;
          const thisBand = reframed && !bars ? null : bandW / bandH;
          if (samples.length && (thisBand == null) !== (band == null)) continue;
          band = thisBand;
          samples.push([m.chin, m.eyes, m.headTop, m.headX]);
        } catch {}
      }
      if (!samples.length) continue;
      const median = (j) => { const v = samples.map((s) => s[j]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
      rows.push([clip.startFrame, clip.endFrame, median(0), median(1), median(2), median(3), band]);
    }
    await sdk.runShell({ summary: "Clean face folder", command: "rm -rf " + quote(dir), timeoutMs: 20000 });
    return rows;
  };

  // Rendered composite frames of the saved Draft -> speaker mattes -> one luminance sprite per stack hook.
  // Mattes come from the final picture (crop, pan, push-in included), so the text mask lines up with the speaker.
  // The set: the speaker cut out of the room so a title can play on a bare grid. One matte sprite per
  // picture clip that a hook sits on, rendered from the finished frame (so crop, pan and framing are
  // already in it) and then keyed by Apple Vision. Unlike the text mattes these are NOT inverted: white
  // is the speaker, which is what stays visible.
  const buildCutouts = async (current, hooks, mainClips) => {
    const core = await sdk.call("getDraftCore", context.sequenceId);
    if (!core || core.sequenceJson == null) throw new Error("Selects did not return the Draft for frame rendering.");
    const fs = service("FileSystem", "writeFile");
    const reader = service("FileSystem", "readFile");
    if (!dataRoot) throw new Error("The plugin data folder could not be located; try again in a moment.");
    const job = String(context.sequenceId).replace(/[^a-zA-Z0-9_-]/g, "_") + "-cut-" + Date.now();
    const dir = dataRoot + "/mattes/" + job;
    const mk = await sdk.runShell({ summary: "Prepare set folder", command: "mkdir -p " + quote(dir), timeoutMs: 20000 });
    if (mk.isError || mk.exitCode !== 0) throw new Error(mk.stderr || mk.output || "The set folder could not be created.");
    const out = {};
    let budget = CUTOUT_BUDGET;
    for (const h of hooks) {
      const clip = mainClips.find((c) => h.start < c.endFrame && h.end > c.startFrame);
      if (!clip) continue;
      const from = Math.max(clip.startFrame, h.start - Math.round(current.fps / 3));
      const to = Math.min(clip.endFrame, h.end + Math.round(current.fps / 3));
      if (to - from < 2) continue;
      let step = Math.max(1, Math.round(current.fps / 10));
      while (Math.ceil((to - from) / step) > CUTOUT_TILES) step += 1;
      const frames = [];
      for (let f = from; f < to; f += step) frames.push(f);
      const tag = "c" + h.id;
      for (let i = 0; i < frames.length; i += 1) {
        setStatus("Rendering the set, frame " + (i + 1) + " of " + frames.length + "\u2026");
        const payload = await sdk.call("captureVisualFrames", { owner: core.owner, sequenceId: context.sequenceId, sequenceJson: core.sequenceJson, generatorJsons: core.generatorJsons, coordinate: "resolved", includeOverlays: true, frames: [{ frameNumber: frames[i], view: "timeline_composite" }] });
        if (!payload || typeof payload.data !== "string") throw new Error("Selects could not render frame " + frames[i] + ".");
        await fs.writeFile(dir + "/" + tag + "_" + String(i + 1).padStart(3, "0") + ".jpg", base64ToBytes(payload.data));
      }
      setStatus("Cutting the speaker out of " + frames.length + " frames\u2026");
      // What comes back is the clip's own canvas: the source letterboxed into the frame, its Transform
      // not yet applied. Everything downstream needs the picture band, not the bars - a matte that keeps
      // the bars masks the wrong region entirely - and the band's shape is also what tells the effect how
      // much of the frame one percent of its canvas is worth on each axis.
      // Find the picture inside the captured frame. cropdetect is the obvious tool and the wrong one:
      // it needs -loop to emit anything at all on a still, and it crops to CONTENT, so a dark shirt at
      // the frame edge shrinks the box. bbox reports the two axes separately, so the letterbox can be
      // read off one axis while the other is held at full width.
      const probe = await sdk.runShell({ summary: "Measure the picture band", cwd: dir, timeoutMs: 60000, maxOutputBytes: 8000,
        command: "cd " + quote(dir) + " && " + quote(FFMPEG) + " -v info -loop 1 -i " + quote(tag + "_001.jpg") + " -t 0.2 -vf bbox=min_val=16 -f null - 2>&1 | grep -oE " + quote("x1:[0-9]+ x2:[0-9]+ y1:[0-9]+ y2:[0-9]+") + " | tail -n 1; "  + quote(FFPROBE) + " -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 " + quote(tag + "_001.jpg") });
      const box = /x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/.exec(String(probe.stdout || ""));
      const dim = /(\d+),(\d+)\s*$/.exec(String(probe.stdout || "").trim());
      if (!box || !dim) throw new Error("The picture band could not be measured.");
      const capW = Number(dim[1]);
      const capH = Number(dim[2]);
      const boxW = Number(box[2]) - Number(box[1]) + 1;
      const boxH = Number(box[4]) - Number(box[3]) + 1;
      // Bars run across the short axis: whichever axis is short is the letterbox, the other stays full.
      const horizontalBars = boxH < capH * 0.97;
      const bandW = horizontalBars ? capW : boxW;
      const bandH = horizontalBars ? boxH : capH;
      const bandX = horizontalBars ? 0 : Number(box[1]);
      const bandY = horizontalBars ? Number(box[3]) : 0;
      // No bars on either axis is only suspicious when the clip is reframed: a reframed clip's own canvas
      // always has them, so a full-frame capture means the finished composite came back instead.
      const reframed = Math.abs(clip.scale ?? 1) > 1.05;
      if (reframed && !horizontalBars && boxW >= capW * 0.97) {
        setStatus("The set needs the clip's own canvas and this render returned the finished frame; hook titles play over the room instead.");
        return {};
      }
      const cols = Math.min(8, frames.length);
      const rows = Math.ceil(frames.length / cols);
      // Keep the matte at the band's own resolution. It used to be squeezed to 200 px and then stretched
      // back across a band that lands ~3900 px wide in the frame - a 20x upscale, which is what made the
      // edge mushy. There is nothing to gain above the capture's own width, so that is the ceiling, and
      // the sprite is capped so one row cannot grow past what WebP will take.
      const tw = Math.max(160, Math.min(bandW, Math.floor(4800 / cols)));
      const tileH = Math.max(2, Math.round((tw * bandH) / bandW / 2) * 2);
      const one = dq(CUTOUT_HELPER) + " {} {}.cut.png";
      const command = [
        "cd " + quote(dir),
        "export TMPDIR=\"$(getconf DARWIN_USER_TEMP_DIR)\"",
        // the bars are not part of the clip's canvas, and Vision keys a tighter picture better
        "for f in " + tag + "_*.jpg; do " + quote(FFMPEG) + " -v error -y -i \"$f\" -vf " + quote("crop=" + bandW + ":" + bandH + ":" + bandX + ":" + bandY) + " \"${f%.jpg}.band.png\" || exit 1; done",
        "{ F=$(ls " + tag + "_*.band.png | head -n 1); " + dq(CUTOUT_HELPER) + " \"$F\" \"$F.cut.png\" && ls " + tag + "_*.band.png | tail -n +2 | xargs -P 4 -I{} sh -c " + quote(one) + " || ls " + tag + "_*.band.png | xargs -I{} sh -c " + quote("[ -f {}.cut.png ] || " + one) + "; }",
        // white = the speaker. A little blur and a lift close pinholes around hair without eating the edge.
        "for f in " + tag + "_*.band.png; do " + quote(FFMPEG) + " -v error -y -i \"$f.cut.png\" -vf " + quote("alphaextract,scale=" + tw + ":" + tileH + ",gblur=sigma=0.7,eq=contrast=1.7") + " \"${f%.band.png}.m.png\" || exit 1; done",
        quote(FFMPEG) + " -v error -y -framerate 1 -start_number 1 -i " + quote(tag + "_%03d.m.png") + " -filter_complex " + quote("tile=" + cols + "x" + rows) + " -frames:v 1 -c:v libwebp -lossless 0 -quality 80 " + quote(tag + ".webp"),
        "rm -f " + tag + "_*.jpg " + tag + "_*.band.png " + tag + "_*.cut.png " + tag + "_*.m.png",
      ].join(" && ");
      const r = await sdk.runShell({ summary: "Build the set mattes", command, cwd: dir, timeoutMs: 600000, maxOutputBytes: 12000 });
      if (r.isError || r.exitCode !== 0) throw new Error(r.stderr || r.output || "The set mattes could not be built.");
      const bytes = new Uint8Array(await reader.readFile(dir + "/" + tag + ".webp"));
      const b64 = bytesToBase64(bytes);
      if (b64.length > budget) continue;
      budget -= b64.length;
      out[String(clip.clipId)] = { sprite: "data:image/webp;base64," + b64, cols, rows, count: frames.length, start: from - clip.startFrame, step, bandAspect: bandW / bandH };
    }
    return out;
  };

  // items: [{ id, from, to, rate }] - the hero's frames to matte and the sampling rate (fps).
  const buildMattes = async (current, items) => {
    const core = await sdk.call("getDraftCore", context.sequenceId);
    if (!core || core.sequenceJson == null) throw new Error("Selects did not return the Draft for frame rendering.");
    const fs = service("FileSystem", "writeFile");
    const reader = service("FileSystem", "readFile");
    if (!dataRoot) throw new Error("The plugin data folder could not be located; try again in a moment.");
    const job = String(context.sequenceId).replace(/[^a-zA-Z0-9_-]/g, "_") + "-" + Date.now();
    const dir = dataRoot + "/mattes/" + job;
    const mk = await sdk.runShell({ summary: "Prepare matte folder", command: "mkdir -p " + quote(dir), timeoutMs: 20000 });
    if (mk.isError || mk.exitCode !== 0) throw new Error(mk.stderr || mk.output || "The matte folder could not be created.");
    const tw = 270;
    const th = Math.max(2, Math.round(270 * current.frameSize.height / current.frameSize.width / 2) * 2);
    const result = {};
    let budget = MATTE_BUDGET;
    for (const h of items) {
      const span = h.to - h.from;
      if (span <= 0) continue;
      let step = Math.max(1, Math.round(current.fps / (h.rate || 15)));
      while (Math.ceil(span / step) > 36) step += 1;
      const frames = [];
      for (let f = h.from; f < h.to; f += step) frames.push(f);
      const tag = "h" + h.id;
      for (let i = 0; i < frames.length; i += 1) {
        setStatus("Rendering frame " + (i + 1) + " of " + frames.length + " for the hook behind the speaker…");
        const payload = await sdk.call("captureVisualFrames", { owner: core.owner, sequenceId: context.sequenceId, sequenceJson: core.sequenceJson, generatorJsons: core.generatorJsons, coordinate: "resolved", includeOverlays: true, frames: [{ frameNumber: frames[i], view: "timeline_composite" }] });
        if (!payload || typeof payload.data !== "string") throw new Error("Selects could not render frame " + frames[i] + ".");
        await fs.writeFile(dir + "/" + tag + "_" + String(i + 1).padStart(3, "0") + ".jpg", base64ToBytes(payload.data));
      }
      setStatus("Finding the speaker in " + frames.length + " frames…");
      const cols = Math.min(6, frames.length);
      const rows = Math.ceil(frames.length / cols);
      // One frame first so the Neural Engine model compiles once; four parallel cold compiles collide on the
      // same cache blobs. Then the rest in parallel, with a sequential retry of anything still missing.
      const one = dq(CUTOUT_HELPER) + " {} {}.cut.png";
      const command = [
        "cd " + quote(dir),
        "export TMPDIR=\"$(getconf DARWIN_USER_TEMP_DIR)\"",
        "{ F=$(ls " + tag + "_*.jpg | head -n 1); " + dq(CUTOUT_HELPER) + " \"$F\" \"$F.cut.png\" && ls " + tag + "_*.jpg | tail -n +2 | xargs -P 4 -I{} sh -c " + quote(one) + " || ls " + tag + "_*.jpg | xargs -I{} sh -c " + quote("[ -f {}.cut.png ] || " + one) + "; }",
        "for f in " + tag + "_*.jpg; do " + quote(FFMPEG) + " -v error -y -i \"$f.cut.png\" -vf " + quote("alphaextract,negate,scale=" + tw + ":" + th) + " \"${f%.jpg}.m.png\" || exit 1; done",
        quote(FFMPEG) + " -v error -y -framerate 1 -start_number 1 -i " + quote(tag + "_%03d.m.png") + " -filter_complex " + quote("tile=" + cols + "x" + rows) + " -frames:v 1 -c:v libwebp -lossless 0 -quality 70 " + quote(tag + ".webp"),
        "rm -f " + tag + "_*.jpg " + tag + "_*.cut.png " + tag + "_*.m.png",
      ].join(" && ");
      const r = await sdk.runShell({ summary: "Build speaker mattes", command, cwd: dir, timeoutMs: 240000, maxOutputBytes: 12000 });
      if (r.isError || r.exitCode !== 0) throw new Error(r.stderr || r.output || "The speaker mattes could not be built.");
      const bytes = new Uint8Array(await reader.readFile(dir + "/" + tag + ".webp"));
      const b64 = bytesToBase64(bytes);
      if (b64.length > budget) continue;
      budget -= b64.length;
      result[h.id] = { sprite: "data:image/webp;base64," + b64, cols, rows, count: frames.length, start: h.from, step };
    }
    return result;
  };

  // ---- B-roll: clips from a folder, assigned to `broll:` phrases in order (or by file-name match) ----------
  const scanBroll = async (dir) => {
    const r = await sdk.runShell({ summary: "Scan B-roll folder", command: "cd " + quote(dir) + " && for f in *.mp4 *.mov *.MP4 *.MOV *.m4v *.webm *.mkv; do [ -f \"$f\" ] || continue; d=$(" + quote(FFPROBE) + " -v error -select_streams v:0 -show_entries stream=width,height -show_entries format=duration -of csv=p=0:s=x \"$f\" 2>/dev/null | tr '\\n' ' '); echo \"$f|$d\"; done", timeoutMs: 60000, maxOutputBytes: 48000 });
    if (r.isError || r.exitCode !== 0) throw new Error(r.stderr || r.output || "The B-roll folder could not be read.");
    const clips = [];
    for (const line of String(r.stdout || "").split("\n")) {
      const [name, dims] = line.split("|");
      if (!name || !dims) continue;
      const parts = dims.trim().split(/[x\s]+/).map(Number);
      const width = parts[0], height = parts[1], seconds = parts[2];
      if (!(width > 0 && height > 0)) continue;
      clips.push({ name: name.trim(), path: dir + "/" + name.trim(), width, height, seconds: Number.isFinite(seconds) ? seconds : 0 });
    }
    clips.sort((a, b) => a.name.localeCompare(b.name));
    return clips;
  };
  const setBrollDir = (dir) => {
    set("brollDir", dir);
    try { if (dir) localStorage.setItem(STORAGE_PREFIX + "brollDir", dir); else localStorage.removeItem(STORAGE_PREFIX + "brollDir"); } catch {}
  };
  const chooseBroll = () => run(async () => {
    const picker = service("CutbackMediaPicker", "pickDirectoryPath");
    const dir = await picker.pickDirectoryPath();
    if (!dir) return;
    const clips = await scanBroll(dir);
    if (!clips.length) throw new Error("No video files were found in " + dir + ".");
    setBrollDir(dir);
    setBrollClips(clips);
    setStatus(clips.length + " B-roll clip" + (clips.length === 1 ? "" : "s") + " found. Add lines like  broll: the words it covers  (optionally  | part of a file name).");
  });
  // ---- B-roll search (Pexels): a `broll:` phrase with no local match is searched, the best vertical clip is
  // downloaded into the B-roll folder, and it joins the local pool. Needs a free Pexels API key; without one
  // the folder alone is used. The panel frame cannot fetch (CSP), so the search runs through curl.
  const setPexelsKey = (key) => {
    set("pexelsKey", key);
    try { if (key) localStorage.setItem(STORAGE_PREFIX + "pexelsKey", key); else localStorage.removeItem(STORAGE_PREFIX + "pexelsKey"); } catch {}
  };
  const searchBroll = async (query, dir, targetSeconds) => {
    const key = String(settings.pexelsKey || "").trim();
    if (!key) return null;
    const q = encodeURIComponent(String(query).replace(/[^\p{L}\p{N} ]+/gu, " ").trim().split(/\s+/).slice(0, 5).join(" "));
    const cmd = "curl -s --max-time 20 -H " + quote("Authorization: " + key) + " " + quote("https://api.pexels.com/videos/search?query=" + q + "&orientation=portrait&size=medium&per_page=8");
    const r = await sdk.runShell({ summary: "Search B-roll", command: cmd, timeoutMs: 30000, maxOutputBytes: 48000 });
    if (r.isError || r.exitCode !== 0) return null;
    let body;
    try { body = JSON.parse(String(r.stdout || "")); } catch { return null; }
    const videos = Array.isArray(body?.videos) ? body.videos : [];
    if (!videos.length) return null;
    // Prefer clips a little longer than the phrase, vertical, and a file around 1080 wide (a download we can afford).
    const scored = videos.map((v) => {
      const files = (v.video_files || []).filter((f) => f.width && f.height && f.height > f.width);
      const file = files.sort((a, b) => Math.abs((a.width || 0) - 1080) - Math.abs((b.width || 0) - 1080))[0];
      const dur = Number(v.duration) || 0;
      const fit = dur >= targetSeconds ? 1 : dur / Math.max(1, targetSeconds);
      return { v, file, score: (file ? 1 : 0) + fit };
    }).filter((x) => x.file).sort((a, b) => b.score - a.score);
    if (!scored.length) return null;
    const best = scored[0];
    const name = "pexels-" + best.v.id + "-" + q.replace(/%20/g, "-").replace(/[^a-zA-Z0-9-]+/g, "").slice(0, 40) + ".mp4";
    const out = dir + "/" + name;
    // Download once, then make sure it really is a video (a refused request saves an error page as .mp4,
    // which the Project then cannot import); a bad file is removed so the next Apply fetches it again.
    const dl = await sdk.runShell({ summary: "Download B-roll", command: "mkdir -p " + quote(dir) + " && { [ -f " + dq(out) + " ] || curl -s -L --max-time 120 -o " + dq(out) + " " + quote(best.file.link) + "; } && { " + quote(FFPROBE) + " -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 " + dq(out) + " | grep -q . || { rm -f " + dq(out) + "; echo BADFILE; exit 3; }; }", timeoutMs: 150000, maxOutputBytes: 4000 });
    if (dl.isError || dl.exitCode !== 0) return null;
    return { name, path: out, width: best.file.width, height: best.file.height, seconds: Number(best.v.duration) || 0, credit: (best.v.user && best.v.user.name) || "Pexels" };
  };

  // Pick a clip for each B-roll phrase. Explicit file-name matches are honoured first across every entry, so an
  // earlier unnamed phrase cannot take a clip a later phrase asked for by name; the rest fill in folder order
  // and go round again when the folder runs out. A clip may serve several phrases, but never the same stretch
  // of it twice, and never one picking up where the last left off (that reads as the same shot continuing):
  // its uses are spread across the clip - the first from its start, the last from its end, the rest evenly
  // between - so each return shows a different part of it.
  const assignBroll = (brolls, clips, fps) => {
    const picked = {};
    const named = new Set();
    for (const b of brolls) {
      if (!b.file) continue;
      const wanted = String(b.file).toLowerCase();
      const clip = clips.find((c) => c.name.toLowerCase().includes(wanted) && !named.has(c.path)) || clips.find((c) => c.name.toLowerCase().includes(wanted));
      if (clip) { picked[b.id] = clip; named.add(clip.path); }
    }
    const unnamed = clips.filter((c) => !named.has(c.path));
    let cursor = 0;
    const out = brolls.map((b) => {
      let clip = picked[b.id] || null;
      // Unnamed phrases take the unnamed clips first, then go round every clip so no one file carries them all.
      if (!clip && clips.length) { clip = cursor < unnamed.length ? unnamed[cursor] : clips[(cursor - unnamed.length) % clips.length]; cursor += 1; }
      return { ...b, clip, sourceStart: 0 };
    });
    const uses = {};
    for (const b of out) if (b.clip) (uses[b.clip.path] = uses[b.clip.path] || []).push(b);
    for (const path of Object.keys(uses)) {
      const list = uses[path];
      if (list.length < 2) continue;
      const total = Number(list[0].clip.seconds) || 0;
      if (!(total > 0)) continue;
      const spans = list.map((b) => Math.max(0.5, (b.end - b.start) / Math.max(1, fps || 30)));
      list.forEach((b, i) => { b.sourceStart = Math.round(Math.max(0, (total - spans[i]) * (i / (list.length - 1))) * 100) / 100; });
    }
    return out;
  };

  const apply = () => run(async () => {
    if (!context.sequenceId || !context.projectId) throw new Error("Open a Draft first.");
    // One Apply per Draft at a time, across panel reloads. The app reloads a panel whenever its file changes,
    // and an Apply that was running carries on in the background while the reloaded panel shows idle - a
    // second press then put the whole reel on the Draft twice. The lock lives in localStorage, which both
    // instances share, and is refreshed every 15 s while an Apply runs; one left by a dead Apply goes stale.
    const seq = context.sequenceId;
    const other = runningApply(seq);
    if (other) throw new Error("An Apply is already running on this Draft (started " + new Date(Number(other.startedAt)).toLocaleTimeString() + ") \u2014 the panel was reloaded while it ran. Wait for it to finish, then look at the Draft before applying again.");
    const lockStart = Date.now();
    const beat = () => { try { localStorage.setItem(busyKey(seq), JSON.stringify({ startedAt: lockStart, beat: Date.now() })); } catch {} };
    beat();
    const beatTimer = setInterval(beat, 15000);
    try {
    // A reel another instance of this panel finished counts too, so read the stored record, not just state.
    const appliedNow = readRecord(seq) || applied;
    if (appliedNow && (await sdk.runScript({ summary: "Check reel pieces", allowCommit: false, script: `const c = await selects.draft(${JSON.stringify(context.sequenceId)}).clips({ trackScope: "all" }); return c.filter((x) => x.trackKind === "video" && x.resourceId == null).length;` })).result === 0) {
      // The graphic is gone (a Remove that got cut short, or done by hand): the record is stale, not a block.
      try { localStorage.removeItem(storageKey(context.sequenceId)); } catch {}
      setApplied(null);
    } else if (appliedNow) throw new Error("This Draft already has Hook Captions. Remove it first, then apply again.");
    setStatus("Reading the Draft…");
    const opt = planOptions();
    const read = await sdk.runScript({ summary: "Plan hook reel", allowCommit: false, script: readScript(phrases, opt) });
    if (read.isError) throw new Error(read.output || "The Draft could not be read.");
    if (read.result == null) throw new Error("The plan was too large to return. Trim the Draft to a short first.");
    const current = read.result;
    if (current.wordCount === 0) throw new Error("This Draft has no transcript words to caption.");
    if (current.wordCount > MAX_WORDS) throw new Error("This Draft has " + current.wordCount + " words. The reel look is built for shorts; trim it under " + MAX_WORDS + " words first.");
    // A Draft that still carries an earlier reel doubles every caption, stacks two cameras on each clip,
    // and makes the renderer hand back finished frames instead of each clip's own canvas, which is what
    // the cut-out set is built from. Say so plainly rather than letting it fail in three odd ways.
    if (!appliedNow && current.overlays > 0) throw new Error("This Draft already has " + current.overlays + " graphic overlay" + (current.overlays === 1 ? "" : "s") + " on a video track, so a reel has been applied before. Use \u201cRemove reel pieces found on this Draft\u201d first, and take \u201cHook Captions Look\u201d off each Main clip in the Inspector \u2014 an effect cannot be removed through the SDK, so that part is by hand.");
    setPlan(current);
    const planGuard = `
${PLANNER}
const draft = selects.draft(${JSON.stringify(context.sequenceId)});
const project = selects.project(${JSON.stringify(context.projectId)});
const meta = await draft.meta();
const clips = await draft.clips({ trackScope: "all" });
const main = clips.filter((c) => c.trackKind === "main" && c.resourceId != null).sort((a, b) => a.startFrame - b.startFrame);
const rows = (await draft.words()).filter((w) => !w.nonSpeech && !w.cut).map((w) => [w.text, w.startFrame, w.endFrame]);
const plan = buildPlan(rows, ${JSON.stringify(phrases)}, ${JSON.stringify(opt)}, meta.fps, main);
if (plan.fingerprint !== ${JSON.stringify(current.fingerprint)}) throw new Error("The Draft changed while the reel was being prepared. Press Apply again.");
if (plan.endFrame <= 0) throw new Error("The Draft has no picture on its Main track.");
`;
    let sfxPath = null;
    let sfxResourceId = null;
    const cleanupSfx = async () => {
      if (brollResourceIds.length) await sdk.runScript({ summary: "Clean up unused B-roll", allowCommit: true, script: `return await selects.project(${JSON.stringify(context.projectId)}).deleteFiles({ resourceIds: ${JSON.stringify(brollResourceIds)} });` });
      if (!sfxResourceId) return;
      await sdk.runScript({ summary: "Clean up unused sound effects", allowCommit: true, script: `return await selects.project(${JSON.stringify(context.projectId)}).deleteFiles({ resourceIds: [${JSON.stringify(sfxResourceId)}] });` });
    };
    if (settings.sfx && current.events.length) {
      setStatus("Preparing " + current.events.length + " sound effects…");
      const job = String(context.sequenceId).replace(/[^a-zA-Z0-9_-]/g, "_") + "-" + Date.now();
      sfxPath = await generateSfx(current.events, current.endFrame / current.fps, job);
      setStatus("Importing the sound effects…");
      const imported = await sdk.runScript({
        summary: "Import reel sound effects",
        allowCommit: true,
        script: `const imported = await selects.project(${JSON.stringify(context.projectId)}).importFiles({ paths: [${JSON.stringify(sfxPath)}] });
const resourceId = imported.addedResourceIds?.[0];
if (!resourceId) throw new Error("The sound effects could not be imported into the Project.");
return { resourceId };`,
      });
      if (imported.isError) throw new Error(imported.output || "The sound effects could not be imported.");
      sfxResourceId = imported.result?.resourceId;
      if (typeof sfxResourceId !== "string") throw new Error("Selects did not return the imported sound effects.");
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    // B-roll: import the assigned clips into the Project once (immediate write), then place them in phase 1.
    let brollPlan = [];
    let brollResourceIds = [];
    let brollImportedNames = [];
    const wantBroll = Array.isArray(current.brolls) ? current.brolls : [];
    let brollNote = "";
    if (!wantBroll.length && (String(settings.pexelsKey || "").trim() || String(settings.brollDir || "").trim())) brollNote = " No broll: lines in the phrases, so no B-roll was placed (the key and folder only supply footage; each broll: line says where it goes).";
    if (wantBroll.length) {
      let pool = brollClips.slice();
      const dir = String(settings.brollDir || "").trim() || (dataRoot + "/broll");
      const hasKey = Boolean(String(settings.pexelsKey || "").trim());
      if (hasKey) {
        // Search for every phrase that names no local file and has no obvious local match; downloads join the pool.
        for (const b of wantBroll) {
          const named = b.file && pool.some((c) => c.name.toLowerCase().includes(String(b.file).toLowerCase()));
          if (named) continue;
          // The words after | name a file when one matches; otherwise they are the visual to search for
          // ("empty apartment" finds footage, "felt a deep sense of" does not).
          const phrase = (b.file && String(b.file).trim()) || String(b.text || "").replace(/^\s*b-?roll\s*:\s*/i, "").split("|")[0].trim();
          setStatus("Searching B-roll for \u201c" + phrase + "\u201d\u2026");
          const found = await searchBroll(phrase, dir, (b.end - b.start) / current.fps);
          if (found) { pool.push(found); b.file = found.name; }
        }
        if (pool.length > brollClips.length) setBrollClips(pool);
      }
      if (!pool.length) { await cleanupSfx(); throw new Error(hasKey ? "No B-roll was found for those phrases. Try different words or add a folder." : "Choose a B-roll folder or add a Pexels key first, or remove the broll: lines."); }
      // Assign, import what the assignment needs, and if a file will not import, drop it from the pool and
      // assign again (a couple of passes at most). A file already in the Project is reused; only the rest are
      // imported. What the Project holds afterwards is read back BY NAME - the import's own return value has
      // come back undefined on a renderer hiccup - and resource ids are renumbered when the app restarts, so
      // the record keeps the names of what this apply imported.
      let assigned = [];
      let names = [];
      let failedNames = [];
      for (let pass = 0; pass < 3; pass += 1) {
        assigned = assignBroll(wantBroll, pool, current.fps).filter((b) => b.clip);
        if (!assigned.length) break;
        const paths = [...new Set(assigned.map((b) => b.clip.path))];
        setStatus("Importing " + paths.length + " B-roll clip" + (paths.length === 1 ? "" : "s") + "…");
        const imported = await sdk.runScript({ summary: "Import B-roll", allowCommit: true, script: `const project = selects.project(${JSON.stringify(context.projectId)});
const wanted: string[] = ${JSON.stringify(paths)};
const base = (p: string) => p.split("/").pop() || p;
const same = (x: any, p: string) => String(x.name || "").toLowerCase() === base(p).toLowerCase();
const have = await project.resources();
const missing = wanted.filter((p) => !have.some((x: any) => same(x, p)));
let importError: string | null = null;
if (missing.length) { try { await project.importFiles({ paths: missing }); } catch (e) { importError = String((e as any)?.message ?? e).slice(0, 200); } }
const all = await project.resources();
const byName = (p: string) => all.find((x: any) => same(x, p));
const okNow = wanted.map((p) => byName(p)).filter(Boolean).map((x: any) => ({ id: x.resourceId, name: x.name }));
const importedNames = missing.map((p) => byName(p)).filter(Boolean).map((x: any) => x.name);
const failed = missing.filter((p) => !byName(p)).map(base);
return { names: okNow, importedNames, failed, importError };` });
        if (imported.isError) { await cleanupSfx(); throw new Error(imported.output || "The B-roll could not be imported."); }
        names = Array.isArray(imported.result?.names) ? imported.result.names : [];
        brollImportedNames = brollImportedNames.concat(Array.isArray(imported.result?.importedNames) ? imported.result.importedNames : []);
        const failed = Array.isArray(imported.result?.failed) ? imported.result.failed : [];
        if (!failed.length) break;
        failedNames = failedNames.concat(failed);
        pool = pool.filter((c) => !failed.some((f) => String(f).toLowerCase() === c.name.toLowerCase()));
        if (!pool.length) { await cleanupSfx(); throw new Error("None of the B-roll files could be imported into the Project" + (imported.result?.importError ? " (" + imported.result.importError + ")" : "") + ": " + failed.join(", ")); }
      }
      if (failedNames.length) brollNote += " " + failedNames.length + " B-roll file" + (failedNames.length === 1 ? "" : "s") + " would not import and " + (failedNames.length === 1 ? "was" : "were") + " skipped: " + failedNames.join(", ") + ".";
      brollResourceIds = names.filter((nm) => brollImportedNames.includes(nm.name)).map((nm) => nm.id);
      const idFor = (clip) => (names.find((n) => String(n.name || "").toLowerCase() === clip.name.toLowerCase()) || {}).id || null;
      brollPlan = assigned.filter((b) => idFor(b.clip)).map((b) => ({ id: b.id, resourceId: idFor(b.clip), width: b.clip.width, height: b.clip.height, sourceStart: Number(b.sourceStart) || 0 }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // The set. Rendered before anything is applied, because the matte is masked onto the clip's own
    // picture inside the effect, not onto the finished composite the text mattes use.
    const helperCheck = await sdk.runShell({ summary: "Check segmentation helper", command: "[ -x " + dq(CUTOUT_HELPER) + " ] && uname -m", timeoutMs: 10000 });
    const helperOk = !helperCheck.isError && helperCheck.exitCode === 0 && /arm64/.test(String(helperCheck.stdout || ""));
    const mains = await sdk.runScript({ summary: "List main clips", allowCommit: false, script: `const d = selects.draft(${JSON.stringify(context.sequenceId)});
const rows = (await d.clips({ trackScope: "main" })).filter((c) => c.resourceId != null).sort((a, b) => a.startFrame - b.startFrame);
const out = [];
for (const c of rows) { const t = await d.clipTransform(c); out.push({ clipId: c.clipId, startFrame: c.startFrame, endFrame: c.endFrame, scale: t.scale?.x ?? 1, posX: t.position?.x ?? 0, posY: t.position?.y ?? 0 }); }
return { main: out };` });
    const mainClips = Array.isArray(mains.result?.main) ? mains.result.main : [];
    // An effect left on a reframed Main clip would stack a second camera under the new one. It cannot be
    // listed, but it can be seen: a reframed clip's own canvas is letterboxed, and once an effect is on it
    // the renderer hands back the finished frame with no bars.
    setStatus("Checking the Main clips\u2026");
    if (await mainClipHasEffect(mainClips)) { await cleanupSfx(); throw new Error("A Main clip of this Draft still carries the \u201cHook Captions Look\u201d effect from an earlier reel. Select the Main clip, open its effects in the Inspector and remove it, then Apply again \u2014 an effect cannot be removed through the SDK."); }
    let cutouts = {};
    const stageHooks = current.heroes.filter((h) => h.style === "hook");
    if (settings.stageSet && stageHooks.length) {
      if (!helperOk) setStatus("Person segmentation is unavailable here (needs the person-cutout helper built as in INSTALL.md, Apple silicon, macOS 14+); hook titles play over the room instead of a cut-out set.");
      else {
        try {
          cutouts = await buildCutouts(current, stageHooks, mainClips);
        } catch (cause) {
          cutouts = {};
          setStatus("The set could not be built (" + String(cause?.message ?? cause) + "); hook titles play over the room instead.");
        }
      }
    }

    // Where is the speaker in each shot? Measured before anything is applied: it drives caption and
    // card placement in the graphic AND the point every camera zoom is aimed at in the effect.
    let faces = [];
    if ((settings.faceAnchor || settings.behindSpeaker) && !helperOk) setStatus("Person segmentation is unavailable here (needs the person-cutout helper built as in INSTALL.md, Apple silicon, macOS 14+); text uses reference proportions and stack hooks slide off the edge.");
    if (settings.faceAnchor && helperOk) {
      try {
        faces = facesToFrame(await measureFaces(current, mainClips), current, mainClips);
      } catch (cause) {
        faces = [];
        setStatus("Speaker measurement failed (" + String(cause?.message ?? cause) + "); using reference proportions.");
      }
    }

    // Phase 1: framing and look.
    let commit1 = null;
    let transforms = [];
    const lookParameters = { cameraStrength: settings.cameraStrength, cameraHeadroom: settings.cameraHeadroom, cutoutScale: settings.cutoutScale, cutoutDrop: settings.cutoutDrop, gridPitch: settings.gridPitch, backdropFill: true };
    if (settings.look || brollPlan.length) {
      setStatus("Placing B-roll and applying the look…");
      const script1 = planGuard + `
// B-roll: overlay each assigned clip over its phrase, cropped to fill the frame, muted, before the look is applied.
const BROLL: any[] = ${JSON.stringify(brollPlan)};
const CUTOUTS: any = ${JSON.stringify(cutouts)};
const FACES: any[] = ${JSON.stringify(faces)};
let brollPlaced = 0;
for (const b of BROLL) {
  const match = plan.brolls.find((x) => x.id === b.id);
  if (!match || !b.resourceId) continue;
  const before = (await draft.clips({ trackScope: "all" })).map((c) => c.clipId);
  // Each use of a clip starts at its own part of the source (assignBroll): spread across the clip, never the same stretch twice.
  await draft.overlayResource({ resource: project.resource(b.resourceId), over: await draft.rangeAtFrames(match.start, match.end), sourceStartSeconds: Number(b.sourceStart) || 0 });
  const after = await draft.clips({ trackScope: "all" });
  const placed = after.find((c) => !before.includes(c.clipId) && c.trackKind === "video");
  if (!placed) throw new Error("A B-roll clip could not be placed.");
  const extraAudio = after.filter((c) => !before.includes(c.clipId) && c.trackKind === "audio");
  if (extraAudio.length) await draft.removeClips(extraAudio);
  brollPlaced += 1;
}
const originals = [];
const panX: number = ${JSON.stringify(Number(settings.panX) || 0)};
const tight: number = ${JSON.stringify(Number(settings.tightCrop) || 1)};
let effects = 0;
// Grade every resource-backed picture clip: Main clips and the sharp copies a vertical reframe places on video tracks.
const pictureClips = (${JSON.stringify(Boolean(settings.look))} ? await draft.clips({ trackScope: "all" }) : []).filter((c) => (c.trackKind === "main" || c.trackKind === "video") && c.resourceId != null).sort((a, b) => a.startFrame - b.startFrame);
for (const original of pictureClips) {
  // Every edit verb evolves the working copy, so the row must be re-read right before it is targeted.
  const freshClip = async () => {
    const row = (await draft.clips({ trackScope: "all" })).find((c) => c.clipId === original.clipId && c.trackKind === original.trackKind);
    if (!row) throw new Error("A Main clip changed while the reel was being applied. Press Apply again.");
    return row;
  };
  // The look fills the frame (a wide shot is cropped to vertical); the clip's own Transform pans and tightens
  // the picture under it. Transform scale is absolute, so multiply the clip's current value.
  if ((panX !== 0 || tight !== 1) && original.trackKind === "main") {
    const current = await draft.clipTransform(await freshClip());
    originals.push({ clipId: original.clipId, transform: current });
    await draft.setClipTransform({
      clip: await freshClip(),
      ...(panX !== 0 ? { position: { x: panX } } : {}),
      ...(tight !== 1 ? { scale: { x: current.scale.x * tight, y: current.scale.y * tight } } : {}),
    });
  }
  const brollHere = BROLL.find((b: any) => {
    const m = plan.brolls.find((x) => x.id === b.id);
    return m && original.trackKind === "video" && m.start >= original.startFrame - 2 && m.start <= original.startFrame + 2;
  });
  // A B-roll clip that is not the frame's shape sits letterboxed, and an effect can only paint its own
  // canvas, so the room would show in the bars. Scale the clip until its picture covers the frame; the
  // card and the grid inside the effect divide that scale back out.
  if (original.trackKind === "video" && brollHere && brollHere.width && brollHere.height) {
    const a = brollHere.width / brollHere.height;
    const bw = Math.min(meta.frameSize.width, meta.frameSize.height * a);
    const cover = Math.max(meta.frameSize.width / bw, meta.frameSize.height / (bw / a));
    if (cover > 1.001) await draft.setClipTransform({ clip: await freshClip(), scale: { x: cover, y: cover } });
  }
  const clip = await freshClip();
  // What the clip's own Transform does to everything this effect draws, so the camera can undo it.
  const ct = await draft.clipTransform(clip);
  const tScale = Math.abs(ct.scale?.x) > 0.001 ? Math.abs(ct.scale.x) : 1;
  // A percent of the effect's canvas is worth tScale percent of the frame across, but the canvas is the
  // source band, so down it is worth a different amount. The band's shape comes from the set pass or the
  // face pass; with neither, the width ratio stands in for both.
  const bandHere = CUTOUTS[String(clip.clipId)]?.bandAspect ?? (FACES.find((r: number[]) => r[0] === clip.startFrame) || [])[6] ?? (brollHere && brollHere.height ? brollHere.width / brollHere.height : null);
  const panDivX = tScale;
  const panDivY = bandHere ? (tScale * meta.frameSize.width) / (bandHere * meta.frameSize.height) : tScale;
  const clipOriginX = 50 - ((ct.position?.x ?? 0) * meta.frameSize.height) / (tScale * meta.frameSize.width);
  const clipOriginY = 50 - (ct.position?.y ?? 0) / panDivY;
  // The camera plan in this clip's own frames. A move already running when the clip starts keeps its
  // negative start so it carries across the cut, exactly as the reference's title push-in does.
  const camera = plan.camera
    .filter((g: any) => g.at + g.d > clip.startFrame && g.at < clip.endFrame)
    .map((g: any) => Object.assign({}, g, { at: g.at - clip.startFrame }));
  // A B-roll clip gets only the B-roll ranges that cover it; a hook's set range handed to it as well would
  // end first and fire the card's exit early (seen: the card slid out and came back). The Main clip gets
  // every range, since it paints the grid under the cards too.
  const stage = plan.stage
    .filter((b: number[]) => b[1] > clip.startFrame && b[0] < clip.endFrame && (clip.trackKind !== "video" || b[4] === 2))
    .map((b: number[]) => [b[0] - clip.startFrame, b[1] - clip.startFrame, b[2], b[3], b[4]]);
  await draft.addVideoEffect({
    clip,
    label: "Hook Captions Look",
    tsxCode: ${JSON.stringify(LOOK_TSX)},
    parameters: Object.assign(${JSON.stringify(lookParameters)}, { camera, stage, uid: effects, width: meta.frameSize.width, height: meta.frameSize.height, fps: meta.fps, clipScale: tScale, clipOriginX, clipOriginY, cutout: CUTOUTS[String(clip.clipId)] ?? null, ...(() => {
      // [start, end, chin%, eyes%, headTop%, headX%] for this shot: the camera aims at the middle of the face.
      const f = FACES.find((r: number[]) => r[0] === clip.startFrame);
      return f ? { faceX: f[5], faceY: f[3] + 0.35 * (f[2] - f[3]) } : {};
    })(), sourceAspect: brollHere && brollHere.height ? brollHere.width / brollHere.height : 0, panDivX, panDivY }),
    editableParameters: ${JSON.stringify(LOOK_PARAMETERS)},
  });
  effects += 1;
}
const saved = await draft.commitAll("Podcast Hook Captions: B-roll and look");
return { commitId: saved.commitId ?? null, effects, transforms: originals, brollPlaced };
`;
      const r1 = await sdk.runScript({ summary: "Apply reel look", allowCommit: true, script: script1 });
      if (r1.isError) { await cleanupSfx(); throw new Error(r1.output || "Selects could not apply the look."); }
      commit1 = r1.result?.commitId ?? null;
      transforms = Array.isArray(r1.result?.transforms) ? r1.result.transforms : [];
      await new Promise((resolve) => setTimeout(resolve, 300));
    }


    // Phase 2b: speaker mattes from the finished frames - set titles stand behind the head (first, they
    // matter most), stack hooks park behind the speaker (optional; falls back to sliding off the edge).
    let behind = {};
    let matteNote = "";
    const setHookIds = stageHooks.filter((h) => mainClips.some((c) => cutouts[String(c.clipId)] && h.start >= c.startFrame && h.start < c.endFrame)).map((h) => h.id);
    const stackHeroes = current.heroes.filter((h) => h.style === "stack" && typeof h.slideStart === "number");
    const matteItems = current.heroes.filter((h) => h.style === "hook" && setHookIds.includes(h.id)).map((h) => ({ id: h.id, from: h.start, to: h.end, rate: 8 }))
      .concat(settings.behindSpeaker ? stackHeroes.map((h) => ({ id: h.id, from: h.slideStart, to: h.end, rate: 15 })) : []);
    if (helperOk && matteItems.length) {
      try {
        behind = await buildMattes(current, matteItems);
        const missing = matteItems.filter((it) => !behind[it.id]).length;
        if (missing) matteNote = " " + missing + " hook" + (missing === 1 ? "" : "s") + " could not be masked behind the speaker (matte budget).";
      } catch (cause) {
        behind = {};
        matteNote = " Speaker mattes failed (" + String(cause?.message ?? cause) + "), so titles sit over the picture and stack hooks slide off the edge.";
      }
    }

    // Phase 3: captions, hook titles and sound.
    setStatus("Adding captions, hook titles" + (sfxResourceId ? " and sound" : "") + "…");
    // The key-word face travels with the panel as a data URL (a file: URL does not load in the renderer).
    let heroFontData = "";
    try {
      const fontText = new TextDecoder().decode(new Uint8Array(await service("FileSystem", "readFile").readFile(pluginRoot + "/fonts/SixCaps-Regular.woff2.b64"))).replace(/\s+/g, "");
      if (fontText.length > 1000) heroFontData = fontText;
    } catch { heroFontData = ""; }
    const captionParameters = {
      heroFontData, heroSqueeze: settings.heroSqueeze,
      width: current.frameSize.width, height: current.frameSize.height, fps: current.fps,
      accent: settings.accent, fontFamily: settings.fontFamily, heroFontFamily: settings.heroFontFamily,
      captionSize: settings.captionSize, heroSize: settings.heroSize, captionY: settings.captionY, glow: settings.glow,
      wordHoldSeconds: settings.wordHoldSeconds, gridOpacity: settings.gridOpacity, roundedFrame: settings.roundedFrame,
      cornerRadius: settings.cornerRadius, flashStrength: settings.flashStrength, leadPills: settings.leadPills, parkX: settings.parkX,
      cameraStrength: settings.cameraStrength, cameraHeadroom: settings.cameraHeadroom,
      // hooks whose shot carries a cut-out set: title at the top behind the head, no reveal pan
      setHooks: setHookIds, cutoutDrop: settings.cutoutDrop,
    };
    const script2 = planGuard + `
const BEHIND: any = ${JSON.stringify(behind)};
const target = await draft.rangeAtFrames(0, plan.endFrame);
const graphic = await draft.addMotionGraphic({
  within: target,
  label: "Hook Captions",
  tsxCode: ${JSON.stringify(CAPTIONS_TSX)},
  parameters: Object.assign(${JSON.stringify(captionParameters)}, {
    words: plan.words.map((w) => [w[0], w[1], w[2]]),
    heroes: plan.heroes.map((h) => Object.assign({ id: h.id, style: h.style, lead: h.lead, key: h.key, start: h.start, keyStart: h.keyStart, keyEnd: h.keyEnd, end: h.end, slideStart: h.slideStart, exitAt: h.exitAt, blowAt: h.blowAt, open: h.open === true }, BEHIND[h.id] ? { behind: BEHIND[h.id] } : {})),
    cuts: plan.cuts,
    brolls: plan.brolls.map((b) => [b.start, b.end]),
    camera: plan.camera,
    shots: plan.shots,
    stage: plan.stage,
    faces: ${JSON.stringify(faces)},
  }),
  editableParameters: ${JSON.stringify(CAPTION_PARAMETERS)},
});
let audio = null;
const sfxResourceId = ${JSON.stringify(sfxResourceId)};
if (sfxResourceId) {
  const over = await draft.rangeAtFrames(0, plan.endFrame);
  audio = await draft.overlayResource({ resource: project.resource(sfxResourceId), over });
}
const saved = await draft.commitAll("Podcast Hook Captions: captions and sound");
return { commitId: saved.commitId ?? null, graphicClipId: graphic.clipId, heroes: plan.heroes.length, unmatched: plan.unmatched, audioAtFrame: audio ? audio.atFrame : null };
`;
    // The edit script has a size ceiling. Over it, drop the stack mattes first (they only park a block),
    // then the title mattes (titles then sit over the picture).
    let scriptOut = script2;
    if (scriptOut.length > 260000) {
      const hooksOnly = {};
      for (const id of Object.keys(behind)) if (setHookIds.includes(Number(id))) hooksOnly[id] = behind[id];
      behind = hooksOnly;
      scriptOut = script2.replace(/const BEHIND: any = [^\n]*\n/, "const BEHIND: any = " + JSON.stringify(behind) + ";\n");
      matteNote = " The speaker mattes were too large for one edit, so stack hooks slide off the edge instead.";
      if (scriptOut.length > 260000) { behind = {}; scriptOut = script2.replace(/const BEHIND: any = [^\n]*\n/, "const BEHIND: any = {};\n"); matteNote = " The speaker mattes were too large for one edit, so titles sit over the picture and stack hooks slide off the edge."; }
    }
    const result = await sdk.runScript({ summary: "Apply podcast hook reel", allowCommit: true, script: scriptOut });
    if (result.isError) {
      if (commit1) await sdk.runScript({ summary: "Undo reel look", allowCommit: true, script: `return await selects.draft(${JSON.stringify(context.sequenceId)}).revertCommit(${JSON.stringify(commit1)});` });
      await cleanupSfx();
      throw new Error(result.output || "Selects could not apply the reel.");
    }
    const commit2 = result.result?.commitId ?? null;
    const record = { commitIds: [commit2, commit1].filter(Boolean), commitId: commit2, sfxResourceId, brollResourceIds, brollNames: brollImportedNames, graphicClipId: result.result?.graphicClipId ?? null, transforms, appliedAt: Date.now(), heroes: result.result?.heroes ?? 0 };
    // Stored even when this panel was reloaded meanwhile: the commits happened, and the next panel must know.
    localStorage.setItem(storageKey(seq), JSON.stringify(record));
    if (!alive.current) return;
    setApplied(record);
    const unmatched = Array.isArray(result.result?.unmatched) ? result.result.unmatched : [];
    const parked = Object.keys(behind).length;
    setStatus(brollNote + "Applied: captions on every word, " + (faces.length ? "placed around the speaker in " + faces.length + " shot" + (faces.length === 1 ? "" : "s") + ", " : "") + (brollPlan.length ? brollPlan.length + " B-roll clip" + (brollPlan.length === 1 ? "" : "s") + ", " : "") + (result.result?.heroes ?? 0) + " hook title" + ((result.result?.heroes ?? 0) === 1 ? "" : "s") + (parked ? " (" + parked + " parked behind the speaker)" : "") + (settings.look ? ", the look on " + current.mainClips + " clip" + (current.mainClips === 1 ? "" : "s") : "") + (sfxResourceId ? ", synced sound" : "") + "." + matteNote + (unmatched.length ? " Not found in the transcript: " + unmatched.join(" · ") : ""));
    } finally {
      clearInterval(beatTimer);
      try { localStorage.removeItem(busyKey(seq)); } catch {}
    }
  });

  // Removal that does not depend on history: find the reel's own pieces and delete them.
  const removeScript = (record) => `
const draft = selects.draft(${JSON.stringify(context.sequenceId)});
const project = selects.project(${JSON.stringify(context.projectId)});
const record: any = ${JSON.stringify(record || {})};
const meta = await draft.meta();
const pattern = new RegExp("^" + ${JSON.stringify(String(context.sequenceId).replace(/[^a-zA-Z0-9_-]/g, "_"))} + "-[0-9]+\\\\.wav$");
const sfxIds = new Set((await project.resources()).filter((r) => typeof r.name === "string" && pattern.test(r.name)).map((r) => r.resourceId));
if (typeof record.sfxResourceId === "string") sfxIds.add(record.sfxResourceId);
let clips = await draft.clips({ trackScope: "all" });
const candidates = clips.filter((c) => c.trackKind === "video" && c.resourceId == null && (c.clipId === record.graphicClipId || (c.startFrame === 0 && c.endFrame >= meta.durationFrames - 1)));
const graphic = candidates.find((c) => c.clipId === record.graphicClipId) || (candidates.length === 1 ? candidates[0] : null);
const removed = { graphic: false, audio: 0, broll: 0, transforms: 0 };
const problems: string[] = [];
const attempt = async (name: string, fn: () => Promise<void>) => { try { await fn(); } catch (e) { problems.push(name + ": " + String((e as any)?.message ?? e).slice(0, 160)); } };
if (graphic) await attempt("graphic", async () => { await draft.removeClips(graphic); removed.graphic = true; });
clips = await draft.clips({ trackScope: "all" });
const audio = clips.filter((c) => c.trackKind === "audio" && c.resourceId != null && sfxIds.has(c.resourceId));
if (audio.length) await attempt("sound", async () => { await draft.removeClips(audio); removed.audio = audio.length; });
// B-roll: the clips this reel placed, found by the file names it imported (ids are renumbered when the app restarts).
const brollNames = new Set((Array.isArray(record.brollNames) ? record.brollNames : []).map((x: string) => String(x).toLowerCase()));
const brollIds = new Set((await project.resources()).filter((r) => brollNames.has(String(r.name || "").toLowerCase())).map((r) => r.resourceId));
for (const id of Array.isArray(record.brollResourceIds) ? record.brollResourceIds : []) if (brollNames.size === 0) brollIds.add(id);
clips = await draft.clips({ trackScope: "all" });
const brollClips = clips.filter((c) => c.trackKind === "video" && c.resourceId != null && brollIds.has(c.resourceId));
if (brollClips.length) await attempt("B-roll", async () => { await draft.removeClips(brollClips); removed.broll = brollClips.length; });
for (const t of Array.isArray(record.transforms) ? record.transforms : []) {
  clips = await draft.clips({ trackScope: "all" });
  const clip = clips.find((c) => c.clipId === t.clipId && c.trackKind === "main");
  if (!clip || !t.transform) continue;
  await attempt("framing", async () => { await draft.setClipTransform({ clip, enabled: t.transform.enabled, position: t.transform.position, scale: t.transform.scale, rotation: t.transform.rotation, anchor: t.transform.anchor }); removed.transforms += 1; });
}
let commitId = null;
let commitError = null;
if (removed.graphic || removed.audio || removed.broll || removed.transforms) {
  // Right after an app update the first commit has been seen to fail once; a second try goes through.
  // (No timers in this sandbox, so the retry is immediate.)
  for (let tries = 0; tries < 2 && commitId == null; tries += 1) {
    try { const saved = await draft.commitAll("Remove Podcast Hook Captions"); commitId = saved.commitId ?? null; commitError = null; }
    catch (e) { commitError = String((e as any)?.message ?? e).slice(0, 200); }
  }
}
clips = await draft.clips({ trackScope: "all" });
return { removed, commitId, commitError, problems, sfxResourceIds: [...sfxIds], brollResourceIds: [...brollIds], ambiguousGraphics: candidates.length > 1 && !graphic, mainClips: clips.filter((c) => c.trackKind === "main").length };
`;

  const remove = () => run(async () => {
    if (!context.sequenceId || !context.projectId) throw new Error("Open a Draft first.");
    const other = runningApply(context.sequenceId);
    if (other) throw new Error("An Apply is still running on this Draft (started " + new Date(Number(other.startedAt)).toLocaleTimeString() + "). Wait for it to finish, then Remove.");
    const record = applied || readRecord(context.sequenceId) || {};
    setStatus("Removing the Hook Captions…");
    const ids = Array.isArray(record.commitIds) && record.commitIds.length ? record.commitIds : (record.commitId ? [record.commitId] : []);
    let reverted = 0;
    for (const id of ids) {
      const r = await sdk.runScript({ summary: "Revert podcast hook reel", allowCommit: true, script: `return await selects.draft(${JSON.stringify(context.sequenceId)}).revertCommit(${JSON.stringify(id)});` });
      if (r.isError) break;
      reverted += 1;
    }
    let report;
    if (ids.length && reverted === ids.length) {
      const gone = [record.sfxResourceId, ...(Array.isArray(record.brollResourceIds) ? record.brollResourceIds : [])].filter(Boolean);
      if (gone.length) await sdk.runScript({ summary: "Delete reel media", allowCommit: true, script: `return await selects.project(${JSON.stringify(context.projectId)}).deleteFiles({ resourceIds: ${JSON.stringify(gone)} });` });
      report = "Removed the Hook Captions by reverting its " + (ids.length === 1 ? "commit." : "commits.");
    } else {
      const r = await sdk.runScript({ summary: "Remove podcast hook reel pieces", allowCommit: true, script: removeScript(record) });
      if (r.isError) {
        // Do not leave a record behind that would block Apply; the Draft can still be cleaned by hand.
        try { localStorage.removeItem(storageKey(context.sequenceId)); } catch {}
        setApplied(null);
        throw new Error((r.output || "Selects could not remove the reel pieces.") + " Close and reopen the Draft, then press Remove again for anything still on it.");
      }
      const res = r.result || {};
      const media = [...new Set([...(Array.isArray(res.sfxResourceIds) ? res.sfxResourceIds : []), ...(Array.isArray(res.brollResourceIds) ? res.brollResourceIds : [])])];
      if (media.length && res.commitId) await sdk.runScript({ summary: "Delete reel media", allowCommit: true, script: `return await selects.project(${JSON.stringify(context.projectId)}).deleteFiles({ resourceIds: ${JSON.stringify(media)} });` });
      const parts = [];
      if (res.removed?.graphic) parts.push("captions and hook titles");
      if (res.removed?.audio) parts.push("sound effects");
      if (res.removed?.broll) parts.push(res.removed.broll + " B-roll clip" + (res.removed.broll === 1 ? "" : "s"));
      if (res.removed?.transforms) parts.push("clip framing restored");
      report = (parts.length ? "Removed " + parts.join(", ") + "." : "Nothing of the reel was found on this Draft.")
        + (res.commitError ? " The removal could not be saved (" + res.commitError + "): close and reopen the Draft, then press Remove again." : "")
        + (Array.isArray(res.problems) && res.problems.length ? " Skipped: " + res.problems.join("; ") + "." : "")
        + (res.ambiguousGraphics ? " Two full-length graphics were found, so neither was removed; delete the Hook Captions clip by hand." : "")
        + (ids.length ? " Its commits could not be reverted (the Draft changed, or the app restarted since), so the Hook Captions Look effect stays on " + (res.mainClips || 0) + " Main clip" + (res.mainClips === 1 ? "" : "s") + " until you remove it per clip in the Inspector (select the clip, open its effects)." : "");
    }
    try { localStorage.removeItem(storageKey(context.sequenceId)); } catch {}
    setApplied(null);
    await refresh();
    setStatus(report);
  });

  const number = (key, label, min, max, step) => (
    <div key={key} style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label htmlFor={"phr-" + key} style={{ flex: 1, margin: 0, minWidth: 0 }}>{label}</label>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{settings[key]}</span>
      </div>
      <input id={"phr-" + key} type="range" min={min} max={max} step={step} value={settings[key]} onChange={(e) => set(key, Number(e.target.value))} />
    </div>
  );
  const toggle = (key, label) => (
    <label key={key} htmlFor={"phr-" + key} style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
      <input id={"phr-" + key} type="checkbox" checked={Boolean(settings[key])} onChange={(e) => set(key, e.target.checked)} style={{ width: "auto" }} />
      <span style={{ color: "var(--panel-fg)" }}>{label}</span>
    </label>
  );

  const fps = draftInfo?.fps || 30;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <h2>Podcast Hook Captions</h2>
      <small style={{ color: "var(--panel-muted-fg)" }}>Word-pop captions on every spoken word, kinetic hook titles, a warm punch-in look, and synced whoosh / pop / impact sounds, all on the Draft you have open.</small>

      <h3>Hooks</h3>
      <label htmlFor="phr-phrases">One per line (or ; separated): hook / punch / stack: lead-in | KEY WORDS, or broll: words it covers</label>
      <textarea id="phr-phrases" rows={6} value={phrases} onChange={(e) => editPhrases(e.target.value)} style={{ fontFamily: "inherit", minHeight: 120 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button data-variant="secondary" style={{ width: "auto" }} disabled={busy || !draftInfo} onClick={() => run(() => refresh())}>Match hooks</button>
        <button data-variant="ghost" style={{ width: "auto" }} disabled={busy || !draftInfo} onClick={suggest}>Suggest with AI</button>
      </div>
      {plan?.heroes?.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th style={{ textAlign: "left" }}>Hook</th><th>At</th></tr></thead>
            <tbody>
              {plan.heroes.map((h, i) => (
                <tr key={i}><td style={{ whiteSpace: "nowrap" }}>{h.style}: {h.text.replace(/^(hook|punch|stack)\s*:\s*/i, "")}</td><td>{fmt(h.keyStart, fps)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {plan?.unmatched?.length > 0 && <small style={{ color: "var(--panel-danger)" }}>Not in the transcript: {plan.unmatched.join(" · ")}</small>}
      {plan?.notes?.length > 0 && <small style={{ color: "var(--panel-muted-fg)" }}>{plan.notes.join(" ")}</small>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button data-variant="secondary" style={{ width: "auto" }} disabled={busy} onClick={chooseBroll}>{settings.brollDir ? "Change B-roll folder" : "Choose B-roll folder…"}</button>
        {settings.brollDir && <button data-variant="ghost" style={{ width: "auto" }} disabled={busy} onClick={() => { setBrollDir(""); setBrollClips([]); }}>Clear</button>}
      </div>
      {settings.brollDir && <small style={{ color: "var(--panel-muted-fg)", overflowWrap: "anywhere" }}>{brollClips.length} clip{brollClips.length === 1 ? "" : "s"} in {settings.brollDir}. Lines like  broll: the words it covers | part of a file name  place them cropped to fill, graded, with the grid and a flash.</small>}
      {plan?.brolls?.length > 0 && <small>{plan.brolls.length} B-roll span{plan.brolls.length === 1 ? "" : "s"}: {plan.brolls.map((b) => fmt(b.start, fps) + "–" + fmt(b.end, fps)).join(", ")}</small>}
      <label htmlFor="phr-pexels">Pexels API key (optional, free): search B-roll by phrase</label>
      <input id="phr-pexels" type="password" value={settings.pexelsKey} onChange={(e) => setPexelsKey(e.target.value)} placeholder="paste key to enable search" autoComplete="off" />
      {settings.pexelsKey && <small style={{ color: "var(--panel-muted-fg)" }}>A broll: phrase with no matching local file is searched on Pexels (vertical, medium size), downloaded once into the B-roll folder, and used like a local clip.</small>}

      <hr />
      <h3>Captions</h3>
      <label htmlFor="phr-accent">Accent color</label>
      <input id="phr-accent" type="color" value={settings.accent} onChange={(e) => set("accent", e.target.value)} />
      <label htmlFor="phr-fontFamily">Caption font (installed family)</label>
      <input id="phr-fontFamily" type="text" value={settings.fontFamily} onChange={(e) => set("fontFamily", e.target.value)} placeholder="Montserrat" />
      <label htmlFor="phr-heroFontFamily">Hero font (condensed)</label>
      <input id="phr-heroFontFamily" type="text" value={settings.heroFontFamily} onChange={(e) => set("heroFontFamily", e.target.value)} placeholder="Bebas Neue or Anton if installed, else Helvetica Neue Condensed Black" />
      {number("captionSize", "Caption size", 30, 140, 1)}
      {number("heroSize", "Hero size", 60, 320, 1)}
      {number("captionY", "Caption height (%)", 10, 90, 1)}
      {number("holdSeconds", "Hook hold (s)", 0.5, 6, 0.1)}
      {number("gridOpacity", "Grid opacity", 0, 1, 0.02)}
      {toggle("leadPills", "Lead-in words in pills")}
      {toggle("faceAnchor", "Place text relative to the speaker's face")}
      {settings.faceAnchor && <small style={{ color: "var(--panel-muted-fg)" }}>Measures the speaker once per shot (a few seconds each): captions and cards sit under the chin, a hook title goes above the head when there is room.</small>}
      {toggle("behindSpeaker", "Park stack hooks behind the speaker")}
      {settings.behindSpeaker && <small style={{ color: "var(--panel-muted-fg)" }}>Renders the finished frames and finds the speaker, about 10 seconds per stack hook. The look is saved first so the mattes match the final picture.</small>}
      {toggle("roundedFrame", "Rounded phone frame")}
      {toggle("flashOnCuts", "Flash + riser on picture cuts")}

      <hr />
      <h3>Look and sound</h3>
      {toggle("look", "Push-ins and slow zoom (no colour grade)")}
      {settings.look && (
        <button data-variant="ghost" style={{ width: "auto" }} onClick={() => setShowLook((v) => !v)}>{showLook ? "Hide look settings" : "Look settings"}</button>
      )}
      {settings.look && showLook && toggle("stageSet", "Cut the speaker onto a grid set under hook titles")}
      {settings.look && showLook && number("cameraStrength", "Camera strength", 0, 1.5, 0.05)}
      {settings.look && showLook && number("cameraHeadroom", "Camera headroom", 1, 1.6, 0.01)}
      {number("heroSqueeze", "Key word squeeze", 0.6, 2, 0.05)}
      {settings.look && showLook && number("backdropDepth", "Backdrop mode depth", 0, 1, 0.05)}
      {settings.look && showLook && number("tightCrop", "Tight crop (x)", 1, 1.6, 0.05)}
      {settings.look && showLook && number("panX", "Pan every clip (% of height)", -60, 60, 1)}
      {settings.look && showLook && <small style={{ color: "var(--panel-muted-fg)" }}>The look fills the frame, so a wide shot is cropped to vertical. Tight crop and pan go through each clip's own Transform; reframe single clips later in the Inspector.</small>}
      {toggle("sfx", "Sound effects (synthesized)")}
      {settings.sfx && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button data-variant="secondary" style={{ width: "auto" }} disabled={busy} onClick={chooseLibrary}>{settings.sfxLibrary ? "Change sound library" : "Use my sound library…"}</button>
          {settings.sfxLibrary && <button data-variant="ghost" style={{ width: "auto" }} disabled={busy} onClick={() => setLibrary("")}>Synthesize instead</button>}
        </div>
      )}
      {settings.sfx && <small style={{ color: "var(--panel-muted-fg)", overflowWrap: "anywhere" }}>{settings.sfxLibrary ? "Whoosh, impact, riser and tick files are chosen from " + settings.sfxLibrary + " by folder and file name; a whoosh lands its loudest moment on the word." : "No library chosen: sounds are synthesized (sub hit with a reverb tail, doppler whoosh, tension riser). A real library sounds better."}</small>}
      {settings.sfx && toggle("popEveryWord", "Tick on every word")}
      {settings.sfx && number("sfxGain", "SFX level", 0, 1.5, 0.05)}

      <hr />
      {applied ? (
        <button data-variant="secondary" onClick={remove} disabled={busy}>{busy ? "Working…" : "Remove Hook Captions"}</button>
      ) : (
        <button onClick={apply} disabled={busy || !draftInfo}>{busy ? "Working…" : "Apply to this Draft"}</button>
      )}
      {!applied && draftInfo && <button data-variant="ghost" onClick={remove} disabled={busy}>Remove reel pieces found on this Draft</button>}
      {status && <small>{status}</small>}
      {error && <small style={{ color: "var(--panel-danger)" }}>{error}</small>}
      <small style={{ color: "var(--panel-muted-fg)" }}>Apply saves one undoable commit. Every caption and effect stays editable in the Inspector (accent, fonts, sizes, camera strength, headroom). Remove reverts that commit and deletes the generated sound file.</small>
    </div>
  );
}
