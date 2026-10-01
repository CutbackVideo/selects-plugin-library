# Style spec: Chris Williamson, "Everything Is In Your Control"

Measured frame by frame from the 608x1080, 30 fps, 43.5 s download (YouTube Shorts aGpDn6xtvQw).
Fractions are of the 9:16 frame; values in 1080x1920 are given where useful.

## Framing and look

- 9:16, full-bleed. The speaker is a tight punch-in: medium shots put the face at ~45 % of the width,
  tight ones ~1.3x closer, cropped at the forehead; eye line near 36 % of the height.
- Talking-head shots alternate framings every 3-6 s even without B-roll. Slow push-in (~6 %) per shot.
- Warm, low-key grade: crushed blacks, warm skin, soft vignette, light grain.
- A second camera (e.g. the interviewer or a two-shot) is framed on the face in that shot.

## Captions (all centred, line at 50 % of the height, no box, no shadow, no motion)

- Phrase: heavy grotesque (Helvetica Neue / Inter Bold look), white, 44 px of 1920 in the reference (the plugin sets 53 px, 20 % larger, at the editor's request), tracking -0.02 em.
  The line is laid out for the whole phrase from its first word, so words fill in left to right and nothing
  already on screen moves. A new word shows at ~55 % opacity for 3 frames, then white (a step, not a fade).
  A phrase resets at a pause (> 0.55 s), sentence end or ~6 words / 32 characters.
- Keyword: every ~3-4 s one word or short phrase replaces the phrase line on its first frame, tracking
  -0.04 em, no scale, no fade, no shadow; holds ~0.45 s past the spoken word. Its size follows the word
  (re-measured 2026-09-30 on the 1080x1920/60 fps download): long words are laid across ~76-79 % of the
  width ("internal" 820 px wide ≈ 245 px font, "psychoanalyst" 855 px ≈ 125 px font), short words stop
  near 215-230 px ("simple"); "dopamine" over the speaker is ~140 px. The plugin uses
  size = clamp(0.76 × 1080 / text width in em, 110, 230).
- Over the speaker, keywords are plain white. Over B-roll they show the picture colour-inverted through the
  letters (measured: text pixels ≈ 255 − background on "achieve it" and "internal"), softened.
  Inversion only reads when the picture under the line is clearly dark, clearly light or saturated (the
  reference's forest, brain, red track, iris); on neutral mid-grey footage the inverted letters land on the
  same grey ("psy" of "psychoanalyst" over the beige wall is already the weakest case in the reference).
  The plugin measures the band (ffmpeg signalstats, mean luma/saturation over the keyword's seconds) and
  on neutral light footage (saturation < 45, luma > 140) darkens the inverted fill (brightness 0.55); the
  letters stay inverted footage in every case (no white fallback, per Hyun). Exposed on the clip as Letter
  fill brightness / Letter white wash.

## B-roll

- ~13 cutaways in 43 s, 1-3 s each, hard cut on the keyword; B-roll is on screen about 60 % of the time.
  Full-bleed 9:16, same warm grade. The plugin's floor is 80 % of keywords with B-roll, each held to the
  next keyword (1.3-5 s), which lands at the same coverage or above.
- Literal or clearly metaphoric pictures of the word: a runner, a brain, an eye, a marathon podium.

## Double inversion (4 in 43 s: 10.2 s, 20.0 s, 30.6 s, 38.2 s) — reference only; removed from plugin

- On a highlight cut: the last outgoing frame is colour-inverted (text included), the first incoming frame
  is normal, the second incoming frame is inverted, then normal.
- Sound: a faint tick on the first inverted frame, then a loud double click ~40 ms later (camera shutter).

## Audio

- The reference adds a shutter click. This plugin preserves original audio without adding a click.
- Latest user instruction (2026-09-29): remove all full-screen inversion and shutter clicks. This supersedes the earlier always-on request. Letter-only inversion remains.

## Font comparison and implementation units (2026-09-29)

- Reference sample: “brilliant” at 1.000 s, crop x=291,y=525,w=91,h=34 in the measured 608×1080 file.
- Inter ExtraBold: ink IoU 0.818, tracking −0.03 em; Helvetica Neue Bold: 0.787. This ranks the tested
  candidates on one sample; it does not identify the original font.
- Embed Inter and expose the font/weight in each clip. All reveal durations are seconds,
  then rounded to the output Draft's frame grid (3/30 s becomes 6 frames at 60 fps).
- B-roll may be video or photography. Preserve moving footage; report any photographic substitute.
