// The face detector in the panel: YuNet on onnxruntime-web's CPU (wasm) backend, one wasm thread (the panel is not
// cross-origin isolated, so wasm threads are off anyway), in a Worker (faceWorker.ts) so the app's UI thread stays
// free, else in the panel's own thread. No Python, no shell, no install.
//
// The three files (yunetModel.ts pins them) are downloaded on first use into <plugin data>/runtime/ with the app's
// FileSystem.downloadFile, checked against their sha256 (downloadFile does not check the HTTP status, so a wrong
// answer shows up here), tried once more (from the mirror, when there is one) and then cached. A model the earlier
// Python setup downloaded to <plugin data>/models/ is used as it is.
//
// The runtime's ES module is imported from its bytes through a blob: URL (the panel CSP allows blob: and data:
// scripts; data: is the fallback in the panel thread), the .wasm bytes go to env.wasm.wasmBinary, so the runtime
// fetches nothing itself. One detector per panel page.
import { dataRoot, fs } from "./host";
import { removeQuiet, toBytes } from "./faceFrames";
import { type YuNetFace, bgrToBlob, decodeYuNet } from "./yunetDecode";
import { type PinnedFile, ORT_JS, ORT_VERSION, ORT_WASM, YUNET_MODEL, sha256, withSymbolicInputSize } from "./yunetModel";
import { type ModelEngine, startWorkerEngine } from "./faceWorker";

export type FaceDetector = {
  /** Faces in a packed BGR24 image (pixels of that image), highest score first; FaceDetectorYN(score 0.8, NMS 0.3). */
  detect(bgr: Uint8Array, width: number, height: number): Promise<YuNetFace[]>;
  /** engine: "worker" (off the app's main thread) or "panel" (in the panel thread, when no Worker could be made). */
  info: { ort: string; engine: "worker" | "panel"; loadedVia: "blob" | "data"; workerError: string; loadMs: number; files: string[] };
};

const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export function runtimeDir(): string {
  return fs().join(dataRoot(), "runtime");
}

const errText = (e: any) => String((e && e.message) || e || "unknown error").slice(0, 300);

/** A cached file whose sha256 matches, else null (a damaged copy is deleted). */
async function readVerified(path: string, file: PinnedFile): Promise<Uint8Array | null> {
  if (!(await fs().exists(path))) return null;
  try {
    const bytes = toBytes(await fs().readFile(path));
    if (bytes.length === file.bytes && (await sha256(bytes)) === file.sha256) return bytes;
  } catch {}
  (await removeQuiet(path));
  return null;
}

// A virus scanner can hold a fresh file for a moment (Windows): wait a little between tries.
async function renameWithRetry(from: string, to: string) {
  for (let k = 0; ; k += 1) {
    try {
      (await fs().rename(from, to));
      return;
    } catch (e) {
      if (k >= 4) throw e;
      await new Promise((r) => setTimeout(r, 200 * (k + 1)));
    }
  }
}

/** Download `file` to `dest`: write to a .part file, check size and sha256, then move it into place. Two tries. */
async function download(file: PinnedFile, dest: string): Promise<Uint8Array> {
  const reasons: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const url = file.urls[Math.min(attempt, file.urls.length - 1)];
    const part = dest + ".part" + attempt;
    (await removeQuiet(part));
    try {
      let timer: any = null;
      await Promise.race([
        fs().downloadFile(url, part),
        new Promise((_, reject) => (timer = setTimeout(() => reject(new Error("no answer after " + DOWNLOAD_TIMEOUT_MS / 1000 + " s")), DOWNLOAD_TIMEOUT_MS))),
      ]).finally(() => clearTimeout(timer));
      if (!(await fs().exists(part))) throw new Error("nothing was saved");
      const bytes = toBytes(await fs().readFile(part));
      if (bytes.length !== file.bytes) throw new Error("the server sent " + bytes.length + " bytes, not " + file.bytes);
      const got = await sha256(bytes);
      if (got !== file.sha256) throw new Error("the file's checksum is wrong (sha256 " + got.slice(0, 12) + "…)");
      await renameWithRetry(part, dest);
      return bytes;
    } catch (e) {
      reasons.push(url.replace(/^https:\/\/([^/]+)\/.*$/, "$1") + ": " + errText(e));
      (await removeQuiet(part));
    }
  }
  throw new Error("Could not download the " + file.label + " (" + file.name + "). " + reasons.join("; ") + ". Check the internet connection and try again.");
}

type Wanted = { file: PinnedFile; dest: string; also: string[] };

/** The pinned files from the cache (or their extra places), downloading the ones missing or damaged. */
async function pinnedFiles(want: Wanted[], progress: (s: string) => void): Promise<{ bytes: Uint8Array; path: string }[]> {
  const got: ({ bytes: Uint8Array; path: string } | null)[] = [];
  for (const w of want) {
    let hit: { bytes: Uint8Array; path: string } | null = null;
    for (const p of [w.dest].concat(w.also)) {
      const bytes = await readVerified(p, w.file);
      if (bytes) {
        hit = { bytes, path: p };
        break;
      }
    }
    got.push(hit);
  }
  const missing = want.filter((_, i) => !got[i]);
  if (missing.length) {
    const mb = missing.reduce((n, w) => n + w.file.bytes, 0) / 1e6;
    progress("Downloading face tracking (one time, " + (mb < 1 ? mb.toFixed(1) : Math.round(mb)) + " MB)…");
  }
  for (let i = 0; i < want.length; i += 1) {
    if (got[i]) continue;
    (await fs().mkdir(fs().dirname(want[i].dest), { recursive: true }));
    got[i] = { bytes: await download(want[i].file, want[i].dest), path: want[i].dest };
  }
  return got as { bytes: Uint8Array; path: string }[];
}

// ---------------------------------------------------------------- onnxruntime-web, imported from its bytes
type OrtTensor = { data: ArrayLike<number>; dims: readonly number[] };
type OrtSession = { inputNames: readonly string[]; run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>> };
type Ort = {
  env: any;
  InferenceSession: { create(model: Uint8Array, options?: Record<string, unknown>): Promise<OrtSession> };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
};

// import() built at run time: the app compiles the panel to CommonJS, and neither esbuild nor that step may rewrite it
const importUrl = new Function("u", "return import(u)") as (url: string) => Promise<any>;

function base64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(s);
}

async function importOrt(js: Uint8Array): Promise<{ ort: Ort; via: "blob" | "data" }> {
  const g: any = globalThis as any;
  let first = "";
  if (typeof g.Blob === "function" && g.URL && typeof g.URL.createObjectURL === "function") {
    const url = g.URL.createObjectURL(new g.Blob([js], { type: "text/javascript" }));
    try {
      return { ort: await importUrl(url), via: "blob" };
    } catch (e) {
      first = errText(e);
    } finally {
      g.URL.revokeObjectURL(url);
    }
  }
  try {
    return { ort: await importUrl("data:text/javascript;base64," + base64(js)), via: "data" };
  } catch (e) {
    throw new Error("The face tracker runtime could not be started: " + (first ? first + "; " : "") + errText(e));
  }
}

/** The model run in the panel's own thread (when no Worker can be made). */
async function panelEngine(js: Uint8Array, wasm: Uint8Array, model: Uint8Array): Promise<ModelEngine> {
  const { ort, via } = await importOrt(js);
  if (!ort || !ort.env || !ort.InferenceSession) throw new Error("The face tracker runtime did not load (no onnxruntime API).");
  ort.env.logLevel = "error";
  ort.env.wasm.wasmBinary = wasm;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  let session: OrtSession;
  try {
    session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  } catch (e) {
    throw new Error("The face model could not be loaded: " + errText(e));
  }
  const input = session.inputNames[0] || "input";
  return {
    kind: "panel",
    via,
    ort: String((ort.env.versions && ort.env.versions.web) || ORT_VERSION),
    async run(data, width, height) {
      const out = await session.run({ [input]: new ort.Tensor("float32", data, [1, 3, height, width]) });
      const outputs: Record<string, ArrayLike<number>> = {};
      for (const k of Object.keys(out)) outputs[k] = out[k].data;
      return { outputs, input: data }; // the runtime copied the input into its own memory
    },
  };
}

export type DetectorOptions = { worker?: boolean }; // worker: false runs the model in the panel thread (tests)

async function createDetector(progress: (s: string) => void, o: DetectorOptions): Promise<FaceDetector> {
  const t0 = Date.now();
  const dir = runtimeDir();
  const ortDir = fs().join(dir, "onnxruntime-web-" + ORT_VERSION);
  const [model, js, wasm] = await pinnedFiles(
    [
      // a model the earlier Python setup downloaded is the same file
      { file: YUNET_MODEL, dest: fs().join(dir, YUNET_MODEL.name), also: [fs().join(dataRoot(), "models", YUNET_MODEL.name)] },
      { file: ORT_JS, dest: fs().join(ortDir, ORT_JS.name), also: [] },
      { file: ORT_WASM, dest: fs().join(ortDir, ORT_WASM.name), also: [] },
    ],
    progress
  );
  progress("Starting face tracking…");
  const symbolic = withSymbolicInputSize(model.bytes);
  let engine: ModelEngine | null = null;
  let workerError = "";
  if (o.worker !== false) {
    try {
      engine = await startWorkerEngine(js.bytes, wasm.bytes, symbolic);
    } catch (e) {
      workerError = errText(e);
    }
  }
  if (!engine) engine = await panelEngine(js.bytes, wasm.bytes, symbolic);
  const eng = engine;
  let scratch: Float32Array | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const detectOne = async (bgr: Uint8Array, width: number, height: number) => {
    const blob = bgrToBlob(bgr, width, height, scratch);
    const r = await eng.run(blob.data, blob.width, blob.height);
    scratch = r.input; // reused (a worker hands it back)
    return decodeYuNet(r.outputs, blob.width, blob.height);
  };
  return {
    info: { ort: eng.ort || ORT_VERSION, engine: eng.kind, loadedVia: eng.via, workerError, loadMs: Date.now() - t0, files: [model.path, js.path, wasm.path] },
    detect(bgr, width, height) {
      // one run at a time: a session runs once at a time, and the input buffer is shared
      const run = queue.then(() => detectOne(bgr, width, height));
      queue = run.catch(() => undefined);
      return run;
    },
  };
}

const loading = new Map<string, Promise<FaceDetector>>();

/** The detector for this panel page: downloaded and started on first use, then shared. A failure is retried next call. */
export function loadFaceDetector(progress: (s: string) => void = () => {}, o: DetectorOptions = {}): Promise<FaceDetector> {
  const key = o.worker === false ? "panel" : "auto";
  let p = loading.get(key);
  if (!p) {
    const created = createDetector(progress, o);
    p = created;
    loading.set(key, created);
    created.catch(() => {
      if (loading.get(key) === created) loading.delete(key);
    });
  }
  return p;
}
