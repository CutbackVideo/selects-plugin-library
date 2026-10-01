---
name: chris-williamson-style
description: Make an editable Chris Williamson podcast short with independent phrase and keyword clips, visually checked B-roll, face framing, without full-screen flashes or shutter sounds. The original Draft is never changed.
triggers: ["chris williamson style", "chris williamson", "modern wisdom style"]
---

# Chris Williamson Style

Reference: “Everything Is In Your Control”, YouTube Shorts `aGpDn6xtvQw`.
Read [style-spec.md](style-spec.md) for measured timing and font-match evidence.

## Use

Open a talking-head Draft and choose **Apply Chris Williamson Style**. If the Draft has no transcript yet,
the first click starts Selects transcript analysis and continues when it is ready. The open Draft itself
is styled and reframed to 9:16; no copy is made, and a rerun replaces the earlier pass. In Clip highlights
a picked timeline is styled in place the same way; a picked video goes whole into a new Draft
(`… · Chris Williamson Style`), which is styled.

B-roll density: at least 80 % of the keywords cut to B-roll, spread evenly over the clip (the planner is
asked for that share and spread, and the panel fills any shortfall with a plain "<keyword> photo" search on the
keyword in the middle of the longest bare stretch); each cutaway runs from its keyword to the next one, 1.3-5 s.
Each query gets one AI browsing turn (4 min, stock sites before Google, candidates saved to
`runs/<job>/search/` as they are found); a keyword still without a picture gets a second search with the
planner's broader query. The report gives the longest stretch left on the speaker. Big keywords are sized from their measured width and never pass 90 % of the frame; at the
end every keyword is rendered and one that still runs past the frame edge is set 15 % smaller (two rounds).

## Output

- Independently editable phrase and keyword clips, including keywords over B-roll. Phrases are 53 px of
  1920 (20 % above the reference's 44, the editor's choice). Text, font,
  size, colour, position and reveal timing remain Inspector parameters.
- Measured face framing and per-clip look. Camera cuts are detected on a clean Main timeline;
  the SDK's global razor is avoided when it would split unrelated overlays.
- Project B-roll first, then web candidates. Candidate subject and crop are visually reviewed,
  then the actual rendered vertical crop is checked. Moving clips stay moving. Photograph
  substitutions and unknown web licences are reported; sources are in `CREDITS.json`.
- No full-screen inversion flashes or added shutter sounds. Keep color inversion confined to B-roll keyword letters.
- Styling also cleans legacy full-screen flashes and shutter clicks from the target Draft.
- Inter ExtraBold is embedded as the closest measured candidate from the recorded comparison;
  it is not claimed to be the identified original font. See `fonts/OFL.txt`.

## Background music

The reference bed is Radiohead's "Everything In Its Right Place", which cannot be licensed. The editor chose
Kevin MacLeod's **"Wisps of Whorls"** (electric piano and synths, 14:16, CC BY 4.0) as the closest open match.
Every run fetches it once into
`~/.selects/plugin-data/chris-williamson-style/music/wisps-of-whorls.mp3` from
https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wisps%20of%20Whorls.mp3, imports it into the
Project folder "Chris", and lays it under the whole Draft as one audio clip (starts 12 s into the track,
level -5 dB, 1.5 s fade in, 3 s fade out). The clip
is labelled "Chris Williamson · Wisps of Whorls [cws:music]".

Attribution is required. Put this in the video description:
`"Wisps of Whorls" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/`

Other open candidates with a similar feel, if the editor wants a change: Kevin MacLeod "Clean Soul",
"Late Night Radio", "Mana Two - Part 1", "Floating Cities" (all CC BY 4.0, incompetech.com); Lee Rosevere
"Gone", "How I Used To See The Stars", "Slow Lights" (CC BY 4.0, Music For Podcasts - Ambient, Free Music Archive).

## Verification

Every run reads the saved Draft back and captures representative frames. The panel requests a
visual check through Selects AI and reports structure, render and visual review separately.
A failed/unavailable visual check is visible, never called a verified result.
Final export stays in **Handoff → Export**.
This does not prove the entire video's frame-by-frame quality. Exercise an Inspector edit when
validating a plugin change; a successful capture alone does not prove Inspector usability.

Run records and media live under `~/.selects/plugin-data/chris-williamson-style/`. Do not delete
media still used by a Draft. Records track completed and pending placements. Review warnings before delivery.

## Maintenance

Edit the files in `src/`, then run `python3 build.py` to assemble the installed single-file panel.
Supporting engine programs stay beside this Skill. Do not edit only the generated panel.
