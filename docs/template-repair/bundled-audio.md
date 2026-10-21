# Stable bundled music sources

Four Photo Reveal 0.5.11 and Four Photo Stop Motion 0.1.8 use one new cohesive
bundled-Audio feature, registered only for these two consumers. Existing native
Image authoring/input and run modules keep their ownership and consumers.
Atomic file replacement, host transport and Project import are reused from
their existing canonical implementations. No client SDK or binary capability
is added. No.14 retains the prerequisite SDK dependency from client PR #7828.
Chan's apps, template packs and excluded compatibility production code are
unchanged. Neither template nor the 28-template objective is complete.

The former code imported music directly from installation paths and reused it
by path (Stop Motion also accepted a matching filename suffix elsewhere).
Deleting/replacing that installation could invalidate or change the file an
existing Draft referenced. Stop Motion did not inspect addedResourceIds and
could label a skipped import as still preparing. Its music lookup also paged
the entire Project out of the SDK rather than filtering before serialization.

The new module validates/read-bounds the installed bytes, identifies them by
SHA-256 and atomically publishes a verified plugin-data copy. Both templates
import/reuse that exact data path and independently confirm Project identity,
Audio type and full duration. Different bytes get different paths; existing
content files are retained. The old suffix helper is removed from Stop Motion.
The music inventory returns at most two matches per request. Cancellation
prevents later publication/import; lost import replies and a concurrent import
are observed, never blindly resubmitted. The black pause, effect recipe, Image
order and music time origin are unchanged.

TDD began with all 24 consumer behavior cases failing. Four recovery cases and
four bounded-read cases and one missing-owner case then failed before their
respective fixes. All 41 feature cases and the broader 593-case regression
suite pass. Python: 285 pass, 6 skipped. Coverage
includes source/install deletion, same-size changes, corrupt data repair,
unknown/skipped import, lost acknowledgment, concurrent ownership, cancellation,
Windows Unicode/quoted paths and 4,000 unrelated Project files. The two callers
use the actual serialized SDK inventory/import scripts; No.14 tests continue
through complete Image authoring. Existing canonical-client tests verify the
atomic file implementation that this feature composes.

This only stabilizes new bundled-music operations. Previously saved installation
references are not migrated, and no old run is replayed. Four Photo Stop Motion
still has pending Image file preflight, multi-commit creation, durable-run and
other audit work. Installed-app/Windows, real persistence/readback, full AV
playback/export, media content and changed-input/reference comparisons remain
required. No merge, catalog publication or installation is performed here.
