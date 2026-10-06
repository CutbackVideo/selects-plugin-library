import { parseBlackdetect, type BlackRun } from "../../host/ffmpegParse.ts";

type Key = { frame: number; x?: number; y?: number; width?: number; height?: number; opacity?: number; blur?: number; scale?: number };
type Layer = { id?: string; kind?: string; assetId?: string; from?: number; to?: number; keyframes?: Key[] };
type Footage = { id?: string; from?: number; to?: number; still?: boolean; layout?: string };
export type SceneExecution = { canvas?: { width: number; height: number }; backgrounds?: { from: number; color: string }[]; layers?: Layer[]; footage?: Footage[] };
export type DiagScene = { sceneId: string; start: number; end: number; execution: SceneExecution | null };

export type Sample = { frame: number; reasons: string[] };

export function sampleFrames(scenes: DiagScene[], mainEnd: number): Sample[] {
  const at = new Map<number, string[]>();
  const add = (f: number, why: string) => {
    const n = Math.round(f);
    if (n < 0 || n >= mainEnd) return;
    const list = at.get(n) ?? [];
    if (!list.includes(why)) list.push(why);
    at.set(n, list);
  };
  add(0, "film first");
  add(mainEnd - 1, "film last");
  for (const s of scenes) {
    const n = s.end - s.start;
    add(s.start, s.sceneId + " first");
    add(s.start + 1, s.sceneId + " next");
    add(s.start + Math.floor(n / 2), s.sceneId + " middle");
    add(s.end - 1, s.sceneId + " last");
    for (const sh of s.execution?.footage ?? []) {
      const from = sh.from ?? 0, to = sh.to ?? n;
      if (from > 0) add(s.start + from, s.sceneId + " " + (sh.id ?? "shot") + " in");
      add(s.start + Math.floor((from + to) / 2), s.sceneId + " " + (sh.id ?? "shot") + " middle");
    }
    for (const l of s.execution?.layers ?? []) {
      if (l.kind !== "asset") continue;
      const from = l.from ?? 0;
      add(s.start + from, s.sceneId + " " + (l.assetId ?? l.id ?? "picture") + " in");
      add(s.start + Math.min(n - 1, from + 8), s.sceneId + " " + (l.assetId ?? l.id ?? "picture") + " settled");
    }
  }
  return [...at.entries()].sort((a, b) => a[0] - b[0]).map(([frame, reasons]) => ({ frame, reasons }));
}

export function sampleLabel(s: Sample): string {
  return "f" + String(s.frame).padStart(4, "0") + " " + s.reasons[0] + (s.reasons.length > 1 ? " +" + (s.reasons.length - 1) : "");
}

export function selectExpr(frames: number[]): string {
  const tree = (xs: number[]): string => (xs.length === 1 ? "eq(n\\," + xs[0] + ")" : "(" + tree(xs.slice(0, xs.length >> 1)) + "+" + tree(xs.slice(xs.length >> 1)) + ")");
  if (!frames.length) throw new Error("no frames to select");
  return tree(frames);
}

export const TILE = { width: 270, height: 480 } as const;

export function extractArgs(mp4: string, frames: number[], jpgPattern: string, rawPath: string): string[] {
  const scale = "scale=" + TILE.width + ":" + TILE.height + ":flags=area";
  return [
    "-hide_banner", "-nostdin", "-nostats", "-y", "-i", mp4,
    "-filter_complex", "[0:v]select='" + selectExpr(frames) + "',split=2[a][b];[a]" + scale + "[ja];[b]" + scale + ",format=gray[gb]",
    "-map", "[ja]", "-fps_mode", "passthrough", "-q:v", "3", "-start_number", "0", jpgPattern,
    "-map", "[gb]", "-fps_mode", "passthrough", "-f", "rawvideo", rawPath,
  ];
}

export function blackdetectArgs(mp4: string): string[] {
  return ["-hide_banner", "-nostdin", "-nostats", "-i", mp4, "-map", "0:v:0", "-vf", "blackdetect=d=0.1:pix_th=0.10:pic_th=0.98", "-an", "-f", "null", "-"];
}

export function luma(color: string | undefined): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(color ?? ""));
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255;
}

export const DARK_GROUND = 0.12;

export function darkGroundAt(scenes: DiagScene[], f: number): boolean {
  const s = scenes.find((x) => f >= x.start && f < x.end);
  const grounds = s?.execution?.backgrounds ?? [];
  let color: string | undefined;
  for (const g of grounds) if (g.from <= f - (s?.start ?? 0)) color = g.color;
  const l = luma(color);
  return l != null && l < DARK_GROUND;
}

export type BlackVerdict = BlackRun & { frames: [number, number]; planned: boolean };

export function blackRuns(stderr: string, scenes: DiagScene[], fps: number): BlackVerdict[] {
  return parseBlackdetect(stderr).map((r) => {
    const a = Math.round(r.start * fps), b = Math.max(a + 1, Math.round(r.end * fps));
    let planned = true;
    for (let f = a; f < b && planned; f += 1) planned = darkGroundAt(scenes, f);
    return { ...r, frames: [a, b], planned };
  });
}

export type Box = { x: number; y: number; w: number; h: number };

export function boxStats(gray: Uint8Array, frameW: number, frameH: number, box: Box, canvas = { width: 1080, height: 1920 }): { mean: number; std: number; pixels: number } {
  const sx = frameW / canvas.width, sy = frameH / canvas.height;
  const x0 = Math.max(0, Math.floor(box.x * sx)), y0 = Math.max(0, Math.floor(box.y * sy));
  const x1 = Math.min(frameW, Math.ceil((box.x + box.w) * sx)), y1 = Math.min(frameH, Math.ceil((box.y + box.h) * sy));
  let s = 0, ss = 0, n = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const v = gray[y * frameW + x];
      s += v;
      ss += v * v;
      n += 1;
    }
  }
  if (!n) return { mean: 0, std: 0, pixels: 0 };
  const mean = s / n;
  return { mean, std: Math.sqrt(Math.max(0, ss / n - mean * mean)), pixels: n };
}

export type PictureProbe = { sceneId: string; picture: string; entrance: number; settled: number; box: Box };

export function pictureProbes(scenes: DiagScene[]): PictureProbe[] {
  const out: PictureProbe[] = [];
  for (const s of scenes) {
    const n = s.end - s.start;
    const canvas = s.execution?.canvas ?? { width: 1080, height: 1920 };
    for (const l of s.execution?.layers ?? []) {
      const k = l.keyframes?.[0];
      if (l.kind !== "asset" || !k || k.frame !== l.from) continue;
      if ((k.opacity ?? 1) < 0.99 || (k.blur ?? 0) > 1 || !(k.width! > 0) || !(k.height! > 0)) continue;
      const from = l.from ?? 0;
      const sc = k.scale ?? 1;
      const w = k.width! * sc, h = k.height! * sc;
      const cx = (k.x ?? 0) + k.width! / 2, cy = (k.y ?? 0) + k.height! / 2;
      out.push({ sceneId: s.sceneId, picture: l.assetId ?? l.id ?? "picture", entrance: s.start + from, settled: s.start + Math.min(n - 1, from + 8), box: { x: cx - w / 2, y: cy - h / 2, w, h } });
    }
    for (const sh of s.execution?.footage ?? []) {
      if (!sh.still || (sh.layout && sh.layout !== "full")) continue;
      const from = sh.from ?? 0;
      out.push({ sceneId: s.sceneId, picture: (sh.id ?? "shot") + " photo", entrance: s.start + from, settled: s.start + Math.min(n - 1, from + 8), box: { x: 0, y: 0, w: canvas.width, h: canvas.height } });
    }
  }
  return out;
}

export const BLANK_RULE = { settledMinStd: 10, ratio: 0.35 } as const;

export type PictureVerdict = PictureProbe & { entranceStd: number; settledStd: number; blank: boolean | null; why?: string };

export function judgePicture(p: PictureProbe, entrance: { std: number } | null, settled: { std: number } | null): PictureVerdict {
  if (!entrance || !settled) return { ...p, entranceStd: entrance?.std ?? NaN, settledStd: settled?.std ?? NaN, blank: null, why: "frames not extracted" };
  if (settled.std < BLANK_RULE.settledMinStd) return { ...p, entranceStd: entrance.std, settledStd: settled.std, blank: null, why: "too plain to judge" };
  return { ...p, entranceStd: entrance.std, settledStd: settled.std, blank: entrance.std < BLANK_RULE.ratio * settled.std };
}
