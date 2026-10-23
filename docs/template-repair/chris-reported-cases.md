# Chris reported-case checkpoint — C-20 / C-21

SDK/application changes remain excluded. This checkpoint uses controlled substitute
media, as authorized, and does not accept the complete Chris template or any
other caption template. Chan's apps are unchanged.

C-20 had two distinct problems. Ordinary phrases always used white, even over a
bright verified B-roll asset; keyword-only inverted letter fill is a separate
path and is preserved. The `inversions` report count measures full-frame pulses,
so zero alone was not evidence that the keyword fill adjustment failed. The
visual verifier inspected only the first phrase/keyword and missed later phrases.

A phrase wholly contained by one verified cutaway now uses the existing caption
band probe on that asset's local, half-open phrase interval. It chooses white or
dark fill from the measured band. Font, geometry, reveal, keyword inversion and
source timing are unchanged. Unknown measurements and phrases crossing picture
changes retain the old fill and explicitly request saved-Draft review. Completed
preserved phrases retain user edits without extra probes or graphic writes.
Band averages do not guarantee readability on every heterogeneous/moving pixel.

Verification now includes each caption's last visible frame, in contact sheets
of at most eight frames. The 64-frame cap explicitly leaves visual verification
unverified when coverage is incomplete; it cannot silently become a complete pass.

C-21's panel discarded the pipeline's warnings and displayed only ready. It now
keeps the saved Draft ID and shows the existing warning text alongside the result.
The headless `finishTemplate({sequenceId})` contract is unchanged. The host's
headless warning-delivery limitation remains open; a saved result is not converted
into an error or retried to work around it. No extra AI search/submission is added.

## Observed evidence

- Eleven focused regressions pass: bright/dark fill, source-local intervals,
  fractional rates, short intervals, unknown/mixed backgrounds, preservation,
  late verification, bounded coverage, visible warnings and headless contract.
- Related Chris packet: 84 pass, one existing optional typecheck skip. Broader
  caption/shared-AI packet: 148 pass, two optional skips. Groups overlap.
- Actual isolated Selects renderer: baseline shared client fails one injected
  status timeout; current client recovers with one submission, two status reads
  and no cancellation. Replies are controlled, not model inference.
- Actual app: two saved two-second, 60-frame 1080×1920 Drafts use identical
  production Caption TSX, embedded font, geometry and reveal. Native saved-frame
  capture and both MP4 exports succeed; all output frames decode. At 6,543
  interior glyph pixels, the measured exported contrast changes from 1.1406:1 to
  16.4003:1. The production band probe observes Y=222 and chooses the dark fill.
- Full Chris AI/search/planning/panel execution, original footage, native playback,
  depth matte export, other caption design reports and Windows remain open.

Private evidence lives under `reported-cases/caption-agent/`, including
`case-summary.json`, `C-20-native-check.json`, saved readbacks/captures/exports,
`C-28-actual-renderer.json`, and the before/after reproduction harnesses. A failed
harness attempt that read the wrong commit-result ID field is retained; its saved
Draft was read back and reused instead of authored again.
