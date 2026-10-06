import type { Framing, Orientation, ShotCondition, ShotKind, ShotRequest } from "./types.ts";

export const FRAMING_WORDS: Record<Framing, string> = { wide: "wide shot", medium: "medium shot", close: "close up" };

export const FRAMING_MEANING: Record<Framing, string> = {
  wide: "a wide shot: the whole subject with room around it, the setting visible",
  medium: "a medium shot: people seen from about the waist up, or the subject at a middle distance",
  close: "a close shot: a face, hands or one object filling most of the frame",
};

const FRAMING_PATTERN = /\b(extreme\s+)?(wide|medium|close|long|full)[\s-]?(shot|up|body)\b|\bcloseup\b|\bclose-up\b/gi;

export function normalizeQuery(q: string): string {
  return String(q ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripFraming(q: string): string {
  return normalizeQuery(String(q ?? "").replace(FRAMING_PATTERN, " "));
}

const STOCK_CONDITIONS_HARD: ShotCondition[] = [
  { id: "h1", text: "No caption, title, logo or watermark laid over the picture", hard: true },
  { id: "h2", text: "One continuous camera shot, not a split screen or collage", hard: true },
];

const PERSON_CONDITIONS: ShotCondition[] = [
  { id: "p1", text: "A photograph of one real person, face clearly visible", hard: true },
  { id: "p2", text: "A real photograph, not a drawing, painting or illustration", hard: true },
];

export interface PlanShotLike {
  source: string;
  query?: string | null;
  mustShow?: string | null;
  framing?: string | null;
  name?: string | null;
  context?: string | null;
}

export interface ShotTiming {
  id: string;
  frames: number;
  fps: number;
  speedFactor?: number;
  avoidSources?: string[];
  contextText?: string;
  prefer?: Orientation;
  target?: { width: number; height: number };
}

export const MIN_USABLE_MARGIN_SECONDS = 0.3;

export function minUsableSeconds(frames: number, fps: number, speedFactor = 1): number {
  if (!(frames > 0) || !(fps > 0) || !(speedFactor > 0)) throw new RangeError("frames, fps and speed factor must be positive");
  return Math.round(((frames / fps) * speedFactor + MIN_USABLE_MARGIN_SECONDS) * 1000) / 1000;
}

function framingOf(v: unknown): Framing | undefined {
  return v === "wide" || v === "medium" || v === "close" ? v : undefined;
}

export function alternateQueries(query: string, mustShow?: string): string[] {
  const main = normalizeQuery(query);
  const out: string[] = [];
  for (const q of [stripFraming(query), mustShow ? stripFraming(mustShow) : ""]) {
    if (q && q !== main && !out.includes(q)) out.push(q);
  }
  return out;
}

export function buildShotRequest(shot: PlanShotLike, t: ShotTiming): ShotRequest | null {
  const kind: ShotKind | null = shot.source === "stock-video" ? "stock-video" : shot.source === "person" ? "person" : null;
  if (!kind) return null;
  const framing = framingOf(shot.framing);
  const min = minUsableSeconds(t.frames, t.fps, t.speedFactor ?? 1);
  const base = {
    schema: "shot-request/1" as const,
    id: t.id,
    kind,
    framing,
    minUsableSeconds: min,
    target: { width: t.target?.width ?? 1080, height: t.target?.height ?? 1920, allowCrop: true as const },
    prefer: { orientation: t.prefer ?? ("portrait" as Orientation) },
    avoidSources: [...new Set((t.avoidSources ?? []).filter(Boolean))],
    ...(t.contextText ? { contextText: t.contextText } : {}),
  };
  if (kind === "person") {
    const name = String(shot.name ?? "").trim();
    if (!name) throw new Error("Shot " + t.id + " is a person shot without a name.");
    return { ...base, query: name, alternateQueries: [], person: { name, context: String(shot.context ?? "").trim() }, conditions: PERSON_CONDITIONS.map((c) => ({ ...c })) };
  }
  const query = stripFraming(String(shot.query ?? ""));
  if (!query) throw new Error("Shot " + t.id + " is a stock shot without a query.");
  const mustShow = shot.mustShow ? String(shot.mustShow).trim() : undefined;
  const conditions: ShotCondition[] = [{ id: "c1", text: (mustShow || query) + " is clearly visible" }];
  if (framing) conditions.push({ id: "c2", text: "Shot size: " + FRAMING_MEANING[framing] });
  conditions.push(...STOCK_CONDITIONS_HARD.map((c) => ({ ...c })));
  return { ...base, query, alternateQueries: alternateQueries(query, mustShow), ...(mustShow ? { mustShow } : {}), conditions };
}

export interface PlannedSearch {
  query: string;
  orientation: Orientation;
  role: "framed" | "plain" | "alternate";
  round: number;
}

export function searchPlan(r: ShotRequest): PlannedSearch[] {
  const other: Orientation = r.prefer.orientation === "portrait" ? "landscape" : "portrait";
  const framed = r.framing ? normalizeQuery(r.query + " " + FRAMING_WORDS[r.framing]) : null;
  const first: { query: string; role: PlannedSearch["role"] }[] = [...(framed ? [{ query: framed, role: "framed" as const }] : []), { query: normalizeQuery(r.query), role: "plain" }];
  const out: PlannedSearch[] = [];
  const seen = new Set<string>();
  const add = (s: PlannedSearch) => {
    const k = s.query + "|" + s.orientation;
    if (!s.query || seen.has(k)) return;
    seen.add(k);
    out.push(s);
  };
  for (const o of [r.prefer.orientation, other]) for (const q of first) add({ ...q, orientation: o, round: 1 });
  for (const o of [r.prefer.orientation, other]) for (const q of r.alternateQueries) add({ query: normalizeQuery(q), role: "alternate", orientation: o, round: 2 });
  return out;
}

export function requestText(r: ShotRequest): string {
  if (r.kind === "person") return "A portrait photograph of one real person for a short film (identity is checked elsewhere).";
  const ctx = r.contextText ? ' The film\'s line over it: "' + r.contextText.slice(0, 160) + '".' : "";
  return "Stock footage for a vertical short film: " + r.query + "." + ctx;
}
