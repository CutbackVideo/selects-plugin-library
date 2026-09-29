# Selects Staging validation — 2026-09-30

No.2 test Project `5b910ea1-20dc-4548-8710-b576030707d9` has 21 distinct generated real-photo PNG Image Resources, `r0`–`r20`, each 1122×1402. The No.14 Project and Drafts were not edited for this test. No Selects client source was changed.

The reference is not a purely static photo grid. Comparing the interior of each cell between frames 300, 360, ..., 840 identifies sustained movement in slots **4, 6, 11, 17, 19, and 21** (one-based, left-to-right then top-to-bottom). Their mean RGB differences between one-second samples range from 2.4 to 35.8 on a 0–255 scale, versus at most 0.9 for the other 15 slots. The current all-Image export proves layout and timing, but does **not** reproduce this motion. These observed moving slots are recorded in `reference-oracle.json`; users can still deliberately assign an Image or Video to any slot.

| Check | Result |
| --- | --- |
| Public `overlayResource(Image)` | Rejected with `not a Video/Audio asset`. Public `sourceFiles()` omitted Image dimensions. |
| Editor-owned panel route | `window.parent.__DI__.TimelineMutation.run` placed original Image Resources as independent Video-track clips and held them through frame 852. An empty Draft was authored at 60 fps before a gap established 853 frames. |
| 21-Image probe Draft | `634e8fc5-7570-4bd4-912c-fec84eba88bc`: 21 original Image clips, 21 distinct tracks, starts `0,12,23,36,45,52,62,73,81,90,100,113,122,133,143,151,161,172,182,192,205`, all end 853. Shared effects and transforms committed. Captured frames show grayscale at 269 and color at 270. |
| Probe native export | `gallery-21-original-images-fhd.mp4` completed: H.264, 1080×1920, 60 fps, 853 frames, 14.216667 s. |
| Actual `Photo Gallery 21` panel | From 21 Image inputs and manual BPM 113, one click created Draft `4195f615-99fd-43da-bcdc-b4a2b4cbb547`; its own saved readback returned 21 matching tiles. |
| Actual panel native export | `gallery-panel-one-click-fhd.mp4` completed: H.264, 1080×1920, 60 fps, 853 frames, 14.216667 s. Decoded every output frame: each of the 21 tile regions was black immediately before its specified reveal and nonblack at that exact frame. Mean visible-pixel chroma was `0.0` at frame 269, `51.28` at frame 270, and `52.32` at frame 852. The 3×7 grid remains visible through the end. See `work/photo-gallery-no2-test/native-image-route-probe/panel-export-contact.png` in the parent workspace. |
| Mixed Images/Videos, first live attempt | A 1-second video and a 15-second video were selected for tiles 20/21. The short video was converted to a held Video Resource; the Draft was created at 60 fps and 853 frames. Native placement of Video failed with `Source range exceeded` before styling. This **was not** a successful mixed-media result. |
| Mixed-media correction | The plugin now routes only Images through the native panel service and routes Videos through public `overlayResource(Video)`. Unit and panel behavior tests pass. **Live Staging playback/export of this correction is still pending.** |

The first public-only Staging attempt on September 29 stopped before Draft creation because Image dimensions and Image overlays were unavailable through the public SDK. The panel route above resolves the Image case without converting photographs to MP4. It is provisional because `__DI__` is an app-owned panel service rather than a stable published plugin SDK contract.

Remaining acceptance work: live mixed-media create/playback/native export; restart and saved-Draft readback; landscape/square/portrait and explicit reuse in the app; optional music, BPM estimate, duplicate-click and transport-loss behavior in the app; one-slot replacement preserving manual edits; and chat-only creation with original Images. Unit tests alone do not satisfy these cases.
