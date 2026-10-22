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

## Phase 1 evidence

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

## Phase 2: pinned cues and source-bound own-track analysis

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
phase-2 evidence only; saved-state and precommit verification were still pending**: those connections remain in
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

## Phase 2 remaining work (historical)

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

## Phase 3: durable assembly and Finish

Both Archive entry paths now use the existing durable run owner before planning
new work. A same-name Draft is never execution identity. An unknown assembly or
Finish outcome retains its exact request and owner; another click confirms that
request instead of resending it. Only a positively recorded pre-save Finish
failure permits a new attempt. Reload uses captured original sources, generated
operations, presets, six TSX programs and fonts, including the original pure
Finish-config builder. Installation changes cannot substitute a new recipe.

Assembly verifies physical originals, Project bindings, native-clock placement,
source windows, transforms and music before its sole commit. Read-only recovery
checks the plan independently; complete state receipts separately preserve text,
program source/parameters/controls/order, audio and transforms. Manual changes or
unavailable verification cannot trigger another save. Archive's ordinary cut,
ambient-sound and one-second music-fade policies remain template responsibilities.

The existing native authoring owner now provides nativeMediaWindow. Mini and
Archive supply their destination/music-offset policies to the same native-cover
calculation; verified insertion and surplus trim remain explicit authoring work.
There is no new registry module: nine owners, fourteen partial consumers.

### Bounds and admission

A standalone-panel 100-original inventory/two-shot plan reproduced two distinct limits: the
48 KiB receipt-envelope budget was also applied to the request, and original
Finish assets plus selected-source observations exceeded the 256 KiB continuation
limit. The durable owner now offers explicit requestLimit (maximum 128 KiB) and
stateLimit (maximum 512 KiB) opt-ins. Existing defaults, request ordering/hash
bytes, receipt/CAS limits and the separate 256 KiB SDK transport cap are retained.
Only Archive opts in. The canonical file client already chunks these state files.
The headless handoff manifest separately limits footage to 50 files; the
100-original regression covers the standalone Project panel, not that handoff.
All six TSX keys and the four generated script markers/placeholders/source bounds
are validated before assembly, so incomplete Finish inputs cannot leave a saved
base Draft.

### Native metadata finding

Actual SDK video insertion also creates chapter/subchapter rows. Counting every
row as planned media rejected a correct native assembly before save. Archive now
preserves those metadata rows and counts only the planned media; other unexpected
row kinds still reject. Full-state receipts continue to include metadata text.
The native reproduction and its focused regression are retained.

### Verification boundaries

The current Archive feature suites contain 155 distinct cases. Existing common
consumers were checked before Archive's budget opt-in: 175 behavior cases plus two
SDK-typing cases, and 72 Gallery run/staging cases. A separate 35-case durable
slice includes default/opt-in budgets, actual Build recovery and malformed Finish
admission. These slices overlap and must not be added as unique-case totals.

Actual development SDK execution saved a two-video assembly at 24000/1001 fps
with 48 Draft frames, then saved real bundled title/credit/effects after a
controlled early Finish reply loss. This is generated-operation/native-owner
evidence with owned media, not installed PanelHost UI, playback/export, released
build, Windows or whole-template acceptance. Final checks/CI and PR status must
be recorded at the corresponding checkpoint, not inferred here.

### Verification-profile incident

The private verification launcher initially inherited the stock session launcher's
reset-by-default behavior; --keep-data was omitted. The task-owned alias profile
was initialized on launch, removing earlier task validation Projects, including
f8e72dbb-2a78-409e-882a-10dd0e2e7c8a and the first native Archive proof
568505b7-922a-481b-94a8-344edd71573e. Those Project identities were not restored.
Source branches, dirty app work, PRs, generated originals and external evidence
remain preserved. No foreign task profile/process was removed. This was an
execution error, not an Archive persistence defect or successful recovery proof.

The private launcher now always preserves its profile and rejects keep-data=false;
subsequent launches also pass --keep-data explicitly. Electron session, browser
partition and distribution-cache roots are task-private. Owned process/port/app
bundle/cache/LaunchServices cleanup is verified before relaunch; user data and
source/evidence files are retained. A new disposable SDK Project provides separate
replacement evidence; it must never be reported as restoration of the removed IDs.

## Remaining in this connected packet

Response-loss recovery now passes across a data-preserving native restart with
no assembly/Finish redispatch. Saved Draft snapshots and original hashes match.
Project state is unchanged during recovery; its lastUpdatedAt advanced before
restart and is recorded separately. The retained database hash changed, so no
binary database equality is claimed. The final 14 owned processes, three ports,
Electron bundles, distribution cache and five stale app registrations are cleared.
Replacement profile data is retained. Finish CI and submit one cohesive PR. Installed UI, full playback and
export remain separate acceptance gates. Whole semantic ownership/acceptance stays
0/28, and Chan remains excluded. The separate one-video/input support, preview
budgets, fonts/graphemes and effect-coordinate queue is unchanged.
