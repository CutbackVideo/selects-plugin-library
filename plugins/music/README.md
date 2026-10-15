# Music

Connect your own Epidemic Sound account using its personal MCP API key. Search
and preview tracks inside Music, then click **Add to Draft** to import an
authorized full MP3 as editable Audio. The first song starts at frame zero and
fits the shorter of the song and the picture. Without video it uses the full
song. Later songs append after existing Epidemic music, preserving earlier
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
