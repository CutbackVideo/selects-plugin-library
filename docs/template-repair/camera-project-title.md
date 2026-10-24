# Camera Project title and saved graphic checkpoint

Camera Shutter Dump 0.1.13 now resolves its automatic closing title from the
public Project metadata. Four Photo Reveal 0.5.6 shares the extended graphic
receipt verification. This checkpoint does not complete either template or the
28-template objective. Chan's apps remain excluded.

## Reproduction and source ownership

The actual compiled Camera template received the normal app context without
`projectName` and wrote `Memories` even though its Project was named `Family
trip`. A stale injected context name also overrode the actual Project. Eight of
ten initial title cases failed. The public SDK already exposes `ProjectMeta.id`
and `title`; no extra Project-name wrapper module, client IPC or SDK is needed.

The normal create path now reads only the normalized title projection through
that existing API before sound import or Draft creation. It checks Project ID
and requires an observed string title; missing, foreign, failed or incomplete
observations stop before writes with a safe public message. A genuinely blank
title retains the existing `Memories` fallback. Explicit caller-provided titles
and legacy low-level finish builders keep their previous contract. The 48 UTF-16
unit limit remains, while truncation no longer leaves a dangling surrogate.

Title policy is `project` in the app-run request. The first preparation reads a
title snapshot; the receipt stores the resulting graphic parameters. Reopening
that completed run verifies the original saved title even if the Project was
renamed. An explicit new run reads the new title. No existing Draft is rewritten.

## Shared verification

Eight initial graphic receipt tests failed: complete authoring returned no
graphic evidence, persisted data changes were ignored and remount recovery only
checked Images. The existing `native-image-authoring.js` module now provides
`inspectImageGraphics`, reused by Camera's Burst/Text and No.14's decoration.

Normal create paths require the existing SDK graphic read methods, capture the
new Clip ID/track/frame interval/explicit parameters, and inspect the working
copy before the template's sole commit. A separate SDK invocation then checks
the persisted graphics again. Expected parameters are compared structurally;
key order and extra host-supplied defaults do not create a false difference.
The receipt contains neither original file paths nor full TSX/recipe data.

`template-run.js` preserves optional graphic evidence in the existing bounded
saved record and validates its identities/ranges/shape. Other non-photo users
can still omit this optional field; the two Image create/recovery paths require
graphic evidence. Older Image receipts without it require inspection and are
never replayed or silently upgraded. Camera's corrected title policy may also
make an older run request incompatible; start an explicit new run for a revision.

Legacy low-level finish builders still report commit results, rather than
claiming a separate persisted verification. Normal panel and app template create
paths provide the new working-copy and independent-readback guarantees.

## Evidence and remaining gates

- Title source tests: missing/stale UI context, escaped/Unicode/blank/long names,
  explicit override, unknown/foreign metadata, failed observations, safe errors,
  surrogate boundaries and Project rename/new-run behavior.
- Graphic tests: minimal receipts, wrong working-copy/persisted parameters,
  capability refusal before commit, key-order changes, immutable old receipts
  and manual edits preserved without save replay. A thrown or rejected saved
  readback retains the known Draft ID and exposes only a safe public message.
- The focused title/graphic plus prior atomic/recovery suite passes 114 cases;
  the broader photo/SDK suite passes 382, including those cases. SDK scripts and
  real minified panel execution remain covered. Python: 285 passed, 6 skipped.
- These are SDK-host/React simulations with separate persisted state. The
  installed app, Windows execution, full AV playback and export remain open.

This verifies graphic identity, interval, count and explicit parameter values.
Graphic transforms, TSX source identity, editable definitions, Image effect
stacks and full Audio properties are not all verified by this checkpoint. Those
remain required, together with the remaining per-template audit findings.
Vlog Opening also reads `context.projectName` in its current source and remains
a subsequent metadata-source repair target, not a completed migration here.
