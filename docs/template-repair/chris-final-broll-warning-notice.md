# Chris final B-roll warning summary

A real saved result contained eleven warnings, including six final messages that
no visually verified B-roll was available and the speaker was kept. Its notice
showed caption contrast and framing only: the formatter recognized B-roll
`rejected`/`failed` text but missed the final-unavailable producer messages. The
presence of another recognized category also suppressed the generic fallback.

The notice now explicitly summarizes final-unavailable B-roll. Existing black
lead-in and review-failure rows remain first; the fallback row is independent,
so another category cannot hide it. A retained-existing-cutaway warning uses a
neutral retained-footage sentence, rather than claiming the speaker was kept.
The warning count, original report, saved Draft ID and confirm/dismiss behavior
remain unchanged. The existing 480-character location fallback remains intact.

Producer audit covered `assets.ts`, `pipeline.ts` and the asset engine:

| Producer | Saved meaning | Notice treatment |
| --- | --- | --- |
| No visually verified B-roll; kept the speaker | Final cutaway missing | Speaker retained |
| Same warning rewritten for B-roll-only scope | Existing cutaway kept when available | Retained footage |
| No visually accepted candidate / video shorter than planned cutaway | Final asset unusable | Retained footage |
| Final crop could not be verified; omitted | Final review unavailable | Review failure first, retained footage next |
| Speaker stays on screen without B-roll; no usable picture | Final gap; no counts metadata required | Speaker retained |
| Search failed, then trying Commons | Search-stage issue, not final asset outcome | No invented final-missing/review-failure claim |
| Verified photo substituted / license unverified | Substitution or attribution issue | Original full report remains available |

The pipeline's existing retry policy removes first-pass warnings for queries
successfully filled on retry. This change does not alter that policy, search,
media selection, saving or style generation. Unknown warnings keep the generic
report path. It does not assert that the existing result passes visual quality.

Whole-production-panel fixtures cover the genuine eleven-warning corpus in
English/Korean, other producer forms, mixed priorities, maximum message length,
long report locations, unrelated warnings, no-warning behavior, and dismissal
without changing the saved result. Actual dialog rendering is a separate root
verification step; no new pipeline or AI invocation is part of this fix.
