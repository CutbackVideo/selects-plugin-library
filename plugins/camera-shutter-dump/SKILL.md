---
name: camera-shutter-dump
description: Build the "camera shutter dump" format - twelve photos stack into a collage on black, one per camera shutter sound - as editable original Image clips with bundled shutter sound effects.
---

# Camera Shutter Dump

Use this plugin when the user asks for the camera shutter dump / shutter photo dump format. The format is fixed; the photos are the user's.

**Format (measured from the reference at 30 fps; 720x1280, 9.3 s).** Frame numbers below are at 30 fps. New Drafts use the app's default frame rate (for example 23.976), and the plugin converts every time to that rate.

- Black for the first 17 frames, then one photo appears on each shutter: frames 17, 41, 61, 83, 103, 124, 148, 170, 193, 213, 234, 255.
- Every photo stays until the end and sits above the earlier ones, so the frame fills into a collage. No motion, borders, rotation, or transitions: hard cuts only.
- Slots 1-10 are portrait 3:4 tiles about 56% of the canvas width, some bleeding off the edge; slots 11-12 are landscape 4:3 tiles. Each photo is cropped to its slot around an editable focus point.
- Audio is only the shutter sound: autofocus beeps, mirror clack and shutter click, 0.47 s, starting about 0.35 s before each photo appears. There is no music.

**Inputs:** exactly twelve registered Project Image resources (JPG/PNG/HEIC), in order. Do not duplicate or drop photos to reach twelve on your own; if the Project has fewer, ask the user which photos to use or reuse. Do not convert photos to video.

Open the installed **Camera Shutter Dump** panel in the user's Project, load the Project photos, check the order of photos 1-12, optionally adjust framing, and create the Draft. The panel imports the six bundled shutter sounds into the Project once (from `~/.selects/plugin-data/camera-shutter-dump/sfx`), creates a new Draft, places twelve independent Image clips through the editor's existing Image placement path (the public SDK's `overlayResource` rejects Images; no client code is changed), crops each clip with a clip effect, and adds twelve shutter sound clips.

After creation, read back (converted to the Draft's frame rate): twelve Image clips with the start frames above, all ending at the Draft end (279 at 30 fps), each on its own track with later photos above earlier ones; twelve crop effects; twelve Audio clips starting at frames 7, 30, 50, 73, 92, 113, 137, 159, 183, 202, 224, 245. If the user asks for the video, export it, wait for completion, and check the MP4 through its final frame. A saved Draft alone is not export verification. If the panel reports a partial Draft or unknown save, inspect that Draft before retrying; never create duplicate Drafts blindly.

Each photo's visible area can be moved later with the Horizontal/Vertical focus of its clip effect. To use a different photo in a slot, keep the other slot choices and create a revised Draft: the slot's scale and crop are computed from the original photo's size, so swapping media inside the clip is not supported. The previous Draft stays available.
