// Speaker mattes for the set and the behind-the-head title, made the way Depth Type Captions makes its
// cloud masks: render the reel (look, camera and B-roll, no graphic) through the app's own exporter,
// send it to VEED background removal, and turn the alpha into one full-size PNG per Draft frame
// (white = background, so the grid shows there and the speaker stays in front).
import { getSdk, script, sleep, ffmpeg, filesIn, fs, removeFile, type Sdk } from "./host";
import { generate } from "./media";

// The host owns the temporary render composition and removes it after the job ends.
export async function renderDraft(pid: string, sid: string, outputPath: string, progress: (s: string) => void): Promise<void> {
  const sdk = getSdk();
  const job = await script(sdk, "Render speaker matte source", `const job=await selects.export.video(${JSON.stringify({projectId:pid,draftSequenceId:sid,outPath:outputPath,resolution:"FHD",composition:{includeCaptions:false,frameSize:{width:1080,height:1920}}})});return {workflowId:job.workflowId};`, true);
  for (;;) {
    const state = await script(sdk, "Read matte render progress", `return await selects.workflow(${JSON.stringify(job.workflowId)}).status();`);
    if (state.status === "succeeded") return;
    if (["failed", "canceled", "unknown"].includes(state.status)) throw new Error("Render " + state.status + (state.lastErrorMessage ? ": " + state.lastErrorMessage : ""));
    progress("Rendering the reel for speaker mattes · " + (state.step || state.status));
    await sleep(750);
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
  for (const n of (await filesIn(dir, MATTE))) (await removeFile(fs().join(dir, n)));
  await ffmpeg(
    "Write matte frames",
    ["-v", "error", "-y", "-i", alpha, "-vf", "format=gray,negate,scale=1080:1920:flags=bicubic,dilation,dilation,lut=y=clip((val-24)*1.2\\,0\\,255)", "-start_number", "1", fs().join(dir.replace(/%/g, "%%"), "matte_%06d.png")],
    600000
  );
  const count = (await filesIn(dir, MATTE)).length;
  if (!count) throw new Error("No matte frames were written.");
  const base = String((await fs().pathToLocalURL(dir))).replace(/\/$/, "");
  return { base, count };
}
