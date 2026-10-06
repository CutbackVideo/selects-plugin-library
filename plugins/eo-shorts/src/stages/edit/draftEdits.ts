import type { PanelSdk } from "../../host/types.ts";
import { readScript, runScript, type RunScriptOptions } from "../../host/runScript.ts";
import {
  duplicateScript,
  findByNameScript,
  readStateScript,
  removeFramesScript,
  silenceScript,
  stateScript,
  type DuplicateInput,
  type RemoveFramesInput,
  type SilenceInput,
} from "./scripts.ts";
import type { Segment } from "./clauses.ts";
import type { EditWord } from "./words.ts";

export type LightState = { mainEnd: number; durationFrames: number; fps: number; sig: string; textSig: string; count: number };

export type DraftState = LightState & {
  name: string | null;
  frameSize: { width: number; height: number };
  mainClips: number;
  retimed: number;
  tracks: { kind: string; clips: number; end: number; media: number }[];
  words: EditWord[] | null;
  segments: Segment[] | null;
};

export type ScriptOpts = Pick<RunScriptOptions, "signal" | "backoffMs" | "sleepFn">;

export function readDraftState(sdk: PanelSdk, draftId: string, what: { words?: boolean; segments?: boolean }, o: ScriptOpts = {}): Promise<DraftState> {
  return readScript<DraftState>(sdk, "Read the EO draft", readStateScript(draftId, what), o);
}

export function readLightState(sdk: PanelSdk, draftId: string, o: ScriptOpts = {}): Promise<LightState> {
  return readScript<LightState>(sdk, "Check the EO draft", stateScript(draftId), o);
}

export const light = (s: LightState): LightState => ({ mainEnd: s.mainEnd, durationFrames: s.durationFrames, fps: s.fps, sig: s.sig, textSig: s.textSig, count: s.count });

export type DuplicateResult = {
  draftId: string;
  existed: boolean;
  removedClips?: number;
  resetTransforms?: number;
  copiedBy?: "duplicate" | "insert";
  recoveredBy?: "verify";
};

export async function makeEoDraft(sdk: PanelSdk, input: DuplicateInput, o: ScriptOpts = {}): Promise<DuplicateResult> {
  const find = () => readScript<{ draftId: string | null }>(sdk, "Find the EO draft", findByNameScript(input.projectId, input.name), o);
  const out = await runScript<DuplicateResult>(sdk, {
    summary: "Make the EO draft",
    script: duplicateScript(input),
    allowCommit: true,
    ...o,
    verify: async () => ((await find()).draftId ? "done" : "retry"),
  });
  if (out.recoveredBy === "verify" || !out.result?.draftId) {
    const found = await find();
    if (!found.draftId) throw new Error("The EO draft was made but cannot be found by its name “" + input.name + "”.");
    return { draftId: found.draftId, existed: true, recoveredBy: "verify" };
  }
  return out.result;
}

export type RemoveResult = { already: boolean; removedText?: string[]; diff?: unknown; commitId?: string | null; after: LightState; recoveredBy?: "verify" };

export async function removeFrames(sdk: PanelSdk, input: RemoveFramesInput, summary: string, o: ScriptOpts = {}): Promise<RemoveResult> {
  const out = await runScript<RemoveResult>(sdk, {
    summary,
    script: removeFramesScript(input),
    allowCommit: true,
    ...o,
    verify: async () => {
      const s = await readLightState(sdk, input.draftId, o);
      if (s.mainEnd === input.expect.mainEnd && s.textSig === input.expect.textSig) return "done";
      if (s.mainEnd === input.guard.mainEnd && s.sig === input.guard.sig) return "retry";
      return "fail";
    },
  });
  if (out.recoveredBy === "verify") return { already: true, after: light(await readLightState(sdk, input.draftId, o)), recoveredBy: "verify" };
  return { ...out.result, after: light(out.result.after) };
}

export type SilenceResult = {
  already: boolean;
  rows: number;
  cutFrames?: [number, number][];
  restoreRows?: number;
  diff?: unknown;
  commitId?: string | null;
  after: LightState;
};

export async function cutPauses(sdk: PanelSdk, input: SilenceInput, o: ScriptOpts = {}): Promise<SilenceResult> {
  const out = await runScript<SilenceResult>(sdk, {
    summary: "Tighten the pauses",
    script: silenceScript(input),
    allowCommit: true,
    ...o,
    verify: async () => {
      const s = await readLightState(sdk, input.draftId, o);
      return s.textSig === input.guard.textSig ? "retry" : "fail";
    },
  });
  return { ...out.result, after: light(out.result.after) };
}
