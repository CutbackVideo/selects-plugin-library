# Durable Polaroid app-run ownership and recovery

> Current SDK-free decision: [sdk-free-compatibility.md](sdk-free-compatibility.md) supersedes the pending SDK/app prerequisites below. Historical code and validation records are preserved; they do not establish current installed-app acceptance.


Polaroid keeps its 17 ordered original photos, frame, zoom/grade, caption and
music recipe. Its preceding single-commit implementation still guarded app
runs only with a component-local ref. A fresh panel realm lost that state and
could author another Draft; separate realms could author concurrently. The
in-flight liveness check also omitted Project/library changes under one run ID.

Reuse the existing `executeTemplateRun` feature before selected-media/asset
preparation. Pin plugin/library/Project/run and normalized ordered IDs/kinds plus
effective default framing/caption/grade. Pass its exclusive claim and dispatch
callback into complete authoring. The SDK writes the result receipt before its
reply. Recovery independently verifies the existing persisted Draft; changed
requests, corrupt/unreadable/oversized records, active/unknown outcomes, manual
edits or missing legacy evidence never cause an authoring replay. Display-name
changes do not change effective inputs. Only an explicit new run starts a retry
or revision. Liveness now pins the same run/Project/library at every continuation.

The shared feature additionally checks callable hashing and text codecs before
claiming/reading. Some preceding consumers could save despite a missing decoder,
leaving a record they could not subsequently read. UUID and SDK file-write
functions are checked only for a new claim: saved read-only recovery preserves
its existing contract without unused claim capabilities. SDK property presence
is not callable support. The schema, request hashing and receipt format remain
unchanged for the other three consumers. No new module, SDK or IPC is added.

TDD: the initial Polaroid 23-case suite failed 22 with one control against the
unchanged preceding source. Another 24 missing/invalid crypto-codec checks and
eight noncallable SDK-file checks failed across all four consumers before their
shared fixes. A further four-case failing control protected read-only recovery
from an unnecessarily early UUID requirement during development. Existing and
new suites cover concurrent realms, remounts, lost claim/authoring/commit replies,
late results after unmount, failed record writes, manual edits, missing legacy
evidence, original input names, real minification, source-script budgets and
separate canonical local clients on a real disposable filesystem.

Related regression passes 930 without skips. The exact durable-run CI step
passes 131 with TypeScript 5.9; the broader run uses TypeScript 5.8.3 and the
prerequisite SDK declarations. Python discovery passes 285 with six skips.
Generated-copy checks cover five modules/nine consumers and four scoped local
clients. Public source and all 48 packages pass; counts overlap and are not
additive. The normal pre-push gate and live CI status accompany the checkpoint.

The pool remains five modules across nine consumers. No media bytes, cut plan,
effects, caption settings or Audio recipe change. Local unit/compiled-component
evidence is separate from installed-app/actual Windows, persistence/Inspector,
whole AV/playback/export and reference-versus-changed-input acceptance. Existing
client #7828 SDK rollout is still required before publication. File claims and
Draft persistence are not one transaction or a distributed cross-machine lock;
already dispatched work may finish after detachment. No merge, deploy, install
or user-data rewrite. Chan remains excluded and the 28-template goal stays active.
