import type { ExecutionFont, FontFile } from "../../engine/compiler/font-faces.mjs";
import { fontFaceDescriptors } from "../../engine/compiler/font-faces.mjs";

export type FontSource = (path: string) => Promise<Uint8Array>;

export type DeclaredFonts = { alias(family: string): string; faces: number };

type Face = { family: string; file: FontFile; descriptors: FontFaceDescriptors; bytes: Uint8Array; hash: string };

type FontFaceCtor = new (family: string, source: ArrayBuffer | ArrayBufferView, descriptors?: FontFaceDescriptors) => FontFace;

export function fnv1a(bytes: Uint8Array, seed = 0x811c9dc5): string {
  let h = seed >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const textBytes = (s: string) => new TextEncoder().encode(s);

export function familyAlias(family: string, faces: { file: FontFile; descriptors: FontFaceDescriptors; hash: string }[]): string {
  const spec = JSON.stringify(faces.map((f) => [f.file.path, f.file.weight, f.descriptors, f.hash]));
  return "EO " + family + " " + fnv1a(textBytes(spec));
}

const declared = new WeakMap<Document, Map<string, Promise<void>>>();

export async function declareFonts(doc: Document, fonts: Record<string, ExecutionFont>, read: FontSource): Promise<DeclaredFonts> {
  const byFamily = new Map<string, Face[]>();
  const bytesOf = new Map<string, Promise<Uint8Array>>();
  for (const f of Object.values(fonts)) {
    for (const file of f.files) {
      if (!bytesOf.has(file.path)) bytesOf.set(file.path, read(file.path));
      const bytes = await bytesOf.get(file.path)!;
      const descriptors = fontFaceDescriptors(f, file) as FontFaceDescriptors;
      const list = byFamily.get(f.family) ?? [];
      const face: Face = { family: f.family, file, descriptors, bytes, hash: fnv1a(bytes) + ":" + bytes.length };
      const same = (x: Face) => x.file.path === file.path && x.file.weight === file.weight && JSON.stringify(x.descriptors) === JSON.stringify(descriptors);
      if (!list.some(same)) list.push(face);
      byFamily.set(f.family, list);
    }
  }
  let map = declared.get(doc);
  if (!map) declared.set(doc, (map = new Map()));
  const aliases = new Map<string, string>();
  for (const f of Object.values(fonts)) if (!f.files.length) aliases.set(f.family, f.family);
  const Ctor = (doc.defaultView as unknown as { FontFace: FontFaceCtor }).FontFace;
  const pending: Promise<void>[] = [];
  for (const [family, faces] of byFamily) {
    const alias = familyAlias(family, faces);
    aliases.set(family, alias);
    let ready = map.get(alias);
    if (!ready) {
      ready = (async () => {
        const loaded = await Promise.all(
          faces.map(async (x) => {
            const face = new Ctor(alias, x.bytes.slice(), x.descriptors);
            await face.load();
            return face;
          }),
        );
        for (const face of loaded) doc.fonts.add(face);
      })();
      ready.catch(() => map!.delete(alias));
      map.set(alias, ready);
    }
    pending.push(ready);
  }
  await Promise.all(pending);
  const faces = [...byFamily.values()].reduce((n, l) => n + l.length, 0);
  return {
    faces,
    alias(family: string) {
      const a = aliases.get(family);
      if (!a) throw new Error("Font family " + family + " was not declared for this compile.");
      return a;
    },
  };
}
