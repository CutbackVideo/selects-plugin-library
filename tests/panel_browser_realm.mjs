// Timer ownership for complete browser-panel VM fixtures. No host-global patches.
export function createPanelBrowserTimers(backends = {}) {
  const native = {setTimeout, clearTimeout, setInterval, clearInterval, ...backends};
  let nextId = 0, disposed = false, receiver;
  const active = new Map();
  function clear(id) {
    const entry = active.get(id);
    if (!entry) return;
    active.delete(id);
    native[entry.repeat ? 'clearInterval' : 'clearTimeout'](entry.handle);
  }
  function schedule(repeat, callback, delay, args) {
    if (disposed) throw Error('Panel browser realm is disposed');
    if (typeof callback !== 'function') throw TypeError('Panel fixture timers require a function callback');
    const id = ++nextId, entry = {repeat, handle: undefined};
    active.set(id, entry);
    try {
      entry.handle = native[repeat ? 'setInterval' : 'setTimeout'](() => {
        if (disposed || !active.has(id)) return;
        if (!repeat) active.delete(id);
        callback.apply(receiver, args);
      }, delay);
    } catch (error) { active.delete(id); throw error; }
    return id;
  }
  return {
    globals: {
      setTimeout: (callback, delay, ...args) => schedule(false, callback, delay, args),
      setInterval: (callback, delay, ...args) => schedule(true, callback, delay, args),
      clearTimeout: clear,
      clearInterval: clear,
    },
    bindGlobal(value) { receiver = value; },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const id of active.keys()) clear(id);
    },
    state() {
      return {disposed, timeouts: [...active.values()].filter(entry => !entry.repeat).length,
        intervals: [...active.values()].filter(entry => entry.repeat).length};
    },
  };
}
