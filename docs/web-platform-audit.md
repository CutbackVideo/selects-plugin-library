# Web platform admission audit

This migration reviews all 50 current packages. `platforms` is the client's
installation decision, not automatic inference from a panel's source code.
No package is currently admitted to web. All 50 retain the existing macOS/Windows
declarations pending actual web installation and core-workflow verification.
That does **not** assert that all 50 are inherently impossible in a browser.

- **Blocked**: a declared native dependency or required unavailable host path is identified.
- **Native operation present**: a concrete native operation exists; this alone does not prove every alternative workflow is impossible.
- **Pending**: no conclusive admission yet. Missing browser validation must not be described as a proven platform limitation.
- **Web admitted**: actual web-target installation, core UI workflows, visible output,
  and reopening have all passed. No package currently meets this gate.

Do not automatically enable web merely because a package has no `runtime` or
`runShell`. The shared local-client facade also contains real browser-capable
files/media APIs; its name or an FFmpeg reference alone is not a blocker.
Service credentials, source media, CORS, specific media arguments and optional
features still matter. Manifest metadata cannot guarantee those runtime conditions.

## Per-package decision

| Plugin | Decision | Evidence / outstanding verification |
| --- | --- | --- |
| `a16z-style-captions` | Blocked | [plugin.json](../plugins/a16z-style-captions/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `ali-abdaal-style` | Pending | [panel.tsx](../plugins/ali-abdaal-style/panel.tsx#L203): Browser panel compilation and six portrait-geometry tests pass. Transcript analysis, model response, and the complete edit/commit flow still need browser verification. |
| `archive-vlog` | Pending | [panel.tsx](../plugins/archive-vlog/panel.tsx#L3698): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `camera-shutter-dump` | Pending | [panel.tsx](../plugins/camera-shutter-dump/panel.tsx#L1792): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `card-news-maker` | Native operation present | [panel.tsx](../plugins/card-news-maker/panel.tsx#L3026): Shell execution is used by the panel; browser substitutes and the complete card-generation path are not verified. |
| `chris-williamson-style` | Blocked | [plugin.json](../plugins/chris-williamson-style/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `cinema-vlog-studio` | Pending | [panel.tsx](../plugins/cinema-vlog-studio/panel.tsx#L194): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `city-weekend-vlog` | Pending | [panel.tsx](../plugins/city-weekend-vlog/panel.tsx#L1984): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `cutout-beat-gallery` | Blocked | [plugin.json](../plugins/cutout-beat-gallery/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `daily-vlog-8` | Pending | [panel.tsx](../plugins/daily-vlog-8/panel.tsx#L583): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `depth-type-captions` | Blocked | [plugin.json](../plugins/depth-type-captions/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `doac-style` | Blocked | [panel.tsx](../plugins/doac-style/panel.tsx#L157): The caption workflow invokes a bundled Python runtime through the shell. |
| `eo-shorts` | Blocked | [plugin.json](../plugins/eo-shorts/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `epidemic-sound-search` | Blocked | [panel.tsx](../plugins/epidemic-sound-search/panel.tsx#L1020): Provider workflow uses shell/Python and desktop browser control. |
| `fast-switching-stopmotion` | Pending | [panel.tsx](../plugins/fast-switching-stopmotion/panel.tsx#L283): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `four-photo-stop-motion` | Pending | [panel.tsx](../plugins/four-photo-stop-motion/panel.tsx#L2070): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `gongju-gallery` | Pending | [panel.tsx](../plugins/gongju-gallery/panel.tsx#L158): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `imessage-generator` | Native operation present | [panel.tsx](../plugins/imessage-generator/panel.tsx#L234): Local Kokoro setup and speech use Python/shell. Alternative cloud or silent paths have not been certified for web. |
| `jared-vox-editorial` | Pending | [panel.tsx](../plugins/jared-vox-editorial/panel.tsx#L327): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `jude-kinetic-style` | Blocked | [plugin.json](../plugins/jude-kinetic-style/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `medical-explainer` | Pending | [panel.tsx](../plugins/medical-explainer/panel.tsx#L568): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `mini-vlog` | Pending | [panel.tsx](../plugins/mini-vlog/panel.tsx#L2994): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `multicam-generator` | Pending | [panel.tsx](../plugins/multicam-generator/panel.tsx#L578): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `music` | Blocked | [panel.tsx](../plugins/music/panel.tsx#L10): EpidemicSound and Artlist providers are unimplemented web adapters in the client. |
| `news-minute` | Pending | [panel.tsx](../plugins/news-minute/panel.tsx#L444): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `no14-still-video` | Pending | [panel.tsx](../plugins/no14-still-video/panel.tsx#L1814): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `photo-gallery-no2` | Native operation present | [panel.tsx](../plugins/photo-gallery-no2/panel.tsx#L494): Uses selects.ai without declaring selects-ai-runtime. Browser workers have no native AI host; review dependency declaration before enabling web. |
| `place-count` | Pending | [panel.tsx](../plugins/place-count/panel.tsx#L919): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `podcast-hook-captions` | Blocked | [plugin.json](../plugins/podcast-hook-captions/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `polaroid-photo-dump` | Pending | [panel.tsx](../plugins/polaroid-photo-dump/panel.tsx#L1344): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `portrait-beat-montage` | Blocked | [plugin.json](../plugins/portrait-beat-montage/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `postcard-cutout-studio` | Native operation present | [panel.tsx](../plugins/postcard-cutout-studio/panel.tsx#L216): Bundled runtime invokes shell for cutout processing. A complete browser alternative has not been verified. |
| `recap-2026` | Native operation present | [panel.tsx](../plugins/recap-2026/panel.tsx#L686): Uses selects.ai without declaring selects-ai-runtime. Browser workers have no native AI host; review dependency declaration before enabling web. |
| `selects-ai-runtime` | Blocked | [plugin.json](../plugins/selects-ai-runtime/plugin.json): Declares runtime.json, a native runtime requiring a desktop host. |
| `selfie-aesthetic` | Pending | [panel.tsx](../plugins/selfie-aesthetic/panel.tsx#L2231): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `short-form-safe-zones` | Pending | [panel.tsx](../plugins/short-form-safe-zones/panel.tsx#L102): Browser worker compiles the panel. Read/add/update/remove pass against the real editing SDK and motion-graphic validator in Chromium. Actual installation, UI actions, visible guide rendering and reopening remain unverified. |
| `shortform-clips` | Blocked | [plugin.json](../plugins/shortform-clips/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `shortform-cloner` | Native operation present | [panel.tsx](../plugins/shortform-cloner/panel.tsx#L237): Panel invokes shell; URL ingestion and full reconstruction need a browser implementation/verification. |
| `six-clip-velocity` | Pending | [panel.tsx](../plugins/six-clip-velocity/panel.tsx#L319): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `summer-trip` | Pending | [panel.tsx](../plugins/summer-trip/panel.tsx#L3123): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `tang-poetry-explainer` | Pending | [panel.tsx](../plugins/tang-poetry-explainer/panel.tsx#L327): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `tetris` | Pending / partial | [panel.tsx](../plugins/tetris/panel.tsx#L57): Single-player looks browser-compatible; multiplayer uses a Python/MQTT shell relay. Neither complete browser interaction nor desktop-operation guidance is verified. |
| `thank-you-recap` | Pending | [panel.tsx](../plugins/thank-you-recap/panel.tsx#L387): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `the-end-credits` | Pending | [panel.tsx](../plugins/the-end-credits/panel.tsx#L1986): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `timeline-shorts-builder` | Pending | [panel.tsx](../plugins/timeline-shorts-builder/panel.tsx#L32): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `torn-paper-love` | Pending | [panel.tsx](../plugins/torn-paper-love/panel.tsx#L3008): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `travel-beat-vlog` | Blocked | [plugin.json](../plugins/travel-beat-vlog/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `vlog-edit` | Native operation present | [SKILL.md](../plugins/vlog-edit/SKILL.md): Skill instructions require a local contact-sheet HTTP server. A browser-only instruction path has not been verified. |
| `vlog-opening` | Pending | [panel.tsx](../plugins/vlog-opening/panel.tsx#L1776): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `vox-explainer` | Pending | [panel.tsx](../plugins/vox-explainer/panel.tsx#L328): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |

## Supporting SDK checks (not admission)

From this repository, with a dependency-installed client checkout containing the
companion platform PR and the client's Playwright Chromium browser installed:

```sh
python3 tools/test_web_platforms.py --client /path/to/cutback-client
python3 -m unittest discover -s tests -p 'test_plugin_files.py'
python3 tools/plugin_files.py check
```

The browser harness compiles Safe Zones and Ali Abdaal using the real browser
compiler worker. It runs Safe Zones read/add/update/remove scripts with the real
shared editing SDK, real domain sequence objects, and the real motion-graphic
validator in Chromium. Persistence is an isolated in-memory draft gateway; no
user project or account is touched. This is not a full signed-in UI test, an
export/pixel comparison, or proof of Ali Abdaal's model/transcription workflow.
Ali Abdaal therefore remains pending despite successful compilation.

The publication check rejects missing/invalid platform arrays, web packages with
native runtimes, and web packages whose declared dependencies do not support web.
Running it over all packages checks dependency consistency transitively. The
client independently traverses the pinned dependency closure before installation.
Undeclared dependencies and arbitrary behavior inside plugin code cannot be
inferred by the manifest validator; source review and browser verification remain
required before adding web. Revisit this table when those workflows are tested.

## Actual web-target verification run

Signed-in Chrome verification is in progress on 2026-10-27 at
`http://127.0.0.1:3014`, using the companion client branch and library commit
`b6dcb30a397c5dd6ceff8796abc5b6eb28af854c`. The earlier login blocker is resolved.

The isolated test catalog exposes all packages individually. Only the platform
metadata opt-in gate is temporarily waived locally to test candidate admission;
native-runtime and dependency checks, the actual installer, SDK, storage,
networking and rendering remain real. These local overrides are not publication
changes. A successful candidate still requires a final normal-gate install.

Inputs are the built-in sample project (footage downloaded through the app),
21 generated PNG test images (plus 21 newly imported copies for file-access retests),
and 15 generated eight-second test-pattern videos.
They exercise media handling, not the artistic quality of travel/couple/portrait
editing. User-authorized test budget: 500 credits total. One analysis request for
15 clips displayed 15 credits; final charged usage is not yet independently
confirmed. Card News Maker also generated three Nano Banana Pro images; their
charged usage still needs reconciliation before further paid testing. Installation setup uses the app's normal assistant flow.

This is an **incomplete checkpoint**, not certification of all packages. The
source-review table above is not runtime proof. Live outcomes are recorded below;
untested packages remain pending and all manifests still exclude `web`.

| Plugin | Actual browser outcome so far |
| --- | --- |
| `a16z-style-captions` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `ali-abdaal-style` | **passed / failed-edit-commit**. Actual Create Ali Abdaal Style draft clicked for 30-second sample Draft; Transcript and visual-planning steps completed; editable draft creation failed; stale_clip_target: the draft changed after clips() was read; read clips() again; Uncommitted edit reported; failure is not proven browser-specific |
| `archive-vlog` | **passed / setup-running**.  |
| `camera-shutter-dump` | **passed / created-but-preview-black**. Actual imported PNG sources selected and Create Draft completed; editable image and audio clips visible in timeline; Preview remained black at populated image frames; reload verification pending; After reload imported file references require renewed access; preview reports SourceFileAccessError browser_source_permission-required. Separate host persistence limitation; do not declare web based on Saved status. |
| `card-news-maker` | **passed / created-export-retry-pending**. Text planning returned3cards; three AI images generated and Draft created; First export attempt collided with running daily-vlog script; retry after settled required |
| `chris-williamson-style` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `cinema-vlog-studio` | **in-progress / not-attempted**. Install clicked; catalog disabled while install pending; no success confirmation yet |
| `city-weekend-vlog` | **not-attempted / not-attempted**.  |
| `cutout-beat-gallery` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `daily-vlog-8` | **passed / failed-script-timeout**. Selected fixtures folder, 8 valid videos assigned. Create clicked.; Script deadline of 120s exceeded; uncommitted edits, no completed Draft. |
| `depth-type-captions` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `doac-style` | **passed / failed-native-shell**. Create captions on analyzed vertical 9:16 30s sample Draft failed: Web adapter not implemented: PanelShellRunnerAdapter.run |
| `eo-shorts` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `epidemic-sound-search` | **passed / failed-native-shell**. Panel initialization and actual ambient Search display Web adapter not implemented: PanelShellRunnerAdapter.run |
| `fast-switching-stopmotion` | **not-attempted / not-attempted**.  |
| `four-photo-stop-motion` | **passed / created-but-preview-black**. Actual imported PNG sources selected and Create Draft completed; editable image and audio clips visible in timeline; Preview remained black at populated image frames; reload verification pending; After reload imported file references require renewed access; preview reports SourceFileAccessError browser_source_permission-required. Separate host persistence limitation; do not declare web based on Saved status. |
| `gongju-gallery` | **not-attempted / not-attempted**.  |
| `imessage-generator` | **passed / failed-shell-and-sdk-contract**. Set up free voices: Web adapter not implemented: PanelShellRunnerAdapter.run; Silent > Apply to Draft 16.7s: Panels cannot call canAuthorGeneratedMedia; sdk.call reads; use sdk.runScript to change the project |
| `jared-vox-editorial` | **not-attempted / not-attempted**.  |
| `jude-kinetic-style` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `medical-explainer` | **not-attempted / not-attempted**.  |
| `mini-vlog` | **passed / setup-running**.  |
| `multicam-generator` | **passed / failed-preparation**. Nested source rejected; prepared new Draft 2 from raw single-person C0005.mp4 and retried; New angle generation and Continue retry both failed in video/audio preparation with generic retry alert; no completed output, backend charge not observed. |
| `music` | **passed / failed-initialization**. Actual panel shows music loading failure for both Epidemic Sound and Artlist; search UI never becomes available |
| `news-minute` | **not-attempted / not-attempted**.  |
| `no14-still-video` | **passed / failed-effect-program**. Loaded 21 actual imported PNG images; photo A-D resolved to photo-01 through photo-04; Create new Draft passed image-source and bundled-music stages then failed: Effect preset reference program could not be confirmed. |
| `photo-gallery-no2` | **passed / failed-file-identity**. Retested with all 21 fresh current-session photos explicitly assigned; Create Draft failed runtime_error: The file's size or identity could not be confirmed (line146,column20). |
| `place-count` | **passed / setup-running**. Actual install completed; setup assistant confirmed entrypoint; core workflow pending |
| `podcast-hook-captions` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `polaroid-photo-dump` | **passed / failed-graphic-placement**. Fresh current-session 00-audit-01..17 photos selected; Create Draft failed: Graphic placement could not be confirmed. |
| `portrait-beat-montage` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `postcard-cutout-studio` | **not-attempted / not-attempted**.  |
| `recap-2026` | **not-attempted / not-attempted**.  |
| `selects-ai-runtime` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `selfie-aesthetic` | **not-attempted / not-attempted**.  |
| `short-form-safe-zones` | **passed / passed-main-path**. Panel opened through Apps after real installer succeeded; Show guides toggle creates visible fuchsia guide clip on timeline; Source footage download pending before preview verification; Sample source footage downloaded through built-in confirmation UI; Guide visibly rendered over video with fuchsia timeline clip; Centre lines change completed; Toggle off removed guide and restored unobstructed preview; Re-added for persistence check; After page reload, reopened panel detected saved guide and rendered overlay; Removed guide after validation; final admission awaits normal metadata gate retest |
| `shortform-clips` | **rejected-platform-policy / blocked-native-runtime**. Actual built-in app install showed desktop-required dialog; Package dependency selects-ai-runtime is native; direct pinned-package attempt still pending |
| `shortform-cloner` | **passed / partial-failed**. Analyzed project C0001.mp4 produced two editable shorts of 34.1s and 33.3s with visible video, headlines and timed captions; Actual YouTube link Create failed during downloader preparation: Web adapter not implemented: PanelShellRunnerAdapter.run |
| `six-clip-velocity` | **passed / created-visible-pending-reopen**. Six 8-second videos selected; 23.2s Draft with editable 114 pieces generated; Actual source pattern visible at3:02, title graphic present; reopen and effect checks pending |
| `summer-trip` | **not-attempted / not-attempted**.  |
| `tang-poetry-explainer` | **not-attempted / not-attempted**.  |
| `tetris` | **passed / partial-failed**. Normal game started; move/rotate/drop increased score to 16; pause and main menu worked; Play a friend > New code > Connect failed: Web adapter not implemented: PanelShellRunnerAdapter.run; No desktop-install dialog on this caught panel error |
| `thank-you-recap` | **not-attempted / not-attempted**.  |
| `the-end-credits` | **not-attempted / not-attempted**.  |
| `timeline-shorts-builder` | **passed / failed-native-dimensions**. Selected real sample Short 1 (30.1s), Prepare thumbnails clicked; Native dimensions unavailable for 12 video/image clips; preparation stopped; no Draft created. |
| `torn-paper-love` | **passed / created-but-photo-render-unconfirmed**. Selected seven fresh 00-audit photos, videos disabled; 6.2 second editable Draft created; At 2:05 text and torn-paper border visible, photo content appears solid gray; no full visual pass |
| `travel-beat-vlog` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `vlog-edit` | **not-attempted / not-attempted**.  |
| `vlog-opening` | **not-attempted / not-attempted**.  |
| `vox-explainer` | **not-attempted / not-attempted**.  |

Do not treat an input validation error, missing file permission, absent credentials,
or an untested workflow as proof that the plugin can never support browsers.
A Saved message is insufficient when the actual preview is black. The file-access
failures are tracked separately and are being retested with a newly authorized
fixture folder. Concrete shell failures and unsupported SDK calls also require
the common desktop guidance to survive plugin-level error catches.
