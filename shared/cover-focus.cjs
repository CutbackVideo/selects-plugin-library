// Calculates focus for observed face boxes only; undetected faces and unsampled motion remain unknown.
// Detection boxes are in the displayed source raster, before the existing cover crop.
// This only finds a feasible focus; it cannot make an over-wide group fit a fixed crop.
function faceSafeCoverFocus(source, frame, observation, manualFocus = null) {
  if (manualFocus) {
    if (![manualFocus.focusX, manualFocus.focusY].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) throw Error('Invalid manual focus');
    return { status: 'manual', focusX: manualFocus.focusX, focusY: manualFocus.focusY };
  }
  const W = source.width, H = source.height, w = frame.width, h = frame.height;
  if (![W, H, w, h].every(n => Number.isFinite(n) && n > 0)) throw Error('Invalid crop dimensions');
  if (observation?.coordinateSpace !== 'display-pixels' || observation?.boxFormat !== 'xyxy' ||
      observation?.frameSize?.width !== W || observation?.frameSize?.height !== H || !Array.isArray(observation.samples) || !observation.samples.length) {
    return { status: 'unavailable', reason: 'face-coordinates' };
  }
  let boxCount = 0;
  const bounds = { left: W, right: 0, top: H, bottom: 0 };
  for (const sample of observation.samples) {
    if (!Array.isArray(sample.faces)) return { status: 'unavailable', reason: 'face-coordinates' };
    for (const face of sample.faces) {
      const b = face?.box;
      if (!b || ![b.xmin, b.ymin, b.xmax, b.ymax].every(Number.isFinite) ||
          b.xmin < 0 || b.ymin < 0 || b.xmax > W || b.ymax > H || b.xmin >= b.xmax || b.ymin >= b.ymax) {
        return { status: 'unavailable', reason: 'face-coordinates' };
      }
      boxCount++;
      bounds.left = Math.min(bounds.left, b.xmin); bounds.right = Math.max(bounds.right, b.xmax);
      bounds.top = Math.min(bounds.top, b.ymin); bounds.bottom = Math.max(bounds.bottom, b.ymax);
    }
  }
  if (!boxCount) return { status: 'unavailable', reason: 'no-faces' };
  const cropW = Math.min(W, H * w / h), cropH = Math.min(H, W * h / w);
  if (bounds.right - bounds.left > cropW + 1e-7 || bounds.bottom - bounds.top > cropH + 1e-7) {
    return { status: 'cannot-fit', reason: 'faces-wider-than-crop', observedFaceBoxes: boxCount };
  }
  // Keep the existing centered composition when it already contains every box.
  const centered = bounds.left >= (W - cropW) / 2 && bounds.right <= (W + cropW) / 2 &&
    bounds.top >= (H - cropH) / 2 && bounds.bottom <= (H + cropH) / 2;
  if (centered) return { status: 'focused', focusX: 0.5, focusY: 0.5, changed: false,
    observedFaceBoxes: boxCount, observedBounds: bounds, cropWidth: cropW, cropHeight: cropH };
  const x = Math.max(cropW / 2, Math.min(W - cropW / 2, (bounds.left + bounds.right) / 2));
  const y = Math.max(cropH / 2, Math.min(H - cropH / 2, (bounds.top + bounds.bottom) / 2));
  return { status: 'focused', focusX: x / W, focusY: y / H, changed: true, observedFaceBoxes: boxCount,
    observedBounds: bounds, cropWidth: cropW, cropHeight: cropH };
}

module.exports = { faceSafeCoverFocus };
