# Gallery staging ownership after a lost file reply

Photo Grid Reveal 0.3.20 repairs reservation ownership in the existing
`shared/bundled-assets.js::prepareDerivedAsset` feature. The pool stays at five
features and ten consumers. The 28-template objective remains active; Chan's
apps and template packs are excluded.

## Failure and RED baseline

The previous owner created an empty private staging file exclusively, then
added its path to the cleanup set only after receiving a successful response.
Creation could finish while its response was lost or clipped. The owner then
rejected without recognizing or removing its own physical file. An exclusive
creation acknowledgement also did not prove that the same file was still there
when the next operation ran.

Against exact parent `ee05021e5aa29ef5f779ea73e4cc3b78aba3165b`, the initial ten
real-file cases fail seven and retain three controls. They execute ordinary and
minified Gallery code over the canonical local file client and FFmpeg. The
controls retain occupied empty/nonempty files and the old append-producer
contract. The expanded suite has nineteen cases.

## One owner, positive observations, no mutation replay

1. Reserve each random private source/output path once with exclusive creation.
   Its bounded JSON marker contains the invocation owner, a distinct per-file
   token and the source/output role.
2. Independently observe the exact marker using stat, a bounded `readRange`,
   and stat again. Refuse files larger than 1024 bytes, short reads, changed
   metadata and invalid UTF-8. A lost response alone cannot establish failure;
   the complete exact marker establishes this invocation's reservation.
3. Consume that exact marker once using the existing `compareAndReplace` API,
   then independently confirm an empty file. Existing producers still receive
   an empty reserved output. Neither creation nor replacement is retried when
   the reply is lost.
4. Exclude a path from cleanup while marker consumption has an unknown outcome.
   If the original operation is still pending, cleanup must not race its later
   rename. A positive empty observation returns it to the owned cleanup set.
   Cancellation after marker ownership is established still removes that
   confirmed reservation through the existing cleanup path.

An occupied foreign path, partial marker, unstable observation or unconfirmed
clear stops with an explicit reservation-unknown error. Unknown paths are
retained for inspection. No age-based takeover or automatic deletion is added.
Published objects, cache keys/index format, source identities and older Draft
references keep their previous contracts. The previous late-cancellation fence
is preserved.

This uses existing canonical file-client `readRange` and `compareAndReplace`,
already required by Gallery's durable-run owner. There is no public SDK, IPC,
host capability or Electron version change. SDK compare-and-replace serializes
same-path writes within one renderer; it is not a global lock against other
renderers or external programs. Exclusive creation and private random paths
remain the cross-window reservation mechanism. Readback cannot establish safety
against arbitrary external replacement after the observation.

Gallery's panel and authoring script are rebuilt. No.14, Stop Motion and
Polaroid receive synchronized helper definitions; their active asset paths are
unchanged. No additional production feature module is introduced.

## Verification and boundaries

The nineteen focused cases cover lost source/output creation and clear replies,
cancellation, foreign replacement, occupied empty/nonempty paths, partial
markers, delayed unsettled replacement, oversized/growing files, acknowledged
no-op replacement and the legacy append producer. They preserve the bounded
read and no-replay assertions. The large-source test still forbids reading
source media into browser buffers; it permits only the bounded ownership marker
reads added by this protocol.

An isolated macOS development app at client
`0e4f7a595095e826acfd8aa7d2edcaa507210ffe` also executes six file-owner scenarios
through its actual SDK and the canonical local client. A generated local MP4 is
used; no Project/Resource/Draft operation is invoked. Actual file mutation
responses are hidden only after the SDK completes the mutation.

| Scenario | Independently observed result |
| --- | --- |
| Exact parent, lost source-creation reply | Rejects; one physical source reservation remains |
| Fixed, lost source-creation reply | Completes once; no stages; exact output bytes |
| Fixed, clipped output-creation reply | Completes once; no stages; exact output bytes |
| Fixed, lost source-clear reply | Completes once; no stages; exact output bytes |
| Fixed, foreign source collision | Explicit unknown; no producer; foreign bytes retained |
| Fixed, ordinary append producer | Receives empty output; completes once; exact output bytes |

Each positive fixed case performs exactly two exclusive creations and two
marker consumptions, one per private path. The tested shared owner and local
client hashes match the final source. These are direct shared-file-owner SDK
tests with a local producer, not a full installed-panel flow or actual Windows
execution. The older native playback/export evidence remains tied to its
recorded template/client versions.

The final related run passes 831 tests across 31 files, with no skips, including
the existing consumers and generated-script type checks. Python runs 299 cases
(293 pass, six existing skips). Public-source, package, and five-feature /
ten-consumer sync checks pass. Counts overlap and are not additive. The broader
run exposed legacy hold/tempo/React test fixtures missing these existing SDK
operations; the real-file fixtures now share bounded-read/exact-replace methods,
and the React fixture preserves exclusive creation. Existing media/frame/BPM
assertions are retained, not relaxed. Installed obsolete SDK declarations are
not modified; type checks use the actual prerequisite SDK declarations.

Open: crash recovery, file operations still running after an observation ends,
best-effort cleanup failures, safe garbage collection, and other bounded-reader
races. The shared generic asset reader still needs its own stat/read growth-race
audit. Installed-app cancellation, actual Windows, full AV/reference and
changed-input acceptance remain separate gates. No template is declared complete.
