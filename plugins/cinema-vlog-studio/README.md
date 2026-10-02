# Cinema Vlog Studio

Rebuild a fixed 21.35-second cinematic street-vlog edit as a new editable Draft,
using video already imported in the open Selects Project. The rhythm, the
graphics and the sound are part of the template; you choose the footage.

The result is an ordinary 1920 x 1080 Draft: separate clips, separate audio
clips and ordinary Draft graphics. Nothing is flattened or pre-rendered. Export
the finished video through **Handoff → Export**.

## What it makes

- **Opening burst (0 - 1.8 s)** - nine short cuts, then a single-frame white
  flash on the last frame before the title section.
- **Title section (1.8 - 6.5 s)** - a three-step black curtain closes in from
  the top and bottom while an alphabet-scramble title settles into your text: a
  small kicker line, a large serif title and a paragraph below it. All three are
  editable graphic parameters after the build, along with both colours and the
  font.
- **Three inset cards** - a clip plays inside a small centred 16:9 card that
  grows across the three cards (19%, 51%, 79% of the frame width), each ending
  on a one-frame white card flash, and each followed by the same take at full
  frame.
- **Glitch hit** - one marker triggers a five-frame monochrome stutter with a
  camera-click sound, and the cut is split there so a different clip appears
  after it.
- **Sound** - the bundled intro effects run under the opening, the bundled music
  starts at the title and fades out at the end, and the camera click lands on the
  glitch. Source-footage audio is muted to -60 dB.

## Using the panel

Open **Cinema Vlog Studio** from the Plugin list with a Project open.

1. **Footage folder** - pick one folder of imported video. Only folders already
   in the Project are listed.
2. **Clips you choose** - four picks: the clip the title sits on, and one clip
   for each inset card. Each card and the full-frame cut after it use the same
   take, so one pick covers both.
3. **The remaining slots** - filled at random from the same folder, with a
   shuffle button and an expandable list for choosing them by hand. Slots are
   offered only the clips that are long enough for them. With fewer distinct
   clips than slots, a clip is reused rather than leaving a hole.
4. **Title** - the kicker, title, paragraph and font.
5. **Create Draft from markers** - builds and saves the Draft, then reports its
   name, cut count and Draft ID.

## Marker contract (optional)

With no markers on the Draft you have open, the template's own cut schedule is
used. To retime the music section, put markers on that Draft:

- exactly **12 scene markers**, in increasing order, inside the music section,
- plus **one marker whose note contains `glitch`** (the Korean onomatopoeia for
  the same effect is also accepted),
  which places the monochrome stutter and the camera click.

The 12 markers become the 12 cut boundaries after the title; marker times are
read in the Draft's own frame rate and mapped onto the template's 30 fps
reference schedule. A marker set that is out of order, outside the music
section, or not exactly 12 + 1 is refused with a message instead of building a
wrong edit.

## Requirements

- A Project open, with one folder holding enough video. Fourteen slots are
  filled; the most demanding slot needs about 5.6 seconds of source, and the
  panel hides clips that are too short for a slot.
- The panel imports its three bundled sounds into the Project on first build.

## Known limitations

- The cut schedule, durations and graphics are fixed; only the footage, the
  title text and the 12 marker boundaries change.
- 16:9 only, 1920 x 1080.
- Windows: built to run there (no shell command), not yet checked on a Windows
  machine.
- The picture is cut from the selected folder without any shot analysis, so
  slot names like "Tram" or "Graffiti street" describe the reference edit, not
  what your clip contains.
