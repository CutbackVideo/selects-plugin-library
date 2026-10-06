import { buildSfnt, sfntTables } from "./sfnt.ts";

export const RESERVED_FONT_NAMES: Readonly<Record<string, string>> = Object.freeze({ "Playfair Display": "EO Serif" });

export function renamePairs(from: string, to: string): [string, string][] {
  const pairs: [string, string][] = [[from, to]];
  const a = from.replace(/\s+/g, ""),
    b = to.replace(/\s+/g, "");
  if (a !== from) pairs.push([a, b]);
  return pairs;
}

export function renameFamily(bytes: Uint8Array, pairs: [string, string][]): { bytes: Uint8Array; changedRecords: number } {
  const dirs = sfntTables(bytes);
  const name = dirs.name;
  if (!name) throw new Error("The font has no name table.");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nb = name.offset;
  if (dv.getUint16(nb) !== 0) throw new Error("Name table format " + dv.getUint16(nb) + " is not supported.");
  const count = dv.getUint16(nb + 2),
    strOff = dv.getUint16(nb + 4);
  const recs: { pid: number; eid: number; lid: number; nid: number; raw: Uint8Array }[] = [];
  let changed = 0;
  for (let i = 0; i < count; i += 1) {
    const o = nb + 6 + i * 12;
    const r = { pid: dv.getUint16(o), eid: dv.getUint16(o + 2), lid: dv.getUint16(o + 4), nid: dv.getUint16(o + 6) };
    const len = dv.getUint16(o + 8),
      off = dv.getUint16(o + 10);
    let raw = bytes.slice(nb + strOff + off, nb + strOff + off + len);
    const utf16 = r.pid === 0 || r.pid === 3;
    if (r.nid !== 0 && r.nid !== 13 && r.nid !== 14 && (utf16 || r.pid === 1)) {
      let text = "";
      if (utf16) for (let k = 0; k + 1 < raw.length; k += 2) text += String.fromCharCode((raw[k] << 8) | raw[k + 1]);
      else text = String.fromCharCode(...raw);
      let next = text;
      for (const [from, to] of pairs) next = next.split(from).join(to);
      if (next !== text) {
        changed += 1;
        if (utf16) {
          raw = new Uint8Array(next.length * 2);
          for (let k = 0; k < next.length; k += 1) {
            raw[2 * k] = next.charCodeAt(k) >> 8;
            raw[2 * k + 1] = next.charCodeAt(k) & 255;
          }
        } else raw = Uint8Array.from(next, (c) => c.charCodeAt(0) & 255);
      }
    }
    recs.push({ ...r, raw });
  }
  const strings = recs.reduce((n, r) => n + r.raw.length, 0);
  const table = new Uint8Array(6 + recs.length * 12 + strings);
  const nv = new DataView(table.buffer);
  nv.setUint16(0, 0);
  nv.setUint16(2, recs.length);
  nv.setUint16(4, 6 + recs.length * 12);
  let so = 0;
  recs.forEach((r, i) => {
    const o = 6 + i * 12;
    nv.setUint16(o, r.pid);
    nv.setUint16(o + 2, r.eid);
    nv.setUint16(o + 4, r.lid);
    nv.setUint16(o + 6, r.nid);
    nv.setUint16(o + 8, r.raw.length);
    nv.setUint16(o + 10, so);
    table.set(r.raw, 6 + recs.length * 12 + so);
    so += r.raw.length;
  });
  const tables = new Map<string, Uint8Array>();
  for (const [t, loc] of Object.entries(dirs)) tables.set(t, t === "name" ? table : bytes.slice(loc.offset, loc.offset + loc.length));
  return { bytes: buildSfnt(dv.getUint32(0), tables), changedRecords: changed };
}

export function nameRecords(bytes: Uint8Array): { nid: number; pid: number; text: string }[] {
  const name = sfntTables(bytes).name;
  if (!name) return [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nb = name.offset;
  const count = dv.getUint16(nb + 2),
    strOff = dv.getUint16(nb + 4);
  const out: { nid: number; pid: number; text: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const o = nb + 6 + i * 12;
    const pid = dv.getUint16(o),
      nid = dv.getUint16(o + 6),
      len = dv.getUint16(o + 8),
      off = dv.getUint16(o + 10);
    const raw = bytes.subarray(nb + strOff + off, nb + strOff + off + len);
    let text = "";
    if (pid === 0 || pid === 3) for (let k = 0; k + 1 < raw.length; k += 2) text += String.fromCharCode((raw[k] << 8) | raw[k + 1]);
    else text = String.fromCharCode(...raw);
    out.push({ nid, pid, text });
  }
  return out;
}
