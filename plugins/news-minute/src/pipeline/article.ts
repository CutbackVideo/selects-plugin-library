// Article text and photos from a news page (Arc XP Fusion first, which Chosun uses; then JSON-LD; then <p>).
// Text handling follows medical-explainer's medExtractArticle; photos are new.

// context: the article paragraph right before the image (none for the lead image), so a graphic whose caption
// is only a credit line still says what it is about.
export type ArticlePhoto = { ref: string; url: string; caption: string; credit: string; w: number; h: number; context?: string };
export type Article = {
  url: string;
  title: string;
  source: string;
  date: string;
  body: string;
  method: string;
  photos: ArticlePhoto[];
};

const asObj = (v: any) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const len = (s: string) => [...String(s ?? "")].length;

export function unescapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
export const stripTags = (s: string) => unescapeHtml(String(s ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function metaTag(s: string, prop: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop.replace(/[.:]/g, "\\$&")}["'][^>]*>`, "i");
  const m = re.exec(s);
  if (!m) return "";
  const c = /content=["']([^"']*)["']/i.exec(m[0]);
  return c ? unescapeHtml(c[1]).trim() : "";
}

// Caption credit: "(... /Yonhap)" style trailers. Arc credits.by names win when present.
function creditOf(e: any): string {
  const by = Array.isArray(asObj(e.credits).by) ? e.credits.by.map((b: any) => String(asObj(b).name || "").trim()).filter(Boolean) : [];
  if (by.length) return by.join(", ");
  const cap = stripTags(e.caption || "");
  const m = /\/\s*([^/]{1,30})$/.exec(cap);
  return m ? m[1].trim() : "";
}

const CONTEXT_MAX_CHARS = 300;
const contextOf = (p: string) => (p ? [...p].slice(0, CONTEXT_MAX_CHARS).join("") : undefined);

export function extractArticle(url: string, html: string): Article {
  const s = String(html ?? "");
  const t = /<title>(.*?)<\/title>/s.exec(s);
  const art: Article = {
    url,
    title: metaTag(s, "og:title") || stripTags(t ? t[1] : ""),
    source: metaTag(s, "og:site_name"),
    date: metaTag(s, "article:published_time"),
    body: "",
    method: "",
    photos: [],
  };
  const photos: Array<Omit<ArticlePhoto, "ref">> = [];
  const m = /Fusion\.globalContent\s*=\s*(\{.*?\});\s*Fusion\./s.exec(s);
  if (m) {
    let d: any = null;
    try { d = JSON.parse(m[1]); } catch { d = null; }
    const els: any[] = d && Array.isArray(d.content_elements) ? d.content_elements : [];
    const paras = els.filter((e) => asObj(e).type === "text").map((e) => stripTags(e.content || "")).filter(Boolean);
    if (paras.length) {
      art.body = paras.join("\n");
      art.title = asObj(d.headlines).basic || art.title;
      art.date = d.display_date || d.first_publish_date || art.date;
      art.method = "arc";
    }
    const promo = asObj(asObj(d?.promo_items).basic);
    let before = "";
    for (const e of [promo, ...els]) {
      if (e !== promo && asObj(e).type === "text") { const t = stripTags(e.content || ""); if (t) before = t; continue; }
      if (asObj(e).type !== "image" || typeof e.url !== "string" || !/^https:\/\//.test(e.url)) continue;
      if (photos.some((p) => p.url === e.url)) continue;
      photos.push({ url: e.url, caption: stripTags(e.caption || ""), credit: creditOf(e), w: Number(e.width) || 0, h: Number(e.height) || 0, context: contextOf(before) });
    }
  }
  if (!art.body) {
    for (const bm of s.matchAll(/<script[^>]+application\/ld\+json[^>]*>(.*?)<\/script>/gs)) {
      let d: any;
      try { d = JSON.parse(bm[1].trim()); } catch { continue; }
      const items = Array.isArray(d) ? d : d && typeof d === "object" ? (d["@graph"] !== undefined ? d["@graph"] : [d]) : [];
      for (const it of Array.isArray(items) ? items : []) {
        if (!(it && typeof it === "object" && String(it["@type"] || "").includes("Article"))) continue;
        if (it.articleBody && !art.body) { art.body = stripTags(it.articleBody); art.title = it.headline || art.title; art.method = "jsonld"; }
      }
    }
  }
  // Daum news (and other Kakao-hosted copies): paragraphs and figures carry dmcf attributes.
  if (!art.body && /dmcf-ptype=/.test(s)) {
    const paras: string[] = [];
    let before = "";
    // Paragraphs and images in page order, so each image gets the paragraph right before it.
    for (const x of s.matchAll(/<p[^>]*dmcf-ptype="general"[^>]*>(.*?)<\/p>|<img[^>]*dmcf-mtype="image"[^>]*>/gs)) {
      if (x[1] !== undefined) { const t = stripTags(x[1]); if (t) { paras.push(t); before = t; } continue; }
      const im = x;
      const src = /data-org-src="([^"]+)"/.exec(im[0]);
      if (!src || !/^https:\/\//.test(src[1]) || photos.some((p) => p.url === src[1])) continue;
      const alt = /alt="([^"]*)"/.exec(im[0]);
      const w = /data-org-width="(\d+)"/.exec(im[0]);
      const caption = alt ? unescapeHtml(alt[1]).trim() : "";
      const credit = /([^\s.]+(?:DB|\uB274\uC2A4|\uC81C\uACF5))\.?$/.exec(caption);
      photos.push({ url: src[1], caption, credit: credit ? credit[1] : "", w: w ? Number(w[1]) : 0, h: 0, context: contextOf(before) });
    }
    if (paras.length) { art.body = paras.join("\n"); art.method = "dmcf"; }
  }
  if (!art.body) {
    const sc = /<article[^>]*>(.*?)<\/article>/s.exec(s);
    const paras = [...(sc ? sc[1] : s).matchAll(/<p[^>]*>(.*?)<\/p>/gs)].map((x) => stripTags(x[1]));
    art.body = paras.filter((p) => len(p) > 40).join("\n");
    art.method = "paragraphs";
  }
  if (!photos.length) {
    const og = metaTag(s, "og:image");
    if (/^https:\/\//.test(og)) photos.push({ url: og, caption: "", credit: "", w: 0, h: 0 });
  }
  art.body = [...art.body].slice(0, 20000).join("");
  art.photos = photos.slice(0, 8).map((p, i) => ({ ref: `photo-${i + 1}`, ...p }));
  return art;
}

// Pasted text: the first line is the title.
export function articleFromText(text: string): Article {
  const body = String(text ?? "").trim();
  const first = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0] || "";
  return { url: "", title: [...first].slice(0, 120).join(""), source: "", date: "", body: [...body].slice(0, 20000).join(""), method: "text", photos: [] };
}

// Page bytes as text: UTF-8, or EUC-KR when the page says so in its first bytes.
export function decodeHtml(bytes: Uint8Array): string {
  let head = "";
  for (let i = 0; i < Math.min(bytes.length, 4096); i++) head += String.fromCharCode(bytes[i]);
  const m = /charset\s*=\s*["']?\s*([\w-]+)/i.exec(head);
  const cs = m ? m[1].toLowerCase() : "utf-8";
  if (/^(euc-kr|ks_c_5601-1987|cp949|x-windows-949|ms949)$/.test(cs)) {
    try { return new TextDecoder("euc-kr").decode(bytes); } catch { /* fall through to UTF-8 */ }
  }
  return new TextDecoder().decode(bytes);
}
