# Web platform admission audit

This migration reviews all 50 current packages. `platforms` is the client's
installation decision, not automatic inference from a panel's source code.
Twenty-six packages have passed actual installation, core creation or interaction,
visible output and reopening: Short Form Safe Zones, Fast Switching Stop Motion,
Cinema Vlog Studio, Thank You Recap, pov: you open my gallery, Vox Style Explainer,
Four Photo Stop Motion, Camera Shutter Dump, Six Clip Velocity, Torn Paper Love, News in One Minute, Tang Poetry Explainer, Jared Vox Editorial, Four Photo Reveal, Mini Vlog, Photo Grid Reveal, Archive Vlog, Vlog Edit, Medical Explainer, City Weekend Vlog, THE END Credits, Summer Trip, 8-Clip Daily Vlog, Polaroid Photo Dump, Place Count and Timeline Shorts Builder.
They declare `web`. Of the other 24 packages, 18 have identified current blockers
and 6 remain under active verification. These counts are not a completed audit.
Normal-platform-gate reinstall status is recorded per package below.
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
| `ali-abdaal-style` | Pending corrected-plugin retest | Actual 30s talking-head attempt failed on stale clip handles. The plugin handle fix and six portrait-geometry tests pass; a complete live edit and replay are still required. |
| `archive-vlog` | **Web verified after host fixes** | Installed `a4e059a`, created mixed video/photo 23.3s Draft with Marimba Motif. Full reload playback, CINEMATIC title at4:05, WEB TEST credit at5:19 and original photo at9:00 passed. One scene-search failure was explicitly skipped. Normal-gate reinstall passed at `aa5c693`. |
| `camera-shutter-dump` | **Web verified after host fix** | Installed and created a 10s Draft from twelve PNGs with shutter audio. Full reload playback at9:22 showed the photo collage after the Blob filename fix. Production platform-gate reinstallation also passed. |
| `card-news-maker` | Pending export retest | Three AI images and an editable three-card Draft were generated. PNG export timed out; raw PNG-to-ImageBitmap decoding was corrected, but the complete export needs retest. |
| `chris-williamson-style` | Blocked | [plugin.json](../plugins/chris-williamson-style/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `cinema-vlog-studio` | Web core verified | Actual install, core UI action, visible output and reopening passed; see runtime evidence and normal-gate retest status below. |
| `city-weekend-vlog` | **Web verified including photos** | Previous 13.3s video/title workflow passed. New photo-only run selected21 original PNGs, default Sunny Soul Strut and A day title, then saved City Weekend Vlog 2026-10-27 17:12. Visible playback at10:23 and full reload playback at3:00 showed actual photos/title. Normal-gate reinstall passed at `b6f3aa5`. |
| `cutout-beat-gallery` | Blocked | [plugin.json](../plugins/cutout-beat-gallery/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `daily-vlog-8` | **Web verified after host fixes** | Current-host retry completed from fixtures folder, opening clip01 and seven automatic choices. Saved20.48s Draft played through20:13; after full reload and explicit saved-tab selection, animated yellow title/source video played at3:03. Transitions, bundled song and SFX tracks remained. Normal-gate reinstall passed at `b6f3aa5`. |
| `depth-type-captions` | Blocked | [plugin.json](../plugins/depth-type-captions/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `doac-style` | Blocked | [panel.tsx](../plugins/doac-style/panel.tsx#L157): The caption workflow invokes a bundled Python runtime through the shell. |
| `eo-shorts` | Blocked | [plugin.json](../plugins/eo-shorts/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `epidemic-sound-search` | Blocked | [panel.tsx](../plugins/epidemic-sound-search/panel.tsx#L1020): Provider workflow uses shell/Python and desktop browser control. |
| `fast-switching-stopmotion` | Web core verified | Actual install, core UI action, visible output and reopening passed; see runtime evidence and normal-gate retest status below. |
| `four-photo-stop-motion` | **Web verified after host fix** | Installed and created an 11.6s Draft from four PNGs; visible source photos, blur and music. Full reload playback at8:03 passed after the Blob filename fix. Production platform-gate reinstallation also passed. |
| `gongju-gallery` | Web core verified | Actual install, core UI action, visible output and reopening passed; see runtime evidence and normal-gate retest status below. |
| `imessage-generator` | Native operation present | [panel.tsx](../plugins/imessage-generator/panel.tsx#L234): Local Kokoro setup and speech use Python/shell. Alternative cloud or silent paths have not been certified for web. |
| `jared-vox-editorial` | **Web verified after fix** | Actual install `8a73a60`, 21s generation from fictional article, five browser-rendered pan/zoom clips, three narrations, music, editable evidence cards/headings/captions. Full reload and saved playback at3:11 passed (`jared-reopened.png`). One image was automatically remade after checking. Normal-gate reinstall passed at `a4e059a`. |
| `jude-kinetic-style` | Blocked | [plugin.json](../plugins/jude-kinetic-style/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `medical-explainer` | **Web verified after sequential resume** | Actual installation, nine narrations, eighteen keyframes, eighteen scene clips, sixteen transition candidates, nine composed cards and eight transitions produced a 45.9s editable Draft. Full playback reached45:22; after full reload playback at11:08 showed video, heading and captions. Two unseen pointer labels were explicitly omitted. Normal-gate reinstall passed at `b6f3aa5`. |
| `mini-vlog` | **Web verified after host fix** | Actual mixed video/photo creation, title and bundled music succeeded. Full reload playback at5:20 showed photo-04 and title; Chrome reported audio playback. Browser app-owned file identity fixed; one scene-search failure was explicitly skipped. See Mini admission below. Normal-gate reinstall passed at `aa5c693`. |
| `multicam-generator` | Pending failure retest | A nested source was rejected; the raw C0005 talking-head retry failed during audio preparation. Retry a short actual-person source and verify the completed camera edits. |
| `music` | Blocked | [panel.tsx](../plugins/music/panel.tsx#L10): EpidemicSound and Artlist providers are unimplemented web adapters in the client. |
| `news-minute` | **Web verified after fixes** | Actual pinned install, 337-character script, 48.3s narration, seven scenes, finalized editable Draft and full-page reopening/playback at12:03 passed. Fixed iframe confirmation and browser literal-color background preparation. Automatic source checking timed out; sentences were manually reviewed. Normal-gate reinstall passed at `a4e059a`. |
| `no14-still-video` | **Web verified after fixes** | Actual install `0d5c289`, four original PNGs, eight editable Image clips plus music, and saved Draft `12f0165b-1efc-4f6f-8556-606c7d625942` passed. After full reload and Mac unlock, playback showed the photo composition/transitions at4:21 (`no14-unlocked-playback.png`). Fixed preset-parameter and optional-shader-field receipt comparisons; companion client avoids font embedding for text-free photo effects. Normal-gate reinstall passed at `a4e059a`. |
| `photo-gallery-no2` | **Web verified after host fixes** | Actual 20-photo/1-video creation succeeded, 21 saved slots read back, sequential reveal and monochrome-to-color playback visible with music. Full reload playback at6:13 passed. Normal-gate reinstall passed at `aa5c693`. |
| `place-count` | **Web verified after fixes** | Installed `15f37a5`; imported three30s official sample clips grouped by folder, completed all three AI scene analyses, and saved/recovered London (236frames,7.875s) with five source pieces, three editable titles and music. Playback reached7:24; full reload played actual footage/title at3:12. Fixed opaque-origin blob previews, concurrent contact writes, request-owned cache identity, unused desktop link creation and empty recovery commits. Synthetic color bars were not a reliable AI selection fixture. Normal-gate reinstall pending. |
| `podcast-hook-captions` | Blocked | [plugin.json](../plugins/podcast-hook-captions/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `polaroid-photo-dump` | **Web verified after caption receipt fix** | Reinstalled `b6f3aa5`, selected17 PNGs and saved13.9s Polaroid web verified with individual photos, satin frame, caption, zoom/grade and bundled audio. Playback reached13:21; full reload playback at7:09 showed the photo/frame/caption composition. Normal-gate reinstall passed at `95f24e3`. |
| `portrait-beat-montage` | Blocked | [plugin.json](../plugins/portrait-beat-montage/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `postcard-cutout-studio` | Native operation present | [panel.tsx](../plugins/postcard-cutout-studio/panel.tsx#L216): Bundled runtime invokes shell for cutout processing. A complete browser alternative has not been verified. |
| `recap-2026` | Pending live retest | Last run failed source identity verification. Optional face analysis alone does not prove a native requirement; retest the 20s hero and 15-clip workflow after the shared identity fix. |
| `selects-ai-runtime` | Blocked | [plugin.json](../plugins/selects-ai-runtime/plugin.json): Declares runtime.json, a native runtime requiring a desktop host. |
| `selfie-aesthetic` | Pending real-person framing | Synthetic-input 9.5s creation/playback passed, but three sources fell back to ordinary shots. Real-person framing remains unverified; synthetic patterns do not prove it. |
| `short-form-safe-zones` | Web core verified | Actual install, core UI action, visible output and reopening passed; see runtime evidence and normal-gate retest status below. |
| `shortform-clips` | Blocked | [plugin.json](../plugins/shortform-clips/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `shortform-cloner` | Native operation present | [panel.tsx](../plugins/shortform-cloner/panel.tsx#L237): Panel invokes shell; URL ingestion and full reconstruction need a browser implementation/verification. |
| `six-clip-velocity` | **Web verified** | Installed, created 114 editable pieces in a 23.2s Draft, reopened and played actual footage with vertical blur at10:17 after fixing the sample-only playback guard. |
| `summer-trip` | **Web verified including photos** | Earlier video/title path passed. New Short run used one20s video and21 PNGs with Surf Indie, title, photo grid/montage, film ending and muffled ending audio. Full reload showed SUMMER title at3:09 and original photo/film frame at14:16. Normal-gate reinstall passed at `b6f3aa5`. |
| `tang-poetry-explainer` | **Web verified after fix** | Actual UI reinstall of `8a73a60`, paid job resume, six generated videos, three narration clips, music and editable captions produced a 21.1s Draft. Saved result reopened after full reload and played at4:21. Sequential music persistence fixed overlapping Project writes. Normal-gate reinstall passed at `a4e059a`. |
| `tetris` | Blocked for complete workflow | Actual single-player move/rotate/drop, score 16, pause and menu passed. Multiplayer Connect failed with `PanelShellRunnerAdapter.run` unavailable. Desktop-install guidance was also missing on that caught error. |
| `thank-you-recap` | Web core verified | Actual install, core UI action, visible output and reopening passed; see runtime evidence and normal-gate retest status below. |
| `the-end-credits` | **Web verified including full-frame photos** | Earlier Classic/video replay passed. Full-frame Short mixed run selected one20s video plus21 PNGs, replaced10 placeholder names and created six shots with three actual photos and scrolling credits. Full reload playback at20:04 showed photo21/credits. One cut rounded one frame late; later cuts and total duration match the plan, and existing logic aligns credits to actual boundaries. Normal-gate reinstall passed at `b6f3aa5`. |
| `timeline-shorts-builder` | **Web verified** | Selected London with actual source media, prepared12 thumbnails using a worker, and created Timeline Shorts web verified (7.875s) with six embedded thumbnail images and one timeline graphic. Playback showed the video and moving timeline at4:05; full reload replayed both at3:15. Collection emitted six warnings but image preparation and saved output passed. Export remains separate and untested. Normal-gate reinstall pending. |
| `torn-paper-love` | **Web verified** | Installed, created 6.2s photo edit, reopened and played actual photos with torn-paper frame and MY LOVE graphics at4:10 after fixing browser image preview. |
| `travel-beat-vlog` | Blocked | [plugin.json](../plugins/travel-beat-vlog/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `vlog-edit` | **Web verified after host fix** | Direct installed skill read, actual four-video/four-photo edit, generated Korean narration, existing music, editable title and seven dissolves. Browser WebGPU rejected context-free transparent transition inputs; after the host fix the reopened 15s Draft played to14:23 and the dissolve at2:12 visibly blended both sources. Normal-gate reinstall passed at `aa5c693`. |
| `vlog-opening` | **Pending additional core styles** | Whip created a saved 15.55s Draft with 12 clips, graphics and music. After the client sample-playback guard fix, real footage played at3:24. Motion and Quotes styles remain unverified. |
| `vox-explainer` | Web core verified | Installed web panel generated a 20.1-second Korean explainer from fictional text: five videos, three narration clips, music, editable headlines and captions. Visible playback reached 19:22, and after a full page reload the saved Draft played to 14:10. Normal-gate reinstall passed at `a4e059a`; URL-input variant and export remain untested. |


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
editing. The initial 500-credit cap was explicitly lifted by the user for completion of all verification. Avoid duplicate generation; actual charged usage remains unconfirmed. One analysis request for
15 clips displayed 15 credits; final charged usage is not yet independently
confirmed. Card News Maker also generated three Nano Banana Pro images; their
charged usage remains unconfirmed, but further paid testing is authorized. Installation setup uses the app's normal assistant flow.

This is an **incomplete checkpoint**, not certification of all packages. The
source-review table above is not runtime proof. Live outcomes are recorded below;
untested packages remain pending. The five candidates listed above declare `web`;
their individual verification and normal-install limitations are recorded above.

| Plugin | Actual browser outcome so far |
| --- | --- |
| `a16z-style-captions` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `ali-abdaal-style` | **passed / failed-edit-commit**. Actual Create Ali Abdaal Style draft clicked for 30-second sample Draft; Transcript and visual-planning steps completed; editable draft creation failed; stale_clip_target: the draft changed after clips() was read; read clips() again; Uncommitted edit reported; failure is not proven browser-specific |
| `archive-vlog` | **Web verified after host fixes** | Installed `a4e059a`, created mixed video/photo 23.3s Draft with Marimba Motif. Full reload playback, CINEMATIC title at4:05, WEB TEST credit at5:19 and original photo at9:00 passed. One scene-search failure was explicitly skipped. Normal-gate reinstall pending. |
| `camera-shutter-dump` | **Web verified after host fix** | Installed and created a 10s Draft from twelve PNGs with shutter audio. Full reload playback at9:22 showed the photo collage after the Blob filename fix. Production platform-gate reinstallation also passed. |
| `card-news-maker` | **passed / failed-export-timeout**. Text planning and three Nano Banana Pro images succeeded; editable three-card Draft created; Export retried after other edit settled; first card rendering failed: signal timed out, duration31286ms. |
| `chris-williamson-style` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `cinema-vlog-studio` | **passed / passed**. Imported a 20-second landscape test source through the native file chooser. Assigned it to the required slots using the plugin's explicitly supported source reuse.; Actual Create produced a 21.35-second Draft with 23 cuts, bundled music and title. Seeking to 5:02 visibly rendered the source and scramble title.; After reload, reopened the saved Draft. Playback advanced from 3:18 to 8:01; the inset card was visible at 8:00. Screenshots: cinema-title-visible.png and cinema-reopened-playing.png.; Reopened saved Draft again and played from the beginning through 21:07 / 21:08; screenshot cinema-complete.png. Normal-metadata reinstall pending.; Reinstalled published manifest commit 1892039 through the actual web UI with the normal platform guard unchanged; browser installation success confirmed. |
| `city-weekend-vlog` | **Web verified including photos** | Previous 13.3s video/title workflow passed. New photo-only run selected21 original PNGs, default Sunny Soul Strut and A day title, then saved City Weekend Vlog 2026-10-27 17:12. Visible playback at10:23 and full reload playback at3:00 showed actual photos/title. Normal-gate reinstall passed at `b6f3aa5`. |
| `cutout-beat-gallery` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `daily-vlog-8` | **Web verified after host fixes** | Current-host retry completed from fixtures folder, opening clip01 and seven automatic choices. Saved20.48s Draft played through20:13; after full reload and explicit saved-tab selection, animated yellow title/source video played at3:03. Transitions, bundled song and SFX tracks remained. Normal-gate reinstall passed at `b6f3aa5`. |
| `depth-type-captions` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `doac-style` | **passed / failed-native-shell**. Create captions on analyzed vertical 9:16 30s sample Draft failed: Web adapter not implemented: PanelShellRunnerAdapter.run |
| `eo-shorts` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `epidemic-sound-search` | **passed / failed-native-shell**. Panel initialization and actual ambient Search display Web adapter not implemented: PanelShellRunnerAdapter.run |
| `fast-switching-stopmotion` | **passed / passed**. Actual UI install and Create Draft with 15 imported 8s test videos completed; editable 5.9s vertical Draft; rendered color bars visible and playback advanced. Synthetic inputs verify mechanics, not selfie shot-selection quality.; After leaving and reopening the project, saved Draft played from the beginning through 5:25 / 5:27 with actual source video. Screenshot fast-stopmotion-reopened.png.; Actual UI reinstall from published commit 1892039 succeeded with the production platform guard unchanged; setup confirms browser install success.; Reinstalled published manifest commit 1892039 through the actual web UI with the normal platform guard unchanged; browser installation success confirmed. |
| `four-photo-stop-motion` | **Web verified after host fix** | Installed and created an 11.6s Draft from four PNGs; visible source photos, blur and music. Full reload playback at8:03 passed after the Blob filename fix. Production platform-gate reinstallation also passed. |
| `gongju-gallery` | **passed / passed**. Actual Create new draft with fixtures folder and 15 videos completed. 11.4s Draft, title visible at start and cropped color-bar video visible during playback at5.7s. Reopen and random mode pending.; After reopening the project, the saved montage rendered actual cropped video and played through 11:07 / 11:09. Screenshot gongju-gallery-reopened.png. Generated resource list durations show zero even though Draft playback works; downstream reuse metadata remains a separate limitation.; Reinstalled published manifest commit 1892039 through the actual web UI with the normal platform guard unchanged; browser installation success confirmed. |
| `imessage-generator` | **passed / failed-shell-and-sdk-contract**. Set up free voices: Web adapter not implemented: PanelShellRunnerAdapter.run; Silent > Apply to Draft 16.7s: Panels cannot call canAuthorGeneratedMedia; sdk.call reads; use sdk.runScript to change the project |
| `jared-vox-editorial` | **Web verified after fix** | Actual install `8a73a60`, 21s generation from fictional article, five browser-rendered pan/zoom clips, three narrations, music, editable evidence cards/headings/captions. Full reload and saved playback at3:11 passed (`jared-reopened.png`). One image was automatically remade after checking. Normal-gate reinstall pending. |
| `jude-kinetic-style` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `medical-explainer` | **Web verified after sequential resume** | Actual installation, nine narrations, eighteen keyframes, eighteen scene clips, sixteen transition candidates, nine composed cards and eight transitions produced a 45.9s editable Draft. Full playback reached45:22; after full reload playback at11:08 showed video, heading and captions. Two unseen pointer labels were explicitly omitted. Normal-gate reinstall passed at `b6f3aa5`. |
| `mini-vlog` | **passed / failed-source-confirmation**. Selected eight analyzed original videos with photos disabled; actual Create failed at step 1/5: The selected source file could not be confirmed. Check the Project file and try again. |
| `multicam-generator` | **passed / failed-preparation**. Nested source rejected; prepared new Draft 2 from raw single-person C0005.mp4 and retried; New angle generation and Continue retry both failed in video/audio preparation with generic retry alert; no completed output, backend charge not observed. |
| `music` | **passed / failed-initialization**. Actual panel shows music loading failure for both Epidemic Sound and Artlist; search UI never becomes available |
| `news-minute` | **Web verified after fixes** | Actual pinned install, 337-character script, 48.3s narration, seven scenes, finalized editable Draft and full-page reopening/playback at12:03 passed. Fixed iframe confirmation and browser literal-color background preparation. Automatic source checking timed out; sentences were manually reviewed. Normal-gate reinstall of the new manifest remains pending. |
| `no14-still-video` | **Web verified after fixes** | Actual install `0d5c289`, four original PNGs, eight editable Image clips plus music, and saved Draft `12f0165b-1efc-4f6f-8556-606c7d625942` passed. After full reload and Mac unlock, playback showed the photo composition/transitions at4:21 (`no14-unlocked-playback.png`). Fixed preset-parameter and optional-shader-field receipt comparisons; companion client avoids font embedding for text-free photo effects. Normal-gate reinstall pending. |
| `photo-gallery-no2` | **passed / failed-file-identity**. Retested with all 21 fresh current-session photos explicitly assigned; Create Draft failed runtime_error: The file's size or identity could not be confirmed (line146,column20). |
| `place-count` | **passed / failed-local-media-support**. Panel reports Plugin assets or local-media support are unavailable. Reinstall Place Count or update Selects.; Choose folder clicked; no progress beyond initial blocked panel. |
| `podcast-hook-captions` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `polaroid-photo-dump` | **Web verified after caption receipt fix** | Reinstalled `b6f3aa5`, selected17 PNGs and saved13.9s Polaroid web verified with individual photos, satin frame, caption, zoom/grade and bundled audio. Playback reached13:21; full reload playback at7:09 showed the photo/frame/caption composition. Normal-gate reinstall passed at `95f24e3`. |
| `portrait-beat-montage` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `postcard-cutout-studio` | **passed / failed-native-shell**. Native folder chooser selected authorized fixtures folder; Could not open this folder. Details: Web adapter not implemented: PanelShellRunnerAdapter.run |
| `recap-2026` | **passed / failed-file-identity**. After footage loading completed, selected imported 20-second hero and 15 original fixture videos.; Actual 12-second sample creation failed: The file's size or identity could not be confirmed, line 146 column 20. No completed Draft. |
| `selects-ai-runtime` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `selfie-aesthetic` | **passed / created-synthetic-input-only**. Actual Create with photos disabled completed a 25-shot, approximately 10-second Draft.; One likely close-up reused; three sources fell back to ordinary shots. Synthetic footage verifies mechanics only; real-person framing is not validated.; Playback reached 9:13/9:14 with actual source video and visible color treatment; screenshot selfie-synthetic-visible.png. |
| `short-form-safe-zones` | **passed / passed-core-normal-install-pending**. Panel opened through Apps after real installer succeeded; Show guides toggle creates visible fuchsia guide clip on timeline; Source footage download pending before preview verification; Sample source footage downloaded through built-in confirmation UI; Guide visibly rendered over video with fuchsia timeline clip; Centre lines change completed; Toggle off removed guide and restored unobstructed preview; Re-added for persistence check; After page reload, reopened panel detected saved guide and rendered overlay; Removed guide after validation; final admission awaits normal metadata gate retest; Normal catalog update check reports latest version; same-version reinstall was not performed. Initial real install and core UI verification passed. |
| `shortform-clips` | **rejected-platform-policy / blocked-native-runtime**. Actual built-in app install showed desktop-required dialog; Package dependency selects-ai-runtime is native; direct pinned-package attempt still pending |
| `shortform-cloner` | **passed / partial-failed**. Analyzed project C0001.mp4 produced two editable shorts of 34.1s and 33.3s with visible video, headlines and timed captions; Actual YouTube link Create failed during downloader preparation: Web adapter not implemented: PanelShellRunnerAdapter.run |
| `six-clip-velocity` | **Web verified** | Installed, created 114 editable pieces in a 23.2s Draft, reopened and played actual footage with vertical blur at10:17 after fixing the sample-only playback guard. |
| `summer-trip` | **Web verified including photos** | Earlier video/title path passed. New Short run used one20s video and21 PNGs with Surf Indie, title, photo grid/montage, film ending and muffled ending audio. Full reload showed SUMMER title at3:09 and original photo/film frame at14:16. Normal-gate reinstall passed at `b6f3aa5`. |
| `tang-poetry-explainer` | **Web verified after fix** | Actual UI reinstall of `8a73a60`, paid job resume, six generated videos, three narration clips, music and editable captions produced a 21.1s Draft. Saved result reopened after full reload and played at4:21. Sequential music persistence fixed overlapping Project writes. Normal-gate reinstall pending. |
| `tetris` | **passed / partial-failed**. Normal game started; move/rotate/drop increased score to 16; pause and main menu worked; Play a friend > New code > Connect failed: Web adapter not implemented: PanelShellRunnerAdapter.run; No desktop-install dialog on this caught panel error |
| `thank-you-recap` | **passed / passed**. Selected 15 original 8-second videos and a 20-second hero; excluded zero-duration generated outputs. Create produced 49 cuts in a 20.6-second Draft.; Playback visibly showed actual footage and the 2026 / THANK YOU overlay.; After reopening the project, saved Draft played to 20:17 / 20:19. Screenshots: thank-you-title.png and thank-you-reopened.png.; Actual UI reinstall from published commit 1892039 succeeded with the production platform guard unchanged; setup confirms browser install success.; Reinstalled published manifest commit 1892039 through the actual web UI with the normal platform guard unchanged; browser installation success confirmed. |
| `the-end-credits` | **Web verified including full-frame photos** | Earlier Classic/video replay passed. Full-frame Short mixed run selected one20s video plus21 PNGs, replaced10 placeholder names and created six shots with three actual photos and scrolling credits. Full reload playback at20:04 showed photo21/credits. One cut rounded one frame late; later cuts and total duration match the plan, and existing logic aligns credits to actual boundaries. Normal-gate reinstall passed at `b6f3aa5`. |
| `timeline-shorts-builder` | **passed / failed-native-dimensions**. Selected real sample Short 1 (30.1s), Prepare thumbnails clicked; Native dimensions unavailable for 12 video/image clips; preparation stopped; no Draft created. |
| `torn-paper-love` | **Web verified** | Installed, created 6.2s photo edit, reopened and played actual photos with torn-paper frame and MY LOVE graphics at4:10 after fixing browser image preview. |
| `travel-beat-vlog` | **rejected-native-runtime / blocked-before-execution**. Actual install click displays desktop-required dialog with native runtime guard retained |
| `vlog-edit` | **Web verified after host fix** | Direct installed skill read, actual four-video/four-photo edit, generated Korean narration, existing music, editable title and seven dissolves. Browser WebGPU rejected context-free transparent transition inputs; after the host fix the reopened 15s Draft played to14:23 and the dissolve at2:12 visibly blended both sources. Normal-gate reinstall pending. |
| `vlog-opening` | **Pending additional core styles** | Whip created a saved 15.55s Draft with 12 clips, graphics and music. After the client sample-playback guard fix, real footage played at3:24. Motion and Quotes styles remain unverified. |
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
no generation credit ledger, so actual charges remain unconfirmed; further paid generation is now authorized. The Mac was unlocked and the longer test clip imported successfully. None of these is
a substitute for a completed core-workflow test.

Final accounting check: expanded AI image history entries also expose no charged-credit amounts. The user has authorized further paid generation beyond 500 credits; no zero-cost claim is made.

## Round 2 follow-up (2026-10-27)

- Vox Style Explainer completed paid generation and visible playback/reopening on the web target. The test used fictional book-exchange text, not personal footage. This admits its text-to-editable-Draft core path; it does not certify every URL source or export route.
- City Weekend Vlog's saved 13.3-second Draft reopened and played; the animated “A day” title was visible. Photo mode remains unchecked.
- The shared file-observation fix now accepts the browser source identity without inventing a native inode. Mini Vlog passed the original eight-video source checks, but then failed bundled music preparation. File presence and chunk reads were separately confirmed; the underlying preparation error is still under investigation.
- Other Round 1 failures and outstanding checks are not reclassified by these partial results.
- Four Photo Stop Motion passed its photo-only main path after the shared browser preview fix: actual install, four source photos, 11.6-second creation, visible playback, full reload and playback to 8:03.
- Camera Shutter Dump also passed actual creation and reopening after the same preview fix: twelve editable photos and shutter sound clips, visible 10-second collage, reopened playback at 9:22.

- Normal platform validation remained enabled when Camera Shutter Dump and Four Photo Stop Motion were reinstalled successfully from `e0df75b`. Vox same-version reinstallation remains pending.
- Music is currently unsupported: both provider services are explicitly unimplemented in the web adapter (`EpidemicSoundAdapter.execute/connect`, `ArtlistMusicAdapter.execute`). This explains the two observed initialization failures independently of account credentials.

### Sample-project playback guard and Six Clip admission

- Sample playback incorrectly tested every imported resource before playing any Draft. An unrelated revoked browser file handle prevented all playback. The guard now checks only the footage directory restored by the sample download.
- `six-clip-velocity`: previously installed and generated 114 editable pieces, 23.2s. Reopened result now plays with visible source footage and vertical blur at 10:17. Evidence: `/tmp/web-plugin-verification/round2/six-playback.png`. Add `web` (9 admitted plugins total).
- `vlog-opening`: saved Whip15.55s now plays visible original footage at3:24. Motion and Quotes still pending; do not add web yet.

### Torn Paper admission

`torn-paper-love`: actual installation and six-second photo edit creation were already verified; the bare-blob image preview bug caused gray source photos. With the shared browser image fix, the saved 6.2s Draft reopens and plays at4:10 with actual photos, torn-paper frame and MY LOVE graphics. Evidence: `/tmp/web-plugin-verification/round2/torn-paper-reopened.png`. Add web: 10 verified plugins total.

### News workflow follow-up

- Actual text generation produced a 337-character fictional news script. Automated source checking timed out twice; its source-aligned sentences were manually reviewed.
- The iframe's native `window.confirm` prevented approval. The panel now uses `sdk.confirm`; the actual web confirmation dialog and approval completed after reinstalling `f3a0e41`.
- Paid narration completed (48.3 seconds; UI quote 4.85 credits, not independently confirmed charge). Seven visual scenes were generated; one overflowing card was shortened through the panel editor.
- Preview initially failed with `browser_ffmpeg_input_must_be_local`: the host allowed only black `lavfi` color sources. Client commit `499f9cd862` also accepts a strictly bounded six-digit hex color; file and graph restrictions remain. Actual Chrome media tests: 22 passed. Preview creation is being retried; news is not yet admitted.
- Photo template shader-preset receipt support is fixed in `85e2ee8` (59 tests passed); No.14 live retest remains required.

- News follow-up completed: the corrected background rendered, all seven scenes were saved, and the 48.3s editable Draft was finalized. After full page reload playback reached 12:03 with visible headline, flow cards and captions. Evidence: `/tmp/web-plugin-verification/round2/news-reopened.png`. Admit `news-minute` (11 verified); normal-gate reinstall of its new manifest remains pending.

### Tang Poetry live retest — 2026-10-27

Installed commit `8a73a60` through the web UI and resumed the existing paid job `vxmvqpki6u`. Serializing music persistence before scene writes fixed the concurrent Project write failure. All six generated video clips, three narration clips, music, headings and captions were assembled into a 21.1-second editable Draft. Playback showed the generated imagery and captions; after a full page reload, the saved Draft reopened and played at 4:21. Evidence: `tang-playback.png`, `tang-reopened.png` in the task evidence directory. Web admitted only after this retest. Normal metadata-gate reinstall remains pending. Current checkpoint: 12 verified, 18 unsupported, 20 unresolved.

### Latest normal-gate reinstall and fixes — 2026-10-27

- Production `BrowserPluginInstaller` platform validation was unchanged while the actual web UI reinstalled `no14-still-video`, `jared-vox-editorial`, `tang-poetry-explainer`, `vox-explainer`, `news-minute`, `six-clip-velocity`, and `torn-paper-love` from `a4e059a`. Each completed the browser installer and opened setup with an explicit installation-success message. This supersedes their pending normal-gate reinstall entries above.
- The companion client merged current develop; the pre-push suite passed 16,031 tests (22 skipped). Clicking Shortform Clips still displayed the desktop-install guidance after the merge.
- Medical generated nine narrations, eighteen keyframes and eighteen scene clips. Assembly stopped at strip 7 with the shared Project writer lock while other audit apps were concurrently building. This is not a browser-incompatibility verdict. The saved job is retained for sequential resume; no duplicate paid generation is needed.
- Mini Vlog and Photo Grid latest attempts stalled/failed in source confirmation. Shared full-byte fingerprinting now uses the panel client's single SDK invocation per file instead of one invocation per 48 KiB chunk (77 tests passed, one skipped). Actual UI retests remain required.
- Card News PNG export now decodes rendered PNG bytes into an ImageBitmap before final canvas composition; actual export retest remains required.
- Vlog Edit's guide now supports browser `view_image` for each source photo; local HTTP contact sheets are a desktop alternative. Direct reading of the plugin skill succeeded despite the same-name discovery warning. Actual edit/playback remains required.

- The latest Mini Vlog retest exposed a second source-observation issue: app-owned browser files (including bundled music) returned no `sourceIdentity`, while granted originals did. The companion client now exposes the canonical owned path through the same existing stat field. Twenty real-Chrome filesystem tests and web typechecking passed. The next actual Mini run passed music verification and created its Draft; decoration and replay are still being checked.

### Mini Vlog admission

Actual `a4e059a` web installation, four selected original 8s videos plus four PNG photos, default Buant Hook music, and the Small Glimpse title produced the editable Draft `Mini Vlog A small glimpse 2026-10-27 08:21:51` (14:01 displayed). After the app-owned file-identity correction, music and complete assembly/decoration succeeded. Playback showed original video and the title; after a full page reload, playback at5:20 showed photo-04 with the editable title, and Chrome reported audio playback. Proof: `mini-playback.png`, `mini-reopened.png`. One source scene-search failed and was explicitly skipped; this is recorded, not hidden. Admit `web`; normal-gate reinstall of the new manifest is still pending. Current totals: 15 admitted, 18 blocked, 17 unresolved.

## Photo Grid admission after mixed-media retest

Installed `a4e059a`, selected 20 original PNGs and `long-hero-20s.mp4` in slot04, default Unexplored music at113BPM. Actual Create saved `Photo Grid mixed web verified` (14:04 displayed) and independently verified all21 slots. Native playback showed sequential grayscale reveal, then all21 colored cells with the moving video tile and audible music. Full page reload restored the saved Draft; actual playback at6:13 showed the complete colored gallery. Evidence: `grid-playing.png`, `grid-color.png`, `grid-reopened.png`. Admit web. Normal-platform-gate reinstall remains pending. Current totals:16 admitted,18 blocked,16 unresolved.

Medical resumed without new paid media. Strip files1/6/7 had fresh modification times15:32/15:39/15:40UTC; the run later failed with a Project write-reservation error before strips.json was saved. Transition generation had not started. This remains unresolved, not admitted.

### Archive Vlog admission

Actual installed `a4e059a` UI created `Archive Vlog CINEMATIC 2026-10-27 09:01:47` from four original videos and four photos, short montage, default Marimba Motif, CINEMATIC title and WEB TEST credit. Five creation stages completed and saved a 23.3s editable Draft. One failed scene analysis was explicitly skipped. Continuous playback and full-page reopening passed. Reopened frames showed the decoded CINEMATIC title at4:05, ARCHIVED BY WEB TEST at5:19 and original photo-01 at9:00. Evidence: `archive-playing.png`, `archive-title-reopened.png`, `archive-credit-reopened.png`, `archive-photo-reopened.png`. Admit web; normal-gate reinstall pending. Totals:17 admitted,18 blocked,15 unresolved.

### Vlog Edit admission after transition fix

Installed plugin skill was read directly despite a discovery-name collision; all four source photos were inspected with view_image. Actual editing created `Vlog Edit web verified` (`1b833c80-35de-467c-b5cb-ab031eb38332`), 15s at540x960/24fps, four videos alternating with four original PNGs, seven0.5s dissolves, editable Korean title, generated32-character Korean narration and reused Buant music with ducking/fade. Initial replay repeatedly froze at1:20. Diagnostics proved WebGPU rejected a transition input canvas without a rendering context. The host now initializes that transparent input. After full reload the same saved Draft played through14:23; a second replay showed photo-03 at10:08 and seeking2:12 showed the dissolve blending video/photo beneath the title. Proof: `vlog-edit-fixed-playback.png`, `vlog-edit-fixed-replay.png`, `vlog-edit-dissolve-fixed.png`. Admit web; normal-gate reinstall pending. Totals:18 admitted,18 blocked,14 unresolved.

### Medical admission after sequential resume

Existing paid job `mxmvqrqjjy` was resumed without duplicate scene generation. All nine strips and sixteen transition candidates completed. A Chrome tab crash (code5) interrupted the run; the saved job resumed again. Browser composition created nine scene cards and eight transitions, then editable headings, labels, captions and nine narration clips in `심장 펌프 혈액의 길 · Medical` (45:23 displayed). The isolated resume took roughly21minutes, largely local rendering. The app reported all sentence/scene checks passed and explicitly omitted two pointer labels whose target was not found. Actual playback reached45:22; full-page reload and playback at11:08 passed. Proof: `medical-playing.png`, `medical-reopened.png`. This verifies the software workflow, not medical factual accuracy. Admit web; normal-gate reinstall pending. Totals:19 admitted,18 blocked,13 unresolved.

### City Weekend photo workflow admission

The installed panel selected no videos and21 original PNGs, with default Sunny Soul Strut music and A day title. All five stages completed and saved `City Weekend Vlog 2026-10-27 17:12` (13:08 displayed). Playback at10:23 showed the actual photo montage; full-page reload and playback at3:00 showed original photos and the animated title. Earlier video-only playback had already passed. Proof: `city-photo-playing.png`, `city-photo-reopened.png`. Admit web; normal-gate reinstall pending. Totals:20 admitted,18 blocked,12 unresolved.

### THE END Credits mixed/full-frame admission

Selected Full frame, Short, Last Light Ballad,21 PNGs and one20s original video. All10 placeholder names became Web Test. Full-frame photo-only selection could not fill the5.1s opening under the plugin photo-hold limit; adding the video enabled the valid mixed workflow. Saved `THE END Credits 2026-10-27 17:15` (`ffd20c07-912a-4680-832c-01416ff8f119`) has six shots including three photos, music and scrolling editable credits. Actual replay passed; after full reload15:20 showed footage/credits and20:04 showed photo21/credits. Proof: `end-full-photo-playing.png`, `end-full-photo-reopened.png`, `end-full-photo-reopened-late.png`.

The panel reported a planned-frame warning. Read-only SDK inspection found fps24000/1001 and actual boundaries `[0,122,215,308,401,493,598]`; the62BPM/default4.698s music-offset grid is `[0,122,215,308,400,493,598]`. Only one cut is one frame late (about0.042s); following cuts and duration recover. Existing assembly logic/test explicitly handles this source-range rounding and places credits using actual boundaries. Record this timing limitation rather than conceal it. Admit web; normal-gate reinstall pending. Totals:21 admitted,18 blocked,11 unresolved.

### Summer Trip mixed-media admission

The installed panel used one20s original video plus21 PNGs, Short/defaultSummer style, Surf Indie, color/SFX/muffled-ending options. All five creation stages completed in `Summer Trip SUMMER 10:19:36` (17:21 displayed). Actual playback showed original photos in the film-frame ending at14:09. After full-page reload the SUMMER title played at3:09 and native ruler seek14:16 showed the original photo/film frame again. Proof: `summer-photo-playing.png`, `summer-photo-reopened-title.png`, `summer-photo-reopened-verified.png`. Admit web; normal-gate reinstall pending. Totals:22 admitted,18 blocked,10 unresolved.

### Daily Vlog admission after current-host retry

Opened the installed panel, selected fixtures, opening clip01 and seven automatically chosen original8s clips. Unlike the earlier timeout, creation completed. `8-Clip Daily Vlog — 2026. 10. 27. 오전 10:22:07` (20:14 displayed) contains10 Main pieces, three editable titles, transitions, bundled music and SFX. Initial playback crossed the transition at4:09 and ended20:13. After full-page reload, explicitly selected the saved Draft tab; playback at3:03 showed the animated yellow DAILY VLOG text over original footage. Proof: `daily-playing.png`, `daily-reopened.png`. Admit web; normal-gate reinstall pending. Totals:23 admitted,18 blocked,9 unresolved.

## Polaroid caption receipt correction and web admission

A current-host run reproduced Graphic placement could not be confirmed. The plugin expected trackId in addMotionGraphic’s return value, which only provides clipId and interval. Commit `b6f3aa5` resolves the live clip after authoring. Correcting the fixture to the real receipt reproduced18 failed checks before the fix; all88 selected authoring checks pass after it. The actual fixed package then completed the17-photo UI workflow and saved replay. Evidence: `/tmp/web-plugin-verification/round2/polaroid-playing.png` and `polaroid-reopened.png`.
