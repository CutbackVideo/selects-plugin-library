---
name: portrait-stage
description: Create editable portrait videos in Selects with a cutout person, separate background and title, and original audio.
---

# Portrait Stage

Experimental. Read [INSTALL.md](INSTALL.md) for setup and limits.

## Result

Save an editable Draft in the current project: original audio, person, background and title remain separate. Verify the preview and independent title/background edits. Use **Handoff → Export** for final video; do not flatten the composition into a single imported clip.

## Use

Open the Panel, select a local video and a persistent working-media folder, set the title and background, then choose **Create Draft**. Use **Apply title** or **Apply background** to edit the selected Draft without repeating background removal.

Panel and chat share `scripts/portrait_stage.py` and `scripts/create-draft.js`. For chat execution, safely quote user input and use `.local/run` under this installed Skill:

1. `doctor` checks the local environment.
2. `start --input <file> --output-dir <folder> --title <text> --color <hex>` returns a job ID.
3. `step --job <id>` processes a batch; repeat until done. Use `status` or `cancel --job <id>` to inspect or cancel.
4. `draft-script --job <id> --project <current-project-id> --title <text> --color <hex>` writes an assembly script. Read `scriptPath` and execute it with `run_script`, `allowCommit: true`, or use the Panel's equivalent action.

Always resolve the current project. After an uncertain commit, inspect its Drafts before retrying. Keep intermediate media while a Draft references it. Report unsupported input or failed verification explicitly.
