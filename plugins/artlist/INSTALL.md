# Install

1. Build Selects with the `music.artlist.web-session.v1` host contract. Panel UI
   version 2 adds native cover tiles and compact search; version 3 adds dragging
   those covers straight from Artlist to the timeline.
2. Copy `panel.tsx` to `SELECTS_USER_PANELS_ROOT/artlist/panel.tsx` and the other
   manifest files to `SELECTS_USER_SKILLS_ROOT/artlist/`.
3. Open Artlist in Selects Apps and click **Connect Artlist**. Sign in through
   the visible login window, then open the account profile menu to finish.
   No password, API key, Developer Portal key or OAuth client is used.
4. Search, preview and add an authorized track to an open Draft. Video is
   optional: an empty Draft takes the full song as editable Audio. Later songs
   append after existing music downloads without shifting earlier clips. Use
   **Add again** to place the same song or effect another time.

Free accounts can preview; adding an original requires an Artlist music
subscription. On macOS, Social Monthly was verified with Music MP3 and Sound
effects WAV originals, plus and cover drag, native playback, WAV export and MP4
export. Windows and permission for public distribution remain unverified.

Artlist settings include **Refresh account and plan** for subscription changes.
Build with `music.artlist.download-controls.v1` to enable per-download cancellation;
older session hosts retain basic downloads. Preview cache cleanup never removes
original media referenced by projects. New originals retain readable track names
and local source sidecars. The last Music/Sound effects choice is remembered.

Build with `music.artlist.library.v1` for personal Favorites, Downloads and
Artboards. Select a library view, choose Music/SFX or an Artboard, then
preview or add as usual. Refresh reloads Artlist's current saved items. Older
hosts show an update message and receive no new library commands.

Build with `music.artlist.library-pages.v1` for Previous/Next track pages and
More Artboards. `music.artlist.library-edit.v1` enables Favorite/Unfavorite,
blank Artboard creation and track membership editing through Save. Each edit
uses the current account session and `allowCommit: true`. Earlier hosts keep
read-only library behavior and receive no new edit commands.

## Upgrading from Music

This panel was the Artlist half of the Music plugin. Epidemic Sound is now a
built-in Selects app, so Music is no longer needed for it. Remove an installed
`music` folder from `SELECTS_USER_PANELS_ROOT` and `SELECTS_USER_SKILLS_ROOT`
after installing Artlist; your Artlist login and downloaded media are kept by
Selects and are not stored in either folder.
