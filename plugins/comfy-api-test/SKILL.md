---
name: comfy-api-test
description: Run a user's Comfy Cloud API-format workflow and save downloaded results in a Selects project. Use for Comfy workflow execution or recovery; not for building a local ComfyUI server or general image generation.
---

# Comfy Cloud

Use the installed Comfy Cloud panel and the shared connector in `scripts/`.
Do not write a second API client or a second panel. Read [INSTALL.md](INSTALL.md)
for dependencies and [README.md](README.md) for workflow/input support.

Credentials are entered only in the panel; the connector keeps them in memory.
Never retrieve a key from chat, company environments, browser storage or files.
If disconnected, ask the user to connect in the existing panel. Do not install a
local ComfyUI runtime or models. Cloud execution uses the user's own credits;
respect an execution-disabled policy and any no-payment instruction.

For a chat request to execute, use `scripts/comfy.mjs` through the host shell.
Determine the current renderer origin from the app's runtime (production file
origin is `null`); do not hardcode a development port. Derive the project ID
from the current Selects context and capture it before submitting.

```sh
node "$SELECTS_USER_SKILLS_ROOT/comfy-api-test/scripts/comfy.mjs" status '<renderer-origin>'
node "$SELECTS_USER_SKILLS_ROOT/comfy-api-test/scripts/comfy.mjs" workflow '<renderer-origin>'
```

`status` is read-only apart from starting the local connector if needed. Check
`authenticated` and `allowGeneration`; never silently enable paid execution.
Use the saved workflow unless the user supplies another API-format graph.
To modify a workflow, write a private request JSON beneath the runtime data
folder, containing `{name, workflow}`, then use `save-workflow <origin> <path>`.
No credential belongs in this JSON.

For execution, write `{operationId, workflow, images}` to a private request file.
Generate one UUID per user-requested run. `images` maps standard `LoadImage` node
IDs to absolute PNG/JPEG/WebP paths under 100 MB. Pass the captured project ID:

```sh
node "$SELECTS_USER_SKILLS_ROOT/comfy-api-test/scripts/comfy.mjs" run '<renderer-origin>' '<request-json-path>' '<project-id>'
node "$SELECTS_USER_SKILLS_ROOT/comfy-api-test/scripts/comfy.mjs" poll '<renderer-origin>' '<operation-id>'
```

Poll the same operation. If interrupted, the same `run` command resumes its
stored request and job. Do not use a new operation ID to recover. A
`submission_unknown` error requires checking Comfy's job history before another
execution; it must not trigger automatic resubmission.

When `paths` is nonempty, use `import-script <origin> <operation-id>` to obtain the
shared import script. Execute its `script` through the Selects `run_script` tool
with `allowCommit:true`. It reads the original project's complete source-file
inventory, imports only missing paths, and verifies every result. Check
`resourceIds` before calling `imported <origin> <operation-id>` to acknowledge.
If import fails, repeat this import step only, without calling Cloud generation.

Report saved resource count and actual errors. Simulated responses establish
integration behavior, not successful paid Cloud generation. Do not claim a
workflow is free merely because it uses open model weights.
