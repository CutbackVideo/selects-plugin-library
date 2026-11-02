# Host file fingerprint migration

Original-media observations now use `selects.files.mediaFingerprint(path)` and
explicit `{path,size,scheme:"cutback.media-content.v2",digest}` records. The shared
serializable adapter defaults to full integrity and selects samples only when
its caller explicitly requests this scheme. It uses the existing client cache
algorithm: SHA-256 of ASCII `cutback.media-content.v2:<size>:` followed by the
256 KiB head, centered middle and tail; files up to 768 KiB are read whole.
Empty media is rejected. Host and fallback use identical offsets and bytes.

Fallback runs only when the selected API is absent or returns the exact legacy
`Unsupported file operation.` bridge response. Sample fallback issues reads no
larger than 49152 bytes and reads at most 768 KiB total. It preserves before/after
identity, size, modification-time and lifetime checks. Permissions, timeout,
changed files and malformed results do not trigger fallback.

Source receipts carry the scheme and digest through persistence and cache keys.
Existing three-key `{path,size,sha256}` receipts still select full hashing and
compare the original digest, allowing saved work to resume without invalidation.
Unknown or mixed schemes fail. Sampling deliberately cannot detect a mutation
outside its sampled regions; source identity must never be used as integrity.

`files.fingerprint` and the default `fingerprintTemplateFile` stay full SHA-256.
Durable state/guard files, generated outputs, content-addressed publication,
bundled assets and old receipts keep their complete-byte checks. Derived-media
preparation has separate source identification and full-output hashing paths.

## Consumers regenerated

- archive-vlog (panel and assembly script)
- mini-vlog (panel and assembly script)
- photo-gallery-no2 (panel and generated input facts)
- recap-2026
- a16z-style-captions
- camera-shutter-dump
- four-photo-stop-motion
- no14-still-video
- polaroid-photo-dump

The template delivery pipeline and the separate a16z build regenerate their
respective artifacts from shared owners. CI checks both generated outputs. The noble implementation, license
copy and build dependency are retained for the legacy-only path. Publication uses commit-based versions;
no manifest version or separate release is required. The catalog remains compatible with clients providing the legacy file APIs;
new clients automatically use native operations; old clients use identical bounded sampling for new source observations.

## Remaining hashes reviewed

Archive/Mini source selection and video scoring, Gallery selected-file/face guards,
and Recap face/manual guards use sampled source identities. Their shared adapters
also appear in the other generated consumers above. Music preparation and Gallery
hold/tempo derived caches retain existing full hashing where source and output
integrity remain coupled; Gallery uses native FFmpeg hashing, not guest SHA loops.
Host AI upload contracts are unchanged: sampled values are only local request
identities and never sent as full upload SHA-256 values.

Intentionally retained: browser WebCrypto for small request/recipe/cache keys
(`template-run`, `draft-observation`, AI job clients, clip analysis and panels),
bounded bundled-asset/base64 and PCM integrity checks, and browser audio matching
in Gongju Gallery. These use native WebCrypto outside the guest hash loop.
Native Node crypto in selects-ai-runtime model/runtime verification and build
scripts, plus Python hashlib in media preparation tools, already execute outside
the script VM and retain their integrity checks. These are not fallback paths.

Earlier SDK-free compatibility reports document the previous implementation;
this migration adds host-first hashing while retaining their legacy stat/readRange path.
