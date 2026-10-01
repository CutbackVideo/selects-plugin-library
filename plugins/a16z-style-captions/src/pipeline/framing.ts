// 9:16 framing of the Short's Main clips (spec 12, 13.3). Fill-first: the source is enlarged just enough
// to fill the frame, and further only while the face is small (a wide shot), never past 2.3x. Jump cuts
// get a size change now and then (a punch-in), never two same-size jumps under 0.8 s apart; the first
// shot opens with the house zoom-out settle.
import type { Face, SourceFaces } from "./faces";
import type { NewClip } from "./edit";
import type { Shot } from "../captions/types";

export const W = 1080;
export const H = 1920;
const F = { eyes: 0.2, cx: 0.5, faceH: 0.22, maxUpscale: 2.3, headMargin: 0.025, hair: 0.1 };

export type Rect = { x: number; y: number; w: number; h: number };
export type FrameFace = { cx: number; eyes: number; top: number; chin: number; h: number };

export function shotFrame(sw: number, sh: number, face: Face | null): { rect: Rect; face: FrameFace | null; zoom: number } {
  const fill = Math.max(W / sw, H / sh);
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const r4 = (v: number) => Math.round(v * 10000) / 10000;
  if (!face || !(face.h > 0)) {
    const w = sw * fill;
    const h = sh * fill;
    return { rect: { x: r2((W - w) / 2), y: r2((H - h) / 2), w: r2(w), h: r2(h) }, face: null, zoom: r4(fill) };
  }
  const chin = face.top + face.h;
  const head = Math.max(0, 2 * face.eyes - chin - F.hair * face.h);
  const k = Math.max(fill, Math.min(F.maxUpscale, (F.faceH * H) / (face.h * sh)));
  const w = sw * k;
  const h = sh * k;
  const y = Math.min(0, Math.max(H - h, F.headMargin * H - head * h, F.eyes * H - face.eyes * h));
  const x = Math.min(0, Math.max(W - w, F.cx * W - face.cx * w));
  const on = (v: number) => r4((y + v * h) / H);
  return { rect: { x: r2(x), y: r2(y), w: r2(w), h: r2(h) }, face: { cx: r4((x + face.cx * w) / W), eyes: on(face.eyes), top: on(face.top), chin: on(chin), h: r4((face.h * h) / H) }, zoom: r4(k) };
}

// Scale a rect about a frame point, keeping the frame covered.
function punch(r: Rect, m: number, ax: number, ay: number): Rect {
  if (m === 1) return r;
  const w = r.w * m;
  const h = r.h * m;
  let x = ax - (ax - r.x) * m;
  let y = ay - (ay - r.y) * m;
  x = Math.min(0, Math.max(W - w, x));
  y = Math.min(0, Math.max(H - h, y));
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, w: Math.round(w * 100) / 100, h: Math.round(h * 100) / 100 };
}

export type ClipFrame = {
  start: number;
  end: number;
  sw: number;
  sh: number;
  shots: (Rect & { from: number; to: number })[];
  open?: { s0: number; ax: number; ay: number };
};

export type FramingPlan = { clips: ClipFrame[]; shots: Shot[]; cuts: number[]; framed: number; total: number };

const hash = (i: number) => {
  const x = Math.sin(i * 91.17 + 3.7) * 43758.5453;
  return x - Math.floor(x);
};

export function planFraming(clips: NewClip[], faces: Record<string, SourceFaces>, fps: number): FramingPlan {
  const out: ClipFrame[] = [];
  const shots: Shot[] = [];
  const cuts: number[] = [];
  let framed = 0;
  let total = 0;
  let m = 1;
  let lastCutAt = -1e9;
  let lastM = 1;
  let jumps = 0;
  clips.forEach((c, ci) => {
    const found = faces[String(c.src.clipId)];
    const sw = found?.W || c.src.sw || 1920;
    const sh = found?.H || c.src.sh || 1080;
    const srcIn = c.srcIn;
    const srcOut = srcIn + (c.end - c.start) / fps;
    const list = (found?.shots || []).filter((s) => s.end > srcIn && s.start < srcOut);
    const withFace = (found?.shots || []).filter((s) => s.face);
    // size change on a jump cut (one source angle): 45% same framing, otherwise a 1.15-1.25x punch or
    // back out to the base framing
    if (c.jump) {
      jumps += 1;
      const r = hash(jumps + ci);
      // modest punches: the source is already enlarged to fill a 9:16 frame
      let next = r < 0.45 ? m : m === 1 ? (r < 0.75 ? 1.1 : 1.18) : 1;
      const t = c.start / fps;
      if (next === lastM && t - lastCutAt < 0.8) next = m === 1 ? 1.1 : 1;
      m = next;
    } else if (ci > 0) m = 1;
    if (ci > 0) {
      cuts.push(c.start / fps);
      lastCutAt = c.start / fps;
      lastM = m;
    }
    const pieces = list.length ? list : [{ start: srcIn, end: srcOut, face: null }];
    const clipShots: ClipFrame["shots"] = [];
    pieces.forEach((s, i) => {
      let face = s.face;
      if (!face && withFace.length) {
        const mid = (s.start + s.end) / 2;
        face = withFace.slice().sort((a, b) => Math.abs((a.start + a.end) / 2 - mid) - Math.abs((b.start + b.end) / 2 - mid))[0].face;
      }
      const from = i === 0 ? c.start : Math.max(c.start, Math.min(c.end, c.start + Math.round((s.start - srcIn) * fps)));
      const to = i === pieces.length - 1 ? c.end : Math.max(c.start, Math.min(c.end, c.start + Math.round((s.end - srcIn) * fps)));
      if (to <= from) return;
      const fr = shotFrame(sw, sh, face);
      const ax = fr.face ? fr.face.cx * W : W / 2;
      const ay = fr.face ? fr.face.eyes * H : H * 0.4;
      const rect = punch(fr.rect, m, ax, ay);
      clipShots.push({ from, to, ...rect });
      total += 1;
      if (fr.face) framed += 1;
      if (i > 0) cuts.push(from / fps);
      // the face as it lands after the punch
      const f = fr.face
        ? { cx: (ax + (fr.face.cx * W - ax) * m) / W, cy: (ay + ((fr.face.eyes + fr.face.chin) / 2) * H - ay) / H, w: 0, h: fr.face.h * m, chin: (ay + (fr.face.chin * H - ay) * m) / H }
        : null;
      shots.push({ from: from / fps, to: to / fps, kind: "speaker", face: f, segment: c.src.clipId * 100000 + Math.round(s.start * 10) });
    });
    const cf: ClipFrame = { start: c.start, end: c.end, sw, sh, shots: clipShots };
    if (ci === 0 && clipShots.length) {
      const sf = shots[0]?.face;
      cf.open = { s0: 1.12, ax: sf ? sf.cx * W : W / 2, ay: sf ? (sf.chin - sf.h / 2) * H : H * 0.35 };
    }
    out.push(cf);
  });
  return { clips: out, shots, cuts: [...new Set(cuts.map((c) => Math.round(c * 1000) / 1000))].sort((a, b) => a - b), framed, total };
}
