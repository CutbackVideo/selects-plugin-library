import { isAvoided, largestCropHeight, MIN_CROP_HEIGHT, evidenceRendition, orientationOf, sourceIdentity } from "./source.ts";
import { normalizeQuery, searchPlan, type PlannedSearch } from "./request.ts";
import type { Orientation, PoolCandidate, SearchAttempt, ShotRequest, StockVideo } from "./types.ts";

export type StockSearchFn = (q: { query: string; per?: number; page?: number; orientation?: Orientation; signal?: AbortSignal }) => Promise<StockVideo[]>;

export function hostStockSearch(di: Record<string, any> | null | undefined): StockSearchFn | null {
  const s = di?.StockMediaSearch;
  if (!s || typeof s.searchVideos !== "function") return null;
  return (q) => s.searchVideos(q);
}

export const STOCK_PER = 3;
export const MAX_SOURCE_SECONDS = 30;

export interface SearchCacheOptions {
  per?: number;
  sleep?: (ms: number) => Promise<void>;
  retryDelayMs?: number;
}

export class SearchCache {
  private entries = new Map<string, Promise<{ rows: StockVideo[]; status: "ok" | "empty" | "error"; error?: string }>>();
  readonly sent: { query: string; orientation: Orientation; page: number; ms: number; n: number; status: string }[] = [];
  private per: number;
  private search: StockSearchFn;
  private o: SearchCacheOptions;
  constructor(search: StockSearchFn, o: SearchCacheOptions = {}) {
    this.search = search;
    this.o = o;
    this.per = o.per ?? STOCK_PER;
  }

  static key(query: string, orientation: Orientation, page = 1, per = STOCK_PER): string {
    return [normalizeQuery(query), orientation, page, per].join("|");
  }

  async run(query: string, orientation: Orientation, page = 1, signal?: AbortSignal): Promise<{ rows: StockVideo[]; status: "ok" | "empty" | "error"; error?: string; cached: boolean }> {
    const k = SearchCache.key(query, orientation, page, this.per);
    const hit = this.entries.get(k);
    if (hit) return { ...(await hit), cached: true };
    const p = this.fetch(normalizeQuery(query), orientation, page, signal);
    this.entries.set(k, p);
    return { ...(await p), cached: false };
  }

  private async fetch(query: string, orientation: Orientation, page: number, signal?: AbortSignal) {
    const sleep = this.o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    let last: { rows: StockVideo[]; status: "ok" | "empty" | "error"; error?: string } = { rows: [], status: "empty" };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt) await sleep(this.o.retryDelayMs ?? 1500);
      const t0 = Date.now();
      try {
        const rows = await this.search({ query, per: this.per, page, orientation, signal });
        last = Array.isArray(rows) && rows.length ? { rows, status: "ok" } : { rows: [], status: "empty" };
      } catch (e) {
        if (signal?.aborted) throw e;
        last = { rows: [], status: "error", error: String((e as Error)?.message ?? e).slice(0, 200) };
      }
      this.sent.push({ query, orientation, page, ms: Date.now() - t0, n: last.rows.length, status: last.status });
      if (last.status === "ok") break;
    }
    return last;
  }

  stats() {
    return { distinctSearches: this.entries.size, requestsSent: this.sent.length };
  }
}

export function eligibility(v: StockVideo, r: ShotRequest, taken: Set<string>): PoolCandidate["skip"] | null {
  const key = sourceIdentity(v).key;
  if (isAvoided(v, r.avoidSources)) return { code: "avoided", reason: "the film already uses this source" };
  if (taken.has(key)) return { code: "taken", reason: "another shot of this film picked this source" };
  if (!(v.duration > 0) || v.duration > MAX_SOURCE_SECONDS + 0.5) return { code: "duration_limit", reason: "source is " + v.duration + " s; the judge takes at most " + MAX_SOURCE_SECONDS + " s" };
  if (v.duration < r.minUsableSeconds) return { code: "too_short", reason: "source is " + v.duration + " s; the shot needs " + r.minUsableSeconds + " s" };
  if (!evidenceRendition(v)) return { code: "no_rendition", reason: "no downloadable rendition" };
  if (largestCropHeight(v) < MIN_CROP_HEIGHT) return { code: "low_resolution", reason: "largest rendition gives a " + Math.round(largestCropHeight(v)) + " px tall 9:16 window" };
  return null;
}

export interface PoolOptions {
  want: number;
  maxRound: number;
  taken?: Set<string>;
  signal?: AbortSignal;
}

export interface ShotPool {
  candidates: PoolCandidate[];
  attempts: SearchAttempt[];
  next: number;
}

export async function buildPool(r: ShotRequest, cache: SearchCache, o: PoolOptions, prior?: ShotPool): Promise<ShotPool> {
  const plan: PlannedSearch[] = searchPlan(r);
  const pool: ShotPool = prior ? { candidates: prior.candidates.slice(), attempts: prior.attempts.slice(), next: prior.next } : { candidates: [], attempts: [], next: 0 };
  const taken = o.taken ?? new Set<string>();
  const have = new Set(pool.candidates.map((c) => c.source.key));
  const eligible = () => pool.candidates.filter((c) => !c.skip).length;
  while (pool.next < plan.length) {
    const s = plan[pool.next];
    if (s.round > o.maxRound) break;
    if (eligible() >= o.want) break;
    pool.next += 1;
    const res = await cache.run(s.query, s.orientation, 1, o.signal);
    pool.attempts.push({ query: s.query, orientation: s.orientation, page: 1, role: s.role, round: s.round, status: res.cached ? "cached" : res.status, outcome: res.status, n: res.rows.length, ...(res.error ? { error: res.error } : {}) });
    res.rows.forEach((v, rank) => {
      const source = sourceIdentity(v);
      if (have.has(source.key)) return;
      have.add(source.key);
      const skip = eligibility(v, r, taken);
      pool.candidates.push({ source, video: v, orientation: orientationOf(v.width, v.height), foundBy: { query: s.query, orientation: s.orientation, role: s.role, rank, round: s.round }, ...(skip ? { skip } : {}) });
    });
  }
  return pool;
}

export function judgingOrder(pool: PoolCandidate[], prefer: Orientation): PoolCandidate[] {
  return pool
    .map((c, i) => [c, i] as const)
    .filter(([c]) => !c.skip)
    .sort((a, b) => Number(a[0].orientation !== prefer) - Number(b[0].orientation !== prefer) || a[1] - b[1])
    .map(([c]) => c);
}
