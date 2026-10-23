// Embedded typeface for the news-minute Motion Graphics. Each graphic carries a subset of
// Pretendard Variable holding only the characters it can show, as a TrueType data URL, so it
// renders the same on any machine without Pretendard installed. Pretendard is published with the
// Reserved Font Name "Pretendard", so every subset is renamed to EMBED_FAMILY before it ships.
// The panel passes `fontFamily: EMBED_FAMILY` explicitly: an empty value would be replaced by
// addMotionGraphic with the user's last font pick (Segoe UI on a fresh Windows install).
import { createSubsetter, SCENE_SUBSET_OPTIONS, type Subsetter } from "./hbSubset.ts";
import { renameFamily, renamePairs } from "./renameFamily.ts";
import { cmapCodepoints, codepointsOf, sfntAxes } from "./sfnt.ts";

export const SOURCE_FAMILY = "Pretendard Variable";
export const EMBED_FAMILY = "NM Sans";

// Plugin-relative files, gzip-compressed and base64 encoded (public checks reject raw binaries).
export const FONT_FILE = Object.freeze({ path: "fonts/PretendardVariable.ttf.gz.b64", bytes: 6739336, sha256: "3090ccde0442bb347aa7685d9ba8b17436a60682df6e8f92a9a670de14056e22" });
export const SUBSETTER_FILE = Object.freeze({ path: "fonts/harfbuzz-subset.wasm.gz.b64", bytes: 651027, sha256: "5fc12cf6a843a703cbab360169c681704416f330d3979e7e5a3f4b050efbb720" });

// Weights the templates set type in. One variable face covers all of them.
export const WEIGHTS = [300, 500, 600, 700, 800, 900];

// Characters a count-up passes through before it lands on the final text.
export const NUMBER_CHARS = "0123456789,.%+-~ ";

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromBase64(text: string): Uint8Array {
  const bin = atob(text.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// Decode one packaged file and check it is exactly the reviewed bytes.
export async function unpackFile(text: string, expected: { path: string; bytes: number; sha256: string }): Promise<Uint8Array> {
  const stream = new Blob([fromBase64(text) as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  if (bytes.length !== expected.bytes || (await sha256Hex(bytes)) !== expected.sha256) {
    throw new Error(expected.path + " does not match the packaged file; reinstall the app.");
  }
  return bytes;
}

export type EmbeddedFont = {
  source: Uint8Array;
  available: Set<number>;
  subsetter: Subsetter;
};

// Read both packaged files once per panel session; `read` returns a file's text by plugin path.
export async function loadEmbeddedFont(read: (path: string) => Promise<string>): Promise<EmbeddedFont> {
  const [source, wasm] = await Promise.all([unpackFile(await read(FONT_FILE.path), FONT_FILE), unpackFile(await read(SUBSETTER_FILE.path), SUBSETTER_FILE)]);
  return { source, available: new Set(cmapCodepoints(source)), subsetter: await createSubsetter(wasm) };
}

// Every string a graphic's parameters can put on screen, skipping image data URLs.
export function sceneText(parameters: unknown): string {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (!v.startsWith("data:")) out.push(v);
    } else if (typeof v === "number") out.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(parameters);
  return out.join("") + NUMBER_CHARS;
}

export type SceneFont = {
  fontFamily: string;
  fontCss: string;
  fontLoads: string[];
  subsetBytes: number;
  missing: string;
};

// Subset, rename and wrap the face for one graphic. Merge the result into its `parameters`.
export function sceneFont(font: EmbeddedFont, text: string): SceneFont {
  const cps = codepointsOf(text).filter((c) => c >= 0x20);
  let bytes = font.subsetter.subset(font.source, cps, SCENE_SUBSET_OPTIONS);
  bytes = renameFamily(bytes, renamePairs(SOURCE_FAMILY, EMBED_FAMILY)).bytes;
  if (!sfntAxes(bytes).axes.some((a) => a.tag === "wght")) throw new Error("The font subset lost its weight axis.");
  const src = "data:font/ttf;base64," + toBase64(bytes);
  return {
    fontFamily: EMBED_FAMILY,
    fontCss: "@font-face{font-family:" + JSON.stringify(EMBED_FAMILY) + ";src:url(" + src + ") format(\"truetype\");font-weight:100 900;font-style:normal;font-display:block;}",
    fontLoads: WEIGHTS.map((w) => w + " 64px " + JSON.stringify(EMBED_FAMILY)),
    subsetBytes: bytes.length,
    // Characters the face has no glyph for; they fall back to a system font per glyph.
    missing: String.fromCodePoint(...cps.filter((c) => !font.available.has(c))),
  };
}
