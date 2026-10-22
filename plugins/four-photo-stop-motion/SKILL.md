---
name: four-photo-stop-motion
description: Build the beat-synced "stop motion" photo format - four photos cycle with a blurred intro, a black pause, one photo per beat with a blur hit, and a dark fade - as editable original Image clips with bundled music.
---

# Four Photo Stop Motion

The bundled MP3 uses the generalized bundled-asset implementation through its
existing Audio compatibility entry. MP3 paths, Resource-ID results, SDK summaries
and Audio error codes remain compatible; Draft and timing rules are unchanged.

Use this plugin when the user asks for this stop-motion photo format. The format is fixed; the four photos are the user's.

**Format (measured from the reference at 30 fps; 3:4, 1080x1440, 11.57 s).** Frame numbers below are at 30 fps. New Drafts use the app's default frame rate (for example 23.976), and the plugin converts every time to that rate.

- Intro, frames 0-48: two fast rounds of A, B, C, D (hold 5, 7, 5, 7, 4, 8, 4, 8 frames), each with a light blur.
- Black, frames 48-80.
- Beats, frames 80-325: one photo per beat (every 18-19 frames, about 0.631 s or 95 BPM) in the order A, B, C, D, repeating 13 times. The first three frames of each beat are heavily blurred and shake up and down; the photo then holds sharp. There are no transitions.
- Outro, frames 325-347: a dark grey radial gradient fades to black.
- Music: a bundled original instrumental laid under the whole Draft. The black pause sits on the track's break.

**Inputs:** exactly four registered Project Image resources (JPG/PNG/HEIC) in order A-D. Each fills the 3:4 frame, cover-cropped around an editable focus. Do not duplicate or drop photos on your own. Do not convert photos to video.

Open the installed **Four Photo Stop Motion** panel in the user's Project, load the Project photos, check A-D, optionally adjust framing, and create the Draft. The panel imports the bundled music once, creates a new 1080x1440 Draft, places 21 independent Image clips through the public SDK's original Image overlay path, adds a crop and blur effect to each clip, adds the outro motion graphic and lays the music.

Before preparing music or creating a Draft, the shared original-Image input feature checks the four selections against their current Project Resource IDs, working paths and native dimensions. It observes each distinct local file with stat, a one-byte read and stat again; missing, unreadable, unknown or changing files stop the run with a photo-specific message. Repeated choices keep their slot order. The same check runs again before Image placement. These observations establish availability at those points, not full decoding or a file lock. An ended run cannot start input checking or proceed from input checking to music preparation.

The canonical local SDK wrapper reports a safe initialization failure or a 30-second read-only connection timeout for a hidden template run, and shows a safe error for a standalone panel. A replaced run or Project cannot receive an earlier connection's late result.

The normal create path now builds all 21 Images, effects, outro and music in one unsaved working copy, checks their intended properties, then commits the complete result once. A pre-commit effect failure leaves no saved Draft; prepared Project music may remain reusable. The acknowledged complete save is verified in a separate read-only SDK invocation. Both working-copy and saved-state checks cover Image identities, intervals, graphic parameters, visual transforms, effect/graphic source and controls, and Audio identity, interval, routing, level/fades, source window, rate and pitch. Music preparation uses the realized rounded Draft duration. Source intent, rate and pitch are checked before saving; actual saved source windows are checked afterward through existing Panel reads. No SDK change is required. Unknown saved evidence retains the Draft ID without replay.

App-supplied template run IDs use the existing durable run module and atomic local file client. Reopening the same run, concurrent panels or a lost script reply do not re-author a saved result. Recovery verifies the saved receipt; changed inputs, manual edits, unreadable/corrupt records and uncertain commits require inspection. Explicit new run IDs or standalone revised creates are separate operations. Legacy empty seeds can finish in one commit only after ownership/grid/content checks; no existing manual content is overwritten. Closing a panel cannot undo an already dispatched commit. Rendering, Inspector behavior, full decoding, installed-app/Windows, playback/export and complete intrinsic state remain separate pending validation.

The bundled music is now prepared through the shared bundled-Audio feature. It verifies source bytes and keeps an atomic content-addressed copy in plugin-data before importing, so new Drafts reference that data copy rather than the installation. Identical bytes reuse the same Project Audio; an update gets a new data path and retains the old file. Music imports are confirmed through a bounded Project read, including after a lost reply or a concurrent writer; no import is blindly resubmitted. A genuine skip or unknown result asks for inspection rather than claiming it is still preparing. Previously saved installation-path references are not migrated or rewritten. File publication uses the existing canonical client, with no shell or Node requirement. Actual installed-app/Windows playback and export remain pending.

After creation, read back 21 Image clips at the frames above, 21 clip effects, the outro graphic from frame 325 and one music clip from frame 0. If the user asks for the video, export it, wait for completion, and check the MP4 through its final frame. A saved Draft alone is not export verification. If the panel reports a partial Draft or unknown save, inspect that Draft before retrying; never create duplicate Drafts blindly.

Each photo's visible area can be moved later with the Horizontal/Vertical focus of its clip effects. To use a different photo, keep the other choices and create a revised Draft: the crop is computed from the original photo's size.

## Runtime support checkpoint

The shared durable-run feature checks hashing/text codecs before recording and callable UUID/SDK writes before a new claim. Saved recovery does not require a new UUID or SDK file writes. See `docs/template-repair/polaroid-run.md` in the source repository; design, request identity and record schema are unchanged.
