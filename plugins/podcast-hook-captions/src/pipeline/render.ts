// Speaker mattes for the set and the behind-the-head title, made the way Depth Type Captions makes its
// cloud masks: render the reel (look, camera and B-roll, no graphic) through the app's own exporter,
// send it to VEED background removal, and turn the alpha into one full-size PNG per Draft frame
// (white = background, so the grid shows there and the speaker stays in front).
import { app, di, ffmpeg, filesIn, fs, libraryId, removeFile, type Sdk } from "./host";
import { generate } from "./media";

async function sourceRevision(sequenceId: string, resourceIds: string[]) {
  const lib = libraryId();
  const sequence = await di().SequenceRepository.findById(lib, sequenceId);
  if (!sequence) throw new Error("The render copy could not be reloaded.");
  const resources = await Promise.all(resourceIds.map((id) => di().ResourceRepository.findById(lib, id)));
  const json = JSON.stringify({ sequence: sequence.toJSON(), resources: resources.map((r: any) => r?.toJSON() ?? null) });
  const digest = await app().crypto.subtle.digest("SHA-256", new (app().TextEncoder)().encode(json));
  return Array.from(new Uint8Array(digest), (b: number) => b.toString(16).padStart(2, "0")).join("");
}

// Render a copy of the reel Draft to `outputPath` (FHD vertical) and wait for it.
export async function renderDraft(pid: string, sid: string, outputPath: string, progress: (s: string) => void): Promise<void> {
  const d = di();
  const lib = libraryId();
  const project = await d.ProjectRepository.findById(lib, pid);
  const source = await d.SequenceRepository.findById(lib, sid);
  if (!project || !source) throw new Error("The reel Draft could not be read for rendering.");
  const copyId = app().crypto.randomUUID();
  const name = "Reel matte render " + copyId;
  const copy = source.clone({ id: copyId, name });
  copy.setTracks(copy.getTracks().filter((t: any) => !t.isChapterTrack() && !t.isSubChapterTrack() && !t.isWordTrack()));
  if (typeof copy.authorFrameSize === "function") copy.authorFrameSize({ width: 1080, height: 1920 });
  let saved = false;
  try {
    await d.SequenceRepository.save(copy, "podcast-hook-captions-render");
    saved = true;
    const overlaySnapshot = await d.RemotionOverlay.getSnapshotForExport(copyId, copy, project);
    const resourceIds = [...project.getResources()];
    const rev = await sourceRevision(copyId, resourceIds);
    const job = await d.WorkflowClient.start({
      type: "export:video",
      input: {
        resolution: "FHD",
        title: "Reel matte render",
        internal: true,
        outputPath,
        projectId: pid,
        libraryId: lib,
        sequenceId: copyId,
        resourceIds,
        audioOnly: false,
        overwriteOutput: false,
        overlaySnapshot,
        sourceRevision: rev,
      },
    });
    await new Promise<void>((resolve, reject) => {
      let done = false;
      let off = () => {};
      const read = (v: any) => {
        if (done || !v) return;
        if (["succeeded", "failed", "canceled"].includes(v.status)) {
          done = true;
          off();
          v.status === "succeeded" ? resolve() : reject(new Error("Render " + v.status + (v.lastError?.message ? ": " + v.lastError.message : "")));
        } else progress("Rendering the reel for speaker mattes · " + (v.progressDescription || v.status));
      };
      off = d.WorkflowClient.subscribe((e: any) => {
        if (e.type === "UPSERT" && e.workflow.workflowId === job.workflowId) read(e.workflow);
      });
      read(d.WorkflowClient.list().find((x: any) => x.workflowId === job.workflowId));
      if (done) off();
    });
  } finally {
    if (saved) {
      const temp = await d.SequenceRepository.findById(lib, copyId);
      if (temp?.getName() === name) await d.SequenceRepository.delete(lib, copyId);
    }
  }
}

export const VEED = "veed/video-background-removal/fast";

// VEED alpha -> matte_%06d.png (1-based, one per Draft frame) in dir. Returns the local:// base and count.
export async function makeMattes(sdk: Sdk, pid: string, render: string, seconds: number, dir: string, key: string, progress: (s: string) => void) {
  const alpha = await generate(
    pid,
    {
    key: "phc-matte-" + key,
    endpoint: VEED,
    input: { video_url: "selects-input:source", output_codec: "h264", refine_foreground_edges: false, subject_is_person: true },
    // The server prices VEED by frames from this length; milliseconds are plenty.
    inputMediaSeconds: { video: Math.round(seconds * 1000) / 1000 },
    uploads: { source: { pluginFile: render } },
    folder: fs().join(dir, "cloud"),
    outputName: "reel-speaker-mattes",
    tool: "video",
    recipeId: "speaker-masks",
    },
    "Speaker mattes (VEED)",
    progress,
    10 * 60000
  );
  progress("Writing speaker matte frames…");
  // The alpha comes back as luma; negate so the background is white, grow the background by two pixels
  // and firm up the edge so a bright room does not leave a halo round the hair. Plain grayscale PNGs keep
  // the app's fast static-PNG path for masks.
  const MATTE = /^matte_\d{6}\.png$/;
  for (const n of filesIn(dir, MATTE)) removeFile(fs().join(dir, n));
  await ffmpeg(
    "Write matte frames",
    ["-v", "error", "-y", "-i", alpha, "-vf", "format=gray,negate,scale=1080:1920:flags=bicubic,dilation,dilation,lut=y=clip((val-24)*1.2\\,0\\,255)", "-start_number", "1", fs().join(dir.replace(/%/g, "%%"), "matte_%06d.png")],
    600000
  );
  const count = filesIn(dir, MATTE).length;
  if (!count) throw new Error("No matte frames were written.");
  const base = String(fs().pathToLocalURL(dir)).replace(/\/$/, "");
  return { base, count };
}
