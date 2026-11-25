# Install Huick Alpha

Experimental. Uses only Selects' own Panel SDK (`runScript`). No external
programs, models or setup are needed.

Requirements: a Selects build whose run_script SDK has
`selects.clipper.startRun` (the Clipper production-plan update), Clipper on
desktop, and the Clipper template the plan targets imported into Clipper.
On an older Selects, **Create Draft** says to update Selects.

## Setup

1. Place the files as in the library's
   [installation layout](../../PUBLISHING.md#installation-layout): `panel.tsx`
   in `huick-alpha` beneath `SELECTS_USER_PANELS_ROOT`, everything else in
   `huick-alpha` beneath `SELECTS_USER_SKILLS_ROOT`.
2. Open a project and choose **Huick Alpha** from Apps. Under **Files**, choose
   or drop media files and folders, or select a video already in the project.

## Updating

Replace the files in the same two folders. Saved plans live in the panel's
storage per project and are kept.
