# Photo Draft save checkpoint

Consumers: Four Photo Reveal (`no14-still-video` 0.5.3) and Camera Shutter Dump
(`camera-shutter-dump` 0.1.10). This is part of ordered lifecycle repair, not
completion of either template or the 28-template objective.

## Reproduction and change

The old create paths saved a seed, saved placed Images, then saved the effects,
graphics and audio. A later effect failure therefore left partial output. An
async pre-save callback was not awaited and could outlive ownership of the run.
The final response did not independently confirm the final persisted Images.

Eleven behavioral cases failed against the old source. No.14 first passed its
five initial cases, then the shared working-copy authoring feature was extracted
and Camera passed the same contract. Additional tests reproduced manual-graphic
overwrite, misleading pre-commit uncertainty and late sound import before fixing
those boundaries. A payload test then caught duplicate original paths in No.14's
serialized input; the source list now owns those paths once.

The new create paths apply their original designs to one unsaved working copy
and commit only the complete result. The common module owns placement and
independent persisted Image receipt verification; each template retains its
reference plan, effects and sound policy. A new Draft receipt needs only its
`createdDraftId`, without an existing-Draft `commitId`. Legacy empty seed
continuation remains available; manual content is preserved by refusing it.

## Verification on 2026-10-21

- 34 behavioral/type cases pass, covering both consumers, known pre-commit
  failure, late complete acknowledgment, async ownership changes, new receipt
  shape, 25/23.976/60 fps, legacy continuation after Project default-fps changes and saved-state tampering.
- Two additional cases compile the real complete No.14 panel with esbuild
  0.25.0, with and without minification, then invoke its authoring function.
- The broader photo/reference/SDK/platform-script regression run passed 184
  cases, including the payload and legacy-fps regressions. SDK scripts typecheck against the installed public SDK.
- Python discovery: 291 cases, 285 passed and 6 skipped. Public-source, package,
  template gallery, module drift and diff checks are required before push.
- The test host keeps working copies separate from persisted Drafts. Only
  `commitAll` populates saved state, and verification opens a fresh saved handle.
  This is SDK-script execution with a simulated host, not installed-app evidence.

## Still required

The same run reopened in a new panel can still save twice. Durable atomic run
claiming and a Main-side saved receipt are not implemented in this checkpoint.
A frontend-only journal after a response would lose the receipt when the panel
closes during commit, so that is not an adequate fix.

In-flight commit cancellation, Project/audio import ownership, all persisted
design-property verification, actual installed execution, full AV playback,
export and Windows execution remain open. No silent fallback or blind mutation
retry is added, and Chan's apps and other templates are not migrated here.
