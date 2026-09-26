# Selects Clips

**Turn long videos into editable, styled shorts.**

Selects Clips is an AI clipping workflow for podcasts, interviews and other long videos. Save a look from reference shorts, choose how many clips to create, and refine footage, captions and graphics directly in Selects. English interface; macOS and Windows setup scripts included.

**Experimental release · 0.2.0-alpha.3.** Style matching can still require manual correction. Cropping and captions already burned into source footage are known limitations; AI steps can time out. Failed reviews and unfinished drafts are labelled explicitly. Native Windows end-to-end testing is pending.

## Use

1. Open a project in Selects and choose Plugin > Selects Clips.
2. Manage styles > Add: paste reference video links separated by spaces or newlines. Use references with the same style.
3. Analyze and save the suggested style. Every original frame is scanned locally for changes; AI inspects selected transitions and still moments. Small or subtle changes can be missed.
4. Create shortform: choose a style, paste your original video link, choose the number of shorts and review rounds, and add optional instructions.
5. Open & edit opens the native draft. Footage, captions and graphics remain editable. Improve shorts uses the review feedback and preserves earlier versions.
6. Export video prepares and checks the current saved draft, then saves a Full HD MP4 under Downloads/Selects Clips. Editing invalidates previous output checks. This export checks technical consistency; use Review style again for a fresh AI score after editing.
7. Activity resumes saved work. Reinstalling the plugin preserves your styles, jobs and referenced media.

## Standalone operation

No Selects source patch, custom build, hidden app service, developer server or author-specific data is required by the package. It calls the existing documented panel/run_script APIs. These API declarations were checked against the installed Selects 2.0.430 distribution. AI model selection, account access and billing remain entirely under the installed Selects host. The plugin does not override them.

A signed-in Selects account with plugin/generated-media authoring enabled is required. The plugin checks this before starting analysis. If the account does not have access, contact Selects support; the plugin cannot grant account features. Older hosts without the required APIs must be updated normally.

Selects' ordinary export flow is used. Its normal completion dialog may appear during checks; close it to continue using the editor. No verification-only export extension is required. Sampled output frames are compared against saved native composites. A mismatch cannot silently pass. If at most two final video frames are omitted by the exporter, the plugin can recover those exact frames from the saved draft and verify the complete output. It does not repeat the previous frame or flatten the editable draft. Recovered tail frames use native-capture resolution; exported audio is copied unchanged. Larger timing differences or changed frame rates stop the check.

## Downloads and browser login

After a public download fails, yt-dlp tries existing Chrome, Edge, Brave, Chromium, Vivaldi and Firefox profiles on this computer. Cookie values stay local and are not exported, logged or sent to AI. The operating system can require access permission; encryption, locked profiles, site verification or missing sign-in may prevent downloading.

Open video in browser opens your normal system browser. Complete any sign-in yourself, return and retry. This uses no internal Selects browser API or AI browser task. Playback does not guarantee that a site permits downloading.

## Installation and limits

See [INSTALL.md](INSTALL.md). Python 3.9+, yt-dlp, FFmpeg, ffprobe and a JavaScript runtime for YouTube (Deno, or Node.js 22+) are checked by setup. No npm dependencies or separate AI-provider key are required at runtime.

Results are AI assessments, not exact-copy or audience-performance guarantees. Selected-frame inspection is not full audio listening. Automatic checks cover persistence, recovery, cookie fallback, output comparisons, exact tail recovery and Windows path/lock branches. Native Windows end-to-end validation remains pending. This release is experimental until the remaining release checks are complete.

Data is stored beneath the current user's `.selects/plugin-data/shortform-cloner`. Keep media files while drafts reference them. The package includes no personal media, credentials, stored styles, projects or local QA configuration.


Saved drafts now show their exact names and whether styling or review is still unfinished. New creations checkpoint a read-only style recipe before applying editable native graphics. Only drafts meeting the style score and integrity checks are marked ready.

## Updating from Shortform Cloner

Selects Clips is the new display name. The installation ID and data directory remain `shortform-cloner`, so existing styles and jobs are preserved. Install over the existing panel; do not create a second copy.
