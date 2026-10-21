# Gallery original-input verification and portable generation

Photo Grid Reveal (`photo-gallery-no2`) preserves its 21-slot, three-column by
seven-row reveal, shared grayscale-to-color event, optional music and editable
original Images. The app-run contract selects 15 Images and six Videos at slots
4, 6, 11, 17, 19 and 21. The standalone planner accepts any valid 21-slot mixture
and intentional repeated sources. Short Videos retain the existing last-frame
hold preparation. Reference clocks, effect source and bundled media bytes do
not change in this checkpoint.

## Causes and repair

Cached Project metadata and a successful probe did not prove an original Image
was still readable. Preparation could import music or convert Videos before
checking that fact. The former ID fast path also bypassed path ambiguity;
inventory deduplication concealed repeated source nodes; missing native
dimensions fell back to caller values; and changed requested media kinds were
ignored. A probe could outlive the dimensions it had first observed.

Reuse `nativeImageSources` from the existing original-Image feature. A read-only
`verifyInputs` operation resolves each frozen selected path to one current
Resource alias, verifies its kind and authoritative dimensions, checks probes,
then checks selected Images with stat/read-one-byte/stat and a fresh Project
read. Compare the second dimensions with the first observation. Missing,
unreadable, changing or ambiguous sources stop before music/import/hold work.
Both panel entry points call it before preparation; the shared create path and
direct base-create path check it too. Image placement checks originals again
inside its mutating SDK script. Later staged-save behavior is not made atomic
by these checks, and source bytes cannot be locked across all later calls.

Frozen paths, rather than session-local Resource alias strings, remain the
binding contract. A nonempty supplied alias is required, but a stale alias may
rebind to the unique current Resource at its selected path. Keep intentional
repeated slots and original ordering. Drive/UNC and Unicode-normalized path
matching uses the current observed native path for actual file reads. Browsing
marks ambiguous candidates unavailable without reading every unrelated file.
All-Video inputs do not require unused original-Image file capabilities.

The existing canonical local SDK wrapper replaces Gallery's stale copy. Failed,
clipped or timed-out connection initialization finishes the app run once;
unmount and late replies do not bind a stale private client. The public SDK and
connection interface do not change.

## One source and a self-contained installed package

The canonical source becomes `shared/native-image-input.mjs`, exporting its
facts function directly. The previous four consumers receive only that export
prefix change; their feature body and behavior are unchanged. Gallery's
existing generator imports that canonical function, emits
`input-facts.generated.mjs` into its declared package, and embeds the same
function in `panel.tsx` and its SDK scripts. Its installed operation builder
imports the local generated artifact, never a repository-wide path. A normal
rebuild bootstraps a missing generated file before loading the builder.

The module registry declares this build-time consumer and validates its source
import edge, identity and exclusion rules. This is a literal import check, not
JavaScript semantic or security analysis. Gallery builder tests independently
check both generated artifacts against the canonical function and run the CLI
from a disposable directory containing only manifest-declared package files.
The module pool stays at five registered features across ten consumers; no
additional functional module, runtime import support, SDK or IPC is introduced.

## TDD evidence

Against the unchanged parent source, the initial expanded 23-case suite failed
22 cases with one healthy control. Subsequent missing-ID, post-probe dimension,
folder-summary, Windows-path, ambiguous-inventory, placement and React ordering
checks cover the new boundary. The folder-summary and Windows cases preserve
supported inputs rather than asserting that those paths were broken. Twelve
Gallery connection cases and three module-registry cases failed before their
respective canonical-wrapper and governance changes. An isolated-package test
caught and corrected a repository-path import regression during development.

Tests evaluate real emitted SDK scripts and compiled/minified panel entry
points, delete a real temporary original while retaining Project metadata and
probe results, and check that no import or Draft save precedes failed original
checks. The existing local ffmpeg hold and Python-reference BPM parity tests
run with an explicit test-only initialized SDK fixture; no production internal
DI fallback is added. SDK declaration and no-declaration type checks run too.
The CI Gallery step includes all of its planner, builder, operation, Image,
React ordering, hold, tempo and new input suites. The final related regression
passes 1,068 without skips, using TypeScript 5.8.3 and the prerequisite SDK
declarations. The exact Gallery CI step passes 123 with TypeScript 5.9.3.
Python discovery passes 285 with six skips. Five module/ten consumer copies,
six scoped local-client files, public source, all 48 packages and the 28-template
gate pass. Counts overlap and must not be added together. Remote status and the
normal pre-push outcome accompany the publication checkpoint.

## Remaining work and limits

Gallery still persists its seed, Image placements, Video placements and styling
in separate stages. Its durable run ownership/recovery, bundled-asset ownership,
Audio/Video source-clock boundaries and complete saved-property checks still
need migration to the existing shared features. Full timing/options validation
still runs after preparation; this checkpoint does not certify every later
invalid option as side-effect-free. Installed-app execution, actual Windows,
Inspector/visual composition, whole-video/audio playback, export and original
versus changed-input quality remain separate gates. Historical exports do not
validate version 0.3.11. The other four photo consumers still require client
PR #7828's SDK before publication. No merge, deploy, installation or user-data
rewrite is performed. Chan remains excluded; all 28 audited templates remain
in the original goal and no template is marked fully complete here.
