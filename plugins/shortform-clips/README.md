# Shortform Clips

A shared app for turning a YouTube link, project video, synced timeline, or existing
Draft into editable vertical Drafts. Customer designs, detection keywords and passage-selection instructions
are delivered separately as template packs. The app has no bundled customer templates.

## Use

1. Open **Shortform Clips** from Apps with a Project open.
2. In **Templates**, choose **+ Add templates** at the bottom of the template
   picker, paste the link you received, and click **Add**. With no templates yet,
   use the **Add templates** button.
3. Select a source (YouTube or Project), a template (or automatic detection), and the clip count in
   **Make clips**. Add optional instructions and create the clips.
4. In **My clips**, review one clip per row, with a saved preview, title and description.
   Hover or focus a preview to reveal Open; click it to open the Draft. The current
   Draft has a dimmed preview and a Viewing badge. Use **Saved results** to switch between runs in this Project; the latest
   is first, with source titles, dates and clip counts. Validation failures and new
   runs preserve previous results. You can browse history while generation runs;
   the first saved clip opens My clips with live progress and a cancel control.
   Later clips appear as they are saved; subsequent updates do not override your
   tab or history selection. Export through **Handoff > Export**.

The Project picker includes videos, synced timelines, and Drafts, including inputs
shorter than two minutes. Refresh the list after creating a timeline. Synced inputs
use their merged transcript; Draft inputs use their playback transcript, excluding
cut speech and following the edited order. Selected Draft ranges are copied across
all tracks into new editable clips. The input is not modified. Timeline inputs
need an existing readable transcript; this app does not start member analysis.
Saved runs retain the input kind and Draft identity when resumed.

For face-following series templates, the app saves the edited Draft before
reframing. For single-source footage, the existing Selects Agent inspects raw
source imagery through read-only SDK tools and returns the editorial plan:
measured face IDs, shot boundaries, coarse source panes, and solo/stacked/wide layouts.
The supplied transcript retains speaker labels so the agent can target visual
checks at speech-turn changes. Labels are cues, not verified visual identities.
Template preferences constrain those choices. The panel validates the plan,
applies aspect-correct source effects, and preserves captions and audio.

Before planning, AI Runtime samples selected source ranges every 0.5 seconds.
Face boxes become per-frame candidate IDs, not persistent person identities.
The agent chooses candidates using raw imagery and transcript cues; it does not
invent precise face coordinates. Code derives aspect-correct crops from measured
boxes, padded head margins, template close-up and face-height preferences, and
optional coarse pane bounds. Padding is not full-head segmentation and does not
guarantee hair coverage. A stable composition ID reuses identical crop coordinates
across silence-removal joins. Source UUIDs and agent-local aliases are normalized
before matching clips. Reapplication replaces the app-owned effect in place.
Before planning, the app prepares up to eight short face-motion bursts, one burst per
image. Rows hold the same measured candidate window; columns advance through
up to eight source frames over at most 1.5 seconds, without crossing a surviving
source segment. A conservative full-frame appearance-change guard truncates a
strip before a detected source discontinuity and refines that observed change
with consecutive source-frame probes. The agent receives its measured boundary. Detected post-cut frames are not labeled with the pre-cut face ID.
This guard is not exhaustive scene detection or identity tracking; fast motion
can shorten evidence and require an additional agent read. Each burst includes
uncropped context and measured reference IDs. Planning retains every word/source
coordinate and face reference but omits geometry handled by the app. The model
records per-candidate visual observations before its subject choices. Visual
review receives only the selected face measurements, rather than the full survey.
Single-frame source captures retain more face detail than a downsized grid of
full broadcast frames. On supported hosts, the same inspected continuous windows
also run local Light-ASD AVA audio/visual speaker inference. Its uncalibrated
logits are matched conservatively to measured face IDs and delivered with explicit
source-frame coordinates to the single-video agent. Windows stop at the inspected
source boundary; too-short windows and ambiguous face matches remain unknown.
The shared runtime queue deduplicates identical requests across concurrent clips;
unsupported hosts retain visual evidence without claiming audio verification.
The agent still decides identities, reaction holds and layouts. These bounded
samples are not continuous person tracking or full-clip speaker verification.
Identical preparation requests
share a bounded in-memory promise cache. Agents remain parallel.
The agent links recurring transcript speaker IDs to people across solo/mosaic
views, distinguishes brief acknowledgements from sustained answers, and may
explicitly hold a reaction view while a speaker is offscreen. Missing/ambiguous
turns and exact cut alignment remain available through read-only SDK tools.
This measured-face path applies to single-source footage; the multicam director
remains separate. There is no additional geometry-recovery AI stage.

The panel checks ownership, duration, fps, canvas and normalized transcript timing.
Before applying, it compiles the entire plan and rejects non-finite crops,
out-of-pane coordinates, clipped measured heads (including reused fixed
compositions), missing coverage and template-forbidden layouts. Application
rechecks source ownership before editing and preserves speech timing.
For the single-source path, small envelope-only boundary noise is bounded without
changing the chosen person or pane. An infeasible composition retains existing
framing only for its affected ranges; unavailable evidence or an invalid agent
plan retains the baseline before any edit. These outcomes are explicitly marked
`qualityStatus: limited` with reasons. Mutation failures still fail rather than
claiming a partially applied plan succeeded.
The single-source path no longer captures final composites or calls an AI
review/repair loop during normal generation. Completion explicitly records
geometry-and-timing verification and visualReview.status=not-run. This does
not certify speaker identity, continuous head tracking, caption occlusion or
aesthetic quality; sampled rendered comparisons remain development checks.
Speaker evidence covers the full Draft but is not independent audio verification.

Planning uses the existing host model/tools with a ten-minute deadline and
retained history. The actual model remains host/account controlled. Usage
records include the planning call. Clip agents remain parallel. No separate
agent runtime is introduced.

New clip selections include transcript-based Hook, Flow and Payoff ratings (0-10).
The app computes their equal-weight average and sorts each run by that score;
the three component scores appear below the overall score. Hover or focus the
info icon beside AI score for its reason. These are content recommendations, not view
predictions or finished-video quality scores. Older or malformed assessments show
**Unrated** and sort after scored clips, without re-running AI. Thumbnails capture
one composited Draft frame at one second (or the last frame for shorter clips),
including its template and captions. New clips save this JPEG after framing;
reframing again refreshes the saved JPEG. Cards show their own stage and elapsed
time at the bottom and cannot open until composition and thumbnail processing
finish. Failed clips expose details and individual retry. The overall progress
shows only the batch count. Older results capture the current Draft on their first visit. Subsequent edits
or opening a Draft do not refresh the saved image. Capture does not change the
open Draft. A failed preview leaves the editable clip and its history intact.

The Templates tab edits design, captions, editing options, program detection and
AI instructions. Controls depend on the template renderer. TikTok/Shorts layout
variants keep separate design values and share detection and AI instructions.
The layout selected in Make clips also selects which design to edit in Templates;
a small label identifies it when the pack provides both designs. Templates has no
separate layout picker. Single-layout templates keep their existing TikTok edits.
The trash icon beside the template picker opens a confirmation before removing
the selected template from both the editor and clip creation. Generated clips and
saved results are retained. Adding a pack again restores its removed templates
with their saved edits; removed custom copies stay removed.
Template overlay preview does not change the template or new Drafts. After clips
are created, **TikTok overlay preview** beside the results heading adds/removes a
single preview PNG in the currently visible Draft. It is not a template setting
or a default for new clips. Remove that clip before uploading.

Transcription can be used before visual analysis finishes. Analysis and agent
calls can use credits. Agent reframing start/completion reports are recorded in
`reframeLog`; the saved clip retains its `reframeReport`. The normal app chat
history holds the tool-using turn when supported by the selected runtime.

## Pack updates and local edits

GitHub links resolve to one commit per installation; only declared JSON/images
are downloaded. Use a folder, `pack.json` page or raw file link. The pack must
already be published; private repositories are not supported. Downloads time out
after two minutes, and failures leave the installed pack unchanged.

Installing the same pack ID updates it. A lower pack version is rejected, as are
unsupported template APIs, missing images, invalid layouts, changed renderers for
existing template IDs, and updates incompatible with saved user changes. A pack is
validated before its installed snapshot is atomically replaced.

Local data lives under `~/.selects/plugin-data/shortform-clips/`:

- `packs/<pack-id>.json`: installed snapshot, including resolved image data. This
  avoids depending on the location of the source pack after installation.
- `overrides/<encoded-pack-and-template-id>.json`: only fields the user changed.
  Untouched fields follow new pack defaults; reset deletes the override.
- `custom-templates/<encoded-id>.json`: independent copies made in the editor.
- `removed-templates/<encoded-id>.json`: removal records that keep templates out
  of the pickers without deleting shared assets or generated clips.
- `jobs/<job-id>.json`: generation settings, results, Draft IDs and new results'
  relative `thumbnailPath` and `thumbnailCapturedAt` fields.
- `thumbnails/<job-id>/<draft-id>.jpg`: saved composited previews. Older jobs
  resolve the same path from their existing job and Draft IDs.
- `media/`, `bin/`, `references/`: downloaded media, tools and reference data.

Editable Drafts remain in the Selects Project; these files hold app history and
preview images, not exported video.

A template identity is `<pack-id>/<template-id>`. Keep IDs stable across updates.
Removed templates disappear from the picker, but their overrides remain for a
later reinstallation. Copies retain their own settings and images.

The SBS pack's first installation copies saved templates from the old
`sbs-radio-clip` data folder. Legacy files are preserved. Because the old app saved
complete snapshots, differences from the new pack are conservatively treated as
user overrides. Reset a template to adopt all current pack defaults. Legacy jobs
remain with the old app and are not migrated.

## Authoring

See [Template packs](template-packs/README.md). Template JSON and image files
are the source of truth; do not embed customer defaults in `panel.tsx`.

The panel remains a single React file for Selects. Shared renderers implement
`series` and `separate-headlines`; new rendering behavior requires a shared app
change, not executable code in a pack.

## Verification

```sh
SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test plugins/shortform-clips/tests/shortform_packs.test.cjs plugins/shortform-clips/tests/shortform_results.test.cjs plugins/shortform-clips/tests/shortform_reframe.test.mjs plugins/shortform-clips/tests/sbs_radio_templates.test.cjs plugins/shortform-clips/tests/sbs_radio_overlay.test.cjs plugins/shortform-clips/tests/sbs_radio_transcription.test.cjs
python3 tools/plugin_files.py check shortform-clips
python3 tools/check_public.py
```

The Node tests require an existing authoring environment containing esbuild,
TypeScript, React, react-dom and jsdom. These are not installed-panel dependencies.

### Template-directed multicam reframing (experimental)

Multicam drafts now use sampled camera face observations and one bounded visual
planning pass. The AI selects `speaker`, `wide`, `two-shot`, or `stacked` shots;
code validates exact coverage and candidate availability, derives crop geometry,
and atomically applies silent camera overlays while retaining the audio and
editable template graphics. Low-confidence plans use an intact camera view;
`cameraMode: speaker` disallows stacked layouts and `preserve` leaves framing alone.
Plan/evidence/application events are recorded in the job reframing log. Invalid
plans receive at most one correction request. Existing single-camera drafts still
use the autonomous reframing path.

Camera placements come from the original synchronized Resource content and its
`videoSources` order, not the analyzed Main timeline. The adapter preserves gaps
and source trims, validates source ownership, and rejects retimed members or
unsupported timing schemas rather than guessing offsets. Older hosts without
this source payload cannot run this experimental multicam path.

This is sampled face-envelope framing with bounded local Light-ASD AVA
audio/visual speaker evidence on supported hosts, not continuous identity tracking.
Scores are uncalibrated logits, not probabilities; the agent handles identity
and editorial decisions. Sparse samples cannot establish every exact speaker
transition. A successful apply/capture is not a visual-quality verdict.

### Reframing preferences

Templates expose Speaker focus, Conversation, and Context presets, with focus,
stacked-split permission, wide-shot permission, pacing, and free-text guidance.
Missing preference fields resolve to conversation/reactions, selective split,
no wide shots, balanced pacing, and fixed framing. Preset changes are atomic and
platform variants retain their own preferences. Continuous subject tracking is
not exposed as an implemented option.

Both agent reframing and the evidence-driven camera planner receive these
preferences. The camera-plan compiler rejects forbidden wide/stacked styles
before applying edits; low confidence does not silently turn into a wide shot.
A selective split is a clip-level editorial decision: frequent substantive
back-and-forth between the same two people should define the conversation.
Keep the split stable through coherent dialogue passages when useful. Brief
overlap, reactions, acknowledgements or a single question-answer pair do not
justify a split, especially as a short ending to a mostly single-speaker clip.
There is no hard-coded turn-count threshold. Fixed crop geometry is shared across
contiguous source placements with unchanged subjects/camera/layout.

### Parallel reframing and usage

After Draft creation, all pending shorts run reframing concurrently, each against
its own Draft. There is no two-worker limit. Failures remain per clip; retry
reuses the failed Draft. Job writes use immutable snapshots in a serialized queue
so concurrent completions cannot overwrite each other. Progress counts completed
reframing rather than merely created Drafts.

Result cards show SDK-reported reframing input/output/cache token counters,
accumulated across explicit calls and retries for that clip. The results header additionally aggregates template identification and segment
selection calls once per job together with every clip’s reframing usage. Shared
calls are saved before response parsing, including unavailable failed attempts.
Older jobs with missing shared-stage records are labelled as partial when any
usage is available. Per-card usage still excludes shared stages. Missing counters display as unavailable;
partially recorded attempts are labelled partial. Model-generated usage claims
are never used. The host must return the optional `askAI().usage` fields from the
terminal agent event; older installed hosts return text only and show unavailable.


Local face analysis uses a per-run FIFO and shares identical source/range requests
across Drafts (including completed results). Adjacent source ranges separated by
at most one second are analyzed together; the original 0.5-second sampling rate
and per-placement time filtering remain intact. Failed analyses are evicted from
the in-memory cache. Queue wait is outside the analysis deadline.

Evidence capture, applying the multicamera plan, verification captures, and
thumbnail capture share a panel-wide visual FIFO. AI planning calls remain
unbounded and outside both queues. These queues govern the panel-driven multicam
path; tools invoked inside an autonomous single-camera agent are owned by the
agent runtime, not by this scheduler. Each clip records its actual phase and
phase-start time. Queued run work checks its original cancellation token before
starting, even after another run begins.

Fixed composition follows playback continuity, not uninterrupted source time.
For adjacent output placements of the same subjects, camera, source, layout and
speed, forward source gaps (including removed silence) share one crop envelope.
Original source offsets and cut timing stay unchanged. Rewinds, camera/subject
changes, layout changes and output gaps still start a new crop group. The agent
prompt states the same rule for autonomous editing.

### Source-first autonomous reframing

Single-source agents establish the opening speaker from uncropped source bursts.
An encoded broadcast mosaic is one source, not selectable cameras. Source cuts
and transcript speaker IDs alone are not speaker identity evidence. The prompt
provides source metadata, word coordinates and exact capture API examples to
avoid redundant discovery and guessed SDK fields. The agent returns JSON instead
of generating application code; the app owns application and pre-apply geometry/timing
validation. Rendered visual comparisons are development checks. Source-capture call targets remain guidance, not a hard tool quota.

Token counters remain actual SDK-reported usage. The SDK does not currently
return an attributable charged-credit receipt; do not label a token-to-cost
estimate or a change in account balance as this clip's actual credit charge.

## Generated thumbnails

Create thumbnails manually from My Clips after choosing a clip. The Create dialog
requests 1–3 variants; making or resuming clips never starts thumbnail generation.
Template settings include creation mode, photo-search scope (whole source or clip),
headline style, an optional original logo, up to five design references, and extra
instructions. Two-option settings use segmented buttons. References are downscaled
without cropping, capped at 450,000 data-URL characters each, and sent on each
creation request rather than converted into a reusable generated template.

### Creation and composition

- **Preserve real people**: advanced photo research requests additional source
  timestamps, then advanced design planning selects 1–3 people, source crops and
  headline wording. RVM `person.matte` supplies alpha while retaining original RGB.
  Nano Banana Pro Edit generates background and headline artwork; it does not
  receive the selected original-person pixels for synthesis. The original logo is
  composited separately. Advanced placement planning inspects actual artwork and
  cutouts; advanced candidate selection chooses a measured rendered composition.
- **Generate entire image**: Nano Banana Pro Edit generates a complete 9:16 / 2K
  image from clip context and references. Faces can change in this mode.
- New generated-title results skip the legacy final composition-review call.
  Legacy saved requests retain their stored pipeline and acknowledged stages.

Local face detection and alpha-overlap measurements help build up to six placement
candidates while protecting faces, title bounds and logo space. These measurements
are sampled and are not an aesthetic guarantee. Quality findings are advisory:
ambiguous faces, no safe candidate, occlusion or title overlap leave renderable
outputs available with a Needs review label. Invalid plans, missing files and
transport failures remain errors. Unsupported image-source/matting hosts report an
error rather than silently switching to synthesized people.

### Results and persistence

Results appear as compact thumbnails with hover-to-preview. The preview immediately
uses the small cached JPEG, shows a spinner while the full image loads, and exposes
Add/remove from video and Delete. An active cover is labeled In use. Failed entries
can also be deleted. Deletion detaches an active cover and soft-deletes its gallery
entry, retaining files; deleted entries are excluded from refresh and resume.
Credits are not displayed in the gallery; returned usage remains stored when available.

Adding a cover overlays playback frame `[0,1)` without shifting video, audio or
captions or extending duration. Replacing/removing it preserves other placements.
Platforms can still choose a different upload preview frame. Drafts and generated
image Resources reuse the existing run folder in the project.

Local artifacts live under `runs/<run ID>/<Draft ID>/`: `covers.json`, immutable
request snapshots, outputs and imported images. Manifests reference content-addressed
`config-<sha256>.json` files instead of repeating large reference/logo payloads.
Keep these configuration files with the manifest when moving saved runs. Legacy
inline configurations remain readable. Small `.preview.jpg` files and bounded
in-memory caches avoid loading every original image when opening the gallery.

Variants run concurrently with independent request keys, artifacts and error states.
Manifest writes and folder organization use short queues to avoid lost checkpoints
and duplicate folders. Provider capacity can still limit throughput. Image and
matting requests persist stable keys and workflow IDs before submission; resume
reuses existing requests after unknown transport outcomes. A failed variant does
not stop its siblings. Already submitted image jobs can continue with the panel
closed. Photo-research usage and per-stage placement timings are retained when
available. Generation is paid; each explicit new request can incur charges.
