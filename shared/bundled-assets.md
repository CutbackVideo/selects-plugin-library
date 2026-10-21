# Verified bundled asset preparation

This is the former bundled-Audio feature extended for PNG Images and encoded
M4A music. One implementation serves No.14, Four Photo Stop Motion and Polaroid
Photo Dump. The pool still has five registered modules. `panel-modules.json`
embeds the source into independent panels; no runtime shared-file loader or
cross-plugin installation dependency is introduced.

`prepareBundledAsset` receives SDK, canonical async files, pinned Project/plugin
IDs, installed path, Resource type/extension, binary/base64 encoding, explicit
platform/path comparison policy, expected Image dimensions or minimum Audio
duration, and run liveness. Base64 requires decoded byte count and SHA-256.
Supported extensions are PNG for Image and MP3/M4A/WAV for Audio.

Stat precedes allocation. Decoded data is bounded to 1 byte--32 MiB; encoded text
is bounded by expected size plus ordinary whitespace overhead. Validate text,
decoded count and digest. Missing WebCrypto stops preparation, with no
length-only fallback. Re-read installed bytes after publication. Publish through
the existing canonical atomic `writeFile` to
`.selects/plugin-data/<plugin>/assets/<sha256>.<extension>`. Verify cache bytes
every invocation; repair corruption, avoid loading oversized bad cache data,
and preserve earlier content paths after updates. No seen-cache bypass or new
chunk/rename/delete-before-rename implementation.

The serialized Project reader returns at most two matching Resource/source-file
facts, stopping at ambiguity. Verify exact type and complete Audio duration or
positive native Image size, including intended dimensions when supplied. Return
the observed registered path so the next Image check uses its exact spelling.
Windows compares separators/case. Unicode normalization is explicit: Polaroid
retains NFC; the Audio compatibility entry retains its previous POSIX exact-path
rule. These lookup policies do not attest filesystem ownership or symlinks.

At most one import per asset/invocation. Read state after dispatch, including
lost replies or a concurrent writer. Confirmed state may satisfy an empty
acknowledgment; contradictory positive IDs are refused. No match plus empty IDs
is `SKIPPED`; other unconfirmed outcomes remain `IMPORT_UNKNOWN`. Never describe
these as still preparing or resubmit automatically. Wrong-type/dimension and
ambiguous matches are not replaced by imports. Stable `BUNDLED_ASSET_*` errors
keep private causes out of safe public messages. The MP3 wrapper retains
`BUNDLED_AUDIO_*`, SDK summaries, content paths and `{resourceId}` results.

Liveness is checked around reads/hashes, publication and Project work. Already
dispatched writes/imports may finish; detachment stops later stages, not rollback.
File publication and Project registration are separate effects. Independent
operations are not a distributed import lock.

Polaroid reads its manifest within 64 KiB and validates exactly frame/music,
safe names, hashes and byte counts before publication. Its frame must be
1080x1920. Its music covers all supported 10--120 fps rounded plans: reference
seconds plus half a frame at the minimum fps (13.966667 s). Unchanged bundled
M4A bytes measure 14.527007 s via ffprobe. This bound is template-owned.

The unsafe private `unpackBundled`/`unpackAssets` implementation is retired;
compiled active-path tests retain decoded PNG/M4A/header/hash, corrupt-copy and
bad-source checks. Historical fixed/installation paths are not migrated or
deleted. Full decoding, installed-app/Windows, whole AV/Inspector/export and
reference quality remain unverified. Polaroid still needs complete-save/durable
run migration; existing No.14/Stop Motion lifecycle and SDK prerequisites remain.
