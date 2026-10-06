import type { HostFs, HostRuntime } from "../host/types.ts";
import { errorMessage, hashJson } from "../host/util.ts";
import { assignSources, FamilyIndex, rankOptions, type ShotOption } from "./assign.ts";
import { cutClip, cutWindow, fallbackWindow } from "./cut.ts";
import { prepareVideoEvidence } from "./evidence.ts";
import { shotDir, stockEvidenceDir } from "./files.ts";
import { judgeItems, mapLimit, transientJudgeCode, type CallModelFn, type JudgeItem, type JudgeOutcome } from "./judge.ts";
import { requestText } from "./request.ts";
import { buildPool, judgingOrder, SearchCache, type ShotPool } from "./search.ts";
import { hammingHex, type SheetPainter } from "./sheet.ts";
import { cropHeight, cutRendition, evidenceRendition } from "./source.ts";
import { selectCandidates } from "./verdict.ts";
import type { Evidence, JudgeRecord, PoolCandidate, ShotPick, ShotRequest, ShotResult, ShotStatus, SkipCode } from "./types.ts";

export interface StockDeps {
  fs: HostFs;
  runtime: HostRuntime | null;
  painter: SheetPainter;
  callModel: CallModelFn | null;
  estimateCx?: (clipPath: string) => Promise<number | null>;
  now: () => number;
  log: (e: Record<string, unknown>) => void;
}

export interface StockOptions {
  jobId: string;
  media: string;
  signal?: AbortSignal;
  deadline: number;
  maxJudged: number;
  retryJudged: number;
  candidatesPerCall: number;
  maxImages: number;
  concurrency: number;
  acceptWeak: boolean;
}

export interface StockShotState {
  req: ShotRequest;
  pool: ShotPool;
  tried: string[];
  records: JudgeRecord[];
  option: ShotOption | null;
  lostTo: { sourceKey: string; shotId: string }[];
  pick?: ShotPick;
  status?: ShotStatus;
  fallback?: string;
  retry?: ShotResult["retry"];
  rounds: number;
  evidenceErrors: { sourceKey: string; reason: string }[];
  budgetSkipped?: boolean;
  warnings: string[];
}

export async function semanticsKey(r: ShotRequest): Promise<string> {
  return (await hashJson({ k: r.kind, q: r.query, m: r.mustShow ?? null, f: r.framing ?? null, c: r.conditions, min: r.minUsableSeconds, ctx: r.contextText ?? null })).slice(0, 16);
}

const UNJUDGED = new Set(["budget", "judge_error", "judge_off", "not_judged", "too_many_sheets"]);

export class StockFilm {
  readonly shots: StockShotState[];
  private evidence = new Map<string, Promise<Evidence>>();
  private outcomes = new Map<string, Promise<JudgeOutcome>>();
  private families = new FamilyIndex(hammingHex);
  readonly familyOf = new Map<string, string>();
  judgeCalls = 0;
  judgeFailures = 0;
  private cache: SearchCache;
  private d: StockDeps;
  private o: StockOptions;
  private taken: Map<string, string>;

  constructor(reqs: ShotRequest[], cache: SearchCache, d: StockDeps, o: StockOptions, taken: Map<string, string>) {
    this.cache = cache;
    this.d = d;
    this.o = o;
    this.taken = taken;
    this.shots = reqs.map((req) => ({ req, pool: { candidates: [], attempts: [], next: 0 }, tried: [], records: [], option: null, lostTo: [], rounds: 0, evidenceErrors: [], warnings: [] }));
  }

  evidenceOf(key: string): Promise<Evidence> | undefined {
    return this.evidence.get(key);
  }

  private evidenceFor(c: PoolCandidate): Promise<Evidence> {
    let p = this.evidence.get(c.source.key);
    if (!p) {
      const dir = stockEvidenceDir(this.d.fs, this.o.media, c.source.key);
      p = prepareVideoEvidence(c.source.key, evidenceRendition(c.video)!, dir, { fs: this.d.fs, runtime: this.d.runtime, painter: this.d.painter, signal: this.o.signal }).then((e) => {
        if (e.status === "ready") this.familyOf.set(c.source.key, this.families.family(c.source.key, e.fingerprint, e.durationSeconds));
        return e;
      });
      this.evidence.set(c.source.key, p);
    }
    return p;
  }

  private async gather(s: StockShotState, count: number, round: number, exclude: Set<string>): Promise<{ c: PoolCandidate; e: Evidence }[]> {
    const ready: { c: PoolCandidate; e: Evidence }[] = [];
    const taken = new Set([...this.taken.keys(), ...exclude]);
    const familyKey = (k: string) => this.familyOf.get(k) ?? k;
    const held = new Set(s.records.map((r) => familyKey(r.sourceKey)));
    for (let pass = 0; pass < 6 && ready.length < count; pass += 1) {
      const want = s.pool.candidates.filter((c) => !c.skip).length + count - ready.length;
      s.pool = await buildPool(s.req, this.cache, { want, maxRound: round, taken, signal: this.o.signal }, s.pool);
      const fresh = judgingOrder(s.pool.candidates, s.req.prefer.orientation).filter((c) => !s.tried.includes(c.source.key) && !taken.has(c.source.key));
      if (!fresh.length) break;
      const batch = fresh.slice(0, count - ready.length);
      batch.forEach((c) => s.tried.push(c.source.key));
      const evs = await Promise.all(batch.map((c) => this.evidenceFor(c)));
      batch.forEach((c, i) => {
        const e = evs[i];
        if (e.status !== "ready") {
          c.skip = { code: ((e.code as SkipCode) ?? "decode_error"), reason: e.reason ?? "evidence failed" };
          if (e.status === "error") s.evidenceErrors.push({ sourceKey: c.source.key, reason: e.reason ?? "evidence failed" });
          return;
        }
        if (e.durationSeconds != null && e.durationSeconds + 1e-9 < s.req.minUsableSeconds) {
          c.skip = { code: "too_short", reason: "the file is " + e.durationSeconds + " s (the search said " + c.video.duration + " s); the shot needs " + s.req.minUsableSeconds + " s" };
          return;
        }
        const fam = familyKey(c.source.key);
        if (held.has(fam) || taken.has(fam)) {
          c.skip = { code: "duplicate", reason: "near-identical to a source already judged or taken (" + fam + ")" };
          return;
        }
        held.add(fam);
        ready.push({ c, e });
      });
    }
    return ready;
  }

  async round(round: number, shots: StockShotState[], count: number, exclude: Set<string> = new Set()): Promise<void> {
    const sems = await Promise.all(shots.map((s) => semanticsKey(s.req)));
    const gathered = await mapLimit(shots, 2, (s) => this.gather(s, count, round, exclude));
    const items: JudgeItem[] = [];
    const resolve = new Map<string, (o: JudgeOutcome) => void>();
    shots.forEach((s, i) => {
      s.rounds = round;
      for (const { c, e } of gathered[i]) {
        const key = sems[i] + "|" + c.source.key;
        if (this.outcomes.has(key)) continue;
        this.outcomes.set(key, new Promise((res) => resolve.set(key, res)));
        items.push({ key, candidate: { kind: "video", request: { text: requestText(s.req), conditions: s.req.conditions.map(({ id, text }) => ({ id, text })), minimumSeconds: s.req.minUsableSeconds }, durationSeconds: e.durationSeconds, timestamps: e.timestamps }, evidence: e });
      }
    });
    const outs: JudgeOutcome[] = this.d.callModel
      ? await judgeItems(items, this.d.callModel, this.d.fs, {
          jobId: this.o.jobId,
          candidatesPerCall: this.o.candidatesPerCall,
          maxImages: this.o.maxImages,
          concurrency: this.o.concurrency,
          deadline: this.o.deadline,
          signal: this.o.signal,
          now: this.d.now,
          onBatch: (b) => {
            this.judgeCalls += 1;
            if (!b.ok) this.judgeFailures += 1;
            this.d.log({ type: "broll.judge", round, ...b });
          },
        })
      : items.map((it) => ({ key: it.key, execution: { status: "error" as const, code: "judge_off", reason: "judging is off for this run" }, prediction: null }));
    outs.forEach((o) => resolve.get(o.key)?.(o));
    for (const [i, s] of shots.entries()) {
      for (const { c } of gathered[i]) {
        const o = await this.outcomes.get(sems[i] + "|" + c.source.key)!;
        s.records.push({ shotId: s.req.id, sourceKey: c.source.key, execution: o.execution, prediction: o.prediction, ...(o.call ? { call: o.call } : {}) });
      }
    }
  }

  candidate(s: StockShotState, key: string): PoolCandidate {
    return s.pool.candidates.find((x) => x.source.key === key)!;
  }

  options(s: StockShotState): ShotOption[] {
    const out: ShotOption[] = [];
    s.records.forEach((r, order) => {
      const p = r.prediction;
      if (r.execution.status !== "ok" || !p || p.status !== "fit" || !p.preference) return;
      if (p.preference === "weak" && !this.o.acceptWeak) return;
      const c = this.candidate(s, r.sourceKey);
      const f = cutRendition(c.video, s.req.target);
      out.push({ sourceKey: r.sourceKey, family: this.familyOf.get(r.sourceKey), preference: p.preference, orientation: c.orientation, cropHeight: f ? cropHeight(f.width, f.height, s.req.target) : 0, order });
    });
    return out;
  }

  assign(): void {
    const result = assignSources(
      this.shots.map((s) => ({ shotId: s.req.id, prefer: s.req.prefer.orientation, options: this.options(s) })),
      this.taken.keys(),
      this.taken,
    );
    result.forEach((a, i) => {
      this.shots[i].option = a.option;
      this.shots[i].lostTo = a.lostTo;
    });
  }

  assigned(): Set<string> {
    return new Set(this.shots.flatMap((s) => (s.option ? [s.option.sourceKey, s.option.family ?? s.option.sourceKey] : [])));
  }

  private async cut(s: StockShotState, c: PoolCandidate, rec: JudgeRecord | null): Promise<ShotPick> {
    const ev = await this.evidence.get(c.source.key);
    const duration = ev?.durationSeconds ?? c.video.duration;
    const iv = rec?.prediction?.proposed_interval;
    const judged: [number, number] | null = iv ? [iv.start_sec, iv.end_sec] : null;
    const window = judged ? cutWindow(judged, s.req.minUsableSeconds, duration) : fallbackWindow(s.req.minUsableSeconds, duration);
    const rendition = cutRendition(c.video, s.req.target)!;
    const dir = shotDir(this.d.fs, this.o.media, s.req.id);
    const res = await cutClip({ fs: this.d.fs, runtime: this.d.runtime, signal: this.o.signal, tmpDir: dir }, rendition.url, window[0], window[1] - window[0], this.d.fs.join(dir, "clip.mp4"));
    let cx: number | null = rec?.prediction?.cx ?? null;
    let cxSource: ShotPick["cxSource"] = cx != null ? "judge" : "default";
    if (cx == null && this.d.estimateCx) {
      try {
        cx = await this.d.estimateCx(res.path);
        if (cx != null) cxSource = "estimate";
      } catch (e) {
        s.warnings.push("subject position estimate failed: " + errorMessage(e).slice(0, 120));
      }
    }
    const author = c.video.authorName || c.source.provider;
    const fit = rec?.prediction?.status === "fit" ? "fit" : "unjudged";
    return {
      kind: "video",
      provider: c.source.provider,
      sourceKey: c.source.key,
      fileUrl: rendition.url,
      ...(c.source.pageUrl ? { pageUrl: c.source.pageUrl } : {}),
      author,
      ...(c.video.authorUrl ? { authorUrl: c.video.authorUrl } : {}),
      license: c.source.license,
      ...(c.source.licenseUrl ? { licenseUrl: c.source.licenseUrl } : {}),
      attribution: "Video by " + author + " on " + c.source.provider,
      durationSeconds: duration,
      interval: window,
      judgedInterval: judged,
      cx: cx ?? 0.5,
      cxSource,
      fit,
      ...(fit === "unjudged" ? { notJudged: rec?.execution.code ?? "no_verdict" } : {}),
      preference: fit === "fit" ? (rec?.prediction?.preference ?? null) : null,
      why: fit === "fit" ? rec!.prediction!.reason : "first candidate that passed the deterministic checks (not judged: " + (rec?.execution.code ?? "no verdict") + ")",
      localPath: res.path,
      width: res.probe.video?.width,
      height: res.probe.video?.height,
    };
  }

  async finalize(): Promise<void> {
    const used = this.assigned();
    for (const k of this.taken.keys()) used.add(k);
    const free = (o: ShotOption) => !used.has(o.sourceKey) && !used.has(o.family ?? o.sourceKey);
    await mapLimit(this.shots.filter((s) => s.option), 2, async (s) => {
      let opt: ShotOption | null = s.option;
      for (let attempt = 0; opt && attempt < 2; attempt += 1) {
        try {
          s.pick = await this.cut(s, this.candidate(s, opt.sourceKey), s.records.find((r) => r.sourceKey === opt!.sourceKey) ?? null);
          s.status = opt.preference === "weak" ? "weak_only" : "found";
          return;
        } catch (e) {
          if (this.o.signal?.aborted) throw e;
          s.warnings.push("cut of " + opt.sourceKey + " failed: " + errorMessage(e).slice(0, 200));
          opt = rankOptions(this.options(s), s.req.prefer.orientation).find(free) ?? null;
          if (opt) {
            used.add(opt.sourceKey);
            used.add(opt.family ?? opt.sourceKey);
          }
        }
      }
      s.status = "error";
      s.fallback = "every cut failed";
    });
    for (const s of this.shots.filter((x) => !x.option)) {
      const unjudged = s.records.filter((r) => r.execution.status === "error" && UNJUDGED.has(r.execution.code) && !used.has(r.sourceKey) && !used.has(this.familyOf.get(r.sourceKey) ?? r.sourceKey));
      for (const r of unjudged.slice(0, 2)) {
        used.add(r.sourceKey);
        used.add(this.familyOf.get(r.sourceKey) ?? r.sourceKey);
        try {
          s.pick = await this.cut(s, this.candidate(s, r.sourceKey), r);
          s.status = "unverified";
          s.fallback = "unjudged fallback (" + r.execution.code + ": " + r.execution.reason.slice(0, 160) + ")";
          const transient = transientJudgeCode(r.execution.code);
          if (transient) s.retry = { code: transient, reason: "the pick was not judged (" + r.execution.code + ")" };
          break;
        } catch (e) {
          if (this.o.signal?.aborted) throw e;
          s.warnings.push("cut of " + r.sourceKey + " failed: " + errorMessage(e).slice(0, 200));
        }
      }
      if (s.pick) continue;
      this.explainMiss(s);
    }
  }

  private explainMiss(s: StockShotState): void {
    const searches = s.pool.attempts;
    const failed = searches.filter((a) => a.outcome === "error");
    const rows = s.pool.candidates.length;
    const skipped = s.pool.candidates.filter((c) => c.skip).length;
    const notes: string[] = [];
    if (failed.length) notes.push(failed.length + " of " + searches.length + " searches failed: " + (failed[0].error ?? "error"));
    if (s.evidenceErrors.length) notes.push("evidence failed for " + s.evidenceErrors.length + " of " + s.tried.length + " sources: " + s.evidenceErrors[0].reason.slice(0, 120));
    const note = notes.length ? "; " + notes.join("; ") : "";
    const shortlist = selectCandidates(s.records.map((r) => ({ candidateId: r.sourceKey, execution: r.execution, prediction: r.prediction })));
    if (!searches.length) {
      s.status = "error";
      s.fallback = "no search ran";
    } else if (failed.length === searches.length) {
      s.status = "error";
      s.fallback = "the stock search failed (" + failed.length + " searches: " + (failed[0].error ?? "error") + ")";
    } else if (!s.records.length && s.tried.length && s.evidenceErrors.length === s.tried.length) {
      s.status = "error";
      s.fallback = "no candidate could be decoded for the judge (" + s.evidenceErrors.length + " sources: " + s.evidenceErrors[0].reason.slice(0, 160) + ")" + (failed.length ? "; " + notes[0] : "");
    } else if (!s.records.length) {
      s.status = "no_match";
      s.fallback = "no usable stock source (" + rows + " rows, " + skipped + " skipped" + note + ")";
    } else if (s.lostTo.length && shortlist.status === "found") {
      s.status = "no_match";
      s.fallback = "every fitting source is used by another shot (" + s.lostTo.map((l) => l.sourceKey + "→" + l.shotId).join(", ") + ")" + note;
    } else if (shortlist.status === "no_match_in_candidates") {
      s.status = "no_match";
      s.fallback = "the judge found every candidate unfit (" + shortlist.rejectedCount + ")" + note;
    } else {
      s.status = "unverified";
      s.fallback = "no candidate was verified fit (" + shortlist.unresolved.map((u) => u.code).join(", ") + ")" + note;
    }
    const judgeHiccup = s.records.find((r) => r.execution.status === "error" && transientJudgeCode(r.execution.code));
    if (failed.length) s.retry = { code: "search_error", reason: notes[0] };
    else if (s.evidenceErrors.length) s.retry = { code: "evidence_error", reason: notes[0] };
    else if (judgeHiccup) s.retry = { code: transientJudgeCode(judgeHiccup.execution.code)!, reason: "a candidate was not judged (" + judgeHiccup.execution.code + ": " + judgeHiccup.execution.reason.slice(0, 120) + ")" };
    else if (s.budgetSkipped) s.retry = { code: "budget", reason: "the time budget ran out before the second search round" };
  }
}

export async function runStockShots(reqs: ShotRequest[], cache: SearchCache, d: StockDeps, o: StockOptions, taken: Map<string, string>): Promise<StockFilm> {
  const film = new StockFilm(reqs, cache, d, o, taken);
  if (!reqs.length) return film;
  await film.round(1, film.shots, o.maxJudged);
  film.assign();
  const empty = film.shots.filter((s) => !s.option);
  if (d.callModel && empty.length && o.retryJudged > 0) {
    if (d.now() < o.deadline) {
      await film.round(2, empty, o.retryJudged, film.assigned());
      film.assign();
    } else empty.forEach((s) => (s.budgetSkipped = true));
  }
  await film.finalize();
  return film;
}
