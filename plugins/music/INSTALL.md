# Install

1. Build Selects with the `music.epidemic.mcp-key.v1` host contract. Panel UI
   version 2 adds native cover tiles and compact search; version 3 adds dragging
   those covers straight from Music to the timeline.
2. Copy `panel.tsx` to `SELECTS_USER_PANELS_ROOT/music/panel.tsx` and the other
   manifest files to `SELECTS_USER_SKILLS_ROOT/music/`.
3. Get your personal MCP API key from
   https://www.epidemicsound.com/account/api-keys.
4. Open Music in Selects Apps, click **Connect Epidemic Sound**, and paste the
   key into the host dialog. Do not put the key in panel code or agent scripts.
5. Search, preview and add an authorized track to an open Draft. Video is
   optional: an empty Draft takes the full song as editable Audio. Later songs
   append after existing Music downloads without shifting earlier clips.

Selects encrypts the key locally, separately for each Selects account. An older
binary shows an update message. No Developer Portal key, client ID or partner
OAuth setup is required for this personal MCP key flow.

A permitted original download is required for **Add to Draft**. A Creator
account was verified through full MP3 download, editable Audio saving, reload
and WAV export. MP4 export hit a local FFmpeg 9 compatibility error. Windows
still needs live verification.

For the Artlist prototype, build the host with `music.artlist.web-session.v1`,
install the same panel, select Artlist, and connect through its visible login
window. Open the account profile menu after signing in. No Developer Portal
key or OAuth client metadata is used. Free accounts can preview; adding an
original requires an Artlist music subscription. On macOS, Social Monthly was
verified with Music MP3 and Sound effects WAV originals, plus and cover drag,
native playback, WAV export and MP4 export. Windows and permission for public
distribution remain unverified.

Artlist settings include **Refresh account and plan** for subscription changes.
Build with `music.artlist.download-controls.v1` to enable per-download cancellation;
older session hosts retain basic downloads. Preview cache cleanup never removes
original media referenced by projects. New originals retain readable track names
and local source sidecars. The last selected music service is remembered.

Build with `music.artlist.library.v1` for personal Favorites, Downloads and
Artboards in Music. Select a library view, choose Music/SFX or an Artboard, then
preview or add as usual. Refresh reloads Artlist's current saved items. Older
hosts show an update message and receive no new library commands.


Build with `music.artlist.library-pages.v1` for Previous/Next track pages and
More Artboards. `music.artlist.library-edit.v1` enables Favorite/Unfavorite,
blank Artboard creation and track membership editing through Save. Each edit
uses the current account session and `allowCommit: true`. Earlier hosts keep
read-only library behavior and receive no new edit commands.
