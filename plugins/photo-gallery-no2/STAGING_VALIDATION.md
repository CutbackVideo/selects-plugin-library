# Selects Staging validation — 2026-09-29

Build: Selects Staging 2.0.506 (`com.cutback.app.staging`). Plugin: `photo-gallery-no2` 0.1.0-alpha.5, installed from this package. Test Project: `6a4bfa52-cc99-457c-8410-ca3b943e22fd` with 21 distinct `photo-01.jpg` through `photo-21.jpg` Resources (`r0`–`r20`). No client source was changed.

| Check | Observed result |
| --- | --- |
| Plugin discovery | `Photo Gallery 21` appeared in the Apps list and its panel opened. |
| Media input | All 21 JPGs imported as Image Resources. After retrying one transient app read error, the panel listed them and `Assign all 21 in listed order` set 21/21 slots. |
| BPM input | Manual BPM control accepted the original reference value, 113. |
| Create via panel | Stopped before a mutating request with `This Selects build does not expose photo dimensions for native Image clips. Update Selects.` The Project reported `draftIds: []` afterward. |
| Native Image overlay capability | A simulation-only Draft with a 1-second gap rejected `overlayResource({ resource: project.resource('r0'), over: ... })` with `Resource ... is not a Video/Audio asset`. No probe Draft was committed. |
| Main Image placement | `insertResource({resourceId:'r0'})` worked in a simulation, but places an Image on Main. It cannot produce 21 simultaneous independent tiles and is not a substitute for Image overlays. |
| Saved Draft, playback, native export, reference comparison | Not reached for this JPG-based version. Do not count the previous MP4 version's export as a pass. |

The app's current public `ProjectSourceFileNode` declaration permits `video | audio | sequence`, and `sourceFiles()` returned each imported JPG as `type: 'video'` without `frameSize`, while `project.resources()` correctly returned `type: 'Image'`. The plugin therefore cannot infer a safe crop size from the SDK. Even supplying dimensions from a local file probe would not resolve the confirmed Image-overlay rejection. The minimum host capability needed is an Image Resource overlay plus Image dimensions in the project inventory, with playback and native export of those overlays verified. Until then, the plugin intentionally stops without creating a misleading Draft or transcoding photos to MP4.
