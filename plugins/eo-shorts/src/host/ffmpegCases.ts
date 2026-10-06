import { parseEbur128, parseScdet, parseSilencedetect, parseBlackdetect } from "./ffmpegParse.ts";

export type SmokeTest = {
  id: string;
  usedFor: string;
  args: string[];
  check?: (stderr: string) => string | null;
};

const BASE = ["-hide_banner", "-nostdin", "-nostats"];
const V = ["-f", "lavfi", "-i", "testsrc2=s=128x72:r=24000/1001:d=0.25"];
const A = ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1"];
const A_GAP = ["-f", "lavfi", "-i", "aevalsrc='if(lt(t,0.5),0.5*sin(2*PI*440*t),0)':s=48000:d=1"];
const V_CUT = ["-f", "lavfi", "-i", "color=c=red:s=64x64:r=25:d=0.4[a];color=c=blue:s=64x64:r=25:d=0.4[b];[a][b]concat=n=2:v=1:a=0[out0]"];
const V_BLACK = ["-f", "lavfi", "-i", "color=c=black:s=64x64:r=25:d=0.4[a];testsrc2=s=64x64:r=25:d=0.4[b];[a][b]concat=n=2:v=1:a=0[out0]"];
const NULL = ["-f", "null", "-"];

export const SMOKE_TESTS: SmokeTest[] = [
  { id: "libx264", usedFor: "stock clip encoding", args: [...BASE, ...V, "-frames:v", "1", "-c:v", "libx264", "-preset", "ultrafast", ...NULL] },
  { id: "aac", usedFor: "audio encoding", args: [...BASE, ...A, "-c:a", "aac", "-b:a", "128k", ...NULL] },
  {
    id: "crop-scale",
    usedFor: "9:16 stock framing",
    args: [...BASE, ...V, "-frames:v", "1", "-vf", "crop=ih*9/16:ih,scale=108:192:flags=lanczos", ...NULL],
  },
  {
    id: "select-setpts",
    usedFor: "stock cadence (one decode, chosen frames)",
    args: [...BASE, ...V, "-vf", "select='eq(n,0)+eq(n,2)',setpts=N/(24000/1001)/TB", ...NULL],
  },
  {
    id: "scdet",
    usedFor: "camera cut detection",
    args: [...BASE, ...V_CUT, "-vf", "scdet=threshold=10", ...NULL],
    check: (err) => {
      const hits = parseScdet(err);
      return hits.length === 1 && Math.abs(hits[0].time - 0.4) < 0.05 ? null : "expected one scene cut at 0.4 s, read " + JSON.stringify(hits);
    },
  },
  {
    id: "silencedetect",
    usedFor: "pause cuts and pause gate",
    args: [...BASE, ...A_GAP, "-af", "silencedetect=noise=-40dB:d=0.2", ...NULL],
    check: (err) => {
      const s = parseSilencedetect(err);
      return s.length >= 1 && Math.abs(s[0].start - 0.5) < 0.05 ? null : "expected silence from 0.5 s, read " + JSON.stringify(s);
    },
  },
  {
    id: "ebur128",
    usedFor: "loudness",
    args: [...BASE, ...A, "-af", "ebur128=peak=true", ...NULL],
    check: (err) => {
      const r = parseEbur128(err);
      return r && Number.isFinite(r.integrated) && Number.isFinite(r.truePeak ?? NaN) ? null : "no ebur128 summary read";
    },
  },
  {
    id: "blackdetect",
    usedFor: "black frame check",
    args: [...BASE, ...V_BLACK, "-vf", "blackdetect=d=0.1:pix_th=0.1", ...NULL],
    check: (err) => {
      const b = parseBlackdetect(err);
      return b.length === 1 && b[0].start < 0.05 ? null : "expected black from 0 s, read " + JSON.stringify(b);
    },
  },
  { id: "libwebp", usedFor: "display-size WebP pictures", args: [...BASE, ...V, "-frames:v", "1", "-c:v", "libwebp", ...NULL] },
];
