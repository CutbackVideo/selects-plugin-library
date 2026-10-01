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
  shots: (Rect & { from: number; to: number; z?: number })[];
  open?: { s0: number; ax: number; ay: number };
};

export type FramingPlan = { clips: ClipFrame[]; shots: Shot[]; cuts: number[]; framed: number; total: number };

const hash = (i: number) => {
  const x = Math.sin(i * 91.17 + 3.7) * 43758.5453;
  return x - Math.floor(x);
};

// Camera angles: the face shots of one source file grouped by face size (and position), so a source that
// cuts between a close and a wider framing gives two angles. Each angle gets one fixed crop for the
// whole Short, from its median face: the background does not move between shots of one angle.
type Angle = { key: string; h: number; cx: number; face: Face };
function anglesOf(clips: NewClip[], faces: Record<string, SourceFaces>): Angle[] {
  const byKey = new Map<string, Face[]>();
  for (const c of clips) {
    const f = faces[String(c.src.clipId)];
    if (!f) continue;
    const key = c.src.path || String(c.src.clipId);
    const list = byKey.get(key) || [];
    for (const s of f.shots) if (s.face && s.end - s.start >= 0.5) list.push(s.face);
    byKey.set(key, list);
  }
  const med = (xs: number[]) => {
    const v = xs.slice().sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : 0;
  };
  const out: Angle[] = [];
  for (const [key, list] of byKey) {
    const groups: Face[][] = [];
    for (const f of list.slice().sort((a, b) => a.h - b.h)) {
      const g = groups.find((x) => f.h <= med(x.map((y) => y.h)) * 1.18 && Math.abs(f.cx - med(x.map((y) => y.cx))) < 0.08);
      if (g) g.push(f);
      else groups.push([f]);
    }
    for (const g of groups) {
      const face: Face = { cx: med(g.map((x) => x.cx)), eyes: med(g.map((x) => x.eyes)), h: med(g.map((x) => x.h)), w: med(g.map((x) => x.w)), top: med(g.map((x) => x.top)) };
      out.push({ key, h: face.h, cx: face.cx, face });
    }
  }
  return out;
}
function angleFor(angles: Angle[], key: string, f: Face): Face {
  const own = angles.filter((a) => a.key === key);
  if (!own.length) return f;
  return own.slice().sort((a, b) => Math.abs(Math.log(a.h / f.h)) + Math.abs(a.cx - f.cx) - (Math.abs(Math.log(b.h / f.h)) + Math.abs(b.cx - f.cx)))[0].face;
}

export function planFraming(clips: NewClip[], faces: Record<string, SourceFaces>, fps: number): FramingPlan {
  const out: ClipFrame[] = [];
  const shots: Shot[] = [];
  const cuts: number[] = [];
  const angles = anglesOf(clips, faces);
  let framed = 0;
  let total = 0;
  let m = 1;
  let lastCutAt = -1e9;
  let lastM = 1;
  let jumps = 0;
  clips.forEach((c, ci) => {
    const found = faces[String(c.src.clipId)];
    const key = c.src.path || String(c.src.clipId);
    const sw = found?.W || c.src.sw || 1920;
    const sh = found?.H || c.src.sh || 1080;
    const srcIn = c.srcIn;
    const srcOut = srcIn + (c.end - c.start) / fps;
    const list = (found?.shots || []).filter((s) => s.end > srcIn && s.start < srcOut).map((s) => ({ ...s }));
    const withFace = (found?.shots || []).filter((s) => s.face);
    // a size change on some jump cuts (one source angle): modest, as the source is already enlarged
    if (c.jump) {
      jumps += 1;
      const r = hash(jumps + ci);
      let next = r < 0.5 ? m : m === 1 ? (r < 0.8 ? 1.1 : 1.15) : 1;
      const t = c.start / fps;
      if (next === lastM && t - lastCutAt < 0.8) next = m === 1 ? 1.1 : 1;
      m = next;
    } else if (ci > 0) m = 1;
    if (ci > 0) {
      cuts.push(c.start / fps);
      lastCutAt = c.start / fps;
      lastM = m;
    }
    // shots under half a second (a detection flicker at a change) join their neighbour
    const pieces: { start: number; end: number; face: Face | null }[] = [];
    for (const s of list.length ? list : [{ start: srcIn, end: srcOut, face: null }]) {
      const prev = pieces[pieces.length - 1];
      if (prev && (Math.min(s.end, srcOut) - Math.max(s.start, srcIn) < 0.5 || Math.min(prev.end, srcOut) - Math.max(prev.start, srcIn) < 0.5)) {
        if (!prev.face || (s.face && s.end - s.start > prev.end - prev.start)) prev.face = s.face || prev.face;
        prev.end = s.end;
      } else pieces.push({ ...s });
    }
    const clipShots: ClipFrame["shots"] = [];
    pieces.forEach((s, i) => {
      let face = s.face;
      if (!face && withFace.length) {
        const mid = (s.start + s.end) / 2;
        face = withFace.slice().sort((a, b) => Math.abs((a.start + a.end) / 2 - mid) - Math.abs((b.start + b.end) / 2 - mid))[0].face;
      }
      // the angle's fixed framing, not this shot's own face position
      if (face) face = angleFor(angles, key, face);
      const from = i === 0 ? c.start : Math.max(c.start, Math.min(c.end, c.start + Math.round((s.start - srcIn) * fps)));
      const to = i === pieces.length - 1 ? c.end : Math.max(c.start, Math.min(c.end, c.start + Math.round((s.end - srcIn) * fps)));
      if (to <= from) return;
      const fr = shotFrame(sw, sh, face);
      const ax = fr.face ? fr.face.cx * W : W / 2;
      const ay = fr.face ? fr.face.eyes * H : H * 0.4;
      const rect = punch(fr.rect, m, ax, ay);
      // the face as it lands after the punch
      const f = fr.face
        ? { cx: (ax + (fr.face.cx * W - ax) * m) / W, cy: (ay + ((fr.face.eyes + fr.face.chin) / 2) * H - ay) / H, w: 0, h: fr.face.h * m, chin: (ay + (fr.face.chin * H - ay) * m) / H }
        : null;
      const prev = clipShots[clipShots.length - 1];
      // the same angle again continues the shot: no cut, nothing moves
      if (prev && prev.x === rect.x && prev.y === rect.y && prev.w === rect.w) {
        prev.to = to;
        shots[shots.length - 1].to = to / fps;
        return;
      }
      clipShots.push({ from, to, ...rect });
      total += 1;
      if (fr.face) framed += 1;
      if (clipShots.length > 1) cuts.push(from / fps);
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

// The picture never holds unchanged for long (spec 13.3): on a speaker stretch with no cut, insert or
// card for 4 s, the crop changes at the next caption start - in to 1.15x around the face, or back out. Returns a new plan; the stored one is not touched.
export function addFramingChanges(plan: FramingPlan, covered: [number, number][], starts: number[], fps: number, duration: number): FramingPlan {
  const clips: ClipFrame[] = plan.clips.map((c) => ({ ...c, shots: c.shots.map((x) => ({ ...x })) }));
  const shots: Shot[] = plan.shots.map((x) => ({ ...x, face: x.face ? { ...x.face } : x.face }));
  const cuts = plan.cuts.slice();
  const inside = (t: number) => covered.some(([a, b]) => t >= a - 0.05 && t < b + 0.05);
  const events = [...cuts, ...covered.flatMap(([a, b]) => [a, b])].sort((a, b) => a - b);
  let last = 0;
  const added: number[] = [];
  for (const t of starts.slice().sort((a, b) => a - b)) {
    while (events.length && events[0] <= t) last = Math.max(last, events.shift()!);
    if (t - last < 4 || inside(t) || t > duration - 0.8) continue;
    const nextEvent = events.length ? events[0] : duration;
    if (nextEvent - t < 1.2) continue;
    added.push(t);
    last = t;
  }
  for (const t of added) {
    const F = Math.round(t * fps);
    const clip = clips.find((c) => F > c.start && F < c.end);
    if (!clip) continue;
    const k = clip.shots.findIndex((x) => F > x.from && F < x.to);
    if (k < 0) continue;
    const cur = clip.shots[k];
    const cap = shots.find((x) => x.kind === "speaker" && t >= x.from && t < x.to);
    const f = cap?.face;
    const ax = f ? f.cx * W : W / 2;
    const ay = f ? (f.chin - f.h / 2) * H : 0.4 * H;
    const z = cur.z || 1;
    const factor = z > 1 ? 1 / z : 1.15;
    const rect = punch(cur, factor, ax, ay);
    clip.shots.splice(k, 1, { ...cur, to: F }, { ...rect, from: F, to: cur.to, z: z > 1 ? 1 : 1.15 });
    if (cap) {
      const j = shots.indexOf(cap);
      const nf = f ? { ...f, h: f.h * factor, chin: (ay + (f.chin * H - ay) * factor) / H } : null;
      shots.splice(j, 1, { ...cap, to: t }, { ...cap, from: t, face: nf });
    }
    cuts.push(t);
  }
  return { ...plan, clips, shots, cuts: cuts.sort((a, b) => a - b) };
}
