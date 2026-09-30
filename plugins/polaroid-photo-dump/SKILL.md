---
name: polaroid-photo-dump
description: Build the "polaroid photo dump" format - seventeen photos switch inside an instant-film frame on satin, one every two beats of a bundled CC0 track, with a slow zoom-in, film grade and an editable caption - as editable original Image clips.
---

# Polaroid Photo Dump

Use this plugin when the user asks for the polaroid / instant-film photo dump format. The format is fixed; the photos and caption are the user's.

**Format (measured from the reference at 60 fps; 1080x1920, 13.9 s = 835 frames).** Frame numbers below are at 60 fps. New Drafts use the app's default frame rate (for example 23.976), and the plugin converts every time to that rate.

- A still instant-film frame lies on cream satin; only the photo inside its window changes. Hard cuts at frames 21, 71, 122, 174, 224, 274, 326, 376, 428, 479, 530, 581, 633, 683, 736, 786 (every 0.85 s, on every second beat of the music); the first photo shows for 0.35 s.
- The whole scene (satin, frame and photo) zooms in linearly about (543, 951): 1.27 % per second, 1.18x at the end. The caption does not zoom.
- Photos are cropped to the frame window around an editable focus and given a light warm film grade (editable, 0-2, default 1).
- Caption: white medium sans-serif centred at the top (default `"photos hold memories"` in curly quotes), editable text, font, size, position and colour.
- Music: bundled CC0 "Lofi again" by omfgdude, a 13.9 s section time-stretched to 141.2 BPM so that every cut lands on a beat.

**Inputs:** exactly seventeen registered Project Image resources (JPG/PNG/HEIC), in order, plus an optional caption. Do not duplicate or drop photos to reach seventeen on your own; if the Project has fewer, ask the user which photos to use or reuse. Do not convert photos to video.

Open the installed **Polaroid Photo Dump** panel in the user's Project, load the Project photos, check the order of photos 1-17, set the caption and film grade, and create the Draft. The panel imports the bundled frame image and music into the Project once (from `~/.selects/plugin-data/polaroid-photo-dump`), creates a new Draft, places seventeen independent photo clips and then the frame image on the track above them through the editor's existing Image placement path (the public SDK's `overlayResource` rejects Images; no client code is changed), adds the zoom, crop and grade effects, a caption graphic and the music.

After creation, read back: seventeen Image clips at the cut frames above, the frame Image clip for the whole Draft on a higher track, eighteen effects, one caption graphic and one music clip. If the user asks for the video, export it, wait for completion, and check the MP4 through its final frame. A saved Draft alone is not export verification. If the panel reports a partial Draft or unknown save, inspect that Draft before retrying; never create duplicate Drafts blindly.

Each photo's visible area and film grade can be changed later in its clip effect; the caption in its graphic. To use a different photo in a slot, keep the other choices and create a revised Draft: the crop is computed from the original photo's size. The previous Draft stays available.
