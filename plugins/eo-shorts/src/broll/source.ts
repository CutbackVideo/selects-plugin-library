import type { Orientation, SourceIdentity, StockVideo, StockVideoFile } from "./types.ts";

const PEXELS = /^https?:\/\/(?:videos|images)\.pexels\.com\/(?:video-files|videos)\/(\d+)\//i;
const PIXABAY = /^https?:\/\/cdn\.pixabay\.com\/video\/\d{4}\/\d{2}\/\d{2}\/(\d+)(?:-\d+)?_/i;

export function providerLabel(serviceName: string, url = ""): string {
  if (/^pex/i.test(serviceName) || PEXELS.test(url)) return "Pexels";
  if (/^pixa/i.test(serviceName) || PIXABAY.test(url)) return "Pixabay";
  return serviceName || "stock";
}

function normalizeUrl(u: string): string {
  try {
    const x = new URL(u);
    return (x.host + x.pathname).toLowerCase();
  } catch {
    return String(u || "").split("?")[0].toLowerCase();
  }
}

export function sourceIdentity(v: StockVideo): SourceIdentity {
  const urls = [v.originalUrl, ...(v.files ?? []).map((f) => f.url), v.previewUrl].filter(Boolean);
  for (const u of urls) {
    const m = u.match(PEXELS);
    if (m) {
      return { key: "pexels:" + m[1], provider: "Pexels", nativeId: m[1], pageUrl: "https://www.pexels.com/video/" + m[1] + "/", license: "Pexels License", licenseUrl: "https://www.pexels.com/license/" };
    }
    const p = u.match(PIXABAY);
    if (p) {
      return { key: "pixabay:" + p[1], provider: "Pixabay", nativeId: p[1], pageUrl: "https://pixabay.com/videos/id-" + p[1] + "/", license: "Pixabay Content License", licenseUrl: "https://pixabay.com/service/license-summary/" };
    }
  }
  return { key: "url:" + normalizeUrl(v.originalUrl), provider: providerLabel(v.serviceName, v.originalUrl), nativeId: null, pageUrl: null, license: "Provider license", licenseUrl: null };
}

export function sourceAliases(v: StockVideo): string[] {
  const id = sourceIdentity(v);
  return [id.key, ...(id.pageUrl ? [id.pageUrl] : []), v.originalUrl, ...(v.files ?? []).map((f) => f.url)].filter(Boolean);
}

export function isAvoided(v: StockVideo, avoid: Iterable<string>): boolean {
  const set = new Set([...avoid].map((a) => (/^https?:/i.test(a) ? normalizeUrl(a) : a)));
  return sourceAliases(v).some((a) => set.has(/^https?:/i.test(a) ? normalizeUrl(a) : a));
}

export function renditions(v: StockVideo): StockVideoFile[] {
  const files = (v.files ?? []).filter((f) => f && f.url && f.width > 0 && f.height > 0);
  const list = files.length ? files.slice() : v.originalUrl ? [{ url: v.originalUrl, width: v.width, height: v.height }] : [];
  return list.sort((a, b) => a.width * a.height - b.width * b.height);
}

export function orientationOf(w: number, h: number): Orientation {
  return h > w ? "portrait" : "landscape";
}

export const EVIDENCE_MIN_SHORT_SIDE = 540;

export function evidenceRendition(v: StockVideo): StockVideoFile | null {
  const list = renditions(v);
  return list.find((f) => Math.min(f.width, f.height) >= EVIDENCE_MIN_SHORT_SIDE) ?? list[list.length - 1] ?? null;
}

export function cropWidth(w: number, h: number, target = { width: 1080, height: 1920 }): number {
  const ar = target.width / target.height;
  return w / h > ar ? h * ar : w;
}

export function cropHeight(w: number, h: number, target = { width: 1080, height: 1920 }): number {
  const ar = target.width / target.height;
  return w / h > ar ? h : w / ar;
}

export function cutRendition(v: StockVideo, target = { width: 1080, height: 1920 }): StockVideoFile | null {
  const list = renditions(v);
  return list.find((f) => cropWidth(f.width, f.height, target) >= target.width) ?? list[list.length - 1] ?? null;
}

export const MIN_CROP_HEIGHT = 1080;

export function largestCropHeight(v: StockVideo): number {
  const list = renditions(v);
  const f = list[list.length - 1];
  return f ? cropHeight(f.width, f.height) : 0;
}
