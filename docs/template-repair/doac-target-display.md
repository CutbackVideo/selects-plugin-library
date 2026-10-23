# DOAC target display

C02's actual full-panel observation showed no source Project or Draft name.
`CaptionPanel` queried `sourceName`, but its JSX never rendered that state.

The panel now reads the captured Project's metadata and only reads Draft names
that belong to that Project. It labels the current Project/Draft separately
from a restored or running caption job's source/result Drafts. The existing
create, resume, edit and storage behavior is unchanged. Metadata calls are
read-only and cannot submit AI, create Drafts or move focus.

The display snapshot is keyed by Project, current Draft and captured job IDs.
A render immediately hides a previous target's name. Per-effect liveness and
the latest target key reject late success/failure responses after focus,
Project, host SDK or mount changes. Missing or failed names show explicit
unavailable guidance; they never reuse the previous name. New labels use a
local English/Korean map and follow the current panel language.

## Verification

`tests/doac_target_display.test.mjs` compiles the whole production panel with
real React. The host metadata/storage boundaries are controlled; one test
replaces only expensive caption generation with a held operation. Tests cover
current names, reordered replies, Project switch with the same Draft ID,
SDK switch, failed/missing metadata, no Draft, language change, unmount with
zero late state writes, restored uncertainty and busy creation retaining its
original captured source. The old production panel fails the first rendered
name assertion; all ten tests pass with this change.

Existing `critical_panel_storage.test.mjs` is 23/25 on both the original
integration base and this change: two pre-existing function-excerpt fixtures
omit `stableCaptionPayload`. No shared test or product helper was changed here.
The baseline public check likewise has four existing photo-family findings;
these DOAC files add none. Runtime physical UI verification is tracked
separately by the parent agent; these React tests are not an E2E claim.
