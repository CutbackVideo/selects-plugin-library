# Vlog Opening

Builds a 12-22 second vlog opening as a **new Draft**, in one of three styles,
from the analysed footage of whatever Project is open. Nothing is hardcoded to a
particular shoot: the panel picks shots by searching the Project's own analysis,
so the same button works on a trip, a wedding or a product shoot.

## The three styles

With the style's own cue (the default, and always in a template run), Whip cut and Motion graphics build the team's
reference timeline for that style, frame for frame in a 25 fps Draft (other frame rates scale every frame by round(f x fps / 25)).
Only the shots, found by scene search, and the words, from the Project name and the Draft's chapter titles, come
from your Project.

| Style | What it makes |
|---|---|
| **Whip cut** | 12 shots, 14.6 s: a blur-in opening shot, Flare transitions at the first hit (2.04 s) and at 7.84 s, the Film stock look on five shots, slow push-ins on three, 2.39:1 bars that open over the first two seconds, and the title in large type over the closing shot. Muted Piano Motif from 0.36 s plays to 15.56 s, past the picture. |
| **Motion graphics** | The first shot plays on a hand-drawn laptop on a checkered tablecloth and the camera zooms into the screen like stop motion; the shot continues full frame, an illustrated sky fills 1.76 s, a place label taken from the chapter title drops onto the next shot, and the title writes itself on over the closing shot. 17.6 s, Buant Groove from its start over 0.44-17.0 s. |
| **Funny quotes** | A cold open: an iris opening on the first line, a script title, a watermark, then a run of talking-head lines picked from the transcript, cut on the Lo-fi cafe bed's beat (below). Clip dialogue is kept rather than muted. |

Every opening ends with a 0.6 second fade to black so it cuts cleanly into the next timeline. When the picked
footage gives fewer shots than a reference has, the build falls back to the cue's beat grid below.

In a template run, Whip cut and Motion graphics use the first usable selected video's display size as the output canvas, in selection order. An unrelated open timeline no longer changes a landscape selection into a portrait result. Funny quotes and the manual panel retain their existing canvas behavior.

## Why the result is repeatable

Shot choice is a pure function of the Project's stored analysis: candidates are
ranked by score, ties are broken by resource id and timecode, one clip is used
per role before any clip repeats, and windows are clamped to the source. There
is no randomness and no time-based seed, so the same Project with the same
settings produces the same cut. Scene search is retried across several passes
because the backend drops requests when the app is busy; any clip that never
answers is reported rather than silently skipped.

## Cutting on the beat

Any other music, or the bars switched away from the style's default, cuts on a beat grid instead:

| Cue | Tempo | Structure the cut follows |
|---|---|---|
| Muted Piano Motif (69.7 s, played in full) | 83 bpm, measured when the build starts | The middle (travels, burst, montage, scenics, people) repeats to fill the song; the opening shot holds through the swell and cuts on the first hit; cuts then land on beats, the burst on half beats; the title card arrives on the final hit and holds until the cue has faded. Joined with directional smear transitions and two white flashes around the burst. |
| Buant Groove (70.8 s, played in full) | 126 bpm, measured when the build starts | Cuts on bar lines, the opening phrase (travel, scenic, scenic, montage) repeating to fill the song; the desk push-in lands on the first bar line, labels drop in on their cut, and the sign-off starts on the last downbeat and ends once the final chord has faded. |
| Lo-fi cafe bed | 80 bpm | Each quote's cut moves to the nearest half beat after the line, and the cue starts so its groove enters on the first cut. |

Every cut is snapped as an absolute time, and assembly lands each clip on its
planned frame, so nothing drifts over the length of the opening. A cue can be used with any
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
analysed speech. Off the reference layout, the motion style samples colours with the app's bundled
`ffmpeg`, and music previews use it too; if that fails the palette falls back to
a built-in one and previews of your own file are unavailable; the bundled cues'
previews are embedded and always play. A chosen cue or file is imported into the
Project once and reused on later builds. Building always creates a new Draft and
never edits an existing one.
