# Summer Trip

Summer Trip turns the analysed footage and the photos in the open Project
into a 16:9 cinematic summer-trip video that is cut to the beat. The result
is a **new, editable Draft**. The plugin never renders a file and never
changes an existing Draft or any source file.

## What it makes

The video follows one schedule, counted in beats from the start of the
chosen music section:

- **Title (8 beats, two bars).** One opening shot that starts clean, with a
  title typed word by word: line 1 ("that one trip in", one word per beat,
  from half a beat in), then a big season word in two steps ("SUM" on beat
  5, "SUMMER" on beat 6), then two small labels: "SUMMER *VLOG*" at the top
  and, when you fill in a credit, "BY *NAME*" at the bottom. A line 1 of
  five or six words is typed on half beats instead.
- **Grid build (3.5 beats, from beat 8).** The title leaves and a 2x2 split
  screen fills one quadrant per half beat (top left, top right, bottom
  right, bottom left), each with a different shot. The place shot then takes
  over, again one quadrant per half beat: top left, the top half, three
  quarters, and full frame.
- **Place (beats 12-14).** The place shot plays full frame; the place title
  ("in ITALY", a serif in warm yellow) and the labels appear on beat 12.
  With no place filled in, the place title is skipped and only the labels
  return.
- **Montage.** Shots of two beats each, with one pair of three-beat holds
  in the middle (the cut between the holds falls between the bar lines, like
  the reference). The labels stay on.
- **Ending (8 beats).** A warm light-leak wash leads into three shots inside
  a rounded, feathered film frame on black, with light-leak pulses inside
  the frame and a warm orange flare over the last shot. The music turns muffled (low-passed) for the ending, and the
  picture and the music fade out over the last half beat.
- A **Summer look** on every clip, photo and grid panel: a warm film
  treatment with teal shadows, warm highlights, softened cyan skies and
  neon greens, a gentle highlight roll-off and a light film grain.
- A 1920x1080 canvas. Clips and photos of other shapes get a centre crop;
  grid panels of other shapes are cropped to their quadrant.
- Hard cuts only; the only transition is the light leak into the ending.

## Default path

1. Open a Project whose video clips are analysed (or that has photos), then
   open **Summer Trip** from the Plugin list. The top line shows what was
   found and the approximate length, for example "Ready: 9 clips · 12
   photos · about 20 s".
2. Check the **Title** fields and pick a **Style** (see below). The preview
   shows the title as it will look.
3. Press **Build**.

Progress is shown as five steps: Choosing shots, Preparing music, Creating
Draft, Adding title and look, and Opening Draft. When the build finishes,
the new Draft opens and a link to it is shown. **Create another version**
makes another Draft with a different shot choice, reusing the shot search.

## Title fields

| Field | Default | Notes |
| --- | --- | --- |
| Line 1 | "that one trip in" | 1 to 6 words, up to 32 characters, kept as typed |
| Season word | from the capture dates | the most common capture month: June-August SUMMER, September-November AUTUMN, December-February WINTER, March-May SPRING; SUMMER when unknown or tied. Up to 10 characters |
| Place | empty | optional; leave it blank to hide the place title. Up to 18 characters |
| Place prefix | "in" | the small word before the place |
| Top label | the season word + "VLOG" (italic) | follows the season word until you edit it |
| Credit | empty | optional; "BY *name*" at the bottom when filled |
| Credit prefix | "By" | the word before the credit name |

The panel stops the text at these limits and shows the limit under the
field. Long texts shrink to keep a margin at the sides. The fonts cover Latin
text; other scripts use a system fallback font.

## Styles

Three presets. Each sets the typefaces and sizes of the title, the labels
and the place title.

| Style | Line 1 | Season word | Labels | Place |
| --- | --- | --- | --- | --- |
| Summer (default) | Poppins Bold | Poppins Black, yellow | Poppins Light and Light Italic | Gloock |
| Poster | Poppins Bold, small, stacked above the season word | Anton, condensed, about 90% of the width | Poppins Light and Light Italic | Gloock |
| Postcard | Instrument Serif Italic | Gloock | Poppins Light and Light Italic | Gloock |

The fonts are bundled and embedded in the graphics, so the Draft renders
the same on any machine with Selects.

## Music

Choose a **Track**:

- **Bundled tracks**, generated for this plugin (instrumental, about 65 s):

  | Track | Tempo | Drop |
  | --- | --- | --- |
  | Surf Indie (default) | 122 BPM | at 9.9 s, after a quiet two-bar intro |
  | Tropical House | 120 BPM | at 16.0 s, after an eight-bar intro |
  | Cinematic Pop | 118 BPM | none (builds up in steps) |
  | Nu Disco | 124 BPM | none (full groove from the start) |

  With a drop, the default section starts two bars before it: the title
  plays over the quiet intro and the grid starts on the drop (the slider
  shows "Drop"). Tracks without a drop use ordinary sections ("Section"):
  the title plays over the first two bars and the grid starts on bar 3.
- **Your own music**: drop an audio file. The plugin detects the beat
  (the tempo is folded to the octave closest to 120 BPM (about 85–170 BPM))
  and looks for a drop: a clear jump in loudness on a bar line.
  When it finds one, the section starts two bars before it, so the grid
  lands on the drop; otherwise the panel says "No drop found: the grid
  starts after the 2-bar title". Songs whose beat cannot be detected
  reliably, or that stay under 70 BPM, use approximate timing (a fixed 0.5 s
  beat; the drop, the first montage cut and the ending may move onto a
  strong bass hit within 120 ms), and the panel says so. Your own music needs ffmpeg and Node.js 18 or later (see
  [INSTALL.md](INSTALL.md)). The ending muffle for your own music is a
  muffled copy baked with ffmpeg; for a compressed file (mp3, aac) it is
  baked from ffmpeg's decode, so at the joint it may sit a few milliseconds
  off the original.
- **No music**: fixed timing at 120 BPM (a 0.5 s beat).

The waveform below the track shows a box as long as the video. Drag it (or
press on the waveform) to choose where the video starts; with the waveform
focused, the arrow keys move it by a bar and Home and End jump to the start
and end. The box snaps to bars, so the cuts stay on the beat. The label
next to it says **Drop** when the box sits on the drop section and
**Section** anywhere else (the grid then starts on beat 8 of the section
without a musical drop). If the chosen length no longer fits after the
box, the box moves to the latest start that fits and says so. **Preview
this section** plays it; press it again (or Esc) to stop.

On your own music, only three moments may move onto a strong drum or bass
hit near the beat (within a tenth of a beat, at most 70 ms): the drop, the
first montage cut and the ending. Everything defined at that moment moves
with it. The bundled tracks are tight enough that their cuts always stay on
the beat grid. Selects starts the music on a video frame, which can move it
by up to half a frame; the cuts move with it.

## Length

| Length | Montage shots | Beats | At 120 BPM |
| --- | --- | --- | --- |
| Short | 6 | 36 | 18 s |
| Standard (default) | 8 | 40 | 20 s |
| Long | 12 | 48 | 24 s |

The video lasts 14 + 2 x (montage shots) + 2 + 8 beats, so it is shorter
with a faster track and longer with a slower one.

## Advanced

- **Clip sound**: how much of the clips' own sound plays. **Off** mutes it,
  **Ambient** (the default) keeps it about 18 dB under the music, and
  **Full** keeps it at its original level. The music stays at its full
  level in every mode. Photos have no sound.
- **Look**: the **Summer look** toggle is on by default, with **Look
  strength** 0.45 (0 to 1). Off removes the grade and the grain (the
  strength slider is then unavailable); the film frame and its light leaks
  stay.
- **Sound effects**: off by default. On adds a camera-shutter click on each
  of the first four grid steps and a soft whoosh into the drop and into the
  ending. They play with or without music.
- **Ending muffle**: on by default. Off keeps the music unfiltered to the
  end.
- **Use photos**: on by default. Off builds from the analysed video only.
- **Choose clips**: a checklist of the analysed clips and photos. All are
  used by default; **All** and **None** select or clear the list. A new
  selection searches its clips again on the next build.

With **No music** and Clip sound **Off** (and no sound effects), the panel
warns "Silent video".

## Grid panels and sound

The four grid panels play over the opening and place shots for less than
two beats each. They are visual only in every Clip sound mode: the opening
and place shots' own sound carries on underneath. When Selects cannot
remove a panel's sound, the panel plays at -60 dB, which is inaudible under
the music but is not a true mute.

## Photos

Photos (Image resources) fill shots too. They need no analysis and are
never scene-searched.

- About a third of the montage and ending shots are photos when there are
  enough of them, at most two in a row while anything else fits.
- The opening shot is a video when one fits; grid panels and the place shot
  may be photos.
- Each montage photo gets one subtle, eased move (push in, pull out, drift,
  tilt, or push and drift), never the same move twice in a row. Ending
  photos move inside the film frame, which itself stays still. In the
  Inspector, each move's **Motion** and **Motion strength** can be changed.
- The size of a photo Selects does not report is read once by placing it on
  an unsaved scratch Draft; nothing is saved.

## Requirements

The build needs:

- **6 different clips or photos**: the opening shot, the place shot and the
  four grid panels are all different. Otherwise: "Needs at least 6
  different clips or photos (found X)".
- **One video clip long enough for the opening** (9.5 beats plus a short
  tail, about 5 s at 120 BPM). Otherwise: "Needs one video clip at least X s
  long for the opening".
- A second clip (or a photo) for the place shot (4.5 beats). Otherwise:
  "Needs a second clip at least X s long (or a photo) for the place shot".

Montage and ending shots may reuse a clip, never twice in a row and from a
different moment when the clip is long enough. When the footage cannot fill
the chosen length, the build uses fewer montage shots (12, 10, 8, 6, down to
4) and says so before you build: "Your footage fits N montage shots (about
X s)". Below 4 montage shots the panel says "Your footage is too short for 4
montage shots" and Build stays disabled. The plugin does not start analysis
on its own, so analyse your clips first.

If the scene search fails for some clips, the build goes on without them
and the next **Build** searches only those clips again.

## The Draft and editing it

The Draft contains:

- the opening, place, montage and ending clips on the main track, cut on
  the beat;
- the four grid panels on video tracks above it, each scaled into its
  quadrant (with a "Grid panel" crop effect when the source is not 16:9);
- two Motion Graphics: "Summer Trip title" over the title and "Summer Trip
  labels" from beat 12 to the ending (with the place title for its first
  two beats);
- a "Summer look" Video Effect on every clip and panel, "Film frame" on the
  three ending clips and "Photo motion" on montage photos;
- the music (and its muffled copy over the ending) and, when on, the sound
  effects, on audio tracks.

Edit it in the Inspector:

- **Title** and **labels**: select a graphic to change its texts, colours,
  shadow, sizes and positions. The two graphics hold separate copies of the
  labels, so an edit in one does not change the other.
- **Clips**: the crop, the sound level, the Summer look strength and film
  grain and, on the ending clips, the light-leak strength.
- **Music**: select a music clip to change its volume.

Finished videos are exported from the Draft with **Handoff → Export**.

## Limitations

- The style cannot be switched in the Inspector. To change it, pick another
  style in the panel and build again. Rebuilding creates a new Draft and
  does not keep Inspector edits.
- The Draft is built in two commits: first the clips, the grid, their crop
  and sound levels, the music and the sound effects; then the title, the
  labels, the look and film-frame effects, the photo motion and, with Clip
  sound Off, the muted clip sound (Selects can change a clip's audio tracks
  only once the Draft is saved). If the second commit fails, the Draft is
  kept, the panel says so, and **Finish title and look** finishes that
  Draft with the settings it was built with. If Selects saves the first
  commit without confirming it, the panel finds the new Draft and offers
  **Finish title and look** as well.
- Switching Projects during a build stops it; a half-built Draft stays in
  the previous Project without its title and look.
- Moving cuts or the music clip in the Draft does not move the title, the
  grid or the light leaks.
- The light leaks are drawn by the effect, not taken from stock footage.
- A 16:9 video only; there is no vertical version yet.
