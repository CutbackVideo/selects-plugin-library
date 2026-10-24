# Verified bundled asset preparation

This is the former bundled-Audio feature extended for PNG Images and encoded
M4A music. One implementation serves No.14, Four Photo Stop Motion, Polaroid
Photo Dump and Gallery. The pool still has five registered modules. `panel-modules.json`
embeds the source into independent panels; no runtime shared-file loader or
cross-plugin installation dependency is introduced.

`runAssetMediaTool(media, kind, args, options)` runs a process on one captured
media client. Options carry liveness, an AbortSignal, a timeout and an optional
absolute deadline. It validates before dispatch, requests cancellation when a
scope ends, rejects late successful replies and clears timers/listeners. Errors
expose controlled public messages and keep private diagnostics as causes. It
awaits host settlement before returning so derived-file owners can clean staging
without deleting files beneath an active process. It cannot impose a hard return
deadline on an unresponsive host. Gallery's held-video and BPM paths use it; other
consumers' call paths remain unchanged.

`prepareDerivedAsset` additionally supports `f32` objects for bounded PCM analysis.
Gallery retains the 30-second/11025 Hz mono float recipe and validates size,
alignment, finite samples and the exact bytes analyzed. The owner handles source
snapshots/content-addressed publication and preserves existing media caches; it
does not import PCM into a Project. This is an additive extension of the existing
feature, not another registered module. Old supported extensions are unchanged.

`prepareBundledAsset` receives SDK, canonical async files, pinned Project/plugin
IDs, installed path, Resource type/extension, binary/base64 encoding, explicit
platform/path comparison policy, expected Image dimensions or minimum Audio
duration, and run liveness. Base64 requires decoded byte count and SHA-256.
Supported extensions are PNG for Image and MP3/M4A/WAV for Audio.

Stat precedes allocation. Decoded data is bounded to 1 byte--32 MiB; encoded text
is bounded by expected size plus ordinary whitespace overhead. Validate text,
decoded count and digest. Missing WebCrypto stops preparation, with no
length-only fallback. Re-read installed bytes after publication. Publish through
the existing canonical atomic `writeFile` to
`.selects/plugin-data/<plugin>/assets/<sha256>.<extension>`. Verify cache bytes
every invocation; repair corruption, avoid loading oversized bad cache data,
and preserve earlier content paths after updates. No seen-cache bypass or new
chunk/rename/delete-before-rename implementation.

The serialized Project reader returns at most two matching Resource/source-file
facts, stopping at ambiguity. Verify exact type and complete Audio duration or
positive native Image size, including intended dimensions when supplied. Return
the observed registered path so the next Image check uses its exact spelling.
Windows compares separators/case. Unicode normalization is explicit: Polaroid
retains NFC; the Audio compatibility entry retains its previous POSIX exact-path
rule. These lookup policies do not attest filesystem ownership or symlinks.

At most one import per asset/invocation. Read state after dispatch, including
lost replies or a concurrent writer. Confirmed state may satisfy an empty
acknowledgment; contradictory positive IDs are refused. No match plus empty IDs
is `SKIPPED`; other unconfirmed outcomes remain `IMPORT_UNKNOWN`. Never describe
these as still preparing or resubmit automatically. Wrong-type/dimension and
ambiguous matches are not replaced by imports. Stable `BUNDLED_ASSET_*` errors
keep private causes out of safe public messages. The MP3 wrapper retains
`BUNDLED_AUDIO_*`, SDK summaries, content paths and `{resourceId}` results.

Liveness is checked around reads/hashes, publication and Project work. Already
dispatched writes/imports may finish; detachment stops later stages, not rollback.
File publication and Project registration are separate effects. Independent
operations are not a distributed import lock.

Polaroid reads its manifest within 64 KiB and validates exactly frame/music,
safe names, hashes and byte counts before publication. Its frame must be
1080x1920. Its music covers all supported 10--120 fps rounded plans: reference
seconds plus half a frame at the minimum fps (13.966667 s). Unchanged bundled
M4A bytes measure 14.527007 s via ffprobe. This bound is template-owned.

The unsafe private `unpackBundled`/`unpackAssets` implementation is retired;
compiled active-path tests retain decoded PNG/M4A/header/hash, corrupt-copy and
bad-source checks. Historical fixed/installation paths are not migrated or
deleted. Full decoding, installed-app/Windows, whole AV/Inspector/export and
reference quality remain unverified. Current consumers retain their complete-save
and durable-run checks and their documented SDK prerequisites.

Gallery selects these canonical functions at build time. Its panel publishes the
unchanged binary MP3 with pinned 457,308 bytes and SHA-256; SDK operation scripts
include only the bounded Resource reader, also reused for held Videos. Its legacy
music import helper refuses installation paths and requires already prepared
owned data. Required Audio duration is based on the rounded Project grid. The
14.216667-second excerpt cannot cover the default 30 fps rounded 14.233333-second
result; Gallery refuses this before asset work instead of changing timing or
padding music. Older installation-path Resources/Drafts remain untouched.

## Derived media publication

Additive `readAssetFileIdentity` and `prepareDerivedAsset` also serve Gallery's
short-video cache. Existing bundled Image/Audio function bodies and call paths
are unchanged; the three direct panel copies are regenerated with the new unused
helper definitions. No sixth registry feature or new public SDK is added.

The caller supplies a recipe key, observed whole-file source identity, a streaming
hash callback, a producer and a domain verifier. The owner reads stat/hash/stat,
reserves source/output paths with exclusive file creation, copies and verifies a
private source snapshot, and gives that snapshot to the producer. This prevents
an A-B-A source replacement during encoding from changing the frozen picture.
Large source/output bytes stay outside the browser; Gallery uses the existing
cancellable FFmpeg data demuxer/hash muxer through argv arrays, never a shell.

Objects live under `objects/<recipe-key>/<output-sha256>.<extension>`; a 48 KiB
bounded `index/<recipe-key>.json` carries only version/key and source/output
digests/byte counts. Valid published objects are reused without replacement.
Corrupt objects may be repaired by atomically renaming a fully validated private
output; delete-before-rename is forbidden. Media is complete before an atomic
index write can point at it. Concurrent complete writers can win the same index
without combining different media/metadata. Replies lost after rename/index
publication are reread without resubmission or another encode. Positive cache
recovery rehashes/validates output and reobserves the source.

Callbacks own codec/clock/visual policy; terminal media errors and safe public
errors survive the generic owner. Detachment cancels active Gallery media jobs
and prevents later stages. Only exclusively reserved private paths are cleaned
up. Already issued filesystem calls, process crashes, externally modified files
and independent Project imports are not a database transaction or a distributed
lock. Published/unindexed objects and crash staging are not garbage-collected
automatically; old Drafts or another active run may still reference them. Actual
Windows and installed-host cancellation remain runtime acceptance gates.

## Local video score storage

Mini's canonical `clip-analysis` evaluator reuses this owner with JSON derived
results, gray transient output and opt-in `cleanupRequired:true`. Default derived
callers keep existing best-effort cleanup. Strict analysis cleanup observes a lost
delete reply and reports a terminal failure if a private reservation remains; it
never deletes published objects or returns a fallback over unconfirmed cleanup.
See [clip-analysis.md](clip-analysis.md) for bounded I/O, exact original identities,
policy ownership and decoder-versus-filesystem deadline boundaries.

## Unconfirmed native producer lifetime

`preserveTemporaryFiles:true` from the existing private media client means the
native producer's start/exit cannot be confirmed. `runAssetMediaTool` preserves
this condition across cancellation/deadline classification. Transient and derived
owners retain their own exclusive reservations, propagate the known job ID and
private retained-path diagnostics through immutable error wrappers, and never
publish or return a success. A nested decoder keeps both its gray output and its
parent's private source/output. It does not delete objects/indexes or unrelated
files. Known settled producers retain existing cleanup policy, including default
Gallery best effort and opt-in analysis confirmation.

The private path list is diagnostic, not a general delete capability. The proof
harness can remove its own disposable fixtures only after independent same-job
terminal reads; the plugin does not infer safe deletion from age, a missing reply,
an abort acknowledgement or an unknown/expired job. Automatic persisted-workspace
reconciliation and whole installed-plugin acceptance are still separate work.
