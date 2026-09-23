// Pure place inference: which clips were shot at the same place, read from
// capture time and any GPS the camera embedded. Sessions come first: a pause
// long enough to mean the shoot moved separates two venues a street apart,
// which GPS error cannot. Clips no evidence places stay unassigned, never
// guessed into a place.
//
// files: [{path, start (epoch ms or null), duration (seconds), location
// ({latitude, longitude, accuracyMeters?} or null)}]
const PLACE_RULES = {
  minGapMs: 5 * 60 * 1000,    // a shorter pause never ends a session
  maxGapMs: 30 * 60 * 1000,   // a longer pause always does
  rhythmMultiple: 4,          // otherwise: this many times the shoot's median gap
  radiusMeters: 200,          // only has to cover GPS error inside one session
  ambiguousMargin: 0.25,      // neighbours this close in time decide nothing
};

function inferPlaces(files, overrides) {
  const rules = {...PLACE_RULES, ...overrides};
  const located = f => f.location != null;
  const timed = f => Number.isFinite(f.start);
  const endOf = f => f.start + (f.duration > 0 ? f.duration * 1000 : 0);
  const byTime = (a, b) => {
    if (timed(a) && timed(b) && a.start !== b.start) return a.start - b.start;
    if (timed(a) !== timed(b)) return timed(a) ? -1 : 1;
    return a.path.localeCompare(b.path);
  };
  const meters = (a, b) => {
    const rad = v => v * Math.PI / 180;
    const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
      Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  };

  // Sessions. The boundary scales with the shoot's own rhythm, so fifteen
  // quiet minutes read as "moved on" in a brisk afternoon of short takes and
  // as "waited" on a slow hike. Overlapping recordings count as no gap.
  const dated = files.filter(timed).sort(byTime);
  const undated = files.filter(f => !timed(f));
  const gaps = dated.slice(1).map((f, i) => Math.max(0, f.start - endOf(dated[i])));
  const sorted = [...gaps].sort((a, b) => a - b), mid = sorted.length >> 1;
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const boundary = gaps.length
    ? Math.min(rules.maxGapMs, Math.max(rules.minGapMs, rules.rhythmMultiple * median))
    : rules.minGapMs;
  const sessions = [];
  dated.forEach((f, i) => {
    if (i === 0 || gaps[i - 1] > boundary) sessions.push([f]);
    else sessions[sessions.length - 1].push(f);
  });

  const centerOf = c => ({latitude: c.latitudeSum / c.files.length, longitude: c.longitudeSum / c.files.length});
  const add = (c, f) => {
    c.files.push(f);
    c.latitudeSum += f.location.latitude;
    c.longitudeSum += f.location.longitude;
    c.maxAccuracy = Math.max(c.maxAccuracy, f.location.accuracyMeters || 0);
  };
  // GPS fixes within one radius of a cluster's running center join it.
  const cluster = fixes => {
    const clusters = [];
    for (const f of fixes) {
      let best = null;
      for (const c of clusters) {
        const allowed = rules.radiusMeters + Math.min(c.maxAccuracy, rules.radiusMeters) +
          Math.min(f.location.accuracyMeters || 0, rules.radiusMeters);
        const distance = meters(f.location, centerOf(c));
        if (distance <= allowed && (best == null || distance < best.distance)) best = {c, distance};
      }
      if (best) add(best.c, f);
      else {
        const c = {files: [], latitudeSum: 0, longitudeSum: 0, maxAccuracy: 0};
        add(c, f);
        clusters.push(c);
      }
    }
    return clusters;
  };
  const draft = (list, reasons, c) => {
    const ordered = [...list].sort(byTime);
    return {
      files: ordered,
      center: c ? centerOf(c) : null,
      reasons: new Set(reasons),
      // How many GPS fixes agree on this place: two corroborate each other,
      // one is a fix nothing has checked.
      fixes: c ? c.files.length : 0,
      start: timed(ordered[0]) ? ordered[0].start : Infinity,
    };
  };
  const reasonsFor = (list, fixes) => list.length === fixes ? ['gps-cluster'] : ['gps-cluster', 'capture-session'];

  const drafts = [], unassigned = [];
  for (const session of sessions) {
    const fixes = session.filter(located);
    // No GPS at all: the session is still one place, just an unconfirmed one.
    if (!fixes.length) { drafts.push(draft(session, ['capture-session'])); continue; }
    const clusters = cluster(fixes);
    // One place in the session: everything shot during it belongs there. A
    // lone fix is a weak anchor, never a place of its own.
    if (clusters.length === 1) { drafts.push(draft(session, reasonsFor(session, fixes.length), clusters[0])); continue; }

    // Several places in one session: a clip without GPS goes where its
    // nearer located neighbour was shot, unless it sits midway between two.
    const clusterOf = new Map();
    for (const c of clusters) for (const f of c.files) clusterOf.set(f, c);
    const assigned = new Map(clusters.map(c => [c, [...c.files]]));
    const ordered = [...session].sort(byTime);
    ordered.forEach((f, i) => {
      if (located(f)) return;
      let before = null, after = null;
      for (let j = i - 1; j >= 0 && !before; j--) if (located(ordered[j])) before = ordered[j];
      for (let j = i + 1; j < ordered.length && !after; j++) if (located(ordered[j])) after = ordered[j];
      const beforeGap = before ? f.start - before.start : null;
      const afterGap = after ? after.start - f.start : null;
      const nearer = beforeGap == null ? after : afterGap == null ? before : beforeGap <= afterGap ? before : after;
      if (!nearer) { unassigned.push(f); return; }
      if (before && after && clusterOf.get(before) !== clusterOf.get(after) &&
          Math.abs(beforeGap - afterGap) / Math.max(beforeGap, afterGap, 1) < rules.ambiguousMargin) {
        unassigned.push(f);
        return;
      }
      assigned.get(clusterOf.get(nearer)).push(f);
    });
    for (const c of clusters) drafts.push(draft(assigned.get(c), reasonsFor(assigned.get(c), c.files.length), c));
  }

  // A clip with GPS but no capture time sits on no timeline, yet a fix inside
  // exactly one known place is evidence enough on its own.
  for (const f of undated) {
    const matches = located(f) ? drafts.filter(d => d.center && meters(f.location, d.center) <= rules.radiusMeters) : [];
    if (matches.length === 1) { matches[0].files.push(f); matches[0].reasons.add('gps-cluster'); }
    else unassigned.push(f);
  }

  drafts.sort((a, b) => a.start - b.start || a.files[0].path.localeCompare(b.files[0].path));
  return {
    places: drafts.map((d, i) => ({
      placeId: 'place-' + (i + 1),
      paths: d.files.map(f => f.path),
      confidence: d.fixes >= 2 ? 'high' : d.fixes === 1 ? 'medium' : 'low',
      reasons: [...d.reasons],
      center: d.center,
    })),
    unassigned: unassigned.map(f => f.path),
  };
}
