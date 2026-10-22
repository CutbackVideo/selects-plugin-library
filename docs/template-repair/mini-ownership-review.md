# Mini source-to-feature decision map

The current map follows Mini alpha.29 over feature-review base `a07a1ace`.
The original review was created over `2e730ab8`; source locations and full content
hashes are refreshed for the current implementation rather than retained as stale
evidence. `ownership/mini-vlog.json` is the canonical source/decision record and
`tools/check_feature_ownership.mjs` checks its coverage and contracts.

## Coverage and limits

The current index captures 44 files, including all 30 shipped executable/test files,
21 declared assets/data records, 27 feature decisions, 2,413 callable units
(1,543 anonymous callbacks), 2,131 top-level statements and four embedded programs.
It also captures the new regression sources, canonical build-time audio engine,
and the canonical asset owner/selected-Audio regression shared with Archive.
The asset owner also now supplies source-bound Audio beat-analysis snapshots,
validated JSON cache/result admission and known-duration fallback; Mini retains
its sampling/decoder/Worker adapter and existing cache namespace.
Source hashes explicitly normalize checkout line endings; binary identities stay exact.

The checker reports `coverageComplete:true`, `semanticReviewComplete:false` and
`templateAcceptanceComplete:false`. A source unit linked to a decision does not
prove that the decision is correct or that the feature works on all declared inputs.
Fixed findings require an explicit resolution and validation limits; neither fixed
source nor fixed fixture status promotes a whole template to accepted.

## Feature decisions

Twelve rows keep Mini policy/data specific, nine reuse existing owners, four extend
existing owners and two remain planned text extraction (runtime plus checker share
one prospective owner). The audio engine has now moved from planned extraction to
implemented reuse: four standalone consumers share one canonical CJS source.
The private client and app-update guard are existing owners outside the partial
registry and are still counted explicitly; the registry is not the final module pool.

| Feature | Decision | Owner | Implementation |
|---|---|---|---|
| copy-and-package | keep-template-specific | mini-vlog | specific |
| text-runtime | extract | template-text | planned |
| text-checker | extract | template-text | planned |
| montage-policy | keep-template-specific | mini-vlog | specific |
| candidate-policy | keep-template-specific | mini-vlog | specific |
| title-policy | keep-template-specific | mini-vlog | specific |
| effect-policy | keep-template-specific | mini-vlog | specific |
| host-bootstrap | extend | local-client | partial |
| local-sdk | reuse | local-client | existing |
| audio-beat-engine | reuse | audio-beat-analysis | implemented |
| worker-owner | reuse | analysis-worker | existing |
| music-policy | keep-template-specific | mini-vlog | specific |
| asset-owner | extend | bundled-assets | implemented-extension |
| source-input | reuse | native-image-input | existing |
| catalog-read | reuse | media-inventory | existing |
| local-video-analysis | reuse | clip-analysis | existing |
| scene-observation | extend | media-inventory | planned |
| script-dispatch | extend | local-client | planned |
| authoring-owner | reuse | native-image-authoring | existing |
| workflow-owner | reuse | template-run | existing |
| assembly-policy | keep-template-specific | mini-vlog | specific |
| program-policy | keep-template-specific | mini-vlog | specific |
| workflow-policy | keep-template-specific | mini-vlog | specific |
| panel-ui | keep-template-specific | mini-vlog | specific |
| app-guard | reuse | app-update-guard | existing |
| build-delivery | keep-template-specific | mini-vlog | specific |
| test-harness | keep-template-specific | mini-vlog | specific |

## Findings and repair evidence

- Own-music contents: **fixed in feature fixtures and a development SDK checkpoint**.
  The retained valid 30-second 120/100 BPM WAV diagnostic previously showed stale
  Build dispatch after equal-size/equal-mtime replacement or deletion. It now refuses
  both before planning/import. Existing source/asset/Worker/run owners provide
  verified snapshot/cache, native lifetime, imported Audio path/duration, assembly
  entry/precommit and saved-look restoration. See [mini-own-music.md](mini-own-music.md).
- Optional native probe: **fixed in actual-adapter fixtures**. Terminal/preserve
  failures propagate; ordinary unsupported observation remains unknown. Unknown
  source/lifetime state cannot leave the track selected as a usable fallback.
- Declared source capabilities: **source contract corrected**. Manifest/INSTALL
  now require native full-content identities for selected videos and music and
  distinguish optional video analysis from mandatory physical source admission.
  The wording does not establish released-build or Windows compatibility.
- Configured install roots: **needs reproduction, not a confirmed mismatch**.
  The current host installer and SDK home resolve the same `.selects` roots as
  Mini. Real-source in-memory composition agrees for macOS, Windows drive and
  UNC homes even with a separate shell HOME. Arbitrary-root support and a failing
  supported installation were not established; no new roots API is justified.
  Released/native Windows installation proof remains open.

The development SDK checkpoint exercises actual native decoding and actual Electron
Workers using only generated owned WAVs, with no Project/Draft/import creation.
It does not prove installed UI, real Project save, full playback, export, released
build or Windows acceptance. Server-index provenance, planned text extraction,
scene/script extensions and remaining feature ownership are also still open.

A separate read-only survey adds reproduction candidates for the other 27
templates without modifying this feature's code or PR scope. It is not a complete
semantic review. Whole-template ownership and acceptance remain **0/28**, with
Chan excluded.

## Reproduce

```sh
SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test tests/feature_ownership_coverage.test.mjs tests/template_ownership_audit.test.mjs
SBS_PANEL_TEST_MODULES=/path/to/node_modules node tools/check_feature_ownership.mjs docs/template-repair/ownership/mini-vlog.json > mini-decisions.json
SBS_PANEL_TEST_MODULES=/path/to/node_modules node tools/repro_mini_own_music.mjs > own-music-observations.json
```
