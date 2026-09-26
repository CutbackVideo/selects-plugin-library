# Vlog Opening

Builds a 12-22 second vlog opening as a **new Draft**, in one of three styles,
from the analysed footage of whatever Project is open. Nothing is hardcoded to a
particular shoot: the panel picks shots by searching the Project's own analysis,
so the same button works on a trip, a wedding or a product shoot.

## The three styles

| Style | What it makes |
|---|---|
| **Whip cut** | A fast montage: a long opening shot, a travel beat, four quarter-second burst cuts, then landscape and people beats. Cuts are joined with authored directional smear transitions, two white flashes around the burst, optional cinematic black bars, and a title card. |
| **Motion graphics** | A push-in out of an illustrated device screen holding the first shot, an illustrated flight beat, hand-drawn place labels taken from the Draft's chapter titles, and a handwritten sign-off over the closing shot. Its palette is sampled from the clips it chose. |
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

## Controls

- **Style** - three preview tiles; the unavailable one dims when a Project has
  no analysed speech.
- **Length** - short, standard or long, scaling the beat template.
- **Music** - one of three bundled cues, a cinematic score, a playful vlog cue
  and a lo-fi cafe bed, each recommended for one style and chosen with it by
  default; any audio file already in the Project; your own file, dropped or
  picked below the list and imported when the opening is built; or no music.
  Press the play button to hear a six second excerpt.
- **Cinematic black bars** - 2.39:1 bars, on by default for the whip style.
- **Mute location audio** - on for the two picture-led styles, off for quotes.

Titles start from the Project name. Every title, label and watermark is an
editable parameter on its layer, so the text is changed in the Inspector with
live preview rather than typed into the panel.

## What it needs

Analysed video in the open Project. The quotes style additionally needs
analysed speech. The motion style samples colours with `ffmpeg`, and music
previews use `ffmpeg` too; without it the palette falls back to a built-in one
and previews of Project or dropped files are unavailable; the bundled cues'
previews are embedded and always play. A chosen cue or file is imported into the
Project once and reused on later builds. Building always creates a new Draft and
never edits an existing one.
