# City Weekend Vlog

City Weekend Vlog turns the analysed footage in the open Project into a 9:16
city weekend vlog that is cut to the beat. The result is a **new, editable
Draft**. The plugin never renders a file and never changes an existing Draft
or any source file.

## What it makes

- **Title section (9 beats).** Thirteen quick shots with a three-line title,
  for example "Saturday / in / New York". Line 1 appears first, then the
  connector, then the place. The place line switches typefaces on every cut
  of a decelerating burst: four quarter-beat shots, then five half-beat shots.
  The full title holds on a wide shot before it disappears.
- **Montage (2 beats per shot).** Street, architecture, park and detail shots,
  7 by default.
- A 1080x1920 canvas. Landscape clips get a centre crop.
- Hard cuts only. There are no transitions and no end card. The picture stops
  on the last beat, and the music ends there with a short 0.12 s fade.
- A subtle warm colour look on every clip (strength 0.35). The title is not
  tinted.
- The clips' location sound is muted by default.

The video lasts 9 + 2 x (montage shots) beats, about 9 to 23 seconds
depending on the track's tempo and the chosen length.

## Default path

1. Open a Project whose video clips are analysed, then open **City Weekend
   Vlog** from the Plugin list. The top line shows how many analysed clips
   were found and the approximate length, for example "Ready: 12 analysed clips
   · about 14 s".
2. Check the **Title** fields. **First line** is pre-filled with the weekday
   of the most common capture date ("A day" when it is unknown), **Connector**
   is "in", and **Place** is pre-filled from the Project name only when it
   looks like a place. If Place is empty, the connector is hidden and line 1
   switches fonts instead. The preview cycles through the font states.
3. Press **Build**.

The build needs at least **17 usable shots** (13 for the title and 4 for the
montage). If there are fewer, the panel says how many it found and asks for
more varied footage. It does not start analysis on its own, so analyse your
clips first.

Progress is shown as five steps: Choosing shots, Preparing music, Creating
Draft, Adding title and look, and Opening Draft. When the build finishes, the
new Draft opens and a link to it is shown. **Create another version** makes
another Draft with a different shot choice.

## Music

Choose a **Track**:

| Track | Tempo |
| --- | --- |
| Sunny Soul Strut (default) | 99 BPM |
| Golden Hour Disco | 104 BPM |
| Easy Sunday Lo-fi | 88 BPM |
| Weekend Indie Pop | 112 BPM |
| Your own music | detected |
| No music | 99.2 BPM reference timing |

The waveform below the track shows a box as long as the video. Click the
waveform to move the box and choose where in the track the video starts.
The box snaps to bars (4 beats), so the cuts stay on the beat. It starts on
the most energetic section. **Preview this section** plays 6 seconds from the
box start.

**Your own music**: drop an audio file. The plugin listens for the beat and
uses it when the detected beat grid is reliable. Songs slower than 70 BPM, or
songs whose beat cannot be detected reliably, fall back to fixed timing at
99.2 BPM, and the panel says "cuts use the original rhythm". Without a
reliable grid, the box moves in 0.1 s steps instead of bars. Your own music
and the previews need ffmpeg; your own music also needs Node.js 18 or later
(see [INSTALL.md](INSTALL.md)). The bundled tracks work without them.

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
- **Keep original clip sound**: off by default, which mutes the clips'
  location sound.
- **Warm look**: on by default.

With no music and no original sound, the panel warns "Silent video".

## The Draft and editing it

The Draft contains:

- one video clip per shot, cut on the beat and centre-cropped to 9:16;
- one title Motion Graphic over the title section;
- a warm-look Video Effect on each clip (when Warm look is on);
- the music clip, trimmed to the video (when music is chosen).

Edit it in the Inspector:

- **Title**: select the title to change the first line, connector and place
  text, the **main font** (an installed font; empty uses the preset), the
  colour, shadow, size, tilt and vertical position.
- **Clips**: select a clip to adjust its crop, or the warm-look strength.
- **Music**: select the music clip to change its volume.

Finished videos are exported from the Draft with **Handoff → Export**.

## Limitations

- The font preset cannot be switched in the Inspector. To change it, pick
  another preset in the panel and build again. Rebuilding creates a new Draft
  and does not keep Inspector edits.
- The Draft is built in two commits: first the clips and music, then the
  clips' muted sound, the title and the warm look (Selects can change a clip's
  audio tracks only once the Draft is saved). If the second commit fails, the
  Draft is kept, the panel says so, and **Finish title and look** finishes
  that Draft.
- Moving cuts inside the title section does not move the title's events.
  Moving the music clip's start does not move the cuts either.
- Songs under 70 BPM, or songs whose beat cannot be detected reliably, use
  fixed 99.2 BPM timing instead of their own beat.
