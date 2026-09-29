const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
// Roles and scene-search queries (spec 5). cfg.queries replaces them; cfg.roles narrows them.
const ST_QUERIES = {
  opener: 'a wide view of the sea, coast or beach on a sunny day',
  grid: 'a colourful summer travel scene: beach, boats, streets or cafes',
  place: 'a wide view of a coastal town, harbour or landmark',
  beach: 'people on a sunny beach with umbrellas',
  town: 'colourful houses in a coastal town',
  water: 'boats or water in a harbour or the sea',
  street: 'a narrow sunny street or alley',
  food: 'an ice cream, drink or food on a summer day',
  landmark: 'a church, landmark or viewpoint',
  people: 'people walking or relaxing on holiday',
  detail: 'a summer detail close up',
  ending: 'golden sunset light over the sea or a town',
};
const queries = cfg.queries || ST_QUERIES;
const roles = Object.keys(queries).filter(r => !cfg.roles || cfg.roles.includes(r));
const jobs = [];
for (const rid of cfg.rids) for (const role of roles) jobs.push({ rid, role });
const candidates = [];
// Bounded page size: enough hits per role and clip for fresh-first allocation, small enough for the payload.
const pageSize = Math.max(1, Math.min(10, Math.round(cfg.pageSize || 6)));
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
const width = Math.max(1, Math.min(4, cfg.parallel || 4));
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
        const page = await p.resource(job.rid).searchScenes(queries[job.role], { pageSize });
        if (!page || page.error) { if (page && /rate_limited/.test(String(page.error))) rateLimited++; failed.push(job); continue; }
        for (const h of page.results.slice(0, pageSize)) candidates.push({ rid: job.rid, role: job.role, t: h.timeSeconds, score: h.score });
      } catch (e) {
        if (/rate_limited/.test(String(e && e.message || e))) rateLimited++;
        failed.push(job);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, queue.length) }, worker));
  pending = failed;
}
return { candidates, failed: [...new Set(pending.map(j => j.rid))], stats: { ms: Date.now() - started, waitedMs: waited, rateLimited, jobs: jobs.length } };
