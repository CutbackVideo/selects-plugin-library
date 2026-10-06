import type { CompileHost, DecodedImage, MeasureRequest, TextMetrics } from "../../engine/compiler/core.mjs";
import type { ExecutionFont } from "../../engine/compiler/font-faces.mjs";
import { declareFonts, type DeclaredFonts, type FontSource } from "./fontFaces.ts";

export type BrowserHostOptions = {
  readFont: FontSource;
  doc?: Document;
  warn?: (text: string) => void;
  join?: (...parts: string[]) => string;
};

export function browserHost(o: BrowserHostOptions): CompileHost {
  const doc = o.doc ?? document;
  const win = doc.defaultView as Window & typeof globalThis;
  let declared: DeclaredFonts | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  const context = () => {
    if (!ctx) {
      const c = doc.createElement("canvas").getContext("2d");
      if (!c) throw new Error("This window cannot measure text (no 2D canvas).");
      ctx = c;
    }
    return ctx;
  };
  return {
    async loadFonts(fonts: Record<string, ExecutionFont>) {
      declared = await declareFonts(doc, fonts, o.readFont);
    },
    measureText(r: MeasureRequest): TextMetrics {
      if (!declared) throw new Error("Fonts must be loaded before measuring.");
      const c = context();
      c.font = `${r.style} ${r.weight} ${r.size}px "${declared.alias(r.family)}"`;
      c.letterSpacing = r.spacing + "px";
      c.wordSpacing = r.wordSpacing + "px";
      c.fontKerning = r.kerning;
      const t = c.measureText(r.text),
        x = c.measureText("x");
      return {
        width: t.width,
        left: t.actualBoundingBoxLeft,
        right: t.actualBoundingBoxRight,
        ascent: t.actualBoundingBoxAscent,
        descent: t.actualBoundingBoxDescent,
        xHeight: x.actualBoundingBoxAscent,
      };
    },
    async decodeImage(png: Uint8Array): Promise<DecodedImage> {
      const url = win.URL.createObjectURL(new win.Blob([png.slice()], { type: "image/png" }));
      try {
        const im = new win.Image();
        im.src = url;
        await im.decode();
        const cv = doc.createElement("canvas");
        cv.width = im.naturalWidth;
        cv.height = im.naturalHeight;
        const g = cv.getContext("2d");
        if (!g) throw new Error("This window cannot decode pictures (no 2D canvas).");
        g.drawImage(im, 0, 0);
        return { w: im.naturalWidth, h: im.naturalHeight, rgba: g.getImageData(0, 0, cv.width, cv.height).data };
      } finally {
        win.URL.revokeObjectURL(url);
      }
    },
    ...(o.warn && { warn: o.warn }),
    ...(o.join && { join: o.join }),
  };
}
