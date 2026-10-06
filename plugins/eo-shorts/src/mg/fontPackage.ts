import type { HostFs } from "../host/types.ts";
import { readBytes, readText } from "../host/fs.ts";
import { fromBase64, toBase64 } from "./base64.ts";
import { fontKind } from "./sfnt.ts";
import { decodeWoff2, type Brotli } from "./woff2.ts";
import type { FontBytes } from "./sceneFonts.ts";

export function packagedFontName(stylePath: string): string {
  return stylePath.replace(/\.(woff2|woff|ttf)$/i, "") + ".ttf.b64";
}

export function styleFontPaths(styles: { fonts: Record<string, { path?: string; files?: Record<string, string>; system?: boolean }> }[]): string[] {
  const out: string[] = [];
  for (const s of styles)
    for (const f of Object.values(s.fonts)) {
      if (f.system) continue;
      for (const p of f.files ? Object.values(f.files) : f.path ? [f.path] : []) if (!out.includes(p)) out.push(p);
    }
  return out;
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function packagedFontSource(fs: Pick<HostFs, "join" | "exists" | "readFile">, root: string): FontBytes {
  const cache = new Map<string, Promise<Uint8Array>>();
  const at = (rel: string) => fs.join(root, ...rel.split("/").filter(Boolean));
  const read = async (rel: string): Promise<Uint8Array> => {
    const b64 = at(packagedFontName(rel));
    const gz = b64.replace(/\.b64$/, ".gz.b64");
    if ((await fs.exists(gz))) return gunzip(fromBase64(await readText(fs as HostFs, gz)));
    if ((await fs.exists(b64))) return fromBase64(await readText(fs as HostFs, b64));
    const ttf = at(packagedFontName(rel).replace(/\.b64$/, ""));
    if ((await fs.exists(ttf))) return readBytes(fs as HostFs, ttf);
    if ((await fs.exists(at(rel)))) return readBytes(fs as HostFs, at(rel));
    if ((await fs.exists(at(rel) + ".b64"))) return fromBase64(await readText(fs as HostFs, at(rel) + ".b64"));
    throw new Error("Font file missing from the package: " + rel);
  };
  return (rel) => {
    let p = cache.get(rel);
    if (!p) {
      p = read(rel);
      p.catch(() => cache.delete(rel));
      cache.set(rel, p);
    }
    return p.then((b) => b.slice());
  };
}

export type PackagedFont = {
  stylePath: string;
  packaged: string;
  sourceBytes: number;
  sourceSha256: string;
  ttfBytes: number;
  ttfSha256: string;
  decodedFrom: "woff2" | null;
};

export type FontPackageIo = {
  read(stylePath: string): Uint8Array;
  write(packagePath: string, text: string): void;
  sha256(bytes: Uint8Array): string;
  brotli: Brotli;
};

export function packageFonts(styles: Parameters<typeof styleFontPaths>[0], io: FontPackageIo): PackagedFont[] {
  const out: PackagedFont[] = [];
  for (const stylePath of styleFontPaths(styles)) {
    const source = io.read(stylePath);
    const kind = fontKind(source);
    let ttf: Uint8Array;
    if (kind === "woff2") ttf = decodeWoff2(source, io.brotli);
    else if (kind === "truetype" || kind === "opentype") ttf = source;
    else throw new Error(stylePath + " is " + kind + ", not a font the package can carry.");
    const packaged = packagedFontName(stylePath);
    io.write(packaged, toBase64(ttf) + "\n");
    out.push({ stylePath, packaged, sourceBytes: source.length, sourceSha256: io.sha256(source), ttfBytes: ttf.length, ttfSha256: io.sha256(ttf), decodedFrom: kind === "woff2" ? "woff2" : null });
  }
  return out;
}
