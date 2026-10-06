import { type YuNetFace, type DecodeOptions, bgrToBlob, decodeYuNet } from "./decode.ts";
import { type PinnedFile, ORT_JS, ORT_VERSION, ORT_WASM, YUNET_MODEL, sha256, withSymbolicInputSize } from "./model.ts";
import { type ModelEngine, startThreadEngine, startWorkerEngine } from "./engine.ts";

export type RuntimeFiles = {
  join(...parts: string[]): string;
  dirname(path: string): string;
  exists(path: string): Promise<boolean>;
  readBytes(path: string): Promise<Uint8Array>;
  downloadFile(url: string, dest: string): Promise<unknown>;
  mkdirp(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
};

export type FaceDetector = {
  detect(bgr: Uint8Array, width: number, height: number): Promise<YuNetFace[]>;
  info: { ort: string; engine: "worker" | "thread"; loadedVia: string; workerError: string; loadMs: number; modelSha256: string; files: string[] };
  close(): void;
};

const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const errText = (e: unknown) => String((e && (e as { message?: unknown }).message) || e || "unknown error").slice(0, 300);

async function readVerified(files: RuntimeFiles, path: string, file: PinnedFile, own: boolean): Promise<Uint8Array | null> {
  if (!(await files.exists(path))) return null;
  try {
    const bytes = await files.readBytes(path);
    if (bytes.length === file.bytes && (await sha256(bytes)) === file.sha256) return bytes;
  } catch {}
  if (own) await quietRemove(files, path);
  return null;
}

async function quietRemove(files: RuntimeFiles, path: string) {
  try {
    if ((await files.exists(path))) (await files.remove(path));
  } catch {}
}

async function renameWithRetry(files: RuntimeFiles, from: string, to: string) {
  for (let k = 0; ; k += 1) {
    try {
      await files.rename(from, to);
      return;
    } catch (e) {
      if (k >= 4) throw e;
      await new Promise((r) => setTimeout(r, 200 * (k + 1)));
    }
  }
}

async function download(files: RuntimeFiles, file: PinnedFile, dest: string): Promise<Uint8Array> {
  const reasons: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const url = file.urls[Math.min(attempt, file.urls.length - 1)];
    const part = dest + ".part" + attempt;
    await quietRemove(files, part);
    try {
      let timer: any = null;
      await Promise.race([
        files.downloadFile(url, part),
        new Promise((_, reject) => (timer = setTimeout(() => reject(new Error("no answer after " + DOWNLOAD_TIMEOUT_MS / 1000 + " s")), DOWNLOAD_TIMEOUT_MS))),
      ]).finally(() => clearTimeout(timer));
      if (!(await files.exists(part))) throw new Error("nothing was saved");
      const bytes = await files.readBytes(part);
      if (bytes.length !== file.bytes) throw new Error("the server sent " + bytes.length + " bytes, not " + file.bytes);
      const got = await sha256(bytes);
      if (got !== file.sha256) throw new Error("the file's checksum is wrong (sha256 " + got.slice(0, 12) + "…)");
      await renameWithRetry(files, part, dest);
      return bytes;
    } catch (e) {
      reasons.push(url.replace(/^https:\/\/([^/]+)\/.*$/, "$1") + ": " + errText(e));
      await quietRemove(files, part);
    }
  }
  throw new Error("Could not download the " + file.label + " (" + file.name + "). " + reasons.join("; ") + ". Check the internet connection and try again.");
}

export type PinnedBytes = { bytes: Uint8Array; path: string };

export async function pinnedRuntimeFiles(
  files: RuntimeFiles,
  runtimeDir: string,
  progress: (s: string) => void = () => {},
  reuse: Partial<Record<"model" | "ortJs" | "ortWasm", string[]>> = {}
): Promise<{ model: PinnedBytes; ortJs: PinnedBytes; ortWasm: PinnedBytes }> {
  const ortDir = files.join(runtimeDir, "ort", "onnxruntime-web-" + ORT_VERSION);
  const want: { key: "model" | "ortJs" | "ortWasm"; file: PinnedFile; dest: string }[] = [
    { key: "model", file: YUNET_MODEL, dest: files.join(runtimeDir, "yunet", YUNET_MODEL.name) },
    { key: "ortJs", file: ORT_JS, dest: files.join(ortDir, ORT_JS.name) },
    { key: "ortWasm", file: ORT_WASM, dest: files.join(ortDir, ORT_WASM.name) },
  ];
  const got: Partial<Record<"model" | "ortJs" | "ortWasm", PinnedBytes>> = {};
  for (const w of want) {
    const own = await readVerified(files, w.dest, w.file, true);
    if (own) {
      got[w.key] = { bytes: own, path: w.dest };
      continue;
    }
    for (const p of reuse[w.key] || []) {
      const bytes = await readVerified(files, p, w.file, false);
      if (bytes) {
        got[w.key] = { bytes, path: p };
        break;
      }
    }
  }
  const missing = want.filter((w) => !got[w.key]);
  if (missing.length) {
    const mb = missing.reduce((n, w) => n + w.file.bytes, 0) / 1e6;
    progress("Downloading face tracking (one time, " + (mb < 1 ? mb.toFixed(1) : Math.round(mb)) + " MB)…");
  }
  for (const w of missing) {
    await files.mkdirp(files.dirname(w.dest));
    got[w.key] = { bytes: await download(files, w.file, w.dest), path: w.dest };
  }
  return { model: got.model!, ortJs: got.ortJs!, ortWasm: got.ortWasm! };
}

export function detectorOnEngine(engine: ModelEngine, info: Omit<FaceDetector["info"], "ort" | "engine" | "loadedVia">, decode: DecodeOptions = {}): FaceDetector {
  let scratch: Float32Array | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const detectOne = async (bgr: Uint8Array, width: number, height: number) => {
    const blob = bgrToBlob(bgr, width, height, scratch);
    const r = await engine.run(blob.data, blob.width, blob.height);
    scratch = r.input;
    return decodeYuNet(r.outputs, blob.width, blob.height, decode);
  };
  return {
    info: { ...info, ort: engine.ort || ORT_VERSION, engine: engine.kind, loadedVia: engine.via },
    detect(bgr, width, height) {
      const run = queue.then(() => detectOne(bgr, width, height));
      queue = run.catch(() => undefined);
      return run;
    },
    close() {
      engine.close();
    },
  };
}

export type LoadOptions = {
  files: RuntimeFiles;
  runtimeDir: string;
  progress?: (s: string) => void;
  worker?: boolean;
  reuse?: Partial<Record<"model" | "ortJs" | "ortWasm", string[]>>;
  decode?: DecodeOptions;
};

export async function loadFaceDetector(o: LoadOptions): Promise<FaceDetector> {
  const t0 = Date.now();
  const progress = o.progress || (() => {});
  const { model, ortJs, ortWasm } = await pinnedRuntimeFiles(o.files, o.runtimeDir, progress, o.reuse);
  progress("Starting face tracking…");
  const symbolic = withSymbolicInputSize(model.bytes);
  let engine: ModelEngine | null = null;
  let workerError = "";
  if (o.worker !== false) {
    try {
      engine = await startWorkerEngine(ortJs.bytes, ortWasm.bytes, symbolic);
    } catch (e) {
      workerError = errText(e);
    }
  }
  if (!engine) engine = await startThreadEngine(ortJs.bytes, ortWasm.bytes, symbolic);
  return detectorOnEngine(engine, { workerError, loadMs: Date.now() - t0, modelSha256: YUNET_MODEL.sha256, files: [model.path, ortJs.path, ortWasm.path] }, o.decode);
}
