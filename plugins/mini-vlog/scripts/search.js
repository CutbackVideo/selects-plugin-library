const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const roles = Object.keys(cfg.queries);
// Scene search needs analysis. Unless the caller already passes analysed clips only (checkAnalysis: false: the panel and
// the driver, which check the others locally), one resources() read finds the clips without analysis: they are not
// searched and come back in `local`, with evenly spaced candidates (localWindows: one a second, the first window from 0.5 s, at most 24,
// role 'local', scored at the bottom of this call's search scores) so a caller that only reads `candidates` (the Clip
// highlights template run) still builds from them. When resources() cannot be read, every clip is searched as before.
const LOCAL_MAX = 24, LOCAL_SCORE = 0.25;
const durations = {};
if (cfg.checkAnalysis !== false) {
  try {
    const all = await p.resources();
    for (const r of Array.isArray(all) ? all : []) if (r && !r.hasAnalysis && typeof r.durationSeconds === 'number' && r.durationSeconds > 0) durations[r.resourceId] = r.durationSeconds;
  } catch (e) { /* search everything */ }
}
// A clip counts as analysed only when resources() says hasAnalysis: true (a missing flag means not analysed, as in
// inventory.js).
const local = cfg.rids.filter(rid => durations[rid] > 0);
// The panel's mvLocalWindows (mv-local block), copied: tests/no-analysis.test.cjs keeps the two identical. The first
// centre is 0.5 s + half the panel's MV_LOCAL_WINDOW (1.4 s), so the first window starts at 0.5 s.
const LOCAL_FIRST = 1.2;
function localWindows(dur) {
  const first = LOCAL_FIRST;
  const n = Math.floor(dur - 0.5 - first + 1e-9) + 1;
  if (n < 1) return dur > 0 ? [Math.round(dur / 2 * 1000) / 1000] : [];
  const at = k => Math.round((first + k) * 1000) / 1000;
  if (n <= LOCAL_MAX) return Array.from({ length: n }, (_, k) => at(k));
  return Array.from({ length: LOCAL_MAX }, (_, k) => at(Math.round(k * (n - 1) / (LOCAL_MAX - 1))));
}
const jobs = [];
for (const rid of cfg.rids) if (!local.includes(rid)) for (const role of roles) jobs.push({ rid, role });
const candidates = [];
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
if (local.length) {
  const scores = candidates.map(c => c.score).filter(x => typeof x === 'number' && isFinite(x)).sort((a, b) => a - b);
  const floor = scores.length ? scores[Math.min(scores.length - 1, Math.round(0.1 * (scores.length - 1)))] : LOCAL_SCORE;
  for (const rid of local) for (const t of localWindows(durations[rid])) candidates.push({ rid, role: 'local', t, score: floor });
}
return { candidates, failed: [...new Set(pending.map(j => j.rid))], local, stats: { ms: Date.now() - started, waitedMs: waited, rateLimited } };
