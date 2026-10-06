# Validation checkpoint — 2026-10-06

This is an experimental source package, not a release qualification report.
The first shipping Selects AI host requirement is **2.0.560**. Historical
isolated development apps used 2.0.536 and 2.0.537; those version numbers do not imply
AI support in an installed release. The host integration is in
[app PR #7222](https://github.com/CutbackVideo/cutback-client/pull/7222).

The portable package contains 70 declared files plus `plugin.json`. Models,
native binaries, private configurations, source videos and generated results
are not distributed. Registered preparation uses Selects' embedded Node and
pinned downloads; no global Python, Node or npm installation is needed. Mac
WebGPU uses the hash-verified plugin-owned Node 24.18.0 described in INSTALL.md.

## Portable verification

The source-only suite on Node 22.18.0 and 24.15.0 passes **177 tests**, with **19 explicit
skips** for optional local media/model/Panel dependencies and no failures.
These checks cover request/output bounds, timestamps, frame buffer ownership,
PNG/AVIF contracts, provider fallback, recurrent state, process cancellation,
job recovery, archive extraction and verified cache reuse. They use test
fixtures and stubs; this count alone is not evidence of native inference.

The earlier prepared-app checkpoint passed 193 tests with two optional skips.
Private native/model/reference fixtures remain outside this package. Existing
Python environments were used only for independent reference comparisons;
Python is not part of the production runtime.

## Published app check

The anonymous library download was installed on the official signed macOS
2.0.560 staging app in a disposable Library. Public SDK jobs detected four
faces at four sample points in two seconds and produced 48 FHD gray8 AVIF
masks. Auto selected the Apple M3 Max hardware WebGPU adapter; measured matte
inference was 2.927 seconds and worker total was 5.273 seconds. Repeated
submission and an app restart recovered the same workflow identities. Repeated
durable preparation returned the same mask URLs; an editable original-video
mask Draft was committed. The installed Lab's face action completed and its
result reappeared after reopening. A 60-second matte job was canceled after
443 frames; terminal cancellation took 111 ms and result adoption rejected.

The same 119 manifest-listed Runtime/consumer files were installed and
SHA256-verified on Windows. Its installed app was 2.0.536 and the public
Windows staging manifest was 2.0.557 at this checkpoint. Neither has the
required 2.0.560 host; this publication checkpoint does not claim a successful
Windows release-app inference run. Historical Windows development evidence
below remains separate.

## Historical development app checks

Both tasks ran through public `selects.ai` in task-owned macOS arm64 and Windows
x64 development apps using Electron 43.2.0 / embedded Node 24.18.0 and ONNX
Runtime 1.30.0. The Lab keeps face detection and person matting separate, queues
accepted work in Main, and recovers its workflow identity after reopening.

YuNet returns actual source timestamps, display-pixel boxes and five landmarks.
Independent OpenCV/RVM comparisons exercised task preprocessing and sampled
output pixels. RGB decoding can differ between FFmpeg builds; equal source
bytes do not establish identical cross-platform model inputs.

The editable matte path prepares verified, durable masks, layers the original
video over a background, and retains original Main audio. Mac composite
preview, seeking and export passed. Windows installed-app composite export,
including original audio, passed; the locked Windows desktop prevented native
live playback/seek verification. Foreground ProRes remains an optional
consumer output and is not requested by the Lab.

### Mac WebGPU and compact masks

Auto selected an Apple hardware adapter through Dawn/Metal and ORT Web, with
GPU RGB preprocessing and recurrent state retention. First-output finite-value
checks passed. This observation does not prove GPU-only ORT kernel placement.

The current Mac encoder uses libaom all-intra, CRF 24, speed 7, row-mt and four
threads, with awaited serial writes. A 60.018-second FHD source produced 1,439
independent gray8 AVIF masks at downsample ratio 0.25:

| Measurement | First final run | Repeat |
| --- | ---: | ---: |
| Worker total | 89.990 s | 78.309 s |
| Inference | 59.811 s | 49.188 s |
| Output readback | 3.045 s | 2.787 s |
| Mask writing | 19.705 s | 19.229 s |
| Sampled worker RSS | 784.3 MB | 784.8 MB |

Every mask hash, byte size and timestamp matched between these runs. Contents
occupied 9,657,008 bytes (9.66 MB); filesystem allocation was 11,923,456 bytes
(11.92 MB). RSS is process resident memory, not isolated GPU memory. There is
no current paired CPU minute benchmark or isolated GPU kernel timing. A
48-frame comparison also showed that GPU setup can make short jobs slower
in total despite faster inference.

Encoder QA independently decoded 48 frames / 99,532,800 pixels. Against the
previous speed-6 setting, writing changed 8.134→1.483 s and bytes
259,334→280,526 (+8.17%). Gray8 mean absolute error changed 0.04990→0.05236;
p99 stayed 2 and maximum error changed 47→45. Across 2,249,107 soft-alpha
pixels, mean error changed 1.82→1.92, p95/p99 stayed 5/8, and errors above 16
grew 284→511. This is a measured lossy tradeoff on one fixture, not identical
edge quality or a general ten-megabyte storage ceiling. Decoded raster memory
is unchanged. A running job canceled after seven observed frames reached
canceled status in 403 ms and rejected successful result access.

### Windows DirectML smoke

The latest registered source and manifest matched the tested package. YuNet
produced four readable two-second observations, each containing one face, in
5.246 s worker time. RVM auto selected DirectML and produced 48 independent
FHD gray8 AVIF masks in 11.895 s worker time. The first-frame profile recorded
251 DML and nine CPU kernel events; a device ID is not a verified GPU name.
Windows retains its prior CRF-24/speed-6/two-thread encoder settings.

All 48 committed hashes/sizes matched. First, middle and last masks decoded
to one 1920×1080 gray8 still, and total contents occupied 275,196 bytes.
An identical successful request returned the same workflow without inference
replay. A 60-second request canceled after six observed frames reached canceled
status in 341 ms; successful result access was rejected. This was a short
functional smoke, not a Windows minute-long speed benchmark.

## Remaining limits

- Fresh OS and signed-release provisioning need validation. Windows requires
  the VC++ 2019-or-newer x64 runtime; Mac Intel is unsupported.
- Editable mask adoption currently requires verified CFR closure. VFR inference
  works, but editable VFR adoption rejects. The migrated face consumer also
  rejects coarse, nonintegral frame clocks before AI submission.
- Additional footage, hardware, soft-edge quality and long sources need testing.
  Probing scans the source timeline and decoding starts at its beginning.
- Mac matte preparation currently provisions its optional GPU cache even for an
  explicit CPU request: about 171 MB selected / 308 MB with retained archives.
- Jobs do not automatically resume or rerun after interruption. Durable-asset
  garbage collection and untrusted-code isolation are not implemented.
- The migrated Podcast Hook Captions face/tracking/framing stage and cached
  recovery passed on Mac. Its complete paid reel flow and Windows UI are separate
  product validation work.
- RVM model/derived-model distribution terms remain a release consideration;
  see [THIRD_PARTY.md](THIRD_PARTY.md). Experimental status is unchanged.

The host repository records the broader implementation and measurement scope in
[shared-ai-runtime.md](https://github.com/CutbackVideo/cutback-client/blob/develop/docs/shared-ai-runtime.md)
and [ai-webgpu-runtime-poc.md](https://github.com/CutbackVideo/cutback-client/blob/develop/docs/ai-webgpu-runtime-poc.md).
