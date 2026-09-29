// Torn Paper Love "Ransom letters": two words of cut-out paper chips, one chip per letter,
// each letter re-styling among its own 2-4 looks on the music grid (data.ticks).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

// tpl-letters:start
// Pure helpers (no DOM, no React); the tests and the panel preview run this block as is.
var TPL_MAX_LETTERS = 8;
var TPL_CAP_RATIO = 0.7; // cap height / font size used to turn the glyph height into a font size
var TPL_PAD_MIN = 0.08, TPL_PAD_MAX = 0.14; // chip padding, fraction of the glyph height
var TPL_ROT_MAX = 4; // degrees
var TPL_JITTER_MAX = 0.04; // baseline jitter, fraction of the glyph height
var TPL_GAP = 0.03; // space between chips, fraction of the glyph height
var TPL_LEFT = 0.05, TPL_RIGHT = 0.94, TPL_BAND = 0.32, TPL_MIN_GLYPH = 0.045;
var TPL_FALLBACK_EM = 0.75, TPL_WIDE_EM = 1.0, TPL_SPACE_EM = 0.3, TPL_DEFAULT_EM = 0.6;
var TPL_HEART = { ch: "\u2665", em: 0.9 };
var TPL_ACCENT_BASE = "#d0201a";
var TPL_SUPPORTED = /^[A-Za-z0-9.,!?&'\-]$/;

// Seeded random stream from a seed and salts (FNV-1a hash into mulberry32).
function tplRng() {
  var s = Array.prototype.join.call(arguments, "|");
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  var a = h >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Trimmed word -> at most 8 graphemes; inner whitespace runs become one " " gap.
function tplGraphemes(text) {
  if (typeof text !== "string") return [];
  var t = text.trim().replace(/\s+/g, " ");
  if (!t) return [];
  var out = [];
  if (typeof Intl !== "undefined" && Intl && typeof Intl.Segmenter === "function") {
    var it = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t);
    for (var seg of it) { out.push(seg.segment); if (out.length >= TPL_MAX_LETTERS) break; }
  } else {
    out = Array.from(t).slice(0, TPL_MAX_LETTERS);
  }
  return out;
}

function tplSupported(ch) {
  return ch === TPL_HEART.ch || (typeof ch === "string" && TPL_SUPPORTED.test(ch));
}

function tplKind(ch) {
  if (ch === " ") return "space";
  if (ch === TPL_HEART.ch) return "heart";
  return tplSupported(ch) ? "glyph" : "fallback";
}

// The character a look shows for a typed letter.
function tplCased(ch, look) {
  if (!look || look.case === "any") return ch;
  return look.case === "lower" ? ch.toLowerCase() : ch.toUpperCase();
}

// Advance table lookup (per 1000 em) -> em; null when the face lacks the character.
function tplFaceEm(advance, face, ch) {
  var t = advance && advance[face];
  if (!t) return null;
  var v = t[ch];
  return typeof v === "number" && isFinite(v) && v > 0 ? v / 1000 : null;
}

// Width in em of a letter: the widest of the given faces (all faces of the table when
// null), upper and lower case both counted so the slot fits every look of the letter.
function tplLetterEm(ch, faces, advance) {
  var kind = tplKind(ch);
  if (kind === "space") return TPL_SPACE_EM;
  if (kind === "heart") return TPL_HEART.em;
  if (kind === "fallback") {
    var cp = ch.codePointAt(0) || 0;
    return cp >= 0x1100 ? TPL_WIDE_EM : TPL_FALLBACK_EM;
  }
  var list = faces || Object.keys(advance || {});
  var best = 0;
  for (var i = 0; i < list.length; i++) {
    var cs = [ch.toUpperCase(), ch.toLowerCase()];
    for (var j = 0; j < cs.length; j++) {
      var e = tplFaceEm(advance, list[i], cs[j]);
      if (e != null && e > best) best = e;
    }
  }
  return best > 0 ? best : TPL_DEFAULT_EM;
}

// Per letter a seeded set of 2-4 distinct look ids. The first id is the letter's look at
// tick 0 and differs from its neighbour's when possible; at most one lower-case look per
// letter; a look whose face lacks the (cased) glyph is not offered. Gaps and unsupported
// characters get [] (no chip / fallback chip).
function tplAssignLooks(letters, seed, looks, advance) {
  var out = [];
  var prevFirst = null;
  for (var i = 0; i < letters.length; i++) {
    var ch = letters[i];
    var kind = tplKind(ch);
    if (kind === "space" || kind === "fallback") { out.push([]); continue; }
    var cands = [];
    for (var k = 0; k < (looks || []).length; k++) {
      var lk = looks[k];
      if (!lk || typeof lk.id !== "string") continue;
      if (kind === "glyph" && advance && advance[lk.face] && tplFaceEm(advance, lk.face, tplCased(ch, lk)) == null) continue;
      cands.push(lk);
    }
    var rnd = tplRng(seed, "looks", i);
    for (var s = cands.length - 1; s > 0; s--) { var r = Math.floor(rnd() * (s + 1)); var tmp = cands[s]; cands[s] = cands[r]; cands[r] = tmp; }
    var want = 2 + Math.floor(rnd() * 3);
    var set = [], lower = false;
    for (var c = 0; c < cands.length && set.length < want; c++) {
      if (cands[c].case === "lower") { if (lower) continue; lower = true; }
      set.push(cands[c].id);
    }
    if (prevFirst != null && set.length > 1 && set[0] === prevFirst) { var t0 = set[0]; set[0] = set[1]; set[1] = t0; }
    if (prevFirst != null && set[0] === prevFirst) {
      // Only one look chosen so far: try any other candidate for the opening look.
      for (var d = 0; d < cands.length; d++) if (cands[d].id !== prevFirst && set.indexOf(cands[d].id) < 0) { set[0] = cands[d].id; break; }
    }
    out.push(set);
    prevFirst = set.length ? set[0] : prevFirst;
  }
  return out;
}

// Look ids of every letter at a tick. Each tick a seeded ~40 % of the letters that have
// more than one look switch to another of their looks; at least one letter keeps its look.
function tplLooksAt(tick, seed, assigned) {
  var n = assigned.length;
  var idx = [];
  var eligible = [], styled = 0;
  for (var i = 0; i < n; i++) {
    idx.push(0);
    if (assigned[i].length > 0) styled++;
    if (assigned[i].length > 1) eligible.push(i);
  }
  var T = Math.max(0, Math.floor(tick || 0));
  var ne = eligible.length;
  for (var t = 1; t <= T && ne > 0; t++) {
    var rnd = tplRng(seed, "tick", t);
    var k;
    if (ne >= 2) k = Math.min(ne - 1, Math.max(1, Math.round(0.4 * ne)));
    else k = n > 1 && rnd() < 0.4 ? 1 : 0;
    var order = eligible.slice();
    for (var s = order.length - 1; s > 0; s--) { var r = Math.floor(rnd() * (s + 1)); var tmp = order[s]; order[s] = order[r]; order[r] = tmp; }
    for (var j = 0; j < k; j++) {
      var li = order[j], len = assigned[li].length;
      var step = Math.floor(tplRng(seed, "swap", t, li)() * (len - 1));
      idx[li] = step >= idx[li] ? step + 1 : step;
    }
  }
  var out = [];
  for (var q = 0; q < n; q++) out.push(assigned[q].length ? assigned[q][idx[q]] : null);
  return out;
}

function tplLookAt(letterIndex, tickIndex, seed, assigned) {
  return tplLooksAt(tickIndex, seed, assigned)[letterIndex];
}

// Re-style index at a frame of the graphic: the number of ticks <= frame (ticks are
// relative to the graphic's frame 0); always 0 when re-style is off.
function tplTickIndex(frame, ticks, restyle) {
  if (restyle === false || !Array.isArray(ticks)) return 0;
  var c = 0;
  for (var i = 0; i < ticks.length; i++) if (typeof ticks[i] === "number" && isFinite(ticks[i]) && ticks[i] <= frame) c++;
  return c;
}

// A look with the base red (#d0201a) replaced by the accent colour.
function tplApplyAccent(look, accent) {
  var ok = typeof accent === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(accent);
  var out = {};
  for (var key in look) out[key] = look[key];
  if (!ok) return out;
  if (typeof out.fg === "string" && out.fg.toLowerCase() === TPL_ACCENT_BASE) out.fg = accent;
  if (typeof out.bg === "string" && out.bg.toLowerCase() === TPL_ACCENT_BASE) out.bg = accent;
  return out;
}

// Chip layout in px of a W x H frame. words: two words (strings or grapheme arrays);
// size: cap height in % of H; y: vertical centre in % of H; advance: the looks.json
// advance table (widest face per letter) or a function (ch, word, i, flatIndex) -> em.
// Word 1 starts at 5 % W, word 2 ends at 94 % W; each word grows inward up to 32 % W, then
// the whole word shrinks down to 4.5 % H. A word that still does not fit is shrunk further
// to stay in its band and the result says fits:false. Slots (x, w) use the widest look and
// the maximum padding, so they do not depend on the seed; pad, rot and jitter are seeded.
// Returns { fits, chips: [{ x, y, w, h, rot, jitter, pad, glyph, fontPx, em, ch, kind, word, index }] }.
function tplLayout(words, size, y, advance, W, H, seed) {
  W = W || 1440; H = H || 1080;
  var g0 = (size / 100) * H;
  var cy = (y / 100) * H;
  var band = TPL_BAND * W;
  var chips = [], fits = true, flat = 0;
  for (var wi = 0; wi < 2; wi++) {
    var src = words && words[wi];
    var gs = typeof src === "string" ? tplGraphemes(src) : Array.isArray(src) ? src.slice(0, TPL_MAX_LETTERS) : [];
    if (!gs.length) continue;
    var ems = [];
    var unit = 0; // word width divided by the glyph height
    for (var i = 0; i < gs.length; i++) {
      var ch = gs[i], kind = tplKind(ch);
      var em = kind === "glyph" && typeof advance === "function" ? advance(ch, wi, i, flat + i) : tplLetterEm(ch, null, typeof advance === "function" ? null : advance);
      if (!(em > 0)) em = TPL_DEFAULT_EM;
      ems.push(em);
      unit += em / TPL_CAP_RATIO + 2 * TPL_PAD_MAX + (i > 0 ? TPL_GAP : 0);
    }
    var g = g0;
    if (g * unit > band) {
      g = band / unit;
      if (g < TPL_MIN_GLYPH * H - 1e-9) fits = false;
    }
    var fontPx = g / TPL_CAP_RATIO;
    var x = wi === 0 ? TPL_LEFT * W : TPL_RIGHT * W - g * unit;
    for (var j = 0; j < gs.length; j++) {
      var rnd = tplRng(seed, "chip", flat + j);
      var pad = (TPL_PAD_MIN + rnd() * (TPL_PAD_MAX - TPL_PAD_MIN)) * g;
      var rot = (rnd() * 2 - 1) * TPL_ROT_MAX;
      var jitter = (rnd() * 2 - 1) * TPL_JITTER_MAX * g;
      var w = ems[j] * fontPx + 2 * TPL_PAD_MAX * g;
      var h = g + 2 * pad;
      chips.push({ x: x, y: cy - h / 2, w: w, h: h, rot: rot, jitter: jitter, pad: pad, glyph: g, fontPx: fontPx, em: ems[j], ch: gs[j], kind: tplKind(gs[j]), word: wi, index: flat + j });
      x += w + TPL_GAP * g;
    }
    flat += gs.length;
  }
  return { fits: fits, chips: chips };
}
// tpl-letters:end

// Looks used when data.looks is missing (same palette as assets/fonts/looks.json).
const TPL_DEFAULT_LOOKS = [
  { id: "grey-serif", face: "serif", fg: "#111111", bg: "#bdb7ae", case: "upper" },
  { id: "red-condensed", face: "condensed", fg: "#d0201a", bg: "#ffffff", case: "upper" },
  { id: "white-black", face: "black", fg: "#ffffff", bg: "#111111", case: "upper" },
  { id: "outline-serif", face: "serif", fg: "#111111", bg: "#ffffff", case: "upper", outline: true },
  { id: "blue-black", face: "black", fg: "#3a78c9", bg: "#ffffff", case: "upper" },
  { id: "slab-cream", face: "slab", fg: "#111111", bg: "#efe6d2", case: "upper" },
  { id: "didone-lower", face: "didone", fg: "#111111", bg: "#ffffff", case: "lower" },
  { id: "type-grey", face: "typewriter", fg: "#222222", bg: "#d9d4ca", case: "any" },
];
// System faces behind each TPL face, used until (or if) the embedded font loads.
const TPL_FACE_STACK = {
  didone: 'Didot, "Bodoni 72", "Bodoni MT", Georgia, serif',
  condensed: '"Arial Narrow", "Helvetica Neue Condensed", Impact, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  slab: 'Rockwell, "Roboto Slab", "Courier New", serif',
  black: '"Arial Black", "Helvetica Neue", Impact, sans-serif',
  typewriter: '"American Typewriter", "Courier New", Courier, monospace',
};
const TPL_FALLBACK_STACK = 'Georgia, "Times New Roman", "Noto Serif", "Noto Serif CJK KR", "Apple SD Gothic Neo", serif';

const str = (v, d) => (typeof v === "string" ? v : d);
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const faceName = (faces, face) => (faces && typeof faces[face] === "string" ? faces[face] : "TPL " + String(face || "").charAt(0).toUpperCase() + String(face || "").slice(1));

function Heart({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 30" style={{ display: "block" }}>
      <path d="M16 29 C 6 21, 0 15, 0 8.5 C 0 3.6, 3.8 0, 8.4 0 C 11.6 0, 14.3 1.8, 16 4.6 C 17.7 1.8, 20.4 0, 23.6 0 C 28.2 0, 32 3.6, 32 8.5 C 32 15, 26 21, 16 29 Z" fill={color} />
    </svg>
  );
}

export default function RansomLetters({ data }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  data = data || {};
  // data.looks may be the looks array or the whole looks.json object.
  const lookFile = data.looks && !Array.isArray(data.looks) && typeof data.looks === "object" ? data.looks : null;
  const looks = Array.isArray(data.looks) ? data.looks : lookFile && Array.isArray(lookFile.looks) ? lookFile.looks : TPL_DEFAULT_LOOKS;
  const advance = data.advance && typeof data.advance === "object" ? data.advance : lookFile && lookFile.advance ? lookFile.advance : null;
  const faces = data.faces || (lookFile && lookFile.faces) || null;
  const fonts = data.fonts && typeof data.fonts === "object" ? data.fonts : {};
  const families = Object.keys(fonts).filter((f) => typeof fonts[f] === "string" && fonts[f]);

  const [ready, setReady] = useState(families.length === 0);
  const [handle] = useState(() => (families.length && typeof document !== "undefined" && document.fonts ? delayRender("torn paper love letters fonts") : null));
  const released = useRef(false);
  const release = () => {
    if (handle != null && !released.current) { released.current = true; continueRender(handle); }
  };
  useEffect(() => {
    if (ready) return;
    let live = true;
    const done = () => { if (live) setReady(true); };
    if (typeof document === "undefined" || !document.fonts) { done(); return; }
    Promise.all(families.map((f) => document.fonts.load(`100px "${f}"`).catch(() => null))).finally(done);
    return () => { live = false; };
  }, [ready]);
  useEffect(() => { if (ready) release(); }, [ready, handle]);
  // Never leave the render blocked if the graphic unmounts before the fonts settle.
  useEffect(() => release, []);

  const word1 = tplGraphemes(str(data.word1, "MY"));
  const word2 = tplGraphemes(str(data.word2, "LOVE"));
  const seed = data.seed == null ? 0 : data.seed;
  const size = clamp(num(data.size, 6.7), 1, 30);
  const y = clamp(num(data.y, 50), 0, 100);
  const accent = str(data.accent, TPL_ACCENT_BASE);
  const W = num(width, 1440), H = num(height, 1080);
  const looksById = useMemo(() => {
    const m = {};
    for (const l of looks) if (l && typeof l.id === "string") m[l.id] = tplApplyAccent(l, accent);
    return m;
  }, [looks, accent]);

  const letters = useMemo(() => word1.concat(word2), [word1.join("\u0000"), word2.join("\u0000")]);
  const assigned = useMemo(() => tplAssignLooks(letters, seed, looks, advance), [letters, seed, looks, advance]);
  const layout = useMemo(() => {
    // Slot width = the widest of the letter's own looks (layout never waits for fonts).
    const em = (ch, wi, i, flat) => {
      const set = assigned[flat] || [];
      const fs = set.map((id) => looksById[id] && looksById[id].face).filter(Boolean);
      return tplLetterEm(ch, fs.length ? fs : null, advance || {});
    };
    return tplLayout([word1, word2], size, y, em, W, H, seed);
  }, [letters, assigned, looksById, advance, size, y, W, H, seed]);

  const tick = tplTickIndex(frame, data.ticks, data.restyle !== false);
  const current = tplLooksAt(tick, seed, assigned);
  const fontFaces = families.map((f) => `@font-face{font-family:"${f.replace(/"/g, "")}";src:url("${fonts[f]}");font-display:block;}`).join("");

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {fontFaces ? <style>{fontFaces}</style> : null}
      {layout.chips.map((c) => {
        if (c.kind === "space") return null;
        const look = current[c.index] ? looksById[current[c.index]] : null;
        const fallback = c.kind === "fallback" || (!look && c.kind !== "heart");
        const bg = fallback ? "#ffffff" : look ? look.bg : "#ffffff";
        const fg = fallback ? "#111111" : look ? look.fg : accent;
        // The chip is cut tight around the current glyph and centred in its slot.
        const lookEm = fallback || c.kind === "heart" || !look ? c.em : tplLetterEm(c.ch, [look.face], advance || {});
        const lower = !!look && !fallback && look.case === "lower" && /[a-z]/i.test(c.ch);
        const h = lower ? c.h + 0.25 * c.glyph : c.h;
        const w = Math.min(c.w, lookEm * c.fontPx + 2 * c.pad);
        const shadow = `0 ${(0.04 * c.glyph).toFixed(2)}px ${(0.12 * c.glyph).toFixed(2)}px rgba(0,0,0,0.3)`;
        const box = {
          position: "absolute",
          left: c.x + (c.w - w) / 2,
          top: c.y + c.jitter - (h - c.h) / 2,
          width: w,
          height: h,
          background: bg,
          boxShadow: shadow,
          transform: `rotate(${c.rot.toFixed(2)}deg)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
        };
        if (c.kind === "heart" && !fallback) {
          return (
            <div key={c.index} style={box}>
              <Heart color={fg} size={c.glyph * 1.05} />
            </div>
          );
        }
        const family = fallback ? TPL_FALLBACK_STACK : `"${faceName(faces, look.face)}", ${TPL_FACE_STACK[look.face] || "serif"}`;
        const text = fallback ? c.ch : tplCased(c.ch, look);
        const outline = !fallback && look.outline;
        return (
          <div key={c.index} style={box}>
            <span
              style={{
                display: "inline-block",
                fontFamily: family,
                fontSize: c.fontPx,
                lineHeight: 1,
                whiteSpace: "pre",
                color: outline ? "transparent" : fg,
                WebkitTextStroke: outline ? `${Math.max(1, c.fontPx * 0.035).toFixed(2)}px ${fg}` : undefined,
                transform: "translateY(0.04em)",
              }}
            >
              {text}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
