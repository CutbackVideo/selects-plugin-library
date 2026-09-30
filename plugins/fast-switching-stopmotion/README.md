# Fast Switching Stop Motion

Builds a fast outfit-switch "stop motion" edit as a **new Draft** from the
selfie videos in the open Project. Short moments (about 0.14 s each) from each
chosen video are interleaved round-robin, A → B → C → … → A, and looped to about
5.6 seconds, over the template's own music track. Every cut stays a separate,
editable clip; export with Handoff → Export as usual.

## How it works

1. **Choose videos.** Each checked video becomes one beat of the loop, in list
   order. Two or more are needed; four to seven, one outfit or look each, give
   the intended effect.
2. **Find moments.** For each video, `ffmpeg` measures frame-to-frame motion to
   rule out frozen and blurred windows, and six candidate moments are spread
   evenly across the take. The Selects AI then looks at a contact sheet of the
   candidates and picks the two best-posed ones per video (face clear, eyes
   open, posing to camera, nothing covering the face). If the AI pick is
   unavailable, the two best motion candidates are used and the panel says so.
3. **Cut.** Cut boundaries follow the Draft's own frame rate, so the rhythm
   holds at 24, 30 or 60 fps. The two moments of each video alternate between
   loops.
4. **Sound.** The clips' own audio is muted (switch on **Keep original sound**
   to keep it) and the bundled music is laid under the whole Draft.

## Fixed settings

The cut length (138 ms), total length (about 5.6 s) and music are fixed to
match the template's look. They are constants at the top of `panel.tsx`.

## Limitations

- Tested only on a macOS development build of Selects with 24 fps, vertical
  (9:16) selfie videos. Released builds, Windows, mixed orientations, rotation
  metadata, HDR and slow-motion sources are unverified.
- The Draft takes its frame size and frame rate from the first chosen video.
- Moment picking judges people and faces; other subjects (pets, products) may
  get arbitrary picks.
- Very long takes only offer six evenly spaced candidates, so the best moment
  can be missed.
