import type { ApplyPlan } from "./applyPlan.ts";

export type ApplyScriptOptions = {
  draftId: string;
  mainEndFrame: number;
  label?: string;
};

export const APPLY_LABEL = "EO speaker framing";

export function buildApplyScript(plan: ApplyPlan, o: ApplyScriptOptions): string {
  const data = {
    draftId: o.draftId,
    mainEndFrame: o.mainEndFrame,
    label: o.label || APPLY_LABEL,
    boundaries: plan.boundaries,
    splits: plan.splits,
    targets: plan.targets.map((t) => ({ s: t.startFrame, e: t.endFrame, scale: t.transform.scale.x, x: t.transform.position.x, y: t.transform.position.y })),
  };
  return `const P = ${JSON.stringify(data)};
const d = selects.draft(P.draftId);
const readMain = async () => (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main").sort((a, b) => a.startFrame - b.startFrame);
const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
let main = await readMain();
const end = main.length ? main[main.length - 1].endFrame : 0;
if (end !== P.mainEndFrame) throw new Error("guard: Main ends at " + end + ", the plan expects " + P.mainEndFrame);
for (const c of main) {
  const sp = c.playbackSpeed;
  if (sp && sp.numerator !== sp.denominator) throw new Error("guard: Main clip " + c.startFrame + "-" + c.endFrame + " is not at 1x");
}
const allowed = new Set(P.boundaries.concat(P.splits));
const have = new Set(main.flatMap((c) => [c.startFrame, c.endFrame]));
for (const b of P.boundaries) if (!have.has(b)) throw new Error("guard: Main has no boundary at " + b + "; the draft changed since the analysis");
for (const b of have) if (!allowed.has(b)) throw new Error("guard: Main has an unplanned boundary at " + b + "; the draft changed since the analysis");
let splits = 0;
for (const k of P.splits) {
  if (have.has(k)) continue;
  await d.splitAt({ frame: k });
  splits += 1;
}
let set = 0, unchanged = 0;
for (const t of P.targets) {
  main = await readMain();
  const c = main.find((m) => m.startFrame === t.s && m.endFrame === t.e);
  if (!c) throw new Error("Main piece " + t.s + "-" + t.e + " was not found after the camera splits");
  const cur = await d.clipTransform(c);
  if (cur.enabled !== false && near(cur.scale.x, t.scale) && near(cur.scale.y, t.scale) && near(cur.position.x, t.x) && near(cur.position.y, t.y) && cur.rotation === 0 && cur.anchor.x === 0 && cur.anchor.y === 0) {
    unchanged += 1;
    continue;
  }
  await d.setClipTransform({ clip: c, enabled: true, scale: { x: t.scale, y: t.scale }, position: { x: t.x, y: t.y }, rotation: 0, anchor: { x: 0, y: 0 } });
  set += 1;
}
let commit = null;
if (splits || set) commit = await d.commitAll(P.label);
main = await readMain();
const mismatches = [];
for (const t of P.targets) {
  const c = main.find((m) => m.startFrame === t.s && m.endFrame === t.e);
  if (!c) { mismatches.push({ s: t.s, e: t.e, reason: "missing" }); continue; }
  const tr = await d.clipTransform(c);
  if (!(near(tr.scale.x, t.scale) && near(tr.scale.y, t.scale) && near(tr.position.x, t.x) && near(tr.position.y, t.y))) mismatches.push({ s: t.s, e: t.e, reason: "transform", got: tr });
}
return { splits, set, unchanged, committed: commit != null, commitId: commit ? commit.commitId : null, mismatches, pieces: main.length };
`;
}
