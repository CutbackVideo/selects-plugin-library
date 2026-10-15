---
name: comfy-api-test
description: Edit managed Comfy workflows, execute an authorized saved workflow and import its results into the current Selects project.
---

# ComfyUI

Use the installed panel or `selects.comfy.execute()` through `run_script`.
Do not create another API client/panel, start a shell connector, retrieve a key,
install a local inference runtime or ask customers to sign in to Comfy.
Selects manages authentication, user ownership, provider dispatch and downloads.
Read [README.md](README.md) for supported nodes/models and current limitations.

Capture the current project ID from Selects. Every command requires
`scope: { projectId }`; the host resolves its library and the SDK enforces its
bound project. An optional `libraryId` must match that resolved library.
Read-only actions `status`, `list`, `load`, `jobs`, `job` work without commit
permission. All other actions require `allowCommit:true`.

```js
return await selects.comfy.execute({ action: 'list', scope });
```

`list` returns `{workflows, workflow}` with the selected full document.
`load` accepts an optional workflow `id`. `select` chooses an owned workflow.
`openEditor` focuses an already-open editor without replacing its graph. When
no editor is open, `newWorkflow:true` starts a blank unsaved draft; otherwise it
opens the selected graph. `loadFile` loads an explicitly selected absolute JSON
path as a new workflow. `save` takes `name`, `document:{workflow,editorWorkflow?}`,
and for updates `id` plus `expectedRevision`. Do not overwrite after a
`revision_conflict`; reload and let the user resolve their edit.
`openEditor` resolves when its window opens. Refresh the saved workflow list
after editing; opening the window does not mean the user has saved a graph.
`status.editorOpen` indicates the active editor window. Finish and close the
editor before running from the panel. Use the editor's native Open or drag and
drop for JSON imports; these remain unsaved drafts until the user saves.

Before an authorized execution, call `status` and require `generationEnabled`.
Do not enable paid generation or bypass a no-payment instruction.
`run` takes the saved workflow `id` and one UUID `operationId` per user-requested
execution. `job` and `cancel` take a job `id`; `jobs` lists this scope's own jobs.
Poll the same job. Never generate another operation ID to recover an interrupted
or `submission_unknown` request. Unknown submission requires reconciliation.

On `succeeded`, call `deliver` with the job `id` and commit permission. It
fetches owned output bytes, imports stable resource IDs into the original
project, and acknowledges the import. Retry only `deliver` if import failed.
Report the returned resource count and actual errors. Mock responses validate
integration behavior, not successful paid Cloud generation.
