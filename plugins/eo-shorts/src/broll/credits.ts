import type { ShotResult } from "./types.ts";

export interface CreditEntry {
  shotId: string;
  kind: "stock-video" | "photo";
  provider: string;
  title?: string;
  author: string;
  authorUrl?: string;
  pageUrl?: string;
  fileUrl: string;
  license: string;
  licenseUrl?: string;
  text: string;
}

export function creditsFor(results: ShotResult[]): CreditEntry[] {
  const out: CreditEntry[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const p = r.pick;
    if (!p || seen.has(p.sourceKey)) continue;
    seen.add(p.sourceKey);
    out.push({
      shotId: r.id,
      kind: p.kind === "photo" ? "photo" : "stock-video",
      provider: p.provider,
      author: p.author,
      ...(p.authorUrl ? { authorUrl: p.authorUrl } : {}),
      ...(p.pageUrl ? { pageUrl: p.pageUrl } : {}),
      fileUrl: p.fileUrl,
      license: p.license,
      ...(p.licenseUrl ? { licenseUrl: p.licenseUrl } : {}),
      text: p.attribution,
    });
  }
  return out;
}

export function creditsText(entries: CreditEntry[]): string {
  return entries.map((e) => e.text + (e.pageUrl ? " — " + e.pageUrl : "")).join("\n");
}
