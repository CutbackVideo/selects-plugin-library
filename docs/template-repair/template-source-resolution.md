# Mini/Archive Vlog: observe source resolution and native Image facts

Mini Vlog 0.1.0-alpha.12 and Archive Vlog 0.1.0-alpha.7 reuse the existing
native-image-input feature for their handed-source boundary. The feature pool
stays at five; Archive becomes consumer twelve. All 28 templates remain in
scope, none complete; Chan's apps and template packs are excluded.

## Concrete failures and scope

The app hands a template kind, persistent Resource ID and name, without a file
path. The SDK projects short aliases for inventory/assembly. A name/array-order
join cannot establish identity when names repeat. The existing solution uses
private unsaved Draft placement to observe the SDK alias. This change repairs
that boundary, without adding a public SDK method or guessing an ID mapping.

Mini swallowed placement exceptions and interpreted an empty resolved list as
"None of the chosen files could be found". Archive retained a bounded message,
but its general failure heading still asserted file absence. A failed source
timeline lookup, settings mismatch, unavailable metadata or unconfirmed reply
does not prove that a physical file is missing. These are reproducible code
paths; the original C-09 report's actual cause/environment remains unverified.

Both implementations also retried whole-resource insertion after any short-range
exception. If placement completed but its reply was lost, the retry created a
second clip in the private scratch Draft. The caller then retried unresolved
batches, and its generic read runner could replay empty/session-error responses
even though a scratch check modifies a working copy.

Actual Image verification exposed a separate intermediate-data defect: a
96-by-160 PNG was returned as 1920-by-1080, the scratch canvas size. The alias
helper used `draft.meta().frameSize` as original photo dimensions. Later
inventory may override that value on some SDK paths, so this observation alone
does not establish a distorted final video on every path.

## One existing input feature, explicit evidence

`resolveTemplateMedia` observes private working-copy clips before/after one
placement. A positively observed single alias can recover a lost completed
reply without insertion replay. No clip, invalid/ambiguous aliases, unknown
readback and actual placement/creation/metadata errors remain distinct failures
with phase, bounded code and up to 300 characters per diagnostic message.
No source check commits or modifies an existing saved Draft.

Only the SDK's pre-mutation `invalid_source_range` validation authorizes the
existing whole-source fallback for a short file. An arbitrary error or empty
observation cannot authorize it. This is observation, not a global transaction
or proof that every lower transport layer dispatches at most once.

Photo aliases are resolved to an exact Project path by
`nativeImageSourcesById`, then verified by the existing `nativeImageSources`:
Resource type/identity, source dimensions, actual stat/read availability and
stable file observations. The scratch canvas is not used. Explicit ID matching
allows a known selected Image to coexist with another Resource at the same
path. The old three-argument Image API keeps its strict path-ambiguity contract;
the new ID mode is opt-in. No filename/ordinal join or image-format-specific
decoder is added. Unsupported SDK photo facts/checks stop explicitly rather
than returning guessed dimensions.

The browser-side source step reuses the existing single-dispatch
`nativeImageRun` transport. Its optional fallback message preserves existing
Image callers' default. Ordinary read retries remain in the old template runner;
source checks bypass that runner and do not re-run unresolved batches.
`validateTemplateMediaResult` requires exactly one outcome for each requested
ID, rejecting clipped, foreign, duplicate or contradictory replies before use.

Mini keeps structured diagnostics and uses the existing localized step-failure
message. Archive replaces its general missing-file heading with that same
localized step message, retains bounded detail and its existing not-local-source
special case. That legacy availability mapping is preserved, not newly verified
as proof of physical absence. Partial-source policy remains unchanged: valid
resolved sources can continue while failures are logged.

Canonical module markers generate both installed panels. The SDK script embeds
only the needed input functions; it imports no repository file at runtime.
Existing photo consumers are synchronized. Gallery is rebuilt for the backward
compatible native Image signature; previous Image callers retain default
behavior. There is no new public SDK, IPC, Electron capability or binary version
change. New consumers use existing SDK/native photo capabilities and fail when
those facts are unavailable; released/Windows compatibility still needs its
own runtime evidence.

## TDD and checks

- Against exact parent `8d69070520f0c416f38e55996efddfd81f322749`, the first
  twenty two-consumer source cases fail sixteen and retain four controls.
- With source observation fixed, the caller/replay layer still fails eight of
  thirty cases. After repair, all thirty pass; ordinary-read retry controls stay.
- Comparing actual PNG dimensions introduces two further RED cases, then fixes
  both through native facts. A duplicate-path/known-ID case also fails first;
  it passes with explicit ID matching while the old ambiguity control passes.
- The final forty focused checks cover source outcomes, fallback/unknown-state
  behavior, both template callers, reply completeness, SDK script compilation,
  source dimensions and previous-consumer compatibility. All forty pass.
- Mini/Archive existing files plus the new scenarios: 71 tests across 32 files,
  zero skips. Related photo/input/run/assets/Gallery/Mini-audio consumers:
  966 tests across 35 files, zero skips. Counts overlap and are not additive.
- Python runs 299 cases (293 pass, six existing skips); public-source, package,
  generated modules and normal 28-template pre-push checks pass. No checks are
  bypassed. Archive's unused misleading translation key is removed in all ten
  dictionaries; existing localized step/known-availability messages remain.

The SDK compiler uses actual prerequisite declarations locally. Actual execution
provides stronger evidence: seven isolated macOS development-app cases use real
persistent UUIDs, joined from supported Driver saved-Draft JSON to SDK aliases
by exact clip IDs with the existing canonical binding helper. No names or array
positions establish this join. Client source is
`0e4f7a595095e826acfd8aa7d2edcaa507210ffe`.

| Actual SDK case | Observation |
| --- | --- |
| Parent, injected SDK placement error | Two attempts; no alias or retained reason |
| Fixed, same SDK-boundary fault | One attempt; insert phase and reason retained |
| Parent, reply lost after actual insertion | Two attempts, two private clips |
| Fixed, same lost completed reply | One attempt, one confirmed private clip |
| Fixed Mini, real persistent Video/Image UUIDs | Exact aliases and 96-by-160 photo facts |
| Fixed Archive, same UUIDs | Exact aliases and 96-by-160 photo facts |
| Parent, same real photo | Returns 1920-by-1080 scratch canvas as photo size |

The PNG's bounded header read independently establishes 96-by-160. Earlier
failed dimension observations are preserved. Every SDK request denies commit;
fresh Project metadata/resources/tree/clips and both complete saved-Draft Driver
JSON snapshots remain identical afterward. The source-module and emitted-script
hashes identify the tested final code. These are direct input-step probes with
documented SDK-boundary fault injection, not a reproduction of the original C-09
failure, a whole hidden-template run, installed-app/Windows acceptance or full
video/audio/reference/changed-input quality.

## Parent CI correction and remaining work

The terminal parent CI failure was the Windows-path simulation's Gallery case:
its generic fake host omitted the bounded `readRange` API introduced by an
earlier reader repair. The exact nine-file CI group reproduces 86 pass / one
failure / one existing skip. The fixture now provides bounded range reads; the
Gallery assertion forbids whole-file fallback and checks the exact one-byte
request. The group passes 87 with one existing skip. This correction is carried
into the prerequisite branches; product guards are unchanged and remote checks
run again on their updated heads.

Still open: original C-09 reported-environment verification and legacy source
availability policy, full input/selection and run lifecycle migration, partial
saves, installed-cue content ownership/X12, scoring/cache/cleanup, actual Windows,
and complete video/audio/playback/export/reference acceptance. No issue is closed
solely on these source/SDK checks and no template is declared complete.
