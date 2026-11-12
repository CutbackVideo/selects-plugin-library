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
    title: "Talk Audio Cleanup",
    noDraft: "Open the Draft you want to clean.",
    draft: "Draft",
    duration: (s, n) => `${s} of talk${n === 1 ? "" : ` in ${n} clips`}`,
    skippedSpeed: (n) => `${n} left out (not at 1× speed)`,
    skippedSilent: (n) => `${n} source file${n === 1 ? "" : "s"} without sound left out`,
    unsupported: {
      fps: "This Draft is not 30 fps. The analysis works on 30 fps frames.",
      none: "No Main clip with its own source file was found in this Draft.",
      web: "The analysis runs a local program, so it needs the desktop app.",
    },
    intro: "Finds the small noises between words and fixes them on a copy. This Draft is not changed.",
    pick: "What to clean",
    pickOne: "Turn on at least one.",
    analyze: "Find what to clean",
    analyzeNote: "Runs on this computer, usually in under a minute. Nothing is uploaded and no credits are used.",
    firstRun: "First run: setting up the analysis program. This downloads Python and takes a few minutes, once.",
    steps: { prepare: "Prepare", decode: "Decode the audio", detect: "Find what to clean", read: "Read the result" },
    noModel: "The trained model is not installed. Put it at ~/.selects/plugin-data/talk-audio-cleanup/model.joblib (see INSTALL.md).",
    setupFailed: "Could not set up the analysis program. Check the internet connection, then try again.",
    previewFailed: "Could not load the sound of that place.",
    nothing: "Nothing to clean was found in this Draft.",
    partial: (name) => `It stopped partway: the copy “${name}” has only some of the edits. Delete it before trying again.`,
    kind: {
      blemish: ["Blemishes", "Clicks and mouth noises in a pause are cut out. The pause stays."],
      breath: ["Breaths", "The clip volume is lowered there. Nothing is cut."],
      sniff: ["Loud sniffs", "A loud, hissy breath is muted instead of lowered."],
      click: ["Ticks", "A one- or two-frame tick between words is muted in place."],
      opener: ["Lone “\uc790”", "An opening “\uc790” is cut when it stands apart from the words after it."],
    },
    places: (n) => `${n} place${n === 1 ? "" : "s"}`,
    shorter: (s) => `${s} shorter`,
    cutsVols: (c, v) => `${c} cut${c === 1 ? "" : "s"}, ${v} volume change${v === 1 ? "" : "s"}`,
    found: "What was found",
    copyName: "Copy name",
    suggest: (n) => `${n} more worth a look`,
    suggestNote: "Less certain, or a tick an editor might leave. Listen, then add the ones you want.",
    review: "Review",
    addAll: "Add all",
    removeAll: "Remove all",
    tag: "Suggested",
    filter: { all: "All", maybe: "Suggested", left: "Left as is" },
    show: "Show in timeline",
    add: "Clean this too",
    prev: (n) => `Previous ${n}`,
    next: (n) => `Next ${n}`,
    range: (a, b, n) => `${a}\u2013${b} of ${n}`,
    working: "Cleaning",
    empty: "Nothing here.",
    act: { delete: "Cut", lower: (db) => `−${db} dB`, mute: "Muted" },
    softened: "Not sure enough to cut, so the volume is changed instead.",
    original: "Original",
    cleaned: "Cleaned",
    stop: "Stop",
    exclude: "Leave this one",
    include: "Clean this one",
    excluded: "left as is",
    settings: "Fine-tune",
    cutLine: "Only cut when this sure",
    cutLineNote: (n) => `${n} less certain cut${n === 1 ? "" : "s"} become${n === 1 ? "s" : ""} a volume change, so the picture is not cut there.`,
    lowerBy: "Lower breaths by",
    fade: "One-frame fade after each cut",
    fadeNote: "So a cut does not tick.",
    apply: "Make a cleaned copy",
    applying: (a, b) => `Applying ${a} of ${b}`,
    doneTitle: "Cleaned copy saved",
    done: (d) => `${d.delete} cut, ${d.lower} lowered, ${d.mute} muted, ${d.fades} fades${d.skipped ? `, ${d.skipped} skipped` : ""}`,
    listen: "Check a few before you export. They were found by measuring, not by listening.",
    again: "Analyze again",
    copySuffix: "cleaned",
  },
  ko: {
    title: "\ud1a0\ud06c \uc624\ub514\uc624 \uc815\ub9ac",
    noDraft: "\uc815\ub9ac\ud560 Draft\ub97c \uc5f4\uc5b4 \uc8fc\uc138\uc694.",
    draft: "Draft",
    duration: (s, n) => `\ub9d0\uc18c\ub9ac ${s}${n === 1 ? "" : ` · \ud074\ub9bd ${n}\uac1c`}`,
    skippedSpeed: (n) => `1\ubc30\uc18d\uc774 \uc544\ub2cc ${n}\uac1c \uc81c\uc678`,
    skippedSilent: (n) => `\uc18c\ub9ac \uc5c6\ub294 \uc6d0\ubcf8 ${n}\uac1c \uc81c\uc678`,
    unsupported: {
      fps: "\uc774 Draft\ub294 30fps\uac00 \uc544\ub2d9\ub2c8\ub2e4. \ubd84\uc11d\uc740 30fps \ud504\ub808\uc784 \ub2e8\uc704\ub85c \ub3d9\uc791\ud569\ub2c8\ub2e4.",
      none: "\uc774 Draft\uc758 Main\uc5d0\uc11c \uc6d0\ubcf8 \ud30c\uc77c\uc774 \uc788\ub294 \ud074\ub9bd\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
      web: "\ubd84\uc11d\uc740 \uc774 \ucef4\ud4e8\ud130\uc758 \ud504\ub85c\uadf8\ub7a8\uc744 \uc2e4\ud589\ud558\ubbc0\ub85c \ub370\uc2a4\ud06c\ud1b1 \uc571\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    },
    intro: "\ub9d0 \uc0ac\uc774\uc758 \uc791\uc740 \uc7a1\uc18c\ub9ac\ub97c \ucc3e\uc544 \uc0ac\ubcf8\uc5d0\uc11c \uace0\uce69\ub2c8\ub2e4. \uc774 Draft\ub294 \ubc14\ub00c\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    pick: "\uc815\ub9ac\ud560 \uac83",
    pickOne: "\ud558\ub098 \uc774\uc0c1 \ucf1c \uc8fc\uc138\uc694.",
    analyze: "\uc815\ub9ac\ud560 \uacf3 \ucc3e\uae30",
    analyzeNote: "\uc774 \ucef4\ud4e8\ud130\uc5d0\uc11c \uc2e4\ud589\ub418\uace0 \ubcf4\ud1b5 1\ubd84 \uc548\uc5d0 \ub05d\ub0a9\ub2c8\ub2e4. \uc5c5\ub85c\ub4dc\ud558\uc9c0 \uc54a\uace0 \ud06c\ub808\ub527\ub3c4 \uc4f0\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    firstRun: "\ucc98\uc74c \ud55c \ubc88: \ubd84\uc11d \ud504\ub85c\uadf8\ub7a8\uc744 \uc900\ube44\ud569\ub2c8\ub2e4. Python\uc744 \ub0b4\ub824\ubc1b\ub290\ub77c \uba87 \ubd84 \uac78\ub9bd\ub2c8\ub2e4.",
    steps: { prepare: "\uc900\ube44", decode: "\uc624\ub514\uc624 \ud480\uae30", detect: "\uc815\ub9ac\ud560 \uacf3 \ucc3e\uae30", read: "\uacb0\uacfc \uc77d\uae30" },
    noModel: "\ud559\uc2b5\ub41c \ubaa8\ub378\uc774 \uc124\uce58\ub418\uc5b4 \uc788\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. ~/.selects/plugin-data/talk-audio-cleanup/model.joblib \uc5d0 \ub123\uc5b4 \uc8fc\uc138\uc694 (INSTALL.md \ucc38\uace0).",
    setupFailed: "\ubd84\uc11d \ud504\ub85c\uadf8\ub7a8\uc744 \uc900\ube44\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc778\ud130\ub137 \uc5f0\uacb0\uc744 \ud655\uc778\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    previewFailed: "\uadf8 \uc790\ub9ac\uc758 \uc18c\ub9ac\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    nothing: "\uc774 Draft\uc5d0\uc11c \uc815\ub9ac\ud560 \uacf3\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    partial: (name) => `\uc911\uac04\uc5d0 \uba48\ucdc4\uc2b5\ub2c8\ub2e4. “${name}” \uc0ac\ubcf8\uc5d0\ub294 \uc77c\ubd80\ub9cc \uc801\uc6a9\ub418\uc5b4 \uc788\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uae30 \uc804\uc5d0 \uc9c0\uc6cc \uc8fc\uc138\uc694.`,
    kind: {
      blemish: ["\uc7a1\ud2f0", "\ub9d0 \uc0ac\uc774\uc758 \ub538\uae4d·\uc785\uc18c\ub9ac\ub97c \uc798\ub77c\ub0c5\ub2c8\ub2e4. \uc26c\ub294 \ud2c8\uc740 \ub0a8\uae41\ub2c8\ub2e4."],
      breath: ["\uc228\uc18c\ub9ac", "\uadf8 \uc790\ub9ac\uc758 \ud074\ub9bd \uc74c\ub7c9\uc744 \ub0ae\ucda5\ub2c8\ub2e4. \uc790\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4."],
      sniff: ["\ud070 \ucf54\uba39\uc74c", "\ud06c\uace0 \uc26c\uc775\uac70\ub9ac\ub294 \uc228\uc18c\ub9ac\ub294 \ub0ae\ucd94\uc9c0 \uc54a\uace0 \uc74c\ub7c9 0\uc73c\ub85c \ud569\ub2c8\ub2e4."],
      click: ["\ub538\uae4d", "\ub9d0 \uc0ac\uc774 1~2\ud504\ub808\uc784 \ub538\uae4d\uc744 \uc81c\uc790\ub9ac\uc5d0\uc11c \uc74c\ub7c9 0\uc73c\ub85c \ud569\ub2c8\ub2e4."],
      opener: ["\ub530\ub85c \uc120 ‘\uc790’", "\uc2dc\uc791 ‘\uc790’\uac00 \ub4b7\ub9d0\uacfc \ub5a8\uc5b4\uc838 \uc788\uc73c\uba74 \uc790\ub985\ub2c8\ub2e4."],
    },
    places: (n) => `${n}\uacf3`,
    shorter: (s) => `${s} \uc9e7\uc544\uc9d0`,
    cutsVols: (c, v) => `\ucef7 ${c}\uacf3, \uc74c\ub7c9 \uc870\uc808 ${v}\uacf3`,
    found: "\ucc3e\uc740 \uacf3",
    copyName: "\uc0ac\ubcf8 \uc774\ub984",
    suggest: (n) => `\ucd94\ucc9c ${n}\uacf3`,
    suggestNote: "\ub35c \ud655\uc2e4\ud558\uac70\ub098, \ub0a8\uaca8\ub458 \uc218\ub3c4 \uc788\ub294 \ub538\uae4d\uc785\ub2c8\ub2e4. \ub4e4\uc5b4\ubcf4\uace0 \uace0\ub974\uc138\uc694.",
    review: "\uc0b4\ud3b4\ubcf4\uae30",
    addAll: "\ubaa8\ub450 \ud3ec\ud568",
    removeAll: "\ubaa8\ub450 \ube7c\uae30",
    tag: "\ucd94\ucc9c",
    filter: { all: "\uc804\uccb4", maybe: "\ucd94\ucc9c", left: "\uadf8\ub300\ub85c \ub460" },
    show: "\ud0c0\uc784\ub77c\uc778\uc5d0\uc11c \ubcf4\uae30",
    add: "\uc774 \uacf3\ub3c4 \uc815\ub9ac\ud558\uae30",
    prev: (n) => `\uc55e ${n}\uacf3`,
    next: (n) => `\ub2e4\uc74c ${n}\uacf3`,
    range: (a, b, n) => `${n}\uacf3 \uc911 ${a}\u2013${b}`,
    working: "\uc815\ub9ac\ud558\ub294 \uc911",
    empty: "\uc5ec\uae30\uc5d0\ub294 \uc5c6\uc2b5\ub2c8\ub2e4.",
    act: { delete: "\ucef7", lower: (db) => `−${db} dB`, mute: "\uc74c\ub7c9 0" },
    softened: "\uc790\ub97c \ub9cc\ud07c \ud655\uc2e4\ud558\uc9c0 \uc54a\uc544 \uc74c\ub7c9\ub9cc \uc870\uc808\ud569\ub2c8\ub2e4.",
    original: "\uc6d0\ubcf8",
    cleaned: "\uc815\ub9ac \ud6c4",
    stop: "\uba48\ucda4",
    exclude: "\uc774 \uacf3\uc740 \uadf8\ub300\ub85c \ub450\uae30",
    include: "\uc774 \uacf3\ub3c4 \uc815\ub9ac\ud558\uae30",
    excluded: "\uadf8\ub300\ub85c \ub460",
    settings: "\uc138\ubd80 \uc870\uc815",
    cutLine: "\uc774\ub9cc\ud07c \ud655\uc2e4\ud560 \ub54c\ub9cc \uc790\ub974\uae30",
    cutLineNote: (n) => `\ub35c \ud655\uc2e4\ud55c \ucef7 ${n}\uacf3\uc740 \uc790\ub974\uc9c0 \uc54a\uace0 \uc74c\ub7c9\ub9cc \uc870\uc808\ud569\ub2c8\ub2e4. \uadf8 \uc790\ub9ac\uc758 \ud654\uba74\uc740 \ub04a\uae30\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.`,
    lowerBy: "\uc228\uc18c\ub9ac\ub97c \ub0ae\ucd94\ub294 \uc591",
    fade: "\uc790\ub978 \uc790\ub9ac\ub9c8\ub2e4 1\ud504\ub808\uc784 Fade",
    fadeNote: "\uc790\ub978 \uc790\ub9ac\uc5d0\uc11c \ud2f1 \uc18c\ub9ac\uac00 \ub098\uc9c0 \uc54a\uac8c \ud569\ub2c8\ub2e4.",
    apply: "\uc815\ub9ac\ub41c \uc0ac\ubcf8 \ub9cc\ub4e4\uae30",
    applying: (a, b) => `\uc801\uc6a9 \uc911 ${a}/${b}`,
    doneTitle: "\uc815\ub9ac\ub41c \uc0ac\ubcf8\uc744 \uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4",
    done: (d) => `\ucef7 ${d.delete}, \uc74c\ub7c9 \ub0ae\ucda4 ${d.lower}, \uc74c\ub7c9 0 ${d.mute}, Fade ${d.fades}${d.skipped ? `, \uac74\ub108\ub700 ${d.skipped}` : ""}`,
    listen: "\ub0b4\ubcf4\ub0b4\uae30 \uc804\uc5d0 \uba87 \uacf3\uc744 \ud655\uc778\ud574 \ubcf4\uc138\uc694. \uce21\uc815\uc73c\ub85c \ucc3e\uc740 \uac83\uc774\uace0, \ub4e4\uc5b4\uc11c \ucc3e\uc740 \uac83\uc774 \uc544\ub2d9\ub2c8\ub2e4.",
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

// What the Panel plays for one place: the engine's short mono clip, and the same clip as it will sound after the edit.
const PREVIEW_RATE = 22050;
const PAGE = 40; // places listed at a time, so an hour of talk stays light
function decodePcm(parts) {
  const bytes = parts.flatMap((b64) => Array.from(atob(b64), (ch) => ch.charCodeAt(0)));
  const out = new Float32Array(bytes.length >> 1);
  for (let i = 0; i < out.length; i++) { const v = bytes[2 * i] | (bytes[2 * i + 1] << 8); out[i] = (v >= 32768 ? v - 65536 : v) / 32768; }
  return out;
}
function cleaned(pcm, lo, hi, action, lowerDb) {
  if (action === "delete") {
    const out = new Float32Array(pcm.length - (hi - lo));
    out.set(pcm.subarray(0, lo)); out.set(pcm.subarray(hi), lo);
    const fade = Math.min(Math.round(PREVIEW_RATE / FPS), out.length - lo); // the one-frame fade the copy gets after a cut
    for (let i = 0; i < fade; i++) out[lo + i] *= i / fade;
    return out;
  }
  const out = Float32Array.from(pcm), gain = action === "mute" ? 0 : Math.pow(10, -lowerDb / 20);
  for (let i = lo; i < hi; i++) out[i] *= gain;
  return out;
}
// Where each place sits in the cleaned copy: every cut before it moves it earlier.
function inCopy(rows) {
  let cut = 0;
  return [...rows].sort((a, b) => a.frame - b.frame).map((r) => { const row = { ...r, copyFrame: r.frame - cut }; if (r.action === "delete") cut += r.frames; return row; });
}
// The Draft frame where a place starts, through the clip that plays it.
function draftFrame(it, clips) {
  const c = clips.find((x) => x.resourceId === it.resourceId && it.start >= x.sourceStart - 1e-6 && it.start < x.sourceStart + x.frames / FPS);
  return c ? c.startFrame + Math.round((it.start - c.sourceStart) * FPS) : null;
}

// The waveform as an editor's timeline draws it: peaks rising from the bottom, on one scale for every place.
// The square root lifts the quiet parts enough to see a tick next to speech.
function wavePoints(shape, ref, from, to, h) {
  const pts = [];
  for (let i = from; i < to; i++) pts.push(`${i - from + 0.5},${(h - Math.sqrt(Math.min(1, shape[i] / ref)) * (h - 1)).toFixed(1)}`);
  return `0,${h} ${pts.join(" ")} ${to - from},${h}`;
}
// How many places of each kind fall in each slice of the Draft, for the overview.
function density(rows, total, bins) {
  const out = Array.from({ length: bins }, () => ({}));
  for (const r of rows) { const b = out[Math.min(bins - 1, Math.floor((r.at / total) * bins))]; b[r.rule] = (b[r.rule] || 0) + 1; }
  return out;
}

// The Panel's own parts, on the app's panel colours. Each kind has one colour, used for its switch, its marks and its rows.
const STYLE = `
.tac { --k-blemish: #b45309; --k-breath: #0369a1; --k-sniff: #6d28d9; --k-click: #be123c; --k-opener: #4d7c0f; color: var(--panel-fg); font-variant-numeric: tabular-nums; display: flex; flex-direction: column; gap: 12px; }
:root.dark .tac { --k-blemish: #f5a524; --k-breath: #56b6f7; --k-sniff: #a78bfa; --k-click: #fb7185; --k-opener: #a3e635; }
.tac p { margin: 0; }
.tac button { height: auto; min-height: 0; width: auto; margin: 0; line-height: inherit; flex: none; appearance: none; }
.tac .tac-kind, .tac .tac-row { border-radius: 0; }
.tac button:focus-visible, .tac-over:focus-visible { outline: 2px solid var(--panel-ring); outline-offset: -2px; }
.tac-sub { color: var(--panel-muted-fg); }
.tac-sub strong { color: var(--panel-fg); font-weight: 600; }
.tac-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--k); flex: none; }
.tac-kinds, .tac-list { display: flex; flex-direction: column; border: 1px solid var(--panel-border); border-radius: var(--panel-radius); overflow: hidden; }
.tac-kind { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 2px 10px; align-items: center; padding: 10px 12px; border: 0; border-top: 1px solid var(--panel-border); background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.tac-kind:first-child { border-top: 0; }
.tac-kind b { font-weight: 600; }
.tac-kind small { grid-column: 2; color: var(--panel-muted-fg); font-size: 12px; line-height: 1.45; }
.tac-kind[aria-checked="false"] b, .tac-kind[aria-checked="false"] small { opacity: .5; }
.tac-kind[aria-checked="false"] .tac-dot { background: var(--panel-muted-fg); opacity: .5; }
.tac-sw { width: 30px; height: 18px; border-radius: 9px; background: var(--panel-accent); position: relative; flex: none; transition: background .12s; }
.tac-sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--panel-fg); transition: transform .12s; }
[aria-checked="true"] > .tac-sw { background: var(--k); }
[aria-checked="true"] > .tac-sw::after { transform: translateX(12px); background: var(--panel-primary-fg); }
.tac-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.tac-big { font-size: 26px; line-height: 1.1; font-weight: 600; letter-spacing: -.01em; }
.tac-over { display: block; width: 100%; height: 34px; cursor: pointer; }
.tac-axis { display: flex; justify-content: space-between; color: var(--panel-muted-fg); font-size: 11px; margin-top: -6px; }
.tac-chips, .tac-btns { display: flex; flex-wrap: wrap; gap: 6px; }
.tac .tac-chip { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 9px; border-radius: 13px; border: 1px solid var(--panel-border); background: none; color: inherit; font: inherit; font-size: 12px; cursor: pointer; }
.tac-chip[aria-pressed="false"] { color: var(--panel-muted-fg); }
.tac-chip[aria-pressed="false"] .tac-dot { background: none; box-shadow: inset 0 0 0 1.5px var(--panel-muted-fg); }
.tac-chip i { font-style: normal; color: var(--panel-muted-fg); }
.tac-tip { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 10px; padding: 12px; border: 1px dashed var(--panel-ring); border-radius: var(--panel-radius); }
.tac-tip b { font-weight: 600; }
.tac-tip small { grid-column: 2; color: var(--panel-muted-fg); font-size: 12px; line-height: 1.45; }
.tac-tip .tac-btns { grid-column: 2; margin-top: 4px; }
.tac-tabs { display: flex; gap: 2px; padding: 2px; border-radius: var(--panel-button-radius); background: var(--panel-muted); }
.tac .tac-tab { flex: 1 1 0; height: 26px; padding: 0 6px; border: 0; border-radius: calc(var(--panel-button-radius) - 2px); background: none; color: var(--panel-muted-fg); font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap; }
.tac .tac-tab[aria-pressed="true"] { background: var(--panel-accent); color: var(--panel-fg); }
.tac .tac-row { display: grid; grid-template-columns: auto 50px minmax(0, 1fr) 52px; gap: 8px; align-items: center; min-height: var(--panel-row-height); padding: 4px 10px; border: 0; border-top: 1px solid var(--panel-border); background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.tac-row:first-child { border-top: 0; }
.tac-row:hover, .tac-row[aria-expanded="true"] { background: var(--panel-muted); }
.tac-row.off { color: var(--panel-muted-fg); }
.tac-row.off .tac-dot { background: none; box-shadow: inset 0 0 0 1.5px var(--panel-muted-fg); }
.tac-row.off .tac-time { text-decoration: line-through; }
.tac-row.maybe .tac-dot { background: none; box-shadow: inset 0 0 0 1.5px var(--k); }
.tac-what { color: var(--panel-muted-fg); font-size: 12px; white-space: nowrap; text-align: right; }
.tac-row.maybe .tac-what { color: var(--panel-fg); }
.tac-wave { display: block; width: 100%; height: 22px; }
.tac-detail { display: flex; flex-direction: column; gap: 8px; padding: 10px; background: var(--panel-muted); border-top: 1px solid var(--panel-border); }
.tac-detail .tac-wave { height: 64px; }
.tac .tac-btn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: var(--panel-button-radius); border: 1px solid var(--panel-border); background: var(--panel-accent); color: var(--panel-fg); font: inherit; font-size: 12px; cursor: pointer; }
.tac .tac-btn:disabled { opacity: .4; cursor: default; }
.tac .tac-btn.quiet { background: none; color: var(--panel-muted-fg); }
.tac .tac-btn[aria-pressed="true"] { background: var(--panel-fg); color: var(--panel-primary-fg); border-color: transparent; }
.tac-tri { width: 0; height: 0; border-left: 7px solid currentColor; border-top: 4.5px solid transparent; border-bottom: 4.5px solid transparent; }
.tac-sq { width: 8px; height: 8px; background: currentColor; }
.tac-note { color: var(--panel-muted-fg); font-size: 12px; line-height: 1.5; }
.tac-pager { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--panel-muted-fg); font-size: 12px; }
.tac-stage { display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid var(--panel-border); border-radius: var(--panel-radius); background: var(--panel-muted); }
.tac-cut { display: flex; align-items: flex-end; height: 72px; overflow: hidden; }
.tac-cut svg { display: block; height: 100%; width: 100%; }
.tac-cut > div { height: 100%; min-width: 0; }
.tac-cut .band { background: color-mix(in srgb, var(--k) 35%, transparent); transform-origin: bottom; }
.tac-cut .band.delete { animation: tac-close .14s .03s ease-in forwards; }
.tac-cut .band.lower { animation: tac-lower .14s .03s ease-out forwards; }
.tac-cut .band.mute { animation: tac-mute .14s .03s ease-out forwards; }
@keyframes tac-close { to { width: 0; } }
@keyframes tac-lower { to { transform: scaleY(.3); } }
@keyframes tac-mute { to { transform: scaleY(.03); } }
.tac-tally { display: flex; flex-wrap: wrap; gap: 4px 14px; color: var(--panel-muted-fg); font-size: 12px; }
.tac-tally b { color: var(--panel-fg); font-weight: 600; }
@media (prefers-reduced-motion: reduce) { .tac-sw, .tac-sw::after { transition: none; } .tac-cut .band { animation-duration: 1ms; animation-delay: 0s; } }
`;

export default function Panel({ sdk, context, ui }) {
  const ko = context.language === "ko";
  const t = ko ? STRINGS.ko : STRINGS.en;
  const [info, setInfo] = useState(null);
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null); // null | "read" | "analyze" | "apply"
  const [stage0, setStage] = useState(0); // which step of the analysis is running
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { name, done, rows } once the copy is saved
  const [on, setOn] = useState({ blemish: true, breath: true, sniff: true, click: true, opener: true });
  const [left, setLeft] = useState(() => new Set()); // places the user chose to leave as they are
  const [added, setAdded] = useState(() => new Set()); // suggestions the user chose to clean too
  const [filter, setFilter] = useState("all"); // "all" | "maybe" | "left"
  const [first, setFirst] = useState(0); // the list shows PAGE places from here
  const [name, setName] = useState(null); // the copy's name, once the user typed one
  const [show, setShow] = useState(null); // while the copy is made: which place is on the stage
  const order = useRef([]), cap = useRef(0);
  const [cutLine, setCutLine] = useState(30);
  const [lowerDb, setLowerDb] = useState(11);
  const [fade, setFade] = useState(true);
  const [silent, setSilent] = useState(0);
  const [firstRun, setFirstRun] = useState(false);
  const [picked, setPicked] = useState(null); // the place whose detail is open
  const [tune, setTune] = useState(false);
  const [progress, setProgress] = useState(null); // { at, of } while the copy is being made
  const [playing, setPlaying] = useState(null); // { id, mode }
  const token = useRef(0); // bumped when the Draft changes or the panel closes; a run that sees another value stops
  const workRef = useRef(null); // the folder that holds the preview clips of the last analysis
  const sound = useRef({ ctx: null, src: null, clips: new Map() });
  const { projectId, sequenceId } = context;

  const run = async (summary, script, allowCommit = false) => {
    const r = await sdk.runScript({ summary, script, allowCommit });
    if (r.isError) throw Error(r.output || summary);
    return r.result;
  };
  const dropWork = () => {
    const work = workRef.current;
    workRef.current = null; sound.current.clips.clear();
    if (work) run("Remove the work folder", `await selects.files.remove(${q(work)}, { recursive: true, force: true }); return true;`, true).catch(() => {});
  };
  const hush = () => {
    const s = sound.current;
    if (s.src) { s.src.onended = null; try { s.src.stop(); } catch {} s.src = null; }
    setPlaying(null);
  };

  const applying = useRef(false), shown = useRef(sequenceId);
  shown.current = sequenceId;
  useEffect(() => {
    if (applying.current) return; // the host opens the copy while it is being made; that is the same job, not a new Draft to start over on
    const mine = ++token.current, live = () => mine === token.current;
    hush(); dropWork();
    setInfo(null); setItems(null); setResult(null); setError(null); setBusy(null); setPicked(null); setLeft(new Set()); setAdded(new Set()); setFilter("all"); setFirst(0); setName(null);
    if (!projectId || !sequenceId) return;
    setBusy("read");
    run("Read the Draft's Main clips", READ(projectId, sequenceId))
      .then((r) => live() && setInfo(r))
      .catch((e) => live() && setError(String(e.message || e)))
      .finally(() => live() && setBusy(null));
    return () => { if (!applying.current) token.current++; };
  }, [projectId, sequenceId]);
  useEffect(() => () => { hush(); dropWork(); }, []);

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
    hush(); dropWork();
    setBusy("analyze"); setError(null); setItems(null); setResult(null); setStage(0); setSilent(0); setPicked(null); setLeft(new Set()); setAdded(new Set()); setFilter("all"); setFirst(0); setName(null);
    let work = null, kept = false;
    try {
      await ensureRuntime();
      if (!live()) return;
      work = `${info.env.tempDirectory.replace(/[\\/]$/, "")}/${ID}-${Date.now()}`;
      await run("Make a work folder", `await selects.files.mkdir(${q(work)}); return true;`, true);
      const all = [], noSound = new Set();
      let n = 0;
      for (const s of segments(info.clips)) {
        n++;
        const wav = `${work}/in-${n}.wav`, out = `${work}/edl-${n}.json`, clips = `${work}/clips-${n}.pcm`;
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
          command: `${PY} "${PKG}/engine/analyze.py" --wav ${shellQuote(wav)} --model "${DATA}/model.joblib" --out ${shellQuote(out)} --source-start ${s.t0} --openers ${shellQuote(JSON.stringify(lone))} --previews ${shellQuote(clips)}`,
          cwd: work,
          timeoutMs: 300000,
        });
        if (sh.isError || sh.exitCode !== 0) throw Error(sh.stderr || sh.output || "analysis failed");
        await run("Remove the decoded audio", `await selects.files.remove(${q(wav)}, { force: true }); return true;`, true).catch(() => {});
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
          const item = { ...it, resourceId: s.resourceId, clips };
          if (inClips(item, info.clips)) all.push(item);
        }
      }
      if (!live()) return;
      workRef.current = work; kept = true; // the preview clips stay until the next analysis or until the panel closes
      setSilent(noSound.size);
      setItems(all);
    } catch (e) {
      if (live()) setError(String(e.message || e));
    } finally {
      if (work && !kept) await run("Remove the work folder", `await selects.files.remove(${q(work)}, { recursive: true, force: true }); return true;`, true).catch(() => {});
      if (live()) setBusy(null);
    }
  }

  // Every place of the kinds that are on, as it will be treated, with where it sits in the Draft.
  // What the model is sure of is cleaned unless the user leaves it; a suggestion is cleaned only when the user adds it.
  const rows = useMemo(() => {
    if (!items || !info) return [];
    const sure = resolve(items.filter((i) => i.tier !== "maybe"), on, cutLine / 100, lowerDb);
    const maybe = items.filter((i) => i.tier === "maybe" && on[i.rule]).map((i) => ({ ...i, lowerDb: i.action === "lower" ? lowerDb : null, softened: false }));
    return [...sure, ...maybe]
      .map((it) => ({ ...it, id: `${it.resourceId}:${it.start}`, frame: draftFrame(it, info.clips) }))
      .filter((r) => r.frame != null)
      .sort((a, b) => a.frame - b.frame);
  }, [items, info, on, cutLine, lowerDb]);
  const isOn = (r) => (r.tier === "maybe" ? added.has(r.id) : !left.has(r.id));
  const chosen = useMemo(() => rows.filter(isOn), [rows, left, added]);
  const hints = rows.filter((r) => r.tier === "maybe");
  const cuts = chosen.filter((i) => i.action === "delete");
  const cutSeconds = cuts.reduce((s, i) => s + i.frames / FPS, 0);
  const softened = chosen.filter((i) => i.softened).length;
  const copyName = name ?? `${info?.name || t.draft} (${t.copySuffix})`;
  const anyOn = RULES.some((k) => on[k]);
  // One scale for every waveform, set by the loud speech around the places.
  const ref = useMemo(() => {
    const peaks = (items || []).map((i) => Math.max(...i.shape)).sort((a, b) => a - b);
    return Math.max(20, peaks[Math.floor(peaks.length * 0.9)] || 20);
  }, [items]);

  // Put the playhead half a second before a place, in the Draft it belongs to (the copy once it is saved).
  function jump(row) {
    const frame = Math.max(0, (result ? row.copyFrame : row.frame) - 15);
    run("Jump to the place", `await selects.editor.seekDraftFrame({ projectId: ${q(projectId)}, draftSequenceId: ${q(result ? shown.current : sequenceId)}, resolvedFrame: ${frame} }); return true;`).catch(() => {});
  }
  function pick(row) {
    if (picked === row.id) { hush(); setPicked(null); return; }
    setPicked(row.id);
    listen(row, "before"); // picking a place plays it; the timeline moves only when asked
  }

  // Play one place: as it is, or as it will sound once cleaned.
  async function listen(row, mode) {
    const s = sound.current, same = playing && playing.id === row.id && playing.mode === mode;
    hush();
    if (same) return;
    setPlaying({ id: row.id, mode });
    try {
      let pcm = s.clips.get(row.id);
      if (!pcm) {
        const [at, n] = row.snip, end = at + n * 2;
        const parts = await run("Read the sound of one place", `const out = []; for (let o = ${at}; o < ${end}; o += 49152) out.push((await selects.files.readRange({ path: ${q(row.clips)}, offset: o, length: Math.min(49152, ${end} - o) })).base64); return out;`);
        pcm = decodePcm(parts); s.clips.set(row.id, pcm);
      }
      const data = mode === "after" ? cleaned(pcm, row.snip[2], row.snip[3], row.action, row.lowerDb) : pcm;
      s.ctx = s.ctx || new AudioContext();
      if (s.ctx.state === "suspended") await s.ctx.resume();
      const buffer = s.ctx.createBuffer(1, data.length, PREVIEW_RATE);
      buffer.copyToChannel(data, 0);
      const src = s.ctx.createBufferSource();
      src.buffer = buffer; src.connect(s.ctx.destination);
      src.onended = () => { if (s.src === src) { s.src = null; setPlaying(null); } };
      s.src = src; src.start();
    } catch (e) {
      setPlaying(null); setError(t.previewFailed);
    }
  }

  async function apply() {
    const mine = token.current, live = () => mine === token.current;
    hush();
    setBusy("apply"); setError(null); setPicked(null); applying.current = true;
    const todo = chosen;
    let target = null, at = 0;
    setProgress({ at: 0, of: todo.length });
    // The stage shows the places going one by one, in the order they are really applied, never ahead of the work.
    order.current = [...todo].sort((a, b) => b.start - a.start); cap.current = Math.min(order.current.length, BATCH);
    setShow(0);
    const tick = setInterval(() => setShow((i) => (i == null ? i : Math.min(i + 1, cap.current - 1))), 140);
    try {
      const total = { delete: 0, lower: 0, mute: 0, fades: 0, skipped: 0 };
      for (const batch of batches(todo)) {
        if (!live()) return;
        const r = await run("Apply the cleanup", APPLY(projectId, sequenceId, target, copyName, batch, fade), true);
        target = r.draftId;
        for (const k of Object.keys(total)) total[k] += r.done[k];
        at += batch.length; cap.current = Math.min(order.current.length, at + BATCH);
        if (live()) { setProgress({ at, of: todo.length }); setShow((i) => (i == null ? i : Math.max(i, at - 8))); }
      }
      if (live()) { setResult({ name: copyName, done: total, rows: inCopy(todo) }); setFirst(0); setFilter("all"); }
    } catch (e) {
      if (live()) setError(`${target ? `${t.partial(copyName)} ` : ""}${String(e.message || e)}`);
    } finally {
      clearInterval(tick);
      applying.current = false;
      if (live()) { setBusy(null); setProgress(null); setShow(null); }
      // The Draft on screen is now the copy: show its clips, keep the result.
      if (live() && shown.current && shown.current !== sequenceId) run("Read the Draft's Main clips", READ(projectId, shown.current)).then((r) => live() && setInfo(r)).catch(() => {});
    }
  }

  if (!projectId || !sequenceId) return <ui.Message>{t.noDraft}</ui.Message>;

  const kindStyle = (k) => ({ "--k": `var(--k-${k})` });
  const what = (r) => (r.action === "delete" ? t.act.delete : r.action === "mute" ? t.act.mute : t.act.lower(r.lowerDb));
  const at = (r) => (result ? r.copyFrame : r.frame);
  const base = result ? result.rows : rows;
  const list = result || filter === "all" ? base : filter === "maybe" ? base.filter((r) => r.tier === "maybe") : base.filter((r) => r.tier !== "maybe" && left.has(r.id));
  const total = Math.max(1, ...base.map((r) => at(r) + r.frames), info ? Math.max(0, ...info.clips.map((c) => c.startFrame + c.frames)) : 1);
  const page = list.slice(first, first + PAGE);

  // The waveform around one place, as a timeline draws it, with the stretch that changes in the kind's colour.
  const wave = (r) => {
    const n = r.shape.length, h = 24, a = (r.snip[2] / r.snip[1]) * n, b = (r.snip[3] / r.snip[1]) * n;
    return (
      <svg className="tac-wave" viewBox={`0 0 ${n} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <rect x={a} y="0" width={Math.max(1, b - a)} height={h} fill="var(--k)" opacity={!result && !isOn(r) ? 0.14 : 0.38} />
        <polygon points={wavePoints(r.shape, ref, 0, n, h)} fill="var(--panel-fg)" opacity={!result && !isOn(r) ? 0.4 : 0.78} />
      </svg>
    );
  };

  // Where the places are, as how many fall in each slice of the Draft. Pressing a slice brings the list there.
  const BINS = 48, bins = density(base.map((r) => ({ at: at(r), rule: r.rule })), total, BINS), most = Math.max(1, ...bins.map((b) => Object.values(b).reduce((x, y) => x + y, 0)));
  const span0 = page.length ? at(page[0]) / total : 0, span1 = page.length ? (at(page[page.length - 1]) + page[page.length - 1].frames) / total : 0;
  const overview = (
    <>
      <svg className="tac-over" viewBox={`0 0 ${BINS} 34`} preserveAspectRatio="none" role="img" aria-label={t.found} tabIndex={0}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect(), f = ((e.clientX - box.left) / box.width) * total;
          const i = list.findIndex((r) => at(r) + r.frames >= f);
          hush(); setPicked(null); setFirst(Math.max(0, Math.min(i < 0 ? list.length - 1 : i, Math.max(0, list.length - PAGE))));
        }}>
        <rect x={span0 * BINS} y="0" width={Math.max(0.6, (span1 - span0) * BINS)} height="34" fill="var(--panel-accent)" rx="0.4" />
        {bins.map((b, i) => {
          let y = 32;
          return RULES.filter((k) => b[k]).map((k) => { const hgt = (b[k] / most) * 28; y -= hgt; return <rect key={`${i}${k}`} x={i + 0.12} y={y} width="0.76" height={hgt} fill={`var(--k-${k})`} />; });
        })}
        <rect x="0" y="32" width={BINS} height="0.6" fill="var(--panel-border)" />
      </svg>
      <div className="tac-axis"><span>0:00</span><span>{clock(total / FPS / 2).slice(0, -2)}</span><span>{clock(total / FPS).slice(0, -2)}</span></div>
    </>
  );

  const places = (
    <>
      <div className="tac-list">
        {page.length === 0 && <p className="tac-note" style={{ padding: 12 }}>{t.empty}</p>}
        {page.map((r) => {
          const maybe = !result && r.tier === "maybe", active = result || isOn(r), open = picked === r.id;
          return (
            <React.Fragment key={r.id}>
              <button type="button" className={`tac-row${maybe && !active ? " maybe" : !active ? " off" : ""}`} style={kindStyle(r.rule)} aria-expanded={open} onClick={() => pick(r)}>
                <span className="tac-dot" />
                <span className="tac-time">{clock(at(r) / FPS)}</span>
                {wave(r)}
                <span className="tac-what">{maybe && !active ? t.tag : !active ? t.excluded : what(r)}</span>
              </button>
              {open && (
                <div className="tac-detail" style={kindStyle(r.rule)}>
                  {wave(r)}
                  <p className="tac-note"><strong style={{ color: "var(--panel-fg)" }}>{t.kind[r.rule][0]}</strong> · {what(r)} · {span(r.frames / FPS, ko)}{r.softened ? ` · ${t.softened}` : ""}</p>
                  <div className="tac-btns">
                    {["before", "after"].map((mode) => {
                      const live = playing && playing.id === r.id && playing.mode === mode;
                      return (
                        <button key={mode} type="button" className="tac-btn" aria-pressed={!!live} onClick={() => listen(r, mode)}>
                          <span className={live ? "tac-sq" : "tac-tri"} />{mode === "before" ? t.original : t.cleaned}
                        </button>
                      );
                    })}
                    <button type="button" className="tac-btn quiet" onClick={() => jump(r)}>{t.show}</button>
                    {!result && (
                      <button type="button" className={`tac-btn${maybe && !active ? "" : " quiet"}`} onClick={() => {
                        const set = new Set(maybe ? added : left);
                        if (set.has(r.id)) set.delete(r.id); else set.add(r.id);
                        (maybe ? setAdded : setLeft)(set);
                      }}>
                        {maybe ? (active ? t.exclude : t.add) : active ? t.exclude : t.include}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {list.length > PAGE && (
        <div className="tac-pager">
          <button type="button" className="tac-btn quiet" disabled={first === 0} onClick={() => { hush(); setPicked(null); setFirst(Math.max(0, first - PAGE)); }}>{t.prev(Math.min(PAGE, first))}</button>
          <span>{t.range(first + 1, Math.min(list.length, first + PAGE), list.length)}</span>
          <button type="button" className="tac-btn quiet" disabled={first + PAGE >= list.length} onClick={() => { hush(); setPicked(null); setFirst(first + PAGE); }}>{t.next(Math.min(PAGE, list.length - first - PAGE))}</button>
        </div>
      )}
    </>
  );

  // While the copy is made: the place being cleaned, its stretch closing up, dropping or going flat.
  const now = show != null ? order.current[show] : null;
  const stage = now && (() => {
    const n = now.shape.length, a = Math.round((now.snip[2] / now.snip[1]) * n), b = Math.max(a + 1, Math.round((now.snip[3] / now.snip[1]) * n)), h = 72;
    const part = (from, to, cls) => (
      <div className={cls} style={{ width: `${((to - from) / n) * 100}%`, flex: "none" }}>
        <svg viewBox={`0 0 ${to - from} ${h}`} preserveAspectRatio="none" aria-hidden="true"><polygon points={wavePoints(now.shape, ref, from, to, h)} fill="var(--panel-fg)" opacity="0.8" /></svg>
      </div>
    );
    const sofar = order.current.slice(0, show + 1);
    return (
      <div className="tac-stage" style={kindStyle(now.rule)}>
        <div className="tac-head"><span className="tac-big">{show + 1}</span><span className="tac-sub">/ {order.current.length} · {t.working}</span></div>
        <div className="tac-cut" key={now.id}>{part(0, a, "")}{part(a, b, `band ${now.action}`)}{part(b, n, "")}</div>
        <p className="tac-note"><span className="tac-dot" style={{ display: "inline-block", marginRight: 6 }} /><strong style={{ color: "var(--panel-fg)" }}>{clock(now.frame / FPS)}</strong> · {t.kind[now.rule][0]} · {what(now)}</p>
        <div className="tac-tally">
          <span><b>{sofar.filter((r) => r.action === "delete").length}</b> {t.act.delete}</span>
          <span><b>{sofar.filter((r) => r.action === "lower").length}</b> {t.act.lower(lowerDb)}</span>
          <span><b>{sofar.filter((r) => r.action === "mute").length}</b> {t.act.mute}</span>
        </div>
      </div>
    );
  })();

  return (
    <ui.Stack gap={16}>
      <style>{STYLE}</style>
      <ui.Section title={t.title}>
        <div className="tac">
          {busy === "read" && <ui.Skeleton width="60%" />}
          {info && <p className="tac-sub"><strong>{info.name || t.draft}</strong> · {t.duration(span(sourceSeconds, ko), info.clips.length)}{info.skipped ? ` · ${t.skippedSpeed(info.skipped)}` : ""}</p>}
          {blocked && <ui.Message tone="error">{blocked}</ui.Message>}
          {info && !blocked && !items && busy !== "analyze" && <p>{t.intro}</p>}
          {busy === "analyze" && firstRun && <ui.Message tone="muted">{t.firstRun}</ui.Message>}
          {busy === "analyze" && <ui.Progress steps={["prepare", "decode", "detect", "read"].map((k) => t.steps[k])} current={stage0} />}
        </div>
      </ui.Section>

      {info && !blocked && !items && busy !== "analyze" && (
        <ui.Section title={t.pick}>
          <div className="tac">
            <div className="tac-kinds">
              {RULES.map((k) => (
                <button key={k} type="button" role="switch" aria-checked={on[k]} className="tac-kind" style={kindStyle(k)} onClick={() => setOn({ ...on, [k]: !on[k] })}>
                  <span className="tac-dot" /><b>{t.kind[k][0]}</b><span className="tac-sw" />
                  <small>{t.kind[k][1]}</small>
                </button>
              ))}
            </div>
            {!anyOn && <p className="tac-note">{t.pickOne}</p>}
          </div>
          <ui.Actions>
            <ui.Button variant="primary" disabled={!anyOn} onClick={analyze}>{t.analyze}</ui.Button>
          </ui.Actions>
          <ui.Message tone="muted">{t.analyzeNote}</ui.Message>
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

      {items && items.length > 0 && !result && busy === "apply" && (
        <ui.Section title={t.working}>
          <div className="tac">{stage}</div>
          {progress && <ui.Progress value={progress.of ? progress.at / progress.of : 0} />}
        </ui.Section>
      )}

      {items && items.length > 0 && !result && busy !== "apply" && (
        <>
          <ui.Section title={t.found}>
            <div className="tac">
              <div className="tac-head">
                <span className="tac-big">{t.places(chosen.length)}</span>
                <span className="tac-sub">{t.shorter(span(cutSeconds, ko))} · {t.cutsVols(cuts.length, chosen.length - cuts.length)}</span>
              </div>
              <div className="tac-chips">
                {RULES.filter((k) => items.some((i) => i.rule === k && i.tier !== "maybe")).map((k) => (
                  <button key={k} type="button" className="tac-chip" style={kindStyle(k)} aria-pressed={on[k]} onClick={() => { setOn({ ...on, [k]: !on[k] }); setFirst(0); }}>
                    <span className="tac-dot" />{t.kind[k][0]}<i>{items.filter((i) => i.rule === k && i.tier !== "maybe").length}</i>
                  </button>
                ))}
              </div>
              {hints.length > 0 && (
                <div className="tac-tip">
                  <ui.Icon name="sparkles" size={16} /><b>{t.suggest(hints.length)}</b>
                  <small>{t.suggestNote}</small>
                  <div className="tac-btns">
                    <button type="button" className="tac-btn" onClick={() => { hush(); setPicked(null); setFilter("maybe"); setFirst(0); }}>{t.review}</button>
                    <button type="button" className="tac-btn quiet" onClick={() => setAdded(hints.every((r) => added.has(r.id)) ? new Set() : new Set(hints.map((r) => r.id)))}>
                      {hints.every((r) => added.has(r.id)) ? t.removeAll : t.addAll}
                    </button>
                  </div>
                </div>
              )}
              {silent > 0 && <p className="tac-note">{t.skippedSilent(silent)}</p>}
            </div>
            <ui.TextField label={t.copyName} value={copyName} onChange={setName} />
            <ui.Actions>
              <ui.Button variant="primary" disabled={chosen.length === 0 || !copyName.trim()} onClick={apply}>{t.apply}</ui.Button>
            </ui.Actions>
          </ui.Section>

          <ui.Section title={t.places(base.length)} actions={<ui.IconButton icon="settings" label={t.settings} onClick={() => setTune(!tune)} />}>
            {tune && (
              <>
                <ui.Slider label={t.cutLine} unit="%" min={30} max={90} value={cutLine} onChange={setCutLine} />
                {softened > 0 && <p className="tac-note">{t.cutLineNote(softened)}</p>}
                <ui.Slider label={t.lowerBy} unit="dB" min={6} max={20} value={lowerDb} onChange={setLowerDb} />
                <ui.Toggle label={t.fade} value={fade} onChange={setFade} />
              </>
            )}
            <div className="tac">
              {overview}
              <div className="tac-tabs">
                {["all", "maybe", "left"].map((f) => (
                  <button key={f} type="button" className="tac-tab" aria-pressed={filter === f} onClick={() => { hush(); setPicked(null); setFilter(f); setFirst(0); }}>
                    {t.filter[f]} {f === "all" ? base.length : f === "maybe" ? hints.length : base.filter((r) => r.tier !== "maybe" && left.has(r.id)).length}
                  </button>
                ))}
              </div>
              {places}
            </div>
          </ui.Section>
        </>
      )}

      {result && (
        <>
          <ui.Section title={t.doneTitle}>
            <div className="tac">
              <div className="tac-head">
                <span className="tac-big">{t.places(result.rows.length)}</span>
                <span className="tac-sub">{t.done(result.done)}</span>
              </div>
            </div>
            <ui.Message tone="muted">{t.listen}</ui.Message>
            <ui.Actions>
              <ui.Button variant="secondary" onClick={() => { hush(); setItems(null); setResult(null); setPicked(null); }}>{t.again}</ui.Button>
            </ui.Actions>
          </ui.Section>
          <ui.Section title={result.name}>
            <div className="tac">{overview}{places}</div>
          </ui.Section>
        </>
      )}
      {error && <ui.Message tone="error">{error}</ui.Message>}
    </ui.Stack>
  );
}
