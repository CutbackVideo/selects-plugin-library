# Feature ownership: mandatory, incomplete

Repairing every template includes classifying every feature of all 28 audited
Clip Highlights templates. The current five-entry panel-module registry is a
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

## Initial reviewed decisions, with separate implementation status

| Template/feature | Decision and owner | Boundary and reason | Implementation/evidence |
| --- | --- | --- | --- |
| Mini original Resource ID/alias and native Image facts | Reuse `native-image-input` | Resolve the selected original input and report structured observations; montage/planning policy remains with Mini | Source/caller RED/GREEN and actual SDK cases in `template-source-resolution.md`; full template acceptance open |
| Mini bundled cue preservation | Reuse `bundled-assets` | Pin cue bytes/hash, publish owned data and independently confirm Audio; Mini supplies cue policy and the planned required interval | Both caller paths, 31 boundary tests and eight initial actual SDK cases in `mini-owned-cues.md`; existing installation-linked Draft recovery open |
| Mini local files/media transport | Reuse `shared/local-client.ts` | Canonical async file/media primitives already exist; an older embedded copy is not a reason to create a competing file module | Convergence remains pending. Exact embedded-client actual SDK reuse has additional evidence; broader dependency/migration review still required |
| Mini template policy data | Keep template-specific data | Track choices, title presets, default length/pace and styling express this template's promised output; the same data schema need not imply identical values | Preserve policy while reviewing mechanisms separately; this decision does not classify every planner, UI or typography function |

The remaining candidate responsibilities include file/media preparation, paged
inventory/read budgets, local clip scoring, language mechanics, beat-worker
lifetime, script input transport, source identity, transcription, face analysis,
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
