# Multicam Generator

Create another camera view of one person in a continuous source shot. Choose a video model and camera angle, then generate with lip sync to the original speech. The finished result is automatically saved as a separate editable video clip above the source in the current Selects Draft. Original tracks and audio are preserved.

**Experimental · 0.1.0-alpha.3**

This is AI viewpoint generation, not synchronization of recorded cameras. Identity, viewpoint, movement and lip-sync fidelity are not guaranteed.

## Setup

Follow [INSTALL.md](INSTALL.md). Dependencies and media handling are described in [THIRD_PARTY.md](THIRD_PARTY.md).

## Use

1. Open a Draft and place its playhead on a continuous shot containing one identifiable person and original speech.
2. Open **Multicam Generator**. Choose a model, an angle card and the duration. The default is Seedance 2.5 and 5 seconds. Most models accept integer lengths of 4–10 seconds; MiniMax H3 requires 5–10.
3. Choose from nine preset cards, or select **Custom angle** and enter a camera instruction of up to 500 characters. An optional additional request can describe framing, gaze or expression changes.
4. Click **Generate angle**. Selects inspects the source, prepares the media, generates the new viewpoint, corrects lip sync and automatically adds the result to the Draft. There is no approval screen before insertion.
5. Trim, move or remove the separate clip in the timeline. **Show result** returns to the shot. **Regenerate this shot** replaces its previous generated lane only after the new result succeeds.
6. **Start over** clears the form and archives the previous request locally; it does not cancel a running generation. A new generation is billed separately. Export finished videos through **Handoff → Export**.

The cards show an angle name, example image and camera instruction. Their embedded 600-pixel-wide WebP images illustrate framing only: they are not uploaded as identity references. The custom card has a 16-view contact sheet. The grid uses two columns except in very narrow panels. UI translations follow the app language for German, English, Spanish, French, Italian, Japanese, Korean, Portuguese, Turkish and Chinese. Generation prompts and user-entered text are not translated.

## Models and source data

| Choice | Source sent through Selects | Generation adapter |
| --- | --- | --- |
| Seedance 2.5 (default) | Selected video interval and three original person-reference frames | Reference-to-video editing |
| Seedance 2.0 / Fast / Mini | Video interval and three original person-reference frames | Reference-to-video |
| Wan 3.0 | Video interval and three original person-reference frames | Reference-to-video |
| MiniMax H3 | Video interval and three original person-reference frames | Reference-to-video, 768p |
| Gemini Omni Flash 1.1 | Video interval only; no separate face-reference images | Video editing, 720p |
| Kling 3.0 Omni Pro | Video interval and a character element containing three original frames | Reference-video editing |

Other models generally request 720p; Kling Pro uses its provider-defined resolution. Original speech and the generated video are then sent to Sync Lipsync 2 Pro. Account access and generation charges apply. No personal provider credentials are required.

Omni verifies a continuous single-person shot without requiring three clear face views. Source inspection extracts its own frames with FFmpeg and attaches them to the panel's AI call as one contact sheet, so a Resource no longer has to be analyzed first and no analysis credits are spent. Every model whose catalog ID is verified calls Selects' native media service directly, using stable request keys for duplicate protection; the native host/server validates the input. Catalog IDs were verified on September 23, 2026. A catalog name outside that list falls back to AI-mediated catalog and schema discovery. Saved legacy Kling requests retain their original model.

## Recovery and limitations

- Gaps, nested multicam sequences, discontinuous intervals, multiple-person shots and source files without speech are unsupported. Use a shot backed directly by one video file.
- New viewpoints can reconstruct unseen details incorrectly. Inspect the added result before final delivery; automatic insertion does not mean its visual quality has been approved.
- Source video is resized and padded without cropping. A Seedance result up to 0.35 seconds short is extended by holding its last frame before lip sync. Larger shortages and other timing mismatches stop processing. Final post-Sync timing is checked strictly.
- Reopen the original Draft and choose **Continue** to resume saved stages. Opening a panel alone never starts inference or changes the Draft. Older requests paused at the former review step show **Add to draft** and reuse their saved result.
- Unknown submission acknowledgements are not automatically resubmitted. Check the existing generation before starting another. Do not interpret a timeout as proof that a paid request failed.
- AI-mediated generation calls were observed dropping a required empty `params` object and mistranscribing opaque model IDs. Verified catalog models now skip that relay entirely through the native path, and the remaining read-only schema lookup no longer fails a job when the relay itself fails. A catalog name outside the verified list still uses the relay and may hit the upstream issue.
- When a provider refuses a request, the panel now shows the reason it reported instead of a generic message, so a content-policy refusal is distinguishable from a transient failure without leaving the panel.
- Native request keys intentionally prevent duplicate submissions. If a native Sync job has terminally failed, **Continue** currently reuses that failed stage's key; it cannot create a fresh correction job. Retain the existing result and start a new request if needed. This may generate and bill both stages again.
- Uses internal Selects adapters and is version-sensitive. Tested on macOS in Selects Staging 2.0.443. Other builds and platforms are unverified. One renderer stopped refreshing after completion and recovered after restarting the app; the plugin does not fix that host rendering issue.
- Local cache lives under `.selects/plugin-data/multicam-generator/jobs`; diagnostic logs are beside the panels root under `logs`. Python 3 is used only for optional diagnostics. No cache, logs, footage, account information or saved requests are distributed.

## Verification

A live 4-second Omni → Sync run completed, its result played in the comparison UI of the preceding revision, and the new automatic-insertion path added and saved it as one editable clip. Native generation through final import took about 5 minutes 11 seconds in that run; this is not a latency guarantee. No additional paid generation was run for localization or packaging. No successful paid end-to-end generation was obtained for this revision: every attempt on the available footage was refused upstream with `content_policy_violation`, including direct API calls carrying a neutral prompt and no reference images. The changes here were verified structurally and by panel runs reaching the provider call, not by a completed generation.

Structural checks covered 54 synthetic person/angle combinations, no source-person constants or undefined identifiers, native request scoping and upload slots, stable per-stage keys, and preservation of original content and audio order during placement. Packaging checks cover the manifest, public-source scan, repository tests and anonymous download integrity. These checks do not establish quality for every angle or model.
