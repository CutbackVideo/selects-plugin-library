import type { StageId } from "../jobs/store.ts";
import { SOURCE_CHANGED, UNKNOWN_PROGRESS } from "../stages/edit/inputs.ts";
import { t, type MessageKey } from "./messages.ts";

export type FailureAction = "resume" | "rebuild" | "make" | "update" | "none";

export type Failure = {
  text: string;
  detail: string;
  showDetail: boolean;
  action: FailureAction;
  key: MessageKey;
};

type Rule = { test: RegExp; key: MessageKey; action: FailureAction; showDetail?: boolean; notIn?: StageId[]; onlyIn?: StageId[] };

const literal = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

const RULES: Rule[] = [
  { test: /^Canceled\b|^Aborted|panel closed mid-/i, key: "fail.canceled", action: "resume" },
  { test: /Another run took over this job/i, key: "fail.leaseLost", action: "none" },
  { test: /Could not renew the job lease/i, key: "fail.leaseRenew", action: "resume" },
  { test: /plan model cannot run as configured/i, key: "fail.planSetup", action: "resume", showDetail: true },
  { test: /No plan came back/i, key: "fail.noPlan", action: "resume" },
  { test: /is too old; update Selects|needs Selects \d+\.\d+\.\d+ or later|Update Selects\./i, key: "fail.appOld", action: "update", showDetail: true },
  { test: /Generated-media authoring is off/i, key: "fail.authoring", action: "none", showDetail: true },
  { test: /exited with code 234|WavPack/i, key: "fail.audioFfmpeg", action: "resume", showDetail: true },
  { test: literal(SOURCE_CHANGED), key: "fail.sourceChanged", action: "make", showDetail: true },
  { test: literal(UNKNOWN_PROGRESS), key: "fail.oldRecord", action: "make", showDetail: true },
  { test: /no longer in its project|draft is not in the project|not in its project any more/i, key: "fail.draftGone", action: "make" },
  { test: /Sequence not found|Draft sequence not found|Draft \S+ was not found|draft .*does not exist/i, key: "fail.sourceGone", action: "none", showDetail: true, onlyIn: ["preflight"] },
  { test: /would cut (?:this clip|these clips) in two|cannot put (?:it|them) back/i, key: "fail.crossing", action: "resume", showDetail: true },
  { test: /not at 1x|at 1x speed|every clip at 1x/i, key: "fail.retimed", action: "resume", showDetail: true, notIn: ["preflight"] },
  {
    test: new RegExp(
      [
        "guard: (?:the draft's words changed|Main now ends|the draft is now|the EO draft changed|the source draft's Main|Main ends at|Main has (?:no|an unplanned) boundary|Main's pieces changed)",
        "EO draft changed|EO draft was edited|does not match its source any more",
        "EO draft's Main ends at frame",
        "EO draft's words changed",
        "but the EO draft's Main ends at",
        "guard: scene \\S+ .* is outside Main",
      ].join("|"),
      "i",
    ),
    key: "fail.draftChanged",
    action: "resume",
    showDetail: true,
  },
  { test: /package has no fonts|Install the plugin again/i, key: "fail.noFonts", action: "none", showDetail: true },
  { test: /Failed to fetch|NetworkError|network error|ENOTFOUND|ECONNREFUSED/i, key: "fail.offline", action: "resume" },
];

export function explainFailure(stage: StageId, error: string | null | undefined): Failure {
  const detail = String(error ?? "").trim();
  for (const r of RULES) {
    if (r.notIn?.includes(stage) || (r.onlyIn && !r.onlyIn.includes(stage))) continue;
    if (r.test.test(detail)) return { text: t(r.key), detail, showDetail: !!r.showDetail, action: r.action, key: r.key };
  }
  if (stage === "preflight" && detail) return { text: t("fail.source"), detail, showDetail: true, action: "resume", key: "fail.source" };
  return { text: t("fail.generic"), detail, showDetail: false, action: "resume", key: "fail.generic" };
}
