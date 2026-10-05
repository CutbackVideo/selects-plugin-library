# Setup

Requires macOS, Node.js 22+ available as `node` on the Selects shell's PATH,
and a Selects build with Panel UI kit v2, `runShell` and `runScript`.
Verify `node --version` through the app's shell, not only your terminal.
No npm packages, local ComfyUI server or models are needed.

Use the library's standard installation layout with ID `comfy-api-test`:
`panel.tsx` is the only file in the panel folder; every other manifest-listed
file is installed beneath the matching skill folder. Updating an existing
installation replaces that same panel, without adding a second Comfy panel.

Runtime data is kept beneath `.selects/plugin-data/comfy-api-test`, beside the
app's configured panel root. Updates must preserve it. This contains the saved
workflow, job recovery state, downloaded outputs, policy and private connector
registry. Do not include it in a shared plugin package.

Connect your own Comfy API key in the panel. Never put credentials in source,
chat, shell arguments, workflow files or a repository environment file.
No API key is stored on disk. A connector restart requires reconnecting the key.

Execution normally uses your own Comfy Cloud credits when you click **Run**.
For preparation without generation, run:

```sh
node "$SELECTS_USER_SKILLS_ROOT/comfy-api-test/scripts/comfy.mjs" set-generation off
```

Do not enable execution during a no-payment test. After the user explicitly
authorizes paid Cloud execution, `set-generation on` enables it; refresh the
panel connection. This policy never affects an already submitted job's recovery.

Verify: open the existing **Comfy Cloud** panel, load the example without running
it, reconnect and confirm the workflow remains. With execution disabled, **Run**
must stay disabled. A real generation test requires separate cost authorization.
