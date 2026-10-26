# Gallery derived-file lifetime: late completion repair

Photo Grid Reveal 0.3.19 extends the existing bundled-assets feature. The module
pool remains five features and ten consumers; Chan's apps remain excluded and
the 28-template objective is still active.

## Reproduced contract failure

The derived-file owner checked liveness while copying, encoding, validating and
publishing, then returned from inside a `try` whose `finally` asynchronously
removed its private staging paths. If the owner detached during that cleanup,
the already selected successful result still reached the caller. The cached
path had a similar handoff boundary. Gallery also passed the liveness predicate
but omitted its explicit AbortSignal from the file owner: aborting during the
last source-stat response could still return `converted` after the media process
had finished.

The reproduction concerns the conversion helper's late success result. Gallery's
higher-level checks still own imports and the Draft commit. These tests do not
establish a Draft created after cancellation or a corrupt published file.

The first eight real-file cases fail seven against the parent and pass one
stable-request control. Expanded verification against the same exact parent
panel fails ten of twelve, retaining two controls: healthy reuse and preservation
of an earlier production error. Both ordinary and minified generated panels are
executed over the canonical local file client, disposable files and FFmpeg.

## Shared owner, then caller boundaries

`shared/bundled-assets.js::prepareDerivedAsset` accepts an optional AbortSignal
alongside its existing liveness predicate. Invalid signals are rejected before
filesystem mutation. The owner checks both signals after cache observation and
after all asynchronous cleanup, before returning success. A prior production
failure still propagates after cleanup; a late liveness check does not replace
it. Source hashes, exclusive staging reservations, immutable object names,
atomic index publication and media-process settlement retain their contracts.

Gallery passes the signal from both held-video and music-PCM preparation into
that owner. It also checks its live request at the conversion handoff and before
returning the aggregate result. This keeps the reusable file owner responsible
for its own completion boundary and the consumer responsible for its next step.
It introduces no new feature module, SDK method, IPC, binary capability or host
version requirement.

If cancellation happens after valid publication, the completed object and index
remain. The stopped invocation rejects; an explicitly new live request can reuse
the same verified object. Only the current invocation's reserved staging paths
are candidates for its existing cleanup. There is no rollback of published media,
automatic reencode, age-based takeover or deletion of previous Draft resources.

No.14, Stop Motion and Polaroid receive regenerated additive helper definitions;
their existing asset call paths remain unchanged. Their existing bundled-asset,
atomic-authoring, durable-run and local-client compatibility cases are included
in the related regression run. Gallery's generated panel and browser-side
authoring copy are rebuilt from the canonical sources.

## Tests and evidence boundaries

Twelve focused cases cover detachment/abort during cleanup, cancellation during
the final stat of new and cached results, old calls without a signal, already
aborted and malformed signals, stopping after the private copy, healthy cache
reuse, private-path cleanup and preservation of the original error. All twelve
pass after the repair. A four-file related held-video/tempo/media-tool run passes
71 cases. The final related run passes 812 cases across 30 files with no skips,
including the existing consumers and generated-script type checks. These counts
overlap and must not be added. Python runs 299 cases (293 pass, six existing
skips); public-source, package-file and five-module/ten-consumer checks pass.
Normal pre-push/remote publication evidence is recorded separately in the PR.

The initial broader run found one typecheck failure because it selected the
installed staging SDK declarations, which lack the prerequisite `files.fingerprint`
already required by Gallery 0.3.18. Verification uses the actual combined client
SDK declarations containing that method, not an `any` substitute or edits to the
installed SDK. The existing unsupported-SDK guards and source-check prerequisite
remain in place; this repair adds no new SDK requirement.

These are local source and real-file fault-injection results, not installed-app
window-close reproduction, actual Windows execution, whole playback/export or
original-reference/changed-input acceptance. The earlier rendering evidence is
separate. Safe crash recovery, lost filesystem replies, best-effort cleanup
failures and orphan/cache garbage collection remain unresolved. No age-based
garbage-collection policy is inferred or applied to user data.
