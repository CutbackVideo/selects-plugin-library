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
  video: ["mov", "mp4", "m4v", "webm", "mkv"],
  audio: ["wav", "mp3", "aac", "m4a", "aiff", "aif"],
};

const STRINGS = {
  en: {
    setup: "Template and source",
    template: "Clipper template name",
    source: "Source Draft",
    noDraft: "Open the Draft that holds the raw recordings first.",
    sourceOf: (n) => n + " recordings in the open Draft",
    plan: "Production plan",
    concept: "Concept and overall plan",
    conceptHint: "Episode title on the first line, then the concept, backgrounds, cutouts and what every scene shares.",
    credits: "Production credits (optional)",
    recordings: "Recordings",
    cutout: (name) => "Cut out " + name,
    cutoutNote: "Cutout request (optional)",
    cutoutHint: "Empty: green-screen chroma key. Otherwise Clipper reads this to choose, e.g. blue sky behind, use an AI mask.",
    cast: "Characters",
    addCharacter: "Add character",
    removeCharacter: "Remove character",
    name: "Name",
    recording: "Recording",
    direction: "Notes for this character",
    materials: "Materials",
    folder: "Add every file in a folder",
    folderPath: "Folder path",
    addFolder: "Add folder",
    remove: "Remove",
    materialCount: (n) => n + " materials",
    scenes: "Scenes",
    scene: "Scene to edit",
    addScene: "Add scene",
    removeScene: "Remove scene",
    title: "Scene title",
    speaker: (i) => "Line " + i + " speaker",
    line: (i) => "Line " + i,
    addLine: "Add line",
    removeLine: "Remove line",
    screen: "Screen direction",
    screenHint: "Start with the scene length (e.g. about 3.5 s), then what appears where and when.",
    excerpt: "Article excerpt and source (verbatim)",
    create: "Create in Clipper",
    creating: "Sending to Clipper\u2026",
    sent: "Clipper is making the Draft. Follow it in Clipper.",
    needUpdate: "This Selects version cannot start Clipper runs from apps. Update Selects.",
    missing: "Fill the concept, give every line a speaker and text, and pick each character's recording.",
  },
  ko: {
    setup: "\ud15c\ud50c\ub9bf\uacfc \uc18c\uc2a4",
    template: "Clipper \ud15c\ud50c\ub9bf \uc774\ub984",
    source: "\uc18c\uc2a4 Draft",
    noDraft: "\uc6d0\ubcf8 \ub179\ud654\uac00 \ub4e4\uc5b4 \uc788\ub294 Draft\ub97c \uba3c\uc800 \uc5ec\uc138\uc694.",
    sourceOf: (n) => "\uc5f4\ub9b0 Draft\uc758 \ub179\ud654 " + n + "\uac1c",
    plan: "\uc81c\uc791 \uae30\ud68d",
    concept: "\ucee8\uc149\uacfc \uc804\uccb4 \uae30\ud68d",
    conceptHint: "\uccab \uc904\uc5d0 \ud68c\ucc28\uba85, \uadf8 \uc544\ub798 \ucee8\uc149, \ubc30\uacbd, \ub204\ub07c, \ubaa8\ub4e0 \uc52c\uc5d0 \uacf5\ud1b5\uc778 \uac83.",
    credits: "\uc81c\uc791\uc9c4 (\uc120\ud0dd)",
    recordings: "\ub179\ud654",
    cutout: (name) => name + " \ub204\ub07c \ub530\uc11c \uc4f0\uae30",
    cutoutNote: "\ub204\ub07c \uc694\uccad (\uc120\ud0dd)",
    cutoutHint: "\ube44\uc6b0\uba74 \uadf8\ub9b0\uc2a4\ud06c\ub9b0 \ud06c\ub85c\ub9c8\ud0a4. \uc4f0\uba74 Clipper\uac00 \uc77d\uace0 \uace0\ub984. \uc608: \ub4a4\uac00 \ud30c\ub780 \ud558\ub298\uc774\ub77c AI \ub9c8\uc2a4\ud06c\ub85c",
    cast: "\uce90\ub9ad\ud130",
    addCharacter: "\uce90\ub9ad\ud130 \ucd94\uac00",
    removeCharacter: "\uce90\ub9ad\ud130 \uc0ad\uc81c",
    name: "\uc774\ub984",
    recording: "\ucd2c\uc601 \uc601\uc0c1",
    direction: "\uce90\ub9ad\ud130 \ucd94\uac00 \uc694\uccad\uc0ac\ud56d",
    materials: "\uc81c\uc791 \uc790\ub8cc",
    folder: "\ud3f4\ub354\uc758 \ud30c\uc77c \ubaa8\ub450 \ucd94\uac00",
    folderPath: "\ud3f4\ub354 \uacbd\ub85c",
    addFolder: "\ud3f4\ub354 \ucd94\uac00",
    remove: "\uc0ad\uc81c",
    materialCount: (n) => "\uc790\ub8cc " + n + "\uac1c",
    scenes: "\uc52c \ub300\ubcf8",
    scene: "\ud3b8\uc9d1\ud560 \uc52c",
    addScene: "\uc52c \ucd94\uac00",
    removeScene: "\uc52c \uc0ad\uc81c",
    title: "\uc52c \uc81c\ubaa9",
    speaker: (i) => "\ub300\uc0ac " + i + " \ud654\uc790",
    line: (i) => "\ub300\uc0ac " + i,
    addLine: "\ub300\uc0ac \ucd94\uac00",
    removeLine: "\ub300\uc0ac \uc0ad\uc81c",
    screen: "\ud654\uba74 \uc9c0\uc2dc",
    screenHint: "\ub9e8 \uc55e\uc5d0 \uc52c \uae38\uc774(\uc608: \uc57d 3.5\ucd08), \uadf8\ub2e4\uc74c \uba87 \ucd08\uc5d0 \ubb34\uc5c7\uc774 \uc5b4\ub514\uc5d0 \ub728\ub294\uc9c0.",
    excerpt: "\uae30\uc0ac \uc6d0\ubb38\uacfc \ucd9c\ucc98 (\uadf8\ub300\ub85c)",
    create: "Clipper\uc5d0\uc11c \ub9cc\ub4e4\uae30",
    creating: "Clipper\uc5d0 \ubcf4\ub0b4\ub294 \uc911\u2026",
    sent: "Clipper\uac00 Draft\ub97c \ub9cc\ub4e4\uace0 \uc788\uc5b4\uc694. Clipper\uc5d0\uc11c \ud655\uc778\ud558\uc138\uc694.",
    needUpdate: "\uc774 Selects \ubc84\uc804\uc740 \uc571\uc5d0\uc11c Clipper \uc0dd\uc131\uc744 \uc2dc\uc791\ud560 \uc218 \uc5c6\uc5b4\uc694. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud558\uc138\uc694.",
    missing: "\ucee8\uc149\uc744 \uc4f0\uace0, \ubaa8\ub4e0 \ub300\uc0ac\uc5d0 \ud654\uc790\uc640 \ub0b4\uc6a9\uc744, \uce90\ub9ad\ud130\ub9c8\ub2e4 \ucd2c\uc601 \uc601\uc0c1\uc744 \uace8\ub77c \uc8fc\uc138\uc694.",
  },
};

const uid = () => Math.random().toString(36).slice(2, 10);
const planKey = (projectId) => "huick-alpha:plan:" + projectId;
const newCharacter = () => ({ id: uid(), name: "", recording: "", direction: "" });
const newLine = (characterId) => ({ id: uid(), characterId, text: "" });
const newScene = (characterId) => ({ id: uid(), title: "", lines: [newLine(characterId)], screen: "", excerpt: "" });
function newPlan() {
  const first = newCharacter();
  return { template: DEFAULT_TEMPLATE, concept: "", credits: "", cutouts: {}, cutoutNotes: {}, characters: [first, newCharacter()], materials: [], scenes: [newScene(first.id)] };
}

function kindOf(name) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return Object.keys(KINDS).find((kind) => KINDS[kind].includes(ext));
}
function materialOf(path) {
  const name = path.split(/[\\/]/).pop();
  const kind = kindOf(name);
  if (!kind) return null;
  let hash = 0;
  for (const ch of path) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { id: "material-" + hash.toString(36), name, kind, path };
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
  const cut = Object.entries(plan.cutouts).filter(([, on]) => on).map(([name]) => name);
  // A checked recording with no request is chroma keyed; one with a request is
  // left for Clipper to choose (chroma key or AI mask) from what it says.
  const keyed = cut.filter((name) => !cutNote(name)).map((name) => name.normalize("NFC"));
  const isCut = (name) => cut.some((n) => n.normalize("NFC") === name.normalize("NFC"));
  for (const name of cut) notes.push(quoted("Cutout request for " + JSON.stringify(name), cutNote(name)));
  return {
    projectId,
    template: plan.template.trim(),
    sourceDraftId,
    note: [...notes, ...sceneNotes].filter(Boolean).join("\n"),
    documents: [{ name: SCRIPT_DOCUMENT, purpose: "script", text: script.join("\n\n") }],
    additionalContent: {
      assets: plan.materials,
      materialAssetIds: plan.materials.map((m) => m.id),
      productionCredits: plan.credits,
      chromaKeyVideoNames: keyed,
      sceneCompositions: plan.scenes.map((scene) => ({
        title: scene.title,
        dialogue: scene.lines.map((line) => {
          const c = cast.get(line.characterId);
          return { text: line.text, actor: { name: c.name, recordings: [c.recording], cutout: isCut(c.recording) } };
        }),
      })),
    },
  };
}

function complete(plan) {
  const cast = new Map(plan.characters.map((c) => [c.id, c]));
  return (
    plan.concept.trim() &&
    plan.template.trim() &&
    plan.scenes.every((s) => s.lines.length && s.lines.every((l) => l.text.trim() && cast.get(l.characterId)?.name.trim() && cast.get(l.characterId)?.recording))
  );
}

export default function Panel({ sdk, context, ui }) {
  const T = STRINGS[context.language] ?? STRINGS.en;
  const [plan, setPlan] = useState(newPlan);
  const [recordings, setRecordings] = useState([]);
  const [sceneId, setSceneId] = useState(null);
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const live = useRef({ sdk, context });
  live.current = { sdk, context };

  useEffect(() => {
    let value = newPlan();
    try { value = { ...value, ...JSON.parse(localStorage.getItem(planKey(context.projectId)) || "null") }; } catch {}
    setPlan(value);
    setSceneId(value.scenes[0]?.id ?? null);
  }, [context.projectId]);

  useEffect(() => {
    if (!context.sequenceId) { setRecordings([]); return; }
    let alive = true;
    const script = `const clips = await selects.draft(${JSON.stringify(context.sequenceId)}).clips();
const ids = [...new Set(clips.filter((c) => c.resourceId && (c.trackKind === "main" || c.trackKind === "video")).map((c) => c.resourceId))];
if (!ids.length) return [];
const rows = await selects.project(${JSON.stringify(context.projectId)}).resources({ resourceIds: ids });
return rows.filter((r) => String(r.type).toLowerCase() === "video").map((r) => r.name);`;
    sdk.runScript({ summary: "List the recordings in the open Draft", script, allowCommit: false })
      .then((r) => { if (alive && !r.isError) setRecordings(r.result ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [context.sequenceId, context.projectId]);

  const update = (fn) => setPlan((old) => {
    const next = fn(old);
    try { localStorage.setItem(planKey(context.projectId), JSON.stringify(next)); } catch {}
    return next;
  });
  const set = (patch) => update((p) => ({ ...p, ...patch }));
  const setCharacter = (id, patch) => update((p) => ({ ...p, characters: p.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const scene = plan.scenes.find((s) => s.id === sceneId) ?? plan.scenes[0];
  const setScene = (patch) => update((p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === scene.id ? { ...s, ...patch } : s)) }));
  const setLine = (id, patch) => setScene({ lines: scene.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const addMaterials = (rows) => update((p) => {
    const known = new Set(p.materials.map((m) => m.path));
    return { ...p, materials: [...p.materials, ...rows.filter((m) => m && !known.has(m.path))] };
  });

  const addFolder = async () => {
    setError("");
    const dir = folder.trim().replace(/[\\/]+$/, "");
    const r = await sdk.runScript({ summary: "List the files in a materials folder", script: `return await selects.localFiles.readdir(${JSON.stringify(dir)});`, allowCommit: false });
    if (r.isError) { setError(String(r.output)); return; }
    addMaterials((r.result ?? []).filter((n) => !n.startsWith(".")).map((n) => materialOf(dir + "/" + n)));
  };

  const create = async () => {
    setError(""); setStatus("");
    if (!context.sequenceId) { setError(T.noDraft); return; }
    if (!complete(plan)) { setError(T.missing); return; }
    setBusy(true);
    try {
      const request = buildRequest(plan, context.projectId, context.sequenceId);
      const r = await live.current.sdk.runScript({
        summary: "Start the production plan in Clipper",
        script: `if (typeof selects.clipper.startRun !== "function") return { unsupported: true };
return await selects.clipper.startRun(${JSON.stringify(request)});`,
        allowCommit: true,
      });
      if (r.isError) throw new Error(r.output);
      if (r.result?.unsupported) throw new Error(T.needUpdate);
      setStatus(T.sent);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const characterOptions = plan.characters.filter((c) => c.name.trim()).map((c) => ({ value: c.id, label: c.name }));
  const recordingOptions = recordings.map((name) => ({ value: name, label: name }));

  return (
    <ui.Stack>
      <ui.Section title={T.setup}>
        <ui.TextField label={T.template} value={plan.template} onChange={(v) => set({ template: v })} />
        <ui.Message tone={context.sequenceId ? "info" : "warning"}>{context.sequenceId ? T.sourceOf(recordings.length) : T.noDraft}</ui.Message>
      </ui.Section>

      <ui.Section title={T.plan}>
        <ui.TextField label={T.concept} placeholder={T.conceptHint} multiline value={plan.concept} onChange={(v) => set({ concept: v })} />
        <ui.TextField label={T.credits} multiline value={plan.credits} onChange={(v) => set({ credits: v })} />
      </ui.Section>

      <ui.Section title={T.recordings}>
        {recordings.map((name) => (
          <ui.Stack key={name}>
            <ui.Toggle label={T.cutout(name)} value={plan.cutouts[name] ?? false} onChange={(v) => set({ cutouts: { ...plan.cutouts, [name]: v } })} />
            {plan.cutouts[name] ? (
              <ui.TextField label={T.cutoutNote} placeholder={T.cutoutHint} value={plan.cutoutNotes?.[name] ?? ""} onChange={(v) => set({ cutoutNotes: { ...plan.cutoutNotes, [name]: v } })} />
            ) : null}
          </ui.Stack>
        ))}
      </ui.Section>

      <ui.Section title={T.cast}>
        {plan.characters.map((c) => (
          <ui.Stack key={c.id}>
            <ui.TextField label={T.name} value={c.name} onChange={(v) => setCharacter(c.id, { name: v })} />
            <ui.Select label={T.recording} value={c.recording || null} options={recordingOptions} onChange={(v) => setCharacter(c.id, { recording: v })} />
            <ui.TextField label={T.direction} multiline value={c.direction} onChange={(v) => setCharacter(c.id, { direction: v })} />
            {plan.characters.length > 1 && (
              <ui.Button onClick={() => update((p) => ({ ...p, characters: p.characters.filter((x) => x.id !== c.id) }))}>{T.removeCharacter}</ui.Button>
            )}
          </ui.Stack>
        ))}
        <ui.Button onClick={() => update((p) => ({ ...p, characters: [...p.characters, newCharacter()] }))}>{T.addCharacter}</ui.Button>
      </ui.Section>

      <ui.Section title={T.materials}>
        <ui.FileDrop accept={["image", "video", "audio"]} value={null} onChange={(file) => file && addMaterials([materialOf(file.path)])} />
        <ui.TextField label={T.folderPath} value={folder} onChange={setFolder} />
        <ui.Button disabled={!folder.trim()} onClick={addFolder}>{T.addFolder}</ui.Button>
        <ui.Message tone="info">{T.materialCount(plan.materials.length)}</ui.Message>
        {plan.materials.map((m) => (
          <ui.Row key={m.id}>
            <span>{m.name}</span>
            <ui.Button onClick={() => update((p) => ({ ...p, materials: p.materials.filter((x) => x.id !== m.id) }))}>{T.remove}</ui.Button>
          </ui.Row>
        ))}
      </ui.Section>

      <ui.Section title={T.scenes}>
        <ui.Select label={T.scene} value={scene.id} options={plan.scenes.map((s, i) => ({ value: s.id, label: s.title.trim() || String(i + 1) }))} onChange={setSceneId} />
        <ui.Row>
          <ui.Button onClick={() => { const s = newScene(plan.characters[0].id); update((p) => ({ ...p, scenes: [...p.scenes, s] })); setSceneId(s.id); }}>{T.addScene}</ui.Button>
          {plan.scenes.length > 1 && (
            <ui.Button onClick={() => { update((p) => ({ ...p, scenes: p.scenes.filter((s) => s.id !== scene.id) })); setSceneId(null); }}>{T.removeScene}</ui.Button>
          )}
        </ui.Row>
        <ui.TextField label={T.title} value={scene.title} onChange={(v) => setScene({ title: v })} />
        {scene.lines.map((line, i) => (
          <ui.Stack key={line.id}>
            <ui.Select label={T.speaker(i + 1)} value={line.characterId} options={characterOptions} onChange={(v) => setLine(line.id, { characterId: v })} />
            <ui.TextField label={T.line(i + 1)} multiline value={line.text} onChange={(v) => setLine(line.id, { text: v })} />
            {scene.lines.length > 1 && (
              <ui.Button onClick={() => setScene({ lines: scene.lines.filter((l) => l.id !== line.id) })}>{T.removeLine}</ui.Button>
            )}
          </ui.Stack>
        ))}
        <ui.Button onClick={() => setScene({ lines: [...scene.lines, newLine(scene.lines.at(-1)?.characterId ?? plan.characters[0].id)] })}>{T.addLine}</ui.Button>
        <ui.TextField label={T.screen} placeholder={T.screenHint} multiline value={scene.screen} onChange={(v) => setScene({ screen: v })} />
        <ui.TextField label={T.excerpt} multiline value={scene.excerpt} onChange={(v) => setScene({ excerpt: v })} />
      </ui.Section>

      {error ? <ui.Message tone="error">{error}</ui.Message> : null}
      {status ? <ui.Message tone="success">{status}</ui.Message> : null}
      <ui.Actions>
        <ui.Button variant="primary" disabled={busy} onClick={create}>{busy ? T.creating : T.create}</ui.Button>
      </ui.Actions>
    </ui.Stack>
  );
}
