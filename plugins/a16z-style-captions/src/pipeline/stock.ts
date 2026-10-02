// Stock B-roll through the app's StockMediaSearch service: Cutback's server searches Pexels and Pixabay
// with its own keys, so nothing is asked of the user. Searches return candidates with a preview image;
// the chosen candidate's needed seconds are cut straight from the provider's URL.
import { di, fs, hostFF, type Sdk } from "./host";

export type StockClip = { path: string; width: number; height: number; credit: string; url: string; service: string; id: string; dur?: number };

type StockFile = { url: string; width: number; height: number };
type StockVideo = {
  width: number;
  height: number;
  duration: number;
  previewUrl?: string;
  originalUrl: string;
  authorName: string;
  authorUrl: string;
  serviceName: string;
  files?: StockFile[];
};

export type Candidate = { id: string; url: string; width: number; height: number; duration: number; preview: string; credit: string; authorUrl: string; service: string };

export function stockSearchAvailable(): boolean {
  try {
    return typeof di()?.StockMediaSearch?.searchVideos === "function";
  } catch {
    return false;
  }
}

const clean = (raw: string) =>
  String(raw || "")
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");

// Candidates for one moment, portrait first, at most `max`, skipping ids in `avoid`.
export async function searchCandidates(queries: string[], max: number, avoid: Set<string>): Promise<Candidate[]> {
  const service = di().StockMediaSearch;
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const orientation of ["portrait", "landscape"] as const) {
    for (const raw of queries) {
      const query = clean(raw);
      if (!query) continue;
      let rows: StockVideo[] = [];
      try {
        rows = await service.searchVideos({ query, per: 8, orientation });
      } catch {
        continue;
      }
      for (const v of rows) {
        if (out.length >= max) return out;
        if (!v.previewUrl || avoid.has(v.originalUrl) || seen.has(v.originalUrl)) continue;
        const pick = chooseStock([v], orientation);
        if (!pick) continue;
        seen.add(v.originalUrl);
        out.push({
          id: v.originalUrl,
          url: pick.url,
          width: pick.width,
          height: pick.height,
          duration: v.duration,
          preview: v.previewUrl,
          credit: v.authorName || serviceLabel(v.serviceName),
          authorUrl: v.authorUrl,
          service: serviceLabel(v.serviceName),
        });
      }
    }
    if (out.length >= Math.ceil(max / 2)) break;
  }
  return out;
}

// Cut `seconds` of a candidate (from `offset`) into `dir`, scaled to cover a 9:16 frame.
export async function cutCandidate(sdk: Sdk, c: Candidate, dir: string, seconds: number, offset = 0.4): Promise<StockClip> {
  fs().mkdirSync(dir, { recursive: true });
  const start = Math.min(Math.max(0, c.duration - seconds - 0.2), offset);
  const length = Math.max(1.5, Math.min(12, seconds));
  const out = fs().join(dir, "stock-" + Math.abs(hash(c.id + "@" + start.toFixed(2) + "+" + length.toFixed(2))) + ".mp4");
  if (!fs().existsSync(out)) {
    const portrait = c.height > c.width;
    const box = portrait ? "1080:1920" : "1920:1080";
    // ffmpeg writes a .part file that is renamed once complete, so a failed cut never looks cached
    // (straight to the final name on a host build without renameSync).
    const part = typeof fs().renameSync === "function" ? out + ".part.mp4" : out;
    await hostFF(
      "runFFmpeg",
      ["-v", "error", "-y", "-ss", start.toFixed(2), "-t", length.toFixed(2), "-i", c.url,
        "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
        "-vf", "scale=" + box + ":force_original_aspect_ratio=increase:force_divisible_by=2", part],
      150000
    );
    if (part !== out) fs().renameSync(part, out);
  }
  const probe = (await hostFF("runFFprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "csv=p=0", out], 30000)).stdout
    .trim()
    .split(/[\r\n,]+/)
    .map(Number);
  return { id: c.id, path: out, width: probe[0] || c.width, height: probe[1] || c.height, dur: probe[2] || 0, credit: c.credit, url: c.authorUrl, service: c.service };
}

export function serviceLabel(name: string) {
  return /^pex/i.test(name) ? "Pexels" : name || "stock";
}

type Pick = { video: StockVideo; url: string; width: number; height: number; score: number };

// Right orientation, long enough to cut from, and the smallest rendition that still fills the frame.
export function chooseStock(rows: StockVideo[], orientation: "portrait" | "landscape"): Pick | null {
  const need = orientation === "portrait" ? 1080 : 720;
  let best: Pick | null = null;
  rows.forEach((v, rank) => {
    if (!(v.duration >= 3)) return;
    const files = v.files && v.files.length ? v.files : [{ url: v.originalUrl, width: v.width, height: v.height }];
    for (const f of files) {
      if (!f.url || !f.width || !f.height) continue;
      if ((orientation === "portrait") !== f.height > f.width) continue;
      const short = Math.min(f.width, f.height);
      if (short < need * 0.66) continue;
      const fit = short >= need ? (short - need) / 4 : (need - short) * 3;
      const score = fit + rank * 30 + (v.duration > 40 ? 150 : 0);
      if (!best || score < best.score) best = { video: v, url: f.url, width: f.width, height: f.height, score };
    }
  });
  return best;
}

export function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

// Duration (s) of a cut clip, for cached clips that predate the duration field.
export async function probeDuration(sdk: Sdk, path: string): Promise<number> {
  const out = await hostFF("runFFprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], 30000).then((r) => r.stdout).catch(() => "");
  return Number(String(out).trim()) || 0;
}
