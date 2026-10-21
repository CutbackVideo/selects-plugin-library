# Politics source video (16:9)

`templates/politics-landscape.json` is included in Chosun Ilbo pack 1.4.0.
It is based on the supplied 1280x720, 51.375-second KakaoTalk reference, not a Premiere project.
Requires Shortform Clips 0.6.0 or later (template API 6). The approximations below
remain explicit while the template is available through ordinary pack installation.

- Preserve source aspect ratio and camera cuts, with no automatic portrait crops or splits.
- Enter event title/date and source credit in Framing. Blank credits remain blank.
- Map exact transcript speaker labels to supplied names, roles and colors. Unmapped speakers have no nameplate. A reaction shot must not change the named speaker.
- Outputs separate editable title, source, caption and speaker graphics on a 1280x720 canvas. Captions share one track; nameplates share a separate track above them, including across speaker changes and gaps.
- One source video per build. Edited or synchronized timelines are intentionally rejected until speaker identity can be mapped per resource.

The video window, title plate, caption bar and nameplate positions are measured approximations. The background gradient and Pretendard are substitutes. Request the original background, exact font and Premiere project plus clean source footage for fidelity validation. The supplied finished video must not be used as clean footage underneath a second set of captions.

Tests: `SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test plugins/shortform-clips/tests/landscape_template.test.cjs`.
Renderer source is in `../../landscape`; run `node plugins/shortform-clips/landscape/sync.cjs` after edits to synchronize the standalone panel and generated Draft script.
