---
name: postcard-cutout-studio
description: Build an editable travel-postcard Draft with a selected subject range, generated or local alpha cutout, independent background panels and photos, and editable title graphics.
triggers: ["postcard cutout studio", "layered postcard cutout", "editable travel postcard"]
---

# Postcard Cutout Studio

Use the installed Panel for a reusable layered postcard assembly. This plugin is separate from `swiss-postcard-style` and must not replace it.

## Inputs

- One source video and a selected 8.5-second window. The Main timeline uses the first 8.25 seconds.
- One to six background videos, ordered left to right.
- One to twelve photos, repeated as 27 independent 0.2-second Image clips.
- A new or existing cutout. The cloud route uses Selects generated-media background removal. The optional local route uses RVM after explicit setup.
- Canvas ratio, contain/cover fitting, title, subtitle, font, and colors.

## Editable Draft contract

- Keep the source Main clip, every background panel, every photo occurrence, cutout foreground, curtain, and title as separate timeline items.
- Keep the original source range and source audio in Main.
- Use one foreground effect and one initial `commitAll` for assembly.
- Create a new Draft for each build and preserve existing Drafts.
- Final video output uses the Selects Export workflow; the plugin does not flatten the postcard into an assembly input.

## Safety and persistence

- A generation request is submitted once per run. An uncertain status is resumed by job ID and never replaced by another paid request.
- Each run owns immutable mask assets and a distinct foreground Resource. Keep run media while any Draft references it.
- Saved source bindings use full source paths and are revalidated against the current Project.
- Existing runs are resumed rather than silently duplicated.

## Review

After a build, re-read the saved Draft and confirm its canvas, source window, six or fewer background clips, 27 photo clips, one distinct foreground Resource, and two graphics. Inspect representative frames for foreground edges, panel coverage, white-flash timing, title spacing, and photo reveal. Verify the final exported file can be fully decoded.

## Known limitations

- Experimental macOS arm64 implementation. Native Panel-click E2E, app/OS restart, Intel Mac, Windows, and Linux are unverified.
- The read-only loopback mask service must be restored by opening the Panel after a restart before preview or Export.
- Cover fitting can crop a moving subject; use source ratio or contain when continuous subject visibility matters.
- In the tested 29.97 fps project, a 472-frame Draft exported a 471-frame video stream while retaining 15.749 seconds of container duration.
- The optional local RVM route has different edge quality from the cloud route and requires separate GPL-3.0 model/runtime review.
