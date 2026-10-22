# Mini: verify title/effect contents before reuse

Scope: Mini `0.1.0-alpha.21`, based on #320 /
`e2dbfd1c5267ae138e71efab7acdf4c91ecdf217`. Extend the existing
`imageProgramsFeature` in `native-image-authoring`; add no module. The registry
remains seven features/twelve consumers and is still partial. Whole-template
ownership review and acceptance remain **0/28**. Chan apps remain excluded.

## Root causes and behavior

The decoration script treated a title/effect label as evidence that it was
complete. A different title's text, source or controls, a shortened placement,
a disabled/duplicate effect or a wrong effect setting could be adopted. It also
trusted writer acknowledgements without rereading the resulting programs. The
selected entry separately retried its committing decoration call immediately
on any failure, including a lost response after dispatch.

The canonical program feature now offers `reconcile(draft, intent, beforeApply)`.
Its existing Image inspection/preset/verification API stays unchanged. The new
method freezes bounded JSON intent, resolves candidates by label, and confirms
exact source, resolved values/defaults, editable definitions, graphic intervals
and managed effect order. Duplicate/conflicting candidates fail; no candidate
is adopted just because its label matches. Existing managed effects must be a
valid prefix of the requested order: appending a missing punch after an existing
Soft look would invert the intended composition, so this fails before mutation.
Unrelated effects remain in place; nothing is removed or reset.

All targets are preflighted before the optional caller mutation. Mini keeps its
own muting/planning policy in that callback. Every edit uses fresh SDK targets.
Add only missing programs, then independently reread the authored result before
Mini's sole decoration commit. An ignored write cannot become success. An exact
repeat performs no additional commit. Private diagnostics remain error causes.

Mini's decoration script is now generated from that canonical feature and a
local operation template, alongside its existing Audio generator. It installs
self-contained: no cross-plugin import. Register the builder as a build-time
consumer and check the generated script in CI. Existing photo/Gallery consumers
are synchronized/regenerated, versioned and tested. No public SDK is changed.
The selected entry sends decoration once and preserves an unconfirmed error's
Draft ID and cause, with a translated inspect-before-new-run message in all ten
locales. No missing reply authorizes an automatic second save.

## TDD and runtime evidence

- Initial real-script program cases: 17 tests, 16 RED. Wrong source/values/
  controls/intervals, duplicate/disabled effects, ignored writes, muting order,
  missing capability and private-cause handling are covered. The actual selected
  entry sent a lost-response save twice before the fix (2 versus 1 RED).
- Final focused suite: 22 tests. Also check unrelated-effect preservation,
  defaulted values, a valid partial prefix and a minified generated operation.
- Related suite: 913 tests across 26 files, including existing photo/Gallery
  atomic authoring, programs, transforms, graphics, Audio, run receipts and
  Mini/inventory/restart consumers. All pass. All sixteen existing Mini test
  scripts pass, including FFmpeg checks and five scripts against real SDK types.
- Actual SDK: retain two explicit test Drafts in the existing isolated 64-image
  Project. Put a different same-label title on the control. Parent code reports
  `alreadyDone`; new code rejects and its saved snapshot is unchanged. On the
  healthy Draft, save a simple editable title plus the actual Mini Soft look
  program, read both back, and repeat the minified operation with no new commit.
  These are four fixture commits (two assembly, control setup, healthy decoration),
  two test Drafts, zero imports and zero Projects. Resource/file snapshots and 64
  original hashes, plus the earlier Project, are preserved.
- This verifies program/material semantics through actual SDK save/readback.
  The simple test title is not proof of the full Mini title layout, fonts or
  rendered output. The test runtime is stopped; owned descendants/ports/app copy
  and empty alias folders are removed while persistent data/other tasks remain.

## Still required

Later checkpoint: `mini-look-phase.md` addresses the phase ownership/restart gaps
below. This section preserves the limits of the original #321 evidence.

This is program-intent reconciliation, not durable look-phase ownership.
Standalone Finish still needs an owned phase receipt, exact original recipe,
post-save confirmation and restart/partial-failure handling. Its old failure text
and manual retry behavior must be reconciled with known-no-save versus unknown
outcomes. Assembly continuation currently ends at assembly handoff. Do not claim
that this checkpoint makes a whole-renderer restart during decoration recoverable.

The selected entry now stops an unknown save instead of retrying it, but full
phase recovery remains necessary. Full Main/other-track and original-file
semantics, analysis/cache budgets, per-occurrence photo-motion intent (current
`byRid` reduction), installed PanelHost UI, complete playback/export and Windows
acceptance remain open. Archive has not migrated to this new program API.
