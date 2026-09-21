# Multicam Generator

Generate an alternate camera view from a continuous source shot and add it as a separate editable video clip above the original in the current Selects Draft. Original tracks and audio are preserved. This is AI viewpoint generation, not synchronization of recorded cameras.

**Experimental · 0.1.0-alpha.2**

## Setup

Follow [INSTALL.md](INSTALL.md). See [THIRD_PARTY.md](THIRD_PARTY.md) for dependencies.

## Use

1. Open a Draft and put its playhead on a continuous video-file-backed shot with original speech.
2. Open **Multicam Generator**, choose an angle and a length from 3–10 seconds, and optionally describe framing, gaze or expression changes (up to 500 characters).
3. Click **Generate angle**. The panel inspects three source frames, uploads the prepared video and speech through Selects, generates an angle, and performs lip-sync correction. Generation uses account credits and sends source media to managed generation services.
4. Review the separate **Generated angle** clip. Trim, move or remove it in the timeline; original audio remains underneath. **Show result** returns to the shot, **Regenerate this shot** replaces the previous generated lane after success, and **Start a new shot** clears the completed panel request.
5. Export the finished video through **Handoff → Export**.

## Camera presets

Choose among 23 presets grouped into Classic, Cinematic and Experimental. The panel shows the selected composition description. Experimental viewpoints may reconstruct unseen details and be less consistent with the source.

## Recovery and limitations

- Requires the managed models named `Kling O1 Edit Video [Pro]` and `Sync Lipsync`. No personal provider key is required. Model availability and billing depend on your Selects account.
- Nested multicam sequences, gaps, discontinuous source intervals and shots without source-file audio are rejected. Select a continuous shot backed directly by one video file.
- AI identity, motion, viewpoint and lip-sync fidelity are not guaranteed; inspect every generated result before delivery.
- Timing mismatches are rejected rather than silently stretched. Intermediate imported media may remain in the project.
- Progress is stored in panel local storage. Reopen the original Draft and use **Continue** to resume supported stages. An uncertain paid submission is not retried automatically; check its status in Selects before starting another.
- A confirmed failed lip-sync job can be retried with **Continue**, which can incur another generation charge. Import/collection failures do not trigger a new angle generation.
- Uses internal Selects host adapters and is version-sensitive. macOS development-build packaging only; released-version and other platform compatibility are unverified.
- Local media cache lives under the user's `.selects/plugin-data/multicam-generator/jobs` directory. Diagnostic logs are written beside the panels root under `logs`; Python 3 is used only for diagnostic logging. No cache, logs, footage or job state is distributed.

## Verification

Publication checks cover the repository manifest, public-source scan, repository unit tests, exact copying of the installed panel, and anonymous download integrity. These checks do not establish generation quality or end-to-end operation. No paid generation, installation test or Draft edit was performed for this publication.
