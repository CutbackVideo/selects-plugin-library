'use strict';

// Keep the previous bilinear operation order and per-channel rounding exactly.
// A negative index denotes the OpenCV demo's constant gray padding.
function channel(rgb, a, b, c, d, fx, fy, component) {
  return Math.round(
    ((a < 0 ? 110 : rgb[a + component]) * (1 - fx) +
      (b < 0 ? 110 : rgb[b + component]) * fx) * (1 - fy) +
    ((c < 0 ? 110 : rgb[c + component]) * (1 - fx) +
      (d < 0 ? 110 : rgb[d + component]) * fx) * fy
  );
}

// Match expanded crop -> 224 square -> middle 112 grayscale. Horizontal
// coordinates are shared by all rows; padding checks are shared by RGB.
function facePixels(rgb, width, height, geometry) {
  const [x, y, s] = geometry;
  const left = Math.trunc(x - s * 1.4), top = Math.trunc(y - s);
  const cw = Math.max(1, Math.trunc(x + s * 1.4) - left);
  const ch = Math.max(1, Math.trunc(y + s * 1.8) - top);
  const out = new Float32Array(112 * 112);
  const x0 = new Float64Array(112), x1 = new Float64Array(112);
  const weights = new Float64Array(112);
  for (let i = 0; i < 112; i++) {
    const sx = (i + 56 + .5) * cw / 224 - .5;
    const floor = Math.floor(sx), xx = left + floor;
    weights[i] = sx - floor;
    x0[i] = xx < 0 || xx >= width ? -1 : xx * 3;
    x1[i] = xx + 1 < 0 || xx + 1 >= width ? -1 : (xx + 1) * 3;
  }
  for (let j = 0; j < 112; j++) {
    const sy = (j + 56 + .5) * ch / 224 - .5;
    const floor = Math.floor(sy), yy = top + floor, fy = sy - floor;
    const row0 = yy < 0 || yy >= height ? -1 : yy * width * 3;
    const row1 = yy + 1 < 0 || yy + 1 >= height ? -1 : (yy + 1) * width * 3;
    for (let i = 0; i < 112; i++) {
      const a = row0 < 0 || x0[i] < 0 ? -1 : row0 + x0[i];
      const b = row0 < 0 || x1[i] < 0 ? -1 : row0 + x1[i];
      const c = row1 < 0 || x0[i] < 0 ? -1 : row1 + x0[i];
      const d = row1 < 0 || x1[i] < 0 ? -1 : row1 + x1[i];
      const fx = weights[i];
      let r,g,blue;
      // Interior pixels share one bounds check across all three channels.
      if (a>=0 && b>=0 && c>=0 && d>=0) {
        r=Math.round((rgb[a]*(1-fx)+rgb[b]*fx)*(1-fy)+(rgb[c]*(1-fx)+rgb[d]*fx)*fy);
        g=Math.round((rgb[a+1]*(1-fx)+rgb[b+1]*fx)*(1-fy)+(rgb[c+1]*(1-fx)+rgb[d+1]*fx)*fy);
        blue=Math.round((rgb[a+2]*(1-fx)+rgb[b+2]*fx)*(1-fy)+(rgb[c+2]*(1-fx)+rgb[d+2]*fx)*fy);
      } else {
        r=channel(rgb,a,b,c,d,fx,fy,0);
        g=channel(rgb,a,b,c,d,fx,fy,1);
        blue=channel(rgb,a,b,c,d,fx,fy,2);
      }
      out[j * 112 + i] = Math.round(.299 * r + .587 * g + .114 * blue);
    }
  }
  return out;
}

module.exports = {facePixels};
