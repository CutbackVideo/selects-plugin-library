type Layer = { id: string; z?: number; [k: string]: unknown };

export type LayerRun = { layerIds: string[] };

export function paintOrder<T extends Layer>(layers: T[]): T[] {
  return layers.map((l, i) => ({ l, i })).sort((a, b) => Number(a.l.z ?? 0) - Number(b.l.z ?? 0) || a.i - b.i).map((x) => x.l);
}

export async function splitRuns<T extends Layer>(layers: T[], fits: (run: T[], index: number) => Promise<boolean>): Promise<T[][]> {
  const ordered = paintOrder(layers);
  const runs: T[][] = [];
  let cur: T[] = [];
  for (const layer of ordered) {
    const trial = [...cur, layer];
    if (await fits(trial, runs.length)) {
      cur = trial;
      continue;
    }
    if (!cur.length) throw new Error("Layer " + layer.id + " alone does not fit in one Motion Graphic script.");
    runs.push(cur);
    cur = [layer];
    if (!(await fits(cur, runs.length))) throw new Error("Layer " + layer.id + " alone does not fit in one Motion Graphic script.");
  }
  if (cur.length || !runs.length) runs.push(cur);
  return runs;
}

export function partExecution<E extends { sceneId: string; layers: Layer[] }>(ex: E, run: Layer[], index: number, count: number, transparent: boolean): { execution: E; nativePartition?: { id: string; kind: "ground" | "foreground"; layerIds: string[] } } {
  if (count === 1) return { execution: ex };
  const ids = new Set(run.map((l) => l.id));
  const execution = { ...ex, layers: ex.layers.filter((l) => ids.has(l.id)) };
  if (transparent) return { execution };
  return { execution, nativePartition: { id: "p" + (index + 1), kind: index === 0 ? "ground" : "foreground", layerIds: [...ids] } };
}
