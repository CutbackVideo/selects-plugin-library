const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const roles = Object.keys(cfg.queries);
const jobs = [];
for (const rid of cfg.rids) for (const role of roles) jobs.push({ rid, role });
const candidates = [];
let pending = jobs;
// The scene-search backend drops requests when the app is busy; retry what failed.
for (let pass = 0; pass < 4 && pending.length; pass++) {
  const failed = [];
  for (let i = 0; i < pending.length; i += 8) {
    await Promise.all(pending.slice(i, i + 8).map(async job => {
      try {
        const page = await p.resource(job.rid).searchScenes(cfg.queries[job.role], { pageSize: cfg.pageSize });
        if (!page || page.error) { failed.push(job); return; }
        for (const h of page.results) candidates.push({ rid: job.rid, role: job.role, t: h.timeSeconds, score: h.score });
      } catch (e) { failed.push(job); }
    }));
  }
  pending = failed;
}
return { candidates, failed: [...new Set(pending.map(j => j.rid))] };
