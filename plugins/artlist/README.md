# Artlist

Connect your own Artlist account, then search, preview and add authorized
originals to a Draft as editable Audio. This is a local prototype, not an
official Artlist plugin. It was the Artlist half of the Music plugin; Epidemic
Sound is now a built-in Selects app.

## Adding to a Draft

Click the plus button to import the original. The first song starts at frame
zero and fits the shorter of the song and the picture on Main or Video tracks.
Without video it uses the full song. Later songs append after existing music
downloads, preserving earlier clip positions; other audio does not determine
the append point. Length comes from the downloaded file. Import and Draft
commit use separate script transactions. Each explicit Add creates a new clip,
including repeated uses of the same song or effect. The imported media file is
reused; earlier clips stay in place. Export through the existing
**Handoff → Export** flow.

On Panel UI version 3, drag a cover directly onto an Audio lane at the desired
frame. The original downloads after release, then the existing file-drop
pipeline imports and places it. The drop captures the target before
downloading and never follows navigation into another Draft. Existing timeline
overwrite/insert rules apply: use an empty Audio lane or hold Cmd/Ctrl for
insert. Both the plus button and a timeline drop show a spinner in the
row's plus button while the original downloads and imports. Older
runtimes without `musicImportChanged` keep the native loading toast as their
feedback. Navigating to another Draft clears the cover indicator and finishes
the import only in the original project.

## Account and library

Click **Connect Artlist**. Sign in on the official
website, then open the profile menu to confirm the account and plan. Selects
retains its own browser session per Selects user; no password or API key enters
the panel or script. This path uses the website, not MCP OAuth. Requires
`music.artlist.web-session.v1`; older hosts show an update message.

The layout follows the built-in Epidemic Sound app. Search, Favorites,
Downloads and Artboards are the tabs; docked, the strip scrolls sideways. The
⋯ after them opens the account: email and plan, **Refresh account and plan**,
the license link and **Disconnect**. Under the tabs sit the search field (on
Search), the Artboard picker (on Artboards) and Music/Sound effects.

Results are a list under a quiet heading. A row is the cover, the title over
the artist, and the length over the BPM; narrow, the BPM gives way first, then
the length. Clicking anywhere on a row previews it, and the cover drags it onto
the timeline. While a row is hovered, focused or playing, its **Save** button
(favorite and Artboard controls, below the list) or its Artlist link takes the
length's place; **+** is always there. Space plays and pauses the preview
while focus is in the panel.

The player is ruled off across the panel's foot: the seek bar, "Title -
Artist" between the time played and the length, then play/pause with **+**.
Save and New Artboard controls open between the list and the player and scroll
within a bounded area.

Search Music or Sound effects, click a cover to preview, or open its Artlist
page. The plus button and cover drag request the website's MP3 download for
Music or WAV download for Sound effects, then
use the editable Audio import and cover-loading feedback described above.
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
last Music/Sound effects choice is remembered in panel preferences.

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
