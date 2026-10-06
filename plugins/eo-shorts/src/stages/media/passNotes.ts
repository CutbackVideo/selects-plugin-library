import type { Job } from "../../jobs/store.ts";

export function forgetEarlierPasses(job: Pick<Job, "fallbacks" | "warnings">, stage: string, last: { warnings?: readonly string[] } | null): void {
  const prefix = stage + ": ";
  const keep = job.fallbacks.filter((f) => !f.startsWith(prefix));
  job.fallbacks.splice(0, job.fallbacks.length, ...keep);
  const stale = new Set(last?.warnings ?? []);
  if (stale.size) {
    const kept = job.warnings.filter((w) => !stale.has(w));
    job.warnings.splice(0, job.warnings.length, ...kept);
  }
}
