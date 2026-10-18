# Music

Connect your own Epidemic Sound account using its personal MCP API key. Search
and preview tracks inside Music, then click **Add to Draft** to import an
authorized full MP3 as editable Audio. The first song starts at frame zero and
fits the shorter of the song and the picture on Main or Video tracks. Without video it uses the full
song. Later songs append after existing Music downloads, preserving earlier
clip positions; other audio does not determine the music append point. Length
comes from the downloaded file. Import and Draft commit use separate script
transactions. An existing placement of the same file is reused at any position.
Export through the existing **Handoff → Export** flow.

Requires `music.epidemic.mcp-key.v1`. The key is entered in Selects' host dialog
and encrypted on this computer per Selects account. It never enters the panel
or an agent script. Disconnect removes the key and retains media used by
projects. Each user supplies their own key and music permissions.

Search uses 25-track cursor pages. Preview plays the MP3 URL returned by search;
it does not request an original download. Add asks Epidemic for a signed full
MP3 download URL before saving or reusing a file. Provider permission is final.
Temporary download failures are shown without automatic retries.

After connecting, Music fills the first screen with a real 25-track browse page
using the catalog query `background music`; it is not a personal recommendation
or playlist. The search input stays empty. Search by track, artist or mood and
press Enter. Results use the same native media tiles as Selects templates,
with actual Epidemic cover art and a plus button.
On Panel UI version 3, drag a cover directly from Music onto an Audio lane at
the desired frame. The original downloads after release, then the existing
file-drop pipeline imports and places it. The drop captures the target before
downloading and never follows navigation into another Draft. Dragging the same
song again reuses its imported resource. Existing timeline overwrite/insert
rules apply: use an empty Audio lane or hold Cmd/Ctrl for insert.
Both the plus button and timeline drop dim the song's cover and show a spinning
loader centered over it while the original downloads and imports. The separate
panel loader is removed. Timeline drops also keep the native loading toast;
older runtimes without `musicImportChanged` keep that toast as their feedback.
A failed download reports an error; navigating to another Draft clears the
cover indicator and finishes the import only in the original project.
Click a cover to preview. One player stays at the bottom while browsing, with
pause, seek and the provider's real waveform when available. Manage or disconnect
through the header's settings button. Panel UI version 2 enables native media
tiles and compact search; older hosts retain the basic preview/search controls.

The current MCP connection does not read personal Epidemic likes or playlists.
Selects favorites are not implemented yet.

Authenticated search, preview, authorized full MP3 download, saved editable
Audio, reload persistence and audio-only WAV export were verified on a Creator
account. MP4 export hit a local FFmpeg 9 compatibility error; Windows remains
unverified. Export usage reporting, provenance and safelisting
are not integrated. This is a local prototype, not an official Epidemic plugin.

[Official MCP documentation](https://developers.epidemicsound.com/docs/mcp/)

## Artlist (local prototype)

Choose **Artlist** in Music and click **Connect Artlist**. Sign in on the official
website, then open the profile menu to confirm the account and plan. Selects
retains its own browser session per Selects user; no password or API key enters
the panel or script. This path uses the website, not MCP OAuth. Requires
`music.artlist.web-session.v1`; older hosts retain Epidemic and show an update
message when Artlist is selected.

Search Music or Sound effects, click a cover to preview, or open its Artlist
page. The plus button and cover drag request the website's MP3 download for
Music or WAV download for Sound effects, then
use the same editable Audio import and cover-loading feedback as Epidemic.
Artlist previews are read inside the signed-in page and cached separately from
originals, because its CDN rejects direct app playback. Preview cache files are
not offered for Draft import. Preview source capture starts before the selected
track's play click, so clips that finish quickly are retained. Mislabeled AAC
responses require a valid ADTS header before being cached as audio.
Background login polling stops once connected.
Free/Free Trial accounts cannot add watermarked previews as original music.
Subscription permissions remain Artlist's decision. Disconnect clears the
Artlist browser login, retaining downloaded project media.

This integration is unpublished. On macOS with Social Monthly, real Music MP3
downloads, plus import, trusted cover drag, cover loading, preservation of
existing audio, full restart, WAV mix export and video-with-music MP4 export
were verified. SFX WAV originals were also verified through plus, trusted cover
drag, native playback, WAV-only audio export and MP4 mixing with MP3 music.
The tested WAVs are 96kHz/24bit mono and stereo. Original extensions are validated
and preserved; the existing 128MiB/120s download limits still apply. Optional
Clearlist onboarding is deferred through the website's own control (unit tested;
the prompt had already been dismissed before the live WAV checks).
Windows has not been verified. Login and
download selectors depend on the website. Release permission for this automated
website workflow is unresolved.

Account settings show the account and detected plan. **Refresh account and plan**
rechecks the existing website session; open the profile menu to finish. Closing
that window cancels login polling without disconnecting an existing account.
Expired login returns to Connect; explicit empty-result pages return zero tracks.
Selected tracks retain their search context across other panel/SDK searches,
with a bounded 500-track registry. Music/SFX changes clear the input query. The
last service and catalog are remembered in panel preferences.

Hosts with `music.artlist.download-controls.v1` expose **Cancel download** for
plus and timeline-cover drops. Each request has its own UUID; cancellation keeps
the account connected. Older session hosts retain ordinary downloads without
cancellation. Size and timeout errors are distinct from subscription errors.
Previews are limited to 256MiB and seven days, cleaned on the next preview save;
originals are excluded. New originals use a readable title and provider track ID,
with a private `.artlist.json` sidecar containing title, artist, URL and file hash.
Previously imported hash paths are retained. Sidecars are local provenance, not
license certificates; project export does not promise to collect them.
Sound effects' plus action is labeled **Add at end**. Drag a cover to choose an
exact timeline position, including repeated placements of the same effect.
On hosts with `music.artlist.library.v1`, switch between Search, Favorites,
Downloads and Artboards. Choose Music or Sound effects, refresh after saving on
Artlist, and select an Artboard to read its tracks. Earlier library-only hosts read the first 50 rendered tracks
and up to 100 rendered Artboards; the newer paging and editing contracts are
described below. Unsupported hosts keep search and show an update
message when a library view is selected. Download-history links can have an
incomplete slug, so preview/add restore a catalog search and match the provider
track ID rather than the title or old slug.
The bad-MIME and short-SFX preview failures were fixed and verified on macOS:
both tracks passed five repeated native requests and actual panel playback.


Hosts with `music.artlist.library-pages.v1` read the live personal library in
50-track pages, with Previous/Next navigation. Artboards load 100 at a time;
More Artboards extends the selector. Order is Artlist's current order rather
than a frozen snapshot, so refresh after an external edit. Each page registers
its track IDs again, preserving preview/add after moving between pages.
Older library hosts retain the first 50 tracks /100 Artboards.

With `music.artlist.library-edit.v1`, **Save** opens a track's storage controls:
Favorite/Unfavorite, Add to Artboard, and Remove from this Artboard while browsing
that Artboard. **New Artboard** creates a blank board with a name; it does not
request AI suggestions or credits. These are changes to the connected Artlist
account, separate from adding Audio to a Selects Draft. Changes are checked again
after a website reload. The current account-session ID and the SDK write gate
are required. Favorite and membership commands set a desired state rather than
blindly toggling. Identical Artboard names fail without choosing an ambiguous
board; rename them on Artlist first. Creation is not automatically retried:
if renaming fails, refresh the Artboard list before trying again because a
new default-named board may already exist. Deleting or sharing Artboards is not
included. Unsupported hosts do not show the new edit controls.
