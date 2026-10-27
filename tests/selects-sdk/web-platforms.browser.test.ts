import { expect, it } from "vitest";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import safeZones from "@plugin-library/short-form-safe-zones/panel.tsx?raw";
import ali from "@plugin-library/ali-abdaal-style/panel.tsx?raw";
import { BrowserPanelCompiler } from "@/external-services/out-adapter/web/BrowserPanelCompiler";
import { createQuerySdkSandbox } from "@shared/script-runtime/sdk";
import { createDeadline } from "@shared/script-runtime/deadline";
import {
  Sequence,
  Track,
  Clip,
  sequenceFromJson,
} from "@shared/script-runtime/domain";
import { TimelineTimebase } from "@/domain/model/time/TimelineTimebase";
import { createRemotionGeneratorSource } from "@/domain/model/generator/GeneratedMedia";
import { RemotionSequenceRenderingValidator } from "@/external-services/out-adapter/RemotionSequenceRenderingValidator";
import { sha256Hex } from "@shared/crypto";

const compile = (source: string) =>
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

it.each([
  ["short-form-safe-zones", safeZones],
  ["ali-abdaal-style", ali],
])(
  "%s compiles in the actual browser worker with only React imports",
  async (_id, source) => {
    const result = await new BrowserPanelCompiler().compile(source);
    const module = { exports: {} as any };
    new Function("require", "module", "exports", result.code)(
      (name: string) => {
        if (name === "react") return React;
        if (name === "react/jsx-runtime") return jsx;
        throw new Error("Unexpected native dependency: " + name);
      },
      module,
      module.exports,
    );
    expect(typeof module.exports.default).toBe("function");
  },
  60000,
);

it("safe zones read/add/update/remove runs in Chromium against the real shared editing SDK", async () => {
  const builderSource = safeZones
    .slice(0, safeZones.indexOf("\nexport default"))
    .replace(/^import .* from "react";$/m, "");
  const buildScript = new Function(
    compile(builderSource) + ";return buildScript;",
  )();
  const timebase = TimelineTimebase.fromFrameRateFraction("30/1");
  let sequence = Sequence.of({
    id: "draft",
    libraryId: "library",
    markers: [],
    lastClipId: 2,
    frameRateRatio: { numerator: 30, denominator: 1 },
    frameSize: { width: 1080, height: 1920 },
    sampleRate: 48000,
    tracks: {
      children: [
        Track.of({
          id: "main",
          kind: "Main",
          timebase,
          children: [Clip.ofGap({ id: 1, timebase, duration: 90 })],
        }),
        Track.of({
          id: "video",
          kind: "Video",
          timebase,
          children: [
            Clip.ofClip({
              id: 2,
              timebase,
              sourceRange: { startTime: 0, duration: 90 },
              mediaReferences: {
                defaultMedia: {
                  schema: "Cutback.GeneratorReference.1",
                  ...createRemotionGeneratorSource({
                    name: "Background",
                    rawTsx: "export default () => null;",
                    parameters: {},
                    editableParameters: [],
                  }),
                },
              },
            }),
          ],
        }),
      ],
    },
  });
  let staged: any;
  let generatorJsons: any[] = [];
  let commits = 0;
  const run = async (mode: string) => {
    const runtime = createQuerySdkSandbox({
      deadline: createDeadline(15000),
      allowCommit: true,
      sequenceRenderingValidator: new RemotionSequenceRenderingValidator(
        async (source) => compile(source),
        sha256Hex,
      ),
      executeJS: async (code) => {
        if (code.includes("getDraftCore"))
          return {
            sequenceJson: sequence.toJSON(),
            transcriptResources: [],
            generatorJsons,
            owner: { libraryId: "library", projectId: "project" },
            isEditedDraft: true,
          };
        throw new Error("Unexpected host request: " + code);
      },
      stagedEditGateway: {
        register: (params) => {
          staged = params;
          return {
            editId: "edit",
            baseRevision: "before",
            stagedRevision: "after",
            expiresAt: Date.now() + 15000,
          };
        },
        apply: async () => {
          sequence = sequenceFromJson(staged.stagedSequenceJson);
          generatorJsons = staged.generatorJsons ?? [];
          commits++;
          return {
            status: "applied",
            editId: "edit",
            commitId: "commit",
            sequenceId: "draft",
            beforeRevision: "before",
            afterRevision: "after",
            diff: staged.summary,
          };
        },
        revert: async () => {
          throw new Error("Unexpected revert");
        },
      },
    });
    const script = buildScript(
      "draft",
      mode,
      {
        platform: "shorts",
        zones: true,
        ui: true,
        thirds: true,
        centre: false,
        crops: false,
        safeBoxes: true,
        opacity: 80,
      },
      new Proxy({}, { get: (_t, key) => String(key) }),
    );
    return new AsyncFunction("selects", compile(script))(runtime.selects);
  };
  expect(await run("read")).toMatchObject({ count: 0 });
  await run("add");
  expect(await run("read")).toMatchObject({ count: 1 });
  await run("add");
  expect(await run("read")).toMatchObject({ count: 1 });
  await run("remove");
  expect(await run("read")).toMatchObject({ count: 0 });
  expect(commits).toBe(3);
}, 60000);
