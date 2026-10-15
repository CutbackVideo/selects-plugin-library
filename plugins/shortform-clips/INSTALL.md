# Install Shortform Clips

Use the library's standard installation layout:

- `panel.tsx` goes to `SELECTS_USER_PANELS_ROOT/shortform-clips/panel.tsx`.
- Other listed package files go under `SELECTS_USER_SKILLS_ROOT/shortform-clips/`.

Open **Shortform Clips** from Apps. It initially has no customer templates.
In **Templates > Template packs**, paste the customer's public GitHub pack folder
link and click **Add from link**. A GitHub `pack.json` page or raw file link also
works. The files must already be committed and pushed. For SBS, link to the
`template-packs/sbs-radio` folder on the published branch or commit.

You can also download the pack folder and select `pack.json` under **Or choose a
local file**. Both paths validate and copy the complete pack into the app's runtime
data. No ZIP extraction or additional runtime is needed. Link installation does
not require a GitHub login; private repositories are not supported.

Install the `selects-ai-runtime` dependency for speaker framing. Without an
available runtime, the app warns and uses fixed crops. The YouTube downloader
(yt-dlp) is downloaded on first use and refreshed if a download fails.

App updates preserve runtime data under `~/.selects/plugin-data/shortform-clips/`.
Pack updates preserve user overrides and independent template copies.
The SBS pack copies legacy template edits on its first installation; it never
deletes the old app, its settings or its unfinished jobs. Finish legacy jobs there.
