import { appendText, decodeText, writeFileAtomic } from "../host/fs.ts";
import type { HostFs } from "../host/types.ts";

export interface ModelStore {
  join(...parts: string[]): string;
  readText(path: string): Promise<string | null>;
  writeText(path: string, text: string): Promise<void>;
  appendText(path: string, text: string): Promise<void>;
}

function keyedQueue() {
  const tails = new Map<string, Promise<unknown>>();
  return function run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const prev = tails.get(key) ?? Promise.resolve();
    const next = prev.then(work, work);
    const tail = next.catch(() => {});
    tails.set(key, tail);
    void tail.then(() => {
      if (tails.get(key) === tail) tails.delete(key);
    });
    return next;
  };
}

export function storeFromHostFs(fs: HostFs): ModelStore {
  const queue = keyedQueue();
  return {
    join: (...parts) => fs.join(...parts),
    async readText(path) {
      if (!(await fs.exists(path))) return null;
      return decodeText(await fs.readFile(path));
    },
    writeText: (path, text) => queue(path, () => writeFileAtomic(fs, path, text)),
    appendText: (path, text) => queue(path, () => appendText(fs, path, text)),
  };
}

export function memoryStore(initial: Record<string, string> = {}): ModelStore & { files: Map<string, string> } {
  const files = new Map(Object.entries(initial));
  return {
    files,
    join: (...parts) => parts.filter((p) => p !== "").join("/").replace(/\/+/g, "/"),
    async readText(path) {
      return files.has(path) ? (files.get(path) as string) : null;
    },
    async writeText(path, text) {
      files.set(path, text);
    },
    async appendText(path, text) {
      files.set(path, (files.get(path) ?? "") + text);
    },
  };
}
