# Archive source-to-feature review and optional-photo repair

Review base: `ec44bb85f8a5afbdb1a6993bb2dfae697faf08b5` (PR #345).
Current package: Archive alpha.21. Parent is the sole editor; the three parallel
investigations were read-only. No app source, shared runtime module or other
template has changed in this packet. Chan remains excluded.

## Confirmed defect and repair

The chosen design requires **two distinct videos**, permits additional photos,
and limits the app handoff to 50 records. Existing two-video runtime admission is
preserved. Preparation still promised one video; its wording now matches the
selection hint and runtime policy.

More materially, the shipped inventory read knew native photo paths but omitted
them from its photo rows. The hidden template entry combines video and photo rows
into original-source bindings. Two videos plus a photo therefore failed with
`The selected source bindings are invalid.` before scene search or Audio import.
The previous music-boundary fixture supplied video rows only and missed this seam.

`scripts/inventory.js` now carries each photo's observed path, or explicit null
when unavailable. It does not guess from filenames, insert measurement Drafts or
weaken source checks. The existing `media-inventory` owner reobserves that projected
value; `native-image-input` checks its current Project link and complete bytes;
`template-run` retains the frozen bindings and content observations for recovery.
There is no new module. Standalone Build still independently verifies native photo
facts before composing its source bindings.

The new regression executes the actual hidden-entry callback, shipped inventory
projection, catalog reobservation and canonical path/content checks against fixture
Project APIs. Alias resolution, planning and image dimensions are supplied by the
fixture; photo bytes are a content-identity placeholder. Healthy input carries the
expected path/hash and declared 96x160 dimensions to the assembly-dispatch boundary.
Missing file/path and relinked photo stop before search, import or assembly.
Changed bytes block recovery before saved-state verification; restoring them permits
one verification request for the same frozen target, with no extra import/assembly.
Its saved-Draft response is mocked. No real mixed-Draft save or image decoding is
established. New tests first failed on the real path omission and old wording.

## Source coverage and decisions

[ownership/archive-vlog.json](ownership/archive-vlog.json) captures 52 source files:
all 32 shipped executable/test files, five operation build sources, ten canonical
shared sources and five repository regression/fixture sources. It also captures
21 exact-byte assets/contracts, including the package's gallery preview/poster.
The AST index covers 3,193 callable units, including 2,021 anonymous callbacks,
2,026 top-level statements and four embedded-program producers. These are source
counts, not counts of independent modules or features implemented by this patch.

There are 32 feature decisions: 16 template-specific, five reuse, nine existing-owner
extensions and two planned text-extraction entries sharing one prospective owner.
Of the nine extensions, scene observation, script dispatch and browser preview
remain planned migrations. The registry remains nine modules/fourteen partial
consumers. This map does not add a runtime module or finish that pool.

| Responsibility | Owner/decision | Policy retained by Archive |
| --- | --- | --- |
| Project catalog, current build permission | Reuse `media-inventory`; extend its observation contract for future scene admission | Video/Image projection, counters and polling UX |
| Original selection/kind/path/full content | Extend existing `native-image-input` | Two distinct videos, optional photos, handoff max50 |
| Local frame statistics and source-bound cache | Existing `clip-analysis` extension | Role scale, motion bonus, window choice and query strings |
| Source/native and Draft clocks, occurrence, Audio/program readback | Existing `native-image-authoring` extension | Cut/music offset, cover/trim and sound/fade design |
| Verified assets, PCM and beat-derived JSON | Existing `bundled-assets` extension | Track/section/default/fallback choices |
| Beat algorithm / Worker lifecycle | Reuse `audio-beat-analysis` / `analysis-worker` | Sampling policy and public UI state |
| Private SDK transport / app run guard | Reuse `local-client` / app guard; bootstrap/retry migration remains explicit | Localized error display |
| Saved assembly/Finish/recovery | Existing `template-run` extension | Freeze points, hidden defaults and new-seed action |
| Text mechanics/runtime checker | Two extraction entries, one planned `template-text` owner | Ten dictionaries and template wording stay local |
| Six render programs | Six explicit template-specific policies | Decode title, credit, look, reveal, photo motion and final fade |
| Browser music preview | Planned extension of existing bounded asset/lifetime owner | Whole-track seek and fade presentation; no speculative new module |
| Delivery, UI and validation | Explicit local composition/build/test responsibilities | Generated sources are checked against canonical owners |

Generated assembly/decorate/verifier helper ranges retain their canonical owners.
The pure planner, av-hook/config helpers, anonymous React callbacks, initializers,
Worker source, alias-check source and durable generated programs are included.
Render input units and their separate lifetimes are recorded per feature. In
particular title graphemes, credit display-width units and destination frame clocks
must not be collapsed into one convenient text/time helper.

## Remaining source findings and next order

Eight findings are linked to captured source: the preparation mismatch is
`fixed-source`, the mixed-photo defect is `fixed-fixture`, and six require further
reproduction/contract work. None promotes whole-template acceptance.

1. Browser preview: reproduce full-file byte budget, never-settling metadata and
   stop/unmount handler settlement, then extend the existing asset owner.
2. Scene observation: establish the actual backend analysis-generation identity
   and source-time contract. Preserve normal same-content relink and existing
   analysis reuse; see [archive-scene-provenance.md](archive-scene-provenance.md).
3. Renderer: changed-font Adjust, malformed metrics, concurrent SVG IDs and raw
   numeric boundaries need actual render tests. Preserve the six valid styles.
4. Bootstrap: verify configured install roots and concurrent client realms before
   consolidating legacy `hostSdk` wrappers into the existing client.

These are additional findings, not replacements for existing Mini/Archive repair
and recovery work. Auxiliary unshipped authoring tools (`build-fonts.sh`,
`rename-font.py`, render/drive adapters, cue builders and development fixtures) are
not claimed as a fully indexed developer-tool surface. They are not manifest
runtime dependencies of this package; external asset-generation provenance and
manual non-JS review remain explicit work.

## Verification boundary

Three new source/ownership checks and five mixed-input/recovery regressions are
added to CI. The existing ownership checker enforces exact source identity,
shipped asset/executable coverage, ranges, canonical owners and contracts. Its
result remains `coverageComplete:true`, `semanticReviewComplete:false` and
`templateAcceptanceComplete:false`.

The focused Node suite passed 292 cases. After the read-only review tightened
negative-error assertions and evidence wording, the eight new checks passed again.
All fifteen Archive CJS suites, including seven script checks against the actual
SDK declarations, passed; legacy photo row expectations were updated to retain the
now-required path or explicit null. Required Python tests ran299 with six existing
skips. Public/package, managed modules, app guard and operation/client generation
checks passed. Full remote CI remains a separate stage.

No Electron/server/port/profile/temp cleanup, app launch, user-data write, deployment
or installation was performed for this packet. Earlier native evidence and the
earlier task-profile initialization incident remain recorded in the existing
Archive packets; original lost validation Project IDs were not restored by this
source-level repair. Full semantic ownership and whole-template acceptance remain
**0/28**. Actual mixed-Draft save/playback/export and Windows are still open.
