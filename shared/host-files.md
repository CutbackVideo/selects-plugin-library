# Panel host file facade

host-files owns the identical eleven helper functions previously copied inside
av-host: plugin-private client binding/capability checks, host-native paths,
cross-realm bytes, async text/byte reads, best-effort removal and plugin roots.
It reuses panelLocalClient from the existing local-client composition; it neither
adds public SDK APIs nor changes that transport or path-normalization policy.
The hostSdk binding remains private to each independently installed panel.

Archive and Mini are template consumers. Medical Explainer is an explicitly
registered compatibility consumer outside the visual-highlights collection.
Canonical source is delivered inside nested host-files markers by the existing
module generator. Outer av-host markers remain for existing host fixtures.

Media is a different responsibility. Archive/Mini retain captured-client bounded
decodeAssetPcm and runAssetMediaTool from bundled-assets. Medical retains its
existing PCM/probe adapters and their parsing, abort-request and cleanup policy.
No compatibility consumer is silently upgraded to another owner's media behavior.

The facade owns no temporary file, Worker, media process or render gate. Reads
return the existing byte view/text contract; they are not newly bounded reads.
hostRemove attempts only the explicitly supplied path and retains best-effort
error handling. Its caller must own that path; bounded media staging retains its
existing stronger lifetime/cleanup owner. Missing capabilities, missing plugin
markers and an unavailable data directory remain distinct outcomes.

Validation covers the three actual consumers, Windows/UNC/POSIX paths, async
roots, cross-realm/offset bytes, capability errors and cleanup. Adapter behavior
is checked separately. All three compiled panel programs are byte-identical
before/after extraction. Canonical checks reject missing, duplicate, empty or
reversed boundaries; generation/local SDK checks remain in force.
