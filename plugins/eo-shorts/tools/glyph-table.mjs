// The lint's glyph table: for every font file a film style names, the code points its best Unicode cmap maps and
// those of them whose glyph draws no ink. Reads the packaged fonts (fonts/fonts.json) and writes src/lint/glyphTable.ts.
//   node tools/glyph-table.mjs           write src/lint/glyphTable.ts when it changes
//   node tools/glyph-table.mjs --check   exit 1 when src/lint/glyphTable.ts is not what the fonts give
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

export const PLUGIN = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = join(PLUGIN, "src", "lint", "glyphTable.ts");

const WOFF2_TAGS = ["cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca", "prep", "CFF ",
  "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF",
  "MATH", "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar",
  "gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill"];

const view = (b) => new DataView(b.buffer, b.byteOffset, b.byteLength);
const tagAt = (dv, o) => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));

export function readFont(bytes) {
  const dv = view(bytes), sig = tagAt(dv, 0);
  if (sig === "wOF2") return readWoff2(bytes);
  if (sig === "wOFF") return readWoff(bytes);
  if (sig === "OTTO") throw new Error("CFF outlines are not supported (no film uses a CFF font)");
  if (sig !== "\0\x01\0\0" && sig !== "true") throw new Error(`not a font file (signature ${JSON.stringify(sig)})`);
  const n = dv.getUint16(4), tables = new Map();
  for (let i = 0; i < n; i++) {
    const o = 12 + 16 * i, off = dv.getUint32(o + 8), len = dv.getUint32(o + 12);
    tables.set(tagAt(dv, o), bytes.subarray(off, off + len));
  }
  return { flavor: "sfnt", tables };
}

function readWoff(bytes) {
  const dv = view(bytes), n = dv.getUint16(12), tables = new Map();
  for (let i = 0; i < n; i++) {
    const o = 44 + 20 * i, off = dv.getUint32(o + 4), comp = dv.getUint32(o + 8), orig = dv.getUint32(o + 12);
    const raw = bytes.subarray(off, off + comp);
    tables.set(tagAt(dv, o), comp < orig ? new Uint8Array(inflateSync(raw)) : raw);
  }
  return { flavor: "woff", tables };
}

function base128(bytes, pos) {
  let v = 0;
  for (let i = 0; i < 5; i++) {
    const b = bytes[pos.i++];
    if (i === 0 && b === 0x80) throw new Error("WOFF2: UIntBase128 with a leading zero");
    v = v * 128 + (b & 0x7f);
    if (!(b & 0x80)) return v;
  }
  throw new Error("WOFF2: UIntBase128 longer than five bytes");
}
function u255(bytes, pos) {
  const code = bytes[pos.i++];
  if (code === 253) { const v = (bytes[pos.i] << 8) | bytes[pos.i + 1]; pos.i += 2; return v; }
  if (code === 255) return bytes[pos.i++] + 253;
  if (code === 254) return bytes[pos.i++] + 506;
  return code;
}

function readWoff2(bytes) {
  const dv = view(bytes), flavor = tagAt(dv, 4);
  if (flavor === "ttcf") throw new Error("WOFF2 collections are not supported");
  const numTables = dv.getUint16(12), compressedSize = dv.getUint32(20);
  const pos = { i: 48 }, dir = [];
  for (let t = 0; t < numTables; t++) {
    const flags = bytes[pos.i++];
    let tag;
    if ((flags & 63) === 63) { tag = tagAt(dv, pos.i); pos.i += 4; } else tag = WOFF2_TAGS[flags & 63];
    const version = (flags >> 6) & 3, origLength = base128(bytes, pos);
    const transformed = tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    const length = transformed ? base128(bytes, pos) : origLength;
    dir.push({ tag, transformed, length });
  }
  const data = new Uint8Array(brotliDecompressSync(bytes.subarray(pos.i, pos.i + compressedSize)));
  const tables = new Map();
  let off = 0, glyf = null;
  for (const t of dir) {
    const body = data.subarray(off, off + t.length);
    off += t.length;
    if (t.tag === "glyf" && t.transformed) glyf = transformedGlyf(body);
    else if (!(t.tag === "loca" && t.transformed)) tables.set(t.tag, body);
  }
  return { flavor: "woff2", tables, glyf };
}

function transformedGlyf(body) {
  const dv = view(body), numGlyphs = dv.getUint16(4);
  const sizes = Array.from({ length: 7 }, (_, k) => dv.getUint32(8 + 4 * k));
  let o = 36;
  const streams = sizes.map((s) => { const b = body.subarray(o, o + s); o += s; return b; });
  const [nContour, nPoints, , , composite] = streams;
  const nc = view(nContour), pPos = { i: 0 }, cPos = { i: 0 }, cv = view(composite), out = [];
  for (let g = 0; g < numGlyphs; g++) {
    const contours = nc.getInt16(2 * g);
    if (contours === 0) out.push(null);
    else if (contours > 0) {
      let points = 0;
      for (let k = 0; k < contours; k++) points += u255(nPoints, pPos);
      out.push({ points });
    } else {
      const components = [];
      for (;;) {
        const flags = cv.getUint16(cPos.i), gid = cv.getUint16(cPos.i + 2);
        cPos.i += 4 + (flags & 1 ? 4 : 2) + (flags & 8 ? 2 : flags & 0x40 ? 4 : flags & 0x80 ? 8 : 0);
        components.push(gid);
        if (!(flags & 0x20)) break;
      }
      out.push({ components });
    }
  }
  return out;
}

function glyfOutlines(tables) {
  const head = view(tables.get("head")), maxp = view(tables.get("maxp"));
  const numGlyphs = maxp.getUint16(4), long = head.getInt16(50) === 1;
  const loca = view(tables.get("loca")), glyf = tables.get("glyf"), gv = view(glyf), out = [];
  const at = (g) => (long ? loca.getUint32(4 * g) : loca.getUint16(2 * g) * 2);
  for (let g = 0; g < numGlyphs; g++) {
    const a = at(g), b = at(g + 1);
    if (b <= a) { out.push(null); continue; }
    const contours = gv.getInt16(a);
    if (contours === 0) out.push(null);
    else if (contours > 0) out.push({ points: gv.getUint16(a + 10 + 2 * (contours - 1)) + 1 });
    else {
      const components = [];
      let p = a + 10;
      for (;;) {
        const flags = gv.getUint16(p), gid = gv.getUint16(p + 2);
        p += 4 + (flags & 1 ? 4 : 2) + (flags & 8 ? 2 : flags & 0x40 ? 4 : flags & 0x80 ? 8 : 0);
        components.push(gid);
        if (!(flags & 0x20)) break;
      }
      out.push({ components });
    }
  }
  return out;
}

export function inkedGlyphs(font) {
  if (font.tables.has("CFF ") || font.tables.has("CFF2")) throw new Error("CFF outlines are not supported");
  const outlines = font.glyf || glyfOutlines(font.tables), memo = new Map();
  const inked = (g, stack = new Set()) => {
    if (memo.has(g)) return memo.get(g);
    const o = outlines[g];
    let v = false;
    if (o && o.points !== undefined) v = o.points > 0;
    else if (o && !stack.has(g)) {
      stack.add(g);
      v = o.components.some((c) => c < outlines.length && inked(c, stack));
      stack.delete(g);
    }
    memo.set(g, v);
    return v;
  };
  return { count: outlines.length, inked: (g) => inked(g) };
}

const PREFERENCES = [[3, 10], [0, 6], [0, 4], [3, 1], [0, 3], [0, 2], [0, 1], [0, 0]];

export function bestCmap(cmapBytes) {
  const dv = view(cmapBytes), n = dv.getUint16(2), subs = [];
  for (let i = 0; i < n; i++) subs.push({ platform: dv.getUint16(4 + 8 * i), encoding: dv.getUint16(6 + 8 * i), offset: dv.getUint32(8 + 8 * i) });
  for (const [p, e] of PREFERENCES) {
    const sub = subs.find((s) => s.platform === p && s.encoding === e);
    if (sub) return decodeSubtable(dv, sub.offset);
  }
  return new Map();
}

function decodeSubtable(dv, o) {
  const format = dv.getUint16(o), codes = [], gids = [];
  if (format === 4) {
    const segX2 = dv.getUint16(o + 6), seg = segX2 / 2;
    const end = o + 14, start = end + segX2 + 2, delta = start + segX2, rangeOff = delta + segX2, giArray = rangeOff + segX2;
    const lenGI = (o + dv.getUint16(o + 2) - giArray) / 2;
    for (let i = 0; i < seg - 1; i++) {
      const s = dv.getUint16(start + 2 * i), e = dv.getUint16(end + 2 * i), d = dv.getUint16(delta + 2 * i), r = dv.getUint16(rangeOff + 2 * i);
      const partial = Math.floor(r / 2) - s + i - seg;
      for (let c = s; c <= e; c++) {
        codes.push(c);
        if (r === 0) gids.push((c + d) & 0xffff);
        else {
          const idx = c + partial;
          if (idx >= lenGI) throw new Error("cmap format 4: index past the glyph index array");
          const g = dv.getUint16(giArray + 2 * idx);
          gids.push(g !== 0 ? (g + d) & 0xffff : 0);
        }
      }
    }
  } else if (format === 12 || format === 13) {
    const groups = dv.getUint32(o + 12);
    for (let i = 0; i < groups; i++) {
      const g = o + 16 + 12 * i, s = dv.getUint32(g), e = dv.getUint32(g + 4), id = dv.getUint32(g + 8);
      for (let c = s; c <= e; c++) { codes.push(c); gids.push(format === 12 ? id + (c - s) : id); }
    }
  } else if (format === 6) {
    const first = dv.getUint16(o + 6), count = dv.getUint16(o + 8);
    for (let i = 0; i < count; i++) { codes.push(first + i); gids.push(dv.getUint16(o + 10 + 2 * i)); }
  } else if (format === 0) {
    for (let i = 0; i < 256; i++) { codes.push(i); gids.push(dv.getUint8(o + 6 + i)); }
  } else throw new Error(`cmap format ${format} is not supported`);
  const map = new Map();
  codes.forEach((c, i) => { if (gids[i] !== 0) map.set(c, gids[i]); });
  return map;
}

export function glyphTableOf(bytes) {
  const font = readFont(bytes), cmap = bestCmap(font.tables.get("cmap")), glyphs = inkedGlyphs(font);
  const codes = [...cmap.keys()].sort((a, b) => a - b), ranges = [], blank = [];
  for (const c of codes) {
    const last = ranges.length - 1;
    if (last >= 0 && ranges[last] === c - 1) ranges[last] = c;
    else ranges.push(c, c);
    const g = cmap.get(c);
    if (!(g < glyphs.count && glyphs.inked(g))) blank.push(c);
  }
  return { sha256: createHash("sha256").update(bytes).digest("hex"), glyphs: glyphs.count, codepoints: codes.length, cmap: ranges, blank };
}

function styleFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...styleFiles(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

export function styleFonts(root = PLUGIN) {
  const fonts = new Set();
  for (const file of styleFiles(join(root, "engine", "styles"))) {
    const style = JSON.parse(readFileSync(file, "utf8"));
    for (const f of Object.values(style.fonts || {})) {
      if (!f || typeof f !== "object" || f.system) continue;
      for (const rel of [f.path, ...Object.values(f.files || {})]) if (typeof rel === "string" && rel) fonts.add(rel);
    }
  }
  return [...fonts].sort();
}

export function buildGlyphTable(root = PLUGIN) {
  const manifest = JSON.parse(readFileSync(join(root, "fonts", "fonts.json"), "utf8"));
  const table = {};
  for (const rel of styleFonts(root)) {
    const entry = manifest.fonts.find((f) => f.stylePath === rel);
    if (!entry) throw new Error(`a film style names ${rel}, which fonts/fonts.json does not list`);
    const stored = Buffer.from(readFileSync(join(root, ...entry.packaged.split("/")), "utf8").trim(), "base64");
    const bytes = new Uint8Array(entry.packaged.endsWith(".gz.b64") ? gunzipSync(stored) : stored);
    if (createHash("sha256").update(bytes).digest("hex") !== entry.ttfSha256) throw new Error(`${entry.packaged} does not match fonts/fonts.json`);
    // the table names each font by the file the style names (its sha256 too); the glyphs are the packaged TrueType's
    table[rel] = { ...glyphTableOf(bytes), sha256: entry.sourceSha256 };
  }
  return table;
}

export function glyphTableModule(table) {
  const rows = Object.entries(table).map(([rel, t]) =>
    `  ${JSON.stringify(rel)}: {\n    sha256: ${JSON.stringify(t.sha256)}, glyphs: ${t.glyphs}, codepoints: ${t.codepoints},\n` +
    `    cmap: ${JSON.stringify(t.cmap)},\n    blank: ${JSON.stringify(t.blank)},\n  },`);
  return [
    "// Generated by tools/glyph-table.mjs from the fonts the film styles name; do not edit.",
    'import type { GlyphTable } from "./glyphs.ts";',
    "",
    "export const GLYPH_TABLE: GlyphTable = {",
    ...rows,
    "};",
    "",
  ].join("\n");
}

export function writeGlyphTable({ root = PLUGIN, out = OUT, check = false } = {}) {
  const text = glyphTableModule(buildGlyphTable(root));
  const changed = !existsSync(out) || readFileSync(out, "utf8") !== text;
  if (changed && !check) writeFileSync(out, text);
  return { changed, path: out };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  try {
    const { changed, path } = writeGlyphTable({ check });
    const shown = relative(process.cwd(), path).split(sep).join("/") || path;
    if (check && changed) {
      console.error(`${shown} is stale: run node tools/glyph-table.mjs`);
      process.exit(1);
    }
    console.log(changed ? `wrote ${shown}` : `${shown} is current`);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
