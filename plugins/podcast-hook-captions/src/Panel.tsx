import {withPanelLocalClient} from "../../../shared/local-client";
import { hostUseSdk } from "./pipeline/host";
import React, { useEffect, useRef, useState } from "react";
import { makeReel, rebuildReel, loadJob, STEPS, type Step, type MakeResult } from "./pipeline/make";
import { app } from "./pipeline/host";

const readStore = (k: string) => {
  try {
    return localStorage.getItem(k) || "";
  } catch {
    return "";
  }
};
const writeStore = (k: string, v: string) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {}
};

const STORE = "podcast-hook-captions:v2:";

function PodcastHookReel({ sdk, context }: any) {
  hostUseSdk(sdk);
  const [seconds, setSeconds] = useState(25);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<Step[]>(STEPS.map(([id, label]) => ({ id, label, state: "wait" as const })));
  const [result, setResult] = useState<MakeResult | null>(null);
  const [clock, setClock] = useState(0);
  const [isReel, setIsReel] = useState(false);
  const [genBroll, setGenBroll] = useState(() => readStore(STORE + "genBroll") === "1");
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  useEffect(() => {
    try {
      setResult(JSON.parse(localStorage.getItem(STORE + context?.sequenceId) || "null"));
    } catch {
      setResult(null);
    }
    if (!busy) setSteps(STEPS.map(([id, label]) => ({ id, label, state: "wait" as const })));
    setIsReel(false);
    if (context?.sequenceId) loadJob(context.sequenceId).then((j) => alive.current && setIsReel(!!j)).catch(() => {});
  }, [context?.sequenceId]);
  useEffect(() => {
    if (!busy) return;
    const t0 = Date.now();
    const id = setInterval(() => alive.current && setClock(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [busy]);

  const onStep = (id: string, state: Step["state"], note?: string) => {
    if (!alive.current) return;
    setSteps((cur) => cur.map((s) => (s.id === id ? { ...s, state, note: note ?? s.note } : s)));
  };

  const make = async (rebuild = false) => {
    if (busy) return;
    if (!context?.sequenceId || !context?.projectId) {
      setError("Open the podcast Draft first.");
      return;
    }
    // One reel at a time per app window: the lock lives on the app window, so reopening a Draft (which
    // remounts the panel) cannot start a second build over a running one. A lock older than 40 minutes is
    // taken to be left over from a panel that was closed mid-run.
    const host: any = app();
    const held = host.__phcRunning;
    if (held && Date.now() - held < 40 * 60000) {
      setError("A reel is already being made in this window. Wait for it to finish.");
      return;
    }
    host.__phcRunning = Date.now();
    setBusy(true);
    setError("");
    setResult(null);
    setSteps(STEPS.map(([id, label]) => ({ id, label, state: "wait" as const })));
    try {
      const broll = { generate: genBroll };
      const r = rebuild
        ? await rebuildReel(sdk, context.sequenceId, onStep, broll)
        : await makeReel(sdk, { projectId: context.projectId, sequenceId: context.sequenceId }, { seconds, hint: hint.trim(), ...broll }, onStep);
      const keep = { ...r, plan: undefined as any };
      try {
        localStorage.setItem(STORE + context.sequenceId, JSON.stringify(keep));
      } catch {}
      if (alive.current) setResult(keep);
    } catch (e: any) {
      if (alive.current) {
        setError(String(e?.message || e));
        setSteps((cur) => cur.map((s) => (s.state === "run" ? { ...s, state: "fail" } : s)));
      }
    } finally {
      host.__phcRunning = 0;
      if (alive.current) setBusy(false);
    }
  };

  const open = async () => {
    if (!result) return;
    await sdk.runScript({ summary: "Open the reel", script: "return await selects.editor.openDraft(" + JSON.stringify(result.reelId) + ");" });
  };

  const icon = (s: Step["state"]) => (s === "done" ? "✓" : s === "run" ? "…" : s === "fail" ? "!" : s === "skip" ? "–" : "·");
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, fontSize: 13, lineHeight: 1.45 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Podcast reel, one click</div>
        <div style={{ color: "var(--panel-muted-fg)" }}>
          Turns this podcast Draft into a new 9:16 reel: the strongest moment, face-tracked reframe, camera moves, the speaker cut out onto a grid set, kinetic titles, word captions, B-roll cards, music and sound effects.
        </div>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span>Reel length: {seconds} s</span>
        <input type="range" min={18} max={40} step={1} value={seconds} disabled={busy} onChange={(e) => setSeconds(Number(e.target.value))} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span>Note for the editor (optional)</span>
        <input type="text" value={hint} disabled={busy} placeholder="e.g. use the part about dopamine" onChange={(e) => setHint(e.target.value)} />
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={genBroll}
          disabled={busy}
          onChange={(e) => {
            setGenBroll(e.target.checked);
            writeStore(STORE + "genBroll", e.target.checked ? "1" : "");
          }}
        />
        <span>B-roll comes from stock footage. If this Selects version has no stock search, generate it with AI instead (4-12 minutes and about $2 per reel).</span>
      </label>
      {isReel && (
        <button onClick={() => make(true)} disabled={busy} style={{ padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" }}>
          Rebuild this reel
        </button>
      )}
      <button onClick={() => make(false)} disabled={busy} style={{ padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" }}>
        {busy ? "Making the reel… " + clock + " s" : result ? "Make another reel" : "Make reel"}
      </button>
      {(busy || steps.some((s) => s.state !== "wait")) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map((s) => (
            <div key={s.id} style={{ display: "flex", gap: 8, opacity: s.state === "wait" ? 0.5 : 1 }}>
              <span style={{ width: 14, textAlign: "center" }}>{icon(s.state)}</span>
              <span style={{ flex: 1 }}>
                {s.label}
                {s.note ? <span style={{ color: "var(--panel-muted-fg)" }}> — {s.note}</span> : null}
              </span>
            </div>
          ))}
        </div>
      )}
      {error && <div style={{ color: "var(--panel-destructive-fg, #e5484d)", whiteSpace: "pre-wrap" }}>{error}</div>}
      {result && !busy && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div>
            Made “{result.name}” in {Math.round(result.seconds)} s.
          </div>
          {result.credits?.length ? (
            <div style={{ color: "var(--panel-muted-fg)" }}>
              B-roll:{" "}
              {result.credits.map((c, i) => (
                <React.Fragment key={i}>
                  {i ? ", " : ""}
                  <a href={c.url} target="_blank" rel="noreferrer">
                    {c.credit}
                  </a>
                  {c.service ? " (" + c.service + ")" : ""}
                </React.Fragment>
              ))}
            </div>
          ) : null}
          {result.notes?.length ? (
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--panel-muted-fg)" }}>
              {result.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
          <button onClick={open} style={{ padding: "8px 12px" }}>
            Open the reel
          </button>
        </div>
      )}
    </div>
  );
}

export default withPanelLocalClient(PodcastHookReel);
