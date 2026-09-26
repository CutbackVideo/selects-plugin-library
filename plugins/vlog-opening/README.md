# Vlog Opening

Builds a 12-22 second vlog opening as a **new Draft**, in one of three styles,
from the analysed footage of whatever Project is open. Nothing is hardcoded to a
particular shoot: the panel picks shots by searching the Project's own analysis,
so the same button works on a trip, a wedding or a product shoot.

## The three styles

| Style | What it makes |
|---|---|
| **Whip cut** | A fast montage: a long opening shot, a travel beat, four quarter-second burst cuts, then landscape and people beats. Cuts are joined with authored directional smear transitions, two white flashes around the burst, optional cinematic black bars, and a title card. |
| **Motion graphics** | The first shot plays on a hand-drawn laptop resting on a polka-dot blanket, and the camera zooms into the screen like stop motion, in held steps on the beat, while the drawing boils; a plane then banks across a cloudy sky, pinned place labels taken from the Draft's chapter titles drop in, and the title writes itself on over the closing shot with a swash and sparkles. Its palette is sampled from the clips it chose. |
| **Funny quotes** | A cold open: an iris opening on the first line, a script title, a watermark, then a run of talking-head lines picked from the transcript. Clip dialogue is kept rather than muted. |

Every opening ends with a 0.6 second fade to black so it cuts cleanly into the
next timeline.

## Why the result is repeatable

Shot choice is a pure function of the Project's stored analysis: candidates are
ranked by score, ties are broken by resource id and timecode, one clip is used
per role before any clip repeats, and windows are clamped to the source. There
is no randomness and no time-based seed, so the same Project with the same
settings produces the same cut. Scene search is retried across several passes
because the backend drops requests when the app is busy; any clip that never
answers is reported rather than silently skipped.

## Cutting on the beat

Each bundled cue carries a beat grid measured from the file, and the cut is
laid out on it:

| Cue | Tempo | Structure the cut follows |
|---|---|---|
| Cinematic score | 110 bpm | The opening shot holds through the swell and cuts on the first hit (2.04s); cuts then land on beats, the burst on half beats; the title card arrives on the final hit, 18 beats later, and holds until the cue has faded. |
| Playful vlog cue | 148 bpm | Cuts on bar lines; the desk push-in lands on the first bar line, labels drop in on their cut, and the sign-off starts on the last downbeat and ends once the final chord has faded. |
| Lo-fi cafe bed | 80 bpm | Each quote's cut moves to the nearest half beat after the line, and the cue starts so its groove enters on the first cut. |

Every cut is snapped as an absolute time, and assembly lands each clip on its
planned frame, so nothing drifts over the length of the opening. The opening
ends where the cue has faded, rather than mid-decay or after it. The motion
style's graphics also move on the beat: the stop-motion zoom steps land on
beats, the plane bobs, place pins bounce, and the sign-off's sparkles pop. A cue can be used with any
style; the style then follows that cue's grid. Your own music has no known
grid, so it keeps the template's own timing.

## Controls

- **Style** - three preview tiles; the unavailable one dims when a Project has
  no analysed speech.
- **Music** - one of three bundled cues, a cinematic score, a playful vlog cue
  and a lo-fi cafe bed, each recommended for one style and chosen with it by
  default; **Your own music**, which opens a drop zone for a file from disk
  that is imported when the opening is built; or no music. Press the play
  button to hear a six second excerpt.
- **Cinematic black bars** - 2.39:1 bars, on by default for the whip style.
- **Mute location audio** - on for the two picture-led styles, off for quotes.

Titles start from the Project name. Every title, label and watermark is an
editable parameter on its layer, so the text is changed in the Inspector with
live preview rather than typed into the panel.

## What it needs

Analysed video in the open Project. The quotes style additionally needs
analysed speech. The motion style samples colours with `ffmpeg`, and music
previews use `ffmpeg` too; without it the palette falls back to a built-in one
and previews of your own file are unavailable; the bundled cues'
previews are embedded and always play. A chosen cue or file is imported into the
Project once and reused on later builds. Building always creates a new Draft and
never edits an existing one.
