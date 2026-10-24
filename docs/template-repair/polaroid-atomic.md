# Complete Polaroid working-copy authoring

> Current SDK-free decision: [sdk-free-compatibility.md](sdk-free-compatibility.md) supersedes the pending SDK/app prerequisites below. Historical code and validation records are preserved; they do not establish current installed-app acceptance.


Polaroid Photo Dump combines 17 ordered original Images, one bundled transparent
frame, per-photo focus/film grade, a shared-clock zoom, an editable caption and
one bundled music clip. Keep its 835-frame/60-fps reference plan, source TSX,
parameters, native Image placement and bundled asset bytes.

The preceding create path committed an empty seed, then photo placement, then
finishing. A failed effect left two partial saves. The pre-save callback was not
awaited, observers received the empty Draft, and there was no independent saved
result verification.

Reuse `native-image-authoring` for the complete working copy. The template's
trusted finish function accepts that handle, applies the existing recipe, checks
expected graphics/transforms/Audio/program receipts, enforces the existing
receipt budget, and owns the sole commit. Newly created Drafts can acknowledge
with only `createdDraftId`. Await the observer after acknowledgment, then query
persisted state separately; never replay a save to resolve a readback error.
An ended pre-save or dispatch callback cannot start authoring. A known late save
may still be reported without another write.

The explicit legacy finish/placement entry points keep their individual contracts.
An empty legacy seed can continue at its own fps, while a manual graphic or any
other nonempty visual content prevents continuation. Original availability is
checked before asset work, with the generated frame afterward, and again inside
the working copy. The fps probe remains unsaved.

TDD: unchanged prior source failed 16 of the initial 18 cases (two controls).
Ten more missing-capability/ignored-mutation/stale-dispatch checks failed there.
The final 30-case suite includes actual whole-panel compilation/minification,
the real bundled PNG/M4A byte preparation with simulated SDK state, repeated
photo choices/focus/grade, 10/25/fractional/60/120 fps, lost commit acknowledgments,
new-Draft receipts, legacy seeds and separate persisted readback. Regression,
compiler, source/package and pre-push results accompany the PR checkpoint.
The complete final suite against unchanged preceding source fails 28/30 with
two controls. Related regression passes 866 without skips; the expanded exact
CI authoring step passes 83 with TypeScript 5.9, including SDK-declared and
SDK-absent script checks. Python discovery passes 285 with six skips. Counts
overlap. A separate seven-case probe uses the prerequisite actual SDK, renderer
bridge and Storyboard with 120-fps source Audio at the reference's rounded
10/25/fractional/30/60/120-fps Draft durations. It confirms source timing without
any repository save; it does not exercise an installed app or media decoding.

The pool stays at five modules across nine consumers. No shared implementation,
SDK surface, client IPC or runtime import loader changes. The fourth Image
authoring consumer reuses the existing template-run receipt formatter; durable
app-run claim/recovery migration is a separate next step and still required.
Polaroid now shares the existing client #7828 Audio source-timing prerequisite.
Missing host reads refuse the save. Do not publish before the SDK rollout.

This checkpoint does not prove an installed host, actual Windows, all persisted
Inspector properties, track compositing order, complete playback/export or
reference-versus-changed-input visual/audio quality. Asset imports may remain
after an authoring failure. No merge, deploy or install; Chan is excluded and
the complete 28-template repair goal remains active.
