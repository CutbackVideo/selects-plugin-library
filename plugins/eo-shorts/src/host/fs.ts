import type { HostFs } from "./types.ts";
import { randomHex, sleep } from "./util.ts";

export function toBytes(data: unknown): Uint8Array {
  if (typeof data === "string") return new TextEncoder().encode(data);
  if (data != null && ArrayBuffer.isView(data)) {
    const v = data as ArrayBufferView;
    return new Uint8Array(new Uint8Array(v.buffer as ArrayBuffer, v.byteOffset, v.byteLength));
  }
  if (Object.prototype.toString.call(data) === "[object ArrayBuffer]") return new Uint8Array(new Uint8Array(data as ArrayBuffer));
  const o = data as { type?: unknown; data?: unknown } | null;
  if (o && typeof o === "object" && o.type === "Buffer" && Array.isArray(o.data)) return Uint8Array.from(o.data as number[]);
  if (Array.isArray(data)) return Uint8Array.from(data as number[]);
  throw new Error("The file's contents came back in a form this plugin cannot read.");
}

export function decodeText(data: unknown): string {
  if (typeof data === "string") return data;
  return new TextDecoder("utf-8").decode(toBytes(data));
}

export async function readBytes(fs: HostFs, path: string): Promise<Uint8Array> {
  return toBytes(await fs.readFile(path));
}

export async function readText(fs: HostFs, path: string): Promise<string> {
  return decodeText(await fs.readFile(path));
}

export async function readJson<T = unknown>(fs: HostFs, path: string): Promise<T> {
  const text = await readText(fs, path);
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error("Could not read " + path + " as JSON: " + (e as Error).message);
  }
}

export async function readJsonIfExists<T>(fs: HostFs, path: string, fallback: T): Promise<T> {
  if (!fs.existsSync(path)) return fallback;
  return readJson<T>(fs, path);
}

export function ensureDir(fs: HostFs, path: string): string {
  if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
  return path;
}

export const RENAME_RETRY_MS = [10, 25, 50, 100, 200, 400, 800];

export type AtomicWriteOptions = { renameRetryMs?: number[] };

export async function writeFileAtomic(fs: HostFs, path: string, data: string | Uint8Array, o: AtomicWriteOptions = {}): Promise<void> {
  ensureDir(fs, fs.dirname(path));
  const tmp = path + ".tmp-" + randomHex(8);
  await fs.writeFile(tmp, data);
  const waits = o.renameRetryMs ?? RENAME_RETRY_MS;
  for (let attempt = 0; ; attempt += 1) {
    try {
      fs.renameSync(tmp, path);
      return;
    } catch (e) {
      if (attempt > 0 && !fs.existsSync(tmp)) return;
      if (attempt >= waits.length) {
        try {
          fs.unlinkSync(tmp);
        } catch {
        }
        throw e;
      }
      await sleep(waits[attempt]);
    }
  }
}

export async function renameWithRetry(fs: HostFs, from: string, to: string, o: AtomicWriteOptions = {}): Promise<void> {
  const waits = o.renameRetryMs ?? RENAME_RETRY_MS;
  for (let attempt = 0; ; attempt += 1) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (e) {
      if (attempt > 0 && !fs.existsSync(from) && fs.existsSync(to)) return;
      if (attempt >= waits.length) throw e;
      await sleep(waits[attempt]);
    }
  }
}

export function writeJsonAtomic(fs: HostFs, path: string, value: unknown, o: AtomicWriteOptions = {}): Promise<void> {
  return writeFileAtomic(fs, path, JSON.stringify(value, null, 2) + "\n", o);
}

export async function appendText(fs: HostFs, path: string, text: string): Promise<void> {
  ensureDir(fs, fs.dirname(path));
  await fs.writeFile(path, text, { flag: "a" });
}

export async function createExclusive(fs: HostFs, path: string, text: string): Promise<boolean> {
  ensureDir(fs, fs.dirname(path));
  try {
    await fs.writeFile(path, text, { flag: "wx" });
    return true;
  } catch (e) {
    if (fs.existsSync(path)) return false;
    throw e;
  }
}

export type FileStat = { size: number; mtimeMs: number };

export function statFile(fs: HostFs, path: string): FileStat | null {
  const s = fs.statSync(path);
  if (!s) return null;
  return { size: Number(s.size ?? 0), mtimeMs: Number(s.mtimeMs ?? 0) };
}

export function removeFile(fs: HostFs, path: string): void {
  try {
    if (fs.existsSync(path)) fs.unlinkSync(path);
  } catch {
  }
}
