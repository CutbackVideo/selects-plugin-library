# Comfy Cloud

Run an API-format workflow on your own Comfy Cloud account, then keep its image,
video or audio outputs in a Selects project. Workflow editing stays in Comfy;
the Selects panel edits common prompts, image dimensions, seeds and `LoadImage`
inputs. Other inputs remain editable through **Workflow JSON**.

1. Connect your personal API key in the **Comfy Cloud** panel.
2. In Comfy, use **File → Export Workflow (API)** and choose the JSON in Selects.
   Ordinary editor JSON containing `nodes` and `links` is a different format.
3. Edit the inputs, open a Selects project, and click **Run**.
4. Results download to persistent plugin storage and appear in the original
   project's resources. They are not placed on a timeline automatically.

Comfy Cloud API access requires your own paid subscription and credits. The
bundled Z-Image Turbo example also uses Cloud credits; it is not a free model
download. This plugin does not install ComfyUI or any models locally.

The key stays in the connector's memory, including after closing the panel.
Disconnect to clear it. Workflow JSON and job identifiers persist without the key.
The connector runs only after an explicit panel action and binds to loopback
with an origin-bound capability. It does not execute models on your computer.

**Recover results** resumes polling/downloading the same job. **Retry saving**
imports downloaded files, without submitting another Cloud job. Reopening the
panel restores the saved workflow and offers recovery for unfinished runs in
the current project. If submission timed out before a job ID was received,
check Comfy's job history; the plugin refuses to submit that run again.

Input upload supports PNG, JPEG and WebP under 100 MB on standard `LoadImage`
nodes. Custom loaders, video-frame extraction and custom-node-specific forms
are not provided. Available nodes/models and sufficient credits are validated
by Comfy when a job is submitted.

This is experimental. Read-only personal-key authentication and actual Selects
panel/resource import were tested. Submission, upload, polling, streaming
download, restart recovery and import retry were tested with simulated Cloud
responses. Paid Cloud execution and Windows installation remain unverified.

References: [Cloud API](https://docs.comfy.org/development/deploy/cloud),
[API v2](https://docs.comfy.org/api-reference/v2/overview),
[workflow API format](https://docs.comfy.org/development/api-development/workflow-api-format).

Offline checks: `node --test plugins/comfy-api-test/tests/*.test.mjs` from the
repository root. Tests never contact Comfy or spend credits.
