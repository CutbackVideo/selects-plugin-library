# Visual team originals received 2026-10-23

Money Watch, History War and Villain now use the customer-supplied 1080x1920 PNG frames, without re-encoding. Logos, release schedules and borders are embedded in these frames, so separate logo and border layers are disabled. Original source videos and rendered reference MP4s were not supplied.

| Program | Applied Premiere settings |
| --- | --- |
| Money Watch | ROKAF-Sans-Bold, 89.831604px; white / #26D8A4; tracking -40/-25; stroke 2px #04503A; point-text anchor x=537.0132, first baseline y=363 |
| History War | SDGdMyeongjo 100px; #151515 / white; background #FF5354; tracking -51/0; baselines 334/470 |
| Villain | ROKAF-Slab-Serif-Bold 100px; white / #151515; background #E2BA5A; tracking -111/-92; baselines 334/470 |

Tracking is converted from thousandths of an em to pixels. Baseline positions use the existing renderer's approximate center conversion. Existing original-caption policy and editorial prompts are unchanged.

## Remaining checks

- Money Watch's horizontal text scale of 95% is not yet supported by the template renderer; it is not silently substituted by a font-size change.
- Background box padding and precise shadow/baseline rendering still need native Premiere comparison. Existing renderer approximations remain.
- CoreText finds SDGdMyeongjo locally but not ROKAF-Sans-Bold or ROKAF-Slab-Serif-Bold. The exact font names remain in the templates for machines where they are installed.
- The Money Watch project references a frame under a different filename. The received PNG is used as instructed; binary identity with the missing project reference is unverified.
- Local comparison HTML uses a video placeholder, not an unrelated program's footage. Reports, project files, videos and screenshots stay outside Git.
