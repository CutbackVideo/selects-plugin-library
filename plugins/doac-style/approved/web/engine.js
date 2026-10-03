// DOAC Style caption engine, JavaScript port of approved/engine.py,
// approved/geometry.py, approved/compile-captions.py and the parts of
// approved/native/{renderer.py,0YVdjmU13E4/renderer.py,template-layout.py,
// template-service.py} that the approved templates (style.json "templates")
// and the ordinary REF-E48 caption reach. It draws through `pil` (FreeType +
// Pillow compiled to WebAssembly), so every raster step is Pillow's own code.
// Python numeric rules are kept on purpose: round() is half-to-even, numpy
// float32 steps go through Math.fround, and integer division floors.
// Branches the approved templates never reach throw "not ported" instead of
// drawing something different.
'use strict';

function createDoacEngine({ pil, files, fontSource }) {
  // ------------------------------------------------------------ Python rules
  const pyRound = x => {
    const f = Math.floor(x), d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  };
  // round(x, n): correctly rounded, ties to even on the exact binary value.
  function pyRoundN(x, n) {
    if (!Number.isFinite(x)) return x;
    const exact = Math.abs(x).toFixed(100).replace(/0+$/, '');
    const dot = exact.indexOf('.');
    const tail = dot < 0 ? '' : exact.slice(dot + 1 + n);
    if (tail === '5') {
      const head = exact.slice(0, dot + 1 + n).replace(/\.$/, '');
      const last = Number(head[head.length - 1]);
      const down = Number(head);
      const step = Math.pow(10, -n);
      const val = last % 2 === 0 ? down : Number((down + step).toFixed(n));
      return x < 0 ? -val : val;
    }
    return Number(x.toFixed(n));
  }
  const floorDiv = (a, b) => Math.floor(a / b);
  const pyMax = (...v) => v.reduce((a, b) => (b > a ? b : a));
  const pyMin = (...v) => v.reduce((a, b) => (b < a ? b : a));
  const sum = a => a.reduce((s, v) => s + v, 0);
  // str.isupper()
  function isUpper(s) {
    let cased = false;
    for (const ch of s) {
      const lo = ch.toLowerCase(), up = ch.toUpperCase();
      if (lo !== up) { cased = true; if (ch !== up) return false; }
    }
    return cased;
  }
  const upper = s => s.toUpperCase();
  const splitWs = s => s.trim().split(/\s+/).filter(Boolean);
  const basename = p => String(p).split(/[\\/]/).pop();
  function pyRepr(v) {
    if (v === null || v === undefined) return 'None';
    if (v === true) return 'True';
    if (v === false) return 'False';
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
    if (typeof v === 'string') {
      const q = v.includes("'") && !v.includes('"') ? '"' : "'";
      let out = '';
      for (const ch of v) {
        const c = ch.codePointAt(0);
        if (ch === '\\') out += '\\\\';
        else if (ch === q) out += '\\' + q;
        else if (ch === '\n') out += '\\n';
        else if (ch === '\r') out += '\\r';
        else if (ch === '\t') out += '\\t';
        else if (c < 32 || c === 127) out += '\\x' + c.toString(16).padStart(2, '0');
        else out += ch;
      }
      return q + out + q;
    }
    if (Array.isArray(v)) return '[' + v.map(pyRepr).join(', ') + ']';
    if (v && v.__tuple) return '(' + v.items.map(pyRepr).join(', ') + (v.items.length === 1 ? ',' : '') + ')';
    return '{' + Object.entries(v).map(([k, x]) => pyRepr(k) + ': ' + pyRepr(x)).join(', ') + '}';
  }
  const tuple = (...items) => ({ __tuple: true, items });
  function pyError(kind, message) {
    const e = new Error(message == null ? kind : message);
    e.pyType = kind; e.pyMessage = message;
    return e;
  }
  const assert = (cond, msg) => { if (!cond) throw pyError('AssertionError', msg); };
  const notPorted = what => pyError('NotPorted', 'DOAC Style: ' + what + ' is not available in this renderer.');
  // copy.deepcopy for plan data (images are never shared between copies).
  function deepcopy(v) {
    if (v instanceof pil.Img) return v.copy();
    if (Array.isArray(v)) return v.map(deepcopy);
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = deepcopy(v[k]); return o; }
    return v;
  }
  const get = (o, k, d) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : d);

  // ------------------------------------------------------------------ fonts
  const fontCache = new Map();
  function truetype(path, size, index = 0) {
    const key = path + '\u0000' + index + '\u0000' + size;
    if (!fontCache.has(key)) {
      const src = fontSource(path, index);
      fontCache.set(key, new pil.Font(src.bytes, size, src.index));
    }
    return fontCache.get(key);
  }

  // ---------------------------------------------------- scipy gaussian_filter
  // scipy.ndimage.gaussian_filter(np.array(mask, dtype=float), (sy, sx)).astype('uint8'),
  // mode 'reflect', truncate 4; the kernel as scipy's _gaussian_kernel1d builds it.
  function gaussKernel(sigma) {
    const lw = Math.trunc(4.0 * sigma + 0.5);
    const s2 = sigma * sigma, c = -0.5 / s2;
    const phi = [];
    for (let x = -lw; x <= lw; x++) phi.push(Math.exp(c * (x * x)));
    const total = numpySum(phi);
    return phi.map(v => v / total).reverse();
  }
  // numpy pairwise summation (float64)
  function numpySum(a) {
    const pw = (off, n) => {
      if (n < 8) { let r = -0.0; for (let i = 0; i < n; i++) r += a[off + i]; return r; }
      if (n <= 128) {
        const r = [a[off], a[off + 1], a[off + 2], a[off + 3], a[off + 4], a[off + 5], a[off + 6], a[off + 7]];
        let i;
        for (i = 8; i < n - (n % 8); i += 8) for (let k = 0; k < 8; k++) r[k] += a[off + i + k];
        let res = ((r[0] + r[1]) + (r[2] + r[3])) + ((r[4] + r[5]) + (r[6] + r[7]));
        for (; i < n; i++) res += a[off + i];
        return res;
      }
      let n2 = Math.floor(n / 2); n2 -= n2 % 8;
      return pw(off, n2) + pw(off + n2, n - n2);
    };
    return pw(0, a.length);
  }
  // scipy NI_Correlate1D, symmetric-kernel branch, mode 'reflect'
  // (d c b a | a b c d | d c b a, repeated for kernels longer than the line).
  function correlate1d(src, w, h, axis, fw) {
    const out = new Float64Array(src.length);
    const size1 = Math.floor(fw.length / 2);
    const len = axis === 0 ? h : w, lines = axis === 0 ? w : h;
    const buf = new Float64Array(len + 2 * size1), period = 2 * len;
    for (let l = 0; l < lines; l++) {
      for (let i = -size1; i < len + size1; i++) {
        let k = ((i % period) + period) % period;
        if (k >= len) k = period - 1 - k;
        buf[size1 + i] = axis === 0 ? src[k * w + l] : src[l * w + k];
      }
      for (let i = 0; i < len; i++) {
        const c = size1 + i;
        let v = buf[c] * fw[size1];
        for (let jj = -size1; jj < 0; jj++) v += (buf[c + jj] + buf[c - jj]) * fw[size1 + jj];
        if (axis === 0) out[i * w + l] = v; else out[l * w + i] = v;
      }
    }
    return out;
  }
  function scipyGaussianU8(mask, sigmas) {
    const w = mask.width, h = mask.height, d = mask.data();
    let a = Float64Array.from(d);
    sigmas.forEach((s, axis) => { if (s > 1e-15) a = correlate1d(a, w, h, axis, gaussKernel(s)); });
    const out = pil.newImage('L', [w, h]), od = out.data();
    for (let i = 0; i < a.length; i++) od[i] = Math.trunc(a[i]) & 255;
    return out;
  }

  // -------------------------------------------------------------- data files
  const POLICY = JSON.parse(files['style.json']);
  const ENERGY = JSON.parse(files['template-energy.json']);
  const ITEMS = JSON.parse(files['native/shortlist.json']);
  const PM = 'native/fonts/permanentmarker/PermanentMarker-Regular.ttf';
  const ROWS = { '11': [[0], [1, 2, 3], [4], [5]], '22': [[0], [1, 2, 3, 4], [5], [6]], '40': [[0]], '05': [[0], [1], [2], [3], [4], [5]], '06': [[0, 1], [2, 3], [4, 5, 6]], '19': [[0], [1, 2], [3, 4]], '24': [[1, 0], [2], [3], [4]], '13': [[0], [1], [2]], '21': [[0], [1], [2]], '34': [[0], [1]], '33': [[0, 1, 2], [3]], '23': [[0, 1], [2], [3]], '09': [[0, 1, 2], [3, 4], [5]], '38': [[0, 1], [2]] };

  // template-service.py: modern renderers (plan fixes from Renderer.__init__) and
  // the legacy plans (reuse scenes expanded). Fresh copies per compile, as each
  // Python compile is a fresh process.
  function loadService() {
    const renderers = {};
    for (const vid of ['NhbCBo1KuU8', '8_dh-IB9jZ8']) {
      const data = JSON.parse(files['native/' + vid + '/plan.json']);
      const events = data.events;
      for (const e of events) {
        if (!e.runs) e.runs = [];
        for (const run of e.runs) if (String(get(run, 'font', '')).endsWith('PermanentMarker-Regular.ttf')) run.font = PM;
      }
      if (vid === '8_dh-IB9jZ8') for (const r of events[19].runs) if (r.text === '18 - 24') Object.assign(r, { x: 307, y: 645, w: 485, h: 120 });
      if (vid === 'NhbCBo1KuU8') {
        for (const r of events[96].runs) if (r.text === 'Now!') r.rgb = [255, 255, 255];
        for (const r of events[0].runs) if (r.text === 'SELL') { r.rgb = [255, 255, 255]; Object.assign(r, { x: 116, y: 888, w: 140, h: 40 }); }
        for (const r of events[79].runs) if (r.text === "'BAD") r.text = 'BAD';
      }
      renderers[vid] = { vid, events };
    }
    const plans = JSON.parse(files['native/0YVdjmU13E4/plan.json']);
    const old = JSON.parse(files['native/0YVdjmU13E4/legacy-three-scenes.json']);
    for (const e of plans) if (get(e, 'reuse', null)) e.runs = old.filter(r => r.scene === e.reuse).map(r => Object.assign({}, r, { legacy: true }));
    // legacy build() masks are not made: every run a template or REF scene draws
    // gets its mask from the layout below.
    return { renderers, base_legacy_plans: plans };
  }

  function sourceEvent(svc, item) {
    if (item.video === '0YVdjmU13E4') return svc.base_legacy_plans[item.event - 1];
    const e = svc.renderers[item.video].events.find(x => x.id === item.event);
    if (!e) throw pyError('StopIteration', '');
    return e;
  }

  // ------------------------------------------------------------- catalogue
  function catalogue() {
    const svc = loadService();
    const energy = {};
    for (const item of ENERGY) energy[item.id] = item;
    const result = [];
    for (const item of ITEMS) {
      if (!POLICY.templates.includes(item.id)) continue;
      const event = sourceEvent(svc, item);
      const meta = get(energy, item.id, {});
      result.push({
        id: item.id, name: item.name, slots: event.runs.map(r => r.text),
        slotMetrics: event.runs.map(r => ({ text: r.text, width: get(r, 'w', get(r, 'width')), height: get(r, 'h', get(r, 'height')), fontIndex: get(r, 'index', 0), color: get(r, 'rgb', [255, 255, 255]) })),
        condition: get(meta, 'condition', ''), score: get(meta, 'score', null), filmReady: get(meta, 'filmReady', false),
      });
    }
    return { templates: result, planning: files['PLANNING.md'], energy: JSON.parse(files['template-energy.json']) };
  }

  // ---------------------------------------------------------- template-layout
  const wh = r => [get(r, 'w', get(r, 'width')), get(r, 'h', get(r, 'height'))];
  const strokeOf = (r, k) => get(r, 'stroke', pyRound(get(r, 'strokeAt200', 0) * k));
  function cropToBBox(im) {
    const box = im.getbbox();
    return im.crop(box || [0, 0, im.width, im.height]);
  }
  function rasterLayout(r, t) {
    const ft = truetype(r.font, 140, get(r, 'index', 0));
    return pil.scope(() => {
      const im = pil.newImage('L', [6000, 450]);
      pil.drawText(im, [20, 20], t, { font: ft, fill: 255, stroke_width: strokeOf(r, 0.7) });
      return pil.keep(cropToBBox(im));
    });
  }
  const resize = (m, w, h) => {
    if (w <= 0 || h <= 0) throw pyError('ValueError', 'height and width must be > 0');
    return m.resize([w, h], pil.LANCZOS);
  };
  function pasteFull(m, x, y) {
    const full = pil.newImage('L', [540, 960]);
    full.paste(m, [x, y]);
    return full;
  }
  // Intermediate masks are freed; the masks the runs keep move to the caller's scope.
  function applyLayout(item, original, event, texts) {
    return pil.scope(() => applyLayoutInner(item, original, event, texts));
  }
  function applyLayoutInner(item, original, event, texts) {
    if (!ROWS[item.id]) return false;
    const rows = ROWS[item.id], src = original.runs, dst = event.runs;
    if (item.id === '05') return numberLayout(original, event, texts);
    src.forEach((r, i) => { if (isUpper(r.text)) texts[i] = upper(texts[i]); });
    const boxes = [], rowm = [];
    for (const inds of rows) {
      const left = pyMin(...inds.map(i => src[i].x)), top = pyMin(...inds.map(i => src[i].y));
      const right = pyMax(...inds.map(i => src[i].x + wh(src[i])[0])), bottom = pyMax(...inds.map(i => src[i].y + wh(src[i])[1]));
      boxes.push([left, top, right, bottom]);
      const mm = [];
      for (const i of inds) {
        const old = rasterLayout(src[i], src[i].text), nw = rasterLayout(src[i], texts[i]);
        const [w, h] = wh(src[i]);
        mm.push(resize(nw, pyMax(1, pyRound(w * nw.width / old.width / 2)), pyMax(1, pyRound(h * nw.height / old.height / 2))));
      }
      const gaps = [];
      for (let k = 0; k + 1 < inds.length; k++) { const a = inds[k], b = inds[k + 1]; gaps.push(pyMax(5, pyRound((src[b].x - (src[a].x + wh(src[a])[0])) / 2))); }
      rowm.push([mm, gaps]);
    }
    const rectangular = ['13', '21', '34', '33', '09', '38'].includes(item.id);
    const commonleft = pyMin(...boxes.map(b => b[0])), commonright = pyMax(...boxes.map(b => b[2]));
    let resized = [];
    boxes.forEach((box, bi) => {
      const [mm, gaps] = rowm[bi];
      const width = pyRound((rectangular ? commonright - commonleft : box[2] - box[0]) / 2);
      const factor = (width - sum(gaps)) / sum(mm.map(m => m.width));
      const ms = mm.map(m => resize(m, pyMax(1, pyRound(m.width * factor)), pyMax(1, pyRound(m.height * factor))));
      const delta = width - sum(ms.map(m => m.width)) - sum(gaps);
      if (delta) { const last = ms[ms.length - 1]; ms[ms.length - 1] = resize(last, last.width + delta, last.height); }
      resized.push([ms, gaps]);
    });
    const gapsy = [];
    for (let j = 0; j < boxes.length - 1; j++) gapsy.push(pyMax(3, pyRound((boxes[j + 1][1] - boxes[j][3]) / 2)));
    const rowH = ms => pyMax(...ms.map(m => m.height));
    let total = sum(resized.map(([ms]) => rowH(ms))) + sum(gapsy);
    if (total > 245 && !rectangular) {
      resized = resized.map(([ms, gaps], bi) => {
        const box = boxes[bi];
        const factor = pyMin(1, (box[3] - box[1]) / 2 / rowH(ms));
        return [ms.map(m => resize(m, pyMax(1, pyRound(m.width * factor)), pyMax(1, pyRound(m.height * factor)))), gaps.map(g => pyMax(3, pyRound(g * factor)))];
      });
      total = sum(resized.map(([ms]) => rowH(ms))) + sum(gapsy);
      if (total > 245) {
        const factor = (242 - sum(gapsy)) / sum(resized.map(([ms]) => rowH(ms)));
        if (factor < 0.8) throw pyError('ValueError', 'The phrase is too dense for this composition.');
        resized = resized.map(([ms, gaps]) => [ms.map(m => resize(m, pyMax(1, pyRound(m.width * factor)), pyMax(1, pyRound(m.height * factor)))), gaps.map(g => pyMax(3, pyRound(g * factor)))]);
        total = sum(resized.map(([ms]) => rowH(ms))) + sum(gapsy);
      }
    }
    if (total > 245) throw pyError('ValueError', 'This wording does not fit the reference hierarchy. Try a different phrase.');
    let y = pyRound((boxes[0][1] + boxes[boxes.length - 1][3]) / 4 - total / 2);
    rows.forEach((inds, j) => {
      const [ms, gaps] = resized[j], box = boxes[j];
      let x = pyRound((rectangular ? commonleft : box[0]) / 2);
      const rh = rowH(ms);
      inds.forEach((i, k) => {
        const m = ms[k];
        const yy = item.id === '06' ? y + pyRound((src[i].y - box[1]) / 2) : y + rh - m.height;
        const r = dst[i];
        Object.assign(r, { x: x * 2, y: yy * 2, w: m.width * 2, h: m.height * 2 });
        r._customMask = pil.keep(m);
        r._mask = pil.keep(pasteFull(m, x, yy));
        if (get(r, 'legacy', false)) r.glyphs = [];
        delete r._customRevealTimes;
        x += m.width + (k < gaps.length ? gaps[k] : 0);
      });
      y += rh + (j < gapsy.length ? gapsy[j] : 0);
    });
    return true;
  }
  function numberLayout(original, event, texts) {
    const src = original.runs, dst = event.runs;
    for (const i of [1, 2, 3, 5]) texts[i] = upper(texts[i]);
    const draw = (i, text, x, y, w, h) => {
      const r = src[i], ft = truetype(r.font, 140, get(r, 'index', 0));
      let m = pil.scope(() => {
        const big = pil.newImage('L', [5000, 400]);
        pil.drawText(big, [10, 10], text, { font: ft, fill: 255 });
        return pil.keep(cropToBBox(big));
      });
      const scale = pyMin(w / m.width, h / m.height);
      m = resize(m, pyRound(m.width * scale), pyRound(m.height * scale));
      const yy = y + floorDiv(h - m.height, 2);
      Object.assign(dst[i], { x: x * 2, y: yy * 2, w: m.width * 2, h: m.height * 2, _mask: pil.keep(pasteFull(m, x, yy)), _customMask: pil.keep(m), glyphs: [] });
      delete dst[i]._customRevealTimes;
    };
    draw(4, texts[4], 116, 586, 58, 79);
    draw(0, texts[0], 116, 586, 58, 79);
    for (const [i, x, y, w, h] of [[1, 178, 587, 245, 32], [2, 178, 628, 246, 38], [3, 122, 672, 306, 36], [5, 122, 714, 304, 33]]) draw(i, texts[i], x, y, w, h);
    for (const i of [0, 4]) dst[i]._staticNumber = false;
    return true;
  }

  // --------------------------------------------------------------- renderers
  const cl = v => Math.max(0, Math.min(1, v));
  const lutRound = k => Array.from({ length: 256 }, (_, v) => pyRound(v * k));
  const lutInt = k => Array.from({ length: 256 }, (_, v) => Math.trunc(v * k));

  // native/renderer.py write() with the template-service glyph (r._customMask).
  function modernWrite(can, r, { blur = 0, alpha = 1, dy = 0, dx = 0, rgb = null, shadow = true } = {}) {
    const m = r._customMask;
    if (!m) throw notPorted('this caption slot');
    const pad = 22, w = m.width, h = m.height;
    let ma = pil.newImage('L', [w + pad * 2, h + pad * 2]);
    ma.paste(m, [pad, pad]);
    if (blur) ma = ma.gaussianBlur(blur);
    if (alpha < 1) ma = ma.point(lutRound(cl(alpha)));
    const x = pyRound(r.x / 2 + dx) - pad, y = pyRound(r.y / 2 + dy) - pad;
    const color = rgb || r.rgb;
    if (shadow) {
      const sh = ma.gaussianBlur(get(r, 'shadowBlur', 0.65)).point(lutRound(get(r, 'shadowOpacity', 0.84)));
      can.paste([0, 0, 0], [x + pyRound(get(r, 'shadowX', 1)), y + pyRound(get(r, 'shadowY', 2))], sh);
    }
    can.paste(color, [x, y], ma);
  }
  const MODERN_EVENTS = { NhbCBo1KuU8: [86, 13, 28, 67], '8_dh-IB9jZ8': [24, 46, 48, 15] };
  function modernRender(vid, e, f, background) {
    const n = e.id;
    if (!MODERN_EVENTS[vid] || !MODERN_EVENTS[vid].includes(n)) throw notPorted('event ' + vid + '/' + n);
    const can = background.copy();
    for (const r of e.runs) {
      if (f < r.at || f > get(r, 'until', e.end)) continue;
      let alpha = 1, dx = 0;
      if (vid === 'NhbCBo1KuU8' && n === 67 && f < 2209) {
        if (f < 2207) {
          particles(can, r, f);
          if (f >= 2200 && f <= 2202) continue;
        }
        const off = 4 * (1 - cl((f - 2201) / 8));
        modernWrite(can, r, { rgb: [237, 50, 62], dx: -off, shadow: false });
        modernWrite(can, r, { rgb: [51, 193, 231], dx: off, shadow: false });
        if (f < 2204) { alpha = 0.3 + 0.7 * ((f + 1) % 3) / 2; dx = Math.sin(f * 4) * off; }
      }
      modernWrite(can, r, { alpha, dx, shadow: true });
    }
    return can;
  }
  // Template 40's dissolve: np.random.default_rng(f) scatter of the glyph's pixels.
  function particles(can, r, f) {
    const mm = r._customMask, d = mm.data(), W = mm.width;
    const xs = [], ys = [];
    for (let i = 0; i < d.length; i++) if (d[i] > 80) { ys.push(Math.floor(i / W)); xs.push(i % W); }
    const rng = numpyDefaultRng(f);
    const strength = Math.max(0.1, 1 - Math.abs(f - 2201) / 7);
    const take = rng.choiceNoReplace(xs.length, Math.min(2400, xs.length));
    const cd = can.data(), CW = can.width, CH = can.height, ls = can.linesize;
    for (const t of take) {
      const px = xs[t], py = ys[t];
      const jx = Math.trunc(rng.normal(0, 14 * strength)), jy = Math.trunc(rng.normal(0, 5 * strength));
      const qx = Math.trunc(r.x / 2 + px + jx), qy = Math.trunc(r.y / 2 + py + jy);
      // ImageDraw.rectangle((qx, qy, qx + 1, qy + 1), fill=(245, 245, 245))
      for (let yy = qy; yy <= qy + 1; yy++) for (let xx = qx; xx <= qx + 1; xx++) {
        if (xx < 0 || yy < 0 || xx >= CW || yy >= CH) continue;
        const o = yy * ls + xx * 4; cd[o] = 245; cd[o + 1] = 245; cd[o + 2] = 245; cd[o + 3] = 255;
      }
    }
  }

  // native/0YVdjmU13E4/renderer.py paint() and render() as template-service runs them.
  function paint(canvas, mask, rgb, blur = 0, offset = [0, 0], shadow = true) {
    if (Array.isArray(blur)) mask = scipyGaussianU8(mask, blur);
    else if (blur) mask = mask.gaussianBlur(blur);
    if (offset[0] !== 0 || offset[1] !== 0) { const m = pil.newImage('L', [mask.width, mask.height]); m.paste(mask, offset); mask = m; }
    if (shadow) {
      let sh = pil.newImage('L', [mask.width, mask.height]);
      sh.paste(mask, [1, 2]);
      sh = sh.gaussianBlur(0.6).point(lutInt(0.84));
      canvas.paste([0, 0, 0], [0, 0], sh);
    }
    canvas.paste(rgb, [0, 0], mask);
  }
  const LEGACY_EVENTS = [4, 31, 36, 48, 51, 61];
  function legacyRender(plans, idx, f, background) {
    if (!LEGACY_EVENTS.includes(idx)) throw notPorted('event 0YVdjmU13E4/' + idx);
    const e = plans[idx - 1];
    const can = background.copy();
    for (const r of e.runs) {
      if (f < r.at) continue;
      let mask = r._mask, blur = 0, offset = [0, 0];
      if (!mask) throw notPorted('this caption slot');
      if (get(r, 'legacy', false)) {
        if ((r.text === '2' && f >= 1738) || (r.text === '3' && f < 1738)) continue;
        if (r.glyphs.some(g => f < get(g, 'at', r.at))) throw notPorted('legacy glyph reveal');
        if (['2', '3'].includes(r.text) && !get(r, '_staticNumber', false)) {
          offset = [0, get({ 1735: 2, 1736: 6, 1737: 18, 1738: 18, 1739: 6, 1740: 2 }, f, 0)];
          const b = get({ 1735: 0.3, 1736: 2, 1737: 6, 1738: 4.5, 1739: 1.5, 1740: 0.5 }, f, 0);
          blur = b ? [b, 0.225] : 0;
        }
      }
      if (idx === 36 && r.text === 'WHERE') blur = Math.max(0, 5 * (1212 - f) / 4);
      paint(can, mask, get(r, 'rgb', [253, 253, 253]), blur, offset);
    }
    return can;
  }

  // ------------------------------------------------------------ engine.py
  const cleanText = t => String(t).replace(/(?<!\p{Nd})[.,]|[.,](?!\p{Nd})/gu, '').replace(/"/g, '').trim();
  const REF_NAME = 'Ordinary caption · 52px type / 62px baseline spacing';

  function compile(inputData, editorial) {
    const svc = loadService();
    const W = inputData.words, fps = inputData.fps, duration = inputData.frames;
    let plans = [];
    const covered = [];
    const exact = (a, z, id, phrasesIn, starts) => {
      const item = ITEMS.find(i => i.id === id);
      if (!item) throw pyError('StopIteration', '');
      const source = sourceEvent(svc, item);
      const e = deepcopy(source);
      assert(e.runs.length === phrasesIn.length);
      const phrases = source.runs.slice(0, phrasesIn.length).map((r, i) => (isUpper(r.text) ? upper(phrasesIn[i]) : phrasesIn[i]));
      const start = W[a].start, end = z < W.length - 1 ? W[z + 1].start : duration;
      const n = Math.min(e.runs.length, source.runs.length, phrases.length, starts.length);
      for (let k = 0; k < n; k++) {
        const r = e.runs[k], old = source.runs[k], wi = starts[k];
        if (ROWS[id]) {
          // Image.new('L', (1, 1)) pasted on an empty frame: an empty mask.
          if (item.video === '0YVdjmU13E4') {
            r._mask = pil.newImage('L', [540, 960]);
            if (get(r, 'legacy', false)) r.glyphs = [];
          } else r._customMask = pil.newImage('L', [1, 1]);
        } else throw notPorted('template ' + id);
        r.at = e.start + pyRound((W[wi].start - start) * item.fps / fps);
        for (const key of ['x', 'y', 'w', 'h', 'width', 'height', 'font', 'index', 'rgb']) assert(JSON.stringify(get(r, key, null)) === JSON.stringify(get(old, key, null)), pyRepr(tuple(id, key)));
      }
      applyLayout(item, source, e, phrases);
      e.end = e.start + pyRound((end - start) * item.fps / fps);
      for (const r of e.runs) r.until = e.end;
      plans = plans.filter(p => p.end <= start || p.start >= end);
      plans.push({ start, end, event: item.event, source: e, texts: phrases, groups: [[a, z]], video: item.video, id, name: item.name, sourceFps: item.fps });
    };

    for (const sc of editorial) {
      const [a, z] = sc.words;
      assert(0 <= a && a <= z && z < W.length);
      for (let i = a; i <= z; i++) covered.push(i);
      if (get(sc, 'template', null)) {
        assert(POLICY.templates.includes(sc.template), 'Template ' + sc.template + ' needs a verified film adapter; do not silently substitute another template');
        const slots = sc.slots;
        let texts = slots.map(([x, y]) => W.slice(x, y + 1).map(w => cleanText(w.text)).join(' '));
        if (Object.prototype.hasOwnProperty.call(sc, 'texts')) texts = sc.texts;
        exact(a, z, sc.template, texts, slots.map(([x]) => x));
        let spoken = W.slice(a, z + 1).map(w => cleanText(w.text)).join(' ').toLowerCase();
        const ordered = slots.map((slot, i) => [slot, i, texts[i]]).filter((_, i) => !(sc.template === '05' && i === 4)).map(([slot, i, t]) => [slot[0], i, t]);
        ordered.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
        const assigned = ordered.map(v => v[2]).join(' ').toLowerCase();
        if (sc.template === '05') {
          const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
          const parts = splitWs(spoken);
          if (!parts.length) throw pyError('ValueError', 'not enough values to unpack (expected at least 1, got 0)');
          const [first, ...rest] = parts;
          if (numbers.includes(first)) spoken = [String(numbers.indexOf(first)), ...rest].join(' ');
        }
        assert(assigned === spoken, pyRepr(tuple(sc, spoken, assigned)));
      } else {
        plans.push({ start: W[a].start, end: z + 1 < W.length ? W[z + 1].start : duration, groups: [[a, z]], id: 'REF-E48', video: '0YVdjmU13E4' });
      }
    }
    assert(covered.length === W.length && covered.every((v, i) => v === i), 'Missing/repeated/out-of-order speech');
    plans.sort((p, q) => p.start - q.start);
    for (let i = 0; i + 1 < plans.length; i++) assert(plans[i].end === plans[i + 1].start);

    // Ordinary speech: one explicit reference style.
    for (const p of plans) {
      if (!p.id.startsWith('REF')) continue;
      const a = p.groups[0][0], z = p.groups[p.groups.length - 1][1];
      const words = W.slice(a, z + 1).map(w => cleanText(w.text));
      const ft = truetype('/System/Library/Fonts/HelveticaNeue.ttc', 52, 1);
      const whole = words.join(' ');
      let tt;
      if (ft.getlength(whole) <= 700) tt = [whole];
      else {
        const opts = [];
        for (let j = 1; j < words.length; j++) opts.push([words.slice(0, j).join(' '), words.slice(j).join(' ')]);
        if (!opts.length) throw pyError('ValueError', 'min() arg is an empty sequence');
        let best = opts[0], bestKey = pyMax(...best.map(t => ft.getlength(t)));
        for (const o of opts.slice(1)) { const k = pyMax(...o.map(t => ft.getlength(t))); if (k < bestKey) { best = o; bestKey = k; } }
        tt = best;
      }
      assert(pyMax(...tt.map(t => ft.getlength(t))) <= 730, pyRepr(tt));
      const orig = deepcopy(svc.base_legacy_plans[47]);
      const e = deepcopy(orig);
      e.runs = [];
      tt.forEach((t, j) => pil.scope(() => {
        const baseline = tt.length === 2 ? 1426 + j * 62 : 1460;
        const full = pil.newImage('L', [1080, 1920]);
        pil.drawText(full, [540, baseline], t, { font: ft, fill: 255, anchor: 'ms' });
        const box = full.getbbox();
        if (!box) throw pyError('TypeError', "'NoneType' object is not subscriptable");
        const r = deepcopy(orig.runs[Math.min(j, 1)]);
        Object.assign(r, { text: t, x: box[0], y: box[1], w: box[2] - box[0], h: box[3] - box[1], rgb: [255, 255, 255], at: e.start, _mask: pil.keep(full.resize([540, 960], pil.LANCZOS)) });
        e.runs.push(r);
      }));
      Object.assign(p, { source: e, event: 48, texts: tt, id: 'REF-E48', name: REF_NAME });
    }
    // Speaker colour: applied yellow becomes white.
    for (const p of plans) for (const r of p.source.runs) {
      const c = get(r, 'rgb', [255, 255, 255]);
      if (c[0] > 160 && c[1] > 100 && c[2] < 150) r.rgb = [255, 255, 255];
    }
    // Film placement: a whole-block translation.
    const placement = [];
    for (const p of plans) {
      if (p.id.startsWith('REF')) continue;
      const rr = p.source.runs;
      const left = pyMin(...rr.map(r => r.x)), right = pyMax(...rr.map(r => r.x + get(r, 'w', get(r, 'width'))));
      const top = pyMin(...rr.map(r => r.y)), bottom = pyMax(...rr.map(r => r.y + get(r, 'h', get(r, 'height'))));
      const dx = pyRound((540 - (left + right) / 2) / 2) * 2, dy = pyRound((1400 - (top + bottom) / 2) / 2) * 2;
      const old = rr.map(r => [r.x, r.y]);
      for (const r of rr) {
        r.x += dx; r.y += dy;
        if (r._mask) { const moved = pil.newImage('L', [540, 960]); moved.paste(r._mask, [floorDiv(dx, 2), floorDiv(dy, 2)]); r._mask = moved; }
      }
      assert(rr.every((r, i) => r.x - old[i][0] === dx && r.y - old[i][1] === dy));
      placement.push({ id: p.id, start: p.start / fps, offset: [dx, dy], center: [(left + right) / 2 + dx, (top + bottom) / 2 + dy] });
      p.placement = [dx, dy];
    }
    const records = [];
    for (const p of plans) {
      const slots = [];
      const n = Math.min(p.source.runs.length, p.texts.length);
      for (let k = 0; k < n; k++) {
        const r = p.source.runs[k], t = p.texts[k];
        const ft = truetype(r.font, 140, get(r, 'index', 0)), stroke = strokeOf(r, 0.7);
        const extent = s => { const b = ft.getbbox(s, { stroke_width: stroke }); return [b[2] - b[0], b[3] - b[1]]; };
        const [ow, oh] = extent(r.text), [nw, nh] = extent(t), [w, h] = wh(r);
        const fit = pyMin(1, ow / pyMax(1, nw), oh / pyMax(1, nh)), em = 140 * h / pyMax(1, nh);
        const ref = p.id.startsWith('REF');
        slots.push({ text: t, sourceText: r.text, font: basename(r.font), fontIndex: get(r, 'index', 0), fontPxY: ref ? 52 : pyRoundN(em, 1), fit: ref ? 1 : pyRoundN(fit, 3), x: r.x, y: r.y, w, h, color: get(r, 'rgb', [253, 253, 253]), atSeconds: pyRoundN(p.start / fps + (r.at - p.source.start) / get(p, 'sourceFps', 24), 3) });
      }
      records.push({ id: p.id, name: p.name, start: p.start / fps, end: p.end / fps, source: p.video, event: p.event, placement: get(p, 'placement', [0, 0]), slots });
    }
    validate(plans);
    return { plans, records, placement, svc, fps };
  }

  // geometry.py
  function validate(plans) {
    for (const scene of plans) {
      const masks = [];
      scene.source.runs.forEach((run, index) => {
        const [w, h] = wh(run);
        if (!(0 <= run.x && 0 <= run.y && run.x + w <= 1080 && run.y + h <= 1920)) throw pyError('ValueError', scene.id + ': text exceeds the canvas; shorten or change the template');
        if (scene.id === '05' && index === 4) return;
        let mask = run._mask;
        if (!mask) { mask = pil.newImage('L', [540, 960]); mask.paste(run._customMask, [pyRound(run.x / 2), pyRound(run.y / 2)]); }
        const d = mask.data(), on = new Uint8Array(d.length);
        for (let i = 0; i < d.length; i++) on[i] = d[i] > 127 ? 1 : 0;
        masks.push([index, on]);
      });
      for (let a = 0; a < masks.length; a++) for (let b = a + 1; b < masks.length; b++) {
        const [i, first] = masks[a], [j, second] = masks[b];
        let count = 0;
        for (let k = 0; k < first.length; k++) if (first[k] & second[k]) count++;
        if (count > 2) throw pyError('ValueError', scene.id + ': glyphs overlap in slots ' + i + ', ' + j);
      }
    }
  }

  // engine.render(p, f, im, debug=False)
  function render(state, p, f, background) {
    const rf = p.source.start + pyRound((f - p.start) * get(p, 'sourceFps', 24) / state.fps);
    if (p.video === '0YVdjmU13E4') {
      const plans = state.svc.base_legacy_plans.slice();
      plans[p.event - 1] = p.source;
      return legacyRender(plans, p.event, rf, background);
    }
    return modernRender(p.video, p.source, rf, background);
  }

  // ---------------------------------------------------- compile-captions.py
  // transparent(): numpy float32 arithmetic, step by step.
  function transparent(state, plan, frame) {
    return pil.scope(() => {
      const black = render(state, plan, frame, pil.newImage('RGB', [540, 960], [0, 0, 0]));
      const white = render(state, plan, frame, pil.newImage('RGB', [540, 960], [255, 255, 255]));
      const b = black.data(), w = white.data();
      const out = new Uint8Array(540 * 960 * 4);
      const f32 = Math.fround, inv = f32(1 / 255);
      for (let i = 0; i < 540 * 960; i++) {
        const o = i * 4;
        const s = f32(f32(f32(-0.0 + (w[o] - b[o])) + (w[o + 1] - b[o + 1])) + (w[o + 2] - b[o + 2]));
        const mean = f32(s / 3);
        let alpha = f32(1 - f32(mean / 255));
        alpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
        const den = alpha > inv ? alpha : inv;
        for (let c = 0; c < 3; c++) {
          let v = f32(b[o + c] / den);
          v = v < 0 ? 0 : v > 255 ? 255 : v;
          out[o + c] = roundHalfEven(v);
        }
        out[o + 3] = roundHalfEven(f32(alpha * 255));
      }
      return out;
    });
  }
  const roundHalfEven = v => { const f = Math.floor(v), d = v - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); };

  function bboxRGBA(buf, w, h, channel) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        const o = row + x * 4;
        const on = channel == null ? (buf[o] | buf[o + 1] | buf[o + 2] | buf[o + 3]) : buf[o + channel];
        if (on) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y; }
      }
    }
    return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
  }
  function hashBytes(buf) {
    let h1 = 0x811c9dc5, h2 = 0x01000193 ^ buf.length;
    for (let i = 0; i < buf.length; i++) { h1 = Math.imul(h1 ^ buf[i], 16777619); h2 = Math.imul(h2 + buf[i], 2246822519) ^ (h2 >>> 13); }
    return (h1 >>> 0).toString(16) + ':' + (h2 >>> 0).toString(16);
  }
  // A unique frame keeps only its non-zero region (alpha-zero pixels may still carry RGB).
  function packFrame(buf) {
    const box = bboxRGBA(buf, 540, 960, null);
    if (!box) return { box: null, bytes: new Uint8Array(0) };
    const [x0, y0, x1, y1] = box, w = x1 - x0, out = new Uint8Array(w * (y1 - y0) * 4);
    for (let y = y0; y < y1; y++) out.set(buf.subarray((y * 540 + x0) * 4, (y * 540 + x1) * 4), (y - y0) * w * 4);
    return { box, bytes: out };
  }
  function cropPacked(frame, bounds) {
    const [bx, by, br, bb] = bounds, w = br - bx, h = bb - by, out = new Uint8Array(w * h * 4);
    if (!frame.box) return out;
    const [x0, y0, x1, y1] = frame.box, fw = x1 - x0;
    for (let y = Math.max(by, y0); y < Math.min(bb, y1); y++) {
      const sx0 = Math.max(bx, x0), sx1 = Math.min(br, x1);
      if (sx1 <= sx0) continue;
      out.set(frame.bytes.subarray(((y - y0) * fw + (sx0 - x0)) * 4, ((y - y0) * fw + (sx1 - x0)) * 4), ((y - by) * w + (sx0 - bx)) * 4);
    }
    return out;
  }

  async function sceneAsset(state, plan, fps, index, onFrame) {
    const unique = [], lookup = new Map(), frames = [];
    let bounds = null;
    for (let f = plan.start; f < plan.end; f++) {
      const im = transparent(state, plan, f);
      const key = hashBytes(im);
      let hit = -1;
      for (const k of lookup.get(key) || []) if (sameFrame(unique[k], im)) { hit = k; break; }
      if (hit < 0) {
        hit = unique.length;
        lookup.set(key, [...(lookup.get(key) || []), hit]);
        const packed = packFrame(im);
        unique.push(packed);
        const box = bboxRGBA(im, 540, 960, 3);
        if (box) bounds = bounds == null ? box : [Math.min(bounds[0], box[0]), Math.min(bounds[1], box[1]), Math.max(bounds[2], box[2]), Math.max(bounds[3], box[3])];
      }
      frames.push(hit);
      if (onFrame) await onFrame(f - plan.start + 1, plan.end - plan.start);
    }
    if (bounds == null) throw pyError('ValueError', 'Empty caption scene');
    const [x, y, right, bottom] = bounds, w = right - x, h = bottom - y;
    const cols = Math.max(1, Math.min(unique.length, Math.floor(4096 / w))), rows = Math.ceil(unique.length / cols);
    if (rows * h > 16384) throw pyError('ValueError', 'Scene is too long for an editable atlas; split this phrase');
    const atlasW = cols * w, atlasH = rows * h, atlas = new Uint8Array(atlasW * atlasH * 4);
    const crops = unique.map(u => cropPacked(u, bounds));
    crops.forEach((c, i) => {
      const ox = (i % cols) * w, oy = Math.floor(i / cols) * h;
      for (let yy = 0; yy < h; yy++) atlas.set(c.subarray(yy * w * 4, (yy + 1) * w * 4), ((oy + yy) * atlasW + ox) * 4);
    });
    const png = await encodePng(atlas, atlasW, atlasH);
    const last = unique[unique.length - 1];
    const preview = await encodePng(cropPacked(last, [0, 0, 540, 960]), 540, 960);
    const payload = { atlas: 'data:image/png;base64,' + toBase64(png), frameMap: frames, fps, x, y, w, h, cols, rows, size: 100 };
    return {
      payload, preview,
      scene: { index, start: plan.start, end: plan.end, template: plan.id, text: plan.texts.join(' '), uniqueFrames: unique.length, bytes: png.length },
      // For parity checks: each unique frame cropped to the scene bounds.
      uniqueCrops: crops,
    };
  }
  function sameFrame(packed, full) {
    const again = packFrame(full);
    if (String(packed.box) !== String(again.box) || packed.bytes.length !== again.bytes.length) return false;
    for (let i = 0; i < packed.bytes.length; i++) if (packed.bytes[i] !== again.bytes[i]) return false;
    return true;
  }

  // compile_job(job, only): the manifest plus one payload per scene.
  async function compileJob(job, { only = null, onProgress = null, keepFrames = false } = {}) {
    const data = job.input, editorial = job.editorial;
    return pil.scopeAsync(async () => {
      const state = compile(data, editorial);
      const scenes = [];
      for (let i = 0; i < state.plans.length; i++) {
        if (only != null && i !== only) continue;
        const asset = await sceneAsset(state, state.plans[i], data.fps, i, onProgress ? (k, n) => onProgress({ scene: i, frame: k, frames: n, total: state.plans.length }) : null);
        if (!keepFrames) delete asset.uniqueCrops;
        scenes.push(asset);
        if (onProgress) await onProgress({ progress: i + 1, total: state.plans.length });
      }
      return { scenes, records: state.records, placement: state.placement, words: data.words.length, frames: data.frames, fps: data.fps };
    });
  }

  // check_job(job): what compile_job does before it draws a frame (every plan's
  // layout, the film placement and geometry.validate), and nothing after it. It
  // throws exactly when compile_job throws at that stage, with the same error;
  // errors that only drawing finds ('Empty caption scene', an atlas taller than
  // 16384 px) still come from compile_job alone.
  function checkJob(job) {
    return pil.scope(() => {
      const state = compile(job.input, job.editorial);
      return { ok: true, scenes: state.plans.length, records: state.records, placement: state.placement };
    });
  }

  // ------------------------------------------------------------------- PNG
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(parts) { let c = 0xffffffff; for (const p of parts) for (let i = 0; i < p.length; i++) c = CRC[(c ^ p[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  async function deflate(bytes) {
    const cs = new CompressionStream('deflate');
    const out = new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer();
    return new Uint8Array(await out);
  }
  async function encodePng(rgba, w, h) {
    // Per-row filter: the smallest sum of absolute values among None/Sub/Up/Paeth.
    const stride = w * 4, raw = new Uint8Array((stride + 1) * h), cand = [new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride)];
    for (let y = 0; y < h; y++) {
      const row = rgba.subarray(y * stride, (y + 1) * stride), prev = y ? rgba.subarray((y - 1) * stride, y * stride) : null;
      let best = 0, bestScore = Infinity;
      const types = [0, 1, 2, 4];
      types.forEach((t, ti) => {
        const c = cand[ti];
        let score = 0;
        for (let i = 0; i < stride; i++) {
          const a = i >= 4 ? row[i - 4] : 0, b = prev ? prev[i] : 0, cc = prev && i >= 4 ? prev[i - 4] : 0;
          let p;
          if (t === 0) p = row[i];
          else if (t === 1) p = row[i] - a;
          else if (t === 2) p = row[i] - b;
          else { const pa = Math.abs(b - cc), pb = Math.abs(a - cc), pc = Math.abs(a + b - 2 * cc); p = row[i] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : cc); }
          p &= 255; c[i] = p; score += p < 128 ? p : 256 - p;
        }
        if (score < bestScore) { bestScore = score; best = ti; }
      });
      raw[y * (stride + 1)] = types[best];
      raw.set(cand[best], y * (stride + 1) + 1);
    }
    const idat = await deflate(raw);
    const chunks = [];
    const chunk = (type, data) => {
      const len = new Uint8Array(4); new DataView(len.buffer).setUint32(0, data.length);
      const t = new TextEncoder().encode(type), crc = new Uint8Array(4);
      new DataView(crc.buffer).setUint32(0, crc32([t, data]));
      chunks.push(len, t, data, crc);
    };
    const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
    dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    chunks.push(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
    chunk('IHDR', ihdr); chunk('IDAT', idat); chunk('IEND', new Uint8Array(0));
    const total = chunks.reduce((s, c) => s + c.length, 0), png = new Uint8Array(total);
    let o = 0; for (const c of chunks) { png.set(c, o); o += c.length; }
    return png;
  }
  function toBase64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  // --------------------------------------- numpy Generator (PCG64), template 40
  // np.random.default_rng(seed): SeedSequence -> PCG64, with Generator.choice
  // (replace=False) and Generator.normal as numpy 2.x implements them.
  function numpyDefaultRng(seed) {
    const M32 = 0xffffffff;
    const INIT_A = 0x43b0d7e5, MULT_A = 0x931e8875, INIT_B = 0x8b51f9dd, MULT_B = 0x58f38ded, MIX_L = 0xca01f9dd, MIX_R = 0x4973f715;
    const mul32 = (a, b) => Math.imul(a, b) >>> 0;
    // SeedSequence(seed).generate_state(4, uint64)
    const entropy = [];
    let n = BigInt(seed);
    if (n === 0n) entropy.push(0);
    while (n > 0n) { entropy.push(Number(n & 0xffffffffn)); n >>= 32n; }
    let hashConst = INIT_A;
    const hashmix = v => { v = (v ^ hashConst) >>> 0; hashConst = mul32(hashConst, MULT_A); v = mul32(v, hashConst); return (v ^ (v >>> 16)) >>> 0; };
    const mix = (x, y) => { let r = (mul32(MIX_L, x) - mul32(MIX_R, y)) >>> 0; return (r ^ (r >>> 16)) >>> 0; };
    const pool = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) pool[i] = hashmix(i < entropy.length ? entropy[i] : 0);
    for (let s = 0; s < 4; s++) for (let d = 0; d < 4; d++) if (s !== d) pool[d] = mix(pool[d], hashmix(pool[s]));
    for (let s = 4; s < entropy.length; s++) for (let d = 0; d < 4; d++) pool[d] = mix(pool[d], hashmix(entropy[s]));
    let hb = INIT_B;
    const words = [];
    for (let i = 0; i < 8; i++) { let v = (pool[i % 4] ^ hb) >>> 0; hb = mul32(hb, MULT_B); v = mul32(v, hb); words.push((v ^ (v >>> 16)) >>> 0); }
    const u64 = k => (BigInt(words[2 * k + 1]) << 32n) | BigInt(words[2 * k]);
    const MASK128 = (1n << 128n) - 1n, MULT = 0x2360ED051FC65DA44385DF649FCCF645n;
    const initstate = (u64(0) << 64n) | u64(1), initseq = (u64(2) << 64n) | u64(3);
    const inc = ((initseq << 1n) | 1n) & MASK128;
    let state = 0n;
    state = (state * MULT + inc) & MASK128;
    state = (state + initstate) & MASK128;
    state = (state * MULT + inc) & MASK128;
    let hasU32 = false, u32 = 0;
    const next64 = () => {
      state = (state * MULT + inc) & MASK128;
      const v = ((state >> 64n) ^ state) & 0xffffffffffffffffn, rot = Number(state >> 122n);
      return ((v >> BigInt(rot)) | (v << BigInt((64 - rot) & 63))) & 0xffffffffffffffffn;
    };
    const next32 = () => {
      if (hasU32) { hasU32 = false; return u32; }
      const v = next64(); hasU32 = true; u32 = Number(v >> 32n); return Number(v & 0xffffffffn);
    };
    const nextDouble = () => Number(next64() >> 11n) * (1.0 / 9007199254740992.0);
    // random_bounded_uint64(0, rng) for rng < 2^32: Lemire's method on next_uint32.
    const bounded = rng => {
      if (rng === 0) return 0;
      if (rng > M32) throw notPorted('large bounded draws');
      if (rng === M32) return next32();
      const excl = BigInt(rng + 1);
      let m = BigInt(next32()) * excl, left = Number(m & 0xffffffffn);
      if (left < rng + 1) {
        const threshold = (M32 - rng) % (rng + 1);
        while (left < threshold) { m = BigInt(next32()) * excl; left = Number(m & 0xffffffffn); }
      }
      return Number(m >> 32n);
    };
    const shuffleInt = (data, n, first) => { for (let i = n - 1; i >= first; i--) { const j = bounded(i); const t = data[j]; data[j] = data[i]; data[i] = t; } };
    function choiceNoReplace(pop, size) {
      if (size > pop) throw pyError('ValueError', "Cannot take a larger sample than population when 'replace=False'");
      if (size === 0) return [];
      if (pop > 10000 && size > Math.floor(pop / 50)) {
        const idx = Array.from({ length: pop }, (_, i) => i);
        shuffleInt(idx, pop, Math.max(pop - size, 1));
        return idx.slice(pop - size);
      }
      const idx = new Array(size);
      let mask = Math.trunc(1.2 * size);
      for (const s of [1, 2, 4, 8, 16]) mask |= mask >>> s;
      mask >>>= 0;
      const set = new Float64Array(mask + 1).fill(-1);
      for (let j = pop - size; j < pop; j++) {
        const val = bounded(j);
        let loc = val & mask;
        while (set[loc] !== -1 && set[loc] !== val) loc = (loc + 1) & mask;
        if (set[loc] === -1) { set[loc] = val; idx[j - pop + size] = val; }
        else {
          loc = j & mask;
          while (set[loc] !== -1) loc = (loc + 1) & mask;
          set[loc] = j; idx[j - pop + size] = j;
        }
      }
      shuffleInt(idx, size, 1);
      return idx;
    }
    const NOR_R = 3.6541528853610087963519472518, NOR_INV_R = 0.27366123732975827203338247596;
    function standardNormal() {
      for (;;) {
        let r = next64();
        const idx = Number(r & 0xffn);
        r >>= 8n;
        const sign = Number(r & 1n);
        const rabsBig = (r >> 1n) & 0x000fffffffffffffn, rabs = Number(rabsBig);
        let x = rabs * ZIGGURAT.wi[idx];
        if (sign & 1) x = -x;
        if (rabs < ZIGGURAT.ki[idx]) return x;
        if (idx === 0) {
          for (;;) {
            const xx = -NOR_INV_R * Math.log1p(-nextDouble());
            const yy = -Math.log1p(-nextDouble());
            if (yy + yy > xx * xx) return Number((rabsBig >> 8n) & 1n) ? -(NOR_R + xx) : NOR_R + xx;
          }
        } else if ((ZIGGURAT.fi[idx - 1] - ZIGGURAT.fi[idx]) * nextDouble() + ZIGGURAT.fi[idx] < Math.exp(-0.5 * x * x)) return x;
      }
    }
    return { choiceNoReplace, normal: (loc, scale) => loc + scale * standardNormal(), _next64: next64 };
  }

  return { catalogue, compileJob, checkJob, compile: (d, e) => pil.scope(() => { const s = compile(d, e); return { records: s.records, placement: s.placement }; }), _internal: { pyRound, pyRoundN, scipyGaussianU8, gaussKernel, transparent, numpyDefaultRng } };
}

// numpy random/src/distributions/ziggurat_constants.h (ki fits in a double: < 2^52).
const ZIGGURAT = {
  wi: [
    8.683627060801306e-16, 4.779330175727737e-17, 6.354352417405262e-17, 7.454870481247696e-17, 8.3293668157931e-17, 9.068060405059482e-17,
    9.714860076567762e-17, 1.0294750314241019e-16, 1.0823430288447684e-16, 1.131147019610903e-16, 1.176635945702292e-16, 1.2193617278714363e-16,
    1.2597439914637093e-16, 1.2981099886264032e-16, 1.3347203736824123e-16, 1.3697864842571203e-16, 1.4034823001242382e-16, 1.4359529452056943e-16,
    1.4673208742364422e-16, 1.4976904668391037e-16, 1.5271515003596198e-16, 1.5557818169460764e-16, 1.5836494009290885e-16, 1.6108140175274928e-16,
    1.6373285203969853e-16, 1.6632399058420835e-16, 1.6885901708676596e-16, 1.713417017655966e-16, 1.737754436586486e-16, 1.7616331923000996e-16,
    1.7850812316976727e-16, 1.8081240285799152e-16, 1.830784876482675e-16, 1.853085138861802e-16, 1.8750444639373882e-16, 1.896680970077476e-16,
    1.918011406483862e-16, 1.9390512930625104e-16, 1.9598150426628824e-16, 1.9803160683128174e-16, 2.000566877627333e-16, 2.0205791562071654e-16,
    2.0403638415480212e-16, 2.0599311887403706e-16, 2.079290829041402e-16, 2.0984518222370352e-16, 2.1174227035760342e-16, 2.1362115259449868e-16,
    2.1548258978581458e-16, 2.1732730177564367e-16, 2.191559705042727e-16, 2.2096924282235318e-16, 2.2276773304789553e-16, 2.2455202529414355e-16,
    2.263226755928568e-16, 2.280802138345017e-16, 2.2982514554424684e-16, 2.3155795351040804e-16, 2.3327909928004356e-16, 2.3498902453470955e-16,
    2.3668815235791604e-16, 2.3837688840454243e-16, 2.4005562198135063e-16, 2.4172472704675025e-16, 2.433845631371103e-16, 2.4503547622614954e-16,
    2.466777995232705e-16, 2.4831185421610877e-16, 2.4993795016204524e-16, 2.515563865329658e-16, 2.5316745241713583e-16, 2.547714273816944e-16,
    2.563685819989397e-16, 2.579591783392867e-16, 2.5954347043351707e-16, 2.6112170470670194e-16, 2.6269412038597256e-16, 2.6426094988411895e-16,
    2.658224191608307e-16, 2.6737874806323633e-16, 2.689301506472616e-16, 2.704768354811995e-16, 2.720190059327732e-16, 2.735568604408679e-16,
    2.7509059277301666e-16, 2.7662039226963903e-16, 2.781464440759544e-16, 2.79668929362423e-16, 2.8118802553450207e-16, 2.827039064324479e-16,
    2.842167425218406e-16, 2.8572670107546015e-16, 2.87233946347098e-16, 2.887386397378482e-16, 2.9024093995538423e-16, 2.9174100316669455e-16,
    2.9323898314471816e-16, 2.947350314092935e-16, 2.9622929736280665e-16, 2.977219284209029e-16, 2.992130701386013e-16, 3.007028663321331e-16,
    3.0219145919680615e-16, 3.036789894211802e-16, 3.051655962978219e-16, 3.0665141783089545e-16, 3.081365908408297e-16, 3.0962125106629225e-16,
    3.111055332636893e-16, 3.125895713043999e-16, 3.140734982699446e-16, 3.1555744654528006e-16, 3.1704154791040285e-16, 3.1852593363044065e-16,
    3.2001073454440114e-16, 3.214960811527447e-16, 3.2298210370394156e-16, 3.244689322801698e-16, 3.2595669688230784e-16, 3.2744552751437067e-16,
    3.2893555426753697e-16, 3.3042690740391284e-16, 3.3191971744017523e-16, 3.3341411523123725e-16, 3.3491023205407785e-16, 3.364081996918765e-16,
    3.37908150518595e-16, 3.394102175841489e-16, 3.409145347003126e-16, 3.424212365275018e-16, 3.4393045866258313e-16, 3.454423377278584e-16,
    3.4695701146137835e-16, 3.4847461880874137e-16, 3.499953000165381e-16, 3.5151919672760744e-16, 3.53046452078274e-16, 3.5457721079774357e-16,
    3.5611161930983884e-16, 3.5764982583726505e-16, 3.59191980508603e-16, 3.6073823546823514e-16, 3.6228874498941915e-16, 3.6384366559073444e-16,
    3.65403156156137e-16, 3.669673780588701e-16, 3.685364952894914e-16, 3.7011067458828983e-16, 3.716900855823823e-16, 3.7327490092779435e-16,
    3.7486529645684887e-16, 3.7646145133120287e-16, 3.7806354820089604e-16, 3.7967177336979443e-16, 3.8128631696783774e-16, 3.829073731305243e-16,
    3.8453514018609596e-16, 3.8616982085091493e-16, 3.878116224335587e-16, 3.894607570481926e-16, 3.9111744183782054e-16, 3.9278189920805415e-16,
    3.944543570720877e-16, 3.9613504910761354e-16, 3.9782421502646826e-16, 3.995221008578565e-16, 4.012289592460629e-16, 4.029450497636328e-16,
    4.04670639241075e-16, 4.0640600211422504e-16, 4.0815142079049387e-16, 4.0990718603532664e-16, 4.1167359738030257e-16, 4.134509635544236e-16,
    4.1523960294026883e-16, 4.170398440568316e-16, 4.1885202607101123e-16, 4.206764993399015e-16, 4.2251362598620494e-16, 4.243637805093078e-16,
    4.262273504347798e-16, 4.2810473700531167e-16, 4.2999635591638323e-16, 4.3190263810026294e-16, 4.338240305622791e-16, 4.357609972736849e-16,
    4.3771402012585875e-16, 4.3968359995105214e-16, 4.4167025761542035e-16, 4.4367453519065673e-16, 4.456969972112043e-16, 4.477382320247534e-16,
    4.49798853244555e-16, 4.518795013130059e-16, 4.539808451870034e-16, 4.561035841567422e-16, 4.582484498109567e-16, 4.604162081631153e-16,
    4.626076619547846e-16, 4.648236531543207e-16, 4.670650656712631e-16, 4.693328283093329e-16, 4.716279179838351e-16, 4.739513632325867e-16,
    4.763042480533137e-16, 4.786877161048723e-16, 4.811029753147417e-16, 4.835513029411525e-16, 4.860340511450812e-16, 4.885526531353603e-16,
    4.91108629959527e-16, 4.937035980240335e-16, 4.963392774403987e-16, 4.990175013091822e-16, 5.017402260718089e-16, 5.045095430818727e-16,
    5.073276915733542e-16, 5.101970732341562e-16, 5.131202686306784e-16, 5.161000557743228e-16, 5.191394311757699e-16, 5.222416338000234e-16,
    5.254101724177597e-16, 5.286488569504945e-16, 5.3196183453384e-16, 5.353536311816497e-16, 5.388292001334053e-16, 5.423939782201712e-16,
    5.46053951907478e-16, 5.498157350892814e-16, 5.536866612467876e-16, 5.576748932926576e-16, 5.617895553555417e-16, 5.660408920082422e-16,
    5.704404621291389e-16, 5.750013768919895e-16, 5.797385945724594e-16, 5.846692893455479e-16, 5.898133176477899e-16, 5.951938149641444e-16,
    6.008379696271908e-16, 6.067780409333449e-16, 6.130527208725282e-16, 6.197089894581626e-16, 6.268046963301284e-16, 6.344122407127506e-16,
    6.426239659548055e-16, 6.515603317344994e-16, 6.613827885097664e-16, 6.723150462505587e-16, 6.846803417564259e-16, 6.98971833638762e-16,
    7.159994934830664e-16, 7.372424301798799e-16, 7.658936370805573e-16, 8.113849337656484e-16,
  ],
  ki: [
    4208095142473578, 0, 3387314423973544, 3838760076542274, 4030768804392682, 4136731738896254,
    4203757248105145, 4249917568205994, 4283617341590296, 4309289223136604, 4329489775174550, 4345795907393188,
    4359232558744730, 4370494503737299, 4380069246215646, 4388308869042394, 4395473957549321, 4401761481783924,
    4407323076021240, 4412277362218204, 4416718463613199, 4420722014516422, 4424349484777079, 4427651345409294,
    4430669422005229, 4433438668975191, 4435988524278344, 4438343955930065, 4440526279077425, 4442553800234660,
    4444442329865861, 4446205593658138, 4447855565093316, 4449402736340121, 4450856340408624, 4452224534496486,
    4453514552210512, 4454732830656798, 4455885117109368, 4456976558985043, 4458011780094444, 4458994945550386,
    4459929817254120, 4460819801517196, 4461667990089170, 4462477195632268, 4463249982500384, 4463988693531856,
    4464695473445501, 4465372289331869, 4466020948651920, 4466643115089764, 4467240322552142, 4467813987562542,
    4468365420260672, 4468895834186994, 4469406355006040, 4469898028300364, 4470371826548633, 4470828655385770,
    4471269359229841, 4471694726349190, 4472105493433674, 4472502349725738, 4472885940759935, 4473256871753524,
    4473615710685532, 4473962991097124, 4474299214642296, 4474624853414418, 4474940352071305, 4475246129778808,
    4475542581990776, 4475830082081194, 4476108982842610, 4476379617863426, 4476642302795321, 4476897336520866,
    4477145002230339, 4477385568415884, 4477619289790266, 4477846408136804, 4478067153096380, 4478281742896886,
    4478490385029917, 4478693276879082, 4478890606303906, 4479082552182886, 4479269284918997, 4479450966910588,
    4479627752990372, 4479799790834988, 4479967221347354, 4480130179013872, 4480288792238368, 4480443183654460,
    4480593470417939, 4480739764480586, 4480882172846772, 4481020797814010, 4481155737198612, 4481287084547452,
    4481414929336784, 4481539357158974, 4481660449897960, 4481778285894165, 4481892940099539, 4482004484223382,
    4482112986869492, 4482218513665204, 4482321127382802, 4482420888053758, 4482517853076245, 4482612077316275,
    4482703613202871, 4482792510817576, 4482878817978627, 4482962580320076, 4483043841366126, 4483122642600925,
    4483199023534056, 4483273021761922, 4483344673025224, 4483414011262724, 4483481068661428, 4483545875703378,
    4483608461209170, 4483668852378323, 4483727074826624, 4483783152620564, 4483837108308932, 4483888962951686,
    4483938736146144, 4483986446050596, 4484032109405372, 4484075741551420, 4484117356446452, 4484156966678662,
    4484194583478081, 4484230216725550, 4484263874959345, 4484295565379450, 4484325293849474, 4484353064896186,
    4484378881706674, 4484402746123075, 4484424658634833, 4484444618368474, 4484462623074794, 4484478669113436,
    4484492751434740, 4484504863558830, 4484514997551788, 4484523143998833, 4484529291974394, 4484533429008906,
    4484535541052219, 4484535612433424, 4484533625816926, 4484529562154580, 4484523400633636, 4484515118620291,
    4484504691598554, 4484492093104164, 4484477294653230, 4484460265665252, 4484440973380154, 4484419382768918,
    4484395456437370, 4484369154522621, 4484340434581640, 4484309251471359, 4484275557219678, 4484239300886654,
    4484200428415112, 4484158882469814, 4484114602264271, 4484067523374160, 4484017577536216, 4483964692431365,
    4483908791450714, 4483849793442887, 4483787612441036, 4483722157367660, 4483653331715198, 4483581033200083,
    4483505153387764, 4483425577285833, 4483342182902157, 4483254840764470, 4483163413397547, 4483067754753536,
    4482967709590562, 4482863112794072, 4482753788634692, 4482639549955636, 4482520197281720, 4482395517841076,
    4482265284489409, 4482129254525304, 4481987168383486, 4481838748191074, 4481683696169781, 4481521692864464,
    4481352395175570, 4481175434169564, 4480990412637506, 4480796902367134, 4480594441088331, 4480382529045225,
    4480160625140311, 4479928142586662, 4479684443993061, 4479428835793398, 4479160561915451, 4478878796564388,
    4478582635972392, 4478271088936406, 4477943065929958, 4477597366530538, 4477232664848704, 4476847492576192,
    4476440219183781, 4476009028690434, 4475551892286424, 4475066535915646, 4474550401693506, 4474000601739904,
    4473413862618200, 4472786458058295, 4472114126959004, 4471391972746494, 4470614338917719, 4469774653883156,
    4468865235838896, 4467877045039530, 4466799366045354, 4465619395558397, 4464321701199635, 4462887501169282,
    4461293691124341, 4459511507635972, 4457504658253067, 4455226650325010, 4452616884242348, 4449594783440798,
    4446050695647666, 4441831266659618, 4436714892174061, 4430368316897338, 4422264825074740, 4411517007702132,
    4396496531309976, 4373832704204284, 4335125104963628, 4251099761679434,
  ],
  fi: [
    1, 0.9771017012676716, 0.9598790918001067, 0.9451989534422996, 0.9320600759592305, 0.919991505039347,
    0.9087264400521309, 0.8980959218983434, 0.8879846607558334, 0.8783096558089174, 0.869008688036857, 0.8600336211963315,
    0.851346258458678, 0.8429156531122042, 0.8347162929868834, 0.8267268339462214, 0.8189291916037024, 0.8113078743126563,
    0.8038494831709643, 0.796542330422959, 0.7893761435660246, 0.7823418326548025, 0.7754313049811872, 0.7686373157984863,
    0.7619533468367954, 0.7553735065070961, 0.7488924472191568, 0.742505296340151, 0.7362075981268627, 0.7299952645614762,
    0.7238645334686302, 0.717811932630722, 0.7118342488782484, 0.7059285013327543, 0.7000919181365116, 0.6943219161261167,
    0.6886160830046718, 0.6829721616449949, 0.6773880362187735, 0.6718617198970821, 0.6663913439087501, 0.6609751477766631,
    0.6556114705796973, 0.6502987431108167, 0.6450354808208223, 0.6398202774530566, 0.6346517992876236, 0.6295287799248367,
    0.6244500155470265, 0.6194143606058343, 0.6144207238889139, 0.6094680649257734, 0.6045553906974678, 0.5996817526191253,
    0.5948462437679874, 0.590047996332826, 0.5852861792633715, 0.5805599961007909, 0.5758686829723537, 0.5712115067352532,
    0.5665877632561644, 0.5619967758145243, 0.557437893618766, 0.5529104904258323, 0.5484139632552658, 0.5439477311900263,
    0.5395112342569521, 0.5351039323804576, 0.5307253044036621, 0.5263748471716845, 0.5220520746723218, 0.5177565172297564,
    0.513487720747327, 0.5092452459957479, 0.5050286679434681, 0.5008375751261487, 0.4966715690524897, 0.49253026364386854,
    0.48841328470545803, 0.4843202694266833, 0.48025086590904675, 0.47620473271950586, 0.4721815384677302, 0.4681809614056936,
    0.46420268904817436, 0.46024641781284287, 0.45631185267871643, 0.4523987068618485, 0.44850670150720306, 0.4446355653957394,
    0.440785034665804, 0.43695485254798555, 0.43314476911265226, 0.4293545410294414, 0.42558393133802197, 0.4218327092294959,
    0.4181006498378482, 0.4143875340408911, 0.41069314827018816, 0.40701728432947337, 0.4033597392211145, 0.3997203149801972,
    0.39609881851583245, 0.3924950614593156, 0.3889088600187887, 0.3853400348400773, 0.38178841087339366, 0.3782538172456192,
    0.37473608713789114, 0.3712350576682395, 0.3677505697790326, 0.36428246812900406, 0.36083060098964803, 0.3573948201457805,
    0.3539749808000768, 0.3505709414814061, 0.34718256395679364, 0.3438097131468507, 0.34045225704452187, 0.33711006663700605,
    0.33378301583071845, 0.3304709813791636, 0.3271738428136014, 0.3238914823763911, 0.32062378495690536, 0.3173706380299136,
    0.3141319315963372, 0.3109075581262865, 0.30769741250429206, 0.30450139197665, 0.30131939610080305, 0.2981513266966855,
    0.2949970877999618, 0.2918565856170952, 0.2887297284821829, 0.28561642681550176, 0.2825165930837076, 0.27943014176163794,
    0.2763569892956683, 0.27329705406857707, 0.27025025636587546, 0.26721651834356147, 0.2641957639972612, 0.2611879191327212,
    0.25819291133761924, 0.25521066995466196, 0.2522411260559422, 0.24928421241852852, 0.24633986350126383, 0.2434080154227503,
    0.2404886059405006, 0.2375815744312381, 0.23468686187233, 0.23180441082433872, 0.22893416541468034, 0.22607607132238028,
    0.22323007576391748, 0.220396127480152, 0.21757417672433113, 0.21476417525117358, 0.21196607630703018, 0.20917983462112508,
    0.2064054063978808, 0.2036427493103349, 0.2008918224946566, 0.19815258654577514, 0.1954250035141343, 0.19270903690358918,
    0.19000465167046499, 0.1873118142238003, 0.18463049242679927, 0.18196065559952251, 0.17930227452284758, 0.17665532144373486,
    0.17401977008183855, 0.17139559563750575, 0.1687827748012113, 0.1661812857644819, 0.16359110823236558, 0.161012223437511,
    0.15844461415592428, 0.1558882647244792, 0.15334316106026286, 0.15080929068184568, 0.14828664273257455, 0.14577520800599403,
    0.14327497897351346, 0.1407859498144447, 0.13830811644855073, 0.13584147657125376, 0.13338602969166916, 0.13094177717364436,
    0.12850872227999957, 0.1260868702201859, 0.12367622820159657, 0.1212768054847903, 0.11888861344291006, 0.11651166562561087,
    0.11414597782783849, 0.11179156816383809, 0.1094484571468118, 0.1071166677746838, 0.10479622562248707, 0.10248715894193525,
    0.10018949876881002, 0.09790327903886246, 0.095628536713009, 0.09336531191269101, 0.09111364806637376, 0.08887359206827589,
    0.08664519445055807, 0.08442850957035347, 0.0822235958132029, 0.08003051581466307, 0.07784933670209612, 0.07568013035892718,
    0.07352297371398132, 0.0713779490588904, 0.06924514439700676, 0.0671246538277885, 0.0650165779712429, 0.06292102443775814,
    0.06083810834953988, 0.05876795292093374, 0.0567106901062029, 0.05466646132488892, 0.05263541827679219, 0.05061772386094778,
    0.04861355321586854, 0.04662309490193038, 0.044646552251294463, 0.04268414491647446, 0.04073611065594094, 0.03880270740452615,
    0.036884215688567305, 0.034980941461716125, 0.03309321945857858, 0.0312214171919203, 0.02936593975813336, 0.027527235669603113,
    0.02570580400854891, 0.02390220330579588, 0.02211706270730885, 0.02035109623004451, 0.018605121275724622, 0.016880083152543142,
    0.01517708830793531, 0.013497450601739867, 0.011842757857907879, 0.010214971439701459, 0.008616582769398726, 0.007050875471373222,
    0.0055224032992509916, 0.0040379725933630236, 0.0026090727461021593, 0.001260285930498598,
  ],
};
if (typeof module !== 'undefined') module.exports = { createDoacEngine };
