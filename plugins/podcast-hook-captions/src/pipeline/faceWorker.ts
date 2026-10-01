// The face model's inference off the app's main thread. A panel is a same-origin iframe, so it shares the app
// window's renderer thread: a 15 ms model run per frame there would stall the app's UI for the whole tracking pass.
// So the model runs in a dedicated module Worker made from a blob: URL (the panel CSP allows blob: workers), which
// imports the same onnxruntime-web module bytes (through a blob: URL) and gets the same .wasm and model bytes; only
// the input tensor goes in and the twelve output tensors come back (transferred, not copied). Padding, decoding and
// NMS stay in yunetDecode.ts on the panel side, so the results are the same as in-thread inference.
// When a Worker cannot be made (or the runtime fails to start in it), the caller runs the model in the panel thread.

/** Runs the model on one padded NCHW input; gives back the outputs by name and the input array (for reuse). */
export type ModelEngine = {
  kind: "worker" | "panel";
  via: "blob" | "data";
  ort: string;
  run(data: Float32Array, width: number, height: number): Promise<{ outputs: Record<string, ArrayLike<number>>; input: Float32Array }>;
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

/** A worker running the model, or an Error saying why there is none (the caller then runs it in the panel). */
export async function startWorkerEngine(ortJs: Uint8Array, wasm: Uint8Array, model: Uint8Array): Promise<ModelEngine> {
  const g: any = globalThis as any;
  if (typeof g.Worker !== "function" || typeof g.Blob !== "function" || !g.URL || typeof g.URL.createObjectURL !== "function") throw new Error("no Worker here");
  const ortUrl = g.URL.createObjectURL(new g.Blob([ortJs], { type: "text/javascript" }));
  const workerUrl = g.URL.createObjectURL(new g.Blob([WORKER_SOURCE], { type: "text/javascript" }));
  let worker: any;
  try {
    worker = new g.Worker(workerUrl, { type: "module", name: "podcast-hook-captions faces" });
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
  const call = (msg: any, transfer: any[], ms: number) =>
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
  };
}
