# Epidemic Sound search

Find music and sound effects on Epidemic Sound without leaving Selects, save the
ones you keep into your own library folder, and drop them onto the open Draft.

The panel has three tabs.

## Browse

- Search Epidemic Sound's public catalogue and switch between **Music** and
  **Effects**.
- Narrow results with genre and mood filters, a tempo band (slow, medium, fast,
  very fast) and a vocals / instrumental filter. Filter lists are built from the
  facets the search response returns, so they follow the current result set.
- Press a result to audition it in the panel. Cover art, artist, length and BPM
  are shown for each hit.
- Add the keepers to the **download list**. The list survives panel reloads.

## Saving a batch

Downloading needs a signed-in Epidemic Sound account, because only the account
pages expose the real download. Sign in once from **Settings**: the panel opens
the Epidemic Sound login page in the Selects browser, you sign in there with your
password, and press *I've signed in*. Use a password login rather than a Google
passkey — a passkey prompt cannot be completed inside the browser view.

Pressing **Save all** hands the whole download list to the assistant in a single
run: it opens each track page in the Selects browser, presses Download, and the
files land in your Downloads folder. The panel watches Downloads while the run
goes, moves each finished file into your library folder, and records it in
**My tracks**. Choose MP3 or WAV, and whether new saves are filed as music or as
sound effects, in Settings. Batches are capped at 8 tracks so a single run does
not time out; press Save all again for the next 8.

If a file arrives that the run did not report, the panel matches it by title and
files it anyway, so a partial run does not lose tracks.

## My tracks

Your saved library, independent of any project.

- Play a track locally, read and edit a short note on it, or reveal it in
  Finder (macOS) or File Explorer (Windows).
- While a track plays, its waveform shows under the card: click or drag on it
  to scrub, as in Browse. Tracks saved without an Epidemic waveform get one
  drawn from the file on disk (macOS: ffmpeg, which Selects provides; Windows:
  ffmpeg if it is on your PATH, otherwise WAV files only).
- **Add to draft** imports the file into the current project if it is not there
  yet and places it on the open Draft, either at the start or at the playhead.
  It commits the Draft, so the clip is editable straight away.
- Tracks stay listed when you switch projects; only *Add to draft* needs an open
  Draft.

## Settings

Library folder (type a path, `~` works, or press **Choose…** for the system
folder picker), download format, whether new saves default to music or sound
effects, and the Epidemic Sound sign-in state.

## What it stores

Settings, notes and the library index live in
`.selects/plugin-data/epidemic-sound-search/` in your home folder (on Windows,
beside the Selects skills folder). Audio files live wherever you point the
library folder; the panel never copies them into the plugin folder.

## Limitations

- macOS and Windows 10 (1803 or later) / 11. Linux is not supported. On
  Windows the panel uses the built-in Windows PowerShell 5.1 and `curl.exe`;
  a PC where policy blocks PowerShell cannot run it.
- You need your own Epidemic Sound subscription. The plugin does not bypass
  sign-in, licensing or download limits; it drives the same pages you would
  click yourself, and it never stores your password.
- Saving depends on the Selects assistant and the Selects browser. If the AI
  service fails before any browser work starts, the panel retries once and then
  reports the failure rather than downloading anything twice.
- Epidemic Sound's pages and search payload are not a published API. A site
  change can break search or saving until the panel is updated.
- Export finished videos through **Handoff → Export**.
