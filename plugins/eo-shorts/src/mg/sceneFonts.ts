import type { ExecutionFont, FontFile } from "../../engine/compiler/font-faces.mjs";
import { fileForWeight, fontFaceCss } from "../../engine/compiler/font-faces.mjs";
import type { Execution } from "../../engine/compiler/core.mjs";
import { sha256Hex } from "../host/util.ts";
import { SCENE_SUBSET_OPTIONS, type Subsetter } from "./hbSubset.ts";
import { cmapCodepoints, codepointsOf, fontKind } from "./sfnt.ts";
import { renameFamily, renamePairs } from "./renameFamily.ts";
import { toBase64 } from "./base64.ts";

export const NUMBER_MOTION_CHARS = "0123456789,. -×";

export type TextUse = { layerId: string; role: string; weight: number; size: number; text: string };

export type FaceUse = {
  key: string;
  role: string;
  font: ExecutionFont;
  file: FontFile;
  weights: number[];
  text: string;
  uses: TextUse[];
};

type Layer = Record<string, any>;

export function layerTexts(layer: Layer): TextUse[] {
  if (layer.kind !== "text") return [];
  const out: TextUse[] = [];
  const extra = layer.numberMotion ? NUMBER_MOTION_CHARS : "";
  const base = { layerId: String(layer.id), size: Number(layer.size) || 0 };
  if (Array.isArray(layer.richLines) && layer.richLines.length) {
    for (const line of layer.richLines) {
      out.push({ ...base, role: line.font || layer.font, weight: Number(line.weight || layer.weight || 400), size: Number(line.size || layer.size) || 0, text: String(line.text ?? "") + extra });
    }
    return out;
  }
  const role = layer.font,
    weight = Number(layer.weight || 400);
  out.push({ ...base, role, weight, text: String(layer.text ?? "") + extra });
  for (const run of layer.reveal?.runs ?? []) out.push({ ...base, role, weight, text: String(run.text ?? "") });
  return out;
}

const uniqueText = (s: string) => String.fromCodePoint(...codepointsOf(s));

export function sceneFaceUses(ex: Pick<Execution, "fonts" | "layers">): FaceUse[] {
  const faces = new Map<string, FaceUse>();
  for (const layer of ex.layers as Layer[]) {
    for (const use of layerTexts(layer)) {
      if (!use.text) continue;
      const font = ex.fonts[use.role];
      if (!font) throw new Error("Layer " + use.layerId + " is set in font role " + use.role + ", which the execution does not declare.");
      if (font.system || !font.files?.length) throw new Error("Font " + font.family + " is a system font; a scene can only carry packaged fonts.");
      const file = fileForWeight(font, use.weight);
      const key = [file.path, font.family, font.style, file.weight].join("|");
      let face = faces.get(key);
      if (!face) faces.set(key, (face = { key, role: use.role, font, file, weights: [], text: "", uses: [] }));
      if (!face.weights.includes(use.weight)) face.weights.push(use.weight);
      face.text += use.text;
      face.uses.push(use);
    }
  }
  for (const f of faces.values()) {
    f.text = uniqueText(f.text);
    f.weights.sort((a, b) => a - b);
  }
  return [...faces.values()];
}

export type FontBytes = (path: string) => Promise<Uint8Array>;

export type SubsetFace = {
  family: string;
  alias: string;
  role: string;
  file: FontFile;
  style: string;
  weights: number[];
  text: string;
  missing: string;
  sourceBytes: number;
  sourceSha256: string;
  bytes: Uint8Array;
  sha256: string;
  base64Bytes: number;
  renamedTo: string | null;
  renamedRecords: number;
  css: string;
};

export type SceneFonts = {
  faces: SubsetFace[];
  fontCss: string;
  fontLoads: string[];
  aliases: Record<string, string>;
};

export function aliasedExecution<T extends Pick<Execution, "fonts">>(ex: T, aliases: Record<string, string>): T {
  const fonts: Record<string, ExecutionFont> = {};
  for (const [role, f] of Object.entries(ex.fonts)) fonts[role] = aliases[f.family] ? { ...f, family: aliases[f.family] } : f;
  return { ...ex, fonts };
}

export type BuildFontsOptions = {
  subsetter: Subsetter;
  readFont: FontBytes;
  rename?: Record<string, string>;
};

export async function buildSceneFonts(uses: FaceUse[], o: BuildFontsOptions): Promise<SceneFonts> {
  const sources = new Map<string, Promise<Uint8Array>>();
  const built: Omit<SubsetFace, "alias" | "css">[] = [];
  for (const u of uses) {
    if (!sources.has(u.file.path)) sources.set(u.file.path, o.readFont(u.file.path));
    const source = await sources.get(u.file.path)!;
    const kind = fontKind(source);
    if (kind !== "truetype" && kind !== "opentype") throw new Error("Font " + u.file.path + " is " + kind + "; the package must carry it as TrueType.");
    const available = new Set(cmapCodepoints(source));
    const cps = codepointsOf(u.text);
    let bytes = o.subsetter.subset(source, cps, SCENE_SUBSET_OPTIONS);
    const renamedTo = o.rename?.[u.font.family] ?? null;
    let renamedRecords = 0;
    if (renamedTo) {
      const r = renameFamily(bytes, renamePairs(u.font.family, renamedTo));
      bytes = r.bytes;
      renamedRecords = r.changedRecords;
    }
    built.push({
      family: u.font.family,
      role: u.role,
      file: u.file,
      style: u.font.style,
      weights: u.weights,
      text: u.text,
      missing: String.fromCodePoint(...cps.filter((c) => !available.has(c))),
      sourceBytes: source.length,
      sourceSha256: await sha256Hex(source),
      bytes,
      sha256: await sha256Hex(bytes),
      base64Bytes: 4 * Math.ceil(bytes.length / 3),
      renamedTo,
      renamedRecords,
    });
  }
  const aliases: Record<string, string> = {};
  for (const family of new Set(built.map((b) => b.family))) {
    const mine = built.filter((b) => b.family === family);
    const spec = JSON.stringify(mine.map((b) => [b.file.path, b.file.weight, b.style, b.sha256, uses.find((u) => u.file === b.file)?.font.figures ?? null, uses.find((u) => u.file === b.file)?.font.opticalSize ?? null]));
    const shown = mine[0].renamedTo ?? family;
    aliases[family] = "EO " + shown + " " + (await sha256Hex(spec)).slice(0, 8);
  }
  const faces: SubsetFace[] = built.map((b, i) => {
    const font = { ...uses[i].font, family: aliases[b.family] };
    const css = fontFaceCss(font, b.file, "data:font/ttf;base64," + toBase64(b.bytes), { format: "truetype", display: "block" });
    return { ...b, alias: aliases[b.family], css };
  });
  const fontLoads: string[] = [];
  for (const f of faces) for (const w of f.weights) fontLoads.push(f.style + " " + w + " 100px " + JSON.stringify(f.alias));
  return { faces, fontCss: faces.map((f) => f.css).join(""), fontLoads, aliases };
}

export function faceReceipt(f: SubsetFace) {
  return {
    family: f.family,
    alias: f.alias,
    role: f.role,
    file: f.file.path,
    declaredWeight: f.file.weight,
    style: f.style,
    weights: f.weights,
    characters: f.text,
    missing: f.missing,
    sourceBytes: f.sourceBytes,
    sourceSha256: f.sourceSha256,
    subsetBytes: f.bytes.length,
    subsetSha256: f.sha256,
    base64Bytes: f.base64Bytes,
    renamedTo: f.renamedTo,
    renamedRecords: f.renamedRecords,
  };
}
