// Injected by the portable-panel build footer from shared/app-update-guard.ts.
declare function useAppUpdateGuard(sdk: any, language: string | undefined, readBlocked: (context: any) => boolean): void;
import React, { useEffect, useRef, useState } from "react";
import { MESSAGES, t } from "./messages.ts";
import { PRESETS } from "./preset.ts";
import { articleFromText } from "./pipeline/article.ts";
import type { PanelSdk } from "./pipeline/host.ts";
import { load, save, sleep, run } from "./pipeline/host.ts";
import { voicesScript, openDraftScript } from "./pipeline/scripts.ts";
import { creditQuote, type TtsRecord } from "./pipeline/tts.ts";
import * as F from "./pipeline/flow.ts";
import { SCENE_TYPES, TARGET_CHARS, TTS_CHARS_PER_SEC } from "./prompts/index.ts";
import type { PlanScene } from "./prompts/types.ts";
import { retypeScene } from "./pipeline/plan.ts";

type Props = { sdk: PanelSdk; context?: { projectId?: string | null; language?: string } };

const box = { border: "1px solid var(--panel-border, #3334)", borderRadius: 8, padding: 10 } as const;
const muted = { color: "var(--panel-muted-fg, #888)", fontSize: 12 } as const;
const input = { width: "100%", boxSizing: "border-box", padding: 6, font: "inherit" } as const;
const MAX_CHARS = TARGET_CHARS.max;
const warn = { color: "#d9822b", fontSize: 12 } as const;

// A small JPEG of an article photo for the plan review rows (kept in the session, so it stays small).
function thumbOf(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => {
      const w = 160, h = Math.max(1, Math.round((im.height * w) / Math.max(1, im.width)));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      if (!g) return reject(new Error("no canvas"));
      g.drawImage(im, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    im.onerror = () => reject(new Error("thumbnail"));
    im.src = dataUrl;
  });
}

// Fields a reviewer edits directly for each scene type; everything else stays in the JSON editor.
const SCENE_FIELDS: Record<string, string[]> = {
  text_card: ["text", "sub"],
  number_callout: ["label", "from", "to", "unit"],
  quote_card: ["name", "lines"],
  bar_compare_h: ["title"],
  line_trend_callout: ["title"],
  stat_cards: ["title"],
  news_photo: [],
};

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
  const [feedback, setFeedback] = useState("");
  const [jsonErr, setJsonErr] = useState<Record<number, string>>({});
  const env = useRef<F.Env | null>(null);
  useAppUpdateGuard(sdk, context?.language, () => busy);

  const log: F.Log = (k, v) => { const m = T(k, v); setStatus(m); setLines((l) => [...l.slice(-40), new Date().toLocaleTimeString() + "  " + m]); };
  const finish = async (rec: F.RunRecord) => { const path = await F.saveRunRecord(sdk, env.current!, rec); if (path) log("record", { path }); };
  const update = async (next: F.Session) => { setS(next); await save(sdk, F.sessionKey(env.current?.projectId ?? next.projectId), next); };

  useEffect(() => {
    (async () => {
      try {
        if (!sdk.storage) throw new Error(T("noStorage"));
        env.current = await F.getEnv(sdk);
        const saved = await load<F.Session>(sdk, F.sessionKey(env.current.projectId));
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
      let rec = tts, fails = 0;
      while (!stop && rec.state === "submitted") {
        await sleep(3000);
        if (stop) return;
        try { rec = await F.pollNarration(sdk, rec); fails = 0; }
        catch (e: any) { if (++fails >= 3) setError(T("error", { error: String(e?.message || e) })); continue; }
        if (!stop) { setError(""); setTts(rec); }
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
    const sentences = s.script.sentences.map((x, k) => (k === i ? { ...x, text: v, edited: true } : x));
    update({ ...s, script: { ...s.script, sentences }, approved: null });
  };
  const setHead = (k: "line1" | "line2" | "accent", v: string) => s.script && update({ ...s, script: { ...s.script, headline: { ...s.script.headline, [k]: v } }, approved: null });

  const approve = () => guard(async () => {
    if (chars > MAX_CHARS) throw new Error(T("tooLong", { max: MAX_CHARS }));
    if (liveErrors.length && !window.confirm(T("approveAnyway") + "\n\n" + liveErrors.slice(0, 8).join("\n"))) return;
    const projectId = await F.ensureProject(sdk, env.current!, s);
    await update({ ...s, projectId, approved: F.revisionOf(s.script!, s.voiceId) });
    setTts(await F.readTts(sdk, projectId));
  });

  const narrate = () => guard(async () => {
    log("narrating");
    const rec = await F.startNarration(sdk, s.projectId!, s.script!, s.voiceId, preset.ttsLanguage);
    setTts(rec);
  });

  const makePlan = () => guard(async () => {
    const next = F.ttsNext(tts, s.approved!);
    if (next.kind !== "ready") return;
    const rec = F.newRunRecord(preset.id, s.article?.url ?? "");
    let plan;
    try { plan = await F.planScenes(sdk, env.current!, s, preset, next, log, rec, thumbOf); }
    catch (e: any) { rec.notes.push("error: " + String(e?.message || e)); throw e; }
    finally { await finish(rec); }
    await update({ ...s, plan, draftId: null });
    setFeedback(""); setJsonErr({});
    if (plan.timing === "ratio") setError(T("timingRatio"));
  });

  const revise = () => guard(async () => {
    const note = feedback.trim();
    if (!note || !s.plan) return;
    log("revising");
    const rec = F.newRunRecord(preset.id, s.article?.url ?? "");
    let r;
    try { r = await F.revisePlan(sdk, env.current!, s, preset, note, log, rec); }
    catch (e: any) { rec.notes.push("error: " + String(e?.message || e)); throw e; }
    finally { await finish(rec); }
    await update({ ...s, plan: r.plan });
    setJsonErr({});
    if (r.kept) setError(T("reviseKept"));
    else { setFeedback(""); log("revised", { n: r.plan.changed.length, of: r.plan.scenes.length }); }
  });

  const build = () => guard(async () => {
    const plan = s.plan;
    if (!plan) return;
    const v = F.checkPlan(plan);
    const blocking = v.errors.filter((e) => F.BLOCKING_PLAN_ERROR.test(e));
    if (blocking.length) throw new Error(T("planBlocked", { errors: blocking.slice(0, 3).join("; ") }));
    if (v.errors.length && !window.confirm(T("planAnyway") + "\n\n" + v.errors.slice(0, 8).join("\n"))) return;
    const rec = F.newRunRecord(preset.id, s.article?.url ?? "");
    let r;
    try { r = await F.assemble(sdk, env.current!, s, preset, log, rec); }
    catch (e: any) { rec.notes.push("error: " + String(e?.message || e)); throw e; }
    finally { await finish(rec); }
    await update({ ...s, draftId: r.draftId });
    await run(sdk, openDraftScript(r.draftId)).catch(() => {});
  });

  // A scene the reviewer changed by hand; it is marked and goes to the planner as part of the previous plan.
  const setScene = (i: number, sc: PlanScene) => {
    const plan = s.plan;
    if (!plan) return;
    const scenes = plan.scenes.map((x, k) => (k === i ? sc : x));
    const edited = plan.edited.includes(i) ? plan.edited : [...plan.edited, i];
    update({ ...s, plan: { ...plan, scenes, edited }, draftId: null });
  };

  const reset = () => guard(async () => { await update({ ...F.emptySession(s.presetId), voiceId: s.voiceId, projectId: s.projectId }); setUrl(""); setText(""); });

  const sc = s.script;
  const touched = !!sc?.sentences.some((x) => x.edited);
  const chars = sc ? F.scriptText(sc).length : 0;
  const approved = !!(sc && s.approved && s.approved === F.revisionOf(sc, s.voiceId));
  const next = approved ? F.ttsNext(tts, s.approved!) : null;
  const quote = creditQuote(chars);
  const liveErrors = sc && s.article && touched ? F.checkEdited(sc, s.article).errors : s.scriptErrors;
  const plan = approved && next?.kind === "ready" && s.plan && s.plan.narrationId === next.resourceId ? s.plan : null;

  const renderPlan = (plan: F.ScenePlan) => {
    const v = F.checkPlan(plan);
    const rowErrors = new Map<number, string[]>(), rowWarnings = new Map<number, string[]>();
    const general: string[] = [];
    const sort = (list: string[], into: Map<number, string[]>, rest: string[] | null) => {
      for (const e of list) {
        const m = /^scene (\d+): (.*)$/.exec(e);
        if (m) into.set(Number(m[1]) - 1, [...(into.get(Number(m[1]) - 1) ?? []), m[2]]);
        else if (rest) rest.push(e);
      }
    };
    sort(v.errors, rowErrors, general);
    sort(v.warnings, rowWarnings, null);
    const byId = new Map(plan.sentences.map((x) => [x.id, x]));
    const summary = new Map(plan.assetSummaries.map((a) => [a.ref, a.summary]));
    const photoRefs = plan.assets.map((a) => a.ref);
    const lastRound = plan.rounds[plan.rounds.length - 1];
    return (
      <div style={{ ...box, display: "flex", flexDirection: "column", gap: 10 }}>
        <strong>{T("planReview")}</strong>
        <span style={muted}>{T("planReviewHint")}</span>
        {plan.fallback ? <span style={warn}>{T("planFallbackNote")}</span> : null}
        {lastRound ? <span style={muted}>{T("rounds", { n: plan.rounds.length })}{lastRound.fallback ? "" : " \u00b7 " + T("revised", { n: lastRound.changed, of: lastRound.scenes })}</span> : null}
        {general.length ? <div style={warn}>{general.map((x, i) => <div key={i}>{"\u2022 " + x}</div>)}</div> : null}
        {plan.scenes.map((scene, i) => {
          const ss = scene.sentenceIds.map((id) => byId.get(id)).filter(Boolean) as F.ScenePlan["sentences"];
          const start = ss.length ? Math.min(...ss.map((x) => x.startSec)) : 0, end = ss.length ? Math.max(...ss.map((x) => x.endSec)) : 0;
          const changed = plan.changed.includes(i), edited = plan.edited.includes(i);
          const setParam = (k: string, val: unknown) => setScene(i, { ...scene, params: { ...(scene.params ?? {}), [k]: val } });
          const canPhoto = scene.type === "news_photo" || scene.type === "number_callout" || scene.type === "quote_card";
          return (
            <div key={i + ":" + scene.sentenceIds.join(",")} style={{ borderTop: "1px solid var(--panel-border, #3334)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 4, background: changed ? "rgba(74,144,217,0.08)" : undefined }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{String(i + 1).padStart(2, "0")}</strong>
                <span style={muted}>{start.toFixed(1) + "\u2013" + end.toFixed(1) + "s"}</span>
                {changed ? <span style={{ ...muted, color: "#4a90d9", fontWeight: 600 }}>{T("changedMark")}</span> : null}
                {edited ? <span style={{ ...muted, color: "#d9822b" }}>{T("editedMark")}</span> : null}
              </div>
              <span style={{ ...muted, color: "inherit" }}>{ss.map((x) => x.text).join(" ")}</span>
              <label style={muted}>{T("sceneType")}{" "}
                <select value={scene.type} disabled={busy} onChange={(e) => setScene(i, retypeScene(scene, e.target.value, ss[0]?.text ?? "", photoRefs))}>
                  {SCENE_TYPES.map((t2) => <option key={t2} value={t2}>{T("type_" + t2)}</option>)}
                </select>
              </label>
              {canPhoto ? (
                <label style={muted}>{T("scenePhoto")}{" "}
                  <select value={scene.assetRef ?? ""} disabled={busy} onChange={(e) => { const { assetRef: _x, ...rest } = scene; setScene(i, e.target.value ? { ...rest, assetRef: e.target.value } : rest); }}>
                    <option value="">{T("noPhoto")}</option>
                    {photoRefs.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              ) : null}
              {scene.assetRef ? (
                <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  {plan.thumbs[scene.assetRef] ? <img src={plan.thumbs[scene.assetRef]} style={{ width: 72, borderRadius: 4, flex: "none" }} /> : null}
                  <span style={muted}>{T("assetShows", { summary: summary.get(scene.assetRef) ?? "" })}</span>
                </div>
              ) : null}
              {(SCENE_FIELDS[scene.type] ?? []).map((k) => {
                const raw = scene.params?.[k];
                if (k === "lines") return (
                  <label key={k} style={muted}>{T("field_lines")}
                    <textarea style={input} rows={3} value={Array.isArray(raw) ? raw.join("\n") : ""} disabled={busy} onChange={(e) => setParam("lines", e.target.value.split("\n"))} />
                  </label>
                );
                return (
                  <label key={k} style={muted}>{T("field_" + k)}
                    {k === "text"
                      ? <textarea style={input} rows={2} value={raw == null ? "" : String(raw)} disabled={busy} onChange={(e) => setParam(k, e.target.value)} />
                      : <input style={input} value={raw == null ? "" : String(raw)} disabled={busy} onChange={(e) => setParam(k, e.target.value)} />}
                  </label>
                );
              })}
              <details>
                <summary style={muted}>{T("sceneParams")}</summary>
                <textarea style={{ ...input, fontFamily: "monospace", fontSize: 11 }} rows={6} disabled={busy} defaultValue={JSON.stringify(scene.params ?? {}, null, 1)} key={JSON.stringify(scene.params ?? {})}
                  onBlur={(e) => {
                    try { const p = JSON.parse(e.target.value); setJsonErr((m) => { const n = { ...m }; delete n[i]; return n; }); if (JSON.stringify(p) !== JSON.stringify(scene.params ?? {})) setScene(i, { ...scene, params: p }); }
                    catch (err: any) { setJsonErr((m) => ({ ...m, [i]: T("badJson", { error: String(err?.message || err) }) })); }
                  }} />
                {jsonErr[i] ? <span style={warn}>{jsonErr[i]}</span> : null}
              </details>
              {(rowErrors.get(i) ?? []).map((x, k) => <span key={"e" + k} style={warn}>{"\u2022 " + x}</span>)}
              {(rowWarnings.get(i) ?? []).map((x, k) => <span key={"w" + k} style={muted}>{"\u2022 " + x}</span>)}
            </div>
          );
        })}
        <label>{T("feedback")}
          <textarea style={{ ...input, minHeight: 60 }} placeholder={T("feedbackHint")} value={feedback} disabled={busy} onChange={(e) => setFeedback(e.target.value)} />
        </label>
        <span style={muted}>{T("buildCredits")}</span>
        <button disabled={busy || !feedback.trim()} onClick={revise}>{T("revise")}</button>
        <button disabled={busy} onClick={build}>{T("buildFromPlan")}</button>
      </div>
    );
  };

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
          {liveErrors.length ? <div style={{ color: "#d9822b", fontSize: 12 }}>{liveErrors.map((x, i) => <div key={i}>{"\u2022 " + x}</div>)}</div> : null}
          <label>{T("headline1")}<input style={input} value={sc.headline.line1} disabled={busy || approved} onChange={(e) => setHead("line1", e.target.value)} /></label>
          <label>{T("headline2")}<input style={input} value={sc.headline.line2} disabled={busy || approved} onChange={(e) => setHead("line2", e.target.value)} /></label>
          <label>{T("accent")}<input style={input} value={sc.headline.accent ?? ""} disabled={busy || approved} onChange={(e) => setHead("accent", e.target.value)} /></label>
          {sc.sentences.map((x, i) => (
            <div key={x.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <textarea style={input} rows={Math.max(2, Math.ceil([...x.text].length / 11))} value={x.text} disabled={busy || approved} onChange={(e) => setLine(i, e.target.value)} />
              <span style={muted}>{T("source")}: {x.sourceQuote ? "\u201C" + x.sourceQuote + "\u201D" : T("noSource")}</span>
              {x.rewritten ? <span style={{ ...muted, color: "#4a90d9" }}>{T("rewritten")}</span> : null}
              {x.edited ? <span style={{ ...muted, color: "#d9822b" }}>{T("editedCheck")}</span> : null}
              {x.issues.length ? <span style={{ ...muted, color: "#d9822b" }}>{T("issues")}: {x.issues.map((v) => (MESSAGES["issue_" + v.kind] ? T("issue_" + v.kind) : v.kind) + (v.note ? " \u2013 " + v.note : "")).join("; ")}</span> : null}
            </div>
          ))}
          <span style={muted}>{T("length", { chars, sec: Math.round(chars / TTS_CHARS_PER_SEC) })}</span>
          {chars > MAX_CHARS ? <span style={{ color: "#d9822b", fontSize: 12 }}>{T("tooLong", { max: MAX_CHARS })}</span> : null}
          {approved ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>{"\u2713 " + T("approved")}</span>
              <button disabled={busy || tts?.state === "submitted" || tts?.state === "submitting"} onClick={() => update({ ...s, approved: null })}>{T("edit")}</button>
            </div>
          ) : (
            <button disabled={busy || chars > MAX_CHARS} onClick={approve}>{T("approve")}</button>
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
              {plan ? null : <>
                <span style={muted}>{T("buildCredits")}</span>
                <button disabled={busy} onClick={makePlan}>{T("makePlan")}</button>
              </>}
            </>
          )}
        </div>
      ) : null}

      {plan ? renderPlan(plan) : null}

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
