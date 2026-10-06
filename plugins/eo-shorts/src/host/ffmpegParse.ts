const NUM = "(-?(?:inf|nan|\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?))";

function num(text: string | undefined): number {
  if (text == null) return NaN;
  const t = text.toLowerCase();
  if (t === "inf") return Infinity;
  if (t === "-inf") return -Infinity;
  return Number(t);
}

export type Ebur128Summary = {
  integrated: number;
  integratedThreshold: number | null;
  lra: number | null;
  lraLow: number | null;
  lraHigh: number | null;
  truePeak: number | null;
  samplePeak: number | null;
};

export function parseEbur128(text: string): Ebur128Summary | null {
  const at = text.lastIndexOf("Summary:");
  if (at < 0) return null;
  const s = text.slice(at);
  const pick = (re: RegExp): number | null => {
    const m = s.match(re);
    return m ? num(m[1]) : null;
  };
  const integrated = pick(new RegExp("Integrated loudness:\\s*I:\\s*" + NUM + "\\s*LUFS", "i"));
  if (integrated == null || Number.isNaN(integrated)) return null;
  const block = (name: string): string => {
    const i = s.indexOf(name);
    return i < 0 ? "" : s.slice(i, i + 200);
  };
  const peakIn = (name: string): number | null => {
    const b = block(name);
    const m = b.match(new RegExp("Peak:\\s*" + NUM + "\\s*dBFS", "i"));
    return m ? num(m[1]) : null;
  };
  return {
    integrated,
    integratedThreshold: pick(new RegExp("Integrated loudness:\\s*I:\\s*\\S+\\s*LUFS\\s*Threshold:\\s*" + NUM, "i")),
    lra: pick(new RegExp("LRA:\\s*" + NUM + "\\s*LU\\b", "i")),
    lraLow: pick(new RegExp("LRA low:\\s*" + NUM, "i")),
    lraHigh: pick(new RegExp("LRA high:\\s*" + NUM, "i")),
    truePeak: peakIn("True peak:"),
    samplePeak: peakIn("Sample peak:"),
  };
}

export type Ebur128Frame = { t: number; momentary: number; shortTerm: number; integrated: number; lra: number; truePeak: number | null };

export function parseEbur128Frames(text: string): Ebur128Frame[] {
  const out: Ebur128Frame[] = [];
  const re = new RegExp(
    "\\bt:\\s*" + NUM + "\\s+TARGET:\\S+\\s*LUFS\\s+M:\\s*" + NUM + "\\s+S:\\s*" + NUM + "\\s+I:\\s*" + NUM + "\\s*LUFS\\s+LRA:\\s*" + NUM +
      "\\s*LU(?:.*?TPK:\\s*" + NUM + ")?",
    "gi",
  );
  for (const m of text.matchAll(re)) {
    out.push({ t: num(m[1]), momentary: num(m[2]), shortTerm: num(m[3]), integrated: num(m[4]), lra: num(m[5]), truePeak: m[6] != null ? num(m[6]) : null });
  }
  return out;
}

export type Silence = { start: number; end: number | null; duration: number | null; channel: number | null };

export function parseSilencedetect(text: string, endAt: number | null = null): Silence[] {
  const out: Silence[] = [];
  const open = new Map<number, Silence>();
  const re = new RegExp("(?:channel:\\s*(\\d+)\\s*\\|\\s*)?silence_(start|end):\\s*" + NUM + "(?:\\s*\\|\\s*silence_duration:\\s*" + NUM + ")?", "gi");
  for (const m of text.matchAll(re)) {
    const channel = m[1] != null ? Number(m[1]) : -1;
    if (m[2].toLowerCase() === "start") {
      const s: Silence = { start: num(m[3]), end: null, duration: null, channel: channel >= 0 ? channel : null };
      out.push(s);
      open.set(channel, s);
    } else {
      const end = num(m[3]);
      const duration = m[4] != null ? num(m[4]) : null;
      const s = open.get(channel);
      if (s) {
        s.end = end;
        s.duration = duration ?? end - s.start;
        open.delete(channel);
      } else {
        out.push({ start: duration != null ? end - duration : 0, end, duration, channel: channel >= 0 ? channel : null });
      }
    }
  }
  if (endAt != null) {
    for (const s of open.values()) {
      s.end = endAt;
      s.duration = endAt - s.start;
    }
  }
  return out;
}

export type SceneCut = { time: number; score: number };

export function parseScdet(text: string): SceneCut[] {
  const out: SceneCut[] = [];
  for (const line of text.split(/\r?\n/)) {
    const score = line.match(new RegExp("lavfi\\.scd\\.score:\\s*" + NUM, "i"));
    const time = line.match(new RegExp("lavfi\\.scd\\.time:\\s*" + NUM, "i"));
    if (score && time) out.push({ time: num(time[1]), score: num(score[1]) });
  }
  return out;
}

export function parseShowinfo(text: string): { n: number; ptsTime: number }[] {
  const out: { n: number; ptsTime: number }[] = [];
  const re = new RegExp("showinfo[^\\]]*\\]\\s*n:\\s*(\\d+)\\s+pts:\\s*\\S+\\s+pts_time:\\s*" + NUM, "gi");
  for (const m of text.matchAll(re)) out.push({ n: Number(m[1]), ptsTime: num(m[2]) });
  return out;
}

export type BlackRun = { start: number; end: number; duration: number };

export function parseBlackdetect(text: string): BlackRun[] {
  const out: BlackRun[] = [];
  const re = new RegExp("black_start:\\s*" + NUM + "\\s+black_end:\\s*" + NUM + "\\s+black_duration:\\s*" + NUM, "gi");
  for (const m of text.matchAll(re)) out.push({ start: num(m[1]), end: num(m[2]), duration: num(m[3]) });
  return out;
}

export type FfVersion = { line: string; version: string };

export function parseVersion(stdout: string): FfVersion | null {
  const line = String(stdout || "").split(/\r?\n/).find((l) => /\bversion\b/.test(l));
  if (!line) return null;
  const m = line.match(/\bversion\s+(\S+)/);
  return { line: line.trim(), version: m ? m[1] : "" };
}

export function parseListing(text: string, kind: "filters" | "encoders"): Set<string> {
  const names = new Set<string>();
  const re = kind === "filters" ? /^\s([TSC.|]{2,3})\s+(\S+)\s+\S*->\S*\s/ : /^\s([VASFXBD.]{6})\s+(\S+)\s/;
  for (const line of String(text || "").split(/\r?\n/)) {
    const m = line.match(re);
    if (m && m[2] !== "=") names.add(m[2]);
  }
  return names;
}

export function helpSaysUnknown(text: string): boolean {
  return /Unknown (filter|encoder|decoder|muxer|demuxer|bsf|protocol)\b|is not recognized by FFmpeg/i.test(String(text || ""));
}

export function exitCodeFromMessage(message: string): number | null {
  const m = String(message || "").match(/exited with code (-?\d+)/i) || String(message || "").match(/\bcode (-?\d+)\b/i);
  return m ? Number(m[1]) : null;
}

export function parseFfprobeJson(stdout: string): { streams?: Record<string, unknown>[]; format?: Record<string, unknown>; [k: string]: unknown } {
  const text = String(stdout || "").trim();
  const start = text.indexOf("{");
  if (start < 0) throw new SyntaxError("ffprobe printed no JSON.");
  return JSON.parse(text.slice(start));
}
