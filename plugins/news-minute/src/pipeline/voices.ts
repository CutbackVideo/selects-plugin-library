// Narration voices for the voice picker: the host's selects.narration.voices page, and the
// "<gender> · <age> — <description>" form the server writes for library voices.

export type Voice = { voiceId: string; name: string; description: string | null; previewUrl: string | null };
export type VoicePage = { items: Voice[]; nextCursor: string | null };

const GENDERS = new Set(["female", "male", "neutral", "non-binary"]);
const AGES = new Set(["young", "middle_aged", "middle aged", "old"]);
const SEP = " \u00b7 ";
const NOTE_SEP = " \u2014 ";

// "female · young — Calm narrator" -> { gender: "female", age: "young", note: "Calm narrator" }.
// Any other description (an older server's free text) is kept whole as the note.
export function voiceTags(description: string | null | undefined): { gender: string | null; age: string | null; note: string | null } {
  const text = String(description ?? "").trim();
  if (!text) return { gender: null, age: null, note: null };
  const cut = text.indexOf(NOTE_SEP);
  const head = cut < 0 ? text : text.slice(0, cut);
  const note = cut < 0 ? null : text.slice(cut + NOTE_SEP.length).trim() || null;
  const [g, a, ...rest] = head.split(SEP).map((p) => p.trim().toLowerCase());
  const gender = GENDERS.has(g) ? g : null;
  const age = a !== undefined && AGES.has(a) ? a.replace(" ", "_") : null;
  if (!gender || (a !== undefined && !age) || rest.length) return { gender: null, age: null, note: text };
  return { gender, age, note };
}

// A later page appended to the list; a voice already shown keeps its place.
export function appendVoices(shown: Voice[], page: Voice[]): Voice[] {
  const seen = new Set(shown.map((v) => v.voiceId));
  return [...shown, ...page.filter((v) => !seen.has(v.voiceId) && seen.add(v.voiceId))];
}

// Untrusted host output -> a page the picker can render.
export function normalizeVoicePage(raw: unknown): VoicePage {
  const r = raw as any;
  const list = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : [];
  const items: Voice[] = [];
  for (const v of list) {
    if (!v || typeof v.voiceId !== "string" || !v.voiceId) continue;
    items.push({
      voiceId: v.voiceId,
      name: typeof v.name === "string" && v.name ? v.name : v.voiceId,
      description: typeof v.description === "string" ? v.description : null,
      previewUrl: typeof v.previewUrl === "string" && /^https:\/\//.test(v.previewUrl) ? v.previewUrl : null,
    });
  }
  return { items, nextCursor: !Array.isArray(r) && typeof r?.nextCursor === "string" && r.nextCursor ? r.nextCursor : null };
}
