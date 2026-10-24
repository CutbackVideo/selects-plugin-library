# Generalize the existing asset feature without adding a module

> Current SDK-free decision: [sdk-free-compatibility.md](sdk-free-compatibility.md) supersedes the pending SDK/app prerequisites below. Historical code and validation records are preserved; they do not establish current installed-app acceptance.


This checkpoint extends draft #279 and keeps the complete 28-template objective
active. No template is complete. No.14 0.5.12 and Stop Motion 0.1.11 retain the
Audio compatibility interface; Polaroid 0.1.9 uses the generalized PNG/M4A feature.

Against unchanged prior Polaroid source, 30/33 preparation cases failed and three
controls passed. Regressions cover missing WebCrypto, same-session cache damage,
overwritten update paths, bounded allocation, malformed manifest/source,
cancellation, skipped/lost/contradictory replies, identity/type/size ambiguity,
Audio duration and public/private diagnostics. Later failing cases exposed
NFC/NFD source spelling and incomplete returned paths. Two Audio controls
preserve existing POSIX exact-path behavior.

Extend `bundled-audio` into `bundled-assets`, keeping one publication/import
implementation. Reuse canonical atomic files, verify hashes/counts on every
invocation and retain earlier content paths. Return at most two Project matches,
preserve observed paths and perform at most one import per asset. Lost/empty
responses are resolved from state; unknown or contradictory state cannot succeed
or trigger a retry. Detachment prevents later work without claiming rollback.

The retired private unpack helper's PNG/M4A/header/hash, damaged-copy and bad
source assertions move to compiled active-preparation tests. This removes the
unsafe seen cache and delete-before-rename path rather than testing dead code.
Existing Audio wrappers retain IDs, MP3 paths, SDK summaries and error codes;
their path-equivalence rule does not silently change.

The plan's existing 10-fps bound now has one named constant. Minimum prepared
music is reference seconds plus half a frame at that bound (13.966667 s), covering
every supported rounded plan. The unchanged bundled M4A measures 14.527007 s via
ffprobe. Cut timing, look, frame/zoom/caption code and bundled bytes are preserved.

Full regression/compiler/Python/source/package/generated-copy/pre-push results
are recorded with the PR checkpoint. CI explicitly runs the compiled asset suite.
The related suite passes 836 tests without skips using TypeScript 5.8.3 and
prerequisite SDK declarations. The exact new CI asset/Audio/source step passes
135 cases with TypeScript 5.9 and installed/absent SDK declaration coverage.
Python discovery passes 285 with six skips. Counts overlap and are not additive.
The registry remains five modules across nine consumers; three use this feature.
No SDK surface, runtime loader, renderer IPC or Electron capability is added.

Byte/metadata checks do not prove full decoding or semantic AV quality. Source
and cache re-reads replace an unsafe shortcut with bounded work; they are not a
file lock or multi-resource transaction. A good frame/resource may remain when
a later music step fails; independent operations are not a distributed lock.
Historical paths are not migrated or deleted. Polaroid still needs complete-save
and durable-run migration, then full persisted properties/Inspector, installed
app/Windows, whole AV/export and reference-versus-changed-input validation.
Existing SDK #7828 prerequisites remain for No.14/Stop Motion. No merge, deploy
or installation; Chan excluded.
