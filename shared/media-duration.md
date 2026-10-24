# Source-media duration contract

`media-duration.js` is the canonical helper used by `gongju-gallery` and
`recap-2026`. Each panel ships independently with an inline copy; neither reads
another plugin's installation. Update the source, run
`node tools/sync_media_durations.mjs`, and check drift with the same command's
`--check` flag. The explicit two-plugin allowlist excludes Shortform Clips and
template packs.

- `mediaDurationFact(resourceSeconds, treeSeconds)` prefers a finite positive
  current Resource duration, then a finite positive source-tree duration. It
  returns `{durationSeconds, durationSource}`; an unknown duration is `null`,
  never zero. Sources are `resource`, `source-tree`, and `unknown`.
- The pure function can be serialized into a read-only `run_script` query.
  Join Resource metadata to source-file rows by the script Resource ID. Keep
  path, name, identity, seconds and provenance in one row; do not join by name
  or array position. Host UUID-to-script-ID resolution remains caller-owned.
- `resolveMediaDurations(rows, probeSeconds)` returns new rows in input order,
  preserves duplicate entries and row fields, and probes only unknown rows
  with a path. The caller supplies its existing host probe. No imports, media
  analysis, cropping or Draft writes occur in this helper. A probe observation
  may use the host's existing local-job transport.
- The resolver preserves known provenance, labels a successful fallback
  `probe`, and leaves failed/invalid observations `unknown`. A valid duration
  supplied without provenance is labeled `provided`. It keeps no cross-run
  cache. The caller still owns run lifetime and cancellation.
- `requireMediaDurations(rows)` rejects the first unknown row with
  `code: "media-duration-unknown"`, its `resourceId` and a file-specific
  message. It does not decide eligibility: minimum length, selection policy,
  crop times, Draft FPS and result ordering belong to each template.

Both template entry points require known durations before their length gates
and build calls. In folder browsers, unknown rows can be displayed/filtered
without treating them as measured short media. Test coverage includes the
actual template mount effect, metadata queries, numeric boundaries, probe
failure, unchanged input snapshots, and the second consumer's read scripts.
