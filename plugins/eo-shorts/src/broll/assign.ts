import type { Orientation, Preference } from "./types.ts";

export interface ShotOption {
  sourceKey: string;
  family?: string;
  preference: Preference;
  orientation: Orientation;
  cropHeight: number;
  order: number;
}

const PREF: Record<Preference, number> = { excellent: 0, usable: 1, weak: 2 };

export function rankOptions(options: ShotOption[], prefer: Orientation): ShotOption[] {
  return options
    .slice()
    .sort(
      (a, b) =>
        PREF[a.preference] - PREF[b.preference] ||
        Number(a.orientation !== prefer) - Number(b.orientation !== prefer) ||
        b.cropHeight - a.cropHeight ||
        a.order - b.order,
    );
}

export interface AssignInput {
  shotId: string;
  prefer: Orientation;
  options: ShotOption[];
}

export interface Assignment {
  shotId: string;
  option: ShotOption | null;
  lostTo: { sourceKey: string; shotId: string }[];
}

export function assignSources(shots: AssignInput[], taken: Iterable<string> = [], owners: Map<string, string> = new Map()): Assignment[] {
  const used = new Set(taken);
  const owner = new Map(owners);
  const ranked = new Map(shots.map((s) => [s.shotId, rankOptions(s.options, s.prefer)]));
  const order = new Map(shots.map((s, i) => [s.shotId, i]));
  const result = new Map<string, Assignment>();
  const free = (o: ShotOption) => !used.has(o.sourceKey) && !used.has(o.family ?? o.sourceKey);
  const remaining = new Set(shots.map((s) => s.shotId));
  while (remaining.size) {
    let best: string | null = null;
    let bestScore: [number, number, number] | null = null;
    for (const id of remaining) {
      const opts = ranked.get(id)!.filter(free);
      const score: [number, number, number] = [opts.filter((o) => o.preference !== "weak").length || Infinity, opts.length || Infinity, order.get(id)!];
      if (!bestScore || score[0] < bestScore[0] || (score[0] === bestScore[0] && (score[1] < bestScore[1] || (score[1] === bestScore[1] && score[2] < bestScore[2])))) {
        best = id;
        bestScore = score;
      }
    }
    const id = best!;
    remaining.delete(id);
    const all = ranked.get(id)!;
    const pick = all.find(free) ?? null;
    const lostTo = all
      .slice(0, pick ? all.indexOf(pick) : all.length)
      .filter((o) => !free(o))
      .map((o) => ({ sourceKey: o.sourceKey, shotId: owner.get(o.sourceKey) ?? owner.get(o.family ?? o.sourceKey) ?? "film" }));
    if (pick) {
      used.add(pick.sourceKey);
      used.add(pick.family ?? pick.sourceKey);
      owner.set(pick.sourceKey, id);
      owner.set(pick.family ?? pick.sourceKey, id);
    }
    result.set(id, { shotId: id, option: pick, lostTo });
  }
  return shots.map((s) => result.get(s.shotId)!);
}

function flat(hex: string): boolean {
  let bits = 0;
  for (const ch of hex) for (let x = parseInt(ch, 16); x; x >>= 1) bits += x & 1;
  return bits < 8 || bits > hex.length * 4 - 8;
}

export class FamilyIndex {
  private items: { key: string; family: string; fp: string; duration: number }[] = [];
  private distance: (a: string, b: string) => number;
  private maxBits: number;
  private maxDurationDiff: number;
  constructor(distance: (a: string, b: string) => number, maxBits = 5, maxDurationDiff = 0.15) {
    this.distance = distance;
    this.maxBits = maxBits;
    this.maxDurationDiff = maxDurationDiff;
  }

  family(key: string, fingerprint: string | null | undefined, duration: number | null | undefined): string {
    const known = this.items.find((x) => x.key === key);
    if (known) return known.family;
    if (!fingerprint || !(duration && duration > 0) || flat(fingerprint)) return key;
    const near = this.items.find((x) => Math.abs(x.duration - duration) <= this.maxDurationDiff && this.distance(x.fp, fingerprint) <= this.maxBits);
    const family = near ? near.family : key;
    this.items.push({ key, family, fp: fingerprint, duration });
    return family;
  }
}
