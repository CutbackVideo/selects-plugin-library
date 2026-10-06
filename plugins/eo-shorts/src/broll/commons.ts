import type { CommonsConfig } from "./config.ts";
import { commonsUserAgent } from "./config.ts";

export type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; headers?: { get(name: string): string | null }; json(): Promise<any>; arrayBuffer(): Promise<ArrayBuffer> }>;

const EXT_FIELDS = ["LicenseShortName", "License", "LicenseUrl", "UsageTerms", "Artist", "Credit", "ImageDescription", "ObjectName", "Restrictions", "NonFree", "AttributionRequired", "DateTimeOriginal"];

export function commonsSearchUrl(c: CommonsConfig, name: string): string {
  const q = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: '"' + name.replace(/"/g, "") + '" filetype:bitmap',
    gsrlimit: String(c.searchLimit),
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(c.thumbWidth),
    iiextmetadatafilter: EXT_FIELDS.join("|"),
    iiextmetadatalanguage: "en",
  });
  return c.apiUrl + "?" + q.toString();
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function htmlText(v: unknown): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

type Ext = Record<string, { value?: unknown } | undefined>;
const ext = (m: Ext | undefined, k: string) => htmlText(m?.[k]?.value);

export interface LicenseVerdict {
  ok: boolean;
  license: string;
  licenseUrl: string | null;
  reason: string;
}

export function licenseGate(m: Ext | undefined): LicenseVerdict {
  const code = ext(m, "License").toLowerCase();
  const short = ext(m, "LicenseShortName");
  const url = ext(m, "LicenseUrl") || null;
  const label = short || code || "unknown";
  if (/^true$/i.test(ext(m, "NonFree"))) return { ok: false, license: label, licenseUrl: url, reason: "marked non-free" };
  const refuse = /(^|[-\s])(sa|nc|nd)([-\s]|$)|gfdl|fair|non-?free|copyrighted free use|attribution only/i;
  if (refuse.test(code) || refuse.test(short)) return { ok: false, license: label, licenseUrl: url, reason: "license " + label + " is not CC0, public domain or CC BY" };
  if (code) {
    if (/^cc0(-1\.0)?$/.test(code)) return { ok: true, license: short || "CC0", licenseUrl: url, reason: "CC0" };
    if (/^pd($|-)/.test(code)) return { ok: true, license: short || "Public domain", licenseUrl: url, reason: "public domain" };
    if (/^cc-by-(2\.0|2\.5|3\.0|4\.0)(-[a-z]{2,3})?$/.test(code)) return { ok: true, license: short || code.toUpperCase(), licenseUrl: url, reason: "CC BY" };
    return { ok: false, license: label, licenseUrl: url, reason: "license " + label + " is not on the allowed list" };
  }
  if (/^cc0\b/i.test(short)) return { ok: true, license: short, licenseUrl: url, reason: "CC0" };
  if (/^public domain$/i.test(short)) return { ok: true, license: short, licenseUrl: url, reason: "public domain" };
  if (/^cc by (2\.0|2\.5|3\.0|4\.0)$/i.test(short)) return { ok: true, license: short, licenseUrl: url, reason: "CC BY" };
  return { ok: false, license: label, licenseUrl: url, reason: "no recognisable license" };
}

export function nameKey(s: string): string {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function namesPerson(title: string, m: Ext | undefined, name: string): boolean {
  const want = nameKey(name);
  if (!want) return false;
  const hay = " " + nameKey([title.replace(/^File:/i, "").replace(/\.[a-z0-9]+$/i, ""), ext(m, "ObjectName"), ext(m, "ImageDescription")].join(" ")) + " ";
  return hay.includes(" " + want + " ");
}

export interface CommonsPhoto {
  pageId: number;
  title: string;
  pageUrl: string;
  fileUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  mime: string;
  author: string;
  credit: string;
  license: string;
  licenseUrl: string | null;
  attribution: string;
  restrictions: string | null;
  description: string;
  date: string | null;
  searchRank: number;
}

export interface CommonsCandidates {
  kept: CommonsPhoto[];
  refused: { title: string; reason: string }[];
}

export function readCommonsAnswer(answer: any, name: string, c: CommonsConfig): CommonsCandidates {
  const pages: any[] = Array.isArray(answer?.query?.pages) ? answer.query.pages : Object.values(answer?.query?.pages ?? {});
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const kept: CommonsPhoto[] = [];
  const refused: CommonsCandidates["refused"] = [];
  for (const p of pages) {
    const title = String(p.title ?? "");
    const info = p.imageinfo?.[0];
    if (!info) {
      refused.push({ title, reason: "no image info" });
      continue;
    }
    if (!/^image\/(jpeg|png|webp)$/i.test(String(info.mime))) {
      refused.push({ title, reason: "type " + info.mime });
      continue;
    }
    if (!(info.width >= c.minWidth)) {
      refused.push({ title, reason: "only " + info.width + " px wide" });
      continue;
    }
    const m = info.extmetadata as Ext | undefined;
    const lic = licenseGate(m);
    if (!lic.ok) {
      refused.push({ title, reason: lic.reason });
      continue;
    }
    if (!namesPerson(title, m, name)) {
      refused.push({ title, reason: "title and description do not name " + name });
      continue;
    }
    const author = ext(m, "Artist") || ext(m, "Credit") || "Unknown author";
    kept.push({
      pageId: Number(p.pageid),
      title,
      pageUrl: String(info.descriptionurl ?? ""),
      fileUrl: String(info.url ?? ""),
      thumbUrl: String(info.thumburl || info.url || ""),
      width: Number(info.width),
      height: Number(info.height),
      mime: String(info.mime),
      author,
      credit: ext(m, "Credit"),
      license: lic.license,
      licenseUrl: lic.licenseUrl,
      attribution: author + ", " + lic.license + ", via Wikimedia Commons, modified",
      restrictions: ext(m, "Restrictions") || null,
      description: ext(m, "ImageDescription").slice(0, 300),
      date: ext(m, "DateTimeOriginal") || null,
      searchRank: kept.length + refused.length,
    });
  }
  return { kept, refused };
}

type HttpAnswer = Awaited<ReturnType<FetchLike>>;

async function withRetry(f: () => Promise<HttpAnswer>, sleep: (ms: number) => Promise<void>, tries = 3): Promise<HttpAnswer> {
  let last: HttpAnswer | null = null;
  for (let i = 0; i < tries; i += 1) {
    last = await f();
    if (last.ok || (last.status !== 429 && last.status < 500)) return last;
    const ra = Number(last.headers?.get?.("retry-after"));
    if (i < tries - 1) await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(30, ra) * 1000 : 4000 * (i + 1));
  }
  return last!;
}

export interface CommonsDeps {
  fetch: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
}

export async function searchCommons(name: string, c: CommonsConfig, d: CommonsDeps): Promise<CommonsCandidates & { url: string; status: number }> {
  const url = commonsSearchUrl(c, name);
  const sleep = d.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const res = await withRetry(() => d.fetch(url, { headers: { "Api-User-Agent": commonsUserAgent(c) }, signal: d.signal }), sleep);
  if (!res.ok) return { kept: [], refused: [], url, status: res.status };
  return { ...readCommonsAnswer(await res.json(), name, c), url, status: res.status };
}

export async function fetchPhoto(p: CommonsPhoto, d: CommonsDeps): Promise<{ bytes: Uint8Array; mime: string }> {
  const sleep = d.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const res = await withRetry(() => d.fetch(p.thumbUrl, { signal: d.signal }), sleep);
  if (!res.ok) throw new Error("Commons returned HTTP " + res.status + " for " + p.title);
  const mime = res.headers?.get?.("content-type")?.split(";")[0]?.trim() || p.mime;
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime };
}

export function blobUrl(bytes: Uint8Array, mime: string): string {
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
}
