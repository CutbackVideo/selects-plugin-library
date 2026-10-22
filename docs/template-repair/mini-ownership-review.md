# Mini source-to-feature decision map

This checkpoint covers Mini's current shipped source/data and its local operation
builders at base `2e730ab8658054fc94032ced649e4515c3df2973`. It creates a reproducible
source-to-decision map, not a claim that Mini's semantics or runtime are complete.
Chan remains excluded. The existing eight-entry distribution registry is partial;
private canonical transport and app-guard owners also exist outside it.

## Captured scope and what the checker proves

The decision file is [ownership/mini-vlog.json](ownership/mini-vlog.json). It records
27 decisions with explicit inputs, outputs, units/identity, dependencies, effects,
lifetime/cleanup, success/unknown outcomes, retry rules, distribution and evidence.
Every captured source/data file is pinned by SHA-256. Text explicitly normalizes
LF/CRLF checkout line endings; binary media bytes stay exact. A changed package file fails
admission until its ownership record is reviewed again; this is intentional.

Coverage includes all thirty shipped executable/test files, five local build-source
files and one reproducible diagnostic: 36 files. Runtime itself is thirteen files;
sixteen shipped regression scripts, one checker and one diagnostic are developer
validation, not runtime features. Twenty-one additional assets/contracts include
all twenty shipped nonexecutables plus plugin.json. The map also declares four
embedded program producers and their input/output/lifetime contracts.

The AST checker links 2,175 callable units, including 1,393 anonymous closures, and
1,999 top-level statements to decisions. Of those callable units, 1,342 are runtime,
781 validation/checker/diagnostic and 52 build-source units. Nested functions,
generated shared copies and regression fixtures are included. These are coverage
counts, not feature/module counts or application-complexity claims. They must not
be compared with the earlier named-function-only 753 count as code growth.

`tools/check_feature_ownership.mjs` performs no plugin execution. It refuses missing
shipped source/data, stale source/asset hashes, missing contract fields/owners,
uncovered source units, ambiguous crossing ranges, whitespace-only fake features,
invalid embedded-program records and ungrounded finding locations. Python/shell
remain explicit manual work and cannot report a complete callable index. Even a
complete AST map always reports semantic review and template acceptance as false.
The source/decision link is mechanical evidence; the truth and efficacy of a decision
still require review, implementation, and applicable runtime verification.

## Decisions, with implementation status kept separate

Twelve rows keep Mini policy/data specific, nine reuse existing owners, three extend
existing owners, and three identify extraction work. The three extraction rows mean
two prospective owners: text runtime plus its developer checker share one text
feature; numerical audio beat analysis is the other. Neither has been implemented
by this checkpoint. There are no new runtime modules in this change.

| Feature | Decision | Owner | Implementation |
| --- | --- | --- | --- |
| copy-and-package | keep-template-specific | mini-vlog | specific |
| text-runtime | extract | template-text | planned |
| text-checker | extract | template-text | planned |
| montage-policy | keep-template-specific | mini-vlog | specific |
| candidate-policy | keep-template-specific | mini-vlog | specific |
| title-policy | keep-template-specific | mini-vlog | specific |
| effect-policy | keep-template-specific | mini-vlog | specific |
| host-bootstrap | extend | local-client | partial |
| local-sdk | reuse | local-client | existing |
| audio-beat-engine | extract | audio-beat-analysis | planned |
| worker-owner | reuse | analysis-worker | existing |
| music-policy | keep-template-specific | mini-vlog | specific |
| asset-owner | reuse | bundled-assets | existing |
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

Common file/media, source admission, inventory, video measurement, Worker lifetime,
program verification and durable save/recovery remain with their existing owners.
Mini keeps montage role/order/pace/Groove/photo policy, visual layout/easing and its
UI/coordinator. This does not exempt their generic mechanisms from future review:
scene observation and duplicated script dispatch are explicitly assigned to planned
extensions of media-inventory and the private client. Legacy host bootstrap is a
partial migration, not a newly invented filesystem module.

The source map records separate existing private owners for `local-client` and
`app-update-guard`, since they are not entries in the current eight-module marker
registry. Do not interpret registry size as the complete module-pool inventory.

## Confirmed next repair: own music is not content-bound

`tools/repro_mini_own_music.mjs` generates valid thirty-second mono PCM16 WAVs at
22,050 Hz and invokes the current numerical engine. It measures 119.99 BPM for the
original and 100 BPM for the replacement. The WAVs both occupy 1,323,044 bytes.
After the same path/size/mtime replacement, the actual Mini Build callback still
passes 119.99 BPM into its planner and reaches another assembly dispatch. Deleting
the original also reaches dispatch. An unchanged-file control continues normally.

The prior React state comes from actual engine output, while the Project/import/
save boundaries use the existing disposable fixture. These are actual Build-boundary
counterexamples, not installed UI, native Worker, real save, playback or export proof.
An earlier exploratory fixture used non-audio placeholder bytes; the valid WAV
reproduction supersedes that limited input and is the retained correctness evidence.
The diagnostic reports observations, so it does not require the bug to remain present.

The next implementation should combine this defect's reproduction/fix/recovery
with the byte-identical Mini/Archive/Selfie/City beat-engine extraction. Reuse the
existing asset/input/Worker/durable owners for bytes, staging, cancellation and
save/recovery; the numerical engine does not become another file/cache owner.
Summer/End Credits variants must retain their actual policies until compared.

## Other grounded findings

- `hostProbeSeconds` catches all native probe failures and returns null, concealing
  the shared client's terminal lifetime distinction. Its actual-adapter reproduction
  and ordinary-fallback compatibility control belong with the own-music repair.
- The manifest still describes fingerprint as a local/unanalysed-only requirement
  and asks for analyzed input, while current code confirms all selected originals
  and accepts analysis-optional clips. INSTALL's broad old-host fallback promise
  must also be reconciled with mandatory source admission.
- INSTALL promises environment-provided roots, but current bootstrap constructs
  the default home/.selects paths. This is a source/declared-contract mismatch;
  nondefault installed-root behavior has not been runtime-tested. Trace the real
  host root capability before fixing; do not narrow the promise just to pass checks.

The source map assigns each finding to a feature/owner, exact captured locations,
repair acceptance and evidence. These findings remain open. Server-index provenance,
remaining planned extraction/extensions, full installed UI and all declared-input/
platform/audio/video/export gates also remain open. Complete semantic ownership
reviews and whole-template acceptance remain **0/28**.

## Reproduce and validation

```sh
SBS_PANEL_TEST_MODULES=/path/to/test/node_modules node --test tests/feature_ownership_coverage.test.mjs tests/template_ownership_audit.test.mjs
SBS_PANEL_TEST_MODULES=/path/to/test/node_modules node tools/check_feature_ownership.mjs docs/template-repair/ownership/mini-vlog.json > mini-decisions.json
SBS_PANEL_TEST_MODULES=/path/to/test/node_modules node tools/repro_mini_own_music.mjs > own-music-observations.json
```

Thirteen structural guard tests pass (ten new plus the three existing inventory
checks); the real source map passes with zero uncovered units. The valid own-music
counterexamples are confirmed separately and are not counted as successful repair
regressions. The current changes touch developer source-review tools, records and
CI; they do not modify Mini runtime behavior or package files. Previously passing
runtime suites are not rerun for this checkpoint. Public/package/template checks
and the normal pre-push gate still apply. No Electron or installed data is used.
