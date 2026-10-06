export const MUSIC_MOODS: readonly { id: string; line: string }[] = [
  { id: "driving", line: "steady forward momentum for a confident, practical argument" },
  { id: "curious", line: "light, questioning motion for an explanation that opens a question" },
  { id: "uplifting", line: "a warm lift for encouragement, hope or a positive turn" },
  { id: "reflective", line: "calm, spacious ground for a personal or thoughtful point" },
  { id: "tense", line: "held-back pressure for stakes, risk, a warning or a conflict" },
  { id: "playful", line: "a bouncy, light touch for humour, irony or an easy-going delivery" },
];
export const MUSIC_ENERGIES: readonly string[] = ["low", "mid", "high"];
export const DEFAULT_MOOD = "driving";

export function musicSection(moods: readonly { id: string; line: string }[] = MUSIC_MOODS, energies: readonly string[] = MUSIC_ENERGIES): string {
  return [
    "## Music",
    "",
    "One instrumental bed from the bundled music catalog plays under the whole film as its own clip, ducked under the voice; an editor may swap it later. Choose its character in `music`: pick the bed that fits the argument's energy; it sits under the voice. `mood` is one of the moods below and `energy` is " +
      energies.map((e) => "`" + e + "`").join(", ").replace(/, ([^,]*)$/, " or $1") +
      ". Write `reason` in English, in one short sentence. Music changes no scene boundary, word or timing, and no scene plan mentions it.",
    "",
    ...moods.map((m) => "- `" + m.id + "`: " + m.line),
    "",
    "",
  ].join("\n");
}

export const MUSIC_SKELETON_LINE =
  '  "music": {"mood": "one mood from the Music section", "energy": "low, mid or high", "reason": "One short sentence in English on why this bed fits the argument."},\n';

export type MusicCatalog = {
  moods?: string[];
  energies?: string[];
  tracks?: { id: string; title?: string; moods?: string[]; energy?: string; durationSeconds?: number }[];
};

export type MusicChoice = {
  schema: "eo-plan-music/1";
  mood: string;
  energy: string | null;
  reason: string | null;
  from: "plan" | "default";
  given: unknown;
  warnings: string[];
  catalog: { moods: string[]; energies: string[]; tracks: number; read: boolean };
  candidates: { id: string; title: string | null; energy: string | null }[];
};

const clean = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim().toLowerCase() : null);

export function checkMusic(given: unknown, catalog: MusicCatalog | null): MusicChoice {
  const moods = catalog?.moods?.length ? catalog.moods : MUSIC_MOODS.map((m) => m.id);
  const energies = catalog?.energies?.length ? catalog.energies : [...MUSIC_ENERGIES];
  const tracks = catalog?.tracks ?? [];
  const warnings: string[] = [];
  if (!catalog) warnings.push("The music catalog could not be read; the mood was checked against the fixed list.");
  const g = given && typeof given === "object" && !Array.isArray(given) ? (given as Record<string, unknown>) : null;
  let mood = clean(g?.mood);
  let from: MusicChoice["from"] = "plan";
  if (!g) {
    warnings.push("The plan chose no music; using " + DEFAULT_MOOD + ".");
    mood = DEFAULT_MOOD;
    from = "default";
  } else if (!mood || !moods.includes(mood)) {
    warnings.push("The plan's music mood " + JSON.stringify(g.mood ?? null) + " is not in the catalog; using " + DEFAULT_MOOD + ".");
    mood = DEFAULT_MOOD;
    from = "default";
  } else if (tracks.length && !tracks.some((t) => (t.moods ?? []).includes(mood!))) {
    warnings.push("No catalog track has the mood " + mood + "; using " + DEFAULT_MOOD + ".");
    mood = DEFAULT_MOOD;
    from = "default";
  }
  let energy = clean(g?.energy);
  if (g && g.energy != null && (!energy || !energies.includes(energy))) {
    warnings.push("The plan's music energy " + JSON.stringify(g.energy) + " is not in the catalog; matching on mood alone.");
    energy = null;
  }
  if (energy && !energies.includes(energy)) energy = null;
  const reason = g && typeof g.reason === "string" && g.reason.trim() ? g.reason.trim().slice(0, 400) : null;
  const withMood = tracks.filter((t) => (t.moods ?? []).includes(mood!));
  const ordered = [...withMood.filter((t) => energy && t.energy === energy), ...withMood.filter((t) => !energy || t.energy !== energy)];
  return {
    schema: "eo-plan-music/1",
    mood: mood!,
    energy,
    reason,
    from,
    given: given === undefined ? null : given,
    warnings,
    catalog: { moods: [...moods], energies: [...energies], tracks: tracks.length, read: !!catalog },
    candidates: ordered.map((t) => ({ id: t.id, title: t.title ?? null, energy: t.energy ?? null })),
  };
}
