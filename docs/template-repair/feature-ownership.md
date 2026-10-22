# Feature ownership: mandatory, incomplete

Repairing every template includes classifying every feature of all 28 audited
Clip Highlights templates. The current panel-module registry is a
partial distribution registry, not a finished account of every reusable feature.
Chan's apps and template packs remain excluded.

## Required decisions

Every feature must receive exactly one evidenced decision:

1. Reuse an existing common module unchanged.
2. Extend an existing common module while preserving its existing consumers.
3. Extract a new common module after establishing a distinct responsibility.
4. Keep template-specific behavior/data, with an explicit reason.

An unreviewed row is not a fifth final decision. It is unfinished work. Code
repetition, module count, a passing sync command or an installed generated copy
cannot establish that the ownership work is complete. There is no fixed target
of five, six or sixty-one modules.

Each decision record must identify the actual entry/call path and source files;
input/output fields, types, units and identity domain; captured dependencies and
injected constants; side effects and target ownership; lifetime/deadline/abort;
cleanup versus assets retained by previous results; success, partial and unknown
outcomes; safe read retry versus non-replayed mutations; generated distribution;
and RED/GREEN plus existing-consumer and applicable runtime acceptance evidence.
A moved beat-analysis worker must account for sample-rate constants as well as
its function body. Translation mechanics can be shared while wording stays with
the template. Scripts/engines, generated copies, top-level orchestration and
callbacks must be assigned to their owning feature, not omitted for lacking a
standalone function declaration.

## Read-only structural baseline

`tools/audit_template_ownership.mjs` reads the manifests, shipped executable paths,
named JS/TS functions/methods, source hashes and locations. It executes no plugin
code. AST token fingerprints ignore comments/spacing without deleting comment-like
contents inside strings. Repetition requires at least three distinct templates;
multiple generated copies in one template alone do not meet that rule. It lists
registered marker/code matches separately from unknown copies and records the
registry's build-time dependencies. Missing, Python/shell, unsupported/generated
placeholder syntax remain explicit manual-review items. External-reference names
are review hints, not a complete runtime dependency graph.

At the code snapshot inherited from `93cb267b62c02329f3761b9942c8cb186b110979`,
the inventory covers 28 templates and 224 shipped executable files. It indexes
6,237 named functions/methods, including 2,411 function declarations in panels,
and finds 335 repeated token groups across at least three templates. Generated
copies and existing common features are included. These are structural counts,
not feature/module counts or completed decisions. They use a wider file/function
scope than the earlier `f8c2f11` panel-only 1,915/61 observation, so the counts must
not be interpreted as a growth comparison. Whole-template ownership reviews
completed: **0/28**.

Reproduce with the same TypeScript dependency used by the existing tests:

```sh
SBS_PANEL_TEST_MODULES=/path/to/test/node_modules node tools/audit_template_ownership.mjs > ownership-inventory.json
```

The JSON includes exact source hashes, line locations, static external-reference
names and undecided rows. Retain that report with the audited commit; regenerate
when sources change. The small fixture tests cover scope exclusion, managed versus
unmanaged copies, external constants, string-safe fingerprints, shipped scripts
and explicitly retained unparseable templates. Their passing result validates
those inventory behaviors, not semantic completeness of this table.

## Mini complete source-to-decision coverage, semantic review still open

The first per-template source map is [ownership/mini-vlog.json](ownership/mini-vlog.json),
explained in [mini-ownership-review.md](mini-ownership-review.md). It links all 30
shipped executable/test files, five local build sources, a reproducible diagnostic,
and all shipped data/contracts to 27 explicit decisions, including anonymous
callbacks and four embedded-program producers. Hashes reject stale attribution.
The added checker never turns structural coverage into semantic or runtime success.

Current map: 12 template-specific, 9 existing-owner reuse, 3 existing-owner extensions,
and 3 extraction decisions representing only two prospective feature owners. Those
planned owners are not implemented. The private transport and app guard are listed
as existing owners outside the partial marker registry. Four open findings include
valid own-music source replacement/missing-file dispatch, native probe uncertainty,
capability wording, and configured install-root discovery. Complete semantic
ownership reviews remain 0/28. The map supplies concrete remaining work rather than
allowing repetitive helper groups to be silently assigned to template-specific code.

## Initial reviewed decisions, with separate implementation status

| Template/feature | Decision and owner | Boundary and reason | Implementation/evidence |
| --- | --- | --- | --- |
| Mini original Resource ID/alias and native Image facts | Reuse `native-image-input` | Resolve the selected original input and report structured observations; montage/planning policy remains with Mini | Source/caller RED/GREEN and actual SDK cases in `template-source-resolution.md`; full template acceptance open |
| Mini/Archive standalone original photos and result-owned framing facts | Extend `native-image-input`; keep style/opening policy specific | Existing exact-ID native facts and file availability, bounded selection batches/deadline/liveness; retain the verified dimensions per result instead of rereading a mutable cache | Actual caller/inventory/assembly/Finish RED/GREEN and unsaved SDK transform readback in `mini-native-facts.md`. This does not finish source-content identity, placement/save or whole-template ownership |
| Mini bundled cue preservation | Reuse `bundled-assets` | Pin cue bytes/hash, publish owned data and independently confirm Audio; Mini supplies cue policy and the planned required interval | Both caller paths, 31 boundary tests and eight initial actual SDK cases in `mini-owned-cues.md`; existing installation-linked Draft recovery open |
| Mini and Archive local files/media transport and bootstrap | Reuse `shared/local-client.ts` unchanged | Canonical async file/media primitives and scoped connection lifetime already exist; no competing file module or public SDK change | Both generated adapters migrated and checked; wrapper/transport regressions and exact embedded-client actual SDK cases in `mini-media-scope.md`. Remaining legacy file/scoring callers still need their own ownership review |
| Mini and Archive temporary PCM / Mini preview staging | Extend `bundled-assets` | Reuse exclusive reservation, bounded byte reader and media process scope; own one captured client, declared read budget, cancellation/deadline and cleanup outcome | 26 focused TDD cases, existing-consumer checks and nine actual SDK scenarios in `mini-media-scope.md`. Temporary source-content attestation and crash recovery remain open |
| Mini preview encoding and Archive playback/fallback policy | Keep template-specific policy | Mini encodes a bounded MP3 section; Archive seeks/fades a whole-track Blob and supports ordinary decode failure through WebAudio. Sharing the owner does not require silently changing those user contracts | Mini's actual Stop aborts the common producer. Archive preserves healthy fallback but stops on terminal ownership errors. Whole-file budget and fallback/source analysis remain open |
| Mini and Archive browser beat analysis execution | Extract `analysis-worker`; keep rate, algorithm and protocol with callers | No existing owner handles browser Workers/Blob URLs/event/timer subscriptions. One transient scope owns dispatch through observed cleanup, bounded by signal, actual caller liveness and one deadline; no Project or media mutation | 27 actual-adapter cases and eight real Chromium scenarios in `analysis-worker.md`, including parent leaks, exact unchanged-detector/PCM parity and execution under the actual client sandbox document policy. Four other beat adapters and installed-panel/full-template execution remain pending |
| Mini UI execution generation and scene/local callback scope | Keep coordinator-specific state; reuse existing asynchronous owners and current predicates | React busy/progress/controller state belongs to the caller; durable/media/input owners receive its current-run callback. Adopt Archive's generation pattern, rather than adding a module for a counter or storing React refs in the common durable owner | Six actual-callback RED/GREEN cases in `mini_execution_ownership.test.mjs`; wider scene/local budget, result and cache review remains open |
| Mini assembly dispatch and lost-response adoption | Extend/reuse `template-run`; retain Mini config/style policy | Exclusive run ownership, frozen content request, SDK capability/pre-save representability barrier, same-invocation owned receipt and independent Main source/transform/audio readback. No name lookup or unknown-save replay | Real callback RED, twenty-three focused receipt/execution cases, existing photo/Gallery consumer checks and actual SDK save/recovery in `mini-assembly-receipts.md`. Standalone remount discovery is now an extension of the same owner, with immutable pending inputs and completed-run tombstones; see `mini-pending-discovery.md` (43 focused / 520 related cases and actual Electron-restart readback). Title/Finish ownership is extended in `mini-look-phase.md`; whole-template verification remains open |
| Mini title/effect content reconciliation | Extend/reuse `native-image-authoring` program feature; retain Mini style/mute/planning policy | Existing canonical normalization/comparison and SDK-safe serialization now preflight/reconcile exact programs on Main and overlays; no label-only adoption or unverified write acknowledgement. Existing Image consumers keep their API | Twenty-two focused / 913 related cases, sixteen existing Mini scripts and actual SDK saved control/healthy/minified checks in `mini-program-intent.md`. Durable look-phase ownership and standalone Finish recovery now extend `template-run`; see `mini-look-phase.md`. Whole-template verification remains open |
| Mini durable title/look phase and saved-state comparison | Extend/reuse `template-run`; retain Mini recipe/style policy | Preserve the original workflow through confirmed look save; exact frozen recipe, pre-save immutable exposed-state file, same-invocation exclusive phase receipt, read-only unknown recovery and generation-locked known-no-save retry. Existing assembly-only/photo/Gallery APIs stay intact | Sixteen focused cases, parent callback RED/GREEN, 929 related tests and actual SDK full-title/fonts/lost-reply/Electron-restart/manual-edit checks in `mini-look-phase.md`. Physical/nested source semantics, installed UI, playback/export and Windows remain open |
| Mini and Archive paged Project inventory | Extract `media-inventory`; retain existing actual script runner and localized errors | One read-only catalog observation owns projected page validation, exact value reobservation, aggregation, byte/row budgets, deadline/current owner and retry waits; exact confirmed-observation admission and caller candidate invalidation. Selected-original native facts, files/media jobs, Worker execution and persistence keep their existing owners | Initial 15/17 RED; first Mini repair then shared Archive migration; 77 focused / 262 related cases and ten actual SDK scenarios over unchanged pager/runner code in `media-inventory.md`. Selected-file entries now reuse the same owner with a complete-facts policy; 25 focused / 287 related cases and twelve SDK read scenarios are detailed in `selected-inventory.md`. Other five custom inventories, generic result pagers and whole-template acceptance remain open |
| Mini native-clock assembly and planned placement verification | Extend `native-image-input` and `native-image-authoring`; retain Mini cover/trim, music and effect policy | Optional per-source private insertion-clock observation; occurrence delta binding, planned Main transforms and overlay Audio verification. Serialize explicit dependencies into every Image/Gallery consumer; defaults preserve existing callers. Mini verifies source windows before/after its declared trim and passes the actual placed source origin to Beat punch | Parent RED, focused fault/clock tests, affected consumer suites and actual SDK saved cuts/lost-reply/full-title evidence in `mini-assembly-intent.md`. Photo motion keyed by Resource is retained under the allocator and assembly one-photo-use invariant, not classified as a repeated-photo bug. Historical frozen recipes, installed UI, playback/export and Windows remain open |
| Historical Mini staged-run admission and retirement | Extend `template-run`; retain Mini semantic policy and reuse input/Audio readers | Exclusive terminal retirement prevents old unstarted/retryable operations from authoring; unknown/saved results retain their actual status. Saved historical cuts/source/crop/music are read against original Mini intent even with an existing look recipe. Original source/digest remain unchanged; shared local policy generates assembly and verifier | Fifteen owner/entry and sixteen verifier cases, parent wrong-plan/transient-read RED, 1,096 affected cases and exact old-operation actual SDK recovery in `mini-frozen-recovery.md`. Current photo/Gallery defaults preserved; no new common module. Whole-template acceptance remains open |
| Mini local frame evaluation, source-bound cache and physical-source admission | Extract `clip-analysis`; extend/reuse `bundled-assets`, private `local-client`, `native-image-input`; reuse `template-run` unchanged | Preserve the existing frame/cut/window algorithm; one captured client, complete native source fingerprint and verified private snapshot, bounded gray/JSON, existing persistent publication and strict temporary cleanup. Both entries reuse confirmed disk scores; original observations gate assembly and durable look continuation. Montage role/scale/UI/planner stays Mini policy | Parent actual Build/FFmpeg RED, focused recovery/lifetime cases and eight native SDK cases in `mini-analysis-inputs.md`. Eight registry entries / twelve consumers remain partial; six legacy QuickScore consumers, analyzed-scene freshness, later file changes, installed UI, playback/export and whole-template acceptance remain open |
| Native media process identity, cancellation and workspace lifetime | Extend the existing private `local-client` and `bundled-assets`; adapt Archive legacy boundary, keep codec/evaluation policy specific | One captured start and one cancel, recognized terminal same-job observation, bounded output/start/status/recovery; unknown producer lifetime retains private reservations and propagates diagnostics. Existing A16z compiled client is rebuilt; its live RGB adapter exclusively reserves per-run output and propagates uncertainty through optional framing/stock/levels coordination | Parent client/cleanup/Archive counterexamples, focused tests and native fault/read-recovery evidence in `local-media-lifetime.md`. No new module. Persisted uncertain workspaces, remaining legacy consumers and full installed-template acceptance remain open |
| Mini all-selected-video physical original and Project source binding | Extend/reuse `native-image-input`; reuse `template-run` unchanged; retain Mini search/cache policy | Exact current Resource ID/path plus complete content observations, bounded read requests, candidate cache admission, assembly entry/precommit and saved-look recovery; no new module or host SDK | Both-entry parent REDs, relink-before-commit RED, 1,556 distinct affected cases, restoration of the same saved assembly, and five actual native SDK reads in `mini-video-source-admission.md`. Server-index content provenance, later external changes and full installed-template acceptance remain open |
| Mini template policy data | Keep template-specific data | Track choices, title presets, default length/pace and styling express this template's promised output; the same data schema need not imply identical values | Preserve policy while reviewing mechanisms separately; this decision does not classify every planner, UI or typography function |

These new feature records extend the initial decisions; they still do not cover
every function, callback or script in Mini/Archive. The baseline counts below
remain tied to their inherited snapshot. Archive now also declares bundled-assets;
regenerate the structural inventory to inspect current source locations/counts.
Whole-template ownership reviews remain 0/28. PR #309's final CI run
`39704738763` completed successfully; that validates the inventory checks, not
semantic completeness of this ledger.

The remaining candidate responsibilities include file/media preparation, paged
inventory/read budgets, local clip scoring, language mechanics, remaining beat-worker
consumers, script input transport, source identity, transcription, face analysis,
framing, cut allocation and save/recovery. These must be compared against existing
features before choosing expansion or extraction. Different-shaped implementations
of the same responsibility also require review; token matching cannot find all.

## All-template review ledger

Counts below inventory code locations only. Declared dependencies include generator
imports; an empty registry cell is not proof that a template has no shared logic.
Every Pending row still needs complete feature coverage and the four-way decisions.

| Template | Shipped code files | Named functions/methods | Declared module dependencies | Full ownership review |
| --- | ---: | ---: | --- | --- |
| `ali-abdaal-style` | 1 | 34 | No declaration in this registry | Pending |
| `archive-vlog` | 30 | 608 | `native-image-input` | Pending |
| `camera-shutter-dump` | 1 | 134 | `native-image-input`, `native-image-authoring`, `template-run` | Pending |
| `chris-williamson-style` | 15 | 283 | No declaration in this registry | Pending |
| `cinema-vlog-studio` | 1 | 68 | No declaration in this registry | Pending |
| `city-weekend-vlog` | 26 | 341 | No declaration in this registry | Pending |
| `daily-vlog-8` | 1 | 62 | No declaration in this registry | Pending |
| `depth-type-captions` | 1 | 182 | `ai-job-client` | Pending |
| `doac-style` | 14 | 206 | No declaration in this registry | Pending |
| `fast-switching-stopmotion` | 1 | 61 | No declaration in this registry | Pending |
| `four-photo-stop-motion` | 1 | 156 | `bundled-assets`, `native-image-input`, `native-image-authoring`, `template-run` | Pending |
| `gongju-gallery` | 1 | 55 | No declaration in this registry | Pending |
| `jude-kinetic-style` | 1 | 127 | `ai-job-client` | Pending |
| `mini-vlog` | 29 | 555 | `bundled-assets`, `native-image-input` | Pending |
| `no14-still-video` | 1 | 163 | `bundled-assets`, `native-image-input`, `native-image-authoring`, `template-run` | Pending |
| `photo-gallery-no2` | 8 | 226 | `bundled-assets`, `native-image-input`, `native-image-authoring`, `template-run` | Pending |
| `place-count` | 11 | 184 | No declaration in this registry | Pending |
| `polaroid-photo-dump` | 1 | 161 | `bundled-assets`, `native-image-input`, `native-image-authoring`, `template-run` | Pending |
| `portrait-beat-montage` | 1 | 179 | `ai-job-client` | Pending |
| `postcard-cutout-studio` | 4 | 218 | No declaration in this registry | Pending |
| `recap-2026` | 1 | 83 | No declaration in this registry | Pending |
| `selfie-aesthetic` | 10 | 352 | No declaration in this registry | Pending |
| `summer-trip` | 19 | 503 | No declaration in this registry | Pending |
| `thank-you-recap` | 1 | 56 | No declaration in this registry | Pending |
| `the-end-credits` | 30 | 591 | No declaration in this registry | Pending |
| `torn-paper-love` | 11 | 374 | No declaration in this registry | Pending |
| `travel-beat-vlog` | 1 | 148 | `ai-job-client` | Pending |
| `vlog-opening` | 2 | 127 | No declaration in this registry | Pending |

## Completion gate

The goal remains active until every row links to complete feature records and all
shipped behavior is accounted for, including unparsed/dynamic code. Every reuse,
extension or extraction must have dependency preservation and distribution/runtime
evidence. Every template-specific decision needs a reason. No unowned feature,
unreviewed input/output boundary or unaccounted dependency can be hidden by a
single family-level label. Then the separate bug, valid-input, supported-platform,
saved-output, full video/audio playback and export gates in README must also pass.
The inventory tool always reports `complete: false`; it never approves this gate.
