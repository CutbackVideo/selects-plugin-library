import { fontKind } from "./sfnt.ts";

export type SubsetOptions = {
  keepAllFeatures?: boolean;
  extraFeatures?: string[];
  nameIds?: number[] | "all";
  noHinting?: boolean;
  pin?: Record<string, number>;
  retainGids?: boolean;
};

export const SCENE_SUBSET_OPTIONS: Readonly<SubsetOptions> = Object.freeze({
  keepAllFeatures: false,
  extraFeatures: ["lnum"],
  nameIds: [0, 1, 2, 3, 4, 5, 6, 13, 14],
});

export type Subsetter = {
  subset(font: Uint8Array, codepoints: Iterable<number>, opts?: SubsetOptions): Uint8Array;
  memoryBytes(): number;
};

const SETS = { UNICODE: 1, NAME_ID: 4, NAME_LANG_ID: 5, LAYOUT_FEATURE_TAG: 6 } as const;
const FLAGS = { NO_HINTING: 1, RETAIN_GIDS: 2 } as const;
const tag = (s: string) => ((s.charCodeAt(0) << 24) | (s.charCodeAt(1) << 16) | (s.charCodeAt(2) << 8) | s.charCodeAt(3)) >>> 0;

type Exports = {
  memory: WebAssembly.Memory;
  _initialize?: () => void;
  malloc(n: number): number;
  free(p: number): void;
  hb_blob_create(data: number, length: number, mode: number, user: number, destroy: number): number;
  hb_blob_destroy(b: number): void;
  hb_blob_get_data(b: number, lengthPtr: number): number;
  hb_blob_get_length(b: number): number;
  hb_face_create(blob: number, index: number): number;
  hb_face_destroy(f: number): void;
  hb_face_reference_blob(f: number): number;
  hb_set_add(set: number, v: number): void;
  hb_set_clear(set: number): void;
  hb_set_invert(set: number): void;
  hb_subset_input_create_or_fail(): number;
  hb_subset_input_destroy(i: number): void;
  hb_subset_input_unicode_set(i: number): number;
  hb_subset_input_set(i: number, which: number): number;
  hb_subset_input_set_flags(i: number, flags: number): void;
  hb_subset_input_pin_axis_location(i: number, face: number, axis: number, value: number): number;
  hb_subset_or_fail(face: number, input: number): number;
};

const REQUIRED: (keyof Exports)[] = [
  "memory",
  "malloc",
  "free",
  "hb_blob_create",
  "hb_face_create",
  "hb_subset_input_create_or_fail",
  "hb_subset_input_set",
  "hb_subset_or_fail",
  "hb_face_reference_blob",
];

export async function createSubsetter(wasm: Uint8Array | WebAssembly.Module): Promise<Subsetter> {
  const instance =
    wasm instanceof WebAssembly.Module
      ? await WebAssembly.instantiate(wasm, {})
      : (await WebAssembly.instantiate(wasm.slice() as Uint8Array<ArrayBuffer>, {})).instance;
  const x = instance.exports as unknown as Exports;
  const missing = REQUIRED.filter((k) => !(k in x));
  if (missing.length) throw new Error("This is not harfbuzz-subset.wasm (missing " + missing.join(", ") + ").");
  if (typeof x._initialize === "function") x._initialize();
  const heap = () => new Uint8Array(x.memory.buffer);

  function subset(fontBytes: Uint8Array, codepoints: Iterable<number>, opts: SubsetOptions = SCENE_SUBSET_OPTIONS): Uint8Array {
    const kind = fontKind(fontBytes);
    if (kind !== "truetype" && kind !== "opentype") {
      throw new Error("The subsetter reads TrueType/OpenType fonts only; this font is " + kind + ".");
    }
    const fontPtr = x.malloc(fontBytes.length);
    if (!fontPtr) throw new Error("The subsetter ran out of memory.");
    heap().set(fontBytes, fontPtr);
    const blob = x.hb_blob_create(fontPtr, fontBytes.length, 2 , 0, 0);
    const face = x.hb_face_create(blob, 0);
    x.hb_blob_destroy(blob);
    const input = x.hb_subset_input_create_or_fail();
    if (!input) {
      x.hb_face_destroy(face);
      x.free(fontPtr);
      throw new Error("hb_subset_input_create_or_fail failed");
    }
    try {
      const uni = x.hb_subset_input_unicode_set(input);
      for (const cp of codepoints) x.hb_set_add(uni, cp);
      const feats = x.hb_subset_input_set(input, SETS.LAYOUT_FEATURE_TAG);
      if (opts.keepAllFeatures) {
        x.hb_set_clear(feats);
        x.hb_set_invert(feats);
      } else {
        for (const f of opts.extraFeatures ?? ["lnum"]) x.hb_set_add(feats, tag(f));
      }
      const names = x.hb_subset_input_set(input, SETS.NAME_ID);
      x.hb_set_clear(names);
      if (opts.nameIds === "all") {
        x.hb_set_invert(names);
        const langs = x.hb_subset_input_set(input, SETS.NAME_LANG_ID);
        x.hb_set_clear(langs);
        x.hb_set_invert(langs);
      } else {
        for (const id of opts.nameIds ?? [0, 1, 2, 3, 4, 5, 6, 13, 14]) x.hb_set_add(names, id);
      }
      let flags = 0;
      if (opts.noHinting) flags |= FLAGS.NO_HINTING;
      if (opts.retainGids) flags |= FLAGS.RETAIN_GIDS;
      x.hb_subset_input_set_flags(input, flags);
      for (const [t, v] of Object.entries(opts.pin ?? {})) {
        if (!x.hb_subset_input_pin_axis_location(input, face, tag(t), v)) throw new Error("Cannot pin axis " + t + ".");
      }
      const out = x.hb_subset_or_fail(face, input);
      if (!out) throw new Error("HarfBuzz could not subset this font.");
      const outBlob = x.hb_face_reference_blob(out);
      const ptr = x.hb_blob_get_data(outBlob, 0);
      const len = x.hb_blob_get_length(outBlob);
      const bytes = heap().slice(ptr, ptr + len);
      x.hb_blob_destroy(outBlob);
      x.hb_face_destroy(out);
      if (!len) throw new Error("HarfBuzz returned an empty subset.");
      return bytes;
    } finally {
      x.hb_subset_input_destroy(input);
      x.hb_face_destroy(face);
      x.free(fontPtr);
    }
  }
  return { subset, memoryBytes: () => x.memory.buffer.byteLength };
}
