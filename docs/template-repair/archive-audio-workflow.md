# Archive Audio and durable workflow — in progress

This connected feature covers selected music contents, Project Audio adoption and
assembly/look save recovery. It is not a completed Archive repair or acceptance
claim. Chan remains excluded. Work is isolated on `codex/archive-audio-workflow`,
based on Mini PR #335's `68ac2b1`; the original Mini/app workspaces are preserved.

## Implemented: one canonical selected-Audio procedure

Archive previously adopted a different Project Audio by basename and approximate
duration. Two actual 119.6-second MP3s with different contents reproduce that
counterexample. Its import operation also trusted an added ID without confirming
the actual Project path, and could not recover a completed import's lost reply.

The existing `bundled-assets` owner now supplies `ensureProjectAudio`. Mini and
Archive generate their independent installed operations from that same function;
there is no second copied import procedure and no new common module. The pool
still has nine registry entries and fourteen partial consumers.

| Input/output boundary | Current contract |
| --- | --- |
| Selected input | Project ID, absolute path, optional minimum duration in seconds and optional provenance response |
| Project observation | Unique Audio at the normalized selected path, positive sufficient duration; a name/approximate length is not identity |
| Incomplete lookup | Missing overview/folder detail/directory children or selected-node Resource metadata stops before import |
| Import | At most one dispatch per invocation; read actual Project state after the attempt, including a lost reply |
| Confirmation | Returned added IDs cannot contradict the observed Audio; missing result differs from confirmed skipped import |
| Compatibility | Default result remains `{resourceId, imported}`; optional provenance returns actual path/duration. Legacy asset-reader callers retain their default contract |

Physical file contents and cross-invocation workflow ownership remain caller/run
responsibilities. This procedure does not by itself prove native contents or
durable Draft recovery. Existing generic asset publication/cache/media lifetimes,
the Worker owner and the durable run owner retain their responsibilities.

## Evidence

- Actual Archive adoption operation: ten cases now pass, including seven original
  failures and three controls.
- A 195-case focused slice covers both Audio consumers and existing asset owners;
  a separate 76-case slice covers Gallery assets and structural ownership checks.
  These counts overlap and are not a combined distinct-case total.
- Existing Mini/Archive read operations pass. Archive's former same-name reuse
  assertion now requires the actual selected import and its subsequent reuse;
  the fixture exposes real catalog changes after import.
- Five Archive and six Mini emitted scripts pass the actual SDK declarations.
- Canonical/generated-copy, package/public-source and builder checks accompany
  the change. Mini's source map includes the canonical asset source and shared
  selected-Audio regression; semantic review/whole-template acceptance stay false.

The original Mini PR CI succeeded for `68ac2b1`. This unpushed Archive feature has
not completed final whole checks or native runtime verification.

## Implemented next: pinned cues and source-bound own-track analysis

Both Archive entry paths now use the existing asset publisher for bundled cues.
The five manifest rows pin actual packaged byte counts as well as their existing
SHA-256 values; the cue builder emits both. Earlier Drafts retain their owned
content path when the installation changes or disappears. The timing/grid and
Archive editing policies are unchanged.

Mini's source-bound analysis/cache procedure now lives in `bundled-assets` as
`prepareAudioBeatAnalysis`. It delegates reservations/publication/cleanup to
`prepareDerivedAsset`, receives existing decode/Worker/probe adapters, validates
the beat result and independently returns the original content observation.
Mini retains its previous cache namespace and sampling policy. Archive retains
its WebAudio fallback after ordinary native decode failure. Neither terminal nor
preserve-workspace uncertainty may become ordinary fixed timing; transient
fallback is not cached. The partial registry still has nine entries.

Archive Build verifies the analyzed own-track contents before planning, before
import and before assembly dispatch. Both entries carry verified music content
and the observed Project Audio/path into the assembly config. **This handoff is
not yet a saved-state or precommit verification**: those connections remain in
the same durable-workflow packet below.

TDD evidence at this checkpoint:

- Bundled-cue callers: four baseline controls passed and 26 assertions failed;
  the repaired suite has 31 passing cases including actual SDK script typings.
- Actual own-analysis caller: two controls passed and nine failed; all eleven
  now pass with actual WAV/PCM/beat-engine data. Worker execution itself is a
  controlled boundary with its existing owner tests.
- Music content/Audio handoff: one control passed and nine failed; all ten pass.
- Before connecting Archive, the extracted owner passed 28 existing Mini cases
  and a 140-case asset/Gallery slice. Worker/ownership/module checks pass 56
  cases. Mini/Archive panel checks, cue metadata and public-source checks pass.
  These are scoped slices, not a distinct total or native acceptance claim.

No new Electron, real Project save, playback/export, push or PR was performed.
Mini's original clean worktree/PR and the original app modifications are retained.

## Remaining in this same feature packet

1. Connect the carried music observations and Resource/path bindings to actual
   assembly, precommit and saved-look continuation; confirm saved Audio intent.
2. Preserve selected original Video/Image facts and native clock/placement at
   the actual authoring boundary while retaining Archive's allocation policies.
3. Replace name-based Draft adoption and unconfirmed Finish resubmission with the
   existing durable assembly/look owner, exact frozen requests and independent
   saved-state/intent checks. Preserve Archive's editing/style policy.
4. Verify unknown/late outcomes, same-panel retry, reload, restored originals and
   manual-edit refusal. The retained actual Build RED currently shows unrelated
   same-name Draft adoption and a second unconfirmed save dispatch.
5. Finish affected-consumer/final checks, actual runtime evidence and one cohesive
   PR. Installed UI, full playback/export, released builds and Windows remain open.

One-video versus declared input support, preview budgets, fonts/graphemes and
actual effect-coordinate output checks stay in the separate execution queue.
