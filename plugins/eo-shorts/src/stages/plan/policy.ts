export const PLAN_ROLE = "plan";

export const PLAN_STAGE_VERSION = "plan-2";

export const PLAN_POLICY = {
  promptVersion: "planner-1-music" as "planner-1-music" | "planner-1",
  repair: true,
  wholeFilmFallback: false,
  longSourceWords: 250,
};

export type PlanPolicy = typeof PLAN_POLICY;
