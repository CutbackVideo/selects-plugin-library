# Archive Vlog

Archive Vlog turns the video clips and the photos in the open Project into a
16:9 cinematic city or travel vlog, in the style of the "Cinematic Vlog" CapCut
template: a first shot that opens from black in a letterbox band while a title
decodes in, an "ARCHIVED BY YOURNAME" credit shot, a montage of held shots cut
on the beat of the music, and a held last shot that fades to black, all under a
warm "Cinematic look". The result is a **new, editable Draft**. The plugin never
renders a file and never changes an existing Draft or any source file.

## What it makes

The video follows a fixed template, counted in beats of the music:

| Part | Length | What it shows |
| --- | --- | --- |
| Opening | 6 beats (5.0 s at 72 BPM) | A video clip that opens from black in a centred letterbox band, with the title lockup decoding in over it |
| Credit | 2 beats | A video clip with the credit line "ARCHIVED BY YOURNAME" |
| Montage | N shots of 2 beats (Pace Cinematic) or 1 beat (Pace Quick) | Video clips and photos, one hard cut per shot |
| Final shot | 4 beats | A video clip whose last 1.0 s fades to black while the music fades out |

- A **1920x1080 (16:9)** canvas. Tall clips and photos get a centre crop.
- **Length** sets the montage: Short 8, Standard 16 or Long 24 shots at Pace
  Cinematic (the default). Pace Quick plays twice as many one-beat shots
  (16, 32 or 48), so a Length keeps its duration. Standard on the default
  track is 6 + 2 + 32 + 4 = 44 beats, about 37 s.
- Above 110 BPM the montage shots are twice as long (4 beats at Cinematic,
  2 at Quick) and the final shot is 8 beats, so the shots never get shorter
  than about half a second.
- Cuts sit on the music's beat grid. A cut with no drum or bass hit within a
  frame of its beat moves onto a clearly strong hit within a tenth of a beat
  (at most 70 ms); every other cut stays on the grid.
- The opening animation follows the reference's timing (black for 0.22 s, the
  band fully open at 2.35 s, kicker and tagline at 2.40 s, the title decoding
  from 2.90 s, one letter every 0.115 s), scaled down when the opening shot is
  shorter than the reference's 5.6 s.
- The opening, credit and final shots are always video clips. Photos fill
  about a third of the montage, never more than two in a row.
- So a build needs at least two video clips, one of them long enough for the
  opening shot; photos alone cannot make one. When the clips fall short, the
  panel says what is missing (for example how long the opening clip must be).
- The opening shot prefers a moving moment (people walking, traffic, a moving
  camera) when the footage has one.
- Every video clip after the opening gets a gentle **Shot motion** (a slow
  push-in or a sideways drift, alternating), every photo a **Photo motion**
  (push, pull, drift, tilt or push and drift).

## Default path

1. Open a Project with city or travel clips (and photos, if you like) and open
   **Archive Vlog** from the Plugin list. The clips do not need Selects'
   analysis.
2. Pick a **Style**, type your title and the name for the credit.
3. Press **Build**. The panel chooses the shots, adds the music to the
   Project, makes the Draft, adds the title, credit, look and motion, and
   opens it. The progress bar names each step ("Step 3/5 · Creating Draft").
4. **Try other shots** builds another version with the same settings and a
   different shot choice.

The readiness line at the bottom of the Length section says what the panel
found, for example "Ready: 14 clips · 6 photos". The lines above it say what
the build will make ("Standard: 16 montage shots (36.7 s)"). It refreshes by
itself while clips are still being added or analysed, when you come back to the
panel, and with **Refresh**.

Nothing waits for Selects' analysis, and the panel never starts it. Analysed
clips get their shots from Selects' scene search. Clips without analysis get
them from a quick check: the bundled ffmpeg decodes a small grey preview of each
clip ("Checking clips 3/7") and picks steady, well-exposed windows for the
opening, credit and last shots and moving ones for the montage, away from black,
fades, flashes, blur and cuts, from 0.5 s into the clip. It takes well under a
second per clip and is kept in the plugin's data folder, so **Try other shots**
and later builds do not check the same clips again. In a mixed Project both
kinds share one score scale, so neither always wins. A note under the readiness
line says how many clips are not analysed: analysed clips give better picks.
Without the bundled ffmpeg (an older Selects) clips without analysis use evenly
spaced windows and the build still runs.

## Style, title and credit

**Style** has three presets, each a tile with a sample of its title colour:

| Style | Title | Top line | Bottom line | Credit | Look |
| --- | --- | --- | --- | --- | --- |
| Cinematic (default) | CINEMATIC in yellow | MINI VLOG | CAPTURE THE MOMENTS, widely spaced | ARCHIVED BY YOURNAME | 0.30 |
| A Day Out | A DAY OUT in white | none | A QUIET DAY IN THE CITY, ONE FRAME AT A TIME | LOCATION \| YOURNAME | 0.30 |
| Golden Hour | GOLDEN HOUR in warm cream | TRAVEL DIARY | CHASING THE LAST LIGHT | ARCHIVED BY YOURNAME | 0.45 |

- The **Top line**, **Title** and **Bottom line** fields hold each preset's text
  (limits 24, 16 and 48; Korean, Japanese and Chinese characters count as 2).
  Switching presets keeps what you typed for each preset. Latin text is set in
  capitals; Korean text is kept as typed, without letter spacing.
- The **title preview** above the fields draws the finished lockup with the
  Draft's own layout code and fonts; its play button replays the decode.
- **Credit shot** is on by default. **Credit prefix** and **Name on the
  credit** start as the preset's sample text (ARCHIVED BY / LOCATION | and
  YOURNAME), and the panel says so: type your name (and, for A Day Out, your
  location in the prefix). Clearing the name leaves the credit out, so the
  sample name is never published by accident; with Credit shot off, the
  second shot also plays without a credit.
- Switching presets keeps what you typed; a field that still shows the old
  preset's text takes the new preset's.
- A title is required.

The title is a ultra-condensed display face (Anton), the credit a condensed
bold (Oswald), the kicker and tagline a small sans (Inter). Korean text is
drawn in the system Korean face (Apple SD Gothic Neo on macOS, Malgun Gothic
on Windows); while it decodes, a Korean title flips through common Hangul
syllables instead of letters.

## Music

The track list shows Marimba Motif (generated with Suno for Cutback, the
default), four bundled CC0 tracks, **Your own music** and **No music**. Credits and licence records for the
bundled tracks are in [THIRD_PARTY.md](THIRD_PARTY.md#music).

- **Music section**: the waveform shows the part of the track the video uses.
  Drag it (or use the arrow keys) to move it; it snaps to whole bars. A bundled
  track starts on its soft intro by default, so the opening and the credit play
  over the quiet part and the montage starts with the drums. Marimba Motif starts on
  bar 8 (28.9 s) by default, the part the team's reference edit uses; its beat
  is measured on its first 80 s, which is the part a video can use. Your own music
  starts on its most energetic stretch that fits.
- **Preview this section** plays the chosen part from its start and fades out
  at its end; Esc or the button stops it.
- **Your own music**: drop an audio file (mp3, m4a/aac, wav, flac or ogg). The
  panel decodes it and finds the beat itself, no extra tools needed, and says
  what it found under the file:
  - "Beat found: 96 bpm. Cuts follow the beat." (a steady beat between 70
    and 160 BPM);
  - "Tempo found (96 bpm) but the beat is faint, ..." (cuts follow that tempo
    approximately);
  - "No steady beat found, ..." (cuts use a steady 72 BPM beat and move onto
    bass hits).
  Only the first 4 minutes of the track are analysed and used. The
  analysis runs in the background (a few seconds); picking another track
  stops it. If it fails, the cuts use the steady 72 BPM beat and the panel
  says why.
- **No music**: the template runs on a steady 72 BPM beat. With Clip sound Off
  the video is silent, and the panel says so.

The fit line under Length says how much of the template fits the track from
the chosen section, for example "Standard: 16 montage shots (36.7 s)", or
"Long: 20 of 24 montage shots fit this track (...)" when the track ends
first. When the footage cannot fill the full length, the montage gets
shorter by whole bars and the panel says "Your footage fits 12 of 16 montage
shots"; the opening, credit and final shots are always kept.

## Advanced

- **Clip sound**: Off (muted), **Ambient** (default: the clips' own sound
  18 dB under the music) or Full.
- **Cinematic look**: on by default. It deepens the shadows while keeping the
  black point, softens near-white highlights, restrains greens and cyans, caps
  very saturated sunsets and warms the highlights towards amber. **Look
  strength** (0 to 1) starts at the preset's strength; moving it keeps your
  value.
- **Use photos**: on by default. Off builds from video clips only.
- **Choose clips**: tick the clips and photos the build may use (all by
  default). Changing the clip selection searches again on the next Build.

## The Draft and editing it

The Draft contains:

- one video clip or photo per shot, cut on the beat and centre-cropped to 16:9;
- the **Archive title** Motion Graphic within the opening shot and, with Credit
  shot on, the **Archived credit** Motion Graphic within the credit shot;
- Video Effects: **Letterbox reveal** on the opening shot, **Fade out** on the
  last shot, **Shot motion** on every other video clip, **Photo motion** on
  every photo and **Cinematic look** on every clip and photo (when Cinematic
  look is on);
- the music clip, trimmed to the video, fading out over its last second.

Edit it in the Inspector's **Adjust** tab (labels are written in the panel's
language at Build):

- **Archive title**: Top line, Title and Bottom line text, Title colour, Text colour,
  Size (60 to 160 %), Font (Anton or Oswald), Decode speed (25 to 400 %),
  Shadow (0 to 1) and Backdrop (0 to 1, default 0.4): a soft dark ellipse
  behind the title that fades in with the top line and keeps the white text
  readable over a bright opening shot. 0 turns it off; it never moves the
  text. The panel's title preview draws it too.
- **Archived credit**: Credit prefix and Name.
- **Letterbox reveal**: Reveal (seconds until the band is fully open) and
  Letterbox reveal (on or off).
- **Fade out**: Fade out (seconds). Its length in frames is the last clip's at
  Build: after re-trimming the last clip, adjust **Fade out** so it still ends
  in black on the new last frame.
- **Shot motion** and **Photo motion**: Motion and Motion strength.
- **Cinematic look**: Look strength and Warmth.

Finished videos are exported from the Draft with **Handoff → Export**.

## Windows and macOS

The panel runs the same way on macOS and Windows and needs nothing besides
Selects:

- It finds its files in the Selects skills folder (`.selects\skills\archive-vlog`
  in your home folder on Windows, `.selects/skills/archive-vlog` on macOS)
  through the host's file service; it runs no shell commands.
- Your own music is decoded with the ffmpeg that ships with Selects (or, on a
  Selects build without it, by the panel itself) and analysed by the bundled
  `beat-detect.cjs` in a background worker inside the panel; no shell
  commands, Node.js or ffmpeg install are needed. The decoded audio is a
  temporary file in the plugin's data folder, deleted right after decoding.
- Section previews play the track's own file; nothing is written to disk.

If the Selects build is too old for the panel's file access, the panel says
"Archive Vlog needs a newer version of Selects." instead of failing.

## Languages

The panel follows the Selects language: English, German, Spanish, French,
Italian, Japanese, Korean, Portuguese, Turkish and Simplified Chinese. The
default in-video words (CINEMATIC, CAPTURE THE MOMENTS, ARCHIVED BY), track
names, effect and graphic names and the Draft name stay English.

## Limitations

- Only 16:9 (1920x1080) videos. There is no vertical option.
- The bundled fonts cover Latin text only; Korean and other scripts use a
  system font, which looks lighter than the Latin display face.
- The style preset cannot be switched in Adjust. To change it, pick another
  preset in the panel and build again. Rebuilding creates a new Draft and does
  not keep Adjust edits.
- The Draft is built in two commits: first the clips, their crop and sound
  level and the music; then the title, credit, effects and, with Clip sound
  Off, the clips' muted sound. If the second commit fails, the Draft is kept
  and the panel says "Draft created, but its title, look and clip sound are
  not applied yet."; **Finish title and look** finishes that Draft with the
  settings it was built with.
- Moving cuts does not move the title or the credit, which stay within the
  shots they were built on. Moving the music clip's start does not move the
  cuts either.
- The Windows build path has not yet been tried on a real Windows machine.
