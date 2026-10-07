import type { YuNetFace } from "./faces.ts";
import { type DecodeSpan, type PassOptions, type SourceRange, type VideoProbe, PASS_DEFAULTS, analysisPassArgs, analysisSize, planDecodeSpans, readPass, sampleStep } from "./ffmpegPass.ts";
import { type CameraSegment, cameraSegments } from "./cameraCuts.ts";
import { type FaceBox, type FaceSample, type SegmentFaces, plausibleFaces, segmentFaces, toSourceFaces } from "./faces.ts";
import { type CentreRule, type ClipTransformValue, type PortraitFill, type Size, cropWindow, portraitFill, segmentCentre, transformForCentre } from "./framing.ts";
import { type ApplyPlan, type PlacedPiece, type SegmentFraming, planApply, shownFrames } from "./applyPlan.ts";
import { type Observations, buildObservations } from "./observations.ts";
import { type MainPiece, type SeamLite, type WordLite, nonUnitSpeedPieces, pieceSourceOffsets, pieceSourceRange } from "./sourceTime.ts";

export type SpeakerInput = {
  draftId: string;
  draftFps: number;
  frameSize: Size;
  durationFrames: number;
  pieces: MainPiece[];
  words: WordLite[];
  seams: SeamLite[];
  resources: Record<string, { fps: number; path: string }>;
};

export type SpeakerHost = {
  probe(path: string): Promise<VideoProbe>;
  ffmpeg(args: string[], signal?: AbortSignal): Promise<string>;
  readRange(path: string, offset: number, length: number): Promise<Uint8Array>;
  remove(path: string): void;
  scratchPath(name: string): string;
  detect?(bgr: Uint8Array, width: number, height: number): Promise<YuNetFace[]>;
  detectSamples?(path: string, times: number[], fps: number, size?: Size): Promise<FaceBox[][]>;
  progress?(message: string): void;
};

type SampleReport = { t: number; frame: number; visible: boolean; detected: boolean; faces: FaceBox[] };

export type SpanReport = DecodeSpan & {
  probe: VideoProbe;
  step: number;
  analysis: Size;
  cuts: { frame: number; time: number; score: number }[];
  samples: SampleReport[];
  stills: (SampleReport & { segmentId: string })[];
};

export type FacesJson = {
  schema: "eo-speaker-faces/1";
  detector: { model: "yunet-2023mar"; score: number; analysisLongSide: number; sampleFps: number; scdetThreshold: number };
  spans: SpanReport[];
};

export type FacesFrom = "visible" | "all" | "still";

export const MIN_VISIBLE_SAMPLES = 3;

export type SegmentReport = CameraSegment & { faces: SegmentFaces; facesFrom: FacesFrom; cx: number; rule: CentreRule; transform: ClipTransformValue; cropWindow: { x0: number; w: number; h: number } };

export type FramingJson = {
  schema: "eo-speaker-framing/1";
  draftId: string;
  draftFps: number;
  output: Size;
  sources: Record<string, { size: Size; fill: PortraitFill }>;
  pieces: PlacedPiece[];
  segments: SegmentReport[];
  plan: ApplyPlan;
  warnings: string[];
};

export type SpeakerResult = { faces: FacesJson; framing: FramingJson; observations: Observations; plan: ApplyPlan };

const r2 = (x: number) => Math.round(x * 100) / 100;
const roundBox = (f: FaceBox): FaceBox => ({ x: r2(f.x), y: r2(f.y), w: r2(f.w), h: r2(f.h), score: Math.round(f.score * 1000) / 1000, landmarks: f.landmarks.map((p) => [r2(p[0]), r2(p[1])] as [number, number]) });

export async function analyzeSpeaker(input: SpeakerInput, host: SpeakerHost, o: PassOptions & { signal?: AbortSignal } = {}): Promise<SpeakerResult> {
  const progress = host.progress || (() => {});
  const slow = nonUnitSpeedPieces(input.pieces);
  if (slow.length) throw new Error("Main has " + slow.length + " clip(s) not at 1x; the speaker framing and the native export need 1x.");
  const resFps = (rid: string | null) => (rid != null && input.resources[rid] ? input.resources[rid].fps : NaN);
  const pathOf = (rid: string | null) => (rid != null && input.resources[rid] ? input.resources[rid].path : null);
  const pieces: PlacedPiece[] = pieceSourceOffsets(input.pieces, input.words, input.seams, input.draftFps, resFps).map((p) => ({ ...p, path: pathOf(p.resourceId) }));
  const warnings: string[] = [];
  const ranges: SourceRange[] = [];
  for (const p of pieces) {
    const r = pieceSourceRange(p, input.draftFps);
    if (!r) continue;
    if (p.path == null) {
      warnings.push("Main piece " + p.startFrame + "–" + p.endFrame + " has no media file to analyse.");
      continue;
    }
    ranges.push({ resourceId: p.resourceId, path: p.path, start: r[0], end: r[1] });
  }
  if (!ranges.length) throw new Error("No Main piece could be placed in its source: the draft has no words with source times.");
  const spans = planDecodeSpans(ranges);
  const probes = new Map<string, VideoProbe>();
  const spanReports: SpanReport[] = [];
  const segReports: SegmentReport[] = [];
  const sources: FramingJson["sources"] = {};
  const cancelled = () => {
    if (o.signal && o.signal.aborted) throw new Error("The speaker analysis was cancelled.");
  };
  for (let i = 0; i < spans.length; i += 1) {
    const span = spans[i];
    cancelled();
    let probe = probes.get(span.path);
    if (!probe) {
      probe = await host.probe(span.path);
      probes.set(span.path, probe);
    }
    const pr = probe;
    const src: Size = { width: pr.width, height: pr.height };
    const fill = portraitFill(src, input.frameSize);
    sources[span.path] = { size: src, fill };
    const size = analysisSize(pr.width, pr.height, o.longSide ?? PASS_DEFAULTS.longSide);
    const fb = size.width * size.height * 3;
    const out = host.scratchPath("speaker-span-" + (i + 1) + ".bgr");
    progress("Finding camera cuts and the speaker's face (" + (i + 1) + "/" + spans.length + ")…");
    let stderr: string;
    try {
      const args = analysisPassArgs(span, pr, out, o);
      if (host.detectSamples) args.splice(args.length - 3, 3, "-f", "null", "-");
      stderr = await host.ffmpeg(args, o.signal);
    } catch (e) {
      host.remove(out);
      throw e;
    }
    const pass = readPass(span, pr, stderr);
    const shown = pieces.filter((p) => p.path === span.path && p.t0 != null);
    const visibleAt = (t: number) => shown.some((p) => {
      const r = pieceSourceRange(p, input.draftFps)!;
      return t >= r[0] && t < r[1];
    });
    const prefix = spans.length > 1 ? "s" + (i + 1) + "-cam" : "cam";
    const segments = cameraSegments(span, pass.cuts, prefix)
      .filter((seg) => shown.some((p) => shownFrames(p, seg.start, seg.end, input.draftFps) != null))
      .map((seg, j) => ({ ...seg, id: prefix + (j + 1) }));
    const samples = pass.samples.map((s) => ({ ...s, visible: visibleAt(s.time), detected: false, faces: [] as FaceBox[] }));
    const stills: SpanReport["stills"] = [];
    const facesOf = async (bytes: Uint8Array) => plausibleFaces(toSourceFaces(await host.detect!(bytes, size.width, size.height), size.width, size.height, pr.width, pr.height), pr.width, pr.height);
    const shared = host.detectSamples && samples.length ? await host.detectSamples(span.path, samples.map(s => s.time), pr.fps, src) : null;
    const detect = async (s: (typeof samples)[number]) => {
      if (s.detected) return;
      cancelled();
      if (shared) { s.faces = plausibleFaces(shared[samples.indexOf(s)] || [], pr.width, pr.height); s.detected = true; return; }
      const bytes = await host.readRange(out, s.index * fb, fb);
      s.detected = true;
      if (bytes.length < fb) return;
      s.faces = await facesOf(bytes);
    };
    const still = async (seg: CameraSegment): Promise<FaceSample | null> => {
      const frames = (lo: number, hi: number) => [Math.ceil(lo * pr.fps - 1e-6), Math.ceil(hi * pr.fps - 1e-6)];
      let [c0, c1] = frames(seg.start, seg.end);
      let longest = 0;
      for (const p of shown) {
        const f = shownFrames(p, seg.start, seg.end, input.draftFps);
        if (!f || f[1] - f[0] <= longest) continue;
        const c = frames(Math.max(seg.start, p.t0! + f[0] / input.draftFps), Math.min(seg.end, p.t0! + f[1] / input.draftFps));
        if (c[1] > c[0]) [c0, c1, longest] = [c[0], c[1], f[1] - f[0]];
      }
      if (c1 <= c0) return null;
      const c = Math.floor((c0 + c1 - 1) / 2);
      const at = (c - 0.25) / pr.fps + pr.startOffset;
      const one: DecodeSpan = { path: span.path, resourceIds: span.resourceIds, start: at, end: at + 1.5 / pr.fps };
      const file = host.scratchPath("speaker-span-" + (i + 1) + "-" + seg.id + ".bgr");
      try {
        cancelled();
        const args = analysisPassArgs(one, pr, file, o);
        if (host.detectSamples) args.splice(args.length - 3, 3, "-f", "null", "-");
        const got = readPass(one, pr, await host.ffmpeg(args, o.signal)).samples[0];
        if (!got || got.time < seg.start || got.time >= seg.end) return null;
        const faces = host.detectSamples ? plausibleFaces((await host.detectSamples(span.path, [got.time], pr.fps, src))[0], pr.width, pr.height) : await (async () => { const bytes = await host.readRange(file, 0, fb); return bytes.length < fb ? [] : await facesOf(bytes); })();
        stills.push({ segmentId: seg.id, t: got.time, frame: got.frame, visible: visibleAt(got.time), detected: true, faces });
        return { t: got.time, frame: got.frame, faces };
      } finally {
        host.remove(file);
      }
    };
    try {
      for (const s of samples) if (s.visible) await detect(s);
      for (const seg of segments) {
        const inSeg = samples.filter((s) => s.time >= seg.start && s.time < seg.end);
        let use = inSeg.filter((s) => s.visible);
        let from: FacesFrom = "visible";
        if (use.length < MIN_VISIBLE_SAMPLES && inSeg.length > use.length) {
          for (const s of inSeg) await detect(s);
          use = inSeg;
          from = "all";
        }
        let faceSamples = use.map((s): FaceSample => ({ t: s.time, frame: s.frame, faces: s.faces }));
        if (!faceSamples.length) {
          const one = await still(seg);
          if (one) {
            faceSamples = [one];
            from = "still";
          }
        }
        const faces = segmentFaces(faceSamples);
        const centre = segmentCentre(faces, src, input.frameSize);
        const transform = transformForCentre(centre.cx, centre.cy, src, input.frameSize);
        if (centre.rule === "no-face") warnings.push("Camera segment " + seg.id + " has no face; it is cropped at the centre.");
        segReports.push({ ...seg, faces, facesFrom: from, cx: centre.cx, rule: centre.rule, transform, cropWindow: cropWindow(centre.cx, src, input.frameSize) });
      }
    } finally {
      host.remove(out);
    }
    spanReports.push({
      ...span,
      probe: pr,
      step: sampleStep(pr.fps, o.sampleFps ?? PASS_DEFAULTS.sampleFps),
      analysis: size,
      cuts: pass.cuts,
      samples: samples.map((s) => ({ t: Math.round(s.time * 1e6) / 1e6, frame: s.frame, visible: s.visible, detected: s.detected, faces: s.faces.map(roundBox) })),
      stills: stills.map((s) => ({ ...s, t: Math.round(s.t * 1e6) / 1e6, faces: s.faces.map(roundBox) })),
    });
  }
  const framings: SegmentFraming[] = segReports.map((s) => ({ id: s.id, path: s.path, resourceIds: s.resourceIds, start: s.start, end: s.end, cut: s.cut, cx: s.cx, transform: s.transform }));
  const plan = planApply(pieces, framings, input.draftFps);
  const firstSource = spanReports[0] ? { width: spanReports[0].probe.width, height: spanReports[0].probe.height } : input.frameSize;
  const observations = buildObservations({ segments: segReports.map((s) => ({ id: s.id, faces: s.faces })), targets: plan.targets, durationFrames: input.durationFrames, source: firstSource });
  return {
    faces: {
      schema: "eo-speaker-faces/1",
      detector: { model: "yunet-2023mar", score: 0.85, analysisLongSide: o.longSide ?? PASS_DEFAULTS.longSide, sampleFps: o.sampleFps ?? PASS_DEFAULTS.sampleFps, scdetThreshold: o.threshold ?? PASS_DEFAULTS.threshold },
      spans: spanReports,
    },
    framing: {
      schema: "eo-speaker-framing/1",
      draftId: input.draftId,
      draftFps: input.draftFps,
      output: input.frameSize,
      sources,
      pieces,
      segments: segReports,
      plan,
      warnings: warnings.concat(plan.warnings),
    },
    observations,
    plan,
  };
}

export function analysisCacheKey(parts: { files: { path: string; size: number; mtimeMs: number }[]; modelSha256: string; spans: DecodeSpan[]; options?: PassOptions }): string {
  const o = { ...PASS_DEFAULTS, ...(parts.options || {}) };
  return JSON.stringify({
    v: 1,
    files: parts.files.map((f) => [f.path, f.size, Math.round(f.mtimeMs)]).sort(),
    model: parts.modelSha256,
    spans: parts.spans.map((s) => [s.path, Math.round(s.start * 1e6), Math.round(s.end * 1e6)]),
    pass: [o.threshold, o.sampleFps, o.longSide],
  });
}
