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

The public `ProjectSourceFileNode` declaration permits `video | audio | sequence`, and `sourceFiles()` returned each imported JPG as `type: 'video'` without `frameSize`, while `project.resources()` correctly returned `type: 'Image'`. The plugin therefore cannot infer a safe crop size from that inventory. Supplying dimensions from a local file probe would not resolve the independent `overlayResource(Image)` rejection. The plugin intentionally stops without creating a misleading Draft or transcoding photos to MP4.

## Real-photo export attempt — 2026-09-30

Twenty-one distinct generated real-photo PNGs (1122×1402 each) were imported into a separate Staging Project, `5b910ea1-20dc-4548-8710-b576030707d9`, as Image Resources `r0`–`r20` in slot order. The shared create operation received all 21 slots, explicit dimensions, manual BPM 113, and 853 output frames. It returned `notSaved: Slot 1 photo dimensions are unavailable; update Selects for native Image clips`; readback showed `draftIds: []`. The supplied local dimensions cannot substitute for the Project inventory's missing dimensions, because a different image could be selected between input and save.

An independent simulation in that same Project confirmed the deeper host limitation: `overlayResource` rejected the real `tile-01.png` Image Resource with `Resource ... is not a Video/Audio asset`. The probe did not commit. A second simulation in the already-running isolated Selects Dev 2.0.504 app rejected its own JPG Image Resource with the same error. The new Staging Project also initializes empty Drafts at 23.976 fps; the plugin's 60 fps preflight would require an explicitly 60 fps Project after the image-overlay capability is available.

**The current plugin SDK path cannot create the native Image gallery, so its playback and native export remain untested.** No substitute MP4 tiles or flattened gallery were exported and no client code was changed. The generated media and manifest remain in the local test workspace, outside the plugin package.

## Correction after editor evidence

The editor **can** place an original Image Resource on a separate Video track. In another existing Staging Draft, SDK readback showed `B.png` as `type: Image`, `trackKind: video`, frames 161–311. This was read-only inspection; the Draft belongs to the separate No.14 task. A simulation-only `overlayResource` call against that exact `B.png` in the same Project still returned `not a Video/Audio asset`. Thus the demonstrated limitation is specifically the plugin's public `overlayResource` API, **not** Selects' underlying editor or renderer. We are investigating a supported plugin route to the editor's placement operation. Export of this No.2 plugin is not yet established by the screenshot or the readback.
