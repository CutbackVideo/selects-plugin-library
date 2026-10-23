// Injected by the portable-panel build footer from shared/app-update-guard.ts.
declare function useAppUpdateGuard(sdk: any, language: string | undefined, readBlocked: (context: any) => boolean): void;
import React, { useEffect, useRef, useState } from "react";
import { t } from "./messages.ts";
import { PRESETS } from "./preset.ts";
import { articleFromText } from "./pipeline/article.ts";
import type { PanelSdk } from "./pipeline/host.ts";
import { load, save, sleep, run } from "./pipeline/host.ts";
import { voicesScript, openDraftScript } from "./pipeline/scripts.ts";
import { creditQuote, type TtsRecord } from "./pipeline/tts.ts";
import * as F from "./pipeline/flow.ts";

type Props = { sdk: PanelSdk; context?: { projectId?: string | null; language?: string } };

const box = { border: "1px solid var(--panel-border, #3334)", borderRadius: 8, padding: 10 } as const;
const muted = { color: "var(--panel-muted-fg, #888)", fontSize: 12 } as const;
const input = { width: "100%", boxSizing: "border-box", padding: 6, font: "inherit" } as const;
const MAX_CHARS = 390;

function NewsMinutePanel({ sdk, context }: Props) {
  const lang = context?.language;
  const T = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const [s, setS] = useState<F.Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [tts, setTts] = useState<TtsRecord | null>(null);
  const [voices, setVoices] = useState<Array<{ voiceId: string; name: string }>>([]);
  const env = useRef<F.Env | null>(null);
  useAppUpdateGuard(sdk, context?.language, () => busy);

  const log: F.Log = (k, v) => { const m = T(k, v); setStatus(m); setLines((l) => [...l.slice(-40), new Date().toLocaleTimeString() + "  " + m]); };
  const finish = async (rec: F.RunRecord) => { const path = await F.saveRunRecord(sdk, env.current!, rec); if (path) log("record", { path }); };
  const update = async (next: F.Session) => { setS(next); await save(sdk, F.SESSION_KEY, next); };

  useEffect(() => {
    (async () => {
      try {
        if (!sdk.storage) throw new Error(T("noStorage"));
        env.current = await F.getEnv(sdk);
        const saved = await load<F.Session>(sdk, F.SESSION_KEY);
        const sess = saved ?? F.emptySession();
        setS(sess);
        if (sess.projectId) setTts(await F.readTts(sdk, sess.projectId));
        run<Array<{ voiceId: string; name: string }>>(sdk, voicesScript()).then(setVoices).catch(() => {});
      } catch (e: any) { setError(String(e?.message || e)); }
    })();
  }, []);

  const guard = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await fn(); } catch (e: any) { setError(T("error", { error: String(e?.message || e) })); }
    finally { setBusy(false); setStatus(""); }
  };

  // Poll a submitted narration until it is imported or fails.
  useEffect(() => {
    if (!tts || tts.state !== "submitted") return;
    let stop = false;
    (async () => {
      let rec = tts;
      while (!stop && rec.state === "submitted") {
        await sleep(3000);
        if (stop) return;
        try { rec = await F.pollNarration(sdk, rec); } catch { continue; }
        if (!stop) setTts(rec);
      }
    })();
    return () => { stop = true; };
  }, [tts?.workflowId, tts?.state]);

  if (!s) return <div style={{ padding: 12 }}>{error || "\u2026"}</div>;
  const preset = PRESETS[s.presetId] ?? PRESETS.chosun;

  const writeScript = () => guard(async () => {
    const e = env.current!;
    let article;
    if (url.trim()) { log("fetching"); article = await F.fetchArticle(sdk, e, url.trim()); }
    else article = articleFromText(text);
    if ([...article.body].length < 200) throw new Error(T("tooShort"));
    const rec = F.newRunRecord(preset.id, url.trim());
    rec.notes.push("article: " + article.method + ", " + [...article.body].length + " chars, " + article.photos.length + " photos");
    let r;
    try { r = await F.writeScript(sdk, article, preset, log, rec); } finally { await finish(rec); }
    await update({ ...s, article, script: r.script, scriptErrors: r.errors, approved: null, draftId: null });
  });

  const setLine = (i: number, v: string) => {
    if (!s.script) return;
    const sentences = s.script.sentences.map((x, k) => (k === i ? { ...x, text: v } : x));
    update({ ...s, script: { ...s.script, sentences }, approved: null });
  };
  const setHead = (k: "line1" | "line2" | "accent", v: string) => s.script && update({ ...s, script: { ...s.script, headline: { ...s.script.headline, [k]: v } }, approved: null });

  const approve = () => guard(async () => {
    const projectId = await F.ensureProject(sdk, env.current!, s);
    await update({ ...s, projectId, approved: F.revisionOf(s.script!, s.voiceId) });
    setTts(await F.readTts(sdk, projectId));
  });

  const narrate = () => guard(async () => {
    log("narrating");
    const rec = await F.startNarration(sdk, s.projectId!, s.script!, s.voiceId, preset.ttsLanguage);
    setTts(rec);
  });

  const build = () => guard(async () => {
    const next = F.ttsNext(tts, s.approved!);
    if (next.kind !== "ready") return;
    const rec = F.newRunRecord(preset.id, s.article?.url ?? "");
    let r;
    try { r = await F.buildDraft(sdk, env.current!, s, preset, next, log, rec); }
    catch (e: any) { rec.notes.push("error: " + String(e?.message || e)); throw e; }
    finally { await finish(rec); }
    await update({ ...s, draftId: r.draftId });
    await run(sdk, openDraftScript(r.draftId)).catch(() => {});
    if (r.timing === "ratio") setError(T("timingRatio"));
    else if (r.fallbackPlan) setError(T("planFallback"));
  });

  const reset = () => guard(async () => { await update({ ...F.emptySession(s.presetId), voiceId: s.voiceId, projectId: s.projectId }); setUrl(""); setText(""); });

  const sc = s.script;
  const chars = sc ? F.scriptText(sc).length : 0;
  const approved = !!(sc && s.approved && s.approved === F.revisionOf(sc, s.voiceId));
  const next = approved ? F.ttsNext(tts, s.approved!) : null;
  const quote = creditQuote(chars);

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
      <strong>{T("title")}</strong>
      <label>{T("preset")}{" "}
        <select value={s.presetId} disabled={busy} onChange={(e) => update({ ...s, presetId: e.target.value })}>
          {Object.values(PRESETS).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>

      {!sc ? (
        <div style={{ ...box, display: "flex", flexDirection: "column", gap: 8 }}>
          <input style={input} placeholder={T("url")} value={url} disabled={busy} onChange={(e) => setUrl(e.target.value)} />
          <textarea style={{ ...input, minHeight: 90 }} placeholder={T("orText")} value={text} disabled={busy} onChange={(e) => setText(e.target.value)} />
          <span style={muted}>{T("aiCredits")}</span>
          <button disabled={busy || (!url.trim() && text.trim().length < 80)} onClick={writeScript}>{T("write")}</button>
        </div>
      ) : (
        <div style={{ ...box, display: "flex", flexDirection: "column", gap: 8 }}>
          <strong>{T("review")}</strong>
          <span style={muted}>{T("reviewHint")}</span>
          {s.scriptErrors.length ? <div style={{ color: "#d9822b", fontSize: 12 }}>{s.scriptErrors.map((x, i) => <div key={i}>{"\u2022 " + x}</div>)}</div> : null}
          <label>{T("headline1")}<input style={input} value={sc.headline.line1} disabled={busy || approved} onChange={(e) => setHead("line1", e.target.value)} /></label>
          <label>{T("headline2")}<input style={input} value={sc.headline.line2} disabled={busy || approved} onChange={(e) => setHead("line2", e.target.value)} /></label>
          <label>{T("accent")}<input style={input} value={sc.headline.accent ?? ""} disabled={busy || approved} onChange={(e) => setHead("accent", e.target.value)} /></label>
          {sc.sentences.map((x, i) => (
            <div key={x.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <textarea style={{ ...input, minHeight: 44 }} value={x.text} disabled={busy || approved} onChange={(e) => setLine(i, e.target.value)} />
              <span style={muted}>{T("source")}: {x.sourceQuote ? "\u201C" + x.sourceQuote + "\u201D" : T("noSource")}</span>
              {x.rewritten ? <span style={{ ...muted, color: "#4a90d9" }}>{T("rewritten")}</span> : null}
              {x.issues.length ? <span style={{ ...muted, color: "#d9822b" }}>{T("issues")}: {x.issues.map((v) => v.kind + (v.note ? " \u2013 " + v.note : "")).join("; ")}</span> : null}
            </div>
          ))}
          <span style={muted}>{T("length", { chars, sec: Math.round(chars / 6.5) })}</span>
          {chars > MAX_CHARS ? <span style={{ color: "#d9822b", fontSize: 12 }}>{T("tooLong", { max: MAX_CHARS })}</span> : null}
          {approved ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>{"\u2713 " + T("approved")}</span>
              <button disabled={busy || tts?.state === "submitted" || tts?.state === "submitting"} onClick={() => update({ ...s, approved: null })}>{T("edit")}</button>
            </div>
          ) : (
            <button disabled={busy} onClick={approve}>{T("approve")}</button>
          )}
        </div>
      )}

      {approved && next ? (
        <div style={{ ...box, display: "flex", flexDirection: "column", gap: 8 }}>
          <label>{T("voice")}{" "}
            <select value={s.voiceId} disabled={busy || next.kind === "poll" || next.kind === "ready"} onChange={(e) => update({ ...s, voiceId: e.target.value, approved: F.revisionOf(sc!, e.target.value) })}>
              {(voices.length ? voices : [{ voiceId: s.voiceId, name: s.voiceId }]).map((v) => <option key={v.voiceId} value={v.voiceId}>{v.name}</option>)}
            </select>
          </label>
          {next.kind === "none" || next.kind === "stale" ? (
            <>
              <span style={muted}>{T("credits", { chars, est: quote.estimated, held: quote.held })}</span>
              <button disabled={busy} onClick={narrate}>{T("narrate")}</button>
            </>
          ) : next.kind === "poll" ? (
            <span>{T("narrating")}</span>
          ) : next.kind === "lost" ? (
            <>
              <span style={{ color: "#d9822b" }}>{T("lost")}</span>
              <span style={muted}>{T("credits", { chars, est: quote.estimated, held: quote.held })}</span>
              <button disabled={busy} onClick={narrate}>{T("newNarration")}</button>
            </>
          ) : next.kind === "failed" ? (
            <>
              <span style={{ color: "#d9822b" }}>{next.error === "insufficient_credits" ? T("noCredits") : T("narrationFailed", { error: next.error })}</span>
              <button disabled={busy} onClick={narrate}>{T("retry")}</button>
            </>
          ) : (
            <>
              <span>{"\u2713 " + T("narrated", { sec: next.durationSeconds.toFixed(1) })}</span>
              <span style={muted}>{T("buildCredits")}</span>
              <button disabled={busy} onClick={build}>{T("build")}</button>
            </>
          )}
        </div>
      ) : null}

      {s.draftId ? (
        <div style={{ ...box, display: "flex", gap: 8, alignItems: "center" }}>
          <span>{T("done")}</span>
          <button disabled={busy} onClick={() => run(sdk, openDraftScript(s.draftId!)).catch(() => {})}>{T("openDraft")}</button>
        </div>
      ) : null}

      {status ? <span style={muted}>{status}</span> : null}
      {lines.length ? <details><summary style={muted}>Log</summary><pre style={{ ...muted, whiteSpace: "pre-wrap", margin: 0 }}>{lines.join("\n")}</pre></details> : null}
      {error ? <span style={{ color: "#d9822b", fontSize: 12, whiteSpace: "pre-wrap" }}>{error}</span> : null}
      {sc ? <button disabled={busy} onClick={reset}>{T("startOver")}</button> : null}
    </div>
  );
}

export default NewsMinutePanel;
