import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { createAgentIdCodec } from "../electron/mcp/agent-id-codec";
import { RemotionSequenceRenderingValidator } from "@/external-services/out-adapter/RemotionSequenceRenderingValidator";
import { compileOverlayTsx } from "../electron/mcp/tools/overlay-compile";
import { execFileSync } from "node:child_process";
import { afterAll, afterEach, beforeAll, it, expect } from "vitest";
import { exportInput } from "@/external-services/out-adapter/export/scene/exportInput";
import { RemotionOverlayProjectionAdapter } from "@/js/main/adapters/remotion/RemotionOverlayProjectionAdapter";
import { Project } from "@/domain/model/project/Project";
import { Resource } from "@/domain/model/resource/Resource";
import { Clip } from "@/domain/model/sequence/Clip";
import { Sequence } from "@/domain/model/sequence/Sequence";
import { buildSkeletonAnalyzedSequence } from "@/domain/model/sequence/factory/ResourceAnalyzedSequenceFactory";
import { StoryboardService } from "@/domain/usecase/StoryboardService";
import { getMockGeneratorRepository } from "@/domain/out-port/GeneratorRepository";
import { getMockFileSystem } from "@/domain/out-port/FileSystem";
import { createLocalFilesBridge } from "@/mcp-bridge/localFilesBridge";
import { createMcpBridge } from "@/mcp-bridge/McpRendererBridge";
import { createQuerySdkSandbox } from "../electron/mcp/script-runtime/sdk";
import {
  createDeadline,
  executeQueryScript,
} from "../electron/mcp/script-runtime/run";
import { probeMedia } from "../electron/mcp/source-preparation/probe-media";

const library = process.env.GALLERY_LIBRARY_ROOT;
if (!library) throw Error("GALLERY_LIBRARY_ROOT is required");
const { buildScript } = await import(
  path.join(library, "plugins/photo-gallery-no2/operation-builder.mjs")
);
let root: string;
const ffmpeg = (args: string[]) =>
  execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-y", ...args], {
    stdio: "pipe",
  });
beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "gallery-sdk-contract-"));
  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    "color=c=red:s=64x96",
    "-frames:v",
    "1",
    path.join(root, "image.png"),
  ]);
  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    "testsrc2=s=64x96:r=60",
    "-t",
    "15",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-pix_fmt",
    "yuv420p",
    path.join(root, "video.mp4"),
  ]);
  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=48000",
    "-t",
    "15",
    "-c:a",
    "pcm_s16le",
    path.join(root, "audio.wav"),
  ]);
});
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
afterEach(() => {
  Resource.configureSequenceResolver(null as never);
  Clip.configureResourceSyncResolver(null as never);
  Clip.configureResourceResolver(null as never);
});

function fixture({
  mix = "mixed",
  music = true,
  change = null,
  aliases = true,
  variant = "plain",
}: {
  mix?: string;
  music?: boolean;
  change?: string | null;
  aliases?: boolean;
  variant?: string;
} = {}) {
  const directory = fs.mkdtempSync(path.join(root, "case-"));
  let project = Project.ofEmpty({
    libraryId: "test-library",
    title: "Disposable Gallery SDK contract",
  });
  const resources = new Map<string, any>(),
    sequences = new Map<string, any>(),
    generators = new Map<string, any>(),
    nodes: any[] = [],
    writes: string[] = [],
    requests: string[] = [];
  for (const [kind, name] of [
    ["image", "image.png"],
    ["video", "video.mp4"],
    ["audio", "audio.wav"],
  ]) {
    const file = path.join(directory, name);
    fs.copyFileSync(path.join(root, name), file);
    if (kind === "image" && variant !== "plain") {
      const [width, height] =
        variant === "landscape"
          ? [320, 96]
          : variant === "portrait"
            ? [96, 320]
            : [160, 160];
      const filter =
        variant === "landscape"
          ? "drawbox=x=iw/3:y=0:w=iw/3:h=ih:color=0x00ff00:t=fill,drawbox=x=2*iw/3:y=0:w=iw/3:h=ih:color=0x0000ff:t=fill"
          : variant === "portrait"
            ? "drawbox=x=0:y=ih/3:w=iw:h=ih/3:color=0x00ff00:t=fill,drawbox=x=0:y=2*ih/3:w=iw:h=ih/3:color=0x0000ff:t=fill"
            : null;
      ffmpeg([
        "-f",
        "lavfi",
        "-i",
        `color=c=0xff0000:s=${width}x${height}`,
        ...(filter ? ["-vf", filter] : []),
        "-frames:v",
        "1",
        file,
      ]);
    }
    const info = JSON.parse(
      execFileSync(
        "ffprobe",
        ["-v", "error", "-show_format", "-show_streams", "-of", "json", file],
        { encoding: "utf8" },
      ),
    );
    const size = info.streams.find(
      (stream: any) => stream.codec_type === "video",
    ) ?? { width: 64, height: 96 };
    let r = Resource.ofFile({
      libraryId: "test-library",
      file: {
        id: randomUUID(),
        name,
        path: file,
        type: kind,
        totalSeconds: 15,
        sampleRate: 48000,
        frameRate: 60,
        frameRateF: "60/1",
        width: size.width,
        height: size.height,
        checksum: kind,
        thumbnail: "",
        metadata: { ffprobe: info },
        audioSources: [],
      } as any,
    });
    const source = buildSkeletonAnalyzedSequence(r, project);
    if (source) {
      sequences.set(source.getId()!, source);
      r = r
        .setAnalyzedSequenceId(source.getId())
        .setAnalyzeFrameRateRatio(source.getFrameRateRatio());
    }
    resources.set(r.getId()!, r);
    nodes.push({
      type: kind,
      name,
      resourceId: r.getId(),
      path: file,
      hasTimecode: false,
      frameSize: { width: size.width, height: size.height },
      durationSeconds: 15,
    });
  }
  project = project.addResources([...resources.keys()]);
  Resource.configureSequenceResolver(
    async (_lib, id) => sequences.get(id) ?? null,
  );
  Clip.configureResourceResolver(async (_lib, id) => resources.get(id) ?? null);
  Clip.configureResourceSyncResolver((_lib, id) => resources.get(id) ?? null);
  const parts: any = {
    HostCapabilities: { supports: () => true },
    ListProject: { list: async () => [project] },
    ProjectRepository: {
      findById: async () => project,
      findBySequenceId: async (id: string) =>
        project.getEditedSequences().includes(id) ? project : null,
      save: async (p: any) => {
        project = p;
        writes.push("project");
      },
      flush: async () => {},
    },
    ResourceRepository: {
      findById: async (_lib: string, id: string) => resources.get(id) ?? null,
    },
    SequenceRepository: {
      findById: async (_lib: string, id: string) => sequences.get(id) ?? null,
      save: async (s: any) => {
        sequences.set(s.getId(), Sequence.ofJSON(s.toJSON()));
        writes.push("sequence");
      },
    },
    GeneratorRepository: getMockGeneratorRepository({
      findByIdSync: (_lib: string, id: string) => generators.get(id) ?? null,
      save: async (g: any) => {
        generators.set(g.getId(), g);
      },
    }),
    CaptionDocumentRepository: { findAllByDraftSequenceId: async () => [] },
    TranscriptTranslationRepository: { findBySequenceId: async () => null },
    RetakeGroupRepository: {
      findBySequenceId: async () => [],
      findById: async () => [],
    },
    ProjectFileTree: {
      listEnrichedFileTree: async () => structuredClone(nodes),
    },
    Storyboard: new StoryboardService(),
  };
  parts.SequenceHistory = {
    transact: async (_command: string, run: any) =>
      run({
        projects: parts.ProjectRepository,
        sequences: parts.SequenceRepository,
        generators: parts.GeneratorRepository,
        captionDocuments: parts.CaptionDocumentRepository,
      }),
  };
  const bridge: any = createMcpBridge(parts),
    local = createLocalFilesBridge(
      getMockFileSystem({
        isAbsolute: path.isAbsolute,
        statSync: (file: string) => {
          const s = fs.statSync(file);
          return {
            size: s.size,
            mtimeMs: s.mtimeMs,
            ino: s.ino,
            mode: s.mode,
            isDirectory: s.isDirectory(),
          };
        },
        readRange: async (file: string, offset: number, length: number) => {
          const handle = await fs.promises.open(file, "r");
          try {
            const buffer = Buffer.alloc(length),
              r = await handle.read(buffer, 0, length, offset);
            return buffer.subarray(0, r.bytesRead);
          } finally {
            await handle.close();
          }
        },
      }),
      {
        getPlatform: () => process.platform,
        getHostingVersion: () => "contract-fixture",
      },
    );
  bridge.localFiles = local;
  let placements = 0;
  const simulate = bridge.simulatePlaceBroll;
  bridge.simulatePlaceBroll = async (params: any) => {
    const result = await simulate(params);
    if (++placements === 21) {
      if (change === "bytes")
        fs.appendFileSync(
          nodes.find((n) => n.type === "video").path,
          "changed",
        );
      if (change === "metadata")
        nodes.find((n) => n.type === "video").frameSize.width++;
    }
    return result;
  };
  const commit = bridge.createDraftCommit;
  bridge.createDraftCommit = async (params: any) => {
    const result = await commit(params);
    if (change === "post-save")
      fs.appendFileSync(nodes.find((n) => n.type === "video").path, "changed");
    return result;
  };
  const run = async (script: string, allowCommit = false) => {
    const deadline = createDeadline(120000),
      sandbox = createQuerySdkSandbox({
        deadline,
        allowCommit,
        ...(aliases
          ? {
              agentIds: createAgentIdCodec(
                new Map([[project.getId()!, "test-library"]]),
              ),
            }
          : {}),
        sequenceRenderingValidator: new RemotionSequenceRenderingValidator(
          compileOverlayTsx,
          (source) => createHash("sha256").update(source).digest("hex"),
        ),
        executeJS: async (code) => {
          requests.push(code);
          const value = await new Function("window", "return (" + code + ")")({
            __MCP_BRIDGE__: bridge,
          });
          return value === undefined
            ? undefined
            : JSON.parse(JSON.stringify(value));
        },
        mediaHost: {
          probe: (input: { filePaths?: string[] }) =>
            probeMedia(input, {
              probeFiles: async (files: string[]) =>
                files.map((file) => ({
                  path: file,
                  name: path.basename(file),
                  ...JSON.parse(
                    execFileSync(
                      "ffprobe",
                      [
                        "-v",
                        "error",
                        "-show_format",
                        "-show_streams",
                        "-of",
                        "json",
                        file,
                      ],
                      { encoding: "utf8" },
                    ),
                  ),
                })),
              measureAudioLevel: () => ({
                status: "measurement_failed",
                reason: "Not needed for this contract probe",
              }),
            }),
          measureBeatSync: async () => {
            throw Error("Unexpected beat analysis");
          },
          captureFrames: async () => {
            throw Error("Unexpected capture");
          },
        } as any,
      });
    return executeQueryScript({
      script,
      sandbox,
      deadline,
      maxResultBytes: 256 * 1024,
    });
  };
  let latest: any;
  const create = async () => {
    const pid = project.getId()!,
      inspection = await run(
        buildScript({ operation: "inspect", projectId: pid }),
      );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) throw Error(inspection.message);
    const inventory: any = inspection.result;
    expect(inventory.media).toHaveLength(2);
    expect(inventory.audio).toHaveLength(1);
    for (const row of [...inventory.media, ...inventory.audio]) {
      if (aliases) expect(row.resourceId).toMatch(/^r\d+$/);
      else expect(resources.has(row.resourceId)).toBe(true);
    }
    const clock = await run(
      "const d=await selects.project(" +
        JSON.stringify(pid) +
        ').createDraft({name:"clock probe"});return (await d.meta()).fps;',
    );
    if (!clock.ok) throw Error(clock.message);
    const image = inventory.media.find((r: any) => r.kind === "image"),
      video = inventory.media.find((r: any) => r.kind === "video");
    const slots = new Set([4, 6, 11, 17, 19, 21]);
    const media = Array.from({ length: 21 }, (_, i) => ({
      ...(mix === "video" || (mix === "mixed" && slots.has(i + 1))
        ? video
        : image),
      focusX: variant === "landscape" ? (i % 3) / 2 : 0.5,
      focusY: variant === "portrait" ? (Math.floor(i / 3) % 3) / 2 : 0.5,
    }));
    latest = {
      operation: "create",
      projectId: pid,
      name: "Gallery SDK contract",
      fps: clock.result,
      durationFrames: 853,
      manualBpm: 113,
      media,
      music: music ? { ...inventory.audio[0], startFrame: 0 } : null,
    };
    return run(buildScript(latest), true);
  };
  return {
    create,
    run,
    writes,
    sequences,
    generators,
    resources,
    directory,
    requests,
    get latest() {
      return latest;
    },
    get project() {
      return project;
    },
  };
}
for (const mix of ["mixed", "image", "video"])
  for (const music of [false, true])
    it(
      "complete Gallery " +
        mix +
        " music=" +
        music +
        " passes real aliased SDK/bridge/Storyboard composition and commit",
      async () => {
        const f = fixture({ mix, music }),
          out = await f.create();
        expect(out.ok).toBe(true);
        if (!out.ok) throw Error(out.message);
        const result: any = out.result;
        expect(result.status, JSON.stringify(result)).toBe("saved");
        expect(result.clips).toHaveLength(21);
        expect(result.audio).toHaveLength(music ? 1 : 0);
        expect(f.project.getEditedSequences()).toEqual([result.draftId]);
        expect(f.writes).toEqual(["sequence", "project"]);
        const verified = await f.run(
          buildScript({
            ...f.latest,
            operation: "verifyCreated",
            draftId: result.draftId,
          }),
        );
        expect(verified.ok).toBe(true);
        if (verified.ok)
          expect(
            (verified.result as any).status,
            JSON.stringify(verified.result),
          ).toBe("verified");
        const verify = new Function(
          fs.readFileSync(
            path.join(library!, "shared/native-image-authoring.js"),
            "utf8",
          ) + ";return verifyAtomicImageDraft;",
        )();
        await expect(
          verify(
            {
              runScript: async (input: any) => {
                const r = await f.run(input.script, input.allowCommit);
                return r.ok
                  ? { result: r.result }
                  : { isError: true, output: r.message };
              },
            },
            f.project.getId(),
            result,
          ),
        ).resolves.toMatchObject({ draftId: result.draftId, status: "saved" });
      },
    );
for (const change of ["bytes", "metadata"])
  it(
    "real SDK Gallery rejects " +
      change +
      " changed after placement before commit",
    async () => {
      const f = fixture({ change }),
        out = await f.create();
      expect(out.ok).toBe(true);
      if (out.ok) {
        expect((out.result as any).status, JSON.stringify(out.result)).toBe(
          "notSaved",
        );
        expect((out.result as any).message).toMatch(
          /source.*changed|dimensions changed/i,
        );
      }
      expect(f.writes).toEqual([]);
      expect(f.project.getEditedSequences()).toEqual([]);
    },
  );
it("real SDK Gallery retains acknowledged identity after a post-save source change", async () => {
  const f = fixture({ change: "post-save" }),
    out = await f.create();
  expect(out.ok).toBe(true);
  if (out.ok) {
    const result: any = out.result;
    expect(result.status, JSON.stringify(result)).toBe("outcomeUnknown");
    expect(result.draftId).toBe(f.project.getEditedSequences()[0]);
    expect(typeof result.draftId).toBe("string");
  }
  expect(f.writes).toEqual(["sequence", "project"]);
});

it("Gallery keeps raw external SDK identities as well as in-app aliases", async () => {
  const f = fixture({ aliases: false }),
    r = await f.create();
  expect(r.ok).toBe(true);
  if (r.ok)
    expect((r.result as any).status, JSON.stringify(r.result)).toBe("saved");
  expect(f.writes).toEqual(["sequence", "project"]);
});

if (process.env.GALLERY_RENDER_FIXTURE_DIR)
  it("exports the saved Gallery through product projection for pixel validation", async () => {
    const destination = process.env.GALLERY_RENDER_FIXTURE_DIR;
    if (!destination) throw Error("GALLERY_RENDER_FIXTURE_DIR required");
    fs.mkdirSync(destination, { recursive: true });
    const variant = process.env.GALLERY_RENDER_VARIANT ?? "plain";
    if (!["plain", "landscape", "portrait", "square"].includes(variant))
      throw Error("Unknown render variant");
    const f = fixture({ music: false, variant }),
      r = await f.create();
    expect(r.ok).toBe(true);
    if (!r.ok) throw Error(r.message);
    const result: any = r.result;
    expect(result.status).toBe("saved");
    const sequence = f.sequences.get(result.draftId);
    const projection = new RemotionOverlayProjectionAdapter(
      { list: () => [] } as any,
      {
        findByIdSync: (_lib: string, id: string) => f.resources.get(id),
      } as any,
      getMockFileSystem({ pathToLocalURL: (p) => p }),
    );
    const snapshot = await projection.getSnapshotForExport(
      result.draftId,
      sequence,
      f.project,
    );
    expect(snapshot?.overlays).toHaveLength(21);
    const projected = await exportInput(
      sequence,
      [...f.resources.values()],
      snapshot!,
      true,
    );
    expect(projected.remotion?.programs).toHaveLength(21);
    expect(projected.scene.procedural?.length).toBe(21);
    const files = [...f.resources.values()].map((resource: any) => {
      const media = resource.getMedia(),
        filename = path.basename(media.path);
      fs.copyFileSync(media.path, path.join(destination, filename));
      return { originalPath: media.path, filename };
    });
    fs.writeFileSync(
      path.join(destination, "render-input.json"),
      JSON.stringify({
        ...projected,
        files,
        variant,
        receipt: result,
        sequence: sequence.toJSON(),
        resources: [...f.resources.values()].map((r: any) => r.toJSON()),
      }),
    );
  });
