# Archive original-file preview lifetime

Archive alpha.22 extends the existing `bundled-assets` owner. The work starts
from `a269d35033b814344d6129b48aa6eeae6cf78b39` and is included in consolidated
PR #346. Module count remains nine; Chan remains excluded. Semantic ownership
and whole-template acceptance remain **0/28**.

## Problem and resulting behavior

The actual preview callback could remain pending after Stop if Audio metadata
never arrived. A second click before React updated its state could start another
Audio. Preparation read the complete original into JavaScript and a Blob and had
no metadata/seek/play deadline.

The existing async file client and Electron local media protocol already support
original-file streaming. Archive now keeps its original absolute seek, section
length and fade without whole-track browser copies or preview-file publication.
This removes the explicit renderer allocation; it does not establish a strict
Chromium buffering, disk-cache or total read-byte budget.

## Existing owner and caller boundaries

- `readAssetPlaybackURL` captures the client, observes source stat, preserves POSIX
  path case with a dot authority, encodes literal URL delimiters and independently
  verifies the host's reverse mapping before admitting the URL.
- `playAssetAudioPreview` owns one Audio, metadata/seek/play readiness, the absolute
  source clock, fade and no-progress watch. Preparation has one 60-second deadline.
  Stop/current-owner loss settles pending waits and attempts every listener,
  timer, pause, source removal and reset step.
- Archive supplies original-content admission through unchanged `native-image-input`
  before URL creation and again after metadata/seek. React refs retain single-flight
  until the original call's finalization, including same-render double clicks.
- Cleanup uncertainty retains its media diagnostic, remains visible after Stop and
  blocks replacement playback until the panel is reopened. No original, installed
  asset, local URL, foreign resource or native producer is deleted.

Mini, No14, Four and Polaroid receive the additional generated functions with
unchanged existing calls/defaults. Mini/Archive operation builders and Gallery
serialize explicit function lists, so these new browser helpers do not enter
their SDK scripts. Gallery generation was compared read-only with `--stdout`;
its builder has no `--check` option. No public SDK, IPC or app version is added.

## Verification

Seven initial actual-callback cases failed before the repair. The preview suite
now passes 23 cases covering Stop, same-render reentry, metadata/seek/play deadlines,
retry, stale Project/unmount/late replies, source/path changes, reserved filename
delimiters, Windows drive/UNC simulations, early end/stall, short fade and retained
cleanup uncertainty. The affected suite passed 261 cases. Final encoding/unused-copy
cleanup was followed by the 23 preview cases again; no other behavior changed.

Actual development Electron evidence uses real SDK file methods, the production
opaque panel sandbox/CSP, native local protocol, real Chromium Audio and the
Archive callback with fixture React refs/UI setters. A generated 3-second WAV with
spaces, Hangul, `#`, `?` and `%` starts at 0.37 seconds. All three scenarios pass:
selected-section completion/fade, Stop, and an injected native pause cleanup
failure that retains ownership and refuses a replacement without more SDK calls.
The run uses 22 read-only SDK calls; source bytes, the retained Project and both
saved Drafts remain unchanged. The tested implementation matches final source;
subsequent removal of ten unused translation entries is separately hash-recorded.

Required checks include public/package policy, managed modules/app guards, both
operation builders, generated local clients, ownership coverage, 299 Python tests
(six existing skips), fifteen Archive CJS suites and read-only Gallery generation.
The existing pre-push template check is kept enabled. Remote CI is tracked on the
consolidated PR rather than inferred from these local checks.

Before native launch the closed isolated profile was backed up and 47 files
hash-checked. The safe launcher used `--isolated-data --keep-data`. After the final
run, 18 owned processes, three ports, owned bundles/cache and five stale
LaunchServices registrations were removed and their absence verified. The isolated
profile, foreign apps and foreign port 3003 process were preserved. No profile reset
occurred. The earlier initialization incident and unrestored original validation
Project IDs remain recorded in the preceding Archive packets.

## Limits and remaining work

This proves neither installed full PanelHost UI nor an actual mixed-Draft save,
full audiovisual playback, export, released-build/native Windows behavior or
whole-template acceptance. Source maps are refreshed with three repaired Archive
findings and five remaining reproduction questions. Scene-index provenance,
renderer Adjust/metrics/IDs/numerical limits and configured-root questions remain
separate work in the existing execution plan.
