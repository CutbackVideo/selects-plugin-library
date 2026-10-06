export async function runJointly<T extends readonly unknown[]>(signal: AbortSignal | null | undefined, branches: { [K in keyof T]: (signal: AbortSignal) => Promise<T[K]> }): Promise<T> {
  const stop = new AbortController();
  const onAbort = () => stop.abort(signal?.reason);
  if (signal?.aborted) onAbort();
  else signal?.addEventListener("abort", onAbort, { once: true });
  let first: { error: unknown } | null = null;
  try {
    const settled = await Promise.allSettled(
      (branches as readonly ((s: AbortSignal) => Promise<unknown>)[]).map(async (run) => {
        try {
          return await run(stop.signal);
        } catch (e) {
          if (!first) first = { error: e };
          if (!stop.signal.aborted) stop.abort(e);
          throw e;
        }
      }),
    );
    if (first) throw (first as { error: unknown }).error;
    return settled.map((s) => (s as PromiseFulfilledResult<unknown>).value) as unknown as T;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}
