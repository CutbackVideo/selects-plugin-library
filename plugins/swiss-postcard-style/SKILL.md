---
name: swiss-postcard-style
description: Build a reusable travel-postcard montage Draft with a draggable subject in-point selector, selectable landscape-panel count, selectable photo count, automatic AI cutout reuse/creation from the trimmed subject window, scramble-in title typography, a centered two-way photo reveal, and fast repeated photo cuts.
triggers: ["postcard style template", "travel postcard montage", "moving postcards from", "scramble title reveal template"]
---

# Postcard style template

Use this when the user wants this travel-postcard look recreated in a new project or wants to rebuild its editable Draft.

## Required inputs

- One main subject video, picked once from all project videos (no name-based hiding).
- A drag-selected in-point on that subject video. The panel shows a filmstrip sampled across the source's full duration with a fixed-length (~8.5s) highlighted window the user drags to reposition; the window length itself is not resizable because the renderer's whole transition timing is hard-coded to an 8.25s subject clip. Before any AI step runs, the panel trims the source locally with ffmpeg to exactly that window and imports the short clip as a new project resource — this keeps background removal fast and bounded even when the user's original footage is a minute-plus raw take.
- A transparent-background cutout of that trimmed window is required by the renderer, but the user does not pick it separately. The panel resolves it automatically per subject+in-point pair: reuse an existing cutout for the same in-point if one is found, otherwise generate one via AI background removal (on the already-trimmed clip, not the original) at build time. Do not surface a second "cutout video" picker or a separate "make cutout" button.
- One to six landscape videos. They are placed left to right in slot order.
- One to twelve still images. They repeat at the default fast cut tempo of approximately 0.2 seconds per image.
- An editable main title, subtitle, font family, title size, subtitle size, colors, and title/subtitle positions.

## Visual rules

1. Start on the subject footage. Reveal the selected landscape videos from left to right in equal-width panels while the cutout subject remains on top. The default is three panels, but the reusable panel supports 1–6.
2. After the subject turns into a white silhouette, hold approximately 0.8 seconds before the black transition.
3. Close to black with a quantized top/bottom "curtain": both bars grow from the vertical edges toward the center in many small, evenly-timed stair-steps (not 2-3 big jumps, and not a fully continuous wipe either) over the same ~0.6s window, so it reads as smoothly-stepped rather than jerky. The top box height and the bottom box's start row must be derived from the exact same computed value each frame (e.g. a single `st()`/`ld()` register in the ffmpeg expression) so the two halves always meet with no 1px gap at the very bottom row.
4. On black, show the subtitle above the title. The title letters scramble quickly at 60fps, lock into the final title, and both text layers remain through the photo ending.
5. Open the final black screen from the vertical center outward, symmetrically. The first visible photo must be a narrow horizontal band centered in the frame; the top and bottom black masks then recede away from the center at the same rate until the full photo is visible. Never reveal the photo from one edge alone.
6. While the centered photo band expands, switch the selected photos quickly and repeat them. Keep the cut tempo fixed while changing only the number of photo slots.
7. Use a tall condensed bold display face for the title (default Futura Condensed ExtraBold or the closest installed family) and a wide regular sans for the subtitle. Keep the title centered with the subtitle directly above it.

## Editable Draft contract

- Keep the footage base separate from the title Motion Graphic.
- The base owns the black/photo reveal. The title Motion Graphic must remain transparent except for the subtitle and title; never add a second full-frame or edge-anchored black reveal mask inside the title graphic.
- Author the title as an editable Motion Graphic with parameters for `title`, `subtitle`, `fontFamily`, `titleSize`, `subtitleSize`, `titleColor`, `subtitleColor`, `titleX`, `titleY`, `subtitleX`, and `subtitleY`.
- Do not bake the title into the base render when creating the reusable Draft.
- The panel can rebuild the base with a different division count, photo count, or subject in-point and create a new Draft.
- The current renderer stores the selected subject, landscapes, and photos inside one flattened base video. Directly swapping those source slots inside an existing Draft is not safely supported by the current Draft SDK; use the panel to create a new Draft when changing source media, division count, photo count, or the subject in-point. Existing Drafts must remain preserved.
- Cutout resolution runs inside the same build action as the base render (no separate button): the panel first trims the chosen subject window locally, then checks for a matching cutout for that exact subject+in-point and reuses it silently, and only calls AI background removal (on the trimmed clip) when none exists, importing the result before rendering.

### Cutout matching, pending-job tracking, and validity

- A generated cutout is matched to a subject+in-point purely by the decisecond-rounded start second embedded in its filename (`_ds<N>`, always ASCII, always present) — never by any human-readable "stem" derived from the subject's display name. A stem can legitimately fail to survive end-to-end (naming logic changes, Unicode normalization quirks, or a background-removal job choosing its own output name), so nothing should ever depend on it for matching.
- An in-flight background-removal job is tracked under a persisted pending-marker key built the same stable way: `` `${subjectResourceId}_ds${round(startSec*10)}` ``. Keep this key derived only from the resource id and rounded seconds — never from any display-name-derived value that a future naming-logic change could alter, or an already in-flight job's marker becomes invisible under a new key and gets silently duplicated.
- Snap the drag range slider's value to a fixed grid (e.g. 0.5s) before it ever reaches the cutout/pending-job matching logic. Two interactions the user considers "the same spot" must land on the exact same value; otherwise trivial pointer jitter computes a different decisecond target and looks like a brand-new selection with no memory of prior progress.
- A name-matched cutout is not necessarily a usable one. Always verify it actually has an ffmpeg-decodable alpha channel (ffprobe `pix_fmt` containing `yuva`/`rgba`/`argb`/`bgra`) before accepting it — a model or output format that *should* carry transparency by name or by its own schema is not proof it actually delivers a decodable one. Gate every acceptance path (an "already exists" fast check and any completion poll) through this same alpha check, and if several name-matched candidates exist, accept the first one that is actually alpha-valid.
- Because a host UI can remount a panel while a background job is still running server-side, do not rely on transient in-memory "is a build running" state alone to decide what to show or to guard against a duplicate launch. Recompute pending-job visibility from the persisted marker on every mount, keep it live (e.g. a 1s tick) without requiring user interaction, and lock every input that could change the subject+in-point (and ideally the whole form) whenever a job is found pending — including the primary action button itself, not just secondary controls. When adding a broader "lock everything" flag, make sure it actually reaches every control that previously checked only the narrower "is this specific action running" flag; a partially-applied lock looks trustworthy but leaves the one control users notice first (the main button) unguarded. Auto-resume the live progress view as soon as a pending job is detected on mount, rather than leaving the user to guess whether anything is happening.
- If a cutout job seems abandoned, verify directly rather than assuming: check whether a file matching the expected `_ds<N>` pattern already exists in the working directory before concluding the background job never finished.

### AI-driven background removal: model choice matters more than the request wording

- An instruction that lets an agent freely choose a background-removal model and output format is more reliable, but slower and less predictable, than a specific model+params pinned by hand — and a specific pin is only trustworthy after being independently verified end to end, not merely because the chosen model's own schema claims alpha/transparency support.
- Verify a candidate model+params combination with two checks on the actual downloaded output, not just its reported status or file extension: (1) any `warning` field the generation API returns — a non-null warning commonly signals a parameter was silently downgraded (e.g. transparent background falling back to opaque because the chosen codec cannot carry alpha); (2) a real alpha-channel histogram from a downloaded frame — genuine transparency shows a bimodal-plus-soft-edge distribution (fully transparent background pixels, fully opaque subject pixels, blended values at the matte edge), not a flat maximum value everywhere. A codec/container tag suggesting alpha support (e.g. a ProRes 4444 fourcc, or a WebM `alpha_mode` tag) is not sufficient evidence by itself — both have been observed producing a fully opaque result despite the tag.
- Prefer a lighter/faster intermediate format over a heavy one like ProRes 4444 when the cutout will be re-encoded downstream anyway (e.g. into H.264 for the final render) — nothing benefits from the heavier intermediate once it is recompressed.
- If reliability and speed cannot both be gotten from the same source, prefer reliability as the default and treat any specific speed-optimized model pin as something to re-verify (with the two checks above) before trusting it again, especially after any unrelated code change that could have affected which model/params get used.

### Persistence

- The title's default color, and every place it is set (the motion graphic's own fallback, the parameters passed at Draft-creation time, and the corresponding editable-parameter default), must be kept in sync if the default is ever changed.
- The panel auto-saves every tunable selection (subject + in-point, landscape/photo picks, division/photo counts, title/subtitle/font, and any pending-cutout markers) to a per-project JSON file keyed by project id, and restores it on reopen, so repeated testing does not require re-picking everything. Saved resource ids are re-validated against the current project's media on load; a deleted/renamed source is dropped rather than silently reused. Persistence only starts after the initial restore attempt has completed, so a first-time open never overwrites a real saved file with blanks.
- A panel cannot guarantee its in-flight async build (trimming, AI cutout, rendering, Draft creation) keeps running if the user navigates the host app away from the panel's own tab/view; tell the user to keep the panel open until it reports done.

## Review checks

- Confirm the selected number of panels is present and the subject remains visible during all reveals.
- Confirm all selected photo slots repeat at the same fast tempo.
- Confirm the subject window used for both the cutout and the render is the user's dragged in-point, trimmed locally before any AI call — never the full original recording.
- Confirm the cutout used for the build was either reused from an existing project resource (matching subject and in-point) or freshly generated from the trimmed window and imported before the base render ran, and that the user was never asked to separately pick or generate it.
- Confirm the three black steps are discrete and the final black frame has no remaining photo-only tail.
- Confirm the photo reveal starts as a centered horizontal band and expands upward and downward symmetrically.
- Confirm the title graphic adds no competing black mask, the title settles cleanly, and both text layers remain through the last frame.
- Confirm the saved Draft is 60fps and that the title is an editable overlay rather than only pixels in a flattened clip.
