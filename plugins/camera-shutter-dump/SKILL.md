---
name: camera-shutter-dump
description: Build the "camera shutter dump" format - twelve photos stack into a collage on black, one per camera shutter sound - as editable original Image clips with bundled shutter sound effects.
---

# Camera Shutter Dump

Use this plugin when the user asks for the camera shutter dump / shutter photo dump format. The format is fixed; the photos are the user's.

**Format (Semin's reference Draft at 25 fps; 720x1280, 10 s).** Frame numbers below are at 25 fps. New Drafts use the app's default frame rate (for example 23.976), and the plugin converts every time to that rate.

- Black for the first 3 frames, then one photo appears on each shutter: frames 3, 22, 39, 58, 74, 91, 111, 130, 150, 165, 184, 201.
- Every photo stays until the end and sits above the earlier ones, so the frame fills into a collage. No motion, borders, rotation, or transitions: hard cuts only.
- Slots 1-10 are portrait 3:4 tiles cropped around an editable focus point, sized and placed as in the reference; slots 11-12 show the whole photo (no crop) at a 4:3 slot's size.
- From frame 216 to the end: the app's Burst (confetti, scale 150%) and, above it, a Text title showing the Project name (editable in the Inspector; Chauncy Pro 120, #F5988A, white stroke, pop in). Both are ordinary editable graphic clips.
- Audio is only the shutter sound: autofocus beeps, mirror clack and shutter click, 11 frames, starting 3 frames before each photo appears. There is no music.

**Inputs:** exactly twelve registered Project Image resources (JPG/PNG/HEIC), in order. Do not duplicate or drop photos to reach twelve on your own; if the Project has fewer, ask the user which photos to use or reuse. Do not convert photos to video.

Before importing shutter sounds or creating a Draft, the panel verifies the selected Image Resource identities, original paths and dimensions, and confirms every original is a nonempty readable file. A missing file and a failed read are distinct errors naming the photo. The same source check runs again before placement.

Open the installed **Camera Shutter Dump** panel in the user's Project, load the Project photos, check the order of photos 1-12, optionally adjust framing, and create the Draft. The panel imports the six bundled shutter sounds into the Project once (from `~/.selects/plugin-data/camera-shutter-dump/sfx`), creates a new Draft, places twelve independent Image clips through the public Draft SDK's `overlayResource` method (no client code is changed), crops photos 1-10 with a clip effect, adds the closing Burst and Text graphics, and adds twelve shutter sound clips.

The panel waits for its local SDK connection before starting. If initialization fails or cannot be confirmed within 30 seconds, a hidden app template run reports a safe error and stops without mounting its authoring code. A late connection cannot restart a timed-out or replaced run. A visible standalone panel shows an alert instead.

The automatic closing title comes from the selected Project's public SDK metadata, not a display field in the app context. Its ID and string title are confirmed before sound import; an unreadable or unconfirmed title stops authoring rather than guessing. A genuinely blank title uses Memories. A completed app run retains its saved title if the Project is renamed; start a new run to use the new name.

The create path now prepares Images, effects, graphics and audio in one unsaved working copy, then saves the complete Draft once. It checks its Burst/Text graphic identities, intervals and explicit parameters before commit and independently reads those back with the saved Images. It also verifies every Image and graphic intrinsic transform (position, per-axis scale, rotation, anchor, enablement, flips and motion keys) before commit and independently after saving. A reopened app run reuses the same transform evidence; manual changes or missing older evidence require inspection without rewriting the Draft. A pre-commit failure leaves no new Draft; an uncertain commit response still requires inspection before retrying. App template runs now claim a durable run record before preparation and record the final result inside the same authoring SDK request. Reopening the same run reads back its existing Draft; changed inputs or an active/unknown result require inspection instead of another save. Start a new app run for an explicit revision or retry. Standalone panel actions remain explicit new operations.

After creation, read back (converted to the Draft's frame rate): twelve Image clips with the start frames above, all ending at the Draft end (250 at 25 fps), each on its own track with later photos above earlier ones; ten crop effects (photos 1-10); the Burst and Text graphics at 216-250; twelve Audio clips starting at frames 0, 19, 36, 55, 71, 88, 108, 127, 147, 162, 181, 198. If the user asks for the video, export it, wait for completion, and check the MP4 through its final frame. A saved Draft alone is not export verification. If the panel reports a partial Draft or unknown save, inspect that Draft before retrying; never create duplicate Drafts blindly.

The visible area of photos 1-10 can be moved later with the Horizontal/Vertical focus of their clip effect (photos 11-12 have no crop). To use a different photo in a slot, keep the other slot choices and create a revised Draft: the slot's scale and crop are computed from the original photo's size, so swapping media inside the clip is not supported. The previous Draft stays available.
