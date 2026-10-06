export type SfntTable = { offset: number; length: number; checksum: number };

const view = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);
const tagAt = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

export function fontKind(bytes: Uint8Array): "truetype" | "opentype" | "woff2" | "woff" | "collection" | "unknown" {
  if (bytes.length < 4) return "unknown";
  const t = tagAt(bytes, 0);
  if (t === "wOF2") return "woff2";
  if (t === "wOFF") return "woff";
  if (t === "OTTO") return "opentype";
  if (t === "ttcf") return "collection";
  if (t === "true" || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)) return "truetype";
  return "unknown";
}

export function sfntTables(bytes: Uint8Array): Record<string, SfntTable> {
  const kind = fontKind(bytes);
  if (kind !== "truetype" && kind !== "opentype") throw new Error("Not an sfnt font (" + kind + ").");
  const dv = view(bytes);
  const n = dv.getUint16(4);
  const out: Record<string, SfntTable> = {};
  for (let i = 0; i < n; i += 1) {
    const o = 12 + i * 16;
    out[tagAt(bytes, o)] = { checksum: dv.getUint32(o + 4), offset: dv.getUint32(o + 8), length: dv.getUint32(o + 12) };
  }
  return out;
}

export type Axis = { tag: string; min: number; def: number; max: number };

export function sfntAxes(bytes: Uint8Array): { axes: Axis[]; instances: number } {
  const t = sfntTables(bytes).fvar;
  if (!t) return { axes: [], instances: 0 };
  const dv = view(bytes);
  const base = t.offset;
  const axesOff = dv.getUint16(base + 4),
    count = dv.getUint16(base + 8),
    size = dv.getUint16(base + 10),
    instances = dv.getUint16(base + 12);
  const axes: Axis[] = [];
  for (let i = 0; i < count; i += 1) {
    const o = base + axesOff + i * size;
    const fx = (k: number) => dv.getInt32(o + k) / 65536;
    axes.push({ tag: tagAt(bytes, o), min: fx(4), def: fx(8), max: fx(12) });
  }
  return { axes, instances };
}

export function cmapCodepoints(bytes: Uint8Array): number[] {
  const t = sfntTables(bytes).cmap;
  if (!t) return [];
  const dv = view(bytes);
  const base = t.offset;
  const n = dv.getUint16(base + 2);
  let best: { offset: number; format: number; rank: number } | null = null;
  for (let i = 0; i < n; i += 1) {
    const o = base + 4 + i * 8;
    const pid = dv.getUint16(o),
      eid = dv.getUint16(o + 2),
      off = base + dv.getUint32(o + 4);
    const format = dv.getUint16(off);
    const unicode = pid === 0 || (pid === 3 && (eid === 1 || eid === 10));
    if (!unicode || (format !== 4 && format !== 12)) continue;
    const rank = format === 12 ? 2 : 1;
    if (!best || rank > best.rank) best = { offset: off, format, rank };
  }
  if (!best) return [];
  const out = new Set<number>();
  const o = best.offset;
  if (best.format === 12) {
    const groups = dv.getUint32(o + 12);
    for (let g = 0; g < groups; g += 1) {
      const p = o + 16 + g * 12;
      const start = dv.getUint32(p),
        end = dv.getUint32(p + 4),
        gid = dv.getUint32(p + 8);
      for (let c = start; c <= end; c += 1) if (gid + (c - start) !== 0) out.add(c);
    }
  } else {
    const segX2 = dv.getUint16(o + 6);
    const ends = o + 14,
      starts = ends + segX2 + 2,
      deltas = starts + segX2,
      ranges = deltas + segX2;
    for (let s = 0; s < segX2 / 2; s += 1) {
      const end = dv.getUint16(ends + 2 * s),
        start = dv.getUint16(starts + 2 * s),
        delta = dv.getInt16(deltas + 2 * s),
        rangeAt = ranges + 2 * s,
        range = dv.getUint16(rangeAt);
      for (let c = start; c <= end && c !== 0xffff; c += 1) {
        let gid: number;
        if (range === 0) gid = (c + delta) & 0xffff;
        else {
          const g = dv.getUint16(rangeAt + range + 2 * (c - start));
          gid = g === 0 ? 0 : (g + delta) & 0xffff;
        }
        if (gid !== 0) out.add(c);
      }
    }
  }
  return [...out].sort((a, b) => a - b);
}

export function codepointsOf(text: string): number[] {
  return [...new Set(Array.from(text, (ch) => ch.codePointAt(0)!))].sort((a, b) => a - b);
}

export function tableChecksum(b: Uint8Array): number {
  const dv = view(b);
  let s = 0;
  const whole = b.length & ~3;
  for (let k = 0; k < whole; k += 4) s = (s + dv.getUint32(k)) >>> 0;
  if (b.length & 3) {
    let last = 0;
    for (let k = whole; k < b.length; k += 1) last |= b[k] << (24 - 8 * (k - whole));
    s = (s + (last >>> 0)) >>> 0;
  }
  return s;
}

export function buildSfnt(flavor: number, tables: Map<string, Uint8Array>): Uint8Array {
  const tags = [...tables.keys()].sort();
  const n = tags.length;
  let pow = 1,
    log = 0;
  while (pow * 2 <= n) {
    pow *= 2;
    log += 1;
  }
  const headerLen = 12 + n * 16;
  const pad4 = (x: number) => (x + 3) & ~3;
  const total = headerLen + tags.reduce((s, t) => s + pad4(tables.get(t)!.length), 0);
  const out = new Uint8Array(total);
  const dv = view(out);
  dv.setUint32(0, flavor);
  dv.setUint16(4, n);
  dv.setUint16(6, pow * 16);
  dv.setUint16(8, log);
  dv.setUint16(10, n * 16 - pow * 16);
  let at = headerLen,
    headAt = -1;
  tags.forEach((tag, i) => {
    const data = tables.get(tag)!;
    if (tag === "head") {
      if (data.length < 12) throw new Error("head table too short");
      data.set([0, 0, 0, 0], 8);
      headAt = at;
    }
    const o = 12 + i * 16;
    for (let k = 0; k < 4; k += 1) out[o + k] = tag.charCodeAt(k);
    dv.setUint32(o + 4, tableChecksum(data));
    dv.setUint32(o + 8, at);
    dv.setUint32(o + 12, data.length);
    out.set(data, at);
    at += pad4(data.length);
  });
  if (headAt >= 0) dv.setUint32(headAt + 8, (0xb1b0afba - tableChecksum(out)) >>> 0);
  return out;
}
