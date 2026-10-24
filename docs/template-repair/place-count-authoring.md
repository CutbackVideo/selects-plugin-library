# Place Count authoring contract checkpoint

Scope: `place-count` 0.1.0-alpha.12, audit X11 / place-count:01. The other six
audited Place Count findings and the full 28-template repair goal remain open.
Chan's Shortform Clips and template packs are excluded.

## Cause and repair

Both the template runner and workspace startup called
`sdk.call('canAuthorGeneratedMedia')`. That renderer-specific name is absent
from the current canonical panel read allowlist, so a supported app rejects the
query before the template reaches its actual public SDK operations. An older
local client still allowed it; that copy does not describe current behavior.

The two entry paths now reuse their existing asset and Project inventory reads.
The canonical `assemble-base.js` script checks `addMotionGraphic` and
`rangeAtFrames` on the real Draft handle before source edits or its first commit.
The SDK's corrective-error Proxy throws when an absent method is accessed, so
the check uses `in` before reading a property. No internal-service fallback,
invented probe Draft ID or new public SDK method is introduced.

An unsupported handle returns structured data to the shared story runner, which
raises an actionable update error. This known no-save result clears the
uncertain-assembly flag; transport errors retain the existing uncertain-result
behavior. An unsaved working copy may have been allocated, but no source edit or
Draft commit has occurred. Existing saved recovery targets are preserved.

This feature remains in the existing assembly script and story runner shared by
both entry paths. No separate global helper duplicates those owners. A second
template migration must establish the same contract before extracting it into
the shared pool.

## TDD and verification

- Initial RED: five failures (two blocked entry paths, two unsupported methods
  reaching base-save logic, and the missing actionable-error mapping). The
  supported assembly control passed before and after the fix.
- A further two RED cases reproduced the actual SDK Proxy's absent-property
  behavior. Both pass with guarded feature inspection.
- Ten focused tests now pass, including SDK declaration typechecking and a
  retry after a known no-save result without false recovery-only state.
- The focused tests plus existing Place Count planner, creation, path-collision,
  local-files, place-inference and shared inventory regressions pass 50 tests.
- Python discovery: 291 tests, 285 passed and 6 skipped. Public-source and
  package checks pass. These are code/harness checks, not installed-app proof.

Current host evidence: `cutback-client` origin/develop
`c88da022edb448ac5f085f6eb77cf78e74ef030d`,
`src/shared/panel-runtime/readMethods.ts`,
`electron/mcp/script-runtime/sdk-handles.ts` and
`electron/mcp/script-runtime/project/drafts.ts`; installed public SDK declarations
also typecheck the generated assembly script.

Method presence does not prove that arbitrary motion code compiles, renders or
exports. Actual installed-template execution, saved-result readback, complete
audio/video playback, export, Windows execution, and remaining Place Count
findings are pending. This checkpoint must not be recorded as template completion.
