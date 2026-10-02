// Beat Cutout Gallery: the image work of prepare.py in plain JavaScript, for hosts where Python and Pillow are not
// there (Windows). Each Pillow step it uses is ported from Pillow 12's C code (Resample.c, BoxBlur.c, RankFilter,
// Paste.c, AlphaComposite.c, Offset.c, Convert.c) and Python's Mersenne Twister, so that on the same frame and mask
// the outputs equal prepare.py's; tests/cutout_beat_gallery.test.mjs checks them against prepare.py's own results.
// Images are {w, h, c, d}: c = 1 (L), 3 (RGB) or 4 (RGBA) bytes per pixel, rows top to bottom.
// The panel runs this file in a Web Worker (the message handler at the end); node tests require() it.
(function (root) {
  "use strict";
  const W = 1080, H = 1920;
  const BASE = 15;
  const PHOTO_EDGES = [0, 40, 72, 104, 140, 196, 220, 235, 243, 283, 307, 337, 347, 371, 411, 478];
  const INTRO_CUES = [[29, 40, "up", "clean"], [61, 72, "right", "handdrawn"], [93, 104, "left", "offset"], [132, 140, "down", "clean"]];
  const PREVIEW_CUES = [[7, 227, 235, "left", "clean"], [13, 363, 371, "up", "handdrawn"]];
  const LATE_CUES = [[156, 166, "instant", [.05, .27, .92, .99], 1], [166, 196, "instant", [.47, .15, .98, .52], 1],
    [166, 196, "instant", [.03, .32, .66, .99], 2], [177, 196, "instant", [.42, .40, .98, .99], 3],
    [267, 283, "instant", [.07, .53, .77, .99], 4], [324, 337, "instant", [.15, .42, .84, .87], 5],
    [401, 411, "instant", [.14, .50, .70, .97], 6], [436, 457, "up", [.02, .53, .98, .99], 7],
    [457, 478, "fade", [.12, .20, .88, .99], 8]];
  const LATE_STYLES = ["offset", "clean", "clean", "clean", "none", "clean", "clean", "none"];
  const INDEPENDENT = 8;
  const PLAIN_SLOTS = [6, 10, 12];

  const image = (w, h, c, d) => ({ w, h, c, d: d || new Uint8Array(w * h * c) });
  const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  // ---- Python number formatting -------------------------------------------------------------------------------
  // round(x) (half to even), as prepare.py rounds pixel offsets.
  function pyRound(x) {
    const f = Math.floor(x), r = x - f;
    if (r > 0.5) return f + 1;
    if (r < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }
  // round(x, 3): the nearest 3-decimal value to the exact binary x; an exact tie goes to the even last digit. A double
  // is exactly halfway between two 3-decimal values only when it is an odd number of sixteenths (k/2000 needs a
  // power-of-two denominator), and only then does toFixed (which rounds ties up) differ from Python.
  function pyRound3(x) {
    const s = x * 16;
    if (Number.isInteger(s) && Math.abs(s % 2) === 1) return pyRound(x * 1000) / 1000;
    return Number(x.toFixed(3));
  }

  // ---- Python's random.Random(seed).randbytes ----------------------------------------------------------------
  function mersenne(seed) {
    // init_by_array with the seed's 32-bit words, low word first (trailing zero words dropped, at least one).
    const key = [];
    let n = BigInt(seed);
    do { key.push(Number(n & 0xffffffffn)); n >>= 32n; } while (n > 0n);
    const mt = new Uint32Array(624);
    mt[0] = 19650218;
    for (let i = 1; i < 624; i++) mt[i] = Math.imul(1812433253, mt[i - 1] ^ (mt[i - 1] >>> 30)) + i;
    let i = 1, j = 0;
    for (let k = Math.max(624, key.length); k; k--) {
      mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1664525)) + key[j] + j) >>> 0;
      i++; j++;
      if (i >= 624) { mt[0] = mt[623]; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (let k = 623; k; k--) {
      mt[i] = ((mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1566083941)) - i) >>> 0;
      i++;
      if (i >= 624) { mt[0] = mt[623]; i = 1; }
    }
    mt[0] = 0x80000000;
    let index = 624;
    function next() {
      if (index >= 624) {
        for (let k = 0; k < 624; k++) {
          const y = (mt[k] & 0x80000000) | (mt[(k + 1) % 624] & 0x7fffffff);
          mt[k] = mt[(k + 397) % 624] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
        }
        index = 0;
      }
      let y = mt[index++];
      y ^= y >>> 11;
      y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
      y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
      return (y ^ (y >>> 18)) >>> 0;
    }
    // randbytes(n) for n a multiple of 4: getrandbits(8n).to_bytes(n, "little"), i.e. the words in order.
    function randbytes(count) {
      const out = new Uint8Array(count);
      for (let p = 0; p < count; p += 4) {
        const v = next();
        out[p] = v & 255; out[p + 1] = (v >>> 8) & 255; out[p + 2] = (v >>> 16) & 255; out[p + 3] = v >>> 24;
      }
      return out;
    }
    return { next, randbytes };
  }

  // ---- SHA-256 (synchronous, so a seed needs no await) ---------------------------------------------------------
  const K256 = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb,
    0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f,
    0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  function sha256(bytes) {
    const len = bytes.length, total = Math.ceil((len + 9) / 64) * 64;
    const buf = new Uint8Array(total);
    buf.set(bytes);
    buf[len] = 0x80;
    const bits = len * 8;
    for (let i = 0; i < 8; i++) buf[total - 1 - i] = Math.floor(bits / 2 ** (8 * i)) & 255;
    const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const w = new Uint32Array(64);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = (buf[off + 4 * i] << 24) | (buf[off + 4 * i + 1] << 16) | (buf[off + 4 * i + 2] << 8) | buf[off + 4 * i + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = w[i - 16] + s0 + w[i - 7] + s1;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], k = h[7];
      for (let i = 0; i < 64; i++) {
        const t1 = (k + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        k = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += k;
    }
    const out = new Uint8Array(32);
    for (let i = 0; i < 8; i++) { out[4 * i] = h[i] >>> 24; out[4 * i + 1] = (h[i] >>> 16) & 255; out[4 * i + 2] = (h[i] >>> 8) & 255; out[4 * i + 3] = h[i] & 255; }
    return out;
  }
  const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  // int.from_bytes(sha256(data)[:8], "big")
  function seedOf(bytes) {
    const d = sha256(bytes);
    let n = 0n;
    for (let i = 0; i < 8; i++) n = (n << 8n) | BigInt(d[i]);
    return n;
  }

  // ---- Pillow primitives ---------------------------------------------------------------------------------------
  // convert("L"): ITU-R 601-2 luma in 16-bit fixed point.
  function toL(im) {
    const out = image(im.w, im.h, 1), s = im.d, c = im.c;
    for (let i = 0, p = 0; i < out.d.length; i++, p += c) out.d[i] = (s[p] * 19595 + s[p + 1] * 38470 + s[p + 2] * 7471 + 0x8000) >>> 16;
    return out;
  }
  function sinc(x) { if (x === 0) return 1; x *= Math.PI; return Math.sin(x) / x; }
  const FILTERS = {
    bilinear: [(x) => { if (x < 0) x = -x; return x < 1 ? 1 - x : 0; }, 1],
    bicubic: [(x) => { const a = -0.5; if (x < 0) x = -x; if (x < 1) return ((a + 2) * x - (a + 3)) * x * x + 1; if (x < 2) return (((x - 5) * x + 8) * x - 4) * a; return 0; }, 2],
    lanczos: [(x) => (-3 <= x && x < 3 ? sinc(x) * sinc(x / 3) : 0), 3],
  };
  const PRECISION = 22;
  // precompute_coeffs + normalize_coeffs_8bpc (box edges arrive as C floats).
  function coeffs(inSize, in0, in1, outSize, filter) {
    const [fn, sup] = FILTERS[filter];
    in0 = Math.fround(in0); in1 = Math.fround(in1);
    const scale = Math.fround(in1 - in0) / outSize;
    const filterscale = scale < 1 ? 1 : scale;
    const support = sup * filterscale;
    const ksize = Math.ceil(support) * 2 + 1;
    const kk = new Int32Array(outSize * ksize), bounds = new Int32Array(outSize * 2), tmp = new Float64Array(ksize);
    const inv = 1.0 / filterscale;
    for (let xx = 0; xx < outSize; xx++) {
      const center = in0 + (xx + 0.5) * scale;
      let ww = 0;
      let xmin = Math.trunc(center - support + 0.5);
      if (xmin < 0) xmin = 0;
      let xmax = Math.trunc(center + support + 0.5);
      if (xmax > inSize) xmax = inSize;
      xmax -= xmin;
      for (let x = 0; x < xmax; x++) { const w = fn((x + xmin - center + 0.5) * inv); tmp[x] = w; ww += w; }
      for (let x = 0; x < xmax; x++) {
        const w = ww !== 0 ? tmp[x] / ww : tmp[x];
        kk[xx * ksize + x] = w < 0 ? Math.trunc(-0.5 + w * (1 << PRECISION)) : Math.trunc(0.5 + w * (1 << PRECISION));
      }
      bounds[xx * 2] = xmin; bounds[xx * 2 + 1] = xmax;
    }
    return { ksize, kk, bounds };
  }
  const clipK = (ss) => { const v = ss >> PRECISION; return v < 0 ? 0 : v > 255 ? 255 : v; };
  // Image.resize(size, filter, box) for 8-bit L / RGB images: horizontal pass first, then vertical (Resample.c).
  function resize(im, ow, oh, filter, box) {
    box = box || [0, 0, im.w, im.h];
    if (ow === im.w && oh === im.h && box[0] === 0 && box[1] === 0 && box[2] === im.w && box[3] === im.h) return image(im.w, im.h, im.c, im.d.slice());
    const c = im.c;
    const fb = box.map(Math.fround);
    const needH = ow !== im.w || fb[0] !== 0 || fb[2] !== ow;
    const needV = oh !== im.h || fb[1] !== 0 || fb[3] !== oh;
    const vert = coeffs(im.h, fb[1], fb[3], oh, filter);
    const yFirst = vert.bounds[0], yLast = vert.bounds[oh * 2 - 2] + vert.bounds[oh * 2 - 1];
    let src = im, rowShift = 0;
    if (needH) {
      const hz = coeffs(im.w, fb[0], fb[2], ow, filter);
      const rows = yLast - yFirst;
      const tmp = image(ow, rows, c);
      for (let yy = 0; yy < rows; yy++) {
        const inRow = (yy + yFirst) * im.w * c, outRow = yy * ow * c;
        for (let xx = 0; xx < ow; xx++) {
          const xmin = hz.bounds[xx * 2], xmax = hz.bounds[xx * 2 + 1], k = xx * hz.ksize;
          for (let ch = 0; ch < c; ch++) {
            let ss = 1 << (PRECISION - 1);
            for (let x = 0; x < xmax; x++) ss += im.d[inRow + (x + xmin) * c + ch] * hz.kk[k + x];
            tmp.d[outRow + xx * c + ch] = clipK(ss);
          }
        }
      }
      src = tmp; rowShift = yFirst;
    }
    if (!needV) return src;
    const out = image(src.w, oh, c);
    for (let yy = 0; yy < oh; yy++) {
      const ymin = vert.bounds[yy * 2] - rowShift, ymax = vert.bounds[yy * 2 + 1], k = yy * vert.ksize;
      for (let i = 0; i < src.w * c; i++) {
        let ss = 1 << (PRECISION - 1);
        for (let y = 0; y < ymax; y++) ss += src.d[(y + ymin) * src.w * c + i] * vert.kk[k + y];
        out.d[yy * src.w * c + i] = clipK(ss);
      }
    }
    return out;
  }
  // ImageOps.fit(im, (w, h), method): the centred crop of the target ratio, resized with that box.
  function fit(im, w, h, filter) {
    const ratio = im.w / im.h, outRatio = w / h;
    let cw, ch;
    if (ratio === outRatio) { cw = im.w; ch = im.h; }
    else if (ratio >= outRatio) { cw = outRatio * im.h; ch = im.h; }
    else { cw = im.w; ch = im.w / outRatio; }
    const left = (im.w - cw) * 0.5, top = (im.h - ch) * 0.5;
    return resize(im, w, h, filter, [left, top, left + cw, top + ch]);
  }
  // GaussianBlur(radius): three box blurs with a fractional radius (BoxBlur.c), C float arithmetic.
  function blurRadius(radius, passes) {
    const f = Math.fround;
    radius = f(radius);
    const sigma2 = f(f(radius * radius) / passes);
    const L = f(Math.sqrt(12.0 * sigma2 + 1.0));
    const l = f(Math.floor((L - 1.0) / 2.0));
    let a = f(f(f(2 * l) + 1) * f(f(l * f(l + 1)) - f(3 * sigma2)));
    a = f(a / f(6 * f(sigma2 - f(f(l + 1) * f(l + 1)))));
    return f(l + a);
  }
  function boxBlurLine(line, n, fr, out) {
    const radius = Math.trunc(fr);
    const ww = Math.trunc(Math.fround(16777216 / Math.fround(fr * 2 + 1)));
    const fw = Math.trunc((16777216 - (radius * 2 + 1) * ww) / 2);
    const lastx = n - 1, edgeA = Math.min(radius + 1, n), edgeB = Math.max(n - radius - 1, 0);
    let acc = line[0] * (radius + 1);
    for (let x = 0; x < edgeA - 1; x++) acc += line[x];
    acc += line[lastx] * (radius - edgeA + 1);
    const save = (x, left, right) => { out[x] = Math.floor((acc * ww + (line[left] + line[right]) * fw + 8388608) / 16777216); };
    if (edgeA <= edgeB) {
      for (let x = 0; x < edgeA; x++) { acc += line[x + radius] - line[0]; save(x, 0, x + radius + 1); }
      for (let x = edgeA; x < edgeB; x++) { acc += line[x + radius] - line[x - radius - 1]; save(x, x - radius - 1, x + radius + 1); }
      for (let x = edgeB; x <= lastx; x++) { acc += line[lastx] - line[x - radius - 1]; save(x, x - radius - 1, lastx); }
    } else {
      for (let x = 0; x < edgeB; x++) { acc += line[x + radius] - line[0]; save(x, 0, x + radius + 1); }
      for (let x = edgeB; x < edgeA; x++) { acc += line[lastx] - line[0]; save(x, 0, lastx); }
      for (let x = edgeA; x <= lastx; x++) { acc += line[lastx] - line[x - radius - 1]; save(x, x - radius - 1, lastx); }
    }
  }
  function gaussianBlur(im, radius) {
    if (im.c !== 1) throw new Error("gaussianBlur: L images only");
    const r = blurRadius(radius, 3), out = image(im.w, im.h, 1, im.d.slice());
    if (r === 0) return out;
    const row = new Uint8Array(im.w), res = new Uint8Array(Math.max(im.w, im.h));
    for (let y = 0; y < im.h; y++) {
      const o = y * im.w;
      for (let pass = 0; pass < 3; pass++) {
        row.set(out.d.subarray(o, o + im.w));
        boxBlurLine(row, im.w, r, res);
        out.d.set(res.subarray(0, im.w), o);
      }
    }
    const col = new Uint8Array(im.h);
    for (let x = 0; x < im.w; x++) {
      for (let y = 0; y < im.h; y++) col[y] = out.d[y * im.w + x];
      for (let pass = 0; pass < 3; pass++) { boxBlurLine(col, im.h, r, res); col.set(res.subarray(0, im.h)); }
      for (let y = 0; y < im.h; y++) out.d[y * im.w + x] = col[y];
    }
    return out;
  }
  // MaxFilter(size) on an L image: the edge-replicated window maximum (separable; van Herk / Gil-Werman per line).
  function maxLine(src, n, r, out, g, h) {
    const size = 2 * r + 1, m = n + 2 * r;
    const at = (i) => src[i < r ? 0 : i >= n + r ? n - 1 : i - r];
    for (let i = 0; i < m; i++) g[i] = i % size === 0 ? at(i) : Math.max(g[i - 1], at(i));
    for (let i = m - 1; i >= 0; i--) h[i] = i === m - 1 || (i + 1) % size === 0 ? at(i) : Math.max(h[i + 1], at(i));
    for (let x = 0; x < n; x++) out[x] = Math.max(h[x], g[x + 2 * r]);
  }
  function maxFilter(im, size) {
    const r = size >> 1, out = image(im.w, im.h, 1), n = Math.max(im.w, im.h);
    const g = new Uint8Array(n + 2 * r), h = new Uint8Array(n + 2 * r), line = new Uint8Array(n), res = new Uint8Array(n);
    const tmp = new Uint8Array(im.d.length);
    for (let y = 0; y < im.h; y++) { maxLine(im.d.subarray(y * im.w, (y + 1) * im.w), im.w, r, res, g, h); tmp.set(res.subarray(0, im.w), y * im.w); }
    for (let x = 0; x < im.w; x++) {
      for (let y = 0; y < im.h; y++) line[y] = tmp[y * im.w + x];
      maxLine(line, im.h, r, res, g, h);
      for (let y = 0; y < im.h; y++) out.d[y * im.w + x] = res[y];
    }
    return out;
  }
  function point(im, fn) {
    const lut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) lut[v] = clamp8(fn(v));
    const out = image(im.w, im.h, im.c);
    for (let i = 0; i < im.d.length; i++) out.d[i] = lut[im.d[i]];
    return out;
  }
  const threshold = (im) => point(im, (v) => (v >= 128 ? 255 : 0));
  // Image.composite(a, b, mask) for L images: b pasted over with a through the mask (Paste.c BLEND).
  function composite(a, b, mask) {
    const out = image(a.w, a.h, 1);
    for (let i = 0; i < out.d.length; i++) {
      const m = mask.d[i], t = b.d[i] * (255 - m) + a.d[i] * m + 128;
      out.d[i] = ((t >>> 8) + t) >>> 8;
    }
    return out;
  }
  // ImageChops.offset(im, dx, dy): rolled, so pixel (x, y) comes from (x - dx, y - dy) wrapped.
  function offset(im, dx, dy) {
    const out = image(im.w, im.h, im.c);
    let xo = im.w - (dx % im.w), yo = im.h - (dy % im.h);
    if (xo < 0) xo += im.w;
    if (yo < 0) yo += im.h;
    for (let y = 0; y < im.h; y++) {
      const sy = (y + yo) % im.h;
      for (let x = 0; x < im.w; x++) {
        const sx = (x + xo) % im.w;
        for (let ch = 0; ch < im.c; ch++) out.d[(y * im.w + x) * im.c + ch] = im.d[(sy * im.w + sx) * im.c + ch];
      }
    }
    return out;
  }
  // Image.alpha_composite(dst, src) for RGBA (AlphaComposite.c, 7 extra bits).
  function alphaComposite(dst, src) {
    const out = image(dst.w, dst.h, 4), D = dst.d, S = src.d, O = out.d;
    const div = (a) => (((a >>> 8) + a) >>> 8);
    for (let p = 0; p < O.length; p += 4) {
      const sa = S[p + 3];
      if (sa === 0) { O[p] = D[p]; O[p + 1] = D[p + 1]; O[p + 2] = D[p + 2]; O[p + 3] = D[p + 3]; continue; }
      const blend = D[p + 3] * (255 - sa), outa255 = sa * 255 + blend;
      const coef1 = Math.floor((sa * 255 * 255 * 128) / outa255), coef2 = 255 * 128 - coef1;
      for (let ch = 0; ch < 3; ch++) O[p + ch] = div(S[p + ch] * coef1 + D[p + ch] * coef2 + (0x80 << 7)) >>> 7;
      O[p + 3] = div(outa255 + 0x80);
    }
    return out;
  }
  // RGB(A) + an L band -> RGBA with that alpha (convert("RGBA") then putalpha).
  function withAlpha(rgb, alpha) {
    const out = image(rgb.w, rgb.h, 4);
    for (let i = 0, p = 0, q = 0; i < alpha.d.length; i++, p += rgb.c, q += 4) {
      out.d[q] = rgb.d[p]; out.d[q + 1] = rgb.d[p + 1]; out.d[q + 2] = rgb.d[p + 2]; out.d[q + 3] = alpha.d[i];
    }
    return out;
  }
  // getbbox() of the non-zero pixels of an L image (or of `band` of a wider one), or null.
  function bbox(im, band = 0) {
    let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1;
    for (let y = 0; y < im.h; y++) {
      const row = y * im.w;
      for (let x = 0; x < im.w; x++) {
        if (im.d[(row + x) * im.c + band]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y; }
      }
    }
    return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
  }
  // ImageStat.Stat(im.crop(box)).mean[0] for an L image.
  function meanOf(im, box) {
    let sum = 0;
    for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) sum += im.d[y * im.w + x];
    return sum / ((box[2] - box[0]) * (box[3] - box[1]));
  }

  // ---- prepare.py --------------------------------------------------------------------------------------------
  // photo_fingerprint: a 64-bit difference hash (BigInt) and a 32x32 RGB thumbnail.
  function photoFingerprint(frame) {
    const gray = resize(toL(frame), 9, 8, "lanczos");
    let bits = 0n;
    for (let i = 0; i < 64; i++) {
      const p = Math.floor(i / 8) * 9 + (i % 8);
      if (gray.d[p] > gray.d[p + 1]) bits |= 1n << BigInt(i);
    }
    return { bits, tiny: resize(frame, 32, 32, "bilinear") };
  }
  function popcount(n) { let c = 0; while (n) { c += Number(n & 1n); n >>= 1n; } return c; }
  function nearDuplicate(fp, previous) {
    for (const old of previous) {
      if (popcount(BigInt(fp.bits) ^ BigInt(old.bits)) > 3) continue;
      const a = fp.tiny.d || fp.tiny, b = old.tiny.d || old.tiny, sums = [0, 0, 0];
      for (let i = 0; i < a.length; i++) sums[i % 3] += Math.abs(a[i] - b[i]);
      const n = a.length / 3, means = sums.map((s) => s / n);
      if ((means[0] + means[1] + means[2]) / 3 < 12) return true;
    }
    return false;
  }
  function quality(mask) {
    const m = threshold(mask);
    const stat = (box) => meanOf(m, box) / 255;
    const area = stat([0, 0, W, H]);
    const left = stat([0, 0, 9, H]), right = stat([W - 9, 0, W, H]), top = stat([0, 0, W, 9]);
    const corner = Math.max(...[[0, 0, 60, 60], [W - 60, 0, W, 60], [0, H - 60, 60, H], [W - 60, H - 60, W, H]].map(stat));
    const box = bbox(m) || [0, 0, W, H];
    const ok = .045 <= area && area <= .82 && Math.max(left, right) < .035 && top < .025 && corner < .04;
    return [ok, { area: pyRound3(area), left: pyRound3(left), right: pyRound3(right), top: pyRound3(top), corner: pyRound3(corner),
      box: [pyRound3(box[0] / W), pyRound3(box[1] / H), pyRound3(box[2] / W), pyRound3(box[3] / H)] }];
  }
  function handdrawnEdge(mask) {
    const rng = mersenne(seedOf(resize(mask, 64, 64, "bicubic").d));
    let coarse = image(64, 114, 1, rng.randbytes(64 * 114));
    coarse = gaussianBlur(resize(coarse, W, H, "bicubic"), 5);
    const medium = point(coarse, (v) => Math.max(0, Math.min(255, (v - 90) * 8)));
    const wide = point(coarse, (v) => Math.max(0, Math.min(255, (v - 145) * 8)));
    const solid = threshold(mask);
    const narrow = maxFilter(solid, 11), normal = maxFilter(solid, 17), broad = maxFilter(solid, 23);
    let edge = composite(broad, normal, wide);
    edge = composite(edge, narrow, medium);
    return threshold(edge);
  }
  function paperColor(edge) {
    const rng = mersenne(seedOf(resize(edge, 64, 64, "bicubic").d));
    const raw = rng.randbytes(540 * 960);
    for (let i = 0; i < raw.length; i++) raw[i] = 245 + (raw[i] % 11);
    const grain = resize(image(540, 960, 1, raw), W, H, "bilinear");
    const out = image(W, H, 4);
    for (let i = 0, q = 0; i < grain.d.length; i++, q += 4) {
      const g = grain.d[i];
      out.d[q] = g; out.d[q + 1] = g; out.d[q + 2] = clamp8(g - 5); out.d[q + 3] = edge.d[i];
    }
    return out;
  }
  function compose(frame, mask, style) {
    let result = image(W, H, 4);
    if (style !== "none") {
      let edge = style === "handdrawn" ? handdrawnEdge(mask) : maxFilter(mask, 23);
      if (style === "offset") {
        edge = offset(edge, -7, -2);
        for (let y = 0; y < H; y++) for (let x = W - 8; x < W; x++) edge.d[y * W + x] = 0;
        edge.d.fill(0, (H - 3) * W);
      }
      let white;
      if (style === "handdrawn") white = paperColor(edge);
      else { white = image(W, H, 4); for (let i = 0, q = 0; i < edge.d.length; i++, q += 4) { white.d[q] = 255; white.d[q + 1] = 255; white.d[q + 2] = 255; white.d[q + 3] = edge.d[i]; } }
      result = alphaComposite(result, white);
    }
    return alphaComposite(result, withAlpha(frame, gaussianBlur(mask, .7)));
  }
  // The photo with its sticker layer over it, as RGB (the revealed photo keeps its outline).
  function shown(frame, layer) {
    const lit = alphaComposite(withAlpha(frame, image(W, H, 1, new Uint8Array(W * H).fill(255))), layer);
    const out = image(W, H, 3);
    for (let i = 0, p = 0, q = 0; i < W * H; i++, p += 3, q += 4) { out.d[p] = lit.d[q]; out.d[p + 1] = lit.d[q + 1]; out.d[p + 2] = lit.d[q + 2]; }
    return out;
  }
  // place(): from the layer's alpha bounding box (alpha >= 128) to an offset and scale that fill `box`.
  function layerBox(layer) { return bbox(threshold(image(layer.w, layer.h, 1, layer.d.filter((_, i) => i % 4 === 3)))); }
  function place(alphaBox, box) {
    const [bx0, by0, bx1, by1] = alphaBox || [0, 0, W, H];
    const tx0 = box[0] * W, ty0 = box[1] * H, tx1 = box[2] * W, ty1 = box[3] * H;
    const s = Math.max(.3, Math.min(1.3, Math.min((tx1 - tx0) / Math.max(1, bx1 - bx0), (ty1 - ty0) / Math.max(1, by1 - by0))));
    const x = (tx0 + tx1) / 2 - W / 2 - s * ((bx0 + bx1) / 2 - W / 2);
    const y = box[3] >= .97 ? (ty1 - H / 2 - s * (by1 - H / 2)) : ((ty0 + ty1) / 2 - H / 2 - s * ((by0 + by1) / 2 - H / 2));
    return [pyRound(x), pyRound(y), pyRound3(s)];
  }
  // The general edit's choices (prepare.py after the masks): which photo is a scene, which a sticker, and the cues.
  // `rows` are the per-photo rows (index from 1), `good` the indexes of clean cutouts in order, `photoCount` all photos.
  // Returns {ready: false, ...} as prepare.py prints it, or the plan the caller renders.
  function plan(rows, good, photoCount, rejected) {
    const independentN = INDEPENDENT - (good.length === INTRO_CUES.length + PREVIEW_CUES.length + INDEPENDENT - 1 ? 1 : 0);
    const lateCues = independentN === INDEPENDENT ? LATE_CUES : LATE_CUES.filter((c) => c[4] < INDEPENDENT)
      .map(([a, b, d, box, n]) => [a, n === INDEPENDENT - 1 ? 478 : b, d, box, n]);
    const needGood = INTRO_CUES.length + PREVIEW_CUES.length + independentN, needTotal = BASE + independentN;
    if (good.length < needGood || photoCount < needTotal)
      return { ready: false, base: photoCount, stickers: good.length, needBase: needTotal, needStickers: needGood, rejected, rows };
    const independent = good.slice(-independentN);
    const pool = good.filter((i) => !independent.includes(i));
    const intro = pool.slice(0, INTRO_CUES.length);
    const previews = pool.slice(INTRO_CUES.length, INTRO_CUES.length + PREVIEW_CUES.length);
    const others = [];
    for (let i = 1; i <= photoCount; i++) if (!independent.includes(i) && !intro.includes(i) && !previews.includes(i)) others.push(i);
    const area = (i) => { const r = rows.find((x) => x.index === i); return r ? (r.area ?? 1) : 1; };
    const plain = others.slice(1).sort((a, b) => area(b) - area(a)).slice(0, PLAIN_SLOTS.length);
    const rest = others.filter((i) => !plain.includes(i));
    const baseIds = new Array(BASE).fill(null);
    intro.forEach((i, k) => { baseIds[k + 1] = i; });
    PREVIEW_CUES.forEach(([slot], k) => { if (k < previews.length) baseIds[slot] = previews[k]; });
    PLAIN_SLOTS.forEach((slot, k) => { if (k < plain.length) baseIds[slot - 1] = plain[k]; });
    let fill = 0;
    for (let k = 0; k < BASE; k++) if (baseIds[k] === null) baseIds[k] = rest[fill++];
    // Layers in file order: [index, style, outline] (an outline also redraws the photo).
    const layers = [];
    intro.forEach((i, k) => layers.push({ index: i, style: INTRO_CUES[k][3], outline: true }));
    previews.forEach((i, k) => layers.push({ index: i, style: PREVIEW_CUES[k][4], outline: true }));
    independent.forEach((i, k) => layers.push({ index: i, style: LATE_STYLES[k], outline: false, late: k + 1 }));
    layers.forEach((l, j) => { l.file = String(j + 1).padStart(2, "0") + "-sticker.mov"; });
    const cues = [];
    intro.forEach((i, k) => { const [start, end, dir] = INTRO_CUES[k]; cues.push({ start, end, dir, x: 0, y: 0, s: 1, file: layers[k].file }); });
    previews.forEach((i, k) => { const [, start, end, dir] = PREVIEW_CUES[k]; cues.push({ start, end, dir, x: 0, y: 0, s: 1, file: layers[intro.length + k].file }); });
    const late = lateCues.map(([start, end, dir, box, n]) => ({ start, end, dir, box, file: layers.find((l) => l.late === n).file }));
    const bases = baseIds.map((i, slot) => ({ index: i, slot: slot + 1, frames: PHOTO_EDGES[slot + 1] - PHOTO_EDGES[slot] + (slot === BASE - 1 ? 8 : 0),
      file: String(slot + 1).padStart(2, "0") + "-base.mp4" }));
    return { ready: true, layers, cues, late, bases, baseIds };
  }
  // The rest of prepare.py's result once every layer is rendered: `boxes` maps a sticker file to its alpha box.
  function finish(p, rows, boxes, rejected, extra) {
    const cues = p.cues.map((c) => ({ ...c }));
    for (const c of p.late) { const [x, y, s] = place(boxes[c.file], c.box); cues.push({ start: c.start, end: c.end, dir: c.dir, x, y, s, file: c.file }); }
    p.layers.forEach((l, j) => { rows[l.index - 1].stickerNumber = j + 1; });
    for (const b of p.bases) rows[b.index - 1].baseSlot = b.slot;
    let spot = { x: .5, y: .33 };
    const r6 = rows.find((r) => r.index === p.baseIds[5]) || {};
    if (r6.box) { const [bx0, by0, bx1, by1] = r6.box; spot = { x: pyRound3((bx0 + bx1) / 2), y: pyRound3(by0 + (by1 - by0) * .16) }; }
    return { ready: true, ...extra, base: BASE, stickers: p.layers.length, approvedStickers: false, cues, spot, rows, rejected };
  }

  // ---- Worker ---------------------------------------------------------------------------------------------------
  // A photo file's bytes -> the 1080x1920 frame prepare.py makes (EXIF-rotated, checked, cover-fitted), decoded by the
  // browser (createImageBitmap honours EXIF orientation). `decode` is replaceable for tests.
  async function decodeBrowser(bytes) {
    const bitmap = await createImageBitmap(new Blob([bytes]), { imageOrientation: "from-image" });
    try {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      const rgba = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data, rgb = image(bitmap.width, bitmap.height, 3);
      for (let i = 0, p = 0; p < rgb.d.length; i += 4, p += 3) { rgb.d[p] = rgba[i]; rgb.d[p + 1] = rgba[i + 1]; rgb.d[p + 2] = rgba[i + 2]; }
      return rgb;
    } finally { bitmap.close?.(); }
  }
  // One photo, as prepare.py's first loop sees it: {reason} when skipped, else the frame and its fingerprint.
  function framePhoto(rgb, previous) {
    if (rgb.h <= rgb.w) return { reason: "landscape photo" };
    if (rgb.w < 640 || rgb.h < 900) return { reason: "resolution too low" };
    const frame = fit(rgb, W, H, "lanczos");
    const fp = photoFingerprint(frame);
    if (nearDuplicate(fp, previous)) return { reason: "near-duplicate photo" };
    return { frame: frame.d, bits: fp.bits.toString(16), tiny: fp.tiny.d };
  }
  // A mask of any size as prepare.py reads it: L, resized to 1080x1920 (bicubic), then checked.
  function maskOf(gray, w, h) {
    const mask = resize(image(w, h, 1, gray), W, H, "bicubic");
    const [ok, metrics] = quality(mask);
    return { mask: mask.d, ok, metrics };
  }
  const ops = {
    async frame({ bytes, rgb, w, h, previous }, decode) {
      let src;
      try { src = rgb ? image(w, h, 3, new Uint8Array(rgb)) : await (decode || decodeBrowser)(bytes); }
      catch (e) { return { reason: String(e && e.message || e || "unreadable photo").slice(0, 120) }; }
      return framePhoto(src, (previous || []).map((p) => ({ bits: BigInt("0x" + p.bits), tiny: p.tiny })));
    },
    mask: ({ gray, w, h }) => maskOf(new Uint8Array(gray), w, h),
    plan: ({ rows, good, photoCount, rejected }) => plan(rows, good, photoCount, rejected),
    layer({ frame, mask, style, outline }) {
      const f = image(W, H, 3, new Uint8Array(frame)), m = image(W, H, 1, new Uint8Array(mask));
      const layer = compose(f, m, style);
      return { layer: layer.d, box: layerBox(layer), shown: outline ? shown(f, layer).d : null };
    },
    finish: ({ plan: p, rows, boxes, rejected, extra }) => finish(p, rows, boxes, rejected, extra),
  };
  const api = { W, H, BASE, PHOTO_EDGES, image, pyRound, pyRound3, mersenne, sha256, hex, seedOf, toL, resize, fit, gaussianBlur, maxFilter,
    point, threshold, composite, offset, alphaComposite, withAlpha, bbox, photoFingerprint, nearDuplicate, quality, handdrawnEdge, paperColor,
    compose, shown, layerBox, place, plan, finish, framePhoto, maskOf, ops };
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (typeof root.postMessage === "function" && typeof root.document === "undefined") {
    // Messages are {id, op, args}; the answer is {id, ok} or {id, error}, with byte arrays transferred.
    root.onmessage = async (e) => {
      const { id, op, args } = e.data || {};
      try {
        if (!ops[op]) throw new Error("unknown operation " + op);
        const ok = await ops[op](args);
        const transfer = [];
        for (const v of Object.values(ok || {})) if (v && v.buffer && Object.prototype.toString.call(v.buffer) === "[object ArrayBuffer]") transfer.push(v.buffer);
        root.postMessage({ id, ok }, [...new Set(transfer)]);
      } catch (err) {
        root.postMessage({ id, error: String(err && err.message || err) });
      }
    };
  }
})(typeof self !== "undefined" ? self : this);
