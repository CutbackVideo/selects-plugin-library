# Mini / Archive selected-file catalog ownership

Scope: Mini alpha.18 / Archive alpha.12, based on `784801502b675786e856587545846e0b161ad7b9` (#314). Chan apps excluded. Registry remains seven features / twelve consumers; full ownership review and whole-template acceptance remain **0/28**.

## Root cause and final flow

The selected-file entry used one direct unpaged catalog call even after the panel adopted `media-inventory`. It could proceed from a changed or incomplete source observation. Its separate existing `runTemplateStep` could also resend a catalog read after the run ended, request a fresh unlimited/default duration per attempt, or accept a late response. Private original-ID resolution remained single-dispatch and is a distinct responsibility.

Selected input now flows through original ID/alias resolution once, then the same bounded `readInventoryPages` collection/reobservation as the panel. Preserve the selected alias filter across raw Project pages. Selected builds request boolean `requireComplete: true`; confirmed partial lists remain supported for display by the default false policy. Reject incomplete catalog facts before planning, music publication or Draft operations. Unknown results never authorize replay of the private resolver.

Extend the existing runner with optional catalog scope, attempt-based source, owned retry waits, remaining seconds capped at 90 and checks before dispatch and after reply. Existing ordinary empty/session read retries remain bounded. Default unscoped request shapes remain unchanged. Committing calls neither consult catalog clocks/liveness nor replay an unconfirmed result. Catalog failures preserve a private cause and code with the existing localized step-failed message; cancellation preserves the caller's stopped signal.

Do not add another module. Extend the completeness policy in `media-inventory` and reuse the prior original-media, file/media lifetime and Worker owners. The existing general step runner still needs full execution-feature review with the remaining search/assembly/decoration paths; this checkpoint does not claim that all orchestration has been unified.

## TDD and compatibility

The first 20 actual-entry/runner cases fail 16 and pass four controls before repair. They execute the template entry through its real inventory script and runner, stopping at the explicit planning boundary. Separate original-ID resolution and asset fixtures do not stand in for their existing tests.

Final focused suite: 25 cases including selected aliases on a later raw page; changed metadata; source tree unavailable; caller detachment; session/empty retry after stop; deadline before retry and after reply; shrinking query timeout and regenerated attempt source; committing-call independence/non-replay; display partial-list compatibility and invalid completeness option before dispatch.

The related ten-file suite passes **287** cases. Both legacy panel checks, public-source checks, shipped-file checks, canonical module synchronization and Mini generated-operation checks pass. The existing Mini music/native fixture now models valid paged rows and the complete/incomplete response contract, instead of an unpaged transport mock. Its actual source/media/native tests remain in the related suite.

## Actual SDK evidence and limits

Twelve read scenarios execute the actual selected-template entry through inventory against an existing isolated Project of 64 unchanged PNG originals. A scoped read-only SDK view models a prior-page name change or an unavailable source tree. Both parents reach planning after one read. Both repairs reject changed data (`MEDIA_INVENTORY_CHANGED`) or stable partial facts (`MEDIA_INVENTORY_INCOMPLETE`); healthy selections on the first and later raw pages reach the planning boundary after four reads.

Original-ID resolution and bundled assets are stubbed at explicitly separate boundaries. This validates real SDK catalog responses and the selected-entry consumer, not a new original-UUID resolution test. Execution is a Node VM using the actual SDK transport, not installed PanelHost UI or full build/save/playback/export/Windows acceptance.

No new Project, import, Draft or committed query occurs. The reused Project and earlier reproduction Project retain exact metadata/resources/source-file snapshots, and all 64 original files retain their hashes. The first harness did not parse; the next failed because its proxy's zero-argument Project function was invalid for the SDK TypeScript call. Fix only the harness function signature and retain the failed evidence. The successful run verifies every scenario before recording success; no setup mutation is replayed.

Before launching Electron, verify old task processes, owned IPv4 port and runtime bundle are absent. Reuse the isolated persistent profile with `--keep-data`, verify the exact CDP renderer URL, and shut down the owned launcher after the SDK checks. Preserve other sessions, original media, Projects and evidence. Verify descendants, ports and runtime bundle removal separately.
