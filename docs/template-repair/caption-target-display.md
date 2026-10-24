# Caption target display and observation ownership

C02 needed the Apps panel's actual target to remain clear when the person
switches Draft or Project. This consumer-only change affects Jude and Depth;
DOAC has a separate fix and Chris remains with its existing owner.

## Jude

The metadata effect used a shared `mounted` flag. After switching from A to B,
B made that flag true again, allowing A's late response to replace B's name,
analysis state and already-styled state. The whole production React component
reproduced B becoming A and its action changing to Analyze transcript & apply.

Metadata reads now verify the Draft belongs to the captured Project before
reading its details. The display carries the Project/Draft key and host SDK;
another target hides the old name immediately. Per-effect liveness prevents
old success and failure responses from updating the new view. Project and
current Draft names are explicit, and a running operation retains its own
captured source label separately from the current view.

The run's controller identity and captured target guard progress, errors,
result display, navigation and completion ownership. A scope cleanup only
aborts the observer captured in that scope; it does not address another
Project's native or AI job. The owning completion alone releases its busy
state. File-path discovery also rejects responses after effect disposal.

## Depth

The existing Project:Draft React key remounts the editor and keeps recovery
and jobs in that scope. That structure and its Project ownership check remain.
The readonly Draft metadata now carries its Project title. Explicit Project,
current Draft and busy-source labels distinguish the target. Lookup failure
shows unavailable guidance alongside the existing detailed error. Per-effect
liveness and matching host/context prevent stale name snapshots after changes.

## Validation and remaining gate

`tests/caption_target_display.test.mjs` loads whole production panels with real
React. Host metadata/storage and expensive generation are controlled; there
are no app, AI, rendering or native calls. Ten tests cover late success/error,
Project changes, missing metadata, unmount with zero state writes, an operation
finishing after focus changed, separate captured/current labels, and ownership
checks before reading a foreign Draft. The old source fails both the Jude race
and Depth Project-label assertions; the updated source passes.

All 52 focused, face-clearance, source-clock, sprite, Depth platform, music and
host/update-guard tests pass with existing dependencies; no skips. Public source
checks and whitespace checks pass. Comparing top-level function source bytes
shows only Jude `readOpenDraft`/`StylePanel` and Depth `depthReadScript`/
`DepthEditorReady` changed; the other 58 Jude and 79 Depth functions are exact.
Face, layout, generation and rendering algorithms remain unchanged. C18's card
transition is intentionally still open.

The parent must still physically inspect the updated panels across same-Project
Draft A/B, different Project, no Draft and failed-read states. Controlled React
results do not substitute for that UI acceptance, nor for existing saved/exported
caption-output quality checks.
