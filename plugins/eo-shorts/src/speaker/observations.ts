import type { SegmentFaces } from "./faces.ts";
import type { FramingTarget } from "./applyPlan.ts";
import type { Size } from "./framing.ts";

export type ObservedSegment = { id: string; faces: SegmentFaces };

export type ObservedAngle = {
  id: string;
  label: string;
  facing: "front" | "side" | "unknown";
  shotSize: "wide" | "medium" | "medium close-up" | "close-up" | "unknown";
  position: "face left of centre" | "face centred" | "face right of centre" | "no face found";
  faceHeight: number | null;
  faceCentreX: number | null;
  yaw: number | null;
  segments: string[];
  frames: [number, number][];
};

export type Observations = {
  schema: "eo-speaker-observations/1";
  rawFootage: string;
  cameraFootageAvailableThroughout: boolean;
  faceVisibleRatio: number;
  maxFacesInFrame: number;
  angles: ObservedAngle[];
  warnings: string[];
};

export const ANGLE_RULES = { sameCentre: 0.06, sameSize: 1.25, sameYaw: 0.25, sideYaw: 0.35, minCoverage: 0.5, throughoutCoverage: 0.8 } as const;

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const count = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));

function shotSize(h: number | null): ObservedAngle["shotSize"] {
  if (h == null) return "unknown";
  return h < 0.12 ? "wide" : h < 0.25 ? "medium" : h < 0.4 ? "medium close-up" : "close-up";
}

function position(x: number | null): ObservedAngle["position"] {
  if (x == null) return "no face found";
  return x < 0.42 ? "face left of centre" : x > 0.58 ? "face right of centre" : "face centred";
}

export function buildObservations(input: {
  segments: ObservedSegment[];
  targets: FramingTarget[];
  durationFrames: number;
  source: Size;
}): Observations {
  const { segments, targets, durationFrames, source } = input;
  const warnings: string[] = [];
  const visibleFrames = new Map<string, number>();
  for (const t of targets) if (t.segmentId) visibleFrames.set(t.segmentId, (visibleFrames.get(t.segmentId) || 0) + t.endFrame - t.startFrame);
  const used = segments.filter((s) => visibleFrames.has(s.id));

  type Group = { segs: ObservedSegment[]; cx: number | null; h: number | null; yaw: number | null };
  const groups: Group[] = [];
  for (const s of used.slice().sort((a, b) => (visibleFrames.get(b.id) || 0) - (visibleFrames.get(a.id) || 0))) {
    const f = s.faces;
    const hasFace = f.cx != null && f.faceH != null && f.coverage >= ANGLE_RULES.minCoverage;
    const g = groups.find((g) => {
      if (!hasFace || g.cx == null) return !hasFace && g.cx == null;
      const ratio = Math.max(f.faceH! / g.h!, g.h! / f.faceH!);
      return Math.abs(f.cx! - g.cx) <= ANGLE_RULES.sameCentre * source.width && ratio <= ANGLE_RULES.sameSize && Math.abs((f.yaw ?? 0) - (g.yaw ?? 0)) <= ANGLE_RULES.sameYaw;
    });
    if (g) g.segs.push(s);
    else groups.push({ segs: [s], cx: hasFace ? f.cx : null, h: hasFace ? f.faceH : null, yaw: hasFace ? f.yaw : null });
  }
  const segAngle = new Map<string, number>();
  groups.forEach((g, i) => g.segs.forEach((s) => segAngle.set(s.id, i)));
  const frames: [number, number][][] = groups.map(() => []);
  for (const t of targets.slice().sort((a, b) => a.startFrame - b.startFrame)) {
    const i = t.segmentId != null ? segAngle.get(t.segmentId) : undefined;
    if (i == null) continue;
    const list = frames[i];
    const last = list[list.length - 1];
    if (last && last[1] + 1 === t.startFrame) last[1] = t.endFrame - 1;
    else list.push([t.startFrame, t.endFrame - 1]);
  }
  const order = groups.map((_, i) => i).sort((a, b) => (frames[a][0]?.[0] ?? Infinity) - (frames[b][0]?.[0] ?? Infinity));
  const angles: ObservedAngle[] = order.map((gi, n) => {
    const g = groups[gi];
    const facing: ObservedAngle["facing"] = g.yaw == null ? "unknown" : Math.abs(g.yaw) < ANGLE_RULES.sideYaw ? "front" : "side";
    const h = g.h == null ? null : g.h / source.height;
    const x = g.cx == null ? null : g.cx / source.width;
    const size = shotSize(h);
    return {
      id: String.fromCharCode(65 + n),
      label: g.cx == null ? "no face" : facing + " " + size,
      facing,
      shotSize: size,
      position: position(x),
      faceHeight: h == null ? null : r3(h),
      faceCentreX: x == null ? null : r3(x),
      yaw: g.yaw == null ? null : r3(g.yaw),
      segments: g.segs.map((s) => s.id),
      frames: frames[gi],
    };
  });
  for (const a of angles) if (angles.filter((b) => b.label === a.label).length > 1) a.label += " " + a.id;

  const samples = used.reduce((n, s) => n + s.faces.samples, 0);
  const withFace = used.reduce((n, s) => n + s.faces.withFace, 0);
  const ratio = samples ? withFace / samples : 0;
  const maxFaces = used.reduce((m, s) => Math.max(m, s.faces.maxFaces), 0);
  if (maxFaces > 1) warnings.push("Up to " + maxFaces + " faces in one frame; the framing follows the face held longest and largest.");
  if (used.some((s) => s.faces.ambiguous)) warnings.push("Two faces are about equally prominent in at least one camera angle.");
  const covered = coversTimeline(targets, durationFrames);
  if (!covered) warnings.push("Main does not cover the whole draft with framed footage.");
  const weak = used.filter((s) => s.faces.coverage < ANGLE_RULES.minCoverage);
  for (const s of weak) warnings.push("Camera segment " + s.id + " shows the speaker's face in " + Math.round(s.faces.coverage * 100) + "% of its samples.");
  const throughout = covered && ratio >= ANGLE_RULES.throughoutCoverage && weak.length === 0;

  const speakers = maxFaces <= 1 ? "Single speaker on camera" : "Speaker on camera with up to " + count(maxFaces) + " faces in frame";
  const parts = angles.map((a) => a.label + (a.position === "no face found" ? "" : ", " + a.position) + " (frames " + a.frames.map(([s, e]) => s + "–" + e).join(", ") + ")");
  const angleText = angles.length === 1 ? "One camera angle: " + parts[0] : count(angles.length).replace(/^./, (c) => c.toUpperCase()) + " camera angles: " + parts.join("; ");
  const rawFootage =
    speakers + ", face visible in " + Math.round(ratio * 100) + "% of sampled frames. " + angleText + ". The portrait crop is fixed per camera angle and centred on the face" + (throughout ? "; the speaker is on camera throughout." : ".");
  return { schema: "eo-speaker-observations/1", rawFootage, cameraFootageAvailableThroughout: throughout, faceVisibleRatio: r3(ratio), maxFacesInFrame: maxFaces, angles, warnings };
}

function coversTimeline(targets: FramingTarget[], durationFrames: number): boolean {
  const t = targets.slice().sort((a, b) => a.startFrame - b.startFrame);
  let at = 0;
  for (const p of t) {
    if (p.startFrame > at) return false;
    at = Math.max(at, p.endFrame);
  }
  return at >= durationFrames;
}
