# Real-footage layout regression

Run the harness to generate `index.html` with source references, cases and run history.
Set `SHORTFORM_REGRESSION_ROOT` to an external local inspection workspace containing
`cases.json` and `fixtures/`. Case inputs, images, videos and reports are not stored in Git.
Every run writes a new `test-runs/<UTC timestamp>-<random ID>/` containing HTML/JSON,
compiled crop plans and rendered images. Failures also produce reports and exit 1.
Generated reports, videos and machine-specific diagnostics stay local and are gitignored;
existing runs are never deleted or overwritten by this harness.

## Run

Use Node 22 or newer, esbuild/react/react-dom, Playwright and Chromium. The runner uses
installed dependencies and does not install packages or download footage.

```sh
SHORTFORM_REGRESSION_ROOT=/absolute/path/to/local-inspection-workspace \
SBS_PANEL_TEST_MODULES=/absolute/path/to/node_modules \
PLAYWRIGHT_MODULES=/absolute/path/to/node_modules/playwright \
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
node plugins/shortform-clips/tests/regression/run.cjs
```

Without `CHROME_PATH`, Playwright uses its default Chromium.

## Fixtures and scope

Source: https://www.youtube.com/watch?v=-GhICYlSNbs

- 980-990s is a wide shot, a single-person shot, then an embedded four-way split.
  `requested-980.jpg` documents the source transitions.
- 980/980.4/980.8s show five people. Automatic columns-3 or grid-4 must retain everyone.
- 1050/1052/1054/1056/1058/1059.5s show an embedded 2x2 split; retain its order and boundaries.
- `observations.json` contains macOS Vision face boxes, not inferred identities.
- Input hashes are recorded in each local run report; no broadcast images are shipped.
- The runner executes the production adapter, measured-face grouping, crop compiler,
  geometry validation, TSX effect and shared template renderer.
- Assertions cover panel count, source boundaries, every grouped face, output area,
  timing and browser image loading. Review the images too: passing geometry is not
  an editorial-quality approval.
- Replay timelines use 30fps/300 frames. They do not verify original 29.97fps timing,
  audio sync, AI choices, runtime detection, actual app editing or video export.
- Source news graphics remain burned into the frames. Generated captions are absent.

Add stable case IDs to the local workspace `cases.json`. Use `automatic:true` for all-person grouping;
explicit panels preserve the source 2x2 layout. New footage needs its own observations
and person/panel mappings. Do not relabel old runs when changing case meaning.

## Live app runs

Enable AI framing and allow columns-3 and grid-4 in the template. Leave generation layout
on Auto. In the optional composition instructions, ask to retain all people in three
columns for wide shots, preserve single shots, and retain existing 2x2 splits in order.
The agent can add optional `people[].slot` constraints; code computes unspecified groups.

After a real app run, place `live-report.json` in a new run directory and record it:

```sh
node plugins/shortform-clips/tests/regression/record-live.cjs /absolute/run-directory /absolute/saved-job.json
```

The recorder preserves the saved job and uses the explicit checks, limitations and status
from `live-report.json`; it does not infer a passing run. Optional `sourceFile` and
`sourceRangeSeconds` describe the actual input. Keep exports and failed attempts alongside it.

## Transcript-only readiness regression

Import distinct test footage: reimporting an identical file can reuse completed analysis.
After transcription is saved, cancel only that test resource's background analysis workflow.
Do not edit database state. Record `hasTranscription=true` and `hasAnalysis=false` before
framing and after generation/export, plus the saved job and output video.

The local run `2026-10-20T14-05-18Z-transcript-only` verified this condition through export.
It retains intermediate failed attempts and the successful resumed draft. Its 12.012s
input produced 10.444s because existing clip selection/filler/silence settings still applied.
Synced timelines and separate thumbnail generation were not covered by this run.

For the real FFmpeg seek test, provide the 980-992s source clip from that run:

```sh
SBS_PANEL_TEST_MODULES=/absolute/path/to/node_modules \
SHORTFORM_TEST_FFMPEG=/absolute/path/to/ffmpeg \
SHORTFORM_TEST_VIDEO=/absolute/path/to/source-980-992.mp4 \
node --test plugins/shortform-clips/tests/shortform_raw_source_frames.test.cjs
```

The test compares seeked frames against sequential decoding at the 69/70 and 170/171
source-frame transitions. Temporary output files are removed afterward.
