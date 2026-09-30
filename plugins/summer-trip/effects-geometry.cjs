// Summer Trip effect geometry: where the canvas (or a grid quadrant) lies inside a clip's own conformed box.
// Pure functions between the markers so run_script code can inline the block as text (no require at runtime).
//
// Model (TO BE VERIFIED LIVE, probe P1):
// - A clip is first conformed to FIT the canvas (letterboxed, aspect kept): fit = min(canvasW / srcW, canvasH / srcH).
// - The intrinsic Transform then scales that box about its centre by `scale` (anchor 0, no rotation) and moves it by
//   `position`, in % of the canvas HEIGHT from the canvas centre, +X right and +Y UP (SDK doc: "percentages of the
//   owning frame's height from its center"). ST_POSITION_Y_UP is the single constant to flip if the probe disagrees.
// - A video effect renders in the clip's own conformed box before the Transform, so a rectangle given in % of that box
//   lands where this model says.

// st-geometry:start
const ST_CANVAS_W = 1920, ST_CANVAS_H = 1080;
const ST_POSITION_Y_UP = 1; // +1: positive position.y moves the clip up (SDK doc). Set -1 if probe P1 shows otherwise.
const ST_QUADS = ['TL', 'TR', 'BR', 'BL'];

function stNum(v, d) { const n = Number(v); return typeof v !== 'boolean' && v !== null && v !== '' && isFinite(n) ? n : d; }

// The clip's conformed (fit) box in canvas pixels, before the Transform.
function stFitBox(srcW, srcH, canvasW, canvasH) {
  const cw = stNum(canvasW, ST_CANVAS_W), ch = stNum(canvasH, ST_CANVAS_H);
  const w = stNum(srcW, cw) > 0 ? stNum(srcW, cw) : cw, h = stNum(srcH, ch) > 0 ? stNum(srcH, ch) : ch;
  const fit = Math.min(cw / w, ch / h);
  return { w: w * fit, h: h * fit, canvasW: cw, canvasH: ch };
}

// Transform scale that makes the fitted clip cover a boxW x boxH rectangle of the canvas (defaults: the whole canvas).
function stCoverScale(srcW, srcH, boxW, boxH, canvasW, canvasH) {
  const b = stFitBox(srcW, srcH, canvasW, canvasH);
  const tw = stNum(boxW, b.canvasW), th = stNum(boxH, b.canvasH);
  return Math.max(tw / b.w, th / b.h);
}

// A canvas-pixel rectangle { x, y, w, h } (top-left origin, y down) expressed in % of the clip's conformed box.
function stRectInBox(o) {
  const b = stFitBox(o.srcW, o.srcH, o.canvasW, o.canvasH);
  const scale = stNum(o.scale, 1) > 0 ? stNum(o.scale, 1) : 1;
  const px = stNum(o.position && o.position.x, 0), py = stNum(o.position && o.position.y, 0);
  const dw = b.w * scale, dh = b.h * scale;
  const cx = b.canvasW / 2 + px / 100 * b.canvasH, cy = b.canvasH / 2 - ST_POSITION_Y_UP * py / 100 * b.canvasH;
  const left = cx - dw / 2, top = cy - dh / 2;
  const r = o.rect || { x: 0, y: 0, w: b.canvasW, h: b.canvasH };
  return { x: (r.x - left) / dw * 100, y: (r.y - top) / dh * 100, w: r.w / dw * 100, h: r.h / dh * 100 };
}

// The whole canvas in % of the clip's box: the Film frame's `canvasInBox`.
function stCanvasInBox(o) {
  return stRectInBox({ srcW: o.srcW, srcH: o.srcH, canvasW: o.canvasW, canvasH: o.canvasH, scale: o.scale, position: o.position });
}

// The canvas-pixel rectangle of a 2x2 quadrant.
function stQuadRect(quad, canvasW, canvasH) {
  const cw = stNum(canvasW, ST_CANVAS_W), ch = stNum(canvasH, ST_CANVAS_H);
  const q = ST_QUADS.includes(quad) ? quad : 'TL';
  return { x: q === 'TR' || q === 'BR' ? cw / 2 : 0, y: q === 'BR' || q === 'BL' ? ch / 2 : 0, w: cw / 2, h: ch / 2 };
}

// Grid panel for one quadrant: the cover transform (unless given) and the Grid panel effect's `insetPct`.
// A 16:9 source at scale 0.5 fills its quadrant exactly: needsMask is false and decorate skips the effect.
function stGridPanelInset(o) {
  const b = stFitBox(o.srcW, o.srcH, o.canvasW, o.canvasH);
  const rect = stQuadRect(o.quad, b.canvasW, b.canvasH);
  const scale = stNum(o.scale, 0) > 0 ? stNum(o.scale, 0) : Math.max(rect.w / b.w, rect.h / b.h);
  const position = o.position && typeof o.position === 'object'
    ? { x: stNum(o.position.x, 0), y: stNum(o.position.y, 0) }
    : { x: (rect.x + rect.w / 2 - b.canvasW / 2) / b.canvasH * 100, y: ST_POSITION_Y_UP * (b.canvasH / 2 - (rect.y + rect.h / 2)) / b.canvasH * 100 };
  const r = stRectInBox({ srcW: o.srcW, srcH: o.srcH, canvasW: b.canvasW, canvasH: b.canvasH, scale, position, rect });
  const clean = v => Math.abs(v) < 1e-9 ? 0 : v;
  const insetPct = { top: clean(Math.max(0, r.y)), right: clean(Math.max(0, 100 - r.x - r.w)), bottom: clean(Math.max(0, 100 - r.y - r.h)), left: clean(Math.max(0, r.x)) };
  const needsMask = insetPct.top > 1e-6 || insetPct.right > 1e-6 || insetPct.bottom > 1e-6 || insetPct.left > 1e-6;
  return { quad: ST_QUADS.includes(o.quad) ? o.quad : 'TL', scale, position, insetPct, needsMask };
}
// st-geometry:end

module.exports = { ST_CANVAS_W, ST_CANVAS_H, ST_POSITION_Y_UP, ST_QUADS, stFitBox, stCoverScale, stRectInBox, stCanvasInBox, stQuadRect, stGridPanelInset };
