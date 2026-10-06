import type { HostFs } from "../host/types.ts";
import { readBytes, renameWithRetry } from "../host/fs.ts";
import { sha256Hex } from "../host/util.ts";
import { createSubsetter, type Subsetter } from "./hbSubset.ts";

export const HB_VERSION = "1.6.2";

export const HB_SUBSET_WASM = Object.freeze({
  name: "harfbuzz-subset.wasm",
  label: "font subsetter",
  urls: [
    "https://cdn.jsdelivr.net/npm/harfbuzzjs@" + HB_VERSION + "/dist/harfbuzz-subset.wasm",
    "https://unpkg.com/harfbuzzjs@" + HB_VERSION + "/dist/harfbuzz-subset.wasm",
  ],
  sha256: "5fc12cf6a843a703cbab360169c681704416f330d3979e7e5a3f4b050efbb720",
  bytes: 651027,
});

export function hbWasmPath(fs: Pick<HostFs, "join">, runtimeDir: string): string {
  return fs.join(runtimeDir, "harfbuzz", "harfbuzzjs-" + HB_VERSION, HB_SUBSET_WASM.name);
}

const DOWNLOAD_TIMEOUT_MS = 3 * 60 * 1000;
const errText = (e: unknown) => String((e && (e as { message?: unknown }).message) || e || "unknown error").slice(0, 300);

async function verified(fs: HostFs, path: string): Promise<Uint8Array | null> {
  if (!fs.existsSync(path)) return null;
  try {
    const bytes = await readBytes(fs, path);
    if (bytes.length === HB_SUBSET_WASM.bytes && (await sha256Hex(bytes)) === HB_SUBSET_WASM.sha256) return bytes;
  } catch {
  }
  return null;
}

function quietRemove(fs: HostFs, path: string) {
  try {
    if (fs.existsSync(path)) fs.unlinkSync(path);
  } catch {
  }
}

export async function hbSubsetWasm(fs: HostFs, runtimeDir: string, o: { reuse?: string[]; progress?: (s: string) => void } = {}): Promise<{ bytes: Uint8Array; path: string; downloaded: boolean }> {
  const dest = hbWasmPath(fs, runtimeDir);
  const own = await verified(fs, dest);
  if (own) return { bytes: own, path: dest, downloaded: false };
  quietRemove(fs, dest);
  for (const p of o.reuse ?? []) {
    const b = await verified(fs, p);
    if (b) return { bytes: b, path: p, downloaded: false };
  }
  if (typeof fs.downloadFile !== "function") throw new Error("This Selects build cannot download files (FileSystem.downloadFile); update Selects.");
  o.progress?.("Downloading the font subsetter (one time, 0.7 MB)…");
  if (!fs.existsSync(fs.dirname(dest))) fs.mkdirSync(fs.dirname(dest), { recursive: true });
  const reasons: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const url = HB_SUBSET_WASM.urls[Math.min(attempt, HB_SUBSET_WASM.urls.length - 1)];
    const part = dest + ".part" + attempt;
    quietRemove(fs, part);
    try {
      let timer: ReturnType<typeof setTimeout> | null = null;
      await Promise.race([
        fs.downloadFile(url, part),
        new Promise((_, reject) => (timer = setTimeout(() => reject(new Error("no answer after " + DOWNLOAD_TIMEOUT_MS / 1000 + " s")), DOWNLOAD_TIMEOUT_MS))),
      ]).finally(() => timer && clearTimeout(timer));
      if (!fs.existsSync(part)) throw new Error("nothing was saved");
      const bytes = await readBytes(fs, part);
      if (bytes.length !== HB_SUBSET_WASM.bytes) throw new Error("the server sent " + bytes.length + " bytes, not " + HB_SUBSET_WASM.bytes);
      const got = await sha256Hex(bytes);
      if (got !== HB_SUBSET_WASM.sha256) throw new Error("the file's checksum is wrong (sha256 " + got.slice(0, 12) + "…)");
      await renameWithRetry(fs, part, dest);
      return { bytes, path: dest, downloaded: true };
    } catch (e) {
      reasons.push(url.replace(/^https:\/\/([^/]+)\/.*$/, "$1") + ": " + errText(e));
      quietRemove(fs, part);
    }
  }
  throw new Error("Could not download the " + HB_SUBSET_WASM.label + ". " + reasons.join("; ") + ". Check the internet connection and try again.");
}

const cache = new Map<string, Promise<Subsetter>>();

export function loadSubsetter(fs: HostFs, runtimeDir: string, o: { reuse?: string[]; progress?: (s: string) => void } = {}): Promise<Subsetter> {
  const key = hbWasmPath(fs, runtimeDir);
  let p = cache.get(key);
  if (!p) {
    p = hbSubsetWasm(fs, runtimeDir, o).then((w) => createSubsetter(w.bytes));
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}
