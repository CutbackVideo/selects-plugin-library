export type Article = { title: string; source: string; date: string; body: string };

export type Validation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: Record<string, number | string | Record<string, string>>;
};

export type ScriptSentence = { text: string; sourceQuote: string };
export type ScriptJson = { headline: { line1: string; line2: string }; sentences: ScriptSentence[] };

export type IdSentence = { id: string; text: string };
export type FidelityIssue = { kind: "meaning" | "number" | "unsupported" | "ai_tone" | "register"; note: string };
export type FidelitySentence = {
  id: string;
  text: string;
  sourceQuote: string;
  issues: FidelityIssue[];
  rewritten: boolean;
};
export type FidelityJson = {
  headline: { line1: string; line2: string; issues: FidelityIssue[] };
  sentences: FidelitySentence[];
};

export type PlanAsset = {
  ref: string;
  kind: "photo" | "illustration";
  caption?: string;
  credit?: string;
  // Article text right before the image, for graphics whose caption is only a credit line.
  context?: string;
  w?: number;
  h?: number;
};
export type TimedSentence = { id: string; text: string; startSec: number; endSec: number };
export type PlanScene = {
  sentenceIds: string[];
  type: string;
  params: Record<string, any>;
  hideCaption: boolean;
  disclaimer: boolean;
  assetRef?: string;
  // A validated scene-specific program can exceed the starting template's controls.
  program?: { tsxCode: string; editableParameters: any[]; sources: Array<{ ref: string; quote: string }> };
};
export type PlanJson = { scenes: PlanScene[] };
