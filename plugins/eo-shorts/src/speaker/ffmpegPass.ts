export type VideoProbe = {
  width: number;
  height: number;
  fps: number;
  startOffset: number;
};

export function probeArgs(path: string): string[] {
  return [
    "-v", "error", "-hide_banner", "-select_streams", "V:0",
    "-show_entries", "stream=width,height,avg_frame_rate,r_frame_rate,start_time:stream_tags=rotate:stream_side_data=rotation:format=start_time",
    "-of", "json", path,
  ];
}

const rate = (s: unknown): number => {
  const m = String(s || "").match(/^(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/);
  if (!m) return 0;
  const v = m[2] != null ? Number(m[1]) / Number(m[2]) : Number(m[1]);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

export function parseProbe(stdout: string): VideoProbe {
  const j = JSON.parse(String(stdout || "").replace(/[\r\n]/g, ""));
  const s = j && j.streams && j.streams[0];
  if (!s || !(Number(s.width) > 0) || !(Number(s.height) > 0)) throw new Error("The source has no video stream.");
  let rot = 0;
  for (const sd of s.side_data_list || []) if (sd && sd.rotation != null) rot = Number(sd.rotation) || 0;
  if (!rot && s.tags && s.tags.rotate != null) rot = Number(s.tags.rotate) || 0;
  const turned = Math.abs(Math.round(rot / 90)) % 2 === 1;
  const fps = rate(s.avg_frame_rate) || rate(s.r_frame_rate);
  if (!(fps > 0)) throw new Error("The source's frame rate is unknown.");
  const st = Number(s.start_time), ft = Number(j.format && j.format.start_time);
  return {
    width: turned ? Number(s.height) : Number(s.width),
    height: turned ? Number(s.width) : Number(s.height),
    fps,
    startOffset: Number.isFinite(st) ? st - (Number.isFinite(ft) ? ft : 0) : 0,
  };
}

export type DecodeSpan = { path: string; resourceIds: string[]; start: number; end: number };

export type PassOptions = { threshold?: number; sampleFps?: number; longSide?: number };

export const PASS_DEFAULTS = { threshold: 8, sampleFps: 2, longSide: 640 } as const;

export const DECODE_PAD_S = 1;

export function analysisSize(width: number, height: number, longSide: number = PASS_DEFAULTS.longSide): { width: number; height: number } {
  const k = Math.min(1, longSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

export function sampleStep(fileFps: number, sampleFps: number = PASS_DEFAULTS.sampleFps): number {
  return Math.max(1, Math.round(fileFps / sampleFps));
}

export type SourceRange = { resourceId: string | null; path: string; start: number; end: number };

export function planDecodeSpans(ranges: SourceRange[], mergeGapS = 3, padS = DECODE_PAD_S): DecodeSpan[] {
  const byFile = new Map<string, SourceRange[]>();
  for (const r of ranges) {
    if (!(r.end > r.start)) continue;
    if (!byFile.has(r.path)) byFile.set(r.path, []);
    byFile.get(r.path)!.push(r);
  }
  const spans: DecodeSpan[] = [];
  for (const list of byFile.values()) {
    list.sort((a, b) => a.start - b.start);
    let cur: DecodeSpan | null = null;
    for (const r of list) {
      if (cur && r.start - cur.end <= mergeGapS) cur.end = Math.max(cur.end, r.end);
      else {
        cur = { path: r.path, resourceIds: [], start: r.start, end: r.end };
        spans.push(cur);
      }
      if (r.resourceId != null && !cur.resourceIds.includes(r.resourceId)) cur.resourceIds.push(r.resourceId);
    }
  }
  for (const s of spans) {
    s.start = Math.max(0, s.start - padS);
    s.end += padS;
    s.resourceIds.sort();
  }
  return spans.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.start - b.start));
}

const secs = (x: number) => String(Math.max(0, Math.round(x * 1e6) / 1e6));

export function analysisPassArgs(span: DecodeSpan, probe: VideoProbe, out: string, o: PassOptions = {}): string[] {
  const threshold = o.threshold ?? PASS_DEFAULTS.threshold;
  const size = analysisSize(probe.width, probe.height, o.longSide ?? PASS_DEFAULTS.longSide);
  const step = sampleStep(probe.fps, o.sampleFps ?? PASS_DEFAULTS.sampleFps);
  const vf = "scdet=threshold=" + threshold + ",framestep=" + step + ",showinfo,scale=" + size.width + ":" + size.height + ":flags=area,format=bgr24";
  return [
    "-nostdin", "-hide_banner", "-loglevel", "info", "-y",
    "-ss", secs(span.start), "-t", secs(span.end - span.start),
    "-i", span.path, "-map", "0:V:0", "-an", "-sn", "-dn",
    "-vf", vf, "-fps_mode", "passthrough", "-f", "rawvideo", out,
  ];
}

export type ScdetHit = { score: number; time: number };

export function parseScdet(stderr: string): ScdetHit[] {
  const out: ScdetHit[] = [];
  for (const line of String(stderr || "").split(/\r?\n/)) {
    const m = line.match(/lavfi\.scd\.score:\s*(-?[\d.]+(?:e[-+]?\d+)?),\s*lavfi\.scd\.time:\s*(-?[\d.]+(?:e[-+]?\d+)?)/i);
    if (m) out.push({ score: Number(m[1]), time: Number(m[2]) });
  }
  return out;
}

export type ShowinfoFrame = { n: number; pts: number; ptsTime: number };

export function parseShowinfo(stderr: string): ShowinfoFrame[] {
  const out: ShowinfoFrame[] = [];
  for (const line of String(stderr || "").split(/\r?\n/)) {
    if (!/showinfo/i.test(line)) continue;
    const m = line.match(/\bn:\s*(\d+)\s+pts:\s*(-?\d+)\s+pts_time:\s*(-?[\d.]+(?:e[-+]?\d+)?)/i);
    if (m) out.push({ n: Number(m[1]), pts: Number(m[2]), ptsTime: Number(m[3]) });
  }
  return out;
}

export function passTimeToFileFrame(span: DecodeSpan, probe: VideoProbe, passTime: number): { frame: number; time: number } {
  const frame = Math.round((span.start + passTime - probe.startOffset) * probe.fps);
  return { frame, time: frame / probe.fps };
}

export type PassResult = {
  cuts: { frame: number; time: number; score: number }[];
  samples: { index: number; frame: number; time: number }[];
};

export function readPass(span: DecodeSpan, probe: VideoProbe, stderr: string): PassResult {
  const cuts = parseScdet(stderr).map((h) => ({ ...passTimeToFileFrame(span, probe, h.time), score: h.score }));
  const samples = parseShowinfo(stderr).map((f) => ({ index: f.n, ...passTimeToFileFrame(span, probe, f.ptsTime) }));
  return { cuts, samples };
}
