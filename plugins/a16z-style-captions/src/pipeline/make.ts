// One click: a talking-head Draft -> a finished 9:16 Short in the a16z house style. The work is kept in
// a job folder (~/.selects/plugin-data/a16z-style-captions/shorts/<short id>) with a job.json record, so
// the captions and graphics can be rebuilt in place on the same cut.
import { dataRoot, fs, hostIsWindows, hostRoots, hostVersion, versionBelow, script, J, PANEL_ID, type Sdk } from "./host";
import { readDraft, type DraftInfo } from "./source";
import { semanticPass, type Semantic, type TWord } from "./semantic";
import { ensureFaceRuntime, trackFaces, type SourceFaces } from "./faces";
import { planPauses, layoutRanges, type NewClip } from "./edit";
import { planFraming, addFramingChanges, type FramingPlan } from "./framing";
import { makeMusic, loudness, gains } from "./sound";
import { mediaGeneration } from "./media";
import { createShort, importFiles, finishShort, stripShort, type PlacedInsert } from "./apply";
import { buildGraphic, prepareShort, unitStarts, fillCoverage, type Look } from "./graphic";
import { planInserts, fetchInserts, coverRect, type InsertCache } from "./inserts";

export type Step = { id: string; label: string; state: "wait" | "run" | "done" | "skip" | "fail"; note?: string };
export const STEPS: [string, string][] = [
  ["read", "Read the transcript"],
  ["think", "Mark key ideas (AI)"],
  ["faces", "Find the speaker"],
  ["cut", "Tighten pauses and frame 9:16"],
  ["music", "Music bed"],
  ["broll", "B-roll from stock footage"],
  ["captions", "Captions, cards and name tag"],
];
export type OnStep = (id: string, state: Step["state"], note?: string) => void;
export type Options = { name: string; role: string; music: boolean; cards: boolean; broll: boolean; logo: string; hint: string };
export type MakeResult = { shortId: string; name: string; notes: string[]; seconds: number };

export type Job = {
  version: 1;
  projectId: string;
  sourceId: string;
  shortId: string;
  name: string;
  fps: number;
  semantic: Semantic | null;
  framing: FramingPlan;
  // the Short's clips and the source faces, so a rebuild can plan the framing again
  layout?: NewClip[];
  faces?: Record<string, SourceFaces>;
  srcWords: TWord[];
  musicPath?: string | null;
  musicId?: string | null;
  brollIds?: string[];
  brollCache?: InsertCache;
  voiceLufs?: number | null;
  opts: Options;
};

const jobDir = (id: string) => fs().join(dataRoot(), "shorts", id);
async function saveJob(job: Job) {
  fs().mkdirSync(jobDir(job.shortId), { recursive: true });
  await fs().writeFile(fs().join(jobDir(job.shortId), "job.json"), J(job));
}
export async function loadJob(id: string): Promise<Job | null> {
  try {
    return JSON.parse(String(await fs().readFile(fs().join(jobDir(id), "job.json"), "utf8")));
  } catch {
    return null;
  }
}

export async function makeShort(sdk: Sdk, ctx: { projectId: string; sequenceId: string }, opts: Options, onStep: OnStep): Promise<MakeResult> {
  const t0 = Date.now();
  const notes: string[] = [];
  const v = hostVersion();
  if (opts.music && v && versionBelow(v, "2.0.512")) {
    notes.push("Music needs Selects 2.0.512 or later; the Short has no music bed.");
    opts = { ...opts, music: false };
  }
  const pid = ctx.projectId;
  onStep("read", "run");
  const src: DraftInfo = await readDraft(sdk, pid, ctx.sequenceId, "Read the talking-head Draft");
  if (src.words.length < 8) throw new Error("This Draft has too few transcribed words. Transcribe it first.");
  if (!src.clips.length) throw new Error("This Draft has no footage on Main.");
  const fps = src.fps;
  const tw: TWord[] = src.words.map((w) => ({ i: w.i, t: w.t, s: w.s / fps, e: w.e / fps }));
  onStep("read", "done", src.words.length + " words, " + (src.endFrame / fps).toFixed(1) + " s");

  // the semantic pass and face tracking run side by side
  onStep("think", "run", "Reading the story…");
  const think = semanticPass(sdk, tw, opts.hint)
    .then((s) => {
      onStep("think", "done", (s.tags.keyTerms?.length || 0) + " key terms, " + s.cards.length + " card" + (s.cards.length === 1 ? "" : "s"));
      return s;
    })
    .catch((e) => {
      notes.push("The AI pass failed (" + String(e?.message || e).slice(0, 160) + "); captions use the plain rules.");
      onStep("think", "fail", "plain rules");
      return null;
    });
  onStep("faces", "run");
  const facesJob = (async (): Promise<Record<string, SourceFaces>> => {
    // The face tracker is Python + OpenCV through a POSIX shell (faces.ts), so it runs on macOS only.
    if (hostIsWindows()) {
      notes.push("Speaker framing is available on macOS for now, so every shot is centred.");
      onStep("faces", "skip", "centred");
      return {};
    }
    try {
      const rt = await ensureFaceRuntime(sdk, (s) => onStep("faces", "run", s));
      const jobs = src.clips
        .filter((c) => c.path && c.srcStart >= 0)
        .map((c) => ({ id: String(c.clipId), path: c.path as string, start: c.srcStart, end: c.srcStart + (c.e - c.s) / fps }));
      const dir = fs().join(dataRoot(), "sources", ctx.sequenceId);
      const faces = await trackFaces(sdk, rt, dir, jobs);
      const n = Object.values(faces).reduce((a, f) => a + f.shots.filter((s) => s.face).length, 0);
      onStep("faces", "done", n + " shot" + (n === 1 ? "" : "s") + " with a face");
      return faces;
    } catch (e: any) {
      notes.push("Speaker framing was skipped (" + String(e?.message || e).slice(0, 160) + "), so shots are centred.");
      onStep("faces", "fail", "centred");
      return {};
    }
  })();
  const [semantic, faces] = await Promise.all([think, facesJob]);

  onStep("cut", "run", "Tightening pauses…");
  const cut = planPauses(src.words, fps, src.endFrame, semantic?.tags || {});
  const layout = layoutRanges(cut.ranges, src.clips, fps);
  const framing = planFraming(layout, faces, fps);
  const base = src.name.replace(/\s+·\s+9:16.*$/, "") + " · a16z Short";
  const made = await createShort(sdk, pid, ctx.sequenceId, base, cut.ranges, framing.clips, fps);
  onStep("cut", "done", cut.removed.toFixed(1) + " s of pauses removed, " + cut.cuts + " cuts");
  const job: Job = { version: 1, projectId: pid, sourceId: ctx.sequenceId, shortId: made.id, name: made.name, fps, semantic, framing, layout, faces, srcWords: tw, opts };
  await saveJob(job);
  const more = await build(sdk, job, onStep);
  await script(sdk, "Open the Short", `return await selects.editor.openDraft(${J(made.id)});`).catch(() => null);
  return { shortId: made.id, name: made.name, notes: [...notes, ...more], seconds: (Date.now() - t0) / 1000 };
}

// Rebuild the captions, graphics and music of an existing Short on its current cut.
export async function rebuildShort(sdk: Sdk, shortId: string, opts: Options, onStep: OnStep): Promise<MakeResult> {
  const t0 = Date.now();
  const job = await loadJob(shortId);
  if (!job) throw new Error("This Draft was not made by this panel, so there is nothing to rebuild.");
  job.opts = { ...job.opts, ...opts };
  for (const id of ["read", "faces", "cut"]) onStep(id, "skip", "kept");
  // a Short made while the assistant was unavailable gets its semantic pass now
  if (!job.semantic) {
    onStep("think", "run", "Reading the story…");
    job.semantic = await semanticPass(sdk, job.srcWords, opts.hint).catch(() => null);
    onStep("think", job.semantic ? "done" : "fail", job.semantic ? (job.semantic.tags.keyTerms?.length || 0) + " key terms" : "plain rules");
    await saveJob(job);
  } else onStep("think", "skip", "kept");
  await stripShort(sdk, shortId, [job.musicId || "", ...(job.brollIds || [])]);
  const notes = await build(sdk, job, onStep);
  return { shortId, name: job.name, notes, seconds: (Date.now() - t0) / 1000 };
}

async function build(sdk: Sdk, job: Job, onStep: OnStep): Promise<string[]> {
  const notes: string[] = [];
  // framing follows the current rules on every build (the Look effects are written again at the end)
  if (job.layout && job.faces) job.framing = planFraming(job.layout, job.faces, job.fps);
  const pid = job.projectId;
  const dir = jobDir(job.shortId);
  const short = await readDraft(sdk, pid, job.shortId, "Read the Short");
  const fps = short.fps;
  const end = short.endFrame;
  const key = job.shortId.replace(/-/g, "").slice(0, 12);

  // music in the background
  onStep("music", job.opts.music ? "run" : "skip", job.opts.music ? "Composing…" : "off");
  const musicJob: Promise<string | null> = !job.opts.music
    ? Promise.resolve(null)
    : job.musicPath && fs().existsSync(job.musicPath)
      ? Promise.resolve(job.musicPath)
      : (async () => {
          mediaGeneration();
          return makeMusic(pid, end / fps, dir, key, (s) => onStep("music", "run", s));
        })().catch((e) => {
          notes.push("Music: " + String(e?.message || e).slice(0, 200));
          onStep("music", "fail", String(e?.message || e).slice(0, 80));
          return null;
        });

  const prep = prepareShort(job, short);

  // B-roll: the semantic pass's beats, placed as runs of short stock shots
  let placed: PlacedInsert[] = [];
  let insertTimes: { a: number; b: number; bright?: boolean }[] = [];
  if (job.opts.broll !== false && job.semantic?.broll?.length) {
    onStep("broll", "run", "Finding footage…");
    try {
      const blocked = prep.cards.map((c) => [c.a / fps, c.b / fps] as [number, number]);
      const runs = planInserts(prep.words, job.semantic.broll, prep.duration, blocked, { earliest: prep.title ? prep.title.b / fps + 0.3 : 2.4, starts: unitStarts(job, prep) });
      job.brollCache = job.brollCache || {};
      const got = await fetchInserts(sdk, runs, dir, (s) => onStep("broll", "run", s), job.brollCache);
      notes.push(...got.notes);
      if (got.shots.length) {
        const paths = [...new Set(got.shots.map((x) => x.clip.path))];
        const imp = await importFiles(sdk, pid, paths);
        const idOf = (p: string) => imp.find((x) => x.path === p)?.id || "";
        job.brollIds = [...new Set([...(job.brollIds || []), ...imp.map((x) => x.id).filter(Boolean)])];
        const lost = imp.filter((x) => !x.id).length;
        if (lost) notes.push("B-roll: " + lost + " of " + imp.length + " clips could not be added to the Project and were left out.");
        placed = got.shots
          .filter((x) => idOf(x.clip.path))
          .map((x, k) => ({
            id: idOf(x.clip.path),
            a: Math.round(x.a * fps),
            // never past the end of the cut clip
            b: Math.min(Math.round(x.b * fps), Math.round(x.a * fps) + (x.clip.dur ? Math.floor((x.clip.dur - 0.06) * fps) : 1e9)),
            sw: x.clip.width,
            sh: x.clip.height,
            rect: coverRect(x.clip.width, x.clip.height, 1080, 1920),
            // a slow push on about one shot in six
            push: k % 6 === 2 ? 0.06 : 0,
          }));
        placed = placed.filter((x) => x.b - x.a >= Math.round(0.5 * fps));
        insertTimes = placed.map((x) => ({ a: x.a / fps, b: x.b / fps, bright: (got.shots.find((g) => idOf(g.clip.path) === x.id && Math.round(g.a * fps) === x.a)?.luma ?? 0) > 175 }));
        const credits = [...new Set(got.shots.map((x) => x.clip.credit + " (" + x.clip.service + ")"))];
        notes.push("Stock footage: " + credits.join(", ") + ".");
      }
      const cover = insertTimes.reduce((n, x) => n + x.b - x.a, 0) / prep.duration;
      onStep("broll", got.shots.length ? "done" : "skip", placed.length + " shots, " + Math.round(cover * 100) + "% of the Short");
    } catch (e: any) {
      notes.push("B-roll: " + String(e?.message || e).slice(0, 200));
      onStep("broll", "fail", String(e?.message || e).slice(0, 80));
    }
  } else onStep("broll", "skip", job.opts.broll === false ? "off" : "no footage moments");

  onStep("captions", "run", "Designing captions…");
  // designed cards fill what stock and the planned designs leave uncovered
  const src0 = short.clips[0];
  const filled = job.opts.cards !== false ? fillCoverage(prep, insertTimes, unitStarts(job, prep), !!(job.opts.name || job.semantic?.speaker), src0 && src0.sw && src0.sh ? src0.sw / src0.sh : 16 / 9) : 0;
  if (filled) notes.push(filled + " designed card" + (filled === 1 ? "" : "s") + " added to keep the picture moving.");
  // the picture changes at least every few seconds: crop changes where no cut, insert or card does it
  const covered: [number, number][] = [
    ...insertTimes.map((x) => [x.a, x.b] as [number, number]),
    ...prep.cards.map((c) => [c.a / fps, c.b / fps] as [number, number]),
    ...(prep.title ? [[0, prep.title.b / fps] as [number, number]] : []),
  ];
  const framing = addFramingChanges(job.framing, covered, unitStarts(job, prep), fps, prep.duration);
  const view: Job = { ...job, framing };
  prep.cuts = [...new Set([...prep.cuts, ...framing.cuts])].sort((a, b) => a - b);
  const fonts = await readFonts(sdk);
  const look: Look = await buildGraphic({ job: view, prep, fonts, logo: job.opts.logo, inserts: insertTimes });
  notes.push(...look.notes);

  const musicPath = await musicJob;
  let music: { id: string; db: number } | null = null;
  let voiceDb = 0;
  try {
    if (job.voiceLufs == null) {
      const first = short.clips[0];
      job.voiceLufs = first?.path && first.srcStart >= 0 ? await loudness(sdk, first.path, first.srcStart, Math.min(60, (end - first.s) / fps)) : null;
    }
    let musicLufs: number | null = null;
    if (musicPath) {
      musicLufs = await loudness(sdk, musicPath);
      if (job.musicPath !== musicPath || !job.musicId) {
        const imp = await importFiles(sdk, pid, [musicPath]);
        job.musicId = imp[0]?.id || null;
        job.musicPath = musicPath;
        if (!job.musicId) {
          notes.push("Music: the bed could not be added to the Project; the Short has no music.");
          onStep("music", "fail", "could not add it to the Project");
        }
      }
    }
    const g = gains(job.voiceLufs ?? null, musicLufs);
    voiceDb = g.voiceDb;
    if (musicPath && job.musicId) {
      music = { id: job.musicId, db: g.musicDb };
      onStep("music", "done", "bed " + (musicLufs != null && job.voiceLufs != null ? "9 dB under the voice" : "added"));
    }
  } catch (e: any) {
    notes.push("Levels: " + String(e?.message || e).slice(0, 160));
  }
  await saveJob(job);
  await finishShort(sdk, job.shortId, pid, end, look.data, music, voiceDb, placed, fps, { clips: framing.clips, windows: prep.windows });
  onStep("captions", "done", look.summary);
  return notes;
}

async function readFonts(sdk: Sdk): Promise<{ sans: string; serif: string; roman: string; light: string }> {
  // The install folder: <home>/.selects/skills/<id> when it holds the fonts, else SELECTS_USER_SKILLS_ROOT/<id>.
  let root = "";
  try {
    root = (await hostRoots(sdk, PANEL_ID, "fonts")).plugin;
  } catch {}
  const read = async (file: string) => {
    if (!root) return "";
    try {
      return String(await fs().readFile(fs().join(root, "fonts", file), "utf8")).trim();
    } catch {
      return "";
    }
  };
  const [sans, serif, roman, light] = await Promise.all([read("InterDisplay-Medium.woff2.b64"), read("EditorialSerif-Italic.woff2.b64"), read("EditorialSerif-Regular.woff2.b64"), read("EditorialSerif-Light.woff2.b64")]);
  return { sans, serif, roman, light };
}
