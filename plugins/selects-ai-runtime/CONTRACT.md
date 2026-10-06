# Runtime contract v1 (PoC)

The files in `schemas/` describe the internal worker wire format, independently of the public `run_script` SDK. `plugin.json` points to `runtime.json`; Selects runtime host 2.0.560 or newer validates that registered descriptor, snapshots the listed Skills files and invokes its preparation and worker entrypoints. The root `panel.tsx` is installed separately in the Panels root and is excluded from worker snapshots; it cannot be the descriptor, preparation entrypoint or worker entrypoint. Other listed files remain required and confined to the installed package.

The preparation entrypoint receives `--output <config-json> --cache <host-owned-cache> --task <task> --ffmpeg <tool> --ffprobe <tool>`. It emits JSONL `progress` events with a step and optional completed/total counts, or `error` with a diagnostic message. Successful exit plus a bounded config JSON is required. The config contains private absolute dependency, model and tool paths; it is not exposed to the public SDK. The host copies it per job before applying provider options. IPC `stop`, SIGTERM and parent disconnect abort preparation. A partially downloaded archive or model is never published as a ready asset.

## Requests

Both tasks use `contractVersion: 1`, a task name and `input.source.path` (host-resolved absolute file path). `input.sourceRange` is a nonempty half-open interval `[startSeconds, endSeconds)` in source playback seconds, with the first displayed video frame defined as zero. No timeline-placement seconds or synthetic constant-frame-rate timestamps are used.

`input.source.kind` may be `video` or `image`; omission retains the existing
video contract and result shape. The host derives this value from the Project
Resource, not the filename. An image request has no `sourceRange` or
`sampleEverySeconds`, and cannot request `foreground-video`. Initial image
support is limited to static JPEG, PNG and WebP; animated PNG/WebP,
multi-picture JPEG, GIF and HEIC are rejected explicitly. Files are limited
to 64 MiB and 32 megapixels. The decoder validates the byte container, applies
EXIF orientation including mirrored cases, and produces exactly one display
RGB raster with FFmpeg autorotation disabled. Color conversion remains the
installed FFmpeg default; ICC/HDR normalization is not implemented. Each
independent photo is its own job with fresh RVM recurrent state. RVM models
people; this extension does not add arbitrary foreground/object segmentation.

Image primary JSON results carry `sourceKind: "image"`, one `frames` or
`samples` entry at index 0 and `sourceTimeSeconds: 0`, and no `sourceRange`,
`sourceFrameRate`, `fps` or `foregroundVideo`. Zero identifies the only raster,
not a fabricated playback rate. Image face parameters contain only the
confidence threshold, with no video sampling parameters. Image matte output
is one ordinary grayscale PNG or AVIF. Inference, GPU selection, file
confinement, output validation and cancellation use the existing task paths.

`faces.detect` accepts positive `sampleEverySeconds` (default 0.5) and `scoreThreshold` in [0,1] (default 0.8). For each sampling boundary, it chooses the first available decoded frame at or after that boundary and reports the actual source timestamp. Missing VFR intervals do not produce invented frames. An empty `faces` array is a valid observation.

`person.matte` accepts `downsampleRatio` in (0,1] (default 0.25). It processes every displayed frame in order. Recurrent state starts with zeros at the requested interval start and remains private to the job. No spatial resize is applied to the source raster; the model's internal downsample ratio controls its inference work.

`input.alphaEncoding` accepts `grayscale-png-8bit` or `grayscale-avif-8bit`.
Omitting it preserves PNG for existing requests and recovered jobs. A consumer
can explicitly request AVIF through SDK `options.alphaEncoding` when the host
supports that format. AVIF masks remain individual files; no archive, mask video
decoder or extraction step is involved.

`outputMode` defaults to `alpha-frames`. Explicit `foreground-video` adds an alpha-preserving ProRes 4444 MOV encoded from the model's `fgr` and `pha` outputs in the same inference. It requires verified constant-rate source PTS (with source-time-base rounding tolerance); VFR is rejected before inference for this mode. The interval may start between frames: `foregroundVideo.sourceStartSeconds` names the actual first selected source frame, and `durationSeconds` is the selected frame count divided by the verified rational rate. Consumers must use these values for the original Main source range.

This prototype accepts square sample aspect ratio (`1:1`) and reports missing SAR as `unspecified-assumed-square`; explicit non-square SAR is rejected. Rotation is applied by FFmpeg before pixel coordinates are assigned. The installed decoder's default RGB24 color conversion is recorded, but not normalized across different FFmpeg builds. Equivalent source bytes therefore do not imply identical RGB tensors on both platforms.

## Progress and completion

The registered worker uses one JSON object per line on the dedicated host event pipe (fd 4, `--event-output-fd 4`); standalone direct CLI execution defaults to stdout. The host descriptor declares `fd4-jsonl`, and the verification job host supplies that pipe. Native diagnostics may write stdout or stderr; neither is interpreted as progress on this transport. Legacy descriptors keep stdout JSONL. Event types are: `accepted`, `progress`, `result` or `error`. Stderr is reserved for diagnostics. Progress reports a step, optional completed/total counts and internal process identifiers; these identifiers do not belong in a future public SDK schema.

The supervisor creates a workflow ID and `status.json` with queued/running/canceling/succeeded/failed/canceled/interrupted states. `result.json` is persisted only after result validation and source identity rechecking. An emitted result alone is insufficient: the host also waits for successful worker exit. A cancellation request before the host's terminal commit takes precedence; IPC asks the worker to abort, a delayed tree-kill covers stuck inference, and the host suppresses any late result and removes its success payload after worker exit. A finished terminal job ignores further cancellation. Canceled or failed folders must not be adopted as completed results. Source size/mtime is rechecked, not a cryptographic lock against concurrent file replacement. Atomic JSON replacement does not guarantee power-loss durability.

## File results

All reported files are slash-separated relative paths confined by realpath to the job's output folder. Absolute paths, traversal and escaping symlinks are rejected. The Selects file adapter replaces these internal paths with managed file handles after adoption.

YuNet's `faces.json` uses display pixels after rotation, `xyxy` box objects (`xmin`, `ymin`, `xmax`, `ymax`), five landmarks in right-eye/left-eye/nose/right-mouth/left-mouth order and scores in [0,1]. Boxes are clamped to the display raster; landmarks preserve model coordinates. Sample indices refer to decoded interval frames, not ordinal sample numbers. Input uses bilinear downscaling without upscaling, top-left placement on a black 640x640 tensor, BGR NCHW floats in [0,255]. This is a specific preprocessing contract and is not equivalent to every existing dynamic-input YuNet pipeline.

RVM's `matte.json` lists every interval frame with index, actual source timestamp
and a relative image file matching `alphaEncoding`. Alpha is continuous
grayscale 8-bit (0 transparent, 255 opaque), not a binary threshold mask. PNG
uses the standard lossless Paeth filter and zlib level 6. AVIF uses libaom CRF 24,
full-range 8-bit monochrome, still-picture mode and one keyframe per image.
Mac uses explicit all-intra search, CPU speed 7 and four threads with row-based
parallelism; Windows retains CPU speed 6 and two threads pending platform validation. AVIF is lossy: soft edges can change, and size depends on
the mask content and encoder build. Both keep the full raster and every frame.

The AVIF writer streams the RVM gray buffer into one configured FFmpeg process
with backpressure. FFmpeg image2 writes independent still AVIF containers;
explicit global headers provide each image's AV1 configuration. A synthetic
one-frame-per-second encoder clock only controls image output ordering; source
PTS remains authoritative in `matte.json`. There are no intermediate PNG or
raw files on disk and no new Python, Node installation or codec dependency in
Selects. Encoder process failure or cancellation cannot publish a successful
manifest. Job-private `.partial.avif` files are checked after successful exit
and renamed before publishing the manifest. Dimensions, timestamps, frame
count, file confinement and PNG/linked primary AVIF headers are checked before
completion; independent FFmpeg decoding provides additional pixel verification.

For `foreground-video`, `files.foreground` names `foreground.mov`; `matte.json.foregroundVideo` records its encoding, rational frame rate, dimensions, frame count, source start and duration. The encoder verifies codec/profile, alpha pixel format, clock and decoded frame count before atomically publishing the final filename. Main registers it as an opaque media artifact. An explicit `project.importArtifact(result.files.foreground)` copies it into Library-owned media and returns a stable Resource ID; retries reuse the same import. ProRes is a large intermediate format, not a compact final storage choice.

The Lab requests `alpha-frames` and calls
`selects.ai.prepareMatte(result.files.manifest, projectId)` with explicit commit
authorization. Main verifies successful job ownership and integrity, adopts the
individual PNG or AVIF images into the host's durable plugin-data image storage, and returns the
original Resource ID, exact source range, raster size, encoding and timestamped
local URLs. Relative image strings read from JSON are not standalone public
import capabilities. The full URL sequence stays inside the edit script rather
than crossing the Panel's inline result limit. The script keeps the original
Main audio, adds a background and an original-video overlay, and attaches a
luminance mask Effect to that overlay. The Effect selects the last cached source
timestamp at or before its source-relative clock; an out-of-range clock produces
no pixels. Original RGB masked by alpha can differ at soft boundaries from RVM's
separately corrected `fgr` output. New masks require verified hashes and
authoritative source timing; saved Draft recovery remains independent of job
retention.

## Provider and version policy

Once `prepareMatte` has atomically published and verified its durable bundle,
the host releases only registered, hash-matching private frame copies. The
primary manifest and foreground artifacts remain available. Relative frame
paths in `readJSON` describe inference output; they are not public file-read
capabilities or a retention guarantee after adoption. Consumers render the
durable URLs returned by `prepareMatte`. Retry and restart reuse the same
receipt and URLs even after scratch release. A failed preparation does not
release scratch, and best-effort cleanup failure does not fail adoption.
This policy does not delete referenced durable masks or implement general GC.

The config pins ONNX Runtime 1.30.0 and model SHA-256. Public matte `options.provider` accepts `auto`, `cpu` and Windows-only `dml`. Newly accepted Main jobs normalize omission to `auto`; pre-auto CPU journals preserve their stored options and idempotent retry. YuNet remains CPU-only and rejects `auto`/`dml`.

Auto probes Windows DirectML using the original pinned FP32 ONNX model. Prepared Mac ARM64 runtimes probe WebGPU through Dawn/Metal and ORT Web 1.30.0 in a plugin-owned Node 24.18.0 worker. WebGPU derives equivalent channel zero-padding on five Conv inputs from hash-verified original bytes and records the derived SHA, transform version and required `basic` graph optimization separately. RGB24-to-planar conversion and recurrent state remain on GPU; only the requested alpha/foreground outputs are downloaded. A GPU finite-value reduction verifies the first outputs without downloading recurrent state. A hardware Apple adapter and GPU-resident output tensors are required; individual ORT kernel placement is not profiled.

CoreML remains a private runtime-config experiment with `enableCoreMlAuto: true`, using MLProgram, CPUAndGPU and subgraphs (`coreMlFlags: 0x32`). DirectML/CoreML require accelerated kernel events in a bounded first-frame ORT profile. Every path runs the first actual source frame with zero recurrent state and validates its output. The successful first result and session continue the job without running that frame twice. Initial auto compatibility failures release the probe and start CPU from zero on the same RGB frame. Optional WebGPU dependency preparation failure preserves CPU availability and its diagnostic reason. Cancellation prevents fallback. Explicit DirectML does not fall back, and a later inference error or worker crash never switches providers. Failed and canceled jobs expose no successful artifact.

Diagnostics report requested/selected provider, selection reason, rejected attempts and the observation scope. DirectML/CoreML report observed kernel placement; WebGPU reports the hardware adapter, GPU state retention and derived model metadata, with `observedExecutionProviders: null` and no claim of GPU-only kernel placement. CoreML kernel events do not prove all operations ran on GPU: its compute units permit CPU, and RVM retains CPU partitions. A Windows device ID is not a verified physical GPU name. WebGPU inference metrics wait for GPU submission completion; alpha/foreground downloads are timed separately as `readbackMilliseconds`. GPU preprocessing measures CPU upload/shader submission time; queued conversion work completes within the inference wait. GPU-first is an availability policy, not a total-time guarantee; short jobs can be slower because of initialization and encoding.

The protocol version, task contract and model/preprocessing version are distinct. Changing the model or preprocessing can change numerical results even when the request schema remains unchanged. The prototype does not implement server adapters, retries or exactly-once submission; a server adapter must preserve task contracts while implementing its own transport, cancellation and file materialization.
