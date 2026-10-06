# Podcast Hook Captions

One click turns the podcast Draft you have open into a new vertical (9:16) reel
in a fast "podcast clip" editing style. Everything lands in an ordinary,
editable Draft:

- **The moment.** Selects AI picks a 20-35 second stretch that opens strong and
  ends on a punchline, and writes the titles from the speaker's own words.
- **Face-tracked reframe.** Every shot of the source is scanned with the YuNet
  face detector (a shared background job owned by Selects) and placed so the speaker's eyes sit
  in the upper third.
- **Virtual camera.** Push-ins, tilts, whip pans with motion blur and punch-ins
  on words, driven by one camera plan that the titles ride on.
- **The set.** For the opening title and the return from B-roll, the room is
  replaced by a dark grid: the speaker is cut out with per-frame mattes (Selects
  generation, VEED background removal) and the opening title stands behind the
  speaker's head.
- **Titles.** An editorial opening question, a two-part word stack with a whip
  between the halves and a hand-drawn arrow, a big punch line that blows out and
  drops, and a width-justified closing block.
- **Captions.** One yellow word at a time in a bold condensed face with a
  broad amber glow, timed from the transcript (hesitations such as "um" are
  skipped).
- **B-roll cards.** Two stock clips (Pexels and Pixabay, found through Selects'
  stock search) shown as rounded cards on the grid, brought in with a light-leak
  flash. The panel lists each clip's creator.
- **Sound.** The voice (compressed and EQ'd), a generated phonk bed under it
  and cue-synced whooshes, hits, ticks and a bass drop, mastered loud (about
  -9 LUFS) into one sound clip.
- **Look.** A warm, saturated grade adapted to the source.

## Use

1. Open the podcast Draft (any length, analysed transcript, one speaker on
   screen at a time works best).
2. Open **Podcast Hook Captions** from the Plugin list.
3. Optional: set the reel length and a note for the editor (for example "use the
   part about dopamine").
4. Press **Make reel**. It takes a few minutes (the AI pass and the B-roll
   generation are the slow parts). The new Draft opens when it is done.

On a reel Draft the panel also offers **Rebuild this reel**: same words and
generated media, with the look, camera, mattes, titles and sound made again.

## Face stage without generation

**Run or recover face pass** runs the real face, shot, color and framing stage on
this open Draft without editing it or generating paid media. It saves its journal
beneath `plugin-data/podcast-hook-captions/face-passes/<project>/<draft>`.
Closing the panel stops observation; Selects keeps the face job. Reopen the same
Project and Draft and press the same button to reconnect, including after a lost
submission acknowledgement. **Cancel saved face jobs** requests cancellation
and observes a terminal state. **Start new face pass** is the explicit new-key
retry after a completed, failed or canceled pass. Pending passes must first be
recovered or canceled.

A missing runtime, unsupported host, invalid metadata or inference failure is an
error in this isolated stage. In the complete reel pipeline, the existing
reported fallback to centered shots remains; it is never reported as a
successful no-face observation. Earlier completed reel `job.faces` values are
kept, so upgrading does not silently regenerate them.
An explicit **Rebuild this reel** retries failed or canceled face requests for
that reel. Successful requests are reused; pending or uncertain requests keep
their recovery identity.

## What the reel Draft gets

- The chosen span of the podcast on Main, reframed with a fixed stretch
  Transform and the **Reel Look** effect (reframe, camera, grade).
- B-roll clips on a video track, each with the **Reel Look** card effect.
- The **Reel Titles** motion graphic over the whole reel: set, titles, captions,
  flash. It reads the matte frames from the plugin's data folder.
- One sound clip with the whole mastered soundtrack; the Main clips are turned
  down to -60 dB under it. The soundtrack follows the cut it was made from, so
  after changing the cut press **Rebuild this reel** to bring the sound along.

Titles, music, sound effects and mattes use Selects AI and generation and are
billed to the account like any other generation. Stock B-roll costs nothing.
On a Selects build without stock search, the panel can generate the B-roll with
AI instead (slower, about $2 per reel) when that option is ticked.

## Files it creates

Everything a reel needs is kept beneath
`.selects/plugin-data/podcast-hook-captions` in your home folder (per reel:
render, matte frames, B-roll, music, the sound mix and a `job.json` record), and
the one-time sound-effect library beside it. Model/native runtime caches and job artifacts belong to the separate shared runtime. Delete a
reel's folder only after you have deleted the reel Draft.

## Limits

- Supports macOS arm64 and Windows x64; Mac Intel is outside the shared runtime preparation scope. Requires Selects 2.0.560 or later and `selects-ai-runtime` from the same library commit.
- The first face pass prepares the shared native runtime and pinned YuNet model. This plugin no longer downloads a model or ONNX Runtime Web.
- Direct Video Main clips use transcript-derived source in-points, as in the original reel pipeline. Camera composites and unknown in-points are not inferred.
- Face timestamps must align with the existing source-color/cut frame grid. Each frame must occupy an integer number of source time-base ticks. Variable-rate, quantized clocks (for example 30 fps in a 1/1000 time base), or mismatched sampling fail before AI submission in this version. Fractional fps such as 24000/1001 in a 1/24000 time base is supported.
- Native fixed-input preprocessing can produce different detections from the old dynamic-input WASM detector; no numeric parity is claimed.
- This migration verifies the face stage. It does not establish full paid reel-generation compatibility on Windows.
- Tuned for 1080p horizontal sources; a 720p source looks soft after the crop.
- Burned-in subtitles in the source stay in the picture.
- The panel UI is English only.

Setup: [INSTALL.md](INSTALL.md). Licences: [THIRD_PARTY.md](THIRD_PARTY.md).
