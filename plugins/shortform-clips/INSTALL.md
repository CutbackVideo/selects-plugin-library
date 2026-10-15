# Install Shortform Clips

Use the library's standard installation layout:

- `panel.tsx` goes to `SELECTS_USER_PANELS_ROOT/shortform-clips/panel.tsx`.
- Other listed package files go under `SELECTS_USER_SKILLS_ROOT/shortform-clips/`.

Open **Shortform Clips** from Apps. It initially has no customer templates.
In **Templates**, choose **+ Add templates** in the template picker (or the
**Add templates** button if none are installed), paste the link you received,
and click **Add**. Share the published folder link for
`plugins/shortform-clips/template-packs/sbs-radio` to install the SBS pack.
A public pack manifest page or raw file link also works.

Template packs are kept beside the app source but excluded from `plugin.json`'s
file list. Installing the app downloads no customer packs; each pack is added
separately by link. No file upload or command-line helper is required.

Install the `selects-ai-runtime` dependency for speaker framing. Without an
available runtime, the app warns and uses fixed crops. The YouTube downloader
(yt-dlp) is downloaded on first use and refreshed if a download fails.

App updates preserve runtime data under `~/.selects/plugin-data/shortform-clips/`.
Pack updates preserve user overrides and independent template copies.
The SBS pack copies legacy template edits on its first installation; it never
deletes the old app, its settings or its unfinished jobs. Finish legacy jobs there.
