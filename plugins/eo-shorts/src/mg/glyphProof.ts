import { fontFaceDescriptors } from "../../engine/compiler/font-faces.mjs";
import type { ExecutionFont } from "../../engine/compiler/font-faces.mjs";
import type { FaceUse, FontBytes, SubsetFace } from "./sceneFonts.ts";

export const PROOF_TOLERANCE_PX = 0.01;

export type GlyphProof = {
  family: string;
  file: string;
  checked: number;
  maxDiffPx: number;
  failures: { text: string; weight: number; size: number; full: number[]; subset: number[] }[];
  ms: number;
};

type FontFaceCtor = new (family: string, source: ArrayBuffer | ArrayBufferView, d?: FontFaceDescriptors) => FontFace;

function metrics(ctx: CanvasRenderingContext2D, font: string, text: string): number[] {
  ctx.font = font;
  const m = ctx.measureText(text);
  return [m.width, m.actualBoundingBoxLeft, m.actualBoundingBoxRight, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent];
}

export async function proveGlyphs(doc: Document, faces: SubsetFace[], uses: FaceUse[], readFont: FontBytes, o: { tolerancePx?: number; sizes?: number[] } = {}): Promise<GlyphProof[]> {
  const tol = o.tolerancePx ?? PROOF_TOLERANCE_PX;
  const win = doc.defaultView as unknown as { FontFace: FontFaceCtor };
  const ctx = doc.createElement("canvas").getContext("2d");
  if (!ctx) throw new Error("This window cannot measure text (no 2D canvas).");
  ctx.fontKerning = "normal";
  const out: GlyphProof[] = [];
  for (let i = 0; i < faces.length; i += 1) {
    const t0 = Date.now();
    const face = faces[i],
      use = uses[i];
    const font: ExecutionFont = use.font;
    const d = fontFaceDescriptors(font, face.file) as FontFaceDescriptors;
    const tag = face.sha256.slice(0, 8) + "-" + Math.random().toString(36).slice(2, 8);
    const fullName = "EO proof full " + tag,
      subName = "EO proof subset " + tag;
    const full = new win.FontFace(fullName, (await readFont(face.file.path)).slice(), d);
    const sub = new win.FontFace(subName, face.bytes.slice(), d);
    await Promise.all([full.load(), sub.load()]);
    doc.fonts.add(full);
    doc.fonts.add(sub);
    try {
      const cases = new Map<string, { text: string; weight: number; size: number }>();
      const add = (text: string, weight: number, size: number) => text && cases.set(weight + "|" + size + "|" + text, { text, weight, size });
      for (const u of use.uses) {
        add(u.text, u.weight, u.size || 100);
        add(u.text, u.weight, 100);
      }
      for (const w of face.weights) for (const size of o.sizes ?? [24, 100]) add(face.text, w, size);
      let maxDiff = 0;
      const failures: GlyphProof["failures"] = [];
      for (const c of cases.values()) {
        const spec = (name: string) => font.style + " " + c.weight + " " + c.size + "px " + JSON.stringify(name);
        const a = metrics(ctx, spec(fullName), c.text),
          b = metrics(ctx, spec(subName), c.text);
        const diff = Math.max(...a.map((v, k) => Math.abs(v - b[k])));
        maxDiff = Math.max(maxDiff, diff);
        if (diff > tol) failures.push({ ...c, full: a, subset: b });
      }
      out.push({ family: face.family, file: face.file.path, checked: cases.size, maxDiffPx: maxDiff, failures: failures.slice(0, 10), ms: Date.now() - t0 });
    } finally {
      doc.fonts.delete(full);
      doc.fonts.delete(sub);
    }
  }
  return out;
}
