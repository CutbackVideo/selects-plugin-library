const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const roles = Object.keys(cfg.queries);
const candidates = [];
// Scene search needs analysis. A clip without it (an import Selects never analysed) gets evenly spaced windows
// instead, starting at least 0.5 s in (stock clips often fade in from black), for every role, flagged local with that
// minStart; the planner gives them the same scale as search hits. The panel scores such clips locally (quick score)
// and never sends them here; a Clip highlights template run sends every handed clip, so its unanalysed ones build from
// these. planner.js tecEvenCandidates is the same rule (tests keep the two equal). Unknown analysis (resources()
// failed) searches as before.
const opt: any = cfg;
const head = 0.5, tail = 0.05, win = opt.windowSeconds == null ? 4.4 : opt.windowSeconds;
const evenAt = (duration: any) => {
  const room = duration - head - tail;
  if (!(room > 0)) return [];
  if (room <= win) return [head + room / 2];
  const n = Math.max(1, Math.min(4, Math.floor(room / win)));
  if (n === 1) return [head + room / 2];
  const out = [];
  for (let k = 0; k < n; k++) out.push(head + win / 2 + k * (room - win) / (n - 1));
  return out;
};
let info: any = null;
try { info = {}; for (const r of await p.resources()) info[r.resourceId] = r; } catch (e) { info = null; }
const unanalysed = [];
for (const rid of cfg.rids) {
  const r = info && info[rid];
  if (!r || r.hasAnalysis !== false) continue;
  unanalysed.push(rid);
  for (const t of evenAt(r.durationSeconds)) for (const role of roles) candidates.push({ rid, role, t: Math.round(t * 1000) / 1000, score: 0.45, local: true, minStart: head });
}
const jobs = [];
for (const rid of cfg.rids) if (!unanalysed.includes(rid)) for (const role of roles) jobs.push({ rid, role });
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
const width = cfg.parallel || 4;
const backoff = [1000, 2000, 4000];
let pending = jobs, waited = 0, rateLimited = 0;
// The scene-search backend drops requests when the app is busy and answers rate_limited under load.
// Failed jobs are retried in later passes, after a 1 s, 2 s, then 4 s pause.
for (let pass = 0; pass < 4 && pending.length; pass++) {
  if (pass > 0) {
    const wait = backoff[pass - 1];
    if (Date.now() - started + wait > budget) break;
    await sleep(wait);
    waited += wait;
  }
  const failed = [], queue = pending.slice();
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      if (Date.now() - started > budget) { failed.push(job); continue; }
      try {
        const page = await p.resource(job.rid).searchScenes(cfg.queries[job.role], { pageSize: cfg.pageSize });
        if (!page || page.error) { if (page && /rate_limited/.test(String(page.error))) rateLimited++; failed.push(job); continue; }
        for (const h of page.results) candidates.push({ rid: job.rid, role: job.role, t: h.timeSeconds, score: h.score });
      } catch (e) {
        if (/rate_limited/.test(String(e && e.message || e))) rateLimited++;
        failed.push(job);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, queue.length) }, worker));
  pending = failed;
}
return { candidates, failed: [...new Set(pending.map(j => j.rid))], unanalysed, stats: { ms: Date.now() - started, waitedMs: waited, rateLimited } };
