// Text measurement for the graphic. Canvas metrics when the renderer has a DOM (it always does in
// preview and export), an estimate otherwise, so a line can never size itself off the frame.

const widthCache: Record<string, number> = {};
const metricCache: Record<string, Metrics> = {};

export type Metrics = { xh: number; cap: number; ascent: number; descent: number };

export function clearTextCache() {
  for (const k of Object.keys(widthCache)) delete widthCache[k];
  for (const k of Object.keys(metricCache)) delete metricCache[k];
}

let canvasCtx: CanvasRenderingContext2D | null | undefined;
function ctx(): CanvasRenderingContext2D | null {
  if (canvasCtx !== undefined) return canvasCtx;
  try {
    canvasCtx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  } catch {
    canvasCtx = null;
  }
  return canvasCtx;
}

export type FontSpec = { family: string; weight: number; style: "normal" | "italic"; estimate: number };

const fontString = (f: FontSpec, px: number) => (f.style === "italic" ? "italic " : "") + f.weight + " " + px + "px " + f.family;

// Advance width of `text` at a 100 px font, without letter spacing.
export function width100(text: string, f: FontSpec): number {
  const key = f.family + "|" + f.weight + "|" + f.style + "|" + text;
  if (widthCache[key] != null) return widthCache[key];
  let w = 0;
  const c = ctx();
  if (c) {
    c.font = fontString(f, 100);
    const m = c.measureText(text);
    if (m && m.width > 0) w = m.width;
  }
  if (!(w > 0)) w = text.length * f.estimate * 100;
  widthCache[key] = w;
  return w;
}

// x-height, cap height, ascent and descent per px of font size.
export function metrics(f: FontSpec): Metrics {
  const key = f.family + "|" + f.weight + "|" + f.style;
  if (metricCache[key]) return metricCache[key];
  let out: Metrics = { xh: 0.53, cap: 0.72, ascent: 0.95, descent: 0.25 };
  const c = ctx();
  if (c) {
    c.font = fontString(f, 100);
    const x: any = c.measureText("xzvw");
    const h: any = c.measureText("HXEI");
    const xh = Number(x.actualBoundingBoxAscent) / 100;
    const cap = Number(h.actualBoundingBoxAscent) / 100;
    const A = Number(h.fontBoundingBoxAscent) / 100;
    const D = Number(h.fontBoundingBoxDescent) / 100;
    if (xh > 0.2 && cap > 0.3 && A > 0) out = { xh, cap, ascent: A, descent: D >= 0 ? D : 0.25 };
  }
  metricCache[key] = out;
  return out;
}
