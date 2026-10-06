export type MusicTrack = {
  id: string;
  file: string;
  title: string;
  artist: string;
  source?: string;
  license: string;
  licenseUrl?: string;
  durationSeconds: number;
  bpm?: number;
  moods: string[];
  energy: string;
  startPoints: number[];
  introSeconds?: number;
  integratedLufs?: number;
  truePeak?: number;
  sampleRate?: number;
};

export type MusicCatalog = { schema: string; moods: string[]; energies: string[]; tracks: MusicTrack[] };

export const MOODS = ["driving", "curious", "uplifting", "reflective", "tense", "playful"] as const;
export const ENERGIES = ["low", "mid", "high"] as const;
export const DEFAULT_MOOD = "driving";
export const TAIL_SECONDS = 2;

export type MusicAsk = { mood?: string | null; energy?: string | null; reason?: string | null } | null | undefined;

export type MusicPick = {
  track: MusicTrack;
  startSeconds: number;
  asked: { mood: string | null; energy: string | null };
  used: { mood: string; energy: string | null };
  reason: string;
  candidates: string[];
  warnings: string[];
};

export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function startPointFor(track: MusicTrack, videoSeconds: number): number | null {
  const need = videoSeconds + TAIL_SECONDS;
  const fits = (sp: number) => track.durationSeconds - sp >= need;
  const intro = track.introSeconds ?? 0;
  if (intro > 0 && track.startPoints.includes(intro) && fits(intro)) return intro;
  return fits(0) ? 0 : null;
}

const norm = (s: unknown) => (typeof s === "string" ? s.trim().toLowerCase() : "");

export function pickMusic(catalog: MusicCatalog, ask: MusicAsk, o: { videoSeconds: number; jobId: string }): MusicPick {
  const warnings: string[] = [];
  const askedMood = norm(ask?.mood) || null, askedEnergy = norm(ask?.energy) || null;
  const moods = catalog.moods?.length ? catalog.moods : [...MOODS];
  let mood = askedMood && moods.includes(askedMood) ? askedMood : DEFAULT_MOOD;
  if (!askedMood) warnings.push('The plan named no music mood; using "' + DEFAULT_MOOD + '".');
  else if (mood !== askedMood) warnings.push('The plan\'s music mood "' + askedMood + '" is not in the catalog; using "' + DEFAULT_MOOD + '".');
  const energy = askedEnergy && (ENERGIES as readonly string[]).includes(askedEnergy) ? askedEnergy : null;
  if (askedEnergy && !energy) warnings.push('The plan\'s music energy "' + askedEnergy + '" is not low, mid or high; matching on mood alone.');

  let pool = catalog.tracks.filter((t) => t.moods.includes(mood));
  if (!pool.length) {
    warnings.push('No bundled track has the mood "' + mood + '"; using "' + DEFAULT_MOOD + '".');
    mood = DEFAULT_MOOD;
    pool = catalog.tracks.filter((t) => t.moods.includes(mood));
  }
  if (!pool.length) throw new Error("The music catalog has no track for the mood " + mood + ".");
  let byEnergy = energy ? pool.filter((t) => t.energy === energy) : pool;
  let energyNote = "";
  if (energy && !byEnergy.length) {
    const near = energy === "mid" ? ["low", "high"] : ["mid"];
    byEnergy = pool.filter((t) => near.includes(t.energy));
    if (!byEnergy.length) byEnergy = pool;
    energyNote = " (no " + mood + "/" + energy + " track; nearest energy " + [...new Set(byEnergy.map((t) => t.energy))].sort().join("/") + ")";
    warnings.push("No bundled " + mood + " track has " + energy + " energy; using the nearest energy.");
  }
  let long = byEnergy.filter((t) => startPointFor(t, o.videoSeconds) != null);
  if (!long.length) long = pool.filter((t) => startPointFor(t, o.videoSeconds) != null);
  let startOverride: number | null = null;
  if (!long.length) {
    const longest = [...pool].sort((a, b) => b.durationSeconds - a.durationSeconds || a.id.localeCompare(b.id))[0];
    long = [longest];
    startOverride = 0;
    warnings.push("No bundled " + mood + " track lasts the video and " + TAIL_SECONDS + " s more (" + o.videoSeconds.toFixed(1) + " s); using the longest, " + longest.id + ", which ends before the video does.");
  }
  const sorted = [...long].sort((a, b) => a.id.localeCompare(b.id));
  const track = sorted[stableHash(o.jobId) % sorted.length];
  const startSeconds = startOverride ?? startPointFor(track, o.videoSeconds)!;
  return {
    track,
    startSeconds,
    asked: { mood: askedMood, energy: askedEnergy },
    used: { mood, energy },
    reason: "mood " + mood + (energy ? ", energy " + energy : ", any energy (none asked)") + energyNote + "; " + sorted.length + " track" + (sorted.length === 1 ? "" : "s") + " long enough (" + sorted.map((t) => t.id).join(", ") + "), picked by the job id; starts at " + startSeconds + " s" + (startSeconds > 0 ? " (its intro)" : ""),
    candidates: sorted.map((t) => t.id),
    warnings,
  };
}
