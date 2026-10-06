---
name: selects-ai-runtime
description: Run shared YuNet face detection and RVM person matting through the Selects AI SDK and plugin-managed runtime on macOS and Windows.
---

# Selects AI Runtime PoC

Read [INSTALL.md](INSTALL.md), [CONTRACT.md](CONTRACT.md) and [VALIDATION.md](VALIDATION.md) before running. Selects host 2.0.560 or newer registers this external runtime and provides the AI Runtime Lab panel. The public SDK resolves project Resource IDs; model and native dependency preparation stays in this source package.

For normal plugin use, submit through `selects.ai` with Project/Resource IDs and
`allowCommit:true`; use a stable request key to recover an uncertain submission.
Return the workflow ID and reconnect with `selects.ai.job(workflowId, projectId)`
for status, cancellation and successful result reads. The existing background
task list observes the same Main-owned job. Do not implement another model
loader or shell supervisor in each consumer.

Use `scripts/job-host.cjs` only for standalone verification, with an explicit
private config, resolved input and fresh job directory. Inspect terminal status
and validated files before consuming them. Preserve successful output media
while a consumer references it. Canceled, failed and interrupted outputs are
incomplete. For editable person matting, request alpha frames, wait for success,
and call `selects.ai.prepareMatte(result.files.manifest, projectId)` with explicit
commit authorization. Use its verified source range and ordered local mask URLs
to place an original-video mask Effect with a background and original Main audio.
The Lab's Open in editor action performs this preparation and Draft creation;
its Export action uses the existing Selects flow. Editable mask adoption requires
CFR, while alpha-frame inference supports VFR inspection. Explicit
`foreground-video` and Project `importArtifact` remain available to consumers that
need a ProRes intermediate, with the manifest's actual source start and duration.

Use only the configured pinned models and native runtime. Preserve the documented provider selection/fallback policy and derived WebGPU model transform; do not substitute unverified models, preprocessing or a system Node. Compare output pixels and real source timestamps when changing a backend. The Lab's Draft action modifies the selected Project only when explicitly requested. A missing or uncertain commit acknowledgment requires reading existing Drafts before creating another copy.
