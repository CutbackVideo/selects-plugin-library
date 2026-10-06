import { buildSfnt } from "./sfnt.ts";

export type Brotli = (compressed: Uint8Array) => Uint8Array;

const KNOWN_TAGS = (
  "cmap head hhea hmtx maxp name OS/2 post cvt  fpgm glyf loca prep CFF  VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE " +
  "GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG  sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar " +
  "mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill"
)
  .match(/.{4}\s?/g)!
  .map((s) => s.slice(0, 4));

class Reader {
  b: Uint8Array;
  dv: DataView;
  at: number;
  end: number;
  constructor(b: Uint8Array, start = 0, length = b.length - start) {
    this.b = b;
    this.dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    this.at = start;
    this.end = start + length;
    if (this.end > b.length) throw new Error("WOFF2: a stream runs past the data.");
  }
  need(n: number) {
    if (this.at + n > this.end) throw new Error("WOFF2: unexpected end of a stream.");
  }
  u8() {
    this.need(1);
    return this.b[this.at++];
  }
  u16() {
    this.need(2);
    const v = this.dv.getUint16(this.at);
    this.at += 2;
    return v;
  }
  i16() {
    this.need(2);
    const v = this.dv.getInt16(this.at);
    this.at += 2;
    return v;
  }
  u32() {
    this.need(4);
    const v = this.dv.getUint32(this.at);
    this.at += 4;
    return v;
  }
  bytes(n: number) {
    this.need(n);
    const v = this.b.subarray(this.at, this.at + n);
    this.at += n;
    return v;
  }
  base128() {
    let acc = 0;
    for (let i = 0; i < 5; i += 1) {
      const byte = this.u8();
      if (i === 0 && byte === 0x80) throw new Error("WOFF2: UIntBase128 with a leading zero.");
      if (acc & 0xfe000000) throw new Error("WOFF2: UIntBase128 overflow.");
      acc = ((acc << 7) | (byte & 0x7f)) >>> 0;
      if (!(byte & 0x80)) return acc;
    }
    throw new Error("WOFF2: UIntBase128 longer than 5 bytes.");
  }
  u255() {
    const code = this.u8();
    if (code === 253) return this.u16();
    if (code === 255) return this.u8() + 253;
    if (code === 254) return this.u8() + 506;
    return code;
  }
}

class Writer {
  buf = new Uint8Array(1 << 16);
  len = 0;
  ensure(n: number) {
    if (this.len + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.len + n) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }
  u8(v: number) {
    this.ensure(1);
    this.buf[this.len++] = v & 255;
  }
  u16(v: number) {
    this.ensure(2);
    this.buf[this.len++] = (v >> 8) & 255;
    this.buf[this.len++] = v & 255;
  }
  u32(v: number) {
    this.u16(v >>> 16);
    this.u16(v & 0xffff);
  }
  bytes(b: Uint8Array) {
    this.ensure(b.length);
    this.buf.set(b, this.len);
    this.len += b.length;
  }
  pad4() {
    while (this.len & 3) this.u8(0);
  }
  done() {
    return this.buf.slice(0, this.len);
  }
}

type Entry = { tag: string; origLength: number; transformLength: number; transformed: boolean };

const withSign = (flag: number, v: number) => (flag & 1 ? v : -v);

function decodeTriplets(flags: Uint8Array, glyph: Reader, n: number): { x: number; y: number; on: boolean }[] {
  const pts: { x: number; y: number; on: boolean }[] = [];
  let x = 0,
    y = 0;
  for (let i = 0; i < n; i += 1) {
    let flag = flags[i];
    const on = !(flag >> 7);
    flag &= 0x7f;
    const nb = flag < 84 ? 1 : flag < 120 ? 2 : flag < 124 ? 3 : 4;
    const d = glyph.bytes(nb);
    let dx: number, dy: number;
    if (flag < 10) {
      dx = 0;
      dy = withSign(flag, ((flag & 14) << 7) + d[0]);
    } else if (flag < 20) {
      dx = withSign(flag, (((flag - 10) & 14) << 7) + d[0]);
      dy = 0;
    } else if (flag < 84) {
      const b0 = flag - 20,
        b1 = d[0];
      dx = withSign(flag, 1 + (b0 & 0x30) + (b1 >> 4));
      dy = withSign(flag >> 1, 1 + ((b0 & 0x0c) << 2) + (b1 & 0x0f));
    } else if (flag < 120) {
      const b0 = flag - 84;
      dx = withSign(flag, 1 + (Math.floor(b0 / 12) << 8) + d[0]);
      dy = withSign(flag >> 1, 1 + (((b0 % 12) >> 2) << 8) + d[1]);
    } else if (flag < 124) {
      const b2 = d[1];
      dx = withSign(flag, (d[0] << 4) + (b2 >> 4));
      dy = withSign(flag >> 1, ((b2 & 0x0f) << 8) + d[2]);
    } else {
      dx = withSign(flag, (d[0] << 8) + d[1]);
      dy = withSign(flag >> 1, (d[2] << 8) + d[3]);
    }
    x += dx;
    y += dy;
    pts.push({ x, y, on });
  }
  return pts;
}

function storePoints(w: Writer, pts: { x: number; y: number; on: boolean }[], overlap: boolean) {
  const flagsOut: number[] = [];
  const xs = new Writer(),
    ys = new Writer();
  let lastX = 0,
    lastY = 0,
    lastFlag = -1,
    repeat = 0;
  pts.forEach((p, i) => {
    let flag = p.on ? 0x01 : 0;
    if (overlap && i === 0) flag |= 0x40;
    const dx = p.x - lastX,
      dy = p.y - lastY;
    if (dx === 0) flag |= 0x10;
    else if (dx > -256 && dx < 256) {
      flag |= 0x02 | (dx > 0 ? 0x10 : 0);
      xs.u8(Math.abs(dx));
    } else xs.u16(dx & 0xffff);
    if (dy === 0) flag |= 0x20;
    else if (dy > -256 && dy < 256) {
      flag |= 0x04 | (dy > 0 ? 0x20 : 0);
      ys.u8(Math.abs(dy));
    } else ys.u16(dy & 0xffff);
    if (flag === lastFlag && repeat !== 255) {
      flagsOut[flagsOut.length - 1] |= 0x08;
      repeat += 1;
    } else {
      if (repeat !== 0) flagsOut.push(repeat);
      flagsOut.push(flag);
      repeat = 0;
    }
    lastX = p.x;
    lastY = p.y;
    lastFlag = flag;
  });
  if (repeat !== 0) flagsOut.push(repeat);
  for (const f of flagsOut) w.u8(f);
  w.bytes(xs.done());
  w.bytes(ys.done());
}

function reconstructGlyf(data: Uint8Array): { glyf: Uint8Array; loca: Uint8Array; numGlyphs: number; indexFormat: number; xMins: Int16Array } {
  const h = new Reader(data);
  h.u16();
  const optionFlags = h.u16();
  const numGlyphs = h.u16();
  const indexFormat = h.u16();
  const sizes = [h.u32(), h.u32(), h.u32(), h.u32(), h.u32(), h.u32(), h.u32()];
  let at = h.at;
  const streams = sizes.map((s) => {
    const r = new Reader(data, at, s);
    at += s;
    return r;
  });
  const [nContourS, nPointsS, flagS, glyphS, compositeS, bboxS, instrS] = streams;
  const overlapBits = optionFlags & 1 ? data.subarray(at, at + ((numGlyphs + 7) >> 3)) : null;
  const bitmapLen = ((numGlyphs + 31) >> 5) << 2;
  const bboxBitmap = bboxS.bytes(bitmapLen);
  const hasBbox = (i: number) => (bboxBitmap[i >> 3] & (0x80 >> (i & 7))) !== 0;

  const out = new Writer();
  const offsets = new Uint32Array(numGlyphs + 1);
  const xMins = new Int16Array(numGlyphs);
  for (let g = 0; g < numGlyphs; g += 1) {
    offsets[g] = out.len;
    const nContours = nContourS.i16();
    if (nContours === 0) {
      if (hasBbox(g)) throw new Error("WOFF2: an empty glyph has a bounding box.");
      continue;
    }
    if (nContours === -1) {
      if (!hasBbox(g)) throw new Error("WOFF2: composite glyph " + g + " has no bounding box.");
      const start = compositeS.at;
      let haveInstructions = false;
      for (let more = true; more; ) {
        const flags = compositeS.u16();
        compositeS.u16();
        let n = flags & 0x0001 ? 4 : 2;
        if (flags & 0x0008) n += 2;
        else if (flags & 0x0040) n += 4;
        else if (flags & 0x0080) n += 8;
        compositeS.bytes(n);
        if (flags & 0x0100) haveInstructions = true;
        more = (flags & 0x0020) !== 0;
      }
      const composite = data.subarray(start, compositeS.at);
      out.u16(0xffff);
      const bbox = [bboxS.i16(), bboxS.i16(), bboxS.i16(), bboxS.i16()];
      xMins[g] = bbox[0];
      for (const v of bbox) out.u16(v & 0xffff);
      out.bytes(composite);
      if (haveInstructions) {
        const len = glyphS.u255();
        out.u16(len);
        out.bytes(instrS.bytes(len));
      }
      out.pad4();
      continue;
    }
    if (nContours < 0) throw new Error("WOFF2: glyph " + g + " has " + nContours + " contours.");
    const ends: number[] = [];
    let total = 0;
    for (let c = 0; c < nContours; c += 1) {
      total += nPointsS.u255();
      ends.push(total - 1);
    }
    const flags = flagS.bytes(total);
    const pts = decodeTriplets(flags, glyphS, total);
    const instrLen = glyphS.u255();
    const instructions = instrS.bytes(instrLen);
    let bbox: number[];
    if (hasBbox(g)) bbox = [bboxS.i16(), bboxS.i16(), bboxS.i16(), bboxS.i16()];
    else if (pts.length) {
      bbox = [pts[0].x, pts[0].y, pts[0].x, pts[0].y];
      for (const p of pts) {
        bbox[0] = Math.min(bbox[0], p.x);
        bbox[1] = Math.min(bbox[1], p.y);
        bbox[2] = Math.max(bbox[2], p.x);
        bbox[3] = Math.max(bbox[3], p.y);
      }
    } else bbox = [0, 0, 0, 0];
    xMins[g] = bbox[0];
    out.u16(nContours);
    for (const v of bbox) out.u16(v & 0xffff);
    for (const e of ends) out.u16(e);
    out.u16(instrLen);
    out.bytes(instructions);
    const overlap = !!overlapBits && (overlapBits[g >> 3] & (0x80 >> (g & 7))) !== 0;
    storePoints(out, pts, overlap);
    out.pad4();
  }
  offsets[numGlyphs] = out.len;
  const loca = new Writer();
  for (const o of offsets) {
    if (indexFormat === 0) loca.u16(o >> 1);
    else loca.u32(o);
  }
  return { glyf: out.done(), loca: loca.done(), numGlyphs, indexFormat, xMins };
}

function reconstructHmtx(data: Uint8Array, numGlyphs: number, numHMetrics: number, xMins: Int16Array): Uint8Array {
  const r = new Reader(data);
  const flags = r.u8();
  const adv: number[] = [];
  for (let i = 0; i < numHMetrics; i += 1) adv.push(r.u16());
  const lsb: number[] = [];
  for (let i = 0; i < numHMetrics; i += 1) lsb.push(flags & 1 ? xMins[i] : r.i16());
  for (let i = numHMetrics; i < numGlyphs; i += 1) lsb.push(flags & 2 ? xMins[i] : r.i16());
  const w = new Writer();
  for (let i = 0; i < numHMetrics; i += 1) {
    w.u16(adv[i]);
    w.u16(lsb[i] & 0xffff);
  }
  for (let i = numHMetrics; i < numGlyphs; i += 1) w.u16(lsb[i] & 0xffff);
  return w.done();
}

export function decodeWoff2(woff2: Uint8Array, brotli: Brotli): Uint8Array {
  const r = new Reader(woff2);
  if (r.u32() !== 0x774f4632) throw new Error("Not a WOFF2 font.");
  const flavor = r.u32();
  if (flavor === 0x74746366) throw new Error("WOFF2 font collections are not supported.");
  r.u32();
  const numTables = r.u16();
  r.u16();
  r.u32();
  const compressedSize = r.u32();
  r.at = 48;
  const entries: Entry[] = [];
  for (let i = 0; i < numTables; i += 1) {
    const flags = r.u8();
    const idx = flags & 0x3f;
    const tag = idx === 63 ? String.fromCharCode(...r.bytes(4)) : KNOWN_TAGS[idx];
    const version = flags >> 6;
    const origLength = r.base128();
    const transformed = tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    const transformLength = transformed ? r.base128() : origLength;
    entries.push({ tag, origLength, transformLength, transformed });
  }
  const stream = brotli(woff2.subarray(r.at, r.at + compressedSize));
  const raw = new Map<string, Uint8Array>();
  let at = 0;
  for (const e of entries) {
    if (at + e.transformLength > stream.length) throw new Error("WOFF2: the table data is shorter than its directory says.");
    raw.set(e.tag, stream.subarray(at, at + e.transformLength));
    at += e.transformLength;
  }
  const byTag = new Map(entries.map((e) => [e.tag, e]));
  const tables = new Map<string, Uint8Array>();
  let xMins: Int16Array | null = null;
  let numGlyphs = 0;
  const glyf = byTag.get("glyf");
  if (glyf?.transformed) {
    if (!byTag.get("loca")?.transformed) throw new Error("WOFF2: glyf is transformed but loca is not.");
    const g = reconstructGlyf(raw.get("glyf")!);
    tables.set("glyf", g.glyf);
    tables.set("loca", g.loca);
    xMins = g.xMins;
    numGlyphs = g.numGlyphs;
  }
  for (const e of entries) {
    if (tables.has(e.tag)) continue;
    if (e.tag === "hmtx" && e.transformed) continue;
    if (e.transformed) throw new Error("WOFF2: transformed " + e.tag + " is not supported.");
    tables.set(e.tag, raw.get(e.tag)!.slice());
  }
  const hm = byTag.get("hmtx");
  if (hm?.transformed) {
    if (!xMins) throw new Error("WOFF2: transformed hmtx needs a transformed glyf.");
    const hhea = tables.get("hhea");
    if (!hhea) throw new Error("WOFF2: no hhea table.");
    const numHMetrics = new DataView(hhea.buffer, hhea.byteOffset, hhea.byteLength).getUint16(34);
    tables.set("hmtx", reconstructHmtx(raw.get("hmtx")!, numGlyphs, numHMetrics, xMins));
  }
  return buildSfnt(flavor, tables);
}
