// Stock B-roll through the app's StockMediaSearch service: Cutback's server searches Pexels and Pixabay
// with its own keys, so nothing is asked of the user. The reference edit uses stock clips too; a search
// and a cut take seconds, where generating a clip takes minutes and costs.
import { di, ffmpeg, ffprobe, fs, removeFile, sleep, type Sdk } from "./host";

export type StockClip = { path: string; width: number; height: number; credit: string; url: string; service: string; id: string };

type StockFile = { url: string; width: number; height: number };
type StockVideo = {
  width: number;
  height: number;
  duration: number;
  originalUrl: string;
  authorName: string;
  authorUrl: string;
  serviceName: string;
  files?: StockFile[];
};

export function stockSearchAvailable(): boolean {
  try {
    return typeof di()?.StockMediaSearch?.searchVideos === "function";
  } catch {
    return false;
  }
}

// Search, pick the best clip for the card, download it and cut the first seconds of it (scaled to the
// card's size) into `dir`. `avoid` skips clips already used. When every candidate fails, the last error
// is thrown so the panel can say why.
export async function stockClip(sdk: Sdk, queries: string[], orientation: "portrait" | "landscape", dir: string, seconds: number, avoid: string[] = []): Promise<StockClip | null> {
  const service = di().StockMediaSearch;
  fs().mkdirSync(dir, { recursive: true });
  const tried = new Set<string>();
  let lastErr: any = null;
  for (const raw of queries) {
    const query = String(raw || "").replace(/[^\p{L}\p{N}\s'-]+/gu, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 5).join(" ");
    if (!query || tried.has(query)) continue;
    tried.add(query);
    let rows: StockVideo[] = [];
    try {
      rows = await service.searchVideos({ query, per: 10, orientation });
    } catch {
      continue;
    }
    const pick = chooseStock(rows.filter((v) => !avoid.includes(v.originalUrl)), orientation);
    if (!pick) continue;
    const out = fs().join(dir, "stock-" + Math.abs(hash(pick.video.originalUrl)) + ".mp4");
    if (!fs().existsSync(out)) {
      const box = orientation === "portrait" ? "1080:1920" : "1920:1080";
      // The app downloads the rendition (no shell, no TLS dependence on ffmpeg's build), then ffmpeg keeps
      // only what the cards use and scales big renditions down.
      const src = out + ".src";
      const part = out + ".part.mp4";
      try {
        // The app's download has no deadline of its own.
        await Promise.race([fs().downloadFile(pick.url, src), sleep(120000).then(() => Promise.reject(new Error("The stock download took too long.")))]);
        await ffmpeg(
          "Cut stock B-roll",
          ["-v", "error", "-y", "-ss", "0.4", "-t", Math.max(4, Math.min(12, seconds)).toFixed(1), "-i", src, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-vf", "scale=" + box + ":force_original_aspect_ratio=increase:force_divisible_by=2", "-f", "mp4", part],
          150000
        );
        // A virus scanner can hold a fresh file for a moment (Windows): try the rename a few times.
        for (let k = 0; ; k += 1) {
          try {
            fs().renameSync(part, out);
            break;
          } catch (e) {
            if (k >= 5) throw e;
            await sleep(200 * (k + 1));
          }
        }
      } catch (e) {
        removeFile(part);
        lastErr = e;
        continue;
      } finally {
        removeFile(src);
      }
    }
    const probe = (await ffprobe("Probe stock B-roll", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", out]).catch(() => ""))
      .trim()
      .split(",")
      .map(Number);
    return {
      id: pick.video.originalUrl,
      path: out,
      width: probe[0] || pick.width,
      height: probe[1] || pick.height,
      credit: pick.video.authorName || serviceLabel(pick.video.serviceName),
      url: pick.video.authorUrl,
      service: serviceLabel(pick.video.serviceName),
    };
  }
  if (lastErr) throw lastErr;
  return null;
}

export function serviceLabel(name: string) {
  return /^pex/i.test(name) ? "Pexels" : name || "stock";
}

type Pick = { video: StockVideo; url: string; width: number; height: number; score: number };

// Right orientation (the server may predate its orientation filter), long enough to cut from, and the
// smallest rendition that still fills the card; without a rendition list, the smallest original.
export function chooseStock(rows: StockVideo[], orientation: "portrait" | "landscape"): Pick | null {
  const need = orientation === "portrait" ? 1080 : 720;
  let best: Pick | null = null;
  rows.forEach((v, rank) => {
    if (!(v.duration >= 4)) return;
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

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}
