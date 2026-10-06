import type { CardModel, CardRow } from "../stages/diagnostics/card.ts";
import { STAGE_IDS, type Job } from "../jobs/store.ts";
import { isMessageKey, t } from "./messages.ts";

export function cardIsCurrent(job: Pick<Job, "status" | "stages"> | null): boolean {
  return !!job && job.status === "done" && STAGE_IDS.every((id) => job.stages[id]?.status === "done");
}

export type CardDisplay = { current: boolean; note: string | null; mp4: string | null; copyCredits: boolean; frames: boolean };

export function cardDisplay(view: CardView, job: Pick<Job, "status" | "stages"> | null): CardDisplay {
  const current = cardIsCurrent(job);
  return { current, note: current ? null : t("card.stale"), mp4: current ? view.mp4 : null, copyCredits: current && view.hasCredits, frames: current && view.sheets.length > 0 };
}

export type CardGroup = { title: string; rows: (CardRow & { name: string })[] };

export type CardView = {
  headline: string;
  tone: CardModel["tone"];
  groups: CardGroup[];
  mp4: string | null;
  sheets: string[];
  hasCredits: boolean;
};

const gateName = (r: CardRow): string => {
  const key = "gate." + r.id;
  return r.id + " " + (isMessageKey(key) ? t(key) : r.label.replace(/^G\d+\s*/, ""));
};

export function cardView(m: CardModel | null): CardView | null {
  if (!m) return null;
  const rows = m.rows.map((r) => ({ ...r, name: gateName(r), detail: r.detail === "not measured" ? t("card.notMeasured") : r.detail }));
  const accepted = m.tone !== "error";
  const notPassing = rows.filter((r) => r.status !== "pass");
  const failingAcceptance = rows.filter((r) => r.acceptance && r.status !== "pass");
  let headline: string;
  if (accepted) headline = notPassing.length ? t("card.lookAt", { gates: notPassing.map((r) => r.id).join(", ") }) : t("card.allPass");
  else {
    const ids = (failingAcceptance.length ? failingAcceptance : notPassing).map((r) => r.id);
    headline = t(ids.length === 1 ? "card.notAcceptedOne" : "card.notAcceptedMany", { gates: ids.join(", ") });
  }
  const groups: CardGroup[] = [
    { title: t("card.acceptance"), rows: rows.filter((r) => r.acceptance) },
    { title: t("card.other"), rows: rows.filter((r) => !r.acceptance) },
  ].filter((g) => g.rows.length > 0);
  return { headline, tone: m.tone, groups, mp4: m.mp4, sheets: m.sheets, hasCredits: m.credits > 0 };
}
