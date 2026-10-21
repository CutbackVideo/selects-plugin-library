# Gallery verified owned music and held-Resource confirmation

Photo Grid Reveal (`photo-gallery-no2`) 0.3.14, based on
25a9e756a907a13145f506883d17d6609cca95f1 (draft PR #289). Chan's shortform plugins
and template packs are excluded. This is a further checkpoint in the 28-template
repair goal, not full template/runtime completion.

## Reproduced causes

The normal bundled-music preparation registered the MP3 directly from the
installation folder. Future replacement/movement of that file could affect an
existing Draft. It lacked release-byte verification and an owned data copy.
Its fixed path could also hide changed installed bytes behind an old Resource.

Held-video registration indexed targets by path into a Map: duplicate Video
Resources silently selected the last row, while an existing Audio at the same
path was ignored and imported over. Import acknowledgments were not checked,
and a lost acknowledgment returned unknown even when registered state could
positively identify the result. Metadata observed before a probe was reused if
no import was needed, even when it changed while probing.

Before production edits the first 25 cases failed 24 with one control. Additional
red tests exposed metadata changes during a probe, installation-path registration
through the old helper, and an output shorter than one Project frame.

## Shared features and behavior

- Reuse `prepareBundledAsset` and its byte reader, SHA-256/content path publication,
  bounded Resource reader, metadata checks, lost-reply confirmation and errors.
  Do not modify canonical bodies or the other consumers. The pool remains five
  registered features across ten consumers.
- Pin the unchanged MP3's 457,308 bytes and SHA-256
  `70146fa3ee1829efc1fff40ffe93f4a6a40394bca094d9b69877756432d8b8f0`.
  Publish through the existing canonical atomic file client to
  `.selects/plugin-data/photo-gallery-no2/assets/<sha256>.mp3`. Check cache bytes
  each invocation, repair corruption and reobserve installed bytes before import.
- Import at most once per preparation, then independently confirm Project path,
  Audio type, full duration and identity. A lost reply may recover observed state;
  ambiguous, contradictory, wrong-type, skipped or unconfirmed outcomes cannot
  claim success. This is not a distributed import lock.
- Await the import observer and check liveness before dispatch. Keep Draft and
  asset lifecycles separate. Earlier installation-path files, Resources and
  Drafts are not rewritten or deleted. The legacy `importBundledMusic` helper now
  refuses installation paths and requires an already prepared owned data path;
  it is not an alternative to verifying/publishing bytes in the panel.
- Reuse the existing bounded `readBundledAssetResource` in held-video SDK requests.
  Check every target before import, refuse ambiguous/wrong-kind/short metadata,
  and require a distinct output path for each distinct source. Reobserve source
  and target metadata after probing/importing. If a positive added-ID list exists,
  it must match exactly the independently confirmed newly imported targets.
  A lost reply alone does not cause resubmission.
- Generator emits panel-owned asset code and the SDK-safe Resource reader
  separately. Manifest-only installed operation builders need no repository
  import; SDK requests contain no browser asset-publication globals.

## Real excerpt and frame-grid policy

`ffprobe` measures the packaged MP3 as 14.216667 seconds. The reference duration
is 853/60 seconds. A 30 fps Project rounds it to 427 frames, 14.233333 seconds,
which the original excerpt cannot cover. The new owner checks the actual Project
grid before publication/import and reports this mismatch. It does not change
the planner's nearest-frame policy, tempo, excerpt, looping or padding.

At the current default duration, 24/25/30000÷1001/60/120 fps fit; 30/50/90 fps
do not. A user can select No music, a sufficient Project track, or explicitly
shorten panel duration. This is a documented input/environment incompatibility,
not a claim of universal bundled-music playback. A request shorter than one
Project frame also stops before asset work.

## Evidence and remaining work

The expanded asset/held suite has 45 cases, including compiled/minified full-panel
preparation, actual packaged bytes and ffprobe duration, corrupt/oversized copies,
source changes, hash absence, file/import faults, observers, Windows drive/UNC
paths, grid mismatches, duplicate/wrong-kind Resources, lost replies and added-ID
contradictions. Related tests include the previous asset consumers and Gallery's
UI, durable-run, authoring, input, hold/tempo and package/typecheck suites.
Final receipts are archived with the publication checkpoint. Automated checks
remain separate from actual installed-host execution and rendered AV results.
The related run passed 1,200 tests without skips; the exact Gallery CI command
passed 254 without skips; Python passed 285 with six skips. Public-source,
28-template pre-push, 48-package, five-module/ten-consumer, six-local-SDK and
47-app-guard checks passed. Test source uses Unicode escapes while preserving
the actual non-ASCII Windows/UNC path values required by the public-source rule.

Remote CI additionally exposed the existing isolated unsupported-SDK test: the
new preparation path reached its frame-grid helper before rejecting an SDK
without `runScript`. An explicit entry precondition now rejects that SDK with
the existing update instruction before helper/file/media work. The original
common-async test and the full compiled asset paths are both retained.

Owned-file garbage collection is deliberately unimplemented: older Drafts may
still reference earlier content files. Held cache `held-v2` still uses its own
source path/size/mtime identity and temporary file publication; full content
identity, lifecycle/cancellation and concurrent publication remain pending.
These changes do not prove whole-video/audio playback, source clocks for every
input, Inspector editing, composition/layer/Blend/Spatial Conform, native export,
actual Windows or reference/changed-input quality. Client #7847 and, with music,
#7828 remain prerequisites. No client code, binary, deployment or user data was
changed. Existing preview failure records and all remaining 28-template gates
remain active.
