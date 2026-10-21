// @name Edit preparation
// @name:ko 편집 준비
// @icon list
import React, {useEffect, useRef, useState} from "react";
// The built-in Edit preparation steps' own words, so the panel reads the same.
const STRINGS = {"en": {"description": "Choose a shoot folder, then run the steps in order from step 1.", "folder": "Shoot folder", "chooseFolder": "Choose a shoot folder", "chooseHint": "Choose a shoot folder at the top of the project, such as 0819.", "alreadyOrganized": "{{name}} is already organized.", "noProject": "Open a project to choose a shoot folder.", "noFolders": "Import a shoot folder to the top of the project to get started.", "sourceCount_one": "{{count}} source file", "sourceCount_other": "{{count}} source files", "run": "Run", "cancel": "Cancel", "analyze": {"title": "Analyze", "description": "Analyzes the selected shoot folder's media. Files already analyzed are skipped.", "progress": "{{count}} of {{total}} analyzed", "analyzing": "Analyzing\u2026"}, "organize": {"title": "Organize folders", "description": "Organizes the selected shoot's sources into 01. camera and 02. audio and gives each source its own color.", "action": "Organize folders", "failed": "Could not organize the shoot. Check the notification."}, "classify": {"title": "Classify Main and Insert", "description": "Watch each camera video of the shoot and set it to Main or Insert, then make the Main and Insert synced timelines. Each video starts with its class in the built timelines, else the rule's. Run again, it asks first and makes the timelines over the built ones.", "action": "Classify Main and Insert", "needsOrganize": "Run step 2 first: {{name}} is not organized yet.", "needsAnalysis": "Run step 1 first: every file in this shoot needs analysis.", "overwrite": {"title": "Overwrite the {{name}} timelines?", "description": "{{names}} will be made again. The sync and grouping done on them will be lost.", "confirm": "Overwrite"}}, "syncGroups": {"title": "Sync", "description": "Sorts the chosen Main synced timeline's clips by recording time, then lines them up by audio and speech."}, "removeGaps": {"title": "Remove empty ranges", "description": "Removes only the ranges empty on every track. Sync stays as it is."}, "groupSyncRunning": "Syncing\u2026", "groupSyncStop": "Stop", "unsynced": {"needsReview": "Needs review", "notSynced": "Not synced", "review": "Review", "resolved": "Resolved"}, "status": {"organized": "Folders organized", "notOrganized": "Folders not organized yet", "timelines": "Timelines: {{names}}", "noTimelines": "No timelines yet", "notTranslated": "Not translated", "stored": "Translated \u00b7 {{count}} lines", "done": "Translation complete {{completedCount}}/{{totalCount}}", "stopped": "Stopped \u00b7 {{completedCount}}/{{totalCount}} translated", "running": "Translating {{completedCount}}/{{totalCount}}\u2026", "starting": "Translating\u2026"}, "timeline": {"main": "Choose a Main synced timeline", "none": {"main": "No Main synced timeline is selected."}}, "draft": {"title": "Draft", "description": "Makes a draft from one of the selected shoot's synced timelines, then translates its captions into Korean and exports them.", "choose": "Choose a synced timeline", "none": "This shoot has no synced timeline yet. Make them in step 3.", "needsDraft": "Make the draft first.", "make": "1. Make draft", "makeDescription": "Makes a draft named like the chosen synced timeline in its shoot folder under 03. main (Main) or 04. insert (Insert). Run again, it asks first and makes the draft over the earlier one.", "translate": "2. Translate", "translateDescription": "Translates every caption of the draft into Korean. The original transcript stays.", "translating": "Translating\u2026", "translateProgress": "Translating {{completedCount}}/{{totalCount}}\u2026", "export": "3. Export captions", "exportDescription": "Saves the draft's transcript as a text file with its translation, chapters and subchapters.", "exported": "Transcript exported.", "exportEmpty": "This draft has no transcript to export.", "exportFailed": "Could not export the transcript. Please try again.", "making": "Making the draft\u2026", "exporting": "Exporting\u2026", "noCaptions": "{{name}} has no captions to translate.", "translateFailed": "Could not translate the captions. Please try again.", "overwrite": {"title": "Overwrite the {{name}} draft?", "description": "The draft will be made again from the synced timeline as it is now.", "confirm": "Overwrite"}}, "summary": "Edit preparation", "needsUpdate": "Update Selects to run this step."}, "ko": {"description": "\ucd2c\uc601 \ud3f4\ub354\ub97c \uc120\ud0dd\ud55c \ud6c4 1\ub2e8\uacc4\ubd80\ud130 \uc21c\uc11c\ub300\ub85c \uc2e4\ud589\ud558\uc138\uc694.", "folder": "\ucd2c\uc601 \ud3f4\ub354", "chooseFolder": "\ucd2c\uc601 \ud3f4\ub354 \uc120\ud0dd", "chooseHint": "\ud504\ub85c\uc81d\ud2b8 \ucd5c\uc0c1\ub2e8\uc5d0 \uc788\ub294 0819\uc640 \uac19\uc740 \ucd2c\uc601 \ud3f4\ub354\ub97c \uc120\ud0dd\ud558\uc138\uc694.", "alreadyOrganized": "{{name}}\uc740(\ub294) \uc774\ubbf8 \uc815\ub9ac\ub418\uc5c8\uc2b5\ub2c8\ub2e4.", "noProject": "\ucd2c\uc601 \ud3f4\ub354\ub97c \uc120\ud0dd\ud558\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.", "noFolders": "\uc2dc\uc791\ud558\ub824\uba74 \ud504\ub85c\uc81d\ud2b8 \ucd5c\uc0c1\ub2e8\uc5d0 \ucd2c\uc601 \ud3f4\ub354\ub97c \uac00\uc838\uc624\uc138\uc694.", "sourceCount_one": "\uc6d0\ubcf8 \ud30c\uc77c {{count}}\uac1c", "sourceCount_other": "\uc6d0\ubcf8 \ud30c\uc77c {{count}}\uac1c", "run": "\uc2e4\ud589", "cancel": "\ucde8\uc18c", "analyze": {"title": "\ubd84\uc11d", "description": "\uc120\ud0dd\ud55c \ucd2c\uc601 \ud3f4\ub354\uc758 \ubbf8\ub514\uc5b4\ub97c \ubd84\uc11d\ud569\ub2c8\ub2e4. \uc774\ubbf8 \ubd84\uc11d\ub41c \ud30c\uc77c\uc740 \uac74\ub108\ub701\ub2c8\ub2e4.", "progress": "{{count}}/{{total}} \ubd84\uc11d \uc644\ub8cc", "analyzing": "\ubd84\uc11d \uc911\u2026"}, "organize": {"title": "\ud3f4\ub354 \uc815\ub9ac", "description": "\uc120\ud0dd\ud55c \ucd2c\uc601\ubcf8\uc758 \uc18c\uc2a4\ub97c 01. camera\uc640 02. audio\ub85c \uc815\ub9ac\ud558\uace0 \uac01 \uc18c\uc2a4\uc5d0 \uace0\uc720\ud55c \uc0c9\uc0c1\uc744 \uc9c0\uc815\ud569\ub2c8\ub2e4.", "action": "\ud3f4\ub354 \uc815\ub9ac", "failed": "\ucd2c\uc601\ubcf8\uc744 \uc815\ub9ac\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uc54c\ub9bc\uc744 \ud655\uc778\ud558\uc138\uc694."}, "classify": {"title": "\uba54\uc778\u00b7\uc778\uc11c\ud2b8 \ubd84\ub958", "description": "\ucd2c\uc601\ubcf8\uc758 \uce74\uba54\ub77c \uc601\uc0c1\uc744 \ud558\ub098\uc529 \ubcf4\uba74\uc11c \uba54\uc778 \ub610\ub294 \uc778\uc11c\ud2b8\ub85c \uc815\ud55c \ub2e4\uc74c, \uba54\uc778\u00b7\uc778\uc11c\ud2b8 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc744 \ub9cc\ub4ed\ub2c8\ub2e4. \uac01 \uc601\uc0c1\uc740 \uc774\ubbf8 \ub9cc\ub4e0 \ud0c0\uc784\ub77c\uc778\uc758 \ubd84\ub958\ub85c \uc2dc\uc791\ud558\uace0, \uc5c6\uc73c\uba74 \uaddc\uce59\uc744 \ub530\ub985\ub2c8\ub2e4. \ub2e4\uc2dc \uc2e4\ud589\ud558\uba74 \uba3c\uc800 \ud655\uc778\ud55c \ub4a4 \uae30\uc874 \ud0c0\uc784\ub77c\uc778\uc744 \ub36e\uc5b4\uc501\ub2c8\ub2e4.", "action": "\uba54\uc778\u00b7\uc778\uc11c\ud2b8 \ubd84\ub958", "needsOrganize": "\uba3c\uc800 2\ub2e8\uacc4\ub97c \uc2e4\ud589\ud558\uc138\uc694: {{name}}\uc774(\uac00) \uc544\uc9c1 \uc815\ub9ac\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.", "needsAnalysis": "\uba3c\uc800 1\ub2e8\uacc4\ub97c \uc2e4\ud589\ud558\uc138\uc694: \uc774 \ucd2c\uc601\ubcf8\uc758 \ubaa8\ub4e0 \ud30c\uc77c\uc5d0 \ubd84\uc11d\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.", "overwrite": {"title": "{{name}} \ud0c0\uc784\ub77c\uc778\uc744 \ub36e\uc5b4\uc4f8\uae4c\uc694?", "description": "{{names}} \ud0c0\uc784\ub77c\uc778\uc744 \ub2e4\uc2dc \ub9cc\ub4ed\ub2c8\ub2e4. \uc774 \ud0c0\uc784\ub77c\uc778\uc5d0\uc11c \ud55c \uc2f1\ud06c\uc640 \uadf8\ub8f9\ud654\ub294 \uc0ac\ub77c\uc9d1\ub2c8\ub2e4.", "confirm": "\ub36e\uc5b4\uc4f0\uae30"}}, "syncGroups": {"title": "\uc2f1\ud06c", "description": "\uc120\ud0dd\ud55c \uba54\uc778 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc758 \ud074\ub9bd\uc744 \ub179\ud654 \uc2dc\uac04\uc21c\uc73c\ub85c \uc815\ub82c\ud55c \ub2e4\uc74c, \uc624\ub514\uc624\uc640 \uc74c\uc131\uc744 \uae30\uc900\uc73c\ub85c \uc815\ub82c\ud569\ub2c8\ub2e4."}, "removeGaps": {"title": "\ube48 \uad6c\uac04 \uc81c\uac70", "description": "\ubaa8\ub4e0 \ud2b8\ub799\uc5d0\uc11c \ube44\uc5b4 \uc788\ub294 \uad6c\uac04\ub9cc \uc81c\uac70\ud569\ub2c8\ub2e4. \uc2f1\ud06c\ub294 \uc720\uc9c0\ub429\ub2c8\ub2e4."}, "groupSyncRunning": "\uc2f1\ud06c \uc911\u2026", "groupSyncStop": "\uc911\uc9c0", "unsynced": {"needsReview": "\uac80\ud1a0 \ud544\uc694", "notSynced": "\uc2f1\ud06c \uc548\ub428", "review": "\uac80\ud1a0", "resolved": "\ud574\uacb0\ub428"}, "status": {"organized": "\ud3f4\ub354 \uc815\ub9ac\ub428", "notOrganized": "\ud3f4\ub354 \uc815\ub9ac \uc548 \ub428", "timelines": "\ud0c0\uc784\ub77c\uc778: {{names}}", "noTimelines": "\ud0c0\uc784\ub77c\uc778 \uc5c6\uc74c", "notTranslated": "\ubc88\uc5ed \uc548 \ub428", "stored": "\ubc88\uc5ed\ub428 \u00b7 {{count}}\uc904", "done": "\ubc88\uc5ed \uc644\ub8cc {{completedCount}}/{{totalCount}}", "stopped": "\uc911\ub2e8\ub428 \u00b7 {{completedCount}}/{{totalCount}} \ubc88\uc5ed\ub428", "running": "\ubc88\uc5ed \uc911 {{completedCount}}/{{totalCount}}\u2026", "starting": "\ubc88\uc5ed \uc911\u2026"}, "timeline": {"main": "\uba54\uc778 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778 \uc120\ud0dd", "none": {"main": "\uc120\ud0dd\ub41c \uba54\uc778 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."}}, "draft": {"title": "\ub4dc\ub798\ud504\ud2b8", "description": "\uc120\ud0dd\ud55c \ucd2c\uc601\ubcf8\uc758 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc73c\ub85c \ub4dc\ub798\ud504\ud2b8\ub97c \ub9cc\ub4e0 \ub2e4\uc74c, \uc790\ub9c9\uc744 \ud55c\uad6d\uc5b4\ub85c \ubc88\uc5ed\ud558\uace0 \ub0b4\ubcf4\ub0c5\ub2c8\ub2e4.", "choose": "\uc2f1\ud06c \ud0c0\uc784\ub77c\uc778 \uc120\ud0dd", "none": "\uc774 \ucd2c\uc601\ubcf8\uc5d0\ub294 \uc544\uc9c1 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. 3\ub2e8\uacc4\uc5d0\uc11c \ub9cc\ub4dc\uc138\uc694.", "needsDraft": "\uba3c\uc800 \ub4dc\ub798\ud504\ud2b8\ub97c \ub9cc\ub4dc\uc138\uc694.", "make": "1. \ub4dc\ub798\ud504\ud2b8 \ub9cc\ub4e4\uae30", "makeDescription": "\uc120\ud0dd\ud55c \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uacfc \uac19\uc740 \uc774\ub984\uc758 \ub4dc\ub798\ud504\ud2b8\ub97c \ucd2c\uc601 \ud3f4\ub354\uc758 03. main(\uba54\uc778) \ub610\ub294 04. insert(\uc778\uc11c\ud2b8)\uc5d0 \ub9cc\ub4ed\ub2c8\ub2e4. \ub2e4\uc2dc \uc2e4\ud589\ud558\uba74 \uba3c\uc800 \ud655\uc778\ud55c \ub4a4 \uc774\uc804 \ub4dc\ub798\ud504\ud2b8\ub97c \ub36e\uc5b4\uc501\ub2c8\ub2e4.", "translate": "2. \ubc88\uc5ed", "translateDescription": "\ub4dc\ub798\ud504\ud2b8\uc758 \ubaa8\ub4e0 \uc790\ub9c9\uc744 \ud55c\uad6d\uc5b4\ub85c \ubc88\uc5ed\ud569\ub2c8\ub2e4. \uc6d0\ubcf8 \uc790\ub9c9\uc740 \uc720\uc9c0\ub429\ub2c8\ub2e4.", "translating": "\ubc88\uc5ed \uc911\u2026", "translateProgress": "{{completedCount}}/{{totalCount}} \ubc88\uc5ed \uc911\u2026", "export": "3. \uc790\ub9c9 \ub0b4\ubcf4\ub0b4\uae30", "exportDescription": "\ub4dc\ub798\ud504\ud2b8\uc758 \uc790\ub9c9\uc744 \ubc88\uc5ed, \ucc55\ud130, \ud558\uc704 \ucc55\ud130\uc640 \ud568\uaed8 \ud14d\uc2a4\ud2b8 \ud30c\uc77c\ub85c \uc800\uc7a5\ud569\ub2c8\ub2e4.", "exported": "\uc74c\uc131 \uae30\ub85d\uc774 \ub0b4\ubcf4\ub0b4\uae30\ub418\uc5c8\uc2b5\ub2c8\ub2e4.", "exportEmpty": "\uc774 Draft\uc5d0\ub294 \ub0b4\ubcf4\ub0bc \uc74c\uc131 \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.", "exportFailed": "\uc74c\uc131 \uae30\ub85d\uc744 \ub0b4\ubcf4\ub0bc \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.", "making": "\ub4dc\ub798\ud504\ud2b8 \ub9cc\ub4dc\ub294 \uc911\u2026", "exporting": "\ub0b4\ubcf4\ub0b4\ub294 \uc911\u2026", "noCaptions": "{{name}}\uc5d0\ub294 \ubc88\uc5ed\ud560 \uc790\ub9c9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.", "translateFailed": "\uc790\ub9c9\uc744 \ubc88\uc5ed\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.", "overwrite": {"title": "{{name}} \ub4dc\ub798\ud504\ud2b8\ub97c \ub36e\uc5b4\uc4f8\uae4c\uc694?", "description": "\uc9c0\uae08 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc73c\ub85c \ub4dc\ub798\ud504\ud2b8\ub97c \ub2e4\uc2dc \ub9cc\ub4ed\ub2c8\ub2e4.", "confirm": "\ub36e\uc5b4\uc4f0\uae30"}}, "summary": "\ud3b8\uc9d1 \uc900\ube44", "needsUpdate": "\uc774 \ub2e8\uacc4\ub97c \uc2e4\ud589\ud558\ub824\uba74 Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud558\uc138\uc694."}};
const RULES = `
// The steps' rules, as the built-in Edit preparation had them, run inside the
// app's script sandbox over the project SDK. The refresh and every step read
// the project through the same functions, so what the panel shows and what a
// step changes come from one description.
const nfc = (s) => String(s).normalize("NFC");
const same = (a, b) => nfc(a) === nfc(b);
const CAMERA = "01. camera", AUDIO = "02. audio", MAIN = "03. main", INSERT = "04. insert";
const OUTPUT = new Set([CAMERA, AUDIO, MAIN, INSERT]);
const SYNCED = "Synced Timelines";
const SYNCED_NAMES = new Set([SYNCED, "Synced Sequences", "synced timeline", "05. synced timeline"]);
const isSyncedName = (name) => SYNCED_NAMES.has(nfc(name));
// A timeline name holds a step's word with no English letter touching it:
// "0819 Insert 2" holds insert, "Remain" does not hold main.
const WORD = { main: /(?<![a-z])main(?![a-z])/i, insert: /(?<![a-z])insert(?![a-z])/i };
const bySource = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const byName = new Intl.Collator("en", { numeric: true, sensitivity: "accent" });
// The clocks a track's clips are ordered by: the first one every clip has.
const CLOCKS = ["recorderRecordedAt", "recordedAt", "creationAt", "filenameTimestamp"];
const PALETTE = ["pink", "red", "orange", "yellow", "lime", "green", "cyan", "blue", "violet", "fuchsia", "stone"];
const any = (value) => value;
// The project's folders as a tree; readFootage lists them flat, by path.
function tree(folders) {
  const roots = () => folders.filter((f) => f.path === f.name);
  const children = (f) => folders.filter((c) => c.path === f.path + "/" + c.name);
  const find = (list, name) => list.find((f) => same(f.name, name));
  const subtree = (f) => [f, ...children(f).flatMap(subtree)];
  const media = (f, ids) => subtree(f).flatMap((d) => d.resourceIds).filter((id) => ids.has(id));
  return {
    folders, roots, children, find, subtree, media,
    root: (name) => find(roots(), name),
    child: (f, name) => (f ? find(children(f), name) : undefined),
    // The folder \`name\` under \`parent\` (the root when null), made if missing.
    ensure: async (parent, name) => {
      const existing = parent ? find(children(parent), name) : find(roots(), name);
      if (existing) return existing;
      const made = await p.createFolder(parent ? { name, parentFolderId: parent.folderId } : { name });
      const folder = { folderId: made.folderId, name: made.name, path: parent ? parent.path + "/" + made.name : made.name, resourceIds: [], draftIds: [], color: null };
      folders.push(folder);
      return folder;
    },
  };
}
// What the project holds, read once per refresh and once per step.
async function readProject() {
  const footage = await p.readFootage();
  const resources = await p.resources();
  const timelines = await p.syncedTimelines();
  const workflows = await p.workflows();
  const T = tree(footage.folders);
  const resourceById = new Map(resources.map((r) => [r.resourceId, r]));
  const mediaIds = new Set(resources.filter((r) => r.type !== "Sequence").map((r) => r.resourceId));
  const timelineById = new Map(timelines.filter((t) => t.sequenceId != null).map((t) => [t.resourceId, t]));
  return { footage, resources, timelines, workflows, T, resourceById, mediaIds, timelineById };
}
// Shoots before and after organization, one per name: a root folder outside
// the output folders still waits for it; a folder in 01. camera is organized.
function shoots(P) {
  const found = new Map();
  const shoot = (name) => {
    const key = nfc(name);
    if (!found.has(key)) found.set(key, { name, unorganizedFolderId: null, alreadyOrganized: false, resourceIds: [] });
    return found.get(key);
  };
  for (const f of P.T.roots()) if (!OUTPUT.has(f.name) && !isSyncedName(f.name)) { const s = shoot(f.name); if (s.unorganizedFolderId == null) s.unorganizedFolderId = f.folderId; }
  const camera = P.T.root(CAMERA);
  if (camera) for (const f of P.T.children(camera)) shoot(f.name);
  for (const s of found.values()) {
    const organized = [CAMERA, AUDIO].map((c) => P.T.child(P.T.root(c), s.name)).filter((f) => f != null);
    const unorganized = P.T.roots().filter((f) => f.folderId === s.unorganizedFolderId);
    s.alreadyOrganized = organized.length > 0;
    s.resourceIds = [...new Set([...unorganized, ...organized].flatMap((f) => P.T.media(f, P.mediaIds)))];
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}
// The shoot's folders under a synced-timelines root, where its built timelines sit.
function syncedShootDirs(P, shoot) {
  return P.T.roots().filter((f) => isSyncedName(f.name)).flatMap((s) => P.T.children(s).filter((d) => same(d.name, shoot)));
}
// The shoot's synced timelines whose name holds the step's word, in tree order.
function shootTimelines(P, shoot, kind) {
  return syncedShootDirs(P, shoot).flatMap((dir) => dir.resourceIds.flatMap((id) => {
    const t = P.timelineById.get(id);
    return t && WORD[kind].test(t.name) ? [{ resourceId: id, sequenceId: t.sequenceId, name: t.name, kind }] : [];
  }));
}
// The Draft step's list: Main timelines, then Insert ones; a name holding both words is Main.
function draftSources(P, shoot) {
  const main = shootTimelines(P, shoot, "main");
  const listed = new Set(main.map((t) => t.resourceId));
  return [...main, ...shootTimelines(P, shoot, "insert").filter((t) => !listed.has(t.resourceId))];
}
// The shoot's drafts in 03. main/<shoot> and 04. insert/<shoot>, Main first.
function shootDrafts(P, shoot) {
  const names = new Map(P.footage.drafts.map((d) => [d.sequenceId, d.name]));
  return [{ kind: "main", category: MAIN }, { kind: "insert", category: INSERT }].flatMap(({ kind, category }) => {
    const dir = P.T.child(P.T.root(category), shoot);
    return (dir ? dir.draftIds : []).filter((id) => names.has(id)).map((id) => ({ sequenceId: id, name: names.get(id), kind }));
  });
}
// The pair the classify step built (<shoot> Main and Insert, maybe numbered
// by an earlier version), which a new build replaces; and the latest of each.
function builtTimelines(P, shoot) {
  const escaped = nfc(shoot).replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
  const pattern = new RegExp("^" + escaped + " (Main|Insert)(?: (\\\\d+))?$");
  const found = syncedShootDirs(P, shoot).flatMap((dir) => dir.resourceIds.flatMap((id) => {
    const t = P.timelineById.get(id);
    const m = t ? pattern.exec(nfc(t.name)) : null;
    return m ? [{ resourceId: id, sequenceId: t.sequenceId, name: t.name, kind: m[1] === "Main" ? "main" : "insert", at: Number(m[2] || 1) }] : [];
  }));
  const number = Math.max(0, ...found.map((t) => t.at));
  return { number, pair: found.filter((t) => t.at === number) };
}
// Clips in capture-clock order: by the first clock every clip has, then by name.
function orderClips(ids, P) {
  const rows = ids.map((id) => {
    const r = P.resourceById.get(id);
    const rec = (r && r.recording) || {};
    const clocks = {};
    for (const k of CLOCKS) { const t = rec[k] ? Date.parse(rec[k]) : NaN; if (Number.isFinite(t)) clocks[k] = t; }
    return { resourceId: id, name: r ? r.name : "", clocks };
  });
  const clock = rows.length ? CLOCKS.find((k) => rows.every((r) => r.clocks[k] != null)) : undefined;
  return rows.sort((a, b) => (clock ? a.clocks[clock] - b.clocks[clock] : 0) || byName.compare(nfc(a.name), nfc(b.name)) || (a.resourceId < b.resourceId ? -1 : a.resourceId > b.resourceId ? 1 : 0)).map((r) => r.resourceId);
}
// A folder's sources: its own files as one source named after it, then each child folder with everything below it.
function sourcesOf(P, dir) {
  if (!dir) return [];
  const direct = dir.resourceIds.filter((id) => P.mediaIds.has(id));
  return [...(direct.length ? [{ name: dir.name, resourceIds: direct }] : []), ...P.T.children(dir).map((c) => ({ name: c.name, resourceIds: P.T.media(c, P.mediaIds) }))].filter((s) => s.resourceIds.length > 0);
}
`;
const REFRESH = `
const P = await readProject();
const list = shoots(P);
return {
  state: {
    shoots: list,
    timelines: list.flatMap((s) => draftSources(P, s.name).map((t) => ({ ...t, shoot: s.name }))),
    drafts: list.flatMap((s) => shootDrafts(P, s.name).map((d) => ({ ...d, shoot: s.name }))),
    projectDrafts: P.footage.drafts,
    built: Object.fromEntries(list.map((s) => [s.name, builtTimelines(P, s.name).pair.map((t) => t.name)])),
  },
  resources: P.resources,
  timelines: P.timelines,
  workflows: P.workflows,
  review: p.jwonder ? await p.jwonder.unsyncedReview() : null,
};
`;
const ORGANIZE = `
// Step 2: lay the shoot out by source: 01. camera/<shoot>/<source> and
// 02. audio/<shoot>/<source>, each source its own color; the emptied shoot
// folder goes. A shoot organized earlier is never merged into.
const P = await readProject();
const shootDir = P.footage.folders.find((f) => f.folderId === FOLDER_ID);
if (!shootDir) throw new Error("Folder not found: " + FOLDER_ID);
for (const category of [CAMERA, AUDIO]) if (P.T.child(P.T.root(category), shootDir.name)) throw new Error(category + "/" + shootDir.name + " is already organized");
// Each media file with the folders between the shoot and it, outermost first.
const items = [];
const walk = (f, dirs) => {
  for (const id of f.resourceIds) { const r = P.resourceById.get(id); if (!r || r.type === "Sequence") continue; items.push({ id, kind: r.type === "Audio" ? "audio" : "video", dirs }); }
  for (const c of P.T.children(f)) walk(c, [...dirs, c]);
};
walk(shootDir, []);
// The folders every file of a kind sits in, outermost first.
const commonDirs = (list) => list.reduce((common, m) => { let i = 0; while (i < common.length && m.dirs[i] && common[i].folderId === m.dirs[i].folderId) i++; return common.slice(0, i); }, list.length ? list[0].dirs : []);
// Source names for a kind come from where its files sit, not from folder
// names: the deepest folder holding every file of the kind is the shoot or a
// folder right under it, and each folder right below that is a source; a
// file directly in it takes its name. Deeper, the kind has one source, named
// by the folder right under the shoot.
const groups = new Map();
for (const kind of ["video", "audio"]) {
  const list = items.filter((m) => m.kind === kind);
  const common = commonDirs(list);
  for (const m of list) {
    const name = (common.length >= 2 ? common[0] : (m.dirs[common.length] || common[0] || shootDir)).name;
    const category = kind === "video" ? CAMERA : AUDIO;
    const key = category + "/" + name;
    if (!groups.has(key)) groups.set(key, { name, category, resourceIds: [], color: "" });
    groups.get(key).resourceIds.push(m.id);
  }
}
const sources = [...groups.values()].sort((a, b) => a.category.localeCompare(b.category) || bySource.compare(a.name, b.name));
sources.forEach((s, i) => { s.color = PALETTE[i % PALETTE.length]; });
// Both shoot folders always exist, so 01. camera alone lists every organized shoot.
for (const category of [CAMERA, AUDIO]) await P.T.ensure(await P.T.ensure(null, category), shootDir.name);
for (const s of sources) {
  const dir = await P.T.ensure(await P.T.ensure(await P.T.ensure(null, s.category), shootDir.name), s.name);
  const moved = await p.moveToFolder({ targetFolderId: dir.folderId, resourceIds: s.resourceIds });
  if (moved.skipped.length) throw new Error("Media not found: " + moved.skipped.join(", "));
  await p.setFolderColor({ folderIds: [dir.folderId], color: any(s.color) });
  await p.setResourceColor({ resourceIds: s.resourceIds, color: any(s.color) });
}
// The folders the moves emptied go, deepest first, the shoot's own included.
const after = tree((await p.readFootage()).folders);
const root = after.folders.find((f) => f.folderId === shootDir.folderId);
const gone = new Set();
if (root) for (const f of after.subtree(root).sort((a, b) => b.path.split("/").length - a.path.split("/").length)) {
  if (f.resourceIds.length === 0 && f.draftIds.length === 0 && after.children(f).every((c) => gone.has(c.folderId))) { await p.deleteFolder({ folderId: f.folderId }); gone.add(f.folderId); }
}
return sources;
`;
const BUILD = `
// Step 3: build <shoot> Main (one track per camera and per recorder source)
// and <shoot> Insert (one track) in Synced Timelines/<shoot>, clips laid end
// to end in capture-clock order. A pair built before is deleted, as deleting
// it from the project does, and built again under the same names.
const P = await readProject();
const cameras = sourcesOf(P, P.T.child(P.T.root(CAMERA), SHOOT));
const recorders = sourcesOf(P, P.T.child(P.T.root(AUDIO), SHOOT));
if (cameras.length === 0) throw new Error("No camera media in " + CAMERA + "/" + SHOOT);
const classOf = new Map(CLASSES.map((c) => [c.resourceId, c.kind]));
for (const id of cameras.flatMap((s) => s.resourceIds)) if (!classOf.has(id)) throw new Error("The shoot changed. Review classification again.");
const built = builtTimelines(P, SHOOT);
// A pair numbered by an earlier version keeps its number.
const suffix = built.number > 1 ? " " + built.number : "";
const mainTracks = [...cameras.map((s) => orderClips(s.resourceIds.filter((id) => classOf.get(id) === "main"), P)), ...recorders.map((s) => orderClips(s.resourceIds, P))].filter((t) => t.length > 0);
const inserts = orderClips(cameras.flatMap((s) => s.resourceIds).filter((id) => classOf.get(id) === "insert"), P);
const replacedSequenceIds = built.pair.map((t) => t.sequenceId);
for (const t of built.pair) await p.deleteSyncedTimeline({ resourceId: t.resourceId });
const made = [];
for (const plan of [{ name: SHOOT + " Main" + suffix, tracks: mainTracks }, { name: SHOOT + " Insert" + suffix, tracks: inserts.length ? [inserts] : [] }]) {
  if (plan.tracks.length === 0) continue;
  const handle = await p.createSyncedTimeline({ name: plan.name, tracks: plan.tracks.map((clips) => ({ clips: clips.map((resourceId) => ({ resourceId })) })) });
  made.push({ resourceId: handle.resourceId, sequenceId: handle.sequenceId, name: handle.name });
}
// Creation files timelines under Synced Timelines; move them into its <shoot> folder.
const after = tree((await p.readFootage()).folders);
const syncedRoot = after.roots().find((f) => same(f.name, SYNCED) || same(f.name, "Synced Sequences")) || (await after.ensure(null, SYNCED));
const dir = await after.ensure(syncedRoot, SHOOT);
await p.moveToFolder({ targetFolderId: dir.folderId, resourceIds: made.map((t) => t.resourceId) });
return { main: [...classOf.values()].filter((c) => c === "main").length, insert: inserts.length, timelines: made.length, sequenceIds: made.map((t) => t.sequenceId), replacedSequenceIds };
`;
const MAKE_DRAFT = `
// Step 6: a draft holding one synced timeline from Synced Timelines/<shoot>,
// named like it, in the folder of the step that makes it: 03. main/<shoot>
// for Main and 04. insert/<shoot> for Insert. A draft there with the
// timeline's name is replaced, since a draft clip keeps the length it was
// placed with and the timeline may have grown through sync, grouping or gap
// removal, or have been built again.
const P = await readProject();
const timeline = P.timelineById.get(RESOURCE_ID);
if (!timeline) throw new Error("Timeline not found");
const shootDir = P.T.roots().filter((f) => isSyncedName(f.name)).flatMap((s) => P.T.children(s)).find((d) => d.resourceIds.includes(RESOURCE_ID));
if (!shootDir) throw new Error("The timeline is not in " + SYNCED + "/<shoot>");
const category = KIND === "insert" ? INSERT : MAIN;
const existing = shootDrafts(P, shootDir.name).filter((d) => d.kind === KIND && same(d.name, timeline.name));
// Saved at once as the app's own drop-to-draft does; the working-copy path
// (createDraft, insertResource, commitAll) takes over half a minute on a
// long synced timeline.
const made = await p.createDraftFromResources({ name: timeline.name, resourceIds: [RESOURCE_ID] });
const sequenceId = made.sequenceId;
for (const old of existing) await p.deleteDraft({ sequenceId: old.sequenceId });
const dir = await P.T.ensure(await P.T.ensure(null, category), shootDir.name);
await p.moveToFolder({ targetFolderId: dir.folderId, draftIds: [sequenceId] });
return { folder: category, shoot: shootDir.name, name: timeline.name, replaced: existing.length, sequenceId };
`;

const muted = {fontSize:12,lineHeight:"16px",opacity:0.65};
const Line = ({tone = "muted", children}) => <p role={tone === "error" ? "alert" : "status"} style={{margin:0,fontSize:12,lineHeight:"16px",wordBreak:"break-word",...(tone === "error" ? {color:"var(--destructive)"} : tone === "success" ? {} : {opacity:0.65})}}>{children}</p>;
const interpolate = (value, args) => Object.entries(args).reduce((s,[key,v]) => s.replaceAll(`{{${key}}}`,String(v)),value);

// A step's number, title and its buttons on one row, as the built-in steps
// were laid out; what the step does is the title's hover text, and its Run
// button's. Below the row, the step's own controls, indented past the number.
const Step = ({number,title,description,actions,children}) => <section style={{borderTop:"1px solid var(--border)",padding:"12px 0",display:"flex",flexDirection:"column",gap:6}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span aria-hidden="true" style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid var(--border)",borderRadius:"50%",fontSize:12,flexShrink:0,opacity:0.8}}>{number}</span>
      <span title={description} style={{flex:1,minWidth:0,fontSize:14,fontWeight:500,lineHeight:"16px",cursor:"default"}}>{title}</span>
      <span style={{display:"inline-flex",gap:6,flexShrink:0}}>{actions}</span>
    </div>
    {children && <div style={{paddingLeft:32,display:"flex",flexDirection:"column",gap:6}}>{children}</div>}
  </section>;

export default function Preparation({sdk, context, ui}) {
  const t = STRINGS[context.language] || STRINGS.en;
  const [data, setData] = useState(null), [shootName, setShoot] = useState("");
  const [timelineId, setTimeline] = useState("");
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState("");
  // One line of feedback under the step it belongs to: an error, or why a
  // disabled button could not run (the built-in steps said so in a toast).
  const [note, setNote] = useState(null);
  const [mainId, setMain] = useState("");
  const epoch = useRef(0), pending = useRef(false), reading = useRef(false), noteTimer = useRef(null), chosenDraft = useRef("");
  const pid = context.projectId;
  const key = `selection:${pid}`;
  const q = JSON.stringify;
  // Every script works on this project with the steps' rules in scope.
  // A step that builds timelines or a draft from a long shoot needs more
  // than the default half minute; a host without the option keeps it.
  async function script(body, commit = false, seconds = undefined) {
    const response = await sdk.runScript({summary: t.summary, script: `const p = selects.project(${q(pid)});\n${RULES}\n${body}`, allowCommit: commit, ...(seconds ? {timeoutSeconds: seconds} : {})});
    if (response.isError) throw new Error(response.output);
    return response.result;
  }
  // The app's own confirmation dialog, as the built-in steps asked before
  // overwriting; declined or closed, nothing happens.
  async function confirm(words, args) {
    if (typeof sdk.confirm !== "function") throw new Error(t.needsUpdate);
    return sdk.confirm({title: interpolate(words.title, args), description: interpolate(words.description, args), confirmLabel: words.confirm, cancelLabel: t.cancel, destructive: true});
  }
  async function refresh() {
    if (!pid || reading.current || pending.current) return;
    reading.current = true;
    const generation = epoch.current;
    try {
      const result = await script(REFRESH);
      // The translation job of the chosen draft alone; a project may hold many.
      const draftId = chosenDraft.current;
      const translation = draftId && result.state.projectDrafts.some(d => d.sequenceId === draftId)
        ? await script(`return await selects.draft(${q(draftId)}).translationStatus();`) : null;
      if (generation === epoch.current) setData({...result, translations: draftId ? {[draftId]: translation} : {}});
    } catch(e) {if (generation === epoch.current) say("top", String(e.message || e), "error");}
    finally {reading.current = false;}
  }
  useEffect(() => {
    ++epoch.current; setBusy(false); setData(null); setNote(null); setShoot(""); setTimeline("");
    const generation = epoch.current;
    sdk.storage.getItem(key).then(raw => {
      if (epoch.current !== generation) return;
      if (raw) {const s = JSON.parse(raw); setShoot(s.shoot || ""); setTimeline(s.timeline || "");}
    }).catch(e => say("top", String(e.message || e), "error"));
    void refresh();
    const timer = setInterval(refresh, 3000);
    return () => {++epoch.current; clearInterval(timer); clearTimeout(noteTimer.current);};
  }, [pid]);
  // A toast's lifetime: the line goes by itself unless it is an error.
  function say(step, text, tone = "muted") {
    clearTimeout(noteTimer.current);
    setNote({step, text, tone});
    if (tone !== "error") noteTimer.current = setTimeout(() => setNote(current => current && current.text === text ? null : current), 4000);
  }
  async function select(shoot, timeline = "") {
    setShoot(shoot); setTimeline(timeline); setNote(null);
    try {await sdk.storage.setItem(key, JSON.stringify({shoot, timeline}));} catch(e) {say("top", String(e.message || e), "error");}
  }
  async function act(step, action, failed = e => String(e.message || e), token = "") {
    if (pending.current) return;
    pending.current = true; setBusy(true); setRunning(token); setNote(null);
    const generation = epoch.current;
    try {await action();} catch(e) {
      const text = failed(e);
      if (generation === epoch.current && text) say(step, text, "error");
    }
    finally {pending.current = false; if (generation === epoch.current) {setBusy(false); setRunning(""); await refresh();}}
  }
  const shoots = data?.state.shoots || [];
  const shoot = shoots.find(s => s.name === shootName);
  const timelines = (data?.state.timelines || []).filter(s => s.shoot === shoot?.name);
  const workflows = data?.workflows || [];
  const active = workflows.filter(w => ["queued", "running", "canceling"].includes(w.status));
  const mains = timelines.filter(s => s.kind === "main");
  const main = mains.find(s => s.resourceId === mainId) || mains[0];
  const mainStored = data?.timelines.find(s => s.resourceId === main?.resourceId);
  // Step 6 chooses among every draft in the project, and the shoot's synced
  // timelines that have no draft yet (there, only making one applies).
  const projectDrafts = data?.state.projectDrafts || [];
  const shootDrafts = (data?.state.drafts || []).filter(d => d.shoot === shoot?.name);
  const unmade = timelines.filter(tl => !shootDrafts.some(d => d.name === tl.name && d.kind === tl.kind));
  const choices = [
    ...projectDrafts.map(d => ({value:`d:${d.sequenceId}`, label:d.name, draft:d})),
    ...unmade.map(tl => ({value:`t:${tl.resourceId}`, label:tl.name, timeline:tl})),
  ];
  const chosen = choices.find(c => c.value === timelineId)
    || choices.find(c => c.draft && shootDrafts.some(d => d.sequenceId === c.draft.sequenceId))
    || choices.find(c => c.timeline) || choices[0];
  const draft = chosen?.draft;
  chosenDraft.current = draft?.sequenceId || "";
  // The synced timeline a draft is made from: the chosen one, or the one the
  // chosen draft is named after. Without it, there is nothing to make.
  const source = chosen?.timeline || (draft && (data?.state.timelines || []).find(tl => tl.name === draft.name));
  const sourceStored = data?.timelines.find(s => s.resourceId === source?.resourceId);
  const sourceBusy = !!sourceStored && active.some(w => w.sequenceId === sourceStored.sequenceId);
  // The draft of the chosen timeline's name in its step's folder, which making it again replaces.
  const existingDraft = source && shootDrafts.find(d => d.kind === source.kind && d.name === source.name);
  const translation = data?.translations[draft?.sequenceId];
  const translating = translation?.status === "running";
  const sourceIds = new Set(shoot?.resourceIds || []);
  const resources = (data?.resources || []).filter(r => sourceIds.has(r.resourceId));
  const media = resources.filter(r => String(r.type).toLowerCase() !== "image");
  const missing = media.filter(r => !r.hasAnalysis);
  const analysis = active.filter(w => sourceIds.has(w.resourceId) && w.type === "project:analyze-resource");
  const sync = active.find(w => w.sequenceId === mainStored?.sequenceId && w.type === "sequence:sync");
  // The host's review of the on-screen timeline's unsynced clips, as the
  // built-in step showed it under Sync while the chosen Main was on screen.
  const review = !sync && data?.review && data.review.sequenceId === mainStored?.sequenceId ? data.review : null;
  const reviewRows = review ? [["needsReview","#facc15"],["notSynced","#ef4444"]].filter(([group]) => review.counts[group] > 0) : [];
  // Why step 3 cannot run yet, said on a click where its button is disabled.
  const classifyBlocked = !shoot ? null : !shoot.alreadyOrganized ? "needsOrganize" : missing.length ? "needsAnalysis" : null;
  // Built before, the app asks about overwriting the pair first; then its
  // classifier opens, and its classes build the timelines. Closing the
  // dialog ends the request canceled with no writes.
  async function classify() {
    const generation = epoch.current;
    const names = (data?.state.built || {})[shoot.name] || [];
    if (names.length && !(await confirm(t.classify.overwrite, {name: shoot.name, names: names.join(", ")}))) return;
    const job = await script(`return await p.jwonder.startReview({shoot:${q(shoot.name)}});`,true);
    let result = job;
    while (result.status === "running") {
      await new Promise(resolve=>setTimeout(resolve,500));
      if (generation !== epoch.current) return;
      result = await script(`return await p.jwonder.reviewStatus(${q(job.id)});`);
    }
    if(result.status === "failed") throw new Error(result.error);
    if(result.status !== "succeeded") return;
    const made = await script(`const SHOOT = ${q(shoot.name)}; const CLASSES = ${q(result.classes)};\n${BUILD}`,true,120);
    // Both new timelines open, Main last so it is the one on screen.
    for (const sequenceId of [...made.sequenceIds].reverse())
      await script(`return await selects.editor.openSyncedTimeline({projectId:${q(pid)},sequenceId:${q(sequenceId)}});`,true);
  }
  // A draft of the same name is asked about first; declined, nothing is made.
  async function makeDraft() {
    if (existingDraft && !(await confirm(t.draft.overwrite, {name: existingDraft.name}))) return;
    const result = await script(`const RESOURCE_ID = ${q(source.resourceId)}; const KIND = String(${q(source.kind)});\n${MAKE_DRAFT}`, true, 120);
    await select(shoot.name, `d:${result.sequenceId}`);
    await script(`return await selects.editor.openDraft(${q(result.sequenceId)});`, true);
  }
  // A running step's button stops it when pressed again, at once.
  async function stopSync() {
    await script(`return await selects.workflow(${q(sync.workflowId)}).cancel();`, true);
  }
  async function stopTranslation() {
    await script(`return await selects.draft(${q(draft.sequenceId)}).cancelTranscriptTranslation();`, true);
  }
  // Reading a long draft's transcript takes longer than the default limit.
  async function exportTranscript() {
    await script(`return await selects.export.draftTranscript(${q({projectId:pid,draftSequenceId:draft.sequenceId,includeTranslation:true,includeChapters:true,includeSubchapters:true})});`,true,120);
    say("draft", t.draft.exported, "success");
  }
  const exportFailure = e => {
    const message = String(e.message || e);
    if (message.includes("Canceled")) return "";
    return message.includes("draft_transcript_empty") ? t.draft.exportEmpty : t.draft.exportFailed;
  };
  const Note = ({step}) => note?.step === step ? <Line tone={note.tone}>{note.text}</Line> : null;
  // A disabled button takes no click, so it lands on this wrapper and says why.
  const Explain = ({children, why, onClick}) => <span title={why} style={{display:"inline-flex",gap:6}} onClick={onClick}>{children}</span>;
  const run = (label, disabled, onClick) => <ui.Button variant="secondary" disabled={busy || disabled} onClick={onClick}>{label}</ui.Button>;
  const sourceCount = count => interpolate(count === 1 ? t.sourceCount_one : t.sourceCount_other, {count});
  return <ui.Stack gap={4}>
    <label title={t.description} style={muted}>{t.folder}</label>
    <ui.Select label="" value={shoot?.name || null} placeholder={t.chooseFolder} options={shoots.map(s => ({value:s.name,label:s.name}))} disabled={busy || !shoots.length} onChange={s => void select(s)} />
    <Line>{!pid ? t.noProject : !shoots.length ? t.noFolders : !shoot ? t.chooseHint : sourceCount(shoot.resourceIds.length)}</Line>
    <Note step="top"/>
    <Step number={1} title={t.analyze.title} description={t.analyze.description} actions={
      <Explain why={t.analyze.description}>
        {analysis.length
          ? run(t.groupSyncStop, analysis.some(w=>w.status === "canceling"), ()=>act("analyze", async()=>{for(const w of analysis) await script(`return await p.cancelAnalysis(${q({resourceId:w.resourceId,workflowId:w.workflowId})});`,true);}))
          : run(t.run, !shoot || !missing.length, ()=>act("analyze", ()=>script(`return await p.startAnalysis({resourceIds:${q(missing.map(r=>r.resourceId))}});`,true)))}
      </Explain>}>
      {!!media.length && (analysis.length
        ? <ui.Progress label={interpolate(t.analyze.progress,{count:media.length-missing.length,total:media.length})}/>
        : <Line>{interpolate(t.analyze.progress,{count:media.length-missing.length,total:media.length})}</Line>)}
      <Note step="analyze"/>
    </Step>
    <Step number={2} title={t.organize.title} description={t.organize.description} actions={
      <Explain why={t.organize.description} onClick={()=>{if (shoot?.alreadyOrganized && !busy) say("organize", interpolate(t.alreadyOrganized,{name:shoot.name}));}}>
        {run(t.run, !shoot?.unorganizedFolderId || !!analysis.length, ()=>act("organize", ()=>script(`const FOLDER_ID = ${q(shoot.unorganizedFolderId)};\n${ORGANIZE}`,true,120), e => `${t.organize.failed} ${e.message || e}`))}
      </Explain>}>
      <Note step="organize"/>
    </Step>
    <Step number={3} title={t.classify.title} description={t.classify.description} actions={
      <Explain why={t.classify.description} onClick={()=>{if (classifyBlocked && !busy) say("classify", interpolate(t.classify[classifyBlocked],{name:shoot.name}));}}>
        {run(t.run, !shoot || !!classifyBlocked, ()=>act("classify", classify))}
      </Explain>}>
      <Note step="classify"/>
    </Step>
    <Step number={4} title={t.syncGroups.title} description={t.syncGroups.description} actions={
      <Explain why={t.syncGroups.description} onClick={()=>{if (!main && shoot && !busy) say("sync", t.timeline.none.main);}}>
        <span style={{display:"inline-flex"}} onClick={()=>{if (sync && sync.status !== "canceling" && !busy) act("sync", stopSync);}}>
          <ui.Button variant="secondary" busy={!!sync} busyLabel={sync && typeof sync.progress === "number" ? `${t.groupSyncRunning} ${Math.round(Math.min(1, Math.max(0, sync.progress)) * 100)}%` : t.groupSyncRunning} disabled={busy || !mainStored?.sequenceId} onClick={()=>act("sync", ()=>script(`return await p.syncSyncedTimelines([{sequenceId:${q(mainStored.sequenceId)},method:"waveform",addGroupGap:true}]);`,true))}>{t.run}</ui.Button>
        </span>
      </Explain>}>
      <ui.Select label="" placeholder={t.timeline.main} value={main?.resourceId || null} options={mains.map(s=>({value:s.resourceId,label:s.name}))} disabled={busy || !!sync || !mains.length} onChange={setMain}/>
      <Explain why={t.removeGaps.description} onClick={()=>{if (!main && shoot && !busy) say("sync", t.timeline.none.main);}}>
        <ui.Button variant="secondary" disabled={busy || !mainStored?.sequenceId || !!sync} onClick={()=>act("sync", ()=>script(`return await p.syncedTimeline(${q(mainStored.sequenceId)}).removeVacantRanges();`,true))}>{t.removeGaps.title}</ui.Button>
      </Explain>
      {reviewRows.length > 0 && <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {reviewRows.map(([group,dot]) => <button key={group} type="button" disabled={busy} onClick={()=>act("sync", ()=>script(`return await p.jwonder.reviewUnsynced(${q({group})});`))}
          style={{display:"flex",alignItems:"center",gap:8,width:"100%",minHeight:28,padding:"4px 8px",border:0,borderRadius:6,background:"transparent",color:"inherit",font:"inherit",fontSize:12,textAlign:"left",cursor:busy?"default":"pointer",opacity:busy?0.5:1}}>
          <span aria-hidden="true" style={{width:8,height:8,borderRadius:"50%",background:dot,flexShrink:0}}/><span style={{flex:1,minWidth:0}}>{t.unsynced[group]}</span><span style={{opacity:0.65,fontVariantNumeric:"tabular-nums"}}>{review.counts[group]}</span>
        </button>)}
        <ui.Row>
          <ui.Button variant="secondary" disabled={busy} onClick={()=>act("sync", ()=>script(`return await p.jwonder.reviewUnsynced();`))}>{t.unsynced.review}</ui.Button>
          <ui.Button variant="primary" disabled={busy || review.resolveDisabled} onClick={()=>act("sync", ()=>script(`return await p.jwonder.resolveUnsynced();`, true))}>{t.unsynced.resolved}</ui.Button>
        </ui.Row>
      </div>}
      <Note step="sync"/>
    </Step>
    <Step number={6} title={t.draft.title} description={t.draft.description}>
      <ui.Select label="" placeholder={t.draft.choose} value={chosen?.value || null} options={choices.map(c=>({value:c.value,label:c.label}))} disabled={busy || !choices.length} onChange={value=>void select(shoot?.name || "",value)}/>
      <Explain why={t.draft.makeDescription} onClick={()=>{if (!source && shoot && !busy) say("draft", t.draft.none);}}>
        <ui.Button variant="secondary" busy={running === "make"} busyLabel={t.draft.making} disabled={busy || !source || sourceBusy} onClick={()=>act("draft", makeDraft, undefined, "make")}>{t.draft.make}</ui.Button>
      </Explain>
      <Explain why={t.draft.translateDescription} onClick={()=>{if (!busy && !draft) say("draft", !source ? t.draft.none : t.draft.needsDraft);}}>
        <span style={{display:"inline-flex"}} onClick={()=>{if (translating && !busy) act("draft", stopTranslation);}}>
          <ui.Button variant="secondary" busy={translating} busyLabel={translating ? t.draft.translating : undefined} disabled={busy || !draft} onClick={()=>act("draft", ()=>script(`return await selects.draft(${q(draft.sequenceId)}).startTranscriptTranslation({targetLanguage:"korean"});`,true))}>{t.draft.translate}</ui.Button>
        </span>
      </Explain>
      {draft && (translation?.status === "failed"
        ? <Line tone="error">{translation.errorCode === "caption_translation_no_captions" ? interpolate(t.draft.noCaptions,{name:draft.name}) : t.draft.translateFailed}</Line>
        : <Line tone={translation?.status === "succeeded" ? "success" : "muted"}>{!translation ? t.status.notTranslated
            : translation.status === "running" ? (translation.totalCount > 0 ? interpolate(t.status.running, translation) : t.status.starting)
            : translation.status === "succeeded" ? interpolate(t.status.done, translation)
            : translation.status === "canceled" ? interpolate(t.status.stopped, translation)
            : interpolate(t.status.stored, {count: translation.completedCount})}</Line>)}
      <Explain why={t.draft.exportDescription} onClick={()=>{if (!busy && !draft) say("draft", !source ? t.draft.none : t.draft.needsDraft);}}>
        <ui.Button variant="secondary" busy={running === "export"} busyLabel={t.draft.exporting} disabled={busy || !draft} onClick={()=>act("draft", exportTranscript, exportFailure, "export")}>{t.draft.export}</ui.Button>
      </Explain>
      <Note step="draft"/>
    </Step>
  </ui.Stack>;
}
