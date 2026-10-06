# Shared face-stage boundary

This source-only consumer is migrated from committed Podcast Hook Captions
revision `9326fad00db19a64b8e80b26b2266c54b9566d49` (0.2.0). The 0.3.0 change
removes `faceRuntime`, `faceWorker`, `yunetModel` and `yunetDecode` from this
package and generated panel. It retains the reel selection, shot/track/color,
framing, stock, generation, motion, captions and audio behavior.

- `reel.ts` reads the Draft through public `runScript` and gets stable Resource
  UUIDs from public `sdk.call("getDraftCore", draftId)`. Owner Project and Draft
  IDs must match. It joins numeric Main clip IDs, including groups, to direct
  media references. It does not import source files or persist SDK short aliases.
  When `sourceFiles()` returns a large-Project summary, it reads each named
  folder's detail, including loose `(root)` files, before resolving clip paths.
- `sharedAiFaces.cjs` owns small public-script builders, bounded result paging,
  native display-pixel geometry conversion and recoverable request lifecycle.
- `sharedFaceJobs.ts` persists input/key before submit and workflow ID after
  acknowledgement in generation-specific files. `face-ai-current.json` is an
  atomic active-pass pointer changed only by an explicit new pass. Late old
  writes can update only their old history file, including across independent
  reopened renderer modules. Publication uses the bounded canonical
  `selects.files.compareAndReplace` operation to compare and atomically replace
  the pointer in the host, independently of iframe lifetime or browser locks.
  Immutable
  per-request input receipts retain pending request keys after a stale
  registry write; a sticky per-request cancellation marker cannot be erased by
  an older status response. New request keys hash pass generation, canonical
  private pass directory (Project/Draft scope) and input; existing keys remain
  unchanged. Ordinary recovery reuses the saved key for the same input.
  An explicit reel Rebuild retries only inputs whose latest saved attempt is
  failed or canceled. Its new key includes a durable per-input retry attempt;
  immutable receipts retain that ordering if an old registry write arrives late.
  Successful inputs stay reusable, and pending or unknown inputs reconnect to
  their existing request. Concurrent cancellation and status saves merge
  cancellation intent within that request. New-pass eligibility examines only
  the latest attempt for each input, so a superseded receipt cannot block a
  completed retry. A latest pending or unknown input still blocks a new pass.
- Selects and `selects-ai-runtime` own provisioning, execution, model versions,
  background lifetime, cancellation and opaque result artifacts.
- `faceTrack.ts` still owns face selection/tracks, shot cuts and source color.
  It requires shared observations; there is no detector callback or local
  inference fallback. Face sample count and source-time cadence must match its
  cut/color grid. Color decoding must produce the exact count of complete BGR
  rasters; early EOF, extra frames and cancellation cannot publish success.
  Only the pure tiny `faceRows` shape remains from the detector boundary.
- `FaceStage.tsx` offers an isolated no-generation pass and scoped recovery.
  Both this pass and make/Rebuild require Selects 2.0.560 or later. Unknown or
  older host versions fail before native preparation, storage or Draft edits;
  canceling saved face jobs uses the same guard.
  Project/Draft switches detach observation and ignore late UI updates. Closing
  the panel is not user cancellation. New passes use explicit new keys.

## Sampling and coordinates

The old plan's `f0 = round(start*fps)`, exclusive `f1`, and
`step = round(fps/6)` determine the AI interval `f0/fps` to `f1/fps` and cadence
`step/fps`; this is about six samples/second, not exactly `1/6` at every rate.
Range endpoints round down at 12 decimal places so binary-float division cannot
exclude an exact first PTS (for example frame12 at 24000/1001 is 0.5005s).
Shared `samples[].index` is interval-local and is never a source frame number.
The source timestamp validates each observation against the source-frame grid.
After validation, shot membership uses that grid's integer ordinal, so floating
point PTS rounding cannot drop an observation at the first frame or a cut.
Actual timestamps remain unchanged in the shared result. Count/order/range and cadence
are validated against the retained color/cut grid (half a source-frame tolerance).
Actual integer source PTS are checked against the declared fps/time_base clock
within a bounded scan around the selected interval and seek preroll (at most
20,000 frames, 60-second tool timeout with cancellation) before submission.
A scan that cannot reach the interval due to long keyframe preroll fails.
This version requires an integer number of source time-base ticks per frame,
with relative floating-point tolerance for exact rational clocks. Quantized
clocks such as 30 fps in a 1/1000 time base fail before AI submission, even
when rounded PTS represent CFR; deriving sampling from actual PTS is outside
this version. 24000/1001 fps in a 1/24000 time base remains supported with
1001 ticks per frame. Variable-rate sources also fail explicitly; the
half-frame sample tolerance alone is not used to certify CFR.

Shared boxes are upright full-display `xyxy` pixels, and landmarks are ordered
`rightEye,leftEye,nose,rightMouth,leftMouth`. The adapter maps them to the old
analysis-frame `xywh` pixels; the unchanged reducer normalizes them and retains
confidence >=0.8, minimum height, aspect-ratio, IoU and coverage rules. Shared
fixed-640 letterbox preprocessing differs from the old dynamic-input detector,
so old detection numerics are not promised.

## Public scripts for an isolated real test

Use a stable **new** request key and persistent Resource UUID obtained from the
current Project's public Panel inventory. `allowCommit: true` is required for
submit/cancel, and false for all observations:

```ts
const job = await selects.ai.submit({
  runtimeId: "selects-ai-runtime", requestKey: "podcast-face-test-unique-key",
  projectId: "PROJECT_UUID", resourceId: "RESOURCE_UUID", task: "faces.detect",
  sourceRange: { startSeconds: 0, endSeconds: 2 },
  options: { sampleEverySeconds: 4 / 24, scoreThreshold: 0.8, provider: "cpu" }
});
return { workflowId: job.workflowId };
```

```ts
return await selects.ai.job("WORKFLOW_ID", "PROJECT_UUID").status();
```

```ts
const result = await selects.ai.job("WORKFLOW_ID", "PROJECT_UUID").result();
const raw = await selects.ai.readJSON(result.files.detections, "PROJECT_UUID");
const data = raw as { frameSize: {width:number;height:number}; samples: unknown[] };
return { frameSize: data.frameSize, total: data.samples.length,
  samples: data.samples.slice(0, 16) };
```

```ts
return await selects.ai.job("WORKFLOW_ID", "PROJECT_UUID").cancel();
```

The real consumer uses the stricter `resultScript` builder to verify contract
metadata and limits before projection, then pages 16 samples at a time. Empty
faces is a successful observation. Unsupported host, missing package, failed
inference, incomplete JSON or invalid geometry are separate errors. Existing
complete-reel centered fallback retains an explicit diagnostic; recovery never
converts an unknown acknowledgement into a fresh inference request.

## Current consumer verification

On 2026-10-06, the source `trackFaces`, `reelShots` and `adaptiveGrade`
functions ran against an isolated real Selects Mac app through the same
`PanelScriptRunner` transport as the panel SDK. A 1920x1080 CFR source at
24000/1001 fps used source frame 12 through exclusive frame 60 (0.5005–2.5025s).
The shared native CPU face job produced 12 observations. The actual plugin
decoded 12 BGR cut/color samples, selected one face track with full coverage,
and produced a 48-frame portrait placement and source-adapted grade. A new
pass took about 4.9 seconds including probing, job observation and plugin
analysis. Reloading the bundled module with the same journal reused the
workflow and request key through read-only status/result calls.

The consumer suite has 81 passing tests with an existing Selects authoring
dependency installation, including the real SDK checker, shared lifecycle,
cross-module journal races, cancel/rebuild identity, source inventory and
mandatory cut/color contract tests. The generated shipped panel was rebuilt
from this source. This verification makes no Draft edits or paid generation
calls; a complete generated reel and the plugin's actual Windows face stage
remain separate checks.
