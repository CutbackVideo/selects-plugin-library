# Gallery held-video content, snapshot and publication ownership

> Current SDK-free decision: [sdk-free-compatibility.md](sdk-free-compatibility.md) supersedes the pending SDK/app prerequisites below. Historical code and validation records are preserved; they do not establish current installed-app acceptance.


Photo Grid Reveal (`photo-gallery-no2`) 0.3.15, based on
c3879e32f399070ab347f9ccaa60b94a959e0af0 (draft PR #290). Chan's shortform plugins
and template packs remain excluded. The full 28-template goal remains active.
It also integrates parent follow-up f2a6180811afdcc0f630748ce50bc8b511359d14:
remote CI's isolated unsupported-SDK music entry test now receives the existing
update instruction before any helper/file/media work. The original regression
and expanded SDK compatibility vector remain in verification.

## Reproduced failures

Held-v2 keyed its cache by source path, size and modification time. Same-size,
same-time replacement could reuse the old picture. A same-size decodable cached
MP4 could also be silently accepted after byte changes. Encoding read the live
source: changing it A-B-A during encoding could produce a different picture while
the final source facts appeared unchanged. Independently renamed MP4/JSON files
could mix generations, and lost index publication responses could not recover.
Media processes did not observe run liveness, and standalone unmount did not end
its `sameContext` predicate.

The initial nine real-file parent cases failed eight with one control. Further
red cases covered terminal cache-validation timeout, a noncallable liveness
predicate, A-B-A replacement, standalone unmount, actionable public errors and
failed output publication and shared-owner input validation. The expanded
real-file suite passes 23 cases, including safe source I/O error handling.

## Shared owner and Gallery policy

- Add two generic functions to the existing bundled-assets feature: whole-file
  identity and derived-file ownership. Existing bundled Image/Audio bodies and
  consumers' call paths are unchanged. Three generated panel copies receive the
  additive definitions. The pool stays at five features and ten consumers.
- Hash raw source/output bytes through the already available FFmpeg data/hash
  pipeline, streaming without browser allocation of the whole Video. Check stat
  around hashes, observe every requested source before generation, and include
  path/content/recipe/clock/dimensions in the cache key.
- Exclusively reserve UUID source/output paths, copy and hash the private source,
  then pass the snapshot to Gallery's encoder. Reobserve the original after
  encoding and before publication. A-B-A changes cannot alter the private picture.
- Gallery retains its 60 fps, max-1920, upright rotation, H.264/CRF18/last-frame
  hold recipe. Whole-output decode, exact frames/rate/size and one-video-stream
  checks remain domain callbacks; Python decoded-frame parity stays tested.
- Publish a fully validated output under
  `held-v3/objects/<recipe-key>/<output-sha256>.mp4` before atomically writing a
  bounded `held-v3/index/<recipe-key>.json`. Keep coherent content/metadata across
  concurrent realms. Reuse valid objects without replacing them; repair corrupt
  objects only through complete atomic rename. No delete-before-rename fallback.
- Independently observe lost publication replies. Failed/unknown publication or
  terminal media work never causes an automatic second encode in the same call.
  An index failure may leave a verified object; it is retained for inspection.
- Liveness reaches active FFmpeg/FFprobe work through abort signals, checked
  between stages and while awaiting a tool. Standalone unmount also ends its
  scope. Unknown private causes stay out of public messages; controlled domain
  errors and update instructions are preserved.

The canonical local file client owns atomic index writes and SDK serialization;
the feature does not reinvent chunking or rename policy. Browser asset functions
stay outside SDK operation scripts. No new public client SDK/IPC or binary change.

## Evidence and limits

Tests execute full compiled/minified panel code over the canonical file client,
actual disposable filesystem state and local ffmpeg/ffprobe. They cover hashes,
same-fact replacements, decodable cache edits, A-B-A snapshots, concurrent realms,
timeouts, detachment, lost replies, oversized metadata, copy/publication/index
failure, source mapping/repeats, legacy preservation, non-ASCII/shell-looking paths
and a source over 32 MiB without browser byte reads. Separate React tests verify
standalone unmount and macOS/Windows argv/ownership integration. Actual Windows
is still a separate gate; the local filesystem/media evidence is not installed
Selects execution or whole-output AV acceptance.

Final related Node verification passed 1,265 cases without skips, including the
SDK compatibility vector that caught the parent failure. The exact Gallery CI
command passed 278 without skips. Python passed 285 with six skips. Public-source,
28-template normal pre-push, 48-package, five-module/ten-consumer, six-local-SDK and
47-app-guard checks passed. Counts overlap and must not be added together.

Already dispatched filesystem calls may finish after detachment. Process crashes
can leave private staging or unindexed complete objects; automatic age-based
deletion/takeover is not safe. Published objects, old held-v2 content, Resources
and user Drafts are not migrated or deleted. Full cleanup/reconciliation, all
option preflight, separate BPM lifetime, source clocks, composition/Inspector,
actual installed Selects/Windows, whole video/audio playback/export and reference
versus changed-input quality remain open. Client #7847 and, with sound, #7828 are
still prerequisites. The bundled excerpt's 30 fps mismatch and historical preview
failures remain explicitly documented, not reclassified as passing.
