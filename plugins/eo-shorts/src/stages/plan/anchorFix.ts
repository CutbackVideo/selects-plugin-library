import { norm, screenWords, sim, spokenWords, type SpokenWord } from "../../lint/anchors.ts";
import { pageIds } from "../../lint/visibility.ts";
import type { Json, Obj } from "../../lint/py.ts";

export type AnchorChange = {
  scene: string;
  path: string;
  item: string | null;
  old: string;
  new: string;
  sceneWord: number;
  sourceWord: number | null;
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
type Range = [number, number];

export function alignCopy(copy: unknown, spoken: SpokenWord[]): { id: unknown; j: number }[] {
  const A: { id: unknown; text: string; j: number }[] = [];
  for (const c of Array.isArray(copy) ? copy : []) {
    if (!isObj(c) || !Array.isArray(c.lines)) continue;
    for (const line of c.lines) if (typeof line === "string") for (const w of screenWords(line)) A.push({ id: c.id, text: w, j: -1 });
  }
  const B = spoken, n = A.length, m = B.length;
  const S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const P = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = sim(A[i - 1].text, B[j - 1].text);
      let best0 = S[i - 1][j], best1 = 1;
      const left = S[i][j - 1];
      if (left > best0) { best0 = left; best1 = 2; }
      const diag = s > 0 ? S[i - 1][j - 1] + s : -1;
      if (diag > best0) { best0 = diag; best1 = 3; }
      S[i][j] = best0;
      P[i][j] = best1;
    }
  }
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (P[i][j] === 3) {
      A[i - 1].j = j - 1;
      i -= 1;
      j -= 1;
    } else if (P[i][j] === 1) i -= 1;
    else j -= 1;
  }
  return A.map((a) => ({ id: a.id, j: a.j }));
}

function merge(a: Range | null, b: Range | null): Range | null {
  if (!a) return b;
  if (!b) return a;
  return [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
}

function safePageIds(p: unknown, key: string): Json[] {
  try {
    return isObj(p) ? pageIds(p as Obj, key) : [];
  } catch {
    return [];
  }
}

export function fixAnchors<P extends Record<string, unknown>>(planIn: P, opts: { sceneId: string; startWord?: number | null }): { plan: P; changes: AnchorChange[] } {
  const plan = JSON.parse(JSON.stringify(planIn)) as P;
  const changes: AnchorChange[] = [];
  const words = Array.isArray(plan.words) ? (plan.words as Record<string, unknown>[]) : [];
  const spoken = spokenWords(words.map((w, i) => ({ ...w, _i: i })) as unknown as Json);
  const aligned = alignCopy(plan.copy, spoken);
  const itemRange = new Map<unknown, Range>();
  for (const a of aligned) if (a.j >= 0) itemRange.set(a.id, merge(itemRange.get(a.id) ?? null, [a.j, a.j])!);
  const pages = Array.isArray(plan.pages) ? (plan.pages as unknown[]) : [];
  const shown = (p: unknown) => ["items", "left", "right", "under"].flatMap((k) => safePageIds(p, k));
  const pageRange = (p: unknown): Range | null => shown(p).reduce<Range | null>((r, id) => merge(r, itemRange.get(id) ?? null), null);
  const pageOf = (id: unknown) => pages.find((p) => shown(p).includes(id as Json) || (isObj(p) && p.hero === id));

  const respec = (spec: unknown, range: Range | null): { spec: string; j: number } | null => {
    if (typeof spec !== "string" || spec.includes("#") || !range) return null;
    const n = norm(spec);
    const occ = spoken.map((w, j) => (w.n === n ? j : -1)).filter((j) => j >= 0);
    if (occ.length < 2 || (range[0] <= occ[0] && occ[0] <= range[1])) return null;
    const k = occ.findIndex((j) => range[0] <= j && j <= range[1]);
    return k < 0 ? null : { spec: spec + "#" + (k + 1), j: occ[k] };
  };
  const record = (path: string, item: string | null, old: string, r: { spec: string; j: number }) => {
    const sceneWord = Number((spoken[r.j] as unknown as { _i: number })._i);
    changes.push({ scene: opts.sceneId, path, item, old, new: r.spec, sceneWord, sourceWord: opts.startWord == null ? null : opts.startWord + sceneWord });
  };
  const fixWord = (obj: unknown, key: string, range: Range | null, path: string, item: string | null) => {
    if (!isObj(obj)) return;
    const r = respec(obj[key], range);
    if (!r) return;
    record(path, item, obj[key] as string, r);
    obj[key] = r.spec;
  };
  const fixAnchor = (obj: unknown, key: string, range: Range | null, path: string, item: string | null) => {
    if (isObj(obj) && isObj(obj[key])) fixWord(obj[key], "word", range, path + "." + key + ".word", item);
  };

  for (const c of Array.isArray(plan.copy) ? plan.copy : []) {
    if (!isObj(c)) continue;
    const id = String(c.id);
    const range = itemRange.get(c.id) ?? null;
    fixWord(c.timing, "onWord", range, "copy[" + id + "].timing.onWord", id);
    for (const end of ["start", "land"]) fixAnchor(c.count, end, range, "copy[" + id + "].count", id);
  }
  pages.forEach((p, n) => fixAnchor(p, "start", pageRange(p), "pages[" + n + "]", null));
  for (const a of Array.isArray(plan.assets) ? plan.assets : []) {
    if (!isObj(a)) continue;
    const id = String(a.id);
    const page = pageOf(a.id);
    const range = page ? pageRange(page) : null;
    const at = "assets[" + id + "]";
    fixWord(a, "anchorWord", range, at + ".anchorWord", id);
    const moves = (tracks: unknown, where: string) => {
      (Array.isArray(tracks) ? tracks : []).forEach((m, k) => {
        for (const end of ["from", "to"]) fixAnchor(m, end, range, where + ".motion[" + k + "]", id);
      });
    };
    moves(a.motion, at);
    (Array.isArray(a.pieces) ? a.pieces : []).forEach((piece, k) => {
      fixAnchor(piece, "onset", range, at + ".pieces[" + k + "]", id);
      if (isObj(piece)) moves(piece.motion, at + ".pieces[" + k + "]");
    });
  }
  return { plan, changes };
}
