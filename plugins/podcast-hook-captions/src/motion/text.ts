// Text measurement for the Reel graphic. Canvas metrics when the renderer has a DOM (it always does in
// preview and export), a per-face estimate otherwise, so a block can never size itself off the frame.

const widthCache: Record<string, number> = {};
const metricCache: Record<string, { cap: number; top: number }> = {};

export function clearTextCache() {
  for (const k of Object.keys(widthCache)) delete widthCache[k];
  for (const k of Object.keys(metricCache)) delete metricCache[k];
}

function ctx(): CanvasRenderingContext2D | null {
  try {
    if (typeof document === "undefined") return null;
    return document.createElement("canvas").getContext("2d");
  } catch {
    return null;
  }
}

// Width of `text` at a 100 px font, including letter spacing (em); `kern: false` measures with kerning
// off, as a line styled with fontKerning "none" is set.
export function width100(text: string, family: string, weight: number, trackingEm: number, estimateEm: number, kern = true): number {
  const key = family + "|" + weight + "|" + trackingEm + "|" + kern + "|" + text;
  if (widthCache[key] != null) return widthCache[key];
  let w = 0;
  const c = ctx();
  if (c) {
    c.font = weight + " 100px " + family;
    (c as any).fontKerning = kern ? "normal" : "none";
    const m = c.measureText(text);
    if (m && m.width > 0) w = m.width;
  }
  if (!(w > 0)) w = text.length * estimateEm * 100;
  w += text.length * trackingEm * 100;
  widthCache[key] = w;
  return w;
}

// Cap height per px of font size, and where the cap top sits below the top of a line-height:1 box
// (also per px), so a line can be placed by its cap top as the reference was measured.
export function capMetrics(family: string, weight: number, capEstimate: number): { cap: number; top: number } {
  const key = family + "|" + weight;
  if (metricCache[key]) return metricCache[key];
  let out = { cap: capEstimate, top: (1 - capEstimate) / 2 };
  const c = ctx();
  if (c) {
    c.font = weight + " 100px " + family;
    const m: any = c.measureText("HXE");
    const cap = Number(m.actualBoundingBoxAscent) / 100;
    const A = Number(m.fontBoundingBoxAscent) / 100;
    const D = Number(m.fontBoundingBoxDescent) / 100;
    if (cap > 0.2 && A > 0 && D >= 0) out = { cap, top: (1 - (A + D)) / 2 + A - cap };
  }
  metricCache[key] = out;
  return out;
}
