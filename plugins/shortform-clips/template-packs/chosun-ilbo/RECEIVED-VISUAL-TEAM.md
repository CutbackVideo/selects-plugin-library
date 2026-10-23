# Visual team originals received 2026-10-23

Money Watch, History War and Villain now use the customer-supplied 1080x1920 PNG frames, without re-encoding. Logos, release schedules and borders are embedded in these frames, so separate logo and border layers are disabled. Original source videos and rendered reference MP4s were not supplied.

| Program | Applied Premiere settings |
| --- | --- |
| Money Watch | ROKAF-Sans-Bold, 89.831604px; white / #26D8A4; tracking -40/-25; stroke 2px #04503A; point-text anchor x=537.0132, first baseline y=363 |
| History War | SDGdMyeongjo 100px; #151515 / white; background #FF5354; tracking -51/0; baselines 334/470 |
| Villain | ROKAF-Slab-Serif-Bold 100px; white / #151515; background #E2BA5A; tracking -111/-92; baselines 334/470 |

Tracking is converted from thousandths of an em to pixels. Money Watch and Villain use the existing renderer's approximate center conversion; History War uses explicit baselines as described below. Existing original-caption policy and editorial prompts are unchanged.

## Remaining checks

- Money Watch's horizontal text scale of 95% is not yet supported by the template renderer; it is not silently substituted by a font-size change.
- Money Watch and Villain still need native Premiere comparisons for precise shadow/baseline rendering and box padding.
- CoreText finds SDGdMyeongjo locally but not ROKAF-Sans-Bold or ROKAF-Slab-Serif-Bold. The exact font names remain in the templates for machines where they are installed.
- The Money Watch project references a frame under a different filename. The received PNG is used as instructed; binary identity with the missing project reference is unverified.
- Local reports include both initial placeholder previews and matched six-second long-form/Short comparisons for all three programs. Reports, project files, videos and screenshots stay outside Git.

## Original landscape footage

These three presets disable automatic reframing and splits. Static placement fits the complete 16:9 source within the existing video window, centered with no speaker zoom. History War expands its source-coordinate range slightly to avoid cropping the left/right edges in its taller window. Other source aspect ratios require separate placement verification.

## History War baseline correction

History War now uses explicit point-text baselines at y=334/470 and x=535.4997 instead of the approximate shared title center. It measures the installed font at 100px, preserves -51/0 tracking, and pads the actual ink bounds by 10px for the second-line background. The title position control moves both baselines together. Native Premiere comparison results and the remaining published-Short width difference are documented below.

## Native Premiere verification (2026-10-23)

Exported two 1080x1920 PNG frames directly from Premiere Pro 2026: original project wording and a copy with only the headline wording changed to the published Short. The first-line ink widths were 905/907px (Premiere/browser) for original wording and 906/908px for Short wording; background box widths matched at 988 and 778px respectively. Position/height edges differ by 1-2px under threshold-based measurement. The published Short first-line width is approximately 851px at the same 95px ink height, so its style differs from the supplied project; the exact tracking or horizontal-scale adjustment is unknown. No per-video squeeze was applied. Native exports and comparisons remain in the local test-run folder.
