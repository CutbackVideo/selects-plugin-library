# Archive: require two real videos before a new build

Archive keeps its existing video montage design. A new app template run needs at
least two different Video Resources. Photos are optional, and the app handoff
allows at most 50 records in total. This is an explicit user decision; this change
does not add a photo-only or one-video layout.

## Defect and ownership

The manifest accepted video/image records, but the planner required two videos
later. The caller also silently converted/dropped malformed records and trusted
their declared kinds. A two-file photo selection could therefore reach work that
could never satisfy the existing montage policy.

The existing `native-image-input` module now owns two reusable mechanics:

- `templateMediaSelection`: validate the bounded handoff, preserve order, dedupe a
  consistent Resource identity and refuse contradictory kinds. It performs no I/O
  and deliberately permits an empty selection; role/count policy is caller-owned.
- `resolveTemplateMedia(..., {includeKind:true})`: after the existing private
  unsaved placement/readback, match the observed alias to current Project Resource
  metadata. Return the observed kind, or an explicit mismatch/unknown failure.
  One batch shares one metadata observation. An unknown observation cannot replay
  placement. The receipt validator also requires consistent kind evidence.

Archive opts in and owns `avVideoRequirement`, used by the planner, panel gate and
new headless build. It checks distinct videos both before assets/placement and
after actual alias resolution. Two handed ids resolving to one video do not count
as two. A failed source keeps its original diagnostic rather than becoming a
fabricated missing-file or minimum-count diagnosis.

All other common-module consumers retain the default result shape and make no new
Resource-kind query. The shared source is rebuilt into registered panels and
operations; generated delivery copies are not independent implementations.
Registry size stays nine modules / fourteen partial consumers. Chan stays excluded.

## Execution and recovery

For example, `[video A, photo P, video A, video B]` becomes the ordered selection
`[video A, photo P, video B]`. Archive then confirms A and B are two different real
videos before reading the scene inventory, analysing media or importing music.
`[video A, photo P]` stops with an input message before those steps.

The existing continuation is read **before** inspecting a new selection. Recovery
uses its frozen input/configuration and existing durable owner. Changing the
current selection cannot force a saved run through new admission or create a new
Draft in place of recovery.

## Evidence and limits

TDD captured the missing admission/kind behavior, then a separate counterexample
showed that a Resource-catalog transport failure needed an unknown result. It now
stops without a second placement. Focused current-source runs passed:

- 149 admission/source-resolution, selected inventory, cue and look-recovery cases.
- 211 existing common consumers, native facts, source bindings, assembly/save
  verification and ownership-index cases.

These are disjoint test-file sets. They establish those boundaries, not full
template acceptance. The new files contain 38 cases (24 shared / 14 Archive),
including two videos with optional photos, inclusive 50 records, duplicate real
aliases, inconsistent/missing kind receipts and old-run recovery before admission.

An actual development Electron SDK run used the current emitted source script:
two retained generated videos returned Video kinds; a Video falsely declared as
Image failed at kind observation. Project metadata/resources/source links and
both existing saved Drafts were identical before/after; all four calls disallowed
commit. No probe Draft was saved and no media imported.

The closed task profile was hash-backed up before launch. The private preserving
launcher used `--isolated-data --keep-data`, and the exact owned runtime was
stopped afterwards. This does not restore the earlier profile-reset incident
recorded in `archive-audio-workflow.md`.

Native receipt/scripts, RED/GREEN logs and backup/cleanup receipts are retained
in the private Archive input-admission evidence packet dated 2026-10-23.
Installed PanelHost UI, playback, export, released-build and native Windows checks
remain open. Whole-template semantic ownership/acceptance remains 0/28.
