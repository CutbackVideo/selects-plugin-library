const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const roles = Object.keys(cfg.queries);
const candidates = [];
// Scene search needs Selects' analysis. A clip without it (an unanalysed import, which the inventory now hands over
// too) is not searched: it gets LOCAL_COUNT evenly spaced windows of each local-score kind instead, with one middling
// score, the roles the planner gives clips scored without analysis (planner AV_LOCAL_ROLES: steady for the opening,
// credit and final shots, montage for the rest; the panel's motion bonus step puts them on the hits' score scale). The
// panel scores such clips itself and sends only analysed ones (cfg.analysedOnly: no resource read); a template run
// sends every clip. If the resource list cannot be read, every clip is searched as before.
const LOCAL_ROLES = ['local-steady', 'local-montage'], LOCAL_COUNT = 4, LOCAL_SCORE = 0.5;
const loose = v => v;
const unanalysed = {};
if (cfg.rids.length && !cfg.analysedOnly) {
  try {
    const list = loose(await p.resources());
    if (Array.isArray(list)) for (const r of list) {
      if (r && r.hasAnalysis === false && cfg.rids.includes(r.resourceId) && typeof r.durationSeconds === 'number' && r.durationSeconds > 0) unanalysed[r.resourceId] = r.durationSeconds;
    }
  } catch (e) { /* search every clip */ }
}
for (const rid of Object.keys(unanalysed)) {
  for (let k = 1; k <= LOCAL_COUNT; k++) {
    const t = Math.round(unanalysed[rid] * k / (LOCAL_COUNT + 1) * 1000) / 1000;
    for (const role of LOCAL_ROLES) candidates.push({ rid, role, t, score: LOCAL_SCORE });
  }
}
const jobs = [];
for (const rid of cfg.rids) if (!(rid in unanalysed)) for (const role of roles) jobs.push({ rid, role });
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
return { candidates, failed: [...new Set(pending.map(j => j.rid))], stats: { ms: Date.now() - started, waitedMs: waited, rateLimited } };
