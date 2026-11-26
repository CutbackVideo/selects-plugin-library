// @name Huick Alpha
// @icon video
// A production plan for one short episode, written the way a team plans it in
// its Docs: the concept, the cast and their recordings, the materials, and each
// scene's dialogue, screen direction and article excerpt. Create hands the plan
// to Clipper (selects.clipper.startRun), which makes the Draft with the chosen
// template, exactly as its own Create button does.
import React, { useEffect, useRef, useState } from "react";

const DEFAULT_TEMPLATE = "\ud719\uc54c\ud30c \u00b7 \uacf5\ud1b5";
const SCRIPT_DOCUMENT = "Production Script.txt";
const KINDS = {
  image: ["png", "jpg", "jpeg", "webp", "gif", "heic"],
  video: ["mov", "mp4", "m4v", "webm", "mkv", "avi", "mxf", "lrv", "insv"],
  audio: ["wav", "mp3", "aac", "m4a", "aiff", "aif", "flac", "ogg"],
};

const STRINGS = {
  en: {
    setup: "Template and source",
    template: "Template",
    source: "Source Draft",
    noDraft: "Open the Draft that holds the raw recordings first.",
    sourceOf: (n) => n + " recordings in the open Draft",
    plan: "Production plan",
    concept: "Concept and overall plan",
    conceptHint: "e.g. Weekend road closures\nUse a calm news tone and keep captions short at the bottom.",
    credits: "Production credits (optional)",
    recordings: "Recordings",
    cutoutNote: "Cutout request (optional)",
    cutoutHint: "e.g. Remove the blue background.",
    cast: "Characters",
    addCharacter: "Add character",
    characterSlot: (index) => "Character " + index,
    removeCharacter: "Remove character",
    name: "Name",
    recording: "Video",
    direction: "Notes for this character",
    materials: "Materials",
    remove: "Remove",
    materialCount: (n) => n + " materials",
    scenes: "Scenes",
    scene: "Scene to edit",
    addScene: "Add scene",
    removeScene: "Remove scene",
    title: "Scene title",
    speaker: (i) => "Line " + i + " character",
    line: (i) => "Line " + i,
    addLine: "Add line",
    removeLine: "Remove line",
    screenHint: "Start with the scene length (e.g. about 3.5 s), then what appears where and when.",
    excerpt: "Article excerpt and source (verbatim)",
    create: "Generate",
    creating: "Sending to Clipper\u2026",
    sent: "Clipper is making the Draft. Follow it in Clipper.",
    needUpdate: "This Selects version cannot start Clipper runs from apps. Update Selects.",
    missing: "Fill the concept, give every line a speaker and text, and pick each character's recording.",
  },
  ko: {
    setup: "\ud15c\ud50c\ub9bf\uacfc \uc18c\uc2a4",
    template: "\ud15c\ud50c\ub9bf",
    source: "\uc18c\uc2a4 Draft",
    noDraft: "\uc6d0\ubcf8 \ub179\ud654\uac00 \ub4e4\uc5b4 \uc788\ub294 Draft\ub97c \uba3c\uc800 \uc5ec\uc138\uc694.",
    sourceOf: (n) => "\uc5f4\ub9b0 Draft\uc758 \ub179\ud654 " + n + "\uac1c",
    plan: "\uc81c\uc791 \uae30\ud68d",
    concept: "\ucee8\uc149\uacfc \uc804\uccb4 \uae30\ud68d",
    conceptHint: "\uc608) \uc8fc\ub9d0 \uad50\ud1b5 \ud1b5\uc81c \uc548\ub0b4\n\ucc28\ubd84\ud55c \ub274\uc2a4 \ud1a4\uc73c\ub85c, \uc790\ub9c9\uc740 \ud654\uba74 \ud558\ub2e8\uc5d0 \uc9e7\uac8c \ub123\uc5b4 \uc8fc\uc138\uc694.",
    credits: "\uc81c\uc791\uc9c4 (\uc120\ud0dd)",
    recordings: "\ub179\ud654",
    cutoutNote: "\ubc30\uacbd \uc81c\uac70 \uba54\ubaa8 (\uc120\ud0dd)",
    cutoutHint: "\uc608) \ud30c\ub780 \ubc30\uacbd\uc744 \uc9c0\uc6cc \uc8fc\uc138\uc694.",
    cast: "\uce90\ub9ad\ud130",
    addCharacter: "\uce90\ub9ad\ud130 \ucd94\uac00",
    characterSlot: (index) => "\uce90\ub9ad\ud130 " + index,
    removeCharacter: "\uce90\ub9ad\ud130 \uc0ad\uc81c",
    name: "\uc774\ub984",
    recording: "\uc601\uc0c1",
    direction: "\uce90\ub9ad\ud130 \uc5f0\ucd9c \uba54\ubaa8",
    materials: "\uc81c\uc791 \uc790\ub8cc",
    remove: "\uc0ad\uc81c",
    materialCount: (n) => "\uc790\ub8cc " + n + "\uac1c",
    scenes: "\uc52c \ub300\ubcf8",
    scene: "\ud3b8\uc9d1\ud560 \uc52c",
    addScene: "\uc52c \ucd94\uac00",
    removeScene: "\uc52c \uc0ad\uc81c",
    title: "\uc52c \uc81c\ubaa9",
    speaker: (i) => "\ub300\uc0ac " + i + " \uce90\ub9ad\ud130",
    line: (i) => "\ub300\uc0ac " + i,
    addLine: "\ub300\uc0ac \ucd94\uac00",
    removeLine: "\ub300\uc0ac \uc0ad\uc81c",
    screenHint: "\ub9e8 \uc55e\uc5d0 \uc52c \uae38\uc774(\uc608: \uc57d 3.5\ucd08), \uadf8\ub2e4\uc74c \uba87 \ucd08\uc5d0 \ubb34\uc5c7\uc774 \uc5b4\ub514\uc5d0 \ub728\ub294\uc9c0.",
    excerpt: "\uae30\uc0ac \uc6d0\ubb38\uacfc \ucd9c\ucc98 (\uadf8\ub300\ub85c)",
    create: "\uc0dd\uc131\ud558\uae30",
    creating: "Clipper\uc5d0 \ubcf4\ub0b4\ub294 \uc911\u2026",
    sent: "Clipper\uac00 Draft\ub97c \ub9cc\ub4e4\uace0 \uc788\uc5b4\uc694. Clipper\uc5d0\uc11c \ud655\uc778\ud558\uc138\uc694.",
    needUpdate: "\uc774 Selects \ubc84\uc804\uc740 \uc571\uc5d0\uc11c Clipper \uc0dd\uc131\uc744 \uc2dc\uc791\ud560 \uc218 \uc5c6\uc5b4\uc694. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud558\uc138\uc694.",
    missing: "\ucee8\uc149\uc744 \uc4f0\uace0, \ubaa8\ub4e0 \ub300\uc0ac\uc5d0 \ud654\uc790\uc640 \ub0b4\uc6a9\uc744, \uce90\ub9ad\ud130\ub9c8\ub2e4 \ucd2c\uc601 \uc601\uc0c1\uc744 \uace8\ub77c \uc8fc\uc138\uc694.",
  },
};

const uid = () => Math.random().toString(36).slice(2, 10);
const runId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
const planKey = (projectId) => "huick-alpha:plan:" + projectId;
const episodeTitle = (plan) => plan.concept.split("\n")[0].trim();
function speakingVideos(plan) {
  const speakers = new Set(plan.scenes.flatMap((scene) => scene.lines.map((line) => line.characterId)));
  return new Set(plan.characters.filter((character) => speakers.has(character.id)).map((character) => character.recording));
}
const newCharacter = () => ({ id: uid(), name: "", recording: "", direction: "" });
const newLine = (characterId) => ({ id: uid(), characterId, text: "" });
const newScene = (characterId) => ({ id: uid(), title: "", lines: [newLine(characterId)], screen: "", excerpt: "" });
function newPlan() {
  return { concept: "", credits: "", recordings: [], sourceDraft: null, cutouts: {}, cutoutNotes: {}, characters: [], materials: [], scenes: [newScene("")] };
}

function linkOnlyRecording(characters, recordings) {
  if (recordings.length !== 1 || characters.filter((character) => character.name.trim()).length !== 1) return characters;
  return characters.map((character) => character.name.trim() && !character.recording
    ? { ...character, recording: recordings[0].name }
    : character);
}

function addCharacterSlot(plan, lineId, slotName) {
  const named = plan.characters.filter((character) => character.name.trim());
  const names = new Set(named.map((character) => comparableName(character.name.trim())));
  let index = 1;
  while (names.has(comparableName(slotName(index)))) index++;
  const priorId = plan.scenes.flatMap((scene) => scene.lines).find((line) => line.id === lineId)?.characterId;
  const unnamed = plan.characters.find((character) => character.id === priorId && !character.name.trim());
  const speaker = { ...(unnamed ?? newCharacter()), name: slotName(index) };
  const characters = unnamed ? plan.characters.map((character) => character.id === priorId ? speaker : character) : [...plan.characters, speaker];
  const configured = new Set(plan.characters.filter((character) => character.recording || character.direction.trim()).map((character) => character.id));
  return {
    ...plan,
    characters: linkOnlyRecording(characters, characterVideos(mediaLibrary(plan))),
    scenes: plan.scenes.map((scene) => ({
      ...scene,
      lines: scene.lines.map((line) => line.id === lineId || (!named.length && !configured.has(line.characterId))
        ? { ...line, characterId: speaker.id }
        : line),
    })),
  };
}

function kindOf(name) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return Object.keys(KINDS).find((kind) => KINDS[kind].includes(ext));
}
function materialOf(path) {
  const name = path.split(/[\\/]/).pop();
  const kind = kindOf(name);
  if (!kind) return null;
  return { id: assetIdOf(path), name, kind, path };
}

function assetIdOf(path) {
  let hash = 0;
  for (const ch of path) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return "material-" + hash.toString(36);
}

function fileKey(file) {
  return file.path ? mediaPathKey(file.path) : "resource:" + (file.resourceId ?? file.id);
}

function mediaLibrary(plan) {
  const files = new Map();
  for (const recording of plan.recordings) {
    files.set(fileKey(recording), {
      ...recording, kind: "video", assetId: recording.path ? assetIdOf(recording.path) : null,
    });
  }
  for (const asset of plan.materials) {
    const key = fileKey(asset);
    files.set(key, { ...(files.get(key) ?? asset), assetId: asset.id });
  }
  return [...files.values()];
}

function characterVideos(files) {
  const names = new Set();
  return files.filter((file) => {
    if (file.kind !== "video" || (!file.path && !file.resourceId)) return false;
    const name = comparableName(file.name);
    if (names.has(name)) return false;
    names.add(name);
    return true;
  });
}

const quoted = (label, value) => (value.trim() ? label + ": " + JSON.stringify(value) : "");

// The same request Clipper's own production-plan form sent: the plan as text,
// the dialogue as a script document, and the scene compositions as data.
export function buildRequest(plan, projectId, sourceDraftId) {
  const cast = new Map(plan.characters.map((c) => [c.id, c]));
  const used = new Map();
  const script = [];
  const notes = [quoted("Overall concept", plan.concept)];
  const sceneNotes = [];
  plan.scenes.forEach((scene, index) => {
    const heading = "Scene " + (index + 1) + (scene.title.trim() ? " \u00b7 " + JSON.stringify(scene.title) : "");
    script.push(heading);
    sceneNotes.push(heading, quoted("Visual direction", scene.screen), quoted("Article excerpt (verbatim)", scene.excerpt));
    for (const line of scene.lines) {
      const character = cast.get(line.characterId);
      used.set(character.id, character);
      script.push(character.name + ":\n" + line.text);
    }
  });
  for (const c of used.values())
    notes.push(quoted("Character", c.name), quoted("Recording", c.recording), quoted("Character direction", c.direction));
  const cutNote = (name) => (plan.cutoutNotes?.[name] ?? "").trim();
  const cut = [...new Set([...used.values()].map((character) => character.recording))]
    .filter((name) => plan.cutouts[name]);
  // A checked recording with no request is chroma keyed; one with a request is
  // left for Clipper to choose (chroma key or AI mask) from what it says.
  const keyed = cut.filter((name) => !cutNote(name)).map((name) => name.normalize("NFC"));
  const requested = cut.filter((name) => cutNote(name)).map((name) => name.normalize("NFC"));
  for (const name of cut) notes.push(quoted("Cutout request for " + JSON.stringify(name), cutNote(name)));
  const assets = mediaLibrary(plan).filter((file) => file.path).map(({ assetId, name, kind, path }) => ({
    id: assetId, name, kind, path: path.startsWith("\\\\") ? path.replace(/\\/g, "/") : path,
  }));
  // Recordings are also insert material, for a frame that shows someone who is
  // not speaking (a two-shot or a reaction).
  const overlays = [...used.values()].flatMap((c) => {
    const asset = assets.find(({ name, kind }) => kind === "video" && name.normalize("NFC") === c.recording.normalize("NFC"));
    return asset ? [{
      assetId: asset.id, mode: "ai",
      instructions: "Cast recording of " + c.name + ". Its dialogue is already on the timeline. Use it as an insert only when the plan shows " + c.name + " on screen while someone else speaks (a two-shot or a reaction), at a moment where " + c.name + " is not speaking.",
    }] : [];
  });
  return {
    projectId,
    template: DEFAULT_TEMPLATE,
    sourceDraftId,
    note: [...notes, ...sceneNotes].filter(Boolean).join("\n"),
    documents: [{ name: SCRIPT_DOCUMENT, purpose: "script", text: script.join("\n\n") }],
    additionalContent: {
      assets,
      overlays,
      materialAssetIds: assets.map(({ id }) => id),
      productionCredits: plan.credits,
      chromaKeyVideoNames: keyed,
      cutoutVideoNames: requested,
    },
  };
}

function complete(plan, videos) {
  const cast = new Map(plan.characters.map((c) => [c.id, c]));
  const recordings = new Set(videos.map((recording) => recording.name));
  return (
    plan.concept.trim() &&
    plan.scenes.length > 0 &&
    plan.scenes.every((s) => s.lines.length && s.lines.every((l) => l.text.trim() && cast.get(l.characterId)?.name.trim() && recordings.has(cast.get(l.characterId)?.recording)))
  );
}

const SOURCE_COPY = {
  en: {
    files: "Files", video: "Source video", noProject: "Open a project to start an episode.",
    pick: "Choose file", pickFolder: "Choose folder", drop: "Drop files or folders here", project: "Project footage", projectPick: "Choose an existing video",
    loading: "Reading files…", unavailable: "Use files stored locally on this computer.",
    noMedia: "No new supported media was found.", skipped: (count) => "Could not read " + count + " file or folder entries.",
    emptyProject: "This project has no videos to add.", remove: "Remove",
    chooseSpeaker: "Choose character", article: "Article and source",
    directionPrompt: "Direction prompt", insertAsset: "Reference asset",
    sceneNumber: (n) => "Scene " + n, dialogueHint: "Write what the speaker says",
    chooseRecording: "Choose video", removeBackground: "Remove background",
    noBackgroundVideos: "Add a video in Files to set up background removal.",
    addRecording: "Connect footage to the characters.", assignSpeakers: "Choose the character for each line.",
    createSource: "Preparing the footage…", storage: "The plan could not be saved.",
    production: "Production", history: "Run history", emptyHistory: "No saved runs yet.",
    retryHistory: "Try again", loadPlan: "Load plan", openResult: "View result",
    historyOptions: "Run options", untitledResult: (n) => "Clip " + n,
    resultUnavailable: "Clipper result links are unavailable in this version of Selects.",
    confirmLoad: "Load this run’s plan into the current editor?", cancel: "Cancel", checkRun: "Check in Clipper",
    historyError: "Could not read Clipper’s run status.", untitled: "Untitled episode",
    runStates: { running: "Creating", completed: "Complete", failed: "Failed", cancelled: "Cancelled", interrupted: "Interrupted" },
  },
  ko: {
    files: "\ud30c\uc77c", video: "\uc6d0\ubcf8 \uc601\uc0c1", noProject: "\ud504\ub85c\uc81d\ud2b8\ub97c \uc5f4\uace0 \ud68c\ucc28\ub97c \ub9cc\ub4e4\uc5b4 \uc8fc\uc138\uc694.",
    pick: "\ud30c\uc77c \uc120\ud0dd", pickFolder: "\ud3f4\ub354 \uc120\ud0dd", drop: "\ud30c\uc77c\uc774\ub098 \ud3f4\ub354\ub97c \uc5ec\uae30\uc5d0 \ub4dc\ub86d", project: "\ud504\ub85c\uc81d\ud2b8 \uc601\uc0c1", projectPick: "\ud504\ub85c\uc81d\ud2b8\uc5d0\uc11c \uc601\uc0c1 \uc120\ud0dd",
    loading: "\ud30c\uc77c\uc744 \ud655\uc778\ud558\ub294 \uc911…", unavailable: "\uc774 \uae30\uae30\uc5d0 \uc800\uc7a5\ub41c \ud30c\uc77c\uc744 \ucd94\uac00\ud574 \uc8fc\uc138\uc694.",
    noMedia: "\ucd94\uac00\ud560 \uc0c8 \ubbf8\ub514\uc5b4 \ud30c\uc77c\uc774 \uc5c6\uc5b4\uc694.", skipped: (count) => "\uc77d\uc744 \uc218 \uc5c6\ub294 \ud30c\uc77c \ub610\ub294 \ud3f4\ub354 " + count + "\uac1c\ub97c \uac74\ub108\ub6f0\uc5c8\uc5b4\uc694.",
    emptyProject: "\ucd94\uac00\ud560 \ud504\ub85c\uc81d\ud2b8 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.", remove: "\uc81c\uac70",
    chooseSpeaker: "\uce90\ub9ad\ud130 \uc120\ud0dd", article: "\uae30\uc0ac \uc6d0\ubb38\uacfc \ucd9c\ucc98",
    directionPrompt: "\uc5f0\ucd9c \ud504\ub86c\ud504\ud2b8", insertAsset: "\uc5d0\uc14b \ucc38\uc870",
    sceneNumber: (n) => "\uc52c " + n, dialogueHint: "\uce90\ub9ad\ud130\uac00 \ub9d0\ud558\ub294 \ub0b4\uc6a9\uc744 \uc785\ub825",
    chooseRecording: "\uc601\uc0c1 \uc120\ud0dd", removeBackground: "\ubc30\uacbd \uc81c\uac70",
    noBackgroundVideos: "\ud30c\uc77c\uc5d0 \uc601\uc0c1\uc744 \ucd94\uac00\ud558\uba74 \uc5ec\uae30\uc11c \ubc30\uacbd \uc81c\uac70\ub97c \uc124\uc815\ud560 \uc218 \uc788\uc5b4\uc694.",
    addRecording: "\uce90\ub9ad\ud130\uc5d0 \uc601\uc0c1\uc744 \uc5f0\uacb0\ud574 \uc8fc\uc138\uc694.", assignSpeakers: "\uac01 \ub300\uc0ac\uc758 \uce90\ub9ad\ud130\ub97c \uc9c0\uc815\ud574 \uc8fc\uc138\uc694.",
    createSource: "\uc6d0\ubcf8 \uc601\uc0c1\uc744 \uc900\ube44\ud558\ub294 \uc911…", storage: "\uae30\ud68d\uc744 \uc800\uc7a5\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    production: "\uc81c\uc791", history: "\uc791\uc5c5 \ub0b4\uc5ed", emptyHistory: "\uc544\uc9c1 \uc800\uc7a5\ub41c \uc791\uc5c5\uc774 \uc5c6\uc5b4\uc694.",
    retryHistory: "\ub2e4\uc2dc \uc2dc\ub3c4", loadPlan: "\uae30\ud68d \ubd88\ub7ec\uc624\uae30", openResult: "\uacb0\uacfc \ubcf4\uae30",
    historyOptions: "\uc791\uc5c5 \uc635\uc158", untitledResult: (n) => "\ud074\ub9bd " + n,
    resultUnavailable: "\uc774 Selects \ubc84\uc804\uc5d0\uc11c\ub294 Clipper \uacb0\uacfc\ub85c \ubc14\ub85c \uc774\ub3d9\ud560 \uc218 \uc5c6\uc5b4\uc694.",
    confirmLoad: "\uc9c0\uae08 \ud3b8\uc9d1 \uc911\uc778 \ub0b4\uc6a9\uc744 \uc774 \uae30\ud68d\uc73c\ub85c \ubc14\uafc0\uae4c\uc694?", cancel: "\ucde8\uc18c", checkRun: "Clipper\uc5d0\uc11c \ud655\uc778",
    historyError: "Clipper \uc0dd\uc131 \uc0c1\ud0dc\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694.", untitled: "\uc81c\ubaa9 \uc5c6\ub294 \uae30\ud68d",
    runStates: { running: "\uc0dd\uc131 \uc911", completed: "\uc644\ub8cc", failed: "\uc2e4\ud328", cancelled: "\ucde8\uc18c\ub428", interrupted: "\uc911\ub2e8\ub428" },
  },
};

const column = { minWidth: 0, display: "grid", gap: 6, alignContent: "start" };
const scriptColumn = { width: "100%", maxWidth: "840px", marginInline: "auto" };
const SCRIPT_STYLES = `
  .huick-script { display: grid; gap: 18px; }
  .huick-script h3, .huick-section-heading { margin: 0; color: var(--foreground, var(--panel-fg)); font-size: 14px; font-weight: 650; }
  .huick-script-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 8px; margin-bottom: 6px; }
  .huick-script-field { display: block; box-sizing: border-box; width: 100%; min-width: 0; margin: 0; padding: 6px 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; color: var(--panel-fg); font: inherit; text-align: start; }
  .huick-script-field::placeholder { color: var(--panel-muted-fg); opacity: 1; }
  .huick-script-field:hover { background-color: var(--panel-accent); }
  .huick-script-field:focus { border-color: var(--panel-muted-fg); background-color: var(--panel-muted); outline: none; }
  .huick-script textarea { line-height: 1.55; resize: vertical; }
  .huick-script textarea.huick-dialogue { min-height: 36px; field-sizing: content; }
  @supports (field-sizing: content) {
    .huick-script textarea.huick-dialogue { resize: none; }
  }
  .huick-script textarea.huick-concept { min-height: 62px; margin-bottom: 8px; border-color: var(--panel-border); background: var(--panel-muted); }
  .huick-script textarea.huick-concept:focus { border-color: var(--panel-muted-fg); }
  .huick-select { position: relative; min-width: 0; }
  .huick-select::after { content: ""; position: absolute; inset-inline-end: 10px; top: calc(50% - 4px); width: 5px; height: 5px; border: solid var(--panel-muted-fg); border-width: 0 1px 1px 0; transform: rotate(45deg); pointer-events: none; }
  .huick-script select { appearance: none; padding-inline-end: 23px; cursor: pointer; text-overflow: ellipsis; }
  .huick-script select[data-empty="true"] { color: var(--panel-muted-fg); }
  .huick-script select option { background: var(--panel-muted); color: var(--panel-fg); }
  .huick-scene { border: 1px solid var(--panel-border); border-radius: var(--panel-radius, 6px); min-width: 0; }
  .huick-scene-title { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 4px; padding: 6px 8px; background: var(--panel-muted); border-radius: var(--panel-radius, 6px) var(--panel-radius, 6px) 0 0; }
  .huick-scene-lines { container: huick-lines / inline-size; min-width: 0; }
  .huick-scene-number { color: var(--panel-muted-fg); padding-inline: 6px; white-space: nowrap; }
  .huick-scene-picker { max-width: 93px; }
  .huick-scene-title input { grid-column: 2; font-weight: 600; }
  .huick-line { display: grid; grid-template-columns: minmax(92px, 24%) minmax(0, 1fr) auto; grid-template-areas: "speaker dialogue remove"; align-items: start; gap: 2px 6px; padding: 8px; border-top: 1px solid var(--panel-border); }
  .huick-speaker { grid-area: speaker; }
  .huick-dialogue { grid-area: dialogue; }
  .huick-line-remove { grid-area: remove; }
  .huick-scene-tools { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0 8px; padding: 2px 8px; border-top: 1px solid var(--panel-border); }
  .huick-disclosure { display: inline-flex; align-items: center; width: auto; min-height: 32px; gap: 7px; padding: 6px; border: 0; border-radius: 4px; background: transparent; color: var(--panel-muted-fg); font: inherit; cursor: pointer; }
  .huick-disclosure::before { content: ""; width: 5px; height: 5px; border: solid currentColor; border-width: 0 1px 1px 0; transform: rotate(-45deg); }
  .huick-disclosure[aria-expanded="true"]::before { transform: rotate(45deg); }
  .huick-disclosure:hover, .huick-disclosure:focus-visible { color: var(--panel-fg); background: var(--panel-accent); }
  .huick-disclosure:focus-visible { outline: 1px solid var(--panel-muted-fg); }
  .huick-scene-prompt { display: grid; justify-items: start; gap: 5px; min-width: 0; border-top: 1px solid var(--panel-border); padding: 10px 12px; }
  .huick-prompt-header { display: flex; width: 100%; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px 8px; }
  .huick-scene-prompt label { font-size: 12px; font-weight: 650; margin: 0; }
  .huick-scene-prompt textarea { border-color: var(--panel-border); background: var(--panel-muted); min-height: 78px; }
  .huick-asset-picker { width: max-content; max-width: 100%; }
  .huick-asset-picker select { border-color: var(--panel-border); field-sizing: fixed; max-width: 155px; }
  .huick-file-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--panel-border); border-radius: var(--panel-radius, 6px); max-height: 252px; overflow: auto; container: huick-files / inline-size; }
  .huick-panel-tabs { position: sticky; top: 0; z-index: 1; display: flex; flex-wrap: wrap; gap: 2px; padding-bottom: 6px; border-bottom: 1px solid var(--panel-border); background: var(--background); }
  .huick-panel-tab { width: auto; height: 28px; border: 0; border-radius: var(--panel-radius, 6px); padding: 0 10px; background: transparent; color: var(--panel-muted-fg); font: inherit; font-weight: 600; cursor: pointer; }
  .huick-panel-tab:hover:not(:disabled), .huick-panel-tab[aria-pressed="true"] { background: var(--panel-muted); color: var(--panel-fg); }
  .huick-history-list { list-style: none; margin: 0; padding: 0; }
  .huick-history-row { border-bottom: 1px solid var(--panel-border); }
  .huick-history-main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px; align-items: center; padding-inline-end: 4px; }
  .huick-history-entry { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; width: 100%; height: auto; align-items: center; gap: 8px; padding: 8px; border: 0; border-radius: var(--panel-radius, 6px); background: transparent; color: var(--panel-fg); font: inherit; text-align: start; }
  button.huick-history-entry { cursor: pointer; }
  button.huick-history-entry:hover:not(:disabled), .huick-history-entry[aria-expanded="true"] { background: var(--panel-muted); }
  .huick-panel-tab:focus-visible, .huick-history-entry:focus-visible { outline: 1px solid var(--panel-muted-fg); outline-offset: -1px; }
  .huick-history-title { display: flex; flex-direction: column; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
  .huick-history-results { list-style: none; margin: 2px 6px 6px 16px; padding: 0 0 0 6px; border-inline-start: 1px solid var(--panel-border); }
  .huick-history-result { grid-template-columns: minmax(0, 1fr) auto; min-height: 30px; padding-block: 5px; overflow-wrap: anywhere; }
  .huick-history-confirm { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; padding: 4px 8px 8px; }
  .huick-file-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 6px 8px; }
  .huick-file-row + .huick-file-row { border-top: 1px solid var(--panel-border); }
  .huick-file-name { font-size: 12px; font-weight: 600; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .huick-file-preview { position: relative; width: 60px; aspect-ratio: 16 / 9; display: grid; place-items: center; background: var(--panel-muted); border-radius: 4px; overflow: hidden; }
  .huick-cutout-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--panel-border); border-radius: var(--panel-radius, 6px); }
  .huick-cutout-list li + li { border-top: 1px solid var(--panel-border); }
  .huick-cutout-row { display: grid; grid-template-columns: minmax(0, 1fr) 42px; align-items: center; gap: 6px; padding: 4px 8px; }
  .huick-cutout-name { grid-column: 1; min-width: 0; font-size: 12px; font-weight: 600; overflow-wrap: anywhere; }
  .huick-cutout-switch { grid-column: 2; display: grid; place-items: center; width: 42px; min-height: 32px; padding: 0; border: 0; border-radius: 4px; background: transparent; cursor: pointer; }
  .huick-cutout-switch:hover { background: var(--panel-accent); }
  .huick-cutout-switch:focus-visible { outline: 1px solid var(--panel-ring); }
  .huick-cutout-track { position: relative; width: 34px; height: 18px; border-radius: 9px; background: var(--panel-input, var(--panel-border)); }
  .huick-cutout-track::before { content: ""; position: absolute; inset-block-start: 2px; inset-inline-start: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--background, #181818); }
  .huick-cutout-switch[aria-checked="true"] .huick-cutout-track { background: var(--panel-key, #a3e635); }
  .huick-cutout-switch[aria-checked="true"] .huick-cutout-track::before { inset-inline-start: 18px; }
  .huick-cutout-memo { padding: 0 8px 8px; }
  @container huick-files (max-width: 360px) {
    .huick-file-row { gap: 6px; }
    .huick-file-preview { width: 48px; }
    .huick-file-name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; white-space: normal; overflow-wrap: anywhere; }
  }
  @container huick-lines (max-width: 420px) {
    .huick-line { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "speaker remove" "dialogue dialogue"; }
    .huick-speaker { width: fit-content; max-width: 100%; }
  }
`;
const quiet = { color: "var(--panel-muted-fg)", fontSize: 11, overflowWrap: "anywhere" };
const actions = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 };
const mediaCard = {
  ...column, padding: 10, border: "1px solid var(--panel-border)",
  borderRadius: "var(--panel-radius)",
};

const js = JSON.stringify;
const comparableName = (name) => name.normalize("NFC").toLowerCase();
function mediaPathKey(path) {
  return /^(?:[a-z]:[\\/]|\\\\|\/\/[^/])/i.test(path)
    ? path.replace(/\\/g, "/").normalize("NFC").toLowerCase()
    : path.normalize("NFC");
}

let nextDropCall = -Date.now();
function pathOfDroppedFile(file) {
  const callId = nextDropCall--;
  return new Promise((resolve) => {
    const finish = (value) => {
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      resolve(value);
    };
    const receive = (event) => {
      if (event.source === window.parent && event.data?.type === "panel:sdk-result" && event.data.callId === callId) {
        finish(event.data.ok && typeof event.data.value === "string" ? event.data.value : null);
      }
    };
    const timer = setTimeout(() => finish(null), 15000);
    window.addEventListener("message", receive);
    try {
      window.parent.postMessage({ type: "panel:file-path", callId, file }, "*");
    } catch {
      finish(null);
    }
  });
}

function fileFromEntry(entry) {
  return new Promise((resolve) => entry.file(resolve, () => resolve(null)));
}

async function droppedDirectoryFiles(entry) {
  const files = [];
  try {
    const reader = entry.createReader();
    while (true) {
      const entries = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (!entries.length) return files;
      for (const child of entries) {
        if (child.name.startsWith(".")) continue;
        if (child.isDirectory) files.push(...await droppedDirectoryFiles(child));
        else if (child.isFile && kindOf(child.name)) {
          files.push(await fileFromEntry(child).catch(() => null));
        }
      }
    }
  } catch {
    return [...files, null];
  }
}

async function droppedMediaPaths(transfer, resolvePath = pathOfDroppedFile) {
  // Capture handles before awaiting. Native file drops with identical basenames
  // must use getAsFile(), while folders expose their children through entries.
  const fallback = Array.from(transfer.files);
  const items = Array.from(transfer.items).filter((item) => item.kind === "file");
  const captured = items.map((item, index) => {
    let file;
    let entry;
    try { file = item.getAsFile(); } catch {}
    try { entry = item.webkitGetAsEntry?.(); } catch {}
    return { file: file ?? fallback[index], entry };
  });
  const files = captured.length
    ? (await Promise.all(captured.map(async ({ file, entry }) => {
      if (entry?.isDirectory) return droppedDirectoryFiles(entry);
      if (file) return [file];
      return [entry?.isFile && kindOf(entry.name) ? await fileFromEntry(entry).catch(() => null) : null];
    }))).flat()
    : fallback;
  const paths = [];
  let failed = 0;
  for (let i = 0; i < files.length; i += 24) {
    const results = await Promise.allSettled(files.slice(i, i + 24).map((file) =>
      !file ? null : kindOf(file.name) && !file.name.startsWith(".") ? resolvePath(file) : ""));
    for (const result of results) {
      if (result.status === "rejected" || result.value === null) failed++;
      else if (result.value) paths.push(result.value);
    }
  }
  return { paths, failed };
}

async function run(sdk, summary, script, allowCommit = false) {
  const reply = await sdk.runScript({ summary, script, allowCommit });
  if (reply.isError) throw new Error(reply.output);
  return reply.result;
}

const FOLDER_SCAN = String.raw`
const paths: string[] = [];
const seen = new Set<number>();
let failed = 0;
const sep = /^(?:[a-z]:[\\/]|\\\\|\/\/[^/])/i.test(root) ? "\\" : "/";
async function visit(dir: string, ino?: number) {
  if (ino && seen.has(ino)) return;
  if (ino) seen.add(ino);
  for (const name of await selects.files.readdir(dir)) {
    if (name.startsWith(".")) continue;
    const path = dir.replace(/[\\/]+$/, "") + sep + name;
    try {
      const entry = await selects.files.stat(path);
      if (entry?.isDirectory) await visit(path, entry.ino);
      else if (entry && extensions.includes(name.slice(name.lastIndexOf(".") + 1).toLowerCase())) paths.push(path);
    } catch { failed++; }
  }
}
const info = await selects.files.stat(root);
if (!info?.isDirectory) throw new Error("Folder is unavailable.");
await visit(root, info.ino);
return { paths, failed };
`;

function readFolderMedia(sdk, root) {
  const extensions = Object.values(KINDS).flat();
  return run(sdk, "Read files in the selected folder", "const root = " + js(root) + ", extensions = " + js(extensions) + ";\n" + FOLDER_SCAN);
}

async function readFootage(sdk, paths) {
  const videos = [];
  for (let i = 0; i < paths.length; i += 16) {
    const result = await run(sdk, "Read the selected footage", [
      "const report = await selects.media.probe({ filePaths: " + js(paths.slice(i, i + 16)) + " });",
      "if (report.error) throw new Error(report.error);",
      "return await Promise.all((report.files ?? []).filter(row => row.type === 'video' && row.duration > 0).map(async row => ({ path: row.path, seconds: row.duration, url: await selects.files.localUrl(row.path).catch(() => null) })));",
    ].join("\n"));
    videos.push(...result);
  }
  return videos.map((row) => ({ ...row, id: row.path, name: materialOf(row.path).name }));
}

const PROJECT_FILE_TREE = [
    "const inventory = await project.sourceFiles();",
    "const tree = 'fileTree' in inventory ? [...inventory.fileTree] : [];",
    "if (!('fileTree' in inventory)) for (const folder of inventory.folders ?? []) {",
    "  const detail = await project.sourceFiles({ folder: folder.name });",
    "  if ('fileTree' in detail) tree.push(...detail.fileTree);",
    "}",
];

function projectFootageScript(projectId) {
  return [
    "const project = selects.project(" + js(projectId) + ");",
    ...PROJECT_FILE_TREE,
    "const videos = new Map();",
    "for (const node of tree) { if (node.type === 'dir') tree.push(...node.children); else if (node.type === 'video') videos.set(node.resourceId, node); }",
    "const rows = await project.resources();",
    "return await Promise.all(rows.filter(row => String(row.type).toLowerCase() === 'video').map(async row => { const path = videos.get(row.resourceId)?.path; return { id: row.resourceId, resourceId: row.resourceId, name: row.name, seconds: row.durationSeconds, path, url: path ? await selects.files.localUrl(path).catch(() => null) : null }; }));",
  ].join("\n");
}

async function prepareSource(sdk, projectId, recordings, saved, name) {
  const key = recordings.map((recording) => recording.id).join("\n");
  if (saved?.key === key) {
    const exists = await run(sdk, "Check the prepared source Draft", "return (await selects.draft(" + js(saved.id) + ").clips()).some(row => row.resourceId != null);").catch(() => false);
    if (exists) return saved;
  }

  const ids = await run(sdk, "Import the selected recordings", [
    "const project = selects.project(" + js(projectId) + ");",
    "if (typeof selects.clipper.startRun !== 'function') return null;",
    ...PROJECT_FILE_TREE,
    "const mediaPathKey = (" + mediaPathKey.toString() + ");",
    "const byPath = new Map();",
    "for (const node of tree) { if (node.type === 'dir') tree.push(...node.children); else if (node.type === 'video' && node.path) byPath.set(mediaPathKey(node.path), node.resourceId); }",
    "const ids = [];",
    "const recordings: Array<{ path?: string; name: string; resourceId?: string }> = " + js(recordings.map(({ path, name, resourceId }) => ({ path, name, resourceId }))) + ";",
    "for (const file of recordings) {",
    "  const existing = file.resourceId || (file.path && byPath.get(mediaPathKey(file.path)));",
    "  if (existing) { ids.push(existing); continue; }",
    "  if (!file.path) throw new Error(file.name);",
    "  const { addedResourceIds } = await project.importFiles({ paths: [file.path] });",
    "  if (addedResourceIds.length !== 1) throw new Error(file.name);",
    "  ids.push(addedResourceIds[0]);",
    "}",
    "return ids;",
  ].join("\n"), true);
  if (ids === null) return null;
  if (!Array.isArray(ids) || ids.length !== recordings.length) throw new Error("Could not resolve all recording IDs");

  const id = await run(sdk, "Prepare a Clipper source Draft", [
    "const draft = await selects.project(" + js(projectId) + ").createDraft({ name: " + js(name) + " });",
    "for (const resourceId of " + js(ids) + ") await draft.insertResource({ resourceId });",
    "return (await draft.commitAll('Prepare the selected recordings for Clipper')).createdDraftId;",
  ].join("\n"), true);
  if (!id) throw new Error("Could not save the Clipper source Draft");
  return { id, key };
}

function duration(seconds) {
  if (!Number.isFinite(seconds)) return "";
  const value = Math.floor(seconds);
  return Math.floor(value / 60) + ":" + String(value % 60).padStart(2, "0");
}

function Preview({ ui, file, url }) {
  const previewStyle = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  const hideFailedPreview = (event) => { event.currentTarget.hidden = true; };
  return (
    <div aria-hidden="true" className="huick-file-preview">
      <ui.Icon name={file.kind === "video" ? "video" : "file"} />
      {file.kind === "image" && url &&
        <img key={url} src={url} alt="" loading="lazy" style={previewStyle} onError={hideFailedPreview} />}
      {file.kind === "video" && url && <video key={url} src={url} preload="metadata" muted playsInline
        onLoadedMetadata={(event) => { if (event.currentTarget.duration > 0.1) event.currentTarget.currentTime = 0.1; }}
        onError={hideFailedPreview} style={previewStyle} />}
    </div>
  );
}

export default function Panel({ sdk, context, ui }) {
  const S = SOURCE_COPY[context.language] ?? SOURCE_COPY.en;
  if (!context.projectId) return <ui.Message>{S.noProject}</ui.Message>;
  return <ProjectPanel key={context.projectId} sdk={sdk} context={context} ui={ui} />;
}

function ProjectPanel({ sdk, context, ui }) {
  const T = STRINGS[context.language] ?? STRINGS.en;
  const S = SOURCE_COPY[context.language] ?? SOURCE_COPY.en;
  const { projectId } = context;
  const key = planKey(projectId);
  const [plan, setPlan] = useState(newPlan);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("production");
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [runResults, setRunResults] = useState(null);
  const [historyError, setHistoryError] = useState(false);
  const [restoreId, setRestoreId] = useState(null);
  const [ready, setReady] = useState(false);
  const [sceneId, setSceneId] = useState(null);
  const [canOpenTemplate, setCanOpenTemplate] = useState(false);
  const [templateOpenError, setTemplateOpenError] = useState("");
  const [notesSceneId, setNotesSceneId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [previewUrls, setPreviewUrls] = useState({});
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showNoticeByFiles, setShowNoticeByFiles] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const active = useRef(false);
  const canSave = useRef(false);
  const historyRef = useRef([]);
  const latestPlan = useRef(plan);
  const writes = useRef(Promise.resolve());
  latestPlan.current = plan;
  const promptField = useRef(null);
  const promptSelection = useRef(null);
  const library = mediaLibrary(plan);
  const videos = characterVideos(library);
  const previewPathsKey = js(library.filter((file) => file.path && !file.url && file.kind !== "audio").map((file) => file.path));

  const savePlan = (nextPlan, changeHistory) => {
    const write = writes.current.catch(() => {}).then(async () => {
      const previous = historyRef.current;
      const entries = changeHistory ? changeHistory(previous) : previous;
      await sdk.storage.setItem(key, js({ ...(nextPlan ?? latestPlan.current), runHistory: entries }));
      if (entries !== previous) {
        historyRef.current = entries;
        setHistory(entries);
      }
      setSaveError(false);
    });
    writes.current = write;
    return write;
  };

  useEffect(() => {
    let alive = true;
    void run(sdk, "Check whether the template editor can be opened",
      'return { available: "openExistingClipperTemplate" in selects.editor };')
      .then((result) => { if (alive) setCanOpenTemplate(result?.available === true); })
      .catch(() => { if (alive) setCanOpenTemplate(false); });
    return () => { alive = false; };
  }, [sdk]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const stored = await sdk.storage.getItem(key);
        let legacy = null;
        if (!stored) {
          try { legacy = localStorage.getItem(key); } catch {}
        }
        const saved = JSON.parse(stored ?? legacy ?? "null");
        if (saved?.recordings?.some((file) => file.resourceId && !file.path)) {
          const projectFiles = await run(sdk, "Resolve saved project files", projectFootageScript(projectId)).catch(() => []);
          const byId = new Map((projectFiles ?? []).map((file) => [file.resourceId, file]));
          saved.recordings = saved.recordings.map((file) => {
            const resolved = byId.get(file.resourceId);
            return file.path || !resolved?.path ? file : { ...file, path: resolved.path, url: resolved.url };
          });
        }
        if (alive) {
          canSave.current = true;
          if (saved) {
            const { runHistory, ...savedPlan } = saved;
            historyRef.current = Array.isArray(runHistory) ? runHistory : [];
            setHistory(historyRef.current);
            setPlan((initial) => ({ ...initial, ...savedPlan }));
          }
        }
      } catch {
        if (alive) setSaveError(true);
      } finally {
        if (alive) setReady(true);
      }
    }
    void load();
    return () => { alive = false; };
  }, [sdk, key, projectId]);

  useEffect(() => {
    if (ready && canSave.current) void savePlan().catch(() => setSaveError(true));
  }, [sdk, key, ready, plan]);
  useEffect(() => {
    if (!history.length) return;
    let alive = true;
    let timer;
    setHistoryError(false);
    const refresh = async (pending) => {
      const ids = new Set(pending.map((entry) => entry.id));
      try {
        const results = await run(sdk, "Read the results of saved Huick Alpha plans", `
          if (!("appRuns" in selects.clipper)) return null;
          const clipper = selects.clipper as typeof selects.clipper & {
            appRuns(input: { projectId: string; appRunIds: string[] }): Promise<unknown[]>;
          };
          const ids: string[] = ${js([...ids])};
          const results: unknown[] = [];
          for (let i = 0; i < ids.length; i += 50) {
            results.push(...await clipper.appRuns({ projectId: ${js(projectId)}, appRunIds: ids.slice(i, i + 50) }));
          }
          return results;
        `);
        if (!alive) return;
        if (!Array.isArray(results)) {
          setRunResults(null);
          return;
        }
        setRunResults((previous) => [...(previous ?? []).filter((row) => !ids.has(row.appRunId)), ...results]);
        const states = new Map(results.map((row) => [row.appRunId, row.state]));
        const active = pending.filter((entry) => {
          const state = states.get(entry.id);
          return state === "running" || (!state && Date.now() - Date.parse(entry.createdAt) < 120_000);
        });
        if (active.length) timer = setTimeout(() => void refresh(active), 3000);
      } catch {
        if (alive) setHistoryError(true);
      }
    };
    void refresh(history);
    return () => { alive = false; clearTimeout(timer); };
  }, [sdk, projectId, history, historyRevision]);
  useEffect(() => {
    let alive = true;
    if (previewPathsKey !== "[]") {
      void run(sdk, "Preview local files", [
        "const paths: string[] = " + previewPathsKey + ";",
        "return Object.fromEntries(await Promise.all(paths.map(async path => [path, await selects.files.localUrl(path).catch(() => null)])));",
      ].join("\n")).then((urls) => { if (alive) setPreviewUrls(urls); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [sdk, previewPathsKey]);

  const showError = (cause) => setError(String(cause?.message || cause));
  const act = async (label, task) => {
    if (active.current) return;
    active.current = true;
    setShowNoticeByFiles(label === S.loading);
    setError("");
    setStatus("");
    setBusy(label);
    try { await task(); }
    catch (cause) { showError(cause); }
    finally { active.current = false; setBusy(""); }
  };
  const patch = (value) => setPlan((previous) => ({ ...previous, ...value }));
  const setCharacter = (id, value) => setPlan((previous) => ({
    ...previous, characters: previous.characters.map((character) => character.id === id ? { ...character, ...value } : character),
  }));
  const scene = plan.scenes.find((item) => item.id === sceneId) ?? plan.scenes[0];
  const setScene = (value) => setPlan((previous) => ({
    ...previous, scenes: previous.scenes.map((item) => item.id === scene.id ? { ...item, ...value } : item),
  }));
  const setLine = (id, value) => setScene({ lines: scene.lines.map((line) => line.id === id ? { ...line, ...value } : line) });
  const insertAsset = (name) => {
    const field = promptField.current;
    const value = field.value;
    const { start, end } = promptSelection.current?.sceneId === scene.id
      ? promptSelection.current
      : { start: value.length, end: value.length };
    const before = start > 0 && !/\s/.test(value[start - 1]) ? " " : "";
    const after = end < value.length && !/[\s,.;:!?)]/.test(value[end]) ? " " : "";
    field.setRangeText(before + "[" + name + "]" + after, start, end, "end");
    promptSelection.current = { sceneId: scene.id, start: field.selectionStart, end: field.selectionEnd };
    setScene({ screen: field.value });
    field.focus();
  };
  const addCharacter = (lineId = null) => setPlan((current) => addCharacterSlot(current, lineId, T.characterSlot));

  const addFiles = (recordings, materials) => setPlan((previous) => {
    const next = {
      ...previous,
      recordings: [...previous.recordings, ...recordings],
      materials: [...previous.materials, ...materials],
    };
    if (recordings.length) {
      next.sourceDraft = null;
      next.characters = linkOnlyRecording(previous.characters, characterVideos(mediaLibrary(next)));
    }
    return next;
  });

  const removeFile = (file) => {
    const key = fileKey(file);
    const usedAsVideo = videos.some((video) => fileKey(video) === key);
    const { name } = file;
    setPlan((previous) => ({
      ...previous,
      recordings: previous.recordings.filter((item) => fileKey(item) !== key),
      materials: previous.materials.filter((item) => fileKey(item) !== key),
      sourceDraft: usedAsVideo ? null : previous.sourceDraft,
      characters: usedAsVideo
        ? previous.characters.map((character) => character.recording === name ? { ...character, recording: "" } : character)
        : previous.characters,
      cutouts: usedAsVideo ? { ...previous.cutouts, [name]: false } : previous.cutouts,
      cutoutNotes: usedAsVideo ? { ...previous.cutoutNotes, [name]: "" } : previous.cutoutNotes,
    }));
  };

  const addPaths = async ({ paths, failed = 0 }) => {
    const known = new Set(library.map(fileKey));
    const materials = [];
    const videoPaths = [];
    for (const path of paths) {
      const file = materialOf(path);
      if (!file || known.has(mediaPathKey(path))) continue;
      known.add(mediaPathKey(path));
      if (file.kind === "video") videoPaths.push(path);
      else materials.push(file);
    }
    const recordings = await readFootage(sdk, videoPaths);
    if (recordings.length || materials.length) addFiles(recordings, materials);
    const missed = failed + videoPaths.length - recordings.length;
    if (missed) setError(S.skipped(missed));
    else if (!recordings.length && !materials.length) setError(S.noMedia);
  };

  const chooseFolder = () => act(S.loading, async () => {
    const root = await run(sdk, "Choose a folder", "return await selects.editor.pickDirectory();");
    if (root) await addPaths(await readFolderMedia(sdk, root));
  });
  const chooseFile = () => act(S.loading, async () => {
    const filters = [{ name: S.files, extensions: Object.values(KINDS).flat() }];
    const path = await run(sdk, "Choose a media file", "return await selects.editor.pickFile({ filters: " + js(filters) + " });");
    if (path) await addPaths({ paths: [path] });
  });

  const create = () => act(S.createSource, async () => {
    if (!canSave.current || !complete(plan, videos)) return;
    const title = episodeTitle(plan).slice(0, 80);
    const names = speakingVideos(plan);
    const sources = videos.filter((video) => names.has(video.name));
    const source = await prepareSource(sdk, projectId, sources, plan.sourceDraft, title + " · " + S.video);
    if (!source) throw new Error(T.needUpdate);
    const id = runId();
    const snapshot = { ...plan, sourceDraft: source };
    patch({ sourceDraft: source });
    try {
      await savePlan(undefined, (entries) => [{ id, createdAt: new Date().toISOString(), plan: snapshot }, ...entries]);
    } catch {
      throw new Error(S.storage);
    }
    setView("history");
    setSelectedRunId(null);
    setBusy(T.creating);
    const request = buildRequest(snapshot, projectId, source.id);
    request.additionalContent.appRunId = id;
    await run(sdk, "Start the production plan in Clipper", "return await selects.clipper.startRun(" + js(request) + ");", true);
    setStatus(T.sent);
  });
  const restorePlan = (entry) => act(S.loadPlan, async () => {
    await savePlan(entry.plan);
    latestPlan.current = entry.plan;
    setPlan(entry.plan);
    setSceneId(null);
    setNotesSceneId(null);
    setRestoreId(null);
    setView("production");
  });
  const openResult = (draftId) => act(S.openResult, async () => {
    const result = await run(sdk, "Open the clip result made from this plan", `
      const editor = selects.editor as typeof selects.editor & {
        openClipperResult?: (input: { projectId: string; draftId: string }) => Promise<unknown>;
      };
      if (typeof editor.openClipperResult !== "function") return null;
      return await editor.openClipperResult(${js({ projectId, draftId })});
    `);
    if (!result) throw new Error(S.resultUnavailable);
  });
  const openTemplate = async () => {
    setTemplateOpenError("");
    try {
      const request = js({ projectId, template: DEFAULT_TEMPLATE });
      await run(sdk, "Open the Huick Alpha template", `
        const editor = selects.editor as typeof selects.editor & {
          openExistingClipperTemplate(input: { projectId: string; template: string }): Promise<unknown>;
        };
        return await editor.openExistingClipperTemplate(${request});
      `);
    } catch (cause) {
      setTemplateOpenError(String(cause?.message || cause));
    }
  };

  const speakers = plan.characters.filter((character) => character.name.trim());
  const defaultSpeakerId = speakers.length === 1 ? speakers[0].id : "";
  const visibleCharacters = plan.characters.filter((character) => character.name.trim() || character.recording || character.direction.trim());
  const recordingOptions = videos.map(({ name }) => ({
    value: name, label: plan.cutouts[name] ? S.removeBackground + " · " + name : name,
  }));
  const alreadyPicked = new Set(library.map(fileKey));
  const selectable = (catalog ?? []).filter((file) => !alreadyPicked.has(fileKey(file)));
  const recorded = new Set(recordingOptions.map(({ value }) => value));
  const lines = plan.scenes.flatMap((item) => item.lines);
  const speakersById = new Map(speakers.map((speaker) => [speaker.id, speaker]));
  const needsSpeaker = lines.some((line) => !speakersById.has(line.characterId));
  const needsRecording = lines.some((line) => speakersById.has(line.characterId) && !recorded.has(speakersById.get(line.characterId).recording));
  const missingInput = !plan.concept.trim() || lines.some((line) => !line.text.trim())
    ? null
    : needsSpeaker ? S.assignSpeakers : needsRecording ? S.addRecording : null;
  const notices = <>
    {error && <ui.Message tone="error">{error}</ui.Message>}
    {status && <ui.Message tone="success">{status}</ui.Message>}
  </>;

  const files = (
    <section aria-label={S.files} style={{ ...column, gap: 12 }}>
      <h3 className="huick-section-heading">{S.files}</h3>
      <ui.Stack>
        <div style={{ ...mediaCard, borderStyle: "dashed", padding: 12,
          borderColor: dragging ? "var(--panel-fg)" : "var(--panel-border)", background: dragging ? "var(--panel-accent)" : undefined }}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = busy ? "none" : "copy";
            if (!busy) setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(false);
            const transfer = event.dataTransfer;
            void act(S.loading, async () => {
              const dropped = await droppedMediaPaths(transfer);
              if (!dropped.paths.length && dropped.failed) throw new Error(S.unavailable);
              await addPaths(dropped);
            });
          }}>
          <strong>{S.drop}</strong>
          <div style={actions}>
            <ui.Button variant="secondary" disabled={!!busy} onClick={chooseFile}>{S.pick}</ui.Button>
            <ui.Button variant="secondary" disabled={!!busy} onClick={chooseFolder}>{S.pickFolder}</ui.Button>
            <ui.Button variant="ghost" disabled={!!busy} onClick={() => {
              if (catalog) setCatalog(null);
              else void act(S.loading, async () => setCatalog(await run(sdk, "List project footage", projectFootageScript(projectId)) ?? []));
            }}>{S.project}</ui.Button>
          </div>
        </div>
        {catalog && (selectable.length ? (
          <ui.Select label={S.projectPick} placeholder={S.projectPick} options={selectable.map(({ id, name }) => ({ value: id, label: name }))} value={null}
            onChange={(id) => {
              const file = selectable.find((item) => item.id === id);
              if (file) addFiles([file], []);
              setCatalog(null);
            }} />
        ) : <ui.Message>{S.emptyProject}</ui.Message>)}
        {busy === S.loading && <ui.Progress label={S.loading} />}
        {showNoticeByFiles && notices}
      </ui.Stack>
      {library.length > 0 && <ul className="huick-file-list">
        {library.map((file) => (
          <li key={fileKey(file)} className="huick-file-row">
            <Preview ui={ui} file={file} url={previewUrls[file.path] ?? file.url} />
            <div style={{ minWidth: 0 }}>
              <div className="huick-file-name" title={file.name}>{file.name}</div>
              {Number.isFinite(file.seconds) && <span style={quiet}>{duration(file.seconds)}</span>}
            </div>
            <ui.IconButton icon="close" label={S.remove + " " + file.name} disabled={!!busy}
              onClick={() => removeFile(file)} />
          </li>
        ))}
      </ul>}
    </section>
  );

  const backgroundRemoval = (
    <section aria-label={S.removeBackground} style={{ ...column, gap: 8 }}>
      <h3 className="huick-section-heading">{S.removeBackground}</h3>
      {videos.length > 0 ? <ul className="huick-cutout-list">
        {videos.map(({ id, name }) => {
          const enabled = plan.cutouts[name] ?? false;
          const memo = plan.cutoutNotes[name] ?? "";
          return (
            <li key={id}>
              <div className="huick-cutout-row">
                <span className="huick-cutout-name">{name}</span>
                <button type="button" role="switch" className="huick-cutout-switch" aria-checked={enabled}
                  aria-label={S.removeBackground + " · " + name} onClick={() => setPlan((previous) => ({
                    ...previous, cutouts: { ...previous.cutouts, [name]: !previous.cutouts[name] },
                  }))}>
                  <span aria-hidden="true" className="huick-cutout-track" />
                </button>
              </div>
              {enabled && <div className="huick-cutout-memo">
                <ui.TextField label={T.cutoutNote} placeholder={T.cutoutHint} value={memo}
                  onChange={(value) => setPlan((previous) => ({
                    ...previous, cutoutNotes: { ...previous.cutoutNotes, [name]: value },
                  }))} />
              </div>}
            </li>
          );
        })}
      </ul> : <span style={quiet}>{S.noBackgroundVideos}</span>}
    </section>
  );

  const characters = (
    <section aria-label={T.cast} style={{ borderBlock: "1px solid var(--panel-border)", paddingBlock: 8 }}>
      <div className="huick-script-bar" style={{ marginBottom: visibleCharacters.length ? 6 : 0 }}>
        <h3 className="huick-section-heading">{T.cast}</h3>
        <ui.Button variant="ghost" icon="plus" onClick={() => addCharacter()}>{T.addCharacter}</ui.Button>
      </div>
      {visibleCharacters.length > 0 && <ui.Grid minItemWidth={250}>
        {visibleCharacters.map((character) => (
          <div style={mediaCard} key={character.id}>
            <ui.TextField label={T.name} value={character.name} onChange={(value) => setCharacter(character.id, { name: value })} />
            {recordingOptions.length > 0 && <ui.Select label={T.recording} placeholder={S.chooseRecording}
              value={recorded.has(character.recording) ? character.recording : null} options={recordingOptions}
              onChange={(value) => setCharacter(character.id, { recording: value })} />}
            <ui.TextField label={T.direction} multiline value={character.direction} onChange={(value) => setCharacter(character.id, { direction: value })} />
            <div style={actions}>
              <ui.Button variant="ghost" onClick={() => patch({
                characters: plan.characters.filter((item) => item.id !== character.id),
                scenes: plan.scenes.map((item) => ({ ...item, lines: item.lines.map((line) =>
                  line.characterId === character.id ? { ...line, characterId: "" } : line) })),
              })}>{T.removeCharacter}</ui.Button>
            </div>
          </div>
        ))}
      </ui.Grid>}
    </section>
  );

  const script = (
    <div className="huick-script" style={{ "--panel-field-max": "100%" }}>
      <section aria-label={T.plan}>
        <div className="huick-script-bar">
          <h3>{T.plan}</h3>
          <div style={actions}>
            <span style={quiet}>{T.template}</span>
            {canOpenTemplate
              ? <ui.Button variant="ghost" icon="external-link" onClick={openTemplate}>{DEFAULT_TEMPLATE}</ui.Button>
              : <span>{DEFAULT_TEMPLATE}</span>}
          </div>
        </div>
        {templateOpenError && <ui.Message tone="error">{templateOpenError}</ui.Message>}
        <textarea className="huick-script-field huick-concept" aria-label={T.concept} placeholder={T.conceptHint}
          rows={2} value={plan.concept} onChange={(event) => patch({ concept: event.target.value })} />
        <ui.TextField label={T.credits} multiline value={plan.credits} onChange={(value) => patch({ credits: value })} />
      </section>
      <section aria-label={T.scenes}>
        <div className="huick-script-bar">
          <h3>{T.scenes}</h3>
          <ui.Button variant="ghost" icon="plus" onClick={() => {
            const item = newScene(defaultSpeakerId);
            patch({ scenes: [...plan.scenes, item] });
            setSceneId(item.id);
          }}>{T.addScene}</ui.Button>
        </div>
        <div className="huick-scene">
          <div className="huick-scene-title">
            {plan.scenes.length === 1 ? <span className="huick-scene-number">{S.sceneNumber(1)}</span> : (
              <div className="huick-select huick-scene-picker">
                <select className="huick-script-field" aria-label={T.scene} value={scene.id}
                  onChange={(event) => setSceneId(event.target.value)}>
                  {plan.scenes.map((item, index) => (
                    <option key={item.id} value={item.id}>
                      {S.sceneNumber(index + 1)}{item.id !== scene.id && item.title.trim() ? " · " + item.title.trim() : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <input className="huick-script-field" type="text" aria-label={T.title} placeholder={T.title}
              value={scene.title} onChange={(event) => setScene({ title: event.target.value })} />
            {plan.scenes.length > 1 && <ui.IconButton icon="trash" label={T.removeScene} onClick={() => {
              patch({ scenes: plan.scenes.filter((item) => item.id !== scene.id) });
              setSceneId(null);
            }} />}
          </div>
          <div className="huick-scene-lines">
            {scene.lines.map((line, index) => {
              const selected = speakersById.has(line.characterId);
              return (
                <div key={line.id} className="huick-line">
                  <div className="huick-select huick-speaker">
                    <select className="huick-script-field" aria-label={T.speaker(index + 1)}
                      value={selected ? line.characterId : ""} data-empty={!selected}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "add-speaker") addCharacter(line.id);
                        else setLine(line.id, { characterId: value });
                      }}>
                      <option value="" disabled>{S.chooseSpeaker}</option>
                      {speakers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      <option value="add-speaker">+ {T.addCharacter}</option>
                    </select>
                  </div>
                  <textarea className="huick-script-field huick-dialogue" aria-label={T.line(index + 1)}
                    placeholder={S.dialogueHint} rows={1} value={line.text}
                    onChange={(event) => setLine(line.id, { text: event.target.value })} />
                  {scene.lines.length > 1 && <div className="huick-line-remove">
                    <ui.IconButton icon="trash" label={T.removeLine}
                      onClick={() => setScene({ lines: scene.lines.filter((item) => item.id !== line.id) })} />
                  </div>}
                </div>
              );
            })}
            <div className="huick-scene-tools">
              <ui.Button variant="ghost" icon="plus" onClick={() => setScene({ lines: [...scene.lines, newLine(defaultSpeakerId)] })}>{T.addLine}</ui.Button>
            </div>
          </div>
          <div className="huick-scene-prompt">
            <div className="huick-prompt-header">
              <label htmlFor={"scene-prompt-" + scene.id}>{S.directionPrompt}</label>
              {library.some((file) => file.path) && <div className="huick-select huick-asset-picker">
                <select className="huick-script-field" aria-label={S.insertAsset} value="" onChange={(event) => {
                  const file = library.find((item) => fileKey(item) === event.target.value);
                  if (file) insertAsset(file.name);
                }}>
                  <option value="" disabled>{S.insertAsset}</option>
                  {library.filter((file) => file.path).map((file) =>
                    <option key={fileKey(file)} value={fileKey(file)}>{file.name}</option>)}
                </select>
              </div>}
            </div>
            <textarea key={scene.id} id={"scene-prompt-" + scene.id} ref={promptField}
              className="huick-script-field" placeholder={T.screenHint} rows={3} value={scene.screen}
              onChange={(event) => setScene({ screen: event.target.value })}
              onBlur={(event) => {
                const { selectionStart: start, selectionEnd: end } = event.currentTarget;
                promptSelection.current = { sceneId: scene.id, start, end };
              }} />
            <button type="button" className="huick-disclosure" aria-expanded={notesSceneId === scene.id}
              onClick={() => setNotesSceneId(notesSceneId === scene.id ? null : scene.id)}>{S.article}</button>
            {notesSceneId === scene.id &&
              <ui.TextField label={T.excerpt} multiline value={scene.excerpt} onChange={(value) => setScene({ excerpt: value })} />}
          </div>
        </div>
      </section>
    </div>
  );

  if (!ready) return <ui.Progress label={S.loading} />;
  const canCreate = canSave.current && complete(plan, videos);
  const resultsByRun = new Map((runResults ?? []).map((result) => [result.appRunId, result]));
  const runDate = (entry) => new Date(entry.createdAt).toLocaleString(context.language, { dateStyle: "short", timeStyle: "short" });
  return (
    <div style={{ ...column, ...scriptColumn, boxSizing: "border-box", padding: "10px clamp(8px, 2.5vw, 16px)", gap: 16, "--panel-field-max": "none" }}>
      <style>{SCRIPT_STYLES}</style>
      <nav className="huick-panel-tabs">
        <button type="button" className="huick-panel-tab" aria-pressed={view === "production"} onClick={() => setView("production")}>{S.production}</button>
        <button type="button" className="huick-panel-tab" aria-pressed={view === "history"} onClick={() => setView("history")}>{S.history}</button>
      </nav>
      {saveError && <ui.Message tone="warning">{S.storage}</ui.Message>}
      {view === "history" ? <section aria-label={S.history} style={{ ...column, gap: 8 }}>
        {error && <ui.Message tone="error">{error}</ui.Message>}
        {history.length ? <>
          {historyError && <div style={actions}>
            <ui.Message tone="warning">{S.historyError}</ui.Message>
            <ui.Button variant="ghost" onClick={() => setHistoryRevision((value) => value + 1)}>{S.retryHistory}</ui.Button>
          </div>}
          <ul className="huick-history-list">
            {history.map((entry) => {
              const result = resultsByRun.get(entry.id);
              const drafts = result?.drafts ?? [];
              const hasChoices = drafts.length > 1;
              const expanded = hasChoices && selectedRunId === entry.id;
              const confirming = restoreId === entry.id;
              const askToRestore = () => {
                setSelectedRunId(null);
                setRestoreId(entry.id);
              };
              const summary = <>
                <span className="huick-history-title">
                  <strong>{episodeTitle(entry.plan) || S.untitled}</strong>
                  <span style={quiet}>{runDate(entry)}</span>
                </span>
                <span style={quiet}>{S.runStates[result?.state] ?? S.checkRun}</span>
                {drafts.length > 0 && <ui.Icon name={expanded ? "chevron-down" : "chevron-right"} size={14} />}
              </>;
              return <li key={entry.id} className="huick-history-row">
                <div className="huick-history-main">
                  {drafts.length > 0 ? <button type="button" className="huick-history-entry" disabled={!!busy}
                    aria-expanded={hasChoices ? expanded : undefined}
                    onClick={() => {
                      setRestoreId(null);
                      setSelectedRunId(hasChoices && !expanded ? entry.id : null);
                      if (!hasChoices) void openResult(drafts[0].id);
                    }}>{summary}</button> : <div className="huick-history-entry">{summary}</div>}
                  {ui.version >= 4 ? <ui.Menu label={S.historyOptions} disabled={!!busy}
                    items={[{ label: S.loadPlan, onSelect: askToRestore }]} />
                    : <ui.Button variant="ghost" disabled={!!busy} onClick={askToRestore}>{S.loadPlan}</ui.Button>}
                </div>
                {expanded && <ul className="huick-history-results">
                  {drafts.map((draft, index) => <li key={draft.id}>
                    <button type="button" className="huick-history-entry huick-history-result" disabled={!!busy}
                      onClick={() => openResult(draft.id)}>
                      <span>{draft.title || S.untitledResult(index + 1)}</span>
                      <ui.Icon name="chevron-right" size={14} />
                    </button>
                  </li>)}
                </ul>}
                {confirming && <div className="huick-history-confirm">
                  <span style={quiet}>{S.confirmLoad}</span>
                  <div style={actions}>
                    <ui.Button variant="secondary" disabled={!!busy} onClick={() => restorePlan(entry)}>{S.loadPlan}</ui.Button>
                    <ui.Button variant="ghost" onClick={() => setRestoreId(null)}>{S.cancel}</ui.Button>
                  </div>
                </div>}
              </li>;
            })}
          </ul>
        </> : <span style={quiet}>{S.emptyHistory}</span>}
      </section> : <>
        {files}
        {backgroundRemoval}
        {characters}
        {script}
        <footer style={{ ...column, borderTop: "1px solid var(--panel-border)", paddingBlock: 8 }}>
          {!showNoticeByFiles && notices}
          <div style={{ ...actions, gap: 8 }}>
            {!canCreate && missingInput && <span style={{ ...quiet, flex: "1 1 110px" }}>{missingInput}</span>}
            <div style={{ marginInlineStart: "auto" }}>
              <ui.Button variant="primary" disabled={!canCreate || !!busy} busy={busy === S.createSource || busy === T.creating}
                busyLabel={busy} onClick={create}>{T.create}</ui.Button>
            </div>
          </div>
        </footer>
      </>}
    </div>
  );
}
