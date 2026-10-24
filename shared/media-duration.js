// Source-media seconds only: never derive these from a Draft's frame rate.
// Zero, missing, non-numeric and non-finite values are unknown, not short clips.
// This pure function is also serialized into read-only run_script queries.
function mediaDurationFact(resourceSeconds = null, treeSeconds = null) {
  if (typeof resourceSeconds === "number" && Number.isFinite(resourceSeconds) && resourceSeconds > 0) {
    return { durationSeconds: resourceSeconds, durationSource: "resource" };
  }
  if (typeof treeSeconds === "number" && Number.isFinite(treeSeconds) && treeSeconds > 0) {
    return { durationSeconds: treeSeconds, durationSource: "source-tree" };
  }
  return { durationSeconds: null, durationSource: "unknown" };
}

// Keep each row's identity, name and path together; do not mutate caller snapshots.
// The caller supplies its existing read-only host probe, not an import or analysis.
async function resolveMediaDurations(rows, probeSeconds) {
  const resolved = [];
  for (const row of rows) {
    let fact = mediaDurationFact(row.durationSeconds);
    if (fact.durationSeconds !== null) {
      fact.durationSource = row.durationSource || "provided";
    } else if (row.path) {
      try {
        const seconds = await probeSeconds(row.path);
        if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
          fact = { durationSeconds: seconds, durationSource: "probe" };
        }
      } catch { /* A failed observation remains unknown. */ }
    }
    resolved.push({ ...row, ...fact });
  }
  return resolved;
}

function requireMediaDurations(rows) {
  const unknown = rows.find(row => mediaDurationFact(row.durationSeconds).durationSeconds === null);
  if (unknown) {
    throw Object.assign(new Error(`Could not read the duration of ${unknown.name || "a picked video"}. Try again.`), {
      code: "media-duration-unknown", resourceId: unknown.resourceId,
    });
  }
}
