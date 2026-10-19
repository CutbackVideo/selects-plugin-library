---
name: 20vc-style
description: Edit conversation, interview or podcast footage into a separate editable portrait short in the 20VC style, with reaction-led camera choices, real editable split tracks, meaning-linked B-roll, readable outlined captions and restrained transitions and sound effects. Match 20VC style, shortform, Shorts, Reels, TikTok, vertical video, punchy clips and equivalent editing intent in any language rather than an exact phrase.
---

# 20VC Style

Experimental. Create one new editable Selects draft from the selected timeline. Optimize observable editing quality, first-pass correctness and total completion time. Return the finished draft after supported in-app checks; preview-runtime failures may skip live playback as described below.

## Recognize intent and choose defaults

Match paraphrases, mixed Korean/English, spacing, hyphens, minor typos and contextual follow-ups. Examples include 20VC style, engaging shortform, engaging short form, shortform, Shorts, Reels, TikTok, vertical video, podcast clips, punchy clips and keep-the-reactions requests, in any language. These are examples of editing intent, not an exact keyword gate. A factual question mentioning TikTok does not request an edit. A skill-update request updates the procedure, without editing a project.

For an otherwise unspecified conversation short, use a 1080×1920 canvas, original dialogue, a complete question/claim-to-payoff passage, reaction-led real-camera cuts, occasional simultaneous half/half views, readable phrase captions, a brief factual hook and sparse meaningful sound accents. Honor explicit user preferences. Select sensible recommended defaults when the footage provides enough information; ask only about an actual blocking ambiguity. Preserve the original and name the new draft clearly, with a unique timestamp postfix such as [20VC-YYYYMMDD-HHMM].

Target grammar, modeled on interview-podcast shorts such as 20VC clips: intelligible conversation, close faces, occasional horizontal split views, compact captions and restrained emphasis. Mostly hard cuts; use added sound sparingly. Do not download or analyze reference videos during an edit.

## Chat presentation

Keep visible chat focused on the editing intent, user choices and delivered result. Do not narrate recoverable tool failures, stack traces, retries or preview-runtime failures. Put diagnostic details in internal logs or a local task log when supported; do not paste them into chat. Skip unavailable preview tests under the verification policy below. Do not claim a skipped test passed. If an actual unresolved editing/source issue requires user action, ask only for the necessary decision in plain language and accurately describe the deliverable. Do not alter or suppress app-owned tool telemetry or error indicators; this instruction governs assistant-authored messages.

## Fast source inspection

Read the running app's relevant SDK declarations and built-in visual-editing/multicam instructions. Resolve the current project and selected source; never reuse test IDs or timestamps.

Read existing timed words, camera inventory, source mappings, selected Main cuts, fps, duration and media readiness together. Initialize project resource IDs with the current resources inventory before referring to r0/r1 aliases; aliases from an earlier runtime are not a source map. Reuse existing transcript, speaker/camera facts and synchronization. Do not run speech recognition when timed dialogue exists. An unanalyzed raw camera member does not invalidate its synchronized timeline's existing analysis. Avoid scanning the whole project or starting analysis for every asset.

Inspect a bounded set of actual frames across the selected passage and relevant cameras. Establish who is visible, reaction onset/payoff, gesture extremes and source-camera cuts. Speaker labels and audio alone do not establish these facts. Cache the resulting source map and reuse it through edits and QA.

For already-edited source files, inspect existing cut metadata first. If picture boundaries are missing, run CPU scene-change detection (for example the bundled ffmpeg scene filter) only on the selected source windows, then verify candidate boundaries with adjacent frames. Treat flashes and motion as candidates, not cuts. Keep integer half-open intervals [start,end). Never leave a one-frame remnant of an adjacent shot. Raw continuous camera coverage with verified existing boundaries does not require re-scanning an entire recording.

## Plan a complete thought

Build a compact frame-based plan: source/time mapping, kept speech, camera/person, full/split treatment, reason for reaction cut, gesture-safe crop, caption position, B-roll opportunities and sourcing decisions, and sound cue.

Open with a concrete question, surprise or tension. Remove irrelevant greetings and trailing incomplete clauses. Preserve attribution, negations, uncertainty and source meaning. End after the payoff with a natural consonant/reaction tail. Approximately 25–45 seconds is a starting range, not a quota.

Select faces by visible information: a smile developing, disbelief, laugh, hesitation, demonstrated hand movement or an imitation. Hold onset through payoff. A neutral listener is not automatically useful. During a gesture, show the person doing it and the complete hand arc; retain a simultaneous reaction only when both add meaning. Never borrow a laugh from a different source time. Keep spatial continuity where it helps comprehension, while retaining information-bearing reaction cuts and visible action. A speaker change alone does not justify swapping both panels. Merge adjacent identical native treatments; reducing operation count alone must not flatten the conversational rhythm.

## Native timeline construction: mandatory

Duplicate the source timeline. Keep Main's original speech routing. Use native trims, splits and camera assignments for the storyline. Use native fixed clip transforms for framing whenever they express the intended result.

A half/half layout MUST contain two independently selectable resource-backed video clips on distinct video tracks. Duplicate/place the synchronized source coverage onto those tracks, preserving source time. Each clip owns one panel's crop, scale and position. Two `<Source/>` elements inside a single Remotion clip do not satisfy this requirement. Do not flatten video, split layouts, camera edits or audio into a generated intermediate file.

Build each visual lane chronologically before the next lane to reuse existing nonoverlapping lanes. Verify the saved track IDs and clip intervals; do not infer structure from how the preview looks. Mute duplicate picture lanes while keeping them visible, so only the existing Main dialogue plays. Put each sound effect on a real Audio track with a native clip gain.

Read source and timeline fps separately. Convert source offsets on the correct grid, then read actual placement bounds. For raw cameras with a different fps, use a verified shared frame grid for adjustable editorial boundaries, without moving a verified source picture cut or clipping speech. Otherwise use the owning native trim/placement service for exact boundaries. Never hide an overrun with an unchecked overlap or export truncation.

Clamp horizontal crop offsets to source coverage to prevent black gutters. Use the actual media aspect ratio and native conform behavior; do not copy a transform constant from another project. Preserve faces, chin, shoulders and relevant hands. For movement, smooth tracking within a shot and reset at picture cuts. Avoid decorative push-ins that cut off a gesture.

Use current SDK clip identities after mutations. Simulate and inspect a representative full/split/caption frame before committing. Batch verified edits; do not repeatedly compile an unchanged composition per tiny edit. Read back persisted draft ID, duration, canvas, tracks, clips, camera assignments, transitions, audio routing and caption metadata.

Remotion is appropriate for caption-only/title-only graphics and a native Transition's presentation when the app uses that provider. It is reserved for a genuinely unsupported visual effect beyond native clip transforms. Any exception must be narrow and retain the footage's individual timeline clips. No full-video Remotion composition, external composite, speech extraction, video/audio proxy or QA movie export.

## Captions and hook

Prefer the app's existing transcript-linked caption preset: editable font, outline, backing and placement, reading the timeline's word groups. Preserve word timing through cuts. Avoid a hardcoded full-transcript array when the built-in linked caption can express the treatment.

Start around 66–70 px at 1080×1920, bold sans-serif, usually 1–4 words per phrase, 3–5 px dark outline and a restrained dark backing when needed. Scale to the actual canvas and phone preview. Never shrink a long sentence into tiny white text. Break by meaning and timing.

Use a restrained accent on meaningful contrast/object/payoff words. Do not color every word or continuously bounce captions. Place near a split seam when clear; move below the mouth and away from hands in full portraits. Inspect the whole gesture interval, not one still. Do not place captions across a face simply because the canvas center is convenient.

Use a concise factual hook for about 2.5 seconds in a separate editable title clip. Position it in observed free space, separate from captions and important action, then remove it. Proofread actual speech, especially homophones, names, numbers and negations. Do not mutate shared source transcription to solve a draft-local caption correction. Use the owning draft caption correction surface, or a narrow time-bound display override in the linked caption component when necessary. Keep unaffected groups transcript-linked; never transcribe the source again to fix one homophone.

## Supporting visuals, transitions and SFX

Actively look for opportunities to use meaning-linked B-roll and prefer including it when it improves the short. Identify concrete objects, actions or comparisons in the kept dialogue that benefit from a visual explanation. Do not silently omit B-roll just because the current project lacks a suitable asset. Preserve important facial reactions and the complete gesture payoff; use a brief cutaway or a separate native overlay track where it adds information without obscuring those moments.

Use the browser available inside Selects to search free-to-use stock sites first, such as Pexels and Unsplash. Read the available browser instructions and inspect the actual asset pages. Search for the exact spoken concept and its modifiers, then try a small number of targeted query refinements or another suitable stock site if needed. Prefer video for demonstrated motion; a relevant still can explain an object. Check the asset's applicable usage terms and attribution requirements before downloading; a search result or a site's reputation alone does not establish permission. Retain the source page and license reference with the sourcing notes. Download suitable assets, import them into Selects and place them as independently editable native timeline clips. These stock source downloads are allowed; flattened edited intermediates and QA exports remain prohibited.

Match the asset to the exact concept and speech interval: a specific product needs a plausible image of that product, not a reused generic object. Inspect the image or clip before insertion, including the intended crop. Remove or replace it when the concept changes. Labels cannot repair a wrong image. Existing source demonstrations can complement sourced B-roll, but switching to another talking head does not count as B-roll.

If a focused stock search finds no suitable usable asset, ask the user whether to use generative AI before calling a generation model. Briefly state the missing visual, intended timing and proposed generated treatment. Wait for the answer; continue independent timeline work while waiting. Do not infer generation approval from a general request for an engaging short. If the user declines, retain a meaningful source shot/reaction and disclose the omitted B-roll. If approved, generate and inspect the asset for semantic accuracy and visual artifacts, then place it on its own native track with clear illustrative intent. If no useful B-roll opportunity exists, explain that editorial decision rather than forcing an unrelated asset.

Keep ordinary speaker changes as hard cuts. At an actual idea/layout/payoff beat, consider one or two restrained native transitions, roughly 4–8 frames at 30 fps. Use valid source handles and inspect neighboring frames and motion. A short dissolve or subtle motion is enough; avoid strobe, repeated zoom, whip or glitch effects. Added effects should earn their place.

Consider one or two brief native sound effects at a relevant object/action/emphasis beat. Use the app's built-in sound import/placement workflow and cache the asset once. A subtle click may reinforce a device or button reference; an isolated soft whoosh may support an intentional graphic entrance. Do not attach SFX to every cut, laugh or word. Keep them clearly below dialogue, start around -22 dB clip gain and adjust by listening. Preserve original reaction audio. Music is optional, not required.

## Verify entirely in Selects

Inspect saved timeline structure and available in-app composition captures. When live preview works, play the complete saved draft with audio. Check full/split changes, first and last frames, reaction onset/payoff, hand extremes, caption changes and transition joins. Inspect adjacent frames at suspect picture joins. Use the supported compositing preview when the legacy preview does not apply native transforms.

If a preview-runtime issue prevents reliable playback (for example intermittent freezing, blank panels or media-readiness errors), skip the live-playback test and continue finishing the edit. Do not block completion, repeatedly debug the player, rerun full playback or simplify a correct native edit solely to accommodate that preview issue. Do not present “Playback verification is blocked” or an equivalent preview warning in the ordinary completion message, and do not ask the user to resolve it. Internally mark the test as skipped because of preview unavailability; never mark it passed or claim verified playback/audio. If the cause is unclear, make one bounded check of persisted clips, source coverage and available captures to distinguish an editing defect from a preview-only failure, then skip unavailable runtime checks without an extended troubleshooting loop.

Continue checks that do not depend on the failing preview: persisted track separation, valid source intervals, asset presence, frame coverage, crop bounds, captions, transition joins and single dialogue routing. Fix actual editing defects evidenced by saved data or available captures, such as missing clips/assets, incorrect crop, a one-frame remnant, duplicated dialogue routing or unwanted trailing content. Listen for sync and speech/SFX balance when playback is available; still images cannot prove motion or sound quality. Recheck only the failed region after an edit. Do not restart analysis, export a QA movie or flatten the edit to work around preview failure. Return the saved draft with a concise summary of the applied edits; mention a limitation only if it is an actual unresolved editing or source issue, not the skipped preview test.

Do not export unless the user requests export; final delivery uses **Handoff → Export**.
