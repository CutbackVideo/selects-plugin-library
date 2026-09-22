---
name: vlog-edit
description: Assemble a vlog or personal-archive edit from a large mixed pile of video plus many photos that cannot be analyzed. Covers coverage survey, finding the story shape, photo B-roll blocks with generated voiceover and music, dead-air trimming, cross-dissolves and editable title graphics.
---

# Vlog edit

For edits assembled from a real archive rather than a planned shoot: many short
clips, many photos, no script, and no shot list. Trips, events, projects, and
any stretch of life someone filmed as it happened.

## Survey before proposing anything

Never plan from clip count alone. Build a per-session table of: video seconds,
speech seconds, photo count. Group by filename timestamp, which is the reliable
key for both photos and video.

The decisive question is whether **coverage is inverted** — the least
interesting stretches over-filmed and talky, while the strongest material
exists only as stills or a handful of silent clips. Archives are inverted far
more often than not, because people film when they are bored and photograph
when they are impressed.

When inverted, say so plainly and let it drive the edit: photos carry the
places and the scale, video carries the people. Budget photos as a co-equal
layer, roughly a third of screen time, not as filler between clips.

Also measure speech seconds per clip. A long clip that is mostly silence is a
trim candidate, not a keeper.

### Photos cannot be analyzed

Image Resources report `analysisNotApplicable`, `hasAnalysis: false`, and
`estimateAnalysis` skips them as `unsupported_resource_type`. There is no
transcript, scene search, or `resource()` handle for them. Do not offer or
promise photo analysis, and do not quietly drop photos from planning because
they carry no metadata.

Inspect them directly instead — build contact sheets and look at them:

1. Sample every Nth photo per group (~24-30 per sheet), scale and label each
   with its filename, then tile into one sheet per group.
2. The browser cannot open `file://`. Serve the sheet directory over local
   HTTP. A plain background launch dies with the shell call that started it —
   detach it so it survives.
3. Wrap each sheet in a minimal HTML page with the image at a fixed large
   width, then screenshot the image element. Screenshotting a raw PNG makes the
   browser fit it to the window and renders it unreadably small.
4. Close tabs and stop the server when the survey is done.

## Find the shape

Prefer a small number of acts on a chronological spine over a flat
chapter-per-day log. A reliable default: setup, the good stretch, the
complication, resolution.

The complication is what makes the piece more than a montage — the weather
turning, the plan failing, the thing going wrong. **Find it in the footage
rather than assuming one exists.** It is usually the stretch with the most
talking and the worst-looking images, which is why a survey that ranks material
by visual quality alone will miss it.

Compress the opening stretch hard. Beginnings are almost always over-filmed.
Alternate deliberately between wide, quiet material and close, hand-held faces;
each makes the other land.

Photo blocks: about 3s holds for ordinary frames, 4-5s for hero frames. Group
by subject or place, not strictly by timestamp. Where a photo-only stretch is
strong enough to stand alone, keep it and write voiceover for it.

## Voiceover

Prefer the cast's own on-camera narration when they already speak to the
camera. Reserve written voiceover for photo-only stretches and act transitions.

Write voiceover only from what is visible in the footage and photos. Do not
invent quotes, times, counts, or events that no source shows. Authorial closing
lines are fine; fabricated recollection is not. Present the text to the user as
a draft to approve, in the language spoken in the footage.

## Build order

Removing or retiming picture **ripples** the timeline, while overlay audio sits
at absolute frames and will desync. Therefore:

1. **Assemble picture first**, driven by an explicit edit list of resource plus
   source range per beat, held in the script. When applying review notes or any
   change that alters durations, **rebuild from that edit list into a new
   Draft** rather than patching the existing one. Patching and then re-syncing
   is slower and more error-prone than rebuilding.
2. Read the committed Draft back and derive real block boundaries from actual
   clip frames. Do not reuse planned seconds.
3. Place voiceover and music against those measured boundaries.
4. Add transitions.
5. Add title graphics.

Steps 4 and 5 do not change Draft duration, so they are safe after audio.
Confirm that from the returned diff rather than assuming it.

Two placement traps:

- The Draft's frame size follows its **first clip**. Start with a landscape
  video clip, or a portrait photo will set the whole sequence's resolution.
- Inserting an image without an explicit source range gives it a default hold.
  Always pass a range to control photo duration.

Keep the previous Draft intact when rebuilding, and name versions so the user
can compare.

## Dead-air trimming

Blunt pause removal destroys scenes. Use these limits, then re-audit before
committing:

- Only trim pauses at or above about 1.8s; leave about 0.5s of breath where you
  cut.
- Never create a surviving segment shorter than about 1.5s.
- Cap removal at roughly 25-30% of any single clip.
- **Exclude visual and ambient scenes** — play, landscape, wordless
  interaction. There the pauses are the content, not dead air.

After computing, print per-clip original vs kept vs removed plus the shortest
surviving segment. If a clip loses most of its length or fragments into many
short pieces, the settings are wrong — retune instead of committing.

Read pauses from an analyzed Resource. If the Draft uses a derived copy of a
source, compute ranges on the analyzed original and apply them to the copy;
copies of identical duration share a timebase.

## Generated voiceover and music

- Generate voiceover first, read each result's real duration, then confirm it
  fits its block with margin. Size blocks to the audio, not the reverse.
- Generate each music cue at its act's measured length **plus margin**, then
  clamp the placement span to the act so the cue covers it edge to edge with no
  gap at act changes.
- To drop music under a dialogue stretch, place the cue as two spans around the
  gap rather than expecting a gain control. Resume from a different offset in
  the track so the return does not sound like a restart.
- A generation job can report success while importing nothing, because the
  returned container is not auto-imported. Collect it with the queue result
  call on the **same** request id, convert if needed, and import the file.
  Never resubmit a paid job to fix a delivery problem.

## Transitions and titles

Cross-dissolves between photos are what make photo blocks read as intentional
rather than as a slideshow. Use about 0.25-0.3s overlap each side, less for
short holds.

Adding a transition invalidates the clip list: re-read clips before **each**
call, or every call after the first fails as a stale target. The re-read is
cheap inside the working copy.

Author titles as motion graphics with **editable parameters** — text, font,
size, colour, timing — so the user can adjust them without another agent
round-trip. Keep a sensible font fallback chain.

## Verify and report

Read the saved Draft back in a separate call and confirm duration and clip
count, that every intended removal is absent and every replacement present,
that all voiceover and music clips exist, and that music gaps fall exactly
where intended.

Frame capture can time out on large Drafts, including on ordinary frames, so a
timeout is not evidence that a graphic is broken. When you cannot see pixels,
say so and ask the user to check the specific timecodes rather than claiming
visual verification.

Report mix balancing and anything needing per-clip gain as manual work
remaining; placing audio is not mixing. Flag portrait clips in a landscape
sequence, and flag any recognisable copyrighted music audible in source audio
before it reaches a published cut.
