# Mini Vlog: preserve verified bundled music outside the installation

Mini Vlog 0.1.0-alpha.13 changes bundled-cue preparation in both its standalone
Build and Clip Highlights template entry. The source-resolution, inventory,
scene/local search, beat planner, assembly and decoration steps retain their
existing responsibilities. Own music keeps its exact selected-path operation;
No music performs no asset publication or Audio import.

## Reproduction and cause

The previous music operation confirmed an exact Project path, but that path was
inside the plugin installation. Deleting/replacing the installed cue could
remove/change bytes referenced by an earlier edited Draft. A repeat run reused
that same Resource even when the file's contents changed. The cue manifest
already recorded SHA-256 and timing facts, but runtime preparation did not
verify that the imported bytes matched the music used for planning.

The first thirteen regression cases execute the actual standalone nested Build
or template caller through the music/assembly boundary. They use the unchanged
canonical local client and disposable physical files. Exact parent
`b2512991c7fdbf608f9e104b3a1ac5b2cb45a3ee` fails twelve, retaining the own-music
control. These are contract scenarios, not twelve independent reported bugs.
Failures include installation deletion, changed cue generations, unverified
bytes, exact owned reuse and lost completed import replies. They reproduce
the remaining X12 ownership mechanism; they do not reproduce every historical
X12 customer environment.

## Reuse, boundaries and compatibility

Both entry points now use the existing `prepareBundledAsset` feature through
one small Mini-specific adapter. It validates the selected cue's filename,
byte count, SHA-256 and duration metadata, and supplies the planned music end
(section start + final cut + optional reference tail) as the required minimum
Audio length. The shared owner verifies bounded installed reads, SHA-256 and
the published data copy, then imports/independently confirms one exact Audio
path. The data filename is its content hash beneath
`.selects/plugin-data/mini-vlog/assets/`, separate from installation files.

The standalone Build freezes the selected cue's identity fields with its other
inputs. A changed installation cannot silently be paired with the old planning
manifest. A new valid generation receives a different path; earlier bytes remain.
Reusing identical bytes does not import another Audio. Lost completed import
replies are observed without replay. A corrupt owned copy is repaired from
the verified installed source before reuse. Project changes/unmounts stop the
preparation before a later import; the adapter preserves the caller's original
stale-run sentinel rather than converting it into a visible late error.

The existing module pool stays at five features / twelve consumers. Mini gains
an installed-panel copy of the same asset feature already used by the photo
templates; its generated own-music operation still uses the canonical SDK-safe
path reader. Registry/generation checks maintain that dependency. The shared
feature and all existing consumers' active code are unchanged. There is no new
SDK, IPC, Electron capability, host version or external service.

All seven shipped MP3 hashes and music/planning facts are unchanged. Their
manifest entries gain pinned byte counts, checked against actual files. The
existing cue builder records byte counts for new, kept and onset-updated cues.
Unverifiable old/incomplete manifests fail explicitly rather than bypassing
verification. Existing Drafts that already reference installation paths are not
migrated by this change. Published data files are retained for older Drafts;
this is not garbage collection or a global cross-window import lock.

## Validation

- First RED: 12 failures / 1 own-music control on the exact parent; first GREEN:
  all 13 pass. The expanded suite passes 31 cases, including unsafe/oversized
  manifest rows, changed data copies, cancellation, silence and actual SDK
  declaration checks for emitted Audio lookup/import scripts.
- Mini legacy tests, the existing Audio identity operation and Mini/Archive
  source resolution: 75 pass, no skips. The sixteen legacy files contain
  additional internal assertions, including all five operation type checks.
- Related bounded-reader, bundled asset/Audio and photo consumers: 284 pass,
  no skips. Python: 299 run, 293 pass and 6 existing skips. Public-source,
  package, operation-builder and shared-generation checks pass. Normal pre-push
  validates all 28 audited templates. Counts describe overlapping scopes and
  must not be added as a completion score.

Eight actual isolated macOS development-app SDK scenarios retain source/hash
snapshots. The parent operation imports an installation path that disappears
when that fixture file is removed. The fixed adapter imports a verified owned
MP3, keeps it after installation removal, reuses it without another import,
retains earlier generations, and confirms a completed import after a deliberately
lost response. Byte-count and same-size/hash mismatches stop before import; a
detached run stops after data publication and before import.

One disposable Project is created with four Audio Resources (one legacy parent
path and three owned generations), and zero Drafts are created. Independent
Project/path/content reads identify the selected Resources and retained bytes.
The earlier Gallery Project's metadata, resources and file tree are exactly
preserved. The client source is
`0e4f7a595095e826acfd8aa7d2edcaa507210ffe`. The initial probe correctly rejected
a changed byte count before reaching its hash check; that overly narrow harness
expectation was corrected and the same Project/results were resumed without
replaying completed imports. The original diagnostic is retained.

These are caller-boundary and direct music-preparation SDK checks, not a whole
installed Mini run, saved-Draft playback/export, actual Windows or reference/
changed-input quality acceptance. The caller fixtures deliberately stop before
assembly and stub unrelated inventory/search/planning decisions. Remaining
lifetime/recovery/partial-save, scoring/repetition, original C-09 environment and
all other full-template gates stay open. All 28 templates remain in scope;
Chan's apps and template packs remain excluded. No template is complete.
