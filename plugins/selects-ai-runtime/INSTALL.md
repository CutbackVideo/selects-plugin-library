# Developer setup

This package ships source only. Its `plugin.json` registers `runtime.json` with the Selects AI runtime host. The host snapshots the listed source files, runs `prepare.cjs` with the app's embedded Node, and provides the app's FFmpeg/FFprobe paths. Preparation downloads pinned ONNX Runtime packages and only the requested task's original model into a host-owned cache. It never runs npm lifecycle scripts or installs global Node/Python.

The first job reports download and verification progress. Later jobs verify and reuse the cache. Archives and models are size-bounded and hash-checked before publication; native files are selected for macOS arm64 or Windows x64. Mac matte preparation also provisions official Node 24.18.0, ORT Web 1.30.0 and Dawn 0.6.2 into the plugin cache. This adds about 171 MB of selected runtime files, or 308 MB including retained download archives. Preparation currently receives the task rather than its provider, so an explicit CPU matte request also prepares this optional GPU cache; CPU execution skips GPU probing. It installs neither system Node nor npm. Electron's mapped-buffer behavior is incompatible with this Dawn binding, so the embedded worker launches the hash-verified standalone Node in the same managed process group. Optional GPU preparation failure preserves the CPU configuration and records the reason; cancellation still aborts preparation. Windows native loading also requires the Microsoft Visual C++ 2019-or-newer x64 runtime. A missing dependency is reported by the load check; this package does not install system DLLs or alter GPU settings. macOS Intel is not supported by the pinned archive.

## Registered Selects host

On host 2.0.560 or newer, install this source package through the normal plugin
installer. The host resolves the installed Skills root; development sessions
can instead set `SELECTS_AI_RUNTIME_SOURCE_ROOT` to the parent plugins folder.
The included AI Runtime Lab panel submits jobs with the existing Panel SDK.

The original 2.0.560 host supports video AI requests. Image requests require
the host's additional image-input SDK capability; installing this runtime
alone does not add that host feature. Supported photos are static JPEG, PNG
and WebP (up to 64 MiB / 32 megapixels). Animated images, GIF and HEIC are
rejected. The host derives image/video kind from the imported Resource.

From a `run_script` call with `allowCommit:true`, submit a direct Video Resource:

```ts
const job = await selects.ai.submit({
  runtimeId: "selects-ai-runtime",
  requestKey: "my-plugin:stable-request-id",
  projectId,
  resourceId,
  task: "faces.detect", // or "person.matte"
  sourceRange: { startSeconds: 0, endSeconds: 2 },
});
return { workflowId: job.workflowId };
```

For a supported Image Resource, use the same task without a time range:

```ts
const job = await selects.ai.submit({
  runtimeId: "selects-ai-runtime",
  requestKey: "my-plugin:stable-photo-request-id",
  projectId,
  resourceId: imageResourceId,
  task: "person.matte", // or "faces.detect"
});
return { workflowId: job.workflowId };
```

The image result has one raster. `prepareMatte` returns its durable mask URL
for use throughout the Image clip rather than a frame-rate-driven sequence.

Use the same key and identical input to recover an uncertain acknowledgment;
choose a new key for an intentional new run. Reconnect with
`selects.ai.job(workflowId, projectId)` in later scripts. Read `.status()` and,
after success, `.result()`. `selects.ai.readJSON(result.files.detections ??
result.files.manifest, projectId)` returns bounded `unknown` JSON: validate or
type it against the task's schema before accessing properties. Cancellation
also requires `allowCommit:true`.

The default RVM result contains alpha PNGs. The Lab requests independent gray8
AVIF masks when `selects.ai.supportedMatteEncodings` advertises AVIF. After
success, its Open in editor action calls `selects.ai.prepareMatte(...)` in a
write-enabled script, prepares durable masks, and creates an editable Draft
with the original video, a luminance mask Effect, an existing Image background
and the original Main audio. Repeated preparation reuses the verified bundle.
Editable mask preparation currently requires verified CFR input; alpha-frame
inference also supports VFR, but editable VFR adoption is not yet supported.

Other consumers can explicitly request `options.outputMode: "foreground-video"`
and import `result.files.foreground` with the owning Project's `importArtifact`
method. This CFR-only option writes a large ProRes 4444 MOV (about 67 MB for the
measured two-second 1080p clip). The Lab uses the original-video mask workflow
and does not request this MOV.

The manual commands below remain useful for development with an explicitly prepared config. Use an isolated folder and fresh output directory for each run.

## Required local files

- An installed Selects executable that supports `ELECTRON_RUN_AS_NODE=1`. The measured build exposes Electron 43.2.0 / Node 24.18.0 / N-API 10. Future app fuse settings can change this capability.
- `onnxruntime-node` **1.30.0**, including the native files for the OS/architecture. The registered prepare entrypoint supplies its absolute package directory in the generated config. The earlier PoC validation reused existing local caches.
- Selects' bundled FFmpeg and FFprobe, with absolute executable paths.
- Original YuNet 2023mar and RVM MobileNetV3 FP32 ONNX models matching the hashes in `runtime.json`. Patched GPU models are not substitutes for this baseline. Models are not included in the source package.
- A readable local video file. The host-resolved CLI path is internal to this PoC.

Create a private `.local/config.json` using actual absolute paths:

```json
{
  "ortModule": "<absolute ONNX Runtime package directory>",
  "tools": {"ffmpeg": "<absolute FFmpeg executable>", "ffprobe": "<absolute FFprobe executable>"},
  "models": {
    "yunet": {"path": "<absolute YuNet file>", "sha256": "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4"},
    "rvm": {"path": "<absolute RVM file>", "sha256": "88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828"}
  },
  "provider": "cpu",
  "intraOpNumThreads": 4
}
```

For RVM on Windows, `provider: "dml"`, a non-negative `deviceId` and `profile: true` enable measured DirectML placement. A device ID is not a verified physical GPU name. New Main-managed RVM jobs default to `auto`, probing DirectML on Windows and prepared WebGPU on Mac ARM64. The generated private Mac config includes a `webgpu` dependency descriptor; omitting that descriptor retains the legacy CPU behavior. Private `enableCoreMlAuto: true` selects the CoreML experiment instead. Initial auto probe failure restarts CPU; explicit DML failure and mid-job failures remain failures. YuNet supports CPU only. The public SDK still accepts only `auto | cpu | dml`; callers need no Mac-specific setting. See `VALIDATION.md` for measured performance and scope.

Create `.local/request.json`:

```json
{
  "contractVersion": 1,
  "task": "person.matte",
  "input": {
    "source": {"path": "<absolute video file>"},
    "sourceRange": {"startSeconds": 0, "endSeconds": 2},
    "downsampleRatio": 0.25
  }
}
```

For `faces.detect`, replace the task and the ratio with `sampleEverySeconds: 0.5` and `scoreThreshold: 0.8`.

## Run with the app's embedded Node

macOS, from this package directory, using the executable inside the installed `.app`:

```sh
ELECTRON_RUN_AS_NODE=1 "$SELECTS_EXECUTABLE" scripts/job-host.cjs   --request .local/request.json --config .local/config.json --job-dir .local/runs/new-job
```

Windows PowerShell:

```powershell
$env:ELECTRON_RUN_AS_NODE = '1'
& $env:SELECTS_EXECUTABLE scripts/job-host.cjs --request .local/request.json --config .local/config.json --job-dir .local/runs/new-job
```

An SSH/noninteractive Windows launcher should use `ProcessStartInfo` with redirected stdout/stderr and `WaitForExit()` to reliably collect a GUI-subsystem executable's events and exit code. Do not depend on a PATH `node` executable. `--cancel-after-ms 1000` demonstrates cancellation; `--timeout-ms` sets the explicit job deadline (default 120,000 ms). The direct runtime CLI also accepts `--request`, `--config` and `--output`, but does not provide the supervisor's lifecycle guarantees.

Read persistent status after the caller closes:

```sh
ELECTRON_RUN_AS_NODE=1 "$SELECTS_EXECUTABLE" scripts/job-host.cjs --status --job-dir .local/runs/new-job
```

## Verification

Use the same embedded executable for `--test tests/*.test.cjs`. Set `AI_RUNTIME_CONFIG` to the absolute private config to enable real FFmpeg media-contract tests; `YUNET_MODEL` enables the hash-checked face job-adapter test, which uses stub inference tensors. Without those optional variables, the affected tests explicitly skip. Real native inference is exercised by job runs and by `scripts/verify-yunet-reference.cjs --config <config> --reference <OpenCV-reference.json>` with independent prepared RGB/reference fixtures; these private fixtures are not distributed here.

Run `scripts/verify-lifecycle.cjs --request <long-RVM-request> --config <config> --output <fresh-report-folder>` to exercise actual inference cancellation, host death, decoder cleanup and checksum rejection. Run `scripts/compare-alpha.cjs --left <matte.json> --right <matte.json> --config <config>` to compare full-job integrity and three sampled alpha rasters. `--samples-only` explicitly reduces integrity checking to the downloaded first/middle/last files.

The independent reference scripts use an existing Python environment only for validation. They are not production runtime dependencies and never install packages. See their argument/environment checks and [VALIDATION.md](VALIDATION.md) for the reference versions and comparison scope.
