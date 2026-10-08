# ComfyUI

Reuses the existing Apps panel and official ComfyUI frontend. Select a saved
workflow, then **Open editor**, or use **+** to start an unsaved graph. The empty
state offers **Create workflow**. Import editor JSON or API-format JSON through
the editor's native Open command or drag and drop. Imports remain drafts until
saved. Edit node inputs in the editor; **Save and return** or Cmd/Ctrl+S saves the visual graph and compiled
API graph. Run the saved graph from the Selects panel. Results are added to the
original project's resources; importing a completed job again reuses its IDs.

The managed backend authenticates the Selects user, stores workflow versions,
and dispatches through the company Cloud key. Customers do not need a Comfy
account or workspace invitation. Users see only their own workflows, images,
jobs and outputs. Names are display labels; workflow UUIDs and revisions control
identity and save conflicts. Duplicate names never overwrite a different graph.
Selecting a saved workflow in the editor also selects it in the panel. Closing
an unsaved new graph leaves the previous selection unchanged. Selects keeps one
editor window per active context; panel execution waits until it closes.

The editor uses live Cloud node metadata filtered by our execution policy,
plus only the signed-in user's image choices. Image upload/view routes go through
our authenticated backend. The first execution policy supports a bounded native
Z-Image graph and approved models; arbitrary custom nodes/models and paid API
nodes are not enabled. Templates, the model-download browser and Comfy account
features are not integrated. Execution controls belong to the Selects panel.

Recovery polls the original job and retries result import without submitting
another generation. Unknown submission outcomes are retained for manual
reconciliation and never automatically resubmitted. Cloud execution remains
credit-consuming even for open models. Dev execution is disabled by default;
mock-provider verification does not establish successful paid Cloud generation.

Official frontend: [release](https://github.com/Comfy-Org/ComfyUI_frontend/releases/tag/v1.57.0),
[source](https://github.com/Comfy-Org/ComfyUI_frontend/tree/v1.57.0).
Its license is retained in the frontend cache.
