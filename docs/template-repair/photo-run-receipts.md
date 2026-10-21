# Photo template run recovery checkpoint

First consumers: Four Photo Reveal 0.5.4 and Camera Shutter Dump 0.1.11.
This follows the complete-working-copy save checkpoint; neither template nor the
full 28-template repair goal is complete. Chan's apps remain excluded.

## Failure evidence and repair

The real compiled template entry points saved twice after remounting the same
run: both initial tests failed with two commits instead of one. Each mount uses
a new VM/panel realm, so module globals and React refs cannot hide the failure.
No.14 passed first after extracting durable run ownership; Camera then passed
with the same registered source. Further RED/GREEN cases reproduced stale
Project ownership immediately before dispatch, duplicate/omitted saved Image
receipts, and reading an oversized journal before checking its size.

`shared/template-run.js` composes the existing local file adapter with an
exclusive claim and a saved receipt written inside the authoring SDK script.
Normalized app Resource selections/choices and pinned Project/library/run IDs
form the contract. A new explicit app run can create a revision. A remount,
concurrent panel, lost transport reply or unconfirmed commit cannot implicitly
create another Draft. The existing template plans/effects and the complete
Image working-copy feature remain their own owners.

## Automated evidence

- 43 complete template-run cases include both compiled panels, fresh realms,
  concurrent ownership, lost complete-save/claim replies, close-before-reply,
  manual edits, changed inputs/target ownership, corrupt/unreadable/oversized
  records, known/unknown commits, failed receipt persistence, capability refusal,
  explicit new runs, real minification and SDK TypeScript/script budget checks.
- Two additional file/encoding cases reuse the real canonical local client with
  independent clients and actual temporary files/exclusive creation. Unicode
  receipt JSON round-trips without SDK browser globals. No user data is changed.
- The combined focused suite has 81 cases, including the previous 36 atomic
  authoring cases; the broader photo/reference/SDK suite has 229 cases. Counts
  overlap and must not be added together. CI results are reported separately.

These execute SDK scripts against a test host with persisted-state separation;
they are not proof of an installed app's save, rendering, AV playback or export.

## Remaining work

Unconfirmed writes remain explicitly pending; there is no automatic stale-claim
takeover or rollback. A saved Draft can outlive a failed journal write. Claims
and Draft commits are separate local operations, not a combined transaction.
Already issued SDK writes may outlive the panel. Project moves are checked at
boundaries but are not locked by the public SDK. The shared module contract
documents these limits and the explicit-new-run recovery policy.

Other audited photo defects (including Camera's Project-title source), complete
effect/graphic/audio readback, standalone action recovery, remaining template
migrations and all installed-app/full AV/export/platform gates remain open.
