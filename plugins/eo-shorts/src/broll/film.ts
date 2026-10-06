import { ensureDir, writeJsonAtomic } from "../host/fs.ts";
import type { HostFs, HostRuntime } from "../host/types.ts";
import { errorMessage } from "../host/util.ts";
import type { CommonsConfig } from "./config.ts";
import type { FetchLike } from "./commons.ts";
import { requestSha, rel, resumableResult, shotDir } from "./files.ts";
import type { CallModelFn } from "./judge.ts";
import { runPersonShots, type PersonShotState } from "./people.ts";
import { searchPlan } from "./request.ts";
import { SearchCache, STOCK_PER, type StockSearchFn } from "./search.ts";
import type { SheetPainter } from "./sheet.ts";
import { runStockShots, type StockShotState } from "./stock.ts";
import type { ShotRequest, ShotResult } from "./types.ts";

export interface BrollDeps {
  fs: HostFs;
  runtime: HostRuntime | null;
  search: StockSearchFn | null;
  callModel: CallModelFn | null;
  painter: SheetPainter;
  fetch: FetchLike | null;
  commons: CommonsConfig;
  estimateCx?: (clipPath: string) => Promise<number | null>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: (e: Record<string, unknown>) => void;
}

export interface BrollOptions {
  jobId: string;
  media: string;
  signal?: AbortSignal;
  budgetMs?: number;
  maxJudgedPerShot?: number;
  retryJudged?: number;
  candidatesPerCall?: number;
  maxImagesPerCall?: number;
  concurrency?: number;
  acceptWeak?: boolean;
}

export const BROLL_DEFAULTS = { budgetMs: 8 * 60_000, maxJudgedPerShot: 4, retryJudged: 2, candidatesPerCall: 2, maxImagesPerCall: 4, concurrency: 3, acceptWeak: true };

export interface BrollRun {
  results: ShotResult[];
  summary: Record<string, unknown>;
}

function stockResult(s: StockShotState, sha: string): ShotResult {
  const calls = [...new Set(s.records.flatMap((r) => (r.call ? [r.call.batch] : [])))];
  const answered = s.records.find((r) => r.call);
  return {
    schema: "shot-result/1",
    id: s.req.id,
    kind: "stock-video",
    requestSha: sha,
    status: s.status ?? "error",
    ...(s.pick ? { pick: s.pick } : {}),
    candidates: s.pool.candidates.length,
    judged: s.records.filter((r) => r.execution.status === "ok").length,
    judge: { provider: answered?.call?.provider ?? "none", model: answered?.call?.model ?? "none", callIds: calls },
    attempts: s.pool.attempts.map((a) => ({ query: a.query, orientation: a.orientation, status: a.status, n: a.n })),
    ...(s.fallback ? { fallback: s.fallback } : {}),
    ...(s.retry ? { retry: s.retry } : {}),
    warnings: s.warnings,
  };
}

function personResult(s: PersonShotState, sha: string): ShotResult {
  const answered = s.records.find((r) => r.call);
  return {
    schema: "shot-result/1",
    id: s.req.id,
    kind: "person",
    requestSha: sha,
    status: s.status ?? "error",
    ...(s.pick ? { pick: s.pick } : {}),
    candidates: s.search?.kept ?? 0,
    judged: s.records.filter((r) => r.execution.status === "ok").length,
    judge: { provider: answered?.call?.provider ?? "none", model: answered?.call?.model ?? "none", callIds: [...new Set(s.records.flatMap((r) => (r.call ? [r.call.batch] : [])))] },
    attempts: s.search ? [{ query: '"' + s.req.person!.name + '" (Wikimedia Commons)', orientation: "any", status: String(s.search.status), n: s.search.kept }] : [],
    ...(s.fallback ? { fallback: s.fallback } : {}),
    ...(s.retry ? { retry: s.retry } : {}),
    warnings: s.warnings,
  };
}

export async function runBroll(requests: ShotRequest[], d: BrollDeps, opts: BrollOptions): Promise<BrollRun> {
  const o = { ...BROLL_DEFAULTS, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) } as Required<BrollOptions>;
  const fs = d.fs;
  const now = d.now ?? (() => Date.now());
  const log = d.log ?? (() => {});
  const t0 = now();
  const deadline = t0 + o.budgetMs;
  const ids = requests.map((r) => r.id);
  if (new Set(ids).size !== ids.length) throw new Error("Shot ids must be unique.");
  await ensureDir(fs, o.media);
  const shas = new Map<string, string>();
  const done = new Map<string, ShotResult>();
  const taken = new Map<string, string>();
  for (const r of requests) {
    const sha = await requestSha(r);
    shas.set(r.id, sha);
    const dir = shotDir(fs, o.media, r.id);
    await ensureDir(fs, dir);
    await writeJsonAtomic(fs, fs.join(dir, "request.json"), r);
    const prev = await resumableResult(fs, o.media, r, sha, { judging: !!d.callModel });
    if (prev) {
      done.set(r.id, prev);
      if (prev.pick) taken.set(prev.pick.sourceKey, r.id);
    }
  }
  const todo = requests.filter((r) => !done.has(r.id));
  const stockReqs = todo.filter((r) => r.kind === "stock-video");
  const personReqs = todo.filter((r) => r.kind === "person");
  log({ type: "broll.start", shots: requests.length, resumed: done.size, stock: stockReqs.length, people: personReqs.length });

  const cache = d.search ? new SearchCache(d.search, { per: STOCK_PER, sleep: d.sleep }) : null;
  let stockShots: StockShotState[] = [];
  let film: Awaited<ReturnType<typeof runStockShots>> | null = null;
  if (stockReqs.length && cache) {
    film = await runStockShots(stockReqs, cache, { fs, runtime: d.runtime, painter: d.painter, callModel: d.callModel, estimateCx: d.estimateCx, now, log }, {
      jobId: o.jobId,
      media: o.media,
      signal: o.signal,
      deadline,
      maxJudged: o.maxJudgedPerShot,
      retryJudged: o.retryJudged,
      candidatesPerCall: o.candidatesPerCall,
      maxImages: o.maxImagesPerCall,
      concurrency: o.concurrency,
      acceptWeak: o.acceptWeak,
    }, taken);
    stockShots = film.shots;
  }
  const personTaken = new Set([...taken.keys()].filter((k) => k.startsWith("commons:")));
  const people = personReqs.length
    ? await runPersonShots(personReqs, { fs, painter: d.painter, callModel: d.callModel, fetch: d.fetch, commons: d.commons, now, sleep: d.sleep, log }, { jobId: o.jobId, media: o.media, signal: o.signal, deadline, acceptWeak: o.acceptWeak, taken: personTaken })
    : [];

  const results: ShotResult[] = [];
  for (const r of requests) {
    const sha = shas.get(r.id)!;
    const dir = shotDir(fs, o.media, r.id);
    let res = done.get(r.id);
    if (!res) {
      const s = stockShots.find((x) => x.req.id === r.id);
      const p = people.find((x) => x.req.id === r.id);
      if (s) {
        res = stockResult(s, sha);
        const evidence = await Promise.all(s.pool.candidates.map(async (c) => {
          const e = await film?.evidenceOf(c.source.key);
          return e ? { status: e.status, code: e.code, sheets: e.sheets.map((x) => rel(fs, o.media, x)), timestamps: e.timestamps, durationSeconds: e.durationSeconds, fingerprint: e.fingerprint ?? null, family: film?.familyOf.get(c.source.key) ?? null } : null;
        }));
        await writeJsonAtomic(fs, fs.join(dir, "candidates.json"), {
          searches: s.pool.attempts,
          plan: searchPlan(r),
          pool: s.pool.candidates.map((c, i) => ({ sourceKey: c.source.key, provider: c.source.provider, pageUrl: c.source.pageUrl, author: c.video.authorName, duration: c.video.duration, width: c.video.width, height: c.video.height, orientation: c.orientation, foundBy: c.foundBy, skip: c.skip ?? null, tried: s.tried.includes(c.source.key), evidence: evidence[i] })),
        });
        await writeJsonAtomic(fs, fs.join(dir, "judge.json"), { records: s.records });
        await writeJsonAtomic(fs, fs.join(dir, "pick.json"), { option: s.option, lostTo: s.lostTo, pick: s.pick ?? null, status: res.status, fallback: s.fallback ?? null, retry: s.retry ?? null, rounds: s.rounds, evidenceErrors: s.evidenceErrors });
      } else if (p) {
        res = personResult(p, sha);
        await writeJsonAtomic(fs, fs.join(dir, "candidates.json"), { search: p.search ?? null, photos: p.photos.map((x) => ({ ...x.photo, evidence: x.evidence ? { status: x.evidence.status, sheets: x.evidence.sheets.map((y) => rel(fs, o.media, y)) } : null, error: x.error ?? null })) });
        await writeJsonAtomic(fs, fs.join(dir, "judge.json"), { records: p.records });
        await writeJsonAtomic(fs, fs.join(dir, "pick.json"), { pick: p.pick ?? null, status: res.status, fallback: p.fallback ?? null, retry: p.retry ?? null, record: p.record ?? null });
      } else {
        res = {
          schema: "shot-result/1", id: r.id, kind: r.kind, requestSha: sha, status: "error", candidates: 0, judged: 0,
          judge: { provider: "none", model: "none", callIds: [] }, attempts: [],
          fallback: r.kind === "stock-video" ? "this Selects build has no stock search" : "not run", warnings: [],
        };
      }
      await writeJsonAtomic(fs, fs.join(dir, "result.json"), res);
    }
    results.push(res);
  }

  const asked = stockShots.reduce((n, s) => n + s.pool.attempts.length, 0);
  const cacheHits = stockShots.reduce((n, s) => n + s.pool.attempts.filter((a) => a.status === "cached").length, 0);
  const lost = stockShots.reduce((n, s) => n + s.lostTo.length, 0);
  const families = film ? [...film.familyOf.entries()].filter(([k, f]) => k !== f).length : 0;
  const summary = {
    schema: "broll-run/1",
    jobId: o.jobId,
    startedAt: new Date(t0).toISOString(),
    ms: now() - t0,
    budgetMs: o.budgetMs,
    shots: results.map((r) => ({ id: r.id, kind: r.kind, status: r.status, source: r.pick?.sourceKey ?? null, fit: r.pick?.fit ?? null, preference: r.pick?.preference ?? null, fallback: r.fallback ?? null, retry: r.retry?.code ?? null, resumed: done.has(r.id) })),
    search: cache ? { ...cache.stats(), searchesAsked: asked, cacheHits, sent: cache.sent } : null,
    judge: film ? { calls: film.judgeCalls, failedCalls: film.judgeFailures, pairsJudged: stockShots.reduce((n, s) => n + s.records.length, 0) } : null,
    dedup: {
      sourcesUsedOnce: new Set(results.flatMap((r) => (r.pick ? [r.pick.sourceKey] : []))).size === results.filter((r) => r.pick).length,
      picksLostToOtherShots: lost,
      nearDuplicateSources: families,
    },
    errors: results.filter((r) => r.status === "error").map((r) => ({ id: r.id, why: r.fallback ?? "" })),
    retry: results.filter((r) => r.status === "error" || r.retry).map((r) => ({ id: r.id, code: r.retry?.code ?? "error", why: r.retry?.reason ?? r.fallback ?? "" })),
  };
  try {
    await writeJsonAtomic(fs, fs.join(o.media, "broll.json"), summary);
  } catch (e) {
    log({ type: "broll.warn", message: "could not write broll.json: " + errorMessage(e) });
  }
  log({ type: "broll.done", ms: summary.ms, shots: summary.shots });
  return { results, summary };
}
