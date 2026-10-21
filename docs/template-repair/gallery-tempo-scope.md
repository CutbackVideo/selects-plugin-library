# Gallery music analysis and shared media process ownership

Photo Grid Reveal (`photo-gallery-no2`) 0.3.17, based on
092be1f824ee7a32dd294e1e3ef29a1465562db9 (draft PR #294). Chan's shortform apps
and template packs remain excluded. The full 28-template repair goal is active.

## Problems reproduced

The UI memoized estimated BPM only by Resource ID. Replacing the music file could
reuse the old estimate. Analysis decoded a live path to a random temporary file,
without the panel's liveness/cancellation signal. Changing Project/Draft or
unmounting could leave the decode running and permit a stale success afterward.
The old host helpers read through a mutable module-global client after awaits;
another panel binding could redirect media/file operations.

With a real caller-owned data directory, the initial 14 parent-source file cases
fail 12 and pass two controls (changed music is re-estimated by the low-level
function and Unicode/shell-looking names remain argv data). Five UI regressions
cover the Resource-ID memo, unmount, context change, context A-B-A and selected
music verification. Later failing cases exposed final-read PCM tampering, source
changes after the owner's last observation, private read errors, held-video
client rebinding, and same-turn/deferred-timer media settlement.

## Feature ownership and behavior

- Extend the existing bundled-assets module with `runAssetMediaTool`. It takes
  a captured media client, argv, liveness, signal and budget/deadline; validates
  before dispatch; requests abort; checks scope and elapsed time on successful
  and failed settlement; and clears timers/listeners. Private diagnostics remain
  causes. Gallery held-video and BPM adapters share it. There is no sixth module.
- The existing `prepareDerivedAsset` additionally permits raw F32. Its source
  hash, exclusive snapshot, staging, complete content-addressed output and atomic
  index are reused. The cache key includes full source identity/path and the
  existing 30-second, mono, 11025 Hz float recipe. Source hashes stream through
  FFmpeg; no whole source file is loaded into browser memory.
- PCM is bounded to 1323000 bytes. Validate alignment and finite little-endian
  float samples. Bind the actual bytes analyzed to the returned output digest;
  then rehash the original music after the estimate. Cached PCM is reverified,
  corruption is rebuilt, and concurrent invocations keep complete generations.
  Old and published files are retained; no GC or user-data migration is added.
- `verifyMusic` is a read-only Gallery operation, not a new public Selects SDK.
  It resolves the frozen selected path to current Audio facts, probes, and
  reobserves metadata. Caller duration cannot replace Project duration; aliases
  follow the existing selected-path policy. Initial inventory/probe failures use
  controlled public messages. UI checks facts before and after analysis.
- Analysis has its own AbortController and captured client. Context changes
  abort it even if changed back before polling. No Resource-ID estimate authorizes
  Create: a fresh invocation checks source/cache contents. Failures before Draft
  dispatch are safely retryable. A late estimate cannot update a new context.
- Held-video preparation also captures files/media/path handling at entry,
  including the caller's explicit client across root lookup awaits. Shared
  runner extraction does not leave another active caller on mutable global I/O.
- The existing tempo calculation, ambiguity/silence behavior, Python parity and
  explicit manual reference BPM 113 are preserved. A missing supported host now
  asks for an update. Unused Gallery random-temp/legacy byte/probe helpers are
  removed. Three other generated panels receive additive helper definitions and
  the allowed F32 extension, with their active call paths unchanged.

## Evidence and limits

Tests use whole normal/minified compiled panels, canonical SDK-shaped file
transport, real files and local FFmpeg. They cover same-size/same-time changes,
A-B-A source changes, source/PCM final-read changes, malformed/oversized/nonfinite
PCM, stable reuse, cache repair, concurrent realms, cross-client rebinding,
cancellation, late response/timeouts and selected Audio metadata changes. Direct
module tests cover pre-dispatch guards, bound method receivers, immediate scope
end, blocked-loop elapsed time, successful/failed late settlement and safe errors.
React tests exercise actual buttons and scopes; media mocks there do not certify
host media behavior. Python parity remains an independent algorithm check.

Current local verification: 49 added cases (23 PCM/compiled real-file, 12 shared
runner, eight music-input, five UI and one held-client case); 358 Gallery CI-vector
tests and 1345 broader related Node tests pass. Python: 285 pass, six existing
skips. Normal 28-template pre-push, public source, 48 packages, five modules/ten
consumers, six SDK copies and 47 app guard bundles pass. The DI-unavailable SDK
compatibility vector now tests Gallery's active bounded reader/media adapter,
while other consumers keep their existing helper tests. Image/long-Video creation
does not require an unused conversion client. Older asset function bodies remain
identical except the additive F32 permission, and the pure tempo algorithm is
byte-identical to the parent. Full-template completion is not inferred from counts.

The 45-second budget is checked between I/O and process operations. Filesystem
calls already issued may finish, and cancellation waits for the host process to
settle before the owner cleans staging. An unresponsive host can therefore
outlast the budget; no hard return-time guarantee is claimed. Source observations
are not filesystem locks. Changes after the last check or during later Draft
composition, PCM GC, installed-host/Windows cancellation, arbitrary real-music
BPM accuracy, Inspector, whole AV/playback/export and reference/changed-input
quality remain separate gates. No installed app, user Project or binary is
modified by these fixture tests. This does not complete Gallery or all templates.
