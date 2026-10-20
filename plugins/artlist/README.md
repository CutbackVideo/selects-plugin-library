# Artlist

Connect your own Artlist account, then search, preview and add authorized
originals to a Draft: music and sound effects as editable Audio, stock footage
as video. This is a local prototype, not an
official Artlist plugin. It was the Artlist half of the Music plugin; Epidemic
Sound is now a built-in Selects app, and this panel follows its layout.

## Connecting

Click **Connect Artlist** and sign in on the official website in the window
Selects opens. On hosts with `music.artlist.auto-identity.v1` that is all:
Selects reads the account and plan itself, and the panel says only "Sign in on
Artlist". Older hosts finish once you open the profile menu, and only while
that menu shows your email, which Artlist's current menu does not.

Selects keeps its own browser session per Selects user; no password or API key
enters the panel or a script. This path uses the website, not an Artlist API.
It requires `music.artlist.web-session.v1`; older hosts show an update message.
Expired login returns to Connect. **Disconnect** clears the Artlist browser
login and keeps media already downloaded into projects.

## The panel

- **Tabs** — Music, Sound effects, Footage (on hosts with
  `music.artlist.footage.v1`), Favorites and Downloads, as the app's own panel
  tabs (Panel UI version 4, `Tabs variant="strip"`); docked, the strip
  scrolls sideways. The ⋯ after them is a dropdown: **Refresh list** on a
  library tab, then the account's email and plan, **Refresh account and plan**,
  the license link and **Disconnect**. The last tab is remembered.
- **Search and filters** — Music and Sound effects search Artlist's catalog.
  On hosts with `music.artlist.categories.v1`, Artlist's own categories sit as
  filter chips under the search (`FilterBar`): music's Genre, Mood, Video Theme
  and Instrument; sound effects' Ambience, Foley, Genre, Musical, Realistic and
  Transitions. A chip in use reads "Genre · 2", and **Clear** empties them.
  Filters alone list the catalog within them; with a search they narrow it.
  Each tab keeps its own filters while the panel is open.
- **Library** — Favorites and Downloads (the account's Artlist download
  history, not files on this computer) list music and sound effects together,
  a page of each (`music.artlist.library-pages.v1`). Their order is Artlist's
  current order; **Refresh list** after saving on Artlist.
- **Footage** — Artlist's stock clips as thumbnails only, each at its own
  shape (`MediaGrid`), with the same search. A thumbnail opens the clip on
  Artlist; its **+** adds it.
- **Load more** — at the foot of every list while Artlist says more follow
  (`music.artlist.more-pages.v1`; older hosts show the first page only). A
  search or footage list reads up to 20 pages. A row already shown is not
  repeated, and a filter change that fails to load puts the chips back as the
  list shows them.
- **Rows** — the cover, the title over the artist, the length over the BPM in
  the app's figures face; narrow, the BPM gives way first, then the length.
  Clicking a music or sound effect row previews it; the cover drags it onto the timeline. While a
  row is hovered, focused or playing, its ⋯ (**Save**: Favorite or Unfavorite,
  and Open in Artlist) takes the length's place; **+** is always there.
- **Player** — ruled off across the panel's foot: the track's Artlist
  waveform as the seek bar (`music.artlist.waveform.v1`; a plain bar on older
  hosts), "Title - Artist" between the time played and the length, then
  play/pause and **+**. Space plays and pauses while focus is in the panel,
  except on a field, button, tab or menu item, which keep their own Space.
- **Loading** — placeholder rows in the list's shape (`Skeleton`) while a list
  loads; tabs can be switched meanwhile, but not while something is being
  added or saved.

On Panel UI version 3 and earlier, the tabs are a boxed switch and Save and the
account open as sections above the player.

## Adding to a Draft

**+** downloads the original — the website's MP3 for music, WAV for sound
effects — and imports it as editable Audio. The first song starts at frame
zero and fits the shorter of the song and the picture on Main or Video tracks;
without video it uses the full song. Later songs append after existing music
downloads, keeping earlier clips where they are; footage saved beside them
counts as picture, not music. Sound effects' **+** reads **Add at end**. Each
**+** makes a new clip, reusing the imported file.

A clip's **+** saves its HD MP4 from the clip's page and places it after
Main's last clip, as the project panel's "Add to current timeline" places a
video file. A clip may be up to 2 GiB and take 15 minutes; once it is
downloading, other Artlist requests go on beside it.

On Panel UI version 3, drag a cover onto an Audio lane at the frame you want;
the original downloads after release and the timeline's own file drop places
it (use an empty lane, or hold Cmd/Ctrl to insert). While a download runs, the
row's **+** shows the spinner; hosts with `music.artlist.download-controls.v1`
also offer **Cancel download**.

Free and Free Trial accounts can preview but cannot add originals; what a plan
allows is Artlist's decision. New originals are named for the track, with a
private `.artlist.json` sidecar (title, artist, URL, file hash) as local
provenance, not a license certificate. Music and sound effects keep the
128 MiB / 120 s limits. Previews are read inside the signed-in page, because Artlist's CDN
refuses other origins, cached for up to seven days and never offered for
import.

## Status

Unpublished. On macOS with Social Monthly, Music MP3 and Sound effects WAV
originals were verified through **+**, cover drag, playback, WAV export and
MP4 export. Windows is unverified. Login and download depend on the website's
current pages, and permission for this automated website workflow is
unresolved.
