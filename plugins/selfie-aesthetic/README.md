# Selfie Aesthetic Edit

Selfie Aesthetic Edit turns close-up selfie clips (and, optionally, photos) in the open
Project into a 9:16 aesthetic edit that is locked to the beat. The result is a **new,
editable Draft**. The plugin never renders a file and never changes an existing Draft or
any source file. It is inspired by a CapCut aesthetic-edit template.

## What it makes

- **The style.** Close-up faces, soft and slightly glowing, held and cut on the beat.
  Each bar alternates between two shots: a hold of one beat, a run of half-beat holds that
  stutter back and forth, and a final hold. Every cut gets a short blur whip centred on the
  cut (one strong frame on each side with a faint shoulder), so the picture smears and snaps
  on the hit. Bar changes whip hardest, cuts inside a bar lighter, every other bar only
  faintly, and the finale's quick cuts pop again.
- **Rhythm.** One source per bar. A standard bar has 6 holds (cuts at +1, +1.5, +2, +2.5
  and +3 beats, then the bar change). The last bar is a finale with a cut every half beat.
  The edit starts about 0.15 s before the first beat of the chosen music section and ends
  right after the last half-beat hold with a 0.12 s music fade.
- **Lengths.** Short is 4 bars (25 holds, about 10 s at 97 BPM), Standard is 6 bars
  and Long is 8 bars. If your footage cannot fill the chosen length, the edit gets
  shorter and the panel says how many bars fit.
- **Canvas.** 1080x1920. Landscape clips and photos are centre-cropped.
- **Photos** fill about a third of the bars in Standard and Long edits, from the third bar on
  and never the finale. A Short edit uses at most one photo bar, and only when you have fewer
  than three close-up clips. When there are too few close-up videos to fill the edit, photos
  may also appear in the second bar or in the finale (and a Short edit may then use more than
  one photo bar); the panel says so. The first bar is a video whenever you have one. A photo
  bar moves between two framings so it does not look frozen.
- **Framing.** Close-up clips are framed a little tighter, toward the face; switch a clip to
  Full in Adjust to see the whole frame.
- **Music.** Four bundled CC0 tracks (see `THIRD_PARTY.md`), or your own file.
- **Look.** A colour look and a whip on every clip, set as one effect per clip so you can
  change them in Adjust.
- **No text** is added to the video.

## How to use it

1. Open a Project with video clips or photos, then open **Selfie Aesthetic Edit** from the
   Plugin list. The top line shows what was found, for example "Ready: 6 clips · 3 photos ·
   about 10 s". Clips don't need to be analysed: once a clip is imported it can be used.
2. Pick the options below. The defaults work for most footage.
3. Press **Build**. Progress runs through five steps: Checking clips, Finding close-ups,
   Planning the edit, Building the Draft, Adding whip and look. The new Draft opens and a
   link to it is shown.
4. **Try other shots** builds another Draft with the same settings and a different shot
   choice. **Finish look** retries only the whip and look step if it failed after the Draft
   was created.

Analysed and unanalysed clips both work, and you never have to wait for analysis. For analysed
clips the panel finds close-ups with Selects' scene search and avoids bad shots. Unanalysed
clips get a quick check with the ffmpeg bundled with Selects (about half a second per clip, cached):
sharpness, exposure and motion, avoiding black, fading, flashing and blurry moments. This style
holds still, so the steadiest moments are picked. Analysed clips give better close-up picks,
and the panel shows a small note saying so. If the quick check can't run, the shots are evenly
spaced and the Draft is still built. The panel never starts analysis itself.

## Options

- **Clips**: Auto (every usable clip, analysed or not) or Choose clips to pick them yourself.
- **Music**: one of the four bundled tracks, **Your own music** (drop an audio file; the beat
  is detected inside the panel) or No music. A draggable **Music section** bar chooses where
  in the track the edit starts, and **Preview this section** plays it.
- **Look**: Soft glow (default; a warm rose grade with a gentle dark vignette), Night glam, Clean or None.
- **Length**: Short (default), Standard or Long.
- **Clip sound**: Off, Ambient (default, the clips' own sound quietly under the music) or Full.
- **Use photos**: on by default.

After the build, select a clip in the Draft and use Adjust to change its look, look strength,
whip strength or (video clips) framing. Building again creates a new Draft and does not keep Adjust edits.

## Windows and macOS

Both macOS (Apple silicon) and Windows x64 are listed as supported. You do not need to
install anything extra on either system: music previews and your own music use the ffmpeg
that is bundled with Selects, and beat detection runs inside the panel.
**Windows hands-on verification is still pending**: the code avoids
shell commands and OS-specific paths and is covered by tests with Windows-style paths, but
nobody has run the full flow on a Windows machine yet. Please report anything that
behaves differently there.

## Limitations

- **Micro-holds, not true freeze frames.** This version of Selects cannot freeze a frame from an
  effect, so each hold is a very short real-time stretch of the clip (a few frames long).
  Moving subjects keep moving slightly during a hold.
- **Close-ups are found by semantic scene search.** The panel searches each video for
  close-up faces, so a clip that is a good close-up but does not read that way to the search
  may be skipped. When few close-ups are found the edit reuses them or falls back to your
  other clips, and says so.
- Clips shorter than 1.2 s are skipped.
- Your own music needs a reasonably steady beat. When none is found, cuts use a fixed
  rhythm and the panel tells you.
- Building again always makes a new Draft; existing Drafts are never modified.
- Experimental: Released-version compatibility of Selects is unverified.

## Panel language

The panel follows the Selects language in German, English, Spanish, French, Italian,
Japanese, Korean, Portuguese, Turkish and Chinese.
