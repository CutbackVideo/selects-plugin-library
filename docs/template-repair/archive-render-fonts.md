# Archive render fonts and authored readiness

The original title and credit prepared fonts only on initial mount. A valid
same-instance Latin-to-Hangul edit could immediately measure new glyphs without
preparing their font request. Native preview/export also checked images and
document fonts without honoring authored Remotion handles or cancellation.

Anton/Oswald switching alone is healthy: both bundled faces are initially
prepared. Text limits, font metrics, positioning, colors and animation remain
template policy.

The canonical owner is shared/render-fonts.js, delivered into the two standalone
Archive assets by the checked module generator. Existing file/Audio/Worker and
saved-run owners have different lifetimes from a graphic rendered later.
Eight surveyed render programs share this responsibility; only Archive's two
reviewed programs adopt it here. The managed pool has ten modules and the same
fourteen template consumers.

Trace one input through the actual ownership comparison
result?.request === request. R1/R2/R3 below are explanatory names.

| Input | Result and release |
| --- | --- |
| Title A, request R1 | Prepare R1 fonts, measure, commit SVG, release its gate |
| Change to another text, R2 | R1's ready result cannot ready R2 |
| Return to A while R2 is pending, R3 | Matching text cannot revive retired R1 |
| R3 completes | Check current identity and monotonic deadline, commit, then release |
| Failure, deadline or release failure | Cancel the document; recover through a fresh document |

Only committed layout effects allocate gates. All promise rejection handlers
exist before host font calls execute. Cleanup retires only the owned timer/handle;
late replies cannot publish. A late success cannot beat an overdue timeout.
The caller keeps CSS declarations and layout. FontFaceSet matching is not byte
attestation; system-font requests can legitimately return no downloadable faces.

Original-source reproductions fail before the repair: two Archive glyph-change
cases and four native callback handle/cancellation cases. Eight additional
intermediate failures cover request return, font-set replacement, elapsed
deadline and synchronous load failure before handler attachment.

Validation:

- 28 actual Archive component/owner checks and 16 standalone delivery checks.
- 22 app readiness-owner/actual-frame-callback checks.
- 26 cases using current-source bundles in Electron 43.2.0, actual Player and
  production preloads: a delayed real same-origin WOFF2 response, failure,
  deadline, later-frame refusal and fresh-document recovery.
- Twelve old/current image comparisons, preview/export times title/credit times
  three presets, were pixel-identical. Same-Player Latin/Hangul/return was checked.
- Capture observes actual offscreen paint and releases textures. Initial harness
  window-lifecycle/capture errors were retained, fixed and rerun.

Private evidence is in clip-highlights-analysis/repro-20261023/archive-render-fonts:
479 source hashes, original/current images, RED/GREEN logs, runtime receipt and
owned-profile cleanup. Two other tasks' Electron processes and shared development
dependencies were preserved.

This proves standalone renderer integration, not installed full-app UI,
Project/Draft saves, whole video/audio playback, encoded-video export, Windows,
malformed metrics or multi-instance SVG IDs. Full-template acceptance remains
0/28; Chan is excluded. Continue in existing template #346 and app #7876.
Current upstream develop conflicts remain a separate integration prerequisite.
