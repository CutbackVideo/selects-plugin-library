export const SHEET_RULES = { columns: 4, perSheet: 16, maxSide: 1568, label: 24, gap: 4, quality: 0.85, frameMaxSide: 640 } as const;

export interface SheetLayout {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  label: number;
  gap: number;
  cells: { x: number; y: number }[];
}

export function sheetLayout(count: number, frameW: number, frameH: number, o: Partial<typeof SHEET_RULES> = {}): SheetLayout {
  const r = { ...SHEET_RULES, ...o };
  if (!(count >= 1) || !(frameW > 0) || !(frameH > 0)) throw new RangeError("sheet needs at least one frame of a known size");
  const columns = Math.min(r.columns, count);
  const rows = Math.ceil(count / columns);
  const aspect = frameW / frameH;
  let tileWidth = Math.min(r.frameMaxSide, Math.floor((r.maxSide - (columns - 1) * r.gap) / columns));
  let tileHeight = Math.round(tileWidth / aspect);
  const maxTileHeight = Math.floor((r.maxSide - (rows - 1) * r.gap) / rows) - r.label;
  if (tileHeight > maxTileHeight) {
    tileHeight = maxTileHeight;
    tileWidth = Math.floor(tileHeight * aspect);
  }
  const cells: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i += 1) cells.push({ x: (i % columns) * (tileWidth + r.gap), y: Math.floor(i / columns) * (tileHeight + r.label + r.gap) });
  return {
    width: columns * tileWidth + (columns - 1) * r.gap,
    height: rows * (tileHeight + r.label) + (rows - 1) * r.gap,
    tileWidth,
    tileHeight,
    columns,
    rows,
    label: r.label,
    gap: r.gap,
    cells,
  };
}

export function frameLabel(index: number, t: number): string {
  return "#" + index + "  " + t.toFixed(2) + " s";
}

export function sheetChunks(n: number, perSheet: number = SHEET_RULES.perSheet): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < n; i += perSheet) out.push(Array.from({ length: Math.min(perSheet, n - i) }, (_, k) => i + k));
  return out;
}

export interface SheetPainter {
  paintSheet(frames: Uint8Array[], labels: string[], layout: SheetLayout, quality: number): Promise<Uint8Array>;
  fingerprint(frame: Uint8Array): Promise<string>;
  resizeStill(bytes: Uint8Array, mime: string, maxSide: number, quality: number): Promise<{ bytes: Uint8Array; width: number; height: number }>;
  imageSize(bytes: Uint8Array, mime: string): Promise<{ width: number; height: number }>;
}

export function hammingHex(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

export function dHashFromGray(gray: ArrayLike<number>): string {
  if (gray.length !== 72) throw new RangeError("dHash needs 9x8 gray values");
  let hex = "";
  for (let y = 0; y < 8; y += 1) {
    let byte = 0;
    for (let x = 0; x < 8; x += 1) byte = (byte << 1) | (gray[y * 9 + x] > gray[y * 9 + x + 1] ? 1 : 0);
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

async function toJpeg(c: AnyCanvas, quality: number): Promise<Uint8Array> {
  const blob =
    "convertToBlob" in c
      ? await c.convertToBlob({ type: "image/jpeg", quality })
      : await new Promise<Blob>((resolve, reject) => (c as HTMLCanvasElement).toBlob((b) => (b ? resolve(b) : reject(new Error("canvas encode failed"))), "image/jpeg", quality));
  return new Uint8Array(await blob.arrayBuffer());
}

async function decode(bytes: Uint8Array, mime = "image/jpeg"): Promise<ImageBitmap> {
  return createImageBitmap(new Blob([bytes as BlobPart], { type: mime }));
}

export function canvasPainter(): SheetPainter {
  return {
    async paintSheet(frames, labels, layout, quality) {
      const c = makeCanvas(layout.width, layout.height);
      const g = c.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
      g.fillStyle = "#181818";
      g.fillRect(0, 0, layout.width, layout.height);
      g.font = "bold " + Math.round(layout.label * 0.72) + "px sans-serif";
      g.textBaseline = "middle";
      for (let i = 0; i < frames.length; i += 1) {
        const bmp = await decode(frames[i]);
        const { x, y } = layout.cells[i];
        const s = Math.min(layout.tileWidth / bmp.width, layout.tileHeight / bmp.height);
        const w = Math.round(bmp.width * s);
        const h = Math.round(bmp.height * s);
        g.drawImage(bmp, x + Math.floor((layout.tileWidth - w) / 2), y + Math.floor((layout.tileHeight - h) / 2), w, h);
        bmp.close();
        g.fillStyle = "#ffffff";
        g.fillText(labels[i] ?? "", x + 6, y + layout.tileHeight + layout.label / 2);
        g.fillStyle = "#181818";
      }
      return toJpeg(c, quality);
    },
    async fingerprint(frame) {
      const bmp = await decode(frame);
      const c = makeCanvas(9, 8);
      const g = c.getContext("2d", { willReadFrequently: true } as any) as CanvasRenderingContext2D;
      g.drawImage(bmp, 0, 0, 9, 8);
      bmp.close();
      const d = g.getImageData(0, 0, 9, 8).data;
      const gray: number[] = [];
      for (let i = 0; i < 72; i += 1) gray.push(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
      return dHashFromGray(gray);
    },
    async resizeStill(bytes, mime, maxSide, quality) {
      const bmp = await decode(bytes, mime);
      const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * s));
      const h = Math.max(1, Math.round(bmp.height * s));
      const c = makeCanvas(w, h);
      const g = c.getContext("2d") as CanvasRenderingContext2D;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      g.drawImage(bmp, 0, 0, w, h);
      bmp.close();
      return { bytes: await toJpeg(c, quality), width: w, height: h };
    },
    async imageSize(bytes, mime) {
      const bmp = await decode(bytes, mime);
      const out = { width: bmp.width, height: bmp.height };
      bmp.close();
      return out;
    },
  };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) s += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(s);
}

export function base64Chars(byteLength: number): number {
  return 4 * Math.ceil(byteLength / 3);
}
