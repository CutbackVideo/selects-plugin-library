// One click: podcast Draft -> finished vertical reel Draft in a fast podcast-clip style.
// The work is kept in a job folder (~/.selects/plugin-data/podcast-hook-captions/reels/<reel id>) with a
// job.json record, so a reel can be rebuilt in place (same words and footage, fresh plan and layers).
import { dataRoot, fs, hostVersion, versionBelow, script, skillRoot, J, type Sdk } from "./host";
import { chooseAll, mapPicks } from "./select";
import { readSource, createReel, readReel, type ReelInfo } from "./reel";
import { ensureFaceRuntime, trackFaces, reelShots, adaptiveGrade, type ClipFaces } from "./faces";
import { generate, ensureSfxLibrary, mediaGeneration } from "./media";
import { renderDraft, makeMattes } from "./render";
import { stockClip, stockSearchAvailable } from "./stock";
import { makeMusic, mixSound } from "./sound";
import { importFiles, applyLook, finishReel, stripReel } from "./apply";
import { buildPlan, type Plan } from "../plan";

const FILLER = /^(uh+|um+|uhm|erm|er|ah+|hmm+|mm+)[.,!?]*$/i;

export type Step = { id: string; label: string; state: "wait" | "run" | "done" | "skip" | "fail"; note?: string };
export const STEPS: [string, string][] = [
  ["pick", "Pick the moment and write the titles"],
  ["draft", "Create the 9:16 reel Draft"],
  ["faces", "Find the speaker and reframe"],
  ["look", "Camera, grade and B-roll cards"],
  ["mattes", "Speaker mattes (VEED)"],
  ["sound", "Music and sound effects"],
  ["titles", "Titles, captions and set"],
];
type OnStep = (id: string, state: Step["state"], note?: string) => void;

export type Job = {
  version: 2;
  projectId: string;
  sourceId: string;
  reelId: string;
  name: string;
  why?: string;
  issues?: string[]; // rules the AI's answer still broke after the re-ask
  picks: any; // reel word indices
  brollPaths?: (string | null)[];
  brollIds?: { id: string; w: number; h: number }[];
  musicPath?: string | null;
  soundIds?: string[];
  brollCredits?: { credit: string; url: string; service?: string }[];
  faces?: Record<number, ClipFaces>;
};
export type MakeResult = { reelId: string; name: string; notes: string[]; seconds: number; credits?: { credit: string; url: string; service?: string }[] };
export type BrollOptions = { generate?: boolean };

const jobDir = (reelId: string) => fs().join(dataRoot(), "reels", reelId);
async function saveJob(job: Job) {
  await fs().writeFile(fs().join(jobDir(job.reelId), "job.json"), J(job));
}
export async function loadJob(reelId: string): Promise<Job | null> {
  try {
    return JSON.parse(String(await fs().readFile(fs().join(jobDir(reelId), "job.json"), "utf8")));
  } catch {
    return null;
  }
}

function preflight() {
  const v = hostVersion();
  if (v && versionBelow(v, "2.0.512")) throw new Error("This needs Selects 2.0.512 or later (this is " + v + ").");
  mediaGeneration();
}

export async function makeReel(sdk: Sdk, ctx: { projectId: string; sequenceId: string }, opts: { seconds: number; hint: string } & BrollOptions, onStep: OnStep): Promise<MakeResult> {
  const t0 = Date.now();
  preflight();
  const pid = ctx.projectId;
  onStep("pick", "run", "Reading the transcript…");
  const src = await readSource(sdk, ctx.sequenceId);
  if (src.words.length < 30) throw new Error("This Draft has too few transcribed words for a reel.");
  onStep("pick", "run", "Choosing the moment and writing titles…");
  const choice = await chooseAll(sdk, src.words, src.fps, opts.seconds, opts.hint);
  const ranges: [number, number][] = choice.spans.map(([a, b]) => {
    const prev = src.words[a - 1];
    const next = src.words[b + 1];
    const s = Math.max(prev ? prev.e : 0, src.words[a].s - Math.round(0.1 * src.fps));
    // Room after the last word for the final block's blow-out and the closing pan, up to 1 s of the source.
    const e = Math.min(next ? next.s - 1 : src.words[b].e + Math.round(1.0 * src.fps), src.words[b].e + Math.round(1.0 * src.fps));
    return [s, e];
  });
  onStep("pick", "done", choice.why || "");

  onStep("draft", "run", "Creating the Draft…");
  const reelId = await createReel(sdk, pid, ctx.sequenceId, src.name + " · Reel", ranges);
  fs().mkdirSync(jobDir(reelId), { recursive: true });
  const reel = await readReel(sdk, pid, reelId);
  const byKey = new Map<string, number>();
  reel.words.forEach((w, i) => byKey.set(w.ss + "|" + w.t, i));
  const map = new Map<number, number>();
  for (const w of src.words) {
    const k = byKey.get(w.ss + "|" + w.t);
    if (k != null) map.set(w.i, k);
  }
  const job: Job = { version: 2, projectId: pid, sourceId: ctx.sequenceId, reelId, name: src.name + " · Reel", why: choice.why, issues: choice.issues, picks: mapPicks(choice.picks, map) };
  await saveJob(job);
  onStep("draft", "done", (reel.endFrame / reel.fps).toFixed(1) + " s");
  const notes = await build(sdk, job, reel, onStep, opts);
  if (choice.missing.length) notes.unshift("Titles not found in the transcript and left out: " + choice.missing.join("; "));
  await script(sdk, "Open the reel", `return await selects.editor.openDraft(${J(reelId)});`).catch(() => null);
  return { reelId, name: job.name, notes, seconds: (Date.now() - t0) / 1000, credits: job.brollCredits };
}

// Rebuild an existing reel in place: same words, footage and generated media; fresh plan and layers.
export async function rebuildReel(sdk: Sdk, reelId: string, onStep: OnStep, opts: BrollOptions = {}): Promise<MakeResult> {
  const t0 = Date.now();
  preflight();
  const job = await loadJob(reelId);
  if (!job) throw new Error("This reel has no saved job to rebuild from.");
  onStep("pick", "skip", "kept");
  onStep("draft", "run", "Clearing the previous layers…");
  await stripReel(sdk, reelId, job.projectId, jobDir(reelId));
  const reel = await readReel(sdk, job.projectId, reelId);
  onStep("draft", "done", (reel.endFrame / reel.fps).toFixed(1) + " s");
  const notes = await build(sdk, job, reel, onStep, opts);
  return { reelId, name: job.name, notes, seconds: (Date.now() - t0) / 1000, credits: job.brollCredits };
}

async function build(sdk: Sdk, job: Job, reel: ReelInfo, onStep: OnStep, opts: BrollOptions): Promise<string[]> {
  const pid = job.projectId;
  const dir = jobDir(job.reelId);
  const notes: string[] = [];
  const say = (id: string) => (s: string) => onStep(id, "run", s);
  const W = 1080;
  const H = 1920;
  const key = job.reelId.replace(/-/g, "").slice(0, 16) + "-" + Date.now().toString(36);
  const picks = job.picks;

  // Generation runs in the background while the Draft is prepared (reused when already made).
  const style = ". Realistic cinematic stock footage, natural warm light, shallow depth of field, smooth slow camera move, no text, no logos, no captions.";
  const gen = (slot: number, prompt: string, aspect: string, dur: string, label: string) => {
    const have = job.brollPaths?.[slot];
    if (have && fs().existsSync(have)) return Promise.resolve(have);
    // A clip that was delivered after an earlier run gave up on it is still usable.
    try {
      const folder = fs().join(dir, "broll-" + slot);
      const late = fs().existsSync(folder) ? fs().readdirSync(folder).map(String).find((n: string) => /\.mp4$/i.test(n)) : null;
      if (late) return Promise.resolve(fs().join(folder, late));
    } catch {}
    return generate(
      pid,
      {
      key: "phc-b" + slot + "-" + key,
      endpoint: "bytedance/seedance-2.0/fast/text-to-video",
      input: { prompt: prompt + style, aspect_ratio: aspect, duration: dur, resolution: "720p", generate_audio: false },
      folder: fs().join(dir, "broll-" + slot),
      outputName: "reel-broll-" + slot,
      tool: "video",
      recipeId: "reel-broll",
      },
      label,
      undefined,
      12 * 60000
    )
      .catch((e) => (notes.push(String(e.message || e)), null));
  };
  // Stock footage first (seconds, no cost, what the reference uses); generated clips only when asked for.
  const stock = async (): Promise<(string | null)[]> => {
    if (job.brollPaths && job.brollPaths.every((p) => p && fs().existsSync(p))) return job.brollPaths;
    const b = picks.broll;
    const words = (t: string) => String(t || "").split(/\s+/).filter((w) => w.length > 3).slice(0, 3).join(" ");
    const search: string[] = Array.isArray(b.search) ? b.search : [];
    const credits: { credit: string; url: string; service?: string }[] = [];
    const folder = fs().join(dir, "stock");
    const first = await stockClip(sdk, [search[0], words(b.portrait), search[1]].filter(Boolean), "portrait", folder, 8).catch((e) => (notes.push("Stock B-roll: " + String(e.message || e)), null));
    if (first) credits.push({ credit: first.credit, url: first.url, service: first.service });
    const second = await stockClip(sdk, [search[1], words(b.landscape), search[0]].filter(Boolean), "landscape", folder, 6, first ? [first.id] : []).catch((e) => (notes.push("Stock B-roll: " + String(e.message || e)), null));
    if (second) credits.push({ credit: second.credit, url: second.url, service: second.service });
    job.brollCredits = credits;
    if (!first && !second) notes.push("No stock B-roll was found for this moment.");
    return [first ? first.path : null, second ? second.path : null];
  };
  let brollJobs: Promise<string | null>[] = [];
  if (picks.broll) {
    if (stockSearchAvailable()) {
      const both = stock();
      brollJobs = [both.then((r) => r[0]), both.then((r) => r[1])];
    } else if (opts.generate) brollJobs = [gen(0, picks.broll.portrait, "9:16", "5", "B-roll 1"), gen(1, picks.broll.landscape, "16:9", "4", "B-roll 2")];
    else if (job.brollPaths && job.brollPaths.some((p) => p && fs().existsSync(p))) brollJobs = job.brollPaths.map((p) => Promise.resolve(p && fs().existsSync(p) ? p : null));
    else notes.push("No B-roll: this Selects version has no stock search. Update Selects, or allow AI-generated B-roll in the panel.");
  }
  const musicJob =
    job.musicPath && fs().existsSync(job.musicPath)
      ? Promise.resolve(job.musicPath)
      : makeMusic(pid, reel.endFrame / reel.fps, dir, key, () => {}).catch((e) => (notes.push("Music: " + String(e.message || e)), null));
  const sfxJob = ensureSfxLibrary(pid, () => {}).catch((e) => (notes.push("Sound effects: " + String(e.message || e)), {} as Record<string, string>));

  // ---- faces and reframing ----
  onStep("faces", "run", "Preparing face tracking…");
  let faces = job.faces;
  if (!faces || !Object.keys(faces).length || Object.values(faces).some((f) => f.color === undefined)) {
    try {
      const rt = await ensureFaceRuntime(say("faces"));
      onStep("faces", "run", "Finding the speaker…");
      faces = await trackFaces(rt, dir, reel.clips, reel.fps, say("faces"));
      job.faces = faces;
      await saveJob(job);
    } catch (e: any) {
      // Without the face tracker (e.g. no network for its one-time download) the reel is framed on the
      // centre; the next build tries again.
      notes.push("Face tracking unavailable (" + String(e?.message || e) + "); shots are centred.");
      faces = {};
    }
  }
  const shots = reelShots(W, H, reel.fps, reel.clips, faces);
  onStep("faces", "done", shots.filter((s) => s.face).length + " of " + shots.length + " shots framed on a face");
  const plan: Plan = buildPlan({ fps: reel.fps, W, H, endFrame: reel.endFrame, words: reel.words.map((w) => ({ t: w.t, s: w.s, e: w.e })), shots, picks });
  notes.push(...plan.notes);
  await fs().writeFile(fs().join(dir, "plan.json"), J({ picks, plan, shots }));

  // ---- look and camera on the speaker (B-roll is placed at the end, so the matte render can go ahead
  // while the B-roll is still being generated) ----
  onStep("look", "run", "Applying the look…");
  await applyLook(sdk, job.reelId, pid, plan, reel.clips, shots, [], adaptiveGrade(faces));
  onStep("look", "done", picks.broll ? "B-roll cards follow when they are ready" : "");

  // ---- mattes ----
  onStep("mattes", "run", "Rendering the reel for speaker mattes…");
  const render = fs().join(dir, "render-" + Date.now() + ".mp4");
  await renderDraft(pid, job.reelId, render, say("mattes"));
  let masks: { base: string; count: number } | null = null;
  try {
    const matteDir = fs().join(dir, "mattes-" + Date.now().toString(36));
    fs().mkdirSync(matteDir, { recursive: true });
    masks = await makeMattes(sdk, pid, render, reel.endFrame / reel.fps, matteDir, key, say("mattes"));
    onStep("mattes", "done", masks.count + " frames");
  } catch (e: any) {
    notes.push("Speaker mattes failed (" + String(e.message || e) + "); the set and the behind-the-head title are left out.");
    onStep("mattes", "fail", String(e.message || e));
  }

  // ---- sound ----
  onStep("sound", "run", "Waiting for music and sound effects…");
  const [music, lib] = await Promise.all([musicJob, sfxJob]);
  job.musicPath = music;
  let soundId: string | null = null;
  try {
    const wav = fs().join(dir, "reel-sound-" + Date.now().toString(36) + ".wav");
    const mixed = await mixSound(plan, render, music, lib || {}, wav, dir);
    const imp = await importFiles(sdk, pid, [wav]);
    soundId = imp[0]?.id || null;
    if (soundId) job.soundIds = [...(job.soundIds || []), soundId];
    onStep("sound", "done", "mastered to " + mixed.lufs.toFixed(1) + " LUFS" + (music ? ", music −13 dB" : ", no music"));
  } catch (e: any) {
    notes.push("Sound: " + String(e.message || e));
    onStep("sound", "fail", String(e.message || e));
  }
  await saveJob(job);

  // ---- B-roll ----
  onStep("titles", "run", picks.broll ? "Waiting for B-roll…" : "Adding titles and captions…");
  let brollPaths = await Promise.all(brollJobs);
  // One clip is enough: the reference itself reuses its first clip for the third card.
  if (brollPaths.some(Boolean) && !brollPaths.every(Boolean)) {
    const one = brollPaths.find(Boolean) as string;
    brollPaths = brollPaths.map((p) => p || one);
  }
  let brolls: { id: string; w: number; h: number }[] = [];
  if (brollPaths.length && brollPaths.every(Boolean)) {
    // Resource ids are looked up by path every build (they are not stable across app sessions).
    const uniq = [...new Set(brollPaths as string[])];
    const imported = await importFiles(sdk, pid, uniq);
    brolls = (brollPaths as string[]).map((p) => imported.find((x) => x.path === p)!).map((x) => ({ id: x.id, w: x.w, h: x.h }));
    job.brollPaths = brollPaths;
    job.brollIds = brolls;
    await saveJob(job);
  } else if (plan.broll.length) {
    notes.push("B-roll could not be generated; the reel has no B-roll cards.");
    plan.broll = [];
    plan.flashes = [];
  }

  // ---- titles, captions, set ----
  onStep("titles", "run", "Adding B-roll, titles and captions…");
  const font = async (file: string) => {
    try {
      return String(await fs().readFile(fs().join(skillRoot(), "fonts", file), "utf8")).trim();
    } catch {
      return "";
    }
  };
  const heroFontData = await font("SixCaps-Regular.woff2.b64");
  const captionFontData = await font("RobotoFlex-Caption.woff2.b64");
  const leadFontData = await font("RedditSans-Lead.woff2.b64");
  const data = {
    W,
    H,
    fps: reel.fps,
    uid: key.slice(0, 8),
    // Hesitations stay in the audio but never become a caption.
    words: reel.words.filter((w) => !FILLER.test(w.t)).map((w) => [w.t, w.s, w.e]),
    capHide: plan.capHide,
    capY: plan.capY,
    camera: plan.camera,
    titles: plan.titles,
    setOpacity: masks ? plan.setOpacity : [],
    gridZoom: plan.gridZoom,
    gridTexture: plan.gridTexture,
    flashes: plan.flashes,
    masks,
    heroFontData,
    captionFontData,
    leadFontData,
  };
  // The mastered soundtrack carries the voice, so the Main clips go silent under it.
  await finishReel(sdk, job.reelId, pid, plan, data, soundId, brolls, soundId ? -60 : 0);
  onStep("titles", "done");
  return notes;
}
