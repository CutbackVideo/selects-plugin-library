# Bound asset reads to the original size observation

The existing bundled-assets reader is shared by No.14, Stop Motion, Polaroid
and Gallery. It reads installed binary/base64 assets, Polaroid's manifest,
verified data copies and Gallery's derived-cache index. Hash verification,
Project Resource lookup/import and cache publication remain with their existing
owners. This repair changes that reader rather than introducing a parallel
file feature. The pool remains five features / ten consumers; Chan is excluded.

## Reproduced cause

`readBundledAssetBytes` checked a file's size against its caller's limit, then
called the canonical local client's `readFile`. That client independently
looked up the size again and read that many bytes. A file growing between the
two observations expanded the transport/allocation budget before the outer
reader could reject it. If the file changed after the inner size lookup, the
outer check compared only byte length and could accept an old prefix or a
same-sized replacement.

The RED suite executes real disposable files through the unchanged canonical
local client and ordinary/minified shared-reader code. Against exact parent
`dca0f6a60fc19cd51e1213264cf83ee5efed6ee6`, ten of sixteen cases fail, with six
controls retained. This is not ten independently reported template defects.
The size-growth case has a 65,536-byte budget but requests 2,162,688 bytes.
The during-read growth and same-size replacement cases can return success.
Some additional RED cases enforce existing view/cancellation/error contracts.

## Shared repair and retained contracts

The reader freezes the first valid size as its budget and calls the existing
`files.readRange(path, 0, size)` once. The canonical transport still owns
48-KiB chunking and response validation. A second stat after the read compares
size, modification time and inode with the first observation. A short/invalid
view, missing file, directory or changed observation cannot return success.
Liveness is checked after both metadata replies and the bounded read.

Successful results remain independent Uint8Array copies, including for DataView
and subarray input. Existing BYTES/CHANGED/STOPPED codes and the Audio wrapper's
code mapping remain in place. Missing bounded-read support is an explicit
UNSUPPORTED result; there is no whole-file fallback. Manifest size limits,
base64 decoding limits, byte counts, SHA-256 verification, content-addressed
data paths, import-once observation and older Draft assets are preserved.

The helper is an observation protocol, not an atomic filesystem snapshot or a
global lock. Metadata equality cannot rule out every in-place change whose
facts are restored. Existing pinned content verification and source rechecks
remain necessary. This does not alter the separate streaming-video hash/encode
path or claim a total browser heap ceiling: transport parts, decoded data and
independent copies also occupy memory. It bounds bytes requested by this reader.

All four active bundled-asset consumers are regenerated and receive patch
versions: Gallery 0.3.21, No.14 0.5.15, Stop Motion 0.1.14 and Polaroid 0.1.13.
Their timeline designs, inputs and outputs do not change. Existing asynchronous
file clients already expose readRange, and these consumers' durable-run/input
checks already use it. No new public SDK, IPC, host capability, Electron version
or new client implementation is introduced.

## Validation

Sixteen focused cases cover growth before/during transport, same-size replacement,
healthy exact-limit files in ordinary/minified builds, short reads, disappearance,
cancellation at the final metadata reply, empty/oversized inputs, missing bounded
support, no whole-file fallback and independent byte views. All sixteen pass.

The related suite passes 847 cases across 32 files with no skips, including
the four consumers, asset bytes/imports, saved authoring/run receipts, Gallery
held-video/tempo/cache/lifetime/ownership and generated SDK type checks. Two
legacy asset fixtures gain the existing bounded file API. The oversized Audio
tests now instrument readRange, keeping their no-read-before-repair assertions
effective. The final focused reader/Audio run passes 60 cases. These counts
overlap and must not be added. Python runs 299 cases (293 pass, six existing
skips); public-source, package and five-feature/ten-consumer sync checks pass.
Normal pre-push validates all 28 audited templates.

An isolated macOS development app also executes seven scenarios through its
actual SDK and the canonical local client. Read-only SDK requests operate on
new local fixture files; deliberate fixture growth/replacement/deletion is
performed only in that disposable directory. No Project/Resource/Draft mutation
is called. Source snapshots and hashes identify the tested shared reader and
unchanged local client; the application source is
`0e4f7a595095e826acfd8aa7d2edcaa507210ffe`.

| Scenario | Actual SDK observation |
| --- | --- |
| Parent, grows after the first stat | Rejects only after requesting 2,162,688 bytes |
| Fixed, same growth | Requests 65,536 bytes, then CHANGED |
| Parent, grows during transport | Incorrectly returns the old 65,536-byte prefix |
| Fixed, same growth | Requests 65,536 bytes, then CHANGED |
| Fixed, same-size replacement | Requests 65,536 bytes, then CHANGED |
| Fixed, disappears after read | Requests 65,536 bytes, then CHANGED |
| Fixed, healthy exact-limit input | Exact expected bytes/hash; 65,536 bytes requested |

These are direct shared-reader SDK results, not whole installed-panel playback,
actual Windows or full reference/changed-input acceptance. The earlier rendering
and export evidence retains its own source/version identity. Crash/unknown file
operation reconciliation, cleanup failures/GC, installed/platform/AV quality
and the remaining 28-template gates stay open. No template is declared complete.
