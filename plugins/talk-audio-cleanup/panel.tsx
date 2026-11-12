// @name Talk Audio Cleanup
// @name:ko 토크 오디오 정리
// @icon audio
// Cleans the sound of a talking Draft the way a broadcast editing guide asks for:
// cuts clicks out of the pauses, lowers breaths, mutes loud sniffs and one-frame ticks
// between words, and puts a one-frame fade on every cut. It works on a copy of the
// open Draft; the original is left as it is.

import React, { useEffect, useMemo, useRef, useState } from "react";

const ID = "talk-audio-cleanup";
const FPS = 30; // the analysis works on 30 fps frames; other Drafts are refused
const BATCH = 30; // edits per script run, so one run stays well inside the script budget
const RULES = ["blemish", "breath", "sniff", "click", "opener"];

const STRINGS = {
  en: {
    noDraft: "Open the Draft you want to clean.",
    reading: "Reading the Draft…",
    draft: "Draft",
    title: "Clean up talk audio",
    intro: "Finds the small noises between words and fixes them on a copy of this Draft. Your Draft is not changed.",
    looksFor: "What it looks for",
    clips: (n, s) => `${s} of talk${n === 1 ? "" : ` in ${n} clips`}`,
    skippedSpeed: (n) => `${n} left out (not at 1× speed)`,
    skippedSilent: (n) => `${n} source file${n === 1 ? "" : "s"} without sound left out`,
    unsupported: {
      fps: "This Draft is not 30 fps. The analysis works on 30 fps frames.",
      none: "No Main clip with its own source file was found in this Draft.",
      web: "The analysis runs a local program, so it needs the desktop app.",
    },
    analyze: "Find what to clean",
    analyzing: "Analyzing…",
    analyzeNote: "Runs on this computer, usually in under a minute. Nothing is uploaded and no credits are used.",
    firstRun: "First run: setting up the analysis program. This downloads Python and takes a few minutes, once.",
    steps: { prepare: "Prepare", decode: "Decode the audio", detect: "Find what to clean", read: "Read the result" },
    noModel: "The trained model is not installed. Put it at ~/.selects/plugin-data/talk-audio-cleanup/model.joblib (see INSTALL.md).",
    setupFailed: "Could not set up the analysis program. Check the internet connection, then try again.",
    nothing: "Nothing to clean was found in this Draft.",
    partial: (name) => `It stopped partway: the copy “${name}” has only some of the edits. Delete it before trying again.`,
    found: "What was found",
    summary: (n, c, v, s) => `${n} place${n === 1 ? "" : "s"} to clean: ${c} cut${c === 1 ? "" : "s"} (${s} shorter) and ${v} volume change${v === 1 ? "" : "s"}.`,
    jumpHint: "Click a time to jump there in the timeline and listen.",
    showAll: (n) => `Show all ${n}`,
    showFewer: "Show fewer",
    options: "Options",
    include: "Include",
    doneTitle: "Cleaned copy saved",
    rule: {
      blemish: ["Cut blemishes", "Clicks and mouth noises in a pause are cut out. The pause stays."],
      breath: ["Lower breaths", "The clip volume is brought down there. Nothing is cut."],
      sniff: ["Mute loud sniffs", "A breath that is loud and hissy is muted instead of lowered."],
      click: ["Mute ticks", "A one- or two-frame tick between words is muted in place, so the picture is not cut."],
      opener: ["Cut lone \u201c\uc790\u201d", "An opening \u201c\uc790\u201d is cut only when it stands apart from the words after it."],
    },
    count: (n, s) => `${n} place${n === 1 ? "" : "s"}, ${s}`,
    cutLine: "Cut confidence",
    cutLineNote: (n) => `${n} less certain cut${n === 1 ? "" : "s"} become${n === 1 ? "s" : ""} a volume change instead, so the picture is not cut there.`,
    lowerBy: "Lower breaths by",
    fade: "One-frame fade after each cut",
    fadeNote: "So a cut does not tick",
    apply: "Make a cleaned copy",
    applying: "Applying…",
    applyNote: (name) => `The copy will be a new Draft named “${name}”.`,
    done: (n, d) => `Saved “${n}”: ${d.delete} cut, ${d.lower} lowered, ${d.mute} muted, ${d.fades} fades${d.skipped ? `, ${d.skipped} skipped` : ""}.`,
    listen: "Play a few of them before you export. They were found by measuring, not by listening.",
    again: "Analyze again",
    copySuffix: "cleaned",
  },
  ko: {
    noDraft: "\uc815\ub9ac\ud560 Draft\ub97c \uc5f4\uc5b4 \uc8fc\uc138\uc694.",
    reading: "Draft\ub97c \uc77d\ub294 \uc911…",
    draft: "Draft",
    title: "\ub9d0\uc18c\ub9ac \uc815\ub9ac",
    intro: "\ub9d0 \uc0ac\uc774\uc758 \uc791\uc740 \uc7a1\uc18c\ub9ac\ub97c \ucc3e\uc544 \uc774 Draft\uc758 \uc0ac\ubcf8\uc5d0\uc11c \uace0\uce69\ub2c8\ub2e4. \uc6d0\ub798 Draft\ub294 \ubc14\ub00c\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    looksFor: "\ucc3e\ub294 \uac83",
    clips: (n, s) => `\ub9d0\uc18c\ub9ac ${s}${n === 1 ? "" : ` (\ud074\ub9bd ${n}\uac1c)`}`,
    skippedSpeed: (n) => `1\ubc30\uc18d\uc774 \uc544\ub2cc ${n}\uac1c \uc81c\uc678`,
    skippedSilent: (n) => `\uc18c\ub9ac \uc5c6\ub294 \uc6d0\ubcf8 ${n}\uac1c \uc81c\uc678`,
    unsupported: {
      fps: "\uc774 Draft\ub294 30fps\uac00 \uc544\ub2d9\ub2c8\ub2e4. \ubd84\uc11d\uc740 30fps \ud504\ub808\uc784 \ub2e8\uc704\ub85c \ub3d9\uc791\ud569\ub2c8\ub2e4.",
      none: "\uc774 Draft\uc758 Main\uc5d0\uc11c \uc6d0\ubcf8 \ud30c\uc77c\uc774 \uc788\ub294 \ud074\ub9bd\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
      web: "\ubd84\uc11d\uc740 \uc774 \ucef4\ud4e8\ud130\uc758 \ud504\ub85c\uadf8\ub7a8\uc744 \uc2e4\ud589\ud558\ubbc0\ub85c \ub370\uc2a4\ud06c\ud1b1 \uc571\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    },
    analyze: "\uc815\ub9ac\ud560 \uacf3 \ucc3e\uae30",
    analyzing: "\ubd84\uc11d \uc911…",
    analyzeNote: "\uc774 \ucef4\ud4e8\ud130\uc5d0\uc11c \uc2e4\ud589\ub418\uace0 \ubcf4\ud1b5 1\ubd84 \uc548\uc5d0 \ub05d\ub0a9\ub2c8\ub2e4. \uc5c5\ub85c\ub4dc\ud558\uc9c0 \uc54a\uace0 \ud06c\ub808\ub527\ub3c4 \uc4f0\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    firstRun: "\ucc98\uc74c \ud55c \ubc88: \ubd84\uc11d \ud504\ub85c\uadf8\ub7a8\uc744 \uc900\ube44\ud569\ub2c8\ub2e4. Python\uc744 \ub0b4\ub824\ubc1b\ub290\ub77c \uba87 \ubd84 \uac78\ub9bd\ub2c8\ub2e4.",
    steps: { prepare: "\uc900\ube44", decode: "\uc624\ub514\uc624 \ud480\uae30", detect: "\uc815\ub9ac\ud560 \uacf3 \ucc3e\uae30", read: "\uacb0\uacfc \uc77d\uae30" },
    noModel: "\ud559\uc2b5\ub41c \ubaa8\ub378\uc774 \uc124\uce58\ub418\uc5b4 \uc788\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. ~/.selects/plugin-data/talk-audio-cleanup/model.joblib \uc5d0 \ub123\uc5b4 \uc8fc\uc138\uc694 (INSTALL.md \ucc38\uace0).",
    setupFailed: "\ubd84\uc11d \ud504\ub85c\uadf8\ub7a8\uc744 \uc900\ube44\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc778\ud130\ub137 \uc5f0\uacb0\uc744 \ud655\uc778\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    nothing: "\uc774 Draft\uc5d0\uc11c \uc815\ub9ac\ud560 \uacf3\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    partial: (name) => `\uc911\uac04\uc5d0 \uba48\ucdc4\uc2b5\ub2c8\ub2e4. “${name}” \uc0ac\ubcf8\uc5d0\ub294 \uc77c\ubd80\ub9cc \uc801\uc6a9\ub418\uc5b4 \uc788\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uae30 \uc804\uc5d0 \uc9c0\uc6cc \uc8fc\uc138\uc694.`,
    found: "\ucc3e\uc740 \uac83",
    summary: (n, c, v, s) => `\uc815\ub9ac\ud560 \uacf3 ${n}\uacf3: \ucef7 ${c}\uacf3(${s} \uc9e7\uc544\uc9d0), \uc74c\ub7c9 \uc870\uc808 ${v}\uacf3.`,
    jumpHint: "\uc2dc\uac01\uc744 \ub204\ub974\uba74 \ud0c0\uc784\ub77c\uc778\uc758 \uadf8 \uc790\ub9ac\ub85c \uc774\ub3d9\ud569\ub2c8\ub2e4. \ub4e4\uc5b4 \ubcf4\uc138\uc694.",
    showAll: (n) => `${n}\uacf3 \ubaa8\ub450 \ubcf4\uae30`,
    showFewer: "\uc811\uae30",
    options: "\uc635\uc158",
    include: "\uc801\uc6a9",
    doneTitle: "\uc815\ub9ac\ub41c \uc0ac\ubcf8\uc744 \uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4",
    rule: {
      blemish: ["\uc7a1\ud2f0 \uc798\ub77c\ub0b4\uae30", "\ub9d0 \uc0ac\uc774\uc758 \ub538\uae4d·\uc785\uc18c\ub9ac\ub97c \uc798\ub77c\ub0c5\ub2c8\ub2e4. \uc26c\ub294 \ud2c8\uc740 \ub0a8\uae41\ub2c8\ub2e4."],
      breath: ["\uc228\uc18c\ub9ac \ub0ae\ucd94\uae30", "\uadf8 \uc790\ub9ac\uc758 \ud074\ub9bd \uc74c\ub7c9\uc744 \ub0b4\ub9bd\ub2c8\ub2e4. \uc790\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4."],
      sniff: ["\ud070 \ucf54\uba39\uc74c \uc74c\ub7c9 0", "\ud06c\uace0 \uc26c\uc775\uac70\ub9ac\ub294 \uc228\uc18c\ub9ac\ub294 \ub0ae\ucd94\uc9c0 \uc54a\uace0 0\uc73c\ub85c \ud569\ub2c8\ub2e4."],
      click: ["\ub538\uae4d \uc74c\ub7c9 0", "\ub9d0 \uc0ac\uc774 1~2\ud504\ub808\uc784 \ub538\uae4d\uc740 \uc81c\uc790\ub9ac\uc5d0\uc11c \uc74c\ub7c9 0\uc73c\ub85c \ud569\ub2c8\ub2e4. \ud654\uba74\uc740 \uc790\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4."],
      opener: ["\ub530\ub85c \uc120 ‘\uc790’ \uc0ad\uc81c", "\uc2dc\uc791 ‘\uc790’\uac00 \ub4b7\ub9d0\uacfc \ub5a8\uc5b4\uc838 \uc788\uc744 \ub54c\ub9cc \uc790\ub985\ub2c8\ub2e4."],
    },
    count: (n, s) => `${n}\uacf3, ${s}`,
    cutLine: "\uc790\ub974\uae30 \ud655\uc2e0\ub3c4",
    cutLineNote: (n) => `\ub35c \ud655\uc2e4\ud55c \ucef7 ${n}\uacf3\uc740 \uc790\ub974\uc9c0 \uc54a\uace0 \uc74c\ub7c9\ub9cc \uc870\uc808\ud569\ub2c8\ub2e4. \uadf8 \uc790\ub9ac\uc758 \ud654\uba74\uc740 \ub04a\uae30\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.`,
    lowerBy: "\uc228\uc18c\ub9ac\ub97c \ub0ae\ucd94\ub294 \uc591",
    fade: "\uc790\ub978 \uc790\ub9ac\ub9c8\ub2e4 1\ud504\ub808\uc784 Fade",
    fadeNote: "\uc790\ub978 \uc790\ub9ac\uc5d0\uc11c \ud2f1 \uc18c\ub9ac\uac00 \ub098\uc9c0 \uc54a\uac8c",
    apply: "\uc815\ub9ac\ub41c \uc0ac\ubcf8 \ub9cc\ub4e4\uae30",
    applying: "\uc801\uc6a9 \uc911…",
    applyNote: (name) => `“${name}”\uc774\ub77c\ub294 \uc0c8 Draft\ub85c \uc800\uc7a5\ub429\ub2c8\ub2e4.`,
    done: (n, d) => `“${n}” \uc800\uc7a5\ub428: \ucef7 ${d.delete}, \uc74c\ub7c9 \ub0ae\ucda4 ${d.lower}, \uc74c\ub7c9 0 ${d.mute}, Fade ${d.fades}${d.skipped ? `, \uac74\ub108\ub700 ${d.skipped}` : ""}.`,
    listen: "\ub0b4\ubcf4\ub0b4\uae30 \uc804\uc5d0 \uba87 \uacf3\uc744 \uc9c1\uc811 \ub4e4\uc5b4 \ubcf4\uc138\uc694. \uce21\uc815\uc73c\ub85c \ucc3e\uc740 \uac83\uc774\uace0, \ub4e4\uc5b4\uc11c \ucc3e\uc740 \uac83\uc774 \uc544\ub2d9\ub2c8\ub2e4.",
    again: "\ub2e4\uc2dc \ubd84\uc11d",
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
  clips.push({ resourceId: r.resourceId, path: f.path, sourceStart: r.sourceStartSeconds, startFrame: r.startFrame, frames: r.endFrame - r.startFrame });
}
// A lone opening word: where it, the next word and the previous one sit in the source (seconds), read through the clip that plays them.
const openers = [];
const ws = (await d.words().catch(() => [])).filter((w) => !w.nonSpeech && (w.text ?? "").trim()); // pauses are rows too; neighbours here are spoken words
const at = (frame) => { const c = clips.find((x) => frame >= x.startFrame && frame < x.startFrame + x.frames); return c ? { c, t: c.sourceStart + (frame - c.startFrame) / meta.fps } : null; };
ws.forEach((w, i) => {
  if (!/^\\uc790[.,!?~]*$/.test(w.text.trim())) return;
  const me = at(w.startFrame), nx = ws[i + 1] && at(ws[i + 1].startFrame), pv = ws[i - 1] && at(ws[i - 1].endFrame - 1);
  if (!me || nx?.c !== me.c) return;
  openers.push({ resourceId: me.c.resourceId, start: me.t, next: nx.t, prevEnd: pv?.c === me.c ? pv.t + 1 / meta.fps : me.t - 1 });
});
return { fps: meta.fps, name: meta.name ?? null, clips, skipped, openers, env: await selects.files.environment() };`;

// The stretches of source audio to analyze: each source's clips, joined when they sit within 10 s of each
// other, so a Draft that uses two far-apart parts of a long recording does not decode what lies between.
// ponytail: joined clips share the first clip's frame grid; a clip cut on another grid lands within half a frame.
function segments(clips) {
  const out = [];
  const sorted = [...clips].sort((a, b) => (a.resourceId === b.resourceId ? a.sourceStart - b.sourceStart : a.resourceId < b.resourceId ? -1 : 1));
  for (const c of sorted) {
    const to = c.sourceStart + c.frames / FPS, last = out[out.length - 1];
    if (last && last.resourceId === c.resourceId && c.sourceStart - last.to <= 10) last.to = Math.max(last.to, to);
    else out.push({ resourceId: c.resourceId, path: c.path, from: c.sourceStart, to });
  }
  // Start on the clip's own frame grid, up to 5 s early, so the noise floor is settled where the clip begins.
  return out.map((s) => ({ ...s, t0: s.from - Math.min(150, Math.floor(s.from * FPS)) / FPS }));
}
// Only what lies wholly inside a clip the Draft plays can be applied (the lead-in and gaps between clips cannot).
const inClips = (it, clips) => clips.some((c) => c.resourceId === it.resourceId && it.start >= c.sourceStart - 1e-6 && it.end <= c.sourceStart + c.frames / FPS + 1e-6);
// Latest first, so a cut never moves an item that is still to be placed; BATCH items per script run.
function batches(chosen) {
  const order = [...chosen].sort((a, b) => b.start - a.start).map(({ resourceId, start, end, frames, action, lowerDb }) => ({ resourceId, start, end, frames, action, lowerDb }));
  return Array.from({ length: Math.ceil(order.length / BATCH) }, (_, i) => order.slice(i * BATCH, (i + 1) * BATCH));
}

// Applies one batch. Each item is placed from the Draft's rows as they are at that moment, by source time,
// so an earlier cut never shifts a later item onto the wrong frames.
const APPLY = (projectId, sourceDraftId, targetDraftId, name, batch, fade) => `
const ITEMS = ${q(batch)}, FPS = ${FPS}, FADE = ${q(fade)};
const d = ${targetDraftId ? `selects.draft(${q(targetDraftId)})` : `await selects.project(${q(projectId)}).duplicateDraft({ sourceDraftId: ${q(sourceDraftId)}, name: ${q(name)} })`};
const main = async () => (await d.clips()).filter((r) => r.trackKind === "main");
const done = { delete: 0, lower: 0, mute: 0, fades: 0, skipped: 0 };
for (const it of ITEMS) {
  const row = (await main()).find((r) => r.resourceId === it.resourceId && r.sourceStartSeconds != null &&
    (!r.playbackSpeed || r.playbackSpeed.numerator === r.playbackSpeed.denominator) &&
    it.start >= r.sourceStartSeconds - 1e-6 && it.end <= r.sourceStartSeconds + (r.endFrame - r.startFrame) / FPS + 1e-6);
  if (!row) { done.skipped++; continue; }
  const a = Math.max(row.startFrame, row.startFrame + Math.round((it.start - row.sourceStartSeconds) * FPS)), b = Math.min(row.endFrame, a + it.frames);
  if (b <= a) { done.skipped++; continue; }
  if (it.action === "delete") {
    await d.remove(await d.rangeAtFrames(a, b), { tracks: "main" }); done.delete++;
    const next = FADE ? (await main()).find((r) => r.startFrame === a) : null;
    if (next) { await d.setClipAudio({ clip: next, fadeInSeconds: 1 / FPS }); done.fades++; }
    continue;
  }
  for (const frame of [a, b]) if (!(await main()).some((r) => r.startFrame === frame || r.endFrame === frame)) await d.splitAt({ frame });
  const piece = (await main()).find((r) => r.startFrame === a && r.endFrame === b);
  if (!piece) { done.skipped++; continue; }
  const now = await d.clipAudio(piece);
  if (now.volumeDb == null) { done.skipped++; continue; }                       // a keyed volume line is left alone
  await d.setClipAudio({ clip: piece, volumeDb: it.action === "mute" ? -60 : Math.max(-60, now.volumeDb - it.lowerDb) });
  done[it.action]++;
}
const saved = await d.commitAll("Talk audio cleanup");
return { done, draftId: ${targetDraftId ? q(targetDraftId) : "saved.createdDraftId"} };`;

// The analysis program's own Python, made on first use in the plugin's data folder: a virtual environment with
// engine/requirements.txt, built on the pinned CPython that runtime.sh fetches (a stock Mac has no Python).
const DATA = "$HOME/.selects/plugin-data/talk-audio-cleanup", PKG = "$SELECTS_USER_SKILLS_ROOT/talk-audio-cleanup";
const PY = `"${DATA}/venv/bin/python"`, IMPORTS = `-c "import numpy, scipy, sklearn, joblib"`;
const RUNTIME_CHECK = `if [ ! -s "${DATA}/model.joblib" ]; then echo nomodel; elif ${PY} ${IMPORTS} 2>/dev/null; then echo ready; else echo missing; fi`;
const shellQuote = (v) => "'" + String(v).replace(/'/g, "'\\''") + "'";
const runtimeSetup = (python) => `set -e; mkdir -p "${DATA}"; ${shellQuote(python)} -m venv --clear "${DATA}/venv"; ${PY} -m pip install --quiet --disable-pip-version-check -r "${PKG}/engine/requirements.txt"; ${PY} ${IMPORTS}`;

export default function Panel({ sdk, context, ui }) {
  const ko = context.language === "ko";
  const t = ko ? STRINGS.ko : STRINGS.en;
  const [info, setInfo] = useState(null);
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null); // null | "read" | "analyze" | "apply"
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [on, setOn] = useState({ blemish: true, breath: true, sniff: true, click: true, opener: true });
  const [cutLine, setCutLine] = useState(30);
  const [lowerDb, setLowerDb] = useState(11);
  const [fade, setFade] = useState(true);
  const [silent, setSilent] = useState(0);
  const [firstRun, setFirstRun] = useState(false);
  const [open, setOpen] = useState({}); // which kinds show every place
  const token = useRef(0); // bumped when the Draft changes or the panel closes; a run that sees another value stops
  const { projectId, sequenceId } = context;

  const run = async (summary, script, allowCommit = false) => {
    const r = await sdk.runScript({ summary, script, allowCommit });
    if (r.isError) throw Error(r.output || summary);
    return r.result;
  };

  const applying = useRef(false), shown = useRef(sequenceId);
  shown.current = sequenceId;
  useEffect(() => {
    if (applying.current) return; // the host opens the copy while it is being made; that is the same job, not a new Draft to start over on
    const mine = ++token.current, live = () => mine === token.current;
    setInfo(null); setItems(null); setResult(null); setError(null); setBusy(null);
    if (!projectId || !sequenceId) return;
    setBusy("read");
    run("Read the Draft's Main clips", READ(projectId, sequenceId))
      .then((r) => live() && setInfo(r))
      .catch((e) => live() && setError(String(e.message || e)))
      .finally(() => live() && setBusy(null));
    return () => { if (!applying.current) token.current++; };
  }, [projectId, sequenceId]);

  const blocked = !info ? null : context.platform === "web" ? t.unsupported.web : Math.abs(info.fps - FPS) > 1e-6 ? t.unsupported.fps : info.clips.length === 0 ? t.unsupported.none : null;
  const sourceSeconds = info ? info.clips.reduce((s, c) => s + c.frames / FPS, 0) : 0;

  async function ensureRuntime() {
    const check = await sdk.runShell({ summary: "Check the analysis program", command: RUNTIME_CHECK, timeoutMs: 60000 });
    const state = String(check.stdout || "").trim().split("\n").pop();
    if (state === "ready") return;
    if (state === "nomodel") throw Error(t.noModel);
    setFirstRun(true);
    const py = await sdk.runShell({ summary: "Prepare Python (first run only)", command: `sh "${PKG}/runtime.sh" python`, timeoutMs: 290000 });
    const python = String(py.stdout || "").trim().split("\n").filter(Boolean).pop();
    if (py.isError || py.exitCode !== 0 || !/^\//.test(python || "")) throw Error(t.setupFailed);
    const setup = await sdk.runShell({ summary: "Set up the analysis program", command: runtimeSetup(python), timeoutMs: 290000 });
    if (setup.isError || setup.exitCode !== 0) throw Error(t.setupFailed);
    setFirstRun(false);
  }

  async function analyze() {
    const mine = token.current, live = () => mine === token.current;
    setBusy("analyze"); setError(null); setItems(null); setResult(null); setStage(0); setSilent(0);
    let work = null;
    try {
      await ensureRuntime();
      if (!live()) return;
      work = `${info.env.tempDirectory.replace(/[\\/]$/, "")}/${ID}-${Date.now()}`;
      await run("Make a work folder", `await selects.files.mkdir(${q(work)}); return true;`, true);
      const all = [], noSound = new Set();
      let n = 0;
      for (const s of segments(info.clips)) {
        n++;
        const wav = `${work}/in-${n}.wav`, out = `${work}/edl-${n}.json`;
        setStage(1);
        const peek = await run("Read where the picture starts in the file", `const m = await selects.media.measureAudioPeaks({ path: ${q(s.path)}, startSeconds: 0, endSeconds: 1 }); return { status: m.status, videoStartSeconds: m.videoStartSeconds };`);
        if (peek?.status === "absent") { noSound.add(s.resourceId); continue; }
        const videoStart = peek?.videoStartSeconds ?? 0; // source clock = file time minus this
        // first_pts=0 fills the stretch before a late-starting audio stream with silence, so WAV sample 0 is t0
        const job = await run("Decode the audio", `return await selects.media.startFFmpeg({ args: ${q(["-nostdin", "-v", "error", "-y", "-ss", String(s.t0 + videoStart), "-t", String(s.to - s.t0 + 5), "-i", s.path, "-vn", "-af", "aresample=async=1:first_pts=0", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", wav])} });`, true);
        for (;;) {
          if (!live()) { await run("Stop the decode", `await selects.media.job(${q(job.jobId)}).cancel(); return true;`, true).catch(() => {}); return; }
          const st = await run("Wait for the decode", `return (await selects.media.job(${q(job.jobId)}).status({ cursor: 0 })).state;`);
          if (st === "succeeded") break;
          if (st !== "running") throw Error(`ffmpeg ${st}`);
          await new Promise((r) => setTimeout(r, 700));
        }
        setStage(2);
        const lone = (info.openers ?? []).filter((o) => o.resourceId === s.resourceId && o.start >= s.t0 && o.next <= s.to).map((o) => [o.start, o.next, o.prevEnd]);
        const sh = await sdk.runShell({
          summary: "Find what to clean",
          command: `${PY} "${PKG}/engine/analyze.py" --wav ${shellQuote(wav)} --model "${DATA}/model.joblib" --out ${shellQuote(out)} --source-start ${s.t0} --openers ${shellQuote(JSON.stringify(lone))}`,
          cwd: work,
          timeoutMs: 300000,
        });
        if (sh.isError || sh.exitCode !== 0) throw Error(sh.stderr || sh.output || "analysis failed");
        if (!live()) return;
        setStage(3);
        let text = "";
        const decoder = new TextDecoder();
        for (let offset = 0; ; offset += 49152) {
          const part = await run("Read the result", `return await selects.files.readRange({ path: ${q(out)}, offset: ${offset}, length: 49152 });`);
          const bytes = Uint8Array.from(atob(part.base64), (ch) => ch.charCodeAt(0));
          text += decoder.decode(bytes, { stream: true });
          if (part.bytesRead < 49152) break;
        }
        for (const it of JSON.parse(text).items) {
          const item = { ...it, resourceId: s.resourceId };
          if (inClips(item, info.clips)) all.push(item);
        }
      }
      if (!live()) return;
      setSilent(noSound.size);
      setItems(all);
    } catch (e) {
      if (live()) setError(String(e.message || e));
    } finally {
      if (work) await run("Remove the work folder", `await selects.files.remove(${q(work)}, { recursive: true, force: true }); return true;`, true).catch(() => {});
      if (live()) setBusy(null);
    }
  }

  const chosen = useMemo(() => (items ? resolve(items, on, cutLine / 100, lowerDb) : []), [items, on, cutLine, lowerDb]);
  const cuts = chosen.filter((i) => i.action === "delete");
  const cutSeconds = cuts.reduce((s, i) => s + i.frames / FPS, 0);
  const softened = chosen.filter((i) => i.softened).length;
  const copyName = `${info?.name || t.draft} (${t.copySuffix})`;

  // Put the playhead half a second before a found place, so pressing play lets you hear it.
  function jump(it) {
    const c = info.clips.find((x) => x.resourceId === it.resourceId && it.start >= x.sourceStart - 1e-6 && it.start < x.sourceStart + x.frames / FPS);
    if (!c) return;
    const frame = Math.max(c.startFrame, c.startFrame + Math.round((it.start - c.sourceStart) * FPS) - 15);
    run("Jump to the place", `await selects.editor.seekDraftFrame({ projectId: ${q(projectId)}, draftSequenceId: ${q(sequenceId)}, resolvedFrame: ${frame} }); return true;`).catch(() => {});
  }

  async function apply() {
    const mine = token.current, live = () => mine === token.current;
    setBusy("apply"); setError(null); applying.current = true;
    let target = null;
    try {
      const total = { delete: 0, lower: 0, mute: 0, fades: 0, skipped: 0 };
      for (const batch of batches(chosen)) {
        if (!live()) return;
        const r = await run("Apply the cleanup", APPLY(projectId, sequenceId, target, copyName, batch, fade), true);
        target = r.draftId;
        for (const k of Object.keys(total)) total[k] += r.done[k];
      }
      if (live()) setResult({ name: copyName, done: total });
    } catch (e) {
      if (live()) setError(`${target ? `${t.partial(copyName)} ` : ""}${String(e.message || e)}`);
    } finally {
      applying.current = false;
      if (live()) setBusy(null);
      // The Draft on screen is now the copy: show its clips, keep the result message.
      if (live() && shown.current && shown.current !== sequenceId) run("Read the Draft's Main clips", READ(projectId, shown.current)).then((r) => live() && setInfo(r)).catch(() => {});
    }
  }

  if (!projectId || !sequenceId) return <ui.Message>{t.noDraft}</ui.Message>;
  const applyButton = <ui.Button variant="primary" busy={busy === "apply"} busyLabel={t.applying} disabled={chosen.length === 0} onClick={apply}>{t.apply}</ui.Button>;
  return (
    <ui.Stack gap={16}>
      <ui.Section title={t.title}>
        {busy === "read" && <ui.Skeleton width="60%" />}
        {info && <p><strong>{info.name || t.draft}</strong> · {t.clips(info.clips.length, span(sourceSeconds, ko))}{info.skipped ? ` · ${t.skippedSpeed(info.skipped)}` : ""}</p>}
        {blocked && <ui.Message tone="error">{blocked}</ui.Message>}
        {info && !blocked && !items && busy !== "analyze" && (
          <>
            <p>{t.intro}</p>
            <ui.Actions>
              <ui.Button variant="primary" onClick={analyze}>{t.analyze}</ui.Button>
            </ui.Actions>
            <ui.Message tone="muted">{t.analyzeNote}</ui.Message>
          </>
        )}
        {busy === "analyze" && firstRun && <ui.Message tone="muted">{t.firstRun}</ui.Message>}
        {busy === "analyze" && <ui.Progress steps={["prepare", "decode", "detect", "read"].map((k) => t.steps[k])} current={stage} />}
      </ui.Section>

      {info && !blocked && !items && busy !== "analyze" && (
        <ui.Section title={t.looksFor}>
          {RULES.map((rule) => <p key={rule}><strong>{t.rule[rule][0]}</strong><br />{t.rule[rule][1]}</p>)}
        </ui.Section>
      )}

      {items && items.length === 0 && (
        <ui.Section title={t.found}>
          <ui.Message>{t.nothing}</ui.Message>
          {silent > 0 && <p>{t.skippedSilent(silent)}</p>}
          <ui.Actions>
            <ui.Button variant="secondary" onClick={() => setItems(null)}>{t.again}</ui.Button>
          </ui.Actions>
        </ui.Section>
      )}

      {items && items.length > 0 && !result && (
        <>
          <ui.Section title={t.found}>
            <p><strong>{t.summary(chosen.length, cuts.length, chosen.length - cuts.length, span(cutSeconds, ko))}</strong></p>
            <p>{t.applyNote(copyName)}</p>
            {silent > 0 && <p>{t.skippedSilent(silent)}</p>}
            <ui.Actions>{applyButton}</ui.Actions>
            <ui.Message tone="muted">{t.jumpHint}</ui.Message>
          </ui.Section>
          {RULES.map((rule) => {
            const mine = chosen.filter((i) => i.rule === rule), every = items.filter((i) => i.rule === rule);
            if (every.length === 0) return null;
            const seconds = (on[rule] ? mine : every).reduce((s, i) => s + i.frames / FPS, 0);
            const list = open[rule] ? mine : mine.slice(0, 6);
            return (
              <ui.Section key={rule} title={`${t.rule[rule][0]} · ${on[rule] ? mine.length : every.length}`}>
                <ui.Toggle label={t.include} value={on[rule]} onChange={(v) => setOn({ ...on, [rule]: v })} />
                <p>{t.rule[rule][1]}<br />{t.count(on[rule] ? mine.length : every.length, span(seconds, ko))}</p>
                {on[rule] && mine.length > 0 && (
                  <ui.Row gap={4}>
                    {list.map((i) => <ui.Button key={`${i.resourceId}:${i.start}`} variant="ghost" onClick={() => jump(i)}>{clock(i.start)}</ui.Button>)}
                    {mine.length > 6 && <ui.Button variant="ghost" onClick={() => setOpen({ ...open, [rule]: !open[rule] })}>{open[rule] ? t.showFewer : t.showAll(mine.length)}</ui.Button>}
                  </ui.Row>
                )}
                {rule === "blemish" && on.blemish && (
                  <>
                    <ui.Slider label={t.cutLine} unit="%" min={30} max={90} value={cutLine} onChange={setCutLine} />
                    {softened > 0 && <p>{t.cutLineNote(softened)}</p>}
                  </>
                )}
                {rule === "breath" && on.breath && <ui.Slider label={t.lowerBy} unit="dB" min={6} max={20} value={lowerDb} onChange={setLowerDb} />}
              </ui.Section>
            );
          })}
          <ui.Section title={t.options}>
            <ui.Toggle label={t.fade} value={fade} onChange={setFade} />
            <p>{t.fadeNote}</p>
            <ui.Actions>
              <ui.Button variant="secondary" onClick={() => setItems(null)}>{t.again}</ui.Button>
              {applyButton}
            </ui.Actions>
          </ui.Section>
        </>
      )}

      {result && (
        <ui.Section title={t.doneTitle}>
          <ui.Message tone="success">{t.done(result.name, result.done)}</ui.Message>
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
