// The face detector's files, pinned by version and sha256, and the one change made to the model before loading it.
//
// - YuNet face_detection_yunet_2023mar.onnx (OpenCV Zoo, MIT): the same file face_track.py ran through
//   cv2.FaceDetectorYN.
// - onnxruntime-web 1.30.0 (MIT), the CPU (wasm) build with its Emscripten glue bundled into one ES module, plus its
//   .wasm. Both come from the same npm release, so they always match each other.
// Nothing is shipped in the plugin: the panel downloads the three files on first use (faceRuntime.ts).
//
// The released model declares a fixed 1x3x640x640 input (and 640x640-sized outputs and value_info), although the graph
// is size-agnostic. OpenCV's FaceDetectorYN feeds it the image padded to a multiple of 32 (640x384 for a 640x360
// frame); onnxruntime refuses any input but the declared one. So the bytes are rewritten in memory: the input's height
// and width and the outputs' anchor counts become symbolic dimensions and the fixed-shape value_info entries are
// dropped (onnxruntime infers them again). Weights, nodes and opset are untouched.

export type PinnedFile = { name: string; label: string; urls: string[]; sha256: string; bytes: number };

export const ORT_VERSION = "1.30.0";
const ORT_DIST = (host: string) => host + "/onnxruntime-web@" + ORT_VERSION + "/dist/";

export const ORT_JS: PinnedFile = {
  name: "ort.wasm.bundle.min.mjs",
  label: "face tracker runtime",
  urls: [ORT_DIST("https://cdn.jsdelivr.net/npm") + "ort.wasm.bundle.min.mjs", ORT_DIST("https://unpkg.com") + "ort.wasm.bundle.min.mjs"],
  sha256: "11e64bd8ffe11bd1a2a2f0d6275fdfbbba7262f0b76b99b53d228a8a22ef3d90",
  bytes: 73054,
};
export const ORT_WASM: PinnedFile = {
  name: "ort-wasm-simd-threaded.wasm",
  label: "face tracker engine",
  urls: [ORT_DIST("https://cdn.jsdelivr.net/npm") + "ort-wasm-simd-threaded.wasm", ORT_DIST("https://unpkg.com") + "ort-wasm-simd-threaded.wasm"],
  sha256: "3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2",
  bytes: 14239897,
};
export const YUNET_MODEL: PinnedFile = {
  name: "face_detection_yunet_2023mar.onnx",
  label: "face model",
  urls: [
    "https://media.githubusercontent.com/media/opencv/opencv_zoo/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
  ],
  sha256: "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4",
  bytes: 232589,
};

/** FaceDetectorYN's fixed parameters: strides of the three heads and the padding divisor. */
export const YUNET_STRIDES = [8, 16, 32];
export const YUNET_DIVISOR = 32;
const YUNET_OUTPUTS = ["cls", "obj", "bbox", "kps"];

// ------------------------------------------------------------------ sha256

/** Lowercase hex sha256: WebCrypto when the document has it, else the pure-JS digest below (same result). */
export async function sha256(bytes: Uint8Array): Promise<string> {
  const subtle = webCrypto();
  if (subtle) {
    try {
      const d = new Uint8Array(await subtle.digest("SHA-256", bytes)); // hashes exactly the view's bytes
      return Array.from(d, (x) => x.toString(16).padStart(2, "0")).join("");
    } catch {
      // fall through
    }
  }
  return sha256Hex(bytes);
}

function webCrypto(): any {
  const g: any = globalThis as any;
  if (g.crypto?.subtle) return g.crypto.subtle;
  try {
    if (typeof window !== "undefined" && (window.parent as any)?.crypto?.subtle) return (window.parent as any).crypto.subtle;
  } catch {}
  return null;
}

const K = Uint32Array.from([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** FIPS 180-4 sha256 in plain JS (for a document without WebCrypto). */
export function sha256Hex(bytes: Uint8Array): string {
  const n = bytes.length;
  const total = Math.ceil((n + 9) / 64) * 64;
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[n] = 0x80;
  const view = new DataView(msg.buffer);
  view.setUint32(total - 8, Math.floor(n / 0x20000000));
  view.setUint32(total - 4, (n * 8) >>> 0);
  const h = Uint32Array.from([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, r: number) => (x >>> r) | (x << (32 - r));
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + 4 * i);
    for (let i = 16; i < 64; i += 1) {
      const a = w[i - 15], b = w[i - 2];
      w[i] = (w[i - 16] + (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) + w[i - 7] + (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10))) >>> 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i += 1) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, "0")).join("");
}

// ------------------------------------------------------------------ protobuf (just enough for ModelProto)
type Field = { no: number; wire: number; start: number; end: number; value: number; len: number };

function varint(b: Uint8Array, p: number): [number, number] {
  let v = 0, mul = 1;
  for (let i = 0; i < 10; i += 1) {
    const x = b[p + i];
    if (x === undefined) throw new Error("The face model file is truncated.");
    v += (x & 0x7f) * mul;
    if (x < 0x80) return [v, p + i + 1];
    mul *= 128;
  }
  throw new Error("The face model file is not a valid ONNX model.");
}

function fields(b: Uint8Array, from = 0, to = b.length): Field[] {
  const out: Field[] = [];
  for (let p = from; p < to; ) {
    const start = p;
    const [key, q] = varint(b, p);
    const no = Math.floor(key / 8), wire = key % 8;
    let value = 0, len = 0;
    if (wire === 0) [value, p] = varint(b, q);
    else if (wire === 1) p = q + 8;
    else if (wire === 5) p = q + 4;
    else if (wire === 2) {
      [len, value] = varint(b, q);
      p = value + len;
    } else throw new Error("The face model file has an unsupported protobuf field (wire type " + wire + ").");
    if (p > to) throw new Error("The face model file is truncated.");
    out.push({ no, wire, start, end: p, value, len });
  }
  return out;
}

function encodeVarint(v: number): number[] {
  const out: number[] = [];
  while (v >= 0x80) {
    out.push((v % 128) | 0x80);
    v = Math.floor(v / 128);
  }
  out.push(v);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
const lenField = (no: number, payload: Uint8Array) => concat([Uint8Array.from(encodeVarint(no * 8 + 2).concat(encodeVarint(payload.length))), payload]);
const varintField = (no: number, v: number) => Uint8Array.from(encodeVarint(no * 8).concat(encodeVarint(v)));
const textField = (no: number, s: string) => lenField(no, new TextEncoder().encode(s));
const payload = (b: Uint8Array, f: Field) => b.subarray(f.value, f.value + f.len);
const one = (fs: Field[], no: number) => fs.find((f) => f.no === no && f.wire === 2);

type TensorInfo = { name: string; elemType: number; dims: (number | string)[] };

function readTensorInfo(b: Uint8Array): TensorInfo {
  const vi = fields(b);
  const name = new TextDecoder().decode(payload(b, one(vi, 1)!));
  const type = one(vi, 2);
  const tensor = type && one(fields(b, type.value, type.value + type.len), 1);
  if (!tensor) throw new Error("The face model's " + name + " is not a tensor.");
  const tf = fields(b, tensor.value, tensor.value + tensor.len);
  const et = tf.find((f) => f.no === 1 && f.wire === 0);
  const shape = one(tf, 2);
  const dims = shape
    ? fields(b, shape.value, shape.value + shape.len)
        .filter((f) => f.no === 1 && f.wire === 2)
        .map((d) => {
          const df = fields(b, d.value, d.value + d.len);
          const v = df.find((f) => f.no === 1 && f.wire === 0);
          const p = one(df, 2);
          return v ? v.value : p ? new TextDecoder().decode(payload(b, p)) : "?";
        })
    : [];
  return { name, elemType: et ? et.value : 0, dims };
}

function writeTensorInfo(t: TensorInfo): Uint8Array {
  const dims = t.dims.map((d) => lenField(1, typeof d === "number" ? varintField(1, d) : textField(2, d)));
  const tensor = concat([varintField(1, t.elemType), lenField(2, concat(dims))]);
  return concat([textField(1, t.name), lenField(2, lenField(1, tensor))]);
}

/**
 * The model with a symbolic input size: input [1, 3, H, W], outputs [1, N_<name>, C]. Throws when the bytes are not the
 * YuNet layout this rewrite expects (one 1x3xHxW float input, twelve 1xNxC float outputs).
 */
export function withSymbolicInputSize(model: Uint8Array): Uint8Array {
  const top = fields(model);
  const graph = top.find((f) => f.no === 7 && f.wire === 2);
  if (!graph) throw new Error("The face model file has no graph.");
  const parts: Uint8Array[] = [];
  let inputs = 0, outputs = 0;
  for (const f of fields(model, graph.value, graph.value + graph.len)) {
    if (f.no === 13) continue; // value_info: fixed 640x640 intermediate shapes
    if ((f.no === 11 || f.no === 12) && f.wire === 2) {
      const t = readTensorInfo(payload(model, f));
      if (f.no === 11) {
        if (t.elemType !== 1 || t.dims.length !== 4 || t.dims[0] !== 1 || t.dims[1] !== 3) throw new Error("Unexpected face model input " + t.name + ".");
        t.dims = [1, 3, "H", "W"];
        inputs += 1;
      } else {
        if (t.elemType !== 1 || t.dims.length !== 3 || t.dims[0] !== 1) throw new Error("Unexpected face model output " + t.name + ".");
        t.dims = [1, "N_" + t.name, t.dims[2]];
        outputs += 1;
      }
      parts.push(lenField(f.no, writeTensorInfo(t)));
      continue;
    }
    parts.push(model.subarray(f.start, f.end));
  }
  if (inputs !== 1 || outputs !== YUNET_STRIDES.length * YUNET_OUTPUTS.length) throw new Error("Unexpected face model: " + inputs + " inputs, " + outputs + " outputs.");
  const newGraph = lenField(7, concat(parts));
  return concat(top.map((f) => (f === graph ? newGraph : model.subarray(f.start, f.end))));
}
