# Template bootstrap failure checkpoint

Primary consumers: Four Photo Reveal 0.5.5 and Camera Shutter Dump 0.1.12.
a16z Style Captions 0.20.6 is rebuilt as an existing shared-source dependency.
This is the local SDK bootstrap part of audit X2/C-01, not every initialization
failure or completion of any template. The 28-template objective remains active.

## Reproduction and cause

The hidden template's child starts only after the common local SDK client
initializes. The old wrapper displayed an alert on failure but never called
`finishTemplate`; the child could not run its own error/finally handler. Its
environment read also had no local observation deadline. A visible standalone
alert therefore did not settle a hidden app run.

Nine initial tests failed against the actual shared module and complete no14
and camera panels: thrown transport, SDK error reply and incomplete environment
all left zero completion reports. The shared module passed first, then the two
panels passed after reusing its existing generation tool. No new runtime module
or client API was introduced.

The wrapper now binds connection state to SDK/Project/library/run, reports one
safe initialization error for a hidden run, bounds observation to 30 seconds and
ignores/disposes late connections after timeout, unmount or replacement. Visible
panels keep an alert without completing unrelated templates. Original SDK
identity and private WeakMap cleanup remain intact.

## Distribution and automated evidence

- Real React 18.3.1 and jsdom 24.1.3 exercise the shared wrapper, both complete
  photo panels and the rebuilt a16z bundle. Coverage includes three failure
  channels, hung reads/late replies, standalone use, StrictMode/rerender, SDK/run
  replacement, completion transport failure, success, cleanup and new-run retry.
- The scoped local-client generator failed four initial tests before adding
  `--only`/read-only `--check` and prevalidation. A further Windows line-ending
  case failed before correction. Non-consumers and excluded production panels
  are preserved. The no-argument legacy synchronization remains available.
- Canonical file/process regression and installed-SDK TypeScript checks include
  both photo copies as well as shared/Card News/a16z sources. The new photo
  copies also receive the already existing canonical batching/cleanup behavior.
- a16z is rebuilt through its existing esbuild 0.25.0 pipeline; no feature or
  design migration is implied. Chan and EO production sources remain unchanged.

The test clock advances only the wrapper's real scheduled timer; no production
delay or timeout bypass is inserted. This is React/SDK-host simulation, not
installed Selects, persisted-Draft, full AV playback or export evidence. New
messages use the existing English fallback convention; the wider error-language
audit is still open. Other X2 paths, photo-specific defects, full saved design
verification, remaining migrations and supported-platform execution remain open.

## Local validation results

The focused connection/generator/canonical transport suite passes 79 cases
(51 React lifecycle, 5 scoped generation and 23 canonical SDK cases). The broader
photo/SDK regression suite passes 350 cases, including those 79; do not add the
totals. a16z own tests pass 25 runner cases separately. Python discovery passes
285 with 6 skipped. Public source, package files, template gallery and scoped
local/shared module checks are required before push. Remote CI is a separate gate.
