export type ModelEngine = {
  kind: "worker" | "thread";
  via: "blob" | "data" | "url";
  ort: string;
  run(data: Float32Array, width: number, height: number): Promise<{ outputs: Record<string, ArrayLike<number>>; input: Float32Array }>;
  close(): void;
};

const WORKER_SOURCE = `
let ort = null, session = null, input = "input";
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "init") {
      ort = await import(m.ortUrl);
      ort.env.logLevel = "error";
      ort.env.wasm.wasmBinary = m.wasm;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      session = await ort.InferenceSession.create(m.model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      input = session.inputNames[0] || "input";
      self.postMessage({ id: m.id, ok: true, ort: String((ort.env.versions && ort.env.versions.web) || "") });
    } else if (m.type === "run") {
      const out = await session.run({ [input]: new ort.Tensor("float32", m.data, m.dims) });
      const res = {};
      const moved = [m.data.buffer];
      for (const k of Object.keys(out)) {
        const copy = new Float32Array(out[k].data);
        res[k] = copy;
        moved.push(copy.buffer);
      }
      self.postMessage({ id: m.id, ok: true, res, input: m.data }, moved);
    }
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: String((err && err.message) || err) });
  }
};
`;

const INIT_TIMEOUT_MS = 60000;
const RUN_TIMEOUT_MS = 30000;

const errText = (e: unknown) => String((e && (e as { message?: unknown }).message) || e || "unknown error").slice(0, 300);

export async function startWorkerEngine(ortJs: Uint8Array, wasm: Uint8Array, model: Uint8Array): Promise<ModelEngine> {
  const g = globalThis as any;
  if (typeof g.Worker !== "function" || typeof g.Blob !== "function" || !g.URL || typeof g.URL.createObjectURL !== "function") throw new Error("no Worker here");
  const ortUrl = g.URL.createObjectURL(new g.Blob([ortJs], { type: "text/javascript" }));
  const workerUrl = g.URL.createObjectURL(new g.Blob([WORKER_SOURCE], { type: "text/javascript" }));
  let worker: any;
  try {
    worker = new g.Worker(workerUrl, { type: "module", name: "eo-shorts faces" });
  } catch (e) {
    g.URL.revokeObjectURL(ortUrl);
    g.URL.revokeObjectURL(workerUrl);
    throw e;
  }
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; timer: any }>();
  let seq = 0;
  let dead: Error | null = null;
  const fail = (e: Error) => {
    dead = e;
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      p.reject(e);
    }
    pending.clear();
  };
  worker.onmessage = (e: any) => {
    const m = e.data;
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    clearTimeout(p.timer);
    if (m.ok) p.resolve(m);
    else p.reject(new Error(m.error));
  };
  worker.onerror = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    fail(new Error("The face tracker worker stopped: " + ((e && e.message) || "error")));
  };
  const call = (msg: Record<string, unknown>, transfer: unknown[], ms: number) =>
    new Promise<any>((resolve, reject) => {
      if (dead) return reject(dead);
      const id = (seq += 1);
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error("The face tracker worker did not answer in " + ms / 1000 + " s."));
      }, ms);
      pending.set(id, { resolve, reject, timer });
      worker.postMessage(Object.assign({ id }, msg), transfer);
    });
  let ort = "";
  try {
    ort = (await call({ type: "init", ortUrl, wasm, model }, [], INIT_TIMEOUT_MS)).ort;
  } catch (e) {
    worker.terminate();
    throw e;
  } finally {
    g.URL.revokeObjectURL(ortUrl);
    g.URL.revokeObjectURL(workerUrl);
  }
  return {
    kind: "worker",
    via: "blob",
    ort,
    async run(data, width, height) {
      const r = await call({ type: "run", data, dims: [1, 3, height, width] }, [data.buffer], RUN_TIMEOUT_MS);
      return { outputs: r.res, input: r.input };
    },
    close() {
      fail(new Error("The face tracker was closed."));
      worker.terminate();
    },
  };
}

type OrtTensor = { data: ArrayLike<number>; dims: readonly number[] };
type OrtSession = { inputNames: readonly string[]; run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>; release?: () => Promise<void> };
type Ort = {
  env: any;
  InferenceSession: { create(model: Uint8Array, options?: Record<string, unknown>): Promise<OrtSession> };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
};

const importUrl = new Function("u", "return import(u)") as (url: string) => Promise<any>;

function base64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(s);
}

async function importOrtBytes(js: Uint8Array): Promise<{ ort: Ort; via: "blob" | "data" }> {
  const g = globalThis as any;
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

export async function startThreadEngine(ortJs: Uint8Array | string, wasm: Uint8Array, model: Uint8Array): Promise<ModelEngine> {
  const loaded = typeof ortJs === "string" ? { ort: (await importUrl(ortJs)) as Ort, via: "url" as const } : await importOrtBytes(ortJs);
  const ort = loaded.ort;
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
    kind: "thread",
    via: loaded.via,
    ort: String((ort.env.versions && ort.env.versions.web) || ""),
    async run(data, width, height) {
      const out = await session.run({ [input]: new ort.Tensor("float32", data, [1, 3, height, width]) });
      const outputs: Record<string, ArrayLike<number>> = {};
      for (const k of Object.keys(out)) outputs[k] = out[k].data;
      return { outputs, input: data };
    },
    close() {
      if (session.release) session.release().catch(() => undefined);
    },
  };
}
