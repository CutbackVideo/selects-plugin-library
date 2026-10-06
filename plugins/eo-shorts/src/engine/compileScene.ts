import { compile, executionText, type CompileInput, type CompileReport, type Execution } from "../../engine/compiler/core.mjs";
import { browserHost, type BrowserHostOptions } from "./browserHost.ts";

export type CompiledScene = {
  execution: Execution;
  text: string;
  report: CompileReport;
  ms: number;
};

export async function compileScene(input: CompileInput, host: BrowserHostOptions): Promise<CompiledScene> {
  const t0 = Date.now();
  const { execution, report } = await compile({ kerning: "normal", ...input }, browserHost(host));
  return { execution, text: executionText(execution), report, ms: Date.now() - t0 };
}
