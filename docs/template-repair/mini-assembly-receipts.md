# Mini: owned assembly receipts instead of name recovery

Scope: Mini `0.1.0-alpha.19`, based on #317 /
`15b1b16cc865916f817ad46ace91d8d32940e3f6`. Chan apps remain excluded. No module
is added: extend and reuse `template-run`. The registry remains seven features /
twelve consumers; complete ownership and whole-template acceptance remain **0/28**.

## Root cause and behavior

The actual Build callback accepted the first recent Draft with a matching name
after losing its save response, then ran title/look against that ID. A same-name
control reproduced adoption and decoration of an unrelated Draft. A name, count
or recent creation time is not proof of run ownership.

Both Mini entries now use the existing exclusive run claim and conditional
Main-side receipt. Bind plugin, Project/library, run ID, content config and source.
Freeze the request before awaits. Draft display names are not identity. SDK
capability and pre-save state/budget checks occur before save. Read the created
Draft back in the same invocation and publish its owned receipt before reply.
Confirm saved Main source/routing/rate/transform/audio facts independently before
adoption; preserve changed or unrelated Drafts. An unconfirmed call never resends
a save. Positive `notSaved` and `outcomeUnknown` remain distinct.

The panel retains an uncertain attempt and its original source, plan and native
facts across Project switches in that realm. Its primary action becomes “Check
saved Draft”; confirmation uses that attempt rather than redoing planning/music
or accepting changed controls. A hidden invocation uses its app-supplied run ID.
The old name lookup and unused name/empty-result strings/constants are removed. A current Project alone does not revive an older execution generation.
All ten existing locales receive the new action label.

## TDD and consumers

Start with the real Build callback: the unrelated same-name ID reached decoration.
Then verify normal ownership, lost replies, changed inputs/library, concurrent
owners, late Main completion and exact original attempt reuse. Additional RED
cases cover source/transform edits under the same clip ID, regenerated display
names, invalid nonfinite SDK observations, and a representable-state budget that previously failed only after saving.
The budget case now proves the specific no-save receipt and zero commits.

Seventeen receipt cases include real Mini assembly scripts and emitted-request
checks with actual SDK declarations, plus minified serialization. Existing music
fixtures explicitly stop before assembly effects; the dedicated receipt fixture
runs the actual assembly and canonical owner. Legacy spelling checks now require
owned dispatch and absence of name recovery instead of enforcing the old defect.

The shared core's image consumers are synchronized. Regenerate Gallery No2's
compiled panel/authoring module for the positive no-save outcome change. The
related fourteen-file suite includes all prior four photo-template run consumers,
Gallery recovery and file-state tests, and Mini/media/input callers.

## Actual SDK evidence

Use the existing isolated 64-photo Project and real canonical local-file client,
renderer scaffold ownership method, Mini assembly script, Main readback methods
and conditional receipt writes. Create a same-name control and an owned result.
Drop the owned save reply after the SDK saved its receipt. Recover exactly that
owned Draft; repeat confirmation with a regenerated display name. There is one
assembly dispatch per owner, with no additional save for the lost/repeated reply.
The same-name control retains exact metadata and all clips. Project resources and
source files, the earlier reproduction Project and all 64 original hashes remain
unchanged.

Three independent saved-Draft proof rounds are retained: initial ownership,
display-name policy, then final pre-save hook/state checks. Each creates exactly
two test Drafts under its recorded distinct scope IDs (six total), with no new
Project or import. No previous run record is deleted or rewritten to force a
rerun. The final numeric/type guard is also revalidated against the same recorded owners after a real Electron restart, with zero new assembly dispatches or Drafts. Its source hashes match the final owner and assembly.
These are real assembly/save/readback checks, not installed PanelHost UI, title/
look completion, playback/export or Windows acceptance.

Each Electron launch first verifies the old task process tree, owned ports and
runtime app bundle are gone. Use the existing isolated profile with --keep-data
and verify its exact Vite/CDP URL. After SDK checks shut down the owned daemon
and verify descendant/port/runtime bundle removal, preserving persistent data,
media, Drafts, journals and evidence.

## Still required

The original alpha.19 checkpoint lacked standalone realm-remount discovery.
Alpha.20 adds it through the same run owner; see `mini-pending-discovery.md`.
Title/look and Finish need their own phase ownership/readback and partial-failure
review. A hidden remount whose newly computed assembly content differs is rejected
rather than silently adopting a different plan. Original-file content guarantees,
analysis execution/cancellation, other-track semantics and full end-to-end
acceptance are still open. This checkpoint does not complete Mini or the 28-template
feature ledger.
