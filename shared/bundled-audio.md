# Bundled Audio compatibility entry

The feature is now implemented in `bundled-assets.js`, through the existing
`prepareBundledAudio` entry used by Four Photo Reveal and Four Photo Stop Motion.
See the [generalized contract](bundled-assets.md) for Images and encoded files.
The Audio entry owns preparation of one installed MP3 as an owned
data-file/Project Audio Resource. It does not place clips, create Drafts or
change either template's timing/music choice.

Inputs are an explicit Project/plugin ID, installed source path, canonical
asynchronous files client, host platform, minimum complete source duration and
run-current predicate. Assets must be readable regular files of 1 byte to
32 MiB. Stat precedes allocation; observed byte count must match. SHA-256 covers
the bytes, not file name, size or timestamp. Source bytes are read again before
Project work, so an update during preparation cannot silently change intent.

The content path is `.selects/plugin-data/<plugin>/assets/<sha256>.mp3`.
Matching data is reused. A corrupt/size-mismatched copy is repaired from the
known installed bytes. Publication uses the existing local client's atomic
`writeFile` replacement, which stages chunks in its own sibling file and
renames on completion; this module does not reimplement chunking or rename.
It verifies the published bytes before importing. Different source content gets
a new path and leaves earlier content files untouched. Old data files are not
garbage-collected because existing Drafts may still reference them.

The SDK inventory function filters inside the worker and returns at most two
matching rows. It joins Source-file and Resource IDs in one Project, checks
Audio type/full duration and refuses ambiguity. POSIX paths match exactly;
Windows paths normalize separators and case. File-name suffixes and unrelated
installation copies never establish identity. Inventory response size and
request count do not grow with unrelated Project files.

The feature submits at most one import. It observes Project state afterward,
including when the reply was lost or another writer supplied the same file.
Confirmed state may satisfy the request without resubmission; a contradictory
positive ID is refused. An empty added-ID list with no matching Audio is a
confirmed skip, while an unconfirmed outcome requires Project inspection.
Neither is described as still preparing or automatically retried. Errors have
stable `BUNDLED_AUDIO_*` codes and safe public messages with private causes.

Run ownership is checked before file publication and Project import and after
asynchronous preparation. Detaching after dispatch does not undo an already
started import. Cached files and confirmed Project imports can remain after a
later template failure. Callers preserve their existing Draft lifecycle.

This affects new operations. Earlier Drafts/Resources that still reference an
installation folder are not migrated. A resumed old saved template run is not
rewritten. This feature does not prove decoding, playback, reference fidelity,
export, or the original bytes of every already-saved Draft. Installed-app and
Windows execution remain separate gates. Other audit findings and complete
installed-output validation are still pending.
