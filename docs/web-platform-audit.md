# Web platform admission audit

This migration reviews all 50 current packages. `platforms` is the client's
installation decision, not automatic inference from a panel's source code.
Six packages have passed actual installation, core creation or interaction, visible
output and reopening: Short Form Safe Zones, Fast Switching Stop Motion,
Cinema Vlog Studio, Thank You Recap, pov: you open my gallery and Vox Style Explainer. They declare
`web`. The four newly admitted video templates also passed normal-metadata
reinstallation from published commit `1892039`. Short Form Safe Zones passed its
initial install and core checks; its same-version update check reports latest, so
a fresh normal-gate reinstall remains unverified. The other 44
retain macOS/Windows pending complete verification.
That does **not** assert that all 50 are inherently impossible in a browser.

- **Blocked**: a declared native dependency or required unavailable host path is identified.
- **Native operation present**: a concrete native operation exists; this alone does not prove every alternative workflow is impossible.
- **Pending**: no conclusive admission yet. Missing browser validation must not be described as a proven platform limitation.
- **Web admitted**: actual web-target installation, core UI workflows, visible output,
  and reopening have all passed. See the separate normal-gate retest status above.

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
| `cinema-vlog-studio` | Web core verified | Actual install, core UI action, visible output and reopening passed; see runtime evidence and normal-gate retest status below. |
| `city-weekend-vlog` | Pending | [panel.tsx](../plugins/city-weekend-vlog/panel.tsx#L1984): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `cutout-beat-gallery` | Blocked | [plugin.json](../plugins/cutout-beat-gallery/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `daily-vlog-8` | Pending | [panel.tsx](../plugins/daily-vlog-8/panel.tsx#L583): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `depth-type-captions` | Blocked | [plugin.json](../plugins/depth-type-captions/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `doac-style` | Blocked | [panel.tsx](../plugins/doac-style/panel.tsx#L157): The caption workflow invokes a bundled Python runtime through the shell. |
| `eo-shorts` | Blocked | [plugin.json](../plugins/eo-shorts/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `epidemic-sound-search` | Blocked | [panel.tsx](../plugins/epidemic-sound-search/panel.tsx#L1020): Provider workflow uses shell/Python and desktop browser control. |
| `fast-switching-stopmotion` | Web core verified | Actual install, core UI action, visible output and reopening passed; see runtime evidence and normal-gate retest status below. |
| `four-photo-stop-motion` | Pending | [panel.tsx](../plugins/four-photo-stop-motion/panel.tsx#L2070): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `gongju-gallery` | Web core verified | Actual install, core UI action, visible output and reopening passed; see runtime evidence and normal-gate retest status below. |
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
| `short-form-safe-zones` | Web core verified | Actual install, core UI action, visible output and reopening passed; see runtime evidence and normal-gate retest status below. |
| `shortform-clips` | Blocked | [plugin.json](../plugins/shortform-clips/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `shortform-cloner` | Native operation present | [panel.tsx](../plugins/shortform-cloner/panel.tsx#L237): Panel invokes shell; URL ingestion and full reconstruction need a browser implementation/verification. |
| `six-clip-velocity` | Pending | [panel.tsx](../plugins/six-clip-velocity/panel.tsx#L319): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `summer-trip` | Pending | [panel.tsx](../plugins/summer-trip/panel.tsx#L3123): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `tang-poetry-explainer` | Pending | [panel.tsx](../plugins/tang-poetry-explainer/panel.tsx#L327): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `tetris` | Pending / partial | [panel.tsx](../plugins/tetris/panel.tsx#L57): Single-player looks browser-compatible; multiplayer uses a Python/MQTT shell relay. Neither complete browser interaction nor desktop-operation guidance is verified. |
| `thank-you-recap` | Web core verified | Actual install, core UI action, visible output and reopening passed; see runtime evidence and normal-gate retest status below. |
| `the-end-credits` | Pending | [panel.tsx](../plugins/the-end-credits/panel.tsx#L1986): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `timeline-shorts-builder` | Pending | [panel.tsx](../plugins/timeline-shorts-builder/panel.tsx#L32): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `torn-paper-love` | Pending | [panel.tsx](../plugins/torn-paper-love/panel.tsx#L3008): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `travel-beat-vlog` | Blocked | [plugin.json](../plugins/travel-beat-vlog/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `vlog-edit` | Native operation present | [SKILL.md](../plugins/vlog-edit/SKILL.md): Skill instructions require a local contact-sheet HTTP server. A browser-only instruction path has not been verified. |
| `vlog-opening` | Pending | [panel.tsx](../plugins/vlog-opening/panel.tsx#L1776): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `vox-explainer` | Web core verified | Installed web panel generated a 20.1-second Korean explainer from fictional text: five videos, three narration clips, music, editable headlines and captions. Visible playback reached 19:22, and after a full page reload the saved Draft played to 14:10. URL-input variant, export and normal-gate reinstall remain untested. |

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

All 50 install attempts are recorded: 39 succeeded, 10 were rejected for native
runtimes, and one built-in Shortform entry was refused by platform policy.
These are installation counts, not core-workflow pass counts.

The isolated test catalog exposed all packages individually. Only the platform
metadata opt-in gate was temporarily waived locally to test candidate admission;
native-runtime and dependency checks, the actual installer, SDK, storage,
networking and rendering remain real. All local test overrides were removed after the 50 installation attempts;
they are not publication changes. The final retest used a five-entry catalog
pinned to `1892039`, with the production platform guard unchanged. Four video
templates reinstalled successfully. This catalog override was also removed.

Inputs are the built-in sample project (footage downloaded through the app),
21 generated PNG test images (plus 21 newly imported copies for file-access retests),
15 generated eight-second test-pattern videos, and one 20-second landscape video.
They exercise media handling, not the artistic quality of travel/couple/portrait
editing. User-authorized test budget: 500 credits total. One analysis request for
15 clips displayed 15 credits; final charged usage is not yet independently
confirmed. Card News Maker also generated three Nano Banana Pro images; their
charged usage still needs reconciliation before further paid testing. Installation setup uses the app's normal assistant flow.

This is an **incomplete checkpoint**, not certification of all packages. The
source-review table above is not runtime proof. Live outcomes are recorded below;
untested packages remain pending. The five candidates listed above declare `web`;
their individual verification and normal-install limitations are recorded above.

| Plugin | Actual browser outcome so far |
| --- | --- |
| `a16z-style-captions` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `ali-abdaal-style` | **passed / failed-edit-commit**. Actual Create Ali Abdaal Style draft clicked for 30-second sample Draft; Transcript and visual-planning steps completed; editable draft creation failed; stale_clip_target: the draft changed after clips() was read; read clips() again; Uncommitted edit reported; failure is not proven browser-specific |
| `archive-vlog` | **passed / failed-source-confirmation**. In the new test project, selected eight analyzed original videos, disabled photos and edited the archive credit name.; Actual Create stopped at step 1/5: The selected source file could not be confirmed. Check the Project file and try again. No completed Draft. |
| `camera-shutter-dump` | **passed / created-but-preview-black**. Actual imported PNG sources selected and Create Draft completed; editable image and audio clips visible in timeline; Preview remained black at populated image frames; reload verification pending; After reload imported file references require renewed access; preview reports SourceFileAccessError browser_source_permission-required. Separate host persistence limitation; do not declare web based on Saved status. |
| `card-news-maker` | **passed / failed-export-timeout**. Text planning and three Nano Banana Pro images succeeded; editable three-card Draft created; Export retried after other edit settled; first card rendering failed: signal timed out, duration31286ms. |
| `chris-williamson-style` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `cinema-vlog-studio` | **passed / passed**. Imported a 20-second landscape test source through the native file chooser. Assigned it to the required slots using the plugin's explicitly supported source reuse.; Actual Create produced a 21.35-second Draft with 23 cuts, bundled music and title. Seeking to 5:02 visibly rendered the source and scramble title.; After reload, reopened the saved Draft. Playback advanced from 3:18 to 8:01; the inset card was visible at 8:00. Screenshots: cinema-title-visible.png and cinema-reopened-playing.png.; Reopened saved Draft again and played from the beginning through 21:07 / 21:08; screenshot cinema-complete.png. Normal-metadata reinstall pending.; Reinstalled published manifest commit 1892039 through the actual web UI with the normal platform guard unchanged; browser installation success confirmed. |
| `city-weekend-vlog` | **passed / created-visible-pending-reopen**. Opened installed plugin through Video Templates; automatically selected 15 already analyzed original clips, cancelled extra analysis for generated files.; Actual Apply completed a 13.3-second City Weekend Vlog Draft.; Playback advanced to 9:13 / 13:08 and showed actual source video. Title animation and reopening still need verification. |
| `cutout-beat-gallery` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `daily-vlog-8` | **passed / failed-script-timeout**. Selected fixtures folder, 8 valid videos assigned. Create clicked.; Script deadline of 120s exceeded; uncommitted edits, no completed Draft. |
| `depth-type-captions` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `doac-style` | **passed / failed-native-shell**. Create captions on analyzed vertical 9:16 30s sample Draft failed: Web adapter not implemented: PanelShellRunnerAdapter.run |
| `eo-shorts` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `epidemic-sound-search` | **passed / failed-native-shell**. Panel initialization and actual ambient Search display Web adapter not implemented: PanelShellRunnerAdapter.run |
| `fast-switching-stopmotion` | **passed / passed**. Actual UI install and Create Draft with 15 imported 8s test videos completed; editable 5.9s vertical Draft; rendered color bars visible and playback advanced. Synthetic inputs verify mechanics, not selfie shot-selection quality.; After leaving and reopening the project, saved Draft played from the beginning through 5:25 / 5:27 with actual source video. Screenshot fast-stopmotion-reopened.png.; Actual UI reinstall from published commit 1892039 succeeded with the production platform guard unchanged; setup confirms browser install success.; Reinstalled published manifest commit 1892039 through the actual web UI with the normal platform guard unchanged; browser installation success confirmed. |
| `four-photo-stop-motion` | **passed / created-but-preview-black**. Actual imported PNG sources selected and Create Draft completed; editable image and audio clips visible in timeline; Preview remained black at populated image frames; reload verification pending; After reload imported file references require renewed access; preview reports SourceFileAccessError browser_source_permission-required. Separate host persistence limitation; do not declare web based on Saved status. |
| `gongju-gallery` | **passed / passed**. Actual Create new draft with fixtures folder and 15 videos completed. 11.4s Draft, title visible at start and cropped color-bar video visible during playback at5.7s. Reopen and random mode pending.; After reopening the project, the saved montage rendered actual cropped video and played through 11:07 / 11:09. Screenshot gongju-gallery-reopened.png. Generated resource list durations show zero even though Draft playback works; downstream reuse metadata remains a separate limitation.; Reinstalled published manifest commit 1892039 through the actual web UI with the normal platform guard unchanged; browser installation success confirmed. |
| `imessage-generator` | **passed / failed-shell-and-sdk-contract**. Set up free voices: Web adapter not implemented: PanelShellRunnerAdapter.run; Silent > Apply to Draft 16.7s: Panels cannot call canAuthorGeneratedMedia; sdk.call reads; use sdk.runScript to change the project |
| `jared-vox-editorial` | **passed / generation-unverified-credit-accounting**. Actual install succeeded and core input panel rendered. Paid final generation not yet run; account dashboard does not expose generation charges. |
| `jude-kinetic-style` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `medical-explainer` | **passed / generation-unverified-credit-accounting**. Actual install succeeded and core input panel rendered. Paid final generation not yet run; account dashboard does not expose generation charges. |
| `mini-vlog` | **passed / failed-source-confirmation**. Selected eight analyzed original videos with photos disabled; actual Create failed at step 1/5: The selected source file could not be confirmed. Check the Project file and try again. |
| `multicam-generator` | **passed / failed-preparation**. Nested source rejected; prepared new Draft 2 from raw single-person C0005.mp4 and retried; New angle generation and Continue retry both failed in video/audio preparation with generic retry alert; no completed output, backend charge not observed. |
| `music` | **passed / failed-initialization**. Actual panel shows music loading failure for both Epidemic Sound and Artlist; search UI never becomes available |
| `news-minute` | **passed / generation-unverified-credit-accounting**. Installed and input panel ready. UI states script writing/checking also spends Selects credits; connected ChatGPT/Claude subscriptions unavailable. No further generation started. |
| `no14-still-video` | **passed / failed-effect-program**. Loaded 21 actual imported PNG images; photo A-D resolved to photo-01 through photo-04; Create new Draft passed image-source and bundled-music stages then failed: Effect preset reference program could not be confirmed. |
| `photo-gallery-no2` | **passed / failed-file-identity**. Retested with all 21 fresh current-session photos explicitly assigned; Create Draft failed runtime_error: The file's size or identity could not be confirmed (line146,column20). |
| `place-count` | **passed / failed-local-media-support**. Panel reports Plugin assets or local-media support are unavailable. Reinstall Place Count or update Selects.; Choose folder clicked; no progress beyond initial blocked panel. |
| `podcast-hook-captions` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `polaroid-photo-dump` | **passed / failed-graphic-placement**. Fresh current-session 00-audit-01..17 photos selected; Create Draft failed: Graphic placement could not be confirmed. |
| `portrait-beat-montage` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `postcard-cutout-studio` | **passed / failed-native-shell**. Native folder chooser selected authorized fixtures folder; Could not open this folder. Details: Web adapter not implemented: PanelShellRunnerAdapter.run |
| `recap-2026` | **passed / failed-file-identity**. After footage loading completed, selected imported 20-second hero and 15 original fixture videos.; Actual 12-second sample creation failed: The file's size or identity could not be confirmed, line 146 column 20. No completed Draft. |
| `selects-ai-runtime` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `selfie-aesthetic` | **passed / created-synthetic-input-only**. Actual Create with photos disabled completed a 25-shot, approximately 10-second Draft.; One likely close-up reused; three sources fell back to ordinary shots. Synthetic footage verifies mechanics only; real-person framing is not validated.; Playback reached 9:13/9:14 with actual source video and visible color treatment; screenshot selfie-synthetic-visible.png. |
| `short-form-safe-zones` | **passed / passed-core-normal-install-pending**. Panel opened through Apps after real installer succeeded; Show guides toggle creates visible fuchsia guide clip on timeline; Source footage download pending before preview verification; Sample source footage downloaded through built-in confirmation UI; Guide visibly rendered over video with fuchsia timeline clip; Centre lines change completed; Toggle off removed guide and restored unobstructed preview; Re-added for persistence check; After page reload, reopened panel detected saved guide and rendered overlay; Removed guide after validation; final admission awaits normal metadata gate retest; Normal catalog update check reports latest version; same-version reinstall was not performed. Initial real install and core UI verification passed. |
| `shortform-clips` | **rejected-platform-policy / blocked-native-runtime**. Actual built-in app install showed desktop-required dialog; Package dependency selects-ai-runtime is native; direct pinned-package attempt still pending |
| `shortform-cloner` | **passed / partial-failed**. Analyzed project C0001.mp4 produced two editable shorts of 34.1s and 33.3s with visible video, headlines and timed captions; Actual YouTube link Create failed during downloader preparation: Web adapter not implemented: PanelShellRunnerAdapter.run |
| `six-clip-velocity` | **passed / created-visible-pending-reopen**. Six 8-second videos selected; 23.2s Draft with editable 114 pieces generated; Actual source pattern visible at3:02, title graphic present; reopen and effect checks pending; Saved Draft reopened and rendered source footage, but playback remained at 00:00 on this retry. Full playback remains unverified. |
| `summer-trip` | **passed / created-visible-reopened-photo-path-unverified**. Six original 8s test videos, photos off, short length, default Surf Indie music. Actual Create completed with17.7s Draft and visible source video. One scene-search fallback reported; title/effects/reopen pending.; Playback advanced to11.9s with SUMMER VLOG overlay visible.; Reloaded project restored actual video and populated timeline; screenshot summer-trip-reopened.png. |
| `tang-poetry-explainer` | **passed / generation-unverified-credit-accounting**. Actual install succeeded and core input panel rendered. Paid final generation not yet run; account dashboard does not expose generation charges. |
| `tetris` | **passed / partial-failed**. Normal game started; move/rotate/drop increased score to 16; pause and main menu worked; Play a friend > New code > Connect failed: Web adapter not implemented: PanelShellRunnerAdapter.run; No desktop-install dialog on this caught panel error |
| `thank-you-recap` | **passed / passed**. Selected 15 original 8-second videos and a 20-second hero; excluded zero-duration generated outputs. Create produced 49 cuts in a 20.6-second Draft.; Playback visibly showed actual footage and the 2026 / THANK YOU overlay.; After reopening the project, saved Draft played to 20:17 / 20:19. Screenshots: thank-you-title.png and thank-you-reopened.png.; Actual UI reinstall from published commit 1892039 succeeded with the production platform guard unchanged; setup confirms browser install success.; Reinstalled published manifest commit 1892039 through the actual web UI with the normal platform guard unchanged; browser installation success confirmed. |
| `the-end-credits` | **passed / created-visible-partial-source-skip**. Six analyzed original videos selected; photosoff; ten credit names edited toTest1..10.; ActualCreate produced24.7secondDraft ratherthan33s: one selectedvideo couldnotbechecked andwasskipped.; Playbackat8.5s showed THEEND,scrollingcreditroles/names,andactualvideo inwindow; end-credits-visible.png. Reopen/photos/fullframe remainunverified. |
| `timeline-shorts-builder` | **passed / failed-native-dimensions**. Selected real sample Short 1 (30.1s), Prepare thumbnails clicked; Native dimensions unavailable for 12 video/image clips; preparation stopped; no Draft created. |
| `torn-paper-love` | **passed / created-but-photo-render-unconfirmed**. Selected seven fresh 00-audit photos, videos disabled; 6.2 second editable Draft created; At 2:05 text and torn-paper border visible, photo content appears solid gray; no full visual pass |
| `travel-beat-vlog` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `vlog-edit` | **passed / blocked-skill-discovery**. Installer succeeded. Setup reports plugin skill name conflicts with built-in vlog-edit and is hidden in discovery; referenced SDK resource could not be read. End-to-end editing not verified. |
| `vlog-opening` | **passed / created-but-playback-stalled**. Retried with the existing analyzed landscape sample project; Whip style Build opening succeeded: 15.55 seconds, 12 clips, three graphic layers and bundled music.; After reload, the saved Draft and clips reappeared, but playback stayed at 00:00 and the preview remained black after 12 seconds. Do not declare web. |
| `vox-explainer` | Web core verified | Installed web panel generated a 20.1-second Korean explainer from fictional text: five videos, three narration clips, music, editable headlines and captions. Visible playback reached 19:22, and after a full page reload the saved Draft played to 14:10. URL-input variant, export and normal-gate reinstall remain untested. |

Do not treat an input validation error, missing file permission, absent credentials,
or an untested workflow as proof that the plugin can never support browsers.
A Saved message is insufficient when the actual preview is black. The file-access
failures are tracked separately and are being retested with a newly authorized
fixture folder. Concrete shell failures and unsupported SDK calls also require
the common desktop guidance to survive plugin-level error catches.

Additional environment findings: repeated setup histories exhausted localStorage,
preventing saves and new projects. The companion client moves browser agent
history into the existing IndexedDB metadata store with durable migration. New
project creation, imports and history reopening worked after the fix. Fresh PNG
source previews still render black; imported video and generated video Drafts
render correctly. The account usage dashboard displays unlimited analysis but
no generation credit ledger, so further paid generation is held. The Mac was unlocked and the longer test clip imported successfully. None of these is
a substitute for a completed core-workflow test.

Final accounting check: expanded AI image history entries also expose no charged-credit amounts. Further paid generation remains on hold; no zero-cost claim is made.

## Round 2 follow-up (2026-10-27)

- Vox Style Explainer completed paid generation and visible playback/reopening on the web target. The test used fictional book-exchange text, not personal footage. This admits its text-to-editable-Draft core path; it does not certify every URL source or export route.
- City Weekend Vlog's saved 13.3-second Draft reopened and played; the animated “A day” title was visible. Photo mode remains unchecked.
- The shared file-observation fix now accepts the browser source identity without inventing a native inode. Mini Vlog passed the original eight-video source checks, but then failed bundled music preparation. File presence and chunk reads were separately confirmed; the underlying preparation error is still under investigation.
- Other Round 1 failures and outstanding checks are not reclassified by these partial results.
