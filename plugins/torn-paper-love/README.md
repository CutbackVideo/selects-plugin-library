# Torn Paper Love

Torn Paper Love turns the photos (and, when needed, short video moments) in
the open Project into a 4:3 torn-paper love edit that is cut to the beat. The
result is a **new, editable Draft**. The plugin never renders a file and never
changes an existing Draft or any source file.

The style is inspired by a CapCut "torn paper couple edit" trend. This plugin
is an independent recreation of that look, not a copy of any one video.

## What it makes

- A **1440x1080 (4:3)** canvas. Portrait and landscape pictures are
  cover-filled first, so there are no bars.
- **Your pictures, twice, in order.** The plugin picks 5, 7 or 10 pictures
  (Short, Standard, Long) and plays them twice in the same order, which gives
  10, 14 or 20 shots. The second pass is faster than the first. The cuts land
  on the 8th-note grid of the music. Pictures are put in recording-date order
  (oldest first), so the edit reads as a story.
- **A torn paper photo on every shot.** Each picture fills 92 % of the frame
  on a backdrop, with an off-white torn edge, a darker fibrous rim and a soft
  shadow. Backdrop presets: **Night** (default), **Red curtain**, **Kraft**
  and **Photo** (the same photo, darkened, flattened and blurred, behind the
  torn one). A repeated picture keeps the same tear in both passes.
- **A Faded film look** on the photo (strength 0.6 by default): a dim,
  muted flash-photo tone with lifted, warm-brown blacks, compressed
  highlights and less saturation, so daylight and night shots match.
- **Ransom-note letters.** Two words, "MY" at the left and "LOVE" at the
  right by default. Each letter is its own small paper chip, cut close to the
  glyph (some chips follow the letter's outline), mostly on light paper in
  serif, Didone, typewriter and condensed faces, with an occasional heavy or
  dark-backed chip. The letters keep changing typeface and colour on the
  beat; at most one letter is red at a time. They appear on the first beat
  after the intro and stay over the flashes until the end.
- **Effects that punctuate the edit:** the first picture slides down from
  the top over black, then the backdrop fades in; a white paper flash after
  it; two glows; and on the last picture a short flash where the torn paper
  edge flares over an overexposed photo. Every other boundary is a hard cut,
  and the picture stops on the last beat, where the music ends with a short
  0.12 s fade.
- The videos' own sound (video moments only) plays quietly under the music by
  default (**Clip sound**: Ambient, see [Advanced](#advanced)). Photos have no
  sound.

The video lasts about 5 to 19 seconds depending on the track's tempo, the
length and the pace. The panel always shows the exact number.

## Default path

1. Open a Project that has at least 3 photos (or analysed video clips), then
   open **Torn Paper Love** from the Plugin list. The readiness line shows
   what it found, for example "Ready: 9 photos · 2 clips · 14 shots · about
   6.3 s".
2. Check the **Words** ("MY" and "LOVE" by default) and pick a **Style**.
3. Press **Build**.

Progress is shown as five steps: Reading your pictures, Finding moments,
Planning, Placing pictures, and Adding letters and paper, for example "Step
4/5 · Placing pictures · 50%". When the build finishes, the new Draft opens
and a link to it is shown. The Draft is named "Torn Paper Love <backdrop>
<length> <yyyy-mm-dd hh:mm:ss>".

The build needs at least **3 pictures**. If you have fewer than the chosen
length needs, it uses what exists and says so in the readiness line, for
example "You have 4 pictures: Short uses 4 (8 shots, 4.2 s)". It never
repeats a picture inside one pass. Photos need no analysis. Videos must be
analysed first, and the panel lists clips that are still analysing and photos
it could not read.

## The panel

The panel's sections, from top to bottom:

- **Words**: **Word 1** and **Word 2**, up to 8 characters each (at least one
  must be filled; a Korean, Japanese or Chinese character counts as 2). A
  preview strip shows the letters on the chosen backdrop.
- **Style**: the backdrop tiles Night, Red curtain, Kraft and Photo.
- **Music**: choose a **Track**, drag the section box on the waveform, and
  press **Preview this section** to listen.
- **Length** and **Pace**: Short (5 pictures), Standard (7, default) or Long
  (10); Quick (default) or Relaxed, where every shot is twice as long. The
  readiness line next to them shows the number of shots and the seconds.
- **Advanced**: Use videos, Clip sound, Faded film, Tilt, Choose clips.
- **Build**: creates a new 4:3 Draft.
- **Finish letters and look**: appears if the second build commit fails, and
  finishes that Draft (see [Limitations](#limitations)).
- **Create another version**: builds another Draft. New tear shapes and
  letters; different photos when you have more pictures than the length
  needs.

## Music

| Track | Tempo |
| --- | --- |
| Bedroom Pop Love (default) | 86 BPM |
| Slow R&B Glow | 84 BPM |
| First Love Guitar | 88 BPM |
| Easy Sunday Lo-fi | 88 BPM |
| Sunny Soul Strut | 99 BPM |
| Your own music | detected |
| No music | fixed 0.35 s timing |

The waveform below the track shows a box as long as the video. Drag the box
(or press on the waveform) to choose where in the track the video starts; the
arrow keys move it by a bar, and Home and End jump to the start and end. The
box snaps to bars, so the cuts stay on the beat. It starts on the most
energetic section. **Preview this section** plays the whole section; press it
again (or Esc) to stop. Changing the length or the pace moves the box to the
nearest bar that fits.

The cuts use the music's 8th-note grid, or its beat when that is closer to
0.35 s (above about 129 BPM); a note between 0.22 and 0.55 s long is used, so
a 120 BPM track cuts on its 0.25 s 8ths. A cut that starts a longer shot may move onto a clearly strong drum
or bass hit within a tenth of a beat (at most 70 ms), but only when no hit is
already within a frame of the grid.

**Your own music**: drop an audio file. The plugin listens for the beat:
- **Beat found**: the cuts use its grid, as with the bundled tracks. Sparse
  drums count too (for example lo-fi with a kick on only some beats), as long
  as the hits sit tightly on the grid and it holds across the whole track.
- **Tempo found, beat faint** (the hits that are there sit on a steady grid,
  but too few beats carry one): the cuts follow that tempo's 8th (or beat)
  from its first beat, the box snaps to its bars, and a cut only moves onto a
  strong bass hit within 120 ms. The panel says "Music added; its beat is
  faint, so cuts follow its tempo (N BPM) without locking to every beat."
- **No steady beat**: fixed 0.35 s steps, and the panel says so ("cuts use a
  steady 0.35 s rhythm"); the box moves in 0.1 s steps.

With **No music** the panel says "the cuts keep a steady 0.35 s rhythm". If a
track is too short to hold even 3 pictures from the section start, Build is
disabled with "This track needs at least X s from the section start". Your own
music and the previews need ffmpeg; your own music also needs Node.js 18 or
later (see [INSTALL.md](INSTALL.md)). The bundled tracks work without them.

## Pictures

- **Photos first.** Photos are used before videos. When there are fewer photos
  than the length needs, short video windows fill the rest (one window per
  clip, chosen by a scene search for two people close together). Turn **Use
  videos** off to use photos only.
- When you have more pictures than needed, the plugin picks one from each
  slice of the date-ordered list, so the edit covers your whole time span.
- Photos are placed with a centre crop for landscape and a crop that keeps the
  upper part for portrait pictures, where faces usually are.
- The size of each photo is read once, by placing it on an unsaved scratch
  Draft (Selects reports no frame size for photos); nothing is saved.

## Advanced

- **Use videos**: on by default.
- **Clip sound**: how much of a video's own sound plays. **Off** mutes it,
  **Ambient** (the default) keeps it about 18 dB under the music, **Full**
  keeps it at its original level. The music stays at its full level in every
  mode.
- **Faded film**: on by default (0.6).
- **Tilt**: off by default. On gives each picture a small seeded tilt of up
  to 1.5 degrees.
- **Choose clips**: a checklist of the photos and analysed clips. All are used
  by default; **All** and **None** select or clear the whole list.

With **No music** and Clip sound **Off**, the panel warns "Silent video".

## The Draft and editing it

The Draft contains:

- one photo or video window per shot, cut on the beat, on the Main track;
- a **Torn photo** Video Effect on each shot (backdrop, torn photo, look and
  transitions);
- one **Ransom letters** Motion Graphic over the video, from the first beat
  after the intro to the end;
- the music clip, trimmed to the video (when music is chosen).

Edit it in the Inspector:

- **Torn photo** (select a shot): **Faded film**, **Backdrop colour**, **Edge
  width**, **Photo size** (92 by default, 70 to 95), **Tilt**, **Tear seed**,
  **Photo motion** (Off, Push in, Pull out, Drift) and **Motion strength**.
  Faded film is 0.6 by default and photo motion is off. The tear seed is 0
  to 9999 and changes that shot's tear.
- **Ransom letters** (select the graphic): **Word 1**, **Word 2**, **Size**
  (cap height in % of the frame height, 6.0 by default), **Vertical position**, **Accent colour** (the red), **Letter seed** and
  **Re-style** (turns the changing letters on or off).
- **Music**: select the music clip to change its volume.

Finished videos are exported from the Draft with **Handoff → Export**.

## Letters

Each word is up to 8 characters (a Korean, Japanese or Chinese character
counts as 2). Supported letters are A-Z, a-z, 0-9 and the characters
. , ! ? & ' - and ♥. Anything else (accents, Korean, other scripts) is drawn in
a system fallback font on a plain white chip (see [Languages](#languages)). Upper or
lower case is part of each letter's look, so "love" and "LOVE" can look the
same. If a word is too long for its side, the whole word shrinks, and the
panel warns "shorten" when it still does not fit.

The typefaces are bundled and embedded in the graphic, so the Draft renders
the same on any machine with Selects.

## Languages

**The panel** follows the language of the Selects app and changes with it
while the panel is open. It is translated into German, English, Spanish,
French, Italian, Japanese, Korean, Portuguese, Turkish and Chinese; any other
app language shows English. Track names, the Draft's name and the technical
detail after an error message stay in English.

**The letters in the video** can be typed in English or Korean (Hangul):

- The pre-filled words "MY" and "LOVE" stay English in every language. Type
  over them to change them.
- The bundled typefaces have no Korean letters, so each Korean letter sits on
  a plain white chip in the macOS system font **AppleMyungjo**. The Latin
  letters around it keep their changing looks; the Korean chips keep theirs
  (Re-style does not change them).
- Korean letters are never set in capitals, letter-spaced or squeezed. They
  are measured as wide letters, so a word shrinks to fit its side as Latin
  words do; a Korean character counts as 2 of a word's 8.
- Korean letters need macOS, where Selects and its export run. Style-matched
  Korean typefaces are planned for a later version.

**Inspector labels** of the Torn photo effect and the Ransom letters graphic
are written into the Draft in the panel's language at the time of the build.
They do not change if the app language is switched later. The effect and
graphic names (Torn photo, Ransom letters) stay English.

## Limitations

- There is **no person cutout**. The whole photo gets the torn border, so the
  look is a "torn photo" rather than a silhouette sticker.
- Video windows are short (about 0.35 to 2 s) and read as near-stills. There
  are no freeze frames, because Selects has no API for them.
- Photos have no scene search and no sound.
- The Draft is built in two commits: first the clips, their crop, their
  Ambient sound level and the music; then the Torn photo effects, the letters
  and, with Clip sound Off, the clips' muted sound. If the second commit
  fails, the Draft is kept, the panel says so, and **Finish letters and
  look** finishes that Draft with the words, backdrop, look and Clip sound it
  was built with, even if they have been changed in the panel since.
- Rebuilding creates a new Draft and does not keep Inspector edits.
- Transitions are drawn from each shot's start; after trimming a shot's start
  in the Inspector, check its transition.
- Frame previews made with Selects' frame capture tool can fail or show bars
  on photos with effects; the exported video is correct.

## Requirements

- Selects with Draft authoring and Panel `runScript` / `runShell`.
- A Project with at least 3 photos or analysed video clips.
- Optional: ffmpeg and Node.js 18 or later, for music previews and your own
  music (see [INSTALL.md](INSTALL.md)).

## Gallery

`preview.mp4` (960x720, with sound) and `poster.webp` are for the plugin
gallery (a Photo backdrop build with Slow R&B Glow). They are not installed with the plugin.
Their photo credits are in [THIRD_PARTY.md](THIRD_PARTY.md).
