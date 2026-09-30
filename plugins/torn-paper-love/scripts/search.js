// Torn Paper Love: scene search for couple moments in the candidate videos (read-only).
// cfg (JSON): { projectId, rids: string[], pageSize?: number, parallel?: number, budgetMs?: number }
//   pageSize  hits per search, clamped to 1..8 (default 4); parallel  searches in flight, clamped to 1..4 (default 4)
//   budgetMs  stop starting new work after this long (default 22000)
// returns { best: { [rid]: number | null }, failed: string[], stats: { ms, waitedMs, rateLimited } }
//   best[rid] = the source time (seconds) of the highest-scoring hit (ties to the earliest), null when the video had
//   no hit or its search failed; the planner then uses a filler window (0.5 s grid, capped per source).
const cfg = __CONFIG__;
const QUERY = 'two people close together, a couple smiling, hugging or kissing';
const p = selects.project(cfg.projectId);
const clamp = (v, lo, hi, dflt) => (typeof v === 'number' && v > 0 ? Math.max(lo, Math.min(hi, Math.floor(v))) : dflt);
const pageSize = clamp(cfg.pageSize, 1, 8, 4);
const width = clamp(cfg.parallel, 1, 4, 4);
/** @type {Record<string, number | null>} */
const best = {};
/** @type {Record<string, number>} */
const score = {};
for (const rid of cfg.rids) best[rid] = null;
// run_script has no setTimeout; Atomics.waitAsync on a private buffer waits without blocking. Without it, no wait.
const sleep = ms => {
  const atomics = Object(globalThis).Atomics;
  if (!(ms > 0) || !atomics || typeof atomics.waitAsync !== 'function') return Promise.resolve();
  const w = atomics.waitAsync(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  return w.async ? w.value : Promise.resolve();
};
const started = Date.now();
// Stop starting new work after this long so the call returns inside run_script's 30 s deadline;
// what is left is reported as failed and retried by the next Build.
const budget = cfg.budgetMs == null ? 22000 : cfg.budgetMs;
const backoff = [1000, 2000, 4000];
let pending = cfg.rids.slice(), waited = 0, rateLimited = 0;
// The scene-search backend drops requests when the app is busy and answers rate_limited under load.
// Failed searches are retried in later passes, after a 1 s, 2 s, then 4 s pause.
for (let pass = 0; pass < 4 && pending.length; pass++) {
  if (pass > 0) {
    const wait = backoff[pass - 1];
    if (Date.now() - started + wait > budget) break;
    await sleep(wait);
    waited += wait;
  }
  const failed = [], queue = pending.slice();
  const worker = async () => {
    for (let rid = queue.shift(); rid; rid = queue.shift()) {
      if (Date.now() - started > budget) { failed.push(rid); continue; }
      try {
        const page = await p.resource(rid).searchScenes(QUERY, { pageSize });
        if (!page || page.error) { if (page && /rate_limited/.test(String(page.error))) rateLimited++; failed.push(rid); continue; }
        for (const h of page.results || []) {
          const b = best[rid];
          if (b === null || h.score > score[rid] || (h.score === score[rid] && h.timeSeconds < b)) { best[rid] = h.timeSeconds; score[rid] = h.score; }
        }
      } catch (e) {
        if (/rate_limited/.test(String(e && e.message || e))) rateLimited++;
        failed.push(rid);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, queue.length) }, worker));
  pending = failed;
}
return { best, failed: [...new Set(pending)], stats: { ms: Date.now() - started, waitedMs: waited, rateLimited } };
