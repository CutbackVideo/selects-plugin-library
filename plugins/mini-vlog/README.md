# Mini Vlog

Mini Vlog turns the analysed footage and the photos in the open
Project into a 9:16 city weekend vlog that is cut to the beat. The result is a **new, editable
Draft**. The plugin never renders a file and never changes an existing Draft
or any source file.

## What it makes

- **Title section (8 beats, two bars).** Quick shots with a three-line
  title, for example "Saturday / in / New York". Line 1 appears first, then
  the connector, then the place (1.5 + 1.5 + 1 beats). The place line
  switches typefaces on every cut of a fast run: a burst, then four
  half-beat shots. The full title holds for one beat on a wide shot before
  it disappears. The burst follows the music: four quarter-beat shots when
  the track has a clear 16th-note pulse (Sunny Soul Strut and the three
  drum-forward tracks), otherwise two
  half-beat shots, so there are 12 or 10 title shots. Apart from that burst
  every cut lands on a beat or half-beat. A cut that starts a shot of a beat
  or more, and the first cut of the burst, moves onto a clearly strong drum
  or bass hit within a tenth of a beat (at most 70 ms), but only when no hit
  is already within a frame of the beat; a bass hit must also be clearly
  stronger than the hit nearer the beat. The rest of the burst follows the
  first cut when it moves, and every other cut stays on the grid. The
  bundled tracks are tight enough that their cuts stay on the grid.
- **Montage (2 beats per shot).** Street, architecture, park and detail shots,
  7 by default. It starts on the first beat of a bar.
- A 1080x1920 canvas. Landscape clips and photos get a centre crop.
- **Photos** fill shots too (see [Photos](#photos)).
- Hard cuts only, never between two shots of the same clip while other
  footage fits. There are no transitions and no end card. The picture stops
  on the last beat, and the music ends there with a short 0.12 s fade.
- A subtle warm colour look on every clip and photo (strength 0.35). The
  title is not tinted.
- The clips' own sound plays quietly under the music by default (**Clip
  sound**: Ambient, see [Advanced](#advanced)).

The video lasts 8 + 2 x (montage shots) beats, about 9 to 22 seconds
depending on the track's tempo and the chosen length.

## Default path

1. Open a Project whose video clips are analysed (or that has photos), then
   open **Mini Vlog** from the Plugin list. The top line shows how
   many analysed clips and photos were found and the approximate length, for
   example "Ready: 4 clips · 22 photos · about 14 s".
2. Check the **Title** fields. **First line** is pre-filled with the weekday
   of the most common capture date ("A day" when it is unknown), **Connector**
   is "in", and **Place** is pre-filled from the Project name only when it
   looks like a place. If Place is empty, the connector is hidden and line 1
   switches fonts instead. The preview cycles through the font states.
3. Press **Build**.

The build needs at least **16 usable shots** (12 for the title and 4 for the
montage), or 14 with a track that gets the half-beat burst; each photo counts
as one shot. If there are fewer, the panel says
how many it found, and how many of them are photos, and asks for more varied
footage or photos. It does not start analysis on its own, so analyse your
clips first.

Progress is shown as five steps: Choosing shots, Preparing music, Creating
Draft, Adding title and look, and Opening Draft. When the build finishes, the
new Draft opens and a link to it is shown. **Create another version** makes
another Draft with a different shot choice, reusing the shot search and
showing the same steps.

## Music

Choose a **Track**:

| Track | Tempo |
| --- | --- |
| Sunny Soul Strut (default) | 99 BPM |
| Golden Hour Disco | 104 BPM |
| Easy Sunday Lo-fi | 88 BPM |
| Weekend Indie Pop | 112 BPM |
| Brooklyn Boom Bap | 90 BPM |
| Downtown Funk Break | 98 BPM |
| Sunset Afro House | 115 BPM |
| Your own music | detected |
| No music | 99.2 BPM reference timing |

The waveform below the track shows a box as long as the video. Drag the
box (or press on the waveform) to choose where in the track the video
starts; with the waveform focused, the arrow keys move it by a bar and Home
and End jump to the start and end. The box snaps to bars (4 beats), so the
cuts stay on the beat. It starts on
the most energetic section. Selects starts the music on a video frame, which
can move it by up to half a frame; the cuts move with it. **Preview this section** plays the whole
section; press it again (or Esc) to stop.

**Your own music**: drop an audio file. The plugin listens for the beat and
uses it when the detected beat grid is reliable. When the detected beats
land halfway between the kicks and snare hits, it moves the grid half a beat
onto them. It also measures how
strongly the music marks 16th notes to choose the title burst. Songs slower than 70 BPM, or
songs whose beat cannot be detected reliably, fall back to fixed timing at
99.2 BPM, and the panel says "cuts use the original rhythm". Those cuts
still move onto a clearly strong bass hit nearby (within 120 ms). Without a
reliable grid, the box moves in 0.1 s steps instead of bars. Your own music
and the previews need ffmpeg; your own music also needs Node.js 18 or later
(see [INSTALL.md](INSTALL.md)). The bundled tracks work without them.

## Photos

Photos (Image resources) in the Project are used as shots. They need no
analysis and are never scene-searched.

- Each photo fills at most one shot, of any length up to 5 s.
- About a third of the shots are photos when there are enough of them. These
  photo shots are spread evenly over the whole video, title included.
- For the other shots the plugin prefers, in order: a video moment that
  matches the shot's role, then any other analysed video moment, then a
  photo, and only then an evenly spaced filler moment from a video. In the
  title's fast run a photo comes right after a matching video moment, before
  other moments.
- At most two photos play in a row while anything else fits. A Project with
  only photos still builds when it has at least 16 of them (14 with the
  half-beat burst); then the photos follow each other.
- The choice depends on the seed, so **Create another version** picks other
  photos.
- Photos are placed from their start for the shot's frame-exact length and
  centre-cropped to fill 9:16, like landscape clips. They have no sound, so
  Clip sound skips them.
- **Photo motion.** Each photo in the montage gets one subtle, eased move
  across its shot: push in, pull out, drift left, right, up or down, a small
  tilt, or push and drift. The moves vary through the video (never the same
  move twice in a row, directions alternate, vertical drift for portrait
  photos and horizontal drift for landscape ones) and never show the photo's
  edges. Photos in the title stay still. In the Inspector, each move's
  **Motion** and **Motion strength** (0 to 2) can be changed.
- Photos also get the warm look. Exports show the motion, the look and the
  crop. Frame previews made with Selects' frame capture tool can fail or show
  bars on photos with effects; the exported video is correct.

The size of each photo is read once, by placing it on an unsaved scratch
Draft (Selects reports no frame size for photos); nothing is saved.

## Font style

Five presets. Each has four typefaces: A (a script for the title), B
(uppercase italic serif), C (thin handwriting) and D (condensed).

| Preset | A | B | C | D |
| --- | --- | --- | --- | --- |
| Classic (default) | Yellowtail | Instrument Serif Italic | Sacramento | Instrument Serif |
| Romantic | Great Vibes | Playfair Display Italic | Parisienne | Playfair Display |
| Retro Diner | Lobster | Abril Fatface | Pacifico | Bebas Neue |
| Travel Journal | Kaushan Script | DM Serif Display Italic | Caveat | Antonio |
| Editorial | Allura | Cormorant Garamond Italic | Mrs Saint Delafield | Cormorant Garamond |

The fonts are bundled and embedded in the title, so the Draft renders the
same on any machine with Selects. They cover Latin text; other scripts use a
system fallback font.

## Advanced

- **Length**: Short, Standard or Long montage (4, 7 or 12 shots). If the
  music section is too short for the length, the panel asks you to move the
  section earlier or pick a shorter length.
- **Clip sound**: how much of the clips' own sound plays. **Off** mutes it,
  **Ambient** (the default) keeps it about 18 dB under the music, and
  **Full** keeps it at its original level. The music stays at its full level
  in every mode. Photos have no sound. In the Draft, a clip's level can be
  changed in the Inspector.
- **Warm look**: on by default.
- **Use photos**: on by default. Off builds from the analysed video only.
- **Choose clips**: a checklist of the analysed clips, each with its length
  and shape (Tall, Wide or Square), followed by the photos, marked "Photo". All clips are used by default; **All**
  and **None** select or clear the whole list. A new selection searches its
  clips again on the next build (choosing photos does not), and the readiness
  line shows how many clips and photos are selected. If the selected clips cannot supply 16 usable shots (14 with the half-beat burst), the
  build says how many it found.

If your footage cannot fill every montage shot of the chosen length, the
build uses fewer and says so next to the result: "Your footage fits N montage
shots, so this video is about X s instead of Y s. Add more clips for the full
length." After a build, the readiness line also shows how many montage shots
the footage fits.

If the scene search fails for some clips, the build goes on without them and
says "Could not check N clips; they were skipped. Build again to retry them."
The next **Build** searches only those clips again.

With **No music** and Clip sound **Off**, the panel warns "Silent video".

## The Draft and editing it

The Draft contains:

- one video clip or photo per shot, cut on the beat and centre-cropped to 9:16;
- one title Motion Graphic over the title section;
- a warm-look Video Effect on each clip and photo (when Warm look is on), and
  a photo-motion Video Effect on each montage photo;
- the music clip, trimmed to the video (when music is chosen).

Edit it in the Inspector:

- **Title**: select the title to change the first line, connector and place
  text, the **main font** (an installed font; empty uses the preset), the
  colour, shadow, size, tilt and vertical position.
- **Clips**: select a clip to adjust its crop, its sound level, or the
  warm-look strength.
- **Music**: select the music clip to change its volume.

Finished videos are exported from the Draft with **Handoff → Export**.

## Limitations

- The font preset cannot be switched in the Inspector. To change it, pick
  another preset in the panel and build again. Rebuilding creates a new Draft
  and does not keep Inspector edits.
- The Draft is built in two commits: first the clips, their crop, their
  Ambient sound level and the music; then the title, the warm look, the photo
  motion and, with Clip sound Off, the clips' muted sound (Selects can change
  a clip's audio tracks only once the Draft is saved). If the second commit
  fails, the Draft is kept, the panel says so, and **Finish title and look**
  finishes that Draft with the title, preset, Warm look and Clip sound it was
  built with, even if they have been changed in the panel since.
- Moving cuts inside the title section does not move the title's events.
  Moving the music clip's start does not move the cuts either.
- Songs under 70 BPM, or songs whose beat cannot be detected reliably, use
  fixed 99.2 BPM timing instead of their own beat.
