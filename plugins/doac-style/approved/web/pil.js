// Pillow-compatible raster primitives over the doacft WebAssembly module
// (FreeType 2.14.3 + Pillow 12.3.0 libImaging). Images live in wasm memory;
// every image made inside `pil.scope(fn)` is freed when fn returns unless it
// was passed to `pil.keep`.
function createPil(wasmBytes) {
  // The module needs no files or console: preopens report none (EBADF), the rest ENOSYS.
  const wasi = new Proxy({}, { get: (_, name) => name === 'proc_exit' ? (c) => { throw Error('wasm exit ' + c); } : name === 'fd_prestat_get' ? () => 8 : () => 52 });
  const instance = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes), { wasi_snapshot_preview1: wasi });
  const X = instance.exports;
  if (X._initialize) X._initialize();
  const mem = () => new Uint8Array(X.memory.buffer);
  const MODES = { L: 0, RGB: 1, RGBA: 2 };
  let scopeStack = [];

  class Img {
    constructor(ptr, mode) {
      if (!ptr) throw Error('Image allocation failed');
      this.ptr = ptr; this.mode = mode;
      this.width = X.img_width(ptr); this.height = X.img_height(ptr);
      this.linesize = X.img_linesize(ptr);
      this._scope = scopeStack.length ? scopeStack[scopeStack.length - 1] : null;
      if (this._scope) this._scope.add(this);
    }
    get size() { return [this.width, this.height]; }
    // Live view of the pixel block (rows are `linesize` apart; RGB uses 4 bytes per pixel).
    data() { return new Uint8Array(X.memory.buffer, X.img_data(this.ptr), this.linesize * this.height); }
    copy() { return new Img(X.img_copy(this.ptr), this.mode); }
    crop(box) { return new Img(X.img_crop(this.ptr, box[0], box[1], box[2], box[3]), this.mode); }
    getbbox() {
      const out = X.dc_malloc(16);
      try {
        if (!X.img_getbbox(this.ptr, out)) return null;
        const v = new Int32Array(X.memory.buffer, out, 4);
        return [v[0], v[1], v[2], v[3]];
      } finally { X.dc_free(out); }
    }
    resize(size, filter = 1) { return new Img(X.img_resize(this.ptr, size[0], size[1], filter), this.mode); }
    gaussianBlur(r) {
      const [rx, ry] = Array.isArray(r) ? r : [r, r];
      return new Img(X.img_gaussian_blur(this.ptr, rx, ry), this.mode);
    }
    // Image.point(lut) for an L image (lut: 256 ints 0..255).
    point(lut) {
      const out = this.copy(), d = out.data();
      for (let i = 0; i < d.length; i++) d[i] = lut[d[i]];
      return out;
    }
    // Image.paste(color, (x, y), mask) / Image.paste(color, box) / Image.paste(image, (x, y))
    paste(src, xy, mask) {
      if (src instanceof Img) { X.img_paste(this.ptr, src.ptr, xy[0], xy[1]); return; }
      const ink = packColor(src, this.mode);
      if (mask) X.img_fill_mask(this.ptr, ink, mask.ptr, xy ? xy[0] : 0, xy ? xy[1] : 0);
      else X.img_fill_box(this.ptr, ink, xy[0], xy[1], xy[2], xy[3]);
    }
    free() { if (this.ptr) { X.img_free(this.ptr); this.ptr = 0; if (this._scope) this._scope.delete(this); } }
  }

  function packColor(c, mode) {
    if (typeof c === 'number') return mode === 'L' ? c & 255 : ((c & 255) | ((c & 255) << 8) | ((c & 255) << 16) | (255 << 24)) >>> 0;
    const [r, g, b, a = 255] = c;
    return ((r & 255) | ((g & 255) << 8) | ((b & 255) << 16) | ((a & 255) << 24)) >>> 0;
  }

  function newImage(mode, size, color = 0) {
    return new Img(X.img_new(MODES[mode], size[0], size[1], packColor(color, mode)), mode);
  }

  function fromBytes(mode, size, bytes) {
    const im = newImage(mode, size, 0);
    im.data().set(bytes);
    return im;
  }

  // Every image belongs to the innermost open scope and is freed when it closes;
  // keep(im) hands it to the enclosing scope instead.
  function scope(fn) {
    const set = new Set();
    scopeStack.push(set);
    try { return fn(); } finally { scopeStack.pop(); for (const im of set) im.free(); }
  }
  async function scopeAsync(fn) {
    const set = new Set();
    scopeStack.push(set);
    try { return await fn(); } finally { scopeStack.splice(scopeStack.indexOf(set), 1); for (const im of set) im.free(); }
  }
  function keep(im) {
    if (!im || !im._scope) return im;
    const i = scopeStack.indexOf(im._scope);
    im._scope.delete(im);
    im._scope = i > 0 ? scopeStack[i - 1] : null;
    if (im._scope) im._scope.add(im);
    return im;
  }

  function codepoints(text) {
    const cps = Array.from(String(text), c => c.codePointAt(0));
    const ptr = X.dc_malloc(cps.length * 4 + 4);
    new Uint32Array(X.memory.buffer, ptr, cps.length + 1).set([...cps, 0]);
    return [ptr, cps.length];
  }
  const anchorCode = a => a ? a.charCodeAt(0) | (a.charCodeAt(1) << 8) : 0;

  class Font {
    constructor(bytes, size, index = 0) {
      const p = X.dc_malloc(bytes.length);
      mem().set(bytes, p);
      this.ptr = X.font_new(p, bytes.length, index, size);
      X.dc_free(p);
      if (!this.ptr) throw Error('Could not load the caption font');
      this.size = size; this.index = index;
    }
    getlength(text) {
      const [p, n] = codepoints(text);
      try { return X.font_getlength(this.ptr, p, n) / 64; } finally { X.dc_free(p); }
    }
    getsize(text, anchor) {
      const [p, n] = codepoints(text), out = X.dc_malloc(16);
      try {
        if (X.font_getsize(this.ptr, p, n, anchorCode(anchor), out)) throw Error('bad text layout');
        const v = new Int32Array(X.memory.buffer, out, 4);
        return [[v[0], v[1]], [v[2], v[3]]];
      } finally { X.dc_free(p); X.dc_free(out); }
    }
    // FreeTypeFont.getbbox(text, stroke_width=, anchor=)
    getbbox(text, { stroke_width = 0, anchor } = {}) {
      const [size, offset] = this.getsize(text, anchor);
      const left = offset[0] - stroke_width, top = offset[1] - stroke_width;
      const width = size[0] + 2 * stroke_width, height = size[1] + 2 * stroke_width;
      return [left, top, left + width, top + height];
    }
    // font.render(...) -> [L image, [x, y]]
    render(text, { stroke_width = 0, stroke_filled = false, anchor, start = [0, 0] } = {}) {
      const [p, n] = codepoints(text), out = X.dc_malloc(8);
      try {
        const ptr = X.font_render(this.ptr, p, n, stroke_width, stroke_filled ? 1 : 0, anchorCode(anchor), start[0], start[1], out);
        const v = new Int32Array(X.memory.buffer, out, 2);
        return [new Img(ptr, 'L'), [v[0], v[1]]];
      } finally { X.dc_free(p); X.dc_free(out); }
    }
    free() { if (this.ptr) { X.font_free(this.ptr); this.ptr = 0; } }
  }

  // math.modf fractional part (keeps the sign) and int() truncation, as ImageDraw.text uses them.
  const frac = v => v - Math.trunc(v);

  // ImageDraw.Draw(im).text(xy, text, font=, fill=, stroke_width=, stroke_fill=, anchor=), one line.
  function drawText(im, xy, text, { font, fill, stroke_width = 0, stroke_fill = null, anchor = null }) {
    const ink = fill;
    const strokeInk = stroke_width ? (stroke_fill != null ? stroke_fill : ink) : null;
    const draw = (inkValue, sw) => {
      let x = Math.trunc(xy[0]), y = Math.trunc(xy[1]);
      const start = [frac(xy[0]), frac(xy[1])];
      const [mask, offset] = font.render(text, { stroke_width: sw, stroke_filled: true, anchor, start });
      x += offset[0]; y += offset[1];
      im.paste(inkValue, [x, y], mask);
      mask.free();
    };
    if (strokeInk != null) {
      draw(strokeInk, stroke_width);
      if (!sameInk(ink, strokeInk)) draw(ink, 0);
    } else draw(ink, 0);
  }
  const sameInk = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  return { Img, Font, newImage, fromBytes, scope, scopeAsync, keep, drawText, exports: X, LANCZOS: 1, BICUBIC: 3 };
}
if (typeof module !== 'undefined') module.exports = { createPil };
