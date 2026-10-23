# Jude card transition and visible faces

The centered card text began at the same frame as a translucent cream background.
In the retained 23.976-fps example the card starts at frame 443, its first word
ends at 451, and the background is only 50% opaque at frame 447. The ordinary
caption face-clearance pass deliberately skips full-screen cards, so it cannot
resolve that visible source-face/text overlap.

The card's `fadeSeconds` is now zero. Its first frame hides the source video
before the centered words appear. The full-screen cream/red card, circle and
expansion timings, caption content, typography, placement and speech timing stay
the same. **The introductory crossfade is removed.** Existing saved Drafts are
not rewritten; the change applies to newly generated cards.

`card-face-transition.test.mjs` runs the whole production module and the actual
card TSX with real React static rendering. A one-field historical policy replay
reproduces opacity 0, .125, .5, .875 and 1 at the recorded boundary frames. The
new policy is opaque from the first frame, including a card at frame zero and
multiple output sizes/frame rates. All other placement output, renderer markup
except opacity, caller plan values and event clocks must remain identical.

These are source/renderer regressions. Saved-composite A/B, actual playback and
export remain separate acceptance gates. The change does not establish that all
other face observations or caption layouts are safe.
