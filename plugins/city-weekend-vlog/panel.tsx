// @name City Weekend Vlog
// @icon sparkles
// Builds a beat-synced 9:16 city weekend vlog with a font-switching title as a new, editable Draft.
import React from "react";

const PLUGIN_ID = "city-weekend-vlog";
const SKILLS_DIR = "$SELECTS_USER_SKILLS_ROOT/" + PLUGIN_ID;
const DATA_DIR = "$HOME/.selects/plugin-data/" + PLUGIN_ID;
const CWV_QUERIES = {
  street: "busy city street with cars, taxis or people walking",
  architecture: "building facade architecture",
  landmark: "famous landmark or skyline",
  park: "green park, trees and lawn",
  detail: "close-up street detail, sign or storefront",
  wide: "wide open view of sky, lawn or skyline",
  talking: "person talking to the camera",
};
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// cwv-planner:start
// City Weekend Vlog planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
const CWV_TITLE_BEATS = [1.75, 1.5, 1.0, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.5, 1.25];
const CWV_TITLE_ROLES = ['street', 'architecture', 'street', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'wide'];
// Font state of the switching line from each title slot on; null before the place line exists.
const CWV_FONT_STATES = [null, null, 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'A', 'A'];
const CWV_MONTAGE_ROLES = ['architecture', 'park', 'street', 'detail'];
const CWV_MONTAGE_BEATS = 2;
const CWV_TITLE_TOTAL_BEATS = 9;
const CWV_LENGTHS = { short: 4, standard: 7, long: 12 };
const CWV_MIN_MONTAGE = 4;
const CWV_MAX_MONTAGE = 12;
const CWV_MIN_WINDOWS = CWV_TITLE_BEATS.length + CWV_MIN_MONTAGE;
const CWV_LINE1_OFFSET_BEATS = 0.25;
const CWV_REFERENCE_BPM = 99.2;

function cwvVideoBeats(montageShots) { return CWV_TITLE_TOTAL_BEATS + CWV_MONTAGE_BEATS * montageShots; }
function cwvVideoSeconds(bpm, montageShots) { return cwvVideoBeats(montageShots) * 60 / bpm; }

function cwvSchedule(opts) {
  const bpm = opts.bpm, fps = opts.fps, n = opts.montageShots;
  if (!(bpm > 0) || !(fps > 0) || !(n >= 0)) throw Error('cwvSchedule needs bpm, fps and montageShots');
  // Every boundary is an absolute beat position snapped once to a frame; durations never accumulate rounding.
  const frameAt = beats => Math.round(beats * 60 / bpm * fps);
  const beats = CWV_TITLE_BEATS.concat(Array(n).fill(CWV_MONTAGE_BEATS));
  const slots = [];
  let at = 0;
  beats.forEach((b, i) => {
    const inTitle = i < CWV_TITLE_BEATS.length;
    slots.push({
      index: i,
      role: inTitle ? CWV_TITLE_ROLES[i] : CWV_MONTAGE_ROLES[(i - CWV_TITLE_BEATS.length) % CWV_MONTAGE_ROLES.length],
      section: inTitle ? (i < 3 ? 'opening' : i < 12 ? 'burst' : 'hold') : 'montage',
      startFrame: frameAt(at),
      endFrame: frameAt(at + b),
    });
    at += b;
  });
  const fontSwitches = [];
  CWV_FONT_STATES.forEach((state, i) => {
    const last = fontSwitches.length ? fontSwitches[fontSwitches.length - 1].state : null;
    if (state && state !== last) fontSwitches.push({ frame: slots[i].startFrame, state });
  });
  return {
    slots,
    totalFrames: slots[slots.length - 1].endFrame,
    title: {
      line1Frame: frameAt(CWV_LINE1_OFFSET_BEATS),
      connectorFrame: slots[1].startFrame,
      placeFrame: slots[2].startFrame,
      fontSwitches,
      endFrame: slots[CWV_TITLE_BEATS.length - 1].endFrame,
    },
  };
}

function cwvFitMontage(opts) {
  for (let n = Math.min(opts.requested, CWV_MAX_MONTAGE); n >= CWV_MIN_MONTAGE; n--) {
    if (opts.sectionStart + cwvVideoSeconds(opts.bpm, n) <= opts.usableEnd + 1e-6) return n;
  }
  return 0;
}

function cwvSnapSection(opts) {
  const latest = opts.usableEnd - opts.videoSeconds;
  if (latest < -1e-6) return null;
  if (!opts.gridAccepted) return Math.max(0, Math.min(Math.floor(latest * 10) / 10, Math.round(opts.value * 10) / 10));
  const bar = 4 * 60 / opts.bpm;
  const maxK = Math.floor((latest - opts.firstBeat) / bar + 1e-9);
  if (maxK < 0) return null;
  const k = Math.max(0, Math.min(maxK, Math.round((opts.value - opts.firstBeat) / bar)));
  return opts.firstBeat + k * bar;
}

function cwvDefaultSection(opts) {
  const beat = 60 / opts.bpm, span = Math.round(opts.videoSeconds / beat);
  let best = null;
  for (let k = 0; ; k++) {
    const start = opts.firstBeat + k * 4 * beat;
    if (start + opts.videoSeconds > opts.usableEnd + 1e-6) break;
    const slice = opts.beatEnergy.slice(k * 4, k * 4 + span);
    if (slice.length < span) break;
    const mean = slice.reduce((a, b) => a + b, 0) / span;
    if (!best || mean > best.mean + 1e-9) best = { start, mean };
  }
  return best ? best.start : null;
}

function cwvHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Which candidate roles may fill a slot role, best first.
const CWV_ROLE_FALLBACK = {
  street: ['street', 'detail', 'architecture'],
  architecture: ['architecture', 'landmark', 'street'],
  landmark: ['landmark', 'architecture', 'park', 'wide'],
  wide: ['wide', 'park', 'landmark'],
  park: ['park', 'wide', 'detail'],
  detail: ['detail', 'street', 'architecture'],
};

function cwvAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const finite = v => typeof v === 'number' && isFinite(v);
  const candidates = opts.candidates.filter(c => c && finite(c.t) && finite(c.score) && finite(c.sourceDuration));
  const used = {}, avoid = {}, recent = [], picks = [];
  candidates.filter(c => c.role === 'talking').forEach(c => { (avoid[c.rid] = avoid[c.rid] || []).push([c.t - 1, c.t + 1]); });
  const pool = candidates.filter(c => c.role !== 'talking' && c.sourceDuration > 0);
  let missing = 0;
  // Best fitting candidate for a slot. With roles == null, any non-talking role is accepted (last resort).
  function search(slot, roles) {
    let best = null;
    for (const c of pool) {
      const rank = roles ? roles.indexOf(c.role) : 0;
      if (rank < 0 || c.sourceDuration < slot.seconds) continue;
      const start = Math.max(0, Math.min(c.sourceDuration - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      if ((avoid[c.rid] || []).some(([a, b]) => start < b && end > a)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      const value = c.score - rank * 0.15 - repeats * 0.2 + cwvHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05;
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end };
    }
    return best;
  }
  for (const slot of opts.slots) {
    // Preferred roles always win; any other role is only used when none of them fits.
    const best = search(slot, CWV_ROLE_FALLBACK[slot.role] || [slot.role]) || search(slot, null);
    if (!best) { missing++; picks.push(null); continue; }
    (used[best.c.rid] = used[best.c.rid] || []).push([best.start, best.end]);
    recent.push(best.c.rid);
    if (recent.length > 3) recent.shift();
    picks.push({ slot: slot.index, rid: best.c.rid, startSeconds: best.start, endSeconds: best.end });
  }
  return { picks, filled: picks.filter(Boolean).length, missing };
}

// Tries the requested montage length first, then shrinks toward CWV_MIN_MONTAGE. Every attempt allocates from scratch.
function cwvPlanBuild(opts) {
  const top = Math.min(CWV_MAX_MONTAGE, Math.max(CWV_MIN_MONTAGE, opts.montageShots));
  let lastFilled = 0;
  for (let n = top; n >= CWV_MIN_MONTAGE; n--) {
    const schedule = cwvSchedule({ bpm: opts.bpm, fps: opts.fps, montageShots: n });
    const slots = schedule.slots.map(s => ({ index: s.index, role: s.role, seconds: (s.endFrame - s.startFrame) / opts.fps }));
    const alloc = cwvAllocate({ candidates: opts.candidates, slots, seed: opts.seed });
    lastFilled = alloc.filled;
    if (alloc.missing === 0) {
      return { ok: true, schedule, picks: alloc.picks, montageShots: n, usableShots: alloc.picks.length, needed: CWV_MIN_WINDOWS };
    }
  }
  return { ok: false, usableShots: lastFilled, needed: CWV_MIN_WINDOWS };
}

// Build steps shown in the panel's progress bar, with each step's share of the bar in percent.
const CWV_BUILD_STEPS = [
  { id: 'shots', label: 'Choosing shots', weight: 40 },
  { id: 'music', label: 'Preparing music', weight: 10 },
  { id: 'draft', label: 'Creating Draft', weight: 25 },
  { id: 'look', label: 'Adding title and look', weight: 20 },
  { id: 'open', label: 'Opening Draft', weight: 5 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function cwvProgress(stepId, fraction, detail) {
  const i = CWV_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = CWV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = CWV_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + CWV_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  const step = CWV_BUILD_STEPS[i];
  return {
    value,
    percent,
    current: i,
    label: 'Step ' + (i + 1) + '/' + CWV_BUILD_STEPS.length + ' · ' + step.label + (detail ? ' (' + detail + ')' : '') + ' · ' + percent + '%',
  };
}
// cwv-planner:end

function dq(value) { return '"' + String(value).replace(/(["\\`])/g, "\\$1") + '"'; }
function service(name, method) {
  const s = (window.parent as any)?.__DI__?.[name];
  if (!s || typeof s[method] !== "function") throw new Error("This Selects build needs an updated " + name + " adapter.");
  return s;
}
async function readText(root: string, rel: string) {
  const v = await service("FileSystem", "readFile").readFile(root + "/" + rel);
  // Some host builds return text directly; others return bytes.
  return typeof v === "string" ? v : new TextDecoder().decode(new Uint8Array(v));
}
function fill(script: string, cfg: unknown) { return script.replace("__CONFIG__", () => JSON.stringify(cfg)); }
function suggestPlace(projectName: string) {
  const name = String(projectName || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!/^[A-Za-z][A-Za-z .']{1,30}$/.test(name)) return "";
  if (/\b(project|untitled|test|draft|copy|export|final|edit|vlog)\b/i.test(name)) return "";
  return name;
}
function suggestDay(dates: (string | null)[]) {
  const counts: Record<number, number> = {};
  for (const d of dates) { if (!d) continue; const t = new Date(d); if (!isNaN(t.getTime())) counts[t.getDay()] = (counts[t.getDay()] || 0) + 1; }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))[0];
  return best ? WEEKDAYS[Number(best[0])] : "A day";
}

export default function Panel({ sdk, context, ui }: any) {
  const projectId = context?.projectId ?? null;
  const [roots, setRoots] = React.useState<{ plugin: string; data: string } | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [inventory, setInventory] = React.useState<any>(null);
  const [candidates, setCandidates] = React.useState<any>(null);
  const [line1, setLine1] = React.useState("");
  const [connector, setConnector] = React.useState("in");
  const [place, setPlace] = React.useState("");
  const [cueId, setCueId] = React.useState("sunny-soul-strut");
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  const [preset, setPreset] = React.useState("classic");
  const [length, setLength] = React.useState<"short" | "standard" | "long">("standard");
  const [keepSound, setKeepSound] = React.useState(false);
  const [warm, setWarm] = React.useState(true);
  const [only, setOnly] = React.useState<string[] | null>(null);
  const [section, setSection] = React.useState<number | null>(0);
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [step, setStep] = React.useState("");
  const [tools, setTools] = React.useState({ ffmpeg: true, node: true });
  // Build progress (bar + step list). `step` stays for the one-call spinner (own-music beat detection).
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
  const advance = (id: string, fraction: number, detail?: string) => { const p = cwvProgress(id, fraction, detail); progressRef.current = p; setProgress(p); };
  const [status, setStatus] = React.useState<{ tone: string; text: string } | null>(null);
  const [result, setResult] = React.useState<any>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const run = async (summary: string, script: string, allowCommit = false) => {
    let r = await sdk.runScript({ summary, script, allowCommit });
    if (r.isError && /No valid session ID|Streamable HTTP error/.test(r.output || "")) { await new Promise((d) => setTimeout(d, 1500)); r = await sdk.runScript({ summary, script, allowCommit }); }
    if (r.isError || r.result == null) throw new Error(r.output || "Selects could not complete this step.");
    return r.result as any;
  };

  // Mount: resolve folders, read bundled assets, inventory the Project.
  React.useEffect(() => {
    // Drop everything tied to the previous Project so a build never mixes Projects.
    setCandidates(null); setResult(null); setStatus(null); setInventory(null);
    if (!projectId) return;
    let alive = true;
    (async () => {
      try {
        const where = await sdk.runShell({ summary: "Locate plugin folders", command: "mkdir -p " + dq(DATA_DIR) + " && printf '%s\\n%s' " + dq(SKILLS_DIR) + " " + dq(DATA_DIR), timeoutMs: 10000 });
        const [plugin, data] = String(where?.stdout || "").split("\n").map((x) => x.trim());
        if (!plugin || !data) throw new Error("the plugin folders could not be found");
        setRoots({ plugin, data });
        // ffmpeg and node are only needed for previews and own music; bundled cues work without them.
        const probe = await sdk.runShell({ summary: "Check music tools", command: "command -v ffmpeg >/dev/null && echo ffmpeg; command -v node >/dev/null && echo node", timeoutMs: 10000 });
        const have = String(probe?.stdout || "");
        setTools({ ffmpeg: have.includes("ffmpeg"), node: have.includes("node") });
        const read = (rel: string) => readText(plugin, rel);
        const [manifest, presets, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, titleTsx, warmTsx] = await Promise.all([
          read("assets/cues/manifest.json"), read("assets/fonts/presets.json"), read("scripts/inventory.js"), read("scripts/search.js"),
          read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/title-graphic.tsx"), read("assets/warm-look.tsx")]);
        const a = { manifest: JSON.parse(manifest), presets: JSON.parse(presets), scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs }, titleTsx, warmTsx };
        setAssets(a);
        setStep("Checking clips");
        const inv = await run("Read footage", fill(inventoryJs, { projectId, only: null }));
        if (!alive) return;
        setInventory(inv);
        setLine1(suggestDay(inv.resources.map((r: any) => r.recordedAt)));
        setPlace(suggestPlace(context?.projectName));
      } catch (e: any) {
        if (alive) setStatus({ tone: "error", text: "City Weekend Vlog could not start: " + (e?.message || e) + ". Reinstall the plugin if this persists." });
      } finally { setStep(""); }
    })();
    return () => { alive = false; if (audioRef.current) audioRef.current.pause(); };
  }, [projectId]);

  const cue = assets?.manifest.cues.find((c: any) => c.id === cueId) || null;
  const grid = ownMusic ? (ownGrid && ownGrid.accepted ? { bpm: ownGrid.bpm, firstBeat: ownGrid.firstBeat, usableEnd: ownGrid.durationSeconds - 0.5, beatEnergy: ownGrid.beatEnergy, peaks: ownGrid.peaks, accepted: true }
    : { bpm: CWV_REFERENCE_BPM, firstBeat: 0, usableEnd: ownGrid ? ownGrid.durationSeconds - 0.5 : 600, beatEnergy: [], peaks: ownGrid?.peaks || [], accepted: false })
    : cue ? { bpm: cue.bpm, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy, peaks: cue.peaks, accepted: true }
    : { bpm: CWV_REFERENCE_BPM, firstBeat: 0, usableEnd: 600, beatEnergy: [], peaks: [], accepted: false };
  const requested = CWV_LENGTHS[length];
  const videoSeconds = cwvVideoSeconds(grid.bpm, requested);

  // Default the music section to the most energetic window whenever the track, its grid or the length changes.
  // `assets` is a dependency so the default also applies once the manifest has loaded.
  React.useEffect(() => {
    if (!grid.accepted) { setSection(0); return; }
    setSection(cwvDefaultSection({ firstBeat: grid.firstBeat, bpm: grid.bpm, beatEnergy: grid.beatEnergy, usableEnd: grid.usableEnd, videoSeconds }) ?? grid.firstBeat);
  }, [assets, cueId, ownMusic?.path, ownGrid, length]);

  async function detectOwnMusic(file: { path: string; name: string }) {
    setOwnMusic(file); setOwnGrid(null); setBusy(true); setStep("Listening for the beat");
    try {
      const pcm = roots!.data + "/own-music.f32";
      const cmd = "ffmpeg -nostdin -v error -y -t 360 -i " + dq(file.path) + " -ac 1 -ar 22050 -f f32le " + dq(pcm) + " && node " + dq(roots!.plugin + "/beat-detect.cjs") + " " + dq(pcm) + " 22050";
      const r = await sdk.runShell({ summary: "Find the beat of " + file.name, command: cmd, timeoutMs: 120000, maxOutputBytes: 48000 });
      const g = JSON.parse(String(r.stdout || "").trim().split("\n").pop() || "{}");
      if (r.isError || r.exitCode !== 0 || g.error) throw new Error(g.error || r.stderr || "beat detection failed");
      setOwnGrid(g);
      setStatus(g.accepted ? null : { tone: "info", text: "Music added; cuts use the original rhythm because its beat could not be found reliably." });
    } catch (e: any) {
      setOwnGrid({ accepted: false, durationSeconds: 600, peaks: [] });
      setStatus({ tone: "info", text: "Music added; cuts use the original rhythm (" + (e?.message || e) + ")." });
    } finally { setBusy(false); setStep(""); }
  }

  async function preview() {
    if (!ownMusic && !cue) return;
    const file = ownMusic ? ownMusic.path : roots!.plugin + "/assets/cues/" + cue.file;
    const cmd = "ffmpeg -nostdin -v error -ss " + (section || 0).toFixed(2) + " -t 6 -i " + dq(file) + " -ac 1 -ar 22050 -b:a 24k -af \"afade=t=out:st=5.6:d=0.4\" -f mp3 - | base64 | tr -d '\\n'";
    const r = await sdk.runShell({ summary: "Preview music section", command: cmd, timeoutMs: 30000, maxOutputBytes: 49152 });
    const b64 = String(r?.stdout ?? "").replace(/\s+/g, "");
    if (r?.isError || r?.truncated || b64.length < 200) { setStatus({ tone: "error", text: "Could not make a preview." }); return; }
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new Audio("data:audio/mpeg;base64," + b64);
    audioRef.current.play().catch(() => null);
  }

  async function findCandidates(inv: any) {
    const rids = inv.resources.filter((r: any) => !only || only.includes(r.rid)).map((r: any) => r.rid);
    const out: any[] = []; const failed: string[] = [];
    // Four clips per call keeps each scene search under runScript's fixed 30 s deadline.
    for (let i = 0; i < rids.length; i += 4) {
      advance("shots", i / rids.length, i + "/" + rids.length + " clips checked");
      const r = await run("Search city shots", fill(assets.scripts.searchJs, { projectId, rids: rids.slice(i, i + 4), queries: CWV_QUERIES, pageSize: 4 }));
      out.push(...r.candidates); failed.push(...r.failed);
    }
    const dur: Record<string, number> = Object.fromEntries(inv.resources.map((r: any) => [r.rid, r.duration]));
    return { list: out.map((c) => ({ ...c, sourceDuration: dur[c.rid] || 0 })), failed };
  }

  async function build(nextSeed: number) {
    if (busy || !assets || !inventory) return;
    if (cueId === "own" && !ownMusic) { setStatus({ tone: "error", text: "Drop a music file, or choose one of the tracks." }); return; }
    setBusy(true); setStatus(null); setResult(null);
    advance("shots", 0);
    try {
      const found = candidates && candidates.only === JSON.stringify(only) ? candidates : { ...(await findCandidates(inventory)), only: JSON.stringify(only) };
      setCandidates(found);
      advance("shots", 1);
      const start = grid.accepted ? cwvSnapSection({ value: section || 0, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: true }) : (section || 0);
      const fitted = cwvFitMontage({ bpm: grid.bpm, sectionStart: start ?? 0, usableEnd: grid.usableEnd, requested });
      if (!fitted) throw new Error("This music section is too short for the video. Move the section earlier or pick a shorter length.");
      // Plan at 30 fps for allocation; assembly re-snaps every boundary at the Draft's real rate.
      const plan = cwvPlanBuild({ candidates: found.list, bpm: grid.bpm, fps: 30, montageShots: fitted, seed: String(nextSeed) });
      if (!plan.ok) {
        const retry = found.failed.length ? " Could not check " + found.failed.length + " clips — Retry." : "";
        throw new Error("Found " + plan.usableShots + " usable shots; this style needs at least " + plan.needed + ". Add more varied footage or select more clips." + retry);
      }
      advance("music", 0);
      const music = cueId === "none" ? null
        : await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId, path: ownMusic ? ownMusic.path : roots!.plugin + "/assets/cues/" + cue.file }), true);
      const beat = 60 / grid.bpm;
      const beatsAt = [0]; plan.schedule.slots.forEach((s: any, i: number) => beatsAt.push(beatsAt[i] + (i < 13 ? CWV_TITLE_BEATS[i] : 2)));
      advance("music", 1);
      advance("draft", 0);
      const crops = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, { width: r.width, height: r.height }]));
      const name = "City Weekend Vlog " + new Date().toISOString().slice(0, 16).replace("T", " ");
      const a = await run("Assemble City Weekend Vlog", fill(assets.scripts.assembleJs, {
        projectId, draftName: name, picks: plan.picks, boundaries: beatsAt.map((b) => b * beat), crops, mute: !keepSound,
        music: music ? { resourceId: music.resourceId, sectionStart: start ?? 0 } : null }), true);
      if (!a.sequenceId) throw new Error("The Draft \"" + name + "\" was saved, but Selects did not report its id, so the title and look could not be added. Open it from the Drafts list, or build again.");
      const sched = cwvSchedule({ bpm: grid.bpm, fps: a.fps, montageShots: plan.montageShots });
      advance("draft", 1);
      setResult({ sequenceId: a.sequenceId, decorated: false, sched, plan, seed: nextSeed, notes: a.notes });
      await decorate(a.sequenceId, sched, plan, nextSeed);
    } catch (e: any) {
      const at = progressRef.current;
      const where = at ? "Stopped at step " + (at.current + 1) + "/" + CWV_BUILD_STEPS.length + ", " + CWV_BUILD_STEPS[at.current].label + ": " : "";
      setStatus({ tone: "error", text: where + String(e?.message || e) });
    } finally { setBusy(false); setStep(""); setProgress(null); progressRef.current = null; }
  }

  async function decorate(sequenceId: string, sched: any, plan: any, usedSeed: number) {
    advance("look", 0);
    try {
      const p = assets.presets.presets.find((x: any) => x.id === preset);
      const files = [...new Set(["A", "B", "C", "D"].map((k) => p.states[k].file))];
      const fonts = await Promise.all(files.map(async (f) => {
        const s = Object.values(p.states).find((x: any) => x.file === f) as any;
        return { family: s.family, style: s.style, weight: s.weight, b64: (await readText(roots!.plugin, "assets/fonts/" + f)).replace(/\s+/g, "") };
      }));
      const parameters = { line1, connector, place, fontFamily: "", ink: "#F6ECB8", shadow: p.shadow, size: 150, rotation: -7, position: 46,
        events: sched.title, states: p.states, fonts, provenance: { plugin: PLUGIN_ID, version: "0.1.0-alpha.1", preset, cue: ownMusic ? "own" : cueId, seed: usedSeed, picks: plan.picks } };
      const editableParameters = [
        { key: "line1", label: "First line", type: "text", defaultValue: line1 },
        { key: "connector", label: "Connector", type: "text", defaultValue: connector },
        { key: "place", label: "Place", type: "text", defaultValue: place },
        { key: "fontFamily", label: "Main font (optional)", type: "text", defaultValue: "" },
        { key: "ink", label: "Title color", type: "color", defaultValue: "#F6ECB8" },
        { key: "shadow", label: "Shadow", type: "number", defaultValue: p.shadow, min: 0, max: 1, step: 0.05 },
        { key: "size", label: "Size", type: "number", defaultValue: 150, min: 60, max: 240, step: 2 },
        { key: "rotation", label: "Tilt", type: "number", defaultValue: -7, min: -20, max: 20, step: 1 },
        { key: "position", label: "Height (%)", type: "number", defaultValue: 46, min: 20, max: 80, step: 1 },
      ];
      await run("Add title and look", fill(assets.scripts.decorateJs, { sequenceId, titleEnd: sched.title.endFrame, title: { tsx: assets.titleTsx, parameters, editableParameters }, warm: warm ? { tsx: assets.warmTsx, strength: 0.35 } : null }), true);
    } catch (e: any) {
      setStatus({ tone: "error", text: "The Draft was created, but its title and look were not added: " + (e?.message || e) + ". Press Finish title and look to try again." });
      return;
    }
    // The title is saved from here on, so a failed open must not offer the retry (it would add a second title).
    setResult((r: any) => ({ ...r, decorated: true }));
    advance("open", 0);
    try {
      await run("Open the new Draft", "await selects.editor.openDraft(" + JSON.stringify(sequenceId) + "); return { opened: true };");
      advance("open", 1);
    } catch (e: any) {
      setStatus({ tone: "error", text: "The Draft is ready, but it could not be opened: " + (e?.message || e) + ". Open it from the Drafts list." });
    }
  }

  const readiness = !inventory ? "Checking clips…"
    : inventory.resources.length === 0 ? "No analysed video in this Project yet. Analyse your clips, then reopen this panel."
    : "Ready: " + inventory.resources.length + " analysed clips · about " + Math.round(videoSeconds) + " s" + (inventory.skipped.unanalysed ? " · " + inventory.skipped.unanalysed + " clips not analysed yet" : "");
  const peaks: number[] = grid.peaks || [];
  // Bundled peaks can exceed 1.0 slightly, so scale by the loudest bar when it does.
  const peakMax = Math.max(1, ...peaks);
  const total = ownMusic ? (ownGrid?.durationSeconds || 1) : (cue ? cue.duration : 1);
  const boxLeft = ((section || 0) / total) * 100, boxWidth = Math.min(100 - boxLeft, (videoSeconds / total) * 100);
  const silent = cueId === "none" && !ownMusic && !keepSound;
  const canOwnMusic = tools.ffmpeg && tools.node;

  if (!projectId) return <ui.Message tone="error">Open a Project to build a City Weekend Vlog.</ui.Message>;

  return (
    <ui.Stack gap={16}>
      <ui.Message tone="muted">{readiness}</ui.Message>
      <ui.Section title="Title">
        <ui.TextField label="First line" value={line1} onChange={setLine1} />
        <ui.TextField label="Connector" value={connector} onChange={setConnector} />
        <ui.TextField label="Place" value={place} onChange={setPlace} />
      </ui.Section>
      <ui.Section title="Music">
        <ui.Select label="Track" value={ownMusic ? "own" : cueId} onChange={(v: string) => { setCueId(v); if (v !== "own") { setOwnMusic(null); setOwnGrid(null); } }}
          options={[...(assets?.manifest.cues || []).map((c: any) => ({ label: c.label, value: c.id })), ...(canOwnMusic ? [{ label: "Your own music", value: "own" }] : []), { label: "No music", value: "none" }]} />
        {(ownMusic || cueId === "own") && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {!canOwnMusic ? <ui.Message tone="muted">Install ffmpeg and Node.js 18+ to preview music or use your own track.</ui.Message> : null}
        {ownMusic || cue ? (
          <div>
            <div style={{ position: "relative", height: 48, display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
              onClick={(e) => { const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); const v = ((e.clientX - r.left) / r.width) * total;
                setSection(cwvSnapSection({ value: v, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: grid.accepted })); }}>
              {peaks.map((p: number, i: number) => <div key={i} style={{ flex: 1, height: Math.max(2, (p / peakMax) * 44), background: "var(--text-tertiary, #888)" }} />)}
              <div style={{ position: "absolute", top: 0, bottom: 0, left: boxLeft + "%", width: boxWidth + "%", border: "2px solid var(--accent, #f6c343)", borderRadius: 4, pointerEvents: "none" }} />
            </div>
            <ui.Row gap={8} align="center">
              <ui.IconButton icon="play" label="Preview this section" onClick={preview} disabled={busy || !tools.ffmpeg} />
              <span>{section == null ? "This music is too short for this length" : "Starts at " + section.toFixed(1) + " s"}</span>
            </ui.Row>
          </div>
        ) : null}
      </ui.Section>
      <ui.Select label="Font style" value={preset} onChange={setPreset} options={(assets?.presets.presets || []).map((p: any) => ({ label: p.label, value: p.id }))} />
      <ui.Section title="Advanced">
        <ui.Segmented label="Length" value={length} onChange={setLength} options={[{ label: "Short", value: "short" }, { label: "Standard", value: "standard" }, { label: "Long", value: "long" }]} />
        <ui.Toggle label="Keep original clip sound" value={keepSound} onChange={setKeepSound} />
        <ui.Toggle label="Warm look" value={warm} onChange={setWarm} />
        {silent ? <ui.Message tone="muted">Silent video: no music and no original clip sound.</ui.Message> : null}
      </ui.Section>
      {progress ? <ui.Progress value={progress.value} label={progress.label} steps={CWV_BUILD_STEPS.map((s) => s.label)} current={progress.current} />
        : busy ? <ui.Progress label={step || "Working"} /> : null}
      {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.text}</ui.Message> : null}
      {result ? (
        <ui.Message tone="success">
          {"Draft created. Select the title to edit its text or font, a clip to adjust crop or warmth, and the music to change its volume. Moving cuts inside the title will not move the title; rebuilding creates a new Draft and does not keep Inspector edits."}
        </ui.Message>
      ) : null}
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={async () => { setBusy(true); setStatus(null); try { await decorate(result.sequenceId, result.sched, result.plan, result.seed); } finally { setBusy(false); setProgress(null); progressRef.current = null; } }} disabled={busy}>Finish title and look</ui.Button> : null}
        {result ? <ui.Button onClick={() => { const s = seed + 1; setSeed(s); build(s); }} disabled={busy}>Create another version</ui.Button> : null}
        <ui.Button variant="primary" busy={busy} busyLabel={step || "Building"} onClick={() => build(seed)} disabled={busy || !inventory || !inventory.resources.length}>Build</ui.Button>
      </ui.Actions>
    </ui.Stack>
  );
}
