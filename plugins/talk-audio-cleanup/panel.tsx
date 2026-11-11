// @name Talk Audio Cleanup
// @name:ko 토크 오디오 정리
// @icon audio
// Cleans the sound of a talking Draft the way a broadcast editing guide asks for:
// cuts clicks out of the pauses, lowers breaths and sniffs, mutes one-frame ticks
// between words and puts a one-frame fade on every cut. It works on a copy of the
// open Draft; the original is left as it is.

import React, { useEffect, useMemo, useState } from "react";

const ID = "talk-audio-cleanup";
const FPS = 30; // the analysis works on 30 fps frames; other Drafts are refused
const BATCH = 30; // edits per script run, so one run stays well inside the script budget
const RULES = ["blemish", "breath", "sniff", "click"];

const STRINGS = {
  en: {
    noDraft: "Open the Draft you want to clean.",
    reading: "Reading the Draft…",
    draft: "Draft",
    clips: (n, s) => `${n} clip${n === 1 ? "" : "s"} on Main, ${s} of source audio`,
    skippedSpeed: (n) => `${n} left out (not at 1× speed)`,
    unsupported: {
      fps: "This Draft is not 30 fps. The analysis works on 30 fps frames.",
      none: "No Main clip with its own source file was found in this Draft.",
      web: "The analysis runs a local program, so it needs the desktop app.",
    },
    analyze: "Analyze",
    analyzing: "Analyzing…",
    analyzeNote: "Runs on this computer. Nothing is uploaded and no credits are used.",
    steps: { decode: "Decode the audio", detect: "Find what to clean", read: "Read the result" },
    found: "What was found",
    rule: {
      blemish: ["Cut clicks and blemishes", "Guide 5: remove the blemish, keep the pause"],
      breath: ["Lower breaths", "Guide 3: bring the clip volume down, not the gain"],
      sniff: ["Mute loud sniffs", "A breath that is loud and hissy is muted instead of lowered"],
      click: ["Mute ticks between words", "One or two frames, muted in place so the picture is not cut"],
    },
    count: (n, s) => `${n} place${n === 1 ? "" : "s"}, ${s}`,
    cutLine: "Only cut when this sure",
    cutLineNote: (n) => `${n} less certain cut${n === 1 ? "" : "s"} become${n === 1 ? "s" : ""} a volume change instead, so the picture is not cut there.`,
    lowerBy: "Lower breaths by",
    fade: "One-frame fade after each cut",
    fadeNote: "Guide 4: no tick at a cut",
    apply: "Make a cleaned copy",
    applying: "Applying…",
    applyNote: (c, v, s, name) => `${c} cut${c === 1 ? "" : "s"} (${s} shorter) and ${v} volume change${v === 1 ? "" : "s"}, on a copy named “${name}”.`,
    done: (n, d) => `Saved “${n}”: ${d.delete} cut, ${d.lower} lowered, ${d.mute} muted, ${d.fades} fades${d.skipped ? `, ${d.skipped} skipped` : ""}.`,
    listen: "Play a few of them before you export. They were found by measuring, not by listening.",
    again: "Analyze again",
    more: (n) => `and ${n} more`,
    copySuffix: "cleaned",
  },
  ko: {
    noDraft: "\uc815\ub9ac\ud560 Draft\ub97c \uc5f4\uc5b4 \uc8fc\uc138\uc694.",
    reading: "Draft\ub97c \uc77d\ub294 \uc911…",
    draft: "Draft",
    clips: (n, s) => `Main \ud074\ub9bd ${n}\uac1c, \uc6d0\ubcf8 \uc624\ub514\uc624 ${s}`,
    skippedSpeed: (n) => `1\ubc30\uc18d\uc774 \uc544\ub2cc ${n}\uac1c \uc81c\uc678`,
    unsupported: {
      fps: "\uc774 Draft\ub294 30fps\uac00 \uc544\ub2d9\ub2c8\ub2e4. \ubd84\uc11d\uc740 30fps \ud504\ub808\uc784 \ub2e8\uc704\ub85c \ub3d9\uc791\ud569\ub2c8\ub2e4.",
      none: "\uc774 Draft\uc758 Main\uc5d0\uc11c \uc6d0\ubcf8 \ud30c\uc77c\uc774 \uc788\ub294 \ud074\ub9bd\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
      web: "\ubd84\uc11d\uc740 \uc774 \ucef4\ud4e8\ud130\uc758 \ud504\ub85c\uadf8\ub7a8\uc744 \uc2e4\ud589\ud558\ubbc0\ub85c \ub370\uc2a4\ud06c\ud1b1 \uc571\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    },
    analyze: "\ubd84\uc11d",
    analyzing: "\ubd84\uc11d \uc911…",
    analyzeNote: "\uc774 \ucef4\ud4e8\ud130\uc5d0\uc11c \uc2e4\ud589\ub429\ub2c8\ub2e4. \uc5c5\ub85c\ub4dc\ud558\uc9c0 \uc54a\uace0 \ud06c\ub808\ub527\ub3c4 \uc4f0\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    steps: { decode: "\uc624\ub514\uc624 \ud480\uae30", detect: "\uc815\ub9ac\ud560 \uacf3 \ucc3e\uae30", read: "\uacb0\uacfc \uc77d\uae30" },
    found: "\ucc3e\uc740 \uac83",
    rule: {
      blemish: ["\uc7a1\ud2f0 \uc798\ub77c\ub0b4\uae30", "\uac00\uc774\ub4dc 5: \ub9c8\ub294 \ub0a8\uae30\uace0 \uc7a1\ud2f0\ub9cc \uc81c\uac70"],
      breath: ["\uc501·\ud558~ \uc74c\ub7c9 \ub0ae\ucd94\uae30", "\uac00\uc774\ub4dc 3: \uac8c\uc778\uc774 \uc544\ub2c8\ub77c \ud074\ub9bd \uc74c\ub7c9\uc744 \ub0b4\ub9bc"],
      sniff: ["\ud070 \ucf54\uba39\uc74c \uc74c\ub7c9 0", "\ud06c\uace0 \uc26c\uc775\uac70\ub9ac\ub294 \uc228\uc18c\ub9ac\ub294 \ub0ae\ucd94\uc9c0 \uc54a\uace0 0\uc73c\ub85c"],
      click: ["\ub9d0 \uc0ac\uc774 \ub538\uae4d \uc74c\ub7c9 0", "1~2\ud504\ub808\uc784\uc744 \uc81c\uc790\ub9ac\uc5d0\uc11c \uc74c\ub7c9 0\uc73c\ub85c. \ud654\uba74\uc740 \uc790\ub974\uc9c0 \uc54a\uc74c"],
    },
    count: (n, s) => `${n}\uacf3, ${s}`,
    cutLine: "\uc774\ub9cc\ud07c \ud655\uc2e4\ud560 \ub54c\ub9cc \uc790\ub974\uae30",
    cutLineNote: (n) => `\ub35c \ud655\uc2e4\ud55c \ucef7 ${n}\uacf3\uc740 \uc790\ub974\uc9c0 \uc54a\uace0 \uc74c\ub7c9\ub9cc \uc870\uc808\ud569\ub2c8\ub2e4. \uadf8 \uc790\ub9ac\uc758 \ud654\uba74\uc740 \ub04a\uae30\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.`,
    lowerBy: "\uc228\uc18c\ub9ac\ub97c \ub0ae\ucd94\ub294 \uc591",
    fade: "\uc790\ub978 \uc790\ub9ac\ub9c8\ub2e4 1\ud504\ub808\uc784 Fade",
    fadeNote: "\uac00\uc774\ub4dc 4: \uc790\ub978 \uc790\ub9ac\uc5d0\uc11c \ud2f1 \uc18c\ub9ac\uac00 \ub098\uc9c0 \uc54a\uac8c",
    apply: "\uc815\ub9ac\ub41c \uc0ac\ubcf8 \ub9cc\ub4e4\uae30",
    applying: "\uc801\uc6a9 \uc911…",
    applyNote: (c, v, s, name) => `\ucef7 ${c}\uacf3(${s} \uc9e7\uc544\uc9d0), \uc74c\ub7c9 \uc870\uc808 ${v}\uacf3\uc744 “${name}” \uc0ac\ubcf8\uc5d0 \uc801\uc6a9\ud569\ub2c8\ub2e4.`,
    done: (n, d) => `“${n}” \uc800\uc7a5\ub428: \ucef7 ${d.delete}, \uc74c\ub7c9 \ub0ae\ucda4 ${d.lower}, \uc74c\ub7c9 0 ${d.mute}, Fade ${d.fades}${d.skipped ? `, \uac74\ub108\ub700 ${d.skipped}` : ""}.`,
    listen: "\ub0b4\ubcf4\ub0b4\uae30 \uc804\uc5d0 \uba87 \uacf3\uc744 \uc9c1\uc811 \ub4e4\uc5b4 \ubcf4\uc138\uc694. \uce21\uc815\uc73c\ub85c \ucc3e\uc740 \uac83\uc774\uace0, \ub4e4\uc5b4\uc11c \ucc3e\uc740 \uac83\uc774 \uc544\ub2d9\ub2c8\ub2e4.",
    again: "\ub2e4\uc2dc \ubd84\uc11d",
    more: (n) => `\uc678 ${n}\uacf3`,
    copySuffix: "\uc815\ub9ac\ubcf8",
  },
};

const clock = (s) => {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
};
const span = (s, ko) => (s >= 60 ? `${Math.floor(s / 60)}${ko ? "\ubd84 " : "m "}${Math.round(s % 60)}${ko ? "\ucd08" : "s"}` : `${s.toFixed(1)}${ko ? "\ucd08" : "s"}`);
const q = (v) => JSON.stringify(v);

// What each item becomes with the current settings. A cut the model is less sure of
// than `cutLine` is turned into a volume change, so the picture is not cut there.
function resolve(items, on, cutLine, lowerDb) {
  const out = [];
  for (const it of items) {
    if (!on[it.rule]) continue;
    let action = it.action;
    if (action === "delete" && it.confidence < cutLine) action = it.frames <= 2 ? "mute" : "lower";
    out.push({ ...it, action, lowerDb: action === "lower" ? lowerDb : null, softened: action !== it.action });
  }
  return out;
}

const READ = (projectId, draftId) => `
const d = selects.draft(${q(draftId)}), p = selects.project(${q(projectId)});
const meta = await d.meta();
const walk = (n) => n.flatMap((x) => (x.type === "dir" ? walk(x.children) : [x]));
const overview = await p.sourceFiles();
const trees = "fileTree" in overview ? [overview.fileTree] : await Promise.all(
  overview.folders.map(async (f) => { const r = await p.sourceFiles({ folder: f.name }); return "fileTree" in r ? r.fileTree : []; }));
const files = walk(trees.flat());
const clips = [];
let skipped = 0;
for (const r of await d.clips()) {
  if (r.trackKind !== "main" || r.resourceId == null || r.sourceStartSeconds == null) continue;
  const f = files.find((x) => x.resourceId === r.resourceId);
  if (!f?.path || f.type === "sequence") continue;
  if (r.playbackSpeed && r.playbackSpeed.numerator !== r.playbackSpeed.denominator) { skipped++; continue; }
  clips.push({ resourceId: r.resourceId, path: f.path, sourceStart: r.sourceStartSeconds, frames: r.endFrame - r.startFrame });
}
return { fps: meta.fps, name: meta.name ?? null, clips, skipped, env: await selects.files.environment() };`;

// Applies one batch. Each item is placed from the Draft's rows as they are at that moment, by source time,
// so an earlier cut never shifts a later item onto the wrong frames.
const APPLY = (projectId, sourceDraftId, targetDraftId, name, batch, fade) => `
const ITEMS = ${q(batch)}, FPS = ${FPS}, FADE = ${q(fade)};
const d = ${targetDraftId ? `selects.draft(${q(targetDraftId)})` : `await selects.project(${q(projectId)}).duplicateDraft({ sourceDraftId: ${q(sourceDraftId)}, name: ${q(name)} })`};
const main = async () => (await d.clips()).filter((r) => r.trackKind === "main");
const done = { delete: 0, lower: 0, mute: 0, fades: 0, skipped: 0 };
for (const it of ITEMS) {
  const row = (await main()).find((r) => r.resourceId === it.resourceId && r.sourceStartSeconds != null &&
    it.start >= r.sourceStartSeconds - 1e-6 && it.end <= r.sourceStartSeconds + (r.endFrame - r.startFrame) / FPS + 1e-6);
  if (!row) { done.skipped++; continue; }
  const a = row.startFrame + Math.round((it.start - row.sourceStartSeconds) * FPS), b = a + it.frames;
  if (a <= row.startFrame || b >= row.endFrame) { done.skipped++; continue; }   // never touch a clip's own first or last frame
  for (const frame of [a, b]) if (!(await main()).some((r) => r.startFrame === frame || r.endFrame === frame)) await d.splitAt({ frame });
  const piece = (await main()).find((r) => r.startFrame === a && r.endFrame === b);
  if (!piece) { done.skipped++; continue; }
  if (it.action === "delete") {
    await d.removeClips(piece); done.delete++;
    const next = FADE ? (await main()).find((r) => r.startFrame === a) : null;
    if (next) { await d.setClipAudio({ clip: next, fadeInSeconds: 1 / FPS }); done.fades++; }
    continue;
  }
  const now = await d.clipAudio(piece);
  if (now.volumeDb == null) { done.skipped++; continue; }                       // a keyed volume line is left alone
  await d.setClipAudio({ clip: piece, volumeDb: it.action === "mute" ? -60 : Math.max(-60, now.volumeDb - it.lowerDb) });
  done[it.action]++;
}
const saved = await d.commitAll("Talk audio cleanup");
return { done, draftId: ${targetDraftId ? q(targetDraftId) : "saved.createdDraftId"} };`;

export default function Panel({ sdk, context, ui }) {
  const ko = context.language === "ko";
  const t = ko ? STRINGS.ko : STRINGS.en;
  const [info, setInfo] = useState(null);
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null); // null | "read" | "analyze" | "apply"
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [on, setOn] = useState({ blemish: true, breath: true, sniff: true, click: true });
  const [cutLine, setCutLine] = useState(30);
  const [lowerDb, setLowerDb] = useState(11);
  const [fade, setFade] = useState(true);
  const { projectId, sequenceId } = context;

  const run = async (summary, script, allowCommit = false) => {
    const r = await sdk.runScript({ summary, script, allowCommit });
    if (r.isError) throw Error(r.output || summary);
    return r.result;
  };

  useEffect(() => {
    let live = true;
    setInfo(null); setItems(null); setResult(null); setError(null);
    if (!projectId || !sequenceId) return;
    setBusy("read");
    run("Read the Draft's Main clips", READ(projectId, sequenceId))
      .then((r) => live && setInfo(r))
      .catch((e) => live && setError(String(e.message || e)))
      .finally(() => live && setBusy(null));
    return () => { live = false; };
  }, [projectId, sequenceId]);

  const blocked = !info ? null : context.platform !== "desktop" ? t.unsupported.web : Math.abs(info.fps - FPS) > 1e-6 ? t.unsupported.fps : info.clips.length === 0 ? t.unsupported.none : null;
  const sourceSeconds = info ? info.clips.reduce((s, c) => s + c.frames / FPS, 0) : 0;

  async function analyze() {
    setBusy("analyze"); setError(null); setItems(null); setResult(null); setStage(0);
    try {
      const work = `${info.env.tempDirectory.replace(/[\\/]$/, "")}/${ID}-${Date.now()}`;
      await run("Make a work folder", `await selects.files.mkdir(${q(work)}); return true;`, true);
      const bySource = new Map();
      for (const c of info.clips) {
        const s = bySource.get(c.resourceId) ?? { ...c, from: c.sourceStart, to: c.sourceStart + c.frames / FPS };
        s.from = Math.min(s.from, c.sourceStart); s.to = Math.max(s.to, c.sourceStart + c.frames / FPS);
        bySource.set(c.resourceId, s);
      }
      const all = [];
      let n = 0;
      for (const s of bySource.values()) {
        n++;
        // Start on the clip's own frame grid, 5 s early, so the noise floor is settled where the clip begins.
        const lead = Math.min(150, Math.floor(s.from * FPS));
        const t0 = s.from - lead / FPS, wav = `${work}/in-${n}.wav`, out = `${work}/edl-${n}.json`;
        setStage(0);
        const peek = await run("Read where the picture starts in the file", `return await selects.media.measureAudioPeaks({ path: ${q(s.path)}, startSeconds: 0, endSeconds: 1 });`);
        const videoStart = peek?.videoStartSeconds ?? 0; // source clock = file time minus this
        const job = await run("Decode the audio", `return await selects.media.startFFmpeg({ args: ${q(["-nostdin", "-v", "error", "-y", "-ss", String(t0 + videoStart), "-t", String(s.to - t0 + 5), "-i", s.path, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", wav])} });`, true);
        for (;;) {
          const st = await run("Wait for the decode", `return await selects.media.job(${q(job.jobId)}).status({ cursor: 0 });`);
          if (st.state === "succeeded") break;
          if (st.state !== "running") throw Error(`ffmpeg ${st.state}`);
          await new Promise((r) => setTimeout(r, 700));
        }
        setStage(1);
        const data = "$HOME/.selects/plugin-data/talk-audio-cleanup";
        const sh = await sdk.runShell({
          summary: "Find what to clean",
          command: `"${data}/venv/bin/python" "$SELECTS_USER_SKILLS_ROOT/talk-audio-cleanup/engine/analyze.py" --wav ${q(wav)} --model "${data}/model.joblib" --out ${q(out)} --source-start ${t0}`,
          cwd: work,
          timeoutMs: 300000,
        });
        if (sh.isError || sh.exitCode !== 0) throw Error(sh.stderr || sh.output || "analysis failed");
        setStage(2);
        let text = "";
        const decoder = new TextDecoder();
        for (let offset = 0; ; offset += 49152) {
          const part = await run("Read the result", `return await selects.files.readRange({ path: ${q(out)}, offset: ${offset}, length: 49152 });`);
          const bytes = Uint8Array.from(atob(part.base64), (ch) => ch.charCodeAt(0));
          text += decoder.decode(bytes, { stream: true });
          if (part.bytesRead < 49152) break;
        }
        for (const it of JSON.parse(text).items) all.push({ ...it, resourceId: s.resourceId });
      }
      await run("Remove the work folder", `await selects.files.remove(${q(work)}); return true;`, true).catch(() => {});
      setItems(all);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(null);
    }
  }

  const chosen = useMemo(() => (items ? resolve(items, on, cutLine / 100, lowerDb) : []), [items, on, cutLine, lowerDb]);
  const cuts = chosen.filter((i) => i.action === "delete");
  const cutSeconds = cuts.reduce((s, i) => s + i.frames / FPS, 0);
  const softened = chosen.filter((i) => i.softened).length;
  const copyName = `${info?.name || t.draft} (${t.copySuffix})`;

  async function apply() {
    setBusy("apply"); setError(null);
    try {
      const order = [...chosen].sort((a, b) => b.start - a.start).map(({ resourceId, start, end, frames, action, lowerDb }) => ({ resourceId, start, end, frames, action, lowerDb }));
      const total = { delete: 0, lower: 0, mute: 0, fades: 0, skipped: 0 };
      let target = null;
      for (let i = 0; i < order.length; i += BATCH) {
        const r = await run("Apply the cleanup", APPLY(projectId, sequenceId, target, copyName, order.slice(i, i + BATCH), fade), true);
        target = r.draftId;
        for (const k of Object.keys(total)) total[k] += r.done[k];
      }
      setResult({ name: copyName, done: total });
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(null);
    }
  }

  if (!projectId || !sequenceId) return <ui.Message>{t.noDraft}</ui.Message>;
  return (
    <ui.Stack>
      <ui.Section title={t.draft}>
        {busy === "read" && <ui.Progress />}
        {info && <p>{info.name ? `${info.name} · ` : ""}{t.clips(info.clips.length, span(sourceSeconds, ko))}{info.skipped ? ` · ${t.skippedSpeed(info.skipped)}` : ""}</p>}
        {blocked && <ui.Message tone="error">{blocked}</ui.Message>}
        {info && !blocked && !items && (
          <>
            <ui.Actions>
              <ui.Button variant="primary" busy={busy === "analyze"} busyLabel={t.analyzing} onClick={analyze}>{t.analyze}</ui.Button>
            </ui.Actions>
            {busy === "analyze" ? (
              <ui.Progress steps={["decode", "detect", "read"].map((k) => t.steps[k])} current={stage} />
            ) : (
              <p>{t.analyzeNote}</p>
            )}
          </>
        )}
      </ui.Section>

      {items && !result && (
        <ui.Section title={t.found}>
          {RULES.map((rule) => {
            const mine = chosen.filter((i) => i.rule === rule), every = items.filter((i) => i.rule === rule);
            if (every.length === 0) return null;
            const seconds = (on[rule] ? mine : every).reduce((s, i) => s + i.frames / FPS, 0);
            return (
              <ui.Stack key={rule}>
                <ui.Toggle label={t.rule[rule][0]} value={on[rule]} onChange={(v) => setOn({ ...on, [rule]: v })} />
                <p>{t.rule[rule][1]} · {t.count(every.length, span(seconds, ko))}</p>
                {on[rule] && (
                  <p>
                    {mine.slice(0, 8).map((i) => clock(i.start)).join("  ")}
                    {mine.length > 8 ? `  ${t.more(mine.length - 8)}` : ""}
                  </p>
                )}
                {rule === "blemish" && on.blemish && (
                  <>
                    <ui.Slider label={t.cutLine} unit="%" min={30} max={90} value={cutLine} onChange={setCutLine} />
                    {softened > 0 && <p>{t.cutLineNote(softened)}</p>}
                  </>
                )}
                {rule === "breath" && on.breath && <ui.Slider label={t.lowerBy} unit="dB" min={6} max={20} value={lowerDb} onChange={setLowerDb} />}
              </ui.Stack>
            );
          })}
          <ui.Toggle label={t.fade} value={fade} onChange={setFade} />
          <p>{t.fadeNote}</p>
          <ui.Actions>
            <ui.Button variant="primary" busy={busy === "apply"} busyLabel={t.applying} disabled={chosen.length === 0} onClick={apply}>{t.apply}</ui.Button>
          </ui.Actions>
          <p>{t.applyNote(cuts.length, chosen.length - cuts.length, span(cutSeconds, ko), copyName)}</p>
        </ui.Section>
      )}

      {result && (
        <ui.Section title={t.found}>
          <ui.Message>{t.done(result.name, result.done)}</ui.Message>
          <p>{t.listen}</p>
          <ui.Actions>
            <ui.Button variant="secondary" onClick={() => { setItems(null); setResult(null); }}>{t.again}</ui.Button>
          </ui.Actions>
        </ui.Section>
      )}
      {error && <ui.Message tone="error">{error}</ui.Message>}
    </ui.Stack>
  );
}
