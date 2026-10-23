# C-08: make newly added photos selectable in an open Gallery panel

The Gallery panel cached the media list until the person pressed Load again.
Adding a photo to the same Project did not change its context key, so the new
photo never appeared in the selector. Reusing Load as an automatic callback
would also discard the existing tile assignments and editing settings.

The panel now listens to the existing `sdk.on('resourcesChanged')` host event,
introduced in client #6953 on 2026-09-30. It rereads inventory only after a real
membership event for its own Project. There is no polling, background media
decoding or repeated file hashing. The SDK, app and shared modules are unchanged.

Automatic refresh updates only the inventory. It preserves tile assignments,
focus, music, BPM, name, length, the last saved target and the uncertain-save
lock. Events during creation or analysis wait until that operation settles;
repeated events coalesce. Manual Load or Create supersedes an older refresh.
Navigation, unmount and newer observations invalidate late responses. A missing
or rebound selected source invalidates Create instead of choosing another file
or silently dropping selected music. Manual Load remains available on older
hosts without event support.

## Evidence

- Two focused regression checks fail on the pre-repair template. All 47 Gallery
  interaction checks pass with the repair, including 12 new event/lifecycle cases.
- Delayed refresh versus Load/Create, busy event bursts, navigation/unmount,
  failed reads, removed/rebound choices, saved-target retention and the
  uncertain-save lock have dedicated regressions. Existing authoring/readback
  checks remain in the same interaction suite.
- In the isolated app at `cutback-client@90940207f`, a real owned Project import
  and the compiled panel's actual SDK reads increase selectable photos from
  seven to eight. The prior selection, focus, BPM and name survive, and the new
  photo is selectable. The test explicitly delivers the host event through its
  controller harness; this is not an installed PanelHost UI run.

Local reproduction scripts and before/after logs are retained under
`clip-highlights-analysis/repro-20261023/reported-cases/photo-agent/`, including
`C-08-red-final.log`, `C-08-all-panel-tests.log`, `C-08-package.log` and
`C-08-live-events.json`. Preview/export acceptance of a Gallery composition is
separate from this media-list repair. Existing Gallery border-quality findings
are not closed by an inventory refresh.

## Installed asset closure repair

The real installed-panel check found `retainUnconfirmedAssetFiles` undefined.
The canonical shared helper existed, but Gallery's generator omitted it from
the list of browser-side asset functions. Both callers were included. Existing
interaction tests injected the entire shared asset source, hiding that omission.

The generator now includes the existing helper and regenerates the two shipped
outputs. Shared implementation and SDK/app code are unchanged. Two regressions
execute only the packaged `PANEL_ASSET_SOURCE`: a host job with an unknown exit
preserves its original error as the cause and retains the reserved workspace
paths without deleting them or touching unrelated files. Both fail before the
generator repair and pass afterward. The actual installed PanelHost check is a
separate runtime checkpoint.

All 207 scoped Gallery checks pass. Running the actual app's `panel-check.ts`
worker with its bundled TypeScript libraries reports the two undefined names
before this repair and no undefined names afterward; no SDK/UI call is made by
that static check. Logs: `C-08-asset-closure-red.log`,
`C-08-asset-closure-package.log`, and `C-08-actual-panel-check.json` in the same
local evidence directory.
