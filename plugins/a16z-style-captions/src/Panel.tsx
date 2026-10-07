import {withPanelLocalClient} from "../../../shared/local-client";
import { hostUseSdk } from "./pipeline/host";
import React, { useEffect, useRef, useState } from "react";

// panel-storage:start
// Keep writes ordered even across a panel remount; failed writes remain visible to callers.
const panelStorageClients = new WeakMap();
function panelStorage(sdk) {
  const storage = sdk?.storage;
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
    throw new Error("Update Selects to use this plugin: sdk.storage is required.");
  }
  if (!panelStorageClients.has(storage)) {
    let tail = Promise.resolve();
    const enqueue = (operation) => {
      const pending = tail.then(operation);
      tail = pending.catch(() => {});
      return pending;
    };
    panelStorageClients.set(storage, {
      getItem: (key) => enqueue(() => storage.getItem(key)),
      setItem: (key, value) => enqueue(() => storage.setItem(key, value)),
      removeItem: (key) => enqueue(() => storage.removeItem(key)),
    });
  }
  return panelStorageClients.get(storage);
}
function withStoredPanel(Component, load) {
  return function StoredPanel(props) {
    const [state, setState] = React.useState(null);
    const [attempt, retry] = React.useState(0);
    React.useEffect(() => {
      let current = true;
      setState(null);
      Promise.resolve().then(() => load(panelStorage(props.sdk))).then(
        (saved) => { if (current) setState({sdk: props.sdk, saved}); },
        (error) => { if (current) setState({sdk: props.sdk, error: String(error?.message || error)}); },
      );
      return () => { current = false; };
    }, [props.sdk, attempt]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error, React.createElement("button", {onClick: () => retry(n => n + 1)}, "Retry loading saved settings"));
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Loading saved settings…");
    return React.createElement(Component, {...props, saved: state.saved});
  };
}
// panel-storage:end

import { makeShort, rebuildShort, loadJob, STEPS, type Step, type MakeResult, type Options } from "./pipeline/make";

const STORE = "a16z-style-captions:v2:";
// A run outlives a change of the open Draft (the app opens the new Short while the run goes on), so its
// progress lives here rather than in component state.
type RunState = { busy: boolean; steps: Step[]; error: string; result: MakeResult | null; startedAt: number };
const fresh = (): Step[] => STEPS.map(([id, label]) => ({ id, label, state: "wait" as const }));
let run: RunState = { busy: false, steps: fresh(), error: "", result: null, startedAt: 0 };
const listeners = new Set<() => void>();
const setRun = (patch: Partial<RunState>) => {
  run = { ...run, ...patch };
  listeners.forEach((l) => l());
};

function A16zShort({ sdk, context, saved }: any) {
  hostUseSdk(sdk);
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  const [name, setName] = useState(saved.name || "");
  const [role, setRole] = useState(saved.role || "");
  const [logo, setLogo] = useState(saved.logo || "");
  const [hint, setHint] = useState("");
  const [music, setMusic] = useState(saved.music !== "0");
  const [cards, setCards] = useState(saved.cards !== "0");
  const [broll, setBroll] = useState(saved.broll !== "0");
  const [isShort, setIsShort] = useState(false);
  const [clock, setClock] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  useEffect(() => {
    let current = true;
    setIsShort(false);
    if (context?.sequenceId) loadJob(context.sequenceId).then((j) => current && setIsShort(!!j)).catch(() => {});
    return () => { current = false; };
  }, [context?.sequenceId, run.result?.shortId]);
  useEffect(() => {
    if (!run.busy) return;
    const id = setInterval(() => alive.current && setClock(Math.round((Date.now() - run.startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [run.busy]);

  const onStep = (id: string, state: Step["state"], note?: string) => setRun({ steps: run.steps.map((s) => (s.id === id ? { ...s, state, note: note ?? s.note } : s)) });

  const go = async (rebuild: boolean) => {
    if (run.busy) return;
    if (!context?.sequenceId || !context?.projectId) {
      setRun({ error: "Open a talking-head Draft first." });
      return;
    }
    const opts: Options = { name: name.trim(), role: role.trim(), logo: logo.trim(), music, cards, broll, hint: hint.trim() };
    setRun({ busy: true, error: "", result: null, steps: fresh(), startedAt: Date.now() });
    try {
      const storage = panelStorage(sdk);
      for (const [key, value] of Object.entries({name: opts.name, role: opts.role, logo: opts.logo, music: music ? "" : "0", cards: cards ? "" : "0", broll: broll ? "" : "0"})) {
        await storage.setItem(STORE + key, value);
      }
      const r = rebuild ? await rebuildShort(sdk, context.sequenceId, opts, onStep) : await makeShort(sdk, { projectId: context.projectId, sequenceId: context.sequenceId }, opts, onStep);
      setRun({ result: r });
    } catch (e: any) {
      setRun({ error: String(e?.message || e), steps: run.steps.map((s) => (s.state === "run" ? { ...s, state: "fail" } : s)) });
    } finally {
      setRun({ busy: false });
    }
  };

  const open = async () => {
    if (!run.result) return;
    await sdk.runScript({ summary: "Open the Short", script: "return await selects.editor.openDraft(" + JSON.stringify(run.result.shortId) + ");" });
  };

  const busy = run.busy;
  const icon = (s: Step["state"]) => (s === "done" ? "✓" : s === "run" ? "…" : s === "fail" ? "!" : s === "skip" ? "–" : "·");
  const field = { display: "flex", flexDirection: "column" as const, gap: 4 };
  const muted = { color: "var(--panel-muted-fg)" };
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, fontSize: 13, lineHeight: 1.45 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>a16z-style Short, one click</div>
        <div style={muted}>
          Turns this talking-head Draft into a new 9:16 Short in the a16z house style: tightened pauses, speaker framing, editorial captions with lockups and
          emphasis, keyword cards, B-roll, a name tag and a music bed.
        </div>
      </div>
      <label style={field}>
        <span>Speaker name (optional, for the name tag)</span>
        <input type="text" value={name} disabled={busy} placeholder="e.g. Jane Doe" onChange={(e) => setName(e.target.value)} />
      </label>
      <label style={field}>
        <span>Role line</span>
        <input type="text" value={role} disabled={busy} placeholder="e.g. Founder, Example Labs" onChange={(e) => setRole(e.target.value)} />
      </label>
      <label style={field}>
        <span>Your logo (optional): path to a small PNG or SVG, shown top right</span>
        <input type="text" value={logo} disabled={busy} placeholder="~/Pictures/logo.png" onChange={(e) => setLogo(e.target.value)} />
      </label>
      <label style={field}>
        <span>Note for the editor (optional)</span>
        <input type="text" value={hint} disabled={busy} placeholder="e.g. the key idea is 'taste'" onChange={(e) => setHint(e.target.value)} />
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={music} disabled={busy} onChange={(e) => setMusic(e.target.checked)} />
        <span>Music bed (AI-generated, uses generation credits)</span>
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={cards} disabled={busy} onChange={(e) => setCards(e.target.checked)} />
        <span>Keyword cards</span>
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={broll} disabled={busy} onChange={(e) => setBroll(e.target.checked)} />
        <span>B-roll from stock footage (Pexels and Pixabay)</span>
      </label>
      {isShort && (
        <button onClick={() => go(true)} disabled={busy} style={{ padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" }}>
          Rebuild captions and graphics
        </button>
      )}
      <button onClick={() => go(false)} disabled={busy} style={{ padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" }}>
        {busy ? "Making the Short… " + clock + " s" : isShort ? "Make a new Short from this Draft" : "Make the Short"}
      </button>
      {(busy || run.steps.some((s) => s.state !== "wait")) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {run.steps.map((s) => (
            <div key={s.id} style={{ display: "flex", gap: 8, opacity: s.state === "wait" ? 0.5 : 1 }}>
              <span style={{ width: 14, textAlign: "center" }}>{icon(s.state)}</span>
              <span style={{ flex: 1 }}>
                {s.label}
                {s.note ? <span style={muted}> — {s.note}</span> : null}
              </span>
            </div>
          ))}
        </div>
      )}
      {run.error && <div style={{ color: "var(--panel-destructive-fg, #e5484d)", whiteSpace: "pre-wrap" }}>{run.error}</div>}
      {run.result && !busy && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div>
            Made “{run.result.name}” in {Math.round(run.result.seconds)} s.
          </div>
          {run.result.notes.length ? (
            <ul style={{ margin: 0, paddingLeft: 18, ...muted }}>
              {run.result.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
          <button onClick={open} style={{ padding: "8px 12px" }}>
            Open the Short
          </button>
        </div>
      )}
      <div style={{ ...muted, fontSize: 11 }}>
        A style study, not affiliated with a16z. Use your own name, role and logo.
      </div>
    </div>
  );
}

export default withPanelLocalClient(withStoredPanel(A16zShort, async (storage) => {
  const entries = await Promise.all(["name", "role", "logo", "music", "cards", "broll"].map(async key => [key, await storage.getItem(STORE + key)]));
  return Object.fromEntries(entries);
}));
