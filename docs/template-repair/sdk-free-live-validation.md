# SDK-free actual-app checkpoint — 2026-10-23

This is a partial verification checkpoint, not whole-template acceptance. Chan's
Shortform apps remain excluded. SDK/app PR #7876 remains closed. No application,
public SDK, user project or foreign process was changed for these repairs.

## Source and ownership

- Actual app: clean `cutback-client@90940207f45b4f5c0b1d427efadcf1e710b58d57`
  (original develop, not the closed SDK PR), Electron 43.2.0, macOS.
- Template save/verification sources: `dac6563`; the later Worker change leaves
  those authoring functions unchanged. Actual-app Worker probe: `942b502`.
- Dedicated worktree/session `template-sdkfree-20261023`, isolated data and
  ports 3037/9267/9268/23137. Existing servers and Electron sessions were preserved.
- Library/Project creation and imports use supported SDK APIs; existing user
  databases were not rewritten. Inputs are owned synthetic originals, not user
  footage or reference-reproduction evidence.
- The original checkout could not complete startup. A clean current-develop
  worktree with its locked dependencies and its own native build was used.
  Temporary launcher changes redirect distribution leases/cache into the owned
  evidence directory; they are not product or SDK changes.

## Results and limits

| Stage | Observed result | Limit |
| --- | --- | --- |
| Gallery save | Two complete 21-cell Drafts, Music Off/On, 23.976023976 fps, 341 frames | Canonical generated operation/owner and real SDK, not an installed PanelHost UI run |
| Gallery independent readback | Placement, graphics, transforms, Audio intent versus saved source windows, programs, original file bytes and Project metadata verify | Observations, not a filesystem lock |
| Old-host source fallback | Actual saved Core JSON for both Drafts parsed without the snapshot method; all 21/22 source rows match supported snapshot reads to one tick | Method absence is deliberately simulated by the caller; Core JSON itself is real saved state |
| Archive save/recovery | Actual canonical assembly/Finish on two distinct generated videos; controlled early reply loss; cold restart acknowledges the same Draft, with one saved Draft and unchanged metadata/clips | Two-second recovery fixture, not full Archive product-quality acceptance |
| Cold Gallery readback | Both saved Drafts pass verification after Electron restart | Development app; Windows/production installation remain open |
| Native exports | All three jobs succeeded; actual MP4s decoded: Gallery 341 frames each, Archive 48 frames | Export completion is separate from picture-quality acceptance |
| Gallery Audio | Music Off decodes to exact zero; Music On tone correlation 0.999924, RMS ratio 0.999446; whole video hashes identical across music choice | Synthetic tone, not natural music or human audible Preview acceptance |
| Archive Audio/video | All 48 frames decode; red/blue content order retained; 440/660 Hz tone order retained, peak 0.130745 | Whole file decoded, but typography/reference/semantic quality not accepted |
| Worker lifecycle | Actual Selects renderer passes 40 native Worker cases: controlled dispatch/late/cleanup failures and unchanged detector output/transfer behavior | Controlled inputs, not full template music/UI acceptance |
| Preview playback | **Failed**: native drawable/presentation timeout, repeated after foreground, retry, fullscreen and cold restart | Same failure in a plain original-video Draft with no template/common module; not counted as playback success or assigned a proven module cause |
| Gallery pixel gate | **Open**: 3,591 border sample failures per output; visibility, grayscale and selected-photo-color checks pass | Existing RGB-16 border threshold unchanged; old app-renderer fix was not restored |

The first Archive recovery harness completed recovery but its later all-Project
comparison failed on Gallery's `lastUpdatedAt`, which changed from its creation
time to its own preceding save time after reload. That failure is retained.
A separate readback confirms all other Project/resource/file facts, Gallery's
saved programs and Archive's metadata/clips match. It must not be described as
an exact all-fields preservation pass.

## Repairs added at this checkpoint

City Weekend, Torn Paper, Summer Trip and THE END still used private Worker
lifetimes. Native dispatch failure left their Worker/Blob URL/timer/listener
alive; late completion and cleanup failure could become success. They now use
`analysis-worker`. Optional transfer lists preserve each caller's existing
sample cloning/detachment. Existing Mini/Archive default cloning is unchanged.
The initial 28-case adapter reproduction had 20 failures and eight controls;
32 follow-up cases now pass. The standalone Chromium probe passes 40 cases;
the actual-app probe independently passes 40. Overlapping test groups are not
summed as unique tests.

Remote CI on `dac6563` failed at A16z's reproducible build check: its generated
panel still bundled the previous local file client. Regenerating that artifact
uses existing stat/readRange instead of a new SDK fingerprint method. All 35
A16z package tests pass. No A16z behavior redesign or Chan artifact was included.

Additional merged common/source/recovery tests pass 99 cases. The four Worker
consumer packages pass 66/67 locally; THE END's cue-builder needs an FFmpeg with
`rubberband`, absent here. The unchanged `dac6563` package reproduces that same
failure. It is not the cause of the remote A16z failure. Public/package/module,
ownership and all-template gates are separate checks. New remote CI must run
on the final PR head.

## Evidence

Owned local directory:
`clip-highlights-analysis/repro-20261023/sdk-free-live/`.
Key artifacts: `provenance.json`, `gallery-*-saved.json`,
`gallery-cold-verify.log`, `*-actual-core-fallback.json`,
`archive-cold-readback.json`, `*-export-job.json`, `*-export-status-*.json`,
`gallery-native-summary.json`, `*-sdkfree-native-pixels.json`,
`archive-export-check.json`, `plain-control-playback.json`,
`plain-visible-retry.json`, `actual-app-worker-results.json` and preservation
snapshots. Failed attempts and their logs are retained. Reproduction harnesses
live beside the evidence and target only this isolated session.

Whole-template acceptance remains 0/28. Native Preview, Gallery border quality,
installed PanelHost flows, natural media and Windows remain open. No SDK was
added to hide these limits and no tolerance was relaxed.
