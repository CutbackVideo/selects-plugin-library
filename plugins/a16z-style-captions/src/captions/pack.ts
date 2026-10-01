// CaptionTrack -> the compact frame-based data the graphic draws.
import type { CaptionTrack } from "./types";
import type { PUnit, PToken, PLine } from "../motion/data";

const faceCode = (f?: string): 0 | 1 | 2 => (f === "serif" ? 1 : f === "roman" ? 2 : 0);

export function packCaptions(track: CaptionTrack, fps: number): PUnit[] {
  const fr = (t: number) => Math.max(0, Math.round(t * fps));
  let sentence = 0;
  return track.units.map((u, k) => {
    const a = fr(u.start);
    const b = Math.max(a + 1, fr(u.end));
    const t: PToken[] = u.tokens.map((x) => {
      const tok: PToken = [x.text, Math.max(a, fr(x.reveal)), faceCode(x.face)];
      if (x.accent) tok.push(x.accent);
      return tok;
    });
    const l: PLine[] = u.lines.map((x) => [x.from, x.to, Math.round(x.scale * 1000) / 1000, faceCode(x.face), x.tier === "big" ? 1 : 0]);
    const p: PUnit = {
      a,
      b,
      y: Math.round(u.y * 10000) / 10000,
      tp: u.template,
      e: [u.entrance.kind === "blur" ? "b" : u.entrance.kind === "rise" ? "r" : "c", u.entrance.sigma, u.entrance.frames, u.entrance.curve === "cubic" ? "c" : "q"],
      t,
      l,
      s: sentence,
    };
    if (u.swapFrom) p.sw = u.swapFrom;
    if (u.grow && u.grow !== 1) p.g = u.grow;
    if (u.dark) p.d = 1;
    if (/[.?!]$/.test(u.tokens[u.tokens.length - 1]?.text || "") || k === track.units.length - 1) sentence += 1;
    return p;
  });
}
