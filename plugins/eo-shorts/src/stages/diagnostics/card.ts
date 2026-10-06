import type { HostFs } from "../../host/types.ts";
import { readJsonIfExists } from "../../host/fs.ts";
import type { Acceptance, Gate, GateId, GateStatus } from "./gates.ts";

export type CardRow = { id: GateId; label: string; status: GateStatus; text: string; detail: string | null; acceptance: boolean };

export type CardModel = {
  headline: string;
  tone: "success" | "error" | "muted";
  rows: CardRow[];
  mp4: string | null;
  sheets: string[];
  creditsText: string;
  credits: number;
  at: string | null;
};

type Diagnostics = { schema?: string; gates?: Gate[]; acceptance?: Acceptance; mp4?: string; frames?: { sheets?: string[] }; at?: string };

const LABELS: Record<GateId, string> = {
  G1: "Pace",
  G2: "Pauses",
  G3: "Music",
  G4: "Loudness",
  G5: "Format",
  G6: "Structure",
  G7: "Picture",
  G8: "Voice",
  G9: "Plan",
  G10: "Credits",
};

export function cardModel(diag: Diagnostics | null, credits: { credits?: unknown[]; text?: string } | null): CardModel | null {
  if (!diag?.gates?.length) return null;
  const acc = diag.acceptance;
  const inAcc = new Set(acc?.gates ?? []);
  const rows: CardRow[] = diag.gates.map((g) => ({
    id: g.id,
    label: g.id + " " + (LABELS[g.id] ?? g.name),
    status: g.status,
    text: g.summary,
    detail: g.status === "pass" ? null : g.problems[0] ?? (g.status === "skip" ? "not measured" : null),
    acceptance: inAcc.has(g.id),
  }));
  const notPassing = rows.filter((r) => r.status !== "pass");
  const headline = acc?.passed
    ? notPassing.length
      ? "The acceptance gates pass; " + notPassing.map((r) => r.id).join(", ") + " need a look."
      : "Every check passes."
    : "Not accepted: " + (acc?.failing ?? notPassing.map((r) => r.id)).join(", ") + (acc?.failing?.length === 1 ? " fails." : " fail.");
  return {
    headline,
    tone: acc?.passed ? (notPassing.length ? "muted" : "success") : "error",
    rows,
    mp4: diag.mp4 ?? null,
    sheets: diag.frames?.sheets ?? [],
    creditsText: credits?.text ?? "",
    credits: credits?.credits?.length ?? 0,
    at: diag.at ?? null,
  };
}

export async function loadCard(fs: HostFs, dir: string): Promise<CardModel | null> {
  const diag = await readJsonIfExists<Diagnostics | null>(fs, fs.join(dir, "diagnostics", "diagnostics.json"), null).catch(() => null);
  const credits = await readJsonIfExists<{ credits?: unknown[]; text?: string } | null>(fs, fs.join(dir, "credits.json"), null).catch(() => null);
  return cardModel(diag, credits);
}

export function statusIcon(status: GateStatus): "check" | "error" | "info" {
  return status === "pass" ? "check" : status === "fail" ? "error" : "info";
}
