// Injected by the portable-panel build footer from shared/app-update-guard.ts.
declare function useAppUpdateGuard(sdk: any, language: string | undefined, readBlocked: (context: any) => boolean): void;
import React, { useEffect, useRef, useState } from "react";
import { MESSAGES, t } from "./messages.ts";
import { PRESETS } from "./preset.ts";
import { articleFromText } from "./pipeline/article.ts";
import type { PanelSdk } from "./pipeline/host.ts";
import { load, save, sleep, run } from "./pipeline/host.ts";
import { voicesScript, openDraftScript } from "./pipeline/scripts.ts";
import { renameDraft } from "./pipeline/preview.ts";
import { creditQuote, type TtsRecord } from "./pipeline/tts.ts";
import * as F from "./pipeline/flow.ts";
import { LAYOUT_ERROR, SCENE_TYPES, TARGET_CHARS, TTS_CHARS_PER_SEC } from "./prompts/index.ts";
import type { PlanScene } from "./prompts/types.ts";
import { retypeScene } from "./pipeline/plan.ts";

type Props = { sdk: PanelSdk; context?: { projectId?: string | null; language?: string } };

const box = { border: "1px solid var(--panel-border, #3334)", borderRadius: 8, padding: 10 } as const;
const muted = { color: "var(--panel-muted-fg, #888)", fontSize: 12 } as const;
const input = { width: "100%", boxSizing: "border-box", padding: 6, font: "inherit" } as const;
const MAX_CHARS = TARGET_CHARS.max;
const warn = { color: "#d9822b", fontSize: 12 } as const;
// Review fields stack the label over its control at any panel width.
const field = { ...muted, display: "flex", flexDirection: "column", gap: 2 } as const;
// A 9:16 thumbnail slot in a scene row.
const thumbBox = { width: 56, height: 100, flex: "none", borderRadius: 4, overflow: "hidden", position: "relative", background: "var(--panel-border, #3334)", display: "flex", alignItems: "center", justifyContent: "center" } as const;
const thumbTag = { position: "absolute", left: 0, right: 0, bottom: 0, fontSize: 10, lineHeight: "14px", textAlign: "center", color: "#fff", background: "rgba(0,0,0,0.6)" } as const;
// The scene number sits on the thumbnail's corner, leaving the row's width to the sentence.
const thumbNumber = { position: "absolute", left: 3, top: 3, zIndex: 1, fontSize: 10, lineHeight: "14px", padding: "0 3px", borderRadius: 3, color: "#fff", background: "rgba(0,0,0,0.7)" } as const;
const oneLine = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
// A scene's sentence: up to two lines, then an ellipsis.
const twoLines = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" } as const;
// The host stretches buttons to the full width; a button beside a scene row keeps its own size.
const rowButton = { flex: "none", width: "auto", whiteSpace: "nowrap" } as const;
// The scene row itself is a button (keyboard and screen readers); it drops the host's button look.
const rowSelect = { display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0, maxWidth: "none", height: "auto", padding: 0, margin: 0, border: "none", background: "none", color: "inherit", font: "inherit", textAlign: "left" } as const;
// The host fills every <button> as the panel's one action; the others say they are secondary.
const SECONDARY = { "data-variant": "secondary" } as const;
// A finished step: one summary line that opens to its full form.
function Step({ done, summary, children }: { done: boolean; summary: string; children: React.ReactNode }) {
  return done
    ? <details style={box}><summary style={{ cursor: "pointer" }}>{"\u2713 " + summary}</summary><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>{children}</div></details>
    : <div style={{ ...box, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>;
}

type Still = { state: "rendering" | "ready" | "failed"; dataUrl?: string };

// A small JPEG of an article photo or a rendered scene for the plan review rows (kept small in memory).
function thumbOf(dataUrl: string, w = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => {
      const h = Math.max(1, Math.round((im.height * w) / Math.max(1, im.width)));
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
  number_callout: ["title", "from", "to", "unit"],
  highlight_card: ["title", "value", "unit"],
  donut_ratio: ["title"],
  verdict_card: ["title"],
  flow_cause_effect: ["title"],
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
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [stills, setStills] = useState<Record<string, Still>>({});
  const env = useRef<F.Env | null>(null);
  const latest = useRef<F.Session | null>(null);
  latest.current = s;
  // Every call on the preview Draft goes through one queue, so a rename never overlaps a refill.
  const onDraft = useRef(F.draftQueue()).current;
  const renameNow = (projectId: string, draftId: string, name: string) => renameDraft(sdk, { projectId, draftId, name });
  const viewer = F.previewViewer(sdk, () => env.current, onDraft, () => latest.current?.preview ?? latest.current?.video);
  const openNow = (projectId: string, draftId: string) => viewer.open(projectId, draftId).then((ok) => { if (!ok) log("previewNotOpened"); }, () => log("previewNotOpened"));
  useAppUpdateGuard(sdk, context?.language, () => busy);

  const log: F.Log = (k, v) => { const m = T(k, v); setStatus(m); setLines((l) => [...l.slice(-40), new Date().toLocaleTimeString() + "  " + m]); };
  const finish = async (rec: F.RunRecord) => { const path = await F.saveRunRecord(sdk, env.current!, rec); if (path) log("record", { path }); };
  const update = async (next: F.Session) => { latest.current = next; setS(next); await save(sdk, F.sessionKey(env.current?.projectId ?? next.projectId), next); };

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

  // The Draft the scene rows show and go to: the preview, or once confirmed the video, while it still matches the plan.
  const pv = s?.preview ?? null;
  const view = s ? F.rowsDraft(s) : null;
  const video = !pv ? view : null;
  // Finished-frame thumbnails of that Draft, one at a time, the picked scene first; kept for the open panel.
  // Only the current build's thumbnails are kept; a result for an older build is dropped (the copy still re-runs
  // this effect, so the next thumbnail starts).
  const rendering = useRef(false);
  useEffect(() => {
    const pv = view;
    if (!pv || !pv.planRev || busy || rendering.current) return;
    const order = pv.scenes.map((_, i) => i);
    if (picked !== null && picked < order.length) order.unshift(...order.splice(picked, 1));
    const i = order.find((k) => !stills[F.stillKey(pv, k)]);
    if (i === undefined) return;
    const key = F.stillKey(pv, i), build = F.stillBuild(pv);
    const mine = (m: Record<string, Still>) => Object.fromEntries(Object.entries(m).filter(([k]) => k.startsWith(build)));
    rendering.current = true;
    setStills((m) => ({ ...mine(m), [key]: { state: "rendering" } }));
    viewer.still(pv, i)
      .then(async (r) => {
        const small = await thumbOf(r.dataUrl, 216).catch(() => r.dataUrl);
        rendering.current = false;
        setStills((m) => (key in m ? { ...m, [key]: { state: "ready", dataUrl: small } } : { ...m }));
        if (!r.cached) log("stillTime", { n: i + 1, sec: (r.ms / 1000).toFixed(1) });
      })
      .catch(() => { rendering.current = false; setStills((m) => (key in m ? { ...m, [key]: { state: "failed" } } : { ...m })); });
  }, [view?.draftId, view?.at, view?.planRev, picked, busy, stills]);

  // Once the plan moves past the preview, the Draft's name says so in the editor too (once per change).
  const stale = !!(pv && s?.plan && pv.planRev !== F.previewRev(s));
  // The check runs again when the queued rename's turn comes: a refill queued before it may have made it current.
  useEffect(() => {
    if (!stale || busy) return;
    onDraft(async () => {
      const cur = latest.current, p = cur?.preview;
      if (!cur || !p || !cur.projectId || !cur.plan || p.planRev === F.previewRev(cur) || cur.videos?.includes(p.draftId)) return;
      const name = F.previewName(cur, T("stalePrefix"));
      if (p.name === name) return;
      await renameNow(cur.projectId, p.draftId, name);
      const now = latest.current;
      if (now?.preview?.draftId === p.draftId) await update({ ...now, preview: { ...now.preview, name } });
    }).catch(() => {});
  }, [stale, busy]);

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
    const next2 = { ...s, plan, draftId: null };
    await update(next2);
    setFeedback(""); setJsonErr({}); setOpenRow(null); setPicked(null);
    if (plan.timing === "ratio") setError(T("timingRatio"));
    await previewInto(next2);
  });

  // Builds (or refills) the preview Draft for sess and opens it; a failure leaves the plan to review.
  const previewInto = async (sess: F.Session) => {
    const v = F.checkPlan(sess.plan!);
    const blocking = v.errors.filter((e) => F.BLOCKING_PLAN_ERROR.test(e));
    if (blocking.length) { setError(T("previewBlocked", { errors: blocking.slice(0, 3).join("; ") })); return; }
    const rec = F.newRunRecord(preset.id, sess.article?.url ?? "");
    try {
      const r = await onDraft(() => F.buildPreview(sdk, env.current!, sess, preset, T("previewPrefix"), log, rec));
      await update({ ...sess, preview: r.preview });
      await openNow(sess.projectId!, r.preview.draftId);
      log("previewReady");
    } catch (e: any) {
      rec.notes.push("error: " + String(e?.message || e));
      if (e instanceof F.PartialDraftError && e.preview) await update({ ...sess, preview: e.preview });
      setError(T("previewFailed", { error: String(e?.message || e) }));
    } finally { await finish(rec); }
  };
  const refreshPreview = () => guard(async () => { if (latest.current?.plan) await previewInto(latest.current); });

  const revise = () => guard(async () => {
    const note = feedback.trim();
    if (!note || !s.plan) return;
    log("revising");
    const rec = F.newRunRecord(preset.id, s.article?.url ?? "");
    let r;
    try { r = await F.revisePlan(sdk, env.current!, s, preset, note, log, rec); }
    catch (e: any) { rec.notes.push("error: " + String(e?.message || e)); throw e; }
    finally { await finish(rec); }
    const next2 = { ...s, plan: r.plan };
    await update(next2);
    setJsonErr({});
    if (r.kept) setError(T("reviseKept"));
    else { setFeedback(""); log("revised", { n: r.plan.changed.length, of: r.plan.scenes.length }); await previewInto(next2); }
  });

  // "Use this layout": only the preview the reviewer has seen becomes the video; a changed plan updates the preview first.
  const build = () => guard(async () => {
    const plan = s.plan;
    if (!plan || !F.previewFresh(s)) return;
    const v = F.checkPlan(plan);
    // Text that does not fit (cut off, over the source, out of its card) cannot become the video either.
    const blocking = v.errors.filter((e) => F.BLOCKING_PLAN_ERROR.test(e) || LAYOUT_ERROR.test(e));
    if (blocking.length) throw new Error(T("planBlocked", { errors: blocking.slice(0, 3).join("; ") }));
    if (v.errors.length && !window.confirm(T("planAnyway") + "\n\n" + v.errors.slice(0, 8).join("\n"))) return;
    const rec = F.newRunRecord(preset.id, s.article?.url ?? "");
    const name = F.finalName(s);
    let draftId: string, placed: F.PreviewDraft;
    try {
      // The reviewed preview becomes the video: renamed when it shows this plan, else filled again first.
      // A preview Draft removed by hand fails the rename; the refill below then reports it gone and builds anew.
      let renamed = false;
      if (F.previewFresh(s) && s.preview!.projectId === s.projectId) {
        try { await viewer.rename(s.projectId!, s.preview!.draftId, name); renamed = true; }
        catch (e: any) { rec.notes.push("video: preview Draft " + s.preview!.draftId + " not renamed (" + String(e?.message || e) + ")"); }
      }
      if (renamed) {
        draftId = s.preview!.draftId;
        placed = { ...s.preview!, name };
        rec.notes.push("video: preview Draft " + draftId + " renamed");
        log("videoFromPreview");
      } else {
        const r = await onDraft(() => F.assemble(sdk, env.current!, s, preset, log, rec, { name, reuse: s.preview }));
        draftId = r.draftId;
        placed = { ...r.draft, name, planRev: F.previewRev(s), at: new Date().toISOString() };
        rec.notes.push("video: " + (r.refilled ? "preview Draft " + draftId + " refilled" : "new Draft " + draftId));
      }
    }
    catch (e: any) {
      rec.notes.push("error: " + String(e?.message || e));
      if (e instanceof F.PartialDraftError) await update({ ...s, preview: { ...e.draft, name, planRev: "", at: new Date().toISOString() } });
      throw e;
    }
    finally { await finish(rec); }
    // The preview is used up: a later change to the plan starts a new preview Draft.
    await update({ ...s, draftId, preview: null, video: placed, videos: [...(s.videos ?? []).filter((d) => d !== draftId), draftId].slice(-50) });
    await viewer.open(s.projectId!, draftId).catch(() => {});
  });

  // A scene the reviewer changed by hand; it is marked and goes to the planner as part of the previous plan.
  const setScene = (i: number, sc: PlanScene) => {
    const plan = s.plan;
    if (!plan) return;
    const scenes = plan.scenes.map((x, k) => (k === i ? sc : x));
    const edited = plan.edited.includes(i) ? plan.edited : [...plan.edited, i];
    update({ ...s, plan: { ...plan, scenes, edited }, draftId: null });
  };

  // Starting over keeps the preview record, so the next run refills that Draft instead of adding another.
  const reset = () => guard(async () => { await update({ ...F.emptySession(s.presetId), voiceId: s.voiceId, projectId: s.projectId, preview: s.preview ?? null, videos: s.videos }); setUrl(""); setText(""); setOpenRow(null); setPicked(null); });

  const pick = (i: number) => {
    setPicked(i);
    const p = view;
    if (!p || !p.planRev || i >= p.scenes.length) return;
    viewer.seek(p, i).then((r) => { if (!r.confirmed) log("seekUnconfirmed", { n: i + 1 }); }).catch(() => log("seekUnconfirmed", { n: i + 1 }));
  };

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
        // "scene 7: ...", "scene 7 (highlight_card): ..." and "scene 7.from ..." all belong to row 7.
        const m = /^scene (\d+)\b:? ?(.*)$/.exec(e);
        if (m) into.set(Number(m[1]) - 1, [...(into.get(Number(m[1]) - 1) ?? []), m[2]]);
        else if (rest) rest.push(e);
      }
    };
    sort(v.errors, rowErrors, general);
    const unfit = v.errors.some((e) => LAYOUT_ERROR.test(e));
    const confirmable = F.previewFresh(s) && !unfit;
    // An asset used too often is reported once by ref; show it on every row that uses that asset.
    const notes: string[] = [];
    sort(v.warnings, rowWarnings, notes);
    for (const w of notes) {
      const m = /^asset (\S+) is used in/.exec(w);
      if (!m) continue;
      plan.scenes.forEach((x, k) => { if (x.assetRef === m[1]) rowWarnings.set(k, [...(rowWarnings.get(k) ?? []), w]); });
    }
    const byId = new Map(plan.sentences.map((x) => [x.id, x]));
    const spans = F.sceneSpans(plan);
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
        {/* After a change the next step is updating the preview; only a preview the reviewer has seen is confirmed. */}
        {pv ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={!pv.planRev || stale ? warn : muted}>{!pv.planRev ? T("previewPartial") : stale ? T("previewStale") : "\u2713 " + T("previewFresh", { n: pv.scenes.length })}</span>
            {!pv.planRev || stale ? <button disabled={busy} onClick={refreshPreview}>{T("previewRebuild")}</button> : null}
            <button {...SECONDARY} disabled={busy} onClick={() => openNow(s.projectId!, pv.draftId)}>{T("openPreview")}</button>
          </div>
        ) : video ? <span style={muted}>{T("videoRows")}</span>
          : <>
            {s.draftId ? <span style={warn}>{T("videoRowsOff")}</span> : null}
            <button disabled={busy} onClick={refreshPreview}>{T("previewBuild")}</button>
          </>}
        {plan.scenes.map((scene, i) => {
          const ss = scene.sentenceIds.map((id) => byId.get(id)).filter(Boolean) as F.ScenePlan["sentences"];
          // The graphic's own span (what the viewer jumps to); the sentences' times only while the plan cannot be placed.
          const start = spans ? spans[i].startSec : ss.length ? Math.min(...ss.map((x) => x.startSec)) : 0;
          const end = spans ? spans[i].endSec : ss.length ? Math.max(...ss.map((x) => x.endSec)) : 0;
          const changed = plan.changed.includes(i), edited = plan.edited.includes(i);
          const setParam = (k: string, val: unknown) => setScene(i, { ...scene, params: { ...(scene.params ?? {}), [k]: val } });
          const canPhoto = scene.type === "news_photo" || scene.type === "number_callout" || scene.type === "quote_card";
          const still = view && i < view.scenes.length ? stills[F.stillKey(view, i)] : undefined;
          const canPick = !!view && i < view.scenes.length;
          const photo = scene.assetRef ? plan.thumbs[scene.assetRef] : undefined;
          const open = openRow === i;
          const nErr = rowErrors.get(i)?.length ?? 0, nWarn = rowWarnings.get(i)?.length ?? 0;
          return (
            <div key={i + ":" + scene.sentenceIds.join(",")} style={{ borderTop: "1px solid var(--panel-border, #3334)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6, background: changed ? "rgba(74,144,217,0.08)" : picked === i ? "rgba(127,127,127,0.10)" : undefined }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button style={{ ...rowSelect, cursor: canPick ? "pointer" : "default" }} aria-pressed={picked === i} aria-disabled={!canPick} title={canPick ? undefined : T("rowNoSeek")} onClick={() => pick(i)}>
                <div style={thumbBox}>
                  <strong style={thumbNumber}>{String(i + 1).padStart(2, "0")}</strong>
                  {still?.state === "ready" ? <img src={still.dataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: still?.state === "rendering" ? 0.4 : 1 }} />
                    : <span style={{ ...muted, fontSize: 10, textAlign: "center", padding: 2 }}>{T("type_" + scene.type)}</span>}
                  {still?.state === "ready" ? (stale ? <span style={{ ...thumbTag, background: "rgba(217,130,43,0.85)" }}>{T("staleBadge")}</span> : null)
                    : still?.state === "rendering" ? <span style={thumbTag}>{T("rendering")}</span>
                    : photo ? <span style={thumbTag}>{T("sourcePhoto")}</span> : null}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                  {/* Time and kind wrap in a narrow panel rather than cut the kind short. */}
                  <span style={{ ...muted, wordBreak: "keep-all" }}>{start.toFixed(1) + "\u2013" + end.toFixed(1) + "s \u00b7 " + T("type_" + scene.type)}
                    {changed ? <span style={{ color: "#4a90d9", fontWeight: 600 }}>{" \u00b7 " + T("changedMark")}</span> : null}
                    {edited ? <span style={{ color: "#d9822b" }}>{" \u00b7 " + T("editedMark")}</span> : null}
                  </span>
                  <span style={twoLines}>{ss.map((x) => x.text).join(" ")}</span>
                  {picked === i ? <span style={{ ...muted, fontWeight: 600 }}>{"\u2713 " + T("pickedMark")}</span> : null}
                  {/* A scene that needs a fix says so on the closed row; Edit lists the problems in full. */}
                  {nErr ? <span style={{ ...warn, fontWeight: 600 }}>{"\u2716 " + T("rowErrors", { n: nErr })}</span> : null}
                  {nWarn ? <span style={warn}>{"\u26a0 " + T("rowWarnings", { n: nWarn })}</span> : null}
                </div>
                </button>
                <button {...SECONDARY} style={rowButton} aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpenRow(open ? null : i); }}>{T(open ? "closeScene" : "editScene")}</button>
              </div>
              {open ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 8 }}>
                  {(rowErrors.get(i) ?? []).map((x, k) => <span key={"e" + k} style={{ ...warn, fontWeight: 600, overflowWrap: "anywhere" }}>{"\u2716 " + x}</span>)}
                  {(rowWarnings.get(i) ?? []).map((x, k) => <span key={"w" + k} style={{ ...warn, overflowWrap: "anywhere" }}>{"\u26a0 " + x}</span>)}
                  <label style={field}>{T("sceneType")}
                    <select value={scene.type} disabled={busy} onChange={(e) => setScene(i, retypeScene(scene, e.target.value, ss[0]?.text ?? "", photoRefs))}>
                      {SCENE_TYPES.map((t2) => <option key={t2} value={t2}>{T("type_" + t2)}</option>)}
                    </select>
                  </label>
                  {canPhoto ? (
                    <label style={field}>{T("scenePhoto")}
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
                      <label key={k} style={field}>{T("field_lines")}
                        <textarea style={input} rows={3} value={Array.isArray(raw) ? raw.join("\n") : ""} disabled={busy} onChange={(e) => setParam("lines", e.target.value.split("\n"))} />
                      </label>
                    );
                    return (
                      <label key={k} style={field}>{T("field_" + k)}
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
                </div>
              ) : null}
            </div>
          );
        })}
        <details>
          <summary style={{ cursor: "pointer" }}>{T("feedbackOpen")}</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>{T("feedback")}
              <textarea style={{ ...input, minHeight: 60 }} placeholder={T("feedbackHint")} value={feedback} disabled={busy} onChange={(e) => setFeedback(e.target.value)} />
            </label>
            <span style={muted}>{T("buildCredits")}</span>
            <button {...SECONDARY} disabled={busy || !feedback.trim()} onClick={revise}>{T("revise")}</button>
          </div>
        </details>
        {video ? null : (
          <>
            <button {...(confirmable ? {} : SECONDARY)} disabled={busy || !confirmable} onClick={build}>{T("buildFromPlan")}</button>
            <span style={unfit ? warn : muted}>{T(unfit ? "confirmNeedsFit" : F.previewFresh(s) ? "confirmHint" : "confirmNeedsPreview")}</span>
          </>
        )}
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
        // Once the scenes are planned, the approved script folds into one line (it opens again to read or edit).
        <Step done={!!plan} summary={T("scriptDone", { n: sc.sentences.length })}>
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
              <button {...SECONDARY} disabled={busy || tts?.state === "submitted" || tts?.state === "submitting"} onClick={() => update({ ...s, approved: null })}>{T("edit")}</button>
            </div>
          ) : (
            <button disabled={busy || chars > MAX_CHARS} onClick={approve}>{T("approve")}</button>
          )}
        </Step>
      )}

      {approved && next ? (
        <Step done={!!plan && next.kind === "ready"} summary={next.kind === "ready" ? T("narrated", { sec: next.durationSeconds.toFixed(1) }) : ""}>
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
        </Step>
      ) : null}

      {plan ? renderPlan(plan) : null}

      {s.draftId ? (
        // A newer preview is open above: this box is the earlier edit Draft, not the preview's result.
        <div style={{ ...box, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ ...(pv ? muted : {}), flex: 1, minWidth: 0 }}>{T(pv ? "previousVideo" : "done")}</span>
          <button {...SECONDARY} style={rowButton} disabled={busy} onClick={() => run(sdk, openDraftScript(s.draftId!)).catch(() => {})}>{T("openDraft")}</button>
        </div>
      ) : null}

      {status ? <span style={muted}>{status}</span> : null}
      {lines.length ? <details><summary style={muted}>Log</summary><pre style={{ ...muted, whiteSpace: "pre-wrap", margin: 0 }}>{lines.join("\n")}</pre></details> : null}
      {error ? <span style={{ color: "#d9822b", fontSize: 12, whiteSpace: "pre-wrap" }}>{error}</span> : null}
      {sc ? <button {...SECONDARY} disabled={busy} onClick={reset}>{T("startOver")}</button> : null}
    </div>
  );
}

export default NewsMinutePanel;
